import React from "react";
import { motion } from "motion/react";
import { 
  Sparkles, RefreshCw, CheckCircle2, Plus, ArrowUp, ArrowDown, Edit, X, Compass 
} from "lucide-react";
import { Profile, Exercise } from "../../types";
import MuscleIcon from "../../MuscleIcon";
import WorkoutTemplates from "../../WorkoutTemplates";
import { EXERCISE_DB, searchExercises } from "../../exerciseDb";

interface WorkoutLoggerProps {
  activeProfile: Profile;
  loggerDate: string;
  setLoggerDate: (val: string) => void;
  loggerTimeStart: string;
  setLoggerTimeStart: (val: string) => void;
  loggerTimeEnd: string;
  setLoggerTimeEnd: (val: string) => void;
  loggerLocation: string;
  setLoggerLocation: (val: string) => void;
  loggerEquipment: string[];
  toggleLoggerEquipment: (item: string) => void;
  loggerPlanFocus: string;
  setLoggerPlanFocus: (val: string) => void;
  loggerNumExercises: string;
  setLoggerNumExercises: (val: string) => void;
  loggerCustomInstructions: string;
  setLoggerCustomInstructions: (val: string) => void;
  generateWorkoutPlan: () => void;
  isGeneratingWorkoutPlan: boolean;
  loggerExercises: Exercise[];
  setLoggerExercises: React.Dispatch<React.SetStateAction<Exercise[]>>;
  exercisesListRef: React.RefObject<HTMLDivElement>;
  editingLoggerExIndex: number | null;
  setEditingLoggerExIndex: (val: number | null) => void;
  inlineExIsCardio: boolean;
  setInlineExIsCardio: (val: boolean) => void;
  inlineExName: string;
  setInlineExName: (val: string) => void;
  inlineExDuration: string;
  setInlineExDuration: (val: string) => void;
  inlineExSets: string;
  setInlineExSets: (val: string) => void;
  inlineExReps: string;
  setInlineExReps: (val: string) => void;
  inlineExWeight: string;
  setInlineExWeight: (val: string) => void;
  inlineExNotes: string;
  setInlineExNotes: (val: string) => void;
  saveInlineEditLoggerEx: (idx: number) => void;
  startInlineEditLoggerEx: (idx: number, item: Exercise) => void;
  moveLoggerExercise: (idx: number, dir: 'up' | 'down') => void;
  customExerciseIsCardio: boolean;
  setCustomExerciseIsCardio: (val: boolean) => void;
  customExerciseName: string;
  setCustomExerciseName: (val: string) => void;
  customExerciseDuration: string;
  setCustomExerciseDuration: (val: string) => void;
  customExerciseSets: string;
  setCustomExerciseSets: (val: string) => void;
  customExerciseReps: string;
  setCustomExerciseReps: (val: string) => void;
  customExerciseWeight: string;
  setCustomExerciseWeight: (val: string) => void;
  customExerciseNotes: string;
  setCustomExerciseNotes: (val: string) => void;
  handleAddCustomExercise: () => void;
  setShowExSearch: (val: boolean) => void;
  applyTemplate: (focus: string, exercises: Exercise[]) => void;
  todayPlan: any;
  formError: string;
  currentTab: string;
  isSavingLog: boolean;
  handleSaveWorkoutLog: () => void;
}

export default function WorkoutLogger({
  activeProfile,
  loggerDate,
  setLoggerDate,
  loggerTimeStart,
  setLoggerTimeStart,
  loggerTimeEnd,
  setLoggerTimeEnd,
  loggerLocation,
  setLoggerLocation,
  loggerEquipment,
  toggleLoggerEquipment,
  loggerPlanFocus,
  setLoggerPlanFocus,
  loggerNumExercises,
  setLoggerNumExercises,
  loggerCustomInstructions,
  setLoggerCustomInstructions,
  generateWorkoutPlan,
  isGeneratingWorkoutPlan,
  loggerExercises,
  setLoggerExercises,
  exercisesListRef,
  editingLoggerExIndex,
  setEditingLoggerExIndex,
  inlineExIsCardio,
  setInlineExIsCardio,
  inlineExName,
  setInlineExName,
  inlineExDuration,
  setInlineExDuration,
  inlineExSets,
  setInlineExSets,
  inlineExReps,
  setInlineExReps,
  inlineExWeight,
  setInlineExWeight,
  inlineExNotes,
  setInlineExNotes,
  saveInlineEditLoggerEx,
  startInlineEditLoggerEx,
  moveLoggerExercise,
  customExerciseIsCardio,
  setCustomExerciseIsCardio,
  customExerciseName,
  setCustomExerciseName,
  customExerciseDuration,
  setCustomExerciseDuration,
  customExerciseSets,
  setCustomExerciseSets,
  customExerciseReps,
  setCustomExerciseReps,
  customExerciseWeight,
  setCustomExerciseWeight,
  customExerciseNotes,
  setCustomExerciseNotes,
  handleAddCustomExercise,
  setShowExSearch,
  applyTemplate,
  todayPlan,
  formError,
  currentTab,
  isSavingLog,
  handleSaveWorkoutLog
}: WorkoutLoggerProps) {
  return (
    <motion.div 
      key="logger"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="font-display text-2xl font-extrabold text-white tracking-tight">Catat Sesi</h2>
      </div>

      <div className="bg-[#201f1f] rounded-2xl p-4 border border-[#444933] space-y-4">
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">Tanggal</label>
            <input 
              type="date"
              value={loggerDate}
              onChange={(e) => setLoggerDate(e.target.value)}
              className="w-full max-w-[220px] bg-[#131313] border border-zinc-700 rounded-lg h-10 px-3 text-sm text-white focus:outline-none focus:border-[#c3f400]"
            />
          </div>
          <div>
            <label className="block text-[12px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">Waktu (opsional)</label>
            <div className="flex gap-2 items-center">
              <input type="time" value={loggerTimeStart} onChange={e => setLoggerTimeStart(e.target.value)}
                className="flex-1 bg-[#131313] border border-zinc-700 rounded-lg h-10 px-3 text-sm text-white focus:outline-none focus:border-[#c3f400]" />
              <span className="text-zinc-600 text-sm">–</span>
              <input type="time" value={loggerTimeEnd} onChange={e => setLoggerTimeEnd(e.target.value)}
                className="flex-1 bg-[#131313] border border-zinc-700 rounded-lg h-10 px-3 text-sm text-white focus:outline-none focus:border-[#c3f400]" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[12px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">Lokasi Gym</label>
          <input 
            type="text"
            placeholder="e.g. Muscle Prime Gym"
            value={loggerLocation}
            onChange={(e) => setLoggerLocation(e.target.value)}
            className="w-full bg-[#131313] border border-zinc-700 rounded-lg h-10 px-3 text-sm text-white focus:outline-none focus:border-[#c3f400]"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-widest text-[#c4c9ac] font-bold">Peralatan Tersedia</label>
          <div className="flex flex-wrap gap-2">
            {["Barbell", "Dumbbells", "Cable", "Machines", "Bodyweight"].map((item) => {
              const selected = loggerEquipment.includes(item);
              return (
                <button
                  key={item}
                  onClick={() => toggleLoggerEquipment(item)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all min-h-[40px] flex items-center border ${
                    selected 
                      ? "bg-[#a6e6ff] text-[#003543] border-transparent" 
                      : "bg-zinc-800 text-[#c4c9ac] border-zinc-700 "
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-widest text-[#c4c9ac] font-bold">Target Fokus Sesi Latihan</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              "Otomatis (Rekomendasi AI)",
              "Push Day", 
              "Pull Day", 
              "Legs Day", 
              "Upper Body", 
              "Lower Body", 
              "Full Body", 
              "Core"
            ].map((foc) => {
              const selected = loggerPlanFocus === foc;
              return (
                <button
                  key={foc}
                  type="button"
                  onClick={() => setLoggerPlanFocus(foc)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all min-h-[40px] flex items-center justify-center text-center border ${
                    selected 
                      ? "bg-[#c3f400] text-black border-transparent font-extrabold shadow-[0_2px_10px_rgba(195,244,0,0.15)]" 
                      : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-705"
                  }`}
                >
                  {foc}
                </button>
              );
            })}
          </div>
        </div>

        {loggerPlanFocus === "Otomatis (Rekomendasi AI)" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-[12px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">Jumlah Gerakan (opsional)</label>
              <select
                value={loggerNumExercises}
                onChange={(e) => setLoggerNumExercises(e.target.value)}
                className="w-full bg-[#131313] border border-zinc-700 rounded-lg h-10 px-3 text-sm text-white focus:outline-none focus:border-[#c3f400]"
              >
                <option value="">Rekomendasi AI</option>
                <option value="3">3 Gerakan</option>
                <option value="4">4 Gerakan</option>
                <option value="5">5 Gerakan</option>
                <option value="6">6 Gerakan</option>
                <option value="7">7 Gerakan</option>
                <option value="8">8 Gerakan</option>
              </select>
            </div>
            
            <div className="sm:col-span-2">
              <label className="block text-[12px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">Instruksi Khusus ke AI (opsional)</label>
              <input
                type="text"
                placeholder="e.g. Jangan ada leg day dulu karena cedera"
                value={loggerCustomInstructions}
                onChange={(e) => setLoggerCustomInstructions(e.target.value)}
                className="w-full bg-[#131313] border border-zinc-700 rounded-lg h-10 px-3 text-sm text-white focus:outline-none focus:border-[#c3f400]"
              />
            </div>
          </div>
        )}

        <div className="pt-2">
          <button 
            onClick={generateWorkoutPlan}
            disabled={isGeneratingWorkoutPlan}
            className="w-full bg-zinc-900 border border-zinc-800 hover:border-[#444933] text-[#c3f400] hover:text-[#c3f400]/80 font-display font-black py-3.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all text-sm scale-down active:scale-95 disabled:opacity-50"
          >
            {isGeneratingWorkoutPlan ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : <Sparkles className="w-4.5 h-4.5" />}
            {isGeneratingWorkoutPlan ? "Generating Plan..." : "Generate Plan Baru"}
          </button>
        </div>
      </div>

      <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800 space-y-4">
        <h3 className="font-display text-md font-bold text-white flex items-center justify-between">
          <span>Daftar Gerakan ({loggerExercises.length})</span>
          <span className="text-zinc-500 font-sans text-xs">Akan direkam ke logger</span>
        </h3>

        <div ref={exercisesListRef} className="space-y-3">
          {isGeneratingWorkoutPlan && loggerExercises.length === 0 && (
            <>
              {[1,2,3,4].map(i => (
                <div key={i} className="animate-pulse bg-zinc-900/50 rounded-xl h-20 border border-zinc-800/50" />
              ))}
            </>
          )}
          {loggerExercises.map((item, idx) => {
            const isInlineEditing = editingLoggerExIndex === idx;

            if (isInlineEditing) {
              return (
                <div key={idx} className="bg-[#181818] border border-[#c3f400]/40 p-4 rounded-lg space-y-3 text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <span className="text-xs font-mono text-[#c3f400] font-black">UBAH GERAKAN #{idx + 1}</span>
                    <span className="text-[12px] text-zinc-500">Manual Logger Draft</span>
                  </div>

                  <div className="flex gap-4 text-xs font-bold">
                    <label className="flex items-center gap-1.5 cursor-pointer text-white select-none">
                      <input 
                        type="radio" 
                        checked={!inlineExIsCardio} 
                        onChange={() => setInlineExIsCardio(false)} 
                        className="text-[#c3f400] focus:ring-0"
                      />
                      Latihan Beban
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-white select-none">
                      <input 
                        type="radio" 
                        checked={inlineExIsCardio} 
                        onChange={() => setInlineExIsCardio(true)} 
                        className="text-[#c3f400] focus:ring-0"
                      />
                      Kardio
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-1">
                      <label className="block text-[12px] text-zinc-400 font-bold mb-1 uppercase">Nama Gerakan</label>
                      <div className="relative">
                        <input 
                          type="text"
                          value={inlineExName}
                          onChange={(e) => setInlineExName(e.target.value)}
                          className="w-full bg-[#111] border border-zinc-700 rounded h-8 px-2 text-xs text-white"
                        />
                        {inlineExName.trim().length > 0 && !EXERCISE_DB.some(e => e.name === inlineExName) && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-zinc-800 rounded-lg max-h-36 overflow-y-auto z-20 shadow-lg">
                            {searchExercises(inlineExName).slice(0, 5).map(ex => (
                              <button key={ex.name} type="button" onMouseDown={(e) => { e.preventDefault(); setInlineExName(ex.name); setInlineExIsCardio(ex.category === 'cardio'); }}
                                className="w-full px-2.5 py-1.5 hover:bg-zinc-800 text-left text-xs text-white">{ex.name}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {inlineExIsCardio ? (
                      <div>
                        <label className="block text-[12px] text-zinc-400 font-bold mb-1 uppercase">Durasi (Menit)</label>
                        <input 
                          type="number"
                          value={inlineExDuration}
                          onChange={(e) => setInlineExDuration(e.target.value)}
                          className="w-full bg-[#111] border border-zinc-700 rounded h-8 px-2 text-xs text-white"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1 col-span-1">
                        <div>
                          <label className="block text-[12px] text-zinc-400 font-bold mb-1 uppercase text-center">Sets</label>
                          <input 
                            type="number"
                            value={inlineExSets}
                            onChange={(e) => setInlineExSets(e.target.value)}
                            className="w-full bg-[#111] border border-zinc-700 rounded h-8 text-center text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] text-zinc-400 font-bold mb-1 uppercase text-center">Reps</label>
                          <input 
                            type="text"
                            value={inlineExReps}
                            onChange={(e) => setInlineExReps(e.target.value)}
                            className="w-full bg-[#111] border border-zinc-700 rounded h-8 text-center text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] text-zinc-400 font-bold mb-1 uppercase text-center">Beban kg</label>
                          <input 
                            type="number"
                            step="any"
                            value={inlineExWeight}
                            onChange={(e) => setInlineExWeight(e.target.value)}
                            className="w-full bg-[#111] border border-zinc-700 rounded h-8 text-center text-xs text-[#c3f400]"
                          />
                        </div>
                      </div>
                    )}

                    <div className="sm:col-span-1">
                      <label className="block text-[12px] text-zinc-400 font-bold mb-1 uppercase">Catatan / Note</label>
                      <input 
                        type="text"
                        value={inlineExNotes}
                        onChange={(e) => setInlineExNotes(e.target.value)}
                        className="w-full bg-[#111] border border-zinc-700 rounded h-8 px-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setEditingLoggerExIndex(null)}
                      className="bg-zinc-805 hover:bg-zinc-750 text-zinc-300 text-[12px] font-bold px-3 py-1.5 rounded transition-all"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => saveInlineEditLoggerEx(idx)}
                      className="bg-[#c3f400] hover:bg-[#abd600] text-black text-[12px] font-extrabold px-4 py-1.5 rounded transition-all"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={idx} className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-lg flex justify-between items-start gap-2 text-left">
                <div className="flex items-start gap-2">
                  <MuscleIcon name={item.name} size={36} />
                  <div>
                    <h4 className="font-display font-bold text-white text-md">{item.name}</h4>
                    <p className="font-sans text-xs text-[#c4c9ac] mt-1 flex flex-wrap items-center gap-2">
                      {item.is_cardio ? (
                        <span className="bg-blue-900/40 text-blue-300 border border-blue-800/60 px-1.5 py-0.5 rounded text-[12px] font-bold">
                          Kardio {item.duration_minutes || 30} Menit
                        </span>
                      ) : (
                        <span>
                          <strong>{item.sets} Sets</strong> x <strong>{item.reps} Reps</strong>
                          {item.weight_kg && <strong> @ {item.weight_kg} kg</strong>}
                        </span>
                      )}
                    </p>
                    {item.notes && <p className="font-mono text-[12px] text-[#a6e6ff] mt-0.5 italic">Note: {item.notes}</p>}
                    <div className="flex gap-2 mt-1.5">
                      <a
                        href={`https://www.youtube.com/results?search_query=how+to+${encodeURIComponent(item.name)}+form+tutorial`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] font-bold text-red-400 hover:text-red-300 transition-colors"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.9 31.9 0 0 0 0 12a31.9 31.9 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.4-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.5 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg>
                        YouTube
                      </a>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(item.name + ' exercise form guide')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Compass className="w-3 h-3" />
                        Google
                      </a>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => moveLoggerExercise(idx, 'up')}
                    disabled={idx === 0}
                    className="bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-[#c3f400] disabled:opacity-30 p-1.5 rounded transition-colors border border-zinc-800/80"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveLoggerExercise(idx, 'down')}
                    disabled={idx === loggerExercises.length - 1}
                    className="bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-[#c3f400] disabled:opacity-30 p-1.5 rounded transition-colors border border-zinc-800/80"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => startInlineEditLoggerEx(idx, item)}
                    className="bg-zinc-850 hover:bg-zinc-800 text-zinc-450 hover:text-white p-1.5 rounded transition-colors border border-zinc-800/80"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setLoggerExercises(prev => prev.filter((_, i) => i !== idx))}
                    className="bg-zinc-850 hover:bg-red-950 text-zinc-450 hover:text-red-450 p-1.5 rounded transition-colors border border-zinc-800/80"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-zinc-800 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#c4c9ac] uppercase">Tambah Gerakan</span>
            <button onClick={() => setShowExSearch(true)} className="text-[12px] text-[#c3f400] font-bold flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Cari Exercise
            </button>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-bold">
            <label className="flex items-center gap-2 cursor-pointer text-white select-none">
              <input 
                type="radio"
                checked={!customExerciseIsCardio}
                onChange={() => setCustomExerciseIsCardio(false)}
                className="text-[#c3f400] focus:ring-0"
              />
              Latihan Beban
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-white select-none">
              <input 
                type="radio"
                checked={customExerciseIsCardio}
                onChange={() => setCustomExerciseIsCardio(true)}
                className="text-[#c3f400] focus:ring-0"
              />
              Kardio
            </label>
          </div>

          <div className="space-y-3">
            <div className="relative w-full">
              <label className="block text-[12px] text-zinc-400 font-bold mb-1 uppercase">Nama Gerakan</label>
              <input 
                type="text"
                placeholder="Cari atau ketik gerakan..."
                value={customExerciseName}
                onChange={(e) => setCustomExerciseName(e.target.value)}
                className="w-full bg-[#201f1f] border border-zinc-700/80 rounded h-10 px-2.5 text-xs text-white"
              />
              {customExerciseName.trim().length > 0 && !EXERCISE_DB.some(e => e.name === customExerciseName) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-zinc-800 rounded-xl max-h-48 overflow-y-auto z-20 shadow-lg">
                  {searchExercises(customExerciseName).slice(0, 6).map(ex => (
                    <button key={ex.name} type="button" onMouseDown={(e) => { e.preventDefault(); setCustomExerciseName(ex.name); setCustomExerciseIsCardio(ex.category === 'cardio'); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800 transition-colors text-left">
                      <MuscleIcon name={ex.name} size={32} />
                      <div>
                        <span className="text-xs font-medium text-white block">{ex.name}</span>
                        <span className="text-[12px] text-zinc-500">{ex.muscle}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {customExerciseIsCardio ? (
              <div>
                <label className="block text-[12px] text-zinc-400 font-bold mb-1 uppercase">Durasi (Menit)</label>
                <input 
                  type="number"
                  placeholder="30"
                  value={customExerciseDuration}
                  onChange={(e) => setCustomExerciseDuration(e.target.value)}
                  className="w-full bg-[#201f1f] border border-zinc-700/80 rounded h-10 px-2.5 text-xs text-white"
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[12px] text-zinc-400 font-bold mb-1 uppercase text-center">Sets</label>
                  <input type="number" placeholder="4" value={customExerciseSets} onChange={(e) => setCustomExerciseSets(e.target.value)} className="w-full bg-[#201f1f] border border-zinc-700/80 rounded h-10 px-2.5 text-xs text-white text-center" />
                </div>
                <div>
                  <label className="block text-[12px] text-zinc-400 font-bold mb-1 uppercase text-center">Reps</label>
                  <input type="text" placeholder="12" value={customExerciseReps} onChange={(e) => setCustomExerciseReps(e.target.value)} className="w-full bg-[#201f1f] border border-zinc-700/80 rounded h-10 px-2.5 text-xs text-white text-center" />
                </div>
                <div>
                  <label className="block text-[12px] text-zinc-400 font-bold mb-1 uppercase text-center">Beban kg</label>
                  <input type="number" step="any" placeholder="0" value={customExerciseWeight} onChange={(e) => setCustomExerciseWeight(e.target.value)} className="w-full bg-[#201f1f] border border-zinc-700/80 rounded h-10 px-2.5 text-xs text-[#c3f400] text-center" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[12px] text-zinc-400 font-bold mb-1 uppercase">Catatan / Note</label>
              <input type="text" placeholder="Catatan tambahan..." value={customExerciseNotes} onChange={(e) => setCustomExerciseNotes(e.target.value)} className="w-full bg-[#201f1f] border border-zinc-700/80 rounded h-10 px-2.5 text-xs text-white" />
            </div>
          </div>
          
          <button onClick={handleAddCustomExercise} className="font-sans text-xs font-black bg-zinc-800 hover:bg-zinc-700 hover:text-white text-[#c3f400] h-10 px-4 rounded w-full flex items-center justify-center gap-1 border border-zinc-700">
            <Plus className="w-4.5 h-4.5" /> Tambah Gerakan
          </button>
        </div>
      </div>

      {activeProfile && (
        <WorkoutTemplates
          profileId={activeProfile.id}
          onApply={applyTemplate}
          currentFocus={todayPlan?.focus}
          currentExercises={loggerExercises}
        />
      )}

      {formError && currentTab === 'logger' && <p className="field-error-msg text-center">{formError}</p>}
      <button 
        onClick={handleSaveWorkoutLog}
        disabled={loggerExercises.length === 0 || isSavingLog}
        className="w-full bg-[#c3f400] text-black font-display font-black py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-md shadow-[0_4px_15px_rgba(195,244,0,0.2)] disabled:opacity-50"
      >
        <CheckCircle2 className="w-5 h-5 fill-black/10" />
        {isSavingLog ? "Menyimpan..." : "Simpan Workout"}
      </button>
    </motion.div>
  );
}
