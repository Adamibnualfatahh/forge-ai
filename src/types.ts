/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  notes: string;
  is_cardio?: boolean;
  duration_minutes?: number;
  weight_kg?: number;
}

export interface WorkoutPlan {
  focus: string;
  exercises: Exercise[];
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  height: number;
  weight: number;
  target_weight: number;
  focus_area: string;
  streak: number;
  total_sessions: number;
  apple_health_connected?: boolean;
}

export interface WorkoutLog {
  id: string;
  profile_id: string;
  date: string;
  focus: string;
  location: string;
  equipment: string;
  exercises: Exercise[];
  calories_burned?: number;
  avg_bpm?: number;
  time_start?: string;
  time_end?: string;
}

export interface RecompAnalysis {
  id: string;
  profile_id: string;
  height: number;
  weight: number;
  bmi: number;
  analysis: string;
  focus_type: 'Caloric Deficit' | 'Surplus' | 'Maintenance';
  protein: number;
  calories: number;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  profile_id: string;
  sender: 'user' | 'assistant';
  message: string;
  timestamp: number;
}

export interface WeightEntry {
  id: string;
  profile_id: string;
  weight: number;
  date: string;
  timestamp: number;
}

export interface WorkoutTemplate {
  id: string;
  profile_id: string;
  name: string;
  focus: string;
  exercises: Exercise[];
  created_at: number;
}

export interface Goal {
  id: string;
  profile_id: string;
  type: string;
  target_value: number;
  current_value: number;
  target_date: string;
  description: string;
  completed: number;
  created_at: number;
}
