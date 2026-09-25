import { create } from 'zustand';
import type { ExportReport } from '../../io/fbx/export';

interface PendingExport {
  report: ExportReport;
  objectIds: string[];
  scope: 'selection' | 'scene';
}

interface ExportState {
  pending: PendingExport | null;
  requestExport: (pending: PendingExport) => void;
  clearExport: () => void;
}

/** Shared between MenuBar and the global keyboard shortcut so both routes to FBX export show the same E-05 confirmation dialog before writing a file. */
export const useExportStore = create<ExportState>((set) => ({
  pending: null,
  requestExport: (pending) => set({ pending }),
  clearExport: () => set({ pending: null }),
}));
