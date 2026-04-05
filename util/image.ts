export function getImageData(image: HTMLImageElement | string): Promise<ImageData> {
  let img: HTMLImageElement;
  if (typeof image === "string") {
    img = new Image();
    img.src = image;
  } else {
    img = image;
  }

  function render(): ImageData {
    const canvas = document.createElement("canvas");
    const g = canvas.getContext("2d")!;

    canvas.width = img.width;
    canvas.height = img.height;

    g.drawImage(img, 0, 0);
    return g.getImageData(0, 0, img.width, img.height);
  }

  return new Promise((accept) => {
    if (!img.complete) {
      img.onload = () => {
        console.log("image loaded");
        accept(render());
      };
    } else {
      accept(render());
    }
  });
}

interface ImageDataWithUrl extends ImageData {
  dataurl?: string;
}

export function loadImageFile(): Promise<ImageDataWithUrl> {
  return new Promise((accept) => {
    const input = document.createElement("input");
    input.type = "file";

    input.addEventListener("change", function (this: HTMLInputElement) {
      const files = this.files;
      if (!files || files.length === 0) return;

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const img = new Image();
        const dataurl = e.target!.result as string;
        img.src = dataurl;

        window._image_url = dataurl;

        img.onload = () => {
          getImageData(img).then((data) => {
            (data as ImageDataWithUrl).dataurl = dataurl;
            accept(data as ImageDataWithUrl);
          });
        };
      };

      reader.readAsDataURL(files[0]);
    });

    input.click();
  });
}
