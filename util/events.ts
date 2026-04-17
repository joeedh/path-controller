"use strict";

import * as simple_events from "./simple_events";

export { keymap, reverse_keymap, keymap_latin_1 } from "./simple_events";

type EventCallback = (data: { stopPropagation(): void; data: unknown }) => void;

export class EventDispatcher {
  _cbs: Record<string, EventCallback[]>;

  constructor() {
    this._cbs = {};
  }

  _fireEvent(type: string, data: unknown): void {
    let stop = false;

    const wrapped = {
      stopPropagation() {
        stop = true;
      },

      data: data,
    };

    if (type in this._cbs) {
      for (const cb of this._cbs[type]) {
        cb(wrapped);
        if (stop) {
          break;
        }
      }
    }
  }

  on(type: string, cb: EventCallback): this {
    if (!(type in this._cbs)) {
      this._cbs[type] = [];
    }

    this._cbs[type].push(cb);
    return this;
  }

  off(type: string, cb: EventCallback): this {
    if (!(type in this._cbs)) {
      console.warn("event handler not in list", type, cb);
      return this;
    }

    const stack = this._cbs[type];
    if (stack.indexOf(cb) < 0) {
      console.warn("event handler not in list", type, cb);
      return this;
    }

    stack.remove(cb);
    return this;
  }
}

export function copyMouseEvent(e: MouseEvent | TouchEvent): Record<string, unknown> {
  const ret: Record<string, unknown> = {};

  function bind(func: Function): Function {
    return function (this: Record<string, unknown>, ...args: unknown[]) {
      return (ret._orig as Function).apply(func, args);
    };
  }

  const exclude = new Set(["__proto__"]);

  ret._orig = e;

  for (const k in e) {
    let v = (e as unknown as Record<string, unknown>)[k];

    if (exclude.has(k)) {
      continue;
    }

    if (typeof v === "function") {
      v = bind(v as Function);
    }

    ret[k] = v;
  }

  ret.ctrlKey = (e as MouseEvent).ctrlKey;
  ret.shiftKey = (e as MouseEvent).shiftKey;
  ret.altKey = (e as MouseEvent).altKey;

  for (let i = 0; i < 2; i++) {
    const key = i ? "targetTouches" : "touches";

    if ((e as unknown as Record<string, unknown>)[key]) {
      ret[key] = [];

      for (const t of (e as unknown as Record<string, TouchList>)[key]) {
        const t2: Record<string, unknown> = {};
        (ret[key] as Record<string, unknown>[]).push(t2);

        for (const k in t) {
          t2[k] = (t as unknown as Record<string, unknown>)[k];
        }
      }
    }
  }

  return ret;
}

export const DomEventTypes = {
  on_mousemove    : "mousemove",
  on_mousedown    : "mousedown",
  on_mouseup      : "mouseup",
  on_touchstart   : "touchstart",
  on_touchcancel  : "touchcanel",
  on_touchmove    : "touchmove",
  on_touchend     : "touchend",
  on_mousewheel   : "mousewheel",
  on_keydown      : "keydown",
  on_keyup        : "keyup",
  on_pointerdown  : "pointerdown",
  on_pointermove  : "pointermove",
  on_pointercancel: "pointercancel",
  on_pointerup    : "pointerup",
} as const;

function getDom(dom: EventTarget, eventtype: string): EventTarget {
  if (eventtype.startsWith("key")) return window;
  return dom;
}

export const modalStack: unknown[] = [];
export function isModalHead(owner: unknown): boolean {
  return modalStack.length === 0 || modalStack[modalStack.length - 1] === owner;
}

export class EventHandler {
  _modalstate: unknown;

  constructor() {
    this._modalstate = undefined;
  }

  pushPointerModal(dom: EventTarget, pointerId: number): void {
    if (this._modalstate) {
      console.warn("pushPointerModal called twiced!");
      return;
    }

    this._modalstate = simple_events.pushPointerModal(
      this as unknown as Record<string, unknown>,
      dom as unknown as Element,
      pointerId
    );
  }

  pushModal(_dom?: EventTarget, _is_root?: boolean): void {
    if (this._modalstate) {
      console.warn("pushModal called twiced!");
      return;
    }

    this._modalstate = simple_events.pushModalLight(this as unknown as Record<string, unknown>);
  }

  popModal(): void {
    if (this._modalstate !== undefined) {
      const modalstate = this._modalstate;
      simple_events.popModalLight(
        modalstate as unknown as Parameters<typeof simple_events.popModalLight>[0]
      );
      this._modalstate = undefined;
    }
  }
}

export function pushModal(
  dom: EventTarget,
  handlers: Record<string, unknown> & { popModal?: () => void }
): EventHandler {
  console.warn("Deprecated call to pathux.events.pushModal; use api in simple_events.js instead");
  const h = new EventHandler();

  for (const k in handlers) {
    (h as unknown as Record<string, unknown>)[k] = handlers[k];
  }

  handlers.popModal = () => {
    return h.popModal();
  };

  h.pushModal(dom, false);

  return h;
}
