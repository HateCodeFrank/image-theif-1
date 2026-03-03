export interface ColorInfo {
  rgb: [number, number, number];
  hex: string;
  hsl: [number, number, number];
  percentage: number;
}

export interface ExtractorOptions {
  el?: HTMLDivElement; // 渐变背景容器元素
  colorCount?: number; // 提取颜色数量，默认 6
  quality?: number; // 采样质量 1-10，默认 10 (1最快)
  minSaturation?: number; // 最小饱和度 0-1，默认 0.2
  minBrightness?: number; // 最小亮度 0-1，默认 0.2
  maxBrightness?: number; // 最大亮度 0-1，默认 0.9
}

export type ImageSource = File | string;
