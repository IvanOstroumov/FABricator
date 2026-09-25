import { nanoid } from 'nanoid';

export type Id = string;

export function createId(): Id {
  return nanoid(12);
}
