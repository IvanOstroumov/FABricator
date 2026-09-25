import { createId } from '../core/Id';
import { identityTransform, type SceneObject } from '../core/Document';
import { AddObjectCommand } from './AddObjectCommand';
import type { EditableMesh } from '../geometry/EditableMesh';
import {
  createCube,
  createCylinder,
  createCone,
  createSphere,
  createPlane,
  createTorus,
} from '../geometry/ops/primitives';

function uniqueName(baseName: string, existingNames: string[]): string {
  let name = baseName;
  let suffix = 1;
  while (existingNames.includes(name)) {
    suffix += 1;
    name = `${baseName}.${String(suffix).padStart(3, '0')}`;
  }
  return name;
}

/** Wraps an already-parsed mesh (e.g. from OBJ import) into a new scene object, per the same naming rule as the primitives. */
export function createImportedObjectCommand(mesh: EditableMesh, baseName: string, existingNames: string[]): AddObjectCommand {
  const object: SceneObject = {
    id: createId(),
    name: uniqueName(baseName || 'Import', existingNames),
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
  return createImportedObjectCommand(GENERATORS[kind](), DEFAULT_NAMES[kind], existingNames);
}
