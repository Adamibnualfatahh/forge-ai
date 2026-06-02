import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Profile } from './types';

interface ForgeState {
  activeProfileId: string | null;
  setActiveProfileId: (id: string | null) => void;
}

export const useForgeStore = create<ForgeState>()(
  persist(
    (set) => ({
      activeProfileId: null,
      setActiveProfileId: (id) => set({ activeProfileId: id }),
    }),
    {
      name: 'forge-storage',
    }
  )
);
