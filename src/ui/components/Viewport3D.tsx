import { useEffect, useRef } from 'react';
import { Renderer } from '../../render/Renderer';
import { useViewStore, type QuickView } from '../store/useViewStore';
import { useDocumentStore } from '../store/useDocumentStore';
import { useSelectionStore, selectionModeFromKey } from '../store/useSelectionStore';
import { expandSelectionToVertices } from '../../selection/Selection';
import { ModalTransform, type ModalKind, type Axis } from '../../tools/ModalTransform';

const NUMPAD_VIEWS: Record<string, QuickView> = {
  Numpad1: 'front',
  Numpad3: 'side',
  Numpad7: 'top',
  Numpad5: 'perspective',
};

function buildModalTarget() {
  const { doc } = useDocumentStore.getState();
  const { mode, activeObject, editingObjectId, componentSelection } = useSelectionStore.getState();

  if (mode === 'object') {
    if (!activeObject) return null;
    const object = doc.objects.get(activeObject);
    if (!object) return null;
    return { objectId: activeObject, object };
  }

  if (!editingObjectId) return null;
  const object = doc.objects.get(editingObjectId);
  if (!object || !object.meshId) return null;
  const mesh = doc.meshes.get(object.meshId);
  if (!mesh) return null;
  const vertexIndices = expandSelectionToVertices(mesh, mode, componentSelection);
  if (vertexIndices.length === 0) return null;
  return { objectId: editingObjectId, object, mesh, meshId: object.meshId, vertexIndices };
}

export function Viewport3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const modalRef = useRef(new ModalTransform());
  const pointerRef = useRef({ x: 0, y: 0 });
  const shading = useViewStore((s) => s.shading);
  const setQuickView = useViewStore((s) => s.setQuickView);
  const setFps = useViewStore((s) => s.setFps);

  const doc = useDocumentStore((s) => s.doc);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const renderer = new Renderer(container, doc);
    rendererRef.current = renderer;
    renderer.onFrame(setFps);
    const modal = modalRef.current;

    const relativePointer = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const beginModal = (kind: ModalKind) => {
      const target = buildModalTarget();
      if (!target) return;
      const p = pointerRef.current;
      modal.begin(kind, target, p.x, p.y);
      useViewStore.getState().setTransformHint(modal.statusText);
    };

    const handlePointerDown = (e: PointerEvent) => {
      const p = relativePointer(e);
      pointerRef.current = p;

      if (modal.isActive) {
        if (e.button === 2) modal.cancel(doc);
        else if (e.button === 0) modal.confirm(doc, useDocumentStore.getState().run);
        useViewStore.getState().setTransformHint('');
        return;
      }

      if (e.button !== 0) return;
      const { mode, editingObjectId, select, toggleComponent, clearComponentSelection } =
        useSelectionStore.getState();
      const additive = e.shiftKey || e.ctrlKey || e.metaKey;

      if (mode === 'object') {
        const hitId = renderer.pickObject(p);
        select(hitId ?? null, additive);
      } else if (editingObjectId) {
        const result = renderer.pick(editingObjectId, mode, p);
        const index = result.vertex ?? result.edge ?? result.face;
        if (index !== undefined) toggleComponent(index, additive);
        else if (!additive) clearComponentSelection();
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const p = relativePointer(e);
      pointerRef.current = p;
      if (!modal.isActive) return;
      const { snapEnabled, gridSnap, rotationSnapDeg } = useViewStore.getState();
      modal.update(
        doc,
        renderer.cameraController.camera,
        renderer.cameraController,
        p.x,
        p.y,
        snapEnabled,
        gridSnap,
        rotationSnapDeg,
      );
      useViewStore.getState().setTransformHint(modal.statusText);
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (modal.isActive) e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (modal.isActive) {
        if (e.key === 'Enter') {
          modal.confirm(doc, useDocumentStore.getState().run);
          useViewStore.getState().setTransformHint('');
        } else if (e.key === 'Escape') {
          modal.cancel(doc);
          useViewStore.getState().setTransformHint('');
        } else if (e.key.toLowerCase() === 'x' || e.key.toLowerCase() === 'y' || e.key.toLowerCase() === 'z') {
          modal.setAxis(e.key.toLowerCase() as Axis);
          useViewStore.getState().setTransformHint(modal.statusText);
        } else if (/^[0-9.-]$/.test(e.key)) {
          modal.appendDigit(e.key);
          useViewStore.getState().setTransformHint(modal.statusText);
        } else if (e.key === 'Backspace') {
          modal.backspaceDigit();
          useViewStore.getState().setTransformHint(modal.statusText);
        }
        e.preventDefault();
        return;
      }

      const view = NUMPAD_VIEWS[e.code];
      if (view) {
        e.preventDefault();
        setQuickView(view);
        return;
      }
      if (e.code === 'KeyF') {
        renderer.cameraController.frameAll(2);
        renderer.requestRender();
        return;
      }
      if (e.code === 'KeyG' && !e.shiftKey) {
        beginModal('move');
        return;
      }
      if (e.code === 'KeyE' && e.shiftKey) {
        beginModal('rotate');
        return;
      }
      if (e.code === 'KeyR' && e.shiftKey) {
        beginModal('scale');
        return;
      }
      const modeFromKey = selectionModeFromKey(e.key);
      if (modeFromKey) {
        useSelectionStore.getState().setMode(modeFromKey);
      }
    };

    container.tabIndex = 0;
    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('contextmenu', handleContextMenu);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('contextmenu', handleContextMenu);
      renderer.dispose();
      rendererRef.current = null;
    };
    // Recreating the whole renderer when `doc` changes identity (i.e. a
    // project was just opened) is heavy-handed but simple and correct;
    // it only happens on File > Open, not on ordinary edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  useEffect(() => {
    rendererRef.current?.setShading(shading);
  }, [shading]);

  const quickView = useViewStore((s) => s.quickView);
  useEffect(() => {
    rendererRef.current?.setQuickView(quickView);
  }, [quickView]);

  const selectMode = useSelectionStore((s) => s.mode);
  const editingObjectId = useSelectionStore((s) => s.editingObjectId);
  const componentSelection = useSelectionStore((s) => s.componentSelection);
  const revision = useDocumentStore((s) => s.revision);
  useEffect(() => {
    rendererRef.current?.setComponentSelection(editingObjectId, selectMode, componentSelection);
    // `revision` isn't read directly, but a mesh/position edit should refresh the overlay too.
    void revision;
  }, [selectMode, editingObjectId, componentSelection, revision]);

  return <div ref={containerRef} className="viewport3d" />;
}
