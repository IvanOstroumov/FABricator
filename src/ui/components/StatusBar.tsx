import { useTranslation } from 'react-i18next';
import { useViewStore } from '../store/useViewStore';
import { useDocumentStore } from '../store/useDocumentStore';
import { useSelectionStore } from '../store/useSelectionStore';

function countTriangles(mesh: { faceCount: number; faceVertices: (f: number) => number[] }): number {
  let total = 0;
  for (let f = 0; f < mesh.faceCount; f++) {
    total += Math.max(0, mesh.faceVertices(f).length - 2);
  }
  return total;
}

export function StatusBar() {
  const { t } = useTranslation();
  const fps = useViewStore((s) => s.fps);
  const transformHint = useViewStore((s) => s.transformHint);
  const doc = useDocumentStore((s) => s.doc);
  useDocumentStore((s) => s.revision);
  const mode = useSelectionStore((s) => s.mode);
  const selectedObjects = useSelectionStore((s) => s.selected);
  const componentSelection = useSelectionStore((s) => s.componentSelection);

  const triangleCount = [...doc.meshes.values()].reduce((sum, mesh) => sum + countTriangles(mesh), 0);
  const selectionCount = mode === 'object' ? selectedObjects.size : componentSelection.size;

  return (
    <div className="status-bar">
      <span className="status-bar__hint">{transformHint || t('status.hint')}</span>
      <span className="status-bar__spacer" />
      <span>
        {t('status.triangles')}: {triangleCount}
      </span>
      <span>
        {t('status.selection')}: {selectionCount}
      </span>
      <span>FPS: {fps}</span>
    </div>
  );
}
