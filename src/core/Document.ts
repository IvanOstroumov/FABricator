import type { Id } from './Id';
import type { Quat, Vec3 } from './math/types';
import { IDENTITY_QUAT, vec3 } from './math/types';
import { EventBus } from './EventBus';
import type { EditableMesh } from '../geometry/EditableMesh';
import type { MaterialDef, TextureAsset } from '../materials/types';

export interface Transform {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
}

export function identityTransform(): Transform {
  return { position: vec3(0, 0, 0), rotation: { ...IDENTITY_QUAT }, scale: vec3(1, 1, 1) };
}

export interface SceneObject {
  id: Id;
  name: string;
  parentId: Id | null;
  kind: 'mesh' | 'group';
  transform: Transform;
  pivot: Vec3;
  visible: boolean;
  locked: boolean;
  meshId?: Id;
  shading: { smooth: boolean; autoSmoothAngleDeg: number };
}

export interface DocumentSettings {
  gridSize: number;
  exportTriangleWarning: number;
}

type MeshDirty = 'topology' | 'positions' | 'uv' | 'materials';

export interface DocumentEvents {
  objectAdded: { id: Id };
  objectRemoved: { id: Id };
  objectChanged: { id: Id; fields: Partial<SceneObject> };
  meshChanged: { meshId: Id; dirty: MeshDirty };
  materialChanged: { id: Id };
  textureAdded: { id: Id };
  revisionChanged: { revision: number };
  [key: string]: unknown;
}

/**
 * The single source of truth for the scene. React panels and the Three.js
 * renderer are both derived views driven by its events; nothing outside
 * `commands/` should mutate it directly.
 */
export class Document {
  readonly events = new EventBus<DocumentEvents>();
  readonly objects = new Map<Id, SceneObject>();
  readonly meshes = new Map<Id, EditableMesh>();
  readonly materials = new Map<Id, MaterialDef>();
  readonly textures = new Map<Id, TextureAsset>();
  /** Raw image bytes for each texture, kept out of the reactive maps above (large, immutable once imported). */
  readonly textureData = new Map<Id, Uint8Array>();
  readonly settings: DocumentSettings = { gridSize: 0.25, exportTriangleWarning: 10000 };
  private revision = 0;

  addObject(object: SceneObject, mesh?: EditableMesh): void {
    this.objects.set(object.id, object);
    if (mesh && object.meshId) {
      this.meshes.set(object.meshId, mesh);
    }
    this.bumpRevision();
    this.events.emit('objectAdded', { id: object.id });
  }

  removeObject(id: Id): void {
    this.objects.delete(id);
    this.bumpRevision();
    this.events.emit('objectRemoved', { id });
  }

  updateObject(id: Id, fields: Partial<SceneObject>): void {
    const obj = this.objects.get(id);
    if (!obj) return;
    Object.assign(obj, fields);
    this.bumpRevision();
    this.events.emit('objectChanged', { id, fields });
  }

  /** Notifies listeners that an object already mutated in place (e.g. a live transform preview) changed. */
  touchObject(id: Id): void {
    this.bumpRevision();
    this.events.emit('objectChanged', { id, fields: {} });
  }

  notifyMeshChanged(meshId: Id, dirty: MeshDirty): void {
    this.bumpRevision();
    this.events.emit('meshChanged', { meshId, dirty });
  }

  addMaterial(material: MaterialDef): void {
    this.materials.set(material.id, material);
    this.bumpRevision();
    this.events.emit('materialChanged', { id: material.id });
  }

  updateMaterial(id: Id, fields: Partial<MaterialDef>): void {
    const material = this.materials.get(id);
    if (!material) return;
    Object.assign(material, fields);
    this.bumpRevision();
    this.events.emit('materialChanged', { id });
  }

  removeMaterial(id: Id): void {
    this.materials.delete(id);
    this.bumpRevision();
  }

  addTexture(texture: TextureAsset, data: Uint8Array): void {
    this.textures.set(texture.id, texture);
    this.textureData.set(texture.id, data);
    this.bumpRevision();
    this.events.emit('textureAdded', { id: texture.id });
  }

  children(parentId: Id | null): SceneObject[] {
    return [...this.objects.values()].filter((o) => o.parentId === parentId);
  }

  getRevision(): number {
    return this.revision;
  }

  private bumpRevision(): void {
    this.revision += 1;
    this.events.emit('revisionChanged', { revision: this.revision });
  }
}
