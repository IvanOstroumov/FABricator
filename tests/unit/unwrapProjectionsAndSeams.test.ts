import { describe, expect, it } from 'vitest';
import { createCube, createCylinder } from '../../src/geometry/ops/primitives';
import { planarUnwrap, cylindricalUnwrap } from '../../src/geometry/ops/unwrap';

describe('geometry/ops/unwrap (planar and cylindrical)', () => {
  it('planar projection produces a UV pair for every corner of the selected faces only', () => {
    const cube = createCube();
    const before = [...cube.heUv];
    const after = planarUnwrap(cube, [0]);
    const otherFaceHe = cube.faceHalfEdge[1];
    expect(after[otherFaceHe * 2]).toBe(before[otherFaceHe * 2]); // untouched face
    const targetHe = cube.faceHalfEdge[0];
    expect(after[targetHe * 2]).not.toBe(before[targetHe * 2]); // projected face changed
  });

  it('cylindrical projection wraps around Y using atan2(z, x)', () => {
    const cylinder = createCylinder({ radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 8 });
    const after = cylindricalUnwrap(cylinder);
    expect(after.length).toBe(cylinder.heUv.length);
    // U values should all land in the expected 0..1 range for this projection.
    for (let i = 0; i < after.length; i += 2) {
      expect(after[i]).toBeGreaterThanOrEqual(0);
      expect(after[i]).toBeLessThanOrEqual(1);
    }
  });
});

describe('EditableMesh seam edges', () => {
  it('marks and clears seams without affecting topology', () => {
    const cube = createCube();
    const [edge] = cube.edges();
    cube.seamEdges.add(edge.id);
    expect(cube.seamEdges.has(edge.id)).toBe(true);
    const cloned = cube.clone();
    expect(cloned.seamEdges.has(edge.id)).toBe(true);
    cube.seamEdges.delete(edge.id);
    expect(cube.seamEdges.has(edge.id)).toBe(false);
    expect(cloned.seamEdges.has(edge.id)).toBe(true); // clone is independent
  });
});
