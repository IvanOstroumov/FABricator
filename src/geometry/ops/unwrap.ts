import type { EditableMesh } from '../EditableMesh';

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
  const heUv = [...mesh.heUv];
  const targets = faceIndices ? new Set(faceIndices) : null;

  for (let f = 0; f < mesh.faceCount; f++) {
    if (targets && !targets.has(f)) continue;
    const normal = mesh.faceNormal(f);
    const absX = Math.abs(normal.x);
    const absY = Math.abs(normal.y);
    const absZ = Math.abs(normal.z);

    const start = mesh.faceHalfEdge[f];
    let h = start;
    do {
      const vertexIndex = mesh.heVert[mesh.hePrev[h]];
      const p = mesh.vertexPosition(vertexIndex);
      let u: number;
      let v: number;
      if (absX >= absY && absX >= absZ) {
        u = p.z;
        v = p.y;
      } else if (absY >= absX && absY >= absZ) {
        u = p.x;
        v = p.z;
      } else {
        u = p.x;
        v = p.y;
      }
      heUv[h * 2] = u;
      heUv[h * 2 + 1] = v;
      h = mesh.heNext[h];
    } while (h !== start);
  }

  return heUv;
}
