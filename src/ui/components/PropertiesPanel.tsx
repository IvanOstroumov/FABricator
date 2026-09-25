import * as THREE from 'three';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../store/useDocumentStore';
import { useSelectionStore } from '../store/useSelectionStore';
import { PropertyCommand } from '../../commands/PropertyCommand';
import { ApplyMirrorCommand } from '../../commands/ApplyMirrorCommand';
import { applyMirror, type MirrorAxis } from '../../geometry/ops/mirror';
import type { Transform } from '../../core/Document';

const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;

function quatToEulerDeg(q: Transform['rotation']): [number, number, number] {
  const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w), 'XYZ');
  return [euler.x * RAD2DEG, euler.y * RAD2DEG, euler.z * RAD2DEG];
}

function eulerDegToQuat(x: number, y: number, z: number): Transform['rotation'] {
  const q = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(x * DEG2RAD, y * DEG2RAD, z * DEG2RAD, 'XYZ'),
  );
  return { x: q.x, y: q.y, z: q.z, w: q.w };
}

function NumberField({ label, value, onCommit }: { label: string; value: number; onCommit: (v: number) => void }) {
  return (
    <label className="properties-field">
      <span>{label}</span>
      <input
        type="number"
        step="0.1"
        defaultValue={Number(value.toFixed(4))}
        key={value}
        onBlur={(e) => {
          const parsed = parseFloat(e.target.value);
          if (!Number.isNaN(parsed) && parsed !== value) onCommit(parsed);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
    </label>
  );
}

export function PropertiesPanel() {
  const { t } = useTranslation();
  const doc = useDocumentStore((s) => s.doc);
  const run = useDocumentStore((s) => s.run);
  useDocumentStore((s) => s.revision);
  const activeObject = useSelectionStore((s) => s.activeObject);

  const object = activeObject ? doc.objects.get(activeObject) : null;
  if (!object) {
    return (
      <div className="side-panel__section">
        <h3>{t('panels.properties')}</h3>
        <p className="side-panel__placeholder">—</p>
      </div>
    );
  }

  const [rx, ry, rz] = quatToEulerDeg(object.transform.rotation);

  const setPosition = (axis: 'x' | 'y' | 'z', v: number) => {
    const transform = structuredClone(object.transform);
    transform.position[axis] = v;
    run(new PropertyCommand('Posizione', object.id, { transform }));
  };
  const setScale = (axis: 'x' | 'y' | 'z', v: number) => {
    const transform = structuredClone(object.transform);
    transform.scale[axis] = v;
    run(new PropertyCommand('Scala', object.id, { transform }));
  };
  const setRotationDeg = (x: number, y: number, z: number) => {
    const transform = structuredClone(object.transform);
    transform.rotation = eulerDegToQuat(x, y, z);
    run(new PropertyCommand('Rotazione', object.id, { transform }));
  };

  const mesh = object.meshId ? doc.meshes.get(object.meshId) : null;
  const toggleMirror = (enabled: boolean) => {
    run(
      new PropertyCommand('Specchio', object.id, {
        mirror: enabled ? { axis: 'x', merge: true, mergeDistance: 0.001 } : undefined,
      }),
    );
  };
  const setMirrorField = (fields: Partial<NonNullable<typeof object.mirror>>) => {
    if (!object.mirror) return;
    run(new PropertyCommand('Specchio', object.id, { mirror: { ...object.mirror, ...fields } }));
  };
  const applyMirrorNow = () => {
    if (!object.mirror || !object.meshId || !mesh) return;
    const after = applyMirror(mesh, object.mirror.axis, object.mirror.merge, object.mirror.mergeDistance);
    run(new ApplyMirrorCommand(object.id, object.meshId, mesh, after, object.mirror));
  };

  return (
    <div className="side-panel__section">
      <h3>{t('panels.properties')}</h3>
      <div className="properties-group">
        <span className="properties-group__label">Posizione (m)</span>
        <NumberField label="X" value={object.transform.position.x} onCommit={(v) => setPosition('x', v)} />
        <NumberField label="Y" value={object.transform.position.y} onCommit={(v) => setPosition('y', v)} />
        <NumberField label="Z" value={object.transform.position.z} onCommit={(v) => setPosition('z', v)} />
      </div>
      <div className="properties-group">
        <span className="properties-group__label">Rotazione (°)</span>
        <NumberField label="X" value={rx} onCommit={(v) => setRotationDeg(v, ry, rz)} />
        <NumberField label="Y" value={ry} onCommit={(v) => setRotationDeg(rx, v, rz)} />
        <NumberField label="Z" value={rz} onCommit={(v) => setRotationDeg(rx, ry, v)} />
      </div>
      <div className="properties-group">
        <span className="properties-group__label">Scala</span>
        <NumberField label="X" value={object.transform.scale.x} onCommit={(v) => setScale('x', v)} />
        <NumberField label="Y" value={object.transform.scale.y} onCommit={(v) => setScale('y', v)} />
        <NumberField label="Z" value={object.transform.scale.z} onCommit={(v) => setScale('z', v)} />
      </div>
      {object.kind === 'mesh' && (
        <div className="properties-group properties-group--mirror">
          <span className="properties-group__label">Specchio</span>
          <label className="properties-field">
            <input type="checkbox" checked={!!object.mirror} onChange={(e) => toggleMirror(e.target.checked)} />
            <span>Attivo</span>
          </label>
          {object.mirror && (
            <>
              <label className="properties-field">
                <span>Asse</span>
                <select
                  value={object.mirror.axis}
                  onChange={(e) => setMirrorField({ axis: e.target.value as MirrorAxis })}
                >
                  <option value="x">X</option>
                  <option value="y">Y</option>
                  <option value="z">Z</option>
                </select>
              </label>
              <label className="properties-field">
                <input
                  type="checkbox"
                  checked={object.mirror.merge}
                  onChange={(e) => setMirrorField({ merge: e.target.checked })}
                />
                <span>Salda al centro</span>
              </label>
              <button type="button" onClick={applyMirrorNow}>
                Applica
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
