import type { Document } from '../core/Document';

export interface Command {
  readonly label: string;
  execute(doc: Document): void;
  undo(doc: Document): void;
  mergeWith?(next: Command): boolean;
  memoryBytes(): number;
}
