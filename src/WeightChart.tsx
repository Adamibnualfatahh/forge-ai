import React, { useState, useEffect } from "react";
import { TrendingDown, Plus } from "lucide-react";
import { WeightEntry } from "./types";

export default function WeightChart({ profileId }: { profileId: string }) {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchEntries = async () => {
    const res = await fetch(`/api/profiles/${profileId}/weight-history`);
    if (res.ok) setEntries(await res.json());
  };

  useEffect(() => { fetchEntries(); }, [profileId]);

  const addEntry = async () => {
    if (!newWeight) return;
    setAdding(true);
    await fetch(`/api/profiles/${profileId}/weight-history`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight: parseFloat(newWeight), date: new Date().toISOString().split('T')[0] })
    });
    setNewWeight("");
    setAdding(false);
    fetchEntries();
  };

  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp).slice(-10);
  const weights = sorted.map(e => e.weight);
  const maxW = weights.length > 0 ? Math.max(...weights) : 1;
  const rawMinW = weights.length > 0 ? Math.min(...weights) : 0;
  // Give some padding at the bottom (5% of min value) so the lowest bar isn't zero height
  const minW = Math.max(0, rawMinW - (rawMinW * 0.05));
  const range = maxW - minW || 1;

  return (
    <div className="bg-[#121212] dark-card rounded-2xl p-5 border border-zinc-800 dark-border">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-display font-bold text-white dark-text text-sm flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-[#a6e6ff]" /> Weight History
        </h4>
        <span className="text-[10px] text-zinc-500 font-mono">{sorted.length} entries</span>
      </div>

      {/* Chart */}
      {sorted.length > 1 ? (
        <div className="h-32 flex items-end gap-1 mb-4">
          {sorted.map((e, i) => {
            const h = ((e.weight - minW) / range) * 100;
            return (
              <div key={e.id} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-zinc-500 font-mono">{e.weight}</span>
                <div className="w-full rounded-t-md transition-all" style={{ height: `${Math.max(h, 8)}%`, background: i === sorted.length - 1 ? '#c3f400' : '#3f3f46' }} />
                <span className="text-[8px] text-zinc-600">{e.date.slice(5)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-zinc-500 mb-4">Belum ada data. Tambahkan berat badan pertamamu.</p>
      )}

      {/* Add entry */}
      <div className="flex gap-2">
        <input type="number" step="0.1" placeholder="BB (kg)" value={newWeight} onChange={e => setNewWeight(e.target.value)}
          className="flex-1 bg-zinc-900 dark-input border border-zinc-800 rounded-xl h-10 px-3 text-sm text-white" />
        <button onClick={addEntry} disabled={adding || !newWeight}
          className="bg-[#c3f400] text-black font-bold px-4 rounded-xl flex items-center gap-1 text-sm disabled:opacity-50">
          <Plus className="w-4 h-4" /> Log
        </button>
      </div>
    </div>
  );
}
