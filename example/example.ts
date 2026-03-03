import { ImageTheif } from "../src/core";
// 获取 DOM 元素
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const preview = document.getElementById("preview") as HTMLImageElement;
const colorPalette = document.getElementById("colorPalette") as HTMLDivElement;
const wrapper = document.getElementById("wrapper") as HTMLDivElement;
const loading = document.getElementById("loading") as HTMLDivElement;

// 创建实例
const theif = new ImageTheif({
  colorCount: 6,
  quality: 10,
  el: wrapper,
});

// 监听文件选择
fileInput.addEventListener("change", async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    // 显示加载状态
    loading.style.display = "block";
    colorPalette.innerHTML = "";

    // 预览图片
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target?.result as string;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);

    // 提取颜色
    const colors = await theif.extract(file);

    // 打印到控制台
    console.log("提取的颜色:", colors);
    console.table(colors);

    // 创建渐变背景
    loading.style.display = "none";
    theif.createGradientBackground(colors);
    const colorList = colorPalette;
    colors.forEach((color) => {
      const colorItem = document.createElement("div");
      colorItem.style.cssText = `
        padding: 8px 16px;
        background: ${color.hex};
        color: ${color.hsl[2] > 50 ? "#000" : "#fff"};
        border-radius: 8px;
        font-size: 12px;
        font-weight: bold;
      `;
      colorItem.textContent = `${color.hex} (${color.percentage}%)`;
      colorList.appendChild(colorItem);
    });
  } catch (error) {
    console.error("颜色提取失败:", error);
    loading.style.display = "none";
    alert("颜色提取失败，请重试");
  }
});

// 页面卸载时销毁实例
window.addEventListener("beforeunload", () => {
  theif.destroy();
});
