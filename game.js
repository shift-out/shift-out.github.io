(() => {
  "use strict";

  const COLS = 10;
  const ROWS = 20;
  const HIDDEN_ROWS = 2;
  const LOCK_DELAY = 500;
  const MAX_LOCK_RESETS = 15;
  const LINE_CLEAR_BASE = [0, 100, 300, 500, 800];
  const DROP_MODE_STORAGE_KEY = "neonBlocksDropMode";
  const HIGH_SCORE_KEYS = {
    standard: "neonBlocksHighScoreStandard",
    strict: "neonBlocksHighScoreStrict",
  };
  const LEGACY_HIGH_SCORE_KEY = "neonBlocksHighScore";
  const LEADERBOARD_STORAGE_PREFIX = "neonBlocksLeaderboard";
  const PLAYER_ID_STORAGE_KEY = "neonBlocksPlayerId";
  const PLAYER_NAME_STORAGE_KEY = "neonBlocksPlayerName";
  const SUPABASE_URL = window.NEON_SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = window.NEON_SUPABASE_ANON_KEY || "";
  const MODE_SCORE_MULTIPLIERS = {
    standard: 1,
    strict: 1.25,
  };
  const HORIZONTAL_I_TARGETS = ["100/111", "010/111", "001/111"];
  const SHAPE_TRANSFORM_TARGETS = {
    "001/111": ["010/111", "100/111"],
    "100/111": ["010/111", "001/111"],
  };
  const FORBIDDEN_TRANSFORMS = {
    "010/111": new Set(["1111", "0100/1101"]),
  };

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const holdCanvas = document.getElementById("holdCanvas");
  const holdCtx = holdCanvas.getContext("2d");
  const nextCanvas = document.getElementById("nextCanvas");
  const nextCtx = nextCanvas.getContext("2d");
  const boardFrame = document.querySelector(".board-frame");

  const scoreEl = document.getElementById("score");
  const highScoreEl = document.getElementById("highScore");
  const highScoreLabel = document.getElementById("highScoreLabel");
  const riskMultiplierEl = document.getElementById("riskMultiplier");
  const levelEl = document.getElementById("level");
  const linesEl = document.getElementById("lines");
  const mobileScoreEl = document.getElementById("mobileScore");
  const mobileHighScoreEl = document.getElementById("mobileHighScore");
  const mobileLevelEl = document.getElementById("mobileLevel");
  const mobileRiskEl = document.getElementById("mobileRisk");
  const finalScoreEl = document.getElementById("finalScore");
  const finalMaxComboEl = document.getElementById("finalMaxCombo");
  const finalMaxRiskEl = document.getElementById("finalMaxRisk");
  const scoreSubmitStatus = document.getElementById("scoreSubmitStatus");
  const leaderboardButton = document.getElementById("leaderboardButton");
  const previewLeaderboardButton = document.getElementById("previewLeaderboardButton");
  const leaderboardModal = document.getElementById("leaderboardModal");
  const closeLeaderboardButton = document.getElementById("closeLeaderboardButton");
  const leaderboardListEl = document.getElementById("leaderboardList");
  const leaderboardStatusEl = document.getElementById("leaderboardStatus");
  const leaderboardPreviewListEl = document.getElementById("leaderboardPreviewList");
  const previewModeEl = document.getElementById("previewMode");
  const rankingModeButtons = [
    ...document.querySelectorAll("[data-ranking-mode]"),
  ];

  const startOverlay = document.getElementById("startOverlay");
  const pauseOverlay = document.getElementById("pauseOverlay");
  const gameOverOverlay = document.getElementById("gameOverOverlay");
  const startButton = document.getElementById("startButton");
  const resumeButton = document.getElementById("resumeButton");
  const playAgainButton = document.getElementById("playAgainButton");
  const restartButton = document.getElementById("restartButton");
  const restartFromPause = document.getElementById("restartFromPause");
  const soundToggle = document.getElementById("soundToggle");
  const modeButtons = [...document.querySelectorAll("[data-drop-mode]")];
  const savedDropMode = localStorage.getItem(DROP_MODE_STORAGE_KEY);
  const normalizedSavedMode = savedDropMode === "strict" ? "strict" : "standard";
  if (
    localStorage.getItem(HIGH_SCORE_KEYS.standard) === null &&
    localStorage.getItem(LEGACY_HIGH_SCORE_KEY) !== null
  ) {
    localStorage.setItem(
      HIGH_SCORE_KEYS.standard,
      localStorage.getItem(LEGACY_HIGH_SCORE_KEY),
    );
  }

  const COLORS = {
    I: "#45e6ff",
    J: "#6384ff",
    L: "#ff9e45",
    O: "#ffe04a",
    S: "#5bf5a8",
    T: "#b273ff",
    Z: "#ff5d7d",
  };

  const SHAPES = {
    I: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    J: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    O: [
      [1, 1],
      [1, 1],
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
  };

  const KICKS = {
    normal: [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [-2, 0],
      [2, 0],
      [-1, -1],
      [1, -1],
    ],
    I: [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [-2, 0],
      [2, 0],
      [-2, -1],
      [2, -1],
    ],
  };

  const state = {
    status: "ready",
    board: createBoard(),
    active: null,
    nextQueue: [],
    bag: [],
    holdType: null,
    canHold: true,
    score: 0,
    highScore: Number(localStorage.getItem(HIGH_SCORE_KEYS[normalizedSavedMode])) || 0,
    playerId: "",
    lines: 0,
    level: 1,
    combo: -1,
    riskMultiplier: 1,
    maxRiskMultiplier: 1,
    maxCombo: 0,
    piecesLocked: 0,
    leaderboardMode: normalizedSavedMode,
    leaderboardRows: [],
    leaderboardLoading: false,
    scoreSubmitted: false,
    particleBursts: [],
    shakeTime: 0,
    shakePower: 0,
    floatingScores: [],
    dropCounter: 0,
    lockCounter: 0,
    lockResets: 0,
    lastTime: 0,
    clearedRows: [],
    effectTime: 0,
    transformEffect: null,
    dropAnimation: null,
    dropMode: normalizedSavedMode,
    muted: localStorage.getItem("neonBlocksMuted") === "true",
    audioContext: null,
    musicGain: null,
    musicTimer: null,
    musicStep: 0,
    musicPlaying: false,
    animationFrame: null,
    pendingTimers: new Set(),
  };

  let lastFrameTime = performance.now();

  function createBoard() {
    return Array.from({ length: ROWS + HIDDEN_ROWS }, () => Array(COLS).fill(null));
  }

  function currentModeMultiplier() {
    return MODE_SCORE_MULTIPLIERS[state.dropMode] || 1;
  }

  function currentHighScoreKey() {
    return HIGH_SCORE_KEYS[state.dropMode];
  }

  function loadModeHighScore(mode) {
    return Number(localStorage.getItem(HIGH_SCORE_KEYS[mode])) || 0;
  }

  function getOrCreatePlayerId() {
    let playerId = localStorage.getItem(PLAYER_ID_STORAGE_KEY);
    if (!playerId) {
      playerId = crypto.randomUUID?.() || `player-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(PLAYER_ID_STORAGE_KEY, playerId);
    }
    return playerId;
  }

  function normalizePlayerName(name) {
    return String(name || "")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 16);
  }

  function getPlayerDisplayName() {
    const savedName = normalizePlayerName(localStorage.getItem(PLAYER_NAME_STORAGE_KEY));
    if (savedName) return savedName;
    const suffix = state.playerId.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase();
    return `玩家-${suffix || "0000"}`;
  }

  function localLeaderboardKey(mode) {
    return `${LEADERBOARD_STORAGE_PREFIX}:${mode}`;
  }

  function readLocalLeaderboard(mode) {
    try {
      const parsed = JSON.parse(localStorage.getItem(localLeaderboardKey(mode)) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((entry) => entry && Number.isFinite(Number(entry.score)))
        .map((entry) => ({
          playerId: String(entry.playerId || ""),
          name: normalizePlayerName(entry.name) || "匿名玩家",
          score: Math.max(0, Math.floor(Number(entry.score))),
          updatedAt: Number(entry.updatedAt) || 0,
        }))
        .sort((a, b) => b.score - a.score || a.updatedAt - b.updatedAt)
        .slice(0, 100);
    } catch {
      return [];
    }
  }

  function saveLocalLeaderboardScore(mode, name, score) {
    const rows = readLocalLeaderboard(mode);
    const existing = rows.find((entry) => entry.playerId === state.playerId);
    if (existing) {
      if (score > existing.score) {
        existing.score = score;
        existing.name = name;
        existing.updatedAt = Date.now();
      }
    } else {
      rows.push({
        playerId: state.playerId,
        name,
        score,
        updatedAt: Date.now(),
      });
    }
    rows.sort((a, b) => b.score - a.score || a.updatedAt - b.updatedAt);
    localStorage.setItem(localLeaderboardKey(mode), JSON.stringify(rows.slice(0, 100)));
  }

  function renderLeaderboardRows(rows, target, limit, compact = false) {
    target.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "leaderboard-empty";
      empty.textContent = "还没有成绩，来拿下第一名吧";
      target.append(empty);
      return;
    }

    rows.slice(0, limit).forEach((row, index) => {
      const item = document.createElement(compact ? "div" : "li");
      item.className = compact ? "leaderboard-preview-row" : "leaderboard-row";
      if (!compact && row.playerId === state.playerId) item.classList.add("is-player");

      const place = document.createElement("span");
      place.className = compact ? "rank" : "place";
      place.textContent = `${index + 1}`;

      const player = document.createElement("span");
      player.className = compact ? "name" : "player";
      player.textContent = row.name;

      const score = document.createElement("span");
      score.className = compact ? "points" : "score";
      score.textContent = formatNumber(row.score);

      item.append(place, player, score);
      target.append(item);
    });
  }

  function renderLeaderboard() {
    const modeLabel = state.leaderboardMode === "strict" ? "严格" : "标准";
    previewModeEl.textContent = modeLabel;
    renderLeaderboardRows(state.leaderboardRows, leaderboardPreviewListEl, 3, true);
    renderLeaderboardRows(state.leaderboardRows, leaderboardListEl, 10);
    rankingModeButtons.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.rankingMode === state.leaderboardMode,
      );
    });
  }

  async function refreshLeaderboard(mode = state.dropMode) {
    state.leaderboardMode = mode;
    state.leaderboardLoading = true;
    leaderboardStatusEl.textContent = "正在读取排行榜…";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      state.leaderboardRows = readLocalLeaderboard(mode);
      state.leaderboardLoading = false;
      renderLeaderboard();
      leaderboardStatusEl.textContent = "当前为本机排行榜 · 在线服务尚未配置";
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3500);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/leaderboard_scores?select=player_id,name,score,updated_at&mode=eq.${encodeURIComponent(mode)}&order=score.desc,updated_at.asc&limit=10`,
        {
          signal: controller.signal,
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      state.leaderboardRows = Array.isArray(payload)
        ? payload.map((row) => ({
            playerId: row.player_id,
            name: row.name,
            score: Number(row.score),
            updatedAt: new Date(row.updated_at).getTime(),
          }))
        : [];
      state.leaderboardLoading = false;
      renderLeaderboard();
      leaderboardStatusEl.textContent = "全球排行榜 · 每次更新显示前 10 名";
    } catch {
      state.leaderboardRows = readLocalLeaderboard(mode);
      state.leaderboardLoading = false;
      renderLeaderboard();
      leaderboardStatusEl.textContent = "在线服务暂不可用，已显示本机成绩";
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function submitCurrentScore() {
    if (state.scoreSubmitted) return;
    const name = getPlayerDisplayName();
    state.scoreSubmitted = true;
    localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
    saveLocalLeaderboardScore(state.dropMode, name, state.score);
    scoreSubmitStatus.textContent = "成绩已保存，正在同步在线排行榜…";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      scoreSubmitStatus.textContent = `已自动保存 · ${name}`;
      await refreshLeaderboard(state.dropMode);
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 3500);
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_score`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "content-type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          p_mode: state.dropMode,
          p_player_id: state.playerId,
          p_name: name,
          p_score: state.score,
        }),
      });
      window.clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rank = await response.json();
      scoreSubmitStatus.textContent = rank
        ? `已自动提交 · ${name} · 第 ${rank} 名`
        : `已自动提交 · ${name}`;
      await refreshLeaderboard(state.dropMode);
    } catch {
      scoreSubmitStatus.textContent = `在线服务暂不可用 · 已保存到本机 · ${name}`;
      state.leaderboardRows = readLocalLeaderboard(state.dropMode);
      renderLeaderboard();
    }
  }

  function calculateRiskMultiplier() {
    let peakHeight = 0;
    for (let y = HIDDEN_ROWS; y < state.board.length; y += 1) {
      if (state.board[y].some(Boolean)) {
        peakHeight = state.board.length - y;
        break;
      }
    }

    const holes = existingHoles().size;
    const riskPoints = holes + Math.max(0, peakHeight - 12);
    return Math.min(1.8, 1 + Math.min(10, riskPoints) * 0.08);
  }

  function spawnLineClearEffects(rows, gainedScore) {
    const { cell, offsetX, offsetY } = boardCoordinates();
    rows.forEach((row) => {
      for (let x = 0; x < COLS; x += 1) {
        const type = state.board[row][x];
        if (!type) continue;
        for (let index = 0; index < 4; index += 1) {
          state.particleBursts.push({
            x: offsetX + (x + 0.5) * cell,
            y: offsetY + (row - HIDDEN_ROWS + 0.5) * cell,
            vx: (Math.random() - 0.5) * 0.42,
            vy: -0.1 - Math.random() * 0.34,
            gravity: 0.00075,
            age: 0,
            life: 520 + Math.random() * 420,
            size: cell * (0.07 + Math.random() * 0.1),
            color: COLORS[type],
          });
        }
      }
    });

    state.floatingScores.push({
      x: offsetX + canvas.width * 0.5,
      y: offsetY + canvas.height * 0.36,
      text: `+${formatNumber(gainedScore)}`,
      age: 0,
      life: 1100,
    });
    state.shakeTime = rows.length === 4 ? 560 : 300 + rows.length * 55;
    state.shakePower = rows.length === 4 ? 7 : 2.5 + rows.length;
  }

  function updateVisualEffects(delta) {
    state.particleBursts = state.particleBursts.filter((particle) => {
      particle.age += delta;
      const frame = delta / 16.67;
      particle.x += particle.vx * frame * 3;
      particle.y += particle.vy * frame * 3;
      particle.vy += particle.gravity * delta;
      return particle.age < particle.life;
    });
    state.floatingScores = state.floatingScores.filter((popup) => {
      popup.age += delta;
      popup.y -= delta * 0.035;
      return popup.age < popup.life;
    });
    if (state.shakeTime > 0) state.shakeTime = Math.max(0, state.shakeTime - delta);
  }

  function cloneMatrix(matrix) {
    return matrix.map((row) => [...row]);
  }

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function fillBag() {
    if (state.bag.length === 0) {
      state.bag = shuffle(Object.keys(SHAPES));
    }
  }

  function takeFromBag() {
    fillBag();
    return state.bag.pop();
  }

  function scheduleGameplay(callback, delay) {
    const timer = window.setTimeout(() => {
      state.pendingTimers.delete(timer);
      callback();
    }, delay);
    state.pendingTimers.add(timer);
    return timer;
  }

  function clearPendingTimers() {
    state.pendingTimers.forEach((timer) => window.clearTimeout(timer));
    state.pendingTimers.clear();
  }

  function createPiece(type) {
    const matrix = cloneMatrix(SHAPES[type]);
    return {
      type,
      matrix,
      x: Math.floor((COLS - matrix[0].length) / 2),
      y: HIDDEN_ROWS,
    };
  }

  function fillNextQueue() {
    while (state.nextQueue.length < 3) {
      state.nextQueue.push(takeFromBag());
    }
  }

  function spawnPiece(type = null) {
    fillNextQueue();
    const nextType = type || state.nextQueue.shift();
    fillNextQueue();
    state.active = createPiece(nextType);
    state.dropCounter = 0;
    state.lockCounter = 0;
    state.lockResets = 0;
    state.canHold = true;

    if (collides(state.active, 0, 0)) {
      endGame();
      return;
    }

    drawNext();
  }

  function collides(piece, offsetX = 0, offsetY = 0, matrix = piece.matrix) {
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) continue;
        const boardX = piece.x + x + offsetX;
        const boardY = piece.y + y + offsetY;

        if (boardX < 0 || boardX >= COLS || boardY >= ROWS + HIDDEN_ROWS) {
          return true;
        }
        if (boardY >= 0 && state.board[boardY][boardX]) {
          return true;
        }
      }
    }
    return false;
  }

  function rotateMatrix(matrix, direction) {
    const size = matrix.length;
    const rotated = Array.from({ length: size }, () => Array(size).fill(0));

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (direction > 0) {
          rotated[x][size - 1 - y] = matrix[y][x];
        } else {
          rotated[size - 1 - x][y] = matrix[y][x];
        }
      }
    }
    return rotated;
  }

  function rotate(direction) {
    if (!isPlaying() || !state.active || state.active.type === "O") return;

    const rotated = rotateMatrix(state.active.matrix, direction);
    const kicks = state.active.type === "I" ? KICKS.I : KICKS.normal;

    for (const [kickX, kickY] of kicks) {
      if (!collides(state.active, kickX, kickY, rotated)) {
        state.active.matrix = rotated;
        state.active.x += kickX;
        state.active.y += kickY;
        resetLockDelay();
        playSound("rotate");
        draw();
        return;
      }
    }
  }

  function move(horizontal) {
    if (!isPlaying() || !state.active) return;
    if (!collides(state.active, horizontal, 0)) {
      state.active.x += horizontal;
      resetLockDelay();
      playSound("move");
      draw();
    }
  }

  function hardDrop() {
    if (!isPlaying() || !state.active) return;
    let distance = 0;

    while (!collides(state.active, 0, distance + 1)) {
      distance += 1;
    }

    state.active.y += distance;
    state.score += distance * 2;
    state.lockCounter = LOCK_DELAY;
    playSound(distance > 3 ? "hardDrop" : "move");
    updateStats();
    draw();
  }

  function holdPiece() {
    if (!isPlaying() || !state.active || !state.canHold) return;

    const currentType = state.active.type;
    if (state.holdType) {
      const heldType = state.holdType;
      state.holdType = currentType;
      spawnPiece(heldType);
    } else {
      state.holdType = currentType;
      spawnPiece();
    }

    state.canHold = false;
    playSound("hold");
    drawHold();
    draw();
  }

  function resetLockDelay() {
    if (state.active && collides(state.active, 0, 1) && state.lockResets < MAX_LOCK_RESETS) {
      state.lockCounter = 0;
      state.lockResets += 1;
    }
  }

  function pieceCells(piece) {
    const cells = [];
    piece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          cells.push({
            x: piece.x + x,
            y: piece.y + y,
            type: piece.type,
          });
        }
      });
    });
    return cells;
  }

  function pieceBounds(cells) {
    return {
      minX: Math.min(...cells.map((cell) => cell.x)),
      maxX: Math.max(...cells.map((cell) => cell.x)),
      minY: Math.min(...cells.map((cell) => cell.y)),
      maxY: Math.max(...cells.map((cell) => cell.y)),
    };
  }

  function pieceShapeKey(cells) {
    const bounds = pieceBounds(cells);
    const occupied = new Set(cells.map((cell) => `${cell.x}:${cell.y}`));
    const rows = [];

    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      let row = "";
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        row += occupied.has(`${x}:${y}`) ? "1" : "0";
      }
      rows.push(row);
    }
    return rows.join("/");
  }

  function transformCandidateFits(cells) {
    return cells.every(
      (cell) =>
        cell.x >= 0 &&
        cell.x < COLS &&
        cell.y >= HIDDEN_ROWS &&
        cell.y < state.board.length &&
        !state.board[cell.y][cell.x],
    );
  }

  function adjacentColumnTop(column) {
    if (column < 0 || column >= COLS) return null;
    for (let y = HIDDEN_ROWS; y < state.board.length; y += 1) {
      if (state.board[y][column]) return y;
    }
    return state.board.length;
  }

  function existingHoles() {
    const holes = new Set();

    for (let x = 0; x < COLS; x += 1) {
      let hasBlockAbove = false;
      for (let y = HIDDEN_ROWS; y < state.board.length; y += 1) {
        if (state.board[y][x]) {
          hasBlockAbove = true;
        } else if (hasBlockAbove) {
          holes.add(`${x}:${y}`);
        }
      }
    }
    return holes;
  }

  function candidateCompletesRow(cells) {
    const candidateKeys = new Set(cells.map((cell) => `${cell.x}:${cell.y}`));

    for (let y = HIDDEN_ROWS; y < state.board.length; y += 1) {
      let full = true;
      for (let x = 0; x < COLS; x += 1) {
        if (!state.board[y][x] && !candidateKeys.has(`${x}:${y}`)) {
          full = false;
          break;
        }
      }
      if (full) return true;
    }
    return false;
  }

  function candidateAllowed(cells, holes) {
    if (candidateCompletesRow(cells)) return false;
    if (state.dropMode !== "strict") return true;
    return cells.every((cell) => !holes.has(`${cell.x}:${cell.y}`));
  }

  function matrixCellsAt(key, originX, bottomY, type) {
    const matrix = key.split("/").map((row) => row.split("").map(Number));
    const topY = bottomY - matrix.length + 1;
    const cells = [];

    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          cells.push({
            x: originX + x,
            y: topY + y,
            type,
          });
        }
      });
    });
    return cells;
  }

  function sideMoveCandidate(piece, sourceCells, bounds, column) {
    const sideTopY = adjacentColumnTop(column);
    if (sideTopY === null || sideTopY <= bounds.minY) return null;

    const destinationY = sideTopY - 1;
    if (destinationY < HIDDEN_ROWS) return null;

    const highestCells = sourceCells
      .filter((cell) => cell.y === bounds.minY)
      .sort((a, b) => Math.abs(a.x - column) - Math.abs(b.x - column));

    for (const movedCell of highestCells) {
      const cells = sourceCells
        .filter((cell) => cell !== movedCell)
        .concat({
          x: column,
          y: destinationY,
          type: piece.type,
        });
      const positions = new Set(cells.map((cell) => `${cell.x}:${cell.y}`));
      if (positions.size === 4 && transformCandidateFits(cells)) {
        return {
          cells,
          column,
          supportHeight: state.board.length - sideTopY,
        };
      }
    }

    return null;
  }

  function transformPiece(piece) {
    const sourceCells = pieceCells(piece);
    const bounds = pieceBounds(sourceCells);
    const sourceKey = pieceShapeKey(sourceCells);
    const holes = state.dropMode === "strict" ? existingHoles() : new Set();

    if (sourceKey === "1111") {
      const candidates = HORIZONTAL_I_TARGETS
        .map((key) => matrixCellsAt(key, bounds.minX, bounds.maxY, piece.type))
        .filter(transformCandidateFits)
        .filter((cells) => candidateAllowed(cells, holes));

      if (candidates.length === 0) {
        return { cells: sourceCells, transformed: false };
      }

      return {
        cells: candidates[Math.floor(Math.random() * candidates.length)],
        transformed: true,
      };
    }

    const shapeTargets = SHAPE_TRANSFORM_TARGETS[sourceKey];
    if (shapeTargets) {
      const mappedCandidates = shapeTargets
        .map((key) => matrixCellsAt(key, bounds.minX, bounds.maxY, piece.type))
        .filter(transformCandidateFits)
        .filter((cells) => candidateAllowed(cells, holes));

      if (mappedCandidates.length > 0) {
        return {
          cells: mappedCandidates[Math.floor(Math.random() * mappedCandidates.length)],
          transformed: true,
        };
      }
    }

    const candidates = [
      sideMoveCandidate(piece, sourceCells, bounds, bounds.minX - 1),
      sideMoveCandidate(piece, sourceCells, bounds, bounds.maxX + 1),
    ].filter((candidate) => {
      if (!candidate) return false;
      const forbidden = FORBIDDEN_TRANSFORMS[sourceKey];
      if (forbidden && forbidden.has(pieceShapeKey(candidate.cells))) return false;
      return candidateAllowed(candidate.cells, holes);
    });

    if (candidates.length === 0) {
      return { cells: sourceCells, transformed: false };
    }

    const highestSupport = Math.max(...candidates.map((candidate) => candidate.supportHeight));
    const preferred = candidates.filter(
      (candidate) => candidate.supportHeight === highestSupport,
    );
    const selected = preferred[Math.floor(Math.random() * preferred.length)];

    return {
      cells: selected.cells,
      transformed: true,
    };
  }

  function commitLockedCells(cells, transformed) {
    cells.forEach((block) => {
      state.board[block.y][block.x] = block.type;
    });
    state.piecesLocked += 1;
    state.riskMultiplier = calculateRiskMultiplier();
    state.maxRiskMultiplier = Math.max(state.maxRiskMultiplier, state.riskMultiplier);

    if (transformed) {
      state.transformEffect = {
        cells: cells.map(({ x, y, type }) => ({ x, y, type })),
        time: 420,
        duration: 420,
      };
    }

    const fullRows = [];
    for (let y = 0; y < state.board.length; y += 1) {
      if (state.board[y].every(Boolean)) fullRows.push(y);
    }

    if (fullRows.length > 0) {
      state.clearedRows = fullRows;
      state.effectTime = 360;
      state.combo += 1;
      state.maxCombo = Math.max(state.maxCombo, state.combo + 1);
      state.lines += fullRows.length;
      state.level = Math.floor(state.lines / 10) + 1;
      const comboMultiplier = 1 + Math.min(3, Math.max(0, state.combo)) * 0.2;
      const gainedScore = Math.round(
        LINE_CLEAR_BASE[fullRows.length] *
          state.level *
          comboMultiplier *
          state.riskMultiplier *
          currentModeMultiplier(),
      );
      state.score += gainedScore;
      spawnLineClearEffects(fullRows, gainedScore);
      playSound(fullRows.length === 4 ? "tetris" : "clear");
      updateStats();

      scheduleGameplay(() => {
        [...state.clearedRows].sort((a, b) => b - a).forEach((index) => {
          state.board.splice(index, 1);
          state.board.unshift(Array(COLS).fill(null));
        });
        state.clearedRows = [];
        state.effectTime = 0;
        state.transformEffect = null;
        draw();
      }, 160);
    } else {
      state.combo = -1;
      updateStats();
    }

    scheduleGameplay(() => {
      if (!["ready", "gameover"].includes(state.status)) spawnPiece();
      draw();
    }, fullRows.length > 0 ? 175 : 220);
  }

  function lockPiece() {
    if (!state.active) return;
    const sourceCells = pieceCells(state.active);
    const result = transformPiece(state.active);
    state.active = null;
    state.lockCounter = 0;

    if (result.transformed) {
      const resultKeys = new Set(result.cells.map((cell) => `${cell.x}:${cell.y}`));
      const sourceKeys = new Set(sourceCells.map((cell) => `${cell.x}:${cell.y}`));
      const movedFrom = sourceCells.find((cell) => !resultKeys.has(`${cell.x}:${cell.y}`));
      const movedTo = result.cells.find((cell) => !sourceKeys.has(`${cell.x}:${cell.y}`));

      if (movedFrom && movedTo) {
        state.dropAnimation = {
          cells: result.cells.map((cell) => ({ ...cell })),
          stationary: result.cells
            .filter((cell) => cell !== movedTo)
            .map((cell) => ({ ...cell })),
          from: { ...movedFrom },
          to: { ...movedTo },
          elapsed: 0,
          duration: 360,
        };
        playSound("transform");
        draw();
        return;
      }
    }

    playSound("lock");
    commitLockedCells(result.cells, false);
  }

  function isPlaying() {
    return state.status === "playing";
  }

  function startGame() {
    cancelAnimationFrame(state.animationFrame);
    clearPendingTimers();
    state.board = createBoard();
    state.nextQueue = [];
    state.bag = [];
    state.holdType = null;
    state.canHold = true;
    state.score = 0;
    state.lines = 0;
    state.level = 1;
    state.combo = -1;
    state.riskMultiplier = 1;
    state.maxRiskMultiplier = 1;
    state.maxCombo = 0;
    state.piecesLocked = 0;
    state.scoreSubmitted = false;
    state.particleBursts = [];
    state.floatingScores = [];
    state.shakeTime = 0;
    state.dropCounter = 0;
    state.lockCounter = 0;
    state.lockResets = 0;
    state.clearedRows = [];
    state.effectTime = 0;
    state.transformEffect = null;
    state.dropAnimation = null;
    state.status = "playing";
    startOverlay.classList.remove("is-visible");
    pauseOverlay.classList.remove("is-visible");
    gameOverOverlay.classList.remove("is-visible");
    scoreSubmitStatus.textContent = "游戏结束后将自动保存并提交成绩";
    updateStats();
    drawHold();
    spawnPiece();
    startMusic();
    lastFrameTime = performance.now();
    state.animationFrame = requestAnimationFrame(update);
  }

  function endGame() {
    state.status = "gameover";
    state.active = null;
    state.dropAnimation = null;
    cancelAnimationFrame(state.animationFrame);
    clearPendingTimers();
    finalScoreEl.textContent = formatNumber(state.score);
    finalMaxComboEl.textContent = formatNumber(state.maxCombo);
    finalMaxRiskEl.textContent = `×${state.maxRiskMultiplier.toFixed(2)}`;
    state.scoreSubmitted = false;
    scoreSubmitStatus.textContent = "正在自动保存成绩…";
    if (state.score > state.highScore) state.highScore = state.score;
    localStorage.setItem(currentHighScoreKey(), String(state.highScore));
    updateStats();
    draw();
    stopMusic();
    gameOverOverlay.classList.add("is-visible");
    playSound("gameover");
    void submitCurrentScore();
  }

  function togglePause() {
    if (state.status === "playing") {
      state.status = "paused";
      pauseOverlay.classList.add("is-visible");
      cancelAnimationFrame(state.animationFrame);
      stopMusic();
    } else if (state.status === "paused") {
      resumeGame();
    }
  }

  function resumeGame() {
    if (state.status !== "paused") return;
    state.status = "playing";
    pauseOverlay.classList.remove("is-visible");
    lastFrameTime = performance.now();
    state.animationFrame = requestAnimationFrame(update);
    startMusic();
  }

  function update(time) {
    if (state.status !== "playing") return;
    const delta = Math.min(time - lastFrameTime, 100);
    lastFrameTime = time;
    updateVisualEffects(delta);

    if (state.effectTime > 0) {
      state.effectTime = Math.max(0, state.effectTime - delta);
    }
    if (state.transformEffect) {
      state.transformEffect.time = Math.max(0, state.transformEffect.time - delta);
      if (state.transformEffect.time === 0) state.transformEffect = null;
    }
    if (state.dropAnimation) {
      state.dropAnimation.elapsed += delta;
      if (state.dropAnimation.elapsed >= state.dropAnimation.duration) {
        const animation = state.dropAnimation;
        state.dropAnimation = null;
        commitLockedCells(animation.cells, true);
      }
    }

    if (state.active) {
      state.dropCounter += delta;
      const dropInterval = Math.max(70, 850 - (state.level - 1) * 72);

      if (state.dropCounter >= dropInterval) {
        if (!collides(state.active, 0, 1)) {
          state.active.y += 1;
          state.dropCounter = 0;
        } else {
          state.dropCounter = dropInterval;
        }
      }

      if (collides(state.active, 0, 1)) {
        state.lockCounter += delta;
        if (state.lockCounter >= LOCK_DELAY) lockPiece();
      } else {
        state.lockCounter = 0;
      }
    }

    draw();
    state.animationFrame = requestAnimationFrame(update);
  }

  function boardCoordinates() {
    const width = COLS;
    const height = ROWS;
    const cell = Math.min(canvas.width / width, canvas.height / height);
    return {
      cell,
      offsetX: (canvas.width - width * cell) / 2,
      offsetY: (canvas.height - height * cell) / 2,
    };
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { cell, offsetX, offsetY } = boardCoordinates();

    const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
    background.addColorStop(0, "#0c1325");
    background.addColorStop(1, "#070b15");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (state.shakeTime > 0) {
      const strength = state.shakePower * (state.shakeTime / 560);
      ctx.translate((Math.random() - 0.5) * strength, (Math.random() - 0.5) * strength);
    }
    drawGrid(cell, offsetX, offsetY);
    drawBoardBlocks(cell, offsetX, offsetY);
    drawDropAnimation(cell, offsetX, offsetY);
    drawTransformEffect(cell, offsetX, offsetY);

    if (state.active) {
      drawGhost(cell, offsetX, offsetY);
      drawPiece(state.active, cell, offsetX, offsetY, true);
    }

    if (state.effectTime > 0 && state.clearedRows.length) {
      drawClearEffect(cell, offsetX, offsetY);
    }

    drawCombo(cell, offsetX);
    ctx.restore();
    drawParticleBursts();
    drawFloatingScores();
  }

  function drawGrid(cell, offsetX, offsetY) {
    ctx.save();
    ctx.strokeStyle = "rgba(131, 156, 214, 0.075)";
    ctx.lineWidth = 0.8;

    for (let x = 1; x < COLS; x += 1) {
      const px = offsetX + x * cell;
      ctx.beginPath();
      ctx.moveTo(px, offsetY);
      ctx.lineTo(px, offsetY + ROWS * cell);
      ctx.stroke();
    }

    for (let y = 1; y < ROWS; y += 1) {
      const py = offsetY + y * cell;
      ctx.beginPath();
      ctx.moveTo(offsetX, py);
      ctx.lineTo(offsetX + COLS * cell, py);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBoardBlocks(cell, offsetX, offsetY) {
    for (let y = HIDDEN_ROWS; y < state.board.length; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const type = state.board[y][x];
        if (!type) continue;
        drawBlock(
          offsetX + x * cell,
          offsetY + (y - HIDDEN_ROWS) * cell,
          cell,
          COLORS[type],
          1,
        );
      }
    }
  }

  function drawPiece(piece, cell, offsetX, offsetY, detailed) {
    piece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (!value) return;
        const boardY = piece.y + y - HIDDEN_ROWS;
        if (boardY < 0) return;
        drawBlock(
          offsetX + (piece.x + x) * cell,
          offsetY + boardY * cell,
          cell,
          COLORS[piece.type],
          detailed ? 1 : 0.7,
        );
      });
    });
  }

  function drawGhost(cell, offsetX, offsetY) {
    let distance = 0;
    while (!collides(state.active, 0, distance + 1)) distance += 1;
    if (distance === 0) return;

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = COLORS[state.active.type];
    ctx.lineWidth = Math.max(1, cell * 0.08);

    state.active.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (!value) return;
        const boardY = state.active.y + y + distance - HIDDEN_ROWS;
        if (boardY < 0) return;
        const px = offsetX + (state.active.x + x) * cell;
        const py = offsetY + boardY * cell;
        roundRect(ctx, px + 2, py + 2, cell - 4, cell - 4, Math.max(2, cell * 0.13));
        ctx.stroke();
      });
    });
    ctx.restore();
  }

  function drawBlock(x, y, size, color, alpha = 1) {
    const gap = Math.max(1.5, size * 0.055);
    const px = x + gap;
    const py = y + gap;
    const blockSize = size - gap * 2;
    const radius = Math.max(2, size * 0.13);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.35;
    ctx.fillStyle = color;
    roundRect(ctx, px, py, blockSize, blockSize, radius);
    ctx.fill();

    ctx.shadowBlur = 0;
    const gradient = ctx.createLinearGradient(px, py, px + blockSize, py + blockSize);
    gradient.addColorStop(0, "rgba(255,255,255,0.38)");
    gradient.addColorStop(0.36, "rgba(255,255,255,0.08)");
    gradient.addColorStop(1, "rgba(0,0,0,0.16)");
    ctx.fillStyle = gradient;
    roundRect(ctx, px, py, blockSize, blockSize, radius);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.24)";
    ctx.lineWidth = Math.max(0.5, size * 0.025);
    roundRect(ctx, px + 1, py + 1, blockSize - 2, blockSize - 2, radius);
    ctx.stroke();
    ctx.restore();
  }

  function drawClearEffect(cell, offsetX, offsetY) {
    const progress = 1 - state.effectTime / 360;
    ctx.save();
    state.clearedRows.forEach((row) => {
      const y = offsetY + (row - HIDDEN_ROWS) * cell;
      const gradient = ctx.createLinearGradient(offsetX, y, offsetX + COLS * cell, y);
      gradient.addColorStop(0, `rgba(71, 229, 255, 0)`);
      gradient.addColorStop(0.18, `rgba(71, 229, 255, ${0.85 * (1 - progress)})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.95 * (1 - progress)})`);
      gradient.addColorStop(0.82, `rgba(150, 114, 255, ${0.85 * (1 - progress)})`);
      gradient.addColorStop(1, `rgba(255, 90, 165, 0)`);
      ctx.fillStyle = gradient;
      ctx.shadowColor = "#47e5ff";
      ctx.shadowBlur = 28;
      ctx.fillRect(offsetX, y + cell * (0.22 + progress * 0.12), COLS * cell, cell * 0.56);
    });
    ctx.restore();
  }

  function drawDropAnimation(cell, offsetX, offsetY) {
    if (!state.dropAnimation) return;
    const animation = state.dropAnimation;
    const progress = Math.min(1, animation.elapsed / animation.duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const startX = offsetX + (animation.from.x + 0.5) * cell;
    const startY = offsetY + (animation.from.y - HIDDEN_ROWS + 0.5) * cell;
    const endX = offsetX + (animation.to.x + 0.5) * cell;
    const endY = offsetY + (animation.to.y - HIDDEN_ROWS + 0.5) * cell;
    const color = COLORS[animation.from.type];

    animation.stationary.forEach((block) => {
      drawBlock(
        offsetX + block.x * cell,
        offsetY + (block.y - HIDDEN_ROWS) * cell,
        cell,
        COLORS[block.type],
        1,
      );
    });

    for (let trailIndex = 3; trailIndex >= 1; trailIndex -= 1) {
      const trailProgress = Math.max(0, progress - trailIndex * 0.055);
      const trailEase = 1 - Math.pow(1 - trailProgress, 3);
      drawRotatingBlock(
        startX + (endX - startX) * trailEase,
        startY + (endY - startY) * trailEase - Math.sin(Math.PI * trailProgress) * cell * 1.25,
        cell * 0.72,
        color,
        trailProgress * Math.PI * 2.4,
        0.08 + trailIndex * 0.025,
      );
    }

    drawRotatingBlock(
      startX + (endX - startX) * eased,
      startY + (endY - startY) * eased - Math.sin(Math.PI * progress) * cell * 1.35,
      cell * 0.9,
      color,
      progress * Math.PI * 2.4,
      1,
    );
  }

  function drawRotatingBlock(centerX, centerY, size, color, angle, alpha) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    drawBlock(-size / 2, -size / 2, size, color, alpha);
    ctx.restore();
  }

  function drawParticleBursts() {
    ctx.save();
    state.particleBursts.forEach((particle) => {
      const progress = particle.age / particle.life;
      ctx.globalAlpha = Math.max(0, 1 - progress);
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = particle.size * 3;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
    ctx.restore();
  }

  function drawFloatingScores() {
    ctx.save();
    state.floatingScores.forEach((popup) => {
      const progress = popup.age / popup.life;
      ctx.globalAlpha = Math.sin(Math.PI * Math.min(1, progress)) * 0.95;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#47e5ff";
      ctx.shadowBlur = 14;
      ctx.font = "800 22px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(popup.text, popup.x, popup.y);
    });
    ctx.restore();
  }

  function drawTransformEffect(cell, offsetX, offsetY) {
    if (!state.transformEffect) return;
    const progress = 1 - state.transformEffect.time / state.transformEffect.duration;
    const fade = 1 - progress;

    ctx.save();
    state.transformEffect.cells.forEach((cellPosition) => {
      const centerX = offsetX + (cellPosition.x + 0.5) * cell;
      const centerY = offsetY + (cellPosition.y - HIDDEN_ROWS + 0.5) * cell;
      const color = COLORS[cellPosition.type];

      ctx.globalAlpha = fade * 0.8;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, cell * 0.07);
      ctx.shadowColor = color;
      ctx.shadowBlur = cell * 0.45;
      ctx.beginPath();
      ctx.arc(centerX, centerY, cell * (0.62 + progress * 0.55), 0, Math.PI * 2);
      ctx.stroke();

      for (let index = 0; index < 4; index += 1) {
        const angle = index * (Math.PI / 2) + progress * 0.7;
        const distance = cell * (0.72 + progress * 0.7);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(
          centerX + Math.cos(angle) * distance,
          centerY + Math.sin(angle) * distance,
          Math.max(1, cell * 0.065 * fade),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    });

    ctx.shadowBlur = 0;
    ctx.globalAlpha = fade * 0.22;
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${Math.max(9, cell * 0.32)}px Inter, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText("变形", offsetX + COLS * cell - cell * 0.4, offsetY + cell * 0.9);
    ctx.restore();
  }

  function drawCombo(cell, offsetX) {
    if (state.combo < 1 || state.status !== "playing") return;
    ctx.save();
    ctx.fillStyle = "rgba(71, 229, 255, 0.78)";
    ctx.font = `800 ${Math.max(10, cell * 0.34)}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(`${state.combo + 1}× COMBO`, offsetX + (COLS * cell) / 2, cell * 0.72);
    ctx.restore();
  }

  function roundRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
  }

  function drawHold() {
    clearPreview(holdCtx, holdCanvas);
    if (!state.holdType) {
      drawEmptyPreview(holdCtx, holdCanvas, "按 C 暂存");
      return;
    }
    drawPreviewPiece(holdCtx, holdCanvas, state.holdType, 1);
  }

  function drawNext() {
    clearPreview(nextCtx, nextCanvas);
    const slots = 3;
    const slotHeight = nextCanvas.height / slots;

    state.nextQueue.slice(0, slots).forEach((type, index) => {
      const y = index * slotHeight;
      nextCtx.save();
      nextCtx.translate(0, y);
      drawPreviewPiece(nextCtx, { width: nextCanvas.width, height: slotHeight }, type, index === 0 ? 1 : 0.72);
      nextCtx.restore();
    });
  }

  function clearPreview(context, element) {
    context.clearRect(0, 0, element.width, element.height);
  }

  function drawEmptyPreview(context, element, text) {
    context.save();
    context.fillStyle = "rgba(143, 155, 189, 0.55)";
    context.font = "600 10px Inter, sans-serif";
    context.textAlign = "center";
    context.fillText(text, element.width / 2, element.height / 2 + 3);
    context.restore();
  }

  function drawPreviewPiece(context, area, type, alpha) {
    const matrix = SHAPES[type];
    const filledCells = [];
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) filledCells.push({ x, y });
      });
    });

    const minX = Math.min(...filledCells.map((cell) => cell.x));
    const maxX = Math.max(...filledCells.map((cell) => cell.x));
    const minY = Math.min(...filledCells.map((cell) => cell.y));
    const maxY = Math.max(...filledCells.map((cell) => cell.y));
    const pieceWidth = maxX - minX + 1;
    const pieceHeight = maxY - minY + 1;
    const cell = Math.min(area.width / 6.1, area.height / 4.4, 23);
    const startX = (area.width - pieceWidth * cell) / 2;
    const startY = (area.height - pieceHeight * cell) / 2;

    filledCells.forEach(({ x, y }) => {
      drawPreviewBlock(
        context,
        startX + (x - minX) * cell,
        startY + (y - minY) * cell,
        cell,
        COLORS[type],
        alpha,
      );
    });
  }

  function drawPreviewBlock(context, x, y, size, color, alpha) {
    const gap = Math.max(1.3, size * 0.06);
    const px = x + gap;
    const py = y + gap;
    const blockSize = size - gap * 2;
    const radius = Math.max(2, size * 0.14);
    context.save();
    context.globalAlpha = alpha;
    context.shadowColor = color;
    context.shadowBlur = size * 0.28;
    context.fillStyle = color;
    roundRect(context, px, py, blockSize, blockSize, radius);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "rgba(255,255,255,0.24)";
    roundRect(context, px + 1, py + 1, blockSize - 2, blockSize * 0.36, radius);
    context.fill();
    context.restore();
  }

  function updateStats() {
    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem(currentHighScoreKey(), String(state.highScore));
    }
    scoreEl.textContent = formatNumber(state.score);
    highScoreEl.textContent = formatNumber(state.highScore);
    highScoreLabel.textContent = `最高分 · ${state.dropMode === "strict" ? "严格" : "标准"}`;
    riskMultiplierEl.textContent = `×${state.riskMultiplier.toFixed(2)}`;
    levelEl.textContent = formatNumber(state.level);
    linesEl.textContent = formatNumber(state.lines);
    mobileScoreEl.textContent = formatNumber(state.score);
    mobileHighScoreEl.textContent = formatNumber(state.highScore);
    mobileLevelEl.textContent = formatNumber(state.level);
    mobileRiskEl.textContent = `×${state.riskMultiplier.toFixed(2)}`;
    boardFrame.classList.toggle("is-danger", state.riskMultiplier >= 1.24);
    boardFrame.classList.toggle("is-critical", state.riskMultiplier >= 1.6);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("zh-CN").format(value);
  }

  function getAudioContext() {
    if (!state.audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) state.audioContext = new AudioContext();
    }
    return state.audioContext;
  }

  function ensureMusicGain(audio) {
    if (!state.musicGain) {
      state.musicGain = audio.createGain();
      state.musicGain.gain.value = 0.65;
      state.musicGain.connect(audio.destination);
    }
    return state.musicGain;
  }

  function scheduleMusicTone(frequency, duration, type, volume, delay = 0) {
    if (state.muted || !state.musicGain) return;
    const audio = state.audioContext;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(state.musicGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  function playMusicStep() {
    if (state.muted || state.status !== "playing") return;
    const audio = getAudioContext();
    if (!audio) return;
    if (audio.state === "suspended") audio.resume();
    ensureMusicGain(audio);

    const bassNotes = [55, 55, 65.41, 49, 55, 43.65, 49, 41.2];
    const leadNotes = [220, 261.63, 329.63, 392, 329.63, 261.63, 196, 220];
    const step = state.musicStep % 8;
    if (step % 2 === 0) {
      scheduleMusicTone(bassNotes[step], 0.34, "triangle", 0.075);
    }
    scheduleMusicTone(leadNotes[step], 0.13, "square", 0.032);
    if (step === 3 || step === 7) {
      scheduleMusicTone(leadNotes[(step + 2) % 8] * 2, 0.09, "sine", 0.015, 0.1);
    }
    state.musicStep += 1;
  }

  function startMusic() {
    if (state.muted || state.status !== "playing" || state.musicPlaying) return;
    const audio = getAudioContext();
    if (!audio) return;
    ensureMusicGain(audio);
    state.musicPlaying = true;
    playMusicStep();
    state.musicTimer = window.setInterval(playMusicStep, 205);
  }

  function stopMusic() {
    state.musicPlaying = false;
    window.clearInterval(state.musicTimer);
    state.musicTimer = null;
  }

  function playTone(frequency, duration, type = "sine", volume = 0.025, delay = 0) {
    if (state.muted) return;
    const audio = getAudioContext();
    if (!audio) return;
    if (audio.state === "suspended") audio.resume();

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function playSound(name) {
    const sounds = {
      move: () => playTone(180, 0.035, "square", 0.009),
      rotate: () => playTone(310, 0.05, "triangle", 0.013),
      hold: () => {
        playTone(420, 0.05, "sine", 0.018);
        playTone(620, 0.07, "sine", 0.014, 0.04);
      },
      hardDrop: () => {
        playTone(110, 0.08, "sawtooth", 0.018);
        playTone(80, 0.12, "triangle", 0.014, 0.025);
      },
      lock: () => playTone(95, 0.06, "square", 0.012),
      transform: () => {
        playTone(210, 0.07, "square", 0.015);
        playTone(145, 0.1, "triangle", 0.014, 0.035);
        playTone(92, 0.12, "sawtooth", 0.011, 0.07);
      },
      clear: () => {
        playTone(523, 0.08, "sine", 0.025);
        playTone(659, 0.11, "sine", 0.022, 0.06);
      },
      tetris: () => {
        [523, 659, 784, 1047].forEach((note, index) => {
          playTone(note, 0.14, "triangle", 0.028, index * 0.065);
        });
      },
      gameover: () => {
        [330, 262, 196, 130].forEach((note, index) => {
          playTone(note, 0.22, "sawtooth", 0.018, index * 0.1);
        });
      },
    };
    sounds[name]?.();
  }

  function updateSoundButton() {
    soundToggle.classList.toggle("is-muted", state.muted);
    soundToggle.setAttribute("aria-label", state.muted ? "打开声音" : "关闭声音");
  }

  function updateModePicker() {
    modeButtons.forEach((button) => {
      const selected = button.dataset.dropMode === state.dropMode;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function setDropMode(mode) {
    if (state.status !== "ready" || !["standard", "strict"].includes(mode)) return;
    state.dropMode = mode;
    localStorage.setItem(DROP_MODE_STORAGE_KEY, mode);
    state.highScore = loadModeHighScore(mode);
    state.leaderboardMode = mode;
    updateModePicker();
    updateStats();
    refreshLeaderboard(mode);
  }

  function openLeaderboard(mode = state.leaderboardMode) {
    if (state.status === "playing") togglePause();
    leaderboardModal.hidden = false;
    document.body.classList.add("has-modal");
    refreshLeaderboard(mode);
    closeLeaderboardButton.focus();
  }

  function closeLeaderboard() {
    leaderboardModal.hidden = true;
    document.body.classList.remove("has-modal");
  }

  function setupInput() {
    let repeatDelay = null;
    let repeatInterval = null;

    const stopRepeat = (event) => {
      if (event?.code === "ArrowLeft" || event?.code === "ArrowRight") {
        window.clearTimeout(repeatDelay);
        window.clearInterval(repeatInterval);
        repeatDelay = null;
        repeatInterval = null;
      }
    };

    window.addEventListener("keydown", (event) => {
      const code = event.code;
      if (code === "Escape" && !leaderboardModal.hidden) {
        event.preventDefault();
        closeLeaderboard();
        return;
      }
      if (
        state.status === "ready" &&
        ["Enter", "Space"].includes(code) &&
        event.target?.closest?.("[data-drop-mode]")
      ) {
        return;
      }
      const handledKeys = [
        "ArrowLeft",
        "ArrowRight",
        "ArrowDown",
        "ArrowUp",
        "Space",
        "KeyX",
        "KeyZ",
        "KeyC",
        "KeyP",
        "Escape",
        "KeyR",
        "Enter",
      ];
      if (handledKeys.includes(code)) event.preventDefault();

      if (code === "Enter" && state.status === "ready") {
        startGame();
        return;
      }

      if (code === "KeyR" && state.status !== "ready") {
        startGame();
        return;
      }

      if ((code === "KeyP" || code === "Escape") && ["playing", "paused"].includes(state.status)) {
        togglePause();
        return;
      }

      if (state.status !== "playing") return;
      if (event.repeat) return;

      if (code === "ArrowLeft" || code === "ArrowRight") {
        const direction = code === "ArrowLeft" ? -1 : 1;
        move(direction);
        window.clearTimeout(repeatDelay);
        window.clearInterval(repeatInterval);
        repeatDelay = window.setTimeout(() => {
          repeatInterval = window.setInterval(() => move(direction), 55);
        }, 135);
      } else if (code === "ArrowDown") {
        hardDrop();
      } else if (code === "ArrowUp" || code === "KeyX") {
        rotate(1);
      } else if (code === "KeyZ") {
        rotate(-1);
      } else if (code === "Space") {
        hardDrop();
      } else if (code === "KeyC") {
        holdPiece();
      }
    });

    window.addEventListener("keyup", stopRepeat);
    window.addEventListener("blur", () => {
      stopRepeat({ code: "ArrowLeft" });
      stopRepeat({ code: "ArrowRight" });
      if (state.status === "playing") togglePause();
    });

    document.querySelectorAll("[data-action]").forEach((button) => {
      let holdDelay = null;
      let holdInterval = null;
      const stopHolding = () => {
        window.clearTimeout(holdDelay);
        window.clearInterval(holdInterval);
        holdDelay = null;
        holdInterval = null;
      };

      const runAction = (event) => {
        event.preventDefault();
        if (state.status !== "playing") return;
        const actions = {
          left: () => move(-1),
          right: () => move(1),
          rotate: () => rotate(1),
          hardDrop,
        };
        actions[button.dataset.action]?.();

        if (["left", "right"].includes(button.dataset.action)) {
          stopHolding();
          holdDelay = window.setTimeout(() => {
            holdInterval = window.setInterval(actions[button.dataset.action], 65);
          }, 170);
        }
      };
      button.addEventListener("pointerdown", runAction);
      button.addEventListener("pointerup", stopHolding);
      button.addEventListener("pointercancel", stopHolding);
      button.addEventListener("pointerleave", stopHolding);
    });

    setupTouchSwipe();
  }

  function setupTouchSwipe() {
    let startX = 0;
    let startY = 0;
    let lastMoveX = 0;
    let startTime = 0;
    let tracking = false;
    let moved = false;

    canvas.addEventListener("pointerdown", (event) => {
      if (state.status !== "playing") return;
      startX = event.clientX;
      startY = event.clientY;
      lastMoveX = event.clientX;
      startTime = performance.now();
      moved = false;
      tracking = true;
      canvas.setPointerCapture?.(event.pointerId);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!tracking) return;
      const dx = event.clientX - lastMoveX;
      const totalX = event.clientX - startX;
      const totalY = event.clientY - startY;
      const threshold = Math.max(18, canvas.getBoundingClientRect().width / 11);

      if (Math.abs(totalX) > Math.abs(totalY) && Math.abs(dx) >= threshold) {
        const steps = Math.trunc(Math.abs(dx) / threshold);
        const direction = Math.sign(dx);
        for (let i = 0; i < steps; i += 1) move(direction);
        lastMoveX += direction * steps * threshold;
        moved = true;
      }
    });

    const finishGesture = (event) => {
      if (!tracking) return;
      tracking = false;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const elapsed = performance.now() - startTime;
      const swipeThreshold = 35;

      if (dy < -swipeThreshold && Math.abs(dy) > Math.abs(dx) * 1.2) {
        rotate(1);
      } else if (dy > swipeThreshold * 1.7 && Math.abs(dy) > Math.abs(dx) * 1.15) {
        hardDrop();
      } else if (!moved && Math.abs(dx) < 15 && Math.abs(dy) < 15 && elapsed < 280) {
        rotate(1);
      }
    };

    canvas.addEventListener("pointerup", finishGesture);
    canvas.addEventListener("pointercancel", () => {
      tracking = false;
    });
  }

  startButton.addEventListener("click", startGame);
  resumeButton.addEventListener("click", resumeGame);
  playAgainButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", startGame);
  restartFromPause.addEventListener("click", startGame);
  soundToggle.addEventListener("click", () => {
    state.muted = !state.muted;
    localStorage.setItem("neonBlocksMuted", String(state.muted));
    updateSoundButton();
    if (state.muted) {
      stopMusic();
    } else {
      playSound("rotate");
      if (state.status === "playing") startMusic();
    }
  });
  modeButtons.forEach((button) => {
    button.addEventListener("click", () => setDropMode(button.dataset.dropMode));
  });
  leaderboardButton.addEventListener("click", () => openLeaderboard(state.dropMode));
  previewLeaderboardButton.addEventListener("click", () => openLeaderboard(state.dropMode));
  closeLeaderboardButton.addEventListener("click", closeLeaderboard);
  leaderboardModal.addEventListener("click", (event) => {
    if (event.target === leaderboardModal) closeLeaderboard();
  });
  rankingModeButtons.forEach((button) => {
    button.addEventListener("click", () => refreshLeaderboard(button.dataset.rankingMode));
  });

  state.playerId = getOrCreatePlayerId();
  updateSoundButton();
  updateModePicker();
  updateStats();
  draw();
  drawHold();
  fillNextQueue();
  drawNext();
  setupInput();
  refreshLeaderboard(state.dropMode);
})();
