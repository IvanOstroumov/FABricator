import { create } from 'zustand';

export type ToolId = 'select' | 'move' | 'rotate' | 'scale';

interface ToolState {
  activeTool: ToolId;
  setActiveTool: (id: ToolId) => void;
}

export const useToolStore = create<ToolState>((set) => ({
  activeTool: 'select',
  setActiveTool: (id) => set({ activeTool: id }),
}));
