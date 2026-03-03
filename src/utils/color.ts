export class ColorUtils {
  /**
   * RGB 转 HEX
   */
  static rgbToHex(r: number, g: number, b: number): string {
    return (
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  }

  /**
   * RGB 转 HSL
   */
  static rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }

  /**
   * 判断颜色是否有效（根据饱和度和亮度）
   */
  static isValidColor(
    hsl: [number, number, number],
    minSaturation: number,
    minBrightness: number,
    maxBrightness: number,
  ): boolean {
    const [, s, l] = hsl;
    const saturation = s / 100;
    const lightness = l / 100;
    return (
      saturation >= minSaturation &&
      lightness >= minBrightness &&
      lightness <= maxBrightness
    );
  }

  /**
   * 计算颜色距离（欧氏距离）
   */
  static colorDistance(
    c1: [number, number, number],
    c2: [number, number, number],
  ): number {
    const dr = c1[0] - c2[0];
    const dg = c1[1] - c2[1];
    const db = c1[2] - c2[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  /**
   * K-means 聚类算法
   */
  static cluster(
    pixels: [number, number, number][],
    k: number,
    maxIterations = 10,
  ): [number, number, number][] {
    if (pixels.length === 0) return [];
    if (pixels.length <= k) return pixels;

    // 1. 随机初始化聚类中心
    let centroids = this.initCentroids(pixels, k);

    for (let iter = 0; iter < maxIterations; iter++) {
      // 2. 分配像素到最近的聚类中心
      const clusters: [number, number, number][][] = Array.from(
        { length: k },
        () => [],
      );

      pixels.forEach((pixel) => {
        const nearestIndex = this.findNearestCentroid(pixel, centroids);
        clusters[nearestIndex]!.push(pixel);
      });

      // 3. 重新计算聚类中心
      const newCentroids = clusters.map((cluster, i) =>
        cluster.length > 0 ? this.calculateCentroid(cluster) : centroids[i]!,
      );

      // 4. 检查是否收敛
      if (this.hasConverged(centroids, newCentroids)) {
        break;
      }

      centroids = newCentroids;
    }

    return centroids;
  }

  /**
   * 初始化聚类中心（K-means++）
   */
  private static initCentroids(
    pixels: [number, number, number][],
    k: number,
  ): [number, number, number][] {
    const centroids: [number, number, number][] = [];

    // 随机选择第一个中心
    centroids.push(pixels[Math.floor(Math.random() * pixels.length)]!);

    // 选择剩余的中心点
    for (let i = 1; i < k; i++) {
      const distances = pixels.map((pixel) => {
        const minDist = Math.min(
          ...centroids.map((c) => this.colorDistance(pixel, c)),
        );
        return minDist * minDist;
      });

      const totalDist = distances.reduce((sum, d) => sum + d, 0);
      let random = Math.random() * totalDist;

      for (let j = 0; j < pixels.length; j++) {
        random -= distances[j]!;
        if (random <= 0) {
          centroids.push(pixels[j]!);
          break;
        }
      }
    }

    return centroids;
  }

  /**
   * 找到最近的聚类中心
   */
  static findNearestCentroid(
    pixel: [number, number, number],
    centroids: [number, number, number][],
  ): number {
    let minDist = Infinity;
    let nearestIndex = 0;

    centroids.forEach((centroid, index) => {
      const dist = this.colorDistance(pixel, centroid);
      if (dist < minDist) {
        minDist = dist;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  }

  /**
   * 计算聚类中心（平均值）
   */
  private static calculateCentroid(
    cluster: [number, number, number][],
  ): [number, number, number] {
    const sum = cluster.reduce(
      (acc, pixel) =>
        [acc[0] + pixel[0], acc[1] + pixel[1], acc[2] + pixel[2]] as [
          number,
          number,
          number,
        ],
      [0, 0, 0] as [number, number, number],
    );
    return [
      Math.round(sum[0] / cluster.length),
      Math.round(sum[1] / cluster.length),
      Math.round(sum[2] / cluster.length),
    ];
  }

  /**
   * 检查是否收敛
   */
  private static hasConverged(
    oldCentroids: [number, number, number][],
    newCentroids: [number, number, number][],
  ): boolean {
    return oldCentroids.every(
      (old, i) => this.colorDistance(old, newCentroids[i]!) < 1,
    );
  }
}
