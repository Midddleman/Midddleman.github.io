(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatHours = value => value === null || value === undefined ? '未显示时长' : value < 1 ? `${Math.round(value * 60)} 分钟` : `${value.toLocaleString('zh-CN', {maximumFractionDigits: 1})} 小时`;
  const image = game => `<img src="${escape(game.localImage || game.image)}" alt="${escape(game.name)}" loading="lazy" width="460" height="215" onerror="this.hidden=true">`;
  const store = game => `https://store.steampowered.com/app/${encodeURIComponent(game.appId)}/`;
  const notes = {
    '1172470': ['时长最多，也最有意见', '859.8 小时的常驻游戏，Steam 上却是不推荐。熟悉并不妨碍吐槽。'],
    '646570': ['我的 Steam 启蒙', '二代评测里写下了对初遇尖塔的怀念。两代合计约 190 小时，构筑的吸引力一直在。'],
    '673950': ['一起经营的温馨', '比起进度和效率，评测里留下的是一起打理农场的感觉。'],
    '413150': ['主页上最喜欢的游戏', 'Steam 最喜爱的游戏展示位，以及一篇只有“逃离现实”的推荐。'],
    '1617400': ['另一种构筑的吸引力', '99.2 小时。从卡牌到物品组合，反复尝试不同路线的兴趣还在。'],
    '1086940': ['留给异世界的长假', '65.4 小时。加上神界原罪 2 的 81.9 小时，RPG 在这里也占了不小的位置。']
  };
  async function init() {
    const state = document.getElementById('vg-load-state');
    try {
      const response = await fetch('/steam_games.json');
      if (!response.ok) throw new Error('游戏数据暂时无法读取');
      const data = await response.json();
      const byId = new Map(data.games.map(g => [g.appId, g]));
      document.getElementById('vg-stats').innerHTML = [[data.profileGameCount,'Steam 主页游戏数'],[data.libraryEntryCount,'库列表条目（含试玩与软件）'],[data.twoWeekHours,'过去两周记录小时'],[7,'已发布评测']].map(([value,label])=>`<div><strong>${value}</strong><span>${label}</span></div>`).join('');
      document.getElementById('vg-featured').innerHTML = data.featuredIds.map(id => {
        const g = byId.get(id), note = notes[id];
        return `<article class="vg-game-feature">${image(g)}<div class="vg-feature-body"><div class="vg-feature-meta"><span>${escape(g.category)}</span><strong>${formatHours(g.hours)}</strong></div><h3><a href="${store(g)}" target="_blank" rel="noopener noreferrer">${escape(g.name)} ↗</a></h3><h4>${escape(note[0])}</h4><p>${escape(note[1])}</p></div></article>`;
      }).join('');
      document.getElementById('vg-recent-grid').innerHTML = data.recentIds.map(id=>{const g=byId.get(id);return `<a class="vg-recent-card" href="${store(g)}" target="_blank" rel="noopener noreferrer">${image(g)}<div><span>近期游玩</span><h3>${escape(g.name)}</h3><p>两周内 ${formatHours(g.recentHours)} · 累计 ${formatHours(g.hours)}</p></div></a>`;}).join('');
      document.getElementById('vg-review-list').innerHTML = Object.entries(data.reviews).map(([id,r])=>{const g=byId.get(id);return `<a class="vg-review" href="${escape(data.profile)}recommended/${id}/" target="_blank" rel="noopener noreferrer"><div><span class="vg-review-verdict ${r.recommend?'':'vg-negative'}">${r.recommend?'推荐':'不推荐'}</span><time>${escape(r.date)}</time></div><h3>${escape(g.name)}</h3><p>${escape(r.text)}</p><span class="vg-review-source">Steam 评测原文 ↗</span></a>`;}).join('');
      const category = document.getElementById('vg-category'), search = document.getElementById('vg-search'), played = document.getElementById('vg-played'), sort = document.getElementById('vg-sort'), more = document.getElementById('vg-load-more');
      category.innerHTML += [...new Set(data.games.map(g=>g.category))].sort((a,b)=>a.localeCompare(b,'zh-CN')).map(c=>`<option value="${escape(c)}">${escape(c)}</option>`).join('');
      let limit=24;
      function render(reset=true) {
        if(reset) limit=24;
        const query=search.value.trim().toLocaleLowerCase();
        const games=data.games.filter(g=>(category.value?g.category===category.value:g.category!=='工具')&&(!query||`${g.name} ${g.appId}`.toLocaleLowerCase().includes(query))&&(!played.value||(played.value==='played'?g.hours!==null:g.hours===null)));
        games.sort(sort.value==='name'?(a,b)=>a.name.localeCompare(b.name,'zh-CN'):(a,b)=>(b.hours??-1)-(a.hours??-1)||a.name.localeCompare(b.name,'zh-CN'));
        document.getElementById('vg-library-count').textContent=`${games.length} 个条目 · 显示 ${Math.min(limit,games.length)} 个`;
        document.getElementById('vg-library-grid').innerHTML=games.slice(0,limit).map(g=>`<a class="vg-library-card" href="${store(g)}" target="_blank" rel="noopener noreferrer">${image(g)}<div><h3>${escape(g.name)}</h3><p><span>${escape(g.category)}</span><strong>${formatHours(g.hours)}</strong></p>${g.achievements?`<small>成就 ${escape(g.achievements)}</small>`:''}</div></a>`).join('');
        state.textContent=games.length?'':'没有符合条件的游戏。';
        more.hidden=games.length<=limit;
      }
      search.addEventListener('input',()=>render());[category,played,sort].forEach(el=>el.addEventListener('change',()=>render()));more.addEventListener('click',()=>{limit+=24;render(false);});render();
    } catch(error) { state.textContent='游戏记录暂时无法读取，请稍后刷新。也可以通过页面顶部访问我的 Steam 主页。'; console.error(error); }
  }
  init();
})();
