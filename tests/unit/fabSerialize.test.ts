import { describe, expect, it } from 'vitest';
import { Document, identityTransform, type SceneObject } from '../../src/core/Document';
import { createCube } from '../../src/geometry/ops/primitives';
import { createId } from '../../src/core/Id';
import { createDefaultMaterial } from '../../src/materials/types';
import { serializeDocumentToFab, deserializeFab, FabParseError } from '../../src/io/fab/serialize';
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';

function makeCubeObject(): SceneObject {
  return {
    id: createId(),
    name: 'Cubo',
    parentId: null,
    kind: 'mesh',
    transform: identityTransform(),
    pivot: { x: 0, y: 0, z: 0 },
    visible: true,
    locked: false,
    meshId: createId(),
    shading: { smooth: false, autoSmoothAngleDeg: 30 },
  };
}

describe('io/fab/serialize', () => {
  it('round-trips a document with a mesh, a material and an assigned face', () => {
    const doc = new Document();
    const object = makeCubeObject();
    const mesh = createCube();
    const material = createDefaultMaterial(createId(), 'Rosso');
    material.baseColor = [1, 0, 0, 1];
    mesh.materialSlots = [material.id];
    mesh.faceMaterial[0] = 0;

    doc.addObject(object, mesh);
    doc.addMaterial(material);

    const bytes = serializeDocumentToFab(doc);
    const reloaded = deserializeFab(bytes);

    expect(reloaded.objects.size).toBe(1);
    const reloadedObject = [...reloaded.objects.values()][0];
    expect(reloadedObject.name).toBe('Cubo');
    expect(reloadedObject.transform.position).toEqual(object.transform.position);

    const reloadedMesh = reloaded.meshes.get(reloadedObject.meshId!)!;
    expect(reloadedMesh.faceCount).toBe(mesh.faceCount);
    expect(reloadedMesh.vertexCount).toBe(mesh.vertexCount);
    expect(reloadedMesh.validate().valid).toBe(true);
    expect(reloadedMesh.materialSlots).toEqual([material.id]);
    expect(reloadedMesh.faceMaterial[0]).toBe(0);
    expect(reloadedMesh.faceMaterial[1]).toBe(-1);

    const reloadedMaterial = reloaded.materials.get(material.id)!;
    expect(reloadedMaterial.baseColor).toEqual([1, 0, 0, 1]);
  });

  it('preserves texture bytes and metadata', () => {
    const doc = new Document();
    const object = makeCubeObject();
    doc.addObject(object, createCube());
    const textureBytes = new Uint8Array([1, 2, 3, 4, 5]);
    doc.addTexture(
      { id: 'tex1', name: 'wood.png', fileName: 'textures/tex1.png', width: 2, height: 2, colorSpace: 'srgb' },
      textureBytes,
    );

    const bytes = serializeDocumentToFab(doc);
    const reloaded = deserializeFab(bytes);

    expect(reloaded.textures.get('tex1')?.name).toBe('wood.png');
    expect(reloaded.textureData.get('tex1')).toEqual(textureBytes);
  });

  it('rejects bytes that are not a zip archive', () => {
    expect(() => deserializeFab(new Uint8Array([1, 2, 3]))).toThrow(FabParseError);
  });

  it('rejects a .fab from a newer, incompatible schema version', () => {
    const doc = new Document();
    doc.addObject(makeCubeObject(), createCube());
    const bytes = serializeDocumentToFab(doc);

    // Tamper with the embedded manifest to simulate a future schema.
    const files = unzipSync(bytes);
    const manifest = JSON.parse(strFromU8(files['manifest.json']));
    manifest.schemaVersion = 999;
    files['manifest.json'] = strToU8(JSON.stringify(manifest));
    const tampered = zipSync(files);

    expect(() => deserializeFab(tampered)).toThrow(FabParseError);
  });
});
