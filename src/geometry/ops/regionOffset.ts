import { EditableMesh } from '../EditableMesh';
import type { Vec3 } from '../../core/math/types';

/**
 * Shared building block for extrude and inset: duplicates the vertices of
 * a set of selected faces, replaces those faces with a new "cap" built
 * from the duplicates (positioned by `capPosition`), and stitches a ring
 * of quads between the untouched border and the new cap for every
 * half-edge that borders a face outside the selection (or the mesh's own
 * boundary). Per the PRD: "duplica i vertici del bordo... crea un quad
 * laterale per ogni half-edge di bordo".
 */
export function regionOffset(
  mesh: EditableMesh,
  selectedFaces: number[],
  capPosition: (oldVertex: number, oldPos: Vec3, avgNormal: Vec3) => Vec3,
): { mesh: EditableMesh; capFaces: number[]; remapUnselectedFace: Map<number, number> } {
  const selectedSet = new Set(selectedFaces);
  const out = new EditableMesh();
  const baseVertex = new Map<number, number>();
  const capVertex = new Map<number, number>();

  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (const f of selectedFaces) {
    const n = mesh.faceNormal(f);
    nx += n.x;
    ny += n.y;
    nz += n.z;
  }
  const len = Math.hypot(nx, ny, nz) || 1;
  const avgNormal: Vec3 = { x: nx / len, y: ny / len, z: nz / len };

  const getBase = (v: number): number => {
    let mapped = baseVertex.get(v);
    if (mapped === undefined) {
      mapped = out.addVertex(mesh.vertexPosition(v));
      baseVertex.set(v, mapped);
    }
    return mapped;
  };
  const getCap = (v: number): number => {
    let mapped = capVertex.get(v);
    if (mapped === undefined) {
      mapped = out.addVertex(capPosition(v, mesh.vertexPosition(v), avgNormal));
      capVertex.set(v, mapped);
    }
    return mapped;
  };

  const remapUnselectedFace = new Map<number, number>();
  for (let f = 0; f < mesh.faceCount; f++) {
    if (selectedSet.has(f)) continue;
    const newIndex = out.addFace(mesh.faceVertices(f).map(getBase), mesh.faceUvs(f), mesh.faceMaterial[f]);
    remapUnselectedFace.set(f, newIndex);
  }

  const capFaces: number[] = [];
  for (const f of selectedSet) {
    capFaces.push(out.addFace(mesh.faceVertices(f).map(getCap), mesh.faceUvs(f), mesh.faceMaterial[f]));
  }

  for (const f of selectedSet) {
    const start = mesh.faceHalfEdge[f];
    let h = start;
    do {
      const twin = mesh.heTwin[h];
      const neighborFace = twin === -1 ? -1 : mesh.heFace[twin];
      if (twin === -1 || !selectedSet.has(neighborFace)) {
        const fromOld = mesh.heVert[mesh.hePrev[h]];
        const toOld = mesh.heVert[h];
        const bl = getBase(fromOld);
        const br = getBase(toOld);
        const tr = getCap(toOld);
        const tl = getCap(fromOld);
        out.addFace(
          [bl, br, tr, tl],
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ],
        );
      }
      h = mesh.heNext[h];
    } while (h !== start);
  }

  return { mesh: out, capFaces, remapUnselectedFace };
}
