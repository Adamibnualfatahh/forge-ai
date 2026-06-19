// Shared Web Push (VAPID) logic used by both the local dev server (server.ts)
// and the Vercel serverless entry (api/index.ts).
//
// Flow:
//   1. Frontend fetches the VAPID public key and subscribes via the Push API.
//   2. The subscription is stored in the `push_subscriptions` table (Turso).
//   3. A scheduled job (Vercel Cron) hits /api/cron/rest-day-reminder, which
//      finds users idle >= REST_DAY_THRESHOLD days and pushes a reminder.
//      Because this is delivered via the Push service, it works even when the
//      PWA is fully closed.

import webpush from "web-push";
import type { Express, Request, Response } from "express";
import type { createClient } from "@libsql/client";

type DbClient = ReturnType<typeof createClient>;
type GetDb = () => DbClient;

const REST_DAY_THRESHOLD = Number(process.env.REST_DAY_THRESHOLD || 2);

let vapidConfigured = false;

/** True only when both VAPID keys are present in the environment. */
export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** Lazily wire web-push with the VAPID credentials (once). */
function configureWebPush(): boolean {
  if (vapidConfigured) return true;
  if (!isPushConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@forge-ai.app",
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  );
  vapidConfigured = true;
  return true;
}

/** Create the push_subscriptions table if it does not exist. */
export async function ensurePushSchema(db: DbClient): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      subscription TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
}

/** Days since the profile's most recent workout, or null if none. */
async function daysSinceLastWorkout(db: DbClient, profileId: string): Promise<number | null> {
  const res = await db.execute({
    sql: "SELECT date FROM workouts WHERE profile_id = ? ORDER BY date DESC LIMIT 1",
    args: [profileId],
  });
  if (res.rows.length === 0) return null;
  const date = res.rows[0].date as string;
  const last = new Date(date + "T00:00:00").getTime();
  if (Number.isNaN(last)) return null;
  return Math.floor((Date.now() - last) / 86400000);
}

interface SubRow {
  endpoint: string;
  profile_id: string;
  subscription: string;
}

/**
 * Send the rest-day reminder to every stored subscription whose owner has been
 * idle for >= REST_DAY_THRESHOLD days. Stale subscriptions (404/410) are pruned.
 * Returns a small summary for logging/debugging.
 */
export async function sendRestDayReminders(db: DbClient): Promise<{
  configured: boolean;
  checked: number;
  sent: number;
  removed: number;
  skipped: number;
}> {
  if (!configureWebPush()) {
    return { configured: false, checked: 0, sent: 0, removed: 0, skipped: 0 };
  }

  const subsRes = await db.execute("SELECT endpoint, profile_id, subscription FROM push_subscriptions");
  const subs = subsRes.rows as unknown as SubRow[];

  // Cache day-counts per profile so we don't query workouts repeatedly.
  const daysCache = new Map<string, number | null>();
  let sent = 0;
  let removed = 0;
  let skipped = 0;

  for (const row of subs) {
    let days = daysCache.get(row.profile_id);
    if (days === undefined) {
      days = await daysSinceLastWorkout(db, row.profile_id);
      daysCache.set(row.profile_id, days);
    }

    if (days === null || days < REST_DAY_THRESHOLD) {
      skipped++;
      continue;
    }

    const payload = JSON.stringify({
      title: "Forge AI",
      body: `Sudah ${days} hari belum latihan. Yuk gaspol! 💪`,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: "forge-rest-day-reminder",
      url: "/",
    });

    try {
      const subscription = JSON.parse(row.subscription);
      await webpush.sendNotification(subscription, payload);
      sent++;
    } catch (err: any) {
      const status = err?.statusCode;
      // 404/410 = subscription expired or unsubscribed -> remove it.
      if (status === 404 || status === 410) {
        await db.execute({
          sql: "DELETE FROM push_subscriptions WHERE endpoint = ?",
          args: [row.endpoint],
        });
        removed++;
      } else {
        console.error("web-push send failed:", status, err?.body || err?.message);
      }
    }
  }

  return { configured: true, checked: subs.length, sent, removed, skipped };
}

/**
 * Register all push-related HTTP routes on the given Express app.
 * Must be called before any catch-all/static fallback route.
 */
export function registerPushRoutes(app: Express, getDb: GetDb): void {
  // Expose the public VAPID key so the frontend can subscribe.
  app.get("/api/push/vapid-public-key", (_req: Request, res: Response) => {
    if (!isPushConfigured()) {
      return res.status(503).json({ error: "push_not_configured", publicKey: null });
    }
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
  });

  // Save (upsert) a push subscription for a profile.
  app.post("/api/profiles/:id/push-subscribe", async (req: Request, res: Response) => {
    const { id } = req.params;
    const subscription = req.body?.subscription || req.body;
    if (!subscription?.endpoint) {
      return res.status(400).json({ error: "invalid_subscription" });
    }
    try {
      const db = getDb();
      await db.execute({
        sql: `INSERT INTO push_subscriptions (endpoint, profile_id, subscription, created_at)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(endpoint) DO UPDATE SET
                profile_id = excluded.profile_id,
                subscription = excluded.subscription`,
        args: [subscription.endpoint, id, JSON.stringify(subscription), Date.now()],
      });
      res.json({ success: true });
    } catch (err) {
      console.error("push-subscribe failed:", err);
      res.status(500).json({ error: "subscribe_failed" });
    }
  });

  // Remove a push subscription.
  app.post("/api/profiles/:id/push-unsubscribe", async (req: Request, res: Response) => {
    const endpoint = req.body?.endpoint;
    if (!endpoint) return res.status(400).json({ error: "missing_endpoint" });
    try {
      const db = getDb();
      await db.execute({ sql: "DELETE FROM push_subscriptions WHERE endpoint = ?", args: [endpoint] });
      res.json({ success: true });
    } catch (err) {
      console.error("push-unsubscribe failed:", err);
      res.status(500).json({ error: "unsubscribe_failed" });
    }
  });

  // Cron-triggered sender. Protected by CRON_SECRET when set.
  // Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>`.
  const cronHandler = async (req: Request, res: Response) => {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.authorization || "";
      const provided = auth.replace(/^Bearer\s+/i, "") || (req.query.secret as string) || "";
      if (provided !== secret) {
        return res.status(401).json({ error: "unauthorized" });
      }
    }
    try {
      const result = await sendRestDayReminders(getDb());
      res.json({ success: true, ...result });
    } catch (err) {
      console.error("rest-day reminder cron failed:", err);
      res.status(500).json({ error: "cron_failed" });
    }
  };
  app.get("/api/cron/rest-day-reminder", cronHandler);
  app.post("/api/cron/rest-day-reminder", cronHandler);
}
