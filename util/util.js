import './polyfill.js';
import './struct.js';
import './mobile-detect.js';
import nstructjs from './struct.js';

let f64tmp = new Float64Array(1);
let u16tmp = new Uint16Array(f64tmp.buffer);

export function isDenormal(f) {
  f64tmp[0] = f;

  let a = u16tmp[0], b = u16tmp[1], c = u16tmp[2], d = u16tmp[3];

  //zero? check both positive and negative zero
  if (a === 0 && b === 0 && c === 0 && (d === 0 || d === 32768)) {
    return false;
  }

  let test = d & ~(1<<15);
  test = test>>4;

  //window.console.log(u16tmp[0], u16tmp[1], u16tmp[2], u16tmp[3], "|", test);

  return test === 0;
}

globalThis._isDenormal = isDenormal;


let colormap = {
  "black"   : 30,
  "red"     : 31,
  "green"   : 32,
  "yellow"  : 33,
  "blue"    : 34,
  "magenta" : 35,
  "cyan"    : 36,
  "teal"    : 36,
  "white"   : 37,
  "reset"   : 0,
  "grey"    : 2,
  "gray"    : 2,
  "orange"  : 202,
  "pink"    : 198,
  "brown"   : 314,
  "lightred": 91,
  "peach"   : 210
}

export let termColorMap = {};
for (let k in colormap) {
  termColorMap[k] = colormap[k];
  termColorMap[colormap[k]] = k;
}

export function termColor(s, c, d = 0) {
  if (typeof s === "symbol") {
    s = s.toString();
  } else {
    s = "" + s;
  }

  if (c in colormap)
    c = colormap[c]

  if (c > 107) {
    let s2 = '\u001b[38;5;' + c + "m"
    return s2 + s + '\u001b[39m'
  }

  return '\u001b[' + c + 'm' + s + '\u001b[39m';
};

export function termPrint() {
  //let console = window.console;

  let s = '';
  for (let i = 0; i < arguments.length; i++) {
    if (i > 0) {
      s += ' ';
    }
    s += arguments[i];
  }

  let re1a = /\u001b\[[1-9][0-9]?m/;
  let re1b = /\u001b\[[1-9][0-9];[0-9][0-9]?;[0-9]+m/
  let re2 = /\u001b\[39m/;

  let endtag = '\u001b[39m';

  function tok(s, type) {
    return {
      type : type,
      value: s
    }
  }

  let tokdef = [
    [re1a, "start"],
    [re1b, "start"],
    [re2, "end"]
  ];

  let s2 = s;

  let i = 0;
  let tokens = [];

  while (s2.length > 0) {
    let ok = false;

    let mintk = undefined, mini = undefined;
    let minslice = undefined, mintype = undefined;

    for (let tk of tokdef) {
      let i = s2.search(tk[0]);

      if (i >= 0 && (mini === undefined || i < mini)) {
        minslice = s2.slice(i, s2.length).match(tk[0])[0];
        mini = i;
        mintype = tk[1];
        mintk = tk;
        ok = true;
      }
    }

    if (!ok) {
      break;
    }

    if (mini > 0) {
      let chunk = s2.slice(0, mini);
      tokens.push(tok(chunk, "chunk"));
    }

    s2 = s2.slice(mini + minslice.length, s2.length);
    let t = tok(minslice, mintype);

    tokens.push(t);
  }

  if (s2.length > 0) {
    tokens.push(tok(s2, "chunk"));
  }

  let stack = [];
  let cur;

  let out = '';

  for (let t of tokens) {
    if (t.type === "chunk") {
      out += t.value;
    } else if (t.type === "start") {
      stack.push(cur);
      cur = t.value;

      out += t.value;
    } else if (t.type === "end") {
      cur = stack.pop();
      if (cur) {
        out += cur;
      } else {
        out += endtag;
      }
    }
  }

  return out;
}

globalThis.termColor = termColor;

export class MovingAvg extends Array {
  constructor(size = 64) {
    super();

    this.length = size;
    this.cur = 0;
    this.used = 0;
    this.sum = 0;
  }

  reset() {
    this.cur = this.used = this.sum = 0.0;

    return this;
  }

  add(val) {
    if (this.used < this.length) {
      this[this.cur] = val;
      this.used++;
    } else {
      this.sum -= this[this.cur];
      this[this.cur] = val;
    }

    this.sum += val;
    this.cur = (this.cur + 1)%this.length;

    return this.sample();
  }

  sample() {
    return this.used ? this.sum/this.used : 0.0;
  }
}

export let timers = {};

export function pollTimer(id, interval) {
  if (!(id in timers)) {
    timers[id] = time_ms();
  }

  if (time_ms() - timers[id] >= interval) {
    timers[id] = time_ms();
    return true;
  }

  return false;
}

let mdetect = undefined;
let mret = undefined;

export function isMobile() {
  if (!window.MobileDetect) {
    return;
  }

  if (mret === undefined) {
    mdetect = new MobileDetect(navigator.userAgent);
    let ret = mdetect.mobile();

    if (typeof ret === "string") {
      ret = ret.toLowerCase();
    }

    mret = ret;
  }

  return mret;
}

//window._isMobile = isMobile;

//let SmartConsoleTag = Symbol("SmartConsoleTag");
//let tagid = 0;

export class SmartConsoleContext {
  constructor(name, console) {
    this.name = name;

    let c = [random(), random(), random()];
    let sum = Math.sqrt(c[0]*c[0] + c[1]*c[1] + c[2]*c[2]);
    sum = 255/sum;

    let r = ~~(c[0]*sum);
    let g = ~~(c[1]*sum);
    let b = ~~(c[2]*sum);

    this.color = `rgb(${r},${g},${b})`;
    this.__console = console;

    //minimum time between prints of same message
    this.timeInterval = 375;

    //minimum time in general
    this.timeIntervalAll = 245;

    this._last = 0;
    this.last = 0;
    this.last2 = 0;
    this._data = {};
    this._data_length = 0;
    this.maxCache = 256;
  }


  hash(args) {
    let sum = 0;
    let mul = (1<<19) - 1, off = (1<<27) - 1;
    let i = 0;

    function dohash(h) {
      h = (h*mul + off + i*mul*0.25) & mul;

      i++;
      sum = sum ^ h;
    }

    let visit = new WeakSet();

    let recurse = (n) => {
      if (typeof n === "string") {
        dohash(strhash(n));
      } else if (typeof n === "undefined" || n === null) {
        dohash(0);
      } else if (typeof n === "object") {
        if (n === undefined) {
          //n[SmartConsoleTag] = tagid++;
        }

        if (visit.has(n)) {
          return;
        }

        visit.add(n); //[SmartConsoleTag]);

        let keys = getAllKeys(n);

        for (let k of keys) {
          let v;

          if (typeof k !== "string") {
            continue;
          }

          try {
            v = n[k];
          } catch (error) {
            continue;
          }

          recurse(v);
        }
      } else if (typeof n === "function") {
        dohash(strhash("" + n.name));
      }
    };

    //let str = "";

    for (let i = 0; i < args.length; i++) {
      recurse(args[i]);
      //str += args[i] + " ";
    }

    //window.console.log("HASH", sum, str);
    return sum;
  }

  clearCache() {
    this._data_length = 0;
    this._data = {};
    return this;
  }

  _getData(args) {
    let key = this.hash(args);

    if (!(key in this._data)) {
      if (this._data_length > this.maxCache) {
        this.clearCache();
      }

      this._data[key] = {
        time : 0,
        count: 0
      };

      this._data_length++;
    }

    return this._data[key];
  }

  _check(args) {
    if (this.timeIntervalAll > 0 && time_ms() - this.last2 < this.timeIntervalAll) {
      return false;
    }

    this.last2 = time_ms();

    return true;
    /*
    this.last2 = time_ms();

    let d = this._getData(args);
    let last = this.last;

    this.last = d;

    if (d !== last) {
      d.count = 0;
      d.time = time_ms();
      return true;
    }

    if (time_ms() - d.time > this.timeInterval) {
      d.time = time_ms();
      return true;
    }

    return false;*/
  }

  log() {
    if (this._check(arguments)) {
      window.console.log("%c", "color:" + this.color, ...arguments);
    }
  }

  warn() {
    if (this._check(arguments)) {
      window.console.log("%c" + this.name, "color : " + this.color, ...arguments);
    }
  }

  trace() {
    if (this._check(arguments)) {
      window.console.trace(...arguments);
    }
  }

  error() {
    if (this._check(arguments)) {
      window.console.error(...arguments);
    }
  }
}

export class SmartConsole {
  constructor() {
    this.contexts = {};
  }

  context(name) {
    if (!(name in this.contexts)) {
      this.contexts[name] = new SmartConsoleContext(name, this);
    }

    return this.contexts[name];
  }

  log() {
    let c = this.context("default");
    return c.log(...arguments);
  }

  warn() {
    let c = this.context("default");
    return c.warn(...arguments);
  }

  trace() {
    let c = this.context("default");
    return c.trace(...arguments);
  }

  error() {
    let c = this.context("default");
    return c.error(...arguments);
  }
}

export const console = new SmartConsole();

globalThis.tm = 0.0;

var EmptySlot = {};

export function getClassParent(cls) {
  let p = cls.prototype;

  if (p) p = p.__proto__;
  if (p) p = p.constructor
  ;
  return p;
}

//make global for debugging purposes in console
//window._getClassParent = getClassParent;

export function list(iterable) {
  let ret = [];

  for (let item of iterable) {
    ret.push(item);
  }

  return ret;
}


/** Count items in list; if searchItem is not undefined then a count
 *  of the number of times searchItem occurs will be returned.*/
export function count(iterable, searchItem=undefined) {
  let count = 0;

  if (searchItem !== undefined) {
    for (let item of iterable) {
      if (item === searchItem) {
        count++;
      }
    }
  } else {
    for (let item of iterable) {
      count++;
    }
  }

  return count;
}

/*
* returns all object keys, including
* inherited ones
* */
export function getAllKeys(obj) {
  let keys = new Set();

  if (typeof obj !== "object" && typeof obj !== "function") {
    throw new Error("must pass an object ot getAllKeys; object was: " + obj);
  }

  let p;

  while (p && p !== Object) {
    for (let k in Object.getOwnPropertyDescriptors(obj)) {
      if (k === "__proto__")
        continue;

      keys.add(k);
    }

    for (let k of Object.getOwnPropertySymbols(obj)) {
      keys.add(k);
    }

    p = p.__proto__;
  }

  let cls = obj.constructor;
  if (!cls)
    return keys;

  while (cls) {
    let proto = cls.prototype;
    if (!proto) {
      cls = getClassParent(cls);
      continue;
    }

    for (let k in proto) {
      keys.add(k);
    }

    for (let k in Object.getOwnPropertyDescriptors(proto)) {
      keys.add(k);
    }

    cls = getClassParent(cls);
  }

  return keys;
}

//globalThis._getAllKeys = getAllKeys;

export function btoa(buf) {
  if (buf instanceof ArrayBuffer) {
    buf = new Uint8Array(buf);
  }

  if (typeof buf == "string" || buf instanceof String) {
    return window.btoa(buf);
  }

  var ret = "";
  for (var i = 0; i < buf.length; i++) {
    ret += String.fromCharCode(buf[i]);
  }

  return btoa(ret);
};

export function formatNumberUI(val, isInt = false, decimals = 5) {
  if (val === undefined || val === null) {
    val = "0";
  } else if (isNaN(val)) {
    val = "NaN";
  } else if (val === -Infinity) {
    val = "-" + String.fromCharCode(0x221E);
  } else if (val === Infinity) {
    val = "+" + String.fromCharCode(0x221E);
  } else if (!isInt) {
    val = val.toFixed(decimals);
  } else {
    val = "" + Math.floor(val);
  }

  return val;
}

//window.formatNumberUI = formatNumberUI;

export function atob(buf) {
  let data = window.atob(buf);
  let ret = [];

  for (let i = 0; i < data.length; i++) {
    ret.push(data.charCodeAt(i));
  }

  return new Uint8Array(ret);
}

export function time_ms() {
  if (window.performance)
    return window.performance.now();
  else
    return new Date().getMilliseconds();
}

export function color2css(c) {
  var ret = c.length == 3 ? "rgb(" : "rgba(";

  for (var i = 0; i < 3; i++) {
    if (i > 0)
      ret += ",";

    ret += ~~(c[i]*255);
  }

  if (c.length == 4)
    ret += "," + c[3];
  ret += ")";

  return ret;
}

export function merge(obja, objb) {
  return Object.assign({}, obja, objb);
  /*
  var ret = {};

  for (var k in obja) {
    ret[k] = obja[k];
  }

  for (var k in objb) {
    ret[k] = objb[k];
  }

  return ret;
  //*/
};

const debug_cacherings = false;

if (debug_cacherings) {
  window._cacherings = [];

  window._clear_all_cacherings = function (kill_all = false) {
    function copy(obj) {
      if (typeof obj.copy === "function") {
        return obj.copy();
      } else if (obj.constructor === Object) {
        let ret = {};

        for (let k of Reflect.ownKeys(obj)) {
          let v;

          try {
            v = obj[k];
          } catch (error) {
            continue;
          }

          if (typeof v !== "object") {
            ret[k] = v;
          } else {
            ret[k] = copy(v);
          }
        }

        return ret;
      } else {
        return new obj.constructor();
      }
    }

    for (let ch of window._cacherings) {
      let obj = ch[0];
      let len = ch.length;

      ch.length = 0;
      ch.cur = 0;

      if (kill_all) {
        continue;
      }

      for (let i = 0; i < len; i++) {
        ch.push(copy(obj));
      }
    }
  }

  window._nonvector_cacherings = function () {
    for (let ch of window._cacherings) {
      if (ch.length === 0) {
        continue;
      }

      let name = ch[0].constructor.name;
      let ok = !name.startsWith("Vector") && !name.startsWith("Quat");
      ok = ok && !name.startsWith("TriEditor");
      ok = ok && !name.startsWith("QuadEditor");
      ok = ok && !name.startsWith("PointEditor");
      ok = ok && !name.startsWith("LineEditor");

      if (ok) {
        console.log(name, ch);
      }
    }
  }

  window._stale_cacherings = function () {
    let ret = _cacherings.concat([]);

    ret.sort((a, b) => a.gen - b.gen);
    return ret;
  }
}

export class cachering extends Array {
  constructor(func, size, isprivate = false) {
    super()

    this.private = isprivate;
    this.cur = 0;

    if (!isprivate && debug_cacherings) {
      this.gen = 0;
      window._cacherings.push(this);
    }

    for (var i = 0; i < size; i++) {
      this.push(func());
    }
  }

  static fromConstructor(cls, size, isprivate = false) {
    var func = function () {
      return new cls();
    }

    return new cachering(func, size, isprivate);
  }

  next() {
    if (debug_cacherings) {
      this.gen++;
    }

    let ret = this[this.cur];
    this.cur = (this.cur + 1)%this.length;

    return ret;
  }
}

export class SetIter {
  constructor(set) {
    this.set = set;
    this.i = 0;
    this.ret = {done: false, value: undefined};
  }

  [Symbol.iterator]() {
    return this;
  }

  next() {
    var ret = this.ret;

    while (this.i < this.set.items.length && this.set.items[this.i] === EmptySlot) {
      this.i++;
    }

    if (this.i >= this.set.items.length) {
      ret.done = true;
      ret.value = undefined;

      return ret;
    }


    ret.value = this.set.items[this.i++];
    return ret;
  }
}

/**
 Set

 Stores objects in a set; each object is converted to a value via
 a [Symbol.keystr] method, and if that value already exists in the set
 then the object is not added.


 * */
export class set {
  constructor(input) {
    this.items = [];
    this.keys = {};
    this.freelist = [];

    this.length = 0;

    if (typeof input == "string") {
      input = new String(input);
    }

    if (input !== undefined) {
      if (Symbol.iterator in input) {
        for (var item of input) {
          this.add(item);
        }
      } else if ("forEach" in input) {
        input.forEach(function (item) {
          this.add(item);
        }, this);
      } else if (input instanceof Array) {
        for (var i = 0; i < input.length; i++) {
          this.add(input[i]);
        }
      }
    }
  }

  get size() {
    return this.length;
  }

  [Symbol.iterator]() {
    return new SetIter(this);
  }

  equals(setb) {
    for (let item of this) {
      if (!setb.has(item)) {
        return false;
      }
    }

    for (let item of setb) {
      if (!this.has(item)) {
        return false;
      }
    }

    return true;
  }

  clear() {
    this.items.length = 0;
    this.keys = {};
    this.freelist.length = 0;
    this.length = 0;

    return this;
  }

  filter(f, thisvar) {
    let i = 0;
    let ret = new set();

    for (let item of this) {
      if (f.call(thisvar, item, i++, this)) {
        ret.add(item);
      }
    }

    return ret;

  }

  map(f, thisvar) {
    let ret = new set();

    let i = 0;

    for (let item of this) {
      ret.add(f.call(thisvar, item, i++, this));
    }

    return ret;
  }

  reduce(f, initial) {
    if (initial === undefined) {
      for (let item of this) {
        initial = item;
        break;
      }
    }

    let i = 0;
    for (let item of this) {
      initial = f(initial, item, i++, this);
    }

    return initial;
  }

  copy() {
    let ret = new set();
    for (let item of this) {
      ret.add(item);
    }

    return ret;
  }

  add(item) {
    var key = item[Symbol.keystr]();

    if (key in this.keys) return;

    if (this.freelist.length > 0) {
      var i = this.freelist.pop();

      this.keys[key] = i;
      this.items[i] = item;
    } else {
      var i = this.items.length;

      this.keys[key] = i;
      this.items.push(item);
    }

    this.length++;
  }

  delete(item, ignore_existence = true) {
    this.remove(item, ignore_existence);
  }

  remove(item, ignore_existence) {
    var key = item[Symbol.keystr]();

    if (!(key in this.keys)) {
      if (!ignore_existence) {
        console.warn("Warning, item", item, "is not in set");
      }
      return;
    }

    var i = this.keys[key];
    this.freelist.push(i);
    this.items[i] = EmptySlot;

    delete this.keys[key];

    this.length--;
  }

  has(item) {
    return item[Symbol.keystr]() in this.keys;
  }

  forEach(func, thisvar) {
    for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];

      if (item === EmptySlot)
        continue;

      thisvar !== undefined ? func.call(thisvar, item) : func(item);
    }
  }
}

export class HashIter {
  constructor(hash) {
    this.hash = hash;
    this.i = 0;
    this.ret = {done: false, value: undefined};
  }

  next() {
    var items = this.hash._items;

    if (this.i >= items.length) {
      this.ret.done = true;
      this.ret.value = undefined;

      return this.ret;
    }

    do {
      this.i += 2;
    } while (this.i < items.length && items[i] === _hash_null);

    return this.ret;
  }
}

var _hash_null = {};

export class hashtable {
  constructor() {
    this._items = [];
    this._keys = {};
    this.length = 0;
  }

  [Symbol.iterator]() {
    return new HashIter(this);
  }

  set(key, val) {
    var key2 = key[Symbol.keystr]();

    var i;
    if (!(key2 in this._keys)) {
      i = this._items.length;

      try {
        this._items.push(0);
        this._items.push(0);
      } catch (error) {
        console.log(":::", this._items.length, key, key2, val)
        throw error;
      }

      this._keys[key2] = i;
      this.length++;
    } else {
      i = this._keys[key2];
    }

    this._items[i] = key;
    this._items[i + 1] = val;
  }

  remove(key) {
    var key2 = key[Symbol.keystr]();

    if (!(key2 in this._keys)) {
      console.warn("Warning, key not in hashtable:", key, key2);
      return;
    }

    var i = this._keys[key2];

    this._items[i] = _hash_null;
    this._items[i + 1] = _hash_null;

    delete this._keys[key2];
    this.length--;
  }

  has(key) {
    var key2 = key[Symbol.keystr]();

    return key2 in this._keys;
  }

  get(key) {
    var key2 = key[Symbol.keystr]();

    if (!(key2 in this._keys)) {
      console.warn("Warning, item not in hash", key, key2);
      return undefined;
    }

    return this._items[this._keys[key2] + 1];
  }

  add(key, val) {
    return this.set(key, val);
  }

  keys() {
    var ret = [];

    for (var i = 0; i < this._items.length; i += 2) {
      var key = this._items[i];

      if (key !== _hash_null) {
        ret.push(key);
      }
    }

    return ret;
  }

  values() {
    var ret = [];

    for (var i = 0; i < this._items.length; i += 2) {
      var item = this._items[i + 1];

      if (item !== _hash_null) {
        ret.push(item);
      }
    }

    return ret;
  }

  forEach(cb, thisvar) {
    if (thisvar == undefined)
      thisvar = self;

    for (var k in this._keys) {
      var i = this._keys[k];

      cb.call(thisvar, k, this._items[i]);
    }
  }
}

let IDGenInternalIDGen = 0;

export class IDGen {
  constructor() {
    this.__cur = 1;

    this._debug = false;
    this._internalID = IDGenInternalIDGen++;
  }

  /*
  get _cur() {
    return this.__cur;
  }

  set _cur(v) {
    if (this._debug && pollTimer("_idgen_debug", 450)) {
      window.console.warn("_cur access", v);
    }

    this.__cur = v;
  }

  // */

  get cur() {
    return this.__cur;
  }

  set cur(v) {
    if (isNaN(v) || !isFinite(v)) {
      throw new Error("NaN error in util.IDGen");
    }

    this.__cur = v;
  }

  get _cur() {
    return this.cur;
  }

  set _cur(v) {
    window.console.warn("Deprecated use of IDGen._cur");
    this.cur = v;
  }

  static fromJSON(obj) {
    let ret = new IDGen();

    ret.cur = obj.cur === undefined ? obj._cur : obj.cur;

    return ret;
  }

  next() {
    return this.cur++;
  }

  copy() {
    let ret = new IDGen();
    ret.cur = this.cur;

    return ret;
  }

  max_cur(id) {
    this.cur = Math.max(this.cur, id + 1);
  }

  toJSON() {
    return {
      cur: this.cur
    };
  }

  loadSTRUCT(reader) {
    reader(this);
  }
}

IDGen.STRUCT = `
IDGen {
  cur : int;
}
`;
nstructjs.register(IDGen);


function get_callstack(err) {
  return (""+err.stack).split("\n");
}

export function print_stack(err) {
  if (!err) {
    window.console.trace();
  } else {
    window.console.log(err.stack);
  }
}


globalThis.get_callstack = get_callstack;
globalThis.print_stack = print_stack;

export function fetch_file(path) {
  var url = location.origin + "/" + path

  var req = new XMLHttpRequest(
  );

  return new Promise(function (accept, reject) {
    req.open("GET", url)
    req.onreadystatechange = function (e) {
      if (req.status == 200 && req.readyState == 4) {
        accept(req.response);
      } else if (req.status >= 400) {
        reject(req.status, req.statusText);
      }
    }
    req.send();
  });
}

//from:https://en.wikipedia.org/wiki/Mersenne_Twister
function _int32(x) {
  // Get the 31 least significant bits.
  return ~~(((1<<30) - 1) & (~~x))
}

export class MersenneRandom {
  constructor(seed) {
    // Initialize the index to 0
    this.index = 624;
    this.mt = new Uint32Array(624);

    this.seed(seed);
  }

  random() {
    return this.extract_number()/(1<<30);
  }

  /** normal-ish distribution */
  nrandom(n=3) {
    let ret = 0.0;

    for (let i=0; i<n; i++) {
      ret += this.random();
    }

    return ret / n;
  }

  seed(seed) {
    seed = ~~(seed*8192);

    // Initialize the index to 0
    this.index = 624;
    this.mt.fill(0, 0, this.mt.length);

    this.mt[0] = seed;  // Initialize the initial state to the seed

    for (var i = 1; i < 624; i++) {
      this.mt[i] = _int32(
        1812433253*(this.mt[i - 1] ^ this.mt[i - 1]>>30) + i);
    }
  }

  extract_number() {
    if (this.index >= 624)
      this.twist();

    var y = this.mt[this.index];

    // Right shift by 11 bits
    y = y ^ y>>11;
    // Shift y left by 7 and take the bitwise and of 2636928640
    y = y ^ y<<7 & 2636928640;
    // Shift y left by 15 and take the bitwise and of y and 4022730752
    y = y ^ y<<15 & 4022730752;
    // Right shift by 18 bits
    y = y ^ y>>18;

    this.index = this.index + 1;

    return _int32(y);
  }

  twist() {
    for (var i = 0; i < 624; i++) {
      // Get the most significant bit and add it to the less significant
      // bits of the next number
      var y = _int32((this.mt[i] & 0x80000000) +
        (this.mt[(i + 1)%624] & 0x7fffffff));
      this.mt[i] = this.mt[(i + 397)%624] ^ y>>1;

      if (y%2 != 0)
        this.mt[i] = this.mt[i] ^ 0x9908b0df;
    }

    this.index = 0;
  }
}

var _mt = new MersenneRandom(0);

export function random() {
  return _mt.extract_number()/(1<<30);
}

export function seed(n) {
//  console.trace("seed called");
  _mt.seed(n);
}

let smallstr_hashes = {};

export function strhash(str) {
  if (str.length <= 64) {
    let hash = smallstr_hashes[str];

    if (hash !== undefined) {
      return hash;
    }
  }

  var hash = 0;

  for (var i = 0; i < str.length; i++) {
    var ch = str.charCodeAt(i);

    hash = hash < 0 ? -hash : hash;

    hash ^= (ch*524287 + 4323543) & ((1<<19) - 1);
  }

  if (str.length <= 64) {
    smallstr_hashes[str] = hash;
  }

  return hash;
}

var hashsizes = [
  /*2, 5, 11, 19, 37, 67, 127, */223, 383, 653, 1117, 1901, 3251,
                                 5527, 9397, 15991, 27191, 46229, 78593, 133631, 227177, 38619,
                                 656587, 1116209, 1897561, 3225883, 5484019, 9322861, 15848867,
                                 26943089, 45803279, 77865577, 132371489, 225031553
];

var FTAKEN = 0, FKEY = 1, FVAL = 2, FTOT = 3;

export class FastHash extends Array {
  constructor() {
    super();

    this.cursize = 0;
    this.size = hashsizes[this.cursize];
    this.used = 0;

    this.length = this.size*FTOT;
    this.fill(0, 0, this.length);
  }

  resize(size) {
    var table = this.slice(0, this.length);

    this.length = size*FTOT;
    this.size = size;
    this.fill(0, 0, this.length);

    for (var i = 0; i < table.length; i += FTOT) {
      if (!table[i + FTAKEN]) continue;

      var key = table[i + FKEY], val = table[i + FVAL];
      this.set(key, val);
    }

    return this;
  }

  get(key) {
    var hash = typeof key == "string" ? strhash(key) : key;
    hash = typeof hash == "object" ? hash.valueOf() : hash;

    var probe = 0;

    var h = (hash + probe)%this.size;

    var _i = 0;
    while (_i++ < 50000 && this[h*FTOT + FTAKEN]) {
      if (this[h*FTOT + FKEY] == key) {
        return this[h*FTOT + FVAL];
      }

      probe = (probe + 1)*2;
      h = (hash + probe)%this.size;
    }

    return undefined;
  }

  has(key) {
    var hash = typeof key == "string" ? strhash(key) : key;
    hash = typeof hash == "object" ? hash.valueOf() : hash;

    var probe = 0;

    var h = (hash + probe)%this.size;

    var _i = 0;
    while (_i++ < 50000 && this[h*FTOT + FTAKEN]) {
      if (this[h*FTOT + FKEY] == key) {
        return true;
      }

      probe = (probe + 1)*2;
      h = (hash + probe)%this.size;
    }

    return false;
  }

  set(key, val) {
    var hash = typeof key == "string" ? strhash(key) : key;
    hash = typeof hash == "object" ? hash.valueOf() : hash;

    if (this.used > this.size/3) {
      this.resize(hashsizes[this.cursize++]);
    }

    var probe = 0;

    var h = (hash + probe)%this.size;

    var _i = 0;
    while (_i++ < 50000 && this[h*FTOT + FTAKEN]) {
      if (this[h*FTOT + FKEY] == key) {
        this[h*FTOT + FVAL] = val;
        return;
      }

      probe = (probe + 1)*2;
      h = (hash + probe)%this.size;
    }

    this[h*FTOT + FTAKEN] = 1;
    this[h*FTOT + FKEY] = key;
    this[h*FTOT + FVAL] = val;

    this.used++;
  }
}

export function test_fasthash() {
  var h = new FastHash();
  console.log("bleh hash:", strhash("bleh"));

  h.set("bleh", 1);
  h.set("bleh", 2);
  h.set("bleh", 3);

  console.log(h);

  return h;
};

export class ImageReader {
  load_image() {
    let input = document.createElement("input");
    input.type = "file";

    let doaccept;

    let promise = new Promise((accept, reject) => {
      doaccept = accept;
    });

    input.addEventListener("change", function (e) {
      let files = this.files;
      console.log("got file", e, files)

      if (files.length == 0) return;

      var reader = new FileReader();
      var this2 = this;

      reader.onload = (e) => {
        let data = e.target.result;
        let image = new Image();

        image.src = data;
        image.onload = (e) => {
          console.log("got image", image.width, image.height);

          let canvas = document.createElement("canvas");
          let g = canvas.getContext("2d");

          canvas.width = image.width;
          canvas.height = image.height;

          g.drawImage(image, 0, 0);
          let idata = g.getImageData(0, 0, image.width, image.height);

          doaccept(idata);
        }
      };

      reader.readAsDataURL(files[0]);
    });

    input.click();
    return promise;
  }

  example() {
    this.load_image().then((idata) => {
      console.log(idata);
    });
  }
};

let digestcache;

/** NOT CRYPTOGRAPHIC */
export class HashDigest {
  constructor() {
    this.i = 0;
    this.hash = 0;
  }

  static cachedDigest() {
    return digestcache.next().reset();
  }

  reset() {
    this.i = 0;
    this.hash = 0;

    return this;
  }

  get() {
    return this.hash;
  }

  add(v) {
    if (typeof v === "string") {
      v = strhash(v);
    }

    if (v >= -5 && v <= 5) {
      v *= 32;
    }

    //try to deal with subdecimal floating point error

    let f = Math.fract(v)*(1024*512);
    f = (~~f)/(1024*512);
    v = Math.floor(v) + f;

    //glibc linear congruel generator
    this.i = ((this.i + (~~v))*1103515245 + 12345) & ((1<<29) - 1);
    //according to wikipedia only the top 16 bits are random
    //this.i = this.i>>16;

    let v2 = (v*1024*1024) & ((1<<29) - 1)
    v = v | v2;

    v = ~~v;

    this.hash ^= v ^ this.i;

    return this;
  }
}

window._test_hash2 = () => {
  let h = new HashDigest();

  let tests = [
    [0, 0, 0, 0],
    [0, 0, 0],
    [0, 0],
    [0],
    [1],
    [2],
    [3],
    [strhash("yay")],
    [strhash("yay"), strhash("yay")],
    [strhash("yay"), strhash("yay"), strhash("yay")]
  ]

  for (let test of tests) {
    let h = new HashDigest();
    for (let f of test) {
      h.add(f);
    }

    window.console.log(h.get());
  }
  for (let i = 0; i < 50; i++) {
    h.add(0);
    //window.console.log(h.i/((1<<30)-1), h.hash);
  }
}

digestcache = cachering.fromConstructor(HashDigest, 512);

//globalThis._HashDigest = HashDigest;

export function hashjoin(hash, val) {
  let sum = 0;
  let mul = (1<<19) - 1, off = (1<<27) - 1;
  let i = 0;

  h = (h*mul + off + i*mul*0.25) & mul;
}

let NullItem = {};

export class MapIter {
  constructor(ownermap) {
    this.ret = {done: true, value: undefined};
    this.value = new Array(2);
    this.i = 0;
    this.map = ownermap;
    this.done = true;
  }

  finish() {
    if (!this.done) {
      this.done = true;
      this.map.itercur--;
    }
  }

  next() {
    let ret = this.ret;
    let i = this.i;
    let map = this.map, list = map._list;
    //window.console.log(this)

    while (i < list.length && list[i] === NullItem) {
      i += 2;
    }

    //window.console.log("  --", i, list[i], list[i+1]);

    if (i >= list.length) {
      ret.done = true;
      ret.value = undefined;

      this.finish();
      return ret;
    }

    this.i = i + 2;

    ret.value = this.value;
    ret.value[0] = list[i];
    ret.value[1] = list[i + 1];
    ret.done = false;

    return ret;
  }

  return() {
    this.finish();

    return this.ret;
  }

  reset() {
    this.i = 0;
    this.value[0] = undefined;
    this.value[1] = undefined;
    this.done = false;

    return this;
  }
}

export class map {
  constructor() {
    this._items = {};
    this._list = [];

    this.size = 0;

    this.iterstack = new Array(8);
    this.itercur = 0;
    for (let i = 0; i < this.iterstack.length; i++) {
      this.iterstack[i] = new MapIter(this);
    }

    this.freelist = [];
  }

  has(key) {
    return key[Symbol.keystr]() in this._items;
  }

  set(key, v) {
    let k = key[Symbol.keystr]();

    let i = this._items[k];

    if (i === undefined) {
      if (this.freelist.length > 0) {
        i = this.freelist.pop();
      } else {
        i = this._list.length;
        this._list.length += 2;
      }

      this.size++;
    }

    this._list[i] = key;
    this._list[i + 1] = v;

    this._items[k] = i;
  }

  keys() {
    let this2 = this;
    return (function* () {
      for (let [key, val] of this2) {
        yield key;
      }
    })()
  }

  values() {
    let this2 = this;
    return (function* () {
      for (let [key, val] of this2) {
        yield val;
      }
    })()
  }

  get(k) {
    k = k[Symbol.keystr]();

    let i = this._items[k];
    if (i !== undefined) {
      return this._list[i + 1];
    }
  }

  delete(k) {
    k = k[Symbol.keystr]();

    if (!(k in this._items)) {
      return false;
    }

    let i = this._items[k];

    this.freelist.push(i);

    this._list[i] = NullItem;
    this._list[i + 1] = NullItem;

    delete this._items[k];
    this.size--;

    return true;
  }

  [Symbol.iterator]() {
    let ret = this.iterstack[this.itercur].reset();
    this.itercur++;

    if (this.itercur === this.iterstack.length) {
      this.iterstack.push(new MapIter(this));
    }

    return ret;
  }

}

globalThis._test_map = function () {
  let m = new map();

  m.set("1", 2);
  m.set(11, 3);
  m.set("5", 4);
  m.set("3", 5);
  m.set("3", 6);
  m.delete("3");

  for (let [key, item] of m) {
    for (let [key2, item2] of m) {
      window.console.log(key, item, key2, item2);
    }
    break;
  }

  console.log("itercur", m.itercur);

  return m;
}

function validateId(id) {
  let bad = typeof id !== "number";
  bad = bad || id !== ~~id;
  bad = bad || isNaN(id);

  if (bad) {
    throw new Error("bad number " + id);
  }

  return bad;
}

let UndefinedTag = {};

export class IDMap extends Array {
  constructor() {
    super();

    this._keys = new Set();
    this.size = 0;
  }

  has(id) {
    validateId(id);

    if (id < 0 || id >= this.length) {
      return false;
    }

    return this[id] !== undefined;
  }

  set(id, val) {
    validateId(id);

    if (id < 0) {
      console.warn("got -1 id in IDMap");
      return;
    }

    if (id >= this.length) {
      this.length = id + 1;
    }

    if (val === undefined) {
      val = UndefinedTag;
    }

    let ret = false;

    if (this[id] === undefined) {
      this.size++;
      this._keys.add(id);
      ret = true;
    }

    this[id] = val;
    return ret;
  }

  /* we allow -1, which always returns undefined*/
  get(id) {
    validateId(id);

    if (id === -1) {
      return undefined;
    } else if (id < 0) {
      console.warn("id was negative");
      return undefined;
    }

    let ret = id < this.length ? this[id] : undefined;
    ret = ret === UndefinedTag ? undefined : ret;

    return ret;
  }

  delete(id) {
    if (!this.has(id)) {
      return false;
    }

    this._keys.remove(id);
    this[id] = undefined;
    this.size--;

    return true;
  }

  keys() {
    let this2 = this;
    return (function* () {
      for (let id of this2._keys) {
        yield id;
      }
    })();
  }

  values() {
    let this2 = this;
    return (function* () {
      for (let id of this2._keys) {
        yield this2[id];
      }
    })();
  }

  [Symbol.iterator]() {
    let this2 = this;
    let iteritem = [0, 0];

    return (function* () {
      for (let id of this2._keys) {
        iteritem[0] = id;
        iteritem[1] = this2[id];

        if (iteritem[1] === UndefinedTag) {
          iteritem[1] = undefined;
        }

        yield iteritem;
      }
    })();
  }
}

globalThis._test_idmap = function () {
  let map = new IDMap();

  for (let i = 0; i < 5; i++) {
    let id = ~~(Math.random()*55);

    map.set(id, "yay" + i);
  }

  for (let [key, val] of map) {
    window.console.log(key, val, map.has(key), map.get(key));
  }

  return map;
}

let HW = 0, HELEM = 1, HTOT = 2;

function heaplog() {
  //window.console.log(...arguments);
}

export class MinHeapQueue {
  constructor(iter, iterw = iter) {
    this.heap = [];
    this.freelist = [];
    this.length = 0;
    this.end = 0;

    if (iter) {
      let witer = iterw[Symbol.iterator]();

      for (let item of iter) {
        let w = witer.next().value;
        this.push(item, w);
      }
    }
  }

  push(e, w) {
    if (typeof w !== "number") {
      throw new Error("w must be a number");
    }

    if (isNaN(w)) {
      throw new Error("NaN");
    }

    this.length++;
    let depth = Math.ceil(Math.log(this.length)/Math.log(2.0));
    let tot = Math.pow(2, depth) + 1;

    heaplog(depth, tot);

    if (this.heap.length < tot*HTOT) {
      let start = this.heap.length/HTOT;

      for (let i = start; i < tot; i++) {
        this.freelist.push(i*HTOT);
      }
    }

    let heap = this.heap;
    heap.length = tot*HTOT;

    let n = this.freelist.pop();

    heaplog("freelist", this.freelist);
    this.end = Math.max(this.end, n);

    heap[n] = w;
    heap[n + 1] = e;

    while (n > 0) {
      n /= HTOT;

      let p = (n - 1)>>1;
      n *= HTOT;
      p *= HTOT;

      if (heap[p] === undefined || heap[p] > w) {
        if (n === this.end) {
          this.end = p;
        }

        heap[n] = heap[p];
        heap[n + 1] = heap[p + 1];

        heap[p] = w;
        heap[p + 1] = e;

        n = p;
      } else {
        break;
      }
    }
  }

  pop() {
    if (this.length === 0) {
      return undefined;
      //throw new Error("heap is empty");
    }

    let heap = this.heap;

    if (this.end === 0) {
      let ret = heap[1];
      this.freelist.push(0);
      heap[0] = undefined;

      this.length = 0;

      return ret;
    }

    let ret = heap[1];

    let end = this.end;

    function swap(n1, n2) {
      let t = heap[n1];
      heap[n1] = heap[n2];
      heap[n2] = t;

      t = heap[n1 + 1];
      heap[n1 + 1] = heap[n2 + 1];
      heap[n2 + 1] = t;
    }

    heaplog("end", end);
    heaplog(heap.concat([]));

    heap[0] = heap[end];
    heap[1] = heap[end + 1];
    heap[end] = undefined;
    heap[end + 1] = undefined;

    let n = 0;
    while (n < heap.length) {
      n /= HTOT;

      let n1 = n*2 + 1;
      let n2 = n*2 + 2;

      n1 = ~~(n1*HTOT);
      n2 = ~~(n2*HTOT);
      n = ~~(n*HTOT);

      heaplog("  ", heap[n], heap[n1], heap[n2]);

      if (heap[n1] !== undefined && heap[n2] !== undefined) {
        if (heap[n1] > heap[n2]) {
          let t = n1;
          n1 = n2;
          n2 = t;
        }

        if (heap[n] > heap[n1]) {
          swap(n, n1);
          n = n1;
        } else if (heap[n] > heap[n2]) {
          swap(n, n2);
          n = n2;
        } else {
          break;
        }
      } else if (heap[n1] !== undefined) {
        if (heap[n] > heap[n1]) {
          swap(n, n1);
          n = n1;
        } else {
          break;
        }
      } else if (heap[n2] !== undefined) {
        if (heap[n] > heap[n2]) {
          swap(n, n2);
          n = n2;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    this.freelist.push(this.end);

    heap[this.end] = undefined;
    heap[this.end + 1] = undefined;

    while (this.end > 0 && heap[this.end] === undefined) {
      this.end -= HTOT;
    }

    this.length--;

    return ret;
  }
}

globalThis.testHeapQueue = function (list1 = [1, 8, -3, 11, 33]) {
  let h = new MinHeapQueue(list1);

  window.console.log(h.heap.concat([]));

  let list = [];
  let len = h.length;

  for (let i = 0; i < len; i++) {
    list.push(h.pop());
  }

  window.console.log(h.heap.concat([]));

  return list;
}

export class Queue {
  constructor(n = 32) {
    n = Math.max(n, 8);

    this.initialSize = n;

    this.queue = new Array(n);
    this.a = 0;
    this.b = 0;
    this.length = 0;
  }

  enqueue(item) {
    let qlen = this.queue.length;

    let b = this.b;

    this.queue[b] = item;
    this.b = (this.b + 1)%qlen;

    if (this.length >= qlen || this.a === this.b) {
      let newsize = qlen<<1;
      let queue = new Array(newsize);

      for (let i = 0; i < qlen; i++) {
        let i2 = (i + this.a)%qlen;

        queue[i] = this.queue[i2];
      }

      this.a = 0;
      this.b = qlen;
      this.queue = queue;
    }

    this.length++;
  }

  clear(clearData = true) {
    this.queue.length = this.initialSize;

    if (clearData) {
      for (let i = 0; i < this.queue.length; i++) {
        this.queue[i] = undefined;
      }
    }

    this.a = this.b = 0;
    this.length = 0;

    return this;
  }

  dequeue() {
    if (this.length === 0) {
      return undefined;
    }
    this.length--;

    let ret = this.queue[this.a];

    this.queue[this.a] = undefined;

    this.a = (this.a + 1)%this.queue.length;
    return ret;
  }
}

globalThis._testQueue = function (steps = 15, samples = 15) {
  let queue = new Queue(3);

  for (let i = 0; i < steps; i++) {
    let list = [];

    for (let j = 0; j < samples; j++) {
      let item = {f: Math.random()};
      list.push(item);

      queue.enqueue(item);
    }

    let j = 0;

    while (queue.length > 0) {
      let item = queue.dequeue();

      if (item !== list[j]) {
        console.log(item, list);
        throw new Error("got wrong item", item);
      }

      j++;

      if (j > 10000) {
        console.error("Infinite loop error");
        break;
      }
    }
  }
}


export class ArrayPool {
  constructor() {
    this.pools = new Map();
    this.map = new Array(1024);
  }

  get(n, clear) {
    let pool;

    if (n < 1024) {
      pool = this.map[n];
    } else {
      pool = this.pools.get(n);
    }

    if (!pool) {
      let tot;

      if (n > 512) {
        tot = 32;
      } else if (n > 256) {
        tot = 64;
      } else if (n > 128) {
        tot = 256;
      } else if (n > 64) {
        tot = 512;
      } else {
        tot = 1024;
      }

      pool = new cachering(() => new Array(n), tot);
      if (n < 1024) {
        this.map[n] = pool;
      }
      this.pools.set(n, pool);

      return this.get(n, clear);
    }

    let ret = pool.next();
    if (ret.length !== n) {
      console.warn("Array length was set", n, ret);
      ret.length = n;
    }

    if (clear) {
      for (let i = 0; i < n; i++) {
        ret[i] = undefined;
      }
    }

    return ret;
  }
}
