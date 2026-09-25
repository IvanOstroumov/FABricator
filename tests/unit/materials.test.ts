import { describe, expect, it } from 'vitest';
import { Document, identityTransform, type SceneObject } from '../../src/core/Document';
import { CommandStack } from '../../src/commands/CommandStack';
import { AddObjectCommand } from '../../src/commands/AddObjectCommand';
import { AddMaterialCommand, MaterialPropertyCommand } from '../../src/commands/MaterialCommand';
import { AssignMaterialCommand } from '../../src/commands/AssignMaterialCommand';
import { createDefaultMaterial } from '../../src/materials/types';
import { createCube } from '../../src/geometry/ops/primitives';
import { createId } from '../../src/core/Id';

function makeCubeObject(): SceneObject {
  return {
    id: createId(),
    name: 'Cubo',
    parentId: null,
    kind: 'mesh',
    transform: identityTransform(),
    pivot: { x: 0, y: 0, z: 0 },
    visible: true,
    locked: false,
    meshId: createId(),
    shading: { smooth: false, autoSmoothAngleDeg: 30 },
  };
}

describe('commands/MaterialCommand', () => {
  it('creates and undoes a material', () => {
    const doc = new Document();
    const stack = new CommandStack(doc);
    const cmd = new AddMaterialCommand(createDefaultMaterial(createId(), 'Rosso'));
    stack.run(cmd);
    expect(doc.materials.has(cmd.createdId)).toBe(true);
    stack.undo();
    expect(doc.materials.has(cmd.createdId)).toBe(false);
  });

  it('edits and undoes a material property', () => {
    const doc = new Document();
    const stack = new CommandStack(doc);
    const material = createDefaultMaterial(createId(), 'Rosso');
    stack.run(new AddMaterialCommand(material));
    stack.run(new MaterialPropertyCommand('Roughness', material.id, { roughness: 0.9 }));
    expect(doc.materials.get(material.id)!.roughness).toBe(0.9);
    stack.undo();
    expect(doc.materials.get(material.id)!.roughness).toBe(0.6);
  });
});

describe('commands/AssignMaterialCommand', () => {
  it('starts with every face unassigned (-1), never colliding with a real slot 0', () => {
    const mesh = createCube();
    expect(mesh.faceMaterial.every((m) => m === -1)).toBe(true);
  });

  it('assigns a material to the whole mesh and undoes cleanly', () => {
    const doc = new Document();
    const stack = new CommandStack(doc);
    const object = makeCubeObject();
    const mesh = createCube();
    stack.run(new AddObjectCommand(object, mesh));

    const material = createDefaultMaterial(createId(), 'Rosso');
    stack.run(new AddMaterialCommand(material));
    stack.run(new AssignMaterialCommand(object.meshId!, material.id, null));

    const after = doc.meshes.get(object.meshId!)!;
    expect(after.materialSlots).toEqual([material.id]);
    expect(after.faceMaterial.every((m) => m === 0)).toBe(true);

    stack.undo();
    const reverted = doc.meshes.get(object.meshId!)!;
    expect(reverted.materialSlots).toEqual([]);
    expect(reverted.faceMaterial.every((m) => m === -1)).toBe(true);
  });

  it('assigns a material to a single face, leaving the others unassigned', () => {
    const doc = new Document();
    const stack = new CommandStack(doc);
    const object = makeCubeObject();
    const mesh = createCube();
    stack.run(new AddObjectCommand(object, mesh));

    const material = createDefaultMaterial(createId(), 'Rosso');
    stack.run(new AddMaterialCommand(material));
    stack.run(new AssignMaterialCommand(object.meshId!, material.id, [0]));

    const after = doc.meshes.get(object.meshId!)!;
    expect(after.faceMaterial[0]).toBe(0); // the only real slot, index 0
    expect(after.faceMaterial.slice(1).every((m) => m === -1)).toBe(true); // still unassigned, not slot 0
    expect(after.materialSlots).toEqual([material.id]);
  });
});
