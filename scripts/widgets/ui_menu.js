"use strict";

import * as util from '../util/util.js';
import cconst from '../config/const.js';
import * as vectormath from '../util/vectormath.js';
import * as ui_base from '../core/ui_base.js';
import * as events from '../util/events.js';
import * as simple_toolsys from '../toolsys/simple_toolsys.js';
import * as toolprop from '../toolsys/toolprop.js';
import {Button} from "./ui_widgets.js";
import {DomEventTypes} from '../util/events.js';

import {keymap} from '../util/simple_events.js';

let EnumProperty = toolprop.EnumProperty,
  PropTypes = toolprop.PropTypes;

let UIBase = ui_base.UIBase,
  PackFlags = ui_base.PackFlags,
  IconSheets = ui_base.IconSheets;

function getpx(css) {
  return parseFloat(css.trim().replace("px", ""))
}

export class Menu extends UIBase {
  constructor() {
    super();

    this.items = [];

    this._ignoreFocusEvents = false;
    this.closeOnMouseUp = true;

    this.itemindex = 0;
    this.closed = false;
    this.started = false;
    this.activeItem = undefined;

    this.overrideDefault("DefaultText", this.getDefault("MenuText"));

    //we have to make a container for any submenus to
    this.container = document.createElement("span");
    this.container.style["display"] = "flex";
    this.container.style["color"] = this.getDefault("MenuText").color;

    //this.container.style["background-color"] = "red";
    this.container.setAttribute("class", "menucon");

    this.dom = document.createElement("ul");
    this.dom.setAttribute("class", "menu");
    /*
              place-items: start start;
              flex-wrap : nowrap;
              align-content : start;
              place-content : start;
              justify-content : start;

              align-items : start;
              place-items : start;
              justify-items : start;
    */

    let pad1 = util.isMobile() ? 15 : 0;

    let style = document.createElement("style");
    style.textContent = `
        .menucon {
          position:absolute;
          float:left;
          
          display: block;
          -moz-user-focus: normal;
        }
        
        ul.menu {
          display        : flex;
          flex-direction : column;
          
          margin : 0px;
          padding : 0px;
          border : ${this.getDefault("MenuBorder")};
          -moz-user-focus: normal;
          background-color: ${this.getDefault("MenuBG")};
        }
        
        .menuitem {
          display : block;
          
          list-style-type:none;
          -moz-user-focus: normal;
          
          margin : 0;
          padding : 0px;
          padding-right: 16px;
          padding-left: 16px;
          padding-top : ${pad1}px;
          padding-bottom : ${pad1}px;
          font : ${this.getDefault("MenuText").genCSS()};
          background-color: ${this.getDefault("MenuBG")};
        }
        
        .menuseparator {
          ${this.getDefault("MenuSeparator")}
        }
        
        .menuitem:focus {
          border : none;
          outline : none;
          
          background-color: ${this.getDefault("MenuHighlight")};
          -moz-user-focus: normal;
        }
      `;

    /*

        .menuitem:focus {
        }



    */
    this.dom.setAttribute("tabindex", -1);

    //let's have the menu wrangler handle key events

    this.container.addEventListener("mouseleave", (e) => {
      console.log("menu out");
      this.close();
    }, false);

    //this.container.appendChild(this.dom);

    this.shadow.appendChild(style);
    this.shadow.appendChild(this.container);
  }

  float(x, y, zindex=undefined) {
    console.log("menu test!");

    let dpi = this.getDPI();
    let rect = this.dom.getClientRects();
    let maxx = this.getWinWidth()-10;
    let maxy = this.getWinHeight()-10;

    console.log(rect.length > 0 ? rect[0] : undefined)

    if (rect.length > 0) {
      rect = rect[0];
      console.log(y + rect.height);
      if (y + rect.height > maxy) {
        console.log("greater");
        y = maxy - rect.height - 1;
      }

      if (x + rect.width > maxx) {
        console.log("greater");
        x = maxx - rect.width - 1;
      }
    }

    super.float(x, y, 50);
  }

  click() {
    if (this.activeItem == undefined)
      return;

    if (this.activeItem !== undefined && this.activeItem._isMenu)
    //ignore
      return;

    if (this.onselect) {
      try {
        console.log(this.activeItem._id, "-----");
        this.onselect(this.activeItem._id);
      } catch (error) {
        util.print_stack(error);
        console.log("Error in menu callback");
      }
    }

    console.log("menu select");
    this.close();
  }

  _ondestroy() {
    if (this.started) {
      menuWrangler.popMenu(this);

      if (this.onclose) {
        this.onclose();
      }
    }
  }

  close() {
    //XXX
    //return;
    if (this.closed) {
      return;
    }

    this.closed = true;

    if (this.started) {
      menuWrangler.popMenu(this);
    }

    this.started = false;

    //if (this._popup.parentNode !== undefined) {
    //  this._popup.remove();
    //}
    if (this._popup) {
      this._popup.end();
      this._popup = undefined;
    }

    this.remove();
    this.dom.remove();

    if (this.onclose) {
      this.onclose(this);
    }
  }

  _select(dir, focus=true) {
    if (this.activeItem === undefined) {
      for (let item of this.items) {
        if (!item.hidden) {
          this.setActive(item, focus);
          break;
        }
      }
    } else {
      let i = this.items.indexOf(this.activeItem);
      let item = this.activeItem;

      do {
        i = (i + dir + this.items.length) % this.items.length;
        item = this.items[i];

        if (!item.hidden) {
          break;
        }
      } while (item !== this.activeItem);

      this.setActive(item, focus); 
    }

    if (this.hasSearchBox) {
      this.activeItem.scrollIntoView();
    }
  }

  selectPrev(focus=true) {
    return this._select(-1, focus);
  }

  selectNext(focus=true) {
    return this._select(1, focus);
  }

  static define() {return {
    tagname : "menu-x",
    style   : "menu"
  };}

  start_fancy(prepend, setActive=true) {
    return this.startFancy(prepend, setActive);
  }

  setActive(item, focus=true) {
    if (this.activeItem === item) {
      return;
    }

    if (this.activeItem) {
      this.activeItem.style["background-color"] = this.getDefault("MenuBG");

      if (focus) {
        this.activeItem.blur();
      }
    }

    if (item) {
      item.style["background-color"] = this.getDefault("MenuHighlight");

      if (focus) {
        item.focus();
      }
    }
    
    this.activeItem = item;
  }

  startFancy(prepend, setActive=true) {
    console.warn("menu searchbox mode start");

    this.hasSearchBox = true;
    this.started = true;
    menuWrangler.pushMenu(this);

    let dom2 = document.createElement("div");
    //let dom2 = document.createElement("div");

    this.dom.setAttribute("class", "menu");
    dom2.setAttribute("class", "menu");

    let sbox = this.textbox = document.createElement("textbox-x");
    this.textbox.parentWidget = this;
    
    dom2.appendChild(sbox);
    dom2.appendChild(this.dom);
    
    dom2.style["height"] = "300px";
    this.dom.style["height"] = "300px";
    this.dom.style["overflow"] = "scroll";

    if (prepend) {
      this.container.prepend(dom2);
    } else {
      this.container.appendChild(dom2);
    }

    dom2.parentWidget = this.container;

    sbox.focus();
    sbox.onchange = () => {
      let t = sbox.text.trim().toLowerCase();

      console.log("applying search", t);

      for (let item of this.items) {
        item.hidden = true;
        item.remove();
      }

      for (let item of this.items) {
        let ok = t == "";
        ok = ok || item.innerHTML.toLowerCase().search(t) >= 0;

        if (ok) {
          item.hidden = false;
          this.dom.appendChild(item);
        } else if (item === this.activeItem) {
          this.selectNext(false);
        }
        //item.hidden = !ok;
      }
    }

    sbox.addEventListener("keydown", (e) => {
      console.log(e.keyCode);
      switch (e.keyCode) {
        case 27: //escape key
          this.close();
          break;
        case 13: //enter key
          this.click(this.activeItem);
          this.close();
          break;
      }
    });
  }

  start(prepend=false, setActive=true) {
    this.started = true;
    this.focus();
    menuWrangler.pushMenu(this);

    if (this.items.length > 15) {
      return this.start_fancy(prepend, setActive);
    }

    if (prepend) {
      this.container.prepend(this.dom);
    } else {
      this.container.appendChild(this.dom);
    }

    if (!setActive)
      return;

    window.setTimeout(() => {
      //select first child
      //TODO: cache last child entry

      if (this.activeItem === undefined) {
        this.activeItem = this.dom.childNodes[0];
      }

      if (this.activeItem === undefined) {
        return;
      }

      this.activeItem.focus();
    }, 0);
  }

  addItemExtra(text, id=undefined, hotkey, icon=-1, add=true, tooltip=undefined) {
    let dom = document.createElement("span");

    dom.style["display"] = "inline-flex";

    dom.hotkey = hotkey;
    dom.icon = icon;

    let icon_div;

    if (1) { //icon >= 0) {
      icon_div = ui_base.makeIconDiv(icon, IconSheets.SMALL);
    } else {
      let tilesize = ui_base.iconmanager.getTileSize(IconSheets.SMALL);

      //tilesize *= window.devicePixelRatio;

      icon_div = document.createElement("span");
      icon_div.style["padding"] = icon_div.style["margin"] = "0px";
      icon_div.style["width"] = tilesize + "px";
      icon_div.style["height"] = tilesize + "px";
    }

    icon_div.style["display"] = "inline-flex";
    icon_div.style["margin-right"] = "1px";
    icon_div.style["align"] = "left";

    let span = document.createElement("span");

    //stupid css doesn't get width right. . .
    span.style["font"] = ui_base.getFont(this, undefined, "MenuText");

    let dpi = this.getDPI();
    let tsize = this.getDefault("MenuText").size;
    //XXX proportional font fail

    //XXX stupid!
    let canvas = document.createElement("canvas");
    let g = canvas.getContext("2d");

    g.font = span.style["font"];

    let rect = span.getClientRects();

    let twid = Math.ceil(g.measureText(text).width);
    let hwid;
    if (hotkey) {
      dom.hotkey = hotkey;
      g.font = ui_base.getFont(this, undefined, "HotkeyText");
      hwid = Math.ceil(g.measureText(hotkey).width);
      twid += hwid + 8;
    }

    //let twid = Math.ceil(text.trim().length * tsize / dpi);

    span.innerText = text;

    span.style["word-wrap"] = "none";
    span.style["white-space"] = "pre";
    span.style["overflow"] = "hidden";
    span.style["text-overflow"] = "clip";

    span.style["width"] = ~~(twid) + "px";
    span.style["padding"] = "0px";
    span.style["margin"] = "0px";

    dom.style["width"] = "100%";

    dom.appendChild(icon_div);
    dom.appendChild(span);

    if (hotkey) {
      let hotkey_span = document.createElement("span");
      hotkey_span.innerText = hotkey;
      hotkey_span.style["margin-left"] = "0px";
      hotkey_span.style["margin-right"] = "0px";
      hotkey_span.style["margin"] = "0px";
      hotkey_span.style["padding"] = "0px";

      let al = "right";

      hotkey_span.style["font"] = ui_base.getFont(this, undefined, "HotkeyText");
      hotkey_span.style["color"] = this.getDefault("HotkeyTextColor");

      //hotkey_span.style["width"] = ~~((hwid + 7)) + "px";
      hotkey_span.style["width"] = "100%";

      hotkey_span.style["text-align"] = al;
      hotkey_span.style["flex-align"] = al;
      //hotkey_span.style["display"] = "inline";
      hotkey_span.style["float"] = "right";
      hotkey_span["flex-wrap"] = "nowrap";

      dom.appendChild(hotkey_span);
    }

    let ret = this.addItem(dom, id, add);

    ret.hotkey = hotkey;
    ret.icon = icon;
    ret.label = text ? text : ret.innerText;

    if (tooltip) {
      ret.title = tooltip;
    }

    return ret;
  }

  //item can be menu or text
  addItem(item, id, add=true) {
    id = id === undefined ? item : id;
    let text = item;

    if (typeof item === "string" || item instanceof String) {
      let dom = document.createElement("dom");
      dom.textContent = item;
      item = dom;
      //return this.addItemExtra(item, id);
    } else {
      text = item.textContent;
    }

    let li = document.createElement("li");

    li.setAttribute("tabindex", this.itemindex++);
    li.setAttribute("class", "menuitem");

    if (item instanceof Menu) {
      console.log("submenu!");

      let dom = this.addItemExtra(""+item.title, id, "", -1, false);

      //dom = document.createElement("div");
      //dom.innerText = ""+item.title;

      //dom.style["display"] = "inline-block";
      li.style["width"] = "100%"
      li.appendChild(dom);

      li._isMenu = true;
      li._menu = item;

      item.hidden = false;
      item.container = this.container;
    } else {
      li._isMenu = false;
      li.appendChild(item);
    }

    li._id = id;

    this.items.push(li);

    li.label = text ? text : li.innerText.trim();

    if (add) {
      li.addEventListener("click", (e) => {
        //console.log("menu click!");

        if (this.activeItem !== undefined && this.activeItem._isMenu) {
          //console.log("menu ignore");
          //ignore
          return n;
        }

        this.click();
      });

      li.addEventListener("blur", (e) => {
        if (this._ignoreFocusEvents) {
          return;
        }

        //console.log("blur", li.getAttribute("tabindex"));
        if (this.activeItem && !this.activeItem._isMenu) {
          this.setActive(undefined, false);
        }
      });

      let onfocus = (e) => {
        if (this._ignoreFocusEvents) {
          return;
        }

        if (this.activeItem !== undefined && this.activeItem._isMenu) {
          let active = this.activeItem;

          window.setTimeout(() => {
            if (this.activeItem && this.activeItem !== active) {
              active._menu.close();
            }
          }, 10);
        }
        if (li._isMenu) {
          li._menu.onselect = (item) => {
            //console.log("submenu select", item);
            this.onselect(item);
            this.close();
          };

          li._menu.start(false, false);
        }

        this.setActive(li, false);
      };

      li.addEventListener("touchend", (e) => {
        onfocus(e);

        if (this.activeItem !== undefined && this.activeItem._isMenu) {
          console.log("menu ignore");
          //ignore
          return;
        }

        this.click();
      });

      li.addEventListener("focus", (e) => {
        onfocus(e);
      })

      li.addEventListener("touchmove", (e) => {
        //console.log("menu touchmove");
        onfocus(e);
        li.focus();
      });

      li.addEventListener("mouseenter", (e) => {
        //console.log("menu mouse enter");
        li.focus();
      });

      this.dom.appendChild(li);
    }

    return li;
  }

  setCSS() {
    super.setCSS();

    this.container.style["color"] = this.getDefault("MenuText").color;
    this.style["color"] = this.getDefault("MenuText").color;
  }

  seperator() {
    let bar = document.createElement("div");
    bar.setAttribute("class", "menuseparator");


    this.dom.appendChild(bar);

    return this;
  }

  menu(title) {
    let ret = document.createElement("menu-x");

    ret.setAttribute("title", title);
    this.addItem(ret);

    return ret;
  }

  calcSize() {

  }
}

Menu.SEP = Symbol("menu seperator");
UIBase.register(Menu);

export class DropBox extends Button {
  constructor() {
    super();

    this._searchMenuMode = false;

    this.r = 5;
    this._menu = undefined;
    this._auto_depress = false;
    //this.prop = new ui_base.EnumProperty(undefined, {}, "", "", 0);

    this._onpress = this._onpress.bind(this);
  }

  init() {
    super.init();
    this.updateWidth();
  }

  get searchMenuMode() {
    return this._searchMenuMode;
  }

  set searchMenuMode(v) {
    this._searchMenuMode = v;

    console.warn("searchMenuMode was set", this);
  }


  setCSS() {
    //do not call parent classes's setCSS here
    this.style["user-select"] = "none";
    this.dom.style["user-select"] = "none";
  }

  updateWidth() {
    //let ret = super.updateWidth(10);
    let dpi = this.getDPI();

    let ts = this.getDefault("DefaultText").size;
    let tw = this.g.measureText(this._genLabel()).width/dpi;
    //let tw = ui_base.measureText(this, this._genLabel(), undefined, undefined, ts).width + 8;
    tw = ~~tw;

    tw += 15;

    if (!this.getAttribute("simple")) {
      tw += 35;
    }

    if (tw !== this._last_w) {
      this._last_w = tw;
      this.dom.style["width"] = tw + "px";
      this.style["width"] = tw + "px";
      this.width = tw;

      this.overrideDefault("defaultWidth", tw);
      this._repos_canvas();
      this._redraw();
    }

    return 0;
  }


  updateDataPath() {
    if (!this.ctx || !this.hasAttribute("datapath")) {
      return;
    }

    let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));
    let val = this.getPathValue(this.ctx, this.getAttribute("datapath"));

    if (val === undefined) {
      this.disabled = true;
      return;
    } else {
      this.disabled = false;
    }

    if (this.prop !== undefined) {
      prop = this.prop;
    }

    let name = this.getAttribute("name");

    if (prop.type & (PropTypes.ENUM|PropTypes.FLAG)) {
      name = prop.ui_value_names[prop.keys[val]];
    } else {
      name = ""+val;
    }

    if (name != this.getAttribute("name")) {
      this.setAttribute("name", name);
      this.updateName();
    }

    //console.log(name, val);
  }

  update() {
    super.update();

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }
  }

  _build_menu() {
    let prop = this.prop;

    if (this.prop === undefined) {
      return;
    }

    if (this._menu !== undefined && this._menu.parentNode !== undefined) {
      this._menu.remove();
    }

    let menu = this._menu = document.createElement("menu-x");
    menu.setAttribute("title", name);

    menu._dropbox = this;

    let valmap = {};
    let enummap = prop.values;
    let iconmap = prop.iconmap;
    let uimap = prop.ui_value_names;

    //console.log("   UIMAP", uimap);

    for (let k in enummap) {
      let uk = k;

      valmap[enummap[k]] = k;

      if (uimap !== undefined && k in uimap) {
        uk = uimap[k];
      }

      //menu.addItem(k, enummap[k], ":");
      if (iconmap && iconmap[k]) {
        menu.addItemExtra(uk, enummap[k], undefined, iconmap[k]);
      } else {
        menu.addItem(uk, enummap[k]);
      }
    }

    menu.onselect = (id) => {
      this._pressed = false;

      //console.log("dropbox select");
      this._pressed = false;
      this._redraw();
      //console.trace("got click!", id, ":::");

      this._menu = undefined;
      this.prop.setValue(id);

      this.setAttribute("name", this.prop.ui_value_names[valmap[id]]);
      if (this.onselect) {
        this.onselect(id);
      }

      if (this.hasAttribute("datapath") && this.ctx) {
        console.log("setting data api value", id, this.getAttribute("datapath"));
        this.setPathValue(this.ctx, this.getAttribute("datapath"), id);
      }
    };
  }

  _onpress(e) {
    if (this._menu !== undefined) {
      this._pressed = false;
      let menu = this._menu;
      this._menu = undefined;
      menu.close();
      return;
    }

    this._build_menu();

    console.log("menu dropbox click", this._menu);

    if (this._menu === undefined) {
      return;
    }

    this._menu._dropbox = this;
    this.dom._background = this.getDefault("BoxDepressed");
    this._background = this.getDefault("BoxDepressed");
    this._redraw();
    this._pressed = true;
    this.setCSS();

    let onclose = this._menu.onclose;
    this._menu.onclose = () => {
      this._pressed = false;
      this._redraw();

      let menu = this._menu;
      if (menu) {
        this._menu = undefined;
        menu._dropbox = undefined;
      }

      if (onclose) {
        onclose.call(menu);
      }
    }

    let menu = this._menu;
    let screen = this.getScreen();

    let dpi = this.getDPI();

    let x = e.x, y = e.y;
    let rects = this.dom.getBoundingClientRect(); //getClientRects();

    x = rects.x - window.scrollX;
    y = rects.y + rects.height - window.scrollY; // + rects[0].height; // visualViewport.scale;

    if (!window.haveElectron) {
      //y -= 8;
    }

    /*
    let w = document.createElement("div");
    w.style["width"] = w.style["height"] = "15px";
    w.style["background-color"] = "red";
    w.style["z-index"] = "5000";
    w.style["position"] = "absolute";
    w.style["pointer-events"] = "none";
    w.style["left"] = x + "px";
    w.style["top"] = y + "px";

    document.body.appendChild(w);
    //*/

    let con = this._popup = menu._popup = screen.popup(this, x, y, false);
    con.noMarginsOrPadding();

    con.add(menu);
    if (this.searchMenuMode) {
      menu.startFancy();
    } else {
      menu.start();
    }
  }

  _redraw() {
    if (this.getAttribute("simple")) {
      let color;

      if (this._highlight) {
        ui_base.drawRoundBox2(this, {canvas: this.dom, g: this.g, color: this.getDefault("BoxHighlight") });
      }

      if (this._focus) {
        ui_base.drawRoundBox2(this, {canvas: this.dom, g : this.g, color : this.getDefault("BoxHighlight"), op : "stroke", no_clear : true});
        ui_base.drawRoundBox(this, this.dom, this.g, undefined, undefined, 2, "stroke");
      }

      this._draw_text();
      return;
    }

    super._redraw(false);

    let g = this.g;
    let w = this.dom.width, h = this.dom.height;
    let dpi = this.getDPI();

    let p = 10*dpi;
    let p2 = 4*dpi;


    //*
    let bg = this.getDefault("dropTextBG");
    if (bg !== undefined) {
      g.fillStyle = bg;

      g.beginPath();
      g.rect(p2, p2, this.dom.width - p2 - h, this.dom.height - p2 * 2);
      g.fill();
    }
    //*/

    g.fillStyle = "rgba(50, 50, 50, 0.2)";
    g.strokeStyle = "rgba(50, 50, 50, 0.8)";
    g.beginPath();
    /*
    g.moveTo(w-p, p);
    g.lineTo(w-(p+h*0.25), h-p);
    g.lineTo(w-(p+h*0.5), p);
    g.closePath();
    //*/

    let sz = 0.3;
    g.moveTo(w-h*0.5-p, p);
    g.lineTo(w-p, p);
    g.moveTo(w-h*0.5-p, p+sz*h/3);
    g.lineTo(w-p, p+sz*h/3);
    g.moveTo(w-h*0.5-p, p+sz*h*2/3);
    g.lineTo(w-p, p+sz*h*2/3);

    g.lineWidth = 1;
    g.stroke();

    this._draw_text();
  }

  set menu(val) {
    this._menu = val;

    if (val !== undefined) {
      this._name = val.title;
      this.updateName();
    }
  }

  setValue(val) {
    if (this.prop !== undefined) {
      this.prop.setValue(val);
      let val2=val;

      if (val2 in this.prop.keys)
        val2 = this.prop.keys[val2];
      val2 = this.prop.ui_value_names[val2];

      this.setAttribute("name", ""+val2);
      this._name = ""+val2;
    } else {
      this.setAttribute("name", ""+val);
      this._name = ""+val;
    }

    if (this.onchange) {
      this.onchange(val);
    }

    this.setCSS();
    this.update();
    this._redraw();
  }

  get menu() {
    return this._menu;
  }

  static define() {return {
    tagname : "dropbox-x",
    style   : "dropbox"
  };}
}

UIBase.register(DropBox);

export class MenuWrangler {
  constructor() {
    this.screen = undefined;
    this.menustack = [];

    this.closetimer = 0;
    this.closeOnMouseUp = undefined;
  }

  get menu() {
    return this.menustack.length > 0 ? this.menustack[this.menustack.length-1] : undefined;
  }

  pushMenu(menu) {
    if (this.menustack.length === 0 && menu.closeOnMouseUp) {
      this.closeOnMouseUp = true;
    }

    this.menustack.push(menu);
  }

  popMenu(menu) {
    return this.menustack.pop();
  }

  endMenus() {
    for (let menu of this.menustack) {
      menu.close();
    }

    this.menustack = [];
  }

  searchKeyDown(e) {
    let menu = this.menu;
    
    console.log("s", e.keyCode);
    
    e.stopPropagation();
    menu._ignoreFocusEvents = true;
    menu.textbox.focus();
    menu._ignoreFocusEvents = false;

    //if (e.shiftKey || e.altKey || e.ctrlKey || e.commandKey) {
    //  return;
    //}

    switch (e.keyCode) {
      case keymap["Enter"]: //return key
        menu.click(menu.activeItem);
        break;
      case keymap["Escape"]: //escape key
        menu.close();
        break;
      case keymap["Up"]:
        console.log("Up");
        menu.selectPrev(false);
        break;
      case keymap["Down"]:
        console.log("Down");
        menu.selectNext(false);
        break;
    }
  }

  on_keydown(e) {
    window.menu = this.menu;
    //console.log("M", e.keyCode, this.menu !== undefined);

    if (this.menu === undefined) {
      return;
    }

    if (this.menu.hasSearchBox) {
      return this.searchKeyDown(e);
    }

    console.log("key", e.keyCode);
    let menu = this.menu;

    switch (e.keyCode) {
      case keymap["Left"]: //left
      case keymap["Right"]: //right
        if (menu._dropbox) {
          let dropbox = menu._dropbox;

          if (e.keyCode === keymap["Left"]) {
            dropbox = dropbox.previousElementSibling;
          } else {
            dropbox = dropbox.nextElementSibling;
          }

          if (dropbox !== undefined && dropbox instanceof DropBox) {
            this.endMenus();
            dropbox._onpress(e);
          }
        }
        break;
      case keymap["Up"]: //up
        this.selectPrev();
        break;
      case keymap["Down"]: //down
        this.selectNext();
        break;
        /*
        let item = menu.activeItem;
        if (!item) {
          item = menu.items[0];
        }

        if (!item) {
          return;
        }

        let item2;
        let i = menu.items.indexOf(item);

        if (e.keyCode == 38) {
          i = (i - 1 + menu.items.length) % menu.items.length;
        } else {
          i = (i + 1) % menu.items.length;
        }

        item2 = menu.items[i];

        if (item2) {
          menu.setActive(item2);
        }
        break;//*/
      case 13: //return key
      case 32: //space key
        menu.click(menu.activeItem);
        break;
      case 27: //escape key
        menu.close();
        break;
    }
  }

  on_mousedown(e) {
    if (this.menu === undefined || this.screen === undefined) {
      this.closetimer = util.time_ms();
      return;
    }

    let screen = this.screen;
    let x = e.pageX, y = e.pageY;

    let element = screen.pickElement(x, y);
    console.log("wrangler mousedown", element);

    if (element !== undefined && element instanceof DropBox) {
      this.endMenus();
      e.preventDefault();
      e.stopPropagation();
    }
  }

  on_mouseup(e) {
    if (this.menu === undefined || this.screen === undefined) {
      this.closetimer = util.time_ms();
      return;
    }

    let screen = this.screen;
    let x = e.pageX, y = e.pageY;

    let element = screen.pickElement(x, y, undefined, undefined, DropBox);
    if (element !== undefined) {
      this.closeOnMouseUp = false;
    } else {
      element = screen.pickElement(x, y, undefined, undefined, Menu);

      //closeOnMouseUp
      if (element && this.closeOnMouseUp) {
        element.click();
      }
    }

  }

  on_mousemove(e) {
    //XXX
    if (this.menu && this.menu.hasSearchBox) {
      this.closetimer = util.time_ms();
      return;
    }

    if (this.menu === undefined || this.screen === undefined) {
      this.closetimer = util.time_ms();
      return;
    }

    let screen = this.screen;
    let x = e.pageX, y = e.pageY;

    let element = screen.pickElement(x, y);

    if (element === undefined) {
      return;
    }

    if (element instanceof DropBox && element.menu !== this.menu && element.getAttribute("simple")) {
      //destroy entire menu stack
      this.endMenus();

      this.closetimer = util.time_ms();

      //start new menu
      element._onpress(e);
      return;
    }

    let ok = false;

    let w = element;
    while (w) {
      if (w === this.menu) {
        ok = true;
        break;
      }

      if (w instanceof DropBox && w.menu === this.menu) {
        ok = true;
        break;
      }

      w = w.parentWidget;
    }

    if (!ok && (util.time_ms() - this.closetimer > cconst.menu_close_time)) {
      this.endMenus();
    } else if (ok) {
      this.closetimer = util.time_ms();
    }
  }
}

export let menuWrangler = new MenuWrangler();
let wrangerStarted = false;

export function startMenuEventWrangling(screen) {
  menuWrangler.screen = screen;

  if (wrangerStarted) {
    return;
  }

  wrangerStarted = true;

  for (let k in DomEventTypes) {
    if (menuWrangler[k] === undefined) {
      continue;
    }

    let dom = k.search("key") >= 0 ? window : document.body;
    dom = window;
    dom.addEventListener(DomEventTypes[k], menuWrangler[k].bind(menuWrangler), {passive : false, capture : true})
  }

  menuWrangler.screen = screen;
}

export function setWranglerScreen(screen) {
  startMenuEventWrangling(screen);
}

export function getWranglerScreen() {
  return menuWrangler.screen;
}
