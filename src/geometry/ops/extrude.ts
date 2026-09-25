import type { EditableMesh } from '../EditableMesh';
import { regionOffset } from './regionOffset';

const DEFAULT_EXTRUDE_DISTANCE = 0.5;

/** Extrudes a set of selected faces outward along their averaged normal. */
export function extrudeFaces(
  mesh: EditableMesh,
  selectedFaces: number[],
  distance = DEFAULT_EXTRUDE_DISTANCE,
): { mesh: EditableMesh; capFaces: number[] } {
  return regionOffset(mesh, selectedFaces, (_v, pos, normal) => ({
    x: pos.x + normal.x * distance,
    y: pos.y + normal.y * distance,
    z: pos.z + normal.z * distance,
  }));
}
