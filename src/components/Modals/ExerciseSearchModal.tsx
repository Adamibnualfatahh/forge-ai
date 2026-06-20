import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Plus } from "lucide-react";
import { 
  filterExercises, 
  getMovementTypes, 
  getEquipmentTypes, 
  MOVEMENT_TYPE_LABELS, 
  EQUIPMENT_LABELS, 
  MovementType, 
  EquipmentType 
} from "../../exerciseDb";
import MuscleIcon from "../../MuscleIcon";

interface ExerciseSearchModalProps {
  show: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: any) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterCategory: string;
  setFilterCategory: (category: string) => void;
  filterMovement: MovementType | "all";
  setFilterMovement: (movement: MovementType | "all") => void;
  filterEquipment: EquipmentType | "all";
  setFilterEquipment: (equipment: EquipmentType | "all") => void;
}

export default function ExerciseSearchModal({
  show,
  onClose,
  onSelectExercise,
  searchQuery,
  setSearchQuery,
  filterCategory,
  setFilterCategory,
  filterMovement,
  setFilterMovement,
  filterEquipment,
  setFilterEquipment,
}: ExerciseSearchModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <div 
          className="fixed inset-0 bg-black/80 flex flex-col items-center justify-end p-0 z-50 backdrop-blur-sm"
          onClick={() => { onClose(); setSearchQuery(""); }}
        >
          <motion.div 
            initial={{ y: '100%' }} 
            animate={{ y: 0 }} 
            exit={{ y: '100%' }} 
            transition={{ type: 'spring', damping: 25 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 300 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(event, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
                setSearchQuery("");
              }
            }}
            className="bg-[#121212] border-t border-zinc-800 rounded-t-2xl w-full max-w-[430px] max-h-[80vh] flex flex-col cursor-grab active:cursor-grabbing"
            onClick={e => e.stopPropagation()}
          >
            {/* Drag indicator */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-zinc-700 rounded-full"></div>
            </div>

            <div className="p-4 pt-2 border-b border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  placeholder="Cari exercise..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  autoFocus
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl h-10 px-3 text-sm text-white" 
                />
                <button 
                  onClick={() => { 
                    onClose(); 
                    setSearchQuery(""); 
                    setFilterCategory("all"); 
                    setFilterMovement("all"); 
                    setFilterEquipment("all"); 
                  }} 
                  className="text-zinc-400 p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                <select 
                  value={filterCategory} 
                  onChange={e => setFilterCategory(e.target.value)} 
                  className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg px-2 py-1.5 outline-none"
                >
                  <option value="all">Semua Otot</option>
                  {['chest','back','shoulders','arms','legs','core','cardio'].map(c => 
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  )}
                </select>
                <select 
                  value={filterMovement} 
                  onChange={e => setFilterMovement(e.target.value as any)} 
                  className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg px-2 py-1.5 outline-none"
                >
                  <option value="all">Semua Tipe</option>
                  {getMovementTypes().map(m => <option key={m} value={m}>{MOVEMENT_TYPE_LABELS[m]}</option>)}
                </select>
                <select 
                  value={filterEquipment} 
                  onChange={e => setFilterEquipment(e.target.value as any)} 
                  className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg px-2 py-1.5 outline-none"
                >
                  <option value="all">Semua Alat</option>
                  {getEquipmentTypes().map(e => <option key={e} value={e}>{EQUIPMENT_LABELS[e]}</option>)}
                </select>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {filterExercises({
                query: searchQuery,
                category: filterCategory,
                movementType: filterMovement === "all" ? undefined : filterMovement as MovementType,
                equipment: filterEquipment === "all" ? undefined : filterEquipment as EquipmentType
              }).map(ex => (
                <button 
                  key={ex.name} 
                  onClick={() => {
                    onSelectExercise(ex);
                    onClose(); 
                    setSearchQuery("");
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-900 transition-colors text-left"
                >
                  <MuscleIcon name={ex.name} size={40} />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-white block">{ex.name}</span>
                    <span className="text-[12px] text-zinc-500">{ex.muscle}</span>
                  </div>
                  <Plus className="w-4 h-4 text-zinc-600" />
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
