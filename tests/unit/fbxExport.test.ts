import { describe, expect, it, beforeAll } from 'vitest';
import assimpFactory from 'assimpjs';
import { Document, identityTransform, type SceneObject } from '../../src/core/Document';
import { createCube, createCylinder } from '../../src/geometry/ops/primitives';
import { createDefaultMaterial } from '../../src/materials/types';
import { createId } from '../../src/core/Id';
import { exportToFbx } from '../../src/io/fbx/export';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ajs: any;

beforeAll(async () => {
  ajs = await assimpFactory();
});

function makeMeshObject(name: string, meshId: string): SceneObject {
  return {
    id: createId(),
    name,
    parentId: null,
    kind: 'mesh',
    transform: identityTransform(),
    pivot: { x: 0, y: 0, z: 0 },
    visible: true,
    locked: false,
    meshId,
    shading: { smooth: false, autoSmoothAngleDeg: 30 },
  };
}

function importFbx(bytes: Uint8Array) {
  const fileList = new ajs.FileList();
  fileList.AddFile('scene.fbx', bytes);
  const result = ajs.ConvertFileList(fileList, 'assjson');
  if (!result.IsSuccess() || result.FileCount() === 0) {
    throw new Error(`assimp import failed: ${result.GetErrorCode()}`);
  }
  const jsonText = new TextDecoder().decode(result.GetFile(0).GetContent());
  return JSON.parse(jsonText);
}

describe('io/fbx export (validated by re-importing with assimp)', () => {
  it('exports a cube that assimp can read back with the right vertex/face counts', () => {
    const doc = new Document();
    const meshId = createId();
    const mesh = createCube();
    doc.addObject(makeMeshObject('Cubo', meshId), mesh);

    const objectId = [...doc.objects.keys()][0];
    const bytes = exportToFbx(doc, [objectId], { scope: 'scene', triangulate: false, pivotMode: 'keep' });
    expect(bytes.length).toBeGreaterThan(27); // at least the header

    const parsed = importFbx(bytes);
    expect(parsed.meshes).toHaveLength(1);
    // assimp splits a vertex per unique (position, normal, UV) corner,
    // same as Unity does at a hard edge — since we export flat per-face
    // normals, that's one vertex instance per face-corner (24 for a cube:
    // 6 faces x 4 corners), not the 8 shared positions our own topology
    // keeps internally.
    expect(parsed.meshes[0].vertices.length / 3).toBe(24);
    // assimp always triangulates on import into its JSON, regardless of
    // our export's own triangulate option: 6 quads -> 12 triangles.
    expect(parsed.meshes[0].faces).toHaveLength(12);
    expect(parsed.meshes[0].faces.every((f: number[]) => f.length === 3)).toBe(true);
  });

  it('exports a cube with an assigned material that assimp reads back', () => {
    const doc = new Document();
    const meshId = createId();
    const mesh = createCube();
    const material = createDefaultMaterial(createId(), 'Rosso');
    material.baseColor = [1, 0, 0, 1];
    mesh.materialSlots = [material.id];
    for (let f = 0; f < mesh.faceCount; f++) mesh.faceMaterial[f] = 0;
    doc.addMaterial(material);
    doc.addObject(makeMeshObject('Cubo', meshId), mesh);

    const objectId = [...doc.objects.keys()][0];
    const bytes = exportToFbx(doc, [objectId], { scope: 'scene', triangulate: true, pivotMode: 'keep' });
    const parsed = importFbx(bytes);

    expect(parsed.materials).toHaveLength(1);
    expect(parsed.meshes[0].faces.every((f: number[]) => f.length === 3)).toBe(true);
  });

  it('exports a cylinder (n-gon caps) without producing degenerate geometry', () => {
    const doc = new Document();
    const meshId = createId();
    const mesh = createCylinder({ radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 10 });
    doc.addObject(makeMeshObject('Cilindro', meshId), mesh);

    const objectId = [...doc.objects.keys()][0];
    const bytes = exportToFbx(doc, [objectId], { scope: 'scene', triangulate: false, pivotMode: 'center' });
    const parsed = importFbx(bytes);

    // 10 side quads + top + bottom n-gon caps, all triangulated by assimp
    // on import: 10*2 + (10-2) + (10-2) = 36 triangles, none degenerate.
    const expectedTriangles = 10 * 2 + (10 - 2) * 2;
    expect(parsed.meshes[0].faces).toHaveLength(expectedTriangles);
    expect(parsed.meshes[0].faces.every((f: number[]) => f.length === 3)).toBe(true);
  });
});
