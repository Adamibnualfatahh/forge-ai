import { getDb } from "./db.js";
import { getAi, generateAI, recompSchema, workoutPlanSchema, getFallbackWorkout, MODELS } from "./ai.js";
import multer from "multer";
import { XMLParser } from "fast-xml-parser";
import { registerPushRoutes } from "../push.js";

export function registerApiRoutes(app: any, cacheClient?: any) {
  async function cacheGet(key: string): Promise<string | null> {
    if (!cacheClient) return null;
    try { return await cacheClient.get("forge-ai-" + key); } catch { return null; }
  }

  async function cacheSet(key: string, value: string, ttl = 300): Promise<void> {
    if (!cacheClient) return;
    try { await cacheClient.setex("forge-ai-" + key, ttl, value); } catch {}
  }

  async function cacheDel(key: string): Promise<void> {
    if (!cacheClient) return;
    try {
      if (typeof cacheClient.del === 'function') {
        await cacheClient.del("forge-ai-" + key);
      }
    } catch {}
  }

  app.get("/api/profiles", async (req: any, res: any) => {
    try {
      const cached = await cacheGet("profiles");
      if (cached) return res.json(JSON.parse(cached));
      const db = getDb();
      const result = await db.execute("SELECT * FROM profiles");
      await cacheSet("profiles", JSON.stringify(result.rows));
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

  app.post("/api/profiles", async (req: any, res: any) => {
    const { id, name, height, weight, target_weight, focus_area } = req.body;
    const lowercaseId = id ? id.toLowerCase() : name.toLowerCase().replace(/\s+/g, "_");
    
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

  app.put("/api/profiles/:id", async (req: any, res: any) => {
    const { id } = req.params;
    const { name, height, weight, target_weight, focus_area } = req.body;
    try {
      const db = getDb();
      await db.execute({ sql: "UPDATE profiles SET name=?, height=?, weight=?, target_weight=?, focus_area=? WHERE id=?", args: [name, height, weight, target_weight, focus_area, id] });
      const result = await db.execute({ sql: "SELECT * FROM profiles WHERE id=?", args: [id] });
      await cacheDel("profiles");
      res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: "Failed" }); }
  });

  app.delete("/api/profiles/:id", (req: any, res: any) => {
    res.status(403).json({ error: "Penghapusan profil dinonaktifkan." });
  });

  app.get("/api/profiles/:id/logs", async (req: any, res: any) => {
    const profileId = req.params.id;
    try {
      const cached = await cacheGet(`logs:${profileId}`);
      if (cached) return res.json(JSON.parse(cached));
      const db = getDb();
      const result = await db.execute({
        sql: "SELECT * FROM workouts WHERE profile_id = ? ORDER BY date DESC",
        args: [profileId]
      });
      
      const logs = result.rows.map((row: any) => ({
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

  app.get("/api/profiles/:id/logs/paginated", async (req: any, res: any) => {
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
      const logs = result.rows.map((row: any) => ({
        ...row,
        exercises: typeof row.exercises === 'string' ? JSON.parse(row.exercises) : row.exercises
      }));
      res.json({ logs, hasMore: logs.length === limit });
    } catch (error) {
      console.error(error);
      res.json({ logs: [], hasMore: false });
    }
  });

  app.post("/api/profiles/:id/logs", async (req: any, res: any) => {
    const profileId = req.params.id;
    const { date, focus, location, equipment, exercises, calories_burned, avg_bpm, time_start, time_end } = req.body;
    const logId = Math.random().toString(36).substring(2, 11);

    try {
      const db = getDb();
      await db.execute({
        sql: `INSERT INTO workouts (id, profile_id, date, focus, location, equipment, exercises, calories_burned, avg_bpm, time_start, time_end) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [logId, profileId, date, focus, location, equipment, JSON.stringify(exercises), calories_burned || null, avg_bpm || null, time_start || null, time_end || null]
      });

      db.execute({
        sql: `INSERT INTO workout_audit_log (profile_id, workout_id, date, focus, exercises, logged_at) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [profileId, logId, date, focus, JSON.stringify(exercises), Date.now()]
      }).catch(() => {});

      const allLogs = await db.execute({
        sql: "SELECT date FROM workouts WHERE profile_id = ? ORDER BY date DESC",
        args: [profileId]
      });
      const dates = allLogs.rows.map((r: any) => r.date as string);
      const getWeekStart = (d: string) => {
        const dt = new Date(d + "T00:00:00");
        const day = dt.getDay();
        const diff = day === 0 ? 6 : day - 1; 
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
      const xpGained = 100 + ((exercises?.length || 0) * 10);
      await db.execute({
        sql: `UPDATE profiles 
              SET total_sessions = total_sessions + 1, 
                  streak = ?, 
                  xp = coalesce(xp, 0) + ?, 
                  level = CAST(((coalesce(xp, 0) + ?) / 1000) AS INTEGER) + 1 
              WHERE id = ?`,
        args: [streak, xpGained, xpGained, profileId]
      });

      await cacheDel(`logs:${profileId}`);
      await cacheDel("profiles");
      res.json({ success: true, logId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to log workout" });
    }
  });

  app.delete("/api/profiles/:profileId/logs/:logId", async (req: any, res: any) => {
    const { profileId, logId } = req.params;
    try {
      const db = getDb();
      const checkLog = await db.execute({
        sql: "SELECT id, exercises FROM workouts WHERE id = ? AND profile_id = ?",
        args: [logId, profileId]
      });

      if (checkLog.rows.length === 0) {
        return res.status(404).json({ error: "Sesi latihan tidak ditemukan" });
      }

      let deletedExercises: any[] = [];
      try { 
        deletedExercises = typeof checkLog.rows[0].exercises === 'string' 
          ? JSON.parse(checkLog.rows[0].exercises as string) 
          : checkLog.rows[0].exercises; 
      } catch(e) {}
      const xpLost = 100 + ((deletedExercises?.length || 0) * 10);

      await db.execute({
        sql: "DELETE FROM workouts WHERE id = ? AND profile_id = ?",
        args: [logId, profileId]
      });

      db.execute({
        sql: "UPDATE workout_audit_log SET deleted = 1 WHERE workout_id = ?",
        args: [logId]
      }).catch(() => {});

      const remainingLogs = await db.execute({
        sql: "SELECT date FROM workouts WHERE profile_id = ? ORDER BY date DESC",
        args: [profileId]
      });
      const dates = remainingLogs.rows.map((r: any) => r.date as string);
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
        sql: `UPDATE profiles 
              SET total_sessions = ?, 
                  streak = ?, 
                  xp = MAX(0, coalesce(xp, 0) - ?), 
                  level = MAX(1, CAST(((MAX(0, coalesce(xp, 0) - ?)) / 1000) AS INTEGER) + 1) 
              WHERE id = ?`,
        args: [dates.length, streak, xpLost, xpLost, profileId]
      });

      await cacheDel(`logs:${profileId}`);
      await cacheDel("profiles");
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete log:", error);
      res.status(500).json({ error: "Failed to delete workout log" });
    }
  });

  app.put("/api/profiles/:profileId/logs/:logId", async (req: any, res: any) => {
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

      await cacheDel(`logs:${profileId}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to update log:", error);
      res.status(500).json({ error: "Failed to update workout log" });
    }
  });

  app.get("/api/profiles/:id/recomp", async (req: any, res: any) => {
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

  app.post("/api/profiles/:id/recomp", async (req: any, res: any) => {
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

      const recompId = Math.random().toString(36).substring(2, 11);
      const timeNow = Date.now();
      await db.execute({
        sql: `INSERT INTO recomp_analyses (id, profile_id, height, weight, bmi, analysis, focus_type, protein, calories, timestamp) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [recompId, profileId, tb, bb, bmi, explanation, focusType, targetProtein, targetCalories, timeNow]
      });

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

  app.get("/api/profiles/:id/chat", async (req: any, res: any) => {
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

  app.post("/api/profiles/:id/chat", async (req: any, res: any) => {
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
          history.forEach((row: any) => {
            contextLines += `${row.sender === 'user' ? 'Klien' : 'Trainer'}: ${row.message}\n`;
          });

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
          aiResponseText = `Gokil pertanyaan luar biasa, ${clientName}! Pelatih sarankan buat selalu jaga teknik gerakan agar terhindar dari cedera, tambah berat angkatan secara progresif, serta konsisten latihan min 3 kali seminggu. Kamu pasti bisa melampaui limitmu!`;
        }
      }

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

  app.delete("/api/profiles/:id/chat", async (req: any, res: any) => {
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

  app.post("/api/workouts/generate", async (req: any, res: any) => {
    const { profileId, location, equipment, lastFocus, gymCompleteness, targetFocus, customInstructions } = req.body;
    const numExercises = req.body.numExercises ? parseInt(String(req.body.numExercises), 10) : null;
    try {
      const db = getDb();
      
      const profileRes = await db.execute({
        sql: "SELECT * FROM profiles WHERE id = ?",
        args: [profileId]
      });
      const profile = profileRes.rows[0];
      const profileName = profile ? profile.name : "Klien";
      const focusArea = profile ? profile.focus_area : "Umum";
      const currentWeight = profile ? (profile.weight as number) : 70;
      const targetWeight = profile ? (profile.target_weight as number) : 70;

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
      
      const prsRes = await db.execute({
        sql: `SELECT exercises FROM workouts WHERE profile_id = ? ORDER BY date DESC LIMIT 20`,
        args: [profileId]
      });
      
      const prs: Record<string, number> = {};
      prsRes.rows.forEach((row: any) => {
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

      const isFatLoss = targetWeight < currentWeight;
      const programType = isFatLoss
        ? `Fat Loss & Conditioning (Utamakan repetisi tinggi 12-15 reps dengan intensitas tinggi, sela istirahat pendek, dan WAJIB tambahkan 1-2 gerakan kardio terstruktur seperti Treadmill, Sepeda Statis, atau Jump Rope di akhir sesi)`
        : `Muscle Bulking & Strength (Utamakan latihan kekuatan/hipertrofi dengan compound lifts berat, repetisi sedang 6-10 reps, dan fokus pada progressive overload beban berat)`;

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
      let exercises: any[] = [];
      const hasApiKey = process.env.GEMINI_API_KEY ? true : false;
   
      if (hasApiKey) {
        try {
          const textOutput = await generateAI({ prompt, responseSchema: workoutPlanSchema });
          const data = JSON.parse(textOutput.trim());
          focus = data.focus || "Full Body";
          exercises = data.exercises || [];
          
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

  app.post("/api/scan-equipment", async (req: any, res: any) => {
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

  app.get("/api/profiles/:id/weight-history", async (req: any, res: any) => {
    const { id } = req.params;
    try {
      const db = getDb();
      const result = await db.execute({ sql: "SELECT * FROM weight_history WHERE profile_id=? ORDER BY timestamp DESC LIMIT 20", args: [id] });
      res.json(result.rows);
    } catch (e) { res.status(500).json({ error: "Failed" }); }
  });

  app.post("/api/profiles/:id/weight-history", async (req: any, res: any) => {
    const { id } = req.params;
    const { weight, date } = req.body;
    try {
      const db = getDb();
      const entryId = `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await db.execute({ sql: "INSERT INTO weight_history (id, profile_id, weight, date, timestamp) VALUES (?,?,?,?,?)", args: [entryId, id, weight, date || new Date().toISOString().split('T')[0], Date.now()] });
      res.json({ id: entryId, profile_id: id, weight, date, timestamp: Date.now() });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
  });

  app.get("/api/profiles/:id/templates", async (req: any, res: any) => {
    const { id } = req.params;
    try {
      const db = getDb();
      const result = await db.execute({ sql: "SELECT * FROM workout_templates WHERE profile_id=? ORDER BY created_at DESC", args: [id] });
      const templates = result.rows.map((r: any) => ({ ...r, exercises: JSON.parse(r.exercises as string) }));
      res.json(templates);
    } catch (e) { res.status(500).json({ error: "Failed" }); }
  });

  app.post("/api/profiles/:id/templates", async (req: any, res: any) => {
    const { id } = req.params;
    const { name, focus, exercises } = req.body;
    try {
      const db = getDb();
      const tplId = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await db.execute({ sql: "INSERT INTO workout_templates (id, profile_id, name, focus, exercises, created_at) VALUES (?,?,?,?,?,?)", args: [tplId, id, name, focus, JSON.stringify(exercises), Date.now()] });
      res.json({ id: tplId, profile_id: id, name, focus, exercises, created_at: Date.now() });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
  });

  app.delete("/api/profiles/:id/templates/:tplId", async (req: any, res: any) => {
    const { id, tplId } = req.params;
    try {
      const db = getDb();
      await db.execute({ sql: "DELETE FROM workout_templates WHERE id=? AND profile_id=?", args: [tplId, id] });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
  });

  app.get("/api/profiles/:id/goals", async (req: any, res: any) => {
    const { id } = req.params;
    try {
      const db = getDb();
      const result = await db.execute({ sql: "SELECT * FROM goals WHERE profile_id=? ORDER BY created_at DESC", args: [id] });
      res.json(result.rows);
    } catch (e) { res.status(500).json({ error: "Failed" }); }
  });

  app.post("/api/profiles/:id/goals", async (req: any, res: any) => {
    const { id } = req.params;
    const { type, target_value, current_value, target_date, description } = req.body;
    try {
      const db = getDb();
      const goalId = `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await db.execute({ sql: "INSERT INTO goals (id, profile_id, type, target_value, current_value, target_date, description, created_at) VALUES (?,?,?,?,?,?,?,?)", args: [goalId, id, type, target_value, current_value || 0, target_date, description, Date.now()] });
      res.json({ id: goalId, profile_id: id, type, target_value, current_value: current_value || 0, target_date, description, completed: 0, created_at: Date.now() });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
  });

  app.put("/api/profiles/:id/goals/:goalId", async (req: any, res: any) => {
    const { id, goalId } = req.params;
    const { current_value, completed } = req.body;
    try {
      const db = getDb();
      await db.execute({ sql: "UPDATE goals SET current_value=?, completed=? WHERE id=? AND profile_id=?", args: [current_value, completed ? 1 : 0, goalId, id] });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
  });

  app.delete("/api/profiles/:id/goals/:goalId", async (req: any, res: any) => {
    const { id, goalId } = req.params;
    try {
      const db = getDb();
      await db.execute({ sql: "DELETE FROM goals WHERE id=? AND profile_id=?", args: [goalId, id] });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
  });

  app.get("/api/profiles/:id/apple-health/sync", async (req: any, res: any) => {
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

  app.post("/api/profiles/:id/apple-health", async (req: any, res: any) => {
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

  app.get("/api/profiles/:id/apple-health", async (req: any, res: any) => {
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

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 150 * 1024 * 1024 } });

  app.post("/api/profiles/:id/apple-health/import-xml", upload.single("file"), async (req: any, res: any) => {
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

  app.get("/api/profiles/:id/export-csv", async (req: any, res: any) => {
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

  registerPushRoutes(app, getDb);
}
