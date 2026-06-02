import React, { useRef, useState } from "react";
import { Share2, Download, Camera, Image, X } from "lucide-react";
import { Exercise } from "./types";

interface Props {
  name: string;
  focus: string;
  duration: number;
  exercises: Exercise[];
  totalVolume: number;
  onClose: () => void;
}

function getAnimalText(kg: number): string {
  if (kg <= 0) return "";
  if (kg <= 100) return `Setara mengangkat Kambing Dewasa (${kg} kg)`;
  if (kg <= 250) return `Setara mengangkat Gorila Gunung (${kg} kg)`;
  if (kg <= 500) return `Setara mengangkat Beruang Grizzly (${kg} kg)`;
  if (kg <= 1000) return `Setara mengangkat Sapi Limousin (${kg} kg)`;
  if (kg <= 2500) return `Setara mengangkat Badak Sumatra (${kg} kg)`;
  if (kg <= 5000) return `Setara mengangkat Gajah Asia (${kg} kg)`;
  return `Setara mengangkat Truk Colt Diesel (${kg} kg)`;
}

export default function ShareCard(props: Props) {
  const { focus, duration, exercises, totalVolume, onClose } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [step, setStep] = useState<'pick' | 'edit' | 'preview'>('pick');
  const [photoSrc, setPhotoSrc] = useState('');

  const [showDuration, setShowDuration] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [showSets, setShowSets] = useState(true);
  const [showExerciseCount, setShowExerciseCount] = useState(true);
  const [showAnalogy, setShowAnalogy] = useState(totalVolume > 0);
  const [overlayOpacity, setOverlayOpacity] = useState(45);
  const [customText, setCustomText] = useState('');

  const mins = Math.floor(duration / 60);
  const setsTotal = exercises.reduce((a, e) => a + (e.is_cardio ? 0 : e.sets), 0);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setPhotoSrc(reader.result as string); setStep('edit'); };
    reader.readAsDataURL(file);
  };

  const generate = () => {
    const canvas = canvasRef.current!;
    const W = 1080, H = 1920;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const photo = new window.Image();
    photo.onload = () => {
      // Photo cover
      const scale = Math.max(W / photo.width, H / photo.height);
      const w = photo.width * scale, h = photo.height * scale;
      ctx.drawImage(photo, (W - w) / 2, (H - h) / 2, w, h);

      // Overlay - gradient darker at bottom
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, `rgba(0,0,0,${overlayOpacity * 0.005})`);
      grad.addColorStop(0.5, `rgba(0,0,0,${overlayOpacity * 0.007})`);
      grad.addColorStop(1, `rgba(0,0,0,${overlayOpacity * 0.012})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      finish(ctx, W, H);
    };
    photo.src = photoSrc;
  };

  const finish = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const font = (w: string, s: number) => `${w} ${s}px "Inter", -apple-system, "SF Pro Display", sans-serif`;

    // Top right: focus + date
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = font('600', 34);
    ctx.fillText(focus, W - 70, 100);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = font('400', 28);
    ctx.fillText(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }), W - 70, 140);

    // Custom text - positioned at bottom area above stats, not center
    if (customText.trim()) {
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = font('700', 52);
      const words = customText.split(' ');
      let line = '', lines: string[] = [];
      words.forEach(word => {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > W - 160) { lines.push(line.trim()); line = word + ' '; }
        else line = test;
      });
      lines.push(line.trim());
      const textY = H - 700;
      lines.forEach((l, i) => ctx.fillText(l, 80, textY + i * 66));
    }

    // Analogy text above stats
    if (showAnalogy && totalVolume > 0) {
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = font('500', 32);
      ctx.fillText(getAnimalText(totalVolume), 80, H - 460);
    }

    // Bottom stats - clean white boxes
    const statsToShow: { val: string; label: string }[] = [];
    if (showDuration && mins > 0) statsToShow.push({ val: `${mins}`, label: 'min' });
    if (showExerciseCount) statsToShow.push({ val: `${exercises.length}`, label: 'exercises' });
    if (showSets) statsToShow.push({ val: `${setsTotal}`, label: 'sets' });
    if (showVolume && totalVolume > 0) statsToShow.push({ val: `${totalVolume}`, label: 'kg' });

    if (statsToShow.length > 0) {
      const gap = 20;
      const boxW = (W - 160 - (statsToShow.length - 1) * gap) / statsToShow.length;
      const boxH = 140;
      const panelY = H - 380;

      // Panel background
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.roundRect(60, panelY - 20, W - 120, boxH + 40, 24);
      ctx.fill();

      statsToShow.forEach((s, i) => {
        const x = 80 + i * (boxW + gap);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = font('700', 54);
        ctx.fillText(s.val, x + boxW / 2, panelY + 55);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = font('400', 26);
        ctx.fillText(s.label, x + boxW / 2, panelY + 100);
      });
    }

    // Bottom bar - subtle branding
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, H - 100, W, 100);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = font('500', 26);
    ctx.fillText('invictuswave.tech', W / 2, H - 50);

    setImageUrl(canvasRef.current!.toDataURL('image/png'));
    setStep('preview');
  };

  const handleShare = async () => {
    canvasRef.current?.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'invictuswave-workout.png', { type: 'image/png' });
      try {
        if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
        else dl(blob);
      } catch { dl(blob); }
    }, 'image/png');
  };

  const dl = (blob: Blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'invictuswave-workout.png'; a.click(); };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="w-full max-w-[360px] space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>

        {step === 'pick' && (
          <div className="space-y-3">
            <h3 className="text-white font-display font-bold text-lg text-center">Share Workout</h3>
            <label className="flex items-center justify-center gap-2 bg-white text-black font-bold py-4 rounded-xl text-sm cursor-pointer">
              <Camera className="w-5 h-5" /> Ambil Foto
              <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
            </label>
            <label className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold py-4 rounded-xl text-sm cursor-pointer">
              <Image className="w-5 h-5" /> Dari Galeri
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </label>
            <button onClick={onClose} className="w-full text-zinc-500 text-xs py-2">Batal</button>
          </div>
        )}

        {step === 'edit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-display font-bold text-sm">Customize</h3>
              <button onClick={onClose}><X className="w-5 h-5 text-zinc-500" /></button>
            </div>

            <div className="aspect-[9/16] rounded-xl overflow-hidden relative">
              <img src={photoSrc} className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,${overlayOpacity*0.005}), rgba(0,0,0,${overlayOpacity*0.012}))` }} />
              <span className="absolute top-3 right-3 text-white/80 text-[8px] font-medium">{focus}</span>
              {customText && <span className="absolute bottom-24 left-3 right-3 text-white font-bold text-[9px] leading-tight">{customText}</span>}
              {showAnalogy && totalVolume > 0 && <span className="absolute bottom-16 left-3 text-white/60 text-[7px]">{getAnimalText(totalVolume)}</span>}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Darkening ({overlayOpacity}%)</label>
                <input type="range" min="0" max="80" value={overlayOpacity} onChange={e => setOverlayOpacity(+e.target.value)} className="w-full accent-white" />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Caption (opsional)</label>
                <input type="text" value={customText} onChange={e => setCustomText(e.target.value)} placeholder="e.g. Back to 100kg squat"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl h-10 px-3 text-sm text-white" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Durasi', checked: showDuration, set: setShowDuration },
                  { label: 'Volume (kg)', checked: showVolume, set: setShowVolume },
                  { label: 'Total Sets', checked: showSets, set: setShowSets },
                  { label: 'Exercises', checked: showExerciseCount, set: setShowExerciseCount },
                  { label: 'Setara angkat', checked: showAnalogy, set: setShowAnalogy },
                ].map(opt => (
                  <label key={opt.label} className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 cursor-pointer">
                    <input type="checkbox" checked={opt.checked} onChange={() => opt.set(!opt.checked)} className="accent-white w-3.5 h-3.5" />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <button onClick={generate} className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm">Generate</button>
          </div>
        )}

        {step === 'preview' && (
          <>
            <div className="rounded-2xl overflow-hidden border border-zinc-800 aspect-[9/16]">
              <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleShare} className="flex-1 bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm">
                <Share2 className="w-4 h-4" /> Share
              </button>
              <button onClick={() => canvasRef.current?.toBlob(b => b && dl(b), 'image/png')}
                className="px-4 py-3 rounded-xl border border-zinc-700 text-zinc-300 text-sm"><Download className="w-4 h-4" /></button>
              <button onClick={() => setStep('edit')} className="px-4 py-3 rounded-xl border border-zinc-700 text-zinc-400 text-xs">Edit</button>
            </div>
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
