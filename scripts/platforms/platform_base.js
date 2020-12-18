export var textMimes = new Set([
  "application-javascript", "application-x-javscript",
  "image/svg+xml"
]);

export function isMimeText(mime) {
  if (!mime) {
    return false;
  }
  if (mime.startsWith("text")) {
    return true;
  }

  return textMimes.has(mime);
}

export class PlatformAPI {
  //returns a promise
  static showOpenDialog(title, args=new FileDialogArgs()) {
    throw new Error("implement me");
  }

  //returns a promise
  static showSaveDialog(title, savedata, args=new FileDialogArgs()) {
    throw new Error("implement me");
  }

  //returns a promise.  if mime is a text type, a string will be fed to the promise,
  //otherwise it will be an ArrayBuffer
  static readFile(path, mime) {
    throw new Error("implement me");
  }
}

export class FileDialogArgs {
  constructor() {
    this.multi = false; //allow selecting multiple files
    this.addToRecentList = false; //update recent file list

    /* example for filters:
    [{
      name : "Images",
      mime : "image/png"
      extensions : "["png", "jpg"]
    }]
    * */
    this.filters = []
  }
}

/*a file path, some platforms may not return real payhs*/
export class FilePath {
  constructor(data) {
    this.data = data;
  }
}