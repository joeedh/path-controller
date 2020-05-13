import {Curve1DProperty} from "../toolsys/toolprop.js";
import {UIBase} from '../core/ui_base.js';
import {ColumnFrame, RowFrame} from "../core/ui.js";
import * as util from '../util/util.js';
import {Vector2, Vector3} from "../util/vectormath.js";
import {Curve1D,  mySafeJSONStringify} from "../curve/curve1d.js";
import {makeGenEnum} from '../curve/curve1d_utils.js';

export class Curve1DWidget extends ColumnFrame {
  constructor() {
    super();

    this.useDataPathUndo = false;

    this._on_draw = this._on_draw.bind(this);
    this.drawTransform = [1.0, [0, 0]];

    this._value = new Curve1D();
    this._value.on("draw", this._on_draw);

    this._value._on_change = (msg) => {
      console.warn("value on change");

      if (this.onchange) {
        this.onchange(this._value);
      }

      if (this.hasAttribute("datapath")) {
        let path = this.getAttribute("datapath");
        if (this._value !== undefined) {
          let val = this.getPathValue(this.ctx, path);

          if (val) {
            val.load(this._value);
            this.setPathValue(this.ctx, path, val);
          } else {
            val = this._value.copy();
            this.setPathValue(this.ctx, path, val);
          }
        }
      }
    };

    this._gen_type = undefined;
    this._lastGen = undefined;

    this._last_dpi = undefined;
    this.canvas = document.createElement("canvas");

    this.g = this.canvas.getContext("2d");
    this.canvas.g = this.g;

    window.cw = this;
    this.shadow.appendChild(this.canvas);
  }

  get value() {
    return this._value;
  }

  _on_draw(e) {
    let curve = e.data;

    //console.log("draw");
    this._redraw();
  }

  set value(val) {
    this._value.load(val);
    this.update();
    this._redraw();
  }

  _on_change() {
    if (this.onchange) {
      this.onchange(this);
    }
  }

  init() {
    super.init();

    this.useDataPathUndo = false;
    let row = this.row();

    let prop = makeGenEnum();

    prop.setValue(this.value.generatorType);

    this.dropbox = row.listenum(undefined, "Type", prop, this.value.generatorType, (id) => {
      console.warn("SELECT", id, prop.keys[id]);

      this.value.setGenerator(id);
      this.value._on_change("curve type change");
    });
    this.dropbox._init();

    this.container = this.col();
  }

  setCSS() {
    super.setCSS();

    this.style["width"] = "min-contents";
    this.style["heizght"] = "min-contents";
    this.updateSize();
  }

  updateSize() {
    let dpi = UIBase.getDPI();
    let w = ~~(this.getDefault("CanvasWidth")*dpi);
    let h = ~~(this.getDefault("CanvasHeight")*dpi);

    let bad = w !== this.canvas.width || h !== this.canvas.height;
    bad = bad || dpi !== this._last_dpi;

    if (!bad) {
      return;
    }

    this._last_dpi = true;
    this.canvas.width = w;
    this.canvas.height = h;

    this.canvas.style["width"] = (w/dpi) + "px";
    this.canvas.style["height"] = (h/dpi) + "px";

    this._redraw();
  }

  _redraw() {
    let canvas = this.canvas, g = this.g;

    g.clearRect(0, 0, canvas.width, canvas.height);
    g.beginPath();
    g.rect(0, 0, canvas.width, canvas.height);
    g.fillStyle = this.getDefault("CanvasBG");
    g.fill();

    g.save();

    let scale = Math.max(canvas.width, canvas.height);

    g.lineWidth /= scale;

    this.drawTransform[0] = scale;
    this.drawTransform[1][1] = -1.0;

    g.scale(scale, scale);
    g.translate(0.0, 1.0);
    g.scale(1.0, -1.0);

    this._value.draw(this.canvas, this.g, this.drawTransform);
    g.restore();
  }

  rebuild() {
    let ctx = this.ctx;
    if (ctx === undefined || this.container === undefined) {
      return;
    }


    this._gen_type = this.value.generatorType;
    let col = this.container;

    if (this._lastGen !== undefined) {
      this._lastGen.killGUI(col, this.canvas);
    }

    let onchange = this.dropbox.onchange;
    this.dropbox.onchange = undefined
    this.dropbox.setValue(this.value.generatorType);
    this.dropbox.onchange = onchange;

    console.log("new curve type", this.value.generatorType, this._gen_type);
    col.clear();

    let gen = this.value.generators.active;
    gen.makeGUI(col, this.canvas);

    this._lastGen = gen;

    this._redraw();
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    let path = this.getAttribute("datapath");
    let val = this.getPathValue(this.ctx, path);

    if (this._lastu === undefined) {
      this._lastu = 0;
    }

    if (val && !val.equals(this._value) && util.time_ms() - this._lastu > 200) {
      this._lastu = util.time_ms();

      this._value.load(val);
      this.update();
      this._redraw();
    }
  }

  updateGenUI() {
    let bad = this._lastGen !== this.value.generators.active;
    
    if (bad) {
      this.rebuild();
      this._redraw();
    }
  }
  update() {
    super.update();

    this.updateDataPath();
    this.updateSize();
    this.updateGenUI();
  }

  static define() {return {
    tagname : "curve-widget-x",
    style   : "curvewidget"
  }}
}
UIBase.register(Curve1DWidget);