import type { Document, SceneObject } from '../core/Document';
import type { EditableMesh } from '../geometry/EditableMesh';
import type { Command } from './Command';

export class AddObjectCommand implements Command {
  readonly label = 'Aggiungi oggetto';
  private object: SceneObject;
  private mesh?: EditableMesh;

  constructor(object: SceneObject, mesh?: EditableMesh) {
    this.object = object;
    this.mesh = mesh;
  }

  execute(doc: Document): void {
    doc.addObject(this.object, this.mesh);
  }

  undo(doc: Document): void {
    doc.removeObject(this.object.id);
  }

  get createdObjectId(): string {
    return this.object.id;
  }

  memoryBytes(): number {
    return this.mesh?.memoryBytes() ?? 256;
  }
}
