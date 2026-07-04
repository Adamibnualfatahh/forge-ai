import { getDb, initDb } from "./api/shared/db.js";
import dotenv from "dotenv";

dotenv.config();

async function backfill() {
  await initDb();
  const db = getDb();
  
  const profilesRes = await db.execute("SELECT * FROM profiles");
  
  for (const profile of profilesRes.rows) {
    const profileId = profile.id;
    const workoutsRes = await db.execute({
      sql: "SELECT exercises FROM workouts WHERE profile_id = ?",
      args: [profileId]
    });
    
    let totalXp = 0;
    
    for (const row of workoutsRes.rows) {
      let numExercises = 0;
      try {
        const exercises = typeof row.exercises === 'string' ? JSON.parse(row.exercises) : row.exercises;
        if (Array.isArray(exercises)) {
          numExercises = exercises.length;
        }
      } catch (e) {}
      
      const xpGained = 100 + (numExercises * 10);
      totalXp += xpGained;
    }
    
    const level = Math.floor(totalXp / 1000) + 1;
    
    await db.execute({
      sql: "UPDATE profiles SET xp = ?, level = ? WHERE id = ?",
      args: [totalXp, level, profileId]
    });
    
    console.log(`Updated profile ${profile.name} (${profileId}): XP = ${totalXp}, Level = ${level}`);
  }
  
  console.log("Backfill complete.");
}

backfill().catch(console.error);
