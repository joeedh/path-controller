function _class_call_check(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}
function _defineProperties(target, props) {
    for(var i = 0; i < props.length; i++){
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
    }
}
function _create_class(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
}
function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
function _instanceof(left, right) {
    "@swc/helpers - instanceof";
    if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) {
        return !!right[Symbol.hasInstance](left);
    } else {
        return left instanceof right;
    }
}
function _type_of(obj) {
    "@swc/helpers - typeof";
    return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj;
}
/** Incredibly old matrix class. */ import * as util from "./util";
var Vector3Cls;
var Vector4Cls;
export var EulerOrders = {
    XYZ: 0,
    XZY: 1,
    YXZ: 2,
    YZX: 3,
    ZXY: 4,
    ZYX: 5
};
var lookat_cache_vs3;
var lookat_cache_vs4;
var lookat_cache_ms;
var euler_rotate_mats;
var makenormalcache;
var temp_mats;
var preMultTemp;
var internal_matrix = function internal_matrix() {
    "use strict";
    _class_call_check(this, internal_matrix);
    _define_property(this, "m11", void 0);
    _define_property(this, "m12", void 0);
    _define_property(this, "m13", void 0);
    _define_property(this, "m14", void 0);
    _define_property(this, "m21", void 0);
    _define_property(this, "m22", void 0);
    _define_property(this, "m23", void 0);
    _define_property(this, "m24", void 0);
    _define_property(this, "m31", void 0);
    _define_property(this, "m32", void 0);
    _define_property(this, "m33", void 0);
    _define_property(this, "m34", void 0);
    _define_property(this, "m41", void 0);
    _define_property(this, "m42", void 0);
    _define_property(this, "m43", void 0);
    _define_property(this, "m44", void 0);
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
};
export var Matrix4 = /*#__PURE__*/ function() {
    "use strict";
    function Matrix4(m) {
        _class_call_check(this, Matrix4);
        _define_property(this, "$matrix", void 0);
        _define_property(this, "isPersp", void 0);
        this.$matrix = new internal_matrix();
        this.isPersp = false;
        if ((typeof m === "undefined" ? "undefined" : _type_of(m)) === "object") {
            if ("length" in m && m.length >= 16) {
                this.load(m);
            } else if (_instanceof(m, Matrix4)) {
                this.load(m);
            }
        }
    }
    _create_class(Matrix4, [
        {
            key: "copy",
            value: function copy() {
                return this.clone();
            }
        },
        {
            key: "clone",
            value: function clone() {
                return new Matrix4(this);
            }
        },
        {
            key: "addToHashDigest",
            value: function addToHashDigest(hash) {
                var m = this.$matrix;
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
        },
        {
            key: "equals",
            value: function equals(m) {
                var m1 = this.$matrix;
                var m2 = m.$matrix;
                var ok = true;
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
        },
        {
            key: "loadColumn",
            value: function loadColumn(i, vec) {
                var m = this.$matrix;
                var have4 = vec.length > 3;
                switch(i){
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
        },
        {
            key: "copyColumnTo",
            value: function copyColumnTo(i, vec) {
                var m = this.$matrix;
                var have4 = vec.length > 3;
                switch(i){
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
        },
        {
            key: "copyColumn",
            value: function copyColumn(i) {
                return this.copyColumnTo(i, new Array(4));
            }
        },
        {
            key: "load",
            value: function load(b) {
                if (arguments.length === 1 && _type_of(arguments[0]) === "object") {
                    var matrix;
                    if (_instanceof(arguments[0], Matrix4)) {
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
        },
        {
            key: "toJSON",
            value: function toJSON() {
                return {
                    isPersp: this.isPersp,
                    items: this.getAsArray()
                };
            }
        },
        {
            key: "getAsArray",
            value: function getAsArray() {
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
                    this.$matrix.m44
                ];
            }
        },
        {
            key: "getAsFloat32Array",
            value: function getAsFloat32Array() {
                return new Float32Array(this.getAsArray());
            }
        },
        {
            key: "setUniform",
            value: function setUniform(ctx, loc) {
                var transpose = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
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
                Matrix4.setUniformWebGLArray.set(Matrix4.setUniformArray);
                ctx.uniformMatrix4fv(loc, transpose, Matrix4.setUniformWebGLArray);
                return this;
            }
        },
        {
            key: "makeIdentity",
            value: function makeIdentity() {
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
        },
        {
            key: "transpose",
            value: function transpose() {
                var tmp = this.$matrix.m12;
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
        },
        {
            key: "determinant",
            value: function determinant() {
                return this._determinant4x4();
            }
        },
        {
            key: "invert",
            value: function invert() {
                var det = this._determinant4x4();
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
        },
        {
            key: "translate",
            value: function translate(x, y, z) {
                if ((typeof x === "undefined" ? "undefined" : _type_of(x)) === "object" && "length" in x) {
                    var t = x;
                    x = t[0];
                    y = t[1];
                    z = t[2];
                }
                x = x === undefined ? 0 : x;
                y = y === undefined ? 0 : y;
                z = z === undefined ? 0 : z;
                var matrix = temp_mats.next().makeIdentity();
                matrix.$matrix.m41 = x;
                matrix.$matrix.m42 = y;
                matrix.$matrix.m43 = z;
                this.multiply(matrix);
                return this;
            }
        },
        {
            key: "preTranslate",
            value: function preTranslate(x, y, z) {
                if ((typeof x === "undefined" ? "undefined" : _type_of(x)) === "object" && "length" in x) {
                    var t = x;
                    x = t[0];
                    y = t[1];
                    z = t[2];
                }
                x = x === undefined ? 0 : x;
                y = y === undefined ? 0 : y;
                z = z === undefined ? 0 : z;
                var matrix = temp_mats.next().makeIdentity();
                matrix.$matrix.m41 = x;
                matrix.$matrix.m42 = y;
                matrix.$matrix.m43 = z;
                this.preMultiply(matrix);
                return this;
            }
        },
        {
            key: "scale",
            value: function scale(x, y, z) {
                var w = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : 1.0;
                if ((typeof x === "undefined" ? "undefined" : _type_of(x)) === "object" && "length" in x) {
                    var t = x;
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
                var matrix = temp_mats.next().makeIdentity();
                matrix.$matrix.m11 = x;
                matrix.$matrix.m22 = y;
                matrix.$matrix.m33 = z;
                matrix.$matrix.m44 = w;
                this.multiply(matrix);
                return this;
            }
        },
        {
            key: "preScale",
            value: function preScale(x, y, z) {
                var w = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : 1.0;
                var mat = temp_mats.next().makeIdentity();
                mat.scale(x, y, z, w);
                this.preMultiply(mat);
                return this;
            }
        },
        {
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

  */ key: "euler_rotate_order",
            value: function euler_rotate_order(x, y, z) {
                var order = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : EulerOrders.XYZ;
                if (y === undefined) {
                    y = 0.0;
                }
                if (z === undefined) {
                    z = 0.0;
                }
                x = -x;
                y = -y;
                z = -z;
                var xmat = euler_rotate_mats.next().makeIdentity();
                var m = xmat.$matrix;
                var c = Math.cos(x), s = Math.sin(x);
                m.m22 = c;
                m.m23 = s;
                m.m32 = -s;
                m.m33 = c;
                var ymat = euler_rotate_mats.next().makeIdentity();
                c = Math.cos(y);
                s = Math.sin(y);
                m = ymat.$matrix;
                m.m11 = c;
                m.m13 = -s;
                m.m31 = s;
                m.m33 = c;
                var zmat = euler_rotate_mats.next().makeIdentity();
                c = Math.cos(z);
                s = Math.sin(z);
                m = zmat.$matrix;
                m.m11 = c;
                m.m12 = s;
                m.m21 = -s;
                m.m22 = c;
                var a, b, cmat;
                switch(order){
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
                b.preMultiply(cmat);
                b.multiply(a);
                this.preMultiply(b);
                return this;
            }
        },
        {
            key: "euler_rotate",
            value: function euler_rotate(x, y, z) {
                if (y === undefined) {
                    y = 0.0;
                }
                if (z === undefined) {
                    z = 0.0;
                }
                var xmat = euler_rotate_mats.next().makeIdentity();
                var m = xmat.$matrix;
                var c = Math.cos(x), s = Math.sin(x);
                m.m22 = c;
                m.m23 = s;
                m.m32 = -s;
                m.m33 = c;
                var ymat = euler_rotate_mats.next().makeIdentity();
                c = Math.cos(y);
                s = Math.sin(y);
                m = ymat.$matrix;
                m.m11 = c;
                m.m13 = -s;
                m.m31 = s;
                m.m33 = c;
                ymat.multiply(xmat);
                var zmat = euler_rotate_mats.next().makeIdentity();
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
        },
        {
            key: "toString",
            value: function toString() {
                var s = "";
                var m = this.$matrix;
                function dec(d) {
                    var ret = d.toFixed(3);
                    if (ret[0] !== "-") //make room for negative signs
                    ret = " " + ret;
                    return ret;
                }
                s = dec(m.m11) + ", " + dec(m.m12) + ", " + dec(m.m13) + ", " + dec(m.m14) + "\n";
                s += dec(m.m21) + ", " + dec(m.m22) + ", " + dec(m.m23) + ", " + dec(m.m24) + "\n";
                s += dec(m.m31) + ", " + dec(m.m32) + ", " + dec(m.m33) + ", " + dec(m.m34) + "\n";
                s += dec(m.m41) + ", " + dec(m.m42) + ", " + dec(m.m43) + ", " + dec(m.m44) + "\n";
                return s;
            }
        },
        {
            key: "rotate",
            value: function rotate(angle, x, y, z) {
                if ((typeof x === "undefined" ? "undefined" : _type_of(x)) === "object" && "length" in x) {
                    var t = x;
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
                var sinA = Math.sin(angle);
                var cosA = Math.cos(angle);
                var sinA2 = sinA * sinA;
                var len = Math.sqrt(x * x + y * y + z * z);
                if (len === 0) {
                    x = 0;
                    y = 0;
                    z = 1;
                } else if (len !== 1) {
                    x /= len;
                    y /= len;
                    z /= len;
                }
                var mat = temp_mats.next().makeIdentity();
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
                    var x2 = x * x;
                    var y2 = y * y;
                    var z2 = z * z;
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
        },
        {
            key: "normalize",
            value: function normalize() {
                var m = this.$matrix;
                var v1 = new Vector4Cls([
                    m.m11,
                    m.m12,
                    m.m13,
                    m.m14
                ]);
                var v2 = new Vector4Cls([
                    m.m21,
                    m.m22,
                    m.m23,
                    m.m24
                ]);
                var v3 = new Vector4Cls([
                    m.m31,
                    m.m32,
                    m.m33,
                    m.m34
                ]);
                var v4 = new Vector4Cls([
                    m.m41,
                    m.m42,
                    m.m43,
                    m.m44
                ]);
                v1.normalize();
                v2.normalize();
                v3.normalize();
                var flat = new Array().concat(v1).concat(v2).concat(v3).concat(v4);
                this.load(flat);
                return this;
            }
        },
        {
            key: "clearTranslation",
            value: function clearTranslation() {
                var set_w_to_one = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : false;
                var m = this.$matrix;
                m.m41 = m.m42 = m.m43 = 0.0;
                if (set_w_to_one) {
                    m.m44 = 1.0;
                }
                return this;
            }
        },
        {
            key: "setTranslation",
            value: function setTranslation(x, y, z) {
                var resetW = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : true;
                if ((typeof x === "undefined" ? "undefined" : _type_of(x)) === "object") {
                    y = x[1];
                    z = x[2];
                    x = x[0];
                }
                var m = this.$matrix;
                m.m41 = x;
                m.m42 = y;
                m.m43 = z;
                if (resetW) {
                    m.m44 = 1.0;
                }
                return this;
            }
        },
        {
            //this is really like the lookAt method, isn't it.
            key: "makeNormalMatrix",
            value: function makeNormalMatrix(normal, up) {
                if (normal === undefined) {
                    throw new Error("normal cannot be undefined");
                }
                var n = makenormalcache.next().load(normal).normalize();
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
                var x = makenormalcache.next();
                var y = makenormalcache.next();
                x.load(n).cross(up).normalize();
                y.load(x).cross(n).normalize();
                //y.negate();
                this.makeIdentity();
                var m = this.$matrix;
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
        },
        {
            key: "preMultiply",
            value: function preMultiply(mat) {
                preMultTemp.load(mat);
                preMultTemp.multiply(this);
                this.load(preMultTemp);
                return this;
            }
        },
        {
            key: "multiply",
            value: function multiply(mat) {
                var mm = this.$matrix;
                var mm2 = mat.$matrix;
                var m11 = mm2.m11 * mm.m11 + mm2.m12 * mm.m21 + mm2.m13 * mm.m31 + mm2.m14 * mm.m41;
                var m12 = mm2.m11 * mm.m12 + mm2.m12 * mm.m22 + mm2.m13 * mm.m32 + mm2.m14 * mm.m42;
                var m13 = mm2.m11 * mm.m13 + mm2.m12 * mm.m23 + mm2.m13 * mm.m33 + mm2.m14 * mm.m43;
                var m14 = mm2.m11 * mm.m14 + mm2.m12 * mm.m24 + mm2.m13 * mm.m34 + mm2.m14 * mm.m44;
                var m21 = mm2.m21 * mm.m11 + mm2.m22 * mm.m21 + mm2.m23 * mm.m31 + mm2.m24 * mm.m41;
                var m22 = mm2.m21 * mm.m12 + mm2.m22 * mm.m22 + mm2.m23 * mm.m32 + mm2.m24 * mm.m42;
                var m23 = mm2.m21 * mm.m13 + mm2.m22 * mm.m23 + mm2.m23 * mm.m33 + mm2.m24 * mm.m43;
                var m24 = mm2.m21 * mm.m14 + mm2.m22 * mm.m24 + mm2.m23 * mm.m34 + mm2.m24 * mm.m44;
                var m31 = mm2.m31 * mm.m11 + mm2.m32 * mm.m21 + mm2.m33 * mm.m31 + mm2.m34 * mm.m41;
                var m32 = mm2.m31 * mm.m12 + mm2.m32 * mm.m22 + mm2.m33 * mm.m32 + mm2.m34 * mm.m42;
                var m33 = mm2.m31 * mm.m13 + mm2.m32 * mm.m23 + mm2.m33 * mm.m33 + mm2.m34 * mm.m43;
                var m34 = mm2.m31 * mm.m14 + mm2.m32 * mm.m24 + mm2.m33 * mm.m34 + mm2.m34 * mm.m44;
                var m41 = mm2.m41 * mm.m11 + mm2.m42 * mm.m21 + mm2.m43 * mm.m31 + mm2.m44 * mm.m41;
                var m42 = mm2.m41 * mm.m12 + mm2.m42 * mm.m22 + mm2.m43 * mm.m32 + mm2.m44 * mm.m42;
                var m43 = mm2.m41 * mm.m13 + mm2.m42 * mm.m23 + mm2.m43 * mm.m33 + mm2.m44 * mm.m43;
                var m44 = mm2.m41 * mm.m14 + mm2.m42 * mm.m24 + mm2.m43 * mm.m34 + mm2.m44 * mm.m44;
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
        },
        {
            key: "divide",
            value: function divide(divisor) {
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
        },
        {
            key: "ortho",
            value: function ortho(left, right, bottom, top, near, far) {
                console.warn("Matrix4.ortho() is deprecated, use .orthographic() instead");
                var tx = (left + right) / (left - right);
                var ty = (top + bottom) / (top - bottom);
                var tz = (far + near) / (far - near);
                var matrix = temp_mats.next().makeIdentity();
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
                this.multiply(matrix);
                return this;
            }
        },
        {
            key: "frustum",
            value: function frustum(left, right, bottom, top, near, far) {
                var matrix = temp_mats.next().makeIdentity();
                var A = (right + left) / (right - left);
                var B = (top + bottom) / (top - bottom);
                var C = -(far + near) / (far - near);
                var D = -(2 * far * near) / (far - near);
                matrix.$matrix.m11 = 2 * near / (right - left);
                matrix.$matrix.m12 = 0;
                matrix.$matrix.m13 = 0;
                matrix.$matrix.m14 = 0;
                matrix.$matrix.m21 = 0;
                matrix.$matrix.m22 = 2 * near / (top - bottom);
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
                this.multiply(matrix);
                return this;
            }
        },
        {
            key: "orthographic",
            value: function orthographic(scale, aspect, near, far) {
                var mat = temp_mats.next().makeIdentity();
                var zscale = far - near;
                mat.scale(2.0 / aspect, 2.0, -1.0 / scale / zscale, 1.0 / scale);
                mat.translate(0.0, 0.0, 0.5 * zscale - near);
                this.isPersp = true; //we still make use of auto homogenous divide in BaseVector.multVecMatrix
                this.multiply(mat);
                return mat;
            }
        },
        {
            key: "perspective",
            value: function perspective(fovy, aspect, zNear, zFar) {
                var top = Math.tan(fovy * Math.PI / 360) * zNear;
                var bottom = -top;
                var left = aspect * bottom;
                var right = aspect * top;
                this.frustum(left, right, bottom, top, zNear, zFar);
                return this;
            }
        },
        {
            key: "lookat",
            value: function lookat(pos, target, up) {
                var matrix = lookat_cache_ms.next();
                matrix.makeIdentity();
                var vec = lookat_cache_vs3.next().load(pos).sub(target);
                var len = vec.vectorLength();
                vec.normalize();
                var zvec = vec;
                var yvec = lookat_cache_vs3.next().load(up).normalize();
                var xvec = lookat_cache_vs3.next().load(yvec).cross(zvec).normalize();
                var mm = matrix.$matrix;
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
                this.multiply(matrix);
                return this;
            }
        },
        {
            key: "makeRotationOnly",
            value: function makeRotationOnly() {
                var m = this.$matrix;
                m.m41 = m.m42 = m.m43 = 0.0;
                m.m44 = 1.0;
                var l1 = Math.sqrt(m.m11 * m.m11 + m.m12 * m.m12 + m.m13 * m.m13);
                var l2 = Math.sqrt(m.m21 * m.m21 + m.m22 * m.m22 + m.m23 * m.m23);
                var l3 = Math.sqrt(m.m31 * m.m31 + m.m32 * m.m32 + m.m33 * m.m33);
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
        },
        {
            key: "getAsVecs",
            value: function getAsVecs() {
                return [
                    new Vector4Cls().loadXYZW(this.$matrix.m11, this.$matrix.m12, this.$matrix.m13, this.$matrix.m14),
                    new Vector4Cls().loadXYZW(this.$matrix.m21, this.$matrix.m22, this.$matrix.m23, this.$matrix.m24),
                    new Vector4Cls().loadXYZW(this.$matrix.m31, this.$matrix.m32, this.$matrix.m33, this.$matrix.m34),
                    new Vector4Cls().loadXYZW(this.$matrix.m41, this.$matrix.m42, this.$matrix.m43, this.$matrix.m44)
                ];
            }
        },
        {
            key: "loadFromVecs",
            value: function loadFromVecs(vecs) {
                var m = this.$matrix;
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
                return this;
            }
        },
        {
            key: "alignAxis",
            value: function alignAxis(axis, vec_) {
                var vec = new Vector4Cls().load3(vec_);
                vec.normalize();
                var mat = this;
                var m = mat.$matrix;
                var mat2 = new Matrix4(mat);
                var loc = new Vector3Cls(), scale = new Vector3Cls(), rot = new Vector3Cls();
                //we don't use rot
                mat2.decompose(loc, rot, scale);
                mat2.makeRotationOnly();
                var axes = mat2.getAsVecs();
                var axis2 = (axis + 1) % 3;
                var axis3 = (axis + 2) % 3;
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
        },
        {
            key: "decompose",
            value: function decompose(_translate, _rotate, _scale, _skew, _perspective) {
                var order = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : EulerOrders.XYZ;
                if (this.$matrix.m44 === 0) return false;
                var mat = temp_mats.next().load(this);
                var m = mat.$matrix;
                var t = _translate, r = _rotate, s = _scale;
                if (t) {
                    t[0] = m.m41;
                    t[1] = m.m42;
                    t[2] = m.m43;
                }
                var l1 = Math.sqrt(m.m11 * m.m11 + m.m12 * m.m12 + m.m13 * m.m13);
                var l2 = Math.sqrt(m.m21 * m.m21 + m.m22 * m.m22 + m.m23 * m.m23);
                var l3 = Math.sqrt(m.m31 * m.m31 + m.m32 * m.m32 + m.m33 * m.m33);
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
                    var clamp = myclamp;
                    var rmat = temp_mats.next().load(this);
                    rmat.normalize();
                    m = rmat.$matrix;
                    // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)
                    var m11 = m.m11, m12 = m.m12, m13 = m.m13, m14 = m.m14;
                    var m21 = m.m21, m22 = m.m22, m23 = m.m23, m24 = m.m24;
                    var m31 = m.m31, m32 = m.m32, m33 = m.m33, m34 = m.m34;
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
        },
        {
            key: "_determinant2x2",
            value: function _determinant2x2(a, b, c, d) {
                return a * d - b * c;
            }
        },
        {
            key: "_determinant3x3",
            value: function _determinant3x3(a1, a2, a3, b1, b2, b3, c1, c2, c3) {
                return a1 * this._determinant2x2(b2, b3, c2, c3) - b1 * this._determinant2x2(a2, a3, c2, c3) + c1 * this._determinant2x2(a2, a3, b2, b3);
            }
        },
        {
            key: "_determinant4x4",
            value: function _determinant4x4() {
                var a1 = this.$matrix.m11;
                var b1 = this.$matrix.m12;
                var c1 = this.$matrix.m13;
                var d1 = this.$matrix.m14;
                var a2 = this.$matrix.m21;
                var b2 = this.$matrix.m22;
                var c2 = this.$matrix.m23;
                var d2 = this.$matrix.m24;
                var a3 = this.$matrix.m31;
                var b3 = this.$matrix.m32;
                var c3 = this.$matrix.m33;
                var d3 = this.$matrix.m34;
                var a4 = this.$matrix.m41;
                var b4 = this.$matrix.m42;
                var c4 = this.$matrix.m43;
                var d4 = this.$matrix.m44;
                return a1 * this._determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4) - b1 * this._determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4) + c1 * this._determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4) - d1 * this._determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);
            }
        },
        {
            key: "_makeAdjoint",
            value: function _makeAdjoint() {
                var a1 = this.$matrix.m11;
                var b1 = this.$matrix.m12;
                var c1 = this.$matrix.m13;
                var d1 = this.$matrix.m14;
                var a2 = this.$matrix.m21;
                var b2 = this.$matrix.m22;
                var c2 = this.$matrix.m23;
                var d2 = this.$matrix.m24;
                var a3 = this.$matrix.m31;
                var b3 = this.$matrix.m32;
                var c3 = this.$matrix.m33;
                var d3 = this.$matrix.m34;
                var a4 = this.$matrix.m41;
                var b4 = this.$matrix.m42;
                var c4 = this.$matrix.m43;
                var d4 = this.$matrix.m44;
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
        },
        {
            key: "loadSTRUCT",
            value: function loadSTRUCT(reader) {
                reader(this);
                this.load(this.mat);
                this.__mat = this.mat;
            //delete this.mat;
            }
        }
    ], [
        {
            key: "fromJSON",
            value: function fromJSON(json) {
                var mat = new Matrix4();
                mat.load(json.items);
                mat.isPersp = json.isPersp;
                return mat;
            }
        }
    ]);
    return Matrix4;
}();
_define_property(Matrix4, "setUniformArray", void 0);
_define_property(Matrix4, "setUniformWebGLArray", void 0);
Matrix4.STRUCT = "\nmat4 {\n  mat      : array(float) | this.getAsArray();\n  isPersp  : int          | this.isPersp;\n}\n";
//XXX nstructjs.register(Matrix4);
import { Vector3 as _Vector3Cls, Vector4 as _Vector4Cls } from "./vectormathNew";
Vector3Cls = _Vector3Cls;
Vector4Cls = _Vector4Cls;
lookat_cache_vs3 = util.cachering.fromConstructor(Vector3Cls, 512);
lookat_cache_vs4 = util.cachering.fromConstructor(Vector4Cls, 512);
lookat_cache_ms = util.cachering.fromConstructor(Matrix4, 512);
euler_rotate_mats = util.cachering.fromConstructor(Matrix4, 512);
makenormalcache = util.cachering.fromConstructor(Vector3Cls, 512);
temp_mats = util.cachering.fromConstructor(Matrix4, 512);
preMultTemp = new Matrix4();

