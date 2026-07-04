export type MovementType = 'compound' | 'isolation' | 'cardio' | 'static' | 'plyometric' | 'olympic' | 'calisthenics';
export type EquipmentType = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'kettlebell' | 'band' | 'plate' | 'smith_machine' | 'ez_bar' | 'trap_bar' | 'sled' | 'other';

export interface ExerciseInfo {
  name: string;
  muscle: string;
  image: string;
  category: 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'cardio';
  movementType: MovementType;
  equipment: EquipmentType;
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
  // ==================== CHEST ====================
  { name: "Barbell Bench Press", muscle: "Chest, Triceps", image: muscleImages.chest, category: 'chest', movementType: 'compound', equipment: 'barbell' },
  { name: "Incline Dumbbell Press", muscle: "Upper Chest", image: muscleImages.chest, category: 'chest', movementType: 'compound', equipment: 'dumbbell' },
  { name: "Dumbbell Fly", muscle: "Chest", image: muscleImages.chest, category: 'chest', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "Cable Crossover", muscle: "Chest", image: muscleImages.chest, category: 'chest', movementType: 'isolation', equipment: 'cable' },
  { name: "Push Up", muscle: "Chest, Triceps", image: muscleImages.chest, category: 'chest', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Decline Bench Press", muscle: "Lower Chest", image: muscleImages.chest, category: 'chest', movementType: 'compound', equipment: 'barbell' },
  { name: "Chest Dip", muscle: "Lower Chest, Triceps", image: muscleImages.chest, category: 'chest', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Assisted Dip", muscle: "Lower Chest, Triceps", image: muscleImages.chest, category: 'chest', movementType: 'compound', equipment: 'machine' },
  { name: "Incline Barbell Press", muscle: "Upper Chest", image: muscleImages.chest, category: 'chest', movementType: 'compound', equipment: 'barbell' },
  { name: "Machine Chest Press", muscle: "Chest", image: muscleImages.chest, category: 'chest', movementType: 'compound', equipment: 'machine' },
  { name: "Pec Deck Fly", muscle: "Chest", image: muscleImages.chest, category: 'chest', movementType: 'isolation', equipment: 'machine' },
  { name: "Dumbbell Bench Press", muscle: "Chest, Triceps", image: muscleImages.chest, category: 'chest', movementType: 'compound', equipment: 'dumbbell' },
  { name: "Decline Dumbbell Press", muscle: "Lower Chest", image: muscleImages.chest, category: 'chest', movementType: 'compound', equipment: 'dumbbell' },
  { name: "Landmine Press", muscle: "Upper Chest, Shoulders", image: muscleImages.chest, category: 'chest', movementType: 'compound', equipment: 'barbell' },
  { name: "Svend Press", muscle: "Inner Chest", image: muscleImages.chest, category: 'chest', movementType: 'isolation', equipment: 'plate' },
  { name: "Diamond Push Up", muscle: "Chest, Triceps", image: muscleImages.chest, category: 'chest', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Wide Push Up", muscle: "Chest", image: muscleImages.chest, category: 'chest', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Floor Press", muscle: "Chest, Triceps", image: muscleImages.chest, category: 'chest', movementType: 'compound', equipment: 'barbell' },
  { name: "Dumbbell Squeeze Press", muscle: "Inner Chest", image: muscleImages.chest, category: 'chest', movementType: 'compound', equipment: 'dumbbell' },
  { name: "Incline Cable Fly", muscle: "Upper Chest", image: muscleImages.chest, category: 'chest', movementType: 'isolation', equipment: 'cable' },
  { name: "Smith Machine Bench Press", muscle: "Chest", image: muscleImages.chest, category: 'chest', movementType: 'compound', equipment: 'smith_machine' },
  { name: "Plate Pinch Press", muscle: "Inner Chest", image: muscleImages.chest, category: 'chest', movementType: 'isolation', equipment: 'plate' },
  { name: "Archer Push Up", muscle: "Chest, Shoulders", image: muscleImages.chest, category: 'chest', movementType: 'calisthenics', equipment: 'bodyweight' },
  // New Chest
  { name: "Cable Fly", muscle: "Chest", image: muscleImages.chest, category: 'chest', movementType: 'isolation', equipment: 'cable' },
  { name: "Decline Cable Fly", muscle: "Lower Chest", image: muscleImages.chest, category: 'chest', movementType: 'isolation', equipment: 'cable' },
  { name: "Ring Dip", muscle: "Chest, Triceps", image: muscleImages.chest, category: 'chest', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Plyo Push Up", muscle: "Chest, Power", image: muscleImages.chest, category: 'chest', movementType: 'plyometric', equipment: 'bodyweight' },
  { name: "Banded Push Up", muscle: "Chest, Triceps", image: muscleImages.chest, category: 'chest', movementType: 'compound', equipment: 'band' },

  // ==================== BACK ====================
  { name: "Barbell Row", muscle: "Back, Biceps", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'barbell' },
  { name: "Lat Pulldown", muscle: "Lats", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'cable' },
  { name: "Deadlift", muscle: "Back, Hamstrings", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'barbell' },
  { name: "Seated Cable Row", muscle: "Mid Back", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'cable' },
  { name: "Pull Up", muscle: "Lats, Biceps", image: muscleImages.back, category: 'back', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Close Grip Pull Up", muscle: "Lats, Biceps", image: muscleImages.back, category: 'back', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Wide Grip Pull Up", muscle: "Lats, Biceps", image: muscleImages.back, category: 'back', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Assisted Pull Up", muscle: "Lats, Biceps", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'machine' },
  { name: "T-Bar Row", muscle: "Mid Back", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'barbell' },
  { name: "Machine T-Bar Row", muscle: "Mid Back", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'machine' },
  { name: "Face Pull", muscle: "Rear Delt, Traps", image: muscleImages.shoulders, category: 'back', movementType: 'isolation', equipment: 'cable' },
  { name: "Single Arm Dumbbell Row", muscle: "Lats, Rhomboids", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'dumbbell' },
  { name: "Close Grip Lat Pulldown", muscle: "Lats, Biceps", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'cable' },
  { name: "Wide Grip Lat Pulldown", muscle: "Lats", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'cable' },
  { name: "V-Bar Pulldown", muscle: "Lats", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'cable' },
  { name: "Chin Up", muscle: "Lats, Biceps", image: muscleImages.back, category: 'back', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Pendlay Row", muscle: "Upper Back", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'barbell' },
  { name: "Meadows Row", muscle: "Lats", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'barbell' },
  { name: "Chest Supported Row", muscle: "Mid Back", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'dumbbell' },
  { name: "Cable Pullover", muscle: "Lats", image: muscleImages.back, category: 'back', movementType: 'isolation', equipment: 'cable' },
  { name: "Rack Pull", muscle: "Upper Back, Traps", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'barbell' },
  { name: "Inverted Row", muscle: "Back, Biceps", image: muscleImages.back, category: 'back', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Dumbbell Pullover", muscle: "Lats, Chest", image: muscleImages.back, category: 'back', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "Straight Arm Pulldown", muscle: "Lats", image: muscleImages.back, category: 'back', movementType: 'isolation', equipment: 'cable' },
  { name: "Seal Row", muscle: "Mid Back", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'barbell' },
  { name: "Kroc Row", muscle: "Lats, Grip", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'dumbbell' },
  { name: "Snatch Grip Deadlift", muscle: "Upper Back, Traps", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'barbell' },
  { name: "Reverse Grip Barbell Row", muscle: "Lats, Biceps", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'barbell' },
  { name: "Machine Row", muscle: "Mid Back", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'machine' },
  { name: "Neutral Grip Pull Up", muscle: "Lats, Biceps", image: muscleImages.back, category: 'back', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Banded Pull Apart", muscle: "Rear Delt, Rhomboids", image: muscleImages.back, category: 'back', movementType: 'isolation', equipment: 'band' },
  // New Back
  { name: "Trap Bar Deadlift", muscle: "Back, Legs", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'trap_bar' },
  { name: "Deficit Deadlift", muscle: "Back, Hamstrings", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'barbell' },
  { name: "Single Arm Cable Row", muscle: "Lats", image: muscleImages.back, category: 'back', movementType: 'isolation', equipment: 'cable' },
  { name: "Cable Lateral Pull", muscle: "Lats", image: muscleImages.back, category: 'back', movementType: 'isolation', equipment: 'cable' },
  { name: "Muscle Up", muscle: "Lats, Chest, Triceps", image: muscleImages.back, category: 'back', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Ring Row", muscle: "Back, Biceps", image: muscleImages.back, category: 'back', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "L-Sit Pull Up", muscle: "Lats, Core", image: muscleImages.back, category: 'back', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Commando Pull Up", muscle: "Lats, Biceps", image: muscleImages.back, category: 'back', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Kettlebell Row", muscle: "Lats, Rhomboids", image: muscleImages.back, category: 'back', movementType: 'compound', equipment: 'kettlebell' },

  // ==================== SHOULDERS ====================
  { name: "Overhead Press", muscle: "Shoulders", image: muscleImages.shoulders, category: 'shoulders', movementType: 'compound', equipment: 'barbell' },
  { name: "Lateral Raise", muscle: "Side Delt", image: muscleImages.shoulders, category: 'shoulders', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "Front Raise", muscle: "Front Delt", image: muscleImages.shoulders, category: 'shoulders', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "Arnold Press", muscle: "Shoulders", image: muscleImages.shoulders, category: 'shoulders', movementType: 'compound', equipment: 'dumbbell' },
  { name: "Reverse Fly", muscle: "Rear Delt", image: muscleImages.shoulders, category: 'shoulders', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "Dumbbell Shoulder Press", muscle: "Shoulders", image: muscleImages.shoulders, category: 'shoulders', movementType: 'compound', equipment: 'dumbbell' },
  { name: "Cable Lateral Raise", muscle: "Side Delt", image: muscleImages.shoulders, category: 'shoulders', movementType: 'isolation', equipment: 'cable' },
  { name: "Upright Row", muscle: "Shoulders, Traps", image: muscleImages.shoulders, category: 'shoulders', movementType: 'compound', equipment: 'barbell' },
  { name: "Barbell Shrug", muscle: "Traps", image: muscleImages.shoulders, category: 'shoulders', movementType: 'isolation', equipment: 'barbell' },
  { name: "Dumbbell Shrug", muscle: "Traps", image: muscleImages.shoulders, category: 'shoulders', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "Machine Shoulder Press", muscle: "Shoulders", image: muscleImages.shoulders, category: 'shoulders', movementType: 'compound', equipment: 'machine' },
  { name: "Rear Delt Fly Machine", muscle: "Rear Delt", image: muscleImages.shoulders, category: 'shoulders', movementType: 'isolation', equipment: 'machine' },
  { name: "Lu Raise", muscle: "Shoulders", image: muscleImages.shoulders, category: 'shoulders', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "Behind Neck Press", muscle: "Shoulders", image: muscleImages.shoulders, category: 'shoulders', movementType: 'compound', equipment: 'barbell' },
  { name: "Bradford Press", muscle: "Shoulders", image: muscleImages.shoulders, category: 'shoulders', movementType: 'compound', equipment: 'barbell' },
  { name: "Z Press", muscle: "Shoulders", image: muscleImages.shoulders, category: 'shoulders', movementType: 'compound', equipment: 'barbell' },
  { name: "Viking Press", muscle: "Shoulders", image: muscleImages.shoulders, category: 'shoulders', movementType: 'compound', equipment: 'machine' },
  { name: "Plate Front Raise", muscle: "Front Delt", image: muscleImages.shoulders, category: 'shoulders', movementType: 'isolation', equipment: 'plate' },
  { name: "Cable Face Pull", muscle: "Rear Delt, Traps", image: muscleImages.shoulders, category: 'shoulders', movementType: 'isolation', equipment: 'cable' },
  { name: "Prone Y Raise", muscle: "Rear Delt, Lower Traps", image: muscleImages.shoulders, category: 'shoulders', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "Single Arm Lateral Raise", muscle: "Side Delt", image: muscleImages.shoulders, category: 'shoulders', movementType: 'isolation', equipment: 'dumbbell' },
  // New Shoulders
  { name: "Snatch", muscle: "Shoulders, Full Body", image: muscleImages.shoulders, category: 'shoulders', movementType: 'olympic', equipment: 'barbell' },
  { name: "Push Press", muscle: "Shoulders, Triceps", image: muscleImages.shoulders, category: 'shoulders', movementType: 'compound', equipment: 'barbell' },
  { name: "Handstand Push Up", muscle: "Shoulders, Triceps", image: muscleImages.shoulders, category: 'shoulders', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Cable Reverse Fly", muscle: "Rear Delt", image: muscleImages.shoulders, category: 'shoulders', movementType: 'isolation', equipment: 'cable' },
  { name: "Band Face Pull", muscle: "Rear Delt, Traps", image: muscleImages.shoulders, category: 'shoulders', movementType: 'isolation', equipment: 'band' },
  { name: "Kettlebell Press", muscle: "Shoulders", image: muscleImages.shoulders, category: 'shoulders', movementType: 'compound', equipment: 'kettlebell' },
  { name: "Kettlebell Snatch", muscle: "Shoulders, Full Body", image: muscleImages.shoulders, category: 'shoulders', movementType: 'compound', equipment: 'kettlebell' },

  // ==================== ARMS ====================
  { name: "Bicep Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "Hammer Curl", muscle: "Biceps, Forearm", image: muscleImages.biceps, category: 'arms', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "Tricep Pushdown", muscle: "Triceps", image: muscleImages.triceps, category: 'arms', movementType: 'isolation', equipment: 'cable' },
  { name: "Skull Crusher", muscle: "Triceps", image: muscleImages.triceps, category: 'arms', movementType: 'isolation', equipment: 'ez_bar' },
  { name: "Preacher Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms', movementType: 'isolation', equipment: 'ez_bar' },
  { name: "Machine Preacher Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms', movementType: 'isolation', equipment: 'machine' },
  { name: "Tricep Dip", muscle: "Triceps", image: muscleImages.triceps, category: 'arms', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Tricep Rope Pushdown", muscle: "Triceps", image: muscleImages.triceps, category: 'arms', movementType: 'isolation', equipment: 'cable' },
  { name: "Concentration Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "Cable Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms', movementType: 'isolation', equipment: 'cable' },
  { name: "Incline Dumbbell Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "EZ Bar Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms', movementType: 'isolation', equipment: 'ez_bar' },
  { name: "Spider Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "Overhead Tricep Extension", muscle: "Triceps", image: muscleImages.triceps, category: 'arms', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "Close Grip Bench Press", muscle: "Triceps, Chest", image: muscleImages.triceps, category: 'arms', movementType: 'compound', equipment: 'barbell' },
  { name: "Tricep Kickback", muscle: "Triceps", image: muscleImages.triceps, category: 'arms', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "Cable Overhead Extension", muscle: "Triceps", image: muscleImages.triceps, category: 'arms', movementType: 'isolation', equipment: 'cable' },
  { name: "Bayesian Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms', movementType: 'isolation', equipment: 'cable' },
  { name: "Reverse Curl", muscle: "Forearm, Biceps", image: muscleImages.biceps, category: 'arms', movementType: 'isolation', equipment: 'barbell' },
  { name: "Wrist Curl", muscle: "Forearm", image: muscleImages.biceps, category: 'arms', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "Dumbbell Kickback", muscle: "Triceps", image: muscleImages.triceps, category: 'arms', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "21s Bicep Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms', movementType: 'isolation', equipment: 'ez_bar' },
  { name: "Cross Body Hammer Curl", muscle: "Brachialis", image: muscleImages.biceps, category: 'arms', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "Barbell Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms', movementType: 'isolation', equipment: 'barbell' },
  { name: "JM Press", muscle: "Triceps", image: muscleImages.triceps, category: 'arms', movementType: 'compound', equipment: 'barbell' },
  { name: "Diamond Close Grip Push Up", muscle: "Triceps", image: muscleImages.triceps, category: 'arms', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "French Press", muscle: "Triceps", image: muscleImages.triceps, category: 'arms', movementType: 'isolation', equipment: 'ez_bar' },
  { name: "Zottman Curl", muscle: "Biceps, Forearm", image: muscleImages.biceps, category: 'arms', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "Seated Incline Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "Rope Tricep Pushdown", muscle: "Triceps", image: muscleImages.triceps, category: 'arms', movementType: 'isolation', equipment: 'cable' },
  // New Arms
  { name: "Prone Incline Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms', movementType: 'isolation', equipment: 'dumbbell' },
  { name: "Single Arm Tricep Pushdown", muscle: "Triceps", image: muscleImages.triceps, category: 'arms', movementType: 'isolation', equipment: 'cable' },
  { name: "Band Curl", muscle: "Biceps", image: muscleImages.biceps, category: 'arms', movementType: 'isolation', equipment: 'band' },
  { name: "Band Tricep Extension", muscle: "Triceps", image: muscleImages.triceps, category: 'arms', movementType: 'isolation', equipment: 'band' },

  // ==================== LEGS ====================
  { name: "Barbell Squat", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'barbell' },
  { name: "Leg Press", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'machine' },
  { name: "Romanian Deadlift", muscle: "Hamstrings", image: muscleImages.hamstrings, category: 'legs', movementType: 'compound', equipment: 'barbell' },
  { name: "Leg Curl", muscle: "Hamstrings", image: muscleImages.hamstrings, category: 'legs', movementType: 'isolation', equipment: 'machine' },
  { name: "Leg Extension", muscle: "Quads", image: muscleImages.quads, category: 'legs', movementType: 'isolation', equipment: 'machine' },
  { name: "Calf Raise", muscle: "Calves", image: muscleImages.calves, category: 'legs', movementType: 'isolation', equipment: 'machine' },
  { name: "Lunge", muscle: "Quads, Glutes", image: muscleImages.glutes, category: 'legs', movementType: 'compound', equipment: 'dumbbell' },
  { name: "Hip Thrust", muscle: "Glutes", image: muscleImages.glutes, category: 'legs', movementType: 'compound', equipment: 'barbell' },
  { name: "Bulgarian Split Squat", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'dumbbell' },
  { name: "Hack Squat", muscle: "Quads", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'machine' },
  { name: "Goblet Squat", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'dumbbell' },
  { name: "Front Squat", muscle: "Quads", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'barbell' },
  { name: "Sumo Deadlift", muscle: "Glutes, Inner Thigh", image: muscleImages.glutes, category: 'legs', movementType: 'compound', equipment: 'barbell' },
  { name: "Walking Lunge", muscle: "Quads, Glutes", image: muscleImages.glutes, category: 'legs', movementType: 'compound', equipment: 'dumbbell' },
  { name: "Step Up", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'dumbbell' },
  { name: "Seated Calf Raise", muscle: "Calves", image: muscleImages.calves, category: 'legs', movementType: 'isolation', equipment: 'machine' },
  { name: "Smith Machine Squat", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'smith_machine' },
  { name: "Good Morning", muscle: "Hamstrings, Lower Back", image: muscleImages.hamstrings, category: 'legs', movementType: 'compound', equipment: 'barbell' },
  { name: "Glute Bridge", muscle: "Glutes", image: muscleImages.glutes, category: 'legs', movementType: 'compound', equipment: 'bodyweight' },
  { name: "Nordic Hamstring Curl", muscle: "Hamstrings", image: muscleImages.hamstrings, category: 'legs', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Sissy Squat", muscle: "Quads", image: muscleImages.quads, category: 'legs', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Pendulum Squat", muscle: "Quads", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'machine' },
  { name: "Cable Pull Through", muscle: "Glutes, Hamstrings", image: muscleImages.glutes, category: 'legs', movementType: 'isolation', equipment: 'cable' },
  { name: "Adductor Machine", muscle: "Inner Thigh", image: muscleImages.quads, category: 'legs', movementType: 'isolation', equipment: 'machine' },
  { name: "Abductor Machine", muscle: "Outer Thigh, Glutes", image: muscleImages.glutes, category: 'legs', movementType: 'isolation', equipment: 'machine' },
  { name: "Belt Squat", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'machine' },
  { name: "Zercher Squat", muscle: "Quads, Core", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'barbell' },
  { name: "Single Leg Press", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'machine' },
  { name: "Reverse Lunge", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'dumbbell' },
  { name: "Donkey Calf Raise", muscle: "Calves", image: muscleImages.calves, category: 'legs', movementType: 'isolation', equipment: 'machine' },
  { name: "Leg Press Calf Raise", muscle: "Calves", image: muscleImages.calves, category: 'legs', movementType: 'isolation', equipment: 'machine' },
  { name: "Banded Hip Thrust", muscle: "Glutes", image: muscleImages.glutes, category: 'legs', movementType: 'compound', equipment: 'band' },
  { name: "Lateral Lunge", muscle: "Inner Thigh, Glutes", image: muscleImages.glutes, category: 'legs', movementType: 'compound', equipment: 'bodyweight' },
  // New Legs
  { name: "Power Clean", muscle: "Quads, Glutes, Traps", image: muscleImages.quads, category: 'legs', movementType: 'olympic', equipment: 'barbell' },
  { name: "Clean and Jerk", muscle: "Full Body", image: muscleImages.quads, category: 'legs', movementType: 'olympic', equipment: 'barbell' },
  { name: "Hang Clean", muscle: "Quads, Traps", image: muscleImages.quads, category: 'legs', movementType: 'olympic', equipment: 'barbell' },
  { name: "Thruster", muscle: "Quads, Shoulders", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'barbell' },
  { name: "Paused Squat", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'barbell' },
  { name: "Anderson Squat", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'barbell' },
  { name: "Safety Bar Squat", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'barbell' },
  { name: "Pistol Squat", muscle: "Quads, Glutes, Balance", image: muscleImages.quads, category: 'legs', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Depth Jump", muscle: "Quads, Power", image: muscleImages.quads, category: 'legs', movementType: 'plyometric', equipment: 'bodyweight' },
  { name: "Broad Jump", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs', movementType: 'plyometric', equipment: 'bodyweight' },
  { name: "Split Squat Jump", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs', movementType: 'plyometric', equipment: 'bodyweight' },
  { name: "Skater Jump", muscle: "Glutes, Balance", image: muscleImages.glutes, category: 'legs', movementType: 'plyometric', equipment: 'bodyweight' },
  { name: "Kettlebell Goblet Squat", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'kettlebell' },
  { name: "Kettlebell Clean", muscle: "Quads, Glutes, Grip", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'kettlebell' },
  { name: "Banded Squat", muscle: "Quads, Glutes", image: muscleImages.quads, category: 'legs', movementType: 'compound', equipment: 'band' },

  // ==================== CORE ====================
  { name: "Plank", muscle: "Core", image: muscleImages.abs, category: 'core', movementType: 'static', equipment: 'bodyweight' },
  { name: "Cable Crunch", muscle: "Abs", image: muscleImages.abs, category: 'core', movementType: 'isolation', equipment: 'cable' },
  { name: "Abdominal Machine", muscle: "Abs", image: muscleImages.abs, category: 'core', movementType: 'isolation', equipment: 'machine' },
  { name: "Ab Crunch Machine", muscle: "Abs", image: muscleImages.abs, category: 'core', movementType: 'isolation', equipment: 'machine' },
  { name: "Seated Crunch Machine", muscle: "Abs", image: muscleImages.abs, category: 'core', movementType: 'isolation', equipment: 'machine' },
  { name: "Captain's Chair Leg Raise", muscle: "Lower Abs", image: muscleImages.abs, category: 'core', movementType: 'isolation', equipment: 'bodyweight' },
  { name: "Sit Up", muscle: "Abs", image: muscleImages.abs, category: 'core', movementType: 'isolation', equipment: 'bodyweight' },
  { name: "Hanging Leg Raise", muscle: "Lower Abs", image: muscleImages.abs, category: 'core', movementType: 'isolation', equipment: 'bodyweight' },
  { name: "Russian Twist", muscle: "Obliques", image: muscleImages.abs, category: 'core', movementType: 'isolation', equipment: 'bodyweight' },
  { name: "Ab Wheel Rollout", muscle: "Core", image: muscleImages.abs, category: 'core', movementType: 'compound', equipment: 'other' },
  { name: "Bicycle Crunch", muscle: "Obliques, Abs", image: muscleImages.abs, category: 'core', movementType: 'isolation', equipment: 'bodyweight' },
  { name: "Mountain Climber", muscle: "Core, Cardio", image: muscleImages.abs, category: 'core', movementType: 'cardio', equipment: 'bodyweight' },
  { name: "Dead Bug", muscle: "Core", image: muscleImages.abs, category: 'core', movementType: 'isolation', equipment: 'bodyweight' },
  { name: "Woodchop", muscle: "Obliques", image: muscleImages.abs, category: 'core', movementType: 'compound', equipment: 'cable' },
  { name: "Dragon Flag", muscle: "Core", image: muscleImages.abs, category: 'core', movementType: 'calisthenics', equipment: 'bodyweight' },
  { name: "Side Plank", muscle: "Obliques", image: muscleImages.abs, category: 'core', movementType: 'static', equipment: 'bodyweight' },
  { name: "Decline Sit Up", muscle: "Abs", image: muscleImages.abs, category: 'core', movementType: 'isolation', equipment: 'bodyweight' },
  { name: "Pallof Press", muscle: "Core, Anti-rotation", image: muscleImages.abs, category: 'core', movementType: 'isolation', equipment: 'cable' },
  { name: "Toe Touch Crunch", muscle: "Abs", image: muscleImages.abs, category: 'core', movementType: 'isolation', equipment: 'bodyweight' },
  { name: "L-Sit", muscle: "Core, Hip Flexors", image: muscleImages.abs, category: 'core', movementType: 'static', equipment: 'bodyweight' },
  { name: "Hollow Body Hold", muscle: "Core", image: muscleImages.abs, category: 'core', movementType: 'static', equipment: 'bodyweight' },
  { name: "Farmer's Walk", muscle: "Core, Grip", image: muscleImages.abs, category: 'core', movementType: 'compound', equipment: 'dumbbell' },
  { name: "Suitcase Carry", muscle: "Obliques, Core", image: muscleImages.abs, category: 'core', movementType: 'compound', equipment: 'dumbbell' },
  { name: "Copenhagen Plank", muscle: "Adductors, Core", image: muscleImages.abs, category: 'core', movementType: 'static', equipment: 'bodyweight' },
  { name: "Turkish Get Up", muscle: "Core, Full Body", image: muscleImages.abs, category: 'core', movementType: 'compound', equipment: 'kettlebell' },
  { name: "Reverse Crunch", muscle: "Lower Abs", image: muscleImages.abs, category: 'core', movementType: 'isolation', equipment: 'bodyweight' },
  { name: "V-Up", muscle: "Abs", image: muscleImages.abs, category: 'core', movementType: 'isolation', equipment: 'bodyweight' },
  // New Core
  { name: "Kettlebell Windmill", muscle: "Obliques, Core", image: muscleImages.abs, category: 'core', movementType: 'compound', equipment: 'kettlebell' },

  // ==================== CARDIO ====================
  { name: "Treadmill", muscle: "Cardio", image: muscleImages.calves, category: 'cardio', movementType: 'cardio', equipment: 'machine' },
  { name: "Cycling", muscle: "Cardio, Legs", image: muscleImages.quads, category: 'cardio', movementType: 'cardio', equipment: 'machine' },
  { name: "Rowing Machine", muscle: "Cardio, Back", image: muscleImages.back, category: 'cardio', movementType: 'cardio', equipment: 'machine' },
  { name: "Jump Rope", muscle: "Cardio, Calves", image: muscleImages.calves, category: 'cardio', movementType: 'cardio', equipment: 'other' },
  { name: "Stair Climber", muscle: "Cardio, Glutes", image: muscleImages.glutes, category: 'cardio', movementType: 'cardio', equipment: 'machine' },
  { name: "Elliptical", muscle: "Cardio, Full Body", image: muscleImages.quads, category: 'cardio', movementType: 'cardio', equipment: 'machine' },
  { name: "Battle Ropes", muscle: "Cardio, Arms", image: muscleImages.biceps, category: 'cardio', movementType: 'cardio', equipment: 'other' },
  { name: "Burpees", muscle: "Cardio, Full Body", image: muscleImages.quads, category: 'cardio', movementType: 'plyometric', equipment: 'bodyweight' },
  { name: "Box Jump", muscle: "Cardio, Legs", image: muscleImages.quads, category: 'cardio', movementType: 'plyometric', equipment: 'bodyweight' },
  { name: "Assault Bike", muscle: "Cardio, Full Body", image: muscleImages.quads, category: 'cardio', movementType: 'cardio', equipment: 'machine' },
  { name: "Sprints", muscle: "Cardio, Legs", image: muscleImages.quads, category: 'cardio', movementType: 'cardio', equipment: 'bodyweight' },
  { name: "Swimming", muscle: "Cardio, Full Body", image: muscleImages.back, category: 'cardio', movementType: 'cardio', equipment: 'bodyweight' },
  { name: "Kettlebell Swing", muscle: "Cardio, Glutes, Core", image: muscleImages.glutes, category: 'cardio', movementType: 'compound', equipment: 'kettlebell' },
  { name: "Sled Push", muscle: "Cardio, Legs", image: muscleImages.quads, category: 'cardio', movementType: 'cardio', equipment: 'sled' },
  { name: "Ski Erg", muscle: "Cardio, Arms", image: muscleImages.biceps, category: 'cardio', movementType: 'cardio', equipment: 'machine' },
  { name: "Bear Crawl", muscle: "Cardio, Full Body", image: muscleImages.quads, category: 'cardio', movementType: 'cardio', equipment: 'bodyweight' },
  { name: "Tire Flip", muscle: "Cardio, Full Body", image: muscleImages.quads, category: 'cardio', movementType: 'compound', equipment: 'other' },
  { name: "Prowler Push", muscle: "Cardio, Legs", image: muscleImages.quads, category: 'cardio', movementType: 'cardio', equipment: 'sled' },
  { name: "Shadow Boxing", muscle: "Cardio, Arms", image: muscleImages.biceps, category: 'cardio', movementType: 'cardio', equipment: 'bodyweight' },
  { name: "High Knees", muscle: "Cardio, Core", image: muscleImages.abs, category: 'cardio', movementType: 'cardio', equipment: 'bodyweight' },
  // New Cardio
  { name: "Tuck Jump", muscle: "Cardio, Legs", image: muscleImages.quads, category: 'cardio', movementType: 'plyometric', equipment: 'bodyweight' },
];

// ==================== UTILITY FUNCTIONS ====================

export function getMovementTypes(): MovementType[] {
  return ['compound', 'isolation', 'cardio', 'static', 'plyometric', 'olympic', 'calisthenics'];
}

export function getEquipmentTypes(): EquipmentType[] {
  return ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell', 'band', 'plate', 'smith_machine', 'ez_bar', 'trap_bar', 'sled', 'other'];
}

export function filterExercises(opts: {
  query?: string;
  category?: string;
  movementType?: MovementType;
  equipment?: EquipmentType;
}): ExerciseInfo[] {
  let results = EXERCISE_DB;
  if (opts.category && opts.category !== 'all') {
    results = results.filter(e => e.category === opts.category);
  }
  if (opts.movementType) {
    results = results.filter(e => e.movementType === opts.movementType);
  }
  if (opts.equipment) {
    results = results.filter(e => e.equipment === opts.equipment);
  }
  if (opts.query?.trim()) {
    const q = opts.query.toLowerCase();
    results = results.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.muscle.toLowerCase().includes(q) ||
      e.category.includes(q) ||
      e.movementType.includes(q) ||
      e.equipment.includes(q)
    );
  }
  return results;
}

// Labels for display in UI
export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  compound: 'Compound',
  isolation: 'Isolation',
  cardio: 'Cardio',
  static: 'Static / Isometric',
  plyometric: 'Plyometric',
  olympic: 'Olympic Lift',
  calisthenics: 'Calisthenics',
};

export const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  cable: 'Cable',
  machine: 'Machine',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  band: 'Resistance Band',
  plate: 'Plate',
  smith_machine: 'Smith Machine',
  ez_bar: 'EZ Bar',
  trap_bar: 'Trap Bar',
  sled: 'Sled',
  other: 'Other',
};

export function searchExercises(query: string): ExerciseInfo[] {
  if (!query.trim()) return EXERCISE_DB;
  const q = query.toLowerCase();
  return EXERCISE_DB.filter(e =>
    e.name.toLowerCase().includes(q) ||
    e.muscle.toLowerCase().includes(q) ||
    e.category.includes(q) ||
    e.movementType.includes(q) ||
    e.equipment.replace('_', ' ').includes(q)
  );
}

// Generic equipment/position words that should NOT drive a match on their own.
// Without this, "Abdominal Machine" wrongly matched "Machine Chest Press".
const GENERIC_TOKENS = new Set([
  'machine', 'cable', 'barbell', 'dumbbell', 'smith', 'seated', 'standing',
  'lying', 'bar', 'weighted', 'assisted', 'single', 'arm', 'one', 'two',
  'with', 'grip', 'close', 'wide', 'front', 'rope', 'band', 'flat', 'the', 'of', 'on',
]);

// Treat these tokens as equivalent so "Abs"/"Abdominal"/"Core" all match core entries.
const TOKEN_SYNONYMS: Record<string, string> = {
  abs: 'ab', abdominal: 'ab', abdominals: 'ab', core: 'ab',
  obliques: 'oblique', glute: 'glutes', bicep: 'biceps', tricep: 'triceps',
  legs: 'leg', quad: 'quads', hammy: 'hamstrings', hamstring: 'hamstrings',
  clean: 'clean', jerk: 'jerk', snatch: 'snatch',
};

function tokenizeExercise(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(t => TOKEN_SYNONYMS[t] || t);
}

export function getExerciseInfo(name: string): ExerciseInfo | undefined {
  const lower = name.trim().toLowerCase();
  if (!lower) return undefined;

  // 1. Exact name match (fast path)
  const exact = EXERCISE_DB.find(e => e.name.toLowerCase() === lower);
  if (exact) return exact;

  // 2. Token-overlap scoring. Generic equipment words are excluded so that a
  //    shared word like "machine" can never decide the match. This prevents
  //    bugs such as "Abdominal Machine" being categorized as chest.
  const inputTokens = tokenizeExercise(lower).filter(t => !GENERIC_TOKENS.has(t));
  if (inputTokens.length === 0) return undefined;

  let best: ExerciseInfo | undefined;
  let bestScore = 0;
  for (const e of EXERCISE_DB) {
    const eTokens = tokenizeExercise(e.name).filter(t => !GENERIC_TOKENS.has(t));
    if (eTokens.length === 0) continue;
    let score = 0;
    for (const t of inputTokens) {
      if (eTokens.includes(t)) {
        score += 2; // exact significant-token match
      } else if (eTokens.some(et => et.startsWith(t) || t.startsWith(et))) {
        score += 1; // prefix match (e.g. "ab" vs "abductor" is filtered out below by threshold)
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }

  // Require at least one solid shared token (score >= 2). Otherwise return
  // undefined so the caller falls back to 'other' instead of a wrong category.
  return bestScore >= 2 ? best : undefined;
}
