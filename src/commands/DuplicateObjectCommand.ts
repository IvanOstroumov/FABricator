import type { Document, SceneObject } from '../core/Document';
import { createId } from '../core/Id';
import type { Command } from './Command';

/** Deep-copies an object and its mesh (independent geometry, not an instance). */
export class DuplicateObjectCommand implements Command {
  readonly label = 'Duplica';
  private newObject: SceneObject;
  private clonedMeshId: string | null = null;

  constructor(source: SceneObject, doc: Document) {
    this.newObject = structuredClone(source);
    this.newObject.id = createId();
    this.newObject.name = `${source.name} copia`;
    this.newObject.transform = structuredClone(source.transform);
    this.newObject.transform.position.x += 0.5;

    if (source.meshId) {
      const sourceMesh = doc.meshes.get(source.meshId);
      if (sourceMesh) {
        this.clonedMeshId = createId();
        this.newObject.meshId = this.clonedMeshId;
        this.pendingMesh = sourceMesh.clone();
      }
    }
  }

  private pendingMesh?: ReturnType<Document['meshes']['get']>;

  execute(doc: Document): void {
    if (this.clonedMeshId && this.pendingMesh) {
      doc.meshes.set(this.clonedMeshId, this.pendingMesh);
    }
    doc.addObject(this.newObject);
  }

  undo(doc: Document): void {
    doc.removeObject(this.newObject.id);
  }

  get createdId(): string {
    return this.newObject.id;
  }

  memoryBytes(): number {
    return this.pendingMesh?.memoryBytes() ?? 256;
  }
}
