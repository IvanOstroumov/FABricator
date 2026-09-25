import type { Document, SceneObject } from '../core/Document';
import type { EditableMesh } from '../geometry/EditableMesh';
import type { Id } from '../core/Id';
import type { Command } from './Command';

/** Bakes a non-destructive mirror preview into real geometry, and clears `SceneObject.mirror` so it isn't doubled on render. */
export class ApplyMirrorCommand implements Command {
  readonly label = 'Applica specchio';
  private objectId: Id;
  private meshId: Id;
  private before: EditableMesh;
  private after: EditableMesh;
  private beforeMirror: SceneObject['mirror'];

  constructor(objectId: Id, meshId: Id, before: EditableMesh, after: EditableMesh, beforeMirror: SceneObject['mirror']) {
    this.objectId = objectId;
    this.meshId = meshId;
    this.before = before;
    this.after = after;
    this.beforeMirror = beforeMirror;
  }

  execute(doc: Document): void {
    doc.meshes.set(this.meshId, this.after);
    doc.updateObject(this.objectId, { mirror: undefined });
    doc.notifyMeshChanged(this.meshId, 'topology');
  }

  undo(doc: Document): void {
    doc.meshes.set(this.meshId, this.before);
    doc.updateObject(this.objectId, { mirror: this.beforeMirror });
    doc.notifyMeshChanged(this.meshId, 'topology');
  }

  memoryBytes(): number {
    return this.before.memoryBytes() + this.after.memoryBytes();
  }
}
