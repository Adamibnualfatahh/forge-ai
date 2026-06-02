import React, { useState, useEffect } from "react";
import { BookmarkPlus, Trash2, Play } from "lucide-react";
import { WorkoutTemplate, Exercise } from "./types";

interface Props {
  profileId: string;
  onApply: (focus: string, exercises: Exercise[]) => void;
  currentFocus?: string;
  currentExercises?: Exercise[];
}

export default function WorkoutTemplates({ profileId, onApply, currentFocus, currentExercises }: Props) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetch_ = async () => {
    const res = await fetch(`/api/profiles/${profileId}/templates`);
    if (res.ok) setTemplates(await res.json());
  };

  useEffect(() => { fetch_(); }, [profileId]);

  const save = async () => {
    if (!name || !currentExercises?.length) return;
    setSaving(true);
    await fetch(`/api/profiles/${profileId}/templates`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, focus: currentFocus || "Custom", exercises: currentExercises })
    });
    setName(""); setSaving(false); fetch_();
  };

  const del = async (id: string) => {
    await fetch(`/api/profiles/${profileId}/templates/${id}`, { method: "DELETE" });
    fetch_();
  };

  return (
    <div className="bg-[#121212] dark-card rounded-2xl p-5 border border-zinc-800 dark-border space-y-4">
      <h4 className="font-display font-bold text-white dark-text text-sm flex items-center gap-2">
        <BookmarkPlus className="w-4 h-4 text-[#c3f400]" /> Workout Templates
      </h4>

      {/* Save current */}
      {currentExercises && currentExercises.length > 0 && (
        <div className="flex gap-2">
          <input placeholder="Nama template..." value={name} onChange={e => setName(e.target.value)}
            className="flex-1 bg-zinc-900 dark-input border border-zinc-800 rounded-xl h-10 px-3 text-xs text-white" />
          <button onClick={save} disabled={saving || !name}
            className="bg-[#c3f400] text-black font-bold px-3 rounded-xl text-xs disabled:opacity-50">Simpan</button>
        </div>
      )}

      {/* List */}
      {templates.length === 0 ? (
        <p className="text-xs text-zinc-500">Belum ada template tersimpan.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
          {templates.map(t => (
            <div key={t.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <div>
                <span className="text-xs font-bold text-white dark-text">{t.name}</span>
                <span className="text-[10px] text-zinc-500 block">{t.focus} • {t.exercises.length} gerakan</span>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => onApply(t.focus, t.exercises)}
                  className="bg-[#c3f400]/20 text-[#c3f400] p-2 rounded-lg"><Play className="w-3.5 h-3.5" /></button>
                <button onClick={() => del(t.id)}
                  className="bg-red-950/50 text-red-400 p-2 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
