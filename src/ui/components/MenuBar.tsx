import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../store/useDocumentStore';
import { useSelectionStore } from '../store/useSelectionStore';
import { createPrimitiveCommand, type PrimitiveKind } from '../../commands/factories';

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
  const select = useSelectionStore((s) => s.select);

  const addPrimitive = (kind: PrimitiveKind) => {
    const existingNames = [...doc.objects.values()].map((o) => o.name);
    const cmd = createPrimitiveCommand(kind, existingNames);
    run(cmd);
    select(cmd.createdObjectId);
    setOpenMenu(null);
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
