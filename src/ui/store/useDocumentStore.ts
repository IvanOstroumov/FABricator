import { create } from 'zustand';
import { Document } from '../../core/Document';
import { CommandStack } from '../../commands/CommandStack';
import type { Command } from '../../commands/Command';

interface DocumentState {
  doc: Document;
  commandStack: CommandStack;
  revision: number;
  filePath: string | null;
  dirty: boolean;
  run: (cmd: Command) => void;
  undo: () => void;
  redo: () => void;
  /** Replaces the whole document (File > Open) and marks it clean/untitled unless a path is given. */
  loadDocument: (doc: Document, filePath?: string | null) => void;
  markSaved: (filePath: string) => void;
}

function wireRevisionListener(doc: Document, set: (partial: Partial<DocumentState>) => void): void {
  doc.events.on('revisionChanged', ({ revision }) => set({ revision, dirty: true }));
}

const initialDoc = new Document();

export const useDocumentStore = create<DocumentState>((set, get) => {
  wireRevisionListener(initialDoc, set);

  return {
    doc: initialDoc,
    commandStack: new CommandStack(initialDoc),
    revision: 0,
    filePath: null,
    dirty: false,
    run: (cmd) => get().commandStack.run(cmd),
    undo: () => get().commandStack.undo(),
    redo: () => get().commandStack.redo(),
    loadDocument: (doc, filePath = null) => {
      wireRevisionListener(doc, set);
      set({ doc, commandStack: new CommandStack(doc), revision: 0, filePath, dirty: false });
    },
    markSaved: (filePath) => set({ filePath, dirty: false }),
  };
});
