import { EditableMesh } from '../EditableMesh';
import type { Vec3 } from '../../core/math/types';

function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}

function average(points: Vec3[]): Vec3 {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }), { x: 0, y: 0, z: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length, z: sum.z / points.length };
}

const PLACEHOLDER_UV: [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

/**
 * Linear subdivision (no Catmull-Clark smoothing yet): every edge is split
 * at its midpoint and every n-sided face becomes n quads meeting at a new
 * center vertex, per the PRD. Operates on the whole mesh — subdividing
 * only a selected subset of faces/edges (with the T-junction handling
 * that implies) is left for a later pass.
 */
export function subdivide(mesh: EditableMesh): EditableMesh {
  const out = new EditableMesh();
  const vertMap = new Map<number, number>();
  const getVertex = (v: number): number => {
    let mapped = vertMap.get(v);
    if (mapped === undefined) {
      mapped = out.addVertex(mesh.vertexPosition(v));
      vertMap.set(v, mapped);
    }
    return mapped;
  };

  const midMap = new Map<number, number>();
  const getMidpoint = (edgeId: number, a: number, b: number): number => {
    let mapped = midMap.get(edgeId);
    if (mapped === undefined) {
      mapped = out.addVertex(lerp(mesh.vertexPosition(a), mesh.vertexPosition(b), 0.5));
      midMap.set(edgeId, mapped);
    }
    return mapped;
  };

  for (let f = 0; f < mesh.faceCount; f++) {
    const verts = mesh.faceVertices(f);
    const n = verts.length;
    const center = out.addVertex(average(verts.map((v) => mesh.vertexPosition(v))));

    const start = mesh.faceHalfEdge[f];
    let h = start;
    const mids: number[] = [];
    for (let i = 0; i < n; i++) {
      const twin = mesh.heTwin[h];
      const id = twin === -1 ? h : Math.min(h, twin);
      mids.push(getMidpoint(id, verts[i], verts[(i + 1) % n]));
      h = mesh.heNext[h];
    }

    for (let i = 0; i < n; i++) {
      const prevMid = mids[(i - 1 + n) % n];
      const corner = getVertex(verts[i]);
      const nextMid = mids[i];
      out.addFace([prevMid, corner, nextMid, center], PLACEHOLDER_UV, mesh.faceMaterial[f]);
    }
  }

  return out;
}
