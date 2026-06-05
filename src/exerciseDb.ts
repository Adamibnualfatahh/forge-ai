export interface ExerciseInfo {
  name: string;
  muscle: string;
  image: string;
  category: 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'cardio';
}

// Muscle anatomy images from wger.de (open source, public CDN)
// These show highlighted muscles on a full body outline
const BODY_FRONT = "https://wger.de/static/images/muscles/muscular_system_front.svg";
const BODY_BACK = "https://wger.de/static/images/muscles/muscular_system_back.svg";

// Muscle overlays (highlighted muscles on body)
const muscleImages = {
  chest: "https://wger.de/static/images/muscles/main/muscle-4.c9fa9a228bc8.svg",
  back: "https://wger.de/static/images/muscles/main/muscle-12.6a5de7a0e373.svg",
  shoulders: "https://wger.de/static/images/muscles/main/muscle-2.e1e1205a3202.svg",
  biceps: "https://wger.de/static/images/muscles/main/muscle-1.8790f8a0b3b9.svg",
  triceps: "https://wger.de/static/images/muscles/main/muscle-5.8a2b934b5486.svg",
  quads: "https://wger.de/static/images/muscles/main/muscle-10.b1445ea1acf6.svg",
  hamstrings: "https://wger.de/static/images/muscles/main/muscle-11.54ef31755917.svg",
  glutes: "https://wger.de/static/images/muscles/main/muscle-8.fbdfb46f3bc0.svg",
  calves: "https://wger.de/static/images/muscles/main/muscle-7.edbd8c381b0c.svg",
  abs: "https://wger.de/static/images/muscles/main/muscle-6.592f938fa8c7.svg",
};

// Which muscles are front-facing vs back-facing
const isBackMuscle: Record<string, boolean> = {
  back: true, hamstrings: true, glutes: true, calves: true,
};

export interface MuscleDisplay {
  body: string;
  overlay: string;
}

export function getMuscleDisplay(category: string): MuscleDisplay {
  const muscle = categoryToMuscle[category] || 'chest';
  return {
    body: isBackMuscle[muscle] ? BODY_BACK : BODY_FRONT,
    overlay: muscleImages[muscle as keyof typeof muscleImages] || muscleImages.chest,
  };
}

const categoryToMuscle: Record<string, string> = {
  chest: 'chest', back: 'back', shoulders: 'shoulders',
  arms: 'biceps', legs: 'quads', core: 'abs', cardio: 'quads',
};

// Backward compat helper - returns overlay URL
export function getMuscleImage(category: string): string {
  const muscle = categoryToMuscle[category] || 'chest';
  return muscleImages[muscle as keyof typeof muscleImages] || muscleImages.chest;
}

export const EXERCISE_DB: ExerciseInfo[] = [
  // Chest
  { name: "Barbell Bench Press", muscle: "Chest, Triceps", image: muscleImages.chest, category: 'chest' },
  { name: "Incline Dumbbell Press", muscle: "Upper Chest", image: muscleImages.chest, category: 'chest' },
  { name: "Dumbbell Fly", muscle: "Chest", image: muscleImages.chest, category: 'chest' },
  { name: "Cable Crossover", muscle: "Chest", image: muscleImages.chest, category: 'chest' },
  { name: "Push Up", muscle: "Chest, Triceps", image: muscleImages.chest, category: 'chest' },
  { name: "Decline Bench Press", muscle: "Lower Chest", image: muscleImages.chest, category: 'chest' },
  { name: "Chest Dip", muscle: "Lower Chest, Triceps", image: muscleImages.chest, category: 'chest' },
  { name: "Incline Barbell Press", muscle: "Upper Chest", image: muscleImages.chest, category: 'chest' },
  { name: "Machine Chest Press", muscle: "Chest", image: muscleImages.chest, category: 'chest' },
  { name: "Pec Deck Fly", muscle: "Chest", image: muscleImages.chest, category: 'chest' },
  { name: "Dumbbell Bench Press", muscle: "Chest, Triceps", image: muscleImages.chest, category: 'chest' },
  { name: "Decline Dumbbell Press", muscle: "Lower Chest", image: muscleImages.chest, category: 'chest' },
  { name: "Landmine Press", muscle: "Upper Chest, Shoulders", image: muscleImages.chest, category: 'chest' },
  { name: "Svend Press", muscle: "Inner Chest", image: muscleImages.chest, category: 'chest' },
  { name: "Diamond Push Up", muscle: "Chest, Triceps", image: muscleImages.chest, category: 'chest' },
  { name: "Wide Push Up", muscle: "Chest", image: muscleImages.chest, category: 'chest' },
  // Back
  { name: "Barbell Row", muscle: "Back, Biceps", image: muscleImages.back, category: 'back' },
  { name: "Lat Pulldown", muscle: "Lats", image: muscleImages.back, category: 'back' },
  { name: "Deadlift", muscle: "Back, Hamstrings", image: muscleImages.back, category: 'back' },
  { name: "Seated Cable Row", muscle: "Mid Back", image: muscleImages.back, category: 'back' },
  { name: "Pull Up", muscle: "Lats, Biceps", image: muscleImages.back, category: 'back' },
  { name: "T-Bar Row", muscle: "Mid Back", image: muscleImages.back, category: 'back' },
  { name: "Face Pull", muscle: "Rear Delt, Traps", image: muscleImages.shoulders, category: 'back' },
  { name: "Single Arm Dumbbell Row", muscle: "Lats, Rhomboids", image: muscleImages.back, category: 'back' },
  { name: "Close Grip Lat Pulldown", muscle: "Lats, Biceps", image: muscleImages.back, category: 'back' },
  { name: "Wide Grip Lat Pulldown", muscle: "Lats", image: muscleImages.back, category: 'back' },
  { name: "Chin Up", muscle: "Lats, Biceps", image: muscleImages.back, category: 'back' },
  { name: "Pendlay Row", muscle: "Upper Back", image: muscleImages.back, category: 'back' },
  { name: "Meadows Row", muscle: "Lats", image: muscleImages.back, category: 'back' },
  { name: "Chest Supported Row", muscle: "Mid Back", image: muscleImages.back, category: 'back' },
  { name: "Cable Pullover", muscle: "Lats", image: muscleImages.back, category: 'back' },
  { name: "Rack Pull", muscle: "Upper Back, Traps", image: muscleImages.back, category: 'back' },
  { name: "Inverted Row", muscle: "Back, Biceps", image: muscleImages.back, category: 'back' },
  { name: "Dumbbell Pullover", muscle: "Lats, Chest", image: muscleImages.back, category: 'back' },
  { name: "Straight Arm Pulldown", muscle: "Lats", image: muscleImages.back, category: 'back' },
  // Shoulders
  { name: "Overhead Press", muscle: "Shoulders", image: muscleImages.shoulders, category: 'shoulders' },
  { name: "Lateral Raise", muscle: "Side Delt", image: muscleImages.shoulders, category: 'shoulders' },
  { name: "Front Raise", muscle: "Front Delt", image: muscleImages.shoulders, category: 'shoulders' },
  { name: "Arnold Press", muscle: "Shoulders", image: muscleImages.shoulders, category: 'shoulders' },
  { name: "Reverse Fly", muscle: "Rear Delt", image: muscleImages.shoulders, category: 'shoulders' },
  { name: "Dumbbell Shoulder Press", muscle: "Shoulders", image: muscleImages.shoulders, category: 'shoulders' },
  { name: "Cable Lateral Raise", muscle: "Side Delt", image: muscleImages.shoulders, category: 'shoulders' },
  { name: "Upright Row", muscle: "Shoulders, Traps", image: muscleImages.shoulders, category: 'shoulders' },
  { name: "Barbell Shrug", muscle: "Traps", image: muscleImages.shoulders, category: 'shoulders' },
  { name: "Dumbbell Shrug", muscle: "Traps", image: muscleImages.shoulders, category: 'shoulders' },
  { name: "Machine Shoulder Press", muscle: "Shoulders", image: muscleImages.shoulders, category: 'shoulders' },
  { name: "Rear Delt Fly Machine", muscle: "Rear Delt", image: muscleImages.shoulders, category: 'shoulders' },
  { name: "Lu Raise", muscle: "Shoulders", image: muscleImages.shoulders, category: 'shoulders' },
  { name: "Behind Neck Press", muscle: "Shoulders", image: muscleImages.shoulders, category: 'shoulders' },
  { name: "Bradford Press", muscle: "Shoulders", image: muscleImages.shoulders, category: 'shoulders' },
  // Arms
  { name: "Bicep Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms' },
  { name: "Hammer Curl", muscle: "Biceps, Forearm", image: muscleImages.biceps, category: 'arms' },
  { name: "Tricep Pushdown", muscle: "Triceps", image: muscleImages.triceps, category: 'arms' },
  { name: "Skull Crusher", muscle: "Triceps", image: muscleImages.triceps, category: 'arms' },
  { name: "Preacher Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms' },
  { name: "Tricep Dip", muscle: "Triceps", image: muscleImages.triceps, category: 'arms' },
  { name: "Concentration Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms' },
  { name: "Cable Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms' },
  { name: "Incline Dumbbell Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms' },
  { name: "EZ Bar Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms' },
  { name: "Spider Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms' },
  { name: "Overhead Tricep Extension", muscle: "Triceps", image: muscleImages.triceps, category: 'arms' },
  { name: "Close Grip Bench Press", muscle: "Triceps, Chest", image: muscleImages.triceps, category: 'arms' },
  { name: "Tricep Kickback", muscle: "Triceps", image: muscleImages.triceps, category: 'arms' },
  { name: "Cable Overhead Extension", muscle: "Triceps", image: muscleImages.triceps, category: 'arms' },
  { name: "Bayesian Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms' },
  { name: "Reverse Curl", muscle: "Forearm, Biceps", image: muscleImages.biceps, category: 'arms' },
  { name: "Wrist Curl", muscle: "Forearm", image: muscleImages.biceps, category: 'arms' },
  { name: "Dumbbell Kickback", muscle: "Triceps", image: muscleImages.triceps, category: 'arms' },
  // Legs
  { name: "Barbell Squat", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs' },
  { name: "Leg Press", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs' },
  { name: "Romanian Deadlift", muscle: "Hamstrings", image: muscleImages.hamstrings, category: 'legs' },
  { name: "Leg Curl", muscle: "Hamstrings", image: muscleImages.hamstrings, category: 'legs' },
  { name: "Leg Extension", muscle: "Quads", image: muscleImages.quads, category: 'legs' },
  { name: "Calf Raise", muscle: "Calves", image: muscleImages.calves, category: 'legs' },
  { name: "Lunge", muscle: "Quads, Glutes", image: muscleImages.glutes, category: 'legs' },
  { name: "Hip Thrust", muscle: "Glutes", image: muscleImages.glutes, category: 'legs' },
  { name: "Bulgarian Split Squat", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs' },
  { name: "Hack Squat", muscle: "Quads", image: muscleImages.quads, category: 'legs' },
  { name: "Goblet Squat", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs' },
  { name: "Front Squat", muscle: "Quads", image: muscleImages.quads, category: 'legs' },
  { name: "Sumo Deadlift", muscle: "Glutes, Inner Thigh", image: muscleImages.glutes, category: 'legs' },
  { name: "Walking Lunge", muscle: "Quads, Glutes", image: muscleImages.glutes, category: 'legs' },
  { name: "Step Up", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs' },
  { name: "Seated Calf Raise", muscle: "Calves", image: muscleImages.calves, category: 'legs' },
  { name: "Smith Machine Squat", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs' },
  { name: "Good Morning", muscle: "Hamstrings, Lower Back", image: muscleImages.hamstrings, category: 'legs' },
  { name: "Glute Bridge", muscle: "Glutes", image: muscleImages.glutes, category: 'legs' },
  { name: "Nordic Hamstring Curl", muscle: "Hamstrings", image: muscleImages.hamstrings, category: 'legs' },
  { name: "Sissy Squat", muscle: "Quads", image: muscleImages.quads, category: 'legs' },
  { name: "Pendulum Squat", muscle: "Quads", image: muscleImages.quads, category: 'legs' },
  { name: "Cable Pull Through", muscle: "Glutes, Hamstrings", image: muscleImages.glutes, category: 'legs' },
  { name: "Adductor Machine", muscle: "Inner Thigh", image: muscleImages.quads, category: 'legs' },
  { name: "Abductor Machine", muscle: "Outer Thigh, Glutes", image: muscleImages.glutes, category: 'legs' },
  // Core
  { name: "Plank", muscle: "Core", image: muscleImages.abs, category: 'core' },
  { name: "Cable Crunch", muscle: "Abs", image: muscleImages.abs, category: 'core' },
  { name: "Hanging Leg Raise", muscle: "Lower Abs", image: muscleImages.abs, category: 'core' },
  { name: "Russian Twist", muscle: "Obliques", image: muscleImages.abs, category: 'core' },
  { name: "Ab Wheel Rollout", muscle: "Core", image: muscleImages.abs, category: 'core' },
  { name: "Bicycle Crunch", muscle: "Obliques, Abs", image: muscleImages.abs, category: 'core' },
  { name: "Mountain Climber", muscle: "Core, Cardio", image: muscleImages.abs, category: 'core' },
  { name: "Dead Bug", muscle: "Core", image: muscleImages.abs, category: 'core' },
  { name: "Woodchop", muscle: "Obliques", image: muscleImages.abs, category: 'core' },
  { name: "Dragon Flag", muscle: "Core", image: muscleImages.abs, category: 'core' },
  { name: "Side Plank", muscle: "Obliques", image: muscleImages.abs, category: 'core' },
  { name: "Decline Sit Up", muscle: "Abs", image: muscleImages.abs, category: 'core' },
  { name: "Pallof Press", muscle: "Core, Anti-rotation", image: muscleImages.abs, category: 'core' },
  { name: "Toe Touch Crunch", muscle: "Abs", image: muscleImages.abs, category: 'core' },
  // Cardio
  { name: "Treadmill", muscle: "Cardio", image: muscleImages.calves, category: 'cardio' },
  { name: "Cycling", muscle: "Cardio, Legs", image: muscleImages.quads, category: 'cardio' },
  { name: "Rowing Machine", muscle: "Cardio, Back", image: muscleImages.back, category: 'cardio' },
  { name: "Jump Rope", muscle: "Cardio, Calves", image: muscleImages.calves, category: 'cardio' },
  { name: "Stair Climber", muscle: "Cardio, Glutes", image: muscleImages.glutes, category: 'cardio' },
  { name: "Elliptical", muscle: "Cardio, Full Body", image: muscleImages.quads, category: 'cardio' },
  { name: "Battle Ropes", muscle: "Cardio, Arms", image: muscleImages.biceps, category: 'cardio' },
  { name: "Burpees", muscle: "Cardio, Full Body", image: muscleImages.quads, category: 'cardio' },
  { name: "Box Jump", muscle: "Cardio, Legs", image: muscleImages.quads, category: 'cardio' },
  { name: "Assault Bike", muscle: "Cardio, Full Body", image: muscleImages.quads, category: 'cardio' },
  { name: "Sprints", muscle: "Cardio, Legs", image: muscleImages.quads, category: 'cardio' },
  { name: "Swimming", muscle: "Cardio, Full Body", image: muscleImages.back, category: 'cardio' },
  { name: "Kettlebell Swing", muscle: "Cardio, Glutes, Core", image: muscleImages.glutes, category: 'cardio' },
];

export function searchExercises(query: string): ExerciseInfo[] {
  if (!query.trim()) return EXERCISE_DB;
  const q = query.toLowerCase();
  return EXERCISE_DB.filter(e => e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q) || e.category.includes(q));
}

export function getExerciseInfo(name: string): ExerciseInfo | undefined {
  const lower = name.toLowerCase();
  return EXERCISE_DB.find(e => e.name.toLowerCase() === lower)
    || EXERCISE_DB.find(e => lower.includes(e.name.toLowerCase().split(' ')[0]) || e.name.toLowerCase().includes(lower.split(' ')[0]));
}
