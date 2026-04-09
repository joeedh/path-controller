// it is unfortunately impossible to have the matrix and vector classes
// exist in separate files, which means it has to be pasted into the final
// generated vectormath.js file

export const Matrix4Code = `
/** Incredibly old matrix class. */
export const EulerOrders = {
  XYZ: 0,
  XZY: 1,
  YXZ: 2,
  YZX: 3,
  ZXY: 4,
  ZYX: 5,
};
export type EulerOrders = (typeof EulerOrders)[keyof typeof EulerOrders];

var lookat_cache_vs3: util.cachering<Vector3>;
let lookat_cache_vs4: util.cachering<Vector4>;
let lookat_cache_ms: util.cachering<Matrix4>;
let euler_rotate_mats: util.cachering<Matrix4>;
let makenormalcache: util.cachering<Vector3>;
let temp_mats: util.cachering<Matrix4>;
let preMultTemp: Matrix4;

function myclamp(f:number, a:number, b:number) {
  return Math.min(Math.max(f, a), b);
}

class internal_matrix {
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

  constructor() {
    this.m11 = 1.0;
    this.m12 = 0.0;
    this.m13 = 0.0;
    this.m14 = 0.0;
    this.m21 = 0.0;
    this.m22 = 1.0;
    this.m23 = 0.0;
    this.m24 = 0.0;
    this.m31 = 0.0;
    this.m32 = 0.0;
    this.m33 = 1.0;
    this.m34 = 0.0;
    this.m41 = 0.0;
    this.m42 = 0.0;
    this.m43 = 0.0;
    this.m44 = 1.0;
  }
}

export class Matrix4 {
static STRUCT = nstructjs.inlineRegister(this, \`
    mat4 {
      mat      : array(float) | this.getAsArray();
      isPersp  : int          | this.isPersp;
    }
  \`)
  static setUniformArray?: number[];
  static setUniformWebGLArray?: Float32Array;

  $matrix: internal_matrix;
  isPersp: boolean;

  constructor(m?: Matrix4 | number[] | Float32Array | Float64Array) {
    this.$matrix = new internal_matrix();
    this.isPersp = false;

    if (typeof m === "object") {
      if ("length" in m && m.length >= 16) {
        this.load(m as number[]);
      } else if (m instanceof Matrix4) {
        this.load(m);
      }
    }
  }

  static fromJSON(json: any) {
    let mat = new Matrix4();
    mat.load(json.items);
    mat.isPersp = json.isPersp;
    return mat;
  }

  copy() {
    return this.clone();
  }

  clone() {
    return new Matrix4(this);
  }

  addToHashDigest(hash: util.HashDigest) {
    let m = this.$matrix;

    hash.add(m.m11);
    hash.add(m.m12);
    hash.add(m.m13);
    hash.add(m.m14);

    hash.add(m.m21);
    hash.add(m.m22);
    hash.add(m.m23);
    hash.add(m.m24);

    hash.add(m.m31);
    hash.add(m.m32);
    hash.add(m.m33);
    hash.add(m.m34);

    hash.add(m.m41);
    hash.add(m.m42);
    hash.add(m.m43);
    hash.add(m.m44);

    return this;
  }

  equals(m: this) {
    let m1 = this.$matrix;
    let m2 = m.$matrix;

    let ok = true;

    ok = ok && m1.m11 === m2.m11;
    ok = ok && m1.m12 === m2.m12;
    ok = ok && m1.m13 === m2.m13;
    ok = ok && m1.m14 === m2.m14;

    ok = ok && m1.m21 === m2.m21;
    ok = ok && m1.m22 === m2.m22;
    ok = ok && m1.m23 === m2.m23;
    ok = ok && m1.m24 === m2.m24;

    ok = ok && m1.m31 === m2.m31;
    ok = ok && m1.m32 === m2.m32;
    ok = ok && m1.m33 === m2.m33;
    ok = ok && m1.m34 === m2.m34;

    ok = ok && m1.m41 === m2.m41;
    ok = ok && m1.m42 === m2.m42;
    ok = ok && m1.m43 === m2.m43;
    ok = ok && m1.m44 === m2.m44;

    return ok;
  }

  loadColumn(i: number, vec: IVector4 | number[]) {
    let m = this.$matrix;
    let have4 = vec.length > 3;

    switch (i) {
      case 0:
        m.m11 = vec[0];
        m.m21 = vec[1];
        m.m31 = vec[2];
        if (have4) {
          m.m41 = vec[3];
        }
        break;
      case 1:
        m.m12 = vec[0];
        m.m22 = vec[1];
        m.m32 = vec[2];
        if (have4) {
          m.m42 = vec[3];
        }
        break;
      case 2:
        m.m13 = vec[0];
        m.m23 = vec[1];
        m.m33 = vec[2];
        if (have4) {
          m.m43 = vec[3];
        }
        break;
      case 3:
        m.m14 = vec[0];
        m.m24 = vec[1];
        m.m34 = vec[2];
        if (have4) {
          m.m44 = vec[3];
        }
        break;
    }

    return this;
  }

  copyColumnTo(i: number, vec: IVector4 | number[]) {
    let m = this.$matrix;
    let have4 = vec.length > 3;

    switch (i) {
      case 0:
        vec[0] = m.m11;
        vec[1] = m.m21;
        vec[2] = m.m31;
        if (have4) {
          vec[3] = m.m41;
        }
        break;
      case 1:
        vec[0] = m.m12;
        vec[1] = m.m22;
        vec[2] = m.m32;
        if (have4) {
          vec[3] = m.m42;
        }
        break;
      case 2:
        vec[0] = m.m13;
        vec[1] = m.m23;
        vec[2] = m.m33;
        if (have4) {
          vec[3] = m.m43;
        }
        break;
      case 3:
        vec[0] = m.m14;
        vec[1] = m.m24;
        vec[2] = m.m34;
        if (have4) {
          vec[3] = m.m44;
        }
        break;
    }

    return vec;
  }

  copyColumn(i: number) {
    return this.copyColumnTo(i, new Array<number>(4));
  }

  load(b: Matrix4 | number[] | Float32Array | Float64Array) {
    if (arguments.length === 1 && typeof arguments[0] === "object") {
      let matrix;
      if (arguments[0] instanceof Matrix4) {
        matrix = arguments[0].$matrix;
        this.isPersp = arguments[0].isPersp;
        this.$matrix.m11 = matrix.m11;
        this.$matrix.m12 = matrix.m12;
        this.$matrix.m13 = matrix.m13;
        this.$matrix.m14 = matrix.m14;
        this.$matrix.m21 = matrix.m21;
        this.$matrix.m22 = matrix.m22;
        this.$matrix.m23 = matrix.m23;
        this.$matrix.m24 = matrix.m24;
        this.$matrix.m31 = matrix.m31;
        this.$matrix.m32 = matrix.m32;
        this.$matrix.m33 = matrix.m33;
        this.$matrix.m34 = matrix.m34;
        this.$matrix.m41 = matrix.m41;
        this.$matrix.m42 = matrix.m42;
        this.$matrix.m43 = matrix.m43;
        this.$matrix.m44 = matrix.m44;
        return this;
      } else matrix = arguments[0];
      if ("length" in matrix && matrix.length >= 16) {
        this.$matrix.m11 = matrix[0];
        this.$matrix.m12 = matrix[1];
        this.$matrix.m13 = matrix[2];
        this.$matrix.m14 = matrix[3];
        this.$matrix.m21 = matrix[4];
        this.$matrix.m22 = matrix[5];
        this.$matrix.m23 = matrix[6];
        this.$matrix.m24 = matrix[7];
        this.$matrix.m31 = matrix[8];
        this.$matrix.m32 = matrix[9];
        this.$matrix.m33 = matrix[10];
        this.$matrix.m34 = matrix[11];
        this.$matrix.m41 = matrix[12];
        this.$matrix.m42 = matrix[13];
        this.$matrix.m43 = matrix[14];
        this.$matrix.m44 = matrix[15];
        return this;
      }
    }

    this.makeIdentity();
    return this;
  }

  toJSON() {
    return { isPersp: this.isPersp, items: this.getAsArray() };
  }

  getAsArray() {
    return [
      this.$matrix.m11,
      this.$matrix.m12,
      this.$matrix.m13,
      this.$matrix.m14,
      this.$matrix.m21,
      this.$matrix.m22,
      this.$matrix.m23,
      this.$matrix.m24,
      this.$matrix.m31,
      this.$matrix.m32,
      this.$matrix.m33,
      this.$matrix.m34,
      this.$matrix.m41,
      this.$matrix.m42,
      this.$matrix.m43,
      this.$matrix.m44,
    ];
  }

  getAsFloat32Array() {
    return new Float32Array(this.getAsArray());
  }

  setUniform(ctx: WebGL2RenderingContext | WebGLRenderingContext, loc: WebGLUniformLocation, transpose = false) {
    if (Matrix4.setUniformArray === undefined) {
      Matrix4.setUniformWebGLArray = new Float32Array(16);
      Matrix4.setUniformArray = new Array(16);
    }

    Matrix4.setUniformArray[0] = this.$matrix.m11;
    Matrix4.setUniformArray[1] = this.$matrix.m12;
    Matrix4.setUniformArray[2] = this.$matrix.m13;
    Matrix4.setUniformArray[3] = this.$matrix.m14;
    Matrix4.setUniformArray[4] = this.$matrix.m21;
    Matrix4.setUniformArray[5] = this.$matrix.m22;
    Matrix4.setUniformArray[6] = this.$matrix.m23;
    Matrix4.setUniformArray[7] = this.$matrix.m24;
    Matrix4.setUniformArray[8] = this.$matrix.m31;
    Matrix4.setUniformArray[9] = this.$matrix.m32;
    Matrix4.setUniformArray[10] = this.$matrix.m33;
    Matrix4.setUniformArray[11] = this.$matrix.m34;
    Matrix4.setUniformArray[12] = this.$matrix.m41;
    Matrix4.setUniformArray[13] = this.$matrix.m42;
    Matrix4.setUniformArray[14] = this.$matrix.m43;
    Matrix4.setUniformArray[15] = this.$matrix.m44;

    Matrix4.setUniformWebGLArray!.set(Matrix4.setUniformArray);

    ctx.uniformMatrix4fv(loc, transpose, Matrix4.setUniformWebGLArray!);
    return this;
  }

  makeIdentity() {
    this.$matrix.m11 = 1;
    this.$matrix.m12 = 0;
    this.$matrix.m13 = 0;
    this.$matrix.m14 = 0;
    this.$matrix.m21 = 0;
    this.$matrix.m22 = 1;
    this.$matrix.m23 = 0;
    this.$matrix.m24 = 0;
    this.$matrix.m31 = 0;
    this.$matrix.m32 = 0;
    this.$matrix.m33 = 1;
    this.$matrix.m34 = 0;
    this.$matrix.m41 = 0;
    this.$matrix.m42 = 0;
    this.$matrix.m43 = 0;
    this.$matrix.m44 = 1;

    //drop isPersp
    this.isPersp = false;

    return this;
  }

  transpose() {
    let tmp = this.$matrix.m12;
    this.$matrix.m12 = this.$matrix.m21;
    this.$matrix.m21 = tmp;
    tmp = this.$matrix.m13;
    this.$matrix.m13 = this.$matrix.m31;
    this.$matrix.m31 = tmp;
    tmp = this.$matrix.m14;
    this.$matrix.m14 = this.$matrix.m41;
    this.$matrix.m41 = tmp;
    tmp = this.$matrix.m23;
    this.$matrix.m23 = this.$matrix.m32;
    this.$matrix.m32 = tmp;
    tmp = this.$matrix.m24;
    this.$matrix.m24 = this.$matrix.m42;
    this.$matrix.m42 = tmp;
    tmp = this.$matrix.m34;
    this.$matrix.m34 = this.$matrix.m43;
    this.$matrix.m43 = tmp;

    return this;
  }

  determinant() {
    return this._determinant4x4();
  }

  invert() {
    let det = this._determinant4x4();

    if (Math.abs(det) < 1e-8) return null;

    this._makeAdjoint();

    this.$matrix.m11 /= det;
    this.$matrix.m12 /= det;
    this.$matrix.m13 /= det;
    this.$matrix.m14 /= det;
    this.$matrix.m21 /= det;
    this.$matrix.m22 /= det;
    this.$matrix.m23 /= det;
    this.$matrix.m24 /= det;
    this.$matrix.m31 /= det;
    this.$matrix.m32 /= det;
    this.$matrix.m33 /= det;
    this.$matrix.m34 /= det;
    this.$matrix.m41 /= det;
    this.$matrix.m42 /= det;
    this.$matrix.m43 /= det;
    this.$matrix.m44 /= det;

    return this;
  }

  translate(x: number, y: number, z: number) {
    if (typeof x === "object" && "length" in x) {
      let t = x;

      x = t[0];
      y = t[1];
      z = t[2];
    }

    x = x === undefined ? 0 : x;
    y = y === undefined ? 0 : y;
    z = z === undefined ? 0 : z;

    let matrix = temp_mats.next().makeIdentity();

    matrix.$matrix.m41 = x;
    matrix.$matrix.m42 = y;
    matrix.$matrix.m43 = z;

    this.multiply(matrix);
    return this;
  }

  preTranslate(x: number, y: number, z: number) {
    if (typeof x === "object" && "length" in x) {
      let t = x;

      x = t[0];
      y = t[1];
      z = t[2];
    }

    x = x === undefined ? 0 : x;
    y = y === undefined ? 0 : y;
    z = z === undefined ? 0 : z;

    let matrix = temp_mats.next().makeIdentity();

    matrix.$matrix.m41 = x;
    matrix.$matrix.m42 = y;
    matrix.$matrix.m43 = z;

    this.preMultiply(matrix);
    return this;
  }

  scale(x: number | any, y: number, z: number, w = 1.0) {
    if (typeof x === "object" && "length" in x) {
      let t = x;
      x = t[0];
      y = t[1];
      z = t[2];
    } else {
      if (x === undefined) x = 1;

      if (z === undefined) {
        if (y === undefined) {
          y = x;
          z = x;
        } else {
          z = x;
        }
      } else if (y === undefined) {
        y = x;
      }
    }

    let matrix = temp_mats.next().makeIdentity();
    matrix.$matrix.m11 = x;
    matrix.$matrix.m22 = y;
    matrix.$matrix.m33 = z;
    matrix.$matrix.m44 = w;
    this.multiply(matrix);
    return this;
  }

  preScale(x: number, y: number, z: number, w = 1.0) {
    let mat = temp_mats.next().makeIdentity();
    mat.scale(x, y, z, w);

    this.preMultiply(mat);
    return this;
  }

  /*
  on factor;
  off period;

  c1 := cx; comment: cos(thx);
  s1 := sx; comment: sin(thx);

  c2 := cy; comment: cos(thy);
  s2 := sy; comment: sin(thy);

  c3 := cz; comment: cos(thz);
  s3 := sz; comment: sin(thz);

  cx := cos(thx);
  sx := sin(thx);
  cy := cos(thy);
  sy := sin(thy);
  cz := cos(thz);
  sz := sin(thz);

  imat := mat((1, 0, 0, 0),
              (0, 1, 0, 0),
              (0, 0, 1, 0),
              (0, 0, 0, 1));

  xmat :=mat((1,  0,  0,  0),
             (0, c1, -s1, 0),
             (0, s1,  c1, 0),
             (0,  0,  0,  0));

  ymat :=mat((c2, 0, s2, 0),
             (0,  1,  0,  0),
             (-s2, 0,  c2, 0),
             (0,  0,  0,  0));

  zmat :=mat(( c3, -s3, 0, 0),
             (s3, c3, 0, 0),
             ( 0,  0,  1, 0),
             ( 0,  0,  0, 0));

  mmat := mat((m11, m21, m31, 0),
              (m12, m22, m32, 0),
              (m13, m23, m33, 0),
              (0,   0,   0,   0));

  fmat := zmat * ymat * xmat;

  f1 := m11**2 + m12**2 + m13**2 - 1.0;
  f2 := m21**2 + m22**2 + m23**2 - 1.0;
  f3 := m31**2 + m32**2 + m33**2 - 1.0;

  tmat := fmat * mmat;
  f1 := tmat(1, 1) - 1.0;
  f2 := tmat(2, 2) - 1.0;
  f3 := tmat(3, 3) - 1.0;

  operator myasin;

  fthy := asin(mmat(3, 1));
  f1 := mmat(3,1)**2 + mmat(2,1)**2 + mmat(1,1)**2 = 1.0;

  fmat2 := sub(thy=fthy, fmat);

  fmat3 := fmat2 * (tp mmat);
  ffz := solve(fmat2(1, 1) - m11, thz);
  ffx := solve(fmat2(3, 3) - m33, thx);

  fthz := part(ffz, 1, 2);
  fthx := part(ffx, 1, 2);

  sub(thx=fthx, thy=fthy, thz=fthz, fmat);

(cos(thy)*cos(thz),         cos(thx)*sin(thz)-cos(thz)*sin(thx)*sin(thy),  -(cos(thx)*cos(thz)*sin(thy)+sin(thx)*sin(thz)), 0),

(-cos(thy)*sin(thz),        cos(thx)*cos(thz) + sin(thx)*sin(thy)*sin(thz),  cos(thx)*sin(thy)*sin(thz)-cos(thz)*sin(thx), 0),

(sin(thy),                  cos(thy)*sin(thx),                               cos(thx)*cos(thy),  0),

    (0,0,0,1))

  */

  euler_rotate_order(x: number, y: number, z: number, order = EulerOrders.XYZ) {
    if (y === undefined) {
      y = 0.0;
    }
    if (z === undefined) {
      z = 0.0;
    }

    x = -x;
    y = -y;
    z = -z;

    let xmat = euler_rotate_mats.next().makeIdentity();

    let m = xmat.$matrix;

    let c = Math.cos(x),
      s = Math.sin(x);

    m.m22 = c;
    m.m23 = s;
    m.m32 = -s;
    m.m33 = c;

    let ymat = euler_rotate_mats.next().makeIdentity();
    c = Math.cos(y);
    s = Math.sin(y);
    m = ymat.$matrix;

    m.m11 = c;
    m.m13 = -s;
    m.m31 = s;
    m.m33 = c;

    let zmat = euler_rotate_mats.next().makeIdentity();
    c = Math.cos(z);
    s = Math.sin(z);
    m = zmat.$matrix;

    m.m11 = c;
    m.m12 = s;
    m.m21 = -s;
    m.m22 = c;

    let a: Matrix4 | undefined, b: Matrix4 | undefined, cmat: Matrix4 | undefined;

    switch (order) {
      case EulerOrders.XYZ:
        a = xmat;
        b = ymat;
        cmat = zmat;
        break;
      case EulerOrders.XZY:
        a = xmat;
        b = zmat;
        cmat = ymat;
        break;
      case EulerOrders.YXZ:
        a = ymat;
        b = xmat;
        cmat = zmat;
        break;
      case EulerOrders.YZX:
        a = ymat;
        b = zmat;
        cmat = xmat;
        break;
      case EulerOrders.ZXY:
        a = zmat;
        b = xmat;
        cmat = ymat;
        break;
      case EulerOrders.ZYX:
        a = zmat;
        b = ymat;
        cmat = xmat;
        break;
    }

    b!.preMultiply(cmat!);
    b!.multiply(a!);
    this.preMultiply(b!);

    return this;
  }

  euler_rotate(x: number, y: number, z: number) {
    if (y === undefined) {
      y = 0.0;
    }
    if (z === undefined) {
      z = 0.0;
    }

    let xmat = euler_rotate_mats.next().makeIdentity();
    let m = xmat.$matrix;

    let c = Math.cos(x),
      s = Math.sin(x);

    m.m22 = c;
    m.m23 = s;
    m.m32 = -s;
    m.m33 = c;

    let ymat = euler_rotate_mats.next().makeIdentity();
    c = Math.cos(y);
    s = Math.sin(y);
    m = ymat.$matrix;

    m.m11 = c;
    m.m13 = -s;
    m.m31 = s;
    m.m33 = c;

    ymat.multiply(xmat);

    let zmat = euler_rotate_mats.next().makeIdentity();
    c = Math.cos(z);
    s = Math.sin(z);
    m = zmat.$matrix;

    m.m11 = c;
    m.m12 = s;
    m.m21 = -s;
    m.m22 = c;

    zmat.multiply(ymat);

    //console.log(""+ymat);
    //this.multiply(zmat);
    this.preMultiply(zmat);

    return this;
  }

  toString() {
    let s = "";
    let m = this.$matrix;

    function dec(d: number) {
      let ret = d.toFixed(3);

      if (ret[0] !== "-")
        //make room for negative signs
        ret = " " + ret;
      return ret;
    }

    s = dec(m.m11) + ", " + dec(m.m12) + ", " + dec(m.m13) + ", " + dec(m.m14) + "\\n";
    s += dec(m.m21) + ", " + dec(m.m22) + ", " + dec(m.m23) + ", " + dec(m.m24) + "\\n";
    s += dec(m.m31) + ", " + dec(m.m32) + ", " + dec(m.m33) + ", " + dec(m.m34) + "\\n";
    s += dec(m.m41) + ", " + dec(m.m42) + ", " + dec(m.m43) + ", " + dec(m.m44) + "\\n";

    return s;
  }

  rotate(angle: number, x: number | any, y: number, z: number) {
    if (typeof x === "object" && "length" in x) {
      let t = x;
      x = t[0];
      y = t[1];
      z = t[2];
    } else {
      if (arguments.length === 1) {
        x = y = 0;
        z = 1;
      } else if (arguments.length === 3) {
        this.rotate(angle, 1, 0, 0);
        this.rotate(x, 0, 1, 0);
        this.rotate(y, 0, 0, 1);
        return;
      }
    }

    angle /= 2;
    let sinA = Math.sin(angle);
    let cosA = Math.cos(angle);
    let sinA2 = sinA * sinA;
    let len = Math.sqrt(x * x + y * y + z * z);

    if (len === 0) {
      x = 0;
      y = 0;
      z = 1;
    } else if (len !== 1) {
      x /= len;
      y /= len;
      z /= len;
    }

    let mat = temp_mats.next().makeIdentity();

    if (x === 1 && y === 0 && z === 0) {
      mat.$matrix.m11 = 1;
      mat.$matrix.m12 = 0;
      mat.$matrix.m13 = 0;
      mat.$matrix.m21 = 0;
      mat.$matrix.m22 = 1 - 2 * sinA2;
      mat.$matrix.m23 = 2 * sinA * cosA;
      mat.$matrix.m31 = 0;
      mat.$matrix.m32 = -2 * sinA * cosA;
      mat.$matrix.m33 = 1 - 2 * sinA2;
      mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
      mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
      mat.$matrix.m44 = 1;
    } else if (x === 0 && y === 1 && z === 0) {
      mat.$matrix.m11 = 1 - 2 * sinA2;
      mat.$matrix.m12 = 0;
      mat.$matrix.m13 = -2 * sinA * cosA;
      mat.$matrix.m21 = 0;
      mat.$matrix.m22 = 1;
      mat.$matrix.m23 = 0;
      mat.$matrix.m31 = 2 * sinA * cosA;
      mat.$matrix.m32 = 0;
      mat.$matrix.m33 = 1 - 2 * sinA2;
      mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
      mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
      mat.$matrix.m44 = 1;
    } else if (x === 0 && y === 0 && z === 1) {
      mat.$matrix.m11 = 1 - 2 * sinA2;
      mat.$matrix.m12 = 2 * sinA * cosA;
      mat.$matrix.m13 = 0;
      mat.$matrix.m21 = -2 * sinA * cosA;
      mat.$matrix.m22 = 1 - 2 * sinA2;
      mat.$matrix.m23 = 0;
      mat.$matrix.m31 = 0;
      mat.$matrix.m32 = 0;
      mat.$matrix.m33 = 1;
      mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
      mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
      mat.$matrix.m44 = 1;
    } else {
      let x2 = x * x;
      let y2 = y * y;
      let z2 = z * z;
      mat.$matrix.m11 = 1 - 2 * (y2 + z2) * sinA2;
      mat.$matrix.m12 = 2 * (x * y * sinA2 + z * sinA * cosA);
      mat.$matrix.m13 = 2 * (x * z * sinA2 - y * sinA * cosA);
      mat.$matrix.m21 = 2 * (y * x * sinA2 - z * sinA * cosA);
      mat.$matrix.m22 = 1 - 2 * (z2 + x2) * sinA2;
      mat.$matrix.m23 = 2 * (y * z * sinA2 + x * sinA * cosA);
      mat.$matrix.m31 = 2 * (z * x * sinA2 + y * sinA * cosA);
      mat.$matrix.m32 = 2 * (z * y * sinA2 - x * sinA * cosA);
      mat.$matrix.m33 = 1 - 2 * (x2 + y2) * sinA2;
      mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
      mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
      mat.$matrix.m44 = 1;
    }
    this.multiply(mat);

    return this;
  }

  normalize() {
    let m = this.$matrix;

    let v1 = new Vector4([m.m11, m.m12, m.m13, m.m14]);
    let v2 = new Vector4([m.m21, m.m22, m.m23, m.m24]);
    let v3 = new Vector4([m.m31, m.m32, m.m33, m.m34]);
    let v4 = new Vector4([m.m41, m.m42, m.m43, m.m44]);

    v1.normalize();
    v2.normalize();
    v3.normalize();

    let flat = new Array().concat(v1).concat(v2).concat(v3).concat(v4);
    this.load(flat);

    return this;
  }

  clearTranslation(set_w_to_one = false) {
    let m = this.$matrix;

    m.m41 = m.m42 = m.m43 = 0.0;

    if (set_w_to_one) {
      m.m44 = 1.0;
    }

    return this;
  }

  setTranslation(x: number | any, y: number, z: number, resetW = true) {
    if (typeof x === "object") {
      y = x[1];
      z = x[2];
      x = x[0];
    }

    let m = this.$matrix;

    m.m41 = x;
    m.m42 = y;
    m.m43 = z;

    if (resetW) {
      m.m44 = 1.0;
    }

    return this;
  }

  //this is really like the lookAt method, isn't it.
  makeNormalMatrix(normal: Vector3, up?: Vector3) {
    if (normal === undefined) {
      throw new Error("normal cannot be undefined");
    }

    let n = makenormalcache.next().load(normal).normalize();

    if (up === undefined) {
      up = makenormalcache.next().zero();

      if (Math.abs(n[2]) > 0.95) {
        up[1] = 1.0;
      } else {
        up[2] = 1.0;
      }
    }

    up = makenormalcache.next().load(up);

    up.normalize();

    if (up.dot(normal) > 0.99) {
      this.makeIdentity();
      return this;
    } else if (up.dot(normal) < -0.99) {
      this.makeIdentity();
      this.scale(1.0, 1.0, -1.0);
      return this;
    }

    let x = makenormalcache.next();
    let y = makenormalcache.next();

    x.load(n).cross(up).normalize();
    y.load(x).cross(n).normalize();
    //y.negate();

    this.makeIdentity();
    let m = this.$matrix;

    m.m11 = x[0];
    m.m12 = x[1];
    m.m13 = x[2];

    m.m21 = y[0];
    m.m22 = y[1];
    m.m23 = y[2];

    m.m31 = n[0];
    m.m32 = n[1];
    m.m33 = n[2];
    m.m44 = 1.0;

    return this;
  }

  preMultiply(mat: this | Matrix4) {
    preMultTemp.load(mat);
    preMultTemp.multiply(this);

    this.load(preMultTemp);

    return this;
  }

  multiply(mat: this | Matrix4) {
    let mm = this.$matrix;
    let mm2 = mat.$matrix;

    let m11 = mm2.m11 * mm.m11 + mm2.m12 * mm.m21 + mm2.m13 * mm.m31 + mm2.m14 * mm.m41;
    let m12 = mm2.m11 * mm.m12 + mm2.m12 * mm.m22 + mm2.m13 * mm.m32 + mm2.m14 * mm.m42;
    let m13 = mm2.m11 * mm.m13 + mm2.m12 * mm.m23 + mm2.m13 * mm.m33 + mm2.m14 * mm.m43;
    let m14 = mm2.m11 * mm.m14 + mm2.m12 * mm.m24 + mm2.m13 * mm.m34 + mm2.m14 * mm.m44;
    let m21 = mm2.m21 * mm.m11 + mm2.m22 * mm.m21 + mm2.m23 * mm.m31 + mm2.m24 * mm.m41;
    let m22 = mm2.m21 * mm.m12 + mm2.m22 * mm.m22 + mm2.m23 * mm.m32 + mm2.m24 * mm.m42;
    let m23 = mm2.m21 * mm.m13 + mm2.m22 * mm.m23 + mm2.m23 * mm.m33 + mm2.m24 * mm.m43;
    let m24 = mm2.m21 * mm.m14 + mm2.m22 * mm.m24 + mm2.m23 * mm.m34 + mm2.m24 * mm.m44;
    let m31 = mm2.m31 * mm.m11 + mm2.m32 * mm.m21 + mm2.m33 * mm.m31 + mm2.m34 * mm.m41;
    let m32 = mm2.m31 * mm.m12 + mm2.m32 * mm.m22 + mm2.m33 * mm.m32 + mm2.m34 * mm.m42;
    let m33 = mm2.m31 * mm.m13 + mm2.m32 * mm.m23 + mm2.m33 * mm.m33 + mm2.m34 * mm.m43;
    let m34 = mm2.m31 * mm.m14 + mm2.m32 * mm.m24 + mm2.m33 * mm.m34 + mm2.m34 * mm.m44;
    let m41 = mm2.m41 * mm.m11 + mm2.m42 * mm.m21 + mm2.m43 * mm.m31 + mm2.m44 * mm.m41;
    let m42 = mm2.m41 * mm.m12 + mm2.m42 * mm.m22 + mm2.m43 * mm.m32 + mm2.m44 * mm.m42;
    let m43 = mm2.m41 * mm.m13 + mm2.m42 * mm.m23 + mm2.m43 * mm.m33 + mm2.m44 * mm.m43;
    let m44 = mm2.m41 * mm.m14 + mm2.m42 * mm.m24 + mm2.m43 * mm.m34 + mm2.m44 * mm.m44;

    mm.m11 = m11;
    mm.m12 = m12;
    mm.m13 = m13;
    mm.m14 = m14;
    mm.m21 = m21;
    mm.m22 = m22;
    mm.m23 = m23;
    mm.m24 = m24;
    mm.m31 = m31;
    mm.m32 = m32;
    mm.m33 = m33;
    mm.m34 = m34;
    mm.m41 = m41;
    mm.m42 = m42;
    mm.m43 = m43;
    mm.m44 = m44;

    return this;
  }

  divide(divisor: number) {
    this.$matrix.m11 /= divisor;
    this.$matrix.m12 /= divisor;
    this.$matrix.m13 /= divisor;
    this.$matrix.m14 /= divisor;
    this.$matrix.m21 /= divisor;
    this.$matrix.m22 /= divisor;
    this.$matrix.m23 /= divisor;
    this.$matrix.m24 /= divisor;
    this.$matrix.m31 /= divisor;
    this.$matrix.m32 /= divisor;
    this.$matrix.m33 /= divisor;
    this.$matrix.m34 /= divisor;
    this.$matrix.m41 /= divisor;
    this.$matrix.m42 /= divisor;
    this.$matrix.m43 /= divisor;
    this.$matrix.m44 /= divisor;

    return this;
  }

  ortho(left: number, right: number, bottom: number, top: number, near: number, far: number) {
    console.warn("Matrix4.ortho() is deprecated, use .orthographic() instead");

    let tx = (left + right) / (left - right);
    let ty = (top + bottom) / (top - bottom);
    let tz = (far + near) / (far - near);
    let matrix = temp_mats.next().makeIdentity();

    matrix.$matrix.m11 = 2 / (left - right);
    matrix.$matrix.m12 = 0;
    matrix.$matrix.m13 = 0;
    matrix.$matrix.m14 = 0;
    matrix.$matrix.m21 = 0;
    matrix.$matrix.m22 = 2 / (top - bottom);
    matrix.$matrix.m23 = 0;
    matrix.$matrix.m24 = 0;
    matrix.$matrix.m31 = 0;
    matrix.$matrix.m32 = 0;
    matrix.$matrix.m33 = -2 / (far - near);
    matrix.$matrix.m34 = 0;
    matrix.$matrix.m41 = tx;
    matrix.$matrix.m42 = ty;
    matrix.$matrix.m43 = tz;
    matrix.$matrix.m44 = 1;

    this.multiply(matrix as this);

    return this;
  }

  frustum(left: number, right: number, bottom: number, top: number, near: number, far: number) {
    let matrix = temp_mats.next().makeIdentity();

    let A = (right + left) / (right - left);
    let B = (top + bottom) / (top - bottom);
    let C = -(far + near) / (far - near);
    let D = -(2 * far * near) / (far - near);

    matrix.$matrix.m11 = (2 * near) / (right - left);
    matrix.$matrix.m12 = 0;
    matrix.$matrix.m13 = 0;
    matrix.$matrix.m14 = 0;
    matrix.$matrix.m21 = 0;
    matrix.$matrix.m22 = (2 * near) / (top - bottom);
    matrix.$matrix.m23 = 0;
    matrix.$matrix.m24 = 0;
    matrix.$matrix.m31 = A;
    matrix.$matrix.m32 = B;
    matrix.$matrix.m33 = C;
    matrix.$matrix.m34 = -1;
    matrix.$matrix.m41 = 0;
    matrix.$matrix.m42 = 0;
    matrix.$matrix.m43 = D;
    matrix.$matrix.m44 = 0;

    this.isPersp = true;
    this.multiply(matrix as this);

    return this;
  }

  orthographic(scale: number, aspect: number, near: number, far: number) {
    let mat = temp_mats.next().makeIdentity();

    let zscale = far - near;

    mat.scale(2.0 / aspect, 2.0, -1.0 / scale / zscale, 1.0 / scale);
    mat.translate(0.0, 0.0, 0.5 * zscale - near);

    this.isPersp = true; //we still make use of auto homogenous divide in BaseVector.multVecMatrix
    this.multiply(mat as this);

    return mat;
  }

  perspective(fovy: number, aspect: number, zNear: number, zFar: number) {
    let top = Math.tan((fovy * Math.PI) / 360) * zNear;
    let bottom = -top;
    let left = aspect * bottom;
    let right = aspect * top;

    this.frustum(left, right, bottom, top, zNear, zFar);

    return this;
  }

  lookat(pos: Vector3, target: Vector3, up: Vector3) {
    let matrix = lookat_cache_ms.next();
    matrix.makeIdentity();

    let vec = lookat_cache_vs3.next().load(pos).sub(target);
    let len = vec.vectorLength();
    vec.normalize();

    let zvec = vec;
    let yvec = lookat_cache_vs3.next().load(up).normalize();
    let xvec = lookat_cache_vs3.next().load(yvec).cross(zvec).normalize();

    let mm = matrix.$matrix;

    mm.m11 = xvec[0];
    mm.m12 = yvec[0];
    mm.m13 = zvec[0];
    mm.m14 = 0;
    mm.m21 = xvec[1];
    mm.m22 = yvec[1];
    mm.m23 = zvec[1];
    mm.m24 = 0;
    mm.m31 = xvec[2];
    mm.m32 = yvec[2];
    mm.m33 = zvec[2];

    //*
    mm.m11 = xvec[0];
    mm.m12 = xvec[1];
    mm.m13 = xvec[2];
    mm.m14 = 0;
    mm.m21 = yvec[0];
    mm.m22 = yvec[1];
    mm.m23 = yvec[2];
    mm.m24 = 0;
    mm.m31 = zvec[0];
    mm.m32 = zvec[1];
    mm.m33 = zvec[2];
    mm.m34 = 0;
    mm.m41 = pos[0];
    mm.m42 = pos[1];
    mm.m43 = pos[2];
    mm.m44 = 1;
    //*/

    this.multiply(matrix as this);

    return this;
  }

  makeRotationOnly() {
    let m = this.$matrix;

    m.m41 = m.m42 = m.m43 = 0.0;
    m.m44 = 1.0;

    let l1 = Math.sqrt(m.m11 * m.m11 + m.m12 * m.m12 + m.m13 * m.m13);
    let l2 = Math.sqrt(m.m21 * m.m21 + m.m22 * m.m22 + m.m23 * m.m23);
    let l3 = Math.sqrt(m.m31 * m.m31 + m.m32 * m.m32 + m.m33 * m.m33);

    if (l1) {
      m.m11 /= l1;
      m.m12 /= l1;
      m.m13 /= l1;
    }

    if (l2) {
      m.m21 /= l2;
      m.m22 /= l2;
      m.m23 /= l2;
    }

    if (l3) {
      m.m31 /= l3;
      m.m32 /= l3;
      m.m33 /= l3;
    }

    return this;
  }

  getAsVecs(): Vector4[] {
    return [
      new Vector4().loadXYZW(this.$matrix.m11, this.$matrix.m12, this.$matrix.m13, this.$matrix.m14),
      new Vector4().loadXYZW(this.$matrix.m21, this.$matrix.m22, this.$matrix.m23, this.$matrix.m24),
      new Vector4().loadXYZW(this.$matrix.m31, this.$matrix.m32, this.$matrix.m33, this.$matrix.m34),
      new Vector4().loadXYZW(this.$matrix.m41, this.$matrix.m42, this.$matrix.m43, this.$matrix.m44),
    ];
  }

  loadFromVecs(vecs: Vector4[]) {
    let m = this.$matrix;
    m.m11 = vecs[0][0];
    m.m12 = vecs[0][1];
    m.m13 = vecs[0][2];
    m.m14 = vecs[0][3];

    m.m21 = vecs[1][0];
    m.m22 = vecs[1][1];
    m.m23 = vecs[1][2];
    m.m24 = vecs[1][3];

    m.m31 = vecs[2][0];
    m.m32 = vecs[2][1];
    m.m33 = vecs[2][2];
    m.m34 = vecs[2][3];

    m.m41 = vecs[3][0];
    m.m42 = vecs[3][1];
    m.m43 = vecs[3][2];
    m.m44 = vecs[3][3];
    return this
  }

  alignAxis(axis: number, vec_: number[] | IVector3) {
    const vec = new Vector4().load3(vec_);
    vec.normalize();

    let mat = this;
    let m = mat.$matrix;

    let mat2 = new Matrix4(mat);
    let loc = new Vector3(),
      scale = new Vector3(),
      rot = new Vector3();

    //we don't use rot
    mat2.decompose(loc, rot, scale);
    mat2.makeRotationOnly();

    let axes = mat2.getAsVecs();

    let axis2 = (axis + 1) % 3;
    let axis3 = (axis + 2) % 3;

    axes[axis].load(vec);
    axes[axis2].cross(axes[axis]).cross(axes[axis]);
    axes[axis3].load(axes[axis]).cross(axes[axis2]);

    axes[0][3] = 1.0;
    axes[1][3] = 1.0;
    axes[2][3] = 1.0;

    axes[0].normalize();
    axes[1].normalize();
    axes[2].normalize();

    this.loadFromVecs(axes);
    this.scale(scale[0], scale[1], scale[2]);

    m.m41 = loc[0];
    m.m42 = loc[1];
    m.m43 = loc[2];

    return this;
  }

  decompose(_translate: any, _rotate?: any, _scale?: any, _skew?: any, _perspective?: any, order = EulerOrders.XYZ) {
    if (this.$matrix.m44 === 0) return false;

    let mat = temp_mats.next().load(this);
    let m = mat.$matrix;

    let t = _translate,
      r = _rotate,
      s = _scale;
    if (t) {
      t[0] = m.m41;
      t[1] = m.m42;
      t[2] = m.m43;
    }

    let l1 = Math.sqrt(m.m11 * m.m11 + m.m12 * m.m12 + m.m13 * m.m13);
    let l2 = Math.sqrt(m.m21 * m.m21 + m.m22 * m.m22 + m.m23 * m.m23);
    let l3 = Math.sqrt(m.m31 * m.m31 + m.m32 * m.m32 + m.m33 * m.m33);

    if (l1) {
      m.m11 /= l1;
      m.m12 /= l1;
      m.m13 /= l1;
    }
    if (l2) {
      m.m21 /= l2;
      m.m22 /= l2;
      m.m23 /= l2;
    }
    if (l3) {
      m.m31 /= l3;
      m.m32 /= l3;
      m.m33 /= l3;
    }

    if (s) {
      s[0] = l1;
      s[1] = l2;
      s[2] = l3;
    }

    if (r) {
      //THREE.js code
      let clamp = myclamp;

      let rmat = temp_mats.next().load(this);
      rmat.normalize();

      m = rmat.$matrix;

      // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

      let m11 = m.m11,
        m12 = m.m12,
        m13 = m.m13,
        m14 = m.m14;
      let m21 = m.m21,
        m22 = m.m22,
        m23 = m.m23,
        m24 = m.m24;
      let m31 = m.m31,
        m32 = m.m32,
        m33 = m.m33,
        m34 = m.m34;
      //let m41 = m.m41, m42 = m.m42, m43 = m.m43, m44 = m.m44;

      if (order === EulerOrders.XYZ) {
        r[1] = Math.asin(clamp(m13, -1, 1));

        if (Math.abs(m13) < 0.9999999) {
          r[0] = Math.atan2(-m23, m33);
          r[2] = Math.atan2(-m12, m11);
        } else {
          r[0] = Math.atan2(m32, m22);
          r[2] = 0;
        }
      } else if (order === EulerOrders.YXZ) {
        r[0] = Math.asin(-clamp(m23, -1, 1));

        if (Math.abs(m23) < 0.9999999) {
          r[1] = Math.atan2(m13, m33);
          r[2] = Math.atan2(m21, m22);
        } else {
          r[1] = Math.atan2(-m31, m11);
          r[2] = 0;
        }
      } else if (order === EulerOrders.ZXY) {
        r[0] = Math.asin(clamp(m32, -1, 1));

        if (Math.abs(m32) < 0.9999999) {
          r[1] = Math.atan2(-m31, m33);
          r[2] = Math.atan2(-m12, m22);
        } else {
          r[1] = 0;
          r[2] = Math.atan2(m21, m11);
        }
      } else if (order === EulerOrders.ZYX) {
        r[1] = Math.asin(-clamp(m31, -1, 1));

        if (Math.abs(m31) < 0.9999999) {
          r[0] = Math.atan2(m32, m33);
          r[2] = Math.atan2(m21, m11);
        } else {
          r[0] = 0;
          r[2] = Math.atan2(-m12, m22);
        }
      } else if (order === EulerOrders.YZX) {
        r[2] = Math.asin(clamp(m21, -1, 1));

        if (Math.abs(m21) < 0.9999999) {
          r[0] = Math.atan2(-m23, m22);
          r[1] = Math.atan2(-m31, m11);
        } else {
          r[0] = 0;
          r[1] = Math.atan2(m13, m33);
        }
      } else if (order === EulerOrders.XZY) {
        r[2] = Math.asin(-clamp(m12, -1, 1));

        if (Math.abs(m12) < 0.9999999) {
          r[0] = Math.atan2(m32, m22);
          r[1] = Math.atan2(m13, m11);
        } else {
          r[0] = Math.atan2(-m23, m33);
          r[1] = 0;
        }
      } else {
        console.warn("unsupported euler order:", order);
      }
      //r[0] = Math.atan2(m.m23, m.m33);
      //r[1] = Math.atan2(-m.m13, Math.sqrt(m.m23*m.m23 + m.m33*m.m33));
      //r[2] = Math.atan2(m.m12, m.m11);
    }
  }

  _determinant2x2(a:number, b:number, c:number, d:number) {
    return a * d - b * c;
  }

  _determinant3x3(a1:number, a2:number, a3:number, b1:number, b2:number, b3:number, c1:number, c2:number, c3:number) {
    return (
      a1 * this._determinant2x2(b2, b3, c2, c3) -
      b1 * this._determinant2x2(a2, a3, c2, c3) +
      c1 * this._determinant2x2(a2, a3, b2, b3)
    );
  }

  _determinant4x4() {
    let a1 = this.$matrix.m11;
    let b1 = this.$matrix.m12;
    let c1 = this.$matrix.m13;
    let d1 = this.$matrix.m14;
    let a2 = this.$matrix.m21;
    let b2 = this.$matrix.m22;
    let c2 = this.$matrix.m23;
    let d2 = this.$matrix.m24;
    let a3 = this.$matrix.m31;
    let b3 = this.$matrix.m32;
    let c3 = this.$matrix.m33;
    let d3 = this.$matrix.m34;
    let a4 = this.$matrix.m41;
    let b4 = this.$matrix.m42;
    let c4 = this.$matrix.m43;
    let d4 = this.$matrix.m44;
    return (
      a1 * this._determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4) -
      b1 * this._determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4) +
      c1 * this._determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4) -
      d1 * this._determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4)
    );
  }

  _makeAdjoint() {
    let a1 = this.$matrix.m11;
    let b1 = this.$matrix.m12;
    let c1 = this.$matrix.m13;
    let d1 = this.$matrix.m14;
    let a2 = this.$matrix.m21;
    let b2 = this.$matrix.m22;
    let c2 = this.$matrix.m23;
    let d2 = this.$matrix.m24;
    let a3 = this.$matrix.m31;
    let b3 = this.$matrix.m32;
    let c3 = this.$matrix.m33;
    let d3 = this.$matrix.m34;
    let a4 = this.$matrix.m41;
    let b4 = this.$matrix.m42;
    let c4 = this.$matrix.m43;
    let d4 = this.$matrix.m44;

    this.$matrix.m11 = this._determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4);
    this.$matrix.m21 = -this._determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4);
    this.$matrix.m31 = this._determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4);
    this.$matrix.m41 = -this._determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);
    this.$matrix.m12 = -this._determinant3x3(b1, b3, b4, c1, c3, c4, d1, d3, d4);
    this.$matrix.m22 = this._determinant3x3(a1, a3, a4, c1, c3, c4, d1, d3, d4);
    this.$matrix.m32 = -this._determinant3x3(a1, a3, a4, b1, b3, b4, d1, d3, d4);
    this.$matrix.m42 = this._determinant3x3(a1, a3, a4, b1, b3, b4, c1, c3, c4);
    this.$matrix.m13 = this._determinant3x3(b1, b2, b4, c1, c2, c4, d1, d2, d4);
    this.$matrix.m23 = -this._determinant3x3(a1, a2, a4, c1, c2, c4, d1, d2, d4);
    this.$matrix.m33 = this._determinant3x3(a1, a2, a4, b1, b2, b4, d1, d2, d4);
    this.$matrix.m43 = -this._determinant3x3(a1, a2, a4, b1, b2, b4, c1, c2, c4);
    this.$matrix.m14 = -this._determinant3x3(b1, b2, b3, c1, c2, c3, d1, d2, d3);
    this.$matrix.m24 = this._determinant3x3(a1, a2, a3, c1, c2, c3, d1, d2, d3);
    this.$matrix.m34 = -this._determinant3x3(a1, a2, a3, b1, b2, b3, d1, d2, d3);
    this.$matrix.m44 = this._determinant3x3(a1, a2, a3, b1, b2, b3, c1, c2, c3);
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this);

    const saved = this as any
    this.load(saved.mat);
    saved.__mat = saved.mat;
    //delete saved.mat;
  }
}

lookat_cache_vs3 = util.cachering.fromConstructor(Vector3, 512);
lookat_cache_vs4 = util.cachering.fromConstructor(Vector4, 512);
lookat_cache_ms = util.cachering.fromConstructor(Matrix4, 512);
euler_rotate_mats = util.cachering.fromConstructor(Matrix4, 512);
makenormalcache = util.cachering.fromConstructor(Vector3, 512);
temp_mats = util.cachering.fromConstructor(Matrix4, 512);
preMultTemp = new Matrix4();
`;
