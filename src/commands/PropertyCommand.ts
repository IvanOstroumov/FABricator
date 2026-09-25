import type { Document, SceneObject } from '../core/Document';
import type { Command } from './Command';

/**
 * Generic "change some fields on an object" command: rename, visibility,
 * lock, re-parent (group), shading options, transform. Continuous edits
 * (e.g. dragging a slider) can merge into a single undo step via
 * `mergeWith`.
 */
export class PropertyCommand implements Command {
  private before: Partial<SceneObject> = {};
  readonly label: string;
  private objectId: string;
  private after: Partial<SceneObject>;
  private mergeable: boolean;

  constructor(label: string, objectId: string, after: Partial<SceneObject>, mergeable = false) {
    this.label = label;
    this.objectId = objectId;
    this.after = after;
    this.mergeable = mergeable;
  }

  execute(doc: Document): void {
    const obj = doc.objects.get(this.objectId);
    if (!obj) return;
    for (const key of Object.keys(this.after) as (keyof SceneObject)[]) {
      (this.before as Record<string, unknown>)[key] = structuredClone(obj[key]);
    }
    doc.updateObject(this.objectId, this.after);
  }

  undo(doc: Document): void {
    doc.updateObject(this.objectId, this.before);
  }

  mergeWith(next: Command): boolean {
    if (!this.mergeable) return false;
    if (!(next instanceof PropertyCommand)) return false;
    if (next.objectId !== this.objectId || next.label !== this.label) return false;
    this.after = next.after;
    return true;
  }

  memoryBytes(): number {
    return 128;
  }
}
