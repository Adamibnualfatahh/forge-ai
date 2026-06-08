import React, { useRef, useState, useEffect } from "react";
import { Share2, Download, Camera, Image, X, Sparkles, Layout, Check, Palette, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Exercise } from "./types";
import { getExerciseInfo } from "./exerciseDb";

const BODY_FRONT = "https://wger.de/static/images/muscles/muscular_system_front.svg";
const BODY_BACK = "https://wger.de/static/images/muscles/muscular_system_back.svg";

const muscleOverlaysFront = {
  chest: "https://wger.de/static/images/muscles/main/muscle-4.c9fa9a228bc8.svg",
  shoulders: "https://wger.de/static/images/muscles/main/muscle-2.e1e1205a3202.svg",
  biceps: "https://wger.de/static/images/muscles/main/muscle-1.8790f8a0b3b9.svg",
  quads: "https://wger.de/static/images/muscles/main/muscle-10.b1445ea1acf6.svg",
  abs: "https://wger.de/static/images/muscles/main/muscle-6.592f938fa8c7.svg",
};

const muscleOverlaysBack = {
  back: "https://wger.de/static/images/muscles/main/muscle-12.6a5de7a0e373.svg",
  shoulders: "https://wger.de/static/images/muscles/main/muscle-2.e1e1205a3202.svg",
  triceps: "https://wger.de/static/images/muscles/main/muscle-5.8a2b934b5486.svg",
  hamstrings: "https://wger.de/static/images/muscles/main/muscle-11.54ef31755917.svg",
  glutes: "https://wger.de/static/images/muscles/main/muscle-8.fbdfb46f3bc0.svg",
  calves: "https://wger.de/static/images/muscles/main/muscle-7.edbd8c381b0c.svg",
};

interface Props {
  name: string;
  focus: string;
  duration: number;
  exercises: Exercise[];
  totalVolume: number;
  onClose: () => void;
}

type ThemeType = 'glass-neon' | 'deep-dark' | 'minimal-white' | 'royal-gold';
type LayoutType = 'classic-bottom' | 'centered-focus' | 'minimal-side' | 'floating-glass';

interface ThemeConfig {
  id: ThemeType;
  name: string;
  bg: string;
  accent: string;
  text: string;
  secondaryText: string;
  glassOpacity: number;
  borderOpacity: number;
}

const THEMES: ThemeConfig[] = [
  { id: 'glass-neon', name: 'Glass Neon', bg: 'rgba(28, 28, 30, 0.7)', accent: '#c3f400', text: '#ffffff', secondaryText: 'rgba(255,255,255,0.6)', glassOpacity: 0.15, borderOpacity: 0.1 },
  { id: 'deep-dark', name: 'Deep Dark', bg: 'rgba(0, 0, 0, 0.85)', accent: '#ffffff', text: '#ffffff', secondaryText: 'rgba(255,255,255,0.4)', glassOpacity: 0.05, borderOpacity: 0.08 },
  { id: 'minimal-white', name: 'Clean Light', bg: 'rgba(255, 255, 255, 0.8)', accent: '#000000', text: '#000000', secondaryText: 'rgba(0,0,0,0.5)', glassOpacity: 0.1, borderOpacity: 0.15 },
  { id: 'royal-gold', name: 'Titanium', bg: 'rgba(18, 18, 18, 0.75)', accent: '#d4af37', text: '#ffffff', secondaryText: 'rgba(255,255,255,0.5)', glassOpacity: 0.12, borderOpacity: 0.12 },
];

const LAYOUTS: { id: LayoutType; name: string }[] = [
  { id: 'classic-bottom', name: 'Classic Bottom' },
  { id: 'centered-focus', name: 'Centered Focus' },
  { id: 'minimal-side', name: 'Side Info' },
  { id: 'floating-glass', name: 'Floating Glass' },
];

function getAnimalText(volumeKg: number): string {
  if (volumeKg <= 0) return "";
  if (volumeKg <= 20) return `Setara menjinjing 2 galon air mineral penuh! (${volumeKg}kg)`;
  if (volumeKg <= 50) return `Setara memindahkan sekarung beras 50kg! (${volumeKg}kg)`;
  if (volumeKg <= 100) return `Setara menggendong seekor Kambing Etawa jantan! (${volumeKg}kg)`;
  if (volumeKg <= 250) return `Setara mengangkat satu unit Mesin Cuci! (${volumeKg}kg)`;
  if (volumeKg <= 500) return `Setara menahan bobot seekor Gorila! (${volumeKg}kg)`;
  if (volumeKg <= 800) return `Setara mengangkat sebuah Piano Grand! (${volumeKg}kg)`;
  if (volumeKg <= 1500) return `Setara mengangkat sebuah mobil City Car! (${volumeKg}kg)`;
  if (volumeKg <= 3000) return `Setara menggeser seekor Badak Putih Afrika! (${volumeKg}kg)`;
  if (volumeKg <= 6000) return `Setara menahan beban seekor Gajah Afrika! (${volumeKg}kg)`;
  if (volumeKg <= 12000) return `Setara mengangkat satu unit Helikopter! (${volumeKg}kg)`;
  return `Setara mengangkat Truk Tronton penuh muatan! (${volumeKg}kg)`;
}

export default function ShareCard(props: Props) {
  const { focus, duration, exercises, totalVolume, onClose } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [step, setStep] = useState<'pick' | 'edit'>('pick');
  const [photoSrc, setPhotoSrc] = useState('');
  const [activeTheme, setActiveTheme] = useState<ThemeType>('glass-neon');
  const [activeLayout, setActiveLayout] = useState<LayoutType>('classic-bottom');
  const [overlayOpacity, setOverlayOpacity] = useState(45);
  const [brightness, setBrightness] = useState(100);
  const [editTab, setEditTab] = useState<'style' | 'adjust' | 'content'>('style');

  const [showDuration, setShowDuration] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [showExerciseCount, setShowExerciseCount] = useState(true);
  const [showAnalogy, setShowAnalogy] = useState(true);
  const [showMuscleMap, setShowMuscleMap] = useState(true);
  const [customText, setCustomText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const mins = Math.floor(duration / 60);
  const theme = THEMES.find(t => t.id === activeTheme) || THEMES[0];

  // AUTOMATIC LIVE PREVIEW
  useEffect(() => {
    if (step === 'edit' && photoSrc) {
      const timer = setTimeout(() => {
        generate();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [step, activeTheme, activeLayout, overlayOpacity, showDuration, showVolume, showExerciseCount, showAnalogy, showMuscleMap, customText, brightness]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setPhotoSrc(reader.result as string); setStep('edit'); };
    reader.readAsDataURL(file);
  };

  const loadImg = (src: string): Promise<HTMLImageElement> => new Promise((res, rej) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = (err) => rej(err);
    img.src = src;
  });

  const generate = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !photoSrc) return;
    
    setIsGenerating(true);
    const W = 1080, H = 1920;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const proxy = (url: string) => `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;

    try {
      // 1. Determine active muscles
      const activeCats = new Set<string>();
      exercises.forEach(ex => {
        const info = getExerciseInfo(ex.name);
        if (info) {
          const cat = info.category.toLowerCase();
          activeCats.add(cat);
          if (cat === 'arms') { activeCats.add('biceps'); activeCats.add('triceps'); }
          if (cat === 'legs') { activeCats.add('quads'); activeCats.add('hamstrings'); activeCats.add('glutes'); activeCats.add('calves'); }
          if (cat === 'core') { activeCats.add('abs'); }
          if (cat === 'back') { activeCats.add('back'); }
          if (cat === 'chest') { activeCats.add('chest'); }
          if (cat === 'shoulders') { activeCats.add('shoulders'); }
        }
      });

      // 2. Load images
      const imagesToLoad: Record<string, string> = { photo: photoSrc };
      if (showMuscleMap) {
        imagesToLoad.front = proxy(BODY_FRONT);
        imagesToLoad.back = proxy(BODY_BACK);
        Object.entries(muscleOverlaysFront).forEach(([cat, url]) => {
          if (activeCats.has(cat)) imagesToLoad[`f_${cat}`] = proxy(url);
        });
        Object.entries(muscleOverlaysBack).forEach(([cat, url]) => {
          if (activeCats.has(cat)) imagesToLoad[`b_${cat}`] = proxy(url);
        });
      }

      const loaded: Record<string, HTMLImageElement> = {};
      await Promise.all(Object.entries(imagesToLoad).map(async ([key, src]) => {
        try { loaded[key] = await loadImg(src); } catch(e) {}
      }));

      // 3. Draw Photo
      if (loaded.photo) {
        ctx.save();
        ctx.filter = `brightness(${brightness}%)`;
        const scale = Math.max(W / loaded.photo.width, H / loaded.photo.height);
        const w = loaded.photo.width * scale, h = loaded.photo.height * scale;
        ctx.drawImage(loaded.photo, (W - w) / 2, (H - h) / 2, w, h);
        ctx.restore();
      }

      // 4. Overlays
      const grad = ctx.createLinearGradient(0, H * 0.4, 0, H);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, `rgba(0,0,0,${overlayOpacity * 0.01})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, W, H);

      // 5. Draw Muscle Map (Heatmap)
      if (showMuscleMap && loaded.front && loaded.back) {
        let mx = 80, my = 320, ms = 1.0;

        if (activeLayout === 'classic-bottom') { mx = 80; my = H - 950; ms = 0.9; }
        else if (activeLayout === 'centered-focus') { mx = W/2 - 170; my = H/2 - 700; ms = 1.1; }
        else if (activeLayout === 'minimal-side') { mx = 80; my = H/2 - 100; ms = 0.85; }
        else if (activeLayout === 'floating-glass') { mx = 80; my = H - 550; ms = 0.8; }

        const mapW = 160 * ms, mapH = 320 * ms;
        const drawBody = (body: HTMLImageElement, prefix: string, x: number) => {
          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.drawImage(body, x, my, mapW, mapH);
          ctx.restore();
          ctx.save();
          ctx.filter = "brightness(0) saturate(100%) invert(17%) sepia(97%) saturate(6510%) hue-rotate(357deg) brightness(94%) contrast(116%) drop-shadow(0 0 8px rgba(255,0,0,0.6))";
          const overlays = prefix === 'f' ? muscleOverlaysFront : muscleOverlaysBack;
          Object.keys(overlays).forEach(cat => {
            const img = loaded[`${prefix}_${cat}`];
            if (img) ctx.drawImage(img, x, my, mapW, mapH);
          });
          ctx.restore();
        };

        drawBody(loaded.front, 'f', mx);
        drawBody(loaded.back, 'b', mx + mapW + 20);
      }

      drawThemeContent(ctx, W, H);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const drawThemeContent = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const font = (w: string, s: number) => `${w} ${s}px "Sora", "Inter", -apple-system, sans-serif`;

    const fitText = (text: string, baseSize: number, maxWidth: number, weight: string = '900') => {
      let size = baseSize;
      ctx.font = font(weight, size);
      while (ctx.measureText(text).width > maxWidth && size > 20) {
        size -= 2;
        ctx.font = font(weight, size);
      }
      return size;
    };

    if (activeLayout === 'floating-glass') {
      // FLOATING GLASS LAYOUT
      ctx.textAlign = 'left';
      ctx.fillStyle = theme.accent;
      const fontSize = fitText(focus.toUpperCase(), 160, W - 200, '900');
      ctx.font = font('900', fontSize);
      ctx.save();
      ctx.translate(100, 350);
      ctx.fillText(focus.toUpperCase(), 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.font = font('600', 40);
      ctx.fillText(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }).toUpperCase(), 5, 80);
      ctx.restore();

      // Individual metric cards on the right
      const metrics = [];
      if (showDuration) metrics.push({ val: mins > 0 ? `${mins}` : '45', label: 'MINS' });
      if (showExerciseCount) metrics.push({ val: `${exercises.length}`, label: 'EXS' });
      if (showVolume) metrics.push({ val: `${totalVolume.toLocaleString()}`, label: 'KG' });

      metrics.forEach((m, i) => {
        const cw = 280, ch = 240;
        const cx = W - cw - 80;
        const cy = 600 + (i * 280);
        drawSingleStatCard(ctx, cx, cy, cw, ch, m.val, m.label);
      });

      if (showAnalogy) {
        const analogyText = getAnimalText(totalVolume);
        if (analogyText) {
          ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = font('500', 22);
          ctx.fillText(analogyText, 80, H - 180);
        }
      }
    } else if (activeLayout === 'classic-bottom') {
      // CLASSIC BOTTOM
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      const fontSize = fitText(focus.toUpperCase(), 44, W / 2, '800');
      ctx.font = font('800', fontSize);
      ctx.fillText(focus.toUpperCase(), W - 80, 120);
      
      ctx.fillStyle = theme.secondaryText;
      ctx.font = font('600', 28);
      ctx.fillText(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase(), W - 80, 168);

      const statsY = H - 520;
      if (showAnalogy) {
        const analogyText = getAnimalText(totalVolume);
        if (analogyText) {
          ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.font = font('600', 32);
          const words = analogyText.split(' ');
          let line = '', lines: string[] = [];
          words.forEach(word => {
            const testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > W - 200) { lines.push(line); line = word + ' '; }
            else line = testLine;
          });
          lines.push(line);
          lines.forEach((l, i) => ctx.fillText(l.trim(), W / 2, statsY - 80 - (lines.length - 1 - i) * 45));
        }
      }
      drawStatsPanel(ctx, 60, statsY, W - 120, 320);
    } 
    else if (activeLayout === 'centered-focus') {
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff';
      const fontSize = fitText(focus.toUpperCase(), 120, W - 120, '800');
      ctx.font = font('800', fontSize);
      ctx.fillText(focus.toUpperCase(), W / 2, H / 2 - 100);
      
      ctx.fillStyle = theme.accent; ctx.font = font('700', 40);
      ctx.fillText(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }).toUpperCase(), W / 2, H / 2 - 30);

      drawStatsPanel(ctx, 100, H / 2 + 150, W - 200, 280);
      
      if (showAnalogy) {
        const analogyText = getAnimalText(totalVolume);
        if (analogyText) {
          ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = font('500', 28);
          ctx.fillText(analogyText, W / 2, H / 2 + 500);
        }
      }
    }
    else {
      // MINIMAL SIDE
      ctx.save();
      ctx.translate(80, H / 2 - 300);
      ctx.textAlign = 'left';
      ctx.fillStyle = theme.accent;
      const fontSize = fitText(focus.toUpperCase(), 100, W - 200, '800');
      ctx.font = font('800', fontSize);
      ctx.fillText(focus.toUpperCase(), 0, 0);
      
      ctx.fillStyle = '#ffffff'; ctx.font = font('600', 40);
      ctx.fillText(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }).toUpperCase(), 0, 70);
      ctx.restore();

      drawStatsPanel(ctx, 60, H - 400, W - 120, 240);

      if (showAnalogy) {
        const analogyText = getAnimalText(totalVolume);
        if (analogyText) {
          ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = font('500', 24);
          ctx.fillText(analogyText, 80, H - 430);
        }
      }
    }

    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = font('600', 24);
    ctx.fillText('INVICTUSWAVE.TECH', W / 2, H - 80);

    setImageUrl(canvasRef.current!.toDataURL('image/png'));
  };

  const drawSingleStatCard = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, val: string, label: string) => {
    const font = (w: string, s: number) => `${w} ${s}px "Sora", sans-serif`;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 40); ctx.fillStyle = theme.bg; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = `rgba(255,255,255,${theme.borderOpacity * 2})`; ctx.stroke();
    
    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, `rgba(255,255,255,${theme.glassOpacity * 1.5})`); grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad; ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = theme.text;
    ctx.font = font('800', 70);
    ctx.fillText(val, x + w / 2, y + h / 2 + 10);
    
    ctx.fillStyle = theme.secondaryText;
    ctx.font = font('700', 22);
    ctx.fillText(label, x + w / 2, y + h / 2 + 65);
    ctx.restore();
  };

  const drawStatsPanel = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    const font = (w: string, s: number) => `${w} ${s}px "Sora", sans-serif`;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 60); ctx.fillStyle = theme.bg; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255,255,255,${theme.borderOpacity * 1.5})`; ctx.stroke();
    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, `rgba(255,255,255,${theme.glassOpacity})`); grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad; ctx.fill();

    const stats: { val: string; label: string }[] = [];
    if (showDuration) stats.push({ val: mins > 0 ? `${mins}` : '45', label: 'MINS' });
    if (showExerciseCount) stats.push({ val: `${exercises.length}`, label: 'EXS' });
    if (showVolume) stats.push({ val: `${totalVolume.toLocaleString()}`, label: 'KG' });

    const itemW = w / stats.length;
    stats.forEach((s, i) => {
      const sx = x + (i * itemW) + (itemW / 2);
      ctx.textAlign = 'center'; ctx.fillStyle = theme.text; ctx.font = font('800', h > 300 ? 85 : 70);
      ctx.fillText(s.val, sx, y + h/2 + 10);
      ctx.fillStyle = theme.secondaryText; ctx.font = font('700', 24);
      ctx.fillText(s.label, sx, y + h/2 + 70);
      if (i < stats.length - 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.moveTo(x + (i + 1) * itemW, y + 60); ctx.lineTo(x + (i + 1) * itemW, y + h - 60); ctx.stroke();
      }
    });
    ctx.restore();
  };

  const handleShare = async () => {
    canvasRef.current?.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'forge-ai-workout.png', { type: 'image/png' });
      try {
        if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
        else dl(blob);
      } catch { dl(blob); }
    }, 'image/png');
  };

  const dl = (blob: Blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'forge-ai-workout.png'; a.click(); };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-md" 
      onClick={onClose}
    >
      <div className="w-full max-w-[400px] bg-[#1c1c1e] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#c3f400]/20 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-[#c3f400]" />
            </div>
            <h3 className="font-display font-bold text-white">
              {step === 'pick' ? 'Capture Moment' : 'Design Card'}
            </h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[85vh] touch-pan-y overscroll-contain custom-scrollbar">
          <AnimatePresence mode="wait">
            
            {step === 'pick' && (
              <motion.div key="pick" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 pt-2">
                  <label className="flex items-center justify-center gap-3 bg-white text-black font-black py-5 rounded-[1.5rem] text-sm cursor-pointer active:scale-95 transition-transform">
                    <Camera className="w-5 h-5" /> TAKE PHOTO
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
                  </label>
                  <label className="flex items-center justify-center gap-3 bg-zinc-800 text-white font-bold py-5 rounded-[1.5rem] text-sm cursor-pointer border border-white/5 active:scale-95 transition-transform">
                    <Image className="w-5 h-5" /> CHOOSE FROM GALLERY
                    <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                  </label>
                </div>
              </motion.div>
            )}

            {step === 'edit' && (
              <motion.div key="edit" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                <div 
                  className="aspect-[9/16] rounded-[2.2rem] overflow-hidden relative border border-white/10 shadow-2xl bg-black"
                >
                  {imageUrl ? (
                    <img src={imageUrl} className="w-full h-full object-cover pointer-events-none select-none" alt="Share Preview" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3">
                      <RefreshCw className="w-8 h-8 text-[#c3f400] animate-spin" />
                    </div>
                  )}
                  {isGenerating && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                      <RefreshCw className="w-6 h-6 text-[#c3f400] animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-white/5">
                  {(['style', 'adjust', 'content'] as const).map(tab => (
                    <button key={tab} onClick={() => setEditTab(tab)}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                        editTab === tab ? "bg-white/10 text-white shadow-sm" : "text-zinc-500"
                      }`}>{tab}</button>
                  ))}
                </div>

                <div className="min-h-[160px]">
                  {editTab === 'style' && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                      <div className="space-y-2.5">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Visual Theme</span>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                          {THEMES.map(t => (
                            <button key={t.id} onClick={() => setActiveTheme(t.id)}
                              className={`px-4 py-2.5 rounded-xl border text-[10px] font-bold shrink-0 transition-all ${
                                activeTheme === t.id ? "bg-[#c3f400] text-black border-[#c3f400]" : "bg-zinc-800/50 text-zinc-400 border-white/5"
                              }`}>{t.name}</button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Card Layout</span>
                        <div className="grid grid-cols-4 gap-2">
                          {LAYOUTS.map(l => (
                            <button key={l.id} onClick={() => setActiveLayout(l.id)}
                              className={`py-2.5 rounded-xl border text-[9px] font-black uppercase transition-all ${
                                activeLayout === l.id ? "bg-white text-black border-white" : "bg-zinc-800/50 text-zinc-500 border-white/5"
                              }`}>{l.name.split(' ')[0]}</button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {editTab === 'adjust' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 py-2">
                      <div className="bg-zinc-900/50 p-4 rounded-[1.2rem] border border-white/5 space-y-3">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Bottom Shadow</span>
                          <span className="text-[10px] font-mono text-[#c3f400]">{overlayOpacity}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={overlayOpacity} onChange={e => setOverlayOpacity(+e.target.value)} 
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#c3f400]" />
                      </div>
                      <div className="bg-zinc-900/50 p-4 rounded-[1.2rem] border border-white/5 space-y-3">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Brightness</span>
                          <span className="text-[10px] font-mono text-[#c3f400]">{brightness}%</span>
                        </div>
                        <input type="range" min="30" max="150" value={brightness} onChange={e => setBrightness(+e.target.value)} 
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#c3f400]" />
                      </div>
                    </motion.div>
                  )}

                  {editTab === 'content' && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Add Caption</label>
                        <input type="text" value={customText} onChange={e => setCustomText(e.target.value)} placeholder="Say something..."
                          className="w-full bg-zinc-900/80 border border-white/5 rounded-xl h-11 px-4 text-xs text-white outline-none focus:border-[#c3f400]" />
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Toggle Elements</span>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Time', val: showDuration, set: setShowDuration },
                            { label: 'KG', val: showVolume, set: setShowVolume },
                            { label: 'Count', val: showExerciseCount, set: setShowExerciseCount },
                            { label: 'Analogy', val: showAnalogy, set: setShowAnalogy },
                            { label: 'Muscle Map', val: showMuscleMap, set: setShowMuscleMap },
                          ].map(opt => (
                            <button key={opt.label} onClick={() => opt.set(!opt.val)}
                              className={`py-2.5 rounded-xl border text-[9px] font-black uppercase transition-all ${
                                opt.val ? "bg-[#c3f400]/10 text-[#c3f400] border-[#c3f400]/30" : "bg-zinc-800/30 text-zinc-600 border-transparent"
                              }`}>{opt.label}</button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={handleShare} className="col-span-2 bg-[#c3f400] text-black font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 text-lg shadow-xl active:scale-95 transition-transform">
                    <Share2 className="w-6 h-6" /> SHARE TO STORY
                  </button>
                  <button onClick={() => canvasRef.current?.toBlob(b => b && dl(b), 'image/png')}
                    className="bg-zinc-800 text-white font-bold py-4 rounded-[1.2rem] flex items-center justify-center gap-2 text-sm border border-white/5 active:bg-zinc-700">
                    <Download className="w-4 h-4" /> SAVE IMAGE
                  </button>
                  <button onClick={() => setStep('pick')} className="bg-zinc-900 text-zinc-400 font-bold py-4 rounded-[1.2rem] text-sm border border-white/5">
                    RETAKE
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}
