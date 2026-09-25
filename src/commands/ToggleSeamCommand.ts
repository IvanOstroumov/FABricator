import type { Document } from '../core/Document';
import type { Id } from '../core/Id';
import type { Command } from './Command';

/** Marks or clears a set of edges as UV seams (U-05) — purely a flag on the mesh, no topology change. */
export class ToggleSeamCommand implements Command {
  readonly label: string;
  private meshId: Id;
  private edgeIds: number[];
  private mark: boolean;

  constructor(meshId: Id, edgeIds: number[], mark: boolean) {
    this.label = mark ? 'Marca seam' : 'Rimuovi seam';
    this.meshId = meshId;
    this.edgeIds = edgeIds;
    this.mark = mark;
  }

  execute(doc: Document): void {
    const mesh = doc.meshes.get(this.meshId);
    if (!mesh) return;
    for (const id of this.edgeIds) {
      if (this.mark) mesh.seamEdges.add(id);
      else mesh.seamEdges.delete(id);
    }
    doc.notifyMeshChanged(this.meshId, 'uv');
  }

  undo(doc: Document): void {
    const mesh = doc.meshes.get(this.meshId);
    if (!mesh) return;
    for (const id of this.edgeIds) {
      if (this.mark) mesh.seamEdges.delete(id);
      else mesh.seamEdges.add(id);
    }
    doc.notifyMeshChanged(this.meshId, 'uv');
  }

  memoryBytes(): number {
    return this.edgeIds.length * 8;
  }
}
