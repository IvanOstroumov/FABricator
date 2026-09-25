import type { Document } from '../core/Document';
import type { Id } from '../core/Id';
import type { Command } from './Command';

/** Assigns a material (by id) to a set of faces of a mesh — the whole mesh, or a face-mode selection. */
export class AssignMaterialCommand implements Command {
  readonly label = 'Assegna materiale';
  private meshId: Id;
  private materialId: Id;
  private faceIndices: number[] | null; // null = every face
  private beforeSlots: Id[] = [];
  private beforeFaceMaterial: number[] = [];
  private afterSlots: Id[] = [];
  private afterFaceMaterial: number[] = [];

  constructor(meshId: Id, materialId: Id, faceIndices: number[] | null) {
    this.meshId = meshId;
    this.materialId = materialId;
    this.faceIndices = faceIndices;
  }

  execute(doc: Document): void {
    const mesh = doc.meshes.get(this.meshId);
    if (!mesh) return;

    if (this.afterSlots.length === 0) {
      // First run: compute the after-state once, from the current (before) state.
      this.beforeSlots = [...mesh.materialSlots];
      this.beforeFaceMaterial = [...mesh.faceMaterial];

      let slotIndex = mesh.materialSlots.indexOf(this.materialId);
      const slots = [...mesh.materialSlots];
      if (slotIndex === -1) {
        slots.push(this.materialId);
        slotIndex = slots.length - 1;
      }
      const faceMaterial = [...mesh.faceMaterial];
      const targets = this.faceIndices ?? faceMaterial.map((_, i) => i);
      for (const f of targets) faceMaterial[f] = slotIndex;

      this.afterSlots = slots;
      this.afterFaceMaterial = faceMaterial;
    }

    mesh.materialSlots = [...this.afterSlots];
    mesh.faceMaterial = [...this.afterFaceMaterial];
    doc.notifyMeshChanged(this.meshId, 'materials');
  }

  undo(doc: Document): void {
    const mesh = doc.meshes.get(this.meshId);
    if (!mesh) return;
    mesh.materialSlots = [...this.beforeSlots];
    mesh.faceMaterial = [...this.beforeFaceMaterial];
    doc.notifyMeshChanged(this.meshId, 'materials');
  }

  memoryBytes(): number {
    return (this.beforeFaceMaterial.length + this.afterFaceMaterial.length) * 4;
  }
}
