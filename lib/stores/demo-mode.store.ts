import { create } from 'zustand';

interface DemoModeState {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
}

export const useDemoModeStore = create<DemoModeState>((set) => ({
  isDemoMode: true,
  toggleDemoMode: () => set((state) => ({ isDemoMode: !state.isDemoMode })),
}));
