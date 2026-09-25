import * as THREE from 'three';

/**
 * Ground grid plus X (red) / Z (blue) axis lines, per F-01.
 */
export function createGrid(size = 100, divisions = 100): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Grid';

  const grid = new THREE.GridHelper(size, divisions, 0x888888, 0x4a4a4a);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.6;
  // A GridHelper's bounding sphere is centered at the origin with radius
  // ~size, which some oblique camera angles miss due to Frustum culling
  // treating it as a thin, easily-clipped disc. It's cheap to always draw.
  grid.frustumCulled = false;
  group.add(grid);

  const axisLength = size / 2;
  const xAxis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-axisLength, 0, 0),
      new THREE.Vector3(axisLength, 0, 0),
    ]),
    new THREE.LineBasicMaterial({ color: 0xdd4444 }),
  );
  xAxis.frustumCulled = false;
  const zAxis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -axisLength),
      new THREE.Vector3(0, 0, axisLength),
    ]),
    new THREE.LineBasicMaterial({ color: 0x4477dd }),
  );
  zAxis.frustumCulled = false;
  group.add(xAxis, zAxis);

  return group;
}
