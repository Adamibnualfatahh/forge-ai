import React from "react";

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

interface MuscleHeatmapProps {
  recoveryStatus: { group: string; days: number; status: 'recovering' | 'ready' | 'idle' }[];
}

export default function MuscleHeatmap({ recoveryStatus }: MuscleHeatmapProps) {
  const getStatusStyle = (category: string): React.CSSProperties => {
    const categoryMap: Record<string, string> = {
      biceps: 'arms', triceps: 'arms',
      quads: 'legs', hamstrings: 'legs', glutes: 'legs', calves: 'legs',
      abs: 'core'
    };
    
    const targetCategory = categoryMap[category] || category;
    const status = recoveryStatus.find(s => s.group === targetCategory);
    
    // Default to 'ready' look if never trained, but with lower opacity
    if (!status || status.days === -1) {
      return {
        filter: "brightness(0) saturate(100%) invert(84%) sepia(85%) saturate(1915%) hue-rotate(28deg) brightness(106%) contrast(106%)",
        opacity: 0.15,
        zIndex: 5
      };
    }
    
    if (status.status === "recovering") {
      return { 
        filter: "brightness(0) saturate(100%) invert(17%) sepia(97%) saturate(6510%) hue-rotate(357deg) brightness(94%) contrast(116%)",
        opacity: 1,
        zIndex: 10
      };
    }
    return { 
      filter: "brightness(0) saturate(100%) invert(84%) sepia(85%) saturate(1915%) hue-rotate(28deg) brightness(106%) contrast(106%)",
      opacity: 1,
      zIndex: 10
    };
  };

  return (
    <div className="bg-[#121212] rounded-2xl p-5 border border-zinc-800 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest text-[#c4c9ac] font-bold">Body Recovery Analysis</h3>
        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#ff4d4d] shadow-[0_0_5px_#ff4d4d]"></div> Recovering</div>
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#c3f400] shadow-[0_0_5px_#c3f400]"></div> Ready</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Visual Heatmap Area */}
        <div className="flex justify-center items-center gap-6">
          {/* Front View */}
          <div className="relative w-28 h-56 bg-zinc-900/40 rounded-xl border border-zinc-800/30 p-2">
            <span className="absolute top-1.5 left-2 text-[8px] text-zinc-600 font-black uppercase tracking-tighter">Front</span>
            <img src={BODY_FRONT} className="absolute inset-0 w-full h-full object-contain opacity-10" alt="Body Front" />
            
            <img src={muscleOverlaysFront.chest} style={getStatusStyle('chest')} className="absolute inset-0 w-full h-full object-contain transition-all duration-1000" alt="" />
            <img src={muscleOverlaysFront.shoulders} style={getStatusStyle('shoulders')} className="absolute inset-0 w-full h-full object-contain transition-all duration-1000" alt="" />
            <img src={muscleOverlaysFront.biceps} style={getStatusStyle('biceps')} className="absolute inset-0 w-full h-full object-contain transition-all duration-1000" alt="" />
            <img src={muscleOverlaysFront.quads} style={getStatusStyle('quads')} className="absolute inset-0 w-full h-full object-contain transition-all duration-1000" alt="" />
            <img src={muscleOverlaysFront.abs} style={getStatusStyle('abs')} className="absolute inset-0 w-full h-full object-contain transition-all duration-1000" alt="" />
          </div>

          {/* Back View */}
          <div className="relative w-28 h-56 bg-zinc-900/40 rounded-xl border border-zinc-800/30 p-2">
            <span className="absolute top-1.5 left-2 text-[8px] text-zinc-600 font-black uppercase tracking-tighter">Back</span>
            <img src={BODY_BACK} className="absolute inset-0 w-full h-full object-contain opacity-10" alt="Body Back" />
            
            <img src={muscleOverlaysBack.shoulders} style={getStatusStyle('shoulders')} className="absolute inset-0 w-full h-full object-contain transition-all duration-1000" alt="" />
            <img src={muscleOverlaysBack.back} style={getStatusStyle('back')} className="absolute inset-0 w-full h-full object-contain transition-all duration-1000" alt="" />
            <img src={muscleOverlaysBack.triceps} style={getStatusStyle('triceps')} className="absolute inset-0 w-full h-full object-contain transition-all duration-1000" alt="" />
            <img src={muscleOverlaysBack.glutes} style={getStatusStyle('glutes')} className="absolute inset-0 w-full h-full object-contain transition-all duration-1000" alt="" />
            <img src={muscleOverlaysBack.hamstrings} style={getStatusStyle('hamstrings')} className="absolute inset-0 w-full h-full object-contain transition-all duration-1000" alt="" />
            <img src={muscleOverlaysBack.calves} style={getStatusStyle('calves')} className="absolute inset-0 w-full h-full object-contain transition-all duration-1000" alt="" />
          </div>
        </div>

        {/* Elegant Status List Area */}
        <div className="flex-1 w-full grid grid-cols-2 gap-x-6 gap-y-3 border-l border-zinc-800/50 md:pl-8">
          {recoveryStatus.map(s => (
            <div key={s.group} className="flex flex-col gap-1 py-1 group transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-300 transition-colors">{s.group}</span>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                  s.status === 'recovering' 
                    ? "text-[#ff4d4d] border-[#ff4d4d]/20 bg-[#ff4d4d]/5" 
                    : s.status === 'ready'
                    ? "text-[#c3f400] border-[#c3f400]/20 bg-[#c3f400]/5"
                    : "text-zinc-600 border-zinc-800 bg-zinc-900/50"
                }`}>
                  {s.status === 'idle' ? 'No Data' : s.status}
                </span>
              </div>
              <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden flex">
                <div className={`h-full transition-all duration-1000 ${
                  s.status === 'recovering' ? "bg-[#ff4d4d] w-1/3" : s.status === 'ready' ? "bg-[#c3f400] w-full" : "bg-zinc-800 w-0"
                }`}></div>
              </div>
              {s.days >= 0 && (
                <span className="text-[10px] text-zinc-600 font-medium">
                  Last trained: {s.days}d ago
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <p className="text-[10px] text-zinc-500 text-center leading-tight pt-2 border-t border-zinc-800/30 font-medium italic">
        * Recovery logic based on 48-hour intensive hypertrophy window.
      </p>
    </div>
  );
}
