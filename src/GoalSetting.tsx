import React, { useState, useEffect } from "react";
import { Target, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { Goal } from "./types";

export default function GoalSetting({ profileId }: { profileId: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [show, setShow] = useState(false);
  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("weight");

  const fetch_ = async () => {
    const res = await fetch(`/api/profiles/${profileId}/goals`);
    if (res.ok) setGoals(await res.json());
  };

  useEffect(() => { fetch_(); }, [profileId]);

  const add = async () => {
    if (!desc || !target || !date) return;
    await fetch(`/api/profiles/${profileId}/goals`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, target_value: parseFloat(target), target_date: date, description: desc })
    });
    setDesc(""); setTarget(""); setDate(""); setShow(false); fetch_();
  };

  const toggle = async (g: Goal) => {
    await fetch(`/api/profiles/${profileId}/goals/${g.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_value: g.current_value, completed: g.completed ? 0 : 1 })
    });
    fetch_();
  };

  const del = async (id: string) => {
    await fetch(`/api/profiles/${profileId}/goals/${id}`, { method: "DELETE" });
    fetch_();
  };

  const daysLeft = (d: string) => Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000));

  return (
    <div className="bg-[#121212] dark-card rounded-2xl p-5 border border-zinc-800 dark-border space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-display font-bold text-white dark-text text-sm flex items-center gap-2">
          <Target className="w-4 h-4 text-[#c3f400]" /> Goals
        </h4>
        <button onClick={() => setShow(!show)} className="bg-zinc-800 text-[#c3f400] p-1.5 rounded-lg">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {show && (
        <div className="space-y-2 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
          <select value={type} onChange={e => setType(e.target.value)}
            className="w-full bg-zinc-800 dark-input text-white text-xs rounded-lg h-9 px-2 border border-zinc-700">
            <option value="weight">Target Berat</option>
            <option value="strength">Target Kekuatan</option>
            <option value="sessions">Target Sesi</option>
          </select>
          <input placeholder="Deskripsi (e.g. Turun ke 75kg)" value={desc} onChange={e => setDesc(e.target.value)}
            className="w-full bg-zinc-800 dark-input text-white text-xs rounded-lg h-9 px-3 border border-zinc-700" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Target value" value={target} onChange={e => setTarget(e.target.value)}
              className="bg-zinc-800 dark-input text-white text-xs rounded-lg h-9 px-3 border border-zinc-700" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-zinc-800 dark-input text-white text-xs rounded-lg h-9 px-3 border border-zinc-700" />
          </div>
          <button onClick={add} className="w-full bg-[#c3f400] text-black font-bold text-xs py-2 rounded-xl">Tambah Goal</button>
        </div>
      )}

      {goals.length === 0 ? (
        <p className="text-xs text-zinc-500">Belum ada goal. Buat targetmu!</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
          {goals.map(g => (
            <div key={g.id} className={`flex items-center gap-3 p-3 rounded-xl border ${g.completed ? 'bg-[#c3f400]/10 border-[#c3f400]/30' : 'bg-zinc-900 border-zinc-800'}`}>
              <button onClick={() => toggle(g)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${g.completed ? 'border-[#c3f400] bg-[#c3f400] text-black' : 'border-zinc-600'}`}>
                {g.completed ? <CheckCircle2 className="w-4 h-4" /> : null}
              </button>
              <div className="flex-1 min-w-0">
                <span className={`text-xs font-bold block truncate ${g.completed ? 'line-through text-zinc-500' : 'text-white dark-text'}`}>{g.description}</span>
                <span className="text-[10px] text-zinc-500">{g.type} • Target: {g.target_value} • {daysLeft(g.target_date)} hari lagi</span>
              </div>
              <button onClick={() => del(g.id)} className="text-zinc-600 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
