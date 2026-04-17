"use strict";

/**
 *
 * A not-so-simple 1d bspline curve class.
 *
 * It's actually a 2d bspline curve class that
 * uses a root finding algorithm to find the value
 * along the x dimension.
 *
 * To make things worse, due to the rule that widgets
 * cannot store direct references into the data model
 * there is a lot of weird event handling code that's
 * used by curve widgets to sync their internal curve copy
 * and the model.
 **/
import nstructjs from "../util/struct";
import config from "../config/config";
import { ToolOp, PropertySlots } from "../toolsys/toolsys";

import * as util from "../util/util";
import { Vector2 } from "../util/vectormath";
import { IndexRange } from "../util/indexRange";
import type { StructReader } from "../util/nstructjs";
import type { ContextLike } from "../controller/controller_abstract";

export const SplineTemplates = {
  CONSTANT      : 0,
  LINEAR        : 1,
  SHARP         : 2,
  SQRT          : 3,
  SMOOTH        : 4,
  SMOOTHER      : 5,
  SHARPER       : 6,
  SPHERE        : 7,
  REVERSE_LINEAR: 8,
  GUASSIAN      : 9,
};

const templates = {
  [SplineTemplates.CONSTANT]: [
    [1, 1],
    [1, 1],
  ],
  [SplineTemplates.LINEAR]: [
    [0, 0],
    [1, 1],
  ],
  [SplineTemplates.SHARP]: [
    [0, 0],
    [0.9999, 0.0001],
    [1, 1],
  ],
  [SplineTemplates.SQRT]: [
    [0, 0],
    [0.05, 0.25],
    [0.15, 0.45],
    [0.33, 0.65],
    [1, 1],
  ],
  [SplineTemplates.SMOOTH]        : ["DEG", 3, [0, 0], [1.0 / 3.0, 0], [2.0 / 3.0, 1.0], [1, 1]],
  [SplineTemplates.SMOOTHER]      : ["DEG", 6, [0, 0], [1.0 / 2.25, 0], [2.0 / 3.0, 1.0], [1, 1]],
  [SplineTemplates.SHARPER]: [
    [0, 0],
    [0.3, 0.03],
    [0.7, 0.065],
    [0.9, 0.16],
    [1, 1],
  ],
  [SplineTemplates.SPHERE]: [
    [0, 0],
    [0.01953, 0.23438],
    [0.08203, 0.43359],
    [0.18359, 0.625],
    [0.35938, 0.81641],
    [0.625, 0.97656],
    [1, 1],
  ],
  [SplineTemplates.REVERSE_LINEAR]: [
    [0, 1],
    [1, 0],
  ],
  [SplineTemplates.GUASSIAN]: ["DEG", 5, [0, 0], [0.17969, 0.007], [0.48958, 0.01172], [0.77995, 0.99609], [1, 1]],
};

//is initialized below
export const SplineTemplateIcons: Record<string | number, HTMLImageElement> = {};

const RecalcFlags = {
  BASIS: 1,
  FULL : 2,
  ALL  : 3,

  //private flag
  FULL_BASIS: 4,
} as const;

export function mySafeJSONStringify(obj: { toJSON(): Record<string, unknown> }): string {
  return JSON.stringify(obj.toJSON(), function (key) {
    let v = this[key];

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

const bin_cache: Record<string, number> = {};
const eval2_rets = util.cachering.fromConstructor(Vector2, 32);

/*
  I hate these stupid curve widgets.  This horrible one here works by
  root-finding the x axis on a two dimensional b-spline (which works
  surprisingly well).
*/

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

export function binomial(n: number, i: number): number {
  if (i > n) {
    throw new Error("Bad call to binomial(n, i), i was > than n");
  }

  if (i === 0 || i === n) {
    return 1;
  }

  const key = "" + n + "," + i;

  if (key in bin_cache) return bin_cache[key];

  const ret = binomial(n - 1, i - 1) + binomial(n - 1, i);
  bin_cache[key] = ret;

  return ret;
}

import { CurveFlags, TangentModes, CurveTypeData, CurveTypeDataConstructor } from "./curve1d_base";
import {
  BoolProperty,
  EnumProperty,
  FloatProperty,
  IconMap,
  IntProperty,
  StringProperty,
  Vec2Property,
} from "../toolsys/toolprop";
import { JSONAny } from "../controller";
import { Container } from "../../pathux";

/** Interface for BSplineCurve's parent (Curve1D) with the methods it actually uses */
interface BSplineCurveParent {
  redraw(): void;
  _on_change(): void;
  _fireEvent(type: string, data: unknown): void;
  _fire(type: string, data: unknown): void;
  xRange: Vector2;
  yRange: Vector2;
}

/** Interface for the Curve1D object as retrieved from the data path */
interface Curve1DObject {
  copy(): Curve1DObject;
  load(b: Curve1DObject): void;
  _fireEvent(type: string, data: unknown): void;
  generators: { active: BSplineCurve };
  xRange: Vector2;
  yRange: Vector2;
  [key: string]: unknown;
}

/** Simulated mouse event for touch event wrapping */
interface WrappedMouseEvent {
  x: number;
  y: number;
  button: number;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  isTouch: boolean;
  metaKey: boolean;
  stopPropagation(): void;
  preventDefault(): void;
}

/** Points array with highlight and active properties */
class CurvePointList extends Array<Curve1DPoint> {
  highlight: Curve1DPoint | undefined;
  active: Curve1DPoint | undefined;
}

/** UI data stored on BSplineCurve for GUI event handling */
interface BSplineUIData {
  start_mpos: Vector2;
  transpoints: Curve1DPoint[];
  dom: {
    ctx: { api: { execTool(ctx: unknown, tool: unknown, args?: Record<string, unknown>): void } };
  };
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  transforming: boolean;
  draw_trans: [number, [number, number]];
  datapath: string | undefined;
}

export class Curve1dBSplineOpBase<
  Inputs extends PropertySlots = {},
  Outputs extends PropertySlots = {},
  CTX extends ContextLike = ContextLike,
> extends ToolOp<Inputs & { dataPath: StringProperty }, Outputs, CTX> {
  static override tooldef() {
    return {
      inputs: {
        dataPath: new StringProperty(),
      },
      outputs: {},
    };
  }

  _undo: Curve1DObject | undefined = undefined;

  undoPre(ctx: CTX) {
    const curve1d = this.getCurve1d(ctx);
    if (curve1d) {
      this._undo = curve1d.copy();
    } else {
      this._undo = undefined;
    }
  }

  undo(ctx: CTX) {
    const curve1d = this.getCurve1d(ctx);
    if (curve1d && this._undo) {
      curve1d.load(this._undo);
      curve1d._fireEvent("update", curve1d);
    }
  }

  getCurve1d(ctx: CTX): Curve1DObject | undefined {
    const { dataPath } = this.getInputs();

    let curve1d: Curve1DObject | undefined;
    try {
      curve1d = (ctx as { api: { getValue(ctx: unknown, path: unknown): Curve1DObject } }).api.getValue(
        ctx,
        dataPath
      ) as Curve1DObject;
    } catch (error: unknown) {
      console.error((error as Error).stack);
      console.error((error as Error).message);
      console.error("Failed to lookup curve1d property at path ", dataPath);
      return;
    }

    return curve1d;
  }

  execPost(ctx: CTX) {
    const curve1d = this.getCurve1d(ctx);
    if (curve1d) {
      curve1d._fireEvent("update", curve1d);
    }
  }
}

export class Curve1dBSplineResetOp<CTX extends ContextLike = ContextLike> extends Curve1dBSplineOpBase<{}, {}, CTX> {
  static override tooldef() {
    return {
      ...super.tooldef(),
      toolpath: "curve1d.reset_bspline",
    };
  }

  exec(ctx: CTX) {
    const curve1d = this.getCurve1d(ctx);
    if (curve1d) {
      curve1d.generators.active.reset();
    }
  }
}

ToolOp.register(Curve1dBSplineResetOp);

export class Curve1dBSplineLoadTemplOp<CTX extends ContextLike = ContextLike> extends Curve1dBSplineOpBase<
  {
    template: EnumProperty;
  },
  {},
  CTX
> {
  static override tooldef() {
    const def = super.tooldef();
    return {
      ...def,
      toolpath: "curve1d.bspline_load_template",
      inputs: {
        ...def.inputs,
        template: new EnumProperty(SplineTemplates.SMOOTH, SplineTemplates),
      },
    };
  }

  exec(ctx: CTX) {
    const curve1d = this.getCurve1d(ctx);
    const { template } = this.getInputs();

    if (curve1d) {
      curve1d.generators.active.loadTemplate(template as number);
    }
  }
}

ToolOp.register(Curve1dBSplineLoadTemplOp);

export class Curve1dBSplineDeleteOp<CTX extends ContextLike = ContextLike> extends Curve1dBSplineOpBase<{}, {}, CTX> {
  static override tooldef() {
    return {
      ...super.tooldef(),
      toolpath: "curve1d.bspline_delete_point",
    };
  }

  exec(ctx: CTX) {
    const curve1d = this.getCurve1d(ctx);

    if (curve1d) {
      curve1d.generators.active.deletePoint();
    }
  }
}

ToolOp.register(Curve1dBSplineDeleteOp);

export class Curve1dBSplineSelectOp<CTX extends ContextLike = ContextLike> extends Curve1dBSplineOpBase<
  {
    point: IntProperty;
    state: BoolProperty;
    unique: BoolProperty;
  },
  {},
  CTX
> {
  static override tooldef() {
    const def = super.tooldef();
    return {
      ...def,
      toolpath: "curve1d.bspline_select_point",
      inputs: {
        ...def.inputs,
        point : new IntProperty(-1),
        state : new BoolProperty(true),
        unique: new BoolProperty(true),
      },
    };
  }

  exec(ctx: CTX) {
    const curve1d = this.getCurve1d(ctx);

    if (curve1d) {
      const bspline = curve1d.generators.active;
      const { point, state, unique } = this.getInputs();

      for (const p of bspline.points) {
        if (p.eid === point) {
          if (state) {
            p.flag |= CurveFlags.SELECT;
          } else {
            p.flag &= ~CurveFlags.SELECT;
          }
        } else if (unique) {
          p.flag &= ~CurveFlags.SELECT;
        }
      }

      curve1d._fireEvent("select", bspline);
    }
  }
}

ToolOp.register(Curve1dBSplineSelectOp);

export class Curve1dBSplineAddOp<CTX extends ContextLike = ContextLike> extends Curve1dBSplineOpBase<
  {
    x: FloatProperty;
    y: FloatProperty;
  },
  {},
  CTX
> {
  static override tooldef() {
    const def = super.tooldef();
    return {
      ...def,
      toolpath: "curve1d.bspline_add_point",
      inputs: {
        ...def.inputs,
        x: new FloatProperty(),
        y: new FloatProperty(),
      },
    };
  }

  exec(ctx: CTX) {
    const curve1d = this.getCurve1d(ctx);

    if (curve1d) {
      const { x, y } = this.getInputs();
      curve1d.generators.active.addFromMouse(x ?? 0, y ?? 0);
    }
  }
}

ToolOp.register(Curve1dBSplineAddOp);

export class BSplineTransformOp<CTX extends ContextLike> extends ToolOp<
  {
    dataPath: StringProperty;
    off: Vec2Property;
    dpi: FloatProperty;
  },
  {},
  CTX
> {
  first = true;
  start_mpos = new Vector2();
  _undo: Curve1DPoint[] = [];

  static tooldef() {
    return {
      toolpath: "curve1d.transform_bspline",
      inputs: {
        dataPath: new StringProperty(),
        off     : new Vec2Property(),
        dpi     : new FloatProperty(1.0),
      },
      is_modal: true,
      outputs : {},
    };
  }

  storePoints(ctx: CTX): Curve1DPoint[] {
    const curve1d = this.getCurve1d(ctx);

    if (curve1d) {
      const bspline = (curve1d.generators as { active: BSplineCurve }).active;
      return Array.from(bspline.points).map((p) => p.copy());
    }

    return [];
  }

  loadPoints(ctx: CTX, ps: Curve1DPoint[]) {
    const curve1d = this.getCurve1d(ctx);

    if (curve1d) {
      const bspline = (curve1d.generators as { active: BSplineCurve }).active;

      for (const p1 of bspline.points) {
        for (const p2 of ps) {
          if (p2.eid === p1.eid) {
            p1.co.load(p2.co);
            p1.rco.load(p2.rco);
            p1.sco.load(p2.sco);
          }
        }
      }

      bspline.parent!._fireEvent("transform", bspline);

      bspline.recalc = RecalcFlags.ALL;
      bspline.updateKnots();
      bspline.update();
      bspline.redraw();
    }
  }

  undoPre(ctx: CTX) {
    this._undo = this.storePoints(ctx);
  }

  undo(ctx: CTX) {
    this.loadPoints(ctx, this._undo);
  }

  getCurve1d(ctx: CTX): Record<string, unknown> | undefined {
    const { dataPath } = this.getInputs();

    let curve1d: Record<string, unknown> | undefined;
    try {
      curve1d = (ctx as { api: { getValue(ctx: unknown, path: unknown): Record<string, unknown> } }).api.getValue(
        ctx,
        dataPath
      );
    } catch (error: unknown) {
      console.error((error as Error).stack);
      console.error((error as Error).message);
      console.error("Failed to lookup curve1d property at path ", dataPath);
      return;
    }

    return curve1d;
  }

  finish(cancel = false) {
    const ctx = this.modal_ctx!;
    this.modalEnd(cancel);

    const curve1d = this.getCurve1d(ctx);
    if (curve1d) {
      (curve1d.generators as { active: { fastmode: boolean } }).active.fastmode = false;
    }

    if (cancel) {
      this.undo(ctx);
    }
  }

  on_pointerup(_e: PointerEvent) {
    this.finish();
  }

  override modalStart(ctx: CTX): Promise<unknown> {
    const promise = super.modalStart(ctx);

    const curve1d = this.getCurve1d(ctx);
    if (!curve1d) {
      console.log("Failed to get curve1d!");
      return promise;
    }

    const bspline = (curve1d.generators as { active: BSplineCurve }).active;
    for (const p of bspline.points) {
      p.startco.load(p.co);
    }

    return promise;
  }

  on_pointermove(e: { x: number; y: number }) {
    const mpos = new Vector2().loadXY(e.x, e.y);
    if (this.first) {
      this.start_mpos.load(mpos);
      this.first = false;
      return;
    }

    const curve1d = this.getCurve1d(this.modal_ctx!);
    if (curve1d) {
      (curve1d.generators as { active: { fastmode: boolean } }).active.fastmode = true;
    }

    const { dpi } = this.getInputs();
    const off = new Vector2(mpos).sub(this.start_mpos).mulScalar(dpi ?? 1.0);
    off[1] = -off[1];

    this.inputs.off.setValue(off);

    if (!curve1d) return;

    const bspline = (curve1d.generators as { active: BSplineCurve }).active;
    for (const p of bspline.points) {
      p.co.load(p.startco);
    }

    this.exec(this.modal_ctx!);
  }

  on_pointerdown(_e: unknown) {
    this.finish();
  }

  exec(ctx: CTX) {
    const curve1d = this.getCurve1d(ctx);
    if (!curve1d) {
      return;
    }

    const bspline = (curve1d.generators as { active: BSplineCurve }).active;
    const { off } = this.getInputs();

    const xRange = curve1d.xRange as Vector2;
    const yRange = curve1d.yRange as Vector2;

    for (const p of bspline.points) {
      if (p.flag & CurveFlags.SELECT) {
        p.co.add(off as Vector2);
        p.co[0] = Math.min(Math.max(p.co[0], xRange[0] as number), xRange[1] as number);
        p.co[1] = Math.min(Math.max(p.co[1], yRange[0] as number), yRange[1] as number);
      }
    }

    (bspline.parent as BSplineCurveParent)._fireEvent("transform", bspline);

    bspline.recalc = RecalcFlags.ALL;
    bspline.updateKnots();
    bspline.update();
    bspline.redraw();
  }
}

ToolOp.register(BSplineTransformOp);

export class Curve1DPoint {
  static STRUCT: string;

  co: Vector2;
  rco: Vector2;
  sco: Vector2;
  startco: Vector2;
  eid: number;
  flag: number;
  tangent: number;

  constructor(co?: Vector2 | number[]) {
    this.co = new Vector2(co);
    this.rco = new Vector2(co);
    this.sco = new Vector2(co);

    //for transform
    this.startco = new Vector2();
    this.eid = -1;
    this.flag = 0;

    this.tangent = TangentModes.SMOOTH;

    Object.seal(this);
  }

  get 0(): never {
    throw new Error("Curve1DPoint get 0");
  }

  get 1(): never {
    throw new Error("Curve1DPoint get 1");
  }

  /* Needed for file compatibility. */
  set 0(v: number) {
    this.co[0] = v;
  }

  set 1(v: number) {
    this.co[1] = v;
  }

  load(b: Curve1DPoint) {
    this.eid = b.eid;
    this.flag = b.flag;
    this.tangent = b.tangent;

    this.co.load(b.co);
    this.rco.load(b.rco);
    this.sco.load(b.sco);
    this.startco.load(b.startco);

    return this;
  }

  set deg(_v: unknown) {
    console.warn("old file data detected");
  }

  static fromJSON(obj: Record<string, unknown>) {
    const ret = new Curve1DPoint(obj as unknown as number[]);

    if ("0" in obj) {
      ret.co[0] = obj[0] as number;
      ret.co[1] = obj[1] as number;
    } else {
      ret.co.load(obj.co as Vector2);
    }

    if (obj.startco !== undefined) {
      ret.startco.load(obj.startco as Vector2);
    }
    ret.eid = obj.eid as number;
    ret.flag = obj.flag as number;
    ret.tangent = obj.tangent as number;

    if (obj.rco !== undefined) {
      ret.rco.load(obj.rco as Vector2);
    }

    return ret;
  }

  copy() {
    const ret = new Curve1DPoint(this.co);

    ret.tangent = this.tangent;
    ret.flag = this.flag;
    ret.eid = this.eid;

    ret.startco.load(this.startco);
    ret.rco.load(this.rco);
    ret.sco.load(this.sco);

    return ret;
  }

  toJSON() {
    return {
      co     : this.co,
      eid    : this.eid,
      flag   : this.flag,
      tangent: this.tangent,

      rco    : this.rco,
      startco: this.startco,
    };
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this);

    this.sco.load(this.co);
    this.rco.load(this.co);

    splineCache.update(this);
  }
}
Curve1DPoint.STRUCT = `
Curve1DPoint {
  co      : vec2;
  rco     : vec2;
  sco     : vec2;
  startco : vec2;
  eid     : int;
  flag    : int;
  tangent : int;
}
`;
nstructjs.register(Curve1DPoint);

const _udigest = new util.HashDigest();

class BSplineCache {
  curves: BSplineCurve[];
  map: Map<number, BSplineCurve>;
  maxCurves: number;
  gen: number;

  constructor() {
    this.curves = [];
    this.map = new Map();
    this.maxCurves = 32;
    this.gen = 0;
  }

  limit() {
    if (this.curves.length <= this.maxCurves) {
      return;
    }

    this.curves.sort((a, b) => b.cache_w - a.cache_w);
    while (this.curves.length > this.maxCurves) {
      const curve = this.curves.pop()!;
      this.map.delete(curve.calcHashKey());
    }
  }

  has(curve: BSplineCurve) {
    const curve2 = this.map.get(curve.calcHashKey());
    return !!curve2?.equals(curve);
  }

  get(curve: BSplineCurve) {
    const key = curve.calcHashKey();
    curve._last_cache_key = key;

    let curve2 = this.map.get(key);
    if (curve2?.equals(curve)) {
      curve2.cache_w = this.gen++;
      return curve2;
    }

    curve2 = curve.copy();
    curve2._last_cache_key = key;

    curve2.updateKnots();
    curve2.regen_basis();
    curve2.regen_hermite();

    this.map.set(key, curve2);
    this.curves.push(curve2);

    curve2.cache_w = this.gen++;

    this.limit();

    return curve2;
  }

  _remove(key: number) {
    const curve = this.map.get(key);
    this.map.delete(key);
    if (curve) {
      this.curves.remove(curve);
    }
  }

  update(curve: BSplineCurve | Curve1DPoint) {
    if (curve instanceof Curve1DPoint) {
      return;
    }
    const key = curve._last_cache_key;

    if (this.map.has(key)) {
      this._remove(key);
      this.get(curve);
    }
  }
}

const splineCache = new BSplineCache();

let _idgen = 1;

export class BSplineCurve extends CurveTypeData<"BSplineCurve", BSplineUIData> {
  static STRUCT: string;

  _bid: number;
  _degOffset: number;
  cache_w: number;
  _last_cache_key: number;
  declare parent: BSplineCurveParent | undefined;
  points: CurvePointList;
  length: number;
  interpolating: boolean;
  _ps: Curve1DPoint[];
  hermite: number[];
  deg: number;
  recalc: number;
  basis_tables: number[][];
  eidgen: util.IDGen;
  mpos: Vector2;
  _save_hook: (() => void) | undefined;
  highlightPoint: number | undefined;

  on_mousedown: (e: MouseEvent | WrappedMouseEvent) => void;
  on_mousemove: (e: MouseEvent | WrappedMouseEvent) => void;
  on_mouseup: (e: MouseEvent | WrappedMouseEvent) => void;
  on_keydown: (e: KeyboardEvent) => void;
  on_touchstart: (e: TouchEvent) => void;
  on_touchmove: (e: TouchEvent) => void;
  on_touchend: (e: TouchEvent) => void;
  on_touchcancel: (e: TouchEvent) => void;

  constructor() {
    super();

    this._bid = _idgen++;

    this._degOffset = 0;
    this.cache_w = 0;
    this._last_cache_key = 0;

    this.fastmode = false;
    this.points = new CurvePointList();
    this.length = 0;
    this.interpolating = false;

    this._ps = [];
    this.hermite = [];

    this.deg = 6;
    this.recalc = RecalcFlags.ALL;
    this.basis_tables = [];
    this.eidgen = new util.IDGen();

    this.add(0, 0);
    this.add(1, 1);

    this.mpos = new Vector2();

    this.on_mousedown = this._on_mousedown.bind(this);
    this.on_mousemove = this._on_mousemove.bind(this);
    this.on_mouseup = this._on_mouseup.bind(this);
    this.on_keydown = this._on_keydown.bind(this);
    this.on_touchstart = this._on_touchstart.bind(this);
    this.on_touchmove = this._on_touchmove.bind(this);
    this.on_touchend = this._on_touchend.bind(this);
    this.on_touchcancel = this._on_touchcancel.bind(this);
  }

  get hasGUI() {
    return this.uidata !== undefined;
  }

  static define() {
    return {
      uiname  : "B-Spline",
      name    : "bspline",
      typeName: "BSplineCurve",
    };
  }

  calcHashKey(digest: util.HashDigest = _udigest.reset()) {
    const d = digest;

    super.calcHashKey(d);

    d.add(this.deg);
    d.add(this.interpolating);
    d.add(this.points.length);

    for (const p of this.points) {
      const x = ~~(p.co[0] * 1024);
      const y = ~~(p.co[1] * 1024);

      d.add(x);
      d.add(y);
      d.add(p.tangent); //is an enum
    }

    return d.get();
  }

  copyTo(b: BSplineCurve) {
    b.deg = this.deg;
    b.interpolating = this.interpolating;
    b.fastmode = this.fastmode;

    for (const p of this.points) {
      const p2 = p.copy();

      b.points.push(p2);
    }

    return b;
  }

  copy() {
    const curve = new BSplineCurve();
    this.copyTo(curve);
    return curve;
  }

  equals(b: CurveTypeData) {
    if (b.type !== this.type) {
      return false;
    }

    const b2 = b as BSplineCurve;

    let bad = this.points.length !== b2.points.length;

    bad = bad || this.deg !== b2.deg;
    bad = bad || this.interpolating !== b2.interpolating;

    if (bad) {
      return false;
    }

    for (let i = 0; i < this.points.length; i++) {
      const p1 = this.points[i];
      const p2 = b2.points[i];

      if (p1.co.vectorDistance(p2.co) > 0.00001) {
        return false;
      }

      if (p1.tangent !== p2.tangent) {
        return false;
      }
    }

    return true;
  }

  remove(p: Curve1DPoint) {
    const ret = this.points.remove(p);
    this.length = this.points.length;

    return ret;
  }

  add(x: number, y: number, no_update = false) {
    const p = new Curve1DPoint();
    this.recalc = RecalcFlags.ALL;

    p.eid = this.eidgen.next();

    p.co.loadXY(x, y);
    p.sco.load(p.co);
    p.rco.load(p.co);

    this.points.push(p);
    if (!no_update) {
      this.update();
    }

    this.length = this.points.length;

    return p;
  }

  update() {
    super.update();
  }

  _sortPoints() {
    if (!this.interpolating) {
      for (let i = 0; i < this.points.length; i++) {
        this.points[i].rco.load(this.points[i].co);
      }
    }

    this.points.sort(function (a, b) {
      return a.co[0] - b.co[0];
    });

    return this;
  }

  updateKnots(recalc = true, points: Curve1DPoint[] = this.points) {
    if (recalc) {
      this.recalc = RecalcFlags.ALL;
    }

    this._sortPoints();

    this._ps = [];
    if (points.length < 2) {
      return;
    }

    const degExtra = this.deg;
    this._degOffset = -this.deg;

    for (let i = 0; i < points.length - 1; i++) {
      this._ps.push(points[i]);
    }

    if (degExtra) {
      const last = points.length - 1;
      for (let i = 0; i < degExtra; i++) {
        const p = points[last].copy();
        this._ps.push(p);
      }
    }

    if (!this.interpolating) {
      for (let i = 0; i < this._ps.length; i++) {
        this._ps[i].rco.load(this._ps[i].co);
      }
    }

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const x = p.co[0];
      const y = p.co[1]; //this.evaluate(x);

      p.sco[0] = x;
      p.sco[1] = y;
    }
  }

  toJSON() {
    this._sortPoints();

    let ret = super.toJSON();

    ret = Object.assign(ret, {
      points       : this.points.map((p) => p.toJSON()),
      deg          : this.deg,
      interpolating: this.interpolating,
      eidgen       : this.eidgen.toJSON(),
    });

    return ret;
  }

  loadJSON(obj: Record<string, unknown>) {
    super.loadJSON(obj);

    this.interpolating = obj.interpolating as boolean;
    this.deg = obj.deg as number;

    this.length = 0;
    this.points = [] as unknown as CurvePointList;
    this._ps = [];

    if (obj.range) {
      /* Will be version patched later in `curve1d.ts:#patchRange()`. */
      const range = obj.range as number[][];
      (this as any).range = [new Vector2(range[0]), new Vector2(range[1])];
    }

    this.points.highlight = undefined;
    this.eidgen = util.IDGen.fromJSON(obj.eidgen as { cur?: number; _cur?: number });
    this.recalc = RecalcFlags.ALL;
    this.mpos = new Vector2();

    const points = obj.points as JSONAny;
    for (let i = 0; i < points.length; i++) {
      this.points.push(Curve1DPoint.fromJSON(points[i]));
    }

    this.updateKnots();
    this.redraw();

    return this;
  }

  basis(t: number, i: number) {
    if (this.recalc & RecalcFlags.FULL_BASIS) {
      return this._basis(t, i);
    }

    if (this.recalc & RecalcFlags.BASIS) {
      this.regen_basis();
      this.recalc &= ~RecalcFlags.BASIS;
    }

    i = Math.min(Math.max(i, 0), this._ps.length - 1);
    t = Math.min(Math.max(t, 0.0), 1.0) * 0.999999999;

    const table = this.basis_tables[i];

    let s = t * (table.length / 4) * 0.99999;

    let j = ~~s;
    s -= j;

    j *= 4;

    //return table[j] + (table[j + 3] - table[j])*s; //linear
    return bez4(table[j], table[j + 1], table[j + 2], table[j + 3], s); //cubic
  }

  reset(empty = false) {
    this.length = 0;
    this.points = [] as unknown as CurvePointList;
    this._ps = [];

    if (!empty) {
      this.add(0, 0, true);
      this.add(1, 1, true);
    }

    this.recalc = 1;
    this.updateKnots();
    this.update();
    this.redraw();

    return this;
  }

  regen_hermite(steps?: number) {
    if (splineCache.has(this)) {
      console.log("loading spline approx from cached bspline data");

      this.hermite = splineCache.get(this).hermite;
      return;
    }

    if (steps === undefined) {
      steps = this.fastmode ? 120 : 340;
    }

    if (this.interpolating) {
      steps *= 2;
    }

    this.hermite = new Array(steps);
    const table = this.hermite;

    const eps = 0.00001;
    const dt = (1.0 - eps * 4.001) / (steps - 1);
    let t = eps * 4;
    let lastdv1: number = 0;
    let lastf3: number = 0;

    for (let j = 0; j < steps; j++, t += dt) {
      const f1 = this._evaluate(t - eps * 2);
      const f2 = this._evaluate(t - eps);
      const f3 = this._evaluate(t);
      const f4 = this._evaluate(t + eps);
      const f5 = this._evaluate(t + eps * 2);

      let dv1 = (f4 - f2) / (eps * 2);
      dv1 /= steps;

      if (j > 0) {
        const j2 = j - 1;

        table[j2 * 4] = lastf3;
        table[j2 * 4 + 1] = lastf3 + lastdv1 / 3.0;
        table[j2 * 4 + 2] = f3 - dv1 / 3.0;
        table[j2 * 4 + 3] = f3;
      }

      lastdv1 = dv1;
      lastf3 = f3;
    }
  }

  solve_interpolating() {
    //this.recalc |= RecalcFlags.FULL_BASIS;

    for (const p of this._ps) {
      p.rco.load(p.co);
    }

    const points = this.points.concat(this.points);

    this._evaluate2(0.5);

    const error1 = (p: Curve1DPoint) => {
      //return p.vectorDistance(this._evaluate2(p.co[0]));
      return this._evaluate(p.co[0]) - p.co[1];
    };

    const error = (p: Curve1DPoint) => {
      return error1(p);

      /*
      let err = 0.0;
      for (let p of this.points) {
        //err += error1(p)**2;
        err += Math.abs(error1(p));
      }

      //return Math.sqrt(err);
      return err;
      //*/
    };

    let err = 0.0;
    const g = new Vector2();

    for (let step = 0; step < 25; step++) {
      err = 0.0;

      for (const p of this._ps) {
        let r1 = error(p);
        const df = 0.000001;

        err += Math.abs(r1);

        if (p === this._ps[this._ps.length - 1]) {
          continue;
        }

        g.zero();

        for (const i of IndexRange(2)) {
          const idx = i as 0 | 1;
          const orig = p.rco[idx];
          p.rco[idx] += df;
          const r2 = error(p);
          p.rco[idx] = orig;

          g[idx] = (r2 - r1) / df;
        }

        const totgs = g.dot(g);

        if (totgs < 0.00000001) {
          continue;
        }

        r1 /= totgs;
        const k = 0.5;

        p.rco[0] += -r1 * g[0] * k;
        p.rco[1] += -r1 * g[1] * k;
      }

      const th = this.fastmode ? 0.001 : 0.00005;
      if (err < th) {
        break;
      }
    }

    //this.recalc &= ~RecalcFlags.FULL_BASIS;
  }

  regen_basis() {
    if (splineCache.has(this)) {
      console.log("loading from cached bspline data");

      this.basis_tables = splineCache.get(this).basis_tables;
      return;
    }

    //let steps = this.fastmode && !this.interpolating ? 64 : 128;
    let steps = this.fastmode ? 64 : 128;

    if (this.interpolating) {
      steps *= 2;
    }

    this.basis_tables = new Array(this._ps.length);

    for (let i = 0; i < this._ps.length; i++) {
      const table: number[] = (this.basis_tables[i] = new Array((steps - 1) * 4));

      const eps = 0.00001;
      const dt = (1.0 - eps * 8) / (steps - 1);
      let t = eps * 4;
      let lastdv1 = 0.0;
      let lastf3 = 0.0;

      for (let j = 0; j < steps; j++, t += dt) {
        const f3 = this._basis(t, i);
        let dv1;

        if (0) {
          //let f1 = this._basis(t - eps*2, i);
          const f2 = this._basis(t - eps, i);
          const f4 = this._basis(t + eps, i);
          //let f5 = this._basis(t + eps*2, i);

          dv1 = (f4 - f2) / (eps * 2);
        } else {
          dv1 = this._dbasis(t, i);
        }

        if (isNaN(dv1)) {
          console.log("NaN!");
          debugger;
          dv1 = this._dbasis(t, i);
        }
        //dv1 = 0.0;

        //dv1 = 0.0;
        dv1 /= steps;

        if (j > 0) {
          const j2 = j - 1;

          table[j2 * 4] = lastf3;
          table[j2 * 4 + 1] = lastf3 + lastdv1 / 3.0;
          table[j2 * 4 + 2] = f3 - dv1 / 3.0;
          table[j2 * 4 + 3] = f3;
        }

        lastdv1 = dv1;
        lastf3 = f3;
      }
    }
  }

  _dbasis(t: number, i: number) {
    const len = this._ps.length;
    const ps = this._ps;

    function safe_inv(n: number) {
      return n === 0 ? 0 : 1.0 / n;
    }

    /*
    on factor;

    operator bas;

    a := (s - ki) / (knn - ki);
    b := (knn1 - s) / (knn1 - kn);

    f := a*bas(s, j, n-1) + b*bas(s, j+1, n-1);
    df(f, s);
    */

    function bas(s: number, i: number, n: number): number {
      const kn = Math.min(Math.max(i + 1, 0), len - 1);
      const knn = Math.min(Math.max(i + n, 0), len - 1);
      const knn1 = Math.min(Math.max(i + n + 1, 0), len - 1);
      const ki = Math.min(Math.max(i, 0), len - 1);

      if (n === 0) {
        return s >= ps[ki].rco[0] && s < ps[kn].rco[0] ? 1 : 0;
      } else {
        const a = (s - ps[ki].rco[0]) * safe_inv(ps[knn].rco[0] - ps[ki].rco[0] + 0.0001);
        const b = (ps[knn1].rco[0] - s) * safe_inv(ps[knn1].rco[0] - ps[kn].rco[0] + 0.0001);

        return a * bas(s, i, n - 1) + b * bas(s, i + 1, n - 1);
      }
    }

    function dbas(s: number, j: number, n: number): number {
      const kn_i = Math.min(Math.max(j + 1, 0), len - 1);
      const knn_i = Math.min(Math.max(j + n, 0), len - 1);
      const knn1_i = Math.min(Math.max(j + n + 1, 0), len - 1);
      const ki_i = Math.min(Math.max(j, 0), len - 1);

      const kn = ps[kn_i].rco[0];
      const knn = ps[knn_i].rco[0];
      const knn1 = ps[knn1_i].rco[0];
      const ki = ps[ki_i].rco[0];

      if (n === 0) {
        return 0;
        //return s >= ki && s < kn ? 1 : 0;
      } else {
        const div = (ki - knn) * (kn - knn1);

        if (div === 0.0) {
          return 0.0;
        }

        return (
          (((ki - s) * dbas(s, j, n - 1) - bas(s, j, n - 1)) * (kn - knn1) -
            ((knn1 - s) * dbas(s, j + 1, n - 1) - bas(s, j + 1, n - 1)) * (ki - knn)) /
          div
        );
      }
    }

    const deg = this.deg;
    return dbas(t, i + this._degOffset, deg);
  }

  _basis(t: number, i: number) {
    const len = this._ps.length;
    const ps = this._ps;

    function safe_inv(n: number) {
      return n === 0 ? 0 : 1.0 / n;
    }

    function bas(s: number, i: number, n: number): number {
      const kn = Math.min(Math.max(i + 1, 0), len - 1);
      const knn = Math.min(Math.max(i + n, 0), len - 1);
      const knn1 = Math.min(Math.max(i + n + 1, 0), len - 1);
      const ki = Math.min(Math.max(i, 0), len - 1);

      if (n === 0) {
        return s >= ps[ki].rco[0] && s < ps[kn].rco[0] ? 1 : 0;
      } else {
        const a = (s - ps[ki].rco[0]) * safe_inv(ps[knn].rco[0] - ps[ki].rco[0] + 0.0001);
        const b = (ps[knn1].rco[0] - s) * safe_inv(ps[knn1].rco[0] - ps[kn].rco[0] + 0.0001);

        return a * bas(s, i, n - 1) + b * bas(s, i + 1, n - 1);
      }
    }

    const deg = this.deg;

    const b = bas(t, i + this._degOffset, deg);

    return b;
  }

  evaluate(t: number) {
    if (this.points.length === 0) {
      return 0.0;
    }

    const a = this.points[0].rco;
    const b = this.points[this.points.length - 1].rco;

    if (t < a[0]) return a[1];
    if (t > b[0]) return b[1];

    if (this.points.length === 2) {
      t = (t - a[0]) / (b[0] - a[0]);
      return a[1] + (b[1] - a[1]) * t;
    }

    if (this.recalc) {
      this.regen_basis();

      if (this.interpolating) {
        this.solve_interpolating();
      }

      this.regen_hermite();
      this.recalc = 0;
    }

    t *= 0.999999;

    const table = this.hermite;
    let s = t * (table.length / 4);

    let i = Math.floor(s);
    s -= i;

    i *= 4;

    return table[i] + (table[i + 3] - table[i]) * s;
  }

  /* Root find t on the x axis of the curve.  This
   * is more intuitive for the user.
   */
  _evaluate(t: number) {
    const start_t = t;

    if (this.points.length === 0) {
      return 0;
    }

    const xmin = this.points[0].rco[0];
    const xmax = this.points[this.points.length - 1].rco[0];

    const steps = this.fastmode ? 16 : 32;
    let s = xmin;
    const ds = (xmax - xmin) / (steps - 1);

    let miny = 0;
    let mins = s;
    let mindx: number | undefined;

    for (let i = 0; i < steps; i++, s += ds) {
      const p = this._evaluate2(s);

      const dx = Math.abs(p[0] - start_t);
      if (mindx === undefined || dx < mindx) {
        mindx = dx;
        miny = p[1];
        mins = s;
      }
    }

    let start = mins - ds;
    let end = mins + ds;
    s = mins;

    for (let i = 0; i < 16; i++) {
      const p = this._evaluate2(s);

      if (p[0] > start_t) {
        end = s;
      } else {
        start = s;
      }

      s = (start + end) * 0.5;
      miny = p[1];
    }

    if (miny === undefined) {
      miny = 0;
    }
    return miny;

    /* newton-raphson
    //t = mins;
    t = s;

    for (let i = 0; i < 2; i++) {
      let df = 0.0001;
      let ret1 = this._evaluate2(t < 0.5 ? t : t - df);
      let ret2 = this._evaluate2(t < 0.5 ? t + df : t);

      let f1 = Math.abs(ret1[0] - start_t);
      let f2 = Math.abs(ret2[0] - start_t);
      let g = (f2 - f1)/df;

      if (f1 === f2) break;

      //if (f1 < 0.0005) break;

      if (f1 === 0.0 || g === 0.0)
        return this._evaluate2(t)[1];

      let fac = -(f1/g)*0.5;
      if (fac === 0.0) {
        fac = 0.01;
      } else if (Math.abs(fac) > 0.1) {
        fac = 0.1*Math.sign(fac);
      }

      t += fac;
      let eps = 0.00001;
      t = Math.min(Math.max(t, eps), 1.0 - eps);
    }

    return this._evaluate2(t)[1];
    */
  }

  _evaluate2(t: number) {
    const ret = eval2_rets.next();

    t *= 0.9999999;

    let sumx = 0;
    let sumy = 0;

    let totbasis = 0;

    for (let i = 0; i < this._ps.length; i++) {
      const p = this._ps[i].rco;
      const b = this.basis(t, i);

      sumx += b * p[0];
      sumy += b * p[1];

      totbasis += b;
    }

    if (totbasis !== 0.0) {
      sumx /= totbasis;
      sumy /= totbasis;
    }

    ret[0] = sumx;
    ret[1] = sumy;

    return ret;
  }

  _wrapTouchEvent(e: TouchEvent): WrappedMouseEvent {
    return {
      x              : e.touches.length ? e.touches[0].pageX : this.mpos[0],
      y              : e.touches.length ? e.touches[0].pageY : this.mpos[1],
      button         : 0,
      shiftKey       : e.shiftKey,
      altKey         : e.altKey,
      ctrlKey        : e.ctrlKey,
      isTouch        : true,
      metaKey        : e.metaKey,
      stopPropagation: () => e.stopPropagation(),
      preventDefault : () => e.preventDefault(),
    };
  }

  _on_touchstart(e: TouchEvent) {
    this.mpos[0] = e.touches[0].pageX;
    this.mpos[1] = e.touches[0].pageY;

    const e2 = this._wrapTouchEvent(e);

    this._on_mousemove(e2);
    this._on_mousedown(e2);
  }

  loadTemplate(templ: number | undefined) {
    if (templ === undefined || !templates[templ as keyof typeof templates]) {
      console.warn("Unknown bspline template", templ);
      return;
    }

    const tdata = templates[templ as keyof typeof templates];

    this.reset(true);
    this.deg = 3.0;

    for (let i = 0; i < tdata.length; i++) {
      const p = tdata[i];

      if (p === "DEG") {
        this.deg = tdata[i + 1] as number;
        i++;
        continue;
      }

      const pt = p as number[];
      this.add(pt[0], pt[1], true);
    }

    this.recalc = 1;
    this.updateKnots();
    this.update();
    this.redraw();

    if (this.parent) {
      this.parent._fireEvent("update", this.parent);
    }
  }

  _on_touchmove(e: TouchEvent) {
    this.mpos[0] = e.touches[0].pageX;
    this.mpos[1] = e.touches[0].pageY;

    const e2 = this._wrapTouchEvent(e);
    this._on_mousemove(e2);
  }

  _on_touchend(e: TouchEvent) {
    this._on_mouseup(this._wrapTouchEvent(e));
  }

  _on_touchcancel(e: TouchEvent) {
    this._on_touchend(e);
  }

  deletePoint() {
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];

      if (p.flag & CurveFlags.SELECT) {
        this.points.remove(p);
        i--;
      }
    }

    this.updateKnots();
    this.update();
    this.regen_basis();
    this.recalc = RecalcFlags.ALL;
    this.redraw();
  }

  makeGUI(
    container: Container,
    canvas: HTMLCanvasElement & { g: CanvasRenderingContext2D },
    drawTransform: [number, [number, number]],
    datapath?: string,
    onSourceUpdate?: () => void
  ) {
    const cvs = canvas;
    const drawTrans = drawTransform;
    const dpath = datapath;
    const srcUpdate = onSourceUpdate;

    console.warn(this._bid, "makeGUI", this.uidata, this.uidata ? this.uidata.start_mpos : undefined);

    let start_mpos: Vector2 | undefined;
    if (this.uidata) {
      start_mpos = (this.uidata as unknown as BSplineUIData).start_mpos;
    }

    this.uidata = {
      start_mpos : new Vector2(start_mpos),
      transpoints: [],

      dom         : container as unknown as BSplineUIData["dom"],
      canvas      : cvs,
      g           : cvs.g,
      transforming: false,
      draw_trans  : drawTrans,
      datapath    : dpath,
    };

    console.warn("Building gui");

    cvs.addEventListener("touchstart", this.on_touchstart);
    cvs.addEventListener("touchmove", this.on_touchmove);
    cvs.addEventListener("touchend", this.on_touchend);
    cvs.addEventListener("touchcancel", this.on_touchcancel);

    cvs.addEventListener("mousedown", this.on_mousedown);
    cvs.addEventListener("mousemove", this.on_mousemove);
    cvs.addEventListener("mouseup", this.on_mouseup);
    cvs.addEventListener("keydown", this.on_keydown);

    const bstrip = container.row().strip();

    let row: Container;

    const makebutton = (strip: Container, k: string) => {
      let uiname = k[0] + k.slice(1, k.length).toLowerCase();
      uiname = uiname.replace(/_/g, " ");

      const icon = strip.iconbutton(-1, uiname, () => {
        if (dpath) {
          const r = row;
          r.ctx.api.execTool<Curve1dBSplineLoadTemplOp>(r.ctx, "curve1d.bspline_load_template", {
            dataPath: dpath,
            template: SplineTemplates[k as keyof typeof SplineTemplates],
          });
          if (srcUpdate) srcUpdate();
        } else {
          this.loadTemplate(SplineTemplates[k as keyof typeof SplineTemplates]);
        }
      });

      icon.iconsheet = 0;
      icon.customIcon = SplineTemplateIcons[k];
    };

    for (const k in SplineTemplates) {
      makebutton(bstrip, k);
    }

    row = container.row();

    const fullUpdate = () => {
      this.updateKnots();
      this.update();
      this.regen_basis();
      this.recalc = RecalcFlags.ALL;
      this.redraw();
    };

    const Icons = (row.constructor as any).getIconEnum() as IconMap;

    const icon = Icons.LARGE_X !== undefined ? Icons.LARGE_X : Icons.TINY_X;
    if (Icons.LARGE_X === undefined) {
      console.log(Icons);
      console.error("Curve widget expects Icons.LARGE_X icon for delete button.");
    }

    row.iconbutton(icon, "Delete Point", () => {
      if (dpath) {
        const r = row as {
          ctx: {
            api: { execTool(ctx: unknown, tool: string, args: Record<string, unknown>): void };
          };
        };
        r.ctx.api.execTool(r.ctx, "curve1d.bspline_delete_point", {
          dataPath: dpath,
        });
      } else {
        this.deletePoint();
      }

      if (srcUpdate) srcUpdate();
      fullUpdate();
    });

    row.button("Reset", () => {
      if (dpath) {
        const r = row as {
          ctx: {
            api: { execTool(ctx: unknown, tool: string, args: Record<string, unknown>): void };
          };
        };
        r.ctx.api.execTool(r.ctx, "curve1d.reset_bspline", {
          dataPath: dpath,
        });
        if (srcUpdate) srcUpdate();
      } else {
        this.reset();
      }
    });

    const slider = row.simpleslider(undefined, {
      name    : "Degree",
      min     : 1,
      max     : 7,
      isInt   : true,
      callback: (s: { value: number }) => {
        this.deg = Math.floor(s.value);
        fullUpdate();
      },
    });
    slider.setValue(this.deg);

    let last_deg = this.deg;
    slider.updateAfter(() => {
      if (last_deg !== this.deg) {
        console.log("degree update", this.deg);
        last_deg = this.deg;
        slider.setValue(this.deg);
      }
    });

    slider.baseUnit = "none";
    slider.displayUnit = "none";

    row = container.row();
    const check = row.check(undefined, "Interpolating");
    check.checked = this.interpolating;

    check.onchange = () => {
      this.interpolating = check.value;
      fullUpdate();
    };

    return this;
  }

  killGUI(container: unknown, canvas?: unknown) {
    if (this.uidata !== undefined) {
      this.uidata = undefined;
      const cvs = canvas as HTMLCanvasElement;

      cvs.removeEventListener("touchstart", this.on_touchstart);
      cvs.removeEventListener("touchmove", this.on_touchmove);
      cvs.removeEventListener("touchend", this.on_touchend);
      cvs.removeEventListener("touchcancel", this.on_touchcancel);

      cvs.removeEventListener("mousedown", this.on_mousedown);
      cvs.removeEventListener("mousemove", this.on_mousemove);
      cvs.removeEventListener("mouseup", this.on_mouseup);
      cvs.removeEventListener("keydown", this.on_keydown);
    }

    return this;
  }

  start_transform(_useSelected = true) {
    if (!this.uidata) return;

    const ui = this.uidata as unknown as BSplineUIData;
    const dpi = 1.0 / ui.draw_trans[0];

    /* Manually set p.startco to avoid trashing it
     * if we're proxying another Curve1D.*/
    for (const p of this.points) {
      p.startco.load(p.co);
    }

    const transform_op = new BSplineTransformOp();
    transform_op.inputs.dataPath.setValue(ui.datapath!);
    transform_op.inputs.dpi.setValue(dpi);

    ui.dom.ctx.api.execTool(ui.dom.ctx, transform_op);
  }

  _on_mousedown(e: MouseEvent | WrappedMouseEvent) {
    if (!this.uidata) return;

    const ui = this.uidata as unknown as BSplineUIData;
    ui.start_mpos.load(this.transform_mpos(e.x, e.y));
    this.fastmode = true;

    const mpos = this.transform_mpos(e.x, e.y);
    const x = mpos[0];
    const y = mpos[1];
    this.do_highlight(x, y);

    if (this.points.highlight !== undefined) {
      if (!e.shiftKey) {
        for (let i = 0; i < this.points.length; i++) {
          this.points[i].flag &= ~CurveFlags.SELECT;
        }

        this.points.highlight.flag |= CurveFlags.SELECT;
      } else {
        this.points.highlight.flag ^= CurveFlags.SELECT;
      }

      if (ui.datapath) {
        const state = e.shiftKey ? !(this.points.highlight.flag & CurveFlags.SELECT) : true;

        ui.dom.ctx.api.execTool(ui.dom.ctx, "curve1d.bspline_select_point", {
          dataPath: ui.datapath,
          state,
          unique: !e.shiftKey,
          point : this.points.highlight.eid,
        });
      }
      this.start_transform();

      this.updateKnots();
      this.update();
      this.redraw();
    } else {
      const uidata = this.uidata;
      const ui = uidata as unknown as BSplineUIData;

      if (ui.datapath) {
        /*
         * Note: this may not update this particular curve instance,
         * that instance however should update this one via the "update"
         * event.
         **/
        const start_mpos = ui.start_mpos;
        ui.dom.ctx.api.execTool(ui.dom.ctx, "curve1d.bspline_add_point", {
          dataPath: ui.datapath,
          x       : start_mpos[0],
          y       : start_mpos[1],
        });
      } else {
        this.addFromMouse(ui.start_mpos[0], ui.start_mpos[1]);
        if (this.parent) {
          this.parent._fireEvent("update", this.parent);
        }
      }

      this.updateKnots();
      this.update();
      this.redraw();

      /* Event system may have regenerated this.uidata (from killGUI,
       * called from the update event handler),
       * restore the one we started with.
       */

      this.uidata = uidata;
      this.start_transform();
    }
  }

  load(b: BSplineCurve) {
    if (this === b) {
      return;
    }

    this.recalc = RecalcFlags.ALL;

    this.length = b.points.length;
    this.points.length = 0;
    this.eidgen = b.eidgen.copy();

    this.deg = b.deg;
    this.interpolating = b.interpolating;

    for (const p of b.points) {
      const p2 = new Curve1DPoint();
      p2.load(p);

      if (p === b.points.highlight) {
        this.points.highlight = p2;
      }

      this.points.push(p2);
    }

    this.updateKnots();
    this.update();
    this.redraw();

    return this;
  }

  addFromMouse(x: number, y: number) {
    const p = this.add(x, y);
    p.startco.load(p.co);
    this.points.highlight = p;

    for (const p2 of this.points) {
      p2.flag &= ~CurveFlags.SELECT;
    }
    p.flag |= CurveFlags.SELECT;

    this.updateKnots();
    this.update();
    this.redraw();

    this.points.highlight.flag |= CurveFlags.SELECT;
  }

  do_highlight(x: number, y: number) {
    if (!this.uidata) return;
    const ui = this.uidata as unknown as BSplineUIData;
    const trans = ui.draw_trans;
    let mindis = 1e17;
    let minp: Curve1DPoint | undefined = undefined;
    const limit = 19 / trans[0];
    const limitsqr = limit * limit;

    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const dx = x - p.sco[0];
      const dy = y - p.sco[1];
      const dis = dx * dx + dy * dy;

      if (dis < mindis && dis < limitsqr) {
        mindis = dis;
        minp = p;
      }
    }

    if (this.points.highlight !== minp) {
      this.points.highlight = minp;
      this.redraw();
    }
  }

  do_transform(x: number, y: number) {
    if (!this.uidata || !this.parent) return;

    const ui = this.uidata as unknown as BSplineUIData;
    const off = new Vector2([x, y]).sub(ui.start_mpos);

    const xRange = this.parent.xRange;
    const yRange = this.parent.yRange;

    for (let i = 0; i < ui.transpoints.length; i++) {
      const p = ui.transpoints[i];
      p.co.load(p.startco).add(off);

      p.co[0] = Math.min(Math.max(p.co[0], xRange[0] as number), xRange[1] as number);
      p.co[1] = Math.min(Math.max(p.co[1], yRange[0] as number), yRange[1] as number);
    }

    this.updateKnots();
    this.update();
    this.redraw();
  }

  transform_mpos(x: number, y: number): [number, number] {
    const ui = this.uidata! as unknown as BSplineUIData;
    const r = ui.canvas.getClientRects()[0];
    const dpi = devicePixelRatio; //evil module cycle: UIBase.getDPI();

    x -= r.left;
    y -= r.top;

    x *= dpi;
    y *= dpi;

    const trans = ui.draw_trans;

    x = x / trans[0] - trans[1][0];
    y = -y / trans[0] - trans[1][1];

    return [x, y];
  }

  _on_mousemove(e: MouseEvent | WrappedMouseEvent) {
    if (!this.uidata) return;

    const ui = this.uidata as unknown as BSplineUIData;
    if ((e as WrappedMouseEvent).isTouch && ui.transforming) {
      e.preventDefault();
    }

    const mpos = this.transform_mpos(e.x, e.y);
    const x = mpos[0];
    const y = mpos[1];

    if (ui.transforming) {
      this.do_transform(x, y);
      this.evaluate(0.5);
    } else {
      this.do_highlight(x, y);
    }
  }

  end_transform() {
    if (this.uidata) {
      const ui = this.uidata as unknown as BSplineUIData;
      ui.transforming = false;
    }
    this.fastmode = false;
    this.updateKnots();
    this.update();

    splineCache.update(this);
  }

  _on_mouseup(_e: MouseEvent | WrappedMouseEvent) {
    this.end_transform();
  }

  _on_keydown(e: KeyboardEvent) {
    switch (e.keyCode) {
      case 88: //xkeey
      case 46: //delete
        if (this.points.highlight !== undefined) {
          this.points.remove(this.points.highlight);
          this.recalc = RecalcFlags.ALL;

          this.points.highlight = undefined;
          this.updateKnots();
          this.update();

          if (this._save_hook !== undefined) {
            this._save_hook();
          }
        }
        break;
    }
  }

  draw(canvas: unknown, g: CanvasRenderingContext2D, draw_trans: [number, [number, number]]) {
    g.save();

    if (this.uidata === undefined) {
      return;
    }

    const ui = this.uidata as unknown as BSplineUIData;
    ui.canvas = canvas as HTMLCanvasElement;
    ui.g = g;
    ui.draw_trans = draw_trans;

    const _sz = draw_trans[0];
    const _pan = draw_trans[1];
    g.lineWidth *= 1.5;
    const strokeStyle = g.strokeStyle;

    for (let ssi = 0; ssi < 1; ssi++) {
      break; //uncomment to draw basis functions

      const steps = 512;
      for (let si = 0; si < this.points.length; si++) {
        g.beginPath();

        let f = 0;
        const df = 1.0 / (steps - 1);
        for (let i = 0; i < steps; i++, f += df) {
          let totbasis = 0;

          for (let j = 0; j < this.points.length; j++) {
            totbasis += this.basis(f, j);
          }

          let val = this.basis(f, si);

          if (ssi) val /= totbasis === 0 ? 1 : totbasis;
          (i === 0 ? g.moveTo : g.lineTo).call(g, f, ssi ? val : val * 0.5);
        }

        let color;
        const alpha = this.points[si] === this.points.highlight ? 1.0 : 0.7;

        if (ssi) {
          color = "rgba(205, 125, 5," + alpha + ")";
        } else {
          color = "rgba(25, 145, 45," + alpha + ")";
        }
        g.strokeStyle = color;
        g.stroke();
      }
    }

    g.strokeStyle = strokeStyle;
    g.lineWidth /= 3.0;

    const w = 0.03;

    for (const p of this.points) {
      g.beginPath();

      if (p === this.points.highlight) {
        g.fillStyle = "green";
      } else if (p.flag & CurveFlags.SELECT) {
        g.fillStyle = "red";
      } else {
        g.fillStyle = "orange";
      }

      g.rect(p.sco[0] - w / 2, p.sco[1] - w / 2, w, w);

      g.fill();
    }

    g.restore();
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this);
    super.loadSTRUCT(reader);

    if (this.highlightPoint !== undefined && this.highlightPoint >= 0) {
      for (const p of this.points) {
        if (p.eid === this.highlightPoint) {
          this.points.highlight = p;
        }
      }

      this.highlightPoint = undefined;
    }

    this.updateKnots();
    this.recalc = RecalcFlags.ALL;
  }
}

BSplineCurve.STRUCT =
  nstructjs.inherit(BSplineCurve, CurveTypeData) +
  `
  points         : array(Curve1DPoint);
  highlightPoint : int | this.points.highlight ? this.points.highlight.eid : -1;
  deg            : int;
  eidgen         : IDGen;
  interpolating  : bool;
}
`;
nstructjs.register(BSplineCurve);
CurveTypeData.register(BSplineCurve);

function makeSplineTemplateIcons(size: number = 64) {
  if (typeof document === "undefined") {
    /* inside a web worker? */
    return;
  }
  const dpi = devicePixelRatio;
  size = ~~(size * dpi);

  for (const k in SplineTemplates) {
    const curve = new BSplineCurve();
    curve.loadTemplate(SplineTemplates[k as keyof typeof SplineTemplates]);

    curve.fastmode = true;

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;

    const g = canvas.getContext("2d")!;
    const steps = 64;

    curve.update();

    const scale = 0.5;

    g.translate(-0.5, -0.5);
    g.scale(size * scale, size * scale);
    g.translate(0.5, 0.5);

    //margin
    const m = 0.0;

    const tent = (f: number) => 1.0 - Math.abs(Math.fract(f) - 0.5) * 2.0;

    for (let i = 0; i < steps; i++) {
      let s = i / (steps - 1);
      let f = 1.0 - curve.evaluate(tent(s));

      s = s * (1.0 - m * 2.0) + m;
      f = f * (1.0 - m * 2.0) + m;

      //s += 0.5;
      //f += 0.5;

      if (i === 0) {
        g.moveTo(s, f);
      } else {
        g.lineTo(s, f);
      }
    }

    const ls = 7.0;

    g.lineCap = "round";
    g.strokeStyle = "black";
    g.lineWidth = (ls * 3 * dpi) / (size * scale);
    g.stroke();

    g.strokeStyle = "white";
    g.lineWidth = (ls * dpi) / (size * scale);
    g.stroke();

    const url = canvas.toDataURL();
    const img = document.createElement("img");
    img.src = url;

    SplineTemplateIcons[k] = img;
    SplineTemplateIcons[SplineTemplates[k as keyof typeof SplineTemplates]] = img;
  }
}

let splineTemplatesLoaded = false;

export function initSplineTemplates() {
  if (splineTemplatesLoaded) {
    return;
  }

  splineTemplatesLoaded = true;

  for (const k in SplineTemplates) {
    const curve = new BSplineCurve();
    curve.loadTemplate(SplineTemplates[k as keyof typeof SplineTemplates]);
    splineCache.get(curve);
  }

  makeSplineTemplateIcons();
  console.log("Loaded 1d spline templates");
}

//don't run in nodejs
if (0 && !util.insideNodeJS()) {
  //delay to ensure config is fully loaded
  window.setTimeout(() => {
    if (config.autoLoadSplineTemplates) {
      initSplineTemplates();
    }
  }, 0);
}
