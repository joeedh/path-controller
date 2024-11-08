export declare class Constraint<PARAMS = any> {
  klst: number[][]
  glst: number[][]
  wlst: number[][]
  name: string
  params: any[]
  df: number
  threshold: number

  funcDv: ((this: this, params: PARAMS, glst: number[][]) => void) | null

  constructor(name: string, func: (params: PARAMS) => number, klst: number[][], params: PARAMS, k?: number)
  evaluate(noDvs?: boolean): number
}

export declare class Solver{ 
  constraints: Constraint[]
  gk: number
  simple: boolean
  randCons: boolean
  threshold: number

  add(con: Constraint)
  remove(con: Constraint)
  solveStep(gk?: number)
  solveStepSimple(gk?: number)
  solve(steps: number, gk?: number, printError?: boolean)
}
