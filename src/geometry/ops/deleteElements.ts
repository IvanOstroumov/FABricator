import { EditableMesh } from '../EditableMesh';

function rebuildWithout(mesh: EditableMesh, removedFaces: ReadonlySet<number>): EditableMesh {
  const out = new EditableMesh();
  const remap = new Map<number, number>();
  const getVertex = (v: number): number => {
    let mapped = remap.get(v);
    if (mapped === undefined) {
      mapped = out.addVertex(mesh.vertexPosition(v));
      remap.set(v, mapped);
    }
    return mapped;
  };
  for (let f = 0; f < mesh.faceCount; f++) {
    if (removedFaces.has(f)) continue;
    out.addFace(mesh.faceVertices(f).map(getVertex), mesh.faceUvs(f), mesh.faceMaterial[f]);
  }
  return out;
}

/** Face-mode delete: removes exactly the selected faces. Isolated vertices are dropped automatically by the rebuild. */
export function deleteFaces(mesh: EditableMesh, faceIndices: Iterable<number>): EditableMesh {
  return rebuildWithout(mesh, new Set(faceIndices));
}

/** Vertex-mode delete: removes the vertices and every face touching them, per the PRD. */
export function deleteVertices(mesh: EditableMesh, vertexIndices: Iterable<number>): EditableMesh {
  const removedFaces = new Set<number>();
  for (const v of vertexIndices) {
    for (const f of mesh.vertexFaces(v)) removedFaces.add(f);
  }
  return rebuildWithout(mesh, removedFaces);
}

/** Edge-mode delete: removes the faces adjacent to each selected edge (edge ids from `EditableMesh.edges()`). */
export function deleteEdges(mesh: EditableMesh, edgeIds: Iterable<number>): EditableMesh {
  const idSet = new Set(edgeIds);
  const removedFaces = new Set<number>();
  for (let h = 0; h < mesh.heVert.length; h++) {
    const twin = mesh.heTwin[h];
    const id = twin === -1 ? h : Math.min(h, twin);
    if (!idSet.has(id)) continue;
    if (mesh.heFace[h] !== -1) removedFaces.add(mesh.heFace[h]);
    if (twin !== -1 && mesh.heFace[twin] !== -1) removedFaces.add(mesh.heFace[twin]);
  }
  return rebuildWithout(mesh, removedFaces);
}
