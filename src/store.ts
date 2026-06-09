import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SyncAction {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body: any;
  timestamp: number;
  label?: string; // friendly description of the action for the UI
}

interface RestTimerState {
  seconds: number;
  remaining: number;
  running: boolean;
  endTime: number | null; // timestamp when timer will end
  completed: boolean; // flag indicating the timer just naturally completed
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
  clearRestTimerCompleted: () => void;

  // Offline Sync Queue (persisted)
  syncQueue: SyncAction[];
  isOffline: boolean;
  isSyncing: boolean;
  enqueueSyncAction: (url: string, method: 'POST' | 'PUT' | 'DELETE', body: any, label?: string) => void;
  syncOfflineQueue: (onSyncSuccess?: () => void) => Promise<void>;
  setIsOffline: (isOffline: boolean) => void;
}

export const useForgeStore = create<ForgeState>()(
  persist(
    (set, get) => ({
      activeProfileId: null,
      setActiveProfileId: (id) => set({ activeProfileId: id }),

      restTimer: { seconds: 90, remaining: 0, running: false, endTime: null, completed: false },

      setRestTimerSeconds: (s) => set((state) => ({
        restTimer: { ...state.restTimer, seconds: s, remaining: state.restTimer.running ? state.restTimer.remaining : 0, completed: false }
      })),

      startRestTimer: () => set((state) => ({
        restTimer: {
          ...state.restTimer,
          remaining: state.restTimer.seconds,
          running: true,
          endTime: Date.now() + state.restTimer.seconds * 1000,
          completed: false
        }
      })),

      toggleRestTimer: () => set((state) => {
        const rt = state.restTimer;
        if (rt.running) {
          return { restTimer: { ...rt, running: false, endTime: null, completed: false } };
        } else {
          return { restTimer: { ...rt, running: true, endTime: Date.now() + rt.remaining * 1000, completed: false } };
        }
      }),

      resetRestTimer: () => set((state) => ({
        restTimer: { ...state.restTimer, remaining: 0, running: false, endTime: null, completed: false }
      })),

      tickRestTimer: () => set((state) => {
        const rt = state.restTimer;
        if (!rt.running || !rt.endTime) return state;
        const remaining = Math.max(0, Math.ceil((rt.endTime - Date.now()) / 1000));
        if (remaining <= 0) {
          return { restTimer: { ...rt, remaining: 0, running: false, endTime: null, completed: true } };
        }
        return { restTimer: { ...rt, remaining } };
      }),

      clearRestTimerCompleted: () => set((state) => ({
        restTimer: { ...state.restTimer, completed: false }
      })),

      // Offline Sync Queue
      syncQueue: [],
      isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
      isSyncing: false,

      enqueueSyncAction: (url, method, body, label) => set((state) => {
        const newAction: SyncAction = {
          id: `sa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          url,
          method,
          body,
          timestamp: Date.now(),
          label
        };
        return { syncQueue: [...state.syncQueue, newAction] };
      }),

      syncOfflineQueue: async (onSyncSuccess) => {
        const { syncQueue, isSyncing } = get();
        if (syncQueue.length === 0 || isSyncing) return;

        set({ isSyncing: true });

        const remainingQueue = [...syncQueue];
        let hasFailed = false;

        for (const action of syncQueue) {
          try {
            const res = await fetch(action.url, {
              method: action.method,
              headers: { "Content-Type": "application/json" },
              body: action.body ? JSON.stringify(action.body) : undefined
            });
            if (res.ok) {
              remainingQueue.shift();
            } else {
              hasFailed = true;
              break; // maintain strict order of operations on failure
            }
          } catch (err) {
            hasFailed = true;
            break; // offline/failed
          }
        }

        set({ syncQueue: remainingQueue, isSyncing: false });

        if (remainingQueue.length === 0 && !hasFailed) {
          if (onSyncSuccess) onSyncSuccess();
        }
      },

      setIsOffline: (isOffline) => set({ isOffline }),
    }),
    {
      name: 'forge-storage',
      partialize: (state) => ({
        activeProfileId: state.activeProfileId,
        restTimer: state.restTimer,
        syncQueue: state.syncQueue,
      }),
    }
  )
);
