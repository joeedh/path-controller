import {nstructjs} from "../util/struct.js";
import {CurveFlags, TangentModes, CurveTypeData} from './curve1d_base.js';
import {Vector2, Vector3, Vector4, Quat, Matrix4} from '../util/vectormath.js';
import {genHermiteTable, evalHermiteTable} from './curve1d_base.js';
import * as util from '../util/util.js';

let _udigest = new util.HashDigest();

function feq(a, b) {
  return Math.abs(a-b) < 0.00001;
}

class EquationCurve extends CurveTypeData {
  constructor(type) {
    super();

    this.equation = "x";
    this._last_equation = "";
    this.hermite = undefined;
  }

  calcHashKey(digest = _udigest.reset()) {
    let d = digest;

    super.calcHashKey(d);

    d.add(this.equation);

    return d.get();
  }

  static define() {return {
    uiname : "Equation",
    name   : "equation"
  }}

  equals(b) {
    return super.equals(b) && this.equation === b.equation;
  }

  toJSON() {
    let ret = super.toJSON();

    return Object.assign(ret, {
      equation : this.equation
    });
  }

  loadJSON(obj) {
    super.loadJSON(obj);

    if (obj.equation !== undefined) {
      this.equation = obj.equation;
    }

    return this;
  }

  get hasGUI() {
    return this.uidata !== undefined;
  }

  makeGUI(container, canvas, drawTransform) {
    this.uidata = {
      canvas     : canvas,
      g          : canvas.g,
      draw_trans : drawTransform,
    };

    let text = this.uidata.textbox = container.textbox(undefined, this.equation);
    text.onchange = (val) => {
      console.log(val);
      this.equation = val;
      this.update();
      this.redraw();
    }
  }

  killGUI(dom, gui, canvas, g, draw_transform) {
    if (this.uidata !== undefined) {
      this.uidata.textbox.remove();
    }

    this.uidata = undefined;
  }

  updateTextBox() {
    if (this.uidata && this.uidata.textbox) {
      this.uidata.textbox.text = this.equation;
    }
  }

  evaluate(s) {
    if (!this.hermite || this._last_equation !== this.equation) {
      this._last_equation = this.equation;

      this.updateTextBox();

      this._evaluate(0.0);

      if (this._haserror) {
        console.warn("ERROR!");
        return 0.0;
      }

      let steps = 32;
      this.hermite = genHermiteTable((s) => this._evaluate(s), steps);
    }

    return evalHermiteTable(this.hermite, s);
  }

  _evaluate(s) {
    let sin = Math.sin, cos = Math.cos, pi = Math.PI, PI = Math.PI,
      e = Math.E, E = Math.E, tan = Math.tan, abs = Math.abs,
      floor = Math.floor, ceil = Math.ceil, acos = Math.acos,
      asin = Math.asin, atan = Math.atan, cosh = Math.cos,
      sinh = Math.sinh, log = Math.log, pow = Math.pow,
      exp = Math.exp, sqrt = Math.sqrt, cbrt = Math.cbrt,
      min = Math.min, max = Math.max;

    try {
      let x = s;
      let ret = eval(this.equation);

      this._haserror = false;

      return ret;
    } catch (error) {
      this._haserror = true;
      console.warn("ERROR!");
      return 0.0;
    }
  }

  derivative(s) {
    let df = 0.0001;

    if (s > 1.0 - df*3) {
      return (this.evaluate(s) - this.evaluate(s - df)) / df;
    } else if (s < df*3) {
      return (this.evaluate(s+df) - this.evaluate(s)) / df;
    } else {
      return (this.evaluate(s+df) - this.evaluate(s-df)) / (2 * df);
    }
  }

  derivative2(s) {
    let df = 0.0001;

    if (s > 1.0 - df*3) {
      return (this.derivative(s) - this.derivative(s - df)) / df;
    } else if (s < df*3) {
      return (this.derivative(s+df) - this.derivative(s)) / df;
    } else {
      return (this.derivative(s+df) - this.derivative(s-df)) / (2 * df);
    }
  }

  inverse(y) {
    let steps = 9;
    let ds = 1.0 / steps, s = 0.0;
    let best = undefined;
    let ret = undefined;

    for (let i=0; i<steps; i++, s += ds) {
      let s1 = s, s2 = s+ds;

      let mid;

      for (let j=0; j<11; j++) {
        let y1 = this.evaluate(s1);
        let y2 = this.evaluate(s2);
        mid = (s1+s2)*0.5;

        if (Math.abs(y1-y) < Math.abs(y2-y)) {
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

  onActive(parent, draw_transform) {
  }

  onInactive(parent, draw_transform) {
  }

  reset() {
    this.equation = "x";
  }

  destroy() {
  }

  draw(canvas, g, draw_transform) {
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
}
EquationCurve.STRUCT = nstructjs.inherit(EquationCurve, CurveTypeData) + `
  equation : string;
}
`;
nstructjs.register(EquationCurve);
CurveTypeData.register(EquationCurve);


class GuassianCurve extends CurveTypeData {
  constructor(type) {
    super();

    this.height = 1.0;
    this.offset = 1.0;
    this.deviation = 0.3; //standard deviation
  }

  calcHashKey(digest = _udigest.reset()) {
    super.calcHashKey(digest);

    let d = digest;

    d.add(this.height);
    d.add(this.offset);
    d.add(this.deviation);

    return d.get();
  }

  equals(b) {
    let r = super.equals(b);

    r = r && feq(this.height, b.height);
    r = r && feq(this.offset, b.offset);
    r = r && feq(this.deviation, b.deviation);

    return r;
  }

  static define() {return {
    uiname : "Guassian",
    name   : "guassian"
  }}

  toJSON() {
    let ret = super.toJSON();

    return Object.assign(ret, {
      height    : this.height,
      offset    : this.offset,
      deviation : this.deviation
    });
  }

  loadJSON(obj) {
    super.loadJSON(obj);

    this.height = obj.height !== undefined ? obj.height : 1.0;
    this.offset = obj.offset;
    this.deviation = obj.deviation;

    return this;
  }

  get hasGUI() {
    return this.uidata !== undefined;
  }

  makeGUI(container, canvas, drawTransform) {
    this.uidata = {
      canvas     : canvas,
      g          : canvas.g,
      draw_trans : drawTransform,
    };

    this.uidata.hslider = container.slider(undefined, "Height", this.height, -10, 10, 0.0001);
    this.uidata.hslider.onchange = () => {
      this.height = this.uidata.hslider.value;
      this.redraw();
      this.update();
    }
    this.uidata.oslider = container.slider(undefined, "Offset", this.offset, -10, 10, 0.0001);
    this.uidata.oslider.onchange = () => {
      this.offset = this.uidata.oslider.value;
      this.redraw();
      this.update();
    }
    this.uidata.dslider = container.slider(undefined, "STD Deviation", this.deviation, -10, 10, 0.0001);
    this.uidata.dslider.onchange = () => {
      this.deviation = this.uidata.dslider.value;
      this.redraw();
      this.update();
    }

    /*
    this.uidata.oslider = gui.slider(undefined, "Offset", this.offset,
      -2.5, 2.5, 0.0001, false, false, (val) => {this.offset = val, this.update(), this.redraw();});
    this.uidata.dslider = gui.slider(undefined, "STD Deviation", this.deviation,
      0.0001, 1.25, 0.0001, false, false, (val) => {this.deviation = val, this.update(), this.redraw();});
    //*/
  }

  killGUI(dom, gui, canvas, g, draw_transform) {
    if (this.uidata !== undefined) {
      this.uidata.hslider.remove();
      this.uidata.oslider.remove();
      this.uidata.dslider.remove();
    }

    this.uidata = undefined;
  }

  evaluate(s) {
    let r = this.height * Math.exp(-((s-this.offset)*(s-this.offset)) / (2*this.deviation*this.deviation));
    return r;
  }

  derivative(s) {
    let df = 0.0001;

    if (s > 1.0 - df*3) {
      return (this.evaluate(s) - this.evaluate(s - df)) / df;
    } else if (s < df*3) {
      return (this.evaluate(s+df) - this.evaluate(s)) / df;
    } else {
      return (this.evaluate(s+df) - this.evaluate(s-df)) / (2 * df);
    }
  }

  derivative2(s) {
    let df = 0.0001;

    if (s > 1.0 - df*3) {
      return (this.derivative(s) - this.derivative(s - df)) / df;
    } else if (s < df*3) {
      return (this.derivative(s+df) - this.derivative(s)) / df;
    } else {
      return (this.derivative(s+df) - this.derivative(s-df)) / (2 * df);
    }
  }

  inverse(y) {
    let steps = 9;
    let ds = 1.0 / steps, s = 0.0;
    let best = undefined;
    let ret = undefined;

    for (let i=0; i<steps; i++, s += ds) {
      let s1 = s, s2 = s+ds;

      let mid;

      for (let j=0; j<11; j++) {
        let y1 = this.evaluate(s1);
        let y2 = this.evaluate(s2);
        mid = (s1+s2)*0.5;

        if (Math.abs(y1-y) < Math.abs(y2-y)) {
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
}

GuassianCurve.STRUCT = nstructjs.inherit(GuassianCurve, CurveTypeData) + `
  height    : float;
  offset    : float;
  deviation : float;
}
`;
nstructjs.register(GuassianCurve);
CurveTypeData.register(GuassianCurve);
