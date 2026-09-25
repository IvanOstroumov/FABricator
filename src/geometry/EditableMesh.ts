import type { Vec3 } from '../core/math/types';

export interface ValidationReport {
  valid: boolean;
  errors: string[];
}

const EMPTY = -1;

/**
 * Half-edge mesh with dynamically-growing typed arrays. Supports n-gons;
 * triangulation only happens for rendering/export (see geometry/triangulate).
 *
 * Deleted elements are not compacted immediately — `compact()` does that
 * before save/export, per the PRD. For Phase 2 (primitives only, no
 * topology edits yet) nothing is ever removed, so growable arrays are
 * simple JS arrays rather than the final fixed-capacity typed-array +
 * free-list scheme; that optimization lands with the edit operations in
 * Phase 4.
 */
export class EditableMesh {
  positions: number[] = []; // flat xyz per vertex
  vertHalfEdge: number[] = []; // one outgoing half-edge per vertex, -1 if isolated

  heVert: number[] = []; // destination vertex
  heTwin: number[] = []; // opposite half-edge, -1 = border
  heNext: number[] = [];
  hePrev: number[] = [];
  heFace: number[] = []; // -1 = border half-edge
  heUv: number[] = []; // flat uv per half-edge (per-corner)

  faceHalfEdge: number[] = [];
  faceMaterial: number[] = [];
  materialSlots: string[] = [];

  get vertexCount(): number {
    return this.positions.length / 3;
  }

  get faceCount(): number {
    return this.faceHalfEdge.length;
  }

  addVertex(p: Vec3): number {
    const index = this.vertexCount;
    this.positions.push(p.x, p.y, p.z);
    this.vertHalfEdge.push(EMPTY);
    return index;
  }

  setUv(vertexIndex: number, u: number, v: number): void {
    // Convenience for primitive generators that build one UV per vertex
    // (no seams yet); stored per-corner once faces reference it below.
    this.pendingVertexUv.set(vertexIndex, [u, v]);
  }

  private pendingVertexUv = new Map<number, [number, number]>();

  /** Connects half-edge twins automatically by matching directed edges. */
  addFace(verts: number[], material = 0): number {
    if (verts.length < 3) {
      throw new Error('addFace requires at least 3 vertices');
    }
    const n = verts.length;
    const firstHe = this.heVert.length;

    for (let i = 0; i < n; i++) {
      const from = verts[i];
      const to = verts[(i + 1) % n];
      const heIndex = this.heVert.length;
      this.heVert.push(to);
      this.heTwin.push(EMPTY);
      this.heNext.push(firstHe + ((i + 1) % n));
      this.hePrev.push(firstHe + ((i - 1 + n) % n));
      this.heFace.push(EMPTY); // set below once we know the face index
      const uv = this.pendingVertexUv.get(from) ?? [0, 0];
      this.heUv.push(uv[0], uv[1]);

      if (this.vertHalfEdge[from] === EMPTY) {
        this.vertHalfEdge[from] = heIndex;
      }

      // Find a twin: any existing half-edge going to->from without one yet.
      for (let h = 0; h < firstHe; h++) {
        if (this.heTwin[h] === EMPTY && this.heVert[h] === from && this.heVert[this.hePrev[h]] === to) {
          this.heTwin[h] = heIndex;
          this.heTwin[heIndex] = h;
          break;
        }
      }
    }

    const faceIndex = this.faceHalfEdge.length;
    for (let i = 0; i < n; i++) {
      this.heFace[firstHe + i] = faceIndex;
    }
    this.faceHalfEdge.push(firstHe);
    this.faceMaterial.push(material);
    return faceIndex;
  }

  faceVertices(f: number): number[] {
    const start = this.faceHalfEdge[f];
    const verts: number[] = [];
    let h = start;
    do {
      verts.push(this.heVert[this.hePrev[h]]);
      h = this.heNext[h];
    } while (h !== start);
    return verts;
  }

  faceUvs(f: number): [number, number][] {
    const start = this.faceHalfEdge[f];
    const uvs: [number, number][] = [];
    let h = start;
    do {
      uvs.push([this.heUv[h * 2], this.heUv[h * 2 + 1]]);
      h = this.heNext[h];
    } while (h !== start);
    return uvs;
  }

  vertexPosition(v: number): Vec3 {
    return { x: this.positions[v * 3], y: this.positions[v * 3 + 1], z: this.positions[v * 3 + 2] };
  }

  /** Newell's method: robust for n-gons and slightly non-planar faces. */
  faceNormal(f: number): Vec3 {
    const verts = this.faceVertices(f);
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let i = 0; i < verts.length; i++) {
      const a = this.vertexPosition(verts[i]);
      const b = this.vertexPosition(verts[(i + 1) % verts.length]);
      nx += (a.y - b.y) * (a.z + b.z);
      ny += (a.z - b.z) * (a.x + b.x);
      nz += (a.x - b.x) * (a.y + b.y);
    }
    const len = Math.hypot(nx, ny, nz) || 1;
    return { x: nx / len, y: ny / len, z: nz / len };
  }

  validate(): ValidationReport {
    const errors: string[] = [];
    const heCount = this.heVert.length;

    for (let h = 0; h < heCount; h++) {
      if (this.heNext[this.hePrev[h]] !== h) {
        errors.push(`next(prev(${h})) != ${h}`);
      }
      const twin = this.heTwin[h];
      if (twin !== EMPTY && this.heTwin[twin] !== h) {
        errors.push(`twin(twin(${h})) != ${h}`);
      }
    }

    for (let f = 0; f < this.faceCount; f++) {
      const verts = this.faceVertices(f);
      if (verts.length < 3) {
        errors.push(`face ${f} has fewer than 3 vertices`);
        continue;
      }
      const area = this.faceArea(f);
      if (area < 1e-10) {
        errors.push(`face ${f} has near-zero area (${area})`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private faceArea(f: number): number {
    const verts = this.faceVertices(f).map((v) => this.vertexPosition(v));
    const normal = this.faceNormal(f);
    let sum = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < verts.length; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % verts.length];
      sum = {
        x: sum.x + (a.y * b.z - a.z * b.y),
        y: sum.y + (a.z * b.x - a.x * b.z),
        z: sum.z + (a.x * b.y - a.y * b.x),
      };
    }
    return Math.abs(sum.x * normal.x + sum.y * normal.y + sum.z * normal.z) / 2;
  }

  clone(): EditableMesh {
    const copy = new EditableMesh();
    copy.positions = [...this.positions];
    copy.vertHalfEdge = [...this.vertHalfEdge];
    copy.heVert = [...this.heVert];
    copy.heTwin = [...this.heTwin];
    copy.heNext = [...this.heNext];
    copy.hePrev = [...this.hePrev];
    copy.heFace = [...this.heFace];
    copy.heUv = [...this.heUv];
    copy.faceHalfEdge = [...this.faceHalfEdge];
    copy.faceMaterial = [...this.faceMaterial];
    copy.materialSlots = [...this.materialSlots];
    return copy;
  }

  /** No-op until edit operations can delete elements (Phase 4). */
  compact(): void {
    // Nothing to compact yet: nothing is ever removed in Phase 2.
  }

  memoryBytes(): number {
    return (
      this.positions.length * 8 +
      this.heVert.length * 4 * 6 +
      this.heUv.length * 4 +
      this.faceHalfEdge.length * 4 * 2
    );
  }
}
