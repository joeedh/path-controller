/**
 * Runtime polyfills for path.ux.
 * This is a side-effect-only module — it modifies global prototypes and window properties.
 */

/* Ensure `window` exists in non-browser environments */
if (typeof window === "undefined" && typeof globalThis !== "undefined") {
  (globalThis as unknown as Record<string, unknown>).window = globalThis;
} else if (typeof window === "undefined" && typeof self !== "undefined") {
  (self as unknown as Record<string, unknown>).window = self;
}

/* ── destroyAllCSS: nuke all styles in the DOM ─────────────── */
(function () {
  let visitgen = 0;

  window.destroyAllCSS = function () {
    visitgen++;

    const visit = (n: unknown): void => {
      const node = n as Node & { __visit?: number; tagName?: string; style?: CSSStyleDeclaration };
      if (node.__visit === visitgen) {
        return;
      }

      node.__visit = visitgen;
      if (node.tagName === "STYLE") {
        (node as HTMLElement).textContent = "";
      }

      if (node.style) {
        for (const k in node.style) {
          try {
            (node.style as unknown as Record<string, string>)[k] = "";
          } catch (_error) {
            /* ignore read-only style properties */
          }
        }
      }

      const parent = node as Node;
      if (!parent.childNodes) {
        return;
      }

      for (const c of parent.childNodes) {
        visit(c);
      }
    };

    visit(document.head);
    visit(document.body);

    for (const sheet of document.styleSheets) {
      try {
        const rules = sheet.cssRules;
        if (rules) {
          while (rules.length > 0) {
            sheet.deleteRule(0);
          }
        }
      } catch (_e) {
        /* cross-origin stylesheets may throw */
      }
    }
  };
})();

/* ── Event debug module ────────────────────────────────────── */

interface EventDebugData {
  type?: string;
  event?: unknown;
  cb?: unknown;
  args?: unknown;
  thisvar?: unknown;
  line?: unknown;
  filename?: string;
  filepath?: string;
  ownerpath?: unknown;
}

/** One line of the event trace; `dump()` prints these in order. */
interface EventTraceEntry {
  /** Milliseconds since `start()`. */
  t: number;
  /** "event" when an event first reaches window capture, "listener" when a wrapped
   *  listener runs, "call" for preventDefault / stopPropagation / stopImmediatePropagation,
   *  "dispatch" for a script-side dispatchEvent. */
  kind: "event" | "listener" | "call" | "dispatch";
  type: string;
  phase?: string;
  target?: string;
  currentTarget?: string;
  pointerId?: number;
  pointerType?: string;
  buttons?: number;
  x?: number;
  y?: number;
  defaultPrevented?: boolean;
  /** Where the listener was registered (first stack frame outside this module). */
  listener?: string;
  method?: string;
}

interface EventDebugModule {
  _addEventListener: typeof EventTarget.prototype.addEventListener;
  _removeEventListener: typeof EventTarget.prototype.removeEventListener;
  _dispatchEvent: typeof EventTarget.prototype.dispatchEvent;
  /** Event types the trace follows; edit before `start()` or at runtime. */
  traceTypes: Set<string>;
  trace: EventTraceEntry[];
  start(): void;
  add(type: string, data: EventDebugData): void;
  ondispatch(this: EventTarget, ...args: unknown[]): boolean;
  onadd(this: EventTarget, ...args: unknown[]): void;
  onrem(this: EventTarget, ...args: unknown[]): void;
  pruneConnected(): void;
  clear(): void;
  dump(filter?: string | RegExp): string;
}

window.eventDebugModule = (function (): EventDebugModule {
  "use strict";

  const debugLists = () => window.debugEventLists as Record<string, EventDebugData[]>;

  /* Listener wrappers keyed by callback, then by capture flag, so removeEventListener
   * can find the wrapper that addEventListener installed. */
  const wrappers = new WeakMap<object, Map<boolean, EventListener>>();
  let t0 = 0;
  let uid = 0;

  const describe = (n: unknown): string => {
    if (n === window) {
      return "window";
    }
    if (n === document) {
      return "document";
    }
    if (!(n instanceof Element)) {
      return n === null || n === undefined ? String(n) : Object.prototype.toString.call(n);
    }
    const el = n as Element & { __dbgid?: number };
    if (el.__dbgid === undefined) {
      el.__dbgid = ++uid;
    }
    let s = el.tagName.toLowerCase() + "#" + el.__dbgid;
    if (el.id) {
      s += "[" + el.id + "]";
    }
    if (el.className && typeof el.className === "string") {
      s += "." + el.className.trim().split(/\s+/).join(".");
    }
    const text = (el as HTMLElement).innerText;
    if (text && el.tagName === "LI") {
      s += '"' + text.trim().slice(0, 24) + '"';
    }
    return s;
  };

  const captureFlag = (options: unknown): boolean => {
    if (typeof options === "boolean") {
      return options;
    }
    return !!(options as AddEventListenerOptions | undefined)?.capture;
  };

  // Frames 0-2 are Error, siteOf, and the module method that called it
  const siteOf = (): string => {
    const stack = (new Error().stack ?? "").split("\n").slice(3, 6);
    return stack.map((line) => line.trim().replace(/^at\s+/, "")).join(" < ") || "?";
  };

  const eventFields = (e: Event): Partial<EventTraceEntry> => {
    const ret: Partial<EventTraceEntry> = {
      type            : e.type,
      target          : describe(e.target),
      defaultPrevented: e.defaultPrevented,
    };
    if (e instanceof MouseEvent) {
      ret.buttons = e.buttons;
      ret.x = Math.round(e.clientX);
      ret.y = Math.round(e.clientY);
    }
    if (e instanceof PointerEvent) {
      ret.pointerId = e.pointerId;
      ret.pointerType = e.pointerType;
    }
    return ret;
  };

  const phaseName = (e: Event): string => {
    return ["none", "capture", "target", "bubble"][e.eventPhase] ?? String(e.eventPhase);
  };

  const mod: EventDebugModule = {
    _addEventListener   : EventTarget.prototype.addEventListener,
    _removeEventListener: EventTarget.prototype.removeEventListener,
    _dispatchEvent      : EventTarget.prototype.dispatchEvent,

    traceTypes: new Set([
      "pointerdown",
      "pointerup",
      "pointercancel",
      "gotpointercapture",
      "lostpointercapture",
      "mousedown",
      "mouseup",
      "click",
      "dblclick",
      "contextmenu",
      "touchstart",
      "touchend",
      "touchcancel",
    ]),
    trace     : [],

    start(this: EventDebugModule) {
      window.debugEventLists = {};
      window.debugEventList = this.trace;
      t0 = performance.now();

      this._addEventListener = EventTarget.prototype.addEventListener;
      this._removeEventListener = EventTarget.prototype.removeEventListener;
      this._dispatchEvent = EventTarget.prototype.dispatchEvent;

      EventTarget.prototype.addEventListener = this
        .onadd as unknown as typeof EventTarget.prototype.addEventListener;
      EventTarget.prototype.removeEventListener = this
        .onrem as unknown as typeof EventTarget.prototype.removeEventListener;
      EventTarget.prototype.dispatchEvent = this
        .ondispatch as unknown as typeof EventTarget.prototype.dispatchEvent;

      // Log each event once as it enters window capture, before any listener
      // (this also catches on* handler properties, which never pass through addEventListener)
      for (const type of this.traceTypes) {
        this._addEventListener.call(
          window,
          type,
          (e: Event) => {
            if (!this.traceTypes.has(e.type)) {
              return;
            }
            this.trace.push({
              t   : performance.now() - t0,
              kind: "event",
              ...eventFields(e),
            } as EventTraceEntry);
          },
          { capture: true, passive: true }
        );
      }

      const proto = Event.prototype as unknown as Record<string, (this: Event) => void>;
      for (const method of ["preventDefault", "stopPropagation", "stopImmediatePropagation"]) {
        const orig = proto[method];
        proto[method] = function (this: Event) {
          if (mod.traceTypes.has(this.type)) {
            mod.trace.push({
              t   : performance.now() - t0,
              kind: "call",
              method,
              phase        : phaseName(this),
              currentTarget: describe(this.currentTarget),
              listener     : siteOf(),
              ...eventFields(this),
            } as EventTraceEntry);
          }
          return orig.call(this);
        };
      }
    },

    clear(this: EventDebugModule) {
      this.trace.length = 0;
      t0 = performance.now();
    },

    dump(this: EventDebugModule, filter?: string | RegExp) {
      const lines: string[] = [];
      for (const e of this.trace) {
        let s = e.t.toFixed(1).padStart(8) + " ";
        if (e.kind === "event") {
          s += "== " + e.type;
          s += " id=" + e.pointerId + " " + (e.pointerType ?? "") + " buttons=" + e.buttons;
          s += " at " + e.x + "," + e.y + " target=" + e.target;
          if (e.defaultPrevented) {
            s += " (defaultPrevented)";
          }
        } else if (e.kind === "listener") {
          s += "   -> " + e.phase + " " + e.currentTarget + "  " + e.listener;
        } else if (e.kind === "call") {
          s += "      * " + e.method + " @" + e.currentTarget + "  " + e.listener;
        } else {
          s += "dispatchEvent " + e.type + " on " + e.target;
        }
        if (
          filter === undefined ||
          (typeof filter === "string" ? s.includes(filter) : filter.test(s))
        ) {
          lines.push(s);
        }
      }
      return lines.join("\n");
    },

    add(type: string, data: EventDebugData) {
      const lists = debugLists();
      if (!(type in lists)) {
        lists[type] = [];
      }
      lists[type].push(data);
    },

    ondispatch(this: EventTarget, ...args: unknown[]): boolean {
      const e = args[0] as Event;
      mod.add("Dispatch", {
        event    : e,
        thisvar  : args[4],
        line     : args[5],
        filename : String(args[6]).replace(/\\/g, "/"),
        filepath : location.origin + String(args[6]).replace(/\\/g, "/") + ":" + args[5],
        ownerpath: args[7],
      });
      if (e && mod.traceTypes.has(e.type)) {
        mod.trace.push({
          t       : performance.now() - t0,
          kind    : "dispatch",
          type    : e.type,
          target  : describe(this),
          listener: siteOf(),
        });
      }

      return mod._dispatchEvent.apply(this, args as unknown as [Event]);
    },

    onadd(this: EventTarget, ...args: unknown[]) {
      const [type, cb, options] = args as [
        string,
        EventListenerOrEventListenerObject | null,
        unknown,
      ];
      mod.add("Add", {
        type,
        cb,
        args     : options,
        thisvar  : args[4],
        line     : args[5],
        filename : String(args[6]).replace(/\\/g, "/"),
        filepath : location.origin + String(args[6]).replace(/\\/g, "/") + ":" + args[5],
        ownerpath: args[7],
      });

      if (cb && (typeof cb === "function" || typeof cb === "object")) {
        const capture = captureFlag(options);
        let byCapture = wrappers.get(cb);
        if (!byCapture) {
          byCapture = new Map();
          wrappers.set(cb, byCapture);
        }

        let wrapper = byCapture.get(capture);
        if (!wrapper) {
          const site = siteOf();
          const target = this;
          wrapper = function (this: EventTarget, e: Event) {
            if (mod.traceTypes.has(e.type)) {
              mod.trace.push({
                t            : performance.now() - t0,
                kind         : "listener",
                phase        : phaseName(e),
                currentTarget: describe(target),
                listener     : site,
                ...eventFields(e),
              } as EventTraceEntry);
            }
            if (typeof cb === "function") {
              return cb.call(this, e);
            }
            return cb.handleEvent(e);
          };
          byCapture.set(capture, wrapper);
        }
        args[1] = wrapper;
      }

      mod._addEventListener.apply(
        this,
        args as unknown as Parameters<typeof EventTarget.prototype.addEventListener>
      );
    },

    pruneConnected() {
      const lists = debugLists();
      for (const k in lists) {
        const list = lists[k];
        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          if (!e.thisvar || !(e.thisvar instanceof Node)) {
            continue;
          }
          if (!e.thisvar.isConnected) {
            list[i] = list[list.length - 1];
            list.length--;
            i--;
          }
        }
      }
    },

    onrem(this: EventTarget, ...args: unknown[]) {
      const [type, cb, options] = args as [
        string,
        EventListenerOrEventListenerObject | null,
        unknown,
      ];
      mod.add("Rem", {
        type,
        cb,
        args     : options,
        thisvar  : args[4],
        line     : args[5],
        filename : String(args[6]).replace(/\\/g, "/"),
        filepath : location.origin + String(args[6]).replace(/\\/g, "/") + ":" + args[5],
        ownerpath: args[7],
      });

      if (cb && (typeof cb === "function" || typeof cb === "object")) {
        const wrapper = wrappers.get(cb)?.get(captureFlag(options));
        if (wrapper) {
          args[1] = wrapper;
        }
      }

      mod._removeEventListener.apply(
        this,
        args as unknown as Parameters<typeof EventTarget.prototype.removeEventListener>
      );
    },
  };

  return mod;
})();

if (typeof _debug_event_listeners !== "undefined" && _debug_event_listeners) {
  (window.eventDebugModule as EventDebugModule).start();
}

/* ── Disable all listeners (debug mode) ────────────────────── */
if (window._disable_all_listeners) {
  console.warn("Disabling all event listeners");
  EventTarget.prototype.addEventListener =
    (() => {}) as unknown as typeof EventTarget.prototype.addEventListener;
}

/* ── VisualViewport polyfill ──────────────────────────────── */
if (typeof visualViewport === "undefined") {
  (function () {
    class MyVisualViewport {
      get width(): number {
        return window.innerWidth;
      }
      get height(): number {
        return window.innerHeight;
      }
      get offsetLeft(): number {
        return 0;
      }
      get offsetTop(): number {
        return 0;
      }
      get pageLeft(): number {
        return 0;
      }
      get pageTop(): number {
        return 0;
      }
      get scale(): number {
        return 1.0;
      }
    }
    (window as unknown as Record<string, unknown>).visualViewport = new MyVisualViewport();
  })();
}

/* ── Array.prototype.set polyfill ─────────────────────────── */
if (Array.prototype.set === undefined) {
  Array.prototype.set = function set(
    this: unknown[],
    array: ArrayLike<unknown>,
    srcOffsetOrCount?: number,
    destOrCount?: number,
    countArg?: number
  ): unknown[] {
    if (!array) {
      return this;
    }

    let src: number;
    let dst: number;
    let count: number;

    const argCount = arguments.length;
    if (argCount <= 1) {
      src = 0;
      dst = 0;
      count = array.length;
    } else if (argCount === 2) {
      count = array.length;
      src = srcOffsetOrCount ?? 0;
      dst = 0;
    } else if (argCount === 3) {
      src = srcOffsetOrCount ?? 0;
      count = destOrCount ?? array.length;
      dst = 0;
    } else {
      src = srcOffsetOrCount ?? 0;
      dst = destOrCount ?? 0;
      count = countArg ?? array.length;
    }

    if (count < 0) {
      throw new RangeError("Count must be >= zero");
    }

    const len = Math.min(src + count, array.length) - src;

    if (dst + len > this.length) {
      this.length = dst + len;
    }

    for (let i = 0; i < len; i++) {
      this[dst + i] = array[src + i];
    }

    return this;
  };

  Object.defineProperty(Array.prototype, "set", {
    enumerable  : false,
    configurable: true,
  });
}

/* ── Array.prototype.reject polyfill ──────────────────────── */
if (Array.prototype.reject === undefined) {
  Array.prototype.reject = function reject(
    this: unknown[],
    func: (item: unknown) => boolean
  ): unknown[] {
    return this.filter((item) => !func(item));
  };

  Object.defineProperty(Array.prototype, "reject", {
    enumerable  : false,
    configurable: true,
  });
}

/* ── Symbol.keystr polyfill ──────────────────────────────── */
if ((Symbol as unknown as Record<string, unknown>).keystr === undefined) {
  (Symbol as unknown as Record<string, unknown>).keystr = Symbol("keystr");
}

/* ── Math polyfills ──────────────────────────────────────── */
if (Math.fract === undefined) {
  Math.fract = function fract(f: number): number {
    return f - Math.floor(f);
  };
}

if (Math.tent === undefined) {
  Math.tent = function tent(f: number): number {
    return 1.0 - Math.abs(Math.fract(f) - 0.5) * 2.0;
  };
}

/* ── Array.prototype.pop_i polyfill ──────────────────────── */
if (Array.prototype.pop_i === undefined) {
  Array.prototype.pop_i = function (this: unknown[], idx: number): void {
    if (idx < 0 || idx >= this.length) {
      throw new Error("Index out of range");
    }

    while (idx < this.length - 1) {
      this[idx] = this[idx + 1];
      idx++;
    }

    this.length -= 1;
  };

  Object.defineProperty(Array.prototype, "pop_i", {
    enumerable  : false,
    configurable: true,
  });
}

/* ── Array.prototype.remove polyfill ─────────────────────── */
if (Array.prototype.remove === undefined) {
  Array.prototype.remove = function (
    this: unknown[],
    item: unknown,
    suppressError?: boolean
  ): void {
    const i = this.indexOf(item);

    if (i < 0) {
      if (suppressError) {
        console.trace("Warning: item not in array", item);
      } else {
        throw new Error("Error: item not in array " + item);
      }
      return;
    }

    this.pop_i(i);
  };

  Object.defineProperty(Array.prototype, "remove", {
    enumerable  : false,
    configurable: true,
  });
}

/* ── String.prototype.contains polyfill ──────────────────── */
if ((String.prototype as unknown as Record<string, unknown>).contains === undefined) {
  (String.prototype as unknown as Record<string, unknown>).contains = function (
    this: string,
    substr: string
  ): boolean {
    return this.search(substr) >= 0;
  };
}

/* ── Symbol.keystr implementations on built-in prototypes ── */
(String.prototype as unknown as Record<symbol, () => string>)[Symbol.keystr] = function (
  this: string
): string {
  return this;
};

(Number.prototype as unknown as Record<symbol, () => string>)[Symbol.keystr] = (
  Boolean.prototype as unknown as Record<symbol, () => string>
)[Symbol.keystr] = function (this: number | boolean): string {
  return "" + this;
};

(Array.prototype as unknown as Record<symbol, () => string>)[Symbol.keystr] = function (
  this: unknown[]
): string {
  let key = "";
  for (const item of this) {
    key += (item as Record<symbol, () => string>)[Symbol.keystr]() + ":";
  }
  return key;
};
