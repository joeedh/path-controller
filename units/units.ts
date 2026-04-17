/**
 * Unit system.
 *
 * Provides an API to convert units,
 * e.g. `convert(0.5, "foot", "meter")`
 *
 * Path.ux widgets typically have `baseUnit`
 * and `displayUnit` properties. `baseUnit`
 * is the unit of the real stored value,
 * while `displayUnit` is what he user sees
 * and edits.
 *
 * Units:
 * # none           No unit
 * # meter          Meter       (distance)
 * # inch           Inch        (distance)
 * # foot           Foot        (distance)
 * # square_foot    Square Feet (area)
 * # mile           Mile        (distance)
 * # degree         Degrees     (angle)
 * # radian         Radians     (angle)
 * # pixel          Pixel       (distance)
 * # percent        Percent
 *
 */

/*
all units convert to meters
*/

export interface UnitDefinition {
  name: string;
  uiname: string;
  type: string;
  icon: number;
  pattern: RegExp | undefined;
}

export interface UnitClass {
  unitDefine(): UnitDefinition;
  parse(s: string): number;
  validate(s: string): boolean;
  toInternal(value: number): number;
  fromInternal(value: number): number;
  buildString(value: number, decimals?: number): string;
}

const FLT_EPSILONE = 1.192092895507812e-7;

function myfloor(f: number): number {
  return Math.floor(f + FLT_EPSILONE * 2.0);
}

function normString(s: string): string {
  //remove all whitespace
  s = s.replace(/ /g, "").replace(/\t/g, "");
  return s.toLowerCase();
}

function myToFixed(f: number, decimals: number): string {
  if (typeof f !== "number") {
    return "(error)";
  }

  let s: string = f.toFixed(decimals);
  while (s.endsWith("0") && s.search(/\./) >= 0) {
    s = s.slice(0, s.length - 1);
  }

  if (s.endsWith(".")) {
    s = s.slice(0, s.length - 1);
  }

  if (s.length === 0) s = "0";

  return s.trim();
}

export const Units: UnitClass[] = [];

export class Unit {
  static baseUnit: string = "meter";
  static isMetric: boolean = true;

  static getUnit(name: string | undefined): UnitClass | undefined {
    if (name === "none" || name === undefined) {
      return undefined;
    }

    for (const cls of Units) {
      if (cls.unitDefine().name === name) {
        return cls;
      }
    }

    throw new Error("Unknown unit " + name);
  }

  static register(cls: UnitClass): void {
    Units.push(cls);
  }

  //subclassed static methods start here
  static unitDefine(): UnitDefinition {
    return {
      name   : "",
      uiname : "",
      type   : "", //e.g. distance
      icon   : -1,
      pattern: undefined, //a re literal to validate strings
    };
  }

  static parse(string: string): number {
    return NaN;
  }

  static validate(string: string): boolean {
    string = normString(string);
    const def = this.unitDefine();

    const m = string.match(def.pattern!);
    if (!m) return false;

    return m[0] === string;
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value: number): number {
    return value;
  }

  static fromInternal(value: number): number {
    return value;
  }

  static buildString(value: number, decimals: number = 2): string {
    return "";
  }
}

export class MeterUnit extends Unit {
  static unitDefine(): UnitDefinition {
    return {
      name   : "meter",
      uiname : "Meter",
      type   : "distance",
      icon   : -1,
      pattern: /-?\d+(\.\d*)?m$/,
    };
  }

  static parse(string: string): number {
    string = normString(string);
    if (string.endsWith("m")) {
      string = string.slice(0, string.length - 1);
    }

    return parseFloat(string);
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value: number): number {
    return value;
  }

  static fromInternal(value: number): number {
    return value;
  }

  static buildString(value: number, decimals: number = 2): string {
    return "" + myToFixed(value, decimals) + " m";
  }
}

Unit.register(MeterUnit);

export class InchUnit extends Unit {
  static unitDefine(): UnitDefinition {
    return {
      name   : "inch",
      uiname : "Inch",
      type   : "distance",
      icon   : -1,
      pattern: /-?\d+(\.\d*)?(in|inch)$/,
    };
  }

  static parse(string: string): number {
    string = string.toLowerCase();
    const i = string.indexOf("i");

    if (i >= 0) {
      string = string.slice(0, i);
    }

    return parseInt(string);
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value: number): number {
    return value * 0.0254;
  }

  static fromInternal(value: number): number {
    return value / 0.0254;
  }

  static buildString(value: number, decimals: number = 2): string {
    return "" + myToFixed(value, decimals) + "in";
  }
}

Unit.register(InchUnit);

const foot_re = /((-?\d+(\.\d*)?ft)(-?\d+(\.\d*)?(in|inch))?)|(-?\d+(\.\d*)?(in|inch))$/;

export class FootUnit extends Unit {
  static unitDefine(): UnitDefinition {
    return {
      name   : "foot",
      uiname : "Foot",
      type   : "distance",
      icon   : -1,
      pattern: foot_re,
    };
  }

  static parse(string: string): number {
    string = normString(string);
    const i = string.search("ft");
    let parts: string[] = [];
    let vft = 0.0;
    let vin = 0.0;

    if (i >= 0) {
      parts = string.split("ft");
      const j = parts[1].search("in");

      if (j >= 0) {
        parts = [parts[0]].concat(parts[1].split("in"));
        vin = parseFloat(parts[1]);
      }

      vft = parseFloat(parts[0]);
    } else {
      string = string.replace(/in/g, "");
      vin = parseFloat(string);
    }

    return vin / 12.0 + vft;
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value: number): number {
    return value * 0.3048;
  }

  static fromInternal(value: number): number {
    return value / 0.3048;
  }

  static buildString(value: number, decimals: number = 2): string {
    const vft = myfloor(value);
    const vin = ((value + FLT_EPSILONE * 2) * 12) % 12;

    if (vft === 0.0) {
      return myToFixed(vin, decimals) + " in";
    }

    let s = "" + vft + " ft";
    if (vin !== 0.0) {
      s += " " + myToFixed(vin, decimals) + " in";
    }

    return s;
  }
}

Unit.register(FootUnit);

const square_foot_re =
  /((-?\d+(\.\d*)?ft(\u00b2)?)(-?\d+(\.\d*)?(in|inch)(\u00b2)?)?)|(-?\d+(\.\d*)?(in|inch)(\u00b2)?)$/;

export class SquareFootUnit extends FootUnit {
  static unitDefine(): UnitDefinition {
    return {
      name   : "square_foot",
      uiname : "Square Feet",
      type   : "area",
      icon   : -1,
      pattern: square_foot_re,
    };
  }

  static parse(string: string): number {
    string = string.replace(/\u00b2/g, "");
    return super.parse(string);
  }

  static buildString(value: number, decimals: number = 2): string {
    const vft = myfloor(value);
    const vin = ((value + FLT_EPSILONE * 2) * 12) % 12;

    if (vft === 0.0) {
      return myToFixed(vin, decimals) + " in\u00b2";
    }

    let s = "" + vft + " ft\u00b2";
    if (vin !== 0.0) {
      s += " " + myToFixed(vin, decimals) + " in\u00b2";
    }

    return s;
  }
}

Unit.register(SquareFootUnit);

export class MileUnit extends Unit {
  static unitDefine(): UnitDefinition {
    return {
      name   : "mile",
      uiname : "Mile",
      type   : "distance",
      icon   : -1,
      pattern: /-?\d+(\.\d+)?miles$/,
    };
  }

  static parse(string: string): number {
    string = normString(string);
    string = string.replace(/miles/, "");
    return parseFloat(string);
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value: number): number {
    return value * 1609.34;
  }

  static fromInternal(value: number): number {
    return value / 1609.34;
  }

  static buildString(value: number, decimals: number = 3): string {
    return "" + myToFixed(value, decimals) + " miles";
  }
}

Unit.register(MileUnit);

export class DegreeUnit extends Unit {
  static unitDefine(): UnitDefinition {
    return {
      name   : "degree",
      uiname : "Degrees",
      type   : "angle",
      icon   : -1,
      pattern: /-?\d+(\.\d+)?(\u00B0|degree|deg|d|degree|degrees)$/,
    };
  }

  static parse(string: string): number {
    string = normString(string);
    if (string.search("d") >= 0) {
      string = string.slice(0, string.search("d")).trim();
    } else if (string.search("\u00B0") >= 0) {
      string = string.slice(0, string.search("\u00B0")).trim();
    }

    return parseFloat(string);
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value: number): number {
    return (value / 180.0) * Math.PI;
  }

  static fromInternal(value: number): number {
    return (value * 180.0) / Math.PI;
  }

  static buildString(value: number, decimals: number = 3): string {
    return "" + myToFixed(value, decimals) + " \u00B0";
  }
}
Unit.register(DegreeUnit);

export class RadianUnit extends Unit {
  static unitDefine(): UnitDefinition {
    return {
      name   : "radian",
      uiname : "Radians",
      type   : "angle",
      icon   : -1,
      pattern: /-?\d+(\.\d+)?(r|rad|radian|radians)$/,
    };
  }

  static parse(string: string): number {
    string = normString(string);
    if (string.search("r") >= 0) {
      string = string.slice(0, string.search("r")).trim();
    }

    return parseFloat(string);
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value: number): number {
    return value;
  }

  static fromInternal(value: number): number {
    return value;
  }

  static buildString(value: number, decimals: number = 3): string {
    return "" + myToFixed(value, decimals) + " r";
  }
}

Unit.register(RadianUnit);

export function setBaseUnit(unit: string): void {
  Unit.baseUnit = unit;
}

(window as unknown as Record<string, unknown>)._getBaseUnit = () => Unit.baseUnit;

export function setMetric(val: boolean): void {
  Unit.isMetric = val;
}

const numre1 = /[+\-]?[0-9]+(\.[0-9]*)?$/;
const numre2 = /[+\-]?[0-9]?(\.[0-9]*)+$/;
const hexre1 = /[+\-]?[0-9a-fA-F]+h$/;
const hexre2 = /[+\-]?0x[0-9a-fA-F]+$/;
const binre = /[+\-]?0b[01]+$/;
const expre = /[+\-]?[0-9]+(\.[0-9]*)?[eE]\-?[0-9]+$/;
const intre = /[+\-]?[0-9]+$/;

function isnumber(s: string): boolean {
  s = ("" + s).trim();

  function test(re: RegExp): boolean {
    return s.search(re) === 0;
  }

  return (
    test(intre) ||
    test(numre1) ||
    test(numre2) ||
    test(hexre1) ||
    test(hexre2) ||
    test(binre) ||
    test(expre)
  );
}

export function parseValueIntern(
  string: string,
  baseUnit?: string | UnitClass | undefined
): number {
  string = string.trim();
  if (string[0] === ".") {
    string = "0" + string;
  }

  if (typeof baseUnit === "string") {
    const base = Unit.getUnit(baseUnit);

    if (base === undefined && baseUnit !== "none") {
      console.warn("Unknown unit " + baseUnit);
      return NaN;
    }

    baseUnit = base;
  }

  //unannotated string?
  if (isnumber(string)) {
    //assume base unit
    const f = parseFloat(string);

    return f;
  }

  if (baseUnit === undefined) {
    console.warn("No base unit in units.js:parseValueIntern");
  }

  for (const unit of Units) {
    const def = unit.unitDefine();

    if (unit.validate(string)) {
      console.log(unit);
      let value = unit.parse(string);

      if (baseUnit) {
        value = unit.toInternal(value);
        return baseUnit.fromInternal(value);
      } else {
        return value;
      }
    }
  }

  return NaN;
}

/* if displayUnit is undefined, final value will be converted from displayUnit to baseUnit */
export function parseValue(
  string: string,
  baseUnit?: string | undefined,
  displayUnit?: string | undefined
): number {
  const displayUnitCls = Unit.getUnit(displayUnit);
  const baseUnitCls = Unit.getUnit(baseUnit);

  let f = parseValueIntern(string, displayUnitCls || baseUnitCls);

  if (displayUnitCls) {
    f = displayUnitCls.toInternal(f);
  }

  if (baseUnitCls) {
    f = baseUnitCls.fromInternal(f);
  }

  return f;
}

export function isNumber(string: string): boolean {
  if (isnumber(string)) {
    return true;
  }

  for (const unit of Units) {
    const def = unit.unitDefine();

    if (unit.validate(string)) {
      return true;
    }
  }

  return false;
}

export class PixelUnit extends Unit {
  static unitDefine(): UnitDefinition {
    return {
      name   : "pixel",
      uiname : "Pixel",
      type   : "distance",
      icon   : -1,
      pattern: /-?\d+(\.\d*)?px$/,
    };
  }

  static parse(string: string): number {
    string = normString(string);
    if (string.endsWith("px")) {
      string = string.slice(0, string.length - 2).trim();
    }

    return parseFloat(string);
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value: number): number {
    return value;
  }

  static fromInternal(value: number): number {
    return value;
  }

  static buildString(value: number, decimals: number = 2): string {
    return "" + myToFixed(value, decimals) + "px";
  }
}

Unit.register(PixelUnit);

export class PercentUnit extends Unit {
  static unitDefine(): UnitDefinition {
    return {
      name   : "percent",
      uiname : "Percent",
      type   : "distance",
      icon   : -1,
      pattern: /[0-9]+(\.[0-9]+)?[ \t]*%/,
    };
  }

  static toInternal(value: number): number {
    return value / 100.0;
  }

  static fromInternal(value: number): number {
    return value * 100.0;
  }

  static parse(string: string): number {
    return parseFloat(string.replace(/%/g, ""));
  }

  static buildString(value: number, decimals: number = 2): string {
    return value.toFixed(decimals) + "%";
  }
}

Unit.register(PercentUnit);

export function convert(
  value: number,
  unita: string | UnitClass | undefined,
  unitb: string | UnitClass | undefined
): number {
  /* Note: getUnit throws on invalid units *except* for
   *       'none' where it returns undefined.
   */

  if (typeof unita === "string") {
    unita = Unit.getUnit(unita);
  }

  if (typeof unitb === "string") {
    unitb = Unit.getUnit(unitb);
  }

  if (unita && unitb) {
    return unitb.fromInternal(unita.toInternal(value));
  } else if (unitb) {
    return unitb.fromInternal(value); /* unita was 'none' */
  } else if (unita) {
    return unita.toInternal(value);
  } else {
    return value;
  }
}

(window as unknown as Record<string, unknown>).unitConvert = convert;

/**
 *
 * @param value Value (note: is not converted to internal unit)
 * @param unit: Unit to use, should be a string referencing unit type, see unitDefine().name
 * @returns {*}
 */
export function buildString(
  value: number,
  baseUnit: string | UnitClass | undefined = Unit.baseUnit,
  decimalPlaces: number = 3,
  displayUnit: string | UnitClass | undefined = Unit.baseUnit
): string {
  if (typeof baseUnit === "string" && baseUnit !== "none") {
    baseUnit = Unit.getUnit(baseUnit);
  }
  if (typeof displayUnit === "string" && displayUnit !== "none") {
    displayUnit = Unit.getUnit(displayUnit);
  }

  if (displayUnit !== baseUnit) {
    value = convert(value, baseUnit, displayUnit);
  }

  if (displayUnit && typeof displayUnit !== "string") {
    return displayUnit.buildString(value, decimalPlaces);
  } else {
    return myToFixed(value, decimalPlaces);
  }
}

(window as unknown as Record<string, unknown>)._parseValueTest = parseValue;
(window as unknown as Record<string, unknown>)._buildStringTest = buildString;
