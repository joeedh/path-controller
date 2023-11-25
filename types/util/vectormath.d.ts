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
  $matrix: Matrix4Data

  multiply(b: Matrix4): this;

  load(b: Matrix4): this;

  translate(x: number, y: number, z: number): this;

  scale(x: number, y: number, z: number): this;

  euler_rotate(x: number, y: number, z: number): this;

  makeIdentity(): this;
}

declare class BaseVector {
  constructor(existing?: this);

  length: number;

  //all math operates in-place, no new objects
  load(b: this): this;

  add(b: this): this;

  sub(b: this): this;

  mul(b: this): this;

  div(b: this): this;

  addScalar(b: number): this;

  subScalar(b: number): this;

  mulScalar(b: number): this;

  divScalar(b: number): this;

  min(b: number): this;

  max(b: number): this;

  floor(b: number): this;

  ceil(b: number): this;

  abs(b: number): this;

  dot(b: this): this;

  normalize(): this;

  vectorLength(): number;

  vectorLengthSqr(): number;

  vectorDistance(): number;

  vectorDistanceSqr(): number;

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
}


