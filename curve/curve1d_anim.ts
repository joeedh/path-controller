import nstructjs from "../util/struct.js";
import { CurveConstructors, CurveTypeData } from "./curve1d_base.js";
import Ease from "./ease.js";
import * as util from "../util/util.js";
import type { StructReader } from "../util/nstructjs.js";

function bez3(a: number, b: number, c: number, t: number): number {
  var r1 = a + (b - a) * t;
  var r2 = b + (c - b) * t;

  return r1 + (r2 - r1) * t;
}

function bez4(a: number, b: number, c: number, d: number, t: number): number {
  var r1 = bez3(a, b, c, t);
  var r2 = bez3(b, c, d, t);

  return r1 + (r2 - r1) * t;
}

export class ParamKey {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `ParamKey {
      key : string;
      val : float;
    }`
  );

  key: string;
  val: number;

  constructor(key?: string, val?: number) {
    // note: nstructjs requires constructors take no required parameters
    this.key = key ?? "";
    this.val = val ?? 0;
  }

  loadSTRUCT(reader: StructReader<this>): void {
    reader(this);
  }
}
nstructjs.register(ParamKey);
let BOOL_FLAG = 1e17;

let _udigest = new util.HashDigest();

interface CurveDefineResult {
  params: Record<string, [string, number | boolean, number, number]>;
  name: string;
  uiname: string;
  typeName: string;
}

interface SimpleCurveConstructor {
  name: string;
  define(): CurveDefineResult;
}

export class SimpleCurveBase<TYPE extends string> extends CurveTypeData<TYPE> {
  declare ["constructor"]: SimpleCurveConstructor;
  params: Record<string, number>;
  declare uidata: Record<string, unknown> | undefined;
  declare parent: { redraw(): void; _on_change(): void; _fireEvent(evt: string, data: unknown): void } | undefined;

  constructor() {
    super();

    let def = this.constructor.define();
    this.type = def.typeName as TYPE;
    let params = def.params;

    this.params = {};
    for (let k in params) {
      this.params[k] = params[k][1] as number;
    }
  }

  get hasGUI(): boolean {
    return true;
  }

  calcHashKey(digest: util.HashDigest = _udigest.reset()): number {
    let d = digest;
    super.calcHashKey(d);

    for (let k in this.params) {
      digest.add(k);
      digest.add(this.params[k]);
    }

    return d.get();
  }

  equals(b: CurveTypeData): boolean {
    let sb = b as unknown as SimpleCurveBase<TYPE>;
    if (this.type !== sb.type) {
      return false;
    }

    for (let k in this.params) {
      if (Math.abs(this.params[k] - sb.params[k]) > 0.000001) {
        return false;
      }
    }

    return true;
  }

  redraw(): void {
    if (this.parent) this.parent.redraw();
  }

  makeGUI(container: Record<string, Function>): void {
    let def = this.constructor.define();
    let params = def.params;

    for (let k in params) {
      let p = params[k];

      if (p[2] === BOOL_FLAG) {
        let check = (container.check as Function)(undefined, p[0]) as Record<string, unknown>;
        check.checked = !!this.params[k];
        check.key = k;

        let this2 = this;
        check.onchange = function (this: Record<string, unknown>) {
          this2.params[this.key as string] = this.checked ? 1 : 0;
          this2.update();
          this2.redraw();
        };
      } else {
        let slider = (container.slider as Function)(undefined, {
          name      : p[0],
          defaultval: this.params[k],
          min       : p[2],
          max       : p[3],
        }) as Record<string, unknown>;
        slider.baseUnit = slider.displayUnit = "none";

        slider.key = k;

        let this2 = this;
        slider.onchange = function (this: Record<string, unknown>) {
          this2.params[this.key as string] = this.value as number;
          this2.update();
          this2.redraw();
        };
      }
    }
  }

  killGUI(container: Record<string, Function>): void {
    (container.clear as Function)();
  }

  evaluate(_s: number): number {
    throw new Error("implement me!");
  }

  reset(): void {}

  update(): void {
    super.update();
  }

  draw(_canvas: HTMLCanvasElement, g: CanvasRenderingContext2D, _draw_transform: [number, [number, number]]): void {
    let steps = 128;
    let s = 0,
      ds = 1.0 / (steps - 1);

    g.beginPath();
    for (let i = 0; i < steps; i++, s += ds) {
      let co = this.evaluate(s);

      if (i) {
        g.lineTo(co, co);
      } else {
        g.moveTo(co, co);
      }
    }

    g.stroke();
  }

  _saveParams(): ParamKey[] {
    let ret: ParamKey[] = [];
    for (let k in this.params) {
      ret.push(new ParamKey(k, this.params[k]));
    }

    return ret;
  }

  toJSON(): { type: string } & Record<string, unknown> {
    return Object.assign(super.toJSON(), {
      params: this.params,
    });
  }

  loadJSON(obj: Record<string, unknown>): this {
    let params = obj.params as Record<string, number>;
    for (let k in params) {
      this.params[k] = params[k];
    }

    return this;
  }

  loadSTRUCT(reader: StructReader<this>): void {
    reader(this);
    super.loadSTRUCT(reader);

    let ps = this.params as unknown as ParamKey[];
    this.params = {};

    let pdef = this.constructor.define().params;
    if (!pdef) {
      console.warn("Missing define function for curve", this.constructor.name);
      return;
    }

    for (let pair of ps) {
      if (pair.key in pdef) {
        this.params[pair.key] = pair.val;
      }
    }

    for (let k in pdef) {
      if (!(k in this.params)) {
        this.params[k] = pdef[k][1] as number;
      }
    }
  }

  static STRUCT: string;
}

SimpleCurveBase.STRUCT =
  nstructjs.inherit(SimpleCurveBase, CurveTypeData) +
  `
  params : array(ParamKey) | obj._saveParams();
}
`;
nstructjs.register(SimpleCurveBase);

export class BounceCurve extends SimpleCurveBase<"BounceCurve"> {
  static define(): CurveDefineResult {
    return {
      params: {
        decay : ["Decay", 1.0, 0.1, 5.0],
        scale : ["Scale", 1.0, 0.01, 10.0],
        freq  : ["Freq", 1.0, 0.01, 50.0],
        phase : ["Phase", 0.0, -Math.PI * 2.0, Math.PI * 2.0],
        offset: ["Offset", 0.0, -2.0, 2.0],
      },
      name    : "bounce",
      uiname  : "Bounce",
      typeName: "BounceCurve",
    };
  }

  _evaluate(t: number): number {
    let params = this.params;
    let decay = params.decay + 1.0;
    let scale = params.scale;
    let freq = params.freq;
    let phase = params.phase;

    t *= freq;
    let t2 = Math.abs(Math.cos(phase + t * Math.PI * 2.0)) * scale;

    t2 *= Math.exp(decay * t) / Math.exp(decay);

    return t2;
  }

  evaluate(t: number): number {
    let s = this._evaluate(0.0);
    let e = this._evaluate(1.0);

    return (this._evaluate(t) - s) / (e - s) + this.params.offset;
  }

  static STRUCT: string;
}

CurveTypeData.register(BounceCurve);
BounceCurve.STRUCT =
  nstructjs.inherit(BounceCurve, SimpleCurveBase) +
  `
}`;
nstructjs.register(BounceCurve);

export class ElasticCurve extends SimpleCurveBase<"ElasticCurve"> {
  _func: ((t: number) => number) | undefined;
  _last_hash: number | undefined;

  constructor() {
    super();

    this._func = undefined;
    this._last_hash = undefined;
  }

  static define(): CurveDefineResult {
    return {
      params: {
        mode     : ["Out Mode", false, BOOL_FLAG, BOOL_FLAG],
        amplitude: ["Amplitude", 1.0, 0.01, 10.0],
        period   : ["Period", 1.0, 0.01, 5.0],
      },
      name    : "elastic",
      uiname  : "Elastic",
      typeName: "ElasticCurve",
    };
  }

  evaluate(t: number): number {
    let hash = ~~(this.params.mode * 127 + this.params.amplitude * 256 + this.params.period * 512);

    if (hash !== this._last_hash || !this._func) {
      this._last_hash = hash;

      if (this.params.mode) {
        this._func = Ease.getElasticOut(this.params.amplitude, this.params.period);
      } else {
        this._func = Ease.getElasticIn(this.params.amplitude, this.params.period);
      }
    }
    return this._func(t);
  }

  static STRUCT: string;
}

CurveTypeData.register(ElasticCurve);
ElasticCurve.STRUCT =
  nstructjs.inherit(ElasticCurve, SimpleCurveBase) +
  `
}`;
nstructjs.register(ElasticCurve);

export class EaseCurve extends SimpleCurveBase<"EaseCurve"> {
  constructor() {
    super();
  }

  static define(): CurveDefineResult {
    return {
      params: {
        mode_in  : ["in", true, BOOL_FLAG, BOOL_FLAG],
        mode_out : ["out", true, BOOL_FLAG, BOOL_FLAG],
        amplitude: ["Amplitude", 1.0, 0.01, 4.0],
      },
      name    : "ease",
      uiname  : "Ease",
      typeName: "EaseCurve",
    };
  }

  evaluate(t: number): number {
    let amp = this.params.amplitude;
    let a1 = this.params.mode_in ? 1.0 - amp : 1.0 / 3.0;
    let a2 = this.params.mode_out ? amp : 2.0 / 3.0;

    return bez4(0.0, a1, a2, 1.0, t);
  }

  static STRUCT: string;
}

CurveTypeData.register(EaseCurve);
EaseCurve.STRUCT =
  nstructjs.inherit(EaseCurve, SimpleCurveBase) +
  `
}`;
nstructjs.register(EaseCurve);

export class RandCurve extends SimpleCurveBase<"RandCurve"> {
  random: util.MersenneRandom;
  _seed: number;

  constructor() {
    super();
    this.random = new util.MersenneRandom(0);
    this._seed = 0;
  }

  get seed(): number {
    return this._seed;
  }

  set seed(v: number) {
    this.random.seed(v);
    this._seed = v;
  }

  static define(): CurveDefineResult {
    return {
      params: {
        amplitude: ["Amplitude", 1.0, 0.01, 4.0],
        decay    : ["Decay", 1.0, 0.0, 5.0],
        in_mode  : ["In", true, BOOL_FLAG, BOOL_FLAG],
      },
      name    : "random",
      uiname  : "Random",
      typeName: "RandCurve",
    };
  }

  evaluate(t: number): number {
    let r = this.random.random();
    let decay = this.params.decay + 1.0;
    let in_mode = this.params.in_mode;

    if (in_mode) {
      t = 1.0 - t;
    }

    let d: number;

    if (in_mode) {
      d = Math.exp(t * decay) / Math.exp(decay);
    } else {
      d = Math.exp(t * decay) / Math.exp(decay);
    }

    t = t + (r - t) * d;

    if (in_mode) {
      t = 1.0 - t;
    }

    return t;
  }

  static STRUCT: string;
}

CurveTypeData.register(RandCurve);
RandCurve.STRUCT =
  nstructjs.inherit(RandCurve, SimpleCurveBase) +
  `
}`;
nstructjs.register(RandCurve);
