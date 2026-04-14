import { Vector2, Vector3, Vector4, Quat } from "./vectormath";

type ConstraintFunc<PARAMS> = (params: PARAMS) => number;
type ConstraintDvFunc<PARAMS> = (params: PARAMS, glst: Float64Array[]) => void;
export type KVector = (Float64Array | number[] | Vector2 | Vector3 | Vector4 | Quat) | Float32Array;

export class Constraint<PARAMS = unknown[]> {
  glst: Float64Array[];
  klst: number[][];
  wlst: Float64Array[];
  k: number;
  private params: Readonly<PARAMS>;
  name: string;
  df: number;
  threshold: number;
  private func: ConstraintFunc<Readonly<PARAMS>>;
  private funcDv: ConstraintDvFunc<Readonly<PARAMS>> | null;

  constructor(
    name: string,
    func: ConstraintFunc<PARAMS> | undefined,
    klst: KVector[],
    params: Readonly<PARAMS>,
    k: number = 1.0
  ) {
    this.glst = [];
    this.klst = klst as unknown as number[][];
    this.wlst = [];
    this.k = k;
    this.params = params;
    this.name = name;

    for (const ks of klst) {
      this.glst.push(new Float64Array(ks.length));
      const ws = new Float64Array(ks.length);

      for (let i = 0; i < ws.length; i++) {
        ws[i] = 1.0;
      }

      this.wlst.push(ws);
    }

    this.df = 0.0005;
    this.threshold = 0.0001;
    this.func = func!;
    this.funcDv = null;
  }

  postSolve(): void {}

  evaluate(no_dvs: boolean = false): number {
    const r1 = this.func(this.params);

    if (this.funcDv) {
      this.funcDv(this.params, this.glst);
      return r1;
    }

    if (Math.abs(r1) < this.threshold) return 0.0;

    const df = this.df;

    if (no_dvs) return r1;

    for (let i = 0; i < this.klst.length; i++) {
      const gs = this.glst[i];
      const ks = this.klst[i];

      for (let j = 0; j < ks.length; j++) {
        const orig = ks[j];
        ks[j] += df;
        const r2 = this.func(this.params);
        ks[j] = orig;

        gs[j] = (r2 - r1) / df;
      }
    }

    return r1;
  }
}

export class Solver {
  constraints: Constraint[];
  gk: number;
  simple: boolean;
  randCons: boolean;
  threshold: number;

  constructor() {
    this.constraints = [];
    this.gk = 0.99;
    this.simple = false;
    this.randCons = false;
    this.threshold = 0.01;
  }

  remove(con: Constraint): void {
    this.constraints.remove(con);
  }

  add<PARAMS>(con: Constraint<PARAMS>): void {
    this.constraints.push(con as unknown as Constraint);
  }

  solveStep(gk: number = this.gk): number {
    let err = 0.0;

    const cons = this.constraints;
    for (let ci = 0; ci < cons.length; ci++) {
      let ri = ci;
      if (this.randCons) {
        ri = ~~(Math.random() * this.constraints.length * 0.99999);
      }

      const con = cons[ri];

      let r1 = con.evaluate();

      if (r1 === 0.0) continue;

      err += Math.abs(r1);
      let totgs = 0.0;

      for (let i = 0; i < con.klst.length; i++) {
        const ks = con.klst[i],
          gs = con.glst[i];
        for (let j = 0; j < ks.length; j++) {
          totgs += gs[j] * gs[j];
        }
      }

      if (totgs === 0.0) {
        continue;
      }

      r1 /= totgs;

      for (let i = 0; i < con.klst.length; i++) {
        const ks = con.klst[i],
          gs = con.glst[i],
          ws = con.wlst[i];
        for (let j = 0; j < ks.length; j++) {
          ks[j] += -r1 * gs[j] * con.k * gk * ws[j];
        }

        con.postSolve();
      }
    }

    return err;
  }

  solveStepSimple(gk: number = this.gk): number {
    let err = 0.0;

    const cons = this.constraints;
    for (let ci = 0; ci < cons.length; ci++) {
      let ri = ci;
      if (this.randCons) {
        ri = ~~(Math.random() * this.constraints.length * 0.99999);
      }

      const con = cons[ri];

      const r1 = con.evaluate();

      if (r1 === 0.0) continue;

      err += Math.abs(r1);
      let totgs = 0.0;

      for (let i = 0; i < con.klst.length; i++) {
        const ks = con.klst[i],
          gs = con.glst[i];
        for (let j = 0; j < ks.length; j++) {
          totgs += gs[j] * gs[j];
        }
      }

      if (totgs === 0.0) {
        continue;
      }

      totgs = 0.0001 / Math.sqrt(totgs);

      for (let i = 0; i < con.klst.length; i++) {
        const ks = con.klst[i],
          gs = con.glst[i],
          ws = con.wlst[i];
        for (let j = 0; j < ks.length; j++) {
          ks[j] += -totgs * gs[j] * con.k * gk * ws[j];
        }
      }

      con.postSolve();
    }

    return err;
  }

  solve(steps: number, gk: number = this.gk, printError: boolean = false): number {
    let err = 0.0;

    for (let i = 0; i < steps; i++) {
      if (this.simple) {
        err = this.solveStepSimple(gk);
      } else {
        err = this.solveStep(gk);
      }

      if (printError) {
        console.warn("average error:", (err / this.constraints.length).toFixed(4));
      }
      if (err < this.threshold / this.constraints.length) {
        break;
      }
    }

    return err;
  }
}
