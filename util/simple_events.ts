import * as util from "./util.js";
import cconst from "../config/config.js";
import { Vector2 } from "./vectormath.js";
import { ContextLike } from "../controller.js";

declare global {
  // @ts-ignore XXX
  interface Window {
    testSingleMouseUpEvent: (type?: string) => void;
    _findScreen: () => unknown;
    _haveModal: () => boolean;
    _print_evt_debug: boolean;
  }
}

export interface EventHandler {
  (e: Event): void;
  settings?: AddEventListenerOptions;
}

export interface ModalState {
  keys: Set<string>;
  handlers: Record<string, EventHandler>;
  last_mpos: number[];
  pointer?: {
    elem: Element;
    pointerId: number;
    [key: string]: unknown;
  };
}

export const modalstack: ModalState[] = [];
const singleMouseCBs: Record<string, Set<(e: Event) => void>> = {};

function consolelog(..._args: unknown[]): void {
  //  onsole.log(...arguments)
}

function debugDomEvents(): void {
  const cbsymbol = Symbol("event-callback");
  const thsymbol = Symbol("debug-info");

  let idgen = 0;

  function init(et: Record<symbol, number>): void {
    if (!et[thsymbol]) {
      et[thsymbol] = idgen++;
    }
  }

  function getkey(et: Record<symbol, number>, type: string, options: unknown): string {
    init(et);
    return "" + et[thsymbol] + ":" + type + ":" + JSON.stringify(options);
  }

  const addEventListener = EventTarget.prototype.addEventListener;
  const removeEventListener = EventTarget.prototype.removeEventListener;

  EventTarget.prototype.addEventListener = function (
    this: EventTarget & Record<symbol, number>,
    type: string,
    cb: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void {
    init(this as unknown as Record<symbol, number>);

    const cbRec = cb as unknown as Record<symbol, Set<string>>;
    if (!cbRec[cbsymbol]) {
      cbRec[cbsymbol] = new Set();
    }

    const key = getkey(this as unknown as Record<symbol, number>, type, options);
    cbRec[cbsymbol].add(key);

    return addEventListener.call(this, type, cb, options);
  };

  EventTarget.prototype.removeEventListener = function (
    this: EventTarget & Record<symbol, number>,
    type: string,
    cb: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions
  ): void {
    init(this as unknown as Record<symbol, number>);

    const cbRec = cb as unknown as Record<symbol, Set<string>>;
    if (!cbRec[cbsymbol]) {
      console.error("Invalid callback in removeEventListener for", type, this, cb);
      return;
    }

    const key = getkey(this as unknown as Record<symbol, number>, type, options);

    if (!cbRec[cbsymbol].has(key)) {
      console.error("Callback not in removeEventListener;", type, this, cb);
      return;
    }

    cbRec[cbsymbol].delete(key);

    return removeEventListener.call(this, type, cb, options);
  };
}

interface SingletonMouseEventsResult {
  singleMouseEvent(cb: (e: Event) => void, type: string): void;
}

let singletonMouseEventsResult: SingletonMouseEventsResult | undefined;

function singletonMouseEventsInit(): SingletonMouseEventsResult | undefined {
  if (typeof document === "undefined") {
    // inside a worker?
    return;
  }

  const keys = ["mousedown", "mouseup", "mousemove"];
  for (const k of keys) {
    singleMouseCBs[k] = new Set();
  }

  let ddd = -1.0;
  window.testSingleMouseUpEvent = (type = "mousedown") => {
    const id = ddd++;
    singleMouseEvent(() => {
      console.log("mouse event", id);
    }, type);
  };

  const _mpos = new Vector2(undefined as unknown as number[]);

  function doSingleCbs(e: Event, type: string): void {
    const list = singleMouseCBs[type];
    singleMouseCBs[type] = new Set();

    const ev = e as unknown as Record<string, unknown>;

    if (ev.type !== "touchend" && ev.type !== "touchcancel") {
      const touches = ev.touches as TouchList | undefined;
      _mpos[0] = (touches && touches.length > 0 ? touches[0].pageX : (ev.x as number)) as number;
      _mpos[1] = (touches && touches.length > 0 ? touches[0].pageY : (ev.y as number)) as number;
    }

    const touches = ev.touches as TouchList | undefined;
    if (touches) {
      const ev2 = copyEvent(e) as Record<string, unknown>;

      ev2.type = type;
      if (touches.length > 0) {
        ev2.x = ev2.pageX = touches[0].pageX;
        ev2.y = ev2.pageY = touches[0].pageY;
      } else {
        ev2.x = _mpos[0];
        ev2.y = _mpos[1];
      }

      e = ev2 as unknown as Event;
    }

    for (const cb of list) {
      try {
        cb(e);
      } catch (error) {
        util.print_stack(error as Error);
        console.warn("Error in event callback");
      }
    }
  }

  window.addEventListener(
    "mouseup",
    (e) => {
      doSingleCbs(e, "mouseup");
    },
    { capture: true }
  );
  window.addEventListener(
    "touchcancel",
    (e) => {
      doSingleCbs(e, "mouseup");
    },
    { capture: true }
  );
  document.addEventListener(
    "touchend",
    (e) => {
      doSingleCbs(e, "mouseup");
    },
    { capture: true }
  );

  document.addEventListener(
    "mousedown",
    (e) => {
      doSingleCbs(e, "mousedown");
    },
    { capture: true }
  );
  document.addEventListener(
    "touchstart",
    (e) => {
      doSingleCbs(e, "mousedown");
    },
    { capture: true }
  );

  document.addEventListener(
    "mousemove",
    (e) => {
      doSingleCbs(e, "mousemove");
    },
    { capture: true }
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      doSingleCbs(e, "mousemove");
    },
    { capture: true }
  );

  return {
    singleMouseEvent(cb: (e: Event) => void, type: string): void {
      if (!(type in singleMouseCBs)) {
        throw new Error("not a mouse event");
      }

      singleMouseCBs[type].add(cb);
    },
  };
}

singletonMouseEventsResult = singletonMouseEventsInit();

/**
 * adds a mouse event callback that only gets called once
 * */
export function singleMouseEvent(cb: (e: Event) => void, type: string): void {
  return singletonMouseEventsResult!.singleMouseEvent(cb, type);
}

/*tests if either the left mouse button is down,
 * or a touch event has happened and e.touches.length == 1*/
export function isLeftClick(e: Record<string, unknown>): boolean {
  if ((e as Record<string, unknown>).touches !== undefined) {
    return ((e as Record<string, unknown>).touches as TouchList).length === 1;
  }

  return (e as Record<string, unknown>).button === 0;
}

export class DoubleClickHandler {
  down: number;
  last: number;
  up: number;
  dblEvent: any | undefined;
  mdown: boolean;
  start_mpos: InstanceType<typeof Vector2>;

  _on_mouseup: (e: Event) => void;
  _on_mousemove: (e: Event) => void;

  constructor() {
    this.down = 0;
    this.last = 0;
    this.up = 0;
    this.dblEvent = undefined;
    this.mdown = false;

    this.start_mpos = new Vector2(undefined as unknown as number[]);

    this._on_mouseup = this._on_mouseup_impl.bind(this);
    this._on_mousemove = this._on_mousemove_impl.bind(this);
  }

  _on_mouseup_impl(_e: Event): void {
    //console.log("mup", e);
    this.mdown = false;
  }

  _on_mousemove_impl(e: Event): void {
    const ev = e as unknown as Record<string, unknown>;
    const mpos = new Vector2(undefined as unknown as number[]);
    mpos[0] = ev.x as number;
    mpos[1] = ev.y as number;

    const dist = mpos.vectorDistance!(this.start_mpos) * devicePixelRatio;

    if (dist > 11) {
      //console.log("cancel", dist);
      this.mdown = false;
    }

    if (this.mdown) {
      singleMouseEvent(this._on_mousemove, "mousemove");
    }

    this.update();
  }

  mousedown(e: MouseEvent): void {
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

      const cpy = Object.assign({}, e) as any;

      this.start_mpos[0] = e.x as number;
      this.start_mpos[1] = e.y as number;

      singleMouseEvent(this._on_mousemove, "mousemove");

      if ((e.type as string).search("touch") >= 0 && e instanceof TouchEvent && (e.touches as TouchList).length > 0) {
        cpy.x = cpy.pageX = (e.touches as TouchList)[0].pageX;
        cpy.y = cpy.pageY = (e.touches as TouchList)[1].pageY;
      } else {
        cpy.x = cpy.pageX = e.x;
        cpy.y = cpy.pageY = e.y;
      }

      //stupid real MouseEvent class zeros .x/.y
      //continue using hackish copyEvent for now...

      this.dblEvent = copyEvent(e as unknown as Event);
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
  ondblclick(_e: Record<string, unknown>): void {}

  update(): void {
    if (modalstack.length > 0) {
      //cancel double click requests
      this.mdown = false;
    }

    if (this.mdown && util.time_ms() - this.down > cconst.doubleClickHoldTime) {
      this.mdown = false;
      this.ondblclick(this.dblEvent!);
    }
  }

  abort(): void {
    this.last = this.down = 0;
  }
}

export function isMouseDown(e: MouseEvent | PointerEvent | TouchEvent): boolean {
  return eventWasMouseDown(e);
}

export function pathDebugEvent(event: Event, extra?: unknown): void {
  const e = { ...event } as any;

  e.__prevdef = e.preventDefault;
  e.__stopprop = e.stopPropagation;

  e.preventDefault = function (this: Record<string, unknown>) {
    console.warn("preventDefault", extra);
    return (this.__prevdef as Function).call(this);
  };

  e.stopPropagation = function (this: Record<string, unknown>) {
    console.warn("stopPropagation", extra);
    return (this.__stopprop as Function).call(this);
  };
}

export function eventWasMouseDown(e: PointerEvent | MouseEvent | TouchEvent, button: number = 0): boolean {
  if (e instanceof MouseEvent && !(e instanceof PointerEvent)) {
    return e.buttons === 1 << button;
  }
  if (e instanceof TouchEvent) {
    return e.touches && e.touches.length > 0;
  }

  let mdown = false;
  switch (e.pointerType) {
    case "touch":
      mdown = (e as unknown as Record<string, unknown>).persistentDeviceId === 0 && !!(e.buttons & (1 << button));
      break;
    case "pen":
      mdown = !!(e.buttons & (1 << button));
      break;
    case "mouse":
      mdown = e.buttons === 1 << button;
      break;
  }
  return mdown;
}

/** Returns true if event came from a touchscreen or pen device */
export function eventWasTouch(e: MouseEvent): boolean {
  const ev = e as any;
  let ret: unknown = (ev.sourceCapabilities as any)?.firesTouchEvents;
  ret = ret || ev.was_touch;
  ret = ret || e instanceof TouchEvent;
  ret = ret || ev.touches !== undefined;

  if (e instanceof PointerEvent) {
    ret = ret || e.pointerType === "pen" || e.pointerType === "touch";
  }

  return !!ret;
}

export function copyEvent(e: Event): any {
  const ret: Record<string | symbol, unknown> = {};
  let keys: (string | symbol)[] = [];

  for (const k in e) {
    keys.push(k);
  }

  keys = keys.concat(Object.getOwnPropertySymbols(e));
  keys = keys.concat(Object.getOwnPropertyNames(e));

  for (const k of keys) {
    let v: unknown;

    try {
      v = e[k as keyof typeof e];
    } catch (error) {
      console.warn("read error for event key", k);
      continue;
    }

    if (typeof v == "function") {
      ret[k] = (v as Function).bind(e);
    } else {
      ret[k] = v;
    }
  }

  ret.original = e;

  return ret as Record<string, unknown>;
}

/* Late-bound class references for screen/modal area */
let Screen: (new (...args: unknown[]) => HTMLElement) | undefined;

export function _setScreenClass(cls: any): void {
  Screen = cls;
}

function findScreen(): Record<string, unknown> | undefined {
  const rec = (n: Node): Record<string, unknown> | undefined => {
    for (let i = 0; i < n.childNodes.length; i++) {
      const n2 = n.childNodes[i];
      if (n2 && typeof n2 === "object" && Screen && n2 instanceof Screen) {
        return n2 as unknown as Record<string, unknown>;
      }
    }

    for (let i = 0; i < n.childNodes.length; i++) {
      const n2 = n.childNodes[i];
      const ret = rec(n2);
      if (ret) {
        return ret;
      }
    }

    return undefined;
  };

  return rec(document.body);
}

window._findScreen = findScreen;

let ContextAreaClass: { lock(): void; unlock(): void } | undefined;

export function _setModalAreaClass(cls: { lock(): void; unlock(): void }): void {
  ContextAreaClass = cls;
}

export function pushPointerModal(
  obj: Record<string, unknown>,
  elem?: Element,
  pointerId?: number,
  autoStopPropagation = true
): ModalState {
  return pushModalLight(obj, autoStopPropagation, elem, pointerId);
}

export function pushModalLight(
  obj: Record<string, unknown>,
  autoStopPropagation: boolean = true,
  elem?: Element,
  pointerId?: number
): ModalState {
  let keys: Set<string>;

  if (pointerId === undefined) {
    keys = new Set([
      "keydown",
      "keyup",
      "mousedown",
      "mouseup",
      "touchstart",
      "touchend",
      "touchcancel",
      "mousewheel",
      "mousemove",
      "mouseover",
      "mouseout",
      "mouseenter",
      "mouseleave",
      "dragstart",
      "drag",
      "dragend",
      "dragexit",
      "dragleave",
      "dragover",
      "dragenter",
      "drop",
      "pointerdown",
      "pointermove",
      "pointerup",
      "pointercancel",
      "pointerstart",
      "pointerend",
      "pointerleave",
      "pointerexit",
      "pointerenter",
      "pointerover",
    ]);
  } else {
    keys = new Set(["keydown", "keyup", "keypress", "mousewheel"]);
  }

  const ret: ModalState = {
    keys,
    handlers : {},
    last_mpos: [0, 0],
  };

  const touchmap: Record<string, string> = {
    touchstart : "mousedown",
    touchmove  : "mousemove",
    touchend   : "mouseup",
    touchcancel: "mouseup",
  };

  const mpos = [0, 0];

  let screen = findScreen();
  if (screen) {
    mpos[0] = (screen.mpos as number[])[0];
    mpos[1] = (screen.mpos as number[])[1];
    screen = undefined;
  }

  function handleAreaContext(): void {
    const screen = findScreen();
    if (screen) {
      const sarea = (screen.findScreenArea as Function)(mpos[0], mpos[1]) as Record<string, unknown> | undefined;
      if (sarea?.area) {
        const area = sarea.area as Record<string, Function>;
        area.push_ctx_active();
        area.pop_ctx_active();
      }
    }
  }

  function make_default_touchhandler(type: string, _state: ModalState): EventHandler {
    return function (e: Event): void {
      if (cconst.DEBUG.domEvents) {
        pathDebugEvent(e);
      }

      if (touchmap[type] in ret.handlers) {
        const type2 = touchmap[type];

        const e2 = copyEvent(e);

        e2.was_touch = true;
        e2.type = type2;
        e2.button = type == "touchcancel" ? 1 : 0;
        e2.touches = (e as TouchEvent).touches;

        if ((e as TouchEvent).touches.length > 0) {
          const t = (e as TouchEvent).touches[0];

          mpos[0] = t.pageX;
          mpos[1] = t.pageY;

          e2.pageX = e2.x = t.pageX;
          e2.pageY = e2.y = t.pageY;
          e2.clientX = t.clientX;
          e2.clientY = t.clientY;
          e2.x = t.clientX;
          e2.y = t.clientY;

          ret.last_mpos[0] = e2.x as number;
          ret.last_mpos[1] = e2.y as number;
        } else {
          e2.x = e2.clientX = e2.pageX = e2.screenX = ret.last_mpos[0];
          e2.y = e2.clientY = e2.pageY = e2.screenY = ret.last_mpos[1];
        }

        e2.was_touch = true;

        handleAreaContext();
        //console.log(e2.x, e2.y);
        ret.handlers[type2](e2 as unknown as Event);
      }

      if (autoStopPropagation) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
  }

  function make_handler(_type: string, key: string | undefined): EventHandler {
    return function (e: Event): void {
      if (cconst.DEBUG.domEvents) {
        pathDebugEvent(e);
      }

      if (typeof key !== "string") {
        //console.warn("key was undefined", key, type);
        return;
      }

      if (key.startsWith("mouse")) {
        mpos[0] = (e as MouseEvent).pageX;
        mpos[1] = (e as MouseEvent).pageY;
      } else if (key.startsWith("pointer")) {
        mpos[0] = (e as PointerEvent).x;
        mpos[1] = (e as PointerEvent).y;
      }

      handleAreaContext();

      if (key !== undefined) (obj[key] as Function)(e);

      if (autoStopPropagation) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
  }

  const found: Record<string, number> = {};

  for (const k of keys) {
    let key: string | undefined;

    if (obj[k]) key = k;
    else if (obj["on" + k]) key = "on" + k;
    else if (obj["on_" + k]) key = "on_" + k;
    else if (k in touchmap)
      continue; //default touch event handlers will be done seperately
    else key = undefined; //make handler that still blocks events

    //check we don't override other mouse pointer event handlers
    if (key === undefined && k.search("pointer") === 0) {
      continue;
    }

    if (key !== undefined) {
      found[k] = 1;
    }

    const handler: EventHandler = make_handler(k, key);
    ret.handlers[k] = handler;

    const settings: AddEventListenerOptions = (handler.settings = { passive: false, capture: true });
    window.addEventListener(k, handler, settings);
  }

  for (const k in touchmap) {
    if (!(k in found)) {
      //console.log("making touch handler for", '"' + k + '"', ret.handlers[k]);

      ret.handlers[k] = make_default_touchhandler(k, ret);

      const settings: AddEventListenerOptions = (ret.handlers[k].settings = { passive: false, capture: true });
      window.addEventListener(k, ret.handlers[k], settings);
    }
  }

  if (pointerId !== undefined && elem) {
    ret.pointer = {
      elem,
      pointerId,
    };

    function make_pointer(k: string): void {
      const k2 = "on_" + k;

      ret.pointer![k] = function (e: Event): void {
        if (obj[k2] !== undefined) {
          (obj[k2] as Function)(e);
        }

        if (autoStopPropagation) {
          e.stopPropagation();
          e.preventDefault();
        }
      };
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

    for (const k in ret.pointer) {
      if (k !== "elem" && k !== "pointerId") {
        elem.addEventListener(k, ret.pointer[k] as EventListener);
      }
    }

    try {
      elem.setPointerCapture(pointerId);
    } catch (error) {
      util.print_stack(error as Error);

      consolelog("attempting fallback");

      for (const k in ret.pointer) {
        if (k !== "elem" && k !== "pointerId") {
          elem.removeEventListener(k, ret.pointer[k] as EventListener);
        }
      }

      delete ret.pointer;

      modalstack.push(ret);
      popModalLight(ret);

      for (const k in obj) {
        if (k === "pointercancel" || k === "pointerend" || k === "pointerstart") {
          continue;
        }

        if (k.startsWith("pointer")) {
          const k2 = k.replace(/pointer/, "mouse");
          if (k2 in obj) {
            console.warn("warning, existing mouse handler", k2);
            continue;
          }

          const v = obj[k];
          obj[k] = undefined;

          obj[k2] = v;
        }
      }

      return pushModalLight(obj, autoStopPropagation);
    }
  }

  modalstack.push(ret);
  ContextAreaClass!.lock();

  if (cconst.DEBUG.modalEvents) {
    console.warn("pushModalLight", ret.pointer ? "(pointer events)" : "");
  }

  return ret;
}

export function popModalLight(state: ModalState | undefined): void {
  if (state === undefined) {
    console.warn("Bad call to popModalLight: state was undefined");
    return;
  }

  if (state !== modalstack[modalstack.length - 1]) {
    if (!modalstack.includes(state)) {
      console.warn("Error in popModalLight; modal handler not found");
      return;
    } else {
      console.warn("Error in popModalLight; called in wrong order");
    }
  }

  for (const k in state.handlers) {
    //console.log(k);
    window.removeEventListener(k, state.handlers[k], state.handlers[k].settings);
  }

  state.handlers = {};
  (modalstack as unknown as { remove(item: ModalState): void }).remove(state);
  ContextAreaClass!.unlock();

  if (cconst.DEBUG.modalEvents) {
    console.warn("popModalLight", modalstack, state.pointer ? "(pointer events)" : "");
  }

  if (state.pointer) {
    const elem = state.pointer.elem;

    try {
      elem.releasePointerCapture(state.pointer.pointerId);
    } catch (error) {
      util.print_stack(error as Error);
    }

    for (const k in state.pointer) {
      if (k !== "elem" && k !== "pointerId") {
        elem.removeEventListener(k, state.pointer[k] as EventListener);
      }
    }
  }
}

export function haveModal(): boolean {
  return modalstack.length > 0;
}

window._haveModal = haveModal; //for debugging console

export var keymap_latin_1: Record<string, number> = {
  Space : 32,
  Escape: 27,
  Enter : 13,
  Return: 13,
  Up    : 38,
  Down  : 40,
  Left  : 37,
  Right : 39,

  Num0     : 96,
  Num1     : 97,
  Num2     : 98,
  Num3     : 99,
  Num4     : 100,
  Num5     : 101,
  Num6     : 102,
  Num7     : 103,
  Num8     : 104,
  Num9     : 105,
  Home     : 36,
  End      : 35,
  Delete   : 46,
  Backspace: 8,
  Insert   : 45,
  PageUp   : 33,
  PageDown : 34,
  Tab      : 9,
  "-"      : 189,
  "="      : 187,
  "."      : 190,
  "/"      : 191,
  ","      : 188,
  ";"      : 186,
  "'"      : 222,
  "["      : 219,
  "]"      : 221,
  NumPlus  : 107,
  NumMinus : 109,
  Shift    : 16,
  Ctrl     : 17,
  Control  : 17,
  Alt      : 18,
};

for (var i = 0; i < 26; i++) {
  keymap_latin_1[String.fromCharCode(i + 65)] = i + 65;
}
for (var i = 0; i < 10; i++) {
  keymap_latin_1[String.fromCharCode(i + 48)] = i + 48;
}

for (var k in keymap_latin_1) {
  if (!(k in keymap_latin_1)) {
    keymap_latin_1[keymap_latin_1[k]] = k as unknown as number;
  }
}

const keymap_latin_1_rev: Record<number, string> = {};
for (var k in keymap_latin_1) {
  keymap_latin_1_rev[keymap_latin_1[k]] = k;
}

export var keymap: Record<string, number> = keymap_latin_1;
export var reverse_keymap: Record<number, string> = keymap_latin_1_rev;

export class HotKey {
  action: string | ((ctx: ContextLike) => void);
  mods: string[];
  key: number;
  uiname: string | undefined;

  /**action can be a callback or a toolpath string*/
  constructor(key: string, modifiers: string[], action: string | ((ctx: ContextLike) => void), uiname?: string) {
    this.action = action;
    this.mods = modifiers;
    this.key = keymap[key];
    this.uiname = uiname;
  }

  exec(ctx: ContextLike): void {
    if (typeof this.action == "string") {
      ctx.api.execTool(ctx, this.action);
    } else {
      this.action(ctx);
    }
  }

  buildString(): string {
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

export class KeyMap<CTX extends ContextLike = ContextLike> extends Array<HotKey> {
  pathid: string;

  /**
   *
   * @param hotkeys
   * @param pathid Id of keymap, used when patching hotkeys, when
   *                       that is implemented
   * */
  constructor(hotkeys: HotKey[] = [], pathid: string = "undefined") {
    super();

    this.pathid = pathid;

    for (const hk of hotkeys) {
      this.add(hk);
    }
  }

  handle(ctx: CTX, e: KeyboardEvent): boolean {
    const mods = new Set<string>();
    if (e.shiftKey) mods.add("shift");
    if (e.altKey) mods.add("alt");
    if (e.ctrlKey) {
      mods.add("ctrl");
    }
    if (e.metaKey) {
      mods.add("meta");
      mods.add("command");
    }

    for (const hk of this) {
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

      if (count !== mods.size) {
        ok = false;
      }

      if (ok) {
        try {
          hk.exec(ctx);
        } catch (error) {
          util.print_stack(error as Error);
          console.log("failed to execute a hotkey", keymap[e.keyCode]);
        }
        return true;
      }
    }

    return false;
  }

  add(hk: HotKey): void {
    this.push(hk);
  }

  push(hk: HotKey): number {
    return super.push(hk);
  }
}
