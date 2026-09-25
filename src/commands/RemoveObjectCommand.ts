import type { Document, SceneObject } from '../core/Document';
import type { Command } from './Command';

export class RemoveObjectCommand implements Command {
  readonly label = 'Cancella';
  private snapshot: SceneObject;

  constructor(object: SceneObject) {
    this.snapshot = structuredClone(object);
  }

  execute(doc: Document): void {
    doc.removeObject(this.snapshot.id);
  }

  undo(doc: Document): void {
    doc.addObject(structuredClone(this.snapshot));
  }

  memoryBytes(): number {
    return 256;
  }
}
