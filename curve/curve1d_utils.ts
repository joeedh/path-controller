import { CurveConstructors } from "./curve1d_base";
import { EnumProperty } from "../toolsys/toolprop";

export function makeGenEnum(): EnumProperty {
  let enumdef: Record<string, string> = {};
  let uinames: Record<string, string> = {};
  let icons: Record<string, number> = {};

  for (let cls of CurveConstructors) {
    let def = cls.define();

    let uiname = def.uiname;
    uiname = uiname === undefined ? def.name : uiname;

    enumdef[def.name] = cls.name;
    uinames[def.name] = uiname;
    icons[def.name] = def.icon !== undefined ? def.icon : -1;
  }

  //return enumdef;
  return new EnumProperty(undefined, enumdef as unknown as Record<string, number>).addUINames(uinames).addIcons(icons);
}
