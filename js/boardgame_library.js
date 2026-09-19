document.addEventListener("DOMContentLoaded", () => {
  ['modal', 'head-to-head-modal', 'game-recommend-modal'].forEach(id => {
    const modal = document.getElementById(id);
    if (modal && modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
  });
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
  pricePerHour: {
    type: 'number',
    getValue: game => game.pricePerHourNumber,
    directions: [
      { value: 'desc', label: '高' },
      { value: 'asc', label: '低' }
    ]
  },
  pricePerPersonHour: {
    type: 'number',
    getValue: game => game.pricePerPersonHourNumber,
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

  const buildGameInfo = (name, libInfo = {}, play = null) => {
    if (play?.records) {
      play.records.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    const firstRecord = play?.records?.[0];
    const lastRecord = play?.records?.[play.records.length - 1];
    const firstDate = firstRecord ? new Date(firstRecord.date) : new Date(0);
    const lastDate = lastRecord ? new Date(lastRecord.date) : new Date(0);
    const priceNumber = parseNumber(libInfo.price);
    const count = play?.count || 0;
    const totalDuration = play?.totalDuration || 0;
    const totalPersonDuration = getTotalPersonDuration(play?.records || []);
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
      pricePerHourNumber: Number.isFinite(priceNumber) && totalDuration > 0 ? priceNumber / totalDuration : null,
      pricePerPersonHourNumber: Number.isFinite(priceNumber) && totalPersonDuration > 0 ? priceNumber / totalPersonDuration : null,
      stars: libInfo.stars || '',
      starsNumber: parseNumber(libInfo.stars),
      supportedPlayers: libInfo.players || '',
      bestPlayers: libInfo.bestPlayers || '',
      count,
      totalDuration,
      totalPersonDuration,
      firstDate,
      lastDate
    };
  };

  // ✅ 3. 最近桌游 —— 仅有游玩记录的，从 playData 排序
  const recentGames = Object.entries(playData)
    .map(([name, play]) => buildGameInfo(name, libraryData[name] || {}, play))
    .sort((a, b) => b.lastDate - a.lastDate)
    .slice(0, 6);

  // ✅ 4. 全部桌游 —— 从 libraryData 获取，附加 playData 中的统计
  const allGames = Object.entries(libraryData)
    .map(([name, libInfo]) => buildGameInfo(name, libInfo, playData[name]))
    .sort(createBoardgameSorter('lastPlayed', 'desc'));

  // ✅ 渲染
  renderGames(recentGames, containerRecent, 'recent');
  renderGames(allGames, containerAll, 'all');
  setupSortControls(allGames, containerAll);

  setupModal();
  setupHeadToHead(playData);
  setupGameRecommendation(libraryData, allGames);
}

function setupSortControls(allGames, containerAll) {
  const fieldSelect = document.getElementById('boardgame-sort-field');
  const directionSelect = document.getElementById('boardgame-sort-direction');
  const playersSelect = document.getElementById('boardgame-filter-players');
  const bestPlayersSelect = document.getElementById('boardgame-filter-best-players');
  const categorySelect = document.getElementById('boardgame-filter-category');
  if (!fieldSelect || !directionSelect || !playersSelect || !bestPlayersSelect || !categorySelect) return;

  const playerOptions = Array.from({ length: 14 }, (_, index) => {
    const count = index + 1;
    return `<option value="${count}">${count === 14 ? '14+' : count} 人</option>`;
  }).join('');
  playersSelect.innerHTML = '<option value="">可玩人数：全部</option>' + playerOptions;
  bestPlayersSelect.innerHTML = '<option value="">最佳人数：全部</option>' + playerOptions;

  const categories = [...new Set(allGames.flatMap(game => getGameCategories(game.category)))]
    .sort((a, b) => a.localeCompare(b, 'zh-Hans'));
  categorySelect.innerHTML = '<option value="">种类：全部</option>' + categories
    .map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join('');

  const renderSortedGames = () => {
    const sorter = createBoardgameSorter(fieldSelect.value, directionSelect.value);
    const filteredGames = filterBoardgames(
      allGames,
      playersSelect.value,
      bestPlayersSelect.value,
      categorySelect.value
    );
    renderGames([...filteredGames].sort(sorter), containerAll, 'all');
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
  playersSelect.onchange = renderSortedGames;
  bestPlayersSelect.onchange = renderSortedGames;
  categorySelect.onchange = renderSortedGames;
  syncDirectionOptions();
}

function filterBoardgames(games, playablePlayers, bestPlayers, category) {
  const playableCount = playablePlayers === '' ? null : Number(playablePlayers);
  const bestCount = bestPlayers === '' ? null : Number(bestPlayers);
  return games.filter(game => {
    if (Number.isFinite(playableCount) && !playerCountMatches(game.supportedPlayers, playableCount)) return false;
    if (Number.isFinite(bestCount) && !playerCountMatches(game.bestPlayers, bestCount)) return false;
    if (category && !getGameCategories(game.category).includes(category)) return false;
    return true;
  });
}

function renderGames(games, container, type) {
  container.innerHTML = '';
  container.className = `boardgame-row ${type}`;
  if (!games.length) {
    container.innerHTML = '<div class="boardgame-filter-empty">没有符合当前筛选条件的桌游。</div>';
    return;
  }
  for (const game of games) {
    const name = game.name;
    const info = game;
    const firstDateText = formatDate(info.firstDate);
    const lastDateText = formatDate(info.lastDate);
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
        <div class="hover-line hover-play-range">
          <span>First ${firstDateText || '未知'}</span>
          <span>Last ${lastDateText || '未知'}</span>
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
        <div class="hover-line hover-play-range">
          <span>First ${firstDateText || '未知'}</span>
          <span>Last ${lastDateText || '未知'}</span>
        </div>
        <div class="hover-players">共 ${info.count} 次游玩｜${info.totalDuration || 0}h</div>
      `;
    }

    hoverText += renderPlayerCountPanel(info, true);

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
  const pricePerHour = Number.isFinite(info.pricePerHourNumber)
    ? `单位小时 ￥${formatAmount(info.pricePerHourNumber)}/h`
    : '单位小时未知';
  const pricePerPersonHour = Number.isFinite(info.pricePerPersonHourNumber)
    ? `人时单价 ￥${formatAmount(info.pricePerPersonHourNumber)}/人*h`
    : '人时单价未知';
  const stars = Number.isFinite(info.starsNumber) ? `${info.starsNumber}分` : '未评分';
  const firstDate = formatDate(info.firstDate) || '首次游玩未知';
  const lastDate = formatDate(info.lastDate) || '最近游玩未知';
  const averageTime = info.count > 0 && Number.isFinite(info.totalDuration)
    ? `${formatAmount(info.totalDuration / info.count)}h`
    : '未知';
  const metadata = `
    <div class="boardgame-meta">
      <span>${price}</span>
      <span>${pricePerPlay}</span>
      <span>${pricePerHour}</span>
      <span>${pricePerPersonHour}</span>
      <span>${stars}</span>
      <span>${info.acquired || '入库时间未知'}</span>
      <span>First Play ${firstDate}</span>
      <span>Last Play ${lastDate}</span>
      <span>${info.category || '未分类'}</span>
    </div>
  `;
  const playerCounts = renderPlayerCountPanel(info);
  const scoreStats = renderScoreStats(info.records || [], averageTime);
  const personalBests = getPersonalBestScores(info.records || []);

  const records = [...info.records]        // 复制，不修改原数组
    .sort((a, b) => new Date(b.date) - new Date(a.date)) // 从新到旧排序
    .map(r => {
      const date = new Date(r.date).toLocaleDateString('ja-JP');
      const players = (r.players || []).map(p => {
        const scoreNumber = parseNumber(p.score);
        const isPersonalBest = Number.isFinite(scoreNumber)
          && Number.isFinite(personalBests[p.name])
          && scoreNumber === personalBests[p.name];
        const score = p.score !== undefined && p.score !== null && p.score !== ''
          ? `<span class="record-player-score">${p.score}${isPersonalBest ? '<span class="personal-best">PB</span>' : ''}</span>`
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

  body.innerHTML = metadata + playerCounts + scoreStats + (records || '<div class="record-item">还没有游玩记录</div>');

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

function setupGameRecommendation(libraryData, allGames) {
  const modal = document.getElementById('game-recommend-modal');
  const openButton = document.getElementById('game-recommend-open');
  const closeButton = modal?.querySelector('.game-recommend-close');
  const playersInput = document.getElementById('game-recommend-players');
  const categorySelect = document.getElementById('game-recommend-category');
  const pickButton = document.getElementById('game-recommend-pick');
  const status = document.getElementById('game-recommend-status');
  const result = document.getElementById('game-recommend-result');
  if (!modal || !openButton || !closeButton || !playersInput || !categorySelect || !pickButton || !status || !result) return;

  const gameInfo = new Map(allGames.map(game => [game.name, game]));
  const categories = [...new Set(Object.values(libraryData).flatMap(game => getGameCategories(game.category)))]
    .sort((a, b) => a.localeCompare(b, 'zh-Hans'));
  categorySelect.innerHTML = '<option value="">全部标签</option>' + categories
    .map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join('');

  let attempts = 0;
  let seen = new Set();

  const reset = () => {
    attempts = 0;
    seen = new Set();
    status.textContent = '';
    result.innerHTML = '<div class="game-recommend-placeholder">选择人数后，让桌游库替你决定。</div>';
  };
  const close = () => {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  };

  openButton.addEventListener('click', () => {
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    playersInput.focus();
  });
  closeButton.addEventListener('click', close);
  modal.addEventListener('click', event => {
    if (event.target === modal) close();
  });
  playersInput.addEventListener('input', reset);
  categorySelect.addEventListener('change', reset);

  pickButton.addEventListener('click', () => {
    const playerCount = Number.parseInt(playersInput.value, 10);
    if (!Number.isInteger(playerCount) || playerCount < 1) {
      status.textContent = '请输入正确的玩家人数。';
      return;
    }

    attempts += 1;
    const broadened = attempts > 5;
    let candidates = getRecommendationCandidates(libraryData, playerCount, categorySelect.value, broadened);
    let fallback = false;
    if (!candidates.length && !broadened) {
      candidates = getRecommendationCandidates(libraryData, playerCount, categorySelect.value, true);
      fallback = true;
    }
    if (!candidates.length) {
      status.textContent = '没有找到符合人数和标签的库内游戏。';
      result.innerHTML = '<div class="game-recommend-placeholder">换个人数或标签试试看。</div>';
      return;
    }

    let available = candidates.filter(([name]) => !seen.has(name));
    if (!available.length) {
      seen = new Set();
      available = candidates;
    }
    const [name, game] = available[Math.floor(Math.random() * available.length)];
    seen.add(name);

    const modeText = broadened
      ? '已扩大到可玩人数匹配'
      : fallback
        ? '暂无最佳人数匹配，改从可玩人数推荐'
        : `优先最佳人数匹配（${attempts}/5）`;
    status.textContent = modeText;
    result.innerHTML = renderGameRecommendation(name, game);
    const resultCard = result.querySelector('.game-recommend-card');
    resultCard?.addEventListener('click', () => {
      close();
      const info = gameInfo.get(name);
      if (info) showModal(name, info);
    });
  });
}

function getGameCategories(value) {
  return String(value || '')
    .split(/[,，、/]/)
    .map(category => category.trim())
    .filter(Boolean);
}

function playerCountMatches(value, playerCount) {
  return String(value || '').split(',').some(part => {
    const normalized = part.trim();
    if (!normalized) return false;
    const plus = normalized.match(/^(\d+)\+$/);
    if (plus) return playerCount >= Number(plus[1]);
    const range = normalized.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) return playerCount >= Number(range[1]) && playerCount <= Number(range[2]);
    return playerCount === Number(normalized);
  });
}

function getRecommendationCandidates(libraryData, playerCount, category, broadened) {
  return Object.entries(libraryData).filter(([, game]) => {
    if (game.owned === 'not owned') return false;
    if (category && !getGameCategories(game.category).includes(category)) return false;
    const playerRange = broadened ? game.players : game.bestPlayers;
    return playerCountMatches(playerRange, playerCount);
  });
}

function renderGameRecommendation(name, game) {
  const cover = game.cover || `/images/daily/boardgame/library/${name}.webp`;
  const category = game.category || '未分类';
  const counts = renderPlayerCountPanel({
    supportedPlayers: game.players || '',
    bestPlayers: game.bestPlayers || ''
  }, true);
  return `
    <button class="game-recommend-card" type="button">
      <img src="${escapeHtml(cover)}" onerror="this.onerror=null;this.src='/images/daily/boardgame/library/default.png';" alt="${escapeHtml(name)}">
      <div class="game-recommend-info">
        <strong>《${escapeHtml(name)}》</strong>
        <span>${escapeHtml(category)}</span>
        <small>可玩 ${escapeHtml(game.players || '未知')} · 最佳 ${escapeHtml(game.bestPlayers || '暂无')}</small>
        ${counts}
      </div>
    </button>
  `;
}

function setupHeadToHead(playData) {
  const modal = document.getElementById('head-to-head-modal');
  const openButton = document.getElementById('head-to-head-open');
  const closeButton = modal?.querySelector('.head-to-head-close');
  const playerASelect = document.getElementById('head-to-head-player-a');
  const playerBSelect = document.getElementById('head-to-head-player-b');
  const gameSelect = document.getElementById('head-to-head-game');
  const results = document.getElementById('head-to-head-results');
  if (!modal || !openButton || !closeButton || !playerASelect || !playerBSelect || !gameSelect || !results) return;

  const players = getRecordedPlayers(playData);
  const playerOptions = players
    .map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    .join('');
  playerASelect.innerHTML = playerOptions;
  playerBSelect.innerHTML = playerOptions;
  const defaultPair = getMostPlayedHeadToHeadPair(playData, players);
  if (defaultPair) {
    playerASelect.value = defaultPair[0];
    playerBSelect.value = defaultPair[1];
  } else if (players.length > 1) {
    playerBSelect.selectedIndex = 1;
  }

  const close = () => {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  };

  const keepPlayersDifferent = changedSelect => {
    if (playerASelect.value !== playerBSelect.value || players.length < 2) return;
    const otherSelect = changedSelect === playerASelect ? playerBSelect : playerASelect;
    const nextPlayer = players.find(name => name !== changedSelect.value);
    if (nextPlayer) otherSelect.value = nextPlayer;
  };

  const refresh = (refreshGames = false) => {
    const playerA = playerASelect.value;
    const playerB = playerBSelect.value;
    const allMatches = getHeadToHeadMatches(playData, playerA, playerB);

    if (refreshGames) {
      const previousGame = gameSelect.value;
      const games = [...new Set(allMatches.map(match => match.game))]
        .sort((a, b) => a.localeCompare(b, 'zh-Hans'));
      gameSelect.innerHTML = '<option value="">全部游戏</option>' + games
        .map(game => `<option value="${escapeHtml(game)}">${escapeHtml(game)}</option>`)
        .join('');
      if (games.includes(previousGame)) gameSelect.value = previousGame;
    }

    renderHeadToHeadResults(results, allMatches, playerA, playerB, gameSelect.value);
  };

  const open = () => {
    refresh(true);
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
  };

  openButton.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  modal.addEventListener('click', event => {
    if (event.target === modal) close();
  });
  playerASelect.addEventListener('change', () => {
    keepPlayersDifferent(playerASelect);
    refresh(true);
  });
  playerBSelect.addEventListener('change', () => {
    keepPlayersDifferent(playerBSelect);
    refresh(true);
  });
  gameSelect.addEventListener('change', () => refresh(false));

  if (window.location.hash === '#head-to-head') {
    open();
  }
}

function getRecordedPlayers(playData) {
  const players = new Set();
  Object.values(playData).forEach(game => {
    (game.records || []).forEach(record => {
      (record.players || []).forEach(player => {
        if (player.name) players.add(player.name);
      });
    });
  });
  return [...players].sort((a, b) => a.localeCompare(b, 'zh-Hans'));
}

function getMostPlayedHeadToHeadPair(playData, players) {
  let bestPair = null;
  let bestCount = 0;
  for (let first = 0; first < players.length; first += 1) {
    for (let second = first + 1; second < players.length; second += 1) {
      const count = getHeadToHeadMatches(playData, players[first], players[second]).length;
      if (count > bestCount) {
        bestCount = count;
        bestPair = [players[first], players[second]];
      }
    }
  }
  return bestPair;
}

function getHeadToHeadMatches(playData, playerA, playerB) {
  if (!playerA || !playerB || playerA === playerB) return [];
  const matches = [];

  Object.entries(playData).forEach(([game, gameData]) => {
    (gameData.records || []).forEach(record => {
      const participantA = (record.players || []).find(player => player.name === playerA);
      const participantB = (record.players || []).find(player => player.name === playerB);
      const scoreA = parseNumber(participantA?.score);
      const scoreB = parseNumber(participantB?.score);
      if (!participantA || !participantB) return;
      if (isCooperativeRecord(record) || arePlayersOnSameSide(participantA, participantB)) return;

      matches.push({
        game,
        date: record.date || '',
        scoreA,
        scoreB,
        winner: resolveHeadToHeadWinner(participantA, participantB, scoreA, scoreB)
      });
    });
  });

  return matches.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function normalizeGameResult(result) {
  const value = String(result || '').trim();
  if (value.includes('胜')) return 'win';
  if (value.includes('负')) return 'loss';
  if (value.includes('平')) return 'draw';
  return '';
}

function isCooperativeRecord(record) {
  if (record.cooperative === true || record.mode === 'cooperative') return true;
  const participants = record.players || [];
  const results = participants.map(player => normalizeGameResult(player.result));
  if (results.length < 2 || results.some(result => !result)) return false;
  const uniqueResults = new Set(results);
  return uniqueResults.size === 1 && (results[0] === 'win' || results[0] === 'loss');
}

function arePlayersOnSameSide(playerA, playerB) {
  const resultA = normalizeGameResult(playerA.result);
  const resultB = normalizeGameResult(playerB.result);
  return resultA === resultB && (resultA === 'win' || resultA === 'loss');
}

function resolveHeadToHeadWinner(playerA, playerB, scoreA, scoreB) {
  const resultA = normalizeGameResult(playerA.result);
  const resultB = normalizeGameResult(playerB.result);
  if (resultA === 'win' && resultB === 'loss') return 'a';
  if (resultB === 'win' && resultA === 'loss') return 'b';
  if (resultA === 'draw' && resultB === 'draw') return 'draw';
  if (Number.isFinite(scoreA) && Number.isFinite(scoreB)) {
    if (scoreA > scoreB) return 'a';
    if (scoreB > scoreA) return 'b';
    return 'draw';
  }
  return 'unknown';
}

function summarizeHeadToHead(matches) {
  return matches.reduce((summary, match) => {
    summary.total += 1;
    if (match.winner === 'a') summary.winsA += 1;
    else if (match.winner === 'b') summary.winsB += 1;
    else if (match.winner === 'draw') summary.draws += 1;
    else summary.unknown += 1;
    return summary;
  }, { total: 0, winsA: 0, winsB: 0, draws: 0, unknown: 0 });
}

function getHeadToHeadGameStats(matches) {
  const stats = new Map();
  matches.forEach(match => {
    if (!stats.has(match.game)) {
      stats.set(match.game, { game: match.game, total: 0, winsA: 0, winsB: 0, draws: 0, unknown: 0 });
    }
    const row = stats.get(match.game);
    row.total += 1;
    if (match.winner === 'a') row.winsA += 1;
    else if (match.winner === 'b') row.winsB += 1;
    else if (match.winner === 'draw') row.draws += 1;
    else row.unknown += 1;
  });
  return [...stats.values()];
}

function renderHeadToHeadResults(container, allMatches, playerA, playerB, selectedGame) {
  if (!playerA || !playerB) {
    container.innerHTML = '<div class="head-to-head-empty">至少需要两位有分数记录的玩家。</div>';
    return;
  }

  const matches = selectedGame
    ? allMatches.filter(match => match.game === selectedGame)
    : allMatches;
  if (!allMatches.length) {
    container.innerHTML = `<div class="head-to-head-empty">${escapeHtml(playerA)} 与 ${escapeHtml(playerB)} 暂无双方都有分数的共同对局。</div>`;
    return;
  }

  const summary = summarizeHeadToHead(matches);
  const decidedMatches = summary.winsA + summary.winsB + summary.draws;
  const rateA = decidedMatches ? summary.winsA / decidedMatches * 100 : 0;
  const rateB = decidedMatches ? summary.winsB / decidedMatches * 100 : 0;
  const scopeTitle = selectedGame ? `《${escapeHtml(selectedGame)}》` : '全部计分对局';
  const gameStats = getHeadToHeadGameStats(allMatches);

  container.innerHTML = `
    <div class="head-to-head-scope">${scopeTitle} · 共 ${summary.total} 局</div>
    <div class="head-to-head-scoreboard">
      ${renderHeadToHeadPlayerCard(playerA, rateA, summary.winsA, summary.draws, summary.winsB, summary.unknown, 'a')}
      <div class="head-to-head-middle">
        <strong>${summary.winsA} : ${summary.winsB}</strong>
        <span>${summary.draws} 平${summary.unknown ? ` · ${summary.unknown} 无结果` : ''}</span>
      </div>
      ${renderHeadToHeadPlayerCard(playerB, rateB, summary.winsB, summary.draws, summary.winsA, summary.unknown, 'b')}
    </div>
    <div class="head-to-head-strengths">
      ${renderStrongGames(playerA, gameStats, 'a')}
      ${renderStrongGames(playerB, gameStats, 'b')}
    </div>
    <div class="head-to-head-history">
      <h4>${scopeTitle}记录</h4>
      ${matches.length ? matches.map(match => renderHeadToHeadMatch(match, playerA, playerB)).join('') : '<div class="head-to-head-empty">该游戏暂无有效对局。</div>'}
    </div>
  `;
}

function renderHeadToHeadPlayerCard(name, rate, wins, draws, losses, unknown, side) {
  return `
    <div class="head-to-head-player-card ${side}">
      <div class="head-to-head-player-name">${escapeHtml(name)}</div>
      <strong class="head-to-head-rate">${formatPercentage(rate)}</strong>
      <span>胜率</span>
      <small>${wins} 胜 · ${draws} 平 · ${losses} 负${unknown ? ` · ${unknown} 无结果` : ''}</small>
    </div>
  `;
}

function renderStrongGames(playerName, gameStats, side) {
  const winsKey = side === 'a' ? 'winsA' : 'winsB';
  const lossesKey = side === 'a' ? 'winsB' : 'winsA';
  const strongest = [...gameStats]
    .filter(stat => stat[winsKey] > 0)
    .sort((a, b) => {
      const decidedA = a.winsA + a.winsB + a.draws;
      const decidedB = b.winsA + b.winsB + b.draws;
      const rateDifference = b[winsKey] / decidedB - a[winsKey] / decidedA;
      return rateDifference || b[winsKey] - a[winsKey] || b.total - a.total || a.game.localeCompare(b.game, 'zh-Hans');
    })
    .slice(0, 3);
  const rows = strongest.length
    ? strongest.map(stat => `
        <div class="head-to-head-strength-row">
          <span>${escapeHtml(stat.game)}</span>
          <strong>${formatPercentage(stat[winsKey] / (stat.winsA + stat.winsB + stat.draws) * 100)}</strong>
          <small>${stat[winsKey]}胜 ${stat.draws}平 ${stat[lossesKey]}负${stat.unknown ? ` · ${stat.unknown}无结果` : ''}</small>
        </div>
      `).join('')
    : '<div class="head-to-head-empty compact">暂无胜场</div>';

  return `
    <section class="head-to-head-strength-card">
      <h4>${escapeHtml(playerName)} 擅长游戏</h4>
      ${rows}
    </section>
  `;
}

function renderHeadToHeadMatch(match, playerA, playerB) {
  const date = match.date && !Number.isNaN(new Date(match.date).getTime())
    ? new Date(match.date).toLocaleDateString('zh-CN')
    : '日期未知';
  const result = match.winner === 'a'
    ? `${escapeHtml(playerA)} 胜`
    : match.winner === 'b'
      ? `${escapeHtml(playerB)} 胜`
      : match.winner === 'draw' ? '平局' : '未记录结果';
  const scoreA = Number.isFinite(match.scoreA) ? formatAmount(match.scoreA) : '无分数';
  const scoreB = Number.isFinite(match.scoreB) ? formatAmount(match.scoreB) : '无分数';
  return `
    <div class="head-to-head-match">
      <div>
        <strong>${escapeHtml(match.game)}</strong>
        <small>${date}</small>
      </div>
      <div class="head-to-head-match-score">
        <span>${escapeHtml(playerA)} ${scoreA}</span>
        <b>${result}</b>
        <span>${scoreB} ${escapeHtml(playerB)}</span>
      </div>
    </div>
  `;
}

function formatPercentage(value) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function expandPlayerCounts(value) {
  const counts = new Set();
  String(value || '').split(',').forEach(part => {
    const normalized = part.trim().replace('+', '');
    if (!normalized) return;
    const range = normalized.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      for (let count = start; count <= Math.min(end, 14); count += 1) counts.add(count);
      return;
    }
    const count = Number(normalized);
    if (Number.isInteger(count) && count >= 1 && count <= 14) counts.add(count);
  });
  return counts;
}

function renderPlayerCountPanel(info, compact = false) {
  const supported = expandPlayerCounts(info.supportedPlayers);
  const best = expandPlayerCounts(info.bestPlayers);
  if (!supported.size) return '';

  const boxes = Array.from({ length: 14 }, (_, index) => {
    const count = index + 1;
    const state = best.has(count) ? 'best' : supported.has(count) ? 'supported' : '';
    const label = count === 14 ? '14+' : String(count);
    return `<span class="player-count-box ${state}" title="${best.has(count) ? '最佳人数' : supported.has(count) ? '可玩人数' : '不支持'}">${label}</span>`;
  }).join('');

  return `
    <div class="player-count-panel ${compact ? 'compact' : ''}">
      ${compact ? '' : '<div class="player-count-title">玩家人数</div>'}
      <div class="player-count-grid">${boxes}</div>
      <div class="player-count-legend">
        <span><i class="supported"></i>可玩 ${info.supportedPlayers}</span>
        <span><i class="best"></i>最佳 ${info.bestPlayers || '暂无'}</span>
      </div>
    </div>
  `;
}

function parseNumber(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : null;
}

function parseDurationHours(value) {
  const number = parseNumber(value);
  return Number.isFinite(number) ? number : 0;
}

function getTotalPersonDuration(records) {
  return records.reduce((sum, record) => {
    const duration = parseDurationHours(record.duration);
    const playerCount = Array.isArray(record.players) ? record.players.length : 0;
    return sum + duration * playerCount;
  }, 0);
}

function formatAmount(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime()) || value.getTime() <= 0) {
    return '';
  }
  return value.toLocaleDateString('ja-JP');
}

function getScoreEntries(records) {
  return records.flatMap(record => (record.players || [])
    .map(player => ({
      score: parseNumber(player.score),
      result: player.result || ''
    }))
    .filter(entry => Number.isFinite(entry.score)));
}

function getPersonalBestScores(records) {
  return records.reduce((bests, record) => {
    for (const player of record.players || []) {
      const score = parseNumber(player.score);
      if (!player.name || !Number.isFinite(score)) continue;
      if (!Number.isFinite(bests[player.name]) || score > bests[player.name]) {
        bests[player.name] = score;
      }
    }
    return bests;
  }, {});
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateScoreStats(records) {
  const entries = getScoreEntries(records);
  if (!entries.length) return [];

  const scores = entries.map(entry => entry.score);
  const winningScores = entries
    .filter(entry => entry.result === '胜')
    .map(entry => entry.score);
  const losingScores = entries
    .filter(entry => entry.result === '负')
    .map(entry => entry.score);

  return [
    { label: 'Top Score', value: Math.max(...scores) },
    { label: 'Highest Losing', value: losingScores.length ? Math.max(...losingScores) : null },
    { label: 'Average Winning', value: average(winningScores) },
    { label: 'Average Score', value: average(scores) },
    { label: 'Lowest Winning', value: winningScores.length ? Math.min(...winningScores) : null },
    { label: 'Lowest Score', value: Math.min(...scores) }
  ];
}

function renderScoreStats(records, averageTime) {
  const stats = calculateScoreStats(records);
  if (!stats.length) {
    return `
      <div class="score-panel">
        <h4>Game Score</h4>
        <div class="score-empty">还没有可统计的分数</div>
        <div class="average-time">Average Time <strong>${averageTime}</strong></div>
      </div>
    `;
  }

  const values = stats
    .map(stat => stat.value)
    .filter(value => Number.isFinite(value));
  const maxValue = Math.max(...values, 1);
  const rows = stats.map(stat => {
    const hasValue = Number.isFinite(stat.value);
    const width = hasValue ? Math.max((stat.value / maxValue) * 100, 3) : 0;
    const valueText = hasValue ? formatAmount(stat.value) : 'N/A';
    return `
      <div class="score-row">
        <div class="score-label">${stat.label}</div>
        <div class="score-track">
          <div class="score-bar" style="width:${width}%"></div>
        </div>
        <div class="score-value">${valueText}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="score-panel">
      <h4>Game Score</h4>
      ${rows}
      <div class="average-time">Average Time <strong>${averageTime}</strong></div>
    </div>
  `;
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
