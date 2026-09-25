import type { Document } from '../core/Document';
import type { Id } from '../core/Id';
import type { Command } from './Command';

/** Snapshots the flat per-corner UV array (`EditableMesh.heUv`) before/after an unwrap or UV-editor change. */
export class UvEditCommand implements Command {
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
    mesh.heUv = this.after.slice();
    doc.notifyMeshChanged(this.meshId, 'uv');
  }

  undo(doc: Document): void {
    const mesh = doc.meshes.get(this.meshId);
    if (!mesh) return;
    mesh.heUv = this.before.slice();
    doc.notifyMeshChanged(this.meshId, 'uv');
  }

  memoryBytes(): number {
    return (this.before.length + this.after.length) * 8;
  }
}
