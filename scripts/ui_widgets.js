"use strict";

import * as util from './util.js';
import * as vectormath from './vectormath.js';
import * as ui_base from './ui_base.js';
import * as events from './events.js';
import * as simple_toolsys from './simple_toolsys.js';
import * as toolprop from './toolprop.js';
import {DataPathError} from './simple_controller.js';
import {Vector3, Vector4, Quat, Matrix4} from './vectormath.js';

let keymap = events.keymap;

let EnumProperty = toolprop.EnumProperty,
    PropTypes = toolprop.PropTypes;

let UIBase = ui_base.UIBase, 
    PackFlags = ui_base.PackFlags,
    IconSheets = ui_base.IconSheets;

let parsepx = ui_base.parsepx;

//use .setAttribute("linear") to disable nonlinear sliding
export class Button extends UIBase {
  constructor() {
    super();

    let dpi = this.getDPI();

    this._last_update_key = "";

    this._name = "";
    this._namePad = undefined;

    this._last_w = 0;
    this._last_h = 0;

    this._last_dpi = dpi;

    this._lastw = undefined;
    this._lasth = undefined;

    this.dom = document.createElement("canvas");
    this.g = this.dom.getContext("2d");

    this.dom.setAttribute("class", "canvas1");
    this.dom.tabIndex = 0;

    this._last_bg = undefined;

    this.addEventListener("keydown", (e) => {
      if (this.disabled) return;

      console.log(e.keyCode);

      switch (e.keyCode) {
        case 27: //escape
          this.blur();
          e.preventDefault();
          e.stopPropagation();
          break;
        case 32: //spacebar
        case 13: //enter
          this.click();
          e.preventDefault();
          e.stopPropagation();
          break;
      }
    });

    this.addEventListener("focusin", () => {
      if (this.disabled) return;

      this._focus = 1;
      this._redraw();
      this.focus();
      //console.log("focus2");
    });

    this.addEventListener("blur", () => {
      if (this.disabled) return;

      this._focus = 0;
      this._redraw();
      //console.log("blur2");
    });

    this._last_disabled = false;
    this._auto_depress = true;

    let style = document.createElement("style");
    style.textContent = `.canvas1 {
      -moz-user-focus: normal;
      moz-user-focus: normal;
      user-focus: normal;
      padding : 0px;
      margin : 0px;
    }
    `;

    this.shadow.appendChild(style);
    let form = this._div = document.createElement("div");

    form.style["tabindex"] = 4;
    form.tabIndex = 4;
    form.setAttribute("type", "hidden");
    form.type ="hidden";
    form.style["-moz-user-focus"] = "normal";
    form.setAttribute("class", "canvas1");
    form.style["padding"] = form.style["margin"] = "0px";

    form.appendChild(this.dom);

    this.shadow.appendChild(form);
  }

  get tabIndex() {
    return this._div.tabIndex;
  }

  set tabIndex(val) {
    this._div.tabIndex = val;
  }

  get boxpad() {
    throw new Error("Button.boxpad is deprecated");
    return this.getDefault("BoxMargin");
  }

  click() {
    if (this._onpress) {
      let rect = this.getClientRects();
      let x = rect.x + rect.width*0.5;
      let y = rect.y + rect.height*0.5;

      let e = {x : x, y : y, stopPropagation : () => {}, preventDefault : () => {}};

      this._onpress(e);
    }

    super.click();
  }
  set boxpad(val) {
      throw new Error("Deprecated call to Button.boxpad setter");

    //console.warn("Deprecated call to Button.boxpad setter");
    //this.overrideDefault("BoxMargin", val);
  }

  init() {
    let dpi = this.getDPI();

    //set default dimensions
    let width = ~~(this.getDefault("defaultWidth"));
    let height = ~~(this.getDefault("defaultHeight"));
    
    this.dom.style["width"] = width + "px";
    this.dom.style["height"] = height + "px";
    this.dom.style["padding"] = this.dom.style["margin"] = "0px";

    this.dom.width = Math.ceil(width*dpi); //parsepx(this.dom.style["width"])*dpi;
    this.dom.height = Math.ceil(parsepx(this.dom.style["height"])*dpi);

    this._name = undefined;
    this.updateName();

    this.bindEvents();
    this._redraw();
  }
  
  setAttribute(key, val) {
    super.setAttribute(key, val);
    
    if (key == "name") {
      this.updateName();
      this.updateWidth();
    }
  }

  get r() {
    return this.getDefault("BoxRadius");
  }

  set r(val) {
    this.overrideDefault("BoxRadius", val);
  }

  bindEvents() {
    let press_gen = 0;

    let press = (e) => {
        console.log("button press", this._pressed);

        if (this.disabled) return;
        if (this._pressed) return;

        this._pressed = true;

        if (this._onpress) {
          this._onpress(this);
        }
        
        e.preventDefault();
        e.stopPropagation();
    }
    
    let depress = (e) => {
        console.log("button depress");

        if (this._auto_depress) {
          this._pressed = false;

          if (this.disabled) return;

          this._redraw();
        }

        e.preventDefault();
        e.stopPropagation();
        
        if (e.type == "mouseup" && e.button) {
          return;
        }

        if (e.type.startsWith("touch") && this.onclick) {
          this.onclick(this);
        }
    }
    
    this.addEventListener("mousedown", press, {captured : true, passive : false});

    this.addEventListener("touchstart", press, {captured : true, passive : false});
    this.addEventListener("touchend", depress);
    this.addEventListener("touchcancel", depress);

    this.addEventListener("mouseup", depress);

    this.addEventListener("mouseover", (e) => {
      if (this.disabled)
        return;
      
      this._highlight = true;
      this._repos_canvas();
      this._redraw();
    })
    
    this.addEventListener("mouseout", (e) => {
      if (this.disabled)
        return;
      
      this._highlight = false;
      this._repos_canvas();
      this._redraw();
    })
  }

  updateDisabled() {
    if (this._last_disabled != this.disabled) {
      this._last_disabled = this.disabled;

      //setTimeout(() => {
        this.dom._background = this.getDefault("BoxBG");

        this._repos_canvas();
        this._redraw();
        console.log("disabled update!", this.disabled, this.style["background-color"]);
      //}, 100);
    }
  }

  updateDefaultSize() {
    let width = ~~(this.getDefault("defaultWidth"));
    let height = ~~(this.getDefault("defaultHeight"));

    let size = this.getDefault("DefaultText").size;
    size *= 1.33;

    height = ~~Math.max(height, size);
    height = height + "px";

    if (height !== this.style["height"]) {
      this.style["height"] = height;
      this.dom.style["height"] = height;
    }

    return; //XXX
    if (width !== this._last_w || height !== this._last_h) {
      console.log("update default width");

      this._last_w = width;
      this._last_h = height;

      let dpi = this.getDPI();

      this.dom.style["width"] = width + "px";
      this.dom.style["height"] = height + "px";

      this.dom.width = Math.ceil(width*dpi); //parsepx(this.dom.style["width"])*dpi;
      this.dom.height = Math.ceil(parsepx(this.dom.style["height"])*dpi);

      this._repos_canvas();
      this._redraw();
    }
  }

  _calcUpdateKey() {
    let ret = this.getDefault("BoxBG") + ":" + this.getDefault("BoxHighlight") + ":";
    ret += this.style["background-color"] + ":";
    ret += this.getDefault("BoxRadius") + ":" + this.getDefault("BoxMargin") + ":";
    ret += this.getAttribute("name") + ":";

    return ret;
  }

  update() {
    super.update();

    if (this.description !== undefined && this.title != this.description) {
      this.title = this.description;
    }

    this.updateDefaultSize();
    this.updateWidth();
    this.updateDPI();
    this.updateName();
    this.updateDisabled();

    if (this.background !== this._last_bg) {
      this._last_bg = this.background;
      this._repos_canvas();
      this._redraw();
    }

    let key = this._calcUpdateKey();
    if (key !== this._last_update_key) {
      this._last_update_key = key;

      this.setCSS();
      this._repos_canvas();
      this._redraw();
    }
  }

  setCSS() {
    super.setCSS();

    let name = this._name;
    if (name === undefined) {
      return;
    }

    let dpi = this.getDPI();

    let ts = this.getDefault("DefaultText").size;
    let tw = ui_base.measureText(this, this._genLabel()).width/dpi + 8;

    if (this._namePad !== undefined) {
      tw += this._namePad;
    }

    let w = this.getDefault("numslider_width") / dpi;

    w = Math.max(w, tw);
    w = ~~w;
    this.dom.style["width"] = w+"px";
  }

  updateName() {
    let name = this.getAttribute("name");
    
    if (name !== this._name) {
      this._name = name;

      this.setCSS();
      this._repos_canvas();
      this._redraw();
    }
  }
  
  updateWidth(w_add=0) {
    return;
    let dpi = this.getDPI();
    
    let pack = this.packflag;
    
    if (this.parentNode !== undefined && (this.packflag & PackFlags.INHERIT_WIDTH)) {
      let p = this.parentNode;
      
      if (this._lastw != p.clientWidth + w_add) {
        //console.log(p.clientWidth+w_add);
        
        this.dom.style["width"] = Math.ceil(p.clientWidth+w_add) + "px";
        this._lastw = p.clientWidth + w_add;
        
        this._repos_canvas();
      }
    }
  }
  
  _repos_canvas() {
    let dpi = this.getDPI();

    this.dom.width = Math.floor(0.5+parsepx(this.dom.style["width"])*dpi);
    this.dom.height = Math.floor(0.5+parsepx(this.dom.style["height"])*dpi);
  }
  
  updateDPI() {
    let dpi = this.getDPI();
    
    if (this._last_dpi != dpi) {
      //console.log("update dpi", dpi);
      
      this._last_dpi = dpi;
      
      this.g.font = undefined; //reset font

      this.setCSS();
      this._repos_canvas();        
      this._redraw();
    }
    
    if (this.style["background-color"]) {
      this.dom._background = this.style["background-color"];
      this.style["background-color"] = "";
    }
    
    //console.log(">", this.dom.style["background-color"], "-----");
    //console.log("width:", this.clientWidth)
  }
  
  _genLabel() {
    let text = "" + this._name;
    
    return text;
  }
  
  _redraw(draw_text=true) {
    //console.log("button draw");
    
    let dpi = this.getDPI();
    if (this._highlight) {
      this.dom._background = this.getDefault("BoxHighlight");
    } else if (this._pressed) {
      this.dom._background = this.getDefault("BoxDepressed");
    } else {
      this.dom._background = this.getDefault("BoxBG");
    }

    ui_base.drawRoundBox(this, this.dom, this.g);
    
    if (this._focus) {
      let w = this.dom.width, h = this.dom.height;
      let p = 1/dpi;
      
      //XXX remove this.g.translate lines after refactoring drawRoundBox, see comment in ui_base.js
      this.g.translate(p, p);
      let lw = this.g.lineWidth;
      this.g.lineWidth = 2*dpi;
      ui_base.drawRoundBox(this, this.dom, this.g, w-p*2, h-p*2, this.r, "stroke", this.getDefault("BoxHighlight"));
      this.g.lineWidth = lw;
      this.g.translate(-p, -p);       
    }
    
    if (draw_text) {
      this._draw_text();
    }
  }
  
  _draw_text() {
    let dpi = this.getDPI();
    
    let pad = this.getDefault("BoxMargin") * dpi;
    let ts = this.getDefault("DefaultText").size;
    
    let text = this._genLabel();
    
    //console.log(text, "text", this._name);
    
    let tw = ui_base.measureText(this, text).width;
    let cx = (this.dom.width - tw)*0.5;
    let cy = ts*dpi;

    let g = this.g;
    ui_base.drawText(this, ~~cx, ~~cy, text, this.dom, g);
  }
  
  static define() {return {
    tagname : "button-x",
    style : "button"
  };}
}
UIBase.register(Button);

export class ValueButtonBase extends Button {
  constructor() {
    super();
  }
  
  get value() {
    return this._value;
  }
  
  set value(val) {
    this._value = val;
    
    if (this.ctx && this.hasAttribute("datapath")) {
      this.setPathValue(this.ctx, this.getAttribute("datapath"), this._value);
    }
  }
  
  updateDataPath() {
    if (!this.hasAttribute("datapath")) return;
    if (this.ctx === undefined) return;
    
    let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));
    let val =  this.getPathValue(this.ctx, this.getAttribute("datapath"));

    if (val === undefined) {
      this.disabled = true;
      return;
    } else {
      if (this.disabled) {
        this._redraw();
      }

      this.disabled = false;
    }

    if (val != this._value) {
      this._value = val;
      this.updateWidth();
      this._redraw();
    }
  }
  
  update() {
    this.updateDataPath();
    
    super.update();
  }
}

//use .setAttribute("linear") to disable nonlinear sliding
export class NumSlider extends ValueButtonBase {
  constructor() {
    super();
      
    this._name = "";
    this._step = 0.1;
    this._value = 0.0;

    this._redraw();
  }
  
  swapWithTextbox() {
    let tbox = document.createElement("textbox-x");
    tbox.text = this.value.toFixed(5);
    tbox.select();
    
    this.parentNode.insertBefore(tbox, this);
    //this.remove();
    this.hidden = true;
    //this.dom.hidden = true;
    
    let finish = (ok) => {
      tbox.remove();
      this.hidden = false;
      
      if (ok) {
        let val = parseFloat(tbox.text);
        
        if (isNaN(val)) {
          console.log("EEK!");
          this.flash(ui_base.ErrorColors.ERROR);
        } else {
          this.setValue(val);
          
          if (this.onchange) {
            this.onchange(this);
          }
        }
      }
    }
    
    tbox.addEventListener("keydown", (e) => {
      console.log(e.keyCode);
      switch (e.keyCode) {
        case 27: //escape
          finish(false);
          break;
        case 13: //enter
          finish(true);
          break;
      }
    });
    
    tbox.focus();
    
    //this.shadow.appendChild(tbox);
    return;
  }
  
  bindEvents() {
    let onmousedown = (e) => {
      if (this.disabled) {
        e.preventDefault();
        e.stopPropagation();
        
        return;
      }
      
      if (e.button == 0 && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        
        this.swapWithTextbox();
      } else if (e.button == 0) {
        this.dragStart(e);
        
        e.preventDefault();
        e.stopPropagation();
      }
    }
    
    this.addEventListener("dblclick", (e) => {
      if (this.disabled) {
        e.preventDefault();
        e.stopPropagation();
        
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      this.swapWithTextbox();
    });
    
    this.addEventListener("mousedown", (e) => {
      if (this.disabled) return;
      onmousedown(e);
    });
    
    this.addEventListener("touchstart", (e) => {
      if (this.disabled) return;
      console.log(e)
      
      e.x = e.touches[0].screenX;
      e.y = e.touches[0].screenY;
      
      this.dragStart(e);
      
      e.preventDefault();
      e.stopPropagation();
    }, {passive : false});
    
    //this.addEventListener("touchstart", (e) => {
    //  console.log(e);
    //});
    
    this.addEventListener("mouseover", (e) => {
      if (this.disabled) return;
      
      this.dom._background = this.getDefault("BoxHighlight");
      this._repos_canvas();
      this._redraw();
      //console.log("mouse enter");
    })
    
    this.addEventListener("mouseout", (e) => {
      if (this.disabled) return;

      this.dom._background = this.getDefault("BoxBG");
      this._repos_canvas();
      this._redraw();
      //console.log("mouse leave!");
    })
  }
  
  doRange() {
    if (this.hasAttribute("min")) {
      let min = this.getAttribute("min");
      this.value = Math.max(this.value, min);
    }
    
    if (this.hasAttribute("max")) {
      let max = this.getAttribute("max");
      this.value = Math.min(this.value, max);
    }
  }
  
  setValue(value, fire_onchange=true) {
    this.value = value;
    this.doRange();

    if (this.hasAttribute("is_int"))
      this.value = Math.floor(this.value);

    if (fire_onchange && this.onchange) {
      this.onchange(this.value);
    }
    
    this._redraw();
  }
  
  dragStart(e) {
    if (this.disabled) return;

    let last_background = this.dom._background;
    let cancel;
    
    let startvalue = this.value;
    let value = startvalue;
    
    let startx = e.x, starty = e.y;
    
    this.dom._background = this.getDefault("BoxDepressed");
    let fire = () => {
      if (this.onchange) {
        this.onchange(this);
      }
    }


    let handlers = {
      on_keydown: (e) => {
        switch (e.keyCode) {
          case 27: //escape key
            cancel(true);
          case 13: //enter key
            cancel(false);
            break;
        }

        e.preventDefault();
        e.stopPropagation();
      },

      on_mousemove: (e) => {
        if (this.disabled) return;

        e.preventDefault();
        e.stopPropagation();

        let dx = e.x - startx;
        startx = e.x;

        if (e.shiftKey) {
          dx *= 0.1;
        }

        value += dx * this._step * 0.1;

        let dvalue = value - startvalue;
        let dsign = Math.sign(dvalue);

        if (!this.hasAttribute("linear")) {
          dvalue = Math.pow(Math.abs(dvalue), 1.333) * dsign;
        }

        this.value = startvalue + dvalue;
        this.doRange();

        /*
        if (e.shiftKey) {
          dx *= 0.1;
          this.value = startvalue2 + dx*0.1*this._step;
          startvalue3 = this.value;
        } else {
          startvalue2 = this.value;
          this.value = startvalue3 + dx*0.1*this._step;
        }*/

        this.updateWidth();
        this._redraw();
        fire();
      },

      on_mouseup: (e) => {
        cancel(false);
        e.preventDefault();
        e.stopPropagation();
      },

      on_mouseout: (e) => {
        console.log("leave");
        last_background = this.getDefault("BoxBG");

        e.preventDefault();
        e.stopPropagation();
      },

      on_mouseover: (e) => {
        console.log("over");
        last_background = this.getDefault("BoxHighlight");

        e.preventDefault();
        e.stopPropagation();
      },

      on_mousedown : (e) => {
        this.popModal();
      },
    };
    
    //events.pushModal(this.getScreen(), handlers);
    this.pushModal(handlers);

    cancel = (restore_value) => {
      if (restore_value) {
        this.value = startvalue;
        this.updateWidth();
        fire();
      }
      
      this.dom._background = last_background; //ui_base.getDefault("BoxBG");
      this._redraw();
      
      console.trace("end");
      
      this.popModal();
    }
    
    /*
    cancel = (restore_value) => {
      if (restore_value) {
        this.value = startvalue;
        this.updateWidth();
        fire();
      }
      
      this.dom._background = last_background; //ui_base.getDefault("BoxBG");
      this._redraw();
      
      console.trace("end");
      
      window.removeEventListener("keydown", keydown, true);
      window.removeEventListener("mousemove", mousemove, {captured : true, passive : false});
      
      window.removeEventListener("touchend", touchend, true);
      window.removeEventListener("touchmove", touchmove, {captured : true, passive : false});
      window.removeEventListener("touchcancel", touchcancel, true);
      window.removeEventListener("mouseup", mouseup, true);
      
      this.removeEventListener("mouseover", mouseover, true);
      this.removeEventListener("mouseout", mouseout, true);
    }
    
    window.addEventListener("keydown", keydown, true);
    window.addEventListener("mousemove", mousemove, true);
    window.addEventListener("touchend", touchend, true);
    window.addEventListener("touchmove", touchmove, {captured : true, passive : false});
    window.addEventListener("touchcancel", touchcancel, true);
    window.addEventListener("mouseup", mouseup, true);

    this.addEventListener("mouseover", mouseover, true);
    this.addEventListener("mouseout", mouseout, true);
    //*/
  }
  
  updateName() {
    let name = this.getAttribute("name");
    
    if (name !== this._name) {
      this._name = name;
      let dpi = this.getDPI();
      
      let ts = this.getDefault("DefaultText").size;
      let tw = ui_base.measureText(this, this._genLabel(), this.dom, this.g).width/dpi + ts*2;
      
      let w = this.getDefault("numslider_width");
      
      w = Math.max(w, tw);
      this.dom.style["width"] = w+"px";
      
      this._repos_canvas();
      this._redraw();
    }
  }
  
  _genLabel() {
    let val = this.value;
    let text;

    if (val === undefined) {
      text = "error";
    } else {
      val = val === undefined ? 0.0 : val;
      val = val.toFixed(3);

      text = val;
      if (this._name) {
        text = this._name + ": " + text;
      }
    }

    return text;
  }
  
  _redraw() {
    let g = this.g;
    let canvas = this.dom;

    //console.log("numslider draw");
    
    let dpi = this.getDPI();
    let disabled = this.disabled; //this.hasAttribute("disabled");
    
    ui_base.drawRoundBox(this, this.dom, this.g, undefined, undefined,
      undefined, undefined, disabled ? this.getDefault("DisabledBG") : undefined);
    
    let r = this.getDefault("BoxRadius") * dpi;
    let pad = this.getDefault("BoxMargin") * dpi;
    let ts = this.getDefault("DefaultText").size;
    
    //if (this.value !== undefined) {
    let text = this._genLabel();
   
    let tw = ui_base.measureText(this, text, this.dom, this.g).width;
    let cx = this.dom.width/2 - tw/2;
    let cy = this.dom.height/2;
    
    ui_base.drawText(this, cx, cy + ts/2, text, this.dom, this.g);
    //}
    
    g.fillStyle = "rgba(0,0,0,0.1)";
    
    let d = 7, w=canvas.width, h=canvas.height;
    let sz = 10*dpi;
    
    g.beginPath();
    g.moveTo(d, h*0.5);
    g.lineTo(d+sz, h*0.5 + sz*0.5);
    g.lineTo(d+sz, h*0.5 - sz*0.5);
    
    g.moveTo(w-d, h*0.5);
    g.lineTo(w-sz-d, h*0.5 + sz*0.5);
    g.lineTo(w-sz-d, h*0.5 - sz*0.5);
    
    g.fill();
  }
  
  static define() {return {
    tagname : "numslider-x",
    style : "numslider"
  };}
}
UIBase.register(NumSlider);

export class Check extends UIBase {
  constructor() {
    super();
    
    this._checked = false;
    this._highlight = false;
    this._focus = false;

    let shadow = this.shadow;
    
    //let form = document.createElement("form");
    
    let span = document.createElement("span");
    span.setAttribute("class", "checkx");

    span.style["display"] = "flex";
    span.style["flex-direction"] = "row";
    span.style["margin"] = span.style["padding"] = "0px";
    //span.style["background"] = ui_base.iconmanager.getCSS(1);

    let sheet = 0;
    let size = ui_base.iconmanager.getTileSize(0);

    let check = this.canvas = document.createElement("canvas");
    this.g = check.getContext("2d");

    check.setAttribute("id", check._id);
    check.setAttribute("name", check._id);

    /*
    let doblur = () => {
      this.blur();
    };
    check.addEventListener("mousedown", doblur);
    check.addEventListener("mouseup", doblur);
    check.addEventListener("touchstart", doblur);
    check.addEventListener("touchend", doblur);
    //*/

    let mdown = (e) => {
      this._highlight = false;
      this.checked = !this.checked;
    };

    let mup = (e) => {
      this._highlight = false;
      this.blur();
      this._redraw();
    };

    let mover = (e) => {
      this._highlight = true;
      this._redraw();
    };

    let mleave = (e) => {
      this._highlight = false;
      this._redraw();
    };

    span.addEventListener("mouseover", mover);
    span.addEventListener("mousein", mover);
    span.addEventListener("mouseleave", mleave);
    span.addEventListener("mouseout", mleave);
    this.addEventListener("blur", (e) => {
      this._highlight = this._focus = false;
      this._redraw();
    });
    this.addEventListener("focusin", (e) => {
      this._focus = true;
      this._redraw();
    });
    this.addEventListener("focus", (e) => {
      this._focus = true;
      this._redraw();
    });


    span.addEventListener("mousedown", mdown);
    span.addEventListener("touchstart", mdown);
    span.addEventListener("mouseup", mup);
    span.addEventListener("touchend", mup);

    this.addEventListener("keydown", (e) => {
      switch (e.keyCode) {
        case keymap["Escape"]:
          this._highlight = undefined;
          this._redraw();
          e.preventDefault();
          e.stopPropagation();

          this.blur();
          break;
        case keymap["Enter"]:
        case keymap["Space"]:
          this.checked = !this.checked;
          e.preventDefault();
          e.stopPropagation();
          break;
      }
    });
    this.checkbox = check;

    span.appendChild(check);

    let label = this._label = document.createElement("label");
    label.setAttribute("class", "checkx");
    span.setAttribute("class", "checkx");

    let side = this.getDefault("CheckSide");
    if (side === "right") {
      span.prepend(label);
    } else {
      span.appendChild(label);
    }

    shadow.appendChild(span);
  }

  init() {
    this.tabIndex = 1;
    this.setAttribute("class", "checkx");


    let style = document.createElement("style");
    //let style = this.cssStyleTag();

    let color = this.getDefault("FocusOutline");

    style.textContent = `
      .checkx:focus {
        outline : none;
      }
    `;

    //document.body.prepend(style);
    this.prepend(style);
  }

  get disabled() {
    return super.disabled;
  }

  set disabled(val) {
    super.disabled = val;
    this._redraw();
  }

  setCSS() {
    this._label.style["font"] = this.getDefault("DefaultText").genCSS();
    this._label.style["color"] = this.getDefault("DefaultText").color;

    super.setCSS();
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    let val = this.getPathValue(this.ctx, this.getAttribute("datapath"));

    if (val === undefined) {
      this.disabled = true;
      return;
    } else {
      this.disabled = false;
    }

    val = !!val;

    if (!!this._checked != !!val) {
      this._checked = val;
      this._redraw();
    }
  }

  _repos_canvas() {
    if (this.canvas === undefined)
      return;

    let r = this.canvas.getClientRects()[0];

    if (r === undefined) {
      return;
    }

  }

  _redraw() {
    if (this.canvas === undefined)
      return;

    let canvas = this.canvas, g = this.g;
    let dpi = UIBase.getDPI();
    let tilesize = ui_base.iconmanager.getTileSize(0);
    let pad = this.getDefault("BoxMargin");

    let csize = tilesize + pad*2;

    canvas.style["margin"] = "2px";
    canvas.style["width"] = csize + "px";
    canvas.style["height"] = csize + "px";

    csize = ~~(csize*dpi + 0.5);
    tilesize = ~~(tilesize*dpi + 0.5);

    canvas.width = csize;
    canvas.height = csize;

    g.clearRect(0, 0, canvas.width, canvas.height);

    g.beginPath();
    g.rect(0, 0, canvas.width, canvas.height);
    g.fill();

    let color;

    if (!this._checked && this._highlight) {
      color = this.getDefault("BoxHighlight");
    }

    ui_base.drawRoundBox(this, canvas, g, undefined, undefined, undefined, undefined, color);
    if (this._checked) {
      //canvasDraw(elem, canvas, g, icon, x=0, y=0, sheet=0) {
      let x=(csize-tilesize)*0.5, y=(csize-tilesize)*0.5;
      ui_base.iconmanager.canvasDraw(this, canvas, g, ui_base.Icons.LARGE_CHECK, x, y);
    }

    if (this._focus) {
      color = this.getDefault("FocusOutline");
      g.lineWidth *= dpi;
      ui_base.drawRoundBox(this, canvas, g, undefined, undefined, undefined, "stroke", color);
    }
  }

  set checked(v) {
    if (!!this._checked != !!v) {
      this._checked = v;
      //this.dom.checked = v;
      this._redraw();

      if (this.onclick) {
        this.onclick(v);
      }
      if (this.onchange) {
        this.onchange(v);
      }

      if (this.hasAttribute("datapath")) {
        this.setPathValue(this.ctx, this.getAttribute("datapath"), this._checked);
      }
    }
  }
  
  get checked() {
    return this._checked;
  }

  updateDPI() {
    let dpi = UIBase.getDPI();

    if (dpi !== this._last_dpi) {
      this._last_dpi = dpi;
      this._redraw();
    }
  }

  update() {
    super.update();

    this.title = this.description;
    this.updateDPI();

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }

    let updatekey = this.getDefault("DefaultText").hash();

    if (updatekey !== this._updatekey) {
      this._updatekey = updatekey;
      this.setCSS();
    }
  }
  
  get label() {
    return this._label.textContent;
  }
  
  set label(l) {
    this._label.textContent = l;
  }
  
  static define() {return {
    tagname : "check-x",
    style   : "checkbox"
  };}
}
UIBase.register(Check);

export class IconCheck extends Button {
  constructor() {
    super();

    this._checked = undefined;

    this._drawCheck = true;
    this._icon = -1;
    this._icon_pressed = undefined;
    this.iconsheet = ui_base.IconSheets.LARGE;
  }

  updateDefaultSize() {

  }

  _calcUpdateKey() {
    return super._calcUpdateKey() + ":" + this._icon;
  }

  get drawCheck() {
    return this._drawCheck;
  }

  set drawCheck(val) {
    this._drawCheck = val;
    this._redraw();
  }

  get icon() {
    return this._icon;
  }
  
  set icon(val) {
    this._icon = val;
    this._repos_canvas();
    this._redraw();
  }
  
  get checked() {
    return this._checked;
  }
  
  set checked(val) {
    if (!!val != !!this._checked) {
      this._checked = val;
      this._redraw();

      if (this.onchange) {
        this.onchange(val);
      }
    }
  }
  
  updateDataPath() {
    if (!this.hasAttribute("datapath") || !this.ctx) {
      return;
    }

    if (this._icon < 0) {
      let rdef;
      try {
        rdef = this.ctx.api.resolvePath(this.ctx, this.getAttribute("datapath"));
      } catch(error) {
        if (error instanceof DataPathError) {
          return;
        } else {
          throw error;
        }
      }
      
      if (rdef !== undefined && rdef.prop) {
        let icon, title;

        //console.log("SUBKEY", rdef.subkey, rdef.prop.iconmap);

        if (rdef.subkey && (rdef.prop.type == PropTypes.FLAG || rdef.prop.type == PropTypes.ENUM)) {
          icon = rdef.prop.iconmap[rdef.subkey];
          title = rdef.prop.descriptions[rdef.subkey];

          if (title === undefined && rdef.subkey.length > 0) {
            title = rdef.subkey;
            title = title[0].toUpperCase() + title.slice(1, title.length).toLowerCase();
          }
        } else {
          icon = rdef.prop.icon;
          title = rdef.prop.description;
        }

        if (icon !== undefined && icon !== this.icon)
          this.icon = icon;
        if (title !== undefined)
          this.description = title;
      }
    }

    let val = this.getPathValue(this.ctx, this.getAttribute("datapath"));

    if (val === undefined) {
      this.disabled = true;
      return;
    } else {
      this.disabled = false;
    }

    val = !!val;

    if (val != !!this._checked) {
      this._checked = val;
      this._redraw();
    }
  }
  
  update() {
    if (this.description !== undefined && this.title != this.description) {
      this.title = this.description;
    }
    
    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }
    
    super.update();
  }

  _getsize() {
      let margin = this.getDefault("BoxMargin");
      return ui_base.iconmanager.getTileSize(this.iconsheet) + margin*2;
  }
  
  _repos_canvas() {
    this.dom.style["width"] = this._getsize() + "px";
    this.dom.style["height"] = this._getsize() + "px";

    if (this._div !== undefined) {
      this._div.style["width"] = this._getsize() + "px";
      this._div.style["height"] = this._getsize() + "px";
    }

    super._repos_canvas();
  }

  set icon(f) {
    this._icon = f;
    this._redraw();
  }
  
  get icon() {
    return this._icon;
  }
  
  _onpress() {
    this.checked ^= 1;
    
    if (this.hasAttribute("datapath")) {
      this.setPathValue(this.ctx, this.getAttribute("datapath"), this.checked);
    }

    console.log("click!", this.checked);
    this._redraw();
  }
  
  _redraw() {
    this._repos_canvas();
    
    //this.dom._background = this._checked ? this.getDefault("BoxDepressed") : this.getDefault("BoxBG");
    if (this._checked) {
      this._highlight = false;
    }

    //
    let pressed = this._pressed;
    this._pressed = this._checked;
    super._redraw(false);
    this._pressed = pressed;

    let icon = this._icon;
    
    if (this._checked && this._icon_pressed !== undefined) {
      icon = this._icon_pressed;
    }

    let tsize = ui_base.iconmanager.getTileSize(this.iconsheet);
    let size = this._getsize();
    let off = size > tsize ? (size - tsize)*0.5 : 0.0;

    this.g.save();
    this.g.translate(off, off);
    ui_base.iconmanager.canvasDraw(this, this.dom, this.g, icon, undefined, undefined, this.iconsheet);

    if (this.drawCheck) {
      let icon2 = this._checked ? ui_base.Icons.CHECKED : ui_base.Icons.UNCHECKED;
      ui_base.iconmanager.canvasDraw(this, this.dom, this.g, icon2, undefined, undefined, this.iconsheet);
    }

    this.g.restore();
  }
  
  static define() {return {
    tagname : "iconcheck-x",
    style   : "iconcheck"
  };}
}

UIBase.register(IconCheck);

export class IconButton extends Button {
  constructor() {
    super();

    this._icon = 0;
    this._icon_pressed = undefined;
    this.iconsheet = ui_base.Icons.LARGE;
  }

  updateDefaultSize() {

  }

  _calcUpdateKey() {
    return super._calcUpdateKey() + ":" + this._icon;
  }

  get icon() {
    return this._icon;
  }
  
  set icon(val) {
    this._icon = val;
    this._repos_canvas();
    this._redraw();
  }
  
  update() {
    if (this.description !== undefined && this.title != this.description) {
      this.title = this.description;
    }

    super.update();
  }

  _getsize() {
    let margin = this.getDefault("BoxMargin");

    return ui_base.iconmanager.getTileSize(this.iconsheet) + margin*2;
  }
  
  _repos_canvas() {
    this.dom.style["height"] = this._getsize() + "px";
    this.dom.style["width"] = this._getsize() + "px";

    super._repos_canvas();
  }
  
  _redraw() {
    this._repos_canvas();
    
    //this.dom._background = this._checked ? this.getDefault("BoxDepressed") : this.getDefault("BoxBG");
    //
    super._redraw(false);

    let icon = this._icon;
    
    if (this._checked && this._icon_pressed !== undefined) {
      icon = this._icon_pressed;
    }

    let tsize = ui_base.iconmanager.getTileSize(this.iconsheet);
    let size = this._getsize();

    let dpi = UIBase.getDPI();
    let off = size > tsize ? (size - tsize)*0.5*dpi : 0.0;

    this.g.save();
    this.g.translate(off, off);
    ui_base.iconmanager.canvasDraw(this, this.dom, this.g, icon, undefined, undefined, this.iconsheet);
    this.g.restore();
  }
  
  static define() {return {
    tagname : "iconbutton-x",
    style : "iconbutton",
  };}
}

UIBase.register(IconButton);

export class Check1 extends Button {
  constructor() {
    super();
    
    this._namePad = 40;
    this._value = undefined;
  }
  
  _redraw() {
    //console.log("button draw");
    
    let dpi = this.getDPI();
    
    let box = 40;
    ui_base.drawRoundBox(this, this.dom, this.g, box);

    let r = this.getDefault("BoxRadius") * dpi;
    let pad = this.getDefault("BoxMargin") * dpi;
    let ts = this.getDefault("DefaultText").size;
    
    let text = this._genLabel();
    
    //console.log(text, "text", this._name);
    
    let tw = ui_base.measureText(this, text, this.dom, this.g).width;
    let cx = this.dom.width/2 - tw/2;
    let cy = this.dom.height/2;
    
    ui_base.drawText(this, box, cy + ts/2, text, this.dom, this.g);
  }

  static define() {return {
    tagname : "check1-x"
  };}
}

UIBase.register(Check1);

export class TextBox extends UIBase {
  constructor() {
    super();
    
    this.addEventListener("focusin", () => {
      this._focus = 1;
      this.dom.focus();
    });

    this.addEventListener("blur", () => {
      this._focus = 0;
    });
    
    let margin = Math.ceil(3 * this.getDPI());
    
    this._had_error = false;
    
    this.decimalPlaces = 4;

    this.dom = document.createElement("input");

    this.dom.tabIndex = 0;
    this.dom.setAttribute("tabindex", 0);
    this.dom.setAttribute("tab-index", 0);
    this.dom.style["margin"] = margin + "px";
    this.dom.style["width"] = "min-contents";

    this.dom.setAttribute("type", "textbox");
    this.dom.onchange = (e) => {
      this._change(this.dom.value);
    }

    this.radix = 16;
    
    this.dom.oninput = (e) => {
      this._change(this.dom.value);
    }
    
    this.shadow.appendChild(this.dom);
  }

  get tabIndex() {
    return this.dom.tabIndex;
  }

  set tabIndex(val) {
    this.dom.tabIndex = val;
  }

  init() {
    super.init();

    this.style["display"] = "flex";
    this.style["width"] = "min-content";

    this.setCSS();
  }

  setCSS() {
    super.setCSS();

    if (this.style["font"]) {
      this.dom.style["font"] = this.style["font"];
    }

//    for (let k of this.style) {
  //    this.dom.style[k] = this.style[k];
   // }

    this.dom.style["width"] = this.style["width"];
  }

  updateDataPath() {
    if (!this.ctx || !this.hasAttribute("datapath")) {
      return;
    }
    if (this._focus || this._flashtimer !== undefined || (this._had_error && this._focus)) {
      return;
    }
    
    let val = this.getPathValue(this.ctx, this.getAttribute("datapath"));
    if (val === undefined || val === null) {
      this.disabled = true;
      return;
    } else {
      this.disabled = false;
    }


    let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));
    
    let text = this.text;

    function myToFixed(s, n) {
      s = s.toFixed(n);

      while (s.endsWith('0')) {
        s = s.slice(0, s.length-1);
      }
      if (s.endsWith("\.")) {
        s = s.slice(0, s.length-1);
      }

      return s;
    }

    if (prop !== undefined && (prop.type == PropTypes.INT || prop.type == PropTypes.FLOAT)) {
      let is_int = prop.type == PropTypes.INT;
      
      if (is_int) {
        this.radix = prop.radix;
        text = val.toString(this.radix);
        
        if (this.radix == 2) {
          text = "0b" + text;
        } else if (this.radix == 16) {
          text += "h";
        }
      } else {
        text = myToFixed(val, this.decimalPlaces);
      }
    } else if (prop !== undefined && prop.type == PropTypes.STRING) {
      text = val;
    }
    
    if (this.text != text) {
      this.text = text;
    }
  }
  
  update() {
    super.update();

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }

    this.setCSS();
  }
  
  select() {
    this.dom.select();
    //return this.dom.select.apply(this, arguments);
  }
  
  focus() {
    return this.dom.focus();
  }
  
  blur() {
    return this.dom.blur();
  }
  
  static define() {return {
    tagname : "textbox-x"
  };}
  
  get text() {
    return this.dom.value;
  }
  
  set text(value) {
    this.dom.value = value;
  }
  
  _prop_update(prop, text) {
    if ((prop.type == PropTypes.INT || prop.type == PropTypes.FLOAT)) {
      let val = parseFloat(this.text);
      
      if (!toolprop.isNumber(this.text.trim())) {
        this.flash(ui_base.ErrorColors.ERROR, this.dom);
        this.focus();
        this.dom.focus();
        this._had_error = true;
      } else {
        if (this._had_error) {
          this.flash(ui_base.ErrorColors.OK, this.dom);
        }
        
        this._had_error = false;
        this.setPathValue(this.ctx, this.getAttribute("datapath"), val);
      }
    } else if (prop.type == PropTypes.STRING) {
      this.setPathValue(this.ctx, this.getAttribute("datapath"), this.text);
    }
  }

   
  _change(text) {
    //console.log("onchange", this.ctx, this, this.dom.__proto__, this.hasFocus);
    //console.log("onchange", this._focus);
    
    if (this.hasAttribute("datapath") && this.ctx !== undefined) {
      let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));
      //console.log(prop);
      if (prop) {
        this._prop_update(prop, text);
      }
    }
    
    if (this.onchange) {
      this.onchange(text);
    }
  }
}

UIBase.register(TextBox);

export function checkForTextBox(screen, x, y) {
  let elem = screen.pickElement(x, y, undefined, undefined, TextBox);
  //console.log(elem);
  if (elem && elem.tagName === "TEXTBOX-X") {
    return true;
  }

  return false;
}
