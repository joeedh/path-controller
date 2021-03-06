"use strict";

/*FIXME: not sure this works anymore*/
import {nstructjs} from "../util/struct.js";

import * as util from '../util/util.js';
//import * as ui_base from './ui_base.js';
import * as vectormath from '../util/vectormath.js';
import {EventDispatcher} from "../util/events.js";

export {getCurve} from './curve1d_base.js';
export {SplineTemplates, SplineTemplateIcons} from './curve1d_bspline.js';

var Vector2 = vectormath.Vector2;

import './curve1d_basic.js';
import './curve1d_bspline.js';
import './curve1d_anim.js';

export function mySafeJSONStringify(obj) {
  return JSON.stringify(obj.toJSON(), function(key) {
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
export function mySafeJSONParse(buf) {
  return JSON.parse(buf, (key, val) => {

  });
};

window.mySafeJSONStringify = mySafeJSONStringify;

export {CurveConstructors, CURVE_VERSION, CurveTypeData} from './curve1d_base.js';
import {CurveConstructors, CURVE_VERSION, CurveTypeData} from './curve1d_base.js';

let _udigest = new util.HashDigest();

export class Curve1D extends EventDispatcher {
  constructor() {
    super();

    this.uiZoom = 1.0;

    this.generators = [];
    this.VERSION = CURVE_VERSION;

    for (let gen of CurveConstructors) {
      gen = new gen();

      gen.parent = this;
      this.generators.push(gen);
    }

    //this.generators.active = this.generators[0];
    this.setGenerator("bspline");
  }

  calcHashKey(digest=_udigest.reset()) {
    let d = digest;

    for (let g of this.generators) {
      g.calcHashKey(d);
    }

    return d.get();
  }

  equals(b) {
    let gen1 = this.generators.active;
    let gen2 = b.generators.active;

    if (!gen1 || !gen2 || gen1.constructor !== gen2.constructor) {
      return false;
    }

    return gen1.equals(gen2);
  }

  get generatorType() {
    return this.generators.active ? this.generators.active.type : undefined;
  }

  load(b) {
    if (b === undefined) {
      return;
    }

    let buf1 = mySafeJSONStringify(b);
    let buf2 = mySafeJSONStringify(this);

    if (buf1 === buf2) {
      return;
    }

    this.loadJSON(JSON.parse(buf1));
    this._on_change();
    this.redraw();

    return this;
  }

  copy() {
    let ret = new Curve1D();
    ret.loadJSON(JSON.parse(mySafeJSONStringify(this)));
    return ret;
  }

  _on_change() {

  }

  redraw() {
    this._fireEvent("draw", this);
  }

  setGenerator(type) {
    for (let gen of this.generators) {
      if (gen.constructor.define().name === type || gen.type === type || gen.constructor.name === type || gen.constructor === type) {
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

  get fastmode() {
    return this._fastmode;
  }

  set fastmode(val) {
    this._fastmode = val;

    for (let gen of this.generators) {
      gen.fastmode = val;
    }
  }

  toJSON() {
    let ret = {
      generators       : [],
      uiZoom           : this.uiZoom,
      VERSION          : this.VERSION,
      active_generator : this.generatorType
    };

    for (let gen of this.generators) {
      ret.generators.push(gen.toJSON());
    }

    ret.generators.sort((a, b) => a.type.localeCompare(b.type));

    return ret;
  }

  getGenerator(type, throw_on_error=true) {
    for (let gen of this.generators) {
      if (gen.type === type) {
        return gen;
      }
    }

    //was a new generator registerd?
    for (let cls of CurveConstructors) {
      if (cls.name === type) {
        let gen = new cls();
        gen.type = type;
        this.generators.push(gen);
        return gen;
      }
    }

    if (throw_on_error) {
      throw new Error("Unknown generator " + type + ".");
    } else {
      return undefined;
    }
  }

  switchGenerator(type) {
    let gen = this.getGenerator(type);

    if (gen !== this.generators.active) {
      let old = this.generators.active;

      this.generators.active = gen;

      old.onInactive(this);
      gen.onActive(this);
    }

    return gen;
  }

  destroy() {
    return this;
  }

  loadJSON(obj) {
    this.VERSION = obj.VERSION;

    this.uiZoom = parseFloat(obj.uiZoom) || this.uiZoom;

    //this.generators = [];
    for (let gen of obj.generators) {
      let gen2 = this.getGenerator(gen.type, false);

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

    return this;
  }

  evaluate(s) {
    return this.generators.active.evaluate(s);
  }

  integrate(s, quadSteps) {
    return this.generators.active.integrate(s, quadSteps);
  }

  derivative(s) {
    return this.generators.active.derivative(s);
  }

  derivative2(s) {
    return this.generators.active.derivative2(s);
  }

  inverse(s) {
    return this.generators.active.inverse(s);
  }

  reset() {
    this.generators.active.reset();
  }

  update() {
    return this.generators.active.update();
  }

  draw(canvas, g, draw_transform) {
    var w=canvas.width, h=canvas.height;

    console.warn("draw");

    g.save();

    let sz = draw_transform[0], pan = draw_transform[1];

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

    //g.rect(0, 0, 1, 1);
    //g.fillStyle = "rgb(50, 50, 50)";
    //g.fill();

    var f=0, steps=64;
    var df = 1/(steps-1);
    var w = 6.0/sz;

    let curve = this.generators.active;

    g.beginPath();
    for (var i=0; i<steps; i++, f += df) {
      var val = curve.evaluate(f);

      (i==0 ? g.moveTo : g.lineTo).call(g, f, val, w, w);
    }

    g.strokeStyle = "grey";
    g.stroke();

    if (this.overlay_curvefunc !== undefined) {
      g.beginPath();
      f = 0.0;

      for (var i=0; i<steps; i++, f += df) {
        var val = this.overlay_curvefunc(f);

        (i==0 ? g.moveTo : g.lineTo).call(g, f, val, w, w);
      }

      g.strokeStyle = "green";
      g.stroke();
    }

    this.generators.active.draw(canvas, g, draw_transform);

    g.restore();
    return this;
  }

  loadSTRUCT(reader) {
    this.generators = [];
    reader(this);

    //console.log("VERSION", this.VERSION);

    if (this.VERSION <= 0.75) {
      this.generators = [];

      for (let cls of CurveConstructors) {
        this.generators.push(new cls());
      }

      this.generators.active = this.getGenerator("BSplineCurve");
    }

    for (let gen of this.generators.concat([])) {
      if (!(gen instanceof CurveTypeData)) {
        console.warn("Bad generator data found:", gen);
        this.generators.remove(gen);
        continue;
      }

      if (gen.type === this._active) {
        this.generators.active = gen;
      }
    }

    delete this._active;
  }
}

Curve1D.STRUCT = `
Curve1D {
  generators  : array(abstract(CurveTypeData));
  _active     : string | obj.generators.active.type;
  VERSION     : float;
  uiZoom      : float;
}
`;
nstructjs.register(Curve1D);

