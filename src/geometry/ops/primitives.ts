import { EditableMesh } from '../EditableMesh';
import type { Vec3 } from '../../core/math/types';

function addVert(mesh: EditableMesh, p: Vec3, u: number, v: number): number {
  const idx = mesh.addVertex(p);
  mesh.setUv(idx, u, v);
  return idx;
}

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

  // Each face gets its own 4 corner vertices so it can have flat UVs/normals.
  const faces: { corners: Vec3[] }[] = [
    { corners: [{x:-hw,y:-hh,z:hd},{x:hw,y:-hh,z:hd},{x:hw,y:hh,z:hd},{x:-hw,y:hh,z:hd}] }, // +Z
    { corners: [{x:hw,y:-hh,z:-hd},{x:-hw,y:-hh,z:-hd},{x:-hw,y:hh,z:-hd},{x:hw,y:hh,z:-hd}] }, // -Z
    { corners: [{x:-hw,y:-hh,z:-hd},{x:-hw,y:-hh,z:hd},{x:-hw,y:hh,z:hd},{x:-hw,y:hh,z:-hd}] }, // -X
    { corners: [{x:hw,y:-hh,z:hd},{x:hw,y:-hh,z:-hd},{x:hw,y:hh,z:-hd},{x:hw,y:hh,z:hd}] }, // +X
    { corners: [{x:-hw,y:hh,z:hd},{x:hw,y:hh,z:hd},{x:hw,y:hh,z:-hd},{x:-hw,y:hh,z:-hd}] }, // +Y
    { corners: [{x:-hw,y:-hh,z:-hd},{x:hw,y:-hh,z:-hd},{x:hw,y:-hh,z:hd},{x:-hw,y:-hh,z:hd}] }, // -Y
  ];

  const faceUvs: [number, number][] = [[0,0],[1,0],[1,1],[0,1]];
  for (const face of faces) {
    const verts = face.corners.map((c, i) => addVert(mesh, c, faceUvs[i][0], faceUvs[i][1]));
    mesh.addFace(verts);
  }
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

  for (let j = 0; j < segmentsD; j++) {
    for (let i = 0; i < segmentsW; i++) {
      const x0 = -hw + (width * i) / segmentsW;
      const x1 = -hw + (width * (i + 1)) / segmentsW;
      const z0 = -hd + (depth * j) / segmentsD;
      const z1 = -hd + (depth * (j + 1)) / segmentsD;
      const v00 = addVert(mesh, { x: x0, y: 0, z: z0 }, i / segmentsW, j / segmentsD);
      const v10 = addVert(mesh, { x: x1, y: 0, z: z0 }, (i + 1) / segmentsW, j / segmentsD);
      const v11 = addVert(mesh, { x: x1, y: 0, z: z1 }, (i + 1) / segmentsW, (j + 1) / segmentsD);
      const v01 = addVert(mesh, { x: x0, y: 0, z: z1 }, i / segmentsW, (j + 1) / segmentsD);
      mesh.addFace([v00, v10, v11, v01]);
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

  // Side quads: one strip per radial segment, each with its own vertices
  // (hard edge on the caps) so UVs unwrap cleanly.
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2;
    const a1 = ((i + 1) / seg) * Math.PI * 2;
    const bl = addVert(
      mesh,
      { x: Math.cos(a0) * radiusBottom, y: -hh, z: Math.sin(a0) * radiusBottom },
      i / seg,
      0,
    );
    const br = addVert(
      mesh,
      { x: Math.cos(a1) * radiusBottom, y: -hh, z: Math.sin(a1) * radiusBottom },
      (i + 1) / seg,
      0,
    );
    const tr = addVert(
      mesh,
      { x: Math.cos(a1) * radiusTop, y: hh, z: Math.sin(a1) * radiusTop },
      (i + 1) / seg,
      1,
    );
    const tl = addVert(
      mesh,
      { x: Math.cos(a0) * radiusTop, y: hh, z: Math.sin(a0) * radiusTop },
      i / seg,
      1,
    );
    mesh.addFace([bl, br, tr, tl]);
  }

  // Caps: single n-gons, per the PRD ("cilindro: n lati + 2 n-gon").
  if (radiusBottom > 0) {
    const bottom: number[] = [];
    for (let i = seg - 1; i >= 0; i--) {
      const a = (i / seg) * Math.PI * 2;
      bottom.push(
        addVert(mesh, { x: Math.cos(a) * radiusBottom, y: -hh, z: Math.sin(a) * radiusBottom }, 0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5),
      );
    }
    mesh.addFace(bottom);
  }
  if (radiusTop > 0) {
    const top: number[] = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      top.push(
        addVert(mesh, { x: Math.cos(a) * radiusTop, y: hh, z: Math.sin(a) * radiusTop }, 0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5),
      );
    }
    mesh.addFace(top);
  }

  return mesh;
}

export interface ConeParams {
  radius: number;
  height: number;
  radialSegments: number;
}

export function createCone(params: ConeParams = { radius: 0.5, height: 1, radialSegments: 24 }): EditableMesh {
  return createCylinder({ radiusTop: 0, radiusBottom: params.radius, height: params.height, radialSegments: params.radialSegments });
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

  for (let j = 0; j < heightSegments; j++) {
    const v0 = j / heightSegments;
    const v1 = (j + 1) / heightSegments;
    const isTopPole = j === 0;
    const isBottomPole = j === heightSegments - 1;

    for (let i = 0; i < widthSegments; i++) {
      const u0 = i / widthSegments;
      const u1 = (i + 1) / widthSegments;

      if (isTopPole) {
        // Triangle fan at the pole, per the PRD.
        const apex = addVert(mesh, pointAt((u0 + u1) / 2, v0), (u0 + u1) / 2, v0);
        const b0 = addVert(mesh, pointAt(u0, v1), u0, v1);
        const b1 = addVert(mesh, pointAt(u1, v1), u1, v1);
        mesh.addFace([apex, b0, b1]);
      } else if (isBottomPole) {
        const t0 = addVert(mesh, pointAt(u0, v0), u0, v0);
        const t1 = addVert(mesh, pointAt(u1, v0), u1, v0);
        const apex = addVert(mesh, pointAt((u0 + u1) / 2, v1), (u0 + u1) / 2, v1);
        mesh.addFace([t0, t1, apex]);
      } else {
        const a = addVert(mesh, pointAt(u0, v0), u0, v0);
        const b = addVert(mesh, pointAt(u1, v0), u1, v0);
        const c = addVert(mesh, pointAt(u1, v1), u1, v1);
        const d = addVert(mesh, pointAt(u0, v1), u0, v1);
        mesh.addFace([a, b, c, d]);
      }
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

  for (let j = 0; j < radialSegments; j++) {
    const v0 = j / radialSegments;
    const v1 = (j + 1) / radialSegments;
    for (let i = 0; i < tubularSegments; i++) {
      const u0 = i / tubularSegments;
      const u1 = (i + 1) / tubularSegments;
      const a = addVert(mesh, pointAt(u0, v0), u0, v0);
      const b = addVert(mesh, pointAt(u0, v1), u0, v1);
      const c = addVert(mesh, pointAt(u1, v1), u1, v1);
      const d = addVert(mesh, pointAt(u1, v0), u1, v0);
      mesh.addFace([a, b, c, d]);
    }
  }

  return mesh;
}
