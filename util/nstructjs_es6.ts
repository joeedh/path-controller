/* ---- color / terminal utilities ---- */

type StructJSONValue = any

interface ColorMap {
  [key: string]: number;
}

let colormap: ColorMap = {
  "black"   : 30,
  "red"     : 31,
  "green"   : 32,
  "yellow"  : 33,
  "blue"    : 34,
  "magenta" : 35,
  "cyan"    : 36,
  "white"   : 37,
  "reset"   : 0,
  "grey"    : 2,
  "orange"  : 202,
  "pink"    : 198,
  "brown"   : 314,
  "lightred": 91,
  "peach"   : 210,
};

function tab(n: number, chr: string = " "): string {
  let t = "";

  for (let i = 0; i < n; i++) {
    t += chr;
  }

  return t;
}

let termColorMap: Record<string | number, string | number> = {};
for (let k in colormap) {
  termColorMap[k] = colormap[k];
  termColorMap[colormap[k]] = k;
}

function termColor(s: string | symbol | number, c: string | number): string {
  if (typeof s === "symbol") {
    s = s.toString();
  } else {
    s = "" + s;
  }

  if (c in colormap) c = colormap[c as string];

  if ((c as number) > 107) {
    let s2 = "\u001b[38;5;" + c + "m";
    return s2 + s + "\u001b[0m";
  }

  return "\u001b[" + c + "m" + s + "\u001b[0m";
}

function termPrint(...args: unknown[]): string {
  let s = "";
  for (let i = 0; i < args.length; i++) {
    if (i > 0) {
      s += " ";
    }
    s += args[i];
  }

  let re1a = /\u001b\[[1-9][0-9]?m/;
  let re1b = /\u001b\[[1-9][0-9];[0-9][0-9]?;[0-9]+m/;
  let re2 = /\u001b\[0m/;

  let endtag = "\u001b[0m";

  function tok(s: string, type: string): { type: string; value: string } {
    return {
      type : type,
      value: s,
    };
  }

  let tokdef_arr: [RegExp, string][] = [
    [re1a, "start"],
    [re1b, "start"],
    [re2, "end"],
  ];

  let s2 = s;

  let tokens: { type: string; value: string }[] = [];

  while (s2.length > 0) {
    let ok = false;

    let mintk: [RegExp, string] | undefined = undefined,
      mini: number | undefined = undefined;
    let minslice: string | undefined = undefined,
      mintype: string | undefined = undefined;

    for (let tk of tokdef_arr) {
      let i = s2.search(tk[0]);

      if (i >= 0 && (mini === undefined || i < mini)) {
        minslice = s2.slice(i, s2.length).match(tk[0])![0];
        mini = i;
        mintype = tk[1];
        mintk = tk;
        ok = true;
      }
    }

    if (!ok) {
      break;
    }

    if (mini! > 0) {
      let chunk = s2.slice(0, mini);
      tokens.push(tok(chunk, "chunk"));
    }

    s2 = s2.slice(mini! + minslice!.length, s2.length);
    let t = tok(minslice!, mintype!);

    tokens.push(t);
  }

  if (s2.length > 0) {
    tokens.push(tok(s2, "chunk"));
  }

  let stack: (string | undefined)[] = [];
  let cur: string | undefined;

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

function list<T>(iter: Iterable<T>): T[] {
  let ret: T[] = [];

  for (let item of iter) {
    ret.push(item);
  }

  return ret;
}

var util = /*#__PURE__*/ Object.freeze({
  __proto__   : null,
  tab         : tab,
  termColorMap: termColorMap,
  termColor   : termColor,
  termPrint   : termPrint,
  list        : list,
});

("use strict");

/* ---- parseutil ---- */

function print_lines(ld: string, lineno: number, col: number, printColors: boolean, tokenArg?: token): string {
  let buf = "";
  let lines = ld.split("\n");
  let istart = Math.max(lineno - 5, 0);
  let iend = Math.min(lineno + 3, lines.length);

  let color = printColors ? (c: string) => c : termColor;

  for (let i = istart; i < iend; i++) {
    let l = "" + (i + 1);
    while (l.length < 3) {
      l = " " + l;
    }

    l += `: ${lines[i]}\n`;

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

class token {
  type: string;
  value: string;
  lexpos: number;
  lineno: number;
  col: number;
  lexer: lexer;
  parser: parser | undefined;

  constructor(
    type: string,
    val: string,
    lexpos: number,
    lineno: number,
    lex: lexer,
    prs: parser | undefined,
    col: number
  ) {
    this.type = type;
    this.value = val;
    this.lexpos = lexpos;
    this.lineno = lineno;
    this.col = col;
    this.lexer = lex;
    this.parser = prs;
  }

  toString(): string {
    if (this.value !== undefined) return "token(type=" + this.type + ", value='" + this.value + "')";
    else return "token(type=" + this.type + ")";
  }
}

type TokFunc = (t: token) => token | undefined;

class tokdef {
  name: string;
  re: RegExp | undefined;
  func: TokFunc | undefined;
  example: string | undefined;

  constructor(name: string, regexpr?: RegExp, func?: TokFunc, example?: string) {
    this.name = name;
    this.re = regexpr;
    this.func = func;
    this.example = example;

    if (example === undefined && regexpr) {
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
}

class PUTIL_ParseError extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

type LexerErrFunc = (lex: lexer) => boolean;

class lexer {
  tokdef: tokdef[];
  tokens: token[];
  lexpos: number;
  lexdata: string;
  colmap: number[] | undefined;
  lineno: number;
  printTokens: boolean;
  linestart: number;
  errfunc: LexerErrFunc | undefined;
  linemap: number[] | undefined;
  tokints: Record<string, number>;
  statestack: [string, unknown][];
  states: Record<string, [tokdef[], LexerErrFunc | undefined]>;
  statedata: unknown;
  peeked_tokens: token[];
  logger: (...args: unknown[]) => void;

  constructor(tokdef_arr: tokdef[], errfunc?: LexerErrFunc) {
    this.tokdef = tokdef_arr;
    this.tokens = new Array();
    this.lexpos = 0;
    this.lexdata = "";
    this.colmap = undefined;
    this.lineno = 0;
    this.printTokens = false;
    this.linestart = 0;
    this.errfunc = errfunc;
    this.linemap = undefined;
    this.tokints = {};
    for (let i = 0; i < tokdef_arr.length; i++) {
      this.tokints[tokdef_arr[i].name] = i;
    }
    this.statestack = [["__main__", 0]];
    this.states = { "__main__": [tokdef_arr, errfunc] };
    this.statedata = 0;
    this.peeked_tokens = [];

    this.logger = function (...args: unknown[]) {
      console.log(...args);
    };
  }

  add_state(name: string, tokdef_arr: tokdef[], errfunc?: LexerErrFunc): void {
    if (errfunc === undefined) {
      errfunc = function (_lexer: lexer): boolean {
        return true;
      };
    }
    this.states[name] = [tokdef_arr, errfunc];
  }

  tok_int(_name: string): void {}

  push_state(state: string, statedata: unknown): void {
    this.statestack.push([state, statedata]);
    let st = this.states[state];
    this.statedata = statedata;
    this.tokdef = st[0];
    this.errfunc = st[1];
  }

  pop_state(): void {
    let item = this.statestack[this.statestack.length - 1];
    let state = this.states[item[0]];
    this.tokdef = state[0];
    this.errfunc = state[1];
    this.statedata = item[1];
  }

  input(str: string): void {
    let linemap: number[] = (this.linemap = new Array<number>(str.length));
    let lineno = 0;
    let col = 0;
    let colmap: number[] = (this.colmap = new Array<number>(str.length));

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

  error(): void {
    if (this.errfunc !== undefined && !this.errfunc(this)) return;

    let safepos = Math.min(this.lexpos, this.lexdata.length - 1);
    let line = this.linemap![safepos];
    let col = this.colmap![safepos];

    let s = print_lines(this.lexdata, line, col, true);

    this.logger("  " + s);
    this.logger("Syntax error near line " + (this.lineno + 1));

    let next = Math.min(this.lexpos + 8, this.lexdata.length);

    throw new PUTIL_ParseError("Parse error");
  }

  peek(): token | undefined {
    let tok = this.next(true);
    if (tok === undefined) return undefined;
    this.peeked_tokens.push(tok);
    return tok;
  }

  peeknext(): token | undefined {
    if (this.peeked_tokens.length > 0) {
      return this.peeked_tokens[0];
    }

    return this.peek();
  }

  at_end(): boolean {
    return this.lexpos >= this.lexdata.length && this.peeked_tokens.length === 0;
  }

  //ignore_peek is optional, false
  next(ignore_peek?: boolean): token | undefined {
    if (!ignore_peek && this.peeked_tokens.length > 0) {
      let tok = this.peeked_tokens[0];
      this.peeked_tokens.shift();

      if (!ignore_peek && this.printTokens) {
        this.logger("" + tok);
      }

      return tok;
    }

    if (this.lexpos >= this.lexdata.length) return undefined;

    let ts = this.tokdef;
    let tlen = ts.length;
    let lexdata = this.lexdata.slice(this.lexpos, this.lexdata.length);
    let results: [tokdef, RegExpExecArray][] = [];

    for (var i = 0; i < tlen; i++) {
      let t = ts[i];
      if (t.re === undefined) continue;
      let res = t.re.exec(lexdata);
      if (res !== null && res !== undefined && res.index === 0) {
        results.push([t, res]);
      }
    }

    let max_res = 0;
    let theres: [tokdef, RegExpExecArray] | undefined = undefined;
    for (var i = 0; i < results.length; i++) {
      let res = results[i];
      if (res[1][0].length > max_res) {
        theres = res;
        max_res = res[1][0].length;
      }
    }

    if (theres === undefined) {
      this.error();
      return;
    }

    let def = theres[0];
    let col = this.colmap![Math.min(this.lexpos, this.lexdata.length - 1)];

    if (this.lexpos < this.lexdata.length) {
      this.lineno = this.linemap![this.lexpos];
    }

    let tok = new token(def.name, theres[1][0], this.lexpos, this.lineno, this, undefined, col);
    this.lexpos += tok.value.length;

    if (def.func) {
      let result = def.func(tok);
      if (result === undefined) {
        return this.next();
      }
      tok = result;
    }

    if (!ignore_peek && this.printTokens) {
      this.logger("" + tok);
    }
    return tok;
  }
}

type ParserErrFunc = (tok: token | undefined) => boolean;

class parser {
  lexer: lexer;
  errfunc: ParserErrFunc | undefined;
  start: ((p: parser) => unknown) | undefined;
  logger: (...args: unknown[]) => void;

  constructor(lex: lexer, errfunc?: ParserErrFunc) {
    this.lexer = lex;
    this.errfunc = errfunc;
    this.start = undefined;

    this.logger = function (...args: unknown[]) {
      console.log(...args);
    };
  }

  parse(data?: string, err_on_unconsumed?: boolean): unknown {
    if (err_on_unconsumed === undefined) err_on_unconsumed = true;

    if (data !== undefined) this.lexer.input(data);

    let ret = this.start!(this);

    if (err_on_unconsumed && !this.lexer.at_end() && this.lexer.next() !== undefined) {
      this.error(undefined, "parser did not consume entire input");
    }
    return ret;
  }

  input(data: string): void {
    this.lexer.input(data);
  }

  error(tokenArg: token | undefined, msg?: string): void {
    let estr: string;

    if (msg === undefined) msg = "";
    if (tokenArg === undefined) estr = "Parse error at end of input: " + msg;
    else estr = `Parse error at line ${tokenArg.lineno + 1}:${tokenArg.col + 1}: ${msg}`;

    let ld = this.lexer.lexdata;
    let lineno = tokenArg ? tokenArg.lineno : this.lexer.linemap![this.lexer.linemap!.length - 1];
    let col = tokenArg ? tokenArg.col : 0;

    ld = ld.replace(/\r/g, "");

    this.logger(print_lines(ld, lineno, col, true, tokenArg));
    this.logger(estr);

    if (this.errfunc && !this.errfunc(tokenArg)) {
      return;
    }
    throw new PUTIL_ParseError(estr);
  }

  peek(): token | undefined {
    let tok = this.lexer.peek();
    if (tok !== undefined) tok.parser = this;
    return tok;
  }

  peeknext(): token | undefined {
    let tok = this.lexer.peeknext();
    if (tok !== undefined) tok.parser = this;
    return tok;
  }

  next(): token | undefined {
    let tok = this.lexer.next();

    if (tok !== undefined) tok.parser = this;
    return tok;
  }

  optional(type: string): boolean {
    let tok = this.peeknext();
    if (tok === undefined) return false;
    if (tok.type === type) {
      this.next();
      return true;
    }
    return false;
  }

  at_end(): boolean {
    return this.lexer.at_end();
  }

  expect(type: string, msg?: string): string {
    let tok = this.next();

    if (msg === undefined) {
      msg = type;

      for (let tk of this.lexer.tokdef) {
        if (tk.name === type && tk.example) {
          msg = tk.example;
        }
      }
    }

    if (tok === undefined || tok.type !== type) {
      this.error(tok, "Expected " + msg);
    }
    return tok!.value;
  }
}

function test_parser(): void {
  let basic_types = new Set(["int", "float", "double", "vec2", "vec3", "vec4", "mat4", "string"]);
  let reserved_tokens = new Set([
    "int",
    "float",
    "double",
    "vec2",
    "vec3",
    "vec4",
    "mat4",
    "string",
    "static_string",
    "array",
  ]);

  function tk(name: string, re?: RegExp, func?: TokFunc): tokdef {
    return new tokdef(name, re, func);
  }

  let tokens = [
    tk("ID", /[a-zA-Z]+[a-zA-Z0-9_]*/, function (t) {
      if (reserved_tokens.has(t.value)) {
        t.type = t.value.toUpperCase();
      }
      return t;
    }),
    tk("OPEN", /\{/),
    tk("CLOSE", /}/),
    tk("COLON", /:/),
    tk("JSCRIPT", /\|/, function (t) {
      let js = "";
      let lex = t.lexer;
      while (lex.lexpos < lex.lexdata.length) {
        let c = lex.lexdata[lex.lexpos];
        if (c === "\n") break;
        js += c;
        lex.lexpos++;
      }
      if (js.endsWith(";")) {
        js = js.slice(0, js.length - 1);
        lex.lexpos--;
      }
      t.value = js;
      return t;
    }),
    tk("LPARAM", /\(/),
    tk("RPARAM", /\)/),
    tk("COMMA", /,/),
    tk("NUM", /[0-9]/),
    tk("SEMI", /;/),
    tk("NEWLINE", /\n/, function (t) {
      t.lexer.lineno += 1;
      return undefined;
    }),
    tk("SPACE", / |\t/, function (_t) {
      return undefined;
    }),
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

  function errfunc(_lex: lexer): boolean {
    return true;
  }

  let lex = new lexer(tokens, errfunc);
  console.log("Testing lexical scanner...");
  lex.input(a);
  let t: token | undefined;
  while ((t = lex.next())) {
    console.log(t.toString());
  }
  let parse = new parser(lex);
  parse.input(a);

  interface ParsedType {
    type: string;
    data?: unknown;
  }

  function p_Array(p: parser): ParsedType {
    p.expect("ARRAY");
    p.expect("LPARAM");
    let arraytype = p_Type(p);
    let itername = "";
    if (p.optional("COMMA")) {
      itername = (arraytype as { type: string; data?: string }).data || "";
      arraytype = p_Type(p);
    }
    p.expect("RPARAM");
    return { type: "array", data: { type: arraytype, iname: itername } };
  }

  function p_Type(p: parser): ParsedType {
    let tok = p.peek()!;
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

  interface ParsedField {
    name: string;
    type: ParsedType;
    set: string | undefined;
    get: string | undefined;
  }

  function p_Field(p: parser): ParsedField {
    let field: ParsedField = {
      name: "",
      type: { type: "" },
      set : undefined,
      get : undefined,
    };
    console.log("-----", p.peek()!.type);
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

  function p_Struct(p: parser): { name: string; fields: ParsedField[] } {
    let st = {
      name  : "",
      fields: [] as ParsedField[],
    };
    st.name = p.expect("ID", "struct name");
    p.expect("OPEN");
    while (1) {
      if (p.at_end()) {
        p.error(undefined);
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

//test_parser();

var struct_parseutil = /*#__PURE__*/ Object.freeze({
  __proto__       : null,
  token           : token,
  tokdef          : tokdef,
  PUTIL_ParseError: PUTIL_ParseError,
  lexer           : lexer,
  parser          : parser,
});

("use strict");

/* ---- struct parser ---- */

interface StructField {
  name: string;
  type: StructType;
  set: string | undefined;
  get: string | undefined;
  comment: string;
}

interface StructType {
  type: number;
  data?: unknown;
  jsonKeyword?: string;
}

class NStruct {
  fields: StructField[];
  id: number;
  name: string;

  constructor(name: string) {
    this.fields = [];
    this.id = -1;
    this.name = name;
  }
}

//the discontinuous id's are to make sure
//the version I originally wrote (which had a few application-specific types)
//and this one do not become totally incompatible.
const StructEnum = {
  INT          : 0,
  FLOAT        : 1,
  DOUBLE       : 2,
  STRING       : 7,
  STATIC_STRING: 8, //fixed-length string
  STRUCT       : 9,
  TSTRUCT      : 10,
  ARRAY        : 11,
  ITER         : 12,
  SHORT        : 13,
  BYTE         : 14,
  BOOL         : 15,
  ITERKEYS     : 16,
  UINT         : 17,
  USHORT       : 18,
  STATIC_ARRAY : 19,
  SIGNED_BYTE  : 20,
  OPTIONAL     : 21,
} as const;

const ArrayTypes = new Set<number>([StructEnum.STATIC_ARRAY, StructEnum.ARRAY, StructEnum.ITERKEYS, StructEnum.ITER]);

const ValueTypes = new Set<number>([
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
  StructEnum.SIGNED_BYTE,
]);

let StructTypes: Record<string, number> = {
  "int"          : StructEnum.INT,
  "uint"         : StructEnum.UINT,
  "ushort"       : StructEnum.USHORT,
  "float"        : StructEnum.FLOAT,
  "double"       : StructEnum.DOUBLE,
  "string"       : StructEnum.STRING,
  "static_string": StructEnum.STATIC_STRING,
  "struct"       : StructEnum.STRUCT,
  "abstract"     : StructEnum.TSTRUCT,
  "array"        : StructEnum.ARRAY,
  "iter"         : StructEnum.ITER,
  "short"        : StructEnum.SHORT,
  "byte"         : StructEnum.BYTE,
  "bool"         : StructEnum.BOOL,
  "iterkeys"     : StructEnum.ITERKEYS,
  "sbyte"        : StructEnum.SIGNED_BYTE,
  "optional"     : StructEnum.OPTIONAL,
};

let StructTypeMap: Record<number, string> = {};

for (let k in StructTypes) {
  StructTypeMap[StructTypes[k]] = k;
}

function gen_tabstr$2(t: number): string {
  let s = "";
  for (let i = 0; i < t; i++) {
    s += "  ";
  }
  return s;
}

function stripComments(buf: string): string {
  let s = "";

  const MAIN = 0,
    COMMENT = 1,
    STR = 2;

  let strs = new Set(["'", '"', "`"]);
  let mode = MAIN;
  let strlit: string = "";
  let escape: boolean = false;

  for (let i = 0; i < buf.length; i++) {
    let p = i > 0 ? buf[i - 1] : undefined;
    let c = buf[i];
    let n = i < buf.length - 1 ? buf[i + 1] : undefined;

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

function StructParser(): parser & { input(str: string): void; at_end(): boolean; peek(): token | undefined } {
  let basic_types = new Set(["int", "float", "double", "string", "short", "byte", "sbyte", "bool", "uint", "ushort"]);

  let reserved_tokens = new Set([
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
    "optional",
  ]);

  function tk(name: string, re?: RegExp, func?: TokFunc, example?: string): tokdef {
    return new tokdef(name, re, func, example);
  }

  let tokens = [
    tk(
      "ID",
      /[a-zA-Z_$]+[a-zA-Z0-9_\.$]*/,
      function (t) {
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
    tk("JSCRIPT", /\|/, function (t) {
      let js = "";
      let lex = t.lexer;
      let p: string | undefined;

      while (lex.lexpos < lex.lexdata.length) {
        let c = lex.lexdata[lex.lexpos];
        if (c === "\n") break;

        if (c === "/" && p === "/") {
          js = js.slice(0, js.length - 1);
          lex.lexpos--;

          break;
        }

        js += c;
        lex.lexpos++;
        p = c;
      }

      while (js.trim().endsWith(";")) {
        js = js.slice(0, js.length - 1);
        lex.lexpos--;
      }
      t.value = js.trim();
      return t;
    }),
    tk("COMMENT", /\/\/.*[\n\r]/),
    tk("LPARAM", /\(/),
    tk("RPARAM", /\)/),
    tk("COMMA", /,/),
    tk("NUM", /[0-9]+/, undefined, "number"),
    tk("SEMI", /;/),
    tk(
      "NEWLINE",
      /\n/,
      function (t) {
        t.lexer.lineno += 1;
        return undefined;
      },
      "newline"
    ),
    tk(
      "SPACE",
      / |\t/,
      function (_t) {
        return undefined;
      },
      "whitespace"
    ),
  ];

  reserved_tokens.forEach(function (rt) {
    tokens.push(tk(rt.toUpperCase()));
  });

  function errfunc(_lex: lexer): boolean {
    return true;
  }

  class Lexer extends lexer {
    input(str: string): void {
      //str = stripComments(str);
      return super.input(str);
    }
  }

  let lex = new Lexer(tokens, errfunc);
  let parser$1 = new parser(lex);

  function p_Static_String(p: parser): StructType {
    p.expect("STATIC_STRING");
    p.expect("SOPEN");
    let num = p.expect("NUM");
    p.expect("SCLOSE");
    return { type: StructEnum.STATIC_STRING, data: { maxlength: num } };
  }

  function p_DataRef(p: parser): StructType {
    p.expect("DATAREF");
    p.expect("LPARAM");
    let tname = p.expect("ID");
    p.expect("RPARAM");
    return { type: (StructEnum as Record<string, number>)["DATAREF"], data: tname };
  }

  function p_Array(p: parser): StructType {
    p.expect("ARRAY");
    p.expect("LPARAM");
    let arraytype = p_Type(p);

    let itername = "";
    if (p.optional("COMMA")) {
      itername = ((arraytype.data as string) || "").replace(/"/g, "");
      arraytype = p_Type(p);
    }

    p.expect("RPARAM");
    return { type: StructEnum.ARRAY, data: { type: arraytype, iname: itername } };
  }

  function p_Iter(p: parser): StructType {
    p.expect("ITER");
    p.expect("LPARAM");

    let arraytype = p_Type(p);
    let itername = "";

    if (p.optional("COMMA")) {
      itername = ((arraytype.data as string) || "").replace(/"/g, "");
      arraytype = p_Type(p);
    }

    p.expect("RPARAM");
    return { type: StructEnum.ITER, data: { type: arraytype, iname: itername } };
  }

  function p_StaticArray(p: parser): StructType {
    p.expect("STATIC_ARRAY");
    p.expect("SOPEN");
    let arraytype = p_Type(p);
    let itername = "";

    p.expect("COMMA");
    let size: number = parseInt(p.expect("NUM"));

    if (size < 0 || Math.abs(size - Math.floor(size)) > 0.000001) {
      console.log(Math.abs(size - Math.floor(size)));
      p.error(undefined, "Expected an integer");
    }

    size = Math.floor(size);

    if (p.optional("COMMA")) {
      itername = p_Type(p).data as string;
    }

    p.expect("SCLOSE");
    return { type: StructEnum.STATIC_ARRAY, data: { type: arraytype, size: size, iname: itername } };
  }

  function p_IterKeys(p: parser): StructType {
    p.expect("ITERKEYS");
    p.expect("LPARAM");

    let arraytype = p_Type(p);
    let itername = "";

    if (p.optional("COMMA")) {
      itername = ((arraytype.data as string) || "").replace(/"/g, "");
      arraytype = p_Type(p);
    }

    p.expect("RPARAM");
    return { type: StructEnum.ITERKEYS, data: { type: arraytype, iname: itername } };
  }

  function p_Abstract(p: parser): StructType {
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
      jsonKeyword,
    };
  }

  function p_Optional(p: parser): StructType {
    p.expect("OPTIONAL");
    p.expect("LPARAM");
    const type = p_Type(p);
    p.expect("RPARAM");

    return {
      type: StructEnum.OPTIONAL,
      data: type,
    };
  }

  function p_Type(p: parser): StructType {
    let tok = p.peeknext()!;

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
      return { type: -1 }; // unreachable, error throws
    }
  }

  function p_ID_or_num(p: parser): string {
    let t = p.peeknext()!;

    if (t.type === "NUM") {
      p.next();
      return t.value;
    } else {
      return p.expect("ID", "struct field name");
    }
  }

  function p_Field(p: parser): StructField {
    let field: StructField = {
      name   : "",
      type   : { type: -1 },
      set    : undefined,
      get    : undefined,
      comment: "",
    };

    field.name = p_ID_or_num(p);
    let is_opt = false;

    if (p.peeknext()!.type === "OPT_COLON") {
      p.expect("OPT_COLON");
      is_opt = true;
    } else {
      p.expect("COLON");
    }

    field.type = p_Type(p);
    if (is_opt) {
      field.type = {
        type: StructEnum.OPTIONAL,
        data: field.type,
      };
    }
    field.set = undefined;
    field.get = undefined;

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

  function p_Struct(p: parser): NStruct {
    let name = p.expect("ID", "struct name");

    let st = new NStruct(name);

    let tok = p.peeknext()!;

    if (tok.type === "ID" && tok.value === "id") {
      p.next();
      p.expect("EQUALS");
      st.id = parseInt(p.expect("NUM"));
    }

    p.expect("OPEN");
    while (1) {
      if (p.at_end()) {
        p.error(undefined);
      } else if (p.optional("CLOSE")) {
        break;
      } else {
        st.fields.push(p_Field(p));
      }
    }

    return st;
  }

  parser$1.start = p_Struct as (p: parser) => unknown;
  return parser$1 as parser & { input(str: string): void; at_end(): boolean; peek(): token | undefined };
}

const struct_parse = StructParser();

var struct_parser = /*#__PURE__*/ Object.freeze({
  __proto__    : null,
  NStruct      : NStruct,
  StructEnum   : StructEnum,
  ArrayTypes   : ArrayTypes,
  ValueTypes   : ValueTypes,
  StructTypes  : StructTypes,
  StructTypeMap: StructTypeMap,
  stripComments: stripComments,
  struct_parse : struct_parse,
});

/** dead file */

var struct_typesystem = /*#__PURE__*/ Object.freeze({
  __proto__: null,
});

("use strict");

/* ---- binary pack/unpack ---- */

var STRUCT_ENDIAN = true; //little endian

function setBinaryEndian(mode: boolean): void {
  STRUCT_ENDIAN = !!mode;
}

let temp_dataview = new DataView(new ArrayBuffer(16));
let uint8_view = new Uint8Array(temp_dataview.buffer);

class unpack_context {
  i: number;

  constructor() {
    this.i = 0;
  }
}

function pack_byte(array: number[], val: number): void {
  array.push(val);
}

function pack_sbyte(array: number[], val: number): void {
  if (val < 0) {
    val = 256 + val;
  }

  array.push(val);
}

function pack_bytes(array: number[], bytes: number[] | Uint8Array): void {
  for (let i = 0; i < bytes.length; i++) {
    array.push(bytes[i]);
  }
}

function pack_int(array: number[], val: number): void {
  temp_dataview.setInt32(0, val, STRUCT_ENDIAN);

  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
  array.push(uint8_view[2]);
  array.push(uint8_view[3]);
}

function pack_uint(array: number[], val: number): void {
  temp_dataview.setUint32(0, val, STRUCT_ENDIAN);

  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
  array.push(uint8_view[2]);
  array.push(uint8_view[3]);
}

function pack_ushort(array: number[], val: number): void {
  temp_dataview.setUint16(0, val, STRUCT_ENDIAN);

  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
}

function pack_float(array: number[], val: number): void {
  temp_dataview.setFloat32(0, val, STRUCT_ENDIAN);

  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
  array.push(uint8_view[2]);
  array.push(uint8_view[3]);
}

function pack_double(array: number[], val: number): void {
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

function pack_short(array: number[], val: number): void {
  temp_dataview.setInt16(0, val, STRUCT_ENDIAN);

  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
}

function encode_utf8(arr: number[], str: string): void {
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

function decode_utf8(arr: number[]): string {
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

function test_utf8(): boolean {
  let s = "a" + String.fromCharCode(8800) + "b";
  let arr: number[] = [];

  encode_utf8(arr, s);
  let s2 = decode_utf8(arr);

  if (s !== s2) {
    throw new Error("UTF-8 encoding/decoding test failed");
  }

  return true;
}

function truncate_utf8(arr: number[], maxlen: number): number[] {
  let len = Math.min(arr.length, maxlen);

  let last_codepoint = 0;
  let last2 = 0;

  let incode: number = 0;
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

let _static_sbuf_ss = new Array<number>(2048);

function pack_static_string(data: number[], str: string, length: number): void {
  if (length === undefined) throw new Error("'length' paremter is not optional for pack_static_string()");

  let arr: number[] = length < 2048 ? _static_sbuf_ss : new Array();
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

let _static_sbuf = new Array<number>(32);

/*strings are packed as 32-bit unicode codepoints*/
function pack_string(data: number[], str: string): void {
  _static_sbuf.length = 0;
  encode_utf8(_static_sbuf, str);

  pack_int(data, _static_sbuf.length);

  for (let i = 0; i < _static_sbuf.length; i++) {
    data.push(_static_sbuf[i]);
  }
}

function unpack_bytes(dview: DataView, uctx: unpack_context, len: number): DataView {
  let ret = new DataView(dview.buffer.slice(uctx.i, uctx.i + len));
  uctx.i += len;

  return ret;
}

function unpack_byte(dview: DataView, uctx: unpack_context): number {
  return dview.getUint8(uctx.i++);
}

function unpack_sbyte(dview: DataView, uctx: unpack_context): number {
  return dview.getInt8(uctx.i++);
}

function unpack_int(dview: DataView, uctx: unpack_context): number {
  uctx.i += 4;
  return dview.getInt32(uctx.i - 4, STRUCT_ENDIAN);
}

function unpack_uint(dview: DataView, uctx: unpack_context): number {
  uctx.i += 4;
  return dview.getUint32(uctx.i - 4, STRUCT_ENDIAN);
}

function unpack_ushort(dview: DataView, uctx: unpack_context): number {
  uctx.i += 2;
  return dview.getUint16(uctx.i - 2, STRUCT_ENDIAN);
}

function unpack_float(dview: DataView, uctx: unpack_context): number {
  uctx.i += 4;
  return dview.getFloat32(uctx.i - 4, STRUCT_ENDIAN);
}

function unpack_double(dview: DataView, uctx: unpack_context): number {
  uctx.i += 8;
  return dview.getFloat64(uctx.i - 8, STRUCT_ENDIAN);
}

function unpack_short(dview: DataView, uctx: unpack_context): number {
  uctx.i += 2;
  return dview.getInt16(uctx.i - 2, STRUCT_ENDIAN);
}

let _static_arr_us = new Array<number>(32);

function unpack_string(data: DataView, uctx: unpack_context): string {
  let slen = unpack_int(data, uctx);

  if (!slen) {
    return "";
  }

  let arr: number[] = slen < 2048 ? _static_arr_us : new Array(slen);

  arr.length = slen;
  for (let i = 0; i < slen; i++) {
    arr[i] = unpack_byte(data, uctx);
  }

  return decode_utf8(arr);
}

let _static_arr_uss = new Array<number>(2048);

function unpack_static_string(data: DataView, uctx: unpack_context, length: number): string {
  if (length === undefined) throw new Error("'length' cannot be undefined in unpack_static_string()");

  let arr: number[] = length < 2048 ? _static_arr_uss : new Array(length);
  arr.length = 0;

  let done = false;
  for (let i = 0; i < length; i++) {
    let c = unpack_byte(data, uctx);

    if (c === 0) {
      done = true;
    }

    if (!done && c !== 0) {
      arr.push(c);
      //arr.length++;
    }
  }

  truncate_utf8(arr, length);
  return decode_utf8(arr);
}

var struct_binpack = /*#__PURE__*/ Object.freeze({
  __proto__: null,
  get STRUCT_ENDIAN() {
    return STRUCT_ENDIAN;
  },
  setBinaryEndian     : setBinaryEndian,
  temp_dataview       : temp_dataview,
  uint8_view          : uint8_view,
  unpack_context      : unpack_context,
  pack_byte           : pack_byte,
  pack_sbyte          : pack_sbyte,
  pack_bytes          : pack_bytes,
  pack_int            : pack_int,
  pack_uint           : pack_uint,
  pack_ushort         : pack_ushort,
  pack_float          : pack_float,
  pack_double         : pack_double,
  pack_short          : pack_short,
  encode_utf8         : encode_utf8,
  decode_utf8         : decode_utf8,
  test_utf8           : test_utf8,
  pack_static_string  : pack_static_string,
  pack_string         : pack_string,
  unpack_bytes        : unpack_bytes,
  unpack_byte         : unpack_byte,
  unpack_sbyte        : unpack_sbyte,
  unpack_int          : unpack_int,
  unpack_uint         : unpack_uint,
  unpack_ushort       : unpack_ushort,
  unpack_float        : unpack_float,
  unpack_double       : unpack_double,
  unpack_short        : unpack_short,
  unpack_string       : unpack_string,
  unpack_static_string: unpack_static_string,
});

/* ---- struct field types ---- */

let warninglvl$1 = 2;
let debug = 0;

let _static_envcode_null$1 = "";
let packer_debug$1: (...args: unknown[]) => void;
let packer_debug_start$1: (funcname?: string) => void;
let packer_debug_end$1: (funcname?: string) => void;
let packdebug_tablevel = 0;

function _get_pack_debug(): {
  packer_debug: typeof packer_debug$1;
  packer_debug_start: typeof packer_debug_start$1;
  packer_debug_end: typeof packer_debug_end$1;
  debug: number;
  warninglvl: number;
} {
  return {
    packer_debug      : packer_debug$1,
    packer_debug_start: packer_debug_start$1,
    packer_debug_end  : packer_debug_end$1,
    debug,
    warninglvl: warninglvl$1,
  };
}

class cachering<T> extends Array<T> {
  cur: number;

  constructor(cb: () => T, tot: number) {
    super();
    this.length = tot;
    this.cur = 0;

    for (let i = 0; i < tot; i++) {
      this[i] = cb();
    }
  }

  static fromConstructor<T>(cls: new () => T, tot: number): cachering<T> {
    return new cachering(() => new cls(), tot);
  }

  next(): T {
    let ret = this[this.cur];

    this.cur = (this.cur + 1) % this.length;

    return ret;
  }
}

function gen_tabstr$1(tot: number): string {
  let ret = "";

  for (let i = 0; i < tot; i++) {
    ret += " ";
  }

  return ret;
}

function setWarningMode2(t: number): void {
  if (typeof t !== "number" || isNaN(t)) {
    throw new Error("Expected a single number (>= 0) argument to setWarningMode");
  }

  warninglvl$1 = t;
}

function setDebugMode2(t: number): void {
  debug = t;

  if (debug) {
    packer_debug$1 = function (...args: unknown[]) {
      let tab = gen_tabstr$1(packdebug_tablevel);

      if (args.length > 0) {
        console.warn(tab, ...args);
      } else {
        console.warn("Warning: undefined msg");
      }
    };
    packer_debug_start$1 = function (funcname?: string) {
      packer_debug$1("Start " + funcname);
      packdebug_tablevel++;
    };

    packer_debug_end$1 = function (funcname?: string) {
      packdebug_tablevel--;

      if (funcname) {
        packer_debug$1("Leave " + funcname);
      }
    };
  } else {
    packer_debug$1 = function () {};
    packer_debug_start$1 = function () {};
    packer_debug_end$1 = function () {};
  }
}

setDebugMode2(debug);

/** Structable class interface */
export interface StructableClass {
  STRUCT?: string;
  structName?: string;
  name: string;
  prototype: any;
  newSTRUCT?: (loader: StructReader) => unknown;
  fromSTRUCT?: (loader: StructReader) => unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): unknown;
  __proto__?: StructableClass;
}

/** The loader callback type */
export type StructReader<T = any> = (obj: T) => void;

interface StructFieldTypeDefine {
  type: number;
  name: string;
}

interface FakeField {
  type: StructType | undefined;
  get: string | undefined;
  set: string | undefined;
}

const StructFieldTypes: (typeof StructFieldType)[] = [];
const StructFieldTypeMap: Record<number, typeof StructFieldType> = {};

function packNull(manager: STRUCT, data: number[], field: StructField, type: StructType): void {
  StructFieldTypeMap[type.type].packNull(manager, data, field, type);
}

function toJSON(
  manager: STRUCT,
  val: unknown,
  obj: unknown,
  field: StructField | FakeField,
  type: StructType
): unknown {
  return StructFieldTypeMap[type.type].toJSON(manager, val, obj, field, type);
}

function fromJSON(
  manager: STRUCT,
  val: unknown,
  obj: unknown,
  field: StructField | FakeField,
  type: StructType,
  instance: unknown
): unknown {
  return StructFieldTypeMap[type.type].fromJSON(manager, val, obj, field, type, instance);
}

function formatJSON$1(
  manager: STRUCT,
  val: unknown,
  obj: unknown,
  field: StructField | FakeField,
  type: StructType,
  instance: unknown,
  tlvl: number = 0
): string {
  return StructFieldTypeMap[type.type].formatJSON(manager, val, obj, field, type, instance, tlvl);
}

function validateJSON$1(
  manager: STRUCT,
  val: unknown,
  obj: unknown,
  field: StructField | FakeField,
  type: StructType,
  instance: unknown,
  _abstractKey?: string
): boolean | string {
  return StructFieldTypeMap[type.type].validateJSON(manager, val, obj, field, type, instance, _abstractKey);
}

function unpack_field(manager: STRUCT, data: DataView, type: StructType, uctx: unpack_context): unknown {
  let name: string | undefined;

  if (debug) {
    name = StructFieldTypeMap[type.type].define().name;
    packer_debug_start$1("R " + name);
  }

  let ret = StructFieldTypeMap[type.type].unpack(manager, data, type, uctx);

  if (debug) {
    packer_debug_end$1();
  }

  return ret;
}

let fakeFields = new cachering<FakeField>(() => {
  return { type: undefined, get: undefined, set: undefined };
}, 256);

function fmt_type(type: StructType): string {
  return StructFieldTypeMap[type.type].format(type);
}

function do_pack(
  manager: STRUCT,
  data: number[],
  val: unknown,
  obj: unknown,
  field: StructField | FakeField,
  type: StructType | number
): void {
  let name: string | undefined;

  if (debug) {
    let t = type as StructType;
    name = StructFieldTypeMap[t.type].define().name;
    packer_debug_start$1("W " + name);
  }

  let typeid: number;
  if (typeof type !== "number") {
    typeid = type.type;
  } else {
    typeid = type;
  }

  let ret = StructFieldTypeMap[typeid].pack(manager, data, val, obj, field, type as StructType);

  if (debug) {
    packer_debug_end$1();
  }

  return ret;
}

let _ws_env$1: [unknown, unknown][] = [[undefined, undefined]];

class StructFieldType {
  static pack(
    _manager: STRUCT,
    _data: number[],
    _val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType
  ): void {}

  static unpack(_manager: STRUCT, _data: DataView, _type: StructType, _uctx: unpack_context): unknown {
    return undefined;
  }

  static packNull(manager: STRUCT, data: number[], field: StructField, type: StructType): void {
    this.pack(manager, data, 0, 0, field, type);
  }

  static format(_type: StructType): string {
    return this.define().name;
  }

  static toJSON(
    _manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType
  ): unknown {
    return val;
  }

  static fromJSON(
    _manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType,
    _instance: unknown
  ): unknown {
    return val;
  }

  static formatJSON(
    _manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType,
    _instance: unknown,
    _tlvl: number
  ): string {
    return JSON.stringify(val);
  }

  static validateJSON(
    _manager: STRUCT,
    _val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType,
    _instance: unknown,
    _abstractKey?: string
  ): boolean | string {
    return true;
  }

  /**
   return false to override default
   helper js for packing
   */
  static useHelperJS(_field: StructField): boolean {
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
  static define(): StructFieldTypeDefine {
    return {
      type: -1,
      name: "(error)",
    };
  }

  /**
   Register field packer/unpacker class.  Will throw an error if define() method is bad.
   */
  static register(cls: typeof StructFieldType): void {
    if (StructFieldTypes.indexOf(cls) >= 0) {
      throw new Error("class already registered");
    }

    if (cls.define === StructFieldType.define) {
      throw new Error("you forgot to make a define() static method");
    }

    if (cls.define().type === undefined) {
      throw new Error("cls.define().type was undefined!");
    }

    if (cls.define().type in StructFieldTypeMap) {
      throw new Error("type " + cls.define().type + " is used by another StructFieldType subclass");
    }

    StructFieldTypes.push(cls);
    StructFieldTypeMap[cls.define().type] = cls;
  }
}

class StructIntField extends StructFieldType {
  static pack(
    _manager: STRUCT,
    data: number[],
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType
  ): void {
    pack_int(data, val as number);
  }

  static unpack(_manager: STRUCT, data: DataView, _type: StructType, uctx: unpack_context): number {
    return unpack_int(data, uctx);
  }

  static validateJSON(
    _manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType,
    _instance: unknown
  ): boolean | string {
    if (typeof val !== "number" || val !== Math.floor(val)) {
      return "" + val + " is not an integer";
    }

    return true;
  }

  static define(): StructFieldTypeDefine {
    return {
      type: StructEnum.INT,
      name: "int",
    };
  }
}

StructFieldType.register(StructIntField);

class StructFloatField extends StructFieldType {
  static pack(
    _manager: STRUCT,
    data: number[],
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType
  ): void {
    pack_float(data, val as number);
  }

  static unpack(_manager: STRUCT, data: DataView, _type: StructType, uctx: unpack_context): number {
    return unpack_float(data, uctx);
  }

  static validateJSON(
    _manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType,
    _instance: unknown,
    _abstractKey?: string
  ): boolean | string {
    if (typeof val !== "number") {
      return "Not a float: " + val;
    }

    return true;
  }

  static define(): StructFieldTypeDefine {
    return {
      type: StructEnum.FLOAT,
      name: "float",
    };
  }
}

StructFieldType.register(StructFloatField);

class StructDoubleField extends StructFieldType {
  static pack(
    _manager: STRUCT,
    data: number[],
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType
  ): void {
    pack_double(data, val as number);
  }

  static unpack(_manager: STRUCT, data: DataView, _type: StructType, uctx: unpack_context): number {
    return unpack_double(data, uctx);
  }

  static validateJSON(
    _manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType,
    _instance: unknown
  ): boolean | string {
    if (typeof val !== "number") {
      return "Not a double: " + val;
    }

    return true;
  }

  static define(): StructFieldTypeDefine {
    return {
      type: StructEnum.DOUBLE,
      name: "double",
    };
  }
}

StructFieldType.register(StructDoubleField);

class StructStringField extends StructFieldType {
  static pack(
    _manager: STRUCT,
    data: number[],
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType
  ): void {
    val = !val ? "" : val;

    pack_string(data, val as string);
  }

  static validateJSON(
    _manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType,
    _instance: unknown
  ): boolean | string {
    if (typeof val !== "string") {
      return "Not a string: " + val;
    }

    return true;
  }

  static packNull(manager: STRUCT, data: number[], field: StructField, type: StructType): void {
    this.pack(manager, data, "", 0, field, type);
  }

  static unpack(_manager: STRUCT, data: DataView, _type: StructType, uctx: unpack_context): string {
    return unpack_string(data, uctx);
  }

  static define(): StructFieldTypeDefine {
    return {
      type: StructEnum.STRING,
      name: "string",
    };
  }
}

StructFieldType.register(StructStringField);

class StructStaticStringField extends StructFieldType {
  static pack(
    _manager: STRUCT,
    data: number[],
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    type: StructType
  ): void {
    val = !val ? "" : val;

    pack_static_string(data, val as string, (type.data as { maxlength: number }).maxlength);
  }

  static validateJSON(
    _manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    type: StructType,
    _instance: unknown
  ): boolean | string {
    if (typeof val !== "string") {
      return "Not a string: " + val;
    }

    if (val.length > (type.data as { maxlength: number }).maxlength) {
      return "String is too big; limit is " + (type.data as { maxlength: number }).maxlength + "; string:" + val;
    }

    return true;
  }

  static format(type: StructType): string {
    return `static_string[${(type.data as { maxlength: number }).maxlength}]`;
  }

  static packNull(manager: STRUCT, data: number[], field: StructField, type: StructType): void {
    this.pack(manager, data, "", 0, field, type);
  }

  static unpack(_manager: STRUCT, data: DataView, type: StructType, uctx: unpack_context): string {
    return unpack_static_string(data, uctx, (type.data as { maxlength: number }).maxlength);
  }

  static define(): StructFieldTypeDefine {
    return {
      type: StructEnum.STATIC_STRING,
      name: "static_string",
    };
  }
}

StructFieldType.register(StructStaticStringField);

class StructStructField extends StructFieldType {
  static pack(
    manager: STRUCT,
    data: number[],
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    type: StructType
  ): void {
    let stt = manager.get_struct(type.data as string);

    packer_debug$1("struct", stt.name);

    manager.write_struct(data, val, stt);
  }

  static validateJSON(
    manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    type: StructType,
    _instance: unknown,
    _abstractKey?: string
  ): boolean | string {
    let stt = manager.get_struct(type.data as string);

    if (!val) {
      return "Expected " + stt.name + " object";
    }

    return manager.validateJSONIntern(val, stt, _abstractKey);
  }

  static format(type: StructType): string {
    return type.data as string;
  }

  static fromJSON(
    manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    type: StructType,
    instance: unknown
  ): unknown {
    let stt = manager.get_struct(type.data as string);

    return manager.readJSON(val, stt, instance);
  }

  static formatJSON(
    manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    type: StructType,
    _instance: unknown,
    tlvl: number
  ): string {
    let stt = manager.get_struct(type.data as string);

    return manager.formatJSON_intern(val, stt, _field as StructField, tlvl);
  }

  static toJSON(
    manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    type: StructType
  ): StructJSONValue {
    let stt = manager.get_struct(type.data as string);
    return manager.writeJSON(val as any, stt);
  }

  static unpackInto(manager: STRUCT, data: DataView, type: StructType, uctx: unpack_context, dest: unknown): unknown {
    let cls2 = manager.get_struct_cls(type.data as string);

    packer_debug$1("struct", cls2 ? cls2.name : "(error)");
    return manager.read_object(data, cls2, uctx, dest);
  }

  static packNull(manager: STRUCT, data: number[], _field: StructField, type: StructType): void {
    let stt = manager.get_struct(type.data as string);

    packer_debug$1("struct", type);

    for (let field2 of stt.fields) {
      let type2 = field2.type;

      packNull(manager, data, field2, type2);
    }
  }

  static unpack(manager: STRUCT, data: DataView, type: StructType, uctx: unpack_context): unknown {
    let cls2 = manager.get_struct_cls(type.data as string);
    packer_debug$1("struct", cls2 ? cls2.name : "(error)");

    return manager.read_object(data, cls2, uctx);
  }

  static define(): StructFieldTypeDefine {
    return {
      type: StructEnum.STRUCT,
      name: "struct",
    };
  }
}

StructFieldType.register(StructStructField);

class StructTStructField extends StructFieldType {
  static pack(
    manager: STRUCT,
    data: number[],
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    type: StructType
  ): void {
    let cls = manager.get_struct_cls(type.data as string);
    let stt = manager.get_struct(type.data as string);

    const keywords = (manager.constructor as typeof STRUCT).keywords;

    let valObj = val as any & { constructor: StructableClass };

    //make sure inheritance is correct
    if (valObj.constructor.structName !== type.data && val instanceof (cls as Function)) {
      stt = manager.get_struct(valObj.constructor.structName!);
    } else if (valObj.constructor.structName === type.data) {
      stt = manager.get_struct(type.data as string);
    } else {
      console.trace();
      throw new Error("Bad struct " + valObj.constructor.structName + " passed to write_struct");
    }

    packer_debug$1("int " + stt.id);

    pack_int(data, stt.id);
    manager.write_struct(data, val, stt);
  }

  static validateJSON(
    manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    type: StructType,
    _instance: unknown,
    _abstractKey?: string
  ): boolean | string {
    let key = type.jsonKeyword!;

    if (typeof val !== "object") {
      return typeof val + " is not an object";
    }

    let valObj = val as any;
    let stt = manager.get_struct(valObj[key] as string);
    let cls: StructableClass = manager.get_struct_cls(stt.name) as StructableClass;
    let parentcls = manager.get_struct_cls(type.data as string);

    let ok = false;

    do {
      if (cls === parentcls) {
        ok = true;
        break;
      }

      cls = (cls.prototype as any).__proto__!.constructor as unknown as StructableClass;
    } while (cls && cls !== (Object as unknown));

    if (!ok) {
      return stt.name + " is not a child class off " + type.data;
    }

    return manager.validateJSONIntern(val, stt, type.jsonKeyword);
  }

  static fromJSON(
    manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    type: StructType,
    instance: unknown
  ): unknown {
    let key = type.jsonKeyword!;

    let stt = manager.get_struct((val as any)[key] as string);

    return manager.readJSON(val, stt, instance);
  }

  static formatJSON(
    manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    type: StructType,
    _instance: unknown,
    tlvl: number
  ): string {
    let key = type.jsonKeyword!;

    let stt = manager.get_struct((val as any)[key] as string);

    return manager.formatJSON_intern(val, stt, _field as StructField, tlvl);
  }

  static toJSON(
    manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    type: StructType
  ): StructJSONValue {
    const keywords = (manager.constructor as typeof STRUCT).keywords;

    let valObj = val as any & { constructor: StructableClass };
    let stt = manager.get_struct(valObj.constructor.structName!);
    let ret = manager.writeJSON(val as any, stt) as any;

    ret[type.jsonKeyword!] = "" + stt.name;

    return ret;
  }

  static packNull(manager: STRUCT, data: number[], field: StructField, type: StructType): void {
    let stt = manager.get_struct(type.data as string);

    pack_int(data, stt.id);
    packNull(manager, data, field, { type: StructEnum.STRUCT, data: type.data });
  }

  static format(type: StructType): string {
    return "abstract(" + type.data + ")";
  }

  static unpackInto(manager: STRUCT, data: DataView, type: StructType, uctx: unpack_context, _dest: unknown): unknown {
    let id = unpack_int(data, uctx);

    packer_debug$1("-int " + id);
    if (!(id in manager.struct_ids)) {
      packer_debug$1("tstruct id: " + id);
      console.trace();
      console.log(id);
      console.log(manager.struct_ids);
      throw new Error("Unknown struct type " + id + ".");
    }

    let cls2: NStruct | StructableClass = manager.get_struct_id(id);

    packer_debug$1("struct name: " + cls2.name);

    cls2 = manager.struct_cls[(cls2 as NStruct).name];

    return manager.read_object(data, cls2, uctx, _dest);
    //packer_debug("ret", ret);
  }

  static unpack(manager: STRUCT, data: DataView, _type: StructType, uctx: unpack_context): unknown {
    let id = unpack_int(data, uctx);

    packer_debug$1("-int " + id);
    if (!(id in manager.struct_ids)) {
      packer_debug$1("tstruct id: " + id);
      console.trace();
      console.log(id);
      console.log(manager.struct_ids);
      throw new Error("Unknown struct type " + id + ".");
    }

    let cls2: NStruct | StructableClass = manager.get_struct_id(id);

    packer_debug$1("struct name: " + cls2.name);
    cls2 = manager.struct_cls[(cls2 as NStruct).name];

    return manager.read_object(data, cls2, uctx);
    //packer_debug("ret", ret);
  }

  static define(): StructFieldTypeDefine {
    return {
      type: StructEnum.TSTRUCT,
      name: "tstruct",
    };
  }
}

StructFieldType.register(StructTStructField);

/** out is just a [string], an array of dimen 1 whose sole entry is the output string. */
function formatArrayJson(
  manager: STRUCT,
  val: unknown,
  _obj: unknown,
  field: StructField | FakeField,
  _type: StructType,
  type2: StructType,
  _instance: unknown,
  tlvl: number,
  array?: unknown
): string {
  if (array === undefined) {
    array = val;
  }

  if (array === undefined || array === null || typeof array !== "object" || !(Symbol.iterator in (array as object))) {
    console.log(_obj);
    console.log(array);
    throw new Error(`Expected an array for ${(field as StructField).name}`);
  }

  let arr = array as unknown[];

  if (ValueTypes.has(type2.type)) {
    return JSON.stringify(arr);
  }

  let s = "[";
  if (manager.formatCtx.addComments && (field as StructField).comment && (field as StructField).comment.trim()) {
    s += " " + (field as StructField).comment.trim();
  }

  s += "\n";

  for (let i = 0; i < arr.length; i++) {
    let item = arr[i];

    s += tab(tlvl + 1) + formatJSON$1(manager, item, val, field, type2, _instance, tlvl + 1) + ",\n";
  }

  s += tab(tlvl) + "]";

  return s;
}

class StructArrayField extends StructFieldType {
  static pack(
    manager: STRUCT,
    data: number[],
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType
  ): void {
    let arr = val as unknown[];

    if (arr === undefined) {
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

    let d = type.data as { iname: string; type: StructType };

    let itername = d.iname;
    let type2 = d.type;

    let env = _ws_env$1;
    for (let i = 0; i < arr.length; i++) {
      let val2: unknown = arr[i];
      if (itername !== "" && itername !== undefined && (field as StructField).get) {
        env[0][0] = itername;
        env[0][1] = val2;
        val2 = manager._env_call((field as StructField).get!, obj, env);
      }

      //XXX not sure I really need this fakeField stub here. . .
      let fakeField = fakeFields.next();
      fakeField.type = type2;
      do_pack(manager, data, val2, obj, fakeField, type2);
    }
  }

  static packNull(_manager: STRUCT, data: number[], _field: StructField, _type: StructType): void {
    pack_int(data, 0);
  }

  static format(type: StructType): string {
    let d = type.data as { iname: string; type: StructType };
    if (d.iname !== "" && d.iname !== undefined) {
      return "array(" + d.iname + ", " + fmt_type(d.type) + ")";
    } else {
      return "array(" + fmt_type(d.type) + ")";
    }
  }

  static useHelperJS(field: StructField): boolean {
    return !(field.type.data as { iname: string }).iname;
  }

  static validateJSON(
    manager: STRUCT,
    val: unknown,
    _obj: unknown,
    field: StructField | FakeField,
    type: StructType,
    _instance: unknown,
    _abstractKey?: string
  ): boolean | string {
    let arr = val as unknown[];
    if (!arr) {
      return "not an array: " + val;
    }

    for (let i = 0; i < arr.length; i++) {
      let ret = validateJSON$1(
        manager,
        arr[i],
        arr,
        field,
        (type.data as { type: StructType }).type,
        undefined,
        _abstractKey
      );

      if (typeof ret === "string" || !ret) {
        return ret;
      }
    }

    return true;
  }

  static fromJSON(
    manager: STRUCT,
    val: unknown,
    _obj: unknown,
    field: StructField | FakeField,
    type: StructType,
    instance: unknown
  ): unknown[] {
    let ret = (instance as unknown[] | undefined) || [];

    ret.length = 0;
    let arr = val as unknown[];

    for (let i = 0; i < arr.length; i++) {
      let val2 = fromJSON(manager, arr[i], arr, field, (type.data as { type: StructType }).type, undefined);

      if (val2 === undefined) {
        console.log(val2);
        console.error("eeek");
      }

      ret.push(val2);
    }

    return ret;
  }

  static formatJSON(
    manager: STRUCT,
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType,
    instance: unknown,
    tlvl: number
  ): string {
    return formatArrayJson(manager, val, obj, field, type, (type.data as { type: StructType }).type, instance, tlvl);
  }

  static toJSON(
    manager: STRUCT,
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType
  ): unknown[] {
    let arr = (val as unknown[]) || [];
    let json: any[] = [];

    let itername = (type.data as { iname: string }).iname;

    for (let i = 0; i < arr.length; i++) {
      let val2: unknown = arr[i];
      let env = _ws_env$1;

      if (itername !== "" && itername !== undefined && (field as StructField).get) {
        env[0][0] = itername;
        env[0][1] = val2;
        val2 = manager._env_call((field as StructField).get!, obj, env);
      }

      json.push(toJSON(manager, val2, arr, field, (type.data as { type: StructType }).type));
    }

    return json;
  }

  static unpackInto(manager: STRUCT, data: DataView, type: StructType, uctx: unpack_context, dest: unknown[]): void {
    let len = unpack_int(data, uctx);
    dest.length = 0;

    for (let i = 0; i < len; i++) {
      dest.push(unpack_field(manager, data, (type.data as { type: StructType }).type, uctx));
    }
  }

  static unpack(manager: STRUCT, data: DataView, type: StructType, uctx: unpack_context): unknown[] {
    let len = unpack_int(data, uctx);
    packer_debug$1("-int " + len);

    let arr: unknown[] = new Array(len);
    for (let i = 0; i < len; i++) {
      arr[i] = unpack_field(manager, data, (type.data as { type: StructType }).type, uctx);
    }

    return arr;
  }

  static define(): StructFieldTypeDefine {
    return {
      type: StructEnum.ARRAY,
      name: "array",
    };
  }
}

StructFieldType.register(StructArrayField);

class StructIterField extends StructFieldType {
  static pack(
    manager: STRUCT,
    data: number[],
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType
  ): void {
    //this was originally implemented to use ES6 iterators.
    function forEach(cb: (item: unknown) => void, thisvar: unknown): void {
      let v = val as (Iterable<unknown> & { forEach?: (cb: (item: unknown) => void) => void }) | null;
      if (v && (v as Iterable<unknown>)[Symbol.iterator]) {
        for (let item of v as Iterable<unknown>) {
          cb.call(thisvar, item);
        }
      } else if (v && v.forEach) {
        v.forEach(function (item: unknown) {
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

    /* save space for length */
    let starti = data.length;
    data.length += 4;

    let d = type.data as { iname: string; type: StructType },
      itername = d.iname,
      type2 = d.type;
    let env = _ws_env$1;

    let i = 0;
    forEach(function (val2: unknown) {
      if (itername !== "" && itername !== undefined && (field as StructField).get) {
        env[0][0] = itername;
        env[0][1] = val2;
        val2 = manager._env_call((field as StructField).get!, obj, env);
      }

      //XXX not sure I really need this fakeField stub here. . .
      let fakeField = fakeFields.next();
      fakeField.type = type2;
      do_pack(manager, data, val2, obj, fakeField, type2);

      i++;
    }, this);

    /* write length */
    temp_dataview.setInt32(0, i, STRUCT_ENDIAN);

    data[starti++] = uint8_view[0];
    data[starti++] = uint8_view[1];
    data[starti++] = uint8_view[2];
    data[starti++] = uint8_view[3];
  }

  static formatJSON(
    manager: STRUCT,
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType,
    instance: unknown,
    tlvl: number
  ): string {
    return formatArrayJson(
      manager,
      val,
      obj,
      field,
      type,
      (type.data as { type: StructType }).type,
      instance,
      tlvl,
      list(val as Iterable<unknown>)
    );
  }

  static validateJSON(
    manager: STRUCT,
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType,
    instance: unknown,
    _abstractKey?: string
  ): boolean | string {
    return StructArrayField.validateJSON(manager, val, obj, field, type, instance, _abstractKey);
  }

  static fromJSON(
    manager: STRUCT,
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType,
    instance: unknown
  ): unknown[] {
    return StructArrayField.fromJSON(manager, val, obj, field, type, instance);
  }

  static toJSON(
    manager: STRUCT,
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType
  ): unknown[] {
    let arr = (val as Iterable<unknown>) || [];
    let json: any[] = [];

    let itername = (type.data as { iname: string }).iname;

    for (let val2 of arr) {
      let env = _ws_env$1;
      let v: unknown = val2;

      if (itername !== "" && itername !== undefined && (field as StructField).get) {
        env[0][0] = itername;
        env[0][1] = v;
        v = manager._env_call((field as StructField).get!, obj, env);
      }

      json.push(toJSON(manager, v, arr, field, (type.data as { type: StructType }).type));
    }

    return json;
  }

  static packNull(_manager: STRUCT, data: number[], _field: StructField, _type: StructType): void {
    pack_int(data, 0);
  }

  static useHelperJS(field: StructField): boolean {
    return !(field.type.data as { iname: string }).iname;
  }

  static format(type: StructType): string {
    let d = type.data as { iname: string; type: StructType };
    if (d.iname !== "" && d.iname !== undefined) {
      return "iter(" + d.iname + ", " + fmt_type(d.type) + ")";
    } else {
      return "iter(" + fmt_type(d.type) + ")";
    }
  }

  static unpackInto(
    manager: STRUCT,
    data: DataView,
    type: StructType,
    uctx: unpack_context,
    arr: unknown[]
  ): unknown[] {
    let len = unpack_int(data, uctx);
    packer_debug$1("-int " + len);

    arr.length = 0;

    for (let i = 0; i < len; i++) {
      arr.push(unpack_field(manager, data, (type.data as { type: StructType }).type, uctx));
    }

    return arr;
  }

  static unpack(manager: STRUCT, data: DataView, type: StructType, uctx: unpack_context): unknown[] {
    let len = unpack_int(data, uctx);
    packer_debug$1("-int " + len);

    let arr: unknown[] = new Array(len);
    for (let i = 0; i < len; i++) {
      arr[i] = unpack_field(manager, data, (type.data as { type: StructType }).type, uctx);
    }

    return arr;
  }

  static define(): StructFieldTypeDefine {
    return {
      type: StructEnum.ITER,
      name: "iter",
    };
  }
}

StructFieldType.register(StructIterField);

class StructShortField extends StructFieldType {
  static pack(
    _manager: STRUCT,
    data: number[],
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType
  ): void {
    pack_short(data, val as number);
  }

  static unpack(_manager: STRUCT, data: DataView, _type: StructType, uctx: unpack_context): number {
    return unpack_short(data, uctx);
  }

  static define(): StructFieldTypeDefine {
    return {
      type: StructEnum.SHORT,
      name: "short",
    };
  }
}

StructFieldType.register(StructShortField);

class StructByteField extends StructFieldType {
  static pack(
    _manager: STRUCT,
    data: number[],
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType
  ): void {
    pack_byte(data, val as number);
  }

  static unpack(_manager: STRUCT, data: DataView, _type: StructType, uctx: unpack_context): number {
    return unpack_byte(data, uctx);
  }

  static define(): StructFieldTypeDefine {
    return {
      type: StructEnum.BYTE,
      name: "byte",
    };
  }
}

StructFieldType.register(StructByteField);

class StructSignedByteField extends StructFieldType {
  static pack(
    _manager: STRUCT,
    data: number[],
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType
  ): void {
    pack_sbyte(data, val as number);
  }

  static unpack(_manager: STRUCT, data: DataView, _type: StructType, uctx: unpack_context): number {
    return unpack_sbyte(data, uctx);
  }

  static define(): StructFieldTypeDefine {
    return {
      type: StructEnum.SIGNED_BYTE,
      name: "sbyte",
    };
  }
}

StructFieldType.register(StructSignedByteField);

class StructBoolField extends StructFieldType {
  static pack(
    _manager: STRUCT,
    data: number[],
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType
  ): void {
    pack_byte(data, !!val ? 1 : 0);
  }

  static unpack(_manager: STRUCT, data: DataView, _type: StructType, uctx: unpack_context): boolean {
    return !!unpack_byte(data, uctx);
  }

  static validateJSON(
    _manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType,
    _instance: unknown
  ): boolean | string {
    if (val === 0 || val === 1 || val === true || val === false || val === "true" || val === "false") {
      return true;
    }

    return "" + val + " is not a bool";
  }

  static fromJSON(
    _manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType,
    _instance: unknown
  ): boolean {
    if (val === "false") {
      val = false;
    }

    return !!val;
  }

  static toJSON(
    _manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType
  ): boolean {
    return !!val;
  }

  static define(): StructFieldTypeDefine {
    return {
      type: StructEnum.BOOL,
      name: "bool",
    };
  }
}

StructFieldType.register(StructBoolField);

class StructIterKeysField extends StructFieldType {
  static pack(
    manager: STRUCT,
    data: number[],
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType
  ): void {
    //this was originally implemented to use ES6 iterators.
    if ((typeof val !== "object" && typeof val !== "function") || val === null) {
      console.warn("Bad object fed to iterkeys in struct packer!", val);
      console.log("Field: ", field);
      console.log("Type: ", type);
      console.log("");

      pack_int(data, 0);
      return;
    }

    let valObj = val as any;
    let len = 0.0;
    for (let k in valObj) {
      len++;
    }

    packer_debug$1("int " + len);
    pack_int(data, len);

    let d = type.data as { iname: string; type: StructType },
      itername = d.iname,
      type2 = d.type;
    let env = _ws_env$1;

    let i = 0;
    for (let val2 in valObj) {
      if (i >= len) {
        if (warninglvl$1 > 0) {
          console.warn("Warning: object keys magically replaced during iteration", val, i);
        }
        return;
      }

      let v: unknown = val2;
      if (itername && itername.trim().length > 0 && (field as StructField).get) {
        env[0][0] = itername;
        env[0][1] = v;
        v = manager._env_call((field as StructField).get!, obj, env);
      } else {
        v = valObj[val2]; //fetch value
      }

      let f2: FakeField = { type: type2, get: undefined, set: undefined };
      do_pack(manager, data, v, obj, f2, type2);

      i++;
    }
  }

  static validateJSON(
    manager: STRUCT,
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType,
    instance: unknown,
    _abstractKey?: string
  ): boolean | string {
    return StructArrayField.validateJSON(manager, val, obj, field, type, instance, _abstractKey);
  }

  static fromJSON(
    manager: STRUCT,
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType,
    instance: unknown
  ): unknown[] {
    return StructArrayField.fromJSON(manager, val, obj, field, type, instance);
  }

  static formatJSON(
    manager: STRUCT,
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType,
    instance: unknown,
    tlvl: number
  ): string {
    return formatArrayJson(
      manager,
      val,
      obj,
      field,
      type,
      (type.data as { type: StructType }).type,
      instance,
      tlvl,
      list(val as Iterable<unknown>)
    );
  }

  static toJSON(
    manager: STRUCT,
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType
  ): unknown[] {
    let valObj = (val as any) || {};
    let json: any[] = [];

    let itername = (type.data as { iname: string }).iname;

    for (let k in valObj) {
      let val2: unknown = valObj[k];
      let env = _ws_env$1;

      if (itername !== "" && itername !== undefined && (field as StructField).get) {
        env[0][0] = itername;
        env[0][1] = val2;
        val2 = manager._env_call((field as StructField).get!, obj, env);
      }

      json.push(toJSON(manager, val2, valObj, field, (type.data as { type: StructType }).type));
    }

    return json;
  }

  static packNull(_manager: STRUCT, data: number[], _field: StructField, _type: StructType): void {
    pack_int(data, 0);
  }

  static useHelperJS(field: StructField): boolean {
    return !(field.type.data as { iname: string }).iname;
  }

  static format(type: StructType): string {
    let d = type.data as { iname: string; type: StructType };
    if (d.iname !== "" && d.iname !== undefined) {
      return "iterkeys(" + d.iname + ", " + fmt_type(d.type) + ")";
    } else {
      return "iterkeys(" + fmt_type(d.type) + ")";
    }
  }

  static unpackInto(
    manager: STRUCT,
    data: DataView,
    type: StructType,
    uctx: unpack_context,
    arr: unknown[]
  ): unknown[] {
    let len = unpack_int(data, uctx);
    packer_debug$1("-int " + len);

    arr.length = 0;

    for (let i = 0; i < len; i++) {
      arr.push(unpack_field(manager, data, (type.data as { type: StructType }).type, uctx));
    }

    return arr;
  }

  static unpack(manager: STRUCT, data: DataView, type: StructType, uctx: unpack_context): unknown[] {
    let len = unpack_int(data, uctx);
    packer_debug$1("-int " + len);

    let arr: unknown[] = new Array(len);
    for (let i = 0; i < len; i++) {
      arr[i] = unpack_field(manager, data, (type.data as { type: StructType }).type, uctx);
    }

    return arr;
  }

  static define(): StructFieldTypeDefine {
    return {
      type: StructEnum.ITERKEYS,
      name: "iterkeys",
    };
  }
}

StructFieldType.register(StructIterKeysField);

class StructUintField extends StructFieldType {
  static pack(
    _manager: STRUCT,
    data: number[],
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType
  ): void {
    pack_uint(data, val as number);
  }

  static unpack(_manager: STRUCT, data: DataView, _type: StructType, uctx: unpack_context): number {
    return unpack_uint(data, uctx);
  }

  static validateJSON(
    _manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType,
    _instance: unknown
  ): boolean | string {
    if (typeof val !== "number" || val !== Math.floor(val)) {
      return "" + val + " is not an integer";
    }

    return true;
  }

  static define(): StructFieldTypeDefine {
    return {
      type: StructEnum.UINT,
      name: "uint",
    };
  }
}

StructFieldType.register(StructUintField);

class StructUshortField extends StructFieldType {
  static pack(
    _manager: STRUCT,
    data: number[],
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType
  ): void {
    pack_ushort(data, val as number);
  }

  static unpack(_manager: STRUCT, data: DataView, _type: StructType, uctx: unpack_context): number {
    return unpack_ushort(data, uctx);
  }

  static validateJSON(
    _manager: STRUCT,
    val: unknown,
    _obj: unknown,
    _field: StructField | FakeField,
    _type: StructType,
    _instance: unknown
  ): boolean | string {
    if (typeof val !== "number" || val !== Math.floor(val)) {
      return "" + val + " is not an integer";
    }

    return true;
  }

  static define(): StructFieldTypeDefine {
    return {
      type: StructEnum.USHORT,
      name: "ushort",
    };
  }
}

StructFieldType.register(StructUshortField);

//let writeEmpty = writeEmpty = function writeEmpty(stt) {
//}

class StructStaticArrayField extends StructFieldType {
  static pack(
    manager: STRUCT,
    data: number[],
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType
  ): void {
    let d = type.data as { size: number; iname: string; type: StructType };

    if (d.size === undefined) {
      throw new Error("type.data.size was undefined");
    }

    let itername = d.iname;
    let arr = val as unknown[] | undefined;

    if (arr === undefined || !(arr as unknown[]).length) {
      this.packNull(manager, data, field as StructField, type);
      return;
    }

    for (let i = 0; i < d.size; i++) {
      let i2 = Math.min(i, Math.min(arr.length - 1, d.size));
      let val2: unknown = arr[i2];

      //*
      if (itername !== "" && itername !== undefined && (field as StructField).get) {
        let env = _ws_env$1;
        env[0][0] = itername;
        env[0][1] = val2;
        val2 = manager._env_call((field as StructField).get!, obj, env);
      }

      do_pack(manager, data, val2, arr, field, d.type);
    }
  }

  static useHelperJS(field: StructField): boolean {
    return !(field.type.data as { iname: string }).iname;
  }

  static validateJSON(
    manager: STRUCT,
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType,
    instance: unknown,
    _abstractKey?: string
  ): boolean | string {
    return StructArrayField.validateJSON(manager, val, obj, field, type, instance, _abstractKey);
  }

  static fromJSON(
    manager: STRUCT,
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType,
    instance: unknown
  ): unknown[] {
    return StructArrayField.fromJSON(manager, val, obj, field, type, instance);
  }

  static formatJSON(
    manager: STRUCT,
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType,
    instance: unknown,
    tlvl: number
  ): string {
    return formatArrayJson(
      manager,
      val,
      obj,
      field,
      type,
      (type.data as { type: StructType }).type,
      instance,
      tlvl,
      list(val as Iterable<unknown>)
    );
  }

  static packNull(manager: STRUCT, data: number[], field: StructField, type: StructType): void {
    let d = type.data as { size: number; type: StructType };
    let size = d.size;
    for (let i = 0; i < size; i++) {
      packNull(manager, data, field, d.type);
    }
  }

  static toJSON(
    manager: STRUCT,
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType
  ): unknown[] {
    return StructArrayField.toJSON(manager, val, obj, field, type);
  }

  static format(type: StructType): string {
    let d = type.data as { size: number; iname: string; type: StructType };
    let type2 = StructFieldTypeMap[d.type.type].format(d.type);

    let ret = `static_array[${type2}, ${d.size}`;

    if (d.iname) {
      ret += `, ${d.iname}`;
    }
    ret += `]`;

    return ret;
  }

  static unpackInto(
    manager: STRUCT,
    data: DataView,
    type: StructType,
    uctx: unpack_context,
    ret: unknown[]
  ): unknown[] {
    let d = type.data as { size: number; type: StructType };
    packer_debug$1("-size: " + d.size);

    ret.length = 0;

    for (let i = 0; i < d.size; i++) {
      ret.push(unpack_field(manager, data, d.type, uctx));
    }

    return ret;
  }

  static unpack(manager: STRUCT, data: DataView, type: StructType, uctx: unpack_context): unknown[] {
    let d = type.data as { size: number; type: StructType };
    packer_debug$1("-size: " + d.size);

    let ret: unknown[] = [];

    for (let i = 0; i < d.size; i++) {
      ret.push(unpack_field(manager, data, d.type, uctx));
    }

    return ret;
  }

  static define(): StructFieldTypeDefine {
    return {
      type: StructEnum.STATIC_ARRAY,
      name: "static_array",
    };
  }
}

StructFieldType.register(StructStaticArrayField);

class StructOptionalField extends StructFieldType {
  static pack(
    manager: STRUCT,
    data: number[],
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType
  ): void {
    pack_int(data, val !== undefined && val !== null ? 1 : 0);
    if (val !== undefined && val !== null) {
      const fakeField: StructField = { ...(field as StructField) };
      fakeField.type = type.data as StructType;
      do_pack(manager, data, val, obj, fakeField, type.data as StructType);
    }
  }

  static fakeField(field: StructField | FakeField, type: StructType): StructField {
    return { ...(field as StructField), type: type.data as StructType };
  }

  static validateJSON(
    manager: STRUCT,
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType,
    _instance: unknown,
    _abstractKey?: string
  ): boolean | string {
    const fakeField = this.fakeField(field, type);
    return val !== undefined && val !== null
      ? validateJSON$1(manager, val, obj, fakeField, type.data as StructType, undefined, _abstractKey)
      : true;
  }

  static fromJSON(
    manager: STRUCT,
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType,
    _instance: unknown
  ): unknown {
    const fakeField = this.fakeField(field, type);
    return val !== undefined && val !== null
      ? fromJSON(manager, val, obj, fakeField, type.data as StructType, undefined)
      : undefined;
  }

  static formatJSON(
    manager: STRUCT,
    val: unknown,
    _obj: unknown,
    field: StructField | FakeField,
    type: StructType,
    instance: unknown,
    tlvl: number
  ): string {
    if (val !== undefined && val !== null) {
      const fakeField = this.fakeField(field, type);
      return formatJSON$1(manager, val, val, fakeField, type.data as StructType, instance, tlvl + 1);
    }
    return "null";
  }

  static toJSON(
    manager: STRUCT,
    val: unknown,
    obj: unknown,
    field: StructField | FakeField,
    type: StructType
  ): unknown {
    const fakeField = this.fakeField(field, type);
    return val !== undefined && val !== null ? toJSON(manager, val, obj, fakeField, type.data as StructType) : null;
  }

  static packNull(_manager: STRUCT, data: number[], _field: StructField, _type: StructType): void {
    pack_int(data, 0);
  }

  static format(type: StructType): string {
    return "optional(" + fmt_type(type.data as StructType) + ")";
  }

  static unpackInto(manager: STRUCT, data: DataView, type: StructType, uctx: unpack_context, _dest: unknown): void {
    let exists = unpack_int(data, uctx);

    packer_debug$1("-int " + exists);
    packer_debug$1("optional exists: " + exists);

    if (!exists) {
      return;
    }

    unpack_field(manager, data, type.data as StructType, uctx);
  }

  static unpack(manager: STRUCT, data: DataView, type: StructType, uctx: unpack_context): unknown {
    let exists = unpack_int(data, uctx);

    if (!exists) {
      return undefined;
    }

    return unpack_field(manager, data, type.data as StructType, uctx);
  }

  static define(): StructFieldTypeDefine {
    return {
      type: StructEnum.OPTIONAL,
      name: "optional",
    };
  }
}

StructFieldType.register(StructOptionalField);

var _sintern2 = /*#__PURE__*/ Object.freeze({
  __proto__         : null,
  _get_pack_debug   : _get_pack_debug,
  setWarningMode2   : setWarningMode2,
  setDebugMode2     : setDebugMode2,
  StructFieldTypes  : StructFieldTypes,
  StructFieldTypeMap: StructFieldTypeMap,
  packNull          : packNull,
  toJSON            : toJSON,
  fromJSON          : fromJSON,
  formatJSON        : formatJSON$1,
  validateJSON      : validateJSON$1,
  do_pack           : do_pack,
  StructFieldType   : StructFieldType,
  formatArrayJson   : formatArrayJson,
});

var structEval: (code: string) => unknown = eval;

function setStructEval(val: (code: string) => unknown): void {
  structEval = val;
}

var _struct_eval = /*#__PURE__*/ Object.freeze({
  __proto__: null,
  get structEval() {
    return structEval;
  },
  setStructEval: setStructEval,
});

/* ---- JSON parser ---- */

interface TokInfo {
  lexpos: number;
  lineno: number;
  col: number;
  fields: Record<string | number, TokInfo>;
}

const TokSymbol = Symbol("token-info") as symbol;

function buildJSONParser(): parser {
  let tk = (name: string, re: RegExp, func?: TokFunc, example?: string) => new tokdef(name, re, func, example);

  let parse: parser;

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

  //nfloat3 has to be its own regexp, the parser
  //always chooses the token handler that parses the most input,
  //and we don't want the partial 0. and .0 handles to split
  //e.g. 3.5 into 3 and 0.5
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
    tk("WS", /[ \r\t\n]/, (_t) => undefined), //drop token
    tk("STRLIT", /["']/, (t) => {
      let lex = t.lexer;
      let char = t.value;
      let i = lex.lexpos;
      let lexdata = lex.lexdata;

      let escape: boolean = false;
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

      lex.lexpos = i + 1;

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
    tk("NUM", numre, (t) => ((t.value = "" + parseFloat(t.value)), t)),
    tk("NUM", nfloat3re, (t) => ((t.value = "" + parseFloat(t.value)), t)),
    tk("NUM", nfloatexpre, (t) => ((t.value = "" + parseFloat(t.value)), t)),
  ];

  function tokinfo(t: token): TokInfo {
    return {
      lexpos: t.lexpos,
      lineno: t.lineno,
      col   : t.col,
      fields: {},
    };
  }

  function p_Array(p: parser): unknown[] {
    p.expect("LSBRACKET");
    let t = p.peeknext();
    let first = true;

    let ret: unknown[] = [];

    (ret as unknown as Record<symbol, unknown>)[TokSymbol] = tokinfo(t!);

    while (t && t.type !== "RSBRACKET") {
      if (!first) {
        p.expect("COMMA");
      }

      ((ret as unknown as Record<symbol, unknown>)[TokSymbol] as TokInfo).fields[ret.length] = tokinfo(t);
      ret.push(p_Start(p));

      first = false;
      t = p.peeknext();
    }
    p.expect("RSBRACKET");

    return ret;
  }

  function p_Object(p: parser): any {
    p.expect("LBRACE");

    let obj: any = {};

    let first = true;
    let t = p.peeknext();

    (obj as unknown as Record<symbol, unknown>)[TokSymbol] = tokinfo(t!);
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
      ((obj as unknown as Record<symbol, unknown>)[TokSymbol] as TokInfo).fields[key] = tokinfo(t!);
    }

    p.expect("RBRACE");

    return obj;
  }

  function p_Start(p: parser, _throwError: boolean = true): unknown {
    let t = p.peeknext()!;
    if (t.type === "LSBRACKET") {
      return p_Array(p);
    } else if (t.type === "LBRACE") {
      return p_Object(p);
    } else if (t.type === "STRLIT" || t.type === "NUM" || t.type === "NULL" || t.type === "BOOL") {
      return p.next()!.value;
    } else {
      p.error(t, "Unknown token");
    }
  }

  function p_Error(token: token | undefined, _msg?: string): boolean {
    throw new PUTIL_ParseError("Parse Error");
  }

  let lex = new lexer(tokens);
  lex.linestart = 0;
  parse = new parser(lex, p_Error);
  parse.start = p_Start as (p: parser) => unknown;
  //lex.printTokens = true;

  return parse;
}

var jsonParser = buildJSONParser();

function printContext(buf: string, tokinfo: TokInfo | undefined, printColors: boolean = true): string {
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
      s += termColor(`${idx}: ${l}\n`, "yellow");
    } else {
      s += `${idx}: ${l}\n`;
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

/* ---- global / debug ---- */

var nGlobal: any;

if (typeof globalThis !== "undefined") {
  nGlobal = globalThis as unknown as any;
} else if (typeof window !== "undefined") {
  nGlobal = window as unknown as any;
} else if (
  typeof globalThis !== "undefined" &&
  typeof (globalThis as any)["global"] !== "undefined"
) {
  nGlobal = (globalThis as any)["global"] as any;
} else if (typeof self !== "undefined") {
  nGlobal = self as unknown as any;
} else {
  nGlobal = {};
}

const DEBUG: any = {};

function updateDEBUG(): void {
  for (let k in Object.keys(DEBUG)) {
    delete DEBUG[k];
  }

  if (typeof nGlobal.DEBUG === "object") {
    let dbg = nGlobal.DEBUG as any;
    for (let k in dbg) {
      DEBUG[k] = dbg[k];
    }
  }
}

("use strict");

/* ---- main STRUCT manager ---- */

//needed to avoid a rollup bug in configurable mode
var sintern2 = _sintern2;
var struct_eval = _struct_eval;

let warninglvl = 2;

var truncateDollarSign$1 = true;
var manager: STRUCT;

class JSONError extends Error {}

function printCodeLines(code: string): string {
  let lines = code.split(String.fromCharCode(10));
  let buf = "";

  for (let i = 0; i < lines.length; i++) {
    let line = "" + (i + 1) + ":";

    while (line.length < 3) {
      line += " ";
    }

    line += " " + lines[i];
    buf += line + String.fromCharCode(10);
  }

  return buf;
}

function printEvalError(code: string): void {
  console.log("== CODE ==");
  console.log(printCodeLines(code));

  /* Node suppresses the real error line number in error.stack for some reason.
   * Get it by retriggering the error for real.
   */
  eval(code);
}

function setTruncateDollarSign(v: boolean): void {
  truncateDollarSign$1 = !!v;
}

function _truncateDollarSign(s: string): string {
  let i = s.search("$");

  if (i > 0) {
    return s.slice(0, i).trim();
  }

  return s;
}

function unmangle(name: string): string {
  if (truncateDollarSign$1) {
    return _truncateDollarSign(name);
  } else {
    return name;
  }
}

let _static_envcode_null = "";

//truncate webpack-mangled names

function gen_tabstr(tot: number): string {
  let ret = "";

  for (let i = 0; i < tot; i++) {
    ret += " ";
  }

  return ret;
}

let packer_debug: (...args: unknown[]) => void;
let packer_debug_start: (funcname?: string) => void;
let packer_debug_end: (funcname?: string) => void;

function update_debug_data(): void {
  let ret = _get_pack_debug();

  packer_debug = ret.packer_debug;
  packer_debug_start = ret.packer_debug_start;
  packer_debug_end = ret.packer_debug_end;
  warninglvl = ret.warninglvl;
}

update_debug_data();

function setWarningMode(t: number): void {
  sintern2.setWarningMode2(t);

  if (typeof t !== "number" || isNaN(t)) {
    throw new Error("Expected a single number (>= 0) argument to setWarningMode");
  }

  warninglvl = t;
}

function setDebugMode(t: number): void {
  sintern2.setDebugMode2(t);
  update_debug_data();
}

let _ws_env: [unknown, unknown][] = [[undefined, undefined]];

interface STRUCTKeywords {
  script: string;
  name: string;
  load: string;
  new: string;
  after?: string;
  from: string;
}

function define_empty_class(scls: typeof STRUCT, name: string): StructableClass {
  let cls = function () {} as unknown as StructableClass;

  cls.prototype = Object.create(Object.prototype);
  (cls as unknown as { constructor: Function }).constructor = cls.prototype.constructor = cls;

  let keywords = scls.keywords;

  (cls as unknown as any).STRUCT = name + " {\n  }\n";
  cls.structName = name;

  cls.prototype.loadSTRUCT = function (reader: StructReader) {
    reader(this);
  };

  (cls as unknown as any).newSTRUCT = function () {
    return new (cls as unknown as new () => unknown)();
  };

  return cls;
}

let haveCodeGen: boolean | undefined;

//$KEYWORD_CONFIG_START

class STRUCT {
  idgen: number;
  allowOverriding: boolean;
  structs: Record<string, NStruct>;
  struct_cls: Record<string, StructableClass>;
  struct_ids: Record<number, NStruct>;
  compiled_code: Record<string, Function>;
  null_natives: Record<string, number>;
  jsonUseColors: boolean;
  jsonBuf: string;
  formatCtx: { addComments?: boolean; validate?: boolean };
  jsonLogger: (...args: unknown[]) => void;

  static keywords: STRUCTKeywords;

  constructor() {
    this.idgen = 0;
    this.allowOverriding = true;

    this.structs = {};
    this.struct_cls = {};
    this.struct_ids = {};

    this.compiled_code = {};
    this.null_natives = {};

    this.define_null_native("Object", Object as unknown as StructableClass);

    this.jsonUseColors = true;
    this.jsonBuf = "";
    this.formatCtx = {};
    this.jsonLogger = function (...args: unknown[]) {
      console.log(...args);
    };
  }

  static inherit(child: StructableClass, parent: StructableClass, structName: string = child.name): string {
    const keywords = this.keywords;

    if (!parent.STRUCT) {
      return structName + "{\n";
    }

    let stt = struct_parse.parse(parent.STRUCT) as NStruct;
    let code = structName + "{\n";
    code += STRUCT.fmt_struct(stt, true, false, true);
    return code;
  }

  /** invoke loadSTRUCT methods on parent objects.  note that
   reader() is only called once.  it is called however.*/
  static Super(obj: any, reader: StructReader): void {
    if (warninglvl > 0) {
      console.warn("deprecated");
    }

    reader(obj);

    function reader2(_obj: any): void {}

    let cls = (obj as { constructor?: StructableClass }).constructor;
    let bad =
      cls === undefined ||
      cls.prototype === undefined ||
      (cls.prototype as any).__proto__ === undefined;

    if (bad) {
      return;
    }

    let parent = ((cls!.prototype as any).__proto__ as any)
      .constructor as StructableClass;
    bad = bad || parent === undefined;

    if (
      !bad &&
      parent.prototype.loadSTRUCT &&
      parent.prototype.loadSTRUCT !== (obj as any).loadSTRUCT
    ) {
      (parent.prototype.loadSTRUCT as Function).call(obj, reader2);
    }
  }

  /** deprecated.  used with old fromSTRUCT interface. */
  static chain_fromSTRUCT(cls: StructableClass, reader: StructReader): unknown {
    if (warninglvl > 0) {
      console.warn("Using deprecated (and evil) chain_fromSTRUCT method, eek!");
    }

    let proto = cls.prototype;
    let parent = ((proto as any).prototype as any)
      .constructor as StructableClass;

    let obj = parent.fromSTRUCT!(reader);
    let obj2 = new (cls as unknown as new () => Record<string | symbol, unknown>)();

    let keys: (string | symbol)[] = Object.keys(obj as object).concat(
      Object.getOwnPropertySymbols(obj as object) as unknown as string[]
    );

    for (let i = 0; i < keys.length; i++) {
      let k = keys[i];

      try {
        (obj2 as Record<string | symbol, unknown>)[k] = (obj as Record<string | symbol, unknown>)[k];
      } catch (error) {
        if (warninglvl > 0) {
          console.warn("  failed to set property", k);
        }
      }
    }

    return obj2;
  }

  //defined_classes is an array of class constructors
  //with STRUCT scripts, *OR* another STRUCT instance

  static formatStruct(stt: NStruct, internal_only?: boolean, no_helper_js?: boolean): string {
    return this.fmt_struct(stt, internal_only, no_helper_js);
  }

  static fmt_struct(stt: NStruct, internal_only?: boolean, no_helper_js?: boolean, addComments?: boolean): string {
    if (internal_only === undefined) internal_only = false;
    if (no_helper_js === undefined) no_helper_js = false;

    let s = "";
    if (!internal_only) {
      s += stt.name;
      if (stt.id !== -1) s += " id=" + stt.id;
      s += " {\n";
    }
    let tabStr = "  ";

    function fmt_type(type: StructType): string {
      return StructFieldTypeMap[type.type].format(type);
    }

    let fields = stt.fields;
    for (let i = 0; i < fields.length; i++) {
      let f = fields[i];
      s += tabStr + f.name + " : " + fmt_type(f.type);
      if (!no_helper_js && f.get !== undefined) {
        s += " | " + f.get.trim();
      }
      s += ";";

      if (addComments && f.comment.trim()) {
        s += f.comment.trim();
      }

      s += "\n";
    }
    if (!internal_only) s += "}";
    return s;
  }

  static setClassKeyword(keyword: string, nameKeyword?: string): void {
    if (!nameKeyword) {
      nameKeyword = keyword.toLowerCase() + "Name";
    }

    this.keywords = {
      script: keyword,
      name  : nameKeyword,
      load  : "load" + keyword,
      new   : "new" + keyword,
      after : "after" + keyword,
      from  : "from" + keyword,
    };
  }

  define_null_native(name: string, cls: StructableClass): void {
    const keywords = (this.constructor as typeof STRUCT).keywords;
    let obj = define_empty_class(this.constructor as typeof STRUCT, name);

    let stt = struct_parse.parse(obj.STRUCT!) as NStruct;

    stt.id = this.idgen++;

    this.structs[name] = stt;
    this.struct_cls[name] = cls;
    this.struct_ids[stt.id] = stt;

    this.null_natives[name] = 1;
  }

  validateStructs(onerror?: (msg: string, stt: NStruct, field: StructField) => void): void {
    function getType(type: StructType): StructType {
      switch (type.type) {
        case StructEnum.ITERKEYS:
        case StructEnum.ITER:
        case StructEnum.STATIC_ARRAY:
        case StructEnum.ARRAY:
          return getType((type.data as { type: StructType }).type);
        case StructEnum.TSTRUCT:
          return type;
        case StructEnum.STRUCT:
          return type;
        default:
          return type;
      }
    }

    function formatType(type: StructType): any {
      let ret: any = {};

      ret.type = type.type;

      if (typeof ret.type === "number") {
        for (let k in StructEnum) {
          if ((StructEnum as Record<string, number>)[k] === ret.type) {
            ret.type = k;
            break;
          }
        }
      } else if (typeof ret.type === "object") {
        ret.type = formatType(ret.type as StructType);
      }

      if (typeof type.data === "object") {
        ret.data = formatType(type.data as StructType);
      } else {
        ret.data = type.data;
      }

      return ret;
    }

    let self = this;

    function throwError(stt: NStruct, field: StructField, msg: string): void {
      let buf = STRUCT.formatStruct(stt);

      console.error(buf + "\n\n" + msg);

      if (onerror) {
        onerror(msg, stt, field);
      } else {
        throw new Error(msg);
      }
    }

    for (let k in this.structs) {
      let stt = this.structs[k];

      for (let field of stt.fields) {
        if (field.name === "this") {
          let type = field.type.type;

          if (ValueTypes.has(type)) {
            throwError(stt, field, "'this' cannot be used with value types");
          }
        }

        let type = getType(field.type);

        if (type.type !== StructEnum.STRUCT && type.type !== StructEnum.TSTRUCT) {
          continue;
        }

        if (!((type.data as string) in this.structs)) {
          let msg = stt.name + ":" + field.name + ": Unknown struct " + type.data + ".";
          throwError(stt, field, msg);
        }
      }
    }
  }

  forEach(func: (stt: NStruct) => void, thisvar?: unknown): void {
    for (let k in this.structs) {
      let stt = this.structs[k];

      if (thisvar !== undefined) func.call(thisvar, stt);
      else func(stt);
    }
  }

  //defaults to structjs.manager
  parse_structs(buf: string, defined_classes?: StructableClass[] | STRUCT): void {
    const keywords = (this.constructor as typeof STRUCT).keywords;

    if (defined_classes === undefined) {
      defined_classes = manager;
    }

    let classList: StructableClass[];

    if (defined_classes instanceof STRUCT) {
      let struct2 = defined_classes;
      classList = [];

      for (let k in struct2.struct_cls) {
        classList.push(struct2.struct_cls[k]);
      }
    } else if (defined_classes === undefined) {
      classList = [];

      for (let k in manager.struct_cls) {
        classList.push(manager.struct_cls[k]);
      }
    } else {
      classList = defined_classes;
    }

    let clsmap: Record<string, StructableClass> = {};

    for (let i = 0; i < classList.length; i++) {
      let cls = classList[i];

      if (!cls.structName && cls.STRUCT) {
        let stt = struct_parse.parse(cls.STRUCT.trim()) as NStruct;
        cls.structName = stt.name;
      } else if (!cls.structName && cls.name !== "Object") {
        if (warninglvl > 0) console.log("Warning, bad class in registered class list", unmangle(cls.name), cls);
        continue;
      }

      clsmap[cls.structName!] = classList[i];
    }

    struct_parse.input(buf);

    while (!struct_parse.at_end()) {
      let stt = struct_parse.parse(undefined, false) as NStruct;

      if (!(stt.name in clsmap)) {
        if (!(stt.name in this.null_natives))
          if (warninglvl > 0) console.log("WARNING: struct " + stt.name + " is missing from class list.");

        let dummy = define_empty_class(this.constructor as typeof STRUCT, stt.name);

        dummy.STRUCT = STRUCT.fmt_struct(stt);
        dummy.structName = stt.name;

        dummy.prototype.structName = dummy.name;

        this.struct_cls[dummy.structName!] = dummy;
        this.structs[dummy.structName!] = stt;

        if (stt.id !== -1) this.struct_ids[stt.id] = stt;
      } else {
        this.struct_cls[stt.name] = clsmap[stt.name];
        this.structs[stt.name] = stt;

        if (stt.id !== -1) this.struct_ids[stt.id] = stt;
      }

      let tok = struct_parse.peek();
      while (tok && (tok.value === "\n" || tok.value === "\r" || tok.value === "\t" || tok.value === " ")) {
        tok = struct_parse.peek();
      }
    }
  }

  /** adds all structs referenced by cls inside of srcSTRUCT
   *  to this */
  registerGraph(srcSTRUCT: STRUCT, cls: StructableClass): void {
    if (!cls.structName) {
      console.warn("class was not in srcSTRUCT");
      return this.register(cls);
    }

    let recStruct: (st: NStruct, cls: StructableClass) => void;

    let recArray = (t: StructType): void => {
      switch (t.type) {
        case StructEnum.ARRAY:
          return recArray((t.data as { type: StructType }).type);
        case StructEnum.ITERKEYS:
          return recArray((t.data as { type: StructType }).type);
        case StructEnum.STATIC_ARRAY:
          return recArray((t.data as { type: StructType }).type);
        case StructEnum.ITER:
          return recArray((t.data as { type: StructType }).type);
        case StructEnum.STRUCT:
        case StructEnum.TSTRUCT: {
          let st = srcSTRUCT.structs[t.data as string];
          let cls = srcSTRUCT.struct_cls[st.name];

          return recStruct(st, cls);
        }
      }
    };

    recStruct = (st: NStruct, cls: StructableClass): void => {
      if (!(cls.structName! in this.structs)) {
        this.add_class(cls, cls.structName);
      }

      for (let f of st.fields) {
        if (f.type.type === StructEnum.STRUCT || f.type.type === StructEnum.TSTRUCT) {
          let st2 = srcSTRUCT.structs[f.type.data as string];
          let cls2 = srcSTRUCT.struct_cls[st2.name];

          recStruct(st2, cls2);
        } else if (f.type.type === StructEnum.ARRAY) {
          recArray(f.type);
        } else if (f.type.type === StructEnum.ITER) {
          recArray(f.type);
        } else if (f.type.type === StructEnum.ITERKEYS) {
          recArray(f.type);
        } else if (f.type.type === StructEnum.STATIC_ARRAY) {
          recArray(f.type);
        }
      }
    };

    let st = srcSTRUCT.structs[cls.structName];
    recStruct(st, cls);
  }

  mergeScripts(child: string, parent: string): string {
    let stc = struct_parse.parse(child.trim()) as NStruct;
    let stp = struct_parse.parse(parent.trim()) as NStruct;

    let fieldset = new Set<string>();

    for (let f of stc.fields) {
      fieldset.add(f.name);
    }

    let fields: StructField[] = [];
    for (let f of stp.fields) {
      if (!fieldset.has(f.name)) {
        fields.push(f);
      }
    }

    stc.fields = fields.concat(stc.fields);
    return STRUCT.fmt_struct(stc, false, false);
  }

  inlineRegister(cls: StructableClass, structScript: string): string {
    const keywords = (this.constructor as typeof STRUCT).keywords;

    let p: StructableClass | undefined = cls.__proto__ as StructableClass | undefined;
    while (p && (p as unknown) !== Object) {
      if (p.hasOwnProperty(keywords.script)) {
        structScript = this.mergeScripts(structScript, (p as StructableClass).STRUCT!);
        break;
      }
      p = (p as StructableClass).__proto__ as StructableClass | undefined;
    }

    cls.STRUCT = structScript;
    this.register(cls);
    return structScript;
  }

  register(cls: StructableClass, structName?: string): void {
    return this.add_class(cls, structName);
  }

  unregister(cls: StructableClass): void {
    const keywords = (this.constructor as typeof STRUCT).keywords;

    if (!cls || !cls.structName || !(cls.structName in this.struct_cls)) {
      console.warn("Class not registered with nstructjs", cls);
      return;
    }

    let st = this.structs[cls.structName];

    delete this.structs[cls.structName];
    delete this.struct_cls[cls.structName];
    delete this.struct_ids[st.id];
  }

  add_class(cls: StructableClass, structName?: string): void {
    //do not register Object
    if (cls === (Object as unknown)) {
      return;
    }

    const keywords = (this.constructor as typeof STRUCT).keywords;
    if (cls.STRUCT) {
      let bad = false;

      let p: StructableClass | undefined = cls;
      while (p) {
        p = p.__proto__ as StructableClass | undefined;

        if (p && p.STRUCT && p.STRUCT === cls.STRUCT) {
          bad = true;
          break;
        }
      }

      if (bad) {
        if (warninglvl > 0) {
          console.warn("Generating " + keywords.script + " script for derived class " + unmangle(cls.name));
        }

        if (!structName) {
          structName = unmangle(cls.name);
        }

        cls.STRUCT = STRUCT.inherit(cls, p!) + "\n}";
      }
    }

    if (!cls.STRUCT) {
      throw new Error("class " + unmangle(cls.name) + " has no " + keywords.script + " script");
    }

    let stt = struct_parse.parse(cls.STRUCT) as NStruct;

    stt.name = unmangle(stt.name);

    cls.structName = stt.name;

    //create default newSTRUCT
    if (cls.newSTRUCT === undefined) {
      cls.newSTRUCT = function (this: StructableClass) {
        return new (this as unknown as new () => unknown)();
      };
    }

    if (structName !== undefined) {
      stt.name = cls.structName = structName;
    } else if (cls.structName === undefined) {
      cls.structName = stt.name;
    } else {
      stt.name = cls.structName;
    }

    if (cls.structName in this.structs) {
      if (warninglvl > 0) {
        console.warn("Struct " + unmangle(cls.structName) + " is already registered", cls);
      }

      if (!this.allowOverriding) {
        throw new Error("Struct " + unmangle(cls.structName) + " is already registered");
      }

      return;
    }

    if (stt.id === -1) stt.id = this.idgen++;

    this.structs[cls.structName] = stt;
    this.struct_cls[cls.structName] = cls;
    this.struct_ids[stt.id] = stt;
  }

  isRegistered(cls: StructableClass): boolean {
    const keywords = (this.constructor as typeof STRUCT).keywords;

    if (!cls.hasOwnProperty("structName")) {
      return false;
    }

    return cls === this.struct_cls[cls.structName!];
  }

  get_struct_id(id: number): NStruct {
    return this.struct_ids[id];
  }

  get_struct(name: string): NStruct {
    if (!(name in this.structs)) {
      console.warn("Unknown struct", name);
      throw new Error("Unknown struct " + name);
    }
    return this.structs[name];
  }

  get_struct_cls(name: string): StructableClass {
    if (!(name in this.struct_cls)) {
      console.trace();
      throw new Error("Unknown struct " + name);
    }
    return this.struct_cls[name];
  }

  _env_call(code: string, obj: unknown, env?: [unknown, unknown][]): unknown {
    let envcode = _static_envcode_null;
    if (env !== undefined) {
      envcode = "";
      for (let i = 0; i < env.length; i++) {
        envcode = "let " + env[i][0] + " = env[" + i.toString() + "][1];\n" + envcode;
      }
    }
    let fullcode = "";
    if (envcode !== _static_envcode_null) fullcode = envcode + code;
    else fullcode = code;
    let func: Function;

    if (!(fullcode in this.compiled_code)) {
      let code2 = "func = function(obj, env) { " + envcode + "return " + code + "}";
      try {
        func = struct_eval.structEval(code2) as Function;
      } catch (err) {
        console.warn((err as Error).stack);

        console.warn(code2);
        console.warn(" ");
        throw err;
      }
      this.compiled_code[fullcode] = func!;
    } else {
      func = this.compiled_code[fullcode];
    }
    try {
      return func!.call(obj, obj, env);
    } catch (err) {
      console.warn((err as Error).stack);

      let code2 = "func = function(obj, env) { " + envcode + "return " + code + "}";
      console.warn(code2);
      console.warn(" ");
      throw err;
    }
  }

  write_struct(data: number[], obj: unknown, stt: NStruct): void {
    function use_helper_js(field: StructField): boolean {
      let type = field.type.type;
      let cls = StructFieldTypeMap[type];
      return cls.useHelperJS(field);
    }

    let fields = stt.fields;
    let thestruct = this;
    let objRec = obj as any;
    for (let i = 0; i < fields.length; i++) {
      let f = fields[i];
      let t1 = f.type;
      let t2 = t1.type;

      if (use_helper_js(f)) {
        let val: unknown;
        if (f.get !== undefined) {
          val = thestruct._env_call(f.get, obj);
        } else {
          val = f.name === "this" ? obj : objRec[f.name];
        }

        if (DEBUG.tinyeval) {
          console.log("\n\n\n", f.get, "Helper JS Ret", val, "\n\n\n");
        }

        sintern2.do_pack(this, data, val, obj, f, t1);
      } else {
        let val = f.name === "this" ? obj : objRec[f.name];
        sintern2.do_pack(this, data, val, obj, f, t1);
      }
    }
  }

  /**
   @param data : array to write data into,
   @param obj  : structable object
   */
  write_object(data: number[] | undefined, obj: any): number[] {
    const keywords = (this.constructor as typeof STRUCT).keywords;

    let cls = (obj.constructor as StructableClass).structName!;
    let stt = this.get_struct(cls);

    if (data === undefined) {
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
  readObject<T, ARGS extends unknown[]>(
    data: DataView | Uint8Array | Uint8ClampedArray | number[],
    cls_or_struct_id: (new(...args: ARGS) => T) | number,
    uctx?: unpack_context
  ): T {
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
  writeObject(data: number[], obj: any): number[] {
    return this.write_object(data, obj);
  }

  writeJSON(obj: any, stt?: NStruct): StructJSONValue {
    const keywords = (this.constructor as typeof STRUCT).keywords;

    let cls = obj.constructor as StructableClass;
    stt = stt || this.get_struct(cls.structName!);

    function use_helper_js(field: StructField): boolean {
      let type = field.type.type;
      let cls = StructFieldTypeMap[type];
      return cls.useHelperJS(field);
    }

    let _toJSON = sintern2.toJSON;

    let fields = stt.fields;
    let thestruct = this;
    let json: any = {};

    for (let i = 0; i < fields.length; i++) {
      let f = fields[i];
      let val: unknown;
      let t1 = f.type;

      let json2: unknown;

      if (use_helper_js(f)) {
        if (f.get !== undefined) {
          val = thestruct._env_call(f.get, obj);
        } else {
          val = f.name === "this" ? obj : obj[f.name];
        }

        if (DEBUG.tinyeval) {
          console.log("\n\n\n", f.get, "Helper JS Ret", val, "\n\n\n");
        }

        json2 = _toJSON(this, val, obj, f, t1);
      } else {
        val = f.name === "this" ? obj : obj[f.name];
        json2 = _toJSON(this, val, obj, f, t1);
      }

      if (f.name !== "this") {
        json[f.name] = json2;
      } else {
        //f.name was 'this'?
        let isArray = Array.isArray(json2);
        isArray = isArray || f.type.type === StructTypes.ARRAY;
        isArray = isArray || f.type.type === StructTypes.STATIC_ARRAY;

        if (isArray) {
          let arr = json2 as unknown[];
          json.length = arr.length;

          for (let i = 0; i < arr.length; i++) {
            json[i] = arr[i];
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
  read_object(
    data: DataView | number[],
    cls_or_struct_id: StructableClass | number,
    uctx?: unpack_context,
    objInstance?: unknown
  ): any {
    const keywords = (this.constructor as typeof STRUCT).keywords;
    let cls: StructableClass;
    let stt: NStruct;

    if (data instanceof Array) {
      data = new DataView(new Uint8Array(data).buffer);
    }

    if (typeof cls_or_struct_id === "number") {
      cls = this.struct_cls[this.struct_ids[cls_or_struct_id].name];
    } else {
      cls = cls_or_struct_id;
    }

    if (cls === undefined) {
      throw new Error("bad cls_or_struct_id " + cls_or_struct_id);
    }

    stt = this.structs[cls.structName!];

    if (uctx === undefined) {
      uctx = new unpack_context();

      packer_debug("\n\n=Begin reading " + cls.structName + "=");
    }
    let thestruct = this;
    let this2 = this;

    function _unpack_field(type: StructType): unknown {
      return StructFieldTypeMap[type.type].unpack(this2, data as DataView, type, uctx!);
    }

    function _unpack_into(type: StructType, dest: unknown): unknown {
      return (StructFieldTypeMap[type.type] as typeof StructStructField).unpackInto(
        this2,
        data as DataView,
        type,
        uctx!,
        dest
      );
    }

    let was_run = false;

    function makeLoader(stt: NStruct): StructReader {
      return function load(obj: any) {
        if (was_run) {
          return;
        }

        was_run = true;

        let fields = stt.fields;
        let flen = fields.length;

        for (let i = 0; i < flen; i++) {
          let f = fields[i];

          if (f.name === "this") {
            //load data into obj directly
            _unpack_into(f.type, obj);
          } else {
            obj[f.name] = _unpack_field(f.type);
          }
        }
      };
    }

    let load = makeLoader(stt);

    if (cls.prototype.loadSTRUCT !== undefined) {
      let obj = objInstance as any | undefined;

      if (!obj && cls.newSTRUCT !== undefined) {
        obj = cls.newSTRUCT(load) as any;
      } else if (!obj) {
        obj = new (cls as unknown as new () => any)();
      }

      if (!obj?.loadSTRUCT) {
        debugger
      }
      (obj!.loadSTRUCT as Function)(load);

      if (!was_run) {
        console.warn("" + cls.structName + ".prototype.loadSTRUCT() did not execute its loader callback!");
        load(obj!);
      }

      return obj;
    } else if (cls.fromSTRUCT !== undefined) {
      if (warninglvl > 1) {
        console.warn(
          "Warning: class " +
            unmangle(cls.name) +
            " is using deprecated fromSTRUCT interface; use newSTRUCT/loadSTRUCT instead"
        );
      }

      return cls.fromSTRUCT(load);
    } else {
      //default case, make new instance and then call load() on it
      let obj = objInstance as any| undefined;

      if (!obj && cls.newSTRUCT !== undefined) {
        obj = cls.newSTRUCT(load) as any;
      } else if (!obj) {
        obj = new (cls as unknown as new () => any)();
      }

      load(obj!);

      return obj;
    }
  }

  validateJSON(
    json: any,
    cls_or_struct_id: StructableClass | NStruct | number,
    useInternalParser: boolean = true,
    useColors: boolean = true,
    consoleLoggerFn: (...args: unknown[]) => void = function (...args: unknown[]) {
      console.log(...args);
    },
    _abstractKey: string = "_structName"
  ): boolean {
    if (cls_or_struct_id === undefined) {
      throw new Error(this.constructor.name + ".prototype.validateJSON: Expected at least two arguments");
    }

    try {
      let jsonStr = JSON.stringify(json, undefined, 2);

      this.jsonBuf = jsonStr;
      this.jsonUseColors = useColors;
      this.jsonLogger = consoleLoggerFn;

      //add token annotations
      jsonParser.logger = this.jsonLogger;

      let parsed: unknown;
      if (useInternalParser) {
        parsed = jsonParser.parse(jsonStr);
      } else {
        parsed = JSON.parse(jsonStr);
      }

      this.validateJSONIntern(parsed, cls_or_struct_id, _abstractKey);
    } catch (error) {
      if (!(error instanceof JSONError)) {
        console.error((error as Error).stack);
      }

      this.jsonLogger((error as Error).message);
      return false;
    }

    return true;
  }

  validateJSONIntern(
    json: any,
    cls_or_struct_id: StructableClass | NStruct | number,
    _abstractKey: string = "_structName"
  ): boolean {
    const keywords = (this.constructor as typeof STRUCT).keywords;

    let cls: StructableClass;
    let stt: NStruct;

    if (typeof cls_or_struct_id === "number") {
      cls = this.struct_cls[this.struct_ids[cls_or_struct_id].name];
    } else if (cls_or_struct_id instanceof NStruct) {
      cls = this.get_struct_cls(cls_or_struct_id.name);
    } else {
      cls = cls_or_struct_id;
    }

    if (cls === undefined) {
      throw new Error("bad cls_or_struct_id " + cls_or_struct_id);
    }

    stt = this.structs[cls.structName!];

    if (stt === undefined) {
      throw new Error("unknown class " + cls);
    }

    let jsonObj = json as any;
    let fields = stt.fields;
    let flen = fields.length;

    let keys = new Set<string>();
    keys.add(_abstractKey);

    let keyTestJson: any = jsonObj as any;

    for (let i = 0; i < flen; i++) {
      let f = fields[i];

      let val: unknown;

      let tinfo: TokInfo | undefined;

      if (f.name === "this") {
        val = json;
        keyTestJson = {
          "this": json,
        };

        keys.add("this");
        tinfo = jsonObj[TokSymbol as unknown as string] as TokInfo | undefined;
      } else {
        val = (jsonObj as any)[f.name];
        keys.add(f.name);

        tinfo = jsonObj[TokSymbol as unknown as string]
          ? (jsonObj[TokSymbol as unknown as string] as TokInfo).fields[f.name]
          : undefined;
        if (!tinfo) {
          let f2 = fields[Math.max(i - 1, 0)];
          tinfo = (jsonObj[TokSymbol as unknown as string] as TokInfo | undefined)
            ? (jsonObj[TokSymbol as unknown as string] as TokInfo).fields[f2.name]
            : undefined;
        }

        if (!tinfo) {
          tinfo = jsonObj[TokSymbol as unknown as string] as TokInfo | undefined;
        }
      }

      if (val === undefined) {
        //console.warn("nstructjs.readJSON: Missing field " + f.name + " in struct " + stt.name);
        //continue;
      }

      let instance = f.name === "this" ? val : json;

      let ret = sintern2.validateJSON(this, val, json, f, f.type, instance, _abstractKey);

      if (!ret || typeof ret === "string") {
        let msg = typeof ret === "string" ? ": " + ret : "";

        if (tinfo) {
          this.jsonLogger(printContext(this.jsonBuf, tinfo, this.jsonUseColors));
        }

        if (val === undefined) {
          throw new JSONError(stt.name + ": Missing json field " + f.name + msg);
        } else {
          throw new JSONError(stt.name + ": Invalid json field " + f.name + msg);
        }

        return false;
      }
    }

    for (let k in keyTestJson) {
      if (typeof (jsonObj as any)[k] === "symbol") {
        //ignore symbols
        continue;
      }

      if (!keys.has(k)) {
        this.jsonLogger(cls.STRUCT!);
        throw new JSONError(stt.name + ": Unknown json field " + k);
      }
    }

    return true;
  }

  readJSON(json: any, cls_or_struct_id: StructableClass | NStruct | number, objInstance?: any): any {
    const keywords = (this.constructor as typeof STRUCT).keywords;

    let cls: StructableClass;
    let stt: NStruct;

    if (typeof cls_or_struct_id === "number") {
      cls = this.struct_cls[this.struct_ids[cls_or_struct_id].name];
    } else if (cls_or_struct_id instanceof NStruct) {
      cls = this.get_struct_cls(cls_or_struct_id.name);
    } else {
      cls = cls_or_struct_id;
    }

    if (cls === undefined) {
      throw new Error("bad cls_or_struct_id " + cls_or_struct_id);
    }

    stt = this.structs[cls.structName!];

    packer_debug("\n\n=Begin reading " + cls.structName + "=");
    let thestruct = this;
    let this2 = this;
    let was_run = false;
    let _fromJSON = sintern2.fromJSON;

    function makeLoader(stt: NStruct): StructReader {
      return function load(obj: any) {
        if (was_run) {
          return;
        }

        was_run = true;

        let fields = stt.fields;
        let flen = fields.length;
        let jsonObj = json as any;

        for (let i = 0; i < flen; i++) {
          let f = fields[i];

          let val: unknown;

          if (f.name === "this") {
            val = json;
          } else {
            val = jsonObj[f.name];
          }

          if (val === undefined) {
            if (warninglvl > 1) {
              console.warn("nstructjs.readJSON: Missing field " + f.name + " in struct " + stt.name);
            }
            continue;
          }

          let instance = f.name === "this" ? obj : objInstance;

          let ret = _fromJSON(this2, val, obj, f, f.type, instance);

          if (f.name !== "this") {
            obj[f.name] = ret;
          }
        }
      };
    }

    let load = makeLoader(stt);

    if (cls.prototype.loadSTRUCT !== undefined) {
      let obj = objInstance as any | undefined;

      if (!obj && cls.newSTRUCT !== undefined) {
        obj = cls.newSTRUCT(load) as any;
      } else if (!obj) {
        obj = new (cls as unknown as new () => any)();
      }

      (obj!.loadSTRUCT as Function)(load);
      return obj;
    } else if (cls.fromSTRUCT !== undefined) {
      if (warninglvl > 1) {
        console.warn(
          "Warning: class " +
            unmangle(cls.name) +
            " is using deprecated fromSTRUCT interface; use newSTRUCT/loadSTRUCT instead"
        );
      }
      return cls.fromSTRUCT(load);
    } else {
      //default case, make new instance and then call load() on it
      let obj = objInstance as any | undefined;

      if (!obj && cls.newSTRUCT !== undefined) {
        obj = cls.newSTRUCT(load) as any;
      } else if (!obj) {
        obj = new (cls as unknown as new () => any)();
      }

      load(obj!);

      return obj;
    }
  }

  formatJSON_intern(json: any, stt: NStruct, field?: StructField, tlvl: number = 0): string {
    const keywords = (this.constructor as typeof STRUCT).keywords;
    const addComments = this.formatCtx.addComments;

    let jsonObj = json as any;
    let s = "{";

    if (addComments && field && field.comment.trim()) {
      s += " " + field.comment.trim();
    }

    s += "\n";

    for (let f of stt.fields) {
      let value = jsonObj[f.name];

      s += tab(tlvl + 1) + f.name + ": ";

      s += sintern2.formatJSON(this, value, json, f, f.type, undefined, tlvl + 1);
      s += ",";

      let basetype = f.type.type;

      if (ArrayTypes.has(basetype)) {
        basetype = (f.type.data as { type: StructType }).type.type;
      }

      const addComment = ValueTypes.has(basetype) && addComments && f.comment.trim();

      if (addComment) {
        s += " " + f.comment.trim();
      }

      s += "\n";
    }

    s += tab(tlvl) + "}";
    return s;
  }

  formatJSON(json: any, cls: StructableClass, addComments: boolean = true, validate: boolean = true): string {
    const keywords = (this.constructor as typeof STRUCT).keywords;

    if (validate) {
      this.validateJSON(json, cls);
    }

    let stt = this.structs[cls.structName!];

    this.formatCtx = {
      addComments,
      validate,
    };

    return this.formatJSON_intern(json, stt);
  }
}
//$KEYWORD_CONFIG_END

if (haveCodeGen) {
  var StructClass: typeof STRUCT | undefined;

  try {
    eval("" /* code placeholder */);
  } catch (error) {
    printEvalError("" /* code placeholder */);
  }

  if (StructClass) {
    StructClass.keywords = {
      name  : "structName",
      script: "STRUCT",
      load  : "loadSTRUCT",
      from  : "fromSTRUCT",
      new   : "newSTRUCT",
    };
  }
}

STRUCT.setClassKeyword("STRUCT");

function deriveStructManager(
  keywords: STRUCTKeywords = {
    script: "STRUCT",
    name  : "structName",
    load  : "loadSTRUCT",
    new   : "newSTRUCT",
    from  : "fromSTRUCT",
  }
): typeof STRUCT {
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

  class NewSTRUCT extends STRUCT {}

  (NewSTRUCT as unknown as { keywords: STRUCTKeywords }).keywords = keywords;
  return NewSTRUCT;
}

//main struct script manager
manager = new STRUCT();

/**
 * Write all defined structs out to a string.
 *
 * @param nManager STRUCT instance, defaults to nstructjs.manager
 * @param include_code include save code snippets
 * */
function write_scripts(nManager: STRUCT = manager, include_code: boolean = false): string {
  let buf = "";

  /* prevent code generation bugs in configurable mode */
  let nl = String.fromCharCode(10);
  let tabChar = String.fromCharCode(9);

  nManager.forEach(function (stt) {
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

/* ---- file helper ---- */

("use strict");

let nbtoa: (str: string) => string;
let natob: (str: string) => string;

if (typeof btoa === "undefined") {
  nbtoa = function btoa(str: string): string {
    let BufferCls = (globalThis as any)["Buffer"] as {
      from(s: string, enc: string): { toString(enc: string): string };
    };
    let buffer = BufferCls.from("" + str, "binary");
    return buffer.toString("base64");
  };

  natob = function atob(str: string): string {
    let BufferCls = (globalThis as any)["Buffer"] as {
      from(s: string, enc: string): { toString(enc: string): string };
    };
    return BufferCls.from(str, "base64").toString("binary");
  };
} else {
  natob = atob;
  nbtoa = btoa;
}

/*
file format:
  magic signature              : 4 bytes
  file version major           : 2 bytes
  file version minor           : 1 bytes
  file version micro           : 1 bytes
  length of struct scripts     : 4 bytes
  struct scripts for this file : ...

  block:
    magic signature for block              : 4 bytes
    length of data  (not including header) : 4 bytes
    id of struct type                      : 4 bytes

    data                                   : ...
*/

interface VersionObj {
  major: number;
  minor: number;
  micro: number;
}

function versionToInt(v: string | number[] | VersionObj): number {
  v = versionCoerce(v);
  let mul = 64;
  return ~~(v.major * mul * mul * mul + v.minor * mul * mul + v.micro * mul);
}

let ver_pat = /[0-9]+\.[0-9]+\.[0-9]+$/;

function versionCoerce(v: string | number[] | VersionObj | unknown): VersionObj {
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
      micro: parseInt(ver[2]),
    };
  } else if (Array.isArray(v)) {
    const arr = v as number[];
    return {
      major: arr[0],
      minor: arr[1],
      micro: arr[2],
    };
  } else if (typeof v === "object" && v !== null) {
    let vObj = v as any;
    let test = (k: string) => k in vObj && typeof vObj[k] === "number";

    if (!test("major") || !test("minor") || !test("micro")) {
      throw new Error("invalid version object: " + v);
    }

    return v as VersionObj;
  } else {
    throw new Error("invalid version " + v);
  }
}

function versionLessThan(a: string | number[] | VersionObj, b: string | number[] | VersionObj): boolean {
  return versionToInt(a) < versionToInt(b);
}

class FileParams {
  magic: string;
  ext: string;
  blocktypes: string[];
  version: VersionObj;

  constructor() {
    this.magic = "STRT";
    this.ext = ".bin";
    this.blocktypes = ["DATA"];

    this.version = {
      major: 0,
      minor: 0,
      micro: 1,
    };
  }
}

//used to define blocks
class Block {
  type: string;
  data: unknown;

  constructor(type?: string, data?: unknown) {
    this.type = type || "";
    this.data = data;
  }
}

class FileeError extends Error {}

class FileHelper {
  version: VersionObj;
  blocktypes: string[];
  magic: string;
  ext: string;
  struct: STRUCT | undefined;
  unpack_ctx: unpack_context | undefined;
  blocks: Block[];

  //params can be FileParams instance, or object literal
  //(it will convert to FileParams)
  constructor(params?: FileParams | Partial<FileParams>) {
    if (params === undefined) {
      params = new FileParams();
    } else {
      let fp = new FileParams();

      for (let k in params) {
        (fp as unknown as any)[k] = (params as unknown as any)[k];
      }
      params = fp;
    }

    this.version = params.version!;
    this.blocktypes = params.blocktypes!;
    this.magic = params.magic!;
    this.ext = params.ext!;
    this.struct = undefined;
    this.unpack_ctx = undefined;
    this.blocks = [];
  }

  read(dataview: DataView): Block[] {
    this.unpack_ctx = new unpack_context();

    let magic = unpack_static_string(dataview, this.unpack_ctx, 4);

    if (magic !== this.magic) {
      throw new FileeError("corrupted file");
    }

    this.version = {
      major: 0,
      minor: 0,
      micro: 0,
    };
    this.version.major = unpack_short(dataview, this.unpack_ctx);
    this.version.minor = unpack_byte(dataview, this.unpack_ctx);
    this.version.micro = unpack_byte(dataview, this.unpack_ctx);

    let struct = (this.struct = new STRUCT());

    let scripts = unpack_string(dataview, this.unpack_ctx);
    this.struct.parse_structs(scripts, manager);

    let blocks: Block[] = [];
    let dviewlen = dataview.buffer.byteLength;

    while (this.unpack_ctx.i < dviewlen) {
      let type = unpack_static_string(dataview, this.unpack_ctx, 4);
      let datalen = unpack_int(dataview, this.unpack_ctx);
      let bstruct = unpack_int(dataview, this.unpack_ctx);
      let bdata: unknown;

      if (bstruct === -2) {
        //string data, e.g. JSON
        bdata = unpack_static_string(dataview, this.unpack_ctx, datalen);
      } else {
        bdata = unpack_bytes(dataview, this.unpack_ctx, datalen);
        bdata = struct.read_object(bdata as DataView, bstruct, new unpack_context());
      }

      let block = new Block();
      block.type = type;
      block.data = bdata;

      blocks.push(block);
    }

    this.blocks = blocks;
    return blocks;
  }

  doVersions(old: string | number[] | VersionObj): void {
    let blocks = this.blocks;

    if (versionLessThan(old, "0.0.1")) {
      //do something
    }
  }

  write(blocks: Block[]): DataView {
    this.struct = manager;
    this.blocks = blocks;

    let data: number[] = [];

    pack_static_string(data, this.magic, 4);
    pack_short(data, this.version.major);
    pack_byte(data, this.version.minor & 255);
    pack_byte(data, this.version.micro & 255);

    let scripts = write_scripts();
    pack_string(data, scripts);

    let struct = this.struct;

    for (let block of blocks) {
      if (typeof block.data === "string") {
        //string data, e.g. JSON
        pack_static_string(data, block.type, 4);
        pack_int(data, block.data.length);
        pack_int(data, -2); //flag as string data
        pack_static_string(data, block.data, block.data.length);
        continue;
      }

      let structName = (block.data as any).constructor
        ? ((block.data as any).constructor as StructableClass).structName
        : undefined;
      if (structName === undefined || !(structName in struct.structs)) {
        throw new Error("Non-STRUCTable object " + block.data);
      }

      let data2: number[] = [];
      let stt = struct.structs[structName];

      struct.write_object(data2, block.data as any);

      pack_static_string(data, block.type, 4);
      pack_int(data, data2.length);
      pack_int(data, stt.id);

      pack_bytes(data, data2);
    }

    return new DataView(new Uint8Array(data).buffer);
  }

  writeBase64(blocks: Block[]): string {
    let dataview = this.write(blocks);

    let str = "";
    let bytes = new Uint8Array(dataview.buffer);

    for (let i = 0; i < bytes.length; i++) {
      str += String.fromCharCode(bytes[i]);
    }

    return nbtoa(str);
  }

  makeBlock(type: string, data: unknown): Block {
    return new Block(type, data);
  }

  readBase64(base64: string): Block[] {
    let data = natob(base64);
    let data2 = new Uint8Array(data.length);

    for (let i = 0; i < data.length; i++) {
      data2[i] = data.charCodeAt(i);
    }

    return this.read(new DataView(data2.buffer));
  }
}

var struct_filehelper = /*#__PURE__*/ Object.freeze({
  __proto__      : null,
  versionToInt   : versionToInt,
  versionCoerce  : versionCoerce,
  versionLessThan: versionLessThan,
  FileParams     : FileParams,
  Block          : Block,
  FileeError     : FileeError,
  FileHelper     : FileHelper,
});

/* ---- public API ---- */

/** truncate webpack mangled names. defaults to true
 *  so Mesh$1 turns into Mesh */
function truncateDollarSign(value: boolean = true): void {
  setTruncateDollarSign(value);
}

function validateStructs(onerror?: (msg: string, stt: NStruct, field: StructField) => void): void {
  return manager.validateStructs(onerror);
}

/**
 true means little endian, false means big endian
 */
function setEndian(mode: boolean): boolean {
  let ret = STRUCT_ENDIAN;

  setBinaryEndian(mode);

  return ret;
}

function consoleLogger(...args: unknown[]): void {
  console.log(...args);
}

/** Validate json
 *
 * @param json
 * @param cls
 * @param useInternalParser If true (the default) an internal parser will be used that generates nicer error messages
 * @param printColors
 * @param logger
 * @returns {*}
 */
function validateJSON(
  json: any,
  cls: StructableClass,
  useInternalParser?: boolean,
  printColors: boolean = true,
  logger: (...args: unknown[]) => void = consoleLogger
): boolean {
  return manager.validateJSON(json, cls, useInternalParser, printColors, logger);
}

function getEndian(): boolean {
  return STRUCT_ENDIAN;
}

function setAllowOverriding(t: boolean): boolean {
  return (manager.allowOverriding = !!t);
}

function isRegistered(cls: StructableClass): boolean {
  return manager.isRegistered(cls);
}

/** Register a class inline.
 *
 * Note: No need to use nstructjs.inherit,
 * inheritance is handled for you.  Unlike
 * nstructjs.inherit fields can be properly
 * overridden in the child class without
 * being written twice.
 *
 * class Test {
 *  test = 0;
 *
 *  static STRUCT = nstructjs.inlineRegister(this, `
 *  namespace.Test {
 *    test : int;
 *  }
 *  `);
 * }
 **/
function inlineRegister(cls: StructableClass | Function, structScript: string): string {
  return manager.inlineRegister(cls as StructableClass, structScript);
}

/** Register a class with nstructjs **/
function register(cls: StructableClass | Function, structName?: string): void {
  return manager.register(cls as StructableClass, structName);
}

function unregister(cls: StructableClass | Function): void {
  manager.unregister(cls as StructableClass);
}

function inherit(child: StructableClass | Function, parent: StructableClass | Function, structName?: string): string {
  return STRUCT.inherit(
    child as StructableClass,
    parent as StructableClass,
    structName ?? (child as StructableClass).name
  );
}

/**
 @param data : DataView
 */
function readObject(
  data: DataView | Uint8Array | Uint8ClampedArray | number[],
  cls: StructableClass | number,
  __uctx?: unpack_context
): any {
  return manager.readObject(data, cls, __uctx);
}

/**
 @param data : Array instance to write bytes to
 */
function writeObject(data: number[], obj: any): number[] {
  return manager.writeObject(data, obj);
}

function writeJSON(obj: any): StructJSONValue {
  return manager.writeJSON(obj);
}


function formatJSON(
  json: any,
  cls: StructableClass,
  addComments: boolean = true,
  validate: boolean = true
): string {
  return manager.formatJSON(json, cls, addComments, validate);
}

function readJSON(json: any, class_or_struct_id: StructableClass | NStruct | number): unknown {
  return manager.readJSON(json, class_or_struct_id);
}

export {
  JSONError,
  STRUCT,
  _truncateDollarSign,
  struct_binpack as binpack,
  consoleLogger,
  deriveStructManager,
  struct_filehelper as filehelper,
  formatJSON,
  getEndian,
  inherit,
  inlineRegister,
  isRegistered,
  manager,
  struct_parser as parser,
  struct_parseutil as parseutil,
  readJSON,
  readObject,
  register,
  setAllowOverriding,
  setDebugMode,
  setEndian,
  setTruncateDollarSign,
  setWarningMode,
  truncateDollarSign,
  struct_typesystem as typesystem,
  unpack_context,
  unregister,
  validateJSON,
  validateStructs,
  writeJSON,
  writeObject,
  write_scripts,
};
