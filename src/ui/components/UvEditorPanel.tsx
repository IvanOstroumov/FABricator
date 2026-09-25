import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../store/useDocumentStore';
import { useSelectionStore } from '../store/useSelectionStore';
import { useViewStore } from '../store/useViewStore';

const VIEW_SIZE = 512;

/**
 * Shows the active object's UV layout against the checkerboard control
 * texture, for spotting stretching after an automatic unwrap (U-01,
 * U-06). Read-only for this pass — selecting/moving/scaling islands
 * (U-04) is a follow-up; see docs/STATUS.md.
 */
export function UvEditorPanel() {
  const { t } = useTranslation();
  const doc = useDocumentStore((s) => s.doc);
  useDocumentStore((s) => s.revision);
  const activeObject = useSelectionStore((s) => s.activeObject);
  const checkerboard = useViewStore((s) => s.checkerboard);
  const toggleCheckerboard = useViewStore((s) => s.toggleCheckerboard);

  const object = activeObject ? doc.objects.get(activeObject) : null;
  const mesh = object?.meshId ? doc.meshes.get(object.meshId) : null;

  const lines = useMemo(() => {
    if (!mesh) return [];
    const segments: [number, number, number, number][] = [];
    for (let f = 0; f < mesh.faceCount; f++) {
      const uvs = mesh.faceUvs(f);
      for (let i = 0; i < uvs.length; i++) {
        const a = uvs[i];
        const b = uvs[(i + 1) % uvs.length];
        segments.push([a[0], a[1], b[0], b[1]]);
      }
    }
    return segments;
  }, [mesh]);

  return (
    <div className="uv-editor">
      <div className="uv-editor__toolbar">
        <span>{t('panels.uvEditor')}</span>
        <button type="button" className={checkerboard ? 'active' : ''} onClick={toggleCheckerboard}>
          Scacchiera
        </button>
      </div>
      {!mesh ? (
        <p className="side-panel__placeholder">Seleziona un oggetto per vedere le sue UV.</p>
      ) : (
        <svg
          className={`uv-editor__canvas ${checkerboard ? 'uv-editor__canvas--checker' : ''}`}
          viewBox="0 0 1 1"
          width={VIEW_SIZE}
          height={VIEW_SIZE}
          preserveAspectRatio="xMidYMid meet"
        >
          <rect x={0} y={0} width={1} height={1} className="uv-editor__bounds" />
          {lines.map(([x1, y1, x2, y2], i) => (
            <line key={`${i}-${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={1 - y1} x2={x2} y2={1 - y2} className="uv-editor__edge" />
          ))}
        </svg>
      )}
    </div>
  );
}
