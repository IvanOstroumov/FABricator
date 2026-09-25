import { describe, expect, it } from 'vitest';
import { createCube, createCylinder } from '../../src/geometry/ops/primitives';
import { expandSelectionToVertices } from '../../src/selection/Selection';

describe('EditableMesh topology queries', () => {
  it('enumerates each edge exactly once', () => {
    const cube = createCube();
    // A cube has 6 quad faces => 12 edges (Euler: V - E + F = 2 => 8 - E + 6 = 2 => E = 12),
    // but our generator gives every face its own corners (24 verts), so
    // shared edges only merge where addFace found a matching twin.
    const edges = cube.edges();
    const ids = new Set(edges.map((e) => e.id));
    expect(ids.size).toBe(edges.length);
    expect(edges.length).toBeGreaterThan(0);
  });

  it('walks a quad edge loop around a cylinder without revisiting the seam edge twice', () => {
    const cylinder = createCylinder({ radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 8 });
    const loop = cylinder.edgeLoop(0);
    expect(loop.length).toBeGreaterThan(0);
    expect(new Set(loop).size).toBe(loop.length);
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
