import * as util from './util.js';
import * as ui from './ui.js';
import * as ui_base from './ui_base.js';
import {Icons, css2color, color2css} from './ui_base.js';

let UIBase = ui_base.UIBase;

export class Note extends ui_base.UIBase {
  constructor() {
    super();

    let style = document.createElement("style");

    this._noteid = undefined;
    this.height = 20;

    style.textContent = `
    .notex {
      display : flex;
      flex-direction : row;
      flex-wrap : nowrap;
      height : {this.height}px;
      padding : 0px;
      margin : 0px;
    }
    `;

    this.dom = document.createElement("div");
    this.dom.setAttribute("class", "notex");
    this.color = "red";

    this.shadow.appendChild(style);
    this.shadow.append(this.dom);
    this.setLabel("");
  }

  setLabel(s) {
    let color = this.color;
    if (this.mark === undefined) {
      this.mark = document.createElement("div");
      this.mark.style["display"] = "flex";
      this.mark.style["flex-direction"] = "row";
      this.mark.style["flex-wrap"] = "nowrap";

      //this.mark.style["width"]
      let sheet = 0;

      let size = ui_base.iconmanager.getTileSize(sheet);

      this.mark.style["width"] = "" + size + "px";
      this.mark.style["height"] = "" + size + "px";

      this.dom.appendChild(this.mark);

      this.ntext = document.createElement("div");
      this.ntext.style["display"] = "inline-flex";
      this.ntext.style["flex-wrap"] = "nowrap";

      this.dom.appendChild(this.ntext);

      ui_base.iconmanager.setCSS(Icons.NOTE_EXCL, this.mark, sheet);

      //this.mark.style["margin"] = this.ntext.style["margin"] = "0px"
      //this.mark.style["padding"] = this.ntext.style["padding"] = "0px"
      //this.mark.style["background-color"] = color;
    }

    let mark = this.mark, ntext = this.ntext;
    //mark.innerText = "!";
    ntext.innerText = " " + s;
  }

  init() {
    super.init();

    this.setAttribute("class", "notex");

    this.style["display"] = "flex";
    this.style["flex-wrap"] = "nowrap";
    this.style["flex-direction"] = "row";
    this.style["border-radius"] = "7px";
    this.style["padding"] = "2px";

    this.style["color"] = ui_base.getDefault("NoteText").color;
    let clr = css2color(this.color);
    clr = color2css([clr[0], clr[1], clr[2], 0.25]);

    this.style["background-color"] = clr;
    this.setCSS();
  }

  static define() {return {
    tagname : "note-x"
  }}
}
UIBase.register(Note);

export class ProgBarNote extends Note {
  constructor() {
    super();

    this._percent = 0.0;
    this.barWidth = 100;

    let bar = this.bar = document.createElement("div");
    bar.style["display"] = "flex";
    bar.style["flex-direction"] = "row";
    bar.style["width"] = this.barWidth + "px";
    bar.style["height"] = this.height + "px";
    bar.style["background-color"] = this.getDefault("ProgressBarBG");
    bar.style["border-radius"] = "12px";
    bar.style["align-items"] = "center";
    bar.style["padding"] = bar.style["margin"] = "0px";

    let bar2 = this.bar2 = document.createElement("div");
    let w = 50.0;

    bar2.style["display"] = "flex";
    bar2.style["flex-direction"] = "row";
    bar2.style["height"] = this.height + "px";
    bar2.style["background-color"] = this.getDefault("ProgressBar");
    bar2.style["border-radius"] = "12px";
    bar2.style["align-items"] = "center";
    bar2.style["padding"] = bar2.style["margin"] = "0px";

    this.bar.appendChild(bar2);
    this.dom.appendChild(this.bar);
  }

  setCSS() {
    super.setCSS();

    let w = ~~(this.percent * this.barWidth + 0.5);

    this.bar2.style["width"] = w + "px";
  }

  set percent(val) {
    this._percent = val;
    this.setCSS();
  }

  get percent() {
    return this._percent;
  }

  init() {
    super.init();
  }

  static define() {return {
    tagname : "note-progress-x"
  }}
}
UIBase.register(ProgBarNote);

export class NoteFrame extends ui.RowFrame {
  constructor() {
    super();
    this._h = 20;
  }

  init() {
    super.init();

    this.noMarginsOrPadding();

    noteframes.push(this);
    this.background = ui_base.getDefault("NoteBG");
  }

  setCSS() {
    super.setCSS();

    this.style["width"] = "min-contents";
    this.style["height"] = this._h + "px";
  }

  _ondestroy() {
    if (noteframes.indexOf(this) >= 0) {
      noteframes.remove(this)
    }

    super._ondestroy();
  }

  progbarNote(msg, percent, color="rgba(255,0,0,0.2)", timeout=700, id=msg) {
    let note;

    for (let child of this.children) {
      if (child._noteid === id) {
        note = child;
        break;
      }
    }

    let f = (100.0*Math.min(percent, 1.0)).toFixed(1);

    if (note === undefined) {
      note = this.addNote(msg, color, -1, "note-progress-x");
      note._noteid = id;
    }

    //note.setLabel(msg + " " + f + "%");
    note.percent = percent;

    if (percent >= 1.0) {
      //note.setLabel(msg + " " + f + "%");

      window.setTimeout(() => {
        note.remove();
      }, timeout);
    }

    return note;
  }

  addNote(msg, color="rgba(255,0,0,0.2)", timeout=1200, tagname="note-x") {
    //let note = document.createElement("note-x");

    //note.ctx = this.ctx;
    //note.background = "red";
    //note.dom.innerText = msg;

    //this._add(note);

    let note = document.createElement(tagname);

    note.color = color;
    note.setLabel(msg);

    note.style["text-align"] = "center";

    note.style["font"] = ui_base.getFont(note, "NoteText");
    note.style["color"] = this.getDefault("NoteText").color;

    this.add(note);

    this.noMarginsOrPadding();
    note.noMarginsOrPadding();

    //this.dom.style["position"] = "absolute";
    //this.style["position"] = "absolute";
    //note.style["position"] = "absolute";

    note.style["height"] = this._h + "px";
    note.height = this._h;


    if (timeout != -1) {
      window.setTimeout(() => {
        console.log("remove!");
        note.remove();
      }, timeout);
    }

    //this.appendChild(note);
    return note;

  }

  static define() {return {
    tagname : "noteframe-x"
  }}
}
UIBase.register(NoteFrame);

export function getNoteFrames(screen) {
  let ret = [];

  let rec = (n) => {

    if (n instanceof NoteFrame) {
      ret.push(n);
    }

    if (n.childNodes !== undefined) {
      for (let node of n.childNodes) {
        rec(node);
      }
    }

    if (n instanceof ui_base.UIBase && n.shadow !== undefined && n.shadow.childNodes) {
      for (let node of n.shadow.childNodes) {
        rec(node);
      }
    }
  }

  rec(screen);
  return ret;
}

export let noteframes = [];

export function progbarNote(screen, msg, percent, color, timeout) {
  noteframes = getNoteFrames(screen);

  for (let frame of noteframes) {
    try {
      frame.progbarNote(msg, percent, color, timeout);
    } catch (error) {
      print_stack(error);
      console.log("bad notification frame");
    }
  }
}

export function sendNote(screen, msg, color, timeout=1000) {
  noteframes = getNoteFrames(screen);

  console.log(noteframes.length);

  for (let frame of noteframes) {
    console.log(frame);

    try {
      frame.addNote(msg, color, timeout);
    } catch (error) {
      print_stack(error);
      console.log("bad notification frame");
    }
  }
}

window._sendNote = sendNote;

export function warning(screen, msg, timeout=1000) {
  return sendNote(screen, msg, ui_base.color2css([1.0, 0.0, 0.0, 1.0]), timeout);
}
