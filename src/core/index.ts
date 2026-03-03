import type { ColorInfo, ExtractorOptions } from "@/types";
import { ColorUtils } from "@/utils/color";
import { ImageProcessor } from "@/utils/image";

export class ImageTheif {
  private options: ExtractorOptions;
  private imageProcessor: ImageProcessor;
  private el: HTMLDivElement | null = null;
  private currentCanvas: HTMLCanvasElement | null = null;
  private animationId: number | null = null;
  constructor(options: ExtractorOptions) {
    this.el = options.el || null;
    if (!this.el) {
      console.warn(
        "未传入 el 参数，无法设置渐变背景容器元素。此状态下仅可提取颜色数据。",
      );
    }
    this.options = {
      colorCount: options.colorCount ?? 6,
      quality: options.quality ?? 10,
      minSaturation: options.minSaturation ?? 0.2,
      minBrightness: options.minBrightness ?? 0.2,
      maxBrightness: options.maxBrightness ?? 0.9,
    };
    this.imageProcessor = new ImageProcessor();
  }

  //提取图片主色调
  async extract(source: File | string): Promise<ColorInfo[]> {
    try {
      const imageData = await this.imageProcessor.loadImageData(source);
      const pixels = this.samplePixels(imageData);
      const colors = this.analyzeColors(pixels);
      return colors;
    } catch (error) {
      throw new Error(`Failed to extract colors: ${error}`);
    }
  }

  /* 
   创建渐变背景
  */
  createGradientBackground(
    colors: { hex: string; percentage: number }[],
  ): HTMLCanvasElement {
    const parent = this.el;
    if (!parent) {
      throw new Error("el 参数未设置，无法创建渐变背景。");
    }
    if (this.currentCanvas && this.currentCanvas.parentNode === parent) {
      parent.removeChild(this.currentCanvas);
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = parent.clientWidth * dpr;
    canvas.height = parent.clientHeight * dpr;
    canvas.style.width = `${parent.clientWidth}px`;
    canvas.style.height = `${parent.clientHeight}px`;

    if (colors.length === 0) return canvas;

    // 创建径向渐变（从中心向外）
    if (colors.length === 1) {
      ctx.fillStyle = colors[0]!.hex;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (colors.length === 2) {
      // 线性渐变
      const gradient = ctx.createLinearGradient(
        0,
        0,
        canvas.width,
        canvas.height,
      );
      gradient.addColorStop(0, colors[0]!.hex);
      gradient.addColorStop(1, colors[1]!.hex);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      // 多色径向渐变 + 网格混合
      this.drawMultiColorGradient(ctx, canvas.width, canvas.height, colors);
    }
    // 模糊
    ctx.filter = "blur(100px)";
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = "none";
    parent.appendChild(canvas);
    this.currentCanvas = canvas;
    return canvas;
  }

  createAnimatedGradientBackground(
    colors: { hex: string }[],
  ): HTMLCanvasElement {
    const parent = this.el;
    if (!parent) throw new Error("el missing");

    // 清理旧 Canvas
    if (this.currentCanvas && this.currentCanvas.parentNode === parent) {
      parent.removeChild(this.currentCanvas);
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    // 【关键点1】降低内部渲染分辨率，提高性能并自带模糊效果
    // Apple Music 效果其实不需要高分辨率，0.2-0.4 足够了
    const renderScale = 0.4;
    const dpr = window.devicePixelRatio || 1;

    // 设置实际画布大小（渲染大小）
    canvas.width = parent.clientWidth * dpr * renderScale;
    canvas.height = parent.clientHeight * dpr * renderScale;

    // 设置 CSS 显示大小
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";

    // 【关键点2】超强 CSS 模糊
    // 模糊半径要极大，才能把圆球融化成流体背景
    canvas.style.filter = "blur(80px) contrast(1.6) saturate(1.8)";

    // --- 关键修改开始 ---
    // 检查父元素定位，强制设为 relative (如果它不是 absolute/fixed 的话)
    // if (getComputedStyle(parent).position === "static") {
    //   parent.style.position = "relative";
    // }
    // 裁剪掉溢出的模糊光晕
    parent.style.overflow = "hidden";
    // --- 关键修改结束 ---

    // 如果想确保它在背景层，可以使用 insertBefore 把它插到第一个子元素之前
    if (parent.firstChild) {
      parent.insertBefore(canvas, parent.firstChild);
    } else {
      parent.appendChild(canvas);
    }

    parent.appendChild(canvas);
    this.currentCanvas = canvas;

    // 动画状态
    let time = 0;

    // 【关键点3】重新设计运动轨迹
    // 让坐标分布更靠近中心 (0.3 - 0.7)，而不是边缘 (0.1, 0.9)
    const positions = [
      { x: 0.5, y: 0.5, vx: 0.004, vy: 0.005 }, // 中心主力
      { x: 0.3, y: 0.3, vx: -0.005, vy: 0.004 },
      { x: 0.7, y: 0.3, vx: 0.004, vy: -0.006 },
      { x: 0.3, y: 0.7, vx: -0.006, vy: -0.004 },
      { x: 0.7, y: 0.7, vx: 0.005, vy: 0.003 },
      { x: 0.5, y: 0.2, vx: -0.003, vy: 0.005 },
    ];

    const animate = () => {
      time += 4;

      // 【关键点4】先画一个底色，防止出现白色空洞
      // 取数组里第一个颜色作为基调，或者用固定颜色
      ctx.fillStyle = colors[0]?.hex || "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      colors.slice(0, 6).forEach((color, i) => {
        const pos = positions[i]!;

        // 使用 sin/cos 让球体在画布中间大幅度游动
        // 振幅(0.3)调大，让它能跨越中心
        const x = canvas.width * (pos.x + Math.sin(time * pos.vx) * 0.3);
        const y = canvas.height * (pos.y + Math.cos(time * pos.vy) * 0.3);

        // 【关键点5】巨大化半径
        // 半径设为长宽最大值的 60%~80%，确保覆盖整个屏幕
        const radius = Math.max(canvas.width, canvas.height) * 0.7;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        // 颜色从中心实色 -> 边缘透明
        gradient.addColorStop(0, color.hex);
        gradient.addColorStop(1, color.hex + "00"); // 边缘透明以便融合

        // 【关键点6】不要用 lighter，改用 source-over 直接覆盖
        // 因为我们有底色，且半径巨大，直接覆盖会产生柔和的混合
        ctx.globalCompositeOperation = "source-over";

        ctx.fillStyle = gradient;

        // 画圆
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      this.animationId = requestAnimationFrame(animate);
    };

    animate();
    return canvas;
  }

  // 停止动画
  stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  //采样像素 根据 quality 参数进行采样
  private samplePixels(imageData: ImageData): [number, number, number][] {
    const pixels: [number, number, number][] = [];
    const pixelCount = imageData.width * imageData.height;
    const quality = Math.max(1, Math.min(10, this.options.quality!));
    const step = quality;

    for (let i = 0; i < pixelCount; i += step) {
      const offset = i * 4;
      const r = imageData.data[offset]!;
      const g = imageData.data[offset + 1]!;
      const b = imageData.data[offset + 2]!;
      const a = imageData.data[offset + 3]!;

      // 跳过透明像素
      if (a < 125) continue;
      const hsl = ColorUtils.rgbToHsl(r, g, b);
      //过滤颜色;
      if (
        ColorUtils.isValidColor(
          hsl,
          this.options.minSaturation!,
          this.options.minBrightness!,
          this.options.maxBrightness!,
        )
      ) {
        pixels.push([r, g, b]);
      }

      pixels.push([r, g, b]);
    }
    return pixels;
  }

  //分析颜色
  private analyzeColors(pixels: [number, number, number][]): ColorInfo[] {
    if (pixels.length === 0) return [];

    // 使用 K-means 聚类提取主色调
    const centroids = ColorUtils.cluster(pixels, this.options.colorCount!);

    // 计算每个聚类的像素数量
    const clusters: Map<number, [number, number, number][]> = new Map();
    centroids.forEach((_, i) => clusters.set(i, []));

    pixels.forEach((pixel) => {
      const nearestIndex = ColorUtils.findNearestCentroid(pixel, centroids);
      clusters.get(nearestIndex)!.push(pixel);
    });

    // 转换为 ColorInfo 并按占比排序
    const totalPixels = pixels.length;
    const colors = centroids.map((centroid, index) => {
      const [r, g, b] = centroid;
      const count = clusters.get(index)!.length;

      return {
        rgb: [r, g, b] as [number, number, number],
        hex: ColorUtils.rgbToHex(r, g, b),
        hsl: ColorUtils.rgbToHsl(r, g, b),
        percentage: Math.round((count / totalPixels) * 100),
      };
    });

    // 按占比排序
    return colors.sort((a, b) => b.percentage - a.percentage);
  }

  /**
   * 根据颜色数量生成均匀分布的位置
   */
  private generatePositions(count: number): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];

    if (count === 1) {
      // 单色：中心
      return [{ x: 0.5, y: 0.5 }];
    }

    if (count === 2) {
      // 双色：左右或上下
      return [
        { x: 0.3, y: 0.5 },
        { x: 0.7, y: 0.5 },
      ];
    }

    if (count === 3) {
      // 三色：三角形分布
      return [
        { x: 0.5, y: 0.2 }, // 上
        { x: 0.2, y: 0.7 }, // 左下
        { x: 0.8, y: 0.7 }, // 右下
      ];
    }

    if (count === 4) {
      // 四色：四角 + 中心偏移
      return [
        { x: 0.25, y: 0.25 }, // 左上
        { x: 0.75, y: 0.25 }, // 右上
        { x: 0.25, y: 0.75 }, // 左下
        { x: 0.75, y: 0.75 }, // 右下
      ];
    }

    // 多色（5+）：圆形均匀分布 + 中心点
    // 先在中心放一个
    positions.push({ x: 0.5, y: 0.5 });

    // 其余颜色在圆周上均匀分布
    const remaining = count - 1;
    const angleStep = (Math.PI * 2) / remaining;
    const radiusRatio = 0.35; // 距离中心的比例

    for (let i = 0; i < remaining; i++) {
      const angle = angleStep * i - Math.PI / 2; // 从顶部开始
      const x = 0.5 + Math.cos(angle) * radiusRatio;
      const y = 0.5 + Math.sin(angle) * radiusRatio;
      positions.push({ x, y });
    }

    return positions;
  }

  /**
   * 绘制多色渐变
   */
  private drawMultiColorGradient(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    colors: { hex: string; percentage: number }[],
  ) {
    console.log("drawMultiColorGradient", colors);
    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 根据颜色数量动态生成均匀分布的位置
    const positions = this.generatePositions(colors.length);

    // 先用占比最高的颜色填充底色
    ctx.fillStyle = colors[0]!.hex;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1.0;

    colors.forEach((color, i) => {
      const pos = positions[i]!;
      const x = width * pos.x;
      const y = height * pos.y;

      // 根据 percentage 调整半径
      // percentage 越大，半径越大
      const percentageRatio = color.percentage / 100; // 转换为 0-1
      const minRadius = Math.max(width, height) * 0.4;
      const maxRadius = Math.max(width, height) * 0.7;
      const radius = minRadius + (maxRadius - minRadius) * percentageRatio;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

      // 根据 percentage 调整透明度
      // percentage 越大，越不透明
      const alphaCenter = Math.round(200 + percentageRatio * 55).toString(16); // dd - ff
      const alphaMid = Math.round(80 + percentageRatio * 52).toString(16); // 50 - 88

      gradient.addColorStop(0, color.hex + alphaCenter);
      gradient.addColorStop(0.6, color.hex + alphaMid);
      gradient.addColorStop(1, color.hex + "00");

      // 根据 percentage 调整混合模式权重
      if (i === 0) {
        ctx.globalCompositeOperation = "source-over";
      } else {
        // percentage 高的用 screen（变亮），低的用 multiply（变暗）
        ctx.globalCompositeOperation =
          percentageRatio > 0.15 ? "screen" : "multiply";
      }

      // 根据 percentage 调整整体透明度
      ctx.globalAlpha = 0.7 + percentageRatio * 0.3; // 0.7 - 1.0

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    });

    // 恢复混合模式
    ctx.globalCompositeOperation = "source-over";
  }

  // 更新
  setOptions(options: Partial<ExtractorOptions>): void {
    this.options = { ...this.options, ...options };
  }

  // 销毁
  destroy(): void {
    this.imageProcessor.destroy();
  }
}
