import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Activity, Bell, BellOff } from "lucide-react";
import { Profile } from "../../types";

interface ProfileEditModalProps {
  show: boolean;
  profile: Profile | null;
  onClose: () => void;
  
  name: string;
  setName: (val: string) => void;
  height: string;
  setHeight: (val: string) => void;
  weight: string;
  setWeight: (val: string) => void;
  target: string;
  setTarget: (val: string) => void;
  
  formError: string;
  onSave: () => void;
  
  onOpenAppleHealth: () => void;
  
  pushEnabled: boolean;
  pushBusy: boolean;
  pushSupported: boolean;
  onTogglePush: () => void;
  
  confirmDelete: boolean;
  setConfirmDelete: (val: boolean) => void;
  onDelete: () => void;
}

export default function ProfileEditModal({
  show,
  profile,
  onClose,
  name, setName,
  height, setHeight,
  weight, setWeight,
  target, setTarget,
  formError,
  onSave,
  onOpenAppleHealth,
  pushEnabled, pushBusy, pushSupported, onTogglePush,
  confirmDelete, setConfirmDelete, onDelete
}: ProfileEditModalProps) {
  if (!profile) return null;

  return (
    <AnimatePresence>
      {show && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm" 
          onClick={() => { onClose(); setConfirmDelete(false); }}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-[#201f1f] border border-[#444933] rounded-2xl w-full max-w-sm p-5 relative"
          >
            <div className="absolute top-0 left-0 w-full h-[3px] bg-[#c3f400]"></div>
            <button 
              onClick={() => { onClose(); setConfirmDelete(false); }} 
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-display text-xl font-bold text-white dark-text mb-4">Edit Profil</h3>
            <div className="space-y-3">
              <input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Nama"
                className="w-full bg-[#131313] dark-input border border-zinc-700 rounded-xl h-11 px-3 text-white text-sm" 
              />
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="number" 
                  step="any" 
                  value={height} 
                  onChange={e => setHeight(e.target.value)} 
                  placeholder="Tinggi (cm)"
                  className="bg-[#131313] dark-input border border-zinc-700 rounded-xl h-11 px-3 text-white text-sm" 
                />
                <input 
                  type="number" 
                  step="any" 
                  value={weight} 
                  onChange={e => setWeight(e.target.value)} 
                  placeholder="Berat (kg)"
                  className="bg-[#131313] dark-input border border-zinc-700 rounded-xl h-11 px-3 text-white text-sm" 
                />
              </div>
              <input 
                type="number" 
                step="any" 
                value={target} 
                onChange={e => setTarget(e.target.value)} 
                placeholder="Target Berat (kg)"
                className="w-full bg-[#131313] dark-input border border-zinc-700 rounded-xl h-11 px-3 text-white text-sm" 
              />
              
              {formError && <p className="field-error-msg text-center">{formError}</p>}
              
              <button 
                onClick={onSave}
                className="w-full bg-[#c3f400] text-black font-display font-bold py-3 rounded-xl"
              >
                Simpan Perubahan
              </button>
              
              <button 
                onClick={() => { onClose(); onOpenAppleHealth(); }}
                className="w-full flex items-center justify-center gap-2 border border-zinc-700 text-zinc-300 hover:text-[#c3f400] hover:border-[#c3f400]/50 font-semibold py-3 rounded-xl text-xs uppercase tracking-wider transition-colors"
              >
                <Activity className="w-4 h-4" />
                Kelola Apple Health
              </button>
              
              {/* Push notification toggle */}
              <button 
                onClick={onTogglePush} 
                disabled={pushBusy || !pushSupported}
                className={`w-full flex items-center justify-between gap-2 border rounded-xl px-4 py-3 transition-colors ${
                  pushEnabled ? 'border-[#c3f400]/50 text-[#c3f400]' : 'border-zinc-700 text-zinc-300'
                } ${(pushBusy || !pushSupported) ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#c3f400]/50'}`}
              >
                <span className="flex items-center gap-2">
                  {pushEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  <span className="text-left">
                    <span className="block text-xs uppercase tracking-wider font-semibold">Pengingat Latihan</span>
                    <span className="block text-[10px] text-zinc-500 normal-case tracking-normal">
                      {!pushSupported ? 'Tidak didukung di perangkat ini'
                        : pushBusy ? 'Memproses...'
                        : pushEnabled ? 'Aktif — notifikasi saat lama tak latihan' : 'Nonaktif'}
                    </span>
                  </span>
                </span>
                <span className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${pushEnabled ? 'bg-[#c3f400]' : 'bg-zinc-700'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-black transition-transform ${pushEnabled ? 'translate-x-4' : ''}`}></span>
                </span>
              </button>
              
              <div className="border-t border-zinc-800 pt-3">
                {!confirmDelete ? (
                  <button 
                    onClick={() => setConfirmDelete(true)}
                    className="w-full text-red-400 text-xs font-semibold py-2 border border-red-900/50 rounded-xl hover:bg-red-950/30"
                  >
                    Hapus Profil Ini
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      onClick={onDelete} 
                      className="flex-1 bg-red-600 text-white font-bold py-2 rounded-xl text-xs"
                    >
                      Ya, Hapus
                    </button>
                    <button 
                      onClick={() => setConfirmDelete(false)} 
                      className="flex-1 bg-zinc-800 text-zinc-300 py-2 rounded-xl text-xs"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
