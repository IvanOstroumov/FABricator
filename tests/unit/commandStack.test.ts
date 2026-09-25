import { describe, expect, it } from 'vitest';
import { Document, identityTransform, type SceneObject } from '../../src/core/Document';
import { CommandStack } from '../../src/commands/CommandStack';
import { AddObjectCommand } from '../../src/commands/AddObjectCommand';
import { PropertyCommand } from '../../src/commands/PropertyCommand';
import { createCube } from '../../src/geometry/ops/primitives';
import { createId } from '../../src/core/Id';

function makeCubeObject(name: string): SceneObject {
  return {
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
}

describe('commands/CommandStack', () => {
  it('undoes and redoes a single command', () => {
    const doc = new Document();
    const stack = new CommandStack(doc);
    const object = makeCubeObject('Cubo');
    stack.run(new AddObjectCommand(object, createCube()));

    expect(doc.objects.has(object.id)).toBe(true);
    stack.undo();
    expect(doc.objects.has(object.id)).toBe(false);
    stack.redo();
    expect(doc.objects.has(object.id)).toBe(true);
  });

  it('survives 50 consecutive undo/redo cycles without errors (M-12 acceptance criterion)', () => {
    const doc = new Document();
    const stack = new CommandStack(doc);
    const object = makeCubeObject('Cubo');
    stack.run(new AddObjectCommand(object, createCube()));
    stack.run(new PropertyCommand('Rinomina', object.id, { name: 'Rinominato' }));

    for (let i = 0; i < 50; i++) {
      stack.undo();
      stack.undo();
      stack.redo();
      stack.redo();
    }

    expect(doc.objects.get(object.id)?.name).toBe('Rinominato');
  });

  it('groups multiple commands into a single undo step', () => {
    const doc = new Document();
    const stack = new CommandStack(doc);
    const a = makeCubeObject('A');
    const b = makeCubeObject('B');

    stack.beginGroup('Aggiungi due');
    stack.run(new AddObjectCommand(a, createCube()));
    stack.run(new AddObjectCommand(b, createCube()));
    stack.endGroup();

    expect(doc.objects.size).toBe(2);
    stack.undo();
    expect(doc.objects.size).toBe(0);
    stack.redo();
    expect(doc.objects.size).toBe(2);
  });
});
