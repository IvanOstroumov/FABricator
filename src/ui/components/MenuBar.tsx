import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../store/useDocumentStore';
import { useSelectionStore } from '../store/useSelectionStore';
import { createPrimitiveCommand, type PrimitiveKind } from '../../commands/factories';
import { saveFabFile, openFabFile } from '../../io/fab/io';
import { saveFbxFile } from '../../io/fbx/io';
import { buildExportReport } from '../../io/fbx/export';
import { useViewStore } from '../store/useViewStore';
import { commitMeshOp } from '../../commands/meshOps';
import { mergeAtCenter, mergeAtFirst, mergeByDistance } from '../../geometry/ops/merge';
import { fillHole } from '../../geometry/ops/fill';
import { bridgeLoops } from '../../geometry/ops/bridge';
import { planarUnwrap, cylindricalUnwrap } from '../../geometry/ops/unwrap';
import { UvEditCommand } from '../../commands/UvEditCommand';
import { ToggleSeamCommand } from '../../commands/ToggleSeamCommand';

function showMenuError(message: string): void {
  useViewStore.getState().setTransformHint(`Errore: ${message}`);
  setTimeout(() => {
    if (useViewStore.getState().transformHint === `Errore: ${message}`) useViewStore.getState().setTransformHint('');
  }, 3000);
}

const MENUS = ['file', 'edit', 'add', 'select', 'uv', 'view', 'help'] as const;
const PRIMITIVES: { kind: PrimitiveKind; label: string }[] = [
  { kind: 'cube', label: 'Cubo' },
  { kind: 'cylinder', label: 'Cilindro' },
  { kind: 'sphere', label: 'Sfera' },
  { kind: 'plane', label: 'Piano' },
  { kind: 'cone', label: 'Cono' },
  { kind: 'torus', label: 'Toro' },
];

export function MenuBar() {
  const { t } = useTranslation();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const doc = useDocumentStore((s) => s.doc);
  const run = useDocumentStore((s) => s.run);
  const markSaved = useDocumentStore((s) => s.markSaved);
  const loadDocument = useDocumentStore((s) => s.loadDocument);
  const select = useSelectionStore((s) => s.select);
  const activeObject = useSelectionStore((s) => s.activeObject);
  const mode = useSelectionStore((s) => s.mode);
  const editingObjectId = useSelectionStore((s) => s.editingObjectId);
  const componentSelection = useSelectionStore((s) => s.componentSelection);
  const clearComponentSelection = useSelectionStore((s) => s.clearComponentSelection);

  const editingObject = editingObjectId ? doc.objects.get(editingObjectId) : null;
  const editingMesh = editingObject?.meshId ? doc.meshes.get(editingObject.meshId) : null;

  const runVertexMerge = (mode2: 'center' | 'first') => {
    setOpenMenu(null);
    if (mode !== 'vertex' || !editingObject?.meshId || !editingMesh || componentSelection.size < 2) return;
    const verts = [...componentSelection];
    const after = mode2 === 'center' ? mergeAtCenter(editingMesh, verts) : mergeAtFirst(editingMesh, verts);
    const result = commitMeshOp(run, 'Unisci vertici', editingObject.meshId, editingMesh, after);
    if (result.ok) clearComponentSelection();
    else showMenuError(result.error);
  };

  const runMergeByDistance = () => {
    setOpenMenu(null);
    if (!editingObject?.meshId || !editingMesh) return;
    const after = mergeByDistance(editingMesh, useViewStore.getState().gridSnap * 0.1 || 0.001);
    const result = commitMeshOp(run, 'Unisci per distanza', editingObject.meshId, editingMesh, after);
    if (!result.ok) showMenuError(result.error);
  };

  const runFillHole = () => {
    setOpenMenu(null);
    if (mode !== 'edge' || !editingObject?.meshId || !editingMesh || componentSelection.size !== 1) return;
    try {
      const [edgeId] = componentSelection;
      const after = fillHole(editingMesh, edgeId);
      const result = commitMeshOp(run, 'Riempi buco', editingObject.meshId, editingMesh, after);
      if (result.ok) clearComponentSelection();
      else showMenuError(result.error);
    } catch (err) {
      showMenuError(err instanceof Error ? err.message : 'Riempimento non riuscito');
    }
  };

  const runBridge = () => {
    setOpenMenu(null);
    if (mode !== 'edge' || !editingObject?.meshId || !editingMesh || componentSelection.size !== 2) return;
    try {
      const [edgeA, edgeB] = componentSelection;
      const after = bridgeLoops(editingMesh, edgeA, edgeB);
      const result = commitMeshOp(run, 'Bridge', editingObject.meshId, editingMesh, after);
      if (result.ok) clearComponentSelection();
      else showMenuError(result.error);
    } catch (err) {
      showMenuError(err instanceof Error ? err.message : 'Bridge non riuscito');
    }
  };

  const runQuickUnwrap = (kind: 'planar' | 'cylindrical') => {
    setOpenMenu(null);
    const targetObjectId = mode === 'object' ? activeObject : editingObjectId;
    const targetObject = targetObjectId ? doc.objects.get(targetObjectId) : null;
    const targetMesh = targetObject?.meshId ? doc.meshes.get(targetObject.meshId) : null;
    if (!targetObject?.meshId || !targetMesh) return;
    const faceIndices = mode === 'face' && componentSelection.size > 0 ? [...componentSelection] : undefined;
    if (kind === 'planar' && (!faceIndices || faceIndices.length === 0)) {
      showMenuError('Seleziona almeno una faccia per la proiezione planare');
      return;
    }
    const after =
      kind === 'planar' ? planarUnwrap(targetMesh, faceIndices!) : cylindricalUnwrap(targetMesh, faceIndices);
    run(new UvEditCommand(kind === 'planar' ? 'Unwrap planare' : 'Unwrap cilindrico', targetObject.meshId, targetMesh.heUv, after));
  };

  const runToggleSeam = (mark: boolean) => {
    setOpenMenu(null);
    if (mode !== 'edge' || !editingObject?.meshId || componentSelection.size === 0) return;
    run(new ToggleSeamCommand(editingObject.meshId, [...componentSelection], mark));
  };

  const addPrimitive = (kind: PrimitiveKind) => {
    const existingNames = [...doc.objects.values()].map((o) => o.name);
    const cmd = createPrimitiveCommand(kind, existingNames);
    run(cmd);
    select(cmd.createdObjectId);
    setOpenMenu(null);
  };

  const handleSave = async () => {
    setOpenMenu(null);
    const saved = await saveFabFile(doc);
    if (saved) markSaved('progetto.fab');
  };

  const handleExportFbx = async () => {
    setOpenMenu(null);
    const objectIds = activeObject ? [activeObject] : [...doc.objects.keys()];
    const report = buildExportReport(doc, objectIds);
    if (report.warnings.length > 0) {
      useViewStore.getState().setTransformHint(`Errore: ${report.warnings[0]}`);
    }
    await saveFbxFile(doc, objectIds, {
      scope: activeObject ? 'selection' : 'scene',
      triangulate: false,
      pivotMode: 'keep',
    });
  };

  const handleOpen = async () => {
    setOpenMenu(null);
    try {
      const opened = await openFabFile();
      if (opened) {
        loadDocument(opened, 'progetto.fab');
        select(null);
      }
    } catch (err) {
      useViewStore.getState().setTransformHint(`Errore: ${err instanceof Error ? err.message : 'apertura fallita'}`);
    }
  };

  return (
    <div className="menu-bar">
      {MENUS.map((menu) => (
        <div key={menu} className="menu-bar__menu">
          <button
            type="button"
            className="menu-bar__item"
            onClick={() => setOpenMenu((cur) => (cur === menu ? null : menu))}
          >
            {t(`menu.${menu}`)}
          </button>
          {openMenu === menu && menu === 'file' && (
            <div className="menu-bar__dropdown">
              <button type="button" onClick={() => void handleOpen()}>
                Apri…
              </button>
              <button type="button" onClick={() => void handleSave()}>
                Salva (Ctrl+S)
              </button>
              <button type="button" onClick={() => void handleExportFbx()}>
                Esporta FBX… (Ctrl+Shift+E)
              </button>
            </div>
          )}
          {openMenu === menu && menu === 'edit' && (
            <div className="menu-bar__dropdown">
              <button type="button" disabled={mode !== 'vertex' || componentSelection.size < 2} onClick={() => runVertexMerge('center')}>
                Unisci al centro
              </button>
              <button type="button" disabled={mode !== 'vertex' || componentSelection.size < 2} onClick={() => runVertexMerge('first')}>
                Unisci al primo
              </button>
              <button type="button" disabled={!editingObject} onClick={runMergeByDistance}>
                Unisci per distanza
              </button>
              <button type="button" disabled={mode !== 'edge' || componentSelection.size !== 1} onClick={runFillHole}>
                Riempi buco
              </button>
              <button type="button" disabled={mode !== 'edge' || componentSelection.size !== 2} onClick={runBridge}>
                Bridge
              </button>
            </div>
          )}
          {openMenu === menu && menu === 'uv' && (
            <div className="menu-bar__dropdown">
              <button type="button" disabled={!editingObject && !activeObject} onClick={() => runQuickUnwrap('planar')}>
                Proiezione planare
              </button>
              <button type="button" disabled={!editingObject && !activeObject} onClick={() => runQuickUnwrap('cylindrical')}>
                Proiezione cilindrica
              </button>
              <button type="button" disabled={mode !== 'edge' || componentSelection.size === 0} onClick={() => runToggleSeam(true)}>
                Marca seam
              </button>
              <button type="button" disabled={mode !== 'edge' || componentSelection.size === 0} onClick={() => runToggleSeam(false)}>
                Rimuovi seam
              </button>
            </div>
          )}
          {openMenu === menu && menu === 'add' && (
            <div className="menu-bar__dropdown">
              {PRIMITIVES.map((p) => (
                <button key={p.kind} type="button" onClick={() => addPrimitive(p.kind)}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
