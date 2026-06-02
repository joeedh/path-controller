export function saveFile(
  data: BlobPart,
  filename: string = "unnamed",
  _exts: string[] = [],
  mime: string = "application/x-octet-stream"
): void {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.setAttribute("href", url);
  a.setAttribute("download", filename);

  a.click();
}

//returns a promise
export function loadFile(
  _filename: string = "unnamed",
  exts: string[] = []
): Promise<string | ArrayBuffer | null> {
  const input = document.createElement("input");
  input.type = "file";

  const acceptStr = exts.join(",");

  input.setAttribute("accept", acceptStr);
  return new Promise((accept, reject) => {
    input.onchange = function () {
      if (input.files === null || input.files.length !== 1) {
        reject("file load error");
        return;
      }

      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = function (e2: ProgressEvent<FileReader>) {
        accept(e2.target!.result);
      };

      reader.readAsArrayBuffer(file);
    };
    input.click();
  });
}

window._testLoadFile = function (exts: string[] = ["*.*"]): void {
  loadFile(undefined, exts).then((data) => {
    console.log("got file data:", data);
  });
};

window._testSaveFile = function (): void {
  const buf = (
    window as unknown as Record<string, { createFile(): BlobPart }>
  )._appstate.createFile();
  saveFile(buf, "unnamed.w3d", [".w3d"]);
};
