import { Vector3, BaseVector, Vector2, Matrix4, IVectorOrHigher } from "./vectormath";

export declare function colinear(
  a: BaseVector,
  b: BaseVector,
  c: BaseVector,
  limit?: number,
  distLimit?: number
): boolean;

export declare function aabb_sphere_isect(p: Vector3, r: number, min: Vector3, max: Vector3): boolean;
export declare function trilinear_co(p: Vector3, boxverts: Vector3[]): Vector3;
export declare function trilinear_v3(uvw: Vector3, boxverts: Vector3[]): Vector3;
export declare function point_in_hex(
  p: Vector3,
  boxverts: Vector3[],
  boxfacecents?: Vector3[],
  boxfacenormals?: Vector3[]
): boolean;

export declare function closest_point_on_line(p: Vector3, v1: Vector3, v2: Vector3, clip?: boolean): [Vector3, number];

export declare function aabb_isect_line_2d(a: Vector2, b: Vector2, min: Vector2, max: Vector2): boolean;

export declare function colinear2d(a: Vector2, b: Vector2, c: Vector2, limit?: number, distLimit?: number): boolean;

/** returns false if clockwise */
export declare function winding(a: BaseVector, b: BaseVector, c: BaseVector, zero_z?: boolean, tol?: number): boolean;

export declare function tri_area(a: BaseVector, b: BaseVector, c: BaseVector): number;

export declare function point_in_tri(p: BaseVector, a: BaseVector, b: BaseVector, c: BaseVector): number;

export declare function normal_tri(a: Vector3, b: Vector3, c: Vector3): Vector3;

export declare function normal_quad(a: Vector3, b: Vector3, c: Vector3, d: Vector3): Vector3;

export declare function dihedral_v3_sqr(a: Vector3, b: Vector3, c: Vector3, d: Vector3): number;

export declare function normal_poly(vs: Vector3[]): Vector3;

export declare function line_line_isect<VectorType extends BaseVector>(
  l1: VectorType,
  l2: VectorType,
  l3: VectorType,
  l4: VectorType,
  test_segment?: boolean
): VectorType | number;

export declare function line_line_cross(a: BaseVector, b: BaseVector, c: BaseVector, d: BaseVector): boolean;

export declare const COLINEAR_ISECT: number;

export declare function dist_to_line_2d(
  p: Vector2,
  v1: Vector2,
  v2: Vector2,
  clip?: boolean,
  closest_co_out?: Vector3,
  t_out?: [number]
): number;

export declare function calc_projection_axes(no: Vector3): [number, number];
export declare function barycentric_v2(
  a: IVectorOrHigher<2>,
  b: IVectorOrHigher<2>,
  c: IVectorOrHigher<2>,
  d: IVectorOrHigher<2>,
  axis1?,
  axis2?
): Vector2;

export declare function dist_to_tri_v3(
  p: IVectorOrHigher<3>,
  a: IVectorOrHigher<3>,
  b: IVectorOrHigher<3>,
  c: IVectorOrHigher<3>,
  no?: IVectorOrHigher<3>
): number;

export function isect_ray_plane(
  planeorigin: IVectorOrHigher<3>,
  planenormal: IVectorOrHigher<3>,
  rayorigin: IVectorOrHigher<3>,
  raynormal: IVectorOrHigher<3>
);
