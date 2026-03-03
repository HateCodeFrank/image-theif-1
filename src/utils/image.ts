import type { ImageSource } from "@/types";

export class ImageProcessor {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    this.canvas = document.createElement("canvas");
    const context = this.canvas.getContext("2d");
    if (!context) {
      throw new Error("不支持的canvas context");
    }
    this.ctx = context;
  }

  //加载图片并返回 ImageData
  public async loadImageData(source: ImageSource): Promise<ImageData> {
    const imageElement = await this.createImageElement(source);
    return this.getImageData(imageElement);
  }

  //创建HTMLImageElement对象
  private createImageElement(source: ImageSource): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "Anonymous";

      if (typeof source === "string") {
        image.src = source;
      } else if (source instanceof File) {
        const reader = new FileReader();
        reader.readAsDataURL(source);

        reader.onload = (e) => {
          image.src = e.target?.result as string;
        };
        reader.onerror = (e) => {
          reject(new Error("无法读取文件：" + e));
        };
      }

      image.onload = () => {
        resolve(image);
      };
      image.onerror = () => {
        reject(new Error("无法加载图片"));
      };
    });
  }

  //获取图片像素数据
  private getImageData(image: HTMLImageElement): ImageData {
    this.canvas!.width = image.width;
    this.canvas!.height = image.height;
    this.ctx!.drawImage(image, 0, 0);
    return this.ctx!.getImageData(0, 0, image.width, image.height);
  }

  //销毁
  destroy(): void {
    this.ctx!.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
    this.canvas!.width = 0;
    this.canvas!.height = 0;
    this.canvas = null;
    this.ctx = null;
  }
}
