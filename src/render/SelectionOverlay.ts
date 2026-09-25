import * as THREE from 'three';
import type { EditableMesh } from '../geometry/EditableMesh';
import { triangulateFace } from '../geometry/triangulate';
import type { SelectMode } from '../selection/Selection';

const OVERLAY_NAME = 'SelectionOverlay';

const baseVertexMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 5, sizeAttenuation: false });
const selectedVertexMaterial = new THREE.PointsMaterial({ color: 0xff9933, size: 8, sizeAttenuation: false });
const baseEdgeMaterial = new THREE.LineBasicMaterial({ color: 0xcccccc });
const selectedEdgeMaterial = new THREE.LineBasicMaterial({ color: 0xff9933 });
const seamMaterial = new THREE.LineBasicMaterial({ color: 0xdd2222, linewidth: 2 });
const selectedFaceMaterial = new THREE.MeshBasicMaterial({
  color: 0xff9933,
  transparent: true,
  opacity: 0.45,
  depthTest: true,
  side: THREE.DoubleSide,
});

function positionsAttribute(points: THREE.Vector3[]): THREE.Float32BufferAttribute {
  const flat = new Float32Array(points.length * 3);
  points.forEach((p, i) => {
    flat[i * 3] = p.x;
    flat[i * 3 + 1] = p.y;
    flat[i * 3 + 2] = p.z;
  });
  return new THREE.Float32BufferAttribute(flat, 3);
}

/** Rebuilds the vertex/edge/face selection overlay as a child of `hostMesh`, replacing any previous one. */
export function updateSelectionOverlay(
  hostMesh: THREE.Mesh,
  mesh: EditableMesh,
  mode: SelectMode,
  selected: ReadonlySet<number>,
): void {
  const previous = hostMesh.getObjectByName(OVERLAY_NAME);
  if (previous) {
    hostMesh.remove(previous);
    previous.traverse((obj) => {
      if (obj instanceof THREE.Points || obj instanceof THREE.LineSegments || obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
  }
  if (mode === 'object') return;

  const group = new THREE.Group();
  group.name = OVERLAY_NAME;
  group.renderOrder = 10;

  if (mode === 'vertex') {
    const all: THREE.Vector3[] = [];
    const sel: THREE.Vector3[] = [];
    for (let v = 0; v < mesh.vertexCount; v++) {
      const p = mesh.vertexPosition(v);
      const vec = new THREE.Vector3(p.x, p.y, p.z);
      (selected.has(v) ? sel : all).push(vec);
    }
    const allGeom = new THREE.BufferGeometry();
    allGeom.setAttribute('position', positionsAttribute(all));
    group.add(new THREE.Points(allGeom, baseVertexMaterial));
    if (sel.length) {
      const selGeom = new THREE.BufferGeometry();
      selGeom.setAttribute('position', positionsAttribute(sel));
      group.add(new THREE.Points(selGeom, selectedVertexMaterial));
    }
  } else if (mode === 'edge') {
    const all: THREE.Vector3[] = [];
    const sel: THREE.Vector3[] = [];
    for (const edge of mesh.edges()) {
      const pa = mesh.vertexPosition(edge.a);
      const pb = mesh.vertexPosition(edge.b);
      const target = selected.has(edge.id) ? sel : all;
      target.push(new THREE.Vector3(pa.x, pa.y, pa.z), new THREE.Vector3(pb.x, pb.y, pb.z));
    }
    const allGeom = new THREE.BufferGeometry();
    allGeom.setAttribute('position', positionsAttribute(all));
    group.add(new THREE.LineSegments(allGeom, baseEdgeMaterial));
    if (sel.length) {
      const selGeom = new THREE.BufferGeometry();
      selGeom.setAttribute('position', positionsAttribute(sel));
      group.add(new THREE.LineSegments(selGeom, selectedEdgeMaterial));
    }
  } else if (mode === 'face' && selected.size) {
    const points: THREE.Vector3[] = [];
    for (const f of selected) {
      const verts = mesh.faceVertices(f);
      const triangles = triangulateFace(verts.length);
      for (const [a, b, c] of triangles) {
        for (const i of [a, b, c]) {
          const p = mesh.vertexPosition(verts[i]);
          points.push(new THREE.Vector3(p.x, p.y, p.z));
        }
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', positionsAttribute(points));
    group.add(new THREE.Mesh(geom, selectedFaceMaterial));
  }

  if (mesh.seamEdges.size > 0) {
    const seamPoints: THREE.Vector3[] = [];
    for (const edge of mesh.edges()) {
      if (!mesh.seamEdges.has(edge.id)) continue;
      const pa = mesh.vertexPosition(edge.a);
      const pb = mesh.vertexPosition(edge.b);
      seamPoints.push(new THREE.Vector3(pa.x, pa.y, pa.z), new THREE.Vector3(pb.x, pb.y, pb.z));
    }
    if (seamPoints.length) {
      const seamGeom = new THREE.BufferGeometry();
      seamGeom.setAttribute('position', positionsAttribute(seamPoints));
      group.add(new THREE.LineSegments(seamGeom, seamMaterial));
    }
  }

  hostMesh.add(group);
}
