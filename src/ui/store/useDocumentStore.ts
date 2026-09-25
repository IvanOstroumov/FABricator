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
}

const doc = new Document();
const commandStack = new CommandStack(doc);

export const useDocumentStore = create<DocumentState>((set, get) => {
  doc.events.on('revisionChanged', ({ revision }) => set({ revision, dirty: true }));

  return {
    doc,
    commandStack,
    revision: 0,
    filePath: null,
    dirty: false,
    run: (cmd) => get().commandStack.run(cmd),
    undo: () => get().commandStack.undo(),
    redo: () => get().commandStack.redo(),
  };
});
