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
  faceMaterial: number[] = []; // index into materialSlots, or -1 = no material assigned (renders with the default fallback)
  materialSlots: string[] = []; // MaterialDef ids, in project-palette order
  /** Canonical edge ids (from `edges()`) marked as UV seams (U-05), shown red in the viewport. */
  seamEdges = new Set<number>();

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

  /**
   * Connects half-edge twins automatically by matching directed edges.
   * `uvs` gives one UV pair per corner (i.e. per entry in `verts`), stored
   * per half-edge rather than per vertex — the same physical vertex can
   * carry a different UV for each face that touches it, which is exactly
   * what a texture seam needs.
   */
  addFace(verts: number[], uvs: [number, number][], material = -1): number {
    if (verts.length < 3) {
      throw new Error('addFace requires at least 3 vertices');
    }
    if (uvs.length !== verts.length) {
      throw new Error('addFace requires one UV pair per vertex');
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
      this.heUv.push(uvs[i][0], uvs[i][1]);

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

  setVertexPosition(v: number, p: Vec3): void {
    this.positions[v * 3] = p.x;
    this.positions[v * 3 + 1] = p.y;
    this.positions[v * 3 + 2] = p.z;
  }

  /** All half-edges whose face-corner starts at this vertex (outgoing). */
  outgoingHalfEdges(v: number): number[] {
    const result: number[] = [];
    const heCount = this.heVert.length;
    for (let h = 0; h < heCount; h++) {
      if (this.heVert[this.hePrev[h]] === v) result.push(h);
    }
    return result;
  }

  /** Faces incident to a vertex, via its outgoing half-edges. */
  vertexFaces(v: number): number[] {
    const faces = new Set<number>();
    for (const h of this.outgoingHalfEdges(v)) {
      if (this.heFace[h] !== EMPTY) faces.add(this.heFace[h]);
    }
    return [...faces];
  }

  /**
   * Enumerates unique edges as `{ id, a, b }`, where `id` is the lower of
   * the two half-edge indices sharing that edge (or the sole one, for a
   * border edge) — stable enough for a selection key within one mesh
   * instance since half-edges are never reordered in Phase 2-3.
   */
  edges(): { id: number; a: number; b: number }[] {
    const seen = new Set<number>();
    const result: { id: number; a: number; b: number }[] = [];
    for (let h = 0; h < this.heVert.length; h++) {
      const id = this.edgeId(h);
      if (seen.has(id)) continue;
      seen.add(id);
      result.push({ id, a: this.heVert[this.hePrev[h]], b: this.heVert[h] });
    }
    return result;
  }

  private edgeId(h: number): number {
    const twin = this.heTwin[h];
    return twin === EMPTY ? h : Math.min(h, twin);
  }

  private oppositeInFace(h: number): number {
    return this.heNext[this.heNext[h]];
  }

  /**
   * Edge-loop walk starting from a half-edge, per the PRD algorithm: cross
   * each quad via its opposite edge (`next(next(h))`), then `twin`, into
   * the next quad. Walks both directions from the start edge so it covers
   * a whole open strip (e.g. a plane's grid) as well as a closed ring
   * (e.g. a cylinder's side).
   */
  edgeLoop(startHe: number): number[] {
    const collected = new Set<number>();
    const startId = this.edgeId(startHe);

    const walk = (initialEnter: number): void => {
      let enter = initialEnter;
      for (let guard = 0; guard < this.heVert.length; guard++) {
        const face = this.heFace[enter];
        if (face === EMPTY) return;
        const verts = this.faceVertices(face);
        if (verts.length !== 4) return; // only quads carry a well-defined opposite edge
        const exit = this.oppositeInFace(enter);
        collected.add(this.edgeId(enter));
        collected.add(this.edgeId(exit));
        const twin = this.heTwin[exit];
        if (twin === EMPTY) return;
        if (this.edgeId(exit) === startId) return; // closed the loop
        enter = twin;
      }
    };

    walk(startHe);
    const startTwin = this.heTwin[startHe];
    if (startTwin !== EMPTY) walk(startTwin);
    return [...collected];
  }

  /** Breadth-first over faces sharing an edge (twin), for "select linked" (L). */
  connectedFaces(seedFace: number): number[] {
    const visited = new Set<number>([seedFace]);
    const queue = [seedFace];
    while (queue.length) {
      const f = queue.shift()!;
      const start = this.faceHalfEdge[f];
      let h = start;
      do {
        const twin = this.heTwin[h];
        if (twin !== EMPTY) {
          const neighborFace = this.heFace[twin];
          if (neighborFace !== EMPTY && !visited.has(neighborFace)) {
            visited.add(neighborFace);
            queue.push(neighborFace);
          }
        }
        h = this.heNext[h];
      } while (h !== start);
    }
    return [...visited];
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
    copy.seamEdges = new Set(this.seamEdges);
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
