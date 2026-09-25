import type { Document, SceneObject } from '../core/Document';
import { createId } from '../core/Id';
import { identityTransform } from '../core/Document';
import type { Command } from './Command';

export class GroupObjectsCommand implements Command {
  readonly label = 'Raggruppa';
  private group: SceneObject;
  private previousParents = new Map<string, string | null>();
  private objectIds: string[];

  constructor(objectIds: string[]) {
    this.objectIds = objectIds;
    this.group = {
      id: createId(),
      name: 'Gruppo',
      parentId: null,
      kind: 'group',
      transform: identityTransform(),
      pivot: { x: 0, y: 0, z: 0 },
      visible: true,
      locked: false,
      shading: { smooth: false, autoSmoothAngleDeg: 30 },
    };
  }

  execute(doc: Document): void {
    doc.addObject(this.group);
    for (const id of this.objectIds) {
      const obj = doc.objects.get(id);
      if (!obj) continue;
      this.previousParents.set(id, obj.parentId);
      doc.updateObject(id, { parentId: this.group.id });
    }
  }

  undo(doc: Document): void {
    for (const id of this.objectIds) {
      doc.updateObject(id, { parentId: this.previousParents.get(id) ?? null });
    }
    doc.removeObject(this.group.id);
  }

  memoryBytes(): number {
    return 128;
  }
}
