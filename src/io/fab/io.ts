import { Document } from '../../core/Document';
import { serializeDocumentToFab, deserializeFab } from './serialize';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Saves the document as a `.fab` file. On the real desktop app (Tauri)
 * this uses the native save dialog + filesystem plugin; in a plain
 * browser (this repo's dev/test environment, and the web preview) it
 * falls back to a normal file download, so the same code path stays
 * testable with Playwright.
 */
export async function saveFabFile(doc: Document, suggestedName = 'progetto.fab'): Promise<boolean> {
  const bytes = serializeDocumentToFab(doc);

  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({ defaultPath: suggestedName, filters: [{ name: 'Progetto FABricator', extensions: ['fab'] }] });
    if (!path) return false;
    await writeFile(path, bytes);
    return true;
  }

  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/x-fabricator' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

/** Opens a `.fab` file and returns the rebuilt `Document`, or `null` if the user cancelled. */
export async function openFabFile(): Promise<Document | null> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readFile } = await import('@tauri-apps/plugin-fs');
    const path = await open({ filters: [{ name: 'Progetto FABricator', extensions: ['fab'] }] });
    if (!path || Array.isArray(path)) return null;
    const bytes = await readFile(path);
    return deserializeFab(bytes);
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.fab';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const buffer = await file.arrayBuffer();
      resolve(deserializeFab(new Uint8Array(buffer)));
    };
    input.click();
  });
}
