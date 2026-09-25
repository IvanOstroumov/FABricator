import type { Document } from '../../core/Document';
import { FbxBinaryWriter } from './FbxBinaryWriter';
import { buildFbxNodes, type FbxExportOptions } from './FbxSceneBuilder';

export type { FbxExportOptions } from './FbxSceneBuilder';

export interface ExportReport {
  triangleCount: number;
  meshCount: number;
  materialCount: number;
  warnings: string[];
}

export function buildExportReport(doc: Document, objectIds: string[]): ExportReport {
  const warnings: string[] = [];
  let triangleCount = 0;
  let meshCount = 0;
  const materialIds = new Set<string>();

  for (const id of objectIds) {
    const object = doc.objects.get(id);
    if (!object?.meshId) continue;
    const mesh = doc.meshes.get(object.meshId);
    if (!mesh) continue;
    meshCount += 1;
    for (let f = 0; f < mesh.faceCount; f++) {
      const n = mesh.faceVertices(f).length;
      triangleCount += Math.max(0, n - 2);
      if (n < 3) warnings.push(`${object.name}: faccia degenere (${f})`);
    }
    for (const matId of mesh.materialSlots) materialIds.add(matId);
    if (mesh.faceMaterial.some((m) => m === -1) && mesh.materialSlots.length > 0) {
      warnings.push(`${object.name}: alcune facce non hanno un materiale assegnato`);
    }
  }

  return { triangleCount, meshCount, materialCount: materialIds.size, warnings };
}

/** Exports the given objects (whole scene or a selection) to FBX 7.4 binary bytes. */
export function exportToFbx(doc: Document, objectIds: string[], options: FbxExportOptions): Uint8Array {
  const nodes = buildFbxNodes(doc, objectIds, options);
  return new FbxBinaryWriter().write(nodes);
}
