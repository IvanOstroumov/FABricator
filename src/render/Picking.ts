import * as THREE from 'three';
import type { EditableMesh } from '../geometry/EditableMesh';

export interface PickResult {
  face?: number;
  edge?: number; // canonical edge id, per EditableMesh.edges()
  vertex?: number;
}

const VERTEX_PICK_PX = 10;
const EDGE_PICK_PX = 6;

function toScreen(
  worldPos: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number,
): { x: number; y: number; behind: boolean } {
  const ndc = worldPos.clone().project(camera);
  return {
    x: ((ndc.x + 1) / 2) * width,
    y: ((1 - ndc.y) / 2) * height,
    behind: ndc.z > 1,
  };
}

function distanceToSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const px = a.x + t * dx;
  const py = a.y + t * dy;
  return Math.hypot(p.x - px, p.y - py);
}

/** Screen-space nearest vertex within `VERTEX_PICK_PX`, transforming positions through the object's world matrix. */
export function pickVertex(
  mesh: EditableMesh,
  objectMatrix: THREE.Matrix4,
  camera: THREE.Camera,
  pointer: { x: number; y: number },
  width: number,
  height: number,
): number | undefined {
  let best: { index: number; dist: number } | undefined;
  for (let v = 0; v < mesh.vertexCount; v++) {
    const p = mesh.vertexPosition(v);
    const world = new THREE.Vector3(p.x, p.y, p.z).applyMatrix4(objectMatrix);
    const screen = toScreen(world, camera, width, height);
    if (screen.behind) continue;
    const dist = Math.hypot(screen.x - pointer.x, screen.y - pointer.y);
    if (dist <= VERTEX_PICK_PX && (!best || dist < best.dist)) {
      best = { index: v, dist };
    }
  }
  return best?.index;
}

/** Screen-space nearest edge within `EDGE_PICK_PX`. Returns the canonical edge id from `EditableMesh.edges()`. */
export function pickEdge(
  mesh: EditableMesh,
  objectMatrix: THREE.Matrix4,
  camera: THREE.Camera,
  pointer: { x: number; y: number },
  width: number,
  height: number,
): number | undefined {
  let best: { id: number; dist: number } | undefined;
  for (const edge of mesh.edges()) {
    const pa = mesh.vertexPosition(edge.a);
    const pb = mesh.vertexPosition(edge.b);
    const wa = new THREE.Vector3(pa.x, pa.y, pa.z).applyMatrix4(objectMatrix);
    const wb = new THREE.Vector3(pb.x, pb.y, pb.z).applyMatrix4(objectMatrix);
    const sa = toScreen(wa, camera, width, height);
    const sb = toScreen(wb, camera, width, height);
    if (sa.behind && sb.behind) continue;
    const dist = distanceToSegment(pointer, sa, sb);
    if (dist <= EDGE_PICK_PX && (!best || dist < best.dist)) {
      best = { id: edge.id, dist };
    }
  }
  return best?.id;
}

/** Raycasts against the rendered (triangulated) mesh and maps the hit triangle back to its source face. */
export function pickFace(
  threeMesh: THREE.Mesh,
  triangleFaceMap: number[],
  camera: THREE.Camera,
  pointer: { x: number; y: number },
  width: number,
  height: number,
): number | undefined {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2((pointer.x / width) * 2 - 1, -(pointer.y / height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(threeMesh, false);
  const hit = hits[0];
  if (!hit || hit.faceIndex == null) return undefined;
  return triangleFaceMap[hit.faceIndex];
}
