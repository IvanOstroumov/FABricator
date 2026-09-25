import type { EditableMesh } from '../geometry/EditableMesh';

export type SelectMode = 'object' | 'vertex' | 'edge' | 'face';

/** A component-level edge is identified by the lower of its two half-edge indices (or the single one, if a border edge). */
export function edgeKey(he: number, twin: number): number {
  return twin === -1 ? he : Math.min(he, twin);
}

/** Expands a vertex/edge/face component selection into the underlying set of unique vertex indices. */
export function expandSelectionToVertices(
  mesh: EditableMesh,
  mode: SelectMode,
  selected: ReadonlySet<number>,
): number[] {
  if (mode === 'vertex') return [...selected];
  const verts = new Set<number>();
  if (mode === 'edge') {
    const byId = new Map(mesh.edges().map((e) => [e.id, e]));
    for (const id of selected) {
      const edge = byId.get(id);
      if (edge) {
        verts.add(edge.a);
        verts.add(edge.b);
      }
    }
  } else if (mode === 'face') {
    for (const f of selected) {
      for (const v of mesh.faceVertices(f)) verts.add(v);
    }
  }
  return [...verts];
}
