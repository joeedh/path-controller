import {Context, ContextOverlay, ContextFlags} from "../../scripts/context.js";
import {Area} from "../../scripts/ScreenArea.js";
import {WorkspaceEditor} from "../editors/workspace/workspace.js";
import {Editor} from "../editors/editor_base.js";

export class BaseOverlay extends ContextOverlay {
  static contextDefine() {return {
    name : "view",
    flag : ContextFlags.IS_VIEW
  }}

  get toolstack() {
    return this.state.toolstack;
  }

  get api() {
    return this.state.api;
  }

  get data() {
    return this.state.data;
  }

  get canvas() {
    return this.data.canvas;
  }
}
Context.register(BaseOverlay);

export class ViewOverlay extends ContextOverlay {
  static contextDefine() {return {
    name : "view",
    flag : ContextFlags.IS_VIEW
  }}

  get screen() {
    return this.state.screen;
  }

  get editor() {
    return Area.getActiveArea();
  }

  get workspace() {
    return Area.getActiveArea(WorkspaceEditor);
  }
}

export class ContextBase extends Context {
  saveProperty(k) {
    let v = this[k];

    if (v instanceof Editor) {
      return ["Editor", k, v._area_id];
    }

    return ["object", k];
  }

  loadProperty(ctx, key, data) {
    if (data[0] === "object") {
      return ctx[data[1]];
    } else if (data[0] === "Editor") {
      for (let sarea of ctx.screen.sareas) {
        if (sarea.area._area_id === data[2]) {
          return sarea.area;
        }
        for (let area of sarea.editors) {
          if (area._area_id === data[2]) {
            return area;
          }
        }
      }

      //fallback
      console.log("Failed to find editor", data, data[2]);
      return ctx[data[1]];
    }
  }
}

export class ToolContext extends ContextBase {
  constructor(appstate) {
    super(appstate);

    this.reset();
  }

  reset() {
    this.pushOverlay(new BaseOverlay(this.state));
  }
}

export class ViewContext extends ContextBase {
  constructor(appstate) {
    super(appstate);

    this.reset();
  }

  reset() {
    this.pushOverlay(new BaseOverlay(this.state));
    this.pushOverlay(new ViewOverlay(this.state));
  }
}