import { CurveConstructors } from "./curve1d_base";
import { EnumProperty } from "../toolsys/toolprop";

export function makeGenEnum(): EnumProperty {
  const enumdef: Record<string, string> = {};
  const uinames: Record<string, string> = {};
  const icons: Record<string, number> = {};

  for (const cls of CurveConstructors) {
    const def = cls.define();

    let uiname = def.uiname;
    uiname = uiname === undefined ? def.name : uiname;

    enumdef[def.name] = def.typeName;
    uinames[def.name] = uiname;
    icons[def.name] = def.icon !== undefined ? def.icon : -1;
  }

  //return enumdef;
  return new EnumProperty(undefined, enumdef as unknown as Record<string, number>).addUINames(uinames).addIcons(icons);
}
