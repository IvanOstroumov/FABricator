import { useEffect } from 'react';
import { useDocumentStore } from './store/useDocumentStore';
import { useSelectionStore } from './store/useSelectionStore';
import { useViewStore } from './store/useViewStore';
import { RemoveObjectCommand } from '../commands/RemoveObjectCommand';
import { DuplicateObjectCommand } from '../commands/DuplicateObjectCommand';
import { commitMeshOp } from '../commands/meshOps';
import { extrudeFaces } from '../geometry/ops/extrude';
import { insetFaces } from '../geometry/ops/inset';
import { deleteFaces, deleteEdges, deleteVertices } from '../geometry/ops/deleteElements';
import { loopCut } from '../geometry/ops/loopCut';
import { bevelEdge } from '../geometry/ops/bevel';

function showError(message: string): void {
  useViewStore.getState().setTransformHint(`Errore: ${message}`);
  setTimeout(() => {
    if (useViewStore.getState().transformHint === `Errore: ${message}`) {
      useViewStore.getState().setTransformHint('');
    }
  }, 3000);
}

/** Ctrl+Z/Y (undo/redo), Ctrl+D (duplica), Canc (cancella), Ctrl+E (estrudi), I (inset) — globali, per M-05/M-06/M-12/M-13. */
export function useGlobalShortcuts(): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const { doc, undo, redo, run } = useDocumentStore.getState();
      const { activeObject, select, mode, editingObjectId, componentSelection, clearComponentSelection } =
        useSelectionStore.getState();

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (activeObject) {
          const source = doc.objects.get(activeObject);
          if (source) {
            const cmd = new DuplicateObjectCommand(source, doc);
            run(cmd);
            select(cmd.createdId);
          }
        }
        return;
      }

      const editingObject = editingObjectId ? doc.objects.get(editingObjectId) : null;
      const editingMesh = editingObject?.meshId ? doc.meshes.get(editingObject.meshId) : null;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        if (mode === 'face' && editingObject?.meshId && editingMesh && componentSelection.size > 0) {
          e.preventDefault();
          const { mesh: after, capFaces } = extrudeFaces(editingMesh, [...componentSelection]);
          const result = commitMeshOp(run, 'Estrudi', editingObject.meshId, editingMesh, after);
          if (result.ok) useSelectionStore.getState().setComponentSelection(new Set(capFaces));
          else showError(result.error);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        if (mode === 'edge' && editingObject?.meshId && editingMesh && componentSelection.size === 1) {
          e.preventDefault();
          const [startEdge] = componentSelection;
          const loop = editingMesh.edgeLoop(startEdge);
          const after = loopCut(editingMesh, loop, 0.5);
          const result = commitMeshOp(run, 'Loop cut', editingObject.meshId, editingMesh, after);
          if (result.ok) clearComponentSelection();
          else showError(result.error);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        if (mode === 'edge' && editingObject?.meshId && editingMesh && componentSelection.size === 1) {
          e.preventDefault();
          const [selectedEdge] = componentSelection;
          try {
            const after = bevelEdge(editingMesh, selectedEdge, 0.1);
            const result = commitMeshOp(run, 'Bevel', editingObject.meshId, editingMesh, after);
            if (result.ok) clearComponentSelection();
            else showError(result.error);
          } catch (err) {
            showError(err instanceof Error ? err.message : 'Bevel non riuscito');
          }
        }
        return;
      }

      if (e.key.toLowerCase() === 'i' && !e.ctrlKey && !e.metaKey) {
        if (mode === 'face' && editingObject?.meshId && editingMesh && componentSelection.size > 0) {
          e.preventDefault();
          const { mesh: after, capFaces } = insetFaces(editingMesh, [...componentSelection]);
          const result = commitMeshOp(run, 'Inset', editingObject.meshId, editingMesh, after);
          if (result.ok) useSelectionStore.getState().setComponentSelection(new Set(capFaces));
          else showError(result.error);
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (mode !== 'object' && editingObject?.meshId && editingMesh) {
          if (componentSelection.size === 0) return;
          e.preventDefault();
          let after: ReturnType<typeof deleteFaces>;
          if (mode === 'face') after = deleteFaces(editingMesh, componentSelection);
          else if (mode === 'edge') after = deleteEdges(editingMesh, componentSelection);
          else after = deleteVertices(editingMesh, componentSelection);
          const result = commitMeshOp(run, 'Cancella', editingObject.meshId, editingMesh, after);
          if (result.ok) clearComponentSelection();
          else showError(result.error);
          return;
        }
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
