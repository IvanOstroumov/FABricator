import type { EditableMesh } from '../EditableMesh';

/** Walks a hole's boundary starting from a border half-edge (`heTwin === -1`), returning its vertices in order. */
export function traceBorderLoop(mesh: EditableMesh, startHe: number): number[] {
  const outgoingFromVertex = new Map<number, number>();
  for (let h = 0; h < mesh.heVert.length; h++) {
    if (mesh.heTwin[h] === -1) {
      outgoingFromVertex.set(mesh.heVert[mesh.hePrev[h]], h);
    }
  }

  const verts: number[] = [];
  let h = startHe;
  const startOrigin = mesh.heVert[mesh.hePrev[startHe]];
  for (let guard = 0; guard < mesh.heVert.length; guard++) {
    verts.push(mesh.heVert[mesh.hePrev[h]]);
    const dest = mesh.heVert[h];
    if (dest === startOrigin) break;
    const next = outgoingFromVertex.get(dest);
    if (next === undefined) break;
    h = next;
  }
  return verts;
}
