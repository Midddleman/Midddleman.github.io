document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("modal");
  if (modal && modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }
});

const boardgameSorters = {
  lastPlayedDesc: (a, b) => compareDates(b.lastDate, a.lastDate) || compareNames(a, b),
  priceDesc: (a, b) => compareNumbers(a.priceNumber, b.priceNumber, 'desc') || compareNames(a, b),
  priceAsc: (a, b) => compareNumbers(a.priceNumber, b.priceNumber, 'asc') || compareNames(a, b),
  acquiredDesc: (a, b) => compareDates(b.acquiredDate, a.acquiredDate) || compareNames(a, b),
  playCountDesc: (a, b) => compareNumbers(a.count, b.count, 'desc') || compareNames(a, b),
  durationDesc: (a, b) => compareNumbers(a.totalDuration, b.totalDuration, 'desc') || compareNames(a, b),
  starsDesc: (a, b) => compareNumbers(a.starsNumber, b.starsNumber, 'desc') || compareNames(a, b),
  nameAsc: compareNames
};

async function loadBoardgames() {
  // ✅ 1. 读取所有拥有的游戏（静态库）
  const libraryRes = await fetch('/boardgame_list.json');
  const libraryData = await libraryRes.json();

  // ✅ 2. 读取动态游玩数据（有记录的游戏）
  const playRes = await fetch('/boardgame_data.json');
  const playData = await playRes.json();

  const containerRecent = document.getElementById('recent-boardgames');
  const containerAll = document.getElementById('all-boardgames');

  // ✅ 3. 最近桌游 —— 仅有游玩记录的，从 playData 排序
  const recentGames = Object.entries(playData)
    .map(([name, info]) => {
      if (info.records) {
        info.records.sort((a, b) => new Date(a.date) - new Date(b.date));
      }
      const lastRecord = info.records?.[info.records.length - 1];
      const lastDate = lastRecord ? new Date(lastRecord.date) : new Date(0);
      return { name, ...info, lastDate };
    })
    .sort((a, b) => b.lastDate - a.lastDate)
    .slice(0, 6);

  // ✅ 4. 全部桌游 —— 从 libraryData 获取，附加 playData 中的统计
  const allGames = Object.entries(libraryData).map(([name, libInfo]) => {
    const play = playData[name];
    if (play?.records) {
    play.records.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    const lastRecord = play?.records?.[play.records.length - 1];
    const lastDate = lastRecord ? new Date(lastRecord.date) : new Date(0);
    return {
      name,
      cover: libInfo.cover,
      records: play?.records || [],
      owned: libInfo.owned || 'owned', 
      acquired: libInfo.acquired || '',
      acquiredDate: parseDate(libInfo.acquired),
      category: libInfo.category || '',
      extension: libInfo.extension || '0',
      extensionname: libInfo.extensionname || '',
      price: libInfo.price || '',
      priceNumber: parseNumber(libInfo.price),
      stars: libInfo.stars || '',
      starsNumber: parseNumber(libInfo.stars),
      count: play?.count || 0,
      totalDuration: play?.totalDuration || 0,
      lastDate
    };
  }).sort(boardgameSorters.lastPlayedDesc);

  // ✅ 渲染
  renderGames(recentGames, containerRecent, 'recent');
  renderGames(allGames, containerAll, 'all');
  setupSortControls(allGames, containerAll);

  setupModal();
}

function setupSortControls(allGames, containerAll) {
  const sortSelect = document.getElementById('boardgame-sort');
  if (!sortSelect) return;

  sortSelect.onchange = () => {
    const sorter = boardgameSorters[sortSelect.value] || boardgameSorters.lastPlayedDesc;
    renderGames([...allGames].sort(sorter), containerAll, 'all');
  };
}

function renderGames(games, container, type) {
  container.innerHTML = '';
  container.className = `boardgame-row ${type}`;
  for (const game of games) {
    const name = game.name;
    const info = game;
    const lastRecord = info.records?.[info.records.length - 1];
    const date = lastRecord ? new Date(lastRecord.date).toLocaleDateString('ja-JP') : '';
    const duration = lastRecord?.duration || '';

    let hoverText = '';

    if (type === 'recent') {
      // ✅ 最近桌游的 hover 样式
      hoverText = `
        <div class="hover-name">《${name}》</div>
        <div class="hover-line">
          <span class="hover-date">${date}</span>
          <span class="hover-duration">${duration}</span>
        </div>
        <div class="hover-players">
          ${(lastRecord?.players || [])
            .map(p => p.name + (p.result ? `(${p.result})` : ''))
            .join(' vs ')}
        </div>
      `;
    } else {
      // ✅ 全部桌游的 hover 样式
      const price = Number.isFinite(info.priceNumber) ? `￥${info.priceNumber}` : '价格未知';
      const stars = Number.isFinite(info.starsNumber) ? `${info.starsNumber}分` : '未评分';
      hoverText = `
        <div class="hover-name">《${name}》</div>
        <div class="hover-line">
          <span>${price}</span>
          <span>${stars}</span>
        </div>
        <div class="hover-players">共 ${info.count} 次游玩｜${info.totalDuration || 0}h</div>
      `;
    }

    const card = document.createElement('div');
    card.className = `boardgame-card ${type}`;

    // ✅ 1. 是否需要显示 ribbon
    const notOwnedRibbon =
      type === 'all' && info.owned === 'not owned'
        ? `<div class="ribbon not-owned">不在库中</div>`
        : '';

    card.innerHTML = `
      ${notOwnedRibbon}
      <img src="${info.cover || `/images/daily/boardgame/library/${name}.webp`}" 
          onerror="this.onerror=null;this.src='/images/daily/boardgame/library/default.png';" 
          alt="${name}">
      <div class="boardgame-hover">${hoverText}</div>
    `;


    card.onclick = () => showModal(name, info);
    container.appendChild(card);
  }
}

function setupModal() {
  const modal = document.getElementById('modal');
  const close = document.querySelector('.close');
  close.onclick = () => modal.style.display = 'none';
  modal.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };
}

function showModal(name, info) {
  const modal = document.getElementById('modal');
  const content = document.querySelector('.modal-content');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  // ✅ 设置标题与内容
  title.textContent = `《${name}》 （共 ${info.count} 次）`;

  const price = Number.isFinite(info.priceNumber) ? `￥${info.priceNumber}` : '价格未知';
  const stars = Number.isFinite(info.starsNumber) ? `${info.starsNumber}分` : '未评分';
  const metadata = `
    <div class="boardgame-meta">
      <span>${price}</span>
      <span>${stars}</span>
      <span>${info.acquired || '入库时间未知'}</span>
      <span>${info.category || '未分类'}</span>
    </div>
  `;

  const records = [...info.records]        // 复制，不修改原数组
    .sort((a, b) => new Date(b.date) - new Date(a.date)) // 从新到旧排序
    .map(r => {
      const date = new Date(r.date).toLocaleDateString('ja-JP');
      const players = (r.players || []).map(p =>
        `${p.name}${p.score !== undefined ? ` ${p.score}` : ''}${p.result ? `(${p.result})` : ''}`
      ).join(' vs ');
      const duration = r.duration ? `<span class="duration">⏱${r.duration}</span>` : '';
      return `<div class="record-item">${date}｜${players} ${duration}</div>`;
    }).join('');

  body.innerHTML = metadata + (records || '<div class="record-item">还没有游玩记录</div>');

  // ✅ 设置背景图片 + 蒙版
  content.style.background = `
    linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.9)),
    url('/images/daily/boardgame/library/${name}.webp')
  `;
  content.style.backgroundSize = 'cover';
  content.style.backgroundPosition = 'center';
  content.style.backgroundRepeat = 'no-repeat';

  // ✅ 显示弹窗（这一步是关键）
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';


}

function parseNumber(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : null;
}

function parseDate(value) {
  const normalized = value ? String(value).trim().replace(/\//g, '-') : '';
  const date = normalized ? new Date(normalized) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function compareNumbers(a, b, direction) {
  const aKnown = Number.isFinite(a);
  const bKnown = Number.isFinite(b);
  if (aKnown && !bKnown) return -1;
  if (!aKnown && bKnown) return 1;
  if (!aKnown && !bKnown) return 0;
  return direction === 'asc' ? a - b : b - a;
}

function compareDates(a, b) {
  const aTime = a instanceof Date ? a.getTime() : 0;
  const bTime = b instanceof Date ? b.getTime() : 0;
  return aTime - bTime;
}

function compareNames(a, b) {
  return a.name.localeCompare(b.name, 'zh-Hans');
}

loadBoardgames();
