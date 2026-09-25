import type { Document } from '../../core/Document';
import { exportToFbx } from './export';
import type { FbxExportOptions } from './FbxSceneBuilder';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Exports and saves an `.fbx` file, using the native dialog on Tauri or a browser download otherwise (see io/fab/io.ts for the same pattern). */
export async function saveFbxFile(
  doc: Document,
  objectIds: string[],
  options: FbxExportOptions,
  suggestedName = 'export.fbx',
): Promise<boolean> {
  const bytes = exportToFbx(doc, objectIds, options);

  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({ defaultPath: suggestedName, filters: [{ name: 'FBX', extensions: ['fbx'] }] });
    if (!path) return false;
    await writeFile(path, bytes);
    return true;
  }

  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
