import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../store/useDocumentStore';
import { useSelectionStore } from '../store/useSelectionStore';
import { useMaterialStore } from '../store/useMaterialStore';
import { createId } from '../../core/Id';
import { createDefaultMaterial, type MaterialDef } from '../../materials/types';
import { hexToLinearRgb, linearRgbToHex } from '../../materials/colorUtils';
import { AddMaterialCommand, MaterialPropertyCommand } from '../../commands/MaterialCommand';
import { AssignMaterialCommand } from '../../commands/AssignMaterialCommand';
import type { Document } from '../../core/Document';

/** One thumbnail in the project's texture library (C-06): click to apply it as the active material's base color map. */
function TextureThumb({ doc, textureId, onPick }: { doc: Document; textureId: string; onPick: (id: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const bytes = doc.textureData.get(textureId);
    if (!bytes) return;
    const objectUrl = URL.createObjectURL(new Blob([new Uint8Array(bytes)]));
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [doc, textureId]);

  const texture = doc.textures.get(textureId);
  if (!url || !texture) return null;
  return (
    <button type="button" className="texture-thumb" title={texture.name} onClick={() => onPick(textureId)}>
      <img src={url} alt={texture.name} />
    </button>
  );
}

export function MaterialsPanel() {
  const { t } = useTranslation();
  const doc = useDocumentStore((s) => s.doc);
  const run = useDocumentStore((s) => s.run);
  useDocumentStore((s) => s.revision);
  const activeObject = useSelectionStore((s) => s.activeObject);
  const selectMode = useSelectionStore((s) => s.mode);
  const editingObjectId = useSelectionStore((s) => s.editingObjectId);
  const componentSelection = useSelectionStore((s) => s.componentSelection);
  const activeMaterialId = useMaterialStore((s) => s.activeMaterialId);
  const setActiveMaterial = useMaterialStore((s) => s.setActiveMaterial);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const materials = [...doc.materials.values()];
  const activeMaterial = activeMaterialId ? doc.materials.get(activeMaterialId) : null;

  const createMaterial = () => {
    const cmd = new AddMaterialCommand(createDefaultMaterial(createId(), `Materiale.${materials.length + 1}`));
    run(cmd);
    setActiveMaterial(cmd.createdId);
  };

  const updateActive = (fields: Partial<MaterialDef>, label: string, mergeable = false) => {
    if (!activeMaterialId) return;
    run(new MaterialPropertyCommand(label, activeMaterialId, fields, mergeable));
  };

  const assignToSelection = () => {
    if (!activeMaterialId) return;
    const targetObjectId = selectMode === 'object' ? activeObject : editingObjectId;
    if (!targetObjectId) return;
    const object = doc.objects.get(targetObjectId);
    if (!object?.meshId) return;
    const faceIndices = selectMode === 'face' && componentSelection.size > 0 ? [...componentSelection] : null;
    run(new AssignMaterialCommand(object.meshId, activeMaterialId, faceIndices));
  };

  const importTexture = async (file: File) => {
    if (!activeMaterialId) return;
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const bitmap = await createImageBitmap(new Blob([bytes]));
    const textureId = createId();
    doc.addTexture(
      {
        id: textureId,
        name: file.name,
        fileName: `textures/${textureId}.png`,
        width: bitmap.width,
        height: bitmap.height,
        colorSpace: 'srgb',
      },
      bytes,
    );
    updateActive({ maps: { ...activeMaterial?.maps, baseColor: textureId } }, 'Texture');
  };

  return (
    <div className="side-panel__section materials-panel">
      <h3>{t('panels.materials')}</h3>

      <div className="materials-palette">
        {materials.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`materials-swatch ${m.id === activeMaterialId ? 'active' : ''}`}
            style={{ background: linearRgbToHex([m.baseColor[0], m.baseColor[1], m.baseColor[2]]) }}
            title={m.name}
            onClick={() => setActiveMaterial(m.id)}
          />
        ))}
        <button type="button" className="materials-swatch materials-swatch--add" onClick={createMaterial} title="Nuovo materiale">
          +
        </button>
      </div>

      {activeMaterial && (
        <div className="materials-editor">
          <label className="properties-field">
            <span>Colore</span>
            <input
              type="color"
              value={linearRgbToHex([activeMaterial.baseColor[0], activeMaterial.baseColor[1], activeMaterial.baseColor[2]])}
              onChange={(e) => {
                const [r, g, b] = hexToLinearRgb(e.target.value);
                updateActive({ baseColor: [r, g, b, activeMaterial.baseColor[3]] }, 'Colore', true);
              }}
            />
          </label>
          <label className="properties-field">
            <span>Metallic</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={activeMaterial.metallic}
              onChange={(e) => updateActive({ metallic: parseFloat(e.target.value) }, 'Metallic', true)}
            />
          </label>
          <label className="properties-field">
            <span>Roughness</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={activeMaterial.roughness}
              onChange={(e) => updateActive({ roughness: parseFloat(e.target.value) }, 'Roughness', true)}
            />
          </label>

          <div className="properties-group">
            <span className="properties-group__label">Tiling texture</span>
            <input
              type="number"
              step={0.1}
              value={activeMaterial.uvTransform.tiling.x}
              onChange={(e) =>
                updateActive(
                  { uvTransform: { ...activeMaterial.uvTransform, tiling: { ...activeMaterial.uvTransform.tiling, x: parseFloat(e.target.value) || 0 } } },
                  'Tiling',
                )
              }
            />
            <input
              type="number"
              step={0.1}
              value={activeMaterial.uvTransform.tiling.y}
              onChange={(e) =>
                updateActive(
                  { uvTransform: { ...activeMaterial.uvTransform, tiling: { ...activeMaterial.uvTransform.tiling, y: parseFloat(e.target.value) || 0 } } },
                  'Tiling',
                )
              }
            />
          </div>

          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Importa texture
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importTexture(file);
              e.target.value = '';
            }}
          />

          <button type="button" onClick={assignToSelection} disabled={!activeObject && !editingObjectId}>
            Assegna alla selezione (M)
          </button>

          {doc.textures.size > 0 && (
            <div className="texture-library">
              <span className="properties-group__label">Libreria texture</span>
              <div className="texture-library__grid">
                {[...doc.textures.keys()].map((textureId) => (
                  <TextureThumb
                    key={textureId}
                    doc={doc}
                    textureId={textureId}
                    onPick={(id) => updateActive({ maps: { ...activeMaterial.maps, baseColor: id } }, 'Texture')}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {materials.length === 0 && <p className="side-panel__placeholder">—</p>}
    </div>
  );
}
