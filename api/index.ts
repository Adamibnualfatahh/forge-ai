import express from "express";
import dotenv from "dotenv";
import { createClient } from "@libsql/client";
import { GoogleGenAI, Type } from "@google/genai";
import multer from "multer";
import { XMLParser } from "fast-xml-parser";
import { ensurePushSchema, registerPushRoutes } from "./push";

dotenv.config();

const app = express();

// Set up server-side JSON and Form body parsers
app.use(express.json({ limit: "10mb" }));
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
async function generateAI(opts: { prompt: string; json?: boolean; responseSchema?: any }) {
  const ai = getAi();
  for (const model of MODELS) {
    try {
      const config: any = {};
      if (opts.json || opts.responseSchema) {
        config.responseMimeType = "application/json";
      }
      if (opts.responseSchema) {
        config.responseSchema = opts.responseSchema;
      }
      const response = await ai.models.generateContent({ model, contents: opts.prompt, config });
      return response.text || "";
    } catch (err: any) {
      if ((err?.status === 503 || err?.status === 429) && model !== MODELS[MODELS.length - 1]) continue;
      throw err;
    }
  }
  return "";
}

const recompSchema = {
  type: Type.OBJECT,
  properties: {
    focus_type: { 
      type: Type.STRING, 
      enum: ["Caloric Deficit", "Surplus", "Maintenance"],
      description: "Nutrition focus type based on user profile" 
    },
    calories: { 
      type: Type.INTEGER, 
      description: "Recommended daily caloric target" 
    },
    protein: { 
      type: Type.INTEGER, 
      description: "Recommended daily protein target in grams" 
    },
    analysis: { 
      type: Type.STRING, 
      description: "Casual, friendly body recomposition analysis" 
    }
  },
  required: ["focus_type", "calories", "protein", "analysis"]
};

const workoutPlanSchema = {
  type: Type.OBJECT,
  properties: {
    focus: { 
      type: Type.STRING, 
      description: "Name of the workout plan focus, e.g. Push Day, Pull Day, Leg Day" 
    },
    exercises: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the exercise" },
          sets: { type: Type.INTEGER, description: "Recommended number of sets" },
          reps: { type: Type.STRING, description: "Recommended repetitions, e.g. '8-10', '12', or duration for cardio like '30 min'" },
          weight_kg: { type: Type.NUMBER, description: "Suggested starting weight in kg" },
          notes: { type: Type.STRING, description: "Tips and overload suggestions" }
        },
        required: ["name", "sets", "reps", "notes"]
      }
    }
  },
  required: ["focus", "exercises"]
};

// Initialize tables
let dbInitialized = false;
async function initDb() {
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
        total_sessions INTEGER DEFAULT 0
      )
    `);
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        date TEXT NOT NULL,
        focus TEXT,
        location TEXT,
        equipment TEXT,
        exercises TEXT NOT NULL
      )
    `);

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

    // Audit log - write-only archive, never queried by API endpoints
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

    // Web Push subscriptions table
    await ensurePushSchema(db);

    // Verify and seed default profiles
    const existing = await db.execute("SELECT * FROM profiles");    if (existing.rows.length === 0) {
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

    dbInitialized = true;
    console.log("Database initialized successfully.");
  } catch (error) {
    console.error("Database connection/init failed.", error);
  }
}

// Middleware to ensure DB is initialized before handling requests
app.use(async (_req, _res, next) => {
  await initDb();
  next();
});

// API ENDPOINTS

// 1. Get all profiles
app.get("/api/profiles", async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute("SELECT * FROM profiles");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
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
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT * FROM workouts WHERE profile_id = ? ORDER BY date DESC",
      args: [profileId]
    });
    
    const logs = result.rows.map(row => ({
      ...row,
      exercises: typeof row.exercises === 'string' ? JSON.parse(row.exercises) : row.exercises
    }));
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
  const { date, focus, location, equipment, exercises, time_start, time_end } = req.body;
  const logId = Math.random().toString(36).substring(2, 11);

  try {
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO workouts (id, profile_id, date, focus, location, equipment, exercises, time_start, time_end) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [logId, profileId, date, focus, location, equipment, JSON.stringify(exercises), time_start || null, time_end || null]
    });

    // Audit log - fire and forget
    db.execute({
      sql: `INSERT INTO workout_audit_log (profile_id, workout_id, date, focus, exercises, logged_at) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [profileId, logId, date, focus, JSON.stringify(exercises), Date.now()]
    }).catch(() => {});

    // Update profile stats - recalculate weekly streak
    const allLogs = await db.execute({
      sql: "SELECT date FROM workouts WHERE profile_id = ? ORDER BY date DESC",
      args: [profileId]
    });
    const dates = allLogs.rows.map(r => r.date as string);
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
      sql: "UPDATE profiles SET total_sessions = total_sessions + 1, streak = ? WHERE id = ?",
      args: [streak, profileId]
    });

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

    // Mark in audit log - fire and forget
    db.execute({
      sql: "UPDATE workout_audit_log SET deleted = 1 WHERE workout_id = ?",
      args: [logId]
    }).catch(() => {});

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

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete log:", error);
    res.status(500).json({ error: "Failed to delete workout log" });
  }
});

// 4b. Update/Edit workout log
app.put("/api/profiles/:profileId/logs/:logId", async (req, res) => {
  const { profileId, logId } = req.params;
  const { date, focus, location, equipment, exercises, time_start, time_end } = req.body;
  try {
    const db = getDb();
    
    const checkLog = await db.execute({
      sql: "SELECT id FROM workouts WHERE id = ? AND profile_id = ?",
      args: [logId, profileId]
    });

    if (checkLog.rows.length === 0) {
      return res.status(404).json({ error: "Sesi latihan tidak ditemukan" });
    }

    await db.execute({
      sql: `UPDATE workouts SET date = ?, focus = ?, location = ?, equipment = ?, exercises = ?, time_start = ?, time_end = ? 
            WHERE id = ? AND profile_id = ?`,
      args: [date, focus, location, equipment, JSON.stringify(exercises), time_start || null, time_end || null, logId, profileId]
    });

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
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT * FROM recomp_analyses WHERE profile_id = ? ORDER BY timestamp DESC LIMIT 1",
      args: [profileId]
    });
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error(error);
    res.json(null);
  }
});

// 6. Post body recomposition (TB and BB) - generate advice using Gemini AI
app.post("/api/profiles/:id/recomp", async (req, res) => {
  const profileId = req.params.id;
  const { height, weight } = req.body;
  const tb = parseFloat(height);
  const bb = parseFloat(weight);

  if (isNaN(tb) || isNaN(bb) || tb <= 0 || bb <= 0) {
    return res.status(400).json({ error: "Tinggi Badan dan Berat Badan harus angka valid positif" });
  }

  const bmi = bb / Math.pow(tb / 100, 2);

  try {
    const db = getDb();
    const profileRes = await db.execute({
      sql: "SELECT name FROM profiles WHERE id = ?",
      args: [profileId]
    });
    const clientName = profileRes.rows[0]?.name || "Klien";

    let focusType: 'Caloric Deficit' | 'Surplus' | 'Maintenance' = 'Maintenance';
    let targetCalories = 2000;
    let targetProtein = 140;
    let explanation = "Terus konsisten berolahraga gila-gilaan, penuhi nutrisi seimbang!";

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
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT * FROM chat_history WHERE profile_id = ? ORDER BY timestamp ASC",
      args: [profileId]
    });
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
    
    await db.execute({
      sql: `INSERT INTO chat_history (id, profile_id, sender, message, timestamp) VALUES (?, ?, 'user', ?, ?)`,
      args: [userMsgId, profileId, message, timeNow]
    });

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
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to clear chat" });
  }
});

// 9. Workout Planner AI Generator
function getFallbackWorkout(lastFocus: string, equipment: string[], targetFocus?: string, numExercises?: number | null, customInstructions?: string) {
  let focus = targetFocus && targetFocus !== "Otomatis (Rekomendasi AI)" ? targetFocus : "Push Day";
  let exercises: any[] = [];

  const equipStr = (equipment || []).join(", ").toLowerCase();
  const isLimited = (equipment || []).length <= 2 && (equipStr.includes("bodyweight") || equipStr.includes("dumbbell"));

  const rawInst = (customInstructions || "").toLowerCase();
  const noLegs = rawInst.includes("leg") || rawInst.includes("kaki") || rawInst.includes("cidera") || rawInst.includes("cedera") || rawInst.includes("bawah") || rawInst.includes("lower");

  let selectedRoutine = "push";

  if (targetFocus && targetFocus !== "Otomatis (Rekomendasi AI)") {
    if (targetFocus.toLowerCase().includes("push")) {
      selectedRoutine = "push";
    } else if (targetFocus.toLowerCase().includes("pull")) {
      selectedRoutine = "pull";
    } else if (targetFocus.toLowerCase().includes("leg") || targetFocus.toLowerCase().includes("lower")) {
      selectedRoutine = noLegs ? "push" : "legs";
    } else if (targetFocus.toLowerCase().includes("upper")) {
      selectedRoutine = "push";
    } else {
      selectedRoutine = "push";
    }
  } else {
    if (lastFocus.toLowerCase().includes("push")) {
      selectedRoutine = "pull";
    } else if (lastFocus.toLowerCase().includes("pull")) {
      selectedRoutine = noLegs ? "push" : "legs";
    } else {
      selectedRoutine = "push";
    }
  }

  const pullLimited = [
    { name: "Dumbbell Rows", sets: 4, reps: "10-12", notes: "Squeeze belikat di puncak gerakan, kontrol eksentrik.", weight_kg: 10 },
    { name: "Dumbbell Bicep Curls", sets: 3, reps: "12-15", notes: "Kunci siku di samping badan, jangan mengayun.", weight_kg: 8 },
    { name: "Bodyweight Inverted Pulls", sets: 3, reps: "AMRAP", notes: "Gunakan meja miring atau tiang rendah, badan lurus.", weight_kg: 0 },
    { name: "Dumbbell Hammer Curls", sets: 3, reps: "12", notes: "Grip netral, fokus isi ketebalan lengan bawah.", weight_kg: 8 },
    { name: "Dumbbell Rear Delt Fly", sets: 3, reps: "12-15", notes: "Badan membungkuk, rasakan kontraksi bahu belakang.", weight_kg: 4 }
  ];

  const pullFull = [
    { name: "Barbell Deadlift", sets: 4, reps: "6-8", notes: "Kunci punggung bawah tetap flat, dorong bumi pakai kaki.", weight_kg: 40 },
    { name: "Lat Pulldown Machine", sets: 4, reps: "10-12", notes: "Tarik bar ke dada atas, busungkan dada.", weight_kg: 35 },
    { name: "Cable Seated Row", sets: 3, reps: "12", notes: "Tarik ke arah pusar, kendalikan tarikan saat maju.", weight_kg: 30 },
    { name: "EZ-Bar Bicep Curl", sets: 3, reps: "10-12", notes: "Eksplorasi puncak kontraksi bicep.", weight_kg: 15 },
    { name: "Face Pulls", sets: 3, reps: "15", notes: "Tarik tali ke arah dahi, kuatkan bahu belakang.", weight_kg: 15 },
    { name: "Preacher Curl Machine", sets: 3, reps: "12", notes: "Siku bersandar stabil, fokus isolasi biceps.", weight_kg: 15 }
  ];

  const legsLimited = [
    { name: "Bodyweight Squats", sets: 4, reps: "15-20", notes: "Turun sampai sejajar paha, dorong tumit.", weight_kg: 0 },
    { name: "Dumbbell Romanian Deadlifts", sets: 4, reps: "12", notes: "Dorong pinggul ke belakang, rasakan stretch di hamstring.", weight_kg: 10 },
    { name: "Walking Lunges", sets: 3, reps: "12 langkah/kaki", notes: "Langkah mantap, lutut hampir menyentuh lantai.", weight_kg: 6 },
    { name: "Plank holding", sets: 3, reps: "45-60 detik", notes: "Kencangkan perut dan sikut sejajar bahu.", weight_kg: 0 },
    { name: "Calf Raises", sets: 4, reps: "20", notes: "Jinjit maksimal di lantai rata.", weight_kg: 0 }
  ];

  const legsFull = [
    { name: "Barbell Back Squats", sets: 4, reps: "8-10", notes: "Jaga dada tegak lurus, dorong dari dasar kaki.", weight_kg: 30 },
    { name: "Leg Press Machine", sets: 4, reps: "12", notes: "Jangan kunci lutut di puncak gerakan untuk keamanan.", weight_kg: 50 },
    { name: "Leg Curls (Seat/Lie)", sets: 3, reps: "12-15", notes: "Fokus kontraksi hamstring berulang-ulang.", weight_kg: 20 },
    { name: "Cable Crunch", sets: 3, reps: "15", notes: "Lengkungkan punggung saat menarik beban ke bawah.", weight_kg: 20 },
    { name: "Leg Extension Machine", sets: 3, reps: "12-15", notes: "Isolasi paha depan, tahan 1 detik di puncak.", weight_kg: 25 },
    { name: "Calf Raise Machine", sets: 4, reps: "15", notes: "Fokus kontraksi penuh betis di puncak gerakan.", weight_kg: 25 }
  ];

  const pushLimited = [
    { name: "Decline Push-Ups", sets: 4, reps: "Max Reps", notes: "Kunci perut, letakkan kaki di tempat tinggi.", weight_kg: 0 },
    { name: "Dumbbell Shoulder Press", sets: 3, reps: "12", notes: "Dorong vertikal, perlahan saat menurunkan beban.", weight_kg: 10 },
    { name: "Dumbbell Floor Press", sets: 4, reps: "12", notes: "Alternatif bench press, siku menyentuh lantai pelan.", weight_kg: 12 },
    { name: "Tricep Dips on Bench", sets: 3, reps: "15", notes: "Jaga posisi punggung tetap dekat ke bangku.", weight_kg: 0 },
    { name: "Dumbbell Lateral Raise", sets: 3, reps: "15", notes: "Fokus pada samping bahu, pergelangan tangan rileks.", weight_kg: 4 }
  ];

  const pushFull = [
    { name: "Barbell Flat Bench Press", sets: 4, reps: "8-10", notes: "Grip kuat, turunkan bar perlahan ke arah dada bawah.", weight_kg: 35 },
    { name: "Seat Dumbbell Overhead Press", sets: 4, reps: "10", notes: "Kembangkan bahu luar sepenuhnya.", weight_kg: 12 },
    { name: "Cable Chest Crossover", sets: 3, reps: "12-15", notes: "Rasakan squeezing otot dada bagian tengah.", weight_kg: 15 },
    { name: "Cable Tricep Pushdown", sets: 3, reps: "12", notes: "Kunci siku, luruskan lengan ke bawah penuh.", weight_kg: 15 },
    { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", notes: "Sudut bangku 30 derajat, target dada atas.", weight_kg: 12 },
    { name: "Lateral Raise Machine", sets: 3, reps: "15", notes: "Isolasi otot bahu samping secara maksimal.", weight_kg: 10 }
  ];

  if (selectedRoutine === "pull") {
    focus = "Pull Day";
    exercises = isLimited ? pullLimited : pullFull;
  } else if (selectedRoutine === "legs") {
    focus = "Legs & Core Day";
    exercises = isLimited ? legsLimited : legsFull;
  } else {
    focus = "Push Day";
    exercises = isLimited ? pushLimited : pushFull;
  }

  const targetCount = numExercises && numExercises > 0 ? numExercises : exercises.length;
  let finalExercises: any[] = [];
  
  if (targetCount === exercises.length) {
    finalExercises = [...exercises];
  } else if (targetCount < exercises.length) {
    finalExercises = exercises.slice(0, targetCount);
  } else {
    finalExercises = [...exercises];
    let idx = 0;
    while (finalExercises.length < targetCount) {
      const original = exercises[idx % exercises.length];
      finalExercises.push({
        ...original,
        name: `${original.name} (Set Tambahan)`
      });
      idx++;
    }
  }

  return { focus, exercises: finalExercises };
}

// 9. Workout Planner AI Generator
app.post("/api/workouts/generate", async (req, res) => {
  const { profileId, location, equipment, lastFocus, gymCompleteness, targetFocus, customInstructions } = req.body;
  const numExercises = req.body.numExercises ? parseInt(String(req.body.numExercises), 10) : null;
  try {
    const db = getDb();
    
    // Fetch active profile to check goals (bulk vs cut)
    const profileRes = await db.execute({
      sql: "SELECT * FROM profiles WHERE id = ?",
      args: [profileId]
    });
    const profile = profileRes.rows[0];
    const profileName = profile ? profile.name : "Klien";
    const focusArea = profile ? profile.focus_area : "Umum";
    const currentWeight = profile ? (profile.weight as number) : 70;
    const targetWeight = profile ? (profile.target_weight as number) : 70;

    // Fetch the actual last completed workout session from DB to enforce recovery safety
    const lastWorkoutRes = await db.execute({
      sql: "SELECT focus, exercises FROM workouts WHERE profile_id = ? ORDER BY date DESC LIMIT 1",
      args: [profileId]
    });
    const lastWorkout = lastWorkoutRes.rows[0];
    const actualLastFocus = lastWorkout ? lastWorkout.focus : (lastFocus || "Belum ada");
    let lastExercisesText = "Belum ada";
    if (lastWorkout && lastWorkout.exercises) {
      try {
        const parsedExs = JSON.parse(lastWorkout.exercises as string);
        lastExercisesText = parsedExs.map((e: any) => e.name).join(", ");
      } catch (e) {}
    }
    
    // Fetch PRs for progressive overload context
    const prsRes = await db.execute({
      sql: `SELECT exercises FROM workouts WHERE profile_id = ? ORDER BY date DESC LIMIT 20`,
      args: [profileId]
    });
    
    const prs: Record<string, number> = {};
    prsRes.rows.forEach(row => {
      try {
        const exercises = JSON.parse(row.exercises as string);
        exercises.forEach((ex: any) => {
          if (ex.weight_kg && (!prs[ex.name] || ex.weight_kg > prs[ex.name])) {
            prs[ex.name] = ex.weight_kg;
          }
        });
      } catch (e) {}
    });

    const prContext = Object.entries(prs).map(([name, weight]) => `${name}: ${weight}kg`).join(", ");

    // Determine type of program based on current weight vs target weight
    const isFatLoss = targetWeight < currentWeight;
    const programType = isFatLoss
      ? `Fat Loss & Conditioning (Utamakan repetisi tinggi 12-15 reps dengan intensitas tinggi, sela istirahat pendek, dan WAJIB tambahkan 1-2 gerakan kardio terstruktur seperti Treadmill, Sepeda Statis, atau Jump Rope di akhir sesi)`
      : `Muscle Bulking & Strength (Utamakan latihan kekuatan/hipertrofi dengan compound lifts berat, repetisi sedang 6-10 reps, dan fokus pada progressive overload beban berat)`;

    // Injected optional constraints
    let constraintText = "";
    if (numExercises) {
      constraintText += `\n- Jumlah Gerakan Wajib: Hasilkan tepat ${numExercises} gerakan dalam daftar exercises. Tidak boleh kurang dan tidak boleh lebih.`;
    }
    if (customInstructions && customInstructions.trim() !== "") {
      constraintText += `\n- PERINTAH TAMBAHAN DARI KLIEN (WAJIB DIPATUHI DENGAN PRIORITAS TERTINGGI): "${customInstructions}". Patuhi instruksi ini sepenuhnya. Misalnya jika ada perintah 'jangan ada leg day karena cedera', maka Anda sama sekali dilarang mencantumkan gerakan kaki atau melatih tubuh bagian bawah (Lower Body/Legs).`;
    }

    const prompt = `Kamu adalah Forge AI Trainer Pro. 
Generate workout plan yang dipersonalisasi untuk klien berikut:
- Nama Klien: ${profileName}
- Target Berat Badan: ${currentWeight} kg -> ${targetWeight} kg
- Fokus Profil: ${focusArea}
- Tipe Program Latihan & Nutrisi: ${programType}${constraintText}

INFORMASI LATIHAN SEBELUMNYA & RECOVERY OTOT (WAJIB DIPATUHI DEMI KEAMANAN):
- Sesi Terakhir Klien: "${actualLastFocus}" dengan gerakan: [${lastExercisesText}]
- Aturan Recovery: Otot utama yang sudah dilatih pada sesi terakhir membutuhkan waktu istirahat minimal 48 jam sebelum dilatih kembali.
- Jika Sesi Terakhir melatih kaki/tubuh bagian bawah (e.g. Legs, Leg Day, Lower Body, atau gerakan kaki seperti Squats, Leg Press, Lunges), maka hari ini JANGAN berikan gerakan kaki apapun. Hari ini harus melatih bagian tubuh atas (Upper Body, Push, atau Pull).
- Jika Sesi Terakhir melatih dada/bahu/tricep (Push Day/Upper Body), hari ini JANGAN berikan gerakan dorong dada atau bahu. Gantilah dengan gerakan tarik (Pull/Back/Biceps) atau tubuh bagian bawah (Legs).
- Secara umum, hindari melatih kelompok otot utama yang sama berturut-turut dua hari berturut-turut demi mencegah overtraining dan cedera.

KONTEKS LATIHAN KLIEN HARI INI:
- Lokasi Latihan: ${location}
- Alat yang Tersedia: ${equipment}
- Target Hari Ini: ${targetFocus}

KONTEKS PROGRESSIVE OVERLOAD (PR Terakhir Klien):
${prContext || "Belum ada riwayat."}

INSTRUKSI KHUSUS:
1. Jika gerakan ada di daftar PR, berikan saran beban (weight_kg) yang sedikit lebih tinggi (+1.25kg sampai +2.5kg) atau repetisi lebih banyak untuk progres.
2. Pastikan jenis latihan disesuaikan dengan profil gol klien (${profileName} ingin ${isFatLoss ? "mengurangi berat badan" : "menambah berat badan/otot"}).
3. PENTING: Anda WAJIB mengembalikan daftar exercises dengan jumlah elemen array tepat sebanyak ${numExercises || 6} gerakan!`;
    
    let focus = "Full Body";
    let exercises = [];
    const hasApiKey = process.env.GEMINI_API_KEY ? true : false;
 
    if (hasApiKey) {
      try {
        const textOutput = await generateAI({ prompt, responseSchema: workoutPlanSchema });
        const data = JSON.parse(textOutput.trim());
        focus = data.focus || "Full Body";
        exercises = data.exercises || [];
        
        // Final sanity check: if AI generated exercises count doesn't match and numExercises is provided
        if (numExercises && exercises.length !== numExercises) {
          console.warn(`Gemini returned ${exercises.length} exercises instead of requested ${numExercises}. Adjusting...`);
          if (exercises.length > numExercises) {
            exercises = exercises.slice(0, numExercises);
          } else {
            let idx = 0;
            while (exercises.length < numExercises) {
              const original = exercises[idx % exercises.length];
              exercises.push({
                ...original,
                name: `${original.name} (Variasi)`
              });
              idx++;
            }
          }
        }
      } catch (aiErr) {
        console.error("Gemini AI failed, using fallback workout:", aiErr);
        const fb = getFallbackWorkout(actualLastFocus, equipment || [], targetFocus, numExercises, customInstructions);
        focus = fb.focus;
        exercises = fb.exercises;
      }
    } else {
      const fb = getFallbackWorkout(actualLastFocus, equipment || [], targetFocus, numExercises, customInstructions);
      focus = fb.focus;
      exercises = fb.exercises;
    }
    res.json({ focus, exercises });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate workout plan" });
  }
});

// 10. Scan Gym Equipment from Photo - Multimodal Gemini Service
app.post("/api/scan-equipment", async (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: "Foto alat gym harus disertakan." });
  }

  try {
    const hasApiKey = process.env.GEMINI_API_KEY ? true : false;
    if (hasApiKey) {
      const ai = getAi();
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

      const response = await (async () => {
        const ai = getAi();
        for (const model of MODELS) {
          try {
            const r = await ai.models.generateContent({
              model,
              contents: { parts: [imagePart, promptPart] },
              config: { responseMimeType: "application/json" }
            });
            return r;
          } catch (err: any) {
            if ((err?.status === 503 || err?.status === 429) && model !== MODELS[MODELS.length - 1]) continue;
            throw err;
          }
        }
        return null;
      })();

      const text = response?.text || "{}";
      const data = JSON.parse(text.trim());
      res.json(data);
    } else {
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

// getFallbackWorkout moved up to line 870

// === NEW ENDPOINTS ===

// Update Profile
app.put("/api/profiles/:id", async (req, res) => {
  const { id } = req.params;
  const { name, height, weight, target_weight, focus_area } = req.body;
  try {
    const db = getDb();
    await db.execute({ sql: "UPDATE profiles SET name=?, height=?, weight=?, target_weight=?, focus_area=? WHERE id=?", args: [name, height, weight, target_weight, focus_area, id] });
    const result = await db.execute({ sql: "SELECT * FROM profiles WHERE id=?", args: [id] });
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

// Delete Profile
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
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

// Weight History
app.get("/api/profiles/:id/weight-history", async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDb();
    const result = await db.execute({ sql: "SELECT * FROM weight_history WHERE profile_id=? ORDER BY timestamp DESC LIMIT 20", args: [id] });
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.post("/api/profiles/:id/weight-history", async (req, res) => {
  const { id } = req.params;
  const { weight, date } = req.body;
  try {
    const db = getDb();
    const entryId = `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.execute({ sql: "INSERT INTO weight_history (id, profile_id, weight, date, timestamp) VALUES (?,?,?,?,?)", args: [entryId, id, weight, date || new Date().toISOString().split('T')[0], Date.now()] });
    res.json({ id: entryId, profile_id: id, weight, date, timestamp: Date.now() });
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

// Workout Templates
app.get("/api/profiles/:id/templates", async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDb();
    const result = await db.execute({ sql: "SELECT * FROM workout_templates WHERE profile_id=? ORDER BY created_at DESC", args: [id] });
    const templates = result.rows.map((r: any) => ({ ...r, exercises: JSON.parse(r.exercises as string) }));
    res.json(templates);
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.post("/api/profiles/:id/templates", async (req, res) => {
  const { id } = req.params;
  const { name, focus, exercises } = req.body;
  try {
    const db = getDb();
    const tplId = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.execute({ sql: "INSERT INTO workout_templates (id, profile_id, name, focus, exercises, created_at) VALUES (?,?,?,?,?,?)", args: [tplId, id, name, focus, JSON.stringify(exercises), Date.now()] });
    res.json({ id: tplId, profile_id: id, name, focus, exercises, created_at: Date.now() });
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.delete("/api/profiles/:id/templates/:tplId", async (req, res) => {
  const { id, tplId } = req.params;
  try {
    const db = getDb();
    await db.execute({ sql: "DELETE FROM workout_templates WHERE id=? AND profile_id=?", args: [tplId, id] });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

// Goals
app.get("/api/profiles/:id/goals", async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDb();
    const result = await db.execute({ sql: "SELECT * FROM goals WHERE profile_id=? ORDER BY created_at DESC", args: [id] });
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.post("/api/profiles/:id/goals", async (req, res) => {
  const { id } = req.params;
  const { type, target_value, current_value, target_date, description } = req.body;
  try {
    const db = getDb();
    const goalId = `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.execute({ sql: "INSERT INTO goals (id, profile_id, type, target_value, current_value, target_date, description, created_at) VALUES (?,?,?,?,?,?,?,?)", args: [goalId, id, type, target_value, current_value || 0, target_date, description, Date.now()] });
    res.json({ id: goalId, profile_id: id, type, target_value, current_value: current_value || 0, target_date, description, completed: 0, created_at: Date.now() });
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.put("/api/profiles/:id/goals/:goalId", async (req, res) => {
  const { id, goalId } = req.params;
  const { current_value, completed } = req.body;
  try {
    const db = getDb();
    await db.execute({ sql: "UPDATE goals SET current_value=?, completed=? WHERE id=? AND profile_id=?", args: [current_value, completed ? 1 : 0, goalId, id] });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.delete("/api/profiles/:id/goals/:goalId", async (req, res) => {
  const { id, goalId } = req.params;
  try {
    const db = getDb();
    await db.execute({ sql: "DELETE FROM goals WHERE id=? AND profile_id=?", args: [goalId, id] });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

// Apple Health Data Import (Simple GET for iOS Shortcuts - no JSON needed)
app.get("/api/profiles/:id/apple-health/sync", async (req, res) => {
  const { id } = req.params;
  const { steps, calories, exercise, distance, weight, date } = req.query;
  const syncDate = (date as string) || new Date().toISOString().split("T")[0];
  try {
    const db = getDb();
    const entries: { type: string; value: number; unit: string }[] = [];
    if (steps) entries.push({ type: "steps", value: parseFloat(steps as string), unit: "count" });
    if (calories) entries.push({ type: "activeEnergy", value: parseFloat(calories as string), unit: "kcal" });
    if (exercise) entries.push({ type: "exerciseMinutes", value: parseFloat(exercise as string), unit: "min" });
    if (distance) entries.push({ type: "distance", value: parseFloat(distance as string), unit: "km" });
    if (weight) entries.push({ type: "bodyMass", value: parseFloat(weight as string), unit: "kg" });

    const now = Date.now();
    for (const entry of entries) {
      // Delete existing record for same profile+date+type (anti-duplicate: replace strategy)
      await db.execute({
        sql: "DELETE FROM apple_health WHERE profile_id=? AND date=? AND type=?",
        args: [id, syncDate, entry.type]
      });
      const entryId = `ah_${now}_${Math.random().toString(36).slice(2, 8)}`;
      await db.execute({
        sql: "INSERT INTO apple_health (id, profile_id, type, value, unit, date, timestamp) VALUES (?,?,?,?,?,?,?)",
        args: [entryId, id, entry.type, entry.value, entry.unit, syncDate, now]
      });
    }
    res.json({ success: true, imported: entries.length, date: syncDate, last_synced: now });
  } catch (e) {
    console.error("Apple Health sync failed:", e);
    res.status(500).json({ error: "Failed" });
  }
});

// Apple Health Data Import (POST with JSON body)
app.post("/api/profiles/:id/apple-health", async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDb();
    const body = req.body || {};
    const entries = Array.isArray(body.data) ? body.data : Array.isArray(body) ? body : [body];
    let imported = 0;
    const now = Date.now();
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      const type = entry.type || "unknown";
      const date = entry.date || new Date().toISOString().split('T')[0];
      await db.execute({ sql: "DELETE FROM apple_health WHERE profile_id=? AND date=? AND type=?", args: [id, date, type] });
      const entryId = `ah_${now}_${Math.random().toString(36).slice(2, 8)}`;
      await db.execute({
        sql: "INSERT INTO apple_health (id, profile_id, type, value, unit, date, timestamp) VALUES (?,?,?,?,?,?,?)",
        args: [entryId, id, type, entry.value ?? 0, entry.unit || "", date, now]
      });
      imported++;
    }
    res.json({ success: true, imported, last_synced: now });
  } catch (e) {
    console.error("Apple Health import failed:", e);
    res.status(500).json({ error: "Failed to import Apple Health data" });
  }
});

app.get("/api/profiles/:id/apple-health", async (req, res) => {
  const { id } = req.params;
  const { from, to, type } = req.query;
  try {
    const db = getDb();
    let sql = "SELECT * FROM apple_health WHERE profile_id=?";
    const args: any[] = [id];
    if (from) { sql += " AND date >= ?"; args.push(from); }
    if (to) { sql += " AND date <= ?"; args.push(to); }
    if (type) { sql += " AND type = ?"; args.push(type); }
    sql += " ORDER BY date DESC, timestamp DESC LIMIT 2000";
    const result = await db.execute({ sql, args });
    const lastSync = await db.execute({ sql: "SELECT MAX(timestamp) as last_synced FROM apple_health WHERE profile_id=?", args: [id] });
    res.json({ data: result.rows, last_synced: lastSync.rows[0]?.last_synced || null });
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

// Apple Health XML Export Import
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 150 * 1024 * 1024 } });

app.post("/api/profiles/:id/apple-health/import-xml", upload.single("file"), async (req: any, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const db = getDb();
    const xml = req.file.buffer.toString("utf-8");
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const parsed = parser.parse(xml);

    const records = parsed?.HealthData?.Record;
    if (!records) return res.status(400).json({ error: "No health records found in XML" });

    const recordList = Array.isArray(records) ? records : [records];

    // Filter relevant types
    const relevantTypes = [
      "HKQuantityTypeIdentifierStepCount",
      "HKQuantityTypeIdentifierActiveEnergyBurned",
      "HKQuantityTypeIdentifierBasalEnergyBurned",
      "HKQuantityTypeIdentifierDistanceWalkingRunning",
      "HKQuantityTypeIdentifierHeartRate",
      "HKQuantityTypeIdentifierBodyMass",
      "HKQuantityTypeIdentifierBodyFatPercentage",
      "HKQuantityTypeIdentifierAppleExerciseTime",
    ];

    const typeMap: Record<string, string> = {
      "HKQuantityTypeIdentifierStepCount": "steps",
      "HKQuantityTypeIdentifierActiveEnergyBurned": "activeEnergy",
      "HKQuantityTypeIdentifierBasalEnergyBurned": "basalEnergy",
      "HKQuantityTypeIdentifierDistanceWalkingRunning": "distance",
      "HKQuantityTypeIdentifierHeartRate": "heartRate",
      "HKQuantityTypeIdentifierBodyMass": "bodyMass",
      "HKQuantityTypeIdentifierBodyFatPercentage": "bodyFat",
      "HKQuantityTypeIdentifierAppleExerciseTime": "exerciseMinutes",
    };

    // Aggregate by date + type (sum values per day)
    const aggregated: Record<string, { type: string; value: number; unit: string; date: string }> = {};

    for (const r of recordList) {
      const rType = r["@_type"];
      if (!relevantTypes.includes(rType)) continue;
      const date = (r["@_startDate"] || "").slice(0, 10);
      if (!date) continue;
      const key = `${date}_${rType}`;
      const val = parseFloat(r["@_value"]) || 0;
      const unit = r["@_unit"] || "";
      if (!aggregated[key]) {
        aggregated[key] = { type: typeMap[rType] || rType, value: 0, unit, date };
      }
      aggregated[key].value += val;
    }

    const entries = Object.values(aggregated);
    let imported = 0;
    for (const entry of entries) {
      const entryId = `ah_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await db.execute({
        sql: "INSERT INTO apple_health (id, profile_id, type, value, unit, date, timestamp) VALUES (?,?,?,?,?,?,?)",
        args: [entryId, id, entry.type, Math.round(entry.value * 100) / 100, entry.unit, entry.date, Date.now()]
      });
      imported++;
    }

    res.json({ success: true, imported, totalRecordsScanned: recordList.length });
  } catch (e: any) {
    console.error("Apple Health XML import failed:", e);
    res.status(500).json({ error: "Failed to parse XML: " + (e.message || "Unknown error") });
  }
});

// CSV Export
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
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

// Web Push (VAPID) routes: subscribe, unsubscribe, public key, cron sender
registerPushRoutes(app, getDb);

export default app;
