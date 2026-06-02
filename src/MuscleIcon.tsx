import React from "react";
import { getMuscleDisplay, getExerciseInfo } from "./exerciseDb";

export default function MuscleIcon({ name, size = 40 }: { name: string; size?: number }) {
  const info = getExerciseInfo(name);
  const display = getMuscleDisplay(info?.category || 'chest');

  return (
    <div className="relative rounded-lg overflow-hidden bg-[#1a1a1a] shrink-0" style={{ width: size, height: size }}>
      <img src={display.body} alt="" className="absolute inset-0 w-full h-full object-contain opacity-40" />
      <img src={display.overlay} alt="" className="absolute inset-0 w-full h-full object-contain" />
    </div>
  );
}
