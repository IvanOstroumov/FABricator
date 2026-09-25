export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export const IDENTITY_QUAT: Quat = { x: 0, y: 0, z: 0, w: 1 };

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

export function vec2(x = 0, y = 0): Vec2 {
  return { x, y };
}
