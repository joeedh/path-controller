import {Vector3, BaseVector, Vector2, Matrix4} from "./vectormath";

export declare function colinear(a: BaseVector, b: BaseVector, c: BaseVector, limit?: number, distLimit?: number): boolean;

export declare function winding(a: BaseVector, b: BaseVector, c: BaseVector, zero_z?: boolean, tol?: number): boolean;

export declare function tri_area(a: BaseVector, b: BaseVector, c: BaseVector): boolean;

export declare function normal_tri(a: Vector3, b: Vector3, c: Vector3): Vector3;

export declare function normal_quad(a: Vector3, b: Vector3, c: Vector3, d: Vector3): Vector3;
