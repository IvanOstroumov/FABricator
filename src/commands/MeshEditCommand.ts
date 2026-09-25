import type { Document } from '../core/Document';
import type { Id } from '../core/Id';
import type { Command } from './Command';

/** Snapshots the whole position array before/after a component-level edit (move/rotate/scale of a vertex/edge/face selection). */
export class MeshEditCommand implements Command {
  readonly label: string;
  private meshId: Id;
  private before: number[];
  private after: number[];

  constructor(label: string, meshId: Id, before: number[], after: number[]) {
    this.label = label;
    this.meshId = meshId;
    this.before = before.slice();
    this.after = after.slice();
  }

  execute(doc: Document): void {
    const mesh = doc.meshes.get(this.meshId);
    if (!mesh) return;
    mesh.positions = this.after.slice();
    doc.notifyMeshChanged(this.meshId, 'positions');
  }

  undo(doc: Document): void {
    const mesh = doc.meshes.get(this.meshId);
    if (!mesh) return;
    mesh.positions = this.before.slice();
    doc.notifyMeshChanged(this.meshId, 'positions');
  }

  memoryBytes(): number {
    return (this.before.length + this.after.length) * 8;
  }
}
