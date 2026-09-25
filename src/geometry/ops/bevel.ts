import { EditableMesh } from '../EditableMesh';
import type { Vec3 } from '../../core/math/types';

const DEFAULT_BEVEL_DISTANCE = 0.15;

function slide(from: Vec3, toward: Vec3, distance: number): Vec3 {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  const dz = toward.z - from.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  const t = Math.min(distance / len, 0.9);
  return { x: from.x + dx * t, y: from.y + dy * t, z: from.z + dz * t };
}

/**
 * Simplified single-segment bevel of one interior edge (per the PRD's
 * "versione semplificata a 1..N segmenti", here N=1): slides each
 * endpoint along its other edge in each adjacent face, replaces the two
 * faces' corners with the new points, and stitches a strip quad between
 * them plus a small triangle at each endpoint to close the gap with the
 * rest of the mesh. Throws for the unsupported cases the PRD calls out
 * (a border edge with only one adjacent face) so the caller can reject
 * the operation and report it, per the "casi non supportati" rule.
 */
export function bevelEdge(mesh: EditableMesh, edgeId: number, distance = DEFAULT_BEVEL_DISTANCE): EditableMesh {
  const h0 = edgeId;
  const twin0 = mesh.heTwin[h0];
  if (twin0 === -1) {
    throw new Error('Bevel non supportato su uno spigolo di bordo');
  }
  const f1 = mesh.heFace[h0];
  const f2 = mesh.heFace[twin0];
  if (f1 === -1 || f2 === -1) {
    throw new Error('Bevel non supportato su uno spigolo di bordo');
  }

  const a = mesh.heVert[mesh.hePrev[h0]];
  const b = mesh.heVert[h0];
  const pA1 = mesh.heVert[mesh.hePrev[mesh.hePrev[h0]]];
  const qB1 = mesh.heVert[mesh.heNext[h0]];
  const pB2 = mesh.heVert[mesh.hePrev[mesh.hePrev[twin0]]];
  const qA2 = mesh.heVert[mesh.heNext[twin0]];

  const posA = mesh.vertexPosition(a);
  const posB = mesh.vertexPosition(b);
  const a1Pos = slide(posA, mesh.vertexPosition(pA1), distance);
  const b1Pos = slide(posB, mesh.vertexPosition(qB1), distance);
  const b2Pos = slide(posB, mesh.vertexPosition(pB2), distance);
  const a2Pos = slide(posA, mesh.vertexPosition(qA2), distance);

  const out = new EditableMesh();
  const orig = new Map<number, number>();
  const getOrig = (v: number): number => {
    let mapped = orig.get(v);
    if (mapped === undefined) {
      mapped = out.addVertex(mesh.vertexPosition(v));
      orig.set(v, mapped);
    }
    return mapped;
  };

  const vA1 = out.addVertex(a1Pos);
  const vB1 = out.addVertex(b1Pos);
  const vB2 = out.addVertex(b2Pos);
  const vA2 = out.addVertex(a2Pos);

  for (let f = 0; f < mesh.faceCount; f++) {
    const verts = mesh.faceVertices(f);
    const uvs = mesh.faceUvs(f);
    if (f !== f1 && f !== f2) {
      out.addFace(verts.map(getOrig), uvs, mesh.faceMaterial[f]);
      continue;
    }
    const remapped = verts.map((v) => {
      if (v === a) return f === f1 ? vA1 : vA2;
      if (v === b) return f === f1 ? vB1 : vB2;
      return getOrig(v);
    });
    out.addFace(remapped, uvs, mesh.faceMaterial[f]);
  }

  out.addFace(
    [vA1, vB1, vB2, vA2],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  );

  const otherFacesAtA = mesh.vertexFaces(a).filter((f) => f !== f1 && f !== f2);
  if (otherFacesAtA.length > 0) {
    out.addFace(
      [getOrig(a), vA1, vA2],
      [
        [0, 0],
        [1, 0],
        [0, 1],
      ],
    );
  }
  const otherFacesAtB = mesh.vertexFaces(b).filter((f) => f !== f1 && f !== f2);
  if (otherFacesAtB.length > 0) {
    out.addFace(
      [getOrig(b), vB2, vB1],
      [
        [0, 0],
        [1, 0],
        [0, 1],
      ],
    );
  }

  return out;
}
