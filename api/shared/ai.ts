import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getAi() {
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

export const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

export async function generateAI(opts: { prompt: string; json?: boolean; responseSchema?: any }) {
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

export const recompSchema = {
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

export const workoutPlanSchema = {
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

export function getFallbackWorkout(lastFocus: string, equipment: string[], targetFocus?: string, numExercises?: number | null, customInstructions?: string) {
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
    { name: "Barbell Deadlift", sets: 4, reps: "6-8", notes: "Kunci punggung bawah flat.", weight_kg: 40 },
    { name: "Lat Pulldown Machine", sets: 4, reps: "10-12", notes: "Tarik bar ke dada atas.", weight_kg: 35 },
    { name: "Cable Seated Row", sets: 3, reps: "12", notes: "Tarik ke arah pusar.", weight_kg: 30 },
    { name: "EZ-Bar Bicep Curl", sets: 3, reps: "10-12", notes: "Eksplorasi puncak kontraksi.", weight_kg: 15 },
    { name: "Face Pulls", sets: 3, reps: "15", notes: "Tarik tali ke arah dahi.", weight_kg: 15 },
    { name: "Preacher Curl Machine", sets: 3, reps: "12", notes: "Siku stabil, isolasi biceps.", weight_kg: 15 }
  ];

  const legsLimited = [
    { name: "Bodyweight Squats", sets: 4, reps: "15-20", notes: "Turun sampai sejajar paha.", weight_kg: 0 },
    { name: "Dumbbell Romanian Deadlifts", sets: 4, reps: "12", notes: "Dorong pinggul ke belakang.", weight_kg: 10 },
    { name: "Walking Lunges", sets: 3, reps: "12 langkah/kaki", notes: "Langkah mantap.", weight_kg: 6 },
    { name: "Plank holding", sets: 3, reps: "45-60 detik", notes: "Kencangkan perut.", weight_kg: 0 },
    { name: "Calf Raises", sets: 4, reps: "20", notes: "Jinjit maksimal.", weight_kg: 0 }
  ];

  const legsFull = [
    { name: "Barbell Back Squats", sets: 4, reps: "8-10", notes: "Jaga dada tegak.", weight_kg: 30 },
    { name: "Leg Press Machine", sets: 4, reps: "12", notes: "Jangan kunci lutut.", weight_kg: 50 },
    { name: "Leg Curls", sets: 3, reps: "12-15", notes: "Fokus kontraksi hamstring.", weight_kg: 20 },
    { name: "Cable Crunch", sets: 3, reps: "15", notes: "Lengkungkan punggung.", weight_kg: 20 },
    { name: "Leg Extension Machine", sets: 3, reps: "12-15", notes: "Isolasi paha depan.", weight_kg: 25 },
    { name: "Calf Raise Machine", sets: 4, reps: "15", notes: "Kontraksi penuh betis.", weight_kg: 25 }
  ];

  const pushLimited = [
    { name: "Decline Push-Ups", sets: 4, reps: "Max Reps", notes: "Kunci perut.", weight_kg: 0 },
    { name: "Dumbbell Shoulder Press", sets: 3, reps: "12", notes: "Dorong vertikal.", weight_kg: 10 },
    { name: "Dumbbell Floor Press", sets: 4, reps: "12", notes: "Siku menyentuh lantai pelan.", weight_kg: 12 },
    { name: "Tricep Dips on Bench", sets: 3, reps: "15", notes: "Punggung dekat bangku.", weight_kg: 0 },
    { name: "Dumbbell Lateral Raise", sets: 3, reps: "15", notes: "Samping bahu.", weight_kg: 4 }
  ];

  const pushFull = [
    { name: "Barbell Flat Bench Press", sets: 4, reps: "8-10", notes: "Turunkan bar perlahan.", weight_kg: 35 },
    { name: "Seat Dumbbell Overhead Press", sets: 4, reps: "10", notes: "Kembangkan bahu luar.", weight_kg: 12 },
    { name: "Cable Chest Crossover", sets: 3, reps: "12-15", notes: "Squeezing dada.", weight_kg: 15 },
    { name: "Cable Tricep Pushdown", sets: 3, reps: "12", notes: "Luruskan lengan ke bawah.", weight_kg: 15 },
    { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", notes: "Target dada atas.", weight_kg: 12 },
    { name: "Lateral Raise Machine", sets: 3, reps: "15", notes: "Isolasi otot bahu.", weight_kg: 10 }
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
