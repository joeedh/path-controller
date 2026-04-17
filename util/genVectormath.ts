//@ts-nocheck for now
import * as util from "./util";
import nstructjs from "./struct";

const vecQuatMults = {
  2: `    mulVecQuat(q: IQuat) {
      let t0 = -q[1] * this[0] - q[2] * this[1];
      let t1 = q[0] * this[0] - q[3] * this[1];
      let t2 = q[0] * this[1] + q[3] * this[0];

      let z = q[1] * this[1] - q[2] * this[0];
      this[0] = t1;
      this[1] = t2;

      t1 = t0 * -q[1] + this[0] * q[0] - this[1] * q[3] + z * q[2];
      t2 = t0 * -q[2] + this[1] * q[0] - z * q[1] + this[0] * q[3];

      this[0] = t1;
      this[1] = t2;

      return this;
    }`,
  3: "", // is set below
  4: `    mulVecQuat(q: IQuat) {
      let t0 = -q[1] * this[0] - q[2] * this[1] - q[3] * this[2];
      let t1 = q[0] * this[0] + q[2] * this[2] - q[3] * this[1];
      let t2 = q[0] * this[1] + q[3] * this[0] - q[1] * this[2];

      this[2] = q[0] * this[2] + q[1] * this[1] - q[2] * this[0];
      this[0] = t1;
      this[1] = t2;

      t1 = t0 * -q[1] + this[0] * q[0] - this[1] * q[3] + this[2] * q[2];
      t2 = t0 * -q[2] + this[1] * q[0] - this[2] * q[1] + this[0] * q[3];

      this[2] = t0 * -q[3] + this[2] * q[0] - this[0] * q[2] + this[1] * q[1];
      this[0] = t1;
      this[1] = t2;

      return this;
    }
`,
};
vecQuatMults[3] = vecQuatMults[4];

const matrixVecMults = {
  2: `/** Returns w value. */\n    multVecMatrix(matrix: Matrix4, ignore_w = false) {
      const x = this[0];
      const y = this[1];
      const w = 1.0;

      this[0] = w * matrix.$matrix.m41 + x * matrix.$matrix.m11 + y * matrix.$matrix.m21;
      this[1] = w * matrix.$matrix.m42 + x * matrix.$matrix.m12 + y * matrix.$matrix.m22;

      if (!ignore_w && matrix.isPersp) {
        let w2 = w * matrix.$matrix.m44 + x * matrix.$matrix.m14 + y * matrix.$matrix.m24;

        if (w2 !== 0.0) {
          this[0] /= w2;
          this[1] /= w2;
        }
      }

      return this;
    }
  `,
  3: `/** Returns w value. */\n      multVecMatrix(matrix: Matrix4, ignore_w = false) {
      if (ignore_w === undefined) {
        ignore_w = false;
      }
      let x = this[0];
      let y = this[1];
      let z = this[2];
      this[0] = matrix.$matrix.m41 + x*matrix.$matrix.m11 + y*matrix.$matrix.m21 + z*matrix.$matrix.m31;
      this[1] = matrix.$matrix.m42 + x*matrix.$matrix.m12 + y*matrix.$matrix.m22 + z*matrix.$matrix.m32;
      this[2] = matrix.$matrix.m43 + x*matrix.$matrix.m13 + y*matrix.$matrix.m23 + z*matrix.$matrix.m33;
      let w = matrix.$matrix.m44 + x*matrix.$matrix.m14 + y*matrix.$matrix.m24 + z*matrix.$matrix.m34;

      if (!ignore_w && w !== 1 && w !== 0 && matrix.isPersp) {
        this[0] /= w;
        this[1] /= w;
        this[2] /= w;
      }
      return w;
    }`,
  4: `/** Returns w value. */\n    multVecMatrix(matrix: Matrix4): number {
      let x = this[0];
      let y = this[1];
      let z = this[2];
      let w = this[3];

      this[0] = w * matrix.$matrix.m41 + x * matrix.$matrix.m11 + y * matrix.$matrix.m21 + z * matrix.$matrix.m31;
      this[1] = w * matrix.$matrix.m42 + x * matrix.$matrix.m12 + y * matrix.$matrix.m22 + z * matrix.$matrix.m32;
      this[2] = w * matrix.$matrix.m43 + x * matrix.$matrix.m13 + y * matrix.$matrix.m23 + z * matrix.$matrix.m33;
      this[3] = w * matrix.$matrix.m44 + x * matrix.$matrix.m14 + y * matrix.$matrix.m24 + z * matrix.$matrix.m34;

      return this[3];
    }
`,
};

let DOT_NORM_SNAP_LIMIT = 0.00000000001;
let M_SQRT2 = Math.sqrt(2.0);
let FLT_EPSILON = 2.22e-16;

let basic_funcs = {
  equals   : [["vb"], "this[X] === b[X]", "&&"],
  /*dot is made manually so it's safe for acos
  dot     : [["b"], "this[X]*b[X]", "+"],
   */
  zero     : [[], "0.0"],
  negate   : [[], "-this[X]"],
  combine  : [["vb", "u", "v"], "this[X]*u + b[X]*v"],
  interp   : [["vb", "t"], "this[X] + (b[X] - this[X])*t"],
  add      : [["vb"], "this[X] + b[X]"],
  addFac   : [["vb", "F"], "this[X] + b[X]*F"],
  fract    : [[], "Math.fract(this[X])"],
  sub      : [["vb"], "this[X] - b[X]"],
  mul      : [["vb"], "this[X] * b[X]"],
  div      : [["vb"], "this[X] / b[X]"],
  mulScalar: [["b"], "this[X] * b"],
  divScalar: [["b"], "this[X] / b"],
  addScalar: [["b"], "this[X] + b"],
  subScalar: [["b"], "this[X] - b"],
  minScalar: [["b"], "Math.min(this[X], b)"],
  maxScalar: [["b"], "Math.max(this[X], b)"],
  ceil     : [[], "Math.ceil(this[X])"],
  floor    : [[], "Math.floor(this[X])"],
  abs      : [[], "Math.abs(this[X])"],
  min      : [["vb"], "Math.min(this[X], b[X])"],
  max      : [["vb"], "Math.max(this[X], b[X])"],
  clamp    : [["MIN", "MAX"], "Math.min(Math.max(this[X], MAX), MIN)"],
};

function bounded_acos(fac) {
  if (fac <= -1.0) return Math.PI;
  else if (fac >= 1.0) return 0.0;
  else return Math.acos(fac);
}

function make_norm_safe_dot(cls) {
  let _dot = cls.prototype.dot;

  cls.prototype._dot = _dot;
  cls.prototype.dot = function (b) {
    let ret = _dot.call(this, b);

    if (ret >= 1.0 - DOT_NORM_SNAP_LIMIT && ret <= 1.0 + DOT_NORM_SNAP_LIMIT) return 1.0;
    if (ret >= -1.0 - DOT_NORM_SNAP_LIMIT && ret <= -1.0 + DOT_NORM_SNAP_LIMIT) return -1.0;

    return ret;
  };
}

function getBaseVector(parent) {
  return class BaseVector extends parent {
    constructor() {
      super(...arguments);

      this.vec = undefined; //for compatibility with old nstructjs-saved files

      //this.xyzw = this.init_swizzle(4);
      //this.xyz = this.init_swizzle(3);
      //this.xy = this.init_swizzle(2);
    }

    static inherit(cls, vectorsize) {
      make_norm_safe_dot(cls);

      var f;

      let vectorDotDistance = "f = function vectorDotDistance(b) {\n";
      for (let i = 0; i < vectorsize; i++) {
        vectorDotDistance += "  let d" + i + " = this[" + i + "]-b[" + i + "];\n\n  ";
      }

      vectorDotDistance += "  return ";
      for (let i = 0; i < vectorsize; i++) {
        if (i > 0) vectorDotDistance += " + ";
        vectorDotDistance += "d" + i + "*d" + i;
      }
      vectorDotDistance += ";\n";
      vectorDotDistance += "};";
      cls.prototype.vectorDotDistance = eval(vectorDotDistance);

      let vectorDistance = "f = function vectorDistance(b) {\n";
      for (let i = 0; i < vectorsize; i++) {
        vectorDistance += `  let d${i} = this[${i}] - (b[${i}]||0);\n\n  `;
        //vectorDistance += "  let d"+i+" = this["+i+"]-(b["+i+"]||0);\n\n  ";
      }

      vectorDistance += "  return Math.sqrt(";
      for (let i = 0; i < vectorsize; i++) {
        if (i > 0) vectorDistance += " + ";
        vectorDistance += "d" + i + "*d" + i;
      }
      vectorDistance += ");\n";
      vectorDistance += "};";
      cls.prototype.vectorDistance = eval(vectorDistance);

      let vectorDistanceSqr = "f = function vectorDistanceSqr(b) {\n";
      for (let i = 0; i < vectorsize; i++) {
        vectorDistanceSqr += `  let d${i} = this[${i}] - (b[${i}]||0);\n\n  `;
        //vectorDistanceSqr += "  let d"+i+" = this["+i+"]-(b["+i+"]||0);\n\n  ";
      }

      vectorDistanceSqr += "  return (";
      for (let i = 0; i < vectorsize; i++) {
        if (i > 0) vectorDistanceSqr += " + ";
        vectorDistanceSqr += "d" + i + "*d" + i;
      }
      vectorDistanceSqr += ");\n";
      vectorDistanceSqr += "};";
      cls.prototype.vectorDistanceSqr = eval(vectorDistanceSqr);

      for (let k in basic_funcs) {
        let func = basic_funcs[k];
        let args = func[0];
        let line = func[1];
        var f;

        let code = "f = function " + k + "(";
        for (let i = 0; i < args.length; i++) {
          if (i > 0) code += ", ";

          line = line.replace(args[i], args[i].toLowerCase());
          code += args[i].toLowerCase();
        }
        code += ") {\n";

        if (func.length > 2) {
          //make summation
          code += "  return ";

          for (let i = 0; i < vectorsize; i++) {
            if (i > 0) code += func[2];

            code += "(" + line.replace(/X/g, "" + i) + ")";
          }
          code += ";\n";
        } else {
          for (let i = 0; i < vectorsize; i++) {
            let line2 = line.replace(/X/g, "" + i);
            code += "  this[" + i + "] = " + line2 + ";\n";
          }
          code += "  return this;\n";
        }

        code += "}\n";

        //console.log(code);
        f = eval(code);

        cls.prototype[k] = f;
        //console.log(k, f);
      }
    }

    copy() {
      return new this.constructor(this);
    }

    load(data) {
      throw new Error("Implement me!");
    }

    init_swizzle(size) {
      let ret = {};
      let cls = size === 4 ? Vector4 : size === 3 ? Vector3 : Vector2;

      for (let k in cls.prototype) {
        let v = cls.prototype[k];
        if (typeof v !== "function" && !(v instanceof Function)) continue;

        ret[k] = v.bind(this);
      }

      return ret;
    }

    vectorLength() {
      return sqrt(this.dot(this));
    }

    swapAxes(axis1, axis2) {
      let t = this[axis1];
      this[axis1] = this[axis2];
      this[axis2] = t;

      return this;
    }

    sinterp(v2, t) {
      let l1 = this.vectorLength();
      let l2 = v2.vectorLength();

      //XXX this seems horribly incorrect.
      return this.interp(v2, t)
        .normalize()
        .mulScalar(l1 + (l2 - l1) * t);
    }

    perpSwap(axis1 = 0, axis2 = 1, sign = 1) {
      let tmp = this[axis1];

      this[axis1] = this[axis2] * sign;
      this[axis2] = -tmp * sign;

      return this;
    }

    normalize() {
      /*
      for (let i=0; i<this.length; i++) {
        if (util.isDenormal(this[i])) {
          console.error("Denormal error", i, this[i]);
          this[i] = 0.0;
        }
      }
      //*/

      let l = this.vectorLength();

      /*
      if (util.isDenormal(l)) {
        console.error("Denormal error", l);
      }
      //*/

      if (l > 0.00000001) {
        this.mulScalar(1.0 / l);
      }

      return this;
    }
  };
}

let _v3nd_n1_normalizedDot, _v3nd_n2_normalizedDot;
let _v3nd4_n1_normalizedDot4, _v3nd4_n2_normalizedDot4;

export function makeVector3(
  BaseVector,
  structName = "vec3",
  structType = "float",
  customConstructorCode = undefined
) {
  var Vector3;
  var bundlehelper = [nstructjs];

  const constructorCode =
    customConstructorCode ??
    `
    constructor(data) {
      super(3);

      if (arguments.length > 1) {
        throw new Error("unexpected argument");
      }

      this[0] = this[1] = this[2] = 0.0;

      if (data !== undefined) {
        this.load(data);
      }

      if (this.constructor === Vector3) {
        Object.preventExtensions(this);
      }
    }
  `;

  const code = `
  let temp1, temp2, temp3, temp4;
  Vector3 = class Vector3 extends BaseVector {
    static STRUCT = bundlehelper[0].inlineRegister(this, \`
    ${structName} {
      0 : ${structType};
      1 : ${structType};
      2 : ${structType};
    }\`);

    ${constructorCode}

    static normalizedDot4(v1, v2, v3, v4) {
      temp1.load(v2).sub(v1).normalize()
      temp2.load(v4).sub(v3).normalize();

      return temp1.dot(temp2);

    }

    static normalizedDot3(v1, center, v2) {
      temp1.load(v1).sub(center).normalize();
      temp2.load(v2).sub(center).normalize();

      return temp1.dot(temp2);
    }

    toCSS() {
      let r = ~~(this[0]*255);
      let g = ~~(this[1]*255);
      let b = ~~(this[2]*255);
      return \`rgb(\${r},\${g},\${b})\`
    }

    load2(b) {
      this[0] = b[0]
      this[1] = b[1]
      return this
    }
      
    loadXYZ(x, y, z) {
      this[0] = x;
      this[1] = y;
      this[2] = z;

      return this;
    }

    loadXY(x, y) {
      this[0] = x;
      this[1] = y;

      return this;
    }

    toJSON() {
      return [this[0], this[1], this[2]];
    }

    loadJSON(obj) {
      return this.load(obj);
    }

    initVector3() {
      this.length = 3;
      this[0] = this[1] = this[2] = 0;
      return this;
    }

    load(data) {
      if (data === undefined)
        return this;

      //if (isNaN(data[0]) || isNaN(data[1]) || isNaN(data[2])) {
      //  throw new Error("NaN");
      //}

      this[0] = data[0];
      this[1] = data[1];
      this[2] = data[2];

      return this;
    }

    dot(b) {
      // acos safe adjustment
      const ret = this[0]*b[0] + this[1]*b[1] + this[2]*b[2];
      if (ret >= 1.0 - DOT_NORM_SNAP_LIMIT && ret <= 1.0 + DOT_NORM_SNAP_LIMIT) return 1.0;
      if (ret >= -1.0 - DOT_NORM_SNAP_LIMIT && ret <= -1.0 + DOT_NORM_SNAP_LIMIT) return -1.0;
      return ret;
    }

    normalizedDot(v) {
      $_v3nd_n1_normalizedDot.load(this);
      $_v3nd_n2_normalizedDot.load(v);
      $_v3nd_n1_normalizedDot.normalize();
      $_v3nd_n2_normalizedDot.normalize();
      return $_v3nd_n1_normalizedDot.dot($_v3nd_n2_normalizedDot);
    }

    mulVecQuat(q) {
      let t0 = -q[1]*this[0] - q[2]*this[1] - q[3]*this[2];
      let t1 = q[0]*this[0] + q[2]*this[2] - q[3]*this[1];
      let t2 = q[0]*this[1] + q[3]*this[0] - q[1]*this[2];

      this[2] = q[0]*this[2] + q[1]*this[1] - q[2]*this[0];
      this[0] = t1;
      this[1] = t2;

      t1 = t0* -q[1] + this[0]*q[0] - this[1]*q[3] + this[2]*q[2];
      t2 = t0* -q[2] + this[1]*q[0] - this[2]*q[1] + this[0]*q[3];

      this[2] = t0* -q[3] + this[2]*q[0] - this[0]*q[2] + this[1]*q[1];
      this[0] = t1;
      this[1] = t2;

      return this;
    }

    multVecMatrix(matrix, ignore_w) {
      if (ignore_w === undefined) {
        ignore_w = false;
      }
      let x = this[0];
      let y = this[1];
      let z = this[2];
      this[0] = matrix.$matrix.m41 + x*matrix.$matrix.m11 + y*matrix.$matrix.m21 + z*matrix.$matrix.m31;
      this[1] = matrix.$matrix.m42 + x*matrix.$matrix.m12 + y*matrix.$matrix.m22 + z*matrix.$matrix.m32;
      this[2] = matrix.$matrix.m43 + x*matrix.$matrix.m13 + y*matrix.$matrix.m23 + z*matrix.$matrix.m33;
      let w = matrix.$matrix.m44 + x*matrix.$matrix.m14 + y*matrix.$matrix.m24 + z*matrix.$matrix.m34;

      if (!ignore_w && w !== 1 && w !== 0 && matrix.isPersp) {
        this[0] /= w;
        this[1] /= w;
        this[2] /= w;
      }
      return w;
    }

    cross(v) {
      let x = this[1]*v[2] - this[2]*v[1];
      let y = this[2]*v[0] - this[0]*v[2];
      let z = this[0]*v[1] - this[1]*v[0];

      this[0] = x;
      this[1] = y;
      this[2] = z;

      return this;
    }

    //axis is optional, 0
    rot2d(A, axis = 0) {
      let x = this[0];
      let y = this[1];

      if (axis === 1) {
        this[0] = x*Math.cos(A) + y*Math.sin(A);
        this[1] = y*Math.cos(A) - x*Math.sin(A);
      } else {
        this[0] = x*Math.cos(A) - y*Math.sin(A);
        this[1] = y*Math.cos(A) + x*Math.sin(A);
      }

      return this;
    }

    preNormalizedAngle(v2) {
      let th = this.dot(v2)*0.99999;
      return Math.acos(th);
    }

    loadSTRUCT(reader: StructReader<this>) {
      reader(this);

      if (typeof this.vec !== "undefined") {
        this.load(this.vec);
        this.vec = undefined;
      }
    }
  }

  temp1 = new Vector3();
  temp2 = new Vector3();
  temp3 = new Vector3();
  temp4 = new Vector3();
  `;

  eval(code);
  return Vector3;
}

import fs from "fs";
import { Matrix4 } from "./matrix4";
import { IndexRange } from "./indexRange";
import { Matrix4Code } from "./matrix4Code";

function basicDotFuncs(vecsize: number, VArg: string) {
  let s = "";
  let vectorDotDistance = `    vectorDotDistance(b: ${VArg}): number {\n`;
  for (let i = 0; i < vecsize; i++) {
    vectorDotDistance += `      const d${i} = this[${i}] - b[${i}];\n`;
  }

  vectorDotDistance += "      return ";
  for (let i = 0; i < vecsize; i++) {
    if (i > 0) vectorDotDistance += " + ";
    vectorDotDistance += "d" + i + "*d" + i;
  }
  vectorDotDistance += ";\n";
  vectorDotDistance += "    }\n\n";

  s += vectorDotDistance;

  let vectorDistance = `    vectorDistance(b: ${VArg}): number {\n`;
  for (let i = 0; i < vecsize; i++) {
    vectorDistance += `      const d${i} = this[${i}] - (b[${i}] ?? 0);\n`;
  }

  vectorDistance += "      return Math.sqrt(";
  for (let i = 0; i < vecsize; i++) {
    if (i > 0) vectorDistance += " + ";
    vectorDistance += "d" + i + "*d" + i;
  }
  vectorDistance += ");\n";
  vectorDistance += "    }\n\n";
  s += vectorDistance;

  let vectorDistanceSqr = `    vectorDistanceSqr(b: ${VArg}): number {\n`;
  for (let i = 0; i < vecsize; i++) {
    vectorDistanceSqr += `      const d${i} = this[${i}] - (b[${i}] ?? 0);\n`;
    //vectorDistanceSqr += "  let d"+i+" = this["+i+"]-(b["+i+"]||0);\n\n  ";
  }

  vectorDistanceSqr += "      return (";
  for (let i = 0; i < vecsize; i++) {
    if (i > 0) vectorDistanceSqr += " + ";
    vectorDistanceSqr += "d" + i + "*d" + i;
  }
  vectorDistanceSqr += ");\n";
  vectorDistanceSqr += "    }";
  s += vectorDistanceSqr;

  return s;
}
function genBase(name: string, vecsize: number) {
  const VArg = `IBaseVector<${vecsize}>`;

  function unroll(s: string, char = "\n", offset = 0, count = vecsize) {
    let s1 = "";
    let axes = "xyzw";
    for (let i = 0; i < count; i++) {
      s1 +=
        s
          .replace(/\$\$/g, "" + (i + offset))
          .replace(/\$\!/g, "" + (i + 1 + offset))
          .replace(/\$X/g, axes[i]) + char;
    }
    // chop off trailing char
    return s1.slice(0, -1);
  }

  function unrollJoin(s: string, char = "\n", count = vecsize) {
    let arr = [] as string[];
    let axes = "xyzw";
    for (let i = 0; i < count; i++) {
      arr.push(s.replace(/\$\$/g, "" + i).replace(/\$X/g, axes[i]));
    }
    return arr.join(char);
  }

  // method level indent
  let mTab = "      ";
  // class level indent
  let cTab = "    ";

  let basicFuncs = "";
  for (let k in basic_funcs) {
    let func = basic_funcs[k];
    let args = func[0];
    let line = func[1];
    var f;

    let code = `    ${k}(`;
    for (let i = 0; i < args.length; i++) {
      let arg = args[i];
      let type = arg === "vb" ? `${VArg}` : "number";
      arg = (arg === "vb" ? "b" : arg).toLowerCase();

      if (i > 0) code += ", ";

      line = line.replace(args[i], arg);
      code += `${arg.toLowerCase()}: ${type}`;
    }
    code += ") {\n";

    if (func.length > 2) {
      //make summation
      code += mTab + "return ";

      for (let i = 0; i < vecsize; i++) {
        if (i > 0) code += ` ${func[2]} `;

        code += "(" + line.replace(/X/g, "" + i) + ")";
      }
      code += ";\n";
    } else {
      for (let i = 0; i < vecsize; i++) {
        let line2 = line.replace(/X/g, "" + i);
        code += mTab + "this[" + i + "] = " + line2 + ";\n";
      }
      code += `${mTab}return this;\n`;
    }

    code += `${cTab}}\n\n`;
    basicFuncs += code;
  }

  const indexType = unroll("$$").split("\n").join("|");
  //let VArgS = `VectorLikeOrHigher<${vecsize}, Vector${vecsize}>`

  let s = "";
  s += `
function create${name}${vecsize}(parent: typeof Array | typeof Float32Array, structName?: string) {
  return class ${name}${vecsize} extends parent {
    [k: number]: number | undefined

${unroll("    $$: number;")}
    // this is set by the parent class
    declare length: number
    
    //phantom type helper
    declare LEN: ${vecsize}
    
    [Symbol.iterator] = parent.prototype[Symbol.iterator];
    slice = parent.prototype.slice as (start?: number, end?: number) => number[];

    static structName = structName;
    static STRUCT = structName !== undefined ? nstructjs.inlineRegister(this, \`
    \${structName} {
${unroll("      $$: double;")}
    }\`) : undefined;
    
    static normalizedDot4(v1: ${VArg}, v2: ${VArg}, v3: ${VArg}, v4: ${VArg}) {
${unroll(`      let d$X1 = v2[$$] - v1[$$];`)}
${unroll(`      let d$X2 = v4[$$] - v3[$$];`)}
      // normalize
      let l1 = Math.sqrt(${unrollJoin("d$X1*d$X1", " + ")})
      let l2 = Math.sqrt(${unrollJoin("d$X2*d$X2", " + ")})

      // normalize
      l1 = l1 > 0.0000001 ? 1.0 / l1 : 0.0
      l2 = l2 > 0.0000001 ? 1.0 / l2 : 0.0
${unroll(`      d$X1 *= l1;`)}
${unroll(`      d$X1 *= l1;`)}
  
      return ${unrollJoin(`d$X1*d$X2`, " + ")};
    }

    static normalizedDot3(v1: ${VArg}, center: ${VArg}, v2: ${VArg}) {
${unroll(`      let d$X1 = v1[$$] - center[$$];`)}
${unroll(`      let d$X2 = v2[$$] - center[$$];`)}
      // normalize
      let l1 = Math.sqrt(${unrollJoin("d$X1*d$X1", " + ")})
      let l2 = Math.sqrt(${unrollJoin("d$X2*d$X2", " + ")})

      // normalize
      l1 = l1 > 0.0000001 ? 1.0 / l1 : 0.0
      l2 = l2 > 0.0000001 ? 1.0 / l2 : 0.0
${unroll(`      d$X1 *= l1;`)}
${unroll(`      d$X1 *= l1;`)}
  
      return ${unrollJoin(`d$X1*d$X2`, " + ")};
    }

    constructor(existing?: number[] | ${VArg}) {
      super(${vecsize});
      if (existing !== undefined) {
${unroll(`${mTab}  this[$$] = existing[$$] ?? 0.0;`)}
      } else {
${unroll(`${mTab}  this[$$] = 0;`)}
      }
    }

    load(existing: number[] | ${VArg}): this {
${unroll(`${mTab}this[$$] = existing[$$];`)}
      return this;
    }

// load2/3/4 methods
${Array.from(IndexRange(vecsize - 1))
  .map((i) => {
    return `
    load${i + 2}(existing: number[] | IBaseVector<${i + 2}>): this {
${unroll(`${mTab}this[$$] = existing[$$];`, undefined, undefined, i + 2)}
      return this
    }
  `;
  })
  .join("\n")}

    normalizedDot(b: ${VArg}): number {
      const l = this.vectorLength() * b.vectorLength();
      return l > 0.00000001 ? this.dot(b) / l : 0.0;
    }
${basicFuncs}${basicDotFuncs(vecsize, VArg)}
    copy() {
      return new ${name}${vecsize}(this);
    }
    vectorLengthSqr(): number {
      return this.dot(this)
    }
    vectorLength(): number {
      return Math.sqrt(this.dot(this));
    }
    rot2d(A: number, axis: number = 0) {
      let x = this[0];
      let y = this[1];

      if (axis === 1) {
        this[0] = x * Math.cos(A) + y * Math.sin(A);
        this[1] = y * Math.cos(A) - x * Math.sin(A);
      } else {
        this[0] = x * Math.cos(A) - y * Math.sin(A);
        this[1] = y * Math.cos(A) + x * Math.sin(A);
      }
      return this;
    }
    dot(b: ${VArg}): number {
      const ret = ${unrollJoin("this[$$]*b[$$]", " + ")};
      // acos safe adjustment to prevent math domain errors
      if (ret >= 1.0 - DOT_NORM_SNAP_LIMIT && ret <= 1.0 + DOT_NORM_SNAP_LIMIT) return 1.0;
      if (ret >= -1.0 - DOT_NORM_SNAP_LIMIT && ret <= -1.0 + DOT_NORM_SNAP_LIMIT) return -1.0;
      return ret;
    }
    
${Array.from(IndexRange(vecsize) as Iterable<number>)
  .map((i) => {
    let s2 = "";
    let axes = "XYZW";
    s2 += `    load${axes.slice(0, i + 1)}`;
    s2 += "(";
    s2 += Array.from(axes)
      .slice(0, i + 1)
      .map((a) => a.toLowerCase() + ": number")
      .join(", ");
    s2 += ") {\n";
    s2 +=
      Array.from(axes)
        .slice(0, i + 1)
        .map((a, j) => `      this[${j}] = ${a.toLowerCase()}`)
        .join("\n") + "\n";
    s2 += "      return this\n";
    s2 += "    }";
    return "    " + s2.trim();
  })
  .join("\n")}

    swapAxes(axis1: ${indexType}, axis2: ${indexType}) {
      const t = this[axis1];
      this[axis1] = this[axis2];
      this[axis2] = t;
      return this;
    }

    /** somewhat crappy spherical interpolation */
    sinterp(v2: ${VArg}, t: number) {
      let l1 = this.vectorLength();
      let l2 = v2.vectorLength();

      //XXX this seems horribly incorrect.
      return this.interp(v2, t)
        .normalize()
        .mulScalar(l1 + (l2 - l1) * t);
    }

    /** perpendicular swap */
    perpSwap(axis1: ${indexType} = 0, axis2: ${indexType} = 1, sign = 1) {
      let tmp = this[axis1];
      this[axis1] = this[axis2] * sign;
      this[axis2] = -tmp * sign;
      return this;
    }

    normalize(): this {
      const l = this.vectorLength();
      if (l > 0.00000001) {
        this.mulScalar(1.0 / l);
      }
      return this;
    }
${matrixVecMults[vecsize as keyof typeof matrixVecMults]}
${vecQuatMults[vecsize as keyof typeof vecQuatMults]}
${
  vecsize > 2
    ? `
    cross(v: ${VArg}) {
      const x = this[1] * v[2] - this[2] * v[1];
      const y = this[2] * v[0] - this[0] * v[2];
      const z = this[0] * v[1] - this[1] * v[0];

      this[0] = x;
      this[1] = y;
      this[2] = z;

      return this;
    }
`
    : ""
}
    preNormalizedAngle(v2: ${VArg}) {
      let th = this.dot(v2) * 0.99999;
      return Math.acos(th);
    }
${
  vecsize === 3
    ? `
    toCSS() {
      let r = ~~(this[0]*255);
      let g = ~~(this[1]*255);
      let b = ~~(this[2]*255);
      return \`rgb(\${r},\${g},\${b})\`
    }
`
    : ``
}${
    vecsize === 4
      ? `
    toCSS() {
      let r = ~~(this[0]*255);
      let g = ~~(this[1]*255);
      let b = ~~(this[2]*255);
      return \`rgb(\${r},\${g},\${b},\${this[3]})\`
    }
`
      : ``
  }
    loadSTRUCT(reader: StructReader<this>) {
      reader(this);
    }
  }
}
  `;
  return s;
}

function genCode() {
  let s = "";

  s +=
    `
// generated by genVectormath.ts
import nstructjs from "./struct";
import type { StructReader } from "./nstructjs";
import * as util from "./util";

let vec_temp_mats: util.cachering<Matrix4>

const DOT_NORM_SNAP_LIMIT = 0.00000000001;
const FLT_EPSILON = 2.22e-16;

export type VectorLike<LEN extends 0 | 1 | 2 | 3 | 4> = {
  //[P: number]: never;
  0: LEN extends 1 | 2 | 3 | 4 ? number : never;
  1?: LEN extends 2 | 3 | 4 ? number : never;
  2?: LEN extends 3 | 4 ? number : never;
  3?: LEN extends 4 ? number : never;
  length: number;
};

declare interface IOpenNumVector {
  [k: number]: number;
  length: number;
}

type indexUnions = { 0: never; 1: 0; 2: 0 | 1; 3: 0 | 1 | 2; 4: 0 | 1 | 2 | 3 };
type strNumMap = { "0": 0; "1": 1; "2": 2; "3": 3; "4": 4 };

export type INumVectorLimited<LEN extends 0 | 1 | 2 | 3 | 4> = {
  //[P: number]: never;
  0: LEN extends 1 | 2 | 3 | 4 ? number : never;
  1?: LEN extends 2 | 3 | 4 ? number : never;
  2?: LEN extends 3 | 4 ? number : never;
  3?: LEN extends 4 ? number : never;
  length: number;
};

declare type INumVector = IOpenNumVector | INumVectorLimited<2> | INumVectorLimited<3> | INumVectorLimited<4>;

export type IndexUnion<L extends 0 | 1 | 2 | 3 | 4> = indexUnions[L];

//type indexUnions = { 2: 0 | 1, 3: 0 | 1 | 2, 4: 0 | 1 | 2 | 3 };

export type Number1 = 0;
export type Number2 = 0 | 1;
export type Number3 = 0 | 1 | 2;
export type Number4 = 0 | 1 | 2 | 3;
export type Number5 = 0 | 1 | 2 | 3 | 4;

type numlits = { 1: 1; 2: 2 | 3 | 4; 3: 3 | 4; 4: 4 };
export type NumLitHigher<L extends 1 | 2 | 3 | 4> = numlits[L];

type helper1 = [never, never, 0 | 1, 0 | 1 | 2, 0 | 1 | 2 | 3]
type IBaseBase<LEN extends 2 | 3 | 4> = {
  [k in 0 | 1 | 2 | 3 as k extends helper1[LEN] ? k : never]: number
} & {
  [k in 0 | 1 | 2 | 3 as k extends helper1[LEN] ? never : k]?: number
}

/**
 * By design vectors do not have a simple index signature.
 * Instead, indices up to LEN type to number, while indices above
 * LEN type to number | undefined.
 *
 * This is to prevent mixing of incompatible vectors.
 *
 * This can create problems with iteration, for example:
 *
 * \`\`\`ts
 * let v = new Vector3()
 * for (let i=0; i<3; i++) {
 *   // will not work
 *   v[i] = i
 *   // will work
 *   v[i] = i as Number3
 * }
 *
 * //alternative with IndexRange:
 * for (const i of IndexRange(3)) {
 *   v[i] = i
 * }
 * \`\`\`
 */
export type IBaseVector<LEN extends 2 | 3 | 4, ArrayType = Array<number>> = IBaseBase<LEN> & {
  length: number

  // for indices above LEN, type to number | undefined
  [k: number]: number | undefined

  [Symbol.iterator](): Iterator<number>
  slice(start?: number, end?: number): number[]

  sinterp(b: IBaseVector<LEN>, t: number): IBaseVector<LEN>

  perpSwap(axis1?: number, axis2?: number, sign?: number): IBaseVector<LEN>

  //all math operates in-place, no new objects
  load(b: IBaseVector<LEN> | INumVector): IBaseVector<LEN>

  loadXY(x: number, y: number): IBaseVector<LEN>

  copy(): IBaseVector<LEN>

  add(b: IBaseVector<LEN>): IBaseVector<LEN>
  sub(b: IBaseVector<LEN>): IBaseVector<LEN>
  mul(b: IBaseVector<LEN>): IBaseVector<LEN>
  div(b: IBaseVector<LEN>): IBaseVector<LEN>
  addScalar(b: number): IBaseVector<LEN>
  subScalar(b: number): IBaseVector<LEN>
  mulScalar(b: number): IBaseVector<LEN>
  divScalar(b: number): IBaseVector<LEN>
  minScalar(b: number): IBaseVector<LEN>
  maxScalar(b: number): IBaseVector<LEN>
  min(b: IBaseVector<LEN>): IBaseVector<LEN>
  max(b: IBaseVector<LEN>): IBaseVector<LEN>
  floor(): IBaseVector<LEN>
  fract(): IBaseVector<LEN>
  ceil(): IBaseVector<LEN>
  abs(): IBaseVector<LEN>
  dot(b: IBaseVector<LEN>): number
  normalizedDot(b: IBaseVector<3>): number
  normalize(): IBaseVector<LEN>
  vectorLength(): number
  vectorLengthSqr(): number
  vectorDistance(b: IBaseVector<LEN>): number
  vectorDistanceSqr(b: IBaseVector<LEN>): number
  multVecMatrix(mat: Matrix4): void
  interp(b: IBaseVector<LEN>, fac: number): IBaseVector<LEN>
  addFac(b: IBaseVector<LEN>, fac: number): IBaseVector<LEN>
  rot2d(th: number, axis?: number | undefined): IBaseVector<LEN>
  zero(): IBaseVector<LEN>
  negate(): IBaseVector<LEN>
  swapAxes(axis1: number, axis2: number): IBaseVector<LEN>
}


/** @deprecated use IBaseVector directly */
export type VectorLikeOrHigher<LEN extends 2 | 3 | 4, Type = never> = IBaseVector<LEN>
/** @deprecated use IBaseVector directly */
export type IVectorOrHigher<LEN extends 2 | 3 | 4, Type = never> = VectorLikeOrHigher<LEN, Type>

export type IQuat = IBaseVector<4> & {
  axisAngleToQuat(axis: IBaseVector<3>, angle: number): IQuat;
  toMatrix(output?: Matrix4): Matrix4;
};

export interface IVector2 extends IBaseVector<2> {
  load2(b: IBaseVector<2> | number[]): this;
}

export interface IVector3 extends IBaseVector<3> {
  loadXYZ(x: number, y: number, z: number): this;

  cross(b: IBaseVector<3>): this;
  load2(b: IBaseVector<2> | number[]): this;
  load3(b: IBaseVector<3> | number[]): this;
}

export interface IVector4 extends IBaseVector<4> {
  loadXYZ(x: number, y: number, z: number): this;
  loadXYZW(x: number, y: number, z: number, w: number): this;

  load2(b: IBaseVector<2> | number[]): this;
  load3(b: IBaseVector<3> | number[]): this;
  load4(b: IBaseVector<4> | number[]): this;

  cross(b: IBaseVector<4>): this;
}


export declare interface IVectorConstructor<Type, LEN extends 2 | 3 | 4 = 3> {
  new (value?: number[] | Type | IBaseVector<LEN>): Type;

  /** |(a - center)| dot |(b - center)| */
  normalizedDot3(
    a: IBaseVector<LEN>,
    center: IBaseVector<LEN>,
    b: IBaseVector<LEN>
  ): number;

  /** |(b - a)| dot |(d - c)| */
  normalizedDot4(
    a: IBaseVector<LEN>,
    b: IBaseVector<LEN>,
    c: IBaseVector<LEN>,
    d: IBaseVector<LEN>
  ): number;

  structName?: string;
  STRUCT?: string;
}

const M_SQRT2 = Math.SQRT2
const PI = Math.PI

  `.trim() + "\n";

  for (let i = 2; i <= 4; i++) {
    s += genBase("Vector", i);
  }

  s += `
export const Vector2 = createVector2(Array, 'vec2');
export const Vector3 = createVector3(Array, 'vec3');
export const Vector4 = createVector4(Array, 'vec4');
export type Vector2 = InstanceType<typeof Vector2>;
export type Vector3 = InstanceType<typeof Vector3>;
export type Vector4 = InstanceType<typeof Vector4>;

const _quat_vs3_temps = util.cachering.fromConstructor(Vector3, 64);

export class Quat extends Vector4 {
  makeUnitQuat(): this {
    this[0] = 1.0;
    this[1] = this[2] = this[3] = 0.0;
    return this;
  }

  isZero(): boolean {
    return this[0] === 0 && this[1] === 0 && this[2] === 0 && this[3] === 0;
  }

  mulQuat(qt: this) {
    let a = this[0] * qt[0] - this[1] * qt[1] - this[2] * qt[2] - this[3] * qt[3];
    let b = this[0] * qt[1] + this[1] * qt[0] + this[2] * qt[3] - this[3] * qt[2];
    let c = this[0] * qt[2] + this[2] * qt[0] + this[3] * qt[1] - this[1] * qt[3];
    this[3] = this[0] * qt[3] + this[3] * qt[0] + this[1] * qt[2] - this[2] * qt[1];
    this[0] = a;
    this[1] = b;
    this[2] = c;
    return this;
  }

  conjugate(): this {
    this[1] = -this[1];
    this[2] = -this[2];
    this[3] = -this[3];
    return this;
  }

  dotWithQuat(q2: this) {
    return this[0] * q2[0] + this[1] * q2[1] + this[2] * q2[2] + this[3] * q2[3];
  }

  canInvert(): boolean {
    return this.dot(this) !== 0.0
  }

  invert(): this {
    let f = this.dot(this);
    if (f === 0.0) return this;

    this.mulScalar(1.0 / f);
    return this;
  }

  sub(q2: this): this {
    let nq2 = new Quat();

    nq2[0] = -q2[0];
    nq2[1] = q2[1];
    nq2[2] = q2[2];
    nq2[3] = q2[3];

    this.mul(nq2 as this);
    return this
  }

  /** if m is not undefined, will be used as output */
  toMatrix(m?: Matrix4): Matrix4 {
    if (m === undefined) {
      m = new Matrix4();
    }

    let q0 = M_SQRT2 * this[0];
    let q1 = M_SQRT2 * this[1];
    let q2 = M_SQRT2 * this[2];
    let q3 = M_SQRT2 * this[3];
    let qda = q0 * q1;
    let qdb = q0 * q2;
    let qdc = q0 * q3;
    let qaa = q1 * q1;
    let qab = q1 * q2;
    let qac = q1 * q3;
    let qbb = q2 * q2;
    let qbc = q2 * q3;
    let qcc = q3 * q3;
    m.$matrix.m11 = 1.0 - qbb - qcc;
    m.$matrix.m12 = qdc + qab;
    m.$matrix.m13 = -qdb + qac;
    m.$matrix.m14 = 0.0;
    m.$matrix.m21 = -qdc + qab;
    m.$matrix.m22 = 1.0 - qaa - qcc;
    m.$matrix.m23 = qda + qbc;
    m.$matrix.m24 = 0.0;
    m.$matrix.m31 = qdb + qac;
    m.$matrix.m32 = -qda + qbc;
    m.$matrix.m33 = 1.0 - qaa - qbb;
    m.$matrix.m34 = 0.0;
    m.$matrix.m41 = m.$matrix.m42 = m.$matrix.m43 = 0.0;
    m.$matrix.m44 = 1.0;

    return m;
  }

  matrixToQuat(wmat: Matrix4): this {
    let mat = vec_temp_mats.next();
    mat.load(wmat);

    mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
    mat.$matrix.m44 = 1.0;

    let r1 = new Vector3([mat.$matrix.m11, mat.$matrix.m12, mat.$matrix.m13]);
    let r2 = new Vector3([mat.$matrix.m21, mat.$matrix.m22, mat.$matrix.m23]);
    let r3 = new Vector3([mat.$matrix.m31, mat.$matrix.m32, mat.$matrix.m33]);

    r1.normalize();
    r2.normalize();
    r3.normalize();

    mat.$matrix.m11 = r1[0];
    mat.$matrix.m12 = r1[1];
    mat.$matrix.m13 = r1[2];
    mat.$matrix.m21 = r2[0];
    mat.$matrix.m22 = r2[1];
    mat.$matrix.m23 = r2[2];
    mat.$matrix.m31 = r3[0];
    mat.$matrix.m32 = r3[1];
    mat.$matrix.m33 = r3[2];
    let tr = 0.25 * (1.0 + mat.$matrix.m11 + mat.$matrix.m22 + mat.$matrix.m33);
    let s = 0;
    if (tr > FLT_EPSILON) {
      s = Math.sqrt(tr);
      this[0] = s;
      s = 1.0 / (4.0 * s);
      this[1] = (mat.$matrix.m23 - mat.$matrix.m32) * s;
      this[2] = (mat.$matrix.m31 - mat.$matrix.m13) * s;
      this[3] = (mat.$matrix.m12 - mat.$matrix.m21) * s;
    } else {
      if (mat.$matrix.m11 > mat.$matrix.m22 && mat.$matrix.m11 > mat.$matrix.m33) {
        s = 2.0 * Math.sqrt(1.0 + mat.$matrix.m11 - mat.$matrix.m22 - mat.$matrix.m33);
        this[1] = 0.25 * s;
        s = 1.0 / s;
        this[0] = (mat.$matrix.m32 - mat.$matrix.m23) * s;
        this[2] = (mat.$matrix.m21 + mat.$matrix.m12) * s;
        this[3] = (mat.$matrix.m31 + mat.$matrix.m13) * s;
      } else if (mat.$matrix.m22 > mat.$matrix.m33) {
        s = 2.0 * Math.sqrt(1.0 + mat.$matrix.m22 - mat.$matrix.m11 - mat.$matrix.m33);
        this[2] = 0.25 * s;
        s = 1.0 / s;
        this[0] = (mat.$matrix.m31 - mat.$matrix.m13) * s;
        this[1] = (mat.$matrix.m21 + mat.$matrix.m12) * s;
        this[3] = (mat.$matrix.m32 + mat.$matrix.m23) * s;
      } else {
        s = 2.0 * Math.sqrt(1.0 + mat.$matrix.m33 - mat.$matrix.m11 - mat.$matrix.m22);
        this[3] = 0.25 * s;
        s = 1.0 / s;
        this[0] = (mat.$matrix.m21 - mat.$matrix.m12) * s;
        this[1] = (mat.$matrix.m31 + mat.$matrix.m13) * s;
        this[2] = (mat.$matrix.m32 + mat.$matrix.m23) * s;
      }
    }
    this.normalize();
    return this;
  }

  normalize() {
    let len = Math.sqrt(this.dot(this));

    if (len !== 0.0) {
      this.mulScalar(1.0 / len);
    } else {
      this[1] = 1.0;
      this[0] = this[2] = this[3] = 0.0;
    }
    return this;
  }

  axisAngleToQuat(axis: IBaseVector<3>, angle: number) {
    let nor = _quat_vs3_temps.next().load(axis);
    nor.normalize();

    if (nor.dot(nor) !== 0.0) {
      let phi = angle / 2.0;
      let si = Math.sin(phi);
      this[0] = Math.cos(phi);
      this[1] = nor[0] * si;
      this[2] = nor[1] * si;
      this[3] = nor[2] * si;
    } else {
      this.makeUnitQuat();
    }

    return this;
  }

  rotationBetweenVecs(v1_: IBaseVector<3>, v2_: IBaseVector<3>, fac = 1.0) {
    const v1 = new Vector3(v1_);
    const v2 = new Vector3(v2_);
    v1.normalize();
    v2.normalize();

    if (Math.abs(v1.dot(v2)) > 0.9999) {
      this.makeUnitQuat();
      return this;
    }

    let axis = new Vector3(v1);
    axis.cross(v2);

    let angle = v1.preNormalizedAngle(v2) * fac;
    this.axisAngleToQuat(axis, angle);

    return this;
  }

  quatInterp(quat2: this, t: number) {
    let quat = new Quat();
    let cosom = this[0] * quat2[0] + this[1] * quat2[1] + this[2] * quat2[2] + this[3] * quat2[3];
    if (cosom < 0.0) {
      cosom = -cosom;
      quat[0] = -this[0];
      quat[1] = -this[1];
      quat[2] = -this[2];
      quat[3] = -this[3];
    } else {
      quat[0] = this[0];
      quat[1] = this[1];
      quat[2] = this[2];
      quat[3] = this[3];
    }

    let omega, sinom, sc1, sc2;
    if (1.0 - cosom > 0.0001) {
      omega = Math.acos(cosom);
      sinom = Math.sin(omega);
      sc1 = Math.sin((1.0 - t) * omega) / sinom;
      sc2 = Math.sin(t * omega) / sinom;
    } else {
      sc1 = 1.0 - t;
      sc2 = t;
    }
    this[0] = sc1 * quat[0] + sc2 * quat2[0];
    this[1] = sc1 * quat[1] + sc2 * quat2[1];
    this[2] = sc1 * quat[2] + sc2 * quat2[2];
    this[3] = sc1 * quat[3] + sc2 * quat2[3];

    return this;
  }
}

Quat.STRUCT =
  nstructjs.inherit(Quat, Vector4, "quat") +
  \`
}\`;
nstructjs.register(Quat);`;
  s += Matrix4Code;
  s += `vec_temp_mats = util.cachering.fromConstructor(Matrix4, 64);\n`;
  s += `


export type VectorArg<V extends Vector2 | Vector3 | Vector4 | Quat, N extends 2 | 3 | 4> = VectorLikeOrHigher<N, V>

export type Vector2Like = VectorArg<Vector2, 2>
export type Vector3Like = VectorArg<Vector3, 3>
export type Vector4Like = VectorArg<Vector4, 4>

// static assert that Vectors convert to IBaseVectors
// since we can't use 'implements' keyword in mixins
type AssertVectorIBaseVector<N extends 2 | 3 | 4, V extends IBaseVector<N>> = V
type A = AssertVectorIBaseVector<2, Vector2>
type B = AssertVectorIBaseVector<3, Vector3>
type C = AssertVectorIBaseVector<4, Vector4>
type D = AssertVectorIBaseVector<4, Quat>

`;

  console.log(s);
  fs.writeFileSync("vectormath.ts", s);
}
genCode();
