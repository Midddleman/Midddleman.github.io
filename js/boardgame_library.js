document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("modal");
  if (modal && modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }
});

const boardgameSortFields = {
  lastPlayed: {
    type: 'date',
    getValue: game => game.lastDate,
    directions: [
      { value: 'desc', label: '近' },
      { value: 'asc', label: '远' }
    ]
  },
  acquired: {
    type: 'date',
    getValue: game => game.acquiredDate,
    directions: [
      { value: 'desc', label: '近' },
      { value: 'asc', label: '远' }
    ]
  },
  playCount: {
    type: 'number',
    getValue: game => game.count,
    directions: [
      { value: 'desc', label: '多' },
      { value: 'asc', label: '少' }
    ]
  },
  duration: {
    type: 'number',
    getValue: game => game.totalDuration,
    directions: [
      { value: 'desc', label: '长' },
      { value: 'asc', label: '短' }
    ]
  },
  price: {
    type: 'number',
    getValue: game => game.priceNumber,
    directions: [
      { value: 'desc', label: '高' },
      { value: 'asc', label: '低' }
    ]
  },
  pricePerPlay: {
    type: 'number',
    getValue: game => game.pricePerPlayNumber,
    directions: [
      { value: 'desc', label: '高' },
      { value: 'asc', label: '低' }
    ]
  },
  stars: {
    type: 'number',
    getValue: game => game.starsNumber,
    directions: [
      { value: 'desc', label: '高' },
      { value: 'asc', label: '低' }
    ]
  }
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
    const priceNumber = parseNumber(libInfo.price);
    const count = play?.count || 0;
    const totalDuration = play?.totalDuration || 0;
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
      priceNumber,
      pricePerPlayNumber: Number.isFinite(priceNumber) && count > 0 ? priceNumber / count : null,
      stars: libInfo.stars || '',
      starsNumber: parseNumber(libInfo.stars),
      count,
      totalDuration,
      lastDate
    };
  }).sort(createBoardgameSorter('lastPlayed', 'desc'));

  // ✅ 渲染
  renderGames(recentGames, containerRecent, 'recent');
  renderGames(allGames, containerAll, 'all');
  setupSortControls(allGames, containerAll);

  setupModal();
}

function setupSortControls(allGames, containerAll) {
  const fieldSelect = document.getElementById('boardgame-sort-field');
  const directionSelect = document.getElementById('boardgame-sort-direction');
  if (!fieldSelect || !directionSelect) return;

  const renderSortedGames = () => {
    const sorter = createBoardgameSorter(fieldSelect.value, directionSelect.value);
    renderGames([...allGames].sort(sorter), containerAll, 'all');
  };

  const syncDirectionOptions = () => {
    const field = boardgameSortFields[fieldSelect.value] || boardgameSortFields.lastPlayed;
    const previousDirection = directionSelect.value;

    directionSelect.innerHTML = field.directions
      .map(direction => `<option value="${direction.value}">${direction.label}</option>`)
      .join('');

    if (field.directions.some(direction => direction.value === previousDirection)) {
      directionSelect.value = previousDirection;
    }
  };

  fieldSelect.onchange = () => {
    syncDirectionOptions();
    renderSortedGames();
  };
  directionSelect.onchange = renderSortedGames;
  syncDirectionOptions();
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
      const category = info.category || '未分类';
      const stars = Number.isFinite(info.starsNumber) ? `${info.starsNumber}分` : '未评分';
      hoverText = `
        <div class="hover-name">《${name}》</div>
        <div class="hover-line">
          <span>${category}</span>
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
  const pricePerPlay = Number.isFinite(info.priceNumber) && info.count > 0
    ? `单次金额 ￥${formatAmount(info.priceNumber / info.count)}`
    : '单次金额未知';
  const stars = Number.isFinite(info.starsNumber) ? `${info.starsNumber}分` : '未评分';
  const metadata = `
    <div class="boardgame-meta">
      <span>${price}</span>
      <span>${pricePerPlay}</span>
      <span>${stars}</span>
      <span>${info.acquired || '入库时间未知'}</span>
      <span>${info.category || '未分类'}</span>
    </div>
  `;

  const records = [...info.records]        // 复制，不修改原数组
    .sort((a, b) => new Date(b.date) - new Date(a.date)) // 从新到旧排序
    .map(r => {
      const date = new Date(r.date).toLocaleDateString('ja-JP');
      const players = (r.players || []).map(p => {
        const score = p.score !== undefined && p.score !== null && p.score !== ''
          ? `<span class="record-player-score">${p.score}</span>`
          : '';
        const result = p.result ? `<span class="record-player-result">${p.result}</span>` : '';
        return `
          <div class="record-player">
            <span class="record-player-name">${p.name}</span>
            <span class="record-player-stats">${score}${result}</span>
          </div>
        `;
      }).join('');
      const duration = r.duration ? `<span class="duration">⏱${r.duration}</span>` : '';
      return `
        <div class="record-item">
          <div class="record-head">
            <span>${date}</span>
            ${duration}
          </div>
          <div class="record-players">${players}</div>
        </div>
      `;
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

function formatAmount(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function createBoardgameSorter(fieldName, direction) {
  const field = boardgameSortFields[fieldName] || boardgameSortFields.lastPlayed;
  return (a, b) => {
    const aValue = field.getValue(a);
    const bValue = field.getValue(b);
    const result = field.type === 'date'
      ? compareDates(aValue, bValue, direction)
      : compareNumbers(aValue, bValue, direction);
    return result || compareNames(a, b);
  };
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

function compareDates(a, b, direction) {
  const aTime = a instanceof Date && !Number.isNaN(a.getTime()) ? a.getTime() : null;
  const bTime = b instanceof Date && !Number.isNaN(b.getTime()) ? b.getTime() : null;
  const aKnown = aTime !== null && aTime > 0;
  const bKnown = bTime !== null && bTime > 0;
  if (aKnown && !bKnown) return -1;
  if (!aKnown && bKnown) return 1;
  if (!aKnown && !bKnown) return 0;
  return direction === 'asc' ? aTime - bTime : bTime - aTime;
}

function compareNames(a, b) {
  return a.name.localeCompare(b.name, 'zh-Hans');
}

loadBoardgames();
