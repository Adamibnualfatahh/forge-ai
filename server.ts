import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { createClient } from "@libsql/client";
import { GoogleGenAI, Type } from "@google/genai";
import Redis from "ioredis";

dotenv.config();

const app = express();
const PORT = 3000;

// Redis cache
const CACHE_PREFIX = "forge-ai-";
const CACHE_TTL = 300; // 5 minutes

let redis: Redis | null = null;
function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || "", { maxRetriesPerRequest: 2, lazyConnect: true });
    redis.connect().catch(e => console.warn("Redis connection failed, running without cache:", e.message));
  }
  return redis;
}

async function cacheGet(key: string): Promise<string | null> {
  try { return await getRedis().get(CACHE_PREFIX + key); } catch { return null; }
}

async function cacheSet(key: string, value: string, ttl = CACHE_TTL): Promise<void> {
  try { await getRedis().setex(CACHE_PREFIX + key, ttl, value); } catch {}
}

async function cacheDel(pattern: string): Promise<void> {
  try {
    const r = getRedis();
    const keys = await r.keys(CACHE_PREFIX + pattern);
    if (keys.length > 0) await r.del(...keys);
  } catch {}
}

// Set up server-side JSON and Form body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database initialization
const dbUrl = process.env.TURSO_DATABASE_URL || "";
const dbToken = process.env.TURSO_AUTH_TOKEN || "";

let dbClient: ReturnType<typeof createClient> | null = null;

function getDb() {
  if (!dbClient) {
    dbClient = createClient({
      url: dbUrl,
      authToken: dbToken,
    });
  }
  return dbClient;
}

// Inactive/Safe setup of Gemini, throwing clear errors if API key is missing only during execution
let aiClient: GoogleGenAI | null = null;

function getAi() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI features will fallback to automated templates.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "PLACEHOLDER_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// AI model with auto-fallback on rate limit/overload
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];
async function generateAI(opts: { prompt: string; json?: boolean }) {
  const ai = getAi();
  for (const model of MODELS) {
    try {
      const config: any = {};
      if (opts.json) config.responseMimeType = "application/json";
      const response = await ai.models.generateContent({ model, contents: opts.prompt, config });
      return response.text || "";
    } catch (err: any) {
      if ((err?.status === 503 || err?.status === 429) && model !== MODELS[MODELS.length - 1]) continue;
      throw err;
    }
  }
  return "";
}

// Initialize tables
async function initDb() {
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
        apple_health_connected INTEGER DEFAULT 0
      )
    `);

    // Add columns if table already exists (safe migrations for existing DBs)
    try { await db.execute("ALTER TABLE profiles ADD COLUMN apple_health_connected INTEGER DEFAULT 0"); } catch (e) {}

    
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

    // Verify and seed default profiles
    const existing = await db.execute("SELECT * FROM profiles");
    if (existing.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO profiles (id, name, avatar, height, weight, target_weight, focus_area, streak, total_sessions) 
              VALUES (:id, :name, :avatar, :height, :weight, :target_weight, :focus_area, :streak, :total_sessions)`,
        args: {
          id: "adam",
          name: "Adam",
          avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBLMLaOok9pp9-I4PDAnO5jZcPy7HxQcqVUO6t8GAkgnjlzjc2DHLr3ZXcJcPTNpLM4dRHFfL8pLLdEHrP6fTa5kOxon1xKg-Was4rGkL6pZUieM8T-3JC-7DNfGZiYdtlB7M4GPMkBjYH66vp5o82xxGJHmJeEMzh43-xXKuNkS8YlD85NgVxsjgOe3gMk0ZV9S0lEXDxrrd0YpmbrvACJ6LPYhowgBp7ULlZ6BMnRbIihcnn8qaKhAYGyUml2KxNlWMlNO_ywRbU",
          height: 182,
          weight: 84.5,
          target_weight: 80,
          focus_area: "Pull Plan",
          streak: 0,
          total_sessions: 0
        }
      });

      await db.execute({
        sql: `INSERT INTO profiles (id, name, avatar, height, weight, target_weight, focus_area, streak, total_sessions) 
              VALUES (:id, :name, :avatar, :height, :weight, :target_weight, :focus_area, :streak, :total_sessions)`,
        args: {
          id: "thiara",
          name: "Thiara",
          avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuB7BOvVfC0biWEVOjAKaZpo-yTqTW_1ggy7sNiqrf5nwsA1nlBEvy95dsinHWprXpw0_4zup63w0-XVvezbfwBOaJWpbkzfvU4vfnJZ4qpJPEOywdT8H-tPY2fcCXTXXqZa9AcSEP0odRtMtG-X81krBNEQRJqWhsxUSlqUbmah1WCvSgRaAmt0GCJks6GSXc-gLi4yjCahEQPR-KjL881PT0U5uRqbfDvZC0A1_o-w8C2lqJj7GpcA8AXRHId62C2BPS--774oREs",
          height: 165,
          weight: 60,
          target_weight: 55,
          focus_area: "Legs Plan",
          streak: 0,
          total_sessions: 0
        }
      });
      console.log("Seeded database with default profiles Adam and Thiara.");
    }

  } catch (error) {
    console.error("Database connection/init failed.", error);
  }
}

// Ensure database setup starts asynchronously
initDb();

// API ENDPOINTS

// 1. Get all profiles
app.get("/api/profiles", async (req, res) => {
  try {
    const cached = await cacheGet("profiles");
    if (cached) return res.json(JSON.parse(cached));
    const db = getDb();
    const result = await db.execute("SELECT * FROM profiles");
    await cacheSet("profiles", JSON.stringify(result.rows));
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    // Fallback Mock Profiles in case DB fails
    res.json([
      {
        id: "adam",
        name: "Adam",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBLMLaOok9pp9-I4PDAnO5jZcPy7HxQcqVUO6t8GAkgnjlzjc2DHLr3ZXcJcPTNpLM4dRHFfL8pLLdEHrP6fTa5kOxon1xKg-Was4rGkL6pZUieM8T-3JC-7DNfGZiYdtlB7M4GPMkBjYH66vp5o82xxGJHmJeEMzh43-xXKuNkS8YlD85NgVxsjgOe3gMk0ZV9S0lEXDxrrd0YpmbrvACJ6LPYhowgBp7ULlZ6BMnRbIihcnn8qaKhAYGyUml2KxNlWMlNO_ywRbU",
        height: 182,
        weight: 84.5,
        target_weight: 80,
        focus_area: "Pull Plan",
        streak: 3,
        total_sessions: 42
      },
      {
        id: "thiara",
        name: "Thiara",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuB7BOvVfC0biWEVOjAKaZpo-yTqTW_1ggy7sNiqrf5nwsA1nlBEvy95dsinHWprXpw0_4zup63w0-XVvezbfwBOaJWpbkzfvU4vfnJZ4qpJPEOywdT8H-tPY2fcCXTXXqZa9AcSEP0odRtMtG-X81krBNEQRJqWhsxUSlqUbmah1WCvSgRaAmt0GCJks6GSXc-gLi4yjCahEQPR-KjL881PT0U5uRqbfDvZC0A1_o-w8C2lqJj7GpcA8AXRHId62C2BPS--774oREs",
        height: 165,
        weight: 60,
        target_weight: 55,
        focus_area: "Legs Plan",
        streak: 2,
        total_sessions: 28
      }
    ]);
  }
});

// 2. Add or select/update profile
app.post("/api/profiles", async (req, res) => {
  const { id, name, height, weight, target_weight, focus_area } = req.body;
  const lowercaseId = id ? id.toLowerCase() : name.toLowerCase().replace(/\s+/g, "_");
  
  // Lock registration - only allow existing profiles (adam & thiara)
  const ALLOWED_PROFILES = ["adam", "thiara"];
  if (!ALLOWED_PROFILES.includes(lowercaseId)) {
    return res.status(403).json({ error: "Registrasi ditutup. Hanya profil yang sudah terdaftar yang bisa digunakan." });
  }
  
  try {
    const db = getDb();
    await db.execute({
      sql: `UPDATE profiles SET name = ?, height = ?, weight = ?, target_weight = ?, focus_area = ? WHERE id = ?`,
      args: [name, height || 170, weight || 70, target_weight || 65, focus_area || "Full Body", lowercaseId]
    });

    const updated = await db.execute({
      sql: "SELECT * FROM profiles WHERE id = ?",
      args: [lowercaseId]
    });
    await cacheDel("profiles");
    res.json(updated.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save profile" });
  }
});

// 3. Get workout logs for profile
app.get("/api/profiles/:id/logs", async (req, res) => {
  const profileId = req.params.id;
  try {
    const cached = await cacheGet(`logs:${profileId}`);
    if (cached) return res.json(JSON.parse(cached));
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT * FROM workouts WHERE profile_id = ? ORDER BY date DESC",
      args: [profileId]
    });
    
    // Parse exercises JSON string for each row
    const logs = result.rows.map(row => ({
      ...row,
      exercises: typeof row.exercises === 'string' ? JSON.parse(row.exercises) : row.exercises
    }));
    await cacheSet(`logs:${profileId}`, JSON.stringify(logs));
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.json([]);
  }
});

// 3b. Paginated workout logs
app.get("/api/profiles/:id/logs/paginated", async (req, res) => {
  const profileId = req.params.id;
  const limit = parseInt(req.query.limit as string) || 15;
  const offset = parseInt(req.query.offset as string) || 0;
  const focus = req.query.focus as string;
  try {
    const db = getDb();
    let sql = "SELECT * FROM workouts WHERE profile_id = ?";
    const args: any[] = [profileId];
    if (focus) { sql += " AND focus = ?"; args.push(focus); }
    sql += " ORDER BY date DESC LIMIT ? OFFSET ?";
    args.push(limit, offset);
    const result = await db.execute({ sql, args });
    const logs = result.rows.map(row => ({
      ...row,
      exercises: typeof row.exercises === 'string' ? JSON.parse(row.exercises) : row.exercises
    }));
    res.json({ logs, hasMore: logs.length === limit });
  } catch (error) {
    console.error(error);
    res.json({ logs: [], hasMore: false });
  }
});

// 4. Save workout log for profile & increment sessions + streak
app.post("/api/profiles/:id/logs", async (req, res) => {
  const profileId = req.params.id;
  const { date, focus, location, equipment, exercises, calories_burned, avg_bpm } = req.body;
  const logId = Math.random().toString(36).substring(2, 11);

  try {
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO workouts (id, profile_id, date, focus, location, equipment, exercises, calories_burned, avg_bpm) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [logId, profileId, date, focus, location, equipment, JSON.stringify(exercises), calories_burned || null, avg_bpm || null]
    });

    // Update profile stats - recalculate weekly streak
    // Streak = consecutive weeks (Mon-Sun) with at least 1 session
    const allLogs = await db.execute({
      sql: "SELECT date FROM workouts WHERE profile_id = ? ORDER BY date DESC",
      args: [profileId]
    });
    const dates = allLogs.rows.map(r => r.date as string);
    const getWeekStart = (d: string) => {
      const dt = new Date(d + "T00:00:00");
      const day = dt.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday = start
      dt.setDate(dt.getDate() - diff);
      return dt.toISOString().split('T')[0];
    };
    const uniqueWeeks = [...new Set(dates.map(getWeekStart))].sort().reverse();
    let streak = 0;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentWeek = getWeekStart(todayStr);
    for (let i = 0; i < uniqueWeeks.length; i++) {
      const expected = new Date(currentWeek);
      expected.setDate(expected.getDate() - i * 7);
      if (uniqueWeeks[i] === expected.toISOString().split('T')[0]) {
        streak++;
      } else {
        break;
      }
    }
    await db.execute({
      sql: "UPDATE profiles SET total_sessions = total_sessions + 1, streak = ? WHERE id = ?",
      args: [streak, profileId]
    });

    await cacheDel(`logs:${profileId}`);
    await cacheDel("profiles");
    res.json({ success: true, logId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to log workout" });
  }
});

// 4a. Delete workout log & decrement session counter
app.delete("/api/profiles/:profileId/logs/:logId", async (req, res) => {
  const { profileId, logId } = req.params;
  try {
    const db = getDb();
    
    // First confirm it exists and belongs to this profile
    const checkLog = await db.execute({
      sql: "SELECT id FROM workouts WHERE id = ? AND profile_id = ?",
      args: [logId, profileId]
    });

    if (checkLog.rows.length === 0) {
      return res.status(404).json({ error: "Sesi latihan tidak ditemukan" });
    }

    await db.execute({
      sql: "DELETE FROM workouts WHERE id = ? AND profile_id = ?",
      args: [logId, profileId]
    });

    // Recalculate session count and weekly streak after delete
    const remainingLogs = await db.execute({
      sql: "SELECT date FROM workouts WHERE profile_id = ? ORDER BY date DESC",
      args: [profileId]
    });
    const dates = remainingLogs.rows.map(r => r.date as string);
    const getWeekStart = (d: string) => {
      const dt = new Date(d + "T00:00:00");
      const day = dt.getDay();
      const diff = day === 0 ? 6 : day - 1;
      dt.setDate(dt.getDate() - diff);
      return dt.toISOString().split('T')[0];
    };
    const uniqueWeeks = [...new Set(dates.map(getWeekStart))].sort().reverse();
    let streak = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const currentWeek = getWeekStart(todayStr);
    for (let i = 0; i < uniqueWeeks.length; i++) {
      const expected = new Date(currentWeek);
      expected.setDate(expected.getDate() - i * 7);
      if (uniqueWeeks[i] === expected.toISOString().split('T')[0]) {
        streak++;
      } else {
        break;
      }
    }
    await db.execute({
      sql: "UPDATE profiles SET total_sessions = ?, streak = ? WHERE id = ?",
      args: [dates.length, streak, profileId]
    });

    await cacheDel(`logs:${profileId}`);
    await cacheDel("profiles");
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete log:", error);
    res.status(500).json({ error: "Failed to delete workout log" });
  }
});

// 4b. Update/Edit workout log
app.put("/api/profiles/:profileId/logs/:logId", async (req, res) => {
  const { profileId, logId } = req.params;
  const { date, focus, location, equipment, exercises } = req.body;
  try {
    const db = getDb();
    
    // Confirm it exists and belongs to this profile
    const checkLog = await db.execute({
      sql: "SELECT id FROM workouts WHERE id = ? AND profile_id = ?",
      args: [logId, profileId]
    });

    if (checkLog.rows.length === 0) {
      return res.status(404).json({ error: "Sesi latihan tidak ditemukan" });
    }

    await db.execute({
      sql: `UPDATE workouts SET date = ?, focus = ?, location = ?, equipment = ?, exercises = ? 
            WHERE id = ? AND profile_id = ?`,
      args: [date, focus, location, equipment, JSON.stringify(exercises), logId, profileId]
    });

    await cacheDel(`logs:${profileId}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to update log:", error);
    res.status(500).json({ error: "Failed to update workout log" });
  }
});

// 5. Get recomp analysis for profile
app.get("/api/profiles/:id/recomp", async (req, res) => {
  const profileId = req.params.id;
  try {
    const cached = await cacheGet(`recomp:${profileId}`);
    if (cached) return res.json(JSON.parse(cached));
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT * FROM recomp_analyses WHERE profile_id = ? ORDER BY timestamp DESC LIMIT 1",
      args: [profileId]
    });
    const data = result.rows[0] || null;
    if (data) await cacheSet(`recomp:${profileId}`, JSON.stringify(data));
    res.json(data);
  } catch (error) {
    console.error(error);
    res.json(null);
  }
});

// 6. Post body recomposition (TB and BB) - generate advice using Gemini AI
app.post("/api/profiles/:id/recomp", async (req, res) => {
  const profileId = req.params.id;
  const { height, weight } = req.body;  // height in cm, weight in kg
  const tb = parseFloat(height);
  const bb = parseFloat(weight);

  if (isNaN(tb) || isNaN(bb) || tb <= 0 || bb <= 0) {
    return res.status(400).json({ error: "Tinggi Badan dan Berat Badan harus angka valid positif" });
  }

  // Calculate BMI
  const bmi = bb / Math.pow(tb / 100, 2);

  try {
    const db = getDb();
    // Get profile name
    const profileRes = await db.execute({
      sql: "SELECT name FROM profiles WHERE id = ?",
      args: [profileId]
    });
    const clientName = profileRes.rows[0]?.name || "Klien";

    let focusType: 'Caloric Deficit' | 'Surplus' | 'Maintenance' = 'Maintenance';
    let targetCalories = 2000;
    let targetProtein = 140;
    let explanation = "Terus konsisten berolahraga gila-gilaan, penuhi nutrisi seimbang!";

    // AI model check and lazy execution
    const hasApiKey = process.env.GEMINI_API_KEY ? true : false;
    
    if (hasApiKey) {
      try {
        const ai = getAi();
        const prompt = `Kamu adalah seorang Ahli Gizi Kece dan Personal Trainer Profesional di FORGE AI. Klienmu bernama ${clientName} memiliki data berikut:
- Tinggi Badan (TB): ${tb} cm
- Berat Badan (BB): ${bb} kg
- BMI: ${bmi.toFixed(1)}

TUGAS:
Berikan analisa rekomposisi tubuh yang realistis. Tentukan apakah mereka sebaiknya fokus pada:
'Caloric Deficit' (fat loss jika BMI berlebih atau kadar lemak tinggi),
'Surplus' (muscle gain jika kurus atau underweight), atau
'Maintenance' (rekomposisi tubuh seimbang jika ideal).

Format data pengembalian harus berupa JSON VALID dengan struktur persis seperti ini:
{
  "focus_type": "Caloric Deficit" atau "Surplus" atau "Maintenance",
  "calories": angka target kalori harian (integer, misal: 1800),
  "protein": angka protein target dalam gram (integer, misal: 150),
  "analysis": "Penjelasan recomposisi tubuh kasual gaul, asik, humoris, memotivasi, dan mendidik dalam Bahasa Indonesia."
}

Aturan Penting:
1. Hanya kembalikan output objek JSON yang valid tersebut. Jangan berikan teks pembuka atau penutup berformat markdown.`;

        const textOutput = await generateAI({ prompt, json: true });
        const data = JSON.parse(textOutput.trim());
        
        focusType = data.focus_type || 'Maintenance';
        targetCalories = parseInt(data.calories) || 2000;
        targetProtein = parseInt(data.protein) || 140;
        explanation = data.analysis || "Data terproses sempurna! Pertahankan performamu!";
      } catch (aiErr) {
        console.error("Gemini Recomp Analysis Generation Failed, falling back to static algorithms:", aiErr);
        // Static Algorithm Fallback
        if (bmi < 18.5) {
          focusType = 'Surplus';
          targetCalories = Math.round(bb * 33 + 400);
          targetProtein = Math.round(bb * 2.0);
          explanation = `Analisa Otomatis Forge AI: BMI-mu (${bmi.toFixed(1)}) tergolong underweight, Bro! Target kita sekarang adalah 'Surplus Kalori' demi naikin massa otot berkualitas! Jangan lupa makan karbo bersih dan genjot asupan protein harianmu.`;
        } else if (bmi > 25.0) {
          focusType = 'Caloric Deficit';
          targetCalories = Math.round(bb * 29 - 400);
          targetProtein = Math.round(bb * 1.8);
          explanation = `Analisa Otomatis Forge AI: BMI-mu (${bmi.toFixed(1)}) tergolong tinggi nih, Sis/Bro. Prioritas kita adalah 'Caloric Deficit' untuk membakar tumpukan lemak jahat sambil menjaga massa otot dengan latihan angkat beban intensif. Tetap disiplin!`;
        } else {
          focusType = 'Maintenance';
          targetCalories = Math.round(bb * 30);
          targetProtein = Math.round(bb * 1.8);
          explanation = `Analisa Otomatis Forge AI: Komposisi tubuhmu oke banget, BMI (${bmi.toFixed(1)}) ideal! Kita jalankan 'Maintenance kalori' untuk program recomposisi tubuh (hilangkan lemak tipis-tipis, isi dengan otot padat). Pertahankan latihan kerasmu!`;
        }
      }
    } else {
      // Direct calculations for fallback
      if (bmi < 18.5) {
        focusType = 'Surplus';
        targetCalories = Math.round(bb * 33 + 400);
        targetProtein = Math.round(bb * 2.0);
        explanation = `BMI-mu (${bmi.toFixed(1)}) tergolong kurus, nih! Untuk progres gila-gilaan, yuk surplus kalori sekitar 300-500 kcal di atas kalori harianmu. Pastiin latihan beban beban progresif dan tidur cukup minimal 7-8 jam per hari. Gaspol!`;
      } else if (bmi > 25.0) {
        focusType = 'Caloric Deficit';
        targetCalories = Math.round(bb * 29 - 400);
        targetProtein = Math.round(bb * 1.8);
        explanation = `BMI kamu sebesar (${bmi.toFixed(1)}) masuk kategori berlebih. Untuk fat loss yang sehat, yuk terapkan defisit kalori bersahabat. Jaga asupan protein tetap tinggi sekitar ${Math.round(bb * 1.8)}g agar otot nggak menyusut sewaktu berat badan berkurang!`;
      } else {
        focusType = 'Maintenance';
        targetCalories = Math.round(bb * 30);
        targetProtein = Math.round(bb * 1.8);
        explanation = `Berat badanmu sangat ideal dengan BMI (${bmi.toFixed(1)})! Pilihan terbaik adalah Body Recomposition seimbang (makan pas, latihan keras). Lemak bakal perlahan kabur digantikan otot kering yang padat nan aestetik. Mantap!`;
      }
    }

    // Save recomp analysis
    const recompId = Math.random().toString(36).substring(2, 11);
    const timeNow = Date.now();
    await db.execute({
      sql: `INSERT INTO recomp_analyses (id, profile_id, height, weight, bmi, analysis, focus_type, protein, calories, timestamp) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [recompId, profileId, tb, bb, bmi, explanation, focusType, targetProtein, targetCalories, timeNow]
    });

    // Update profile metrics
    await db.execute({
      sql: "UPDATE profiles SET height = ?, weight = ?, focus_area = ? WHERE id = ?",
      args: [tb, bb, focusType + " Plan", profileId]
    });

    await cacheDel(`recomp:${profileId}`);
    await cacheDel("profiles");

    res.json({
      id: recompId,
      profile_id: profileId,
      height: tb,
      weight: bb,
      bmi: parseFloat(bmi.toFixed(2)),
      analysis: explanation,
      focus_type: focusType,
      protein: targetProtein,
      calories: targetCalories,
      timestamp: timeNow
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to calculate recomp" });
  }
});

// 7. Get chat history for profile
app.get("/api/profiles/:id/chat", async (req, res) => {
  const profileId = req.params.id;
  try {
    const cached = await cacheGet(`chat:${profileId}`);
    if (cached) return res.json(JSON.parse(cached));
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT * FROM chat_history WHERE profile_id = ? ORDER BY timestamp ASC",
      args: [profileId]
    });
    await cacheSet(`chat:${profileId}`, JSON.stringify(result.rows), 120);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.json([]);
  }
});

// 8. Post new message to chat - response generated via Gemini AI
app.post("/api/profiles/:id/chat", async (req, res) => {
  const profileId = req.params.id;
  const { message } = req.body;
  const userMsgId = Math.random().toString(36).substring(2, 11);
  const timeNow = Date.now();

  if (!message || message.trim() === "") {
    return res.status(400).json({ error: "Pesan tidak boleh kosong" });
  }

  try {
    const db = getDb();
    
    // Save user message
    await db.execute({
      sql: `INSERT INTO chat_history (id, profile_id, sender, message, timestamp) VALUES (?, ?, 'user', ?, ?)`,
      args: [userMsgId, profileId, message, timeNow]
    });

    // Get client profile info
    const profileRes = await db.execute({
      sql: "SELECT * FROM profiles WHERE id = ?",
      args: [profileId]
    });
    const profile = profileRes.rows[0];
    const clientName = profile ? profile.name : "Teman";

    let aiResponseText = "";
    const hasApiKey = process.env.GEMINI_API_KEY ? true : false;

    if (hasApiKey) {
      try {
        const ai = getAi();
        
        // Fetch recent chat context
        const historyRes = await db.execute({
          sql: "SELECT sender, message FROM chat_history WHERE profile_id = ? ORDER BY timestamp DESC LIMIT 6",
          args: [profileId]
        });
        
        let contextLines = "";
        const history = [...historyRes.rows].reverse();
        history.forEach(row => {
          contextLines += `${row.sender === 'user' ? 'Klien' : 'Trainer'}: ${row.message}\n`;
        });

        // Fetch training history for AI learning
        const recentWorkouts = await db.execute({
          sql: "SELECT date, focus, exercises FROM workouts WHERE profile_id = ? ORDER BY date DESC LIMIT 10",
          args: [profileId]
        });
        let trainingContext = "";
        const prs: Record<string, number> = {};
        for (const row of recentWorkouts.rows) {
          try {
            const exs = typeof row.exercises === 'string' ? JSON.parse(row.exercises as string) : (row.exercises || []);
            const names = (exs as any[]).map((e: any) => `${e.name}${e.weight_kg ? ` ${e.weight_kg}kg` : ''}`).join(', ');
            trainingContext += `${row.date} [${row.focus}]: ${names}\n`;
            for (const ex of exs as any[]) {
              if (!ex.is_cardio && ex.weight_kg && (!prs[ex.name] || ex.weight_kg > prs[ex.name])) {
                prs[ex.name] = ex.weight_kg;
              }
            }
          } catch {}
        }
        const prList = Object.entries(prs).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n, w]) => `${n}: ${w}kg`).join(', ');

        // Fetch latest recomp
        const recompRes = await db.execute({
          sql: "SELECT bmi, focus_type, protein, calories FROM recomp_analyses WHERE profile_id = ? ORDER BY timestamp DESC LIMIT 1",
          args: [profileId]
        });
        const recomp = recompRes.rows[0];

        const prompt = `Kamu adalah Forge AI, seorang Personal Trainer Profesional dan Ahli Gizi yang ditugaskan membimbing klien bernama ${clientName}.
Gaya bicaramu santai, seru, asik, mendidik, penuh motivasi olahraga, dan menggunakan bahasa Indonesia gaul kekinian (seperti 'bro', 'sis', 'gaspol', 'gokil', 'mantap', 'aman', dll.).
Jawab seluruh pertanyaan seputar kebugaran, pola makan, cara latihan, tips mengecilkan perut, dll. secara jelas dan akurat namun tetap ceria.

PROFIL KLIEN:
- Tinggi: ${profile?.height || "?"} cm | Berat: ${profile?.weight || "?"} kg | Target: ${profile?.target_weight || "?"} kg
- Fokus: ${profile?.focus_area || "belum ditentukan"}
- Total Sesi: ${profile?.total_sessions || 0} | Weekly Streak: ${profile?.streak || 0} minggu
${recomp ? `- BMI: ${recomp.bmi} | Program: ${recomp.focus_type} | Target Protein: ${recomp.protein}g | Kalori: ${recomp.calories} kcal` : ''}

RIWAYAT LATIHAN TERAKHIR (10 sesi):
${trainingContext || "Belum ada riwayat latihan."}

PERSONAL RECORDS (PR):
${prList || "Belum ada PR."}

PERCAKAPAN TERAKHIR:
${contextLines}

Klien bertanya: "${message}"

Jawab sebagai Forge AI trainer yang SUDAH MENGENAL klien ini dengan baik berdasarkan data di atas. Berikan saran spesifik sesuai progress dan riwayat mereka.`;

        aiResponseText = await generateAI({ prompt }) || "Siap bimbing jalan kebugaranmu! Gaspol!";
      } catch (aiErr) {
        console.error("Gemini Chat Generation failed:", aiErr);
        aiResponseText = "Aman, Bro! Sistem AI agaknya lagi cooldown bentar, tapi intinya jangan lupa konsisten latihan beban, cukupi protein, dan tidur teratur ya! Ada pertanyaan lain?";
      }
    } else {
      // Fallback response generator based on keywords
      const msgLower = message.toLowerCase();
      if (msgLower.includes("makan") || msgLower.includes("diet") || msgLower.includes("nutrisi")) {
        aiResponseText = `Sip, seputar nutrisi nih! Bagi ${clientName}, resep utamanya itu gampang: batasi jajanan manis dan gorengan berlebih, ganti ke protein padat seperti dada ayam atau telur rebus demi jaga otot. Tetap semangat, Bro!`;
      } else if (msgLower.includes("lelah") || msgLower.includes("capek") || msgLower.includes("malas")) {
        aiResponseText = `Wajar banget ngerasa mager atau capek, ${clientName}. Tapi inget perjuanganmu sejauh ini! Kalau capek fisik, boleh istirahat 1-2 hari aktif, tapi jangan menyerah ya. Pintu gym selalu menantimu!`;
      } else if (msgLower.includes("perut") || msgLower.includes("buncit") || msgLower.includes("lemak")) {
        aiResponseText = `Mau ratain perut buncit? Kurangi makanan kalori tinggi dan genjot latihan kardio + beban demi memicu fat-burning terhebat. Nggak ada latihan instan, tapi dengan konsistensi pasti bisa rata! Gaspol!`;
      } else {
        aiResponseText = `Gokilpertanyaan luar biasa, ${clientName}! Pelatih sarankan buat selalu jaga teknik gerakan agar terhindar dari cedera, tambah berat angkatan secara progresif, serta konsisten latihan min 3 kali seminggu. Kamu pasti bisa melampaui limitmu!`;
      }
    }

    // Save AI response
    const aiMsgId = Math.random().toString(36).substring(2, 11);
    const aiTime = Date.now();
    await db.execute({
      sql: `INSERT INTO chat_history (id, profile_id, sender, message, timestamp) VALUES (?, ?, 'assistant', ?, ?)`,
      args: [aiMsgId, profileId, aiResponseText, aiTime]
    });

    await cacheDel(`chat:${profileId}`);

    res.json({
      id: aiMsgId,
      profile_id: profileId,
      sender: 'assistant',
      message: aiResponseText,
      timestamp: aiTime
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate chat response" });
  }
});

// 8b. Clear chat history
app.delete("/api/profiles/:id/chat", async (req, res) => {
  const profileId = req.params.id;
  try {
    const db = getDb();
    await db.execute({ sql: "DELETE FROM chat_history WHERE profile_id = ?", args: [profileId] });
    await cacheDel(`chat:${profileId}`);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to clear chat" });
  }
});

// 9. Workout Planner AI Generator
app.post("/api/workouts/generate", async (req, res) => {
  const { profileId, location, equipment, lastFocus, gymCompleteness, targetFocus } = req.body;
  
  try {
    const db = getDb();
    const profileRes = await db.execute({
      sql: "SELECT name FROM profiles WHERE id = ?",
      args: [profileId]
    });
    const clientName = profileRes.rows[0]?.name || "Klien";

    // Fetch recent 7-day workout history to avoid redundant muscle groups
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const recentLogs = await db.execute({
      sql: "SELECT date, focus FROM workouts WHERE profile_id = ? AND date >= ? ORDER BY date DESC",
      args: [profileId, sevenDaysAgo]
    });
    const recentHistory = recentLogs.rows.map(r => `${r.date}: ${r.focus}`).join("\n") || "Belum ada riwayat minggu ini";
 
    let focus = "";
    let exercises = [];
    const hasApiKey = process.env.GEMINI_API_KEY ? true : false;
 
    if (hasApiKey) {
      try {
        const ai = getAi();
        const prompt = `Kamu adalah seorang Personal Trainer Profesional bernama Forge AI. Kamu bertugas mengelola rencana latihan optimal harian untuk klien bernama ${clientName}.
 
INFORMASI SAAT INI:
- Tempat latihan: ${location || "Gym Umum"}
- Alat yang digunakan: ${equipment ? equipment.join(", ") : "Dumbbell, Bodyweight"} (${gymCompleteness || "gym lengkap"})
- Fokus latihan sebelumnya: ${lastFocus || "Pull Day"}
- TARGET/FOKUS YANG DIINGINKAN HARI INI: ${targetFocus && targetFocus !== "Otomatis (Rekomendasi AI)" ? targetFocus : "Tentukan otomatis (rotasikan latihan agar seimbang)"}

RIWAYAT LATIHAN 7 HARI TERAKHIR:
${recentHistory}

TUGAS UTAMA:
Tentukan jenis fokus latihan hari ini (misalnya Push Day, Pull Day, Legs Day, Upper Body, Lower Body, atau Full Body) sesuai Target/Fokus yang diinginkan di atas. Jika terpilih "Otomatis", rotasikan latihan agar seimbang dan semua kelompok otot terlatih secara bergantian secara optimal. PENTING: Jangan rekomendasikan kelompok otot yang sudah dilatih dalam 1-2 hari terakhir berdasarkan riwayat di atas agar otot mendapat waktu recovery yang cukup. Buatlah daftar latihan (berisi 4-6 gerakan variatif sesuai peralatan yang dipilih).
 
ATURAN GENERASI:
Jika peralatan terbatas (misalnya hanya Bodyweight atau Dumbbells), intensitas, volume, dan varian gerakan harus sangat disesuaikan (misalnya push up, squats, dumbbell chest press). Jika peralatan lengkap (Barbell, Cable, Machines), masukkan latihan seperti barbell squating, lat pulldown, cable crossovers.
 
Kembalikan response berupa JSON VALID yang persis dengan struktur ini:
{
  "focus": "Fokus latihan hari ini, misal: Push Day / Pull Day / Legs & Core / Full Body",
  "exercises": [
    {
      "name": "nama gerakan latihan (misal: Barbell Bench Press)",
      "sets": nomor_set_integer,
      "reps": "hitungan_repetisi_string (misal: '8-12' atau '12-15')",
      "notes": "tips form singkat yang asik, misal: 'Jaga siku 45 derajat, dorong eksplosif!'"
    }
  ]
}
 
Aturan Keras:
Hanya keluarkan hasil JSON saja tanpa teks pembuka/penutup markdown.`;
 
        const textOutput = await generateAI({ prompt, json: true });
        const data = JSON.parse(textOutput.trim());
        focus = data.focus || "Full Body Workout";
        exercises = data.exercises || [];
      } catch (aiErr) {
        console.error("Gemini workout planner failed. Fallback to automated router:", aiErr);
        // Fallback generator values
        ({ focus, exercises } = getFallbackWorkout(lastFocus, equipment || [], targetFocus));
      }
    } else {
      ({ focus, exercises } = getFallbackWorkout(lastFocus, equipment || [], targetFocus));
    }
 
    res.json({ focus, exercises });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate workout plan" });
  }
});

// 10. Scan Gym Equipment from Photo - Multimodal Gemini Service
app.post("/api/scan-equipment", async (req, res) => {
  const { image } = req.body; // base64 string
  if (!image) {
    return res.status(400).json({ error: "Foto alat gym harus disertakan." });
  }

  try {
    const hasApiKey = process.env.GEMINI_API_KEY ? true : false;
    if (hasApiKey) {
      const ai = getAi();
      // Remove data:image/... base64 prefix if exists
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      const imagePart = {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data
        }
      };

      const promptPart = {
        text: `Kamu adalah asisten ahli alat fitness profesional di FORGE AI. 
Analisa foto alat gym/mesin fitness ini, sebutkan nama alatnya, tujuan latihannya, kumpulan otot target, serta panduan penggunaannya yang benar dan aman.

Format file kembalian berupa JSON VALID berstruktur:
{
  "name": "Nama komersial alat gym ini (Contoh: Lat Pulldown Machine / Leg Press)",
  "description": "Deskripsi singkat mengenai fungsi dan guna alat ini bagi perkembangan tubuh.",
  "target_muscles": "Daftar otot-otot yang disasar secara rinci harafiah (Contoh: Latissimus dorsi, Biceps, Rhomboids).",
  "proper_form": "Panduan langkah demi langkah cara menggunakannya dengan postur tubuh yang benar, aman, dan mencegah cedera otot."
}

Aturan: Jangan sertakan blok pembuka/penutup markdown. Hanya kembalikan string JSON valid.`
      };

      let text = "{}";
      for (const model of MODELS) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: { parts: [imagePart, promptPart] },
            config: { responseMimeType: "application/json" }
          });
          text = response.text || "{}";
          break;
        } catch (err: any) {
          if ((err?.status === 503 || err?.status === 429) && model !== MODELS[MODELS.length - 1]) continue;
          throw err;
        }
      }
      const data = JSON.parse(text.trim());
      res.json(data);
    } else {
      // Return a demo simulation when offline or no API Key
      res.json({
        name: "Leg Press Machine (Simulasi)",
        description: "Alat gym populer untuk melatih otot tubuh bagian bawah (lower body) secara terisolasi tanpa membebani tulang belakang secara langsung.",
        target_muscles: "Quadriceps (paha depan), Gluteus Maximus (pantat), dan Hamstrings (paha belakang).",
        proper_form: "1. Duduk dengan punggung menempel rata pada sandaran.\n2. Taruh kaki selebar bahu pada plat besi.\n3. Lepas tuas pengaman, turunkan beban perlahan sampai lutut menekuk 90 derajat.\n4. Dorong kembali plat ke atas dengan bertumpu pada tumit (Jangan kunci lurus lutut di puncak)."
      });
    }
  } catch (err) {
    console.error("Scanning equipment failure:", err);
    res.status(500).json({ error: "Gagal mendeteksi alat gym dari foto yang diberikan. Pastikan foto jelas dan coba lagi." });
  }
});

// 11. Update Profile
app.put("/api/profiles/:id", async (req, res) => {
  const { id } = req.params;
  const { name, height, weight, target_weight, focus_area } = req.body;
  try {
    const db = getDb();
    await db.execute({
      sql: "UPDATE profiles SET name=?, height=?, weight=?, target_weight=?, focus_area=? WHERE id=?",
      args: [name, height, weight, target_weight, focus_area, id]
    });
    const result = await db.execute({ sql: "SELECT * FROM profiles WHERE id=?", args: [id] });
    await cacheDel("profiles");
    res.json(result.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to update profile" }); }
});

// 12. Delete Profile
app.delete("/api/profiles/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDb();
    await db.execute({ sql: "DELETE FROM workouts WHERE profile_id=?", args: [id] });
    await db.execute({ sql: "DELETE FROM chat_history WHERE profile_id=?", args: [id] });
    await db.execute({ sql: "DELETE FROM recomp_analyses WHERE profile_id=?", args: [id] });
    await db.execute({ sql: "DELETE FROM weight_history WHERE profile_id=?", args: [id] });
    await db.execute({ sql: "DELETE FROM workout_templates WHERE profile_id=?", args: [id] });
    await db.execute({ sql: "DELETE FROM goals WHERE profile_id=?", args: [id] });
    await db.execute({ sql: "DELETE FROM profiles WHERE id=?", args: [id] });
    await cacheDel("profiles");
    await cacheDel(`logs:${id}`);
    await cacheDel(`chat:${id}`);
    await cacheDel(`recomp:${id}`);
    await cacheDel(`weight:${id}`);
    await cacheDel(`tpl:${id}`);
    await cacheDel(`goals:${id}`);
    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to delete profile" }); }
});

// 13. Weight History
app.get("/api/profiles/:id/weight-history", async (req, res) => {
  const { id } = req.params;
  try {
    const cached = await cacheGet(`weight:${id}`);
    if (cached) return res.json(JSON.parse(cached));
    const db = getDb();
    const result = await db.execute({ sql: "SELECT * FROM weight_history WHERE profile_id=? ORDER BY timestamp DESC LIMIT 20", args: [id] });
    await cacheSet(`weight:${id}`, JSON.stringify(result.rows));
    res.json(result.rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to fetch weight history" }); }
});

app.post("/api/profiles/:id/weight-history", async (req, res) => {
  const { id } = req.params;
  const { weight, date } = req.body;
  try {
    const db = getDb();
    const entryId = `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.execute({
      sql: "INSERT INTO weight_history (id, profile_id, weight, date, timestamp) VALUES (?,?,?,?,?)",
      args: [entryId, id, weight, date || new Date().toISOString().split('T')[0], Date.now()]
    });
    await cacheDel(`weight:${id}`);
    res.json({ id: entryId, profile_id: id, weight, date, timestamp: Date.now() });
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to log weight" }); }
});

// 14. Workout Templates
app.get("/api/profiles/:id/templates", async (req, res) => {
  const { id } = req.params;
  try {
    const cached = await cacheGet(`tpl:${id}`);
    if (cached) return res.json(JSON.parse(cached));
    const db = getDb();
    const result = await db.execute({ sql: "SELECT * FROM workout_templates WHERE profile_id=? ORDER BY created_at DESC", args: [id] });
    const templates = result.rows.map((r: any) => ({ ...r, exercises: JSON.parse(r.exercises as string) }));
    await cacheSet(`tpl:${id}`, JSON.stringify(templates));
    res.json(templates);
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to fetch templates" }); }
});

app.post("/api/profiles/:id/templates", async (req, res) => {
  const { id } = req.params;
  const { name, focus, exercises } = req.body;
  try {
    const db = getDb();
    const tplId = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.execute({
      sql: "INSERT INTO workout_templates (id, profile_id, name, focus, exercises, created_at) VALUES (?,?,?,?,?,?)",
      args: [tplId, id, name, focus, JSON.stringify(exercises), Date.now()]
    });
    await cacheDel(`tpl:${id}`);
    res.json({ id: tplId, profile_id: id, name, focus, exercises, created_at: Date.now() });
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to save template" }); }
});

app.delete("/api/profiles/:id/templates/:tplId", async (req, res) => {
  const { id, tplId } = req.params;
  try {
    const db = getDb();
    await db.execute({ sql: "DELETE FROM workout_templates WHERE id=? AND profile_id=?", args: [tplId, id] });
    await cacheDel(`tpl:${id}`);
    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to delete template" }); }
});

// 15. Goals
app.get("/api/profiles/:id/goals", async (req, res) => {
  const { id } = req.params;
  try {
    const cached = await cacheGet(`goals:${id}`);
    if (cached) return res.json(JSON.parse(cached));
    const db = getDb();
    const result = await db.execute({ sql: "SELECT * FROM goals WHERE profile_id=? ORDER BY created_at DESC", args: [id] });
    await cacheSet(`goals:${id}`, JSON.stringify(result.rows));
    res.json(result.rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to fetch goals" }); }
});

app.post("/api/profiles/:id/goals", async (req, res) => {
  const { id } = req.params;
  const { type, target_value, current_value, target_date, description } = req.body;
  try {
    const db = getDb();
    const goalId = `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.execute({
      sql: "INSERT INTO goals (id, profile_id, type, target_value, current_value, target_date, description, created_at) VALUES (?,?,?,?,?,?,?,?)",
      args: [goalId, id, type, target_value, current_value || 0, target_date, description, Date.now()]
    });
    await cacheDel(`goals:${id}`);
    res.json({ id: goalId, profile_id: id, type, target_value, current_value: current_value || 0, target_date, description, completed: 0, created_at: Date.now() });
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to create goal" }); }
});

app.put("/api/profiles/:id/goals/:goalId", async (req, res) => {
  const { id, goalId } = req.params;
  const { current_value, completed } = req.body;
  try {
    const db = getDb();
    await db.execute({
      sql: "UPDATE goals SET current_value=?, completed=? WHERE id=? AND profile_id=?",
      args: [current_value, completed ? 1 : 0, goalId, id]
    });
    await cacheDel(`goals:${id}`);
    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to update goal" }); }
});

app.delete("/api/profiles/:id/goals/:goalId", async (req, res) => {
  const { id, goalId } = req.params;
  try {
    const db = getDb();
    await db.execute({ sql: "DELETE FROM goals WHERE id=? AND profile_id=?", args: [goalId, id] });
    await cacheDel(`goals:${id}`);
    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to delete goal" }); }
});

// 16. CSV Export
app.get("/api/profiles/:id/export-csv", async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDb();
    const logsRes = await db.execute({ sql: "SELECT * FROM workouts WHERE profile_id=? ORDER BY date DESC", args: [id] });
    let csv = "Date,Focus,Location,Equipment,Exercise,Sets,Reps,Weight(kg),Notes\n";
    for (const row of logsRes.rows) {
      const exercises = JSON.parse(row.exercises as string);
      for (const ex of exercises) {
        csv += `"${row.date}","${row.focus}","${row.location || ''}","${row.equipment || ''}","${ex.name}",${ex.sets},"${ex.reps}",${ex.weight_kg || ''},"${(ex.notes || '').replace(/"/g, '""')}"\n`;
      }
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=forge-ai-export-${id}.csv`);
    res.send(csv);
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to export CSV" }); }
});

function getFallbackWorkout(lastFocus: string, equipment: string[], targetFocus?: string) {
  let focus = targetFocus && targetFocus !== "Otomatis (Rekomendasi AI)" ? targetFocus : "Push Day";
  let exercises = [];

  const equipStr = equipment.join(", ").toLowerCase();
  const isLimited = equipment.length <= 2 && (equipStr.includes("bodyweight") || equipStr.includes("dumbbell"));

  // Rotate focus
  if (lastFocus.toLowerCase().includes("push")) {
    focus = "Pull Day";
    exercises = isLimited ? [
      { name: "Dumbbell Rows", sets: 4, reps: "10-12", notes: "Squeeze belikat di puncak gerakan, kontrol eksentrik." },
      { name: "Dumbbell Bicep Curls", sets: 3, reps: "12-15", notes: "Kunci siku di samping badan, jangan mengayun." },
      { name: "Bodyweight Inverted Pulls", sets: 3, reps: "AMRAP", notes: "Gunakan meja miring atau tiang rendah, badan lurus." },
      { name: "Dumbbell Hammer Curls", sets: 3, reps: "12", notes: "Grip netral, fokus isi ketebalan lengan bawah." }
    ] : [
      { name: "Barbell Deadlift", sets: 4, reps: "6-8", notes: "Kunci punggung bawah tetap flat, dorong bumi pakai kaki." },
      { name: "Lat Pulldown Machine", sets: 4, reps: "10-12", notes: "Tarik bar ke dada atas, busungkan dada." },
      { name: "Cable Seated Row", sets: 3, reps: "12", notes: "Tarik ke arah pusar, kendalikan tarikan saat maju." },
      { name: "EZ-Bar Bicep Curl", sets: 3, reps: "10-12", notes: "Eksplorasi puncak kontraksi bicep." }
    ];
  } else if (lastFocus.toLowerCase().includes("pull")) {
    focus = "Legs & Core Day";
    exercises = isLimited ? [
      { name: "Bodyweight Squats", sets: 4, reps: "15-20", notes: "Turun sampai sejajar paha, dorong tumit." },
      { name: "Dumbbell Romanian Deadlifts", sets: 4, reps: "12", notes: "Dorong pinggul ke belakang, rasakan stretch di hamstring." },
      { name: "Walking Lunges", sets: 3, reps: "12 langkah/kaki", notes: "Langkah mantap, lutut hampir menyentuh lantai." },
      { name: "Plank holding", sets: 3, reps: "45-60 detik", notes: "Kencangkan perut dan sikut sejajar bahu." }
    ] : [
      { name: "Barbell Back Squats", sets: 4, reps: "8-10", notes: "Jaga dada tegak lurus, dorong dari dasar kaki." },
      { name: "Leg Press Machine", sets: 4, reps: "12", notes: "Jangan kunci lutut di puncak gerakan untuk keamanan." },
      { name: "Leg Curls (Seat/Lie)", sets: 3, reps: "12-15", notes: "Fokus kontraksi hamstring berulang-ulang." },
      { name: "Cable Crunch", sets: 3, reps: "15", notes: "Lengkungkan punggung saat menarik beban ke bawah." }
    ];
  } else {
    // Default Push
    focus = "Push Day";
    exercises = isLimited ? [
      { name: "Decline Push-Ups", sets: 4, reps: "Max Reps", notes: "Kunci perut, letakkan kaki di tempat tinggi." },
      { name: "Dumbbell Shoulder Press", sets: 3, reps: "12", notes: "Dorong vertikal, perlahan saat menurunkan beban." },
      { name: "Dumbbell Floor Press", sets: 4, reps: "12", notes: "Alternatif bench press, siku menyentuh lantai pelan." },
      { name: "Tricep Dips on Bench", sets: 3, reps: "15", notes: "Jaga posisi punggung tetap dekat ke bangku." }
    ] : [
      { name: "Barbell Flat Bench Press", sets: 4, reps: "8-10", notes: "Grip kuat, turunkan bar perlahan ke arah dada bawah." },
      { name: "Seat Dumbbell Overhead Press", sets: 4, reps: "10", notes: "Kembangkan bahu luar sepenuhnya." },
      { name: "Cable Chest Crossover", sets: 3, reps: "12-15", notes: "Rasakan squeezing otot dada bagian tengah." },
      { name: "Cable Tricep Pushdown", sets: 3, reps: "12", notes: "Kunci siku, luruskan lengan ke bawah penuh." }
    ];
  }

  return { focus, exercises };
}


// Serve Vite or static files based on node environment

// Toggle Apple Health connection
app.post("/api/profiles/:id/apple-health", async (req, res) => {
  const profileId = req.params.id;
  const { connected } = req.body;
  try {
    const db = getDb();
    await db.execute({
      sql: "UPDATE profiles SET apple_health_connected = ? WHERE id = ?",
      args: [connected ? 1 : 0, profileId]
    });
    await cacheDel("profiles");
    res.json({ success: true, connected });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update Apple Health status" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

