interface IVector {
  length: number
  [index: number]: number
}

export declare class Constraint<PARAMS = any[]> {
  klst: IVector[]
  glst: IVector[]
  wlst: IVector[]
  name: string
  readonly params: PARAMS
  df: number
  threshold: number

  funcDv: ((this: this, params: Readonly<PARAMS>, glst: IVector[]) => void) | null

  constructor(name: string, func: (params: PARAMS) => number, klst: IVector[], params: Readonly<PARAMS>, k?: number)
  evaluate(noDvs?: boolean): number
}

export declare class Solver {
  constraints: Constraint[]
  gk: number
  simple: boolean
  randCons: boolean
  threshold: number

  // typescript is being dumb here
  add(con: any)
  // typescript is being dumb here
  remove(con: any)
  solveStep(gk?: number)
  solveStepSimple(gk?: number)
  solve(steps: number, gk?: number, printError?: boolean)
}
