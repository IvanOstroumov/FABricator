import { useEffect } from 'react';
import { useDocumentStore } from './store/useDocumentStore';
import { useSelectionStore } from './store/useSelectionStore';
import { RemoveObjectCommand } from '../commands/RemoveObjectCommand';
import { DuplicateObjectCommand } from '../commands/DuplicateObjectCommand';

/** Ctrl+Z/Y (undo/redo), Ctrl+D (duplicate), Canc (delete) — global, per M-12/M-13/M-05. */
export function useGlobalShortcuts(): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const { doc, undo, redo, run } = useDocumentStore.getState();
      const { activeObject, select } = useSelectionStore.getState();

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (activeObject) {
          const source = doc.objects.get(activeObject);
          if (source) {
            const cmd = new DuplicateObjectCommand(source, doc);
            run(cmd);
            select(cmd.createdId);
          }
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeObject) {
          const source = doc.objects.get(activeObject);
          if (source && !source.locked) {
            e.preventDefault();
            run(new RemoveObjectCommand(source));
            select(null);
          }
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
