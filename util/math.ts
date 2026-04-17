/**
 * Assorted geometry utility functions.
 *
 * This file was originally written in a modified form of ES6 way back in ~2010.
 * It was then transpiled to ES5 before being ported later to ES6.
 *
 * TODO: cleanup this file.
 */
import { StructReader } from "./nstructjs";
import nstructjs from "./struct";
import * as util from "./util";
import {
  Vector2,
  Vector3,
  Vector4,
  Matrix4,
  Vector2Like,
  Vector3Like,
  Vector4Like,
  Number4,
  Number2,
  Number3,
} from "./vectormath";

type Vec2Like = Vector2Like;
type Vec3Like = Vector3Like;
type Vec4Like = Vector4Like;

const dtvtmps = util.cachering.fromConstructor(Vector3, 32);
const quad_co_rets2 = util.cachering.fromConstructor(Vector2, 512);
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
export function quad_uv_2d(p: Vec2Like, v1: Vec2Like, v2: Vec2Like, v3: Vec2Like, v4: Vec2Like) {
  let u;
  let v;
  const v2x = v2[0] - v1[0];
  const v2y = v2[1] - v1[1];
  const v3x = v3[0] - v1[0];
  const v3y = v3[1] - v1[1];
  const v4x = v4[0] - v1[0];
  const v4y = v4[1] - v1[1];
  const x = p[0] - v1[0];
  const y = p[1] - v1[1];
  const sqrt = Math.sqrt;
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
  const B = v4x * y - v4y * x + v3y * x - v3x * y;
  let C1 = 2 * (v3x - v4x) * v2y - 2 * (v3y - v4y) * v2x;
  let C2 = 2 * (v3x * v4y - v3y * v4x + v2y * v4x) - 2 * v2x * v4y;
  let u1;
  let u2;
  let v1_out;
  let v2_out;
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
    const l = Math.sqrt(dx * dx + dy * dy);
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
    let dx;
    let dy;
    dx = v3x - v2x;
    dy = v3y - v2y;
    console.log("C2 bad");
    const l = Math.sqrt(dx ** 2 + dy ** 2);
    if (l > 0.00001) {
      dx /= l * l;
      dy /= l * l;
    }
    v1_out = v2_out = x * dx + y * dy;
  } else {
    v1_out = (-(B - sqrt(A) + (v4y + y) * v2x) + (v4x + x) * v2y) / C2;
    v2_out = (-(B + sqrt(A) + (v4y + y) * v2x) + (v4x + x) * v2y) / C2;
  }
  const ret = quad_co_rets2.next();
  const d1 = (u1 - 0.5) ** 2 + (v1_out - 0.5) ** 2;
  const d2 = (u2 - 0.5) ** 2 + (v2_out - 0.5) ** 2;
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
const advs = util.cachering.fromConstructor(Vector4, 128);
/** @deprecated */
export class AbstractCurve {
  evaluate(t: number) {
    throw new Error("implement me");
  }
  derivative(t: number) {}
  curvature(t: number) {}
  normal(t: number) {}
  width(t: number) {}
}
/** @deprecated */
export class ClosestCurveRets {
  p: Vec3Like;
  t: number;
  constructor() {
    this.p = new Vector3();
    this.t = 0;
  }
}
/** @deprecated */ export function closestPoint(p: Vec3Like, curve: AbstractCurve, mode: number): void {
  const steps = 5;
  let s = 0;
  const ds = 1.0 / steps;
  const ri = 0;
  for (let i = 0; i < steps; i++, s += ds) {
    const c1 = curve.evaluate(s);
    const c2 = curve.evaluate(s + ds);
  }
}
const poly_normal_tmps = util.cachering.fromConstructor(Vector3, 64);
const pncent = new Vector3();
export function normal_poly(vs: Vec3Like[]) {
  if (vs.length === 3) {
    return poly_normal_tmps.next().load(normal_tri(vs[0], vs[1], vs[2]));
  } else if (vs.length === 4) {
    return poly_normal_tmps.next().load(normal_quad(vs[0], vs[1], vs[2], vs[3]));
  }
  if (vs.length === 0) {
    return poly_normal_tmps.next().zero();
  }
  const cent = pncent.zero();
  let tot = 0;
  for (const v of vs) {
    cent.add(v as Vector3);
    tot++;
  }
  cent.mulScalar(1.0 / tot);
  const n = poly_normal_tmps.next().zero();
  for (let i = 0; i < vs.length; i++) {
    const a = vs[i];
    const b = vs[(i + 1) % vs.length];
    const c = cent;
    const n2 = normal_tri(a, b, c);
    n.add(n2);
  }
  n.normalize();
  return n;
}

/* reduce algebra script
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

const barycentric_v2_rets = util.cachering.fromConstructor(Vector2, 2048);
const calc_proj_refs = new util.cachering(() => [0, 0] as Number3[], 64);

/* 
  a b c d
     b

  a------c

     d
*/
/*reduce algebra script:

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


  */ /**

 v2

 v1------v3

 v4

 */ export function dihedral_v3_sqr(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, v4: Vec3Like) {
  const bx = v2[0] - v1[0];
  const by = v2[1] - v1[1];
  const bz = v2[2] - v1[2];
  const cx = v3[0] - v1[0];
  const cy = v3[1] - v1[1];
  const cz = v3[2] - v1[2];
  const dx = v4[0] - v1[0];
  const dy = v4[1] - v1[1];
  const dz = v4[2] - v1[2];
  return (
    ((bx * cz - bz * cx) * (cx * dz - cz * dx) +
      (by * cz - bz * cy) * (cy * dz - cz * dy) +
      (bx * cy - by * cx) * (cx * dy - cy * dx)) **
      2 /
    (((bx * cz - bz * cx) ** 2 + (by * cz - bz * cy) ** 2 + (bx * cy - by * cx) ** 2) *
      ((cx * dz - cz * dx) ** 2 + (cy * dz - cz * dy) ** 2 + (cx * dy - cy * dx) ** 2))
  );
}
const tet_area_tmps = util.cachering.fromConstructor(Vector3, 64);
export function tet_volume(a: Vec3Like, b: Vec3Like, c: Vec3Like, d: Vec3Like): number {
  const a2 = tet_area_tmps.next().load(a);
  const b2 = tet_area_tmps.next().load(b);
  const c2 = tet_area_tmps.next().load(c);
  const d2 = tet_area_tmps.next().load(d);
  a2.sub(d2);
  b2.sub(d2);
  c2.sub(d2);
  b2.cross(c2);
  return a2.dot(b2) / 6.0;
}
export function calc_projection_axes(no: Vec3Like): Number3[] {
  const ax = Math.abs(no[0]);
  const ay = Math.abs(no[1]);
  const az = Math.abs(no[2]);
  const ret = calc_proj_refs.next();
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
const _avtmps = util.cachering.fromConstructor(Vector3, 128);
function inrect_3d(p: Vec3Like, min: Vec3Like, max: Vec3Like): boolean {
  let ok = p[0] >= min[0] && p[0] <= max[0];
  ok = ok && p[1] >= min[1] && p[1] <= max[1];
  ok = ok && p[2] >= min[2] && p[2] <= max[2];
  return ok;
}
export function aabb_isect_line_3d(v1: Vec3Like, v2: Vec3Like, min: Vec3Like, max: Vec3Like): boolean {
  let inside = inrect_3d(v1, min, max);
  inside = inside || inrect_3d(v2, min, max);
  if (inside) {
    return true;
  }
  const cent = _avtmps
    .next()
    .load(min)
    .interp(max as Vector3, 0.5);
  const cpl = closest_point_on_line(cent, v1, v2, true);
  if (!cpl) {
    return false;
  }
  const p = cpl[0];
  return inrect_3d(p, min, max);
}
export function aabb_isect_cylinder_3d(
  v1: Vec3Like,
  v2: Vec3Like,
  radius: number,
  min: Vec3Like,
  max: Vec3Like
): boolean {
  let inside = inrect_3d(v1, min, max);
  inside = inside || inrect_3d(v2, min, max);
  if (inside) {
    return true;
  }
  const cent = _avtmps
    .next()
    .load(min)
    .interp(max as Vector3, 0.5);
  const cpl = closest_point_on_line(cent, v1, v2, true);
  if (!cpl) {
    return false;
  }
  const p = cpl[0];
  const size = _avtmps.next().load(max).sub(min);
  size.mulScalar(0.5);
  size.addScalar(radius); //*(3**0.5));
  p.sub(cent).abs();
  return p[0] <= size[0] && p[1] <= size[1] && p[2] <= size[2];
}
export function barycentric_v2(
  p: Vec2Like,
  v1: Vec2Like,
  v2: Vec2Like,
  v3: Vec2Like,
  axis1: Number2 = 0,
  axis2: Number2 = 1,
  out?: Vec2Like
): Vec2Like {
  const v2arr = v2;
  const v3arr = v3;
  const v1arr = v1;
  const parr = p;
  let div =
    v2arr[axis1] * v3arr[axis2] -
    v2arr[axis2] * v3arr[axis1] +
    (v2arr[axis2] - v3arr[axis2]) * v1arr[axis1] -
    (v2arr[axis1] - v3arr[axis1]) * v1arr[axis2];
  if (Math.abs(div) < 0.000001) {
    div = 0.00001;
  }
  const u =
    (v2arr[axis1] * v3arr[axis2] -
      v2arr[axis2] * v3arr[axis1] +
      (v2arr[axis2] - v3arr[axis2]) * parr[axis1] -
      (v2arr[axis1] - v3arr[axis1]) * parr[axis2]) /
    div;
  const v =
    (-(v1arr[axis1] * v3arr[axis2] - v1arr[axis2] * v3arr[axis1] + (v1arr[axis2] - v3arr[axis2]) * parr[axis1]) +
      (v1arr[axis1] - v3arr[axis1]) * parr[axis2]) /
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

**/ function _linedis2(co: Vec3Like, v1: Vec3Like, v2: Vec3Like): number {
  const v1x = v1[0] - co[0];
  const v1y = v1[1] - co[1];
  const v1z = v1[2] - co[2];
  const v2x = v2[0] - co[0];
  const v2y = v2[1] - co[1];
  const v2z = v2[2] - co[2];
  const dis =
    (((v1y - v2y) * v1y + (v1z - v2z) * v1z + (v1x - v2x) * v1x) * (v1y - v2y) - v1y) ** 2 +
    (((v1y - v2y) * v1y + (v1z - v2z) * v1z + (v1x - v2x) * v1x) * (v1z - v2z) - v1z) ** 2 +
    (((v1y - v2y) * v1y + (v1z - v2z) * v1z + (v1x - v2x) * v1x) * (v1x - v2x) - v1x) ** 2;
  return dis;
}
const closest_p_tri_rets = new util.cachering(() => {
  return {
    co  : new Vector3(),
    uv  : new Vector2(),
    dist: 0,
  };
}, 512);
const cpt_v1 = new Vector3();
const cpt_v2 = new Vector3();
const cpt_v3 = new Vector3();
const cpt_v4 = new Vector3();
const cpt_v5 = new Vector3();
const cpt_v6 = new Vector3();
const cpt_p = new Vector3();
const cpt_n = new Vector3();
const cpt_mat = new Matrix4();
const cpt_mat2 = new Matrix4();
const cpt_b = new Vector4();
export function closest_point_on_quad(
  p: Vec3Like,
  v1: Vec3Like,
  v2: Vec3Like,
  v3: Vec3Like,
  v4: Vec3Like,
  n?: Vec3Like,
  uvw?: Vec3Like
): { co: Vector3; uv: Vector2; dist: number } {
  const a = closest_point_on_tri(p, v1, v2, v3, n, uvw);
  const b = closest_point_on_tri(p, v1, v3, v4, n, uvw);
  return a.dist <= b.dist ? a : b;
}
export function closest_point_on_tri(
  p: Vec3Like,
  v1: Vec3Like,
  v2: Vec3Like,
  v3: Vec3Like,
  n?: Vec3Like,
  uvw?: Vec3Like
): { co: Vector3; uv: Vector2; dist: number } {
  const op = p;
  if (uvw) {
    uvw[0] = uvw[1] = 0.0;
    if (uvw.length > 2) {
      uvw[2] = 0.0;
    }
  }
  const lv1 = cpt_v1.load(v1);
  const lv2 = cpt_v2.load(v2);
  const lv3 = cpt_v3.load(v3);
  const lp = cpt_p.load(p);
  let ln;
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
  let ax1: Number3;
  let ax2: Number3;
  const ax = Math.abs(ln[0]);
  const ay = Math.abs(ln[1]);
  const az = Math.abs(ln[2]);
  if (ax === 0.0 && ay === 0.0 && az === 0.0) {
    console.log("eek1", ln, lv1, lv2, lv3);
    const ret = closest_p_tri_rets.next();
    ret.dist = 1e17;
    ret.co.zero();
    ret.uv.zero();
    return ret;
  }
  let ax3: Number3;
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
  const mat = cpt_mat;
  const mat2 = cpt_mat2;
  mat.makeIdentity();
  const m = mat.$matrix;
  const lv1arr = lv1;
  const lv2arr = lv2;
  const lv3arr = lv3;
  m.m11 = lv1arr[ax1];
  m.m12 = lv2arr[ax1];
  m.m13 = lv3arr[ax1];
  m.m14 = 0.0;
  m.m21 = lv1arr[ax2];
  m.m22 = lv2arr[ax2];
  m.m23 = lv3arr[ax2];
  m.m24 = 0.0;
  /*
  m.m31 = lv1[ax3];
  m.m32 = lv2[ax3];
  m.m33 = lv3[ax3];
  m.m34 = 0.0;
  */ m.m31 = 1;
  m.m32 = 1;
  m.m33 = 1;
  m.m34 = 0.0;
  mat.transpose();
  const b = cpt_b.zero();
  const lparr = lp;
  b[0] = lparr[ax1];
  b[1] = lparr[ax2];
  //(b )[2] = lparr[ax3];
  b[2] = 1.0;
  b[3] = 0.0;
  mat2.load(mat).transpose();
  mat.preMultiply(mat2);
  if (mat.invert() === null) {
    console.log("eek2", mat.determinant(), ax1, ax2, ln);
    const ret = closest_p_tri_rets.next();
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
    uvw[0] = u;
    uvw[1] = v;
    if (uvw.length > 2) {
      uvw[2] = w;
    }
  }
  const x = lv1[0] * u + lv2[0] * v + lv3[0] * w;
  const y = lv1[1] * u + lv2[1] * v + lv3[1] * w;
  const z = lv1[2] * u + lv2[2] * v + lv3[2] * w;
  const ret = closest_p_tri_rets.next();
  ret.co.loadXYZ(x, y, z);
  ret.uv[0] = u;
  ret.uv[1] = v;
  ret.dist = ret.co.vectorLength();
  ret.co.add(op);
  return ret;
}
export function dist_to_tri_v3_old(co: Vec3Like, v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, no?: Vec3Like): number {
  let lno;
  if (!no) {
    lno = dtvtmps.next().load(normal_tri(v1, v2, v3));
  } else {
    lno = no;
  }
  const p = dtvtmps.next().load(co);
  p.sub(v1);
  const planedis = -p.dot(lno);
  const [axis, axis2] = calc_projection_axes(lno);
  const p1 = dtvtmps.next();
  const p2 = dtvtmps.next();
  const p3 = dtvtmps.next();
  const v1arr = v1;
  const v2arr = v2;
  const v3arr = v3;
  const p1arr = p1;
  const p2arr = p2;
  const p3arr = p3;
  p1arr[0] = v1arr[axis];
  p1arr[1] = v1arr[axis2];
  p1arr[2] = 0.0;
  p2arr[0] = v2arr[axis];
  p2arr[1] = v2arr[axis2];
  p2arr[2] = 0.0;
  p3arr[0] = v3arr[axis];
  p3arr[1] = v3arr[axis2];
  p3arr[2] = 0.0;
  const pp = dtvtmps.next();
  const pparr = pp;
  const coarr = co;
  pparr[0] = coarr[axis];
  pparr[1] = coarr[axis2];
  pparr[2] = 0.0;
  let dis = 1e17;
  function linedis2d(a: Vec2Like, b: Vec2Like, c: Vec2Like) {
    const dx1 = a[0] - b[0];
    const dy1 = a[1] - b[1];
    let dx2 = c[0] - b[0];
    let dy2 = c[1] - b[1];
    let len = dx2 * dx2 + dy2 * dy2;
    len = len > 0.000001 ? 1.0 / len : 0.0;
    dx2 *= len;
    dy2 *= len;
    return Math.abs(dx1 * dy2 - dx2 * dy1);
  }
  const tmp = dtvtmps.next();
  const tmp2 = dtvtmps.next();
  function linedis3d(a: Vec3Like, b: Vec3Like, c: Vec3Like) {
    tmp.load(a).sub(b);
    tmp2.load(c).sub(b).normalize();
    let t = tmp.dot(tmp2);
    t = Math.min(Math.max(t, 0.0), b.vectorDistance(c));
    tmp2.mulScalar(t).add(b);
    return tmp2.vectorDistance(a);
  }
  /* are we above the triangle? if so use plane distance */ if (point_in_tri(pp, p1, p2, p3)) {
    return Math.abs(planedis);
  }
  /* get distance to the closest edge */ dis = Math.min(dis, linedis3d(co, v1, v2));
  dis = Math.min(dis, linedis3d(co, v2, v3));
  dis = Math.min(dis, linedis3d(co, v3, v1));
  if (0) {
    const uv = barycentric_v2(pp, p1, p2, p3);
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
export function dist_to_tri_v3(p: Vec3Like, v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, n?: Vec3Like): number {
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

*/ const _dt3s_n = new Vector3();
export function dist_to_tri_v3_sqr(p: Vec3Like, v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, n?: Vec3Like): number {
  if (n === undefined) {
    n = _dt3s_n;
    n.load(normal_tri(v1, v2, v3));
  }
  // Cast all the MyVectorLike to number arrays for indexing
  const parr = p;
  const v1arr = v1;
  const v2arr = v2;
  const v3arr = v3;
  const narr = n;
  // find projection axis;
  let axis1: Number3;
  let axis2: Number3;
  let axis3: Number3;
  let nx = narr[0] < 0.0 ? -narr[0] : narr[0];
  let ny = narr[1] < 0.0 ? -narr[1] : narr[1];
  let nz = narr[2] < 0.0 ? -narr[2] : narr[2];
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
  let planedis = (parr[0] - v1arr[0]) * narr[0] + (parr[1] - v1arr[1]) * narr[1] + (parr[2] - v1arr[2]) * narr[2];
  planedis = planedis < 0.0 ? -planedis : planedis;
  const ax = v1arr[axis1];
  const ay = v1arr[axis2];
  const az = v1arr[axis3];
  const bx = v2arr[axis1] - ax;
  const by = v2arr[axis2] - ay;
  const bz = v2arr[axis3] - az;
  const cx = v3arr[axis1] - ax;
  const cy = v3arr[axis2] - ay;
  const cz = v3arr[axis3] - az;
  const bx2 = bx * bx;
  const by2 = by * by;
  const bz2 = bz * bz;
  const cx2 = cx * cx;
  const cy2 = cy * cy;
  const cz2 = cz * cz;
  const x1 = parr[axis1] - ax;
  const y1 = parr[axis2] - ay;
  const z1 = parr[axis3] - az;
  const testf = 0.0;
  const l1 = Math.sqrt(bx ** 2 + by ** 2);
  const l2 = Math.sqrt((cx - bx) ** 2 + (cy - by) ** 2);
  const l3 = Math.sqrt(cx ** 2 + cy ** 2);
  let s1 = x1 * by - y1 * bx < testf;
  let s2 = (x1 - bx) * (cy - by) - (y1 - by) * (cx - bx) < testf;
  let s3 = x1 * -cy + y1 * cx < testf;
  /*
    (x1-cx)*-cy - (y1-cy)*-cx
   reduces to:
     x1*-cy + y1*cx;
   */ //console.log(axis1, axis2, axis3, n);
  //console.log(s1, s2, s3);
  //console.log(bx, by, cx, cy);
  if (1 && narr[axis3] < 0.0) {
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
  const mask = (Number(s1) & 1) | (Number(s2) << 1) | (Number(s3) << 2);
  if (mask === 0 || mask === 7) {
    return planedis * planedis;
  }
  let d1;
  let d2;
  let d3;
  let div;
  /*
//\  3|
//  \ |
//    b
//    | \
//  1 |   \  2
//    |  0  \
// ___a_______c___
//  5 |   4      \ 6
*/ let dis = 0.0;
  let lx;
  let ly;
  let lz;
  lx = bx;
  ly = by;
  lz = bz;
  nx = narr[axis1];
  ny = narr[axis2];
  nz = narr[axis3];
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
    const odis = dis;
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


  */ return dis * mul + planedis * planedis;
}
const tri_area_temps = util.cachering.fromConstructor(Vector3, 64);
export function tri_area(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like): number {
  const l1 = v1.vectorDistance(v2);
  const l2 = v2.vectorDistance(v3);
  const l3 = v3.vectorDistance(v1);
  let s = (l1 + l2 + l3) / 2.0;
  s = s * (s - l1) * (s - l2) * (s - l3);
  s = Math.max(s, 0);
  /* Numerical error can dip into negative numbers. */ return Math.sqrt(s);
}
export function aabb_overlap_area(pos1: Vec2Like, size1: Vec2Like, pos2: Vec2Like, size2: Vec2Like): number {
  let r1 = 0.0;
  let r2 = 0.0;
  for (let _i = 0; _i < 2; _i++) {
    const i = _i as Number2;
    const a1 = pos1[i];
    const a2 = pos2[i];
    const b1 = pos1[i] + size1[i];
    const b2 = pos2[i] + size2[i];
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
 */ export function aabb_isect_2d(pos1: Vec2Like, size1: Vec2Like, pos2: Vec2Like, size2: Vec2Like): boolean {
  let ret = 0;
  for (let _i = 0; _i < 2; _i++) {
    const i = _i as Number2;
    const a = pos1[i];
    const b = pos1[i] + size1[i];
    const c = pos2[i];
    const d = pos2[i] + size2[i];
    if (b >= c && a <= d) ret += 1;
  }
  return ret === 2;
}
export function aabb_isect_3d(pos1: Vec3Like, size1: Vec3Like, pos2: Vec3Like, size2: Vec3Like): boolean {
  let ret = 0;
  for (let _i = 0; _i < 3; _i++) {
    const i = _i as Number3;

    const a = pos1[i];
    const b = pos1[i] + size1[i];
    const c = pos2[i];
    const d = pos2[i] + size2[i];
    if (b >= c && a <= d) ret += 1;
  }
  return ret === 3;
}
const aabb_intersect_vs = util.cachering.fromConstructor(Vector2, 32);
const aabb_intersect_rets = new util.cachering(() => {
  return {
    pos : new Vector2(),
    size: new Vector2(),
  };
}, 512);
/**
 * Returns aabb that's the intersection of two aabbs
 * @param {*} pos1
 * @param {*} size1
 * @param {*} pos2
 * @param {*} size2
 */ export function aabb_intersect_2d(
  pos1: Vec2Like,
  size1: Vec2Like,
  pos2: Vec2Like,
  size2: Vec2Like
): { pos: Vector2; size: Vector2 } | undefined {
  const v1 = aabb_intersect_vs.next().load(pos1);
  const v2 = aabb_intersect_vs.next().load(pos1).add(size1);
  const v3 = aabb_intersect_vs.next().load(pos2);
  const v4 = aabb_intersect_vs.next().load(pos2).add(size2);
  const min = aabb_intersect_vs.next().zero();
  const max = aabb_intersect_vs.next().zero();
  let tot = 0;
  const v1arr = v1;
  const v2arr = v2;
  const v3arr = v3;
  const v4arr = v4;
  const minarr = min;
  const maxarr = max;
  for (let _i = 0; _i < 2; _i++) {
    const i = _i as Number2;
    if (v2arr[i] >= v3arr[i] && v1arr[i] <= v4arr[i]) {
      tot++;
      minarr[i] = Math.max(v3arr[i], v1arr[i]);
      maxarr[i] = Math.min(v2arr[i], v4arr[i]);
    }
  }
  if (tot !== 2) {
    return undefined;
  }
  const ret = aabb_intersect_rets.next();
  ret.pos.load(min);
  ret.size.load(max).sub(min);
  return ret;
}

export function aabb_intersect_3d(min1: Vec3Like, max1: Vec3Like, min2: Vec3Like, max2: Vec3Like): boolean {
  let tot = 0;
  for (let _i = 0; _i < 2; _i++) {
    let i = _i as Number2;
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
 */ export function aabb_union(a: [Vec2Like, Vec2Like], b: [Vec2Like, Vec2Like]): [Vec2Like, Vec2Like] {
  for (let i = 0; i < 2; i++) {
    for (let _j = 0; _j < a[i].length; _j++) {
      const j = _j as Number2;
      a[i][j] = i ? Math.max(a[i][j], b[i][j]) : Math.min(a[i][j], b[i][j]);
    }
  }
  return a;
}
export function aabb_union_2d(
  pos1: Vec2Like,
  size1: Vec2Like,
  pos2: Vec2Like,
  size2: Vec2Like
): { pos: Vector2; size: Vector2 } {
  const v1 = aabb_intersect_vs.next();
  const v2 = aabb_intersect_vs.next();
  const min = aabb_intersect_vs.next();
  const max = aabb_intersect_vs.next();
  v1.load(pos1).add(size1);
  v2.load(pos2).add(size2);
  min.load(v1).min(v2);
  max.load(v1).max(v2);
  max.sub(min);
  const ret = aabb_intersect_rets.next();
  ret.pos.load(min);
  ret.pos.load(max);
  return ret;
}
//XXX refactor to use es6 classes,
//    or at last the class system in typesystem.js
function init_prototype(cls: any, proto: any): any {
  for (const k in proto) {
    cls.prototype[k] = proto[k];
  }
  return cls.prototype;
}
function inherit(cls: any, parent: any, proto: any): any {
  cls.prototype = Object.create(parent.prototype);
  for (const k in proto) {
    cls.prototype[k] = proto[k];
  }
  return cls.prototype;
}
const set = util.set;
//everything below here was compiled from es6 code
//variables starting with $ are function static local vars,
//like in C.  don't use them outside their owning functions.
//
//except for $_mh and $_swapt.  they were used with a C macro
//preprocessor.
let $_mh;
let $_swapt;
//XXX destroy me
export const feps = 2.22e-16;
export const COLINEAR = 1;
export const LINECROSS = 2;
export const COLINEAR_ISECT = 3;
const _cross_vec1 = new Vector3();
const _cross_vec2 = new Vector3();
export const SQRT2 = Math.sqrt(2.0);
export const FEPS_DATA = {
  F16: 1.11e-16,
  F32: 5.96e-8,
  F64: 4.88e-4,
};
/*use 32 bit epsilon by default, since we're often working from
  32-bit float data.  note that javascript uses 64-bit doubles 
  internally.*/ export const FEPS = FEPS_DATA.F32;
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
*/ const _static_grp_points4 = new Array<[number, number, number?]>(4);
const _static_grp_points8 = new Array<[number, number, number?]>(8);
export function get_rect_points(p: Vec2Like | Vec3Like, size: Vec2Like | Vec3Like): (Vec2Like | Vec3Like)[] {
  let cs;
  if (p.length === 2) {
    cs = _static_grp_points4;
    cs[0] = p as any;
    cs[1] = [p[0] + size[0], p[1]];
    cs[2] = [p[0] + size[0], p[1] + size[1]];
    cs[3] = [p[0], p[1] + size[1]];
    return cs.map((c) => new Vector2(c as number[]));
  } else if (p.length === 3) {
    const p3d = p as Vec3Like;
    const size3d = size as Vec3Like;
    cs = _static_grp_points8;
    cs[0] = p3d as any;
    cs[1] = [p3d[0] + size3d[0], p3d[1], p3d[2]];
    cs[2] = [p3d[0] + size3d[0], p3d[1] + size3d[1], p3d[2]];
    cs[3] = [p3d[0], p3d[1] + size3d[0], p3d[2]];
    cs[4] = [p3d[0], p3d[1], p3d[2] + size3d[2]];
    cs[5] = [p3d[0] + size3d[0], p3d[1], p3d[2] + size3d[2]];
    cs[6] = [p3d[0] + size3d[0], p3d[1] + size3d[1], p3d[2] + size3d[2]];
    cs[7] = [p3d[0], p3d[1] + size3d[0], p3d[2] + size3d[2]];
    return cs.map((c) => new Vector3(c as number[]));
  } else {
    throw "get_rect_points has no implementation for " + p.length + "-dimensional data";
  }
  throw new Error("unreachable code");
}
export function get_rect_lines(
  p: Vec2Like | Vec3Like,
  size: Vec2Like | Vec3Like
): [Vec2Like | Vec3Like, Vec2Like | Vec3Like][] {
  const ps = get_rect_points(p, size);
  if (p.length === 2) {
    return [
      [ps[0], ps[1]],
      [ps[1], ps[2]],
      [ps[2], ps[3]],
      [ps[3], ps[0]],
    ];
  } else if (p.length === 3) {
    const l1 = [
      [ps[0], ps[1]],
      [ps[1], ps[2]],
      [ps[2], ps[3]],
      [ps[3], ps[0]],
    ] as [Vec2Like | Vec3Like, Vec2Like | Vec3Like][];
    const l2 = [
      [ps[4], ps[5]],
      [ps[5], ps[6]],
      [ps[6], ps[7]],
      [ps[7], ps[4]],
    ] as [Vec2Like | Vec3Like, Vec2Like | Vec3Like][];
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
const $vs_simple_tri_aabb_isect = new Array<Vec3Like>(3);
export function simple_tri_aabb_isect(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, min: Vec3Like, max: Vec3Like): boolean {
  $vs_simple_tri_aabb_isect[0] = v1;
  $vs_simple_tri_aabb_isect[1] = v2;
  $vs_simple_tri_aabb_isect[2] = v3;
  for (let _i = 0; _i < 3; _i++) {
    let i = _i as Number3;
    let isect = true;
    for (let j = 0; j < 3; j++) {
      if ($vs_simple_tri_aabb_isect[j][i] < min[i] || $vs_simple_tri_aabb_isect[j][i] >= max[i]) isect = false;
    }
    if (isect) return true;
  }
  return false;
}

export class MinMax1 {
  min = Number.MAX_SAFE_INTEGER;
  max = -Number.MAX_SAFE_INTEGER;
  construtor() {}
  minmax(n: number) {
    this.min = Math.min(this.min, n);
    this.max = Math.max(this.max, n);
  }
  reset() {
    this.min = Number.MAX_SAFE_INTEGER;
    this.max = -Number.MAX_SAFE_INTEGER;
    return this;
  }
  get empty() {
    return this.min === Number.MAX_SAFE_INTEGER;
  }
}

export class MinMax<N extends 2 | 3 | 4 = 2> {
  totaxis: number;
  min: Vector4;
  max: Vector4;

  #_min: Vector4;
  #_max: Vector4;
  #_static_mr_cs;
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
  math.MinMax {
    min    : array(float);
    max    : array(float);
    totaxis: int;
  }  
  `
  );

  constructor(totaxis?: N) {
    // note: nstructjs requires no required arguments in constructor
    this.totaxis = totaxis as unknown as N;

    this.#_min = new Vector4();
    this.#_max = new Vector4();
    this.min = new Vector4();
    this.max = new Vector4();

    this.reset();
    this.#_static_mr_cs = new Array<number[]>(this.totaxis * this.totaxis);
  }
  loadSTRUCT(reader: StructReader<this>) {
    reader(this);
  }
  load(mm: MinMax<N>) {
    this.min.load(mm.min);
    this.max.load(mm.max);
    this.#_min.load(mm.#_min);
    this.#_max.load(mm.#_max);
    return this;
  }
  reset() {
    const totaxis = this.totaxis;
    for (let i = 0; i < totaxis; i++) {
      this.#_min[i as Number4] = Number.MAX_SAFE_INTEGER;
      this.#_max[i as Number4] = -Number.MAX_SAFE_INTEGER;
      this.min[i as Number4] = 0;
      this.max[i as Number4] = 0;
    }
    return this;
  }

  get empty() {
    for (let i = 0; i < this.totaxis; i++) {
      if (this.#_min[i as Number4] !== Number.MAX_SAFE_INTEGER) {
        return false;
      }
    }
    return true;
  }

  minmax_rect(_p: Vec2Like, _size: Vec2Like) {
    const p = _p as unknown as number[];
    const size = _size as unknown as number[];

    let totaxis = this.totaxis;
    const cs = this.#_static_mr_cs;
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
      this.minmax(cs[i] as [number, number, number?]);
    }
    return this;
  }
  minmax(_p: Vec2Like | [number, number, number?, number?]) {
    const p = _p as unknown as number[];
    const totaxis = this.totaxis;
    if (totaxis === 2) {
      const _mn = this.#_min;
      const mn = this.min;
      const _mx = this.#_max;
      const mx = this.max;
      const pv = p;
      _mn[0] = mn[0] = Math.min(_mn[0], pv[0]);
      _mn[1] = mn[1] = Math.min(_mn[1], pv[1]);
      _mx[0] = mx[0] = Math.max(_mx[0], pv[0]);
      _mx[1] = mx[1] = Math.max(_mx[1], pv[1]);
    } else if (totaxis === 3) {
      const _mn = this.#_min;
      const mn = this.min;
      const _mx = this.#_max;
      const mx = this.max;
      const pv = p;
      _mn[0] = mn[0] = Math.min(_mn[0], pv[0]);
      _mn[1] = mn[1] = Math.min(_mn[1], pv[1]);
      _mn[2] = mn[2] = Math.min(_mn[2], pv[2]);
      _mx[0] = mx[0] = Math.max(_mx[0], pv[0]);
      _mx[1] = mx[1] = Math.max(_mx[1], pv[1]);
      _mx[2] = mx[2] = Math.max(_mx[2], pv[2]);
    } else if (totaxis === 4) {
      const _mn = this.#_min;
      const mn = this.min;
      const _mx = this.#_max;
      const mx = this.max;
      const pv = p;
      _mn[0] = mn[0] = Math.min(_mn[0], pv[0]);
      _mn[1] = mn[1] = Math.min(_mn[1], pv[1]);
      _mn[2] = mn[2] = Math.min(_mn[2], pv[2]);
      _mn[3] = mn[3] = Math.min(_mn[3], pv[3]);
      _mx[0] = mx[0] = Math.max(_mx[0], pv[0]);
      _mx[1] = mx[1] = Math.max(_mx[1], pv[1]);
      _mx[2] = mx[2] = Math.max(_mx[2], pv[2]);
      _mx[3] = mx[3] = Math.max(_mx[3], pv[3]);
    }
  }
}

export function winding_axis(a: Vec3Like, b: Vec3Like, c: Vec3Like, up_axis: Number3): boolean {
  const xaxis = ((up_axis + 1) % 3) as Number3;
  const yaxis = ((up_axis + 2) % 3) as Number3;
  const x1 = a[xaxis];
  const y1 = a[yaxis];
  const x2 = b[xaxis];
  const y2 = b[yaxis];
  const x3 = c[xaxis];
  const y3 = c[yaxis];
  const dx1 = x1 - x2;
  const dy1 = y1 - y2;
  const dx2 = x3 - x2;
  const dy2 = y3 - y2;
  const f = dx1 * dy2 - dy1 * dx2;
  return f >= 0.0;
}
/** returns false if clockwise */ export function winding(
  a: Vec2Like,
  b: Vec2Like,
  c: Vec2Like,
  zero_z = false,
  tol = 0.0
): boolean {
  const dx1 = b[0] - a[0];
  const dy1 = b[1] - a[1];
  const dx2 = c[0] - a[0];
  const dy2 = c[1] - a[1];
  return dx1 * dy2 - dy1 * dx2 > tol;
}
export function inrect_2d(p: Vec2Like, pos: Vec2Like, size: Vec2Like): boolean {
  if (p === undefined || pos === undefined || size === undefined) {
    console.trace();
    console.log("Bad paramters to inrect_2d()");
    console.log("p: ", p, ", pos: ", pos, ", size: ", size);
    return false;
  }
  return p[0] >= pos[0] && p[0] <= pos[0] + size[0] && p[1] >= pos[1] && p[1] <= pos[1] + size[1];
}
const $ps_aabb_isect_line_2d = [new Vector2(), new Vector2(), new Vector2(), new Vector2()];
export function aabb_isect_line_2d(v1: Vec2Like, v2: Vec2Like, min: Vec2Like, max: Vec2Like): boolean {
  if (point_in_aabb_2d(v1, min, max) || point_in_aabb_2d(v2, min, max)) {
    return true;
  }
  const lines = $ps_aabb_isect_line_2d;
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
export function expand_rect2d(pos: Vec2Like, size: Vec2Like, margin: Vec2Like): void {
  pos[0] -= Math.floor(margin[0]);
  pos[1] -= Math.floor(margin[1]);
  size[0] += Math.floor(margin[0] * 2.0);
  size[1] += Math.floor(margin[1] * 2.0);
}
export function expand_line(l: [Vector3, Vector3], margin: number): [Vector3, Vector3] {
  const c = new Vector3();
  c.add(l[0]);
  c.add(l[1]);
  c.mulScalar(0.5);
  l[0].sub(c);
  l[1].sub(c);
  const l1 = l[0].vectorLength();
  const l2 = l[1].vectorLength();
  l[0].normalize();
  l[1].normalize();
  l[0].mulScalar(margin + l1);
  l[1].mulScalar(margin + l2);
  l[0].add(c);
  l[1].add(c);
  return l;
}
export function colinear(
  a: Vec2Like | Vec3Like,
  b: Vec2Like | Vec3Like,
  c: Vec2Like | Vec3Like,
  limit = 2.2e-16,
  distLimit = 0.00001 ** 2
): boolean {
  const t1 = _cross_vec1;
  const t2 = _cross_vec2;
  const t1arr = t1;
  const t2arr = t2;
  const aarr = a;
  const barr = b;
  const carr = c;
  const axes = a.length;
  for (let _i = 0; _i < axes; _i++) {
    let i = _i as Number2;
    t1arr[i] = barr[i] - aarr[i];
    t2arr[i] = carr[i] - aarr[i];
  }
  for (let i = axes; i < 3; i++) {
    t1arr[i] = t2arr[i] = 0.0;
  }
  if (t1.dot(t1) <= distLimit || t2.dot(t2) <= distLimit) {
    return true;
  }
  t1.normalize();
  t2.normalize();
  t1.cross(t2);
  return t1.dot(t1) <= limit;
}
export function colinear2d(a: Vec2Like, b: Vec2Like, c: Vec2Like, limit = 0.00001, precise = false): boolean {
  const dx1 = a[0] - b[0];
  const dy1 = a[1] - b[1];
  const dx2 = c[0] - b[0];
  const dy2 = c[1] - b[1];
  let det = Math.abs(dx1 * dy2 - dy1 * dx2);
  if (precise) {
    const len = (dx1 ** 2 + dy1 ** 2) ** 0.5 + (dx2 ** 2 + dy2 ** 2) ** 0.5;
    if (len <= 0.00001) {
      return true;
    }
    det /= len;
  }
  return det <= limit;
}

const line_line_isect_rects2 = util.cachering.fromConstructor(Vector2, 32);
const line_line_isect_rects3 = util.cachering.fromConstructor(Vector3, 32);
const line_line_isect_rects4 = util.cachering.fromConstructor(Vector4, 32);

const _tmps_cn = util.cachering.fromConstructor(Vector3, 64);
const _rets_cn = util.cachering.fromConstructor(Vector3, 64);
//vec1, vec2 should both be normalized
export function corner_normal(vec1: Vec3Like, vec2: Vec3Like, width: number): Vector3 {
  const ret = _rets_cn.next().zero();
  const vec = _tmps_cn.next().zero();
  vec.load(vec1).add(vec2).normalize();
  /*
  ret.load(vec).mulScalar(width);
  return ret;
  */ //handle colinear case
  if (Math.abs(vec1.normalizedDot(vec2)) > 0.9999) {
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
  const p1 = _tmps_cn.next().load(vec1);
  const p2 = _tmps_cn.next().load(vec2);
  vec1.addFac(vec1, 0.01);
  vec2.addFac(vec2, 0.01);
  const sc = 1.0;
  p1[0] += vec1[1] * sc;
  p1[1] += -vec1[0] * sc;
  p2[0] += -vec2[1] * sc;
  p2[1] += vec2[0] * sc;
  const p = line_line_isect(vec1, p1, vec2, p2, false);
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
export function line_line_isect<T extends Vec2Like | Vec3Like | Vec4Like>(
  v1: T,
  v2: T,
  v3: T,
  v4: T,
  test_segment = true
): T | typeof COLINEAR_ISECT | undefined {
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
  
  */ const xa1 = v1[0];
  const xa2 = v2[0];
  const ya1 = v1[1];
  const ya2 = v2[1];
  const xb1 = v3[0];
  const xb2 = v4[0];
  const yb1 = v3[1];
  const yb2 = v4[1];
  const div = (xa1 - xa2) * (yb1 - yb2) - (xb1 - xb2) * (ya1 - ya2);
  if (Math.abs(div) < 0.00000001) {
    //parallel but intersecting lines.
    return COLINEAR_ISECT;
  } else {
    //intersection exists
    const t1 = -((ya1 - yb2) * xb1 - (yb1 - yb2) * xa1 - (ya1 - yb1) * xb2) / div;

    if (v1.length === 2) {
      return line_line_isect_rects2
        .next()
        .load(v1 as Vec2Like)
        .interp(v2 as Vec2Like, t1) as unknown as T;
    } else if (v1.length === 3) {
      return line_line_isect_rects3
        .next()
        .load(v1 as Vec3Like)
        .interp(v2 as Vec3Like, t1) as unknown as T;
    } else if (v1.length === 4) {
      return line_line_isect_rects4
        .next()
        .load(v1 as Vec4Like)
        .interp(v2 as Vec4Like, t1) as unknown as T;
    }
  }
}
export function line_line_cross(a: Vec2Like, b: Vec2Like, c: Vec2Like, d: Vec2Like): boolean {
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
  //*/ const w1 = winding(a, b, c);
  const w2 = winding(c, a, d);
  const w3 = winding(a, b, d);
  const w4 = winding(c, b, d);
  return w1 === w2 && w3 === w4 && w1 !== w3;
}
const _asi_v1 = new Vector3();
const _asi_v2 = new Vector3();
const _asi_v3 = new Vector3();
const _asi_v4 = new Vector3();
const _asi_v5 = new Vector3();
const _asi_v6 = new Vector3();
export function point_in_aabb_2d(p: Vec2Like, min: Vec2Like, max: Vec2Like): boolean {
  return p[0] >= min[0] && p[0] <= max[0] && p[1] >= min[1] && p[1] <= max[1];
}
const _asi2d_v1 = new Vector2();
const _asi2d_v2 = new Vector2();
const _asi2d_v3 = new Vector2();
const _asi2d_v4 = new Vector2();
const _asi2d_v5 = new Vector2();
const _asi2d_v6 = new Vector2();
export function aabb_sphere_isect_2d(p: Vec2Like, r: number, min: Vec2Like, max: Vec2Like): boolean {
  const v1 = _asi2d_v1;
  const v2 = _asi2d_v2;
  const v3 = _asi2d_v3;
  const mvec = _asi2d_v4;
  const v4 = _asi2d_v5;
  const lp = _asi2d_v6.load(p);
  v1.load(lp);
  v2.load(lp);
  const lmin = _asi_v5.load2(min);
  const lmax = _asi_v6.load2(max);
  lmin[2] = lmax[2] = 0.0;
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
  */ //*
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
export function point_in_aabb(p: Vec3Like, min: Vec3Like, max: Vec3Like): boolean {
  return p[0] >= min[0] && p[0] <= max[0] && p[1] >= min[1] && p[1] <= max[1] && p[2] >= min[2] && p[2] <= max[2];
}
const asi_rect = new Array<Vector3>(8);
for (let i = 0; i < 8; i++) {
  asi_rect[i] = new Vector3();
}
const aabb_sphere_isect_vs = util.cachering.fromConstructor(Vector3, 64);
export function aabb_sphere_isect(
  p: Vec2Like | Vec3Like,
  r: number,
  min: Vec2Like | Vec3Like,
  max: Vec2Like | Vec3Like
): boolean {
  let lp;
  let lmin;
  let lmax;
  {
    const p1 = aabb_sphere_isect_vs.next().load(p as Vec3Like);
    const min1 = aabb_sphere_isect_vs.next().load(min as Vec3Like);
    const max1 = aabb_sphere_isect_vs.next().load(max as Vec3Like);
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
  const cent = aabb_sphere_isect_vs.next().load(lmin).interp(lmax, 0.5);
  lp.sub(cent);
  lmin.sub(cent);
  lmax.sub(cent);
  r *= r;
  const isect = point_in_aabb(lp, lmin, lmax);
  if (isect) {
    return true;
  }
  const rect = asi_rect;
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
  const p2 = aabb_sphere_isect_vs.next().load(lp);
  const p2arr = p2;
  const lparr = lp;
  const lminarr = lmin;
  const lmaxarr = lmax;
  for (let _i = 0; _i < 3; _i++) {
    let i = _i as Number3;
    p2.load(lp);
    const i2 = ((i + 1) % 3) as Number3;
    const i3 = ((i + 2) % 3) as Number3;
    p2arr[i] = p2arr[i] < 0.0 ? lminarr[i] : lmaxarr[i];
    p2arr[i2] = Math.min(Math.max(p2arr[i2], lminarr[i2]), lmaxarr[i2]);
    p2arr[i3] = Math.min(Math.max(p2arr[i3], lminarr[i3]), lmaxarr[i3]);
    const isect2 = p2.vectorDistanceSqr(lp) <= r;
    if (isect2) {
      return true;
    }
  }
  return false;
}
export function aabb_sphere_dist(p: Vec2Like | Vec3Like, min: Vec2Like | Vec3Like, max: Vec2Like | Vec3Like): number {
  let lp;
  let lmin;
  let lmax;
  {
    const p1 = aabb_sphere_isect_vs.next().load(p as Vec3Like);
    const min1 = aabb_sphere_isect_vs.next().load(min as Vec3Like);
    const max1 = aabb_sphere_isect_vs.next().load(max as Vec3Like);
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
  const cent = aabb_sphere_isect_vs.next().load(lmin).interp(lmax, 0.5);
  lp.sub(cent);
  lmin.sub(cent);
  lmax.sub(cent);
  const isect = point_in_aabb(lp, lmin, lmax);
  if (isect) {
    return 0.0;
  }
  const rect = asi_rect;
  rect[0].loadXYZ(lmin[0], lmin[1], lmin[2]);
  rect[1].loadXYZ(lmin[0], lmax[1], lmin[2]);
  rect[2].loadXYZ(lmax[0], lmax[1], lmin[2]);
  rect[3].loadXYZ(lmax[0], lmin[1], lmin[2]);
  rect[4].loadXYZ(lmin[0], lmin[1], lmax[2]);
  rect[5].loadXYZ(lmin[0], lmax[1], lmax[2]);
  rect[6].loadXYZ(lmax[0], lmax[1], lmax[2]);
  rect[7].loadXYZ(lmax[0], lmin[1], lmax[2]);
  let mindis;
  for (let i = 0; i < 8; i++) {
    const dis = lp.vectorDistanceSqr(rect[i]);
    if (mindis === undefined || dis < mindis) {
      mindis = dis;
    }
  }
  const p2 = aabb_sphere_isect_vs.next().load(lp);
  const p2arr = p2;
  const lparr = lp;
  const lminarr = lmin;
  const lmaxarr = lmax;
  for (let i = 0; i < 3; i++) {
    p2.load(lp);
    const i2 = (i + 1) % 3;
    const i3 = (i + 2) % 3;
    p2arr[i] = p2arr[i as Number3] < 0.0 ? lminarr[i as Number3] : lmaxarr[i as Number3];
    p2arr[i2] = Math.min(Math.max(p2arr[i2 as Number3], lminarr[i2 as Number3]), lmaxarr[i2 as Number3]);
    p2arr[i3] = Math.min(Math.max(p2arr[i3 as Number3], lminarr[i3 as Number3]), lmaxarr[i3 as Number3]);
    const dis = p2.vectorDistanceSqr(lp);
    if (mindis === undefined || dis < mindis) {
      mindis = dis;
    }
  }
  return mindis === undefined ? 1e17 : mindis;
}
export function point_in_tri(p: Vec2Like, v1: Vec2Like, v2: Vec2Like, v3: Vec2Like): boolean {
  const w1 = winding(p, v1, v2);
  const w2 = winding(p, v2, v3);
  const w3 = winding(p, v3, v1);
  return w1 === w2 && w2 === w3;
}
export function quadIsConvex(v1: Vec2Like, v2: Vec2Like, v3: Vec2Like, v4: Vec2Like): boolean {
  return line_line_cross(v1, v3, v2, v4);
}
const $e1_normal_tri = new Vector3();
const $e3_normal_tri = new Vector3();
const $e2_normal_tri = new Vector3();
export function isNum(f: any): boolean {
  let ok = typeof f === "number";
  ok = ok && !isNaN(f) && isFinite(f);
  return ok;
}
const _normal_tri_rets = util.cachering.fromConstructor(Vector3, 64);
export function normal_tri(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like): Vector3 {
  let x1 = v2[0] - v1[0];
  let y1 = v2[1] - v1[1];
  let z1 = v2[2] - v1[2];
  let x2 = v3[0] - v1[0];
  let y2 = v3[1] - v1[1];
  let z2 = v3[2] - v1[2];
  if (!isNum(x1 + y1 + z1 + z2 + y2 + z2)) {
    throw new Error("NaN in normal_tri");
  }
  let x3;
  let y3;
  let z3;
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
  const n = _normal_tri_rets.next();
  if (!isNum(x3 + y3 + z3)) {
    throw new Error("NaN!");
  }
  n[0] = x3;
  n[1] = y3;
  n[2] = z3;
  return n;
}
const $n2_normal_quad = new Vector3();
const _q1 = new Vector3();
const _q2 = new Vector3();
const _q3 = new Vector3();
export function normal_quad(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, v4: Vec3Like): Vector3 {
  _q1.load(normal_tri(v1, v2, v3));
  _q2.load(normal_tri(v2, v3, v4));
  _q1.add(_q2).normalize();
  return _q1;
}
export function normal_quad_old(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, v4: Vec3Like): Vector3 {
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
const _li_vi = new Vector3();
//calc_t is optional, false
export function line_isect<CALCT extends true | false | undefined>(
  v1: Vec2Like | Vec3Like,
  v2: Vec2Like | Vec3Like,
  v3: Vec2Like | Vec3Like,
  v4: Vec2Like | Vec3Like,
  calc_t?: CALCT
): CALCT extends true ? [Vector3, number, number] : [Vector3, number] {
  const div = (v2[0] - v1[0]) * (v4[1] - v3[1]) - (v2[1] - v1[1]) * (v4[0] - v3[0]);
  if (div === 0.0)
    return [new Vector3(), COLINEAR, 0.0] as CALCT extends true ? [Vector3, number, number] : [Vector3, number];
  const vi = _li_vi;
  vi[0] = 0;
  vi[1] = 0;
  vi[2] = 0;
  vi[0] = ((v3[0] - v4[0]) * (v1[0] * v2[1] - v1[1] * v2[0]) - (v1[0] - v2[0]) * (v3[0] * v4[1] - v3[1] * v4[0])) / div;
  vi[1] = ((v3[1] - v4[1]) * (v1[0] * v2[1] - v1[1] * v2[0]) - (v1[1] - v2[1]) * (v3[0] * v4[1] - v3[1] * v4[0])) / div;
  if (calc_t || v1.length === 3) {
    const n1 = new Vector2(v2).sub(v1);
    const n2 = new Vector2(vi).sub(v1);
    let t = n2.vectorLength() / n1.vectorLength();
    n1.normalize();
    n2.normalize();
    if (n1.dot(n2) < 0.0) {
      t = -t;
    }
    if (v1.length === 3) {
      vi[2] = v1[2]! + (v2[2]! - v1[2]!) * t;
    }
    return [vi, LINECROSS, t] as CALCT extends true ? [Vector3, number, number] : [Vector3, number];
  }
  return [vi, LINECROSS] as CALCT extends true ? [Vector3, number, number] : [Vector3, number];
}
const dt2l_v1 = new Vector2();
const dt2l_v2 = new Vector2();
const dt2l_v3 = new Vector2();
const dt2l_v4 = new Vector2();
const dt2l_v5 = new Vector2();
export function dist_to_line_2d(
  p: Vec2Like,
  v1: Vec2Like,
  v2: Vec2Like,
  clip = true,
  closest_co_out?: Vec2Like,
  t_out?: number
): number {
  const lv1 = dt2l_v4.load(v1);
  const lv2 = dt2l_v5.load(v2);
  const n = dt2l_v1;
  const vec = dt2l_v3;
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
const dt3l_v1 = new Vector3();
const dt3l_v2 = new Vector3();
const dt3l_v3 = new Vector3();
const dt3l_v4 = new Vector3();
const dt3l_v5 = new Vector3();
export function dist_to_line_sqr(p: Vec2Like, v1: Vec2Like, v2: Vec2Like, clip = true): number {
  const px = p[0] - v1[0];
  const py = p[1] - v1[1];
  let pz = p.length < 3 ? 0.0 : p[2]! - v1[2]!;
  pz = pz === undefined ? 0.0 : pz;
  let v2x = v2[0] - v1[0];
  let v2y = v2[1] - v1[1];
  let v2z = v2.length < 3 ? 0.0 : v2[2]! - v1[2]!;
  const len = v2x * v2x + v2y * v2y + v2z * v2z;
  if (len === 0.0) {
    return Math.sqrt(px * px + py * py + pz * pz);
  }
  const len2 = 1.0 / len;
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
export function dist_to_line(
  p: Vec2Like | Vec3Like,
  v1: Vec2Like | Vec3Like,
  v2: Vec2Like | Vec3Like,
  clip = true
): number {
  return Math.sqrt(dist_to_line_sqr(p, v1, v2, clip));
}
//p cam be 2d, 3d, or 4d point, v1/v2 however must be full homogenous coordinates
const _cplw_vs4 = util.cachering.fromConstructor(Vector4, 64);
const _cplw_vs3 = util.cachering.fromConstructor(Vector3, 64);
const _cplw_vs2 = util.cachering.fromConstructor(Vector2, 64);
function wclip(x1: number, x2: number, w1: number, w2: number, near: number): number {
  const r1 = near * w1 - x1;
  const r2 = (w1 - w2) * near - (x1 - x2);
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
 */ export function clip_line_w(_v1: Vec4Like, _v2: Vec4Like, znear: number, zfar: number): boolean {
  const v1 = _cplw_vs4.next().load(_v1);
  const v2 = _cplw_vs4.next().load(_v2);
  //are we fully behind the view plane?
  if (v1[2] < 1.0 && v2[2] < 1.0) return false;
  function doclip1(v1: Vec4Like, v2: Vec4Like, axis: Number4) {
    if (v1[axis] / v1[3] < -1) {
      const t = wclip(v1[axis], v2[axis], v1[3], v2[3], -1);
      v1.interp(v2, t);
    } else if (v1[axis] / v1[3] > 1) {
      const t = wclip(v1[axis], v2[axis], v1[3], v2[3], 1);
      v1.interp(v2, t);
    }
  }
  function doclip(v1: Vec4Like, v2: Vec4Like, axis: Number4) {
    doclip1(v1, v2, axis);
    doclip1(v2, v1, axis);
  }
  function dozclip(v1: Vec4Like, v2: Vec4Like) {
    if (v1[2] < 1) {
      const t = clip(v1[2], v2[2], 1);
      v1.interp(v2, t);
    } else if (v2[2] < 1) {
      const t = clip(v2[2], v1[2], 1);
      v2.interp(v1, t);
    }
  }
  dozclip(v1, v2);
  doclip(v1, v2, 0);
  doclip(v1, v2, 1);
  for (let i = 0; i < 4; i++) {
    _v1[i] = v1[i];
    _v2[i] = v2[i];
  }
  return !(v1[0] / v1[3] === v2[0] / v2[3] || v1[1] / v2[3] === v2[1] / v2[3]);
}
//clip is optional, true.  clip point to lie within line segment v1->v2
const _closest_point_on_line_cache = util.cachering.fromConstructor(Vector3, 64);
const _closest_point_rets = new util.cachering(function () {
  return [new Vector3(), 0];
}, 64);
const _closest_tmps = [new Vector3(), new Vector3(), new Vector3()];
export function closest_point_on_line(
  p: Vec3Like,
  v1: Vec3Like,
  v2: Vec3Like,
  clip = true
): [Vector3, number] | undefined {
  const l1 = _closest_tmps[0];
  const l2 = _closest_tmps[1];
  let len = 0;
  l1.load(v2).sub(v1);
  if (clip) {
    len = l1.vectorLength();
  }
  l1.normalize();
  l2.load(p).sub(v1);
  let t = l2.dot(l1);
  if (clip) {
    t = t < 0.0 ? 0.0 : t;
    t = t > len ? len : t;
  }
  const co = _closest_point_on_line_cache.next();
  co.load(l1).mulScalar(t).add(v1);
  const ret = _closest_point_rets.next();
  ret[0] = co;
  ret[1] = t;
  return ret as [Vector3, number];
}
/*given input line (a,d) and tangent t,
  returns a circle that goes through both
  a and d, whose normalized tangent at a is the same
  as normalized t.
  
  note that t need not be normalized, this function
  does that itself*/ const _circ_from_line_tan_vs = util.cachering.fromConstructor(Vector3, 32);
const _circ_from_line_tan_ret = new util.cachering(function () {
  return [new Vector3(), 0] as [Vector3, number];
}, 64);
export function circ_from_line_tan(a: Vec3Like, b: Vec3Like, t: Vec3Like): [Vector3, number] {
  const p1 = _circ_from_line_tan_vs.next();
  const t2 = _circ_from_line_tan_vs.next();
  const n1 = _circ_from_line_tan_vs.next();
  p1.load(a).sub(b);
  t2.load(t).normalize();
  n1.load(p1).normalize().cross(t2).cross(t2).normalize();
  const ax = p1[0];
  const ay = p1[1];
  const az = p1[2];
  const nx = n1[0];
  const ny = n1[1];
  const nz = n1[2];
  let r = -(ax * ax + ay * ay + az * az);
  const div = 2 * (ax * nx + ay * ny + az * nz);
  if (Math.abs(div) > 0.000001) {
    r /= div;
  } else {
    r = 1000000.0;
  }
  const ret = _circ_from_line_tan_ret.next();
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
const _circ_from_line_tan2d_vs = util.cachering.fromConstructor(Vector3, 32);
const _circ_from_line_tan2d_ret = new util.cachering(function () {
  return [new Vector2(), 0] as [Vector2, number];
}, 64);
export function circ_from_line_tan_2d(a: Vec2Like, b: Vec2Like, t: Vec2Like): [Vector2, number] | undefined {
  const la = _circ_from_line_tan2d_vs.next().load2(a);
  const lb = _circ_from_line_tan2d_vs.next().load2(b);
  const lt = _circ_from_line_tan2d_vs.next().load2(t);
  la[2] = lb[2] = lt[2] = 0.0;
  const p1 = _circ_from_line_tan2d_vs.next();
  const t2 = _circ_from_line_tan2d_vs.next();
  const n1 = _circ_from_line_tan2d_vs.next();
  p1.load(la).sub(lb);
  t2.load(lt).normalize();
  n1.load(p1).normalize().cross(t2).cross(t2).normalize();
  if (1) {
    let cx;
    let cy;
    let r;
    const x1 = la[0];
    const y1 = la[1];
    const x2 = lb[0];
    const y2 = lb[1];
    const tanx1 = lt[0];
    const tany1 = lt[1];
    const div = 4.0 * ((x1 - x2) * tany1 - (y1 - y2) * tanx1) ** 2;
    const div2 = 2.0 * (x1 - x2) * tany1 - 2.0 * (y1 - y2) * tanx1;
    if (Math.abs(div) < 0.0001 || Math.abs(div2) < 0.0001) {
      const ret = _circ_from_line_tan2d_ret.next();
      ret[0].load(la).interp(lb, 0.5);
      const dx = la[1] - lb[1];
      const dy = lb[0] - la[0];
      r = 1000000.0;
      ret[0][0] += dx * r;
      ret[0][1] += dy * r;
      ret[1] = r;
      return ret;
    }
    cx = (((x1 + x2) * (x1 - x2) - (y1 - y2) ** 2) * tany1 - 2.0 * (y1 - y2) * tanx1 * x1) / div2;
    cy = (-((y1 + y2) * (y1 - y2) - x2 ** 2 - (x1 - 2.0 * x2) * x1) * tanx1 + 2.0 * (x1 - x2) * tany1 * y1) / div2;
    r = (((y1 - y2) ** 2 + x2 ** 2 + (x1 - 2.0 * x2) * x1) ** 2 * (tanx1 ** 2 + tany1 ** 2)) / div;
    const midx = la[0] * 0.5 + lb[0] * 0.5;
    const midy = la[1] * 0.5 + lb[1] * 0.5;
    //mirror
    cx = 2.0 * midx - cx;
    cy = 2.0 * midy - cy;
    const ret = _circ_from_line_tan2d_ret.next();
    ret[0].loadXY(cx, cy);
    ret[1] = Math.sqrt(r);
    return ret;
  } else {
    const ax = p1[0];
    const ay = p1[1];
    const az = p1[2];
    const nx = n1[0];
    const ny = n1[1];
    const nz = n1[2];
    let r = -(ax * ax + ay * ay + az * az);
    const div = 2 * (ax * nx + ay * ny + az * nz);
    if (Math.abs(div) > 0.000001) {
      r /= div;
    } else {
      r = 1000000.0;
    }
    const ret = _circ_from_line_tan2d_ret.next();
    ret[0].load(n1).mulScalar(r).add(la);
    ret[1] = r;
    return ret;
  }
}
const _gtc_e1 = new Vector3();
const _gtc_e2 = new Vector3();
const _gtc_e3 = new Vector3();
const _gtc_p1 = new Vector3();
const _gtc_p2 = new Vector3();
const _gtc_v1 = new Vector3();
const _gtc_v2 = new Vector3();
const _gtc_p12 = new Vector3();
const _gtc_p22 = new Vector3();
const _get_tri_circ_ret = new util.cachering(function () {
  return [new Vector3(), 0] as [Vector3, number];
}, 64);
export function get_tri_circ(a: Vec3Like, b: Vec3Like, c: Vec3Like): [Vector3, number] {
  const v1 = _gtc_v1;
  const v2 = _gtc_v2;
  const e1 = _gtc_e1;
  const e2 = _gtc_e2;
  const e3 = _gtc_e3;
  const p1 = _gtc_p1;
  const p2 = _gtc_p2;
  const aarr = a;
  const barr = b;
  const carr = c;
  const e1arr = e1;
  const e2arr = e2;
  const e3arr = e3;
  const p1arr = p1;
  const p2arr = p2;
  const v1arr = v1;
  const v2arr = v2;
  for (let _i = 0; _i < 3; _i++) {
    let i = _i as Number3;
    e1arr[i] = barr[i] - aarr[i];
    e2arr[i] = carr[i] - barr[i];
    e3arr[i] = aarr[i] - carr[i];
  }
  for (let _i = 0; _i < 3; _i++) {
    let i = _i as Number3;
    p1arr[i] = (aarr[i] + barr[i]) * 0.5;
    p2arr[i] = (carr[i] + barr[i]) * 0.5;
  }
  e1.normalize();
  v1arr[0] = -e1[1];
  v1arr[1] = e1[0];
  v1arr[2] = e1[2];
  v2arr[0] = -e2[1];
  v2arr[1] = e2[0];
  v2arr[2] = e2[2];
  v1.normalize();
  v2.normalize();
  let cent;
  let type;
  const p12arr = _gtc_p12;
  const p22arr = _gtc_p22;
  for (let _i = 0; _i < 3; _i++) {
    let i = _i as Number3;
    p12arr[i] = p1[i] + v1[i];
    p22arr[i] = p2[i] + v2[i];
  }
  const isect = line_isect(p1, _gtc_p12, p2, _gtc_p22);
  cent = isect[0];
  type = isect[1];
  e1.load(a);
  e2.load(b);
  e3.load(c);
  let r = e1.sub(cent).vectorLength();
  if (r < feps) r = e2.sub(cent).vectorLength();
  if (r < feps) r = e3.sub(cent).vectorLength();
  const ret = _get_tri_circ_ret.next();
  ret[0] = cent;
  ret[1] = r;
  return ret;
}
export function gen_circle(m: any, origin: Vec3Like, r: number, stfeps: number): any[] {
  const pi = Math.PI;
  let f = -pi / 2;
  const df = (pi * 2) / stfeps;
  const verts = [] as Vec3Like[];
  for (let i = 0; i < stfeps; i++) {
    const x = origin[0] + r * Math.sin(f);
    const y = origin[1] + r * Math.cos(f);
    const v = m.make_vert(new Vector3([x, y, origin[2]]));
    verts.push(v);
    f += df;
  }
  for (let i = 0; i < verts.length; i++) {
    const v1 = verts[i];
    const v2 = verts[(i + 1) % verts.length];
    m.make_edge(v1, v2);
  }
  return verts;
}
const cos = Math.cos;
const sin = Math.sin;
//axis is optional, 0
export function rot2d(v1: Vec2Like | Vec3Like, A: number, axis?: number): void {
  const x = v1[0];
  const y = v1[1];
  if (axis === 1) {
    v1[0] = x * cos(A) + y * sin(A);
    v1[2] = y * cos(A) - x * sin(A);
  } else {
    v1[0] = x * cos(A) - y * sin(A);
    v1[1] = y * cos(A) + x * sin(A);
  }
}
/** @deprecated */
export function makeCircleMesh(gl: any, radius: number, stfeps: number): any {
  const Mesh = (globalThis as any).Mesh;
  const mesh = new Mesh();
  const verts1 = gen_circle(mesh, new Vector3(), radius, stfeps);
  const verts2 = gen_circle(mesh, new Vector3(), radius / 1.75, stfeps);
  mesh.make_face_complex([verts1, verts2]);
  return mesh;
}
export function minmax_verts(verts: any[]): [Vector3, Vector3] {
  const min = new Vector3([1000000000000.0, 1000000000000.0, 1000000000000.0]);
  const max = new Vector3([-1000000000000.0, -1000000000000.0, -1000000000000.0]);
  for (const v of verts) {
    for (let _i = 0; _i < 3; _i++) {
      let i = _i as Number3;
      min[i] = Math.min(min[i], v.co[i]);
      max[i] = Math.max(max[i], v.co[i]);
    }
  }
  return [min, max];
}
export function unproject(vec: Vec3Like, ipers: Matrix4, iview: Matrix4): Vector3 {
  const newvec = new Vector3(vec);
  newvec.multVecMatrix(ipers);
  newvec.multVecMatrix(iview);
  return newvec;
}
export function project(vec: Vec3Like, pers: Matrix4, view: Matrix4): Vector3 {
  const newvec = new Vector3(vec);
  newvec.multVecMatrix(pers);
  newvec.multVecMatrix(view);
  return newvec;
}
const _sh_minv = new Vector3();
const _sh_maxv = new Vector3();
const _sh_start = [];
const _sh_end = [];
const static_cent_gbw = new Vector3();
export function get_boundary_winding(points: Vec3Like[]): boolean {
  const cent = static_cent_gbw.zero();
  if (points.length === 0) return false;
  for (let i = 0; i < points.length; i++) {
    cent.add(points[i]);
  }
  cent.divScalar(points.length);
  let w = 0;
  let totw = 0;
  for (let i = 0; i < points.length; i++) {
    const v1 = points[i];
    const v2 = points[(i + 1) % points.length];
    if (!colinear(v1, v2, cent)) {
      w += winding(v1, v2, cent) ? 1 : 0;
      totw += 1;
    }
  }
  if (totw > 0) w /= totw;
  return Math.round(w) === 1;
}
export class PlaneOps {
  axis: [Number3, Number3, Number3];

  constructor(normal: Vec3Like) {
    const no = normal;
    this.axis = [0, 1, 2];
    this.reset_axis(normal);
  }
  reset_axis(no: Vec3Like): void {
    let ax: Number3;
    let ay: Number3;
    let az: Number3;
    const nx = Math.abs(no[0]);
    const ny = Math.abs(no[1]);
    const nz = Math.abs(no[2]);
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
  /** @deprecated use quadIsConvex */
  convex_quad(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, v4: Vec3Like): boolean {
    return this.quadIsConvex(v1, v2, v3, v4);
  }
  quadIsConvex(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, v4: Vec3Like): boolean {
    const ax = this.axis;
    v1 = new Vector3([v1[ax[0]], v1[ax[1]], v1[ax[2]]]);
    v2 = new Vector3([v2[ax[0]], v2[ax[1]], v2[ax[2]]]);
    v3 = new Vector3([v3[ax[0]], v3[ax[1]], v3[ax[2]]]);
    v4 = new Vector3([v4[ax[0]], v4[ax[1]], v4[ax[2]]]);
    return quadIsConvex(v1, v2, v3, v4);
  }
  line_isect(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like, v4: Vec3Like): [Vector3, number, number?] {
    const ax = this.axis;
    const orig1 = v1;
    const orig2 = v2;
    v1 = new Vector3([v1[ax[0]], v1[ax[1]], v1[ax[2]]]);
    v2 = new Vector3([v2[ax[0]], v2[ax[1]], v2[ax[2]]]);
    v3 = new Vector3([v3[ax[0]], v3[ax[1]], v3[ax[2]]]);
    v4 = new Vector3([v4[ax[0]], v4[ax[1]], v4[ax[2]]]);
    const ret = line_isect(v1, v2, v3, v4, true);
    const vi = ret[0];
    if (ret[1] === LINECROSS) {
      ret[0].load(orig2).sub(orig1).mulScalar(ret[2]).add(orig1);
    }
    return ret;
  }
  line_line_cross(l1: [Vec3Like, Vec3Like], l2: [Vec3Like, Vec3Like]): boolean {
    const ax = this.axis;
    let v1 = l1[0];
    let v2 = l1[1];
    let v3 = l2[0];
    let v4 = l2[1];
    v1 = new Vector3([v1[ax[0]], v1[ax[1]], 0.0]);
    v2 = new Vector3([v2[ax[0]], v2[ax[1]], 0.0]);
    v3 = new Vector3([v3[ax[0]], v3[ax[1]], 0.0]);
    v4 = new Vector3([v4[ax[0]], v4[ax[1]], 0.0]);
    return line_line_cross(v1, v2, v3, v4);
  }
  winding(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like): boolean {
    const ax = this.axis;
    if (v1 === undefined) console.trace();
    v1 = new Vector3([v1[ax[0]], v1[ax[1]], 0.0]);
    v2 = new Vector3([v2[ax[0]], v2[ax[1]], 0.0]);
    v3 = new Vector3([v3[ax[0]], v3[ax[1]], 0.0]);
    return winding(v1, v2, v3);
  }
  colinear(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like): boolean {
    const ax = this.axis;
    v1 = new Vector3([v1[ax[0]], v1[ax[1]], 0.0]);
    v2 = new Vector3([v2[ax[0]], v2[ax[1]], 0.0]);
    v3 = new Vector3([v3[ax[0]], v3[ax[1]], 0.0]);
    return colinear(v1, v2, v3);
  }
  get_boundary_winding(points: Vec3Like[]): boolean {
    const ax = this.axis;
    const cent = new Vector3();
    if (points.length === 0) return false;
    for (let i = 0; i < points.length; i++) {
      cent.add(points[i]);
    }
    cent.divScalar(points.length);
    let w = 0;
    let totw = 0;
    for (let i = 0; i < points.length; i++) {
      const v1 = points[i];
      const v2 = points[(i + 1) % points.length];
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

* */ const _isrp_ret = new Vector3();
const isect_ray_plane_rets = util.cachering.fromConstructor(Vector3, 256);
export function isect_ray_plane(
  planeorigin: Vec3Like,
  planenormal: Vec3Like,
  rayorigin: Vec3Like,
  raynormal: Vec3Like
): Vector3 | undefined {
  const po = planeorigin;
  const pn = planenormal;
  const ro = rayorigin;
  const rn = raynormal;
  const div = pn[1] * rn[1] + pn[2] * rn[2] + pn[0] * rn[0];
  if (Math.abs(div) < 0.000001) {
    return undefined;
  }
  const t = ((po[1] - ro[1]) * pn[1] + (po[2] - ro[2]) * pn[2] + (po[0] - ro[0]) * pn[0]) / div;
  _isrp_ret.load(ro).addFac(rn, t);
  return isect_ray_plane_rets.next().load(_isrp_ret);
}
export function _old_isect_ray_plane(
  planeorigin: Vec3Like,
  planenormal: Vec3Like,
  rayorigin: Vec3Like,
  raynormal: Vec3Like
): Vector3 {
  const p = planeorigin;
  const n = planenormal;
  const r = rayorigin;
  const v = raynormal;
  const d = p.vectorLength();
  const t = -(r.dot(n) - p.dot(n)) / v.dot(n);
  _isrp_ret.load(v);
  _isrp_ret.mulScalar(t);
  _isrp_ret.add(r);
  return _isrp_ret;
}
export class Mat4Stack {
  stack: Matrix4[];
  matrix: Matrix4;
  update_func?: () => void;

  constructor() {
    this.stack = [];
    this.matrix = new Matrix4();
    this.matrix.makeIdentity();
    this.update_func = undefined;
  }
  set_internal_matrix(mat: Matrix4, update_func?: () => void): void {
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
    this.matrix.makeIdentity();
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
    const mat = this.stack.pop()!;
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

*/ const tril_rets = util.cachering.fromConstructor(Vector3, 128);
function lreport(..._args: any[]): void {
  //console.log(...arguments);
}
export function trilinear_v3(uvw: Vec3Like, boxverts: Vec3Like[]): Vector3 {
  const [u, v, w] = uvw;
  const a1x = boxverts[0][0];
  const a1y = boxverts[0][1];
  const a1z = boxverts[0][2];
  const b1x = boxverts[1][0] - a1x;
  const b1y = boxverts[1][1] - a1y;
  const b1z = boxverts[1][2] - a1z;
  const c1x = boxverts[2][0] - a1x;
  const c1y = boxverts[2][1] - a1y;
  const c1z = boxverts[2][2] - a1z;
  const d1x = boxverts[3][0] - a1x;
  const d1y = boxverts[3][1] - a1y;
  const d1z = boxverts[3][2] - a1z;
  const a2x = boxverts[4][0] - a1x;
  const a2y = boxverts[4][1] - a1y;
  const a2z = boxverts[4][2] - a1z;
  const b2x = boxverts[5][0] - a1x;
  const b2y = boxverts[5][1] - a1y;
  const b2z = boxverts[5][2] - a1z;
  const c2x = boxverts[6][0] - a1x;
  const c2y = boxverts[6][1] - a1y;
  const c2z = boxverts[6][2] - a1z;
  const d2x = boxverts[7][0] - a1x;
  const d2y = boxverts[7][1] - a1y;
  const d2z = boxverts[7][2] - a1z;
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
  const p = tril_rets.next();
  p[0] = x + a1x;
  p[1] = y + a1y;
  p[2] = z + a1z;
  return p;
}
const tril_co_rets = util.cachering.fromConstructor(Vector3, 128);
const tril_co_tmps = util.cachering.fromConstructor(Vector3, 16);
const tril_mat_1 = new Matrix4();
const tril_mat_2 = new Matrix4();
const wtable = [
  [
    [0.5, 0.5, 0],
    [0.5, 0.5, 0],
    [0.5, 0.5, 0],
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
const pih_tmps = util.cachering.fromConstructor(Vector3, 16);
const boxfaces_table = [
  [0, 1, 2, 3],
  [7, 6, 5, 4],
  [0, 4, 5, 1],
  [1, 5, 6, 2],
  [2, 6, 7, 3],
  [3, 7, 4, 0],
];
const boxfaces_tmp = new Array<Vector3>(6);
for (let i = 0; i < 6; i++) {
  boxfaces_tmp[i] = new Vector3();
}
const boxfacenormals_tmp = new Array<Vector3>(6);
for (let i = 0; i < 6; i++) {
  boxfacenormals_tmp[i] = new Vector3();
}
export function point_in_hex(
  p: Vec3Like,
  boxverts: Vec3Like[],
  boxfacecents?: Vec3Like[],
  boxfacenormals?: Vec3Like[]
): boolean {
  if (!boxfacecents) {
    boxfacecents = boxfaces_tmp;
    for (let i = 0; i < 6; i++) {
      let [a, b, c, d] = boxfaces_table[i];
      const v1 = boxverts[a];
      const v2 = boxverts[b];
      const v3 = boxverts[c];
      const v4 = boxverts[d];
      boxfacecents[i].load(v1).add(v2).add(v3).add(v4).mulScalar(0.25);
    }
  }
  if (!boxfacenormals) {
    boxfacenormals = boxfacenormals_tmp;
    for (let i = 0; i < 6; i++) {
      let [a, b, c, d] = boxfaces_table[i];
      const v1 = boxverts[a];
      const v2 = boxverts[b];
      const v3 = boxverts[c];
      const v4 = boxverts[d];
      const n = normal_quad(v1, v2, v3, v4);
      boxfacenormals[i].load(n).negate();
    }
  }
  const t1 = pih_tmps.next();
  const t2 = pih_tmps.next();
  const cent = pih_tmps.next().zero();
  for (let i = 0; i < 6; i++) {
    cent.add(boxfacecents[i]);
  }
  cent.mulScalar(1.0 / 6.0);
  const ret = true;
  for (let i = 0; i < 6; i++) {
    t1.load(p).sub(boxfacecents[i]);
    t2.load(cent).sub(boxfacecents[i]);
    const n = boxfacenormals[i];
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
const boxverts_tmp = new Array<Vector3>(8);
for (let i = 0; i < 8; i++) {
  boxverts_tmp[i] = new Vector3();
}
export function trilinear_co(p: Vec3Like, boxverts: Vec3Like[]): Vector3 {
  const uvw = tril_co_rets.next();
  uvw.zero();
  const u = tril_co_tmps.next();
  const v = tril_co_tmps.next();
  const w = tril_co_tmps.next();
  u.loadXYZ(0.0, 0.5, 1.0);
  v.loadXYZ(0.0, 0.5, 1.0);
  w.loadXYZ(0.0, 0.5, 1.0);
  const uvw2 = tril_co_tmps.next();
  for (let step = 0; step < 4; step++) {
    uvw.loadXYZ(u[1], v[1], w[1]);
    let mini = undefined;
    let mindis = trilinear_v3(uvw, boxverts).vectorDistanceSqr(p);
    for (let i = 0; i < 8; i++) {
      const [t1, t2, t3] = wtable[i];
      const u2 = t1[0] * u[0] + t1[1] * u[1] + t1[2] * u[2];
      const v2 = t2[0] * v[0] + t2[1] * v[1] + t2[2] * v[2];
      const w2 = t3[0] * w[0] + t3[1] * w[1] + t3[2] * w[2];
      const du = Math.abs(u2 - u[1]);
      const dv = Math.abs(v2 - v[1]);
      const dw = Math.abs(w2 - w[1]);
      uvw.loadXYZ(u2, v2, w2);
      const dis = trilinear_v3(uvw, boxverts).vectorDistanceSqr(p);
      if (mindis === undefined || dis < mindis) {
        //mindis = dis;
        //mini = i;
      }
      if (1) {
        const bv = boxverts_tmp;
        /*
        let dd = 1.0 - 0.001;

        du *= dd;
        dv *= dd;
        dw *= dd;
        //*/ bv[0].loadXYZ(u2 - du, v2 - dv, w2 - dw);
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
          break;
        }
        //console.log("\n");
      }
    }
    if (mini === undefined) {
      lreport("mindis:", (mindis ** 0.5).toFixed(3));
      break;
    }
    const [t1, t2, t3] = wtable[mini];
    const u2 = t1[0] * u[0] + t1[1] * u[1] + t1[2] * u[2];
    const v2 = t2[0] * v[0] + t2[1] * v[1] + t2[2] * v[2];
    const w2 = t3[0] * w[0] + t3[1] * w[1] + t3[2] * w[2];
    const du = Math.abs(u2 - u[1]);
    const dv = Math.abs(v2 - v[1]);
    const dw = Math.abs(w2 - w[1]);
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
export function trilinear_co2(p: Vec3Like, boxverts: Vec3Like[], uvw: Vec3Like): Vector3 {
  //let uvw = tril_co_rets.next();
  const grad = tril_co_tmps.next();
  const parr = p;
  const uvwarr = uvw;
  const gradarr = grad;
  //uvw[0] = uvw[1] = uvw[2] = 0.5;
  const df = 0.00001;
  const mat = tril_mat_1;
  const m = mat.$matrix;
  const mat2 = tril_mat_2;
  const r1 = tril_co_tmps.next();
  const r1arr = r1;
  for (let step = 0; step < 55; step++) {
    //let r1 = trilinear_v3(uvw, boxverts).vectorDistance(p);
    let totg = 0;
    for (let _i = 0; _i < 3; _i++) {
      let axis_error = 0.0;
      let i = _i as Number3;
      if (uvwarr[i] < 0) {
        axis_error = -uvwarr[i];
      } else if (uvwarr[i] > 1.0) {
        axis_error = uvwarr[i] - 1.0;
      }
      //r1[i] = trilinear_v3(uvw, boxverts)[i] - p[i];
      r1arr[i] = trilinear_v3(uvw, boxverts).vectorDistance(p) + 10.0 * axis_error;
      const orig = uvwarr[i];
      uvwarr[i] += df;
      //let r2 = trilinear_v3(uvw, boxverts)[i] - p[i];
      if (uvwarr[i] < 0) {
        axis_error = -uvwarr[i];
      } else if (uvwarr[i] > 1.0) {
        axis_error = uvwarr[i] - 1.0;
      } else {
        axis_error = 0.0;
      }
      const r2 = trilinear_v3(uvw, boxverts).vectorDistance(p) + 10.0 * axis_error;
      uvwarr[i] = orig;
      gradarr[i] = (r2 - r1arr[i]) / df;
      totg += gradarr[i] ** 2;
    }
    if (totg === 0.0) {
      break;
    }
    const err = trilinear_v3(uvw, boxverts).vectorDistance(p);
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
  return uvw as Vector3;
}
const angle_tri_v3_rets = util.cachering.fromConstructor(Vector3, 32);
const angle_tri_v3_vs = util.cachering.fromConstructor(Vector3, 32);
export function tri_angles(v1: Vec3Like, v2: Vec3Like, v3: Vec3Like): Vector3 {
  const t1 = angle_tri_v3_vs
    .next()
    .load(v1)
    .sub(v2 as Vector3);
  const t2 = angle_tri_v3_vs
    .next()
    .load(v3)
    .sub(v2 as Vector3);
  const t3 = angle_tri_v3_vs
    .next()
    .load(v2)
    .sub(v3 as Vector3);
  t1.normalize();
  t2.normalize();
  t3.normalize();
  const th1 = Math.acos(t1.dot(t2) * 0.99999);
  t2.negate();
  const th2 = Math.acos(t2.dot(t3) * 0.99999);
  const th3 = Math.PI - (th1 + th2);
  const ret = angle_tri_v3_rets.next();
  ret[0] = th1;
  ret[1] = th2;
  ret[2] = th3;
  return ret;
}
const angle_v2_temps = util.cachering.fromConstructor(Vector2, 32);
const angle_v3_temps = util.cachering.fromConstructor(Vector3, 32);
export function angle_between_vecs(
  v1: Vec2Like | Vec3Like,
  vcent: Vec2Like | Vec3Like,
  v2: Vec2Like | Vec3Like
): number {
  let t1;
  let t2;
  if (v1.length === 2) {
    t1 = angle_v2_temps.next().load(v1).sub(vcent).normalize();
    t2 = angle_v2_temps.next().load(v2).sub(vcent).normalize();
  } else {
    t1 = angle_v3_temps
      .next()
      .load(v1 as Vec3Like)
      .sub(vcent as Vec3Like)
      .normalize();
    t2 = angle_v3_temps
      .next()
      .load(v2 as Vec3Like)
      .sub(vcent as Vec3Like)
      .normalize();
  }
  const d = t1.dot(t2 as Vec3Like);
  /* Handle numerical error. */ if (d < -1.0) {
    return Math.PI;
  } else if (d > 1.0) {
    return 0.0;
  } else {
    return Math.acos(d);
  }
}
