import nstructjs from "../util/struct.js";

import * as util from "../util/util.js";
//import * as ui_base from './ui_base.js';
import { Vector2, Vector3, Vector4, Matrix4 } from "../util/vectormath.js";
import { EventDispatcher } from "../util/events.js";
import type { StructReader } from "../util/nstructjs.js";

export { getCurve } from "./curve1d_base.js";
export { SplineTemplates, SplineTemplateIcons } from "./curve1d_bspline.js";
import type { AllCurveTypes } from "./curve1d_all.js";

export function mySafeJSONStringify(obj: { toJSON(): Record<string, unknown> }): string {
  return JSON.stringify(obj.toJSON(), function (key) {
    let v = (this as unknown as Record<string, unknown>)[key];

    if (typeof v === "number") {
      if (v !== Math.floor(v)) {
        v = parseFloat(v.toFixed(5));
      } else {
        v = v;
      }
    }

    return v;
  });
}

export function mySafeJSONParse(buf: string): unknown {
  return JSON.parse(buf, (_key, _val) => {});
}

export { CurveConstructors, CURVE_VERSION, CurveTypeData } from "./curve1d_base.js";
import { CurveConstructors, CURVE_VERSION, CurveTypeData } from "./curve1d_base.js";

type Vec2 = InstanceType<typeof Vector2>;

interface EventCB {
  type: string;
  cb: (data: unknown) => void;
  owner: unknown;
  dead: () => boolean;
  once: boolean;
}

interface ActiveGenerators extends Array<CurveTypeData> {
  active: CurveTypeData;
}

const _udigest = new util.HashDigest();

export class Curve1D {
  _eventCBs: EventCB[];
  uiZoom: number;
  xRange: Vec2;
  yRange: Vec2;
  clipToRange: boolean;
  generators: ActiveGenerators;
  VERSION: number;
  _fastmode: boolean;
  overlay_curvefunc: ((f: number) => number) | undefined;
  _active: string | undefined;

  constructor() {
    this._eventCBs = [];

    this.uiZoom = 1.0;
    this.xRange = new Vector2().loadXY(0.0, 1.0);
    this.yRange = new Vector2().loadXY(0.0, 1.0);
    this.clipToRange = false;
    this._fastmode = false;
    this.overlay_curvefunc = undefined;

    this.generators = [] as unknown as ActiveGenerators;
    this.VERSION = CURVE_VERSION;

    for (const gen of CurveConstructors) {
      const g = new gen() as CurveTypeData;

      g.parent = this;
      this.generators.push(g);
    }

    //this.generators.active = this.generators[0];
    this.setGenerator("bspline");
  }

  get generatorType(): string | undefined {
    return this.generators.active ? this.generators.active.type : undefined;
  }

  get fastmode(): boolean {
    return this._fastmode;
  }

  set fastmode(val: boolean) {
    this._fastmode = val;

    for (const gen of this.generators) {
      gen.fastmode = val;
    }
  }

  /** cb_is_dead is a callback that returns true if it
   *  should be removed from the callback list. */
  on(type: string, cb: (data: unknown) => void, owner?: unknown, cb_is_dead?: () => boolean): void {
    if (cb_is_dead === undefined) {
      cb_is_dead = () => false;
    }

    this._eventCBs.push({ type, cb, owner, dead: cb_is_dead, once: false });
  }

  off(_type: string, cb: (data: unknown) => void): void {
    this._eventCBs = this._eventCBs.filter((item) => item.cb !== cb);
  }

  once(type: string, cb: (data: unknown) => void, owner?: unknown, cb_is_dead?: () => boolean): void {
    this.on(type, cb, owner, cb_is_dead);
    this._eventCBs[this._eventCBs.length - 1].once = true;
  }

  subscribed(type: string | undefined, owner: unknown): boolean {
    for (const cb of this._eventCBs) {
      if ((!type || cb.type === type) && cb.owner === owner) {
        return true;
      }
    }

    return false;
  }

  _pruneEventCallbacks(): void {
    this._eventCBs = this._eventCBs.filter((cb) => !cb.dead());
  }

  _fireEvent(evt: string, data: unknown): void {
    this._pruneEventCallbacks();

    for (let i = 0; i < this._eventCBs.length; i++) {
      const cb = this._eventCBs[i];

      if (cb.type !== evt) {
        continue;
      }

      try {
        cb.cb(data);
      } catch (error) {
        console.error((error as Error).stack);
        console.error((error as Error).message);
      }

      if (cb.once) {
        this._eventCBs.remove(cb);
        i--;
      }
    }
  }

  calcHashKey(digest: util.HashDigest = _udigest.reset()): number {
    const d = digest;

    for (const g of this.generators) {
      g.calcHashKey(d);
    }

    return d.get();
  }

  equals(b: Curve1D): boolean {
    const gen1 = this.generators.active;
    const gen2 = b.generators.active;

    if (gen1?.constructor !== gen2?.constructor) {
      return false;
    }

    return gen1.equals(gen2);
  }

  load(b: Curve1D | undefined): this {
    if (b === undefined || b === this) {
      return this;
    }

    const json = nstructjs.writeJSON(b as unknown as Record<string, unknown>);
    const cpy = nstructjs.readJSON(json, Curve1D as unknown as { new (): Curve1D }) as unknown as Curve1D;

    const activeCls = cpy.generators.active.constructor;
    const oldGens = this.generators;

    this.generators = cpy.generators;

    for (let gen of cpy.generators) {
      /* See if generator provides a .load() method. */
      for (const gen2 of oldGens) {
        if (gen2.constructor === gen.constructor && (gen2 as unknown as Record<string, unknown>).load !== undefined) {
          cpy.generators[cpy.generators.indexOf(gen)] = gen2;

          if (gen2.constructor === activeCls) {
            this.generators.active = gen2;
          }

          gen2.parent = this;
          (gen2 as unknown as Record<string, Function>).load(gen);
          gen = gen2;
          break;
        }
      }

      if (gen.constructor === activeCls) {
        this.generators.active = gen;
      }
      gen.parent = this;
    }

    for (const k in json) {
      if (k === "generators") {
        continue;
      }
      if (k.startsWith("_")) {
        continue;
      }

      const v = (cpy as unknown as Record<string, unknown>)[k];
      if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") {
        (this as unknown as Record<string, unknown>)[k] = v;
      } else if (v instanceof Vector2 || v instanceof Vector3 || v instanceof Vector4 || v instanceof Matrix4) {
        ((this as unknown as Record<string, unknown>)[k] as { load(v: unknown): void }).load(v);
      }
    }

    this._on_change();
    this.redraw();

    return this;
  }

  copy(): this {
    const json = nstructjs.writeJSON(this as unknown as Record<string, unknown>);
    return nstructjs.readJSON(json, Curve1D as unknown as { new (): Curve1D }) as unknown as this;
  }

  _on_change(): void {}

  redraw(): void {
    this._fireEvent("draw", this);
  }

  setGenerator(type: string | Function): void {
    for (const gen of this.generators) {
      if (
        (gen.constructor as typeof CurveTypeData).define().name === type ||
        gen.type === type ||
        (gen.constructor as typeof CurveTypeData).define().typeName === type ||
        gen.constructor === type
      ) {
        if (this.generators.active) {
          this.generators.active.onInactive();
        }

        this.generators.active = gen;
        gen.onActive();

        return;
      }
    }

    throw new Error("unknown curve type " + type);
  }

  toJSON(): Record<string, unknown> {
    const ret: Record<string, unknown> = {
      generators      : [],
      uiZoom          : this.uiZoom,
      VERSION         : this.VERSION,
      active_generator: this.generatorType,
      xRange          : this.xRange,
      yRange          : this.yRange,
      clipToRange     : this.clipToRange,
    };

    for (const gen of this.generators) {
      (ret.generators as Record<string, unknown>[]).push(gen.toJSON());
    }

    (ret.generators as { type: string }[]).sort((a, b) => a.type.localeCompare(b.type));

    return ret;
  }

  /** throw_on_error defaults to true */
  checkGenerator<KEY extends AllCurveTypes["type"]>(type: KEY): Extract<AllCurveTypes, { type: KEY }> | undefined {
    for (const gen of this.generators) {
      if (gen.type === type) {
        return gen as Extract<AllCurveTypes, { type: KEY }>;
      }
    }

    //was a new generator registered?
    for (const cls of CurveConstructors) {
      if (cls.define().typeName === type) {
        const gen = new cls() as Extract<AllCurveTypes, { type: KEY }>;
        gen.type = type;
        gen.parent = this;
        this.generators.push(gen);
        return gen;
      }
    }
  }

  getGenerator<KEY extends AllCurveTypes["type"]>(type: KEY): Extract<AllCurveTypes, { type: KEY }> {
    const gen = this.checkGenerator(type);
    if (!gen) {
      throw new Error("Unknown generator " + type + ".");
    }
    return gen;
  }

  switchGenerator(type: string): CurveTypeData {
    const gen = this.getGenerator(type as AllCurveTypes["type"])!;

    if (gen !== this.generators.active) {
      const old = this.generators.active;

      this.generators.active = gen;

      old.onInactive(this);
      gen.onActive(this);
    }

    return gen;
  }

  destroy(): this {
    return this;
  }

  loadJSON(obj: Record<string, unknown>): this {
    this.VERSION = obj.VERSION as number;

    this.uiZoom = parseFloat(obj.uiZoom as string) || this.uiZoom;
    if (obj.xRange) {
      this.xRange = new Vector2(obj.xRange as number[]);
    }
    if (obj.yRange) {
      this.yRange = new Vector2(obj.yRange as number[]);
    }
    this.clipToRange = Boolean(obj.clipToRange);

    //this.generators = [];
    for (const gen of obj.generators as Record<string, unknown>[]) {
      const gen2 = this.checkGenerator(gen.type as AllCurveTypes["type"]);

      if (!gen2 || !(gen2 instanceof CurveTypeData)) {
        //old curve class?
        console.warn("Bad curve generator class:", gen2);
        if (gen2) {
          this.generators.remove(gen2);
        }
        continue;
      }

      gen2.parent = undefined;
      gen2.reset();
      gen2.loadJSON(gen);
      gen2.parent = this;

      if (gen.type === obj.active_generator) {
        this.generators.active = gen2;
      }

      //this.generators.push(gen2);
    }

    if (this.VERSION < 1.1) {
      this.#patchRange();
    }

    return this;
  }

  evaluate(s: number): number {
    if (this.clipToRange) {
      s = Math.min(Math.max(s, this.xRange[0]), this.xRange[1]);
    }

    let f: number;

    try {
      f = this.generators.active.evaluate(s);
    } catch (error) {
      f = 0.0;
      console.warn((error as Error).stack);
      console.warn((error as Error).message);
    }

    if (this.clipToRange) {
      f = Math.min(Math.max(f, this.yRange[0]), this.yRange[1]);
    }

    return f;
  }

  integrate(s: number, quadSteps?: number): number {
    return this.generators.active.integrate(s, quadSteps);
  }

  derivative(s: number): number {
    return this.generators.active.derivative(s);
  }

  derivative2(s: number): number {
    return this.generators.active.derivative2(s);
  }

  inverse(s: number): number {
    return this.generators.active.inverse(s);
  }

  reset(): void {
    this.generators.active.reset();
  }

  update(): void {
    return this.generators.active.update();
  }

  draw(canvas: HTMLCanvasElement, g: CanvasRenderingContext2D, draw_transform: [number, [number, number]]): this {
    let w = canvas.width;
    const h = canvas.height;

    g.save();

    const sz = draw_transform[0];
    const pan = draw_transform[1];

    g.beginPath();
    g.moveTo(-1, 0);
    g.lineTo(1, 0);
    g.strokeStyle = "red";
    g.stroke();

    g.beginPath();
    g.moveTo(0, -1);
    g.lineTo(0, 1);
    g.strokeStyle = "green";
    g.stroke();

    let f = this.xRange[0];
    const steps = 64;
    const df = (this.xRange[1] - this.xRange[0]) / (steps - 1);
    w = 6.0 / sz;

    const curve = this.generators.active;

    g.beginPath();
    for (let i = 0; i < steps; i++, f += df) {
      const val = this.evaluate(f);

      (i === 0 ? g.moveTo : g.lineTo).call(g, f, val);
    }

    g.strokeStyle = "grey";
    g.stroke();

    if (this.overlay_curvefunc !== undefined) {
      g.beginPath();
      f = this.xRange[0];

      for (let i = 0; i < steps; i++, f += df) {
        const val = this.overlay_curvefunc(f);

        (i === 0 ? g.moveTo : g.lineTo).call(g, f, val);
      }

      g.strokeStyle = "green";
      g.stroke();
    }

    this.generators.active.draw(canvas, g, draw_transform);

    g.restore();
    return this;
  }

  loadSTRUCT(reader: StructReader<this>): void {
    this.generators = [] as unknown as ActiveGenerators;
    reader(this);

    if (this.VERSION <= 0.75) {
      this.generators = [] as unknown as ActiveGenerators;

      for (const cls of CurveConstructors) {
        this.generators.push(new cls() as CurveTypeData);
      }

      this.generators.active = this.getGenerator("BSplineCurve")!;
    }

    for (const gen of this.generators.concat([])) {
      if (!(gen instanceof CurveTypeData)) {
        console.warn("Bad generator data found:", gen);
        this.generators.remove(gen);
        continue;
      }

      if (gen.type === this._active) {
        this.generators.active = gen;
      }
    }

    for (const gen of this.generators) {
      gen.parent = this;
    }

    if (this.VERSION < 1.1) {
      this.#patchRange();
    }

    delete this._active;
    this.VERSION = CURVE_VERSION;
  }

  #patchRange(): void {
    const gen = this.checkGenerator("BSplineCurve") as any;
    const range = gen?.range as [Vec2, Vec2] | undefined;
    if (range) {
      this.xRange.load(range[0]);
      this.yRange.load(range[1]);
    }
  }

  static STRUCT: string;
}

/* Remember to update toJSON() loadJSON api. */
Curve1D.STRUCT = `
Curve1D {
  generators  : array(abstract(CurveTypeData));
  _active     : string | obj.generators.active.type;
  VERSION     : float;
  uiZoom      : float;
  xRange      : vec2;
  yRange      : vec2;
  clipToRange : bool;
}
`;
nstructjs.register(Curve1D);
