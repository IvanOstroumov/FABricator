import type { Id } from '../core/Id';
import type { Vec2 } from '../core/math/types';

export interface MaterialDef {
  id: Id;
  name: string;
  baseColor: [number, number, number, number]; // linear RGBA 0..1
  metallic: number; // 0..1
  roughness: number; // 0..1
  emissive: [number, number, number];
  maps: { baseColor?: Id; normal?: Id; roughness?: Id }; // TextureAsset ids
  uvTransform: { tiling: Vec2; offset: Vec2; rotationDeg: number };
}

export function createDefaultMaterial(id: Id, name: string): MaterialDef {
  return {
    id,
    name,
    baseColor: [0.7, 0.7, 0.75, 1],
    metallic: 0,
    roughness: 0.6,
    emissive: [0, 0, 0],
    maps: {},
    uvTransform: { tiling: { x: 1, y: 1 }, offset: { x: 0, y: 0 }, rotationDeg: 0 },
  };
}

export interface TextureAsset {
  id: Id;
  name: string;
  fileName: string; // textures/<id>.png inside the .fab archive
  width: number;
  height: number;
  colorSpace: 'srgb' | 'linear';
}
