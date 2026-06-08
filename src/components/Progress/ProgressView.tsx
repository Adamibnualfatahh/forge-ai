import React from "react";
import { motion } from "motion/react";
import { Download, Scale, Sparkles, Flame, TrendingUp } from "lucide-react";
import { Profile, WorkoutLog, RecompAnalysis } from "../../types";
import WeightChart from "../../WeightChart";
import ProgressiveOverload from "../../ProgressiveOverload";
import GoalSetting from "../../GoalSetting";

interface ProgressViewProps {
  activeProfile: Profile;
  logs: WorkoutLog[];
  latestRecomp: RecompAnalysis | null;
  tbInput: string;
  bbInput: string;
  setTbInput: (val: string) => void;
  setBbInput: (val: string) => void;
  isSubmittingRecomp: boolean;
  onLogMetrics: (e: React.FormEvent) => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
  computedBmiVal: string;
  getBmiStatus: (bmi: string) => string;
  onWeightLogged?: () => void;
}

export default function ProgressView({
  activeProfile,
  logs,
  latestRecomp,
  tbInput,
  bbInput,
  setTbInput,
  setBbInput,
  isSubmittingRecomp,
  onLogMetrics,
  onExportPDF,
  onExportCSV,
  computedBmiVal,
  getBmiStatus,
  onWeightLogged
}: ProgressViewProps) {
  const getBmiPositionPercent = (bmiStr: string): number => {
    const bmi = parseFloat(bmiStr);
    if (!bmi || isNaN(bmi) || bmi <= 0) return 0;
    
    // Assume scale spans from BMI 15 to 35
    const minBmi = 15;
    const maxBmi = 35;
    
    if (bmi <= minBmi) return 0;
    if (bmi >= maxBmi) return 100;
    
    return ((bmi - minBmi) / (maxBmi - minBmi)) * 100;
  };

  return (
    <motion.div 
      key="progress"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="font-display text-2xl font-extrabold text-white tracking-tight">Progress & Recomp</h2>
        <button onClick={onExportPDF} className="text-[12px] font-bold text-[#c3f400] flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#c3f400]/30 hover:bg-[#c3f400]/10 transition-colors">
          <Download className="w-3.5 h-3.5" /> PDF
        </button>
      </div>

      {/* ACTIVE AI RECOMPOSITION MATRIX INSIGHT CARD */}
      <div className="bg-[#201f1f] rounded-2xl p-6 border border-[#c3f400] shadow-md relative overflow-hidden ai-glow">
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#c3f400]/10 rounded-full blur-2xl"></div>

        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-full bg-[#c3f400]/25 text-[#c3f400] border border-[#c3f400]/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 fill-[#c3f400]" />
          </div>
          <div>
            <span className="font-sans text-[12px] uppercase font-semibold tracking-wide text-zinc-500">Analisa Tubuh</span>
            <h3 className="font-display text-lg font-bold text-white mt-0.5">Rekomposisi Tubuh</h3>
            
            <p className="font-sans text-sm text-[#c4c9ac] leading-relaxed mt-2">
              {latestRecomp ? latestRecomp.analysis : "Input tinggi dan berat badan untuk mendapatkan analisa komposisi tubuh, target kalori harian, dan kebutuhan proteinmu."}
            </p>
          </div>
        </div>

        {latestRecomp && (
          <div className="grid grid-cols-3 gap-2 border-t border-zinc-800/80 pt-4 mt-2">
            <div className="bg-[#131313] p-3 rounded-xl border border-zinc-800 text-center overflow-hidden">
              <span className="text-[12px] text-[#c4c9ac] font-bold uppercase block tracking-wider">Strategi</span>
              <span className="text-[12px] font-bold font-display text-[#c3f400] block mt-1 truncate">{latestRecomp.focus_type}</span>
            </div>
            <div className="bg-[#131313] p-3 rounded-xl border border-zinc-800 text-center">
              <span className="text-[12px] text-[#c4c9ac] font-bold uppercase block tracking-wider">Target Kalori</span>
              <span className="text-sm font-extrabold font-display text-white block mt-1">{latestRecomp.calories} Kcal</span>
            </div>
            <div className="bg-[#131313] p-3 rounded-xl border border-zinc-800 text-center">
              <span className="text-[12px] text-[#c4c9ac] font-bold uppercase block tracking-wider">Target Protein</span>
              <span className="text-sm font-extrabold font-display text-[#a6e6ff] block mt-1">{latestRecomp.protein} gram</span>
            </div>
          </div>
        )}
      </div>

      {/* BODY METRICS INPUT BLOCK */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Metrics Logger Form */}
        <div className="bg-[#121212] p-5 rounded-xl border border-zinc-800">
          <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#c3f400]" />
            Catat Metrik Tinggi/Berat
          </h3>

          <form onSubmit={onLogMetrics} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-widest text-[#c4c9ac] mb-1">Tinggi Badan (cm)</label>
                <input 
                  type="number"
                  placeholder="e.g. 182"
                  value={tbInput}
                  onChange={(e) => setTbInput(e.target.value)}
                  className="w-full bg-[#201f1f] border-none text-white font-display text-md rounded-lg h-11 px-3 focus:ring-1 focus:ring-[#c3f400] transition-shadow"
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-widest text-[#c4c9ac] mb-1">Berat Badan (kg)</label>
                <input 
                  type="number" 
                  step="0.1"
                  placeholder="e.g. 84.5"
                  value={bbInput}
                  onChange={(e) => setBbInput(e.target.value)}
                  className="w-full bg-[#201f1f] border-none text-white font-display text-md rounded-lg h-11 px-3 focus:ring-1 focus:ring-[#c3f400] transition-shadow"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSubmittingRecomp}
              className="w-full bg-[#c3f400] text-black font-display font-black uppercase text-xs tracking-wider rounded-lg h-11 flex items-center justify-center gap-1.5 hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 fill-black" />
              {isSubmittingRecomp ? "Menganalisis..." : "Analisa Komposisi"}
            </button>
          </form>
        </div>

        {/* BMI Gauge summary panel */}
        <div className="bg-[#121212] p-5 rounded-xl border border-zinc-800 flex flex-col justify-between min-h-[170px]" id="bmi-display-panel">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-white">Current BMI</h3>
            <div className="p-2 bg-zinc-900 rounded-full text-zinc-400">
              <Flame className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-4">
            <span className="font-display text-5xl font-black text-white">{computedBmiVal}</span>
            <span className="font-sans text-xs text-[#c4c9ac] block">kg/m²</span>
          </div>

          <p className="font-sans text-xs text-[#c3f400] uppercase font-bold tracking-widest border border-[#c3f400]/25 bg-[#c3f400]/5 px-2.5 py-1.5 rounded-lg inline-block w-fit mt-3">
            {getBmiStatus(computedBmiVal)}
          </p>

          {/* Horizontal BMI status scale bar */}
          <div className="w-full mt-4 relative">
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden flex">
              <div className="h-full bg-blue-600/50" style={{ width: '17.5%' }}></div>
              <div className="h-full bg-emerald-500" style={{ width: '32.5%' }}></div>
              <div className="h-full bg-orange-400" style={{ width: '25%' }}></div>
              <div className="h-full bg-red-600" style={{ width: '25%' }}></div>
            </div>
            {/* Dynamic Indicator Dot */}
            {parseFloat(computedBmiVal) > 0 && (
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-black rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all duration-500"
                style={{ left: `calc(${getBmiPositionPercent(computedBmiVal)}% - 6px)` }}
              />
            )}
          </div>

          {/* Compact BMI Legend directly under the bar */}
          <div className="w-full mt-1.5 flex text-[9px] font-bold font-sans">
            <span className="text-left text-blue-500/80" style={{ width: '17.5%' }}>&lt;18.5 (Kurang)</span>
            <span className="text-center text-emerald-500" style={{ width: '32.5%' }}>18.5-24.9 (Ideal)</span>
            <span className="text-center text-orange-400" style={{ width: '25%' }}>25.0-29.9 (Lebih)</span>
            <span className="text-right text-red-500" style={{ width: '25%' }}>&ge;30.0 (Obesitas)</span>
          </div>
        </div>
      </div>

      {/* ELEVATED WEIGHT HISTORY TRAJECTORY (CSS BAR CHART) */}
      <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#a6e6ff]" />
            Weight Trajectory
          </h3>
          <span className="text-[12px] uppercase font-bold tracking-wider text-zinc-500 font-mono">Last 3 Readings</span>
        </div>

        {/* Grid Visual Histogram */}
        <div className="h-44 flex items-end justify-between w-full pt-6 pb-2 border-b border-zinc-800 relative">
          {/* Grid Lines */}
          <div className="absolute w-full h-[1px] bg-zinc-800/80 top-1/2 -translate-y-1/2 border-dashed"></div>
          
          <div className="w-full mx-2 bg-zinc-800 rounded-t-md h-[78%] relative group transition-colors hover:bg-zinc-700">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 font-display text-[12px] text-zinc-400 font-bold">85kg</div>
            <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 font-sans text-[12px] text-zinc-500 font-bold uppercase tracking-wider block">Wk 1</span>
          </div>

          <div className="w-full mx-2 bg-zinc-800 rounded-t-md h-[81%] relative group transition-colors hover:bg-zinc-700">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 font-display text-[12px] text-zinc-400 font-bold">85.4kg</div>
            <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 font-sans text-[12px] text-zinc-500 font-bold uppercase tracking-wider block">Wk 2</span>
          </div>

          {/* Active Weight Reading Glow */}
          <div className="w-full mx-2 bg-[#c3f400]/20 rounded-t-md h-[84%] border-t-2 border-[#c3f400] relative group">
            <div className="absolute w-full h-4 top-0 bg-[#c3f400]/20 blur-sm"></div>
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 font-display text-[12px] text-[#c3f400] font-extrabold">{activeProfile?.weight || "72.0"}kg</div>
            <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 font-sans text-[12px] text-[#c3f400] font-extrabold uppercase tracking-wider block">Real</span>
          </div>
        </div>

        <div className="h-6"></div>
      </div>

      {/* Weight History Chart */}
      <WeightChart profileId={activeProfile.id} onWeightLogged={onWeightLogged} />

      {/* Progressive Overload Tracking */}
      <ProgressiveOverload logs={logs} />

      {/* Goal Setting */}
      <GoalSetting profileId={activeProfile.id} currentWeight={activeProfile.weight} totalSessions={activeProfile.total_sessions} />

      {/* CSV Export */}
      <button onClick={onExportCSV}
        className="w-full bg-zinc-900 dark-card border border-zinc-800 dark-border text-zinc-300 dark-text font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-zinc-800 transition-colors">
        <Download className="w-4 h-4 text-[#a6e6ff]" /> Export Data ke CSV
      </button>
    </motion.div>
  );
}
