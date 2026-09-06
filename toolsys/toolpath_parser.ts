import { tokdef, lexer, parser, PUTLParseError } from "../util/parseutil";
import type { ToolOp } from "./toolop";

/**
 * The argument-list grammar behind a toolpath, `a=1 b='x'`. Its own module because both
 * `ToolRegistry` and `toolpath.ts`'s free wrappers need it, and either of them owning it
 * would put the two in a module-scope cycle.
 */
export function buildParser(): InstanceType<typeof parser> {
  type Tok = { type: string; value: string | number | boolean };
  const t = (name: string, re: RegExp, func?: (tok: Tok) => Tok | undefined) =>
    new tokdef(name, re, func as unknown as undefined);

  const tokens = [
    t("ID", /[a-zA-Z_$]+[a-zA-Z0-9_$]*/, (tok: Tok) => {
      if (tok.value === "true" || tok.value === "false") {
        tok.type = "BOOL";
        tok.value = tok.value === "true";
      }
      return tok;
    }),
    t("LPAREN", /\(/),
    t("RPAREN", /\)/),
    t("LSBRACKET", /\[/),
    t("RSBRACKET", /\]/),
    t("DOT", /\./),
    t("COMMA", /,/),
    t("EQUALS", /=/),
    t("STRLIT", /"[^"]*"/, (tok: Tok) => {
      tok.value = (tok.value as string).slice(1, (tok.value as string).length - 1);
      return tok;
    }),
    t("STRLIT", /'[^']*'/, (tok: Tok) => {
      tok.value = (tok.value as string).slice(1, (tok.value as string).length - 1);
      return tok;
    }),
    t("NUMBER", /-?[0-9]+/, (tok: Tok) => {
      tok.value = parseInt(tok.value as string);
      return tok;
    }),
    t("NUMBER", /-?[0-9]+\.[0-9]*/, (tok: Tok) => {
      tok.value = parseFloat(tok.value as string);
      return tok;
    }),
    t("WS", /[ \n\r\t]/, () => undefined), //ignore whitespace
  ];

  const lexerror = () => {
    console.warn("Parse error");
    return true;
  };

  const valid_datatypes: Record<string, number> = {
    STRLIT: 1,
    NUMBER: 1,
    BOOL  : 1,
    ID    : 1,
  };

  function p_Start(p: InstanceType<typeof parser>): Record<string, unknown> {
    const args: Record<string, unknown> = {};

    while (!p.at_end()) {
      const keyword = p.expect("ID") as string;
      p.expect("EQUALS");

      const t = p.next() as { type: string; value: unknown };
      if (!(t.type in valid_datatypes)) {
        throw new PUTLParseError("parse error: unexpected " + t.type);
      }

      args[keyword] = t.value;
    }

    return args;
  }

  const lex = new lexer(tokens, lexerror);
  const p = new parser(lex);
  p.start = p_Start;

  return p;
}

export const Parser = buildParser();

export interface ParseToolPathResult {
  toolclass: typeof ToolOp | undefined;
  args: Record<string, unknown>;
}
