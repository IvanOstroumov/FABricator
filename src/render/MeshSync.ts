import * as THREE from 'three';
import type { Document, SceneObject } from '../core/Document';
import type { EditableMesh } from '../geometry/EditableMesh';
import type { Id } from '../core/Id';
import type { MaterialDef } from '../materials/types';
import { triangulateFace } from '../geometry/triangulate';
import type { ShadingMode } from '../ui/store/useViewStore';

export interface Entry {
  mesh: THREE.Mesh;
  wireframe: THREE.LineSegments;
  editableMesh: EditableMesh;
  triangleFaceMap: number[];
}

interface BuiltGeometry {
  geometry: THREE.BufferGeometry;
  triangleFaceMap: number[];
}

function buildGeometry(mesh: EditableMesh): BuiltGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const triangleFaceMap: number[] = [];
  const groups: { start: number; count: number; materialIndex: number }[] = [];
  let currentMaterialIndex = -1;
  let groupStart = 0;
  let vertCount = 0;

  for (let f = 0; f < mesh.faceCount; f++) {
    const verts = mesh.faceVertices(f);
    const faceUvs = mesh.faceUvs(f);
    const normal = mesh.faceNormal(f);
    const triangles = triangulateFace(verts.length);
    // Slot 0 of the geometry's material array is always the fallback
    // (unassigned) material; real MaterialDef slots are shifted by one so
    // "no material" (-1) never collides with a real slot index 0.
    const rawSlot = mesh.faceMaterial[f] ?? -1;
    const materialIndex = rawSlot < 0 ? 0 : rawSlot + 1;

    if (materialIndex !== currentMaterialIndex) {
      if (currentMaterialIndex !== -1) {
        groups.push({ start: groupStart, count: vertCount - groupStart, materialIndex: currentMaterialIndex });
      }
      currentMaterialIndex = materialIndex;
      groupStart = vertCount;
    }

    for (const [a, b, c] of triangles) {
      triangleFaceMap.push(f);
      for (const i of [a, b, c]) {
        const p = mesh.vertexPosition(verts[i]);
        positions.push(p.x, p.y, p.z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(faceUvs[i][0], faceUvs[i][1]);
        vertCount++;
      }
    }
  }
  if (currentMaterialIndex !== -1) {
    groups.push({ start: groupStart, count: vertCount - groupStart, materialIndex: currentMaterialIndex });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  for (const g of groups) geometry.addGroup(g.start, g.count, g.materialIndex);
  return { geometry, triangleFaceMap };
}

function applyTransform(target: THREE.Object3D, object: SceneObject): void {
  target.position.set(object.transform.position.x, object.transform.position.y, object.transform.position.z);
  target.quaternion.set(
    object.transform.rotation.x,
    object.transform.rotation.y,
    object.transform.rotation.z,
    object.transform.rotation.w,
  );
  target.scale.set(object.transform.scale.x, object.transform.scale.y, object.transform.scale.z);
  target.visible = object.visible;
}

/**
 * Keeps one `THREE.Mesh` per mesh-kind `SceneObject` in sync with the
 * `Document`. React panels and the geometry kernel never touch Three.js
 * directly; this is the only bridge, driven entirely by Document events.
 * Also owns the `MaterialDef` -> `THREE.MeshStandardMaterial` cache (one
 * instance per material, shared across every mesh that references it) and
 * the texture cache backing `maps.baseColor`.
 */
export class MeshSync {
  readonly group = new THREE.Group();
  private entries = new Map<string, Entry>();
  private material = new THREE.MeshStandardMaterial({ color: 0x7a9cc6, roughness: 0.6, metalness: 0.1 });
  private wireframeMaterial = new THREE.LineBasicMaterial({ color: 0x111111 });
  private materialCache = new Map<Id, THREE.MeshStandardMaterial>();
  private textureCache = new Map<Id, THREE.Texture>();
  private shading: ShadingMode = 'solid';
  private unsubscribers: (() => void)[] = [];
  private doc: Document;
  private onChange: () => void;

  constructor(doc: Document, onChange: () => void) {
    this.doc = doc;
    this.onChange = onChange;
    this.group.name = 'Objects';
    this.unsubscribers.push(
      doc.events.on('objectAdded', ({ id }) => this.syncObject(id)),
      doc.events.on('objectChanged', ({ id }) => this.syncObject(id)),
      doc.events.on('objectRemoved', ({ id }) => this.removeObject(id)),
      doc.events.on('meshChanged', ({ meshId }) => this.syncByMeshId(meshId)),
      doc.events.on('materialChanged', ({ id }) => this.syncByMaterialId(id)),
    );
  }

  getEntry(objectId: string): Entry | undefined {
    return this.entries.get(objectId);
  }

  allEntries(): IterableIterator<[string, Entry]> {
    return this.entries.entries();
  }

  syncAll(): void {
    for (const id of this.doc.objects.keys()) {
      this.syncObject(id);
    }
    this.onChange();
  }

  setShading(mode: ShadingMode): void {
    this.shading = mode;
    this.material.wireframe = mode === 'wireframe';
    for (const mat of this.materialCache.values()) mat.wireframe = mode === 'wireframe';
    for (const entry of this.entries.values()) {
      entry.wireframe.visible = mode === 'solid-wireframe';
    }
    this.onChange();
  }

  dispose(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.entries.forEach(({ mesh, wireframe }) => {
      mesh.geometry.dispose();
      wireframe.geometry.dispose();
    });
    this.material.dispose();
    this.wireframeMaterial.dispose();
    this.materialCache.forEach((m) => m.dispose());
    this.textureCache.forEach((t) => t.dispose());
  }

  private syncByMeshId(meshId: string): void {
    for (const [id, object] of this.doc.objects) {
      if (object.meshId === meshId) this.syncObject(id);
    }
  }

  private syncByMaterialId(materialId: Id): void {
    const mat = this.materialCache.get(materialId);
    const def = this.doc.materials.get(materialId);
    if (mat && def) this.applyMaterialDef(mat, def);
    this.onChange();
  }

  private getThreeMaterial(materialId: Id): THREE.MeshStandardMaterial {
    const def = this.doc.materials.get(materialId);
    if (!def) return this.material;
    let mat = this.materialCache.get(materialId);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({ wireframe: this.shading === 'wireframe' });
      this.materialCache.set(materialId, mat);
    }
    this.applyMaterialDef(mat, def);
    return mat;
  }

  private applyMaterialDef(mat: THREE.MeshStandardMaterial, def: MaterialDef): void {
    mat.color.setRGB(def.baseColor[0], def.baseColor[1], def.baseColor[2]);
    mat.opacity = def.baseColor[3];
    mat.transparent = def.baseColor[3] < 1;
    mat.metalness = def.metallic;
    mat.roughness = def.roughness;
    mat.emissive.setRGB(def.emissive[0], def.emissive[1], def.emissive[2]);
    mat.map = def.maps.baseColor ? this.ensureTexture(def.maps.baseColor, def) : null;
    mat.needsUpdate = true;
  }

  private ensureTexture(textureId: Id, def: MaterialDef): THREE.Texture {
    let tex = this.textureCache.get(textureId);
    if (!tex) {
      tex = new THREE.Texture();
      tex.colorSpace = THREE.SRGBColorSpace;
      this.textureCache.set(textureId, tex);
      const data = this.doc.textureData.get(textureId);
      if (data) {
        const bytes = new Uint8Array(data);
        createImageBitmap(new Blob([bytes]))
          .then((bitmap) => {
            tex!.image = bitmap;
            tex!.needsUpdate = true;
            this.onChange();
          })
          .catch(() => {
            /* corrupt/unsupported image: leave the texture blank */
          });
      }
    }
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(def.uvTransform.tiling.x, def.uvTransform.tiling.y);
    tex.offset.set(def.uvTransform.offset.x, def.uvTransform.offset.y);
    tex.rotation = THREE.MathUtils.degToRad(def.uvTransform.rotationDeg);
    return tex;
  }

  private syncObject(id: string): void {
    const object = this.doc.objects.get(id);
    if (!object || object.kind !== 'mesh' || !object.meshId) {
      this.removeObject(id);
      return;
    }
    const editableMesh = this.doc.meshes.get(object.meshId);
    if (!editableMesh) return;

    let entry = this.entries.get(id);
    const { geometry, triangleFaceMap } = buildGeometry(editableMesh);
    // Index 0 is always the fallback material (see buildGeometry); real
    // slots follow in the same order as `materialSlots`.
    const meshMaterial: THREE.Material[] = [
      this.material,
      ...editableMesh.materialSlots.map((matId) => this.getThreeMaterial(matId)),
    ];

    if (!entry) {
      const mesh = new THREE.Mesh(geometry, meshMaterial);
      const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), this.wireframeMaterial);
      wireframe.visible = this.shading === 'solid-wireframe';
      mesh.add(wireframe);
      entry = { mesh, wireframe, editableMesh, triangleFaceMap };
      this.entries.set(id, entry);
      this.group.add(mesh);
    } else {
      entry.mesh.geometry.dispose();
      entry.mesh.geometry = geometry;
      entry.mesh.material = meshMaterial;
      entry.wireframe.geometry.dispose();
      entry.wireframe.geometry = new THREE.WireframeGeometry(geometry);
      entry.editableMesh = editableMesh;
      entry.triangleFaceMap = triangleFaceMap;
    }
    entry.mesh.name = object.name;
    applyTransform(entry.mesh, object);
    this.onChange();
  }

  private removeObject(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.group.remove(entry.mesh);
    entry.mesh.geometry.dispose();
    entry.wireframe.geometry.dispose();
    this.entries.delete(id);
    this.onChange();
  }
}
