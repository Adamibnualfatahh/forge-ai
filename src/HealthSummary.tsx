import React, { useState, useEffect, useMemo } from "react";
import { Footprints, Flame, ChevronLeft, ChevronRight } from "lucide-react";

interface HealthEntry {
  type: string;
  value: number;
  unit: string;
  date: string;
}

type Period = "W" | "M" | "6M" | "Y";

function getRange(period: Period, offset: number): { from: string; to: string; label: string } {
  const now = new Date();
  let start: Date, end: Date, label: string;

  if (period === "W") {
    end = new Date(now);
    end.setDate(end.getDate() + offset * 7);
    start = new Date(end);
    start.setDate(start.getDate() - 6);
    label = `${start.getDate()} ${start.toLocaleString("id-ID", { month: "short" })} - ${end.getDate()} ${end.toLocaleString("id-ID", { month: "short" })}`;
  } else if (period === "M") {
    end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    start = new Date(end.getFullYear(), end.getMonth(), 1);
    label = start.toLocaleString("id-ID", { month: "long", year: "numeric" });
  } else if (period === "6M") {
    end = new Date(now);
    end.setMonth(end.getMonth() + offset * 6);
    start = new Date(end);
    start.setMonth(start.getMonth() - 5);
    start.setDate(1);
    label = `${start.toLocaleString("id-ID", { month: "short", year: "numeric" })} - ${end.toLocaleString("id-ID", { month: "short", year: "numeric" })}`;
  } else {
    const year = now.getFullYear() + offset;
    start = new Date(year, 0, 1);
    end = new Date(year, 11, 31);
    label = `${year}`;
  }

  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(start), to: fmt(end), label };
}

function getDaysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  const d = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  while (d <= end) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    days.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function Chart({ values, color, days, period }: { values: number[]; color: string; days: string[]; period: Period }) {
  const max = Math.max(...values, 1);
  const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.filter(v => v > 0).length || 0 : 0;

  // For M/6M/Y, show fewer bars (aggregate)
  let bars: { value: number; label: string }[];
  if (period === "W") {
    bars = values.map((v, i) => ({ value: v, label: days[i]?.slice(8) || "" }));
  } else if (period === "M") {
    bars = values.map((v, i) => ({ value: v, label: i % 5 === 0 ? days[i]?.slice(8) || "" : "" }));
  } else {
    // Aggregate by week for 6M/Y
    const weekMap: Record<string, number> = {};
    days.forEach((d, i) => {
      const weekKey = d.slice(0, 7); // group by month for simplicity
      weekMap[weekKey] = (weekMap[weekKey] || 0) + values[i];
    });
    const entries = Object.entries(weekMap);
    bars = entries.map(([k, v]) => ({ value: v / (period === "Y" ? 30 : 7), label: k.slice(5) }));
  }

  const barMax = Math.max(...bars.map(b => b.value), 1);

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-[1px] h-20">
        {bars.map((b, i) => (
          <div key={i} className="flex-1 rounded-t-sm min-w-[2px]" style={{ height: `${Math.max((b.value / barMax) * 100, b.value > 0 ? 4 : 1)}%`, backgroundColor: color, opacity: b.value > 0 ? 0.8 : 0.15 }} />
        ))}
      </div>
      {bars.length <= 31 && (
        <div className="flex">
          {bars.map((b, i) => <span key={i} className="flex-1 text-center text-[7px] text-zinc-600 truncate">{b.label}</span>)}
        </div>
      )}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-800/50">
        <span className="text-[10px] text-zinc-500">Rata-rata</span>
        <span className="text-xs font-bold text-zinc-300">{avg > 1000 ? `${(avg / 1000).toFixed(1)}k` : Math.round(avg).toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function HealthSummary({ profileId }: { profileId: string }) {
  const [data, setData] = useState<HealthEntry[]>([]);
  const [period, setPeriod] = useState<Period>("W");
  const [offset, setOffset] = useState(0);

  const range = useMemo(() => getRange(period, offset), [period, offset]);

  useEffect(() => {
    fetch(`/api/profiles/${profileId}/apple-health?from=${range.from}&to=${range.to}&_t=${Date.now()}`)
      .then(r => r.json())
      .then(json => { setData(Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : []); })
      .catch(() => {});
  }, [profileId, range.from, range.to]);

  const days = useMemo(() => getDaysBetween(range.from, range.to), [range.from, range.to]);

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

  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
  const todaySteps = stepsMap[todayStr] || 0;
  const todayCals = calsMap[todayStr] || 0;

  return (
    <div className="bg-[#201f1f] rounded-2xl border border-zinc-800 p-4 space-y-3">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Aktivitas</span>
        <div className="flex gap-1">
          {(["W", "M", "6M", "Y"] as Period[]).map(p => (
            <button key={p} onClick={() => { setPeriod(p); setOffset(0); }}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${period === p ? "bg-[#c3f400] text-black" : "text-zinc-500 hover:text-zinc-300"}`}>
              {p === "W" ? "Mgg" : p === "M" ? "Bln" : p === "6M" ? "6B" : "Thn"}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setOffset(o => o - 1)} className="p-1 text-zinc-500 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-[11px] text-zinc-400 font-medium">{range.label}</span>
        <button onClick={() => setOffset(o => Math.min(o + 1, 0))} disabled={offset >= 0} className="p-1 text-zinc-500 hover:text-white disabled:opacity-20"><ChevronRight className="w-4 h-4" /></button>
      </div>

      {/* Steps */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Footprints className="w-3.5 h-3.5 text-[#c3f400]" />
          <span className="text-sm font-bold text-white">{todaySteps.toLocaleString()}</span>
          <span className="text-[9px] text-zinc-500">langkah hari ini</span>
        </div>
        <Chart values={stepsArr} color="#c3f400" days={days} period={period} />
      </div>

      {/* Calories */}
      <div className="space-y-1 pt-2 border-t border-zinc-800/50">
        <div className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-[#ff6b35]" />
          <span className="text-sm font-bold text-white">{Math.round(todayCals).toLocaleString()}</span>
          <span className="text-[9px] text-zinc-500">kcal hari ini</span>
        </div>
        <Chart values={calsArr} color="#ff6b35" days={days} period={period} />
      </div>
    </div>
  );
}
