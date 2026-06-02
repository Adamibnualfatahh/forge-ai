import React, { useState, useEffect } from "react";
import { Target, Plus, Trash2 } from "lucide-react";
import { Goal } from "./types";

interface Props {
  profileId: string;
  currentWeight?: number;
  totalSessions?: number;
}

export default function GoalSetting({ profileId, currentWeight, totalSessions }: Props) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [show, setShow] = useState(false);
  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState("");
  const [type, setType] = useState("weight");
  const [error, setError] = useState("");

  const fetch_ = async () => {
    try {
      const res = await fetch(`/api/profiles/${profileId}/goals`);
      if (res.ok) setGoals(await res.json());
    } catch {}
  };

  useEffect(() => { fetch_(); }, [profileId]);

  const add = async () => {
    setError("");
    if (!desc.trim()) { setError("Deskripsi wajib diisi"); return; }
    if (!target || parseFloat(target) <= 0) { setError("Target wajib diisi"); return; }
    const startVal = type === 'weight' ? (currentWeight || 0) : (totalSessions || 0);
    try {
      const res = await fetch(`/api/profiles/${profileId}/goals`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, target_value: parseFloat(target), current_value: startVal, target_date: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0], description: desc.trim() })
      });
      if (!res.ok) { setError("Gagal menyimpan"); return; }
      setDesc(""); setTarget(""); setShow(false); fetch_();
    } catch { setError("Koneksi gagal"); }
  };

  const del = async (id: string) => {
    await fetch(`/api/profiles/${profileId}/goals/${id}`, { method: "DELETE" });
    fetch_();
  };

  const getProgress = (g: Goal): { pct: number; current: number; remaining: string } => {
    const current = g.type === 'weight' ? (currentWeight || g.current_value) : (totalSessions || g.current_value);
    const start = g.current_value; // saved at creation time
    const target = g.target_value;

    if (target === start) return { pct: 100, current, remaining: "Tercapai!" };

    let pct: number;
    let remaining: string;

    if (target < start) {
      // Losing (e.g. 80 → 70)
      const needed = start - target;
      const done = start - current;
      pct = Math.min(100, Math.max(0, (done / needed) * 100));
      const left = current - target;
      remaining = left <= 0 ? "Tercapai! 🎉" : `-${left.toFixed(1)} ${g.type === 'weight' ? 'kg' : 'sesi'} lagi`;
    } else {
      // Gaining (e.g. 60 → 75, or sessions 10 → 50)
      const needed = target - start;
      const done = current - start;
      pct = Math.min(100, Math.max(0, (done / needed) * 100));
      const left = target - current;
      remaining = left <= 0 ? "Tercapai! 🎉" : `+${left.toFixed(1)} ${g.type === 'weight' ? 'kg' : 'sesi'} lagi`;
    }

    return { pct, current, remaining };
  };

  return (
    <div className="bg-[#121212] rounded-2xl p-5 border border-zinc-800 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-display font-bold text-white text-sm flex items-center gap-2">
          <Target className="w-4 h-4 text-[#c3f400]" /> Goals
        </h4>
        <button onClick={() => { setShow(!show); setError(""); }} className="bg-zinc-800 text-[#c3f400] p-1.5 rounded-lg">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {show && (
        <div className="space-y-2 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
          <select value={type} onChange={e => setType(e.target.value)}
            className="w-full bg-zinc-800 text-white text-xs rounded-lg h-9 px-2 border border-zinc-700">
            <option value="weight">Target Berat Badan</option>
            <option value="sessions">Target Jumlah Sesi</option>
          </select>
          <input placeholder="Deskripsi (e.g. Turun ke 75kg) *" value={desc} onChange={e => setDesc(e.target.value)}
            className={`w-full bg-zinc-800 text-white text-xs rounded-lg h-9 px-3 border ${!desc.trim() && error ? 'field-error' : 'border-zinc-700'}`} />
          <input type="number" placeholder={type === 'weight' ? "Target BB (kg) *" : "Target sesi *"} value={target} onChange={e => setTarget(e.target.value)}
            className={`w-full bg-zinc-800 text-white text-xs rounded-lg h-9 px-3 border ${!target && error ? 'field-error' : 'border-zinc-700'}`} />
          {type === 'weight' && currentWeight && <p className="text-[10px] text-zinc-500">Saat ini: {currentWeight} kg</p>}
          {type === 'sessions' && totalSessions !== undefined && <p className="text-[10px] text-zinc-500">Saat ini: {totalSessions} sesi</p>}
          {error && <p className="field-error-msg">{error}</p>}
          <button onClick={add} className="w-full bg-[#c3f400] text-black font-bold text-xs py-2.5 rounded-xl">Tambah Goal</button>
        </div>
      )}

      {goals.length === 0 ? (
        <p className="text-xs text-zinc-500">Belum ada goal.</p>
      ) : (
        <div className="space-y-3">
          {goals.map(g => {
            const { pct, current, remaining } = getProgress(g);
            const unit = g.type === 'weight' ? 'kg' : 'sesi';
            return (
              <div key={g.id} className="p-3 rounded-xl border bg-zinc-900 border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white truncate flex-1">{g.description}</span>
                  <button onClick={() => del(g.id)} className="text-zinc-600 hover:text-red-400 p-1 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[#c3f400] rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-[#c3f400] font-bold w-10 text-right">{Math.round(pct)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-zinc-500">{current} / {g.target_value} {unit}</span>
                  <span className="text-[10px] text-zinc-400">{remaining}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
