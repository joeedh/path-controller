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

  getAsArray(): number[];

  perspective(fovy: number, aspect: number, near: number, far: number): this;

  orthographic(scale: number, aspect: number, near: number, far: number): this;

  lookat(pos: Vector3, target: Vector3, up: Vector3): this;

  isPersp: boolean;

  setUniform(gl: WebGLRenderingContextBase, loc: WebGLUniformLocation);
}

declare interface INumVector {
  [k: number]: number;

  length: number;
}

declare class BaseVector extends Array<number> {
  constructor(existing?: this);

  length: number;

  sinterp(b: this, t: number): this;

  //all math operates in-place, no new objects
  load(b: INumVector): this;

  copy(): this;

  add(b: this): this;

  sub(b: this): this;

  mul(b: this): this;

  div(b: this): this;

  addScalar(b: number): this;

  subScalar(b: number): this;

  mulScalar(b: number): this;

  divScalar(b: number): this;

  min(b: this): this;

  max(b: this): this;

  floor(): this;

  ceil(): this;

  abs(): this;

  dot(b: this): number;

  normalize(): this;

  vectorLength(): number;

  vectorLengthSqr(): number;

  vectorDistance(b: this): number;

  vectorDistanceSqr(b: this): number;

  multVecMatrix(mat: Matrix4): void;

  interp(b: this, fac: number): this;

  addFac(b: this, fac: number): this;

  rot2d(th: number, axis: number | undefined): this;

  zero(): this;

  negate(): this;
}

export declare class Vector2 extends BaseVector {
}

export declare class Vector3 extends BaseVector {
  cross(b: this): this;
}

export declare class Vector4 extends BaseVector {
  cross(b: this): this;
}

export declare class Quat extends BaseVector {
  axisAngleToQuat(axis: Vector3, angle: number): this;

  toMatrix(output: Matrix4 | undefined): Matrix4;
}


