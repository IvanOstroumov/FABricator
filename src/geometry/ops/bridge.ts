import type { EditableMesh } from '../EditableMesh';
import { traceBorderLoop } from './borderLoop';

/**
 * Bridges two boundary loops of equal vertex count with a ring of quads,
 * per the PRD: aligns the starting rotation by minimizing the summed
 * distance between corresponding vertices.
 */
export function bridgeLoops(mesh: EditableMesh, borderHeA: number, borderHeB: number): EditableMesh {
  const loopA = traceBorderLoop(mesh, borderHeA);
  const loopB = traceBorderLoop(mesh, borderHeB);
  if (loopA.length !== loopB.length) {
    throw new Error('I due bordi non hanno lo stesso numero di vertici');
  }
  const n = loopA.length;

  const dist = (i: number, j: number): number => {
    const a = mesh.vertexPosition(loopA[i]);
    const b = mesh.vertexPosition(loopB[j]);
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  };

  let bestOffset = 0;
  let bestCost = Infinity;
  for (let offset = 0; offset < n; offset++) {
    let cost = 0;
    for (let i = 0; i < n; i++) cost += dist(i, (i + offset) % n);
    if (cost < bestCost) {
      bestCost = cost;
      bestOffset = offset;
    }
  }

  const out = mesh.clone();
  for (let i = 0; i < n; i++) {
    const a0 = loopA[i];
    const a1 = loopA[(i + 1) % n];
    const b0 = loopB[(i + bestOffset) % n];
    const b1 = loopB[(i + 1 + bestOffset) % n];
    out.addFace(
      [a0, a1, b1, b0],
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
    );
  }
  return out;
}
