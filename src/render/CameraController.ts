import * as THREE from 'three';
import type { QuickView } from '../ui/store/useViewStore';

const MIN_DISTANCE = 0.1;
const MAX_DISTANCE = 1000;
const ORBIT_SPEED = 0.01;
const PAN_SPEED = 0.0025;
const ZOOM_SPEED = 0.0015;

/**
 * Blender/Unity-style orbit camera: middle mouse orbits, Alt+left (or
 * middle-drag) pans, wheel zooms. Drives both a perspective and an
 * orthographic camera kept in sync so quick views can switch projection.
 */
export class CameraController {
  readonly perspective: THREE.PerspectiveCamera;
  readonly orthographic: THREE.OrthographicCamera;
  target = new THREE.Vector3(0, 0, 0);

  private spherical = new THREE.Spherical(8, Math.PI / 3, Math.PI / 4);
  private domElement: HTMLElement;
  private isOrbiting = false;
  private isPanning = false;
  private lastX = 0;
  private lastY = 0;
  private useOrthographic = false;
  private orthoZoom = 8;
  private onChange?: () => void;

  constructor(domElement: HTMLElement, onChange?: () => void) {
    this.domElement = domElement;
    this.onChange = onChange;
    const aspect = domElement.clientWidth / Math.max(1, domElement.clientHeight);
    this.perspective = new THREE.PerspectiveCamera(50, aspect, 0.01, 5000);
    this.orthographic = new THREE.OrthographicCamera(-8 * aspect, 8 * aspect, 8, -8, 0.01, 5000);
    this.updateCameraPosition();

    domElement.addEventListener('pointerdown', this.onPointerDown);
    domElement.addEventListener('pointermove', this.onPointerMove);
    domElement.addEventListener('pointerup', this.onPointerUp);
    domElement.addEventListener('pointerleave', this.onPointerUp);
    domElement.addEventListener('wheel', this.onWheel, { passive: false });
    domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  get camera(): THREE.Camera {
    return this.useOrthographic ? this.orthographic : this.perspective;
  }

  setOrthographic(value: boolean): void {
    this.useOrthographic = value;
  }

  dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('pointerleave', this.onPointerUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
  }

  handleResize(width: number, height: number): void {
    const aspect = width / Math.max(1, height);
    this.perspective.aspect = aspect;
    this.perspective.updateProjectionMatrix();
    this.orthographic.left = -this.orthoZoom * aspect;
    this.orthographic.right = this.orthoZoom * aspect;
    this.orthographic.top = this.orthoZoom;
    this.orthographic.bottom = -this.orthoZoom;
    this.orthographic.updateProjectionMatrix();
    this.onChange?.();
  }

  frameAll(radius: number): void {
    this.spherical.radius = Math.max(radius * 2.2, MIN_DISTANCE);
    this.target.set(0, 0, 0);
    this.updateCameraPosition();
  }

  setQuickView(view: QuickView): void {
    this.useOrthographic = view !== 'perspective';
    switch (view) {
      case 'front':
        this.spherical.phi = Math.PI / 2;
        this.spherical.theta = 0;
        break;
      case 'side':
        this.spherical.phi = Math.PI / 2;
        this.spherical.theta = Math.PI / 2;
        break;
      case 'top':
        this.spherical.phi = 0.0001;
        this.spherical.theta = 0;
        break;
      case 'perspective':
        this.spherical.phi = Math.PI / 3;
        this.spherical.theta = Math.PI / 4;
        break;
    }
    this.updateCameraPosition();
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.domElement.setPointerCapture(e.pointerId);
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    const isMiddle = e.button === 1;
    const isAltLeft = e.button === 0 && e.altKey;
    if ((isMiddle || isAltLeft) && e.shiftKey) {
      this.isPanning = true;
    } else if (isMiddle || isAltLeft) {
      this.isOrbiting = true;
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    if (this.isOrbiting) {
      this.spherical.theta -= dx * ORBIT_SPEED;
      this.spherical.phi = THREE.MathUtils.clamp(
        this.spherical.phi - dy * ORBIT_SPEED,
        0.001,
        Math.PI - 0.001,
      );
      this.updateCameraPosition();
    } else if (this.isPanning) {
      const distance = this.useOrthographic ? this.orthoZoom : this.spherical.radius;
      const panScale = distance * PAN_SPEED;
      const cam = this.camera as THREE.PerspectiveCamera;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      cam.matrixWorld.extractBasis(right, up, new THREE.Vector3());
      this.target.addScaledVector(right, -dx * panScale);
      this.target.addScaledVector(up, dy * panScale);
      this.updateCameraPosition();
    }
  };

  private onPointerUp = (): void => {
    this.isOrbiting = false;
    this.isPanning = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = 1 + Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY) * ZOOM_SPEED, 0.5);
    if (this.useOrthographic) {
      this.orthoZoom = THREE.MathUtils.clamp(this.orthoZoom * factor, MIN_DISTANCE, MAX_DISTANCE);
      this.handleResize(this.domElement.clientWidth, this.domElement.clientHeight);
    } else {
      this.spherical.radius = THREE.MathUtils.clamp(
        this.spherical.radius * factor,
        MIN_DISTANCE,
        MAX_DISTANCE,
      );
      this.updateCameraPosition();
    }
  };

  private updateCameraPosition(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.perspective.position.copy(this.target).add(offset);
    this.perspective.lookAt(this.target);
    this.orthographic.position.copy(this.target).add(offset);
    this.orthographic.lookAt(this.target);
    this.onChange?.();
  }
}
