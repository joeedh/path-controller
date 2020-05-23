import './polyfill.js';
import './struct.js';
import './mobile-detect.js';

let colormap = {
  black   : 30,
  red     : 31,
  green   : 32,
  yellow  : 33,
  blue    : 34,
  magenta : 35,
  cyan    : 36,
  white   : 37,
  bold    : 4,
  reset   : 0
};

export let termColorMap = {};
for (let k in colormap) {
  termColorMap[k] = colormap[k];
  termColorMap[colormap[k]] = k;
}
window.termColorMap = termColorMap;

export function termColor(s, color = colormap.reset) {
  if (typeof color === "string") {
    color = colormap[color] || colormap.reset;
  }

  return `\u001b[${color}m${s}\u001b[0m`;
}

window.termColor = termColor;

export class MovingAvg extends Array {
  constructor(size=64) {
    super();

    this.length = size;
    this.cur = 0;
    this.used = 0;
    this.sum = 0;
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
    this.cur = (this.cur + 1) % this.length;

    return this.sample();
  }

  sample() {
    return this.used ? this.sum / this.used : 0.0;
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
window._pollTimer = pollTimer;

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

let SmartConsoleTag = Symbol("SmartConsoleTag");
let tagid = 0;

export class SmartConsoleContext {
  constructor(name, console) {
    this.name = name;

    let c = [random(), random(), random()];
    let sum = Math.sqrt(c[0]*c[0] + c[1]*c[1] + c[2]*c[2]);
    sum = 255 / sum;

    let r = ~~(c[0]*sum);
    let g = ~~(c[1]*sum);
    let b = ~~(c[2]*sum);

    this.color = `rgb(${r},${g},${b})`;
    this.__console = console;

    this.timeInterval = 1500;

    this._last = undefined;
    this._data = {};
    this._data_length = 0;
    this.maxCache = 256;
  }


  hash(args) {
    let sum = 0;
    let mul = (1<<19)-1, off = (1<<27)-1;
    let i = 0;

    function dohash(h) {
      h = (h*mul + off + i*mul*0.25) & mul;

      i++;
      sum = sum ^ h;
    }

    let visit = new Set();

    let recurse = (n) => {
      if (typeof n === "string") {
        dohash(strhash(n));
      } else if (typeof n === "undefined" || n === null) {
        dohash(0);
      } else if (typeof n === "object") {
        if (n[SmartConsoleTag] === undefined) {
          n[SmartConsoleTag] = tagid++;
        }

        if (visit.has(n[SmartConsoleTag])) {
          return;
        }

        visit.add(n[SmartConsoleTag]);

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
        dohash(strhash(""+n.name));
      }
    };

    //let str = "";

    for (let i=0; i<args.length; i++) {
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
        time    : 0,
        count   : 0
      };

      this._data_length++;
    }

    return this._data[key];
  }

  _check(args) {
    let d = this._getData(args);
    let last = this.last;

    this.last = d;

    if (d !== last) {
      d.count = 0;
      d.time = time_ms();
      return true;
    }

    if (time_ms() - d.time > this.timeInterval) {
      //d.time = time_ms();
      //return true;
    }

    return false;
  }

  log() {

    if (this._check(arguments)) {
      window.console.log("%c", "color:"+this.color, ...arguments);
    }
  }

  warn() {
    if (this._check(arguments)) {
      window.console.log("%c"+this.name, "color : "+this.color, ...arguments);
    }
  }

  trace() {
    if (this._check(arguments)) {
      window.console.trace(...arguments);
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

window.tm = 0.0;

var EmptySlot = {};

export function getClassParent(cls) {
  let p = cls.prototype;

  if (p) p = p.__proto__;
  if (p) p = p.constructor
  ;
  return p;
}

//make global for debugging purposes in console
window._getClassParent = getClassParent;

export function list(iterable) {
  let ret = [];

  for (let item of iterable) {
    ret.push(item);
  }

  return ret;
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

window._getAllKeys = getAllKeys;

export function btoa(buf) {
  if (buf instanceof ArrayBuffer) {
    buf = new Uint8Array(buf);
  }

  if (typeof buf == "string" || buf instanceof String) {
    return window.btoa(buf);
  }

  var ret = "";
  for (var i=0; i<buf.length; i++) {
    ret += String.fromCharCode(buf[i]);
  }

  return btoa(ret);
};

export function formatNumberUI(val, isInt=false, decimals=5) {
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
    val = ""+Math.floor(val);
  }

  return val;
}

//window.formatNumberUI = formatNumberUI;

export function atob(buf) {
  let data = window.atob(buf);
  let ret = [];

  for (let i=0; i<data.length; i++) {
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

  for (var i=0; i<3; i++) {
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

export class cachering extends Array {
  constructor(func, size) {
    super()

    this.cur = 0;

    for (var i=0; i<size; i++) {
      this.push(func());
    }
  }

  static fromConstructor(cls, size) {
    var func = function() {
      return new cls();
    }

    return new cachering(func, size);
  }

  next() {
    var ret = this[this.cur];
    this.cur = (this.cur+1)%this.length;

    return ret;
  }
}

export class SetIter {
  constructor(set) {
    this.set = set;
    this.i   = 0;
    this.ret = {done : false, value : undefined};
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

    if (input != undefined) {
      if (Symbol.iterator in input) {
        for (var item of input) {
          this.add(item);
        }
      } else if ("forEach" in input) {
        input.forEach(function(item) {
          this.add(item);
        }, this);
      } else if (input instanceof Array) {
        for (var i=0; i<input.length; i++) {
          this.add(input[i]);
        }
      }
    }
  }

  [Symbol.iterator] () {
    return new SetIter(this);
  }

  clear() {
    this.items.length = 0;
    this.keys = {};
    this.freelist.length = 0;
    this.length = 0;

    return this;
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

  remove(item, ignore_existence) {
    var key = item[Symbol.keystr]();

    if (!(key in this.keys)) {
      if (!ignore_existence) {
        console.trace("Warning, item", item, "is not in set");
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
    for (var i=0; i<this.items.length; i++) {
      var item = this.items[i];

      if (item === EmptySlot)
        continue;

      thisvar != undefined ? func.call(thisvar, item) : func(item);
    }
  }
}

export class HashIter {
  constructor(hash) {
    this.hash = hash;
    this.i = 0;
    this.ret = {done : false, value : undefined};
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
      } catch(error) {
        console.log(":::", this._items.length, key, key2, val)
        throw error;
      }

      this._keys[key2] = i;
      this.length++;
    } else {
      i = this._keys[key2];
    }

    this._items[i] = key;
    this._items[i+1] = val;
  }

  remove(key) {
    var key2 = key[Symbol.keystr]();

    if (!(key2 in this._keys)) {
      console.trace("Warning, key not in hashtable:", key, key2);
      return;
    }

    var i = this._keys[key2];

    this._items[i] = _hash_null;
    this._items[i+1] = _hash_null;

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
      console.trace("Warning, item not in hash", key, key2);
      return undefined;
    }

    return this._items[this._keys[key2]+1];
  }

  add(key, val) {
    return this.set(key, val);
  }

  keys() {
    var ret = [];

    for (var i=0; i<this._items.length; i += 2) {
      var key = this._items[i];

      if (key !== _hash_null) {
        ret.push(key);
      }
    }

    return ret;
  }

  values() {
    var ret = [];

    for (var i=0; i<this._items.length; i += 2) {
      var item = this._items[i+1];

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

export class IDGen {
  constructor() {
    this._cur = 1;
  }

  next() {
    return this._cur++;
  }

  copy() {
    let ret = new IDGen();
    ret._cur = this._cur;
    return ret;
  }

  max_cur(id) {
    this._cur = Math.max(this._cur, id+1);
  }

  toJSON() {
    return {
      _cur : this._cur
    };
  }

  static fromJSON(obj) {
    var ret = new IDGen();
    ret._cur = obj._cur;
    return ret;
  }
}

IDGen.STRUCT = `
IDGen {
  _cur : int;
}
`;
nstructjs.manager.add_class(IDGen);


function get_callstack(err) {
  var callstack = [];
  var isCallstackPopulated = false;

  var err_was_undefined = err == undefined;

  if (err == undefined) {
    try {
      _idontexist.idontexist+=0; //doesn't exist- that's the point
    } catch(err1) {
      err = err1;
    }
  }

  if (err != undefined) {
    if (err.stack) { //Firefox
      var lines = err.stack.split('\n');
      var len=lines.length;
      for (var i=0; i<len; i++) {
        if (1) {
          lines[i] = lines[i].replace(/@http\:\/\/.*\//, "|")
          var l = lines[i].split("|")
          lines[i] = l[1] + ": " + l[0]
          lines[i] = lines[i].trim()
          callstack.push(lines[i]);
        }
      }

      //Remove call to printStackTrace()
      if (err_was_undefined) {
        //callstack.shift();
      }
      isCallstackPopulated = true;
    }
    else if (window.opera && e.message) { //Opera
      var lines = err.message.split('\n');
      var len=lines.length;
      for (var i=0; i<len; i++) {
        if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
          var entry = lines[i];
          //Append next line also since it has the file info
          if (lines[i+1]) {
            entry += ' at ' + lines[i+1];
            i++;
          }
          callstack.push(entry);
        }
      }
      //Remove call to printStackTrace()
      if (err_was_undefined) {
        callstack.shift();
      }
      isCallstackPopulated = true;
    }
   }

    var limit = 24;
    if (!isCallstackPopulated) { //IE and Safari
      var currentFunction = arguments.callee.caller;
      var i = 0;
      while (currentFunction && i < 24) {
        var fn = currentFunction.toString();
        var fname = fn.substring(fn.indexOf("function") + 8, fn.indexOf('')) || 'anonymous';
        callstack.push(fname);
        currentFunction = currentFunction.caller;

        i++;
      }
    }

  return callstack;
}

export function print_stack(err) {
  try {
    var cs = get_callstack(err);
  } catch (err2) {
    console.log("Could not fetch call stack.");
    return;
  }

  console.log("Callstack:");
  for (var i=0; i<cs.length; i++) {
    console.log(cs[i]);
  }
}

window.get_callstack = get_callstack;
window.print_stack = print_stack;

export function fetch_file(path) {
    var url = location.origin + "/" + path

    var req = new XMLHttpRequest(
    );

    return new Promise(function(accept, reject) {
      req.open("GET", url)
      req.onreadystatechange = function(e) {
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
  return ~~(((1<<30)-1) & (~~x))
}

export class MersenneRandom {
  constructor(seed) {
    // Initialize the index to 0
    this.index = 624;
    this.mt = new Uint32Array(624);

    this.seed(seed);
  }

  random() {
    return this.extract_number() / (1<<30);
  }

  seed(seed) {
    seed = ~~(seed*8192);

    // Initialize the index to 0
    this.index = 624;
    this.mt.fill(0, 0, this.mt.length);

    this.mt[0] = seed;  // Initialize the initial state to the seed

    for (var i=1; i<624; i++) {
      this.mt[i] = _int32(
        1812433253 * (this.mt[i - 1] ^ this.mt[i - 1] >> 30) + i);
    }
  }

  extract_number() {
    if (this.index >= 624)
      this.twist();

    var y = this.mt[this.index];

    // Right shift by 11 bits
    y = y ^ y >> 11;
    // Shift y left by 7 and take the bitwise and of 2636928640
    y = y ^ y << 7 & 2636928640;
    // Shift y left by 15 and take the bitwise and of y and 4022730752
    y = y ^ y << 15 & 4022730752;
    // Right shift by 18 bits
    y = y ^ y >> 18;

    this.index = this.index + 1;

    return _int32(y);
  }

  twist() {
    for (var i=0; i<624; i++) {
      // Get the most significant bit and add it to the less significant
      // bits of the next number
      var y = _int32((this.mt[i] & 0x80000000) +
        (this.mt[(i + 1) % 624] & 0x7fffffff));
      this.mt[i] = this.mt[(i + 397) % 624] ^ y >> 1;

      if (y % 2 != 0)
        this.mt[i] = this.mt[i] ^ 0x9908b0df;
    }

    this.index = 0;
  }
}

var _mt = new MersenneRandom(0);
export function random() {
  return _mt.extract_number() / (1<<30);
}

export function seed(n) {
//  console.trace("seed called");
  _mt.seed(n);
}

export function strhash(str) {
  var hash = 0;

  for (var i=0; i<str.length; i++) {
    var ch = str.charCodeAt(i);

    hash = hash < 0 ? -hash : hash;

    hash ^= (ch*524287 + 4323543) & ((1<<19)-1);
  }

  return hash;
}

var hashsizes = [
  /*2, 5, 11, 19, 37, 67, 127, */223, 383, 653, 1117, 1901, 3251,
   5527, 9397, 15991, 27191, 46229, 78593, 133631, 227177, 38619,
  656587, 1116209, 1897561, 3225883, 5484019, 9322861, 15848867,
  26943089, 45803279, 77865577, 132371489, 225031553
];

var FTAKEN=0, FKEY= 1, FVAL= 2, FTOT=3;

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

    for (var i=0; i<table.length; i += FTOT) {
      if (!table[i+FTAKEN]) continue;

      var key = table[i+FKEY], val = table[i+FVAL];
      this.set(key, val);
    }

    return this;
  }

  get(key) {
    var hash = typeof key == "string" ? strhash(key) : key;
    hash = typeof hash == "object" ? hash.valueOf() : hash;

    var probe = 0;

    var h = (hash + probe) % this.size;

    var _i = 0;
    while (_i++ < 50000 && this[h*FTOT+FTAKEN]) {
      if (this[h*FTOT+FKEY] ==  key) {
        return this[h*FTOT+FVAL];
      }

      probe = (probe+1)*2;
      h = (hash + probe) % this.size;
    }

    return undefined;
  }

  has(key) {
    var hash = typeof key == "string" ? strhash(key) : key;
    hash = typeof hash == "object" ? hash.valueOf() : hash;

    var probe = 0;

    var h = (hash + probe) % this.size;

    var _i = 0;
    while (_i++ < 50000 && this[h*FTOT+FTAKEN]) {
      if (this[h*FTOT+FKEY] ==  key) {
        return true;
      }

      probe = (probe+1)*2;
      h = (hash + probe) % this.size;
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

    var h = (hash + probe) % this.size;

    var _i = 0;
    while (_i++ < 50000 && this[h*FTOT+FTAKEN]) {
      if (this[h*FTOT+FKEY] ==  key) {
        this[h*FTOT+FVAL] = val;
        return;
      }

      probe = (probe+1)*2;
      h = (hash + probe) % this.size;
    }

    this[h*FTOT+FTAKEN] = 1;
    this[h*FTOT+FKEY] = key;
    this[h*FTOT+FVAL] = val;

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

    input.addEventListener("change", function(e) {
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
