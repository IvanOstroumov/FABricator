import { create } from 'zustand';
import type { Id } from '../../core/Id';

// Vertex/edge/face selection modes land with M-02 in Phase 3; Phase 2 only
// needs whole-object selection for the hierarchy/properties panels.
interface SelectionState {
  selected: Set<Id>;
  activeObject: Id | null;
  select: (id: Id | null, additive?: boolean) => void;
  clear: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selected: new Set(),
  activeObject: null,
  select: (id, additive = false) =>
    set((state) => {
      if (id === null) return { selected: new Set(), activeObject: null };
      const next = additive ? new Set(state.selected) : new Set<Id>();
      next.add(id);
      return { selected: next, activeObject: id };
    }),
  clear: () => set({ selected: new Set(), activeObject: null }),
}));
