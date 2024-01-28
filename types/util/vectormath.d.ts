export enum EulerOrders {
  XYZ = 0,
  XZY = 1,
  YXZ = 2,
  YZX = 3,
  ZXY = 4,
  ZYX = 5
}

export declare class Matrix4Data {
  m11: number;
  m12: number;
  m13: number;
  m14: number;

  m21: number;
  m22: number;
  m23: number;
  m24: number;

  m31: number;
  m32: number;
  m33: number;
  m34: number;

  m41: number;
  m42: number;
  m43: number;
  m44: number;
}

export declare class Matrix4 {
  constructor(existing?: Matrix4);

  $matrix: Matrix4Data

  decompose(loc: Vector3, rot: Vector3, scale: Vector3): this;

  copyColumnTo(i: number, vec: BaseVector): this

  invert(): this;

  multiply(b: Matrix4): this;

  preMultiply(b: Matrix4): this;

  load(b: Matrix4): this;

  translate(x: number, y: number, z: number): this;

  scale(x: number, y: number, z: number): this;

  euler_rotate(x: number, y: number, z: number): this;

  euler_rotate_order(x: number, y: number, z: number, rotOrder: EulerOrders): this;

  makeIdentity(): this;

  makeRotationOnly(): this;

  makeNormalMatrix(n: Vector3, up?: Vector3): this;

  transpose(): this;

  getAsArray(): number[];

  perspective(fovy: number, aspect: number, near: number, far: number): this;

  orthographic(scale: number, aspect: number, near: number, far: number): this;

  lookat(pos: Vector3, target: Vector3, up: Vector3): this;

  isPersp: boolean;

  setUniform(gl: WebGLRenderingContextBase, loc: WebGLUniformLocation);
}

declare interface IOpenNumVector {
  [k: number]: number;

  length: number;
}

type indexUnions = { 0: never, 1: 0, 2: 0 | 1, 3: 0 | 1 | 2, 4: 0 | 1 | 2 | 3 };
type strNumMap = { "0": 0, "1": 1, "2": 2, "3": 3, "4": 4 };

declare type INumVectorLimited<LEN extends 0 | 1 | 2 | 3 | 4> = {
  [P: number]: never,
  0: LEN extends 1 | 2 | 3 | 4 ? number : never,
  1: LEN extends 2 | 3 | 4 ? number : never,
  2: LEN extends 3 | 4 ? number : never,
  3: LEN extends 4 ? number : never,
  length: LEN
};

declare type INumVector =
    IOpenNumVector
    | INumVectorLimited<0>
    | INumVectorLimited<1>
    | INumVectorLimited<2>
    | INumVectorLimited<3>

type numlits = { 2: 2 | 3 | 4, 3: 3 | 4, 4: 4 }
type NumLitHigher<L extends 2 | 3 | 4> = numlits[L]
type IndexUnion<L extends 2 | 3 | 4> = indexUnions[L]

//type indexUnions = { 2: 0 | 1, 3: 0 | 1 | 2, 4: 0 | 1 | 2 | 3 };

declare type Number1 = 0
declare type Number2 = 0 | 1
declare type Number3 = 0 | 1 | 2
declare type Number4 = 0 | 1 | 2 | 3
declare type Number5 = 0 | 1 | 2 | 3 | 4

declare interface IBaseVector<LEN, ArrayType = Array<number>> extends ArrayType {
  constructor(existing?: this | INumVector | IBaseVector<NumLitHigher<LEN>>);

  //[P: P extends indexUnions[LEN] ? number : never]: P extends IndexUnion<LEN> ? number : never;

  length: LEN;

  [P: number]: never;

  0: LEN extends 1 | 2 | 3 | 4 ? number : never
  1: LEN extends 2 | 3 | 4 ? number : never
  2: LEN extends 3 | 4 ? number : never
  3: LEN extends 4 ? number : never

  [Symbol.iterator](): Iterator<number>;

  sinterp(b: IBaseVector<NumLitHigher<LEN>>, t: number): this;

  perpSwap(axis1?: number, axis2?: number, sign?: number): this;

  //all math operates in-place, no new objects
  load(b: IBaseVector<NumLitHigher<LEN>> | INumVector): this;

  loadXY(x: number, y: number): this;

  copy(): this;

  add(b: IBaseVector<NumLitHigher<LEN>>): this;

  sub(b: IBaseVector<NumLitHigher<LEN>>): this;

  mul(b: IBaseVector<NumLitHigher<LEN>>): this;

  div(b: IBaseVector<NumLitHigher<LEN>>): this;

  addScalar(b: number): this;

  subScalar(b: number): this;

  mulScalar(b: number): this;

  divScalar(b: number): this;

  min(b: IBaseVector<NumLitHigher<LEN>>): this;

  max(b: IBaseVector<NumLitHigher<LEN>>): this;

  floor(): this;

  fract(): this;

  ceil(): this;

  abs(): this;

  dot(b: IBaseVector<NumLitHigher<LEN>>): number;

  normalize(): this;

  vectorLength(): number;

  vectorLengthSqr(): number;

  vectorDistance(b: IBaseVector<NumLitHigher<LEN>>): number;

  vectorDistanceSqr(b: IBaseVector<NumLitHigher<LEN>>): number;

  multVecMatrix(mat: Matrix4): void;

  interp(b: IBaseVector<NumLitHigher<LEN>>, fac: number): this;

  addFac(b: IBaseVector<NumLitHigher<LEN>>, fac: number): this;

  rot2d(th: number, axis?: number | undefined): this;

  zero(): this;

  negate(): this;

  swapAxes(axis1: number, axis2: number): this;
}

export declare type IVectorOrHigher<LEN extends 2 | 3 | 4, Type = never> = Type | IBaseVector<NumLitHigher<LEN>>

export declare interface IVector2 extends IBaseVector<2> {
}

export declare interface IVector3 extends IBaseVector<3> {
  loadXYZ(x: number, y: number, z: number): this;

  cross(b: IVectorOrHigher<3>): this;
}

export declare interface IVector4 extends IBaseVector<4> {
  loadXYZ(x: number, y: number, z: number): this;

  loadXYZW(x: number, y: number, z: number, w: number): this;

  cross(b: IVectorOrHigher<4>): this;
}

export declare interface IQuat extends IBaseVector<4> {
  axisAngleToQuat(axis: Vector3, angle: number): this;

  toMatrix(output?: Matrix4): Matrix4;
}

export declare interface IVectorConstructor<Type, LEN = 3> {
  new(value?: number[] | Type): Type;

  /** |(a - center)| dot |(b - center)| */
  normalizedDot3(a: IVectorOrHigher<LEN, Type>, center: IVectorOrHigher<LEN, Type>, b: IVectorOrHigher<LEN, Type>): number;

  /** |(b - a)| dot |(d - c)| */
  normalizedDot4(a: IVectorOrHigher<LEN, Type>, b: IVectorOrHigher<LEN, Type>, c: IVectorOrHigher<LEN, Type>, d: IVectorOrHigher<LEN, Type>): number;
}

export declare const BaseVector: IVectorConstructor<IBaseVector<2 | 3 | 4>>
export declare const F32BaseVector: IVectorConstructor<IBaseVector<2 | 3 | 4>>
export declare const F64BaseVector: IVectorConstructor<IBaseVector<2 | 3 | 4>>
export declare const I32BaseVector: IVectorConstructor<IBaseVector<2 | 3 | 4>>
export declare const I16BaseVector: IVectorConstructor<IBaseVector<2 | 3 | 4>>
export declare const I8BaseVector: IVectorConstructor<IBaseVector<2 | 3 | 4>>
export declare const UI32BaseVector: IVectorConstructor<IBaseVector<2 | 3 | 4>>
export declare const UI16BaseVector: IVectorConstructor<IBaseVector<2 | 3 | 4>>
export declare const UI8BaseVector: IVectorConstructor<IBaseVector<2 | 3 | 4>>

export declare type Vector2 = IVector2
export declare const Vector2: IVectorConstructor<Vector2, 2>

export declare type Vector3 = IVector3
export declare const Vector3: IVectorConstructor<Vector3, 3>

export declare type Vector4 = IVector4
export declare const Vector4: IVectorConstructor<Vector4, 4>

export declare type Quat = IQuat;
export declare const Quat: IVectorConstructor<Quat>;

export declare function makeVector2<Base extends IBaseVector<2>>(parent: IVectorConstructor<Base, 2>, structName: string, structType?: string): IVectorConstructor<Base, 2>;

export declare function makeVector3<Base extends IBaseVector<3>>(parent: IVectorConstructor<Base, 3>, structName: string, structType?: string, customConstructorCode?: string): IVectorConstructor<Base, 3>;

export declare function makeVector4<Base extends IBaseVector<4>>(parent: IVectorConstructor<Base, 4>, structName: string, structType?: string): IVectorConstructor<Base, 4>;
