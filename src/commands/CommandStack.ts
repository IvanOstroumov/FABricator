import type { Document } from '../core/Document';
import type { Command } from './Command';

export class CommandStack {
  private done: Command[] = [];
  private undone: Command[] = [];
  maxBytes = 512 * 1024 * 1024;
  private groupStack: { label: string; commands: Command[] }[] = [];
  private doc: Document;

  constructor(doc: Document) {
    this.doc = doc;
  }

  get canUndo(): boolean {
    return this.done.length > 0;
  }

  get canRedo(): boolean {
    return this.undone.length > 0;
  }

  get undoLabel(): string | null {
    return this.done.at(-1)?.label ?? null;
  }

  get redoLabel(): string | null {
    return this.undone.at(-1)?.label ?? null;
  }

  run(cmd: Command): void {
    cmd.execute(this.doc);
    this.undone = [];

    const currentGroup = this.groupStack.at(-1);
    if (currentGroup) {
      currentGroup.commands.push(cmd);
      return;
    }

    const last = this.done.at(-1);
    if (last?.mergeWith?.(cmd)) {
      return;
    }
    this.done.push(cmd);
    this.enforceBudget();
  }

  undo(): void {
    const cmd = this.done.pop();
    if (!cmd) return;
    cmd.undo(this.doc);
    this.undone.push(cmd);
  }

  redo(): void {
    const cmd = this.undone.pop();
    if (!cmd) return;
    cmd.execute(this.doc);
    this.done.push(cmd);
  }

  beginGroup(label: string): void {
    this.groupStack.push({ label, commands: [] });
  }

  endGroup(): void {
    const group = this.groupStack.pop();
    if (!group) return;
    const groupCommand: Command = {
      label: group.label,
      execute: (doc) => group.commands.forEach((c) => c.execute(doc)),
      undo: (doc) => [...group.commands].reverse().forEach((c) => c.undo(doc)),
      memoryBytes: () => group.commands.reduce((sum, c) => sum + c.memoryBytes(), 0),
    };
    const parent = this.groupStack.at(-1);
    if (parent) {
      parent.commands.push(groupCommand);
    } else {
      this.done.push(groupCommand);
      this.enforceBudget();
    }
  }

  private enforceBudget(): void {
    let total = this.done.reduce((sum, c) => sum + c.memoryBytes(), 0);
    while (total > this.maxBytes && this.done.length > 1) {
      const removed = this.done.shift();
      if (!removed) break;
      total -= removed.memoryBytes();
    }
  }
}
