import { describe, expect, it } from 'vitest';
import { parseObj, ObjParseError } from '../../src/io/import/objImport';

const CUBE_OBJ = `
# a unit cube
v -0.5 -0.5 -0.5
v  0.5 -0.5 -0.5
v  0.5  0.5 -0.5
v -0.5  0.5 -0.5
v -0.5 -0.5  0.5
v  0.5 -0.5  0.5
v  0.5  0.5  0.5
v -0.5  0.5  0.5
vt 0 0
vt 1 0
vt 1 1
vt 0 1
f 1/1 2/2 3/3 4/4
f 5/1 8/2 7/3 6/4
f 1/1 5/2 6/3 2/4
f 2/1 6/2 7/3 3/4
f 3/1 7/2 8/3 4/4
f 5/1 1/2 4/3 8/4
`;

describe('io/import/objImport', () => {
  it('parses a cube with shared vertices and per-corner UVs into a valid mesh', () => {
    const mesh = parseObj(CUBE_OBJ);
    expect(mesh.vertexCount).toBe(8);
    expect(mesh.faceCount).toBe(6);
    expect(mesh.validate().valid).toBe(true);
    // Euler check: a closed cube has 12 edges regardless of face winding.
    expect(mesh.edges().length).toBe(12);
  });

  it('reads per-corner UVs from the vt indices', () => {
    const mesh = parseObj(CUBE_OBJ);
    const uv = mesh.faceUvs(0);
    expect(uv).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]);
  });

  it('supports triangles as well as quads', () => {
    const triObj = `
v 0 0 0
v 1 0 0
v 0 1 0
f 1 2 3
`;
    const mesh = parseObj(triObj);
    expect(mesh.faceCount).toBe(1);
    expect(mesh.faceVertices(0).length).toBe(3);
  });

  it('rejects a face referencing an out-of-range vertex index', () => {
    const bad = `
v 0 0 0
v 1 0 0
v 0 1 0
f 1 2 5
`;
    expect(() => parseObj(bad)).toThrow(ObjParseError);
  });

  it('rejects a file with no geometry', () => {
    expect(() => parseObj('# empty file\n')).toThrow(ObjParseError);
  });
});
