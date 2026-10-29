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
  const MUSIC_VOLUME_STORAGE_KEY = "neonBlocksMusicVolume";
  const BUTTON_VOLUME_STORAGE_KEY = "neonBlocksButtonVolume";
  const MUSIC_PRESET_STORAGE_KEY = "neonBlocksMusicPreset";
  const SOUND_VOLUMES_STORAGE_KEY = "neonBlocksSoundVolumes";
  const AUDIO_DEFAULTS_VERSION_KEY = "neonBlocksAudioDefaultsV4";
  const AUDIO_DEBUG_ENABLED = false;
  const LEADERBOARD_LIMIT = 100;
  const PLAYER_ID_VERSION = "device-v2-";
  const LOCAL_LEADERBOARD_RESET_KEY = "neonBlocksLeaderboardResetV2";
  const SUPABASE_URL = window.NEON_SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = window.NEON_SUPABASE_ANON_KEY || "";
  const MODE_SCORE_MULTIPLIERS = {
    standard: 1,
    strict: 1.25,
  };
  const MUSIC_PRESETS = {
    deepSpace: {
      name: "深空漫游",
      interval: 360,
      bassNotes: [43.65, 43.65, 49, 55, 49, 43.65, 41.2, 36.71],
      leadNotes: [174.61, 220, 261.63, 329.63, 293.66, 246.94, 220, 196],
      bassType: "sine",
      leadType: "sine",
      bassVolume: 0.065,
      leadVolume: 0.012,
    },
    soft: {
      name: "柔和星夜",
      interval: 260,
      bassNotes: [55, 55, 65.41, 49, 55, 43.65, 49, 41.2],
      leadNotes: [220, 261.63, 329.63, 392, 329.63, 261.63, 196, 220],
      bassType: "triangle",
      leadType: "sine",
      bassVolume: 0.055,
      leadVolume: 0.02,
    },
    crystal: {
      name: "晶光旋律",
      interval: 225,
      bassNotes: [65.41, 73.42, 82.41, 73.42, 65.41, 55, 61.74, 73.42],
      leadNotes: [329.63, 392, 493.88, 587.33, 493.88, 392, 329.63, 293.66],
      bassType: "sine",
      leadType: "triangle",
      bassVolume: 0.045,
      leadVolume: 0.024,
    },
    drift: {
      name: "低音漫游",
      interval: 330,
      bassNotes: [43.65, 43.65, 49, 55, 49, 43.65, 41.2, 36.71],
      leadNotes: [174.61, 196, 220, 246.94, 220, 196, 174.61, 164.81],
      bassType: "triangle",
      leadType: "sine",
      bassVolume: 0.075,
      leadVolume: 0.015,
    },
  };
  const SOUND_CONTROL_DEFINITIONS = [
    { id: "move", label: "左右移动" },
    { id: "fall", label: "自动下落" },
    { id: "rotate", label: "旋转" },
    { id: "hold", label: "暂存" },
    { id: "hardDrop", label: "直接落底" },
    { id: "contact", label: "方块触底" },
    { id: "lock", label: "方块固定" },
    { id: "scatter", label: "变形碎散" },
    { id: "clear", label: "普通消行" },
    { id: "tetris", label: "四行消除" },
    { id: "gameover", label: "游戏结束" },
  ];
  const DEFAULT_SOUND_VOLUMES = {
    move: 548,
    fall: 2645,
    rotate: 4756,
    hold: 4756,
    hardDrop: 2098,
    contact: 5000,
    lock: 4756,
    scatter: 5927,
    clear: 8936,
    tetris: 4756,
    gameover: 4756,
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
  const boardLayer = document.createElement("canvas");
  const boardLayerCtx = boardLayer.getContext("2d");
  const spaceCanvas = document.getElementById("spaceCanvas");
  const spaceCtx = spaceCanvas.getContext("2d");
  const holdCanvas = document.getElementById("holdCanvas");
  const holdCtx = holdCanvas.getContext("2d");
  const nextCanvas = document.getElementById("nextCanvas");
  const nextCtx = nextCanvas.getContext("2d");
  const mobileHoldCanvas = document.getElementById("mobileHoldCanvas");
  const mobileHoldCtx = mobileHoldCanvas.getContext("2d");
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
  const finalRankEl = document.getElementById("finalRank");
  const finalBestRankEl = document.getElementById("finalBestRank");
  const resultLeaderboardButton = document.getElementById("resultLeaderboardButton");
  const scoreSubmitStatus = document.getElementById("scoreSubmitStatus");
  const rulesButton = document.getElementById("rulesButton");
  const pauseButton = document.getElementById("pauseButton");
  const leaderboardButton = document.getElementById("leaderboardButton");
  const previewLeaderboardButton = document.getElementById("previewLeaderboardButton");
  const leaderboardModal = document.getElementById("leaderboardModal");
  const closeLeaderboardButton = document.getElementById("closeLeaderboardButton");
  const leaderboardListEl = document.getElementById("leaderboardList");
  const leaderboardStatusEl = document.getElementById("leaderboardStatus");
  const rulesModal = document.getElementById("rulesModal");
  const closeRulesButton = document.getElementById("closeRulesButton");
  const leaderboardPreviewListEl = document.getElementById("leaderboardPreviewList");
  const previewModeEl = document.getElementById("previewMode");
  const rankingModeButtons = [
    ...document.querySelectorAll("[data-ranking-mode]"),
  ];
  const audioDebugToggle = document.getElementById("audioDebugToggle");
  const audioDebugPanel = document.getElementById("audioDebugPanel");
  const closeAudioDebug = document.getElementById("closeAudioDebug");
  const musicVolumeSlider = document.getElementById("musicVolumeSlider");
  const musicVolumeValue = document.getElementById("musicVolumeValue");
  const buttonVolumeSlider = document.getElementById("buttonVolumeSlider");
  const buttonVolumeValue = document.getElementById("buttonVolumeValue");
  const musicPresetSelect = document.getElementById("musicPreset");
  const previewMusicButton = document.getElementById("previewMusicButton");
  const previewButtonSound = document.getElementById("previewButtonSound");
  const soundControlList = document.getElementById("soundControlList");

  const startOverlay = document.getElementById("startOverlay");
  const pauseOverlay = document.getElementById("pauseOverlay");
  const gameOverOverlay = document.getElementById("gameOverOverlay");
  const startButton = document.getElementById("startButton");
  const resumeButton = document.getElementById("resumeButton");
  const rematchButton = document.getElementById("rematchButton");
  const playAgainButton = document.getElementById("playAgainButton");
  const restartButton = document.getElementById("restartButton");
  const restartFromPause = document.getElementById("restartFromPause");
  const homeFromPause = document.getElementById("homeFromPause");
  const mobileHoldType = document.getElementById("mobileHoldType");
  const mobileModeLabel = document.getElementById("mobileModeLabel");
  const nextLevelRemaining = document.getElementById("nextLevelRemaining");
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
  if (localStorage.getItem(LOCAL_LEADERBOARD_RESET_KEY) !== "true") {
    localStorage.removeItem(`${LEADERBOARD_STORAGE_PREFIX}:standard`);
    localStorage.removeItem(`${LEADERBOARD_STORAGE_PREFIX}:strict`);
    localStorage.setItem(LOCAL_LEADERBOARD_RESET_KEY, "true");
  }
  if (localStorage.getItem(AUDIO_DEFAULTS_VERSION_KEY) !== "4") {
    localStorage.setItem(MUSIC_VOLUME_STORAGE_KEY, "2175");
    localStorage.setItem(BUTTON_VOLUME_STORAGE_KEY, "1957");
    localStorage.setItem(MUSIC_PRESET_STORAGE_KEY, "deepSpace");
    localStorage.setItem(
      SOUND_VOLUMES_STORAGE_KEY,
      JSON.stringify(DEFAULT_SOUND_VOLUMES),
    );
    localStorage.setItem(AUDIO_DEFAULTS_VERSION_KEY, "4");
  }

  function loadSoundVolumes() {
    try {
      const stored = JSON.parse(
        localStorage.getItem(SOUND_VOLUMES_STORAGE_KEY) || "{}",
      );
      const volumes = { ...DEFAULT_SOUND_VOLUMES };
      SOUND_CONTROL_DEFINITIONS.forEach(({ id }) => {
        const value = Number(stored[id]);
        if (Number.isFinite(value)) {
          volumes[id] = Math.min(20000, Math.max(1, value));
        }
      });
      return volumes;
    } catch {
      return { ...DEFAULT_SOUND_VOLUMES };
    }
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
    lineClearWaves: [],
    boardLayerDirty: true,
    blockSpriteCache: new Map(),
    starGlowSprites: {},
    planetSprite: null,
    backgroundStars: [],
    backgroundNebulae: [],
    backgroundBursts: [],
    shootingStars: [],
    spaceEnergy: 0.1,
    spaceTargetEnergy: 0.1,
    spacePulse: 0,
    spaceTime: 0,
    spaceLastFrame: 0,
    spaceAnimationFrame: null,
    spaceReducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false,
    shakeTime: 0,
    shakePower: 0,
    floatingScores: [],
    dropCounter: 0,
    lockCounter: 0,
    lockResets: 0,
    grounded: false,
    lastTime: 0,
    clearedRows: [],
    effectTime: 0,
    transformEffect: null,
    dropAnimation: null,
    dropMode: normalizedSavedMode,
    muted: localStorage.getItem("neonBlocksMuted") === "true",
    musicVolume: Math.min(
      20000,
      Math.max(1, Number(localStorage.getItem(MUSIC_VOLUME_STORAGE_KEY)) || 2175),
    ),
    buttonVolume: Math.min(
      20000,
      Math.max(1, Number(localStorage.getItem(BUTTON_VOLUME_STORAGE_KEY)) || 1957),
    ),
    soundVolumes: loadSoundVolumes(),
    activeSoundName: "",
    musicPreset: MUSIC_PRESETS[localStorage.getItem(MUSIC_PRESET_STORAGE_KEY)]
      ? localStorage.getItem(MUSIC_PRESET_STORAGE_KEY)
      : "deepSpace",
    audioContext: null,
    musicGain: null,
    musicDuckGain: null,
    musicCompressor: null,
    effectCompressor: null,
    noiseBuffer: null,
    musicDuckTimer: null,
    musicTimer: null,
    musicStep: 0,
    musicPlaying: false,
    animationFrame: null,
    pendingTimers: new Set(),
  };

  let lastFrameTime = performance.now();
  let resizeFrame = null;

  function createBoard() {
    return Array.from({ length: ROWS + HIDDEN_ROWS }, () => Array(COLS).fill(null));
  }

  function resizeCanvasBackingStore(element, heightRatio = null) {
    const rect = element.getBoundingClientRect();
    if (rect.width < 1) return false;
    const pixelRatio = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = heightRatio
      ? Math.max(1, Math.round(width * heightRatio))
      : Math.max(1, Math.round(rect.height * pixelRatio));
    if (element.width === width && element.height === height) return false;
    element.width = width;
    element.height = height;
    return true;
  }

  function syncRenderCanvases() {
    const boardChanged = resizeCanvasBackingStore(canvas);
    const changed =
      boardChanged |
      resizeCanvasBackingStore(nextCanvas, 2) |
      resizeCanvasBackingStore(holdCanvas, 0.75) |
      resizeCanvasBackingStore(mobileHoldCanvas, 25 / 24);
    if (!changed) return;
    if (boardChanged) {
      state.blockSpriteCache.clear();
      state.boardLayerDirty = true;
    }
    state.particleBursts = [];
    state.lineClearWaves = [];
    state.floatingScores = [];
    draw();
    drawHold();
    drawNext();
  }

  function scheduleCanvasSync() {
    if (resizeFrame !== null) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      syncRenderCanvases();
      resizeSpaceCanvas();
    });
  }

  function createStarGlowSprite(color, dpr) {
    const size = Math.max(12, Math.round(14 * dpr));
    const sprite = document.createElement("canvas");
    sprite.width = size;
    sprite.height = size;
    const spriteCtx = sprite.getContext("2d");
    spriteCtx.shadowColor = color;
    spriteCtx.shadowBlur = size * 0.42;
    spriteCtx.fillStyle = color;
    spriteCtx.beginPath();
    spriteCtx.arc(size / 2, size / 2, Math.max(1, size * 0.085), 0, Math.PI * 2);
    spriteCtx.fill();
    return sprite;
  }

  function createNebulaSprite(nebula) {
    const size = Math.ceil(nebula.radius * 2);
    const sprite = document.createElement("canvas");
    sprite.width = size;
    sprite.height = size;
    const spriteCtx = sprite.getContext("2d");
    const gradient = spriteCtx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, `rgba(${nebula.color}, 0.28)`);
    gradient.addColorStop(0.42, `rgba(${nebula.color}, 0.11)`);
    gradient.addColorStop(1, `rgba(${nebula.color}, 0)`);
    spriteCtx.fillStyle = gradient;
    spriteCtx.fillRect(0, 0, size, size);
    return sprite;
  }

  function createPlanetSprite() {
    const size = 360;
    const sprite = document.createElement("canvas");
    sprite.width = size;
    sprite.height = size;
    const spriteCtx = sprite.getContext("2d");
    const center = size / 2;
    const radius = size * 0.31;
    const planet = spriteCtx.createRadialGradient(
      center - radius * 0.35,
      center - radius * 0.35,
      radius * 0.08,
      center,
      center,
      radius,
    );
    planet.addColorStop(0, "rgba(80, 225, 255, 0.48)");
    planet.addColorStop(0.55, "rgba(28, 83, 154, 0.24)");
    planet.addColorStop(1, "rgba(3, 12, 31, 0)");
    spriteCtx.fillStyle = planet;
    spriteCtx.beginPath();
    spriteCtx.arc(center, center, radius, 0, Math.PI * 2);
    spriteCtx.fill();
    spriteCtx.strokeStyle = "rgba(103, 227, 255, 0.24)";
    spriteCtx.lineWidth = 2;
    spriteCtx.beginPath();
    spriteCtx.ellipse(
      center,
      center,
      radius * 1.35,
      radius * 0.24,
      -0.22,
      0,
      Math.PI * 2,
    );
    spriteCtx.stroke();
    return sprite;
  }

  function initializeSpaceScene() {
    const width = spaceCanvas.width;
    const height = spaceCanvas.height;
    const areaScale = width * height;
    const reduced = state.spaceReducedMotion;
    const starCount = reduced
      ? 34
      : areaScale < 700000
        ? 110
        : 180;
    state.backgroundStars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      depth: 0.2 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 2.4,
      color: Math.random() > 0.6 ? "#63f4ff" : "#9bbcff",
    }));
    state.backgroundNebulae = Array.from(
      { length: reduced ? 2 : areaScale < 700000 ? 4 : 6 },
      (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.min(width, height) * (0.16 + Math.random() * 0.22),
        phase: Math.random() * Math.PI * 2,
        color: index % 2 === 0 ? "39, 179, 255" : "107, 92, 255",
        speed: 0.00008 + Math.random() * 0.00012,
      }),
    );
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    state.starGlowSprites = {
      cyan: createStarGlowSprite("#63f4ff", dpr),
      blue: createStarGlowSprite("#9bbcff", dpr),
    };
    state.backgroundNebulae.forEach((nebula) => {
      nebula.sprite = createNebulaSprite(nebula);
    });
    state.planetSprite = createPlanetSprite();
  }

  function resizeSpaceCanvas() {
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const width = Math.max(1, Math.round(window.innerWidth * dpr));
    const height = Math.max(1, Math.round(window.innerHeight * dpr));
    if (spaceCanvas.width === width && spaceCanvas.height === height) return;
    spaceCanvas.width = width;
    spaceCanvas.height = height;
    initializeSpaceScene();
  }

  function triggerSpaceBurst(rows = 1) {
    const rect = boardFrame.getBoundingClientRect();
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const centerX = (rect.left + rect.width * 0.5) * dpr;
    const centerY = (rect.top + rect.height * 0.5) * dpr;
    state.spacePulse = Math.min(1.2, state.spacePulse + 0.35 + rows * 0.12);
    if (state.spaceReducedMotion) return;

    const count = 18 + rows * 8;
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.04 + Math.random() * 0.17) * dpr;
      state.backgroundBursts.push({
        x: centerX + (Math.random() - 0.5) * rect.width * dpr * 0.3,
        y: centerY + (Math.random() - 0.5) * rect.height * dpr * 0.25,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        age: 0,
        life: 900 + Math.random() * 700,
        size: (0.7 + Math.random() * 1.8) * dpr,
        color: index % 3 === 0 ? "#75f5ff" : "#6d8cff",
      });
    }
  }

  function drawSpaceBackground() {
    const width = spaceCanvas.width;
    const height = spaceCanvas.height;
    const energy = Math.min(
      1,
      state.spaceEnergy + state.spacePulse * 0.24,
    );
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));

    spaceCtx.clearRect(0, 0, width, height);
    const base = spaceCtx.createLinearGradient(0, 0, 0, height);
    base.addColorStop(0, "#020611");
    base.addColorStop(0.55, "#050b1b");
    base.addColorStop(1, "#01040c");
    spaceCtx.fillStyle = base;
    spaceCtx.fillRect(0, 0, width, height);

    spaceCtx.save();
    spaceCtx.globalCompositeOperation = "screen";
    state.backgroundNebulae.forEach((nebula) => {
      const driftX = Math.sin(state.spaceTime * nebula.speed + nebula.phase) * width * 0.04;
      const driftY = Math.cos(state.spaceTime * nebula.speed * 1.2 + nebula.phase) * height * 0.03;
      spaceCtx.globalAlpha = 0.72 + energy * 0.45;
      spaceCtx.drawImage(
        nebula.sprite,
        nebula.x + driftX - nebula.radius,
        nebula.y + driftY - nebula.radius,
      );
    });
    spaceCtx.restore();

    if (energy > 0.48) {
      const planetX = width * 0.79;
      const planetY = height * 0.24;
      const radius = Math.min(width, height) * 0.18;
      const spriteSize = radius * (360 / (360 * 0.31));
      spaceCtx.save();
      spaceCtx.globalAlpha = (energy - 0.48) * 1.35;
      spaceCtx.drawImage(
        state.planetSprite,
        planetX - spriteSize / 2,
        planetY - spriteSize / 2,
        spriteSize,
        spriteSize,
      );
      spaceCtx.restore();
    }

    state.backgroundStars.forEach((star) => {
      const twinkle = 0.32 + 0.58 * (0.5 + Math.sin(state.spaceTime * 0.0018 + star.phase) * 0.5);
      const sprite = state.starGlowSprites[star.color === "#63f4ff" ? "cyan" : "blue"];
      const drawSize = Math.max(2, star.depth * 5.4 * dpr);
      spaceCtx.globalAlpha = twinkle * (0.68 + energy * 0.45);
      spaceCtx.drawImage(
        sprite,
        star.x - drawSize / 2,
        star.y - drawSize / 2,
        drawSize,
        drawSize,
      );
    });
    spaceCtx.globalAlpha = 1;

    state.shootingStars.forEach((shooting) => {
      const fade = 1 - shooting.age / shooting.life;
      spaceCtx.save();
      spaceCtx.globalAlpha = fade * 0.8;
      const gradient = spaceCtx.createLinearGradient(
        shooting.x,
        shooting.y,
        shooting.x - shooting.vx * 18,
        shooting.y - shooting.vy * 18,
      );
      gradient.addColorStop(0, "#d8feff");
      gradient.addColorStop(1, "rgba(65, 180, 255, 0)");
      spaceCtx.strokeStyle = gradient;
      spaceCtx.lineWidth = Math.max(1, dpr * 0.8);
      spaceCtx.beginPath();
      spaceCtx.moveTo(shooting.x, shooting.y);
      spaceCtx.lineTo(shooting.x - shooting.vx * 18, shooting.y - shooting.vy * 18);
      spaceCtx.stroke();
      spaceCtx.restore();
    });

    spaceCtx.save();
    state.backgroundBursts.forEach((particle) => {
      const fade = Math.max(0, 1 - particle.age / particle.life);
      spaceCtx.globalAlpha = fade;
      spaceCtx.fillStyle = particle.color;
      spaceCtx.shadowColor = particle.color;
      spaceCtx.shadowBlur = particle.size * 2;
      spaceCtx.beginPath();
      spaceCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      spaceCtx.fill();
    });
    spaceCtx.restore();
  }

  function updateSpaceBackground(now) {
    if (!state.spaceLastFrame) state.spaceLastFrame = now;
    const minimumFrameTime = state.status === "paused" ? 100 : 1000 / 30;
    if (now - state.spaceLastFrame < minimumFrameTime) {
      state.spaceAnimationFrame = requestAnimationFrame(updateSpaceBackground);
      return;
    }

    const delta = Math.min(100, now - state.spaceLastFrame);
    state.spaceLastFrame = now;
    const speedFactor = state.spaceReducedMotion
      ? 0.08
      : state.status === "paused"
        ? 0.12
        : state.status === "gameover"
          ? 0.35
          : 1;
    state.spaceTime += delta;
    state.spaceEnergy +=
      (state.spaceTargetEnergy - state.spaceEnergy) * Math.min(1, delta * 0.00055);
    state.spacePulse = Math.max(0, state.spacePulse - delta * 0.0012);

    state.backgroundStars.forEach((star) => {
      star.y += star.speed * speedFactor * delta * 0.011;
      if (star.y > spaceCanvas.height + 4) {
        star.y = -4;
        star.x = Math.random() * spaceCanvas.width;
      }
    });

    if (
      !state.spaceReducedMotion &&
      state.spaceEnergy > 0.42 &&
      Math.random() < delta * 0.000045
    ) {
      state.shootingStars.push({
        x: spaceCanvas.width * (0.35 + Math.random() * 0.55),
        y: spaceCanvas.height * (0.12 + Math.random() * 0.35),
        vx: 0.09 + Math.random() * 0.1,
        vy: 0.035 + Math.random() * 0.045,
        age: 0,
        life: 750 + Math.random() * 550,
      });
    }
    state.shootingStars = state.shootingStars.filter((shooting) => {
      shooting.age += delta * speedFactor;
      shooting.x += shooting.vx * delta * speedFactor;
      shooting.y += shooting.vy * delta * speedFactor;
      return shooting.age < shooting.life;
    });
    state.backgroundBursts = state.backgroundBursts.filter((particle) => {
      particle.age += delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx *= 0.994;
      particle.vy *= 0.994;
      return particle.age < particle.life;
    });

    drawSpaceBackground();
    state.spaceAnimationFrame = requestAnimationFrame(updateSpaceBackground);
  }

  function startSpaceBackground() {
    resizeSpaceCanvas();
    cancelAnimationFrame(state.spaceAnimationFrame);
    state.spaceLastFrame = 0;
    state.spaceAnimationFrame = requestAnimationFrame(updateSpaceBackground);
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
    const storedPlayerId = localStorage.getItem(PLAYER_ID_STORAGE_KEY);
    if (storedPlayerId?.startsWith(PLAYER_ID_VERSION)) return storedPlayerId;

    const screenWidth = Math.min(screen.width, screen.height);
    const screenHeight = Math.max(screen.width, screen.height);
    const fingerprint = [
      navigator.language || "",
      navigator.platform || "",
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.hardwareConcurrency || 0,
      navigator.deviceMemory || 0,
      navigator.maxTouchPoints || 0,
      screenWidth,
      screenHeight,
      screen.colorDepth,
      navigator.userAgentData?.platform || "",
      navigator.userAgentData?.mobile ? "mobile" : "desktop",
    ].join("|");
    let hash = 2166136261;
    for (let index = 0; index < fingerprint.length; index += 1) {
      hash ^= fingerprint.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    const playerId = `${PLAYER_ID_VERSION}${(hash >>> 0).toString(36)}-${screenWidth}x${screenHeight}`;
    localStorage.setItem(PLAYER_ID_STORAGE_KEY, playerId);
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
    const suffix = (state.playerId.split("-")[2] || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-4)
      .toUpperCase();
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
        .slice(0, LEADERBOARD_LIMIT);
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
    localStorage.setItem(
      localLeaderboardKey(mode),
      JSON.stringify(rows.slice(0, LEADERBOARD_LIMIT)),
    );
  }

  function localScoreRanks(mode, score) {
    const rows = readLocalLeaderboard(mode);
    const ownRow = rows.find((entry) => entry.playerId === state.playerId);
    const bestScore = Math.max(score, ownRow?.score || 0);
    const runRank = 1 + rows.filter((entry) => entry.score > score).length;
    return {
      runRank: runRank <= LEADERBOARD_LIMIT ? runRank : null,
      bestRank: ownRow
        ? 1 + rows.filter((entry) => entry.score > bestScore).length
        : null,
      bestScore,
    };
  }

  function formatLeaderboardRank(rank) {
    const numericRank = Number(rank);
    return Number.isInteger(numericRank) && numericRank > 0
      ? `第 ${numericRank} 名`
      : "未上榜";
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
    renderLeaderboardRows(
      state.leaderboardRows,
      leaderboardListEl,
      LEADERBOARD_LIMIT,
    );
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
        `${SUPABASE_URL}/rest/v1/leaderboard_scores?select=player_id,name,score,updated_at&mode=eq.${encodeURIComponent(mode)}&order=score.desc,updated_at.asc&limit=${LEADERBOARD_LIMIT}`,
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
      leaderboardStatusEl.textContent = "全球排行榜 · 每次更新显示前 100 名";
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
      const ranks = localScoreRanks(state.dropMode, state.score);
      finalRankEl.textContent = `${formatLeaderboardRank(ranks.runRank)} · 本机`;
      finalBestRankEl.textContent = `${formatLeaderboardRank(ranks.bestRank)} · 本机`;
      scoreSubmitStatus.textContent = `已自动保存 · ${name} · 最高分 ${formatNumber(ranks.bestScore)}`;
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
      const ranks = await response.json();
      finalRankEl.textContent = formatLeaderboardRank(ranks.runRank);
      finalBestRankEl.textContent = formatLeaderboardRank(ranks.bestRank);
      scoreSubmitStatus.textContent = `已自动提交 · ${name} · 最高分 ${formatNumber(ranks.bestScore)}`;
      await refreshLeaderboard(state.dropMode);
    } catch {
      const ranks = localScoreRanks(state.dropMode, state.score);
      finalRankEl.textContent = `${formatLeaderboardRank(ranks.runRank)} · 本机`;
      finalBestRankEl.textContent = `${formatLeaderboardRank(ranks.bestRank)} · 本机`;
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
    triggerSpaceBurst(rows.length);
    rows.forEach((row) => {
      state.lineClearWaves.push({
        x: offsetX + canvas.width * 0.5,
        y: offsetY + (row - HIDDEN_ROWS + 0.5) * cell,
        age: 0,
        life: 460 + rows.length * 45,
        strength: 1 + rows.length * 0.16,
      });
      for (let x = 0; x < COLS; x += 1) {
        const type = state.board[row][x];
        if (!type) continue;
        for (let index = 0; index < 4; index += 1) {
          const shard = index < 2;
          state.particleBursts.push({
            x: offsetX + (x + 0.5) * cell,
            y: offsetY + (row - HIDDEN_ROWS + 0.5) * cell,
            vx: (Math.random() - 0.5) * (shard ? 0.52 : 0.34),
            vy: -0.08 - Math.random() * (shard ? 0.46 : 0.28),
            gravity: shard ? 0.00085 : 0.00048,
            age: 0,
            life: 480 + Math.random() * 520,
            size: cell * (shard
              ? 0.08 + Math.random() * 0.09
              : 0.035 + Math.random() * 0.055),
            color: index === 0 ? "#dffcff" : COLORS[type],
            shape: shard ? "shard" : "spark",
            rotation: Math.random() * Math.PI,
            angularVelocity: (Math.random() - 0.5) * 0.012,
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
      particle.rotation = (particle.rotation || 0) +
        (particle.angularVelocity || 0) * frame;
      return particle.age < particle.life;
    });
    state.lineClearWaves = state.lineClearWaves.filter((wave) => {
      wave.age += delta;
      return wave.age < wave.life;
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
    state.grounded = false;
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
        if (!collides(state.active, 0, 1)) state.grounded = false;
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
      if (!collides(state.active, 0, 1)) state.grounded = false;
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
    state.grounded = true;
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
    state.boardLayerDirty = true;
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
        state.boardLayerDirty = true;
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
        playSound("scatter");
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
    state.boardLayerDirty = true;
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
    state.spaceEnergy = 0.1;
    state.spaceTargetEnergy = 0.1;
    state.spacePulse = 0;
    state.backgroundBursts = [];
    state.scoreSubmitted = false;
    state.particleBursts = [];
    state.lineClearWaves = [];
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
    finalRankEl.textContent = "--";
    finalBestRankEl.textContent = "--";
    updateStats();
    drawHold();
    spawnPiece();
    startMusic();
    lastFrameTime = performance.now();
    state.animationFrame = requestAnimationFrame(update);
  }

  function showStartScreen() {
    cancelAnimationFrame(state.animationFrame);
    clearPendingTimers();
    stopMusic();
    state.status = "ready";
    state.active = null;
    state.board = createBoard();
    state.boardLayerDirty = true;
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
    state.spaceEnergy = 0.1;
    state.spaceTargetEnergy = 0.1;
    state.spacePulse = 0;
    state.backgroundBursts = [];
    state.scoreSubmitted = false;
    state.particleBursts = [];
    state.lineClearWaves = [];
    state.floatingScores = [];
    state.shakeTime = 0;
    state.clearedRows = [];
    state.effectTime = 0;
    state.transformEffect = null;
    state.dropAnimation = null;
    state.highScore = loadModeHighScore(state.dropMode);
    gameOverOverlay.classList.remove("is-visible");
    pauseOverlay.classList.remove("is-visible");
    startOverlay.classList.add("is-visible");
    updateModePicker();
    updateStats();
    drawHold();
    fillNextQueue();
    drawNext();
    draw();
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
    finalRankEl.textContent = "提交中…";
    finalBestRankEl.textContent = "提交中…";
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
      updateStats();
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
    updateStats();
  }

  function update(time) {
    if (state.status !== "playing") return;
    const delta = Math.min(time - lastFrameTime, 100);
    lastFrameTime = time;
    const hadVisualEffects =
      state.particleBursts.length > 0 ||
      state.lineClearWaves.length > 0 ||
      state.floatingScores.length > 0 ||
      state.shakeTime > 0 ||
      state.effectTime > 0 ||
      Boolean(state.transformEffect) ||
      Boolean(state.dropAnimation);
    let needsDraw = hadVisualEffects || state.boardLayerDirty;
    updateVisualEffects(delta);

    if (state.effectTime > 0) {
      state.effectTime = Math.max(0, state.effectTime - delta);
      needsDraw = true;
    }
    if (state.transformEffect) {
      state.transformEffect.time = Math.max(0, state.transformEffect.time - delta);
      if (state.transformEffect.time === 0) state.transformEffect = null;
      needsDraw = true;
    }
    if (state.dropAnimation) {
      state.dropAnimation.elapsed += delta;
      if (state.dropAnimation.elapsed >= state.dropAnimation.duration) {
        const animation = state.dropAnimation;
        state.dropAnimation = null;
        commitLockedCells(animation.cells, true);
      }
      needsDraw = true;
    }

    if (state.active) {
      state.dropCounter += delta;
      const dropInterval = Math.max(70, 850 - (state.level - 1) * 72);

      if (state.dropCounter >= dropInterval) {
        if (!collides(state.active, 0, 1)) {
          state.active.y += 1;
          state.dropCounter = 0;
          playSound("fall");
          needsDraw = true;
        } else {
          state.dropCounter = dropInterval;
        }
      }

      if (collides(state.active, 0, 1)) {
        if (!state.grounded) {
          state.grounded = true;
          playSound("contact");
          needsDraw = true;
        }
        state.lockCounter += delta;
        if (state.lockCounter >= LOCK_DELAY) lockPiece();
      } else {
        state.grounded = false;
        state.lockCounter = 0;
      }
    }

    if (needsDraw || state.boardLayerDirty) draw();
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

  function drawBoardLayer() {
    if (boardLayer.width !== canvas.width || boardLayer.height !== canvas.height) {
      boardLayer.width = canvas.width;
      boardLayer.height = canvas.height;
    }
    const { cell, offsetX, offsetY } = boardCoordinates();
    boardLayerCtx.clearRect(0, 0, boardLayer.width, boardLayer.height);
    const background = boardLayerCtx.createLinearGradient(
      0,
      0,
      0,
      boardLayer.height,
    );
    background.addColorStop(0, "#0c1325");
    background.addColorStop(1, "#070b15");
    boardLayerCtx.fillStyle = background;
    boardLayerCtx.fillRect(0, 0, boardLayer.width, boardLayer.height);
    drawGrid(cell, offsetX, offsetY, boardLayerCtx);
    drawBoardBlocks(cell, offsetX, offsetY, boardLayerCtx);
    state.boardLayerDirty = false;
  }

  function draw() {
    if (state.boardLayerDirty) drawBoardLayer();
    const { cell, offsetX, offsetY } = boardCoordinates();

    ctx.save();
    if (state.shakeTime > 0) {
      const strength = state.shakePower * (state.shakeTime / 560);
      ctx.translate((Math.random() - 0.5) * strength, (Math.random() - 0.5) * strength);
    }
    ctx.drawImage(boardLayer, 0, 0);
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

  function drawGrid(cell, offsetX, offsetY, target = ctx) {
    target.save();
    target.strokeStyle = "rgba(131, 156, 214, 0.075)";
    target.lineWidth = 0.8;

    for (let x = 1; x < COLS; x += 1) {
      const px = offsetX + x * cell;
      target.beginPath();
      target.moveTo(px, offsetY);
      target.lineTo(px, offsetY + ROWS * cell);
      target.stroke();
    }

    for (let y = 1; y < ROWS; y += 1) {
      const py = offsetY + y * cell;
      target.beginPath();
      target.moveTo(offsetX, py);
      target.lineTo(offsetX + COLS * cell, py);
      target.stroke();
    }
    target.restore();
  }

  function drawBoardBlocks(cell, offsetX, offsetY, target = ctx) {
    for (let y = HIDDEN_ROWS; y < state.board.length; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const type = state.board[y][x];
        if (!type) continue;
        drawBlockOn(
          target,
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

  function getBlockSprite(color, size) {
    const roundedSize = Math.max(1, Math.round(size * 2) / 2);
    const key = `${color}:${roundedSize}`;
    const cached = state.blockSpriteCache.get(key);
    if (cached) return cached;

    const padding = Math.max(2, Math.ceil(roundedSize * 0.16));
    const spriteCanvas = document.createElement("canvas");
    spriteCanvas.width = Math.ceil(roundedSize + padding * 2);
    spriteCanvas.height = Math.ceil(roundedSize + padding * 2);
    const spriteCtx = spriteCanvas.getContext("2d");
    spriteCtx.translate(padding, padding);

    const gap = Math.max(1.5, roundedSize * 0.045);
    const px = gap;
    const py = gap;
    const blockSize = roundedSize - gap * 2;
    const radius = Math.max(2, roundedSize * 0.11);
    spriteCtx.shadowColor = color;
    spriteCtx.shadowBlur = roundedSize * 0.12;
    spriteCtx.fillStyle = color;
    roundRect(spriteCtx, px, py, blockSize, blockSize, radius);
    spriteCtx.fill();

    spriteCtx.shadowBlur = 0;
    const gradient = spriteCtx.createLinearGradient(
      px,
      py,
      px + blockSize,
      py + blockSize,
    );
    gradient.addColorStop(0, "rgba(255,255,255,0.46)");
    gradient.addColorStop(0.34, "rgba(255,255,255,0.1)");
    gradient.addColorStop(1, "rgba(0,0,0,0.2)");
    spriteCtx.fillStyle = gradient;
    roundRect(spriteCtx, px, py, blockSize, blockSize, radius);
    spriteCtx.fill();
    spriteCtx.strokeStyle = "rgba(255,255,255,0.42)";
    spriteCtx.lineWidth = Math.max(0.6, roundedSize * 0.035);
    roundRect(
      spriteCtx,
      px + 1,
      py + 1,
      blockSize - 2,
      blockSize - 2,
      radius,
    );
    spriteCtx.stroke();

    const sprite = { canvas: spriteCanvas, padding };
    state.blockSpriteCache.set(key, sprite);
    return sprite;
  }

  function drawBlockOn(target, x, y, size, color, alpha = 1) {
    const sprite = getBlockSprite(color, size);
    target.save();
    target.globalAlpha = alpha;
    target.drawImage(
      sprite.canvas,
      x - sprite.padding,
      y - sprite.padding,
    );
    target.restore();
  }

  function drawBlock(x, y, size, color, alpha = 1) {
    drawBlockOn(ctx, x, y, size, color, alpha);
  }

  function drawClearEffect(cell, offsetX, offsetY) {
    const progress = 1 - state.effectTime / 360;
    ctx.save();
    state.clearedRows.forEach((row) => {
      const y = offsetY + (row - HIDDEN_ROWS) * cell;
      const gradient = ctx.createLinearGradient(offsetX, y, offsetX + COLS * cell, y);
      gradient.addColorStop(0, "rgba(72, 232, 255, 0)");
      gradient.addColorStop(0.18, `rgba(72, 232, 255, ${0.9 * (1 - progress)})`);
      gradient.addColorStop(0.5, `rgba(240, 255, 255, ${0.98 * (1 - progress)})`);
      gradient.addColorStop(0.82, `rgba(72, 232, 255, ${0.9 * (1 - progress)})`);
      gradient.addColorStop(1, "rgba(72, 232, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.shadowColor = "#48e8ff";
      ctx.shadowBlur = 24;
      ctx.fillRect(offsetX, y + cell * (0.22 + progress * 0.12), COLS * cell, cell * 0.56);
    });
    state.lineClearWaves.forEach((wave) => {
      const waveProgress = Math.min(1, wave.age / wave.life);
      const fade = 1 - waveProgress;
      const radiusX = cell * (2.2 + waveProgress * 7.2) * wave.strength;
      const radiusY = cell * (0.42 + waveProgress * 2.8) * wave.strength;
      ctx.globalAlpha = fade * 0.7;
      ctx.strokeStyle = "#bffaff";
      ctx.lineWidth = Math.max(1, cell * 0.08 * fade);
      ctx.shadowColor = "#48e8ff";
      ctx.shadowBlur = cell * 0.45;
      ctx.beginPath();
      ctx.ellipse(wave.x, wave.y, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.stroke();
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
      ctx.shadowBlur = particle.size * 2.4;
      if (particle.shape === "shard") {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation || 0);
        ctx.fillRect(
          -particle.size * 0.5,
          -particle.size * 0.18,
          particle.size * 1.7,
          particle.size * 0.38,
        );
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
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
    clearPreview(mobileHoldCtx, mobileHoldCanvas);
    mobileHoldType.textContent = state.holdType || "空";
    if (!state.holdType) {
      drawEmptyPreview(holdCtx, holdCanvas, "按 C 暂存");
      drawEmptyPreview(mobileHoldCtx, mobileHoldCanvas, "暂无");
      return;
    }
    drawPreviewPiece(holdCtx, holdCanvas, state.holdType, 1);
    drawPreviewPiece(mobileHoldCtx, mobileHoldCanvas, state.holdType, 1);
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
    context.font = `600 ${Math.max(10, element.height * 0.08)}px Inter, sans-serif`;
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
    const cell = Math.min(area.width / 4.4, area.height / 3.8, 72);
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
    const gap = Math.max(1.3, size * 0.05);
    const px = x + gap;
    const py = y + gap;
    const blockSize = size - gap * 2;
    const radius = Math.max(2, size * 0.12);
    context.save();
    context.globalAlpha = alpha;
    context.shadowColor = color;
    context.shadowBlur = size * 0.13;
    context.fillStyle = color;
    roundRect(context, px, py, blockSize, blockSize, radius);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "rgba(255,255,255,0.32)";
    roundRect(context, px + 1, py + 1, blockSize - 2, blockSize * 0.36, radius);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.36)";
    context.lineWidth = Math.max(0.6, size * 0.035);
    roundRect(context, px, py, blockSize, blockSize, radius);
    context.stroke();
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
    mobileModeLabel.textContent =
      state.dropMode === "strict" ? "严格模式" : "标准模式";
    nextLevelRemaining.textContent = `${10 - (state.lines % 10)} 行升级`;
    pauseButton.disabled = !["playing", "paused"].includes(state.status);
    pauseButton.classList.toggle("is-active", state.status === "paused");
    boardFrame.classList.toggle("is-danger", state.riskMultiplier >= 1.24);
    boardFrame.classList.toggle("is-critical", state.riskMultiplier >= 1.6);
    state.spaceTargetEnergy = Math.min(
      0.92,
      0.08 +
        Math.min(0.42, (state.level - 1) * 0.065) +
        Math.max(0, state.combo + 1) * 0.055 +
        Math.max(0, state.riskMultiplier - 1) * 0.48,
    );
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
    if (!state.musicCompressor) {
      state.musicCompressor = audio.createDynamicsCompressor();
      state.musicCompressor.threshold.value = -8;
      state.musicCompressor.knee.value = 10;
      state.musicCompressor.ratio.value = 8;
      state.musicCompressor.attack.value = 0.003;
      state.musicCompressor.release.value = 0.18;
      state.musicCompressor.connect(audio.destination);
    }
    if (!state.musicDuckGain) {
      state.musicDuckGain = audio.createGain();
      state.musicDuckGain.gain.value = 1;
      state.musicDuckGain.connect(state.musicCompressor);
    }
    if (!state.musicGain) {
      state.musicGain = audio.createGain();
      state.musicGain.connect(state.musicDuckGain);
    }
    state.musicGain.gain.setTargetAtTime(
      (4 * state.musicVolume) / 100,
      audio.currentTime,
      0.02,
    );
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

  function duckMusic(level = 0.6, duration = 420) {
    if (!state.musicDuckGain || !state.audioContext || state.muted) return;
    window.clearTimeout(state.musicDuckTimer);
    const now = state.audioContext.currentTime;
    state.musicDuckGain.gain.cancelScheduledValues(now);
    state.musicDuckGain.gain.setValueAtTime(state.musicDuckGain.gain.value, now);
    state.musicDuckGain.gain.linearRampToValueAtTime(level, now + 0.035);
    state.musicDuckTimer = window.setTimeout(() => {
      if (!state.musicDuckGain || !state.audioContext) return;
      const restoreAt = state.audioContext.currentTime;
      state.musicDuckGain.gain.cancelScheduledValues(restoreAt);
      state.musicDuckGain.gain.setValueAtTime(level, restoreAt);
      state.musicDuckGain.gain.linearRampToValueAtTime(1, restoreAt + 0.24);
    }, duration);
  }

  function playMusicStep(force = false) {
    if (state.muted || (!force && state.status !== "playing")) return;
    const audio = getAudioContext();
    if (!audio) return;
    if (audio.state === "suspended") audio.resume();
    ensureMusicGain(audio);

    const preset = MUSIC_PRESETS[state.musicPreset] || MUSIC_PRESETS.soft;
    if (state.musicPreset === "deepSpace") {
      const step = state.musicStep % 16;
      const chordIndex = Math.floor(step / 8) % 4;
      const chords = [
        [110, 164.81, 220],
        [98, 146.83, 196],
        [123.47, 185, 246.94],
        [82.41, 123.47, 164.81],
      ];
      const energy = Math.min(1, state.spaceEnergy);

      if (step % 8 === 0) {
        const chord = chords[chordIndex];
        chord.forEach((frequency, index) => {
          scheduleMusicTone(
            frequency,
            3.2,
            "sine",
            (index === 0 ? 0.011 : 0.008) + energy * 0.004,
          );
        });
        scheduleMusicTone(chord[0] / 2, 3.45, "triangle", 0.04);
      }

      if (step % 2 === 0) {
        const bellNotes = [
          523.25, 659.25, 783.99, 659.25,
          587.33, 440, 493.88, 392,
        ];
        scheduleMusicTone(
          bellNotes[step / 2],
          0.48,
          "sine",
          0.006 + energy * 0.009,
        );
      }

      if (energy > 0.48 && step === 6) {
        scheduleMusicTone(chords[chordIndex][2] * 2, 1.3, "sine", 0.004, 0.16);
      }
      state.musicStep += 1;
      return;
    }

    const step = state.musicStep % 8;
    if (step % 2 === 0) {
      scheduleMusicTone(
        preset.bassNotes[step],
        0.38,
        preset.bassType,
        preset.bassVolume,
      );
    }
    scheduleMusicTone(
      preset.leadNotes[step],
      0.17,
      preset.leadType,
      preset.leadVolume,
    );
    if (step === 3 || step === 7) {
      scheduleMusicTone(
        preset.leadNotes[(step + 2) % 8] * 2,
        0.12,
        "sine",
        preset.leadVolume * 0.4,
        0.12,
      );
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
    const preset = MUSIC_PRESETS[state.musicPreset] || MUSIC_PRESETS.soft;
    state.musicTimer = window.setInterval(playMusicStep, preset.interval);
  }

  function stopMusic() {
    state.musicPlaying = false;
    window.clearInterval(state.musicTimer);
    state.musicTimer = null;
  }

  function ensureEffectCompressor(audio) {
    if (!state.effectCompressor) {
      state.effectCompressor = audio.createDynamicsCompressor();
      state.effectCompressor.threshold.value = -5;
      state.effectCompressor.knee.value = 8;
      state.effectCompressor.ratio.value = 12;
      state.effectCompressor.attack.value = 0.002;
      state.effectCompressor.release.value = 0.15;
      state.effectCompressor.connect(audio.destination);
    }
    return state.effectCompressor;
  }

  function effectVolumeScale() {
    const volume =
      state.activeSoundName === "button"
        ? state.buttonVolume
        : state.soundVolumes[state.activeSoundName] ?? 100;
    return volume / 100;
  }

  function playTone(
    frequency,
    duration,
    type = "sine",
    volume = 0.025,
    delay = 0,
    options = {},
  ) {
    if (state.muted) return;
    const audio = getAudioContext();
    if (!audio) return;
    if (audio.state === "suspended") audio.resume();
    const compressor = ensureEffectCompressor(audio);

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (options.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(20, options.endFrequency),
        start + duration,
      );
    }
    gain.gain.setValueAtTime(0.0001, start);
    const attack = options.attack ?? 0.008;
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.00001, volume * 1.25 * effectVolumeScale()),
      start + attack,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    let output = gain;
    if (audio.createStereoPanner && options.pan) {
      const panner = audio.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, options.pan));
      gain.connect(panner);
      output = panner;
    }
    oscillator.connect(gain);
    output.connect(compressor);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function playNoise(duration, volume, delay = 0, options = {}) {
    if (state.muted) return;
    const audio = getAudioContext();
    if (!audio) return;
    if (audio.state === "suspended") audio.resume();
    if (!state.noiseBuffer || state.noiseBuffer.sampleRate !== audio.sampleRate) {
      state.noiseBuffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
      const channel = state.noiseBuffer.getChannelData(0);
      for (let index = 0; index < channel.length; index += 1) {
        channel[index] = Math.random() * 2 - 1;
      }
    }

    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    const start = audio.currentTime + delay;
    const peak = Math.max(0.00001, volume * 1.25 * effectVolumeScale());
    source.buffer = state.noiseBuffer;
    filter.type = options.filterType || "bandpass";
    filter.frequency.setValueAtTime(options.frequency || 900, start);
    if (options.endFrequency) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(40, options.endFrequency),
        start + duration,
      );
    }
    filter.Q.value = options.q ?? 0.8;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + (options.attack ?? 0.005));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ensureEffectCompressor(audio));
    source.start(start, Math.random() * 0.6, duration);
    source.stop(start + duration + 0.03);
  }

  function playSound(name) {
    const sounds = {
      move: () => {
        playTone(430, 0.045, "sine", 0.0065, 0, {
          endFrequency: 325,
          attack: 0.003,
          pan: -0.14,
        });
        playNoise(0.032, 0.0022, 0, {
          filterType: "bandpass",
          frequency: 1100,
          endFrequency: 680,
          q: 1.2,
        });
      },
      button: () => {
        playTone(620, 0.15, "sine", 0.009, 0, {
          endFrequency: 410,
          attack: 0.012,
          pan: -0.08,
        });
        playTone(930, 0.1, "triangle", 0.004, 0.015, {
          endFrequency: 680,
          attack: 0.01,
          pan: 0.1,
        });
        playNoise(0.11, 0.0024, 0, {
          filterType: "bandpass",
          frequency: 1200,
          endFrequency: 520,
          q: 1.35,
        });
      },
      rotate: () => {
        playTone(315, 0.085, "sine", 0.009, 0, {
          endFrequency: 470,
          attack: 0.006,
          pan: -0.08,
        });
        playTone(690, 0.065, "triangle", 0.006, 0.018, {
          endFrequency: 540,
          pan: 0.14,
        });
        playNoise(0.075, 0.0028, 0, {
          filterType: "bandpass",
          frequency: 1450,
          endFrequency: 620,
          q: 1.1,
        });
      },
      hold: () => {
        playTone(523.25, 0.14, "sine", 0.012, 0, {
          endFrequency: 659.25,
          attack: 0.012,
        });
        playTone(783.99, 0.18, "sine", 0.009, 0.055, {
          endFrequency: 880,
          attack: 0.018,
        });
        playNoise(0.13, 0.0018, 0.02, {
          filterType: "bandpass",
          frequency: 1800,
          endFrequency: 1200,
          q: 1.4,
        });
      },
      hardDrop: () => {
        playTone(165, 0.25, "sine", 0.017, 0, {
          endFrequency: 48,
          attack: 0.015,
        });
        playNoise(0.23, 0.007, 0, {
          filterType: "lowpass",
          frequency: 620,
          endFrequency: 105,
          q: 0.7,
        });
        playTone(74, 0.32, "triangle", 0.008, 0.03, {
          endFrequency: 42,
          attack: 0.03,
        });
        duckMusic(0.6, 520);
      },
      fall: () => {
        playTone(265, 0.045, "sine", 0.004, 0, {
          endFrequency: 175,
          attack: 0.004,
          pan: Math.random() * 0.2 - 0.1,
        });
      },
      contact: () => {
        playTone(92, 0.17, "sine", 0.013, 0, {
          endFrequency: 46,
          attack: 0.012,
        });
        playTone(145, 0.11, "triangle", 0.0055, 0.012, {
          endFrequency: 78,
          attack: 0.012,
        });
        playNoise(0.09, 0.003, 0, {
          filterType: "lowpass",
          frequency: 310,
          q: 0.6,
        });
      },
      lock: () => {
        playTone(135, 0.13, "sine", 0.0075, 0, {
          endFrequency: 74,
          attack: 0.014,
        });
        playTone(460, 0.1, "sine", 0.003, 0.012, {
          endFrequency: 290,
          attack: 0.012,
        });
      },
      scatter: () => {
        [520, 410, 320, 240].forEach((frequency, index) => {
          playTone(frequency, 0.1 + index * 0.012, "sine", 0.008, index * 0.038, {
            endFrequency: frequency * 0.72,
            attack: 0.006,
            pan: index % 2 === 0 ? -0.28 : 0.28,
          });
        });
        playNoise(0.2, 0.003, 0.025, {
          filterType: "bandpass",
          frequency: 1600,
          endFrequency: 500,
          q: 1.5,
        });
        playTone(72, 0.16, "sine", 0.008, 0.05);
      },
      clear: () => {
        playTone(73.42, 0.62, "sine", 0.008, 0, {
          endFrequency: 55,
          attack: 0.06,
        });
        [392, 523.25, 659.25, 783.99].forEach((note, index) => {
          playTone(note, 0.58, index % 2 ? "triangle" : "sine", 0.0085, index * 0.055, {
            endFrequency: note * 1.045,
            attack: 0.05,
            pan: index % 2 === 0 ? -0.2 : 0.2,
          });
        });
        playNoise(0.45, 0.0032, 0.02, {
          filterType: "bandpass",
          frequency: 1300,
          endFrequency: 3600,
          q: 1.05,
        });
        duckMusic(0.62, 520);
      },
      tetris: () => {
        playTone(55, 1.05, "sine", 0.017, 0, {
          endFrequency: 34,
          attack: 0.1,
        });
        [329.63, 392, 523.25, 659.25, 783.99, 987.77].forEach((note, index) => {
          playTone(note, 0.84, index % 2 ? "triangle" : "sine", 0.009, index * 0.062, {
            endFrequency: note * 1.06,
            attack: 0.08,
            pan: (index - 2) * 0.14,
          });
        });
        playNoise(0.82, 0.004, 0.06, {
          filterType: "bandpass",
          frequency: 1100,
          endFrequency: 4400,
          q: 1.15,
        });
        duckMusic(0.55, 720);
      },
      gameover: () => {
        [220, 174.61, 130.81, 87.31].forEach((note, index) => {
          playTone(note, 0.72, "sine", 0.011, index * 0.16, {
            endFrequency: note * 0.82,
            attack: 0.04,
          });
        });
        playTone(55, 1.15, "triangle", 0.012, 0.04, {
          endFrequency: 36.71,
          attack: 0.12,
        });
        playNoise(0.45, 0.0025, 0.08, {
          filterType: "bandpass",
          frequency: 700,
          endFrequency: 220,
          q: 0.8,
        });
      },
    };
    const previousSound = state.activeSoundName;
    state.activeSoundName = name;
    sounds[name]?.();
    state.activeSoundName = previousSound;
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

  function openRules() {
    if (state.status === "playing") togglePause();
    rulesModal.hidden = false;
    document.body.classList.add("has-modal");
    closeRulesButton.focus();
  }

  function closeRules() {
    rulesModal.hidden = true;
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
      if (code === "Escape" && !audioDebugPanel.hidden) {
        event.preventDefault();
        audioDebugPanel.hidden = true;
        return;
      }
      if (code === "Escape" && (!leaderboardModal.hidden || !rulesModal.hidden)) {
        event.preventDefault();
        closeLeaderboard();
        closeRules();
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

    let lastTouchEnd = 0;
    document.addEventListener(
      "touchend",
      (event) => {
        const now = Date.now();
        const interactive = event.target.closest?.("button, input, a");
        if (!interactive && now - lastTouchEnd < 320) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      },
      { passive: false },
    );
    document.addEventListener("gesturestart", (event) => event.preventDefault(), {
      passive: false,
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
        playSound("button");
        navigator.vibrate?.(10);
        const actions = {
          left: () => move(-1),
          right: () => move(1),
          rotate: () => rotate(1),
          hold: holdPiece,
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
  rematchButton.addEventListener("click", startGame);
  playAgainButton.addEventListener("click", showStartScreen);
  restartButton.addEventListener("click", startGame);
  restartFromPause.addEventListener("click", startGame);
  homeFromPause.addEventListener("click", showStartScreen);
  pauseButton.addEventListener("click", () => {
    if (["playing", "paused"].includes(state.status)) {
      playSound("button");
      navigator.vibrate?.(10);
      togglePause();
    }
  });
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
  rulesButton.addEventListener("click", openRules);
  resultLeaderboardButton.addEventListener("click", () =>
    openLeaderboard(state.dropMode),
  );
  previewLeaderboardButton.addEventListener("click", () => openLeaderboard(state.dropMode));
  closeLeaderboardButton.addEventListener("click", closeLeaderboard);
  closeRulesButton.addEventListener("click", closeRules);
  leaderboardModal.addEventListener("click", (event) => {
    if (event.target === leaderboardModal) closeLeaderboard();
  });
  rulesModal.addEventListener("click", (event) => {
    if (event.target === rulesModal) closeRules();
  });
  rankingModeButtons.forEach((button) => {
    button.addEventListener("click", () => refreshLeaderboard(button.dataset.rankingMode));
  });

  musicVolumeSlider.value = String(state.musicVolume);
  musicVolumeValue.textContent = String(state.musicVolume);
  buttonVolumeSlider.value = String(state.buttonVolume);
  buttonVolumeValue.textContent = String(state.buttonVolume);
  musicPresetSelect.value = state.musicPreset;

  SOUND_CONTROL_DEFINITIONS.forEach(({ id, label }) => {
    const row = document.createElement("div");
    row.className = "sound-control-row";

    const name = document.createElement("span");
    name.textContent = label;
    const output = document.createElement("output");
    output.textContent = String(state.soundVolumes[id]);
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "1";
    slider.max = "20000";
    slider.step = "1";
    slider.value = String(state.soundVolumes[id]);
    const preview = document.createElement("button");
    preview.type = "button";
    preview.textContent = "试听";

    slider.addEventListener("input", () => {
      state.soundVolumes[id] = Math.min(
        20000,
        Math.max(1, Number(slider.value)),
      );
      output.textContent = String(state.soundVolumes[id]);
      localStorage.setItem(
        SOUND_VOLUMES_STORAGE_KEY,
        JSON.stringify(state.soundVolumes),
      );
    });
    preview.addEventListener("click", () => playSound(id));
    row.append(name, output, slider, preview);
    soundControlList.append(row);
  });

  audioDebugToggle.addEventListener("click", () => {
    if (!AUDIO_DEBUG_ENABLED) return;
    audioDebugPanel.hidden = !audioDebugPanel.hidden;
  });
  closeAudioDebug.addEventListener("click", () => {
    audioDebugPanel.hidden = true;
  });
  musicVolumeSlider.addEventListener("input", () => {
    state.musicVolume = Math.min(20000, Math.max(1, Number(musicVolumeSlider.value)));
    musicVolumeValue.textContent = String(state.musicVolume);
    localStorage.setItem(MUSIC_VOLUME_STORAGE_KEY, String(state.musicVolume));
    if (state.musicGain && state.audioContext) {
      state.musicGain.gain.setTargetAtTime(
        (4 * state.musicVolume) / 100,
        state.audioContext.currentTime,
        0.02,
      );
    }
  });
  buttonVolumeSlider.addEventListener("input", () => {
    state.buttonVolume = Math.min(20000, Math.max(1, Number(buttonVolumeSlider.value)));
    buttonVolumeValue.textContent = String(state.buttonVolume);
    localStorage.setItem(BUTTON_VOLUME_STORAGE_KEY, String(state.buttonVolume));
  });
  buttonVolumeSlider.addEventListener("change", () => playSound("button"));
  previewButtonSound.addEventListener("click", () => playSound("button"));
  previewMusicButton.addEventListener("click", () => {
    const audio = getAudioContext();
    if (!audio) return;
    if (audio.state === "suspended") audio.resume();
    ensureMusicGain(audio);
    playMusicStep(true);
  });
  musicPresetSelect.addEventListener("change", () => {
    state.musicPreset = MUSIC_PRESETS[musicPresetSelect.value]
      ? musicPresetSelect.value
      : "soft";
    localStorage.setItem(MUSIC_PRESET_STORAGE_KEY, state.musicPreset);
    if (state.musicPlaying) {
      stopMusic();
      state.musicStep = 0;
      startMusic();
    }
  });

  state.playerId = getOrCreatePlayerId();
  updateSoundButton();
  updateModePicker();
  updateStats();
  syncRenderCanvases();
  draw();
  drawHold();
  fillNextQueue();
  drawNext();
  setupInput();
  startSpaceBackground();
  refreshLeaderboard(state.dropMode);
  window.addEventListener("resize", scheduleCanvasSync);
  if ("ResizeObserver" in window) {
    const canvasObserver = new ResizeObserver(scheduleCanvasSync);
    [boardFrame, nextCanvas, holdCanvas, mobileHoldCanvas].forEach((element) => {
      canvasObserver.observe(element);
    });
  }
})();
