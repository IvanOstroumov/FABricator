import { parseObj } from './objImport';
import { EditableMesh } from '../../geometry/EditableMesh';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Opens an `.obj` file picker and returns the parsed mesh plus a suggested object name, or `null` if cancelled. */
export async function importObjFile(): Promise<{ mesh: EditableMesh; name: string } | null> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    const path = await open({ filters: [{ name: 'Wavefront OBJ', extensions: ['obj'] }] });
    if (!path || Array.isArray(path)) return null;
    const text = await readTextFile(path);
    const name = path.split(/[/\\]/).pop()?.replace(/\.obj$/i, '') ?? 'Import';
    return { mesh: parseObj(text), name };
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.obj';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const text = await file.text();
        resolve({ mesh: parseObj(text), name: file.name.replace(/\.obj$/i, '') });
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}
