import React, { useRef } from "react";
import { Share2, Download } from "lucide-react";
import { Exercise } from "./types";

interface Props {
  name: string;
  focus: string;
  duration: number; // seconds
  exercises: Exercise[];
  totalVolume: number;
  onClose: () => void;
}

export default function ShareCard({ name, focus, duration, exercises, totalVolume, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  const mins = Math.floor(duration / 60);
  const setsTotal = exercises.reduce((a, e) => a + (e.is_cardio ? 0 : e.sets), 0);

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm' as any);
      const canvas = await html2canvas(cardRef.current, { backgroundColor: '#0a0a0a', scale: 2 });
      canvas.toBlob(async (blob: Blob | null) => {
        if (!blob) return;
        const file = new File([blob], 'forge-workout.png', { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: `${name} - ${focus}` });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'forge-workout.png'; a.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch {
      // Fallback: just download as text share
      if (navigator.share) {
        await navigator.share({ text: `🏋️ ${name} - ${focus}\n⏱ ${mins} menit\n💪 ${setsTotal} sets\n🏋️ ${totalVolume} kg total volume` });
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[360px] space-y-4" onClick={e => e.stopPropagation()}>
        {/* The card to capture */}
        <div ref={cardRef} className="bg-[#0a0a0a] rounded-2xl p-6 space-y-5 border border-zinc-800">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Workout Complete</span>
              <h3 className="font-display text-xl font-bold text-white">{focus}</h3>
            </div>
            <div className="text-right">
              <span className="text-2xl font-display font-black text-[#c3f400]">{mins}</span>
              <span className="text-xs text-zinc-500 block">menit</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-900 rounded-xl p-3 text-center">
              <span className="text-lg font-bold text-white block">{exercises.length}</span>
              <span className="text-[10px] text-zinc-500">Gerakan</span>
            </div>
            <div className="bg-zinc-900 rounded-xl p-3 text-center">
              <span className="text-lg font-bold text-white block">{setsTotal}</span>
              <span className="text-[10px] text-zinc-500">Total Sets</span>
            </div>
            <div className="bg-zinc-900 rounded-xl p-3 text-center">
              <span className="text-lg font-bold text-[#c3f400] block">{totalVolume > 0 ? `${totalVolume}` : '-'}</span>
              <span className="text-[10px] text-zinc-500">kg Volume</span>
            </div>
          </div>

          {/* Exercise list */}
          <div className="space-y-1.5">
            {exercises.slice(0, 6).map((ex, i) => (
              <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-zinc-900">
                <span className="text-zinc-300 truncate flex-1">{ex.name}</span>
                <span className="text-zinc-500 shrink-0 ml-2">
                  {ex.is_cardio ? `${ex.duration_minutes}m` : `${ex.sets}×${ex.reps}${ex.weight_kg ? ` @${ex.weight_kg}kg` : ''}`}
                </span>
              </div>
            ))}
            {exercises.length > 6 && <span className="text-[10px] text-zinc-600">+{exercises.length - 6} more</span>}
          </div>

          {/* Footer branding */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <span className="text-[11px] font-display font-bold text-zinc-600">{name}</span>
            <span className="text-[10px] font-display font-bold text-[#c3f400]">FORGE</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button onClick={handleShare}
            className="flex-1 bg-[#c3f400] text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm">
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button onClick={onClose}
            className="px-5 py-3 rounded-xl border border-zinc-700 text-zinc-400 text-sm">Tutup</button>
        </div>
      </div>
    </div>
  );
}
