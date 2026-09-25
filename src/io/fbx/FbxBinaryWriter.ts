import { zlibSync } from 'fflate';

export type FbxProp =
  | { t: 'C'; v: boolean }
  | { t: 'I'; v: number }
  | { t: 'L'; v: bigint }
  | { t: 'D'; v: number }
  | { t: 'S'; v: string }
  | { t: 'R'; v: Uint8Array }
  | { t: 'd'; v: Float64Array }
  | { t: 'i'; v: Int32Array }
  | { t: 'l'; v: BigInt64Array };

export interface FbxNode {
  name: string;
  props: FbxProp[];
  children: FbxNode[];
}

const FBX_VERSION = 7400;
const ARRAY_COMPRESS_THRESHOLD = 128; // per the PRD: arrays over 128 elements are zlib-compressed

class ByteWriter {
  private chunks: Uint8Array[] = [];
  private length = 0;

  get size(): number {
    return this.length;
  }

  private push(bytes: Uint8Array): void {
    this.chunks.push(bytes);
    this.length += bytes.length;
  }

  u8(v: number): void {
    this.push(Uint8Array.of(v & 0xff));
  }

  private numeric(byteLength: number, write: (view: DataView) => void): void {
    const buf = new ArrayBuffer(byteLength);
    write(new DataView(buf));
    this.push(new Uint8Array(buf));
  }

  u32(v: number): void {
    this.numeric(4, (view) => view.setUint32(0, v, true));
  }

  i32(v: number): void {
    this.numeric(4, (view) => view.setInt32(0, v, true));
  }

  i64(v: bigint): void {
    this.numeric(8, (view) => view.setBigInt64(0, v, true));
  }

  f64(v: number): void {
    this.numeric(8, (view) => view.setFloat64(0, v, true));
  }

  bytes(v: Uint8Array): void {
    this.push(v);
  }

  ascii(v: string): void {
    this.push(new TextEncoder().encode(v));
  }

  toUint8Array(): Uint8Array {
    const out = new Uint8Array(this.length);
    let offset = 0;
    for (const chunk of this.chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }
}

function writeProperty(w: ByteWriter, prop: FbxProp): void {
  w.ascii(prop.t);
  switch (prop.t) {
    case 'C':
      w.u8(prop.v ? 1 : 0);
      break;
    case 'I':
      w.i32(prop.v);
      break;
    case 'L':
      w.i64(prop.v);
      break;
    case 'D':
      w.f64(prop.v);
      break;
    case 'S': {
      const bytes = new TextEncoder().encode(prop.v);
      w.u32(bytes.length);
      w.bytes(bytes);
      break;
    }
    case 'R':
      w.u32(prop.v.length);
      w.bytes(prop.v);
      break;
    case 'd':
    case 'i':
    case 'l':
      writeArrayProperty(w, prop);
      break;
  }
}

function writeArrayProperty(
  w: ByteWriter,
  prop: { t: 'd'; v: Float64Array } | { t: 'i'; v: Int32Array } | { t: 'l'; v: BigInt64Array },
): void {
  const raw = new Uint8Array(prop.v.buffer, prop.v.byteOffset, prop.v.byteLength);
  const arrayLength = prop.v.length;
  const shouldCompress = arrayLength > ARRAY_COMPRESS_THRESHOLD;
  const payload = shouldCompress ? zlibSync(raw, { level: 6 }) : raw;
  w.u32(arrayLength);
  w.u32(shouldCompress ? 1 : 0);
  w.u32(payload.length);
  w.bytes(payload);
}

function propertyListLength(prop: FbxProp): number {
  const w = new ByteWriter();
  writeProperty(w, prop);
  return w.size - 1; // exclude the 1-byte type code, matched below when summing
}

function writeNode(w: ByteWriter, node: FbxNode, baseOffset: number): number {
  // Two passes: first serialize into a scratch buffer to compute sizes,
  // then splice in the correct EndOffset — simpler and safe at these
  // scene sizes than tracking offsets incrementally by hand.
  const body = new ByteWriter();
  for (const prop of node.props) writeProperty(body, prop);
  const propertyListLen = node.props.reduce((sum, p) => sum + 1 + propertyListLength(p), 0);

  let childrenBytes: Uint8Array<ArrayBufferLike> = new Uint8Array(0);
  if (node.children.length > 0) {
    const childWriter = new ByteWriter();
    let offset = baseOffset + 13 + node.name.length + propertyListLen; // header + name + own properties, before children
    for (const child of node.children) {
      offset = writeNode(childWriter, child, offset);
    }
    childWriter.bytes(new Uint8Array(13)); // null record terminator
    offset += 13;
    childrenBytes = childWriter.toUint8Array();
  }

  const nameBytes = new TextEncoder().encode(node.name);
  const headerLen = 13 + nameBytes.length;
  const endOffset = baseOffset + headerLen + propertyListLen + childrenBytes.length;

  w.u32(endOffset);
  w.u32(node.props.length);
  w.u32(propertyListLen);
  w.u8(nameBytes.length);
  w.bytes(nameBytes);
  w.bytes(body.toUint8Array());
  w.bytes(childrenBytes);

  return endOffset;
}

/** Writes a full FBX 7.4 binary file (header, node tree, footer) per the PRD's spec. */
export class FbxBinaryWriter {
  write(roots: FbxNode[]): Uint8Array {
    const w = new ByteWriter();
    w.ascii('Kaydara FBX Binary  ');
    w.u8(0x00);
    w.u8(0x1a);
    w.u8(0x00);
    w.u32(FBX_VERSION);

    let offset = w.size;
    for (const node of roots) {
      offset = writeNode(w, node, offset);
    }
    w.bytes(new Uint8Array(13)); // top-level null record

    // Footer: a 16-byte all-zero-padded id block (the exact id bytes
    // aren't checked by importers), padding to a 16-byte boundary,
    // version, 120 zero bytes, then the magic footer bytes.
    w.bytes(new Uint8Array(16));
    const padding = (16 - (w.size % 16)) % 16;
    w.bytes(new Uint8Array(padding));
    w.u32(FBX_VERSION);
    w.bytes(new Uint8Array(120));
    w.bytes(
      Uint8Array.of(
        0xf8, 0x5a, 0x8c, 0x6a, 0xde, 0xf5, 0xd9, 0x7e, 0xec, 0xe9, 0x0c, 0xe3, 0x75, 0x8f, 0x29, 0x0b,
      ),
    );

    return w.toUint8Array();
  }
}
