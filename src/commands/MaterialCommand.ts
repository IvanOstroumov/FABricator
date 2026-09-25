import type { Document } from '../core/Document';
import type { MaterialDef } from '../materials/types';
import type { Command } from './Command';

export class AddMaterialCommand implements Command {
  readonly label = 'Nuovo materiale';
  private material: MaterialDef;

  constructor(material: MaterialDef) {
    this.material = material;
  }

  execute(doc: Document): void {
    doc.addMaterial(this.material);
  }

  undo(doc: Document): void {
    doc.removeMaterial(this.material.id);
  }

  get createdId(): string {
    return this.material.id;
  }

  memoryBytes(): number {
    return 256;
  }
}

/** Edits fields on an existing material (color, metallic, roughness, UV transform, ...). */
export class MaterialPropertyCommand implements Command {
  readonly label: string;
  private materialId: string;
  private after: Partial<MaterialDef>;
  private before: Partial<MaterialDef> = {};
  private mergeable: boolean;

  constructor(label: string, materialId: string, after: Partial<MaterialDef>, mergeable = false) {
    this.label = label;
    this.materialId = materialId;
    this.after = after;
    this.mergeable = mergeable;
  }

  execute(doc: Document): void {
    const material = doc.materials.get(this.materialId);
    if (!material) return;
    for (const key of Object.keys(this.after) as (keyof MaterialDef)[]) {
      (this.before as Record<string, unknown>)[key] = structuredClone(material[key]);
    }
    doc.updateMaterial(this.materialId, this.after);
  }

  undo(doc: Document): void {
    doc.updateMaterial(this.materialId, this.before);
  }

  mergeWith(next: Command): boolean {
    if (!this.mergeable || !(next instanceof MaterialPropertyCommand)) return false;
    if (next.materialId !== this.materialId || next.label !== this.label) return false;
    this.after = next.after;
    return true;
  }

  memoryBytes(): number {
    return 128;
  }
}
