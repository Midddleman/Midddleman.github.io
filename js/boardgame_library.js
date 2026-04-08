document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("modal");
  if (modal && modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }
});

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
      count: play?.count || 0,
      totalDuration: play?.totalDuration || 0,
      lastDate
    };
  }).sort((a, b) => b.lastDate - a.lastDate);

  // ✅ 渲染
  renderGames(recentGames, containerRecent, 'recent');
  renderGames(allGames, containerAll, 'all');

  setupModal();
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
      hoverText = `
        <div class="hover-name">《${name}》</div>
        <div class="hover-line">共 ${info.count} 次游玩</div>
        <div class="hover-players">总时长：${info.totalDuration || 0}h</div>
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

  body.innerHTML = [...info.records]        // 复制，不修改原数组
  .sort((a, b) => new Date(b.date) - new Date(a.date)) // 从新到旧排序
  .map(r => {
    const date = new Date(r.date).toLocaleDateString('ja-JP');
    const players = (r.players || []).map(p =>
      `${p.name}${p.score !== undefined ? ` ${p.score}` : ''}${p.result ? `(${p.result})` : ''}`
    ).join(' vs ');
    const duration = r.duration ? `<span class="duration">⏱${r.duration}</span>` : '';
    return `<div class="record-item">${date}｜${players} ${duration}</div>`;
  }).join('');

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

loadBoardgames();
