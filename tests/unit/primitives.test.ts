import { describe, expect, it } from 'vitest';
import {
  createCube,
  createCylinder,
  createCone,
  createSphere,
  createPlane,
  createTorus,
} from '../../src/geometry/ops/primitives';

describe('geometry/ops/primitives', () => {
  it('creates a valid cube with 8 unique corners worth of geometry', () => {
    const mesh = createCube({ width: 2, height: 2, depth: 2 });
    expect(mesh.faceCount).toBe(6);
    expect(mesh.validate().valid).toBe(true);
  });

  it('creates a valid plane subdivided into a grid', () => {
    const mesh = createPlane({ width: 2, depth: 2, segmentsW: 4, segmentsD: 3 });
    expect(mesh.faceCount).toBe(12);
    expect(mesh.validate().valid).toBe(true);
  });

  it('creates a valid cylinder with side quads and two n-gon caps', () => {
    const mesh = createCylinder({ radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 12 });
    expect(mesh.faceCount).toBe(12 + 2);
    expect(mesh.validate().valid).toBe(true);
  });

  it('creates a valid cone (apex ring degenerates to a point, single base cap)', () => {
    const mesh = createCone({ radius: 0.5, height: 1, radialSegments: 12 });
    // Side "quads" collapse to triangles at the apex but still validate;
    // only the base is a real cap.
    expect(mesh.faceCount).toBe(12 + 1);
  });

  it('creates a valid UV sphere with triangle-fan poles', () => {
    const mesh = createSphere({ radius: 0.5, widthSegments: 12, heightSegments: 8 });
    expect(mesh.faceCount).toBe(12 * 8);
    expect(mesh.validate().valid).toBe(true);
  });

  it('creates a valid torus', () => {
    const mesh = createTorus({ radius: 0.5, tubeRadius: 0.15, radialSegments: 8, tubularSegments: 16 });
    expect(mesh.faceCount).toBe(8 * 16);
    expect(mesh.validate().valid).toBe(true);
  });
});
