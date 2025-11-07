async function loadRecentPosts() {
  try {
    const res = await fetch('/content.json'); // Hexo 自动生成
    const data = await res.json();

    // ✅ 过滤分类为“桌游”的文章（兼容字符串或数组两种形式）
    const boardgamePosts = data.filter(post => {
      const inCategory =
        post.categories &&
        post.categories.some(cat => cat.name === '桌游' || cat.slug.includes('boardgame'));
      const inTag =
        post.tags &&
        post.tags.some(tag => tag.name === '桌游');
      return inCategory || inTag;
    });

    // ✅ 按时间排序并取前 5 篇
    const posts = boardgamePosts
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    const container = document.getElementById('recent-posts');
    container.innerHTML = '';

        posts.forEach(post => {
      // ✅ 优先使用 excerpt，没有则退回 text
      const excerpt = post.excerpt || post.text || '';
      const shortExcerpt = excerpt
        .replace(/<[^>]+>/g, '')     // 去HTML标签
        .replace(/\s+/g, ' ')        // 去多余空格
        .substring(0, 11);           // 截取长度

      const card = document.createElement('a');
      card.className = 'post-card-horizontal';
      card.href = post.path.startsWith('/') ? post.path : '/' + post.path;
      card.innerHTML = `
        <div class="post-inner">
          <h3>${post.title}</h3>
          <p>${shortExcerpt}...</p>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (e) {
    console.error('加载最近文章失败:', e);
  }
}
loadRecentPosts();