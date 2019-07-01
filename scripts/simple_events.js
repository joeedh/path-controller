export let modalstack = [];

export function copyEvent(e) {
  let ret = {};
  let keys = [];

  for (let k in e) {
    keys.push(k);
  }

  keys = keys.concat(Object.getOwnPropertySymbols(e));
  keys = keys.concat(Object.getOwnPropertyNames(e));

  for (let k of keys) {
    let v;

    try {
      v = e[k];
    } catch (error) {
      console.warn("read error for event key", k);
      continue;
    }

    if (typeof v == "function") {
      ret[k] = v.bind(e);
    } else {
      ret[k] = v;
    }
  }

  return ret;
}

export function pushModalLight(obj) {
  let keys = new Set([
    "keydown", "keyup", "keypress", "mousedown", "mouseup", "touchstart", "touchend",
    "touchcancel", "mousewheel", "mousemove", "mouseover", "mouseout", "mouseenter", "mouseleave"
  ]);

  let ret = {
    keys : keys,
    handlers : {},
    last_mpos : [0, 0]
  };

  let touchmap = {
    "touchstart" : "mousedown",
    "touchmove" : "mousemove",
    "touchend" : "mouseup",
    "touchcancel" : "mouseup"
  };

  function make_default_touchhandler(type, state) {
    return function(e) {
      console.warn("touch event!", type, touchmap[type], e.touches.length);

      if (touchmap[type] in ret.handlers) {
        let type2 = touchmap[type];

        let e2 = copyEvent(e);
        e2.type = type2;
        e2.button = type == "touchcancel" ? 1 : 0;

        if (e.touches.length > 0) {
          let dpi = window.devicePixelRatio; //UIBase.getDPI();
          let t = e.touches[0];

          e2.pageX = e2.x = t.pageX;// * dpi;
          e2.pageY = e2.y = t.pageY;// * dpi;
          e2.clientX = t.clientX;// * dpi;
          e2.clientY = t.clientY;// * dpi;
          e2.x = t.clientX;// * dpi;
          e2.y = t.clientY;// * dpi;

          ret.last_mpos[0] = e2.x;
          ret.last_mpos[1] = e2.y;
        } else {
          e2.x = e2.clientX = e2.pageX = e2.screenX = ret.last_mpos[0];
          e2.y = e2.clientY = e2.pageY = e2.screenY = ret.last_mpos[1];
        }

        console.log(e2.x, e2.y);
        ret.handlers[type2](e2);
      }

      e.preventDefault();
      e.stopPropagation();
    }
  }

  function make_handler(type, key) {
    return function(e) {
      let retval = key !== undefined ? obj[key](e) : undefined;

      e.preventDefault();
      e.stopPropagation();
      return retval;
    }
  }

  let found = {};

  for (let k of keys) {
    let key;

    if (obj["on"+k])
      key = "on" + k;
    else if (obj["on_"+k])
      key = "on_" + k;
    else if (k in touchmap)
      continue; //default touch event handlers will be done seperately
    else
      key = undefined; //make handler that still blocks events

    if (key !== undefined) {
      found[k] = 1;
    }

    let handler = make_handler(k, key);
    ret.handlers[k] = handler;

    let settings = handler.settings = {passive : false};
    window.addEventListener(k, handler, settings);
  }

  for (let k in touchmap) {
    if (!(k in found)) {
      console.log("making touch handler for", '"' + k + '"', ret.handlers[k]);

      ret.handlers[k] = make_default_touchhandler(k, ret);
      let settings = ret.handlers[k].settings = {passive : false, capture : true};
      window.addEventListener(k, ret.handlers[k], settings);
    }
  }

  modalstack.push(ret);

  return ret;
}

export function popModalLight(state) {
  if (state === undefined) {
    console.warn("Bad call to popModalLight: state was undefined");
    return;
  }

  if (state !== modalstack[modalstack.length-1]) {
    if (modalstack.indexOf(state) < 0) {
      console.warn("Error in popModalLight; modal handler not found");
      return;
    } else {
      console.warn("Error in popModalLight; called in wrong order");
    }
  }

  for (let k in state.handlers) {
    console.log(k);
    window.removeEventListener(k, state.handlers[k], state.handlers[k].settings);
  }

  state.handlers = {};
  modalstack.remove(state);
}

export var keymap_latin_1 = {
  "Space": 32,
  "Escape" : 27,
  "Enter": 13,
  "Return" : 13,
  "Up" : 38,
  "Down" : 40,
  "Left": 37,
  "Right": 39,

  "Num0": 96,
  "Num1": 97,
  "Num2": 98,
  "Num3": 99,
  "Num4": 100,
  "Num5": 101,
  "Num6": 102,
  "Num7": 103,
  "Num8": 104,
  "Num9": 105,
  "Home": 36,
  "End": 35,
  "Delete": 46,
  "Backspace": 8,
  "Insert": 45,
  "PageUp": 33,
  "PageDown": 34,
  "Tab" : 9,
  "-" : 189,
  "=" : 187,
  "NumPlus" : 107,
  "NumMinus" : 109,
  "Shift" : 16,
  "Ctrl" : 17,
  "Control" : 17,
  "Alt" : 18
}

for (var i=0; i<26; i++) {
  keymap_latin_1[String.fromCharCode(i+65)] = i+65
}
for (var i=0; i<10; i++) {
  keymap_latin_1[String.fromCharCode(i+48)] = i+48
}

for (var k in keymap_latin_1) {
  keymap_latin_1[keymap_latin_1[k]] = k;
}

var keymap_latin_1_rev = {}
for (var k in keymap_latin_1) {
  keymap_latin_1_rev[keymap_latin_1[k]] = k
}

export var keymap = keymap_latin_1;
export var reverse_keymap = keymap_latin_1_rev;
