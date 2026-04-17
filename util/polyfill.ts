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

interface EventDebugModule {
  _addEventListener: typeof EventTarget.prototype.addEventListener;
  _removeEventListener: typeof EventTarget.prototype.removeEventListener;
  _dispatchEvent: typeof EventTarget.prototype.dispatchEvent;
  start(): void;
  add(type: string, data: EventDebugData): void;
  ondispatch(this: EventTarget, ...args: unknown[]): boolean;
  onadd(this: EventTarget, ...args: unknown[]): void;
  onrem(this: EventTarget, ...args: unknown[]): void;
  pruneConnected(): void;
}

window.eventDebugModule = (function (): EventDebugModule {
  "use strict";

  const debugLists = () => window.debugEventLists as Record<string, EventDebugData[]>;

  return {
    _addEventListener   : EventTarget.prototype.addEventListener,
    _removeEventListener: EventTarget.prototype.removeEventListener,
    _dispatchEvent      : EventTarget.prototype.dispatchEvent,

    start(this: EventDebugModule) {
      window.debugEventLists = {};
      window.debugEventList = [];

      this._addEventListener = EventTarget.prototype.addEventListener;
      this._removeEventListener = EventTarget.prototype.removeEventListener;
      this._dispatchEvent = EventTarget.prototype.dispatchEvent;

      EventTarget.prototype.addEventListener = this
        .onadd as unknown as typeof EventTarget.prototype.addEventListener;
      EventTarget.prototype.removeEventListener = this
        .onrem as unknown as typeof EventTarget.prototype.removeEventListener;
      EventTarget.prototype.dispatchEvent = this
        .ondispatch as unknown as typeof EventTarget.prototype.dispatchEvent;
    },

    add(type: string, data: EventDebugData) {
      const lists = debugLists();
      if (!(type in lists)) {
        lists[type] = [];
      }
      lists[type].push(data);
    },

    ondispatch(this: EventTarget, ...args: unknown[]): boolean {
      const mod = window.eventDebugModule as EventDebugModule;
      mod.add("Dispatch", {
        event    : args[0],
        thisvar  : args[4],
        line     : args[5],
        filename : String(args[6]).replace(/\\/g, "/"),
        filepath : location.origin + String(args[6]).replace(/\\/g, "/") + ":" + args[5],
        ownerpath: args[7],
      });

      return mod._dispatchEvent.apply(this, args as unknown as [Event]);
    },

    onadd(this: EventTarget, ...args: unknown[]) {
      const mod = window.eventDebugModule as EventDebugModule;
      mod.add("Add", {
        type     : args[0] as string,
        cb       : args[1],
        args     : args[2],
        thisvar  : args[4],
        line     : args[5],
        filename : String(args[6]).replace(/\\/g, "/"),
        filepath : location.origin + String(args[6]).replace(/\\/g, "/") + ":" + args[5],
        ownerpath: args[7],
      });

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
      const mod = window.eventDebugModule as EventDebugModule;
      mod.add("Rem", {
        type     : args[0] as string,
        cb       : args[1],
        args     : args[2],
        thisvar  : args[4],
        line     : args[5],
        filename : String(args[6]).replace(/\\/g, "/"),
        filepath : location.origin + String(args[6]).replace(/\\/g, "/") + ":" + args[5],
        ownerpath: args[7],
      });

      mod._removeEventListener.apply(
        this,
        args as unknown as Parameters<typeof EventTarget.prototype.removeEventListener>
      );
    },
  };
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
