import type { Document } from '../core/Document';
import type { EditableMesh } from '../geometry/EditableMesh';
import type { Id } from '../core/Id';
import type { Command } from './Command';

/** For operations that change the mesh's topology (extrude, inset, component delete), not just vertex positions. */
export class MeshTopologyCommand implements Command {
  readonly label: string;
  private meshId: Id;
  private before: EditableMesh;
  private after: EditableMesh;

  constructor(label: string, meshId: Id, before: EditableMesh, after: EditableMesh) {
    this.label = label;
    this.meshId = meshId;
    this.before = before;
    this.after = after;
  }

  execute(doc: Document): void {
    doc.meshes.set(this.meshId, this.after);
    doc.notifyMeshChanged(this.meshId, 'topology');
  }

  undo(doc: Document): void {
    doc.meshes.set(this.meshId, this.before);
    doc.notifyMeshChanged(this.meshId, 'topology');
  }

  memoryBytes(): number {
    return this.before.memoryBytes() + this.after.memoryBytes();
  }
}
