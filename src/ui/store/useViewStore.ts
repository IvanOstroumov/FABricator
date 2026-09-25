import { create } from 'zustand';

export type ShadingMode = 'solid' | 'wireframe' | 'solid-wireframe' | 'texture';
export type QuickView = 'front' | 'side' | 'top' | 'perspective';

interface ViewState {
  shading: ShadingMode;
  quickView: QuickView;
  orthographic: boolean;
  snapEnabled: boolean;
  gridSnap: number;
  rotationSnapDeg: number;
  checkerboard: boolean;
  fps: number;
  transformHint: string;
  setTransformHint: (hint: string) => void;
  setShading: (mode: ShadingMode) => void;
  setQuickView: (view: QuickView) => void;
  toggleOrthographic: () => void;
  toggleSnap: () => void;
  toggleCheckerboard: () => void;
  setFps: (fps: number) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  shading: 'solid',
  quickView: 'perspective',
  orthographic: false,
  snapEnabled: false,
  gridSnap: 0.25,
  rotationSnapDeg: 15,
  checkerboard: false,
  fps: 0,
  transformHint: '',
  setTransformHint: (hint) => set({ transformHint: hint }),
  setShading: (mode) => set({ shading: mode }),
  setQuickView: (view) =>
    set({ quickView: view, orthographic: view !== 'perspective' }),
  toggleOrthographic: () => set((s) => ({ orthographic: !s.orthographic })),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  toggleCheckerboard: () => set((s) => ({ checkerboard: !s.checkerboard })),
  setFps: (fps) => set({ fps }),
}));
