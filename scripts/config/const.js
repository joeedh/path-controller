let exports = {
  colorSchemeType : "light",

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