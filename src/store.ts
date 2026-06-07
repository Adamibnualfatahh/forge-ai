import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Profile } from './types';

interface RestTimerState {
  seconds: number;
  remaining: number;
  running: boolean;
  endTime: number | null; // timestamp when timer will end
}

interface ForgeState {
  activeProfileId: string | null;
  setActiveProfileId: (id: string | null) => void;

  // Rest timer (persisted)
  restTimer: RestTimerState;
  setRestTimerSeconds: (s: number) => void;
  startRestTimer: () => void;
  toggleRestTimer: () => void;
  resetRestTimer: () => void;
  tickRestTimer: () => void;
}

export const useForgeStore = create<ForgeState>()(
  persist(
    (set, get) => ({
      activeProfileId: null,
      setActiveProfileId: (id) => set({ activeProfileId: id }),

      restTimer: { seconds: 90, remaining: 0, running: false, endTime: null },

      setRestTimerSeconds: (s) => set((state) => ({
        restTimer: { ...state.restTimer, seconds: s, remaining: state.restTimer.running ? state.restTimer.remaining : 0 }
      })),

      startRestTimer: () => set((state) => ({
        restTimer: {
          ...state.restTimer,
          remaining: state.restTimer.seconds,
          running: true,
          endTime: Date.now() + state.restTimer.seconds * 1000
        }
      })),

      toggleRestTimer: () => set((state) => {
        const rt = state.restTimer;
        if (rt.running) {
          // pause - store remaining, clear endTime
          return { restTimer: { ...rt, running: false, endTime: null } };
        } else {
          // resume - recalculate endTime from remaining
          return { restTimer: { ...rt, running: true, endTime: Date.now() + rt.remaining * 1000 } };
        }
      }),

      resetRestTimer: () => set((state) => ({
        restTimer: { ...state.restTimer, remaining: 0, running: false, endTime: null }
      })),

      tickRestTimer: () => set((state) => {
        const rt = state.restTimer;
        if (!rt.running || !rt.endTime) return state;
        const remaining = Math.max(0, Math.ceil((rt.endTime - Date.now()) / 1000));
        if (remaining <= 0) {
          return { restTimer: { ...rt, remaining: 0, running: false, endTime: null } };
        }
        return { restTimer: { ...rt, remaining } };
      }),
    }),
    {
      name: 'forge-storage',
    }
  )
);
