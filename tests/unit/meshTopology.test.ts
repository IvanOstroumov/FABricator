import { describe, expect, it } from 'vitest';
import { createCube, createCylinder, createPlane } from '../../src/geometry/ops/primitives';
import { expandSelectionToVertices } from '../../src/selection/Selection';

describe('EditableMesh topology queries', () => {
  it('enumerates each edge exactly once', () => {
    const cube = createCube();
    // Euler: V - E + F = 2 => 8 - E + 6 = 2 => E = 12.
    const edges = cube.edges();
    const ids = new Set(edges.map((e) => e.id));
    expect(ids.size).toBe(edges.length);
    expect(edges.length).toBe(12);
  });

  it('walks a full edge loop around a cylinder ring (one edge per side quad)', () => {
    const radialSegments = 8;
    const cylinder = createCylinder({ radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments });
    // Half-edge 3 is side-quad 0's "left" vertical edge (addFace order is
    // [bl, br, tr, tl], so index 3 = tl->bl); starting from a vertical
    // edge walks the ring around the tube, one edge per side quad.
    const loop = cylinder.edgeLoop(3);
    expect(loop.length).toBe(radialSegments);
    expect(new Set(loop).size).toBe(loop.length);
  });

  it('walks a full row loop across an open plane grid, in both directions from the start edge', () => {
    // A 4x3 grid of quads: the loop across one row crosses 4 quads, so it
    // should collect the 5 vertical edges bounding that row (one more
    // than the quad count), regardless of which one of them we start from.
    const plane = createPlane({ width: 4, depth: 3, segmentsW: 4, segmentsD: 3 });
    const loop = plane.edgeLoop(1); // quad 0's "right" vertical edge
    expect(loop.length).toBe(5);
  });

  it('finds all faces connected to a seed face (whole mesh, for a closed cylinder)', () => {
    const cylinder = createCylinder({ radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 8 });
    const connected = cylinder.connectedFaces(0);
    expect(connected.length).toBe(cylinder.faceCount);
  });

  it('expands a face selection into its unique vertices', () => {
    const cube = createCube();
    const verts = expandSelectionToVertices(cube, 'face', new Set([0]));
    expect(verts.length).toBe(4);
  });

  it('expands an edge selection into its two vertices', () => {
    const cube = createCube();
    const [edge] = cube.edges();
    const verts = expandSelectionToVertices(cube, 'edge', new Set([edge.id]));
    expect(verts.sort()).toEqual([edge.a, edge.b].sort());
  });
});
