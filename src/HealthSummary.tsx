import React, { useState, useEffect, useMemo } from "react";
import { Footprints, Flame } from "lucide-react";

interface HealthEntry {
  type: string;
  value: number;
  unit: string;
  date: string;
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    days.push(`${y}-${m}-${day}`);
  }
  return days;
}

export default function HealthSummary({ profileId }: { profileId: string }) {
  const [data, setData] = useState<HealthEntry[]>([]);

  useEffect(() => {
    fetch(`/api/profiles/${profileId}/apple-health`)
      .then(r => r.json())
      .then(json => { setData(Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : []); })
      .catch(() => {});
  }, [profileId]);

  const days = useMemo(() => getLast7Days(), []);

  const stepsMap = useMemo(() => {
    const m: Record<string, number> = {};
    data.filter(d => d.type === "steps").forEach(d => { m[d.date] = d.value; });
    return m;
  }, [data]);

  const calsMap = useMemo(() => {
    const m: Record<string, number> = {};
    data.filter(d => d.type === "activeEnergy").forEach(d => { m[d.date] = d.value; });
    return m;
  }, [data]);

  const stepsArr = days.map(d => stepsMap[d] || 0);
  const calsArr = days.map(d => calsMap[d] || 0);
  const stepsMax = Math.max(...stepsArr, 1);
  const calsMax = Math.max(...calsArr, 1);
  const todaySteps = stepsArr[6];
  const todayCals = calsArr[6];

  return (
    <div className="bg-[#201f1f] rounded-2xl border border-zinc-800 p-4 space-y-3">
      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Aktivitas Harian</span>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Footprints className="w-3.5 h-3.5 text-[#c3f400]" />
            <span className="text-sm font-bold text-white">{todaySteps.toLocaleString()}</span>
            <span className="text-[9px] text-zinc-500">langkah</span>
          </div>
          <div className="flex items-end gap-0.5 h-10">
            {stepsArr.map((v, i) => (
              <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${Math.max((v / stepsMax) * 100, 4)}%`, backgroundColor: "#c3f400", opacity: i === 6 ? 1 : 0.5 }} />
            ))}
          </div>
          <div className="flex justify-between">
            {days.map((d, i) => <span key={i} className="flex-1 text-center text-[8px] text-zinc-600">{d.slice(8)}</span>)}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-[#ff6b35]" />
            <span className="text-sm font-bold text-white">{Math.round(todayCals).toLocaleString()}</span>
            <span className="text-[9px] text-zinc-500">kcal</span>
          </div>
          <div className="flex items-end gap-0.5 h-10">
            {calsArr.map((v, i) => (
              <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${Math.max((v / calsMax) * 100, 4)}%`, backgroundColor: "#ff6b35", opacity: i === 6 ? 1 : 0.5 }} />
            ))}
          </div>
          <div className="flex justify-between">
            {days.map((d, i) => <span key={i} className="flex-1 text-center text-[8px] text-zinc-600">{d.slice(8)}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
