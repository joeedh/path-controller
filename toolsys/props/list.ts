import { PropTypes, PropFlags } from "../toolprop_abstract";
import nstructjs from "../../util/struct";
import { ToolProperty, PropClasses, type ToolPropertyConstructor } from "./base";

/**
 * List of other tool props (all of one type)
 */
export class ListProperty<ToolPropType extends ToolProperty = ToolProperty> //
  extends ToolProperty<ToolPropType[], PropTypes["PROPLIST"]>
{
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
toolprop.ListProperty {
  prop  : abstract(ToolProperty);
  value : array(abstract(ToolProperty));
}`
  );
  static PROP_TYPE_ID = PropTypes.PROPLIST;

  prop: ToolPropType;
  value: ToolPropType[];

  /*
   * Prop must be a ToolProperty subclass instance
   * */
  constructor(
    prop?: ToolProperty<unknown> | number | ToolPropertyConstructor,
    list: unknown[] = [],
    uiname: string = ""
  ) {
    super(PropTypes.PROPLIST);

    this.uiname = uiname;
    this.flag &= ~PropFlags.SAVE_LAST_VALUE;

    if (typeof prop == "number") {
      const cls = PropClasses[prop];

      if (cls !== undefined) {
        prop = new (cls as any)();
      }
    } else if (prop !== undefined) {
      if (prop instanceof ToolProperty) {
        prop = prop.copy();
      } else {
        prop = new (prop as any)();
      }
    }

    this.prop = prop as ToolPropType;
    this.value = [];

    if (list) {
      for (const val of list) {
        this.push(val as ToolPropType | undefined);
      }
    }

    this.wasSet = false;
  }

  get length(): number {
    return this.value.length;
  }

  set length(val: number) {
    this.value.length = val;
  }

  splice(i: number, deleteCount: number, ...newItems: ToolPropType[]): ToolPropType[] {
    const deletedItems = this.value.splice(i, deleteCount, ...newItems);
    this.length = this.value.length;
    return deletedItems;
  }

  calcMemSize(): number {
    let tot = super.calcMemSize();

    let psize = this.prop ? this.prop.calcMemSize() + 8 : 8;
    if (!this.prop && this.value.length > 0) {
      psize = this.value[0].calcMemSize();
    }

    tot += psize * this.value.length + 8;
    tot += 16;

    return tot;
  }

  equals(b: this): boolean {
    const lb = b;
    const l1 = this.value ? this.value.length : 0;
    const l2 = lb.value ? lb.value.length : 0;

    if (l1 !== l2) {
      return false;
    }

    for (let i = 0; i < l1; i++) {
      const prop1 = this.value[i];
      const prop2 = lb.value[i];

      let bad = prop1.constructor !== prop2.constructor;
      bad = bad || !prop1.equals(prop2);

      if (bad) {
        return false;
      }
    }

    return true;
  }

  copyTo(b: this): void {
    super.copyTo(b);

    const lb = b as ListProperty<ToolPropType>;
    lb.prop = this.prop.copy() as ToolPropType;
    lb.value = [];

    for (const prop of this.value) {
      lb.value.push(prop.copy() as ToolPropType);
    }
  }

  copy(): this {
    const ret = new ListProperty<ToolPropType>(this.prop.copy() as ToolPropType);
    this.copyTo(ret as unknown as this);
    return ret as unknown as this;
  }

  push(item?: ToolPropType | unknown): ToolPropType {
    if (item === undefined) {
      item = this.prop.copy();
    }

    if (!(item instanceof ToolProperty)) {
      const prop = this.prop.copy() as ToolPropType;
      prop.setValue(item);
      item = prop;
    }

    this.value.push(item as ToolPropType);
    return item as ToolPropType;
  }

  clear(): this {
    this.value.length = 0;
    return this;
  }

  getListItem(i: number): unknown {
    if (i < 0) {
      i += this.length;
    }
    return this.value[i].getValue();
  }

  setListItem(i: number, val: unknown): void {
    if (i < 0) {
      i += this.length;
    }
    this.value[i].setValue(val);
  }

  setValue(value?: Iterable<unknown>): void {
    this.clear();

    for (const item of value!) {
      const prop = this.push();

      if (typeof item !== "object") {
        prop.setValue(item);
      } else if (item instanceof prop.constructor) {
        (item as ToolPropType).copyTo(prop);
      } else {
        this.report(item);
        throw new Error("invalid value " + item);
      }
    }

    super.setValue(value as ToolPropType[] | undefined);
  }

  getValue(): ToolPropType[] {
    return this.value;
  }

  [Symbol.iterator](): IterableIterator<ReturnType<ToolPropType["getValue"]>> {
    const list = this.value;

    return (function* () {
      for (const item of list) {
        yield item.getValue();
      }
    })() as unknown as IterableIterator<ReturnType<ToolPropType["getValue"]>>;
  }
}

ToolProperty.internalRegister(ListProperty);
