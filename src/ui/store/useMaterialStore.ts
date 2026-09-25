import { create } from 'zustand';
import type { Id } from '../../core/Id';

interface MaterialUiState {
  activeMaterialId: Id | null;
  setActiveMaterial: (id: Id | null) => void;
}

export const useMaterialStore = create<MaterialUiState>((set) => ({
  activeMaterialId: null,
  setActiveMaterial: (id) => set({ activeMaterialId: id }),
}));
