import type { Vec3 } from '../core/math/types';

/**
 * Fan triangulation for a convex polygon (planar face). Good enough for
 * the parametric primitives generated in Phase 2 (quads and regular
 * n-gons); ear clipping for concave/non-planar n-gons lands with the
 * modelling operations in Phase 4-5.
 */
export function triangulateFace(vertexCount: number): [number, number, number][] {
  if (vertexCount < 3) return [];
  const triangles: [number, number, number][] = [];
  for (let i = 1; i < vertexCount - 1; i++) {
    triangles.push([0, i, i + 1]);
  }
  return triangles;
}

export function faceCentroid(points: Vec3[]): Vec3 {
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }),
    { x: 0, y: 0, z: 0 },
  );
  return { x: sum.x / points.length, y: sum.y / points.length, z: sum.z / points.length };
}
