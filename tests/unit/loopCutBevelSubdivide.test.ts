import { describe, expect, it } from 'vitest';
import { createCube, createCylinder } from '../../src/geometry/ops/primitives';
import { loopCut } from '../../src/geometry/ops/loopCut';
import { bevelEdge } from '../../src/geometry/ops/bevel';
import { subdivide } from '../../src/geometry/ops/subdivide';

describe('geometry/ops/loopCut', () => {
  it('cuts every side quad of a cylinder ring into two, doubling its face count', () => {
    const cylinder = createCylinder({ radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 8 });
    const loop = cylinder.edgeLoop(3); // a vertical edge, see meshTopology.test.ts
    const before = cylinder.faceCount;
    const after = loopCut(cylinder, loop, 0.5);
    expect(after.validate().valid).toBe(true);
    // 8 side quads -> 16, plus the 2 untouched caps.
    expect(after.faceCount).toBe(before + 8);
  });

  it('cuts a plane grid row without producing degenerate faces', () => {
    const cube = createCube();
    const loop = cube.edgeLoop(0);
    const after = loopCut(cube, loop, 0.5);
    expect(after.validate().valid).toBe(true);
  });
});

describe('geometry/ops/bevel', () => {
  it('bevels an interior edge of a cube into a valid mesh with extra strip + corner faces', () => {
    const cube = createCube();
    const [edge] = cube.edges();
    const before = cube.faceCount;
    const after = bevelEdge(cube, edge.id, 0.1);
    expect(after.validate().valid).toBe(true);
    // 4 untouched + 2 modified + 1 strip + 2 corner triangles = 9.
    expect(after.faceCount).toBe(before + 3);
  });

  it('rejects a bevel on a border edge (open mesh boundary)', () => {
    const cylinder = createCylinder({ radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 8 });
    // The bottom cap's own rim edges, as seen from a side quad crossing
    // into the boundary, aren't a good test; instead build a mesh with a
    // real open border via a bare plane-like single quad has none either
    // (all its edges are borders). Use one of the cap's own edges, which
    // borders the cap n-gon and nothing else on one side is not
    // representative either — assert instead that a genuinely borderless
    // edge (interior, both faces present) does NOT throw, which the cube
    // test above already covers; here we just check the guard fires for
    // an edge whose twin is absent by constructing one directly.
    const solitary = cylinder.addFace(
      [cylinder.addVertex({ x: 5, y: 0, z: 0 }), cylinder.addVertex({ x: 6, y: 0, z: 0 }), cylinder.addVertex({ x: 6, y: 1, z: 0 })],
      [
        [0, 0],
        [1, 0],
        [1, 1],
      ],
    );
    const borderHe = cylinder.faceHalfEdge[solitary];
    expect(() => bevelEdge(cylinder, borderHe, 0.1)).toThrow();
  });
});

describe('geometry/ops/subdivide', () => {
  it('subdivides a cube into 4 quads per face', () => {
    const cube = createCube();
    const after = subdivide(cube);
    expect(after.validate().valid).toBe(true);
    expect(after.faceCount).toBe(6 * 4);
  });

  it('subdivides a cylinder into a valid, denser mesh', () => {
    const cylinder = createCylinder({ radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 8 });
    const before = cylinder.faceCount;
    const after = subdivide(cylinder);
    expect(after.validate().valid).toBe(true);
    expect(after.faceCount).toBeGreaterThan(before);
  });
});
