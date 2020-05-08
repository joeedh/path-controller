import * as pathux from '../../scripts/pathux.js';
window.pathux = pathux;

import {nstructjs, ToolStack, UIBase, setIconManager, setIconMap,
        setTheme, IconManager, keymap, ScreenArea, util,
        HotKey, KeyMap, Screen, DataPathSetOp} from "../../scripts/pathux.js";

import {ModelData} from "./state.js";
import {defineAPI} from "../api/api_define.js"
import {ToolContext, ViewContext} from "./context.js";

import {WorkspaceEditor} from '../editors/workspace/workspace.js';
import {AppScreen} from "../editors/screen.js";
import cconst from "./const.js";
//import * as util from '../util/util.js';
import './toolop.js';

import {theme} from '../theme.js';
setTheme(theme);

import {Icons} from "../editors/icon_enum.js";
setIconMap(Icons);
import {MenuBarEditor} from "../editors/menu/menu.js";
import cconst1 from './const.js';
import cconst2 from '../../scripts/const.js';
//import {HotKey, KeyMap} from "../../scripts/simple_events.js";
import {PropsEditor} from "../editors/properties/properties.js";
import {LogEditor} from "../editors/log/log_editor.js";

cconst2.loadConstants(cconst1);

let iconmanager = new IconManager([
  document.getElementById("iconsheet16"),
  document.getElementById("iconsheet32"),
  document.getElementById("iconsheet48")
], [16, 32, 48], 16);

setIconManager(iconmanager);

/*
let dopExecPost = DataPathSetOp.prototype.execPost;
DataPathSetOp.prototype.execPost = function() {
  dopExecPost.call(this, ...arguments);
  window.redraw_all_full();
};

let dopUndo = DataPathSetOp.prototype.undo;
DataPathSetOp.prototype.undo = function() {
  dopUndo.call(this, ...arguments);
  window.redraw_all_full();
};
//*/

export class AppState {
  constructor() {
    this.toolstack = new ToolStack();
    this.data = new ModelData();
    this.api = defineAPI();
    this.viewctx = new ViewContext(this);
    this.toolctx = new ToolContext(this);

    this.toolstack.setRestrictedToolContext(this.toolctx);

    //make global to viewctx--for debugging purposes only!!!
    window.CTX = this.viewctx;

    this.screen = undefined;
  }

  genScreen() {
    let screen = this.screen = document.createElement("app-screen-x");
    screen.ctx = this.viewctx;

    if (cconst.DEBUG.customWindowSize) {
      screen.size[0] = cconst.DEBUG.customWindowSize.width;
      screen.size[1] = cconst.DEBUG.customWindowSize.height;
    }


    let sarea = this.screen.newScreenArea();
    sarea.switch_editor(WorkspaceEditor);

    screen.add(sarea);

    let t = 300 / window.innerWidth;

    let wsarea = screen.splitArea(sarea, 0.1, true);

    sarea.switchEditor(MenuBarEditor);

    let sarea2 = screen.splitArea(wsarea, 0.7, true);
    sarea2.switchEditor(PropsEditor);
    //*
    
    if (!util.isMobile) {
      screen.splitArea(wsarea, 0.5, false);
      screen.splitArea(sarea2, 0.5, false);

      screen.splitArea(wsarea, 0.5, true);
      screen.splitArea(sarea2, 0.5, true);
    }
//*/

    //screen.splitArea(sarea2, 0.55, false);
    //sarea2 = screen.splitArea(sarea, 1.0-t, false);
    //sarea2.switch_editor(SideBarEditor);
    //setTimeout(() => {
    //  screen.splitArea(sarea2, 0.55, true);
    //}, 500);

    screen.solveAreaConstraints();
    screen.regenBorders();

    screen.update();
    screen.setCSS();
    return screen;
  }

  createFile(args={writeScreen : true, writeData : true}) {
    let data = [];

    let buf = new ArrayBuffer(8);
    let f32 = new Float32Array(buf);
    let i32 = new Int32Array(buf);
    let u8 = new Uint8Array(buf);

    function packint(i) {
      i32[0] = i;
      for (let i=0; i<4; i++) {
        data.push(u8[i]);
      }
    }

    function writestr(s) {
      for (let i=0; i<s.length; i++) {
        data.push(s.charCodeAt(i));
      }
    }

    function packfloat(i) {
      f32[0] = i;
      for (let i=0; i<4; i++) {
        data.push(u8[i]);
      }
    }

    function writeblock(type, block) {
      writestr(type);
      packint(block.length);

      for (let i=0; i<block.length; i++) {
        data.push(block[i]);
      }
    }

    writestr("STRC");

    packfloat(cconst.VERSION);

    let str = nstructjs.write_scripts();
    packint(str.length);
    writestr(str);

    if (args.writeScreen) {
      let data2 = [];

      nstructjs.manager.write_object(data2, this.screen);
      writeblock("SCRN", data2);
    }

    if (args.writeData) {
      let data2 = [];

      nstructjs.manager.write_object(data2, this.data);
      writeblock("DATA", data2);
    }

    return data;
  }

  loadFile(data, args={resetToolStack : true, loadScreen : true}) {
    args.loadScreen = args.loadScreen === undefined ? true : args.loadScreen;
    args.resetToolStack = args.resetToolStack === undefined ? true : args.resetToolStack;

    if (data instanceof Array) {
      data = new DataView(new Uint8Array(data).buffer);
    } else if (data instanceof Uint8Array) {
      data = new DataView(data.buffer);
    } else if (data instanceof ArrayBuffer) {
      data = new DataView(data);
    }

    let _i = 0;
    let endian = true;
    function readfour() {
      let s = String.fromCharCode(data.getUint8(_i++));
      s += String.fromCharCode(data.getUint8(_i++));
      s += String.fromCharCode(data.getUint8(_i++));
      s += String.fromCharCode(data.getUint8(_i++));

      return s;
    }

    function readint() {
      _i += 4;
      return data.getInt32(_i-4, endian);
    }

    function readfloat() {
      _i += 4;
      return data.getFloat32(_i-4, endian);
    }

    function readstring() {
      let len = readint();

      if (len > 1024*1024) {
        throw new Error("file corruption error");
      }

      let ret = "";
      for (let i=0; i<len; i++) {
        ret += String.fromCharCode(data.getUint8(_i++));
      }
      return ret;
    }

    let magic = readfour();

    if (magic !== "STRC") {
      throw new Error("File corruption");
    }

    let version = readfloat();
    let structs = readstring();

    let screen, appdata;

    let rstruct = new nstructjs.STRUCT();
    rstruct.parse_structs(structs);

    while (_i < data.buffer.byteLength) {
      let type = readfour()
      let len = readint();

      let data2 = new DataView(data.buffer.slice(_i, _i+len));

      _i += len;
      if (type === "SCRN") {
        screen = rstruct.read_object(data2, AppScreen);
      } else if (type === "DATA") {
        appdata = rstruct.read_object(data2, ModelData);
      } else {
        console.log("Unknown data type", type);
      }

    }

    this.toolctx.reset();
    this.viewctx.reset();

    console.log(appdata);
    this.data = appdata;

    if (screen && args.loadScreen) {
      screen.ctx = this.viewctx;

      this.screen.unlisten();
      this.screen.remove();

      this.screen = screen;

      document.body.appendChild(screen);

      screen._init();
      screen.listen();
      screen.update();
      screen.setCSS();

      let size = cconst.customWindowSize ? cconst.customWindowSize : [window.innerWidth, window.innerHeight];
      screen.on_resize(screen.size, size);
    }

    if (args.resetToolStack) {
      this.toolstack.reset();
    }

    for (let sarea of screen.sareas) {
      for (let area of sarea.editors) {
        area.on_fileload(area === sarea.area);
      }
    }
  }

  createUndoFile() {
    return this.createFile({writeScreen: false});
  }

  loadUndoFile(data) {
    this.loadFile(data, {resetToolStack : false, loadScreen : false});
  }

  clearLocalStorage() {
    delete localStorage[cconst.LOCALSTORAGE_KEY];
  }

  saveLocalStorage() {
    let file = this.createFile();
    file = util.btoa(file);

    localStorage[cconst.LOCALSTORAGE_KEY] = file;
  }

  loadLocalStorage() {
    if (cconst.LOCALSTORAGE_KEY in localStorage) {
      let buf = localStorage[cconst.LOCALSTORAGE_KEY];
      buf = new DataView(util.atob(buf).buffer);

      return this.loadFile(buf);
      try {
        this.loadFile(buf);
      } catch (error) {
        util.print_stack(error);
        console.warn("Failed to load startup file");
      }
    }
  }

  start() {
    this.genScreen();
    let screen = this.screen;

    document.body.appendChild(screen);
    screen.update();
    screen.listen();
  }
}

export function start() {
  window._appstate = new AppState();

  let animreq;
  let f = () => {
    animreq = undefined;

    let screen = _appstate.screen;
    for (let sarea of screen.sareas) {
      if (sarea.draw) {
        sarea.draw();
      }
    }
  };

  window.redraw_all = () => {
    if (animreq) { //wait for pending draw to finish
      return;
    }

    animreq = requestAnimationFrame(f);
  };

  window.redraw_all_full = () => {
    if (!_appstate || !_appstate.screen)
      return;

    let screen = _appstate.screen;

    for (let sarea of screen.sareas) {
      if (sarea.area && (sarea.area instanceof WorkspaceEditor)) {
        sarea.area.tagFullDraw();
      }
    }
    window.redraw_all();
  };

  _appstate.start();
  _appstate.loadLocalStorage();
}
