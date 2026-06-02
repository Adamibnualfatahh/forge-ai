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

    // Run active reset script as requested by the user
    console.log("Executing requested active database reset...");
    
    // 1. Delete all workouts not belonging to 'adam'
    await db.execute("DELETE FROM workouts WHERE profile_id != 'adam'");

    // 2. Clear all other logs of adam, leaving only the single latest log
    await db.execute(`
      DELETE FROM workouts 
      WHERE profile_id = 'adam' 
        AND id NOT IN (
          SELECT id FROM (
            SELECT id FROM workouts 
            WHERE profile_id = 'adam' 
            ORDER BY date DESC 
            LIMIT 1
          )
        )
    `);

    // 3. Reset streaks and total_sessions for other profiles to 0
    await db.execute("UPDATE profiles SET streak = 0, total_sessions = 0 WHERE id != 'adam'");

    // 4. Update adam's profile to match the remaining workouts (which is at most 1) and reset their streak
    const adamWorkoutsCountRes = await db.execute("SELECT COUNT(*) as count FROM workouts WHERE profile_id = 'adam'");
    const adamWorkoutsCount = Number(adamWorkoutsCountRes.rows[0]?.count || 0);
    
    await db.execute({
      sql: "UPDATE profiles SET streak = 0, total_sessions = ? WHERE id = 'adam'",
      args: [adamWorkoutsCount]
    });

    console.log("Active database reset successfully finished!");
  } catch (error) {
    console.error("Database connection/init failed. Falling back to in-memory simulated DB on error.", error);
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
  
  try {
    const db = getDb();
    // Check if profile exists
    const check = await db.execute({
      sql: "SELECT * FROM profiles WHERE id = ?",
      args: [lowercaseId]
    });

    if (check.rows.length > 0) {
      // Update
      await db.execute({
        sql: `UPDATE profiles SET name = ?, height = ?, weight = ?, target_weight = ?, focus_area = ? WHERE id = ?`,
        args: [name, height || 170, weight || 70, target_weight || 65, focus_area || "Full Body", lowercaseId]
      });
    } else {
      // Insert
      const avatarPlaceholder = "https://lh3.googleusercontent.com/aida-public/AB6AXuAbQT_aWALW07Cd6ICo9_qrFRCuq6t9gakHs00cxzcOYFmmkmMhb7z3avcKkL6aA7wzvn1ZTddlVXeDeMPuOtHdmTvD19-BdAy8IkmF6_Fy2VCCfm8MPAEjDVj7yRM9Evy8sT89GRW3zIiPPVxCeOt-gWaiFnnTY5vN4Vb-34ks2LI0HgAvLnP4kW5zrf8DUwEr7RmTONrkTTHMUiR5pY1K69iC6bjqxnQ6CDobkC9eiTQ1tamtu1pI4n99Sy406A_NHtoPDRoclJ0";
      await db.execute({
        sql: `INSERT INTO profiles (id, name, avatar, height, weight, target_weight, focus_area, streak, total_sessions) 
              VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
        args: [lowercaseId, name, avatarPlaceholder, height || 170, weight || 70, target_weight || 65, focus_area || "Full Body"]
      });
    }

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

// 4. Save workout log for profile & increment sessions + streak
app.post("/api/profiles/:id/logs", async (req, res) => {
  const profileId = req.params.id;
  const { date, focus, location, equipment, exercises } = req.body;
  const logId = Math.random().toString(36).substring(2, 11);

  try {
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO workouts (id, profile_id, date, focus, location, equipment, exercises) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [logId, profileId, date, focus, location, equipment, JSON.stringify(exercises)]
    });

    // Update profile stats
    await db.execute({
      sql: "UPDATE profiles SET total_sessions = total_sessions + 1, streak = streak + 1 WHERE id = ?",
      args: [profileId]
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

    // Decrement profiles session count safely
    await db.execute({
      sql: "UPDATE profiles SET total_sessions = CASE WHEN total_sessions > 0 THEN total_sessions - 1 ELSE 0 END WHERE id = ?",
      args: [profileId]
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

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });

        const textOutput = response.text || "";
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
        
        // Fetch recent context
        const historyRes = await db.execute({
          sql: "SELECT sender, message FROM chat_history WHERE profile_id = ? ORDER BY timestamp DESC LIMIT 4",
          args: [profileId]
        });
        
        let contextLines = "";
        const history = [...historyRes.rows].reverse();
        history.forEach(row => {
          contextLines += `${row.sender === 'user' ? 'Klien' : 'Trainer'}: ${row.message}\n`;
        });

        const prompt = `Kamu adalah Forge AI, seorang Personal Trainer Profesional dan Ahli Gizi yang ditugaskan membimbing klien bernama ${clientName}.
Gaya bicaramu santai, seru, asik, mendidik, penuh motivasi olahraga, dan menggunakan bahasa Indonesia gaul kekinian (seperti 'bro', 'sis', 'gaspol', 'gokil', 'mantap', 'aman', dll.).
Jawab seluruh pertanyaan seputar kebugaran, pola makan, cara latihan, tips mengecilkan perut, dll. secara jelas dan akurat namun tetap ceria.

Detail Klien saat ini:
- Tinggi Badan: ${profile?.height || "belum dicatat"} cm
- Berat Badan: ${profile?.weight || "belum dicatat"} kg
- Rencana Fokus: ${profile?.focus_area || "belum ditentukan"}

LOG REST CHAT TERAKHIR:
${contextLines}
User bertanya baru: "${message}"

Berikan responsmu langsung sebagai asisten pelatih olahraga Forge AI!`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt
        });

        aiResponseText = response.text || "Siap bimbing jalan kebugaranmu! Gaspol!";
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

TUGAS UTAMA:
Tentukan jenis fokus latihan hari ini (misalnya Push Day, Pull Day, Legs Day, Upper Body, Lower Body, atau Full Body) sesuai Target/Fokus yang diinginkan di atas. Jika terpilih "Otomatis", rotasikan latihan agar seimbang dan semua kelompok otot terlatih secara bergantian secara optimal. Buatlah daftar latihan (berisi 4-6 gerakan variatif sesuai peralatan yang dipilih).
 
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
 
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });
 
        const textOutput = response.text || "";
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

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, promptPart] },
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
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
