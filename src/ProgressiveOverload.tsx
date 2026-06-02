import React from "react";
import { TrendingUp } from "lucide-react";
import { WorkoutLog } from "./types";

export default function ProgressiveOverload({ logs }: { logs: WorkoutLog[] }) {
  // Extract exercise weight history
  const exerciseMap: Record<string, { date: string; weight: number }[]> = {};
  for (const log of logs) {
    for (const ex of log.exercises || []) {
      if (ex.weight_kg && !ex.is_cardio) {
        if (!exerciseMap[ex.name]) exerciseMap[ex.name] = [];
        exerciseMap[ex.name].push({ date: log.date, weight: ex.weight_kg });
      }
    }
  }

  // Only show exercises with 2+ entries
  const tracked = Object.entries(exerciseMap)
    .filter(([_, entries]) => entries.length >= 2)
    .map(([name, entries]) => {
      const sorted = entries.sort((a, b) => a.date.localeCompare(b.date));
      const first = sorted[0].weight;
      const last = sorted[sorted.length - 1].weight;
      const diff = last - first;
      return { name, entries: sorted, diff, last };
    })
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 6);

  if (tracked.length === 0) return null;

  return (
    <div className="bg-[#121212] dark-card rounded-2xl p-5 border border-zinc-800 dark-border space-y-4">
      <h4 className="font-display font-bold text-white dark-text text-sm flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-[#c3f400]" /> Progressive Overload
      </h4>
      <div className="space-y-3">
        {tracked.map(t => (
          <div key={t.name} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-white dark-text block truncate">{t.name}</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-[#c3f400] rounded-full" style={{ width: `${Math.min(100, (t.last / (t.last + 10)) * 100)}%` }} />
                </div>
                <span className="text-[10px] font-mono text-zinc-400">{t.last}kg</span>
              </div>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${t.diff > 0 ? 'text-[#c3f400] bg-[#c3f400]/10' : t.diff < 0 ? 'text-red-400 bg-red-950/50' : 'text-zinc-500 bg-zinc-800'}`}>
              {t.diff > 0 ? '+' : ''}{t.diff}kg
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
