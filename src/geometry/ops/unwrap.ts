import type { EditableMesh } from '../EditableMesh';
import type { Vec3 } from '../../core/math/types';

function forEachCorner(
  mesh: EditableMesh,
  faceIndices: Iterable<number> | undefined,
  compute: (p: Vec3, normal: Vec3) => [number, number],
): number[] {
  const heUv = [...mesh.heUv];
  const targets = faceIndices ? new Set(faceIndices) : null;

  for (let f = 0; f < mesh.faceCount; f++) {
    if (targets && !targets.has(f)) continue;
    const normal = mesh.faceNormal(f);
    const start = mesh.faceHalfEdge[f];
    let h = start;
    do {
      const vertexIndex = mesh.heVert[mesh.hePrev[h]];
      const [u, v] = compute(mesh.vertexPosition(vertexIndex), normal);
      heUv[h * 2] = u;
      heUv[h * 2 + 1] = v;
      h = mesh.heNext[h];
    } while (h !== start);
  }

  return heUv;
}

/**
 * Automatic UV unwrap via box projection: each face is projected onto the
 * plane perpendicular to its normal's dominant axis, per the PRD's "box"
 * quick-projection algorithm (U-02). A real chart-packing unwrap (xatlas,
 * per U-01) is a substantially larger integration left for a follow-up —
 * this gives every face *some* reasonable, non-overlapping-within-itself
 * UV immediately, which is what "automatico" mainly needs to unblock
 * texturing in the meantime. Returns the new flat `heUv` array; the
 * caller wraps the before/after in a `UvEditCommand` for undo.
 */
export function boxUnwrap(mesh: EditableMesh, faceIndices?: Iterable<number>): number[] {
  return forEachCorner(mesh, faceIndices, (p, normal) => {
    const absX = Math.abs(normal.x);
    const absY = Math.abs(normal.y);
    const absZ = Math.abs(normal.z);
    if (absX >= absY && absX >= absZ) return [p.z, p.y];
    if (absY >= absX && absY >= absZ) return [p.x, p.z];
    return [p.x, p.y];
  });
}

/** Planar projection onto the plane perpendicular to the selection's averaged normal (U-02). */
export function planarUnwrap(mesh: EditableMesh, faceIndices: Iterable<number>): number[] {
  const indices = [...faceIndices];
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (const f of indices) {
    const n = mesh.faceNormal(f);
    nx += n.x;
    ny += n.y;
    nz += n.z;
  }
  const len = Math.hypot(nx, ny, nz) || 1;
  const normal: Vec3 = { x: nx / len, y: ny / len, z: nz / len };

  // Any vector not parallel to `normal` gives a stable basis via cross products.
  const helper: Vec3 = Math.abs(normal.y) < 0.99 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const tangentLen = Math.hypot(
    normal.y * helper.z - normal.z * helper.y,
    normal.z * helper.x - normal.x * helper.z,
    normal.x * helper.y - normal.y * helper.x,
  );
  const tangent: Vec3 = {
    x: (normal.y * helper.z - normal.z * helper.y) / tangentLen,
    y: (normal.z * helper.x - normal.x * helper.z) / tangentLen,
    z: (normal.x * helper.y - normal.y * helper.x) / tangentLen,
  };
  const bitangent: Vec3 = {
    x: normal.y * tangent.z - normal.z * tangent.y,
    y: normal.z * tangent.x - normal.x * tangent.z,
    z: normal.x * tangent.y - normal.y * tangent.x,
  };

  return forEachCorner(mesh, indices, (p) => [
    p.x * tangent.x + p.y * tangent.y + p.z * tangent.z,
    p.x * bitangent.x + p.y * bitangent.y + p.z * bitangent.z,
  ]);
}

/** Cylindrical projection around the Y axis: angle -> u, height -> v (U-02). */
export function cylindricalUnwrap(mesh: EditableMesh, faceIndices?: Iterable<number>): number[] {
  return forEachCorner(mesh, faceIndices, (p) => [Math.atan2(p.z, p.x) / (2 * Math.PI) + 0.5, p.y]);
}
