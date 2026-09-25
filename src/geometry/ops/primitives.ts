import { EditableMesh } from '../EditableMesh';
import type { Vec3 } from '../../core/math/types';

export interface CubeParams {
  width: number;
  height: number;
  depth: number;
}

export function createCube(params: CubeParams = { width: 1, height: 1, depth: 1 }): EditableMesh {
  const mesh = new EditableMesh();
  const hw = params.width / 2;
  const hh = params.height / 2;
  const hd = params.depth / 2;

  // 8 shared corners: faces reference them so adjacent faces stay
  // connected (twins resolve), even though each face still gets its own
  // flat UV square via per-corner UVs.
  const corners: Vec3[] = [
    { x: -hw, y: -hh, z: -hd },
    { x: hw, y: -hh, z: -hd },
    { x: hw, y: hh, z: -hd },
    { x: -hw, y: hh, z: -hd },
    { x: -hw, y: -hh, z: hd },
    { x: hw, y: -hh, z: hd },
    { x: hw, y: hh, z: hd },
    { x: -hw, y: hh, z: hd },
  ];
  const v = corners.map((c) => mesh.addVertex(c));
  const uvSquare: [number, number][] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  const faces = [
    [v[4], v[5], v[6], v[7]], // +Z
    [v[1], v[0], v[3], v[2]], // -Z
    [v[0], v[4], v[7], v[3]], // -X
    [v[5], v[1], v[2], v[6]], // +X
    [v[3], v[7], v[6], v[2]], // +Y
    [v[0], v[1], v[5], v[4]], // -Y
  ];
  for (const face of faces) mesh.addFace(face, uvSquare);
  return mesh;
}

export interface PlaneParams {
  width: number;
  depth: number;
  segmentsW: number;
  segmentsD: number;
}

export function createPlane(
  params: PlaneParams = { width: 1, depth: 1, segmentsW: 1, segmentsD: 1 },
): EditableMesh {
  const mesh = new EditableMesh();
  const { width, depth } = params;
  const segmentsW = Math.max(1, Math.floor(params.segmentsW));
  const segmentsD = Math.max(1, Math.floor(params.segmentsD));
  const hw = width / 2;
  const hd = depth / 2;

  const grid: number[][] = [];
  for (let j = 0; j <= segmentsD; j++) {
    const row: number[] = [];
    for (let i = 0; i <= segmentsW; i++) {
      const x = -hw + (width * i) / segmentsW;
      const z = -hd + (depth * j) / segmentsD;
      row.push(mesh.addVertex({ x, y: 0, z }));
    }
    grid.push(row);
  }

  for (let j = 0; j < segmentsD; j++) {
    for (let i = 0; i < segmentsW; i++) {
      const v00 = grid[j][i];
      const v10 = grid[j][i + 1];
      const v11 = grid[j + 1][i + 1];
      const v01 = grid[j + 1][i];
      const uv: [number, number][] = [
        [i / segmentsW, j / segmentsD],
        [(i + 1) / segmentsW, j / segmentsD],
        [(i + 1) / segmentsW, (j + 1) / segmentsD],
        [i / segmentsW, (j + 1) / segmentsD],
      ];
      mesh.addFace([v00, v10, v11, v01], uv);
    }
  }
  return mesh;
}

export interface CylinderParams {
  radiusTop: number;
  radiusBottom: number;
  height: number;
  radialSegments: number;
}

export function createCylinder(
  params: CylinderParams = { radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 24 },
): EditableMesh {
  const mesh = new EditableMesh();
  const { radiusTop, radiusBottom, height } = params;
  const seg = Math.max(3, Math.floor(params.radialSegments));
  const hh = height / 2;

  const bottomRing: number[] = [];
  const topRing: number[] = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    bottomRing.push(mesh.addVertex({ x: Math.cos(a) * radiusBottom, y: -hh, z: Math.sin(a) * radiusBottom }));
    topRing.push(mesh.addVertex({ x: Math.cos(a) * radiusTop, y: hh, z: Math.sin(a) * radiusTop }));
  }

  // Side quads share ring vertices with their neighbors (and with the
  // caps below), wrapping via modulo; the seam still gets a clean 0..1 U
  // because UV lives per-corner, not per-vertex.
  for (let i = 0; i < seg; i++) {
    const i1 = (i + 1) % seg;
    const bl = bottomRing[i];
    const br = bottomRing[i1];
    const tr = topRing[i1];
    const tl = topRing[i];
    const u0 = i / seg;
    const u1 = (i + 1) / seg;
    mesh.addFace(
      [bl, br, tr, tl],
      [
        [u0, 0],
        [u1, 0],
        [u1, 1],
        [u0, 1],
      ],
    );
  }

  if (radiusBottom > 0) {
    const bottom = [...bottomRing].reverse();
    const uv: [number, number][] = bottom.map((_, k) => {
      const i = seg - 1 - k;
      const a = (i / seg) * Math.PI * 2;
      return [0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5];
    });
    mesh.addFace(bottom, uv);
  }
  if (radiusTop > 0) {
    const uv: [number, number][] = topRing.map((_, i) => {
      const a = (i / seg) * Math.PI * 2;
      return [0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5];
    });
    mesh.addFace(topRing, uv);
  }

  return mesh;
}

export interface ConeParams {
  radius: number;
  height: number;
  radialSegments: number;
}

export function createCone(params: ConeParams = { radius: 0.5, height: 1, radialSegments: 24 }): EditableMesh {
  const mesh = new EditableMesh();
  const { radius, height } = params;
  const seg = Math.max(3, Math.floor(params.radialSegments));
  const hh = height / 2;

  const apex = mesh.addVertex({ x: 0, y: hh, z: 0 });
  const base: number[] = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    base.push(mesh.addVertex({ x: Math.cos(a) * radius, y: -hh, z: Math.sin(a) * radius }));
  }

  for (let i = 0; i < seg; i++) {
    const i1 = (i + 1) % seg;
    const u0 = i / seg;
    const u1 = (i + 1) / seg;
    mesh.addFace(
      [base[i], base[i1], apex],
      [
        [u0, 0],
        [u1, 0],
        [(u0 + u1) / 2, 1],
      ],
    );
  }

  const cap = [...base].reverse();
  const uv: [number, number][] = cap.map((_, k) => {
    const i = seg - 1 - k;
    const a = (i / seg) * Math.PI * 2;
    return [0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5];
  });
  mesh.addFace(cap, uv);

  return mesh;
}

export interface SphereParams {
  radius: number;
  widthSegments: number;
  heightSegments: number;
}

export function createSphere(
  params: SphereParams = { radius: 0.5, widthSegments: 24, heightSegments: 16 },
): EditableMesh {
  const mesh = new EditableMesh();
  const { radius } = params;
  const widthSegments = Math.max(3, Math.floor(params.widthSegments));
  const heightSegments = Math.max(2, Math.floor(params.heightSegments));

  const pointAt = (u: number, v: number): Vec3 => {
    const theta = u * Math.PI * 2;
    const phi = v * Math.PI;
    return {
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.cos(phi),
      z: radius * Math.sin(phi) * Math.sin(theta),
    };
  };

  const topPole = mesh.addVertex(pointAt(0, 0));
  const bottomPole = mesh.addVertex(pointAt(0, Math.PI));
  // One shared ring of vertices per interior latitude (heightSegments - 1
  // rings between the poles); the longitude seam wraps via modulo.
  const rings: number[][] = [];
  for (let j = 1; j < heightSegments; j++) {
    const v = j / heightSegments;
    const ring: number[] = [];
    for (let i = 0; i < widthSegments; i++) {
      ring.push(mesh.addVertex(pointAt(i / widthSegments, v)));
    }
    rings.push(ring);
  }

  for (let i = 0; i < widthSegments; i++) {
    const i1 = (i + 1) % widthSegments;
    const u0 = i / widthSegments;
    const u1 = (i + 1) / widthSegments;
    const firstRing = rings[0];
    mesh.addFace(
      [topPole, firstRing[i], firstRing[i1]],
      [
        [(u0 + u1) / 2, 0],
        [u0, 1 / heightSegments],
        [u1, 1 / heightSegments],
      ],
    );
    const lastRing = rings[rings.length - 1];
    mesh.addFace(
      [lastRing[i1], lastRing[i], bottomPole],
      [
        [u1, 1 - 1 / heightSegments],
        [u0, 1 - 1 / heightSegments],
        [(u0 + u1) / 2, 1],
      ],
    );
  }

  for (let j = 0; j < rings.length - 1; j++) {
    const v0 = (j + 1) / heightSegments;
    const v1 = (j + 2) / heightSegments;
    for (let i = 0; i < widthSegments; i++) {
      const i1 = (i + 1) % widthSegments;
      const u0 = i / widthSegments;
      const u1 = (i + 1) / widthSegments;
      const a = rings[j][i];
      const b = rings[j][i1];
      const c = rings[j + 1][i1];
      const d = rings[j + 1][i];
      mesh.addFace(
        [a, b, c, d],
        [
          [u0, v0],
          [u1, v0],
          [u1, v1],
          [u0, v1],
        ],
      );
    }
  }

  return mesh;
}

export interface TorusParams {
  radius: number;
  tubeRadius: number;
  radialSegments: number;
  tubularSegments: number;
}

export function createTorus(
  params: TorusParams = { radius: 0.5, tubeRadius: 0.15, radialSegments: 16, tubularSegments: 32 },
): EditableMesh {
  const mesh = new EditableMesh();
  const { radius, tubeRadius } = params;
  const radialSegments = Math.max(3, Math.floor(params.radialSegments));
  const tubularSegments = Math.max(3, Math.floor(params.tubularSegments));

  const pointAt = (u: number, v: number): Vec3 => {
    const theta = u * Math.PI * 2; // around the tube
    const phi = v * Math.PI * 2; // around the torus
    const px = Math.cos(phi) * (radius + tubeRadius * Math.cos(theta));
    const pz = Math.sin(phi) * (radius + tubeRadius * Math.cos(theta));
    const py = tubeRadius * Math.sin(theta);
    return { x: px, y: py, z: pz };
  };

  // Both directions wrap: a full grid of shared vertices, no duplicated
  // seam column/row (per-corner UV handles the 1.0 -> 0.0 jump).
  const grid: number[][] = [];
  for (let j = 0; j < radialSegments; j++) {
    const row: number[] = [];
    for (let i = 0; i < tubularSegments; i++) {
      row.push(mesh.addVertex(pointAt(i / tubularSegments, j / radialSegments)));
    }
    grid.push(row);
  }

  for (let j = 0; j < radialSegments; j++) {
    const j1 = (j + 1) % radialSegments;
    const v0 = j / radialSegments;
    const v1 = (j + 1) / radialSegments;
    for (let i = 0; i < tubularSegments; i++) {
      const i1 = (i + 1) % tubularSegments;
      const u0 = i / tubularSegments;
      const u1 = (i + 1) / tubularSegments;
      const a = grid[j][i];
      const b = grid[j][i1];
      const c = grid[j1][i1];
      const d = grid[j1][i];
      mesh.addFace(
        [a, b, c, d],
        [
          [u0, v0],
          [u1, v0],
          [u1, v1],
          [u0, v1],
        ],
      );
    }
  }

  return mesh;
}
