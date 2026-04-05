var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// nstructjs_es6.ts
var nstructjs_es6_exports = {};
__export(nstructjs_es6_exports, {
  JSONError: () => JSONError,
  STRUCT: () => STRUCT,
  _truncateDollarSign: () => _truncateDollarSign,
  binpack: () => struct_binpack,
  consoleLogger: () => consoleLogger,
  deriveStructManager: () => deriveStructManager,
  filehelper: () => struct_filehelper,
  formatJSON: () => formatJSON,
  getEndian: () => getEndian,
  inherit: () => inherit,
  inlineRegister: () => inlineRegister,
  isRegistered: () => isRegistered,
  manager: () => manager,
  parser: () => struct_parser,
  parseutil: () => struct_parseutil,
  readJSON: () => readJSON,
  readObject: () => readObject,
  register: () => register,
  setAllowOverriding: () => setAllowOverriding,
  setDebugMode: () => setDebugMode,
  setEndian: () => setEndian,
  setTruncateDollarSign: () => setTruncateDollarSign,
  setWarningMode: () => setWarningMode,
  truncateDollarSign: () => truncateDollarSign,
  typesystem: () => struct_typesystem,
  unpack_context: () => unpack_context,
  unregister: () => unregister,
  validateJSON: () => validateJSON,
  validateStructs: () => validateStructs,
  writeJSON: () => writeJSON,
  writeObject: () => writeObject,
  write_scripts: () => write_scripts
});
var colormap = {
  "black": 30,
  "red": 31,
  "green": 32,
  "yellow": 33,
  "blue": 34,
  "magenta": 35,
  "cyan": 36,
  "white": 37,
  "reset": 0,
  "grey": 2,
  "orange": 202,
  "pink": 198,
  "brown": 314,
  "lightred": 91,
  "peach": 210
};
function tab(n, chr = " ") {
  let t = "";
  for (let i = 0; i < n; i++) {
    t += chr;
  }
  return t;
}
var termColorMap = {};
for (let k2 in colormap) {
  termColorMap[k2] = colormap[k2];
  termColorMap[colormap[k2]] = k2;
}
function termColor(s, c) {
  if (typeof s === "symbol") {
    s = s.toString();
  } else {
    s = "" + s;
  }
  if (c in colormap) c = colormap[c];
  if (c > 107) {
    let s2 = "\x1B[38;5;" + c + "m";
    return s2 + s + "\x1B[0m";
  }
  return "\x1B[" + c + "m" + s + "\x1B[0m";
}
function termPrint(...args2) {
  let s = "";
  for (let i = 0; i < args2.length; i++) {
    if (i > 0) {
      s += " ";
    }
    s += args2[i];
  }
  let re1a = /\u001b\[[1-9][0-9]?m/;
  let re1b = /\u001b\[[1-9][0-9];[0-9][0-9]?;[0-9]+m/;
  let re2 = /\u001b\[0m/;
  let endtag = "\x1B[0m";
  function tok(s3, type) {
    return {
      type,
      value: s3
    };
  }
  let tokdef_arr = [
    [re1a, "start"],
    [re1b, "start"],
    [re2, "end"]
  ];
  let s2 = s;
  let tokens = [];
  while (s2.length > 0) {
    let ok = false;
    let mintk = void 0, mini = void 0;
    let minslice = void 0, mintype = void 0;
    for (let tk of tokdef_arr) {
      let i = s2.search(tk[0]);
      if (i >= 0 && (mini === void 0 || i < mini)) {
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
  let out = "";
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
function list(iter) {
  let ret = [];
  for (let item of iter) {
    ret.push(item);
  }
  return ret;
}
var util = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  tab,
  termColorMap,
  termColor,
  termPrint,
  list
});
function print_lines(ld, lineno, col, printColors, tokenArg) {
  let buf = "";
  let lines = ld.split("\n");
  let istart = Math.max(lineno - 5, 0);
  let iend = Math.min(lineno + 3, lines.length);
  let color = printColors ? (c) => c : termColor;
  for (let i = istart; i < iend; i++) {
    let l = "" + (i + 1);
    while (l.length < 3) {
      l = " " + l;
    }
    l += `: ${lines[i]}
`;
    if (i === lineno && tokenArg && tokenArg.value.length === 1) {
      l = l.slice(0, col + 5) + color(l[col + 5], "yellow") + l.slice(col + 6, l.length);
    }
    buf += l;
    if (i === lineno) {
      let colstr = "     ";
      for (let j = 0; j < col; j++) {
        colstr += " ";
      }
      colstr += color("^", "red");
      buf += colstr + "\n";
    }
  }
  buf = "------------------\n" + buf + "\n==================\n";
  return buf;
}
var token = class {
  type;
  value;
  lexpos;
  lineno;
  col;
  lexer;
  parser;
  constructor(type, val, lexpos, lineno, lex, prs, col) {
    this.type = type;
    this.value = val;
    this.lexpos = lexpos;
    this.lineno = lineno;
    this.col = col;
    this.lexer = lex;
    this.parser = prs;
  }
  toString() {
    if (this.value !== void 0) return "token(type=" + this.type + ", value='" + this.value + "')";
    else return "token(type=" + this.type + ")";
  }
};
var tokdef = class {
  name;
  re;
  func;
  example;
  constructor(name, regexpr, func2, example) {
    this.name = name;
    this.re = regexpr;
    this.func = func2;
    this.example = example;
    if (example === void 0 && regexpr) {
      let s = "" + regexpr;
      if (s.startsWith("/") && s.endsWith("/")) {
        s = s.slice(1, s.length - 1);
      }
      if (s.startsWith("\\")) {
        s = s.slice(1, s.length);
      }
      s = s.trim();
      if (s.length === 1) {
        this.example = s;
      }
    }
  }
};
var PUTIL_ParseError = class extends Error {
  constructor(msg) {
    super(msg);
  }
};
var lexer = class {
  tokdef;
  tokens;
  lexpos;
  lexdata;
  colmap;
  lineno;
  printTokens;
  linestart;
  errfunc;
  linemap;
  tokints;
  statestack;
  states;
  statedata;
  peeked_tokens;
  logger;
  constructor(tokdef_arr, errfunc) {
    this.tokdef = tokdef_arr;
    this.tokens = new Array();
    this.lexpos = 0;
    this.lexdata = "";
    this.colmap = void 0;
    this.lineno = 0;
    this.printTokens = false;
    this.linestart = 0;
    this.errfunc = errfunc;
    this.linemap = void 0;
    this.tokints = {};
    for (let i = 0; i < tokdef_arr.length; i++) {
      this.tokints[tokdef_arr[i].name] = i;
    }
    this.statestack = [["__main__", 0]];
    this.states = { "__main__": [tokdef_arr, errfunc] };
    this.statedata = 0;
    this.peeked_tokens = [];
    this.logger = function(...args2) {
      console.log(...args2);
    };
  }
  add_state(name, tokdef_arr, errfunc) {
    if (errfunc === void 0) {
      errfunc = function(_lexer2) {
        return true;
      };
    }
    this.states[name] = [tokdef_arr, errfunc];
  }
  tok_int(_name) {
  }
  push_state(state, statedata) {
    this.statestack.push([state, statedata]);
    let st = this.states[state];
    this.statedata = statedata;
    this.tokdef = st[0];
    this.errfunc = st[1];
  }
  pop_state() {
    let item = this.statestack[this.statestack.length - 1];
    let state = this.states[item[0]];
    this.tokdef = state[0];
    this.errfunc = state[1];
    this.statedata = item[1];
  }
  input(str) {
    let linemap = this.linemap = new Array(str.length);
    let lineno = 0;
    let col = 0;
    let colmap = this.colmap = new Array(str.length);
    for (let i = 0; i < str.length; i++, col++) {
      let c = str[i];
      linemap[i] = lineno;
      colmap[i] = col;
      if (c === "\n") {
        lineno++;
        col = 0;
      }
    }
    while (this.statestack.length > 1) {
      this.pop_state();
    }
    this.lexdata = str;
    this.lexpos = 0;
    this.lineno = 0;
    this.tokens = new Array();
    this.peeked_tokens = [];
  }
  error() {
    if (this.errfunc !== void 0 && !this.errfunc(this)) return;
    let safepos = Math.min(this.lexpos, this.lexdata.length - 1);
    let line2 = this.linemap[safepos];
    let col = this.colmap[safepos];
    let s = print_lines(this.lexdata, line2, col, true);
    this.logger("  " + s);
    this.logger("Syntax error near line " + (this.lineno + 1));
    let next = Math.min(this.lexpos + 8, this.lexdata.length);
    throw new PUTIL_ParseError("Parse error");
  }
  peek() {
    let tok = this.next(true);
    if (tok === void 0) return void 0;
    this.peeked_tokens.push(tok);
    return tok;
  }
  peeknext() {
    if (this.peeked_tokens.length > 0) {
      return this.peeked_tokens[0];
    }
    return this.peek();
  }
  at_end() {
    return this.lexpos >= this.lexdata.length && this.peeked_tokens.length === 0;
  }
  //ignore_peek is optional, false
  next(ignore_peek) {
    if (!ignore_peek && this.peeked_tokens.length > 0) {
      let tok2 = this.peeked_tokens[0];
      this.peeked_tokens.shift();
      if (!ignore_peek && this.printTokens) {
        this.logger("" + tok2);
      }
      return tok2;
    }
    if (this.lexpos >= this.lexdata.length) return void 0;
    let ts = this.tokdef;
    let tlen = ts.length;
    let lexdata = this.lexdata.slice(this.lexpos, this.lexdata.length);
    let results = [];
    for (var i = 0; i < tlen; i++) {
      let t = ts[i];
      if (t.re === void 0) continue;
      let res = t.re.exec(lexdata);
      if (res !== null && res !== void 0 && res.index === 0) {
        results.push([t, res]);
      }
    }
    let max_res = 0;
    let theres = void 0;
    for (var i = 0; i < results.length; i++) {
      let res = results[i];
      if (res[1][0].length > max_res) {
        theres = res;
        max_res = res[1][0].length;
      }
    }
    if (theres === void 0) {
      this.error();
      return;
    }
    let def = theres[0];
    let col = this.colmap[Math.min(this.lexpos, this.lexdata.length - 1)];
    if (this.lexpos < this.lexdata.length) {
      this.lineno = this.linemap[this.lexpos];
    }
    let tok = new token(def.name, theres[1][0], this.lexpos, this.lineno, this, void 0, col);
    this.lexpos += tok.value.length;
    if (def.func) {
      let result = def.func(tok);
      if (result === void 0) {
        return this.next();
      }
      tok = result;
    }
    if (!ignore_peek && this.printTokens) {
      this.logger("" + tok);
    }
    return tok;
  }
};
var parser = class {
  lexer;
  errfunc;
  start;
  logger;
  constructor(lex, errfunc) {
    this.lexer = lex;
    this.errfunc = errfunc;
    this.start = void 0;
    this.logger = function(...args2) {
      console.log(...args2);
    };
  }
  parse(data, err_on_unconsumed) {
    if (err_on_unconsumed === void 0) err_on_unconsumed = true;
    if (data !== void 0) this.lexer.input(data);
    let ret = this.start(this);
    if (err_on_unconsumed && !this.lexer.at_end() && this.lexer.next() !== void 0) {
      this.error(void 0, "parser did not consume entire input");
    }
    return ret;
  }
  input(data) {
    this.lexer.input(data);
  }
  error(tokenArg, msg) {
    let estr;
    if (msg === void 0) msg = "";
    if (tokenArg === void 0) estr = "Parse error at end of input: " + msg;
    else estr = `Parse error at line ${tokenArg.lineno + 1}:${tokenArg.col + 1}: ${msg}`;
    let ld = this.lexer.lexdata;
    let lineno = tokenArg ? tokenArg.lineno : this.lexer.linemap[this.lexer.linemap.length - 1];
    let col = tokenArg ? tokenArg.col : 0;
    ld = ld.replace(/\r/g, "");
    this.logger(print_lines(ld, lineno, col, true, tokenArg));
    this.logger(estr);
    if (this.errfunc && !this.errfunc(tokenArg)) {
      return;
    }
    throw new PUTIL_ParseError(estr);
  }
  peek() {
    let tok = this.lexer.peek();
    if (tok !== void 0) tok.parser = this;
    return tok;
  }
  peeknext() {
    let tok = this.lexer.peeknext();
    if (tok !== void 0) tok.parser = this;
    return tok;
  }
  next() {
    let tok = this.lexer.next();
    if (tok !== void 0) tok.parser = this;
    return tok;
  }
  optional(type) {
    let tok = this.peeknext();
    if (tok === void 0) return false;
    if (tok.type === type) {
      this.next();
      return true;
    }
    return false;
  }
  at_end() {
    return this.lexer.at_end();
  }
  expect(type, msg) {
    let tok = this.next();
    if (msg === void 0) {
      msg = type;
      for (let tk of this.lexer.tokdef) {
        if (tk.name === type && tk.example) {
          msg = tk.example;
        }
      }
    }
    if (tok === void 0 || tok.type !== type) {
      this.error(tok, "Expected " + msg);
    }
    return tok.value;
  }
};
function test_parser() {
  let basic_types = /* @__PURE__ */ new Set(["int", "float", "double", "vec2", "vec3", "vec4", "mat4", "string"]);
  let reserved_tokens = /* @__PURE__ */ new Set([
    "int",
    "float",
    "double",
    "vec2",
    "vec3",
    "vec4",
    "mat4",
    "string",
    "static_string",
    "array"
  ]);
  function tk(name, re, func2) {
    return new tokdef(name, re, func2);
  }
  let tokens = [
    tk("ID", /[a-zA-Z]+[a-zA-Z0-9_]*/, function(t2) {
      if (reserved_tokens.has(t2.value)) {
        t2.type = t2.value.toUpperCase();
      }
      return t2;
    }),
    tk("OPEN", /\{/),
    tk("CLOSE", /}/),
    tk("COLON", /:/),
    tk("JSCRIPT", /\|/, function(t2) {
      let js = "";
      let lex2 = t2.lexer;
      while (lex2.lexpos < lex2.lexdata.length) {
        let c = lex2.lexdata[lex2.lexpos];
        if (c === "\n") break;
        js += c;
        lex2.lexpos++;
      }
      if (js.endsWith(";")) {
        js = js.slice(0, js.length - 1);
        lex2.lexpos--;
      }
      t2.value = js;
      return t2;
    }),
    tk("LPARAM", /\(/),
    tk("RPARAM", /\)/),
    tk("COMMA", /,/),
    tk("NUM", /[0-9]/),
    tk("SEMI", /;/),
    tk("NEWLINE", /\n/, function(t2) {
      t2.lexer.lineno += 1;
      return void 0;
    }),
    tk("SPACE", / |\t/, function(_t) {
      return void 0;
    })
  ];
  for (let rt of reserved_tokens) {
    tokens.push(tk(rt.toUpperCase()));
  }
  let a = `
  Loop {
    eid : int;
    flag : int;
    index : int;
    type : int;

    co : vec3;
    no : vec3;
    loop : int | eid(loop);
    edges : array(e, int) | e.eid;

    loops :, array(Loop);
  }
  `;
  function errfunc(_lex) {
    return true;
  }
  let lex = new lexer(tokens, errfunc);
  console.log("Testing lexical scanner...");
  lex.input(a);
  let t;
  while (t = lex.next()) {
    console.log(t.toString());
  }
  let parse = new parser(lex);
  parse.input(a);
  function p_Array(p) {
    p.expect("ARRAY");
    p.expect("LPARAM");
    let arraytype = p_Type(p);
    let itername = "";
    if (p.optional("COMMA")) {
      itername = arraytype.data || "";
      arraytype = p_Type(p);
    }
    p.expect("RPARAM");
    return { type: "array", data: { type: arraytype, iname: itername } };
  }
  function p_Type(p) {
    let tok = p.peek();
    if (tok.type === "ID") {
      p.next();
      return { type: "struct", data: '"' + tok.value + '"' };
    } else if (basic_types.has(tok.type.toLowerCase())) {
      p.next();
      return { type: tok.type.toLowerCase() };
    } else if (tok.type === "ARRAY") {
      return p_Array(p);
    } else {
      p.error(tok, "invalid type " + tok.type);
      return { type: "error" };
    }
  }
  function p_Field(p) {
    let field = {
      name: "",
      type: { type: "" },
      set: void 0,
      get: void 0
    };
    console.log("-----", p.peek().type);
    field.name = p.expect("ID", "struct field name");
    p.expect("COLON");
    field.type = p_Type(p);
    let tok = p.peek();
    if (tok && tok.type === "JSCRIPT") {
      field.get = tok.value;
      p.next();
    }
    tok = p.peek();
    if (tok && tok.type === "JSCRIPT") {
      field.set = tok.value;
      p.next();
    }
    p.expect("SEMI");
    return field;
  }
  function p_Struct(p) {
    let st = {
      name: "",
      fields: []
    };
    st.name = p.expect("ID", "struct name");
    p.expect("OPEN");
    while (1) {
      if (p.at_end()) {
        p.error(void 0);
      } else if (p.optional("CLOSE")) {
        break;
      } else {
        st.fields.push(p_Field(p));
      }
    }
    return st;
  }
  let ret = p_Struct(parse);
  console.log(JSON.stringify(ret));
}
var struct_parseutil = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  token,
  tokdef,
  PUTIL_ParseError,
  lexer,
  parser
});
var NStruct = class {
  fields;
  id;
  name;
  constructor(name) {
    this.fields = [];
    this.id = -1;
    this.name = name;
  }
};
var StructEnum = {
  INT: 0,
  FLOAT: 1,
  DOUBLE: 2,
  STRING: 7,
  STATIC_STRING: 8,
  //fixed-length string
  STRUCT: 9,
  TSTRUCT: 10,
  ARRAY: 11,
  ITER: 12,
  SHORT: 13,
  BYTE: 14,
  BOOL: 15,
  ITERKEYS: 16,
  UINT: 17,
  USHORT: 18,
  STATIC_ARRAY: 19,
  SIGNED_BYTE: 20,
  OPTIONAL: 21
};
var ArrayTypes = /* @__PURE__ */ new Set([StructEnum.STATIC_ARRAY, StructEnum.ARRAY, StructEnum.ITERKEYS, StructEnum.ITER]);
var ValueTypes = /* @__PURE__ */ new Set([
  StructEnum.INT,
  StructEnum.FLOAT,
  StructEnum.DOUBLE,
  StructEnum.STRING,
  StructEnum.STATIC_STRING,
  StructEnum.SHORT,
  StructEnum.BYTE,
  StructEnum.BOOL,
  StructEnum.UINT,
  StructEnum.USHORT,
  StructEnum.SIGNED_BYTE
]);
var StructTypes = {
  "int": StructEnum.INT,
  "uint": StructEnum.UINT,
  "ushort": StructEnum.USHORT,
  "float": StructEnum.FLOAT,
  "double": StructEnum.DOUBLE,
  "string": StructEnum.STRING,
  "static_string": StructEnum.STATIC_STRING,
  "struct": StructEnum.STRUCT,
  "abstract": StructEnum.TSTRUCT,
  "array": StructEnum.ARRAY,
  "iter": StructEnum.ITER,
  "short": StructEnum.SHORT,
  "byte": StructEnum.BYTE,
  "bool": StructEnum.BOOL,
  "iterkeys": StructEnum.ITERKEYS,
  "sbyte": StructEnum.SIGNED_BYTE,
  "optional": StructEnum.OPTIONAL
};
var StructTypeMap = {};
for (let k2 in StructTypes) {
  StructTypeMap[StructTypes[k2]] = k2;
}
function gen_tabstr$2(t) {
  let s = "";
  for (let i = 0; i < t; i++) {
    s += "  ";
  }
  return s;
}
function stripComments(buf) {
  let s = "";
  const MAIN = 0, COMMENT = 1, STR = 2;
  let strs = /* @__PURE__ */ new Set(["'", '"', "`"]);
  let mode = MAIN;
  let strlit = "";
  let escape = false;
  for (let i = 0; i < buf.length; i++) {
    let p = i > 0 ? buf[i - 1] : void 0;
    let c = buf[i];
    let n = i < buf.length - 1 ? buf[i + 1] : void 0;
    switch (mode) {
      case MAIN:
        if (c === "/" && n === "/") {
          mode = COMMENT;
          continue;
        }
        if (strs.has(c)) {
          strlit = c;
          mode = STR;
        }
        s += c;
        break;
      case COMMENT:
        if (n === "\n") {
          mode = MAIN;
        }
        break;
      case STR:
        if (c === strlit && !escape) {
          mode = MAIN;
        }
        s += c;
        break;
    }
    if (c === "\\") {
      escape = !escape;
    } else {
      escape = false;
    }
  }
  return s;
}
function StructParser() {
  let basic_types = /* @__PURE__ */ new Set(["int", "float", "double", "string", "short", "byte", "sbyte", "bool", "uint", "ushort"]);
  let reserved_tokens = /* @__PURE__ */ new Set([
    "int",
    "float",
    "double",
    "string",
    "static_string",
    "array",
    "iter",
    "abstract",
    "short",
    "byte",
    "sbyte",
    "bool",
    "iterkeys",
    "uint",
    "ushort",
    "static_array",
    "optional"
  ]);
  function tk(name, re, func2, example) {
    return new tokdef(name, re, func2, example);
  }
  let tokens = [
    tk(
      "ID",
      /[a-zA-Z_$]+[a-zA-Z0-9_\.$]*/,
      function(t) {
        if (reserved_tokens.has(t.value)) {
          t.type = t.value.toUpperCase();
        }
        return t;
      },
      "identifier"
    ),
    tk("OPEN", /\{/),
    tk("EQUALS", /=/),
    tk("CLOSE", /}/),
    tk("STRLIT", /\"[^"]*\"/, (t) => {
      t.value = t.value.slice(1, t.value.length - 1);
      return t;
    }),
    tk("STRLIT", /\'[^']*\'/, (t) => {
      t.value = t.value.slice(1, t.value.length - 1);
      return t;
    }),
    tk("COLON", /:/),
    tk("OPT_COLON", /\?:/),
    tk("SOPEN", /\[/),
    tk("SCLOSE", /\]/),
    tk("JSCRIPT", /\|/, function(t) {
      let js = "";
      let lex2 = t.lexer;
      let p;
      while (lex2.lexpos < lex2.lexdata.length) {
        let c = lex2.lexdata[lex2.lexpos];
        if (c === "\n") break;
        if (c === "/" && p === "/") {
          js = js.slice(0, js.length - 1);
          lex2.lexpos--;
          break;
        }
        js += c;
        lex2.lexpos++;
        p = c;
      }
      while (js.trim().endsWith(";")) {
        js = js.slice(0, js.length - 1);
        lex2.lexpos--;
      }
      t.value = js.trim();
      return t;
    }),
    tk("COMMENT", /\/\/.*[\n\r]/),
    tk("LPARAM", /\(/),
    tk("RPARAM", /\)/),
    tk("COMMA", /,/),
    tk("NUM", /[0-9]+/, void 0, "number"),
    tk("SEMI", /;/),
    tk(
      "NEWLINE",
      /\n/,
      function(t) {
        t.lexer.lineno += 1;
        return void 0;
      },
      "newline"
    ),
    tk(
      "SPACE",
      / |\t/,
      function(_t) {
        return void 0;
      },
      "whitespace"
    )
  ];
  reserved_tokens.forEach(function(rt) {
    tokens.push(tk(rt.toUpperCase()));
  });
  function errfunc(_lex) {
    return true;
  }
  class Lexer extends lexer {
    input(str) {
      return super.input(str);
    }
  }
  let lex = new Lexer(tokens, errfunc);
  let parser$1 = new parser(lex);
  function p_Static_String(p) {
    p.expect("STATIC_STRING");
    p.expect("SOPEN");
    let num = p.expect("NUM");
    p.expect("SCLOSE");
    return { type: StructEnum.STATIC_STRING, data: { maxlength: num } };
  }
  function p_DataRef(p) {
    p.expect("DATAREF");
    p.expect("LPARAM");
    let tname = p.expect("ID");
    p.expect("RPARAM");
    return { type: StructEnum["DATAREF"], data: tname };
  }
  function p_Array(p) {
    p.expect("ARRAY");
    p.expect("LPARAM");
    let arraytype = p_Type(p);
    let itername = "";
    if (p.optional("COMMA")) {
      itername = (arraytype.data || "").replace(/"/g, "");
      arraytype = p_Type(p);
    }
    p.expect("RPARAM");
    return { type: StructEnum.ARRAY, data: { type: arraytype, iname: itername } };
  }
  function p_Iter(p) {
    p.expect("ITER");
    p.expect("LPARAM");
    let arraytype = p_Type(p);
    let itername = "";
    if (p.optional("COMMA")) {
      itername = (arraytype.data || "").replace(/"/g, "");
      arraytype = p_Type(p);
    }
    p.expect("RPARAM");
    return { type: StructEnum.ITER, data: { type: arraytype, iname: itername } };
  }
  function p_StaticArray(p) {
    p.expect("STATIC_ARRAY");
    p.expect("SOPEN");
    let arraytype = p_Type(p);
    let itername = "";
    p.expect("COMMA");
    let size = parseInt(p.expect("NUM"));
    if (size < 0 || Math.abs(size - Math.floor(size)) > 1e-6) {
      console.log(Math.abs(size - Math.floor(size)));
      p.error(void 0, "Expected an integer");
    }
    size = Math.floor(size);
    if (p.optional("COMMA")) {
      itername = p_Type(p).data;
    }
    p.expect("SCLOSE");
    return { type: StructEnum.STATIC_ARRAY, data: { type: arraytype, size, iname: itername } };
  }
  function p_IterKeys(p) {
    p.expect("ITERKEYS");
    p.expect("LPARAM");
    let arraytype = p_Type(p);
    let itername = "";
    if (p.optional("COMMA")) {
      itername = (arraytype.data || "").replace(/"/g, "");
      arraytype = p_Type(p);
    }
    p.expect("RPARAM");
    return { type: StructEnum.ITERKEYS, data: { type: arraytype, iname: itername } };
  }
  function p_Abstract(p) {
    p.expect("ABSTRACT");
    p.expect("LPARAM");
    let type = p.expect("ID");
    let jsonKeyword = "_structName";
    if (p.optional("COMMA")) {
      jsonKeyword = p.expect("STRLIT");
    }
    p.expect("RPARAM");
    return {
      type: StructEnum.TSTRUCT,
      data: type,
      jsonKeyword
    };
  }
  function p_Optional(p) {
    p.expect("OPTIONAL");
    p.expect("LPARAM");
    const type = p_Type(p);
    p.expect("RPARAM");
    return {
      type: StructEnum.OPTIONAL,
      data: type
    };
  }
  function p_Type(p) {
    let tok = p.peeknext();
    if (tok.type === "ID") {
      p.next();
      return { type: StructEnum.STRUCT, data: tok.value };
    } else if (basic_types.has(tok.type.toLowerCase())) {
      p.next();
      return { type: StructTypes[tok.type.toLowerCase()] };
    } else if (tok.type === "ARRAY") {
      return p_Array(p);
    } else if (tok.type === "ITER") {
      return p_Iter(p);
    } else if (tok.type === "ITERKEYS") {
      return p_IterKeys(p);
    } else if (tok.type === "STATIC_ARRAY") {
      return p_StaticArray(p);
    } else if (tok.type === "STATIC_STRING") {
      return p_Static_String(p);
    } else if (tok.type === "ABSTRACT") {
      return p_Abstract(p);
    } else if (tok.type === "DATAREF") {
      return p_DataRef(p);
    } else if (tok.type === "OPTIONAL") {
      return p_Optional(p);
    } else {
      p.error(tok, "invalid type " + tok.type);
      return { type: -1 };
    }
  }
  function p_ID_or_num(p) {
    let t = p.peeknext();
    if (t.type === "NUM") {
      p.next();
      return t.value;
    } else {
      return p.expect("ID", "struct field name");
    }
  }
  function p_Field(p) {
    let field = {
      name: "",
      type: { type: -1 },
      set: void 0,
      get: void 0,
      comment: ""
    };
    field.name = p_ID_or_num(p);
    let is_opt = false;
    if (p.peeknext().type === "OPT_COLON") {
      p.expect("OPT_COLON");
      is_opt = true;
    } else {
      p.expect("COLON");
    }
    field.type = p_Type(p);
    if (is_opt) {
      field.type = {
        type: StructEnum.OPTIONAL,
        data: field.type
      };
    }
    field.set = void 0;
    field.get = void 0;
    let check = 0;
    let tok = p.peeknext();
    if (tok && tok.type === "JSCRIPT") {
      field.get = tok.value;
      check = 1;
      p.next();
      tok = p.peeknext();
    }
    if (tok && tok.type === "JSCRIPT") {
      check = 1;
      field.set = tok.value;
      p.next();
    }
    p.expect("SEMI");
    tok = p.peeknext();
    if (tok && tok.type === "COMMENT") {
      field.comment = tok.value;
      p.next();
    } else {
      field.comment = "";
    }
    return field;
  }
  function p_Struct(p) {
    let name = p.expect("ID", "struct name");
    let st = new NStruct(name);
    let tok = p.peeknext();
    if (tok.type === "ID" && tok.value === "id") {
      p.next();
      p.expect("EQUALS");
      st.id = parseInt(p.expect("NUM"));
    }
    p.expect("OPEN");
    while (1) {
      if (p.at_end()) {
        p.error(void 0);
      } else if (p.optional("CLOSE")) {
        break;
      } else {
        st.fields.push(p_Field(p));
      }
    }
    return st;
  }
  parser$1.start = p_Struct;
  return parser$1;
}
var struct_parse = StructParser();
var struct_parser = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  NStruct,
  StructEnum,
  ArrayTypes,
  ValueTypes,
  StructTypes,
  StructTypeMap,
  stripComments,
  struct_parse
});
var struct_typesystem = /* @__PURE__ */ Object.freeze({
  __proto__: null
});
var STRUCT_ENDIAN = true;
function setBinaryEndian(mode) {
  STRUCT_ENDIAN = !!mode;
}
var temp_dataview = new DataView(new ArrayBuffer(16));
var uint8_view = new Uint8Array(temp_dataview.buffer);
var unpack_context = class {
  i;
  constructor() {
    this.i = 0;
  }
};
function pack_byte(array, val) {
  array.push(val);
}
function pack_sbyte(array, val) {
  if (val < 0) {
    val = 256 + val;
  }
  array.push(val);
}
function pack_bytes(array, bytes) {
  for (let i = 0; i < bytes.length; i++) {
    array.push(bytes[i]);
  }
}
function pack_int(array, val) {
  temp_dataview.setInt32(0, val, STRUCT_ENDIAN);
  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
  array.push(uint8_view[2]);
  array.push(uint8_view[3]);
}
function pack_uint(array, val) {
  temp_dataview.setUint32(0, val, STRUCT_ENDIAN);
  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
  array.push(uint8_view[2]);
  array.push(uint8_view[3]);
}
function pack_ushort(array, val) {
  temp_dataview.setUint16(0, val, STRUCT_ENDIAN);
  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
}
function pack_float(array, val) {
  temp_dataview.setFloat32(0, val, STRUCT_ENDIAN);
  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
  array.push(uint8_view[2]);
  array.push(uint8_view[3]);
}
function pack_double(array, val) {
  temp_dataview.setFloat64(0, val, STRUCT_ENDIAN);
  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
  array.push(uint8_view[2]);
  array.push(uint8_view[3]);
  array.push(uint8_view[4]);
  array.push(uint8_view[5]);
  array.push(uint8_view[6]);
  array.push(uint8_view[7]);
}
function pack_short(array, val) {
  temp_dataview.setInt16(0, val, STRUCT_ENDIAN);
  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
}
function encode_utf8(arr, str) {
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    while (c !== 0) {
      let uc = c & 127;
      c = c >> 7;
      if (c !== 0) uc |= 128;
      arr.push(uc);
    }
  }
}
function decode_utf8(arr) {
  let str = "";
  let i = 0;
  while (i < arr.length) {
    let c = arr[i];
    let sum = c & 127;
    let j = 0;
    while (i < arr.length && c & 128) {
      j += 7;
      i++;
      c = arr[i];
      c = (c & 127) << j;
      sum |= c;
    }
    if (sum === 0) break;
    str += String.fromCharCode(sum);
    i++;
  }
  return str;
}
function test_utf8() {
  let s = "a" + String.fromCharCode(8800) + "b";
  let arr = [];
  encode_utf8(arr, s);
  let s2 = decode_utf8(arr);
  if (s !== s2) {
    throw new Error("UTF-8 encoding/decoding test failed");
  }
  return true;
}
function truncate_utf8(arr, maxlen) {
  let len = Math.min(arr.length, maxlen);
  let last_codepoint = 0;
  let last2 = 0;
  let incode = 0;
  let i = 0;
  while (i < len) {
    incode = arr[i] & 128;
    if (!incode) {
      last2 = last_codepoint + 1;
      last_codepoint = i + 1;
    }
    i++;
  }
  if (last_codepoint < maxlen) arr.length = last_codepoint;
  else arr.length = last2;
  return arr;
}
var _static_sbuf_ss = new Array(2048);
function pack_static_string(data, str, length) {
  if (length === void 0) throw new Error("'length' paremter is not optional for pack_static_string()");
  let arr = length < 2048 ? _static_sbuf_ss : new Array();
  arr.length = 0;
  encode_utf8(arr, str);
  truncate_utf8(arr, length);
  for (let i = 0; i < length; i++) {
    if (i >= arr.length) {
      data.push(0);
    } else {
      data.push(arr[i]);
    }
  }
}
var _static_sbuf = new Array(32);
function pack_string(data, str) {
  _static_sbuf.length = 0;
  encode_utf8(_static_sbuf, str);
  pack_int(data, _static_sbuf.length);
  for (let i = 0; i < _static_sbuf.length; i++) {
    data.push(_static_sbuf[i]);
  }
}
function unpack_bytes(dview, uctx, len) {
  let ret = new DataView(dview.buffer.slice(uctx.i, uctx.i + len));
  uctx.i += len;
  return ret;
}
function unpack_byte(dview, uctx) {
  return dview.getUint8(uctx.i++);
}
function unpack_sbyte(dview, uctx) {
  return dview.getInt8(uctx.i++);
}
function unpack_int(dview, uctx) {
  uctx.i += 4;
  return dview.getInt32(uctx.i - 4, STRUCT_ENDIAN);
}
function unpack_uint(dview, uctx) {
  uctx.i += 4;
  return dview.getUint32(uctx.i - 4, STRUCT_ENDIAN);
}
function unpack_ushort(dview, uctx) {
  uctx.i += 2;
  return dview.getUint16(uctx.i - 2, STRUCT_ENDIAN);
}
function unpack_float(dview, uctx) {
  uctx.i += 4;
  return dview.getFloat32(uctx.i - 4, STRUCT_ENDIAN);
}
function unpack_double(dview, uctx) {
  uctx.i += 8;
  return dview.getFloat64(uctx.i - 8, STRUCT_ENDIAN);
}
function unpack_short(dview, uctx) {
  uctx.i += 2;
  return dview.getInt16(uctx.i - 2, STRUCT_ENDIAN);
}
var _static_arr_us = new Array(32);
function unpack_string(data, uctx) {
  let slen = unpack_int(data, uctx);
  if (!slen) {
    return "";
  }
  let arr = slen < 2048 ? _static_arr_us : new Array(slen);
  arr.length = slen;
  for (let i = 0; i < slen; i++) {
    arr[i] = unpack_byte(data, uctx);
  }
  return decode_utf8(arr);
}
var _static_arr_uss = new Array(2048);
function unpack_static_string(data, uctx, length) {
  if (length === void 0) throw new Error("'length' cannot be undefined in unpack_static_string()");
  let arr = length < 2048 ? _static_arr_uss : new Array(length);
  arr.length = 0;
  let done = false;
  for (let i = 0; i < length; i++) {
    let c = unpack_byte(data, uctx);
    if (c === 0) {
      done = true;
    }
    if (!done && c !== 0) {
      arr.push(c);
    }
  }
  truncate_utf8(arr, length);
  return decode_utf8(arr);
}
var struct_binpack = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  get STRUCT_ENDIAN() {
    return STRUCT_ENDIAN;
  },
  setBinaryEndian,
  temp_dataview,
  uint8_view,
  unpack_context,
  pack_byte,
  pack_sbyte,
  pack_bytes,
  pack_int,
  pack_uint,
  pack_ushort,
  pack_float,
  pack_double,
  pack_short,
  encode_utf8,
  decode_utf8,
  test_utf8,
  pack_static_string,
  pack_string,
  unpack_bytes,
  unpack_byte,
  unpack_sbyte,
  unpack_int,
  unpack_uint,
  unpack_ushort,
  unpack_float,
  unpack_double,
  unpack_short,
  unpack_string,
  unpack_static_string
});
var warninglvl$1 = 2;
var debug = 0;
var _static_envcode_null$1 = "";
var packer_debug$1;
var packer_debug_start$1;
var packer_debug_end$1;
var packdebug_tablevel = 0;
function _get_pack_debug() {
  return {
    packer_debug: packer_debug$1,
    packer_debug_start: packer_debug_start$1,
    packer_debug_end: packer_debug_end$1,
    debug,
    warninglvl: warninglvl$1
  };
}
var cachering = class _cachering extends Array {
  cur;
  constructor(cb, tot) {
    super();
    this.length = tot;
    this.cur = 0;
    for (let i = 0; i < tot; i++) {
      this[i] = cb();
    }
  }
  static fromConstructor(cls2, tot) {
    return new _cachering(() => new cls2(), tot);
  }
  next() {
    let ret = this[this.cur];
    this.cur = (this.cur + 1) % this.length;
    return ret;
  }
};
function gen_tabstr$1(tot) {
  let ret = "";
  for (let i = 0; i < tot; i++) {
    ret += " ";
  }
  return ret;
}
function setWarningMode2(t) {
  if (typeof t !== "number" || isNaN(t)) {
    throw new Error("Expected a single number (>= 0) argument to setWarningMode");
  }
  warninglvl$1 = t;
}
function setDebugMode2(t) {
  debug = t;
  if (debug) {
    packer_debug$1 = function(...args2) {
      let tab2 = gen_tabstr$1(packdebug_tablevel);
      if (args2.length > 0) {
        console.warn(tab2, ...args2);
      } else {
        console.warn("Warning: undefined msg");
      }
    };
    packer_debug_start$1 = function(funcname) {
      packer_debug$1("Start " + funcname);
      packdebug_tablevel++;
    };
    packer_debug_end$1 = function(funcname) {
      packdebug_tablevel--;
      if (funcname) {
        packer_debug$1("Leave " + funcname);
      }
    };
  } else {
    packer_debug$1 = function() {
    };
    packer_debug_start$1 = function() {
    };
    packer_debug_end$1 = function() {
    };
  }
}
setDebugMode2(debug);
var StructFieldTypes = [];
var StructFieldTypeMap = {};
function packNull(manager2, data, field, type) {
  StructFieldTypeMap[type.type].packNull(manager2, data, field, type);
}
function toJSON(manager2, val, obj, field, type) {
  return StructFieldTypeMap[type.type].toJSON(manager2, val, obj, field, type);
}
function fromJSON(manager2, val, obj, field, type, instance) {
  return StructFieldTypeMap[type.type].fromJSON(manager2, val, obj, field, type, instance);
}
function formatJSON$1(manager2, val, obj, field, type, instance, tlvl = 0) {
  return StructFieldTypeMap[type.type].formatJSON(manager2, val, obj, field, type, instance, tlvl);
}
function validateJSON$1(manager2, val, obj, field, type, instance, _abstractKey) {
  return StructFieldTypeMap[type.type].validateJSON(manager2, val, obj, field, type, instance, _abstractKey);
}
function unpack_field(manager2, data, type, uctx) {
  let name;
  if (debug) {
    name = StructFieldTypeMap[type.type].define().name;
    packer_debug_start$1("R " + name);
  }
  let ret = StructFieldTypeMap[type.type].unpack(manager2, data, type, uctx);
  if (debug) {
    packer_debug_end$1();
  }
  return ret;
}
var fakeFields = new cachering(() => {
  return { type: void 0, get: void 0, set: void 0 };
}, 256);
function fmt_type(type) {
  return StructFieldTypeMap[type.type].format(type);
}
function do_pack(manager2, data, val, obj, field, type) {
  let name;
  if (debug) {
    let t = type;
    name = StructFieldTypeMap[t.type].define().name;
    packer_debug_start$1("W " + name);
  }
  let typeid;
  if (typeof type !== "number") {
    typeid = type.type;
  } else {
    typeid = type;
  }
  let ret = StructFieldTypeMap[typeid].pack(manager2, data, val, obj, field, type);
  if (debug) {
    packer_debug_end$1();
  }
  return ret;
}
var _ws_env$1 = [[void 0, void 0]];
var StructFieldType = class _StructFieldType {
  static pack(_manager, _data, _val, _obj, _field, _type) {
  }
  static unpack(_manager, _data, _type, _uctx) {
    return void 0;
  }
  static packNull(manager2, data, field, type) {
    this.pack(manager2, data, 0, 0, field, type);
  }
  static format(_type) {
    return this.define().name;
  }
  static toJSON(_manager, val, _obj, _field, _type) {
    return val;
  }
  static fromJSON(_manager, val, _obj, _field, _type, _instance) {
    return val;
  }
  static formatJSON(_manager, val, _obj, _field, _type, _instance, _tlvl) {
    return JSON.stringify(val);
  }
  static validateJSON(_manager, _val, _obj, _field, _type, _instance, _abstractKey) {
    return true;
  }
  /**
   return false to override default
   helper js for packing
   */
  static useHelperJS(_field) {
    return true;
  }
  /**
     Define field class info.
  
     Example:
     <pre>
     static define() {return {
      type : StructEnum.INT,
      name : "int"
    }}
     </pre>
     */
  static define() {
    return {
      type: -1,
      name: "(error)"
    };
  }
  /**
   Register field packer/unpacker class.  Will throw an error if define() method is bad.
   */
  static register(cls2) {
    if (StructFieldTypes.indexOf(cls2) >= 0) {
      throw new Error("class already registered");
    }
    if (cls2.define === _StructFieldType.define) {
      throw new Error("you forgot to make a define() static method");
    }
    if (cls2.define().type === void 0) {
      throw new Error("cls.define().type was undefined!");
    }
    if (cls2.define().type in StructFieldTypeMap) {
      throw new Error("type " + cls2.define().type + " is used by another StructFieldType subclass");
    }
    StructFieldTypes.push(cls2);
    StructFieldTypeMap[cls2.define().type] = cls2;
  }
};
var StructIntField = class extends StructFieldType {
  static pack(_manager, data, val, _obj, _field, _type) {
    pack_int(data, val);
  }
  static unpack(_manager, data, _type, uctx) {
    return unpack_int(data, uctx);
  }
  static validateJSON(_manager, val, _obj, _field, _type, _instance) {
    if (typeof val !== "number" || val !== Math.floor(val)) {
      return "" + val + " is not an integer";
    }
    return true;
  }
  static define() {
    return {
      type: StructEnum.INT,
      name: "int"
    };
  }
};
StructFieldType.register(StructIntField);
var StructFloatField = class extends StructFieldType {
  static pack(_manager, data, val, _obj, _field, _type) {
    pack_float(data, val);
  }
  static unpack(_manager, data, _type, uctx) {
    return unpack_float(data, uctx);
  }
  static validateJSON(_manager, val, _obj, _field, _type, _instance, _abstractKey) {
    if (typeof val !== "number") {
      return "Not a float: " + val;
    }
    return true;
  }
  static define() {
    return {
      type: StructEnum.FLOAT,
      name: "float"
    };
  }
};
StructFieldType.register(StructFloatField);
var StructDoubleField = class extends StructFieldType {
  static pack(_manager, data, val, _obj, _field, _type) {
    pack_double(data, val);
  }
  static unpack(_manager, data, _type, uctx) {
    return unpack_double(data, uctx);
  }
  static validateJSON(_manager, val, _obj, _field, _type, _instance) {
    if (typeof val !== "number") {
      return "Not a double: " + val;
    }
    return true;
  }
  static define() {
    return {
      type: StructEnum.DOUBLE,
      name: "double"
    };
  }
};
StructFieldType.register(StructDoubleField);
var StructStringField = class extends StructFieldType {
  static pack(_manager, data, val, _obj, _field, _type) {
    val = !val ? "" : val;
    pack_string(data, val);
  }
  static validateJSON(_manager, val, _obj, _field, _type, _instance) {
    if (typeof val !== "string") {
      return "Not a string: " + val;
    }
    return true;
  }
  static packNull(manager2, data, field, type) {
    this.pack(manager2, data, "", 0, field, type);
  }
  static unpack(_manager, data, _type, uctx) {
    return unpack_string(data, uctx);
  }
  static define() {
    return {
      type: StructEnum.STRING,
      name: "string"
    };
  }
};
StructFieldType.register(StructStringField);
var StructStaticStringField = class extends StructFieldType {
  static pack(_manager, data, val, _obj, _field, type) {
    val = !val ? "" : val;
    pack_static_string(data, val, type.data.maxlength);
  }
  static validateJSON(_manager, val, _obj, _field, type, _instance) {
    if (typeof val !== "string") {
      return "Not a string: " + val;
    }
    if (val.length > type.data.maxlength) {
      return "String is too big; limit is " + type.data.maxlength + "; string:" + val;
    }
    return true;
  }
  static format(type) {
    return `static_string[${type.data.maxlength}]`;
  }
  static packNull(manager2, data, field, type) {
    this.pack(manager2, data, "", 0, field, type);
  }
  static unpack(_manager, data, type, uctx) {
    return unpack_static_string(data, uctx, type.data.maxlength);
  }
  static define() {
    return {
      type: StructEnum.STATIC_STRING,
      name: "static_string"
    };
  }
};
StructFieldType.register(StructStaticStringField);
var StructStructField = class extends StructFieldType {
  static pack(manager2, data, val, _obj, _field, type) {
    let stt = manager2.get_struct(type.data);
    packer_debug$1("struct", stt.name);
    manager2.write_struct(data, val, stt);
  }
  static validateJSON(manager2, val, _obj, _field, type, _instance, _abstractKey) {
    let stt = manager2.get_struct(type.data);
    if (!val) {
      return "Expected " + stt.name + " object";
    }
    return manager2.validateJSONIntern(val, stt, _abstractKey);
  }
  static format(type) {
    return type.data;
  }
  static fromJSON(manager2, val, _obj, _field, type, instance) {
    let stt = manager2.get_struct(type.data);
    return manager2.readJSON(val, stt, instance);
  }
  static formatJSON(manager2, val, _obj, _field, type, _instance, tlvl) {
    let stt = manager2.get_struct(type.data);
    return manager2.formatJSON_intern(val, stt, _field, tlvl);
  }
  static toJSON(manager2, val, _obj, _field, type) {
    let stt = manager2.get_struct(type.data);
    return manager2.writeJSON(val, stt);
  }
  static unpackInto(manager2, data, type, uctx, dest) {
    let cls2 = manager2.get_struct_cls(type.data);
    packer_debug$1("struct", cls2 ? cls2.name : "(error)");
    return manager2.read_object(data, cls2, uctx, dest);
  }
  static packNull(manager2, data, _field, type) {
    let stt = manager2.get_struct(type.data);
    packer_debug$1("struct", type);
    for (let field2 of stt.fields) {
      let type2 = field2.type;
      packNull(manager2, data, field2, type2);
    }
  }
  static unpack(manager2, data, type, uctx) {
    let cls2 = manager2.get_struct_cls(type.data);
    packer_debug$1("struct", cls2 ? cls2.name : "(error)");
    return manager2.read_object(data, cls2, uctx);
  }
  static define() {
    return {
      type: StructEnum.STRUCT,
      name: "struct"
    };
  }
};
StructFieldType.register(StructStructField);
var StructTStructField = class extends StructFieldType {
  static pack(manager2, data, val, _obj, _field, type) {
    let cls2 = manager2.get_struct_cls(type.data);
    let stt = manager2.get_struct(type.data);
    const keywords = manager2.constructor.keywords;
    let valObj = val;
    if (valObj.constructor.structName !== type.data && val instanceof cls2) {
      stt = manager2.get_struct(valObj.constructor.structName);
    } else if (valObj.constructor.structName === type.data) {
      stt = manager2.get_struct(type.data);
    } else {
      console.trace();
      throw new Error("Bad struct " + valObj.constructor.structName + " passed to write_struct");
    }
    packer_debug$1("int " + stt.id);
    pack_int(data, stt.id);
    manager2.write_struct(data, val, stt);
  }
  static validateJSON(manager2, val, _obj, _field, type, _instance, _abstractKey) {
    let key = type.jsonKeyword;
    if (typeof val !== "object") {
      return typeof val + " is not an object";
    }
    let valObj = val;
    let stt = manager2.get_struct(valObj[key]);
    let cls2 = manager2.get_struct_cls(stt.name);
    let parentcls = manager2.get_struct_cls(type.data);
    let ok = false;
    do {
      if (cls2 === parentcls) {
        ok = true;
        break;
      }
      cls2 = cls2.prototype.__proto__.constructor;
    } while (cls2 && cls2 !== Object);
    if (!ok) {
      return stt.name + " is not a child class off " + type.data;
    }
    return manager2.validateJSONIntern(val, stt, type.jsonKeyword);
  }
  static fromJSON(manager2, val, _obj, _field, type, instance) {
    let key = type.jsonKeyword;
    let stt = manager2.get_struct(val[key]);
    return manager2.readJSON(val, stt, instance);
  }
  static formatJSON(manager2, val, _obj, _field, type, _instance, tlvl) {
    let key = type.jsonKeyword;
    let stt = manager2.get_struct(val[key]);
    return manager2.formatJSON_intern(val, stt, _field, tlvl);
  }
  static toJSON(manager2, val, _obj, _field, type) {
    const keywords = manager2.constructor.keywords;
    let valObj = val;
    let stt = manager2.get_struct(valObj.constructor.structName);
    let ret = manager2.writeJSON(val, stt);
    ret[type.jsonKeyword] = "" + stt.name;
    return ret;
  }
  static packNull(manager2, data, field, type) {
    let stt = manager2.get_struct(type.data);
    pack_int(data, stt.id);
    packNull(manager2, data, field, { type: StructEnum.STRUCT, data: type.data });
  }
  static format(type) {
    return "abstract(" + type.data + ")";
  }
  static unpackInto(manager2, data, type, uctx, _dest) {
    let id = unpack_int(data, uctx);
    packer_debug$1("-int " + id);
    if (!(id in manager2.struct_ids)) {
      packer_debug$1("tstruct id: " + id);
      console.trace();
      console.log(id);
      console.log(manager2.struct_ids);
      throw new Error("Unknown struct type " + id + ".");
    }
    let cls2 = manager2.get_struct_id(id);
    packer_debug$1("struct name: " + cls2.name);
    cls2 = manager2.struct_cls[cls2.name];
    return manager2.read_object(data, cls2, uctx, _dest);
  }
  static unpack(manager2, data, _type, uctx) {
    let id = unpack_int(data, uctx);
    packer_debug$1("-int " + id);
    if (!(id in manager2.struct_ids)) {
      packer_debug$1("tstruct id: " + id);
      console.trace();
      console.log(id);
      console.log(manager2.struct_ids);
      throw new Error("Unknown struct type " + id + ".");
    }
    let cls2 = manager2.get_struct_id(id);
    packer_debug$1("struct name: " + cls2.name);
    cls2 = manager2.struct_cls[cls2.name];
    return manager2.read_object(data, cls2, uctx);
  }
  static define() {
    return {
      type: StructEnum.TSTRUCT,
      name: "tstruct"
    };
  }
};
StructFieldType.register(StructTStructField);
function formatArrayJson(manager2, val, _obj, field, _type, type2, _instance, tlvl, array) {
  if (array === void 0) {
    array = val;
  }
  if (array === void 0 || array === null || typeof array !== "object" || !(Symbol.iterator in array)) {
    console.log(_obj);
    console.log(array);
    throw new Error(`Expected an array for ${field.name}`);
  }
  let arr = array;
  if (ValueTypes.has(type2.type)) {
    return JSON.stringify(arr);
  }
  let s = "[";
  if (manager2.formatCtx.addComments && field.comment && field.comment.trim()) {
    s += " " + field.comment.trim();
  }
  s += "\n";
  for (let i = 0; i < arr.length; i++) {
    let item = arr[i];
    s += tab(tlvl + 1) + formatJSON$1(manager2, item, val, field, type2, _instance, tlvl + 1) + ",\n";
  }
  s += tab(tlvl) + "]";
  return s;
}
var StructArrayField = class extends StructFieldType {
  static pack(manager2, data, val, obj, field, type) {
    let arr = val;
    if (arr === void 0) {
      console.trace();
      console.log("Undefined array fed to struct struct packer!");
      console.log("Field: ", field);
      console.log("Type: ", type);
      console.log("");
      packer_debug$1("int 0");
      pack_int(data, 0);
      return;
    }
    packer_debug$1("int " + arr.length);
    pack_int(data, arr.length);
    let d = type.data;
    let itername = d.iname;
    let type2 = d.type;
    let env = _ws_env$1;
    for (let i = 0; i < arr.length; i++) {
      let val2 = arr[i];
      if (itername !== "" && itername !== void 0 && field.get) {
        env[0][0] = itername;
        env[0][1] = val2;
        val2 = manager2._env_call(field.get, obj, env);
      }
      let fakeField = fakeFields.next();
      fakeField.type = type2;
      do_pack(manager2, data, val2, obj, fakeField, type2);
    }
  }
  static packNull(_manager, data, _field, _type) {
    pack_int(data, 0);
  }
  static format(type) {
    let d = type.data;
    if (d.iname !== "" && d.iname !== void 0) {
      return "array(" + d.iname + ", " + fmt_type(d.type) + ")";
    } else {
      return "array(" + fmt_type(d.type) + ")";
    }
  }
  static useHelperJS(field) {
    return !field.type.data.iname;
  }
  static validateJSON(manager2, val, _obj, field, type, _instance, _abstractKey) {
    let arr = val;
    if (!arr) {
      return "not an array: " + val;
    }
    for (let i = 0; i < arr.length; i++) {
      let ret = validateJSON$1(
        manager2,
        arr[i],
        arr,
        field,
        type.data.type,
        void 0,
        _abstractKey
      );
      if (typeof ret === "string" || !ret) {
        return ret;
      }
    }
    return true;
  }
  static fromJSON(manager2, val, _obj, field, type, instance) {
    let ret = instance || [];
    ret.length = 0;
    let arr = val;
    for (let i = 0; i < arr.length; i++) {
      let val2 = fromJSON(manager2, arr[i], arr, field, type.data.type, void 0);
      if (val2 === void 0) {
        console.log(val2);
        console.error("eeek");
      }
      ret.push(val2);
    }
    return ret;
  }
  static formatJSON(manager2, val, obj, field, type, instance, tlvl) {
    return formatArrayJson(manager2, val, obj, field, type, type.data.type, instance, tlvl);
  }
  static toJSON(manager2, val, obj, field, type) {
    let arr = val || [];
    let json = [];
    let itername = type.data.iname;
    for (let i = 0; i < arr.length; i++) {
      let val2 = arr[i];
      let env = _ws_env$1;
      if (itername !== "" && itername !== void 0 && field.get) {
        env[0][0] = itername;
        env[0][1] = val2;
        val2 = manager2._env_call(field.get, obj, env);
      }
      json.push(toJSON(manager2, val2, arr, field, type.data.type));
    }
    return json;
  }
  static unpackInto(manager2, data, type, uctx, dest) {
    let len = unpack_int(data, uctx);
    dest.length = 0;
    for (let i = 0; i < len; i++) {
      dest.push(unpack_field(manager2, data, type.data.type, uctx));
    }
  }
  static unpack(manager2, data, type, uctx) {
    let len = unpack_int(data, uctx);
    packer_debug$1("-int " + len);
    let arr = new Array(len);
    for (let i = 0; i < len; i++) {
      arr[i] = unpack_field(manager2, data, type.data.type, uctx);
    }
    return arr;
  }
  static define() {
    return {
      type: StructEnum.ARRAY,
      name: "array"
    };
  }
};
StructFieldType.register(StructArrayField);
var StructIterField = class extends StructFieldType {
  static pack(manager2, data, val, obj, field, type) {
    function forEach(cb, thisvar) {
      let v = val;
      if (v && v[Symbol.iterator]) {
        for (let item of v) {
          cb.call(thisvar, item);
        }
      } else if (v && v.forEach) {
        v.forEach(function(item) {
          cb.call(thisvar, item);
        });
      } else {
        console.trace();
        console.log("Undefined iterable list fed to struct struct packer!", val);
        console.log("Field: ", field);
        console.log("Type: ", type);
        console.log("");
      }
    }
    let starti = data.length;
    data.length += 4;
    let d = type.data, itername = d.iname, type2 = d.type;
    let env = _ws_env$1;
    let i = 0;
    forEach(function(val2) {
      if (itername !== "" && itername !== void 0 && field.get) {
        env[0][0] = itername;
        env[0][1] = val2;
        val2 = manager2._env_call(field.get, obj, env);
      }
      let fakeField = fakeFields.next();
      fakeField.type = type2;
      do_pack(manager2, data, val2, obj, fakeField, type2);
      i++;
    }, this);
    temp_dataview.setInt32(0, i, STRUCT_ENDIAN);
    data[starti++] = uint8_view[0];
    data[starti++] = uint8_view[1];
    data[starti++] = uint8_view[2];
    data[starti++] = uint8_view[3];
  }
  static formatJSON(manager2, val, obj, field, type, instance, tlvl) {
    return formatArrayJson(
      manager2,
      val,
      obj,
      field,
      type,
      type.data.type,
      instance,
      tlvl,
      list(val)
    );
  }
  static validateJSON(manager2, val, obj, field, type, instance, _abstractKey) {
    return StructArrayField.validateJSON(manager2, val, obj, field, type, instance, _abstractKey);
  }
  static fromJSON(manager2, val, obj, field, type, instance) {
    return StructArrayField.fromJSON(manager2, val, obj, field, type, instance);
  }
  static toJSON(manager2, val, obj, field, type) {
    let arr = val || [];
    let json = [];
    let itername = type.data.iname;
    for (let val2 of arr) {
      let env = _ws_env$1;
      let v = val2;
      if (itername !== "" && itername !== void 0 && field.get) {
        env[0][0] = itername;
        env[0][1] = v;
        v = manager2._env_call(field.get, obj, env);
      }
      json.push(toJSON(manager2, v, arr, field, type.data.type));
    }
    return json;
  }
  static packNull(_manager, data, _field, _type) {
    pack_int(data, 0);
  }
  static useHelperJS(field) {
    return !field.type.data.iname;
  }
  static format(type) {
    let d = type.data;
    if (d.iname !== "" && d.iname !== void 0) {
      return "iter(" + d.iname + ", " + fmt_type(d.type) + ")";
    } else {
      return "iter(" + fmt_type(d.type) + ")";
    }
  }
  static unpackInto(manager2, data, type, uctx, arr) {
    let len = unpack_int(data, uctx);
    packer_debug$1("-int " + len);
    arr.length = 0;
    for (let i = 0; i < len; i++) {
      arr.push(unpack_field(manager2, data, type.data.type, uctx));
    }
    return arr;
  }
  static unpack(manager2, data, type, uctx) {
    let len = unpack_int(data, uctx);
    packer_debug$1("-int " + len);
    let arr = new Array(len);
    for (let i = 0; i < len; i++) {
      arr[i] = unpack_field(manager2, data, type.data.type, uctx);
    }
    return arr;
  }
  static define() {
    return {
      type: StructEnum.ITER,
      name: "iter"
    };
  }
};
StructFieldType.register(StructIterField);
var StructShortField = class extends StructFieldType {
  static pack(_manager, data, val, _obj, _field, _type) {
    pack_short(data, val);
  }
  static unpack(_manager, data, _type, uctx) {
    return unpack_short(data, uctx);
  }
  static define() {
    return {
      type: StructEnum.SHORT,
      name: "short"
    };
  }
};
StructFieldType.register(StructShortField);
var StructByteField = class extends StructFieldType {
  static pack(_manager, data, val, _obj, _field, _type) {
    pack_byte(data, val);
  }
  static unpack(_manager, data, _type, uctx) {
    return unpack_byte(data, uctx);
  }
  static define() {
    return {
      type: StructEnum.BYTE,
      name: "byte"
    };
  }
};
StructFieldType.register(StructByteField);
var StructSignedByteField = class extends StructFieldType {
  static pack(_manager, data, val, _obj, _field, _type) {
    pack_sbyte(data, val);
  }
  static unpack(_manager, data, _type, uctx) {
    return unpack_sbyte(data, uctx);
  }
  static define() {
    return {
      type: StructEnum.SIGNED_BYTE,
      name: "sbyte"
    };
  }
};
StructFieldType.register(StructSignedByteField);
var StructBoolField = class extends StructFieldType {
  static pack(_manager, data, val, _obj, _field, _type) {
    pack_byte(data, !!val ? 1 : 0);
  }
  static unpack(_manager, data, _type, uctx) {
    return !!unpack_byte(data, uctx);
  }
  static validateJSON(_manager, val, _obj, _field, _type, _instance) {
    if (val === 0 || val === 1 || val === true || val === false || val === "true" || val === "false") {
      return true;
    }
    return "" + val + " is not a bool";
  }
  static fromJSON(_manager, val, _obj, _field, _type, _instance) {
    if (val === "false") {
      val = false;
    }
    return !!val;
  }
  static toJSON(_manager, val, _obj, _field, _type) {
    return !!val;
  }
  static define() {
    return {
      type: StructEnum.BOOL,
      name: "bool"
    };
  }
};
StructFieldType.register(StructBoolField);
var StructIterKeysField = class extends StructFieldType {
  static pack(manager2, data, val, obj, field, type) {
    if (typeof val !== "object" && typeof val !== "function" || val === null) {
      console.warn("Bad object fed to iterkeys in struct packer!", val);
      console.log("Field: ", field);
      console.log("Type: ", type);
      console.log("");
      pack_int(data, 0);
      return;
    }
    let valObj = val;
    let len = 0;
    for (let k2 in valObj) {
      len++;
    }
    packer_debug$1("int " + len);
    pack_int(data, len);
    let d = type.data, itername = d.iname, type2 = d.type;
    let env = _ws_env$1;
    let i = 0;
    for (let val2 in valObj) {
      if (i >= len) {
        if (warninglvl$1 > 0) {
          console.warn("Warning: object keys magically replaced during iteration", val, i);
        }
        return;
      }
      let v = val2;
      if (itername && itername.trim().length > 0 && field.get) {
        env[0][0] = itername;
        env[0][1] = v;
        v = manager2._env_call(field.get, obj, env);
      } else {
        v = valObj[val2];
      }
      let f2 = { type: type2, get: void 0, set: void 0 };
      do_pack(manager2, data, v, obj, f2, type2);
      i++;
    }
  }
  static validateJSON(manager2, val, obj, field, type, instance, _abstractKey) {
    return StructArrayField.validateJSON(manager2, val, obj, field, type, instance, _abstractKey);
  }
  static fromJSON(manager2, val, obj, field, type, instance) {
    return StructArrayField.fromJSON(manager2, val, obj, field, type, instance);
  }
  static formatJSON(manager2, val, obj, field, type, instance, tlvl) {
    return formatArrayJson(
      manager2,
      val,
      obj,
      field,
      type,
      type.data.type,
      instance,
      tlvl,
      list(val)
    );
  }
  static toJSON(manager2, val, obj, field, type) {
    let valObj = val || {};
    let json = [];
    let itername = type.data.iname;
    for (let k2 in valObj) {
      let val2 = valObj[k2];
      let env = _ws_env$1;
      if (itername !== "" && itername !== void 0 && field.get) {
        env[0][0] = itername;
        env[0][1] = val2;
        val2 = manager2._env_call(field.get, obj, env);
      }
      json.push(toJSON(manager2, val2, valObj, field, type.data.type));
    }
    return json;
  }
  static packNull(_manager, data, _field, _type) {
    pack_int(data, 0);
  }
  static useHelperJS(field) {
    return !field.type.data.iname;
  }
  static format(type) {
    let d = type.data;
    if (d.iname !== "" && d.iname !== void 0) {
      return "iterkeys(" + d.iname + ", " + fmt_type(d.type) + ")";
    } else {
      return "iterkeys(" + fmt_type(d.type) + ")";
    }
  }
  static unpackInto(manager2, data, type, uctx, arr) {
    let len = unpack_int(data, uctx);
    packer_debug$1("-int " + len);
    arr.length = 0;
    for (let i = 0; i < len; i++) {
      arr.push(unpack_field(manager2, data, type.data.type, uctx));
    }
    return arr;
  }
  static unpack(manager2, data, type, uctx) {
    let len = unpack_int(data, uctx);
    packer_debug$1("-int " + len);
    let arr = new Array(len);
    for (let i = 0; i < len; i++) {
      arr[i] = unpack_field(manager2, data, type.data.type, uctx);
    }
    return arr;
  }
  static define() {
    return {
      type: StructEnum.ITERKEYS,
      name: "iterkeys"
    };
  }
};
StructFieldType.register(StructIterKeysField);
var StructUintField = class extends StructFieldType {
  static pack(_manager, data, val, _obj, _field, _type) {
    pack_uint(data, val);
  }
  static unpack(_manager, data, _type, uctx) {
    return unpack_uint(data, uctx);
  }
  static validateJSON(_manager, val, _obj, _field, _type, _instance) {
    if (typeof val !== "number" || val !== Math.floor(val)) {
      return "" + val + " is not an integer";
    }
    return true;
  }
  static define() {
    return {
      type: StructEnum.UINT,
      name: "uint"
    };
  }
};
StructFieldType.register(StructUintField);
var StructUshortField = class extends StructFieldType {
  static pack(_manager, data, val, _obj, _field, _type) {
    pack_ushort(data, val);
  }
  static unpack(_manager, data, _type, uctx) {
    return unpack_ushort(data, uctx);
  }
  static validateJSON(_manager, val, _obj, _field, _type, _instance) {
    if (typeof val !== "number" || val !== Math.floor(val)) {
      return "" + val + " is not an integer";
    }
    return true;
  }
  static define() {
    return {
      type: StructEnum.USHORT,
      name: "ushort"
    };
  }
};
StructFieldType.register(StructUshortField);
var StructStaticArrayField = class extends StructFieldType {
  static pack(manager2, data, val, obj, field, type) {
    let d = type.data;
    if (d.size === void 0) {
      throw new Error("type.data.size was undefined");
    }
    let itername = d.iname;
    let arr = val;
    if (arr === void 0 || !arr.length) {
      this.packNull(manager2, data, field, type);
      return;
    }
    for (let i = 0; i < d.size; i++) {
      let i2 = Math.min(i, Math.min(arr.length - 1, d.size));
      let val2 = arr[i2];
      if (itername !== "" && itername !== void 0 && field.get) {
        let env = _ws_env$1;
        env[0][0] = itername;
        env[0][1] = val2;
        val2 = manager2._env_call(field.get, obj, env);
      }
      do_pack(manager2, data, val2, arr, field, d.type);
    }
  }
  static useHelperJS(field) {
    return !field.type.data.iname;
  }
  static validateJSON(manager2, val, obj, field, type, instance, _abstractKey) {
    return StructArrayField.validateJSON(manager2, val, obj, field, type, instance, _abstractKey);
  }
  static fromJSON(manager2, val, obj, field, type, instance) {
    return StructArrayField.fromJSON(manager2, val, obj, field, type, instance);
  }
  static formatJSON(manager2, val, obj, field, type, instance, tlvl) {
    return formatArrayJson(
      manager2,
      val,
      obj,
      field,
      type,
      type.data.type,
      instance,
      tlvl,
      list(val)
    );
  }
  static packNull(manager2, data, field, type) {
    let d = type.data;
    let size = d.size;
    for (let i = 0; i < size; i++) {
      packNull(manager2, data, field, d.type);
    }
  }
  static toJSON(manager2, val, obj, field, type) {
    return StructArrayField.toJSON(manager2, val, obj, field, type);
  }
  static format(type) {
    let d = type.data;
    let type2 = StructFieldTypeMap[d.type.type].format(d.type);
    let ret = `static_array[${type2}, ${d.size}`;
    if (d.iname) {
      ret += `, ${d.iname}`;
    }
    ret += `]`;
    return ret;
  }
  static unpackInto(manager2, data, type, uctx, ret) {
    let d = type.data;
    packer_debug$1("-size: " + d.size);
    ret.length = 0;
    for (let i = 0; i < d.size; i++) {
      ret.push(unpack_field(manager2, data, d.type, uctx));
    }
    return ret;
  }
  static unpack(manager2, data, type, uctx) {
    let d = type.data;
    packer_debug$1("-size: " + d.size);
    let ret = [];
    for (let i = 0; i < d.size; i++) {
      ret.push(unpack_field(manager2, data, d.type, uctx));
    }
    return ret;
  }
  static define() {
    return {
      type: StructEnum.STATIC_ARRAY,
      name: "static_array"
    };
  }
};
StructFieldType.register(StructStaticArrayField);
var StructOptionalField = class extends StructFieldType {
  static pack(manager2, data, val, obj, field, type) {
    pack_int(data, val !== void 0 && val !== null ? 1 : 0);
    if (val !== void 0 && val !== null) {
      const fakeField = { ...field };
      fakeField.type = type.data;
      do_pack(manager2, data, val, obj, fakeField, type.data);
    }
  }
  static fakeField(field, type) {
    return { ...field, type: type.data };
  }
  static validateJSON(manager2, val, obj, field, type, _instance, _abstractKey) {
    const fakeField = this.fakeField(field, type);
    return val !== void 0 && val !== null ? validateJSON$1(manager2, val, obj, fakeField, type.data, void 0, _abstractKey) : true;
  }
  static fromJSON(manager2, val, obj, field, type, _instance) {
    const fakeField = this.fakeField(field, type);
    return val !== void 0 && val !== null ? fromJSON(manager2, val, obj, fakeField, type.data, void 0) : void 0;
  }
  static formatJSON(manager2, val, _obj, field, type, instance, tlvl) {
    if (val !== void 0 && val !== null) {
      const fakeField = this.fakeField(field, type);
      return formatJSON$1(manager2, val, val, fakeField, type.data, instance, tlvl + 1);
    }
    return "null";
  }
  static toJSON(manager2, val, obj, field, type) {
    const fakeField = this.fakeField(field, type);
    return val !== void 0 && val !== null ? toJSON(manager2, val, obj, fakeField, type.data) : null;
  }
  static packNull(_manager, data, _field, _type) {
    pack_int(data, 0);
  }
  static format(type) {
    return "optional(" + fmt_type(type.data) + ")";
  }
  static unpackInto(manager2, data, type, uctx, _dest) {
    let exists = unpack_int(data, uctx);
    packer_debug$1("-int " + exists);
    packer_debug$1("optional exists: " + exists);
    if (!exists) {
      return;
    }
    unpack_field(manager2, data, type.data, uctx);
  }
  static unpack(manager2, data, type, uctx) {
    let exists = unpack_int(data, uctx);
    if (!exists) {
      return void 0;
    }
    return unpack_field(manager2, data, type.data, uctx);
  }
  static define() {
    return {
      type: StructEnum.OPTIONAL,
      name: "optional"
    };
  }
};
StructFieldType.register(StructOptionalField);
var _sintern2 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  _get_pack_debug,
  setWarningMode2,
  setDebugMode2,
  StructFieldTypes,
  StructFieldTypeMap,
  packNull,
  toJSON,
  fromJSON,
  formatJSON: formatJSON$1,
  validateJSON: validateJSON$1,
  do_pack,
  StructFieldType,
  formatArrayJson
});
var structEval = eval;
function setStructEval(val) {
  structEval = val;
}
var _struct_eval = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  get structEval() {
    return structEval;
  },
  setStructEval
});
var TokSymbol = /* @__PURE__ */ Symbol("token-info");
function buildJSONParser() {
  let tk = (name, re, func2, example) => new tokdef(name, re, func2, example);
  let parse;
  let nint = "[+-]?[0-9]+";
  let nhex = "[+-]?0x[0-9a-fA-F]+";
  let nfloat1 = "[+-]?[0-9]+\\.[0-9]*";
  let nfloat2 = "[+-]?[0-9]*\\.[0-9]+";
  let nfloat3 = "[+-]?[0-9]+\\.[0-9]+";
  let nfloatexp = "[+-]?[0-9]+\\.[0-9]+[eE][+-]?[0-9]+";
  let nfloat = `(${nfloat1})|(${nfloat2})|(${nfloatexp})`;
  let num = `(${nint})|(${nfloat})|(${nhex})`;
  let numre = new RegExp(num);
  let numreTest = new RegExp(`(${num})$`);
  let nfloat3re = new RegExp(nfloat3);
  let nfloatexpre = new RegExp(nfloatexp);
  let tests = ["1.234234", ".23432", "-234.", "1e-17", "-0x23423ff", "+23423", "-4.263256414560601e-14"];
  for (let test of tests) {
    if (!numreTest.test(test)) {
      console.error("Error! Number regexp failed:", test);
    }
  }
  let tokens = [
    tk("BOOL", /true|false/),
    tk("WS", /[ \r\t\n]/, (_t) => void 0),
    //drop token
    tk("STRLIT", /["']/, (t) => {
      let lex2 = t.lexer;
      let char = t.value;
      let i = lex2.lexpos;
      let lexdata = lex2.lexdata;
      let escape = false;
      t.value = "";
      while (i < lexdata.length) {
        let c = lexdata[i];
        t.value += c;
        if (c === "\\") {
          escape = !escape;
        } else if (!escape && c === char) {
          break;
        } else {
          escape = false;
        }
        i++;
      }
      lex2.lexpos = i + 1;
      if (t.value.length > 0) {
        t.value = t.value.slice(0, t.value.length - 1);
      }
      return t;
    }),
    tk("LSBRACKET", /\[/),
    tk("RSBRACKET", /]/),
    tk("LBRACE", /{/),
    tk("RBRACE", /}/),
    tk("NULL", /null/),
    tk("COMMA", /,/),
    tk("COLON", /:/),
    tk("NUM", numre, (t) => (t.value = "" + parseFloat(t.value), t)),
    tk("NUM", nfloat3re, (t) => (t.value = "" + parseFloat(t.value), t)),
    tk("NUM", nfloatexpre, (t) => (t.value = "" + parseFloat(t.value), t))
  ];
  function tokinfo(t) {
    return {
      lexpos: t.lexpos,
      lineno: t.lineno,
      col: t.col,
      fields: {}
    };
  }
  function p_Array(p) {
    p.expect("LSBRACKET");
    let t = p.peeknext();
    let first = true;
    let ret = [];
    ret[TokSymbol] = tokinfo(t);
    while (t && t.type !== "RSBRACKET") {
      if (!first) {
        p.expect("COMMA");
      }
      ret[TokSymbol].fields[ret.length] = tokinfo(t);
      ret.push(p_Start(p));
      first = false;
      t = p.peeknext();
    }
    p.expect("RSBRACKET");
    return ret;
  }
  function p_Object(p) {
    p.expect("LBRACE");
    let obj = {};
    let first = true;
    let t = p.peeknext();
    obj[TokSymbol] = tokinfo(t);
    while (t && t.type !== "RBRACE") {
      if (!first) {
        p.expect("COMMA");
      }
      let key = p.expect("STRLIT");
      p.expect("COLON");
      let val = p_Start(p, true);
      obj[key] = val;
      first = false;
      t = p.peeknext();
      obj[TokSymbol].fields[key] = tokinfo(t);
    }
    p.expect("RBRACE");
    return obj;
  }
  function p_Start(p, _throwError = true) {
    let t = p.peeknext();
    if (t.type === "LSBRACKET") {
      return p_Array(p);
    } else if (t.type === "LBRACE") {
      return p_Object(p);
    } else if (t.type === "STRLIT" || t.type === "NUM" || t.type === "NULL" || t.type === "BOOL") {
      return p.next().value;
    } else {
      p.error(t, "Unknown token");
    }
  }
  function p_Error(token2, _msg) {
    throw new PUTIL_ParseError("Parse Error");
  }
  let lex = new lexer(tokens);
  lex.linestart = 0;
  parse = new parser(lex, p_Error);
  parse.start = p_Start;
  return parse;
}
var jsonParser = buildJSONParser();
function printContext(buf, tokinfo, printColors = true) {
  let lines = buf.split("\n");
  if (!tokinfo) {
    return "";
  }
  let lineno = tokinfo.lineno;
  let col = tokinfo.col;
  let istart = Math.max(lineno - 50, 0);
  let iend = Math.min(lineno + 2, lines.length - 1);
  let s = "";
  if (printColors) {
    s += termColor("  /* pretty-printed json */\n", "blue");
  } else {
    s += "/* pretty-printed json */\n";
  }
  for (let i = istart; i < iend; i++) {
    let l = lines[i];
    let idx = "" + i;
    while (idx.length < 3) {
      idx = " " + idx;
    }
    if (i === lineno && printColors) {
      s += termColor(`${idx}: ${l}
`, "yellow");
    } else {
      s += `${idx}: ${l}
`;
    }
    if (i === lineno) {
      let l2 = "";
      for (let j = 0; j < col + 5; j++) {
        l2 += " ";
      }
      s += l2 + "^\n";
    }
  }
  return s;
}
var nGlobal;
if (typeof globalThis !== "undefined") {
  nGlobal = globalThis;
} else if (typeof window !== "undefined") {
  nGlobal = window;
} else if (typeof globalThis !== "undefined" && typeof globalThis["global"] !== "undefined") {
  nGlobal = globalThis["global"];
} else if (typeof self !== "undefined") {
  nGlobal = self;
} else {
  nGlobal = {};
}
var DEBUG = {};
function updateDEBUG() {
  for (let k2 in Object.keys(DEBUG)) {
    delete DEBUG[k2];
  }
  if (typeof nGlobal.DEBUG === "object") {
    let dbg = nGlobal.DEBUG;
    for (let k2 in dbg) {
      DEBUG[k2] = dbg[k2];
    }
  }
}
var sintern2 = _sintern2;
var struct_eval = _struct_eval;
var warninglvl = 2;
var truncateDollarSign$1 = true;
var manager;
var JSONError = class extends Error {
};
function printCodeLines(code2) {
  let lines = code2.split(String.fromCharCode(10));
  let buf = "";
  for (let i = 0; i < lines.length; i++) {
    let line2 = "" + (i + 1) + ":";
    while (line2.length < 3) {
      line2 += " ";
    }
    line2 += " " + lines[i];
    buf += line2 + String.fromCharCode(10);
  }
  return buf;
}
function printEvalError(code) {
  console.log("== CODE ==");
  console.log(printCodeLines(code));
  eval(code);
}
function setTruncateDollarSign(v) {
  truncateDollarSign$1 = !!v;
}
function _truncateDollarSign(s) {
  let i = s.search("$");
  if (i > 0) {
    return s.slice(0, i).trim();
  }
  return s;
}
function unmangle(name) {
  if (truncateDollarSign$1) {
    return _truncateDollarSign(name);
  } else {
    return name;
  }
}
var _static_envcode_null = "";
function gen_tabstr(tot) {
  let ret = "";
  for (let i = 0; i < tot; i++) {
    ret += " ";
  }
  return ret;
}
var packer_debug;
var packer_debug_start;
var packer_debug_end;
function update_debug_data() {
  let ret = _get_pack_debug();
  packer_debug = ret.packer_debug;
  packer_debug_start = ret.packer_debug_start;
  packer_debug_end = ret.packer_debug_end;
  warninglvl = ret.warninglvl;
}
update_debug_data();
function setWarningMode(t) {
  sintern2.setWarningMode2(t);
  if (typeof t !== "number" || isNaN(t)) {
    throw new Error("Expected a single number (>= 0) argument to setWarningMode");
  }
  warninglvl = t;
}
function setDebugMode(t) {
  sintern2.setDebugMode2(t);
  update_debug_data();
}
var _ws_env = [[void 0, void 0]];
function define_empty_class(scls, name) {
  let cls2 = function() {
  };
  cls2.prototype = Object.create(Object.prototype);
  cls2.constructor = cls2.prototype.constructor = cls2;
  let keywords = scls.keywords;
  cls2.STRUCT = name + " {\n  }\n";
  cls2.structName = name;
  cls2.prototype.loadSTRUCT = function(reader) {
    reader(this);
  };
  cls2.newSTRUCT = function() {
    return new cls2();
  };
  return cls2;
}
var haveCodeGen;
var STRUCT = class _STRUCT {
  idgen;
  allowOverriding;
  structs;
  struct_cls;
  struct_ids;
  compiled_code;
  null_natives;
  jsonUseColors;
  jsonBuf;
  formatCtx;
  jsonLogger;
  static keywords;
  constructor() {
    this.idgen = 0;
    this.allowOverriding = true;
    this.structs = {};
    this.struct_cls = {};
    this.struct_ids = {};
    this.compiled_code = {};
    this.null_natives = {};
    this.define_null_native("Object", Object);
    this.jsonUseColors = true;
    this.jsonBuf = "";
    this.formatCtx = {};
    this.jsonLogger = function(...args2) {
      console.log(...args2);
    };
  }
  static inherit(child, parent2, structName2 = child.name) {
    const keywords = this.keywords;
    if (!parent2.STRUCT) {
      return structName2 + "{\n";
    }
    let stt = struct_parse.parse(parent2.STRUCT);
    let code2 = structName2 + "{\n";
    code2 += _STRUCT.fmt_struct(stt, true, false, true);
    return code2;
  }
  /** invoke loadSTRUCT methods on parent objects.  note that
   reader() is only called once.  it is called however.*/
  static Super(obj, reader) {
    if (warninglvl > 0) {
      console.warn("deprecated");
    }
    reader(obj);
    function reader2(_obj) {
    }
    let cls2 = obj.constructor;
    let bad = cls2 === void 0 || cls2.prototype === void 0 || cls2.prototype.__proto__ === void 0;
    if (bad) {
      return;
    }
    let parent2 = cls2.prototype.__proto__.constructor;
    bad = bad || parent2 === void 0;
    if (!bad && parent2.prototype.loadSTRUCT && parent2.prototype.loadSTRUCT !== obj.loadSTRUCT) {
      parent2.prototype.loadSTRUCT.call(obj, reader2);
    }
  }
  /** deprecated.  used with old fromSTRUCT interface. */
  static chain_fromSTRUCT(cls2, reader) {
    if (warninglvl > 0) {
      console.warn("Using deprecated (and evil) chain_fromSTRUCT method, eek!");
    }
    let proto = cls2.prototype;
    let parent2 = proto.prototype.constructor;
    let obj = parent2.fromSTRUCT(reader);
    let obj2 = new cls2();
    let keys = Object.keys(obj).concat(
      Object.getOwnPropertySymbols(obj)
    );
    for (let i = 0; i < keys.length; i++) {
      let k2 = keys[i];
      try {
        obj2[k2] = obj[k2];
      } catch (error) {
        if (warninglvl > 0) {
          console.warn("  failed to set property", k2);
        }
      }
    }
    return obj2;
  }
  //defined_classes is an array of class constructors
  //with STRUCT scripts, *OR* another STRUCT instance
  static formatStruct(stt, internal_only, no_helper_js) {
    return this.fmt_struct(stt, internal_only, no_helper_js);
  }
  static fmt_struct(stt, internal_only, no_helper_js, addComments) {
    if (internal_only === void 0) internal_only = false;
    if (no_helper_js === void 0) no_helper_js = false;
    let s = "";
    if (!internal_only) {
      s += stt.name;
      if (stt.id !== -1) s += " id=" + stt.id;
      s += " {\n";
    }
    let tabStr = "  ";
    function fmt_type2(type) {
      return StructFieldTypeMap[type.type].format(type);
    }
    let fields = stt.fields;
    for (let i = 0; i < fields.length; i++) {
      let f2 = fields[i];
      s += tabStr + f2.name + " : " + fmt_type2(f2.type);
      if (!no_helper_js && f2.get !== void 0) {
        s += " | " + f2.get.trim();
      }
      s += ";";
      if (addComments && f2.comment.trim()) {
        s += f2.comment.trim();
      }
      s += "\n";
    }
    if (!internal_only) s += "}";
    return s;
  }
  static setClassKeyword(keyword, nameKeyword) {
    if (!nameKeyword) {
      nameKeyword = keyword.toLowerCase() + "Name";
    }
    this.keywords = {
      script: keyword,
      name: nameKeyword,
      load: "load" + keyword,
      new: "new" + keyword,
      after: "after" + keyword,
      from: "from" + keyword
    };
  }
  define_null_native(name, cls2) {
    const keywords = this.constructor.keywords;
    let obj = define_empty_class(this.constructor, name);
    let stt = struct_parse.parse(obj.STRUCT);
    stt.id = this.idgen++;
    this.structs[name] = stt;
    this.struct_cls[name] = cls2;
    this.struct_ids[stt.id] = stt;
    this.null_natives[name] = 1;
  }
  validateStructs(onerror) {
    function getType(type) {
      switch (type.type) {
        case StructEnum.ITERKEYS:
        case StructEnum.ITER:
        case StructEnum.STATIC_ARRAY:
        case StructEnum.ARRAY:
          return getType(type.data.type);
        case StructEnum.TSTRUCT:
          return type;
        case StructEnum.STRUCT:
          return type;
        default:
          return type;
      }
    }
    function formatType(type) {
      let ret = {};
      ret.type = type.type;
      if (typeof ret.type === "number") {
        for (let k2 in StructEnum) {
          if (StructEnum[k2] === ret.type) {
            ret.type = k2;
            break;
          }
        }
      } else if (typeof ret.type === "object") {
        ret.type = formatType(ret.type);
      }
      if (typeof type.data === "object") {
        ret.data = formatType(type.data);
      } else {
        ret.data = type.data;
      }
      return ret;
    }
    let self2 = this;
    function throwError(stt, field, msg) {
      let buf = _STRUCT.formatStruct(stt);
      console.error(buf + "\n\n" + msg);
      if (onerror) {
        onerror(msg, stt, field);
      } else {
        throw new Error(msg);
      }
    }
    for (let k2 in this.structs) {
      let stt = this.structs[k2];
      for (let field of stt.fields) {
        if (field.name === "this") {
          let type2 = field.type.type;
          if (ValueTypes.has(type2)) {
            throwError(stt, field, "'this' cannot be used with value types");
          }
        }
        let type = getType(field.type);
        if (type.type !== StructEnum.STRUCT && type.type !== StructEnum.TSTRUCT) {
          continue;
        }
        if (!(type.data in this.structs)) {
          let msg = stt.name + ":" + field.name + ": Unknown struct " + type.data + ".";
          throwError(stt, field, msg);
        }
      }
    }
  }
  forEach(func2, thisvar) {
    for (let k2 in this.structs) {
      let stt = this.structs[k2];
      if (thisvar !== void 0) func2.call(thisvar, stt);
      else func2(stt);
    }
  }
  //defaults to structjs.manager
  parse_structs(buf, defined_classes) {
    const keywords = this.constructor.keywords;
    if (defined_classes === void 0) {
      defined_classes = manager;
    }
    let classList;
    if (defined_classes instanceof _STRUCT) {
      let struct2 = defined_classes;
      classList = [];
      for (let k2 in struct2.struct_cls) {
        classList.push(struct2.struct_cls[k2]);
      }
    } else if (defined_classes === void 0) {
      classList = [];
      for (let k2 in manager.struct_cls) {
        classList.push(manager.struct_cls[k2]);
      }
    } else {
      classList = defined_classes;
    }
    let clsmap = {};
    for (let i = 0; i < classList.length; i++) {
      let cls2 = classList[i];
      if (!cls2.structName && cls2.STRUCT) {
        let stt = struct_parse.parse(cls2.STRUCT.trim());
        cls2.structName = stt.name;
      } else if (!cls2.structName && cls2.name !== "Object") {
        if (warninglvl > 0) console.log("Warning, bad class in registered class list", unmangle(cls2.name), cls2);
        continue;
      }
      clsmap[cls2.structName] = classList[i];
    }
    struct_parse.input(buf);
    while (!struct_parse.at_end()) {
      let stt = struct_parse.parse(void 0, false);
      if (!(stt.name in clsmap)) {
        if (!(stt.name in this.null_natives)) {
          if (warninglvl > 0) console.log("WARNING: struct " + stt.name + " is missing from class list.");
        }
        let dummy = define_empty_class(this.constructor, stt.name);
        dummy.STRUCT = _STRUCT.fmt_struct(stt);
        dummy.structName = stt.name;
        dummy.prototype.structName = dummy.name;
        this.struct_cls[dummy.structName] = dummy;
        this.structs[dummy.structName] = stt;
        if (stt.id !== -1) this.struct_ids[stt.id] = stt;
      } else {
        this.struct_cls[stt.name] = clsmap[stt.name];
        this.structs[stt.name] = stt;
        if (stt.id !== -1) this.struct_ids[stt.id] = stt;
      }
      let tok = struct_parse.peek();
      while (tok && (tok.value === "\n" || tok.value === "\r" || tok.value === "	" || tok.value === " ")) {
        tok = struct_parse.peek();
      }
    }
  }
  /** adds all structs referenced by cls inside of srcSTRUCT
   *  to this */
  registerGraph(srcSTRUCT, cls2) {
    if (!cls2.structName) {
      console.warn("class was not in srcSTRUCT");
      return this.register(cls2);
    }
    let recStruct;
    let recArray = (t) => {
      switch (t.type) {
        case StructEnum.ARRAY:
          return recArray(t.data.type);
        case StructEnum.ITERKEYS:
          return recArray(t.data.type);
        case StructEnum.STATIC_ARRAY:
          return recArray(t.data.type);
        case StructEnum.ITER:
          return recArray(t.data.type);
        case StructEnum.STRUCT:
        case StructEnum.TSTRUCT: {
          let st2 = srcSTRUCT.structs[t.data];
          let cls3 = srcSTRUCT.struct_cls[st2.name];
          return recStruct(st2, cls3);
        }
      }
    };
    recStruct = (st2, cls3) => {
      if (!(cls3.structName in this.structs)) {
        this.add_class(cls3, cls3.structName);
      }
      for (let f2 of st2.fields) {
        if (f2.type.type === StructEnum.STRUCT || f2.type.type === StructEnum.TSTRUCT) {
          let st22 = srcSTRUCT.structs[f2.type.data];
          let cls22 = srcSTRUCT.struct_cls[st22.name];
          recStruct(st22, cls22);
        } else if (f2.type.type === StructEnum.ARRAY) {
          recArray(f2.type);
        } else if (f2.type.type === StructEnum.ITER) {
          recArray(f2.type);
        } else if (f2.type.type === StructEnum.ITERKEYS) {
          recArray(f2.type);
        } else if (f2.type.type === StructEnum.STATIC_ARRAY) {
          recArray(f2.type);
        }
      }
    };
    let st = srcSTRUCT.structs[cls2.structName];
    recStruct(st, cls2);
  }
  mergeScripts(child, parent2) {
    let stc = struct_parse.parse(child.trim());
    let stp = struct_parse.parse(parent2.trim());
    let fieldset = /* @__PURE__ */ new Set();
    for (let f2 of stc.fields) {
      fieldset.add(f2.name);
    }
    let fields = [];
    for (let f2 of stp.fields) {
      if (!fieldset.has(f2.name)) {
        fields.push(f2);
      }
    }
    stc.fields = fields.concat(stc.fields);
    return _STRUCT.fmt_struct(stc, false, false);
  }
  inlineRegister(cls2, structScript) {
    const keywords = this.constructor.keywords;
    let p = cls2.__proto__;
    while (p && p !== Object) {
      if (p.hasOwnProperty(keywords.script)) {
        structScript = this.mergeScripts(structScript, p.STRUCT);
        break;
      }
      p = p.__proto__;
    }
    cls2.STRUCT = structScript;
    this.register(cls2);
    return structScript;
  }
  register(cls2, structName2) {
    return this.add_class(cls2, structName2);
  }
  unregister(cls2) {
    const keywords = this.constructor.keywords;
    if (!cls2 || !cls2.structName || !(cls2.structName in this.struct_cls)) {
      console.warn("Class not registered with nstructjs", cls2);
      return;
    }
    let st = this.structs[cls2.structName];
    delete this.structs[cls2.structName];
    delete this.struct_cls[cls2.structName];
    delete this.struct_ids[st.id];
  }
  add_class(cls2, structName2) {
    if (cls2 === Object) {
      return;
    }
    const keywords = this.constructor.keywords;
    if (cls2.STRUCT) {
      let bad = false;
      let p = cls2;
      while (p) {
        p = p.__proto__;
        if (p && p.STRUCT && p.STRUCT === cls2.STRUCT) {
          bad = true;
          break;
        }
      }
      if (bad) {
        if (warninglvl > 0) {
          console.warn("Generating " + keywords.script + " script for derived class " + unmangle(cls2.name));
        }
        if (!structName2) {
          structName2 = unmangle(cls2.name);
        }
        cls2.STRUCT = _STRUCT.inherit(cls2, p) + "\n}";
      }
    }
    if (!cls2.STRUCT) {
      throw new Error("class " + unmangle(cls2.name) + " has no " + keywords.script + " script");
    }
    let stt = struct_parse.parse(cls2.STRUCT);
    stt.name = unmangle(stt.name);
    cls2.structName = stt.name;
    if (cls2.newSTRUCT === void 0) {
      cls2.newSTRUCT = function() {
        return new this();
      };
    }
    if (structName2 !== void 0) {
      stt.name = cls2.structName = structName2;
    } else if (cls2.structName === void 0) {
      cls2.structName = stt.name;
    } else {
      stt.name = cls2.structName;
    }
    if (cls2.structName in this.structs) {
      if (warninglvl > 0) {
        console.warn("Struct " + unmangle(cls2.structName) + " is already registered", cls2);
      }
      if (!this.allowOverriding) {
        throw new Error("Struct " + unmangle(cls2.structName) + " is already registered");
      }
      return;
    }
    if (stt.id === -1) stt.id = this.idgen++;
    this.structs[cls2.structName] = stt;
    this.struct_cls[cls2.structName] = cls2;
    this.struct_ids[stt.id] = stt;
  }
  isRegistered(cls2) {
    const keywords = this.constructor.keywords;
    if (!cls2.hasOwnProperty("structName")) {
      return false;
    }
    return cls2 === this.struct_cls[cls2.structName];
  }
  get_struct_id(id) {
    return this.struct_ids[id];
  }
  get_struct(name) {
    if (!(name in this.structs)) {
      console.warn("Unknown struct", name);
      throw new Error("Unknown struct " + name);
    }
    return this.structs[name];
  }
  get_struct_cls(name) {
    if (!(name in this.struct_cls)) {
      console.trace();
      throw new Error("Unknown struct " + name);
    }
    return this.struct_cls[name];
  }
  _env_call(code2, obj, env) {
    let envcode = _static_envcode_null;
    if (env !== void 0) {
      envcode = "";
      for (let i = 0; i < env.length; i++) {
        envcode = "let " + env[i][0] + " = env[" + i.toString() + "][1];\n" + envcode;
      }
    }
    let fullcode = "";
    if (envcode !== _static_envcode_null) fullcode = envcode + code2;
    else fullcode = code2;
    let func2;
    if (!(fullcode in this.compiled_code)) {
      let code22 = "func = function(obj, env) { " + envcode + "return " + code2 + "}";
      try {
        func2 = struct_eval.structEval(code22);
      } catch (err) {
        console.warn(err.stack);
        console.warn(code22);
        console.warn(" ");
        throw err;
      }
      this.compiled_code[fullcode] = func2;
    } else {
      func2 = this.compiled_code[fullcode];
    }
    try {
      return func2.call(obj, obj, env);
    } catch (err) {
      console.warn(err.stack);
      let code22 = "func = function(obj, env) { " + envcode + "return " + code2 + "}";
      console.warn(code22);
      console.warn(" ");
      throw err;
    }
  }
  write_struct(data, obj, stt) {
    function use_helper_js(field) {
      let type = field.type.type;
      let cls2 = StructFieldTypeMap[type];
      return cls2.useHelperJS(field);
    }
    let fields = stt.fields;
    let thestruct = this;
    let objRec = obj;
    for (let i = 0; i < fields.length; i++) {
      let f2 = fields[i];
      let t1 = f2.type;
      let t2 = t1.type;
      if (use_helper_js(f2)) {
        let val;
        if (f2.get !== void 0) {
          val = thestruct._env_call(f2.get, obj);
        } else {
          val = f2.name === "this" ? obj : objRec[f2.name];
        }
        if (DEBUG.tinyeval) {
          console.log("\n\n\n", f2.get, "Helper JS Ret", val, "\n\n\n");
        }
        sintern2.do_pack(this, data, val, obj, f2, t1);
      } else {
        let val = f2.name === "this" ? obj : objRec[f2.name];
        sintern2.do_pack(this, data, val, obj, f2, t1);
      }
    }
  }
  /**
   @param data : array to write data into,
   @param obj  : structable object
   */
  write_object(data, obj) {
    const keywords = this.constructor.keywords;
    let cls2 = obj.constructor.structName;
    let stt = this.get_struct(cls2);
    if (data === void 0) {
      data = [];
    }
    this.write_struct(data, obj, stt);
    return data;
  }
  /**
     Read an object from binary data
  
     @param data : DataView or Uint8Array instance
     @param cls_or_struct_id : Structable class
     @param uctx : internal parameter
     @return Instance of cls_or_struct_id
     */
  readObject(data, cls_or_struct_id, uctx) {
    if (data instanceof Uint8Array || data instanceof Uint8ClampedArray) {
      data = new DataView(data.buffer);
    } else if (data instanceof Array) {
      data = new DataView(new Uint8Array(data).buffer);
    }
    return this.read_object(data, cls_or_struct_id, uctx);
  }
  /**
   @param data array to write data into,
   @param obj structable object
   */
  writeObject(data, obj) {
    return this.write_object(data, obj);
  }
  writeJSON(obj, stt) {
    const keywords = this.constructor.keywords;
    let cls2 = obj.constructor;
    stt = stt || this.get_struct(cls2.structName);
    function use_helper_js(field) {
      let type = field.type.type;
      let cls3 = StructFieldTypeMap[type];
      return cls3.useHelperJS(field);
    }
    let _toJSON = sintern2.toJSON;
    let fields = stt.fields;
    let thestruct = this;
    let json = {};
    for (let i = 0; i < fields.length; i++) {
      let f2 = fields[i];
      let val;
      let t1 = f2.type;
      let json2;
      if (use_helper_js(f2)) {
        if (f2.get !== void 0) {
          val = thestruct._env_call(f2.get, obj);
        } else {
          val = f2.name === "this" ? obj : obj[f2.name];
        }
        if (DEBUG.tinyeval) {
          console.log("\n\n\n", f2.get, "Helper JS Ret", val, "\n\n\n");
        }
        json2 = _toJSON(this, val, obj, f2, t1);
      } else {
        val = f2.name === "this" ? obj : obj[f2.name];
        json2 = _toJSON(this, val, obj, f2, t1);
      }
      if (f2.name !== "this") {
        json[f2.name] = json2;
      } else {
        let isArray = Array.isArray(json2);
        isArray = isArray || f2.type.type === StructTypes.ARRAY;
        isArray = isArray || f2.type.type === StructTypes.STATIC_ARRAY;
        if (isArray) {
          let arr = json2;
          json.length = arr.length;
          for (let i2 = 0; i2 < arr.length; i2++) {
            json[i2] = arr[i2];
          }
        } else {
          Object.assign(json, json2);
        }
      }
    }
    return json;
  }
  /**
   @param data : DataView or Uint8Array instance
   @param cls_or_struct_id : Structable class
   @param uctx : internal parameter
   */
  read_object(data, cls_or_struct_id, uctx, objInstance) {
    const keywords = this.constructor.keywords;
    let cls2;
    let stt;
    if (data instanceof Array) {
      data = new DataView(new Uint8Array(data).buffer);
    }
    if (typeof cls_or_struct_id === "number") {
      cls2 = this.struct_cls[this.struct_ids[cls_or_struct_id].name];
    } else {
      cls2 = cls_or_struct_id;
    }
    if (cls2 === void 0) {
      throw new Error("bad cls_or_struct_id " + cls_or_struct_id);
    }
    stt = this.structs[cls2.structName];
    if (uctx === void 0) {
      uctx = new unpack_context();
      packer_debug("\n\n=Begin reading " + cls2.structName + "=");
    }
    let thestruct = this;
    let this2 = this;
    function _unpack_field(type) {
      return StructFieldTypeMap[type.type].unpack(this2, data, type, uctx);
    }
    function _unpack_into(type, dest) {
      return StructFieldTypeMap[type.type].unpackInto(
        this2,
        data,
        type,
        uctx,
        dest
      );
    }
    let was_run = false;
    function makeLoader(stt2) {
      return function load2(obj) {
        if (was_run) {
          return;
        }
        was_run = true;
        let fields = stt2.fields;
        let flen = fields.length;
        for (let i = 0; i < flen; i++) {
          let f2 = fields[i];
          if (f2.name === "this") {
            _unpack_into(f2.type, obj);
          } else {
            obj[f2.name] = _unpack_field(f2.type);
          }
        }
      };
    }
    let load = makeLoader(stt);
    if (cls2.prototype.loadSTRUCT !== void 0) {
      let obj = objInstance;
      if (!obj && cls2.newSTRUCT !== void 0) {
        obj = cls2.newSTRUCT(load);
      } else if (!obj) {
        obj = new cls2();
      }
      obj.loadSTRUCT(load);
      if (!was_run) {
        console.warn("" + cls2.structName + ".prototype.loadSTRUCT() did not execute its loader callback!");
        load(obj);
      }
      return obj;
    } else if (cls2.fromSTRUCT !== void 0) {
      if (warninglvl > 1) {
        console.warn(
          "Warning: class " + unmangle(cls2.name) + " is using deprecated fromSTRUCT interface; use newSTRUCT/loadSTRUCT instead"
        );
      }
      return cls2.fromSTRUCT(load);
    } else {
      let obj = objInstance;
      if (!obj && cls2.newSTRUCT !== void 0) {
        obj = cls2.newSTRUCT(load);
      } else if (!obj) {
        obj = new cls2();
      }
      load(obj);
      return obj;
    }
  }
  validateJSON(json, cls_or_struct_id, useInternalParser = true, useColors = true, consoleLoggerFn = function(...args2) {
    console.log(...args2);
  }, _abstractKey = "_structName") {
    if (cls_or_struct_id === void 0) {
      throw new Error(this.constructor.name + ".prototype.validateJSON: Expected at least two arguments");
    }
    try {
      let jsonStr = JSON.stringify(json, void 0, 2);
      this.jsonBuf = jsonStr;
      this.jsonUseColors = useColors;
      this.jsonLogger = consoleLoggerFn;
      jsonParser.logger = this.jsonLogger;
      let parsed;
      if (useInternalParser) {
        parsed = jsonParser.parse(jsonStr);
      } else {
        parsed = JSON.parse(jsonStr);
      }
      this.validateJSONIntern(parsed, cls_or_struct_id, _abstractKey);
    } catch (error) {
      if (!(error instanceof JSONError)) {
        console.error(error.stack);
      }
      this.jsonLogger(error.message);
      return false;
    }
    return true;
  }
  validateJSONIntern(json, cls_or_struct_id, _abstractKey = "_structName") {
    const keywords = this.constructor.keywords;
    let cls2;
    let stt;
    if (typeof cls_or_struct_id === "number") {
      cls2 = this.struct_cls[this.struct_ids[cls_or_struct_id].name];
    } else if (cls_or_struct_id instanceof NStruct) {
      cls2 = this.get_struct_cls(cls_or_struct_id.name);
    } else {
      cls2 = cls_or_struct_id;
    }
    if (cls2 === void 0) {
      throw new Error("bad cls_or_struct_id " + cls_or_struct_id);
    }
    stt = this.structs[cls2.structName];
    if (stt === void 0) {
      throw new Error("unknown class " + cls2);
    }
    let jsonObj = json;
    let fields = stt.fields;
    let flen = fields.length;
    let keys = /* @__PURE__ */ new Set();
    keys.add(_abstractKey);
    let keyTestJson = jsonObj;
    for (let i = 0; i < flen; i++) {
      let f2 = fields[i];
      let val;
      let tinfo;
      if (f2.name === "this") {
        val = json;
        keyTestJson = {
          "this": json
        };
        keys.add("this");
        tinfo = jsonObj[TokSymbol];
      } else {
        val = jsonObj[f2.name];
        keys.add(f2.name);
        tinfo = jsonObj[TokSymbol] ? jsonObj[TokSymbol].fields[f2.name] : void 0;
        if (!tinfo) {
          let f22 = fields[Math.max(i - 1, 0)];
          tinfo = jsonObj[TokSymbol] ? jsonObj[TokSymbol].fields[f22.name] : void 0;
        }
        if (!tinfo) {
          tinfo = jsonObj[TokSymbol];
        }
      }
      if (val === void 0) {
      }
      let instance = f2.name === "this" ? val : json;
      let ret = sintern2.validateJSON(this, val, json, f2, f2.type, instance, _abstractKey);
      if (!ret || typeof ret === "string") {
        let msg = typeof ret === "string" ? ": " + ret : "";
        if (tinfo) {
          this.jsonLogger(printContext(this.jsonBuf, tinfo, this.jsonUseColors));
        }
        if (val === void 0) {
          throw new JSONError(stt.name + ": Missing json field " + f2.name + msg);
        } else {
          throw new JSONError(stt.name + ": Invalid json field " + f2.name + msg);
        }
        return false;
      }
    }
    for (let k2 in keyTestJson) {
      if (typeof jsonObj[k2] === "symbol") {
        continue;
      }
      if (!keys.has(k2)) {
        this.jsonLogger(cls2.STRUCT);
        throw new JSONError(stt.name + ": Unknown json field " + k2);
      }
    }
    return true;
  }
  readJSON(json, cls_or_struct_id, objInstance) {
    const keywords = this.constructor.keywords;
    let cls2;
    let stt;
    if (typeof cls_or_struct_id === "number") {
      cls2 = this.struct_cls[this.struct_ids[cls_or_struct_id].name];
    } else if (cls_or_struct_id instanceof NStruct) {
      cls2 = this.get_struct_cls(cls_or_struct_id.name);
    } else {
      cls2 = cls_or_struct_id;
    }
    if (cls2 === void 0) {
      throw new Error("bad cls_or_struct_id " + cls_or_struct_id);
    }
    stt = this.structs[cls2.structName];
    packer_debug("\n\n=Begin reading " + cls2.structName + "=");
    let thestruct = this;
    let this2 = this;
    let was_run = false;
    let _fromJSON = sintern2.fromJSON;
    function makeLoader(stt2) {
      return function load2(obj) {
        if (was_run) {
          return;
        }
        was_run = true;
        let fields = stt2.fields;
        let flen = fields.length;
        let jsonObj = json;
        for (let i = 0; i < flen; i++) {
          let f2 = fields[i];
          let val;
          if (f2.name === "this") {
            val = json;
          } else {
            val = jsonObj[f2.name];
          }
          if (val === void 0) {
            if (warninglvl > 1) {
              console.warn("nstructjs.readJSON: Missing field " + f2.name + " in struct " + stt2.name);
            }
            continue;
          }
          let instance = f2.name === "this" ? obj : objInstance;
          let ret = _fromJSON(this2, val, obj, f2, f2.type, instance);
          if (f2.name !== "this") {
            obj[f2.name] = ret;
          }
        }
      };
    }
    let load = makeLoader(stt);
    if (cls2.prototype.loadSTRUCT !== void 0) {
      let obj = objInstance;
      if (!obj && cls2.newSTRUCT !== void 0) {
        obj = cls2.newSTRUCT(load);
      } else if (!obj) {
        obj = new cls2();
      }
      obj.loadSTRUCT(load);
      return obj;
    } else if (cls2.fromSTRUCT !== void 0) {
      if (warninglvl > 1) {
        console.warn(
          "Warning: class " + unmangle(cls2.name) + " is using deprecated fromSTRUCT interface; use newSTRUCT/loadSTRUCT instead"
        );
      }
      return cls2.fromSTRUCT(load);
    } else {
      let obj = objInstance;
      if (!obj && cls2.newSTRUCT !== void 0) {
        obj = cls2.newSTRUCT(load);
      } else if (!obj) {
        obj = new cls2();
      }
      load(obj);
      return obj;
    }
  }
  formatJSON_intern(json, stt, field, tlvl = 0) {
    const keywords = this.constructor.keywords;
    const addComments = this.formatCtx.addComments;
    let jsonObj = json;
    let s = "{";
    if (addComments && field && field.comment.trim()) {
      s += " " + field.comment.trim();
    }
    s += "\n";
    for (let f2 of stt.fields) {
      let value = jsonObj[f2.name];
      s += tab(tlvl + 1) + f2.name + ": ";
      s += sintern2.formatJSON(this, value, json, f2, f2.type, void 0, tlvl + 1);
      s += ",";
      let basetype = f2.type.type;
      if (ArrayTypes.has(basetype)) {
        basetype = f2.type.data.type.type;
      }
      const addComment = ValueTypes.has(basetype) && addComments && f2.comment.trim();
      if (addComment) {
        s += " " + f2.comment.trim();
      }
      s += "\n";
    }
    s += tab(tlvl) + "}";
    return s;
  }
  formatJSON(json, cls2, addComments = true, validate = true) {
    const keywords = this.constructor.keywords;
    if (validate) {
      this.validateJSON(json, cls2);
    }
    let stt = this.structs[cls2.structName];
    this.formatCtx = {
      addComments,
      validate
    };
    return this.formatJSON_intern(json, stt);
  }
};
if (haveCodeGen) {
  try {
    eval(
      ""
      /* code placeholder */
    );
  } catch (error) {
    printEvalError(
      ""
      /* code placeholder */
    );
  }
  if (StructClass) {
    StructClass.keywords = {
      name: "structName",
      script: "STRUCT",
      load: "loadSTRUCT",
      from: "fromSTRUCT",
      new: "newSTRUCT"
    };
  }
}
var StructClass;
STRUCT.setClassKeyword("STRUCT");
function deriveStructManager(keywords = {
  script: "STRUCT",
  name: "structName",
  load: "loadSTRUCT",
  new: "newSTRUCT",
  from: "fromSTRUCT"
}) {
  if (!keywords.name) {
    keywords.name = keywords.script.toLowerCase() + "Name";
  }
  if (!keywords.load) {
    keywords.load = "load" + keywords.script;
  }
  if (!keywords.new) {
    keywords.new = "new" + keywords.script;
  }
  if (!keywords.from) {
    keywords.from = "from" + keywords.script;
  }
  class NewSTRUCT extends STRUCT {
  }
  NewSTRUCT.keywords = keywords;
  return NewSTRUCT;
}
manager = new STRUCT();
function write_scripts(nManager = manager, include_code = false) {
  let buf = "";
  let nl = String.fromCharCode(10);
  let tabChar = String.fromCharCode(9);
  nManager.forEach(function(stt) {
    buf += STRUCT.fmt_struct(stt, false, !include_code) + nl;
  });
  let buf2 = buf;
  buf = "";
  for (let i = 0; i < buf2.length; i++) {
    let c = buf2[i];
    if (c === nl) {
      buf += nl;
      let i2 = i;
      while (i < buf2.length && (buf2[i] === " " || buf2[i] === tabChar || buf2[i] === nl)) {
        i++;
      }
      if (i !== i2) i--;
    } else {
      buf += c;
    }
  }
  return buf;
}
var nbtoa;
var natob;
if (typeof btoa === "undefined") {
  nbtoa = function btoa2(str) {
    let BufferCls = globalThis["Buffer"];
    let buffer = BufferCls.from("" + str, "binary");
    return buffer.toString("base64");
  };
  natob = function atob2(str) {
    let BufferCls = globalThis["Buffer"];
    return BufferCls.from(str, "base64").toString("binary");
  };
} else {
  natob = atob;
  nbtoa = btoa;
}
function versionToInt(v) {
  v = versionCoerce(v);
  let mul = 64;
  return ~~(v.major * mul * mul * mul + v.minor * mul * mul + v.micro * mul);
}
var ver_pat = /[0-9]+\.[0-9]+\.[0-9]+$/;
function versionCoerce(v) {
  if (!v) {
    throw new Error("empty version: " + v);
  }
  if (typeof v === "string") {
    if (!ver_pat.exec(v)) {
      throw new Error("invalid version string " + v);
    }
    let ver = v.split(".");
    return {
      major: parseInt(ver[0]),
      minor: parseInt(ver[1]),
      micro: parseInt(ver[2])
    };
  } else if (Array.isArray(v)) {
    const arr = v;
    return {
      major: arr[0],
      minor: arr[1],
      micro: arr[2]
    };
  } else if (typeof v === "object" && v !== null) {
    let vObj = v;
    let test = (k2) => k2 in vObj && typeof vObj[k2] === "number";
    if (!test("major") || !test("minor") || !test("micro")) {
      throw new Error("invalid version object: " + v);
    }
    return v;
  } else {
    throw new Error("invalid version " + v);
  }
}
function versionLessThan(a, b) {
  return versionToInt(a) < versionToInt(b);
}
var FileParams = class {
  magic;
  ext;
  blocktypes;
  version;
  constructor() {
    this.magic = "STRT";
    this.ext = ".bin";
    this.blocktypes = ["DATA"];
    this.version = {
      major: 0,
      minor: 0,
      micro: 1
    };
  }
};
var Block = class {
  type;
  data;
  constructor(type, data) {
    this.type = type || "";
    this.data = data;
  }
};
var FileeError = class extends Error {
};
var FileHelper = class {
  version;
  blocktypes;
  magic;
  ext;
  struct;
  unpack_ctx;
  blocks;
  //params can be FileParams instance, or object literal
  //(it will convert to FileParams)
  constructor(params) {
    if (params === void 0) {
      params = new FileParams();
    } else {
      let fp = new FileParams();
      for (let k2 in params) {
        fp[k2] = params[k2];
      }
      params = fp;
    }
    this.version = params.version;
    this.blocktypes = params.blocktypes;
    this.magic = params.magic;
    this.ext = params.ext;
    this.struct = void 0;
    this.unpack_ctx = void 0;
    this.blocks = [];
  }
  read(dataview) {
    this.unpack_ctx = new unpack_context();
    let magic = unpack_static_string(dataview, this.unpack_ctx, 4);
    if (magic !== this.magic) {
      throw new FileeError("corrupted file");
    }
    this.version = {
      major: 0,
      minor: 0,
      micro: 0
    };
    this.version.major = unpack_short(dataview, this.unpack_ctx);
    this.version.minor = unpack_byte(dataview, this.unpack_ctx);
    this.version.micro = unpack_byte(dataview, this.unpack_ctx);
    let struct = this.struct = new STRUCT();
    let scripts = unpack_string(dataview, this.unpack_ctx);
    this.struct.parse_structs(scripts, manager);
    let blocks = [];
    let dviewlen = dataview.buffer.byteLength;
    while (this.unpack_ctx.i < dviewlen) {
      let type = unpack_static_string(dataview, this.unpack_ctx, 4);
      let datalen = unpack_int(dataview, this.unpack_ctx);
      let bstruct = unpack_int(dataview, this.unpack_ctx);
      let bdata;
      if (bstruct === -2) {
        bdata = unpack_static_string(dataview, this.unpack_ctx, datalen);
      } else {
        bdata = unpack_bytes(dataview, this.unpack_ctx, datalen);
        bdata = struct.read_object(bdata, bstruct, new unpack_context());
      }
      let block = new Block();
      block.type = type;
      block.data = bdata;
      blocks.push(block);
    }
    this.blocks = blocks;
    return blocks;
  }
  doVersions(old) {
    let blocks = this.blocks;
    if (versionLessThan(old, "0.0.1")) {
    }
  }
  write(blocks) {
    this.struct = manager;
    this.blocks = blocks;
    let data = [];
    pack_static_string(data, this.magic, 4);
    pack_short(data, this.version.major);
    pack_byte(data, this.version.minor & 255);
    pack_byte(data, this.version.micro & 255);
    let scripts = write_scripts();
    pack_string(data, scripts);
    let struct = this.struct;
    for (let block of blocks) {
      if (typeof block.data === "string") {
        pack_static_string(data, block.type, 4);
        pack_int(data, block.data.length);
        pack_int(data, -2);
        pack_static_string(data, block.data, block.data.length);
        continue;
      }
      let structName2 = block.data.constructor ? block.data.constructor.structName : void 0;
      if (structName2 === void 0 || !(structName2 in struct.structs)) {
        throw new Error("Non-STRUCTable object " + block.data);
      }
      let data2 = [];
      let stt = struct.structs[structName2];
      struct.write_object(data2, block.data);
      pack_static_string(data, block.type, 4);
      pack_int(data, data2.length);
      pack_int(data, stt.id);
      pack_bytes(data, data2);
    }
    return new DataView(new Uint8Array(data).buffer);
  }
  writeBase64(blocks) {
    let dataview = this.write(blocks);
    let str = "";
    let bytes = new Uint8Array(dataview.buffer);
    for (let i = 0; i < bytes.length; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    return nbtoa(str);
  }
  makeBlock(type, data) {
    return new Block(type, data);
  }
  readBase64(base64) {
    let data = natob(base64);
    let data2 = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      data2[i] = data.charCodeAt(i);
    }
    return this.read(new DataView(data2.buffer));
  }
};
var struct_filehelper = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  versionToInt,
  versionCoerce,
  versionLessThan,
  FileParams,
  Block,
  FileeError,
  FileHelper
});
function truncateDollarSign(value = true) {
  setTruncateDollarSign(value);
}
function validateStructs(onerror) {
  return manager.validateStructs(onerror);
}
function setEndian(mode) {
  let ret = STRUCT_ENDIAN;
  setBinaryEndian(mode);
  return ret;
}
function consoleLogger(...args2) {
  console.log(...args2);
}
function validateJSON(json, cls2, useInternalParser, printColors = true, logger = consoleLogger) {
  return manager.validateJSON(json, cls2, useInternalParser, printColors, logger);
}
function getEndian() {
  return STRUCT_ENDIAN;
}
function setAllowOverriding(t) {
  return manager.allowOverriding = !!t;
}
function isRegistered(cls2) {
  return manager.isRegistered(cls2);
}
function inlineRegister(cls2, structScript) {
  return manager.inlineRegister(cls2, structScript);
}
function register(cls2, structName2) {
  return manager.register(cls2, structName2);
}
function unregister(cls2) {
  manager.unregister(cls2);
}
function inherit(child, parent2, structName2) {
  return STRUCT.inherit(
    child,
    parent2,
    structName2 ?? child.name
  );
}
function readObject(data, cls2, __uctx) {
  return manager.readObject(data, cls2, __uctx);
}
function writeObject(data, obj) {
  return manager.writeObject(data, obj);
}
function writeJSON(obj) {
  return manager.writeJSON(obj);
}
function formatJSON(json, cls2, addComments = true, validate = true) {
  return manager.formatJSON(json, cls2, addComments, validate);
}
function readJSON(json, class_or_struct_id) {
  return manager.readJSON(json, class_or_struct_id);
}

// struct.ts
var struct_default = nstructjs_es6_exports;

// genVectormath.ts
import fs from "fs";

// indexRange.js
function _class_call_check(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}
function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}
function _create_class(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}
function _define_property(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
var IndexRangeStack = [];
var _IndexRange = /* @__PURE__ */ (function() {
  "use strict";
  function _IndexRange2(start, end) {
    _class_call_check(this, _IndexRange2);
    _define_property(this, "start", 0);
    _define_property(this, "end", 0);
    _define_property(this, "i", 0);
    _define_property(this, "ret", {
      done: false,
      value: void 0
    });
    this.start = start;
    this.end = end;
  }
  _create_class(_IndexRange2, [
    {
      key: Symbol.iterator,
      value: function value() {
        return this;
      }
    },
    {
      key: "next",
      value: function next() {
        if (this.i < this.end) {
          this.ret.done = false;
          this.ret.value = this.i++;
          return this.ret;
        } else {
          this.finish();
          this.ret.done = true;
          return this.ret;
        }
      }
    },
    {
      key: "finish",
      value: function finish() {
        IndexRangeStack.cur--;
      }
    },
    {
      key: "reset",
      value: function reset(start, end) {
        var i = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 0;
        this.start = start;
        this.end = end;
        this.i = i;
        return this;
      }
    },
    {
      key: "return",
      value: function _return() {
        this.reset();
        this.finish();
        return this.ret;
      }
    }
  ]);
  return _IndexRange2;
})();
IndexRangeStack = [];
IndexRangeStack.cur = 0;
for (i = 0; i < 2048; i++) {
  IndexRangeStack[i] = new _IndexRange(0, 0);
}
var i;
function IndexRange(len) {
  return IndexRangeStack[IndexRangeStack.cur++].reset(0, len);
}

// matrix4Code.ts
var Matrix4Code = `
/** Incredibly old matrix class. */
export const EulerOrders = {
  XYZ: 0,
  XZY: 1,
  YXZ: 2,
  YZX: 3,
  ZXY: 4,
  ZYX: 5,
};
export type EulerOrders = (typeof EulerOrders)[keyof typeof EulerOrders];

var lookat_cache_vs3: util.cachering<Vector3>;
let lookat_cache_vs4: util.cachering<Vector4>;
let lookat_cache_ms: util.cachering<Matrix4>;
let euler_rotate_mats: util.cachering<Matrix4>;
let makenormalcache: util.cachering<Vector3>;
let temp_mats: util.cachering<Matrix4>;
let preMultTemp: Matrix4;

function myclamp(f:number, a:number, b:number) {
  return Math.min(Math.max(f, a), b);
}

class internal_matrix {
  m11: number;
  m12: number;
  m13: number;
  m14: number;
  m21: number;
  m22: number;
  m23: number;
  m24: number;
  m31: number;
  m32: number;
  m33: number;
  m34: number;
  m41: number;
  m42: number;
  m43: number;
  m44: number;

  constructor() {
    this.m11 = 1.0;
    this.m12 = 0.0;
    this.m13 = 0.0;
    this.m14 = 0.0;
    this.m21 = 0.0;
    this.m22 = 1.0;
    this.m23 = 0.0;
    this.m24 = 0.0;
    this.m31 = 0.0;
    this.m32 = 0.0;
    this.m33 = 1.0;
    this.m34 = 0.0;
    this.m41 = 0.0;
    this.m42 = 0.0;
    this.m43 = 0.0;
    this.m44 = 1.0;
  }
}

export class Matrix4 {
static STRUCT = nstructjs.inlineRegister(this, \`
    mat4 {
      mat      : array(float) | this.getAsArray();
      isPersp  : int          | this.isPersp;
    }
  \`)
  static setUniformArray?: number[];
  static setUniformWebGLArray?: Float32Array;

  $matrix: internal_matrix;
  isPersp: boolean;

  constructor(m?: Matrix4 | number[] | Float32Array | Float64Array) {
    this.$matrix = new internal_matrix();
    this.isPersp = false;

    if (typeof m === "object") {
      if ("length" in m && m.length >= 16) {
        this.load(m as number[]);
      } else if (m instanceof Matrix4) {
        this.load(m);
      }
    }
  }

  static fromJSON(json: any) {
    let mat = new Matrix4();
    mat.load(json.items);
    mat.isPersp = json.isPersp;
    return mat;
  }

  copy() {
    return this.clone();
  }

  clone() {
    return new Matrix4(this);
  }

  addToHashDigest(hash: util.HashDigest) {
    let m = this.$matrix;

    hash.add(m.m11);
    hash.add(m.m12);
    hash.add(m.m13);
    hash.add(m.m14);

    hash.add(m.m21);
    hash.add(m.m22);
    hash.add(m.m23);
    hash.add(m.m24);

    hash.add(m.m31);
    hash.add(m.m32);
    hash.add(m.m33);
    hash.add(m.m34);

    hash.add(m.m41);
    hash.add(m.m42);
    hash.add(m.m43);
    hash.add(m.m44);

    return this;
  }

  equals(m: this) {
    let m1 = this.$matrix;
    let m2 = m.$matrix;

    let ok = true;

    ok = ok && m1.m11 === m2.m11;
    ok = ok && m1.m12 === m2.m12;
    ok = ok && m1.m13 === m2.m13;
    ok = ok && m1.m14 === m2.m14;

    ok = ok && m1.m21 === m2.m21;
    ok = ok && m1.m22 === m2.m22;
    ok = ok && m1.m23 === m2.m23;
    ok = ok && m1.m24 === m2.m24;

    ok = ok && m1.m31 === m2.m31;
    ok = ok && m1.m32 === m2.m32;
    ok = ok && m1.m33 === m2.m33;
    ok = ok && m1.m34 === m2.m34;

    ok = ok && m1.m41 === m2.m41;
    ok = ok && m1.m42 === m2.m42;
    ok = ok && m1.m43 === m2.m43;
    ok = ok && m1.m44 === m2.m44;

    return ok;
  }

  loadColumn(i: number, vec: IVector4 | number[]) {
    let m = this.$matrix;
    let have4 = vec.length > 3;

    switch (i) {
      case 0:
        m.m11 = vec[0];
        m.m21 = vec[1];
        m.m31 = vec[2];
        if (have4) {
          m.m41 = vec[3];
        }
        break;
      case 1:
        m.m12 = vec[0];
        m.m22 = vec[1];
        m.m32 = vec[2];
        if (have4) {
          m.m42 = vec[3];
        }
        break;
      case 2:
        m.m13 = vec[0];
        m.m23 = vec[1];
        m.m33 = vec[2];
        if (have4) {
          m.m43 = vec[3];
        }
        break;
      case 3:
        m.m14 = vec[0];
        m.m24 = vec[1];
        m.m34 = vec[2];
        if (have4) {
          m.m44 = vec[3];
        }
        break;
    }

    return this;
  }

  copyColumnTo(i: number, vec: IVector4 | number[]) {
    let m = this.$matrix;
    let have4 = vec.length > 3;

    switch (i) {
      case 0:
        vec[0] = m.m11;
        vec[1] = m.m21;
        vec[2] = m.m31;
        if (have4) {
          vec[3] = m.m41;
        }
        break;
      case 1:
        vec[0] = m.m12;
        vec[1] = m.m22;
        vec[2] = m.m32;
        if (have4) {
          vec[3] = m.m42;
        }
        break;
      case 2:
        vec[0] = m.m13;
        vec[1] = m.m23;
        vec[2] = m.m33;
        if (have4) {
          vec[3] = m.m43;
        }
        break;
      case 3:
        vec[0] = m.m14;
        vec[1] = m.m24;
        vec[2] = m.m34;
        if (have4) {
          vec[3] = m.m44;
        }
        break;
    }

    return vec;
  }

  copyColumn(i: number) {
    return this.copyColumnTo(i, new Array<number>(4));
  }

  load(b: Matrix4 | number[] | Float32Array | Float64Array) {
    if (arguments.length === 1 && typeof arguments[0] === "object") {
      let matrix;
      if (arguments[0] instanceof Matrix4) {
        matrix = arguments[0].$matrix;
        this.isPersp = arguments[0].isPersp;
        this.$matrix.m11 = matrix.m11;
        this.$matrix.m12 = matrix.m12;
        this.$matrix.m13 = matrix.m13;
        this.$matrix.m14 = matrix.m14;
        this.$matrix.m21 = matrix.m21;
        this.$matrix.m22 = matrix.m22;
        this.$matrix.m23 = matrix.m23;
        this.$matrix.m24 = matrix.m24;
        this.$matrix.m31 = matrix.m31;
        this.$matrix.m32 = matrix.m32;
        this.$matrix.m33 = matrix.m33;
        this.$matrix.m34 = matrix.m34;
        this.$matrix.m41 = matrix.m41;
        this.$matrix.m42 = matrix.m42;
        this.$matrix.m43 = matrix.m43;
        this.$matrix.m44 = matrix.m44;
        return this;
      } else matrix = arguments[0];
      if ("length" in matrix && matrix.length >= 16) {
        this.$matrix.m11 = matrix[0];
        this.$matrix.m12 = matrix[1];
        this.$matrix.m13 = matrix[2];
        this.$matrix.m14 = matrix[3];
        this.$matrix.m21 = matrix[4];
        this.$matrix.m22 = matrix[5];
        this.$matrix.m23 = matrix[6];
        this.$matrix.m24 = matrix[7];
        this.$matrix.m31 = matrix[8];
        this.$matrix.m32 = matrix[9];
        this.$matrix.m33 = matrix[10];
        this.$matrix.m34 = matrix[11];
        this.$matrix.m41 = matrix[12];
        this.$matrix.m42 = matrix[13];
        this.$matrix.m43 = matrix[14];
        this.$matrix.m44 = matrix[15];
        return this;
      }
    }

    this.makeIdentity();
    return this;
  }

  toJSON() {
    return { isPersp: this.isPersp, items: this.getAsArray() };
  }

  getAsArray() {
    return [
      this.$matrix.m11,
      this.$matrix.m12,
      this.$matrix.m13,
      this.$matrix.m14,
      this.$matrix.m21,
      this.$matrix.m22,
      this.$matrix.m23,
      this.$matrix.m24,
      this.$matrix.m31,
      this.$matrix.m32,
      this.$matrix.m33,
      this.$matrix.m34,
      this.$matrix.m41,
      this.$matrix.m42,
      this.$matrix.m43,
      this.$matrix.m44,
    ];
  }

  getAsFloat32Array() {
    return new Float32Array(this.getAsArray());
  }

  setUniform(ctx: WebGL2RenderingContext | WebGLRenderingContext, loc: WebGLUniformLocation, transpose = false) {
    if (Matrix4.setUniformArray === undefined) {
      Matrix4.setUniformWebGLArray = new Float32Array(16);
      Matrix4.setUniformArray = new Array(16);
    }

    Matrix4.setUniformArray[0] = this.$matrix.m11;
    Matrix4.setUniformArray[1] = this.$matrix.m12;
    Matrix4.setUniformArray[2] = this.$matrix.m13;
    Matrix4.setUniformArray[3] = this.$matrix.m14;
    Matrix4.setUniformArray[4] = this.$matrix.m21;
    Matrix4.setUniformArray[5] = this.$matrix.m22;
    Matrix4.setUniformArray[6] = this.$matrix.m23;
    Matrix4.setUniformArray[7] = this.$matrix.m24;
    Matrix4.setUniformArray[8] = this.$matrix.m31;
    Matrix4.setUniformArray[9] = this.$matrix.m32;
    Matrix4.setUniformArray[10] = this.$matrix.m33;
    Matrix4.setUniformArray[11] = this.$matrix.m34;
    Matrix4.setUniformArray[12] = this.$matrix.m41;
    Matrix4.setUniformArray[13] = this.$matrix.m42;
    Matrix4.setUniformArray[14] = this.$matrix.m43;
    Matrix4.setUniformArray[15] = this.$matrix.m44;

    Matrix4.setUniformWebGLArray!.set(Matrix4.setUniformArray);

    ctx.uniformMatrix4fv(loc, transpose, Matrix4.setUniformWebGLArray!);
    return this;
  }

  makeIdentity() {
    this.$matrix.m11 = 1;
    this.$matrix.m12 = 0;
    this.$matrix.m13 = 0;
    this.$matrix.m14 = 0;
    this.$matrix.m21 = 0;
    this.$matrix.m22 = 1;
    this.$matrix.m23 = 0;
    this.$matrix.m24 = 0;
    this.$matrix.m31 = 0;
    this.$matrix.m32 = 0;
    this.$matrix.m33 = 1;
    this.$matrix.m34 = 0;
    this.$matrix.m41 = 0;
    this.$matrix.m42 = 0;
    this.$matrix.m43 = 0;
    this.$matrix.m44 = 1;

    //drop isPersp
    this.isPersp = false;

    return this;
  }

  transpose() {
    let tmp = this.$matrix.m12;
    this.$matrix.m12 = this.$matrix.m21;
    this.$matrix.m21 = tmp;
    tmp = this.$matrix.m13;
    this.$matrix.m13 = this.$matrix.m31;
    this.$matrix.m31 = tmp;
    tmp = this.$matrix.m14;
    this.$matrix.m14 = this.$matrix.m41;
    this.$matrix.m41 = tmp;
    tmp = this.$matrix.m23;
    this.$matrix.m23 = this.$matrix.m32;
    this.$matrix.m32 = tmp;
    tmp = this.$matrix.m24;
    this.$matrix.m24 = this.$matrix.m42;
    this.$matrix.m42 = tmp;
    tmp = this.$matrix.m34;
    this.$matrix.m34 = this.$matrix.m43;
    this.$matrix.m43 = tmp;

    return this;
  }

  determinant() {
    return this._determinant4x4();
  }

  invert() {
    let det = this._determinant4x4();

    if (Math.abs(det) < 1e-8) return null;

    this._makeAdjoint();

    this.$matrix.m11 /= det;
    this.$matrix.m12 /= det;
    this.$matrix.m13 /= det;
    this.$matrix.m14 /= det;
    this.$matrix.m21 /= det;
    this.$matrix.m22 /= det;
    this.$matrix.m23 /= det;
    this.$matrix.m24 /= det;
    this.$matrix.m31 /= det;
    this.$matrix.m32 /= det;
    this.$matrix.m33 /= det;
    this.$matrix.m34 /= det;
    this.$matrix.m41 /= det;
    this.$matrix.m42 /= det;
    this.$matrix.m43 /= det;
    this.$matrix.m44 /= det;

    return this;
  }

  translate(x: number, y: number, z: number) {
    if (typeof x === "object" && "length" in x) {
      let t = x;

      x = t[0];
      y = t[1];
      z = t[2];
    }

    x = x === undefined ? 0 : x;
    y = y === undefined ? 0 : y;
    z = z === undefined ? 0 : z;

    let matrix = temp_mats.next().makeIdentity();

    matrix.$matrix.m41 = x;
    matrix.$matrix.m42 = y;
    matrix.$matrix.m43 = z;

    this.multiply(matrix);
    return this;
  }

  preTranslate(x: number, y: number, z: number) {
    if (typeof x === "object" && "length" in x) {
      let t = x;

      x = t[0];
      y = t[1];
      z = t[2];
    }

    x = x === undefined ? 0 : x;
    y = y === undefined ? 0 : y;
    z = z === undefined ? 0 : z;

    let matrix = temp_mats.next().makeIdentity();

    matrix.$matrix.m41 = x;
    matrix.$matrix.m42 = y;
    matrix.$matrix.m43 = z;

    this.preMultiply(matrix);
    return this;
  }

  scale(x: number | any, y: number, z: number, w = 1.0) {
    if (typeof x === "object" && "length" in x) {
      let t = x;
      x = t[0];
      y = t[1];
      z = t[2];
    } else {
      if (x === undefined) x = 1;

      if (z === undefined) {
        if (y === undefined) {
          y = x;
          z = x;
        } else {
          z = x;
        }
      } else if (y === undefined) {
        y = x;
      }
    }

    let matrix = temp_mats.next().makeIdentity();
    matrix.$matrix.m11 = x;
    matrix.$matrix.m22 = y;
    matrix.$matrix.m33 = z;
    matrix.$matrix.m44 = w;
    this.multiply(matrix);
    return this;
  }

  preScale(x: number, y: number, z: number, w = 1.0) {
    let mat = temp_mats.next().makeIdentity();
    mat.scale(x, y, z, w);

    this.preMultiply(mat);
    return this;
  }

  /*
  on factor;
  off period;

  c1 := cx; comment: cos(thx);
  s1 := sx; comment: sin(thx);

  c2 := cy; comment: cos(thy);
  s2 := sy; comment: sin(thy);

  c3 := cz; comment: cos(thz);
  s3 := sz; comment: sin(thz);

  cx := cos(thx);
  sx := sin(thx);
  cy := cos(thy);
  sy := sin(thy);
  cz := cos(thz);
  sz := sin(thz);

  imat := mat((1, 0, 0, 0),
              (0, 1, 0, 0),
              (0, 0, 1, 0),
              (0, 0, 0, 1));

  xmat :=mat((1,  0,  0,  0),
             (0, c1, -s1, 0),
             (0, s1,  c1, 0),
             (0,  0,  0,  0));

  ymat :=mat((c2, 0, s2, 0),
             (0,  1,  0,  0),
             (-s2, 0,  c2, 0),
             (0,  0,  0,  0));

  zmat :=mat(( c3, -s3, 0, 0),
             (s3, c3, 0, 0),
             ( 0,  0,  1, 0),
             ( 0,  0,  0, 0));

  mmat := mat((m11, m21, m31, 0),
              (m12, m22, m32, 0),
              (m13, m23, m33, 0),
              (0,   0,   0,   0));

  fmat := zmat * ymat * xmat;

  f1 := m11**2 + m12**2 + m13**2 - 1.0;
  f2 := m21**2 + m22**2 + m23**2 - 1.0;
  f3 := m31**2 + m32**2 + m33**2 - 1.0;

  tmat := fmat * mmat;
  f1 := tmat(1, 1) - 1.0;
  f2 := tmat(2, 2) - 1.0;
  f3 := tmat(3, 3) - 1.0;

  operator myasin;

  fthy := asin(mmat(3, 1));
  f1 := mmat(3,1)**2 + mmat(2,1)**2 + mmat(1,1)**2 = 1.0;

  fmat2 := sub(thy=fthy, fmat);

  fmat3 := fmat2 * (tp mmat);
  ffz := solve(fmat2(1, 1) - m11, thz);
  ffx := solve(fmat2(3, 3) - m33, thx);

  fthz := part(ffz, 1, 2);
  fthx := part(ffx, 1, 2);

  sub(thx=fthx, thy=fthy, thz=fthz, fmat);

(cos(thy)*cos(thz),         cos(thx)*sin(thz)-cos(thz)*sin(thx)*sin(thy),  -(cos(thx)*cos(thz)*sin(thy)+sin(thx)*sin(thz)), 0),

(-cos(thy)*sin(thz),        cos(thx)*cos(thz) + sin(thx)*sin(thy)*sin(thz),  cos(thx)*sin(thy)*sin(thz)-cos(thz)*sin(thx), 0),

(sin(thy),                  cos(thy)*sin(thx),                               cos(thx)*cos(thy),  0),

    (0,0,0,1))

  */

  euler_rotate_order(x: number, y: number, z: number, order = EulerOrders.XYZ) {
    if (y === undefined) {
      y = 0.0;
    }
    if (z === undefined) {
      z = 0.0;
    }

    x = -x;
    y = -y;
    z = -z;

    let xmat = euler_rotate_mats.next().makeIdentity();

    let m = xmat.$matrix;

    let c = Math.cos(x),
      s = Math.sin(x);

    m.m22 = c;
    m.m23 = s;
    m.m32 = -s;
    m.m33 = c;

    let ymat = euler_rotate_mats.next().makeIdentity();
    c = Math.cos(y);
    s = Math.sin(y);
    m = ymat.$matrix;

    m.m11 = c;
    m.m13 = -s;
    m.m31 = s;
    m.m33 = c;

    let zmat = euler_rotate_mats.next().makeIdentity();
    c = Math.cos(z);
    s = Math.sin(z);
    m = zmat.$matrix;

    m.m11 = c;
    m.m12 = s;
    m.m21 = -s;
    m.m22 = c;

    let a: Matrix4 | undefined, b: Matrix4 | undefined, cmat: Matrix4 | undefined;

    switch (order) {
      case EulerOrders.XYZ:
        a = xmat;
        b = ymat;
        cmat = zmat;
        break;
      case EulerOrders.XZY:
        a = xmat;
        b = zmat;
        cmat = ymat;
        break;
      case EulerOrders.YXZ:
        a = ymat;
        b = xmat;
        cmat = zmat;
        break;
      case EulerOrders.YZX:
        a = ymat;
        b = zmat;
        cmat = xmat;
        break;
      case EulerOrders.ZXY:
        a = zmat;
        b = xmat;
        cmat = ymat;
        break;
      case EulerOrders.ZYX:
        a = zmat;
        b = ymat;
        cmat = xmat;
        break;
    }

    b!.preMultiply(cmat!);
    b!.multiply(a!);
    this.preMultiply(b!);

    return this;
  }

  euler_rotate(x: number, y: number, z: number) {
    if (y === undefined) {
      y = 0.0;
    }
    if (z === undefined) {
      z = 0.0;
    }

    let xmat = euler_rotate_mats.next().makeIdentity();
    let m = xmat.$matrix;

    let c = Math.cos(x),
      s = Math.sin(x);

    m.m22 = c;
    m.m23 = s;
    m.m32 = -s;
    m.m33 = c;

    let ymat = euler_rotate_mats.next().makeIdentity();
    c = Math.cos(y);
    s = Math.sin(y);
    m = ymat.$matrix;

    m.m11 = c;
    m.m13 = -s;
    m.m31 = s;
    m.m33 = c;

    ymat.multiply(xmat);

    let zmat = euler_rotate_mats.next().makeIdentity();
    c = Math.cos(z);
    s = Math.sin(z);
    m = zmat.$matrix;

    m.m11 = c;
    m.m12 = s;
    m.m21 = -s;
    m.m22 = c;

    zmat.multiply(ymat);

    //console.log(""+ymat);
    //this.multiply(zmat);
    this.preMultiply(zmat);

    return this;
  }

  toString() {
    let s = "";
    let m = this.$matrix;

    function dec(d: number) {
      let ret = d.toFixed(3);

      if (ret[0] !== "-")
        //make room for negative signs
        ret = " " + ret;
      return ret;
    }

    s = dec(m.m11) + ", " + dec(m.m12) + ", " + dec(m.m13) + ", " + dec(m.m14) + "\\n";
    s += dec(m.m21) + ", " + dec(m.m22) + ", " + dec(m.m23) + ", " + dec(m.m24) + "\\n";
    s += dec(m.m31) + ", " + dec(m.m32) + ", " + dec(m.m33) + ", " + dec(m.m34) + "\\n";
    s += dec(m.m41) + ", " + dec(m.m42) + ", " + dec(m.m43) + ", " + dec(m.m44) + "\\n";

    return s;
  }

  rotate(angle: number, x: number | any, y: number, z: number) {
    if (typeof x === "object" && "length" in x) {
      let t = x;
      x = t[0];
      y = t[1];
      z = t[2];
    } else {
      if (arguments.length === 1) {
        x = y = 0;
        z = 1;
      } else if (arguments.length === 3) {
        this.rotate(angle, 1, 0, 0);
        this.rotate(x, 0, 1, 0);
        this.rotate(y, 0, 0, 1);
        return;
      }
    }

    angle /= 2;
    let sinA = Math.sin(angle);
    let cosA = Math.cos(angle);
    let sinA2 = sinA * sinA;
    let len = Math.sqrt(x * x + y * y + z * z);

    if (len === 0) {
      x = 0;
      y = 0;
      z = 1;
    } else if (len !== 1) {
      x /= len;
      y /= len;
      z /= len;
    }

    let mat = temp_mats.next().makeIdentity();

    if (x === 1 && y === 0 && z === 0) {
      mat.$matrix.m11 = 1;
      mat.$matrix.m12 = 0;
      mat.$matrix.m13 = 0;
      mat.$matrix.m21 = 0;
      mat.$matrix.m22 = 1 - 2 * sinA2;
      mat.$matrix.m23 = 2 * sinA * cosA;
      mat.$matrix.m31 = 0;
      mat.$matrix.m32 = -2 * sinA * cosA;
      mat.$matrix.m33 = 1 - 2 * sinA2;
      mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
      mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
      mat.$matrix.m44 = 1;
    } else if (x === 0 && y === 1 && z === 0) {
      mat.$matrix.m11 = 1 - 2 * sinA2;
      mat.$matrix.m12 = 0;
      mat.$matrix.m13 = -2 * sinA * cosA;
      mat.$matrix.m21 = 0;
      mat.$matrix.m22 = 1;
      mat.$matrix.m23 = 0;
      mat.$matrix.m31 = 2 * sinA * cosA;
      mat.$matrix.m32 = 0;
      mat.$matrix.m33 = 1 - 2 * sinA2;
      mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
      mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
      mat.$matrix.m44 = 1;
    } else if (x === 0 && y === 0 && z === 1) {
      mat.$matrix.m11 = 1 - 2 * sinA2;
      mat.$matrix.m12 = 2 * sinA * cosA;
      mat.$matrix.m13 = 0;
      mat.$matrix.m21 = -2 * sinA * cosA;
      mat.$matrix.m22 = 1 - 2 * sinA2;
      mat.$matrix.m23 = 0;
      mat.$matrix.m31 = 0;
      mat.$matrix.m32 = 0;
      mat.$matrix.m33 = 1;
      mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
      mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
      mat.$matrix.m44 = 1;
    } else {
      let x2 = x * x;
      let y2 = y * y;
      let z2 = z * z;
      mat.$matrix.m11 = 1 - 2 * (y2 + z2) * sinA2;
      mat.$matrix.m12 = 2 * (x * y * sinA2 + z * sinA * cosA);
      mat.$matrix.m13 = 2 * (x * z * sinA2 - y * sinA * cosA);
      mat.$matrix.m21 = 2 * (y * x * sinA2 - z * sinA * cosA);
      mat.$matrix.m22 = 1 - 2 * (z2 + x2) * sinA2;
      mat.$matrix.m23 = 2 * (y * z * sinA2 + x * sinA * cosA);
      mat.$matrix.m31 = 2 * (z * x * sinA2 + y * sinA * cosA);
      mat.$matrix.m32 = 2 * (z * y * sinA2 - x * sinA * cosA);
      mat.$matrix.m33 = 1 - 2 * (x2 + y2) * sinA2;
      mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
      mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
      mat.$matrix.m44 = 1;
    }
    this.multiply(mat);

    return this;
  }

  normalize() {
    let m = this.$matrix;

    let v1 = new Vector4([m.m11, m.m12, m.m13, m.m14]);
    let v2 = new Vector4([m.m21, m.m22, m.m23, m.m24]);
    let v3 = new Vector4([m.m31, m.m32, m.m33, m.m34]);
    let v4 = new Vector4([m.m41, m.m42, m.m43, m.m44]);

    v1.normalize();
    v2.normalize();
    v3.normalize();

    let flat = new Array().concat(v1).concat(v2).concat(v3).concat(v4);
    this.load(flat);

    return this;
  }

  clearTranslation(set_w_to_one = false) {
    let m = this.$matrix;

    m.m41 = m.m42 = m.m43 = 0.0;

    if (set_w_to_one) {
      m.m44 = 1.0;
    }

    return this;
  }

  setTranslation(x: number | any, y: number, z: number, resetW = true) {
    if (typeof x === "object") {
      y = x[1];
      z = x[2];
      x = x[0];
    }

    let m = this.$matrix;

    m.m41 = x;
    m.m42 = y;
    m.m43 = z;

    if (resetW) {
      m.m44 = 1.0;
    }

    return this;
  }

  //this is really like the lookAt method, isn't it.
  makeNormalMatrix(normal: Vector3, up?: Vector3) {
    if (normal === undefined) {
      throw new Error("normal cannot be undefined");
    }

    let n = makenormalcache.next().load(normal).normalize();

    if (up === undefined) {
      up = makenormalcache.next().zero();

      if (Math.abs(n[2]) > 0.95) {
        up[1] = 1.0;
      } else {
        up[2] = 1.0;
      }
    }

    up = makenormalcache.next().load(up);

    up.normalize();

    if (up.dot(normal) > 0.99) {
      this.makeIdentity();
      return this;
    } else if (up.dot(normal) < -0.99) {
      this.makeIdentity();
      this.scale(1.0, 1.0, -1.0);
      return this;
    }

    let x = makenormalcache.next();
    let y = makenormalcache.next();

    x.load(n).cross(up).normalize();
    y.load(x).cross(n).normalize();
    //y.negate();

    this.makeIdentity();
    let m = this.$matrix;

    m.m11 = x[0];
    m.m12 = x[1];
    m.m13 = x[2];

    m.m21 = y[0];
    m.m22 = y[1];
    m.m23 = y[2];

    m.m31 = n[0];
    m.m32 = n[1];
    m.m33 = n[2];
    m.m44 = 1.0;

    return this;
  }

  preMultiply(mat: this | Matrix4) {
    preMultTemp.load(mat);
    preMultTemp.multiply(this);

    this.load(preMultTemp);

    return this;
  }

  multiply(mat: this | Matrix4) {
    let mm = this.$matrix;
    let mm2 = mat.$matrix;

    let m11 = mm2.m11 * mm.m11 + mm2.m12 * mm.m21 + mm2.m13 * mm.m31 + mm2.m14 * mm.m41;
    let m12 = mm2.m11 * mm.m12 + mm2.m12 * mm.m22 + mm2.m13 * mm.m32 + mm2.m14 * mm.m42;
    let m13 = mm2.m11 * mm.m13 + mm2.m12 * mm.m23 + mm2.m13 * mm.m33 + mm2.m14 * mm.m43;
    let m14 = mm2.m11 * mm.m14 + mm2.m12 * mm.m24 + mm2.m13 * mm.m34 + mm2.m14 * mm.m44;
    let m21 = mm2.m21 * mm.m11 + mm2.m22 * mm.m21 + mm2.m23 * mm.m31 + mm2.m24 * mm.m41;
    let m22 = mm2.m21 * mm.m12 + mm2.m22 * mm.m22 + mm2.m23 * mm.m32 + mm2.m24 * mm.m42;
    let m23 = mm2.m21 * mm.m13 + mm2.m22 * mm.m23 + mm2.m23 * mm.m33 + mm2.m24 * mm.m43;
    let m24 = mm2.m21 * mm.m14 + mm2.m22 * mm.m24 + mm2.m23 * mm.m34 + mm2.m24 * mm.m44;
    let m31 = mm2.m31 * mm.m11 + mm2.m32 * mm.m21 + mm2.m33 * mm.m31 + mm2.m34 * mm.m41;
    let m32 = mm2.m31 * mm.m12 + mm2.m32 * mm.m22 + mm2.m33 * mm.m32 + mm2.m34 * mm.m42;
    let m33 = mm2.m31 * mm.m13 + mm2.m32 * mm.m23 + mm2.m33 * mm.m33 + mm2.m34 * mm.m43;
    let m34 = mm2.m31 * mm.m14 + mm2.m32 * mm.m24 + mm2.m33 * mm.m34 + mm2.m34 * mm.m44;
    let m41 = mm2.m41 * mm.m11 + mm2.m42 * mm.m21 + mm2.m43 * mm.m31 + mm2.m44 * mm.m41;
    let m42 = mm2.m41 * mm.m12 + mm2.m42 * mm.m22 + mm2.m43 * mm.m32 + mm2.m44 * mm.m42;
    let m43 = mm2.m41 * mm.m13 + mm2.m42 * mm.m23 + mm2.m43 * mm.m33 + mm2.m44 * mm.m43;
    let m44 = mm2.m41 * mm.m14 + mm2.m42 * mm.m24 + mm2.m43 * mm.m34 + mm2.m44 * mm.m44;

    mm.m11 = m11;
    mm.m12 = m12;
    mm.m13 = m13;
    mm.m14 = m14;
    mm.m21 = m21;
    mm.m22 = m22;
    mm.m23 = m23;
    mm.m24 = m24;
    mm.m31 = m31;
    mm.m32 = m32;
    mm.m33 = m33;
    mm.m34 = m34;
    mm.m41 = m41;
    mm.m42 = m42;
    mm.m43 = m43;
    mm.m44 = m44;

    return this;
  }

  divide(divisor: number) {
    this.$matrix.m11 /= divisor;
    this.$matrix.m12 /= divisor;
    this.$matrix.m13 /= divisor;
    this.$matrix.m14 /= divisor;
    this.$matrix.m21 /= divisor;
    this.$matrix.m22 /= divisor;
    this.$matrix.m23 /= divisor;
    this.$matrix.m24 /= divisor;
    this.$matrix.m31 /= divisor;
    this.$matrix.m32 /= divisor;
    this.$matrix.m33 /= divisor;
    this.$matrix.m34 /= divisor;
    this.$matrix.m41 /= divisor;
    this.$matrix.m42 /= divisor;
    this.$matrix.m43 /= divisor;
    this.$matrix.m44 /= divisor;

    return this;
  }

  ortho(left: number, right: number, bottom: number, top: number, near: number, far: number) {
    console.warn("Matrix4.ortho() is deprecated, use .orthographic() instead");

    let tx = (left + right) / (left - right);
    let ty = (top + bottom) / (top - bottom);
    let tz = (far + near) / (far - near);
    let matrix = temp_mats.next().makeIdentity();

    matrix.$matrix.m11 = 2 / (left - right);
    matrix.$matrix.m12 = 0;
    matrix.$matrix.m13 = 0;
    matrix.$matrix.m14 = 0;
    matrix.$matrix.m21 = 0;
    matrix.$matrix.m22 = 2 / (top - bottom);
    matrix.$matrix.m23 = 0;
    matrix.$matrix.m24 = 0;
    matrix.$matrix.m31 = 0;
    matrix.$matrix.m32 = 0;
    matrix.$matrix.m33 = -2 / (far - near);
    matrix.$matrix.m34 = 0;
    matrix.$matrix.m41 = tx;
    matrix.$matrix.m42 = ty;
    matrix.$matrix.m43 = tz;
    matrix.$matrix.m44 = 1;

    this.multiply(matrix as this);

    return this;
  }

  frustum(left: number, right: number, bottom: number, top: number, near: number, far: number) {
    let matrix = temp_mats.next().makeIdentity();

    let A = (right + left) / (right - left);
    let B = (top + bottom) / (top - bottom);
    let C = -(far + near) / (far - near);
    let D = -(2 * far * near) / (far - near);

    matrix.$matrix.m11 = (2 * near) / (right - left);
    matrix.$matrix.m12 = 0;
    matrix.$matrix.m13 = 0;
    matrix.$matrix.m14 = 0;
    matrix.$matrix.m21 = 0;
    matrix.$matrix.m22 = (2 * near) / (top - bottom);
    matrix.$matrix.m23 = 0;
    matrix.$matrix.m24 = 0;
    matrix.$matrix.m31 = A;
    matrix.$matrix.m32 = B;
    matrix.$matrix.m33 = C;
    matrix.$matrix.m34 = -1;
    matrix.$matrix.m41 = 0;
    matrix.$matrix.m42 = 0;
    matrix.$matrix.m43 = D;
    matrix.$matrix.m44 = 0;

    this.isPersp = true;
    this.multiply(matrix as this);

    return this;
  }

  orthographic(scale: number, aspect: number, near: number, far: number) {
    let mat = temp_mats.next().makeIdentity();

    let zscale = far - near;

    mat.scale(2.0 / aspect, 2.0, -1.0 / scale / zscale, 1.0 / scale);
    mat.translate(0.0, 0.0, 0.5 * zscale - near);

    this.isPersp = true; //we still make use of auto homogenous divide in BaseVector.multVecMatrix
    this.multiply(mat as this);

    return mat;
  }

  perspective(fovy: number, aspect: number, zNear: number, zFar: number) {
    let top = Math.tan((fovy * Math.PI) / 360) * zNear;
    let bottom = -top;
    let left = aspect * bottom;
    let right = aspect * top;

    this.frustum(left, right, bottom, top, zNear, zFar);

    return this;
  }

  lookat(pos: Vector3, target: Vector3, up: Vector3) {
    let matrix = lookat_cache_ms.next();
    matrix.makeIdentity();

    let vec = lookat_cache_vs3.next().load(pos).sub(target);
    let len = vec.vectorLength();
    vec.normalize();

    let zvec = vec;
    let yvec = lookat_cache_vs3.next().load(up).normalize();
    let xvec = lookat_cache_vs3.next().load(yvec).cross(zvec).normalize();

    let mm = matrix.$matrix;

    mm.m11 = xvec[0];
    mm.m12 = yvec[0];
    mm.m13 = zvec[0];
    mm.m14 = 0;
    mm.m21 = xvec[1];
    mm.m22 = yvec[1];
    mm.m23 = zvec[1];
    mm.m24 = 0;
    mm.m31 = xvec[2];
    mm.m32 = yvec[2];
    mm.m33 = zvec[2];

    //*
    mm.m11 = xvec[0];
    mm.m12 = xvec[1];
    mm.m13 = xvec[2];
    mm.m14 = 0;
    mm.m21 = yvec[0];
    mm.m22 = yvec[1];
    mm.m23 = yvec[2];
    mm.m24 = 0;
    mm.m31 = zvec[0];
    mm.m32 = zvec[1];
    mm.m33 = zvec[2];
    mm.m34 = 0;
    mm.m41 = pos[0];
    mm.m42 = pos[1];
    mm.m43 = pos[2];
    mm.m44 = 1;
    //*/

    this.multiply(matrix as this);

    return this;
  }

  makeRotationOnly() {
    let m = this.$matrix;

    m.m41 = m.m42 = m.m43 = 0.0;
    m.m44 = 1.0;

    let l1 = Math.sqrt(m.m11 * m.m11 + m.m12 * m.m12 + m.m13 * m.m13);
    let l2 = Math.sqrt(m.m21 * m.m21 + m.m22 * m.m22 + m.m23 * m.m23);
    let l3 = Math.sqrt(m.m31 * m.m31 + m.m32 * m.m32 + m.m33 * m.m33);

    if (l1) {
      m.m11 /= l1;
      m.m12 /= l1;
      m.m13 /= l1;
    }

    if (l2) {
      m.m21 /= l2;
      m.m22 /= l2;
      m.m23 /= l2;
    }

    if (l3) {
      m.m31 /= l3;
      m.m32 /= l3;
      m.m33 /= l3;
    }

    return this;
  }

  getAsVecs(): Vector4[] {
    return [
      new Vector4().loadXYZW(this.$matrix.m11, this.$matrix.m12, this.$matrix.m13, this.$matrix.m14),
      new Vector4().loadXYZW(this.$matrix.m21, this.$matrix.m22, this.$matrix.m23, this.$matrix.m24),
      new Vector4().loadXYZW(this.$matrix.m31, this.$matrix.m32, this.$matrix.m33, this.$matrix.m34),
      new Vector4().loadXYZW(this.$matrix.m41, this.$matrix.m42, this.$matrix.m43, this.$matrix.m44),
    ];
  }

  loadFromVecs(vecs: Vector4[]) {
    let m = this.$matrix;
    m.m11 = vecs[0][0];
    m.m12 = vecs[0][1];
    m.m13 = vecs[0][2];
    m.m14 = vecs[0][3];

    m.m21 = vecs[1][0];
    m.m22 = vecs[1][1];
    m.m23 = vecs[1][2];
    m.m24 = vecs[1][3];

    m.m31 = vecs[2][0];
    m.m32 = vecs[2][1];
    m.m33 = vecs[2][2];
    m.m34 = vecs[2][3];

    m.m41 = vecs[3][0];
    m.m42 = vecs[3][1];
    m.m43 = vecs[3][2];
    m.m44 = vecs[3][3];
    return this
  }

  alignAxis(axis: number, vec_: number[] | IVector3) {
    const vec = new Vector4().load3(vec_);
    vec.normalize();

    let mat = this;
    let m = mat.$matrix;

    let mat2 = new Matrix4(mat);
    let loc = new Vector3(),
      scale = new Vector3(),
      rot = new Vector3();

    //we don't use rot
    mat2.decompose(loc, rot, scale);
    mat2.makeRotationOnly();

    let axes = mat2.getAsVecs();

    let axis2 = (axis + 1) % 3;
    let axis3 = (axis + 2) % 3;

    axes[axis].load(vec);
    axes[axis2].cross(axes[axis]).cross(axes[axis]);
    axes[axis3].load(axes[axis]).cross(axes[axis2]);

    axes[0][3] = 1.0;
    axes[1][3] = 1.0;
    axes[2][3] = 1.0;

    axes[0].normalize();
    axes[1].normalize();
    axes[2].normalize();

    this.loadFromVecs(axes);
    this.scale(scale[0], scale[1], scale[2]);

    m.m41 = loc[0];
    m.m42 = loc[1];
    m.m43 = loc[2];

    return this;
  }

  decompose(_translate: any, _rotate?: any, _scale?: any, _skew?: any, _perspective?: any, order = EulerOrders.XYZ) {
    if (this.$matrix.m44 === 0) return false;

    let mat = temp_mats.next().load(this);
    let m = mat.$matrix;

    let t = _translate,
      r = _rotate,
      s = _scale;
    if (t) {
      t[0] = m.m41;
      t[1] = m.m42;
      t[2] = m.m43;
    }

    let l1 = Math.sqrt(m.m11 * m.m11 + m.m12 * m.m12 + m.m13 * m.m13);
    let l2 = Math.sqrt(m.m21 * m.m21 + m.m22 * m.m22 + m.m23 * m.m23);
    let l3 = Math.sqrt(m.m31 * m.m31 + m.m32 * m.m32 + m.m33 * m.m33);

    if (l1) {
      m.m11 /= l1;
      m.m12 /= l1;
      m.m13 /= l1;
    }
    if (l2) {
      m.m21 /= l2;
      m.m22 /= l2;
      m.m23 /= l2;
    }
    if (l3) {
      m.m31 /= l3;
      m.m32 /= l3;
      m.m33 /= l3;
    }

    if (s) {
      s[0] = l1;
      s[1] = l2;
      s[2] = l3;
    }

    if (r) {
      //THREE.js code
      let clamp = myclamp;

      let rmat = temp_mats.next().load(this);
      rmat.normalize();

      m = rmat.$matrix;

      // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

      let m11 = m.m11,
        m12 = m.m12,
        m13 = m.m13,
        m14 = m.m14;
      let m21 = m.m21,
        m22 = m.m22,
        m23 = m.m23,
        m24 = m.m24;
      let m31 = m.m31,
        m32 = m.m32,
        m33 = m.m33,
        m34 = m.m34;
      //let m41 = m.m41, m42 = m.m42, m43 = m.m43, m44 = m.m44;

      if (order === EulerOrders.XYZ) {
        r[1] = Math.asin(clamp(m13, -1, 1));

        if (Math.abs(m13) < 0.9999999) {
          r[0] = Math.atan2(-m23, m33);
          r[2] = Math.atan2(-m12, m11);
        } else {
          r[0] = Math.atan2(m32, m22);
          r[2] = 0;
        }
      } else if (order === EulerOrders.YXZ) {
        r[0] = Math.asin(-clamp(m23, -1, 1));

        if (Math.abs(m23) < 0.9999999) {
          r[1] = Math.atan2(m13, m33);
          r[2] = Math.atan2(m21, m22);
        } else {
          r[1] = Math.atan2(-m31, m11);
          r[2] = 0;
        }
      } else if (order === EulerOrders.ZXY) {
        r[0] = Math.asin(clamp(m32, -1, 1));

        if (Math.abs(m32) < 0.9999999) {
          r[1] = Math.atan2(-m31, m33);
          r[2] = Math.atan2(-m12, m22);
        } else {
          r[1] = 0;
          r[2] = Math.atan2(m21, m11);
        }
      } else if (order === EulerOrders.ZYX) {
        r[1] = Math.asin(-clamp(m31, -1, 1));

        if (Math.abs(m31) < 0.9999999) {
          r[0] = Math.atan2(m32, m33);
          r[2] = Math.atan2(m21, m11);
        } else {
          r[0] = 0;
          r[2] = Math.atan2(-m12, m22);
        }
      } else if (order === EulerOrders.YZX) {
        r[2] = Math.asin(clamp(m21, -1, 1));

        if (Math.abs(m21) < 0.9999999) {
          r[0] = Math.atan2(-m23, m22);
          r[1] = Math.atan2(-m31, m11);
        } else {
          r[0] = 0;
          r[1] = Math.atan2(m13, m33);
        }
      } else if (order === EulerOrders.XZY) {
        r[2] = Math.asin(-clamp(m12, -1, 1));

        if (Math.abs(m12) < 0.9999999) {
          r[0] = Math.atan2(m32, m22);
          r[1] = Math.atan2(m13, m11);
        } else {
          r[0] = Math.atan2(-m23, m33);
          r[1] = 0;
        }
      } else {
        console.warn("unsupported euler order:", order);
      }
      //r[0] = Math.atan2(m.m23, m.m33);
      //r[1] = Math.atan2(-m.m13, Math.sqrt(m.m23*m.m23 + m.m33*m.m33));
      //r[2] = Math.atan2(m.m12, m.m11);
    }
  }

  _determinant2x2(a:number, b:number, c:number, d:number) {
    return a * d - b * c;
  }

  _determinant3x3(a1:number, a2:number, a3:number, b1:number, b2:number, b3:number, c1:number, c2:number, c3:number) {
    return (
      a1 * this._determinant2x2(b2, b3, c2, c3) -
      b1 * this._determinant2x2(a2, a3, c2, c3) +
      c1 * this._determinant2x2(a2, a3, b2, b3)
    );
  }

  _determinant4x4() {
    let a1 = this.$matrix.m11;
    let b1 = this.$matrix.m12;
    let c1 = this.$matrix.m13;
    let d1 = this.$matrix.m14;
    let a2 = this.$matrix.m21;
    let b2 = this.$matrix.m22;
    let c2 = this.$matrix.m23;
    let d2 = this.$matrix.m24;
    let a3 = this.$matrix.m31;
    let b3 = this.$matrix.m32;
    let c3 = this.$matrix.m33;
    let d3 = this.$matrix.m34;
    let a4 = this.$matrix.m41;
    let b4 = this.$matrix.m42;
    let c4 = this.$matrix.m43;
    let d4 = this.$matrix.m44;
    return (
      a1 * this._determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4) -
      b1 * this._determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4) +
      c1 * this._determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4) -
      d1 * this._determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4)
    );
  }

  _makeAdjoint() {
    let a1 = this.$matrix.m11;
    let b1 = this.$matrix.m12;
    let c1 = this.$matrix.m13;
    let d1 = this.$matrix.m14;
    let a2 = this.$matrix.m21;
    let b2 = this.$matrix.m22;
    let c2 = this.$matrix.m23;
    let d2 = this.$matrix.m24;
    let a3 = this.$matrix.m31;
    let b3 = this.$matrix.m32;
    let c3 = this.$matrix.m33;
    let d3 = this.$matrix.m34;
    let a4 = this.$matrix.m41;
    let b4 = this.$matrix.m42;
    let c4 = this.$matrix.m43;
    let d4 = this.$matrix.m44;

    this.$matrix.m11 = this._determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4);
    this.$matrix.m21 = -this._determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4);
    this.$matrix.m31 = this._determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4);
    this.$matrix.m41 = -this._determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);
    this.$matrix.m12 = -this._determinant3x3(b1, b3, b4, c1, c3, c4, d1, d3, d4);
    this.$matrix.m22 = this._determinant3x3(a1, a3, a4, c1, c3, c4, d1, d3, d4);
    this.$matrix.m32 = -this._determinant3x3(a1, a3, a4, b1, b3, b4, d1, d3, d4);
    this.$matrix.m42 = this._determinant3x3(a1, a3, a4, b1, b3, b4, c1, c3, c4);
    this.$matrix.m13 = this._determinant3x3(b1, b2, b4, c1, c2, c4, d1, d2, d4);
    this.$matrix.m23 = -this._determinant3x3(a1, a2, a4, c1, c2, c4, d1, d2, d4);
    this.$matrix.m33 = this._determinant3x3(a1, a2, a4, b1, b2, b4, d1, d2, d4);
    this.$matrix.m43 = -this._determinant3x3(a1, a2, a4, b1, b2, b4, c1, c2, c4);
    this.$matrix.m14 = -this._determinant3x3(b1, b2, b3, c1, c2, c3, d1, d2, d3);
    this.$matrix.m24 = this._determinant3x3(a1, a2, a3, c1, c2, c3, d1, d2, d3);
    this.$matrix.m34 = -this._determinant3x3(a1, a2, a3, b1, b2, b3, d1, d2, d3);
    this.$matrix.m44 = this._determinant3x3(a1, a2, a3, b1, b2, b3, c1, c2, c3);
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this);

    const saved = this as any
    this.load(saved.mat);
    saved.__mat = saved.mat;
    //delete saved.mat;
  }
}

lookat_cache_vs3 = util.cachering.fromConstructor(Vector3, 512);
lookat_cache_vs4 = util.cachering.fromConstructor(Vector4, 512);
lookat_cache_ms = util.cachering.fromConstructor(Matrix4, 512);
euler_rotate_mats = util.cachering.fromConstructor(Matrix4, 512);
makenormalcache = util.cachering.fromConstructor(Vector3, 512);
temp_mats = util.cachering.fromConstructor(Matrix4, 512);
preMultTemp = new Matrix4();
`;

// genVectormath.ts
var vecQuatMults = {
  2: `    mulVecQuat(q: IQuat) {
      let t0 = -q[1] * this[0] - q[2] * this[1];
      let t1 = q[0] * this[0] - q[3] * this[1];
      let t2 = q[0] * this[1] + q[3] * this[0];

      let z = q[1] * this[1] - q[2] * this[0];
      this[0] = t1;
      this[1] = t2;

      t1 = t0 * -q[1] + this[0] * q[0] - this[1] * q[3] + z * q[2];
      t2 = t0 * -q[2] + this[1] * q[0] - z * q[1] + this[0] * q[3];

      this[0] = t1;
      this[1] = t2;

      return this;
    }`,
  3: "",
  // is set below
  4: `    mulVecQuat(q: IQuat) {
      let t0 = -q[1] * this[0] - q[2] * this[1] - q[3] * this[2];
      let t1 = q[0] * this[0] + q[2] * this[2] - q[3] * this[1];
      let t2 = q[0] * this[1] + q[3] * this[0] - q[1] * this[2];

      this[2] = q[0] * this[2] + q[1] * this[1] - q[2] * this[0];
      this[0] = t1;
      this[1] = t2;

      t1 = t0 * -q[1] + this[0] * q[0] - this[1] * q[3] + this[2] * q[2];
      t2 = t0 * -q[2] + this[1] * q[0] - this[2] * q[1] + this[0] * q[3];

      this[2] = t0 * -q[3] + this[2] * q[0] - this[0] * q[2] + this[1] * q[1];
      this[0] = t1;
      this[1] = t2;

      return this;
    }
`
};
vecQuatMults[3] = vecQuatMults[4];
var matrixVecMults = {
  2: `/** Returns w value. */
    multVecMatrix(matrix: Matrix4, ignore_w = false) {
      const x = this[0];
      const y = this[1];
      const w = 1.0;

      this[0] = w * matrix.$matrix.m41 + x * matrix.$matrix.m11 + y * matrix.$matrix.m21;
      this[1] = w * matrix.$matrix.m42 + x * matrix.$matrix.m12 + y * matrix.$matrix.m22;

      if (!ignore_w && matrix.isPersp) {
        let w2 = w * matrix.$matrix.m44 + x * matrix.$matrix.m14 + y * matrix.$matrix.m24;

        if (w2 !== 0.0) {
          this[0] /= w2;
          this[1] /= w2;
        }
      }

      return this;
    }
  `,
  3: `/** Returns w value. */
      multVecMatrix(matrix: Matrix4, ignore_w = false) {
      if (ignore_w === undefined) {
        ignore_w = false;
      }
      let x = this[0];
      let y = this[1];
      let z = this[2];
      this[0] = matrix.$matrix.m41 + x*matrix.$matrix.m11 + y*matrix.$matrix.m21 + z*matrix.$matrix.m31;
      this[1] = matrix.$matrix.m42 + x*matrix.$matrix.m12 + y*matrix.$matrix.m22 + z*matrix.$matrix.m32;
      this[2] = matrix.$matrix.m43 + x*matrix.$matrix.m13 + y*matrix.$matrix.m23 + z*matrix.$matrix.m33;
      let w = matrix.$matrix.m44 + x*matrix.$matrix.m14 + y*matrix.$matrix.m24 + z*matrix.$matrix.m34;

      if (!ignore_w && w !== 1 && w !== 0 && matrix.isPersp) {
        this[0] /= w;
        this[1] /= w;
        this[2] /= w;
      }
      return w;
    }`,
  4: `/** Returns w value. */
    multVecMatrix(matrix: Matrix4): number {
      let x = this[0];
      let y = this[1];
      let z = this[2];
      let w = this[3];

      this[0] = w * matrix.$matrix.m41 + x * matrix.$matrix.m11 + y * matrix.$matrix.m21 + z * matrix.$matrix.m31;
      this[1] = w * matrix.$matrix.m42 + x * matrix.$matrix.m12 + y * matrix.$matrix.m22 + z * matrix.$matrix.m32;
      this[2] = w * matrix.$matrix.m43 + x * matrix.$matrix.m13 + y * matrix.$matrix.m23 + z * matrix.$matrix.m33;
      this[3] = w * matrix.$matrix.m44 + x * matrix.$matrix.m14 + y * matrix.$matrix.m24 + z * matrix.$matrix.m34;

      return this[3];
    }
`
};
var DOT_NORM_SNAP_LIMIT = 1e-11;
var M_SQRT2 = Math.sqrt(2);
var FLT_EPSILON = 222e-18;
var basic_funcs = {
  equals: [["vb"], "this[X] === b[X]", "&&"],
  /*dot is made manually so it's safe for acos
  dot     : [["b"], "this[X]*b[X]", "+"],
   */
  zero: [[], "0.0"],
  negate: [[], "-this[X]"],
  combine: [["vb", "u", "v"], "this[X]*u + b[X]*v"],
  interp: [["vb", "t"], "this[X] + (b[X] - this[X])*t"],
  add: [["vb"], "this[X] + b[X]"],
  addFac: [["vb", "F"], "this[X] + b[X]*F"],
  fract: [[], "Math.fract(this[X])"],
  sub: [["vb"], "this[X] - b[X]"],
  mul: [["vb"], "this[X] * b[X]"],
  div: [["vb"], "this[X] / b[X]"],
  mulScalar: [["b"], "this[X] * b"],
  divScalar: [["b"], "this[X] / b"],
  addScalar: [["b"], "this[X] + b"],
  subScalar: [["b"], "this[X] - b"],
  minScalar: [["b"], "Math.min(this[X], b)"],
  maxScalar: [["b"], "Math.max(this[X], b)"],
  ceil: [[], "Math.ceil(this[X])"],
  floor: [[], "Math.floor(this[X])"],
  abs: [[], "Math.abs(this[X])"],
  min: [["vb"], "Math.min(this[X], b[X])"],
  max: [["vb"], "Math.max(this[X], b[X])"],
  clamp: [["MIN", "MAX"], "Math.min(Math.max(this[X], MAX), MIN)"]
};
function bounded_acos(fac) {
  if (fac <= -1) return Math.PI;
  else if (fac >= 1) return 0;
  else return Math.acos(fac);
}
function make_norm_safe_dot(cls2) {
  let _dot = cls2.prototype.dot;
  cls2.prototype._dot = _dot;
  cls2.prototype.dot = function(b) {
    let ret = _dot.call(this, b);
    if (ret >= 1 - DOT_NORM_SNAP_LIMIT && ret <= 1 + DOT_NORM_SNAP_LIMIT) return 1;
    if (ret >= -1 - DOT_NORM_SNAP_LIMIT && ret <= -1 + DOT_NORM_SNAP_LIMIT) return -1;
    return ret;
  };
}
function getBaseVector(parent) {
  return class BaseVector extends parent {
    constructor() {
      super(...arguments);
      this.vec = void 0;
    }
    static inherit(cls, vectorsize) {
      make_norm_safe_dot(cls);
      var f;
      let vectorDotDistance = "f = function vectorDotDistance(b) {\n";
      for (let i = 0; i < vectorsize; i++) {
        vectorDotDistance += "  let d" + i + " = this[" + i + "]-b[" + i + "];\n\n  ";
      }
      vectorDotDistance += "  return ";
      for (let i = 0; i < vectorsize; i++) {
        if (i > 0) vectorDotDistance += " + ";
        vectorDotDistance += "d" + i + "*d" + i;
      }
      vectorDotDistance += ";\n";
      vectorDotDistance += "};";
      cls.prototype.vectorDotDistance = eval(vectorDotDistance);
      let vectorDistance = "f = function vectorDistance(b) {\n";
      for (let i = 0; i < vectorsize; i++) {
        vectorDistance += `  let d${i} = this[${i}] - (b[${i}]||0);

  `;
      }
      vectorDistance += "  return Math.sqrt(";
      for (let i = 0; i < vectorsize; i++) {
        if (i > 0) vectorDistance += " + ";
        vectorDistance += "d" + i + "*d" + i;
      }
      vectorDistance += ");\n";
      vectorDistance += "};";
      cls.prototype.vectorDistance = eval(vectorDistance);
      let vectorDistanceSqr = "f = function vectorDistanceSqr(b) {\n";
      for (let i = 0; i < vectorsize; i++) {
        vectorDistanceSqr += `  let d${i} = this[${i}] - (b[${i}]||0);

  `;
      }
      vectorDistanceSqr += "  return (";
      for (let i = 0; i < vectorsize; i++) {
        if (i > 0) vectorDistanceSqr += " + ";
        vectorDistanceSqr += "d" + i + "*d" + i;
      }
      vectorDistanceSqr += ");\n";
      vectorDistanceSqr += "};";
      cls.prototype.vectorDistanceSqr = eval(vectorDistanceSqr);
      for (let k in basic_funcs) {
        let func = basic_funcs[k];
        let args = func[0];
        let line = func[1];
        var f;
        let code = "f = function " + k + "(";
        for (let i = 0; i < args.length; i++) {
          if (i > 0) code += ", ";
          line = line.replace(args[i], args[i].toLowerCase());
          code += args[i].toLowerCase();
        }
        code += ") {\n";
        if (func.length > 2) {
          code += "  return ";
          for (let i = 0; i < vectorsize; i++) {
            if (i > 0) code += func[2];
            code += "(" + line.replace(/X/g, "" + i) + ")";
          }
          code += ";\n";
        } else {
          for (let i = 0; i < vectorsize; i++) {
            let line2 = line.replace(/X/g, "" + i);
            code += "  this[" + i + "] = " + line2 + ";\n";
          }
          code += "  return this;\n";
        }
        code += "}\n";
        f = eval(code);
        cls.prototype[k] = f;
      }
    }
    copy() {
      return new this.constructor(this);
    }
    load(data) {
      throw new Error("Implement me!");
    }
    init_swizzle(size) {
      let ret = {};
      let cls2 = size === 4 ? Vector4 : size === 3 ? Vector32 : Vector2;
      for (let k2 in cls2.prototype) {
        let v = cls2.prototype[k2];
        if (typeof v !== "function" && !(v instanceof Function)) continue;
        ret[k2] = v.bind(this);
      }
      return ret;
    }
    vectorLength() {
      return sqrt(this.dot(this));
    }
    swapAxes(axis1, axis2) {
      let t = this[axis1];
      this[axis1] = this[axis2];
      this[axis2] = t;
      return this;
    }
    sinterp(v2, t) {
      let l1 = this.vectorLength();
      let l2 = v2.vectorLength();
      return this.interp(v2, t).normalize().mulScalar(l1 + (l2 - l1) * t);
    }
    perpSwap(axis1 = 0, axis2 = 1, sign = 1) {
      let tmp = this[axis1];
      this[axis1] = this[axis2] * sign;
      this[axis2] = -tmp * sign;
      return this;
    }
    normalize() {
      let l = this.vectorLength();
      if (l > 1e-8) {
        this.mulScalar(1 / l);
      }
      return this;
    }
  };
}
var BaseVector2 = getBaseVector(Array);
var F64BaseVector = getBaseVector(Float64Array);
var F32BaseVector = getBaseVector(Float32Array);
var I32BaseVector = getBaseVector(Int32Array);
var I16BaseVector = getBaseVector(Int16Array);
var I8BaseVector = getBaseVector(Int8Array);
var UI32BaseVector = getBaseVector(Uint32Array);
var UI16BaseVector = getBaseVector(Uint16Array);
var UI8BaseVector = getBaseVector(Uint8Array);
function makeVector4(BaseVector3, structName2 = "vec4", structType2 = "float") {
  let temp1, temp2, temp3, temp4;
  const Vector42 = class Vector4 extends BaseVector3 {
    static STRUCT = struct_default.inlineRegister(
      this,
      `
    ${structName2} {
      0 : ${structType2};
      1 : ${structType2};
      2 : ${structType2};
      3 : ${structType2};
    }`
    );
    constructor(data) {
      super(4);
      if (arguments.length > 1) {
        throw new Error("unexpected argument");
      }
      this[0] = this[1] = this[2] = this[3] = 0;
      if (data !== void 0) {
        this.load(data);
      }
    }
    toCSS() {
      let r = ~~(this[0] * 255);
      let g = ~~(this[1] * 255);
      let b = ~~(this[2] * 255);
      let a = this[3];
      return `rgba(${r},${g},${b},${a})`;
    }
    load2(b) {
      this[0] = b[0];
      this[1] = b[1];
      return this;
    }
    load3(b) {
      this[0] = b[0];
      this[1] = b[1];
      this[2] = b[2];
      return this;
    }
    loadXYZW(x, y, z, w) {
      this[0] = x;
      this[1] = y;
      this[2] = z;
      this[3] = w;
      return this;
    }
    loadXYZ(x, y, z) {
      this[0] = x;
      this[1] = y;
      this[2] = z;
      return this;
    }
    static normalizedDot4(v1, v2, v3, v4) {
      temp1.load(v2).sub(v1).normalize();
      temp2.load(v4).sub(v3).normalize();
      return temp1.dot(temp2);
    }
    static normalizedDot3(v1, center, v2) {
      temp1.load(v1).sub(center).normalize();
      temp2.load(v2).sub(center).normalize();
      return temp1.dot(temp2);
    }
    load(data) {
      if (data === void 0) return this;
      this[0] = data[0];
      this[1] = data[1];
      this[2] = data[2];
      this[3] = data[3];
      return this;
    }
    dot(b) {
      return this[0] * b[0] + this[1] * b[1] + this[2] * b[2] + this[3] * b[3];
    }
    mulVecQuat(q) {
      let t0 = -q[1] * this[0] - q[2] * this[1] - q[3] * this[2];
      let t1 = q[0] * this[0] + q[2] * this[2] - q[3] * this[1];
      let t2 = q[0] * this[1] + q[3] * this[0] - q[1] * this[2];
      this[2] = q[0] * this[2] + q[1] * this[1] - q[2] * this[0];
      this[0] = t1;
      this[1] = t2;
      t1 = t0 * -q[1] + this[0] * q[0] - this[1] * q[3] + this[2] * q[2];
      t2 = t0 * -q[2] + this[1] * q[0] - this[2] * q[1] + this[0] * q[3];
      this[2] = t0 * -q[3] + this[2] * q[0] - this[0] * q[2] + this[1] * q[1];
      this[0] = t1;
      this[1] = t2;
      return this;
    }
    multVecMatrix(matrix) {
      let x = this[0];
      let y = this[1];
      let z = this[2];
      let w = this[3];
      this[0] = w * matrix.$matrix.m41 + x * matrix.$matrix.m11 + y * matrix.$matrix.m21 + z * matrix.$matrix.m31;
      this[1] = w * matrix.$matrix.m42 + x * matrix.$matrix.m12 + y * matrix.$matrix.m22 + z * matrix.$matrix.m32;
      this[2] = w * matrix.$matrix.m43 + x * matrix.$matrix.m13 + y * matrix.$matrix.m23 + z * matrix.$matrix.m33;
      this[3] = w * matrix.$matrix.m44 + x * matrix.$matrix.m14 + y * matrix.$matrix.m24 + z * matrix.$matrix.m34;
      return this[3];
    }
    cross(v) {
      let x = this[1] * v[2] - this[2] * v[1];
      let y = this[2] * v[0] - this[0] * v[2];
      let z = this[0] * v[1] - this[1] * v[0];
      this[0] = x;
      this[1] = y;
      this[2] = z;
      return this;
    }
    preNormalizedAngle(v2) {
      let th = this.dot(v2) * 0.99999;
      return Math.acos(th);
    }
    loadSTRUCT(reader) {
      reader(this);
      if (typeof this.vec !== "undefined") {
        this.load(this.vec);
        this.vec = void 0;
      }
    }
  };
  temp1 = new Vector42();
  temp2 = new Vector42();
  temp3 = new Vector42();
  temp4 = new Vector42();
  return Vector42;
}
var Vector4 = makeVector4(BaseVector2);
var _v3nd_n1_normalizedDot;
var _v3nd_n2_normalizedDot;
var _v3nd4_n1_normalizedDot4;
var _v3nd4_n2_normalizedDot4;
function makeVector3(BaseVector, structName = "vec3", structType = "float", customConstructorCode = void 0) {
  var Vector3;
  var bundlehelper = [struct_default];
  const constructorCode = customConstructorCode ?? `
    constructor(data) {
      super(3);

      if (arguments.length > 1) {
        throw new Error("unexpected argument");
      }

      this[0] = this[1] = this[2] = 0.0;

      if (data !== undefined) {
        this.load(data);
      }

      if (this.constructor === Vector3) {
        Object.preventExtensions(this);
      }
    }
  `;
  const code = `
  let temp1, temp2, temp3, temp4;
  Vector3 = class Vector3 extends BaseVector {
    static STRUCT = bundlehelper[0].inlineRegister(this, \`
    ${structName} {
      0 : ${structType};
      1 : ${structType};
      2 : ${structType};
    }\`);

    ${constructorCode}

    static normalizedDot4(v1, v2, v3, v4) {
      temp1.load(v2).sub(v1).normalize()
      temp2.load(v4).sub(v3).normalize();

      return temp1.dot(temp2);

    }

    static normalizedDot3(v1, center, v2) {
      temp1.load(v1).sub(center).normalize();
      temp2.load(v2).sub(center).normalize();

      return temp1.dot(temp2);
    }

    toCSS() {
      let r = ~~(this[0]*255);
      let g = ~~(this[1]*255);
      let b = ~~(this[2]*255);
      return \`rgb(\${r},\${g},\${b})\`
    }

    load2(b) {
      this[0] = b[0]
      this[1] = b[1]
      return this
    }
      
    loadXYZ(x, y, z) {
      this[0] = x;
      this[1] = y;
      this[2] = z;

      return this;
    }

    loadXY(x, y) {
      this[0] = x;
      this[1] = y;

      return this;
    }

    toJSON() {
      return [this[0], this[1], this[2]];
    }

    loadJSON(obj) {
      return this.load(obj);
    }

    initVector3() {
      this.length = 3;
      this[0] = this[1] = this[2] = 0;
      return this;
    }

    load(data) {
      if (data === undefined)
        return this;

      //if (isNaN(data[0]) || isNaN(data[1]) || isNaN(data[2])) {
      //  throw new Error("NaN");
      //}

      this[0] = data[0];
      this[1] = data[1];
      this[2] = data[2];

      return this;
    }

    dot(b) {
      // acos safe adjustment
      const ret = this[0]*b[0] + this[1]*b[1] + this[2]*b[2];
      if (ret >= 1.0 - DOT_NORM_SNAP_LIMIT && ret <= 1.0 + DOT_NORM_SNAP_LIMIT) return 1.0;
      if (ret >= -1.0 - DOT_NORM_SNAP_LIMIT && ret <= -1.0 + DOT_NORM_SNAP_LIMIT) return -1.0;
      return ret;
    }

    normalizedDot(v) {
      $_v3nd_n1_normalizedDot.load(this);
      $_v3nd_n2_normalizedDot.load(v);
      $_v3nd_n1_normalizedDot.normalize();
      $_v3nd_n2_normalizedDot.normalize();
      return $_v3nd_n1_normalizedDot.dot($_v3nd_n2_normalizedDot);
    }

    mulVecQuat(q) {
      let t0 = -q[1]*this[0] - q[2]*this[1] - q[3]*this[2];
      let t1 = q[0]*this[0] + q[2]*this[2] - q[3]*this[1];
      let t2 = q[0]*this[1] + q[3]*this[0] - q[1]*this[2];

      this[2] = q[0]*this[2] + q[1]*this[1] - q[2]*this[0];
      this[0] = t1;
      this[1] = t2;

      t1 = t0* -q[1] + this[0]*q[0] - this[1]*q[3] + this[2]*q[2];
      t2 = t0* -q[2] + this[1]*q[0] - this[2]*q[1] + this[0]*q[3];

      this[2] = t0* -q[3] + this[2]*q[0] - this[0]*q[2] + this[1]*q[1];
      this[0] = t1;
      this[1] = t2;

      return this;
    }

    multVecMatrix(matrix, ignore_w) {
      if (ignore_w === undefined) {
        ignore_w = false;
      }
      let x = this[0];
      let y = this[1];
      let z = this[2];
      this[0] = matrix.$matrix.m41 + x*matrix.$matrix.m11 + y*matrix.$matrix.m21 + z*matrix.$matrix.m31;
      this[1] = matrix.$matrix.m42 + x*matrix.$matrix.m12 + y*matrix.$matrix.m22 + z*matrix.$matrix.m32;
      this[2] = matrix.$matrix.m43 + x*matrix.$matrix.m13 + y*matrix.$matrix.m23 + z*matrix.$matrix.m33;
      let w = matrix.$matrix.m44 + x*matrix.$matrix.m14 + y*matrix.$matrix.m24 + z*matrix.$matrix.m34;

      if (!ignore_w && w !== 1 && w !== 0 && matrix.isPersp) {
        this[0] /= w;
        this[1] /= w;
        this[2] /= w;
      }
      return w;
    }

    cross(v) {
      let x = this[1]*v[2] - this[2]*v[1];
      let y = this[2]*v[0] - this[0]*v[2];
      let z = this[0]*v[1] - this[1]*v[0];

      this[0] = x;
      this[1] = y;
      this[2] = z;

      return this;
    }

    //axis is optional, 0
    rot2d(A, axis = 0) {
      let x = this[0];
      let y = this[1];

      if (axis === 1) {
        this[0] = x*Math.cos(A) + y*Math.sin(A);
        this[1] = y*Math.cos(A) - x*Math.sin(A);
      } else {
        this[0] = x*Math.cos(A) - y*Math.sin(A);
        this[1] = y*Math.cos(A) + x*Math.sin(A);
      }

      return this;
    }

    preNormalizedAngle(v2) {
      let th = this.dot(v2)*0.99999;
      return Math.acos(th);
    }

    loadSTRUCT(reader) {
      reader(this);

      if (typeof this.vec !== "undefined") {
        this.load(this.vec);
        this.vec = undefined;
      }
    }
  }

  temp1 = new Vector3();
  temp2 = new Vector3();
  temp3 = new Vector3();
  temp4 = new Vector3();
  `;
  eval(code);
  return Vector3;
}
var Vector32 = makeVector3(F64BaseVector);
function makeVector2(BaseVector3, structName2 = "vec2", structType2 = "float") {
  let temp1, temp2, temp3, temp4;
  const Vector22 = class Vector2 extends BaseVector3 {
    static STRUCT = struct_default.inlineRegister(
      this,
      `
    ${structName2} {
      0 : ${structType2};
      1 : ${structType2};
    }`
    );
    constructor(data) {
      super(2);
      if (arguments.length > 1) {
        throw new Error("unexpected argument");
      }
      this[0] = this[1] = 0;
      if (data !== void 0) {
        this.load(data);
      }
    }
    initVector2(co) {
      this.length = 2;
      if (co !== void 0) {
        this[0] = co[0];
        this[1] = co[1];
      } else {
        this[0] = this[1] = 0;
      }
      return this;
    }
    static normalizedDot4(v1, v2, v3, v4) {
      temp1.load(v2).sub(v1).normalize();
      temp2.load(v4).sub(v3).normalize();
      return temp1.dot(temp2);
    }
    static normalizedDot3(v1, center, v2) {
      temp1.load(v1).sub(center).normalize();
      temp2.load(v2).sub(center).normalize();
      return temp1.dot(temp2);
    }
    toJSON() {
      return [this[0], this[1]];
    }
    loadJSON(obj) {
      return this.load(obj);
    }
    loadXY(x, y) {
      this[0] = x;
      this[1] = y;
      return this;
    }
    load(data) {
      if (data === void 0) return this;
      this[0] = data[0];
      this[1] = data[1];
      return this;
    }
    //axis is optional, 0
    rot2d(A, axis) {
      let x = this[0];
      let y = this[1];
      if (axis === 1) {
        this[0] = x * Math.cos(A) + y * Math.sin(A);
        this[1] = y * Math.cos(A) - x * Math.sin(A);
      } else {
        this[0] = x * Math.cos(A) - y * Math.sin(A);
        this[1] = y * Math.cos(A) + x * Math.sin(A);
      }
      return this;
    }
    dot(b) {
      return this[0] * b[0] + this[1] * b[1];
    }
    multVecMatrix(matrix) {
      let x = this[0];
      let y = this[1];
      let w = 1;
      this[0] = w * matrix.$matrix.m41 + x * matrix.$matrix.m11 + y * matrix.$matrix.m21;
      this[1] = w * matrix.$matrix.m42 + x * matrix.$matrix.m12 + y * matrix.$matrix.m22;
      if (matrix.isPersp) {
        let w2 = w * matrix.$matrix.m44 + x * matrix.$matrix.m14 + y * matrix.$matrix.m24;
        if (w2 !== 0) {
          this[0] /= w2;
          this[1] /= w2;
        }
      }
      return this;
    }
    mulVecQuat(q) {
      let t0 = -q[1] * this[0] - q[2] * this[1];
      let t1 = q[0] * this[0] - q[3] * this[1];
      let t2 = q[0] * this[1] + q[3] * this[0];
      let z = q[1] * this[1] - q[2] * this[0];
      this[0] = t1;
      this[1] = t2;
      t1 = t0 * -q[1] + this[0] * q[0] - this[1] * q[3] + z * q[2];
      t2 = t0 * -q[2] + this[1] * q[0] - z * q[1] + this[0] * q[3];
      this[0] = t1;
      this[1] = t2;
      return this;
    }
    vectorLengthSqr() {
      return this.dot(this);
    }
    loadSTRUCT(reader) {
      reader(this);
      if (typeof this.vec !== void 0) {
        this.load(this.vec);
        this.vec = void 0;
      }
    }
  };
  temp1 = new Vector22();
  temp2 = new Vector22();
  temp3 = new Vector22();
  temp4 = new Vector22();
  return Vector22;
}
function basicDotFuncs(vecsize, VArg) {
  let s = "";
  let vectorDotDistance2 = `    vectorDotDistance(b: ${VArg}): number {
`;
  for (let i = 0; i < vecsize; i++) {
    vectorDotDistance2 += `      const d${i} = this[${i}] - b[${i}];
`;
  }
  vectorDotDistance2 += "      return ";
  for (let i = 0; i < vecsize; i++) {
    if (i > 0) vectorDotDistance2 += " + ";
    vectorDotDistance2 += "d" + i + "*d" + i;
  }
  vectorDotDistance2 += ";\n";
  vectorDotDistance2 += "    }\n\n";
  s += vectorDotDistance2;
  let vectorDistance2 = `    vectorDistance(b: ${VArg}): number {
`;
  for (let i = 0; i < vecsize; i++) {
    vectorDistance2 += `      const d${i} = this[${i}] - (b[${i}] ?? 0);
`;
  }
  vectorDistance2 += "      return Math.sqrt(";
  for (let i = 0; i < vecsize; i++) {
    if (i > 0) vectorDistance2 += " + ";
    vectorDistance2 += "d" + i + "*d" + i;
  }
  vectorDistance2 += ");\n";
  vectorDistance2 += "    }\n\n";
  s += vectorDistance2;
  let vectorDistanceSqr2 = `    vectorDistanceSqr(b: ${VArg}): number {
`;
  for (let i = 0; i < vecsize; i++) {
    vectorDistanceSqr2 += `      const d${i} = this[${i}] - (b[${i}] ?? 0);
`;
  }
  vectorDistanceSqr2 += "      return (";
  for (let i = 0; i < vecsize; i++) {
    if (i > 0) vectorDistanceSqr2 += " + ";
    vectorDistanceSqr2 += "d" + i + "*d" + i;
  }
  vectorDistanceSqr2 += ");\n";
  vectorDistanceSqr2 += "    }";
  s += vectorDistanceSqr2;
  return s;
}
function genBase(base, name, vecsize) {
  const VArg = `VectorLikeOrHigher<${vecsize}, this>`;
  const cls2 = base.inherit;
  function unroll(s2, char = "\n", offset = 0, count = vecsize) {
    let s1 = "";
    let axes = "xyzw";
    for (let i = 0; i < count; i++) {
      s1 += s2.replace(/\$\$/g, "" + (i + offset)).replace(/\$\!/g, "" + (i + 1 + offset)).replace(/\$X/g, axes[i]) + char;
    }
    return s1.slice(0, -1);
  }
  function unrollJoin(s2, char = "\n", count = vecsize) {
    let arr = [];
    let axes = "xyzw";
    for (let i = 0; i < count; i++) {
      arr.push(s2.replace(/\$\$/g, "" + i).replace(/\$X/g, axes[i]));
    }
    return arr.join(char);
  }
  let mTab = "      ";
  let cTab = "    ";
  let basicFuncs = "";
  for (let k2 in basic_funcs) {
    let func2 = basic_funcs[k2];
    let args2 = func2[0];
    let line2 = func2[1];
    var f2;
    let code2 = `    ${k2}(`;
    for (let i = 0; i < args2.length; i++) {
      let arg = args2[i];
      let type = arg === "vb" ? `${VArg}` : "number";
      arg = (arg === "vb" ? "b" : arg).toLowerCase();
      if (i > 0) code2 += ", ";
      line2 = line2.replace(args2[i], arg);
      code2 += `${arg.toLowerCase()}: ${type}`;
    }
    code2 += ") {\n";
    if (func2.length > 2) {
      code2 += mTab + "return ";
      for (let i = 0; i < vecsize; i++) {
        if (i > 0) code2 += ` ${func2[2]} `;
        code2 += "(" + line2.replace(/X/g, "" + i) + ")";
      }
      code2 += ";\n";
    } else {
      for (let i = 0; i < vecsize; i++) {
        let line22 = line2.replace(/X/g, "" + i);
        code2 += mTab + "this[" + i + "] = " + line22 + ";\n";
      }
      code2 += `${mTab}return this;
`;
    }
    code2 += `${cTab}}

`;
    basicFuncs += code2;
  }
  const indexType = unroll("$$").split("\n").join("|");
  let VArgS = `VectorLikeOrHigher<${vecsize}, Vector${vecsize}>`;
  let s = "";
  s += `
function create${name}${vecsize}(parent: typeof Array | typeof Float32Array, structName?: string) {
  return class ${name}${vecsize} extends parent {
${unroll("    $$: number;")}
    // this is set by the parent class
    // @ts-expect-error
    length: number
    [Symbol.iterator] = parent.prototype[Symbol.iterator];

    static structName = structName;
    static STRUCT = structName !== undefined ? nstructjs.inlineRegister(this, \`
    \${structName} {
${unroll("      $$: double;")}
    }\`) : undefined;
    
    static normalizedDot4(v1: ${VArgS}, v2: ${VArgS}, v3: ${VArgS}, v4: ${VArgS}) {
${unroll(`      let d$X1 = v2[$$] - v1[$$];`)}
${unroll(`      let d$X2 = v4[$$] - v3[$$];`)}
      // normalize
      let l1 = Math.sqrt(${unrollJoin("d$X1*d$X1", " + ")})
      let l2 = Math.sqrt(${unrollJoin("d$X2*d$X2", " + ")})

      // normalize
      l1 = l1 > 0.0000001 ? 1.0 / l1 : 0.0
      l2 = l2 > 0.0000001 ? 1.0 / l2 : 0.0
${unroll(`      d$X1 *= l1;`)}
${unroll(`      d$X1 *= l1;`)}
  
      return ${unrollJoin(`d$X1*d$X2`, " + ")};
    }

    static normalizedDot3(v1: ${VArgS}, center: ${VArgS}, v2: ${VArgS}) {
${unroll(`      let d$X1 = v1[$$] - center[$$];`)}
${unroll(`      let d$X2 = v2[$$] - center[$$];`)}
      // normalize
      let l1 = Math.sqrt(${unrollJoin("d$X1*d$X1", " + ")})
      let l2 = Math.sqrt(${unrollJoin("d$X2*d$X2", " + ")})

      // normalize
      l1 = l1 > 0.0000001 ? 1.0 / l1 : 0.0
      l2 = l2 > 0.0000001 ? 1.0 / l2 : 0.0
${unroll(`      d$X1 *= l1;`)}
${unroll(`      d$X1 *= l1;`)}
  
      return ${unrollJoin(`d$X1*d$X2`, " + ")};
    }

    constructor(existing?: number[] | VectorLikeOrHigher<${vecsize}, ${name}${vecsize}>) {
      super(${vecsize});
      if (existing !== undefined) {
${unroll(`${mTab}  this[$$] = existing[$$] ?? 0.0;`)}
      } else {
${unroll(`${mTab}  this[$$] = 0;`)}
      }
    }

    load(existing: number[] | VectorLikeOrHigher<${vecsize}, ${name}${vecsize}>): this {
${unroll(`${mTab}this[$$] = existing[$$];`)}
      return this;
    }

// load2/3/4 methods
${Array.from(IndexRange(vecsize - 1)).map((i) => {
    return `
    load${i + 2}(existing: number[] | VectorLikeOrHigher<${i + 2}, ${name}${i + 2}>): this {
${unroll(`${mTab}this[$$] = existing[$$];`, void 0, void 0, i + 2)}
      return this
    }
  `;
  }).join("\n")}

${basicFuncs}${basicDotFuncs(vecsize, VArg)}
    copy() {
      return new ${name}${vecsize}(this);
    }
    vectorLengthSqr(): number {
      return this.dot(this)
    }
    vectorLength(): number {
      return Math.sqrt(this.dot(this));
    }
    rot2d(A: number, axis: number = 0) {
      let x = this[0];
      let y = this[1];

      if (axis === 1) {
        this[0] = x * Math.cos(A) + y * Math.sin(A);
        this[1] = y * Math.cos(A) - x * Math.sin(A);
      } else {
        this[0] = x * Math.cos(A) - y * Math.sin(A);
        this[1] = y * Math.cos(A) + x * Math.sin(A);
      }
      return this;
    }
    dot(b: ${VArg}): number {
      const ret = ${unrollJoin("this[$$]*b[$$]", " + ")};
      // acos safe adjustment to prevent math domain errors
      if (ret >= 1.0 - DOT_NORM_SNAP_LIMIT && ret <= 1.0 + DOT_NORM_SNAP_LIMIT) return 1.0;
      if (ret >= -1.0 - DOT_NORM_SNAP_LIMIT && ret <= -1.0 + DOT_NORM_SNAP_LIMIT) return -1.0;
      return ret;
    }
    
${Array.from(IndexRange(vecsize)).map((i) => {
    let s2 = "";
    let axes = "XYZW";
    s2 += `    load${axes.slice(0, i + 1)}`;
    s2 += "(";
    s2 += Array.from(axes).slice(0, i + 1).map((a) => a.toLowerCase() + ": number").join(", ");
    s2 += ") {\n";
    s2 += Array.from(axes).slice(0, i + 1).map((a, j) => `      this[${j}] = ${a.toLowerCase()}`).join("\n") + "\n";
    s2 += "      return this\n";
    s2 += "    }";
    return "    " + s2.trim();
  }).join("\n")}

    swapAxes(axis1: ${indexType}, axis2: ${indexType}) {
      const t = this[axis1];
      this[axis1] = this[axis2];
      this[axis2] = t;
      return this;
    }

    /** somewhat crappy spherical interpolation */
    sinterp(v2: this, t: number) {
      let l1 = this.vectorLength();
      let l2 = v2.vectorLength();

      //XXX this seems horribly incorrect.
      return this.interp(v2, t)
        .normalize()
        .mulScalar(l1 + (l2 - l1) * t);
    }

    /** perpendicular swap */
    perpSwap(axis1: ${indexType} = 0, axis2: ${indexType} = 1, sign = 1) {
      let tmp = this[axis1];
      this[axis1] = this[axis2] * sign;
      this[axis2] = -tmp * sign;
      return this;
    }

    normalize(): this {
      const l = this.vectorLength();
      if (l > 0.00000001) {
        this.mulScalar(1.0 / l);
      }
      return this;
    }
${matrixVecMults[vecsize]}
${vecQuatMults[vecsize]}
${vecsize > 2 ? `
    cross(v: ${VArg}) {
      const x = this[1] * v[2] - this[2] * v[1];
      const y = this[2] * v[0] - this[0] * v[2];
      const z = this[0] * v[1] - this[1] * v[0];

      this[0] = x;
      this[1] = y;
      this[2] = z;

      return this;
    }
` : ""}
    preNormalizedAngle(v2: ${VArg}) {
      let th = this.dot(v2) * 0.99999;
      return Math.acos(th);
    }
${vecsize === 3 ? `
    toCSS() {
      let r = ~~(this[0]*255);
      let g = ~~(this[1]*255);
      let b = ~~(this[2]*255);
      return \`rgb(\${r},\${g},\${b})\`
    }
` : ``}${vecsize === 4 ? `
    toCSS() {
      let r = ~~(this[0]*255);
      let g = ~~(this[1]*255);
      let b = ~~(this[2]*255);
      return \`rgb(\${r},\${g},\${b},\${this[3]})\`
    }
` : ``}
    loadSTRUCT(reader: StructReader<this>) {
      reader(this);
    }
  }
}
  `;
  return s;
}
function genCode() {
  let s = "";
  s += `
// generated by genVectormath.ts
import nstructjs from "./struct";
import type { StructReader } from "./nstructjs";
import * as util from "./util";

let vec_temp_mats: util.cachering<Matrix4>

const DOT_NORM_SNAP_LIMIT = 0.00000000001;
const FLT_EPSILON = 2.22e-16;

export type VectorLike<LEN extends 0 | 1 | 2 | 3 | 4> = {
  //[P: number]: never;
  0: LEN extends 1 | 2 | 3 | 4 ? number : never;
  1?: LEN extends 2 | 3 | 4 ? number : never;
  2?: LEN extends 3 | 4 ? number : never;
  3?: LEN extends 4 ? number : never;
  length: number;
};

declare interface IOpenNumVector {
  [k: number]: number;
  length: number;
}

type indexUnions = { 0: never; 1: 0; 2: 0 | 1; 3: 0 | 1 | 2; 4: 0 | 1 | 2 | 3 };
type strNumMap = { "0": 0; "1": 1; "2": 2; "3": 3; "4": 4 };

export type INumVectorLimited<LEN extends 0 | 1 | 2 | 3 | 4> = {
  //[P: number]: never;
  0: LEN extends 1 | 2 | 3 | 4 ? number : never;
  1?: LEN extends 2 | 3 | 4 ? number : never;
  2?: LEN extends 3 | 4 ? number : never;
  3?: LEN extends 4 ? number : never;
  length: number;
};

declare type INumVector = IOpenNumVector | INumVectorLimited<2> | INumVectorLimited<3> | INumVectorLimited<4>;

export type IndexUnion<L extends 0 | 1 | 2 | 3 | 4> = indexUnions[L];

//type indexUnions = { 2: 0 | 1, 3: 0 | 1 | 2, 4: 0 | 1 | 2 | 3 };

export type Number1 = 0;
export type Number2 = 0 | 1;
export type Number3 = 0 | 1 | 2;
export type Number4 = 0 | 1 | 2 | 3;
export type Number5 = 0 | 1 | 2 | 3 | 4;

type numlits = { 1: 1; 2: 2 | 3 | 4; 3: 3 | 4; 4: 4 };
export type NumLitHigher<L extends 1 | 2 | 3 | 4> = numlits[L];

/**
 * By design vectors do not have a simple index signature.
 * Instead, indices up to LEN type to number, while indices above
 * LEN type to number | undefined.
 * 
 * This is to prevent mixing of incompatible vectors.
 *
 * This can create problems with iteration, for example:
 * 
 * \`\`\`ts
 * let v = new Vector3()
 * for (let i=0; i<3; i++) {
 *   // will not work
 *   v[i] = i
 *   // will work
 *   v[i] = i as Number3
 * }
 * 
 * //alternative with IndexRange:
 * for (const i of IndexRange(3)) {
 *   v[i] = i
 * }
 * \`\`\`
 */
declare interface IBaseVector<LEN extends 1 | 2 | 3 | 4, ArrayType = Array<number>> {
  //[P: P extends indexUnions[LEN] ? number : never]: P extends IndexUnion<LEN> ? number : never;

  // type helper phantom property
  LEN?: LEN;
  
  length: LEN | number;

  // for indices above LEN, type to number | undefined
  [k: number]: number | undefined;
  
  // for indices up to LEN, type to number
  0: LEN extends 1 | 2 | 3 | 4 ? number : never;
  1: LEN extends 2 | 3 | 4 ? number : never;
  2: LEN extends 3 | 4 ? number : never;
  3: LEN extends 4 ? number : never;

  [Symbol.iterator](): Iterator<number>;

  sinterp(b: IBaseVector<NumLitHigher<LEN>>, t: number): this;

  perpSwap(axis1?: number, axis2?: number, sign?: number): this;

  //all math operates in-place, no new objects
  load(b: IBaseVector<NumLitHigher<LEN>> | INumVector): this;

  loadXY(x: number, y: number): this;

  copy(): this;

  add(b: IBaseVector<NumLitHigher<LEN>>): this;
  sub(b: IBaseVector<NumLitHigher<LEN>>): this;
  mul(b: IBaseVector<NumLitHigher<LEN>>): this;
  div(b: IBaseVector<NumLitHigher<LEN>>): this;
  addScalar(b: number): this;
  subScalar(b: number): this;
  mulScalar(b: number): this;
  divScalar(b: number): this;
  minScalar(b: number): this;
  maxScalar(b: number): this;
  min(b: IBaseVector<NumLitHigher<LEN>>): this;
  max(b: IBaseVector<NumLitHigher<LEN>>): this;
  floor(): this;
  fract(): this;
  ceil(): this;
  abs(): this;
  dot(b: IBaseVector<NumLitHigher<LEN>>): number;
  normalize(): this;
  vectorLength(): number;
  vectorLengthSqr(): number;
  vectorDistance(b: IBaseVector<NumLitHigher<LEN>>): number;
  vectorDistanceSqr(b: IBaseVector<NumLitHigher<LEN>>): number;
  multVecMatrix(mat: Matrix4): void;
  interp(b: IBaseVector<NumLitHigher<LEN>>, fac: number): this;
  addFac(b: IBaseVector<NumLitHigher<LEN>>, fac: number): this;
  rot2d(th: number, axis?: number | undefined): this;
  zero(): this;
  negate(): this;
  swapAxes(axis1: number, axis2: number): this;
}

export type VectorLikeOrHigher<LEN extends 2 | 3 | 4, Type = never> = Type | IBaseVector<NumLitHigher<LEN>>;
export type IVectorOrHigher<LEN extends 2 | 3 | 4, Type = never> = VectorLikeOrHigher<LEN, Type>

export type IQuat = IBaseVector<4> & {
  axisAngleToQuat(axis: VectorLikeOrHigher<3>, angle: number): IQuat;
  toMatrix(output?: Matrix4): Matrix4;
};

export interface IVector2 extends IBaseVector<2> {}

export interface IVector3 extends IBaseVector<3> {
  loadXYZ(x: number, y: number, z: number): this;

  cross(b: VectorLikeOrHigher<3>): this;
  load2(b: Vector2): this;
}

export interface IVector4 extends IBaseVector<4> {
  loadXYZ(x: number, y: number, z: number): this;
  loadXYZW(x: number, y: number, z: number, w: number): this;

  load2(b: Vector2): this;
  load3(b: Vector3): this;

  cross(b: VectorLikeOrHigher<4>): this;
}


export declare interface IVectorConstructor<Type, LEN extends 2 | 3 | 4 = 3> {
  new (value?: number[] | Type | VectorLikeOrHigher<LEN>): Type;

  /** |(a - center)| dot |(b - center)| */
  normalizedDot3(
    a: VectorLikeOrHigher<LEN, Type>,
    center: VectorLikeOrHigher<LEN, Type>,
    b: VectorLikeOrHigher<LEN, Type>
  ): number;

  /** |(b - a)| dot |(d - c)| */
  normalizedDot4(
    a: VectorLikeOrHigher<LEN, Type>,
    b: VectorLikeOrHigher<LEN, Type>,
    c: VectorLikeOrHigher<LEN, Type>,
    d: VectorLikeOrHigher<LEN, Type>
  ): number;

  structName?: string;
  STRUCT?: string;
}

const M_SQRT2 = Math.SQRT2
const PI = Math.PI

  `.trim() + "\n";
  for (let i = 2; i <= 4; i++) {
    s += genBase(BaseVector2, "Vector", i);
  }
  s += `
export const Vector2 = createVector2(Array, 'vec2');
export const Vector3 = createVector3(Array, 'vec3');
export const Vector4 = createVector4(Array, 'vec4');
export type Vector2 = InstanceType<typeof Vector2>;
export type Vector3 = InstanceType<typeof Vector3>;
export type Vector4 = InstanceType<typeof Vector4>;

const _quat_vs3_temps = util.cachering.fromConstructor(Vector3, 64);

export class Quat extends Vector4 {
  makeUnitQuat(): this {
    this[0] = 1.0;
    this[1] = this[2] = this[3] = 0.0;
    return this;
  }

  isZero(): boolean {
    return this[0] === 0 && this[1] === 0 && this[2] === 0 && this[3] === 0;
  }

  mulQuat(qt: this) {
    let a = this[0] * qt[0] - this[1] * qt[1] - this[2] * qt[2] - this[3] * qt[3];
    let b = this[0] * qt[1] + this[1] * qt[0] + this[2] * qt[3] - this[3] * qt[2];
    let c = this[0] * qt[2] + this[2] * qt[0] + this[3] * qt[1] - this[1] * qt[3];
    this[3] = this[0] * qt[3] + this[3] * qt[0] + this[1] * qt[2] - this[2] * qt[1];
    this[0] = a;
    this[1] = b;
    this[2] = c;
    return this;
  }

  conjugate(): this {
    this[1] = -this[1];
    this[2] = -this[2];
    this[3] = -this[3];
    return this;
  }

  dotWithQuat(q2: this) {
    return this[0] * q2[0] + this[1] * q2[1] + this[2] * q2[2] + this[3] * q2[3];
  }

  canInvert(): boolean {
    return this.dot(this) !== 0.0
  }

  invert(): this {
    let f = this.dot(this);
    if (f === 0.0) return this;

    this.mulScalar(1.0 / f);
    return this;
  }

  sub(q2: this): this {
    let nq2 = new Quat();

    nq2[0] = -q2[0];
    nq2[1] = q2[1];
    nq2[2] = q2[2];
    nq2[3] = q2[3];

    this.mul(nq2 as this);
    return this
  }

  /** if m is not undefined, will be used as output */
  toMatrix(m?: Matrix4): Matrix4 {
    if (m === undefined) {
      m = new Matrix4();
    }

    let q0 = M_SQRT2 * this[0];
    let q1 = M_SQRT2 * this[1];
    let q2 = M_SQRT2 * this[2];
    let q3 = M_SQRT2 * this[3];
    let qda = q0 * q1;
    let qdb = q0 * q2;
    let qdc = q0 * q3;
    let qaa = q1 * q1;
    let qab = q1 * q2;
    let qac = q1 * q3;
    let qbb = q2 * q2;
    let qbc = q2 * q3;
    let qcc = q3 * q3;
    m.$matrix.m11 = 1.0 - qbb - qcc;
    m.$matrix.m12 = qdc + qab;
    m.$matrix.m13 = -qdb + qac;
    m.$matrix.m14 = 0.0;
    m.$matrix.m21 = -qdc + qab;
    m.$matrix.m22 = 1.0 - qaa - qcc;
    m.$matrix.m23 = qda + qbc;
    m.$matrix.m24 = 0.0;
    m.$matrix.m31 = qdb + qac;
    m.$matrix.m32 = -qda + qbc;
    m.$matrix.m33 = 1.0 - qaa - qbb;
    m.$matrix.m34 = 0.0;
    m.$matrix.m41 = m.$matrix.m42 = m.$matrix.m43 = 0.0;
    m.$matrix.m44 = 1.0;

    return m;
  }

  matrixToQuat(wmat: Matrix4): this {
    let mat = vec_temp_mats.next();
    mat.load(wmat);

    mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
    mat.$matrix.m44 = 1.0;

    let r1 = new Vector3([mat.$matrix.m11, mat.$matrix.m12, mat.$matrix.m13]);
    let r2 = new Vector3([mat.$matrix.m21, mat.$matrix.m22, mat.$matrix.m23]);
    let r3 = new Vector3([mat.$matrix.m31, mat.$matrix.m32, mat.$matrix.m33]);

    r1.normalize();
    r2.normalize();
    r3.normalize();

    mat.$matrix.m11 = r1[0];
    mat.$matrix.m12 = r1[1];
    mat.$matrix.m13 = r1[2];
    mat.$matrix.m21 = r2[0];
    mat.$matrix.m22 = r2[1];
    mat.$matrix.m23 = r2[2];
    mat.$matrix.m31 = r3[0];
    mat.$matrix.m32 = r3[1];
    mat.$matrix.m33 = r3[2];
    let tr = 0.25 * (1.0 + mat.$matrix.m11 + mat.$matrix.m22 + mat.$matrix.m33);
    let s = 0;
    if (tr > FLT_EPSILON) {
      s = Math.sqrt(tr);
      this[0] = s;
      s = 1.0 / (4.0 * s);
      this[1] = (mat.$matrix.m23 - mat.$matrix.m32) * s;
      this[2] = (mat.$matrix.m31 - mat.$matrix.m13) * s;
      this[3] = (mat.$matrix.m12 - mat.$matrix.m21) * s;
    } else {
      if (mat.$matrix.m11 > mat.$matrix.m22 && mat.$matrix.m11 > mat.$matrix.m33) {
        s = 2.0 * Math.sqrt(1.0 + mat.$matrix.m11 - mat.$matrix.m22 - mat.$matrix.m33);
        this[1] = 0.25 * s;
        s = 1.0 / s;
        this[0] = (mat.$matrix.m32 - mat.$matrix.m23) * s;
        this[2] = (mat.$matrix.m21 + mat.$matrix.m12) * s;
        this[3] = (mat.$matrix.m31 + mat.$matrix.m13) * s;
      } else if (mat.$matrix.m22 > mat.$matrix.m33) {
        s = 2.0 * Math.sqrt(1.0 + mat.$matrix.m22 - mat.$matrix.m11 - mat.$matrix.m33);
        this[2] = 0.25 * s;
        s = 1.0 / s;
        this[0] = (mat.$matrix.m31 - mat.$matrix.m13) * s;
        this[1] = (mat.$matrix.m21 + mat.$matrix.m12) * s;
        this[3] = (mat.$matrix.m32 + mat.$matrix.m23) * s;
      } else {
        s = 2.0 * Math.sqrt(1.0 + mat.$matrix.m33 - mat.$matrix.m11 - mat.$matrix.m22);
        this[3] = 0.25 * s;
        s = 1.0 / s;
        this[0] = (mat.$matrix.m21 - mat.$matrix.m12) * s;
        this[1] = (mat.$matrix.m31 + mat.$matrix.m13) * s;
        this[2] = (mat.$matrix.m32 + mat.$matrix.m23) * s;
      }
    }
    this.normalize();
    return this;
  }

  normalize() {
    let len = Math.sqrt(this.dot(this));

    if (len !== 0.0) {
      this.mulScalar(1.0 / len);
    } else {
      this[1] = 1.0;
      this[0] = this[2] = this[3] = 0.0;
    }
    return this;
  }

  axisAngleToQuat(axis: VectorLikeOrHigher<3, Vector3>, angle: number) {
    let nor = _quat_vs3_temps.next().load(axis);
    nor.normalize();

    if (nor.dot(nor) !== 0.0) {
      let phi = angle / 2.0;
      let si = Math.sin(phi);
      this[0] = Math.cos(phi);
      this[1] = nor[0] * si;
      this[2] = nor[1] * si;
      this[3] = nor[2] * si;
    } else {
      this.makeUnitQuat();
    }

    return this;
  }

  rotationBetweenVecs(v1_: VectorLikeOrHigher<3, Vector3>, v2_: VectorLikeOrHigher<3, Vector3>, fac = 1.0) {
    const v1 = new Vector3(v1_);
    const v2 = new Vector3(v2_);
    v1.normalize();
    v2.normalize();

    if (Math.abs(v1.dot(v2)) > 0.9999) {
      this.makeUnitQuat();
      return this;
    }

    let axis = new Vector3(v1);
    axis.cross(v2);

    let angle = v1.preNormalizedAngle(v2) * fac;
    this.axisAngleToQuat(axis, angle);

    return this;
  }

  quatInterp(quat2: this, t: number) {
    let quat = new Quat();
    let cosom = this[0] * quat2[0] + this[1] * quat2[1] + this[2] * quat2[2] + this[3] * quat2[3];
    if (cosom < 0.0) {
      cosom = -cosom;
      quat[0] = -this[0];
      quat[1] = -this[1];
      quat[2] = -this[2];
      quat[3] = -this[3];
    } else {
      quat[0] = this[0];
      quat[1] = this[1];
      quat[2] = this[2];
      quat[3] = this[3];
    }

    let omega, sinom, sc1, sc2;
    if (1.0 - cosom > 0.0001) {
      omega = Math.acos(cosom);
      sinom = Math.sin(omega);
      sc1 = Math.sin((1.0 - t) * omega) / sinom;
      sc2 = Math.sin(t * omega) / sinom;
    } else {
      sc1 = 1.0 - t;
      sc2 = t;
    }
    this[0] = sc1 * quat[0] + sc2 * quat2[0];
    this[1] = sc1 * quat[1] + sc2 * quat2[1];
    this[2] = sc1 * quat[2] + sc2 * quat2[2];
    this[3] = sc1 * quat[3] + sc2 * quat2[3];

    return this;
  }
}

Quat.STRUCT =
  nstructjs.inherit(Quat, Vector4, "quat") +
  \`
}\`;
nstructjs.register(Quat);`;
  s += Matrix4Code;
  s += `vec_temp_mats = util.cachering.fromConstructor(Matrix4, 64);
`;
  console.log(s);
  fs.writeFileSync("vectormath.ts", s);
}
genCode();
export {
  BaseVector2 as BaseVector,
  F32BaseVector,
  F64BaseVector,
  I16BaseVector,
  I32BaseVector,
  I8BaseVector,
  UI16BaseVector,
  UI32BaseVector,
  UI8BaseVector,
  Vector32 as Vector3,
  Vector4,
  makeVector2,
  makeVector3,
  makeVector4
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vbnN0cnVjdGpzX2VzNi50cyIsICIuLi9zdHJ1Y3QudHMiLCAiLi4vZ2VuVmVjdG9ybWF0aC50cyIsICIuLi9pbmRleFJhbmdlLmpzIiwgIi4uL21hdHJpeDRDb2RlLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKiAtLS0tIGNvbG9yIC8gdGVybWluYWwgdXRpbGl0aWVzIC0tLS0gKi9cclxuXHJcbmludGVyZmFjZSBDb2xvck1hcCB7XHJcbiAgW2tleTogc3RyaW5nXTogbnVtYmVyO1xyXG59XHJcblxyXG5sZXQgY29sb3JtYXA6IENvbG9yTWFwID0ge1xyXG4gIFwiYmxhY2tcIiAgIDogMzAsXHJcbiAgXCJyZWRcIiAgICAgOiAzMSxcclxuICBcImdyZWVuXCIgICA6IDMyLFxyXG4gIFwieWVsbG93XCIgIDogMzMsXHJcbiAgXCJibHVlXCIgICAgOiAzNCxcclxuICBcIm1hZ2VudGFcIiA6IDM1LFxyXG4gIFwiY3lhblwiICAgIDogMzYsXHJcbiAgXCJ3aGl0ZVwiICAgOiAzNyxcclxuICBcInJlc2V0XCIgICA6IDAsXHJcbiAgXCJncmV5XCIgICAgOiAyLFxyXG4gIFwib3JhbmdlXCIgIDogMjAyLFxyXG4gIFwicGlua1wiICAgIDogMTk4LFxyXG4gIFwiYnJvd25cIiAgIDogMzE0LFxyXG4gIFwibGlnaHRyZWRcIjogOTEsXHJcbiAgXCJwZWFjaFwiICAgOiAyMTAsXHJcbn07XHJcblxyXG5mdW5jdGlvbiB0YWIobjogbnVtYmVyLCBjaHI6IHN0cmluZyA9IFwiIFwiKTogc3RyaW5nIHtcclxuICBsZXQgdCA9IFwiXCI7XHJcblxyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XHJcbiAgICB0ICs9IGNocjtcclxuICB9XHJcblxyXG4gIHJldHVybiB0O1xyXG59XHJcblxyXG5sZXQgdGVybUNvbG9yTWFwOiBSZWNvcmQ8c3RyaW5nIHwgbnVtYmVyLCBzdHJpbmcgfCBudW1iZXI+ID0ge307XHJcbmZvciAobGV0IGsgaW4gY29sb3JtYXApIHtcclxuICB0ZXJtQ29sb3JNYXBba10gPSBjb2xvcm1hcFtrXTtcclxuICB0ZXJtQ29sb3JNYXBbY29sb3JtYXBba11dID0gaztcclxufVxyXG5cclxuZnVuY3Rpb24gdGVybUNvbG9yKHM6IHN0cmluZyB8IHN5bWJvbCB8IG51bWJlciwgYzogc3RyaW5nIHwgbnVtYmVyKTogc3RyaW5nIHtcclxuICBpZiAodHlwZW9mIHMgPT09IFwic3ltYm9sXCIpIHtcclxuICAgIHMgPSBzLnRvU3RyaW5nKCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHMgPSBcIlwiICsgcztcclxuICB9XHJcblxyXG4gIGlmIChjIGluIGNvbG9ybWFwKSBjID0gY29sb3JtYXBbYyBhcyBzdHJpbmddO1xyXG5cclxuICBpZiAoKGMgYXMgbnVtYmVyKSA+IDEwNykge1xyXG4gICAgbGV0IHMyID0gXCJcXHUwMDFiWzM4OzU7XCIgKyBjICsgXCJtXCI7XHJcbiAgICByZXR1cm4gczIgKyBzICsgXCJcXHUwMDFiWzBtXCI7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gXCJcXHUwMDFiW1wiICsgYyArIFwibVwiICsgcyArIFwiXFx1MDAxYlswbVwiO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0ZXJtUHJpbnQoLi4uYXJnczogdW5rbm93bltdKTogc3RyaW5nIHtcclxuICBsZXQgcyA9IFwiXCI7XHJcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAoaSA+IDApIHtcclxuICAgICAgcyArPSBcIiBcIjtcclxuICAgIH1cclxuICAgIHMgKz0gYXJnc1tpXTtcclxuICB9XHJcblxyXG4gIGxldCByZTFhID0gL1xcdTAwMWJcXFtbMS05XVswLTldP20vO1xyXG4gIGxldCByZTFiID0gL1xcdTAwMWJcXFtbMS05XVswLTldO1swLTldWzAtOV0/O1swLTldK20vO1xyXG4gIGxldCByZTIgPSAvXFx1MDAxYlxcWzBtLztcclxuXHJcbiAgbGV0IGVuZHRhZyA9IFwiXFx1MDAxYlswbVwiO1xyXG5cclxuICBmdW5jdGlvbiB0b2soczogc3RyaW5nLCB0eXBlOiBzdHJpbmcpOiB7IHR5cGU6IHN0cmluZzsgdmFsdWU6IHN0cmluZyB9IHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHR5cGUgOiB0eXBlLFxyXG4gICAgICB2YWx1ZTogcyxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBsZXQgdG9rZGVmX2FycjogW1JlZ0V4cCwgc3RyaW5nXVtdID0gW1xyXG4gICAgW3JlMWEsIFwic3RhcnRcIl0sXHJcbiAgICBbcmUxYiwgXCJzdGFydFwiXSxcclxuICAgIFtyZTIsIFwiZW5kXCJdLFxyXG4gIF07XHJcblxyXG4gIGxldCBzMiA9IHM7XHJcblxyXG4gIGxldCB0b2tlbnM6IHsgdHlwZTogc3RyaW5nOyB2YWx1ZTogc3RyaW5nIH1bXSA9IFtdO1xyXG5cclxuICB3aGlsZSAoczIubGVuZ3RoID4gMCkge1xyXG4gICAgbGV0IG9rID0gZmFsc2U7XHJcblxyXG4gICAgbGV0IG1pbnRrOiBbUmVnRXhwLCBzdHJpbmddIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkLFxyXG4gICAgICBtaW5pOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XHJcbiAgICBsZXQgbWluc2xpY2U6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZCxcclxuICAgICAgbWludHlwZTogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG5cclxuICAgIGZvciAobGV0IHRrIG9mIHRva2RlZl9hcnIpIHtcclxuICAgICAgbGV0IGkgPSBzMi5zZWFyY2godGtbMF0pO1xyXG5cclxuICAgICAgaWYgKGkgPj0gMCAmJiAobWluaSA9PT0gdW5kZWZpbmVkIHx8IGkgPCBtaW5pKSkge1xyXG4gICAgICAgIG1pbnNsaWNlID0gczIuc2xpY2UoaSwgczIubGVuZ3RoKS5tYXRjaCh0a1swXSkhWzBdO1xyXG4gICAgICAgIG1pbmkgPSBpO1xyXG4gICAgICAgIG1pbnR5cGUgPSB0a1sxXTtcclxuICAgICAgICBtaW50ayA9IHRrO1xyXG4gICAgICAgIG9rID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmICghb2spIHtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG1pbmkhID4gMCkge1xyXG4gICAgICBsZXQgY2h1bmsgPSBzMi5zbGljZSgwLCBtaW5pKTtcclxuICAgICAgdG9rZW5zLnB1c2godG9rKGNodW5rLCBcImNodW5rXCIpKTtcclxuICAgIH1cclxuXHJcbiAgICBzMiA9IHMyLnNsaWNlKG1pbmkhICsgbWluc2xpY2UhLmxlbmd0aCwgczIubGVuZ3RoKTtcclxuICAgIGxldCB0ID0gdG9rKG1pbnNsaWNlISwgbWludHlwZSEpO1xyXG5cclxuICAgIHRva2Vucy5wdXNoKHQpO1xyXG4gIH1cclxuXHJcbiAgaWYgKHMyLmxlbmd0aCA+IDApIHtcclxuICAgIHRva2Vucy5wdXNoKHRvayhzMiwgXCJjaHVua1wiKSk7XHJcbiAgfVxyXG5cclxuICBsZXQgc3RhY2s6IChzdHJpbmcgfCB1bmRlZmluZWQpW10gPSBbXTtcclxuICBsZXQgY3VyOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcblxyXG4gIGxldCBvdXQgPSBcIlwiO1xyXG5cclxuICBmb3IgKGxldCB0IG9mIHRva2Vucykge1xyXG4gICAgaWYgKHQudHlwZSA9PT0gXCJjaHVua1wiKSB7XHJcbiAgICAgIG91dCArPSB0LnZhbHVlO1xyXG4gICAgfSBlbHNlIGlmICh0LnR5cGUgPT09IFwic3RhcnRcIikge1xyXG4gICAgICBzdGFjay5wdXNoKGN1cik7XHJcbiAgICAgIGN1ciA9IHQudmFsdWU7XHJcblxyXG4gICAgICBvdXQgKz0gdC52YWx1ZTtcclxuICAgIH0gZWxzZSBpZiAodC50eXBlID09PSBcImVuZFwiKSB7XHJcbiAgICAgIGN1ciA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICBpZiAoY3VyKSB7XHJcbiAgICAgICAgb3V0ICs9IGN1cjtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBvdXQgKz0gZW5kdGFnO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gb3V0O1xyXG59XHJcblxyXG5mdW5jdGlvbiBsaXN0PFQ+KGl0ZXI6IEl0ZXJhYmxlPFQ+KTogVFtdIHtcclxuICBsZXQgcmV0OiBUW10gPSBbXTtcclxuXHJcbiAgZm9yIChsZXQgaXRlbSBvZiBpdGVyKSB7XHJcbiAgICByZXQucHVzaChpdGVtKTtcclxuICB9XHJcblxyXG4gIHJldHVybiByZXQ7XHJcbn1cclxuXHJcbnZhciB1dGlsID0gLyojX19QVVJFX18qLyBPYmplY3QuZnJlZXplKHtcclxuICBfX3Byb3RvX18gICA6IG51bGwsXHJcbiAgdGFiICAgICAgICAgOiB0YWIsXHJcbiAgdGVybUNvbG9yTWFwOiB0ZXJtQ29sb3JNYXAsXHJcbiAgdGVybUNvbG9yICAgOiB0ZXJtQ29sb3IsXHJcbiAgdGVybVByaW50ICAgOiB0ZXJtUHJpbnQsXHJcbiAgbGlzdCAgICAgICAgOiBsaXN0LFxyXG59KTtcclxuXHJcbihcInVzZSBzdHJpY3RcIik7XHJcblxyXG4vKiAtLS0tIHBhcnNldXRpbCAtLS0tICovXHJcblxyXG5mdW5jdGlvbiBwcmludF9saW5lcyhsZDogc3RyaW5nLCBsaW5lbm86IG51bWJlciwgY29sOiBudW1iZXIsIHByaW50Q29sb3JzOiBib29sZWFuLCB0b2tlbkFyZz86IHRva2VuKTogc3RyaW5nIHtcclxuICBsZXQgYnVmID0gXCJcIjtcclxuICBsZXQgbGluZXMgPSBsZC5zcGxpdChcIlxcblwiKTtcclxuICBsZXQgaXN0YXJ0ID0gTWF0aC5tYXgobGluZW5vIC0gNSwgMCk7XHJcbiAgbGV0IGllbmQgPSBNYXRoLm1pbihsaW5lbm8gKyAzLCBsaW5lcy5sZW5ndGgpO1xyXG5cclxuICBsZXQgY29sb3IgPSBwcmludENvbG9ycyA/IChjOiBzdHJpbmcpID0+IGMgOiB0ZXJtQ29sb3I7XHJcblxyXG4gIGZvciAobGV0IGkgPSBpc3RhcnQ7IGkgPCBpZW5kOyBpKyspIHtcclxuICAgIGxldCBsID0gXCJcIiArIChpICsgMSk7XHJcbiAgICB3aGlsZSAobC5sZW5ndGggPCAzKSB7XHJcbiAgICAgIGwgPSBcIiBcIiArIGw7XHJcbiAgICB9XHJcblxyXG4gICAgbCArPSBgOiAke2xpbmVzW2ldfVxcbmA7XHJcblxyXG4gICAgaWYgKGkgPT09IGxpbmVubyAmJiB0b2tlbkFyZyAmJiB0b2tlbkFyZy52YWx1ZS5sZW5ndGggPT09IDEpIHtcclxuICAgICAgbCA9IGwuc2xpY2UoMCwgY29sICsgNSkgKyBjb2xvcihsW2NvbCArIDVdLCBcInllbGxvd1wiKSArIGwuc2xpY2UoY29sICsgNiwgbC5sZW5ndGgpO1xyXG4gICAgfVxyXG4gICAgYnVmICs9IGw7XHJcbiAgICBpZiAoaSA9PT0gbGluZW5vKSB7XHJcbiAgICAgIGxldCBjb2xzdHIgPSBcIiAgICAgXCI7XHJcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgY29sOyBqKyspIHtcclxuICAgICAgICBjb2xzdHIgKz0gXCIgXCI7XHJcbiAgICAgIH1cclxuICAgICAgY29sc3RyICs9IGNvbG9yKFwiXlwiLCBcInJlZFwiKTtcclxuXHJcbiAgICAgIGJ1ZiArPSBjb2xzdHIgKyBcIlxcblwiO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYnVmID0gXCItLS0tLS0tLS0tLS0tLS0tLS1cXG5cIiArIGJ1ZiArIFwiXFxuPT09PT09PT09PT09PT09PT09XFxuXCI7XHJcbiAgcmV0dXJuIGJ1ZjtcclxufVxyXG5cclxuY2xhc3MgdG9rZW4ge1xyXG4gIHR5cGU6IHN0cmluZztcclxuICB2YWx1ZTogc3RyaW5nO1xyXG4gIGxleHBvczogbnVtYmVyO1xyXG4gIGxpbmVubzogbnVtYmVyO1xyXG4gIGNvbDogbnVtYmVyO1xyXG4gIGxleGVyOiBsZXhlcjtcclxuICBwYXJzZXI6IHBhcnNlciB8IHVuZGVmaW5lZDtcclxuXHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICB0eXBlOiBzdHJpbmcsXHJcbiAgICB2YWw6IHN0cmluZyxcclxuICAgIGxleHBvczogbnVtYmVyLFxyXG4gICAgbGluZW5vOiBudW1iZXIsXHJcbiAgICBsZXg6IGxleGVyLFxyXG4gICAgcHJzOiBwYXJzZXIgfCB1bmRlZmluZWQsXHJcbiAgICBjb2w6IG51bWJlclxyXG4gICkge1xyXG4gICAgdGhpcy50eXBlID0gdHlwZTtcclxuICAgIHRoaXMudmFsdWUgPSB2YWw7XHJcbiAgICB0aGlzLmxleHBvcyA9IGxleHBvcztcclxuICAgIHRoaXMubGluZW5vID0gbGluZW5vO1xyXG4gICAgdGhpcy5jb2wgPSBjb2w7XHJcbiAgICB0aGlzLmxleGVyID0gbGV4O1xyXG4gICAgdGhpcy5wYXJzZXIgPSBwcnM7XHJcbiAgfVxyXG5cclxuICB0b1N0cmluZygpOiBzdHJpbmcge1xyXG4gICAgaWYgKHRoaXMudmFsdWUgIT09IHVuZGVmaW5lZCkgcmV0dXJuIFwidG9rZW4odHlwZT1cIiArIHRoaXMudHlwZSArIFwiLCB2YWx1ZT0nXCIgKyB0aGlzLnZhbHVlICsgXCInKVwiO1xyXG4gICAgZWxzZSByZXR1cm4gXCJ0b2tlbih0eXBlPVwiICsgdGhpcy50eXBlICsgXCIpXCI7XHJcbiAgfVxyXG59XHJcblxyXG50eXBlIFRva0Z1bmMgPSAodDogdG9rZW4pID0+IHRva2VuIHwgdW5kZWZpbmVkO1xyXG5cclxuY2xhc3MgdG9rZGVmIHtcclxuICBuYW1lOiBzdHJpbmc7XHJcbiAgcmU6IFJlZ0V4cCB8IHVuZGVmaW5lZDtcclxuICBmdW5jOiBUb2tGdW5jIHwgdW5kZWZpbmVkO1xyXG4gIGV4YW1wbGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcclxuXHJcbiAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCByZWdleHByPzogUmVnRXhwLCBmdW5jPzogVG9rRnVuYywgZXhhbXBsZT86IHN0cmluZykge1xyXG4gICAgdGhpcy5uYW1lID0gbmFtZTtcclxuICAgIHRoaXMucmUgPSByZWdleHByO1xyXG4gICAgdGhpcy5mdW5jID0gZnVuYztcclxuICAgIHRoaXMuZXhhbXBsZSA9IGV4YW1wbGU7XHJcblxyXG4gICAgaWYgKGV4YW1wbGUgPT09IHVuZGVmaW5lZCAmJiByZWdleHByKSB7XHJcbiAgICAgIGxldCBzID0gXCJcIiArIHJlZ2V4cHI7XHJcbiAgICAgIGlmIChzLnN0YXJ0c1dpdGgoXCIvXCIpICYmIHMuZW5kc1dpdGgoXCIvXCIpKSB7XHJcbiAgICAgICAgcyA9IHMuc2xpY2UoMSwgcy5sZW5ndGggLSAxKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHMuc3RhcnRzV2l0aChcIlxcXFxcIikpIHtcclxuICAgICAgICBzID0gcy5zbGljZSgxLCBzLmxlbmd0aCk7XHJcbiAgICAgIH1cclxuICAgICAgcyA9IHMudHJpbSgpO1xyXG5cclxuICAgICAgaWYgKHMubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgdGhpcy5leGFtcGxlID0gcztcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuY2xhc3MgUFVUSUxfUGFyc2VFcnJvciBleHRlbmRzIEVycm9yIHtcclxuICBjb25zdHJ1Y3Rvcihtc2c6IHN0cmluZykge1xyXG4gICAgc3VwZXIobXNnKTtcclxuICB9XHJcbn1cclxuXHJcbnR5cGUgTGV4ZXJFcnJGdW5jID0gKGxleDogbGV4ZXIpID0+IGJvb2xlYW47XHJcblxyXG5jbGFzcyBsZXhlciB7XHJcbiAgdG9rZGVmOiB0b2tkZWZbXTtcclxuICB0b2tlbnM6IHRva2VuW107XHJcbiAgbGV4cG9zOiBudW1iZXI7XHJcbiAgbGV4ZGF0YTogc3RyaW5nO1xyXG4gIGNvbG1hcDogbnVtYmVyW10gfCB1bmRlZmluZWQ7XHJcbiAgbGluZW5vOiBudW1iZXI7XHJcbiAgcHJpbnRUb2tlbnM6IGJvb2xlYW47XHJcbiAgbGluZXN0YXJ0OiBudW1iZXI7XHJcbiAgZXJyZnVuYzogTGV4ZXJFcnJGdW5jIHwgdW5kZWZpbmVkO1xyXG4gIGxpbmVtYXA6IG51bWJlcltdIHwgdW5kZWZpbmVkO1xyXG4gIHRva2ludHM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj47XHJcbiAgc3RhdGVzdGFjazogW3N0cmluZywgdW5rbm93bl1bXTtcclxuICBzdGF0ZXM6IFJlY29yZDxzdHJpbmcsIFt0b2tkZWZbXSwgTGV4ZXJFcnJGdW5jIHwgdW5kZWZpbmVkXT47XHJcbiAgc3RhdGVkYXRhOiB1bmtub3duO1xyXG4gIHBlZWtlZF90b2tlbnM6IHRva2VuW107XHJcbiAgbG9nZ2VyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkO1xyXG5cclxuICBjb25zdHJ1Y3Rvcih0b2tkZWZfYXJyOiB0b2tkZWZbXSwgZXJyZnVuYz86IExleGVyRXJyRnVuYykge1xyXG4gICAgdGhpcy50b2tkZWYgPSB0b2tkZWZfYXJyO1xyXG4gICAgdGhpcy50b2tlbnMgPSBuZXcgQXJyYXkoKTtcclxuICAgIHRoaXMubGV4cG9zID0gMDtcclxuICAgIHRoaXMubGV4ZGF0YSA9IFwiXCI7XHJcbiAgICB0aGlzLmNvbG1hcCA9IHVuZGVmaW5lZDtcclxuICAgIHRoaXMubGluZW5vID0gMDtcclxuICAgIHRoaXMucHJpbnRUb2tlbnMgPSBmYWxzZTtcclxuICAgIHRoaXMubGluZXN0YXJ0ID0gMDtcclxuICAgIHRoaXMuZXJyZnVuYyA9IGVycmZ1bmM7XHJcbiAgICB0aGlzLmxpbmVtYXAgPSB1bmRlZmluZWQ7XHJcbiAgICB0aGlzLnRva2ludHMgPSB7fTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZGVmX2Fyci5sZW5ndGg7IGkrKykge1xyXG4gICAgICB0aGlzLnRva2ludHNbdG9rZGVmX2FycltpXS5uYW1lXSA9IGk7XHJcbiAgICB9XHJcbiAgICB0aGlzLnN0YXRlc3RhY2sgPSBbW1wiX19tYWluX19cIiwgMF1dO1xyXG4gICAgdGhpcy5zdGF0ZXMgPSB7IFwiX19tYWluX19cIjogW3Rva2RlZl9hcnIsIGVycmZ1bmNdIH07XHJcbiAgICB0aGlzLnN0YXRlZGF0YSA9IDA7XHJcbiAgICB0aGlzLnBlZWtlZF90b2tlbnMgPSBbXTtcclxuXHJcbiAgICB0aGlzLmxvZ2dlciA9IGZ1bmN0aW9uICguLi5hcmdzOiB1bmtub3duW10pIHtcclxuICAgICAgY29uc29sZS5sb2coLi4uYXJncyk7XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgYWRkX3N0YXRlKG5hbWU6IHN0cmluZywgdG9rZGVmX2FycjogdG9rZGVmW10sIGVycmZ1bmM/OiBMZXhlckVyckZ1bmMpOiB2b2lkIHtcclxuICAgIGlmIChlcnJmdW5jID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgZXJyZnVuYyA9IGZ1bmN0aW9uIChfbGV4ZXI6IGxleGVyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgICB0aGlzLnN0YXRlc1tuYW1lXSA9IFt0b2tkZWZfYXJyLCBlcnJmdW5jXTtcclxuICB9XHJcblxyXG4gIHRva19pbnQoX25hbWU6IHN0cmluZyk6IHZvaWQge31cclxuXHJcbiAgcHVzaF9zdGF0ZShzdGF0ZTogc3RyaW5nLCBzdGF0ZWRhdGE6IHVua25vd24pOiB2b2lkIHtcclxuICAgIHRoaXMuc3RhdGVzdGFjay5wdXNoKFtzdGF0ZSwgc3RhdGVkYXRhXSk7XHJcbiAgICBsZXQgc3QgPSB0aGlzLnN0YXRlc1tzdGF0ZV07XHJcbiAgICB0aGlzLnN0YXRlZGF0YSA9IHN0YXRlZGF0YTtcclxuICAgIHRoaXMudG9rZGVmID0gc3RbMF07XHJcbiAgICB0aGlzLmVycmZ1bmMgPSBzdFsxXTtcclxuICB9XHJcblxyXG4gIHBvcF9zdGF0ZSgpOiB2b2lkIHtcclxuICAgIGxldCBpdGVtID0gdGhpcy5zdGF0ZXN0YWNrW3RoaXMuc3RhdGVzdGFjay5sZW5ndGggLSAxXTtcclxuICAgIGxldCBzdGF0ZSA9IHRoaXMuc3RhdGVzW2l0ZW1bMF1dO1xyXG4gICAgdGhpcy50b2tkZWYgPSBzdGF0ZVswXTtcclxuICAgIHRoaXMuZXJyZnVuYyA9IHN0YXRlWzFdO1xyXG4gICAgdGhpcy5zdGF0ZWRhdGEgPSBpdGVtWzFdO1xyXG4gIH1cclxuXHJcbiAgaW5wdXQoc3RyOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIGxldCBsaW5lbWFwOiBudW1iZXJbXSA9ICh0aGlzLmxpbmVtYXAgPSBuZXcgQXJyYXk8bnVtYmVyPihzdHIubGVuZ3RoKSk7XHJcbiAgICBsZXQgbGluZW5vID0gMDtcclxuICAgIGxldCBjb2wgPSAwO1xyXG4gICAgbGV0IGNvbG1hcDogbnVtYmVyW10gPSAodGhpcy5jb2xtYXAgPSBuZXcgQXJyYXk8bnVtYmVyPihzdHIubGVuZ3RoKSk7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyssIGNvbCsrKSB7XHJcbiAgICAgIGxldCBjID0gc3RyW2ldO1xyXG5cclxuICAgICAgbGluZW1hcFtpXSA9IGxpbmVubztcclxuICAgICAgY29sbWFwW2ldID0gY29sO1xyXG5cclxuICAgICAgaWYgKGMgPT09IFwiXFxuXCIpIHtcclxuICAgICAgICBsaW5lbm8rKztcclxuICAgICAgICBjb2wgPSAwO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgd2hpbGUgKHRoaXMuc3RhdGVzdGFjay5sZW5ndGggPiAxKSB7XHJcbiAgICAgIHRoaXMucG9wX3N0YXRlKCk7XHJcbiAgICB9XHJcbiAgICB0aGlzLmxleGRhdGEgPSBzdHI7XHJcbiAgICB0aGlzLmxleHBvcyA9IDA7XHJcbiAgICB0aGlzLmxpbmVubyA9IDA7XHJcbiAgICB0aGlzLnRva2VucyA9IG5ldyBBcnJheSgpO1xyXG4gICAgdGhpcy5wZWVrZWRfdG9rZW5zID0gW107XHJcbiAgfVxyXG5cclxuICBlcnJvcigpOiB2b2lkIHtcclxuICAgIGlmICh0aGlzLmVycmZ1bmMgIT09IHVuZGVmaW5lZCAmJiAhdGhpcy5lcnJmdW5jKHRoaXMpKSByZXR1cm47XHJcblxyXG4gICAgbGV0IHNhZmVwb3MgPSBNYXRoLm1pbih0aGlzLmxleHBvcywgdGhpcy5sZXhkYXRhLmxlbmd0aCAtIDEpO1xyXG4gICAgbGV0IGxpbmUgPSB0aGlzLmxpbmVtYXAhW3NhZmVwb3NdO1xyXG4gICAgbGV0IGNvbCA9IHRoaXMuY29sbWFwIVtzYWZlcG9zXTtcclxuXHJcbiAgICBsZXQgcyA9IHByaW50X2xpbmVzKHRoaXMubGV4ZGF0YSwgbGluZSwgY29sLCB0cnVlKTtcclxuXHJcbiAgICB0aGlzLmxvZ2dlcihcIiAgXCIgKyBzKTtcclxuICAgIHRoaXMubG9nZ2VyKFwiU3ludGF4IGVycm9yIG5lYXIgbGluZSBcIiArICh0aGlzLmxpbmVubyArIDEpKTtcclxuXHJcbiAgICBsZXQgbmV4dCA9IE1hdGgubWluKHRoaXMubGV4cG9zICsgOCwgdGhpcy5sZXhkYXRhLmxlbmd0aCk7XHJcblxyXG4gICAgdGhyb3cgbmV3IFBVVElMX1BhcnNlRXJyb3IoXCJQYXJzZSBlcnJvclwiKTtcclxuICB9XHJcblxyXG4gIHBlZWsoKTogdG9rZW4gfCB1bmRlZmluZWQge1xyXG4gICAgbGV0IHRvayA9IHRoaXMubmV4dCh0cnVlKTtcclxuICAgIGlmICh0b2sgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIHRoaXMucGVla2VkX3Rva2Vucy5wdXNoKHRvayk7XHJcbiAgICByZXR1cm4gdG9rO1xyXG4gIH1cclxuXHJcbiAgcGVla25leHQoKTogdG9rZW4gfCB1bmRlZmluZWQge1xyXG4gICAgaWYgKHRoaXMucGVla2VkX3Rva2Vucy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIHJldHVybiB0aGlzLnBlZWtlZF90b2tlbnNbMF07XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRoaXMucGVlaygpO1xyXG4gIH1cclxuXHJcbiAgYXRfZW5kKCk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHRoaXMubGV4cG9zID49IHRoaXMubGV4ZGF0YS5sZW5ndGggJiYgdGhpcy5wZWVrZWRfdG9rZW5zLmxlbmd0aCA9PT0gMDtcclxuICB9XHJcblxyXG4gIC8vaWdub3JlX3BlZWsgaXMgb3B0aW9uYWwsIGZhbHNlXHJcbiAgbmV4dChpZ25vcmVfcGVlaz86IGJvb2xlYW4pOiB0b2tlbiB8IHVuZGVmaW5lZCB7XHJcbiAgICBpZiAoIWlnbm9yZV9wZWVrICYmIHRoaXMucGVla2VkX3Rva2Vucy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGxldCB0b2sgPSB0aGlzLnBlZWtlZF90b2tlbnNbMF07XHJcbiAgICAgIHRoaXMucGVla2VkX3Rva2Vucy5zaGlmdCgpO1xyXG5cclxuICAgICAgaWYgKCFpZ25vcmVfcGVlayAmJiB0aGlzLnByaW50VG9rZW5zKSB7XHJcbiAgICAgICAgdGhpcy5sb2dnZXIoXCJcIiArIHRvayk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB0b2s7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMubGV4cG9zID49IHRoaXMubGV4ZGF0YS5sZW5ndGgpIHJldHVybiB1bmRlZmluZWQ7XHJcblxyXG4gICAgbGV0IHRzID0gdGhpcy50b2tkZWY7XHJcbiAgICBsZXQgdGxlbiA9IHRzLmxlbmd0aDtcclxuICAgIGxldCBsZXhkYXRhID0gdGhpcy5sZXhkYXRhLnNsaWNlKHRoaXMubGV4cG9zLCB0aGlzLmxleGRhdGEubGVuZ3RoKTtcclxuICAgIGxldCByZXN1bHRzOiBbdG9rZGVmLCBSZWdFeHBFeGVjQXJyYXldW10gPSBbXTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRsZW47IGkrKykge1xyXG4gICAgICBsZXQgdCA9IHRzW2ldO1xyXG4gICAgICBpZiAodC5yZSA9PT0gdW5kZWZpbmVkKSBjb250aW51ZTtcclxuICAgICAgbGV0IHJlcyA9IHQucmUuZXhlYyhsZXhkYXRhKTtcclxuICAgICAgaWYgKHJlcyAhPT0gbnVsbCAmJiByZXMgIT09IHVuZGVmaW5lZCAmJiByZXMuaW5kZXggPT09IDApIHtcclxuICAgICAgICByZXN1bHRzLnB1c2goW3QsIHJlc10pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IG1heF9yZXMgPSAwO1xyXG4gICAgbGV0IHRoZXJlczogW3Rva2RlZiwgUmVnRXhwRXhlY0FycmF5XSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVzdWx0cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBsZXQgcmVzID0gcmVzdWx0c1tpXTtcclxuICAgICAgaWYgKHJlc1sxXVswXS5sZW5ndGggPiBtYXhfcmVzKSB7XHJcbiAgICAgICAgdGhlcmVzID0gcmVzO1xyXG4gICAgICAgIG1heF9yZXMgPSByZXNbMV1bMF0ubGVuZ3RoO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoZXJlcyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHRoaXMuZXJyb3IoKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBkZWYgPSB0aGVyZXNbMF07XHJcbiAgICBsZXQgY29sID0gdGhpcy5jb2xtYXAhW01hdGgubWluKHRoaXMubGV4cG9zLCB0aGlzLmxleGRhdGEubGVuZ3RoIC0gMSldO1xyXG5cclxuICAgIGlmICh0aGlzLmxleHBvcyA8IHRoaXMubGV4ZGF0YS5sZW5ndGgpIHtcclxuICAgICAgdGhpcy5saW5lbm8gPSB0aGlzLmxpbmVtYXAhW3RoaXMubGV4cG9zXTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgdG9rID0gbmV3IHRva2VuKGRlZi5uYW1lLCB0aGVyZXNbMV1bMF0sIHRoaXMubGV4cG9zLCB0aGlzLmxpbmVubywgdGhpcywgdW5kZWZpbmVkLCBjb2wpO1xyXG4gICAgdGhpcy5sZXhwb3MgKz0gdG9rLnZhbHVlLmxlbmd0aDtcclxuXHJcbiAgICBpZiAoZGVmLmZ1bmMpIHtcclxuICAgICAgbGV0IHJlc3VsdCA9IGRlZi5mdW5jKHRvayk7XHJcbiAgICAgIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm5leHQoKTtcclxuICAgICAgfVxyXG4gICAgICB0b2sgPSByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFpZ25vcmVfcGVlayAmJiB0aGlzLnByaW50VG9rZW5zKSB7XHJcbiAgICAgIHRoaXMubG9nZ2VyKFwiXCIgKyB0b2spO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRvaztcclxuICB9XHJcbn1cclxuXHJcbnR5cGUgUGFyc2VyRXJyRnVuYyA9ICh0b2s6IHRva2VuIHwgdW5kZWZpbmVkKSA9PiBib29sZWFuO1xyXG5cclxuY2xhc3MgcGFyc2VyIHtcclxuICBsZXhlcjogbGV4ZXI7XHJcbiAgZXJyZnVuYzogUGFyc2VyRXJyRnVuYyB8IHVuZGVmaW5lZDtcclxuICBzdGFydDogKChwOiBwYXJzZXIpID0+IHVua25vd24pIHwgdW5kZWZpbmVkO1xyXG4gIGxvZ2dlcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZDtcclxuXHJcbiAgY29uc3RydWN0b3IobGV4OiBsZXhlciwgZXJyZnVuYz86IFBhcnNlckVyckZ1bmMpIHtcclxuICAgIHRoaXMubGV4ZXIgPSBsZXg7XHJcbiAgICB0aGlzLmVycmZ1bmMgPSBlcnJmdW5jO1xyXG4gICAgdGhpcy5zdGFydCA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICB0aGlzLmxvZ2dlciA9IGZ1bmN0aW9uICguLi5hcmdzOiB1bmtub3duW10pIHtcclxuICAgICAgY29uc29sZS5sb2coLi4uYXJncyk7XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcGFyc2UoZGF0YT86IHN0cmluZywgZXJyX29uX3VuY29uc3VtZWQ/OiBib29sZWFuKTogdW5rbm93biB7XHJcbiAgICBpZiAoZXJyX29uX3VuY29uc3VtZWQgPT09IHVuZGVmaW5lZCkgZXJyX29uX3VuY29uc3VtZWQgPSB0cnVlO1xyXG5cclxuICAgIGlmIChkYXRhICE9PSB1bmRlZmluZWQpIHRoaXMubGV4ZXIuaW5wdXQoZGF0YSk7XHJcblxyXG4gICAgbGV0IHJldCA9IHRoaXMuc3RhcnQhKHRoaXMpO1xyXG5cclxuICAgIGlmIChlcnJfb25fdW5jb25zdW1lZCAmJiAhdGhpcy5sZXhlci5hdF9lbmQoKSAmJiB0aGlzLmxleGVyLm5leHQoKSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHRoaXMuZXJyb3IodW5kZWZpbmVkLCBcInBhcnNlciBkaWQgbm90IGNvbnN1bWUgZW50aXJlIGlucHV0XCIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJldDtcclxuICB9XHJcblxyXG4gIGlucHV0KGRhdGE6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgdGhpcy5sZXhlci5pbnB1dChkYXRhKTtcclxuICB9XHJcblxyXG4gIGVycm9yKHRva2VuQXJnOiB0b2tlbiB8IHVuZGVmaW5lZCwgbXNnPzogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBsZXQgZXN0cjogc3RyaW5nO1xyXG5cclxuICAgIGlmIChtc2cgPT09IHVuZGVmaW5lZCkgbXNnID0gXCJcIjtcclxuICAgIGlmICh0b2tlbkFyZyA9PT0gdW5kZWZpbmVkKSBlc3RyID0gXCJQYXJzZSBlcnJvciBhdCBlbmQgb2YgaW5wdXQ6IFwiICsgbXNnO1xyXG4gICAgZWxzZSBlc3RyID0gYFBhcnNlIGVycm9yIGF0IGxpbmUgJHt0b2tlbkFyZy5saW5lbm8gKyAxfToke3Rva2VuQXJnLmNvbCArIDF9OiAke21zZ31gO1xyXG5cclxuICAgIGxldCBsZCA9IHRoaXMubGV4ZXIubGV4ZGF0YTtcclxuICAgIGxldCBsaW5lbm8gPSB0b2tlbkFyZyA/IHRva2VuQXJnLmxpbmVubyA6IHRoaXMubGV4ZXIubGluZW1hcCFbdGhpcy5sZXhlci5saW5lbWFwIS5sZW5ndGggLSAxXTtcclxuICAgIGxldCBjb2wgPSB0b2tlbkFyZyA/IHRva2VuQXJnLmNvbCA6IDA7XHJcblxyXG4gICAgbGQgPSBsZC5yZXBsYWNlKC9cXHIvZywgXCJcIik7XHJcblxyXG4gICAgdGhpcy5sb2dnZXIocHJpbnRfbGluZXMobGQsIGxpbmVubywgY29sLCB0cnVlLCB0b2tlbkFyZykpO1xyXG4gICAgdGhpcy5sb2dnZXIoZXN0cik7XHJcblxyXG4gICAgaWYgKHRoaXMuZXJyZnVuYyAmJiAhdGhpcy5lcnJmdW5jKHRva2VuQXJnKSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aHJvdyBuZXcgUFVUSUxfUGFyc2VFcnJvcihlc3RyKTtcclxuICB9XHJcblxyXG4gIHBlZWsoKTogdG9rZW4gfCB1bmRlZmluZWQge1xyXG4gICAgbGV0IHRvayA9IHRoaXMubGV4ZXIucGVlaygpO1xyXG4gICAgaWYgKHRvayAhPT0gdW5kZWZpbmVkKSB0b2sucGFyc2VyID0gdGhpcztcclxuICAgIHJldHVybiB0b2s7XHJcbiAgfVxyXG5cclxuICBwZWVrbmV4dCgpOiB0b2tlbiB8IHVuZGVmaW5lZCB7XHJcbiAgICBsZXQgdG9rID0gdGhpcy5sZXhlci5wZWVrbmV4dCgpO1xyXG4gICAgaWYgKHRvayAhPT0gdW5kZWZpbmVkKSB0b2sucGFyc2VyID0gdGhpcztcclxuICAgIHJldHVybiB0b2s7XHJcbiAgfVxyXG5cclxuICBuZXh0KCk6IHRva2VuIHwgdW5kZWZpbmVkIHtcclxuICAgIGxldCB0b2sgPSB0aGlzLmxleGVyLm5leHQoKTtcclxuXHJcbiAgICBpZiAodG9rICE9PSB1bmRlZmluZWQpIHRvay5wYXJzZXIgPSB0aGlzO1xyXG4gICAgcmV0dXJuIHRvaztcclxuICB9XHJcblxyXG4gIG9wdGlvbmFsKHR5cGU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgbGV0IHRvayA9IHRoaXMucGVla25leHQoKTtcclxuICAgIGlmICh0b2sgPT09IHVuZGVmaW5lZCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgaWYgKHRvay50eXBlID09PSB0eXBlKSB7XHJcbiAgICAgIHRoaXMubmV4dCgpO1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIGF0X2VuZCgpOiBib29sZWFuIHtcclxuICAgIHJldHVybiB0aGlzLmxleGVyLmF0X2VuZCgpO1xyXG4gIH1cclxuXHJcbiAgZXhwZWN0KHR5cGU6IHN0cmluZywgbXNnPzogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIGxldCB0b2sgPSB0aGlzLm5leHQoKTtcclxuXHJcbiAgICBpZiAobXNnID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgbXNnID0gdHlwZTtcclxuXHJcbiAgICAgIGZvciAobGV0IHRrIG9mIHRoaXMubGV4ZXIudG9rZGVmKSB7XHJcbiAgICAgICAgaWYgKHRrLm5hbWUgPT09IHR5cGUgJiYgdGsuZXhhbXBsZSkge1xyXG4gICAgICAgICAgbXNnID0gdGsuZXhhbXBsZTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAodG9rID09PSB1bmRlZmluZWQgfHwgdG9rLnR5cGUgIT09IHR5cGUpIHtcclxuICAgICAgdGhpcy5lcnJvcih0b2ssIFwiRXhwZWN0ZWQgXCIgKyBtc2cpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRvayEudmFsdWU7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB0ZXN0X3BhcnNlcigpOiB2b2lkIHtcclxuICBsZXQgYmFzaWNfdHlwZXMgPSBuZXcgU2V0KFtcImludFwiLCBcImZsb2F0XCIsIFwiZG91YmxlXCIsIFwidmVjMlwiLCBcInZlYzNcIiwgXCJ2ZWM0XCIsIFwibWF0NFwiLCBcInN0cmluZ1wiXSk7XHJcbiAgbGV0IHJlc2VydmVkX3Rva2VucyA9IG5ldyBTZXQoW1xyXG4gICAgXCJpbnRcIixcclxuICAgIFwiZmxvYXRcIixcclxuICAgIFwiZG91YmxlXCIsXHJcbiAgICBcInZlYzJcIixcclxuICAgIFwidmVjM1wiLFxyXG4gICAgXCJ2ZWM0XCIsXHJcbiAgICBcIm1hdDRcIixcclxuICAgIFwic3RyaW5nXCIsXHJcbiAgICBcInN0YXRpY19zdHJpbmdcIixcclxuICAgIFwiYXJyYXlcIixcclxuICBdKTtcclxuXHJcbiAgZnVuY3Rpb24gdGsobmFtZTogc3RyaW5nLCByZT86IFJlZ0V4cCwgZnVuYz86IFRva0Z1bmMpOiB0b2tkZWYge1xyXG4gICAgcmV0dXJuIG5ldyB0b2tkZWYobmFtZSwgcmUsIGZ1bmMpO1xyXG4gIH1cclxuXHJcbiAgbGV0IHRva2VucyA9IFtcclxuICAgIHRrKFwiSURcIiwgL1thLXpBLVpdK1thLXpBLVowLTlfXSovLCBmdW5jdGlvbiAodCkge1xyXG4gICAgICBpZiAocmVzZXJ2ZWRfdG9rZW5zLmhhcyh0LnZhbHVlKSkge1xyXG4gICAgICAgIHQudHlwZSA9IHQudmFsdWUudG9VcHBlckNhc2UoKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdDtcclxuICAgIH0pLFxyXG4gICAgdGsoXCJPUEVOXCIsIC9cXHsvKSxcclxuICAgIHRrKFwiQ0xPU0VcIiwgL30vKSxcclxuICAgIHRrKFwiQ09MT05cIiwgLzovKSxcclxuICAgIHRrKFwiSlNDUklQVFwiLCAvXFx8LywgZnVuY3Rpb24gKHQpIHtcclxuICAgICAgbGV0IGpzID0gXCJcIjtcclxuICAgICAgbGV0IGxleCA9IHQubGV4ZXI7XHJcbiAgICAgIHdoaWxlIChsZXgubGV4cG9zIDwgbGV4LmxleGRhdGEubGVuZ3RoKSB7XHJcbiAgICAgICAgbGV0IGMgPSBsZXgubGV4ZGF0YVtsZXgubGV4cG9zXTtcclxuICAgICAgICBpZiAoYyA9PT0gXCJcXG5cIikgYnJlYWs7XHJcbiAgICAgICAganMgKz0gYztcclxuICAgICAgICBsZXgubGV4cG9zKys7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGpzLmVuZHNXaXRoKFwiO1wiKSkge1xyXG4gICAgICAgIGpzID0ganMuc2xpY2UoMCwganMubGVuZ3RoIC0gMSk7XHJcbiAgICAgICAgbGV4LmxleHBvcy0tO1xyXG4gICAgICB9XHJcbiAgICAgIHQudmFsdWUgPSBqcztcclxuICAgICAgcmV0dXJuIHQ7XHJcbiAgICB9KSxcclxuICAgIHRrKFwiTFBBUkFNXCIsIC9cXCgvKSxcclxuICAgIHRrKFwiUlBBUkFNXCIsIC9cXCkvKSxcclxuICAgIHRrKFwiQ09NTUFcIiwgLywvKSxcclxuICAgIHRrKFwiTlVNXCIsIC9bMC05XS8pLFxyXG4gICAgdGsoXCJTRU1JXCIsIC87LyksXHJcbiAgICB0ayhcIk5FV0xJTkVcIiwgL1xcbi8sIGZ1bmN0aW9uICh0KSB7XHJcbiAgICAgIHQubGV4ZXIubGluZW5vICs9IDE7XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9KSxcclxuICAgIHRrKFwiU1BBQ0VcIiwgLyB8XFx0LywgZnVuY3Rpb24gKF90KSB7XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9KSxcclxuICBdO1xyXG5cclxuICBmb3IgKGxldCBydCBvZiByZXNlcnZlZF90b2tlbnMpIHtcclxuICAgIHRva2Vucy5wdXNoKHRrKHJ0LnRvVXBwZXJDYXNlKCkpKTtcclxuICB9XHJcblxyXG4gIGxldCBhID0gYFxyXG4gIExvb3Age1xyXG4gICAgZWlkIDogaW50O1xyXG4gICAgZmxhZyA6IGludDtcclxuICAgIGluZGV4IDogaW50O1xyXG4gICAgdHlwZSA6IGludDtcclxuXHJcbiAgICBjbyA6IHZlYzM7XHJcbiAgICBubyA6IHZlYzM7XHJcbiAgICBsb29wIDogaW50IHwgZWlkKGxvb3ApO1xyXG4gICAgZWRnZXMgOiBhcnJheShlLCBpbnQpIHwgZS5laWQ7XHJcblxyXG4gICAgbG9vcHMgOiwgYXJyYXkoTG9vcCk7XHJcbiAgfVxyXG4gIGA7XHJcblxyXG4gIGZ1bmN0aW9uIGVycmZ1bmMoX2xleDogbGV4ZXIpOiBib29sZWFuIHtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuXHJcbiAgbGV0IGxleCA9IG5ldyBsZXhlcih0b2tlbnMsIGVycmZ1bmMpO1xyXG4gIGNvbnNvbGUubG9nKFwiVGVzdGluZyBsZXhpY2FsIHNjYW5uZXIuLi5cIik7XHJcbiAgbGV4LmlucHV0KGEpO1xyXG4gIGxldCB0OiB0b2tlbiB8IHVuZGVmaW5lZDtcclxuICB3aGlsZSAoKHQgPSBsZXgubmV4dCgpKSkge1xyXG4gICAgY29uc29sZS5sb2codC50b1N0cmluZygpKTtcclxuICB9XHJcbiAgbGV0IHBhcnNlID0gbmV3IHBhcnNlcihsZXgpO1xyXG4gIHBhcnNlLmlucHV0KGEpO1xyXG5cclxuICBpbnRlcmZhY2UgUGFyc2VkVHlwZSB7XHJcbiAgICB0eXBlOiBzdHJpbmc7XHJcbiAgICBkYXRhPzogdW5rbm93bjtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHBfQXJyYXkocDogcGFyc2VyKTogUGFyc2VkVHlwZSB7XHJcbiAgICBwLmV4cGVjdChcIkFSUkFZXCIpO1xyXG4gICAgcC5leHBlY3QoXCJMUEFSQU1cIik7XHJcbiAgICBsZXQgYXJyYXl0eXBlID0gcF9UeXBlKHApO1xyXG4gICAgbGV0IGl0ZXJuYW1lID0gXCJcIjtcclxuICAgIGlmIChwLm9wdGlvbmFsKFwiQ09NTUFcIikpIHtcclxuICAgICAgaXRlcm5hbWUgPSAoYXJyYXl0eXBlIGFzIHsgdHlwZTogc3RyaW5nOyBkYXRhPzogc3RyaW5nIH0pLmRhdGEgfHwgXCJcIjtcclxuICAgICAgYXJyYXl0eXBlID0gcF9UeXBlKHApO1xyXG4gICAgfVxyXG4gICAgcC5leHBlY3QoXCJSUEFSQU1cIik7XHJcbiAgICByZXR1cm4geyB0eXBlOiBcImFycmF5XCIsIGRhdGE6IHsgdHlwZTogYXJyYXl0eXBlLCBpbmFtZTogaXRlcm5hbWUgfSB9O1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcF9UeXBlKHA6IHBhcnNlcik6IFBhcnNlZFR5cGUge1xyXG4gICAgbGV0IHRvayA9IHAucGVlaygpITtcclxuICAgIGlmICh0b2sudHlwZSA9PT0gXCJJRFwiKSB7XHJcbiAgICAgIHAubmV4dCgpO1xyXG4gICAgICByZXR1cm4geyB0eXBlOiBcInN0cnVjdFwiLCBkYXRhOiAnXCInICsgdG9rLnZhbHVlICsgJ1wiJyB9O1xyXG4gICAgfSBlbHNlIGlmIChiYXNpY190eXBlcy5oYXModG9rLnR5cGUudG9Mb3dlckNhc2UoKSkpIHtcclxuICAgICAgcC5uZXh0KCk7XHJcbiAgICAgIHJldHVybiB7IHR5cGU6IHRvay50eXBlLnRvTG93ZXJDYXNlKCkgfTtcclxuICAgIH0gZWxzZSBpZiAodG9rLnR5cGUgPT09IFwiQVJSQVlcIikge1xyXG4gICAgICByZXR1cm4gcF9BcnJheShwKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHAuZXJyb3IodG9rLCBcImludmFsaWQgdHlwZSBcIiArIHRvay50eXBlKTtcclxuICAgICAgcmV0dXJuIHsgdHlwZTogXCJlcnJvclwiIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpbnRlcmZhY2UgUGFyc2VkRmllbGQge1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gICAgdHlwZTogUGFyc2VkVHlwZTtcclxuICAgIHNldDogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gICAgZ2V0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBwX0ZpZWxkKHA6IHBhcnNlcik6IFBhcnNlZEZpZWxkIHtcclxuICAgIGxldCBmaWVsZDogUGFyc2VkRmllbGQgPSB7XHJcbiAgICAgIG5hbWU6IFwiXCIsXHJcbiAgICAgIHR5cGU6IHsgdHlwZTogXCJcIiB9LFxyXG4gICAgICBzZXQgOiB1bmRlZmluZWQsXHJcbiAgICAgIGdldCA6IHVuZGVmaW5lZCxcclxuICAgIH07XHJcbiAgICBjb25zb2xlLmxvZyhcIi0tLS0tXCIsIHAucGVlaygpIS50eXBlKTtcclxuICAgIGZpZWxkLm5hbWUgPSBwLmV4cGVjdChcIklEXCIsIFwic3RydWN0IGZpZWxkIG5hbWVcIik7XHJcbiAgICBwLmV4cGVjdChcIkNPTE9OXCIpO1xyXG4gICAgZmllbGQudHlwZSA9IHBfVHlwZShwKTtcclxuICAgIGxldCB0b2sgPSBwLnBlZWsoKTtcclxuICAgIGlmICh0b2sgJiYgdG9rLnR5cGUgPT09IFwiSlNDUklQVFwiKSB7XHJcbiAgICAgIGZpZWxkLmdldCA9IHRvay52YWx1ZTtcclxuICAgICAgcC5uZXh0KCk7XHJcbiAgICB9XHJcbiAgICB0b2sgPSBwLnBlZWsoKTtcclxuICAgIGlmICh0b2sgJiYgdG9rLnR5cGUgPT09IFwiSlNDUklQVFwiKSB7XHJcbiAgICAgIGZpZWxkLnNldCA9IHRvay52YWx1ZTtcclxuICAgICAgcC5uZXh0KCk7XHJcbiAgICB9XHJcbiAgICBwLmV4cGVjdChcIlNFTUlcIik7XHJcbiAgICByZXR1cm4gZmllbGQ7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBwX1N0cnVjdChwOiBwYXJzZXIpOiB7IG5hbWU6IHN0cmluZzsgZmllbGRzOiBQYXJzZWRGaWVsZFtdIH0ge1xyXG4gICAgbGV0IHN0ID0ge1xyXG4gICAgICBuYW1lICA6IFwiXCIsXHJcbiAgICAgIGZpZWxkczogW10gYXMgUGFyc2VkRmllbGRbXSxcclxuICAgIH07XHJcbiAgICBzdC5uYW1lID0gcC5leHBlY3QoXCJJRFwiLCBcInN0cnVjdCBuYW1lXCIpO1xyXG4gICAgcC5leHBlY3QoXCJPUEVOXCIpO1xyXG4gICAgd2hpbGUgKDEpIHtcclxuICAgICAgaWYgKHAuYXRfZW5kKCkpIHtcclxuICAgICAgICBwLmVycm9yKHVuZGVmaW5lZCk7XHJcbiAgICAgIH0gZWxzZSBpZiAocC5vcHRpb25hbChcIkNMT1NFXCIpKSB7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgc3QuZmllbGRzLnB1c2gocF9GaWVsZChwKSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBzdDtcclxuICB9XHJcblxyXG4gIGxldCByZXQgPSBwX1N0cnVjdChwYXJzZSk7XHJcbiAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkocmV0KSk7XHJcbn1cclxuXHJcbi8vdGVzdF9wYXJzZXIoKTtcclxuXHJcbnZhciBzdHJ1Y3RfcGFyc2V1dGlsID0gLyojX19QVVJFX18qLyBPYmplY3QuZnJlZXplKHtcclxuICBfX3Byb3RvX18gICAgICAgOiBudWxsLFxyXG4gIHRva2VuICAgICAgICAgICA6IHRva2VuLFxyXG4gIHRva2RlZiAgICAgICAgICA6IHRva2RlZixcclxuICBQVVRJTF9QYXJzZUVycm9yOiBQVVRJTF9QYXJzZUVycm9yLFxyXG4gIGxleGVyICAgICAgICAgICA6IGxleGVyLFxyXG4gIHBhcnNlciAgICAgICAgICA6IHBhcnNlcixcclxufSk7XHJcblxyXG4oXCJ1c2Ugc3RyaWN0XCIpO1xyXG5cclxuLyogLS0tLSBzdHJ1Y3QgcGFyc2VyIC0tLS0gKi9cclxuXHJcbmludGVyZmFjZSBTdHJ1Y3RGaWVsZCB7XHJcbiAgbmFtZTogc3RyaW5nO1xyXG4gIHR5cGU6IFN0cnVjdFR5cGU7XHJcbiAgc2V0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbiAgZ2V0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbiAgY29tbWVudDogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgU3RydWN0VHlwZSB7XHJcbiAgdHlwZTogbnVtYmVyO1xyXG4gIGRhdGE/OiB1bmtub3duO1xyXG4gIGpzb25LZXl3b3JkPzogc3RyaW5nO1xyXG59XHJcblxyXG5jbGFzcyBOU3RydWN0IHtcclxuICBmaWVsZHM6IFN0cnVjdEZpZWxkW107XHJcbiAgaWQ6IG51bWJlcjtcclxuICBuYW1lOiBzdHJpbmc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKG5hbWU6IHN0cmluZykge1xyXG4gICAgdGhpcy5maWVsZHMgPSBbXTtcclxuICAgIHRoaXMuaWQgPSAtMTtcclxuICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbiAgfVxyXG59XHJcblxyXG4vL3RoZSBkaXNjb250aW51b3VzIGlkJ3MgYXJlIHRvIG1ha2Ugc3VyZVxyXG4vL3RoZSB2ZXJzaW9uIEkgb3JpZ2luYWxseSB3cm90ZSAod2hpY2ggaGFkIGEgZmV3IGFwcGxpY2F0aW9uLXNwZWNpZmljIHR5cGVzKVxyXG4vL2FuZCB0aGlzIG9uZSBkbyBub3QgYmVjb21lIHRvdGFsbHkgaW5jb21wYXRpYmxlLlxyXG5jb25zdCBTdHJ1Y3RFbnVtID0ge1xyXG4gIElOVCAgICAgICAgICA6IDAsXHJcbiAgRkxPQVQgICAgICAgIDogMSxcclxuICBET1VCTEUgICAgICAgOiAyLFxyXG4gIFNUUklORyAgICAgICA6IDcsXHJcbiAgU1RBVElDX1NUUklORzogOCwgLy9maXhlZC1sZW5ndGggc3RyaW5nXHJcbiAgU1RSVUNUICAgICAgIDogOSxcclxuICBUU1RSVUNUICAgICAgOiAxMCxcclxuICBBUlJBWSAgICAgICAgOiAxMSxcclxuICBJVEVSICAgICAgICAgOiAxMixcclxuICBTSE9SVCAgICAgICAgOiAxMyxcclxuICBCWVRFICAgICAgICAgOiAxNCxcclxuICBCT09MICAgICAgICAgOiAxNSxcclxuICBJVEVSS0VZUyAgICAgOiAxNixcclxuICBVSU5UICAgICAgICAgOiAxNyxcclxuICBVU0hPUlQgICAgICAgOiAxOCxcclxuICBTVEFUSUNfQVJSQVkgOiAxOSxcclxuICBTSUdORURfQllURSAgOiAyMCxcclxuICBPUFRJT05BTCAgICAgOiAyMSxcclxufSBhcyBjb25zdDtcclxuXHJcbmNvbnN0IEFycmF5VHlwZXMgPSBuZXcgU2V0PG51bWJlcj4oW1N0cnVjdEVudW0uU1RBVElDX0FSUkFZLCBTdHJ1Y3RFbnVtLkFSUkFZLCBTdHJ1Y3RFbnVtLklURVJLRVlTLCBTdHJ1Y3RFbnVtLklURVJdKTtcclxuXHJcbmNvbnN0IFZhbHVlVHlwZXMgPSBuZXcgU2V0PG51bWJlcj4oW1xyXG4gIFN0cnVjdEVudW0uSU5ULFxyXG4gIFN0cnVjdEVudW0uRkxPQVQsXHJcbiAgU3RydWN0RW51bS5ET1VCTEUsXHJcbiAgU3RydWN0RW51bS5TVFJJTkcsXHJcbiAgU3RydWN0RW51bS5TVEFUSUNfU1RSSU5HLFxyXG4gIFN0cnVjdEVudW0uU0hPUlQsXHJcbiAgU3RydWN0RW51bS5CWVRFLFxyXG4gIFN0cnVjdEVudW0uQk9PTCxcclxuICBTdHJ1Y3RFbnVtLlVJTlQsXHJcbiAgU3RydWN0RW51bS5VU0hPUlQsXHJcbiAgU3RydWN0RW51bS5TSUdORURfQllURSxcclxuXSk7XHJcblxyXG5sZXQgU3RydWN0VHlwZXM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7XHJcbiAgXCJpbnRcIiAgICAgICAgICA6IFN0cnVjdEVudW0uSU5ULFxyXG4gIFwidWludFwiICAgICAgICAgOiBTdHJ1Y3RFbnVtLlVJTlQsXHJcbiAgXCJ1c2hvcnRcIiAgICAgICA6IFN0cnVjdEVudW0uVVNIT1JULFxyXG4gIFwiZmxvYXRcIiAgICAgICAgOiBTdHJ1Y3RFbnVtLkZMT0FULFxyXG4gIFwiZG91YmxlXCIgICAgICAgOiBTdHJ1Y3RFbnVtLkRPVUJMRSxcclxuICBcInN0cmluZ1wiICAgICAgIDogU3RydWN0RW51bS5TVFJJTkcsXHJcbiAgXCJzdGF0aWNfc3RyaW5nXCI6IFN0cnVjdEVudW0uU1RBVElDX1NUUklORyxcclxuICBcInN0cnVjdFwiICAgICAgIDogU3RydWN0RW51bS5TVFJVQ1QsXHJcbiAgXCJhYnN0cmFjdFwiICAgICA6IFN0cnVjdEVudW0uVFNUUlVDVCxcclxuICBcImFycmF5XCIgICAgICAgIDogU3RydWN0RW51bS5BUlJBWSxcclxuICBcIml0ZXJcIiAgICAgICAgIDogU3RydWN0RW51bS5JVEVSLFxyXG4gIFwic2hvcnRcIiAgICAgICAgOiBTdHJ1Y3RFbnVtLlNIT1JULFxyXG4gIFwiYnl0ZVwiICAgICAgICAgOiBTdHJ1Y3RFbnVtLkJZVEUsXHJcbiAgXCJib29sXCIgICAgICAgICA6IFN0cnVjdEVudW0uQk9PTCxcclxuICBcIml0ZXJrZXlzXCIgICAgIDogU3RydWN0RW51bS5JVEVSS0VZUyxcclxuICBcInNieXRlXCIgICAgICAgIDogU3RydWN0RW51bS5TSUdORURfQllURSxcclxuICBcIm9wdGlvbmFsXCIgICAgIDogU3RydWN0RW51bS5PUFRJT05BTCxcclxufTtcclxuXHJcbmxldCBTdHJ1Y3RUeXBlTWFwOiBSZWNvcmQ8bnVtYmVyLCBzdHJpbmc+ID0ge307XHJcblxyXG5mb3IgKGxldCBrIGluIFN0cnVjdFR5cGVzKSB7XHJcbiAgU3RydWN0VHlwZU1hcFtTdHJ1Y3RUeXBlc1trXV0gPSBrO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5fdGFic3RyJDIodDogbnVtYmVyKTogc3RyaW5nIHtcclxuICBsZXQgcyA9IFwiXCI7XHJcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0OyBpKyspIHtcclxuICAgIHMgKz0gXCIgIFwiO1xyXG4gIH1cclxuICByZXR1cm4gcztcclxufVxyXG5cclxuZnVuY3Rpb24gc3RyaXBDb21tZW50cyhidWY6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgbGV0IHMgPSBcIlwiO1xyXG5cclxuICBjb25zdCBNQUlOID0gMCxcclxuICAgIENPTU1FTlQgPSAxLFxyXG4gICAgU1RSID0gMjtcclxuXHJcbiAgbGV0IHN0cnMgPSBuZXcgU2V0KFtcIidcIiwgJ1wiJywgXCJgXCJdKTtcclxuICBsZXQgbW9kZSA9IE1BSU47XHJcbiAgbGV0IHN0cmxpdDogc3RyaW5nID0gXCJcIjtcclxuICBsZXQgZXNjYXBlOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYnVmLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBsZXQgcCA9IGkgPiAwID8gYnVmW2kgLSAxXSA6IHVuZGVmaW5lZDtcclxuICAgIGxldCBjID0gYnVmW2ldO1xyXG4gICAgbGV0IG4gPSBpIDwgYnVmLmxlbmd0aCAtIDEgPyBidWZbaSArIDFdIDogdW5kZWZpbmVkO1xyXG5cclxuICAgIHN3aXRjaCAobW9kZSkge1xyXG4gICAgICBjYXNlIE1BSU46XHJcbiAgICAgICAgaWYgKGMgPT09IFwiL1wiICYmIG4gPT09IFwiL1wiKSB7XHJcbiAgICAgICAgICBtb2RlID0gQ09NTUVOVDtcclxuICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHN0cnMuaGFzKGMpKSB7XHJcbiAgICAgICAgICBzdHJsaXQgPSBjO1xyXG4gICAgICAgICAgbW9kZSA9IFNUUjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHMgKz0gYztcclxuXHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgQ09NTUVOVDpcclxuICAgICAgICBpZiAobiA9PT0gXCJcXG5cIikge1xyXG4gICAgICAgICAgbW9kZSA9IE1BSU47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIFNUUjpcclxuICAgICAgICBpZiAoYyA9PT0gc3RybGl0ICYmICFlc2NhcGUpIHtcclxuICAgICAgICAgIG1vZGUgPSBNQUlOO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcyArPSBjO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjID09PSBcIlxcXFxcIikge1xyXG4gICAgICBlc2NhcGUgPSAhZXNjYXBlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZXNjYXBlID0gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcztcclxufVxyXG5cclxuZnVuY3Rpb24gU3RydWN0UGFyc2VyKCk6IHBhcnNlciAmIHsgaW5wdXQoc3RyOiBzdHJpbmcpOiB2b2lkOyBhdF9lbmQoKTogYm9vbGVhbjsgcGVlaygpOiB0b2tlbiB8IHVuZGVmaW5lZCB9IHtcclxuICBsZXQgYmFzaWNfdHlwZXMgPSBuZXcgU2V0KFtcImludFwiLCBcImZsb2F0XCIsIFwiZG91YmxlXCIsIFwic3RyaW5nXCIsIFwic2hvcnRcIiwgXCJieXRlXCIsIFwic2J5dGVcIiwgXCJib29sXCIsIFwidWludFwiLCBcInVzaG9ydFwiXSk7XHJcblxyXG4gIGxldCByZXNlcnZlZF90b2tlbnMgPSBuZXcgU2V0KFtcclxuICAgIFwiaW50XCIsXHJcbiAgICBcImZsb2F0XCIsXHJcbiAgICBcImRvdWJsZVwiLFxyXG4gICAgXCJzdHJpbmdcIixcclxuICAgIFwic3RhdGljX3N0cmluZ1wiLFxyXG4gICAgXCJhcnJheVwiLFxyXG4gICAgXCJpdGVyXCIsXHJcbiAgICBcImFic3RyYWN0XCIsXHJcbiAgICBcInNob3J0XCIsXHJcbiAgICBcImJ5dGVcIixcclxuICAgIFwic2J5dGVcIixcclxuICAgIFwiYm9vbFwiLFxyXG4gICAgXCJpdGVya2V5c1wiLFxyXG4gICAgXCJ1aW50XCIsXHJcbiAgICBcInVzaG9ydFwiLFxyXG4gICAgXCJzdGF0aWNfYXJyYXlcIixcclxuICAgIFwib3B0aW9uYWxcIixcclxuICBdKTtcclxuXHJcbiAgZnVuY3Rpb24gdGsobmFtZTogc3RyaW5nLCByZT86IFJlZ0V4cCwgZnVuYz86IFRva0Z1bmMsIGV4YW1wbGU/OiBzdHJpbmcpOiB0b2tkZWYge1xyXG4gICAgcmV0dXJuIG5ldyB0b2tkZWYobmFtZSwgcmUsIGZ1bmMsIGV4YW1wbGUpO1xyXG4gIH1cclxuXHJcbiAgbGV0IHRva2VucyA9IFtcclxuICAgIHRrKFxyXG4gICAgICBcIklEXCIsXHJcbiAgICAgIC9bYS16QS1aXyRdK1thLXpBLVowLTlfXFwuJF0qLyxcclxuICAgICAgZnVuY3Rpb24gKHQpIHtcclxuICAgICAgICBpZiAocmVzZXJ2ZWRfdG9rZW5zLmhhcyh0LnZhbHVlKSkge1xyXG4gICAgICAgICAgdC50eXBlID0gdC52YWx1ZS50b1VwcGVyQ2FzZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgICAgfSxcclxuICAgICAgXCJpZGVudGlmaWVyXCJcclxuICAgICksXHJcbiAgICB0ayhcIk9QRU5cIiwgL1xcey8pLFxyXG4gICAgdGsoXCJFUVVBTFNcIiwgLz0vKSxcclxuICAgIHRrKFwiQ0xPU0VcIiwgL30vKSxcclxuICAgIHRrKFwiU1RSTElUXCIsIC9cXFwiW15cIl0qXFxcIi8sICh0KSA9PiB7XHJcbiAgICAgIHQudmFsdWUgPSB0LnZhbHVlLnNsaWNlKDEsIHQudmFsdWUubGVuZ3RoIC0gMSk7XHJcbiAgICAgIHJldHVybiB0O1xyXG4gICAgfSksXHJcbiAgICB0ayhcIlNUUkxJVFwiLCAvXFwnW14nXSpcXCcvLCAodCkgPT4ge1xyXG4gICAgICB0LnZhbHVlID0gdC52YWx1ZS5zbGljZSgxLCB0LnZhbHVlLmxlbmd0aCAtIDEpO1xyXG4gICAgICByZXR1cm4gdDtcclxuICAgIH0pLFxyXG4gICAgdGsoXCJDT0xPTlwiLCAvOi8pLFxyXG4gICAgdGsoXCJPUFRfQ09MT05cIiwgL1xcPzovKSxcclxuICAgIHRrKFwiU09QRU5cIiwgL1xcWy8pLFxyXG4gICAgdGsoXCJTQ0xPU0VcIiwgL1xcXS8pLFxyXG4gICAgdGsoXCJKU0NSSVBUXCIsIC9cXHwvLCBmdW5jdGlvbiAodCkge1xyXG4gICAgICBsZXQganMgPSBcIlwiO1xyXG4gICAgICBsZXQgbGV4ID0gdC5sZXhlcjtcclxuICAgICAgbGV0IHA6IHN0cmluZyB8IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgIHdoaWxlIChsZXgubGV4cG9zIDwgbGV4LmxleGRhdGEubGVuZ3RoKSB7XHJcbiAgICAgICAgbGV0IGMgPSBsZXgubGV4ZGF0YVtsZXgubGV4cG9zXTtcclxuICAgICAgICBpZiAoYyA9PT0gXCJcXG5cIikgYnJlYWs7XHJcblxyXG4gICAgICAgIGlmIChjID09PSBcIi9cIiAmJiBwID09PSBcIi9cIikge1xyXG4gICAgICAgICAganMgPSBqcy5zbGljZSgwLCBqcy5sZW5ndGggLSAxKTtcclxuICAgICAgICAgIGxleC5sZXhwb3MtLTtcclxuXHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGpzICs9IGM7XHJcbiAgICAgICAgbGV4LmxleHBvcysrO1xyXG4gICAgICAgIHAgPSBjO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB3aGlsZSAoanMudHJpbSgpLmVuZHNXaXRoKFwiO1wiKSkge1xyXG4gICAgICAgIGpzID0ganMuc2xpY2UoMCwganMubGVuZ3RoIC0gMSk7XHJcbiAgICAgICAgbGV4LmxleHBvcy0tO1xyXG4gICAgICB9XHJcbiAgICAgIHQudmFsdWUgPSBqcy50cmltKCk7XHJcbiAgICAgIHJldHVybiB0O1xyXG4gICAgfSksXHJcbiAgICB0ayhcIkNPTU1FTlRcIiwgL1xcL1xcLy4qW1xcblxccl0vKSxcclxuICAgIHRrKFwiTFBBUkFNXCIsIC9cXCgvKSxcclxuICAgIHRrKFwiUlBBUkFNXCIsIC9cXCkvKSxcclxuICAgIHRrKFwiQ09NTUFcIiwgLywvKSxcclxuICAgIHRrKFwiTlVNXCIsIC9bMC05XSsvLCB1bmRlZmluZWQsIFwibnVtYmVyXCIpLFxyXG4gICAgdGsoXCJTRU1JXCIsIC87LyksXHJcbiAgICB0ayhcclxuICAgICAgXCJORVdMSU5FXCIsXHJcbiAgICAgIC9cXG4vLFxyXG4gICAgICBmdW5jdGlvbiAodCkge1xyXG4gICAgICAgIHQubGV4ZXIubGluZW5vICs9IDE7XHJcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgICAgfSxcclxuICAgICAgXCJuZXdsaW5lXCJcclxuICAgICksXHJcbiAgICB0ayhcclxuICAgICAgXCJTUEFDRVwiLFxyXG4gICAgICAvIHxcXHQvLFxyXG4gICAgICBmdW5jdGlvbiAoX3QpIHtcclxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICB9LFxyXG4gICAgICBcIndoaXRlc3BhY2VcIlxyXG4gICAgKSxcclxuICBdO1xyXG5cclxuICByZXNlcnZlZF90b2tlbnMuZm9yRWFjaChmdW5jdGlvbiAocnQpIHtcclxuICAgIHRva2Vucy5wdXNoKHRrKHJ0LnRvVXBwZXJDYXNlKCkpKTtcclxuICB9KTtcclxuXHJcbiAgZnVuY3Rpb24gZXJyZnVuYyhfbGV4OiBsZXhlcik6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICBjbGFzcyBMZXhlciBleHRlbmRzIGxleGVyIHtcclxuICAgIGlucHV0KHN0cjogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgIC8vc3RyID0gc3RyaXBDb21tZW50cyhzdHIpO1xyXG4gICAgICByZXR1cm4gc3VwZXIuaW5wdXQoc3RyKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGxldCBsZXggPSBuZXcgTGV4ZXIodG9rZW5zLCBlcnJmdW5jKTtcclxuICBsZXQgcGFyc2VyJDEgPSBuZXcgcGFyc2VyKGxleCk7XHJcblxyXG4gIGZ1bmN0aW9uIHBfU3RhdGljX1N0cmluZyhwOiBwYXJzZXIpOiBTdHJ1Y3RUeXBlIHtcclxuICAgIHAuZXhwZWN0KFwiU1RBVElDX1NUUklOR1wiKTtcclxuICAgIHAuZXhwZWN0KFwiU09QRU5cIik7XHJcbiAgICBsZXQgbnVtID0gcC5leHBlY3QoXCJOVU1cIik7XHJcbiAgICBwLmV4cGVjdChcIlNDTE9TRVwiKTtcclxuICAgIHJldHVybiB7IHR5cGU6IFN0cnVjdEVudW0uU1RBVElDX1NUUklORywgZGF0YTogeyBtYXhsZW5ndGg6IG51bSB9IH07XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBwX0RhdGFSZWYocDogcGFyc2VyKTogU3RydWN0VHlwZSB7XHJcbiAgICBwLmV4cGVjdChcIkRBVEFSRUZcIik7XHJcbiAgICBwLmV4cGVjdChcIkxQQVJBTVwiKTtcclxuICAgIGxldCB0bmFtZSA9IHAuZXhwZWN0KFwiSURcIik7XHJcbiAgICBwLmV4cGVjdChcIlJQQVJBTVwiKTtcclxuICAgIHJldHVybiB7IHR5cGU6IChTdHJ1Y3RFbnVtIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pW1wiREFUQVJFRlwiXSwgZGF0YTogdG5hbWUgfTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHBfQXJyYXkocDogcGFyc2VyKTogU3RydWN0VHlwZSB7XHJcbiAgICBwLmV4cGVjdChcIkFSUkFZXCIpO1xyXG4gICAgcC5leHBlY3QoXCJMUEFSQU1cIik7XHJcbiAgICBsZXQgYXJyYXl0eXBlID0gcF9UeXBlKHApO1xyXG5cclxuICAgIGxldCBpdGVybmFtZSA9IFwiXCI7XHJcbiAgICBpZiAocC5vcHRpb25hbChcIkNPTU1BXCIpKSB7XHJcbiAgICAgIGl0ZXJuYW1lID0gKChhcnJheXR5cGUuZGF0YSBhcyBzdHJpbmcpIHx8IFwiXCIpLnJlcGxhY2UoL1wiL2csIFwiXCIpO1xyXG4gICAgICBhcnJheXR5cGUgPSBwX1R5cGUocCk7XHJcbiAgICB9XHJcblxyXG4gICAgcC5leHBlY3QoXCJSUEFSQU1cIik7XHJcbiAgICByZXR1cm4geyB0eXBlOiBTdHJ1Y3RFbnVtLkFSUkFZLCBkYXRhOiB7IHR5cGU6IGFycmF5dHlwZSwgaW5hbWU6IGl0ZXJuYW1lIH0gfTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHBfSXRlcihwOiBwYXJzZXIpOiBTdHJ1Y3RUeXBlIHtcclxuICAgIHAuZXhwZWN0KFwiSVRFUlwiKTtcclxuICAgIHAuZXhwZWN0KFwiTFBBUkFNXCIpO1xyXG5cclxuICAgIGxldCBhcnJheXR5cGUgPSBwX1R5cGUocCk7XHJcbiAgICBsZXQgaXRlcm5hbWUgPSBcIlwiO1xyXG5cclxuICAgIGlmIChwLm9wdGlvbmFsKFwiQ09NTUFcIikpIHtcclxuICAgICAgaXRlcm5hbWUgPSAoKGFycmF5dHlwZS5kYXRhIGFzIHN0cmluZykgfHwgXCJcIikucmVwbGFjZSgvXCIvZywgXCJcIik7XHJcbiAgICAgIGFycmF5dHlwZSA9IHBfVHlwZShwKTtcclxuICAgIH1cclxuXHJcbiAgICBwLmV4cGVjdChcIlJQQVJBTVwiKTtcclxuICAgIHJldHVybiB7IHR5cGU6IFN0cnVjdEVudW0uSVRFUiwgZGF0YTogeyB0eXBlOiBhcnJheXR5cGUsIGluYW1lOiBpdGVybmFtZSB9IH07XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBwX1N0YXRpY0FycmF5KHA6IHBhcnNlcik6IFN0cnVjdFR5cGUge1xyXG4gICAgcC5leHBlY3QoXCJTVEFUSUNfQVJSQVlcIik7XHJcbiAgICBwLmV4cGVjdChcIlNPUEVOXCIpO1xyXG4gICAgbGV0IGFycmF5dHlwZSA9IHBfVHlwZShwKTtcclxuICAgIGxldCBpdGVybmFtZSA9IFwiXCI7XHJcblxyXG4gICAgcC5leHBlY3QoXCJDT01NQVwiKTtcclxuICAgIGxldCBzaXplOiBudW1iZXIgPSBwYXJzZUludChwLmV4cGVjdChcIk5VTVwiKSk7XHJcblxyXG4gICAgaWYgKHNpemUgPCAwIHx8IE1hdGguYWJzKHNpemUgLSBNYXRoLmZsb29yKHNpemUpKSA+IDAuMDAwMDAxKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKE1hdGguYWJzKHNpemUgLSBNYXRoLmZsb29yKHNpemUpKSk7XHJcbiAgICAgIHAuZXJyb3IodW5kZWZpbmVkLCBcIkV4cGVjdGVkIGFuIGludGVnZXJcIik7XHJcbiAgICB9XHJcblxyXG4gICAgc2l6ZSA9IE1hdGguZmxvb3Ioc2l6ZSk7XHJcblxyXG4gICAgaWYgKHAub3B0aW9uYWwoXCJDT01NQVwiKSkge1xyXG4gICAgICBpdGVybmFtZSA9IHBfVHlwZShwKS5kYXRhIGFzIHN0cmluZztcclxuICAgIH1cclxuXHJcbiAgICBwLmV4cGVjdChcIlNDTE9TRVwiKTtcclxuICAgIHJldHVybiB7IHR5cGU6IFN0cnVjdEVudW0uU1RBVElDX0FSUkFZLCBkYXRhOiB7IHR5cGU6IGFycmF5dHlwZSwgc2l6ZTogc2l6ZSwgaW5hbWU6IGl0ZXJuYW1lIH0gfTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHBfSXRlcktleXMocDogcGFyc2VyKTogU3RydWN0VHlwZSB7XHJcbiAgICBwLmV4cGVjdChcIklURVJLRVlTXCIpO1xyXG4gICAgcC5leHBlY3QoXCJMUEFSQU1cIik7XHJcblxyXG4gICAgbGV0IGFycmF5dHlwZSA9IHBfVHlwZShwKTtcclxuICAgIGxldCBpdGVybmFtZSA9IFwiXCI7XHJcblxyXG4gICAgaWYgKHAub3B0aW9uYWwoXCJDT01NQVwiKSkge1xyXG4gICAgICBpdGVybmFtZSA9ICgoYXJyYXl0eXBlLmRhdGEgYXMgc3RyaW5nKSB8fCBcIlwiKS5yZXBsYWNlKC9cIi9nLCBcIlwiKTtcclxuICAgICAgYXJyYXl0eXBlID0gcF9UeXBlKHApO1xyXG4gICAgfVxyXG5cclxuICAgIHAuZXhwZWN0KFwiUlBBUkFNXCIpO1xyXG4gICAgcmV0dXJuIHsgdHlwZTogU3RydWN0RW51bS5JVEVSS0VZUywgZGF0YTogeyB0eXBlOiBhcnJheXR5cGUsIGluYW1lOiBpdGVybmFtZSB9IH07XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBwX0Fic3RyYWN0KHA6IHBhcnNlcik6IFN0cnVjdFR5cGUge1xyXG4gICAgcC5leHBlY3QoXCJBQlNUUkFDVFwiKTtcclxuICAgIHAuZXhwZWN0KFwiTFBBUkFNXCIpO1xyXG4gICAgbGV0IHR5cGUgPSBwLmV4cGVjdChcIklEXCIpO1xyXG5cclxuICAgIGxldCBqc29uS2V5d29yZCA9IFwiX3N0cnVjdE5hbWVcIjtcclxuXHJcbiAgICBpZiAocC5vcHRpb25hbChcIkNPTU1BXCIpKSB7XHJcbiAgICAgIGpzb25LZXl3b3JkID0gcC5leHBlY3QoXCJTVFJMSVRcIik7XHJcbiAgICB9XHJcblxyXG4gICAgcC5leHBlY3QoXCJSUEFSQU1cIik7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdHlwZTogU3RydWN0RW51bS5UU1RSVUNULFxyXG4gICAgICBkYXRhOiB0eXBlLFxyXG4gICAgICBqc29uS2V5d29yZCxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBwX09wdGlvbmFsKHA6IHBhcnNlcik6IFN0cnVjdFR5cGUge1xyXG4gICAgcC5leHBlY3QoXCJPUFRJT05BTFwiKTtcclxuICAgIHAuZXhwZWN0KFwiTFBBUkFNXCIpO1xyXG4gICAgY29uc3QgdHlwZSA9IHBfVHlwZShwKTtcclxuICAgIHAuZXhwZWN0KFwiUlBBUkFNXCIpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHR5cGU6IFN0cnVjdEVudW0uT1BUSU9OQUwsXHJcbiAgICAgIGRhdGE6IHR5cGUsXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcF9UeXBlKHA6IHBhcnNlcik6IFN0cnVjdFR5cGUge1xyXG4gICAgbGV0IHRvayA9IHAucGVla25leHQoKSE7XHJcblxyXG4gICAgaWYgKHRvay50eXBlID09PSBcIklEXCIpIHtcclxuICAgICAgcC5uZXh0KCk7XHJcbiAgICAgIHJldHVybiB7IHR5cGU6IFN0cnVjdEVudW0uU1RSVUNULCBkYXRhOiB0b2sudmFsdWUgfTtcclxuICAgIH0gZWxzZSBpZiAoYmFzaWNfdHlwZXMuaGFzKHRvay50eXBlLnRvTG93ZXJDYXNlKCkpKSB7XHJcbiAgICAgIHAubmV4dCgpO1xyXG4gICAgICByZXR1cm4geyB0eXBlOiBTdHJ1Y3RUeXBlc1t0b2sudHlwZS50b0xvd2VyQ2FzZSgpXSB9O1xyXG4gICAgfSBlbHNlIGlmICh0b2sudHlwZSA9PT0gXCJBUlJBWVwiKSB7XHJcbiAgICAgIHJldHVybiBwX0FycmF5KHApO1xyXG4gICAgfSBlbHNlIGlmICh0b2sudHlwZSA9PT0gXCJJVEVSXCIpIHtcclxuICAgICAgcmV0dXJuIHBfSXRlcihwKTtcclxuICAgIH0gZWxzZSBpZiAodG9rLnR5cGUgPT09IFwiSVRFUktFWVNcIikge1xyXG4gICAgICByZXR1cm4gcF9JdGVyS2V5cyhwKTtcclxuICAgIH0gZWxzZSBpZiAodG9rLnR5cGUgPT09IFwiU1RBVElDX0FSUkFZXCIpIHtcclxuICAgICAgcmV0dXJuIHBfU3RhdGljQXJyYXkocCk7XHJcbiAgICB9IGVsc2UgaWYgKHRvay50eXBlID09PSBcIlNUQVRJQ19TVFJJTkdcIikge1xyXG4gICAgICByZXR1cm4gcF9TdGF0aWNfU3RyaW5nKHApO1xyXG4gICAgfSBlbHNlIGlmICh0b2sudHlwZSA9PT0gXCJBQlNUUkFDVFwiKSB7XHJcbiAgICAgIHJldHVybiBwX0Fic3RyYWN0KHApO1xyXG4gICAgfSBlbHNlIGlmICh0b2sudHlwZSA9PT0gXCJEQVRBUkVGXCIpIHtcclxuICAgICAgcmV0dXJuIHBfRGF0YVJlZihwKTtcclxuICAgIH0gZWxzZSBpZiAodG9rLnR5cGUgPT09IFwiT1BUSU9OQUxcIikge1xyXG4gICAgICByZXR1cm4gcF9PcHRpb25hbChwKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHAuZXJyb3IodG9rLCBcImludmFsaWQgdHlwZSBcIiArIHRvay50eXBlKTtcclxuICAgICAgcmV0dXJuIHsgdHlwZTogLTEgfTsgLy8gdW5yZWFjaGFibGUsIGVycm9yIHRocm93c1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcF9JRF9vcl9udW0ocDogcGFyc2VyKTogc3RyaW5nIHtcclxuICAgIGxldCB0ID0gcC5wZWVrbmV4dCgpITtcclxuXHJcbiAgICBpZiAodC50eXBlID09PSBcIk5VTVwiKSB7XHJcbiAgICAgIHAubmV4dCgpO1xyXG4gICAgICByZXR1cm4gdC52YWx1ZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBwLmV4cGVjdChcIklEXCIsIFwic3RydWN0IGZpZWxkIG5hbWVcIik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBwX0ZpZWxkKHA6IHBhcnNlcik6IFN0cnVjdEZpZWxkIHtcclxuICAgIGxldCBmaWVsZDogU3RydWN0RmllbGQgPSB7XHJcbiAgICAgIG5hbWUgICA6IFwiXCIsXHJcbiAgICAgIHR5cGUgICA6IHsgdHlwZTogLTEgfSxcclxuICAgICAgc2V0ICAgIDogdW5kZWZpbmVkLFxyXG4gICAgICBnZXQgICAgOiB1bmRlZmluZWQsXHJcbiAgICAgIGNvbW1lbnQ6IFwiXCIsXHJcbiAgICB9O1xyXG5cclxuICAgIGZpZWxkLm5hbWUgPSBwX0lEX29yX251bShwKTtcclxuICAgIGxldCBpc19vcHQgPSBmYWxzZTtcclxuXHJcbiAgICBpZiAocC5wZWVrbmV4dCgpIS50eXBlID09PSBcIk9QVF9DT0xPTlwiKSB7XHJcbiAgICAgIHAuZXhwZWN0KFwiT1BUX0NPTE9OXCIpO1xyXG4gICAgICBpc19vcHQgPSB0cnVlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcC5leHBlY3QoXCJDT0xPTlwiKTtcclxuICAgIH1cclxuXHJcbiAgICBmaWVsZC50eXBlID0gcF9UeXBlKHApO1xyXG4gICAgaWYgKGlzX29wdCkge1xyXG4gICAgICBmaWVsZC50eXBlID0ge1xyXG4gICAgICAgIHR5cGU6IFN0cnVjdEVudW0uT1BUSU9OQUwsXHJcbiAgICAgICAgZGF0YTogZmllbGQudHlwZSxcclxuICAgICAgfTtcclxuICAgIH1cclxuICAgIGZpZWxkLnNldCA9IHVuZGVmaW5lZDtcclxuICAgIGZpZWxkLmdldCA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICBsZXQgY2hlY2sgPSAwO1xyXG5cclxuICAgIGxldCB0b2sgPSBwLnBlZWtuZXh0KCk7XHJcblxyXG4gICAgaWYgKHRvayAmJiB0b2sudHlwZSA9PT0gXCJKU0NSSVBUXCIpIHtcclxuICAgICAgZmllbGQuZ2V0ID0gdG9rLnZhbHVlO1xyXG4gICAgICBjaGVjayA9IDE7XHJcblxyXG4gICAgICBwLm5leHQoKTtcclxuICAgICAgdG9rID0gcC5wZWVrbmV4dCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0b2sgJiYgdG9rLnR5cGUgPT09IFwiSlNDUklQVFwiKSB7XHJcbiAgICAgIGNoZWNrID0gMTtcclxuICAgICAgZmllbGQuc2V0ID0gdG9rLnZhbHVlO1xyXG5cclxuICAgICAgcC5uZXh0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcC5leHBlY3QoXCJTRU1JXCIpO1xyXG5cclxuICAgIHRvayA9IHAucGVla25leHQoKTtcclxuXHJcbiAgICBpZiAodG9rICYmIHRvay50eXBlID09PSBcIkNPTU1FTlRcIikge1xyXG4gICAgICBmaWVsZC5jb21tZW50ID0gdG9rLnZhbHVlO1xyXG4gICAgICBwLm5leHQoKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGZpZWxkLmNvbW1lbnQgPSBcIlwiO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmaWVsZDtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHBfU3RydWN0KHA6IHBhcnNlcik6IE5TdHJ1Y3Qge1xyXG4gICAgbGV0IG5hbWUgPSBwLmV4cGVjdChcIklEXCIsIFwic3RydWN0IG5hbWVcIik7XHJcblxyXG4gICAgbGV0IHN0ID0gbmV3IE5TdHJ1Y3QobmFtZSk7XHJcblxyXG4gICAgbGV0IHRvayA9IHAucGVla25leHQoKSE7XHJcblxyXG4gICAgaWYgKHRvay50eXBlID09PSBcIklEXCIgJiYgdG9rLnZhbHVlID09PSBcImlkXCIpIHtcclxuICAgICAgcC5uZXh0KCk7XHJcbiAgICAgIHAuZXhwZWN0KFwiRVFVQUxTXCIpO1xyXG4gICAgICBzdC5pZCA9IHBhcnNlSW50KHAuZXhwZWN0KFwiTlVNXCIpKTtcclxuICAgIH1cclxuXHJcbiAgICBwLmV4cGVjdChcIk9QRU5cIik7XHJcbiAgICB3aGlsZSAoMSkge1xyXG4gICAgICBpZiAocC5hdF9lbmQoKSkge1xyXG4gICAgICAgIHAuZXJyb3IodW5kZWZpbmVkKTtcclxuICAgICAgfSBlbHNlIGlmIChwLm9wdGlvbmFsKFwiQ0xPU0VcIikpIHtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBzdC5maWVsZHMucHVzaChwX0ZpZWxkKHApKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzdDtcclxuICB9XHJcblxyXG4gIHBhcnNlciQxLnN0YXJ0ID0gcF9TdHJ1Y3QgYXMgKHA6IHBhcnNlcikgPT4gdW5rbm93bjtcclxuICByZXR1cm4gcGFyc2VyJDEgYXMgcGFyc2VyICYgeyBpbnB1dChzdHI6IHN0cmluZyk6IHZvaWQ7IGF0X2VuZCgpOiBib29sZWFuOyBwZWVrKCk6IHRva2VuIHwgdW5kZWZpbmVkIH07XHJcbn1cclxuXHJcbmNvbnN0IHN0cnVjdF9wYXJzZSA9IFN0cnVjdFBhcnNlcigpO1xyXG5cclxudmFyIHN0cnVjdF9wYXJzZXIgPSAvKiNfX1BVUkVfXyovIE9iamVjdC5mcmVlemUoe1xyXG4gIF9fcHJvdG9fXyAgICA6IG51bGwsXHJcbiAgTlN0cnVjdCAgICAgIDogTlN0cnVjdCxcclxuICBTdHJ1Y3RFbnVtICAgOiBTdHJ1Y3RFbnVtLFxyXG4gIEFycmF5VHlwZXMgICA6IEFycmF5VHlwZXMsXHJcbiAgVmFsdWVUeXBlcyAgIDogVmFsdWVUeXBlcyxcclxuICBTdHJ1Y3RUeXBlcyAgOiBTdHJ1Y3RUeXBlcyxcclxuICBTdHJ1Y3RUeXBlTWFwOiBTdHJ1Y3RUeXBlTWFwLFxyXG4gIHN0cmlwQ29tbWVudHM6IHN0cmlwQ29tbWVudHMsXHJcbiAgc3RydWN0X3BhcnNlIDogc3RydWN0X3BhcnNlLFxyXG59KTtcclxuXHJcbi8qKiBkZWFkIGZpbGUgKi9cclxuXHJcbnZhciBzdHJ1Y3RfdHlwZXN5c3RlbSA9IC8qI19fUFVSRV9fKi8gT2JqZWN0LmZyZWV6ZSh7XHJcbiAgX19wcm90b19fOiBudWxsLFxyXG59KTtcclxuXHJcbihcInVzZSBzdHJpY3RcIik7XHJcblxyXG4vKiAtLS0tIGJpbmFyeSBwYWNrL3VucGFjayAtLS0tICovXHJcblxyXG52YXIgU1RSVUNUX0VORElBTiA9IHRydWU7IC8vbGl0dGxlIGVuZGlhblxyXG5cclxuZnVuY3Rpb24gc2V0QmluYXJ5RW5kaWFuKG1vZGU6IGJvb2xlYW4pOiB2b2lkIHtcclxuICBTVFJVQ1RfRU5ESUFOID0gISFtb2RlO1xyXG59XHJcblxyXG5sZXQgdGVtcF9kYXRhdmlldyA9IG5ldyBEYXRhVmlldyhuZXcgQXJyYXlCdWZmZXIoMTYpKTtcclxubGV0IHVpbnQ4X3ZpZXcgPSBuZXcgVWludDhBcnJheSh0ZW1wX2RhdGF2aWV3LmJ1ZmZlcik7XHJcblxyXG5jbGFzcyB1bnBhY2tfY29udGV4dCB7XHJcbiAgaTogbnVtYmVyO1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMuaSA9IDA7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwYWNrX2J5dGUoYXJyYXk6IG51bWJlcltdLCB2YWw6IG51bWJlcik6IHZvaWQge1xyXG4gIGFycmF5LnB1c2godmFsKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGFja19zYnl0ZShhcnJheTogbnVtYmVyW10sIHZhbDogbnVtYmVyKTogdm9pZCB7XHJcbiAgaWYgKHZhbCA8IDApIHtcclxuICAgIHZhbCA9IDI1NiArIHZhbDtcclxuICB9XHJcblxyXG4gIGFycmF5LnB1c2godmFsKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGFja19ieXRlcyhhcnJheTogbnVtYmVyW10sIGJ5dGVzOiBudW1iZXJbXSB8IFVpbnQ4QXJyYXkpOiB2b2lkIHtcclxuICBmb3IgKGxldCBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBhcnJheS5wdXNoKGJ5dGVzW2ldKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhY2tfaW50KGFycmF5OiBudW1iZXJbXSwgdmFsOiBudW1iZXIpOiB2b2lkIHtcclxuICB0ZW1wX2RhdGF2aWV3LnNldEludDMyKDAsIHZhbCwgU1RSVUNUX0VORElBTik7XHJcblxyXG4gIGFycmF5LnB1c2godWludDhfdmlld1swXSk7XHJcbiAgYXJyYXkucHVzaCh1aW50OF92aWV3WzFdKTtcclxuICBhcnJheS5wdXNoKHVpbnQ4X3ZpZXdbMl0pO1xyXG4gIGFycmF5LnB1c2godWludDhfdmlld1szXSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhY2tfdWludChhcnJheTogbnVtYmVyW10sIHZhbDogbnVtYmVyKTogdm9pZCB7XHJcbiAgdGVtcF9kYXRhdmlldy5zZXRVaW50MzIoMCwgdmFsLCBTVFJVQ1RfRU5ESUFOKTtcclxuXHJcbiAgYXJyYXkucHVzaCh1aW50OF92aWV3WzBdKTtcclxuICBhcnJheS5wdXNoKHVpbnQ4X3ZpZXdbMV0pO1xyXG4gIGFycmF5LnB1c2godWludDhfdmlld1syXSk7XHJcbiAgYXJyYXkucHVzaCh1aW50OF92aWV3WzNdKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGFja191c2hvcnQoYXJyYXk6IG51bWJlcltdLCB2YWw6IG51bWJlcik6IHZvaWQge1xyXG4gIHRlbXBfZGF0YXZpZXcuc2V0VWludDE2KDAsIHZhbCwgU1RSVUNUX0VORElBTik7XHJcblxyXG4gIGFycmF5LnB1c2godWludDhfdmlld1swXSk7XHJcbiAgYXJyYXkucHVzaCh1aW50OF92aWV3WzFdKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGFja19mbG9hdChhcnJheTogbnVtYmVyW10sIHZhbDogbnVtYmVyKTogdm9pZCB7XHJcbiAgdGVtcF9kYXRhdmlldy5zZXRGbG9hdDMyKDAsIHZhbCwgU1RSVUNUX0VORElBTik7XHJcblxyXG4gIGFycmF5LnB1c2godWludDhfdmlld1swXSk7XHJcbiAgYXJyYXkucHVzaCh1aW50OF92aWV3WzFdKTtcclxuICBhcnJheS5wdXNoKHVpbnQ4X3ZpZXdbMl0pO1xyXG4gIGFycmF5LnB1c2godWludDhfdmlld1szXSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhY2tfZG91YmxlKGFycmF5OiBudW1iZXJbXSwgdmFsOiBudW1iZXIpOiB2b2lkIHtcclxuICB0ZW1wX2RhdGF2aWV3LnNldEZsb2F0NjQoMCwgdmFsLCBTVFJVQ1RfRU5ESUFOKTtcclxuXHJcbiAgYXJyYXkucHVzaCh1aW50OF92aWV3WzBdKTtcclxuICBhcnJheS5wdXNoKHVpbnQ4X3ZpZXdbMV0pO1xyXG4gIGFycmF5LnB1c2godWludDhfdmlld1syXSk7XHJcbiAgYXJyYXkucHVzaCh1aW50OF92aWV3WzNdKTtcclxuICBhcnJheS5wdXNoKHVpbnQ4X3ZpZXdbNF0pO1xyXG4gIGFycmF5LnB1c2godWludDhfdmlld1s1XSk7XHJcbiAgYXJyYXkucHVzaCh1aW50OF92aWV3WzZdKTtcclxuICBhcnJheS5wdXNoKHVpbnQ4X3ZpZXdbN10pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwYWNrX3Nob3J0KGFycmF5OiBudW1iZXJbXSwgdmFsOiBudW1iZXIpOiB2b2lkIHtcclxuICB0ZW1wX2RhdGF2aWV3LnNldEludDE2KDAsIHZhbCwgU1RSVUNUX0VORElBTik7XHJcblxyXG4gIGFycmF5LnB1c2godWludDhfdmlld1swXSk7XHJcbiAgYXJyYXkucHVzaCh1aW50OF92aWV3WzFdKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZW5jb2RlX3V0ZjgoYXJyOiBudW1iZXJbXSwgc3RyOiBzdHJpbmcpOiB2b2lkIHtcclxuICBmb3IgKGxldCBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xyXG4gICAgbGV0IGMgPSBzdHIuY2hhckNvZGVBdChpKTtcclxuXHJcbiAgICB3aGlsZSAoYyAhPT0gMCkge1xyXG4gICAgICBsZXQgdWMgPSBjICYgMTI3O1xyXG4gICAgICBjID0gYyA+PiA3O1xyXG5cclxuICAgICAgaWYgKGMgIT09IDApIHVjIHw9IDEyODtcclxuXHJcbiAgICAgIGFyci5wdXNoKHVjKTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRlY29kZV91dGY4KGFycjogbnVtYmVyW10pOiBzdHJpbmcge1xyXG4gIGxldCBzdHIgPSBcIlwiO1xyXG4gIGxldCBpID0gMDtcclxuXHJcbiAgd2hpbGUgKGkgPCBhcnIubGVuZ3RoKSB7XHJcbiAgICBsZXQgYyA9IGFycltpXTtcclxuICAgIGxldCBzdW0gPSBjICYgMTI3O1xyXG4gICAgbGV0IGogPSAwO1xyXG5cclxuICAgIHdoaWxlIChpIDwgYXJyLmxlbmd0aCAmJiBjICYgMTI4KSB7XHJcbiAgICAgIGogKz0gNztcclxuICAgICAgaSsrO1xyXG4gICAgICBjID0gYXJyW2ldO1xyXG5cclxuICAgICAgYyA9IChjICYgMTI3KSA8PCBqO1xyXG4gICAgICBzdW0gfD0gYztcclxuICAgIH1cclxuXHJcbiAgICBpZiAoc3VtID09PSAwKSBicmVhaztcclxuXHJcbiAgICBzdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShzdW0pO1xyXG4gICAgaSsrO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHN0cjtcclxufVxyXG5cclxuZnVuY3Rpb24gdGVzdF91dGY4KCk6IGJvb2xlYW4ge1xyXG4gIGxldCBzID0gXCJhXCIgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKDg4MDApICsgXCJiXCI7XHJcbiAgbGV0IGFycjogbnVtYmVyW10gPSBbXTtcclxuXHJcbiAgZW5jb2RlX3V0ZjgoYXJyLCBzKTtcclxuICBsZXQgczIgPSBkZWNvZGVfdXRmOChhcnIpO1xyXG5cclxuICBpZiAocyAhPT0gczIpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihcIlVURi04IGVuY29kaW5nL2RlY29kaW5nIHRlc3QgZmFpbGVkXCIpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRydWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRydW5jYXRlX3V0ZjgoYXJyOiBudW1iZXJbXSwgbWF4bGVuOiBudW1iZXIpOiBudW1iZXJbXSB7XHJcbiAgbGV0IGxlbiA9IE1hdGgubWluKGFyci5sZW5ndGgsIG1heGxlbik7XHJcblxyXG4gIGxldCBsYXN0X2NvZGVwb2ludCA9IDA7XHJcbiAgbGV0IGxhc3QyID0gMDtcclxuXHJcbiAgbGV0IGluY29kZTogbnVtYmVyID0gMDtcclxuICBsZXQgaSA9IDA7XHJcbiAgd2hpbGUgKGkgPCBsZW4pIHtcclxuICAgIGluY29kZSA9IGFycltpXSAmIDEyODtcclxuXHJcbiAgICBpZiAoIWluY29kZSkge1xyXG4gICAgICBsYXN0MiA9IGxhc3RfY29kZXBvaW50ICsgMTtcclxuICAgICAgbGFzdF9jb2RlcG9pbnQgPSBpICsgMTtcclxuICAgIH1cclxuXHJcbiAgICBpKys7XHJcbiAgfVxyXG5cclxuICBpZiAobGFzdF9jb2RlcG9pbnQgPCBtYXhsZW4pIGFyci5sZW5ndGggPSBsYXN0X2NvZGVwb2ludDtcclxuICBlbHNlIGFyci5sZW5ndGggPSBsYXN0MjtcclxuXHJcbiAgcmV0dXJuIGFycjtcclxufVxyXG5cclxubGV0IF9zdGF0aWNfc2J1Zl9zcyA9IG5ldyBBcnJheTxudW1iZXI+KDIwNDgpO1xyXG5cclxuZnVuY3Rpb24gcGFja19zdGF0aWNfc3RyaW5nKGRhdGE6IG51bWJlcltdLCBzdHI6IHN0cmluZywgbGVuZ3RoOiBudW1iZXIpOiB2b2lkIHtcclxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcihcIidsZW5ndGgnIHBhcmVtdGVyIGlzIG5vdCBvcHRpb25hbCBmb3IgcGFja19zdGF0aWNfc3RyaW5nKClcIik7XHJcblxyXG4gIGxldCBhcnI6IG51bWJlcltdID0gbGVuZ3RoIDwgMjA0OCA/IF9zdGF0aWNfc2J1Zl9zcyA6IG5ldyBBcnJheSgpO1xyXG4gIGFyci5sZW5ndGggPSAwO1xyXG5cclxuICBlbmNvZGVfdXRmOChhcnIsIHN0cik7XHJcbiAgdHJ1bmNhdGVfdXRmOChhcnIsIGxlbmd0aCk7XHJcblxyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgIGlmIChpID49IGFyci5sZW5ndGgpIHtcclxuICAgICAgZGF0YS5wdXNoKDApO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZGF0YS5wdXNoKGFycltpXSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5sZXQgX3N0YXRpY19zYnVmID0gbmV3IEFycmF5PG51bWJlcj4oMzIpO1xyXG5cclxuLypzdHJpbmdzIGFyZSBwYWNrZWQgYXMgMzItYml0IHVuaWNvZGUgY29kZXBvaW50cyovXHJcbmZ1bmN0aW9uIHBhY2tfc3RyaW5nKGRhdGE6IG51bWJlcltdLCBzdHI6IHN0cmluZyk6IHZvaWQge1xyXG4gIF9zdGF0aWNfc2J1Zi5sZW5ndGggPSAwO1xyXG4gIGVuY29kZV91dGY4KF9zdGF0aWNfc2J1Ziwgc3RyKTtcclxuXHJcbiAgcGFja19pbnQoZGF0YSwgX3N0YXRpY19zYnVmLmxlbmd0aCk7XHJcblxyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgX3N0YXRpY19zYnVmLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBkYXRhLnB1c2goX3N0YXRpY19zYnVmW2ldKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVucGFja19ieXRlcyhkdmlldzogRGF0YVZpZXcsIHVjdHg6IHVucGFja19jb250ZXh0LCBsZW46IG51bWJlcik6IERhdGFWaWV3IHtcclxuICBsZXQgcmV0ID0gbmV3IERhdGFWaWV3KGR2aWV3LmJ1ZmZlci5zbGljZSh1Y3R4LmksIHVjdHguaSArIGxlbikpO1xyXG4gIHVjdHguaSArPSBsZW47XHJcblxyXG4gIHJldHVybiByZXQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVucGFja19ieXRlKGR2aWV3OiBEYXRhVmlldywgdWN0eDogdW5wYWNrX2NvbnRleHQpOiBudW1iZXIge1xyXG4gIHJldHVybiBkdmlldy5nZXRVaW50OCh1Y3R4LmkrKyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVucGFja19zYnl0ZShkdmlldzogRGF0YVZpZXcsIHVjdHg6IHVucGFja19jb250ZXh0KTogbnVtYmVyIHtcclxuICByZXR1cm4gZHZpZXcuZ2V0SW50OCh1Y3R4LmkrKyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVucGFja19pbnQoZHZpZXc6IERhdGFWaWV3LCB1Y3R4OiB1bnBhY2tfY29udGV4dCk6IG51bWJlciB7XHJcbiAgdWN0eC5pICs9IDQ7XHJcbiAgcmV0dXJuIGR2aWV3LmdldEludDMyKHVjdHguaSAtIDQsIFNUUlVDVF9FTkRJQU4pO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1bnBhY2tfdWludChkdmlldzogRGF0YVZpZXcsIHVjdHg6IHVucGFja19jb250ZXh0KTogbnVtYmVyIHtcclxuICB1Y3R4LmkgKz0gNDtcclxuICByZXR1cm4gZHZpZXcuZ2V0VWludDMyKHVjdHguaSAtIDQsIFNUUlVDVF9FTkRJQU4pO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1bnBhY2tfdXNob3J0KGR2aWV3OiBEYXRhVmlldywgdWN0eDogdW5wYWNrX2NvbnRleHQpOiBudW1iZXIge1xyXG4gIHVjdHguaSArPSAyO1xyXG4gIHJldHVybiBkdmlldy5nZXRVaW50MTYodWN0eC5pIC0gMiwgU1RSVUNUX0VORElBTik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVucGFja19mbG9hdChkdmlldzogRGF0YVZpZXcsIHVjdHg6IHVucGFja19jb250ZXh0KTogbnVtYmVyIHtcclxuICB1Y3R4LmkgKz0gNDtcclxuICByZXR1cm4gZHZpZXcuZ2V0RmxvYXQzMih1Y3R4LmkgLSA0LCBTVFJVQ1RfRU5ESUFOKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdW5wYWNrX2RvdWJsZShkdmlldzogRGF0YVZpZXcsIHVjdHg6IHVucGFja19jb250ZXh0KTogbnVtYmVyIHtcclxuICB1Y3R4LmkgKz0gODtcclxuICByZXR1cm4gZHZpZXcuZ2V0RmxvYXQ2NCh1Y3R4LmkgLSA4LCBTVFJVQ1RfRU5ESUFOKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdW5wYWNrX3Nob3J0KGR2aWV3OiBEYXRhVmlldywgdWN0eDogdW5wYWNrX2NvbnRleHQpOiBudW1iZXIge1xyXG4gIHVjdHguaSArPSAyO1xyXG4gIHJldHVybiBkdmlldy5nZXRJbnQxNih1Y3R4LmkgLSAyLCBTVFJVQ1RfRU5ESUFOKTtcclxufVxyXG5cclxubGV0IF9zdGF0aWNfYXJyX3VzID0gbmV3IEFycmF5PG51bWJlcj4oMzIpO1xyXG5cclxuZnVuY3Rpb24gdW5wYWNrX3N0cmluZyhkYXRhOiBEYXRhVmlldywgdWN0eDogdW5wYWNrX2NvbnRleHQpOiBzdHJpbmcge1xyXG4gIGxldCBzbGVuID0gdW5wYWNrX2ludChkYXRhLCB1Y3R4KTtcclxuXHJcbiAgaWYgKCFzbGVuKSB7XHJcbiAgICByZXR1cm4gXCJcIjtcclxuICB9XHJcblxyXG4gIGxldCBhcnI6IG51bWJlcltdID0gc2xlbiA8IDIwNDggPyBfc3RhdGljX2Fycl91cyA6IG5ldyBBcnJheShzbGVuKTtcclxuXHJcbiAgYXJyLmxlbmd0aCA9IHNsZW47XHJcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzbGVuOyBpKyspIHtcclxuICAgIGFycltpXSA9IHVucGFja19ieXRlKGRhdGEsIHVjdHgpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGRlY29kZV91dGY4KGFycik7XHJcbn1cclxuXHJcbmxldCBfc3RhdGljX2Fycl91c3MgPSBuZXcgQXJyYXk8bnVtYmVyPigyMDQ4KTtcclxuXHJcbmZ1bmN0aW9uIHVucGFja19zdGF0aWNfc3RyaW5nKGRhdGE6IERhdGFWaWV3LCB1Y3R4OiB1bnBhY2tfY29udGV4dCwgbGVuZ3RoOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKFwiJ2xlbmd0aCcgY2Fubm90IGJlIHVuZGVmaW5lZCBpbiB1bnBhY2tfc3RhdGljX3N0cmluZygpXCIpO1xyXG5cclxuICBsZXQgYXJyOiBudW1iZXJbXSA9IGxlbmd0aCA8IDIwNDggPyBfc3RhdGljX2Fycl91c3MgOiBuZXcgQXJyYXkobGVuZ3RoKTtcclxuICBhcnIubGVuZ3RoID0gMDtcclxuXHJcbiAgbGV0IGRvbmUgPSBmYWxzZTtcclxuICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICBsZXQgYyA9IHVucGFja19ieXRlKGRhdGEsIHVjdHgpO1xyXG5cclxuICAgIGlmIChjID09PSAwKSB7XHJcbiAgICAgIGRvbmUgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghZG9uZSAmJiBjICE9PSAwKSB7XHJcbiAgICAgIGFyci5wdXNoKGMpO1xyXG4gICAgICAvL2Fyci5sZW5ndGgrKztcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHRydW5jYXRlX3V0ZjgoYXJyLCBsZW5ndGgpO1xyXG4gIHJldHVybiBkZWNvZGVfdXRmOChhcnIpO1xyXG59XHJcblxyXG52YXIgc3RydWN0X2JpbnBhY2sgPSAvKiNfX1BVUkVfXyovIE9iamVjdC5mcmVlemUoe1xyXG4gIF9fcHJvdG9fXzogbnVsbCxcclxuICBnZXQgU1RSVUNUX0VORElBTigpIHtcclxuICAgIHJldHVybiBTVFJVQ1RfRU5ESUFOO1xyXG4gIH0sXHJcbiAgc2V0QmluYXJ5RW5kaWFuICAgICA6IHNldEJpbmFyeUVuZGlhbixcclxuICB0ZW1wX2RhdGF2aWV3ICAgICAgIDogdGVtcF9kYXRhdmlldyxcclxuICB1aW50OF92aWV3ICAgICAgICAgIDogdWludDhfdmlldyxcclxuICB1bnBhY2tfY29udGV4dCAgICAgIDogdW5wYWNrX2NvbnRleHQsXHJcbiAgcGFja19ieXRlICAgICAgICAgICA6IHBhY2tfYnl0ZSxcclxuICBwYWNrX3NieXRlICAgICAgICAgIDogcGFja19zYnl0ZSxcclxuICBwYWNrX2J5dGVzICAgICAgICAgIDogcGFja19ieXRlcyxcclxuICBwYWNrX2ludCAgICAgICAgICAgIDogcGFja19pbnQsXHJcbiAgcGFja191aW50ICAgICAgICAgICA6IHBhY2tfdWludCxcclxuICBwYWNrX3VzaG9ydCAgICAgICAgIDogcGFja191c2hvcnQsXHJcbiAgcGFja19mbG9hdCAgICAgICAgICA6IHBhY2tfZmxvYXQsXHJcbiAgcGFja19kb3VibGUgICAgICAgICA6IHBhY2tfZG91YmxlLFxyXG4gIHBhY2tfc2hvcnQgICAgICAgICAgOiBwYWNrX3Nob3J0LFxyXG4gIGVuY29kZV91dGY4ICAgICAgICAgOiBlbmNvZGVfdXRmOCxcclxuICBkZWNvZGVfdXRmOCAgICAgICAgIDogZGVjb2RlX3V0ZjgsXHJcbiAgdGVzdF91dGY4ICAgICAgICAgICA6IHRlc3RfdXRmOCxcclxuICBwYWNrX3N0YXRpY19zdHJpbmcgIDogcGFja19zdGF0aWNfc3RyaW5nLFxyXG4gIHBhY2tfc3RyaW5nICAgICAgICAgOiBwYWNrX3N0cmluZyxcclxuICB1bnBhY2tfYnl0ZXMgICAgICAgIDogdW5wYWNrX2J5dGVzLFxyXG4gIHVucGFja19ieXRlICAgICAgICAgOiB1bnBhY2tfYnl0ZSxcclxuICB1bnBhY2tfc2J5dGUgICAgICAgIDogdW5wYWNrX3NieXRlLFxyXG4gIHVucGFja19pbnQgICAgICAgICAgOiB1bnBhY2tfaW50LFxyXG4gIHVucGFja191aW50ICAgICAgICAgOiB1bnBhY2tfdWludCxcclxuICB1bnBhY2tfdXNob3J0ICAgICAgIDogdW5wYWNrX3VzaG9ydCxcclxuICB1bnBhY2tfZmxvYXQgICAgICAgIDogdW5wYWNrX2Zsb2F0LFxyXG4gIHVucGFja19kb3VibGUgICAgICAgOiB1bnBhY2tfZG91YmxlLFxyXG4gIHVucGFja19zaG9ydCAgICAgICAgOiB1bnBhY2tfc2hvcnQsXHJcbiAgdW5wYWNrX3N0cmluZyAgICAgICA6IHVucGFja19zdHJpbmcsXHJcbiAgdW5wYWNrX3N0YXRpY19zdHJpbmc6IHVucGFja19zdGF0aWNfc3RyaW5nLFxyXG59KTtcclxuXHJcbi8qIC0tLS0gc3RydWN0IGZpZWxkIHR5cGVzIC0tLS0gKi9cclxuXHJcbmxldCB3YXJuaW5nbHZsJDEgPSAyO1xyXG5sZXQgZGVidWcgPSAwO1xyXG5cclxubGV0IF9zdGF0aWNfZW52Y29kZV9udWxsJDEgPSBcIlwiO1xyXG5sZXQgcGFja2VyX2RlYnVnJDE6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQ7XHJcbmxldCBwYWNrZXJfZGVidWdfc3RhcnQkMTogKGZ1bmNuYW1lPzogc3RyaW5nKSA9PiB2b2lkO1xyXG5sZXQgcGFja2VyX2RlYnVnX2VuZCQxOiAoZnVuY25hbWU/OiBzdHJpbmcpID0+IHZvaWQ7XHJcbmxldCBwYWNrZGVidWdfdGFibGV2ZWwgPSAwO1xyXG5cclxuZnVuY3Rpb24gX2dldF9wYWNrX2RlYnVnKCk6IHtcclxuICBwYWNrZXJfZGVidWc6IHR5cGVvZiBwYWNrZXJfZGVidWckMTtcclxuICBwYWNrZXJfZGVidWdfc3RhcnQ6IHR5cGVvZiBwYWNrZXJfZGVidWdfc3RhcnQkMTtcclxuICBwYWNrZXJfZGVidWdfZW5kOiB0eXBlb2YgcGFja2VyX2RlYnVnX2VuZCQxO1xyXG4gIGRlYnVnOiBudW1iZXI7XHJcbiAgd2FybmluZ2x2bDogbnVtYmVyO1xyXG59IHtcclxuICByZXR1cm4ge1xyXG4gICAgcGFja2VyX2RlYnVnICAgICAgOiBwYWNrZXJfZGVidWckMSxcclxuICAgIHBhY2tlcl9kZWJ1Z19zdGFydDogcGFja2VyX2RlYnVnX3N0YXJ0JDEsXHJcbiAgICBwYWNrZXJfZGVidWdfZW5kICA6IHBhY2tlcl9kZWJ1Z19lbmQkMSxcclxuICAgIGRlYnVnLFxyXG4gICAgd2FybmluZ2x2bDogd2FybmluZ2x2bCQxLFxyXG4gIH07XHJcbn1cclxuXHJcbmNsYXNzIGNhY2hlcmluZzxUPiBleHRlbmRzIEFycmF5PFQ+IHtcclxuICBjdXI6IG51bWJlcjtcclxuXHJcbiAgY29uc3RydWN0b3IoY2I6ICgpID0+IFQsIHRvdDogbnVtYmVyKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy5sZW5ndGggPSB0b3Q7XHJcbiAgICB0aGlzLmN1ciA9IDA7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b3Q7IGkrKykge1xyXG4gICAgICB0aGlzW2ldID0gY2IoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHN0YXRpYyBmcm9tQ29uc3RydWN0b3I8VD4oY2xzOiBuZXcgKCkgPT4gVCwgdG90OiBudW1iZXIpOiBjYWNoZXJpbmc8VD4ge1xyXG4gICAgcmV0dXJuIG5ldyBjYWNoZXJpbmcoKCkgPT4gbmV3IGNscygpLCB0b3QpO1xyXG4gIH1cclxuXHJcbiAgbmV4dCgpOiBUIHtcclxuICAgIGxldCByZXQgPSB0aGlzW3RoaXMuY3VyXTtcclxuXHJcbiAgICB0aGlzLmN1ciA9ICh0aGlzLmN1ciArIDEpICUgdGhpcy5sZW5ndGg7XHJcblxyXG4gICAgcmV0dXJuIHJldDtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbl90YWJzdHIkMSh0b3Q6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgbGV0IHJldCA9IFwiXCI7XHJcblxyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdG90OyBpKyspIHtcclxuICAgIHJldCArPSBcIiBcIjtcclxuICB9XHJcblxyXG4gIHJldHVybiByZXQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldFdhcm5pbmdNb2RlMih0OiBudW1iZXIpOiB2b2lkIHtcclxuICBpZiAodHlwZW9mIHQgIT09IFwibnVtYmVyXCIgfHwgaXNOYU4odCkpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGVkIGEgc2luZ2xlIG51bWJlciAoPj0gMCkgYXJndW1lbnQgdG8gc2V0V2FybmluZ01vZGVcIik7XHJcbiAgfVxyXG5cclxuICB3YXJuaW5nbHZsJDEgPSB0O1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXREZWJ1Z01vZGUyKHQ6IG51bWJlcik6IHZvaWQge1xyXG4gIGRlYnVnID0gdDtcclxuXHJcbiAgaWYgKGRlYnVnKSB7XHJcbiAgICBwYWNrZXJfZGVidWckMSA9IGZ1bmN0aW9uICguLi5hcmdzOiB1bmtub3duW10pIHtcclxuICAgICAgbGV0IHRhYiA9IGdlbl90YWJzdHIkMShwYWNrZGVidWdfdGFibGV2ZWwpO1xyXG5cclxuICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGNvbnNvbGUud2Fybih0YWIsIC4uLmFyZ3MpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnNvbGUud2FybihcIldhcm5pbmc6IHVuZGVmaW5lZCBtc2dcIik7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgICBwYWNrZXJfZGVidWdfc3RhcnQkMSA9IGZ1bmN0aW9uIChmdW5jbmFtZT86IHN0cmluZykge1xyXG4gICAgICBwYWNrZXJfZGVidWckMShcIlN0YXJ0IFwiICsgZnVuY25hbWUpO1xyXG4gICAgICBwYWNrZGVidWdfdGFibGV2ZWwrKztcclxuICAgIH07XHJcblxyXG4gICAgcGFja2VyX2RlYnVnX2VuZCQxID0gZnVuY3Rpb24gKGZ1bmNuYW1lPzogc3RyaW5nKSB7XHJcbiAgICAgIHBhY2tkZWJ1Z190YWJsZXZlbC0tO1xyXG5cclxuICAgICAgaWYgKGZ1bmNuYW1lKSB7XHJcbiAgICAgICAgcGFja2VyX2RlYnVnJDEoXCJMZWF2ZSBcIiArIGZ1bmNuYW1lKTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICB9IGVsc2Uge1xyXG4gICAgcGFja2VyX2RlYnVnJDEgPSBmdW5jdGlvbiAoKSB7fTtcclxuICAgIHBhY2tlcl9kZWJ1Z19zdGFydCQxID0gZnVuY3Rpb24gKCkge307XHJcbiAgICBwYWNrZXJfZGVidWdfZW5kJDEgPSBmdW5jdGlvbiAoKSB7fTtcclxuICB9XHJcbn1cclxuXHJcbnNldERlYnVnTW9kZTIoZGVidWcpO1xyXG5cclxuLyoqIFN0cnVjdGFibGUgY2xhc3MgaW50ZXJmYWNlICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgU3RydWN0YWJsZUNsYXNzIHtcclxuICBTVFJVQ1Q/OiBzdHJpbmc7XHJcbiAgc3RydWN0TmFtZT86IHN0cmluZztcclxuICBuYW1lOiBzdHJpbmc7XHJcbiAgcHJvdG90eXBlOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcclxuICBuZXdTVFJVQ1Q/OiAobG9hZGVyOiBTdHJ1Y3RSZWFkZXIpID0+IHVua25vd247XHJcbiAgZnJvbVNUUlVDVD86IChsb2FkZXI6IFN0cnVjdFJlYWRlcikgPT4gdW5rbm93bjtcclxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxyXG4gIG5ldyAoLi4uYXJnczogYW55W10pOiB1bmtub3duO1xyXG4gIF9fcHJvdG9fXz86IFN0cnVjdGFibGVDbGFzcztcclxufVxyXG5cclxuLyoqIFRoZSBsb2FkZXIgY2FsbGJhY2sgdHlwZSAqL1xyXG5leHBvcnQgdHlwZSBTdHJ1Y3RSZWFkZXI8VCA9IGFueT4gPSAob2JqOiBUKSA9PiB2b2lkO1xyXG5cclxuaW50ZXJmYWNlIFN0cnVjdEZpZWxkVHlwZURlZmluZSB7XHJcbiAgdHlwZTogbnVtYmVyO1xyXG4gIG5hbWU6IHN0cmluZztcclxufVxyXG5cclxuaW50ZXJmYWNlIEZha2VGaWVsZCB7XHJcbiAgdHlwZTogU3RydWN0VHlwZSB8IHVuZGVmaW5lZDtcclxuICBnZXQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcclxuICBzZXQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcclxufVxyXG5cclxuY29uc3QgU3RydWN0RmllbGRUeXBlczogKHR5cGVvZiBTdHJ1Y3RGaWVsZFR5cGUpW10gPSBbXTtcclxuY29uc3QgU3RydWN0RmllbGRUeXBlTWFwOiBSZWNvcmQ8bnVtYmVyLCB0eXBlb2YgU3RydWN0RmllbGRUeXBlPiA9IHt9O1xyXG5cclxuZnVuY3Rpb24gcGFja051bGwobWFuYWdlcjogU1RSVUNULCBkYXRhOiBudW1iZXJbXSwgZmllbGQ6IFN0cnVjdEZpZWxkLCB0eXBlOiBTdHJ1Y3RUeXBlKTogdm9pZCB7XHJcbiAgU3RydWN0RmllbGRUeXBlTWFwW3R5cGUudHlwZV0ucGFja051bGwobWFuYWdlciwgZGF0YSwgZmllbGQsIHR5cGUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0b0pTT04oXHJcbiAgbWFuYWdlcjogU1RSVUNULFxyXG4gIHZhbDogdW5rbm93bixcclxuICBvYmo6IHVua25vd24sXHJcbiAgZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gIHR5cGU6IFN0cnVjdFR5cGVcclxuKTogdW5rbm93biB7XHJcbiAgcmV0dXJuIFN0cnVjdEZpZWxkVHlwZU1hcFt0eXBlLnR5cGVdLnRvSlNPTihtYW5hZ2VyLCB2YWwsIG9iaiwgZmllbGQsIHR5cGUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmcm9tSlNPTihcclxuICBtYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgdmFsOiB1bmtub3duLFxyXG4gIG9iajogdW5rbm93bixcclxuICBmaWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgdHlwZTogU3RydWN0VHlwZSxcclxuICBpbnN0YW5jZTogdW5rbm93blxyXG4pOiB1bmtub3duIHtcclxuICByZXR1cm4gU3RydWN0RmllbGRUeXBlTWFwW3R5cGUudHlwZV0uZnJvbUpTT04obWFuYWdlciwgdmFsLCBvYmosIGZpZWxkLCB0eXBlLCBpbnN0YW5jZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZvcm1hdEpTT04kMShcclxuICBtYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgdmFsOiB1bmtub3duLFxyXG4gIG9iajogdW5rbm93bixcclxuICBmaWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgdHlwZTogU3RydWN0VHlwZSxcclxuICBpbnN0YW5jZTogdW5rbm93bixcclxuICB0bHZsOiBudW1iZXIgPSAwXHJcbik6IHN0cmluZyB7XHJcbiAgcmV0dXJuIFN0cnVjdEZpZWxkVHlwZU1hcFt0eXBlLnR5cGVdLmZvcm1hdEpTT04obWFuYWdlciwgdmFsLCBvYmosIGZpZWxkLCB0eXBlLCBpbnN0YW5jZSwgdGx2bCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHZhbGlkYXRlSlNPTiQxKFxyXG4gIG1hbmFnZXI6IFNUUlVDVCxcclxuICB2YWw6IHVua25vd24sXHJcbiAgb2JqOiB1bmtub3duLFxyXG4gIGZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICB0eXBlOiBTdHJ1Y3RUeXBlLFxyXG4gIGluc3RhbmNlOiB1bmtub3duLFxyXG4gIF9hYnN0cmFjdEtleT86IHN0cmluZ1xyXG4pOiBib29sZWFuIHwgc3RyaW5nIHtcclxuICByZXR1cm4gU3RydWN0RmllbGRUeXBlTWFwW3R5cGUudHlwZV0udmFsaWRhdGVKU09OKG1hbmFnZXIsIHZhbCwgb2JqLCBmaWVsZCwgdHlwZSwgaW5zdGFuY2UsIF9hYnN0cmFjdEtleSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVucGFja19maWVsZChtYW5hZ2VyOiBTVFJVQ1QsIGRhdGE6IERhdGFWaWV3LCB0eXBlOiBTdHJ1Y3RUeXBlLCB1Y3R4OiB1bnBhY2tfY29udGV4dCk6IHVua25vd24ge1xyXG4gIGxldCBuYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcblxyXG4gIGlmIChkZWJ1Zykge1xyXG4gICAgbmFtZSA9IFN0cnVjdEZpZWxkVHlwZU1hcFt0eXBlLnR5cGVdLmRlZmluZSgpLm5hbWU7XHJcbiAgICBwYWNrZXJfZGVidWdfc3RhcnQkMShcIlIgXCIgKyBuYW1lKTtcclxuICB9XHJcblxyXG4gIGxldCByZXQgPSBTdHJ1Y3RGaWVsZFR5cGVNYXBbdHlwZS50eXBlXS51bnBhY2sobWFuYWdlciwgZGF0YSwgdHlwZSwgdWN0eCk7XHJcblxyXG4gIGlmIChkZWJ1Zykge1xyXG4gICAgcGFja2VyX2RlYnVnX2VuZCQxKCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmV0O1xyXG59XHJcblxyXG5sZXQgZmFrZUZpZWxkcyA9IG5ldyBjYWNoZXJpbmc8RmFrZUZpZWxkPigoKSA9PiB7XHJcbiAgcmV0dXJuIHsgdHlwZTogdW5kZWZpbmVkLCBnZXQ6IHVuZGVmaW5lZCwgc2V0OiB1bmRlZmluZWQgfTtcclxufSwgMjU2KTtcclxuXHJcbmZ1bmN0aW9uIGZtdF90eXBlKHR5cGU6IFN0cnVjdFR5cGUpOiBzdHJpbmcge1xyXG4gIHJldHVybiBTdHJ1Y3RGaWVsZFR5cGVNYXBbdHlwZS50eXBlXS5mb3JtYXQodHlwZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRvX3BhY2soXHJcbiAgbWFuYWdlcjogU1RSVUNULFxyXG4gIGRhdGE6IG51bWJlcltdLFxyXG4gIHZhbDogdW5rbm93bixcclxuICBvYmo6IHVua25vd24sXHJcbiAgZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gIHR5cGU6IFN0cnVjdFR5cGUgfCBudW1iZXJcclxuKTogdm9pZCB7XHJcbiAgbGV0IG5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcclxuXHJcbiAgaWYgKGRlYnVnKSB7XHJcbiAgICBsZXQgdCA9IHR5cGUgYXMgU3RydWN0VHlwZTtcclxuICAgIG5hbWUgPSBTdHJ1Y3RGaWVsZFR5cGVNYXBbdC50eXBlXS5kZWZpbmUoKS5uYW1lO1xyXG4gICAgcGFja2VyX2RlYnVnX3N0YXJ0JDEoXCJXIFwiICsgbmFtZSk7XHJcbiAgfVxyXG5cclxuICBsZXQgdHlwZWlkOiBudW1iZXI7XHJcbiAgaWYgKHR5cGVvZiB0eXBlICE9PSBcIm51bWJlclwiKSB7XHJcbiAgICB0eXBlaWQgPSB0eXBlLnR5cGU7XHJcbiAgfSBlbHNlIHtcclxuICAgIHR5cGVpZCA9IHR5cGU7XHJcbiAgfVxyXG5cclxuICBsZXQgcmV0ID0gU3RydWN0RmllbGRUeXBlTWFwW3R5cGVpZF0ucGFjayhtYW5hZ2VyLCBkYXRhLCB2YWwsIG9iaiwgZmllbGQsIHR5cGUgYXMgU3RydWN0VHlwZSk7XHJcblxyXG4gIGlmIChkZWJ1Zykge1xyXG4gICAgcGFja2VyX2RlYnVnX2VuZCQxKCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmV0O1xyXG59XHJcblxyXG5sZXQgX3dzX2VudiQxOiBbdW5rbm93biwgdW5rbm93bl1bXSA9IFtbdW5kZWZpbmVkLCB1bmRlZmluZWRdXTtcclxuXHJcbmNsYXNzIFN0cnVjdEZpZWxkVHlwZSB7XHJcbiAgc3RhdGljIHBhY2soXHJcbiAgICBfbWFuYWdlcjogU1RSVUNULFxyXG4gICAgX2RhdGE6IG51bWJlcltdLFxyXG4gICAgX3ZhbDogdW5rbm93bixcclxuICAgIF9vYmo6IHVua25vd24sXHJcbiAgICBfZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgX3R5cGU6IFN0cnVjdFR5cGVcclxuICApOiB2b2lkIHt9XHJcblxyXG4gIHN0YXRpYyB1bnBhY2soX21hbmFnZXI6IFNUUlVDVCwgX2RhdGE6IERhdGFWaWV3LCBfdHlwZTogU3RydWN0VHlwZSwgX3VjdHg6IHVucGFja19jb250ZXh0KTogdW5rbm93biB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHBhY2tOdWxsKG1hbmFnZXI6IFNUUlVDVCwgZGF0YTogbnVtYmVyW10sIGZpZWxkOiBTdHJ1Y3RGaWVsZCwgdHlwZTogU3RydWN0VHlwZSk6IHZvaWQge1xyXG4gICAgdGhpcy5wYWNrKG1hbmFnZXIsIGRhdGEsIDAsIDAsIGZpZWxkLCB0eXBlKTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBmb3JtYXQoX3R5cGU6IFN0cnVjdFR5cGUpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHRoaXMuZGVmaW5lKCkubmFtZTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyB0b0pTT04oXHJcbiAgICBfbWFuYWdlcjogU1RSVUNULFxyXG4gICAgdmFsOiB1bmtub3duLFxyXG4gICAgX29iajogdW5rbm93bixcclxuICAgIF9maWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgICBfdHlwZTogU3RydWN0VHlwZVxyXG4gICk6IHVua25vd24ge1xyXG4gICAgcmV0dXJuIHZhbDtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBmcm9tSlNPTihcclxuICAgIF9tYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBfb2JqOiB1bmtub3duLFxyXG4gICAgX2ZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICAgIF90eXBlOiBTdHJ1Y3RUeXBlLFxyXG4gICAgX2luc3RhbmNlOiB1bmtub3duXHJcbiAgKTogdW5rbm93biB7XHJcbiAgICByZXR1cm4gdmFsO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGZvcm1hdEpTT04oXHJcbiAgICBfbWFuYWdlcjogU1RSVUNULFxyXG4gICAgdmFsOiB1bmtub3duLFxyXG4gICAgX29iajogdW5rbm93bixcclxuICAgIF9maWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgICBfdHlwZTogU3RydWN0VHlwZSxcclxuICAgIF9pbnN0YW5jZTogdW5rbm93bixcclxuICAgIF90bHZsOiBudW1iZXJcclxuICApOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHZhbCk7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgdmFsaWRhdGVKU09OKFxyXG4gICAgX21hbmFnZXI6IFNUUlVDVCxcclxuICAgIF92YWw6IHVua25vd24sXHJcbiAgICBfb2JqOiB1bmtub3duLFxyXG4gICAgX2ZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICAgIF90eXBlOiBTdHJ1Y3RUeXBlLFxyXG4gICAgX2luc3RhbmNlOiB1bmtub3duLFxyXG4gICAgX2Fic3RyYWN0S2V5Pzogc3RyaW5nXHJcbiAgKTogYm9vbGVhbiB8IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICByZXR1cm4gZmFsc2UgdG8gb3ZlcnJpZGUgZGVmYXVsdFxyXG4gICBoZWxwZXIganMgZm9yIHBhY2tpbmdcclxuICAgKi9cclxuICBzdGF0aWMgdXNlSGVscGVySlMoX2ZpZWxkOiBTdHJ1Y3RGaWVsZCk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgRGVmaW5lIGZpZWxkIGNsYXNzIGluZm8uXHJcblxyXG4gICBFeGFtcGxlOlxyXG4gICA8cHJlPlxyXG4gICBzdGF0aWMgZGVmaW5lKCkge3JldHVybiB7XHJcbiAgICB0eXBlIDogU3RydWN0RW51bS5JTlQsXHJcbiAgICBuYW1lIDogXCJpbnRcIlxyXG4gIH19XHJcbiAgIDwvcHJlPlxyXG4gICAqL1xyXG4gIHN0YXRpYyBkZWZpbmUoKTogU3RydWN0RmllbGRUeXBlRGVmaW5lIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHR5cGU6IC0xLFxyXG4gICAgICBuYW1lOiBcIihlcnJvcilcIixcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgUmVnaXN0ZXIgZmllbGQgcGFja2VyL3VucGFja2VyIGNsYXNzLiAgV2lsbCB0aHJvdyBhbiBlcnJvciBpZiBkZWZpbmUoKSBtZXRob2QgaXMgYmFkLlxyXG4gICAqL1xyXG4gIHN0YXRpYyByZWdpc3RlcihjbHM6IHR5cGVvZiBTdHJ1Y3RGaWVsZFR5cGUpOiB2b2lkIHtcclxuICAgIGlmIChTdHJ1Y3RGaWVsZFR5cGVzLmluZGV4T2YoY2xzKSA+PSAwKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImNsYXNzIGFscmVhZHkgcmVnaXN0ZXJlZFwiKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoY2xzLmRlZmluZSA9PT0gU3RydWN0RmllbGRUeXBlLmRlZmluZSkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ5b3UgZm9yZ290IHRvIG1ha2UgYSBkZWZpbmUoKSBzdGF0aWMgbWV0aG9kXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjbHMuZGVmaW5lKCkudHlwZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImNscy5kZWZpbmUoKS50eXBlIHdhcyB1bmRlZmluZWQhXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjbHMuZGVmaW5lKCkudHlwZSBpbiBTdHJ1Y3RGaWVsZFR5cGVNYXApIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwidHlwZSBcIiArIGNscy5kZWZpbmUoKS50eXBlICsgXCIgaXMgdXNlZCBieSBhbm90aGVyIFN0cnVjdEZpZWxkVHlwZSBzdWJjbGFzc1wiKTtcclxuICAgIH1cclxuXHJcbiAgICBTdHJ1Y3RGaWVsZFR5cGVzLnB1c2goY2xzKTtcclxuICAgIFN0cnVjdEZpZWxkVHlwZU1hcFtjbHMuZGVmaW5lKCkudHlwZV0gPSBjbHM7XHJcbiAgfVxyXG59XHJcblxyXG5jbGFzcyBTdHJ1Y3RJbnRGaWVsZCBleHRlbmRzIFN0cnVjdEZpZWxkVHlwZSB7XHJcbiAgc3RhdGljIHBhY2soXHJcbiAgICBfbWFuYWdlcjogU1RSVUNULFxyXG4gICAgZGF0YTogbnVtYmVyW10sXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBfb2JqOiB1bmtub3duLFxyXG4gICAgX2ZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICAgIF90eXBlOiBTdHJ1Y3RUeXBlXHJcbiAgKTogdm9pZCB7XHJcbiAgICBwYWNrX2ludChkYXRhLCB2YWwgYXMgbnVtYmVyKTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyB1bnBhY2soX21hbmFnZXI6IFNUUlVDVCwgZGF0YTogRGF0YVZpZXcsIF90eXBlOiBTdHJ1Y3RUeXBlLCB1Y3R4OiB1bnBhY2tfY29udGV4dCk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gdW5wYWNrX2ludChkYXRhLCB1Y3R4KTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyB2YWxpZGF0ZUpTT04oXHJcbiAgICBfbWFuYWdlcjogU1RSVUNULFxyXG4gICAgdmFsOiB1bmtub3duLFxyXG4gICAgX29iajogdW5rbm93bixcclxuICAgIF9maWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgICBfdHlwZTogU3RydWN0VHlwZSxcclxuICAgIF9pbnN0YW5jZTogdW5rbm93blxyXG4gICk6IGJvb2xlYW4gfCBzdHJpbmcge1xyXG4gICAgaWYgKHR5cGVvZiB2YWwgIT09IFwibnVtYmVyXCIgfHwgdmFsICE9PSBNYXRoLmZsb29yKHZhbCkpIHtcclxuICAgICAgcmV0dXJuIFwiXCIgKyB2YWwgKyBcIiBpcyBub3QgYW4gaW50ZWdlclwiO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGRlZmluZSgpOiBTdHJ1Y3RGaWVsZFR5cGVEZWZpbmUge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdHlwZTogU3RydWN0RW51bS5JTlQsXHJcbiAgICAgIG5hbWU6IFwiaW50XCIsXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG5cclxuU3RydWN0RmllbGRUeXBlLnJlZ2lzdGVyKFN0cnVjdEludEZpZWxkKTtcclxuXHJcbmNsYXNzIFN0cnVjdEZsb2F0RmllbGQgZXh0ZW5kcyBTdHJ1Y3RGaWVsZFR5cGUge1xyXG4gIHN0YXRpYyBwYWNrKFxyXG4gICAgX21hbmFnZXI6IFNUUlVDVCxcclxuICAgIGRhdGE6IG51bWJlcltdLFxyXG4gICAgdmFsOiB1bmtub3duLFxyXG4gICAgX29iajogdW5rbm93bixcclxuICAgIF9maWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgICBfdHlwZTogU3RydWN0VHlwZVxyXG4gICk6IHZvaWQge1xyXG4gICAgcGFja19mbG9hdChkYXRhLCB2YWwgYXMgbnVtYmVyKTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyB1bnBhY2soX21hbmFnZXI6IFNUUlVDVCwgZGF0YTogRGF0YVZpZXcsIF90eXBlOiBTdHJ1Y3RUeXBlLCB1Y3R4OiB1bnBhY2tfY29udGV4dCk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gdW5wYWNrX2Zsb2F0KGRhdGEsIHVjdHgpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHZhbGlkYXRlSlNPTihcclxuICAgIF9tYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBfb2JqOiB1bmtub3duLFxyXG4gICAgX2ZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICAgIF90eXBlOiBTdHJ1Y3RUeXBlLFxyXG4gICAgX2luc3RhbmNlOiB1bmtub3duLFxyXG4gICAgX2Fic3RyYWN0S2V5Pzogc3RyaW5nXHJcbiAgKTogYm9vbGVhbiB8IHN0cmluZyB7XHJcbiAgICBpZiAodHlwZW9mIHZhbCAhPT0gXCJudW1iZXJcIikge1xyXG4gICAgICByZXR1cm4gXCJOb3QgYSBmbG9hdDogXCIgKyB2YWw7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgZGVmaW5lKCk6IFN0cnVjdEZpZWxkVHlwZURlZmluZSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0eXBlOiBTdHJ1Y3RFbnVtLkZMT0FULFxyXG4gICAgICBuYW1lOiBcImZsb2F0XCIsXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG5cclxuU3RydWN0RmllbGRUeXBlLnJlZ2lzdGVyKFN0cnVjdEZsb2F0RmllbGQpO1xyXG5cclxuY2xhc3MgU3RydWN0RG91YmxlRmllbGQgZXh0ZW5kcyBTdHJ1Y3RGaWVsZFR5cGUge1xyXG4gIHN0YXRpYyBwYWNrKFxyXG4gICAgX21hbmFnZXI6IFNUUlVDVCxcclxuICAgIGRhdGE6IG51bWJlcltdLFxyXG4gICAgdmFsOiB1bmtub3duLFxyXG4gICAgX29iajogdW5rbm93bixcclxuICAgIF9maWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgICBfdHlwZTogU3RydWN0VHlwZVxyXG4gICk6IHZvaWQge1xyXG4gICAgcGFja19kb3VibGUoZGF0YSwgdmFsIGFzIG51bWJlcik7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgdW5wYWNrKF9tYW5hZ2VyOiBTVFJVQ1QsIGRhdGE6IERhdGFWaWV3LCBfdHlwZTogU3RydWN0VHlwZSwgdWN0eDogdW5wYWNrX2NvbnRleHQpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIHVucGFja19kb3VibGUoZGF0YSwgdWN0eCk7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgdmFsaWRhdGVKU09OKFxyXG4gICAgX21hbmFnZXI6IFNUUlVDVCxcclxuICAgIHZhbDogdW5rbm93bixcclxuICAgIF9vYmo6IHVua25vd24sXHJcbiAgICBfZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgX3R5cGU6IFN0cnVjdFR5cGUsXHJcbiAgICBfaW5zdGFuY2U6IHVua25vd25cclxuICApOiBib29sZWFuIHwgc3RyaW5nIHtcclxuICAgIGlmICh0eXBlb2YgdmFsICE9PSBcIm51bWJlclwiKSB7XHJcbiAgICAgIHJldHVybiBcIk5vdCBhIGRvdWJsZTogXCIgKyB2YWw7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgZGVmaW5lKCk6IFN0cnVjdEZpZWxkVHlwZURlZmluZSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0eXBlOiBTdHJ1Y3RFbnVtLkRPVUJMRSxcclxuICAgICAgbmFtZTogXCJkb3VibGVcIixcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG5TdHJ1Y3RGaWVsZFR5cGUucmVnaXN0ZXIoU3RydWN0RG91YmxlRmllbGQpO1xyXG5cclxuY2xhc3MgU3RydWN0U3RyaW5nRmllbGQgZXh0ZW5kcyBTdHJ1Y3RGaWVsZFR5cGUge1xyXG4gIHN0YXRpYyBwYWNrKFxyXG4gICAgX21hbmFnZXI6IFNUUlVDVCxcclxuICAgIGRhdGE6IG51bWJlcltdLFxyXG4gICAgdmFsOiB1bmtub3duLFxyXG4gICAgX29iajogdW5rbm93bixcclxuICAgIF9maWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgICBfdHlwZTogU3RydWN0VHlwZVxyXG4gICk6IHZvaWQge1xyXG4gICAgdmFsID0gIXZhbCA/IFwiXCIgOiB2YWw7XHJcblxyXG4gICAgcGFja19zdHJpbmcoZGF0YSwgdmFsIGFzIHN0cmluZyk7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgdmFsaWRhdGVKU09OKFxyXG4gICAgX21hbmFnZXI6IFNUUlVDVCxcclxuICAgIHZhbDogdW5rbm93bixcclxuICAgIF9vYmo6IHVua25vd24sXHJcbiAgICBfZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgX3R5cGU6IFN0cnVjdFR5cGUsXHJcbiAgICBfaW5zdGFuY2U6IHVua25vd25cclxuICApOiBib29sZWFuIHwgc3RyaW5nIHtcclxuICAgIGlmICh0eXBlb2YgdmFsICE9PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgIHJldHVybiBcIk5vdCBhIHN0cmluZzogXCIgKyB2YWw7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgcGFja051bGwobWFuYWdlcjogU1RSVUNULCBkYXRhOiBudW1iZXJbXSwgZmllbGQ6IFN0cnVjdEZpZWxkLCB0eXBlOiBTdHJ1Y3RUeXBlKTogdm9pZCB7XHJcbiAgICB0aGlzLnBhY2sobWFuYWdlciwgZGF0YSwgXCJcIiwgMCwgZmllbGQsIHR5cGUpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHVucGFjayhfbWFuYWdlcjogU1RSVUNULCBkYXRhOiBEYXRhVmlldywgX3R5cGU6IFN0cnVjdFR5cGUsIHVjdHg6IHVucGFja19jb250ZXh0KTogc3RyaW5nIHtcclxuICAgIHJldHVybiB1bnBhY2tfc3RyaW5nKGRhdGEsIHVjdHgpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGRlZmluZSgpOiBTdHJ1Y3RGaWVsZFR5cGVEZWZpbmUge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdHlwZTogU3RydWN0RW51bS5TVFJJTkcsXHJcbiAgICAgIG5hbWU6IFwic3RyaW5nXCIsXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG5cclxuU3RydWN0RmllbGRUeXBlLnJlZ2lzdGVyKFN0cnVjdFN0cmluZ0ZpZWxkKTtcclxuXHJcbmNsYXNzIFN0cnVjdFN0YXRpY1N0cmluZ0ZpZWxkIGV4dGVuZHMgU3RydWN0RmllbGRUeXBlIHtcclxuICBzdGF0aWMgcGFjayhcclxuICAgIF9tYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICBkYXRhOiBudW1iZXJbXSxcclxuICAgIHZhbDogdW5rbm93bixcclxuICAgIF9vYmo6IHVua25vd24sXHJcbiAgICBfZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgdHlwZTogU3RydWN0VHlwZVxyXG4gICk6IHZvaWQge1xyXG4gICAgdmFsID0gIXZhbCA/IFwiXCIgOiB2YWw7XHJcblxyXG4gICAgcGFja19zdGF0aWNfc3RyaW5nKGRhdGEsIHZhbCBhcyBzdHJpbmcsICh0eXBlLmRhdGEgYXMgeyBtYXhsZW5ndGg6IG51bWJlciB9KS5tYXhsZW5ndGgpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHZhbGlkYXRlSlNPTihcclxuICAgIF9tYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBfb2JqOiB1bmtub3duLFxyXG4gICAgX2ZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICAgIHR5cGU6IFN0cnVjdFR5cGUsXHJcbiAgICBfaW5zdGFuY2U6IHVua25vd25cclxuICApOiBib29sZWFuIHwgc3RyaW5nIHtcclxuICAgIGlmICh0eXBlb2YgdmFsICE9PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgIHJldHVybiBcIk5vdCBhIHN0cmluZzogXCIgKyB2YWw7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHZhbC5sZW5ndGggPiAodHlwZS5kYXRhIGFzIHsgbWF4bGVuZ3RoOiBudW1iZXIgfSkubWF4bGVuZ3RoKSB7XHJcbiAgICAgIHJldHVybiBcIlN0cmluZyBpcyB0b28gYmlnOyBsaW1pdCBpcyBcIiArICh0eXBlLmRhdGEgYXMgeyBtYXhsZW5ndGg6IG51bWJlciB9KS5tYXhsZW5ndGggKyBcIjsgc3RyaW5nOlwiICsgdmFsO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGZvcm1hdCh0eXBlOiBTdHJ1Y3RUeXBlKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBgc3RhdGljX3N0cmluZ1skeyh0eXBlLmRhdGEgYXMgeyBtYXhsZW5ndGg6IG51bWJlciB9KS5tYXhsZW5ndGh9XWA7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgcGFja051bGwobWFuYWdlcjogU1RSVUNULCBkYXRhOiBudW1iZXJbXSwgZmllbGQ6IFN0cnVjdEZpZWxkLCB0eXBlOiBTdHJ1Y3RUeXBlKTogdm9pZCB7XHJcbiAgICB0aGlzLnBhY2sobWFuYWdlciwgZGF0YSwgXCJcIiwgMCwgZmllbGQsIHR5cGUpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHVucGFjayhfbWFuYWdlcjogU1RSVUNULCBkYXRhOiBEYXRhVmlldywgdHlwZTogU3RydWN0VHlwZSwgdWN0eDogdW5wYWNrX2NvbnRleHQpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHVucGFja19zdGF0aWNfc3RyaW5nKGRhdGEsIHVjdHgsICh0eXBlLmRhdGEgYXMgeyBtYXhsZW5ndGg6IG51bWJlciB9KS5tYXhsZW5ndGgpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGRlZmluZSgpOiBTdHJ1Y3RGaWVsZFR5cGVEZWZpbmUge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdHlwZTogU3RydWN0RW51bS5TVEFUSUNfU1RSSU5HLFxyXG4gICAgICBuYW1lOiBcInN0YXRpY19zdHJpbmdcIixcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG5TdHJ1Y3RGaWVsZFR5cGUucmVnaXN0ZXIoU3RydWN0U3RhdGljU3RyaW5nRmllbGQpO1xyXG5cclxuY2xhc3MgU3RydWN0U3RydWN0RmllbGQgZXh0ZW5kcyBTdHJ1Y3RGaWVsZFR5cGUge1xyXG4gIHN0YXRpYyBwYWNrKFxyXG4gICAgbWFuYWdlcjogU1RSVUNULFxyXG4gICAgZGF0YTogbnVtYmVyW10sXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBfb2JqOiB1bmtub3duLFxyXG4gICAgX2ZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICAgIHR5cGU6IFN0cnVjdFR5cGVcclxuICApOiB2b2lkIHtcclxuICAgIGxldCBzdHQgPSBtYW5hZ2VyLmdldF9zdHJ1Y3QodHlwZS5kYXRhIGFzIHN0cmluZyk7XHJcblxyXG4gICAgcGFja2VyX2RlYnVnJDEoXCJzdHJ1Y3RcIiwgc3R0Lm5hbWUpO1xyXG5cclxuICAgIG1hbmFnZXIud3JpdGVfc3RydWN0KGRhdGEsIHZhbCwgc3R0KTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyB2YWxpZGF0ZUpTT04oXHJcbiAgICBtYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBfb2JqOiB1bmtub3duLFxyXG4gICAgX2ZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICAgIHR5cGU6IFN0cnVjdFR5cGUsXHJcbiAgICBfaW5zdGFuY2U6IHVua25vd24sXHJcbiAgICBfYWJzdHJhY3RLZXk/OiBzdHJpbmdcclxuICApOiBib29sZWFuIHwgc3RyaW5nIHtcclxuICAgIGxldCBzdHQgPSBtYW5hZ2VyLmdldF9zdHJ1Y3QodHlwZS5kYXRhIGFzIHN0cmluZyk7XHJcblxyXG4gICAgaWYgKCF2YWwpIHtcclxuICAgICAgcmV0dXJuIFwiRXhwZWN0ZWQgXCIgKyBzdHQubmFtZSArIFwiIG9iamVjdFwiO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBtYW5hZ2VyLnZhbGlkYXRlSlNPTkludGVybih2YWwsIHN0dCwgX2Fic3RyYWN0S2V5KTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBmb3JtYXQodHlwZTogU3RydWN0VHlwZSk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdHlwZS5kYXRhIGFzIHN0cmluZztcclxuICB9XHJcblxyXG4gIHN0YXRpYyBmcm9tSlNPTihcclxuICAgIG1hbmFnZXI6IFNUUlVDVCxcclxuICAgIHZhbDogdW5rbm93bixcclxuICAgIF9vYmo6IHVua25vd24sXHJcbiAgICBfZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgdHlwZTogU3RydWN0VHlwZSxcclxuICAgIGluc3RhbmNlOiB1bmtub3duXHJcbiAgKTogdW5rbm93biB7XHJcbiAgICBsZXQgc3R0ID0gbWFuYWdlci5nZXRfc3RydWN0KHR5cGUuZGF0YSBhcyBzdHJpbmcpO1xyXG5cclxuICAgIHJldHVybiBtYW5hZ2VyLnJlYWRKU09OKHZhbCwgc3R0LCBpbnN0YW5jZSk7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgZm9ybWF0SlNPTihcclxuICAgIG1hbmFnZXI6IFNUUlVDVCxcclxuICAgIHZhbDogdW5rbm93bixcclxuICAgIF9vYmo6IHVua25vd24sXHJcbiAgICBfZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgdHlwZTogU3RydWN0VHlwZSxcclxuICAgIF9pbnN0YW5jZTogdW5rbm93bixcclxuICAgIHRsdmw6IG51bWJlclxyXG4gICk6IHN0cmluZyB7XHJcbiAgICBsZXQgc3R0ID0gbWFuYWdlci5nZXRfc3RydWN0KHR5cGUuZGF0YSBhcyBzdHJpbmcpO1xyXG5cclxuICAgIHJldHVybiBtYW5hZ2VyLmZvcm1hdEpTT05faW50ZXJuKHZhbCwgc3R0LCBfZmllbGQgYXMgU3RydWN0RmllbGQsIHRsdmwpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHRvSlNPTihcclxuICAgIG1hbmFnZXI6IFNUUlVDVCxcclxuICAgIHZhbDogdW5rbm93bixcclxuICAgIF9vYmo6IHVua25vd24sXHJcbiAgICBfZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgdHlwZTogU3RydWN0VHlwZVxyXG4gICk6IHVua25vd24ge1xyXG4gICAgbGV0IHN0dCA9IG1hbmFnZXIuZ2V0X3N0cnVjdCh0eXBlLmRhdGEgYXMgc3RyaW5nKTtcclxuICAgIHJldHVybiBtYW5hZ2VyLndyaXRlSlNPTih2YWwgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4sIHN0dCk7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgdW5wYWNrSW50byhtYW5hZ2VyOiBTVFJVQ1QsIGRhdGE6IERhdGFWaWV3LCB0eXBlOiBTdHJ1Y3RUeXBlLCB1Y3R4OiB1bnBhY2tfY29udGV4dCwgZGVzdDogdW5rbm93bik6IHVua25vd24ge1xyXG4gICAgbGV0IGNsczIgPSBtYW5hZ2VyLmdldF9zdHJ1Y3RfY2xzKHR5cGUuZGF0YSBhcyBzdHJpbmcpO1xyXG5cclxuICAgIHBhY2tlcl9kZWJ1ZyQxKFwic3RydWN0XCIsIGNsczIgPyBjbHMyLm5hbWUgOiBcIihlcnJvcilcIik7XHJcbiAgICByZXR1cm4gbWFuYWdlci5yZWFkX29iamVjdChkYXRhLCBjbHMyLCB1Y3R4LCBkZXN0KTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBwYWNrTnVsbChtYW5hZ2VyOiBTVFJVQ1QsIGRhdGE6IG51bWJlcltdLCBfZmllbGQ6IFN0cnVjdEZpZWxkLCB0eXBlOiBTdHJ1Y3RUeXBlKTogdm9pZCB7XHJcbiAgICBsZXQgc3R0ID0gbWFuYWdlci5nZXRfc3RydWN0KHR5cGUuZGF0YSBhcyBzdHJpbmcpO1xyXG5cclxuICAgIHBhY2tlcl9kZWJ1ZyQxKFwic3RydWN0XCIsIHR5cGUpO1xyXG5cclxuICAgIGZvciAobGV0IGZpZWxkMiBvZiBzdHQuZmllbGRzKSB7XHJcbiAgICAgIGxldCB0eXBlMiA9IGZpZWxkMi50eXBlO1xyXG5cclxuICAgICAgcGFja051bGwobWFuYWdlciwgZGF0YSwgZmllbGQyLCB0eXBlMik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgdW5wYWNrKG1hbmFnZXI6IFNUUlVDVCwgZGF0YTogRGF0YVZpZXcsIHR5cGU6IFN0cnVjdFR5cGUsIHVjdHg6IHVucGFja19jb250ZXh0KTogdW5rbm93biB7XHJcbiAgICBsZXQgY2xzMiA9IG1hbmFnZXIuZ2V0X3N0cnVjdF9jbHModHlwZS5kYXRhIGFzIHN0cmluZyk7XHJcbiAgICBwYWNrZXJfZGVidWckMShcInN0cnVjdFwiLCBjbHMyID8gY2xzMi5uYW1lIDogXCIoZXJyb3IpXCIpO1xyXG5cclxuICAgIHJldHVybiBtYW5hZ2VyLnJlYWRfb2JqZWN0KGRhdGEsIGNsczIsIHVjdHgpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGRlZmluZSgpOiBTdHJ1Y3RGaWVsZFR5cGVEZWZpbmUge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdHlwZTogU3RydWN0RW51bS5TVFJVQ1QsXHJcbiAgICAgIG5hbWU6IFwic3RydWN0XCIsXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG5cclxuU3RydWN0RmllbGRUeXBlLnJlZ2lzdGVyKFN0cnVjdFN0cnVjdEZpZWxkKTtcclxuXHJcbmNsYXNzIFN0cnVjdFRTdHJ1Y3RGaWVsZCBleHRlbmRzIFN0cnVjdEZpZWxkVHlwZSB7XHJcbiAgc3RhdGljIHBhY2soXHJcbiAgICBtYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICBkYXRhOiBudW1iZXJbXSxcclxuICAgIHZhbDogdW5rbm93bixcclxuICAgIF9vYmo6IHVua25vd24sXHJcbiAgICBfZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgdHlwZTogU3RydWN0VHlwZVxyXG4gICk6IHZvaWQge1xyXG4gICAgbGV0IGNscyA9IG1hbmFnZXIuZ2V0X3N0cnVjdF9jbHModHlwZS5kYXRhIGFzIHN0cmluZyk7XHJcbiAgICBsZXQgc3R0ID0gbWFuYWdlci5nZXRfc3RydWN0KHR5cGUuZGF0YSBhcyBzdHJpbmcpO1xyXG5cclxuICAgIGNvbnN0IGtleXdvcmRzID0gKG1hbmFnZXIuY29uc3RydWN0b3IgYXMgdHlwZW9mIFNUUlVDVCkua2V5d29yZHM7XHJcblxyXG4gICAgbGV0IHZhbE9iaiA9IHZhbCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiAmIHsgY29uc3RydWN0b3I6IFN0cnVjdGFibGVDbGFzcyB9O1xyXG5cclxuICAgIC8vbWFrZSBzdXJlIGluaGVyaXRhbmNlIGlzIGNvcnJlY3RcclxuICAgIGlmICh2YWxPYmouY29uc3RydWN0b3Iuc3RydWN0TmFtZSAhPT0gdHlwZS5kYXRhICYmIHZhbCBpbnN0YW5jZW9mIChjbHMgYXMgRnVuY3Rpb24pKSB7XHJcbiAgICAgIHN0dCA9IG1hbmFnZXIuZ2V0X3N0cnVjdCh2YWxPYmouY29uc3RydWN0b3Iuc3RydWN0TmFtZSEpO1xyXG4gICAgfSBlbHNlIGlmICh2YWxPYmouY29uc3RydWN0b3Iuc3RydWN0TmFtZSA9PT0gdHlwZS5kYXRhKSB7XHJcbiAgICAgIHN0dCA9IG1hbmFnZXIuZ2V0X3N0cnVjdCh0eXBlLmRhdGEgYXMgc3RyaW5nKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnNvbGUudHJhY2UoKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQmFkIHN0cnVjdCBcIiArIHZhbE9iai5jb25zdHJ1Y3Rvci5zdHJ1Y3ROYW1lICsgXCIgcGFzc2VkIHRvIHdyaXRlX3N0cnVjdFwiKTtcclxuICAgIH1cclxuXHJcbiAgICBwYWNrZXJfZGVidWckMShcImludCBcIiArIHN0dC5pZCk7XHJcblxyXG4gICAgcGFja19pbnQoZGF0YSwgc3R0LmlkKTtcclxuICAgIG1hbmFnZXIud3JpdGVfc3RydWN0KGRhdGEsIHZhbCwgc3R0KTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyB2YWxpZGF0ZUpTT04oXHJcbiAgICBtYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBfb2JqOiB1bmtub3duLFxyXG4gICAgX2ZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICAgIHR5cGU6IFN0cnVjdFR5cGUsXHJcbiAgICBfaW5zdGFuY2U6IHVua25vd24sXHJcbiAgICBfYWJzdHJhY3RLZXk/OiBzdHJpbmdcclxuICApOiBib29sZWFuIHwgc3RyaW5nIHtcclxuICAgIGxldCBrZXkgPSB0eXBlLmpzb25LZXl3b3JkITtcclxuXHJcbiAgICBpZiAodHlwZW9mIHZhbCAhPT0gXCJvYmplY3RcIikge1xyXG4gICAgICByZXR1cm4gdHlwZW9mIHZhbCArIFwiIGlzIG5vdCBhbiBvYmplY3RcIjtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgdmFsT2JqID0gdmFsIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xyXG4gICAgbGV0IHN0dCA9IG1hbmFnZXIuZ2V0X3N0cnVjdCh2YWxPYmpba2V5XSBhcyBzdHJpbmcpO1xyXG4gICAgbGV0IGNsczogU3RydWN0YWJsZUNsYXNzID0gbWFuYWdlci5nZXRfc3RydWN0X2NscyhzdHQubmFtZSkgYXMgU3RydWN0YWJsZUNsYXNzO1xyXG4gICAgbGV0IHBhcmVudGNscyA9IG1hbmFnZXIuZ2V0X3N0cnVjdF9jbHModHlwZS5kYXRhIGFzIHN0cmluZyk7XHJcblxyXG4gICAgbGV0IG9rID0gZmFsc2U7XHJcblxyXG4gICAgZG8ge1xyXG4gICAgICBpZiAoY2xzID09PSBwYXJlbnRjbHMpIHtcclxuICAgICAgICBvayA9IHRydWU7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNscyA9IChjbHMucHJvdG90eXBlIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5fX3Byb3RvX18hLmNvbnN0cnVjdG9yIGFzIHVua25vd24gYXMgU3RydWN0YWJsZUNsYXNzO1xyXG4gICAgfSB3aGlsZSAoY2xzICYmIGNscyAhPT0gKE9iamVjdCBhcyB1bmtub3duKSk7XHJcblxyXG4gICAgaWYgKCFvaykge1xyXG4gICAgICByZXR1cm4gc3R0Lm5hbWUgKyBcIiBpcyBub3QgYSBjaGlsZCBjbGFzcyBvZmYgXCIgKyB0eXBlLmRhdGE7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG1hbmFnZXIudmFsaWRhdGVKU09OSW50ZXJuKHZhbCwgc3R0LCB0eXBlLmpzb25LZXl3b3JkKTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBmcm9tSlNPTihcclxuICAgIG1hbmFnZXI6IFNUUlVDVCxcclxuICAgIHZhbDogdW5rbm93bixcclxuICAgIF9vYmo6IHVua25vd24sXHJcbiAgICBfZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgdHlwZTogU3RydWN0VHlwZSxcclxuICAgIGluc3RhbmNlOiB1bmtub3duXHJcbiAgKTogdW5rbm93biB7XHJcbiAgICBsZXQga2V5ID0gdHlwZS5qc29uS2V5d29yZCE7XHJcblxyXG4gICAgbGV0IHN0dCA9IG1hbmFnZXIuZ2V0X3N0cnVjdCgodmFsIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVtrZXldIGFzIHN0cmluZyk7XHJcblxyXG4gICAgcmV0dXJuIG1hbmFnZXIucmVhZEpTT04odmFsLCBzdHQsIGluc3RhbmNlKTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBmb3JtYXRKU09OKFxyXG4gICAgbWFuYWdlcjogU1RSVUNULFxyXG4gICAgdmFsOiB1bmtub3duLFxyXG4gICAgX29iajogdW5rbm93bixcclxuICAgIF9maWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgICB0eXBlOiBTdHJ1Y3RUeXBlLFxyXG4gICAgX2luc3RhbmNlOiB1bmtub3duLFxyXG4gICAgdGx2bDogbnVtYmVyXHJcbiAgKTogc3RyaW5nIHtcclxuICAgIGxldCBrZXkgPSB0eXBlLmpzb25LZXl3b3JkITtcclxuXHJcbiAgICBsZXQgc3R0ID0gbWFuYWdlci5nZXRfc3RydWN0KCh2YWwgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW2tleV0gYXMgc3RyaW5nKTtcclxuXHJcbiAgICByZXR1cm4gbWFuYWdlci5mb3JtYXRKU09OX2ludGVybih2YWwsIHN0dCwgX2ZpZWxkIGFzIFN0cnVjdEZpZWxkLCB0bHZsKTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyB0b0pTT04oXHJcbiAgICBtYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBfb2JqOiB1bmtub3duLFxyXG4gICAgX2ZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICAgIHR5cGU6IFN0cnVjdFR5cGVcclxuICApOiB1bmtub3duIHtcclxuICAgIGNvbnN0IGtleXdvcmRzID0gKG1hbmFnZXIuY29uc3RydWN0b3IgYXMgdHlwZW9mIFNUUlVDVCkua2V5d29yZHM7XHJcblxyXG4gICAgbGV0IHZhbE9iaiA9IHZhbCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiAmIHsgY29uc3RydWN0b3I6IFN0cnVjdGFibGVDbGFzcyB9O1xyXG4gICAgbGV0IHN0dCA9IG1hbmFnZXIuZ2V0X3N0cnVjdCh2YWxPYmouY29uc3RydWN0b3Iuc3RydWN0TmFtZSEpO1xyXG4gICAgbGV0IHJldCA9IG1hbmFnZXIud3JpdGVKU09OKHZhbCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiwgc3R0KSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcclxuXHJcbiAgICByZXRbdHlwZS5qc29uS2V5d29yZCFdID0gXCJcIiArIHN0dC5uYW1lO1xyXG5cclxuICAgIHJldHVybiByZXQ7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgcGFja051bGwobWFuYWdlcjogU1RSVUNULCBkYXRhOiBudW1iZXJbXSwgZmllbGQ6IFN0cnVjdEZpZWxkLCB0eXBlOiBTdHJ1Y3RUeXBlKTogdm9pZCB7XHJcbiAgICBsZXQgc3R0ID0gbWFuYWdlci5nZXRfc3RydWN0KHR5cGUuZGF0YSBhcyBzdHJpbmcpO1xyXG5cclxuICAgIHBhY2tfaW50KGRhdGEsIHN0dC5pZCk7XHJcbiAgICBwYWNrTnVsbChtYW5hZ2VyLCBkYXRhLCBmaWVsZCwgeyB0eXBlOiBTdHJ1Y3RFbnVtLlNUUlVDVCwgZGF0YTogdHlwZS5kYXRhIH0pO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGZvcm1hdCh0eXBlOiBTdHJ1Y3RUeXBlKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBcImFic3RyYWN0KFwiICsgdHlwZS5kYXRhICsgXCIpXCI7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgdW5wYWNrSW50byhtYW5hZ2VyOiBTVFJVQ1QsIGRhdGE6IERhdGFWaWV3LCB0eXBlOiBTdHJ1Y3RUeXBlLCB1Y3R4OiB1bnBhY2tfY29udGV4dCwgX2Rlc3Q6IHVua25vd24pOiB1bmtub3duIHtcclxuICAgIGxldCBpZCA9IHVucGFja19pbnQoZGF0YSwgdWN0eCk7XHJcblxyXG4gICAgcGFja2VyX2RlYnVnJDEoXCItaW50IFwiICsgaWQpO1xyXG4gICAgaWYgKCEoaWQgaW4gbWFuYWdlci5zdHJ1Y3RfaWRzKSkge1xyXG4gICAgICBwYWNrZXJfZGVidWckMShcInRzdHJ1Y3QgaWQ6IFwiICsgaWQpO1xyXG4gICAgICBjb25zb2xlLnRyYWNlKCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGlkKTtcclxuICAgICAgY29uc29sZS5sb2cobWFuYWdlci5zdHJ1Y3RfaWRzKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBzdHJ1Y3QgdHlwZSBcIiArIGlkICsgXCIuXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBjbHMyOiBOU3RydWN0IHwgU3RydWN0YWJsZUNsYXNzID0gbWFuYWdlci5nZXRfc3RydWN0X2lkKGlkKTtcclxuXHJcbiAgICBwYWNrZXJfZGVidWckMShcInN0cnVjdCBuYW1lOiBcIiArIGNsczIubmFtZSk7XHJcblxyXG4gICAgY2xzMiA9IG1hbmFnZXIuc3RydWN0X2Nsc1soY2xzMiBhcyBOU3RydWN0KS5uYW1lXTtcclxuXHJcbiAgICByZXR1cm4gbWFuYWdlci5yZWFkX29iamVjdChkYXRhLCBjbHMyLCB1Y3R4LCBfZGVzdCk7XHJcbiAgICAvL3BhY2tlcl9kZWJ1ZyhcInJldFwiLCByZXQpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHVucGFjayhtYW5hZ2VyOiBTVFJVQ1QsIGRhdGE6IERhdGFWaWV3LCBfdHlwZTogU3RydWN0VHlwZSwgdWN0eDogdW5wYWNrX2NvbnRleHQpOiB1bmtub3duIHtcclxuICAgIGxldCBpZCA9IHVucGFja19pbnQoZGF0YSwgdWN0eCk7XHJcblxyXG4gICAgcGFja2VyX2RlYnVnJDEoXCItaW50IFwiICsgaWQpO1xyXG4gICAgaWYgKCEoaWQgaW4gbWFuYWdlci5zdHJ1Y3RfaWRzKSkge1xyXG4gICAgICBwYWNrZXJfZGVidWckMShcInRzdHJ1Y3QgaWQ6IFwiICsgaWQpO1xyXG4gICAgICBjb25zb2xlLnRyYWNlKCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGlkKTtcclxuICAgICAgY29uc29sZS5sb2cobWFuYWdlci5zdHJ1Y3RfaWRzKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBzdHJ1Y3QgdHlwZSBcIiArIGlkICsgXCIuXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBjbHMyOiBOU3RydWN0IHwgU3RydWN0YWJsZUNsYXNzID0gbWFuYWdlci5nZXRfc3RydWN0X2lkKGlkKTtcclxuXHJcbiAgICBwYWNrZXJfZGVidWckMShcInN0cnVjdCBuYW1lOiBcIiArIGNsczIubmFtZSk7XHJcbiAgICBjbHMyID0gbWFuYWdlci5zdHJ1Y3RfY2xzWyhjbHMyIGFzIE5TdHJ1Y3QpLm5hbWVdO1xyXG5cclxuICAgIHJldHVybiBtYW5hZ2VyLnJlYWRfb2JqZWN0KGRhdGEsIGNsczIsIHVjdHgpO1xyXG4gICAgLy9wYWNrZXJfZGVidWcoXCJyZXRcIiwgcmV0KTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBkZWZpbmUoKTogU3RydWN0RmllbGRUeXBlRGVmaW5lIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHR5cGU6IFN0cnVjdEVudW0uVFNUUlVDVCxcclxuICAgICAgbmFtZTogXCJ0c3RydWN0XCIsXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG5cclxuU3RydWN0RmllbGRUeXBlLnJlZ2lzdGVyKFN0cnVjdFRTdHJ1Y3RGaWVsZCk7XHJcblxyXG4vKiogb3V0IGlzIGp1c3QgYSBbc3RyaW5nXSwgYW4gYXJyYXkgb2YgZGltZW4gMSB3aG9zZSBzb2xlIGVudHJ5IGlzIHRoZSBvdXRwdXQgc3RyaW5nLiAqL1xyXG5mdW5jdGlvbiBmb3JtYXRBcnJheUpzb24oXHJcbiAgbWFuYWdlcjogU1RSVUNULFxyXG4gIHZhbDogdW5rbm93bixcclxuICBfb2JqOiB1bmtub3duLFxyXG4gIGZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICBfdHlwZTogU3RydWN0VHlwZSxcclxuICB0eXBlMjogU3RydWN0VHlwZSxcclxuICBfaW5zdGFuY2U6IHVua25vd24sXHJcbiAgdGx2bDogbnVtYmVyLFxyXG4gIGFycmF5PzogdW5rbm93blxyXG4pOiBzdHJpbmcge1xyXG4gIGlmIChhcnJheSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICBhcnJheSA9IHZhbDtcclxuICB9XHJcblxyXG4gIGlmIChhcnJheSA9PT0gdW5kZWZpbmVkIHx8IGFycmF5ID09PSBudWxsIHx8IHR5cGVvZiBhcnJheSAhPT0gXCJvYmplY3RcIiB8fCAhKFN5bWJvbC5pdGVyYXRvciBpbiAoYXJyYXkgYXMgb2JqZWN0KSkpIHtcclxuICAgIGNvbnNvbGUubG9nKF9vYmopO1xyXG4gICAgY29uc29sZS5sb2coYXJyYXkpO1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBhbiBhcnJheSBmb3IgJHsoZmllbGQgYXMgU3RydWN0RmllbGQpLm5hbWV9YCk7XHJcbiAgfVxyXG5cclxuICBsZXQgYXJyID0gYXJyYXkgYXMgdW5rbm93bltdO1xyXG5cclxuICBpZiAoVmFsdWVUeXBlcy5oYXModHlwZTIudHlwZSkpIHtcclxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcnIpO1xyXG4gIH1cclxuXHJcbiAgbGV0IHMgPSBcIltcIjtcclxuICBpZiAobWFuYWdlci5mb3JtYXRDdHguYWRkQ29tbWVudHMgJiYgKGZpZWxkIGFzIFN0cnVjdEZpZWxkKS5jb21tZW50ICYmIChmaWVsZCBhcyBTdHJ1Y3RGaWVsZCkuY29tbWVudC50cmltKCkpIHtcclxuICAgIHMgKz0gXCIgXCIgKyAoZmllbGQgYXMgU3RydWN0RmllbGQpLmNvbW1lbnQudHJpbSgpO1xyXG4gIH1cclxuXHJcbiAgcyArPSBcIlxcblwiO1xyXG5cclxuICBmb3IgKGxldCBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xyXG4gICAgbGV0IGl0ZW0gPSBhcnJbaV07XHJcblxyXG4gICAgcyArPSB0YWIodGx2bCArIDEpICsgZm9ybWF0SlNPTiQxKG1hbmFnZXIsIGl0ZW0sIHZhbCwgZmllbGQsIHR5cGUyLCBfaW5zdGFuY2UsIHRsdmwgKyAxKSArIFwiLFxcblwiO1xyXG4gIH1cclxuXHJcbiAgcyArPSB0YWIodGx2bCkgKyBcIl1cIjtcclxuXHJcbiAgcmV0dXJuIHM7XHJcbn1cclxuXHJcbmNsYXNzIFN0cnVjdEFycmF5RmllbGQgZXh0ZW5kcyBTdHJ1Y3RGaWVsZFR5cGUge1xyXG4gIHN0YXRpYyBwYWNrKFxyXG4gICAgbWFuYWdlcjogU1RSVUNULFxyXG4gICAgZGF0YTogbnVtYmVyW10sXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBvYmo6IHVua25vd24sXHJcbiAgICBmaWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgICB0eXBlOiBTdHJ1Y3RUeXBlXHJcbiAgKTogdm9pZCB7XHJcbiAgICBsZXQgYXJyID0gdmFsIGFzIHVua25vd25bXTtcclxuXHJcbiAgICBpZiAoYXJyID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgY29uc29sZS50cmFjZSgpO1xyXG4gICAgICBjb25zb2xlLmxvZyhcIlVuZGVmaW5lZCBhcnJheSBmZWQgdG8gc3RydWN0IHN0cnVjdCBwYWNrZXIhXCIpO1xyXG4gICAgICBjb25zb2xlLmxvZyhcIkZpZWxkOiBcIiwgZmllbGQpO1xyXG4gICAgICBjb25zb2xlLmxvZyhcIlR5cGU6IFwiLCB0eXBlKTtcclxuICAgICAgY29uc29sZS5sb2coXCJcIik7XHJcbiAgICAgIHBhY2tlcl9kZWJ1ZyQxKFwiaW50IDBcIik7XHJcbiAgICAgIHBhY2tfaW50KGRhdGEsIDApO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgcGFja2VyX2RlYnVnJDEoXCJpbnQgXCIgKyBhcnIubGVuZ3RoKTtcclxuICAgIHBhY2tfaW50KGRhdGEsIGFyci5sZW5ndGgpO1xyXG5cclxuICAgIGxldCBkID0gdHlwZS5kYXRhIGFzIHsgaW5hbWU6IHN0cmluZzsgdHlwZTogU3RydWN0VHlwZSB9O1xyXG5cclxuICAgIGxldCBpdGVybmFtZSA9IGQuaW5hbWU7XHJcbiAgICBsZXQgdHlwZTIgPSBkLnR5cGU7XHJcblxyXG4gICAgbGV0IGVudiA9IF93c19lbnYkMTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGxldCB2YWwyOiB1bmtub3duID0gYXJyW2ldO1xyXG4gICAgICBpZiAoaXRlcm5hbWUgIT09IFwiXCIgJiYgaXRlcm5hbWUgIT09IHVuZGVmaW5lZCAmJiAoZmllbGQgYXMgU3RydWN0RmllbGQpLmdldCkge1xyXG4gICAgICAgIGVudlswXVswXSA9IGl0ZXJuYW1lO1xyXG4gICAgICAgIGVudlswXVsxXSA9IHZhbDI7XHJcbiAgICAgICAgdmFsMiA9IG1hbmFnZXIuX2Vudl9jYWxsKChmaWVsZCBhcyBTdHJ1Y3RGaWVsZCkuZ2V0ISwgb2JqLCBlbnYpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvL1hYWCBub3Qgc3VyZSBJIHJlYWxseSBuZWVkIHRoaXMgZmFrZUZpZWxkIHN0dWIgaGVyZS4gLiAuXHJcbiAgICAgIGxldCBmYWtlRmllbGQgPSBmYWtlRmllbGRzLm5leHQoKTtcclxuICAgICAgZmFrZUZpZWxkLnR5cGUgPSB0eXBlMjtcclxuICAgICAgZG9fcGFjayhtYW5hZ2VyLCBkYXRhLCB2YWwyLCBvYmosIGZha2VGaWVsZCwgdHlwZTIpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc3RhdGljIHBhY2tOdWxsKF9tYW5hZ2VyOiBTVFJVQ1QsIGRhdGE6IG51bWJlcltdLCBfZmllbGQ6IFN0cnVjdEZpZWxkLCBfdHlwZTogU3RydWN0VHlwZSk6IHZvaWQge1xyXG4gICAgcGFja19pbnQoZGF0YSwgMCk7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgZm9ybWF0KHR5cGU6IFN0cnVjdFR5cGUpOiBzdHJpbmcge1xyXG4gICAgbGV0IGQgPSB0eXBlLmRhdGEgYXMgeyBpbmFtZTogc3RyaW5nOyB0eXBlOiBTdHJ1Y3RUeXBlIH07XHJcbiAgICBpZiAoZC5pbmFtZSAhPT0gXCJcIiAmJiBkLmluYW1lICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgcmV0dXJuIFwiYXJyYXkoXCIgKyBkLmluYW1lICsgXCIsIFwiICsgZm10X3R5cGUoZC50eXBlKSArIFwiKVwiO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIFwiYXJyYXkoXCIgKyBmbXRfdHlwZShkLnR5cGUpICsgXCIpXCI7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgdXNlSGVscGVySlMoZmllbGQ6IFN0cnVjdEZpZWxkKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gIShmaWVsZC50eXBlLmRhdGEgYXMgeyBpbmFtZTogc3RyaW5nIH0pLmluYW1lO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHZhbGlkYXRlSlNPTihcclxuICAgIG1hbmFnZXI6IFNUUlVDVCxcclxuICAgIHZhbDogdW5rbm93bixcclxuICAgIF9vYmo6IHVua25vd24sXHJcbiAgICBmaWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgICB0eXBlOiBTdHJ1Y3RUeXBlLFxyXG4gICAgX2luc3RhbmNlOiB1bmtub3duLFxyXG4gICAgX2Fic3RyYWN0S2V5Pzogc3RyaW5nXHJcbiAgKTogYm9vbGVhbiB8IHN0cmluZyB7XHJcbiAgICBsZXQgYXJyID0gdmFsIGFzIHVua25vd25bXTtcclxuICAgIGlmICghYXJyKSB7XHJcbiAgICAgIHJldHVybiBcIm5vdCBhbiBhcnJheTogXCIgKyB2YWw7XHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcclxuICAgICAgbGV0IHJldCA9IHZhbGlkYXRlSlNPTiQxKFxyXG4gICAgICAgIG1hbmFnZXIsXHJcbiAgICAgICAgYXJyW2ldLFxyXG4gICAgICAgIGFycixcclxuICAgICAgICBmaWVsZCxcclxuICAgICAgICAodHlwZS5kYXRhIGFzIHsgdHlwZTogU3RydWN0VHlwZSB9KS50eXBlLFxyXG4gICAgICAgIHVuZGVmaW5lZCxcclxuICAgICAgICBfYWJzdHJhY3RLZXlcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGlmICh0eXBlb2YgcmV0ID09PSBcInN0cmluZ1wiIHx8ICFyZXQpIHtcclxuICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgZnJvbUpTT04oXHJcbiAgICBtYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBfb2JqOiB1bmtub3duLFxyXG4gICAgZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgdHlwZTogU3RydWN0VHlwZSxcclxuICAgIGluc3RhbmNlOiB1bmtub3duXHJcbiAgKTogdW5rbm93bltdIHtcclxuICAgIGxldCByZXQgPSAoaW5zdGFuY2UgYXMgdW5rbm93bltdIHwgdW5kZWZpbmVkKSB8fCBbXTtcclxuXHJcbiAgICByZXQubGVuZ3RoID0gMDtcclxuICAgIGxldCBhcnIgPSB2YWwgYXMgdW5rbm93bltdO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGxldCB2YWwyID0gZnJvbUpTT04obWFuYWdlciwgYXJyW2ldLCBhcnIsIGZpZWxkLCAodHlwZS5kYXRhIGFzIHsgdHlwZTogU3RydWN0VHlwZSB9KS50eXBlLCB1bmRlZmluZWQpO1xyXG5cclxuICAgICAgaWYgKHZhbDIgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHZhbDIpO1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJlZWVrXCIpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXQucHVzaCh2YWwyKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmV0O1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGZvcm1hdEpTT04oXHJcbiAgICBtYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBvYmo6IHVua25vd24sXHJcbiAgICBmaWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgICB0eXBlOiBTdHJ1Y3RUeXBlLFxyXG4gICAgaW5zdGFuY2U6IHVua25vd24sXHJcbiAgICB0bHZsOiBudW1iZXJcclxuICApOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIGZvcm1hdEFycmF5SnNvbihtYW5hZ2VyLCB2YWwsIG9iaiwgZmllbGQsIHR5cGUsICh0eXBlLmRhdGEgYXMgeyB0eXBlOiBTdHJ1Y3RUeXBlIH0pLnR5cGUsIGluc3RhbmNlLCB0bHZsKTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyB0b0pTT04oXHJcbiAgICBtYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBvYmo6IHVua25vd24sXHJcbiAgICBmaWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgICB0eXBlOiBTdHJ1Y3RUeXBlXHJcbiAgKTogdW5rbm93bltdIHtcclxuICAgIGxldCBhcnIgPSAodmFsIGFzIHVua25vd25bXSkgfHwgW107XHJcbiAgICBsZXQganNvbjogdW5rbm93bltdID0gW107XHJcblxyXG4gICAgbGV0IGl0ZXJuYW1lID0gKHR5cGUuZGF0YSBhcyB7IGluYW1lOiBzdHJpbmcgfSkuaW5hbWU7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcclxuICAgICAgbGV0IHZhbDI6IHVua25vd24gPSBhcnJbaV07XHJcbiAgICAgIGxldCBlbnYgPSBfd3NfZW52JDE7XHJcblxyXG4gICAgICBpZiAoaXRlcm5hbWUgIT09IFwiXCIgJiYgaXRlcm5hbWUgIT09IHVuZGVmaW5lZCAmJiAoZmllbGQgYXMgU3RydWN0RmllbGQpLmdldCkge1xyXG4gICAgICAgIGVudlswXVswXSA9IGl0ZXJuYW1lO1xyXG4gICAgICAgIGVudlswXVsxXSA9IHZhbDI7XHJcbiAgICAgICAgdmFsMiA9IG1hbmFnZXIuX2Vudl9jYWxsKChmaWVsZCBhcyBTdHJ1Y3RGaWVsZCkuZ2V0ISwgb2JqLCBlbnYpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBqc29uLnB1c2godG9KU09OKG1hbmFnZXIsIHZhbDIsIGFyciwgZmllbGQsICh0eXBlLmRhdGEgYXMgeyB0eXBlOiBTdHJ1Y3RUeXBlIH0pLnR5cGUpKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ganNvbjtcclxuICB9XHJcblxyXG4gIHN0YXRpYyB1bnBhY2tJbnRvKG1hbmFnZXI6IFNUUlVDVCwgZGF0YTogRGF0YVZpZXcsIHR5cGU6IFN0cnVjdFR5cGUsIHVjdHg6IHVucGFja19jb250ZXh0LCBkZXN0OiB1bmtub3duW10pOiB2b2lkIHtcclxuICAgIGxldCBsZW4gPSB1bnBhY2tfaW50KGRhdGEsIHVjdHgpO1xyXG4gICAgZGVzdC5sZW5ndGggPSAwO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcclxuICAgICAgZGVzdC5wdXNoKHVucGFja19maWVsZChtYW5hZ2VyLCBkYXRhLCAodHlwZS5kYXRhIGFzIHsgdHlwZTogU3RydWN0VHlwZSB9KS50eXBlLCB1Y3R4KSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgdW5wYWNrKG1hbmFnZXI6IFNUUlVDVCwgZGF0YTogRGF0YVZpZXcsIHR5cGU6IFN0cnVjdFR5cGUsIHVjdHg6IHVucGFja19jb250ZXh0KTogdW5rbm93bltdIHtcclxuICAgIGxldCBsZW4gPSB1bnBhY2tfaW50KGRhdGEsIHVjdHgpO1xyXG4gICAgcGFja2VyX2RlYnVnJDEoXCItaW50IFwiICsgbGVuKTtcclxuXHJcbiAgICBsZXQgYXJyOiB1bmtub3duW10gPSBuZXcgQXJyYXkobGVuKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcclxuICAgICAgYXJyW2ldID0gdW5wYWNrX2ZpZWxkKG1hbmFnZXIsIGRhdGEsICh0eXBlLmRhdGEgYXMgeyB0eXBlOiBTdHJ1Y3RUeXBlIH0pLnR5cGUsIHVjdHgpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhcnI7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgZGVmaW5lKCk6IFN0cnVjdEZpZWxkVHlwZURlZmluZSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0eXBlOiBTdHJ1Y3RFbnVtLkFSUkFZLFxyXG4gICAgICBuYW1lOiBcImFycmF5XCIsXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG5cclxuU3RydWN0RmllbGRUeXBlLnJlZ2lzdGVyKFN0cnVjdEFycmF5RmllbGQpO1xyXG5cclxuY2xhc3MgU3RydWN0SXRlckZpZWxkIGV4dGVuZHMgU3RydWN0RmllbGRUeXBlIHtcclxuICBzdGF0aWMgcGFjayhcclxuICAgIG1hbmFnZXI6IFNUUlVDVCxcclxuICAgIGRhdGE6IG51bWJlcltdLFxyXG4gICAgdmFsOiB1bmtub3duLFxyXG4gICAgb2JqOiB1bmtub3duLFxyXG4gICAgZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgdHlwZTogU3RydWN0VHlwZVxyXG4gICk6IHZvaWQge1xyXG4gICAgLy90aGlzIHdhcyBvcmlnaW5hbGx5IGltcGxlbWVudGVkIHRvIHVzZSBFUzYgaXRlcmF0b3JzLlxyXG4gICAgZnVuY3Rpb24gZm9yRWFjaChjYjogKGl0ZW06IHVua25vd24pID0+IHZvaWQsIHRoaXN2YXI6IHVua25vd24pOiB2b2lkIHtcclxuICAgICAgbGV0IHYgPSB2YWwgYXMgKEl0ZXJhYmxlPHVua25vd24+ICYgeyBmb3JFYWNoPzogKGNiOiAoaXRlbTogdW5rbm93bikgPT4gdm9pZCkgPT4gdm9pZCB9KSB8IG51bGw7XHJcbiAgICAgIGlmICh2ICYmICh2IGFzIEl0ZXJhYmxlPHVua25vd24+KVtTeW1ib2wuaXRlcmF0b3JdKSB7XHJcbiAgICAgICAgZm9yIChsZXQgaXRlbSBvZiB2IGFzIEl0ZXJhYmxlPHVua25vd24+KSB7XHJcbiAgICAgICAgICBjYi5jYWxsKHRoaXN2YXIsIGl0ZW0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIGlmICh2ICYmIHYuZm9yRWFjaCkge1xyXG4gICAgICAgIHYuZm9yRWFjaChmdW5jdGlvbiAoaXRlbTogdW5rbm93bikge1xyXG4gICAgICAgICAgY2IuY2FsbCh0aGlzdmFyLCBpdGVtKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJVbmRlZmluZWQgaXRlcmFibGUgbGlzdCBmZWQgdG8gc3RydWN0IHN0cnVjdCBwYWNrZXIhXCIsIHZhbCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJGaWVsZDogXCIsIGZpZWxkKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlR5cGU6IFwiLCB0eXBlKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlwiKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qIHNhdmUgc3BhY2UgZm9yIGxlbmd0aCAqL1xyXG4gICAgbGV0IHN0YXJ0aSA9IGRhdGEubGVuZ3RoO1xyXG4gICAgZGF0YS5sZW5ndGggKz0gNDtcclxuXHJcbiAgICBsZXQgZCA9IHR5cGUuZGF0YSBhcyB7IGluYW1lOiBzdHJpbmc7IHR5cGU6IFN0cnVjdFR5cGUgfSxcclxuICAgICAgaXRlcm5hbWUgPSBkLmluYW1lLFxyXG4gICAgICB0eXBlMiA9IGQudHlwZTtcclxuICAgIGxldCBlbnYgPSBfd3NfZW52JDE7XHJcblxyXG4gICAgbGV0IGkgPSAwO1xyXG4gICAgZm9yRWFjaChmdW5jdGlvbiAodmFsMjogdW5rbm93bikge1xyXG4gICAgICBpZiAoaXRlcm5hbWUgIT09IFwiXCIgJiYgaXRlcm5hbWUgIT09IHVuZGVmaW5lZCAmJiAoZmllbGQgYXMgU3RydWN0RmllbGQpLmdldCkge1xyXG4gICAgICAgIGVudlswXVswXSA9IGl0ZXJuYW1lO1xyXG4gICAgICAgIGVudlswXVsxXSA9IHZhbDI7XHJcbiAgICAgICAgdmFsMiA9IG1hbmFnZXIuX2Vudl9jYWxsKChmaWVsZCBhcyBTdHJ1Y3RGaWVsZCkuZ2V0ISwgb2JqLCBlbnYpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvL1hYWCBub3Qgc3VyZSBJIHJlYWxseSBuZWVkIHRoaXMgZmFrZUZpZWxkIHN0dWIgaGVyZS4gLiAuXHJcbiAgICAgIGxldCBmYWtlRmllbGQgPSBmYWtlRmllbGRzLm5leHQoKTtcclxuICAgICAgZmFrZUZpZWxkLnR5cGUgPSB0eXBlMjtcclxuICAgICAgZG9fcGFjayhtYW5hZ2VyLCBkYXRhLCB2YWwyLCBvYmosIGZha2VGaWVsZCwgdHlwZTIpO1xyXG5cclxuICAgICAgaSsrO1xyXG4gICAgfSwgdGhpcyk7XHJcblxyXG4gICAgLyogd3JpdGUgbGVuZ3RoICovXHJcbiAgICB0ZW1wX2RhdGF2aWV3LnNldEludDMyKDAsIGksIFNUUlVDVF9FTkRJQU4pO1xyXG5cclxuICAgIGRhdGFbc3RhcnRpKytdID0gdWludDhfdmlld1swXTtcclxuICAgIGRhdGFbc3RhcnRpKytdID0gdWludDhfdmlld1sxXTtcclxuICAgIGRhdGFbc3RhcnRpKytdID0gdWludDhfdmlld1syXTtcclxuICAgIGRhdGFbc3RhcnRpKytdID0gdWludDhfdmlld1szXTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBmb3JtYXRKU09OKFxyXG4gICAgbWFuYWdlcjogU1RSVUNULFxyXG4gICAgdmFsOiB1bmtub3duLFxyXG4gICAgb2JqOiB1bmtub3duLFxyXG4gICAgZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgdHlwZTogU3RydWN0VHlwZSxcclxuICAgIGluc3RhbmNlOiB1bmtub3duLFxyXG4gICAgdGx2bDogbnVtYmVyXHJcbiAgKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBmb3JtYXRBcnJheUpzb24oXHJcbiAgICAgIG1hbmFnZXIsXHJcbiAgICAgIHZhbCxcclxuICAgICAgb2JqLFxyXG4gICAgICBmaWVsZCxcclxuICAgICAgdHlwZSxcclxuICAgICAgKHR5cGUuZGF0YSBhcyB7IHR5cGU6IFN0cnVjdFR5cGUgfSkudHlwZSxcclxuICAgICAgaW5zdGFuY2UsXHJcbiAgICAgIHRsdmwsXHJcbiAgICAgIGxpc3QodmFsIGFzIEl0ZXJhYmxlPHVua25vd24+KVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyB2YWxpZGF0ZUpTT04oXHJcbiAgICBtYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBvYmo6IHVua25vd24sXHJcbiAgICBmaWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgICB0eXBlOiBTdHJ1Y3RUeXBlLFxyXG4gICAgaW5zdGFuY2U6IHVua25vd24sXHJcbiAgICBfYWJzdHJhY3RLZXk/OiBzdHJpbmdcclxuICApOiBib29sZWFuIHwgc3RyaW5nIHtcclxuICAgIHJldHVybiBTdHJ1Y3RBcnJheUZpZWxkLnZhbGlkYXRlSlNPTihtYW5hZ2VyLCB2YWwsIG9iaiwgZmllbGQsIHR5cGUsIGluc3RhbmNlLCBfYWJzdHJhY3RLZXkpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGZyb21KU09OKFxyXG4gICAgbWFuYWdlcjogU1RSVUNULFxyXG4gICAgdmFsOiB1bmtub3duLFxyXG4gICAgb2JqOiB1bmtub3duLFxyXG4gICAgZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgdHlwZTogU3RydWN0VHlwZSxcclxuICAgIGluc3RhbmNlOiB1bmtub3duXHJcbiAgKTogdW5rbm93bltdIHtcclxuICAgIHJldHVybiBTdHJ1Y3RBcnJheUZpZWxkLmZyb21KU09OKG1hbmFnZXIsIHZhbCwgb2JqLCBmaWVsZCwgdHlwZSwgaW5zdGFuY2UpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHRvSlNPTihcclxuICAgIG1hbmFnZXI6IFNUUlVDVCxcclxuICAgIHZhbDogdW5rbm93bixcclxuICAgIG9iajogdW5rbm93bixcclxuICAgIGZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICAgIHR5cGU6IFN0cnVjdFR5cGVcclxuICApOiB1bmtub3duW10ge1xyXG4gICAgbGV0IGFyciA9ICh2YWwgYXMgSXRlcmFibGU8dW5rbm93bj4pIHx8IFtdO1xyXG4gICAgbGV0IGpzb246IHVua25vd25bXSA9IFtdO1xyXG5cclxuICAgIGxldCBpdGVybmFtZSA9ICh0eXBlLmRhdGEgYXMgeyBpbmFtZTogc3RyaW5nIH0pLmluYW1lO1xyXG5cclxuICAgIGZvciAobGV0IHZhbDIgb2YgYXJyKSB7XHJcbiAgICAgIGxldCBlbnYgPSBfd3NfZW52JDE7XHJcbiAgICAgIGxldCB2OiB1bmtub3duID0gdmFsMjtcclxuXHJcbiAgICAgIGlmIChpdGVybmFtZSAhPT0gXCJcIiAmJiBpdGVybmFtZSAhPT0gdW5kZWZpbmVkICYmIChmaWVsZCBhcyBTdHJ1Y3RGaWVsZCkuZ2V0KSB7XHJcbiAgICAgICAgZW52WzBdWzBdID0gaXRlcm5hbWU7XHJcbiAgICAgICAgZW52WzBdWzFdID0gdjtcclxuICAgICAgICB2ID0gbWFuYWdlci5fZW52X2NhbGwoKGZpZWxkIGFzIFN0cnVjdEZpZWxkKS5nZXQhLCBvYmosIGVudik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGpzb24ucHVzaCh0b0pTT04obWFuYWdlciwgdiwgYXJyLCBmaWVsZCwgKHR5cGUuZGF0YSBhcyB7IHR5cGU6IFN0cnVjdFR5cGUgfSkudHlwZSkpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBqc29uO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHBhY2tOdWxsKF9tYW5hZ2VyOiBTVFJVQ1QsIGRhdGE6IG51bWJlcltdLCBfZmllbGQ6IFN0cnVjdEZpZWxkLCBfdHlwZTogU3RydWN0VHlwZSk6IHZvaWQge1xyXG4gICAgcGFja19pbnQoZGF0YSwgMCk7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgdXNlSGVscGVySlMoZmllbGQ6IFN0cnVjdEZpZWxkKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gIShmaWVsZC50eXBlLmRhdGEgYXMgeyBpbmFtZTogc3RyaW5nIH0pLmluYW1lO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGZvcm1hdCh0eXBlOiBTdHJ1Y3RUeXBlKTogc3RyaW5nIHtcclxuICAgIGxldCBkID0gdHlwZS5kYXRhIGFzIHsgaW5hbWU6IHN0cmluZzsgdHlwZTogU3RydWN0VHlwZSB9O1xyXG4gICAgaWYgKGQuaW5hbWUgIT09IFwiXCIgJiYgZC5pbmFtZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiBcIml0ZXIoXCIgKyBkLmluYW1lICsgXCIsIFwiICsgZm10X3R5cGUoZC50eXBlKSArIFwiKVwiO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIFwiaXRlcihcIiArIGZtdF90eXBlKGQudHlwZSkgKyBcIilcIjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHN0YXRpYyB1bnBhY2tJbnRvKFxyXG4gICAgbWFuYWdlcjogU1RSVUNULFxyXG4gICAgZGF0YTogRGF0YVZpZXcsXHJcbiAgICB0eXBlOiBTdHJ1Y3RUeXBlLFxyXG4gICAgdWN0eDogdW5wYWNrX2NvbnRleHQsXHJcbiAgICBhcnI6IHVua25vd25bXVxyXG4gICk6IHVua25vd25bXSB7XHJcbiAgICBsZXQgbGVuID0gdW5wYWNrX2ludChkYXRhLCB1Y3R4KTtcclxuICAgIHBhY2tlcl9kZWJ1ZyQxKFwiLWludCBcIiArIGxlbik7XHJcblxyXG4gICAgYXJyLmxlbmd0aCA9IDA7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICBhcnIucHVzaCh1bnBhY2tfZmllbGQobWFuYWdlciwgZGF0YSwgKHR5cGUuZGF0YSBhcyB7IHR5cGU6IFN0cnVjdFR5cGUgfSkudHlwZSwgdWN0eCkpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhcnI7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgdW5wYWNrKG1hbmFnZXI6IFNUUlVDVCwgZGF0YTogRGF0YVZpZXcsIHR5cGU6IFN0cnVjdFR5cGUsIHVjdHg6IHVucGFja19jb250ZXh0KTogdW5rbm93bltdIHtcclxuICAgIGxldCBsZW4gPSB1bnBhY2tfaW50KGRhdGEsIHVjdHgpO1xyXG4gICAgcGFja2VyX2RlYnVnJDEoXCItaW50IFwiICsgbGVuKTtcclxuXHJcbiAgICBsZXQgYXJyOiB1bmtub3duW10gPSBuZXcgQXJyYXkobGVuKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcclxuICAgICAgYXJyW2ldID0gdW5wYWNrX2ZpZWxkKG1hbmFnZXIsIGRhdGEsICh0eXBlLmRhdGEgYXMgeyB0eXBlOiBTdHJ1Y3RUeXBlIH0pLnR5cGUsIHVjdHgpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhcnI7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgZGVmaW5lKCk6IFN0cnVjdEZpZWxkVHlwZURlZmluZSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0eXBlOiBTdHJ1Y3RFbnVtLklURVIsXHJcbiAgICAgIG5hbWU6IFwiaXRlclwiLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcblN0cnVjdEZpZWxkVHlwZS5yZWdpc3RlcihTdHJ1Y3RJdGVyRmllbGQpO1xyXG5cclxuY2xhc3MgU3RydWN0U2hvcnRGaWVsZCBleHRlbmRzIFN0cnVjdEZpZWxkVHlwZSB7XHJcbiAgc3RhdGljIHBhY2soXHJcbiAgICBfbWFuYWdlcjogU1RSVUNULFxyXG4gICAgZGF0YTogbnVtYmVyW10sXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBfb2JqOiB1bmtub3duLFxyXG4gICAgX2ZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICAgIF90eXBlOiBTdHJ1Y3RUeXBlXHJcbiAgKTogdm9pZCB7XHJcbiAgICBwYWNrX3Nob3J0KGRhdGEsIHZhbCBhcyBudW1iZXIpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHVucGFjayhfbWFuYWdlcjogU1RSVUNULCBkYXRhOiBEYXRhVmlldywgX3R5cGU6IFN0cnVjdFR5cGUsIHVjdHg6IHVucGFja19jb250ZXh0KTogbnVtYmVyIHtcclxuICAgIHJldHVybiB1bnBhY2tfc2hvcnQoZGF0YSwgdWN0eCk7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgZGVmaW5lKCk6IFN0cnVjdEZpZWxkVHlwZURlZmluZSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0eXBlOiBTdHJ1Y3RFbnVtLlNIT1JULFxyXG4gICAgICBuYW1lOiBcInNob3J0XCIsXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG5cclxuU3RydWN0RmllbGRUeXBlLnJlZ2lzdGVyKFN0cnVjdFNob3J0RmllbGQpO1xyXG5cclxuY2xhc3MgU3RydWN0Qnl0ZUZpZWxkIGV4dGVuZHMgU3RydWN0RmllbGRUeXBlIHtcclxuICBzdGF0aWMgcGFjayhcclxuICAgIF9tYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICBkYXRhOiBudW1iZXJbXSxcclxuICAgIHZhbDogdW5rbm93bixcclxuICAgIF9vYmo6IHVua25vd24sXHJcbiAgICBfZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgX3R5cGU6IFN0cnVjdFR5cGVcclxuICApOiB2b2lkIHtcclxuICAgIHBhY2tfYnl0ZShkYXRhLCB2YWwgYXMgbnVtYmVyKTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyB1bnBhY2soX21hbmFnZXI6IFNUUlVDVCwgZGF0YTogRGF0YVZpZXcsIF90eXBlOiBTdHJ1Y3RUeXBlLCB1Y3R4OiB1bnBhY2tfY29udGV4dCk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gdW5wYWNrX2J5dGUoZGF0YSwgdWN0eCk7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgZGVmaW5lKCk6IFN0cnVjdEZpZWxkVHlwZURlZmluZSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0eXBlOiBTdHJ1Y3RFbnVtLkJZVEUsXHJcbiAgICAgIG5hbWU6IFwiYnl0ZVwiLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcblN0cnVjdEZpZWxkVHlwZS5yZWdpc3RlcihTdHJ1Y3RCeXRlRmllbGQpO1xyXG5cclxuY2xhc3MgU3RydWN0U2lnbmVkQnl0ZUZpZWxkIGV4dGVuZHMgU3RydWN0RmllbGRUeXBlIHtcclxuICBzdGF0aWMgcGFjayhcclxuICAgIF9tYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICBkYXRhOiBudW1iZXJbXSxcclxuICAgIHZhbDogdW5rbm93bixcclxuICAgIF9vYmo6IHVua25vd24sXHJcbiAgICBfZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgX3R5cGU6IFN0cnVjdFR5cGVcclxuICApOiB2b2lkIHtcclxuICAgIHBhY2tfc2J5dGUoZGF0YSwgdmFsIGFzIG51bWJlcik7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgdW5wYWNrKF9tYW5hZ2VyOiBTVFJVQ1QsIGRhdGE6IERhdGFWaWV3LCBfdHlwZTogU3RydWN0VHlwZSwgdWN0eDogdW5wYWNrX2NvbnRleHQpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIHVucGFja19zYnl0ZShkYXRhLCB1Y3R4KTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBkZWZpbmUoKTogU3RydWN0RmllbGRUeXBlRGVmaW5lIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHR5cGU6IFN0cnVjdEVudW0uU0lHTkVEX0JZVEUsXHJcbiAgICAgIG5hbWU6IFwic2J5dGVcIixcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG5TdHJ1Y3RGaWVsZFR5cGUucmVnaXN0ZXIoU3RydWN0U2lnbmVkQnl0ZUZpZWxkKTtcclxuXHJcbmNsYXNzIFN0cnVjdEJvb2xGaWVsZCBleHRlbmRzIFN0cnVjdEZpZWxkVHlwZSB7XHJcbiAgc3RhdGljIHBhY2soXHJcbiAgICBfbWFuYWdlcjogU1RSVUNULFxyXG4gICAgZGF0YTogbnVtYmVyW10sXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBfb2JqOiB1bmtub3duLFxyXG4gICAgX2ZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICAgIF90eXBlOiBTdHJ1Y3RUeXBlXHJcbiAgKTogdm9pZCB7XHJcbiAgICBwYWNrX2J5dGUoZGF0YSwgISF2YWwgPyAxIDogMCk7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgdW5wYWNrKF9tYW5hZ2VyOiBTVFJVQ1QsIGRhdGE6IERhdGFWaWV3LCBfdHlwZTogU3RydWN0VHlwZSwgdWN0eDogdW5wYWNrX2NvbnRleHQpOiBib29sZWFuIHtcclxuICAgIHJldHVybiAhIXVucGFja19ieXRlKGRhdGEsIHVjdHgpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHZhbGlkYXRlSlNPTihcclxuICAgIF9tYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBfb2JqOiB1bmtub3duLFxyXG4gICAgX2ZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICAgIF90eXBlOiBTdHJ1Y3RUeXBlLFxyXG4gICAgX2luc3RhbmNlOiB1bmtub3duXHJcbiAgKTogYm9vbGVhbiB8IHN0cmluZyB7XHJcbiAgICBpZiAodmFsID09PSAwIHx8IHZhbCA9PT0gMSB8fCB2YWwgPT09IHRydWUgfHwgdmFsID09PSBmYWxzZSB8fCB2YWwgPT09IFwidHJ1ZVwiIHx8IHZhbCA9PT0gXCJmYWxzZVwiKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBcIlwiICsgdmFsICsgXCIgaXMgbm90IGEgYm9vbFwiO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGZyb21KU09OKFxyXG4gICAgX21hbmFnZXI6IFNUUlVDVCxcclxuICAgIHZhbDogdW5rbm93bixcclxuICAgIF9vYmo6IHVua25vd24sXHJcbiAgICBfZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgX3R5cGU6IFN0cnVjdFR5cGUsXHJcbiAgICBfaW5zdGFuY2U6IHVua25vd25cclxuICApOiBib29sZWFuIHtcclxuICAgIGlmICh2YWwgPT09IFwiZmFsc2VcIikge1xyXG4gICAgICB2YWwgPSBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gISF2YWw7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgdG9KU09OKFxyXG4gICAgX21hbmFnZXI6IFNUUlVDVCxcclxuICAgIHZhbDogdW5rbm93bixcclxuICAgIF9vYmo6IHVua25vd24sXHJcbiAgICBfZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgX3R5cGU6IFN0cnVjdFR5cGVcclxuICApOiBib29sZWFuIHtcclxuICAgIHJldHVybiAhIXZhbDtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBkZWZpbmUoKTogU3RydWN0RmllbGRUeXBlRGVmaW5lIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHR5cGU6IFN0cnVjdEVudW0uQk9PTCxcclxuICAgICAgbmFtZTogXCJib29sXCIsXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG5cclxuU3RydWN0RmllbGRUeXBlLnJlZ2lzdGVyKFN0cnVjdEJvb2xGaWVsZCk7XHJcblxyXG5jbGFzcyBTdHJ1Y3RJdGVyS2V5c0ZpZWxkIGV4dGVuZHMgU3RydWN0RmllbGRUeXBlIHtcclxuICBzdGF0aWMgcGFjayhcclxuICAgIG1hbmFnZXI6IFNUUlVDVCxcclxuICAgIGRhdGE6IG51bWJlcltdLFxyXG4gICAgdmFsOiB1bmtub3duLFxyXG4gICAgb2JqOiB1bmtub3duLFxyXG4gICAgZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgdHlwZTogU3RydWN0VHlwZVxyXG4gICk6IHZvaWQge1xyXG4gICAgLy90aGlzIHdhcyBvcmlnaW5hbGx5IGltcGxlbWVudGVkIHRvIHVzZSBFUzYgaXRlcmF0b3JzLlxyXG4gICAgaWYgKCh0eXBlb2YgdmFsICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiB2YWwgIT09IFwiZnVuY3Rpb25cIikgfHwgdmFsID09PSBudWxsKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybihcIkJhZCBvYmplY3QgZmVkIHRvIGl0ZXJrZXlzIGluIHN0cnVjdCBwYWNrZXIhXCIsIHZhbCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKFwiRmllbGQ6IFwiLCBmaWVsZCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKFwiVHlwZTogXCIsIHR5cGUpO1xyXG4gICAgICBjb25zb2xlLmxvZyhcIlwiKTtcclxuXHJcbiAgICAgIHBhY2tfaW50KGRhdGEsIDApO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IHZhbE9iaiA9IHZhbCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcclxuICAgIGxldCBsZW4gPSAwLjA7XHJcbiAgICBmb3IgKGxldCBrIGluIHZhbE9iaikge1xyXG4gICAgICBsZW4rKztcclxuICAgIH1cclxuXHJcbiAgICBwYWNrZXJfZGVidWckMShcImludCBcIiArIGxlbik7XHJcbiAgICBwYWNrX2ludChkYXRhLCBsZW4pO1xyXG5cclxuICAgIGxldCBkID0gdHlwZS5kYXRhIGFzIHsgaW5hbWU6IHN0cmluZzsgdHlwZTogU3RydWN0VHlwZSB9LFxyXG4gICAgICBpdGVybmFtZSA9IGQuaW5hbWUsXHJcbiAgICAgIHR5cGUyID0gZC50eXBlO1xyXG4gICAgbGV0IGVudiA9IF93c19lbnYkMTtcclxuXHJcbiAgICBsZXQgaSA9IDA7XHJcbiAgICBmb3IgKGxldCB2YWwyIGluIHZhbE9iaikge1xyXG4gICAgICBpZiAoaSA+PSBsZW4pIHtcclxuICAgICAgICBpZiAod2FybmluZ2x2bCQxID4gMCkge1xyXG4gICAgICAgICAgY29uc29sZS53YXJuKFwiV2FybmluZzogb2JqZWN0IGtleXMgbWFnaWNhbGx5IHJlcGxhY2VkIGR1cmluZyBpdGVyYXRpb25cIiwgdmFsLCBpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsZXQgdjogdW5rbm93biA9IHZhbDI7XHJcbiAgICAgIGlmIChpdGVybmFtZSAmJiBpdGVybmFtZS50cmltKCkubGVuZ3RoID4gMCAmJiAoZmllbGQgYXMgU3RydWN0RmllbGQpLmdldCkge1xyXG4gICAgICAgIGVudlswXVswXSA9IGl0ZXJuYW1lO1xyXG4gICAgICAgIGVudlswXVsxXSA9IHY7XHJcbiAgICAgICAgdiA9IG1hbmFnZXIuX2Vudl9jYWxsKChmaWVsZCBhcyBTdHJ1Y3RGaWVsZCkuZ2V0ISwgb2JqLCBlbnYpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHYgPSB2YWxPYmpbdmFsMl07IC8vZmV0Y2ggdmFsdWVcclxuICAgICAgfVxyXG5cclxuICAgICAgbGV0IGYyOiBGYWtlRmllbGQgPSB7IHR5cGU6IHR5cGUyLCBnZXQ6IHVuZGVmaW5lZCwgc2V0OiB1bmRlZmluZWQgfTtcclxuICAgICAgZG9fcGFjayhtYW5hZ2VyLCBkYXRhLCB2LCBvYmosIGYyLCB0eXBlMik7XHJcblxyXG4gICAgICBpKys7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgdmFsaWRhdGVKU09OKFxyXG4gICAgbWFuYWdlcjogU1RSVUNULFxyXG4gICAgdmFsOiB1bmtub3duLFxyXG4gICAgb2JqOiB1bmtub3duLFxyXG4gICAgZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgdHlwZTogU3RydWN0VHlwZSxcclxuICAgIGluc3RhbmNlOiB1bmtub3duLFxyXG4gICAgX2Fic3RyYWN0S2V5Pzogc3RyaW5nXHJcbiAgKTogYm9vbGVhbiB8IHN0cmluZyB7XHJcbiAgICByZXR1cm4gU3RydWN0QXJyYXlGaWVsZC52YWxpZGF0ZUpTT04obWFuYWdlciwgdmFsLCBvYmosIGZpZWxkLCB0eXBlLCBpbnN0YW5jZSwgX2Fic3RyYWN0S2V5KTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBmcm9tSlNPTihcclxuICAgIG1hbmFnZXI6IFNUUlVDVCxcclxuICAgIHZhbDogdW5rbm93bixcclxuICAgIG9iajogdW5rbm93bixcclxuICAgIGZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICAgIHR5cGU6IFN0cnVjdFR5cGUsXHJcbiAgICBpbnN0YW5jZTogdW5rbm93blxyXG4gICk6IHVua25vd25bXSB7XHJcbiAgICByZXR1cm4gU3RydWN0QXJyYXlGaWVsZC5mcm9tSlNPTihtYW5hZ2VyLCB2YWwsIG9iaiwgZmllbGQsIHR5cGUsIGluc3RhbmNlKTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBmb3JtYXRKU09OKFxyXG4gICAgbWFuYWdlcjogU1RSVUNULFxyXG4gICAgdmFsOiB1bmtub3duLFxyXG4gICAgb2JqOiB1bmtub3duLFxyXG4gICAgZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgdHlwZTogU3RydWN0VHlwZSxcclxuICAgIGluc3RhbmNlOiB1bmtub3duLFxyXG4gICAgdGx2bDogbnVtYmVyXHJcbiAgKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBmb3JtYXRBcnJheUpzb24oXHJcbiAgICAgIG1hbmFnZXIsXHJcbiAgICAgIHZhbCxcclxuICAgICAgb2JqLFxyXG4gICAgICBmaWVsZCxcclxuICAgICAgdHlwZSxcclxuICAgICAgKHR5cGUuZGF0YSBhcyB7IHR5cGU6IFN0cnVjdFR5cGUgfSkudHlwZSxcclxuICAgICAgaW5zdGFuY2UsXHJcbiAgICAgIHRsdmwsXHJcbiAgICAgIGxpc3QodmFsIGFzIEl0ZXJhYmxlPHVua25vd24+KVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyB0b0pTT04oXHJcbiAgICBtYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBvYmo6IHVua25vd24sXHJcbiAgICBmaWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgICB0eXBlOiBTdHJ1Y3RUeXBlXHJcbiAgKTogdW5rbm93bltdIHtcclxuICAgIGxldCB2YWxPYmogPSAodmFsIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB8fCB7fTtcclxuICAgIGxldCBqc29uOiB1bmtub3duW10gPSBbXTtcclxuXHJcbiAgICBsZXQgaXRlcm5hbWUgPSAodHlwZS5kYXRhIGFzIHsgaW5hbWU6IHN0cmluZyB9KS5pbmFtZTtcclxuXHJcbiAgICBmb3IgKGxldCBrIGluIHZhbE9iaikge1xyXG4gICAgICBsZXQgdmFsMjogdW5rbm93biA9IHZhbE9ialtrXTtcclxuICAgICAgbGV0IGVudiA9IF93c19lbnYkMTtcclxuXHJcbiAgICAgIGlmIChpdGVybmFtZSAhPT0gXCJcIiAmJiBpdGVybmFtZSAhPT0gdW5kZWZpbmVkICYmIChmaWVsZCBhcyBTdHJ1Y3RGaWVsZCkuZ2V0KSB7XHJcbiAgICAgICAgZW52WzBdWzBdID0gaXRlcm5hbWU7XHJcbiAgICAgICAgZW52WzBdWzFdID0gdmFsMjtcclxuICAgICAgICB2YWwyID0gbWFuYWdlci5fZW52X2NhbGwoKGZpZWxkIGFzIFN0cnVjdEZpZWxkKS5nZXQhLCBvYmosIGVudik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGpzb24ucHVzaCh0b0pTT04obWFuYWdlciwgdmFsMiwgdmFsT2JqLCBmaWVsZCwgKHR5cGUuZGF0YSBhcyB7IHR5cGU6IFN0cnVjdFR5cGUgfSkudHlwZSkpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBqc29uO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHBhY2tOdWxsKF9tYW5hZ2VyOiBTVFJVQ1QsIGRhdGE6IG51bWJlcltdLCBfZmllbGQ6IFN0cnVjdEZpZWxkLCBfdHlwZTogU3RydWN0VHlwZSk6IHZvaWQge1xyXG4gICAgcGFja19pbnQoZGF0YSwgMCk7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgdXNlSGVscGVySlMoZmllbGQ6IFN0cnVjdEZpZWxkKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gIShmaWVsZC50eXBlLmRhdGEgYXMgeyBpbmFtZTogc3RyaW5nIH0pLmluYW1lO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGZvcm1hdCh0eXBlOiBTdHJ1Y3RUeXBlKTogc3RyaW5nIHtcclxuICAgIGxldCBkID0gdHlwZS5kYXRhIGFzIHsgaW5hbWU6IHN0cmluZzsgdHlwZTogU3RydWN0VHlwZSB9O1xyXG4gICAgaWYgKGQuaW5hbWUgIT09IFwiXCIgJiYgZC5pbmFtZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiBcIml0ZXJrZXlzKFwiICsgZC5pbmFtZSArIFwiLCBcIiArIGZtdF90eXBlKGQudHlwZSkgKyBcIilcIjtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBcIml0ZXJrZXlzKFwiICsgZm10X3R5cGUoZC50eXBlKSArIFwiKVwiO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc3RhdGljIHVucGFja0ludG8oXHJcbiAgICBtYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICBkYXRhOiBEYXRhVmlldyxcclxuICAgIHR5cGU6IFN0cnVjdFR5cGUsXHJcbiAgICB1Y3R4OiB1bnBhY2tfY29udGV4dCxcclxuICAgIGFycjogdW5rbm93bltdXHJcbiAgKTogdW5rbm93bltdIHtcclxuICAgIGxldCBsZW4gPSB1bnBhY2tfaW50KGRhdGEsIHVjdHgpO1xyXG4gICAgcGFja2VyX2RlYnVnJDEoXCItaW50IFwiICsgbGVuKTtcclxuXHJcbiAgICBhcnIubGVuZ3RoID0gMDtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgIGFyci5wdXNoKHVucGFja19maWVsZChtYW5hZ2VyLCBkYXRhLCAodHlwZS5kYXRhIGFzIHsgdHlwZTogU3RydWN0VHlwZSB9KS50eXBlLCB1Y3R4KSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGFycjtcclxuICB9XHJcblxyXG4gIHN0YXRpYyB1bnBhY2sobWFuYWdlcjogU1RSVUNULCBkYXRhOiBEYXRhVmlldywgdHlwZTogU3RydWN0VHlwZSwgdWN0eDogdW5wYWNrX2NvbnRleHQpOiB1bmtub3duW10ge1xyXG4gICAgbGV0IGxlbiA9IHVucGFja19pbnQoZGF0YSwgdWN0eCk7XHJcbiAgICBwYWNrZXJfZGVidWckMShcIi1pbnQgXCIgKyBsZW4pO1xyXG5cclxuICAgIGxldCBhcnI6IHVua25vd25bXSA9IG5ldyBBcnJheShsZW4pO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICBhcnJbaV0gPSB1bnBhY2tfZmllbGQobWFuYWdlciwgZGF0YSwgKHR5cGUuZGF0YSBhcyB7IHR5cGU6IFN0cnVjdFR5cGUgfSkudHlwZSwgdWN0eCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGFycjtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBkZWZpbmUoKTogU3RydWN0RmllbGRUeXBlRGVmaW5lIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHR5cGU6IFN0cnVjdEVudW0uSVRFUktFWVMsXHJcbiAgICAgIG5hbWU6IFwiaXRlcmtleXNcIixcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG5TdHJ1Y3RGaWVsZFR5cGUucmVnaXN0ZXIoU3RydWN0SXRlcktleXNGaWVsZCk7XHJcblxyXG5jbGFzcyBTdHJ1Y3RVaW50RmllbGQgZXh0ZW5kcyBTdHJ1Y3RGaWVsZFR5cGUge1xyXG4gIHN0YXRpYyBwYWNrKFxyXG4gICAgX21hbmFnZXI6IFNUUlVDVCxcclxuICAgIGRhdGE6IG51bWJlcltdLFxyXG4gICAgdmFsOiB1bmtub3duLFxyXG4gICAgX29iajogdW5rbm93bixcclxuICAgIF9maWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgICBfdHlwZTogU3RydWN0VHlwZVxyXG4gICk6IHZvaWQge1xyXG4gICAgcGFja191aW50KGRhdGEsIHZhbCBhcyBudW1iZXIpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHVucGFjayhfbWFuYWdlcjogU1RSVUNULCBkYXRhOiBEYXRhVmlldywgX3R5cGU6IFN0cnVjdFR5cGUsIHVjdHg6IHVucGFja19jb250ZXh0KTogbnVtYmVyIHtcclxuICAgIHJldHVybiB1bnBhY2tfdWludChkYXRhLCB1Y3R4KTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyB2YWxpZGF0ZUpTT04oXHJcbiAgICBfbWFuYWdlcjogU1RSVUNULFxyXG4gICAgdmFsOiB1bmtub3duLFxyXG4gICAgX29iajogdW5rbm93bixcclxuICAgIF9maWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgICBfdHlwZTogU3RydWN0VHlwZSxcclxuICAgIF9pbnN0YW5jZTogdW5rbm93blxyXG4gICk6IGJvb2xlYW4gfCBzdHJpbmcge1xyXG4gICAgaWYgKHR5cGVvZiB2YWwgIT09IFwibnVtYmVyXCIgfHwgdmFsICE9PSBNYXRoLmZsb29yKHZhbCkpIHtcclxuICAgICAgcmV0dXJuIFwiXCIgKyB2YWwgKyBcIiBpcyBub3QgYW4gaW50ZWdlclwiO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGRlZmluZSgpOiBTdHJ1Y3RGaWVsZFR5cGVEZWZpbmUge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdHlwZTogU3RydWN0RW51bS5VSU5ULFxyXG4gICAgICBuYW1lOiBcInVpbnRcIixcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG5TdHJ1Y3RGaWVsZFR5cGUucmVnaXN0ZXIoU3RydWN0VWludEZpZWxkKTtcclxuXHJcbmNsYXNzIFN0cnVjdFVzaG9ydEZpZWxkIGV4dGVuZHMgU3RydWN0RmllbGRUeXBlIHtcclxuICBzdGF0aWMgcGFjayhcclxuICAgIF9tYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICBkYXRhOiBudW1iZXJbXSxcclxuICAgIHZhbDogdW5rbm93bixcclxuICAgIF9vYmo6IHVua25vd24sXHJcbiAgICBfZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgX3R5cGU6IFN0cnVjdFR5cGVcclxuICApOiB2b2lkIHtcclxuICAgIHBhY2tfdXNob3J0KGRhdGEsIHZhbCBhcyBudW1iZXIpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHVucGFjayhfbWFuYWdlcjogU1RSVUNULCBkYXRhOiBEYXRhVmlldywgX3R5cGU6IFN0cnVjdFR5cGUsIHVjdHg6IHVucGFja19jb250ZXh0KTogbnVtYmVyIHtcclxuICAgIHJldHVybiB1bnBhY2tfdXNob3J0KGRhdGEsIHVjdHgpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHZhbGlkYXRlSlNPTihcclxuICAgIF9tYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBfb2JqOiB1bmtub3duLFxyXG4gICAgX2ZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICAgIF90eXBlOiBTdHJ1Y3RUeXBlLFxyXG4gICAgX2luc3RhbmNlOiB1bmtub3duXHJcbiAgKTogYm9vbGVhbiB8IHN0cmluZyB7XHJcbiAgICBpZiAodHlwZW9mIHZhbCAhPT0gXCJudW1iZXJcIiB8fCB2YWwgIT09IE1hdGguZmxvb3IodmFsKSkge1xyXG4gICAgICByZXR1cm4gXCJcIiArIHZhbCArIFwiIGlzIG5vdCBhbiBpbnRlZ2VyXCI7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgZGVmaW5lKCk6IFN0cnVjdEZpZWxkVHlwZURlZmluZSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0eXBlOiBTdHJ1Y3RFbnVtLlVTSE9SVCxcclxuICAgICAgbmFtZTogXCJ1c2hvcnRcIixcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG5TdHJ1Y3RGaWVsZFR5cGUucmVnaXN0ZXIoU3RydWN0VXNob3J0RmllbGQpO1xyXG5cclxuLy9sZXQgd3JpdGVFbXB0eSA9IHdyaXRlRW1wdHkgPSBmdW5jdGlvbiB3cml0ZUVtcHR5KHN0dCkge1xyXG4vL31cclxuXHJcbmNsYXNzIFN0cnVjdFN0YXRpY0FycmF5RmllbGQgZXh0ZW5kcyBTdHJ1Y3RGaWVsZFR5cGUge1xyXG4gIHN0YXRpYyBwYWNrKFxyXG4gICAgbWFuYWdlcjogU1RSVUNULFxyXG4gICAgZGF0YTogbnVtYmVyW10sXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBvYmo6IHVua25vd24sXHJcbiAgICBmaWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgICB0eXBlOiBTdHJ1Y3RUeXBlXHJcbiAgKTogdm9pZCB7XHJcbiAgICBsZXQgZCA9IHR5cGUuZGF0YSBhcyB7IHNpemU6IG51bWJlcjsgaW5hbWU6IHN0cmluZzsgdHlwZTogU3RydWN0VHlwZSB9O1xyXG5cclxuICAgIGlmIChkLnNpemUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0eXBlLmRhdGEuc2l6ZSB3YXMgdW5kZWZpbmVkXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBpdGVybmFtZSA9IGQuaW5hbWU7XHJcbiAgICBsZXQgYXJyID0gdmFsIGFzIHVua25vd25bXSB8IHVuZGVmaW5lZDtcclxuXHJcbiAgICBpZiAoYXJyID09PSB1bmRlZmluZWQgfHwgIShhcnIgYXMgdW5rbm93bltdKS5sZW5ndGgpIHtcclxuICAgICAgdGhpcy5wYWNrTnVsbChtYW5hZ2VyLCBkYXRhLCBmaWVsZCBhcyBTdHJ1Y3RGaWVsZCwgdHlwZSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGQuc2l6ZTsgaSsrKSB7XHJcbiAgICAgIGxldCBpMiA9IE1hdGgubWluKGksIE1hdGgubWluKGFyci5sZW5ndGggLSAxLCBkLnNpemUpKTtcclxuICAgICAgbGV0IHZhbDI6IHVua25vd24gPSBhcnJbaTJdO1xyXG5cclxuICAgICAgLy8qXHJcbiAgICAgIGlmIChpdGVybmFtZSAhPT0gXCJcIiAmJiBpdGVybmFtZSAhPT0gdW5kZWZpbmVkICYmIChmaWVsZCBhcyBTdHJ1Y3RGaWVsZCkuZ2V0KSB7XHJcbiAgICAgICAgbGV0IGVudiA9IF93c19lbnYkMTtcclxuICAgICAgICBlbnZbMF1bMF0gPSBpdGVybmFtZTtcclxuICAgICAgICBlbnZbMF1bMV0gPSB2YWwyO1xyXG4gICAgICAgIHZhbDIgPSBtYW5hZ2VyLl9lbnZfY2FsbCgoZmllbGQgYXMgU3RydWN0RmllbGQpLmdldCEsIG9iaiwgZW52KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgZG9fcGFjayhtYW5hZ2VyLCBkYXRhLCB2YWwyLCBhcnIsIGZpZWxkLCBkLnR5cGUpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc3RhdGljIHVzZUhlbHBlckpTKGZpZWxkOiBTdHJ1Y3RGaWVsZCk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuICEoZmllbGQudHlwZS5kYXRhIGFzIHsgaW5hbWU6IHN0cmluZyB9KS5pbmFtZTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyB2YWxpZGF0ZUpTT04oXHJcbiAgICBtYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBvYmo6IHVua25vd24sXHJcbiAgICBmaWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgICB0eXBlOiBTdHJ1Y3RUeXBlLFxyXG4gICAgaW5zdGFuY2U6IHVua25vd24sXHJcbiAgICBfYWJzdHJhY3RLZXk/OiBzdHJpbmdcclxuICApOiBib29sZWFuIHwgc3RyaW5nIHtcclxuICAgIHJldHVybiBTdHJ1Y3RBcnJheUZpZWxkLnZhbGlkYXRlSlNPTihtYW5hZ2VyLCB2YWwsIG9iaiwgZmllbGQsIHR5cGUsIGluc3RhbmNlLCBfYWJzdHJhY3RLZXkpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGZyb21KU09OKFxyXG4gICAgbWFuYWdlcjogU1RSVUNULFxyXG4gICAgdmFsOiB1bmtub3duLFxyXG4gICAgb2JqOiB1bmtub3duLFxyXG4gICAgZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgdHlwZTogU3RydWN0VHlwZSxcclxuICAgIGluc3RhbmNlOiB1bmtub3duXHJcbiAgKTogdW5rbm93bltdIHtcclxuICAgIHJldHVybiBTdHJ1Y3RBcnJheUZpZWxkLmZyb21KU09OKG1hbmFnZXIsIHZhbCwgb2JqLCBmaWVsZCwgdHlwZSwgaW5zdGFuY2UpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGZvcm1hdEpTT04oXHJcbiAgICBtYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBvYmo6IHVua25vd24sXHJcbiAgICBmaWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgICB0eXBlOiBTdHJ1Y3RUeXBlLFxyXG4gICAgaW5zdGFuY2U6IHVua25vd24sXHJcbiAgICB0bHZsOiBudW1iZXJcclxuICApOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIGZvcm1hdEFycmF5SnNvbihcclxuICAgICAgbWFuYWdlcixcclxuICAgICAgdmFsLFxyXG4gICAgICBvYmosXHJcbiAgICAgIGZpZWxkLFxyXG4gICAgICB0eXBlLFxyXG4gICAgICAodHlwZS5kYXRhIGFzIHsgdHlwZTogU3RydWN0VHlwZSB9KS50eXBlLFxyXG4gICAgICBpbnN0YW5jZSxcclxuICAgICAgdGx2bCxcclxuICAgICAgbGlzdCh2YWwgYXMgSXRlcmFibGU8dW5rbm93bj4pXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHBhY2tOdWxsKG1hbmFnZXI6IFNUUlVDVCwgZGF0YTogbnVtYmVyW10sIGZpZWxkOiBTdHJ1Y3RGaWVsZCwgdHlwZTogU3RydWN0VHlwZSk6IHZvaWQge1xyXG4gICAgbGV0IGQgPSB0eXBlLmRhdGEgYXMgeyBzaXplOiBudW1iZXI7IHR5cGU6IFN0cnVjdFR5cGUgfTtcclxuICAgIGxldCBzaXplID0gZC5zaXplO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcclxuICAgICAgcGFja051bGwobWFuYWdlciwgZGF0YSwgZmllbGQsIGQudHlwZSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgdG9KU09OKFxyXG4gICAgbWFuYWdlcjogU1RSVUNULFxyXG4gICAgdmFsOiB1bmtub3duLFxyXG4gICAgb2JqOiB1bmtub3duLFxyXG4gICAgZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgdHlwZTogU3RydWN0VHlwZVxyXG4gICk6IHVua25vd25bXSB7XHJcbiAgICByZXR1cm4gU3RydWN0QXJyYXlGaWVsZC50b0pTT04obWFuYWdlciwgdmFsLCBvYmosIGZpZWxkLCB0eXBlKTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBmb3JtYXQodHlwZTogU3RydWN0VHlwZSk6IHN0cmluZyB7XHJcbiAgICBsZXQgZCA9IHR5cGUuZGF0YSBhcyB7IHNpemU6IG51bWJlcjsgaW5hbWU6IHN0cmluZzsgdHlwZTogU3RydWN0VHlwZSB9O1xyXG4gICAgbGV0IHR5cGUyID0gU3RydWN0RmllbGRUeXBlTWFwW2QudHlwZS50eXBlXS5mb3JtYXQoZC50eXBlKTtcclxuXHJcbiAgICBsZXQgcmV0ID0gYHN0YXRpY19hcnJheVske3R5cGUyfSwgJHtkLnNpemV9YDtcclxuXHJcbiAgICBpZiAoZC5pbmFtZSkge1xyXG4gICAgICByZXQgKz0gYCwgJHtkLmluYW1lfWA7XHJcbiAgICB9XHJcbiAgICByZXQgKz0gYF1gO1xyXG5cclxuICAgIHJldHVybiByZXQ7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgdW5wYWNrSW50byhcclxuICAgIG1hbmFnZXI6IFNUUlVDVCxcclxuICAgIGRhdGE6IERhdGFWaWV3LFxyXG4gICAgdHlwZTogU3RydWN0VHlwZSxcclxuICAgIHVjdHg6IHVucGFja19jb250ZXh0LFxyXG4gICAgcmV0OiB1bmtub3duW11cclxuICApOiB1bmtub3duW10ge1xyXG4gICAgbGV0IGQgPSB0eXBlLmRhdGEgYXMgeyBzaXplOiBudW1iZXI7IHR5cGU6IFN0cnVjdFR5cGUgfTtcclxuICAgIHBhY2tlcl9kZWJ1ZyQxKFwiLXNpemU6IFwiICsgZC5zaXplKTtcclxuXHJcbiAgICByZXQubGVuZ3RoID0gMDtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGQuc2l6ZTsgaSsrKSB7XHJcbiAgICAgIHJldC5wdXNoKHVucGFja19maWVsZChtYW5hZ2VyLCBkYXRhLCBkLnR5cGUsIHVjdHgpKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmV0O1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHVucGFjayhtYW5hZ2VyOiBTVFJVQ1QsIGRhdGE6IERhdGFWaWV3LCB0eXBlOiBTdHJ1Y3RUeXBlLCB1Y3R4OiB1bnBhY2tfY29udGV4dCk6IHVua25vd25bXSB7XHJcbiAgICBsZXQgZCA9IHR5cGUuZGF0YSBhcyB7IHNpemU6IG51bWJlcjsgdHlwZTogU3RydWN0VHlwZSB9O1xyXG4gICAgcGFja2VyX2RlYnVnJDEoXCItc2l6ZTogXCIgKyBkLnNpemUpO1xyXG5cclxuICAgIGxldCByZXQ6IHVua25vd25bXSA9IFtdO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZC5zaXplOyBpKyspIHtcclxuICAgICAgcmV0LnB1c2godW5wYWNrX2ZpZWxkKG1hbmFnZXIsIGRhdGEsIGQudHlwZSwgdWN0eCkpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXQ7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgZGVmaW5lKCk6IFN0cnVjdEZpZWxkVHlwZURlZmluZSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0eXBlOiBTdHJ1Y3RFbnVtLlNUQVRJQ19BUlJBWSxcclxuICAgICAgbmFtZTogXCJzdGF0aWNfYXJyYXlcIixcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG5TdHJ1Y3RGaWVsZFR5cGUucmVnaXN0ZXIoU3RydWN0U3RhdGljQXJyYXlGaWVsZCk7XHJcblxyXG5jbGFzcyBTdHJ1Y3RPcHRpb25hbEZpZWxkIGV4dGVuZHMgU3RydWN0RmllbGRUeXBlIHtcclxuICBzdGF0aWMgcGFjayhcclxuICAgIG1hbmFnZXI6IFNUUlVDVCxcclxuICAgIGRhdGE6IG51bWJlcltdLFxyXG4gICAgdmFsOiB1bmtub3duLFxyXG4gICAgb2JqOiB1bmtub3duLFxyXG4gICAgZmllbGQ6IFN0cnVjdEZpZWxkIHwgRmFrZUZpZWxkLFxyXG4gICAgdHlwZTogU3RydWN0VHlwZVxyXG4gICk6IHZvaWQge1xyXG4gICAgcGFja19pbnQoZGF0YSwgdmFsICE9PSB1bmRlZmluZWQgJiYgdmFsICE9PSBudWxsID8gMSA6IDApO1xyXG4gICAgaWYgKHZhbCAhPT0gdW5kZWZpbmVkICYmIHZhbCAhPT0gbnVsbCkge1xyXG4gICAgICBjb25zdCBmYWtlRmllbGQ6IFN0cnVjdEZpZWxkID0geyAuLi4oZmllbGQgYXMgU3RydWN0RmllbGQpIH07XHJcbiAgICAgIGZha2VGaWVsZC50eXBlID0gdHlwZS5kYXRhIGFzIFN0cnVjdFR5cGU7XHJcbiAgICAgIGRvX3BhY2sobWFuYWdlciwgZGF0YSwgdmFsLCBvYmosIGZha2VGaWVsZCwgdHlwZS5kYXRhIGFzIFN0cnVjdFR5cGUpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc3RhdGljIGZha2VGaWVsZChmaWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsIHR5cGU6IFN0cnVjdFR5cGUpOiBTdHJ1Y3RGaWVsZCB7XHJcbiAgICByZXR1cm4geyAuLi4oZmllbGQgYXMgU3RydWN0RmllbGQpLCB0eXBlOiB0eXBlLmRhdGEgYXMgU3RydWN0VHlwZSB9O1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHZhbGlkYXRlSlNPTihcclxuICAgIG1hbmFnZXI6IFNUUlVDVCxcclxuICAgIHZhbDogdW5rbm93bixcclxuICAgIG9iajogdW5rbm93bixcclxuICAgIGZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICAgIHR5cGU6IFN0cnVjdFR5cGUsXHJcbiAgICBfaW5zdGFuY2U6IHVua25vd24sXHJcbiAgICBfYWJzdHJhY3RLZXk/OiBzdHJpbmdcclxuICApOiBib29sZWFuIHwgc3RyaW5nIHtcclxuICAgIGNvbnN0IGZha2VGaWVsZCA9IHRoaXMuZmFrZUZpZWxkKGZpZWxkLCB0eXBlKTtcclxuICAgIHJldHVybiB2YWwgIT09IHVuZGVmaW5lZCAmJiB2YWwgIT09IG51bGxcclxuICAgICAgPyB2YWxpZGF0ZUpTT04kMShtYW5hZ2VyLCB2YWwsIG9iaiwgZmFrZUZpZWxkLCB0eXBlLmRhdGEgYXMgU3RydWN0VHlwZSwgdW5kZWZpbmVkLCBfYWJzdHJhY3RLZXkpXHJcbiAgICAgIDogdHJ1ZTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBmcm9tSlNPTihcclxuICAgIG1hbmFnZXI6IFNUUlVDVCxcclxuICAgIHZhbDogdW5rbm93bixcclxuICAgIG9iajogdW5rbm93bixcclxuICAgIGZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICAgIHR5cGU6IFN0cnVjdFR5cGUsXHJcbiAgICBfaW5zdGFuY2U6IHVua25vd25cclxuICApOiB1bmtub3duIHtcclxuICAgIGNvbnN0IGZha2VGaWVsZCA9IHRoaXMuZmFrZUZpZWxkKGZpZWxkLCB0eXBlKTtcclxuICAgIHJldHVybiB2YWwgIT09IHVuZGVmaW5lZCAmJiB2YWwgIT09IG51bGxcclxuICAgICAgPyBmcm9tSlNPTihtYW5hZ2VyLCB2YWwsIG9iaiwgZmFrZUZpZWxkLCB0eXBlLmRhdGEgYXMgU3RydWN0VHlwZSwgdW5kZWZpbmVkKVxyXG4gICAgICA6IHVuZGVmaW5lZDtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBmb3JtYXRKU09OKFxyXG4gICAgbWFuYWdlcjogU1RSVUNULFxyXG4gICAgdmFsOiB1bmtub3duLFxyXG4gICAgX29iajogdW5rbm93bixcclxuICAgIGZpZWxkOiBTdHJ1Y3RGaWVsZCB8IEZha2VGaWVsZCxcclxuICAgIHR5cGU6IFN0cnVjdFR5cGUsXHJcbiAgICBpbnN0YW5jZTogdW5rbm93bixcclxuICAgIHRsdmw6IG51bWJlclxyXG4gICk6IHN0cmluZyB7XHJcbiAgICBpZiAodmFsICE9PSB1bmRlZmluZWQgJiYgdmFsICE9PSBudWxsKSB7XHJcbiAgICAgIGNvbnN0IGZha2VGaWVsZCA9IHRoaXMuZmFrZUZpZWxkKGZpZWxkLCB0eXBlKTtcclxuICAgICAgcmV0dXJuIGZvcm1hdEpTT04kMShtYW5hZ2VyLCB2YWwsIHZhbCwgZmFrZUZpZWxkLCB0eXBlLmRhdGEgYXMgU3RydWN0VHlwZSwgaW5zdGFuY2UsIHRsdmwgKyAxKTtcclxuICAgIH1cclxuICAgIHJldHVybiBcIm51bGxcIjtcclxuICB9XHJcblxyXG4gIHN0YXRpYyB0b0pTT04oXHJcbiAgICBtYW5hZ2VyOiBTVFJVQ1QsXHJcbiAgICB2YWw6IHVua25vd24sXHJcbiAgICBvYmo6IHVua25vd24sXHJcbiAgICBmaWVsZDogU3RydWN0RmllbGQgfCBGYWtlRmllbGQsXHJcbiAgICB0eXBlOiBTdHJ1Y3RUeXBlXHJcbiAgKTogdW5rbm93biB7XHJcbiAgICBjb25zdCBmYWtlRmllbGQgPSB0aGlzLmZha2VGaWVsZChmaWVsZCwgdHlwZSk7XHJcbiAgICByZXR1cm4gdmFsICE9PSB1bmRlZmluZWQgJiYgdmFsICE9PSBudWxsID8gdG9KU09OKG1hbmFnZXIsIHZhbCwgb2JqLCBmYWtlRmllbGQsIHR5cGUuZGF0YSBhcyBTdHJ1Y3RUeXBlKSA6IG51bGw7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgcGFja051bGwoX21hbmFnZXI6IFNUUlVDVCwgZGF0YTogbnVtYmVyW10sIF9maWVsZDogU3RydWN0RmllbGQsIF90eXBlOiBTdHJ1Y3RUeXBlKTogdm9pZCB7XHJcbiAgICBwYWNrX2ludChkYXRhLCAwKTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBmb3JtYXQodHlwZTogU3RydWN0VHlwZSk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gXCJvcHRpb25hbChcIiArIGZtdF90eXBlKHR5cGUuZGF0YSBhcyBTdHJ1Y3RUeXBlKSArIFwiKVwiO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHVucGFja0ludG8obWFuYWdlcjogU1RSVUNULCBkYXRhOiBEYXRhVmlldywgdHlwZTogU3RydWN0VHlwZSwgdWN0eDogdW5wYWNrX2NvbnRleHQsIF9kZXN0OiB1bmtub3duKTogdm9pZCB7XHJcbiAgICBsZXQgZXhpc3RzID0gdW5wYWNrX2ludChkYXRhLCB1Y3R4KTtcclxuXHJcbiAgICBwYWNrZXJfZGVidWckMShcIi1pbnQgXCIgKyBleGlzdHMpO1xyXG4gICAgcGFja2VyX2RlYnVnJDEoXCJvcHRpb25hbCBleGlzdHM6IFwiICsgZXhpc3RzKTtcclxuXHJcbiAgICBpZiAoIWV4aXN0cykge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdW5wYWNrX2ZpZWxkKG1hbmFnZXIsIGRhdGEsIHR5cGUuZGF0YSBhcyBTdHJ1Y3RUeXBlLCB1Y3R4KTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyB1bnBhY2sobWFuYWdlcjogU1RSVUNULCBkYXRhOiBEYXRhVmlldywgdHlwZTogU3RydWN0VHlwZSwgdWN0eDogdW5wYWNrX2NvbnRleHQpOiB1bmtub3duIHtcclxuICAgIGxldCBleGlzdHMgPSB1bnBhY2tfaW50KGRhdGEsIHVjdHgpO1xyXG5cclxuICAgIGlmICghZXhpc3RzKSB7XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHVucGFja19maWVsZChtYW5hZ2VyLCBkYXRhLCB0eXBlLmRhdGEgYXMgU3RydWN0VHlwZSwgdWN0eCk7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgZGVmaW5lKCk6IFN0cnVjdEZpZWxkVHlwZURlZmluZSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0eXBlOiBTdHJ1Y3RFbnVtLk9QVElPTkFMLFxyXG4gICAgICBuYW1lOiBcIm9wdGlvbmFsXCIsXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG5cclxuU3RydWN0RmllbGRUeXBlLnJlZ2lzdGVyKFN0cnVjdE9wdGlvbmFsRmllbGQpO1xyXG5cclxudmFyIF9zaW50ZXJuMiA9IC8qI19fUFVSRV9fKi8gT2JqZWN0LmZyZWV6ZSh7XHJcbiAgX19wcm90b19fICAgICAgICAgOiBudWxsLFxyXG4gIF9nZXRfcGFja19kZWJ1ZyAgIDogX2dldF9wYWNrX2RlYnVnLFxyXG4gIHNldFdhcm5pbmdNb2RlMiAgIDogc2V0V2FybmluZ01vZGUyLFxyXG4gIHNldERlYnVnTW9kZTIgICAgIDogc2V0RGVidWdNb2RlMixcclxuICBTdHJ1Y3RGaWVsZFR5cGVzICA6IFN0cnVjdEZpZWxkVHlwZXMsXHJcbiAgU3RydWN0RmllbGRUeXBlTWFwOiBTdHJ1Y3RGaWVsZFR5cGVNYXAsXHJcbiAgcGFja051bGwgICAgICAgICAgOiBwYWNrTnVsbCxcclxuICB0b0pTT04gICAgICAgICAgICA6IHRvSlNPTixcclxuICBmcm9tSlNPTiAgICAgICAgICA6IGZyb21KU09OLFxyXG4gIGZvcm1hdEpTT04gICAgICAgIDogZm9ybWF0SlNPTiQxLFxyXG4gIHZhbGlkYXRlSlNPTiAgICAgIDogdmFsaWRhdGVKU09OJDEsXHJcbiAgZG9fcGFjayAgICAgICAgICAgOiBkb19wYWNrLFxyXG4gIFN0cnVjdEZpZWxkVHlwZSAgIDogU3RydWN0RmllbGRUeXBlLFxyXG4gIGZvcm1hdEFycmF5SnNvbiAgIDogZm9ybWF0QXJyYXlKc29uLFxyXG59KTtcclxuXHJcbnZhciBzdHJ1Y3RFdmFsOiAoY29kZTogc3RyaW5nKSA9PiB1bmtub3duID0gZXZhbDtcclxuXHJcbmZ1bmN0aW9uIHNldFN0cnVjdEV2YWwodmFsOiAoY29kZTogc3RyaW5nKSA9PiB1bmtub3duKTogdm9pZCB7XHJcbiAgc3RydWN0RXZhbCA9IHZhbDtcclxufVxyXG5cclxudmFyIF9zdHJ1Y3RfZXZhbCA9IC8qI19fUFVSRV9fKi8gT2JqZWN0LmZyZWV6ZSh7XHJcbiAgX19wcm90b19fOiBudWxsLFxyXG4gIGdldCBzdHJ1Y3RFdmFsKCkge1xyXG4gICAgcmV0dXJuIHN0cnVjdEV2YWw7XHJcbiAgfSxcclxuICBzZXRTdHJ1Y3RFdmFsOiBzZXRTdHJ1Y3RFdmFsLFxyXG59KTtcclxuXHJcbi8qIC0tLS0gSlNPTiBwYXJzZXIgLS0tLSAqL1xyXG5cclxuaW50ZXJmYWNlIFRva0luZm8ge1xyXG4gIGxleHBvczogbnVtYmVyO1xyXG4gIGxpbmVubzogbnVtYmVyO1xyXG4gIGNvbDogbnVtYmVyO1xyXG4gIGZpZWxkczogUmVjb3JkPHN0cmluZyB8IG51bWJlciwgVG9rSW5mbz47XHJcbn1cclxuXHJcbmNvbnN0IFRva1N5bWJvbCA9IFN5bWJvbChcInRva2VuLWluZm9cIikgYXMgc3ltYm9sO1xyXG5cclxuZnVuY3Rpb24gYnVpbGRKU09OUGFyc2VyKCk6IHBhcnNlciB7XHJcbiAgbGV0IHRrID0gKG5hbWU6IHN0cmluZywgcmU6IFJlZ0V4cCwgZnVuYz86IFRva0Z1bmMsIGV4YW1wbGU/OiBzdHJpbmcpID0+IG5ldyB0b2tkZWYobmFtZSwgcmUsIGZ1bmMsIGV4YW1wbGUpO1xyXG5cclxuICBsZXQgcGFyc2U6IHBhcnNlcjtcclxuXHJcbiAgbGV0IG5pbnQgPSBcIlsrLV0/WzAtOV0rXCI7XHJcbiAgbGV0IG5oZXggPSBcIlsrLV0/MHhbMC05YS1mQS1GXStcIjtcclxuICBsZXQgbmZsb2F0MSA9IFwiWystXT9bMC05XStcXFxcLlswLTldKlwiO1xyXG4gIGxldCBuZmxvYXQyID0gXCJbKy1dP1swLTldKlxcXFwuWzAtOV0rXCI7XHJcbiAgbGV0IG5mbG9hdDMgPSBcIlsrLV0/WzAtOV0rXFxcXC5bMC05XStcIjtcclxuICBsZXQgbmZsb2F0ZXhwID0gXCJbKy1dP1swLTldK1xcXFwuWzAtOV0rW2VFXVsrLV0/WzAtOV0rXCI7XHJcblxyXG4gIGxldCBuZmxvYXQgPSBgKCR7bmZsb2F0MX0pfCgke25mbG9hdDJ9KXwoJHtuZmxvYXRleHB9KWA7XHJcbiAgbGV0IG51bSA9IGAoJHtuaW50fSl8KCR7bmZsb2F0fSl8KCR7bmhleH0pYDtcclxuICBsZXQgbnVtcmUgPSBuZXcgUmVnRXhwKG51bSk7XHJcblxyXG4gIGxldCBudW1yZVRlc3QgPSBuZXcgUmVnRXhwKGAoJHtudW19KSRgKTtcclxuXHJcbiAgLy9uZmxvYXQzIGhhcyB0byBiZSBpdHMgb3duIHJlZ2V4cCwgdGhlIHBhcnNlclxyXG4gIC8vYWx3YXlzIGNob29zZXMgdGhlIHRva2VuIGhhbmRsZXIgdGhhdCBwYXJzZXMgdGhlIG1vc3QgaW5wdXQsXHJcbiAgLy9hbmQgd2UgZG9uJ3Qgd2FudCB0aGUgcGFydGlhbCAwLiBhbmQgLjAgaGFuZGxlcyB0byBzcGxpdFxyXG4gIC8vZS5nLiAzLjUgaW50byAzIGFuZCAwLjVcclxuICBsZXQgbmZsb2F0M3JlID0gbmV3IFJlZ0V4cChuZmxvYXQzKTtcclxuICBsZXQgbmZsb2F0ZXhwcmUgPSBuZXcgUmVnRXhwKG5mbG9hdGV4cCk7XHJcblxyXG4gIGxldCB0ZXN0cyA9IFtcIjEuMjM0MjM0XCIsIFwiLjIzNDMyXCIsIFwiLTIzNC5cIiwgXCIxZS0xN1wiLCBcIi0weDIzNDIzZmZcIiwgXCIrMjM0MjNcIiwgXCItNC4yNjMyNTY0MTQ1NjA2MDFlLTE0XCJdO1xyXG4gIGZvciAobGV0IHRlc3Qgb2YgdGVzdHMpIHtcclxuICAgIGlmICghbnVtcmVUZXN0LnRlc3QodGVzdCkpIHtcclxuICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yISBOdW1iZXIgcmVnZXhwIGZhaWxlZDpcIiwgdGVzdCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBsZXQgdG9rZW5zID0gW1xyXG4gICAgdGsoXCJCT09MXCIsIC90cnVlfGZhbHNlLyksXHJcbiAgICB0ayhcIldTXCIsIC9bIFxcclxcdFxcbl0vLCAoX3QpID0+IHVuZGVmaW5lZCksIC8vZHJvcCB0b2tlblxyXG4gICAgdGsoXCJTVFJMSVRcIiwgL1tcIiddLywgKHQpID0+IHtcclxuICAgICAgbGV0IGxleCA9IHQubGV4ZXI7XHJcbiAgICAgIGxldCBjaGFyID0gdC52YWx1ZTtcclxuICAgICAgbGV0IGkgPSBsZXgubGV4cG9zO1xyXG4gICAgICBsZXQgbGV4ZGF0YSA9IGxleC5sZXhkYXRhO1xyXG5cclxuICAgICAgbGV0IGVzY2FwZTogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICB0LnZhbHVlID0gXCJcIjtcclxuXHJcbiAgICAgIHdoaWxlIChpIDwgbGV4ZGF0YS5sZW5ndGgpIHtcclxuICAgICAgICBsZXQgYyA9IGxleGRhdGFbaV07XHJcblxyXG4gICAgICAgIHQudmFsdWUgKz0gYztcclxuXHJcbiAgICAgICAgaWYgKGMgPT09IFwiXFxcXFwiKSB7XHJcbiAgICAgICAgICBlc2NhcGUgPSAhZXNjYXBlO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoIWVzY2FwZSAmJiBjID09PSBjaGFyKSB7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgZXNjYXBlID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpKys7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGxleC5sZXhwb3MgPSBpICsgMTtcclxuXHJcbiAgICAgIGlmICh0LnZhbHVlLmxlbmd0aCA+IDApIHtcclxuICAgICAgICB0LnZhbHVlID0gdC52YWx1ZS5zbGljZSgwLCB0LnZhbHVlLmxlbmd0aCAtIDEpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gdDtcclxuICAgIH0pLFxyXG4gICAgdGsoXCJMU0JSQUNLRVRcIiwgL1xcWy8pLFxyXG4gICAgdGsoXCJSU0JSQUNLRVRcIiwgL10vKSxcclxuICAgIHRrKFwiTEJSQUNFXCIsIC97LyksXHJcbiAgICB0ayhcIlJCUkFDRVwiLCAvfS8pLFxyXG4gICAgdGsoXCJOVUxMXCIsIC9udWxsLyksXHJcbiAgICB0ayhcIkNPTU1BXCIsIC8sLyksXHJcbiAgICB0ayhcIkNPTE9OXCIsIC86LyksXHJcbiAgICB0ayhcIk5VTVwiLCBudW1yZSwgKHQpID0+ICgodC52YWx1ZSA9IFwiXCIgKyBwYXJzZUZsb2F0KHQudmFsdWUpKSwgdCkpLFxyXG4gICAgdGsoXCJOVU1cIiwgbmZsb2F0M3JlLCAodCkgPT4gKCh0LnZhbHVlID0gXCJcIiArIHBhcnNlRmxvYXQodC52YWx1ZSkpLCB0KSksXHJcbiAgICB0ayhcIk5VTVwiLCBuZmxvYXRleHByZSwgKHQpID0+ICgodC52YWx1ZSA9IFwiXCIgKyBwYXJzZUZsb2F0KHQudmFsdWUpKSwgdCkpLFxyXG4gIF07XHJcblxyXG4gIGZ1bmN0aW9uIHRva2luZm8odDogdG9rZW4pOiBUb2tJbmZvIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGxleHBvczogdC5sZXhwb3MsXHJcbiAgICAgIGxpbmVubzogdC5saW5lbm8sXHJcbiAgICAgIGNvbCAgIDogdC5jb2wsXHJcbiAgICAgIGZpZWxkczoge30sXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcF9BcnJheShwOiBwYXJzZXIpOiB1bmtub3duW10ge1xyXG4gICAgcC5leHBlY3QoXCJMU0JSQUNLRVRcIik7XHJcbiAgICBsZXQgdCA9IHAucGVla25leHQoKTtcclxuICAgIGxldCBmaXJzdCA9IHRydWU7XHJcblxyXG4gICAgbGV0IHJldDogdW5rbm93bltdID0gW107XHJcblxyXG4gICAgKHJldCBhcyB1bmtub3duIGFzIFJlY29yZDxzeW1ib2wsIHVua25vd24+KVtUb2tTeW1ib2xdID0gdG9raW5mbyh0ISk7XHJcblxyXG4gICAgd2hpbGUgKHQgJiYgdC50eXBlICE9PSBcIlJTQlJBQ0tFVFwiKSB7XHJcbiAgICAgIGlmICghZmlyc3QpIHtcclxuICAgICAgICBwLmV4cGVjdChcIkNPTU1BXCIpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAoKHJldCBhcyB1bmtub3duIGFzIFJlY29yZDxzeW1ib2wsIHVua25vd24+KVtUb2tTeW1ib2xdIGFzIFRva0luZm8pLmZpZWxkc1tyZXQubGVuZ3RoXSA9IHRva2luZm8odCk7XHJcbiAgICAgIHJldC5wdXNoKHBfU3RhcnQocCkpO1xyXG5cclxuICAgICAgZmlyc3QgPSBmYWxzZTtcclxuICAgICAgdCA9IHAucGVla25leHQoKTtcclxuICAgIH1cclxuICAgIHAuZXhwZWN0KFwiUlNCUkFDS0VUXCIpO1xyXG5cclxuICAgIHJldHVybiByZXQ7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBwX09iamVjdChwOiBwYXJzZXIpOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XHJcbiAgICBwLmV4cGVjdChcIkxCUkFDRVwiKTtcclxuXHJcbiAgICBsZXQgb2JqOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xyXG5cclxuICAgIGxldCBmaXJzdCA9IHRydWU7XHJcbiAgICBsZXQgdCA9IHAucGVla25leHQoKTtcclxuXHJcbiAgICAob2JqIGFzIHVua25vd24gYXMgUmVjb3JkPHN5bWJvbCwgdW5rbm93bj4pW1Rva1N5bWJvbF0gPSB0b2tpbmZvKHQhKTtcclxuICAgIHdoaWxlICh0ICYmIHQudHlwZSAhPT0gXCJSQlJBQ0VcIikge1xyXG4gICAgICBpZiAoIWZpcnN0KSB7XHJcbiAgICAgICAgcC5leHBlY3QoXCJDT01NQVwiKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgbGV0IGtleSA9IHAuZXhwZWN0KFwiU1RSTElUXCIpO1xyXG4gICAgICBwLmV4cGVjdChcIkNPTE9OXCIpO1xyXG5cclxuICAgICAgbGV0IHZhbCA9IHBfU3RhcnQocCwgdHJ1ZSk7XHJcblxyXG4gICAgICBvYmpba2V5XSA9IHZhbDtcclxuICAgICAgZmlyc3QgPSBmYWxzZTtcclxuXHJcbiAgICAgIHQgPSBwLnBlZWtuZXh0KCk7XHJcbiAgICAgICgob2JqIGFzIHVua25vd24gYXMgUmVjb3JkPHN5bWJvbCwgdW5rbm93bj4pW1Rva1N5bWJvbF0gYXMgVG9rSW5mbykuZmllbGRzW2tleV0gPSB0b2tpbmZvKHQhKTtcclxuICAgIH1cclxuXHJcbiAgICBwLmV4cGVjdChcIlJCUkFDRVwiKTtcclxuXHJcbiAgICByZXR1cm4gb2JqO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcF9TdGFydChwOiBwYXJzZXIsIF90aHJvd0Vycm9yOiBib29sZWFuID0gdHJ1ZSk6IHVua25vd24ge1xyXG4gICAgbGV0IHQgPSBwLnBlZWtuZXh0KCkhO1xyXG4gICAgaWYgKHQudHlwZSA9PT0gXCJMU0JSQUNLRVRcIikge1xyXG4gICAgICByZXR1cm4gcF9BcnJheShwKTtcclxuICAgIH0gZWxzZSBpZiAodC50eXBlID09PSBcIkxCUkFDRVwiKSB7XHJcbiAgICAgIHJldHVybiBwX09iamVjdChwKTtcclxuICAgIH0gZWxzZSBpZiAodC50eXBlID09PSBcIlNUUkxJVFwiIHx8IHQudHlwZSA9PT0gXCJOVU1cIiB8fCB0LnR5cGUgPT09IFwiTlVMTFwiIHx8IHQudHlwZSA9PT0gXCJCT09MXCIpIHtcclxuICAgICAgcmV0dXJuIHAubmV4dCgpIS52YWx1ZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHAuZXJyb3IodCwgXCJVbmtub3duIHRva2VuXCIpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcF9FcnJvcih0b2tlbjogdG9rZW4gfCB1bmRlZmluZWQsIF9tc2c/OiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIHRocm93IG5ldyBQVVRJTF9QYXJzZUVycm9yKFwiUGFyc2UgRXJyb3JcIik7XHJcbiAgfVxyXG5cclxuICBsZXQgbGV4ID0gbmV3IGxleGVyKHRva2Vucyk7XHJcbiAgbGV4LmxpbmVzdGFydCA9IDA7XHJcbiAgcGFyc2UgPSBuZXcgcGFyc2VyKGxleCwgcF9FcnJvcik7XHJcbiAgcGFyc2Uuc3RhcnQgPSBwX1N0YXJ0IGFzIChwOiBwYXJzZXIpID0+IHVua25vd247XHJcbiAgLy9sZXgucHJpbnRUb2tlbnMgPSB0cnVlO1xyXG5cclxuICByZXR1cm4gcGFyc2U7XHJcbn1cclxuXHJcbnZhciBqc29uUGFyc2VyID0gYnVpbGRKU09OUGFyc2VyKCk7XHJcblxyXG5mdW5jdGlvbiBwcmludENvbnRleHQoYnVmOiBzdHJpbmcsIHRva2luZm86IFRva0luZm8gfCB1bmRlZmluZWQsIHByaW50Q29sb3JzOiBib29sZWFuID0gdHJ1ZSk6IHN0cmluZyB7XHJcbiAgbGV0IGxpbmVzID0gYnVmLnNwbGl0KFwiXFxuXCIpO1xyXG5cclxuICBpZiAoIXRva2luZm8pIHtcclxuICAgIHJldHVybiBcIlwiO1xyXG4gIH1cclxuXHJcbiAgbGV0IGxpbmVubyA9IHRva2luZm8ubGluZW5vO1xyXG4gIGxldCBjb2wgPSB0b2tpbmZvLmNvbDtcclxuXHJcbiAgbGV0IGlzdGFydCA9IE1hdGgubWF4KGxpbmVubyAtIDUwLCAwKTtcclxuICBsZXQgaWVuZCA9IE1hdGgubWluKGxpbmVubyArIDIsIGxpbmVzLmxlbmd0aCAtIDEpO1xyXG5cclxuICBsZXQgcyA9IFwiXCI7XHJcblxyXG4gIGlmIChwcmludENvbG9ycykge1xyXG4gICAgcyArPSB0ZXJtQ29sb3IoXCIgIC8qIHByZXR0eS1wcmludGVkIGpzb24gKi9cXG5cIiwgXCJibHVlXCIpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBzICs9IFwiLyogcHJldHR5LXByaW50ZWQganNvbiAqL1xcblwiO1xyXG4gIH1cclxuXHJcbiAgZm9yIChsZXQgaSA9IGlzdGFydDsgaSA8IGllbmQ7IGkrKykge1xyXG4gICAgbGV0IGwgPSBsaW5lc1tpXTtcclxuXHJcbiAgICBsZXQgaWR4ID0gXCJcIiArIGk7XHJcbiAgICB3aGlsZSAoaWR4Lmxlbmd0aCA8IDMpIHtcclxuICAgICAgaWR4ID0gXCIgXCIgKyBpZHg7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGkgPT09IGxpbmVubyAmJiBwcmludENvbG9ycykge1xyXG4gICAgICBzICs9IHRlcm1Db2xvcihgJHtpZHh9OiAke2x9XFxuYCwgXCJ5ZWxsb3dcIik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzICs9IGAke2lkeH06ICR7bH1cXG5gO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChpID09PSBsaW5lbm8pIHtcclxuICAgICAgbGV0IGwyID0gXCJcIjtcclxuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBjb2wgKyA1OyBqKyspIHtcclxuICAgICAgICBsMiArPSBcIiBcIjtcclxuICAgICAgfVxyXG5cclxuICAgICAgcyArPSBsMiArIFwiXlxcblwiO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHM7XHJcbn1cclxuXHJcbi8qIC0tLS0gZ2xvYmFsIC8gZGVidWcgLS0tLSAqL1xyXG5cclxudmFyIG5HbG9iYWw6IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xyXG5cclxuaWYgKHR5cGVvZiBnbG9iYWxUaGlzICE9PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgbkdsb2JhbCA9IGdsb2JhbFRoaXMgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcclxufSBlbHNlIGlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgbkdsb2JhbCA9IHdpbmRvdyBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xyXG59IGVsc2UgaWYgKFxyXG4gIHR5cGVvZiBnbG9iYWxUaGlzICE9PSBcInVuZGVmaW5lZFwiICYmXHJcbiAgdHlwZW9mIChnbG9iYWxUaGlzIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVtcImdsb2JhbFwiXSAhPT0gXCJ1bmRlZmluZWRcIlxyXG4pIHtcclxuICBuR2xvYmFsID0gKGdsb2JhbFRoaXMgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW1wiZ2xvYmFsXCJdIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xyXG59IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgbkdsb2JhbCA9IHNlbGYgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcclxufSBlbHNlIHtcclxuICBuR2xvYmFsID0ge307XHJcbn1cclxuXHJcbmNvbnN0IERFQlVHOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xyXG5cclxuZnVuY3Rpb24gdXBkYXRlREVCVUcoKTogdm9pZCB7XHJcbiAgZm9yIChsZXQgayBpbiBPYmplY3Qua2V5cyhERUJVRykpIHtcclxuICAgIGRlbGV0ZSBERUJVR1trXTtcclxuICB9XHJcblxyXG4gIGlmICh0eXBlb2Ygbkdsb2JhbC5ERUJVRyA9PT0gXCJvYmplY3RcIikge1xyXG4gICAgbGV0IGRiZyA9IG5HbG9iYWwuREVCVUcgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XHJcbiAgICBmb3IgKGxldCBrIGluIGRiZykge1xyXG4gICAgICBERUJVR1trXSA9IGRiZ1trXTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbihcInVzZSBzdHJpY3RcIik7XHJcblxyXG4vKiAtLS0tIG1haW4gU1RSVUNUIG1hbmFnZXIgLS0tLSAqL1xyXG5cclxuLy9uZWVkZWQgdG8gYXZvaWQgYSByb2xsdXAgYnVnIGluIGNvbmZpZ3VyYWJsZSBtb2RlXHJcbnZhciBzaW50ZXJuMiA9IF9zaW50ZXJuMjtcclxudmFyIHN0cnVjdF9ldmFsID0gX3N0cnVjdF9ldmFsO1xyXG5cclxubGV0IHdhcm5pbmdsdmwgPSAyO1xyXG5cclxudmFyIHRydW5jYXRlRG9sbGFyU2lnbiQxID0gdHJ1ZTtcclxudmFyIG1hbmFnZXI6IFNUUlVDVDtcclxuXHJcbmNsYXNzIEpTT05FcnJvciBleHRlbmRzIEVycm9yIHt9XHJcblxyXG5mdW5jdGlvbiBwcmludENvZGVMaW5lcyhjb2RlOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGxldCBsaW5lcyA9IGNvZGUuc3BsaXQoU3RyaW5nLmZyb21DaGFyQ29kZSgxMCkpO1xyXG4gIGxldCBidWYgPSBcIlwiO1xyXG5cclxuICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBsZXQgbGluZSA9IFwiXCIgKyAoaSArIDEpICsgXCI6XCI7XHJcblxyXG4gICAgd2hpbGUgKGxpbmUubGVuZ3RoIDwgMykge1xyXG4gICAgICBsaW5lICs9IFwiIFwiO1xyXG4gICAgfVxyXG5cclxuICAgIGxpbmUgKz0gXCIgXCIgKyBsaW5lc1tpXTtcclxuICAgIGJ1ZiArPSBsaW5lICsgU3RyaW5nLmZyb21DaGFyQ29kZSgxMCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gYnVmO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwcmludEV2YWxFcnJvcihjb2RlOiBzdHJpbmcpOiB2b2lkIHtcclxuICBjb25zb2xlLmxvZyhcIj09IENPREUgPT1cIik7XHJcbiAgY29uc29sZS5sb2cocHJpbnRDb2RlTGluZXMoY29kZSkpO1xyXG5cclxuICAvKiBOb2RlIHN1cHByZXNzZXMgdGhlIHJlYWwgZXJyb3IgbGluZSBudW1iZXIgaW4gZXJyb3Iuc3RhY2sgZm9yIHNvbWUgcmVhc29uLlxyXG4gICAqIEdldCBpdCBieSByZXRyaWdnZXJpbmcgdGhlIGVycm9yIGZvciByZWFsLlxyXG4gICAqL1xyXG4gIGV2YWwoY29kZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldFRydW5jYXRlRG9sbGFyU2lnbih2OiBib29sZWFuKTogdm9pZCB7XHJcbiAgdHJ1bmNhdGVEb2xsYXJTaWduJDEgPSAhIXY7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIF90cnVuY2F0ZURvbGxhclNpZ24oczogc3RyaW5nKTogc3RyaW5nIHtcclxuICBsZXQgaSA9IHMuc2VhcmNoKFwiJFwiKTtcclxuXHJcbiAgaWYgKGkgPiAwKSB7XHJcbiAgICByZXR1cm4gcy5zbGljZSgwLCBpKS50cmltKCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcztcclxufVxyXG5cclxuZnVuY3Rpb24gdW5tYW5nbGUobmFtZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICBpZiAodHJ1bmNhdGVEb2xsYXJTaWduJDEpIHtcclxuICAgIHJldHVybiBfdHJ1bmNhdGVEb2xsYXJTaWduKG5hbWUpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICByZXR1cm4gbmFtZTtcclxuICB9XHJcbn1cclxuXHJcbmxldCBfc3RhdGljX2VudmNvZGVfbnVsbCA9IFwiXCI7XHJcblxyXG4vL3RydW5jYXRlIHdlYnBhY2stbWFuZ2xlZCBuYW1lc1xyXG5cclxuZnVuY3Rpb24gZ2VuX3RhYnN0cih0b3Q6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgbGV0IHJldCA9IFwiXCI7XHJcblxyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdG90OyBpKyspIHtcclxuICAgIHJldCArPSBcIiBcIjtcclxuICB9XHJcblxyXG4gIHJldHVybiByZXQ7XHJcbn1cclxuXHJcbmxldCBwYWNrZXJfZGVidWc6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQ7XHJcbmxldCBwYWNrZXJfZGVidWdfc3RhcnQ6IChmdW5jbmFtZT86IHN0cmluZykgPT4gdm9pZDtcclxubGV0IHBhY2tlcl9kZWJ1Z19lbmQ6IChmdW5jbmFtZT86IHN0cmluZykgPT4gdm9pZDtcclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZV9kZWJ1Z19kYXRhKCk6IHZvaWQge1xyXG4gIGxldCByZXQgPSBfZ2V0X3BhY2tfZGVidWcoKTtcclxuXHJcbiAgcGFja2VyX2RlYnVnID0gcmV0LnBhY2tlcl9kZWJ1ZztcclxuICBwYWNrZXJfZGVidWdfc3RhcnQgPSByZXQucGFja2VyX2RlYnVnX3N0YXJ0O1xyXG4gIHBhY2tlcl9kZWJ1Z19lbmQgPSByZXQucGFja2VyX2RlYnVnX2VuZDtcclxuICB3YXJuaW5nbHZsID0gcmV0Lndhcm5pbmdsdmw7XHJcbn1cclxuXHJcbnVwZGF0ZV9kZWJ1Z19kYXRhKCk7XHJcblxyXG5mdW5jdGlvbiBzZXRXYXJuaW5nTW9kZSh0OiBudW1iZXIpOiB2b2lkIHtcclxuICBzaW50ZXJuMi5zZXRXYXJuaW5nTW9kZTIodCk7XHJcblxyXG4gIGlmICh0eXBlb2YgdCAhPT0gXCJudW1iZXJcIiB8fCBpc05hTih0KSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgYSBzaW5nbGUgbnVtYmVyICg+PSAwKSBhcmd1bWVudCB0byBzZXRXYXJuaW5nTW9kZVwiKTtcclxuICB9XHJcblxyXG4gIHdhcm5pbmdsdmwgPSB0O1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXREZWJ1Z01vZGUodDogbnVtYmVyKTogdm9pZCB7XHJcbiAgc2ludGVybjIuc2V0RGVidWdNb2RlMih0KTtcclxuICB1cGRhdGVfZGVidWdfZGF0YSgpO1xyXG59XHJcblxyXG5sZXQgX3dzX2VudjogW3Vua25vd24sIHVua25vd25dW10gPSBbW3VuZGVmaW5lZCwgdW5kZWZpbmVkXV07XHJcblxyXG5pbnRlcmZhY2UgU1RSVUNUS2V5d29yZHMge1xyXG4gIHNjcmlwdDogc3RyaW5nO1xyXG4gIG5hbWU6IHN0cmluZztcclxuICBsb2FkOiBzdHJpbmc7XHJcbiAgbmV3OiBzdHJpbmc7XHJcbiAgYWZ0ZXI/OiBzdHJpbmc7XHJcbiAgZnJvbTogc3RyaW5nO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkZWZpbmVfZW1wdHlfY2xhc3Moc2NsczogdHlwZW9mIFNUUlVDVCwgbmFtZTogc3RyaW5nKTogU3RydWN0YWJsZUNsYXNzIHtcclxuICBsZXQgY2xzID0gZnVuY3Rpb24gKCkge30gYXMgdW5rbm93biBhcyBTdHJ1Y3RhYmxlQ2xhc3M7XHJcblxyXG4gIGNscy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdC5wcm90b3R5cGUpO1xyXG4gIChjbHMgYXMgdW5rbm93biBhcyB7IGNvbnN0cnVjdG9yOiBGdW5jdGlvbiB9KS5jb25zdHJ1Y3RvciA9IGNscy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjbHM7XHJcblxyXG4gIGxldCBrZXl3b3JkcyA9IHNjbHMua2V5d29yZHM7XHJcblxyXG4gIChjbHMgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikuU1RSVUNUID0gbmFtZSArIFwiIHtcXG4gIH1cXG5cIjtcclxuICBjbHMuc3RydWN0TmFtZSA9IG5hbWU7XHJcblxyXG4gIGNscy5wcm90b3R5cGUubG9hZFNUUlVDVCA9IGZ1bmN0aW9uIChyZWFkZXI6IFN0cnVjdFJlYWRlcikge1xyXG4gICAgcmVhZGVyKHRoaXMpO1xyXG4gIH07XHJcblxyXG4gIChjbHMgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikubmV3U1RSVUNUID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIG5ldyAoY2xzIGFzIHVua25vd24gYXMgbmV3ICgpID0+IHVua25vd24pKCk7XHJcbiAgfTtcclxuXHJcbiAgcmV0dXJuIGNscztcclxufVxyXG5cclxubGV0IGhhdmVDb2RlR2VuOiBib29sZWFuIHwgdW5kZWZpbmVkO1xyXG5cclxuLy8kS0VZV09SRF9DT05GSUdfU1RBUlRcclxuXHJcbmNsYXNzIFNUUlVDVCB7XHJcbiAgaWRnZW46IG51bWJlcjtcclxuICBhbGxvd092ZXJyaWRpbmc6IGJvb2xlYW47XHJcbiAgc3RydWN0czogUmVjb3JkPHN0cmluZywgTlN0cnVjdD47XHJcbiAgc3RydWN0X2NsczogUmVjb3JkPHN0cmluZywgU3RydWN0YWJsZUNsYXNzPjtcclxuICBzdHJ1Y3RfaWRzOiBSZWNvcmQ8bnVtYmVyLCBOU3RydWN0PjtcclxuICBjb21waWxlZF9jb2RlOiBSZWNvcmQ8c3RyaW5nLCBGdW5jdGlvbj47XHJcbiAgbnVsbF9uYXRpdmVzOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+O1xyXG4gIGpzb25Vc2VDb2xvcnM6IGJvb2xlYW47XHJcbiAganNvbkJ1Zjogc3RyaW5nO1xyXG4gIGZvcm1hdEN0eDogeyBhZGRDb21tZW50cz86IGJvb2xlYW47IHZhbGlkYXRlPzogYm9vbGVhbiB9O1xyXG4gIGpzb25Mb2dnZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQ7XHJcblxyXG4gIHN0YXRpYyBrZXl3b3JkczogU1RSVUNUS2V5d29yZHM7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5pZGdlbiA9IDA7XHJcbiAgICB0aGlzLmFsbG93T3ZlcnJpZGluZyA9IHRydWU7XHJcblxyXG4gICAgdGhpcy5zdHJ1Y3RzID0ge307XHJcbiAgICB0aGlzLnN0cnVjdF9jbHMgPSB7fTtcclxuICAgIHRoaXMuc3RydWN0X2lkcyA9IHt9O1xyXG5cclxuICAgIHRoaXMuY29tcGlsZWRfY29kZSA9IHt9O1xyXG4gICAgdGhpcy5udWxsX25hdGl2ZXMgPSB7fTtcclxuXHJcbiAgICB0aGlzLmRlZmluZV9udWxsX25hdGl2ZShcIk9iamVjdFwiLCBPYmplY3QgYXMgdW5rbm93biBhcyBTdHJ1Y3RhYmxlQ2xhc3MpO1xyXG5cclxuICAgIHRoaXMuanNvblVzZUNvbG9ycyA9IHRydWU7XHJcbiAgICB0aGlzLmpzb25CdWYgPSBcIlwiO1xyXG4gICAgdGhpcy5mb3JtYXRDdHggPSB7fTtcclxuICAgIHRoaXMuanNvbkxvZ2dlciA9IGZ1bmN0aW9uICguLi5hcmdzOiB1bmtub3duW10pIHtcclxuICAgICAgY29uc29sZS5sb2coLi4uYXJncyk7XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGluaGVyaXQoY2hpbGQ6IFN0cnVjdGFibGVDbGFzcywgcGFyZW50OiBTdHJ1Y3RhYmxlQ2xhc3MsIHN0cnVjdE5hbWU6IHN0cmluZyA9IGNoaWxkLm5hbWUpOiBzdHJpbmcge1xyXG4gICAgY29uc3Qga2V5d29yZHMgPSB0aGlzLmtleXdvcmRzO1xyXG5cclxuICAgIGlmICghcGFyZW50LlNUUlVDVCkge1xyXG4gICAgICByZXR1cm4gc3RydWN0TmFtZSArIFwie1xcblwiO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBzdHQgPSBzdHJ1Y3RfcGFyc2UucGFyc2UocGFyZW50LlNUUlVDVCkgYXMgTlN0cnVjdDtcclxuICAgIGxldCBjb2RlID0gc3RydWN0TmFtZSArIFwie1xcblwiO1xyXG4gICAgY29kZSArPSBTVFJVQ1QuZm10X3N0cnVjdChzdHQsIHRydWUsIGZhbHNlLCB0cnVlKTtcclxuICAgIHJldHVybiBjb2RlO1xyXG4gIH1cclxuXHJcbiAgLyoqIGludm9rZSBsb2FkU1RSVUNUIG1ldGhvZHMgb24gcGFyZW50IG9iamVjdHMuICBub3RlIHRoYXRcclxuICAgcmVhZGVyKCkgaXMgb25seSBjYWxsZWQgb25jZS4gIGl0IGlzIGNhbGxlZCBob3dldmVyLiovXHJcbiAgc3RhdGljIFN1cGVyKG9iajogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sIHJlYWRlcjogU3RydWN0UmVhZGVyKTogdm9pZCB7XHJcbiAgICBpZiAod2FybmluZ2x2bCA+IDApIHtcclxuICAgICAgY29uc29sZS53YXJuKFwiZGVwcmVjYXRlZFwiKTtcclxuICAgIH1cclxuXHJcbiAgICByZWFkZXIob2JqKTtcclxuXHJcbiAgICBmdW5jdGlvbiByZWFkZXIyKF9vYmo6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7fVxyXG5cclxuICAgIGxldCBjbHMgPSAob2JqIGFzIHsgY29uc3RydWN0b3I/OiBTdHJ1Y3RhYmxlQ2xhc3MgfSkuY29uc3RydWN0b3I7XHJcbiAgICBsZXQgYmFkID1cclxuICAgICAgY2xzID09PSB1bmRlZmluZWQgfHxcclxuICAgICAgY2xzLnByb3RvdHlwZSA9PT0gdW5kZWZpbmVkIHx8XHJcbiAgICAgIChjbHMucHJvdG90eXBlIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5fX3Byb3RvX18gPT09IHVuZGVmaW5lZDtcclxuXHJcbiAgICBpZiAoYmFkKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgcGFyZW50ID0gKChjbHMhLnByb3RvdHlwZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikuX19wcm90b19fIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVxyXG4gICAgICAuY29uc3RydWN0b3IgYXMgU3RydWN0YWJsZUNsYXNzO1xyXG4gICAgYmFkID0gYmFkIHx8IHBhcmVudCA9PT0gdW5kZWZpbmVkO1xyXG5cclxuICAgIGlmIChcclxuICAgICAgIWJhZCAmJlxyXG4gICAgICBwYXJlbnQucHJvdG90eXBlLmxvYWRTVFJVQ1QgJiZcclxuICAgICAgcGFyZW50LnByb3RvdHlwZS5sb2FkU1RSVUNUICE9PSAob2JqIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5sb2FkU1RSVUNUXHJcbiAgICApIHtcclxuICAgICAgKHBhcmVudC5wcm90b3R5cGUubG9hZFNUUlVDVCBhcyBGdW5jdGlvbikuY2FsbChvYmosIHJlYWRlcjIpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqIGRlcHJlY2F0ZWQuICB1c2VkIHdpdGggb2xkIGZyb21TVFJVQ1QgaW50ZXJmYWNlLiAqL1xyXG4gIHN0YXRpYyBjaGFpbl9mcm9tU1RSVUNUKGNsczogU3RydWN0YWJsZUNsYXNzLCByZWFkZXI6IFN0cnVjdFJlYWRlcik6IHVua25vd24ge1xyXG4gICAgaWYgKHdhcm5pbmdsdmwgPiAwKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybihcIlVzaW5nIGRlcHJlY2F0ZWQgKGFuZCBldmlsKSBjaGFpbl9mcm9tU1RSVUNUIG1ldGhvZCwgZWVrIVwiKTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgcHJvdG8gPSBjbHMucHJvdG90eXBlO1xyXG4gICAgbGV0IHBhcmVudCA9ICgocHJvdG8gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pLnByb3RvdHlwZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilcclxuICAgICAgLmNvbnN0cnVjdG9yIGFzIFN0cnVjdGFibGVDbGFzcztcclxuXHJcbiAgICBsZXQgb2JqID0gcGFyZW50LmZyb21TVFJVQ1QhKHJlYWRlcik7XHJcbiAgICBsZXQgb2JqMiA9IG5ldyAoY2xzIGFzIHVua25vd24gYXMgbmV3ICgpID0+IFJlY29yZDxzdHJpbmcgfCBzeW1ib2wsIHVua25vd24+KSgpO1xyXG5cclxuICAgIGxldCBrZXlzOiAoc3RyaW5nIHwgc3ltYm9sKVtdID0gT2JqZWN0LmtleXMob2JqIGFzIG9iamVjdCkuY29uY2F0KFxyXG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKG9iaiBhcyBvYmplY3QpIGFzIHVua25vd24gYXMgc3RyaW5nW11cclxuICAgICk7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGxldCBrID0ga2V5c1tpXTtcclxuXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgKG9iajIgYXMgUmVjb3JkPHN0cmluZyB8IHN5bWJvbCwgdW5rbm93bj4pW2tdID0gKG9iaiBhcyBSZWNvcmQ8c3RyaW5nIHwgc3ltYm9sLCB1bmtub3duPilba107XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgaWYgKHdhcm5pbmdsdmwgPiAwKSB7XHJcbiAgICAgICAgICBjb25zb2xlLndhcm4oXCIgIGZhaWxlZCB0byBzZXQgcHJvcGVydHlcIiwgayk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG9iajI7XHJcbiAgfVxyXG5cclxuICAvL2RlZmluZWRfY2xhc3NlcyBpcyBhbiBhcnJheSBvZiBjbGFzcyBjb25zdHJ1Y3RvcnNcclxuICAvL3dpdGggU1RSVUNUIHNjcmlwdHMsICpPUiogYW5vdGhlciBTVFJVQ1QgaW5zdGFuY2VcclxuXHJcbiAgc3RhdGljIGZvcm1hdFN0cnVjdChzdHQ6IE5TdHJ1Y3QsIGludGVybmFsX29ubHk/OiBib29sZWFuLCBub19oZWxwZXJfanM/OiBib29sZWFuKTogc3RyaW5nIHtcclxuICAgIHJldHVybiB0aGlzLmZtdF9zdHJ1Y3Qoc3R0LCBpbnRlcm5hbF9vbmx5LCBub19oZWxwZXJfanMpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGZtdF9zdHJ1Y3Qoc3R0OiBOU3RydWN0LCBpbnRlcm5hbF9vbmx5PzogYm9vbGVhbiwgbm9faGVscGVyX2pzPzogYm9vbGVhbiwgYWRkQ29tbWVudHM/OiBib29sZWFuKTogc3RyaW5nIHtcclxuICAgIGlmIChpbnRlcm5hbF9vbmx5ID09PSB1bmRlZmluZWQpIGludGVybmFsX29ubHkgPSBmYWxzZTtcclxuICAgIGlmIChub19oZWxwZXJfanMgPT09IHVuZGVmaW5lZCkgbm9faGVscGVyX2pzID0gZmFsc2U7XHJcblxyXG4gICAgbGV0IHMgPSBcIlwiO1xyXG4gICAgaWYgKCFpbnRlcm5hbF9vbmx5KSB7XHJcbiAgICAgIHMgKz0gc3R0Lm5hbWU7XHJcbiAgICAgIGlmIChzdHQuaWQgIT09IC0xKSBzICs9IFwiIGlkPVwiICsgc3R0LmlkO1xyXG4gICAgICBzICs9IFwiIHtcXG5cIjtcclxuICAgIH1cclxuICAgIGxldCB0YWJTdHIgPSBcIiAgXCI7XHJcblxyXG4gICAgZnVuY3Rpb24gZm10X3R5cGUodHlwZTogU3RydWN0VHlwZSk6IHN0cmluZyB7XHJcbiAgICAgIHJldHVybiBTdHJ1Y3RGaWVsZFR5cGVNYXBbdHlwZS50eXBlXS5mb3JtYXQodHlwZSk7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGZpZWxkcyA9IHN0dC5maWVsZHM7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZpZWxkcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBsZXQgZiA9IGZpZWxkc1tpXTtcclxuICAgICAgcyArPSB0YWJTdHIgKyBmLm5hbWUgKyBcIiA6IFwiICsgZm10X3R5cGUoZi50eXBlKTtcclxuICAgICAgaWYgKCFub19oZWxwZXJfanMgJiYgZi5nZXQgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHMgKz0gXCIgfCBcIiArIGYuZ2V0LnRyaW0oKTtcclxuICAgICAgfVxyXG4gICAgICBzICs9IFwiO1wiO1xyXG5cclxuICAgICAgaWYgKGFkZENvbW1lbnRzICYmIGYuY29tbWVudC50cmltKCkpIHtcclxuICAgICAgICBzICs9IGYuY29tbWVudC50cmltKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHMgKz0gXCJcXG5cIjtcclxuICAgIH1cclxuICAgIGlmICghaW50ZXJuYWxfb25seSkgcyArPSBcIn1cIjtcclxuICAgIHJldHVybiBzO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHNldENsYXNzS2V5d29yZChrZXl3b3JkOiBzdHJpbmcsIG5hbWVLZXl3b3JkPzogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBpZiAoIW5hbWVLZXl3b3JkKSB7XHJcbiAgICAgIG5hbWVLZXl3b3JkID0ga2V5d29yZC50b0xvd2VyQ2FzZSgpICsgXCJOYW1lXCI7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5rZXl3b3JkcyA9IHtcclxuICAgICAgc2NyaXB0OiBrZXl3b3JkLFxyXG4gICAgICBuYW1lICA6IG5hbWVLZXl3b3JkLFxyXG4gICAgICBsb2FkICA6IFwibG9hZFwiICsga2V5d29yZCxcclxuICAgICAgbmV3ICAgOiBcIm5ld1wiICsga2V5d29yZCxcclxuICAgICAgYWZ0ZXIgOiBcImFmdGVyXCIgKyBrZXl3b3JkLFxyXG4gICAgICBmcm9tICA6IFwiZnJvbVwiICsga2V5d29yZCxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBkZWZpbmVfbnVsbF9uYXRpdmUobmFtZTogc3RyaW5nLCBjbHM6IFN0cnVjdGFibGVDbGFzcyk6IHZvaWQge1xyXG4gICAgY29uc3Qga2V5d29yZHMgPSAodGhpcy5jb25zdHJ1Y3RvciBhcyB0eXBlb2YgU1RSVUNUKS5rZXl3b3JkcztcclxuICAgIGxldCBvYmogPSBkZWZpbmVfZW1wdHlfY2xhc3ModGhpcy5jb25zdHJ1Y3RvciBhcyB0eXBlb2YgU1RSVUNULCBuYW1lKTtcclxuXHJcbiAgICBsZXQgc3R0ID0gc3RydWN0X3BhcnNlLnBhcnNlKG9iai5TVFJVQ1QhKSBhcyBOU3RydWN0O1xyXG5cclxuICAgIHN0dC5pZCA9IHRoaXMuaWRnZW4rKztcclxuXHJcbiAgICB0aGlzLnN0cnVjdHNbbmFtZV0gPSBzdHQ7XHJcbiAgICB0aGlzLnN0cnVjdF9jbHNbbmFtZV0gPSBjbHM7XHJcbiAgICB0aGlzLnN0cnVjdF9pZHNbc3R0LmlkXSA9IHN0dDtcclxuXHJcbiAgICB0aGlzLm51bGxfbmF0aXZlc1tuYW1lXSA9IDE7XHJcbiAgfVxyXG5cclxuICB2YWxpZGF0ZVN0cnVjdHMob25lcnJvcj86IChtc2c6IHN0cmluZywgc3R0OiBOU3RydWN0LCBmaWVsZDogU3RydWN0RmllbGQpID0+IHZvaWQpOiB2b2lkIHtcclxuICAgIGZ1bmN0aW9uIGdldFR5cGUodHlwZTogU3RydWN0VHlwZSk6IFN0cnVjdFR5cGUge1xyXG4gICAgICBzd2l0Y2ggKHR5cGUudHlwZSkge1xyXG4gICAgICAgIGNhc2UgU3RydWN0RW51bS5JVEVSS0VZUzpcclxuICAgICAgICBjYXNlIFN0cnVjdEVudW0uSVRFUjpcclxuICAgICAgICBjYXNlIFN0cnVjdEVudW0uU1RBVElDX0FSUkFZOlxyXG4gICAgICAgIGNhc2UgU3RydWN0RW51bS5BUlJBWTpcclxuICAgICAgICAgIHJldHVybiBnZXRUeXBlKCh0eXBlLmRhdGEgYXMgeyB0eXBlOiBTdHJ1Y3RUeXBlIH0pLnR5cGUpO1xyXG4gICAgICAgIGNhc2UgU3RydWN0RW51bS5UU1RSVUNUOlxyXG4gICAgICAgICAgcmV0dXJuIHR5cGU7XHJcbiAgICAgICAgY2FzZSBTdHJ1Y3RFbnVtLlNUUlVDVDpcclxuICAgICAgICAgIHJldHVybiB0eXBlO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICByZXR1cm4gdHlwZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZvcm1hdFR5cGUodHlwZTogU3RydWN0VHlwZSk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcclxuICAgICAgbGV0IHJldDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcclxuXHJcbiAgICAgIHJldC50eXBlID0gdHlwZS50eXBlO1xyXG5cclxuICAgICAgaWYgKHR5cGVvZiByZXQudHlwZSA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgIGZvciAobGV0IGsgaW4gU3RydWN0RW51bSkge1xyXG4gICAgICAgICAgaWYgKChTdHJ1Y3RFbnVtIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pW2tdID09PSByZXQudHlwZSkge1xyXG4gICAgICAgICAgICByZXQudHlwZSA9IGs7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcmV0LnR5cGUgPT09IFwib2JqZWN0XCIpIHtcclxuICAgICAgICByZXQudHlwZSA9IGZvcm1hdFR5cGUocmV0LnR5cGUgYXMgU3RydWN0VHlwZSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh0eXBlb2YgdHlwZS5kYXRhID09PSBcIm9iamVjdFwiKSB7XHJcbiAgICAgICAgcmV0LmRhdGEgPSBmb3JtYXRUeXBlKHR5cGUuZGF0YSBhcyBTdHJ1Y3RUeXBlKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXQuZGF0YSA9IHR5cGUuZGF0YTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHJldDtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgZnVuY3Rpb24gdGhyb3dFcnJvcihzdHQ6IE5TdHJ1Y3QsIGZpZWxkOiBTdHJ1Y3RGaWVsZCwgbXNnOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgICAgbGV0IGJ1ZiA9IFNUUlVDVC5mb3JtYXRTdHJ1Y3Qoc3R0KTtcclxuXHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoYnVmICsgXCJcXG5cXG5cIiArIG1zZyk7XHJcblxyXG4gICAgICBpZiAob25lcnJvcikge1xyXG4gICAgICAgIG9uZXJyb3IobXNnLCBzdHQsIGZpZWxkKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAobGV0IGsgaW4gdGhpcy5zdHJ1Y3RzKSB7XHJcbiAgICAgIGxldCBzdHQgPSB0aGlzLnN0cnVjdHNba107XHJcblxyXG4gICAgICBmb3IgKGxldCBmaWVsZCBvZiBzdHQuZmllbGRzKSB7XHJcbiAgICAgICAgaWYgKGZpZWxkLm5hbWUgPT09IFwidGhpc1wiKSB7XHJcbiAgICAgICAgICBsZXQgdHlwZSA9IGZpZWxkLnR5cGUudHlwZTtcclxuXHJcbiAgICAgICAgICBpZiAoVmFsdWVUeXBlcy5oYXModHlwZSkpIHtcclxuICAgICAgICAgICAgdGhyb3dFcnJvcihzdHQsIGZpZWxkLCBcIid0aGlzJyBjYW5ub3QgYmUgdXNlZCB3aXRoIHZhbHVlIHR5cGVzXCIpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHR5cGUgPSBnZXRUeXBlKGZpZWxkLnR5cGUpO1xyXG5cclxuICAgICAgICBpZiAodHlwZS50eXBlICE9PSBTdHJ1Y3RFbnVtLlNUUlVDVCAmJiB0eXBlLnR5cGUgIT09IFN0cnVjdEVudW0uVFNUUlVDVCkge1xyXG4gICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoISgodHlwZS5kYXRhIGFzIHN0cmluZykgaW4gdGhpcy5zdHJ1Y3RzKSkge1xyXG4gICAgICAgICAgbGV0IG1zZyA9IHN0dC5uYW1lICsgXCI6XCIgKyBmaWVsZC5uYW1lICsgXCI6IFVua25vd24gc3RydWN0IFwiICsgdHlwZS5kYXRhICsgXCIuXCI7XHJcbiAgICAgICAgICB0aHJvd0Vycm9yKHN0dCwgZmllbGQsIG1zZyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmb3JFYWNoKGZ1bmM6IChzdHQ6IE5TdHJ1Y3QpID0+IHZvaWQsIHRoaXN2YXI/OiB1bmtub3duKTogdm9pZCB7XHJcbiAgICBmb3IgKGxldCBrIGluIHRoaXMuc3RydWN0cykge1xyXG4gICAgICBsZXQgc3R0ID0gdGhpcy5zdHJ1Y3RzW2tdO1xyXG5cclxuICAgICAgaWYgKHRoaXN2YXIgIT09IHVuZGVmaW5lZCkgZnVuYy5jYWxsKHRoaXN2YXIsIHN0dCk7XHJcbiAgICAgIGVsc2UgZnVuYyhzdHQpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy9kZWZhdWx0cyB0byBzdHJ1Y3Rqcy5tYW5hZ2VyXHJcbiAgcGFyc2Vfc3RydWN0cyhidWY6IHN0cmluZywgZGVmaW5lZF9jbGFzc2VzPzogU3RydWN0YWJsZUNsYXNzW10gfCBTVFJVQ1QpOiB2b2lkIHtcclxuICAgIGNvbnN0IGtleXdvcmRzID0gKHRoaXMuY29uc3RydWN0b3IgYXMgdHlwZW9mIFNUUlVDVCkua2V5d29yZHM7XHJcblxyXG4gICAgaWYgKGRlZmluZWRfY2xhc3NlcyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIGRlZmluZWRfY2xhc3NlcyA9IG1hbmFnZXI7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGNsYXNzTGlzdDogU3RydWN0YWJsZUNsYXNzW107XHJcblxyXG4gICAgaWYgKGRlZmluZWRfY2xhc3NlcyBpbnN0YW5jZW9mIFNUUlVDVCkge1xyXG4gICAgICBsZXQgc3RydWN0MiA9IGRlZmluZWRfY2xhc3NlcztcclxuICAgICAgY2xhc3NMaXN0ID0gW107XHJcblxyXG4gICAgICBmb3IgKGxldCBrIGluIHN0cnVjdDIuc3RydWN0X2Nscykge1xyXG4gICAgICAgIGNsYXNzTGlzdC5wdXNoKHN0cnVjdDIuc3RydWN0X2Nsc1trXSk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSBpZiAoZGVmaW5lZF9jbGFzc2VzID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgY2xhc3NMaXN0ID0gW107XHJcblxyXG4gICAgICBmb3IgKGxldCBrIGluIG1hbmFnZXIuc3RydWN0X2Nscykge1xyXG4gICAgICAgIGNsYXNzTGlzdC5wdXNoKG1hbmFnZXIuc3RydWN0X2Nsc1trXSk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNsYXNzTGlzdCA9IGRlZmluZWRfY2xhc3NlcztcclxuICAgIH1cclxuXHJcbiAgICBsZXQgY2xzbWFwOiBSZWNvcmQ8c3RyaW5nLCBTdHJ1Y3RhYmxlQ2xhc3M+ID0ge307XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjbGFzc0xpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgbGV0IGNscyA9IGNsYXNzTGlzdFtpXTtcclxuXHJcbiAgICAgIGlmICghY2xzLnN0cnVjdE5hbWUgJiYgY2xzLlNUUlVDVCkge1xyXG4gICAgICAgIGxldCBzdHQgPSBzdHJ1Y3RfcGFyc2UucGFyc2UoY2xzLlNUUlVDVC50cmltKCkpIGFzIE5TdHJ1Y3Q7XHJcbiAgICAgICAgY2xzLnN0cnVjdE5hbWUgPSBzdHQubmFtZTtcclxuICAgICAgfSBlbHNlIGlmICghY2xzLnN0cnVjdE5hbWUgJiYgY2xzLm5hbWUgIT09IFwiT2JqZWN0XCIpIHtcclxuICAgICAgICBpZiAod2FybmluZ2x2bCA+IDApIGNvbnNvbGUubG9nKFwiV2FybmluZywgYmFkIGNsYXNzIGluIHJlZ2lzdGVyZWQgY2xhc3MgbGlzdFwiLCB1bm1hbmdsZShjbHMubmFtZSksIGNscyk7XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNsc21hcFtjbHMuc3RydWN0TmFtZSFdID0gY2xhc3NMaXN0W2ldO1xyXG4gICAgfVxyXG5cclxuICAgIHN0cnVjdF9wYXJzZS5pbnB1dChidWYpO1xyXG5cclxuICAgIHdoaWxlICghc3RydWN0X3BhcnNlLmF0X2VuZCgpKSB7XHJcbiAgICAgIGxldCBzdHQgPSBzdHJ1Y3RfcGFyc2UucGFyc2UodW5kZWZpbmVkLCBmYWxzZSkgYXMgTlN0cnVjdDtcclxuXHJcbiAgICAgIGlmICghKHN0dC5uYW1lIGluIGNsc21hcCkpIHtcclxuICAgICAgICBpZiAoIShzdHQubmFtZSBpbiB0aGlzLm51bGxfbmF0aXZlcykpXHJcbiAgICAgICAgICBpZiAod2FybmluZ2x2bCA+IDApIGNvbnNvbGUubG9nKFwiV0FSTklORzogc3RydWN0IFwiICsgc3R0Lm5hbWUgKyBcIiBpcyBtaXNzaW5nIGZyb20gY2xhc3MgbGlzdC5cIik7XHJcblxyXG4gICAgICAgIGxldCBkdW1teSA9IGRlZmluZV9lbXB0eV9jbGFzcyh0aGlzLmNvbnN0cnVjdG9yIGFzIHR5cGVvZiBTVFJVQ1QsIHN0dC5uYW1lKTtcclxuXHJcbiAgICAgICAgZHVtbXkuU1RSVUNUID0gU1RSVUNULmZtdF9zdHJ1Y3Qoc3R0KTtcclxuICAgICAgICBkdW1teS5zdHJ1Y3ROYW1lID0gc3R0Lm5hbWU7XHJcblxyXG4gICAgICAgIGR1bW15LnByb3RvdHlwZS5zdHJ1Y3ROYW1lID0gZHVtbXkubmFtZTtcclxuXHJcbiAgICAgICAgdGhpcy5zdHJ1Y3RfY2xzW2R1bW15LnN0cnVjdE5hbWUhXSA9IGR1bW15O1xyXG4gICAgICAgIHRoaXMuc3RydWN0c1tkdW1teS5zdHJ1Y3ROYW1lIV0gPSBzdHQ7XHJcblxyXG4gICAgICAgIGlmIChzdHQuaWQgIT09IC0xKSB0aGlzLnN0cnVjdF9pZHNbc3R0LmlkXSA9IHN0dDtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLnN0cnVjdF9jbHNbc3R0Lm5hbWVdID0gY2xzbWFwW3N0dC5uYW1lXTtcclxuICAgICAgICB0aGlzLnN0cnVjdHNbc3R0Lm5hbWVdID0gc3R0O1xyXG5cclxuICAgICAgICBpZiAoc3R0LmlkICE9PSAtMSkgdGhpcy5zdHJ1Y3RfaWRzW3N0dC5pZF0gPSBzdHQ7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGxldCB0b2sgPSBzdHJ1Y3RfcGFyc2UucGVlaygpO1xyXG4gICAgICB3aGlsZSAodG9rICYmICh0b2sudmFsdWUgPT09IFwiXFxuXCIgfHwgdG9rLnZhbHVlID09PSBcIlxcclwiIHx8IHRvay52YWx1ZSA9PT0gXCJcXHRcIiB8fCB0b2sudmFsdWUgPT09IFwiIFwiKSkge1xyXG4gICAgICAgIHRvayA9IHN0cnVjdF9wYXJzZS5wZWVrKCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKiBhZGRzIGFsbCBzdHJ1Y3RzIHJlZmVyZW5jZWQgYnkgY2xzIGluc2lkZSBvZiBzcmNTVFJVQ1RcclxuICAgKiAgdG8gdGhpcyAqL1xyXG4gIHJlZ2lzdGVyR3JhcGgoc3JjU1RSVUNUOiBTVFJVQ1QsIGNsczogU3RydWN0YWJsZUNsYXNzKTogdm9pZCB7XHJcbiAgICBpZiAoIWNscy5zdHJ1Y3ROYW1lKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybihcImNsYXNzIHdhcyBub3QgaW4gc3JjU1RSVUNUXCIpO1xyXG4gICAgICByZXR1cm4gdGhpcy5yZWdpc3RlcihjbHMpO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCByZWNTdHJ1Y3Q6IChzdDogTlN0cnVjdCwgY2xzOiBTdHJ1Y3RhYmxlQ2xhc3MpID0+IHZvaWQ7XHJcblxyXG4gICAgbGV0IHJlY0FycmF5ID0gKHQ6IFN0cnVjdFR5cGUpOiB2b2lkID0+IHtcclxuICAgICAgc3dpdGNoICh0LnR5cGUpIHtcclxuICAgICAgICBjYXNlIFN0cnVjdEVudW0uQVJSQVk6XHJcbiAgICAgICAgICByZXR1cm4gcmVjQXJyYXkoKHQuZGF0YSBhcyB7IHR5cGU6IFN0cnVjdFR5cGUgfSkudHlwZSk7XHJcbiAgICAgICAgY2FzZSBTdHJ1Y3RFbnVtLklURVJLRVlTOlxyXG4gICAgICAgICAgcmV0dXJuIHJlY0FycmF5KCh0LmRhdGEgYXMgeyB0eXBlOiBTdHJ1Y3RUeXBlIH0pLnR5cGUpO1xyXG4gICAgICAgIGNhc2UgU3RydWN0RW51bS5TVEFUSUNfQVJSQVk6XHJcbiAgICAgICAgICByZXR1cm4gcmVjQXJyYXkoKHQuZGF0YSBhcyB7IHR5cGU6IFN0cnVjdFR5cGUgfSkudHlwZSk7XHJcbiAgICAgICAgY2FzZSBTdHJ1Y3RFbnVtLklURVI6XHJcbiAgICAgICAgICByZXR1cm4gcmVjQXJyYXkoKHQuZGF0YSBhcyB7IHR5cGU6IFN0cnVjdFR5cGUgfSkudHlwZSk7XHJcbiAgICAgICAgY2FzZSBTdHJ1Y3RFbnVtLlNUUlVDVDpcclxuICAgICAgICBjYXNlIFN0cnVjdEVudW0uVFNUUlVDVDoge1xyXG4gICAgICAgICAgbGV0IHN0ID0gc3JjU1RSVUNULnN0cnVjdHNbdC5kYXRhIGFzIHN0cmluZ107XHJcbiAgICAgICAgICBsZXQgY2xzID0gc3JjU1RSVUNULnN0cnVjdF9jbHNbc3QubmFtZV07XHJcblxyXG4gICAgICAgICAgcmV0dXJuIHJlY1N0cnVjdChzdCwgY2xzKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgcmVjU3RydWN0ID0gKHN0OiBOU3RydWN0LCBjbHM6IFN0cnVjdGFibGVDbGFzcyk6IHZvaWQgPT4ge1xyXG4gICAgICBpZiAoIShjbHMuc3RydWN0TmFtZSEgaW4gdGhpcy5zdHJ1Y3RzKSkge1xyXG4gICAgICAgIHRoaXMuYWRkX2NsYXNzKGNscywgY2xzLnN0cnVjdE5hbWUpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmb3IgKGxldCBmIG9mIHN0LmZpZWxkcykge1xyXG4gICAgICAgIGlmIChmLnR5cGUudHlwZSA9PT0gU3RydWN0RW51bS5TVFJVQ1QgfHwgZi50eXBlLnR5cGUgPT09IFN0cnVjdEVudW0uVFNUUlVDVCkge1xyXG4gICAgICAgICAgbGV0IHN0MiA9IHNyY1NUUlVDVC5zdHJ1Y3RzW2YudHlwZS5kYXRhIGFzIHN0cmluZ107XHJcbiAgICAgICAgICBsZXQgY2xzMiA9IHNyY1NUUlVDVC5zdHJ1Y3RfY2xzW3N0Mi5uYW1lXTtcclxuXHJcbiAgICAgICAgICByZWNTdHJ1Y3Qoc3QyLCBjbHMyKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGYudHlwZS50eXBlID09PSBTdHJ1Y3RFbnVtLkFSUkFZKSB7XHJcbiAgICAgICAgICByZWNBcnJheShmLnR5cGUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZi50eXBlLnR5cGUgPT09IFN0cnVjdEVudW0uSVRFUikge1xyXG4gICAgICAgICAgcmVjQXJyYXkoZi50eXBlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGYudHlwZS50eXBlID09PSBTdHJ1Y3RFbnVtLklURVJLRVlTKSB7XHJcbiAgICAgICAgICByZWNBcnJheShmLnR5cGUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZi50eXBlLnR5cGUgPT09IFN0cnVjdEVudW0uU1RBVElDX0FSUkFZKSB7XHJcbiAgICAgICAgICByZWNBcnJheShmLnR5cGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBsZXQgc3QgPSBzcmNTVFJVQ1Quc3RydWN0c1tjbHMuc3RydWN0TmFtZV07XHJcbiAgICByZWNTdHJ1Y3Qoc3QsIGNscyk7XHJcbiAgfVxyXG5cclxuICBtZXJnZVNjcmlwdHMoY2hpbGQ6IHN0cmluZywgcGFyZW50OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgbGV0IHN0YyA9IHN0cnVjdF9wYXJzZS5wYXJzZShjaGlsZC50cmltKCkpIGFzIE5TdHJ1Y3Q7XHJcbiAgICBsZXQgc3RwID0gc3RydWN0X3BhcnNlLnBhcnNlKHBhcmVudC50cmltKCkpIGFzIE5TdHJ1Y3Q7XHJcblxyXG4gICAgbGV0IGZpZWxkc2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblxyXG4gICAgZm9yIChsZXQgZiBvZiBzdGMuZmllbGRzKSB7XHJcbiAgICAgIGZpZWxkc2V0LmFkZChmLm5hbWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBmaWVsZHM6IFN0cnVjdEZpZWxkW10gPSBbXTtcclxuICAgIGZvciAobGV0IGYgb2Ygc3RwLmZpZWxkcykge1xyXG4gICAgICBpZiAoIWZpZWxkc2V0LmhhcyhmLm5hbWUpKSB7XHJcbiAgICAgICAgZmllbGRzLnB1c2goZik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzdGMuZmllbGRzID0gZmllbGRzLmNvbmNhdChzdGMuZmllbGRzKTtcclxuICAgIHJldHVybiBTVFJVQ1QuZm10X3N0cnVjdChzdGMsIGZhbHNlLCBmYWxzZSk7XHJcbiAgfVxyXG5cclxuICBpbmxpbmVSZWdpc3RlcihjbHM6IFN0cnVjdGFibGVDbGFzcywgc3RydWN0U2NyaXB0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgY29uc3Qga2V5d29yZHMgPSAodGhpcy5jb25zdHJ1Y3RvciBhcyB0eXBlb2YgU1RSVUNUKS5rZXl3b3JkcztcclxuXHJcbiAgICBsZXQgcDogU3RydWN0YWJsZUNsYXNzIHwgdW5kZWZpbmVkID0gY2xzLl9fcHJvdG9fXyBhcyBTdHJ1Y3RhYmxlQ2xhc3MgfCB1bmRlZmluZWQ7XHJcbiAgICB3aGlsZSAocCAmJiAocCBhcyB1bmtub3duKSAhPT0gT2JqZWN0KSB7XHJcbiAgICAgIGlmIChwLmhhc093blByb3BlcnR5KGtleXdvcmRzLnNjcmlwdCkpIHtcclxuICAgICAgICBzdHJ1Y3RTY3JpcHQgPSB0aGlzLm1lcmdlU2NyaXB0cyhzdHJ1Y3RTY3JpcHQsIChwIGFzIFN0cnVjdGFibGVDbGFzcykuU1RSVUNUISk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgICAgcCA9IChwIGFzIFN0cnVjdGFibGVDbGFzcykuX19wcm90b19fIGFzIFN0cnVjdGFibGVDbGFzcyB8IHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBjbHMuU1RSVUNUID0gc3RydWN0U2NyaXB0O1xyXG4gICAgdGhpcy5yZWdpc3RlcihjbHMpO1xyXG4gICAgcmV0dXJuIHN0cnVjdFNjcmlwdDtcclxuICB9XHJcblxyXG4gIHJlZ2lzdGVyKGNsczogU3RydWN0YWJsZUNsYXNzLCBzdHJ1Y3ROYW1lPzogc3RyaW5nKTogdm9pZCB7XHJcbiAgICByZXR1cm4gdGhpcy5hZGRfY2xhc3MoY2xzLCBzdHJ1Y3ROYW1lKTtcclxuICB9XHJcblxyXG4gIHVucmVnaXN0ZXIoY2xzOiBTdHJ1Y3RhYmxlQ2xhc3MpOiB2b2lkIHtcclxuICAgIGNvbnN0IGtleXdvcmRzID0gKHRoaXMuY29uc3RydWN0b3IgYXMgdHlwZW9mIFNUUlVDVCkua2V5d29yZHM7XHJcblxyXG4gICAgaWYgKCFjbHMgfHwgIWNscy5zdHJ1Y3ROYW1lIHx8ICEoY2xzLnN0cnVjdE5hbWUgaW4gdGhpcy5zdHJ1Y3RfY2xzKSkge1xyXG4gICAgICBjb25zb2xlLndhcm4oXCJDbGFzcyBub3QgcmVnaXN0ZXJlZCB3aXRoIG5zdHJ1Y3Rqc1wiLCBjbHMpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IHN0ID0gdGhpcy5zdHJ1Y3RzW2Nscy5zdHJ1Y3ROYW1lXTtcclxuXHJcbiAgICBkZWxldGUgdGhpcy5zdHJ1Y3RzW2Nscy5zdHJ1Y3ROYW1lXTtcclxuICAgIGRlbGV0ZSB0aGlzLnN0cnVjdF9jbHNbY2xzLnN0cnVjdE5hbWVdO1xyXG4gICAgZGVsZXRlIHRoaXMuc3RydWN0X2lkc1tzdC5pZF07XHJcbiAgfVxyXG5cclxuICBhZGRfY2xhc3MoY2xzOiBTdHJ1Y3RhYmxlQ2xhc3MsIHN0cnVjdE5hbWU/OiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIC8vZG8gbm90IHJlZ2lzdGVyIE9iamVjdFxyXG4gICAgaWYgKGNscyA9PT0gKE9iamVjdCBhcyB1bmtub3duKSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qga2V5d29yZHMgPSAodGhpcy5jb25zdHJ1Y3RvciBhcyB0eXBlb2YgU1RSVUNUKS5rZXl3b3JkcztcclxuICAgIGlmIChjbHMuU1RSVUNUKSB7XHJcbiAgICAgIGxldCBiYWQgPSBmYWxzZTtcclxuXHJcbiAgICAgIGxldCBwOiBTdHJ1Y3RhYmxlQ2xhc3MgfCB1bmRlZmluZWQgPSBjbHM7XHJcbiAgICAgIHdoaWxlIChwKSB7XHJcbiAgICAgICAgcCA9IHAuX19wcm90b19fIGFzIFN0cnVjdGFibGVDbGFzcyB8IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgICAgaWYgKHAgJiYgcC5TVFJVQ1QgJiYgcC5TVFJVQ1QgPT09IGNscy5TVFJVQ1QpIHtcclxuICAgICAgICAgIGJhZCA9IHRydWU7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChiYWQpIHtcclxuICAgICAgICBpZiAod2FybmluZ2x2bCA+IDApIHtcclxuICAgICAgICAgIGNvbnNvbGUud2FybihcIkdlbmVyYXRpbmcgXCIgKyBrZXl3b3Jkcy5zY3JpcHQgKyBcIiBzY3JpcHQgZm9yIGRlcml2ZWQgY2xhc3MgXCIgKyB1bm1hbmdsZShjbHMubmFtZSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFzdHJ1Y3ROYW1lKSB7XHJcbiAgICAgICAgICBzdHJ1Y3ROYW1lID0gdW5tYW5nbGUoY2xzLm5hbWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY2xzLlNUUlVDVCA9IFNUUlVDVC5pbmhlcml0KGNscywgcCEpICsgXCJcXG59XCI7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAoIWNscy5TVFJVQ1QpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiY2xhc3MgXCIgKyB1bm1hbmdsZShjbHMubmFtZSkgKyBcIiBoYXMgbm8gXCIgKyBrZXl3b3Jkcy5zY3JpcHQgKyBcIiBzY3JpcHRcIik7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IHN0dCA9IHN0cnVjdF9wYXJzZS5wYXJzZShjbHMuU1RSVUNUKSBhcyBOU3RydWN0O1xyXG5cclxuICAgIHN0dC5uYW1lID0gdW5tYW5nbGUoc3R0Lm5hbWUpO1xyXG5cclxuICAgIGNscy5zdHJ1Y3ROYW1lID0gc3R0Lm5hbWU7XHJcblxyXG4gICAgLy9jcmVhdGUgZGVmYXVsdCBuZXdTVFJVQ1RcclxuICAgIGlmIChjbHMubmV3U1RSVUNUID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgY2xzLm5ld1NUUlVDVCA9IGZ1bmN0aW9uICh0aGlzOiBTdHJ1Y3RhYmxlQ2xhc3MpIHtcclxuICAgICAgICByZXR1cm4gbmV3ICh0aGlzIGFzIHVua25vd24gYXMgbmV3ICgpID0+IHVua25vd24pKCk7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHN0cnVjdE5hbWUgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBzdHQubmFtZSA9IGNscy5zdHJ1Y3ROYW1lID0gc3RydWN0TmFtZTtcclxuICAgIH0gZWxzZSBpZiAoY2xzLnN0cnVjdE5hbWUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBjbHMuc3RydWN0TmFtZSA9IHN0dC5uYW1lO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc3R0Lm5hbWUgPSBjbHMuc3RydWN0TmFtZTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoY2xzLnN0cnVjdE5hbWUgaW4gdGhpcy5zdHJ1Y3RzKSB7XHJcbiAgICAgIGlmICh3YXJuaW5nbHZsID4gMCkge1xyXG4gICAgICAgIGNvbnNvbGUud2FybihcIlN0cnVjdCBcIiArIHVubWFuZ2xlKGNscy5zdHJ1Y3ROYW1lKSArIFwiIGlzIGFscmVhZHkgcmVnaXN0ZXJlZFwiLCBjbHMpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoIXRoaXMuYWxsb3dPdmVycmlkaW5nKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU3RydWN0IFwiICsgdW5tYW5nbGUoY2xzLnN0cnVjdE5hbWUpICsgXCIgaXMgYWxyZWFkeSByZWdpc3RlcmVkXCIpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHN0dC5pZCA9PT0gLTEpIHN0dC5pZCA9IHRoaXMuaWRnZW4rKztcclxuXHJcbiAgICB0aGlzLnN0cnVjdHNbY2xzLnN0cnVjdE5hbWVdID0gc3R0O1xyXG4gICAgdGhpcy5zdHJ1Y3RfY2xzW2Nscy5zdHJ1Y3ROYW1lXSA9IGNscztcclxuICAgIHRoaXMuc3RydWN0X2lkc1tzdHQuaWRdID0gc3R0O1xyXG4gIH1cclxuXHJcbiAgaXNSZWdpc3RlcmVkKGNsczogU3RydWN0YWJsZUNsYXNzKTogYm9vbGVhbiB7XHJcbiAgICBjb25zdCBrZXl3b3JkcyA9ICh0aGlzLmNvbnN0cnVjdG9yIGFzIHR5cGVvZiBTVFJVQ1QpLmtleXdvcmRzO1xyXG5cclxuICAgIGlmICghY2xzLmhhc093blByb3BlcnR5KFwic3RydWN0TmFtZVwiKSkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGNscyA9PT0gdGhpcy5zdHJ1Y3RfY2xzW2Nscy5zdHJ1Y3ROYW1lIV07XHJcbiAgfVxyXG5cclxuICBnZXRfc3RydWN0X2lkKGlkOiBudW1iZXIpOiBOU3RydWN0IHtcclxuICAgIHJldHVybiB0aGlzLnN0cnVjdF9pZHNbaWRdO1xyXG4gIH1cclxuXHJcbiAgZ2V0X3N0cnVjdChuYW1lOiBzdHJpbmcpOiBOU3RydWN0IHtcclxuICAgIGlmICghKG5hbWUgaW4gdGhpcy5zdHJ1Y3RzKSkge1xyXG4gICAgICBjb25zb2xlLndhcm4oXCJVbmtub3duIHN0cnVjdFwiLCBuYW1lKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBzdHJ1Y3QgXCIgKyBuYW1lKTtcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzLnN0cnVjdHNbbmFtZV07XHJcbiAgfVxyXG5cclxuICBnZXRfc3RydWN0X2NscyhuYW1lOiBzdHJpbmcpOiBTdHJ1Y3RhYmxlQ2xhc3Mge1xyXG4gICAgaWYgKCEobmFtZSBpbiB0aGlzLnN0cnVjdF9jbHMpKSB7XHJcbiAgICAgIGNvbnNvbGUudHJhY2UoKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBzdHJ1Y3QgXCIgKyBuYW1lKTtcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzLnN0cnVjdF9jbHNbbmFtZV07XHJcbiAgfVxyXG5cclxuICBfZW52X2NhbGwoY29kZTogc3RyaW5nLCBvYmo6IHVua25vd24sIGVudj86IFt1bmtub3duLCB1bmtub3duXVtdKTogdW5rbm93biB7XHJcbiAgICBsZXQgZW52Y29kZSA9IF9zdGF0aWNfZW52Y29kZV9udWxsO1xyXG4gICAgaWYgKGVudiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIGVudmNvZGUgPSBcIlwiO1xyXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVudi5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGVudmNvZGUgPSBcImxldCBcIiArIGVudltpXVswXSArIFwiID0gZW52W1wiICsgaS50b1N0cmluZygpICsgXCJdWzFdO1xcblwiICsgZW52Y29kZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgbGV0IGZ1bGxjb2RlID0gXCJcIjtcclxuICAgIGlmIChlbnZjb2RlICE9PSBfc3RhdGljX2VudmNvZGVfbnVsbCkgZnVsbGNvZGUgPSBlbnZjb2RlICsgY29kZTtcclxuICAgIGVsc2UgZnVsbGNvZGUgPSBjb2RlO1xyXG4gICAgbGV0IGZ1bmM6IEZ1bmN0aW9uO1xyXG5cclxuICAgIGlmICghKGZ1bGxjb2RlIGluIHRoaXMuY29tcGlsZWRfY29kZSkpIHtcclxuICAgICAgbGV0IGNvZGUyID0gXCJmdW5jID0gZnVuY3Rpb24ob2JqLCBlbnYpIHsgXCIgKyBlbnZjb2RlICsgXCJyZXR1cm4gXCIgKyBjb2RlICsgXCJ9XCI7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgZnVuYyA9IHN0cnVjdF9ldmFsLnN0cnVjdEV2YWwoY29kZTIpIGFzIEZ1bmN0aW9uO1xyXG4gICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICBjb25zb2xlLndhcm4oKGVyciBhcyBFcnJvcikuc3RhY2spO1xyXG5cclxuICAgICAgICBjb25zb2xlLndhcm4oY29kZTIpO1xyXG4gICAgICAgIGNvbnNvbGUud2FybihcIiBcIik7XHJcbiAgICAgICAgdGhyb3cgZXJyO1xyXG4gICAgICB9XHJcbiAgICAgIHRoaXMuY29tcGlsZWRfY29kZVtmdWxsY29kZV0gPSBmdW5jITtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGZ1bmMgPSB0aGlzLmNvbXBpbGVkX2NvZGVbZnVsbGNvZGVdO1xyXG4gICAgfVxyXG4gICAgdHJ5IHtcclxuICAgICAgcmV0dXJuIGZ1bmMhLmNhbGwob2JqLCBvYmosIGVudik7XHJcbiAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgY29uc29sZS53YXJuKChlcnIgYXMgRXJyb3IpLnN0YWNrKTtcclxuXHJcbiAgICAgIGxldCBjb2RlMiA9IFwiZnVuYyA9IGZ1bmN0aW9uKG9iaiwgZW52KSB7IFwiICsgZW52Y29kZSArIFwicmV0dXJuIFwiICsgY29kZSArIFwifVwiO1xyXG4gICAgICBjb25zb2xlLndhcm4oY29kZTIpO1xyXG4gICAgICBjb25zb2xlLndhcm4oXCIgXCIpO1xyXG4gICAgICB0aHJvdyBlcnI7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB3cml0ZV9zdHJ1Y3QoZGF0YTogbnVtYmVyW10sIG9iajogdW5rbm93biwgc3R0OiBOU3RydWN0KTogdm9pZCB7XHJcbiAgICBmdW5jdGlvbiB1c2VfaGVscGVyX2pzKGZpZWxkOiBTdHJ1Y3RGaWVsZCk6IGJvb2xlYW4ge1xyXG4gICAgICBsZXQgdHlwZSA9IGZpZWxkLnR5cGUudHlwZTtcclxuICAgICAgbGV0IGNscyA9IFN0cnVjdEZpZWxkVHlwZU1hcFt0eXBlXTtcclxuICAgICAgcmV0dXJuIGNscy51c2VIZWxwZXJKUyhmaWVsZCk7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGZpZWxkcyA9IHN0dC5maWVsZHM7XHJcbiAgICBsZXQgdGhlc3RydWN0ID0gdGhpcztcclxuICAgIGxldCBvYmpSZWMgPSBvYmogYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZpZWxkcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBsZXQgZiA9IGZpZWxkc1tpXTtcclxuICAgICAgbGV0IHQxID0gZi50eXBlO1xyXG4gICAgICBsZXQgdDIgPSB0MS50eXBlO1xyXG5cclxuICAgICAgaWYgKHVzZV9oZWxwZXJfanMoZikpIHtcclxuICAgICAgICBsZXQgdmFsOiB1bmtub3duO1xyXG4gICAgICAgIGlmIChmLmdldCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB2YWwgPSB0aGVzdHJ1Y3QuX2Vudl9jYWxsKGYuZ2V0LCBvYmopO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB2YWwgPSBmLm5hbWUgPT09IFwidGhpc1wiID8gb2JqIDogb2JqUmVjW2YubmFtZV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoREVCVUcudGlueWV2YWwpIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiXFxuXFxuXFxuXCIsIGYuZ2V0LCBcIkhlbHBlciBKUyBSZXRcIiwgdmFsLCBcIlxcblxcblxcblwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNpbnRlcm4yLmRvX3BhY2sodGhpcywgZGF0YSwgdmFsLCBvYmosIGYsIHQxKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgdmFsID0gZi5uYW1lID09PSBcInRoaXNcIiA/IG9iaiA6IG9ialJlY1tmLm5hbWVdO1xyXG4gICAgICAgIHNpbnRlcm4yLmRvX3BhY2sodGhpcywgZGF0YSwgdmFsLCBvYmosIGYsIHQxKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgIEBwYXJhbSBkYXRhIDogYXJyYXkgdG8gd3JpdGUgZGF0YSBpbnRvLFxyXG4gICBAcGFyYW0gb2JqICA6IHN0cnVjdGFibGUgb2JqZWN0XHJcbiAgICovXHJcbiAgd3JpdGVfb2JqZWN0KGRhdGE6IG51bWJlcltdIHwgdW5kZWZpbmVkLCBvYmo6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogbnVtYmVyW10ge1xyXG4gICAgY29uc3Qga2V5d29yZHMgPSAodGhpcy5jb25zdHJ1Y3RvciBhcyB0eXBlb2YgU1RSVUNUKS5rZXl3b3JkcztcclxuXHJcbiAgICBsZXQgY2xzID0gKG9iai5jb25zdHJ1Y3RvciBhcyBTdHJ1Y3RhYmxlQ2xhc3MpLnN0cnVjdE5hbWUhO1xyXG4gICAgbGV0IHN0dCA9IHRoaXMuZ2V0X3N0cnVjdChjbHMpO1xyXG5cclxuICAgIGlmIChkYXRhID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgZGF0YSA9IFtdO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMud3JpdGVfc3RydWN0KGRhdGEsIG9iaiwgc3R0KTtcclxuICAgIHJldHVybiBkYXRhO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgIFJlYWQgYW4gb2JqZWN0IGZyb20gYmluYXJ5IGRhdGFcclxuXHJcbiAgIEBwYXJhbSBkYXRhIDogRGF0YVZpZXcgb3IgVWludDhBcnJheSBpbnN0YW5jZVxyXG4gICBAcGFyYW0gY2xzX29yX3N0cnVjdF9pZCA6IFN0cnVjdGFibGUgY2xhc3NcclxuICAgQHBhcmFtIHVjdHggOiBpbnRlcm5hbCBwYXJhbWV0ZXJcclxuICAgQHJldHVybiBJbnN0YW5jZSBvZiBjbHNfb3Jfc3RydWN0X2lkXHJcbiAgICovXHJcbiAgcmVhZE9iamVjdChcclxuICAgIGRhdGE6IERhdGFWaWV3IHwgVWludDhBcnJheSB8IFVpbnQ4Q2xhbXBlZEFycmF5IHwgbnVtYmVyW10sXHJcbiAgICBjbHNfb3Jfc3RydWN0X2lkOiBTdHJ1Y3RhYmxlQ2xhc3MgfCBudW1iZXIsXHJcbiAgICB1Y3R4PzogdW5wYWNrX2NvbnRleHRcclxuICApOiB1bmtub3duIHtcclxuICAgIGlmIChkYXRhIGluc3RhbmNlb2YgVWludDhBcnJheSB8fCBkYXRhIGluc3RhbmNlb2YgVWludDhDbGFtcGVkQXJyYXkpIHtcclxuICAgICAgZGF0YSA9IG5ldyBEYXRhVmlldyhkYXRhLmJ1ZmZlcik7XHJcbiAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBBcnJheSkge1xyXG4gICAgICBkYXRhID0gbmV3IERhdGFWaWV3KG5ldyBVaW50OEFycmF5KGRhdGEpLmJ1ZmZlcik7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRoaXMucmVhZF9vYmplY3QoZGF0YSwgY2xzX29yX3N0cnVjdF9pZCwgdWN0eCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgQHBhcmFtIGRhdGEgYXJyYXkgdG8gd3JpdGUgZGF0YSBpbnRvLFxyXG4gICBAcGFyYW0gb2JqIHN0cnVjdGFibGUgb2JqZWN0XHJcbiAgICovXHJcbiAgd3JpdGVPYmplY3QoZGF0YTogbnVtYmVyW10sIG9iajogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBudW1iZXJbXSB7XHJcbiAgICByZXR1cm4gdGhpcy53cml0ZV9vYmplY3QoZGF0YSwgb2JqKTtcclxuICB9XHJcblxyXG4gIHdyaXRlSlNPTihvYmo6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LCBzdHQ/OiBOU3RydWN0KTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xyXG4gICAgY29uc3Qga2V5d29yZHMgPSAodGhpcy5jb25zdHJ1Y3RvciBhcyB0eXBlb2YgU1RSVUNUKS5rZXl3b3JkcztcclxuXHJcbiAgICBsZXQgY2xzID0gb2JqLmNvbnN0cnVjdG9yIGFzIFN0cnVjdGFibGVDbGFzcztcclxuICAgIHN0dCA9IHN0dCB8fCB0aGlzLmdldF9zdHJ1Y3QoY2xzLnN0cnVjdE5hbWUhKTtcclxuXHJcbiAgICBmdW5jdGlvbiB1c2VfaGVscGVyX2pzKGZpZWxkOiBTdHJ1Y3RGaWVsZCk6IGJvb2xlYW4ge1xyXG4gICAgICBsZXQgdHlwZSA9IGZpZWxkLnR5cGUudHlwZTtcclxuICAgICAgbGV0IGNscyA9IFN0cnVjdEZpZWxkVHlwZU1hcFt0eXBlXTtcclxuICAgICAgcmV0dXJuIGNscy51c2VIZWxwZXJKUyhmaWVsZCk7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IF90b0pTT04gPSBzaW50ZXJuMi50b0pTT047XHJcblxyXG4gICAgbGV0IGZpZWxkcyA9IHN0dC5maWVsZHM7XHJcbiAgICBsZXQgdGhlc3RydWN0ID0gdGhpcztcclxuICAgIGxldCBqc29uOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZmllbGRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGxldCBmID0gZmllbGRzW2ldO1xyXG4gICAgICBsZXQgdmFsOiB1bmtub3duO1xyXG4gICAgICBsZXQgdDEgPSBmLnR5cGU7XHJcblxyXG4gICAgICBsZXQganNvbjI6IHVua25vd247XHJcblxyXG4gICAgICBpZiAodXNlX2hlbHBlcl9qcyhmKSkge1xyXG4gICAgICAgIGlmIChmLmdldCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB2YWwgPSB0aGVzdHJ1Y3QuX2Vudl9jYWxsKGYuZ2V0LCBvYmopO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB2YWwgPSBmLm5hbWUgPT09IFwidGhpc1wiID8gb2JqIDogb2JqW2YubmFtZV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoREVCVUcudGlueWV2YWwpIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiXFxuXFxuXFxuXCIsIGYuZ2V0LCBcIkhlbHBlciBKUyBSZXRcIiwgdmFsLCBcIlxcblxcblxcblwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGpzb24yID0gX3RvSlNPTih0aGlzLCB2YWwsIG9iaiwgZiwgdDEpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHZhbCA9IGYubmFtZSA9PT0gXCJ0aGlzXCIgPyBvYmogOiBvYmpbZi5uYW1lXTtcclxuICAgICAgICBqc29uMiA9IF90b0pTT04odGhpcywgdmFsLCBvYmosIGYsIHQxKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGYubmFtZSAhPT0gXCJ0aGlzXCIpIHtcclxuICAgICAgICBqc29uW2YubmFtZV0gPSBqc29uMjtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvL2YubmFtZSB3YXMgJ3RoaXMnP1xyXG4gICAgICAgIGxldCBpc0FycmF5ID0gQXJyYXkuaXNBcnJheShqc29uMik7XHJcbiAgICAgICAgaXNBcnJheSA9IGlzQXJyYXkgfHwgZi50eXBlLnR5cGUgPT09IFN0cnVjdFR5cGVzLkFSUkFZO1xyXG4gICAgICAgIGlzQXJyYXkgPSBpc0FycmF5IHx8IGYudHlwZS50eXBlID09PSBTdHJ1Y3RUeXBlcy5TVEFUSUNfQVJSQVk7XHJcblxyXG4gICAgICAgIGlmIChpc0FycmF5KSB7XHJcbiAgICAgICAgICBsZXQgYXJyID0ganNvbjIgYXMgdW5rbm93bltdO1xyXG4gICAgICAgICAgKGpzb24gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pLmxlbmd0aCA9IGFyci5sZW5ndGg7XHJcblxyXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgKGpzb24gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW2ldID0gYXJyW2ldO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBPYmplY3QuYXNzaWduKGpzb24sIGpzb24yKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ganNvbjtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICBAcGFyYW0gZGF0YSA6IERhdGFWaWV3IG9yIFVpbnQ4QXJyYXkgaW5zdGFuY2VcclxuICAgQHBhcmFtIGNsc19vcl9zdHJ1Y3RfaWQgOiBTdHJ1Y3RhYmxlIGNsYXNzXHJcbiAgIEBwYXJhbSB1Y3R4IDogaW50ZXJuYWwgcGFyYW1ldGVyXHJcbiAgICovXHJcbiAgcmVhZF9vYmplY3QoXHJcbiAgICBkYXRhOiBEYXRhVmlldyB8IG51bWJlcltdLFxyXG4gICAgY2xzX29yX3N0cnVjdF9pZDogU3RydWN0YWJsZUNsYXNzIHwgbnVtYmVyLFxyXG4gICAgdWN0eD86IHVucGFja19jb250ZXh0LFxyXG4gICAgb2JqSW5zdGFuY2U/OiB1bmtub3duXHJcbiAgKTogdW5rbm93biB7XHJcbiAgICBjb25zdCBrZXl3b3JkcyA9ICh0aGlzLmNvbnN0cnVjdG9yIGFzIHR5cGVvZiBTVFJVQ1QpLmtleXdvcmRzO1xyXG4gICAgbGV0IGNsczogU3RydWN0YWJsZUNsYXNzO1xyXG4gICAgbGV0IHN0dDogTlN0cnVjdDtcclxuXHJcbiAgICBpZiAoZGF0YSBpbnN0YW5jZW9mIEFycmF5KSB7XHJcbiAgICAgIGRhdGEgPSBuZXcgRGF0YVZpZXcobmV3IFVpbnQ4QXJyYXkoZGF0YSkuYnVmZmVyKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodHlwZW9mIGNsc19vcl9zdHJ1Y3RfaWQgPT09IFwibnVtYmVyXCIpIHtcclxuICAgICAgY2xzID0gdGhpcy5zdHJ1Y3RfY2xzW3RoaXMuc3RydWN0X2lkc1tjbHNfb3Jfc3RydWN0X2lkXS5uYW1lXTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNscyA9IGNsc19vcl9zdHJ1Y3RfaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGNscyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImJhZCBjbHNfb3Jfc3RydWN0X2lkIFwiICsgY2xzX29yX3N0cnVjdF9pZCk7XHJcbiAgICB9XHJcblxyXG4gICAgc3R0ID0gdGhpcy5zdHJ1Y3RzW2Nscy5zdHJ1Y3ROYW1lIV07XHJcblxyXG4gICAgaWYgKHVjdHggPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICB1Y3R4ID0gbmV3IHVucGFja19jb250ZXh0KCk7XHJcblxyXG4gICAgICBwYWNrZXJfZGVidWcoXCJcXG5cXG49QmVnaW4gcmVhZGluZyBcIiArIGNscy5zdHJ1Y3ROYW1lICsgXCI9XCIpO1xyXG4gICAgfVxyXG4gICAgbGV0IHRoZXN0cnVjdCA9IHRoaXM7XHJcbiAgICBsZXQgdGhpczIgPSB0aGlzO1xyXG5cclxuICAgIGZ1bmN0aW9uIF91bnBhY2tfZmllbGQodHlwZTogU3RydWN0VHlwZSk6IHVua25vd24ge1xyXG4gICAgICByZXR1cm4gU3RydWN0RmllbGRUeXBlTWFwW3R5cGUudHlwZV0udW5wYWNrKHRoaXMyLCBkYXRhIGFzIERhdGFWaWV3LCB0eXBlLCB1Y3R4ISk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gX3VucGFja19pbnRvKHR5cGU6IFN0cnVjdFR5cGUsIGRlc3Q6IHVua25vd24pOiB1bmtub3duIHtcclxuICAgICAgcmV0dXJuIChTdHJ1Y3RGaWVsZFR5cGVNYXBbdHlwZS50eXBlXSBhcyB0eXBlb2YgU3RydWN0U3RydWN0RmllbGQpLnVucGFja0ludG8oXHJcbiAgICAgICAgdGhpczIsXHJcbiAgICAgICAgZGF0YSBhcyBEYXRhVmlldyxcclxuICAgICAgICB0eXBlLFxyXG4gICAgICAgIHVjdHghLFxyXG4gICAgICAgIGRlc3RcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgd2FzX3J1biA9IGZhbHNlO1xyXG5cclxuICAgIGZ1bmN0aW9uIG1ha2VMb2FkZXIoc3R0OiBOU3RydWN0KTogU3RydWN0UmVhZGVyIHtcclxuICAgICAgcmV0dXJuIGZ1bmN0aW9uIGxvYWQob2JqOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikge1xyXG4gICAgICAgIGlmICh3YXNfcnVuKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB3YXNfcnVuID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgbGV0IGZpZWxkcyA9IHN0dC5maWVsZHM7XHJcbiAgICAgICAgbGV0IGZsZW4gPSBmaWVsZHMubGVuZ3RoO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZsZW47IGkrKykge1xyXG4gICAgICAgICAgbGV0IGYgPSBmaWVsZHNbaV07XHJcblxyXG4gICAgICAgICAgaWYgKGYubmFtZSA9PT0gXCJ0aGlzXCIpIHtcclxuICAgICAgICAgICAgLy9sb2FkIGRhdGEgaW50byBvYmogZGlyZWN0bHlcclxuICAgICAgICAgICAgX3VucGFja19pbnRvKGYudHlwZSwgb2JqKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG9ialtmLm5hbWVdID0gX3VucGFja19maWVsZChmLnR5cGUpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgbG9hZCA9IG1ha2VMb2FkZXIoc3R0KTtcclxuXHJcbiAgICBpZiAoY2xzLnByb3RvdHlwZS5sb2FkU1RSVUNUICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgbGV0IG9iaiA9IG9iakluc3RhbmNlIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgdW5kZWZpbmVkO1xyXG5cclxuICAgICAgaWYgKCFvYmogJiYgY2xzLm5ld1NUUlVDVCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgb2JqID0gY2xzLm5ld1NUUlVDVChsb2FkKSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcclxuICAgICAgfSBlbHNlIGlmICghb2JqKSB7XHJcbiAgICAgICAgb2JqID0gbmV3IChjbHMgYXMgdW5rbm93biBhcyBuZXcgKCkgPT4gUmVjb3JkPHN0cmluZywgdW5rbm93bj4pKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIChvYmohLmxvYWRTVFJVQ1QgYXMgRnVuY3Rpb24pKGxvYWQpO1xyXG5cclxuICAgICAgaWYgKCF3YXNfcnVuKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKFwiXCIgKyBjbHMuc3RydWN0TmFtZSArIFwiLnByb3RvdHlwZS5sb2FkU1RSVUNUKCkgZGlkIG5vdCBleGVjdXRlIGl0cyBsb2FkZXIgY2FsbGJhY2shXCIpO1xyXG4gICAgICAgIGxvYWQob2JqISk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBvYmo7XHJcbiAgICB9IGVsc2UgaWYgKGNscy5mcm9tU1RSVUNUICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgaWYgKHdhcm5pbmdsdmwgPiAxKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKFxyXG4gICAgICAgICAgXCJXYXJuaW5nOiBjbGFzcyBcIiArXHJcbiAgICAgICAgICAgIHVubWFuZ2xlKGNscy5uYW1lKSArXHJcbiAgICAgICAgICAgIFwiIGlzIHVzaW5nIGRlcHJlY2F0ZWQgZnJvbVNUUlVDVCBpbnRlcmZhY2U7IHVzZSBuZXdTVFJVQ1QvbG9hZFNUUlVDVCBpbnN0ZWFkXCJcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gY2xzLmZyb21TVFJVQ1QobG9hZCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvL2RlZmF1bHQgY2FzZSwgbWFrZSBuZXcgaW5zdGFuY2UgYW5kIHRoZW4gY2FsbCBsb2FkKCkgb24gaXRcclxuICAgICAgbGV0IG9iaiA9IG9iakluc3RhbmNlIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgdW5kZWZpbmVkO1xyXG5cclxuICAgICAgaWYgKCFvYmogJiYgY2xzLm5ld1NUUlVDVCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgb2JqID0gY2xzLm5ld1NUUlVDVChsb2FkKSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcclxuICAgICAgfSBlbHNlIGlmICghb2JqKSB7XHJcbiAgICAgICAgb2JqID0gbmV3IChjbHMgYXMgdW5rbm93biBhcyBuZXcgKCkgPT4gUmVjb3JkPHN0cmluZywgdW5rbm93bj4pKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGxvYWQob2JqISk7XHJcblxyXG4gICAgICByZXR1cm4gb2JqO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdmFsaWRhdGVKU09OKFxyXG4gICAganNvbjogdW5rbm93bixcclxuICAgIGNsc19vcl9zdHJ1Y3RfaWQ6IFN0cnVjdGFibGVDbGFzcyB8IE5TdHJ1Y3QgfCBudW1iZXIsXHJcbiAgICB1c2VJbnRlcm5hbFBhcnNlcjogYm9vbGVhbiA9IHRydWUsXHJcbiAgICB1c2VDb2xvcnM6IGJvb2xlYW4gPSB0cnVlLFxyXG4gICAgY29uc29sZUxvZ2dlckZuOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkID0gZnVuY3Rpb24gKC4uLmFyZ3M6IHVua25vd25bXSkge1xyXG4gICAgICBjb25zb2xlLmxvZyguLi5hcmdzKTtcclxuICAgIH0sXHJcbiAgICBfYWJzdHJhY3RLZXk6IHN0cmluZyA9IFwiX3N0cnVjdE5hbWVcIlxyXG4gICk6IGJvb2xlYW4ge1xyXG4gICAgaWYgKGNsc19vcl9zdHJ1Y3RfaWQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy5jb25zdHJ1Y3Rvci5uYW1lICsgXCIucHJvdG90eXBlLnZhbGlkYXRlSlNPTjogRXhwZWN0ZWQgYXQgbGVhc3QgdHdvIGFyZ3VtZW50c1wiKTtcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBsZXQganNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGpzb24sIHVuZGVmaW5lZCwgMik7XHJcblxyXG4gICAgICB0aGlzLmpzb25CdWYgPSBqc29uU3RyO1xyXG4gICAgICB0aGlzLmpzb25Vc2VDb2xvcnMgPSB1c2VDb2xvcnM7XHJcbiAgICAgIHRoaXMuanNvbkxvZ2dlciA9IGNvbnNvbGVMb2dnZXJGbjtcclxuXHJcbiAgICAgIC8vYWRkIHRva2VuIGFubm90YXRpb25zXHJcbiAgICAgIGpzb25QYXJzZXIubG9nZ2VyID0gdGhpcy5qc29uTG9nZ2VyO1xyXG5cclxuICAgICAgbGV0IHBhcnNlZDogdW5rbm93bjtcclxuICAgICAgaWYgKHVzZUludGVybmFsUGFyc2VyKSB7XHJcbiAgICAgICAgcGFyc2VkID0ganNvblBhcnNlci5wYXJzZShqc29uU3RyKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBwYXJzZWQgPSBKU09OLnBhcnNlKGpzb25TdHIpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLnZhbGlkYXRlSlNPTkludGVybihwYXJzZWQsIGNsc19vcl9zdHJ1Y3RfaWQsIF9hYnN0cmFjdEtleSk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBpZiAoIShlcnJvciBpbnN0YW5jZW9mIEpTT05FcnJvcikpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKChlcnJvciBhcyBFcnJvcikuc3RhY2spO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLmpzb25Mb2dnZXIoKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlKTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuXHJcbiAgdmFsaWRhdGVKU09OSW50ZXJuKFxyXG4gICAganNvbjogdW5rbm93bixcclxuICAgIGNsc19vcl9zdHJ1Y3RfaWQ6IFN0cnVjdGFibGVDbGFzcyB8IE5TdHJ1Y3QgfCBudW1iZXIsXHJcbiAgICBfYWJzdHJhY3RLZXk6IHN0cmluZyA9IFwiX3N0cnVjdE5hbWVcIlxyXG4gICk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3Qga2V5d29yZHMgPSAodGhpcy5jb25zdHJ1Y3RvciBhcyB0eXBlb2YgU1RSVUNUKS5rZXl3b3JkcztcclxuXHJcbiAgICBsZXQgY2xzOiBTdHJ1Y3RhYmxlQ2xhc3M7XHJcbiAgICBsZXQgc3R0OiBOU3RydWN0O1xyXG5cclxuICAgIGlmICh0eXBlb2YgY2xzX29yX3N0cnVjdF9pZCA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICBjbHMgPSB0aGlzLnN0cnVjdF9jbHNbdGhpcy5zdHJ1Y3RfaWRzW2Nsc19vcl9zdHJ1Y3RfaWRdLm5hbWVdO1xyXG4gICAgfSBlbHNlIGlmIChjbHNfb3Jfc3RydWN0X2lkIGluc3RhbmNlb2YgTlN0cnVjdCkge1xyXG4gICAgICBjbHMgPSB0aGlzLmdldF9zdHJ1Y3RfY2xzKGNsc19vcl9zdHJ1Y3RfaWQubmFtZSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjbHMgPSBjbHNfb3Jfc3RydWN0X2lkO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjbHMgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJiYWQgY2xzX29yX3N0cnVjdF9pZCBcIiArIGNsc19vcl9zdHJ1Y3RfaWQpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0dCA9IHRoaXMuc3RydWN0c1tjbHMuc3RydWN0TmFtZSFdO1xyXG5cclxuICAgIGlmIChzdHQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIGNsYXNzIFwiICsgY2xzKTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQganNvbk9iaiA9IGpzb24gYXMgUmVjb3JkPHN0cmluZyB8IHN5bWJvbCwgdW5rbm93bj47XHJcbiAgICBsZXQgZmllbGRzID0gc3R0LmZpZWxkcztcclxuICAgIGxldCBmbGVuID0gZmllbGRzLmxlbmd0aDtcclxuXHJcbiAgICBsZXQga2V5cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG4gICAga2V5cy5hZGQoX2Fic3RyYWN0S2V5KTtcclxuXHJcbiAgICBsZXQga2V5VGVzdEpzb246IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ganNvbk9iaiBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZsZW47IGkrKykge1xyXG4gICAgICBsZXQgZiA9IGZpZWxkc1tpXTtcclxuXHJcbiAgICAgIGxldCB2YWw6IHVua25vd247XHJcblxyXG4gICAgICBsZXQgdGluZm86IFRva0luZm8gfCB1bmRlZmluZWQ7XHJcblxyXG4gICAgICBpZiAoZi5uYW1lID09PSBcInRoaXNcIikge1xyXG4gICAgICAgIHZhbCA9IGpzb247XHJcbiAgICAgICAga2V5VGVzdEpzb24gPSB7XHJcbiAgICAgICAgICBcInRoaXNcIjoganNvbixcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBrZXlzLmFkZChcInRoaXNcIik7XHJcbiAgICAgICAgdGluZm8gPSBqc29uT2JqW1Rva1N5bWJvbCBhcyB1bmtub3duIGFzIHN0cmluZ10gYXMgVG9rSW5mbyB8IHVuZGVmaW5lZDtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB2YWwgPSAoanNvbk9iaiBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilbZi5uYW1lXTtcclxuICAgICAgICBrZXlzLmFkZChmLm5hbWUpO1xyXG5cclxuICAgICAgICB0aW5mbyA9IGpzb25PYmpbVG9rU3ltYm9sIGFzIHVua25vd24gYXMgc3RyaW5nXVxyXG4gICAgICAgICAgPyAoanNvbk9ialtUb2tTeW1ib2wgYXMgdW5rbm93biBhcyBzdHJpbmddIGFzIFRva0luZm8pLmZpZWxkc1tmLm5hbWVdXHJcbiAgICAgICAgICA6IHVuZGVmaW5lZDtcclxuICAgICAgICBpZiAoIXRpbmZvKSB7XHJcbiAgICAgICAgICBsZXQgZjIgPSBmaWVsZHNbTWF0aC5tYXgoaSAtIDEsIDApXTtcclxuICAgICAgICAgIHRpbmZvID0gKGpzb25PYmpbVG9rU3ltYm9sIGFzIHVua25vd24gYXMgc3RyaW5nXSBhcyBUb2tJbmZvIHwgdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICA/IChqc29uT2JqW1Rva1N5bWJvbCBhcyB1bmtub3duIGFzIHN0cmluZ10gYXMgVG9rSW5mbykuZmllbGRzW2YyLm5hbWVdXHJcbiAgICAgICAgICAgIDogdW5kZWZpbmVkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0aW5mbykge1xyXG4gICAgICAgICAgdGluZm8gPSBqc29uT2JqW1Rva1N5bWJvbCBhcyB1bmtub3duIGFzIHN0cmluZ10gYXMgVG9rSW5mbyB8IHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh2YWwgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIC8vY29uc29sZS53YXJuKFwibnN0cnVjdGpzLnJlYWRKU09OOiBNaXNzaW5nIGZpZWxkIFwiICsgZi5uYW1lICsgXCIgaW4gc3RydWN0IFwiICsgc3R0Lm5hbWUpO1xyXG4gICAgICAgIC8vY29udGludWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGxldCBpbnN0YW5jZSA9IGYubmFtZSA9PT0gXCJ0aGlzXCIgPyB2YWwgOiBqc29uO1xyXG5cclxuICAgICAgbGV0IHJldCA9IHNpbnRlcm4yLnZhbGlkYXRlSlNPTih0aGlzLCB2YWwsIGpzb24sIGYsIGYudHlwZSwgaW5zdGFuY2UsIF9hYnN0cmFjdEtleSk7XHJcblxyXG4gICAgICBpZiAoIXJldCB8fCB0eXBlb2YgcmV0ID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgbGV0IG1zZyA9IHR5cGVvZiByZXQgPT09IFwic3RyaW5nXCIgPyBcIjogXCIgKyByZXQgOiBcIlwiO1xyXG5cclxuICAgICAgICBpZiAodGluZm8pIHtcclxuICAgICAgICAgIHRoaXMuanNvbkxvZ2dlcihwcmludENvbnRleHQodGhpcy5qc29uQnVmLCB0aW5mbywgdGhpcy5qc29uVXNlQ29sb3JzKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodmFsID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIHRocm93IG5ldyBKU09ORXJyb3Ioc3R0Lm5hbWUgKyBcIjogTWlzc2luZyBqc29uIGZpZWxkIFwiICsgZi5uYW1lICsgbXNnKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEpTT05FcnJvcihzdHQubmFtZSArIFwiOiBJbnZhbGlkIGpzb24gZmllbGQgXCIgKyBmLm5hbWUgKyBtc2cpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChsZXQgayBpbiBrZXlUZXN0SnNvbikge1xyXG4gICAgICBpZiAodHlwZW9mIChqc29uT2JqIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVtrXSA9PT0gXCJzeW1ib2xcIikge1xyXG4gICAgICAgIC8vaWdub3JlIHN5bWJvbHNcclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKCFrZXlzLmhhcyhrKSkge1xyXG4gICAgICAgIHRoaXMuanNvbkxvZ2dlcihjbHMuU1RSVUNUISk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEpTT05FcnJvcihzdHQubmFtZSArIFwiOiBVbmtub3duIGpzb24gZmllbGQgXCIgKyBrKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuXHJcbiAgcmVhZEpTT04oanNvbjogdW5rbm93biwgY2xzX29yX3N0cnVjdF9pZDogU3RydWN0YWJsZUNsYXNzIHwgTlN0cnVjdCB8IG51bWJlciwgb2JqSW5zdGFuY2U/OiB1bmtub3duKTogdW5rbm93biB7XHJcbiAgICBjb25zdCBrZXl3b3JkcyA9ICh0aGlzLmNvbnN0cnVjdG9yIGFzIHR5cGVvZiBTVFJVQ1QpLmtleXdvcmRzO1xyXG5cclxuICAgIGxldCBjbHM6IFN0cnVjdGFibGVDbGFzcztcclxuICAgIGxldCBzdHQ6IE5TdHJ1Y3Q7XHJcblxyXG4gICAgaWYgKHR5cGVvZiBjbHNfb3Jfc3RydWN0X2lkID09PSBcIm51bWJlclwiKSB7XHJcbiAgICAgIGNscyA9IHRoaXMuc3RydWN0X2Nsc1t0aGlzLnN0cnVjdF9pZHNbY2xzX29yX3N0cnVjdF9pZF0ubmFtZV07XHJcbiAgICB9IGVsc2UgaWYgKGNsc19vcl9zdHJ1Y3RfaWQgaW5zdGFuY2VvZiBOU3RydWN0KSB7XHJcbiAgICAgIGNscyA9IHRoaXMuZ2V0X3N0cnVjdF9jbHMoY2xzX29yX3N0cnVjdF9pZC5uYW1lKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNscyA9IGNsc19vcl9zdHJ1Y3RfaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGNscyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImJhZCBjbHNfb3Jfc3RydWN0X2lkIFwiICsgY2xzX29yX3N0cnVjdF9pZCk7XHJcbiAgICB9XHJcblxyXG4gICAgc3R0ID0gdGhpcy5zdHJ1Y3RzW2Nscy5zdHJ1Y3ROYW1lIV07XHJcblxyXG4gICAgcGFja2VyX2RlYnVnKFwiXFxuXFxuPUJlZ2luIHJlYWRpbmcgXCIgKyBjbHMuc3RydWN0TmFtZSArIFwiPVwiKTtcclxuICAgIGxldCB0aGVzdHJ1Y3QgPSB0aGlzO1xyXG4gICAgbGV0IHRoaXMyID0gdGhpcztcclxuICAgIGxldCB3YXNfcnVuID0gZmFsc2U7XHJcbiAgICBsZXQgX2Zyb21KU09OID0gc2ludGVybjIuZnJvbUpTT047XHJcblxyXG4gICAgZnVuY3Rpb24gbWFrZUxvYWRlcihzdHQ6IE5TdHJ1Y3QpOiBTdHJ1Y3RSZWFkZXIge1xyXG4gICAgICByZXR1cm4gZnVuY3Rpb24gbG9hZChvYmo6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB7XHJcbiAgICAgICAgaWYgKHdhc19ydW4pIHtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHdhc19ydW4gPSB0cnVlO1xyXG5cclxuICAgICAgICBsZXQgZmllbGRzID0gc3R0LmZpZWxkcztcclxuICAgICAgICBsZXQgZmxlbiA9IGZpZWxkcy5sZW5ndGg7XHJcbiAgICAgICAgbGV0IGpzb25PYmogPSBqc29uIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZsZW47IGkrKykge1xyXG4gICAgICAgICAgbGV0IGYgPSBmaWVsZHNbaV07XHJcblxyXG4gICAgICAgICAgbGV0IHZhbDogdW5rbm93bjtcclxuXHJcbiAgICAgICAgICBpZiAoZi5uYW1lID09PSBcInRoaXNcIikge1xyXG4gICAgICAgICAgICB2YWwgPSBqc29uO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdmFsID0ganNvbk9ialtmLm5hbWVdO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGlmICh2YWwgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBpZiAod2FybmluZ2x2bCA+IDEpIHtcclxuICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJuc3RydWN0anMucmVhZEpTT046IE1pc3NpbmcgZmllbGQgXCIgKyBmLm5hbWUgKyBcIiBpbiBzdHJ1Y3QgXCIgKyBzdHQubmFtZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgbGV0IGluc3RhbmNlID0gZi5uYW1lID09PSBcInRoaXNcIiA/IG9iaiA6IG9iakluc3RhbmNlO1xyXG5cclxuICAgICAgICAgIGxldCByZXQgPSBfZnJvbUpTT04odGhpczIsIHZhbCwgb2JqLCBmLCBmLnR5cGUsIGluc3RhbmNlKTtcclxuXHJcbiAgICAgICAgICBpZiAoZi5uYW1lICE9PSBcInRoaXNcIikge1xyXG4gICAgICAgICAgICBvYmpbZi5uYW1lXSA9IHJldDtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGxvYWQgPSBtYWtlTG9hZGVyKHN0dCk7XHJcblxyXG4gICAgaWYgKGNscy5wcm90b3R5cGUubG9hZFNUUlVDVCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIGxldCBvYmogPSBvYmpJbnN0YW5jZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgIGlmICghb2JqICYmIGNscy5uZXdTVFJVQ1QgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIG9iaiA9IGNscy5uZXdTVFJVQ1QobG9hZCkgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XHJcbiAgICAgIH0gZWxzZSBpZiAoIW9iaikge1xyXG4gICAgICAgIG9iaiA9IG5ldyAoY2xzIGFzIHVua25vd24gYXMgbmV3ICgpID0+IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAob2JqIS5sb2FkU1RSVUNUIGFzIEZ1bmN0aW9uKShsb2FkKTtcclxuICAgICAgcmV0dXJuIG9iajtcclxuICAgIH0gZWxzZSBpZiAoY2xzLmZyb21TVFJVQ1QgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBpZiAod2FybmluZ2x2bCA+IDEpIHtcclxuICAgICAgICBjb25zb2xlLndhcm4oXHJcbiAgICAgICAgICBcIldhcm5pbmc6IGNsYXNzIFwiICtcclxuICAgICAgICAgICAgdW5tYW5nbGUoY2xzLm5hbWUpICtcclxuICAgICAgICAgICAgXCIgaXMgdXNpbmcgZGVwcmVjYXRlZCBmcm9tU1RSVUNUIGludGVyZmFjZTsgdXNlIG5ld1NUUlVDVC9sb2FkU1RSVUNUIGluc3RlYWRcIlxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGNscy5mcm9tU1RSVUNUKGxvYWQpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy9kZWZhdWx0IGNhc2UsIG1ha2UgbmV3IGluc3RhbmNlIGFuZCB0aGVuIGNhbGwgbG9hZCgpIG9uIGl0XHJcbiAgICAgIGxldCBvYmogPSBvYmpJbnN0YW5jZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgIGlmICghb2JqICYmIGNscy5uZXdTVFJVQ1QgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIG9iaiA9IGNscy5uZXdTVFJVQ1QobG9hZCkgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XHJcbiAgICAgIH0gZWxzZSBpZiAoIW9iaikge1xyXG4gICAgICAgIG9iaiA9IG5ldyAoY2xzIGFzIHVua25vd24gYXMgbmV3ICgpID0+IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsb2FkKG9iaiEpO1xyXG5cclxuICAgICAgcmV0dXJuIG9iajtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZvcm1hdEpTT05faW50ZXJuKGpzb246IHVua25vd24sIHN0dDogTlN0cnVjdCwgZmllbGQ/OiBTdHJ1Y3RGaWVsZCwgdGx2bDogbnVtYmVyID0gMCk6IHN0cmluZyB7XHJcbiAgICBjb25zdCBrZXl3b3JkcyA9ICh0aGlzLmNvbnN0cnVjdG9yIGFzIHR5cGVvZiBTVFJVQ1QpLmtleXdvcmRzO1xyXG4gICAgY29uc3QgYWRkQ29tbWVudHMgPSB0aGlzLmZvcm1hdEN0eC5hZGRDb21tZW50cztcclxuXHJcbiAgICBsZXQganNvbk9iaiA9IGpzb24gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XHJcbiAgICBsZXQgcyA9IFwie1wiO1xyXG5cclxuICAgIGlmIChhZGRDb21tZW50cyAmJiBmaWVsZCAmJiBmaWVsZC5jb21tZW50LnRyaW0oKSkge1xyXG4gICAgICBzICs9IFwiIFwiICsgZmllbGQuY29tbWVudC50cmltKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcyArPSBcIlxcblwiO1xyXG5cclxuICAgIGZvciAobGV0IGYgb2Ygc3R0LmZpZWxkcykge1xyXG4gICAgICBsZXQgdmFsdWUgPSBqc29uT2JqW2YubmFtZV07XHJcblxyXG4gICAgICBzICs9IHRhYih0bHZsICsgMSkgKyBmLm5hbWUgKyBcIjogXCI7XHJcblxyXG4gICAgICBzICs9IHNpbnRlcm4yLmZvcm1hdEpTT04odGhpcywgdmFsdWUsIGpzb24sIGYsIGYudHlwZSwgdW5kZWZpbmVkLCB0bHZsICsgMSk7XHJcbiAgICAgIHMgKz0gXCIsXCI7XHJcblxyXG4gICAgICBsZXQgYmFzZXR5cGUgPSBmLnR5cGUudHlwZTtcclxuXHJcbiAgICAgIGlmIChBcnJheVR5cGVzLmhhcyhiYXNldHlwZSkpIHtcclxuICAgICAgICBiYXNldHlwZSA9IChmLnR5cGUuZGF0YSBhcyB7IHR5cGU6IFN0cnVjdFR5cGUgfSkudHlwZS50eXBlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBhZGRDb21tZW50ID0gVmFsdWVUeXBlcy5oYXMoYmFzZXR5cGUpICYmIGFkZENvbW1lbnRzICYmIGYuY29tbWVudC50cmltKCk7XHJcblxyXG4gICAgICBpZiAoYWRkQ29tbWVudCkge1xyXG4gICAgICAgIHMgKz0gXCIgXCIgKyBmLmNvbW1lbnQudHJpbSgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBzICs9IFwiXFxuXCI7XHJcbiAgICB9XHJcblxyXG4gICAgcyArPSB0YWIodGx2bCkgKyBcIn1cIjtcclxuICAgIHJldHVybiBzO1xyXG4gIH1cclxuXHJcbiAgZm9ybWF0SlNPTihqc29uOiB1bmtub3duLCBjbHM6IFN0cnVjdGFibGVDbGFzcywgYWRkQ29tbWVudHM6IGJvb2xlYW4gPSB0cnVlLCB2YWxpZGF0ZTogYm9vbGVhbiA9IHRydWUpOiBzdHJpbmcge1xyXG4gICAgY29uc3Qga2V5d29yZHMgPSAodGhpcy5jb25zdHJ1Y3RvciBhcyB0eXBlb2YgU1RSVUNUKS5rZXl3b3JkcztcclxuXHJcbiAgICBpZiAodmFsaWRhdGUpIHtcclxuICAgICAgdGhpcy52YWxpZGF0ZUpTT04oanNvbiwgY2xzKTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgc3R0ID0gdGhpcy5zdHJ1Y3RzW2Nscy5zdHJ1Y3ROYW1lIV07XHJcblxyXG4gICAgdGhpcy5mb3JtYXRDdHggPSB7XHJcbiAgICAgIGFkZENvbW1lbnRzLFxyXG4gICAgICB2YWxpZGF0ZSxcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHRoaXMuZm9ybWF0SlNPTl9pbnRlcm4oanNvbiwgc3R0KTtcclxuICB9XHJcbn1cclxuLy8kS0VZV09SRF9DT05GSUdfRU5EXHJcblxyXG5pZiAoaGF2ZUNvZGVHZW4pIHtcclxuICB2YXIgU3RydWN0Q2xhc3M6IHR5cGVvZiBTVFJVQ1QgfCB1bmRlZmluZWQ7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBldmFsKFwiXCIgLyogY29kZSBwbGFjZWhvbGRlciAqLyk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIHByaW50RXZhbEVycm9yKFwiXCIgLyogY29kZSBwbGFjZWhvbGRlciAqLyk7XHJcbiAgfVxyXG5cclxuICBpZiAoU3RydWN0Q2xhc3MpIHtcclxuICAgIFN0cnVjdENsYXNzLmtleXdvcmRzID0ge1xyXG4gICAgICBuYW1lICA6IFwic3RydWN0TmFtZVwiLFxyXG4gICAgICBzY3JpcHQ6IFwiU1RSVUNUXCIsXHJcbiAgICAgIGxvYWQgIDogXCJsb2FkU1RSVUNUXCIsXHJcbiAgICAgIGZyb20gIDogXCJmcm9tU1RSVUNUXCIsXHJcbiAgICAgIG5ldyAgIDogXCJuZXdTVFJVQ1RcIixcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG5TVFJVQ1Quc2V0Q2xhc3NLZXl3b3JkKFwiU1RSVUNUXCIpO1xyXG5cclxuZnVuY3Rpb24gZGVyaXZlU3RydWN0TWFuYWdlcihcclxuICBrZXl3b3JkczogU1RSVUNUS2V5d29yZHMgPSB7XHJcbiAgICBzY3JpcHQ6IFwiU1RSVUNUXCIsXHJcbiAgICBuYW1lICA6IFwic3RydWN0TmFtZVwiLFxyXG4gICAgbG9hZCAgOiBcImxvYWRTVFJVQ1RcIixcclxuICAgIG5ldyAgIDogXCJuZXdTVFJVQ1RcIixcclxuICAgIGZyb20gIDogXCJmcm9tU1RSVUNUXCIsXHJcbiAgfVxyXG4pOiB0eXBlb2YgU1RSVUNUIHtcclxuICBpZiAoIWtleXdvcmRzLm5hbWUpIHtcclxuICAgIGtleXdvcmRzLm5hbWUgPSBrZXl3b3Jkcy5zY3JpcHQudG9Mb3dlckNhc2UoKSArIFwiTmFtZVwiO1xyXG4gIH1cclxuXHJcbiAgaWYgKCFrZXl3b3Jkcy5sb2FkKSB7XHJcbiAgICBrZXl3b3Jkcy5sb2FkID0gXCJsb2FkXCIgKyBrZXl3b3Jkcy5zY3JpcHQ7XHJcbiAgfVxyXG5cclxuICBpZiAoIWtleXdvcmRzLm5ldykge1xyXG4gICAga2V5d29yZHMubmV3ID0gXCJuZXdcIiArIGtleXdvcmRzLnNjcmlwdDtcclxuICB9XHJcblxyXG4gIGlmICgha2V5d29yZHMuZnJvbSkge1xyXG4gICAga2V5d29yZHMuZnJvbSA9IFwiZnJvbVwiICsga2V5d29yZHMuc2NyaXB0O1xyXG4gIH1cclxuXHJcbiAgY2xhc3MgTmV3U1RSVUNUIGV4dGVuZHMgU1RSVUNUIHt9XHJcblxyXG4gIChOZXdTVFJVQ1QgYXMgdW5rbm93biBhcyB7IGtleXdvcmRzOiBTVFJVQ1RLZXl3b3JkcyB9KS5rZXl3b3JkcyA9IGtleXdvcmRzO1xyXG4gIHJldHVybiBOZXdTVFJVQ1Q7XHJcbn1cclxuXHJcbi8vbWFpbiBzdHJ1Y3Qgc2NyaXB0IG1hbmFnZXJcclxubWFuYWdlciA9IG5ldyBTVFJVQ1QoKTtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZSBhbGwgZGVmaW5lZCBzdHJ1Y3RzIG91dCB0byBhIHN0cmluZy5cclxuICpcclxuICogQHBhcmFtIG5NYW5hZ2VyIFNUUlVDVCBpbnN0YW5jZSwgZGVmYXVsdHMgdG8gbnN0cnVjdGpzLm1hbmFnZXJcclxuICogQHBhcmFtIGluY2x1ZGVfY29kZSBpbmNsdWRlIHNhdmUgY29kZSBzbmlwcGV0c1xyXG4gKiAqL1xyXG5mdW5jdGlvbiB3cml0ZV9zY3JpcHRzKG5NYW5hZ2VyOiBTVFJVQ1QgPSBtYW5hZ2VyLCBpbmNsdWRlX2NvZGU6IGJvb2xlYW4gPSBmYWxzZSk6IHN0cmluZyB7XHJcbiAgbGV0IGJ1ZiA9IFwiXCI7XHJcblxyXG4gIC8qIHByZXZlbnQgY29kZSBnZW5lcmF0aW9uIGJ1Z3MgaW4gY29uZmlndXJhYmxlIG1vZGUgKi9cclxuICBsZXQgbmwgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKDEwKTtcclxuICBsZXQgdGFiQ2hhciA9IFN0cmluZy5mcm9tQ2hhckNvZGUoOSk7XHJcblxyXG4gIG5NYW5hZ2VyLmZvckVhY2goZnVuY3Rpb24gKHN0dCkge1xyXG4gICAgYnVmICs9IFNUUlVDVC5mbXRfc3RydWN0KHN0dCwgZmFsc2UsICFpbmNsdWRlX2NvZGUpICsgbmw7XHJcbiAgfSk7XHJcblxyXG4gIGxldCBidWYyID0gYnVmO1xyXG4gIGJ1ZiA9IFwiXCI7XHJcblxyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYnVmMi5sZW5ndGg7IGkrKykge1xyXG4gICAgbGV0IGMgPSBidWYyW2ldO1xyXG4gICAgaWYgKGMgPT09IG5sKSB7XHJcbiAgICAgIGJ1ZiArPSBubDtcclxuICAgICAgbGV0IGkyID0gaTtcclxuICAgICAgd2hpbGUgKGkgPCBidWYyLmxlbmd0aCAmJiAoYnVmMltpXSA9PT0gXCIgXCIgfHwgYnVmMltpXSA9PT0gdGFiQ2hhciB8fCBidWYyW2ldID09PSBubCkpIHtcclxuICAgICAgICBpKys7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGkgIT09IGkyKSBpLS07XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBidWYgKz0gYztcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiBidWY7XHJcbn1cclxuXHJcbi8qIC0tLS0gZmlsZSBoZWxwZXIgLS0tLSAqL1xyXG5cclxuKFwidXNlIHN0cmljdFwiKTtcclxuXHJcbmxldCBuYnRvYTogKHN0cjogc3RyaW5nKSA9PiBzdHJpbmc7XHJcbmxldCBuYXRvYjogKHN0cjogc3RyaW5nKSA9PiBzdHJpbmc7XHJcblxyXG5pZiAodHlwZW9mIGJ0b2EgPT09IFwidW5kZWZpbmVkXCIpIHtcclxuICBuYnRvYSA9IGZ1bmN0aW9uIGJ0b2Eoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgbGV0IEJ1ZmZlckNscyA9IChnbG9iYWxUaGlzIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVtcIkJ1ZmZlclwiXSBhcyB7XHJcbiAgICAgIGZyb20oczogc3RyaW5nLCBlbmM6IHN0cmluZyk6IHsgdG9TdHJpbmcoZW5jOiBzdHJpbmcpOiBzdHJpbmcgfTtcclxuICAgIH07XHJcbiAgICBsZXQgYnVmZmVyID0gQnVmZmVyQ2xzLmZyb20oXCJcIiArIHN0ciwgXCJiaW5hcnlcIik7XHJcbiAgICByZXR1cm4gYnVmZmVyLnRvU3RyaW5nKFwiYmFzZTY0XCIpO1xyXG4gIH07XHJcblxyXG4gIG5hdG9iID0gZnVuY3Rpb24gYXRvYihzdHI6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICBsZXQgQnVmZmVyQ2xzID0gKGdsb2JhbFRoaXMgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW1wiQnVmZmVyXCJdIGFzIHtcclxuICAgICAgZnJvbShzOiBzdHJpbmcsIGVuYzogc3RyaW5nKTogeyB0b1N0cmluZyhlbmM6IHN0cmluZyk6IHN0cmluZyB9O1xyXG4gICAgfTtcclxuICAgIHJldHVybiBCdWZmZXJDbHMuZnJvbShzdHIsIFwiYmFzZTY0XCIpLnRvU3RyaW5nKFwiYmluYXJ5XCIpO1xyXG4gIH07XHJcbn0gZWxzZSB7XHJcbiAgbmF0b2IgPSBhdG9iO1xyXG4gIG5idG9hID0gYnRvYTtcclxufVxyXG5cclxuLypcclxuZmlsZSBmb3JtYXQ6XHJcbiAgbWFnaWMgc2lnbmF0dXJlICAgICAgICAgICAgICA6IDQgYnl0ZXNcclxuICBmaWxlIHZlcnNpb24gbWFqb3IgICAgICAgICAgIDogMiBieXRlc1xyXG4gIGZpbGUgdmVyc2lvbiBtaW5vciAgICAgICAgICAgOiAxIGJ5dGVzXHJcbiAgZmlsZSB2ZXJzaW9uIG1pY3JvICAgICAgICAgICA6IDEgYnl0ZXNcclxuICBsZW5ndGggb2Ygc3RydWN0IHNjcmlwdHMgICAgIDogNCBieXRlc1xyXG4gIHN0cnVjdCBzY3JpcHRzIGZvciB0aGlzIGZpbGUgOiAuLi5cclxuXHJcbiAgYmxvY2s6XHJcbiAgICBtYWdpYyBzaWduYXR1cmUgZm9yIGJsb2NrICAgICAgICAgICAgICA6IDQgYnl0ZXNcclxuICAgIGxlbmd0aCBvZiBkYXRhICAobm90IGluY2x1ZGluZyBoZWFkZXIpIDogNCBieXRlc1xyXG4gICAgaWQgb2Ygc3RydWN0IHR5cGUgICAgICAgICAgICAgICAgICAgICAgOiA0IGJ5dGVzXHJcblxyXG4gICAgZGF0YSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiAuLi5cclxuKi9cclxuXHJcbmludGVyZmFjZSBWZXJzaW9uT2JqIHtcclxuICBtYWpvcjogbnVtYmVyO1xyXG4gIG1pbm9yOiBudW1iZXI7XHJcbiAgbWljcm86IG51bWJlcjtcclxufVxyXG5cclxuZnVuY3Rpb24gdmVyc2lvblRvSW50KHY6IHN0cmluZyB8IG51bWJlcltdIHwgVmVyc2lvbk9iaik6IG51bWJlciB7XHJcbiAgdiA9IHZlcnNpb25Db2VyY2Uodik7XHJcbiAgbGV0IG11bCA9IDY0O1xyXG4gIHJldHVybiB+fih2Lm1ham9yICogbXVsICogbXVsICogbXVsICsgdi5taW5vciAqIG11bCAqIG11bCArIHYubWljcm8gKiBtdWwpO1xyXG59XHJcblxyXG5sZXQgdmVyX3BhdCA9IC9bMC05XStcXC5bMC05XStcXC5bMC05XSskLztcclxuXHJcbmZ1bmN0aW9uIHZlcnNpb25Db2VyY2Uodjogc3RyaW5nIHwgbnVtYmVyW10gfCBWZXJzaW9uT2JqIHwgdW5rbm93bik6IFZlcnNpb25PYmoge1xyXG4gIGlmICghdikge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiZW1wdHkgdmVyc2lvbjogXCIgKyB2KTtcclxuICB9XHJcblxyXG4gIGlmICh0eXBlb2YgdiA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgaWYgKCF2ZXJfcGF0LmV4ZWModikpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCB2ZXJzaW9uIHN0cmluZyBcIiArIHYpO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCB2ZXIgPSB2LnNwbGl0KFwiLlwiKTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIG1ham9yOiBwYXJzZUludCh2ZXJbMF0pLFxyXG4gICAgICBtaW5vcjogcGFyc2VJbnQodmVyWzFdKSxcclxuICAgICAgbWljcm86IHBhcnNlSW50KHZlclsyXSksXHJcbiAgICB9O1xyXG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh2KSkge1xyXG4gICAgY29uc3QgYXJyID0gdiBhcyBudW1iZXJbXTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIG1ham9yOiBhcnJbMF0sXHJcbiAgICAgIG1pbm9yOiBhcnJbMV0sXHJcbiAgICAgIG1pY3JvOiBhcnJbMl0sXHJcbiAgICB9O1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIHYgPT09IFwib2JqZWN0XCIgJiYgdiAhPT0gbnVsbCkge1xyXG4gICAgbGV0IHZPYmogPSB2IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xyXG4gICAgbGV0IHRlc3QgPSAoazogc3RyaW5nKSA9PiBrIGluIHZPYmogJiYgdHlwZW9mIHZPYmpba10gPT09IFwibnVtYmVyXCI7XHJcblxyXG4gICAgaWYgKCF0ZXN0KFwibWFqb3JcIikgfHwgIXRlc3QoXCJtaW5vclwiKSB8fCAhdGVzdChcIm1pY3JvXCIpKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgdmVyc2lvbiBvYmplY3Q6IFwiICsgdik7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHYgYXMgVmVyc2lvbk9iajtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCB2ZXJzaW9uIFwiICsgdik7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB2ZXJzaW9uTGVzc1RoYW4oYTogc3RyaW5nIHwgbnVtYmVyW10gfCBWZXJzaW9uT2JqLCBiOiBzdHJpbmcgfCBudW1iZXJbXSB8IFZlcnNpb25PYmopOiBib29sZWFuIHtcclxuICByZXR1cm4gdmVyc2lvblRvSW50KGEpIDwgdmVyc2lvblRvSW50KGIpO1xyXG59XHJcblxyXG5jbGFzcyBGaWxlUGFyYW1zIHtcclxuICBtYWdpYzogc3RyaW5nO1xyXG4gIGV4dDogc3RyaW5nO1xyXG4gIGJsb2NrdHlwZXM6IHN0cmluZ1tdO1xyXG4gIHZlcnNpb246IFZlcnNpb25PYmo7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5tYWdpYyA9IFwiU1RSVFwiO1xyXG4gICAgdGhpcy5leHQgPSBcIi5iaW5cIjtcclxuICAgIHRoaXMuYmxvY2t0eXBlcyA9IFtcIkRBVEFcIl07XHJcblxyXG4gICAgdGhpcy52ZXJzaW9uID0ge1xyXG4gICAgICBtYWpvcjogMCxcclxuICAgICAgbWlub3I6IDAsXHJcbiAgICAgIG1pY3JvOiAxLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8vdXNlZCB0byBkZWZpbmUgYmxvY2tzXHJcbmNsYXNzIEJsb2NrIHtcclxuICB0eXBlOiBzdHJpbmc7XHJcbiAgZGF0YTogdW5rbm93bjtcclxuXHJcbiAgY29uc3RydWN0b3IodHlwZT86IHN0cmluZywgZGF0YT86IHVua25vd24pIHtcclxuICAgIHRoaXMudHlwZSA9IHR5cGUgfHwgXCJcIjtcclxuICAgIHRoaXMuZGF0YSA9IGRhdGE7XHJcbiAgfVxyXG59XHJcblxyXG5jbGFzcyBGaWxlZUVycm9yIGV4dGVuZHMgRXJyb3Ige31cclxuXHJcbmNsYXNzIEZpbGVIZWxwZXIge1xyXG4gIHZlcnNpb246IFZlcnNpb25PYmo7XHJcbiAgYmxvY2t0eXBlczogc3RyaW5nW107XHJcbiAgbWFnaWM6IHN0cmluZztcclxuICBleHQ6IHN0cmluZztcclxuICBzdHJ1Y3Q6IFNUUlVDVCB8IHVuZGVmaW5lZDtcclxuICB1bnBhY2tfY3R4OiB1bnBhY2tfY29udGV4dCB8IHVuZGVmaW5lZDtcclxuICBibG9ja3M6IEJsb2NrW107XHJcblxyXG4gIC8vcGFyYW1zIGNhbiBiZSBGaWxlUGFyYW1zIGluc3RhbmNlLCBvciBvYmplY3QgbGl0ZXJhbFxyXG4gIC8vKGl0IHdpbGwgY29udmVydCB0byBGaWxlUGFyYW1zKVxyXG4gIGNvbnN0cnVjdG9yKHBhcmFtcz86IEZpbGVQYXJhbXMgfCBQYXJ0aWFsPEZpbGVQYXJhbXM+KSB7XHJcbiAgICBpZiAocGFyYW1zID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgcGFyYW1zID0gbmV3IEZpbGVQYXJhbXMoKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGxldCBmcCA9IG5ldyBGaWxlUGFyYW1zKCk7XHJcblxyXG4gICAgICBmb3IgKGxldCBrIGluIHBhcmFtcykge1xyXG4gICAgICAgIChmcCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVtrXSA9IChwYXJhbXMgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilba107XHJcbiAgICAgIH1cclxuICAgICAgcGFyYW1zID0gZnA7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy52ZXJzaW9uID0gcGFyYW1zLnZlcnNpb24hO1xyXG4gICAgdGhpcy5ibG9ja3R5cGVzID0gcGFyYW1zLmJsb2NrdHlwZXMhO1xyXG4gICAgdGhpcy5tYWdpYyA9IHBhcmFtcy5tYWdpYyE7XHJcbiAgICB0aGlzLmV4dCA9IHBhcmFtcy5leHQhO1xyXG4gICAgdGhpcy5zdHJ1Y3QgPSB1bmRlZmluZWQ7XHJcbiAgICB0aGlzLnVucGFja19jdHggPSB1bmRlZmluZWQ7XHJcbiAgICB0aGlzLmJsb2NrcyA9IFtdO1xyXG4gIH1cclxuXHJcbiAgcmVhZChkYXRhdmlldzogRGF0YVZpZXcpOiBCbG9ja1tdIHtcclxuICAgIHRoaXMudW5wYWNrX2N0eCA9IG5ldyB1bnBhY2tfY29udGV4dCgpO1xyXG5cclxuICAgIGxldCBtYWdpYyA9IHVucGFja19zdGF0aWNfc3RyaW5nKGRhdGF2aWV3LCB0aGlzLnVucGFja19jdHgsIDQpO1xyXG5cclxuICAgIGlmIChtYWdpYyAhPT0gdGhpcy5tYWdpYykge1xyXG4gICAgICB0aHJvdyBuZXcgRmlsZWVFcnJvcihcImNvcnJ1cHRlZCBmaWxlXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMudmVyc2lvbiA9IHtcclxuICAgICAgbWFqb3I6IDAsXHJcbiAgICAgIG1pbm9yOiAwLFxyXG4gICAgICBtaWNybzogMCxcclxuICAgIH07XHJcbiAgICB0aGlzLnZlcnNpb24ubWFqb3IgPSB1bnBhY2tfc2hvcnQoZGF0YXZpZXcsIHRoaXMudW5wYWNrX2N0eCk7XHJcbiAgICB0aGlzLnZlcnNpb24ubWlub3IgPSB1bnBhY2tfYnl0ZShkYXRhdmlldywgdGhpcy51bnBhY2tfY3R4KTtcclxuICAgIHRoaXMudmVyc2lvbi5taWNybyA9IHVucGFja19ieXRlKGRhdGF2aWV3LCB0aGlzLnVucGFja19jdHgpO1xyXG5cclxuICAgIGxldCBzdHJ1Y3QgPSAodGhpcy5zdHJ1Y3QgPSBuZXcgU1RSVUNUKCkpO1xyXG5cclxuICAgIGxldCBzY3JpcHRzID0gdW5wYWNrX3N0cmluZyhkYXRhdmlldywgdGhpcy51bnBhY2tfY3R4KTtcclxuICAgIHRoaXMuc3RydWN0LnBhcnNlX3N0cnVjdHMoc2NyaXB0cywgbWFuYWdlcik7XHJcblxyXG4gICAgbGV0IGJsb2NrczogQmxvY2tbXSA9IFtdO1xyXG4gICAgbGV0IGR2aWV3bGVuID0gZGF0YXZpZXcuYnVmZmVyLmJ5dGVMZW5ndGg7XHJcblxyXG4gICAgd2hpbGUgKHRoaXMudW5wYWNrX2N0eC5pIDwgZHZpZXdsZW4pIHtcclxuICAgICAgbGV0IHR5cGUgPSB1bnBhY2tfc3RhdGljX3N0cmluZyhkYXRhdmlldywgdGhpcy51bnBhY2tfY3R4LCA0KTtcclxuICAgICAgbGV0IGRhdGFsZW4gPSB1bnBhY2tfaW50KGRhdGF2aWV3LCB0aGlzLnVucGFja19jdHgpO1xyXG4gICAgICBsZXQgYnN0cnVjdCA9IHVucGFja19pbnQoZGF0YXZpZXcsIHRoaXMudW5wYWNrX2N0eCk7XHJcbiAgICAgIGxldCBiZGF0YTogdW5rbm93bjtcclxuXHJcbiAgICAgIGlmIChic3RydWN0ID09PSAtMikge1xyXG4gICAgICAgIC8vc3RyaW5nIGRhdGEsIGUuZy4gSlNPTlxyXG4gICAgICAgIGJkYXRhID0gdW5wYWNrX3N0YXRpY19zdHJpbmcoZGF0YXZpZXcsIHRoaXMudW5wYWNrX2N0eCwgZGF0YWxlbik7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgYmRhdGEgPSB1bnBhY2tfYnl0ZXMoZGF0YXZpZXcsIHRoaXMudW5wYWNrX2N0eCwgZGF0YWxlbik7XHJcbiAgICAgICAgYmRhdGEgPSBzdHJ1Y3QucmVhZF9vYmplY3QoYmRhdGEgYXMgRGF0YVZpZXcsIGJzdHJ1Y3QsIG5ldyB1bnBhY2tfY29udGV4dCgpKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgbGV0IGJsb2NrID0gbmV3IEJsb2NrKCk7XHJcbiAgICAgIGJsb2NrLnR5cGUgPSB0eXBlO1xyXG4gICAgICBibG9jay5kYXRhID0gYmRhdGE7XHJcblxyXG4gICAgICBibG9ja3MucHVzaChibG9jayk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5ibG9ja3MgPSBibG9ja3M7XHJcbiAgICByZXR1cm4gYmxvY2tzO1xyXG4gIH1cclxuXHJcbiAgZG9WZXJzaW9ucyhvbGQ6IHN0cmluZyB8IG51bWJlcltdIHwgVmVyc2lvbk9iaik6IHZvaWQge1xyXG4gICAgbGV0IGJsb2NrcyA9IHRoaXMuYmxvY2tzO1xyXG5cclxuICAgIGlmICh2ZXJzaW9uTGVzc1RoYW4ob2xkLCBcIjAuMC4xXCIpKSB7XHJcbiAgICAgIC8vZG8gc29tZXRoaW5nXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB3cml0ZShibG9ja3M6IEJsb2NrW10pOiBEYXRhVmlldyB7XHJcbiAgICB0aGlzLnN0cnVjdCA9IG1hbmFnZXI7XHJcbiAgICB0aGlzLmJsb2NrcyA9IGJsb2NrcztcclxuXHJcbiAgICBsZXQgZGF0YTogbnVtYmVyW10gPSBbXTtcclxuXHJcbiAgICBwYWNrX3N0YXRpY19zdHJpbmcoZGF0YSwgdGhpcy5tYWdpYywgNCk7XHJcbiAgICBwYWNrX3Nob3J0KGRhdGEsIHRoaXMudmVyc2lvbi5tYWpvcik7XHJcbiAgICBwYWNrX2J5dGUoZGF0YSwgdGhpcy52ZXJzaW9uLm1pbm9yICYgMjU1KTtcclxuICAgIHBhY2tfYnl0ZShkYXRhLCB0aGlzLnZlcnNpb24ubWljcm8gJiAyNTUpO1xyXG5cclxuICAgIGxldCBzY3JpcHRzID0gd3JpdGVfc2NyaXB0cygpO1xyXG4gICAgcGFja19zdHJpbmcoZGF0YSwgc2NyaXB0cyk7XHJcblxyXG4gICAgbGV0IHN0cnVjdCA9IHRoaXMuc3RydWN0O1xyXG5cclxuICAgIGZvciAobGV0IGJsb2NrIG9mIGJsb2Nrcykge1xyXG4gICAgICBpZiAodHlwZW9mIGJsb2NrLmRhdGEgPT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAvL3N0cmluZyBkYXRhLCBlLmcuIEpTT05cclxuICAgICAgICBwYWNrX3N0YXRpY19zdHJpbmcoZGF0YSwgYmxvY2sudHlwZSwgNCk7XHJcbiAgICAgICAgcGFja19pbnQoZGF0YSwgYmxvY2suZGF0YS5sZW5ndGgpO1xyXG4gICAgICAgIHBhY2tfaW50KGRhdGEsIC0yKTsgLy9mbGFnIGFzIHN0cmluZyBkYXRhXHJcbiAgICAgICAgcGFja19zdGF0aWNfc3RyaW5nKGRhdGEsIGJsb2NrLmRhdGEsIGJsb2NrLmRhdGEubGVuZ3RoKTtcclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgbGV0IHN0cnVjdE5hbWUgPSAoYmxvY2suZGF0YSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikuY29uc3RydWN0b3JcclxuICAgICAgICA/ICgoYmxvY2suZGF0YSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikuY29uc3RydWN0b3IgYXMgU3RydWN0YWJsZUNsYXNzKS5zdHJ1Y3ROYW1lXHJcbiAgICAgICAgOiB1bmRlZmluZWQ7XHJcbiAgICAgIGlmIChzdHJ1Y3ROYW1lID09PSB1bmRlZmluZWQgfHwgIShzdHJ1Y3ROYW1lIGluIHN0cnVjdC5zdHJ1Y3RzKSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vbi1TVFJVQ1RhYmxlIG9iamVjdCBcIiArIGJsb2NrLmRhdGEpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsZXQgZGF0YTI6IG51bWJlcltdID0gW107XHJcbiAgICAgIGxldCBzdHQgPSBzdHJ1Y3Quc3RydWN0c1tzdHJ1Y3ROYW1lXTtcclxuXHJcbiAgICAgIHN0cnVjdC53cml0ZV9vYmplY3QoZGF0YTIsIGJsb2NrLmRhdGEgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pO1xyXG5cclxuICAgICAgcGFja19zdGF0aWNfc3RyaW5nKGRhdGEsIGJsb2NrLnR5cGUsIDQpO1xyXG4gICAgICBwYWNrX2ludChkYXRhLCBkYXRhMi5sZW5ndGgpO1xyXG4gICAgICBwYWNrX2ludChkYXRhLCBzdHQuaWQpO1xyXG5cclxuICAgICAgcGFja19ieXRlcyhkYXRhLCBkYXRhMik7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG5ldyBEYXRhVmlldyhuZXcgVWludDhBcnJheShkYXRhKS5idWZmZXIpO1xyXG4gIH1cclxuXHJcbiAgd3JpdGVCYXNlNjQoYmxvY2tzOiBCbG9ja1tdKTogc3RyaW5nIHtcclxuICAgIGxldCBkYXRhdmlldyA9IHRoaXMud3JpdGUoYmxvY2tzKTtcclxuXHJcbiAgICBsZXQgc3RyID0gXCJcIjtcclxuICAgIGxldCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGRhdGF2aWV3LmJ1ZmZlcik7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBzdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG5idG9hKHN0cik7XHJcbiAgfVxyXG5cclxuICBtYWtlQmxvY2sodHlwZTogc3RyaW5nLCBkYXRhOiB1bmtub3duKTogQmxvY2sge1xyXG4gICAgcmV0dXJuIG5ldyBCbG9jayh0eXBlLCBkYXRhKTtcclxuICB9XHJcblxyXG4gIHJlYWRCYXNlNjQoYmFzZTY0OiBzdHJpbmcpOiBCbG9ja1tdIHtcclxuICAgIGxldCBkYXRhID0gbmF0b2IoYmFzZTY0KTtcclxuICAgIGxldCBkYXRhMiA9IG5ldyBVaW50OEFycmF5KGRhdGEubGVuZ3RoKTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcclxuICAgICAgZGF0YTJbaV0gPSBkYXRhLmNoYXJDb2RlQXQoaSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRoaXMucmVhZChuZXcgRGF0YVZpZXcoZGF0YTIuYnVmZmVyKSk7XHJcbiAgfVxyXG59XHJcblxyXG52YXIgc3RydWN0X2ZpbGVoZWxwZXIgPSAvKiNfX1BVUkVfXyovIE9iamVjdC5mcmVlemUoe1xyXG4gIF9fcHJvdG9fXyAgICAgIDogbnVsbCxcclxuICB2ZXJzaW9uVG9JbnQgICA6IHZlcnNpb25Ub0ludCxcclxuICB2ZXJzaW9uQ29lcmNlICA6IHZlcnNpb25Db2VyY2UsXHJcbiAgdmVyc2lvbkxlc3NUaGFuOiB2ZXJzaW9uTGVzc1RoYW4sXHJcbiAgRmlsZVBhcmFtcyAgICAgOiBGaWxlUGFyYW1zLFxyXG4gIEJsb2NrICAgICAgICAgIDogQmxvY2ssXHJcbiAgRmlsZWVFcnJvciAgICAgOiBGaWxlZUVycm9yLFxyXG4gIEZpbGVIZWxwZXIgICAgIDogRmlsZUhlbHBlcixcclxufSk7XHJcblxyXG4vKiAtLS0tIHB1YmxpYyBBUEkgLS0tLSAqL1xyXG5cclxuLyoqIHRydW5jYXRlIHdlYnBhY2sgbWFuZ2xlZCBuYW1lcy4gZGVmYXVsdHMgdG8gdHJ1ZVxyXG4gKiAgc28gTWVzaCQxIHR1cm5zIGludG8gTWVzaCAqL1xyXG5mdW5jdGlvbiB0cnVuY2F0ZURvbGxhclNpZ24odmFsdWU6IGJvb2xlYW4gPSB0cnVlKTogdm9pZCB7XHJcbiAgc2V0VHJ1bmNhdGVEb2xsYXJTaWduKHZhbHVlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdmFsaWRhdGVTdHJ1Y3RzKG9uZXJyb3I/OiAobXNnOiBzdHJpbmcsIHN0dDogTlN0cnVjdCwgZmllbGQ6IFN0cnVjdEZpZWxkKSA9PiB2b2lkKTogdm9pZCB7XHJcbiAgcmV0dXJuIG1hbmFnZXIudmFsaWRhdGVTdHJ1Y3RzKG9uZXJyb3IpO1xyXG59XHJcblxyXG4vKipcclxuIHRydWUgbWVhbnMgbGl0dGxlIGVuZGlhbiwgZmFsc2UgbWVhbnMgYmlnIGVuZGlhblxyXG4gKi9cclxuZnVuY3Rpb24gc2V0RW5kaWFuKG1vZGU6IGJvb2xlYW4pOiBib29sZWFuIHtcclxuICBsZXQgcmV0ID0gU1RSVUNUX0VORElBTjtcclxuXHJcbiAgc2V0QmluYXJ5RW5kaWFuKG1vZGUpO1xyXG5cclxuICByZXR1cm4gcmV0O1xyXG59XHJcblxyXG5mdW5jdGlvbiBjb25zb2xlTG9nZ2VyKC4uLmFyZ3M6IHVua25vd25bXSk6IHZvaWQge1xyXG4gIGNvbnNvbGUubG9nKC4uLmFyZ3MpO1xyXG59XHJcblxyXG4vKiogVmFsaWRhdGUganNvblxyXG4gKlxyXG4gKiBAcGFyYW0ganNvblxyXG4gKiBAcGFyYW0gY2xzXHJcbiAqIEBwYXJhbSB1c2VJbnRlcm5hbFBhcnNlciBJZiB0cnVlICh0aGUgZGVmYXVsdCkgYW4gaW50ZXJuYWwgcGFyc2VyIHdpbGwgYmUgdXNlZCB0aGF0IGdlbmVyYXRlcyBuaWNlciBlcnJvciBtZXNzYWdlc1xyXG4gKiBAcGFyYW0gcHJpbnRDb2xvcnNcclxuICogQHBhcmFtIGxvZ2dlclxyXG4gKiBAcmV0dXJucyB7Kn1cclxuICovXHJcbmZ1bmN0aW9uIHZhbGlkYXRlSlNPTihcclxuICBqc29uOiB1bmtub3duLFxyXG4gIGNsczogU3RydWN0YWJsZUNsYXNzLFxyXG4gIHVzZUludGVybmFsUGFyc2VyPzogYm9vbGVhbixcclxuICBwcmludENvbG9yczogYm9vbGVhbiA9IHRydWUsXHJcbiAgbG9nZ2VyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkID0gY29uc29sZUxvZ2dlclxyXG4pOiBib29sZWFuIHtcclxuICByZXR1cm4gbWFuYWdlci52YWxpZGF0ZUpTT04oanNvbiwgY2xzLCB1c2VJbnRlcm5hbFBhcnNlciwgcHJpbnRDb2xvcnMsIGxvZ2dlcik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEVuZGlhbigpOiBib29sZWFuIHtcclxuICByZXR1cm4gU1RSVUNUX0VORElBTjtcclxufVxyXG5cclxuZnVuY3Rpb24gc2V0QWxsb3dPdmVycmlkaW5nKHQ6IGJvb2xlYW4pOiBib29sZWFuIHtcclxuICByZXR1cm4gKG1hbmFnZXIuYWxsb3dPdmVycmlkaW5nID0gISF0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNSZWdpc3RlcmVkKGNsczogU3RydWN0YWJsZUNsYXNzKTogYm9vbGVhbiB7XHJcbiAgcmV0dXJuIG1hbmFnZXIuaXNSZWdpc3RlcmVkKGNscyk7XHJcbn1cclxuXHJcbi8qKiBSZWdpc3RlciBhIGNsYXNzIGlubGluZS5cclxuICpcclxuICogTm90ZTogTm8gbmVlZCB0byB1c2UgbnN0cnVjdGpzLmluaGVyaXQsXHJcbiAqIGluaGVyaXRhbmNlIGlzIGhhbmRsZWQgZm9yIHlvdS4gIFVubGlrZVxyXG4gKiBuc3RydWN0anMuaW5oZXJpdCBmaWVsZHMgY2FuIGJlIHByb3Blcmx5XHJcbiAqIG92ZXJyaWRkZW4gaW4gdGhlIGNoaWxkIGNsYXNzIHdpdGhvdXRcclxuICogYmVpbmcgd3JpdHRlbiB0d2ljZS5cclxuICpcclxuICogY2xhc3MgVGVzdCB7XHJcbiAqICB0ZXN0ID0gMDtcclxuICpcclxuICogIHN0YXRpYyBTVFJVQ1QgPSBuc3RydWN0anMuaW5saW5lUmVnaXN0ZXIodGhpcywgYFxyXG4gKiAgbmFtZXNwYWNlLlRlc3Qge1xyXG4gKiAgICB0ZXN0IDogaW50O1xyXG4gKiAgfVxyXG4gKiAgYCk7XHJcbiAqIH1cclxuICoqL1xyXG5mdW5jdGlvbiBpbmxpbmVSZWdpc3RlcihjbHM6IFN0cnVjdGFibGVDbGFzcyB8IEZ1bmN0aW9uLCBzdHJ1Y3RTY3JpcHQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIG1hbmFnZXIuaW5saW5lUmVnaXN0ZXIoY2xzIGFzIFN0cnVjdGFibGVDbGFzcywgc3RydWN0U2NyaXB0KTtcclxufVxyXG5cclxuLyoqIFJlZ2lzdGVyIGEgY2xhc3Mgd2l0aCBuc3RydWN0anMgKiovXHJcbmZ1bmN0aW9uIHJlZ2lzdGVyKGNsczogU3RydWN0YWJsZUNsYXNzIHwgRnVuY3Rpb24sIHN0cnVjdE5hbWU/OiBzdHJpbmcpOiB2b2lkIHtcclxuICByZXR1cm4gbWFuYWdlci5yZWdpc3RlcihjbHMgYXMgU3RydWN0YWJsZUNsYXNzLCBzdHJ1Y3ROYW1lKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdW5yZWdpc3RlcihjbHM6IFN0cnVjdGFibGVDbGFzcyB8IEZ1bmN0aW9uKTogdm9pZCB7XHJcbiAgbWFuYWdlci51bnJlZ2lzdGVyKGNscyBhcyBTdHJ1Y3RhYmxlQ2xhc3MpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpbmhlcml0KGNoaWxkOiBTdHJ1Y3RhYmxlQ2xhc3MgfCBGdW5jdGlvbiwgcGFyZW50OiBTdHJ1Y3RhYmxlQ2xhc3MgfCBGdW5jdGlvbiwgc3RydWN0TmFtZT86IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIFNUUlVDVC5pbmhlcml0KFxyXG4gICAgY2hpbGQgYXMgU3RydWN0YWJsZUNsYXNzLFxyXG4gICAgcGFyZW50IGFzIFN0cnVjdGFibGVDbGFzcyxcclxuICAgIHN0cnVjdE5hbWUgPz8gKGNoaWxkIGFzIFN0cnVjdGFibGVDbGFzcykubmFtZVxyXG4gICk7XHJcbn1cclxuXHJcbi8qKlxyXG4gQHBhcmFtIGRhdGEgOiBEYXRhVmlld1xyXG4gKi9cclxuZnVuY3Rpb24gcmVhZE9iamVjdChcclxuICBkYXRhOiBEYXRhVmlldyB8IFVpbnQ4QXJyYXkgfCBVaW50OENsYW1wZWRBcnJheSB8IG51bWJlcltdLFxyXG4gIGNsczogU3RydWN0YWJsZUNsYXNzIHwgbnVtYmVyLFxyXG4gIF9fdWN0eD86IHVucGFja19jb250ZXh0XHJcbik6IHVua25vd24ge1xyXG4gIHJldHVybiBtYW5hZ2VyLnJlYWRPYmplY3QoZGF0YSwgY2xzLCBfX3VjdHgpO1xyXG59XHJcblxyXG4vKipcclxuIEBwYXJhbSBkYXRhIDogQXJyYXkgaW5zdGFuY2UgdG8gd3JpdGUgYnl0ZXMgdG9cclxuICovXHJcbmZ1bmN0aW9uIHdyaXRlT2JqZWN0KGRhdGE6IG51bWJlcltdLCBvYmo6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogbnVtYmVyW10ge1xyXG4gIHJldHVybiBtYW5hZ2VyLndyaXRlT2JqZWN0KGRhdGEsIG9iaik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHdyaXRlSlNPTihvYmo6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xyXG4gIHJldHVybiBtYW5hZ2VyLndyaXRlSlNPTihvYmopO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmb3JtYXRKU09OKFxyXG4gIGpzb246IHVua25vd24sXHJcbiAgY2xzOiBTdHJ1Y3RhYmxlQ2xhc3MsXHJcbiAgYWRkQ29tbWVudHM6IGJvb2xlYW4gPSB0cnVlLFxyXG4gIHZhbGlkYXRlOiBib29sZWFuID0gdHJ1ZVxyXG4pOiBzdHJpbmcge1xyXG4gIHJldHVybiBtYW5hZ2VyLmZvcm1hdEpTT04oanNvbiwgY2xzLCBhZGRDb21tZW50cywgdmFsaWRhdGUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZWFkSlNPTihqc29uOiB1bmtub3duLCBjbGFzc19vcl9zdHJ1Y3RfaWQ6IFN0cnVjdGFibGVDbGFzcyB8IE5TdHJ1Y3QgfCBudW1iZXIpOiB1bmtub3duIHtcclxuICByZXR1cm4gbWFuYWdlci5yZWFkSlNPTihqc29uLCBjbGFzc19vcl9zdHJ1Y3RfaWQpO1xyXG59XHJcblxyXG5leHBvcnQge1xyXG4gIEpTT05FcnJvcixcclxuICBTVFJVQ1QsXHJcbiAgX3RydW5jYXRlRG9sbGFyU2lnbixcclxuICBzdHJ1Y3RfYmlucGFjayBhcyBiaW5wYWNrLFxyXG4gIGNvbnNvbGVMb2dnZXIsXHJcbiAgZGVyaXZlU3RydWN0TWFuYWdlcixcclxuICBzdHJ1Y3RfZmlsZWhlbHBlciBhcyBmaWxlaGVscGVyLFxyXG4gIGZvcm1hdEpTT04sXHJcbiAgZ2V0RW5kaWFuLFxyXG4gIGluaGVyaXQsXHJcbiAgaW5saW5lUmVnaXN0ZXIsXHJcbiAgaXNSZWdpc3RlcmVkLFxyXG4gIG1hbmFnZXIsXHJcbiAgc3RydWN0X3BhcnNlciBhcyBwYXJzZXIsXHJcbiAgc3RydWN0X3BhcnNldXRpbCBhcyBwYXJzZXV0aWwsXHJcbiAgcmVhZEpTT04sXHJcbiAgcmVhZE9iamVjdCxcclxuICByZWdpc3RlcixcclxuICBzZXRBbGxvd092ZXJyaWRpbmcsXHJcbiAgc2V0RGVidWdNb2RlLFxyXG4gIHNldEVuZGlhbixcclxuICBzZXRUcnVuY2F0ZURvbGxhclNpZ24sXHJcbiAgc2V0V2FybmluZ01vZGUsXHJcbiAgdHJ1bmNhdGVEb2xsYXJTaWduLFxyXG4gIHN0cnVjdF90eXBlc3lzdGVtIGFzIHR5cGVzeXN0ZW0sXHJcbiAgdW5wYWNrX2NvbnRleHQsXHJcbiAgdW5yZWdpc3RlcixcclxuICB2YWxpZGF0ZUpTT04sXHJcbiAgdmFsaWRhdGVTdHJ1Y3RzLFxyXG4gIHdyaXRlSlNPTixcclxuICB3cml0ZU9iamVjdCxcclxuICB3cml0ZV9zY3JpcHRzLFxyXG59O1xyXG4iLCAiaW1wb3J0ICogYXMgbnN0cnVjdGpzIGZyb20gXCIuL25zdHJ1Y3Rqc19lczYuanNcIjtcclxuZXhwb3J0IGRlZmF1bHQgbnN0cnVjdGpzO1xyXG4iLCAiLy9AdHMtbm9jaGVjayBmb3Igbm93XHJcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSBcIi4vdXRpbFwiO1xyXG5pbXBvcnQgbnN0cnVjdGpzIGZyb20gXCIuL3N0cnVjdFwiO1xyXG5cclxuY29uc3QgdmVjUXVhdE11bHRzID0ge1xyXG4gIDI6IGAgICAgbXVsVmVjUXVhdChxOiBJUXVhdCkge1xyXG4gICAgICBsZXQgdDAgPSAtcVsxXSAqIHRoaXNbMF0gLSBxWzJdICogdGhpc1sxXTtcclxuICAgICAgbGV0IHQxID0gcVswXSAqIHRoaXNbMF0gLSBxWzNdICogdGhpc1sxXTtcclxuICAgICAgbGV0IHQyID0gcVswXSAqIHRoaXNbMV0gKyBxWzNdICogdGhpc1swXTtcclxuXHJcbiAgICAgIGxldCB6ID0gcVsxXSAqIHRoaXNbMV0gLSBxWzJdICogdGhpc1swXTtcclxuICAgICAgdGhpc1swXSA9IHQxO1xyXG4gICAgICB0aGlzWzFdID0gdDI7XHJcblxyXG4gICAgICB0MSA9IHQwICogLXFbMV0gKyB0aGlzWzBdICogcVswXSAtIHRoaXNbMV0gKiBxWzNdICsgeiAqIHFbMl07XHJcbiAgICAgIHQyID0gdDAgKiAtcVsyXSArIHRoaXNbMV0gKiBxWzBdIC0geiAqIHFbMV0gKyB0aGlzWzBdICogcVszXTtcclxuXHJcbiAgICAgIHRoaXNbMF0gPSB0MTtcclxuICAgICAgdGhpc1sxXSA9IHQyO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9YCxcclxuICAzOiBcIlwiLCAvLyBpcyBzZXQgYmVsb3dcclxuICA0OiBgICAgIG11bFZlY1F1YXQocTogSVF1YXQpIHtcclxuICAgICAgbGV0IHQwID0gLXFbMV0gKiB0aGlzWzBdIC0gcVsyXSAqIHRoaXNbMV0gLSBxWzNdICogdGhpc1syXTtcclxuICAgICAgbGV0IHQxID0gcVswXSAqIHRoaXNbMF0gKyBxWzJdICogdGhpc1syXSAtIHFbM10gKiB0aGlzWzFdO1xyXG4gICAgICBsZXQgdDIgPSBxWzBdICogdGhpc1sxXSArIHFbM10gKiB0aGlzWzBdIC0gcVsxXSAqIHRoaXNbMl07XHJcblxyXG4gICAgICB0aGlzWzJdID0gcVswXSAqIHRoaXNbMl0gKyBxWzFdICogdGhpc1sxXSAtIHFbMl0gKiB0aGlzWzBdO1xyXG4gICAgICB0aGlzWzBdID0gdDE7XHJcbiAgICAgIHRoaXNbMV0gPSB0MjtcclxuXHJcbiAgICAgIHQxID0gdDAgKiAtcVsxXSArIHRoaXNbMF0gKiBxWzBdIC0gdGhpc1sxXSAqIHFbM10gKyB0aGlzWzJdICogcVsyXTtcclxuICAgICAgdDIgPSB0MCAqIC1xWzJdICsgdGhpc1sxXSAqIHFbMF0gLSB0aGlzWzJdICogcVsxXSArIHRoaXNbMF0gKiBxWzNdO1xyXG5cclxuICAgICAgdGhpc1syXSA9IHQwICogLXFbM10gKyB0aGlzWzJdICogcVswXSAtIHRoaXNbMF0gKiBxWzJdICsgdGhpc1sxXSAqIHFbMV07XHJcbiAgICAgIHRoaXNbMF0gPSB0MTtcclxuICAgICAgdGhpc1sxXSA9IHQyO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbmAsXHJcbn07XHJcbnZlY1F1YXRNdWx0c1szXSA9IHZlY1F1YXRNdWx0c1s0XTtcclxuXHJcbmNvbnN0IG1hdHJpeFZlY011bHRzID0ge1xyXG4gIDI6IGAvKiogUmV0dXJucyB3IHZhbHVlLiAqL1xcbiAgICBtdWx0VmVjTWF0cml4KG1hdHJpeDogTWF0cml4NCwgaWdub3JlX3cgPSBmYWxzZSkge1xyXG4gICAgICBjb25zdCB4ID0gdGhpc1swXTtcclxuICAgICAgY29uc3QgeSA9IHRoaXNbMV07XHJcbiAgICAgIGNvbnN0IHcgPSAxLjA7XHJcblxyXG4gICAgICB0aGlzWzBdID0gdyAqIG1hdHJpeC4kbWF0cml4Lm00MSArIHggKiBtYXRyaXguJG1hdHJpeC5tMTEgKyB5ICogbWF0cml4LiRtYXRyaXgubTIxO1xyXG4gICAgICB0aGlzWzFdID0gdyAqIG1hdHJpeC4kbWF0cml4Lm00MiArIHggKiBtYXRyaXguJG1hdHJpeC5tMTIgKyB5ICogbWF0cml4LiRtYXRyaXgubTIyO1xyXG5cclxuICAgICAgaWYgKCFpZ25vcmVfdyAmJiBtYXRyaXguaXNQZXJzcCkge1xyXG4gICAgICAgIGxldCB3MiA9IHcgKiBtYXRyaXguJG1hdHJpeC5tNDQgKyB4ICogbWF0cml4LiRtYXRyaXgubTE0ICsgeSAqIG1hdHJpeC4kbWF0cml4Lm0yNDtcclxuXHJcbiAgICAgICAgaWYgKHcyICE9PSAwLjApIHtcclxuICAgICAgICAgIHRoaXNbMF0gLz0gdzI7XHJcbiAgICAgICAgICB0aGlzWzFdIC89IHcyO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbiAgYCxcclxuICAzOiBgLyoqIFJldHVybnMgdyB2YWx1ZS4gKi9cXG4gICAgICBtdWx0VmVjTWF0cml4KG1hdHJpeDogTWF0cml4NCwgaWdub3JlX3cgPSBmYWxzZSkge1xyXG4gICAgICBpZiAoaWdub3JlX3cgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGlnbm9yZV93ID0gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgICAgbGV0IHggPSB0aGlzWzBdO1xyXG4gICAgICBsZXQgeSA9IHRoaXNbMV07XHJcbiAgICAgIGxldCB6ID0gdGhpc1syXTtcclxuICAgICAgdGhpc1swXSA9IG1hdHJpeC4kbWF0cml4Lm00MSArIHgqbWF0cml4LiRtYXRyaXgubTExICsgeSptYXRyaXguJG1hdHJpeC5tMjEgKyB6Km1hdHJpeC4kbWF0cml4Lm0zMTtcclxuICAgICAgdGhpc1sxXSA9IG1hdHJpeC4kbWF0cml4Lm00MiArIHgqbWF0cml4LiRtYXRyaXgubTEyICsgeSptYXRyaXguJG1hdHJpeC5tMjIgKyB6Km1hdHJpeC4kbWF0cml4Lm0zMjtcclxuICAgICAgdGhpc1syXSA9IG1hdHJpeC4kbWF0cml4Lm00MyArIHgqbWF0cml4LiRtYXRyaXgubTEzICsgeSptYXRyaXguJG1hdHJpeC5tMjMgKyB6Km1hdHJpeC4kbWF0cml4Lm0zMztcclxuICAgICAgbGV0IHcgPSBtYXRyaXguJG1hdHJpeC5tNDQgKyB4Km1hdHJpeC4kbWF0cml4Lm0xNCArIHkqbWF0cml4LiRtYXRyaXgubTI0ICsgeiptYXRyaXguJG1hdHJpeC5tMzQ7XHJcblxyXG4gICAgICBpZiAoIWlnbm9yZV93ICYmIHcgIT09IDEgJiYgdyAhPT0gMCAmJiBtYXRyaXguaXNQZXJzcCkge1xyXG4gICAgICAgIHRoaXNbMF0gLz0gdztcclxuICAgICAgICB0aGlzWzFdIC89IHc7XHJcbiAgICAgICAgdGhpc1syXSAvPSB3O1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB3O1xyXG4gICAgfWAsXHJcbiAgNDogYC8qKiBSZXR1cm5zIHcgdmFsdWUuICovXFxuICAgIG11bHRWZWNNYXRyaXgobWF0cml4OiBNYXRyaXg0KTogbnVtYmVyIHtcclxuICAgICAgbGV0IHggPSB0aGlzWzBdO1xyXG4gICAgICBsZXQgeSA9IHRoaXNbMV07XHJcbiAgICAgIGxldCB6ID0gdGhpc1syXTtcclxuICAgICAgbGV0IHcgPSB0aGlzWzNdO1xyXG5cclxuICAgICAgdGhpc1swXSA9IHcgKiBtYXRyaXguJG1hdHJpeC5tNDEgKyB4ICogbWF0cml4LiRtYXRyaXgubTExICsgeSAqIG1hdHJpeC4kbWF0cml4Lm0yMSArIHogKiBtYXRyaXguJG1hdHJpeC5tMzE7XHJcbiAgICAgIHRoaXNbMV0gPSB3ICogbWF0cml4LiRtYXRyaXgubTQyICsgeCAqIG1hdHJpeC4kbWF0cml4Lm0xMiArIHkgKiBtYXRyaXguJG1hdHJpeC5tMjIgKyB6ICogbWF0cml4LiRtYXRyaXgubTMyO1xyXG4gICAgICB0aGlzWzJdID0gdyAqIG1hdHJpeC4kbWF0cml4Lm00MyArIHggKiBtYXRyaXguJG1hdHJpeC5tMTMgKyB5ICogbWF0cml4LiRtYXRyaXgubTIzICsgeiAqIG1hdHJpeC4kbWF0cml4Lm0zMztcclxuICAgICAgdGhpc1szXSA9IHcgKiBtYXRyaXguJG1hdHJpeC5tNDQgKyB4ICogbWF0cml4LiRtYXRyaXgubTE0ICsgeSAqIG1hdHJpeC4kbWF0cml4Lm0yNCArIHogKiBtYXRyaXguJG1hdHJpeC5tMzQ7XHJcblxyXG4gICAgICByZXR1cm4gdGhpc1szXTtcclxuICAgIH1cclxuYCxcclxufTtcclxuXHJcbmxldCBET1RfTk9STV9TTkFQX0xJTUlUID0gMC4wMDAwMDAwMDAwMTtcclxubGV0IE1fU1FSVDIgPSBNYXRoLnNxcnQoMi4wKTtcclxubGV0IEZMVF9FUFNJTE9OID0gMi4yMmUtMTY7XHJcblxyXG5sZXQgYmFzaWNfZnVuY3MgPSB7XHJcbiAgZXF1YWxzICAgOiBbW1widmJcIl0sIFwidGhpc1tYXSA9PT0gYltYXVwiLCBcIiYmXCJdLFxyXG4gIC8qZG90IGlzIG1hZGUgbWFudWFsbHkgc28gaXQncyBzYWZlIGZvciBhY29zXHJcbiAgZG90ICAgICA6IFtbXCJiXCJdLCBcInRoaXNbWF0qYltYXVwiLCBcIitcIl0sXHJcbiAgICovXHJcbiAgemVybyAgICAgOiBbW10sIFwiMC4wXCJdLFxyXG4gIG5lZ2F0ZSAgIDogW1tdLCBcIi10aGlzW1hdXCJdLFxyXG4gIGNvbWJpbmUgIDogW1tcInZiXCIsIFwidVwiLCBcInZcIl0sIFwidGhpc1tYXSp1ICsgYltYXSp2XCJdLFxyXG4gIGludGVycCAgIDogW1tcInZiXCIsIFwidFwiXSwgXCJ0aGlzW1hdICsgKGJbWF0gLSB0aGlzW1hdKSp0XCJdLFxyXG4gIGFkZCAgICAgIDogW1tcInZiXCJdLCBcInRoaXNbWF0gKyBiW1hdXCJdLFxyXG4gIGFkZEZhYyAgIDogW1tcInZiXCIsIFwiRlwiXSwgXCJ0aGlzW1hdICsgYltYXSpGXCJdLFxyXG4gIGZyYWN0ICAgIDogW1tdLCBcIk1hdGguZnJhY3QodGhpc1tYXSlcIl0sXHJcbiAgc3ViICAgICAgOiBbW1widmJcIl0sIFwidGhpc1tYXSAtIGJbWF1cIl0sXHJcbiAgbXVsICAgICAgOiBbW1widmJcIl0sIFwidGhpc1tYXSAqIGJbWF1cIl0sXHJcbiAgZGl2ICAgICAgOiBbW1widmJcIl0sIFwidGhpc1tYXSAvIGJbWF1cIl0sXHJcbiAgbXVsU2NhbGFyOiBbW1wiYlwiXSwgXCJ0aGlzW1hdICogYlwiXSxcclxuICBkaXZTY2FsYXI6IFtbXCJiXCJdLCBcInRoaXNbWF0gLyBiXCJdLFxyXG4gIGFkZFNjYWxhcjogW1tcImJcIl0sIFwidGhpc1tYXSArIGJcIl0sXHJcbiAgc3ViU2NhbGFyOiBbW1wiYlwiXSwgXCJ0aGlzW1hdIC0gYlwiXSxcclxuICBtaW5TY2FsYXI6IFtbXCJiXCJdLCBcIk1hdGgubWluKHRoaXNbWF0sIGIpXCJdLFxyXG4gIG1heFNjYWxhcjogW1tcImJcIl0sIFwiTWF0aC5tYXgodGhpc1tYXSwgYilcIl0sXHJcbiAgY2VpbCAgICAgOiBbW10sIFwiTWF0aC5jZWlsKHRoaXNbWF0pXCJdLFxyXG4gIGZsb29yICAgIDogW1tdLCBcIk1hdGguZmxvb3IodGhpc1tYXSlcIl0sXHJcbiAgYWJzICAgICAgOiBbW10sIFwiTWF0aC5hYnModGhpc1tYXSlcIl0sXHJcbiAgbWluICAgICAgOiBbW1widmJcIl0sIFwiTWF0aC5taW4odGhpc1tYXSwgYltYXSlcIl0sXHJcbiAgbWF4ICAgICAgOiBbW1widmJcIl0sIFwiTWF0aC5tYXgodGhpc1tYXSwgYltYXSlcIl0sXHJcbiAgY2xhbXAgICAgOiBbW1wiTUlOXCIsIFwiTUFYXCJdLCBcIk1hdGgubWluKE1hdGgubWF4KHRoaXNbWF0sIE1BWCksIE1JTilcIl0sXHJcbn07XHJcblxyXG5mdW5jdGlvbiBib3VuZGVkX2Fjb3MoZmFjKSB7XHJcbiAgaWYgKGZhYyA8PSAtMS4wKSByZXR1cm4gTWF0aC5QSTtcclxuICBlbHNlIGlmIChmYWMgPj0gMS4wKSByZXR1cm4gMC4wO1xyXG4gIGVsc2UgcmV0dXJuIE1hdGguYWNvcyhmYWMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtYWtlX25vcm1fc2FmZV9kb3QoY2xzKSB7XHJcbiAgbGV0IF9kb3QgPSBjbHMucHJvdG90eXBlLmRvdDtcclxuXHJcbiAgY2xzLnByb3RvdHlwZS5fZG90ID0gX2RvdDtcclxuICBjbHMucHJvdG90eXBlLmRvdCA9IGZ1bmN0aW9uIChiKSB7XHJcbiAgICBsZXQgcmV0ID0gX2RvdC5jYWxsKHRoaXMsIGIpO1xyXG5cclxuICAgIGlmIChyZXQgPj0gMS4wIC0gRE9UX05PUk1fU05BUF9MSU1JVCAmJiByZXQgPD0gMS4wICsgRE9UX05PUk1fU05BUF9MSU1JVCkgcmV0dXJuIDEuMDtcclxuICAgIGlmIChyZXQgPj0gLTEuMCAtIERPVF9OT1JNX1NOQVBfTElNSVQgJiYgcmV0IDw9IC0xLjAgKyBET1RfTk9STV9TTkFQX0xJTUlUKSByZXR1cm4gLTEuMDtcclxuXHJcbiAgICByZXR1cm4gcmV0O1xyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEJhc2VWZWN0b3IocGFyZW50KSB7XHJcbiAgcmV0dXJuIGNsYXNzIEJhc2VWZWN0b3IgZXh0ZW5kcyBwYXJlbnQge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgIHN1cGVyKC4uLmFyZ3VtZW50cyk7XHJcblxyXG4gICAgICB0aGlzLnZlYyA9IHVuZGVmaW5lZDsgLy9mb3IgY29tcGF0aWJpbGl0eSB3aXRoIG9sZCBuc3RydWN0anMtc2F2ZWQgZmlsZXNcclxuXHJcbiAgICAgIC8vdGhpcy54eXp3ID0gdGhpcy5pbml0X3N3aXp6bGUoNCk7XHJcbiAgICAgIC8vdGhpcy54eXogPSB0aGlzLmluaXRfc3dpenpsZSgzKTtcclxuICAgICAgLy90aGlzLnh5ID0gdGhpcy5pbml0X3N3aXp6bGUoMik7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGluaGVyaXQoY2xzLCB2ZWN0b3JzaXplKSB7XHJcbiAgICAgIG1ha2Vfbm9ybV9zYWZlX2RvdChjbHMpO1xyXG5cclxuICAgICAgdmFyIGY7XHJcblxyXG4gICAgICBsZXQgdmVjdG9yRG90RGlzdGFuY2UgPSBcImYgPSBmdW5jdGlvbiB2ZWN0b3JEb3REaXN0YW5jZShiKSB7XFxuXCI7XHJcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdmVjdG9yc2l6ZTsgaSsrKSB7XHJcbiAgICAgICAgdmVjdG9yRG90RGlzdGFuY2UgKz0gXCIgIGxldCBkXCIgKyBpICsgXCIgPSB0aGlzW1wiICsgaSArIFwiXS1iW1wiICsgaSArIFwiXTtcXG5cXG4gIFwiO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB2ZWN0b3JEb3REaXN0YW5jZSArPSBcIiAgcmV0dXJuIFwiO1xyXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZlY3RvcnNpemU7IGkrKykge1xyXG4gICAgICAgIGlmIChpID4gMCkgdmVjdG9yRG90RGlzdGFuY2UgKz0gXCIgKyBcIjtcclxuICAgICAgICB2ZWN0b3JEb3REaXN0YW5jZSArPSBcImRcIiArIGkgKyBcIipkXCIgKyBpO1xyXG4gICAgICB9XHJcbiAgICAgIHZlY3RvckRvdERpc3RhbmNlICs9IFwiO1xcblwiO1xyXG4gICAgICB2ZWN0b3JEb3REaXN0YW5jZSArPSBcIn07XCI7XHJcbiAgICAgIGNscy5wcm90b3R5cGUudmVjdG9yRG90RGlzdGFuY2UgPSBldmFsKHZlY3RvckRvdERpc3RhbmNlKTtcclxuXHJcbiAgICAgIGxldCB2ZWN0b3JEaXN0YW5jZSA9IFwiZiA9IGZ1bmN0aW9uIHZlY3RvckRpc3RhbmNlKGIpIHtcXG5cIjtcclxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2ZWN0b3JzaXplOyBpKyspIHtcclxuICAgICAgICB2ZWN0b3JEaXN0YW5jZSArPSBgICBsZXQgZCR7aX0gPSB0aGlzWyR7aX1dIC0gKGJbJHtpfV18fDApO1xcblxcbiAgYDtcclxuICAgICAgICAvL3ZlY3RvckRpc3RhbmNlICs9IFwiICBsZXQgZFwiK2krXCIgPSB0aGlzW1wiK2krXCJdLShiW1wiK2krXCJdfHwwKTtcXG5cXG4gIFwiO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB2ZWN0b3JEaXN0YW5jZSArPSBcIiAgcmV0dXJuIE1hdGguc3FydChcIjtcclxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2ZWN0b3JzaXplOyBpKyspIHtcclxuICAgICAgICBpZiAoaSA+IDApIHZlY3RvckRpc3RhbmNlICs9IFwiICsgXCI7XHJcbiAgICAgICAgdmVjdG9yRGlzdGFuY2UgKz0gXCJkXCIgKyBpICsgXCIqZFwiICsgaTtcclxuICAgICAgfVxyXG4gICAgICB2ZWN0b3JEaXN0YW5jZSArPSBcIik7XFxuXCI7XHJcbiAgICAgIHZlY3RvckRpc3RhbmNlICs9IFwifTtcIjtcclxuICAgICAgY2xzLnByb3RvdHlwZS52ZWN0b3JEaXN0YW5jZSA9IGV2YWwodmVjdG9yRGlzdGFuY2UpO1xyXG5cclxuICAgICAgbGV0IHZlY3RvckRpc3RhbmNlU3FyID0gXCJmID0gZnVuY3Rpb24gdmVjdG9yRGlzdGFuY2VTcXIoYikge1xcblwiO1xyXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZlY3RvcnNpemU7IGkrKykge1xyXG4gICAgICAgIHZlY3RvckRpc3RhbmNlU3FyICs9IGAgIGxldCBkJHtpfSA9IHRoaXNbJHtpfV0gLSAoYlske2l9XXx8MCk7XFxuXFxuICBgO1xyXG4gICAgICAgIC8vdmVjdG9yRGlzdGFuY2VTcXIgKz0gXCIgIGxldCBkXCIraStcIiA9IHRoaXNbXCIraStcIl0tKGJbXCIraStcIl18fDApO1xcblxcbiAgXCI7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZlY3RvckRpc3RhbmNlU3FyICs9IFwiICByZXR1cm4gKFwiO1xyXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZlY3RvcnNpemU7IGkrKykge1xyXG4gICAgICAgIGlmIChpID4gMCkgdmVjdG9yRGlzdGFuY2VTcXIgKz0gXCIgKyBcIjtcclxuICAgICAgICB2ZWN0b3JEaXN0YW5jZVNxciArPSBcImRcIiArIGkgKyBcIipkXCIgKyBpO1xyXG4gICAgICB9XHJcbiAgICAgIHZlY3RvckRpc3RhbmNlU3FyICs9IFwiKTtcXG5cIjtcclxuICAgICAgdmVjdG9yRGlzdGFuY2VTcXIgKz0gXCJ9O1wiO1xyXG4gICAgICBjbHMucHJvdG90eXBlLnZlY3RvckRpc3RhbmNlU3FyID0gZXZhbCh2ZWN0b3JEaXN0YW5jZVNxcik7XHJcblxyXG4gICAgICBmb3IgKGxldCBrIGluIGJhc2ljX2Z1bmNzKSB7XHJcbiAgICAgICAgbGV0IGZ1bmMgPSBiYXNpY19mdW5jc1trXTtcclxuICAgICAgICBsZXQgYXJncyA9IGZ1bmNbMF07XHJcbiAgICAgICAgbGV0IGxpbmUgPSBmdW5jWzFdO1xyXG4gICAgICAgIHZhciBmO1xyXG5cclxuICAgICAgICBsZXQgY29kZSA9IFwiZiA9IGZ1bmN0aW9uIFwiICsgayArIFwiKFwiO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgaWYgKGkgPiAwKSBjb2RlICs9IFwiLCBcIjtcclxuXHJcbiAgICAgICAgICBsaW5lID0gbGluZS5yZXBsYWNlKGFyZ3NbaV0sIGFyZ3NbaV0udG9Mb3dlckNhc2UoKSk7XHJcbiAgICAgICAgICBjb2RlICs9IGFyZ3NbaV0udG9Mb3dlckNhc2UoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29kZSArPSBcIikge1xcblwiO1xyXG5cclxuICAgICAgICBpZiAoZnVuYy5sZW5ndGggPiAyKSB7XHJcbiAgICAgICAgICAvL21ha2Ugc3VtbWF0aW9uXHJcbiAgICAgICAgICBjb2RlICs9IFwiICByZXR1cm4gXCI7XHJcblxyXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2ZWN0b3JzaXplOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKGkgPiAwKSBjb2RlICs9IGZ1bmNbMl07XHJcblxyXG4gICAgICAgICAgICBjb2RlICs9IFwiKFwiICsgbGluZS5yZXBsYWNlKC9YL2csIFwiXCIgKyBpKSArIFwiKVwiO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgY29kZSArPSBcIjtcXG5cIjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2ZWN0b3JzaXplOyBpKyspIHtcclxuICAgICAgICAgICAgbGV0IGxpbmUyID0gbGluZS5yZXBsYWNlKC9YL2csIFwiXCIgKyBpKTtcclxuICAgICAgICAgICAgY29kZSArPSBcIiAgdGhpc1tcIiArIGkgKyBcIl0gPSBcIiArIGxpbmUyICsgXCI7XFxuXCI7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBjb2RlICs9IFwiICByZXR1cm4gdGhpcztcXG5cIjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvZGUgKz0gXCJ9XFxuXCI7XHJcblxyXG4gICAgICAgIC8vY29uc29sZS5sb2coY29kZSk7XHJcbiAgICAgICAgZiA9IGV2YWwoY29kZSk7XHJcblxyXG4gICAgICAgIGNscy5wcm90b3R5cGVba10gPSBmO1xyXG4gICAgICAgIC8vY29uc29sZS5sb2coaywgZik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb3B5KCkge1xyXG4gICAgICByZXR1cm4gbmV3IHRoaXMuY29uc3RydWN0b3IodGhpcyk7XHJcbiAgICB9XHJcblxyXG4gICAgbG9hZChkYXRhKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkltcGxlbWVudCBtZSFcIik7XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdF9zd2l6emxlKHNpemUpIHtcclxuICAgICAgbGV0IHJldCA9IHt9O1xyXG4gICAgICBsZXQgY2xzID0gc2l6ZSA9PT0gNCA/IFZlY3RvcjQgOiBzaXplID09PSAzID8gVmVjdG9yMyA6IFZlY3RvcjI7XHJcblxyXG4gICAgICBmb3IgKGxldCBrIGluIGNscy5wcm90b3R5cGUpIHtcclxuICAgICAgICBsZXQgdiA9IGNscy5wcm90b3R5cGVba107XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2ICE9PSBcImZ1bmN0aW9uXCIgJiYgISh2IGluc3RhbmNlb2YgRnVuY3Rpb24pKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgcmV0W2tdID0gdi5iaW5kKHRoaXMpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gcmV0O1xyXG4gICAgfVxyXG5cclxuICAgIHZlY3Rvckxlbmd0aCgpIHtcclxuICAgICAgcmV0dXJuIHNxcnQodGhpcy5kb3QodGhpcykpO1xyXG4gICAgfVxyXG5cclxuICAgIHN3YXBBeGVzKGF4aXMxLCBheGlzMikge1xyXG4gICAgICBsZXQgdCA9IHRoaXNbYXhpczFdO1xyXG4gICAgICB0aGlzW2F4aXMxXSA9IHRoaXNbYXhpczJdO1xyXG4gICAgICB0aGlzW2F4aXMyXSA9IHQ7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBzaW50ZXJwKHYyLCB0KSB7XHJcbiAgICAgIGxldCBsMSA9IHRoaXMudmVjdG9yTGVuZ3RoKCk7XHJcbiAgICAgIGxldCBsMiA9IHYyLnZlY3Rvckxlbmd0aCgpO1xyXG5cclxuICAgICAgLy9YWFggdGhpcyBzZWVtcyBob3JyaWJseSBpbmNvcnJlY3QuXHJcbiAgICAgIHJldHVybiB0aGlzLmludGVycCh2MiwgdClcclxuICAgICAgICAubm9ybWFsaXplKClcclxuICAgICAgICAubXVsU2NhbGFyKGwxICsgKGwyIC0gbDEpICogdCk7XHJcbiAgICB9XHJcblxyXG4gICAgcGVycFN3YXAoYXhpczEgPSAwLCBheGlzMiA9IDEsIHNpZ24gPSAxKSB7XHJcbiAgICAgIGxldCB0bXAgPSB0aGlzW2F4aXMxXTtcclxuXHJcbiAgICAgIHRoaXNbYXhpczFdID0gdGhpc1theGlzMl0gKiBzaWduO1xyXG4gICAgICB0aGlzW2F4aXMyXSA9IC10bXAgKiBzaWduO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgbm9ybWFsaXplKCkge1xyXG4gICAgICAvKlxyXG4gICAgICBmb3IgKGxldCBpPTA7IGk8dGhpcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlmICh1dGlsLmlzRGVub3JtYWwodGhpc1tpXSkpIHtcclxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJEZW5vcm1hbCBlcnJvclwiLCBpLCB0aGlzW2ldKTtcclxuICAgICAgICAgIHRoaXNbaV0gPSAwLjA7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIC8vKi9cclxuXHJcbiAgICAgIGxldCBsID0gdGhpcy52ZWN0b3JMZW5ndGgoKTtcclxuXHJcbiAgICAgIC8qXHJcbiAgICAgIGlmICh1dGlsLmlzRGVub3JtYWwobCkpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKFwiRGVub3JtYWwgZXJyb3JcIiwgbCk7XHJcbiAgICAgIH1cclxuICAgICAgLy8qL1xyXG5cclxuICAgICAgaWYgKGwgPiAwLjAwMDAwMDAxKSB7XHJcbiAgICAgICAgdGhpcy5tdWxTY2FsYXIoMS4wIC8gbCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG4gIH07XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBCYXNlVmVjdG9yID0gZ2V0QmFzZVZlY3RvcihBcnJheSk7XHJcbmV4cG9ydCBjb25zdCBGNjRCYXNlVmVjdG9yID0gZ2V0QmFzZVZlY3RvcihGbG9hdDY0QXJyYXkpO1xyXG5leHBvcnQgY29uc3QgRjMyQmFzZVZlY3RvciA9IGdldEJhc2VWZWN0b3IoRmxvYXQzMkFycmF5KTtcclxuZXhwb3J0IGNvbnN0IEkzMkJhc2VWZWN0b3IgPSBnZXRCYXNlVmVjdG9yKEludDMyQXJyYXkpO1xyXG5leHBvcnQgY29uc3QgSTE2QmFzZVZlY3RvciA9IGdldEJhc2VWZWN0b3IoSW50MTZBcnJheSk7XHJcbmV4cG9ydCBjb25zdCBJOEJhc2VWZWN0b3IgPSBnZXRCYXNlVmVjdG9yKEludDhBcnJheSk7XHJcbmV4cG9ydCBjb25zdCBVSTMyQmFzZVZlY3RvciA9IGdldEJhc2VWZWN0b3IoVWludDMyQXJyYXkpO1xyXG5leHBvcnQgY29uc3QgVUkxNkJhc2VWZWN0b3IgPSBnZXRCYXNlVmVjdG9yKFVpbnQxNkFycmF5KTtcclxuZXhwb3J0IGNvbnN0IFVJOEJhc2VWZWN0b3IgPSBnZXRCYXNlVmVjdG9yKFVpbnQ4QXJyYXkpO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VWZWN0b3I0KEJhc2VWZWN0b3IsIHN0cnVjdE5hbWUgPSBcInZlYzRcIiwgc3RydWN0VHlwZSA9IFwiZmxvYXRcIikge1xyXG4gIGxldCB0ZW1wMSwgdGVtcDIsIHRlbXAzLCB0ZW1wNDtcclxuXHJcbiAgY29uc3QgVmVjdG9yNCA9IGNsYXNzIFZlY3RvcjQgZXh0ZW5kcyBCYXNlVmVjdG9yIHtcclxuICAgIHN0YXRpYyBTVFJVQ1QgPSBuc3RydWN0anMuaW5saW5lUmVnaXN0ZXIoXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgIGBcclxuICAgICR7c3RydWN0TmFtZX0ge1xyXG4gICAgICAwIDogJHtzdHJ1Y3RUeXBlfTtcclxuICAgICAgMSA6ICR7c3RydWN0VHlwZX07XHJcbiAgICAgIDIgOiAke3N0cnVjdFR5cGV9O1xyXG4gICAgICAzIDogJHtzdHJ1Y3RUeXBlfTtcclxuICAgIH1gXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGRhdGEpIHtcclxuICAgICAgc3VwZXIoNCk7XHJcblxyXG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmV4cGVjdGVkIGFyZ3VtZW50XCIpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzWzBdID0gdGhpc1sxXSA9IHRoaXNbMl0gPSB0aGlzWzNdID0gMC4wO1xyXG5cclxuICAgICAgaWYgKGRhdGEgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHRoaXMubG9hZChkYXRhKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRvQ1NTKCkge1xyXG4gICAgICBsZXQgciA9IH5+KHRoaXNbMF0gKiAyNTUpO1xyXG4gICAgICBsZXQgZyA9IH5+KHRoaXNbMV0gKiAyNTUpO1xyXG4gICAgICBsZXQgYiA9IH5+KHRoaXNbMl0gKiAyNTUpO1xyXG4gICAgICBsZXQgYSA9IHRoaXNbM107XHJcbiAgICAgIHJldHVybiBgcmdiYSgke3J9LCR7Z30sJHtifSwke2F9KWA7XHJcbiAgICB9XHJcblxyXG4gICAgbG9hZDIoYikge1xyXG4gICAgICB0aGlzWzBdID0gYlswXTtcclxuICAgICAgdGhpc1sxXSA9IGJbMV07XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG4gICAgbG9hZDMoYikge1xyXG4gICAgICB0aGlzWzBdID0gYlswXTtcclxuICAgICAgdGhpc1sxXSA9IGJbMV07XHJcbiAgICAgIHRoaXNbMl0gPSBiWzJdO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBsb2FkWFlaVyh4LCB5LCB6LCB3KSB7XHJcbiAgICAgIHRoaXNbMF0gPSB4O1xyXG4gICAgICB0aGlzWzFdID0geTtcclxuICAgICAgdGhpc1syXSA9IHo7XHJcbiAgICAgIHRoaXNbM10gPSB3O1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgbG9hZFhZWih4LCB5LCB6KSB7XHJcbiAgICAgIHRoaXNbMF0gPSB4O1xyXG4gICAgICB0aGlzWzFdID0geTtcclxuICAgICAgdGhpc1syXSA9IHo7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgbm9ybWFsaXplZERvdDQodjEsIHYyLCB2MywgdjQpIHtcclxuICAgICAgdGVtcDEubG9hZCh2Mikuc3ViKHYxKS5ub3JtYWxpemUoKTtcclxuICAgICAgdGVtcDIubG9hZCh2NCkuc3ViKHYzKS5ub3JtYWxpemUoKTtcclxuXHJcbiAgICAgIHJldHVybiB0ZW1wMS5kb3QodGVtcDIpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBub3JtYWxpemVkRG90Myh2MSwgY2VudGVyLCB2Mikge1xyXG4gICAgICB0ZW1wMS5sb2FkKHYxKS5zdWIoY2VudGVyKS5ub3JtYWxpemUoKTtcclxuICAgICAgdGVtcDIubG9hZCh2Mikuc3ViKGNlbnRlcikubm9ybWFsaXplKCk7XHJcblxyXG4gICAgICByZXR1cm4gdGVtcDEuZG90KHRlbXAyKTtcclxuICAgIH1cclxuXHJcbiAgICBsb2FkKGRhdGEpIHtcclxuICAgICAgaWYgKGRhdGEgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXM7XHJcblxyXG4gICAgICB0aGlzWzBdID0gZGF0YVswXTtcclxuICAgICAgdGhpc1sxXSA9IGRhdGFbMV07XHJcbiAgICAgIHRoaXNbMl0gPSBkYXRhWzJdO1xyXG4gICAgICB0aGlzWzNdID0gZGF0YVszXTtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIGRvdChiKSB7XHJcbiAgICAgIHJldHVybiB0aGlzWzBdICogYlswXSArIHRoaXNbMV0gKiBiWzFdICsgdGhpc1syXSAqIGJbMl0gKyB0aGlzWzNdICogYlszXTtcclxuICAgIH1cclxuXHJcbiAgICBtdWxWZWNRdWF0KHEpIHtcclxuICAgICAgbGV0IHQwID0gLXFbMV0gKiB0aGlzWzBdIC0gcVsyXSAqIHRoaXNbMV0gLSBxWzNdICogdGhpc1syXTtcclxuICAgICAgbGV0IHQxID0gcVswXSAqIHRoaXNbMF0gKyBxWzJdICogdGhpc1syXSAtIHFbM10gKiB0aGlzWzFdO1xyXG4gICAgICBsZXQgdDIgPSBxWzBdICogdGhpc1sxXSArIHFbM10gKiB0aGlzWzBdIC0gcVsxXSAqIHRoaXNbMl07XHJcblxyXG4gICAgICB0aGlzWzJdID0gcVswXSAqIHRoaXNbMl0gKyBxWzFdICogdGhpc1sxXSAtIHFbMl0gKiB0aGlzWzBdO1xyXG4gICAgICB0aGlzWzBdID0gdDE7XHJcbiAgICAgIHRoaXNbMV0gPSB0MjtcclxuXHJcbiAgICAgIHQxID0gdDAgKiAtcVsxXSArIHRoaXNbMF0gKiBxWzBdIC0gdGhpc1sxXSAqIHFbM10gKyB0aGlzWzJdICogcVsyXTtcclxuICAgICAgdDIgPSB0MCAqIC1xWzJdICsgdGhpc1sxXSAqIHFbMF0gLSB0aGlzWzJdICogcVsxXSArIHRoaXNbMF0gKiBxWzNdO1xyXG5cclxuICAgICAgdGhpc1syXSA9IHQwICogLXFbM10gKyB0aGlzWzJdICogcVswXSAtIHRoaXNbMF0gKiBxWzJdICsgdGhpc1sxXSAqIHFbMV07XHJcbiAgICAgIHRoaXNbMF0gPSB0MTtcclxuICAgICAgdGhpc1sxXSA9IHQyO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgbXVsdFZlY01hdHJpeChtYXRyaXgpIHtcclxuICAgICAgbGV0IHggPSB0aGlzWzBdO1xyXG4gICAgICBsZXQgeSA9IHRoaXNbMV07XHJcbiAgICAgIGxldCB6ID0gdGhpc1syXTtcclxuICAgICAgbGV0IHcgPSB0aGlzWzNdO1xyXG5cclxuICAgICAgdGhpc1swXSA9IHcgKiBtYXRyaXguJG1hdHJpeC5tNDEgKyB4ICogbWF0cml4LiRtYXRyaXgubTExICsgeSAqIG1hdHJpeC4kbWF0cml4Lm0yMSArIHogKiBtYXRyaXguJG1hdHJpeC5tMzE7XHJcbiAgICAgIHRoaXNbMV0gPSB3ICogbWF0cml4LiRtYXRyaXgubTQyICsgeCAqIG1hdHJpeC4kbWF0cml4Lm0xMiArIHkgKiBtYXRyaXguJG1hdHJpeC5tMjIgKyB6ICogbWF0cml4LiRtYXRyaXgubTMyO1xyXG4gICAgICB0aGlzWzJdID0gdyAqIG1hdHJpeC4kbWF0cml4Lm00MyArIHggKiBtYXRyaXguJG1hdHJpeC5tMTMgKyB5ICogbWF0cml4LiRtYXRyaXgubTIzICsgeiAqIG1hdHJpeC4kbWF0cml4Lm0zMztcclxuICAgICAgdGhpc1szXSA9IHcgKiBtYXRyaXguJG1hdHJpeC5tNDQgKyB4ICogbWF0cml4LiRtYXRyaXgubTE0ICsgeSAqIG1hdHJpeC4kbWF0cml4Lm0yNCArIHogKiBtYXRyaXguJG1hdHJpeC5tMzQ7XHJcblxyXG4gICAgICByZXR1cm4gdGhpc1szXTtcclxuICAgIH1cclxuXHJcbiAgICBjcm9zcyh2KSB7XHJcbiAgICAgIGxldCB4ID0gdGhpc1sxXSAqIHZbMl0gLSB0aGlzWzJdICogdlsxXTtcclxuICAgICAgbGV0IHkgPSB0aGlzWzJdICogdlswXSAtIHRoaXNbMF0gKiB2WzJdO1xyXG4gICAgICBsZXQgeiA9IHRoaXNbMF0gKiB2WzFdIC0gdGhpc1sxXSAqIHZbMF07XHJcblxyXG4gICAgICB0aGlzWzBdID0geDtcclxuICAgICAgdGhpc1sxXSA9IHk7XHJcbiAgICAgIHRoaXNbMl0gPSB6O1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHJlTm9ybWFsaXplZEFuZ2xlKHYyKSB7XHJcbiAgICAgIGxldCB0aCA9IHRoaXMuZG90KHYyKSAqIDAuOTk5OTk7XHJcbiAgICAgIHJldHVybiBNYXRoLmFjb3ModGgpO1xyXG4gICAgfVxyXG5cclxuICAgIGxvYWRTVFJVQ1QocmVhZGVyKSB7XHJcbiAgICAgIHJlYWRlcih0aGlzKTtcclxuXHJcbiAgICAgIGlmICh0eXBlb2YgdGhpcy52ZWMgIT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgICAgICB0aGlzLmxvYWQodGhpcy52ZWMpO1xyXG4gICAgICAgIHRoaXMudmVjID0gdW5kZWZpbmVkO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgdGVtcDEgPSBuZXcgVmVjdG9yNCgpO1xyXG4gIHRlbXAyID0gbmV3IFZlY3RvcjQoKTtcclxuICB0ZW1wMyA9IG5ldyBWZWN0b3I0KCk7XHJcbiAgdGVtcDQgPSBuZXcgVmVjdG9yNCgpO1xyXG5cclxuICByZXR1cm4gVmVjdG9yNDtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IFZlY3RvcjQgPSBtYWtlVmVjdG9yNChCYXNlVmVjdG9yKTtcclxuXHJcbmxldCBfdjNuZF9uMV9ub3JtYWxpemVkRG90LCBfdjNuZF9uMl9ub3JtYWxpemVkRG90O1xyXG5sZXQgX3YzbmQ0X24xX25vcm1hbGl6ZWREb3Q0LCBfdjNuZDRfbjJfbm9ybWFsaXplZERvdDQ7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWFrZVZlY3RvcjMoQmFzZVZlY3Rvciwgc3RydWN0TmFtZSA9IFwidmVjM1wiLCBzdHJ1Y3RUeXBlID0gXCJmbG9hdFwiLCBjdXN0b21Db25zdHJ1Y3RvckNvZGUgPSB1bmRlZmluZWQpIHtcclxuICB2YXIgVmVjdG9yMztcclxuICB2YXIgYnVuZGxlaGVscGVyID0gW25zdHJ1Y3Rqc107XHJcblxyXG4gIGNvbnN0IGNvbnN0cnVjdG9yQ29kZSA9XHJcbiAgICBjdXN0b21Db25zdHJ1Y3RvckNvZGUgPz9cclxuICAgIGBcclxuICAgIGNvbnN0cnVjdG9yKGRhdGEpIHtcclxuICAgICAgc3VwZXIoMyk7XHJcblxyXG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmV4cGVjdGVkIGFyZ3VtZW50XCIpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzWzBdID0gdGhpc1sxXSA9IHRoaXNbMl0gPSAwLjA7XHJcblxyXG4gICAgICBpZiAoZGF0YSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdGhpcy5sb2FkKGRhdGEpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAodGhpcy5jb25zdHJ1Y3RvciA9PT0gVmVjdG9yMykge1xyXG4gICAgICAgIE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyh0aGlzKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIGA7XHJcblxyXG4gIGNvbnN0IGNvZGUgPSBgXHJcbiAgbGV0IHRlbXAxLCB0ZW1wMiwgdGVtcDMsIHRlbXA0O1xyXG4gIFZlY3RvcjMgPSBjbGFzcyBWZWN0b3IzIGV4dGVuZHMgQmFzZVZlY3RvciB7XHJcbiAgICBzdGF0aWMgU1RSVUNUID0gYnVuZGxlaGVscGVyWzBdLmlubGluZVJlZ2lzdGVyKHRoaXMsIFxcYFxyXG4gICAgJHtzdHJ1Y3ROYW1lfSB7XHJcbiAgICAgIDAgOiAke3N0cnVjdFR5cGV9O1xyXG4gICAgICAxIDogJHtzdHJ1Y3RUeXBlfTtcclxuICAgICAgMiA6ICR7c3RydWN0VHlwZX07XHJcbiAgICB9XFxgKTtcclxuXHJcbiAgICAke2NvbnN0cnVjdG9yQ29kZX1cclxuXHJcbiAgICBzdGF0aWMgbm9ybWFsaXplZERvdDQodjEsIHYyLCB2MywgdjQpIHtcclxuICAgICAgdGVtcDEubG9hZCh2Mikuc3ViKHYxKS5ub3JtYWxpemUoKVxyXG4gICAgICB0ZW1wMi5sb2FkKHY0KS5zdWIodjMpLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgICAgcmV0dXJuIHRlbXAxLmRvdCh0ZW1wMik7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBub3JtYWxpemVkRG90Myh2MSwgY2VudGVyLCB2Mikge1xyXG4gICAgICB0ZW1wMS5sb2FkKHYxKS5zdWIoY2VudGVyKS5ub3JtYWxpemUoKTtcclxuICAgICAgdGVtcDIubG9hZCh2Mikuc3ViKGNlbnRlcikubm9ybWFsaXplKCk7XHJcblxyXG4gICAgICByZXR1cm4gdGVtcDEuZG90KHRlbXAyKTtcclxuICAgIH1cclxuXHJcbiAgICB0b0NTUygpIHtcclxuICAgICAgbGV0IHIgPSB+fih0aGlzWzBdKjI1NSk7XHJcbiAgICAgIGxldCBnID0gfn4odGhpc1sxXSoyNTUpO1xyXG4gICAgICBsZXQgYiA9IH5+KHRoaXNbMl0qMjU1KTtcclxuICAgICAgcmV0dXJuIFxcYHJnYihcXCR7cn0sXFwke2d9LFxcJHtifSlcXGBcclxuICAgIH1cclxuXHJcbiAgICBsb2FkMihiKSB7XHJcbiAgICAgIHRoaXNbMF0gPSBiWzBdXHJcbiAgICAgIHRoaXNbMV0gPSBiWzFdXHJcbiAgICAgIHJldHVybiB0aGlzXHJcbiAgICB9XHJcbiAgICAgIFxyXG4gICAgbG9hZFhZWih4LCB5LCB6KSB7XHJcbiAgICAgIHRoaXNbMF0gPSB4O1xyXG4gICAgICB0aGlzWzFdID0geTtcclxuICAgICAgdGhpc1syXSA9IHo7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBsb2FkWFkoeCwgeSkge1xyXG4gICAgICB0aGlzWzBdID0geDtcclxuICAgICAgdGhpc1sxXSA9IHk7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICB0b0pTT04oKSB7XHJcbiAgICAgIHJldHVybiBbdGhpc1swXSwgdGhpc1sxXSwgdGhpc1syXV07XHJcbiAgICB9XHJcblxyXG4gICAgbG9hZEpTT04ob2JqKSB7XHJcbiAgICAgIHJldHVybiB0aGlzLmxvYWQob2JqKTtcclxuICAgIH1cclxuXHJcbiAgICBpbml0VmVjdG9yMygpIHtcclxuICAgICAgdGhpcy5sZW5ndGggPSAzO1xyXG4gICAgICB0aGlzWzBdID0gdGhpc1sxXSA9IHRoaXNbMl0gPSAwO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBsb2FkKGRhdGEpIHtcclxuICAgICAgaWYgKGRhdGEgPT09IHVuZGVmaW5lZClcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuXHJcbiAgICAgIC8vaWYgKGlzTmFOKGRhdGFbMF0pIHx8IGlzTmFOKGRhdGFbMV0pIHx8IGlzTmFOKGRhdGFbMl0pKSB7XHJcbiAgICAgIC8vICB0aHJvdyBuZXcgRXJyb3IoXCJOYU5cIik7XHJcbiAgICAgIC8vfVxyXG5cclxuICAgICAgdGhpc1swXSA9IGRhdGFbMF07XHJcbiAgICAgIHRoaXNbMV0gPSBkYXRhWzFdO1xyXG4gICAgICB0aGlzWzJdID0gZGF0YVsyXTtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIGRvdChiKSB7XHJcbiAgICAgIC8vIGFjb3Mgc2FmZSBhZGp1c3RtZW50XHJcbiAgICAgIGNvbnN0IHJldCA9IHRoaXNbMF0qYlswXSArIHRoaXNbMV0qYlsxXSArIHRoaXNbMl0qYlsyXTtcclxuICAgICAgaWYgKHJldCA+PSAxLjAgLSBET1RfTk9STV9TTkFQX0xJTUlUICYmIHJldCA8PSAxLjAgKyBET1RfTk9STV9TTkFQX0xJTUlUKSByZXR1cm4gMS4wO1xyXG4gICAgICBpZiAocmV0ID49IC0xLjAgLSBET1RfTk9STV9TTkFQX0xJTUlUICYmIHJldCA8PSAtMS4wICsgRE9UX05PUk1fU05BUF9MSU1JVCkgcmV0dXJuIC0xLjA7XHJcbiAgICAgIHJldHVybiByZXQ7XHJcbiAgICB9XHJcblxyXG4gICAgbm9ybWFsaXplZERvdCh2KSB7XHJcbiAgICAgICRfdjNuZF9uMV9ub3JtYWxpemVkRG90LmxvYWQodGhpcyk7XHJcbiAgICAgICRfdjNuZF9uMl9ub3JtYWxpemVkRG90LmxvYWQodik7XHJcbiAgICAgICRfdjNuZF9uMV9ub3JtYWxpemVkRG90Lm5vcm1hbGl6ZSgpO1xyXG4gICAgICAkX3YzbmRfbjJfbm9ybWFsaXplZERvdC5ub3JtYWxpemUoKTtcclxuICAgICAgcmV0dXJuICRfdjNuZF9uMV9ub3JtYWxpemVkRG90LmRvdCgkX3YzbmRfbjJfbm9ybWFsaXplZERvdCk7XHJcbiAgICB9XHJcblxyXG4gICAgbXVsVmVjUXVhdChxKSB7XHJcbiAgICAgIGxldCB0MCA9IC1xWzFdKnRoaXNbMF0gLSBxWzJdKnRoaXNbMV0gLSBxWzNdKnRoaXNbMl07XHJcbiAgICAgIGxldCB0MSA9IHFbMF0qdGhpc1swXSArIHFbMl0qdGhpc1syXSAtIHFbM10qdGhpc1sxXTtcclxuICAgICAgbGV0IHQyID0gcVswXSp0aGlzWzFdICsgcVszXSp0aGlzWzBdIC0gcVsxXSp0aGlzWzJdO1xyXG5cclxuICAgICAgdGhpc1syXSA9IHFbMF0qdGhpc1syXSArIHFbMV0qdGhpc1sxXSAtIHFbMl0qdGhpc1swXTtcclxuICAgICAgdGhpc1swXSA9IHQxO1xyXG4gICAgICB0aGlzWzFdID0gdDI7XHJcblxyXG4gICAgICB0MSA9IHQwKiAtcVsxXSArIHRoaXNbMF0qcVswXSAtIHRoaXNbMV0qcVszXSArIHRoaXNbMl0qcVsyXTtcclxuICAgICAgdDIgPSB0MCogLXFbMl0gKyB0aGlzWzFdKnFbMF0gLSB0aGlzWzJdKnFbMV0gKyB0aGlzWzBdKnFbM107XHJcblxyXG4gICAgICB0aGlzWzJdID0gdDAqIC1xWzNdICsgdGhpc1syXSpxWzBdIC0gdGhpc1swXSpxWzJdICsgdGhpc1sxXSpxWzFdO1xyXG4gICAgICB0aGlzWzBdID0gdDE7XHJcbiAgICAgIHRoaXNbMV0gPSB0MjtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIG11bHRWZWNNYXRyaXgobWF0cml4LCBpZ25vcmVfdykge1xyXG4gICAgICBpZiAoaWdub3JlX3cgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGlnbm9yZV93ID0gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgICAgbGV0IHggPSB0aGlzWzBdO1xyXG4gICAgICBsZXQgeSA9IHRoaXNbMV07XHJcbiAgICAgIGxldCB6ID0gdGhpc1syXTtcclxuICAgICAgdGhpc1swXSA9IG1hdHJpeC4kbWF0cml4Lm00MSArIHgqbWF0cml4LiRtYXRyaXgubTExICsgeSptYXRyaXguJG1hdHJpeC5tMjEgKyB6Km1hdHJpeC4kbWF0cml4Lm0zMTtcclxuICAgICAgdGhpc1sxXSA9IG1hdHJpeC4kbWF0cml4Lm00MiArIHgqbWF0cml4LiRtYXRyaXgubTEyICsgeSptYXRyaXguJG1hdHJpeC5tMjIgKyB6Km1hdHJpeC4kbWF0cml4Lm0zMjtcclxuICAgICAgdGhpc1syXSA9IG1hdHJpeC4kbWF0cml4Lm00MyArIHgqbWF0cml4LiRtYXRyaXgubTEzICsgeSptYXRyaXguJG1hdHJpeC5tMjMgKyB6Km1hdHJpeC4kbWF0cml4Lm0zMztcclxuICAgICAgbGV0IHcgPSBtYXRyaXguJG1hdHJpeC5tNDQgKyB4Km1hdHJpeC4kbWF0cml4Lm0xNCArIHkqbWF0cml4LiRtYXRyaXgubTI0ICsgeiptYXRyaXguJG1hdHJpeC5tMzQ7XHJcblxyXG4gICAgICBpZiAoIWlnbm9yZV93ICYmIHcgIT09IDEgJiYgdyAhPT0gMCAmJiBtYXRyaXguaXNQZXJzcCkge1xyXG4gICAgICAgIHRoaXNbMF0gLz0gdztcclxuICAgICAgICB0aGlzWzFdIC89IHc7XHJcbiAgICAgICAgdGhpc1syXSAvPSB3O1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB3O1xyXG4gICAgfVxyXG5cclxuICAgIGNyb3NzKHYpIHtcclxuICAgICAgbGV0IHggPSB0aGlzWzFdKnZbMl0gLSB0aGlzWzJdKnZbMV07XHJcbiAgICAgIGxldCB5ID0gdGhpc1syXSp2WzBdIC0gdGhpc1swXSp2WzJdO1xyXG4gICAgICBsZXQgeiA9IHRoaXNbMF0qdlsxXSAtIHRoaXNbMV0qdlswXTtcclxuXHJcbiAgICAgIHRoaXNbMF0gPSB4O1xyXG4gICAgICB0aGlzWzFdID0geTtcclxuICAgICAgdGhpc1syXSA9IHo7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICAvL2F4aXMgaXMgb3B0aW9uYWwsIDBcclxuICAgIHJvdDJkKEEsIGF4aXMgPSAwKSB7XHJcbiAgICAgIGxldCB4ID0gdGhpc1swXTtcclxuICAgICAgbGV0IHkgPSB0aGlzWzFdO1xyXG5cclxuICAgICAgaWYgKGF4aXMgPT09IDEpIHtcclxuICAgICAgICB0aGlzWzBdID0geCpNYXRoLmNvcyhBKSArIHkqTWF0aC5zaW4oQSk7XHJcbiAgICAgICAgdGhpc1sxXSA9IHkqTWF0aC5jb3MoQSkgLSB4Kk1hdGguc2luKEEpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXNbMF0gPSB4Kk1hdGguY29zKEEpIC0geSpNYXRoLnNpbihBKTtcclxuICAgICAgICB0aGlzWzFdID0geSpNYXRoLmNvcyhBKSArIHgqTWF0aC5zaW4oQSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHByZU5vcm1hbGl6ZWRBbmdsZSh2Mikge1xyXG4gICAgICBsZXQgdGggPSB0aGlzLmRvdCh2MikqMC45OTk5OTtcclxuICAgICAgcmV0dXJuIE1hdGguYWNvcyh0aCk7XHJcbiAgICB9XHJcblxyXG4gICAgbG9hZFNUUlVDVChyZWFkZXIpIHtcclxuICAgICAgcmVhZGVyKHRoaXMpO1xyXG5cclxuICAgICAgaWYgKHR5cGVvZiB0aGlzLnZlYyAhPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgIHRoaXMubG9hZCh0aGlzLnZlYyk7XHJcbiAgICAgICAgdGhpcy52ZWMgPSB1bmRlZmluZWQ7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIHRlbXAxID0gbmV3IFZlY3RvcjMoKTtcclxuICB0ZW1wMiA9IG5ldyBWZWN0b3IzKCk7XHJcbiAgdGVtcDMgPSBuZXcgVmVjdG9yMygpO1xyXG4gIHRlbXA0ID0gbmV3IFZlY3RvcjMoKTtcclxuICBgO1xyXG5cclxuICBldmFsKGNvZGUpO1xyXG4gIHJldHVybiBWZWN0b3IzO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgVmVjdG9yMyA9IG1ha2VWZWN0b3IzKEY2NEJhc2VWZWN0b3IpO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VWZWN0b3IyKEJhc2VWZWN0b3IsIHN0cnVjdE5hbWUgPSBcInZlYzJcIiwgc3RydWN0VHlwZSA9IFwiZmxvYXRcIikge1xyXG4gIGxldCB0ZW1wMSwgdGVtcDIsIHRlbXAzLCB0ZW1wNDtcclxuXHJcbiAgY29uc3QgVmVjdG9yMiA9IGNsYXNzIFZlY3RvcjIgZXh0ZW5kcyBCYXNlVmVjdG9yIHtcclxuICAgIHN0YXRpYyBTVFJVQ1QgPSBuc3RydWN0anMuaW5saW5lUmVnaXN0ZXIoXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgIGBcclxuICAgICR7c3RydWN0TmFtZX0ge1xyXG4gICAgICAwIDogJHtzdHJ1Y3RUeXBlfTtcclxuICAgICAgMSA6ICR7c3RydWN0VHlwZX07XHJcbiAgICB9YFxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihkYXRhKSB7XHJcbiAgICAgIHN1cGVyKDIpO1xyXG5cclxuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5leHBlY3RlZCBhcmd1bWVudFwiKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpc1swXSA9IHRoaXNbMV0gPSAwLjA7XHJcblxyXG4gICAgICBpZiAoZGF0YSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdGhpcy5sb2FkKGRhdGEpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdFZlY3RvcjIoY28pIHtcclxuICAgICAgdGhpcy5sZW5ndGggPSAyO1xyXG5cclxuICAgICAgaWYgKGNvICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB0aGlzWzBdID0gY29bMF07XHJcbiAgICAgICAgdGhpc1sxXSA9IGNvWzFdO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXNbMF0gPSB0aGlzWzFdID0gMC4wO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgbm9ybWFsaXplZERvdDQodjEsIHYyLCB2MywgdjQpIHtcclxuICAgICAgdGVtcDEubG9hZCh2Mikuc3ViKHYxKS5ub3JtYWxpemUoKTtcclxuICAgICAgdGVtcDIubG9hZCh2NCkuc3ViKHYzKS5ub3JtYWxpemUoKTtcclxuXHJcbiAgICAgIHJldHVybiB0ZW1wMS5kb3QodGVtcDIpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBub3JtYWxpemVkRG90Myh2MSwgY2VudGVyLCB2Mikge1xyXG4gICAgICB0ZW1wMS5sb2FkKHYxKS5zdWIoY2VudGVyKS5ub3JtYWxpemUoKTtcclxuICAgICAgdGVtcDIubG9hZCh2Mikuc3ViKGNlbnRlcikubm9ybWFsaXplKCk7XHJcblxyXG4gICAgICByZXR1cm4gdGVtcDEuZG90KHRlbXAyKTtcclxuICAgIH1cclxuXHJcbiAgICB0b0pTT04oKSB7XHJcbiAgICAgIHJldHVybiBbdGhpc1swXSwgdGhpc1sxXV07XHJcbiAgICB9XHJcblxyXG4gICAgbG9hZEpTT04ob2JqKSB7XHJcbiAgICAgIHJldHVybiB0aGlzLmxvYWQob2JqKTtcclxuICAgIH1cclxuXHJcbiAgICBsb2FkWFkoeCwgeSkge1xyXG4gICAgICB0aGlzWzBdID0geDtcclxuICAgICAgdGhpc1sxXSA9IHk7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBsb2FkKGRhdGEpIHtcclxuICAgICAgaWYgKGRhdGEgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXM7XHJcblxyXG4gICAgICB0aGlzWzBdID0gZGF0YVswXTtcclxuICAgICAgdGhpc1sxXSA9IGRhdGFbMV07XHJcblxyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICAvL2F4aXMgaXMgb3B0aW9uYWwsIDBcclxuICAgIHJvdDJkKEEsIGF4aXMpIHtcclxuICAgICAgbGV0IHggPSB0aGlzWzBdO1xyXG4gICAgICBsZXQgeSA9IHRoaXNbMV07XHJcblxyXG4gICAgICBpZiAoYXhpcyA9PT0gMSkge1xyXG4gICAgICAgIHRoaXNbMF0gPSB4ICogTWF0aC5jb3MoQSkgKyB5ICogTWF0aC5zaW4oQSk7XHJcbiAgICAgICAgdGhpc1sxXSA9IHkgKiBNYXRoLmNvcyhBKSAtIHggKiBNYXRoLnNpbihBKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzWzBdID0geCAqIE1hdGguY29zKEEpIC0geSAqIE1hdGguc2luKEEpO1xyXG4gICAgICAgIHRoaXNbMV0gPSB5ICogTWF0aC5jb3MoQSkgKyB4ICogTWF0aC5zaW4oQSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIGRvdChiKSB7XHJcbiAgICAgIHJldHVybiB0aGlzWzBdICogYlswXSArIHRoaXNbMV0gKiBiWzFdO1xyXG4gICAgfVxyXG5cclxuICAgIG11bHRWZWNNYXRyaXgobWF0cml4KSB7XHJcbiAgICAgIGxldCB4ID0gdGhpc1swXTtcclxuICAgICAgbGV0IHkgPSB0aGlzWzFdO1xyXG5cclxuICAgICAgbGV0IHcgPSAxLjA7XHJcblxyXG4gICAgICB0aGlzWzBdID0gdyAqIG1hdHJpeC4kbWF0cml4Lm00MSArIHggKiBtYXRyaXguJG1hdHJpeC5tMTEgKyB5ICogbWF0cml4LiRtYXRyaXgubTIxO1xyXG4gICAgICB0aGlzWzFdID0gdyAqIG1hdHJpeC4kbWF0cml4Lm00MiArIHggKiBtYXRyaXguJG1hdHJpeC5tMTIgKyB5ICogbWF0cml4LiRtYXRyaXgubTIyO1xyXG5cclxuICAgICAgaWYgKG1hdHJpeC5pc1BlcnNwKSB7XHJcbiAgICAgICAgbGV0IHcyID0gdyAqIG1hdHJpeC4kbWF0cml4Lm00NCArIHggKiBtYXRyaXguJG1hdHJpeC5tMTQgKyB5ICogbWF0cml4LiRtYXRyaXgubTI0O1xyXG5cclxuICAgICAgICBpZiAodzIgIT09IDAuMCkge1xyXG4gICAgICAgICAgdGhpc1swXSAvPSB3MjtcclxuICAgICAgICAgIHRoaXNbMV0gLz0gdzI7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBtdWxWZWNRdWF0KHEpIHtcclxuICAgICAgbGV0IHQwID0gLXFbMV0gKiB0aGlzWzBdIC0gcVsyXSAqIHRoaXNbMV07XHJcbiAgICAgIGxldCB0MSA9IHFbMF0gKiB0aGlzWzBdIC0gcVszXSAqIHRoaXNbMV07XHJcbiAgICAgIGxldCB0MiA9IHFbMF0gKiB0aGlzWzFdICsgcVszXSAqIHRoaXNbMF07XHJcblxyXG4gICAgICBsZXQgeiA9IHFbMV0gKiB0aGlzWzFdIC0gcVsyXSAqIHRoaXNbMF07XHJcbiAgICAgIHRoaXNbMF0gPSB0MTtcclxuICAgICAgdGhpc1sxXSA9IHQyO1xyXG5cclxuICAgICAgdDEgPSB0MCAqIC1xWzFdICsgdGhpc1swXSAqIHFbMF0gLSB0aGlzWzFdICogcVszXSArIHogKiBxWzJdO1xyXG4gICAgICB0MiA9IHQwICogLXFbMl0gKyB0aGlzWzFdICogcVswXSAtIHogKiBxWzFdICsgdGhpc1swXSAqIHFbM107XHJcblxyXG4gICAgICB0aGlzWzBdID0gdDE7XHJcbiAgICAgIHRoaXNbMV0gPSB0MjtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHZlY3Rvckxlbmd0aFNxcigpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuZG90KHRoaXMpO1xyXG4gICAgfVxyXG5cclxuICAgIGxvYWRTVFJVQ1QocmVhZGVyKSB7XHJcbiAgICAgIHJlYWRlcih0aGlzKTtcclxuXHJcbiAgICAgIGlmICh0eXBlb2YgdGhpcy52ZWMgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHRoaXMubG9hZCh0aGlzLnZlYyk7XHJcbiAgICAgICAgdGhpcy52ZWMgPSB1bmRlZmluZWQ7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9O1xyXG5cclxuICB0ZW1wMSA9IG5ldyBWZWN0b3IyKCk7XHJcbiAgdGVtcDIgPSBuZXcgVmVjdG9yMigpO1xyXG4gIHRlbXAzID0gbmV3IFZlY3RvcjIoKTtcclxuICB0ZW1wNCA9IG5ldyBWZWN0b3IyKCk7XHJcblxyXG4gIHJldHVybiBWZWN0b3IyO1xyXG59XHJcblxyXG5pbXBvcnQgZnMgZnJvbSBcImZzXCI7XHJcbmltcG9ydCB7IE1hdHJpeDQgfSBmcm9tIFwiLi9tYXRyaXg0LmpzXCI7XHJcbmltcG9ydCB7IEluZGV4UmFuZ2UgfSBmcm9tIFwiLi9pbmRleFJhbmdlLmpzXCI7XHJcbmltcG9ydCB7IE1hdHJpeDRDb2RlIH0gZnJvbSBcIi4vbWF0cml4NENvZGUuanNcIjtcclxuXHJcbmZ1bmN0aW9uIGJhc2ljRG90RnVuY3ModmVjc2l6ZTogbnVtYmVyLCBWQXJnOiBzdHJpbmcpIHtcclxuICBsZXQgcyA9IFwiXCI7XHJcbiAgbGV0IHZlY3RvckRvdERpc3RhbmNlID0gYCAgICB2ZWN0b3JEb3REaXN0YW5jZShiOiAke1ZBcmd9KTogbnVtYmVyIHtcXG5gO1xyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdmVjc2l6ZTsgaSsrKSB7XHJcbiAgICB2ZWN0b3JEb3REaXN0YW5jZSArPSBgICAgICAgY29uc3QgZCR7aX0gPSB0aGlzWyR7aX1dIC0gYlske2l9XTtcXG5gO1xyXG4gIH1cclxuXHJcbiAgdmVjdG9yRG90RGlzdGFuY2UgKz0gXCIgICAgICByZXR1cm4gXCI7XHJcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB2ZWNzaXplOyBpKyspIHtcclxuICAgIGlmIChpID4gMCkgdmVjdG9yRG90RGlzdGFuY2UgKz0gXCIgKyBcIjtcclxuICAgIHZlY3RvckRvdERpc3RhbmNlICs9IFwiZFwiICsgaSArIFwiKmRcIiArIGk7XHJcbiAgfVxyXG4gIHZlY3RvckRvdERpc3RhbmNlICs9IFwiO1xcblwiO1xyXG4gIHZlY3RvckRvdERpc3RhbmNlICs9IFwiICAgIH1cXG5cXG5cIjtcclxuXHJcbiAgcyArPSB2ZWN0b3JEb3REaXN0YW5jZTtcclxuXHJcbiAgbGV0IHZlY3RvckRpc3RhbmNlID0gYCAgICB2ZWN0b3JEaXN0YW5jZShiOiAke1ZBcmd9KTogbnVtYmVyIHtcXG5gO1xyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdmVjc2l6ZTsgaSsrKSB7XHJcbiAgICB2ZWN0b3JEaXN0YW5jZSArPSBgICAgICAgY29uc3QgZCR7aX0gPSB0aGlzWyR7aX1dIC0gKGJbJHtpfV0gPz8gMCk7XFxuYDtcclxuICB9XHJcblxyXG4gIHZlY3RvckRpc3RhbmNlICs9IFwiICAgICAgcmV0dXJuIE1hdGguc3FydChcIjtcclxuICBmb3IgKGxldCBpID0gMDsgaSA8IHZlY3NpemU7IGkrKykge1xyXG4gICAgaWYgKGkgPiAwKSB2ZWN0b3JEaXN0YW5jZSArPSBcIiArIFwiO1xyXG4gICAgdmVjdG9yRGlzdGFuY2UgKz0gXCJkXCIgKyBpICsgXCIqZFwiICsgaTtcclxuICB9XHJcbiAgdmVjdG9yRGlzdGFuY2UgKz0gXCIpO1xcblwiO1xyXG4gIHZlY3RvckRpc3RhbmNlICs9IFwiICAgIH1cXG5cXG5cIjtcclxuICBzICs9IHZlY3RvckRpc3RhbmNlO1xyXG5cclxuICBsZXQgdmVjdG9yRGlzdGFuY2VTcXIgPSBgICAgIHZlY3RvckRpc3RhbmNlU3FyKGI6ICR7VkFyZ30pOiBudW1iZXIge1xcbmA7XHJcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB2ZWNzaXplOyBpKyspIHtcclxuICAgIHZlY3RvckRpc3RhbmNlU3FyICs9IGAgICAgICBjb25zdCBkJHtpfSA9IHRoaXNbJHtpfV0gLSAoYlske2l9XSA/PyAwKTtcXG5gO1xyXG4gICAgLy92ZWN0b3JEaXN0YW5jZVNxciArPSBcIiAgbGV0IGRcIitpK1wiID0gdGhpc1tcIitpK1wiXS0oYltcIitpK1wiXXx8MCk7XFxuXFxuICBcIjtcclxuICB9XHJcblxyXG4gIHZlY3RvckRpc3RhbmNlU3FyICs9IFwiICAgICAgcmV0dXJuIChcIjtcclxuICBmb3IgKGxldCBpID0gMDsgaSA8IHZlY3NpemU7IGkrKykge1xyXG4gICAgaWYgKGkgPiAwKSB2ZWN0b3JEaXN0YW5jZVNxciArPSBcIiArIFwiO1xyXG4gICAgdmVjdG9yRGlzdGFuY2VTcXIgKz0gXCJkXCIgKyBpICsgXCIqZFwiICsgaTtcclxuICB9XHJcbiAgdmVjdG9yRGlzdGFuY2VTcXIgKz0gXCIpO1xcblwiO1xyXG4gIHZlY3RvckRpc3RhbmNlU3FyICs9IFwiICAgIH1cIjtcclxuICBzICs9IHZlY3RvckRpc3RhbmNlU3FyO1xyXG5cclxuICByZXR1cm4gcztcclxufVxyXG5mdW5jdGlvbiBnZW5CYXNlKGJhc2U6IGFueSwgbmFtZTogc3RyaW5nLCB2ZWNzaXplOiBudW1iZXIpIHtcclxuICBjb25zdCBWQXJnID0gYFZlY3Rvckxpa2VPckhpZ2hlcjwke3ZlY3NpemV9LCB0aGlzPmA7XHJcblxyXG4gIGNvbnN0IGNscyA9IGJhc2UuaW5oZXJpdDtcclxuICBmdW5jdGlvbiB1bnJvbGwoczogc3RyaW5nLCBjaGFyID0gXCJcXG5cIiwgb2Zmc2V0ID0gMCwgY291bnQgPSB2ZWNzaXplKSB7XHJcbiAgICBsZXQgczEgPSBcIlwiO1xyXG4gICAgbGV0IGF4ZXMgPSBcInh5endcIjtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xyXG4gICAgICBzMSArPVxyXG4gICAgICAgIHNcclxuICAgICAgICAgIC5yZXBsYWNlKC9cXCRcXCQvZywgXCJcIiArIChpICsgb2Zmc2V0KSlcclxuICAgICAgICAgIC5yZXBsYWNlKC9cXCRcXCEvZywgXCJcIiArIChpICsgMSArIG9mZnNldCkpXHJcbiAgICAgICAgICAucmVwbGFjZSgvXFwkWC9nLCBheGVzW2ldKSArIGNoYXI7XHJcbiAgICB9XHJcbiAgICAvLyBjaG9wIG9mZiB0cmFpbGluZyBjaGFyXHJcbiAgICByZXR1cm4gczEuc2xpY2UoMCwgLTEpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gdW5yb2xsSm9pbihzOiBzdHJpbmcsIGNoYXIgPSBcIlxcblwiLCBjb3VudCA9IHZlY3NpemUpIHtcclxuICAgIGxldCBhcnIgPSBbXSBhcyBzdHJpbmdbXTtcclxuICAgIGxldCBheGVzID0gXCJ4eXp3XCI7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcclxuICAgICAgYXJyLnB1c2gocy5yZXBsYWNlKC9cXCRcXCQvZywgXCJcIiArIGkpLnJlcGxhY2UoL1xcJFgvZywgYXhlc1tpXSkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGFyci5qb2luKGNoYXIpO1xyXG4gIH1cclxuXHJcbiAgLy8gbWV0aG9kIGxldmVsIGluZGVudFxyXG4gIGxldCBtVGFiID0gXCIgICAgICBcIjtcclxuICAvLyBjbGFzcyBsZXZlbCBpbmRlbnRcclxuICBsZXQgY1RhYiA9IFwiICAgIFwiO1xyXG5cclxuICBsZXQgYmFzaWNGdW5jcyA9IFwiXCI7XHJcbiAgZm9yIChsZXQgayBpbiBiYXNpY19mdW5jcykge1xyXG4gICAgbGV0IGZ1bmMgPSBiYXNpY19mdW5jc1trXTtcclxuICAgIGxldCBhcmdzID0gZnVuY1swXTtcclxuICAgIGxldCBsaW5lID0gZnVuY1sxXTtcclxuICAgIHZhciBmO1xyXG5cclxuICAgIGxldCBjb2RlID0gYCAgICAke2t9KGA7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcclxuICAgICAgbGV0IGFyZyA9IGFyZ3NbaV07XHJcbiAgICAgIGxldCB0eXBlID0gYXJnID09PSBcInZiXCIgPyBgJHtWQXJnfWAgOiBcIm51bWJlclwiO1xyXG4gICAgICBhcmcgPSAoYXJnID09PSBcInZiXCIgPyBcImJcIiA6IGFyZykudG9Mb3dlckNhc2UoKTtcclxuXHJcbiAgICAgIGlmIChpID4gMCkgY29kZSArPSBcIiwgXCI7XHJcblxyXG4gICAgICBsaW5lID0gbGluZS5yZXBsYWNlKGFyZ3NbaV0sIGFyZyk7XHJcbiAgICAgIGNvZGUgKz0gYCR7YXJnLnRvTG93ZXJDYXNlKCl9OiAke3R5cGV9YDtcclxuICAgIH1cclxuICAgIGNvZGUgKz0gXCIpIHtcXG5cIjtcclxuXHJcbiAgICBpZiAoZnVuYy5sZW5ndGggPiAyKSB7XHJcbiAgICAgIC8vbWFrZSBzdW1tYXRpb25cclxuICAgICAgY29kZSArPSBtVGFiICsgXCJyZXR1cm4gXCI7XHJcblxyXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZlY3NpemU7IGkrKykge1xyXG4gICAgICAgIGlmIChpID4gMCkgY29kZSArPSBgICR7ZnVuY1syXX0gYDtcclxuXHJcbiAgICAgICAgY29kZSArPSBcIihcIiArIGxpbmUucmVwbGFjZSgvWC9nLCBcIlwiICsgaSkgKyBcIilcIjtcclxuICAgICAgfVxyXG4gICAgICBjb2RlICs9IFwiO1xcblwiO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2ZWNzaXplOyBpKyspIHtcclxuICAgICAgICBsZXQgbGluZTIgPSBsaW5lLnJlcGxhY2UoL1gvZywgXCJcIiArIGkpO1xyXG4gICAgICAgIGNvZGUgKz0gbVRhYiArIFwidGhpc1tcIiArIGkgKyBcIl0gPSBcIiArIGxpbmUyICsgXCI7XFxuXCI7XHJcbiAgICAgIH1cclxuICAgICAgY29kZSArPSBgJHttVGFifXJldHVybiB0aGlzO1xcbmA7XHJcbiAgICB9XHJcblxyXG4gICAgY29kZSArPSBgJHtjVGFifX1cXG5cXG5gO1xyXG4gICAgYmFzaWNGdW5jcyArPSBjb2RlO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgaW5kZXhUeXBlID0gdW5yb2xsKFwiJCRcIikuc3BsaXQoXCJcXG5cIikuam9pbihcInxcIik7XHJcbiAgbGV0IFZBcmdTID0gYFZlY3Rvckxpa2VPckhpZ2hlcjwke3ZlY3NpemV9LCBWZWN0b3Ike3ZlY3NpemV9PmA7XHJcblxyXG4gIGxldCBzID0gXCJcIjtcclxuICBzICs9IGBcclxuZnVuY3Rpb24gY3JlYXRlJHtuYW1lfSR7dmVjc2l6ZX0ocGFyZW50OiB0eXBlb2YgQXJyYXkgfCB0eXBlb2YgRmxvYXQzMkFycmF5LCBzdHJ1Y3ROYW1lPzogc3RyaW5nKSB7XHJcbiAgcmV0dXJuIGNsYXNzICR7bmFtZX0ke3ZlY3NpemV9IGV4dGVuZHMgcGFyZW50IHtcclxuJHt1bnJvbGwoXCIgICAgJCQ6IG51bWJlcjtcIil9XHJcbiAgICAvLyB0aGlzIGlzIHNldCBieSB0aGUgcGFyZW50IGNsYXNzXHJcbiAgICAvLyBAdHMtZXhwZWN0LWVycm9yXHJcbiAgICBsZW5ndGg6IG51bWJlclxyXG4gICAgW1N5bWJvbC5pdGVyYXRvcl0gPSBwYXJlbnQucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl07XHJcblxyXG4gICAgc3RhdGljIHN0cnVjdE5hbWUgPSBzdHJ1Y3ROYW1lO1xyXG4gICAgc3RhdGljIFNUUlVDVCA9IHN0cnVjdE5hbWUgIT09IHVuZGVmaW5lZCA/IG5zdHJ1Y3Rqcy5pbmxpbmVSZWdpc3Rlcih0aGlzLCBcXGBcclxuICAgIFxcJHtzdHJ1Y3ROYW1lfSB7XHJcbiR7dW5yb2xsKFwiICAgICAgJCQ6IGRvdWJsZTtcIil9XHJcbiAgICB9XFxgKSA6IHVuZGVmaW5lZDtcclxuICAgIFxyXG4gICAgc3RhdGljIG5vcm1hbGl6ZWREb3Q0KHYxOiAke1ZBcmdTfSwgdjI6ICR7VkFyZ1N9LCB2MzogJHtWQXJnU30sIHY0OiAke1ZBcmdTfSkge1xyXG4ke3Vucm9sbChgICAgICAgbGV0IGQkWDEgPSB2MlskJF0gLSB2MVskJF07YCl9XHJcbiR7dW5yb2xsKGAgICAgICBsZXQgZCRYMiA9IHY0WyQkXSAtIHYzWyQkXTtgKX1cclxuICAgICAgLy8gbm9ybWFsaXplXHJcbiAgICAgIGxldCBsMSA9IE1hdGguc3FydCgke3Vucm9sbEpvaW4oXCJkJFgxKmQkWDFcIiwgXCIgKyBcIil9KVxyXG4gICAgICBsZXQgbDIgPSBNYXRoLnNxcnQoJHt1bnJvbGxKb2luKFwiZCRYMipkJFgyXCIsIFwiICsgXCIpfSlcclxuXHJcbiAgICAgIC8vIG5vcm1hbGl6ZVxyXG4gICAgICBsMSA9IGwxID4gMC4wMDAwMDAxID8gMS4wIC8gbDEgOiAwLjBcclxuICAgICAgbDIgPSBsMiA+IDAuMDAwMDAwMSA/IDEuMCAvIGwyIDogMC4wXHJcbiR7dW5yb2xsKGAgICAgICBkJFgxICo9IGwxO2ApfVxyXG4ke3Vucm9sbChgICAgICAgZCRYMSAqPSBsMTtgKX1cclxuICBcclxuICAgICAgcmV0dXJuICR7dW5yb2xsSm9pbihgZCRYMSpkJFgyYCwgXCIgKyBcIil9O1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBub3JtYWxpemVkRG90Myh2MTogJHtWQXJnU30sIGNlbnRlcjogJHtWQXJnU30sIHYyOiAke1ZBcmdTfSkge1xyXG4ke3Vucm9sbChgICAgICAgbGV0IGQkWDEgPSB2MVskJF0gLSBjZW50ZXJbJCRdO2ApfVxyXG4ke3Vucm9sbChgICAgICAgbGV0IGQkWDIgPSB2MlskJF0gLSBjZW50ZXJbJCRdO2ApfVxyXG4gICAgICAvLyBub3JtYWxpemVcclxuICAgICAgbGV0IGwxID0gTWF0aC5zcXJ0KCR7dW5yb2xsSm9pbihcImQkWDEqZCRYMVwiLCBcIiArIFwiKX0pXHJcbiAgICAgIGxldCBsMiA9IE1hdGguc3FydCgke3Vucm9sbEpvaW4oXCJkJFgyKmQkWDJcIiwgXCIgKyBcIil9KVxyXG5cclxuICAgICAgLy8gbm9ybWFsaXplXHJcbiAgICAgIGwxID0gbDEgPiAwLjAwMDAwMDEgPyAxLjAgLyBsMSA6IDAuMFxyXG4gICAgICBsMiA9IGwyID4gMC4wMDAwMDAxID8gMS4wIC8gbDIgOiAwLjBcclxuJHt1bnJvbGwoYCAgICAgIGQkWDEgKj0gbDE7YCl9XHJcbiR7dW5yb2xsKGAgICAgICBkJFgxICo9IGwxO2ApfVxyXG4gIFxyXG4gICAgICByZXR1cm4gJHt1bnJvbGxKb2luKGBkJFgxKmQkWDJgLCBcIiArIFwiKX07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IoZXhpc3Rpbmc/OiBudW1iZXJbXSB8IFZlY3Rvckxpa2VPckhpZ2hlcjwke3ZlY3NpemV9LCAke25hbWV9JHt2ZWNzaXplfT4pIHtcclxuICAgICAgc3VwZXIoJHt2ZWNzaXplfSk7XHJcbiAgICAgIGlmIChleGlzdGluZyAhPT0gdW5kZWZpbmVkKSB7XHJcbiR7dW5yb2xsKGAke21UYWJ9ICB0aGlzWyQkXSA9IGV4aXN0aW5nWyQkXSA/PyAwLjA7YCl9XHJcbiAgICAgIH0gZWxzZSB7XHJcbiR7dW5yb2xsKGAke21UYWJ9ICB0aGlzWyQkXSA9IDA7YCl9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBsb2FkKGV4aXN0aW5nOiBudW1iZXJbXSB8IFZlY3Rvckxpa2VPckhpZ2hlcjwke3ZlY3NpemV9LCAke25hbWV9JHt2ZWNzaXplfT4pOiB0aGlzIHtcclxuJHt1bnJvbGwoYCR7bVRhYn10aGlzWyQkXSA9IGV4aXN0aW5nWyQkXTtgKX1cclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4vLyBsb2FkMi8zLzQgbWV0aG9kc1xyXG4ke0FycmF5LmZyb20oSW5kZXhSYW5nZSh2ZWNzaXplIC0gMSkpXHJcbiAgLm1hcCgoaSkgPT4ge1xyXG4gICAgcmV0dXJuIGBcclxuICAgIGxvYWQke2kgKyAyfShleGlzdGluZzogbnVtYmVyW10gfCBWZWN0b3JMaWtlT3JIaWdoZXI8JHtpICsgMn0sICR7bmFtZX0ke2kgKyAyfT4pOiB0aGlzIHtcclxuJHt1bnJvbGwoYCR7bVRhYn10aGlzWyQkXSA9IGV4aXN0aW5nWyQkXTtgLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgaSArIDIpfVxyXG4gICAgICByZXR1cm4gdGhpc1xyXG4gICAgfVxyXG4gIGA7XHJcbiAgfSlcclxuICAuam9pbihcIlxcblwiKX1cclxuXHJcbiR7YmFzaWNGdW5jc30ke2Jhc2ljRG90RnVuY3ModmVjc2l6ZSwgVkFyZyl9XHJcbiAgICBjb3B5KCkge1xyXG4gICAgICByZXR1cm4gbmV3ICR7bmFtZX0ke3ZlY3NpemV9KHRoaXMpO1xyXG4gICAgfVxyXG4gICAgdmVjdG9yTGVuZ3RoU3FyKCk6IG51bWJlciB7XHJcbiAgICAgIHJldHVybiB0aGlzLmRvdCh0aGlzKVxyXG4gICAgfVxyXG4gICAgdmVjdG9yTGVuZ3RoKCk6IG51bWJlciB7XHJcbiAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy5kb3QodGhpcykpO1xyXG4gICAgfVxyXG4gICAgcm90MmQoQTogbnVtYmVyLCBheGlzOiBudW1iZXIgPSAwKSB7XHJcbiAgICAgIGxldCB4ID0gdGhpc1swXTtcclxuICAgICAgbGV0IHkgPSB0aGlzWzFdO1xyXG5cclxuICAgICAgaWYgKGF4aXMgPT09IDEpIHtcclxuICAgICAgICB0aGlzWzBdID0geCAqIE1hdGguY29zKEEpICsgeSAqIE1hdGguc2luKEEpO1xyXG4gICAgICAgIHRoaXNbMV0gPSB5ICogTWF0aC5jb3MoQSkgLSB4ICogTWF0aC5zaW4oQSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpc1swXSA9IHggKiBNYXRoLmNvcyhBKSAtIHkgKiBNYXRoLnNpbihBKTtcclxuICAgICAgICB0aGlzWzFdID0geSAqIE1hdGguY29zKEEpICsgeCAqIE1hdGguc2luKEEpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG4gICAgZG90KGI6ICR7VkFyZ30pOiBudW1iZXIge1xyXG4gICAgICBjb25zdCByZXQgPSAke3Vucm9sbEpvaW4oXCJ0aGlzWyQkXSpiWyQkXVwiLCBcIiArIFwiKX07XHJcbiAgICAgIC8vIGFjb3Mgc2FmZSBhZGp1c3RtZW50IHRvIHByZXZlbnQgbWF0aCBkb21haW4gZXJyb3JzXHJcbiAgICAgIGlmIChyZXQgPj0gMS4wIC0gRE9UX05PUk1fU05BUF9MSU1JVCAmJiByZXQgPD0gMS4wICsgRE9UX05PUk1fU05BUF9MSU1JVCkgcmV0dXJuIDEuMDtcclxuICAgICAgaWYgKHJldCA+PSAtMS4wIC0gRE9UX05PUk1fU05BUF9MSU1JVCAmJiByZXQgPD0gLTEuMCArIERPVF9OT1JNX1NOQVBfTElNSVQpIHJldHVybiAtMS4wO1xyXG4gICAgICByZXR1cm4gcmV0O1xyXG4gICAgfVxyXG4gICAgXHJcbiR7QXJyYXkuZnJvbShJbmRleFJhbmdlKHZlY3NpemUpIGFzIEl0ZXJhYmxlPG51bWJlcj4pXHJcbiAgLm1hcCgoaSkgPT4ge1xyXG4gICAgbGV0IHMyID0gXCJcIjtcclxuICAgIGxldCBheGVzID0gXCJYWVpXXCI7XHJcbiAgICBzMiArPSBgICAgIGxvYWQke2F4ZXMuc2xpY2UoMCwgaSArIDEpfWA7XHJcbiAgICBzMiArPSBcIihcIjtcclxuICAgIHMyICs9IEFycmF5LmZyb20oYXhlcylcclxuICAgICAgLnNsaWNlKDAsIGkgKyAxKVxyXG4gICAgICAubWFwKChhKSA9PiBhLnRvTG93ZXJDYXNlKCkgKyBcIjogbnVtYmVyXCIpXHJcbiAgICAgIC5qb2luKFwiLCBcIik7XHJcbiAgICBzMiArPSBcIikge1xcblwiO1xyXG4gICAgczIgKz1cclxuICAgICAgQXJyYXkuZnJvbShheGVzKVxyXG4gICAgICAgIC5zbGljZSgwLCBpICsgMSlcclxuICAgICAgICAubWFwKChhLCBqKSA9PiBgICAgICAgdGhpc1ske2p9XSA9ICR7YS50b0xvd2VyQ2FzZSgpfWApXHJcbiAgICAgICAgLmpvaW4oXCJcXG5cIikgKyBcIlxcblwiO1xyXG4gICAgczIgKz0gXCIgICAgICByZXR1cm4gdGhpc1xcblwiO1xyXG4gICAgczIgKz0gXCIgICAgfVwiO1xyXG4gICAgcmV0dXJuIFwiICAgIFwiICsgczIudHJpbSgpO1xyXG4gIH0pXHJcbiAgLmpvaW4oXCJcXG5cIil9XHJcblxyXG4gICAgc3dhcEF4ZXMoYXhpczE6ICR7aW5kZXhUeXBlfSwgYXhpczI6ICR7aW5kZXhUeXBlfSkge1xyXG4gICAgICBjb25zdCB0ID0gdGhpc1theGlzMV07XHJcbiAgICAgIHRoaXNbYXhpczFdID0gdGhpc1theGlzMl07XHJcbiAgICAgIHRoaXNbYXhpczJdID0gdDtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIHNvbWV3aGF0IGNyYXBweSBzcGhlcmljYWwgaW50ZXJwb2xhdGlvbiAqL1xyXG4gICAgc2ludGVycCh2MjogdGhpcywgdDogbnVtYmVyKSB7XHJcbiAgICAgIGxldCBsMSA9IHRoaXMudmVjdG9yTGVuZ3RoKCk7XHJcbiAgICAgIGxldCBsMiA9IHYyLnZlY3Rvckxlbmd0aCgpO1xyXG5cclxuICAgICAgLy9YWFggdGhpcyBzZWVtcyBob3JyaWJseSBpbmNvcnJlY3QuXHJcbiAgICAgIHJldHVybiB0aGlzLmludGVycCh2MiwgdClcclxuICAgICAgICAubm9ybWFsaXplKClcclxuICAgICAgICAubXVsU2NhbGFyKGwxICsgKGwyIC0gbDEpICogdCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIHBlcnBlbmRpY3VsYXIgc3dhcCAqL1xyXG4gICAgcGVycFN3YXAoYXhpczE6ICR7aW5kZXhUeXBlfSA9IDAsIGF4aXMyOiAke2luZGV4VHlwZX0gPSAxLCBzaWduID0gMSkge1xyXG4gICAgICBsZXQgdG1wID0gdGhpc1theGlzMV07XHJcbiAgICAgIHRoaXNbYXhpczFdID0gdGhpc1theGlzMl0gKiBzaWduO1xyXG4gICAgICB0aGlzW2F4aXMyXSA9IC10bXAgKiBzaWduO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBub3JtYWxpemUoKTogdGhpcyB7XHJcbiAgICAgIGNvbnN0IGwgPSB0aGlzLnZlY3Rvckxlbmd0aCgpO1xyXG4gICAgICBpZiAobCA+IDAuMDAwMDAwMDEpIHtcclxuICAgICAgICB0aGlzLm11bFNjYWxhcigxLjAgLyBsKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuJHttYXRyaXhWZWNNdWx0c1t2ZWNzaXplIGFzIGtleW9mIHR5cGVvZiBtYXRyaXhWZWNNdWx0c119XHJcbiR7dmVjUXVhdE11bHRzW3ZlY3NpemUgYXMga2V5b2YgdHlwZW9mIHZlY1F1YXRNdWx0c119XHJcbiR7XHJcbiAgdmVjc2l6ZSA+IDJcclxuICAgID8gYFxyXG4gICAgY3Jvc3ModjogJHtWQXJnfSkge1xyXG4gICAgICBjb25zdCB4ID0gdGhpc1sxXSAqIHZbMl0gLSB0aGlzWzJdICogdlsxXTtcclxuICAgICAgY29uc3QgeSA9IHRoaXNbMl0gKiB2WzBdIC0gdGhpc1swXSAqIHZbMl07XHJcbiAgICAgIGNvbnN0IHogPSB0aGlzWzBdICogdlsxXSAtIHRoaXNbMV0gKiB2WzBdO1xyXG5cclxuICAgICAgdGhpc1swXSA9IHg7XHJcbiAgICAgIHRoaXNbMV0gPSB5O1xyXG4gICAgICB0aGlzWzJdID0gejtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5gXHJcbiAgICA6IFwiXCJcclxufVxyXG4gICAgcHJlTm9ybWFsaXplZEFuZ2xlKHYyOiAke1ZBcmd9KSB7XHJcbiAgICAgIGxldCB0aCA9IHRoaXMuZG90KHYyKSAqIDAuOTk5OTk7XHJcbiAgICAgIHJldHVybiBNYXRoLmFjb3ModGgpO1xyXG4gICAgfVxyXG4ke3ZlY3NpemUgPT09IDMgPyBgXHJcbiAgICB0b0NTUygpIHtcclxuICAgICAgbGV0IHIgPSB+fih0aGlzWzBdKjI1NSk7XHJcbiAgICAgIGxldCBnID0gfn4odGhpc1sxXSoyNTUpO1xyXG4gICAgICBsZXQgYiA9IH5+KHRoaXNbMl0qMjU1KTtcclxuICAgICAgcmV0dXJuIFxcYHJnYihcXCR7cn0sXFwke2d9LFxcJHtifSlcXGBcclxuICAgIH1cclxuYCA6IGBgfSR7dmVjc2l6ZSA9PT0gNCA/IGBcclxuICAgIHRvQ1NTKCkge1xyXG4gICAgICBsZXQgciA9IH5+KHRoaXNbMF0qMjU1KTtcclxuICAgICAgbGV0IGcgPSB+fih0aGlzWzFdKjI1NSk7XHJcbiAgICAgIGxldCBiID0gfn4odGhpc1syXSoyNTUpO1xyXG4gICAgICByZXR1cm4gXFxgcmdiKFxcJHtyfSxcXCR7Z30sXFwke2J9LFxcJHt0aGlzWzNdfSlcXGBcclxuICAgIH1cclxuYCA6IGBgfVxyXG4gICAgbG9hZFNUUlVDVChyZWFkZXI6IFN0cnVjdFJlYWRlcjx0aGlzPikge1xyXG4gICAgICByZWFkZXIodGhpcyk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbiAgYDtcclxuICByZXR1cm4gcztcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuQ29kZSgpIHtcclxuICBsZXQgcyA9IFwiXCI7XHJcblxyXG4gIHMgKz1cclxuICAgIGBcclxuLy8gZ2VuZXJhdGVkIGJ5IGdlblZlY3Rvcm1hdGgudHNcclxuaW1wb3J0IG5zdHJ1Y3RqcyBmcm9tIFwiLi9zdHJ1Y3RcIjtcclxuaW1wb3J0IHR5cGUgeyBTdHJ1Y3RSZWFkZXIgfSBmcm9tIFwiLi9uc3RydWN0anNcIjtcclxuaW1wb3J0ICogYXMgdXRpbCBmcm9tIFwiLi91dGlsXCI7XHJcblxyXG5sZXQgdmVjX3RlbXBfbWF0czogdXRpbC5jYWNoZXJpbmc8TWF0cml4ND5cclxuXHJcbmNvbnN0IERPVF9OT1JNX1NOQVBfTElNSVQgPSAwLjAwMDAwMDAwMDAxO1xyXG5jb25zdCBGTFRfRVBTSUxPTiA9IDIuMjJlLTE2O1xyXG5cclxuZXhwb3J0IHR5cGUgVmVjdG9yTGlrZTxMRU4gZXh0ZW5kcyAwIHwgMSB8IDIgfCAzIHwgND4gPSB7XHJcbiAgLy9bUDogbnVtYmVyXTogbmV2ZXI7XHJcbiAgMDogTEVOIGV4dGVuZHMgMSB8IDIgfCAzIHwgNCA/IG51bWJlciA6IG5ldmVyO1xyXG4gIDE/OiBMRU4gZXh0ZW5kcyAyIHwgMyB8IDQgPyBudW1iZXIgOiBuZXZlcjtcclxuICAyPzogTEVOIGV4dGVuZHMgMyB8IDQgPyBudW1iZXIgOiBuZXZlcjtcclxuICAzPzogTEVOIGV4dGVuZHMgNCA/IG51bWJlciA6IG5ldmVyO1xyXG4gIGxlbmd0aDogbnVtYmVyO1xyXG59O1xyXG5cclxuZGVjbGFyZSBpbnRlcmZhY2UgSU9wZW5OdW1WZWN0b3Ige1xyXG4gIFtrOiBudW1iZXJdOiBudW1iZXI7XHJcbiAgbGVuZ3RoOiBudW1iZXI7XHJcbn1cclxuXHJcbnR5cGUgaW5kZXhVbmlvbnMgPSB7IDA6IG5ldmVyOyAxOiAwOyAyOiAwIHwgMTsgMzogMCB8IDEgfCAyOyA0OiAwIHwgMSB8IDIgfCAzIH07XHJcbnR5cGUgc3RyTnVtTWFwID0geyBcIjBcIjogMDsgXCIxXCI6IDE7IFwiMlwiOiAyOyBcIjNcIjogMzsgXCI0XCI6IDQgfTtcclxuXHJcbmV4cG9ydCB0eXBlIElOdW1WZWN0b3JMaW1pdGVkPExFTiBleHRlbmRzIDAgfCAxIHwgMiB8IDMgfCA0PiA9IHtcclxuICAvL1tQOiBudW1iZXJdOiBuZXZlcjtcclxuICAwOiBMRU4gZXh0ZW5kcyAxIHwgMiB8IDMgfCA0ID8gbnVtYmVyIDogbmV2ZXI7XHJcbiAgMT86IExFTiBleHRlbmRzIDIgfCAzIHwgNCA/IG51bWJlciA6IG5ldmVyO1xyXG4gIDI/OiBMRU4gZXh0ZW5kcyAzIHwgNCA/IG51bWJlciA6IG5ldmVyO1xyXG4gIDM/OiBMRU4gZXh0ZW5kcyA0ID8gbnVtYmVyIDogbmV2ZXI7XHJcbiAgbGVuZ3RoOiBudW1iZXI7XHJcbn07XHJcblxyXG5kZWNsYXJlIHR5cGUgSU51bVZlY3RvciA9IElPcGVuTnVtVmVjdG9yIHwgSU51bVZlY3RvckxpbWl0ZWQ8Mj4gfCBJTnVtVmVjdG9yTGltaXRlZDwzPiB8IElOdW1WZWN0b3JMaW1pdGVkPDQ+O1xyXG5cclxuZXhwb3J0IHR5cGUgSW5kZXhVbmlvbjxMIGV4dGVuZHMgMCB8IDEgfCAyIHwgMyB8IDQ+ID0gaW5kZXhVbmlvbnNbTF07XHJcblxyXG4vL3R5cGUgaW5kZXhVbmlvbnMgPSB7IDI6IDAgfCAxLCAzOiAwIHwgMSB8IDIsIDQ6IDAgfCAxIHwgMiB8IDMgfTtcclxuXHJcbmV4cG9ydCB0eXBlIE51bWJlcjEgPSAwO1xyXG5leHBvcnQgdHlwZSBOdW1iZXIyID0gMCB8IDE7XHJcbmV4cG9ydCB0eXBlIE51bWJlcjMgPSAwIHwgMSB8IDI7XHJcbmV4cG9ydCB0eXBlIE51bWJlcjQgPSAwIHwgMSB8IDIgfCAzO1xyXG5leHBvcnQgdHlwZSBOdW1iZXI1ID0gMCB8IDEgfCAyIHwgMyB8IDQ7XHJcblxyXG50eXBlIG51bWxpdHMgPSB7IDE6IDE7IDI6IDIgfCAzIHwgNDsgMzogMyB8IDQ7IDQ6IDQgfTtcclxuZXhwb3J0IHR5cGUgTnVtTGl0SGlnaGVyPEwgZXh0ZW5kcyAxIHwgMiB8IDMgfCA0PiA9IG51bWxpdHNbTF07XHJcblxyXG4vKipcclxuICogQnkgZGVzaWduIHZlY3RvcnMgZG8gbm90IGhhdmUgYSBzaW1wbGUgaW5kZXggc2lnbmF0dXJlLlxyXG4gKiBJbnN0ZWFkLCBpbmRpY2VzIHVwIHRvIExFTiB0eXBlIHRvIG51bWJlciwgd2hpbGUgaW5kaWNlcyBhYm92ZVxyXG4gKiBMRU4gdHlwZSB0byBudW1iZXIgfCB1bmRlZmluZWQuXHJcbiAqIFxyXG4gKiBUaGlzIGlzIHRvIHByZXZlbnQgbWl4aW5nIG9mIGluY29tcGF0aWJsZSB2ZWN0b3JzLlxyXG4gKlxyXG4gKiBUaGlzIGNhbiBjcmVhdGUgcHJvYmxlbXMgd2l0aCBpdGVyYXRpb24sIGZvciBleGFtcGxlOlxyXG4gKiBcclxuICogXFxgXFxgXFxgdHNcclxuICogbGV0IHYgPSBuZXcgVmVjdG9yMygpXHJcbiAqIGZvciAobGV0IGk9MDsgaTwzOyBpKyspIHtcclxuICogICAvLyB3aWxsIG5vdCB3b3JrXHJcbiAqICAgdltpXSA9IGlcclxuICogICAvLyB3aWxsIHdvcmtcclxuICogICB2W2ldID0gaSBhcyBOdW1iZXIzXHJcbiAqIH1cclxuICogXHJcbiAqIC8vYWx0ZXJuYXRpdmUgd2l0aCBJbmRleFJhbmdlOlxyXG4gKiBmb3IgKGNvbnN0IGkgb2YgSW5kZXhSYW5nZSgzKSkge1xyXG4gKiAgIHZbaV0gPSBpXHJcbiAqIH1cclxuICogXFxgXFxgXFxgXHJcbiAqL1xyXG5kZWNsYXJlIGludGVyZmFjZSBJQmFzZVZlY3RvcjxMRU4gZXh0ZW5kcyAxIHwgMiB8IDMgfCA0LCBBcnJheVR5cGUgPSBBcnJheTxudW1iZXI+PiB7XHJcbiAgLy9bUDogUCBleHRlbmRzIGluZGV4VW5pb25zW0xFTl0gPyBudW1iZXIgOiBuZXZlcl06IFAgZXh0ZW5kcyBJbmRleFVuaW9uPExFTj4gPyBudW1iZXIgOiBuZXZlcjtcclxuXHJcbiAgLy8gdHlwZSBoZWxwZXIgcGhhbnRvbSBwcm9wZXJ0eVxyXG4gIExFTj86IExFTjtcclxuICBcclxuICBsZW5ndGg6IExFTiB8IG51bWJlcjtcclxuXHJcbiAgLy8gZm9yIGluZGljZXMgYWJvdmUgTEVOLCB0eXBlIHRvIG51bWJlciB8IHVuZGVmaW5lZFxyXG4gIFtrOiBudW1iZXJdOiBudW1iZXIgfCB1bmRlZmluZWQ7XHJcbiAgXHJcbiAgLy8gZm9yIGluZGljZXMgdXAgdG8gTEVOLCB0eXBlIHRvIG51bWJlclxyXG4gIDA6IExFTiBleHRlbmRzIDEgfCAyIHwgMyB8IDQgPyBudW1iZXIgOiBuZXZlcjtcclxuICAxOiBMRU4gZXh0ZW5kcyAyIHwgMyB8IDQgPyBudW1iZXIgOiBuZXZlcjtcclxuICAyOiBMRU4gZXh0ZW5kcyAzIHwgNCA/IG51bWJlciA6IG5ldmVyO1xyXG4gIDM6IExFTiBleHRlbmRzIDQgPyBudW1iZXIgOiBuZXZlcjtcclxuXHJcbiAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8bnVtYmVyPjtcclxuXHJcbiAgc2ludGVycChiOiBJQmFzZVZlY3RvcjxOdW1MaXRIaWdoZXI8TEVOPj4sIHQ6IG51bWJlcik6IHRoaXM7XHJcblxyXG4gIHBlcnBTd2FwKGF4aXMxPzogbnVtYmVyLCBheGlzMj86IG51bWJlciwgc2lnbj86IG51bWJlcik6IHRoaXM7XHJcblxyXG4gIC8vYWxsIG1hdGggb3BlcmF0ZXMgaW4tcGxhY2UsIG5vIG5ldyBvYmplY3RzXHJcbiAgbG9hZChiOiBJQmFzZVZlY3RvcjxOdW1MaXRIaWdoZXI8TEVOPj4gfCBJTnVtVmVjdG9yKTogdGhpcztcclxuXHJcbiAgbG9hZFhZKHg6IG51bWJlciwgeTogbnVtYmVyKTogdGhpcztcclxuXHJcbiAgY29weSgpOiB0aGlzO1xyXG5cclxuICBhZGQoYjogSUJhc2VWZWN0b3I8TnVtTGl0SGlnaGVyPExFTj4+KTogdGhpcztcclxuICBzdWIoYjogSUJhc2VWZWN0b3I8TnVtTGl0SGlnaGVyPExFTj4+KTogdGhpcztcclxuICBtdWwoYjogSUJhc2VWZWN0b3I8TnVtTGl0SGlnaGVyPExFTj4+KTogdGhpcztcclxuICBkaXYoYjogSUJhc2VWZWN0b3I8TnVtTGl0SGlnaGVyPExFTj4+KTogdGhpcztcclxuICBhZGRTY2FsYXIoYjogbnVtYmVyKTogdGhpcztcclxuICBzdWJTY2FsYXIoYjogbnVtYmVyKTogdGhpcztcclxuICBtdWxTY2FsYXIoYjogbnVtYmVyKTogdGhpcztcclxuICBkaXZTY2FsYXIoYjogbnVtYmVyKTogdGhpcztcclxuICBtaW5TY2FsYXIoYjogbnVtYmVyKTogdGhpcztcclxuICBtYXhTY2FsYXIoYjogbnVtYmVyKTogdGhpcztcclxuICBtaW4oYjogSUJhc2VWZWN0b3I8TnVtTGl0SGlnaGVyPExFTj4+KTogdGhpcztcclxuICBtYXgoYjogSUJhc2VWZWN0b3I8TnVtTGl0SGlnaGVyPExFTj4+KTogdGhpcztcclxuICBmbG9vcigpOiB0aGlzO1xyXG4gIGZyYWN0KCk6IHRoaXM7XHJcbiAgY2VpbCgpOiB0aGlzO1xyXG4gIGFicygpOiB0aGlzO1xyXG4gIGRvdChiOiBJQmFzZVZlY3RvcjxOdW1MaXRIaWdoZXI8TEVOPj4pOiBudW1iZXI7XHJcbiAgbm9ybWFsaXplKCk6IHRoaXM7XHJcbiAgdmVjdG9yTGVuZ3RoKCk6IG51bWJlcjtcclxuICB2ZWN0b3JMZW5ndGhTcXIoKTogbnVtYmVyO1xyXG4gIHZlY3RvckRpc3RhbmNlKGI6IElCYXNlVmVjdG9yPE51bUxpdEhpZ2hlcjxMRU4+Pik6IG51bWJlcjtcclxuICB2ZWN0b3JEaXN0YW5jZVNxcihiOiBJQmFzZVZlY3RvcjxOdW1MaXRIaWdoZXI8TEVOPj4pOiBudW1iZXI7XHJcbiAgbXVsdFZlY01hdHJpeChtYXQ6IE1hdHJpeDQpOiB2b2lkO1xyXG4gIGludGVycChiOiBJQmFzZVZlY3RvcjxOdW1MaXRIaWdoZXI8TEVOPj4sIGZhYzogbnVtYmVyKTogdGhpcztcclxuICBhZGRGYWMoYjogSUJhc2VWZWN0b3I8TnVtTGl0SGlnaGVyPExFTj4+LCBmYWM6IG51bWJlcik6IHRoaXM7XHJcbiAgcm90MmQodGg6IG51bWJlciwgYXhpcz86IG51bWJlciB8IHVuZGVmaW5lZCk6IHRoaXM7XHJcbiAgemVybygpOiB0aGlzO1xyXG4gIG5lZ2F0ZSgpOiB0aGlzO1xyXG4gIHN3YXBBeGVzKGF4aXMxOiBudW1iZXIsIGF4aXMyOiBudW1iZXIpOiB0aGlzO1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBWZWN0b3JMaWtlT3JIaWdoZXI8TEVOIGV4dGVuZHMgMiB8IDMgfCA0LCBUeXBlID0gbmV2ZXI+ID0gVHlwZSB8IElCYXNlVmVjdG9yPE51bUxpdEhpZ2hlcjxMRU4+PjtcclxuZXhwb3J0IHR5cGUgSVZlY3Rvck9ySGlnaGVyPExFTiBleHRlbmRzIDIgfCAzIHwgNCwgVHlwZSA9IG5ldmVyPiA9IFZlY3Rvckxpa2VPckhpZ2hlcjxMRU4sIFR5cGU+XHJcblxyXG5leHBvcnQgdHlwZSBJUXVhdCA9IElCYXNlVmVjdG9yPDQ+ICYge1xyXG4gIGF4aXNBbmdsZVRvUXVhdChheGlzOiBWZWN0b3JMaWtlT3JIaWdoZXI8Mz4sIGFuZ2xlOiBudW1iZXIpOiBJUXVhdDtcclxuICB0b01hdHJpeChvdXRwdXQ/OiBNYXRyaXg0KTogTWF0cml4NDtcclxufTtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVZlY3RvcjIgZXh0ZW5kcyBJQmFzZVZlY3RvcjwyPiB7fVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJVmVjdG9yMyBleHRlbmRzIElCYXNlVmVjdG9yPDM+IHtcclxuICBsb2FkWFlaKHg6IG51bWJlciwgeTogbnVtYmVyLCB6OiBudW1iZXIpOiB0aGlzO1xyXG5cclxuICBjcm9zcyhiOiBWZWN0b3JMaWtlT3JIaWdoZXI8Mz4pOiB0aGlzO1xyXG4gIGxvYWQyKGI6IFZlY3RvcjIpOiB0aGlzO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElWZWN0b3I0IGV4dGVuZHMgSUJhc2VWZWN0b3I8ND4ge1xyXG4gIGxvYWRYWVooeDogbnVtYmVyLCB5OiBudW1iZXIsIHo6IG51bWJlcik6IHRoaXM7XHJcbiAgbG9hZFhZWlcoeDogbnVtYmVyLCB5OiBudW1iZXIsIHo6IG51bWJlciwgdzogbnVtYmVyKTogdGhpcztcclxuXHJcbiAgbG9hZDIoYjogVmVjdG9yMik6IHRoaXM7XHJcbiAgbG9hZDMoYjogVmVjdG9yMyk6IHRoaXM7XHJcblxyXG4gIGNyb3NzKGI6IFZlY3Rvckxpa2VPckhpZ2hlcjw0Pik6IHRoaXM7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZGVjbGFyZSBpbnRlcmZhY2UgSVZlY3RvckNvbnN0cnVjdG9yPFR5cGUsIExFTiBleHRlbmRzIDIgfCAzIHwgNCA9IDM+IHtcclxuICBuZXcgKHZhbHVlPzogbnVtYmVyW10gfCBUeXBlIHwgVmVjdG9yTGlrZU9ySGlnaGVyPExFTj4pOiBUeXBlO1xyXG5cclxuICAvKiogfChhIC0gY2VudGVyKXwgZG90IHwoYiAtIGNlbnRlcil8ICovXHJcbiAgbm9ybWFsaXplZERvdDMoXHJcbiAgICBhOiBWZWN0b3JMaWtlT3JIaWdoZXI8TEVOLCBUeXBlPixcclxuICAgIGNlbnRlcjogVmVjdG9yTGlrZU9ySGlnaGVyPExFTiwgVHlwZT4sXHJcbiAgICBiOiBWZWN0b3JMaWtlT3JIaWdoZXI8TEVOLCBUeXBlPlxyXG4gICk6IG51bWJlcjtcclxuXHJcbiAgLyoqIHwoYiAtIGEpfCBkb3QgfChkIC0gYyl8ICovXHJcbiAgbm9ybWFsaXplZERvdDQoXHJcbiAgICBhOiBWZWN0b3JMaWtlT3JIaWdoZXI8TEVOLCBUeXBlPixcclxuICAgIGI6IFZlY3Rvckxpa2VPckhpZ2hlcjxMRU4sIFR5cGU+LFxyXG4gICAgYzogVmVjdG9yTGlrZU9ySGlnaGVyPExFTiwgVHlwZT4sXHJcbiAgICBkOiBWZWN0b3JMaWtlT3JIaWdoZXI8TEVOLCBUeXBlPlxyXG4gICk6IG51bWJlcjtcclxuXHJcbiAgc3RydWN0TmFtZT86IHN0cmluZztcclxuICBTVFJVQ1Q/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmNvbnN0IE1fU1FSVDIgPSBNYXRoLlNRUlQyXHJcbmNvbnN0IFBJID0gTWF0aC5QSVxyXG5cclxuICBgLnRyaW0oKSArIFwiXFxuXCI7XHJcblxyXG4gIGZvciAobGV0IGkgPSAyOyBpIDw9IDQ7IGkrKykge1xyXG4gICAgcyArPSBnZW5CYXNlKEJhc2VWZWN0b3IsIFwiVmVjdG9yXCIsIGkpO1xyXG4gIH1cclxuXHJcbiAgcyArPSBgXHJcbmV4cG9ydCBjb25zdCBWZWN0b3IyID0gY3JlYXRlVmVjdG9yMihBcnJheSwgJ3ZlYzInKTtcclxuZXhwb3J0IGNvbnN0IFZlY3RvcjMgPSBjcmVhdGVWZWN0b3IzKEFycmF5LCAndmVjMycpO1xyXG5leHBvcnQgY29uc3QgVmVjdG9yNCA9IGNyZWF0ZVZlY3RvcjQoQXJyYXksICd2ZWM0Jyk7XHJcbmV4cG9ydCB0eXBlIFZlY3RvcjIgPSBJbnN0YW5jZVR5cGU8dHlwZW9mIFZlY3RvcjI+O1xyXG5leHBvcnQgdHlwZSBWZWN0b3IzID0gSW5zdGFuY2VUeXBlPHR5cGVvZiBWZWN0b3IzPjtcclxuZXhwb3J0IHR5cGUgVmVjdG9yNCA9IEluc3RhbmNlVHlwZTx0eXBlb2YgVmVjdG9yND47XHJcblxyXG5jb25zdCBfcXVhdF92czNfdGVtcHMgPSB1dGlsLmNhY2hlcmluZy5mcm9tQ29uc3RydWN0b3IoVmVjdG9yMywgNjQpO1xyXG5cclxuZXhwb3J0IGNsYXNzIFF1YXQgZXh0ZW5kcyBWZWN0b3I0IHtcclxuICBtYWtlVW5pdFF1YXQoKTogdGhpcyB7XHJcbiAgICB0aGlzWzBdID0gMS4wO1xyXG4gICAgdGhpc1sxXSA9IHRoaXNbMl0gPSB0aGlzWzNdID0gMC4wO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBpc1plcm8oKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gdGhpc1swXSA9PT0gMCAmJiB0aGlzWzFdID09PSAwICYmIHRoaXNbMl0gPT09IDAgJiYgdGhpc1szXSA9PT0gMDtcclxuICB9XHJcblxyXG4gIG11bFF1YXQocXQ6IHRoaXMpIHtcclxuICAgIGxldCBhID0gdGhpc1swXSAqIHF0WzBdIC0gdGhpc1sxXSAqIHF0WzFdIC0gdGhpc1syXSAqIHF0WzJdIC0gdGhpc1szXSAqIHF0WzNdO1xyXG4gICAgbGV0IGIgPSB0aGlzWzBdICogcXRbMV0gKyB0aGlzWzFdICogcXRbMF0gKyB0aGlzWzJdICogcXRbM10gLSB0aGlzWzNdICogcXRbMl07XHJcbiAgICBsZXQgYyA9IHRoaXNbMF0gKiBxdFsyXSArIHRoaXNbMl0gKiBxdFswXSArIHRoaXNbM10gKiBxdFsxXSAtIHRoaXNbMV0gKiBxdFszXTtcclxuICAgIHRoaXNbM10gPSB0aGlzWzBdICogcXRbM10gKyB0aGlzWzNdICogcXRbMF0gKyB0aGlzWzFdICogcXRbMl0gLSB0aGlzWzJdICogcXRbMV07XHJcbiAgICB0aGlzWzBdID0gYTtcclxuICAgIHRoaXNbMV0gPSBiO1xyXG4gICAgdGhpc1syXSA9IGM7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIGNvbmp1Z2F0ZSgpOiB0aGlzIHtcclxuICAgIHRoaXNbMV0gPSAtdGhpc1sxXTtcclxuICAgIHRoaXNbMl0gPSAtdGhpc1syXTtcclxuICAgIHRoaXNbM10gPSAtdGhpc1szXTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgZG90V2l0aFF1YXQocTI6IHRoaXMpIHtcclxuICAgIHJldHVybiB0aGlzWzBdICogcTJbMF0gKyB0aGlzWzFdICogcTJbMV0gKyB0aGlzWzJdICogcTJbMl0gKyB0aGlzWzNdICogcTJbM107XHJcbiAgfVxyXG5cclxuICBjYW5JbnZlcnQoKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gdGhpcy5kb3QodGhpcykgIT09IDAuMFxyXG4gIH1cclxuXHJcbiAgaW52ZXJ0KCk6IHRoaXMge1xyXG4gICAgbGV0IGYgPSB0aGlzLmRvdCh0aGlzKTtcclxuICAgIGlmIChmID09PSAwLjApIHJldHVybiB0aGlzO1xyXG5cclxuICAgIHRoaXMubXVsU2NhbGFyKDEuMCAvIGYpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBzdWIocTI6IHRoaXMpOiB0aGlzIHtcclxuICAgIGxldCBucTIgPSBuZXcgUXVhdCgpO1xyXG5cclxuICAgIG5xMlswXSA9IC1xMlswXTtcclxuICAgIG5xMlsxXSA9IHEyWzFdO1xyXG4gICAgbnEyWzJdID0gcTJbMl07XHJcbiAgICBucTJbM10gPSBxMlszXTtcclxuXHJcbiAgICB0aGlzLm11bChucTIgYXMgdGhpcyk7XHJcbiAgICByZXR1cm4gdGhpc1xyXG4gIH1cclxuXHJcbiAgLyoqIGlmIG0gaXMgbm90IHVuZGVmaW5lZCwgd2lsbCBiZSB1c2VkIGFzIG91dHB1dCAqL1xyXG4gIHRvTWF0cml4KG0/OiBNYXRyaXg0KTogTWF0cml4NCB7XHJcbiAgICBpZiAobSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIG0gPSBuZXcgTWF0cml4NCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBxMCA9IE1fU1FSVDIgKiB0aGlzWzBdO1xyXG4gICAgbGV0IHExID0gTV9TUVJUMiAqIHRoaXNbMV07XHJcbiAgICBsZXQgcTIgPSBNX1NRUlQyICogdGhpc1syXTtcclxuICAgIGxldCBxMyA9IE1fU1FSVDIgKiB0aGlzWzNdO1xyXG4gICAgbGV0IHFkYSA9IHEwICogcTE7XHJcbiAgICBsZXQgcWRiID0gcTAgKiBxMjtcclxuICAgIGxldCBxZGMgPSBxMCAqIHEzO1xyXG4gICAgbGV0IHFhYSA9IHExICogcTE7XHJcbiAgICBsZXQgcWFiID0gcTEgKiBxMjtcclxuICAgIGxldCBxYWMgPSBxMSAqIHEzO1xyXG4gICAgbGV0IHFiYiA9IHEyICogcTI7XHJcbiAgICBsZXQgcWJjID0gcTIgKiBxMztcclxuICAgIGxldCBxY2MgPSBxMyAqIHEzO1xyXG4gICAgbS4kbWF0cml4Lm0xMSA9IDEuMCAtIHFiYiAtIHFjYztcclxuICAgIG0uJG1hdHJpeC5tMTIgPSBxZGMgKyBxYWI7XHJcbiAgICBtLiRtYXRyaXgubTEzID0gLXFkYiArIHFhYztcclxuICAgIG0uJG1hdHJpeC5tMTQgPSAwLjA7XHJcbiAgICBtLiRtYXRyaXgubTIxID0gLXFkYyArIHFhYjtcclxuICAgIG0uJG1hdHJpeC5tMjIgPSAxLjAgLSBxYWEgLSBxY2M7XHJcbiAgICBtLiRtYXRyaXgubTIzID0gcWRhICsgcWJjO1xyXG4gICAgbS4kbWF0cml4Lm0yNCA9IDAuMDtcclxuICAgIG0uJG1hdHJpeC5tMzEgPSBxZGIgKyBxYWM7XHJcbiAgICBtLiRtYXRyaXgubTMyID0gLXFkYSArIHFiYztcclxuICAgIG0uJG1hdHJpeC5tMzMgPSAxLjAgLSBxYWEgLSBxYmI7XHJcbiAgICBtLiRtYXRyaXgubTM0ID0gMC4wO1xyXG4gICAgbS4kbWF0cml4Lm00MSA9IG0uJG1hdHJpeC5tNDIgPSBtLiRtYXRyaXgubTQzID0gMC4wO1xyXG4gICAgbS4kbWF0cml4Lm00NCA9IDEuMDtcclxuXHJcbiAgICByZXR1cm4gbTtcclxuICB9XHJcblxyXG4gIG1hdHJpeFRvUXVhdCh3bWF0OiBNYXRyaXg0KTogdGhpcyB7XHJcbiAgICBsZXQgbWF0ID0gdmVjX3RlbXBfbWF0cy5uZXh0KCk7XHJcbiAgICBtYXQubG9hZCh3bWF0KTtcclxuXHJcbiAgICBtYXQuJG1hdHJpeC5tNDEgPSBtYXQuJG1hdHJpeC5tNDIgPSBtYXQuJG1hdHJpeC5tNDMgPSAwO1xyXG4gICAgbWF0LiRtYXRyaXgubTQ0ID0gMS4wO1xyXG5cclxuICAgIGxldCByMSA9IG5ldyBWZWN0b3IzKFttYXQuJG1hdHJpeC5tMTEsIG1hdC4kbWF0cml4Lm0xMiwgbWF0LiRtYXRyaXgubTEzXSk7XHJcbiAgICBsZXQgcjIgPSBuZXcgVmVjdG9yMyhbbWF0LiRtYXRyaXgubTIxLCBtYXQuJG1hdHJpeC5tMjIsIG1hdC4kbWF0cml4Lm0yM10pO1xyXG4gICAgbGV0IHIzID0gbmV3IFZlY3RvcjMoW21hdC4kbWF0cml4Lm0zMSwgbWF0LiRtYXRyaXgubTMyLCBtYXQuJG1hdHJpeC5tMzNdKTtcclxuXHJcbiAgICByMS5ub3JtYWxpemUoKTtcclxuICAgIHIyLm5vcm1hbGl6ZSgpO1xyXG4gICAgcjMubm9ybWFsaXplKCk7XHJcblxyXG4gICAgbWF0LiRtYXRyaXgubTExID0gcjFbMF07XHJcbiAgICBtYXQuJG1hdHJpeC5tMTIgPSByMVsxXTtcclxuICAgIG1hdC4kbWF0cml4Lm0xMyA9IHIxWzJdO1xyXG4gICAgbWF0LiRtYXRyaXgubTIxID0gcjJbMF07XHJcbiAgICBtYXQuJG1hdHJpeC5tMjIgPSByMlsxXTtcclxuICAgIG1hdC4kbWF0cml4Lm0yMyA9IHIyWzJdO1xyXG4gICAgbWF0LiRtYXRyaXgubTMxID0gcjNbMF07XHJcbiAgICBtYXQuJG1hdHJpeC5tMzIgPSByM1sxXTtcclxuICAgIG1hdC4kbWF0cml4Lm0zMyA9IHIzWzJdO1xyXG4gICAgbGV0IHRyID0gMC4yNSAqICgxLjAgKyBtYXQuJG1hdHJpeC5tMTEgKyBtYXQuJG1hdHJpeC5tMjIgKyBtYXQuJG1hdHJpeC5tMzMpO1xyXG4gICAgbGV0IHMgPSAwO1xyXG4gICAgaWYgKHRyID4gRkxUX0VQU0lMT04pIHtcclxuICAgICAgcyA9IE1hdGguc3FydCh0cik7XHJcbiAgICAgIHRoaXNbMF0gPSBzO1xyXG4gICAgICBzID0gMS4wIC8gKDQuMCAqIHMpO1xyXG4gICAgICB0aGlzWzFdID0gKG1hdC4kbWF0cml4Lm0yMyAtIG1hdC4kbWF0cml4Lm0zMikgKiBzO1xyXG4gICAgICB0aGlzWzJdID0gKG1hdC4kbWF0cml4Lm0zMSAtIG1hdC4kbWF0cml4Lm0xMykgKiBzO1xyXG4gICAgICB0aGlzWzNdID0gKG1hdC4kbWF0cml4Lm0xMiAtIG1hdC4kbWF0cml4Lm0yMSkgKiBzO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaWYgKG1hdC4kbWF0cml4Lm0xMSA+IG1hdC4kbWF0cml4Lm0yMiAmJiBtYXQuJG1hdHJpeC5tMTEgPiBtYXQuJG1hdHJpeC5tMzMpIHtcclxuICAgICAgICBzID0gMi4wICogTWF0aC5zcXJ0KDEuMCArIG1hdC4kbWF0cml4Lm0xMSAtIG1hdC4kbWF0cml4Lm0yMiAtIG1hdC4kbWF0cml4Lm0zMyk7XHJcbiAgICAgICAgdGhpc1sxXSA9IDAuMjUgKiBzO1xyXG4gICAgICAgIHMgPSAxLjAgLyBzO1xyXG4gICAgICAgIHRoaXNbMF0gPSAobWF0LiRtYXRyaXgubTMyIC0gbWF0LiRtYXRyaXgubTIzKSAqIHM7XHJcbiAgICAgICAgdGhpc1syXSA9IChtYXQuJG1hdHJpeC5tMjEgKyBtYXQuJG1hdHJpeC5tMTIpICogcztcclxuICAgICAgICB0aGlzWzNdID0gKG1hdC4kbWF0cml4Lm0zMSArIG1hdC4kbWF0cml4Lm0xMykgKiBzO1xyXG4gICAgICB9IGVsc2UgaWYgKG1hdC4kbWF0cml4Lm0yMiA+IG1hdC4kbWF0cml4Lm0zMykge1xyXG4gICAgICAgIHMgPSAyLjAgKiBNYXRoLnNxcnQoMS4wICsgbWF0LiRtYXRyaXgubTIyIC0gbWF0LiRtYXRyaXgubTExIC0gbWF0LiRtYXRyaXgubTMzKTtcclxuICAgICAgICB0aGlzWzJdID0gMC4yNSAqIHM7XHJcbiAgICAgICAgcyA9IDEuMCAvIHM7XHJcbiAgICAgICAgdGhpc1swXSA9IChtYXQuJG1hdHJpeC5tMzEgLSBtYXQuJG1hdHJpeC5tMTMpICogcztcclxuICAgICAgICB0aGlzWzFdID0gKG1hdC4kbWF0cml4Lm0yMSArIG1hdC4kbWF0cml4Lm0xMikgKiBzO1xyXG4gICAgICAgIHRoaXNbM10gPSAobWF0LiRtYXRyaXgubTMyICsgbWF0LiRtYXRyaXgubTIzKSAqIHM7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcyA9IDIuMCAqIE1hdGguc3FydCgxLjAgKyBtYXQuJG1hdHJpeC5tMzMgLSBtYXQuJG1hdHJpeC5tMTEgLSBtYXQuJG1hdHJpeC5tMjIpO1xyXG4gICAgICAgIHRoaXNbM10gPSAwLjI1ICogcztcclxuICAgICAgICBzID0gMS4wIC8gcztcclxuICAgICAgICB0aGlzWzBdID0gKG1hdC4kbWF0cml4Lm0yMSAtIG1hdC4kbWF0cml4Lm0xMikgKiBzO1xyXG4gICAgICAgIHRoaXNbMV0gPSAobWF0LiRtYXRyaXgubTMxICsgbWF0LiRtYXRyaXgubTEzKSAqIHM7XHJcbiAgICAgICAgdGhpc1syXSA9IChtYXQuJG1hdHJpeC5tMzIgKyBtYXQuJG1hdHJpeC5tMjMpICogcztcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgdGhpcy5ub3JtYWxpemUoKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgbm9ybWFsaXplKCkge1xyXG4gICAgbGV0IGxlbiA9IE1hdGguc3FydCh0aGlzLmRvdCh0aGlzKSk7XHJcblxyXG4gICAgaWYgKGxlbiAhPT0gMC4wKSB7XHJcbiAgICAgIHRoaXMubXVsU2NhbGFyKDEuMCAvIGxlbik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzWzFdID0gMS4wO1xyXG4gICAgICB0aGlzWzBdID0gdGhpc1syXSA9IHRoaXNbM10gPSAwLjA7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIGF4aXNBbmdsZVRvUXVhdChheGlzOiBWZWN0b3JMaWtlT3JIaWdoZXI8MywgVmVjdG9yMz4sIGFuZ2xlOiBudW1iZXIpIHtcclxuICAgIGxldCBub3IgPSBfcXVhdF92czNfdGVtcHMubmV4dCgpLmxvYWQoYXhpcyk7XHJcbiAgICBub3Iubm9ybWFsaXplKCk7XHJcblxyXG4gICAgaWYgKG5vci5kb3Qobm9yKSAhPT0gMC4wKSB7XHJcbiAgICAgIGxldCBwaGkgPSBhbmdsZSAvIDIuMDtcclxuICAgICAgbGV0IHNpID0gTWF0aC5zaW4ocGhpKTtcclxuICAgICAgdGhpc1swXSA9IE1hdGguY29zKHBoaSk7XHJcbiAgICAgIHRoaXNbMV0gPSBub3JbMF0gKiBzaTtcclxuICAgICAgdGhpc1syXSA9IG5vclsxXSAqIHNpO1xyXG4gICAgICB0aGlzWzNdID0gbm9yWzJdICogc2k7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLm1ha2VVbml0UXVhdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgcm90YXRpb25CZXR3ZWVuVmVjcyh2MV86IFZlY3Rvckxpa2VPckhpZ2hlcjwzLCBWZWN0b3IzPiwgdjJfOiBWZWN0b3JMaWtlT3JIaWdoZXI8MywgVmVjdG9yMz4sIGZhYyA9IDEuMCkge1xyXG4gICAgY29uc3QgdjEgPSBuZXcgVmVjdG9yMyh2MV8pO1xyXG4gICAgY29uc3QgdjIgPSBuZXcgVmVjdG9yMyh2Ml8pO1xyXG4gICAgdjEubm9ybWFsaXplKCk7XHJcbiAgICB2Mi5ub3JtYWxpemUoKTtcclxuXHJcbiAgICBpZiAoTWF0aC5hYnModjEuZG90KHYyKSkgPiAwLjk5OTkpIHtcclxuICAgICAgdGhpcy5tYWtlVW5pdFF1YXQoKTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGF4aXMgPSBuZXcgVmVjdG9yMyh2MSk7XHJcbiAgICBheGlzLmNyb3NzKHYyKTtcclxuXHJcbiAgICBsZXQgYW5nbGUgPSB2MS5wcmVOb3JtYWxpemVkQW5nbGUodjIpICogZmFjO1xyXG4gICAgdGhpcy5heGlzQW5nbGVUb1F1YXQoYXhpcywgYW5nbGUpO1xyXG5cclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgcXVhdEludGVycChxdWF0MjogdGhpcywgdDogbnVtYmVyKSB7XHJcbiAgICBsZXQgcXVhdCA9IG5ldyBRdWF0KCk7XHJcbiAgICBsZXQgY29zb20gPSB0aGlzWzBdICogcXVhdDJbMF0gKyB0aGlzWzFdICogcXVhdDJbMV0gKyB0aGlzWzJdICogcXVhdDJbMl0gKyB0aGlzWzNdICogcXVhdDJbM107XHJcbiAgICBpZiAoY29zb20gPCAwLjApIHtcclxuICAgICAgY29zb20gPSAtY29zb207XHJcbiAgICAgIHF1YXRbMF0gPSAtdGhpc1swXTtcclxuICAgICAgcXVhdFsxXSA9IC10aGlzWzFdO1xyXG4gICAgICBxdWF0WzJdID0gLXRoaXNbMl07XHJcbiAgICAgIHF1YXRbM10gPSAtdGhpc1szXTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHF1YXRbMF0gPSB0aGlzWzBdO1xyXG4gICAgICBxdWF0WzFdID0gdGhpc1sxXTtcclxuICAgICAgcXVhdFsyXSA9IHRoaXNbMl07XHJcbiAgICAgIHF1YXRbM10gPSB0aGlzWzNdO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBvbWVnYSwgc2lub20sIHNjMSwgc2MyO1xyXG4gICAgaWYgKDEuMCAtIGNvc29tID4gMC4wMDAxKSB7XHJcbiAgICAgIG9tZWdhID0gTWF0aC5hY29zKGNvc29tKTtcclxuICAgICAgc2lub20gPSBNYXRoLnNpbihvbWVnYSk7XHJcbiAgICAgIHNjMSA9IE1hdGguc2luKCgxLjAgLSB0KSAqIG9tZWdhKSAvIHNpbm9tO1xyXG4gICAgICBzYzIgPSBNYXRoLnNpbih0ICogb21lZ2EpIC8gc2lub207XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzYzEgPSAxLjAgLSB0O1xyXG4gICAgICBzYzIgPSB0O1xyXG4gICAgfVxyXG4gICAgdGhpc1swXSA9IHNjMSAqIHF1YXRbMF0gKyBzYzIgKiBxdWF0MlswXTtcclxuICAgIHRoaXNbMV0gPSBzYzEgKiBxdWF0WzFdICsgc2MyICogcXVhdDJbMV07XHJcbiAgICB0aGlzWzJdID0gc2MxICogcXVhdFsyXSArIHNjMiAqIHF1YXQyWzJdO1xyXG4gICAgdGhpc1szXSA9IHNjMSAqIHF1YXRbM10gKyBzYzIgKiBxdWF0MlszXTtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcbn1cclxuXHJcblF1YXQuU1RSVUNUID1cclxuICBuc3RydWN0anMuaW5oZXJpdChRdWF0LCBWZWN0b3I0LCBcInF1YXRcIikgK1xyXG4gIFxcYFxyXG59XFxgO1xyXG5uc3RydWN0anMucmVnaXN0ZXIoUXVhdCk7YDtcclxuICBzICs9IE1hdHJpeDRDb2RlO1xyXG4gIHMgKz0gYHZlY190ZW1wX21hdHMgPSB1dGlsLmNhY2hlcmluZy5mcm9tQ29uc3RydWN0b3IoTWF0cml4NCwgNjQpO1xcbmBcclxuXHJcbiAgY29uc29sZS5sb2cocyk7XHJcbiAgZnMud3JpdGVGaWxlU3luYyhcInZlY3Rvcm1hdGgudHNcIiwgcyk7XHJcbn1cclxuZ2VuQ29kZSgpO1xyXG4iLCAiZnVuY3Rpb24gX2NsYXNzX2NhbGxfY2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7XG4gICAgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTtcbiAgICB9XG59XG5mdW5jdGlvbiBfZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTtcbiAgICAgICAgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlO1xuICAgICAgICBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7XG4gICAgICAgIGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGRlc2NyaXB0b3Iua2V5LCBkZXNjcmlwdG9yKTtcbiAgICB9XG59XG5mdW5jdGlvbiBfY3JlYXRlX2NsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykge1xuICAgIGlmIChwcm90b1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xuICAgIGlmIChzdGF0aWNQcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTtcbiAgICByZXR1cm4gQ29uc3RydWN0b3I7XG59XG5mdW5jdGlvbiBfZGVmaW5lX3Byb3BlcnR5KG9iaiwga2V5LCB2YWx1ZSkge1xuICAgIGlmIChrZXkgaW4gb2JqKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwge1xuICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG9ialtrZXldID0gdmFsdWU7XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG52YXIgSW5kZXhSYW5nZVN0YWNrID0gW107XG52YXIgX0luZGV4UmFuZ2UgPSAvKiNfX1BVUkVfXyovIGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGZ1bmN0aW9uIF9JbmRleFJhbmdlKHN0YXJ0LCBlbmQpIHtcbiAgICAgICAgX2NsYXNzX2NhbGxfY2hlY2sodGhpcywgX0luZGV4UmFuZ2UpO1xuICAgICAgICBfZGVmaW5lX3Byb3BlcnR5KHRoaXMsIFwic3RhcnRcIiwgMCk7XG4gICAgICAgIF9kZWZpbmVfcHJvcGVydHkodGhpcywgXCJlbmRcIiwgMCk7XG4gICAgICAgIF9kZWZpbmVfcHJvcGVydHkodGhpcywgXCJpXCIsIDApO1xuICAgICAgICBfZGVmaW5lX3Byb3BlcnR5KHRoaXMsIFwicmV0XCIsIHtcbiAgICAgICAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5zdGFydCA9IHN0YXJ0O1xuICAgICAgICB0aGlzLmVuZCA9IGVuZDtcbiAgICB9XG4gICAgX2NyZWF0ZV9jbGFzcyhfSW5kZXhSYW5nZSwgW1xuICAgICAgICB7XG4gICAgICAgICAgICBrZXk6IFN5bWJvbC5pdGVyYXRvcixcbiAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbiB2YWx1ZSgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAga2V5OiBcIm5leHRcIixcbiAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbiBuZXh0KCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmkgPCB0aGlzLmVuZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJldC5kb25lID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmV0LnZhbHVlID0gdGhpcy5pKys7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJldDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZpbmlzaCgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJldC5kb25lID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucmV0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAga2V5OiBcImZpbmlzaFwiLFxuICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIGZpbmlzaCgpIHtcbiAgICAgICAgICAgICAgICBJbmRleFJhbmdlU3RhY2suY3VyLS07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGtleTogXCJyZXNldFwiLFxuICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIHJlc2V0KHN0YXJ0LCBlbmQpIHtcbiAgICAgICAgICAgICAgICB2YXIgaSA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdm9pZCAwID8gYXJndW1lbnRzWzJdIDogMDtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgICAgICAgICAgdGhpcy5lbmQgPSBlbmQ7XG4gICAgICAgICAgICAgICAgdGhpcy5pID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAga2V5OiBcInJldHVyblwiLFxuICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIF9yZXR1cm4oKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuZmluaXNoKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucmV0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgXSk7XG4gICAgcmV0dXJuIF9JbmRleFJhbmdlO1xufSgpO1xuSW5kZXhSYW5nZVN0YWNrID0gW107XG5JbmRleFJhbmdlU3RhY2suY3VyID0gMDtcbmZvcih2YXIgaSA9IDA7IGkgPCAyMDQ4OyBpKyspe1xuICAgIEluZGV4UmFuZ2VTdGFja1tpXSA9IG5ldyBfSW5kZXhSYW5nZSgwLCAwKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBJbmRleFJhbmdlKGxlbikge1xuICAgIHJldHVybiBJbmRleFJhbmdlU3RhY2tbSW5kZXhSYW5nZVN0YWNrLmN1cisrXS5yZXNldCgwLCBsZW4pO1xufVxuXG4iLCAiLy8gaXQgaXMgdW5mb3J0dW5hdGVseSBpbXBvc3NpYmxlIHRvIGhhdmUgdGhlIG1hdHJpeCBhbmQgdmVjdG9yIGNsYXNzZXMgXHJcbi8vIGV4aXN0IGluIHNlcGFyYXRlIGZpbGVzLCB3aGljaCBtZWFucyBpdCBoYXMgdG8gYmUgcGFzdGVkIGludG8gdGhlIGZpbmFsXHJcbi8vIGdlbmVyYXRlZCB2ZWN0b3JtYXRoLmpzIGZpbGVcclxuXHJcbmV4cG9ydCBjb25zdCBNYXRyaXg0Q29kZSA9IGBcclxuLyoqIEluY3JlZGlibHkgb2xkIG1hdHJpeCBjbGFzcy4gKi9cclxuZXhwb3J0IGNvbnN0IEV1bGVyT3JkZXJzID0ge1xyXG4gIFhZWjogMCxcclxuICBYWlk6IDEsXHJcbiAgWVhaOiAyLFxyXG4gIFlaWDogMyxcclxuICBaWFk6IDQsXHJcbiAgWllYOiA1LFxyXG59O1xyXG5leHBvcnQgdHlwZSBFdWxlck9yZGVycyA9ICh0eXBlb2YgRXVsZXJPcmRlcnMpW2tleW9mIHR5cGVvZiBFdWxlck9yZGVyc107XHJcblxyXG52YXIgbG9va2F0X2NhY2hlX3ZzMzogdXRpbC5jYWNoZXJpbmc8VmVjdG9yMz47XHJcbmxldCBsb29rYXRfY2FjaGVfdnM0OiB1dGlsLmNhY2hlcmluZzxWZWN0b3I0PjtcclxubGV0IGxvb2thdF9jYWNoZV9tczogdXRpbC5jYWNoZXJpbmc8TWF0cml4ND47XHJcbmxldCBldWxlcl9yb3RhdGVfbWF0czogdXRpbC5jYWNoZXJpbmc8TWF0cml4ND47XHJcbmxldCBtYWtlbm9ybWFsY2FjaGU6IHV0aWwuY2FjaGVyaW5nPFZlY3RvcjM+O1xyXG5sZXQgdGVtcF9tYXRzOiB1dGlsLmNhY2hlcmluZzxNYXRyaXg0PjtcclxubGV0IHByZU11bHRUZW1wOiBNYXRyaXg0O1xyXG5cclxuZnVuY3Rpb24gbXljbGFtcChmOm51bWJlciwgYTpudW1iZXIsIGI6bnVtYmVyKSB7XHJcbiAgcmV0dXJuIE1hdGgubWluKE1hdGgubWF4KGYsIGEpLCBiKTtcclxufVxyXG5cclxuY2xhc3MgaW50ZXJuYWxfbWF0cml4IHtcclxuICBtMTE6IG51bWJlcjtcclxuICBtMTI6IG51bWJlcjtcclxuICBtMTM6IG51bWJlcjtcclxuICBtMTQ6IG51bWJlcjtcclxuICBtMjE6IG51bWJlcjtcclxuICBtMjI6IG51bWJlcjtcclxuICBtMjM6IG51bWJlcjtcclxuICBtMjQ6IG51bWJlcjtcclxuICBtMzE6IG51bWJlcjtcclxuICBtMzI6IG51bWJlcjtcclxuICBtMzM6IG51bWJlcjtcclxuICBtMzQ6IG51bWJlcjtcclxuICBtNDE6IG51bWJlcjtcclxuICBtNDI6IG51bWJlcjtcclxuICBtNDM6IG51bWJlcjtcclxuICBtNDQ6IG51bWJlcjtcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLm0xMSA9IDEuMDtcclxuICAgIHRoaXMubTEyID0gMC4wO1xyXG4gICAgdGhpcy5tMTMgPSAwLjA7XHJcbiAgICB0aGlzLm0xNCA9IDAuMDtcclxuICAgIHRoaXMubTIxID0gMC4wO1xyXG4gICAgdGhpcy5tMjIgPSAxLjA7XHJcbiAgICB0aGlzLm0yMyA9IDAuMDtcclxuICAgIHRoaXMubTI0ID0gMC4wO1xyXG4gICAgdGhpcy5tMzEgPSAwLjA7XHJcbiAgICB0aGlzLm0zMiA9IDAuMDtcclxuICAgIHRoaXMubTMzID0gMS4wO1xyXG4gICAgdGhpcy5tMzQgPSAwLjA7XHJcbiAgICB0aGlzLm00MSA9IDAuMDtcclxuICAgIHRoaXMubTQyID0gMC4wO1xyXG4gICAgdGhpcy5tNDMgPSAwLjA7XHJcbiAgICB0aGlzLm00NCA9IDEuMDtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRyaXg0IHtcclxuc3RhdGljIFNUUlVDVCA9IG5zdHJ1Y3Rqcy5pbmxpbmVSZWdpc3Rlcih0aGlzLCBcXGBcclxuICAgIG1hdDQge1xyXG4gICAgICBtYXQgICAgICA6IGFycmF5KGZsb2F0KSB8IHRoaXMuZ2V0QXNBcnJheSgpO1xyXG4gICAgICBpc1BlcnNwICA6IGludCAgICAgICAgICB8IHRoaXMuaXNQZXJzcDtcclxuICAgIH1cclxuICBcXGApXHJcbiAgc3RhdGljIHNldFVuaWZvcm1BcnJheT86IG51bWJlcltdO1xyXG4gIHN0YXRpYyBzZXRVbmlmb3JtV2ViR0xBcnJheT86IEZsb2F0MzJBcnJheTtcclxuXHJcbiAgJG1hdHJpeDogaW50ZXJuYWxfbWF0cml4O1xyXG4gIGlzUGVyc3A6IGJvb2xlYW47XHJcblxyXG4gIGNvbnN0cnVjdG9yKG0/OiBNYXRyaXg0IHwgbnVtYmVyW10gfCBGbG9hdDMyQXJyYXkgfCBGbG9hdDY0QXJyYXkpIHtcclxuICAgIHRoaXMuJG1hdHJpeCA9IG5ldyBpbnRlcm5hbF9tYXRyaXgoKTtcclxuICAgIHRoaXMuaXNQZXJzcCA9IGZhbHNlO1xyXG5cclxuICAgIGlmICh0eXBlb2YgbSA9PT0gXCJvYmplY3RcIikge1xyXG4gICAgICBpZiAoXCJsZW5ndGhcIiBpbiBtICYmIG0ubGVuZ3RoID49IDE2KSB7XHJcbiAgICAgICAgdGhpcy5sb2FkKG0gYXMgbnVtYmVyW10pO1xyXG4gICAgICB9IGVsc2UgaWYgKG0gaW5zdGFuY2VvZiBNYXRyaXg0KSB7XHJcbiAgICAgICAgdGhpcy5sb2FkKG0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgZnJvbUpTT04oanNvbjogYW55KSB7XHJcbiAgICBsZXQgbWF0ID0gbmV3IE1hdHJpeDQoKTtcclxuICAgIG1hdC5sb2FkKGpzb24uaXRlbXMpO1xyXG4gICAgbWF0LmlzUGVyc3AgPSBqc29uLmlzUGVyc3A7XHJcbiAgICByZXR1cm4gbWF0O1xyXG4gIH1cclxuXHJcbiAgY29weSgpIHtcclxuICAgIHJldHVybiB0aGlzLmNsb25lKCk7XHJcbiAgfVxyXG5cclxuICBjbG9uZSgpIHtcclxuICAgIHJldHVybiBuZXcgTWF0cml4NCh0aGlzKTtcclxuICB9XHJcblxyXG4gIGFkZFRvSGFzaERpZ2VzdChoYXNoOiB1dGlsLkhhc2hEaWdlc3QpIHtcclxuICAgIGxldCBtID0gdGhpcy4kbWF0cml4O1xyXG5cclxuICAgIGhhc2guYWRkKG0ubTExKTtcclxuICAgIGhhc2guYWRkKG0ubTEyKTtcclxuICAgIGhhc2guYWRkKG0ubTEzKTtcclxuICAgIGhhc2guYWRkKG0ubTE0KTtcclxuXHJcbiAgICBoYXNoLmFkZChtLm0yMSk7XHJcbiAgICBoYXNoLmFkZChtLm0yMik7XHJcbiAgICBoYXNoLmFkZChtLm0yMyk7XHJcbiAgICBoYXNoLmFkZChtLm0yNCk7XHJcblxyXG4gICAgaGFzaC5hZGQobS5tMzEpO1xyXG4gICAgaGFzaC5hZGQobS5tMzIpO1xyXG4gICAgaGFzaC5hZGQobS5tMzMpO1xyXG4gICAgaGFzaC5hZGQobS5tMzQpO1xyXG5cclxuICAgIGhhc2guYWRkKG0ubTQxKTtcclxuICAgIGhhc2guYWRkKG0ubTQyKTtcclxuICAgIGhhc2guYWRkKG0ubTQzKTtcclxuICAgIGhhc2guYWRkKG0ubTQ0KTtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIGVxdWFscyhtOiB0aGlzKSB7XHJcbiAgICBsZXQgbTEgPSB0aGlzLiRtYXRyaXg7XHJcbiAgICBsZXQgbTIgPSBtLiRtYXRyaXg7XHJcblxyXG4gICAgbGV0IG9rID0gdHJ1ZTtcclxuXHJcbiAgICBvayA9IG9rICYmIG0xLm0xMSA9PT0gbTIubTExO1xyXG4gICAgb2sgPSBvayAmJiBtMS5tMTIgPT09IG0yLm0xMjtcclxuICAgIG9rID0gb2sgJiYgbTEubTEzID09PSBtMi5tMTM7XHJcbiAgICBvayA9IG9rICYmIG0xLm0xNCA9PT0gbTIubTE0O1xyXG5cclxuICAgIG9rID0gb2sgJiYgbTEubTIxID09PSBtMi5tMjE7XHJcbiAgICBvayA9IG9rICYmIG0xLm0yMiA9PT0gbTIubTIyO1xyXG4gICAgb2sgPSBvayAmJiBtMS5tMjMgPT09IG0yLm0yMztcclxuICAgIG9rID0gb2sgJiYgbTEubTI0ID09PSBtMi5tMjQ7XHJcblxyXG4gICAgb2sgPSBvayAmJiBtMS5tMzEgPT09IG0yLm0zMTtcclxuICAgIG9rID0gb2sgJiYgbTEubTMyID09PSBtMi5tMzI7XHJcbiAgICBvayA9IG9rICYmIG0xLm0zMyA9PT0gbTIubTMzO1xyXG4gICAgb2sgPSBvayAmJiBtMS5tMzQgPT09IG0yLm0zNDtcclxuXHJcbiAgICBvayA9IG9rICYmIG0xLm00MSA9PT0gbTIubTQxO1xyXG4gICAgb2sgPSBvayAmJiBtMS5tNDIgPT09IG0yLm00MjtcclxuICAgIG9rID0gb2sgJiYgbTEubTQzID09PSBtMi5tNDM7XHJcbiAgICBvayA9IG9rICYmIG0xLm00NCA9PT0gbTIubTQ0O1xyXG5cclxuICAgIHJldHVybiBvaztcclxuICB9XHJcblxyXG4gIGxvYWRDb2x1bW4oaTogbnVtYmVyLCB2ZWM6IElWZWN0b3I0IHwgbnVtYmVyW10pIHtcclxuICAgIGxldCBtID0gdGhpcy4kbWF0cml4O1xyXG4gICAgbGV0IGhhdmU0ID0gdmVjLmxlbmd0aCA+IDM7XHJcblxyXG4gICAgc3dpdGNoIChpKSB7XHJcbiAgICAgIGNhc2UgMDpcclxuICAgICAgICBtLm0xMSA9IHZlY1swXTtcclxuICAgICAgICBtLm0yMSA9IHZlY1sxXTtcclxuICAgICAgICBtLm0zMSA9IHZlY1syXTtcclxuICAgICAgICBpZiAoaGF2ZTQpIHtcclxuICAgICAgICAgIG0ubTQxID0gdmVjWzNdO1xyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAxOlxyXG4gICAgICAgIG0ubTEyID0gdmVjWzBdO1xyXG4gICAgICAgIG0ubTIyID0gdmVjWzFdO1xyXG4gICAgICAgIG0ubTMyID0gdmVjWzJdO1xyXG4gICAgICAgIGlmIChoYXZlNCkge1xyXG4gICAgICAgICAgbS5tNDIgPSB2ZWNbM107XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIDI6XHJcbiAgICAgICAgbS5tMTMgPSB2ZWNbMF07XHJcbiAgICAgICAgbS5tMjMgPSB2ZWNbMV07XHJcbiAgICAgICAgbS5tMzMgPSB2ZWNbMl07XHJcbiAgICAgICAgaWYgKGhhdmU0KSB7XHJcbiAgICAgICAgICBtLm00MyA9IHZlY1szXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgMzpcclxuICAgICAgICBtLm0xNCA9IHZlY1swXTtcclxuICAgICAgICBtLm0yNCA9IHZlY1sxXTtcclxuICAgICAgICBtLm0zNCA9IHZlY1syXTtcclxuICAgICAgICBpZiAoaGF2ZTQpIHtcclxuICAgICAgICAgIG0ubTQ0ID0gdmVjWzNdO1xyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIGNvcHlDb2x1bW5UbyhpOiBudW1iZXIsIHZlYzogSVZlY3RvcjQgfCBudW1iZXJbXSkge1xyXG4gICAgbGV0IG0gPSB0aGlzLiRtYXRyaXg7XHJcbiAgICBsZXQgaGF2ZTQgPSB2ZWMubGVuZ3RoID4gMztcclxuXHJcbiAgICBzd2l0Y2ggKGkpIHtcclxuICAgICAgY2FzZSAwOlxyXG4gICAgICAgIHZlY1swXSA9IG0ubTExO1xyXG4gICAgICAgIHZlY1sxXSA9IG0ubTIxO1xyXG4gICAgICAgIHZlY1syXSA9IG0ubTMxO1xyXG4gICAgICAgIGlmIChoYXZlNCkge1xyXG4gICAgICAgICAgdmVjWzNdID0gbS5tNDE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIDE6XHJcbiAgICAgICAgdmVjWzBdID0gbS5tMTI7XHJcbiAgICAgICAgdmVjWzFdID0gbS5tMjI7XHJcbiAgICAgICAgdmVjWzJdID0gbS5tMzI7XHJcbiAgICAgICAgaWYgKGhhdmU0KSB7XHJcbiAgICAgICAgICB2ZWNbM10gPSBtLm00MjtcclxuICAgICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgMjpcclxuICAgICAgICB2ZWNbMF0gPSBtLm0xMztcclxuICAgICAgICB2ZWNbMV0gPSBtLm0yMztcclxuICAgICAgICB2ZWNbMl0gPSBtLm0zMztcclxuICAgICAgICBpZiAoaGF2ZTQpIHtcclxuICAgICAgICAgIHZlY1szXSA9IG0ubTQzO1xyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAzOlxyXG4gICAgICAgIHZlY1swXSA9IG0ubTE0O1xyXG4gICAgICAgIHZlY1sxXSA9IG0ubTI0O1xyXG4gICAgICAgIHZlY1syXSA9IG0ubTM0O1xyXG4gICAgICAgIGlmIChoYXZlNCkge1xyXG4gICAgICAgICAgdmVjWzNdID0gbS5tNDQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2ZWM7XHJcbiAgfVxyXG5cclxuICBjb3B5Q29sdW1uKGk6IG51bWJlcikge1xyXG4gICAgcmV0dXJuIHRoaXMuY29weUNvbHVtblRvKGksIG5ldyBBcnJheTxudW1iZXI+KDQpKTtcclxuICB9XHJcblxyXG4gIGxvYWQoYjogTWF0cml4NCB8IG51bWJlcltdIHwgRmxvYXQzMkFycmF5IHwgRmxvYXQ2NEFycmF5KSB7XHJcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSAmJiB0eXBlb2YgYXJndW1lbnRzWzBdID09PSBcIm9iamVjdFwiKSB7XHJcbiAgICAgIGxldCBtYXRyaXg7XHJcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gaW5zdGFuY2VvZiBNYXRyaXg0KSB7XHJcbiAgICAgICAgbWF0cml4ID0gYXJndW1lbnRzWzBdLiRtYXRyaXg7XHJcbiAgICAgICAgdGhpcy5pc1BlcnNwID0gYXJndW1lbnRzWzBdLmlzUGVyc3A7XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm0xMSA9IG1hdHJpeC5tMTE7XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm0xMiA9IG1hdHJpeC5tMTI7XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm0xMyA9IG1hdHJpeC5tMTM7XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm0xNCA9IG1hdHJpeC5tMTQ7XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm0yMSA9IG1hdHJpeC5tMjE7XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm0yMiA9IG1hdHJpeC5tMjI7XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm0yMyA9IG1hdHJpeC5tMjM7XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm0yNCA9IG1hdHJpeC5tMjQ7XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm0zMSA9IG1hdHJpeC5tMzE7XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm0zMiA9IG1hdHJpeC5tMzI7XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm0zMyA9IG1hdHJpeC5tMzM7XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm0zNCA9IG1hdHJpeC5tMzQ7XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm00MSA9IG1hdHJpeC5tNDE7XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm00MiA9IG1hdHJpeC5tNDI7XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm00MyA9IG1hdHJpeC5tNDM7XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm00NCA9IG1hdHJpeC5tNDQ7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgIH0gZWxzZSBtYXRyaXggPSBhcmd1bWVudHNbMF07XHJcbiAgICAgIGlmIChcImxlbmd0aFwiIGluIG1hdHJpeCAmJiBtYXRyaXgubGVuZ3RoID49IDE2KSB7XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm0xMSA9IG1hdHJpeFswXTtcclxuICAgICAgICB0aGlzLiRtYXRyaXgubTEyID0gbWF0cml4WzFdO1xyXG4gICAgICAgIHRoaXMuJG1hdHJpeC5tMTMgPSBtYXRyaXhbMl07XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm0xNCA9IG1hdHJpeFszXTtcclxuICAgICAgICB0aGlzLiRtYXRyaXgubTIxID0gbWF0cml4WzRdO1xyXG4gICAgICAgIHRoaXMuJG1hdHJpeC5tMjIgPSBtYXRyaXhbNV07XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm0yMyA9IG1hdHJpeFs2XTtcclxuICAgICAgICB0aGlzLiRtYXRyaXgubTI0ID0gbWF0cml4WzddO1xyXG4gICAgICAgIHRoaXMuJG1hdHJpeC5tMzEgPSBtYXRyaXhbOF07XHJcbiAgICAgICAgdGhpcy4kbWF0cml4Lm0zMiA9IG1hdHJpeFs5XTtcclxuICAgICAgICB0aGlzLiRtYXRyaXgubTMzID0gbWF0cml4WzEwXTtcclxuICAgICAgICB0aGlzLiRtYXRyaXgubTM0ID0gbWF0cml4WzExXTtcclxuICAgICAgICB0aGlzLiRtYXRyaXgubTQxID0gbWF0cml4WzEyXTtcclxuICAgICAgICB0aGlzLiRtYXRyaXgubTQyID0gbWF0cml4WzEzXTtcclxuICAgICAgICB0aGlzLiRtYXRyaXgubTQzID0gbWF0cml4WzE0XTtcclxuICAgICAgICB0aGlzLiRtYXRyaXgubTQ0ID0gbWF0cml4WzE1XTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMubWFrZUlkZW50aXR5KCk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIHRvSlNPTigpIHtcclxuICAgIHJldHVybiB7IGlzUGVyc3A6IHRoaXMuaXNQZXJzcCwgaXRlbXM6IHRoaXMuZ2V0QXNBcnJheSgpIH07XHJcbiAgfVxyXG5cclxuICBnZXRBc0FycmF5KCkge1xyXG4gICAgcmV0dXJuIFtcclxuICAgICAgdGhpcy4kbWF0cml4Lm0xMSxcclxuICAgICAgdGhpcy4kbWF0cml4Lm0xMixcclxuICAgICAgdGhpcy4kbWF0cml4Lm0xMyxcclxuICAgICAgdGhpcy4kbWF0cml4Lm0xNCxcclxuICAgICAgdGhpcy4kbWF0cml4Lm0yMSxcclxuICAgICAgdGhpcy4kbWF0cml4Lm0yMixcclxuICAgICAgdGhpcy4kbWF0cml4Lm0yMyxcclxuICAgICAgdGhpcy4kbWF0cml4Lm0yNCxcclxuICAgICAgdGhpcy4kbWF0cml4Lm0zMSxcclxuICAgICAgdGhpcy4kbWF0cml4Lm0zMixcclxuICAgICAgdGhpcy4kbWF0cml4Lm0zMyxcclxuICAgICAgdGhpcy4kbWF0cml4Lm0zNCxcclxuICAgICAgdGhpcy4kbWF0cml4Lm00MSxcclxuICAgICAgdGhpcy4kbWF0cml4Lm00MixcclxuICAgICAgdGhpcy4kbWF0cml4Lm00MyxcclxuICAgICAgdGhpcy4kbWF0cml4Lm00NCxcclxuICAgIF07XHJcbiAgfVxyXG5cclxuICBnZXRBc0Zsb2F0MzJBcnJheSgpIHtcclxuICAgIHJldHVybiBuZXcgRmxvYXQzMkFycmF5KHRoaXMuZ2V0QXNBcnJheSgpKTtcclxuICB9XHJcblxyXG4gIHNldFVuaWZvcm0oY3R4OiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0IHwgV2ViR0xSZW5kZXJpbmdDb250ZXh0LCBsb2M6IFdlYkdMVW5pZm9ybUxvY2F0aW9uLCB0cmFuc3Bvc2UgPSBmYWxzZSkge1xyXG4gICAgaWYgKE1hdHJpeDQuc2V0VW5pZm9ybUFycmF5ID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgTWF0cml4NC5zZXRVbmlmb3JtV2ViR0xBcnJheSA9IG5ldyBGbG9hdDMyQXJyYXkoMTYpO1xyXG4gICAgICBNYXRyaXg0LnNldFVuaWZvcm1BcnJheSA9IG5ldyBBcnJheSgxNik7XHJcbiAgICB9XHJcblxyXG4gICAgTWF0cml4NC5zZXRVbmlmb3JtQXJyYXlbMF0gPSB0aGlzLiRtYXRyaXgubTExO1xyXG4gICAgTWF0cml4NC5zZXRVbmlmb3JtQXJyYXlbMV0gPSB0aGlzLiRtYXRyaXgubTEyO1xyXG4gICAgTWF0cml4NC5zZXRVbmlmb3JtQXJyYXlbMl0gPSB0aGlzLiRtYXRyaXgubTEzO1xyXG4gICAgTWF0cml4NC5zZXRVbmlmb3JtQXJyYXlbM10gPSB0aGlzLiRtYXRyaXgubTE0O1xyXG4gICAgTWF0cml4NC5zZXRVbmlmb3JtQXJyYXlbNF0gPSB0aGlzLiRtYXRyaXgubTIxO1xyXG4gICAgTWF0cml4NC5zZXRVbmlmb3JtQXJyYXlbNV0gPSB0aGlzLiRtYXRyaXgubTIyO1xyXG4gICAgTWF0cml4NC5zZXRVbmlmb3JtQXJyYXlbNl0gPSB0aGlzLiRtYXRyaXgubTIzO1xyXG4gICAgTWF0cml4NC5zZXRVbmlmb3JtQXJyYXlbN10gPSB0aGlzLiRtYXRyaXgubTI0O1xyXG4gICAgTWF0cml4NC5zZXRVbmlmb3JtQXJyYXlbOF0gPSB0aGlzLiRtYXRyaXgubTMxO1xyXG4gICAgTWF0cml4NC5zZXRVbmlmb3JtQXJyYXlbOV0gPSB0aGlzLiRtYXRyaXgubTMyO1xyXG4gICAgTWF0cml4NC5zZXRVbmlmb3JtQXJyYXlbMTBdID0gdGhpcy4kbWF0cml4Lm0zMztcclxuICAgIE1hdHJpeDQuc2V0VW5pZm9ybUFycmF5WzExXSA9IHRoaXMuJG1hdHJpeC5tMzQ7XHJcbiAgICBNYXRyaXg0LnNldFVuaWZvcm1BcnJheVsxMl0gPSB0aGlzLiRtYXRyaXgubTQxO1xyXG4gICAgTWF0cml4NC5zZXRVbmlmb3JtQXJyYXlbMTNdID0gdGhpcy4kbWF0cml4Lm00MjtcclxuICAgIE1hdHJpeDQuc2V0VW5pZm9ybUFycmF5WzE0XSA9IHRoaXMuJG1hdHJpeC5tNDM7XHJcbiAgICBNYXRyaXg0LnNldFVuaWZvcm1BcnJheVsxNV0gPSB0aGlzLiRtYXRyaXgubTQ0O1xyXG5cclxuICAgIE1hdHJpeDQuc2V0VW5pZm9ybVdlYkdMQXJyYXkhLnNldChNYXRyaXg0LnNldFVuaWZvcm1BcnJheSk7XHJcblxyXG4gICAgY3R4LnVuaWZvcm1NYXRyaXg0ZnYobG9jLCB0cmFuc3Bvc2UsIE1hdHJpeDQuc2V0VW5pZm9ybVdlYkdMQXJyYXkhKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgbWFrZUlkZW50aXR5KCkge1xyXG4gICAgdGhpcy4kbWF0cml4Lm0xMSA9IDE7XHJcbiAgICB0aGlzLiRtYXRyaXgubTEyID0gMDtcclxuICAgIHRoaXMuJG1hdHJpeC5tMTMgPSAwO1xyXG4gICAgdGhpcy4kbWF0cml4Lm0xNCA9IDA7XHJcbiAgICB0aGlzLiRtYXRyaXgubTIxID0gMDtcclxuICAgIHRoaXMuJG1hdHJpeC5tMjIgPSAxO1xyXG4gICAgdGhpcy4kbWF0cml4Lm0yMyA9IDA7XHJcbiAgICB0aGlzLiRtYXRyaXgubTI0ID0gMDtcclxuICAgIHRoaXMuJG1hdHJpeC5tMzEgPSAwO1xyXG4gICAgdGhpcy4kbWF0cml4Lm0zMiA9IDA7XHJcbiAgICB0aGlzLiRtYXRyaXgubTMzID0gMTtcclxuICAgIHRoaXMuJG1hdHJpeC5tMzQgPSAwO1xyXG4gICAgdGhpcy4kbWF0cml4Lm00MSA9IDA7XHJcbiAgICB0aGlzLiRtYXRyaXgubTQyID0gMDtcclxuICAgIHRoaXMuJG1hdHJpeC5tNDMgPSAwO1xyXG4gICAgdGhpcy4kbWF0cml4Lm00NCA9IDE7XHJcblxyXG4gICAgLy9kcm9wIGlzUGVyc3BcclxuICAgIHRoaXMuaXNQZXJzcCA9IGZhbHNlO1xyXG5cclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgdHJhbnNwb3NlKCkge1xyXG4gICAgbGV0IHRtcCA9IHRoaXMuJG1hdHJpeC5tMTI7XHJcbiAgICB0aGlzLiRtYXRyaXgubTEyID0gdGhpcy4kbWF0cml4Lm0yMTtcclxuICAgIHRoaXMuJG1hdHJpeC5tMjEgPSB0bXA7XHJcbiAgICB0bXAgPSB0aGlzLiRtYXRyaXgubTEzO1xyXG4gICAgdGhpcy4kbWF0cml4Lm0xMyA9IHRoaXMuJG1hdHJpeC5tMzE7XHJcbiAgICB0aGlzLiRtYXRyaXgubTMxID0gdG1wO1xyXG4gICAgdG1wID0gdGhpcy4kbWF0cml4Lm0xNDtcclxuICAgIHRoaXMuJG1hdHJpeC5tMTQgPSB0aGlzLiRtYXRyaXgubTQxO1xyXG4gICAgdGhpcy4kbWF0cml4Lm00MSA9IHRtcDtcclxuICAgIHRtcCA9IHRoaXMuJG1hdHJpeC5tMjM7XHJcbiAgICB0aGlzLiRtYXRyaXgubTIzID0gdGhpcy4kbWF0cml4Lm0zMjtcclxuICAgIHRoaXMuJG1hdHJpeC5tMzIgPSB0bXA7XHJcbiAgICB0bXAgPSB0aGlzLiRtYXRyaXgubTI0O1xyXG4gICAgdGhpcy4kbWF0cml4Lm0yNCA9IHRoaXMuJG1hdHJpeC5tNDI7XHJcbiAgICB0aGlzLiRtYXRyaXgubTQyID0gdG1wO1xyXG4gICAgdG1wID0gdGhpcy4kbWF0cml4Lm0zNDtcclxuICAgIHRoaXMuJG1hdHJpeC5tMzQgPSB0aGlzLiRtYXRyaXgubTQzO1xyXG4gICAgdGhpcy4kbWF0cml4Lm00MyA9IHRtcDtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIGRldGVybWluYW50KCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2RldGVybWluYW50NHg0KCk7XHJcbiAgfVxyXG5cclxuICBpbnZlcnQoKSB7XHJcbiAgICBsZXQgZGV0ID0gdGhpcy5fZGV0ZXJtaW5hbnQ0eDQoKTtcclxuXHJcbiAgICBpZiAoTWF0aC5hYnMoZGV0KSA8IDFlLTgpIHJldHVybiBudWxsO1xyXG5cclxuICAgIHRoaXMuX21ha2VBZGpvaW50KCk7XHJcblxyXG4gICAgdGhpcy4kbWF0cml4Lm0xMSAvPSBkZXQ7XHJcbiAgICB0aGlzLiRtYXRyaXgubTEyIC89IGRldDtcclxuICAgIHRoaXMuJG1hdHJpeC5tMTMgLz0gZGV0O1xyXG4gICAgdGhpcy4kbWF0cml4Lm0xNCAvPSBkZXQ7XHJcbiAgICB0aGlzLiRtYXRyaXgubTIxIC89IGRldDtcclxuICAgIHRoaXMuJG1hdHJpeC5tMjIgLz0gZGV0O1xyXG4gICAgdGhpcy4kbWF0cml4Lm0yMyAvPSBkZXQ7XHJcbiAgICB0aGlzLiRtYXRyaXgubTI0IC89IGRldDtcclxuICAgIHRoaXMuJG1hdHJpeC5tMzEgLz0gZGV0O1xyXG4gICAgdGhpcy4kbWF0cml4Lm0zMiAvPSBkZXQ7XHJcbiAgICB0aGlzLiRtYXRyaXgubTMzIC89IGRldDtcclxuICAgIHRoaXMuJG1hdHJpeC5tMzQgLz0gZGV0O1xyXG4gICAgdGhpcy4kbWF0cml4Lm00MSAvPSBkZXQ7XHJcbiAgICB0aGlzLiRtYXRyaXgubTQyIC89IGRldDtcclxuICAgIHRoaXMuJG1hdHJpeC5tNDMgLz0gZGV0O1xyXG4gICAgdGhpcy4kbWF0cml4Lm00NCAvPSBkZXQ7XHJcblxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICB0cmFuc2xhdGUoeDogbnVtYmVyLCB5OiBudW1iZXIsIHo6IG51bWJlcikge1xyXG4gICAgaWYgKHR5cGVvZiB4ID09PSBcIm9iamVjdFwiICYmIFwibGVuZ3RoXCIgaW4geCkge1xyXG4gICAgICBsZXQgdCA9IHg7XHJcblxyXG4gICAgICB4ID0gdFswXTtcclxuICAgICAgeSA9IHRbMV07XHJcbiAgICAgIHogPSB0WzJdO1xyXG4gICAgfVxyXG5cclxuICAgIHggPSB4ID09PSB1bmRlZmluZWQgPyAwIDogeDtcclxuICAgIHkgPSB5ID09PSB1bmRlZmluZWQgPyAwIDogeTtcclxuICAgIHogPSB6ID09PSB1bmRlZmluZWQgPyAwIDogejtcclxuXHJcbiAgICBsZXQgbWF0cml4ID0gdGVtcF9tYXRzLm5leHQoKS5tYWtlSWRlbnRpdHkoKTtcclxuXHJcbiAgICBtYXRyaXguJG1hdHJpeC5tNDEgPSB4O1xyXG4gICAgbWF0cml4LiRtYXRyaXgubTQyID0geTtcclxuICAgIG1hdHJpeC4kbWF0cml4Lm00MyA9IHo7XHJcblxyXG4gICAgdGhpcy5tdWx0aXBseShtYXRyaXgpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBwcmVUcmFuc2xhdGUoeDogbnVtYmVyLCB5OiBudW1iZXIsIHo6IG51bWJlcikge1xyXG4gICAgaWYgKHR5cGVvZiB4ID09PSBcIm9iamVjdFwiICYmIFwibGVuZ3RoXCIgaW4geCkge1xyXG4gICAgICBsZXQgdCA9IHg7XHJcblxyXG4gICAgICB4ID0gdFswXTtcclxuICAgICAgeSA9IHRbMV07XHJcbiAgICAgIHogPSB0WzJdO1xyXG4gICAgfVxyXG5cclxuICAgIHggPSB4ID09PSB1bmRlZmluZWQgPyAwIDogeDtcclxuICAgIHkgPSB5ID09PSB1bmRlZmluZWQgPyAwIDogeTtcclxuICAgIHogPSB6ID09PSB1bmRlZmluZWQgPyAwIDogejtcclxuXHJcbiAgICBsZXQgbWF0cml4ID0gdGVtcF9tYXRzLm5leHQoKS5tYWtlSWRlbnRpdHkoKTtcclxuXHJcbiAgICBtYXRyaXguJG1hdHJpeC5tNDEgPSB4O1xyXG4gICAgbWF0cml4LiRtYXRyaXgubTQyID0geTtcclxuICAgIG1hdHJpeC4kbWF0cml4Lm00MyA9IHo7XHJcblxyXG4gICAgdGhpcy5wcmVNdWx0aXBseShtYXRyaXgpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBzY2FsZSh4OiBudW1iZXIgfCBhbnksIHk6IG51bWJlciwgejogbnVtYmVyLCB3ID0gMS4wKSB7XHJcbiAgICBpZiAodHlwZW9mIHggPT09IFwib2JqZWN0XCIgJiYgXCJsZW5ndGhcIiBpbiB4KSB7XHJcbiAgICAgIGxldCB0ID0geDtcclxuICAgICAgeCA9IHRbMF07XHJcbiAgICAgIHkgPSB0WzFdO1xyXG4gICAgICB6ID0gdFsyXTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGlmICh4ID09PSB1bmRlZmluZWQpIHggPSAxO1xyXG5cclxuICAgICAgaWYgKHogPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGlmICh5ID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIHkgPSB4O1xyXG4gICAgICAgICAgeiA9IHg7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHogPSB4O1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIGlmICh5ID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB5ID0geDtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGxldCBtYXRyaXggPSB0ZW1wX21hdHMubmV4dCgpLm1ha2VJZGVudGl0eSgpO1xyXG4gICAgbWF0cml4LiRtYXRyaXgubTExID0geDtcclxuICAgIG1hdHJpeC4kbWF0cml4Lm0yMiA9IHk7XHJcbiAgICBtYXRyaXguJG1hdHJpeC5tMzMgPSB6O1xyXG4gICAgbWF0cml4LiRtYXRyaXgubTQ0ID0gdztcclxuICAgIHRoaXMubXVsdGlwbHkobWF0cml4KTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgcHJlU2NhbGUoeDogbnVtYmVyLCB5OiBudW1iZXIsIHo6IG51bWJlciwgdyA9IDEuMCkge1xyXG4gICAgbGV0IG1hdCA9IHRlbXBfbWF0cy5uZXh0KCkubWFrZUlkZW50aXR5KCk7XHJcbiAgICBtYXQuc2NhbGUoeCwgeSwgeiwgdyk7XHJcblxyXG4gICAgdGhpcy5wcmVNdWx0aXBseShtYXQpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICAvKlxyXG4gIG9uIGZhY3RvcjtcclxuICBvZmYgcGVyaW9kO1xyXG5cclxuICBjMSA6PSBjeDsgY29tbWVudDogY29zKHRoeCk7XHJcbiAgczEgOj0gc3g7IGNvbW1lbnQ6IHNpbih0aHgpO1xyXG5cclxuICBjMiA6PSBjeTsgY29tbWVudDogY29zKHRoeSk7XHJcbiAgczIgOj0gc3k7IGNvbW1lbnQ6IHNpbih0aHkpO1xyXG5cclxuICBjMyA6PSBjejsgY29tbWVudDogY29zKHRoeik7XHJcbiAgczMgOj0gc3o7IGNvbW1lbnQ6IHNpbih0aHopO1xyXG5cclxuICBjeCA6PSBjb3ModGh4KTtcclxuICBzeCA6PSBzaW4odGh4KTtcclxuICBjeSA6PSBjb3ModGh5KTtcclxuICBzeSA6PSBzaW4odGh5KTtcclxuICBjeiA6PSBjb3ModGh6KTtcclxuICBzeiA6PSBzaW4odGh6KTtcclxuXHJcbiAgaW1hdCA6PSBtYXQoKDEsIDAsIDAsIDApLFxyXG4gICAgICAgICAgICAgICgwLCAxLCAwLCAwKSxcclxuICAgICAgICAgICAgICAoMCwgMCwgMSwgMCksXHJcbiAgICAgICAgICAgICAgKDAsIDAsIDAsIDEpKTtcclxuXHJcbiAgeG1hdCA6PW1hdCgoMSwgIDAsICAwLCAgMCksXHJcbiAgICAgICAgICAgICAoMCwgYzEsIC1zMSwgMCksXHJcbiAgICAgICAgICAgICAoMCwgczEsICBjMSwgMCksXHJcbiAgICAgICAgICAgICAoMCwgIDAsICAwLCAgMCkpO1xyXG5cclxuICB5bWF0IDo9bWF0KChjMiwgMCwgczIsIDApLFxyXG4gICAgICAgICAgICAgKDAsICAxLCAgMCwgIDApLFxyXG4gICAgICAgICAgICAgKC1zMiwgMCwgIGMyLCAwKSxcclxuICAgICAgICAgICAgICgwLCAgMCwgIDAsICAwKSk7XHJcblxyXG4gIHptYXQgOj1tYXQoKCBjMywgLXMzLCAwLCAwKSxcclxuICAgICAgICAgICAgIChzMywgYzMsIDAsIDApLFxyXG4gICAgICAgICAgICAgKCAwLCAgMCwgIDEsIDApLFxyXG4gICAgICAgICAgICAgKCAwLCAgMCwgIDAsIDApKTtcclxuXHJcbiAgbW1hdCA6PSBtYXQoKG0xMSwgbTIxLCBtMzEsIDApLFxyXG4gICAgICAgICAgICAgIChtMTIsIG0yMiwgbTMyLCAwKSxcclxuICAgICAgICAgICAgICAobTEzLCBtMjMsIG0zMywgMCksXHJcbiAgICAgICAgICAgICAgKDAsICAgMCwgICAwLCAgIDApKTtcclxuXHJcbiAgZm1hdCA6PSB6bWF0ICogeW1hdCAqIHhtYXQ7XHJcblxyXG4gIGYxIDo9IG0xMSoqMiArIG0xMioqMiArIG0xMyoqMiAtIDEuMDtcclxuICBmMiA6PSBtMjEqKjIgKyBtMjIqKjIgKyBtMjMqKjIgLSAxLjA7XHJcbiAgZjMgOj0gbTMxKioyICsgbTMyKioyICsgbTMzKioyIC0gMS4wO1xyXG5cclxuICB0bWF0IDo9IGZtYXQgKiBtbWF0O1xyXG4gIGYxIDo9IHRtYXQoMSwgMSkgLSAxLjA7XHJcbiAgZjIgOj0gdG1hdCgyLCAyKSAtIDEuMDtcclxuICBmMyA6PSB0bWF0KDMsIDMpIC0gMS4wO1xyXG5cclxuICBvcGVyYXRvciBteWFzaW47XHJcblxyXG4gIGZ0aHkgOj0gYXNpbihtbWF0KDMsIDEpKTtcclxuICBmMSA6PSBtbWF0KDMsMSkqKjIgKyBtbWF0KDIsMSkqKjIgKyBtbWF0KDEsMSkqKjIgPSAxLjA7XHJcblxyXG4gIGZtYXQyIDo9IHN1Yih0aHk9ZnRoeSwgZm1hdCk7XHJcblxyXG4gIGZtYXQzIDo9IGZtYXQyICogKHRwIG1tYXQpO1xyXG4gIGZmeiA6PSBzb2x2ZShmbWF0MigxLCAxKSAtIG0xMSwgdGh6KTtcclxuICBmZnggOj0gc29sdmUoZm1hdDIoMywgMykgLSBtMzMsIHRoeCk7XHJcblxyXG4gIGZ0aHogOj0gcGFydChmZnosIDEsIDIpO1xyXG4gIGZ0aHggOj0gcGFydChmZngsIDEsIDIpO1xyXG5cclxuICBzdWIodGh4PWZ0aHgsIHRoeT1mdGh5LCB0aHo9ZnRoeiwgZm1hdCk7XHJcblxyXG4oY29zKHRoeSkqY29zKHRoeiksICAgICAgICAgY29zKHRoeCkqc2luKHRoeiktY29zKHRoeikqc2luKHRoeCkqc2luKHRoeSksICAtKGNvcyh0aHgpKmNvcyh0aHopKnNpbih0aHkpK3Npbih0aHgpKnNpbih0aHopKSwgMCksXHJcblxyXG4oLWNvcyh0aHkpKnNpbih0aHopLCAgICAgICAgY29zKHRoeCkqY29zKHRoeikgKyBzaW4odGh4KSpzaW4odGh5KSpzaW4odGh6KSwgIGNvcyh0aHgpKnNpbih0aHkpKnNpbih0aHopLWNvcyh0aHopKnNpbih0aHgpLCAwKSxcclxuXHJcbihzaW4odGh5KSwgICAgICAgICAgICAgICAgICBjb3ModGh5KSpzaW4odGh4KSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29zKHRoeCkqY29zKHRoeSksICAwKSxcclxuXHJcbiAgICAoMCwwLDAsMSkpXHJcblxyXG4gICovXHJcblxyXG4gIGV1bGVyX3JvdGF0ZV9vcmRlcih4OiBudW1iZXIsIHk6IG51bWJlciwgejogbnVtYmVyLCBvcmRlciA9IEV1bGVyT3JkZXJzLlhZWikge1xyXG4gICAgaWYgKHkgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICB5ID0gMC4wO1xyXG4gICAgfVxyXG4gICAgaWYgKHogPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICB6ID0gMC4wO1xyXG4gICAgfVxyXG5cclxuICAgIHggPSAteDtcclxuICAgIHkgPSAteTtcclxuICAgIHogPSAtejtcclxuXHJcbiAgICBsZXQgeG1hdCA9IGV1bGVyX3JvdGF0ZV9tYXRzLm5leHQoKS5tYWtlSWRlbnRpdHkoKTtcclxuXHJcbiAgICBsZXQgbSA9IHhtYXQuJG1hdHJpeDtcclxuXHJcbiAgICBsZXQgYyA9IE1hdGguY29zKHgpLFxyXG4gICAgICBzID0gTWF0aC5zaW4oeCk7XHJcblxyXG4gICAgbS5tMjIgPSBjO1xyXG4gICAgbS5tMjMgPSBzO1xyXG4gICAgbS5tMzIgPSAtcztcclxuICAgIG0ubTMzID0gYztcclxuXHJcbiAgICBsZXQgeW1hdCA9IGV1bGVyX3JvdGF0ZV9tYXRzLm5leHQoKS5tYWtlSWRlbnRpdHkoKTtcclxuICAgIGMgPSBNYXRoLmNvcyh5KTtcclxuICAgIHMgPSBNYXRoLnNpbih5KTtcclxuICAgIG0gPSB5bWF0LiRtYXRyaXg7XHJcblxyXG4gICAgbS5tMTEgPSBjO1xyXG4gICAgbS5tMTMgPSAtcztcclxuICAgIG0ubTMxID0gcztcclxuICAgIG0ubTMzID0gYztcclxuXHJcbiAgICBsZXQgem1hdCA9IGV1bGVyX3JvdGF0ZV9tYXRzLm5leHQoKS5tYWtlSWRlbnRpdHkoKTtcclxuICAgIGMgPSBNYXRoLmNvcyh6KTtcclxuICAgIHMgPSBNYXRoLnNpbih6KTtcclxuICAgIG0gPSB6bWF0LiRtYXRyaXg7XHJcblxyXG4gICAgbS5tMTEgPSBjO1xyXG4gICAgbS5tMTIgPSBzO1xyXG4gICAgbS5tMjEgPSAtcztcclxuICAgIG0ubTIyID0gYztcclxuXHJcbiAgICBsZXQgYTogTWF0cml4NCB8IHVuZGVmaW5lZCwgYjogTWF0cml4NCB8IHVuZGVmaW5lZCwgY21hdDogTWF0cml4NCB8IHVuZGVmaW5lZDtcclxuXHJcbiAgICBzd2l0Y2ggKG9yZGVyKSB7XHJcbiAgICAgIGNhc2UgRXVsZXJPcmRlcnMuWFlaOlxyXG4gICAgICAgIGEgPSB4bWF0O1xyXG4gICAgICAgIGIgPSB5bWF0O1xyXG4gICAgICAgIGNtYXQgPSB6bWF0O1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIEV1bGVyT3JkZXJzLlhaWTpcclxuICAgICAgICBhID0geG1hdDtcclxuICAgICAgICBiID0gem1hdDtcclxuICAgICAgICBjbWF0ID0geW1hdDtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSBFdWxlck9yZGVycy5ZWFo6XHJcbiAgICAgICAgYSA9IHltYXQ7XHJcbiAgICAgICAgYiA9IHhtYXQ7XHJcbiAgICAgICAgY21hdCA9IHptYXQ7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgRXVsZXJPcmRlcnMuWVpYOlxyXG4gICAgICAgIGEgPSB5bWF0O1xyXG4gICAgICAgIGIgPSB6bWF0O1xyXG4gICAgICAgIGNtYXQgPSB4bWF0O1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIEV1bGVyT3JkZXJzLlpYWTpcclxuICAgICAgICBhID0gem1hdDtcclxuICAgICAgICBiID0geG1hdDtcclxuICAgICAgICBjbWF0ID0geW1hdDtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSBFdWxlck9yZGVycy5aWVg6XHJcbiAgICAgICAgYSA9IHptYXQ7XHJcbiAgICAgICAgYiA9IHltYXQ7XHJcbiAgICAgICAgY21hdCA9IHhtYXQ7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcblxyXG4gICAgYiEucHJlTXVsdGlwbHkoY21hdCEpO1xyXG4gICAgYiEubXVsdGlwbHkoYSEpO1xyXG4gICAgdGhpcy5wcmVNdWx0aXBseShiISk7XHJcblxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBldWxlcl9yb3RhdGUoeDogbnVtYmVyLCB5OiBudW1iZXIsIHo6IG51bWJlcikge1xyXG4gICAgaWYgKHkgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICB5ID0gMC4wO1xyXG4gICAgfVxyXG4gICAgaWYgKHogPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICB6ID0gMC4wO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCB4bWF0ID0gZXVsZXJfcm90YXRlX21hdHMubmV4dCgpLm1ha2VJZGVudGl0eSgpO1xyXG4gICAgbGV0IG0gPSB4bWF0LiRtYXRyaXg7XHJcblxyXG4gICAgbGV0IGMgPSBNYXRoLmNvcyh4KSxcclxuICAgICAgcyA9IE1hdGguc2luKHgpO1xyXG5cclxuICAgIG0ubTIyID0gYztcclxuICAgIG0ubTIzID0gcztcclxuICAgIG0ubTMyID0gLXM7XHJcbiAgICBtLm0zMyA9IGM7XHJcblxyXG4gICAgbGV0IHltYXQgPSBldWxlcl9yb3RhdGVfbWF0cy5uZXh0KCkubWFrZUlkZW50aXR5KCk7XHJcbiAgICBjID0gTWF0aC5jb3MoeSk7XHJcbiAgICBzID0gTWF0aC5zaW4oeSk7XHJcbiAgICBtID0geW1hdC4kbWF0cml4O1xyXG5cclxuICAgIG0ubTExID0gYztcclxuICAgIG0ubTEzID0gLXM7XHJcbiAgICBtLm0zMSA9IHM7XHJcbiAgICBtLm0zMyA9IGM7XHJcblxyXG4gICAgeW1hdC5tdWx0aXBseSh4bWF0KTtcclxuXHJcbiAgICBsZXQgem1hdCA9IGV1bGVyX3JvdGF0ZV9tYXRzLm5leHQoKS5tYWtlSWRlbnRpdHkoKTtcclxuICAgIGMgPSBNYXRoLmNvcyh6KTtcclxuICAgIHMgPSBNYXRoLnNpbih6KTtcclxuICAgIG0gPSB6bWF0LiRtYXRyaXg7XHJcblxyXG4gICAgbS5tMTEgPSBjO1xyXG4gICAgbS5tMTIgPSBzO1xyXG4gICAgbS5tMjEgPSAtcztcclxuICAgIG0ubTIyID0gYztcclxuXHJcbiAgICB6bWF0Lm11bHRpcGx5KHltYXQpO1xyXG5cclxuICAgIC8vY29uc29sZS5sb2coXCJcIit5bWF0KTtcclxuICAgIC8vdGhpcy5tdWx0aXBseSh6bWF0KTtcclxuICAgIHRoaXMucHJlTXVsdGlwbHkoem1hdCk7XHJcblxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICB0b1N0cmluZygpIHtcclxuICAgIGxldCBzID0gXCJcIjtcclxuICAgIGxldCBtID0gdGhpcy4kbWF0cml4O1xyXG5cclxuICAgIGZ1bmN0aW9uIGRlYyhkOiBudW1iZXIpIHtcclxuICAgICAgbGV0IHJldCA9IGQudG9GaXhlZCgzKTtcclxuXHJcbiAgICAgIGlmIChyZXRbMF0gIT09IFwiLVwiKVxyXG4gICAgICAgIC8vbWFrZSByb29tIGZvciBuZWdhdGl2ZSBzaWduc1xyXG4gICAgICAgIHJldCA9IFwiIFwiICsgcmV0O1xyXG4gICAgICByZXR1cm4gcmV0O1xyXG4gICAgfVxyXG5cclxuICAgIHMgPSBkZWMobS5tMTEpICsgXCIsIFwiICsgZGVjKG0ubTEyKSArIFwiLCBcIiArIGRlYyhtLm0xMykgKyBcIiwgXCIgKyBkZWMobS5tMTQpICsgXCJcXFxcblwiO1xyXG4gICAgcyArPSBkZWMobS5tMjEpICsgXCIsIFwiICsgZGVjKG0ubTIyKSArIFwiLCBcIiArIGRlYyhtLm0yMykgKyBcIiwgXCIgKyBkZWMobS5tMjQpICsgXCJcXFxcblwiO1xyXG4gICAgcyArPSBkZWMobS5tMzEpICsgXCIsIFwiICsgZGVjKG0ubTMyKSArIFwiLCBcIiArIGRlYyhtLm0zMykgKyBcIiwgXCIgKyBkZWMobS5tMzQpICsgXCJcXFxcblwiO1xyXG4gICAgcyArPSBkZWMobS5tNDEpICsgXCIsIFwiICsgZGVjKG0ubTQyKSArIFwiLCBcIiArIGRlYyhtLm00MykgKyBcIiwgXCIgKyBkZWMobS5tNDQpICsgXCJcXFxcblwiO1xyXG5cclxuICAgIHJldHVybiBzO1xyXG4gIH1cclxuXHJcbiAgcm90YXRlKGFuZ2xlOiBudW1iZXIsIHg6IG51bWJlciB8IGFueSwgeTogbnVtYmVyLCB6OiBudW1iZXIpIHtcclxuICAgIGlmICh0eXBlb2YgeCA9PT0gXCJvYmplY3RcIiAmJiBcImxlbmd0aFwiIGluIHgpIHtcclxuICAgICAgbGV0IHQgPSB4O1xyXG4gICAgICB4ID0gdFswXTtcclxuICAgICAgeSA9IHRbMV07XHJcbiAgICAgIHogPSB0WzJdO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICB4ID0geSA9IDA7XHJcbiAgICAgICAgeiA9IDE7XHJcbiAgICAgIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMykge1xyXG4gICAgICAgIHRoaXMucm90YXRlKGFuZ2xlLCAxLCAwLCAwKTtcclxuICAgICAgICB0aGlzLnJvdGF0ZSh4LCAwLCAxLCAwKTtcclxuICAgICAgICB0aGlzLnJvdGF0ZSh5LCAwLCAwLCAxKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhbmdsZSAvPSAyO1xyXG4gICAgbGV0IHNpbkEgPSBNYXRoLnNpbihhbmdsZSk7XHJcbiAgICBsZXQgY29zQSA9IE1hdGguY29zKGFuZ2xlKTtcclxuICAgIGxldCBzaW5BMiA9IHNpbkEgKiBzaW5BO1xyXG4gICAgbGV0IGxlbiA9IE1hdGguc3FydCh4ICogeCArIHkgKiB5ICsgeiAqIHopO1xyXG5cclxuICAgIGlmIChsZW4gPT09IDApIHtcclxuICAgICAgeCA9IDA7XHJcbiAgICAgIHkgPSAwO1xyXG4gICAgICB6ID0gMTtcclxuICAgIH0gZWxzZSBpZiAobGVuICE9PSAxKSB7XHJcbiAgICAgIHggLz0gbGVuO1xyXG4gICAgICB5IC89IGxlbjtcclxuICAgICAgeiAvPSBsZW47XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IG1hdCA9IHRlbXBfbWF0cy5uZXh0KCkubWFrZUlkZW50aXR5KCk7XHJcblxyXG4gICAgaWYgKHggPT09IDEgJiYgeSA9PT0gMCAmJiB6ID09PSAwKSB7XHJcbiAgICAgIG1hdC4kbWF0cml4Lm0xMSA9IDE7XHJcbiAgICAgIG1hdC4kbWF0cml4Lm0xMiA9IDA7XHJcbiAgICAgIG1hdC4kbWF0cml4Lm0xMyA9IDA7XHJcbiAgICAgIG1hdC4kbWF0cml4Lm0yMSA9IDA7XHJcbiAgICAgIG1hdC4kbWF0cml4Lm0yMiA9IDEgLSAyICogc2luQTI7XHJcbiAgICAgIG1hdC4kbWF0cml4Lm0yMyA9IDIgKiBzaW5BICogY29zQTtcclxuICAgICAgbWF0LiRtYXRyaXgubTMxID0gMDtcclxuICAgICAgbWF0LiRtYXRyaXgubTMyID0gLTIgKiBzaW5BICogY29zQTtcclxuICAgICAgbWF0LiRtYXRyaXgubTMzID0gMSAtIDIgKiBzaW5BMjtcclxuICAgICAgbWF0LiRtYXRyaXgubTE0ID0gbWF0LiRtYXRyaXgubTI0ID0gbWF0LiRtYXRyaXgubTM0ID0gMDtcclxuICAgICAgbWF0LiRtYXRyaXgubTQxID0gbWF0LiRtYXRyaXgubTQyID0gbWF0LiRtYXRyaXgubTQzID0gMDtcclxuICAgICAgbWF0LiRtYXRyaXgubTQ0ID0gMTtcclxuICAgIH0gZWxzZSBpZiAoeCA9PT0gMCAmJiB5ID09PSAxICYmIHogPT09IDApIHtcclxuICAgICAgbWF0LiRtYXRyaXgubTExID0gMSAtIDIgKiBzaW5BMjtcclxuICAgICAgbWF0LiRtYXRyaXgubTEyID0gMDtcclxuICAgICAgbWF0LiRtYXRyaXgubTEzID0gLTIgKiBzaW5BICogY29zQTtcclxuICAgICAgbWF0LiRtYXRyaXgubTIxID0gMDtcclxuICAgICAgbWF0LiRtYXRyaXgubTIyID0gMTtcclxuICAgICAgbWF0LiRtYXRyaXgubTIzID0gMDtcclxuICAgICAgbWF0LiRtYXRyaXgubTMxID0gMiAqIHNpbkEgKiBjb3NBO1xyXG4gICAgICBtYXQuJG1hdHJpeC5tMzIgPSAwO1xyXG4gICAgICBtYXQuJG1hdHJpeC5tMzMgPSAxIC0gMiAqIHNpbkEyO1xyXG4gICAgICBtYXQuJG1hdHJpeC5tMTQgPSBtYXQuJG1hdHJpeC5tMjQgPSBtYXQuJG1hdHJpeC5tMzQgPSAwO1xyXG4gICAgICBtYXQuJG1hdHJpeC5tNDEgPSBtYXQuJG1hdHJpeC5tNDIgPSBtYXQuJG1hdHJpeC5tNDMgPSAwO1xyXG4gICAgICBtYXQuJG1hdHJpeC5tNDQgPSAxO1xyXG4gICAgfSBlbHNlIGlmICh4ID09PSAwICYmIHkgPT09IDAgJiYgeiA9PT0gMSkge1xyXG4gICAgICBtYXQuJG1hdHJpeC5tMTEgPSAxIC0gMiAqIHNpbkEyO1xyXG4gICAgICBtYXQuJG1hdHJpeC5tMTIgPSAyICogc2luQSAqIGNvc0E7XHJcbiAgICAgIG1hdC4kbWF0cml4Lm0xMyA9IDA7XHJcbiAgICAgIG1hdC4kbWF0cml4Lm0yMSA9IC0yICogc2luQSAqIGNvc0E7XHJcbiAgICAgIG1hdC4kbWF0cml4Lm0yMiA9IDEgLSAyICogc2luQTI7XHJcbiAgICAgIG1hdC4kbWF0cml4Lm0yMyA9IDA7XHJcbiAgICAgIG1hdC4kbWF0cml4Lm0zMSA9IDA7XHJcbiAgICAgIG1hdC4kbWF0cml4Lm0zMiA9IDA7XHJcbiAgICAgIG1hdC4kbWF0cml4Lm0zMyA9IDE7XHJcbiAgICAgIG1hdC4kbWF0cml4Lm0xNCA9IG1hdC4kbWF0cml4Lm0yNCA9IG1hdC4kbWF0cml4Lm0zNCA9IDA7XHJcbiAgICAgIG1hdC4kbWF0cml4Lm00MSA9IG1hdC4kbWF0cml4Lm00MiA9IG1hdC4kbWF0cml4Lm00MyA9IDA7XHJcbiAgICAgIG1hdC4kbWF0cml4Lm00NCA9IDE7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBsZXQgeDIgPSB4ICogeDtcclxuICAgICAgbGV0IHkyID0geSAqIHk7XHJcbiAgICAgIGxldCB6MiA9IHogKiB6O1xyXG4gICAgICBtYXQuJG1hdHJpeC5tMTEgPSAxIC0gMiAqICh5MiArIHoyKSAqIHNpbkEyO1xyXG4gICAgICBtYXQuJG1hdHJpeC5tMTIgPSAyICogKHggKiB5ICogc2luQTIgKyB6ICogc2luQSAqIGNvc0EpO1xyXG4gICAgICBtYXQuJG1hdHJpeC5tMTMgPSAyICogKHggKiB6ICogc2luQTIgLSB5ICogc2luQSAqIGNvc0EpO1xyXG4gICAgICBtYXQuJG1hdHJpeC5tMjEgPSAyICogKHkgKiB4ICogc2luQTIgLSB6ICogc2luQSAqIGNvc0EpO1xyXG4gICAgICBtYXQuJG1hdHJpeC5tMjIgPSAxIC0gMiAqICh6MiArIHgyKSAqIHNpbkEyO1xyXG4gICAgICBtYXQuJG1hdHJpeC5tMjMgPSAyICogKHkgKiB6ICogc2luQTIgKyB4ICogc2luQSAqIGNvc0EpO1xyXG4gICAgICBtYXQuJG1hdHJpeC5tMzEgPSAyICogKHogKiB4ICogc2luQTIgKyB5ICogc2luQSAqIGNvc0EpO1xyXG4gICAgICBtYXQuJG1hdHJpeC5tMzIgPSAyICogKHogKiB5ICogc2luQTIgLSB4ICogc2luQSAqIGNvc0EpO1xyXG4gICAgICBtYXQuJG1hdHJpeC5tMzMgPSAxIC0gMiAqICh4MiArIHkyKSAqIHNpbkEyO1xyXG4gICAgICBtYXQuJG1hdHJpeC5tMTQgPSBtYXQuJG1hdHJpeC5tMjQgPSBtYXQuJG1hdHJpeC5tMzQgPSAwO1xyXG4gICAgICBtYXQuJG1hdHJpeC5tNDEgPSBtYXQuJG1hdHJpeC5tNDIgPSBtYXQuJG1hdHJpeC5tNDMgPSAwO1xyXG4gICAgICBtYXQuJG1hdHJpeC5tNDQgPSAxO1xyXG4gICAgfVxyXG4gICAgdGhpcy5tdWx0aXBseShtYXQpO1xyXG5cclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgbm9ybWFsaXplKCkge1xyXG4gICAgbGV0IG0gPSB0aGlzLiRtYXRyaXg7XHJcblxyXG4gICAgbGV0IHYxID0gbmV3IFZlY3RvcjQoW20ubTExLCBtLm0xMiwgbS5tMTMsIG0ubTE0XSk7XHJcbiAgICBsZXQgdjIgPSBuZXcgVmVjdG9yNChbbS5tMjEsIG0ubTIyLCBtLm0yMywgbS5tMjRdKTtcclxuICAgIGxldCB2MyA9IG5ldyBWZWN0b3I0KFttLm0zMSwgbS5tMzIsIG0ubTMzLCBtLm0zNF0pO1xyXG4gICAgbGV0IHY0ID0gbmV3IFZlY3RvcjQoW20ubTQxLCBtLm00MiwgbS5tNDMsIG0ubTQ0XSk7XHJcblxyXG4gICAgdjEubm9ybWFsaXplKCk7XHJcbiAgICB2Mi5ub3JtYWxpemUoKTtcclxuICAgIHYzLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgIGxldCBmbGF0ID0gbmV3IEFycmF5KCkuY29uY2F0KHYxKS5jb25jYXQodjIpLmNvbmNhdCh2MykuY29uY2F0KHY0KTtcclxuICAgIHRoaXMubG9hZChmbGF0KTtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIGNsZWFyVHJhbnNsYXRpb24oc2V0X3dfdG9fb25lID0gZmFsc2UpIHtcclxuICAgIGxldCBtID0gdGhpcy4kbWF0cml4O1xyXG5cclxuICAgIG0ubTQxID0gbS5tNDIgPSBtLm00MyA9IDAuMDtcclxuXHJcbiAgICBpZiAoc2V0X3dfdG9fb25lKSB7XHJcbiAgICAgIG0ubTQ0ID0gMS4wO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgc2V0VHJhbnNsYXRpb24oeDogbnVtYmVyIHwgYW55LCB5OiBudW1iZXIsIHo6IG51bWJlciwgcmVzZXRXID0gdHJ1ZSkge1xyXG4gICAgaWYgKHR5cGVvZiB4ID09PSBcIm9iamVjdFwiKSB7XHJcbiAgICAgIHkgPSB4WzFdO1xyXG4gICAgICB6ID0geFsyXTtcclxuICAgICAgeCA9IHhbMF07XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IG0gPSB0aGlzLiRtYXRyaXg7XHJcblxyXG4gICAgbS5tNDEgPSB4O1xyXG4gICAgbS5tNDIgPSB5O1xyXG4gICAgbS5tNDMgPSB6O1xyXG5cclxuICAgIGlmIChyZXNldFcpIHtcclxuICAgICAgbS5tNDQgPSAxLjA7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICAvL3RoaXMgaXMgcmVhbGx5IGxpa2UgdGhlIGxvb2tBdCBtZXRob2QsIGlzbid0IGl0LlxyXG4gIG1ha2VOb3JtYWxNYXRyaXgobm9ybWFsOiBWZWN0b3IzLCB1cD86IFZlY3RvcjMpIHtcclxuICAgIGlmIChub3JtYWwgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJub3JtYWwgY2Fubm90IGJlIHVuZGVmaW5lZFwiKTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgbiA9IG1ha2Vub3JtYWxjYWNoZS5uZXh0KCkubG9hZChub3JtYWwpLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgIGlmICh1cCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHVwID0gbWFrZW5vcm1hbGNhY2hlLm5leHQoKS56ZXJvKCk7XHJcblxyXG4gICAgICBpZiAoTWF0aC5hYnMoblsyXSkgPiAwLjk1KSB7XHJcbiAgICAgICAgdXBbMV0gPSAxLjA7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdXBbMl0gPSAxLjA7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB1cCA9IG1ha2Vub3JtYWxjYWNoZS5uZXh0KCkubG9hZCh1cCk7XHJcblxyXG4gICAgdXAubm9ybWFsaXplKCk7XHJcblxyXG4gICAgaWYgKHVwLmRvdChub3JtYWwpID4gMC45OSkge1xyXG4gICAgICB0aGlzLm1ha2VJZGVudGl0eSgpO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0gZWxzZSBpZiAodXAuZG90KG5vcm1hbCkgPCAtMC45OSkge1xyXG4gICAgICB0aGlzLm1ha2VJZGVudGl0eSgpO1xyXG4gICAgICB0aGlzLnNjYWxlKDEuMCwgMS4wLCAtMS4wKTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IHggPSBtYWtlbm9ybWFsY2FjaGUubmV4dCgpO1xyXG4gICAgbGV0IHkgPSBtYWtlbm9ybWFsY2FjaGUubmV4dCgpO1xyXG5cclxuICAgIHgubG9hZChuKS5jcm9zcyh1cCkubm9ybWFsaXplKCk7XHJcbiAgICB5LmxvYWQoeCkuY3Jvc3Mobikubm9ybWFsaXplKCk7XHJcbiAgICAvL3kubmVnYXRlKCk7XHJcblxyXG4gICAgdGhpcy5tYWtlSWRlbnRpdHkoKTtcclxuICAgIGxldCBtID0gdGhpcy4kbWF0cml4O1xyXG5cclxuICAgIG0ubTExID0geFswXTtcclxuICAgIG0ubTEyID0geFsxXTtcclxuICAgIG0ubTEzID0geFsyXTtcclxuXHJcbiAgICBtLm0yMSA9IHlbMF07XHJcbiAgICBtLm0yMiA9IHlbMV07XHJcbiAgICBtLm0yMyA9IHlbMl07XHJcblxyXG4gICAgbS5tMzEgPSBuWzBdO1xyXG4gICAgbS5tMzIgPSBuWzFdO1xyXG4gICAgbS5tMzMgPSBuWzJdO1xyXG4gICAgbS5tNDQgPSAxLjA7XHJcblxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBwcmVNdWx0aXBseShtYXQ6IHRoaXMgfCBNYXRyaXg0KSB7XHJcbiAgICBwcmVNdWx0VGVtcC5sb2FkKG1hdCk7XHJcbiAgICBwcmVNdWx0VGVtcC5tdWx0aXBseSh0aGlzKTtcclxuXHJcbiAgICB0aGlzLmxvYWQocHJlTXVsdFRlbXApO1xyXG5cclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgbXVsdGlwbHkobWF0OiB0aGlzIHwgTWF0cml4NCkge1xyXG4gICAgbGV0IG1tID0gdGhpcy4kbWF0cml4O1xyXG4gICAgbGV0IG1tMiA9IG1hdC4kbWF0cml4O1xyXG5cclxuICAgIGxldCBtMTEgPSBtbTIubTExICogbW0ubTExICsgbW0yLm0xMiAqIG1tLm0yMSArIG1tMi5tMTMgKiBtbS5tMzEgKyBtbTIubTE0ICogbW0ubTQxO1xyXG4gICAgbGV0IG0xMiA9IG1tMi5tMTEgKiBtbS5tMTIgKyBtbTIubTEyICogbW0ubTIyICsgbW0yLm0xMyAqIG1tLm0zMiArIG1tMi5tMTQgKiBtbS5tNDI7XHJcbiAgICBsZXQgbTEzID0gbW0yLm0xMSAqIG1tLm0xMyArIG1tMi5tMTIgKiBtbS5tMjMgKyBtbTIubTEzICogbW0ubTMzICsgbW0yLm0xNCAqIG1tLm00MztcclxuICAgIGxldCBtMTQgPSBtbTIubTExICogbW0ubTE0ICsgbW0yLm0xMiAqIG1tLm0yNCArIG1tMi5tMTMgKiBtbS5tMzQgKyBtbTIubTE0ICogbW0ubTQ0O1xyXG4gICAgbGV0IG0yMSA9IG1tMi5tMjEgKiBtbS5tMTEgKyBtbTIubTIyICogbW0ubTIxICsgbW0yLm0yMyAqIG1tLm0zMSArIG1tMi5tMjQgKiBtbS5tNDE7XHJcbiAgICBsZXQgbTIyID0gbW0yLm0yMSAqIG1tLm0xMiArIG1tMi5tMjIgKiBtbS5tMjIgKyBtbTIubTIzICogbW0ubTMyICsgbW0yLm0yNCAqIG1tLm00MjtcclxuICAgIGxldCBtMjMgPSBtbTIubTIxICogbW0ubTEzICsgbW0yLm0yMiAqIG1tLm0yMyArIG1tMi5tMjMgKiBtbS5tMzMgKyBtbTIubTI0ICogbW0ubTQzO1xyXG4gICAgbGV0IG0yNCA9IG1tMi5tMjEgKiBtbS5tMTQgKyBtbTIubTIyICogbW0ubTI0ICsgbW0yLm0yMyAqIG1tLm0zNCArIG1tMi5tMjQgKiBtbS5tNDQ7XHJcbiAgICBsZXQgbTMxID0gbW0yLm0zMSAqIG1tLm0xMSArIG1tMi5tMzIgKiBtbS5tMjEgKyBtbTIubTMzICogbW0ubTMxICsgbW0yLm0zNCAqIG1tLm00MTtcclxuICAgIGxldCBtMzIgPSBtbTIubTMxICogbW0ubTEyICsgbW0yLm0zMiAqIG1tLm0yMiArIG1tMi5tMzMgKiBtbS5tMzIgKyBtbTIubTM0ICogbW0ubTQyO1xyXG4gICAgbGV0IG0zMyA9IG1tMi5tMzEgKiBtbS5tMTMgKyBtbTIubTMyICogbW0ubTIzICsgbW0yLm0zMyAqIG1tLm0zMyArIG1tMi5tMzQgKiBtbS5tNDM7XHJcbiAgICBsZXQgbTM0ID0gbW0yLm0zMSAqIG1tLm0xNCArIG1tMi5tMzIgKiBtbS5tMjQgKyBtbTIubTMzICogbW0ubTM0ICsgbW0yLm0zNCAqIG1tLm00NDtcclxuICAgIGxldCBtNDEgPSBtbTIubTQxICogbW0ubTExICsgbW0yLm00MiAqIG1tLm0yMSArIG1tMi5tNDMgKiBtbS5tMzEgKyBtbTIubTQ0ICogbW0ubTQxO1xyXG4gICAgbGV0IG00MiA9IG1tMi5tNDEgKiBtbS5tMTIgKyBtbTIubTQyICogbW0ubTIyICsgbW0yLm00MyAqIG1tLm0zMiArIG1tMi5tNDQgKiBtbS5tNDI7XHJcbiAgICBsZXQgbTQzID0gbW0yLm00MSAqIG1tLm0xMyArIG1tMi5tNDIgKiBtbS5tMjMgKyBtbTIubTQzICogbW0ubTMzICsgbW0yLm00NCAqIG1tLm00MztcclxuICAgIGxldCBtNDQgPSBtbTIubTQxICogbW0ubTE0ICsgbW0yLm00MiAqIG1tLm0yNCArIG1tMi5tNDMgKiBtbS5tMzQgKyBtbTIubTQ0ICogbW0ubTQ0O1xyXG5cclxuICAgIG1tLm0xMSA9IG0xMTtcclxuICAgIG1tLm0xMiA9IG0xMjtcclxuICAgIG1tLm0xMyA9IG0xMztcclxuICAgIG1tLm0xNCA9IG0xNDtcclxuICAgIG1tLm0yMSA9IG0yMTtcclxuICAgIG1tLm0yMiA9IG0yMjtcclxuICAgIG1tLm0yMyA9IG0yMztcclxuICAgIG1tLm0yNCA9IG0yNDtcclxuICAgIG1tLm0zMSA9IG0zMTtcclxuICAgIG1tLm0zMiA9IG0zMjtcclxuICAgIG1tLm0zMyA9IG0zMztcclxuICAgIG1tLm0zNCA9IG0zNDtcclxuICAgIG1tLm00MSA9IG00MTtcclxuICAgIG1tLm00MiA9IG00MjtcclxuICAgIG1tLm00MyA9IG00MztcclxuICAgIG1tLm00NCA9IG00NDtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIGRpdmlkZShkaXZpc29yOiBudW1iZXIpIHtcclxuICAgIHRoaXMuJG1hdHJpeC5tMTEgLz0gZGl2aXNvcjtcclxuICAgIHRoaXMuJG1hdHJpeC5tMTIgLz0gZGl2aXNvcjtcclxuICAgIHRoaXMuJG1hdHJpeC5tMTMgLz0gZGl2aXNvcjtcclxuICAgIHRoaXMuJG1hdHJpeC5tMTQgLz0gZGl2aXNvcjtcclxuICAgIHRoaXMuJG1hdHJpeC5tMjEgLz0gZGl2aXNvcjtcclxuICAgIHRoaXMuJG1hdHJpeC5tMjIgLz0gZGl2aXNvcjtcclxuICAgIHRoaXMuJG1hdHJpeC5tMjMgLz0gZGl2aXNvcjtcclxuICAgIHRoaXMuJG1hdHJpeC5tMjQgLz0gZGl2aXNvcjtcclxuICAgIHRoaXMuJG1hdHJpeC5tMzEgLz0gZGl2aXNvcjtcclxuICAgIHRoaXMuJG1hdHJpeC5tMzIgLz0gZGl2aXNvcjtcclxuICAgIHRoaXMuJG1hdHJpeC5tMzMgLz0gZGl2aXNvcjtcclxuICAgIHRoaXMuJG1hdHJpeC5tMzQgLz0gZGl2aXNvcjtcclxuICAgIHRoaXMuJG1hdHJpeC5tNDEgLz0gZGl2aXNvcjtcclxuICAgIHRoaXMuJG1hdHJpeC5tNDIgLz0gZGl2aXNvcjtcclxuICAgIHRoaXMuJG1hdHJpeC5tNDMgLz0gZGl2aXNvcjtcclxuICAgIHRoaXMuJG1hdHJpeC5tNDQgLz0gZGl2aXNvcjtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIG9ydGhvKGxlZnQ6IG51bWJlciwgcmlnaHQ6IG51bWJlciwgYm90dG9tOiBudW1iZXIsIHRvcDogbnVtYmVyLCBuZWFyOiBudW1iZXIsIGZhcjogbnVtYmVyKSB7XHJcbiAgICBjb25zb2xlLndhcm4oXCJNYXRyaXg0Lm9ydGhvKCkgaXMgZGVwcmVjYXRlZCwgdXNlIC5vcnRob2dyYXBoaWMoKSBpbnN0ZWFkXCIpO1xyXG5cclxuICAgIGxldCB0eCA9IChsZWZ0ICsgcmlnaHQpIC8gKGxlZnQgLSByaWdodCk7XHJcbiAgICBsZXQgdHkgPSAodG9wICsgYm90dG9tKSAvICh0b3AgLSBib3R0b20pO1xyXG4gICAgbGV0IHR6ID0gKGZhciArIG5lYXIpIC8gKGZhciAtIG5lYXIpO1xyXG4gICAgbGV0IG1hdHJpeCA9IHRlbXBfbWF0cy5uZXh0KCkubWFrZUlkZW50aXR5KCk7XHJcblxyXG4gICAgbWF0cml4LiRtYXRyaXgubTExID0gMiAvIChsZWZ0IC0gcmlnaHQpO1xyXG4gICAgbWF0cml4LiRtYXRyaXgubTEyID0gMDtcclxuICAgIG1hdHJpeC4kbWF0cml4Lm0xMyA9IDA7XHJcbiAgICBtYXRyaXguJG1hdHJpeC5tMTQgPSAwO1xyXG4gICAgbWF0cml4LiRtYXRyaXgubTIxID0gMDtcclxuICAgIG1hdHJpeC4kbWF0cml4Lm0yMiA9IDIgLyAodG9wIC0gYm90dG9tKTtcclxuICAgIG1hdHJpeC4kbWF0cml4Lm0yMyA9IDA7XHJcbiAgICBtYXRyaXguJG1hdHJpeC5tMjQgPSAwO1xyXG4gICAgbWF0cml4LiRtYXRyaXgubTMxID0gMDtcclxuICAgIG1hdHJpeC4kbWF0cml4Lm0zMiA9IDA7XHJcbiAgICBtYXRyaXguJG1hdHJpeC5tMzMgPSAtMiAvIChmYXIgLSBuZWFyKTtcclxuICAgIG1hdHJpeC4kbWF0cml4Lm0zNCA9IDA7XHJcbiAgICBtYXRyaXguJG1hdHJpeC5tNDEgPSB0eDtcclxuICAgIG1hdHJpeC4kbWF0cml4Lm00MiA9IHR5O1xyXG4gICAgbWF0cml4LiRtYXRyaXgubTQzID0gdHo7XHJcbiAgICBtYXRyaXguJG1hdHJpeC5tNDQgPSAxO1xyXG5cclxuICAgIHRoaXMubXVsdGlwbHkobWF0cml4IGFzIHRoaXMpO1xyXG5cclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgZnJ1c3R1bShsZWZ0OiBudW1iZXIsIHJpZ2h0OiBudW1iZXIsIGJvdHRvbTogbnVtYmVyLCB0b3A6IG51bWJlciwgbmVhcjogbnVtYmVyLCBmYXI6IG51bWJlcikge1xyXG4gICAgbGV0IG1hdHJpeCA9IHRlbXBfbWF0cy5uZXh0KCkubWFrZUlkZW50aXR5KCk7XHJcblxyXG4gICAgbGV0IEEgPSAocmlnaHQgKyBsZWZ0KSAvIChyaWdodCAtIGxlZnQpO1xyXG4gICAgbGV0IEIgPSAodG9wICsgYm90dG9tKSAvICh0b3AgLSBib3R0b20pO1xyXG4gICAgbGV0IEMgPSAtKGZhciArIG5lYXIpIC8gKGZhciAtIG5lYXIpO1xyXG4gICAgbGV0IEQgPSAtKDIgKiBmYXIgKiBuZWFyKSAvIChmYXIgLSBuZWFyKTtcclxuXHJcbiAgICBtYXRyaXguJG1hdHJpeC5tMTEgPSAoMiAqIG5lYXIpIC8gKHJpZ2h0IC0gbGVmdCk7XHJcbiAgICBtYXRyaXguJG1hdHJpeC5tMTIgPSAwO1xyXG4gICAgbWF0cml4LiRtYXRyaXgubTEzID0gMDtcclxuICAgIG1hdHJpeC4kbWF0cml4Lm0xNCA9IDA7XHJcbiAgICBtYXRyaXguJG1hdHJpeC5tMjEgPSAwO1xyXG4gICAgbWF0cml4LiRtYXRyaXgubTIyID0gKDIgKiBuZWFyKSAvICh0b3AgLSBib3R0b20pO1xyXG4gICAgbWF0cml4LiRtYXRyaXgubTIzID0gMDtcclxuICAgIG1hdHJpeC4kbWF0cml4Lm0yNCA9IDA7XHJcbiAgICBtYXRyaXguJG1hdHJpeC5tMzEgPSBBO1xyXG4gICAgbWF0cml4LiRtYXRyaXgubTMyID0gQjtcclxuICAgIG1hdHJpeC4kbWF0cml4Lm0zMyA9IEM7XHJcbiAgICBtYXRyaXguJG1hdHJpeC5tMzQgPSAtMTtcclxuICAgIG1hdHJpeC4kbWF0cml4Lm00MSA9IDA7XHJcbiAgICBtYXRyaXguJG1hdHJpeC5tNDIgPSAwO1xyXG4gICAgbWF0cml4LiRtYXRyaXgubTQzID0gRDtcclxuICAgIG1hdHJpeC4kbWF0cml4Lm00NCA9IDA7XHJcblxyXG4gICAgdGhpcy5pc1BlcnNwID0gdHJ1ZTtcclxuICAgIHRoaXMubXVsdGlwbHkobWF0cml4IGFzIHRoaXMpO1xyXG5cclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgb3J0aG9ncmFwaGljKHNjYWxlOiBudW1iZXIsIGFzcGVjdDogbnVtYmVyLCBuZWFyOiBudW1iZXIsIGZhcjogbnVtYmVyKSB7XHJcbiAgICBsZXQgbWF0ID0gdGVtcF9tYXRzLm5leHQoKS5tYWtlSWRlbnRpdHkoKTtcclxuXHJcbiAgICBsZXQgenNjYWxlID0gZmFyIC0gbmVhcjtcclxuXHJcbiAgICBtYXQuc2NhbGUoMi4wIC8gYXNwZWN0LCAyLjAsIC0xLjAgLyBzY2FsZSAvIHpzY2FsZSwgMS4wIC8gc2NhbGUpO1xyXG4gICAgbWF0LnRyYW5zbGF0ZSgwLjAsIDAuMCwgMC41ICogenNjYWxlIC0gbmVhcik7XHJcblxyXG4gICAgdGhpcy5pc1BlcnNwID0gdHJ1ZTsgLy93ZSBzdGlsbCBtYWtlIHVzZSBvZiBhdXRvIGhvbW9nZW5vdXMgZGl2aWRlIGluIEJhc2VWZWN0b3IubXVsdFZlY01hdHJpeFxyXG4gICAgdGhpcy5tdWx0aXBseShtYXQgYXMgdGhpcyk7XHJcblxyXG4gICAgcmV0dXJuIG1hdDtcclxuICB9XHJcblxyXG4gIHBlcnNwZWN0aXZlKGZvdnk6IG51bWJlciwgYXNwZWN0OiBudW1iZXIsIHpOZWFyOiBudW1iZXIsIHpGYXI6IG51bWJlcikge1xyXG4gICAgbGV0IHRvcCA9IE1hdGgudGFuKChmb3Z5ICogTWF0aC5QSSkgLyAzNjApICogek5lYXI7XHJcbiAgICBsZXQgYm90dG9tID0gLXRvcDtcclxuICAgIGxldCBsZWZ0ID0gYXNwZWN0ICogYm90dG9tO1xyXG4gICAgbGV0IHJpZ2h0ID0gYXNwZWN0ICogdG9wO1xyXG5cclxuICAgIHRoaXMuZnJ1c3R1bShsZWZ0LCByaWdodCwgYm90dG9tLCB0b3AsIHpOZWFyLCB6RmFyKTtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIGxvb2thdChwb3M6IFZlY3RvcjMsIHRhcmdldDogVmVjdG9yMywgdXA6IFZlY3RvcjMpIHtcclxuICAgIGxldCBtYXRyaXggPSBsb29rYXRfY2FjaGVfbXMubmV4dCgpO1xyXG4gICAgbWF0cml4Lm1ha2VJZGVudGl0eSgpO1xyXG5cclxuICAgIGxldCB2ZWMgPSBsb29rYXRfY2FjaGVfdnMzLm5leHQoKS5sb2FkKHBvcykuc3ViKHRhcmdldCk7XHJcbiAgICBsZXQgbGVuID0gdmVjLnZlY3Rvckxlbmd0aCgpO1xyXG4gICAgdmVjLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgIGxldCB6dmVjID0gdmVjO1xyXG4gICAgbGV0IHl2ZWMgPSBsb29rYXRfY2FjaGVfdnMzLm5leHQoKS5sb2FkKHVwKS5ub3JtYWxpemUoKTtcclxuICAgIGxldCB4dmVjID0gbG9va2F0X2NhY2hlX3ZzMy5uZXh0KCkubG9hZCh5dmVjKS5jcm9zcyh6dmVjKS5ub3JtYWxpemUoKTtcclxuXHJcbiAgICBsZXQgbW0gPSBtYXRyaXguJG1hdHJpeDtcclxuXHJcbiAgICBtbS5tMTEgPSB4dmVjWzBdO1xyXG4gICAgbW0ubTEyID0geXZlY1swXTtcclxuICAgIG1tLm0xMyA9IHp2ZWNbMF07XHJcbiAgICBtbS5tMTQgPSAwO1xyXG4gICAgbW0ubTIxID0geHZlY1sxXTtcclxuICAgIG1tLm0yMiA9IHl2ZWNbMV07XHJcbiAgICBtbS5tMjMgPSB6dmVjWzFdO1xyXG4gICAgbW0ubTI0ID0gMDtcclxuICAgIG1tLm0zMSA9IHh2ZWNbMl07XHJcbiAgICBtbS5tMzIgPSB5dmVjWzJdO1xyXG4gICAgbW0ubTMzID0genZlY1syXTtcclxuXHJcbiAgICAvLypcclxuICAgIG1tLm0xMSA9IHh2ZWNbMF07XHJcbiAgICBtbS5tMTIgPSB4dmVjWzFdO1xyXG4gICAgbW0ubTEzID0geHZlY1syXTtcclxuICAgIG1tLm0xNCA9IDA7XHJcbiAgICBtbS5tMjEgPSB5dmVjWzBdO1xyXG4gICAgbW0ubTIyID0geXZlY1sxXTtcclxuICAgIG1tLm0yMyA9IHl2ZWNbMl07XHJcbiAgICBtbS5tMjQgPSAwO1xyXG4gICAgbW0ubTMxID0genZlY1swXTtcclxuICAgIG1tLm0zMiA9IHp2ZWNbMV07XHJcbiAgICBtbS5tMzMgPSB6dmVjWzJdO1xyXG4gICAgbW0ubTM0ID0gMDtcclxuICAgIG1tLm00MSA9IHBvc1swXTtcclxuICAgIG1tLm00MiA9IHBvc1sxXTtcclxuICAgIG1tLm00MyA9IHBvc1syXTtcclxuICAgIG1tLm00NCA9IDE7XHJcbiAgICAvLyovXHJcblxyXG4gICAgdGhpcy5tdWx0aXBseShtYXRyaXggYXMgdGhpcyk7XHJcblxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBtYWtlUm90YXRpb25Pbmx5KCkge1xyXG4gICAgbGV0IG0gPSB0aGlzLiRtYXRyaXg7XHJcblxyXG4gICAgbS5tNDEgPSBtLm00MiA9IG0ubTQzID0gMC4wO1xyXG4gICAgbS5tNDQgPSAxLjA7XHJcblxyXG4gICAgbGV0IGwxID0gTWF0aC5zcXJ0KG0ubTExICogbS5tMTEgKyBtLm0xMiAqIG0ubTEyICsgbS5tMTMgKiBtLm0xMyk7XHJcbiAgICBsZXQgbDIgPSBNYXRoLnNxcnQobS5tMjEgKiBtLm0yMSArIG0ubTIyICogbS5tMjIgKyBtLm0yMyAqIG0ubTIzKTtcclxuICAgIGxldCBsMyA9IE1hdGguc3FydChtLm0zMSAqIG0ubTMxICsgbS5tMzIgKiBtLm0zMiArIG0ubTMzICogbS5tMzMpO1xyXG5cclxuICAgIGlmIChsMSkge1xyXG4gICAgICBtLm0xMSAvPSBsMTtcclxuICAgICAgbS5tMTIgLz0gbDE7XHJcbiAgICAgIG0ubTEzIC89IGwxO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChsMikge1xyXG4gICAgICBtLm0yMSAvPSBsMjtcclxuICAgICAgbS5tMjIgLz0gbDI7XHJcbiAgICAgIG0ubTIzIC89IGwyO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChsMykge1xyXG4gICAgICBtLm0zMSAvPSBsMztcclxuICAgICAgbS5tMzIgLz0gbDM7XHJcbiAgICAgIG0ubTMzIC89IGwzO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgZ2V0QXNWZWNzKCk6IFZlY3RvcjRbXSB7XHJcbiAgICByZXR1cm4gW1xyXG4gICAgICBuZXcgVmVjdG9yNCgpLmxvYWRYWVpXKHRoaXMuJG1hdHJpeC5tMTEsIHRoaXMuJG1hdHJpeC5tMTIsIHRoaXMuJG1hdHJpeC5tMTMsIHRoaXMuJG1hdHJpeC5tMTQpLFxyXG4gICAgICBuZXcgVmVjdG9yNCgpLmxvYWRYWVpXKHRoaXMuJG1hdHJpeC5tMjEsIHRoaXMuJG1hdHJpeC5tMjIsIHRoaXMuJG1hdHJpeC5tMjMsIHRoaXMuJG1hdHJpeC5tMjQpLFxyXG4gICAgICBuZXcgVmVjdG9yNCgpLmxvYWRYWVpXKHRoaXMuJG1hdHJpeC5tMzEsIHRoaXMuJG1hdHJpeC5tMzIsIHRoaXMuJG1hdHJpeC5tMzMsIHRoaXMuJG1hdHJpeC5tMzQpLFxyXG4gICAgICBuZXcgVmVjdG9yNCgpLmxvYWRYWVpXKHRoaXMuJG1hdHJpeC5tNDEsIHRoaXMuJG1hdHJpeC5tNDIsIHRoaXMuJG1hdHJpeC5tNDMsIHRoaXMuJG1hdHJpeC5tNDQpLFxyXG4gICAgXTtcclxuICB9XHJcblxyXG4gIGxvYWRGcm9tVmVjcyh2ZWNzOiBWZWN0b3I0W10pIHtcclxuICAgIGxldCBtID0gdGhpcy4kbWF0cml4O1xyXG4gICAgbS5tMTEgPSB2ZWNzWzBdWzBdO1xyXG4gICAgbS5tMTIgPSB2ZWNzWzBdWzFdO1xyXG4gICAgbS5tMTMgPSB2ZWNzWzBdWzJdO1xyXG4gICAgbS5tMTQgPSB2ZWNzWzBdWzNdO1xyXG5cclxuICAgIG0ubTIxID0gdmVjc1sxXVswXTtcclxuICAgIG0ubTIyID0gdmVjc1sxXVsxXTtcclxuICAgIG0ubTIzID0gdmVjc1sxXVsyXTtcclxuICAgIG0ubTI0ID0gdmVjc1sxXVszXTtcclxuXHJcbiAgICBtLm0zMSA9IHZlY3NbMl1bMF07XHJcbiAgICBtLm0zMiA9IHZlY3NbMl1bMV07XHJcbiAgICBtLm0zMyA9IHZlY3NbMl1bMl07XHJcbiAgICBtLm0zNCA9IHZlY3NbMl1bM107XHJcblxyXG4gICAgbS5tNDEgPSB2ZWNzWzNdWzBdO1xyXG4gICAgbS5tNDIgPSB2ZWNzWzNdWzFdO1xyXG4gICAgbS5tNDMgPSB2ZWNzWzNdWzJdO1xyXG4gICAgbS5tNDQgPSB2ZWNzWzNdWzNdO1xyXG4gICAgcmV0dXJuIHRoaXNcclxuICB9XHJcblxyXG4gIGFsaWduQXhpcyhheGlzOiBudW1iZXIsIHZlY186IG51bWJlcltdIHwgSVZlY3RvcjMpIHtcclxuICAgIGNvbnN0IHZlYyA9IG5ldyBWZWN0b3I0KCkubG9hZDModmVjXyk7XHJcbiAgICB2ZWMubm9ybWFsaXplKCk7XHJcblxyXG4gICAgbGV0IG1hdCA9IHRoaXM7XHJcbiAgICBsZXQgbSA9IG1hdC4kbWF0cml4O1xyXG5cclxuICAgIGxldCBtYXQyID0gbmV3IE1hdHJpeDQobWF0KTtcclxuICAgIGxldCBsb2MgPSBuZXcgVmVjdG9yMygpLFxyXG4gICAgICBzY2FsZSA9IG5ldyBWZWN0b3IzKCksXHJcbiAgICAgIHJvdCA9IG5ldyBWZWN0b3IzKCk7XHJcblxyXG4gICAgLy93ZSBkb24ndCB1c2Ugcm90XHJcbiAgICBtYXQyLmRlY29tcG9zZShsb2MsIHJvdCwgc2NhbGUpO1xyXG4gICAgbWF0Mi5tYWtlUm90YXRpb25Pbmx5KCk7XHJcblxyXG4gICAgbGV0IGF4ZXMgPSBtYXQyLmdldEFzVmVjcygpO1xyXG5cclxuICAgIGxldCBheGlzMiA9IChheGlzICsgMSkgJSAzO1xyXG4gICAgbGV0IGF4aXMzID0gKGF4aXMgKyAyKSAlIDM7XHJcblxyXG4gICAgYXhlc1theGlzXS5sb2FkKHZlYyk7XHJcbiAgICBheGVzW2F4aXMyXS5jcm9zcyhheGVzW2F4aXNdKS5jcm9zcyhheGVzW2F4aXNdKTtcclxuICAgIGF4ZXNbYXhpczNdLmxvYWQoYXhlc1theGlzXSkuY3Jvc3MoYXhlc1theGlzMl0pO1xyXG5cclxuICAgIGF4ZXNbMF1bM10gPSAxLjA7XHJcbiAgICBheGVzWzFdWzNdID0gMS4wO1xyXG4gICAgYXhlc1syXVszXSA9IDEuMDtcclxuXHJcbiAgICBheGVzWzBdLm5vcm1hbGl6ZSgpO1xyXG4gICAgYXhlc1sxXS5ub3JtYWxpemUoKTtcclxuICAgIGF4ZXNbMl0ubm9ybWFsaXplKCk7XHJcblxyXG4gICAgdGhpcy5sb2FkRnJvbVZlY3MoYXhlcyk7XHJcbiAgICB0aGlzLnNjYWxlKHNjYWxlWzBdLCBzY2FsZVsxXSwgc2NhbGVbMl0pO1xyXG5cclxuICAgIG0ubTQxID0gbG9jWzBdO1xyXG4gICAgbS5tNDIgPSBsb2NbMV07XHJcbiAgICBtLm00MyA9IGxvY1syXTtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIGRlY29tcG9zZShfdHJhbnNsYXRlOiBhbnksIF9yb3RhdGU/OiBhbnksIF9zY2FsZT86IGFueSwgX3NrZXc/OiBhbnksIF9wZXJzcGVjdGl2ZT86IGFueSwgb3JkZXIgPSBFdWxlck9yZGVycy5YWVopIHtcclxuICAgIGlmICh0aGlzLiRtYXRyaXgubTQ0ID09PSAwKSByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgbGV0IG1hdCA9IHRlbXBfbWF0cy5uZXh0KCkubG9hZCh0aGlzKTtcclxuICAgIGxldCBtID0gbWF0LiRtYXRyaXg7XHJcblxyXG4gICAgbGV0IHQgPSBfdHJhbnNsYXRlLFxyXG4gICAgICByID0gX3JvdGF0ZSxcclxuICAgICAgcyA9IF9zY2FsZTtcclxuICAgIGlmICh0KSB7XHJcbiAgICAgIHRbMF0gPSBtLm00MTtcclxuICAgICAgdFsxXSA9IG0ubTQyO1xyXG4gICAgICB0WzJdID0gbS5tNDM7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGwxID0gTWF0aC5zcXJ0KG0ubTExICogbS5tMTEgKyBtLm0xMiAqIG0ubTEyICsgbS5tMTMgKiBtLm0xMyk7XHJcbiAgICBsZXQgbDIgPSBNYXRoLnNxcnQobS5tMjEgKiBtLm0yMSArIG0ubTIyICogbS5tMjIgKyBtLm0yMyAqIG0ubTIzKTtcclxuICAgIGxldCBsMyA9IE1hdGguc3FydChtLm0zMSAqIG0ubTMxICsgbS5tMzIgKiBtLm0zMiArIG0ubTMzICogbS5tMzMpO1xyXG5cclxuICAgIGlmIChsMSkge1xyXG4gICAgICBtLm0xMSAvPSBsMTtcclxuICAgICAgbS5tMTIgLz0gbDE7XHJcbiAgICAgIG0ubTEzIC89IGwxO1xyXG4gICAgfVxyXG4gICAgaWYgKGwyKSB7XHJcbiAgICAgIG0ubTIxIC89IGwyO1xyXG4gICAgICBtLm0yMiAvPSBsMjtcclxuICAgICAgbS5tMjMgLz0gbDI7XHJcbiAgICB9XHJcbiAgICBpZiAobDMpIHtcclxuICAgICAgbS5tMzEgLz0gbDM7XHJcbiAgICAgIG0ubTMyIC89IGwzO1xyXG4gICAgICBtLm0zMyAvPSBsMztcclxuICAgIH1cclxuXHJcbiAgICBpZiAocykge1xyXG4gICAgICBzWzBdID0gbDE7XHJcbiAgICAgIHNbMV0gPSBsMjtcclxuICAgICAgc1syXSA9IGwzO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChyKSB7XHJcbiAgICAgIC8vVEhSRUUuanMgY29kZVxyXG4gICAgICBsZXQgY2xhbXAgPSBteWNsYW1wO1xyXG5cclxuICAgICAgbGV0IHJtYXQgPSB0ZW1wX21hdHMubmV4dCgpLmxvYWQodGhpcyk7XHJcbiAgICAgIHJtYXQubm9ybWFsaXplKCk7XHJcblxyXG4gICAgICBtID0gcm1hdC4kbWF0cml4O1xyXG5cclxuICAgICAgLy8gYXNzdW1lcyB0aGUgdXBwZXIgM3gzIG9mIG0gaXMgYSBwdXJlIHJvdGF0aW9uIG1hdHJpeCAoaS5lLCB1bnNjYWxlZClcclxuXHJcbiAgICAgIGxldCBtMTEgPSBtLm0xMSxcclxuICAgICAgICBtMTIgPSBtLm0xMixcclxuICAgICAgICBtMTMgPSBtLm0xMyxcclxuICAgICAgICBtMTQgPSBtLm0xNDtcclxuICAgICAgbGV0IG0yMSA9IG0ubTIxLFxyXG4gICAgICAgIG0yMiA9IG0ubTIyLFxyXG4gICAgICAgIG0yMyA9IG0ubTIzLFxyXG4gICAgICAgIG0yNCA9IG0ubTI0O1xyXG4gICAgICBsZXQgbTMxID0gbS5tMzEsXHJcbiAgICAgICAgbTMyID0gbS5tMzIsXHJcbiAgICAgICAgbTMzID0gbS5tMzMsXHJcbiAgICAgICAgbTM0ID0gbS5tMzQ7XHJcbiAgICAgIC8vbGV0IG00MSA9IG0ubTQxLCBtNDIgPSBtLm00MiwgbTQzID0gbS5tNDMsIG00NCA9IG0ubTQ0O1xyXG5cclxuICAgICAgaWYgKG9yZGVyID09PSBFdWxlck9yZGVycy5YWVopIHtcclxuICAgICAgICByWzFdID0gTWF0aC5hc2luKGNsYW1wKG0xMywgLTEsIDEpKTtcclxuXHJcbiAgICAgICAgaWYgKE1hdGguYWJzKG0xMykgPCAwLjk5OTk5OTkpIHtcclxuICAgICAgICAgIHJbMF0gPSBNYXRoLmF0YW4yKC1tMjMsIG0zMyk7XHJcbiAgICAgICAgICByWzJdID0gTWF0aC5hdGFuMigtbTEyLCBtMTEpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICByWzBdID0gTWF0aC5hdGFuMihtMzIsIG0yMik7XHJcbiAgICAgICAgICByWzJdID0gMDtcclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSBpZiAob3JkZXIgPT09IEV1bGVyT3JkZXJzLllYWikge1xyXG4gICAgICAgIHJbMF0gPSBNYXRoLmFzaW4oLWNsYW1wKG0yMywgLTEsIDEpKTtcclxuXHJcbiAgICAgICAgaWYgKE1hdGguYWJzKG0yMykgPCAwLjk5OTk5OTkpIHtcclxuICAgICAgICAgIHJbMV0gPSBNYXRoLmF0YW4yKG0xMywgbTMzKTtcclxuICAgICAgICAgIHJbMl0gPSBNYXRoLmF0YW4yKG0yMSwgbTIyKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgclsxXSA9IE1hdGguYXRhbjIoLW0zMSwgbTExKTtcclxuICAgICAgICAgIHJbMl0gPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIGlmIChvcmRlciA9PT0gRXVsZXJPcmRlcnMuWlhZKSB7XHJcbiAgICAgICAgclswXSA9IE1hdGguYXNpbihjbGFtcChtMzIsIC0xLCAxKSk7XHJcblxyXG4gICAgICAgIGlmIChNYXRoLmFicyhtMzIpIDwgMC45OTk5OTk5KSB7XHJcbiAgICAgICAgICByWzFdID0gTWF0aC5hdGFuMigtbTMxLCBtMzMpO1xyXG4gICAgICAgICAgclsyXSA9IE1hdGguYXRhbjIoLW0xMiwgbTIyKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgclsxXSA9IDA7XHJcbiAgICAgICAgICByWzJdID0gTWF0aC5hdGFuMihtMjEsIG0xMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2UgaWYgKG9yZGVyID09PSBFdWxlck9yZGVycy5aWVgpIHtcclxuICAgICAgICByWzFdID0gTWF0aC5hc2luKC1jbGFtcChtMzEsIC0xLCAxKSk7XHJcblxyXG4gICAgICAgIGlmIChNYXRoLmFicyhtMzEpIDwgMC45OTk5OTk5KSB7XHJcbiAgICAgICAgICByWzBdID0gTWF0aC5hdGFuMihtMzIsIG0zMyk7XHJcbiAgICAgICAgICByWzJdID0gTWF0aC5hdGFuMihtMjEsIG0xMSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHJbMF0gPSAwO1xyXG4gICAgICAgICAgclsyXSA9IE1hdGguYXRhbjIoLW0xMiwgbTIyKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSBpZiAob3JkZXIgPT09IEV1bGVyT3JkZXJzLllaWCkge1xyXG4gICAgICAgIHJbMl0gPSBNYXRoLmFzaW4oY2xhbXAobTIxLCAtMSwgMSkpO1xyXG5cclxuICAgICAgICBpZiAoTWF0aC5hYnMobTIxKSA8IDAuOTk5OTk5OSkge1xyXG4gICAgICAgICAgclswXSA9IE1hdGguYXRhbjIoLW0yMywgbTIyKTtcclxuICAgICAgICAgIHJbMV0gPSBNYXRoLmF0YW4yKC1tMzEsIG0xMSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHJbMF0gPSAwO1xyXG4gICAgICAgICAgclsxXSA9IE1hdGguYXRhbjIobTEzLCBtMzMpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIGlmIChvcmRlciA9PT0gRXVsZXJPcmRlcnMuWFpZKSB7XHJcbiAgICAgICAgclsyXSA9IE1hdGguYXNpbigtY2xhbXAobTEyLCAtMSwgMSkpO1xyXG5cclxuICAgICAgICBpZiAoTWF0aC5hYnMobTEyKSA8IDAuOTk5OTk5OSkge1xyXG4gICAgICAgICAgclswXSA9IE1hdGguYXRhbjIobTMyLCBtMjIpO1xyXG4gICAgICAgICAgclsxXSA9IE1hdGguYXRhbjIobTEzLCBtMTEpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICByWzBdID0gTWF0aC5hdGFuMigtbTIzLCBtMzMpO1xyXG4gICAgICAgICAgclsxXSA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnNvbGUud2FybihcInVuc3VwcG9ydGVkIGV1bGVyIG9yZGVyOlwiLCBvcmRlcik7XHJcbiAgICAgIH1cclxuICAgICAgLy9yWzBdID0gTWF0aC5hdGFuMihtLm0yMywgbS5tMzMpO1xyXG4gICAgICAvL3JbMV0gPSBNYXRoLmF0YW4yKC1tLm0xMywgTWF0aC5zcXJ0KG0ubTIzKm0ubTIzICsgbS5tMzMqbS5tMzMpKTtcclxuICAgICAgLy9yWzJdID0gTWF0aC5hdGFuMihtLm0xMiwgbS5tMTEpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgX2RldGVybWluYW50MngyKGE6bnVtYmVyLCBiOm51bWJlciwgYzpudW1iZXIsIGQ6bnVtYmVyKSB7XHJcbiAgICByZXR1cm4gYSAqIGQgLSBiICogYztcclxuICB9XHJcblxyXG4gIF9kZXRlcm1pbmFudDN4MyhhMTpudW1iZXIsIGEyOm51bWJlciwgYTM6bnVtYmVyLCBiMTpudW1iZXIsIGIyOm51bWJlciwgYjM6bnVtYmVyLCBjMTpudW1iZXIsIGMyOm51bWJlciwgYzM6bnVtYmVyKSB7XHJcbiAgICByZXR1cm4gKFxyXG4gICAgICBhMSAqIHRoaXMuX2RldGVybWluYW50MngyKGIyLCBiMywgYzIsIGMzKSAtXHJcbiAgICAgIGIxICogdGhpcy5fZGV0ZXJtaW5hbnQyeDIoYTIsIGEzLCBjMiwgYzMpICtcclxuICAgICAgYzEgKiB0aGlzLl9kZXRlcm1pbmFudDJ4MihhMiwgYTMsIGIyLCBiMylcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBfZGV0ZXJtaW5hbnQ0eDQoKSB7XHJcbiAgICBsZXQgYTEgPSB0aGlzLiRtYXRyaXgubTExO1xyXG4gICAgbGV0IGIxID0gdGhpcy4kbWF0cml4Lm0xMjtcclxuICAgIGxldCBjMSA9IHRoaXMuJG1hdHJpeC5tMTM7XHJcbiAgICBsZXQgZDEgPSB0aGlzLiRtYXRyaXgubTE0O1xyXG4gICAgbGV0IGEyID0gdGhpcy4kbWF0cml4Lm0yMTtcclxuICAgIGxldCBiMiA9IHRoaXMuJG1hdHJpeC5tMjI7XHJcbiAgICBsZXQgYzIgPSB0aGlzLiRtYXRyaXgubTIzO1xyXG4gICAgbGV0IGQyID0gdGhpcy4kbWF0cml4Lm0yNDtcclxuICAgIGxldCBhMyA9IHRoaXMuJG1hdHJpeC5tMzE7XHJcbiAgICBsZXQgYjMgPSB0aGlzLiRtYXRyaXgubTMyO1xyXG4gICAgbGV0IGMzID0gdGhpcy4kbWF0cml4Lm0zMztcclxuICAgIGxldCBkMyA9IHRoaXMuJG1hdHJpeC5tMzQ7XHJcbiAgICBsZXQgYTQgPSB0aGlzLiRtYXRyaXgubTQxO1xyXG4gICAgbGV0IGI0ID0gdGhpcy4kbWF0cml4Lm00MjtcclxuICAgIGxldCBjNCA9IHRoaXMuJG1hdHJpeC5tNDM7XHJcbiAgICBsZXQgZDQgPSB0aGlzLiRtYXRyaXgubTQ0O1xyXG4gICAgcmV0dXJuIChcclxuICAgICAgYTEgKiB0aGlzLl9kZXRlcm1pbmFudDN4MyhiMiwgYjMsIGI0LCBjMiwgYzMsIGM0LCBkMiwgZDMsIGQ0KSAtXHJcbiAgICAgIGIxICogdGhpcy5fZGV0ZXJtaW5hbnQzeDMoYTIsIGEzLCBhNCwgYzIsIGMzLCBjNCwgZDIsIGQzLCBkNCkgK1xyXG4gICAgICBjMSAqIHRoaXMuX2RldGVybWluYW50M3gzKGEyLCBhMywgYTQsIGIyLCBiMywgYjQsIGQyLCBkMywgZDQpIC1cclxuICAgICAgZDEgKiB0aGlzLl9kZXRlcm1pbmFudDN4MyhhMiwgYTMsIGE0LCBiMiwgYjMsIGI0LCBjMiwgYzMsIGM0KVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIF9tYWtlQWRqb2ludCgpIHtcclxuICAgIGxldCBhMSA9IHRoaXMuJG1hdHJpeC5tMTE7XHJcbiAgICBsZXQgYjEgPSB0aGlzLiRtYXRyaXgubTEyO1xyXG4gICAgbGV0IGMxID0gdGhpcy4kbWF0cml4Lm0xMztcclxuICAgIGxldCBkMSA9IHRoaXMuJG1hdHJpeC5tMTQ7XHJcbiAgICBsZXQgYTIgPSB0aGlzLiRtYXRyaXgubTIxO1xyXG4gICAgbGV0IGIyID0gdGhpcy4kbWF0cml4Lm0yMjtcclxuICAgIGxldCBjMiA9IHRoaXMuJG1hdHJpeC5tMjM7XHJcbiAgICBsZXQgZDIgPSB0aGlzLiRtYXRyaXgubTI0O1xyXG4gICAgbGV0IGEzID0gdGhpcy4kbWF0cml4Lm0zMTtcclxuICAgIGxldCBiMyA9IHRoaXMuJG1hdHJpeC5tMzI7XHJcbiAgICBsZXQgYzMgPSB0aGlzLiRtYXRyaXgubTMzO1xyXG4gICAgbGV0IGQzID0gdGhpcy4kbWF0cml4Lm0zNDtcclxuICAgIGxldCBhNCA9IHRoaXMuJG1hdHJpeC5tNDE7XHJcbiAgICBsZXQgYjQgPSB0aGlzLiRtYXRyaXgubTQyO1xyXG4gICAgbGV0IGM0ID0gdGhpcy4kbWF0cml4Lm00MztcclxuICAgIGxldCBkNCA9IHRoaXMuJG1hdHJpeC5tNDQ7XHJcblxyXG4gICAgdGhpcy4kbWF0cml4Lm0xMSA9IHRoaXMuX2RldGVybWluYW50M3gzKGIyLCBiMywgYjQsIGMyLCBjMywgYzQsIGQyLCBkMywgZDQpO1xyXG4gICAgdGhpcy4kbWF0cml4Lm0yMSA9IC10aGlzLl9kZXRlcm1pbmFudDN4MyhhMiwgYTMsIGE0LCBjMiwgYzMsIGM0LCBkMiwgZDMsIGQ0KTtcclxuICAgIHRoaXMuJG1hdHJpeC5tMzEgPSB0aGlzLl9kZXRlcm1pbmFudDN4MyhhMiwgYTMsIGE0LCBiMiwgYjMsIGI0LCBkMiwgZDMsIGQ0KTtcclxuICAgIHRoaXMuJG1hdHJpeC5tNDEgPSAtdGhpcy5fZGV0ZXJtaW5hbnQzeDMoYTIsIGEzLCBhNCwgYjIsIGIzLCBiNCwgYzIsIGMzLCBjNCk7XHJcbiAgICB0aGlzLiRtYXRyaXgubTEyID0gLXRoaXMuX2RldGVybWluYW50M3gzKGIxLCBiMywgYjQsIGMxLCBjMywgYzQsIGQxLCBkMywgZDQpO1xyXG4gICAgdGhpcy4kbWF0cml4Lm0yMiA9IHRoaXMuX2RldGVybWluYW50M3gzKGExLCBhMywgYTQsIGMxLCBjMywgYzQsIGQxLCBkMywgZDQpO1xyXG4gICAgdGhpcy4kbWF0cml4Lm0zMiA9IC10aGlzLl9kZXRlcm1pbmFudDN4MyhhMSwgYTMsIGE0LCBiMSwgYjMsIGI0LCBkMSwgZDMsIGQ0KTtcclxuICAgIHRoaXMuJG1hdHJpeC5tNDIgPSB0aGlzLl9kZXRlcm1pbmFudDN4MyhhMSwgYTMsIGE0LCBiMSwgYjMsIGI0LCBjMSwgYzMsIGM0KTtcclxuICAgIHRoaXMuJG1hdHJpeC5tMTMgPSB0aGlzLl9kZXRlcm1pbmFudDN4MyhiMSwgYjIsIGI0LCBjMSwgYzIsIGM0LCBkMSwgZDIsIGQ0KTtcclxuICAgIHRoaXMuJG1hdHJpeC5tMjMgPSAtdGhpcy5fZGV0ZXJtaW5hbnQzeDMoYTEsIGEyLCBhNCwgYzEsIGMyLCBjNCwgZDEsIGQyLCBkNCk7XHJcbiAgICB0aGlzLiRtYXRyaXgubTMzID0gdGhpcy5fZGV0ZXJtaW5hbnQzeDMoYTEsIGEyLCBhNCwgYjEsIGIyLCBiNCwgZDEsIGQyLCBkNCk7XHJcbiAgICB0aGlzLiRtYXRyaXgubTQzID0gLXRoaXMuX2RldGVybWluYW50M3gzKGExLCBhMiwgYTQsIGIxLCBiMiwgYjQsIGMxLCBjMiwgYzQpO1xyXG4gICAgdGhpcy4kbWF0cml4Lm0xNCA9IC10aGlzLl9kZXRlcm1pbmFudDN4MyhiMSwgYjIsIGIzLCBjMSwgYzIsIGMzLCBkMSwgZDIsIGQzKTtcclxuICAgIHRoaXMuJG1hdHJpeC5tMjQgPSB0aGlzLl9kZXRlcm1pbmFudDN4MyhhMSwgYTIsIGEzLCBjMSwgYzIsIGMzLCBkMSwgZDIsIGQzKTtcclxuICAgIHRoaXMuJG1hdHJpeC5tMzQgPSAtdGhpcy5fZGV0ZXJtaW5hbnQzeDMoYTEsIGEyLCBhMywgYjEsIGIyLCBiMywgZDEsIGQyLCBkMyk7XHJcbiAgICB0aGlzLiRtYXRyaXgubTQ0ID0gdGhpcy5fZGV0ZXJtaW5hbnQzeDMoYTEsIGEyLCBhMywgYjEsIGIyLCBiMywgYzEsIGMyLCBjMyk7XHJcbiAgfVxyXG5cclxuICBsb2FkU1RSVUNUKHJlYWRlcjogU3RydWN0UmVhZGVyPHRoaXM+KSB7XHJcbiAgICByZWFkZXIodGhpcyk7XHJcblxyXG4gICAgY29uc3Qgc2F2ZWQgPSB0aGlzIGFzIGFueVxyXG4gICAgdGhpcy5sb2FkKHNhdmVkLm1hdCk7XHJcbiAgICBzYXZlZC5fX21hdCA9IHNhdmVkLm1hdDtcclxuICAgIC8vZGVsZXRlIHNhdmVkLm1hdDtcclxuICB9XHJcbn1cclxuXHJcbmxvb2thdF9jYWNoZV92czMgPSB1dGlsLmNhY2hlcmluZy5mcm9tQ29uc3RydWN0b3IoVmVjdG9yMywgNTEyKTtcclxubG9va2F0X2NhY2hlX3ZzNCA9IHV0aWwuY2FjaGVyaW5nLmZyb21Db25zdHJ1Y3RvcihWZWN0b3I0LCA1MTIpO1xyXG5sb29rYXRfY2FjaGVfbXMgPSB1dGlsLmNhY2hlcmluZy5mcm9tQ29uc3RydWN0b3IoTWF0cml4NCwgNTEyKTtcclxuZXVsZXJfcm90YXRlX21hdHMgPSB1dGlsLmNhY2hlcmluZy5mcm9tQ29uc3RydWN0b3IoTWF0cml4NCwgNTEyKTtcclxubWFrZW5vcm1hbGNhY2hlID0gdXRpbC5jYWNoZXJpbmcuZnJvbUNvbnN0cnVjdG9yKFZlY3RvcjMsIDUxMik7XHJcbnRlbXBfbWF0cyA9IHV0aWwuY2FjaGVyaW5nLmZyb21Db25zdHJ1Y3RvcihNYXRyaXg0LCA1MTIpO1xyXG5wcmVNdWx0VGVtcCA9IG5ldyBNYXRyaXg0KCk7XHJcbmBcclxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFNQSxJQUFJLFdBQXFCO0FBQUEsRUFDdkIsU0FBWTtBQUFBLEVBQ1osT0FBWTtBQUFBLEVBQ1osU0FBWTtBQUFBLEVBQ1osVUFBWTtBQUFBLEVBQ1osUUFBWTtBQUFBLEVBQ1osV0FBWTtBQUFBLEVBQ1osUUFBWTtBQUFBLEVBQ1osU0FBWTtBQUFBLEVBQ1osU0FBWTtBQUFBLEVBQ1osUUFBWTtBQUFBLEVBQ1osVUFBWTtBQUFBLEVBQ1osUUFBWTtBQUFBLEVBQ1osU0FBWTtBQUFBLEVBQ1osWUFBWTtBQUFB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QTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFB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QTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQThMQSxLQUFLLElBQUk7QUFFWCxXQUFTLElBQUksR0FBRyxLQUFLLEdBQUcsS0FBSztBQUMzQixTQUFLLFFBQVFiLGFBQVksVUFBVSxDQUFDO0FBQUEsRUFDdEM7QUFFQSxPQUFLO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQStQTCxPQUFLO0FBQ0wsT0FBSztBQUFBO0FBRUwsVUFBUSxJQUFJLENBQUM7QUFDYixLQUFHLGNBQWMsaUJBQWlCLENBQUM7QUFDckM7QUFDQSxRQUFROyIsCiAgIm5hbWVzIjogWyJrIiwgImFyZ3MiLCAicyIsICJmdW5jIiwgImFyZ3MiLCAiX2xleGVyIiwgImxpbmUiLCAidG9rIiwgInQiLCAibGV4IiwgImsiLCAiZnVuYyIsICJsZXgiLCAiY2xzIiwgImFyZ3MiLCAidGFiIiwgIm1hbmFnZXIiLCAiayIsICJmdW5jIiwgImxleCIsICJ0b2tlbiIsICJjb2RlIiwgImxpbmUiLCAiY2xzIiwgImFyZ3MiLCAicGFyZW50IiwgInN0cnVjdE5hbWUiLCAiayIsICJmbXRfdHlwZSIsICJmIiwgInNlbGYiLCAidHlwZSIsICJmdW5jIiwgInN0IiwgInN0MiIsICJjbHMyIiwgImNvZGUyIiwgImkiLCAic3R0IiwgImxvYWQiLCAiZjIiLCAiYnRvYSIsICJhdG9iIiwgImsiLCAic3RydWN0TmFtZSIsICJhcmdzIiwgImNscyIsICJwYXJlbnQiLCAiX0luZGV4UmFuZ2UiLCAiY2xzIiwgIlZlY3RvcjMiLCAiayIsICJCYXNlVmVjdG9yIiwgInN0cnVjdE5hbWUiLCAic3RydWN0VHlwZSIsICJWZWN0b3I0IiwgIlZlY3RvcjIiLCAidmVjdG9yRG90RGlzdGFuY2UiLCAidmVjdG9yRGlzdGFuY2UiLCAidmVjdG9yRGlzdGFuY2VTcXIiLCAicyIsICJmdW5jIiwgImFyZ3MiLCAibGluZSIsICJmIiwgImNvZGUiLCAibGluZTIiXQp9Cg==
