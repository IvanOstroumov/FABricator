import type { EditableMesh } from '../geometry/EditableMesh';
import type { Command } from './Command';
import { MeshTopologyCommand } from './MeshTopologyCommand';

/**
 * Commits a topology-changing mesh operation only if the result passes
 * `validate()` — per the PRD, an invalid result is discarded and reported
 * instead of corrupting the document.
 */
export function commitMeshOp(
  run: (cmd: Command) => void,
  label: string,
  meshId: string,
  before: EditableMesh,
  after: EditableMesh,
): { ok: true } | { ok: false; error: string } {
  const report = after.validate();
  if (!report.valid) {
    return { ok: false, error: report.errors[0] ?? 'Operazione non valida' };
  }
  run(new MeshTopologyCommand(label, meshId, before, after));
  return { ok: true };
}
