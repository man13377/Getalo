const canvas = document.getElementById("game-canvas");
const ctx = canvas?.getContext("2d");

if (!canvas || !ctx) {
  throw new Error("Game canvas is not available.");
}

const starsCountEl = document.getElementById("stars-count");
const bestCountEl = document.getElementById("best-count");
const overlayEl = document.getElementById("overlay");
const overlayTitleEl = document.getElementById("overlay-title");
const overlayTextEl = document.getElementById("overlay-text");
const restartButton = document.getElementById("restart-btn");
const soundToggleButton = document.getElementById("sound-toggle");

const KEY_BINDINGS = {
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  jump: ["Space", "ArrowUp", "KeyW"],
};

const WORLD = {
  width: 4300,
  finishX: 4030,
  deathY: 920,
};

const GRAVITY = 0.62;
const BEST_SCORE_KEY = "daughter-jump-best-score";
const keysDown = new Set();

const player = {
  x: 80,
  y: 220,
  w: 66,
  h: 152,
  renderW: 138,
  renderH: 236,
  vx: 0,
  vy: 0,
  speed: 5.2,
  jumpPower: 14.2,
  onGround: false,
  facing: 1,
};

const camera = {
  x: 0,
};

const spritePaths = {
  calm: "./assets/daughter-frame-3.png",
  strong: "./assets/daughter-frame-2.png",
  sad: "./assets/daughter-frame-1.png",
  monster1: "./assets/monster-frame-1.png",
  monster2: "./assets/monster-frame-2.png",
  monster3: "./assets/monster-frame-3.png",
  monster4: "./assets/monster-frame-4.png",
};

const spriteImages = {};

const animationSets = {
  idle: [
    { sprite: "calm", yOffset: 0, tilt: -0.01, duration: 420 },
    { sprite: "calm", yOffset: -2, tilt: 0.01, duration: 420 },
  ],
  run: [
    { sprite: "calm", yOffset: 0, tilt: -0.03, duration: 130 },
    { sprite: "strong", yOffset: -4, tilt: 0.045, duration: 130 },
  ],
  jump: [{ sprite: "strong", yOffset: -10, tilt: 0.05, duration: 220 }],
  celebrate: [
    { sprite: "calm", yOffset: -7, tilt: -0.035, duration: 180 },
    { sprite: "strong", yOffset: -11, tilt: 0.035, duration: 180 },
  ],
  sad: [{ sprite: "sad", yOffset: 2, tilt: 0.02, duration: 600 }],
};

const animation = {
  state: "idle",
  frameIndex: 0,
  frameElapsedMs: 0,
};

const audioState = {
  ctx: null,
  masterGain: null,
  muted: false,
  unlocked: false,
  runStepClockMs: 0,
};

const clouds = [
  { x: 120, y: 96, size: 44, speed: 0.12 },
  { x: 470, y: 74, size: 52, speed: 0.2 },
  { x: 880, y: 108, size: 39, speed: 0.15 },
  { x: 1400, y: 84, size: 58, speed: 0.1 },
  { x: 1940, y: 62, size: 48, speed: 0.17 },
  { x: 2430, y: 92, size: 50, speed: 0.12 },
  { x: 2890, y: 76, size: 46, speed: 0.2 },
  { x: 3400, y: 104, size: 42, speed: 0.14 },
  { x: 3890, y: 70, size: 54, speed: 0.11 },
];

const platforms = [
  { x: 0, y: 470, w: 760, h: 120, kind: "ground" },
  { x: 900, y: 470, w: 520, h: 120, kind: "ground" },
  { x: 1560, y: 470, w: 470, h: 120, kind: "ground" },
  { x: 2170, y: 470, w: 700, h: 120, kind: "ground" },
  { x: 3040, y: 470, w: 620, h: 120, kind: "ground" },
  { x: 3800, y: 470, w: 500, h: 120, kind: "ground" },
  { x: 290, y: 380, w: 150, h: 24, kind: "platform" },
  { x: 540, y: 340, w: 130, h: 24, kind: "platform" },
  { x: 790, y: 320, w: 120, h: 24, kind: "platform" },
  { x: 1160, y: 350, w: 130, h: 24, kind: "platform" },
  { x: 1450, y: 320, w: 120, h: 24, kind: "platform" },
  { x: 1740, y: 350, w: 130, h: 24, kind: "platform" },
  { x: 2000, y: 300, w: 150, h: 24, kind: "platform" },
  { x: 2420, y: 350, w: 130, h: 24, kind: "platform" },
  { x: 2670, y: 320, w: 120, h: 24, kind: "platform" },
  { x: 2960, y: 350, w: 130, h: 24, kind: "platform" },
  { x: 3240, y: 300, w: 150, h: 24, kind: "platform" },
  { x: 3490, y: 340, w: 140, h: 24, kind: "platform" },
  { x: 3710, y: 300, w: 120, h: 24, kind: "platform" },
];

const hazards = [
  { x: 1060, y: 446, w: 56, h: 24 },
  { x: 1884, y: 446, w: 56, h: 24 },
  { x: 2590, y: 446, w: 56, h: 24 },
  { x: 3330, y: 446, w: 56, h: 24 },
];

const monsterFrameKeys = ["monster1", "monster2", "monster3", "monster4"];

const monsters = [
  {
    spawnX: 1030,
    x: 1030,
    floorY: 470,
    y: 0,
    w: 98,
    h: 62,
    renderW: 138,
    renderH: 88,
    minX: 930,
    maxX: 1340,
    baseSpeed: 1.3,
    direction: 1,
    vx: 0,
    frameOffset: 0,
    frameIndex: 0,
    frameClockMs: 0,
    bobPhase: 0.3,
  },
  {
    spawnX: 1750,
    x: 1750,
    floorY: 470,
    y: 0,
    w: 98,
    h: 62,
    renderW: 138,
    renderH: 88,
    minX: 1600,
    maxX: 1980,
    baseSpeed: 1.45,
    direction: -1,
    vx: 0,
    frameOffset: 1,
    frameIndex: 0,
    frameClockMs: 0,
    bobPhase: 1.4,
  },
  {
    spawnX: 3210,
    x: 3210,
    floorY: 470,
    y: 0,
    w: 98,
    h: 62,
    renderW: 138,
    renderH: 88,
    minX: 3090,
    maxX: 3550,
    baseSpeed: 1.4,
    direction: 1,
    vx: 0,
    frameOffset: 2,
    frameIndex: 0,
    frameClockMs: 0,
    bobPhase: 2.1,
  },
  {
    spawnX: 3920,
    x: 3920,
    floorY: 470,
    y: 0,
    w: 98,
    h: 62,
    renderW: 138,
    renderH: 88,
    minX: 3840,
    maxX: 4190,
    baseSpeed: 1.6,
    direction: -1,
    vx: 0,
    frameOffset: 3,
    frameIndex: 0,
    frameClockMs: 0,
    bobPhase: 2.8,
  },
];

const stars = [
  { x: 220, y: 332, r: 12, phase: 0.3, collected: false },
  { x: 390, y: 334, r: 12, phase: 0.9, collected: false },
  { x: 600, y: 292, r: 12, phase: 2.2, collected: false },
  { x: 810, y: 272, r: 12, phase: 2.9, collected: false },
  { x: 980, y: 420, r: 12, phase: 0.6, collected: false },
  { x: 1180, y: 304, r: 12, phase: 1.7, collected: false },
  { x: 1470, y: 278, r: 12, phase: 2.8, collected: false },
  { x: 1640, y: 416, r: 12, phase: 1.1, collected: false },
  { x: 1760, y: 302, r: 12, phase: 2.1, collected: false },
  { x: 2060, y: 254, r: 12, phase: 0.1, collected: false },
  { x: 2240, y: 420, r: 12, phase: 1.2, collected: false },
  { x: 2460, y: 304, r: 12, phase: 2.0, collected: false },
  { x: 2710, y: 278, r: 12, phase: 0.5, collected: false },
  { x: 2980, y: 305, r: 12, phase: 2.4, collected: false },
  { x: 3280, y: 255, r: 12, phase: 0.8, collected: false },
  { x: 3510, y: 292, r: 12, phase: 1.9, collected: false },
  { x: 3720, y: 252, r: 12, phase: 2.6, collected: false },
  { x: 3920, y: 410, r: 12, phase: 1.4, collected: false },
];

let gameState = "playing";
let score = 0;
let jumpLocked = false;
let lastFrame = 0;
let bestScore = Number.parseInt(safeStorageGet(BEST_SCORE_KEY) || "0", 10);
if (!Number.isFinite(bestScore) || bestScore < 0) {
  bestScore = 0;
}
bestCountEl.textContent = String(bestScore);

restartButton.addEventListener("click", () => {
  unlockAudio();
  resetRound();
});

if (soundToggleButton) {
  soundToggleButton.addEventListener("click", () => {
    unlockAudio();
    setMuted(!audioState.muted);
  });
  renderSoundButton();
}

window.addEventListener("pointerdown", unlockAudio, { passive: true });

window.addEventListener("keydown", (event) => {
  unlockAudio();

  if (
    event.code === "Space" ||
    event.code === "ArrowLeft" ||
    event.code === "ArrowRight" ||
    event.code === "ArrowUp" ||
    event.code === "ArrowDown"
  ) {
    event.preventDefault();
  }
  keysDown.add(event.code);

  if ((gameState === "won" || gameState === "lost") && event.code === "Enter") {
    resetRound();
  }
});

window.addEventListener("keyup", (event) => {
  keysDown.delete(event.code);
});

preloadSprites();
resetRound();
requestAnimationFrame(gameLoop);

function preloadSprites() {
  for (const [key, src] of Object.entries(spritePaths)) {
    const image = new Image();
    image.src = src;
    spriteImages[key] = image;
  }
}

function gameLoop(timestamp) {
  const delta = Math.min(((timestamp - lastFrame) || 16.67) / 16.67, 2);
  const deltaMs = delta * 16.67;
  lastFrame = timestamp;

  update(delta, deltaMs, timestamp);
  draw(timestamp);

  requestAnimationFrame(gameLoop);
}

function update(delta, deltaMs, timestamp) {
  if (gameState !== "playing") {
    updateAnimation(deltaMs);
    return;
  }

  const moveLeft = isBindingPressed(KEY_BINDINGS.left);
  const moveRight = isBindingPressed(KEY_BINDINGS.right);
  const jumpPressed = isBindingPressed(KEY_BINDINGS.jump);

  const wasOnGround = player.onGround;
  const preStepVy = player.vy;

  player.vx = 0;
  if (moveLeft) {
    player.vx -= player.speed;
    player.facing = -1;
  }
  if (moveRight) {
    player.vx += player.speed;
    player.facing = 1;
  }

  if (jumpPressed && player.onGround && !jumpLocked) {
    player.vy = -player.jumpPower;
    player.onGround = false;
    jumpLocked = true;
    playJumpSound();
  }
  if (!jumpPressed) {
    jumpLocked = false;
  }

  const previousX = player.x;
  player.x += player.vx * delta;
  resolveHorizontalCollisions(previousX);

  const previousY = player.y;
  player.vy += GRAVITY * delta;
  player.y += player.vy * delta;
  player.onGround = false;
  resolveVerticalCollisions(previousY);

  if (!wasOnGround && player.onGround && preStepVy > 3.4) {
    playLandSound();
  }

  updateRunStepSound(deltaMs);

  if (player.x < 0) {
    player.x = 0;
  }
  if (player.x + player.w > WORLD.width) {
    player.x = WORLD.width - player.w;
  }

  collectStars(timestamp);
  checkHazards();
  if (gameState !== "playing") {
    return;
  }
  updateMonsters(delta, deltaMs);
  checkMonsterCollisions();
  if (gameState !== "playing") {
    return;
  }

  if (player.y > WORLD.deathY) {
    finishRound("lost");
  }
  if (player.x + player.w * 0.4 >= WORLD.finishX) {
    finishRound("won");
  }

  const targetX = clamp(player.x - canvas.width * 0.35, 0, WORLD.width - canvas.width);
  camera.x += (targetX - camera.x) * 0.12 * delta;
  camera.x = clamp(camera.x, 0, WORLD.width - canvas.width);

  updateAnimation(deltaMs);
}

function updateAnimation(deltaMs) {
  const nextState = resolveAnimationState();
  if (nextState !== animation.state) {
    animation.state = nextState;
    animation.frameIndex = 0;
    animation.frameElapsedMs = 0;
  }

  const sequence = animationSets[animation.state];
  if (!sequence || sequence.length <= 1) {
    return;
  }

  animation.frameElapsedMs += deltaMs;
  while (animation.frameElapsedMs >= sequence[animation.frameIndex].duration) {
    animation.frameElapsedMs -= sequence[animation.frameIndex].duration;
    animation.frameIndex = (animation.frameIndex + 1) % sequence.length;
  }
}

function resolveAnimationState() {
  if (gameState === "lost") {
    return "sad";
  }
  if (gameState === "won") {
    return "celebrate";
  }
  if (!player.onGround) {
    return "jump";
  }
  if (Math.abs(player.vx) > 0.2) {
    return "run";
  }
  return "idle";
}

function currentAnimationFrame() {
  const sequence = animationSets[animation.state] || animationSets.idle;
  const index = clamp(animation.frameIndex, 0, sequence.length - 1);
  return sequence[index];
}

function draw(timestamp) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawSky(timestamp);
  drawMountains(timestamp);
  drawPlatforms();
  drawHazards();
  drawMonsters(timestamp);
  drawStars(timestamp);
  drawFinish();
  drawPlayer(timestamp);
  drawProgressBar();
}

function drawSky(timestamp) {
  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, "#95deff");
  skyGradient.addColorStop(0.7, "#ffe6b4");
  skyGradient.addColorStop(1, "#ffd290");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  for (const cloud of clouds) {
    const x = wrap(
      cloud.x - camera.x * cloud.speed + Math.sin(timestamp * 0.00015 + cloud.x) * 22,
      -220,
      canvas.width + 220
    );
    drawCloud(x, cloud.y, cloud.size);
  }
  ctx.restore();
}

function drawCloud(x, worldY, size) {
  if (x < -200 || x > canvas.width + 200) {
    return;
  }
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
  ctx.beginPath();
  ctx.arc(x, worldY, size * 0.48, Math.PI, Math.PI * 2);
  ctx.arc(x + size * 0.45, worldY - size * 0.2, size * 0.4, Math.PI, Math.PI * 2);
  ctx.arc(x + size * 0.9, worldY, size * 0.52, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMountains(timestamp) {
  const baseY = 470;
  const layers = [
    { color: "#8ac8ff", height: 132, speed: 0.14, wobble: 0.0011 },
    { color: "#69b7ff", height: 104, speed: 0.2, wobble: 0.0016 },
    { color: "#58a9f2", height: 82, speed: 0.28, wobble: 0.0024 },
  ];

  for (const layer of layers) {
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let x = -30; x <= canvas.width + 30; x += 26) {
      const worldX = x + camera.x * layer.speed;
      const wave =
        Math.sin(worldX * layer.wobble + timestamp * 0.0005) * layer.height * 0.2 +
        Math.sin(worldX * layer.wobble * 0.48) * layer.height * 0.14;
      const y = baseY - layer.height + wave;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fillStyle = layer.color;
    ctx.fill();
  }
}

function drawPlatforms() {
  for (const platform of platforms) {
    const x = platform.x - camera.x;
    if (x + platform.w < -2 || x > canvas.width + 2) {
      continue;
    }

    if (platform.kind === "ground") {
      ctx.fillStyle = "#6cbf59";
      ctx.fillRect(x, platform.y, platform.w, platform.h);

      ctx.fillStyle = "#8ae46f";
      ctx.fillRect(x, platform.y, platform.w, 14);

      ctx.fillStyle = "rgba(46, 93, 31, 0.28)";
      ctx.fillRect(x, platform.y + 14, platform.w, 9);
    } else {
      ctx.fillStyle = "#f8c36a";
      roundedRectPath(x, platform.y, platform.w, platform.h, 6);
      ctx.fill();

      ctx.fillStyle = "#f6ad54";
      ctx.fillRect(x + 6, platform.y + 6, platform.w - 12, 6);
    }
  }
}

function drawHazards() {
  for (const hazard of hazards) {
    const x = hazard.x - camera.x;
    if (x + hazard.w < 0 || x > canvas.width) {
      continue;
    }
    const spikeCount = 4;
    const spikeWidth = hazard.w / spikeCount;

    ctx.fillStyle = "#f34f59";
    for (let i = 0; i < spikeCount; i += 1) {
      const sx = x + i * spikeWidth;
      ctx.beginPath();
      ctx.moveTo(sx, hazard.y + hazard.h);
      ctx.lineTo(sx + spikeWidth * 0.5, hazard.y);
      ctx.lineTo(sx + spikeWidth, hazard.y + hazard.h);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawMonsters(timestamp) {
  for (const monster of monsters) {
    const drawX = monster.x - camera.x + (monster.w - monster.renderW) * 0.5;
    if (drawX + monster.renderW < -8 || drawX > canvas.width + 8) {
      continue;
    }
    const bob = Math.sin(timestamp * 0.008 + monster.bobPhase) * 2.5;
    const drawY = monster.y + (monster.h - monster.renderH) + bob;

    const frameKey = monsterFrameKeys[monster.frameIndex % monsterFrameKeys.length];
    const frameImage = spriteImages[frameKey];

    const shadowX = monster.x - camera.x + monster.w * 0.5;
    const shadowY = monster.y + monster.h + 4;
    ctx.save();
    ctx.fillStyle = "rgba(26, 19, 12, 0.27)";
    ctx.beginPath();
    ctx.ellipse(shadowX, shadowY, monster.w * 0.45, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (frameImage?.complete && frameImage.naturalWidth > 0) {
      const centerX = drawX + monster.renderW * 0.5;
      const centerY = drawY + monster.renderH * 0.5;

      ctx.save();
      ctx.translate(centerX, centerY);
      if (monster.vx < 0) {
        ctx.scale(-1, 1);
      }
      const tilt = Math.sin(timestamp * 0.012 + monster.bobPhase) * 0.03;
      ctx.rotate(tilt);

      roundedRectPath(
        -monster.renderW * 0.5,
        -monster.renderH * 0.5,
        monster.renderW,
        monster.renderH,
        18
      );
      ctx.clip();

      ctx.drawImage(
        frameImage,
        -monster.renderW * 0.5,
        -monster.renderH * 0.5,
        monster.renderW,
        monster.renderH
      );
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = "rgba(255, 184, 120, 0.74)";
      ctx.lineWidth = 2.5;
      roundedRectPath(drawX + 1.25, drawY + 1.25, monster.renderW - 2.5, monster.renderH - 2.5, 18);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = "#f7b57b";
      roundedRectPath(drawX, drawY, monster.renderW, monster.renderH, 18);
      ctx.fill();
    }
  }
}

function drawStars(timestamp) {
  for (const star of stars) {
    if (star.collected) {
      continue;
    }

    const floatY = Math.sin(timestamp * 0.004 + star.phase) * 6;
    const x = star.x - camera.x;
    const y = star.y + floatY;

    if (x + star.r < 0 || x - star.r > canvas.width) {
      continue;
    }
    drawStar(x, y, star.r);
  }
}

function drawStar(x, y, radius) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? radius : radius * 0.48;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fillStyle = "#ffe468";
  ctx.fill();
  ctx.strokeStyle = "#f39f1f";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawFinish() {
  const x = WORLD.finishX - camera.x;
  const poleY = 188;
  const poleH = 282;

  if (x < -120 || x > canvas.width + 120) {
    return;
  }

  ctx.fillStyle = "#f6f7fc";
  ctx.fillRect(x, poleY, 12, poleH);

  ctx.fillStyle = "#fe7186";
  roundedRectPath(x + 11, poleY + 26, 82, 56, 8);
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.font = "700 16px Rubik";
  ctx.fillText("HOME", x + 27, poleY + 58);
}

function drawPlayer(timestamp) {
  const frame = currentAnimationFrame();
  const frameImage = spriteImages[frame.sprite];

  const drawX = player.x - camera.x + (player.w - player.renderW) * 0.5;
  const victoryBounce = gameState === "won" ? Math.sin(timestamp * 0.014) * 4 : 0;
  const drawY = player.y + (player.h - player.renderH) + frame.yOffset + victoryBounce;

  const shadowX = player.x - camera.x + player.w * 0.5;
  const shadowY = player.y + player.h + 7;
  ctx.save();
  ctx.fillStyle = "rgba(26, 44, 76, 0.24)";
  ctx.beginPath();
  ctx.ellipse(shadowX, shadowY, player.w * 0.42, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (frameImage?.complete && frameImage.naturalWidth > 0) {
    const centerX = drawX + player.renderW * 0.5;
    const centerY = drawY + player.renderH * 0.5;

    ctx.save();
    ctx.translate(centerX, centerY);
    if (player.facing < 0) {
      ctx.scale(-1, 1);
    }
    const runWobble = Math.abs(player.vx) > 0.2 ? Math.sin(timestamp * 0.018) * 0.01 : 0;
    ctx.rotate(frame.tilt + runWobble);

    roundedRectPath(-player.renderW * 0.5, -player.renderH * 0.5, player.renderW, player.renderH, 20);
    ctx.clip();

    ctx.drawImage(
      frameImage,
      -player.renderW * 0.5,
      -player.renderH * 0.5,
      player.renderW,
      player.renderH
    );
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.86)";
    ctx.lineWidth = 3;
    roundedRectPath(drawX + 1.5, drawY + 1.5, player.renderW - 3, player.renderH - 3, 20);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.fillStyle = "#ff8cb0";
    roundedRectPath(drawX, drawY, player.renderW, player.renderH, 20);
    ctx.fill();
  }
}

function drawProgressBar() {
  const barX = 24;
  const barY = 24;
  const barW = 238;
  const barH = 16;
  const progress = clamp(player.x / WORLD.finishX, 0, 1);

  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  roundedRectPath(barX, barY, barW, barH, 99);
  ctx.fill();

  ctx.fillStyle = "#2dc9a5";
  roundedRectPath(barX, barY, barW * progress, barH, 99);
  ctx.fill();

  ctx.fillStyle = "#1e3253";
  ctx.font = "700 11px Rubik";
  ctx.fillText("finish", barX + barW + 8, barY + 12);
}

function collectStars(timestamp) {
  const centerX = player.x + player.w * 0.5;
  const centerY = player.y + player.h * 0.5;

  for (const star of stars) {
    if (star.collected) {
      continue;
    }
    const floatY = Math.sin(timestamp * 0.004 + star.phase) * 6;
    const dx = centerX - star.x;
    const dy = centerY - (star.y + floatY);
    const touchDistance = star.r + player.w * 0.24;

    if (dx * dx + dy * dy <= touchDistance * touchDistance) {
      star.collected = true;
      score += 1;
      starsCountEl.textContent = String(score);
      playStarSound();

      if (score > bestScore) {
        bestScore = score;
        bestCountEl.textContent = String(bestScore);
        safeStorageSet(BEST_SCORE_KEY, String(bestScore));
      }
    }
  }
}

function checkHazards() {
  for (const hazard of hazards) {
    if (isIntersecting(player, hazard)) {
      finishRound("lost");
      return;
    }
  }
}

function updateMonsters(delta, deltaMs) {
  for (const monster of monsters) {
    monster.x += monster.vx * delta;

    if (monster.x < monster.minX) {
      monster.x = monster.minX;
      monster.vx = Math.abs(monster.baseSpeed);
    }
    if (monster.x + monster.w > monster.maxX) {
      monster.x = monster.maxX - monster.w;
      monster.vx = -Math.abs(monster.baseSpeed);
    }

    monster.frameClockMs += deltaMs * (1 + Math.abs(monster.vx) * 0.08);
    if (monster.frameClockMs >= 150) {
      monster.frameClockMs -= 150;
      monster.frameIndex = (monster.frameIndex + 1) % monsterFrameKeys.length;
    }
  }
}

function checkMonsterCollisions() {
  for (const monster of monsters) {
    const hitbox = {
      x: monster.x + 10,
      y: monster.y + 8,
      w: monster.w - 20,
      h: monster.h - 10,
    };
    if (isIntersecting(player, hitbox)) {
      playMonsterAttackSound();
      finishRound("lost");
      return;
    }
  }
}

function resolveHorizontalCollisions(previousX) {
  for (const platform of platforms) {
    if (!isIntersecting(player, platform)) {
      continue;
    }

    if (previousX + player.w <= platform.x) {
      player.x = platform.x - player.w;
    } else if (previousX >= platform.x + platform.w) {
      player.x = platform.x + platform.w;
    } else if (player.vx > 0) {
      player.x = platform.x - player.w;
    } else if (player.vx < 0) {
      player.x = platform.x + platform.w;
    }
    player.vx = 0;
  }
}

function resolveVerticalCollisions(previousY) {
  for (const platform of platforms) {
    if (!isIntersecting(player, platform)) {
      continue;
    }

    if (previousY + player.h <= platform.y) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.onGround = true;
    } else if (previousY >= platform.y + platform.h) {
      player.y = platform.y + platform.h;
      player.vy = 0;
    } else if (player.vy > 0) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.onGround = true;
    } else {
      player.y = platform.y + platform.h;
      player.vy = 0;
    }
  }
}

function finishRound(result) {
  if (gameState !== "playing") {
    return;
  }
  gameState = result;
  updateAnimation(0);

  if (result === "won") {
    overlayTitleEl.textContent = "Level Complete";
    overlayTextEl.textContent = `She is awesome. You collected ${score} star${score === 1 ? "" : "s"}.`;
    playWinEmotion();
  } else {
    overlayTitleEl.textContent = "Try again";
    overlayTextEl.textContent = `You collected ${score} star${score === 1 ? "" : "s"}. Press Play Again.`;
    playLoseEmotion();
  }
  overlayEl.classList.remove("hidden");
}

function resetRound() {
  gameState = "playing";
  score = 0;
  starsCountEl.textContent = "0";
  bestCountEl.textContent = String(bestScore);

  player.x = 80;
  player.y = 220;
  player.vx = 0;
  player.vy = 0;
  player.facing = 1;
  player.onGround = false;
  jumpLocked = false;
  camera.x = 0;
  audioState.runStepClockMs = 0;
  resetMonsters();

  animation.state = "idle";
  animation.frameIndex = 0;
  animation.frameElapsedMs = 0;

  for (const star of stars) {
    star.collected = false;
  }
  overlayEl.classList.add("hidden");
}

function resetMonsters() {
  for (const monster of monsters) {
    monster.x = monster.spawnX;
    monster.y = monster.floorY - monster.h;
    monster.vx = monster.baseSpeed * monster.direction;
    monster.frameIndex = monster.frameOffset % monsterFrameKeys.length;
    monster.frameClockMs = 0;
  }
}

function updateRunStepSound(deltaMs) {
  if (player.onGround && Math.abs(player.vx) > 0.55) {
    audioState.runStepClockMs += deltaMs;
    if (audioState.runStepClockMs >= 170) {
      audioState.runStepClockMs -= 170;
      playStepSound();
    }
  } else {
    audioState.runStepClockMs = 0;
  }
}

function ensureAudioContext() {
  if (audioState.ctx) {
    return;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  const ctxAudio = new AudioCtx();
  const master = ctxAudio.createGain();
  master.gain.value = 0.22;
  master.connect(ctxAudio.destination);

  audioState.ctx = ctxAudio;
  audioState.masterGain = master;
}

function unlockAudio() {
  if (audioState.muted) {
    return;
  }
  ensureAudioContext();
  if (!audioState.ctx) {
    return;
  }
  if (audioState.ctx.state === "suspended") {
    audioState.ctx.resume().catch(() => {});
  }
  audioState.unlocked = true;
}

function setMuted(nextMuted) {
  audioState.muted = nextMuted;
  renderSoundButton();

  if (!audioState.masterGain || !audioState.ctx) {
    return;
  }
  const now = audioState.ctx.currentTime;
  const target = nextMuted ? 0.0001 : 0.22;
  audioState.masterGain.gain.cancelScheduledValues(now);
  audioState.masterGain.gain.setTargetAtTime(target, now, 0.03);
}

function renderSoundButton() {
  if (!soundToggleButton) {
    return;
  }
  soundToggleButton.textContent = `Sound: ${audioState.muted ? "Off" : "On"}`;
  soundToggleButton.setAttribute("aria-pressed", audioState.muted ? "true" : "false");
}

function playTone({
  freq,
  endFreq = freq,
  duration = 0.12,
  volume = 0.12,
  type = "triangle",
  delay = 0,
}) {
  if (audioState.muted) {
    return;
  }
  ensureAudioContext();
  const audioCtx = audioState.ctx;
  const master = audioState.masterGain;
  if (!audioCtx || !master || audioCtx.state !== "running") {
    return;
  }

  const f1 = Math.max(40, Number(freq) || 440);
  const f2 = Math.max(40, Number(endFreq) || f1);
  const dur = Math.max(0.03, duration);
  const vol = Math.max(0.0001, volume);

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = type;
  const t0 = audioCtx.currentTime + delay;
  osc.frequency.setValueAtTime(f1, t0);
  osc.frequency.exponentialRampToValueAtTime(f2, t0 + dur);

  gainNode.gain.setValueAtTime(0.0001, t0);
  gainNode.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur * 0.35));
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(gainNode);
  gainNode.connect(master);

  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function playJumpSound() {
  playTone({ freq: 290, endFreq: 560, duration: 0.13, type: "triangle", volume: 0.14 });
}

function playLandSound() {
  playTone({ freq: 170, endFreq: 120, duration: 0.09, type: "sine", volume: 0.09 });
}

function playStepSound() {
  const base = 130 + Math.random() * 28;
  playTone({ freq: base, endFreq: base * 0.86, duration: 0.055, type: "triangle", volume: 0.06 });
}

function playStarSound() {
  playTone({ freq: 640, endFreq: 940, duration: 0.08, type: "square", volume: 0.13 });
  playTone({ freq: 880, endFreq: 1200, duration: 0.09, type: "square", delay: 0.07, volume: 0.11 });
}

function playWinEmotion() {
  const notes = [523, 659, 784, 988];
  notes.forEach((note, i) => {
    playTone({
      freq: note,
      endFreq: note * 1.02,
      duration: 0.17,
      delay: i * 0.1,
      type: "triangle",
      volume: 0.12,
    });
  });
}

function playLoseEmotion() {
  const notes = [392, 330, 262];
  notes.forEach((note, i) => {
    playTone({
      freq: note,
      endFreq: note * 0.72,
      duration: 0.2,
      delay: i * 0.11,
      type: "sawtooth",
      volume: 0.11,
    });
  });
}

function playMonsterAttackSound() {
  playTone({ freq: 210, endFreq: 105, duration: 0.16, type: "sawtooth", volume: 0.14 });
  playTone({ freq: 128, endFreq: 72, duration: 0.2, type: "triangle", delay: 0.08, volume: 0.12 });
}

function isBindingPressed(codes) {
  return codes.some((code) => keysDown.has(code));
}

function isIntersecting(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wrap(value, min, max) {
  const range = max - min;
  let next = (value - min) % range;
  if (next < 0) {
    next += range;
  }
  return next + min;
}

function roundedRectPath(x, y, w, h, r) {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function safeStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore local file restrictions.
  }
}
