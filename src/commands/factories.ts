import { createId } from '../core/Id';
import { identityTransform, type SceneObject } from '../core/Document';
import { AddObjectCommand } from './AddObjectCommand';
import {
  createCube,
  createCylinder,
  createCone,
  createSphere,
  createPlane,
  createTorus,
} from '../geometry/ops/primitives';

export type PrimitiveKind = 'cube' | 'cylinder' | 'sphere' | 'plane' | 'cone' | 'torus';

const GENERATORS: Record<PrimitiveKind, () => ReturnType<typeof createCube>> = {
  cube: () => createCube(),
  cylinder: () => createCylinder(),
  sphere: () => createSphere(),
  plane: () => createPlane(),
  cone: () => createCone(),
  torus: () => createTorus(),
};

const DEFAULT_NAMES: Record<PrimitiveKind, string> = {
  cube: 'Cubo',
  cylinder: 'Cilindro',
  sphere: 'Sfera',
  plane: 'Piano',
  cone: 'Cono',
  torus: 'Toro',
};

export function createPrimitiveCommand(kind: PrimitiveKind, existingNames: string[]): AddObjectCommand {
  const mesh = GENERATORS[kind]();
  const baseName = DEFAULT_NAMES[kind];
  let name = baseName;
  let suffix = 1;
  while (existingNames.includes(name)) {
    suffix += 1;
    name = `${baseName}.${String(suffix).padStart(3, '0')}`;
  }

  const object: SceneObject = {
    id: createId(),
    name,
    parentId: null,
    kind: 'mesh',
    transform: identityTransform(),
    pivot: { x: 0, y: 0, z: 0 },
    visible: true,
    locked: false,
    meshId: createId(),
    shading: { smooth: false, autoSmoothAngleDeg: 30 },
  };

  return new AddObjectCommand(object, mesh);
}
