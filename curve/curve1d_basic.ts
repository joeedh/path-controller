import nstructjs from "../util/struct";
import { BaseUiData, CurveTypeData } from "./curve1d_base";
import { Vector2 } from "../util/vectormath";
import * as util from "../util/util";
import type { Container } from "../../core/ui";
import type { TextBox } from "../../widgets/ui_textbox";

const _udigest = new util.HashDigest();

function feq(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.00001;
}

export class EquationCurve extends CurveTypeData<
  "EquationCurve",
  BaseUiData & { textbox?: TextBox }
> {
  declare parent:
    | {
        xRange: InstanceType<typeof Vector2>;
        yRange: InstanceType<typeof Vector2>;
        redraw(): void;
        _on_change(): void;
        _fireEvent(evt: string, data: unknown): void;
      }
    | undefined;
  equation: string;
  _last_equation: string;
  _last_xrange: InstanceType<typeof Vector2>;
  _func: ((x: number) => number) | undefined;
  _haserror: boolean;
  declare hermite: number[] | undefined;

  constructor() {
    super();

    this.equation = "x";
    this._last_equation = "";
    this._last_xrange = new Vector2();
    this._func = undefined;
    this._haserror = false;
  }

  get hasGUI(): boolean {
    return this.uidata !== undefined;
  }

  static define(): { uiname: string; name: string; typeName: string } {
    return {
      uiname  : "Equation",
      name    : "equation",
      typeName: "EquationCurve",
    };
  }

  calcHashKey(digest: util.HashDigest = _udigest.reset()): number {
    const d = digest;

    super.calcHashKey(d);

    d.add(this.equation);
    d.add(this.parent!.xRange[0]);
    d.add(this.parent!.xRange[1]);

    return d.get();
  }

  equals(b: CurveTypeData): boolean {
    return super.equals(b) && this.equation === (b as unknown as EquationCurve).equation;
  }

  toJSON(): { type: string } & Record<string, unknown> {
    const ret = super.toJSON();

    return Object.assign(ret, {
      equation: this.equation,
    });
  }

  loadJSON(obj: Record<string, unknown>): this {
    super.loadJSON(obj);

    if (obj.equation !== undefined) {
      this.equation = obj.equation as string;
    }

    return this;
  }

  makeGUI(
    container: Container,
    canvas?: HTMLCanvasElement & { g: CanvasRenderingContext2D },
    drawTransform?: [number, [number, number]]
  ): void {
    this.uidata = {
      canvas    : canvas!,
      g         : canvas!.g!,
      draw_trans: drawTransform!,
    };

    const row = (container.row as Function)() as Record<string, Function>;
    const text = ((this.uidata as Record<string, unknown>).textbox = (row.textbox as Function)(
      undefined,
      "" + this.equation
    ));
    text.onchange = (val: string) => {
      console.log(val);
      this.equation = val;
      this.update();
      this.redraw();
    };
    container.label("Equation");
  }

  killGUI(_container: Container): void {
    if (this.uidata !== undefined) {
      const ud = this.uidata;
      if (ud.textbox) {
        ud.textbox.remove();
      }
    }

    this.uidata = undefined;
  }

  updateTextBox(): void {
    if (this.uidata) {
      const ud = this.uidata as Record<string, unknown>;
      if (ud.textbox) {
        (ud.textbox as Record<string, unknown>).text = this.equation;
      }
    }
  }

  evaluate(s: number): number {
    let update: boolean = !!this.hermite || this._last_equation !== this.equation;
    update = update || this._last_xrange.vectorDistance!(this.parent!.xRange) > 0.0;
    update = update || !this._func;

    if (update) {
      this._last_xrange.load(this.parent!.xRange);
      this._last_equation = this.equation;

      this.updateTextBox();
      this.#makeFunc();

      this._evaluate(0.0);

      if (this._haserror) {
        console.warn("ERROR!");
        return 0.0;
      }
    }

    return this._func!(s);
  }

  #makeFunc(): void {
    this._func = undefined;

    // eslint-disable-next-line no-var
    var func: ((x: number) => number) | undefined;
    const code = `
    (function() {
      const sin = Math.sin,
        cos = Math.cos,
        pi = Math.PI,
        PI = Math.PI,
        e = Math.E,
        E = Math.E,
        tan = Math.tan,
        abs = Math.abs,
        floor = Math.floor,
        ceil = Math.ceil,
        acos = Math.acos,
        asin = Math.asin,
        atan = Math.atan,
        cosh = Math.cos,
        sinh = Math.sinh,
        log = Math.log,
        pow = Math.pow,
        exp = Math.exp,
        sqrt = Math.sqrt,
        cbrt = Math.cbrt,
        min = Math.min,
        max = Math.max;
      return function(x) {
        return ${this.equation};
      }
    })();
    `;
    try {
      // bundler friendly form
      func = (0, eval)(code);

      this._haserror = false;
    } catch (error) {
      this._haserror = true;
      console.warn("Compile error!", (error as Error).message);
    }

    this._func = func;
  }

  _evaluate(s: number): void {
    try {
      const f = this._func!(s);
      this._haserror = false;

      if (isNaN(f)) {
        return;
      }
    } catch (_error) {
      this._haserror = true;
      console.warn("ERROR!");
    }
  }

  derivative(s: number): number {
    const df = 0.0001;

    if (s > 1.0 - df * 3) {
      return (this.evaluate(s) - this.evaluate(s - df)) / df;
    } else if (s < df * 3) {
      return (this.evaluate(s + df) - this.evaluate(s)) / df;
    } else {
      return (this.evaluate(s + df) - this.evaluate(s - df)) / (2 * df);
    }
  }

  derivative2(s: number): number {
    const df = 0.0001;

    if (s > 1.0 - df * 3) {
      return (this.derivative(s) - this.derivative(s - df)) / df;
    } else if (s < df * 3) {
      return (this.derivative(s + df) - this.derivative(s)) / df;
    } else {
      return (this.derivative(s + df) - this.derivative(s - df)) / (2 * df);
    }
  }

  inverse(y: number): number {
    const steps = 9;
    const ds = 1.0 / steps;
    let s = 0.0;
    let best: number | undefined = undefined;
    let ret: number | undefined = undefined;

    for (let i = 0; i < steps; i++, s += ds) {
      let s1 = s;
      let s2 = s + ds;

      let mid: number = 0;

      for (let j = 0; j < 11; j++) {
        this.evaluate(s1);
        this.evaluate(s2);
        mid = (s1 + s2) * 0.5;

        if (Math.abs(this.evaluate(s1) - y) < Math.abs(this.evaluate(s2) - y)) {
          s2 = mid;
        } else {
          s1 = mid;
        }
      }

      const ymid = this.evaluate(mid);

      if (best === undefined || Math.abs(y - ymid) < best) {
        best = Math.abs(y - ymid);
        ret = mid;
      }
    }

    return ret === undefined ? 0.0 : ret;
  }

  onActive(_parent?: unknown, _draw_transform?: unknown): void {}

  onInactive(_parent?: unknown, _draw_transform?: unknown): void {}

  reset(): void {
    this.equation = "x";
  }

  destroy(): void {}

  draw(
    _canvas: HTMLCanvasElement,
    g: CanvasRenderingContext2D,
    _draw_transform: [number, [number, number]]
  ): void {
    g.save();
    if (this._haserror) {
      g.fillStyle = g.strokeStyle = "rgba(255, 50, 0, 0.25)";
      g.beginPath();
      g.rect(0, 0, 1, 1);
      g.fill();

      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(1, 1);
      g.moveTo(0, 1);
      g.lineTo(1, 0);

      g.lineWidth *= 3;
      g.stroke();

      g.restore();
      return;
    }

    g.restore();
  }

  static STRUCT: string;
}

EquationCurve.STRUCT =
  nstructjs.inherit(EquationCurve, CurveTypeData) +
  `
  equation : string;
}
`;
nstructjs.register(EquationCurve);
CurveTypeData.register(EquationCurve);

export class GuassianCurve extends CurveTypeData<
  "GuassianCurve",
  BaseUiData & {
    hslider: ReturnType<Container["slider"]>;
    oslider: ReturnType<Container["slider"]>;
    dslider: ReturnType<Container["slider"]>;
  }
> {
  height: number;
  offset: number;
  deviation: number;

  constructor() {
    super();

    this.height = 1.0;
    this.offset = 1.0;
    this.deviation = 0.3; //standard deviation
  }

  get hasGUI(): boolean {
    return this.uidata !== undefined;
  }

  static define(): { uiname: string; name: string; typeName: string } {
    return {
      uiname  : "Guassian",
      name    : "guassian",
      typeName: "GuassianCurve",
    };
  }

  calcHashKey(digest: util.HashDigest = _udigest.reset()): number {
    super.calcHashKey(digest);

    const d = digest;

    d.add(this.height);
    d.add(this.offset);
    d.add(this.deviation);

    return d.get();
  }

  equals(b: CurveTypeData): boolean {
    let r = super.equals(b);
    const gb = b as unknown as GuassianCurve;

    r = r && feq(this.height, gb.height);
    r = r && feq(this.offset, gb.offset);
    r = r && feq(this.deviation, gb.deviation);

    return r;
  }

  toJSON(): { type: string } & Record<string, unknown> {
    const ret = super.toJSON();

    return Object.assign(ret, {
      height   : this.height,
      offset   : this.offset,
      deviation: this.deviation,
    });
  }

  loadJSON(obj: Record<string, unknown>): this {
    super.loadJSON(obj);

    this.height = obj.height !== undefined ? (obj.height as number) : 1.0;
    this.offset = obj.offset as number;
    this.deviation = obj.deviation as number;

    return this;
  }

  makeGUI(
    container: Container,
    canvas?: HTMLCanvasElement & { g: CanvasRenderingContext2D },
    drawTransform?: [number, [number, number]]
  ): void {
    this.uidata = {
      canvas    : canvas!,
      g         : canvas!.g,
      draw_trans: drawTransform!,
      hslider   : container.slider(undefined, "Height", this.height, -10, 10, 0.05),
      oslider   : container.slider(undefined, "Offset", this.offset, -10, 10, 0.05),
      dslider   : container.slider(undefined, "STD Deviation", this.deviation, -10, 10, 0.05),
    };

    this.uidata.hslider.onchange = () => {
      this.height = this.uidata!.hslider.value;
      this.redraw();
      this.update();
    };

    this.uidata.oslider.onchange = () => {
      this.offset = this.uidata!.oslider.value;
      this.redraw();
      this.update();
    };

    this.uidata.dslider.onchange = () => {
      this.deviation = this.uidata!.dslider.value;
      this.redraw();
      this.update();
    };
  }

  killGUI(_container: Container): void {
    if (this.uidata !== undefined) {
      const ud = this.uidata;
      ud.hslider.remove();
      ud.oslider.remove();
      ud.dslider.remove();
    }

    this.uidata = undefined;
  }

  evaluate(s: number): number {
    const r =
      this.height *
      Math.exp(-((s - this.offset) * (s - this.offset)) / (2 * this.deviation * this.deviation));
    return r;
  }

  derivative(s: number): number {
    const df = 0.0001;

    if (s > 1.0 - df * 3) {
      return (this.evaluate(s) - this.evaluate(s - df)) / df;
    } else if (s < df * 3) {
      return (this.evaluate(s + df) - this.evaluate(s)) / df;
    } else {
      return (this.evaluate(s + df) - this.evaluate(s - df)) / (2 * df);
    }
  }

  derivative2(s: number): number {
    const df = 0.0001;

    if (s > 1.0 - df * 3) {
      return (this.derivative(s) - this.derivative(s - df)) / df;
    } else if (s < df * 3) {
      return (this.derivative(s + df) - this.derivative(s)) / df;
    } else {
      return (this.derivative(s + df) - this.derivative(s - df)) / (2 * df);
    }
  }

  inverse(y: number): number {
    const steps = 9;
    const ds = 1.0 / steps;
    let s = 0.0;
    let best: number | undefined = undefined;
    let ret: number | undefined = undefined;

    for (let i = 0; i < steps; i++, s += ds) {
      let s1 = s;
      let s2 = s + ds;

      let mid: number = 0;

      for (let j = 0; j < 11; j++) {
        const y1 = this.evaluate(s1);
        const y2 = this.evaluate(s2);
        mid = (s1 + s2) * 0.5;

        if (Math.abs(y1 - y) < Math.abs(y2 - y)) {
          s2 = mid;
        } else {
          s1 = mid;
        }
      }

      const ymid = this.evaluate(mid);

      if (best === undefined || Math.abs(y - ymid) < best) {
        best = Math.abs(y - ymid);
        ret = mid;
      }
    }

    return ret === undefined ? 0.0 : ret;
  }

  static STRUCT: string;
}

GuassianCurve.STRUCT =
  nstructjs.inherit(GuassianCurve, CurveTypeData) +
  `
  height    : float;
  offset    : float;
  deviation : float;
}
`;
nstructjs.register(GuassianCurve);
CurveTypeData.register(GuassianCurve);
