let _clipdata = {
  name : "nothing",
  mime : "nothing",
  data : undefined
};

let _clipboards = {};

window.setInterval(() => {
  let cb = navigator.clipboard;

  if (!cb) {
    return;
  }

  cb.read().then((data) => {
    for (let item of data) {
      for (let i=0; i<item.types.length; i++) {
        let type = item.types[i];

        if (!(type in _clipboards)) {
          _clipboards[type] = {
            name : type,
            mime : type,
            data : undefined
          };
        };

        item.getType(type).then((blob) => new Response(blob).text()).then((text) => {
          _clipboards[type].data = text;
        });
      }

      //item.getType("text/css").then((blob) => blob.text()).then((text) => {
      //  console.log("text", text);
      //});
    }
    //_clipdata.mime =
  }).catch(function() {});
}, 200);

let exports = {
  /*client code can override this using .loadConstants, here is a simple implementation
    that just handles color data

    desiredMimes is either a string, or an array of strings
   */
  getClipboardData(desiredMimes="text/plain") {
    if (typeof desiredMimes === "string") {
      desiredMimes = [desiredMimes];
    }

    for (let m of desiredMimes) {
      let cb = _clipboards[m];

      if (cb && cb.data) {
        return cb;
      }
    }
  },
  /*client code can override this, here is a simple implementation
    that just handles color data
   */
  setClipboardData(name, mime, data) {
    _clipboards[mime] = {
      name : name,
      mime : mime,
      data : data
    };

    let clipboard = navigator.clipboard;
    if (!clipboard) {
      return;
    }

    try {
      clipboard.write([new ClipboardItem({
        [mime] : new Blob([data], {type : mime})
      })]).catch((error) => {
        //try pushing through text/plain
        if (mime.startsWith("text") && mime !== "text/plain") {
          this.setClipboardData(name, "text/plain", data);
        } else {
          console.error(error);
        }
      });
    } catch (error) {
      console.log(error.stack);
      console.log("failed to write to system clipboard");
    }
  },
  colorSchemeType : "light",
  docManualPath : "../simple_docsys/doc_build/",
  
  //add textboxes to rollar sliders,
  //note that  users can also double click them to
  //enter text as well
  useNumSliderTextboxes : true,

  menu_close_time : 500,
  doubleClickTime : 500,
  //timeout for press-and-hold (touch) version of double clicking
  doubleClickHoldTime : 750,
  DEBUG : {
    paranoidEvents: false,
    screenborders: false,
    areaContextPushes: false,
    allBordersMovable: false,
    doOnce: false,
    modalEvents : true,
    areaConstraintSolver : false,
    datapaths : false,

    domEvents : false,
    domEventAddRemove : false,

    debugUIUpdatePerf : false, //turns async FrameManager.update_intern loop into sync

    screenAreaPosSizeAccesses : false,
    buttonEvents : false,

    /*
    customWindowSize: {
      width: 2048, height: 2048
    },
    //*/
  },

  addHelpPickers : true,

  useAreaTabSwitcher: true,
  autoSizeUpdate : true,
  showPathsInToolTips: true,

  loadConstants : function(args) {
    for (let k in args) {
      if (k === "loadConstants")
        continue;

      this[k] = args[k];
    }
  }
};

export default exports;
window.DEBUG = exports.DEBUG;