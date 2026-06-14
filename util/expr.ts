import * as vectormath from "./vectormath";
import { lexer, tokdef, token, parser, PUTLParseError, TokFunc } from "./parseutil";

const tk = <T = string>(n: string, r?: RegExp, f?: TokFunc<T>): tokdef<T> => new tokdef<T>(n, r, f);

const count = (str: string, match: string | RegExp): number => {
  let c = 0;
  do {
    const i = str.search(match);
    if (i < 0) {
      break;
    }

    c++;

    str = str.slice(i + 1, str.length);
  } while (1);

  return c;
};

const tokens = [
  tk("ID", /[a-zA-Z$_]+[a-zA-Z0-9$_]*/),
  tk("NUM", /[0-9]+(\.[0-9]*)?/),
  tk("LPAREN", /\(/),
  tk("RPAREN", /\)/),
  tk("STRLIT", /"[^"]*"/, (t) => {
    // /".*(?<!\\)"/ <- not working outside of Chrome
    t.lexer.lineno += count(t.value, "\n");
    return t;
  }),
  tk("WS", /[ \t\n\r]/, (t) => {
    t.lexer.lineno += count(t.value, "\n");
    //drop token by not returning it
  }),
  tk("COMMA", /\,/),
  tk("COLON", /:/),
  tk("LSBRACKET", /\[/),
  tk("RSBRACKET", /\]/),
  tk("LBRACKET", /\{/),
  tk("RBRACKET", /\}/),
  tk("DOT", /\./),
  tk("PLUS", /\+/),
  tk("MINUS", /\-/),
  tk("TIMES", /\*/),
  tk("DIVIDE", /\//),
  tk("EXP", /\*\*/),
  tk("LAND", /\&\&/),
  tk("BAND", /\&/),
  tk("LOR", /\|\|/),
  tk("BOR", /\|/),
  tk("EQUALS", /=/),
  tk("LEQUALS", /\<\=/),
  tk("GEQUALS", /\>\=/),
  tk("LTHAN", /\</),
  tk("GTHAN", /\>/),
  tk("MOD", /\%/),
  tk("XOR", /\^/),
  tk("BITINV", /\~/),
];

const lex = new lexer(tokens, (_t: lexer) => {
  console.log("Token error");
  return true;
});

const parse = new parser(lex);

const binops = new Set([
  ".",
  "/",
  "*",
  "**",
  "^",
  "%",
  "&",
  "+",
  "-",
  "&&",
  "||",
  "&",
  "|",
  "<",
  ">",
  "==",
  "=",
  "<=",
  ">=", //, "(", ")"
]);

let precedence: Record<string, number>;

if (1) {
  const table = [
    ["**"],
    ["*", "/"],
    ["+", "-"],
    ["."],
    ["="],
    ["("],
    [")"],
    //    [","],
    //    ["("]
  ];

  const pr: Record<string, number> = {};
  for (let i = 0; i < table.length; i++) {
    for (const c of table[i]) {
      pr[c] = i;
    }
  }

  precedence = pr;
}

function indent(n: number, chr: string = "  "): string {
  let s = "";
  for (let i = 0; i < n; i++) {
    s += chr;
  }

  return s;
}

export class Node extends Array<Node> {
  type: string;
  parent: Node | undefined;
  value: string | number | undefined;
  op: string | undefined;

  constructor(type?: string) {
    super();
    this.type = type ?? "";
    this.parent = undefined;
  }

  push(n: Node): number {
    n.parent = this;
    return super.push(n);
  }

  remove(n: Node): this {
    let i = this.indexOf(n);

    if (i < 0) {
      console.log(n);
      throw new Error("item not in array");
    }

    while (i < this.length) {
      this[i] = this[i + 1];
      i++;
    }

    n.parent = undefined;
    this.length--;

    return this;
  }

  insert(starti: number, n: Node): this {
    let i = this.length - 1;
    this.length++;

    if (n.parent) {
      n.parent.remove(n);
    }

    while (i > starti) {
      this[i] = this[i - 1];
      i--;
    }

    n.parent = this;
    this[starti] = n;

    return this;
  }

  replace(n: Node, n2: Node): this {
    if (n2.parent) {
      n2.parent.remove(n2);
    }

    this[this.indexOf(n)] = n2;
    n.parent = undefined;
    n2.parent = this;

    return this;
  }

  toString(t: number = 0): string {
    const tab = indent(t, "-");

    let typestr = this.type;

    if (this.value !== undefined) {
      typestr += " : " + this.value;
    } else if (this.op !== undefined) {
      typestr += " (" + this.op + ")";
    }

    let s = tab + typestr + " {\n";
    for (const c of this) {
      s += c.toString(t + 1);
    }
    s += tab + "}\n";

    return s;
  }
}

interface BinNextResult {
  value: token<string> | undefined;
  op: string;
  prec: number;
}

export function parseExpr(s: string): unknown {
  const p = parse;

  function Value(): Node | undefined {
    let t = p.next();

    if (t?.value === "(") {
      t = p.next();
    }

    if (t === undefined) {
      p.error(undefined, "Expected a value");
      return;
    }

    const n = new Node();
    n.value = t.value as string;

    if (t.type === "ID") {
      n.type = "Ident";
    } else if (t.type === "NUM") {
      n.type = "Number";
    } else if (t.type === "STRLIT") {
      n.type = "StrLit";
    } else if (t.type === "MINUS") {
      const t2 = p.peek_i(0);
      if (t2?.type === "NUM") {
        p.next();
        n.type = "Number";
        n.value = -parseFloat(t2.value as string);
      } else if (t2?.type === "ID") {
        p.next();
        n.type = "Negate";

        const n2 = new Node();

        n2.type = "Ident";
        n2.value = t2.value as string;
        n.push(n2);
      } else {
        p.error(t, "Expected a value, not '" + t.value + "'");
      }
    } else {
      p.error(t, "Expected a value, not '" + t.value + "'");
    }

    return n;
  }

  function bin_next(depth: number = 0): Node | BinNextResult | undefined {
    const a = p.peek_i(0) as token<string>;
    const b = p.peek_i(1) as token<string>;

    if (b && a && b.value === ")") {
      b.type = a.type;
      b.value = a.value;
      p.next();

      const c = p.peek_i(2) as token<string>;
      if (c && binops.has(c.value)) {
        return {
          value: b,
          op   : c.value,
          prec : -10,
        };
      }
    }
    if (b && binops.has(b.value)) {
      return {
        value: a,
        op   : b.value,
        prec : precedence[b.value],
      };
    } else {
      return Value();
    }
  }

  function BinOp(left: Node, depth: number = 0): Node {
    console.log(indent(depth) + "BinOp", left.toString());
    const op = p.next()! as token<string>;
    let right: Node | undefined;

    let n: Node | undefined;
    const prec = precedence[op.value];

    const r = bin_next(depth + 1);

    if (r instanceof Node) {
      right = r;
    } else {
      const br = r as BinNextResult;
      if (br.prec > prec) {
        if (!n) {
          n = new Node("BinOp");
          n.op = op.value;
          n.push(left);
        }

        n.push(Value()!);

        return n;
      } else {
        right = BinOp(Value()!, depth + 2);
      }
    }

    n = new Node("BinOp");
    n.op = op.value;
    n.push(right!);
    n.push(left);

    console.log("\n\n", n.toString(), "\n\n");

    console.log(n.toString());

    return n;
  }

  function Start(): Node {
    let ret = Value()!;

    while (!p.at_end()) {
      const t = p.peek_i(0) as token<string>;
      //let n = p.peek_i(1);

      if (t === undefined) {
        break;
        //return Value();
      }

      console.log(t.toString()); //, n.toString())

      if (binops.has(t.value)) {
        console.log("binary op!");
        ret = BinOp(ret);
      } else if (t.value === ",") {
        const n = new Node();
        n.type = "ExprList";

        p.next();

        n.push(ret);
        const n2 = Start();
        if (n2.type === "ExprList") {
          for (const c of n2) {
            n.push(c);
          }
        } else {
          n.push(n2);
        }

        return n;
      } else if (t.value === "(") {
        const n = new Node("FuncCall");
        n.push(ret);
        n.push(Start());
        p.expect("RPAREN");
        return n;
      } else if (t.value === ")") {
        return ret;
      } else {
        //ret = Value();
        //break;
        console.log(ret.toString());
        p.error(t, "Unexpected token " + t.value);
      }
    }

    return ret;
  }

  function Run(): Node[] {
    const ret: Node[] = [];

    while (!p.at_end()) {
      ret.push(Start());
    }

    return ret;
  }

  p.start = Run;
  return p.parse(s);

  /*
  lex.input(s);
  let t = lex.next();
  while (t) {
    console.log(t.toString());
    t = lex.next();
  }
  //*/
}
