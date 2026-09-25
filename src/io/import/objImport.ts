import { EditableMesh } from '../../geometry/EditableMesh';
import type { Vec3 } from '../../core/math/types';

export class ObjParseError extends Error {}

/**
 * Minimal Wavefront OBJ importer (E-06): vertices, per-face UVs (from
 * `vt`, indexed the same way the file references them), n-gon faces.
 * Normals (`vn`) are read from the file but ignored — `EditableMesh`
 * always computes its own via Newell's method, so importing them would
 * just be dead data until per-vertex custom normals are supported.
 * Multiple `o`/`g` groups are merged into a single mesh for now.
 */
export function parseObj(text: string): EditableMesh {
  const positions: Vec3[] = [];
  const uvs: [number, number][] = [];
  const mesh = new EditableMesh();
  const vertexForKey = new Map<string, number>();

  const resolveIndex = (raw: string, count: number): number => {
    const n = parseInt(raw, 10);
    return n > 0 ? n - 1 : count + n; // OBJ allows negative (relative) indices
  };

  const getOrCreateVertex = (posIndex: number): number => {
    const key = String(posIndex);
    let mapped = vertexForKey.get(key);
    if (mapped === undefined) {
      mapped = mesh.addVertex(positions[posIndex]);
      vertexForKey.set(key, mapped);
    }
    return mapped;
  };

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const [tag, ...fields] = line.split(/\s+/);

    if (tag === 'v') {
      const [x, y, z] = fields.map(Number);
      positions.push({ x, y, z });
    } else if (tag === 'vt') {
      const [u, v] = fields.map(Number);
      uvs.push([u, v ?? 0]);
    } else if (tag === 'f') {
      if (fields.length < 3) continue;
      const verts: number[] = [];
      const faceUvs: [number, number][] = [];
      for (const token of fields) {
        const [vRaw, vtRaw] = token.split('/');
        const posIndex = resolveIndex(vRaw, positions.length);
        if (posIndex < 0 || posIndex >= positions.length) {
          throw new ObjParseError(`Indice vertice fuori intervallo: "${token}"`);
        }
        verts.push(getOrCreateVertex(posIndex));
        if (vtRaw) {
          const uvIndex = resolveIndex(vtRaw, uvs.length);
          faceUvs.push(uvs[uvIndex] ?? [0, 0]);
        } else {
          faceUvs.push([0, 0]);
        }
      }
      mesh.addFace(verts, faceUvs);
    }
    // Ignored on purpose: vn, o, g, s, mtllib, usemtl (materials come from
    // FABricator's own palette, not re-imported from a sidecar .mtl yet).
  }

  if (mesh.vertexCount === 0 || mesh.faceCount === 0) {
    throw new ObjParseError('Il file OBJ non contiene geometria valida');
  }
  return mesh;
}
