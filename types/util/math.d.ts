import {Vector3, BaseVector, Vector2, Matrix4} from "./vectormath";

export declare function colinear(a: BaseVector, b: BaseVector, c: BaseVector, limit?: number, distLimit?: number): boolean;

export declare function winding(a: BaseVector, b: BaseVector, c: BaseVector, zero_z?: boolean, tol?: number): boolean;

export declare function tri_area(a: BaseVector, b: BaseVector, c: BaseVector): number;

export declare function normal_tri(a: Vector3, b: Vector3, c: Vector3): Vector3;

export declare function normal_quad(a: Vector3, b: Vector3, c: Vector3, d: Vector3): Vector3;

export declare function dihedral_v3_sqr(a: Vector3, b: Vector3, c: Vector3, d: Vector3): number;

export declare function normal_poly(vs: Vector3[]): Vector3;

export declare function line_line_isect<VectorType extends BaseVector>(l1: VectorType, l2: VectorType, l3: VectorType, l4: VectorType, test_segment?: boolean): VectorType | number;

export declare const COLINEAR_ISECT: number;

export declare function dist_to_line_2d(p: Vector2, v1: Vector2, v2: Vector2, clip?: boolean, closest_co_out: Vector3, t_out: [number]): number;
