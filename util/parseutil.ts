export type TokFunc<T> = (t: token<T>) => token<T> | undefined | void;
export type LexerErrFunc = (ctx: lexer) => boolean;
export type ParserErrFunc = (tok: token<unknown> | undefined) => boolean;

export class token<T> {
  type: string;
  value: T;
  lexpos: number;
  lexlen: number;
  lineno: number;
  lexer: lexer;
  parser: parser | undefined;

  constructor(
    type: string,
    val: string,
    lexpos: number,
    lexlen: number,
    lineno: number,
    lexer: lexer,
    parser: parser | undefined
  ) {
    this.type = type;
    // tokdef callback will parse the value into its final form
    this.value = val as unknown as T;
    this.lexpos = lexpos;
    this.lexlen = lexlen;
    this.lineno = lineno;
    this.lexer = lexer;
    this.parser = parser;
  }

  setValue(val: T): this {
    this.value = val;
    return this;
  }

  toString(): string {
    if (this.value !== undefined)
      return "token(type=" + this.type + ", value='" + this.value + "')";
    else return "token(type=" + this.type + ")";
  }
}

//func is optional. it takes a function
//with one parameter, token, and either
//a) returns the token, or b) returns
//undefined, in which case the token
//should be ignored by the lexer
export class tokdef<T> {
  name: string;
  re: RegExp | undefined;
  func: TokFunc<T> | undefined;

  constructor(name: string, regexpr?: RegExp, func?: TokFunc<T>) {
    this.name = name;
    this.re = regexpr;
    this.func = func;
  }
}

export class PUTLParseError extends Error {}

type LexerState = [tokdef<unknown>[], LexerErrFunc | undefined];

/**
 * `errfunc` is optional.  It requires
 * a function that takes one param, lexer,
 * and returns true if the lexer
 * should propagate an error when an error
 * has happened
 */
export class lexer {
  tokdef: tokdef<unknown>[];
  tokens: token<unknown>[];
  lexpos: number;
  lexdata: string;
  lineno: number;
  errfunc: LexerErrFunc | undefined;
  tokints: Record<string, number>;
  print_tokens: boolean;
  print_debug: boolean;
  statestack: [string, number][];
  states: Record<string, LexerState>;
  statedata: number;
  peeked_tokens: token<unknown>[];

  constructor(tokdef: tokdef<any>[], errfunc?: LexerErrFunc) {
    this.tokdef = tokdef;
    this.tokens = [];
    this.lexpos = 0;
    this.lexdata = "";
    this.lineno = 0;
    this.errfunc = errfunc;
    this.tokints = {};
    this.print_tokens = false;
    this.print_debug = false;

    for (let i = 0; i < tokdef.length; i++) {
      this.tokints[tokdef[i].name] = i;
    }

    this.statestack = [["__main__", 0]];
    this.states = { "__main__": [tokdef, errfunc] };
    this.statedata = 0; //public variable
    this.peeked_tokens = [];
  }

  copy(): lexer {
    const ret = new lexer(this.tokdef, this.errfunc);

    for (const k in this.states) {
      let state = this.states[k];

      state = [state[0], state[1]];
      ret.states[k] = state;
    }

    ret.statedata = this.statedata;

    return ret;
  }

  //errfunc is optional, defines state-specific error function
  add_state(name: string, tokdef: tokdef<unknown>[], errfunc?: LexerErrFunc): void {
    if (errfunc === undefined) {
      errfunc = function (_lexer: lexer) {
        return true;
      };
    }

    this.states[name] = [tokdef, errfunc];
  }

  tok_int(_name: string): void {}

  //statedata is optional.
  //it stores state-specific data in lexer.statedata.
  push_state(state: string, statedata: number): void {
    this.statestack.push([state, statedata]);

    const stateEntry = this.states[state];
    this.statedata = statedata;

    this.tokdef = stateEntry[0];
    this.errfunc = stateEntry[1];
  }

  pop_state(): void {
    const item = this.statestack[this.statestack.length - 1];
    const state = this.states[item[0]];

    this.tokdef = state[0];
    this.errfunc = state[1];
    this.statedata = item[1];
  }

  input(str: string): void {
    //go back to main state
    while (this.statestack.length > 1) {
      this.pop_state();
    }

    this.lexdata = str;
    this.lexpos = 0;
    this.lineno = 0;
    this.tokens = [];

    this.peeked_tokens = [];
  }

  error(): void {
    if (this.errfunc !== undefined && !this.errfunc(this)) return;

    console.log("Syntax error near line " + this.lineno);
    const next = Math.min(this.lexpos + 8, this.lexdata.length);
    console.log("  " + this.lexdata.slice(this.lexpos, next));

    throw new PUTLParseError("Parse error");
  }

  peek(): token<unknown> | undefined {
    const tok = this.next(true);

    if (tok === undefined) return undefined;

    this.peeked_tokens.push(tok);
    return tok;
  }

  peek_i(i: number): token<unknown> | undefined {
    while (this.peeked_tokens.length <= i) {
      const t = this.peek();
      if (t === undefined) return undefined;
    }

    return this.peeked_tokens[i];
  }

  at_end(): boolean {
    return this.lexpos >= this.lexdata.length && this.peeked_tokens.length === 0;
  }

  next(ignore_peek?: boolean): token<unknown> | undefined {
    if (ignore_peek !== true && this.peeked_tokens.length > 0) {
      const tok = this.peeked_tokens[0];

      if (this.print_debug) {
        console.log("PEEK_SHIFTING", "" + tok);
      }

      this.peeked_tokens.shift();

      if (this.print_tokens) {
        console.log(tok.toString());
      }

      return tok;
    }

    if (this.lexpos >= this.lexdata.length) return undefined;

    const ts = this.tokdef;
    const tlen = ts.length;

    const lexdata = this.lexdata.slice(this.lexpos, this.lexdata.length);

    const results: [tokdef<unknown>, RegExpExecArray][] = [];

    for (let i = 0; i < tlen; i++) {
      const t = ts[i];

      if (t.re === undefined) continue;

      const res = t.re.exec(lexdata);

      if (res?.index === 0) {
        results.push([t, res]);
      }
    }

    let max_res = 0;
    let theres: [tokdef<unknown>, RegExpExecArray] | undefined = undefined;
    for (let i = 0; i < results.length; i++) {
      const res = results[i];

      if (res[1][0].length > max_res) {
        theres = res;
        max_res = res[1][0].length;
      }
    }

    if (theres === undefined) {
      this.error();
      return;
    }

    const def = theres[0];

    const lexlen = max_res;
    let tok = new token(def.name, theres[1][0], this.lexpos, lexlen, this.lineno, this, undefined);
    this.lexpos += max_res;

    if (def.func) {
      const tok2 = def.func(tok);

      if (tok2 === undefined) {
        return this.next(ignore_peek);
      }

      tok = tok2;
    }

    if (this.print_tokens) {
      console.log(tok.toString());
    }

    if (!ignore_peek && this.print_debug) {
      console.log("CONSUME", tok.toString(), "\n" + getTraceBack());
    }

    return tok;
  }
}

export function getTraceBack(limit?: number, start?: number): string {
  try {
    throw new Error();
  } catch (error) {
    let stack: string[] = (error as Error).stack!.split("\n");
    stack = stack.slice(1, stack.length);

    if (start === undefined) {
      start = 0;
    }

    for (let i = 0; i < stack.length; i++) {
      let l = stack[i];

      let j = l.length - 1;
      while (j > 0 && l[j] !== "/") {
        j--;
      }

      let k = j;
      while (k >= 0 && l[k] !== "(") {
        k--;
      }

      const func = l.slice(0, k).trim();
      const file = l.slice(j + 1, l.length - 1);

      l = `  ${func} (${file})`;

      if (l.search(/parseutil\.js/) >= 0) {
        start = Math.max(start, i);
      }
      stack[i] = l;
    }

    if (limit !== undefined) {
      stack.length = Math.min(stack.length, limit);
    }

    if (start !== undefined) {
      stack = stack.slice(start, stack.length);
    }

    return stack.join("\n");
  }
}

export type StartFunc = (p: parser) => unknown;

export class parser {
  lexer: lexer;
  errfunc: ParserErrFunc | undefined;
  start: StartFunc | undefined;
  userdata: unknown;

  constructor(lexer: lexer, errfunc?: ParserErrFunc) {
    this.lexer = lexer;
    this.errfunc = errfunc;
    this.start = undefined;
    this.userdata = undefined;
  }

  copy(): parser {
    const ret = new parser(this.lexer.copy(), this.errfunc);
    ret.start = this.start;

    return ret;
  }

  parse(data?: string, err_on_unconsumed?: boolean): unknown {
    if (err_on_unconsumed === undefined) err_on_unconsumed = true;

    if (data !== undefined) this.lexer.input(data);

    const ret = this.start!(this);

    if (err_on_unconsumed && !this.lexer.at_end() && this.lexer.next() !== undefined) {
      //console.log(this.lexer.lexdata.slice(this.lexer.lexpos-1, this.lexer.lexdata.length));
      this.error(undefined, "parser did not consume entire input");
    }

    return ret;
  }

  input(data: string): void {
    this.lexer.input(data);
  }

  error(tok: token<unknown> | undefined, msg?: string): void {
    if (msg === undefined) msg = "";

    let estr: string;

    if (tok === undefined) estr = "Parse error at end of input: " + msg;
    else estr = "Parse error at line " + (tok.lineno + 1) + ": " + msg;

    let buf = "1| ";
    const ld = this.lexer.lexdata;
    let l = 1;
    for (let i = 0; i < ld.length; i++) {
      const c = ld[i];
      if (c === "\n") {
        l++;
        buf += "\n" + l + "| ";
      } else {
        buf += c;
      }
    }

    console.log("------------------");
    console.log(buf);
    console.log("==================");
    console.log(estr);

    if (this.errfunc && !this.errfunc(tok)) {
      return;
    }

    throw new PUTLParseError(estr);
  }

  peek(): token<unknown> | undefined {
    const tok = this.lexer.peek();
    if (tok !== undefined) tok.parser = this;

    return tok;
  }

  peek_i(i: number): token<unknown> | undefined {
    const tok = this.lexer.peek_i(i);
    if (tok !== undefined) tok.parser = this;

    return tok;
  }

  peeknext(): token<unknown> | undefined {
    return this.peek_i(0);
  }

  next(): token<unknown> | undefined {
    const tok = this.lexer.next();

    if (tok !== undefined) tok.parser = this;

    return tok;
  }

  optional(type: string): boolean {
    const tok = this.peek_i(0);

    if (tok?.type === type) {
      this.next();

      return true;
    }

    return false;
  }

  at_end(): boolean {
    return this.lexer.at_end();
  }

  expect<T = string>(type: string, msg?: string): T {
    const tok = this.next();

    if (msg === undefined) msg = type;

    if (tok?.type != type) {
      this.error(tok, "Expected " + msg + ", not " + (tok ? tok.type : "end of input"));
    }

    return tok!.value as T;
  }
}
