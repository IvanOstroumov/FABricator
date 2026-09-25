import * as THREE from 'three';
import type { Document, SceneObject } from '../core/Document';
import type { EditableMesh } from '../geometry/EditableMesh';
import { triangulateFace } from '../geometry/triangulate';
import type { ShadingMode } from '../ui/store/useViewStore';

interface Entry {
  mesh: THREE.Mesh;
  wireframe: THREE.LineSegments;
}

function buildGeometry(mesh: EditableMesh): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  for (let f = 0; f < mesh.faceCount; f++) {
    const verts = mesh.faceVertices(f);
    const faceUvs = mesh.faceUvs(f);
    const normal = mesh.faceNormal(f);
    const triangles = triangulateFace(verts.length);
    for (const [a, b, c] of triangles) {
      for (const i of [a, b, c]) {
        const p = mesh.vertexPosition(verts[i]);
        positions.push(p.x, p.y, p.z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(faceUvs[i][0], faceUvs[i][1]);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return geometry;
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
 */
export class MeshSync {
  readonly group = new THREE.Group();
  private entries = new Map<string, Entry>();
  private material = new THREE.MeshStandardMaterial({ color: 0x7a9cc6, roughness: 0.6, metalness: 0.1 });
  private wireframeMaterial = new THREE.LineBasicMaterial({ color: 0x111111 });
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
    );
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
  }

  private syncByMeshId(meshId: string): void {
    for (const [id, object] of this.doc.objects) {
      if (object.meshId === meshId) this.syncObject(id);
    }
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
    const geometry = buildGeometry(editableMesh);
    if (!entry) {
      const mesh = new THREE.Mesh(geometry, this.material);
      const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), this.wireframeMaterial);
      wireframe.visible = this.shading === 'solid-wireframe';
      mesh.add(wireframe);
      entry = { mesh, wireframe };
      this.entries.set(id, entry);
      this.group.add(mesh);
    } else {
      entry.mesh.geometry.dispose();
      entry.mesh.geometry = geometry;
      entry.wireframe.geometry.dispose();
      entry.wireframe.geometry = new THREE.WireframeGeometry(geometry);
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
