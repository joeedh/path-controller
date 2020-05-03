"use strict";

/*
Icons are defined in spritesheets that live in
the iconsheet16/32 dom nodes.  Icons are numbered start from
the upper left sprite tile.

This function sets the mapping between icon numbers and names.

The following icons should be in the icon sheet and in this map:

RESIZE      :
SMALL_PLUS  :
TRANSLATE   : for moving things
UI_EXPAND   : panel open icon
UI_COLLAPSE : panel close icon
NOTE_EXCL   : exclamation mark for notifications
*/
export function setIconMap(icons) {
  for (let k in icons) {
    Icons[k] = icons[k];
  }
}

export let Icons = {
  HFLIP          : 0,
  TRANSLATE      : 1,
  ROTATE         : 2,
  HELP_PICKER    : 3,
  UNDO           : 4,
  REDO           : 5,
  CIRCLE_SEL     : 6,
  BACKSPACE      : 7,
  LEFT_ARROW     : 8,
  RIGHT_ARROW    : 9,
  UI_EXPAND      : 10, //triangle
  UI_COLLAPSE    : 11, //triangle
  FILTER_SEL_OPS : 12,
  SCROLL_DOWN    : 13,
  SCROLL_UP      : 14,
  NOTE_EXCL      : 15,
  TINY_X         : 16,
  FOLDER         : 17,
  FILE           : 18,
  SMALL_PLUS     : 19,
  SMALL_MINUS    : 20,
  MAKE_SEGMENT   : 21,
  MAKE_POLYGON   : 22,
  FACE_MODE      : 23,
  EDGE_MODE      : 24,
  VERT_MODE      : 25,
  CURSOR_ARROW   : 26,
  TOGGLE_SEL_ALL : 27,
  DELETE         : 28,
  RESIZE         : 29,
  Z_UP           : 30,
  Z_DOWN         : 31,
  SPLIT_EDGE     : 32,
  SHOW_ANIMPATHS : 33,
  UNCHECKED      : 34,
  CHECKED        : 35,
  ENUM_UNCHECKED : 36,
  ENUM_CHECKED   : 37,
  APPEND_VERTEX  : 38,
  LARGE_CHECK    : 39
};

