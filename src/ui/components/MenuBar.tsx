import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../store/useDocumentStore';
import { useSelectionStore } from '../store/useSelectionStore';
import { createPrimitiveCommand, type PrimitiveKind } from '../../commands/factories';
import { saveFabFile, openFabFile } from '../../io/fab/io';
import { saveFbxFile } from '../../io/fbx/io';
import { buildExportReport } from '../../io/fbx/export';
import { useViewStore } from '../store/useViewStore';

const MENUS = ['file', 'edit', 'add', 'select', 'view', 'help'] as const;
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
