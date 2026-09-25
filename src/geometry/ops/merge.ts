import { EditableMesh } from '../EditableMesh';
import type { Vec3 } from '../../core/math/types';

function rebuildWithVertexRemap(
  mesh: EditableMesh,
  remap: (v: number) => number,
): { mesh: EditableMesh; outputIndexOf: (originalOrTargetIndex: number) => number | undefined } {
  const out = new EditableMesh();
  const created = new Map<number, number>();
  const getVertex = (v: number): number => {
    const target = remap(v);
    let mapped = created.get(target);
    if (mapped === undefined) {
      mapped = out.addVertex(mesh.vertexPosition(target));
      created.set(target, mapped);
    }
    return mapped;
  };

  for (let f = 0; f < mesh.faceCount; f++) {
    const verts = mesh.faceVertices(f).map(getVertex);
    // Drop degenerate faces created by the merge (two consecutive corners collapsing to the same vertex).
    const deduped = verts.filter((v, i) => v !== verts[(i - 1 + verts.length) % verts.length]);
    const uniqueCount = new Set(deduped).size;
    if (deduped.length < 3 || uniqueCount < 3) continue;
    const uvs = mesh.faceUvs(f).filter((_, i) => verts[i] !== verts[(i - 1 + verts.length) % verts.length]);
    out.addFace(deduped, uvs, mesh.faceMaterial[f]);
  }
  return { mesh: out, outputIndexOf: (v) => created.get(v) };
}

/** Merges a set of vertices into one, at their shared centroid. */
export function mergeAtCenter(mesh: EditableMesh, vertexIndices: number[]): EditableMesh {
  if (vertexIndices.length < 2) return mesh.clone();
  const target = vertexIndices[0];
  const centroid: Vec3 = { x: 0, y: 0, z: 0 };
  for (const v of vertexIndices) {
    const p = mesh.vertexPosition(v);
    centroid.x += p.x / vertexIndices.length;
    centroid.y += p.y / vertexIndices.length;
    centroid.z += p.z / vertexIndices.length;
  }
  const mergeSet = new Set(vertexIndices);
  const { mesh: out, outputIndexOf } = rebuildWithVertexRemap(mesh, (v) => (mergeSet.has(v) ? target : v));
  const mergedOutputIndex = outputIndexOf(target);
  if (mergedOutputIndex !== undefined) out.setVertexPosition(mergedOutputIndex, centroid);
  return out;
}

/** Merges a set of vertices onto the first one's position ("merge at first"). */
export function mergeAtFirst(mesh: EditableMesh, vertexIndices: number[]): EditableMesh {
  if (vertexIndices.length < 2) return mesh.clone();
  const target = vertexIndices[0];
  const mergeSet = new Set(vertexIndices);
  return rebuildWithVertexRemap(mesh, (v) => (mergeSet.has(v) ? target : v)).mesh;
}

/** Welds every pair of vertices within `threshold` of each other, globally (a simple spatial hash would speed this up for large meshes; fine at primitive scale). */
export function mergeByDistance(mesh: EditableMesh, threshold: number): EditableMesh {
  const remapTarget = new Map<number, number>();
  const resolve = (v: number): number => {
    let root = v;
    while (remapTarget.has(root)) root = remapTarget.get(root)!;
    return root;
  };

  for (let a = 0; a < mesh.vertexCount; a++) {
    if (remapTarget.has(a)) continue;
    const pa = mesh.vertexPosition(resolve(a));
    for (let b = a + 1; b < mesh.vertexCount; b++) {
      if (resolve(b) === resolve(a)) continue;
      const pb = mesh.vertexPosition(resolve(b));
      const dist = Math.hypot(pa.x - pb.x, pa.y - pb.y, pa.z - pb.z);
      if (dist <= threshold) remapTarget.set(resolve(b), resolve(a));
    }
  }

  return rebuildWithVertexRemap(mesh, resolve).mesh;
}
