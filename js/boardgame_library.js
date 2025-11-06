async function loadBoardgames() {
  const response = await fetch('/boardgame_data.json');
  const data = await response.json();

  const containerRecent = document.getElementById('recent-boardgames');
  const containerAll = document.getElementById('all-boardgames');

  // 所有游戏按日期排序
  const games = Object.entries(data);
  games.sort((a, b) => {
    const lastA = a[1].records[a[1].records.length - 1]?.date || '';
    const lastB = b[1].records[b[1].records.length - 1]?.date || '';
    return new Date(lastB) - new Date(lastA);
  });

  // 最近 6 款
  const recentGames = games.slice(0, 6);
  renderGames(recentGames, containerRecent);
  renderGames(games, containerAll);

  setupModal();
}

function renderGames(games, container) {
  container.innerHTML = '';
  for (const [name, info] of games) {
    const lastRecord = info.records[info.records.length - 1];
    const date = new Date(lastRecord.date).toLocaleDateString('ja-JP');
    const hoverText = `${date}|${lastRecord.players.map(p => p.name + (p.result ? `(${p.result})` : '')).join(' vs ')}`;

    const card = document.createElement('div');
    card.className = 'boardgame-card';
    card.innerHTML = `
      <img src="/images/daily/boardgame/libaray/${name}.jpg" alt="${name}">
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
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  title.textContent = `${name}（共 ${info.count} 次）`;

  body.innerHTML = info.records.map(r => {
    const date = new Date(r.date).toLocaleDateString('ja-JP');
    const players = (r.players || []).map(p =>
      `${p.name}${p.score !== undefined ? ` ${p.score}` : ''}${p.result ? `(${p.result})` : ''}`
    ).join(' vs ');
    const duration = r.duration ? `<span class="duration">⏱${r.duration}</span>` : '';
    return `<div class="record-item">${date}|${players} ${duration}</div>`;
  }).join('');

  modal.style.display = 'flex';
}

loadBoardgames();
