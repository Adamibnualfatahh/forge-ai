import React, { useEffect, useRef } from "react";
import { Timer, Play, Pause, RotateCcw } from "lucide-react";
import { useForgeStore } from "./store";

const PRESETS = [30, 60, 90, 120, 180];

export default function RestTimer() {
  const { restTimer, setRestTimerSeconds, startRestTimer, toggleRestTimer, resetRestTimer, tickRestTimer } = useForgeStore();
  const { seconds, remaining, running } = restTimer;
  const intervalRef = useRef<number | null>(null);
  const prevRunningRef = useRef(running);
  const prevRemainingRef = useRef(remaining);

  // Tick interval
  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(tickRestTimer, 250);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tickRestTimer]);

  // Detect timer completion: was running with time, now stopped at 0
  useEffect(() => {
    if (prevRunningRef.current && prevRemainingRef.current > 0 && !running && remaining === 0) {
      // Timer just finished
      if ('vibrate' in navigator) navigator.vibrate([300, 150, 300, 150, 300]);
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playBeep = (freq: number, start: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          gain.gain.value = 0.3;
          osc.start(ctx.currentTime + start);
          osc.stop(ctx.currentTime + start + 0.15);
        };
        playBeep(880, 0);
        playBeep(880, 0.2);
        playBeep(1320, 0.4);
      } catch {}
    }
    prevRunningRef.current = running;
    prevRemainingRef.current = remaining;
  }, [running, remaining]);

  // Hydrate timer on mount (recalculate from endTime)
  useEffect(() => { if (running) tickRestTimer(); }, []);

  const pct = seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 0;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="bg-[#121212] dark-card rounded-2xl p-5 border border-zinc-800 dark-border">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-display font-bold text-white dark-text text-sm flex items-center gap-2">
          <Timer className="w-4 h-4 text-[#c3f400]" /> Rest Timer
        </h4>
        {running && <span className="text-[10px] font-mono text-[#c3f400] timer-pulse">ACTIVE</span>}
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#2c2c2c" strokeWidth="6" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="#c3f400" strokeWidth="6"
              strokeDasharray={`${pct * 2.83} 283`} strokeLinecap="round" className="transition-all duration-300" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display text-2xl font-black text-white dark-text">
            {remaining > 0 ? fmt(remaining) : fmt(seconds)}
          </span>
        </div>

        <div className="flex gap-2 flex-wrap justify-center">
          {PRESETS.map(p => (
            <button key={p} onClick={() => setRestTimerSeconds(p)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                seconds === p ? 'bg-[#c3f400] text-black border-transparent' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}>
              {fmt(p)}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mt-2">
          {remaining === 0 && !running ? (
            <button onClick={startRestTimer} className="bg-[#c3f400] text-black font-bold px-6 py-2.5 rounded-xl flex items-center gap-1.5 text-sm">
              <Play className="w-4 h-4" /> Mulai
            </button>
          ) : (
            <>
              <button onClick={toggleRestTimer} className="bg-zinc-800 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 text-sm border border-zinc-700 transition-all">
                {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {running ? 'Pause' : 'Resume'}
              </button>
              <button onClick={resetRestTimer} className="bg-zinc-900 text-zinc-400 px-4 py-2.5 rounded-xl border border-zinc-800 transition-all">
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
