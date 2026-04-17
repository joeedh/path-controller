import nstructjs from "../util/struct";
import { StructableClass, StructReader } from "../util/nstructjs";
import * as util from "../util/util";

/** Definition returned by CurveTypeData.define() and subclass overrides */
export interface CurveTypeDefine {
  uiname: string;
  name: string;
  typeName: string;
  icon?: number;
}

/** Interface for CurveTypeData subclass constructors */
export interface CurveTypeDataConstructor {
  define(): CurveTypeDefine;
  new (...args: unknown[]): CurveTypeData;
  name: string;
  STRUCT?: string;
}

export const CurveConstructors: CurveTypeDataConstructor[] = [];
export const CURVE_VERSION = 1.1;

export const CurveFlags = {
  SELECT   : 1,
  TRANSFORM: 2,
} as const;

export const TangentModes = {
  SMOOTH: 1,
  BREAK : 2,
} as const;

export function getCurve(type: string, throw_on_error: boolean = true): CurveTypeDataConstructor {
  for (let cls of CurveConstructors) {
    if (cls.name === type) return cls;
    if (cls.define().name === type) return cls;
  }

  if (throw_on_error) {
    throw new Error("Unknown curve type " + type);
  } else {
    console.warn("Unknown curve type", type);
    return getCurve("ease");
  }
}

let _udigest = new util.HashDigest();

/** Minimal interface for the parent (Curve1D) to avoid circular imports */
interface CurveParent {
  redraw(): void;
  _on_change(): void;
}

/** Minimal container interface for GUI methods */
export interface CurveGUIContainer {
  clear(): void;
  [key: string]: unknown;
}

export class CurveTypeData<TYPE extends string = string> {
  static STRUCT: string;
  type: TYPE;
  parent: CurveParent | undefined;
  fastmode: boolean;
  uidata: Record<string, unknown> | undefined;

  constructor() {
    this.type = (this.constructor as CurveTypeDataConstructor).define().typeName as TYPE;
    this.parent = undefined;
    this.fastmode = false;
    this.uidata = undefined;
  }

  get hasGUI(): boolean {
    throw new Error("get hasGUI(): implement me!");
  }

  static register(cls: CurveTypeDataConstructor): void {
    if (cls.define === CurveTypeData.define) {
      throw new Error("missing define() static method");
    }

    let def = cls.define();

    if (!def.name) {
      throw new Error(cls.name + ".define() result is missing 'name' field");
    }

    if (!def.typeName) {
      throw new Error(
        cls.name + ".define() is missing .typeName, which should equal class name; needed for minificaiton"
      );
    }

    CurveConstructors.push(cls);
  }

  static define(): CurveTypeDefine {
    return {
      uiname  : "Some Curve",
      name    : "somecurve",
      typeName: "CurveTypeData",
    };
  }

  calcHashKey(digest: util.HashDigest = _udigest.reset()): number {
    let d = digest;

    d.add(this.type);

    return d.get();
  }

  toJSON(): { type: string } {
    return {
      type: this.type,
    };
  }

  equals(b: CurveTypeData): boolean {
    return this.type === b.type;
  }

  loadJSON(obj: Record<string, unknown>): this {
    this.type = obj.type as TYPE;

    return this;
  }

  redraw(): void {
    if (this.parent) this.parent.redraw();
  }

  makeGUI(
    container: unknown,
    canvas?: unknown,
    drawTransform?: unknown,
    datapath?: unknown,
    onSourceUpdate?: unknown
  ): void {}

  killGUI(container: unknown, canvas?: unknown, g?: unknown, draw_transform?: unknown, extra?: unknown): void {
    if (container && typeof container === "object" && "clear" in container) {
      (container as CurveGUIContainer).clear();
    }
  }

  evaluate(s: number): number {
    throw new Error("implement me!");
  }

  integrate(s1: number, quadSteps: number = 64): number {
    let ret = 0.0,
      ds = s1 / quadSteps;

    for (let i = 0, s = 0; i < quadSteps; i++, s += ds) {
      ret += this.evaluate(s) * ds;
    }

    return ret;
  }

  derivative(s: number): number {
    let df = 0.0001;

    if (s > 1.0 - df * 3) {
      return (this.evaluate(s) - this.evaluate(s - df)) / df;
    } else if (s < df * 3) {
      return (this.evaluate(s + df) - this.evaluate(s)) / df;
    } else {
      return (this.evaluate(s + df) - this.evaluate(s - df)) / (2 * df);
    }
  }

  derivative2(s: number): number {
    let df = 0.0001;

    if (s > 1.0 - df * 3) {
      return (this.derivative(s) - this.derivative(s - df)) / df;
    } else if (s < df * 3) {
      return (this.derivative(s + df) - this.derivative(s)) / df;
    } else {
      return (this.derivative(s + df) - this.derivative(s - df)) / (2 * df);
    }
  }

  inverse(y: number): number {
    let steps = 9;
    let ds = 1.0 / steps,
      s = 0.0;
    let best: number | undefined = undefined;
    let ret: number | undefined = undefined;

    for (let i = 0; i < steps; i++, s += ds) {
      let s1 = s,
        s2 = s + ds;

      let mid: number = 0;

      for (let j = 0; j < 11; j++) {
        let y1 = this.evaluate(s1);
        let y2 = this.evaluate(s2);
        mid = (s1 + s2) * 0.5;

        if (Math.abs(y1 - y) < Math.abs(y2 - y)) {
          s2 = mid;
        } else {
          s1 = mid;
        }
      }

      let ymid = this.evaluate(mid);

      if (best === undefined || Math.abs(y - ymid) < best) {
        best = Math.abs(y - ymid);
        ret = mid;
      }
    }

    return ret === undefined ? 0.0 : ret;
  }

  onActive(_parent?: CurveParent | unknown, _draw_transform?: unknown): void {}

  onInactive(_parent?: CurveParent | unknown, _draw_transform?: unknown): void {}

  reset(): void {}

  destroy(): void {}

  update(): void {
    if (this.parent) this.parent._on_change();
  }

  draw(canvas: unknown, g: unknown, draw_transform: unknown): void {}

  loadSTRUCT(reader: StructReader<this>): void {
    reader(this);
  }
}

CurveTypeData.STRUCT = `
CurveTypeData {
  type : string;
}
`;
nstructjs.register(CurveTypeData);

const unitRange: [number, number] = [0, 1];

export function evalHermiteTable(table: number[], t: number, range: [number, number] | number[] = unitRange): number {
  t = (t - range[0]) / (range[1] - range[0]);

  let s = t * (table.length / 4);
  let i = Math.floor(s);

  s -= i;
  i *= 4;

  let a = table[i] + (table[i + 1] - table[i]) * s;
  let b = table[i + 2] + (table[i + 3] - table[i + 2]) * s;

  return a + (b - a) * s;
  //return table[i] + (table[i + 3] - table[i])*s;
}

export function genHermiteTable(evaluate: (t: number) => number, steps: number, range: number[] = [0, 1]): number[] {
  //console.log("building spline approx");

  let table = new Array<number>(steps);

  let [min, max] = range;

  let eps = 0.0001;
  let dt = (max - min - eps * 4.001) / (steps - 1);
  let t = min + eps * 4;
  let lastdv1: number = 0;
  let lastf3: number = 0;

  for (let j = 0; j < steps; j++, t += dt) {
    //let f1 = evaluate(t - eps*2);
    let f2 = evaluate(t - eps);
    let f3 = evaluate(t);
    let f4 = evaluate(t + eps);
    //let f5 = evaluate(t + eps*2);

    let dv1 = (f4 - f2) / (eps * 2);
    dv1 /= steps;

    if (j > 0) {
      let j2 = j - 1;

      table[j2 * 4] = lastf3;
      table[j2 * 4 + 1] = lastf3 + lastdv1 / 3.0;
      table[j2 * 4 + 2] = f3 - dv1 / 3.0;
      table[j2 * 4 + 3] = f3;
    }

    lastdv1 = dv1;
    lastf3 = f3;
  }

  return table;
}
