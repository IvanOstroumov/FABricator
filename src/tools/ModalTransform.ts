import * as THREE from 'three';
import type { Document, SceneObject } from '../core/Document';
import type { EditableMesh } from '../geometry/EditableMesh';
import { PropertyCommand } from '../commands/PropertyCommand';
import { MeshEditCommand } from '../commands/MeshEditCommand';
import type { Command } from '../commands/Command';
import type { CameraController } from '../render/CameraController';

export type ModalKind = 'move' | 'rotate' | 'scale';
export type Axis = 'x' | 'y' | 'z' | null;

const AXIS_VECTORS: Record<'x' | 'y' | 'z', THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

interface Target {
  objectId: string;
  object: SceneObject;
  /** Non-null when editing vertex/edge/face components of this object's mesh. */
  mesh?: EditableMesh;
  meshId?: string;
  vertexIndices?: number[];
}

/**
 * Blender-style modal transform: mouse drag with optional X/Y/Z axis lock
 * and numeric override, confirmed with click/Enter or cancelled with
 * right-click/Esc. Operates either on a whole object's transform, or
 * directly on the positions of a component-level (vertex/edge/face)
 * selection of the object being edited.
 */
export class ModalTransform {
  private active = false;
  private kind: ModalKind = 'move';
  private axis: Axis = null;
  private startX = 0;
  private startY = 0;
  private numericInput = '';
  private target: Target | null = null;
  private beforeTransform: SceneObject['transform'] | null = null;
  private beforePositions: number[] | null = null;
  private pivot = new THREE.Vector3();

  get isActive(): boolean {
    return this.active;
  }

  get statusText(): string {
    if (!this.active) return '';
    const kindLabel = { move: 'Sposta', rotate: 'Ruota', scale: 'Scala' }[this.kind];
    const axisLabel = this.axis ? ` [${this.axis.toUpperCase()}]` : '';
    const numeric = this.numericInput ? ` ${this.numericInput}` : '';
    return `${kindLabel}${axisLabel}${numeric} — Invio/clic conferma, Esc annulla`;
  }

  begin(kind: ModalKind, target: Target, startX: number, startY: number): void {
    this.active = true;
    this.kind = kind;
    this.axis = null;
    this.numericInput = '';
    this.startX = startX;
    this.startY = startY;
    this.target = target;

    if (target.mesh && target.vertexIndices?.length) {
      this.beforePositions = [...target.mesh.positions];
      this.beforeTransform = null;
      const centroid = new THREE.Vector3();
      for (const v of target.vertexIndices) {
        const p = target.mesh.vertexPosition(v);
        centroid.add(new THREE.Vector3(p.x, p.y, p.z));
      }
      centroid.divideScalar(target.vertexIndices.length);
      this.pivot = centroid;
    } else {
      this.beforeTransform = structuredClone(target.object.transform);
      this.beforePositions = null;
    }
  }

  setAxis(axis: Axis): void {
    if (!this.active) return;
    this.axis = this.axis === axis ? null : axis;
  }

  appendDigit(ch: string): void {
    if (!this.active) return;
    if (ch === '-' && this.numericInput.includes('-')) return;
    if (ch === '.' && this.numericInput.includes('.')) return;
    this.numericInput += ch;
  }

  backspaceDigit(): void {
    this.numericInput = this.numericInput.slice(0, -1);
  }

  update(
    doc: Document,
    camera: THREE.Camera,
    cameraController: CameraController,
    mouseX: number,
    mouseY: number,
    snapEnabled: boolean,
    gridSnap: number,
    rotationSnapDeg: number,
  ): void {
    if (!this.active || !this.target) return;
    const dx = mouseX - this.startX;
    const dy = mouseY - this.startY;

    if (this.kind === 'move') {
      const delta = this.numericInput
        ? this.axisVector().multiplyScalar(parseFloat(this.numericInput) || 0)
        : this.screenDeltaToWorldMove(camera, cameraController, dx, dy);
      if (snapEnabled && gridSnap > 0) {
        delta.set(
          Math.round(delta.x / gridSnap) * gridSnap,
          Math.round(delta.y / gridSnap) * gridSnap,
          Math.round(delta.z / gridSnap) * gridSnap,
        );
      }
      this.applyMove(doc, delta);
    } else if (this.kind === 'rotate') {
      let deg = this.numericInput ? parseFloat(this.numericInput) || 0 : dx * 0.5;
      if (snapEnabled && rotationSnapDeg > 0) deg = Math.round(deg / rotationSnapDeg) * rotationSnapDeg;
      this.applyRotate(doc, deg);
    } else {
      const factor = this.numericInput ? parseFloat(this.numericInput) || 1 : 1 + dx * 0.01;
      this.applyScale(doc, factor);
    }
  }

  /** Commits the drag as a single undoable command, or a no-op if cancel. */
  confirm(doc: Document, run: (cmd: Command) => void): void {
    if (!this.active || !this.target) return this.reset();
    const label = { move: 'Sposta', rotate: 'Ruota', scale: 'Scala' }[this.kind];

    if (this.target.mesh && this.target.meshId && this.beforePositions) {
      const after = [...this.target.mesh.positions];
      this.target.mesh.positions = [...this.beforePositions];
      doc.notifyMeshChanged(this.target.meshId, 'positions');
      run(new MeshEditCommand(label, this.target.meshId, this.beforePositions, after));
    } else if (this.beforeTransform) {
      const after = structuredClone(this.target.object.transform);
      this.target.object.transform = structuredClone(this.beforeTransform);
      doc.touchObject(this.target.objectId);
      run(new PropertyCommand(label, this.target.objectId, { transform: after }));
    }
    this.reset();
  }

  cancel(doc: Document): void {
    if (!this.active || !this.target) return this.reset();
    if (this.target.mesh && this.target.meshId && this.beforePositions) {
      this.target.mesh.positions = [...this.beforePositions];
      doc.notifyMeshChanged(this.target.meshId, 'positions');
    } else if (this.beforeTransform) {
      this.target.object.transform = structuredClone(this.beforeTransform);
      doc.touchObject(this.target.objectId);
    }
    this.reset();
  }

  private reset(): void {
    this.active = false;
    this.target = null;
    this.beforeTransform = null;
    this.beforePositions = null;
    this.numericInput = '';
    this.axis = null;
  }

  private axisVector(): THREE.Vector3 {
    return this.axis ? AXIS_VECTORS[this.axis].clone() : new THREE.Vector3(1, 0, 0);
  }

  private screenDeltaToWorldMove(
    camera: THREE.Camera,
    cameraController: CameraController,
    dx: number,
    dy: number,
  ): THREE.Vector3 {
    const distance = cameraController.target.distanceTo(
      (camera as THREE.PerspectiveCamera).position ?? new THREE.Vector3(),
    );
    const scale = Math.max(distance, 1) * 0.0025;
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());
    const world = new THREE.Vector3().addScaledVector(right, dx * scale).addScaledVector(up, -dy * scale);
    if (this.axis) {
      const axisVec = AXIS_VECTORS[this.axis];
      const magnitude = world.dot(axisVec);
      return axisVec.clone().multiplyScalar(magnitude * 4);
    }
    return world;
  }

  private applyMove(doc: Document, delta: THREE.Vector3): void {
    if (!this.target) return;
    if (this.target.mesh && this.target.vertexIndices && this.beforePositions && this.target.meshId) {
      this.target.mesh.positions = [...this.beforePositions];
      for (const v of this.target.vertexIndices) {
        this.target.mesh.positions[v * 3] += delta.x;
        this.target.mesh.positions[v * 3 + 1] += delta.y;
        this.target.mesh.positions[v * 3 + 2] += delta.z;
      }
      doc.notifyMeshChanged(this.target.meshId, 'positions');
    } else if (this.beforeTransform) {
      this.target.object.transform.position = {
        x: this.beforeTransform.position.x + delta.x,
        y: this.beforeTransform.position.y + delta.y,
        z: this.beforeTransform.position.z + delta.z,
      };
      doc.touchObject(this.target.objectId);
    }
  }

  private applyRotate(doc: Document, degrees: number): void {
    if (!this.target) return;
    const axis = this.axis ? AXIS_VECTORS[this.axis] : new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(degrees));

    if (this.target.mesh && this.target.vertexIndices && this.beforePositions && this.target.meshId) {
      this.target.mesh.positions = [...this.beforePositions];
      for (const v of this.target.vertexIndices) {
        const p = new THREE.Vector3(
          this.beforePositions[v * 3],
          this.beforePositions[v * 3 + 1],
          this.beforePositions[v * 3 + 2],
        )
          .sub(this.pivot)
          .applyQuaternion(quat)
          .add(this.pivot);
        this.target.mesh.positions[v * 3] = p.x;
        this.target.mesh.positions[v * 3 + 1] = p.y;
        this.target.mesh.positions[v * 3 + 2] = p.z;
      }
      doc.notifyMeshChanged(this.target.meshId, 'positions');
    } else if (this.beforeTransform) {
      const before = new THREE.Quaternion(
        this.beforeTransform.rotation.x,
        this.beforeTransform.rotation.y,
        this.beforeTransform.rotation.z,
        this.beforeTransform.rotation.w,
      );
      const after = quat.multiply(before);
      this.target.object.transform.rotation = { x: after.x, y: after.y, z: after.z, w: after.w };
      doc.touchObject(this.target.objectId);
    }
  }

  private applyScale(doc: Document, factor: number): void {
    if (!this.target) return;
    const scaleVec = this.axis
      ? new THREE.Vector3(
          this.axis === 'x' ? factor : 1,
          this.axis === 'y' ? factor : 1,
          this.axis === 'z' ? factor : 1,
        )
      : new THREE.Vector3(factor, factor, factor);

    if (this.target.mesh && this.target.vertexIndices && this.beforePositions && this.target.meshId) {
      this.target.mesh.positions = [...this.beforePositions];
      for (const v of this.target.vertexIndices) {
        const p = new THREE.Vector3(
          this.beforePositions[v * 3],
          this.beforePositions[v * 3 + 1],
          this.beforePositions[v * 3 + 2],
        )
          .sub(this.pivot)
          .multiply(scaleVec)
          .add(this.pivot);
        this.target.mesh.positions[v * 3] = p.x;
        this.target.mesh.positions[v * 3 + 1] = p.y;
        this.target.mesh.positions[v * 3 + 2] = p.z;
      }
      doc.notifyMeshChanged(this.target.meshId, 'positions');
    } else if (this.beforeTransform) {
      this.target.object.transform.scale = {
        x: this.beforeTransform.scale.x * scaleVec.x,
        y: this.beforeTransform.scale.y * scaleVec.y,
        z: this.beforeTransform.scale.z * scaleVec.z,
      };
      doc.touchObject(this.target.objectId);
    }
  }
}
