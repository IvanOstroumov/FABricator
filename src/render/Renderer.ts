import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CameraController } from './CameraController';
import { createGrid } from './Grid';
import { MeshSync } from './MeshSync';
import { updateSelectionOverlay } from './SelectionOverlay';
import { pickFace, pickEdge, pickVertex } from './Picking';
import type { Document } from '../core/Document';
import type { SelectMode } from '../selection/Selection';
import type { ShadingMode, QuickView } from '../ui/store/useViewStore';

/**
 * Owns the Three.js scene and render loop. React only mounts the canvas;
 * this class drives it directly so React re-renders never touch the scene.
 */
export class Renderer {
  readonly scene = new THREE.Scene();
  readonly cameraController: CameraController;
  readonly meshSync: MeshSync;
  private webgl: THREE.WebGLRenderer;
  private container: HTMLElement;
  private grid: THREE.Group;
  private resizeObserver: ResizeObserver;
  private needsRender = true;
  private disposed = false;
  private frameCount = 0;
  private lastFpsSample = performance.now();
  private onFps?: (fps: number) => void;

  constructor(container: HTMLElement, doc: Document) {
    this.container = container;

    this.webgl = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.webgl.setSize(container.clientWidth, container.clientHeight);
    this.webgl.setClearColor(0x2b2b2f, 1);
    container.appendChild(this.webgl.domElement);

    this.cameraController = new CameraController(this.webgl.domElement, () => this.requestRender());

    const pmrem = new THREE.PMREMGenerator(this.webgl);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const directional = new THREE.DirectionalLight(0xffffff, 1.2);
    directional.position.set(4, 8, 6);
    this.scene.add(directional);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.15));

    this.grid = createGrid();
    this.scene.add(this.grid);

    this.meshSync = new MeshSync(doc, () => this.requestRender());
    this.scene.add(this.meshSync.group);
    this.meshSync.syncAll();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    this.animate();
  }

  requestRender(): void {
    this.needsRender = true;
  }

  setShading(mode: ShadingMode): void {
    this.meshSync.setShading(mode);
  }

  setCheckerboard(enabled: boolean): void {
    this.meshSync.setCheckerboard(enabled);
  }

  setQuickView(view: QuickView): void {
    this.cameraController.setQuickView(view);
    this.requestRender();
  }

  onFrame(callback: (fps: number) => void): void {
    this.onFps = callback;
  }

  setComponentSelection(objectId: string | null, mode: SelectMode, selected: ReadonlySet<number>): void {
    // Clear any stale overlay on every mesh entry, then rebuild only for the object being edited.
    for (const [id, entry] of this.meshSync.allEntries()) {
      if (id !== objectId) updateSelectionOverlay(entry.mesh, entry.editableMesh, 'object', new Set());
    }
    if (!objectId) {
      this.requestRender();
      return;
    }
    const entry = this.meshSync.getEntry(objectId);
    if (!entry) return;
    updateSelectionOverlay(entry.mesh, entry.editableMesh, mode, selected);
    this.requestRender();
  }

  pickObject(pointer: { x: number; y: number }): string | undefined {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2((pointer.x / width) * 2 - 1, -(pointer.y / height) * 2 + 1);
    raycaster.setFromCamera(ndc, this.cameraController.camera);
    const meshes: THREE.Object3D[] = [];
    const idByMesh = new Map<THREE.Object3D, string>();
    for (const [id, entry] of this.meshSync.allEntries()) {
      meshes.push(entry.mesh);
      idByMesh.set(entry.mesh, id);
    }
    const hits = raycaster.intersectObjects(meshes, false);
    return hits[0] ? idByMesh.get(hits[0].object) : undefined;
  }

  pick(
    objectId: string,
    mode: SelectMode,
    pointer: { x: number; y: number },
  ): { face?: number; edge?: number; vertex?: number } {
    const entry = this.meshSync.getEntry(objectId);
    if (!entry) return {};
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const camera = this.cameraController.camera;
    entry.mesh.updateWorldMatrix(true, false);
    if (mode === 'face') {
      return { face: pickFace(entry.mesh, entry.triangleFaceMap, camera, pointer, width, height) };
    }
    if (mode === 'edge') {
      return { edge: pickEdge(entry.editableMesh, entry.mesh.matrixWorld, camera, pointer, width, height) };
    }
    if (mode === 'vertex') {
      return { vertex: pickVertex(entry.editableMesh, entry.mesh.matrixWorld, camera, pointer, width, height) };
    }
    return {};
  }

  dispose(): void {
    this.disposed = true;
    this.resizeObserver.disconnect();
    this.cameraController.dispose();
    this.meshSync.dispose();
    this.webgl.dispose();
    this.container.removeChild(this.webgl.domElement);
  }

  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;
    this.webgl.setSize(width, height);
    this.cameraController.handleResize(width, height);
    this.requestRender();
  }

  private animate = (): void => {
    if (this.disposed) return;
    requestAnimationFrame(this.animate);

    // Render-on-demand: only redraw when something actually changed.
    // Camera dragging calls requestRender() continuously via pointermove.
    if (!this.needsRender) return;
    this.needsRender = false;
    this.webgl.render(this.scene, this.cameraController.camera);

    this.frameCount += 1;
    const now = performance.now();
    if (now - this.lastFpsSample >= 500) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsSample));
      this.frameCount = 0;
      this.lastFpsSample = now;
      this.onFps?.(fps);
    }
  };
}
