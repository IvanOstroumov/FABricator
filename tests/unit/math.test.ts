import { describe, expect, it } from 'vitest';
import { vec3, IDENTITY_QUAT } from '../../src/core/math/types';
import { createId } from '../../src/core/Id';

describe('core/math', () => {
  it('creates a vec3 defaulting to the origin', () => {
    expect(vec3()).toEqual({ x: 0, y: 0, z: 0 });
    expect(vec3(1, 2, 3)).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('exposes an identity quaternion', () => {
    expect(IDENTITY_QUAT).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });
});

describe('core/Id', () => {
  it('creates unique 12-character ids', () => {
    const a = createId();
    const b = createId();
    expect(a).toHaveLength(12);
    expect(a).not.toBe(b);
  });
});
