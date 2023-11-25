export declare class Unit {
  static getUnit(name: string): Unit;

  static baseUnit: string;
}

export declare type UnitRef = Unit & string;

export declare function buildString(value: number,
                             baseUnit: string | undefined,
                             decimalPlaces: number | undefined,
                             displayUnit: string | undefined): string;

export declare function convert(value: number, unita: UnitRef, unitb: UnitRef): number;
export declare function parseValue(string:string, baseUnit:string, displayUnit:string) : number;
export declare function isNumber(s : string) : boolean;
