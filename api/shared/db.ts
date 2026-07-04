import { createClient } from "@libsql/client";
import { ensurePushSchema } from "../push.js";

let dbClient: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!dbClient) {
    const dbUrl = process.env.TURSO_DATABASE_URL || "";
    const dbToken = process.env.TURSO_AUTH_TOKEN || "";
    dbClient = createClient({
      url: dbUrl,
      authToken: dbToken,
    });
  }
  return dbClient;
}

let dbInitialized = false;

export async function initDb() {
  if (dbInitialized) return;
  try {
    const db = getDb();
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT,
        height REAL,
        weight REAL,
        target_weight REAL,
        focus_area TEXT,
        streak INTEGER DEFAULT 0,
        total_sessions INTEGER DEFAULT 0,
        apple_health_connected INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0
      )
    `);

    try { await db.execute("ALTER TABLE profiles ADD COLUMN apple_health_connected INTEGER DEFAULT 0"); } catch (e) {}
    try { await db.execute("ALTER TABLE profiles ADD COLUMN level INTEGER DEFAULT 1"); } catch (e) {}
    try { await db.execute("ALTER TABLE profiles ADD COLUMN xp INTEGER DEFAULT 0"); } catch (e) {}
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        date TEXT NOT NULL,
        focus TEXT,
        location TEXT,
        equipment TEXT,
        exercises TEXT NOT NULL,
        calories_burned REAL,
        avg_bpm REAL
      )
    `);

    try { await db.execute("ALTER TABLE workouts ADD COLUMN calories_burned REAL"); } catch (e) {}
    try { await db.execute("ALTER TABLE workouts ADD COLUMN avg_bpm REAL"); } catch (e) {}
    try { await db.execute("ALTER TABLE workouts ADD COLUMN time_start TEXT"); } catch (e) {}
    try { await db.execute("ALTER TABLE workouts ADD COLUMN time_end TEXT"); } catch (e) {}

    await db.execute(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS weight_history (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        weight REAL NOT NULL,
        date TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS workout_templates (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        name TEXT NOT NULL,
        focus TEXT,
        exercises TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        type TEXT NOT NULL,
        target_value REAL,
        current_value REAL,
        target_date TEXT,
        description TEXT,
        completed INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS recomp_analyses (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        height REAL,
        weight REAL,
        bmi REAL,
        analysis TEXT,
        focus_type TEXT,
        protein REAL,
        calories REAL,
        timestamp INTEGER NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS apple_health (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        type TEXT NOT NULL,
        value REAL,
        unit TEXT,
        date TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS workout_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id TEXT NOT NULL,
        workout_id TEXT NOT NULL,
        date TEXT NOT NULL,
        focus TEXT,
        exercises TEXT NOT NULL,
        logged_at INTEGER NOT NULL,
        deleted INTEGER DEFAULT 0
      )
    `);

    await ensurePushSchema(db);

    const indexedTables = ['workouts', 'chat_history', 'weight_history', 'workout_templates', 'goals', 'recomp_analyses', 'apple_health', 'workout_audit_log'];
    for (const table of indexedTables) {
      try {
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_${table}_profile_id ON ${table}(profile_id)`);
      } catch (e) {
        console.warn(`Failed to create index for ${table}`, e);
      }
    }

    const existing = await db.execute("SELECT * FROM profiles");
    if (existing.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO profiles (id, name, avatar, height, weight, target_weight, focus_area, streak, total_sessions, level, xp) 
              VALUES (:id, :name, :avatar, :height, :weight, :target_weight, :focus_area, :streak, :total_sessions, :level, :xp)`,
        args: {
          id: "adam",
          name: "Adam",
          avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBLMLaOok9pp9-I4PDAnO5jZcPy7HxQcqVUO6t8GAkgnjlzjc2DHLr3ZXcJcPTNpLM4dRHFfL8pLLdEHrP6fTa5kOxon1xKg-Was4rGkL6pZUieM8T-3JC-7DNfGZiYdtlB7M4GPMkBjYH66vp5o82xxGJHmJeEMzh43-xXKuNkS8YlD85NgVxsjgOe3gMk0ZV9S0lEXDxrrd0YpmbrvACJ6LPYhowgBp7ULlZ6BMnRbIihcnn8qaKhAYGyUml2KxNlWMlNO_ywRbU",
          height: 182,
          weight: 84.5,
          target_weight: 80,
          focus_area: "Pull Plan",
          streak: 0,
          total_sessions: 0,
          level: 1,
          xp: 0
        }
      });

      await db.execute({
        sql: `INSERT INTO profiles (id, name, avatar, height, weight, target_weight, focus_area, streak, total_sessions, level, xp) 
              VALUES (:id, :name, :avatar, :height, :weight, :target_weight, :focus_area, :streak, :total_sessions, :level, :xp)`,
        args: {
          id: "thiara",
          name: "Thiara",
          avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuB7BOvVfC0biWEVOjAKaZpo-yTqTW_1ggy7sNiqrf5nwsA1nlBEvy95dsinHWprXpw0_4zup63w0-XVvezbfwBOaJWpbkzfvU4vfnJZ4qpJPEOywdT8H-tPY2fcCXTXXqZa9AcSEP0odRtMtG-X81krBNEQRJqWhsxUSlqUbmah1WCvSgRaAmt0GCJks6GSXc-gLi4yjCahEQPR-KjL881PT0U5uRqbfDvZC0A1_o-w8C2lqJj7GpcA8AXRHId62C2BPS--774oREs",
          height: 165,
          weight: 60,
          target_weight: 55,
          focus_area: "Legs Plan",
          streak: 0,
          total_sessions: 0,
          level: 1,
          xp: 0
        }
      });
      console.log("Seeded database with default profiles Adam and Thiara.");
    }

    try {
      await db.execute(`
        UPDATE profiles 
        SET weight = (
          SELECT weight 
          FROM weight_history 
          WHERE weight_history.profile_id = profiles.id 
          ORDER BY timestamp DESC 
          LIMIT 1
        )
        WHERE EXISTS (
          SELECT 1 
          FROM weight_history 
          WHERE weight_history.profile_id = profiles.id
        )
      `);
      console.log("Synchronized profiles current weights with their latest weight history entries.");
    } catch (e) {
      console.error("Failed to sync weight history to profiles:", e);
    }

    dbInitialized = true;
    console.log("Database initialized successfully.");
  } catch (error) {
    console.error("Database connection/init failed.", error);
  }
}
