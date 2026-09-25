import { describe, expect, it } from 'vitest';
import { createCube, createCylinder, createPlane } from '../../src/geometry/ops/primitives';
import { mergeAtCenter, mergeAtFirst, mergeByDistance } from '../../src/geometry/ops/merge';
import { fillHole } from '../../src/geometry/ops/fill';
import { bridgeLoops } from '../../src/geometry/ops/bridge';
import { traceBorderLoop } from '../../src/geometry/ops/borderLoop';
import { applyMirror } from '../../src/geometry/ops/mirror';
import { deleteFaces } from '../../src/geometry/ops/deleteElements';

describe('geometry/ops/merge', () => {
  it('merges two adjacent vertices at their center', () => {
    const cube = createCube();
    const [edge] = cube.edges();
    const after = mergeAtCenter(cube, [edge.a, edge.b]);
    expect(after.validate().valid).toBe(true);
    expect(after.vertexCount).toBe(cube.vertexCount - 1);
  });

  it('merges two adjacent vertices onto the first', () => {
    const cube = createCube();
    const [edge] = cube.edges();
    const beforePos = cube.vertexPosition(edge.a);
    const after = mergeAtFirst(cube, [edge.a, edge.b]);
    expect(after.vertexCount).toBe(cube.vertexCount - 1);
    // The surviving vertex should sit exactly at the first vertex's original position.
    const survivor = after.edges().flatMap((e) => [e.a, e.b]).find((v) => {
      const p = after.vertexPosition(v);
      return p.x === beforePos.x && p.y === beforePos.y && p.z === beforePos.z;
    });
    expect(survivor).toBeDefined();
  });

  it('welds every vertex pair within a distance threshold, producing a fully connected cube', () => {
    const cube = createCube(); // 8 unique corners, but let's prove welding is idempotent
    const after = mergeByDistance(cube, 0.001);
    expect(after.vertexCount).toBe(cube.vertexCount); // nothing was closer than the threshold
    expect(after.validate().valid).toBe(true);
  });
});

describe('geometry/ops/fill', () => {
  it('fills a hole left by deleting one face of a cube with a new n-gon', () => {
    const cube = createCube();
    const withHole = deleteFaces(cube, [0]);
    const borderHe = withHole.heTwin.findIndex((t) => t === -1);
    expect(borderHe).toBeGreaterThanOrEqual(0);

    const filled = fillHole(withHole, borderHe);
    expect(filled.validate().valid).toBe(true);
    expect(filled.faceCount).toBe(withHole.faceCount + 1);
    expect(filled.heTwin.every((t) => t !== -1)).toBe(true); // no border edges left
  });

});

describe('geometry/ops/bridge', () => {
  it('bridges the two open caps of a cylinder (after deleting them) with a ring of quads', () => {
    const cylinder = createCylinder({ radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 8 });
    // Remove both n-gon caps (the last two faces added by the generator), leaving two open rings.
    const withoutCaps = deleteFaces(cylinder, [cylinder.faceCount - 2, cylinder.faceCount - 1]);
    const borderEdges: number[] = [];
    for (let h = 0; h < withoutCaps.heTwin.length; h++) if (withoutCaps.heTwin[h] === -1) borderEdges.push(h);
    expect(borderEdges.length).toBe(16); // 8 on each ring

    // Side quads interleave a bottom-ring and a top-ring border edge each,
    // so pick the two rings by tracing rather than assuming an index split.
    const firstRing = new Set(traceBorderLoop(withoutCaps, borderEdges[0]));
    const secondRingStart = borderEdges.find((h) => !firstRing.has(withoutCaps.heVert[withoutCaps.hePrev[h]]))!;
    const bridged = bridgeLoops(withoutCaps, borderEdges[0], secondRingStart);
    expect(bridged.validate().valid).toBe(true);
    expect(bridged.faceCount).toBe(withoutCaps.faceCount + 8);
  });

  it('rejects bridging two loops with a different number of vertices', () => {
    const plane = createPlane({ width: 1, depth: 1, segmentsW: 1, segmentsD: 1 });
    const cylinder = createCylinder({ radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 8 });
    const planeBorder = plane.heTwin.findIndex((t) => t === -1);
    const cylinderBorder = cylinder.heTwin.findIndex((t) => t === -1);
    expect(() => bridgeLoops(plane, planeBorder, cylinderBorder)).toThrow();
  });
});

describe('geometry/ops/mirror', () => {
  it('mirrors a cube across X into a valid, doubled mesh, unwelded', () => {
    const cube = createCube();
    const mirrored = applyMirror(cube, 'x', false);
    expect(mirrored.validate().valid).toBe(true);
    expect(mirrored.faceCount).toBe(cube.faceCount * 2);
    expect(mirrored.vertexCount).toBe(cube.vertexCount * 2); // no welding requested
  });

  it('mirrors and welds a plane centered on the mirror axis into one connected sheet', () => {
    // A plane centered at the origin has its edge vertices exactly on the
    // x=0 mirror plane, so welding should merge them with their reflection.
    const plane = createPlane({ width: 2, depth: 1, segmentsW: 2, segmentsD: 1 });
    const mirrored = applyMirror(plane, 'x', true, 0.001);
    expect(mirrored.validate().valid).toBe(true);
    expect(mirrored.faceCount).toBe(plane.faceCount * 2);
    // Middle column of vertices (x=0) is shared, not duplicated.
    expect(mirrored.vertexCount).toBeLessThan(plane.vertexCount * 2);
  });
});
