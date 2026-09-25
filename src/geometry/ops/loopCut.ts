import { EditableMesh } from '../EditableMesh';
import type { Vec3 } from '../../core/math/types';

function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}

/**
 * Cuts every quad along an edge loop at parameter `t` (0..1 across each
 * cut edge), splitting each into two quads. Faces the loop only brushes
 * (i.e. not among the cut edges) are copied unchanged.
 */
export function loopCut(mesh: EditableMesh, loopEdgeIds: number[], t = 0.5): EditableMesh {
  const cutSet = new Set(loopEdgeIds);
  const out = new EditableMesh();
  const original = new Map<number, number>(); // old vertex -> new vertex (1:1 copy)
  const midpoint = new Map<number, number>(); // edge id -> new midpoint vertex

  const getOriginal = (v: number): number => {
    let mapped = original.get(v);
    if (mapped === undefined) {
      mapped = out.addVertex(mesh.vertexPosition(v));
      original.set(v, mapped);
    }
    return mapped;
  };
  const getMidpoint = (edgeId: number, a: number, b: number): number => {
    let mapped = midpoint.get(edgeId);
    if (mapped === undefined) {
      mapped = out.addVertex(lerp(mesh.vertexPosition(a), mesh.vertexPosition(b), t));
      midpoint.set(edgeId, mapped);
    }
    return mapped;
  };

  for (let f = 0; f < mesh.faceCount; f++) {
    const verts = mesh.faceVertices(f);
    const uvs = mesh.faceUvs(f);
    if (verts.length !== 4) {
      out.addFace(verts.map(getOriginal), uvs, mesh.faceMaterial[f]);
      continue;
    }

    // Find which of the 4 edges of this quad are being cut (0 or 2, for a
    // well-formed loop selection — a quad is only ever crossed by a loop
    // through one opposing pair of edges).
    const start = mesh.faceHalfEdge[f];
    const cutIndex: number[] = [];
    let h = start;
    for (let i = 0; i < 4; i++) {
      const twin = mesh.heTwin[h];
      const id = twin === -1 ? h : Math.min(h, twin);
      if (cutSet.has(id)) cutIndex.push(i);
      h = mesh.heNext[h];
    }

    if (cutIndex.length !== 2 || cutIndex[1] - cutIndex[0] !== 2) {
      // Not crossed by this loop (or an unsupported partial cut): copy as-is.
      out.addFace(verts.map(getOriginal), uvs, mesh.faceMaterial[f]);
      continue;
    }

    const [i0, i1] = cutIndex; // opposite edges, e.g. edge(0,1) and edge(2,3)

    const he0 = start + i0;
    const he1 = start + i1;
    const twin0 = mesh.heTwin[he0];
    const twin1 = mesh.heTwin[he1];
    const id0 = twin0 === -1 ? he0 : Math.min(he0, twin0);
    const id1 = twin1 === -1 ? he1 : Math.min(he1, twin1);

    // Split the quad into two along a new edge m0-m1, where m0 lies on
    // edge (vA,vB) = verts[i0..i0+1] and m1 on the opposite edge (vC,vD).
    const m0 = getMidpoint(id0, verts[i0], verts[(i0 + 1) % 4]);
    const m1 = getMidpoint(id1, verts[i1], verts[(i1 + 1) % 4]);

    const vA = verts[i0];
    const vB = verts[(i0 + 1) % 4];
    const vC = verts[(i0 + 2) % 4];
    const vD = verts[(i0 + 3) % 4];
    // m0 lies on edge vA-vB, m1 lies on edge vC-vD (opposite edge).
    out.addFace(
      [getOriginal(vA), m0, m1, getOriginal(vD)],
      [uvs[i0], uvs[i0], uvs[(i0 + 3) % 4], uvs[(i0 + 3) % 4]],
      mesh.faceMaterial[f],
    );
    out.addFace(
      [m0, getOriginal(vB), getOriginal(vC), m1],
      [uvs[i0], uvs[(i0 + 1) % 4], uvs[(i0 + 2) % 4], uvs[(i0 + 2) % 4]],
      mesh.faceMaterial[f],
    );
  }

  return out;
}
