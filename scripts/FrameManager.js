let _FrameManager = undefined;

import {DEBUG} from './const.js';
import {haveModal, pushModalLight, popModalLight} from './simple_events.js';
import * as util from './util.js';
import * as vectormath from './vectormath.js';
import * as ui_base from './ui_base.js';
import * as ui from './ui.js';
import * as ScreenArea from './ScreenArea.js';
import * as events from './events.js';
import * as FrameManager_ops from './FrameManager_ops.js';
import * as math from './math.js';
import * as ui_colorpicker from './ui_colorpicker.js';
import * as ui_tabs from './ui_tabs.js';
import './struct.js';
import {KeyMap, HotKey} from './simple_events.js';

let Area = ScreenArea.Area;

import './ui_widgets.js';
import './ui_tabs.js';
import './ui_colorpicker2.js';
import './ui_noteframe.js';
import './ui_listbox.js';
import './ui_menu.js';
import './ui_table.js';

export function registerToolStackGetter(func) {
  FrameManager_ops.registerToolStackGetter(func);
}

//XXX why!!!
window._nstructjs = nstructjs;

let Vector2 = vectormath.Vector2,
    UIBase = ui_base.UIBase;

let update_stack = new Array(8192);
update_stack.cur = 0;

export class ScreenVert extends Vector2 {
  constructor(pos, id, is_outer, side) {
    super(pos);

    this.is_outer = is_outer;
    this.side = side;
    this.sareas = [];
    this.borders = [];
    
    this._id = id;
  }
  
  static hash(pos, side, is_outer) {
    //try to fix a bug where areas collapse into nothingness
    //by hashing outer screenverts differently

    return pos[0].toFixed(3) + ":" + pos[1].toFixed(3) + ":" + is_outer;
  }
  
  valueOf() {
    return ScreenVert.hash(this, this.side, this.is_outer);
  }
  
  [Symbol.keystr]() {
    return ScreenVert.hash(this, this.side, this.is_outer);
  }

  loadSTRUCT(reader) {
    reader(this);

    this.load(this._vec);
    delete this._vec;
  }
}
ScreenVert.STRUCT = `
pathux.ScreenVert {
  _vec : vec2;
}
`;

export class ScreenHalfEdge {
  constructor(sarea, v1, v2, border) {
    this.v1 = v1;
    this.v2 = v2;
    this.border = border;
  }
}

export class ScreenBorder extends ui_base.UIBase {
  constructor() {
    super();
    
    this.screen = undefined;
    this.v1 = undefined;
    this.v2 = undefined;
    this._id = undefined;

    //are we a border on the outer of the screen?
    //note that this is tricky if an area is collapsed
    //to zero in one dimension
    this.is_outer = false;

    this.side = 0; //which side of area are we on, going counterclockwise

    this.sareas = [];
    
    this._innerstyle = document.createElement("style");
    this._style = undefined;
    
    this.shadow.appendChild(this._innerstyle);
    
    this.inner = document.createElement("div");
    //this.inner.innerText = "sdfsdfsdf";
    this.shadow.appendChild(this.inner);
    
    this.addEventListener("mousedown", (e) => {
      console.log(this.sareas.length, this.sareas, "|||||");
      
      if (this.valence < 2) {
        console.log(this, this.sareas);
        console.log("ignoring border ScreenArea");
        return;
      }

      if (!this.movable) {
        return;
      }

      console.log("area resize start!");
      let tool = new FrameManager_ops.AreaResizeTool(this.screen, this, [e.x, e.y]);
      
      tool.start();
      
      e.preventDefault();
      e.stopPropagation();
    });
  }
  
  get valence() {
    let ret = 0; //this.sareas.length;
    let horiz = this.horiz;
    
    let visit = {};
    
    for (let i=0; i<2; i++) {
      let sv = i ? this.v2 : this.v1;
      //console.log(sv);
      
      for (let sa of sv.borders) { 
        if (sa.horiz != this.horiz)
          continue;
        if (sa._id in visit)
          continue;
        
        visit[sa._id] = 1;
        
        let a0x = Math.min(this.v1[0], this.v2[0]);
        let a0y = Math.min(this.v1[1], this.v2[1]);
        let a1x = Math.max(this.v1[0], this.v2[0]);
        let a1y = Math.max(this.v1[1], this.v2[1]);
        
        let b0x = Math.min(sa.v1[0], sa.v2[0]);
        let b0y = Math.min(sa.v1[1], sa.v2[1]);
        let b1x = Math.min(sa.v1[0], sa.v2[0]);
        let b1y = Math.min(sa.v1[1], sa.v2[1]);
        
        let ok;
        
        let eps = 0.001;
        if (horiz) {
          ok = (a0y <= b1y+eps && a1y >= a0y-eps);
        } else {
          ok = (a0x <= b1x+eps && a1x >= a0x-eps);
        }  
        
        if (ok) {
          //console.log("found");
          ret += sa.sareas.length;
        }
      }
    }
    
    return ret;
  }
  
  otherVert(v) {
    if (v === this.v1)
      return this.v2;
    else
      return this.v1;
  }
  
  get horiz() {
    let dx = this.v2[0] - this.v1[0];
    let dy = this.v2[1] - this.v1[1];
    
    return Math.abs(dx) > Math.abs(dy);
  }
      
  setCSS() {
    if (this._style === undefined) {
      this._style = document.createElement("style");
      this.appendChild(this._style);
    }
    
    let wid = 8, iwid = 4;
    
    let v1 = this.v1, v2 = this.v2;
    let vec = new Vector2(v2).sub(v1);

    let x = Math.min(v1[0], v2[0]), y = Math.min(v1[1], v2[1]);
    let w, h;
    let cursor, bstyle, mstyle;
    
    if (Math.abs(vec[0]) < Math.abs(vec[1])) {
      x -= wid/2;
      
      w = wid;
      h = Math.abs(vec[1]);
      
      cursor = 'e-resize';
      
      bstyle = "border-left-style : solid;\n    border-right-style : solid;\n";
      mstyle = "margin-left : 2px;\n    margin-right : 2px;\n    ";
      mstyle += "height : 100%;\n    width:${iwid}px;\n";
    } else {
      y -= wid/2;
      
      w = Math.abs(vec[0]);
      h = wid;
      cursor = 'n-resize';
      bstyle = "border-top-style : solid;\n    border-bottom-style : solid;\n";
      mstyle = "margin-top : 2px;\n    margin-bottom : 2px;\n    ";
      mstyle += "width : 100%;\n    height:${iwid}px;\n";
    }

    let color = "rgba(220, 220, 220, 1.0)";
    if (DEBUG.screenborders) {
      if (!this.movable) {
        color = "black";
      } if (this.is_outer) {
        color = "orange";
      }
    }

    let innerbuf = `
        .screenborder_inner_${this._id} {
          ${bstyle}
          ${mstyle}
          background-color : rgba(170, 170, 170, 1.0);
          border-color : ${color};
          border-width : 1px;
          pointer-events : none;
        }`;
    
     let sbuf = `
        .screenborder_${this._id} {
          padding : 0;
          margin : 0;
        }
    `;
    
    if (this.valence >= 2) {
      sbuf += `
        .screenborder_${this._id}:hover {
          cursor : ${cursor};
        }
      `;
    }
    
    this._style.textContent = sbuf;
    this._innerstyle.textContent = innerbuf;
    
    this.setAttribute("class", "screenborder_" + this._id);
    this.inner.setAttribute("class", "screenborder_inner_" + this._id);
    
    this.style["position"] = "absolute";
    this.style["left"] = x + "px";
    this.style["top"] = y + "px";
    this.style["width"] = w + "px";
    this.style["height"] = h + "px";
    this.style["z-index"] = 5;
  }
  
  static hash(v1, v2, side, is_outer) {
    return Math.min(v1._id, v2._id) + ":" + Math.max(v1._id, v2._id) + ":" + is_outer;
  }
  
  valueOf() {
    return ScreenBorder.hash(this.v1, this.v2);
  }
  
  [Symbol.keystr] () {
    return ScreenBorder.hash(this.v1, this.v2);
  }
  
  static define() {return {
    tagname : "screenborder-x"
  };}
}

ui_base.UIBase.register(ScreenBorder);

export class Screen extends ui_base.UIBase {
  constructor() {
    super();

    this._ctx = undefined;

    this.keymap = new KeyMap();

    this.size = [512, 512];
    this.idgen = 0;
    this.sareas = [];
    this.sareas.active = undefined;
    this.mpos = [0, 0];
    
    this.screenverts = [];
    this._vertmap = {};
    this._edgemap = {};
    this._idmap = {};

    //effective bounds of screen
    this._aabb = [new Vector2(), new Vector2()];

    this.shadow.addEventListener("mousemove", (e) => {
      this.mpos[0] = e.x;
      this.mpos[1] = e.y;
    });
    
    this.shadow.addEventListener("touchmove", (e) => {
      this.mpos[0] = e.touches[0].pageX;
      this.mpos[1] = e.touches[0].pageY;
    });
    
  }

  /** makes a popup at x,y and returns a new container-x for it */
  popup(elem_or_x, y) {
    let x;

    if (typeof elem_or_x == "object") {
      let r = elem_or_x.getClientRects()[0];

      x = r.x;
      y = r.y;
    } else {
      x = elem_or_x;
    }

    let container = document.createElement("container-x");

    container.background = this.getDefault("BoxSubBG");
    container.style["position"] = "absolute";
    container.style["z-index"] = 100;
    container.style["left"] = x + "px";
    container.style["top"] = y + "px";

    this.shadow.appendChild(container);

    let touchstart;

    let done = false;
    let end = () => {
      if (done) return;

      this.ctx.screen.removeEventListener("touchstart", touchstart, true);
      this.ctx.screen.removeEventListener("touchmove", touchstart, true);

      done = true;
      container.remove();
    };

    touchstart = (e) => {
      //console.log("=======================================================popup touch start");
      //console.log(e);

      let x = e.touches[0].screenX, y = e.touches[0].screenY;
      let elem = this.pickElement(x, y);

      if (elem === undefined) {
        return;
      }

      let p = elem;
      while (p) {
        //console.log(p, "<------------------------------------");

        if (p === container) {
          break;
        }
        p = p.parentWidget;
      }

      if (p === container) {
        //console.log("p was container -----------------------------");
        return;
      }

      let r = container.getTotalRect();
      console.log("R", r);

      if (r) {
        //XXX hack! why is it so hard to get real bounds of DOM elements!!
        //even UIBase.prototype.getTotalRect isn't working right!!
        let pad = 15.0;
        let pad2 = 150.0;

        //console.log(x, y);
        //console.log(r.x, r.y, r.width, r.height)
        //console.log(x >= r.x-pad && y >= r.y-pad2 && x <= r.x+r.width+pad && y <=r.y+r.height+pad2);
        if (x >= r.x-pad && y >= r.y-pad2 && x <= r.x+r.width+pad && y <=r.y+r.height+pad2) {
          return;
        }
      }

      console.log("container end");
      end();
      e.stopPropagation();
    };

    this.ctx.screen.addEventListener("touchstart", touchstart, true);
    this.ctx.screen.addEventListener("touchmove", touchstart, true);

    container.addEventListener("mouseleave", (e) => {
      console.log("popup mouse leave");
      end();
    });
    container.addEventListener("mouseout", (e) => {
      console.log("popup mouse out");
      end();
    });
    container.addEventListener("blur", (e) => {
      console.log("popup blur");
      end();
    });

    return container;
  }

  _recalcAABB() {
    let mm = new math.MinMax(2);

    for (let sarea of this.sareas) {
      this.minmaxArea(sarea, mm);
    }

    this._aabb[0].load(mm.min);
    this._aabb[1].load(mm.max);
  }

  get borders() {
    let this2 = this;

    return (function*() {
      for (let k in this2._edgemap) {
        yield this2._edgemap[k];
      }
    })();
  }
  //XXX look at if this is referenced anywhere
  load() {
  }

  //XXX look at if this is referenced anywhere
  save() {
  }
  
  remove() {
    this.unlisten();
    return super.remove();
  }
  
  unlisten() {
    if (this.listen_timer !== undefined) {
      window.clearInterval(this.listen_timer);
      this.listen_timer = undefined;
    }
  }
  
  listen() {
    if (this.listen_timer !== undefined) {
      return; //already listening
    }
    
    this.listen_timer = window.setInterval(() => {
      this.update();
    }, 150);
  }
  
  _ondestroy() {
    this.unlisten();

    //unlike other ondestroy functions, this one physically dismantles the DOM tree
    let recurse = (n, second_pass, parent) => {
      if (n.__pass === second_pass) {
        console.warn("CYCLE IN EFFING DOM TREE!", n, parent);
        return;
      }
      
      n.__pass = second_pass;
      
      n._forEachChildren(n2 => {
        if (n === n2)
          return;
        recurse(n2, second_pass, n);
        
        try {
          if (!second_pass && !n2.__destroyed) {
            n2.__destroyed = true;
            n2._ondestroy();
          }
        } catch (error) {
          print_stack(error);
          console.log("failed to exectue an ondestroy callback");
        }
        
        n2.__destroyed = true;
        
        try {
          if (second_pass) {
            n2.remove();
          }
        } catch (error) {
          print_stack(error);
          console.log("failed to remove element after ondestroy callback");
        }
      });
    };
    
    recurse(this, 0);
    recurse(this, 1);
  }

  destroy() {
    this._ondestroy();
  }

  clear() {
    this._ondestroy();
    
    this.sareas = [];
    this.sareas.active = undefined;
    
    for (let child of list(this.childNodes)) {
      child.remove();
    }
    for (let child of list(this.shadow.childNodes)) {
      child.remove();
    }
  }
  
  _test_save() {
    let obj = JSON.parse(JSON.stringify(this));
    console.log(JSON.stringify(this));
    
    this.loadJSON(obj);
  }
  
  loadJSON(obj, schedule_resize=false) {
    this.clear();
    super.loadJSON();
    
    for (let sarea of obj.sareas) {
      let sarea2 = document.createElement("screenarea-x");
      
      sarea2.ctx = this.ctx;
      sarea2.screen = this;
      
      this.appendChild(sarea2);
      
      sarea2.loadJSON(sarea);
    }
    
    this.regenBorders();
    this.setCSS();
    
    if (schedule_resize) {
      window.setTimeout(() => {
        this.on_resize([window.innerWidth, window.innerHeight]);
      }, 50);
    }
  }

  static fromJSON(obj, schedule_resize=false) {
    let ret = document.createElement(this.define().tagname);
    return ret.loadJSON(obj, schedule_resize);
  }
  
  toJSON() {
    let ret = {
      sareas : this.sareas
    };
    
    ret.size = this.size;
    ret.idgen = this.idgen;
    
    return Object.assign(super.toJSON(), ret);
  }

  getHotKey(toolpath) {
    let test = (keymap) => {
      for (let hk of keymap) {
        if (typeof hk.action != "string")
          continue;

        if (hk.action.trim() == toolpath.trim()) {
          return hk;
        }
      }
    }

    let ret = test(this.keymap);
    if (ret)
      return ret;

    if (this.sareas.active && this.sareas.active.keymap) {
      ret = test(this.sareas.active.area.keymap);
      if (ret)
        return ret;
    }

    if (ret === undefined) {
      //just to be safe, check all areas in case the
      //context is confused as to which area is currently "active"

      for (let sarea of this.sareas) {
        if (sarea.area.keymap) {
          ret = test(sarea.area.keymap);

          if (ret)
            return ret;
        }
      }
    }

    return undefined;
  }

  execKeyMap(e) {
    let handled = false;

    if (this.sareas.active && this.sareas.active.area.keymap) {
      let area = this.sareas.active.area;
      //console.log(area.getKeyMaps());
      for (let keymap of area.getKeyMaps()) {
        if (keymap.handle(this.ctx, e)) {
          handled = true;
          break;
        }
      }
    }

    handled = handled || this.keymap.handle(this.ctx, e);

    return handled;
  }

  static define() {return {
    tagname : "screen-x"
  };}
  
  drawUpdate() {
    if (window.redraw_all !== undefined) {
      window.redraw_all();
    }
  }
  
  update() {
    for (let k in this._edgemap) {
      let b = this._edgemap[k];

      if (b === undefined) {
        //how?
        continue;
      }
      let is_outer = this.isBorderOuter(b, b.side);

      if (is_outer != b.is_outer) {
        console.log("detected collapsed area?");
        this.regenBorders();
      }
    }

    for (let sarea of this.sareas) {
      for (let b of sarea._borders) {
        let movable = this.isBorderMovable(sarea, b);

        if (movable != b.movable) {
          console.log("detected change in movable borders");
          this.regenBorders();
        }
      }
    }

    if (this._update_gen) {
      let ret;
      
      try {
        ret = this._update_gen.next();
      } catch (error) {
        util.print_stack(error);
        console.log("error in update_intern tasklet");
        this._update_gen = undefined;
        return;
      }
      
      if (ret !== undefined && ret.done) {
        this._update_gen = undefined;
      }
    } else {
      this._update_gen = this.update_intern();
    }
  }

  get ctx() {
    return this._ctx;
  }

  set ctx(val) {
    this._ctx = val;

    //fully recurse tree
    let rec = (n) => {
      if (n instanceof UIBase) {
        n.ctx = val;
      }

      for (let n2 of n.childNodes) {
        rec(n2);
      }

      if (n.shadow) {
        for (let n2 of n.shadow.childNodes) {
          rec(n2);
        }
      }
    }

    for (let n of this.childNodes) {
      rec(n);
    }

    for (let n of this.shadow.childNodes) {
      rec(n);
    }
  }
  //XXX race condition warning
  update_intern() {
    super.update();
    let this2 = this;
    
    //ensure each area has proper ctx set
    for (let sarea of this.sareas) {
      sarea.ctx = this.ctx;
    }
    
    return (function*() {
      let stack = update_stack;
      stack.cur = 0;

      let lastn = this2;
      
      function push(n) {
        stack[stack.cur++] = n;
      }
      
      function pop(n) {
        if (stack.cur < 0) {
          throw new Error("Screen.update(): stack overflow!");
        }
        
        return stack[--stack.cur];
      }
      
      let ctx = this2.ctx;

      let SCOPE_POP = Symbol("pop");
      let AREA_CTX_POP = Symbol("pop2");

      let scopestack = [];
      let areastack = [];

      let t = util.time_ms();
      push(this2);
      while (stack.cur > 0) {
        let n = pop();
        
        if (n === undefined) {
          //console.log("eek!", stack.length);
          continue;
        } else if (n == SCOPE_POP) {
          scopestack.pop();
          continue;
        } else if (n == AREA_CTX_POP) {
          //console.log("POP", areastack[areastack.length-1].constructor.name);
          areastack.pop().pop_ctx_active(ctx);
          continue;
        }

        if (n instanceof Area) {
          //console.log("PUSH", n.constructor.name);
          areastack.push(n);
          n.push_ctx_active(ctx);
          push(AREA_CTX_POP);
        }

        if (n !== this2 && n instanceof UIBase) {
          n._ctx = ctx;

          if (scopestack.length > 0 && scopestack[scopestack.length-1]) {
            n.parentWidget = scopestack[scopestack.length-1];

            if (n.parentWidget && n._useDataPathToolOp === undefined && n.parentWidget._useDataPathToolOp !== undefined) {
              n._useDataPathToolOp = n.parentWidget._useDataPathToolOp;
            }
          }

          n.update();
        }

        if (util.time_ms() - t > 30) {
         yield; 
         t = util.time_ms();
        }

        for (let n2 of n.childNodes) {
          push(n2);
        }

        if (n.shadow === undefined) {
          continue;
        }
        
        for (let n2 of n.shadow.childNodes) {
          push(n2);
        }

        if (n instanceof UIBase) {
          scopestack.push(n);
          push(SCOPE_POP);
        }
      }
    })();
  }
  
  loadFromVerts() {
    for (let sarea of this.sareas) {
      sarea.loadFromVerts();
      sarea.on_resize(sarea.size);
      sarea.setCSS();
    }
    
    this.setCSS();
  }
  
  splitArea(sarea, t=0.5, horiz=true) {
    let w = sarea.size[0], h = sarea.size[1];
    let x =  sarea.pos[0], y = sarea.size[1];
    let s1, s2;
    
    if (!horiz) {
      s1 = sarea;
      if (s1.ctx === undefined) {
        s1.ctx = this.ctx;
      }
      s2 = s1.copy(this);
      
      s1.size[0] *= t;
      s2.size[0] *= (1.0 - t);
      
      s2.pos[0] += w * t;
    } else {
      s1 = sarea;
      if (s1.ctx === undefined) {
        s1.ctx = this.ctx;
      }
      s2 = s1.copy(this);
      
      s1.size[1] *= t;
      s2.size[1] *= (1.0 - t);
      
      s2.pos[1] += h * t;
    }
    
    s2.ctx = this.ctx;
    this.appendChild(s2);
    
    s1.on_resize(s1.size);
    s2.on_resize(s2.size);

    this.regenBorders();
    
    s1.setCSS();
    s2.setCSS();
    
    this.setCSS();
    
    //XXX not sure if this is right place to do this or really necassary
    if (s2.area !== undefined)
      s2.area.onadd();
    
    return s2;
  }
  
  setCSS() {
    this.style["width"] = this.size[0] + "px";
    this.style["height"] = this.size[1] + "px";
    
    //call setCSS on borders
    for (let key in this._edgemap) {
      let b = this._edgemap[key];
      
      b.setCSS();
    }
  }

  regenScreenMesh() {
    this.regenBorders();
  }

  //XXX rename to regenScreenMesh
  regenBorders() {
    for (let k in this._edgemap) {
      let b = this._edgemap[k];
      
      b.remove();
    }
    
    this._edgemap = {};
    this._vertmap = {};
    this.screenverts.length = 0;
    
    for (let sarea of this.sareas) {
      sarea.makeBorders(this);
    }
    
    for (let key in this._edgemap) {
      let b = this._edgemap[key];
      
      b.setCSS();
    }

    this._recalcAABB();
  }
  
  snapScreenVerts() {
    let min = [1e17, 1e17], max = [-1e17, -1e17];
    
    this.regenBorders();

    //fit entire screen to, well, the entire screen (size)
    for (let v of this.screenverts) {
      for (let i=0; i<2; i++) {
        min[i] = Math.min(min[i], v[i]);
        max[i] = Math.max(max[i], v[i]);
      }
    }
    
    let vec = new Vector2(max).sub(min);
    let sz = new Vector2(this.size);
    
    sz.div(vec);
    
    for (let v of this.screenverts) {
      v.sub(min).mul(sz);
    }
    
    for (let sarea of this.sareas) {
      sarea.on_resize(sarea.size);
      sarea.loadFromVerts();
    }
    
    this.regenBorders();
    
    for (let sarea of this.sareas) {
      sarea.makeBorders(this);
      sarea.setCSS();
    }
    
    this.setCSS();
  }
  
  on_resize(size) {
    size[0] = ~~size[0];
    size[1] = ~~size[1];

    //console.trace("this.size", this.size, "newsize", size);

    let ratio = [size[0] / this.size[0], size[1] / this.size[1]];

    //console.log("resize!", ratio);
    
    this.regenBorders();
    
    let min = [1e17, 1e17], max = [-1e17, -1e17];
    
    //fit entire screen to, well, the entire screen (size)
    for (let v of this.screenverts) {
      v[0] *= ratio[0];
      v[1] *= ratio[1];
      
      for (let i=0; i<2; i++) {
        min[i] = Math.min(min[i], v[i]);
        max[i] = Math.max(max[i], v[i]);
      }
    }
    
    let vec = new Vector2(max).sub(min);
    let sz = new Vector2(size);
    
    sz.div(vec);
    
    for (let v of this.screenverts) {
      v.sub(min).mul(sz).floor();
    }
    
    for (let sarea of this.sareas) {
      sarea.on_resize([sarea.size[0]*ratio[0], sarea.size[1]*ratio[1]]);
      sarea.loadFromVerts();
    }
    
    this.regenBorders();
    
    for (let sarea of this.sareas) {
      sarea.makeBorders(this);
      sarea.setCSS();
    }
    
    this.size[0] = size[0];
    this.size[1] = size[1];
    this.setCSS();

    this._recalcAABB();
  }
  
  getScreenVert(pos, side, is_outer=false) {
    let key = ScreenVert.hash(pos, side, is_outer);

    if (!(key in this._vertmap)) {
      let v = new ScreenVert(pos, this.idgen++, is_outer, side);
      
      this._vertmap[key] = v;
      this._idmap[v._id] = v;
      
      this.screenverts.push(v);
    }
    
    return this._vertmap[key];
  }


  //XXX
  //NOT WORKING, am preventing collapsed areas in FrameManager_ops's resize tool for now
  //are we on the outerside of the screen (and *not*
  //on the opposite edge of the area, e.g. for collapsed areas)?
  isBorderOuter(b, side, v1=b.v1, b2=b.v2) {
    return 0; //XXX
    let is_outer = false;
    const outer_snap_limit = 25;

    const table = [
      [0, 0], [1, 1],
      [1, 0], [0, 1]
    ];

    //side = side == 2 ? side : undefined;

    if (side !== undefined) {
      let off = table[side];
      let diff = Math.abs(v1[off[1]] - this._aabb[off[0]][off[1]]);

      //console.log("getScreenBorder", diff, v1[off[1]], this._aabb[off[0]][off[1]]);

      if (diff < outer_snap_limit) {
        //console.log("outer border!", side);
        is_outer = side+1;
      }
    }

    return is_outer;
  }

  //XXX
  //NOT WORKING, am preventing collapsed areas in FrameManager_ops's resize tool for now
  isBorderMovable(sarea, b, side=b.side, v1=b.v1, v2=b.v2) {
    return true; //XXX

    let limit = 5;
    let collapsed = sarea.size[0] < limit || sarea.size[1] < limit;

    if (limit && b.valence > 1) {
      return true;
    }

    let horiz = Math.abs(b.v2[0]-b.v1[0]) > Math.abs(b.v2[1]-b.v1[1]);
    const snap_limit = 3;

    let table = [
      0, //min
      1, //max
      1, //max
      0, //min
    ]

    let axis = this._aabb[b.side & 1][horiz ^ 1];
    if (Math.abs(axis - b.v1[horiz^1]) < snap_limit) {
      console.log("border is not movable");
      return false;
    }

    return true;
  }

  getScreenBorder(sarea, v1, v2, side) {
    let is_outer = this.isBorderOuter(undefined, side, v1, v2);

    //XXX
    side=is_outer = 0;

    if (!(v1 instanceof ScreenVert)) {
      v1 = this.getScreenVert(v1, side, is_outer);
    }
    
    if (!(v2 instanceof ScreenVert)) {
      v2 = this.getScreenVert(v2, side, is_outer);
    }
    
    let hash = ScreenBorder.hash(v1, v2, side, is_outer);
    
    if (!(hash in this._edgemap)) {
      let sa = this._edgemap[hash] = document.createElement("screenborder-x");

      sa.is_outer = is_outer;
      sa.side = side;

      sa.screen = this;
      sa.v1 = v1;
      sa.v2 = v2;
      sa._id = this.idgen++;

      sa.movable = 1;//this.isBorderMovable(sarea, sa, side, v1, v2);

      v1.borders.push(sa);
      v2.borders.push(sa);
      
      sa.ctx = this.ctx;
      this.appendChild(sa);
      
      sa.setCSS();
      
      this._edgemap[hash] = sa;
      this._idmap[sa._id] = sa;
    }
    
    return this._edgemap[hash];
  }

  minmaxArea(sarea, mm=undefined) {
    if (mm === undefined) {
      mm = new math.MinMax(2);
    }
    
    for (let b of sarea._borders) {
      mm.minmax(b.v1);
      mm.minmax(b.v2);
    }
    
    return mm;
  }
  
  //does sarea1 border sarea2?
  areasBorder(sarea1, sarea2) {
    for (let b of sarea1._borders) {
      for (let sa of b.sareas) {
        if (sa === sarea2)
          return true;
      }
    }
    
    return false;
  }
  
  replaceArea(dst, src) {
    if (dst === src)
      return;
    
    src.pos[0] = dst.pos[0];
    src.pos[1] = dst.pos[1];
    src.size[0] = dst.size[0];
    src.size[1] = dst.size[1];

    if (this.sareas.indexOf(src) < 0) {
      this.appendChild(src);
    }

    //this.sareas.remove(dst);
    //dst.remove();
    
    this.removeArea(dst);
    
    this.regenBorders();
    this.snapScreenVerts();      
    this._updateAll();
  }
  
  //regenerates borders, sets css and calls this.update
  _internalRegenAll() {
    this.regenBorders();
    this._updateAll();
  }
  
  
  _updateAll() {
    for (let sarea of this.sareas) {
      sarea.setCSS();
    }
    this.setCSS();
    this.update();
  }
  
  removeArea(sarea) {
    if (this.sareas.indexOf(sarea) < 0) {
      console.warn(sarea, "<- Warning: tried to remove unknown area");
      return;
    }
    
    this.sareas.remove(sarea);
    sarea.remove();
    
    this.snapScreenVerts();
    this.regenBorders();
    
    this._updateAll();
    this.drawUpdate();
  }
  
  appendChild(child) {
    if (child instanceof UIBase) {
      if (child._useDataPathToolOp === undefined) {
        child.useDataPathToolOp = this.useDataPathToolOp;
      }
    }

    if (child instanceof ScreenArea.ScreenArea) {
      child.screen = this;
      child.ctx = this.ctx;
      
      if (!child._has_evts) {
        child._has_evts = true;
          
        let onfocus = (e) => {
          this.sareas.active = child;
        }
        
        let onblur = (e) => {
          if (this.sareas.active === child) {
            this.sareas.active = undefined;
          }
        }
        
        child.addEventListener("focus", onfocus);
        child.addEventListener("mouseenter", onfocus);
        child.addEventListener("blur", onblur);
        child.addEventListener("mouseleave", onblur);
      }
      
      this.sareas.push(child);
      this.drawUpdate();
    }
    
    return this.shadow.appendChild(child);
    //return super.appendChild(child);
  }
  
  splitTool() {
    console.log("screen split!");
    
    //let tool = new FrameManager_ops.SplitTool(this);
    let tool = new FrameManager_ops.AreaDragTool(this, undefined, this.mpos);
    tool.start();
  }
  
  areaDragTool(sarea=this.sareas.active) {
    if (sarea === undefined) {
      console.warn("no active screen area");
      return;
    }
    
    console.log("screen area drag!");
    
    let mpos = this.mpos;
    let tool = new FrameManager_ops.AreaDragTool(this, this.sareas.active, mpos);
    
    tool.start();
  }
  
  makeBorders() {
    for (let sarea of this.sareas) {
      sarea.makeBorders(this);
    }
  }
      
  on_keydown(e) {
    if (!haveModal() && this.execKeyMap(e)) {
      e.preventDefault();
      return;
    }

    if (!haveModal() && this.sareas.active !== undefined && this.sareas.active.on_keydown) {
      let area = this.sareas.active;
      return this.sareas.active.on_keydown(e);
    }
  }
  
  on_keyup(e) {
    if (!haveModal() && this.sareas.active !== undefined && this.sareas.active.on_keyup) {
      return this.sareas.active.on_keyup(e);
    }
  }
  
  on_keypress(e) {
    if (!haveModal() && this.sareas.active !== undefined && this.sareas.active.on_keypress) {
      return this.sareas.active.on_keypress(e);
    }
  }
  
  /*
  _do_mouse_event(e) {
    let type = e.type.toLowerCase();
    
    if (this.sareas.active !== undefined) {
      let x = e.x, y = e.y;
      let ret, sa = this.sareas.active;
      
      e.x -= sa.pos[0];
      e.y -= sa.pos[1];
      
      let key = "on_" + type.toLowerCase();
      
      try {
        ret = sa[key](e);
      } catch (error) {
        util.print_stack(error);
        console.error("Exception raised in Screen._do_mouse_event for a ScreenArea");
        
        ret = undefined;
      }
      
      e.x = x;
      e.y = y;
    }
    
    return e;
  }
  
  on_mousedown(e) {
    super.on_mousedown(e);
    return this._do_mouse_event(e);
  }
  on_mousemove(e) {
    super.on_mousemove(e);
    return this._do_mouse_event(e);
  }
  on_mouseup(e) {
    super.on_mouseup(e);
    return this._do_mouse_event(e);
  }
  on_touchstart(e) {
    super.on_touchstart(e);
    return this._do_mouse_event(e);
  }
  on_touchmove(e) {
    super.on_touchmove(e);
    return this._do_mouse_event(e);
  }
  on_touchcancel(e) {
    super.on_touchcancel(e);
    return this._do_mouse_event(e);
  }
  on_touchend(e) {
    super.on_touchend(e);
    return this._do_mouse_event(e);
  }//*/
  
  draw() {
    for (let sarea of this.sareas) {
      sarea.draw();
    }
  }
  
  static newSTRUCT() {
    return document.createElement(this.define().tagname);
  }

  afterSTRUCT() {
    for (let sarea of this.sareas) {
      sarea._ctx = this.ctx;
      sarea.afterSTRUCT();
    }
  }

  loadSTRUCT(reader) {
    reader(this);
    
    let sareas = this.sareas;
    this.sareas = [];
    
    for (let sarea of sareas) {
      sarea.screen = this;
      this.appendChild(sarea);
    }

    this.regenBorders();
    this.setCSS();

    this.doOnce(() => {
      this.loadUIData(this.uidata);
      this.uidata = undefined;
    });

    return this;
  }
  
  test_struct() {
    let data = [];
    //let scripts = nstructjs.write_scripts();
    nstructjs.manager.write_object(data, this);
    data = new DataView(new Uint8Array(data).buffer);
    
    let screen2 = nstructjs.manager.read_object(data, this.constructor);
    screen2.ctx = this.ctx;
    
    for (let sarea of screen2.sareas) {
      sarea.screen = screen2;
      sarea.ctx = this.ctx;
      sarea.area.ctx = this.ctx;
    }
    
    let parent = this.parentElement;
    this.remove();
    
    this.ctx.screen = screen2;
    
    parent.appendChild(screen2);
    
    //for (let 
    screen2.regenBorders();
    screen2.update();
    screen2.listen();
    
    screen2.doOnce(() => {
      screen2.on_resize([window.innerWidth, window.innerHeight]);
    });
    
    console.log(data)
    return screen2;
  }

  saveUIData() {
    try {
      return ui_base.saveUIData(this, "screen");
    } catch (error) {
      util.print_stack(error);
      console.log("Failed to save UI state data");
    }
  }

  loadUIData(str) {
    try {
      ui_base.loadUIData(this, str);
    } catch (error) {
      util.print_stack(error);
      console.log("Failed to load UI state data");
    }
  }
}

Screen.STRUCT = `
pathux.Screen { 
  size  : array(float);
  sareas : array(pathux.ScreenArea);
  idgen : int;
  uidata : string | obj.saveUIData();
}
`;
  
nstructjs.manager.add_class(Screen);
ui_base.UIBase.register(Screen);

ScreenArea.setScreenClass(Screen);

