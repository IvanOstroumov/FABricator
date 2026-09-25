import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CameraController } from './CameraController';
import { createGrid } from './Grid';
import type { ShadingMode, QuickView } from '../ui/store/useViewStore';

/**
 * Owns the Three.js scene and render loop. React only mounts the canvas;
 * this class drives it directly so React re-renders never touch the scene.
 */
export class Renderer {
  readonly scene = new THREE.Scene();
  readonly cameraController: CameraController;
  private webgl: THREE.WebGLRenderer;
  private container: HTMLElement;
  private grid: THREE.Group;
  private resizeObserver: ResizeObserver;
  private needsRender = true;
  private disposed = false;
  private frameCount = 0;
  private lastFpsSample = performance.now();
  private onFps?: (fps: number) => void;

  // Demo content until modelling primitives land in Phase 2.
  private demoMesh: THREE.Mesh;
  private demoWireframe: THREE.LineSegments;

  constructor(container: HTMLElement) {
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

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x7a9cc6, roughness: 0.6, metalness: 0.1 });
    this.demoMesh = new THREE.Mesh(geometry, material);
    this.demoMesh.position.y = 0.5;
    this.scene.add(this.demoMesh);

    this.demoWireframe = new THREE.LineSegments(
      new THREE.WireframeGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0x111111 }),
    );
    this.demoWireframe.position.copy(this.demoMesh.position);
    this.demoWireframe.visible = false;
    this.scene.add(this.demoWireframe);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    this.animate();
  }

  requestRender(): void {
    this.needsRender = true;
  }

  setShading(mode: ShadingMode): void {
    const mat = this.demoMesh.material as THREE.MeshStandardMaterial;
    mat.wireframe = mode === 'wireframe';
    this.demoWireframe.visible = mode === 'solid-wireframe';
    this.requestRender();
  }

  setQuickView(view: QuickView): void {
    this.cameraController.setQuickView(view);
    this.requestRender();
  }

  onFrame(callback: (fps: number) => void): void {
    this.onFps = callback;
  }

  dispose(): void {
    this.disposed = true;
    this.resizeObserver.disconnect();
    this.cameraController.dispose();
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
