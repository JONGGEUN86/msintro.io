(function () {
  const canvas = document.getElementById("gameCanvas");
  const overlay = document.getElementById("overlay");
  const playPauseBtn = document.getElementById("playPauseBtn");
  const resetBtn = document.getElementById("resetBtn");
  const modeBtn = document.getElementById("modeBtn");
  const scoreText = document.getElementById("scoreText");

  /** @type {CanvasRenderingContext2D} */
  const ctx = canvas.getContext("2d");

  // Game config
  const MAX_SCORE = 7;
  const BASE_BALL_SPEED = 340; // pixels per second
  const BALL_SPEED_UP_FACTOR = 1.05; // on every paddle hit
  const PADDLE_SPEED = 460; // px/s keyboard
  const AI_MAX_SPEED = 380; // px/s following ball
  const PADDLE_WIDTH = 12;
  const PADDLE_HEIGHT = 82;
  const BALL_SIZE = 10;
  const NET_DASH = 10;

  // Colors
  const COLOR_PADDLE = "#e6f1ff"; // var(--white)
  const COLOR_BALL = "#64ffda"; // var(--green)
  const COLOR_NET = "#a8b2d177"; // var(--light-slate, with alpha)

  // State
  let singlePlayer = true; // true: player(right) vs AI(left)
  let isPaused = true;
  let lastTs = 0;

  const state = {
    width: 0,
    height: 0,
    dpr: Math.max(1, Math.min(window.devicePixelRatio || 1, 2)),
    scores: { left: 0, right: 0 },
    ball: { x: 0, y: 0, vx: 0, vy: 0, speed: BASE_BALL_SPEED },
    left: { x: 0, y: 0, w: PADDLE_WIDTH, h: PADDLE_HEIGHT, vy: 0 },
    right: { x: 0, y: 0, w: PADDLE_WIDTH, h: PADDLE_HEIGHT, vy: 0 },
  };

  const keys = new Set();

  function resizeCanvas() {
    // Fit canvas to CSS size while honoring DPR for crisp rendering
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    state.dpr = dpr;
    state.width = Math.max(480, Math.floor(rect.width));
    state.height = Math.max(300, Math.floor(rect.height));

    canvas.width = Math.floor(state.width * dpr);
    canvas.height = Math.floor(state.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Keep paddles within bounds on resize
    clampPaddles();
  }

  function resetPositions(servingToRight = Math.random() < 0.5) {
    state.left.x = 24;
    state.left.y = (state.height - state.left.h) / 2;
    state.right.x = state.width - 24 - state.right.w;
    state.right.y = (state.height - state.right.h) / 2;

    state.ball.x = state.width / 2;
    state.ball.y = state.height / 2;
    state.ball.speed = BASE_BALL_SPEED;

    const angle = (Math.random() * 0.6 - 0.3) * Math.PI; // ~[-54deg, +54deg]
    const dirX = servingToRight ? 1 : -1;
    state.ball.vx = Math.cos(angle) * state.ball.speed * dirX;
    state.ball.vy = Math.sin(angle) * state.ball.speed;
  }

  function clampPaddles() {
    state.left.y = Math.max(0, Math.min(state.height - state.left.h, state.left.y));
    state.right.y = Math.max(0, Math.min(state.height - state.right.h, state.right.y));
  }

  function update(dt) {
    // Input - right paddle
    const upPressed = keys.has("ArrowUp");
    const downPressed = keys.has("ArrowDown");

    if (upPressed && !downPressed) {
      state.right.vy = -PADDLE_SPEED;
    } else if (downPressed && !upPressed) {
      state.right.vy = PADDLE_SPEED;
    } else {
      state.right.vy = 0;
    }

    // Input - left paddle (only in 2P mode)
    if (!singlePlayer) {
      const wPressed = keys.has("w") || keys.has("W");
      const sPressed = keys.has("s") || keys.has("S");
      if (wPressed && !sPressed) state.left.vy = -PADDLE_SPEED;
      else if (sPressed && !wPressed) state.left.vy = PADDLE_SPEED;
      else state.left.vy = 0;
    }

    // AI - left paddle follows ball in 1P mode
    if (singlePlayer) {
      const targetY = state.ball.y - state.left.h / 2;
      const dy = targetY - state.left.y;
      const maxStep = AI_MAX_SPEED * dt;
      if (Math.abs(dy) <= maxStep) {
        state.left.y = targetY;
      } else {
        state.left.y += Math.sign(dy) * maxStep;
      }
    } else {
      state.left.y += state.left.vy * dt;
    }

    // Move right paddle
    state.right.y += state.right.vy * dt;

    // Clamp paddles
    clampPaddles();

    // Move ball
    state.ball.x += state.ball.vx * dt;
    state.ball.y += state.ball.vy * dt;

    // Wall collisions
    if (state.ball.y <= 0) {
      state.ball.y = 0;
      state.ball.vy *= -1;
    } else if (state.ball.y >= state.height - BALL_SIZE) {
      state.ball.y = state.height - BALL_SIZE;
      state.ball.vy *= -1;
    }

    // Paddle collisions
    // Left paddle
    if (
      state.ball.x <= state.left.x + state.left.w &&
      state.ball.x + BALL_SIZE >= state.left.x &&
      state.ball.y + BALL_SIZE >= state.left.y &&
      state.ball.y <= state.left.y + state.left.h &&
      state.ball.vx < 0
    ) {
      state.ball.x = state.left.x + state.left.w; // prevent sticking
      reflectFromPaddle(state.left, 1);
    }
    // Right paddle
    if (
      state.ball.x + BALL_SIZE >= state.right.x &&
      state.ball.x <= state.right.x + state.right.w &&
      state.ball.y + BALL_SIZE >= state.right.y &&
      state.ball.y <= state.right.y + state.right.h &&
      state.ball.vx > 0
    ) {
      state.ball.x = state.right.x - BALL_SIZE;
      reflectFromPaddle(state.right, -1);
    }

    // Scoring
    if (state.ball.x + BALL_SIZE < 0) {
      // right scores
      state.scores.right += 1;
      onScore();
      resetPositions(true);
    } else if (state.ball.x > state.width) {
      // left scores
      state.scores.left += 1;
      onScore();
      resetPositions(false);
    }
  }

  function reflectFromPaddle(paddle, dirX) {
    // Calculate hit position relative to paddle center to adjust angle
    const paddleCenter = paddle.y + paddle.h / 2;
    const hitOffset = (state.ball.y + BALL_SIZE / 2) - paddleCenter; // px
    const normalized = Math.max(-1, Math.min(1, hitOffset / (paddle.h / 2)));
    const maxBounceAngle = (60 * Math.PI) / 180; // 60 degrees
    const bounceAngle = normalized * maxBounceAngle;

    state.ball.speed *= BALL_SPEED_UP_FACTOR;
    state.ball.vx = Math.cos(bounceAngle) * state.ball.speed * dirX;
    state.ball.vy = Math.sin(bounceAngle) * state.ball.speed;
  }

  function draw() {
    // Clear
    ctx.clearRect(0, 0, state.width, state.height);

    // Net
    ctx.save();
    ctx.strokeStyle = COLOR_NET;
    ctx.lineWidth = 2;
    ctx.setLineDash([NET_DASH, NET_DASH]);
    ctx.beginPath();
    ctx.moveTo(state.width / 2, 0);
    ctx.lineTo(state.width / 2, state.height);
    ctx.stroke();
    ctx.restore();

    // Paddles
    ctx.fillStyle = COLOR_PADDLE;
    ctx.fillRect(state.left.x, state.left.y, state.left.w, state.left.h);
    ctx.fillRect(state.right.x, state.right.y, state.right.w, state.right.h);

    // Ball
    ctx.fillStyle = COLOR_BALL;
    ctx.fillRect(state.ball.x, state.ball.y, BALL_SIZE, BALL_SIZE);
  }

  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.033, (ts - lastTs) / 1000); // clamp dt to 33ms
    lastTs = ts;

    if (!isPaused && !isGameOver()) {
      update(dt);
    }

    draw();
    requestAnimationFrame(loop);
  }

  function isGameOver() {
    return state.scores.left >= MAX_SCORE || state.scores.right >= MAX_SCORE;
  }

  function updateScoreUI() {
    scoreText.textContent = `${state.scores.left} : ${state.scores.right}`;
  }

  function onScore() {
    updateScoreUI();
    if (isGameOver()) {
      isPaused = true;
      overlay.textContent = state.scores.left > state.scores.right ? "게임 종료: 왼쪽 승" : "게임 종료: 오른쪽 승";
      overlay.classList.add("show");
      playPauseBtn.textContent = "재시작";
      return;
    }
  }

  function setPaused(next) {
    isPaused = next;
    overlay.textContent = "일시정지";
    overlay.classList.toggle("show", isPaused);
    playPauseBtn.textContent = isPaused ? "시작" : "일시정지";
  }

  function resetGame() {
    state.scores.left = 0;
    state.scores.right = 0;
    updateScoreUI();
    resetPositions();
    setPaused(true);
  }

  function toggleMode() {
    singlePlayer = !singlePlayer;
    modeBtn.textContent = `모드: ${singlePlayer ? "1인" : "2인"}`;
    modeBtn.setAttribute("aria-pressed", String(singlePlayer));
    resetGame();
  }

  // Events
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      setPaused(!isPaused);
      return;
    }
    if (e.key === "r" || e.key === "R") {
      resetGame();
      return;
    }
    if (e.key === "m" || e.key === "M") {
      toggleMode();
      return;
    }
    keys.add(e.key);
  });
  document.addEventListener("keyup", (e) => {
    keys.delete(e.key);
  });

  playPauseBtn.addEventListener("click", () => setPaused(!isPaused));
  resetBtn.addEventListener("click", resetGame);
  modeBtn.addEventListener("click", toggleMode);

  // Touch drag on right half to control right paddle (mobile)
  canvas.addEventListener("pointerdown", onPointer);
  canvas.addEventListener("pointermove", onPointer);
  function onPointer(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // If touch on left half and in 2P, control left paddle; otherwise right
    if (!singlePlayer && x < rect.width / 2) {
      state.left.y = y - state.left.h / 2;
    } else {
      state.right.y = y - state.right.h / 2;
    }
    clampPaddles();
  }

  // Init
  resizeCanvas();
  updateScoreUI();
  resetPositions();
  setPaused(true);
  requestAnimationFrame(loop);
})();
