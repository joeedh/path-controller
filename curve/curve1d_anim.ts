import nstructjs from "../util/struct";
import { CurveTypeData } from "./curve1d_base";
import Ease from "./ease";
import * as util from "../util/util";
import type { StructReader } from "../util/nstructjs";
import type { Container } from "../../core/ui";
import type { Check, IconCheck } from "../../widgets/ui_widgets";

function bez3(a: number, b: number, c: number, t: number): number {
  const r1 = a + (b - a) * t;
  const r2 = b + (c - b) * t;

  return r1 + (r2 - r1) * t;
}

function bez4(a: number, b: number, c: number, d: number, t: number): number {
  const r1 = bez3(a, b, c, t);
  const r2 = bez3(b, c, d, t);

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
const BOOL_FLAG = 1e17;

const _udigest = new util.HashDigest();

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

export class SimpleCurveBase<TYPE extends string, UIDATA = any> extends CurveTypeData<
  TYPE,
  UIDATA
> {
  declare ["constructor"]: SimpleCurveConstructor;

  params: Record<string, number>;
  declare parent:
    | { redraw(): void; _on_change(): void; _fireEvent(evt: string, data: unknown): void }
    | undefined;

  constructor() {
    super();

    const def = this.constructor.define();
    this.type = def.typeName as TYPE;
    const params = def.params;

    this.params = {};
    for (const k in params) {
      this.params[k] = params[k][1] as number;
    }
  }

  get hasGUI(): boolean {
    return true;
  }

  calcHashKey(digest: util.HashDigest = _udigest.reset()): number {
    const d = digest;
    super.calcHashKey(d);

    for (const k in this.params) {
      digest.add(k);
      digest.add(this.params[k]);
    }

    return d.get();
  }

  equals(b: CurveTypeData): boolean {
    const sb = b as unknown as SimpleCurveBase<TYPE>;
    if (this.type !== sb.type) {
      return false;
    }

    for (const k in this.params) {
      if (Math.abs(this.params[k] - sb.params[k]) > 0.000001) {
        return false;
      }
    }

    return true;
  }

  redraw(): void {
    if (this.parent) this.parent.redraw();
  }

  makeGUI(container: Container): void {
    const def = this.constructor.define();
    const params = def.params;
    const elemKeyMap = new Map<any, string>();

    for (const k in params) {
      const p = params[k];

      if (p[2] === BOOL_FLAG) {
        const check = container.check(undefined, p[0]);
        check.checked = !!this.params[k];
        elemKeyMap.set(check, k);

        const this2 = this;
        check.onchange = function (this: IconCheck | Check) {
          this2.params[elemKeyMap.get(this)! as string] = this.checked ? 1 : 0;
          this2.update();
          this2.redraw();
        };
      } else {
        const slider = container.slider(undefined, {
          name      : p[0],
          defaultval: this.params[k],
          min       : p[2],
          max       : p[3],
        });
        slider.baseUnit = slider.displayUnit = "none";
        elemKeyMap.set(slider, k)!;

        const this2 = this;
        slider.onchange = function (this: IconCheck | Check) {
          this2.params[elemKeyMap.get(this)! as string] = Number(this.value);
          this2.update();
          this2.redraw();
        };
      }
    }
  }

  killGUI(container: Container): void {
    container.clear();
  }

  evaluate(_s: number): number {
    throw new Error("implement me!");
  }

  reset(): void {}

  update(): void {
    super.update();
  }

  draw(
    _canvas: HTMLCanvasElement,
    g: CanvasRenderingContext2D,
    _draw_transform: [number, [number, number]]
  ): void {
    const steps = 128;
    let s = 0;
    const ds = 1.0 / (steps - 1);

    g.beginPath();
    for (let i = 0; i < steps; i++, s += ds) {
      const co = this.evaluate(s);

      if (i) {
        g.lineTo(co, co);
      } else {
        g.moveTo(co, co);
      }
    }

    g.stroke();
  }

  _saveParams(): ParamKey[] {
    const ret: ParamKey[] = [];
    for (const k in this.params) {
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
    const params = obj.params as Record<string, number>;
    for (const k in params) {
      this.params[k] = params[k];
    }

    return this;
  }

  loadSTRUCT(reader: StructReader<this>): void {
    reader(this);
    super.loadSTRUCT(reader);

    const ps = this.params as unknown as ParamKey[];
    this.params = {};

    const pdef = this.constructor.define().params;
    if (!pdef) {
      console.warn("Missing define function for curve", this.constructor.name);
      return;
    }

    for (const pair of ps) {
      if (pair.key in pdef) {
        this.params[pair.key] = pair.val;
      }
    }

    for (const k in pdef) {
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
    const params = this.params;
    const decay = params.decay + 1.0;
    const scale = params.scale;
    const freq = params.freq;
    const phase = params.phase;

    t *= freq;
    let t2 = Math.abs(Math.cos(phase + t * Math.PI * 2.0)) * scale;

    t2 *= Math.exp(decay * t) / Math.exp(decay);

    return t2;
  }

  evaluate(t: number): number {
    const s = this._evaluate(0.0);
    const e = this._evaluate(1.0);

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
    const hash = ~~(
      this.params.mode * 127 +
      this.params.amplitude * 256 +
      this.params.period * 512
    );

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
    const amp = this.params.amplitude;
    const a1 = this.params.mode_in ? 1.0 - amp : 1.0 / 3.0;
    const a2 = this.params.mode_out ? amp : 2.0 / 3.0;

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
    const r = this.random.random();
    const decay = this.params.decay + 1.0;
    const in_mode = this.params.in_mode;

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
