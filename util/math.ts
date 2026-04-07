// @ts-nocheck -- TODO(ts-conversion): vector indexing and optional method errors.
"use strict";

/**
 * Assorted geometry utility functions.
 *
 * This file was originally written in a modified form of ES6 way back in ~2010.
 * It was then transpiled to ES5 before being ported later to ES6.
 *
 * TODO: cleanup this file.
 */

import * as util from "./util.js";
import * as vectormath from "./vectormath.js";

import {
  Vector2,
  Vector3,
  Vector4,
  Matrix4,
  Quat,
  type Vector2Instance,
  type Vector3Instance,
  type Vector4Instance,
} from "./vectormath.js";

/* eslint-disable @typescript-eslint/no-non-null-assertion */

/*
 * Type aliases for vector instances used throughout this geometry module.
 * Math functions operate on vectors returned by cacherings, which are always
 * fully initialized. We use the Instance types directly and assert non-null
 * on optional methods that we know exist at runtime on concrete vector classes.
 */
type Vec2 = Vector2Instance;
type Vec3 = Vector3Instance;
type Vec4 = Vector4Instance;

/** Writable numeric-indexable type, compatible with Vector2/3/4 and plain arrays */
interface MyVectorLike {
  [index: number]: number;
  readonly length: number;
}

interface CacheRing<T> {
  next(): T;
}

/* Helper to type cachering.fromConstructor results with the right instance type */
function cacheRing<T>(ring: { next(): unknown }): CacheRing<T> {
  return ring as CacheRing<T>;
}

/* Vec types used as function params -- accept both vectors and plain arrays */
type Vec2Like = Vec2 | MyVectorLike;
type Vec3Like = Vec3 | MyVectorLike;
type Vec4Like = Vec4 | MyVectorLike;

let dtvtmps: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 32));

let quad_co_rets2: CacheRing<Vec2> = cacheRing<Vec2>(util.cachering.fromConstructor(Vector2, 512));

export function quad_bilinear(v1: number, v2: number, v3: number, v4: number, u: number, v: number): number {
  return -((v1 - v2) * u - v1 - (u * v1 - u * v2 + u * v3 - u * v4 - v1 + v4) * v);
}

/*

 on factor;
 off period;

 a1 := v1 + (v2 - v1) * u;
 a2 := v4 + (v3 - v4) * u;
 bilin := a1 + (a2 - a1) * v;

 v1x := 0;
 v1y := 0;

 bx := sub(v1=v1x, v2=v2x, v3=v3x, v4=v4x, bilin);
 by := sub(v1=v1y, v2=v2y, v3=v3y, v4=v4y, bilin);

 f1 := bx - x;
 f2 := by - y;

 ff := solve({f1, f2}, {u, v});

 */
function quad_uv_2d(p: MyVectorLike, v1: MyVectorLike, v2: MyVectorLike, v3: MyVectorLike, v4: MyVectorLike): Vec2 {
  let u: number, v: number;

  let v2x = v2[0] - v1[0];
  let v2y = v2[1] - v1[1];
  let v3x = v3[0] - v1[0];
  let v3y = v3[1] - v1[1];
  let v4x = v4[0] - v1[0];
  let v4y = v4[1] - v1[1];

  let x = p[0] - v1[0];
  let y = p[1] - v1[1];
  let sqrt = Math.sqrt;

  let A =
    2 *
      (((v4y + y) * x - 2 * v4x * y) * v3y +
        (v4x * y - v4y * x) * (v4y + y) -
        ((v4x - x) * v2y - v3x * y) * (v4y - y)) *
      v2x -
    2 * ((v4x * y - v4y * x) * (v4x + x) - (v4x - x) * v3y * x + ((2 * v4y - y) * x - v4x * y) * v3x) * v2y +
    (v4x * y - v4y * x + v3y * x - v3x * y) ** 2 +
    (v4x - x) ** 2 * v2y ** 2 +
    (v4y - y) ** 2 * v2x ** 2;

  let B = v4x * y - v4y * x + v3y * x - v3x * y;

  let C1 = 2 * (v3x - v4x) * v2y - 2 * (v3y - v4y) * v2x;
  let C2 = 2 * (v3x * v4y - v3y * v4x + v2y * v4x) - 2 * v2x * v4y;

  let u1: number, u2: number;
  let v1_out: number, v2_out: number;

  if (A < 0.0) {
    console.log("A was < 0", A);
    A = -A;
    C1 = C2 = 0.0;
  }

  if (Math.abs(C1) < 0.00001) {
    //perfectly 90 degrees?
    let dx = v2x;
    let dy = v2y;

    console.log("C1 bad");

    let l = Math.sqrt(dx * dx + dy * dy);
    if (l > 0.000001) {
      dx /= l * l;
      dy /= l * l;
    }

    u1 = u2 = dx * x + dy * y;
  } else {
    u1 = (-(B + sqrt(A) - (v4y - y) * v2x) - (v4x - x) * v2y) / C1;
    u2 = (-(B - sqrt(A) - (v4y - y) * v2x) - (v4x - x) * v2y) / C1;
  }

  if (Math.abs(C2) < 0.00001) {
    //perfectly 90 degrees?
    let dx, dy;

    dx = v3x - v2x;
    dy = v3y - v2y;

    console.log("C2 bad");

    let l = Math.sqrt(dx ** 2 + dy ** 2);
    if (l > 0.00001) {
      dx /= l * l;
      dy /= l * l;
    }

    v1_out = v2_out = x * dx + y * dy;
  } else {
    v1_out = (-(B - sqrt(A) + (v4y + y) * v2x) + (v4x + x) * v2y) / C2;
    v2_out = (-(B + sqrt(A) + (v4y + y) * v2x) + (v4x + x) * v2y) / C2;
  }

  let ret = quad_co_rets2.next();

  let d1 = (u1 - 0.5) ** 2 + (v1_out - 0.5) ** 2;
  let d2 = (u2 - 0.5) ** 2 + (v2_out - 0.5) ** 2;

  if (d1 < d2) {
    ret[0] = u1;
    ret[1] = v1_out;
  } else {
    ret[0] = u2;
    ret[1] = v2_out;
  }

  return ret;
}

export const ClosestModes = {
  CLOSEST  : 0,
  START    : 1,
  END      : 2,
  ENDPOINTS: 3,
  ALL      : 4,
};

let advs: CacheRing<Vec4> = cacheRing<Vec4>(util.cachering.fromConstructor(Vector4, 128));

export class AbstractCurve {
  evaluate(t: number): Vec3 {
    throw new Error("implement me");
  }

  derivative(t: number): void {}

  curvature(t: number): void {}

  normal(t: number): void {}

  width(t: number): void {}
}

export class ClosestCurveRets {
  p: Vec3;
  t: number;

  constructor() {
    this.p = new Vector3();
    this.t = 0;
  }
}

let cvrets: CacheRing<ClosestCurveRets> = cacheRing<ClosestCurveRets>(
  util.cachering.fromConstructor(ClosestCurveRets, 2048)
);
let cvarrays = new util.ArrayPool();
let cvtmp = new Array(1024);

export function closestPoint(p: MyVectorLike, curve: AbstractCurve, mode: number): void {
  let steps = 5;
  let s = 0,
    ds = 1.0 / steps;

  let ri = 0;

  for (let i = 0; i < steps; i++, s += ds) {
    let c1 = curve.evaluate(s);
    let c2 = curve.evaluate(s + ds);
  }
}

let poly_normal_tmps: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 64));
let pncent = new Vector3();

export function normal_poly(vs: MyVectorLike[]): Vec3 {
  if (vs.length === 3) {
    return poly_normal_tmps.next().load(normal_tri(vs[0], vs[1], vs[2]));
  } else if (vs.length === 4) {
    return poly_normal_tmps.next().load(normal_quad(vs[0], vs[1], vs[2], vs[3]));
  }

  if (vs.length === 0) {
    return poly_normal_tmps.next().zero();
  }

  let cent = pncent.zero();
  let tot = 0;

  for (let v of vs) {
    cent.add(v);
    tot++;
  }

  cent.mulScalar(1.0 / tot);
  let n = poly_normal_tmps.next().zero();

  for (let i = 0; i < vs.length; i++) {
    let a = vs[i];
    let b = vs[(i + 1) % vs.length];
    let c = cent;

    let n2 = normal_tri(a, b, c);
    n.add(n2);
  }

  n.normalize();
  return n;
}

/*
on factor;
off period;

f1 := u*v1x + v*v2x + (1.0-u-v)*v3x - px;
f2 := u*v1y + v*v2y + (1.0-u-v)*v3y - py;

ff := solve({f1, f2}, {u, v});

on fort;
part(ff, 1, 1);
part(ff, 1, 2);
off fort;

*/

let barycentric_v2_rets: CacheRing<Vec2> = cacheRing<Vec2>(util.cachering.fromConstructor(Vector2, 2048));
let calc_proj_refs: CacheRing<number[]> = cacheRing<number[]>(new util.cachering(() => [0, 0], 64));

/*
  a b c d
     b

  a------c

     d

  on factor;
  load_package avector;

  ax := 0;
  ay := 0;
  az := 0;

  a := avec(ax, ay, az);
  b := avec(bx, by, bz);
  c := avec(cx, cy, cz);
  d := avec(dx, dy, dz);

  n1 := d cross c;
  n2 := c cross b;

  n1 := n1 / (VMOD n1);
  n2 := n2 / (VMOD n2);

  d := n1 dot n2;
  on fort;

  d*d;

  off fort;


  */

/**

 v2

 v1------v3

 v4

 */
export function dihedral_v3_sqr(v1: MyVectorLike, v2: MyVectorLike, v3: MyVectorLike, v4: MyVectorLike): number {
  let bx = v2[0] - v1[0];
  let by = v2[1] - v1[1];
  let bz = v2[2] - v1[2];

  let cx = v3[0] - v1[0];
  let cy = v3[1] - v1[1];
  let cz = v3[2] - v1[2];

  let dx = v4[0] - v1[0];
  let dy = v4[1] - v1[1];
  let dz = v4[2] - v1[2];

  return (
    ((bx * cz - bz * cx) * (cx * dz - cz * dx) +
      (by * cz - bz * cy) * (cy * dz - cz * dy) +
      (bx * cy - by * cx) * (cx * dy - cy * dx)) **
      2 /
    (((bx * cz - bz * cx) ** 2 + (by * cz - bz * cy) ** 2 + (bx * cy - by * cx) ** 2) *
      ((cx * dz - cz * dx) ** 2 + (cy * dz - cz * dy) ** 2 + (cx * dy - cy * dx) ** 2))
  );
}

let tet_area_tmps: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 64));

export function tet_volume(a: MyVectorLike, b: MyVectorLike, c: MyVectorLike, d: MyVectorLike): number {
  let a2 = tet_area_tmps.next().load(a);
  let b2 = tet_area_tmps.next().load(b);
  let c2 = tet_area_tmps.next().load(c);
  let d2 = tet_area_tmps.next().load(d);

  a2.sub(d2);
  b2.sub(d2);
  c2.sub(d2);

  b2.cross(c2);
  return a2.dot(b2) / 6.0;
}

export function calc_projection_axes(no: MyVectorLike): number[] {
  let ax = Math.abs(no[0]),
    ay = Math.abs(no[1]),
    az = Math.abs(no[2]);

  let ret = calc_proj_refs.next();

  if (ax > ay && ax > az) {
    ret[0] = 1;
    ret[1] = 2;
  } else if (ay > az && ay > ax) {
    ret[0] = 0;
    ret[1] = 2;
  } else {
    ret[0] = 0;
    ret[1] = 1;
  }

  return ret;
}

let _avtmps = util.cachering.fromConstructor(Vector3, 128);

function inrect_3d(p: MyVectorLike, min: MyVectorLike, max: MyVectorLike): boolean {
  let ok = p[0] >= min[0] && p[0] <= max[0];
  ok = ok && p[1] >= min[1] && p[1] <= max[1];
  ok = ok && p[2] >= min[2] && p[2] <= max[2];

  return ok;
}

export function aabb_isect_line_3d(v1: MyVectorLike, v2: MyVectorLike, min: MyVectorLike, max: MyVectorLike): boolean {
  let inside = inrect_3d(v1, min, max);
  inside = inside || inrect_3d(v2, min, max);

  if (inside) {
    return true;
  }

  let cent = _avtmps.next().load(min).interp(max, 0.5);

  let cpl = closest_point_on_line(cent, v1, v2, true);
  if (!cpl) {
    return false;
  }

  let p = cpl[0];

  return inrect_3d(p, min, max);
}

export function aabb_isect_cylinder_3d(
  v1: MyVectorLike,
  v2: MyVectorLike,
  radius: number,
  min: MyVectorLike,
  max: MyVectorLike
): boolean {
  let inside = inrect_3d(v1, min, max);
  inside = inside || inrect_3d(v2, min, max);

  if (inside) {
    return true;
  }

  let cent = _avtmps.next().load(min).interp(max, 0.5);

  let cpl = closest_point_on_line(cent, v1, v2, true);
  if (!cpl) {
    return false;
  }

  let p = cpl[0];

  let size = _avtmps.next().load(max).sub(min);

  size.mulScalar(0.5);
  size.addScalar(radius); //*(3**0.5));

  p.sub(cent).abs();

  return p[0] <= size[0] && p[1] <= size[1] && p[2] <= size[2];
}

export function barycentric_v2(
  p: MyVectorLike,
  v1: MyVectorLike,
  v2: MyVectorLike,
  v3: MyVectorLike,
  axis1: number = 0,
  axis2: number = 1,
  out: MyVectorLike | undefined = undefined
): MyVectorLike {
  let div =
    v2[axis1] * v3[axis2] -
    v2[axis2] * v3[axis1] +
    (v2[axis2] - v3[axis2]) * v1[axis1] -
    (v2[axis1] - v3[axis1]) * v1[axis2];

  if (Math.abs(div) < 0.000001) {
    div = 0.00001;
  }

  let u =
    (v2[axis1] * v3[axis2] -
      v2[axis2] * v3[axis1] +
      (v2[axis2] - v3[axis2]) * p[axis1] -
      (v2[axis1] - v3[axis1]) * p[axis2]) /
    div;
  let v =
    (-(v1[axis1] * v3[axis2] - v1[axis2] * v3[axis1] + (v1[axis2] - v3[axis2]) * p[axis1]) +
      (v1[axis1] - v3[axis1]) * p[axis2]) /
    div;

  if (!out) {
    out = barycentric_v2_rets.next();
  }

  out[0] = u;
  out[1] = v;

  return out;
}

/*

on factor;

load_package "avector";

px := 0;
py := 0;
pz := 0;

v1 := avec(v1x, v1y, v1z);
v2 := avec(v2x, v2y, v2z);
p := avec(px, py, pz);

t1 := p - v1;
t2 := v2 - v1;

l1 := t2 / VMOD t2;

t := dot(t1, t2);

p2 := v1 + t2*t;

on fort;
dot(p2, p2);
off fort;

**/

function _linedis2(co: MyVectorLike, v1: MyVectorLike, v2: MyVectorLike): number {
  let v1x = v1[0] - co[0];
  let v1y = v1[1] - co[1];
  let v1z = v1[2] - co[2];

  let v2x = v2[0] - co[0];
  let v2y = v2[1] - co[1];
  let v2z = v2[2] - co[2];

  let dis =
    (((v1y - v2y) * v1y + (v1z - v2z) * v1z + (v1x - v2x) * v1x) * (v1y - v2y) - v1y) ** 2 +
    (((v1y - v2y) * v1y + (v1z - v2z) * v1z + (v1x - v2x) * v1x) * (v1z - v2z) - v1z) ** 2 +
    (((v1y - v2y) * v1y + (v1z - v2z) * v1z + (v1x - v2x) * v1x) * (v1x - v2x) - v1x) ** 2;

  return dis;
}

interface ClosestTriRet {
  co: Vec3;
  uv: Vec2;
  dist: number;
}

let closest_p_tri_rets: CacheRing<ClosestTriRet> = cacheRing<ClosestTriRet>(
  new util.cachering(() => {
    return {
      co  : new Vector3(),
      uv  : new Vector2(),
      dist: 0,
    };
  }, 512)
);

let cpt_v1 = new Vector3();
let cpt_v2 = new Vector3();
let cpt_v3 = new Vector3();
let cpt_v4 = new Vector3();
let cpt_v5 = new Vector3();
let cpt_v6 = new Vector3();
let cpt_p = new Vector3();
let cpt_n = new Vector3();
let cpt_mat = new Matrix4();
let cpt_mat2 = new Matrix4();
let cpt_b = new Vector3();

export function closest_point_on_quad(
  p: MyVectorLike,
  v1: MyVectorLike,
  v2: MyVectorLike,
  v3: MyVectorLike,
  v4: MyVectorLike,
  n: MyVectorLike | undefined,
  uvw: MyVectorLike | undefined
): ClosestTriRet {
  let a = closest_point_on_tri(p, v1, v2, v3, n, uvw);
  let b = closest_point_on_tri(p, v1, v3, v4, n, uvw);

  return a.dist <= b.dist ? a : b;
}

export function closest_point_on_tri(
  p: MyVectorLike,
  v1: MyVectorLike,
  v2: MyVectorLike,
  v3: MyVectorLike,
  n: MyVectorLike | undefined,
  uvw: MyVectorLike | undefined
): ClosestTriRet {
  let op = p;

  if (uvw) {
    (uvw as { [k: number]: number })[0] = (uvw as { [k: number]: number })[1] = 0.0;
    if (uvw.length > 2) {
      (uvw as { [k: number]: number })[2] = 0.0;
    }
  }

  let lv1: Vec3 = cpt_v1.load(v1);
  let lv2: Vec3 = cpt_v2.load(v2);
  let lv3: Vec3 = cpt_v3.load(v3);
  let lp: Vec3 = cpt_p.load(p);

  let ln: Vec3;
  if (n === undefined) {
    ln = cpt_n.load(normal_tri(lv1, lv2, lv3));
  } else {
    ln = cpt_n.load(n);
  }

  lv1.sub(lp);
  lv2.sub(lp);
  lv3.sub(lp);
  lp.zero();

  /*use least squares to solve for barycentric coordinates
    then clip to triangle

    we do this in 2d, as all solutions are coplanar anyway and that way we
    can have one of the equations be "u+v+w = 1".
    should investigate if this is really necassary.
   */

  let ax1: number, ax2: number;
  let ax = Math.abs(ln[0]),
    ay = Math.abs(ln[1]),
    az = Math.abs(ln[2]);
  if (ax === 0.0 && ay === 0.0 && az === 0.0) {
    console.log("eek1", ln, lv1, lv2, lv3);
    let ret = closest_p_tri_rets.next();

    ret.dist = 1e17;
    ret.co.zero();
    ret.uv.zero();

    return ret;
  }

  let ax3: number;
  if (ax >= ay && ax >= az) {
    ax1 = 1;
    ax2 = 2;
    ax3 = 0;
  } else if (ay >= ax && ay >= az) {
    ax1 = 0;
    ax2 = 2;
    ax3 = 1;
  } else {
    ax1 = 0;
    ax2 = 1;
    ax3 = 2;
  }

  let mat = cpt_mat;
  let mat2 = cpt_mat2;
  mat.makeIdentity();

  let m = mat.$matrix;

  m.m11 = lv1[ax1];
  m.m12 = lv2[ax1];
  m.m13 = lv3[ax1];
  m.m14 = 0.0;

  m.m21 = lv1[ax2];
  m.m22 = lv2[ax2];
  m.m23 = lv3[ax2];
  m.m24 = 0.0;

  /*
  m.m31 = lv1[ax3];
  m.m32 = lv2[ax3];
  m.m33 = lv3[ax3];
  m.m34 = 0.0;
  */

  m.m31 = 1;
  m.m32 = 1;
  m.m33 = 1;
  m.m34 = 0.0;

  mat.transpose();

  let b = cpt_b.zero();

  b[0] = lp[ax1];
  b[1] = lp[ax2];
  //b[2] = lp[ax3];
  b[2] = 1.0;
  b[3] = 0.0;

  mat2.load(mat).transpose();

  mat.preMultiply(mat2);

  if (mat.invert() === null) {
    console.log("eek2", (mat as unknown as { determinant(): number }).determinant(), ax1, ax2, ln);
    let ret = closest_p_tri_rets.next();

    ret.dist = 1e17;
    ret.co.zero();
    ret.uv.zero();

    return ret;
  }

  mat.multiply(mat2);

  b.multVecMatrix(mat);

  let u = b[0];
  let v = b[1];
  let w = b[2];

  for (let i = 0; i < 1; i++) {
    u = Math.min(Math.max(u, 0.0), 1.0);
    v = Math.min(Math.max(v, 0.0), 1.0);
    w = Math.min(Math.max(w, 0.0), 1.0);

    let tot = u + v + w;

    if (tot !== 0.0) {
      tot = 1.0 / tot;
      u *= tot;
      v *= tot;
      w *= tot;
    }
  }

  if (uvw) {
    (uvw as { [k: number]: number })[0] = u;
    (uvw as { [k: number]: number })[1] = v;
    if (uvw.length > 2) {
      (uvw as { [k: number]: number })[2] = w;
    }
  }

  let x = lv1[0] * u + lv2[0] * v + lv3[0] * w;
  let y = lv1[1] * u + lv2[1] * v + lv3[1] * w;
  let z = lv1[2] * u + lv2[2] * v + lv3[2] * w;

  let ret = closest_p_tri_rets.next();

  ret.co.loadXYZ(x, y, z);
  ret.uv[0] = u;
  ret.uv[1] = v;

  ret.dist = ret.co.vectorLength();
  ret.co.add(op);

  return ret;
}

export function dist_to_tri_v3_old(
  co: MyVectorLike,
  v1: MyVectorLike,
  v2: MyVectorLike,
  v3: MyVectorLike,
  no: Vec3 | undefined = undefined
): number {
  let lno: Vec3;
  if (!no) {
    lno = dtvtmps.next().load(normal_tri(v1, v2, v3));
  } else {
    lno = no;
  }

  let p = dtvtmps.next().load(co);
  p.sub(v1);

  let planedis = -p.dot(lno);

  let [axis, axis2] = calc_projection_axes(lno);

  let p1 = dtvtmps.next();
  let p2 = dtvtmps.next();
  let p3 = dtvtmps.next();

  p1[0] = v1[axis];
  p1[1] = v1[axis2];
  p1[2] = 0.0;

  p2[0] = v2[axis];
  p2[1] = v2[axis2];
  p2[2] = 0.0;

  p3[0] = v3[axis];
  p3[1] = v3[axis2];
  p3[2] = 0.0;

  let pp = dtvtmps.next();
  pp[0] = co[axis];
  pp[1] = co[axis2];
  pp[2] = 0.0;

  let dis = 1e17;

  function linedis2d(a: MyVectorLike, b: MyVectorLike, c: MyVectorLike): number {
    let dx1 = a[0] - b[0];
    let dy1 = a[1] - b[1];
    let dx2 = c[0] - b[0];
    let dy2 = c[1] - b[1];

    let len = dx2 * dx2 + dy2 * dy2;
    len = len > 0.000001 ? 1.0 / len : 0.0;

    dx2 *= len;
    dy2 *= len;

    return Math.abs(dx1 * dy2 - dx2 * dy1);
  }

  let tmp = dtvtmps.next();
  let tmp2 = dtvtmps.next();

  function linedis3d(a: MyVectorLike, b: Vec3, c: Vec3): number {
    tmp.load(a).sub(b);
    tmp2.load(c).sub(b).normalize();

    let t = tmp.dot(tmp2);
    t = Math.min(Math.max(t, 0.0), b.vectorDistance(c));

    tmp2.mulScalar(t).add(b);

    return tmp2.vectorDistance(a);
  }

  /* are we above the triangle? if so use plane distance */
  if (point_in_tri(pp, p1, p2, p3)) {
    return Math.abs(planedis);
  }

  /* get distance to the closest edge */
  dis = Math.min(dis, linedis3d(co, v1, v2));
  dis = Math.min(dis, linedis3d(co, v2, v3));
  dis = Math.min(dis, linedis3d(co, v3, v1));

  if (0) {
    let uv = barycentric_v2(pp, p1, p2, p3);

    let w = 1.0 - uv[0] - uv[1];
    uv[0] = Math.min(Math.max(uv[0], 0.0), 1.0);
    uv[1] = Math.min(Math.max(uv[1], 0.0), 1.0);
    w = Math.min(Math.max(w, 0.0), 1.0);

    let sum = uv[0] + uv[1] + w;
    sum = sum !== 0.0 ? 1.0 / sum : 0.0;

    w *= sum;
    uv[0] *= sum;
    uv[1] *= sum;

    pp.zero();

    pp.addFac(v1, uv[0]);
    pp.addFac(v2, uv[1]);
    pp.addFac(v3, 1.0 - uv[0] - uv[1]);

    dis = Math.min(dis, pp.vectorDistance(co));
  }

  return dis;
}

export function dist_to_tri_v3(
  p: MyVectorLike,
  v1: MyVectorLike,
  v2: MyVectorLike,
  v3: MyVectorLike,
  n?: Vec3
): number {
  return dist_to_tri_v3_old(p, v1, v2, v3, n);
  //return Math.sqrt(Math.abs(dist_to_tri_v3_sqr(p, v1, v2, v3, n)));
}

/* reduce script

on factor;

ax := 0;
ay := 0;

e1x := bx - ax;
e1y := by - ay;
e2x := cx - bx;
e2y := cy - by;
e3x := ax - cx;
e3y := ay - cy;

l1 := (e1x**2 + e1y**2)**0.5;
l2 := (e2x**2 + e2y**2)**0.5;
l3 := (e3x**2 + e3y**2)**0.5;

load_package "avector";

e1 := avec(e1x / l1, e1y / l1, 0.0);
e2 := avec(e2x / l2, e2y / l2, 0.0);
e3 := avec(e3x / l3, e3y / l3, 0.0);

d1 := x1*e1[1] - y1*e1[0];
d2 := x1*e2[1] - y1*e2[0];
d3 := x1*e3[1] - y1*e3[0];

d1 := d1**2;
d2 := d2**2;
d3 := d3**2;

on fort;
d1;
d2;
d3;
off fort;

*/

let _dt3s_n = new Vector3();

export function dist_to_tri_v3_sqr(
  p: MyVectorLike,
  v1: MyVectorLike,
  v2: MyVectorLike,
  v3: MyVectorLike,
  n?: Vec3
): number {
  if (n === undefined) {
    n = _dt3s_n;
    n.load(normal_tri(v1, v2, v3));
  }

  // find projection axis;
  let axis1: number, axis2: number, axis3: number;
  let nx = n[0] < 0.0 ? -n[0] : n[0];
  let ny = n[1] < 0.0 ? -n[1] : n[1];
  let nz = n[2] < 0.0 ? -n[2] : n[2];

  const feps = 0.0000001;

  if (nx > ny && nx > nz) {
    axis1 = 1;
    axis2 = 2;
    axis3 = 0;
  } else if (ny > nx && ny > nz) {
    axis1 = 0;
    axis2 = 2;
    axis3 = 1;
  } else {
    axis1 = 0;
    axis2 = 1;
    axis3 = 2;
  }

  //n.load(normal_tri(v1, v2, v3));

  let planedis = (p[0] - v1[0]) * n[0] + (p[1] - v1[1]) * n[1] + (p[2] - v1[2]) * n[2];
  planedis = planedis < 0.0 ? -planedis : planedis;

  let ax = v1[axis1],
    ay = v1[axis2],
    az = v1[axis3];

  let bx = v2[axis1] - ax,
    by = v2[axis2] - ay,
    bz = v2[axis3] - az;
  let cx = v3[axis1] - ax,
    cy = v3[axis2] - ay,
    cz = v3[axis3] - az;

  let bx2 = bx * bx,
    by2 = by * by,
    bz2 = bz * bz,
    cx2 = cx * cx,
    cy2 = cy * cy,
    cz2 = cz * cz;

  let x1 = p[axis1] - ax;
  let y1 = p[axis2] - ay;
  let z1 = p[axis3] - az;

  const testf = 0.0;

  let l1 = Math.sqrt(bx ** 2 + by ** 2);
  let l2 = Math.sqrt((cx - bx) ** 2 + (cy - by) ** 2);
  let l3 = Math.sqrt(cx ** 2 + cy ** 2);

  let s1 = x1 * by - y1 * bx < testf;
  let s2 = (x1 - bx) * (cy - by) - (y1 - by) * (cx - bx) < testf;
  let s3 = x1 * -cy + y1 * cx < testf;

  /*
    (x1-cx)*-cy - (y1-cy)*-cx
   reduces to:
     x1*-cy + y1*cx;
   */

  //console.log(axis1, axis2, axis3, n);
  //console.log(s1, s2, s3);
  //console.log(bx, by, cx, cy);

  if (1 && n[axis3] < 0.0) {
    s1 = !s1;
    s2 = !s2;
    s3 = !s3;
    /*
        bx = v3[axis1];
        by = v3[axis2];
        bz = v3[axis3];

        cx = v2[axis1];
        cy = v2[axis2];
        cz = v2[axis3];

        bx2 = bx*bx;
        by2 = by*by;
        bz2 = bz*bz;

        cx2 = cx*cx;
        cy2 = cy*cy;
        cz2 = cz*cz;*/
  }

  let mask = (s1 & 1) | (s2 << 1) | (s3 << 2);
  if (mask === 0 || mask === 7) {
    return planedis * planedis;
  }

  let d1: number, d2: number, d3: number, div: number;

  /*
//\  3|
//  \ |
//    b
//    | \
//  1 |   \  2
//    |  0  \
// ___a_______c___
//  5 |   4      \ 6
*/

  let dis = 0.0;
  let lx, ly, lz;

  lx = bx;
  ly = by;
  lz = bz;

  nx = n[axis1];
  ny = n[axis2];
  nz = n[axis3];

  switch (mask) {
    case 1:
      div = bx2 + by2;

      if (div > feps) {
        d1 = bx * y1 - by * x1;
        d1 = (d1 * d1) / div;

        lx = -by;
        ly = bx;
        lz = bz;
      } else {
        d1 = x1 * x1 + y1 * y1;

        lx = x1;
        ly = y1;
        lz = z1;
      }

      dis = d1;
      break;
    case 3:
      lx = x1 - bx;
      ly = y1 - by;
      lz = z1 - bz;

      dis = lx * lx + ly * ly;
      return lx * lx + ly * ly + lz * lz;
    case 2:
      div = (bx - cx) ** 2 + (by - cy) ** 2;

      if (div > feps) {
        d2 = (bx - cx) * y1 - (by - cy) * x1;
        d2 = d2 / div;

        lx = by - cy;
        ly = cx - bx;
        lz = cz - bz;
      } else {
        d2 = (x1 - bx) * (x1 - bx) + (y1 - by) * (y1 - by);

        lx = x1 - bx;
        ly = y1 - by;
        lz = z1 - bz;
      }

      dis = d2;
      break;
    case 6:
      lx = x1 - cx;
      ly = y1 - cy;
      lz = z1 - cz;

      return lx * lx + ly * ly + lz * lz;
    case 4:
      div = cx2 + cy2;

      if (div > feps) {
        d3 = cx * y1 - cy * x1;
        d3 = (d3 * d3) / div;

        lx = cy;
        ly = -cx;
        lz = cz;
      } else {
        d3 = (x1 - cx) * (x1 - cx) + (y1 - cy) * (y1 - cy);

        lx = x1 - cx;
        ly = y1 - cy;
        lz = z1 - cz;
      }

      dis = d3;
      break;
    case 5:
      lx = x1;
      ly = y1;
      lz = z1;

      return lx * lx + ly * ly + lz * lz;
  }

  //lx = p[axis1] - v1[axis1];
  //ly = p[axis2] - v1[axis2];
  {
    let d = lx * nx + ly * ny + lz * nz;

    d = -d;

    lx += nx * d;
    ly += ny * d;
    lz += nz * d;

    //dis = lx*lx + ly*ly;

    if (0 && Math.random() > 0.999) {
      console.log("d", d.toFixed(6));
      console.log(lx * nx + ly * ny + lz * nz);
    }
  }

  let mul = ((lx ** 2 + ly ** 2) * nz ** 2 + (lx * nx + ly * ny) ** 2) / ((lx ** 2 + ly ** 2) * nz ** 2);
  //let mul = ((lx**2+ly**2)*nz**2+(lx*nx+ly*ny)**2)/((ly**2+lz**2+lx**2)*nz**2);

  //mul = 1.0 / nz;
  //mul *= mul;

  if (Math.random() > 0.999) {
    console.log(mul.toFixed(4));
  }

  //mul = 1.0;

  if (0) {
    let odis = dis;

    dis = x1 ** 2 + y1 ** 2 + z1 ** 2;

    if (Math.random() > 0.999) {
      console.log((dis / odis).toFixed(4), mul.toFixed(4));
    }
    mul = 1.0;
  }

  /*
  on factor;

  dx := sqrt(dis)*(lx / sqrt(lx**2 + ly**2));
  dy := sqrt(dis)*(ly / sqrt(lx**2 + ly**2));
  f2 := dx*nx + dy*ny + dz*nz;

  fz := solve(f2, dz);
  fz := part(fz, 1, 2);

  dis2 := dx*dx + dy*dy + fz*fz;
  fmul := dis2/dis;

  on fort;
  fmul;
  off fort;


  */

  return dis * mul + planedis * planedis;
}

let tri_area_temps: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 64));

export function tri_area(v1: Vec3, v2: Vec3, v3: Vec3): number {
  let l1 = v1.vectorDistance(v2);
  let l2 = v2.vectorDistance(v3);
  let l3 = v3.vectorDistance(v1);

  let s = (l1 + l2 + l3) / 2.0;
  s = s * (s - l1) * (s - l2) * (s - l3);
  s = Math.max(s, 0); /* Numerical error can dip into negative numbers. */
  return Math.sqrt(s);
}

export function aabb_overlap_area(
  pos1: MyVectorLike,
  size1: MyVectorLike,
  pos2: MyVectorLike,
  size2: MyVectorLike
): number {
  let r1 = 0.0,
    r2 = 0.0;

  for (let i = 0; i < 2; i++) {
    let a1 = pos1[i],
      a2 = pos2[i];
    let b1 = pos1[i] + size1[i];
    let b2 = pos2[i] + size2[i];

    if (b1 >= a2 && b2 >= a1) {
      let r = Math.abs(a2 - b1);
      r = Math.min(r, Math.abs(a1 - b2));

      if (i) {
        r2 = r;
      } else {
        r1 = r;
      }
    }
  }

  return r1 * r2;
}

/**
 * Returns true if two aabbs intersect
 * @param {*} pos1
 * @param {*} size1
 * @param {*} pos2
 * @param {*} size2
 */

export function aabb_isect_2d(
  pos1: MyVectorLike,
  size1: MyVectorLike,
  pos2: MyVectorLike,
  size2: MyVectorLike
): boolean {
  let ret = 0;
  for (let i = 0; i < 2; i++) {
    let a = pos1[i];
    let b = pos1[i] + size1[i];
    let c = pos2[i];
    let d = pos2[i] + size2[i];
    if (b >= c && a <= d) ret += 1;
  }
  return ret === 2;
}

export function aabb_isect_3d(
  pos1: MyVectorLike,
  size1: MyVectorLike,
  pos2: MyVectorLike,
  size2: MyVectorLike
): boolean {
  let ret = 0;

  for (let i = 0; i < 3; i++) {
    let a = pos1[i];
    let b = pos1[i] + size1[i];

    let c = pos2[i];
    let d = pos2[i] + size2[i];

    if (b >= c && a <= d) ret += 1;
  }
  return ret === 3;
}

let aabb_intersect_vs: CacheRing<Vec2> = cacheRing<Vec2>(util.cachering.fromConstructor(Vector2, 32));

interface AABBIntersectRet {
  pos: Vec2;
  size: Vec2;
}

let aabb_intersect_rets: CacheRing<AABBIntersectRet> = cacheRing<AABBIntersectRet>(
  new util.cachering(() => {
    return {
      pos : new Vector2(),
      size: new Vector2(),
    };
  }, 512)
);

/**
 * Returns aabb that's the intersection of two aabbs
 * @param {*} pos1
 * @param {*} size1
 * @param {*} pos2
 * @param {*} size2
 */
export function aabb_intersect_2d(
  pos1: MyVectorLike,
  size1: MyVectorLike,
  pos2: MyVectorLike,
  size2: MyVectorLike
): AABBIntersectRet | undefined {
  let v1 = aabb_intersect_vs.next().load(pos1);
  let v2 = aabb_intersect_vs.next().load(pos1).add(size1);
  let v3 = aabb_intersect_vs.next().load(pos2);
  let v4 = aabb_intersect_vs.next().load(pos2).add(size2);

  let min = aabb_intersect_vs.next().zero();
  let max = aabb_intersect_vs.next().zero();

  let tot = 0;

  for (let i = 0; i < 2; i++) {
    if (v2[i] >= v3[i] && v1[i] <= v4[i]) {
      tot++;

      min[i] = Math.max(v3[i], v1[i]);
      max[i] = Math.min(v2[i], v4[i]);
    }
  }

  if (tot !== 2) {
    return undefined;
  }

  let ret = aabb_intersect_rets.next();
  ret.pos.load(min);
  ret.size.load(max).sub(min);

  return ret;
}

(window as unknown as Record<string, unknown>).test_aabb_intersect_2d = function test_aabb_intersect_2d(): {
  end: unknown;
  timer: unknown;
} {
  let canvas = document.getElementById("test_canvas") as HTMLCanvasElement | null;

  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.setAttribute("id", "test_canvas");
    (canvas as unknown as Record<string, unknown>).g = canvas.getContext("2d");

    document.body.appendChild(canvas);
  }

  canvas.width = ~~(window.innerWidth * devicePixelRatio);
  canvas.height = ~~(window.innerHeight * devicePixelRatio);
  canvas.style.width = canvas.width / devicePixelRatio + "px";
  canvas.style.height = canvas.height / devicePixelRatio + "px";
  canvas.style.position = "absolute";
  canvas.style["z-index"] = "1000";

  let g = (canvas as unknown as Record<string, unknown>).g as CanvasRenderingContext2D;
  g.clearRect(0, 0, canvas.width, canvas.height);

  let sz = 800;
  let a1 = new Vector2([Math.random() * sz, Math.random() * sz]).floor();
  let a2 = new Vector2([Math.random() * sz, Math.random() * sz]).floor();
  let b1 = new Vector2([Math.random() * sz, Math.random() * sz]).floor();
  let b2 = new Vector2([Math.random() * sz, Math.random() * sz]).floor();

  let p1 = new Vector2();
  let s1 = new Vector2();
  let p2 = new Vector2();
  let s2 = new Vector2();

  p1.load(a1).min(a2);
  s1.load(a1).max(a2);
  p2.load(b1).min(b2);
  s2.load(b1).max(b2);

  s1.sub(p1);
  s2.sub(p1);

  console.log(p1, s1);
  console.log(p2, s2);

  g.beginPath();
  g.rect(0, 0, canvas.width, canvas.height);
  g.fillStyle = "white";
  g.fill();

  g.beginPath();
  g.rect(p1[0], p1[1], s1[0], s1[1]);
  g.fillStyle = "rgba(255, 100, 75, 1.0)";
  g.fill();

  g.beginPath();
  g.rect(p2[0], p2[1], s2[0], s2[1]);
  g.fillStyle = "rgba(75, 100, 255, 1.0)";
  g.fill();

  let ret = aabb_intersect_2d(p1, s1, p2, s2);

  if (ret) {
    g.beginPath();
    g.rect(ret.pos[0], ret.pos[1], ret.size[0], ret.size[1]);
    g.fillStyle = "rgba(0, 0, 0, 1.0)";
    g.fill();
  }

  /*
  window.setTimeout(() => {
    canvas.remove();
  }, 2000);
  //*/

  return {
    end  : _test_aabb_intersect_2d.end,
    timer: _test_aabb_intersect_2d.timer,
  };
};

const _test_aabb_intersect_2d = (window as unknown as Record<string, unknown>).test_aabb_intersect_2d as {
  (): { end: unknown; timer: unknown };
  stop: () => void;
  end: () => void;
  timer: (rate?: number) => void;
  _timer: ReturnType<typeof setInterval> | undefined;
};

_test_aabb_intersect_2d.stop = function stop(): void {
  if (_test_aabb_intersect_2d._timer) {
    console.log("stopping timer");

    window.clearInterval(_test_aabb_intersect_2d._timer);
    _test_aabb_intersect_2d._timer = undefined;
  }
};

_test_aabb_intersect_2d.end = function end(): void {
  _test_aabb_intersect_2d.stop();

  let canvas = document.getElementById("test_canvas");
  if (canvas) {
    canvas.remove();
  }
};
_test_aabb_intersect_2d.timer = function timer(rate: number = 500): void {
  if (_test_aabb_intersect_2d._timer) {
    window.clearInterval(_test_aabb_intersect_2d._timer);
    _test_aabb_intersect_2d._timer = undefined;
    console.log("stopping timer");
    return;
  }

  console.log("starting timer");

  _test_aabb_intersect_2d._timer = window.setInterval(() => {
    _test_aabb_intersect_2d();
  }, rate);
};

let aabb_intersect_vs3: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 64));

export function aabb_intersect_3d(
  min1: MyVectorLike,
  max1: MyVectorLike,
  min2: MyVectorLike,
  max2: MyVectorLike
): boolean {
  let tot = 0;

  for (let i = 0; i < 2; i++) {
    if (max1[i] >= min2[i] && min1[i] <= max2[i]) {
      tot++;
    }
  }

  if (tot !== 3) {
    return false;
  }

  return true;
}

/**
 * AABB union of a and b.
 * Result is in a.
 *
 * @param a List of two vectors
 * @param b List of two vectors
 * @returns a
 */
export function aabb_union(
  a: { [k: number]: { [k: number]: number; length: number } },
  b: { [k: number]: MyVectorLike }
): typeof a {
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < a[i].length; j++) {
      a[i][j] = i ? Math.max(a[i][j], b[i][j]) : Math.min(a[i][j], b[i][j]);
    }
  }

  return a;
}

export function aabb_union_2d(
  pos1: MyVectorLike,
  size1: MyVectorLike,
  pos2: MyVectorLike,
  size2: MyVectorLike
): AABBIntersectRet {
  let v1 = aabb_intersect_vs.next();
  let v2 = aabb_intersect_vs.next();
  let min = aabb_intersect_vs.next();
  let max = aabb_intersect_vs.next();
  v1.load(pos1).add(size1);
  v2.load(pos2).add(size2);

  min.load(v1).min(v2);
  max.load(v1).max(v2);

  max.sub(min);
  let ret = aabb_intersect_rets.next();

  ret.pos.load(min);
  ret.pos.load(max);

  return ret;
}

//XXX refactor to use es6 classes,
//    or at last the class system in typesystem.js
function init_prototype(
  cls: { prototype: Record<string, unknown> },
  proto: Record<string, unknown>
): Record<string, unknown> {
  for (let k in proto) {
    cls.prototype[k] = proto[k];
  }

  return cls.prototype;
}

function inherit(
  cls: { prototype: Record<string, unknown> },
  parent: { prototype: Record<string, unknown> },
  proto: Record<string, unknown>
): Record<string, unknown> {
  cls.prototype = Object.create(parent.prototype);

  for (let k in proto) {
    cls.prototype[k] = proto[k];
  }

  return cls.prototype;
}

let set = util.set;

//everything below here was compiled from es6 code
//variables starting with $ are function static local vars,
//like in C.  don't use them outside their owning functions.
//
//except for $_mh and $_swapt.  they were used with a C macro
//preprocessor.
let $_mh: unknown, $_swapt: unknown;

//XXX destroy me
export const feps = 2.22e-16;

export const COLINEAR = 1;
export const LINECROSS = 2;
export const COLINEAR_ISECT = 3;

let _cross_vec1 = new Vector3();
let _cross_vec2 = new Vector3();

export const SQRT2 = Math.sqrt(2.0);
export const FEPS_DATA = {
  F16: 1.11e-16,
  F32: 5.96e-8,
  F64: 4.88e-4,
};

/*use 32 bit epsilon by default, since we're often working from
  32-bit float data.  note that javascript uses 64-bit doubles 
  internally.*/
export const FEPS = FEPS_DATA.F32;
export const FLOAT_MIN = -1e21;
export const FLOAT_MAX = 1e22;
export const Matrix4UI = Matrix4;

/*
This must be truly ancient code, possibly from
allshape days.

if (FLOAT_MIN != FLOAT_MIN || FLOAT_MAX != FLOAT_MAX) {
  FLOAT_MIN = 1e-05;
  FLOAT_MAX = 1000000.0;
  console.log("Floating-point 16-bit system detected!");
}
*/

let _static_grp_points4 = new Array(4);
let _static_grp_points8 = new Array(8);

export function get_rect_points(p: MyVectorLike, size: MyVectorLike): MyVectorLike[] {
  let cs: MyVectorLike[];
  if (p.length === 2) {
    cs = _static_grp_points4;
    cs[0] = p;
    cs[1] = [p[0] + size[0], p[1]];
    cs[2] = [p[0] + size[0], p[1] + size[1]];
    cs[3] = [p[0], p[1] + size[1]];
  } else if (p.length === 3) {
    cs = _static_grp_points8;
    cs[0] = p;
    cs[1] = [p[0] + size[0], p[1], p[2]];
    cs[2] = [p[0] + size[0], p[1] + size[1], p[2]];
    cs[3] = [p[0], p[1] + size[0], p[2]];
    cs[4] = [p[0], p[1], p[2] + size[2]];
    cs[5] = [p[0] + size[0], p[1], p[2] + size[2]];
    cs[6] = [p[0] + size[0], p[1] + size[1], p[2] + size[2]];
    cs[7] = [p[0], p[1] + size[0], p[2] + size[2]];
  } else {
    throw "get_rect_points has no implementation for " + p.length + "-dimensional data";
  }
  return cs;
}

export function get_rect_lines(p: MyVectorLike, size: MyVectorLike): MyVectorLike[][] {
  let ps = get_rect_points(p, size);
  if (p.length === 2) {
    return [
      [ps[0], ps[1]],
      [ps[1], ps[2]],
      [ps[2], ps[3]],
      [ps[3], ps[0]],
    ];
  } else if (p.length === 3) {
    let l1 = [
      [ps[0], ps[1]],
      [ps[1], ps[2]],
      [ps[2], ps[3]],
      [ps[3], ps[0]],
    ];
    let l2 = [
      [ps[4], ps[5]],
      [ps[5], ps[6]],
      [ps[6], ps[7]],
      [ps[7], ps[4]],
    ];
    l1.concat(l2);
    l1.push([ps[0], ps[4]]);
    l1.push([ps[1], ps[5]]);
    l1.push([ps[2], ps[6]]);
    l1.push([ps[3], ps[7]]);
    return l1;
  } else {
    throw "get_rect_points has no implementation for " + p.length + "-dimensional data";
  }
}

let $vs_simple_tri_aabb_isect: MyVectorLike[] = [
  0 as unknown as MyVectorLike,
  0 as unknown as MyVectorLike,
  0 as unknown as MyVectorLike,
];

export function simple_tri_aabb_isect(
  v1: MyVectorLike,
  v2: MyVectorLike,
  v3: MyVectorLike,
  min: MyVectorLike,
  max: MyVectorLike
): boolean {
  $vs_simple_tri_aabb_isect[0] = v1;
  $vs_simple_tri_aabb_isect[1] = v2;
  $vs_simple_tri_aabb_isect[2] = v3;
  for (let i = 0; i < 3; i++) {
    let isect = true;
    for (let j = 0; j < 3; j++) {
      if ($vs_simple_tri_aabb_isect[j][i] < min[i] || $vs_simple_tri_aabb_isect[j][i] >= max[i]) isect = false;
    }
    if (isect) return true;
  }
  return false;
}

export class MinMax {
  totaxis: number;
  min: number | MyVectorLike;
  max: number | MyVectorLike;
  _min: number | MyVectorLike;
  _max: number | MyVectorLike;
  _static_mr_co: unknown[];
  _static_mr_cs: unknown[];
  static STRUCT: string;

  constructor(totaxis?: number) {
    if (totaxis === undefined) {
      totaxis = 1;
    }
    this.totaxis = totaxis;
    if (totaxis !== 1) {
      let cls: { new (n: number): MyVectorLike };

      switch (totaxis) {
        case 2:
          cls = Vector2 as unknown as { new (n: number): MyVectorLike };
          break;
        case 3:
          cls = Vector3 as unknown as { new (n: number): MyVectorLike };
          break;
        case 4:
          cls = Vector4 as unknown as { new (n: number): MyVectorLike };
          break;
        default:
          cls = Array as unknown as { new (n: number): MyVectorLike };
          break;
      }

      this._min = new cls(totaxis);
      this._max = new cls(totaxis);
      this.min = new cls(totaxis);
      this.max = new cls(totaxis);
    } else {
      this.min = this.max = 0;
      this._min = FLOAT_MAX;
      this._max = FLOAT_MIN;
    }
    this.reset();
    this._static_mr_co = new Array(this.totaxis);
    this._static_mr_cs = new Array(this.totaxis * this.totaxis);
  }

  static fromSTRUCT(reader: (obj: MinMax) => void): MinMax {
    let ret = new MinMax();
    reader(ret);
    return ret;
  }

  load(mm: MinMax): void {
    if (this.totaxis === 1) {
      this.min = mm.min;
      this.max = mm.max;
      this._min = mm.min;
      this._max = mm.max;
    } else {
      this.min = new Vector3(mm.min as MyVectorLike);
      this.max = new Vector3(mm.max as MyVectorLike);
      this._min = new Vector3(mm._min as MyVectorLike);
      this._max = new Vector3(mm._max as MyVectorLike);
    }
  }

  reset(): void {
    let totaxis = this.totaxis;
    if (totaxis === 1) {
      this.min = this.max = 0;
      this._min = FLOAT_MAX;
      this._max = FLOAT_MIN;
    } else {
      for (let i = 0; i < totaxis; i++) {
        (this._min as { [k: number]: number })[i] = FLOAT_MAX;
        (this._max as { [k: number]: number })[i] = FLOAT_MIN;
        (this.min as { [k: number]: number })[i] = 0;
        (this.max as { [k: number]: number })[i] = 0;
      }
    }
  }

  minmax_rect(p: MyVectorLike, size: MyVectorLike): void {
    let totaxis = this.totaxis;
    let cs = this._static_mr_cs;
    if (totaxis === 2) {
      cs[0] = p;
      cs[1] = [p[0] + size[0], p[1]];
      cs[2] = [p[0] + size[0], p[1] + size[1]];
      cs[3] = [p[0], p[1] + size[1]];
    } else if ((totaxis = 3)) {
      cs[0] = p;
      cs[1] = [p[0] + size[0], p[1], p[2]];
      cs[2] = [p[0] + size[0], p[1] + size[1], p[2]];
      cs[3] = [p[0], p[1] + size[0], p[2]];
      cs[4] = [p[0], p[1], p[2] + size[2]];
      cs[5] = [p[0] + size[0], p[1], p[2] + size[2]];
      cs[6] = [p[0] + size[0], p[1] + size[1], p[2] + size[2]];
      cs[7] = [p[0], p[1] + size[0], p[2] + size[2]];
    } else {
      throw "Minmax.minmax_rect has no implementation for " + totaxis + "-dimensional data";
    }
    for (let i = 0; i < cs.length; i++) {
      this.minmax(cs[i]);
    }
  }

  minmax(p: number | MyVectorLike | vectormath.VectorLike<2 | 3 | 4>): void {
    let totaxis = this.totaxis;

    if (totaxis === 1) {
      this._min = this.min = Math.min(this._min as number, p as number);
      this._max = this.max = Math.max(this._max as number, p as number);
    } else if (totaxis === 2) {
      let _mn = this._min as { [k: number]: number },
        mn = this.min as { [k: number]: number };
      let _mx = this._max as { [k: number]: number },
        mx = this.max as { [k: number]: number };
      let pv = p as MyVectorLike;
      _mn[0] = mn[0] = Math.min(_mn[0], pv[0]);
      _mn[1] = mn[1] = Math.min(_mn[1], pv[1]);
      _mx[0] = mx[0] = Math.max(_mx[0], pv[0]);
      _mx[1] = mx[1] = Math.max(_mx[1], pv[1]);
    } else if (totaxis === 3) {
      let _mn = this._min as { [k: number]: number },
        mn = this.min as { [k: number]: number };
      let _mx = this._max as { [k: number]: number },
        mx = this.max as { [k: number]: number };
      let pv = p as MyVectorLike;
      _mn[0] = mn[0] = Math.min(_mn[0], pv[0]);
      _mn[1] = mn[1] = Math.min(_mn[1], pv[1]);
      _mn[2] = mn[2] = Math.min(_mn[2], pv[2]);
      _mx[0] = mx[0] = Math.max(_mx[0], pv[0]);
      _mx[1] = mx[1] = Math.max(_mx[1], pv[1]);
      _mx[2] = mx[2] = Math.max(_mx[2], pv[2]);
    } else {
      let _mn = this._min as { [k: number]: number },
        mn = this.min as { [k: number]: number };
      let _mx = this._max as { [k: number]: number },
        mx = this.max as { [k: number]: number };
      let pv = p as MyVectorLike;
      for (let i = 0; i < totaxis; i++) {
        _mn[i] = mn[i] = Math.min(_mn[i], pv[i]);
        _mx[i] = mx[i] = Math.max(_mx[i], pv[i]);
      }
    }
  }
}
MinMax.STRUCT =
  "\n  math.MinMax {\n    min     : vec3;\n    max     : vec3;\n    _min    : vec3;\n    _max    : vec3;\n    totaxis : int;\n  }\n";

export function winding_axis(a: MyVectorLike, b: MyVectorLike, c: MyVectorLike, up_axis: number): boolean {
  let xaxis = (up_axis + 1) % 3;
  let yaxis = (up_axis + 2) % 3;

  let x1 = a[xaxis],
    y1 = a[yaxis];
  let x2 = b[xaxis],
    y2 = b[yaxis];
  let x3 = c[xaxis],
    y3 = c[yaxis];

  let dx1 = x1 - x2,
    dy1 = y1 - y2;
  let dx2 = x3 - x2,
    dy2 = y3 - y2;

  let f = dx1 * dy2 - dy1 * dx2;
  return f >= 0.0;
}

/** returns false if clockwise */
export function winding(
  a: MyVectorLike,
  b: MyVectorLike,
  c: MyVectorLike,
  zero_z: boolean = false,
  tol: number = 0.0
): boolean {
  let dx1 = b[0] - a[0];
  let dy1 = b[1] - a[1];
  let dx2 = c[0] - a[0];
  let dy2 = c[1] - a[1];

  return dx1 * dy2 - dy1 * dx2 > tol;
}

export function inrect_2d(
  p: MyVectorLike | undefined,
  pos: MyVectorLike | undefined,
  size: MyVectorLike | undefined
): boolean {
  if (p === undefined || pos === undefined || size === undefined) {
    console.trace();
    console.log("Bad paramters to inrect_2d()");
    console.log("p: ", p, ", pos: ", pos, ", size: ", size);
    return false;
  }
  return p[0] >= pos[0] && p[0] <= pos[0] + size[0] && p[1] >= pos[1] && p[1] <= pos[1] + size[1];
}

let $ps_aabb_isect_line_2d = [new Vector2(), new Vector2(), new Vector2(), new Vector2()];

export function aabb_isect_line_2d(v1: MyVectorLike, v2: MyVectorLike, min: MyVectorLike, max: MyVectorLike): boolean {
  if (point_in_aabb_2d(v1, min, max) || point_in_aabb(v2, min, max)) {
    return true;
  }

  let lines = $ps_aabb_isect_line_2d;
  lines[0][0] = min[0];
  lines[0][1] = min[1];

  lines[1][0] = min[0];
  lines[1][1] = max[1];

  lines[2][0] = max[0];
  lines[2][1] = max[1];

  lines[3][0] = max[0];
  lines[3][1] = min[1];

  for (let i = 0; i < 4; i++) {
    if (line_line_cross(v1, v2, lines[i], lines[(i + 1) % 4])) {
      return true;
    }
  }

  return false;
}

export function expand_rect2d(pos: { [k: number]: number }, size: { [k: number]: number }, margin: MyVectorLike): void {
  pos[0] -= Math.floor(margin[0]);
  pos[1] -= Math.floor(margin[1]);
  size[0] += Math.floor(margin[0] * 2.0);
  size[1] += Math.floor(margin[1] * 2.0);
}

export function expand_line(l: [Vec3, Vec3], margin: number): [Vec3, Vec3] {
  let c = new Vector3();
  c.add(l[0]);
  c.add(l[1]);
  c.mulScalar(0.5);
  l[0].sub(c);
  l[1].sub(c);
  let l1 = l[0].vectorLength();
  let l2 = l[1].vectorLength();
  l[0].normalize();
  l[1].normalize();
  l[0].mulScalar(margin + l1);
  l[1].mulScalar(margin + l2);
  l[0].add(c);
  l[1].add(c);
  return l;
}

export function colinear(
  a: MyVectorLike & { length: number },
  b: MyVectorLike,
  c: MyVectorLike,
  limit: number = 2.2e-16,
  distLimit: number = 0.00001 ** 2
): boolean {
  let t1 = _cross_vec1;
  let t2 = _cross_vec2;

  let axes = a.length;

  for (let i = 0; i < axes; i++) {
    t1[i] = b[i] - a[i];
    t2[i] = c[i] - a[i];
  }

  for (let i = axes; i < 3; i++) {
    t1[i] = t2[i] = 0.0;
  }

  if (t1.dot(t1) <= distLimit || t2.dot(t2) <= distLimit) {
    return true;
  }

  t1.normalize();
  t2.normalize();

  t1.cross(t2);
  return t1.dot(t1) <= limit;
}

export function colinear2d(
  a: MyVectorLike,
  b: MyVectorLike,
  c: MyVectorLike,
  limit: number = 0.00001,
  precise: boolean = false
): boolean {
  let dx1 = a[0] - b[0];
  let dy1 = a[1] - b[1];
  let dx2 = c[0] - b[0];
  let dy2 = c[1] - b[1];

  let det = Math.abs(dx1 * dy2 - dy1 * dx2);
  if (precise) {
    let len = (dx1 ** 2 + dy1 ** 2) ** 0.5 + (dx2 ** 2 + dy2 ** 2) ** 0.5;
    if (len <= 0.00001) {
      return true;
    }

    det /= len;
  }

  return det <= limit;
}

let _llc_l1 = [new Vector3(), new Vector3()];
let _llc_l2 = [new Vector3(), new Vector3()];
let _llc_l3 = [new Vector3(), new Vector3()];
let _llc_l4 = [new Vector3(), new Vector3()];

let lli_v1 = new Vector3(),
  lli_v2 = new Vector3(),
  lli_v3 = new Vector3(),
  lli_v4 = new Vector3();

let _zero_cn = new Vector3();
let _tmps_cn: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 64));
let _rets_cn: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 64));

//vec1, vec2 should both be normalized
export function corner_normal(vec1: Vec3, vec2: Vec3, width: number): Vec3 {
  let ret = _rets_cn.next().zero();

  let vec = _tmps_cn.next().zero();
  vec.load(vec1).add(vec2).normalize();

  /*
  ret.load(vec).mulScalar(width);
  return ret;
  */

  //handle colinear case
  if (Math.abs((vec1 as unknown as { normalizedDot(v: Vec3): number }).normalizedDot(vec2)) > 0.9999) {
    if (vec1.dot(vec2) > 0.0001) {
      ret.load(vec1).add(vec2).normalize();
    } else {
      ret.load(vec1).normalize();
    }

    ret.mulScalar(width);

    return ret;
  } else {
    //XXX
    //ret.load(vec).mulScalar(width);
    //return ret;
  }

  vec1 = _tmps_cn.next().load(vec1).mulScalar(width);
  vec2 = _tmps_cn.next().load(vec2).mulScalar(width);

  let p1 = _tmps_cn.next().load(vec1);
  let p2 = _tmps_cn.next().load(vec2);

  vec1.addFac(vec1, 0.01);
  vec2.addFac(vec2, 0.01);

  let sc = 1.0;

  p1[0] += vec1[1] * sc;
  p1[1] += -vec1[0] * sc;

  p2[0] += -vec2[1] * sc;
  p2[1] += vec2[0] * sc;

  let p = line_line_isect(vec1, p1, vec2, p2, false);

  if (p === undefined || p === COLINEAR_ISECT || p.dot(p) < 0.000001) {
    ret.load(vec1).add(vec2).normalize().mulScalar(width);
  } else {
    ret.load(p);

    if (vec.dot(vec) > 0 && vec.dot(ret) < 0) {
      ret.load(vec).mulScalar(width);
    }
  }

  return ret;
}

//test_segment is optional, true
export function line_line_isect(
  v1: MyVectorLike,
  v2: MyVectorLike,
  v3: MyVectorLike,
  v4: MyVectorLike,
  test_segment: boolean = true
): Vec3 | number | undefined {
  if (test_segment && !line_line_cross(v1, v2, v3, v4)) {
    return undefined;
  }

  /*
  on factor;
  off period;
  
  xa := xa1 + (xa2 - xa1)*t1;
  xb := xb1 + (xb2 - xb1)*t2;
  ya := ya1 + (ya2 - ya1)*t1;
  yb := yb1 + (yb2 - yb1)*t2;
  
  f1 := xa - xb;
  f2 := ya - yb;
  
  f := solve({f1, f2}, {t1, t2});
  ft1 := part(f, 1, 1, 2);
  ft2 := part(f, 1, 2, 2);
  
  */

  let xa1 = v1[0],
    xa2 = v2[0],
    ya1 = v1[1],
    ya2 = v2[1];
  let xb1 = v3[0],
    xb2 = v4[0],
    yb1 = v3[1],
    yb2 = v4[1];

  let div = (xa1 - xa2) * (yb1 - yb2) - (xb1 - xb2) * (ya1 - ya2);
  if (Math.abs(div) < 0.00000001) {
    //parallel but intersecting lines.
    return COLINEAR_ISECT;
  } else {
    //intersection exists
    let t1 = -((ya1 - yb2) * xb1 - (yb1 - yb2) * xa1 - (ya1 - yb1) * xb2) / div;

    return lli_v1.load(v1).interp(v2, t1);
  }
}

export function line_line_cross(a: MyVectorLike, b: MyVectorLike, c: MyVectorLike, d: MyVectorLike): boolean {
  /*
  let limit=feps*1000;
  if (Math.abs(l1[0].vectorDistance(l2[0])+l1[1].vectorDistance(l2[0])-l1[0].vectorDistance(l1[1]))<limit) {
      return true;
  }
  if (Math.abs(l1[0].vectorDistance(l2[1])+l1[1].vectorDistance(l2[1])-l1[0].vectorDistance(l1[1]))<limit) {
      return true;
  }
  if (Math.abs(l2[0].vectorDistance(l1[0])+l2[1].vectorDistance(l1[0])-l2[0].vectorDistance(l2[1]))<limit) {
      return true;
  }
  if (Math.abs(l2[0].vectorDistance(l1[1])+l2[1].vectorDistance(l1[1])-l2[0].vectorDistance(l2[1]))<limit) {
      return true;
  }
  //*/

  let w1 = winding(a, b, c);
  let w2 = winding(c, a, d);
  let w3 = winding(a, b, d);
  let w4 = winding(c, b, d);
  return w1 === w2 && w3 === w4 && w1 !== w3;
}

let _asi_v1 = new Vector3();
let _asi_v2 = new Vector3();
let _asi_v3 = new Vector3();
let _asi_v4 = new Vector3();
let _asi_v5 = new Vector3();
let _asi_v6 = new Vector3();

export function point_in_aabb_2d(p: MyVectorLike, min: MyVectorLike, max: MyVectorLike): boolean {
  return p[0] >= min[0] && p[0] <= max[0] && p[1] >= min[1] && p[1] <= max[1];
}

let _asi2d_v1 = new Vector2();
let _asi2d_v2 = new Vector2();
let _asi2d_v3 = new Vector2();
let _asi2d_v4 = new Vector2();
let _asi2d_v5 = new Vector2();
let _asi2d_v6 = new Vector2();

export function aabb_sphere_isect_2d(p: MyVectorLike, r: number, min: MyVectorLike, max: MyVectorLike): boolean {
  let v1 = _asi2d_v1,
    v2 = _asi2d_v2,
    v3 = _asi2d_v3,
    mvec = _asi2d_v4;
  let v4 = _asi2d_v5;

  let lp: Vec2 = _asi2d_v6.load(p);
  v1.load(lp);
  v2.load(lp);

  let lmin: Vec3 = _asi_v5.load(min);
  let lmax: Vec3 = _asi_v6.load(max);

  mvec
    .load(lmax)
    .sub(lmin)
    .normalize()
    .mulScalar(r + 0.0001);

  v1.sub(mvec);
  v2.add(mvec);
  v3.load(lp);

  let ret = point_in_aabb_2d(v1, lmin, lmax) || point_in_aabb_2d(v2, lmin, lmax) || point_in_aabb_2d(v3, lmin, lmax);

  if (ret) return ret;

  /*
  v1.load(min).add(max).mulScalar(0.5);
  ret = ret || v1.vectorDistance(p) < r;
  
  v1.load(min);
  ret = ret || v1.vectorDistance(p) < r;
  
  v1.load(max);
  ret = ret || v1.vectorDistance(p) < r;
  
  v1[0] = min[0], v1[1] = max[1];
  ret = ret || v1.vectorDistance(p) < r;
  
  v1[0] = max[0], v1[1] = min[1];
  ret = ret || v1.vectorDistance(p) < r;
  */
  //*
  v1.load(lmin);
  v2[0] = lmin[0];
  v2[1] = lmax[1];
  ret = ret || dist_to_line_2d(lp, v1, v2) < r;

  v1.load(lmax);
  v2[0] = lmax[0];
  v2[1] = lmax[1];
  ret = ret || dist_to_line_2d(lp, v1, v2) < r;

  v1.load(lmax);
  v2[0] = lmax[0];
  v2[1] = lmin[1];
  ret = ret || dist_to_line_2d(lp, v1, v2) < r;

  v1.load(lmax);
  v2[0] = lmin[0];
  v2[1] = lmin[1];
  ret = ret || dist_to_line_2d(lp, v1, v2) < r;
  //*/
  return ret;
}

export function point_in_aabb(p: MyVectorLike, min: MyVectorLike, max: MyVectorLike): boolean {
  return p[0] >= min[0] && p[0] <= max[0] && p[1] >= min[1] && p[1] <= max[1] && p[2] >= min[2] && p[2] <= max[2];
}

let asi_rect = new Array(8);
for (let i = 0; i < 8; i++) {
  asi_rect[i] = new Vector3();
}

let aabb_sphere_isect_vs: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 64));

export function aabb_sphere_isect(p: MyVectorLike, r: number, min: MyVectorLike, max: MyVectorLike): boolean {
  let lp: Vec3;
  let lmin: Vec3;
  let lmax: Vec3;
  {
    let p1 = aabb_sphere_isect_vs.next().load(p);
    let min1 = aabb_sphere_isect_vs.next().load(min);
    let max1 = aabb_sphere_isect_vs.next().load(max);
    if (p.length === 2) {
      p1[2] = 0.0;
    }
    if (min1.length === 2) {
      min1[2] = 0.0;
    }
    if (max.length === 2) {
      max1[2] = 0.0;
    }

    lp = p1;
    lmin = min1;
    lmax = max1;
  }

  let cent = aabb_sphere_isect_vs.next().load(lmin).interp(lmax, 0.5);
  lp.sub(cent);
  lmin.sub(cent);
  lmax.sub(cent);

  r *= r;

  let isect = point_in_aabb(lp, lmin, lmax);

  if (isect) {
    return true;
  }

  let rect = asi_rect;

  rect[0].loadXYZ(lmin[0], lmin[1], lmin[2]);
  rect[1].loadXYZ(lmin[0], lmax[1], lmin[2]);
  rect[2].loadXYZ(lmax[0], lmax[1], lmin[2]);
  rect[3].loadXYZ(lmax[0], lmin[1], lmin[2]);

  rect[4].loadXYZ(lmin[0], lmin[1], lmax[2]);
  rect[5].loadXYZ(lmin[0], lmax[1], lmax[2]);
  rect[6].loadXYZ(lmax[0], lmax[1], lmax[2]);
  rect[7].loadXYZ(lmax[0], lmin[1], lmax[2]);

  for (let i = 0; i < 8; i++) {
    if (lp.vectorDistanceSqr(rect[i]) < r) {
      return true;
    }
  }

  let p2 = aabb_sphere_isect_vs.next().load(lp);

  for (let i = 0; i < 3; i++) {
    p2.load(lp);

    let i2 = (i + 1) % 3;
    let i3 = (i + 2) % 3;

    p2[i] = p2[i] < 0.0 ? lmin[i] : lmax[i];

    p2[i2] = Math.min(Math.max(p2[i2], lmin[i2]), lmax[i2]);
    p2[i3] = Math.min(Math.max(p2[i3], lmin[i3]), lmax[i3]);

    let isect2 = p2.vectorDistanceSqr(lp) <= r;

    if (isect2) {
      return true;
    }
  }

  return false;
}

export function aabb_sphere_dist(p: MyVectorLike, min: MyVectorLike, max: MyVectorLike): number {
  let lp: Vec3;
  let lmin: Vec3;
  let lmax: Vec3;
  {
    let p1 = aabb_sphere_isect_vs.next().load(p);
    let min1 = aabb_sphere_isect_vs.next().load(min);
    let max1 = aabb_sphere_isect_vs.next().load(max);
    if (p.length === 2) {
      p1[2] = 0.0;
    }
    if (min1.length === 2) {
      min1[2] = 0.0;
    }
    if (max.length === 2) {
      max1[2] = 0.0;
    }

    lp = p1;
    lmin = min1;
    lmax = max1;
  }

  let cent = aabb_sphere_isect_vs.next().load(lmin).interp(lmax, 0.5);
  lp.sub(cent);
  lmin.sub(cent);
  lmax.sub(cent);

  let isect = point_in_aabb(lp, lmin, lmax);

  if (isect) {
    return 0.0;
  }

  let rect = asi_rect;

  rect[0].loadXYZ(lmin[0], lmin[1], lmin[2]);
  rect[1].loadXYZ(lmin[0], lmax[1], lmin[2]);
  rect[2].loadXYZ(lmax[0], lmax[1], lmin[2]);
  rect[3].loadXYZ(lmax[0], lmin[1], lmin[2]);

  rect[4].loadXYZ(lmin[0], lmin[1], lmax[2]);
  rect[5].loadXYZ(lmin[0], lmax[1], lmax[2]);
  rect[6].loadXYZ(lmax[0], lmax[1], lmax[2]);
  rect[7].loadXYZ(lmax[0], lmin[1], lmax[2]);

  let mindis: number | undefined;

  for (let i = 0; i < 8; i++) {
    let dis = lp.vectorDistanceSqr(rect[i]);

    if (mindis === undefined || dis < mindis) {
      mindis = dis;
    }
  }

  let p2 = aabb_sphere_isect_vs.next().load(lp);

  for (let i = 0; i < 3; i++) {
    p2.load(lp);

    let i2 = (i + 1) % 3;
    let i3 = (i + 2) % 3;

    p2[i] = p2[i] < 0.0 ? lmin[i] : lmax[i];

    p2[i2] = Math.min(Math.max(p2[i2], lmin[i2]), lmax[i2]);
    p2[i3] = Math.min(Math.max(p2[i3], lmin[i3]), lmax[i3]);

    let dis = p2.vectorDistanceSqr(lp);
    if (mindis === undefined || dis < mindis) {
      mindis = dis;
    }
  }

  return mindis === undefined ? 1e17 : mindis;
}

export function point_in_tri(p: MyVectorLike, v1: MyVectorLike, v2: MyVectorLike, v3: MyVectorLike): boolean {
  let w1 = winding(p, v1, v2);
  let w2 = winding(p, v2, v3);
  let w3 = winding(p, v3, v1);
  return w1 === w2 && w2 === w3;
}

export function convex_quad(v1: MyVectorLike, v2: MyVectorLike, v3: MyVectorLike, v4: MyVectorLike): boolean {
  return (line_line_cross as Function)([v1, v3], [v2, v4]);
}

let $e1_normal_tri = new Vector3();
let $e3_normal_tri = new Vector3();
let $e2_normal_tri = new Vector3();

export function isNum(f: number): boolean {
  let ok = typeof f === "number";

  ok = ok && !isNaN(f) && isFinite(f);

  return ok;
}

const _normal_tri_rets: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 64));

export function normal_tri(v1: MyVectorLike, v2: MyVectorLike, v3: MyVectorLike): Vec3 {
  let x1 = v2[0] - v1[0];
  let y1 = v2[1] - v1[1];
  let z1 = v2[2] - v1[2];
  let x2 = v3[0] - v1[0];
  let y2 = v3[1] - v1[1];
  let z2 = v3[2] - v1[2];

  if (!isNum(x1 + y1 + z1 + z2 + y2 + z2)) {
    throw new Error("NaN in normal_tri");
  }

  let x3, y3, z3;

  x1 = v2[0] - v1[0];
  y1 = v2[1] - v1[1];
  z1 = v2[2] - v1[2];
  x2 = v3[0] - v1[0];
  y2 = v3[1] - v1[1];
  z2 = v3[2] - v1[2];
  x3 = y1 * z2 - z1 * y2;
  y3 = z1 * x2 - x1 * z2;
  z3 = x1 * y2 - y1 * x2;

  let len = Math.sqrt(x3 * x3 + y3 * y3 + z3 * z3);

  if (len > 1e-5) len = 1.0 / len;

  x3 *= len;
  y3 *= len;
  z3 *= len;

  let n = _normal_tri_rets.next();

  if (!isNum(x3 + y3 + z3)) {
    throw new Error("NaN!");
  }

  n[0] = x3;
  n[1] = y3;
  n[2] = z3;

  return n;
}

let $n2_normal_quad = new Vector3();

let _q1 = new Vector3(),
  _q2 = new Vector3(),
  _q3 = new Vector3();

export function normal_quad(v1: MyVectorLike, v2: MyVectorLike, v3: MyVectorLike, v4: MyVectorLike): Vec3 {
  _q1.load(normal_tri(v1, v2, v3));
  _q2.load(normal_tri(v2, v3, v4));

  _q1.add(_q2).normalize();
  return _q1;
}

export function normal_quad_old(v1: MyVectorLike, v2: MyVectorLike, v3: MyVectorLike, v4: MyVectorLike): Vec3 {
  let n = normal_tri(v1, v2, v3);
  $n2_normal_quad[0] = n[0];
  $n2_normal_quad[1] = n[1];
  $n2_normal_quad[2] = n[2];
  n = normal_tri(v1, v3, v4);
  $n2_normal_quad[0] = $n2_normal_quad[0] + n[0];
  $n2_normal_quad[1] = $n2_normal_quad[1] + n[1];
  $n2_normal_quad[2] = $n2_normal_quad[2] + n[2];
  let _len = Math.sqrt(
    $n2_normal_quad[0] * $n2_normal_quad[0] +
      $n2_normal_quad[1] * $n2_normal_quad[1] +
      $n2_normal_quad[2] * $n2_normal_quad[2]
  );
  if (_len > 1e-5) _len = 1.0 / _len;
  $n2_normal_quad[0] *= _len;
  $n2_normal_quad[1] *= _len;
  $n2_normal_quad[2] *= _len;
  return $n2_normal_quad;
}

let _li_vi = new Vector3();

//calc_t is optional, false
export function line_isect(
  v1: MyVectorLike,
  v2: MyVectorLike,
  v3: MyVectorLike,
  v4: MyVectorLike,
  calc_t?: boolean
): [Vec3, number, number?] {
  if (calc_t === undefined) {
    calc_t = false;
  }
  let div = (v2[0] - v1[0]) * (v4[1] - v3[1]) - (v2[1] - v1[1]) * (v4[0] - v3[0]);
  if (div === 0.0) return [new Vector3(), COLINEAR, 0.0];
  let vi = _li_vi;
  vi[0] = 0;
  vi[1] = 0;
  vi[2] = 0;
  vi[0] = ((v3[0] - v4[0]) * (v1[0] * v2[1] - v1[1] * v2[0]) - (v1[0] - v2[0]) * (v3[0] * v4[1] - v3[1] * v4[0])) / div;
  vi[1] = ((v3[1] - v4[1]) * (v1[0] * v2[1] - v1[1] * v2[0]) - (v1[1] - v2[1]) * (v3[0] * v4[1] - v3[1] * v4[0])) / div;
  if (calc_t || v1.length === 3) {
    let n1 = new Vector2(v2).sub(v1);
    let n2 = new Vector2(vi).sub(v1);
    let t = n2.vectorLength() / n1.vectorLength();
    n1.normalize();
    n2.normalize();
    if (n1.dot(n2) < 0.0) {
      t = -t;
    }
    if (v1.length === 3) {
      vi[2] = v1[2] + (v2[2] - v1[2]) * t;
    }
    return [vi, LINECROSS, t];
  }
  return [vi, LINECROSS];
}

let dt2l_v1 = new Vector2();
let dt2l_v2 = new Vector2();
let dt2l_v3 = new Vector2();
let dt2l_v4 = new Vector2();
let dt2l_v5 = new Vector2();

export function dist_to_line_2d(
  p: MyVectorLike,
  v1: MyVectorLike,
  v2: MyVectorLike,
  clip: boolean = true,
  closest_co_out: { [k: number]: number } | undefined = undefined,
  t_out: number | undefined = undefined
): number {
  let lv1 = dt2l_v4.load(v1);
  let lv2 = dt2l_v5.load(v2);

  let n = dt2l_v1;
  let vec = dt2l_v3;

  n.load(lv2).sub(lv1).normalize();
  vec.load(p).sub(lv1);

  let t = vec.dot(n);
  if (clip) {
    t = Math.min(Math.max(t, 0.0), lv1.vectorDistance(lv2));
  }

  n.mulScalar(t).add(lv1);

  if (closest_co_out) {
    closest_co_out[0] = n[0];
    closest_co_out[1] = n[1];
  }

  if (t_out !== undefined) {
    t_out = t;
  }

  return n.vectorDistance(p);
}

let dt3l_v1 = new Vector3();
let dt3l_v2 = new Vector3();
let dt3l_v3 = new Vector3();
let dt3l_v4 = new Vector3();
let dt3l_v5 = new Vector3();

export function dist_to_line_sqr(p: MyVectorLike, v1: MyVectorLike, v2: MyVectorLike, clip: boolean = true): number {
  let px = p[0] - v1[0];
  let py = p[1] - v1[1];
  let pz = p.length < 3 ? 0.0 : p[2] - v1[2];

  pz = pz === undefined ? 0.0 : pz;

  let v2x = v2[0] - v1[0];
  let v2y = v2[1] - v1[1];
  let v2z = v2.length < 3 ? 0.0 : v2[2] - v1[2];

  let len = v2x * v2x + v2y * v2y + v2z * v2z;

  if (len === 0.0) {
    return Math.sqrt(px * px + py * py + pz * pz);
  }

  let len2 = 1.0 / len;
  v2x *= len2;
  v2y *= len2;
  v2z *= len2;

  let t = px * v2x + py * v2y + pz * v2z;
  if (clip) {
    t = Math.min(Math.max(t, 0.0), len);
  }

  v2x *= t;
  v2y *= t;
  v2z *= t;

  return (v2x - px) * (v2x - px) + (v2y - py) * (v2y - py) + (v2z - pz) * (v2z - pz);
}

export function dist_to_line(p: MyVectorLike, v1: MyVectorLike, v2: MyVectorLike, clip: boolean = true): number {
  return Math.sqrt(dist_to_line_sqr(p, v1, v2, clip));
}

//p cam be 2d, 3d, or 4d point, v1/v2 however must be full homogenous coordinates
let _cplw_vs4: CacheRing<Vec4> = cacheRing<Vec4>(util.cachering.fromConstructor(Vector4, 64));
let _cplw_vs3: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 64));
let _cplw_vs2: CacheRing<Vec2> = cacheRing<Vec2>(util.cachering.fromConstructor(Vector2, 64));

function wclip(x1: number, x2: number, w1: number, w2: number, near: number): number {
  let r1 = near * w1 - x1;
  let r2 = (w1 - w2) * near - (x1 - x2);

  if (r2 === 0.0) return 0.0;

  return r1 / r2;
}

function clip(a: number, b: number, znear: number): number {
  if (a - b === 0.0) return 0.0;

  return (a - znear) / (a - b);
}

/*clips v1 and v2 to lie within homogenous projection range
  v1 and v2 are assumed to be projected, pre-division Vector4's
  returns a positive number (how much the line was scaled) if either _v1 or _v2 are
  in front of the near clipping plane otherwise, returns 0
 */
export function clip_line_w(_v1: Vec4, _v2: Vec4, znear: number, zfar: number): boolean {
  let v1 = _cplw_vs4.next().load(_v1);
  let v2 = _cplw_vs4.next().load(_v2);

  //are we fully behind the view plane?
  if (v1[2] < 1.0 && v2[2] < 1.0) return false;

  function doclip1(v1: Vec4, v2: Vec4, axis: number): void {
    if (v1[axis] / v1[3] < -1) {
      let t = wclip(v1[axis], v2[axis], v1[3], v2[3], -1);
      v1.interp(v2, t);
    } else if (v1[axis] / v1[3] > 1) {
      let t = wclip(v1[axis], v2[axis], v1[3], v2[3], 1);
      v1.interp(v2, t);
    }
  }

  function doclip(v1: Vec4, v2: Vec4, axis: number): void {
    doclip1(v1, v2, axis);
    doclip1(v2, v1, axis);
  }

  function dozclip(v1: Vec4, v2: Vec4): void {
    if (v1[2] < 1) {
      let t = clip(v1[2], v2[2], 1);
      v1.interp(v2, t);
    } else if (v2[2] < 1) {
      let t = clip(v2[2], v1[2], 1);
      v2.interp(v1, t);
    }
  }

  dozclip(v1, v2, 1);
  doclip(v1, v2, 0);
  doclip(v1, v2, 1);

  for (let i = 0; i < 4; i++) {
    _v1[i] = v1[i];
    _v2[i] = v2[i];
  }

  return !(v1[0] / v1[3] === v2[0] / v2[3] || v1[1] / v2[3] === v2[1] / v2[3]);
}

//clip is optional, true.  clip point to lie within line segment v1->v2
let _closest_point_on_line_cache: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 64));
let _closest_point_rets: CacheRing<[Vec3, number]> = cacheRing<[Vec3, number]>(
  new util.cachering(function () {
    return [0, 0];
  }, 64)
);

let _closest_tmps = [new Vector3(), new Vector3(), new Vector3()];

export function closest_point_on_line(
  p: MyVectorLike,
  v1: MyVectorLike,
  v2: MyVectorLike,
  clip: boolean = true
): [Vec3, number] {
  let l1 = _closest_tmps[0],
    l2 = _closest_tmps[1];
  let len: number = 0;

  l1.load(v2).sub(v1);

  if (clip) {
    len = l1.vectorLength();
  }

  l1.normalize();
  l2.load(p).sub(v1);

  let t = l2.dot(l1);
  if (clip) {
    //t = t*(t<0.0) + t*(t>1.0) + (t>1.0);
    t = t < 0.0 ? 0.0 : t;
    t = t > len ? len : t;
  }

  let co = _closest_point_on_line_cache.next();
  co.load(l1).mulScalar(t).add(v1);
  let ret = _closest_point_rets.next();

  ret[0] = co;
  ret[1] = t;

  return ret;
}

/*given input line (a,d) and tangent t,
  returns a circle that goes through both
  a and d, whose normalized tangent at a is the same
  as normalized t.
  
  note that t need not be normalized, this function
  does that itself*/
let _circ_from_line_tan_vs: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 32));
let _circ_from_line_tan_ret: CacheRing<[Vec3, number]> = cacheRing<[Vec3, number]>(
  new util.cachering(function () {
    return [new Vector3(), 0];
  }, 64)
);

export function circ_from_line_tan(a: MyVectorLike, b: MyVectorLike, t: MyVectorLike): [Vec3, number] {
  let p1 = _circ_from_line_tan_vs.next();
  let t2 = _circ_from_line_tan_vs.next();
  let n1 = _circ_from_line_tan_vs.next();

  p1.load(a).sub(b);
  t2.load(t).normalize();
  n1.load(p1).normalize().cross(t2).cross(t2).normalize();

  let ax = p1[0],
    ay = p1[1],
    az = p1[2],
    nx = n1[0],
    ny = n1[1],
    nz = n1[2];
  let r = -(ax * ax + ay * ay + az * az);
  let div = 2 * (ax * nx + ay * ny + az * nz);

  if (Math.abs(div) > 0.000001) {
    r /= div;
  } else {
    r = 1000000.0;
  }

  let ret = _circ_from_line_tan_ret.next();
  ret[0].load(n1).mulScalar(r).add(a);
  ret[1] = r;

  return ret;
}

/*given input line (a,d) and tangent t,
  returns a circle that goes through both
  a and d, whose normalized tangent at a is the same
  as normalized t.

  note that t need not be normalized, this function
  does that itself*/
let _circ_from_line_tan2d_vs: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 32));
let _circ_from_line_tan2d_ret: CacheRing<[Vec2, number]> = cacheRing<[Vec2, number]>(
  new util.cachering(function () {
    return [new Vector2(), 0];
  }, 64)
);

export function circ_from_line_tan_2d(a: MyVectorLike, b: MyVectorLike, t: MyVectorLike): [Vec2, number] {
  let la: Vec3 = _circ_from_line_tan2d_vs.next().load(a);
  let lb: Vec3 = _circ_from_line_tan2d_vs.next().load(b);
  let lt: Vec3 = _circ_from_line_tan2d_vs.next().load(t);

  la[2] = lb[2] = lt[2] = 0.0;

  let p1 = _circ_from_line_tan2d_vs.next();
  let t2 = _circ_from_line_tan2d_vs.next();
  let n1 = _circ_from_line_tan2d_vs.next();

  p1.load(la).sub(lb);
  t2.load(lt).normalize();
  n1.load(p1).normalize().cross(t2).cross(t2).normalize();

  if (1) {
    let cx: number, cy: number, r: number;
    let x1 = la[0],
      y1 = la[1];
    let x2 = lb[0],
      y2 = lb[1];
    let tanx1 = lt[0],
      tany1 = lt[1];

    let div = 4.0 * ((x1 - x2) * tany1 - (y1 - y2) * tanx1) ** 2;
    let div2 = 2.0 * (x1 - x2) * tany1 - 2.0 * (y1 - y2) * tanx1;

    if (Math.abs(div) < 0.0001 || Math.abs(div2) < 0.0001) {
      let ret = _circ_from_line_tan2d_ret.next();

      ret[0].load(la).interp(lb, 0.5);
      let dx = la[1] - lb[1];
      let dy = lb[0] - la[0];

      r = 1000000.0;

      ret[0][0] += dx * r;
      ret[0][1] += dy * r;
      ret[1] = r;

      return ret;
    }
    cx = (((x1 + x2) * (x1 - x2) - (y1 - y2) ** 2) * tany1 - 2.0 * (y1 - y2) * tanx1 * x1) / div2;

    cy = (-((y1 + y2) * (y1 - y2) - x2 ** 2 - (x1 - 2.0 * x2) * x1) * tanx1 + 2.0 * (x1 - x2) * tany1 * y1) / div2;

    r = (((y1 - y2) ** 2 + x2 ** 2 + (x1 - 2.0 * x2) * x1) ** 2 * (tanx1 ** 2 + tany1 ** 2)) / div;

    let midx = la[0] * 0.5 + lb[0] * 0.5;
    let midy = la[1] * 0.5 + lb[1] * 0.5;

    //mirror
    cx = 2.0 * midx - cx;
    cy = 2.0 * midy - cy;

    let ret = _circ_from_line_tan2d_ret.next();
    ret[0].loadXY(cx, cy);
    ret[1] = Math.sqrt(r);

    return ret;
  } else {
    let ax = p1[0],
      ay = p1[1],
      az = p1[2],
      nx = n1[0],
      ny = n1[1],
      nz = n1[2];
    let r = -(ax * ax + ay * ay + az * az);
    let div = 2 * (ax * nx + ay * ny + az * nz);

    if (Math.abs(div) > 0.000001) {
      r /= div;
    } else {
      r = 1000000.0;
    }

    let ret = _circ_from_line_tan2d_ret.next();
    ret[0].load(n1).mulScalar(r).add(la);
    ret[1] = r;

    return ret;
  }

  return undefined as never;
}

let _gtc_e1 = new Vector3();
let _gtc_e2 = new Vector3();
let _gtc_e3 = new Vector3();
let _gtc_p1 = new Vector3();
let _gtc_p2 = new Vector3();
let _gtc_v1 = new Vector3();
let _gtc_v2 = new Vector3();
let _gtc_p12 = new Vector3();
let _gtc_p22 = new Vector3();
let _get_tri_circ_ret: CacheRing<[Vec3, number]> = cacheRing<[Vec3, number]>(
  new util.cachering(function () {
    return [0, 0];
  })
);

export function get_tri_circ(a: MyVectorLike, b: MyVectorLike, c: MyVectorLike): [Vec3, number] {
  let v1 = _gtc_v1;
  let v2 = _gtc_v2;
  let e1 = _gtc_e1;
  let e2 = _gtc_e2;
  let e3 = _gtc_e3;
  let p1 = _gtc_p1;
  let p2 = _gtc_p2;

  for (let i = 0; i < 3; i++) {
    e1[i] = b[i] - a[i];
    e2[i] = c[i] - b[i];
    e3[i] = a[i] - c[i];
  }

  for (let i = 0; i < 3; i++) {
    p1[i] = (a[i] + b[i]) * 0.5;
    p2[i] = (c[i] + b[i]) * 0.5;
  }

  e1.normalize();

  v1[0] = -e1[1];
  v1[1] = e1[0];
  v1[2] = e1[2];

  v2[0] = -e2[1];
  v2[1] = e2[0];
  v2[2] = e2[2];

  v1.normalize();
  v2.normalize();

  let cent: Vec3;
  let type: number | undefined;
  for (let i = 0; i < 3; i++) {
    _gtc_p12[i] = p1[i] + v1[i];
    _gtc_p22[i] = p2[i] + v2[i];
  }

  let isect = line_isect(p1, _gtc_p12, p2, _gtc_p22);
  cent = isect[0];
  type = isect[1];

  e1.load(a);
  e2.load(b);
  e3.load(c);

  let r = e1.sub(cent).vectorLength();
  if (r < feps) r = e2.sub(cent).vectorLength();
  if (r < feps) r = e3.sub(cent).vectorLength();

  let ret = _get_tri_circ_ret.next();
  ret[0] = cent;
  ret[1] = r;

  return ret;
}

export function gen_circle(
  m: { make_vert(v: Vec3): unknown; make_edge(a: unknown, b: unknown): unknown },
  origin: MyVectorLike,
  r: number,
  stfeps: number
): unknown[] {
  let pi = Math.PI;
  let f = -pi / 2;
  let df = (pi * 2) / stfeps;
  let verts = new Array();
  for (let i = 0; i < stfeps; i++) {
    let x = origin[0] + r * Math.sin(f);
    let y = origin[1] + r * Math.cos(f);
    let v = m.make_vert(new Vector3([x, y, origin[2]]));
    verts.push(v);
    f += df;
  }
  for (let i = 0; i < verts.length; i++) {
    let v1 = verts[i];
    let v2 = verts[(i + 1) % verts.length];
    m.make_edge(v1, v2);
  }
  return verts;
}

let cos = Math.cos;
let sin = Math.sin;

//axis is optional, 0
export function rot2d(v1: { [k: number]: number }, A: number, axis?: number): void {
  let x = v1[0];
  let y = v1[1];

  if (axis === 1) {
    v1[0] = x * cos(A) + y * sin(A);
    v1[2] = y * cos(A) - x * sin(A);
  } else {
    v1[0] = x * cos(A) - y * sin(A);
    v1[1] = y * cos(A) + x * sin(A);
  }
}

export function makeCircleMesh(gl: unknown, radius: number, stfeps: number): unknown {
  let Mesh = (globalThis as Record<string, unknown>).Mesh as { new (): Record<string, Function> };
  let mesh = new Mesh();
  let verts1 = gen_circle(mesh as unknown as Parameters<typeof gen_circle>[0], new Vector3(), radius, stfeps);
  let verts2 = gen_circle(mesh as unknown as Parameters<typeof gen_circle>[0], new Vector3(), radius / 1.75, stfeps);
  mesh.make_face_complex([verts1, verts2]);
  return mesh;
}

export function minmax_verts(verts: Iterable<{ co: MyVectorLike }>): [Vec3, Vec3] {
  let min = new Vector3([1000000000000.0, 1000000000000.0, 1000000000000.0]);
  let max = new Vector3([-1000000000000.0, -1000000000000.0, -1000000000000.0]);
  for (let v of verts) {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], v.co[i]);
      max[i] = Math.max(max[i], v.co[i]);
    }
  }
  return [min, max];
}

export function unproject(vec: MyVectorLike, ipers: Matrix4, iview: Matrix4): Vec3 {
  let newvec = new Vector3(vec);
  newvec.multVecMatrix(ipers);
  newvec.multVecMatrix(iview);
  return newvec;
}

export function project(vec: MyVectorLike, pers: Matrix4, view: Matrix4): Vec3 {
  let newvec = new Vector3(vec);
  newvec.multVecMatrix(pers);
  newvec.multVecMatrix(view);
  return newvec;
}

let _sh_minv = new Vector3();
let _sh_maxv = new Vector3();
let _sh_start = [];
let _sh_end = [];

let static_cent_gbw = new Vector3();

export function get_boundary_winding(points: MyVectorLike[]): boolean {
  let cent = static_cent_gbw.zero();
  if (points.length === 0) return false;
  for (let i = 0; i < points.length; i++) {
    cent.add(points[i]);
  }
  cent.divScalar(points.length);
  let w = 0,
    totw = 0;
  for (let i = 0; i < points.length; i++) {
    let v1 = points[i];
    let v2 = points[(i + 1) % points.length];
    if (!colinear(v1, v2, cent)) {
      w += winding(v1, v2, cent) ? 1 : 0;
      totw += 1;
    }
  }
  if (totw > 0) w /= totw;
  return Math.round(w) === 1;
}

export class PlaneOps {
  axis: [number, number, number];

  constructor(normal: MyVectorLike) {
    let no = normal;
    this.axis = [0, 0, 0];
    this.reset_axis(normal);
  }

  reset_axis(no: MyVectorLike): void {
    let ax, ay, az;
    let nx = Math.abs(no[0]),
      ny = Math.abs(no[1]),
      nz = Math.abs(no[2]);
    if (nz > nx && nz > ny) {
      ax = 0;
      ay = 1;
      az = 2;
    } else if (nx > ny && nx > nz) {
      ax = 2;
      ay = 1;
      az = 0;
    } else {
      ax = 0;
      ay = 2;
      az = 1;
    }
    this.axis = [ax, ay, az];
  }

  convex_quad(v1: MyVectorLike, v2: MyVectorLike, v3: MyVectorLike, v4: MyVectorLike): boolean {
    let ax = this.axis;
    v1 = new Vector3([v1[ax[0]], v1[ax[1]], v1[ax[2]]]);
    v2 = new Vector3([v2[ax[0]], v2[ax[1]], v2[ax[2]]]);
    v3 = new Vector3([v3[ax[0]], v3[ax[1]], v3[ax[2]]]);
    v4 = new Vector3([v4[ax[0]], v4[ax[1]], v4[ax[2]]]);
    return convex_quad(v1, v2, v3, v4);
  }

  line_isect(v1: MyVectorLike, v2: MyVectorLike, v3: MyVectorLike, v4: MyVectorLike): [Vec3, number, number?] {
    let ax = this.axis;
    let orig1 = v1,
      orig2 = v2;
    v1 = new Vector3([v1[ax[0]], v1[ax[1]], v1[ax[2]]]);
    v2 = new Vector3([v2[ax[0]], v2[ax[1]], v2[ax[2]]]);
    v3 = new Vector3([v3[ax[0]], v3[ax[1]], v3[ax[2]]]);
    v4 = new Vector3([v4[ax[0]], v4[ax[1]], v4[ax[2]]]);
    let ret = line_isect(v1, v2, v3, v4, true);
    let vi = ret[0];
    if (ret[1] === LINECROSS) {
      ret[0].load(orig2).sub(orig1).mulScalar(ret[2]).add(orig1);
    }
    return ret;
  }

  line_line_cross(l1: [MyVectorLike, MyVectorLike], l2: [MyVectorLike, MyVectorLike]): boolean {
    let ax = this.axis;
    let v1 = l1[0],
      v2 = l1[1],
      v3 = l2[0],
      v4 = l2[1];
    v1 = new Vector3([v1[ax[0]], v1[ax[1]], 0.0]);
    v2 = new Vector3([v2[ax[0]], v2[ax[1]], 0.0]);
    v3 = new Vector3([v3[ax[0]], v3[ax[1]], 0.0]);
    v4 = new Vector3([v4[ax[0]], v4[ax[1]], 0.0]);
    return (line_line_cross as Function)([v1, v2], [v3, v4]);
  }

  winding(v1: MyVectorLike, v2: MyVectorLike, v3: MyVectorLike): boolean {
    let ax = this.axis;
    if (v1 === undefined) console.trace();
    v1 = new Vector3([v1[ax[0]], v1[ax[1]], 0.0]);
    v2 = new Vector3([v2[ax[0]], v2[ax[1]], 0.0]);
    v3 = new Vector3([v3[ax[0]], v3[ax[1]], 0.0]);
    return winding(v1, v2, v3);
  }

  colinear(v1: MyVectorLike, v2: MyVectorLike, v3: MyVectorLike): boolean {
    let ax = this.axis;
    v1 = new Vector3([v1[ax[0]], v1[ax[1]], 0.0]);
    v2 = new Vector3([v2[ax[0]], v2[ax[1]], 0.0]);
    v3 = new Vector3([v3[ax[0]], v3[ax[1]], 0.0]);
    return colinear(v1, v2, v3);
  }

  get_boundary_winding(points: MyVectorLike[]): boolean {
    let ax = this.axis;
    let cent = new Vector3();
    if (points.length === 0) return false;
    for (let i = 0; i < points.length; i++) {
      cent.add(points[i]);
    }
    cent.divScalar(points.length);
    let w = 0,
      totw = 0;
    for (let i = 0; i < points.length; i++) {
      let v1 = points[i];
      let v2 = points[(i + 1) % points.length];
      if (!this.colinear(v1, v2, cent)) {
        w += this.winding(v1, v2, cent) ? 1 : 0;
        totw += 1;
      }
    }
    if (totw > 0) w /= totw;
    return Math.round(w) === 1;
  }
}

/*
on factor;

px := rox + rnx*t;
py := roy + rny*t;
pz := roz + rnz*t;

f1 := (px-pox)*pnx + (py-poy)*pny + (pz-poz)*pnz;
ff := solve(f1, t);
on fort;
part(ff, 1, 2);
off fort;

* */
let _isrp_ret = new Vector3();
let isect_ray_plane_rets = util.cachering.fromConstructor(Vector3, 256);

export function isect_ray_plane(
  planeorigin: MyVectorLike,
  planenormal: MyVectorLike,
  rayorigin: MyVectorLike,
  raynormal: MyVectorLike
): Vec3 | undefined {
  let po = planeorigin,
    pn = planenormal,
    ro = rayorigin,
    rn = raynormal;

  let div = pn[1] * rn[1] + pn[2] * rn[2] + pn[0] * rn[0];

  if (Math.abs(div) < 0.000001) {
    return undefined;
  }

  let t = ((po[1] - ro[1]) * pn[1] + (po[2] - ro[2]) * pn[2] + (po[0] - ro[0]) * pn[0]) / div;
  _isrp_ret.load(ro).addFac(rn, t);

  return isect_ray_plane_rets.next().load(_isrp_ret);
}

export function _old_isect_ray_plane(planeorigin: Vec3, planenormal: Vec3, rayorigin: Vec3, raynormal: Vec3): Vec3 {
  let p = planeorigin,
    n = planenormal;
  let r = rayorigin,
    v = raynormal;

  let d = p.vectorLength();
  let t = -(r.dot(n) - p.dot(n)) / v.dot(n);
  _isrp_ret.load(v);
  _isrp_ret.mulScalar(t);
  _isrp_ret.add(r);
  return _isrp_ret;
}

export class Mat4Stack {
  stack: Matrix4[];
  matrix: Matrix4;
  update_func: (() => void) | undefined;

  constructor() {
    this.stack = [];
    this.matrix = new Matrix4();
    this.matrix.makeIdentity();
    this.update_func = undefined;
  }

  set_internal_matrix(mat: Matrix4, update_func: () => void): void {
    this.update_func = update_func;
    this.matrix = mat;
  }

  reset(mat: Matrix4): void {
    this.matrix.load(mat);
    this.stack = [];
    if (this.update_func !== undefined) this.update_func();
  }

  load(mat: Matrix4): void {
    this.matrix.load(mat);
    if (this.update_func !== undefined) this.update_func();
  }

  multiply(mat: Matrix4): void {
    this.matrix.multiply(mat);
    if (this.update_func !== undefined) this.update_func();
  }

  identity(): void {
    this.matrix.loadIdentity();
    if (this.update_func !== undefined) this.update_func();
  }

  push(mat2?: Matrix4): void {
    this.stack.push(new Matrix4(this.matrix));
    if (mat2 !== undefined) {
      this.matrix.load(mat2);
      if (this.update_func !== undefined) this.update_func();
    }
  }

  pop(): Matrix4 {
    let mat = this.stack.pop(this.stack.length - 1);
    this.matrix.load(mat);
    if (this.update_func !== undefined) this.update_func();
    return mat;
  }
}

/*

on factor;
off period;

load_package "avector";


a1 := avec(a1x, a1y, a1z);
b1 := avec(b1x, b1y, b1z);
c1 := avec(c1x, c1y, c1z);
d1 := avec(d1x, d1y, d1z);

a1x := 0;
a1y := 0;
a1z := 0;

a2 := avec(a2x, a2y, a2z);
b2 := avec(b2x, b2y, b2z);
c2 := avec(c2x, c2y, c2z);
d2 := avec(d2x, d2y, d2z);

p1 := a1 + (b1 - a1) * v;
p2 := d1 + (c1 - d1) * v;
p3 := p1 + (p2 - p1) * u;

p4 := a2 + (b2 - a2) * v;
p5 := d2 + (c2 - d2) * v;
p6 := p4 + (p5 - p4) * u;

p7 := p3 + (p6 - p3) * w;

f1 := p7[0] - goalx;
f2 := p7[1] - goaly;
f3 := p7[2] - goalz;

comment: solve({f1, f2, f3}, {u, v, w});

on fort;
p7;
off fort;

sub(u=0, v=1, w=0, p7[0]);

*/

const tril_rets: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 128));

function lreport(..._args: unknown[]): void {
  //console.log(...arguments);
}

export function trilinear_v3(uvw: MyVectorLike, boxverts: MyVectorLike[]): Vec3 {
  let [u, v, w] = uvw;

  const a1x = boxverts[0][0],
    a1y = boxverts[0][1],
    a1z = boxverts[0][2];

  const b1x = boxverts[1][0] - a1x,
    b1y = boxverts[1][1] - a1y,
    b1z = boxverts[1][2] - a1z;
  const c1x = boxverts[2][0] - a1x,
    c1y = boxverts[2][1] - a1y,
    c1z = boxverts[2][2] - a1z;
  const d1x = boxverts[3][0] - a1x,
    d1y = boxverts[3][1] - a1y,
    d1z = boxverts[3][2] - a1z;

  const a2x = boxverts[4][0] - a1x,
    a2y = boxverts[4][1] - a1y,
    a2z = boxverts[4][2] - a1z;
  const b2x = boxverts[5][0] - a1x,
    b2y = boxverts[5][1] - a1y,
    b2z = boxverts[5][2] - a1z;
  const c2x = boxverts[6][0] - a1x,
    c2y = boxverts[6][1] - a1y,
    c2z = boxverts[6][2] - a1z;
  const d2x = boxverts[7][0] - a1x,
    d2y = boxverts[7][1] - a1y,
    d2z = boxverts[7][2] - a1z;

  const x =
    (((a2x - b2x) * v - a2x + (c2x - d2x) * v + d2x) * u -
      ((a2x - b2x) * v - a2x) -
      (((c1x - d1x) * v + d1x - b1x * v) * u + b1x * v)) *
      w +
    ((c1x - d1x) * v + d1x - b1x * v) * u +
    b1x * v;
  const y =
    (((a2y - b2y) * v - a2y + (c2y - d2y) * v + d2y) * u -
      ((a2y - b2y) * v - a2y) -
      (((c1y - d1y) * v + d1y - b1y * v) * u + b1y * v)) *
      w +
    ((c1y - d1y) * v + d1y - b1y * v) * u +
    b1y * v;
  const z =
    (((a2z - b2z) * v - a2z + (c2z - d2z) * v + d2z) * u -
      ((a2z - b2z) * v - a2z) -
      (((c1z - d1z) * v + d1z - b1z * v) * u + b1z * v)) *
      w +
    ((c1z - d1z) * v + d1z - b1z * v) * u +
    b1z * v;

  let p = tril_rets.next();

  p[0] = x + a1x;
  p[1] = y + a1y;
  p[2] = z + a1z;

  return p;
}

let tril_co_rets: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 128));
let tril_co_tmps: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 16));
let tril_mat_1 = new Matrix4();
let tril_mat_2 = new Matrix4();

let wtable = [
  [
    [0.5, 0.5, 0], //u triplet
    [0.5, 0.5, 0], //v triplet
    [0.5, 0.5, 0], //w triplet
  ],
  [
    [0.5, 0.5, 0],
    [0.0, 0.5, 0.5],
    [0.5, 0.5, 0],
  ],
  [
    [0.0, 0.5, 0.5],
    [0.0, 0.5, 0.5],
    [0.5, 0.5, 0],
  ],
  [
    [0.0, 0.5, 0.5],
    [0.5, 0.5, 0],
    [0.5, 0.5, 0],
  ],
];

for (let i = 0; i < 4; i++) {
  let w = wtable[i];
  w = [w[0], w[1], [0.0, 0.5, 0.5]];
  wtable.push(w);
}

const pih_tmps: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 16));
const boxfaces_table = [
  [0, 1, 2, 3],
  [7, 6, 5, 4],
  [0, 4, 5, 1],
  [1, 5, 6, 2],
  [2, 6, 7, 3],
  [3, 7, 4, 0],
];

let boxfaces_tmp = new Array(6);
for (let i = 0; i < 6; i++) {
  boxfaces_tmp[i] = new Vector3();
}

let boxfacenormals_tmp = new Array(6);
for (let i = 0; i < 6; i++) {
  boxfacenormals_tmp[i] = new Vector3();
}

export function point_in_hex(
  p: MyVectorLike,
  boxverts: MyVectorLike[],
  boxfacecents: Vec3[] | undefined = undefined,
  boxfacenormals: Vec3[] | undefined = undefined
): boolean {
  if (!boxfacecents) {
    boxfacecents = boxfaces_tmp;

    for (let i = 0; i < 6; i++) {
      let [v1, v2, v3, v4] = boxfaces_table[i];
      v1 = boxverts[v1];
      v2 = boxverts[v2];
      v3 = boxverts[v3];
      v4 = boxverts[v4];

      boxfacecents[i].load(v1).add(v2).add(v3).add(v4).mulScalar(0.25);
    }
  }

  if (!boxfacenormals) {
    boxfacenormals = boxfacenormals_tmp;
    for (let i = 0; i < 6; i++) {
      let [v1, v2, v3, v4] = boxfaces_table[i];
      v1 = boxverts[v1];
      v2 = boxverts[v2];
      v3 = boxverts[v3];
      v4 = boxverts[v4];

      let n = normal_quad(v1, v2, v3, v4);
      boxfacenormals[i].load(n).negate();
    }
  }

  let t1 = pih_tmps.next();
  let t2 = pih_tmps.next();

  let cent = pih_tmps.next().zero();
  for (let i = 0; i < 6; i++) {
    cent.add(boxfacecents[i]);
  }
  cent.mulScalar(1.0 / 6.0);

  let ret = true;

  for (let i = 0; i < 6; i++) {
    t1.load(p).sub(boxfacecents[i]);
    t2.load(cent).sub(boxfacecents[i]);
    let n = boxfacenormals[i];

    if (1) {
      t1.normalize();
      t2.normalize();
    }

    if (t1.dot(t2) < 0) {
      return false;
    }
  }

  return ret;
}

const boxverts_tmp = new Array(8);
for (let i = 0; i < 8; i++) {
  boxverts_tmp[i] = new Vector3();
}

export function trilinear_co(p: MyVectorLike, boxverts: MyVectorLike[]): Vec3 {
  let uvw = tril_co_rets.next();

  uvw.zero();

  let u = tril_co_tmps.next();
  let v = tril_co_tmps.next();
  let w = tril_co_tmps.next();

  u.loadXYZ(0.0, 0.5, 1.0);
  v.loadXYZ(0.0, 0.5, 1.0);
  w.loadXYZ(0.0, 0.5, 1.0);

  let uvw2 = tril_co_tmps.next();

  for (let step = 0; step < 4; step++) {
    uvw.loadXYZ(u[1], v[1], w[1]);

    let mini: number | undefined = undefined;
    let mindis: number | undefined = trilinear_v3(uvw, boxverts).vectorDistanceSqr(p);

    for (let i = 0; i < 8; i++) {
      let [t1, t2, t3] = wtable[i];

      let u2 = t1[0] * u[0] + t1[1] * u[1] + t1[2] * u[2];
      let v2 = t2[0] * v[0] + t2[1] * v[1] + t2[2] * v[2];
      let w2 = t3[0] * w[0] + t3[1] * w[1] + t3[2] * w[2];

      let du = Math.abs(u2 - u[1]);
      let dv = Math.abs(v2 - v[1]);
      let dw = Math.abs(w2 - w[1]);

      uvw.loadXYZ(u2, v2, w2);
      let dis = trilinear_v3(uvw, boxverts).vectorDistanceSqr(p);

      if (mindis === undefined || dis < mindis) {
        //mindis = dis;
        //mini = i;
      }

      if (1) {
        let bv = boxverts_tmp;

        /*
        let dd = 1.0 - 0.001;

        du *= dd;
        dv *= dd;
        dw *= dd;
        //*/

        bv[0].loadXYZ(u2 - du, v2 - dv, w2 - dw);
        bv[1].loadXYZ(u2 - du, v2 + dv, w2 - dw);
        bv[2].loadXYZ(u2 + du, v2 + dv, w2 - dw);
        bv[3].loadXYZ(u2 + du, v2 - dv, w2 - dw);

        bv[4].loadXYZ(u2 - du, v2 - dv, w2 + dw);
        bv[5].loadXYZ(u2 - du, v2 + dv, w2 + dw);
        bv[6].loadXYZ(u2 + du, v2 + dv, w2 + dw);
        bv[7].loadXYZ(u2 + du, v2 - dv, w2 + dw);

        for (let j = 0; j < 8; j++) {
          bv[j].load(trilinear_v3(bv[j], boxverts));
        }

        if (point_in_hex(p, bv)) {
          mini = i;
          mindis = dis;
          //console.log("DIS", (dis**0.5).toFixed(3));
          break;
        }

        //console.log("\n");
      }
    }

    if (mini === undefined) {
      lreport("mindis:", (mindis ** 0.5).toFixed(3));
      break;
    }

    let [t1, t2, t3] = wtable[mini];

    let u2 = t1[0] * u[0] + t1[1] * u[1] + t1[2] * u[2];
    let v2 = t2[0] * v[0] + t2[1] * v[1] + t2[2] * v[2];
    let w2 = t3[0] * w[0] + t3[1] * w[1] + t3[2] * w[2];

    let du = Math.abs(u2 - u[1]);
    let dv = Math.abs(v2 - v[1]);
    let dw = Math.abs(w2 - w[1]);

    u[0] = u2 - du;
    v[0] = v2 - dv;
    w[0] = w2 - dw;

    u[1] = u2;
    v[1] = v2;
    w[1] = w2;

    u[2] = u2 + du;
    v[2] = v2 + dv;
    w[2] = w2 + dw;

    lreport("mindis:", (mindis ** 0.5).toFixed(3), u2, v2, w2);
  }

  uvw.loadXYZ(u[1], v[1], w[1]);

  //console.log("uvw", uvw);

  //return uvw;

  return trilinear_co2(p, boxverts, uvw);
}

//newton-raphson
export function trilinear_co2(p: MyVectorLike, boxverts: MyVectorLike[], uvw: Vector3): Vec3 {
  //let uvw = tril_co_rets.next();
  let grad = tril_co_tmps.next();

  //uvw[0] = uvw[1] = uvw[2] = 0.5;

  let df = 0.00001;

  let mat = tril_mat_1;
  let m = mat.$matrix;
  let mat2 = tril_mat_2;

  let r1 = tril_co_tmps.next();

  for (let step = 0; step < 55; step++) {
    //let r1 = trilinear_v3(uvw, boxverts).vectorDistance(p);
    let totg = 0;

    for (let i = 0; i < 3; i++) {
      let axis_error = 0.0;

      if (uvw[i] < 0) {
        axis_error = -uvw[i];
      } else if (uvw[i] > 1.0) {
        axis_error = uvw[i] - 1.0;
      }
      //r1[i] = trilinear_v3(uvw, boxverts)[i] - p[i];
      r1[i] = trilinear_v3(uvw, boxverts).vectorDistance(p) + 10.0 * axis_error;

      let orig = uvw[i];

      uvw[i] += df;
      //let r2 = trilinear_v3(uvw, boxverts)[i] - p[i];

      if (uvw[i] < 0) {
        axis_error = -uvw[i];
      } else if (uvw[i] > 1.0) {
        axis_error = uvw[i] - 1.0;
      } else {
        axis_error = 0.0;
      }
      let r2 = trilinear_v3(uvw, boxverts).vectorDistance(p) + 10.0 * axis_error;
      uvw[i] = orig;

      grad[i] = (r2 - r1[i]) / df;
      totg += grad[i] ** 2;
    }

    if (totg === 0.0) {
      break;
    }

    let err = trilinear_v3(uvw, boxverts).vectorDistance(p);

    if (1) {
      //grad.normalize();
      uvw.addFac(grad, (-err / totg) * 0.85);
    } else {
      mat.makeIdentity();
      m.m11 = grad[0];
      m.m12 = grad[1];
      m.m13 = grad[2];
      m.m22 = m.m33 = m.m44 = 0.0;

      mat.transpose();
      mat2.load(mat).transpose();

      //right-indepdenent pseudo inverse
      //mat.multiply(mat2).invert();
      //mat.preMultiply(mat2);

      //left-independent
      mat.preMultiply(mat2).invert();
      mat.multiply(mat2);

      grad.load(r1);
      grad.multVecMatrix(mat);
      uvw.addFac(grad, -1.0);
    }

    lreport("error:", err.toFixed(3), uvw);

    if (r1.dot(r1) ** 0.5 < 0.0001) {
      break;
    }
  }

  lreport("\n");

  return uvw;
}

let angle_tri_v3_rets: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 32));
let angle_tri_v3_vs: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 32));

export function tri_angles(v1: MyVectorLike, v2: MyVectorLike, v3: MyVectorLike): Vec3 {
  let t1 = angle_tri_v3_vs.next().load(v1).sub(v2);
  let t2 = angle_tri_v3_vs.next().load(v3).sub(v2);
  let t3 = angle_tri_v3_vs.next().load(v2).sub(v3);

  t1.normalize();
  t2.normalize();
  t3.normalize();

  let th1 = Math.acos(t1.dot(t2) * 0.99999);
  t2.negate();

  let th2 = Math.acos(t2.dot(t3) * 0.99999);
  let th3 = Math.PI - (th1 + th2);

  let ret = angle_tri_v3_rets.next();

  ret[0] = th1;
  ret[1] = th2;
  ret[2] = th3;

  return ret;
}

let angle_v2_temps: CacheRing<Vec2> = cacheRing<Vec2>(util.cachering.fromConstructor(Vector2, 32));
let angle_v3_temps: CacheRing<Vec3> = cacheRing<Vec3>(util.cachering.fromConstructor(Vector3, 32));

export function angle_between_vecs(
  v1: MyVectorLike & { length: number },
  vcent: MyVectorLike,
  v2: MyVectorLike
): number {
  let t1: Vec2 | Vec3, t2: Vec2 | Vec3;

  if (v1.length === 2) {
    t1 = angle_v2_temps.next();
    t2 = angle_v2_temps.next();
  } else {
    t1 = angle_v3_temps.next();
    t2 = angle_v3_temps.next();
  }

  t1.load(v1).sub(vcent).normalize();
  t2.load(v2).sub(vcent).normalize();

  let d = t1.dot(t2);

  /* Handle numerical error. */
  if (d < -1.0) {
    return Math.PI;
  } else if (d > 1.0) {
    return 0.0;
  } else {
    return Math.acos(d);
  }
}
