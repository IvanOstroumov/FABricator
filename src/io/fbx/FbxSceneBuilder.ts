import * as THREE from 'three';
import type { Document, SceneObject } from '../../core/Document';
import type { EditableMesh } from '../../geometry/EditableMesh';
import type { MaterialDef } from '../../materials/types';
import type { FbxNode, FbxProp } from './FbxBinaryWriter';

export interface FbxExportOptions {
  scope: 'selection' | 'scene';
  triangulate: boolean;
  pivotMode: 'keep' | 'center' | 'bottom';
}

const UNIT_SCALE_FACTOR = 100; // FBX counts in centimeters; 1 FABricator unit = 1 m = 100 "FBX units"

function s(name: string, value: string): FbxNode {
  return { name, props: [{ t: 'S', v: value }], children: [] };
}
function i32(name: string, value: number): FbxNode {
  return { name, props: [{ t: 'I', v: value }], children: [] };
}

function property70(name: string, type: string, label: string, ...values: FbxProp[]): FbxNode {
  return { name: 'P', props: [{ t: 'S', v: name }, { t: 'S', v: type }, { t: 'S', v: label }, { t: 'S', v: '' }, ...values], children: [] };
}

function quatToEulerDeg(q: SceneObject['transform']['rotation']): [number, number, number] {
  const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w), 'XYZ');
  const toDeg = 180 / Math.PI;
  return [euler.x * toDeg, euler.y * toDeg, euler.z * toDeg];
}

function globalSettingsNode(): FbxNode {
  return {
    name: 'GlobalSettings',
    props: [],
    children: [
      { name: 'Version', props: [{ t: 'I', v: 1000 }], children: [] },
      {
        name: 'Properties70',
        props: [],
        children: [
          property70('UpAxis', 'int', '', { t: 'I', v: 1 }),
          property70('UpAxisSign', 'int', '', { t: 'I', v: 1 }),
          property70('FrontAxis', 'int', '', { t: 'I', v: 2 }),
          property70('FrontAxisSign', 'int', '', { t: 'I', v: 1 }),
          property70('CoordAxis', 'int', '', { t: 'I', v: 0 }),
          property70('CoordAxisSign', 'int', '', { t: 'I', v: 1 }),
          property70('UnitScaleFactor', 'double', '', { t: 'D', v: UNIT_SCALE_FACTOR }),
        ],
      },
    ],
  };
}

function headerExtensionNode(): FbxNode {
  return {
    name: 'FBXHeaderExtension',
    props: [],
    children: [
      { name: 'FBXHeaderVersion', props: [{ t: 'I', v: 1003 }], children: [] },
      { name: 'FBXVersion', props: [{ t: 'I', v: 7400 }], children: [] },
      { name: 'Creator', props: [{ t: 'S', v: 'FABricator' }], children: [] },
    ],
  };
}

interface BuiltMeshData {
  positions: Float64Array;
  polygonVertexIndex: Int32Array;
  normals: Float64Array; // ByPolygonVertex, one per corner
  uvs: Float64Array; // ByPolygonVertex, one per corner
  materialIndexPerPolygon: Int32Array; // ByPolygon
}

function pivotOffset(mesh: EditableMesh, mode: FbxExportOptions['pivotMode']): { x: number; y: number; z: number } {
  if (mode === 'keep' || mesh.vertexCount === 0) return { x: 0, y: 0, z: 0 };
  let minY = Infinity;
  const sum = { x: 0, y: 0, z: 0 };
  for (let v = 0; v < mesh.vertexCount; v++) {
    const p = mesh.vertexPosition(v);
    sum.x += p.x;
    sum.y += p.y;
    sum.z += p.z;
    if (p.y < minY) minY = p.y;
  }
  const centroid = { x: sum.x / mesh.vertexCount, y: sum.y / mesh.vertexCount, z: sum.z / mesh.vertexCount };
  if (mode === 'center') return centroid;
  return { x: centroid.x, y: minY, z: centroid.z }; // 'bottom'
}

function triangulateFan(n: number): number[][] {
  const triangles: number[][] = [];
  for (let i = 1; i < n - 1; i++) triangles.push([0, i, i + 1]);
  return triangles;
}

function buildMeshData(mesh: EditableMesh, options: FbxExportOptions): { data: BuiltMeshData; pivot: { x: number; y: number; z: number } } {
  const pivot = pivotOffset(mesh, options.pivotMode);
  const positions = new Float64Array(mesh.vertexCount * 3);
  for (let v = 0; v < mesh.vertexCount; v++) {
    const p = mesh.vertexPosition(v);
    positions[v * 3] = (p.x - pivot.x) * UNIT_SCALE_FACTOR;
    positions[v * 3 + 1] = (p.y - pivot.y) * UNIT_SCALE_FACTOR;
    positions[v * 3 + 2] = (p.z - pivot.z) * UNIT_SCALE_FACTOR;
  }

  const polygonVertexIndex: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const materialIndexPerPolygon: number[] = [];

  for (let f = 0; f < mesh.faceCount; f++) {
    const verts = mesh.faceVertices(f);
    const faceUvs = mesh.faceUvs(f);
    const normal = mesh.faceNormal(f);
    const polygons = options.triangulate ? triangulateFan(verts.length) : [verts.map((_, idx) => idx)];

    for (const polygon of polygons) {
      materialIndexPerPolygon.push(Math.max(0, mesh.faceMaterial[f]));
      for (let k = 0; k < polygon.length; k++) {
        const cornerIndex = polygon[k];
        const isLast = k === polygon.length - 1;
        const vertexIndex = verts[cornerIndex];
        polygonVertexIndex.push(isLast ? -(vertexIndex + 1) : vertexIndex);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(faceUvs[cornerIndex][0], faceUvs[cornerIndex][1]);
      }
    }
  }

  return {
    pivot,
    data: {
      positions,
      polygonVertexIndex: Int32Array.from(polygonVertexIndex),
      normals: Float64Array.from(normals),
      uvs: Float64Array.from(uvs),
      materialIndexPerPolygon: Int32Array.from(materialIndexPerPolygon),
    },
  };
}

function geometryNode(id: bigint, name: string, data: BuiltMeshData): FbxNode {
  return {
    name: 'Geometry',
    props: [{ t: 'L', v: id }, { t: 'S', v: `${name}\u0000\u0001Geometry` }, { t: 'S', v: 'Mesh' }],
    children: [
      { name: 'Vertices', props: [{ t: 'd', v: data.positions }], children: [] },
      { name: 'PolygonVertexIndex', props: [{ t: 'i', v: data.polygonVertexIndex }], children: [] },
      { name: 'GeometryVersion', props: [{ t: 'I', v: 124 }], children: [] },
      {
        name: 'LayerElementNormal',
        props: [{ t: 'I', v: 0 }],
        children: [
          { name: 'Version', props: [{ t: 'I', v: 101 }], children: [] },
          { name: 'MappingInformationType', props: [{ t: 'S', v: 'ByPolygonVertex' }], children: [] },
          { name: 'ReferenceInformationType', props: [{ t: 'S', v: 'Direct' }], children: [] },
          { name: 'Normals', props: [{ t: 'd', v: data.normals }], children: [] },
        ],
      },
      {
        name: 'LayerElementUV',
        props: [{ t: 'I', v: 0 }],
        children: [
          { name: 'Version', props: [{ t: 'I', v: 101 }], children: [] },
          { name: 'MappingInformationType', props: [{ t: 'S', v: 'ByPolygonVertex' }], children: [] },
          { name: 'ReferenceInformationType', props: [{ t: 'S', v: 'Direct' }], children: [] },
          { name: 'UV', props: [{ t: 'd', v: data.uvs }], children: [] },
        ],
      },
      {
        name: 'LayerElementMaterial',
        props: [{ t: 'I', v: 0 }],
        children: [
          { name: 'Version', props: [{ t: 'I', v: 101 }], children: [] },
          { name: 'MappingInformationType', props: [{ t: 'S', v: 'ByPolygon' }], children: [] },
          { name: 'ReferenceInformationType', props: [{ t: 'S', v: 'IndexToDirect' }], children: [] },
          { name: 'Materials', props: [{ t: 'i', v: data.materialIndexPerPolygon }], children: [] },
        ],
      },
      {
        name: 'Layer',
        props: [{ t: 'I', v: 0 }],
        children: [
          { name: 'Version', props: [{ t: 'I', v: 100 }], children: [] },
          { name: 'LayerElement', props: [], children: [s('Type', 'LayerElementNormal'), i32('TypedIndex', 0)] },
          { name: 'LayerElement', props: [], children: [s('Type', 'LayerElementUV'), i32('TypedIndex', 0)] },
          { name: 'LayerElement', props: [], children: [s('Type', 'LayerElementMaterial'), i32('TypedIndex', 0)] },
        ],
      },
    ],
  };
}

function modelNode(
  id: bigint,
  name: string,
  object: SceneObject,
  isMesh: boolean,
  pivotShift: { x: number; y: number; z: number },
): FbxNode {
  const [rx, ry, rz] = quatToEulerDeg(object.transform.rotation);
  const t = object.transform;
  return {
    name: 'Model',
    props: [
      { t: 'L', v: id },
      { t: 'S', v: `${name}\u0000\u0001Model` },
      { t: 'S', v: isMesh ? 'Mesh' : 'Null' },
    ],
    children: [
      { name: 'Version', props: [{ t: 'I', v: 232 }], children: [] },
      {
        name: 'Properties70',
        props: [],
        children: [
          property70(
            'Lcl Translation',
            'Lcl Translation',
            '',
            { t: 'D', v: (t.position.x + pivotShift.x) * UNIT_SCALE_FACTOR },
            { t: 'D', v: (t.position.y + pivotShift.y) * UNIT_SCALE_FACTOR },
            { t: 'D', v: (t.position.z + pivotShift.z) * UNIT_SCALE_FACTOR },
          ),
          property70('Lcl Rotation', 'Lcl Rotation', '', { t: 'D', v: rx }, { t: 'D', v: ry }, { t: 'D', v: rz }),
          property70(
            'Lcl Scaling',
            'Lcl Scaling',
            '',
            { t: 'D', v: t.scale.x },
            { t: 'D', v: t.scale.y },
            { t: 'D', v: t.scale.z },
          ),
        ],
      },
      { name: 'Shading', props: [{ t: 'C', v: true }], children: [] },
      { name: 'Culling', props: [{ t: 'S', v: 'CullingOff' }], children: [] },
    ],
  };
}

function materialNode(id: bigint, name: string, def: MaterialDef): FbxNode {
  const shininess = Math.max(1, (1 - def.roughness) * 100);
  return {
    name: 'Material',
    props: [{ t: 'L', v: id }, { t: 'S', v: `${name}\u0000\u0001Material` }, { t: 'S', v: '' }],
    children: [
      { name: 'Version', props: [{ t: 'I', v: 102 }], children: [] },
      { name: 'ShadingModel', props: [{ t: 'S', v: 'Phong' }], children: [] },
      { name: 'MultiLayer', props: [{ t: 'I', v: 0 }], children: [] },
      {
        name: 'Properties70',
        props: [],
        children: [
          property70(
            'DiffuseColor',
            'Color',
            '',
            { t: 'D', v: def.baseColor[0] },
            { t: 'D', v: def.baseColor[1] },
            { t: 'D', v: def.baseColor[2] },
          ),
          property70('Opacity', 'double', '', { t: 'D', v: def.baseColor[3] }),
          property70(
            'EmissiveColor',
            'Color',
            '',
            { t: 'D', v: def.emissive[0] },
            { t: 'D', v: def.emissive[1] },
            { t: 'D', v: def.emissive[2] },
          ),
          property70('Shininess', 'double', '', { t: 'D', v: shininess }),
          property70('ReflectionFactor', 'double', '', { t: 'D', v: def.metallic }),
        ],
      },
    ],
  };
}

function connectionNode(fromId: bigint, toId: bigint): FbxNode {
  return { name: 'C', props: [{ t: 'S', v: 'OO' }, { t: 'L', v: fromId }, { t: 'L', v: toId }], children: [] };
}

let idCounter = 1000000n;
function allocId(): bigint {
  idCounter += 1n;
  return idCounter;
}

/**
 * Builds the FBX node tree for a set of scene objects. Kept deliberately
 * narrower than the PRD's full spec for this pass: no `Texture`/`Video`
 * nodes yet (materials export color/roughness/metallic but not image
 * maps — see CHANGELOG), and only flat (non-nested) parenting, since
 * `Document.children()` grouping isn't wired into the export yet either.
 */
export function buildFbxNodes(doc: Document, objectIds: string[], options: FbxExportOptions): FbxNode[] {
  const definitionsCounts: { type: string; count: number }[] = [];
  const objectsChildren: FbxNode[] = [];
  const connections: FbxNode[] = [];
  const materialIdByDefId = new Map<string, bigint>();

  let geometryCount = 0;
  let modelCount = 0;

  for (const objectId of objectIds) {
    const object = doc.objects.get(objectId);
    if (!object) continue;
    const modelId = allocId();
    modelCount += 1;

    if (object.kind === 'mesh' && object.meshId) {
      const mesh = doc.meshes.get(object.meshId);
      if (!mesh) continue;
      const { data, pivot } = buildMeshData(mesh, options);
      const geometryId = allocId();
      geometryCount += 1;
      objectsChildren.push(geometryNode(geometryId, object.name, data));
      objectsChildren.push(modelNode(modelId, object.name, object, true, pivot));
      connections.push(connectionNode(geometryId, modelId));

      mesh.materialSlots.forEach((materialDefId, slotIndex) => {
        const def = doc.materials.get(materialDefId);
        if (!def) return;
        let matId = materialIdByDefId.get(materialDefId);
        if (matId === undefined) {
          matId = allocId();
          materialIdByDefId.set(materialDefId, matId);
          objectsChildren.push(materialNode(matId, def.name, def));
        }
        void slotIndex;
        connections.push(connectionNode(matId, modelId));
      });
    } else {
      objectsChildren.push(modelNode(modelId, object.name, object, false, { x: 0, y: 0, z: 0 }));
    }
    connections.push(connectionNode(modelId, 0n)); // parent to the scene root
  }

  definitionsCounts.push({ type: 'GlobalSettings', count: 1 });
  if (geometryCount) definitionsCounts.push({ type: 'Geometry', count: geometryCount });
  if (modelCount) definitionsCounts.push({ type: 'Model', count: modelCount });
  if (materialIdByDefId.size) definitionsCounts.push({ type: 'Material', count: materialIdByDefId.size });

  const definitions: FbxNode = {
    name: 'Definitions',
    props: [],
    children: [
      { name: 'Version', props: [{ t: 'I', v: 100 }], children: [] },
      { name: 'Count', props: [{ t: 'I', v: modelCount + geometryCount + materialIdByDefId.size }], children: [] },
      ...definitionsCounts.map((d) => ({ name: 'ObjectType', props: [{ t: 'S' as const, v: d.type }], children: [i32('Count', d.count)] })),
    ],
  };

  return [
    headerExtensionNode(),
    { name: 'FileId', props: [{ t: 'R', v: new Uint8Array(16) }], children: [] },
    { name: 'CreationTime', props: [{ t: 'S', v: '1970-01-01 00:00:00:000' }], children: [] },
    { name: 'Creator', props: [{ t: 'S', v: 'FABricator' }], children: [] },
    globalSettingsNode(),
    { name: 'Documents', props: [], children: [{ name: 'Count', props: [{ t: 'I', v: 1 }], children: [] }] },
    { name: 'References', props: [], children: [] },
    definitions,
    { name: 'Objects', props: [], children: objectsChildren },
    { name: 'Connections', props: [], children: connections },
  ];
}
