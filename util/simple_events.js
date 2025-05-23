import * as util from "./util.js";
import cconst from '../config/config.js';
import {Vector2} from './vectormath.js';

export let modalstack = [];
let singleMouseCBs = {};

function debugDomEvents() {
  let cbsymbol = Symbol("event-callback");
  let thsymbol = Symbol("debug-info");

  let idgen = 0;

  function init(et) {
    if (!et[thsymbol]) {
      et[thsymbol] = idgen++;
    }
  }

  function getkey(et, type, options) {
    init(et);
    return "" + et[thsymbol] + ":" + type + ":" + JSON.stringify(options);
  }

  let addEventListener = EventTarget.prototype.addEventListener;
  let removeEventListener = EventTarget.prototype.removeEventListener;

  EventTarget.prototype.addEventListener = function (type, cb, options) {
    init(this);

    if (!cb[cbsymbol]) {
      cb[cbsymbol] = new Set();
    }

    let key = getkey(this, type, options);
    cb[cbsymbol].add(key);

    return addEventListener.call(this, type, cb, options);
  }

  EventTarget.prototype.removeEventListener = function (type, cb, options) {
    init(this);

    if (!cb[cbsymbol]) {
      console.error("Invalid callback in removeEventListener for", type, this, cb);
      return;
    }

    let key = getkey(this, type, options);

    if (!cb[cbsymbol].has(key)) {
      console.error("Callback not in removeEventListener;", type, this, cb);
      return;
    }

    cb[cbsymbol].delete(key);

    return removeEventListener.call(this, type, cb, options);
  }
}

function singletonMouseEvents() {
  if (typeof document === 'undefined') {
    // inside a worker?
    return
  }
  
  let keys = ["mousedown", "mouseup", "mousemove"];
  for (let k of keys) {
    singleMouseCBs[k] = new Set();
  }

  let ddd = -1.0;
  window.testSingleMouseUpEvent = (type = "mousedown") => {
    let id = ddd++;
    singleMouseEvent(() => {
      console.log("mouse event", id);
    }, type)
  };

  let _mpos = new Vector2();

  function doSingleCbs(e, type) {
    let list = singleMouseCBs[type];
    singleMouseCBs[type] = new Set();

    if (e.type !== "touchend" && e.type !== "touchcancel") {
      _mpos[0] = e.touches && e.touches.length > 0 ? e.touches[0].pageX : e.x;
      _mpos[1] = e.touches && e.touches.length > 0 ? e.touches[0].pageY : e.y;
    }

    if (e.touches) {
      e = copyEvent(e);

      e.type = type;
      if (e.touches.length > 0) {
        e.x = e.pageX = e.touches[0].pageX;
        e.y = e.pageY = e.touches[0].pageY;
      } else {
        e.x = _mpos[0];
        e.y = _mpos[1];
      }
    }

    for (let cb of list) {
      try {
        cb(e);
      } catch (error) {
        util.print_stack(error);
        console.warn("Error in event callback");
      }
    }
  }

  window.addEventListener("mouseup", (e) => {
    doSingleCbs(e, "mouseup");
  }, {capture: true});
  window.addEventListener("touchcancel", (e) => {
    doSingleCbs(e, "mouseup");
  }, {capture: true});
  document.addEventListener("touchend", (e) => {
    doSingleCbs(e, "mouseup");
  }, {capture: true});

  document.addEventListener("mousedown", (e) => {
    doSingleCbs(e, "mousedown");
  }, {capture: true});
  document.addEventListener("touchstart", (e) => {
    doSingleCbs(e, "mousedown");
  }, {capture: true});

  document.addEventListener("mousemove", (e) => {
    doSingleCbs(e, "mousemove");
  }, {capture: true});
  document.addEventListener("touchmove", (e) => {
    doSingleCbs(e, "mousemove");
  }, {capture: true});

  return {
    singleMouseEvent(cb, type) {
      if (!(type in singleMouseCBs)) {
        throw new Error("not a mouse event");
      }

      singleMouseCBs[type].add(cb);
    }
  };
}

singletonMouseEvents = singletonMouseEvents();

/**
 * adds a mouse event callback that only gets called once
 * */
export function singleMouseEvent(cb, type) {
  return singletonMouseEvents.singleMouseEvent(cb, type);
}


/*tests if either the left mouse button is down,
* or a touch event has happened and e.touches.length == 1*/
export function isLeftClick(e) {
  if (e.touches !== undefined) {
    return e.touches.length === 1;
  }

  return e.button === 0;
}

export class DoubleClickHandler {
  constructor() {
    this.down = 0;
    this.last = 0;
    this.dblEvent = undefined;

    this.start_mpos = new Vector2();

    this._on_mouseup = this._on_mouseup.bind(this);
    this._on_mousemove = this._on_mousemove.bind(this);
  }

  _on_mouseup(e) {
    //console.log("mup", e);
    this.mdown = false;
  }

  _on_mousemove(e) {
    let mpos = new Vector2();
    mpos[0] = e.x;
    mpos[1] = e.y;

    let dist = mpos.vectorDistance(this.start_mpos)*devicePixelRatio;

    if (dist > 11) {
      //console.log("cancel", dist);
      this.mdown = false;
    }

    if (this.mdown) {
      singleMouseEvent(this._on_mousemove, "mousemove");
    }

    this.update();
  }

  mousedown(e) {
    //console.log("mdown", e.x, e.y);

    if (!this.last) {
      this.last = 0;
    }
    if (!this.down) {
      this.down = 0;
    }
    if (!this.up) {
      this.up = 0;
    }

    if (isMouseDown(e)) {
      this.mdown = true;

      let cpy = Object.assign({}, e);

      this.start_mpos[0] = e.x;
      this.start_mpos[1] = e.y;

      singleMouseEvent(this._on_mousemove, "mousemove");

      if (e.type.search("touch") >= 0 && e.touches.length > 0) {
        cpy.x = cpy.pageX = e.touches[0].pageX;
        cpy.y = cpy.pageY = e.touches[1].pageY;
      } else {
        cpy.x = cpy.pageX = e.x;
        cpy.y = cpy.pageY = e.y;
      }

      //stupid real MouseEvent class zeros .x/.y
      //continue using hackish copyEvent for now...

      this.dblEvent = copyEvent(e);
      this.dblEvent.type = "dblclick";

      this.last = this.down;
      this.down = util.time_ms();

      if (this.down - this.last < cconst.doubleClickTime) {
        this.mdown = false;
        this.ondblclick(this.dblEvent);

        this.down = this.last = 0.0;
      } else {
        singleMouseEvent(this._on_mouseup, "mouseup");
      }
    } else {
      this.mdown = false;
    }
  }

  //you may override this
  ondblclick(e) {

  }

  update() {
    if (modalstack.length > 0) {
      //cancel double click requests
      this.mdown = false;
    }

    if (this.mdown && util.time_ms() - this.down > cconst.doubleClickHoldTime) {
      this.mdown = false;
      this.ondblclick(this.dblEvent);
    }
  }

  abort() {
    this.last = this.down = 0;
  }
}

export function isMouseDown(e) {
  let mdown = 0;

  if (e.touches !== undefined) {
    mdown = e.touches.length > 0;
  } else {
    mdown = e.buttons;
  }

  mdown = mdown & 1;

  return mdown;
}

export function pathDebugEvent(e, extra) {
  e.__prevdef = e.preventDefault;
  e.__stopprop = e.stopPropagation;

  e.preventDefault = function () {
    console.warn("preventDefault", extra);
    return this.__prevdef();
  };

  e.stopPropagation = function () {
    console.warn("stopPropagation", extra);
    return this.__stopprop();
  }
}

/** Returns true if event came from a touchscreen or pen device */
export function eventWasTouch(e) {
  let ret = e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents;
  ret = ret || e.was_touch;
  ret = ret || e instanceof TouchEvent;
  ret = ret || e.touches !== undefined;

  if (e instanceof PointerEvent) {
    ret = ret || (e.pointerType === "pen" || e.pointerType === "touch");
  }

  return ret;
}

export function copyEvent(e) {
  let ret = {};
  let keys = [];

  for (let k in e) {
    keys.push(k);
  }

  keys = keys.concat(Object.getOwnPropertySymbols(e));
  keys = keys.concat(Object.getOwnPropertyNames(e));

  for (let k of keys) {
    let v;

    try {
      v = e[k];
    } catch (error) {
      console.warn("read error for event key", k);
      continue;
    }

    if (typeof v == "function") {
      ret[k] = v.bind(e);
    } else {
      ret[k] = v;
    }
  }

  ret.original = e;

  return ret;
}

let Screen;

export function _setScreenClass(cls) {
  Screen = cls;
}

function findScreen() {
  let rec = (n) => {
    for (let n2 of n.childNodes) {
      if (n2 && typeof n2 === "object" && n2 instanceof Screen) {
        return n2;
      }
    }

    for (let n2 of n.childNodes) {
      let ret = rec(n2);
      if (ret) {
        return ret;
      }
    }
  };

  return rec(document.body);
}

window._findScreen = findScreen;

let ContextAreaClass;

export function _setModalAreaClass(cls) {
  ContextAreaClass = cls;
}

export function pushPointerModal(obj, elem, pointerId, autoStopPropagation = true) {
  return pushModalLight(obj, autoStopPropagation, elem, pointerId);
}

export function pushModalLight(obj, autoStopPropagation = true, elem, pointerId) {
  let keys;

  if (pointerId === undefined) {
    keys = new Set([
      "keydown", "keyup", "mousedown", "mouseup", "touchstart", "touchend",
      "touchcancel", "mousewheel", "mousemove", "mouseover", "mouseout", "mouseenter",
      "mouseleave", "dragstart", "drag", "dragend", "dragexit", "dragleave", "dragover",
      "dragenter", "drop", "pointerdown", "pointermove", "pointerup", "pointercancel",
      "pointerstart", "pointerend", "pointerleave", "pointerexit", "pointerenter",
      "pointerover"
    ]);
  } else {
    keys = new Set([
      "keydown", "keyup", "keypress", "mousewheel"
    ]);
  }

  let ret = {
    keys     : keys,
    handlers : {},
    last_mpos: [0, 0]
  };

  let touchmap = {
    "touchstart" : "mousedown",
    "touchmove"  : "mousemove",
    "touchend"   : "mouseup",
    "touchcancel": "mouseup"
  };

  let mpos = [0, 0];

  let screen = findScreen();
  if (screen) {
    mpos[0] = screen.mpos[0];
    mpos[1] = screen.mpos[1];
    screen = undefined;
  }

  function handleAreaContext() {
    let screen = findScreen();
    if (screen) {
      let sarea = screen.findScreenArea(mpos[0], mpos[1]);
      if (sarea && sarea.area) {
        sarea.area.push_ctx_active();
        sarea.area.pop_ctx_active();
      }
    }
  }

  function make_default_touchhandler(type, state) {
    return function (e) {
      if (cconst.DEBUG.domEvents) {
        pathDebugEvent(e);
      }

      if (touchmap[type] in ret.handlers) {
        let type2 = touchmap[type];

        let e2 = copyEvent(e);

        e2.was_touch = true;
        e2.type = type2;
        e2.button = type == "touchcancel" ? 1 : 0;
        e2.touches = e.touches;

        if (e.touches.length > 0) {
          let t = e.touches[0];

          mpos[0] = t.pageX;
          mpos[1] = t.pageY;

          e2.pageX = e2.x = t.pageX;
          e2.pageY = e2.y = t.pageY;
          e2.clientX = t.clientX;
          e2.clientY = t.clientY;
          e2.x = t.clientX;
          e2.y = t.clientY;

          ret.last_mpos[0] = e2.x;
          ret.last_mpos[1] = e2.y;
        } else {
          e2.x = e2.clientX = e2.pageX = e2.screenX = ret.last_mpos[0];
          e2.y = e2.clientY = e2.pageY = e2.screenY = ret.last_mpos[1];
        }

        e2.was_touch = true;

        handleAreaContext();
        //console.log(e2.x, e2.y);
        ret.handlers[type2](e2);
      }

      if (autoStopPropagation) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }

  function make_handler(type, key) {
    return function (e) {
      if (cconst.DEBUG.domEvents) {
        pathDebugEvent(e);
      }

      if (typeof key !== "string") {
        //console.warn("key was undefined", key, type);
        return;
      }

      if (key.startsWith("mouse")) {
        mpos[0] = e.pageX;
        mpos[1] = e.pageY;
      } else if (key.startsWith("pointer")) {
        mpos[0] = e.x;
        mpos[1] = e.y;
      }

      handleAreaContext();

      if (key !== undefined)
        obj[key](e);

      if (autoStopPropagation) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }

  let found = {};

  for (let k of keys) {
    let key;

    if (obj[k])
      key = k;
    else if (obj["on" + k])
      key = "on" + k;
    else if (obj["on_" + k])
      key = "on_" + k;
    else if (k in touchmap)
      continue; //default touch event handlers will be done seperately
    else
      key = undefined; //make handler that still blocks events

    //check we don't override other mouse pointer event handlers
    if (key === undefined && k.search("pointer") === 0) {
      continue;
    }

    if (key !== undefined) {
      found[k] = 1;
    }

    let handler = make_handler(k, key);
    ret.handlers[k] = handler;

    let settings = handler.settings = {passive: false, capture: true};
    window.addEventListener(k, handler, settings);
  }

  for (let k in touchmap) {
    if (!(k in found)) {
      //console.log("making touch handler for", '"' + k + '"', ret.handlers[k]);

      ret.handlers[k] = make_default_touchhandler(k, ret);

      let settings = ret.handlers[k].settings = {passive: false, capture: true};
      window.addEventListener(k, ret.handlers[k], settings);
    }
  }

  if (pointerId !== undefined) {
    ret.pointer = {
      elem, pointerId
    };

    function make_pointer(k) {
      let k2 = "on_" + k;

      ret.pointer[k] = function (e) {
        if (obj[k2] !== undefined) {
          obj[k2](e);
        }

        if (autoStopPropagation) {
          e.stopPropagation();
          e.preventDefault();
        }
      }
    }

    make_pointer("pointerdown");
    make_pointer("pointermove");
    make_pointer("pointerup");
    make_pointer("pointerstart");
    make_pointer("pointerend");
    make_pointer("pointerleave");
    make_pointer("pointerenter");
    make_pointer("pointerout");
    make_pointer("pointerover");
    make_pointer("pointerexit");
    make_pointer("pointercancel");

    for (let k in ret.pointer) {
      if (k !== "elem" && k !== "pointerId") {
        elem.addEventListener(k, ret.pointer[k]);
      }
    }

    try {
      elem.setPointerCapture(pointerId)
    } catch (error) {
      util.print_stack(error);

      console.log("attempting fallback");

      for (let k in ret.pointer) {
        if (k !== "elem" && k !== "pointerId") {
          elem.removeEventListener(k, ret.pointer[k]);
        }
      }

      delete ret.pointer;

      modalstack.push(ret);
      popModalLight(ret);

      for (let k in obj) {
        if (k === "pointercancel" || k === "pointerend" || k === "pointerstart") {
          continue;
        }

        if (k.startsWith("pointer")) {
          let k2 = k.replace(/pointer/, "mouse");
          if (k2 in obj) {
            console.warn("warning, existing mouse handler", k2);
            continue;
          }

          let v = obj[k];
          obj[k] = undefined;

          obj[k2] = v;
        }
      }

      console.log(obj);

      return pushModalLight(obj, autoStopPropagation);
    }
  }

  modalstack.push(ret);
  ContextAreaClass.lock();

  if (cconst.DEBUG.modalEvents) {
    console.warn("pushModalLight", ret.pointer ? "(pointer events)" : "");
  }

  return ret;
}

/* Trace all calls to EventTarget.prototype.[add/rem]EventListener */
if (0) {
  window._print_evt_debug = false;

  function evtprint() {
    if (window.window._print_evt_debug) {
      console.warn(...arguments);
    }
  }

  let addevent = EventTarget.prototype.addEventListener;
  let remevent = EventTarget.prototype.removeEventListener;

  const funckey = Symbol("eventfunc");

  EventTarget.prototype.addEventListener = function (name, func, args) {
    //if (name.startsWith("key")) {
    evtprint("listener added", name, func.name, args);
    //}

    let func2 = function (e) {
      let proxy = new Proxy(e, {
        get(target, p, receiver) {
          if (p === "preventDefault") {
            return function () {
              evtprint("preventDefault", name, arguments);
              return e.preventDefault(...arguments);
            }
          } else if (p === "stopPropagation") {
            return function () {
              evtprint("stopPropagation", name, arguments);
              return e.preventDefault(...arguments);
            }
          }

          return e[p];
        }
      });

      return func.call(this, proxy);
    }

    func[funckey] = func2;

    return addevent.call(this, name, func2, args);
  }

  EventTarget.prototype.removeEventListener = function (name, func, args) {
    //if (name.startsWith("key")) {
    evtprint("listener removed", name, func.name, args);
    //}

    func = func[funckey];

    return remevent.call(this, name, func, args);
  }
}

export function popModalLight(state) {
  if (state === undefined) {
    console.warn("Bad call to popModalLight: state was undefined");
    return;
  }

  if (state !== modalstack[modalstack.length - 1]) {
    if (modalstack.indexOf(state) < 0) {
      console.warn("Error in popModalLight; modal handler not found");
      return;
    } else {
      console.warn("Error in popModalLight; called in wrong order");
    }
  }

  for (let k in state.handlers) {
    //console.log(k);
    window.removeEventListener(k, state.handlers[k], state.handlers[k].settings);
  }

  state.handlers = {};
  modalstack.remove(state);
  ContextAreaClass.unlock();

  if (cconst.DEBUG.modalEvents) {
    console.warn("popModalLight", modalstack, state.pointer ? "(pointer events)" : "");
  }

  if (state.pointer) {
    let elem = state.pointer.elem;

    try {
      elem.releasePointerCapture(state.pointer.pointerId);
    } catch (error) {
      util.print_stack(error);
    }

    for (let k in state.pointer) {
      if (k !== "elem" && k !== "pointerId") {
        elem.removeEventListener(k, state.pointer[k]);
      }
    }
  }
}

export function haveModal() {
  return modalstack.length > 0;
}

window._haveModal = haveModal; //for debugging console

export var keymap_latin_1 = {
  "Space" : 32,
  "Escape": 27,
  "Enter" : 13,
  "Return": 13,
  "Up"    : 38,
  "Down"  : 40,
  "Left"  : 37,
  "Right" : 39,

  "Num0"     : 96,
  "Num1"     : 97,
  "Num2"     : 98,
  "Num3"     : 99,
  "Num4"     : 100,
  "Num5"     : 101,
  "Num6"     : 102,
  "Num7"     : 103,
  "Num8"     : 104,
  "Num9"     : 105,
  "Home"     : 36,
  "End"      : 35,
  "Delete"   : 46,
  "Backspace": 8,
  "Insert"   : 45,
  "PageUp"   : 33,
  "PageDown" : 34,
  "Tab"      : 9,
  "-"        : 189,
  "="        : 187,
  "."        : 190,
  "/"        : 191,
  ","        : 188,
  ";"        : 186,
  "'"        : 222,
  "["        : 219,
  "]"        : 221,
  "NumPlus"  : 107,
  "NumMinus" : 109,
  "Shift"    : 16,
  "Ctrl"     : 17,
  "Control"  : 17,
  "Alt"      : 18
}

for (var i = 0; i < 26; i++) {
  keymap_latin_1[String.fromCharCode(i + 65)] = i + 65
}
for (var i = 0; i < 10; i++) {
  keymap_latin_1[String.fromCharCode(i + 48)] = i + 48
}

for (var k in keymap_latin_1) {
  if (!(k in keymap_latin_1)) {
    keymap_latin_1[keymap_latin_1[k]] = k;
  }
}

var keymap_latin_1_rev = {}
for (var k in keymap_latin_1) {
  keymap_latin_1_rev[keymap_latin_1[k]] = k
}

export var keymap = keymap_latin_1;
export var reverse_keymap = keymap_latin_1_rev;

export class HotKey {
  /**action can be a callback or a toolpath string*/
  constructor(key, modifiers, action, uiname) {
    this.action = action;
    this.mods = modifiers;
    this.key = keymap[key];
    this.uiname = uiname;
  }

  exec(ctx) {
    if (typeof this.action == "string") {
      ctx.api.execTool(ctx, this.action);
    } else {
      this.action(ctx);
    }
  }

  buildString() {
    let s = "";

    for (let i = 0; i < this.mods.length; i++) {
      if (i > 0) {
        s += " + ";
      }

      let k = this.mods[i].toLowerCase();
      k = k[0].toUpperCase() + k.slice(1, k.length).toLowerCase();

      s += k;
    }

    if (this.mods.length > 0) {
      s += "+";
    }

    s += reverse_keymap[this.key];

    return s.trim();
  }
}

export class KeyMap extends Array {
  /**
   *
   * @param pathid{string} Id of keymap, used when patching hotkeys, when
   *                       that is implemented
   * */
  constructor(hotkeys = [], pathid = "undefined") {
    super();

    this.pathid = pathid;

    for (let hk of hotkeys) {
      this.add(hk);
    }
  }

  handle(ctx, e) {
    let mods = new util.set();
    if (e.shiftKey)
      mods.add("shift");
    if (e.altKey)
      mods.add("alt");
    if (e.ctrlKey) {
      mods.add("ctrl");
    }
    if (e.commandKey) {
      mods.add("command");
    }

    for (let hk of this) {
      let ok = e.keyCode === hk.key;
      if (!ok) continue;

      let count = 0;
      for (let m of hk.mods) {
        m = m.toLowerCase().trim();

        if (!mods.has(m)) {
          ok = false;
          break;
        }

        count++;
      }

      if (count !== mods.length) {
        ok = false;
      }

      if (ok) {
        try {
          hk.exec(ctx);
        } catch (error) {
          util.print_stack(error);
          console.log("failed to execute a hotkey", keymap[e.keyCode]);
        }
        return true;
      }
    }

    return false;
  }

  add(hk) {
    this.push(hk);
  }

  push(hk) {
    super.push(hk);
  }
}

