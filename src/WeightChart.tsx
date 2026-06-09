import React, { useState, useEffect } from "react";
import { TrendingDown, Plus, Trash } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { useForgeStore } from "./store";
import { WeightEntry } from "./types";

function SwipeEntry({
  entry,
  onDelete
}: {
  entry: WeightEntry;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl h-11 bg-red-600/90 border border-transparent">
      {/* Background delete indicator */}
      <div 
        className="absolute inset-y-0 right-0 w-16 flex items-center justify-center text-white cursor-pointer"
        onClick={() => onDelete(entry.id)}
      >
        <Trash className="w-4 h-4" />
      </div>
      
      {/* Foreground draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ right: 0, left: -64 }}
        dragElastic={{ right: 0.05, left: 0.15 }}
        dragSnapToOrigin={true}
        onDragEnd={(event, info) => {
          if (info.offset.x < -48) {
            onDelete(entry.id);
          }
        }}
        className="absolute inset-0 bg-zinc-900/95 border border-zinc-800/80 rounded-xl px-4 py-2 flex items-center justify-between touch-pan-y"
      >
        <span className="text-[11px] text-zinc-500 font-mono">{entry.date}</span>
        <span className="text-xs font-extrabold text-white">{entry.weight} kg</span>
      </motion.div>
    </div>
  );
}

export default function WeightChart({ 
  profileId, 
  onWeightLogged 
}: { 
  profileId: string; 
  onWeightLogged?: () => void; 
}) {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [adding, setAdding] = useState(false);
  const { enqueueSyncAction } = useForgeStore();

  const fetchEntries = async () => {
    const res = await fetch(`/api/profiles/${profileId}/weight-history`);
    if (res.ok) setEntries(await res.json());
  };

  useEffect(() => { fetchEntries(); }, [profileId]);

  const addEntry = async () => {
    if (!newWeight) return;
    setAdding(true);
    const parsedWeight = parseFloat(newWeight.replace(',', '.'));
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      setAdding(false);
      return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const tempId = `wh_temp_${Date.now()}`;
    const optimisticEntry: WeightEntry = {
      id: tempId,
      profile_id: profileId,
      weight: parsedWeight,
      date: dateStr,
      timestamp: Date.now()
    };

    // OPTIMISTIC UPDATE
    setEntries(prev => [...prev, optimisticEntry]);
    setNewWeight("");
    setAdding(false);
    if (onWeightLogged) onWeightLogged();

    const url = `/api/profiles/${profileId}/weight-history`;
    const body = { weight: parsedWeight, date: dateStr };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error("Gagal menyimpan ke server");
      await fetchEntries();
    } catch (err) {
      enqueueSyncAction(url, "POST", body, `Log berat badan ${parsedWeight} kg`);
    }
  };

  const deleteEntry = async (id: string) => {
    // OPTIMISTIC UPDATE
    setEntries(prev => prev.filter(e => e.id !== id));
    if (onWeightLogged) onWeightLogged();

    const url = `/api/profiles/${profileId}/weight-history/${id}`;

    try {
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus di server");
      await fetchEntries();
    } catch (err) {
      enqueueSyncAction(url, "DELETE", null, `Hapus riwayat berat badan`);
    }
  };

  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp).slice(-10);
  
  // Format data for Recharts
  const chartData = sorted.map(e => ({
    date: e.date.slice(5), // MM-DD format
    weight: e.weight
  }));

  return (
    <div className="bg-[#121212] dark-card rounded-2xl p-5 border border-zinc-800 dark-border">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-display font-bold text-white dark-text text-sm flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-[#a6e6ff]" /> Weight History
        </h4>
        <span className="text-[10px] text-zinc-500 font-mono">{sorted.length} entries</span>
      </div>

      {/* Recharts AreaChart */}
      {sorted.length > 0 ? (
        <div className="h-36 w-full mb-4 pr-2 select-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a6e6ff" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#a6e6ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#71717a', fontSize: 10, fontWeight: 500 }} 
                axisLine={false} 
                tickLine={false} 
                dy={6}
              />
              <YAxis 
                domain={[
                  (dataMin: number) => Math.max(0, Math.floor(dataMin - 1.5)), 
                  (dataMax: number) => Math.ceil(dataMax + 1.5)
                ]} 
                tick={{ fill: '#71717a', fontSize: 10, fontWeight: 500 }} 
                axisLine={false} 
                tickLine={false} 
                dx={-4}
              />
              <Tooltip 
                contentStyle={{ 
                  background: '#18181b', 
                  border: '1px solid #27272a', 
                  borderRadius: 12, 
                  fontSize: 11,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                }} 
                labelStyle={{ color: '#a6e6ff', fontWeight: 'bold' }}
                itemStyle={{ color: '#e4e4e7', padding: '2px 0' }}
                formatter={(value: any) => [`${value} kg`, 'Berat']}
              />
              <Area 
                type="monotone" 
                dataKey="weight" 
                stroke="#a6e6ff" 
                fill="url(#weightGrad)" 
                strokeWidth={2} 
                dot={{ fill: '#a6e6ff', r: 3, strokeWidth: 1.5, stroke: '#121212' }}
                activeDot={{ fill: '#c3f400', r: 5, strokeWidth: 2, stroke: '#121212' }}
                name="Berat" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-32 flex items-center justify-center border border-dashed border-zinc-800 rounded-xl mb-4">
          <p className="text-xs text-zinc-500 py-6 text-center">Belum ada data. Tambahkan berat badan pertamamu.</p>
        </div>
      )}

      {/* Add entry */}
      <div className="flex gap-2 mb-3">
        <input type="text" inputMode="decimal" placeholder="BB (kg)" value={newWeight} 
          onChange={e => {
            const val = e.target.value;
            if (/^[0-9]*[.,]?[0-9]*$/.test(val)) {
              setNewWeight(val);
            }
          }}
          className="flex-1 bg-zinc-900 dark-input border border-zinc-800 rounded-xl h-10 px-3 text-sm text-white focus:outline-none focus:border-zinc-700 transition-colors" />
        <button onClick={addEntry} disabled={adding || !newWeight}
          className="bg-[#c3f400] text-black font-bold px-4 rounded-xl flex items-center gap-1 text-sm disabled:opacity-50 transition-opacity">
          <Plus className="w-4 h-4" /> Log
        </button>
      </div>

      {/* Quick History List Cards (Vertical list with Swipe to Delete) */}
      {sorted.length > 0 && (
        <div className="border-t border-zinc-800/60 pt-3 mt-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block">Riwayat Terakhir</span>
            <span className="text-[9px] text-zinc-500 font-mono">Geser kiri untuk hapus</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
            <AnimatePresence initial={false}>
              {sorted.slice().reverse().slice(0, 5).map(e => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 1, height: 44 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.2 }}
                >
                  <SwipeEntry entry={e} onDelete={deleteEntry} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
