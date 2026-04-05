function _assert_this_initialized(self) {
    if (self === void 0) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }
    return self;
}
function _call_super(_this, derived, args) {
    derived = _get_prototype_of(derived);
    return _possible_constructor_return(_this, _is_native_reflect_construct() ? Reflect.construct(derived, args || [], _get_prototype_of(_this).constructor) : derived.apply(_this, args));
}
function _class_call_check(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}
function _construct(Parent, args, Class) {
    if (_is_native_reflect_construct()) {
        _construct = Reflect.construct;
    } else {
        _construct = function construct(Parent, args, Class) {
            var a = [
                null
            ];
            a.push.apply(a, args);
            var Constructor = Function.bind.apply(Parent, a);
            var instance = new Constructor();
            if (Class) _set_prototype_of(instance, Class.prototype);
            return instance;
        };
    }
    return _construct.apply(null, arguments);
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
function _get_prototype_of(o) {
    _get_prototype_of = Object.setPrototypeOf ? Object.getPrototypeOf : function getPrototypeOf(o) {
        return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _get_prototype_of(o);
}
function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function");
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {
        constructor: {
            value: subClass,
            writable: true,
            configurable: true
        }
    });
    if (superClass) _set_prototype_of(subClass, superClass);
}
function _instanceof(left, right) {
    "@swc/helpers - instanceof";
    if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) {
        return !!right[Symbol.hasInstance](left);
    } else {
        return left instanceof right;
    }
}
function _is_native_function(fn) {
    return Function.toString.call(fn).indexOf("[native code]") !== -1;
}
function _possible_constructor_return(self, call) {
    if (call && (_type_of(call) === "object" || typeof call === "function")) {
        return call;
    }
    return _assert_this_initialized(self);
}
function _set_prototype_of(o, p) {
    _set_prototype_of = Object.setPrototypeOf || function setPrototypeOf(o, p) {
        o.__proto__ = p;
        return o;
    };
    return _set_prototype_of(o, p);
}
function _type_of(obj) {
    "@swc/helpers - typeof";
    return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj;
}
function _wrap_native_super(Class) {
    var _cache = typeof Map === "function" ? new Map() : undefined;
    _wrap_native_super = function wrapNativeSuper(Class) {
        if (Class === null || !_is_native_function(Class)) return Class;
        if (typeof Class !== "function") {
            throw new TypeError("Super expression must either be null or a function");
        }
        if (typeof _cache !== "undefined") {
            if (_cache.has(Class)) return _cache.get(Class);
            _cache.set(Class, Wrapper);
        }
        function Wrapper() {
            return _construct(Class, arguments, _get_prototype_of(this).constructor);
        }
        Wrapper.prototype = Object.create(Class.prototype, {
            constructor: {
                value: Wrapper,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        return _set_prototype_of(Wrapper, Class);
    };
    return _wrap_native_super(Class);
}
function _is_native_reflect_construct() {
    try {
        var result = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {}));
    } catch (_) {}
    return (_is_native_reflect_construct = function() {
        return !!result;
    })();
}
//import * as util from "./util";
//import nstructjs from "./struct";
// stubs
var nstructjs = {
    register: function register() {},
    inherit: function inherit() {},
    inlineRegister: function inlineRegister() {}
};
var debug_cacherings = false;
var vecQuatMults = {
    2: "    mulVecQuat(q: IQuat) {\n      let t0 = -q[1] * this[0] - q[2] * this[1];\n      let t1 = q[0] * this[0] - q[3] * this[1];\n      let t2 = q[0] * this[1] + q[3] * this[0];\n\n      let z = q[1] * this[1] - q[2] * this[0];\n      this[0] = t1;\n      this[1] = t2;\n\n      t1 = t0 * -q[1] + this[0] * q[0] - this[1] * q[3] + z * q[2];\n      t2 = t0 * -q[2] + this[1] * q[0] - z * q[1] + this[0] * q[3];\n\n      this[0] = t1;\n      this[1] = t2;\n\n      return this;\n    }",
    3: "",
    4: "    mulVecQuat(q: IQuat) {\n      let t0 = -q[1] * this[0] - q[2] * this[1] - q[3] * this[2];\n      let t1 = q[0] * this[0] + q[2] * this[2] - q[3] * this[1];\n      let t2 = q[0] * this[1] + q[3] * this[0] - q[1] * this[2];\n\n      this[2] = q[0] * this[2] + q[1] * this[1] - q[2] * this[0];\n      this[0] = t1;\n      this[1] = t2;\n\n      t1 = t0 * -q[1] + this[0] * q[0] - this[1] * q[3] + this[2] * q[2];\n      t2 = t0 * -q[2] + this[1] * q[0] - this[2] * q[1] + this[0] * q[3];\n\n      this[2] = t0 * -q[3] + this[2] * q[0] - this[0] * q[2] + this[1] * q[1];\n      this[0] = t1;\n      this[1] = t2;\n\n      return this;\n    }\n"
};
vecQuatMults[3] = vecQuatMults[4];
var matrixVecMults = {
    2: "/** Returns w value. */\n    multVecMatrix(matrix: Matrix4, ignore_w = false) {\n      const x = this[0];\n      const y = this[1];\n      const w = 1.0;\n\n      this[0] = w * matrix.$matrix.m41 + x * matrix.$matrix.m11 + y * matrix.$matrix.m21;\n      this[1] = w * matrix.$matrix.m42 + x * matrix.$matrix.m12 + y * matrix.$matrix.m22;\n\n      if (!ignore_w && matrix.isPersp) {\n        let w2 = w * matrix.$matrix.m44 + x * matrix.$matrix.m14 + y * matrix.$matrix.m24;\n\n        if (w2 !== 0.0) {\n          this[0] /= w2;\n          this[1] /= w2;\n        }\n      }\n\n      return this;\n    }\n  ",
    3: "/** Returns w value. */\n      multVecMatrix(matrix: Matrix4, ignore_w = false) {\n      if (ignore_w === undefined) {\n        ignore_w = false;\n      }\n      let x = this[0];\n      let y = this[1];\n      let z = this[2];\n      this[0] = matrix.$matrix.m41 + x*matrix.$matrix.m11 + y*matrix.$matrix.m21 + z*matrix.$matrix.m31;\n      this[1] = matrix.$matrix.m42 + x*matrix.$matrix.m12 + y*matrix.$matrix.m22 + z*matrix.$matrix.m32;\n      this[2] = matrix.$matrix.m43 + x*matrix.$matrix.m13 + y*matrix.$matrix.m23 + z*matrix.$matrix.m33;\n      let w = matrix.$matrix.m44 + x*matrix.$matrix.m14 + y*matrix.$matrix.m24 + z*matrix.$matrix.m34;\n\n      if (!ignore_w && w !== 1 && w !== 0 && matrix.isPersp) {\n        this[0] /= w;\n        this[1] /= w;\n        this[2] /= w;\n      }\n      return w;\n    }",
    4: "/** Returns w value. */\n    multVecMatrix(matrix: Matrix4): number {\n      let x = this[0];\n      let y = this[1];\n      let z = this[2];\n      let w = this[3];\n\n      this[0] = w * matrix.$matrix.m41 + x * matrix.$matrix.m11 + y * matrix.$matrix.m21 + z * matrix.$matrix.m31;\n      this[1] = w * matrix.$matrix.m42 + x * matrix.$matrix.m12 + y * matrix.$matrix.m22 + z * matrix.$matrix.m32;\n      this[2] = w * matrix.$matrix.m43 + x * matrix.$matrix.m13 + y * matrix.$matrix.m23 + z * matrix.$matrix.m33;\n      this[3] = w * matrix.$matrix.m44 + x * matrix.$matrix.m14 + y * matrix.$matrix.m24 + z * matrix.$matrix.m34;\n\n      return this[3];\n    }\n"
};
var util = {
    cachering: /*#__PURE__*/ function(Array1) {
        "use strict";
        _inherits(cachering, Array1);
        function cachering(func, size) {
            var isprivate = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
            _class_call_check(this, cachering);
            var _this;
            _this = _call_super(this, cachering), _define_property(_this, "private", void 0), _define_property(_this, "cur", void 0), _define_property(_this, "gen", void 0);
            _this.private = isprivate;
            _this.cur = 0;
            _this.gen = 0;
            if (!isprivate && debug_cacherings) {
                _this.gen = 0;
                globalThis._cacherings.push(_this);
            }
            for(var i = 0; i < size; i++){
                _this.push(func());
            }
            return _this;
        }
        _create_class(cachering, [
            {
                key: "next",
                value: function next() {
                    if (debug_cacherings) {
                        this.gen++;
                    }
                    var ret = this[this.cur];
                    this.cur = (this.cur + 1) % this.length;
                    return ret;
                }
            }
        ], [
            {
                key: "fromConstructor",
                value: function fromConstructor(cls, size) {
                    var isprivate = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
                    var func = function func() {
                        return new cls();
                    };
                    return new cachering(func, size, isprivate);
                }
            }
        ]);
        return cachering;
    }(_wrap_native_super(Array))
};
var sin = Math.sin, cos = Math.cos, abs = Math.abs, log = Math.log, asin = Math.asin, exp = Math.exp, acos = Math.acos, fract = Math.fract, sign = Math.sign, tent = Math.tent, atan2 = Math.atan2, atan = Math.atan, pow = Math.pow, sqrt = Math.sqrt, floor = Math.floor, ceil = Math.ceil, min = Math.min, max = Math.max, PI = Math.PI, E = 2.718281828459045;
var DOT_NORM_SNAP_LIMIT = 0.00000000001;
var M_SQRT2 = Math.sqrt(2.0);
var FLT_EPSILON = 2.22e-16;
var basic_funcs = {
    equals: [
        [
            "vb"
        ],
        "this[X] === b[X]",
        "&&"
    ],
    /*dot is made manually so it's safe for acos
  dot     : [["b"], "this[X]*b[X]", "+"],
   */ zero: [
        [],
        "0.0"
    ],
    negate: [
        [],
        "-this[X]"
    ],
    combine: [
        [
            "vb",
            "u",
            "v"
        ],
        "this[X]*u + b[X]*v"
    ],
    interp: [
        [
            "vb",
            "t"
        ],
        "this[X] + (b[X] - this[X])*t"
    ],
    add: [
        [
            "vb"
        ],
        "this[X] + b[X]"
    ],
    addFac: [
        [
            "vb",
            "F"
        ],
        "this[X] + b[X]*F"
    ],
    fract: [
        [],
        "Math.fract(this[X])"
    ],
    sub: [
        [
            "vb"
        ],
        "this[X] - b[X]"
    ],
    mul: [
        [
            "vb"
        ],
        "this[X] * b[X]"
    ],
    div: [
        [
            "vb"
        ],
        "this[X] / b[X]"
    ],
    mulScalar: [
        [
            "b"
        ],
        "this[X] * b"
    ],
    divScalar: [
        [
            "b"
        ],
        "this[X] / b"
    ],
    addScalar: [
        [
            "b"
        ],
        "this[X] + b"
    ],
    subScalar: [
        [
            "b"
        ],
        "this[X] - b"
    ],
    minScalar: [
        [
            "b"
        ],
        "Math.min(this[X], b)"
    ],
    maxScalar: [
        [
            "b"
        ],
        "Math.max(this[X], b)"
    ],
    ceil: [
        [],
        "Math.ceil(this[X])"
    ],
    floor: [
        [],
        "Math.floor(this[X])"
    ],
    abs: [
        [],
        "Math.abs(this[X])"
    ],
    min: [
        [
            "vb"
        ],
        "Math.min(this[X], b[X])"
    ],
    max: [
        [
            "vb"
        ],
        "Math.max(this[X], b[X])"
    ],
    clamp: [
        [
            "MIN",
            "MAX"
        ],
        "Math.min(Math.max(this[X], MAX), MIN)"
    ]
};
function bounded_acos(fac) {
    if (fac <= -1.0) return Math.PI;
    else if (fac >= 1.0) return 0.0;
    else return Math.acos(fac);
}
function make_norm_safe_dot(cls) {
    var _dot = cls.prototype.dot;
    cls.prototype._dot = _dot;
    cls.prototype.dot = function(b) {
        var ret = _dot.call(this, b);
        if (ret >= 1.0 - DOT_NORM_SNAP_LIMIT && ret <= 1.0 + DOT_NORM_SNAP_LIMIT) return 1.0;
        if (ret >= -1.0 - DOT_NORM_SNAP_LIMIT && ret <= -1.0 + DOT_NORM_SNAP_LIMIT) return -1.0;
        return ret;
    };
}
function getBaseVector(parent) {
    return /*#__PURE__*/ function(parent) {
        "use strict";
        _inherits(BaseVector, parent);
        function BaseVector() {
            _class_call_check(this, BaseVector);
            var _this;
            _this = _call_super(this, BaseVector, arguments);
            _this.vec = undefined; //for compatibility with old nstructjs-saved files
            return _this;
        }
        _create_class(BaseVector, [
            {
                key: "copy",
                value: function copy() {
                    return new this.constructor(this);
                }
            },
            {
                key: "load",
                value: function load(data) {
                    throw new Error("Implement me!");
                }
            },
            {
                key: "init_swizzle",
                value: function init_swizzle(size) {
                    var ret = {};
                    var cls = size === 4 ? Vector4 : size === 3 ? Vector3 : Vector2;
                    for(var k in cls.prototype){
                        var v = cls.prototype[k];
                        if (typeof v !== "function" && !_instanceof(v, Function)) continue;
                        ret[k] = v.bind(this);
                    }
                    return ret;
                }
            },
            {
                key: "vectorLength",
                value: function vectorLength() {
                    return sqrt(this.dot(this));
                }
            },
            {
                key: "swapAxes",
                value: function swapAxes(axis1, axis2) {
                    var t = this[axis1];
                    this[axis1] = this[axis2];
                    this[axis2] = t;
                    return this;
                }
            },
            {
                key: "sinterp",
                value: function sinterp(v2, t) {
                    var l1 = this.vectorLength();
                    var l2 = v2.vectorLength();
                    //XXX this seems horribly incorrect.
                    return this.interp(v2, t).normalize().mulScalar(l1 + (l2 - l1) * t);
                }
            },
            {
                key: "perpSwap",
                value: function perpSwap() {
                    var axis1 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 0, axis2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 1, sign1 = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 1;
                    var tmp = this[axis1];
                    this[axis1] = this[axis2] * sign1;
                    this[axis2] = -tmp * sign1;
                    return this;
                }
            },
            {
                key: "normalize",
                value: function normalize() {
                    /*
      for (let i=0; i<this.length; i++) {
        if (util.isDenormal(this[i])) {
          console.error("Denormal error", i, this[i]);
          this[i] = 0.0;
        }
      }
      //*/ var l = this.vectorLength();
                    /*
      if (util.isDenormal(l)) {
        console.error("Denormal error", l);
      }
      //*/ if (l > 0.00000001) {
                        this.mulScalar(1.0 / l);
                    }
                    return this;
                }
            }
        ], [
            {
                key: "inherit",
                value: function inherit(cls, vectorsize) {
                    make_norm_safe_dot(cls);
                    var f;
                    var vectorDotDistance = "f = function vectorDotDistance(b) {\n";
                    for(var i = 0; i < vectorsize; i++){
                        vectorDotDistance += "  let d" + i + " = this[" + i + "]-b[" + i + "];\n\n  ";
                    }
                    vectorDotDistance += "  return ";
                    for(var i = 0; i < vectorsize; i++){
                        if (i > 0) vectorDotDistance += " + ";
                        vectorDotDistance += "d" + i + "*d" + i;
                    }
                    vectorDotDistance += ";\n";
                    vectorDotDistance += "};";
                    cls.prototype.vectorDotDistance = eval(vectorDotDistance);
                    var vectorDistance = "f = function vectorDistance(b) {\n";
                    for(var i = 0; i < vectorsize; i++){
                        vectorDistance += "  let d".concat(i, " = this[").concat(i, "] - (b[").concat(i, "]||0);\n\n  ");
                    //vectorDistance += "  let d"+i+" = this["+i+"]-(b["+i+"]||0);\n\n  ";
                    }
                    vectorDistance += "  return Math.sqrt(";
                    for(var i = 0; i < vectorsize; i++){
                        if (i > 0) vectorDistance += " + ";
                        vectorDistance += "d" + i + "*d" + i;
                    }
                    vectorDistance += ");\n";
                    vectorDistance += "};";
                    cls.prototype.vectorDistance = eval(vectorDistance);
                    var vectorDistanceSqr = "f = function vectorDistanceSqr(b) {\n";
                    for(var i = 0; i < vectorsize; i++){
                        vectorDistanceSqr += "  let d".concat(i, " = this[").concat(i, "] - (b[").concat(i, "]||0);\n\n  ");
                    //vectorDistanceSqr += "  let d"+i+" = this["+i+"]-(b["+i+"]||0);\n\n  ";
                    }
                    vectorDistanceSqr += "  return (";
                    for(var i = 0; i < vectorsize; i++){
                        if (i > 0) vectorDistanceSqr += " + ";
                        vectorDistanceSqr += "d" + i + "*d" + i;
                    }
                    vectorDistanceSqr += ");\n";
                    vectorDistanceSqr += "};";
                    cls.prototype.vectorDistanceSqr = eval(vectorDistanceSqr);
                    for(var k in basic_funcs){
                        var func = basic_funcs[k];
                        var args = func[0];
                        var line = func[1];
                        var f;
                        var code = "f = function " + k + "(";
                        for(var i = 0; i < args.length; i++){
                            if (i > 0) code += ", ";
                            line = line.replace(args[i], args[i].toLowerCase());
                            code += args[i].toLowerCase();
                        }
                        code += ") {\n";
                        if (func.length > 2) {
                            //make summation
                            code += "  return ";
                            for(var i = 0; i < vectorsize; i++){
                                if (i > 0) code += func[2];
                                code += "(" + line.replace(/X/g, "" + i) + ")";
                            }
                            code += ";\n";
                        } else {
                            for(var i = 0; i < vectorsize; i++){
                                var line2 = line.replace(/X/g, "" + i);
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
            }
        ]);
        return BaseVector;
    }(parent);
}
export var BaseVector = getBaseVector(Array);
export var F64BaseVector = getBaseVector(Float64Array);
export var F32BaseVector = getBaseVector(Float32Array);
export var I32BaseVector = getBaseVector(Int32Array);
export var I16BaseVector = getBaseVector(Int16Array);
export var I8BaseVector = getBaseVector(Int8Array);
export var UI32BaseVector = getBaseVector(Uint32Array);
export var UI16BaseVector = getBaseVector(Uint16Array);
export var UI8BaseVector = getBaseVector(Uint8Array);
function myclamp(f, a, b) {
    return Math.min(Math.max(f, a), b);
}
export function makeVector4(BaseVector1) {
    var structName = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "vec4", structType = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "float";
    var _Vector4;
    var temp1, temp2, temp3, temp4;
    var Vector41 = (_Vector4 = /*#__PURE__*/ function(BaseVector1) {
        "use strict";
        _inherits(Vector41, BaseVector1);
        function Vector41(data) {
            _class_call_check(this, Vector41);
            var _this;
            _this = _call_super(this, Vector41, [
                4
            ]);
            if (arguments.length > 1) {
                throw new Error("unexpected argument");
            }
            _this[0] = _this[1] = _this[2] = _this[3] = 0.0;
            if (data !== undefined) {
                _this.load(data);
            }
            return _this;
        }
        _create_class(Vector41, [
            {
                key: "toCSS",
                value: function toCSS() {
                    var r = ~~(this[0] * 255);
                    var g = ~~(this[1] * 255);
                    var b = ~~(this[2] * 255);
                    var a = this[3];
                    return "rgba(".concat(r, ",").concat(g, ",").concat(b, ",").concat(a, ")");
                }
            },
            {
                key: "load2",
                value: function load2(b) {
                    this[0] = b[0];
                    this[1] = b[1];
                    return this;
                }
            },
            {
                key: "load3",
                value: function load3(b) {
                    this[0] = b[0];
                    this[1] = b[1];
                    this[2] = b[2];
                    return this;
                }
            },
            {
                key: "loadXYZW",
                value: function loadXYZW(x, y, z, w) {
                    this[0] = x;
                    this[1] = y;
                    this[2] = z;
                    this[3] = w;
                    return this;
                }
            },
            {
                key: "loadXYZ",
                value: function loadXYZ(x, y, z) {
                    this[0] = x;
                    this[1] = y;
                    this[2] = z;
                    return this;
                }
            },
            {
                key: "load",
                value: function load(data) {
                    if (data === undefined) return this;
                    this[0] = data[0];
                    this[1] = data[1];
                    this[2] = data[2];
                    this[3] = data[3];
                    return this;
                }
            },
            {
                key: "dot",
                value: function dot(b) {
                    return this[0] * b[0] + this[1] * b[1] + this[2] * b[2] + this[3] * b[3];
                }
            },
            {
                key: "mulVecQuat",
                value: function mulVecQuat(q) {
                    var t0 = -q[1] * this[0] - q[2] * this[1] - q[3] * this[2];
                    var t1 = q[0] * this[0] + q[2] * this[2] - q[3] * this[1];
                    var t2 = q[0] * this[1] + q[3] * this[0] - q[1] * this[2];
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
            },
            {
                key: "multVecMatrix",
                value: function multVecMatrix(matrix) {
                    var x = this[0];
                    var y = this[1];
                    var z = this[2];
                    var w = this[3];
                    this[0] = w * matrix.$matrix.m41 + x * matrix.$matrix.m11 + y * matrix.$matrix.m21 + z * matrix.$matrix.m31;
                    this[1] = w * matrix.$matrix.m42 + x * matrix.$matrix.m12 + y * matrix.$matrix.m22 + z * matrix.$matrix.m32;
                    this[2] = w * matrix.$matrix.m43 + x * matrix.$matrix.m13 + y * matrix.$matrix.m23 + z * matrix.$matrix.m33;
                    this[3] = w * matrix.$matrix.m44 + x * matrix.$matrix.m14 + y * matrix.$matrix.m24 + z * matrix.$matrix.m34;
                    return this[3];
                }
            },
            {
                key: "cross",
                value: function cross(v) {
                    var x = this[1] * v[2] - this[2] * v[1];
                    var y = this[2] * v[0] - this[0] * v[2];
                    var z = this[0] * v[1] - this[1] * v[0];
                    this[0] = x;
                    this[1] = y;
                    this[2] = z;
                    return this;
                }
            },
            {
                key: "preNormalizedAngle",
                value: function preNormalizedAngle(v2) {
                    var th = this.dot(v2) * 0.99999;
                    return Math.acos(th);
                }
            },
            {
                key: "loadSTRUCT",
                value: function loadSTRUCT(reader) {
                    reader(this);
                    if (typeof this.vec !== "undefined") {
                        this.load(this.vec);
                        this.vec = undefined;
                    }
                }
            }
        ], [
            {
                key: "normalizedDot4",
                value: function normalizedDot4(v1, v2, v3, v4) {
                    temp1.load(v2).sub(v1).normalize();
                    temp2.load(v4).sub(v3).normalize();
                    return temp1.dot(temp2);
                }
            },
            {
                key: "normalizedDot3",
                value: function normalizedDot3(v1, center, v2) {
                    temp1.load(v1).sub(center).normalize();
                    temp2.load(v2).sub(center).normalize();
                    return temp1.dot(temp2);
                }
            }
        ]);
        return Vector41;
    }(BaseVector1), _define_property(_Vector4, "STRUCT", nstructjs.inlineRegister(_Vector4, "\n    ".concat(structName, " {\n      0 : ").concat(structType, ";\n      1 : ").concat(structType, ";\n      2 : ").concat(structType, ";\n      3 : ").concat(structType, ";\n    }"))), _Vector4);
    temp1 = new Vector41();
    temp2 = new Vector41();
    temp3 = new Vector41();
    temp4 = new Vector41();
    return Vector41;
}
export var Vector4 = makeVector4(BaseVector);
var _v3nd_n1_normalizedDot, _v3nd_n2_normalizedDot;
var _v3nd4_n1_normalizedDot4, _v3nd4_n2_normalizedDot4;
export function makeVector3(BaseVector) {
    var structName = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "vec3", structType = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "float", customConstructorCode = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : undefined;
    var Vector3;
    var bundlehelper = [
        nstructjs
    ];
    var constructorCode = customConstructorCode !== null && customConstructorCode !== void 0 ? customConstructorCode : '\n    constructor(data) {\n      super(3);\n\n      if (arguments.length > 1) {\n        throw new Error("unexpected argument");\n      }\n\n      this[0] = this[1] = this[2] = 0.0;\n\n      if (data !== undefined) {\n        this.load(data);\n      }\n\n      if (this.constructor === Vector3) {\n        Object.preventExtensions(this);\n      }\n    }\n  ';
    var code = "\n  let temp1, temp2, temp3, temp4;\n  Vector3 = class Vector3 extends BaseVector {\n    static STRUCT = bundlehelper[0].inlineRegister(this, `\n    ".concat(structName, " {\n      0 : ").concat(structType, ";\n      1 : ").concat(structType, ";\n      2 : ").concat(structType, ";\n    }`);\n\n    ").concat(constructorCode, '\n\n    static normalizedDot4(v1, v2, v3, v4) {\n      temp1.load(v2).sub(v1).normalize()\n      temp2.load(v4).sub(v3).normalize();\n\n      return temp1.dot(temp2);\n\n    }\n\n    static normalizedDot3(v1, center, v2) {\n      temp1.load(v1).sub(center).normalize();\n      temp2.load(v2).sub(center).normalize();\n\n      return temp1.dot(temp2);\n    }\n\n    toCSS() {\n      let r = ~~(this[0]*255);\n      let g = ~~(this[1]*255);\n      let b = ~~(this[2]*255);\n      return `rgb(${r},${g},${b})`\n    }\n\n    load2(b) {\n      this[0] = b[0]\n      this[1] = b[1]\n      return this\n    }\n      \n    loadXYZ(x, y, z) {\n      this[0] = x;\n      this[1] = y;\n      this[2] = z;\n\n      return this;\n    }\n\n    loadXY(x, y) {\n      this[0] = x;\n      this[1] = y;\n\n      return this;\n    }\n\n    toJSON() {\n      return [this[0], this[1], this[2]];\n    }\n\n    loadJSON(obj) {\n      return this.load(obj);\n    }\n\n    initVector3() {\n      this.length = 3;\n      this[0] = this[1] = this[2] = 0;\n      return this;\n    }\n\n    load(data) {\n      if (data === undefined)\n        return this;\n\n      //if (isNaN(data[0]) || isNaN(data[1]) || isNaN(data[2])) {\n      //  throw new Error("NaN");\n      //}\n\n      this[0] = data[0];\n      this[1] = data[1];\n      this[2] = data[2];\n\n      return this;\n    }\n\n    dot(b) {\n      return this[0]*b[0] + this[1]*b[1] + this[2]*b[2];\n    }\n\n    normalizedDot(v) {\n      $_v3nd_n1_normalizedDot.load(this);\n      $_v3nd_n2_normalizedDot.load(v);\n      $_v3nd_n1_normalizedDot.normalize();\n      $_v3nd_n2_normalizedDot.normalize();\n      return $_v3nd_n1_normalizedDot.dot($_v3nd_n2_normalizedDot);\n    }\n\n    mulVecQuat(q) {\n      let t0 = -q[1]*this[0] - q[2]*this[1] - q[3]*this[2];\n      let t1 = q[0]*this[0] + q[2]*this[2] - q[3]*this[1];\n      let t2 = q[0]*this[1] + q[3]*this[0] - q[1]*this[2];\n\n      this[2] = q[0]*this[2] + q[1]*this[1] - q[2]*this[0];\n      this[0] = t1;\n      this[1] = t2;\n\n      t1 = t0* -q[1] + this[0]*q[0] - this[1]*q[3] + this[2]*q[2];\n      t2 = t0* -q[2] + this[1]*q[0] - this[2]*q[1] + this[0]*q[3];\n\n      this[2] = t0* -q[3] + this[2]*q[0] - this[0]*q[2] + this[1]*q[1];\n      this[0] = t1;\n      this[1] = t2;\n\n      return this;\n    }\n\n    multVecMatrix(matrix, ignore_w) {\n      if (ignore_w === undefined) {\n        ignore_w = false;\n      }\n      let x = this[0];\n      let y = this[1];\n      let z = this[2];\n      this[0] = matrix.$matrix.m41 + x*matrix.$matrix.m11 + y*matrix.$matrix.m21 + z*matrix.$matrix.m31;\n      this[1] = matrix.$matrix.m42 + x*matrix.$matrix.m12 + y*matrix.$matrix.m22 + z*matrix.$matrix.m32;\n      this[2] = matrix.$matrix.m43 + x*matrix.$matrix.m13 + y*matrix.$matrix.m23 + z*matrix.$matrix.m33;\n      let w = matrix.$matrix.m44 + x*matrix.$matrix.m14 + y*matrix.$matrix.m24 + z*matrix.$matrix.m34;\n\n      if (!ignore_w && w !== 1 && w !== 0 && matrix.isPersp) {\n        this[0] /= w;\n        this[1] /= w;\n        this[2] /= w;\n      }\n      return w;\n    }\n\n    cross(v) {\n      let x = this[1]*v[2] - this[2]*v[1];\n      let y = this[2]*v[0] - this[0]*v[2];\n      let z = this[0]*v[1] - this[1]*v[0];\n\n      this[0] = x;\n      this[1] = y;\n      this[2] = z;\n\n      return this;\n    }\n\n    //axis is optional, 0\n    rot2d(A, axis = 0) {\n      let x = this[0];\n      let y = this[1];\n\n      if (axis === 1) {\n        this[0] = x*Math.cos(A) + y*Math.sin(A);\n        this[1] = y*Math.cos(A) - x*Math.sin(A);\n      } else {\n        this[0] = x*Math.cos(A) - y*Math.sin(A);\n        this[1] = y*Math.cos(A) + x*Math.sin(A);\n      }\n\n      return this;\n    }\n\n    preNormalizedAngle(v2) {\n      let th = this.dot(v2)*0.99999;\n      return Math.acos(th);\n    }\n\n    loadSTRUCT(reader) {\n      reader(this);\n\n      if (typeof this.vec !== "undefined") {\n        this.load(this.vec);\n        this.vec = undefined;\n      }\n    }\n  }\n\n  temp1 = new Vector3();\n  temp2 = new Vector3();\n  temp3 = new Vector3();\n  temp4 = new Vector3();\n  ');
    eval(code);
    return Vector3;
}
export var Vector3 = makeVector3(F64BaseVector);
export function makeVector2(BaseVector1) {
    var structName = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "vec2", structType = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "float";
    var _Vector2;
    var temp1, temp2, temp3, temp4;
    var Vector21 = (_Vector2 = /*#__PURE__*/ function(BaseVector1) {
        "use strict";
        _inherits(Vector21, BaseVector1);
        function Vector21(data) {
            _class_call_check(this, Vector21);
            var _this;
            _this = _call_super(this, Vector21, [
                2
            ]);
            if (arguments.length > 1) {
                throw new Error("unexpected argument");
            }
            _this[0] = _this[1] = 0.0;
            if (data !== undefined) {
                _this.load(data);
            }
            return _this;
        }
        _create_class(Vector21, [
            {
                key: "initVector2",
                value: function initVector2(co) {
                    this.length = 2;
                    if (co !== undefined) {
                        this[0] = co[0];
                        this[1] = co[1];
                    } else {
                        this[0] = this[1] = 0.0;
                    }
                    return this;
                }
            },
            {
                key: "toJSON",
                value: function toJSON() {
                    return [
                        this[0],
                        this[1]
                    ];
                }
            },
            {
                key: "loadJSON",
                value: function loadJSON(obj) {
                    return this.load(obj);
                }
            },
            {
                key: "loadXY",
                value: function loadXY(x, y) {
                    this[0] = x;
                    this[1] = y;
                    return this;
                }
            },
            {
                key: "load",
                value: function load(data) {
                    if (data === undefined) return this;
                    this[0] = data[0];
                    this[1] = data[1];
                    return this;
                }
            },
            {
                //axis is optional, 0
                key: "rot2d",
                value: function rot2d(A, axis) {
                    var x = this[0];
                    var y = this[1];
                    if (axis === 1) {
                        this[0] = x * Math.cos(A) + y * Math.sin(A);
                        this[1] = y * Math.cos(A) - x * Math.sin(A);
                    } else {
                        this[0] = x * Math.cos(A) - y * Math.sin(A);
                        this[1] = y * Math.cos(A) + x * Math.sin(A);
                    }
                    return this;
                }
            },
            {
                key: "dot",
                value: function dot(b) {
                    return this[0] * b[0] + this[1] * b[1];
                }
            },
            {
                key: "multVecMatrix",
                value: function multVecMatrix(matrix) {
                    var x = this[0];
                    var y = this[1];
                    var w = 1.0;
                    this[0] = w * matrix.$matrix.m41 + x * matrix.$matrix.m11 + y * matrix.$matrix.m21;
                    this[1] = w * matrix.$matrix.m42 + x * matrix.$matrix.m12 + y * matrix.$matrix.m22;
                    if (matrix.isPersp) {
                        var w2 = w * matrix.$matrix.m44 + x * matrix.$matrix.m14 + y * matrix.$matrix.m24;
                        if (w2 !== 0.0) {
                            this[0] /= w2;
                            this[1] /= w2;
                        }
                    }
                    return this;
                }
            },
            {
                key: "mulVecQuat",
                value: function mulVecQuat(q) {
                    var t0 = -q[1] * this[0] - q[2] * this[1];
                    var t1 = q[0] * this[0] - q[3] * this[1];
                    var t2 = q[0] * this[1] + q[3] * this[0];
                    var z = q[1] * this[1] - q[2] * this[0];
                    this[0] = t1;
                    this[1] = t2;
                    t1 = t0 * -q[1] + this[0] * q[0] - this[1] * q[3] + z * q[2];
                    t2 = t0 * -q[2] + this[1] * q[0] - z * q[1] + this[0] * q[3];
                    this[0] = t1;
                    this[1] = t2;
                    return this;
                }
            },
            {
                key: "vectorLengthSqr",
                value: function vectorLengthSqr() {
                    return this.dot(this);
                }
            },
            {
                key: "loadSTRUCT",
                value: function loadSTRUCT(reader) {
                    reader(this);
                    if (_type_of(this.vec) !== undefined) {
                        this.load(this.vec);
                        this.vec = undefined;
                    }
                }
            }
        ], [
            {
                key: "normalizedDot4",
                value: function normalizedDot4(v1, v2, v3, v4) {
                    temp1.load(v2).sub(v1).normalize();
                    temp2.load(v4).sub(v3).normalize();
                    return temp1.dot(temp2);
                }
            },
            {
                key: "normalizedDot3",
                value: function normalizedDot3(v1, center, v2) {
                    temp1.load(v1).sub(center).normalize();
                    temp2.load(v2).sub(center).normalize();
                    return temp1.dot(temp2);
                }
            }
        ]);
        return Vector21;
    }(BaseVector1), _define_property(_Vector2, "STRUCT", nstructjs.inlineRegister(_Vector2, "\n    ".concat(structName, " {\n      0 : ").concat(structType, ";\n      1 : ").concat(structType, ";\n    }"))), _Vector2);
    temp1 = new Vector21();
    temp2 = new Vector21();
    temp3 = new Vector21();
    temp4 = new Vector21();
    return Vector21;
}
export var Vector2 = makeVector2(BaseVector);
var _quat_vs3_temps = util.cachering.fromConstructor(Vector3, 64);
_v3nd4_n1_normalizedDot4 = new Vector3();
_v3nd4_n2_normalizedDot4 = new Vector3();
_v3nd_n1_normalizedDot = new Vector3();
_v3nd_n2_normalizedDot = new Vector3();
BaseVector.inherit(Vector4, 4);
F64BaseVector.inherit(Vector3, 3);
BaseVector.inherit(Vector2, 2);
var $_v3nd_n1_normalizedDot = new Vector3();
var $_v3nd_n2_normalizedDot = new Vector3();
var $_v3nd4_n1_normalizedDot4 = new Vector3();
var $_v3nd4_n2_normalizedDot4 = new Vector3();
var $_v3nd4_n1_normalizedDot3 = new Vector3();
var $_v3nd4_n2_normalizedDot3 = new Vector3();
preMultTemp = new Matrix4();
globalThis.testmat = function() {
    var x = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 0, y = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0, z = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : Math.PI * 0.5;
    var m1 = new Matrix4();
    m1.euler_rotate(x, y, z);
    //m1.scale(2.0, 0.5, 3.0);
    var t = [
        0,
        0,
        0
    ], r = [
        0,
        0,
        0
    ], s = [
        0,
        0,
        0
    ];
    m1.decompose(t, r, s);
    globalThis.console.log("\n");
    globalThis.console.log(t);
    globalThis.console.log(r);
    globalThis.console.log(s);
    var mat = m1.clone();
    mat.transpose();
    mat.multiply(m1);
    console.log(mat.toString());
    return r;
};
lookat_cache_ms = util.cachering.fromConstructor(Matrix4, 64);
euler_rotate_mats = util.cachering.fromConstructor(Matrix4, 64);
temp_mats = util.cachering.fromConstructor(Matrix4, 64);
import fs from "fs";
import { Matrix4 } from "./matrix4.js";
import { IndexRange } from "./indexRange.js";
function basicDotFuncs(vecsize, VArg) {
    var s = "";
    var vectorDotDistance = "    vectorDotDistance(b: ".concat(VArg, "): number {\n");
    for(var i = 0; i < vecsize; i++){
        vectorDotDistance += "      const d".concat(i, " = this[").concat(i, "] - b[").concat(i, "];\n");
    }
    vectorDotDistance += "      return ";
    for(var i1 = 0; i1 < vecsize; i1++){
        if (i1 > 0) vectorDotDistance += " + ";
        vectorDotDistance += "d" + i1 + "*d" + i1;
    }
    vectorDotDistance += ";\n";
    vectorDotDistance += "    }\n\n";
    s += vectorDotDistance;
    var vectorDistance = "    vectorDistance(b: ".concat(VArg, "): number {\n");
    for(var i2 = 0; i2 < vecsize; i2++){
        vectorDistance += "      const d".concat(i2, " = this[").concat(i2, "] - (b[").concat(i2, "] ?? 0);\n");
    }
    vectorDistance += "      return Math.sqrt(";
    for(var i3 = 0; i3 < vecsize; i3++){
        if (i3 > 0) vectorDistance += " + ";
        vectorDistance += "d" + i3 + "*d" + i3;
    }
    vectorDistance += ");\n";
    vectorDistance += "    }\n\n";
    s += vectorDistance;
    var vectorDistanceSqr = "    vectorDistanceSqr(b: ".concat(VArg, "): number {\n");
    for(var i4 = 0; i4 < vecsize; i4++){
        vectorDistanceSqr += "      const d".concat(i4, " = this[").concat(i4, "] - (b[").concat(i4, "] ?? 0);\n");
    //vectorDistanceSqr += "  let d"+i+" = this["+i+"]-(b["+i+"]||0);\n\n  ";
    }
    vectorDistanceSqr += "      return (";
    for(var i5 = 0; i5 < vecsize; i5++){
        if (i5 > 0) vectorDistanceSqr += " + ";
        vectorDistanceSqr += "d" + i5 + "*d" + i5;
    }
    vectorDistanceSqr += ");\n";
    vectorDistanceSqr += "    }";
    s += vectorDistanceSqr;
    return s;
}
function genBase(base, name, vecsize) {
    var VArg = "VectorLikeOrHigher<".concat(vecsize, ", this>");
    var cls = base.inherit;
    function unroll(s) {
        var char = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "\n", offset = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 0, count = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : vecsize;
        var s1 = "";
        var axes = "xyzw";
        for(var i = 0; i < count; i++){
            s1 += s.replace(/\$\$/g, "" + (i + offset)).replace(/\$X/g, axes[i]) + char;
        }
        // chop off trailing char
        return s1.slice(0, -1);
    }
    function unrollJoin(s) {
        var char = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "\n", count = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : vecsize;
        var arr = [];
        var axes = "xyzw";
        for(var i = 0; i < count; i++){
            arr.push(s.replace(/\$\$/g, "" + i).replace(/\$X/g, axes[i]));
        }
        return arr.join(char);
    }
    // method level indent
    var mTab = "      ";
    // class level indent
    var cTab = "    ";
    var basicFuncs = "";
    for(var k in basic_funcs){
        var func = basic_funcs[k];
        var args = func[0];
        var line = func[1];
        var f;
        var code = "    ".concat(k, "(");
        for(var i = 0; i < args.length; i++){
            var arg = args[i];
            var type = arg === "vb" ? "".concat(VArg) : "number";
            arg = (arg === "vb" ? "b" : arg).toLowerCase();
            if (i > 0) code += ", ";
            line = line.replace(args[i], arg);
            code += "".concat(arg.toLowerCase(), ": ").concat(type);
        }
        code += ") {\n";
        if (func.length > 2) {
            //make summation
            code += mTab + "return ";
            for(var i1 = 0; i1 < vecsize; i1++){
                if (i1 > 0) code += " ".concat(func[2], " ");
                code += "(" + line.replace(/X/g, "" + i1) + ")";
            }
            code += ";\n";
        } else {
            for(var i2 = 0; i2 < vecsize; i2++){
                var line2 = line.replace(/X/g, "" + i2);
                code += mTab + "this[" + i2 + "] = " + line2 + ";\n";
            }
            code += "".concat(mTab, "return this;\n");
        }
        code += "".concat(cTab, "}\n\n");
        basicFuncs += code;
    }
    var indexType = unroll("$$").split("\n").join("|");
    var VArgS = "VectorLikeOrHigher<".concat(vecsize, ", Vector").concat(vecsize, ">");
    var s = "";
    s += "\nfunction create".concat(name).concat(vecsize, "(parent: typeof Array | typeof Float32Array, structName?: string) {\n  return class ").concat(name).concat(vecsize, " extends parent {\n").concat(unroll("    $$: number;"), "\n    // this is set by the parent class\n    // @ts-expect-error\n    length: number\n    [Symbol.iterator] = parent.prototype[Symbol.iterator];\n\n    static structName = structName;\n    static STRUCT = structName !== undefined ? nstructjs.inlineRegister(this, `\n    ${structName} {\n").concat(unroll("      $$: double;"), "\n    }`) : undefined;\n    \n    static normalizedDot4(v1: ").concat(VArgS, ", v2: ").concat(VArgS, ", v3: ").concat(VArgS, ", v4: ").concat(VArgS, ") {\n").concat(unroll("      let d$X1 = v2[$$] - v1[$$];"), "\n").concat(unroll("      let d$X2 = v4[$$] - v3[$$];"), "\n      // normalize\n      let l1 = Math.sqrt(").concat(unrollJoin("d$X1*d$X1", " + "), ")\n      let l2 = Math.sqrt(").concat(unrollJoin("d$X2*d$X2", " + "), ")\n\n      // normalize\n      l1 = l1 > 0.0000001 ? 1.0 / l1 : 0.0\n      l2 = l2 > 0.0000001 ? 1.0 / l2 : 0.0\n").concat(unroll("      d$X1 *= l1;"), "\n").concat(unroll("      d$X1 *= l1;"), "\n  \n      return ").concat(unrollJoin("d$X1*d$X2", " + "), ";\n    }\n\n    static normalizedDot3(v1: ").concat(VArgS, ", center: ").concat(VArgS, ", v2: ").concat(VArgS, ") {\n").concat(unroll("      let d$X1 = v1[$$] - center[$$];"), "\n").concat(unroll("      let d$X2 = v2[$$] - center[$$];"), "\n      // normalize\n      let l1 = Math.sqrt(").concat(unrollJoin("d$X1*d$X1", " + "), ")\n      let l2 = Math.sqrt(").concat(unrollJoin("d$X2*d$X2", " + "), ")\n\n      // normalize\n      l1 = l1 > 0.0000001 ? 1.0 / l1 : 0.0\n      l2 = l2 > 0.0000001 ? 1.0 / l2 : 0.0\n").concat(unroll("      d$X1 *= l1;"), "\n").concat(unroll("      d$X1 *= l1;"), "\n  \n      return ").concat(unrollJoin("d$X1*d$X2", " + "), ";\n    }\n\n    constructor(existing?: number[] | VectorLikeOrHigher<").concat(vecsize, ", ").concat(name).concat(vecsize, ">) {\n      super(").concat(vecsize, ");\n      if (existing !== undefined) {\n").concat(unroll("".concat(mTab, "  this[$$] = existing[$$] ?? 0.0;")), "\n      } else {\n").concat(unroll("".concat(mTab, "  this[$$] = 0;")), "\n      }\n    }\n\n    load(existing: number[] | VectorLikeOrHigher<").concat(vecsize, ", ").concat(name).concat(vecsize, ">): this {\n").concat(unroll("".concat(mTab, "this[$$] = existing[$$];")), "\n      return this;\n    }\n").concat(unroll("\nload$$(b: number[] | Float32Array | VectorLikeOrHigher<$$, ".concat(name, "$$>): this {\n  \n}\n"), '\n', 1), "\n\n\n").concat(basicFuncs).concat(basicDotFuncs(vecsize, VArg), "\n    copy() {\n      return new ").concat(name).concat(vecsize, "(this);\n    }\n    vectorLengthSqr(): number {\n      return this.dot(this)\n    }\n    vectorLength(): number {\n      return Math.sqrt(this.dot(this));\n    }\n    rot2d(A: number, axis: number = 0) {\n      let x = this[0];\n      let y = this[1];\n\n      if (axis === 1) {\n        this[0] = x * Math.cos(A) + y * Math.sin(A);\n        this[1] = y * Math.cos(A) - x * Math.sin(A);\n      } else {\n        this[0] = x * Math.cos(A) - y * Math.sin(A);\n        this[1] = y * Math.cos(A) + x * Math.sin(A);\n      }\n      return this;\n    }\n    dot(b: ").concat(VArg, "): number {\n      return ").concat(unrollJoin("this[$$]*b[$$]", " + "), "\n    }\n    \n").concat(Array.from(IndexRange(vecsize)).map(function(i) {
        var s2 = "";
        var axes = "XYZW";
        s2 += "    load".concat(axes.slice(0, i + 1));
        s2 += "(";
        s2 += Array.from(axes).slice(0, i + 1).map(function(a) {
            return a.toLowerCase() + ": number";
        }).join(", ");
        s2 += ") {\n";
        s2 += Array.from(axes).slice(0, i + 1).map(function(a, j) {
            return "      this[".concat(j, "] = ").concat(a.toLowerCase());
        }).join("\n") + "\n";
        s2 += "      return this\n";
        s2 += "    }";
        return "    " + s2.trim();
    }).join("\n"), "\n\n    swapAxes(axis1: ").concat(indexType, ", axis2: ").concat(indexType, ") {\n      const t = this[axis1];\n      this[axis1] = this[axis2];\n      this[axis2] = t;\n      return this;\n    }\n\n    /** somewhat crappy spherical interpolation */\n    sinterp(v2: this, t: number) {\n      let l1 = this.vectorLength();\n      let l2 = v2.vectorLength();\n\n      //XXX this seems horribly incorrect.\n      return this.interp(v2, t)\n        .normalize()\n        .mulScalar(l1 + (l2 - l1) * t);\n    }\n\n    /** perpendicular swap */\n    perpSwap(axis1: ").concat(indexType, " = 0, axis2: ").concat(indexType, " = 1, sign = 1) {\n      let tmp = this[axis1];\n      this[axis1] = this[axis2] * sign;\n      this[axis2] = -tmp * sign;\n      return this;\n    }\n\n    normalize(): this {\n      const l = this.vectorLength();\n      if (l > 0.00000001) {\n        this.mulScalar(1.0 / l);\n      }\n      return this;\n    }\n").concat(matrixVecMults[vecsize], "\n").concat(vecQuatMults[vecsize], "\n").concat(vecsize === 3 ? "\n    cross(v: ".concat(VArg, ") {\n      const x = this[1] * v[2] - this[2] * v[1];\n      const y = this[2] * v[0] - this[0] * v[2];\n      const z = this[0] * v[1] - this[1] * v[0];\n\n      this[0] = x;\n      this[1] = y;\n      this[2] = z;\n\n      return this;\n    }\n") : "", "\n    preNormalizedAngle(v2: ").concat(VArg, ") {\n      let th = this.dot(v2) * 0.99999;\n      return Math.acos(th);\n    }\n\n    loadSTRUCT(reader: StructReader<this>) {\n      reader(this);\n    }\n  }\n}\n  ");
    return s;
}
function genCode() {
    var s = "";
    s += '\n// generated by genVectormath.ts\nimport nstructjs from "./struct";\nimport type { StructReader } from "./nstructjs";\nimport * as util from "./util";\nimport { Matrix4 } from \'./matrix4\';\n\nconst temp_mats = util.cachering.fromConstructor(Matrix4, 64);\nconst DOT_NORM_SNAP_LIMIT = 0.00000000001;\nconst FLT_EPSILON = 2.22e-16;\n\nexport type VectorLike<LEN extends 0 | 1 | 2 | 3 | 4> = {\n  //[P: number]: never;\n  0: LEN extends 1 | 2 | 3 | 4 ? number : never;\n  1?: LEN extends 2 | 3 | 4 ? number : never;\n  2?: LEN extends 3 | 4 ? number : never;\n  3?: LEN extends 4 ? number : never;\n  length: number;\n};\n\ndeclare interface IOpenNumVector {\n  [k: number]: number;\n  length: number;\n}\n\ntype indexUnions = { 0: never; 1: 0; 2: 0 | 1; 3: 0 | 1 | 2; 4: 0 | 1 | 2 | 3 };\ntype strNumMap = { "0": 0; "1": 1; "2": 2; "3": 3; "4": 4 };\n\nexport type INumVectorLimited<LEN extends 0 | 1 | 2 | 3 | 4> = {\n  //[P: number]: never;\n  0: LEN extends 1 | 2 | 3 | 4 ? number : never;\n  1?: LEN extends 2 | 3 | 4 ? number : never;\n  2?: LEN extends 3 | 4 ? number : never;\n  3?: LEN extends 4 ? number : never;\n  length: number;\n};\n\ndeclare type INumVector = IOpenNumVector | INumVectorLimited<2> | INumVectorLimited<3> | INumVectorLimited<4>;\n\nexport type IndexUnion<L extends 0 | 1 | 2 | 3 | 4> = indexUnions[L];\n\n//type indexUnions = { 2: 0 | 1, 3: 0 | 1 | 2, 4: 0 | 1 | 2 | 3 };\n\nexport type Number1 = 0;\nexport type Number2 = 0 | 1;\nexport type Number3 = 0 | 1 | 2;\nexport type Number4 = 0 | 1 | 2 | 3;\nexport type Number5 = 0 | 1 | 2 | 3 | 4;\n\ntype numlits = { 1: 1; 2: 2 | 3 | 4; 3: 3 | 4; 4: 4 };\nexport type NumLitHigher<L extends 1 | 2 | 3 | 4> = numlits[L];\n\ndeclare interface IBaseVector<LEN extends 1 | 2 | 3 | 4, ArrayType = Array<number>> {\n  //[P: P extends indexUnions[LEN] ? number : never]: P extends IndexUnion<LEN> ? number : never;\n\n  // type helper phantom property\n  LEN?: LEN;\n  \n  length: LEN | number;\n\n  0: LEN extends 1 | 2 | 3 | 4 ? number : never;\n  1: LEN extends 2 | 3 | 4 ? number : never;\n  2: LEN extends 3 | 4 ? number : never;\n  3: LEN extends 4 ? number : never;\n\n  [Symbol.iterator](): Iterator<number>;\n\n  sinterp(b: IBaseVector<NumLitHigher<LEN>>, t: number): this;\n\n  perpSwap(axis1?: number, axis2?: number, sign?: number): this;\n\n  //all math operates in-place, no new objects\n  load(b: IBaseVector<NumLitHigher<LEN>> | INumVector): this;\n\n  loadXY(x: number, y: number): this;\n\n  copy(): this;\n\n  add(b: IBaseVector<NumLitHigher<LEN>>): this;\n  sub(b: IBaseVector<NumLitHigher<LEN>>): this;\n  mul(b: IBaseVector<NumLitHigher<LEN>>): this;\n  div(b: IBaseVector<NumLitHigher<LEN>>): this;\n  addScalar(b: number): this;\n  subScalar(b: number): this;\n  mulScalar(b: number): this;\n  divScalar(b: number): this;\n  minScalar(b: number): this;\n  maxScalar(b: number): this;\n  min(b: IBaseVector<NumLitHigher<LEN>>): this;\n  max(b: IBaseVector<NumLitHigher<LEN>>): this;\n  floor(): this;\n  fract(): this;\n  ceil(): this;\n  abs(): this;\n  dot(b: IBaseVector<NumLitHigher<LEN>>): number;\n  normalize(): this;\n  vectorLength(): number;\n  vectorLengthSqr(): number;\n  vectorDistance(b: IBaseVector<NumLitHigher<LEN>>): number;\n  vectorDistanceSqr(b: IBaseVector<NumLitHigher<LEN>>): number;\n  multVecMatrix(mat: Matrix4): void;\n  interp(b: IBaseVector<NumLitHigher<LEN>>, fac: number): this;\n  addFac(b: IBaseVector<NumLitHigher<LEN>>, fac: number): this;\n  rot2d(th: number, axis?: number | undefined): this;\n  zero(): this;\n  negate(): this;\n  swapAxes(axis1: number, axis2: number): this;\n}\n\nexport type VectorLikeOrHigher<LEN extends 2 | 3 | 4, Type = never> = Type | IBaseVector<NumLitHigher<LEN>>;\nexport type IVectorOrHigher<LEN extends 2 | 3 | 4, Type = never> = VectorLikeOrHigher<LEN, Type>\n\nexport type IQuat = IBaseVector<4> & {\n  axisAngleToQuat(axis: VectorLikeOrHigher<3>, angle: number): IQuat;\n  toMatrix(output?: Matrix4): Matrix4;\n};\n\nexport interface IVector2 extends IBaseVector<2> {}\n\nexport interface IVector3 extends IBaseVector<3> {\n  loadXYZ(x: number, y: number, z: number): this;\n\n  cross(b: VectorLikeOrHigher<3>): this;\n  load2(b: Vector2): this;\n}\n\nexport interface IVector4 extends IBaseVector<4> {\n  loadXYZ(x: number, y: number, z: number): this;\n  loadXYZW(x: number, y: number, z: number, w: number): this;\n\n  load2(b: Vector2): this;\n  load3(b: Vector3): this;\n\n  cross(b: VectorLikeOrHigher<4>): this;\n}\n\n\nexport declare interface IVectorConstructor<Type, LEN extends 2 | 3 | 4 = 3> {\n  new (value?: number[] | Type | VectorLikeOrHigher<LEN>): Type;\n\n  /** |(a - center)| dot |(b - center)| */\n  normalizedDot3(\n    a: VectorLikeOrHigher<LEN, Type>,\n    center: VectorLikeOrHigher<LEN, Type>,\n    b: VectorLikeOrHigher<LEN, Type>\n  ): number;\n\n  /** |(b - a)| dot |(d - c)| */\n  normalizedDot4(\n    a: VectorLikeOrHigher<LEN, Type>,\n    b: VectorLikeOrHigher<LEN, Type>,\n    c: VectorLikeOrHigher<LEN, Type>,\n    d: VectorLikeOrHigher<LEN, Type>\n  ): number;\n\n  structName?: string;\n  STRUCT?: string;\n}\n\nconst M_SQRT2 = Math.SQRT2\nconst PI = Math.PI\n\n  '.trim() + "\n";
    for(var i = 2; i <= 4; i++){
        s += genBase(BaseVector, "Vector", i);
    }
    s += "\nexport const Vector2 = createVector2(Array, 'vec2');\nexport const Vector3 = createVector3(Array, 'vec3');\nexport const Vector4 = createVector4(Array, 'vec4');\nexport type Vector2 = InstanceType<typeof Vector2>;\nexport type Vector3 = InstanceType<typeof Vector3>;\nexport type Vector4 = InstanceType<typeof Vector4>;\n\nconst _quat_vs3_temps = util.cachering.fromConstructor(Vector3, 64);\n\nexport class Quat extends Vector4 {\n  makeUnitQuat(): this {\n    this[0] = 1.0;\n    this[1] = this[2] = this[3] = 0.0;\n    return this;\n  }\n\n  isZero(): boolean {\n    return this[0] === 0 && this[1] === 0 && this[2] === 0 && this[3] === 0;\n  }\n\n  mulQuat(qt: this) {\n    let a = this[0] * qt[0] - this[1] * qt[1] - this[2] * qt[2] - this[3] * qt[3];\n    let b = this[0] * qt[1] + this[1] * qt[0] + this[2] * qt[3] - this[3] * qt[2];\n    let c = this[0] * qt[2] + this[2] * qt[0] + this[3] * qt[1] - this[1] * qt[3];\n    this[3] = this[0] * qt[3] + this[3] * qt[0] + this[1] * qt[2] - this[2] * qt[1];\n    this[0] = a;\n    this[1] = b;\n    this[2] = c;\n    return this;\n  }\n\n  conjugate(): this {\n    this[1] = -this[1];\n    this[2] = -this[2];\n    this[3] = -this[3];\n    return this;\n  }\n\n  dotWithQuat(q2: this) {\n    return this[0] * q2[0] + this[1] * q2[1] + this[2] * q2[2] + this[3] * q2[3];\n  }\n\n  canInvert(): boolean {\n    return this.dot(this) !== 0.0\n  }\n\n  invert(): this {\n    let f = this.dot(this);\n    if (f === 0.0) return this;\n\n    this.mulScalar(1.0 / f);\n    return this;\n  }\n\n  sub(q2: this): this {\n    let nq2 = new Quat();\n\n    nq2[0] = -q2[0];\n    nq2[1] = q2[1];\n    nq2[2] = q2[2];\n    nq2[3] = q2[3];\n\n    this.mul(nq2);\n    return this\n  }\n\n  /** if m is not undefined, will be used as output */\n  toMatrix(m?: Matrix4): Matrix4 {\n    if (m === undefined) {\n      m = new Matrix4();\n    }\n\n    let q0 = M_SQRT2 * this[0];\n    let q1 = M_SQRT2 * this[1];\n    let q2 = M_SQRT2 * this[2];\n    let q3 = M_SQRT2 * this[3];\n    let qda = q0 * q1;\n    let qdb = q0 * q2;\n    let qdc = q0 * q3;\n    let qaa = q1 * q1;\n    let qab = q1 * q2;\n    let qac = q1 * q3;\n    let qbb = q2 * q2;\n    let qbc = q2 * q3;\n    let qcc = q3 * q3;\n    m.$matrix.m11 = 1.0 - qbb - qcc;\n    m.$matrix.m12 = qdc + qab;\n    m.$matrix.m13 = -qdb + qac;\n    m.$matrix.m14 = 0.0;\n    m.$matrix.m21 = -qdc + qab;\n    m.$matrix.m22 = 1.0 - qaa - qcc;\n    m.$matrix.m23 = qda + qbc;\n    m.$matrix.m24 = 0.0;\n    m.$matrix.m31 = qdb + qac;\n    m.$matrix.m32 = -qda + qbc;\n    m.$matrix.m33 = 1.0 - qaa - qbb;\n    m.$matrix.m34 = 0.0;\n    m.$matrix.m41 = m.$matrix.m42 = m.$matrix.m43 = 0.0;\n    m.$matrix.m44 = 1.0;\n\n    return m;\n  }\n\n  matrixToQuat(wmat: Matrix4): this {\n    let mat = temp_mats.next();\n    mat.load(wmat);\n\n    mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;\n    mat.$matrix.m44 = 1.0;\n\n    let r1 = new Vector3([mat.$matrix.m11, mat.$matrix.m12, mat.$matrix.m13]);\n    let r2 = new Vector3([mat.$matrix.m21, mat.$matrix.m22, mat.$matrix.m23]);\n    let r3 = new Vector3([mat.$matrix.m31, mat.$matrix.m32, mat.$matrix.m33]);\n\n    r1.normalize();\n    r2.normalize();\n    r3.normalize();\n\n    mat.$matrix.m11 = r1[0];\n    mat.$matrix.m12 = r1[1];\n    mat.$matrix.m13 = r1[2];\n    mat.$matrix.m21 = r2[0];\n    mat.$matrix.m22 = r2[1];\n    mat.$matrix.m23 = r2[2];\n    mat.$matrix.m31 = r3[0];\n    mat.$matrix.m32 = r3[1];\n    mat.$matrix.m33 = r3[2];\n    let tr = 0.25 * (1.0 + mat.$matrix.m11 + mat.$matrix.m22 + mat.$matrix.m33);\n    let s = 0;\n    if (tr > FLT_EPSILON) {\n      s = Math.sqrt(tr);\n      this[0] = s;\n      s = 1.0 / (4.0 * s);\n      this[1] = (mat.$matrix.m23 - mat.$matrix.m32) * s;\n      this[2] = (mat.$matrix.m31 - mat.$matrix.m13) * s;\n      this[3] = (mat.$matrix.m12 - mat.$matrix.m21) * s;\n    } else {\n      if (mat.$matrix.m11 > mat.$matrix.m22 && mat.$matrix.m11 > mat.$matrix.m33) {\n        s = 2.0 * Math.sqrt(1.0 + mat.$matrix.m11 - mat.$matrix.m22 - mat.$matrix.m33);\n        this[1] = 0.25 * s;\n        s = 1.0 / s;\n        this[0] = (mat.$matrix.m32 - mat.$matrix.m23) * s;\n        this[2] = (mat.$matrix.m21 + mat.$matrix.m12) * s;\n        this[3] = (mat.$matrix.m31 + mat.$matrix.m13) * s;\n      } else if (mat.$matrix.m22 > mat.$matrix.m33) {\n        s = 2.0 * Math.sqrt(1.0 + mat.$matrix.m22 - mat.$matrix.m11 - mat.$matrix.m33);\n        this[2] = 0.25 * s;\n        s = 1.0 / s;\n        this[0] = (mat.$matrix.m31 - mat.$matrix.m13) * s;\n        this[1] = (mat.$matrix.m21 + mat.$matrix.m12) * s;\n        this[3] = (mat.$matrix.m32 + mat.$matrix.m23) * s;\n      } else {\n        s = 2.0 * Math.sqrt(1.0 + mat.$matrix.m33 - mat.$matrix.m11 - mat.$matrix.m22);\n        this[3] = 0.25 * s;\n        s = 1.0 / s;\n        this[0] = (mat.$matrix.m21 - mat.$matrix.m12) * s;\n        this[1] = (mat.$matrix.m31 + mat.$matrix.m13) * s;\n        this[2] = (mat.$matrix.m32 + mat.$matrix.m23) * s;\n      }\n    }\n    this.normalize();\n    return this;\n  }\n\n  normalize() {\n    let len = Math.sqrt(this.dot(this));\n\n    if (len !== 0.0) {\n      this.mulScalar(1.0 / len);\n    } else {\n      this[1] = 1.0;\n      this[0] = this[2] = this[3] = 0.0;\n    }\n    return this;\n  }\n\n  axisAngleToQuat(axis: VectorLikeOrHigher<3, Vector3>, angle: number) {\n    let nor = _quat_vs3_temps.next().load(axis);\n    nor.normalize();\n\n    if (nor.dot(nor) !== 0.0) {\n      let phi = angle / 2.0;\n      let si = Math.sin(phi);\n      this[0] = Math.cos(phi);\n      this[1] = nor[0] * si;\n      this[2] = nor[1] * si;\n      this[3] = nor[2] * si;\n    } else {\n      this.makeUnitQuat();\n    }\n\n    return this;\n  }\n\n  rotationBetweenVecs(v1_: VectorLikeOrHigher<3, Vector3>, v2_: VectorLikeOrHigher<3, Vector3>, fac = 1.0) {\n    const v1 = new Vector3(v1_);\n    const v2 = new Vector3(v2_);\n    v1.normalize();\n    v2.normalize();\n\n    if (Math.abs(v1.dot(v2)) > 0.9999) {\n      this.makeUnitQuat();\n      return this;\n    }\n\n    let axis = new Vector3(v1);\n    axis.cross(v2);\n\n    let angle = v1.preNormalizedAngle(v2) * fac;\n    this.axisAngleToQuat(axis, angle);\n\n    return this;\n  }\n\n  quatInterp(quat2: this, t: number) {\n    let quat = new Quat();\n    let cosom = this[0] * quat2[0] + this[1] * quat2[1] + this[2] * quat2[2] + this[3] * quat2[3];\n    if (cosom < 0.0) {\n      cosom = -cosom;\n      quat[0] = -this[0];\n      quat[1] = -this[1];\n      quat[2] = -this[2];\n      quat[3] = -this[3];\n    } else {\n      quat[0] = this[0];\n      quat[1] = this[1];\n      quat[2] = this[2];\n      quat[3] = this[3];\n    }\n\n    let omega, sinom, sc1, sc2;\n    if (1.0 - cosom > 0.0001) {\n      omega = Math.acos(cosom);\n      sinom = Math.sin(omega);\n      sc1 = Math.sin((1.0 - t) * omega) / sinom;\n      sc2 = Math.sin(t * omega) / sinom;\n    } else {\n      sc1 = 1.0 - t;\n      sc2 = t;\n    }\n    this[0] = sc1 * quat[0] + sc2 * quat2[0];\n    this[1] = sc1 * quat[1] + sc2 * quat2[1];\n    this[2] = sc1 * quat[2] + sc2 * quat2[2];\n    this[3] = sc1 * quat[3] + sc2 * quat2[3];\n\n    return this;\n  }\n}\n\nQuat.STRUCT =\n  nstructjs.inherit(Quat, Vector4, \"quat\") +\n  `\n}`;\nnstructjs.register(Quat);";
    console.log(s);
    fs.writeFileSync("vectormathNew.ts", s);
}
genCode();

