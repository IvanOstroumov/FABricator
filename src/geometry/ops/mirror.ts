import { EditableMesh } from '../EditableMesh';
import type { Vec3 } from '../../core/math/types';
import { mergeByDistance } from './merge';

export type MirrorAxis = 'x' | 'y' | 'z';

function reflect(p: Vec3, axis: MirrorAxis): Vec3 {
  return {
    x: axis === 'x' ? -p.x : p.x,
    y: axis === 'y' ? -p.y : p.y,
    z: axis === 'z' ? -p.z : p.z,
  };
}

/**
 * Bakes a mirror into real geometry: the original mesh plus a reflected,
 * rewound copy, optionally welded along the mirror plane. The live,
 * non-destructive preview (`SceneObject.mirror`) is a render-only concern
 * handled in `render/MeshSync`; this is what "Applica" (apply) runs.
 */
export function applyMirror(
  mesh: EditableMesh,
  axis: MirrorAxis,
  merge: boolean,
  mergeDistance = 0.001,
): EditableMesh {
  const out = new EditableMesh();
  const origMap = new Map<number, number>();
  const mirrorMap = new Map<number, number>();
  const getOriginal = (v: number): number => {
    let mapped = origMap.get(v);
    if (mapped === undefined) {
      mapped = out.addVertex(mesh.vertexPosition(v));
      origMap.set(v, mapped);
    }
    return mapped;
  };
  const getMirrored = (v: number): number => {
    let mapped = mirrorMap.get(v);
    if (mapped === undefined) {
      mapped = out.addVertex(reflect(mesh.vertexPosition(v), axis));
      mirrorMap.set(v, mapped);
    }
    return mapped;
  };

  for (let f = 0; f < mesh.faceCount; f++) {
    const verts = mesh.faceVertices(f);
    const uvs = mesh.faceUvs(f);
    out.addFace(verts.map(getOriginal), uvs, mesh.faceMaterial[f]);
    // Reflecting flips handedness, so the mirrored face must be rewound
    // (reversed) to keep its normal pointing outward.
    out.addFace([...verts.map(getMirrored)].reverse(), [...uvs].reverse(), mesh.faceMaterial[f]);
  }

  return merge ? mergeByDistance(out, mergeDistance) : out;
}
