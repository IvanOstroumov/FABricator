import { describe, expect, it } from 'vitest';
import { createCube } from '../../src/geometry/ops/primitives';
import { boxUnwrap } from '../../src/geometry/ops/unwrap';

describe('geometry/ops/unwrap (box projection)', () => {
  it('produces a UV pair for every half-edge, without touching topology', () => {
    const cube = createCube();
    const before = [...cube.heUv];
    const after = boxUnwrap(cube);
    expect(after.length).toBe(cube.heUv.length);
    expect(after).not.toEqual(before); // the default UVs are a flat 0..1 square per face; box projection differs
    expect(cube.faceCount).toBe(6); // unaffected
  });

  it('limits itself to the given faces when a subset is passed', () => {
    const cube = createCube();
    const before = [...cube.heUv];
    const after = boxUnwrap(cube, [0]);
    const start = cube.faceHalfEdge[1];
    // Face 1's corners are untouched.
    expect(after[start * 2]).toBe(before[start * 2]);
    expect(after[start * 2 + 1]).toBe(before[start * 2 + 1]);
  });
});
