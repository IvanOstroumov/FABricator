import { create } from 'zustand';
import type { Id } from '../../core/Id';
import type { SelectMode } from '../../selection/Selection';

interface SelectionState {
  mode: SelectMode;
  selected: Set<Id>;
  activeObject: Id | null;
  /** The single object being edited at vertex/edge/face level (null in object mode). */
  editingObjectId: Id | null;
  componentSelection: Set<number>;
  select: (id: Id | null, additive?: boolean) => void;
  clear: () => void;
  setMode: (mode: SelectMode) => void;
  toggleComponent: (index: number, additive: boolean) => void;
  setComponentSelection: (indices: Set<number>) => void;
  clearComponentSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  mode: 'object',
  selected: new Set(),
  activeObject: null,
  editingObjectId: null,
  componentSelection: new Set(),
  select: (id, additive = false) =>
    set((state) => {
      if (id === null) return { selected: new Set(), activeObject: null };
      const next = additive ? new Set(state.selected) : new Set<Id>();
      next.add(id);
      return { selected: next, activeObject: id };
    }),
  clear: () => set({ selected: new Set(), activeObject: null, editingObjectId: null, componentSelection: new Set() }),
  setMode: (mode) =>
    set((state) => {
      if (mode === 'object') {
        return { mode, editingObjectId: null, componentSelection: new Set() };
      }
      if (!state.activeObject) return { mode: state.mode };
      return { mode, editingObjectId: state.activeObject, componentSelection: new Set() };
    }),
  toggleComponent: (index, additive) =>
    set((state) => {
      const next = additive ? new Set(state.componentSelection) : new Set<number>();
      if (additive && state.componentSelection.has(index)) next.delete(index);
      else next.add(index);
      return { componentSelection: next };
    }),
  setComponentSelection: (indices) => set({ componentSelection: indices }),
  clearComponentSelection: () => set({ componentSelection: new Set() }),
}));

export function selectionModeFromKey(key: string): SelectMode | null {
  switch (key) {
    case '1':
      return 'object';
    case '2':
      return 'vertex';
    case '3':
      return 'edge';
    case '4':
      return 'face';
    default:
      return null;
  }
}

