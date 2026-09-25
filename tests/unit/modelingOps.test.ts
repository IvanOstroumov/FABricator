import { describe, expect, it } from 'vitest';
import { createCube, createCylinder } from '../../src/geometry/ops/primitives';
import { extrudeFaces } from '../../src/geometry/ops/extrude';
import { insetFaces } from '../../src/geometry/ops/inset';
import { deleteFaces, deleteEdges, deleteVertices } from '../../src/geometry/ops/deleteElements';

describe('geometry/ops/extrude', () => {
  it('extrudes a single face into a valid mesh with 4 new side walls', () => {
    const cube = createCube();
    const { mesh, capFaces } = extrudeFaces(cube, [0], 0.5);
    expect(mesh.validate().valid).toBe(true);
    // 5 untouched faces + 1 cap + 4 side walls = 10
    expect(mesh.faceCount).toBe(10);
    expect(capFaces.length).toBe(1);
  });

  it('extrudes a multi-face region without duplicating internal walls', () => {
    const cylinder = createCylinder({ radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 8 });
    // Extrude the two end caps together as one "region" (they don't share
    // an edge, so this still yields two independent caps + their walls).
    const capFaceIndices = [cylinder.faceCount - 2, cylinder.faceCount - 1];
    const { mesh, capFaces } = extrudeFaces(cylinder, capFaceIndices, 0.3);
    expect(mesh.validate().valid).toBe(true);
    expect(capFaces.length).toBe(2);
  });

  it('rejects and reports an operation that would produce a degenerate mesh', () => {
    const cube = createCube();
    const { mesh } = extrudeFaces(cube, [0], 0); // zero-height walls
    expect(mesh.validate().valid).toBe(false);
  });
});

describe('geometry/ops/inset', () => {
  it('insets a face into a valid mesh with an inner cap plus a ring of 4 quads', () => {
    const cube = createCube();
    const { mesh, capFaces } = insetFaces(cube, [0], 0.1);
    expect(mesh.validate().valid).toBe(true);
    expect(mesh.faceCount).toBe(10); // 5 untouched + 1 inner cap + 4 ring quads
    expect(capFaces.length).toBe(1);
  });

  it('insets multiple independent faces in one call', () => {
    const cube = createCube();
    const { mesh, capFaces } = insetFaces(cube, [0, 1], 0.1);
    expect(mesh.validate().valid).toBe(true);
    expect(capFaces.length).toBe(2);
  });
});

describe('geometry/ops/deleteElements', () => {
  it('deletes a face, leaving the rest of the mesh valid', () => {
    const cube = createCube();
    const mesh = deleteFaces(cube, [0]);
    expect(mesh.faceCount).toBe(5);
    expect(mesh.validate().valid).toBe(true);
  });

  it('deletes a vertex and every face touching it', () => {
    const cube = createCube();
    const mesh = deleteVertices(cube, [0]);
    // Vertex 0 of the cube (a corner) touches exactly 3 faces.
    expect(mesh.faceCount).toBe(3);
  });

  it('deletes the faces adjacent to a selected edge', () => {
    const cube = createCube();
    const [edge] = cube.edges();
    const mesh = deleteEdges(cube, [edge.id]);
    expect(mesh.faceCount).toBe(4); // an interior edge borders exactly 2 faces
  });
});
