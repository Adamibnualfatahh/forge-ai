import React from "react";
import { motion } from "motion/react";
import { 
  Calendar, Activity, TrendingUp, Flame, Dumbbell, Award, 
  MapPin, Clock, CheckCircle2, Zap, X, Plus, Trash2, Edit, Share2, ArrowRight, Sparkles, RefreshCw, Check,
  Target, Crown, Star, Coffee, Compass
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Profile, WorkoutLog, Exercise, RecompAnalysis } from "../../types";
import MuscleIcon from "../../MuscleIcon";
import RestTimer from "../../RestTimer";
import MuscleHeatmap from "./MuscleHeatmap";

interface DashboardProps {
  activeProfile: Profile;
  logs: WorkoutLog[];
  calculateTotalVolume: (exercises: Exercise[]) => number;
  getAnimalAnalogy: (volumeKg: number) => string;
  getRecoveryStatus: () => any[];
  getPersonalRecords: () => any[];
  setShowFullPRPage: (val: boolean) => void;
  getAutoSchedule: () => Record<string, string>;
  DAYS: readonly string[];
  getAchievements: () => { id: string; icon: string; title: string; unlocked: boolean }[];
  isActivelyTraining: boolean;
  todayPlan: { focus: string; exercises: Exercise[] } | null;
  workoutSessionLocation: string;
  triggerStartWorkout: () => void;
  setLoggerLocation: (val: string) => void;
  setCurrentTab: (tab: any) => void;
  generateWorkoutPlan: () => void;
  isGeneratingWorkoutPlan: boolean;
  workoutElapsed: number;
  setIsActivelyTraining: (val: boolean) => void;
  setWorkoutStartTime: (val: number | null) => void;
  toggleExerciseCheck: (index: number) => void;
  completedExercises: { [key: string]: boolean };
  removeExerciseDuringWorkout: (index: number) => void;
  setShowAddExerciseWorkout: (val: boolean) => void;
  submitActiveWorkout: () => void;
  isSavingLog: boolean;
  renderCalendar: () => React.ReactNode;
  latestRecomp: RecompAnalysis | null;
  deleteLogId: string | null;
  setDeleteLogId: (id: string | null) => void;
  handleDeleteWorkoutLog: (id: string) => void;
  startEditLog: (log: WorkoutLog) => void;
  setShareData: (data: any) => void;
  setShowShare: (val: boolean) => void;
  setShowFullHistory: (val: boolean) => void;
}

const IconMap: Record<string, any> = {
  Target: Target,
  Flame: Flame,
  Dumbbell: Dumbbell,
  Award: Award,
  Zap: Zap,
  Crown: Crown,
  Calendar: Calendar,
  Star: Star
};

export default function Dashboard({
  activeProfile,
  logs,
  calculateTotalVolume,
  getAnimalAnalogy,
  getRecoveryStatus,
  getPersonalRecords,
  setShowFullPRPage,
  getAutoSchedule,
  DAYS,
  getAchievements,
  isActivelyTraining,
  todayPlan,
  workoutSessionLocation,
  triggerStartWorkout,
  setLoggerLocation,
  setCurrentTab,
  generateWorkoutPlan,
  isGeneratingWorkoutPlan,
  workoutElapsed,
  setIsActivelyTraining,
  setWorkoutStartTime,
  toggleExerciseCheck,
  completedExercises,
  removeExerciseDuringWorkout,
  setShowAddExerciseWorkout,
  submitActiveWorkout,
  isSavingLog,
  renderCalendar,
  latestRecomp,
  deleteLogId,
  setDeleteLogId,
  handleDeleteWorkoutLog,
  startEditLog,
  setShareData,
  setShowShare,
  setShowFullHistory
}: DashboardProps) {
  return (
    <motion.div 
      key="dashboard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Hello Welcome and Current Date Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">Halo, {activeProfile.name}</h2>
          <p className="font-sans text-sm text-[#c4c9ac] mt-1 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#c3f400]" />
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* BENTO STATS CARDS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-[#121212] rounded-xl p-5 flex flex-col justify-between border border-zinc-800/10 min-h-[110px] secondary-glow">
          <span className="text-xs uppercase tracking-wider text-[#c4c9ac] font-semibold">Total Sesi Gym</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-display text-4xl font-extrabold text-white">{activeProfile.total_sessions || logs.length}</span>
            <TrendingUp className="w-5 h-5 text-[#a6e6ff]" />
          </div>
        </div>

        <div className="bg-[#121212] rounded-xl p-5 flex flex-col justify-between border border-[#c3f400]/20 min-h-[110px] ai-glow">
          <span className="text-xs uppercase tracking-wider text-[#c4c9ac] font-semibold">Weekly Streak</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-display text-4xl font-extrabold text-[#c3f400]">{activeProfile.streak ?? 0}</span>
            <Flame className="w-5 h-5 text-[#c3f400] fill-[#c3f400]/50" />
          </div>
        </div>

        {/* Day Weight Lifted summary */}
        {(() => {
          const todayDateStrStr = new Date().toISOString().split('T')[0];
          const todayLogs = logs.filter(log => log.date === todayDateStrStr);
          const todayVolume = todayLogs.reduce((acc, log) => acc + calculateTotalVolume(log.exercises), 0);
          const latestLogStr = logs[0];
          const latestVolume = latestLogStr ? calculateTotalVolume(latestLogStr.exercises) : 0;
          const currentVol = todayVolume > 0 ? todayVolume : latestVolume;

          return (
            <div className="col-span-2 md:col-span-1 bg-[#121212] rounded-xl p-5 flex flex-col justify-between border border-zinc-800/10 min-h-[110px] secondary-glow">
              <span className="text-xs uppercase tracking-wider text-[#c4c9ac] font-semibold">
                {todayVolume > 0 ? "Angkatan Hari Ini" : "Beban Sesi Terakhir"}
              </span>
              <div className="mt-2 text-left">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-extrabold text-[#c3f400]">{currentVol.toLocaleString('id-ID')} kg</span>
                  <Dumbbell className="w-4.5 h-4.5 text-[#c3f400]" />
                </div>
                <p className="font-sans text-[12px] text-[#c4c9ac] mt-1 leading-tight">
                  <span>{getAnimalAnalogy(currentVol)}</span>
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* PROGRESS CHART - Volume per Session */}
      {logs.length > 1 && (
        <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/10">
          <h3 className="text-xs uppercase tracking-widest text-[#c4c9ac] font-bold mb-3">Volume per Sesi</h3>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={logs.slice(0, 10).reverse().map(l => ({ date: l.date.slice(5), vol: calculateTotalVolume(l.exercises) }))}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c3f400" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#c3f400" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#c3f400' }} />
                <Area type="monotone" dataKey="vol" stroke="#c3f400" fill="url(#volGrad)" strokeWidth={2} name="Volume (kg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* MUSCLE RECOVERY HEATMAP & STATUS */}
      <MuscleHeatmap recoveryStatus={getRecoveryStatus()} />

      {/* PERSONAL RECORDS */}
      {getPersonalRecords().length > 0 && (
        <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/10">
          <h3 className="text-xs uppercase tracking-widest text-[#c4c9ac] font-bold mb-3 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-[#c3f400]" /> Personal Records
          </h3>
          <div className="space-y-2">
            {getPersonalRecords().map(([name, pr], i) => (
              <div key={name} className="flex items-center justify-between py-1.5 border-b border-zinc-800/50 last:border-0">
                <span className="text-sm text-white font-medium truncate flex-1">{i === 0 && <Award className="inline w-3 h-3 text-yellow-500 mr-1" />}{name}</span>
                <span className="text-sm font-bold text-[#c3f400] ml-2">{pr.weight} kg</span>
              </div>
            ))}
          </div>
          <button onClick={() => setShowFullPRPage(true)}
            className="w-full mt-3 text-xs font-bold text-[#c3f400] border border-[#c3f400]/30 rounded-xl py-2.5 hover:bg-[#c3f400]/10 transition-colors flex items-center justify-center gap-1">
            Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* WEEKLY SCHEDULE */}
      <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/10">
        <h3 className="text-xs uppercase tracking-widest text-[#c4c9ac] font-bold mb-3">Jadwal Minggu Ini</h3>
        <div className="grid grid-cols-7 gap-1">
          {(() => { const s = getAutoSchedule(); return DAYS.map(day => {
            const today = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
            const isToday = today.toLowerCase() === day.toLowerCase();
            const focus = s[day] || 'Empty';
            return (
              <div key={day} className={`text-center py-2 rounded-lg ${isToday ? 'bg-[#c3f400]/10 ring-1 ring-[#c3f400]' : ''}`}>
                <span className="text-[12px] font-bold text-zinc-400 block">{day.slice(0, 3)}</span>
                <span className={`text-[12px] font-bold block mt-1 ${focus === 'Rest' ? 'text-zinc-600' : isToday ? 'text-[#c3f400]' : 'text-white'}`}>
                  {focus === 'Rest' ? <Coffee className="w-3 h-3 mx-auto opacity-40" /> : focus}
                </span>
              </div>
            );
          }); })()}
        </div>
      </div>

      {/* ACHIEVEMENTS */}
      <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/10">
        <h3 className="text-xs uppercase tracking-widest text-[#c4c9ac] font-bold mb-3 flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-[#c3f400]" /> Achievements
        </h3>
        <div className="flex flex-wrap gap-2">
          {getAchievements().map((a, i) => {
            const IconComp = IconMap[a.icon] || Award;
            return (
              <div key={i} className={`px-3 py-1.5 rounded-full text-[12px] font-bold flex items-center gap-1.5 ${a.unlocked ? 'bg-[#c3f400]/10 text-[#c3f400] border border-[#c3f400]/30' : 'bg-zinc-800/50 text-zinc-600 border border-zinc-700/30'}`}>
                <IconComp className={`w-3 h-3 ${a.unlocked ? 'text-[#c3f400]' : 'text-zinc-600'}`} /> {a.title}
              </div>
            );
          })}
        </div>
      </div>

      {/* DYNAMIC PLAN / START WORKOUT HERO AREA */}
      {!isActivelyTraining ? (
        <div className="bg-[#201f1f] rounded-2xl p-6 border border-[#444933] shadow-md relative overflow-hidden ai-glow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#c3f400]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

          {todayPlan ? (
            <>
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <span className="text-xs font-mono uppercase tracking-widest text-[#c4c9ac] font-bold">Fokus Hari Ini</span>
                  <h3 className="font-display text-2xl font-black text-white">{todayPlan.focus}</h3>
                </div>
                <span className="bg-[#c3f400]/15 text-[#c3f400] border border-[#c3f400]/30 text-[12px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-[#c3f400]" />
                  Ready
                </span>
              </div>

              <div className="space-y-3 border-t border-zinc-800 pt-4 mb-6">
                <p className="font-sans text-sm text-[#c4c9ac] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#a6e6ff]" />
                  Lokasi: <strong>{workoutSessionLocation}</strong>
                </p>
                <p className="font-sans text-sm text-[#c4c9ac] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#a6e6ff]" />
                  Estimasi: <strong>{todayPlan.exercises.length} gerakan • ~45 menit</strong>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={triggerStartWorkout}
                  className="flex-1 bg-[#c3f400] hover:bg-[#abd600] text-black font-display font-extrabold py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(195,244,0,0.3)] hover:scale-[1.01] active:scale-95"
                >
                  <CheckCircle2 className="w-5 h-5 fill-black/10" />
                  Mulai Workout
                </button>
                <button 
                  onClick={() => {
                    setLoggerLocation(workoutSessionLocation);
                    setCurrentTab('logger');
                  }}
                  className="font-sans text-sm font-semibold text-[#c4c9ac] hover:text-white border border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800/80 px-5 py-4 rounded-xl transition-all"
                >
                  Ubah Plan
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <Sparkles className="w-8 h-8 text-[#c3f400] mx-auto mb-3" />
              <h3 className="font-display text-xl font-black text-white mb-2">Belum Ada Plan Hari Ini</h3>
              <p className="text-sm text-[#c4c9ac] mb-5">Generate plan AI atau buat manual di Logger</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => { setCurrentTab('logger'); setTimeout(() => generateWorkoutPlan(), 300); }}
                  disabled={isGeneratingWorkoutPlan}
                  className="flex-1 bg-[#c3f400] hover:bg-[#abd600] text-black font-display font-extrabold py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  {isGeneratingWorkoutPlan ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  Generate Plan
                </button>
                <button 
                  onClick={() => setCurrentTab('logger')}
                  className="font-sans text-sm font-semibold text-[#c4c9ac] hover:text-white border border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800/80 px-5 py-4 rounded-xl transition-all"
                >
                  Manual
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#201f1f] rounded-2xl p-6 border-2 border-[#c3f400] shadow-[0_0_30px_rgba(195,244,0,0.15)] relative"
        >
          <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
            <div>
              <span className="text-[12px] uppercase font-semibold tracking-wide text-[#c3f400]">Sedang Latihan</span>
              <h3 className="font-display text-2xl font-black text-white">{todayPlan?.focus}</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[12px] text-zinc-500 block">Durasi</span>
                <span className="font-mono text-lg font-bold text-white">{Math.floor(workoutElapsed/60)}:{String(workoutElapsed%60).padStart(2,'0')}</span>
              </div>
              <button 
                onClick={() => { setIsActivelyTraining(false); setWorkoutStartTime(null); }}
                className="text-zinc-400 hover:text-white p-1 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {todayPlan?.exercises.map((ex, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-xl transition-all border select-none flex items-center justify-between ${
                  completedExercises[index] 
                    ? "bg-zinc-900/45 border-zinc-800/70 opacity-60" 
                    : "bg-[#131313] border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="flex gap-3 items-center flex-1 cursor-pointer" onClick={() => toggleExerciseCheck(index)}>
                  <MuscleIcon name={ex.name} size={40} />
                  <div>
                    <h4 className={`font-display text-md font-bold text-white ${completedExercises[index] ? "line-through text-zinc-500" : ""}`}>{ex.name}</h4>
                    <p className="font-sans text-xs text-[#c4c9ac] mt-1">
                      <strong>{ex.sets} Sets</strong> x <strong>{ex.reps} Reps</strong>{ex.weight_kg ? ` • ${ex.weight_kg}kg` : ''}
                    </p>
                    {ex.notes && <p className="font-mono text-[12px] text-[#a6e6ff] mt-0.5">Note: {ex.notes}</p>}
                    {(() => { const pr = logs.reduce((best, l) => { const found = l.exercises.find(e => e.name === ex.name && e.weight_kg); return found && found.weight_kg! > (best || 0) ? found.weight_kg! : best; }, 0 as number); return pr > 0 ? <p className="text-[11px] text-yellow-400/80 mt-0.5 mb-1">⚡ PR: {pr} kg</p> : null; })()}
                    
                    <div className="flex gap-3 mt-1.5" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`https://www.youtube.com/results?search_query=how+to+${encodeURIComponent(ex.name)}+form+tutorial`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-400 hover:text-red-300 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.9 31.9 0 0 0 0 12a31.9 31.9 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.4-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.5 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg>
                        YouTube
                      </a>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(ex.name + ' exercise form guide')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        Google
                      </a>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); removeExerciseDuringWorkout(index); }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div onClick={() => toggleExerciseCheck(index)} className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all cursor-pointer ${
                    completedExercises[index] 
                      ? "border-[#c3f400] bg-[#c3f400] text-black" 
                      : "border-zinc-700"
                  }`}>
                    {completedExercises[index] && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => setShowAddExerciseWorkout(true)}
              className="w-full border-2 border-dashed border-zinc-700 hover:border-[#c3f400]/50 rounded-xl py-3 text-sm font-bold text-zinc-400 hover:text-[#c3f400] flex items-center justify-center gap-1.5 transition-colors">
              <Plus className="w-4 h-4" /> Tambah Gerakan
            </button>
          </div>

          <RestTimer />

          <div className="flex gap-3 items-center">
            <button 
              onClick={submitActiveWorkout}
              disabled={isSavingLog}
              className="flex-1 bg-[#c3f400] hover:bg-[#abd600] text-black font-display font-extrabold py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Award className="w-5 h-5" />
              {isSavingLog ? "Menyimpan..." : "Selesai & Simpan"}
            </button>
            <button 
              onClick={() => setIsActivelyTraining(false)}
              className="font-sans text-sm text-[#c4c9ac] hover:text-white border border-zinc-800 hover:bg-zinc-900/60 px-5 py-4 rounded-xl transition-all"
            >
              Discard
            </button>
          </div>
        </motion.div>
      )}

      {renderCalendar()}

      <div className="bg-[#121212] rounded-2xl p-5 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-display font-bold text-white text-sm">Plan Hari Ini</h4>
          <button onClick={generateWorkoutPlan} disabled={isGeneratingWorkoutPlan}
            className="text-[12px] text-[#c3f400] font-bold flex items-center gap-1 disabled:opacity-50">
            {isGeneratingWorkoutPlan ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} {isGeneratingWorkoutPlan ? "..." : "Refresh"}
          </button>
        </div>
        {todayPlan && (
          <div className="space-y-2">
            {todayPlan.exercises.slice(0, 4).map((ex, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <span className="text-zinc-300">{ex.name}</span>
                <span className="text-zinc-500">{ex.sets}×{ex.reps}</span>
              </div>
            ))}
            {todayPlan.exercises.length > 4 && (
              <span className="text-[12px] text-zinc-500">+{todayPlan.exercises.length - 4} gerakan lagi</span>
            )}
          </div>
        )}
      </div>

      {latestRecomp && (
        <div className="bg-[#121212] rounded-2xl p-5 border border-zinc-800 space-y-3">
          <h4 className="font-display font-bold text-white text-sm">Target Nutrisi Harian</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-900 rounded-xl p-3 text-center">
              <span className="text-lg font-bold text-white block">{latestRecomp.calories}</span>
              <span className="text-[12px] text-zinc-500">Kcal</span>
            </div>
            <div className="bg-zinc-900 rounded-xl p-3 text-center">
              <span className="text-lg font-bold text-[#a6e6ff] block">{latestRecomp.protein}g</span>
              <span className="text-[12px] text-zinc-500">Protein</span>
            </div>
            <div className="bg-zinc-900 rounded-xl p-3 text-center">
              <span className="text-lg font-bold text-[#c3f400] block">{latestRecomp.focus_type === 'Caloric Deficit' ? 'Deficit' : latestRecomp.focus_type === 'Surplus' ? 'Surplus' : 'Maintain'}</span>
              <span className="text-[12px] text-zinc-500">Strategi</span>
            </div>
          </div>
          <p className="text-[12px] text-zinc-500 leading-relaxed">
            {latestRecomp.focus_type === 'Caloric Deficit' 
              ? `Fokus defisit ~300-500 kcal. Prioritaskan protein ${latestRecomp.protein}g/hari untuk jaga massa otot.`
              : latestRecomp.focus_type === 'Surplus'
              ? `Surplus 300-500 kcal di atas TDEE. Pastikan ${latestRecomp.protein}g protein untuk growth.`
              : `Makan sesuai TDEE. ${latestRecomp.protein}g protein untuk rekomposisi tubuh optimal.`}
          </p>
        </div>
      )}

      {/* RECENT GYM LOGS HISTORY */}
      <div className="space-y-4">
        <h3 className="font-display text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#a6e6ff]" />
          Riwayat Gym Terakhir
        </h3>
        {logs.length === 0 ? (
          <div className="bg-[#121212] p-6 text-center rounded-xl border border-zinc-800/60">
            <p className="font-sans text-[#c4c9ac]">Belum ada riwayat tercatat. Mulai sesi pertamamu!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.slice(0, 4).map((log) => {
              const logVol = calculateTotalVolume(log.exercises);
              const isConfirmingDelete = deleteLogId === log.id;

              return (
                <div key={log.id} className="bg-[#121212] p-5 rounded-xl border border-zinc-800 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-zinc-900 text-[#c3f400] mt-1 shrink-0 border border-zinc-800">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-mono text-[12px] text-[#c4c9ac] font-bold block bg-zinc-900/40 py-0.5 px-2 rounded border border-zinc-800/20 inline-block">
                          {log.date} {log.time_start && log.time_end ? `• ${log.time_start}–${log.time_end}` : ''} {log.location ? `@ ${log.location}` : ""}
                        </span>
                        <h4 className="font-display text-md font-bold text-white mt-1.5">{log.focus}</h4>
                        <p className="font-sans text-xs text-[#c4c9ac] mt-1">
                          <strong>{log.exercises?.length || 0} gerakan</strong> direkam
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-start">
                      {isConfirmingDelete ? (
                        <div className="bg-red-950/40 border border-red-500/35 p-2 rounded-lg flex items-center gap-2 text-xs">
                          <span className="text-red-300 font-semibold font-sans">Yakin hapus?</span>
                          <button onClick={() => handleDeleteWorkoutLog(log.id)} className="bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded transition-colors">Ya</button>
                          <button onClick={() => setDeleteLogId(null)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded transition-colors">Batal</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => startEditLog(log)} className="p-2 rounded bg-zinc-850 hover:bg-zinc-800 text-[#a6e6ff] border border-zinc-800 flex items-center gap-1 text-xs font-semibold">
                            <Edit className="w-3.5 h-3.5" /> <span>Ubah</span>
                          </button>
                          <button onClick={() => { 
                            const v = calculateTotalVolume(log.exercises);
                            setShareData({ focus: log.focus, duration: 0, exercises: log.exercises, volume: v }); 
                            setShowShare(true); 
                          }} className="p-2 rounded bg-zinc-850 hover:bg-zinc-800 text-[#c3f400] border border-zinc-800 flex items-center gap-1 text-xs font-semibold">
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteLogId(log.id)} className="p-2 rounded bg-zinc-850 hover:bg-red-950/80 text-red-400 border border-zinc-800 flex items-center gap-1 text-xs font-semibold">
                            <Trash2 className="w-3.5 h-3.5" /> <span>Hapus</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-zinc-850 pt-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {log.exercises?.map((ex, idx) => (
                        <div key={idx} className="bg-zinc-900 border border-zinc-800/60 rounded px-2.5 py-1 text-[12px] font-sans">
                          <span className="font-semibold text-white">{ex.name}</span>
                          <span className="text-zinc-400 ml-1">
                            {ex.is_cardio ? `Cardio: ${ex.duration_minutes || 30}m` : `${ex.sets}x${ex.reps}`}
                          </span>
                        </div>
                      ))}
                    </div>
                    {logVol > 0 && (
                      <div className="bg-[#c3f400]/5 border border-[#c3f400]/25 rounded-lg p-2 text-right">
                        <p className="font-mono text-[11px] text-[#c3f400] font-black uppercase tracking-wider">Total: {logVol} kg</p>
                        <p className="font-sans text-[10px] text-[#c4c9ac] mt-0.5">{getAnimalAnalogy(logVol)}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {logs.length > 4 && (
              <button onClick={() => setShowFullHistory(true)} className="w-full mt-1 py-3 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 text-sm font-bold text-[#c3f400] flex items-center justify-center gap-2">
                Lihat Semua Riwayat ({logs.length} sesi) <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
