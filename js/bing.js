document.addEventListener("DOMContentLoaded", () => {
  fetch("https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN")
    .then(res => res.json())
    .then(data => {
      const imgUrl = "https://www.bing.com" + data.images[0].url;
      console.log("Bing 壁纸 URL:", imgUrl);
      document.body.style.setProperty(
        "background",
        `url(${imgUrl}) center center / cover no-repeat fixed`,
        "important"
      );
    })
    .catch(err => console.error("获取 Bing 壁纸失败:", err));
});