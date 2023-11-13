import {Curve1D} from './curve1d.js';
import {ToolProperty, PropTypes, PropFlags} from '../toolsys/toolprop.js';
import * as nstructjs from '../util/nstructjs_es6.js';

export class Curve1DProperty extends ToolProperty {
  constructor(curve, apiname, uiname, description, flag, icon) {
    super(PropTypes.CURVE, undefined, apiname, uiname, description, flag, icon);

    this.data = new Curve1D();

    if (curve !== undefined) {
      this.setValue(curve);
    }

    this.wasSet = false;
  }

  calcMemSize() {
    //bleh, just return a largish block size
    return 1024;
  }

  equals(b) {

  }

  getValue() {
    return this.data;
  }

  evaluate(t) {
    return this.data.evaluate(t);
  }

  setValue(curve) {
    if (curve === undefined) {
      return;
    }

    this.data.load(curve);
    super.setValue(curve);
  }

  copyTo(b) {
    super.copyTo(b);

    b.setValue(this.data);
  }
}

Curve1DProperty.STRUCT = nstructjs.inherit(Curve1DProperty, ToolProperty) + `
  data : Curve1D;
}
`;

nstructjs.register(Curve1DProperty);
ToolProperty.internalRegister(Curve1DProperty);

