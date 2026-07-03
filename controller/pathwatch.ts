/**
 * Datapath change-notification runtime.
 *
 * Owns the subscription registry (path string → weak watcher refs), the
 * rAF-coalesced dirty flush, the coarse structural epoch counter, and
 * {@link DataPathWatcher} — the single home for datapath change detection
 * (read + snapshot + prop-aware compare + resolved/undefined handling).
 *
 * Widgets never hold model instances: subscriptions key on the normalized
 * path string, and the registry holds only strings plus `WeakRef`s to
 * watchers, so no model object is ever retained here.
 *
 * Write side: `ModelInterface.setValue` (and everything funneling through it —
 * `DataPathSetOp`, mass-set, undo/redo) emits {@link notifyPathChange}. Raw
 * `obj.foo = …` mutations remain invisible; those are covered by poll mode
 * (`DataPathWatcher.tick`) and the structural epoch.
 */
import type { ContextLike, ModelInterface } from "./controller_abstract";
import type { ToolPropertyTypes } from "../toolsys";

/**
 * How a watcher schedules its change callback:
 *  - `"raf"` (default): coalesced onto the shared flush, one callback per
 *    animation frame no matter how many notifications arrived.
 *  - `"immediate"`: fires synchronously inside `notifyChange` (no coalescing).
 *  - `{ trailing: ms }`: trailing-edge debounce for heavy widgets (curve,
 *    colorpicker); the timer restarts on every new notification.
 */
export type PathDebounce = "raf" | "immediate" | { trailing: number };

export interface DataPathWatcherOpts {
  debounce?: PathDebounce;
}

export interface PathWatchInfo {
  /** false when the path failed to resolve (read as `undefined`). */
  resolved: boolean;
  path: string;
  /** the resolved leaf ToolProperty, when the path has one. */
  prop: ToolPropertyTypes | undefined;
  /** whether this callback came from a push notification or a poll tick. */
  source: "push" | "poll";
}

export type PathWatchCallback = (value: unknown, info: PathWatchInfo) => void;

/* The registry itself is heterogeneous over context types; `any` here is the
 * variance boundary, watchers are re-typed at their creation sites. */
type AnyWatcher = DataPathWatcher<any>;

/*
 * Flat maps keyed by normalized path string / leaf prop apiname.
 * TODO(trie): upgrade the path index to a segment trie for targeted subtree
 * invalidation instead of the linear overlap scan in notifyPathChange.
 */
const pathSubs = new Map<string, Set<WeakRef<AnyWatcher>>>();
const propSubs = new Map<string, Set<WeakRef<AnyWatcher>>>();

/** Watchers awaiting the next flush. Strong refs, but only transiently. */
const dirty = new Set<AnyWatcher>();
let flushScheduled = false;

/**
 * Coarse structural epoch: bumped on tree-shape changes (active-object switch,
 * list insert/remove, context swap). Watchers cache the generation and
 * re-resolve their path metadata on mismatch.
 */
let structureGen = 1;

export function getPathStructureGen(): number {
  return structureGen;
}

export function bumpPathStructureGen(): void {
  structureGen++;
}

/** Registration record shared with the FinalizationRegistry; mutated in place
 * when a watcher re-files itself, so the finalizer always sees current keys. */
interface RegRecord {
  pathKey: string | undefined;
  propKey: string | undefined;
  ref: WeakRef<AnyWatcher>;
}

function addRef(map: Map<string, Set<WeakRef<AnyWatcher>>>, key: string, ref: WeakRef<AnyWatcher>) {
  let set = map.get(key);
  if (!set) {
    set = new Set();
    map.set(key, set);
  }
  set.add(ref);
}

function dropRef(
  map: Map<string, Set<WeakRef<AnyWatcher>>>,
  key: string | undefined,
  ref: WeakRef<AnyWatcher>
) {
  if (key === undefined) return;

  const set = map.get(key);
  if (!set) return;

  set.delete(ref);
  if (set.size === 0) {
    map.delete(key);
  }
}

/** Prunes registry entries for watchers that were GC'd without remove(). */
const finalizer =
  typeof FinalizationRegistry !== "undefined"
    ? new FinalizationRegistry<RegRecord>((rec) => {
        dropRef(pathSubs, rec.pathKey, rec.ref);
        dropRef(propSubs, rec.propKey, rec.ref);
      })
    : undefined;

export function normalizePath(path: string): string {
  path = path.trim();
  if (path.startsWith("/")) {
    path = path.slice(1);
  }
  return path;
}

/** True when one path lies on the other's subtree (`a.b` overlaps `a.b.c` and
 * `a.b[0]`, but not `a.bc`). */
function pathsOverlap(a: string, b: string): boolean {
  if (a === b) return true;

  if (a.length < b.length) {
    const t = a;
    a = b;
    b = t;
  }

  if (!a.startsWith(b)) return false;

  const c = a[b.length];
  return c === "." || c === "[";
}

function markSet(set: Set<WeakRef<AnyWatcher>> | undefined): void {
  if (!set) return;

  /* copy: an "immediate" callback may re-file or remove watchers mid-walk */
  for (const ref of [...set]) {
    const w = ref.deref();
    if (!w) {
      set.delete(ref);
      continue;
    }
    w.markDirty();
  }
}

/**
 * Low-level change signal (the real implementation behind
 * `DataAPI.notifyChange`).
 *
 *  - `notifyPathChange(path)`: wakes watchers whose path overlaps `path`
 *    (ancestors and descendants included).
 *  - `notifyPathChange(undefined, prop)`: type-scoped wake — wakes watchers
 *    whose resolved leaf apiname is `prop` (the `updateChanged<T>` case; the
 *    runtime only carries the member name, so this is a safe superset across
 *    structs — the flush-side diff suppresses spurious callbacks).
 *  - `notifyPathChange()`: global invalidation — bumps the structural epoch
 *    and wakes every watcher.
 */
export function notifyPathChange(path?: string, prop?: string): void {
  if (path !== undefined) {
    const key = normalizePath(path);

    for (const [subPath, set] of pathSubs) {
      if (pathsOverlap(subPath, key)) {
        markSet(set);
      }
    }
  } else if (prop !== undefined) {
    markSet(propSubs.get(prop));
  } else {
    bumpPathStructureGen();

    for (const set of pathSubs.values()) {
      markSet(set);
    }
  }
}

function scheduleFlush(): void {
  if (flushScheduled) return;
  flushScheduled = true;

  const run = () => {
    flushScheduled = false;
    flushPathNotifications();
  };

  /* non-DOM/test/node contexts have no rAF; fall back to a microtask so
   * vitest can drive notifications (or call flushPathNotifications directly) */
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(run);
  } else {
    queueMicrotask(run);
  }
}

/** Synchronously drain the dirty set, invoking each dirty watcher once. */
export function flushPathNotifications(): void {
  while (dirty.size > 0) {
    const batch = [...dirty];
    dirty.clear();

    for (const w of batch) {
      w.flush();
    }
  }
}

/** Registry introspection, for leak tests and CDP smoke checks. */
export function getPathWatchStats() {
  let pathRefs = 0;
  for (const set of pathSubs.values()) {
    pathRefs += set.size;
  }

  let propRefs = 0;
  for (const set of propSubs.values()) {
    propRefs += set.size;
  }

  return {
    paths: pathSubs.size,
    pathRefs,
    props: propSubs.size,
    propRefs,
    dirty: dirty.size,
  };
}

/** Test helper: wipe the (module-global) registry between test cases. */
export function clearPathWatchers(): void {
  pathSubs.clear();
  propSubs.clear();
  dirty.clear();
}

/**
 * Owns change detection for one datapath binding: resolve-once metadata
 * caching, prop-aware snapshot/compare (scalars, enums, vectors/arrays —
 * including in-place mutation), and push/poll delivery with debouncing.
 *
 * Created via `DataAPI.watch(ctx, path, cb, opts)`. The subscriber (widget)
 * must hold the watcher strongly and call {@link remove} when it goes away;
 * the registry itself only holds a `WeakRef`, with a `FinalizationRegistry`
 * as the safety net for anything missed.
 */
export class DataPathWatcher<CTX extends ContextLike = ContextLike> {
  readonly path: string;
  onChange: PathWatchCallback;
  debounce: PathDebounce;

  private readonly api: ModelInterface<CTX>;
  private readonly getCtx: () => CTX | undefined;
  private readonly rec: RegRecord;

  private removed = false;
  private subscribed = false;
  private dirtyFlag = false;
  private lastGen = -1;
  private prop: ToolPropertyTypes | undefined = undefined;
  private snapshot: unknown = undefined;
  private hasSnapshot = false;
  /** false when the snapshot is an identity ref that cannot detect in-place
   * mutation; push flushes then fire unconditionally instead of diffing. */
  private snapshotReliable = true;
  private timer: ReturnType<typeof setTimeout> | undefined = undefined;

  constructor(
    api: ModelInterface<CTX>,
    ctx: CTX | (() => CTX | undefined),
    path: string,
    onChange: PathWatchCallback,
    opts: DataPathWatcherOpts = {}
  ) {
    this.api = api;
    this.getCtx = typeof ctx === "function" ? (ctx as () => CTX | undefined) : () => ctx;
    this.path = normalizePath(path);
    this.onChange = onChange;
    this.debounce = opts.debounce ?? "raf";
    this.rec = { pathKey: undefined, propKey: undefined, ref: new WeakRef(this) };
  }

  /** Register with the path/prop indices and prime the initial callback
   * (delivered on the next flush). Idempotent. */
  subscribe(): this {
    if (this.subscribed || this.removed) {
      return this;
    }

    this.subscribed = true;
    this.rec.pathKey = this.path;
    addRef(pathSubs, this.path, this.rec.ref);

    this.resolveMeta();

    finalizer?.register(this, this.rec, this);

    this.markDirty();
    return this;
  }

  /** Unsubscribe and prune. Idempotent; the watcher is dead afterwards. */
  remove(): void {
    if (this.removed) return;

    this.removed = true;
    this.subscribed = false;

    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    dirty.delete(this);
    dropRef(pathSubs, this.rec.pathKey, this.rec.ref);
    dropRef(propSubs, this.rec.propKey, this.rec.ref);
    this.rec.pathKey = this.rec.propKey = undefined;

    finalizer?.unregister(this);
  }

  /** Push side: flag for the next flush (or fire now for `"immediate"`). */
  markDirty(): void {
    if (this.removed) return;

    if (this.debounce === "immediate") {
      this.check("push", true);
      return;
    }

    this.dirtyFlag = true;
    dirty.add(this);
    scheduleFlush();
  }

  /** Poll side: re-read, diff against the snapshot, fire on change. */
  poll(): boolean {
    return this.check("poll", false);
  }

  /** Per-frame driver for poll mode (the compat safety net). */
  tick(): boolean {
    return this.poll();
  }

  /**
   * Drop the snapshot and re-deliver the current value unconditionally.
   * For widgets that gate {@link PathWatchCallback} reactions (e.g. a textbox
   * ignoring updates while focused): call `refresh()` when the gate lifts to
   * catch anything delivered-but-ignored in between.
   */
  refresh(): boolean {
    this.hasSnapshot = false;
    return this.check("push", true);
  }

  /** Push side: if dirty, re-read + diff + fire (debounced). */
  flush(): boolean {
    if (this.removed || !this.dirtyFlag) {
      return false;
    }

    if (typeof this.debounce === "object") {
      if (this.timer !== undefined) {
        clearTimeout(this.timer);
      }

      this.timer = setTimeout(() => {
        this.timer = undefined;

        if (this.dirtyFlag && !this.removed) {
          this.dirtyFlag = false;
          this.check("push", true);
        }
      }, this.debounce.trailing);

      return false;
    }

    this.dirtyFlag = false;
    return this.check("push", true);
  }

  /** Resolve once and cache leaf metadata; (re-)file the reverse index used
   * by type-scoped notifications (`updateChanged<T>`). */
  private resolveMeta(): void {
    const ctx = this.getCtx();
    if (!ctx) return;

    this.lastGen = structureGen;

    let res;
    try {
      res = this.api.resolvePath(ctx, this.path, true);
    } catch {
      res = undefined;
    }

    this.prop = res?.prop;

    const propKey = res?.dpath?.apiname;
    if (propKey !== this.rec.propKey) {
      dropRef(propSubs, this.rec.propKey, this.rec.ref);
      this.rec.propKey = propKey;

      if (propKey !== undefined && this.subscribed) {
        addRef(propSubs, propKey, this.rec.ref);
      }
    }
  }

  private read(ctx: CTX): unknown {
    try {
      return this.api.getValue(ctx, this.path);
    } catch {
      return undefined;
    }
  }

  /**
   * Prop-aware structural equality: componentwise for vectors/arrays (so
   * in-place mutation is detected against the copied snapshot), `.equals()`
   * for value objects that provide it (Curve1D etc.), `Object.is` for
   * scalars/enums/flags.
   */
  private static valuesEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (a === null || b === null || a === undefined || b === undefined) return false;

    const aArr = Array.isArray(a) || ArrayBuffer.isView(a);
    const bArr = Array.isArray(b) || ArrayBuffer.isView(b);

    if (aArr || bArr) {
      if (!aArr || !bArr) return false;

      const av = a as ArrayLike<unknown>;
      const bv = b as ArrayLike<unknown>;

      if (av.length !== bv.length) return false;

      for (let i = 0; i < av.length; i++) {
        if (!Object.is(av[i], bv[i])) return false;
      }

      return true;
    }

    const eq = (a as { equals?: (b: unknown) => boolean }).equals;
    if (typeof a === "object" && typeof eq === "function") {
      try {
        return !!eq.call(a, b);
      } catch {
        return false;
      }
    }

    return false;
  }

  private snapshotValue(v: unknown): void {
    this.hasSnapshot = true;
    this.snapshotReliable = true;

    if (v === null || typeof v !== "object") {
      this.snapshot = v;
      return;
    }

    const cp = (v as { copy?: () => unknown }).copy;
    if (typeof cp === "function") {
      try {
        this.snapshot = cp.call(v);
        return;
      } catch {
        /* fall through to the array / identity cases */
      }
    }

    if (Array.isArray(v) || ArrayBuffer.isView(v)) {
      this.snapshot = Array.from(v as ArrayLike<unknown>);
      return;
    }

    this.snapshot = v;
    this.snapshotReliable = false;
  }

  private check(source: "push" | "poll", fireOnUnreliable: boolean): boolean {
    if (this.removed) return false;

    const ctx = this.getCtx();
    if (!ctx) return false;

    if (this.lastGen !== structureGen) {
      this.resolveMeta();
    }

    const value = this.read(ctx);
    const resolved = value !== undefined;

    if (resolved && this.prop === undefined && this.rec.propKey === undefined) {
      /* the path resolves now but metadata was never captured (subscribed
       * before the data existed) — try again */
      this.resolveMeta();
    }

    let changed = !this.hasSnapshot || !DataPathWatcher.valuesEqual(this.snapshot, value);

    if (!changed && fireOnUnreliable && !this.snapshotReliable) {
      /* explicit push notification on a value we can't diff — trust it */
      changed = true;
    }

    if (!changed) return false;

    /* a poll that fires also satisfies any pending push wake */
    this.dirtyFlag = false;
    dirty.delete(this);

    this.snapshotValue(value);
    this.onChange(value, { resolved, path: this.path, prop: this.prop, source });

    return true;
  }
}
