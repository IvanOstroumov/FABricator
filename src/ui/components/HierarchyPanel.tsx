import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../store/useDocumentStore';
import { useSelectionStore } from '../store/useSelectionStore';
import { PropertyCommand } from '../../commands/PropertyCommand';
import { GroupObjectsCommand } from '../../commands/GroupObjectsCommand';
import type { Id } from '../../core/Id';

function HierarchyRow({ id, depth }: { id: Id; depth: number }) {
  const doc = useDocumentStore((s) => s.doc);
  const run = useDocumentStore((s) => s.run);
  useDocumentStore((s) => s.revision);
  const selected = useSelectionStore((s) => s.selected);
  const select = useSelectionStore((s) => s.select);
  const [editing, setEditing] = useState(false);

  const object = doc.objects.get(id);
  if (!object) return null;
  const isSelected = selected.has(id);

  const commitRename = (name: string) => {
    setEditing(false);
    const trimmed = name.trim();
    if (trimmed && trimmed !== object.name) {
      run(new PropertyCommand('Rinomina', id, { name: trimmed }));
    }
  };

  return (
    <>
      <div
        className={`hierarchy-row ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={(e) => select(id, e.shiftKey || e.ctrlKey || e.metaKey)}
      >
        {editing ? (
          <input
            autoFocus
            defaultValue={object.name}
            onBlur={(e) => commitRename(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename((e.target as HTMLInputElement).value);
              if (e.key === 'Escape') setEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="hierarchy-row__name" onDoubleClick={() => setEditing(true)}>
            {object.name}
          </span>
        )}
        <div className="hierarchy-row__actions">
          <button
            type="button"
            title="Nascondi"
            className={object.visible ? '' : 'active'}
            onClick={(e) => {
              e.stopPropagation();
              run(new PropertyCommand('Visibilità', id, { visible: !object.visible }));
            }}
          >
            {object.visible ? '👁' : '—'}
          </button>
          <button
            type="button"
            title="Blocca"
            className={object.locked ? 'active' : ''}
            onClick={(e) => {
              e.stopPropagation();
              run(new PropertyCommand('Blocco', id, { locked: !object.locked }));
            }}
          >
            {object.locked ? '🔒' : '🔓'}
          </button>
        </div>
      </div>
      {doc.children(id).map((child) => (
        <HierarchyRow key={child.id} id={child.id} depth={depth + 1} />
      ))}
    </>
  );
}

export function HierarchyPanel() {
  const { t } = useTranslation();
  const doc = useDocumentStore((s) => s.doc);
  const run = useDocumentStore((s) => s.run);
  useDocumentStore((s) => s.revision);
  const selected = useSelectionStore((s) => s.selected);

  const roots = doc.children(null);

  return (
    <div className="hierarchy-panel">
      <div className="hierarchy-panel__toolbar">
        <button
          type="button"
          disabled={selected.size < 2}
          onClick={() => run(new GroupObjectsCommand([...selected]))}
        >
          {t('panels.group', { defaultValue: 'Raggruppa' })}
        </button>
      </div>
      <div className="hierarchy-panel__tree">
        {roots.length === 0 && <p className="side-panel__placeholder">—</p>}
        {roots.map((o) => (
          <HierarchyRow key={o.id} id={o.id} depth={0} />
        ))}
      </div>
    </div>
  );
}
