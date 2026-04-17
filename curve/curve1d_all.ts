import { BounceCurve, EaseCurve, ElasticCurve, RandCurve } from "./curve1d_anim";
import { EquationCurve, GuassianCurve } from "./curve1d_basic";
import { BSplineCurve } from "./curve1d_bspline";

export * from "./curve1d_basic";
export * from "./curve1d_bspline";
export * from "./curve1d_anim";

export type AllCurveTypes =
  | BounceCurve
  | ElasticCurve
  | EaseCurve
  | RandCurve
  | EquationCurve
  | GuassianCurve
  | BSplineCurve;
