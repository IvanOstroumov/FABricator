import type { EditableMesh } from '../EditableMesh';
import { traceBorderLoop } from './borderLoop';

/** Fills a hole with a single n-gon following its boundary, per the PRD. */
export function fillHole(mesh: EditableMesh, startBorderHe: number): EditableMesh {
  const loop = traceBorderLoop(mesh, startBorderHe);
  if (loop.length < 3) {
    throw new Error('Il bordo selezionato non forma un buco chiudibile');
  }
  const out = mesh.clone();
  // The cap must wind opposite to the traced boundary direction so its new
  // half-edges become the existing border half-edges' twins.
  const capVerts = [...loop].reverse();
  const uv: [number, number][] = capVerts.map((_, i) => [i / capVerts.length, 0]);
  out.addFace(capVerts, uv);
  return out;
}
