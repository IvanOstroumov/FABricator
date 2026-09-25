import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { Document, identityTransform, type SceneObject } from '../../core/Document';
import type { MaterialDef, TextureAsset } from '../../materials/types';
import { EditableMesh } from '../../geometry/EditableMesh';

const SCHEMA_VERSION = 1;
const APP_VERSION = '0.1.0';

interface Manifest {
  format: 'fabricator';
  schemaVersion: number;
  appVersion: string;
}

interface SerializedFace {
  verts: number[];
  uv: [number, number][];
  material: number;
}

interface SerializedMesh {
  positions: number[]; // flat xyz
  faces: SerializedFace[];
  materialSlots: string[];
}

interface DocumentJson {
  objects: SceneObject[];
  materials: MaterialDef[];
  textures: TextureAsset[];
  settings: Document['settings'];
}

function serializeMesh(mesh: EditableMesh): SerializedMesh {
  const faces: SerializedFace[] = [];
  for (let f = 0; f < mesh.faceCount; f++) {
    faces.push({ verts: mesh.faceVertices(f), uv: mesh.faceUvs(f), material: mesh.faceMaterial[f] });
  }
  return { positions: [...mesh.positions], faces, materialSlots: [...mesh.materialSlots] };
}

function deserializeMesh(data: SerializedMesh): EditableMesh {
  const mesh = new EditableMesh();
  for (let i = 0; i < data.positions.length; i += 3) {
    mesh.addVertex({ x: data.positions[i], y: data.positions[i + 1], z: data.positions[i + 2] });
  }
  for (const face of data.faces) {
    mesh.addFace(face.verts, face.uv, face.material);
  }
  mesh.materialSlots = [...data.materialSlots];
  return mesh;
}

/** Serializes the document into the bytes of a `.fab` (zip) archive, per the PRD's format. */
export function serializeDocumentToFab(doc: Document): Uint8Array {
  const manifest: Manifest = { format: 'fabricator', schemaVersion: SCHEMA_VERSION, appVersion: APP_VERSION };
  const documentJson: DocumentJson = {
    objects: [...doc.objects.values()],
    materials: [...doc.materials.values()],
    textures: [...doc.textures.values()],
    settings: doc.settings,
  };

  const files: Record<string, Uint8Array> = {
    'manifest.json': strToU8(JSON.stringify(manifest)),
    'document.json': strToU8(JSON.stringify(documentJson)),
  };
  for (const [meshId, mesh] of doc.meshes) {
    files[`meshes/${meshId}.json`] = strToU8(JSON.stringify(serializeMesh(mesh)));
  }
  for (const [textureId, bytes] of doc.textureData) {
    const texture = doc.textures.get(textureId);
    files[texture?.fileName ?? `textures/${textureId}.png`] = bytes;
  }

  return zipSync(files, { level: 6 });
}

export class FabParseError extends Error {}

/** Rebuilds a fresh `Document` from `.fab` archive bytes. Throws `FabParseError` for anything unreadable. */
export function deserializeFab(bytes: Uint8Array): Document {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new FabParseError('Il file non è un archivio .fab valido');
  }

  const manifestRaw = files['manifest.json'];
  const documentRaw = files['document.json'];
  if (!manifestRaw || !documentRaw) {
    throw new FabParseError('Il file .fab non contiene manifest.json o document.json');
  }

  const manifest = JSON.parse(strFromU8(manifestRaw)) as Manifest;
  if (manifest.format !== 'fabricator') {
    throw new FabParseError('Formato di progetto non riconosciuto');
  }
  if (manifest.schemaVersion > SCHEMA_VERSION) {
    throw new FabParseError(
      `Questo progetto richiede una versione più recente di FABricator (schema ${manifest.schemaVersion})`,
    );
  }

  const documentJson = JSON.parse(strFromU8(documentRaw)) as DocumentJson;
  const doc = new Document();
  Object.assign(doc.settings, documentJson.settings);

  for (const material of documentJson.materials) {
    doc.materials.set(material.id, material);
  }
  for (const texture of documentJson.textures) {
    doc.textures.set(texture.id, texture);
    const bytes = files[texture.fileName];
    if (bytes) doc.textureData.set(texture.id, bytes);
  }
  for (const object of documentJson.objects) {
    // Defensive default in case an older/foreign file omits a field the
    // in-memory model expects — migrations proper land when schemaVersion
    // actually needs to increment.
    object.transform = object.transform ?? identityTransform();
    doc.objects.set(object.id, object);
    if (object.meshId) {
      const meshRaw = files[`meshes/${object.meshId}.json`];
      if (meshRaw) {
        doc.meshes.set(object.meshId, deserializeMesh(JSON.parse(strFromU8(meshRaw)) as SerializedMesh));
      }
    }
  }

  return doc;
}
