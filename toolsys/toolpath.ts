import { ToolClasses, ToolOp } from "./toolsys.js";
import { tokdef, lexer, parser, PUTLParseError } from "../util/parseutil.js";
import { DataPathError } from "../controller/controller_base.js";

export const ToolPaths: Record<string, typeof ToolOp> = {};

let initToolPaths_run = false;

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
    t("COMMA", /\,/),
    t("EQUALS", /\=/),
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

interface ParseToolPathResult {
  toolclass: typeof ToolOp | undefined;
  args: Record<string, unknown>;
}

export function parseToolPath(str: string, check_tool_exists: boolean = true): ParseToolPathResult {
  if (!initToolPaths_run) {
    initToolPaths_run = true;
    initToolPaths();
  }

  const startstr = str;

  const i1 = str.search(/\(/);
  const i2 = str.search(/\)/);
  let args = "";

  if (i1 >= 0 && i2 >= 0) {
    args = str.slice(i1 + 1, i2).trim();
    str = str.slice(0, i1).trim();
  }

  if (!(str in ToolPaths) && check_tool_exists) {
    throw new DataPathError("unknown tool " + str);
  }

  let ret: Record<string, unknown>;

  try {
    ret = Parser.parse(args) as Record<string, unknown>;
  } catch (error) {
    console.log(error);
    throw new DataPathError(`"${startstr}"\n  ${(error as Error).message}`);
  }

  return {
    toolclass: ToolPaths[str],
    args     : ret,
  };
}

export function testToolParser(): ParseToolPathResult {
  const ret = parseToolPath("view3d.sometool(selectmode=1 str='str' bool=true)", false);
  return ret;
}

window.parseToolPath = parseToolPath;

//tool path parser for simple_toolsys.js
export function initToolPaths(): void {
  for (const cls of ToolClasses) {
    if (!cls.hasOwnProperty("tooldef")) {
      //ignore abstract classes
      continue;
    }

    const def = (cls as unknown as { tooldef(): Record<string, unknown> }).tooldef();
    const path = def.toolpath as string;

    ToolPaths[path] = cls as typeof ToolOp;
  }
}
