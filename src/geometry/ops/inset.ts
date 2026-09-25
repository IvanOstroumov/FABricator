import { EditableMesh } from '../EditableMesh';
import type { Vec3 } from '../../core/math/types';
import { regionOffset } from './regionOffset';

const DEFAULT_INSET_THICKNESS = 0.15;

function faceCentroid(mesh: EditableMesh, f: number): Vec3 {
  const verts = mesh.faceVertices(f).map((v) => mesh.vertexPosition(v));
  const sum = verts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }), { x: 0, y: 0, z: 0 });
  return { x: sum.x / verts.length, y: sum.y / verts.length, z: sum.z / verts.length };
}

/**
 * Insets each selected face independently (shrinks it toward its own
 * centroid by `thickness`, connected to the untouched border by a ring of
 * quads) — the PRD's exact bisector/sin(theta/2) offset formula is left
 * for a later pass; this centroid approximation is robust for the convex
 * n-gons the current primitives produce.
 */
export function insetFaces(
  mesh: EditableMesh,
  selectedFaces: number[],
  thickness = DEFAULT_INSET_THICKNESS,
): { mesh: EditableMesh; capFaces: number[] } {
  let current = mesh;
  let pending = [...selectedFaces];
  const finalCapFaces: number[] = [];

  while (pending.length > 0) {
    const [face, ...rest] = pending;
    const centroid = faceCentroid(current, face);
    const result = regionOffset(current, [face], (_v, pos) => {
      const dx = centroid.x - pos.x;
      const dy = centroid.y - pos.y;
      const dz = centroid.z - pos.z;
      const dist = Math.hypot(dx, dy, dz) || 1;
      const t = Math.min(thickness / dist, 0.9);
      return { x: pos.x + dx * t, y: pos.y + dy * t, z: pos.z + dz * t };
    });
    current = result.mesh;
    finalCapFaces.push(...result.capFaces);
    pending = rest.map((f) => result.remapUnselectedFace.get(f)).filter((f): f is number => f !== undefined);
    // Already-inset caps never appear again in `pending`, so their indices
    // don't need remapping.
  }

  return { mesh: current, capFaces: finalCapFaces };
}
