import * as util from "../util/util";

export declare enum SplineTemplates {
  CONSTANT = 0,
  LINEAR = 1,
  SHARP = 2,
  SQRT = 3,
  SMOOTH = 4,
  SMOOTHER = 5,
  SHARPER = 6,
  SPHERE = 7,
  REVERSE_LINEAR = 8,
  GUASSIAN = 9
}

//export declare type Curve1dType = 'bspline' | 'bounce' | 'elastic' | 'ease' | 'equation' | 'random' | 'guassian'

export declare interface CurveTypeConstructor<Class, Type, ClassName> {
  new(): Class;

  define(): { typeName: ClassName, name: Type, uiname?: string };
}

export declare interface CurveTypeData<Class, Type, ClassName> {
  _typeTag: Type

  ['constructor']: CurveTypeConstructor<Class, Type, ClassName>

  get hasGUI(): boolean;

  evaluate(s: number): number;
}

interface CurveTypeDataIF {
  //_typeTag: Curve1dType
}

export declare class EquationCurve extends CurveTypeData<EquationCurve, 'equation', 'Equation'>, CurveTypeDataIF {
  _typeTag: 'equation'
}

export declare class BSplineCurve extends CurveTypeData<BSplineCurve, 'bspline', 'BSplineCurve'>, CurveTypeDataIF {
  _typeTag: 'bspline'

  loadTemplate(template: SplineTemplates): void
}

declare type Curve1dClass = BSplineCurve | EquationCurve
type inferHelper = { bspline: BSplineCurve, equation: EquationCurve }

export type Curve1DType = keyof { [P in keyof Curve1dClass as P extends '_typeTag' ? Curve1dClass[P] : never]: Curve1dClass[P] }
//export type Curve1DType = 'bspline' | 'equation'

type ClassFromCurve1DType<T extends Curve1DType> = { [P in keyof inferHelper as P extends T ? P : never]: inferHelper[P] }[T]


export declare class Curve1D {
  get generatorType(): string;

  fastmode: boolean;

  calcHashKey(digest?: util.HashDigest): number;

  equals(b: this): boolean;

  load(b: this): this;

  copy(): this;

  switchGenerator<T extends Curve1DType>(type: T): ClassFromCurve1DType<T>;

  destroy(): this;

  evaluate(s: number): number;

  integrate(s: number, integrateSteps?: number): number;

  derivative(s: number): number;

  derivative2(s: number): number;

  loadJSON(json: any): void;

  toJSON(): ang;

  curvature(s: number): number;

  reset(): void;

  update(): any;

  draw(canvas: HTMLCanvasElement, g: CanvasRenderingContext2D, draw_transform: [number, [number, number]]): this;

}
