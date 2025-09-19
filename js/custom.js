document.addEventListener("DOMContentLoaded", function() {
  const img = document.querySelector("#loading-screen img"); // 假设壁纸在这里
  if (!img) return;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  img.onload = function() {
    // 缩小取样
    canvas.width = 20;
    canvas.height = 20;
    ctx.drawImage(img, 0, 0, 20, 20);

    const imageData = ctx.getImageData(0, 0, 20, 20).data;
    let r, g, b, avg;
    let colorSum = 0;

    for (let x = 0; x < imageData.length; x += 4) {
      r = imageData[x];
      g = imageData[x + 1];
      b = imageData[x + 2];
      avg = (0.299 * r + 0.587 * g + 0.114 * b);
      colorSum += avg;
    }

    const brightness = colorSum / (imageData.length / 4);
    const html = document.documentElement;

    if (brightness < 128) {
      localStorage.setItem("darkmode", "dark");   // 覆盖掉旧值
      html.setAttribute("data-theme", "dark");
    } else {
      localStorage.setItem("darkmode", "light");  // 覆盖掉旧值
      html.setAttribute("data-theme", "light");
    }
  };
});