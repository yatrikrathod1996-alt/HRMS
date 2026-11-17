/* Dashboard → "Break time · Acme Labs Dino": a small jump game in a short strip at the bottom of the dashboard.
   Space, ↑ or a click/tap jumps (hold for a higher jump). Rocks and bugs come faster the longer you last;
   floating Acme Labs cubes (the logo mark) are worth +25. A Acme Labs sign drifts past in the background.
   The best score is kept in this browser (acmelabs_hrms_game_best). The card is made once and moved back into
   the dashboard after every re-render, so a game in progress survives saves elsewhere in the app. */
const GAME_BEST_KEY = 'acmelabs_hrms_game_best';
const DashGame = (() => {
  const H = 150, GROUND = H - 26;
  const DINO = [
    '.........#######',
    '........##.#####',
    '........########',
    '........########',
    '........#####...',
    '........#######.',
    '#......#####....',
    '#.....######....',
    '##...########...',
    '###.#########...',
    '############....',
    '.##########.....',
    '..#########.....',
    '...#######......',
  ];
  const LEGS = [
    ['....##..##......', '....#....#......', '....##...##.....'],
    ['....##..##......', '.....#..#.......', '.....##.##......'],
    ['....##..##......', '....#.....#.....', '....##....##....'],
  ];
  // the Acme Labs mark: four rounded squares (blue / navy) with a soft overlap in the middle, as in the logo
  const ML_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="1" y="1" width="10" height="10" rx="2.6" fill="#4074dc"/><rect x="13" y="1" width="10" height="10" rx="2.6" fill="#313180"/><rect x="1" y="13" width="10" height="10" rx="2.6" fill="#313180"/><rect x="13" y="13" width="10" height="10" rx="2.6" fill="#4074dc"/><rect x="7" y="7" width="10" height="10" rx="2.6" fill="#fff" opacity=".28"/></svg>';
  const PX = 3, DW = 16 * PX, DH = 17 * PX;
  let best = 0;
  try { best = +localStorage.getItem(GAME_BEST_KEY) || 0; } catch (e) {}
  const g = { cubes: [], got: 0, pops: [], sign: 0, msg: '', msgT: 0, state: 'idle', y: 0, vy: 0, hold: false, rocks: [], speed: 300, score: 0, t: 0, nextGap: 0, stars: [], flash: 0, raf: 0, last: 0 };
  let card = null, cv = null, cx = null, W = 600, dpr = 1;

  const pad = (n) => String(Math.floor(n)).padStart(5, '0');
  const space = () => document.documentElement.classList.contains('space');
  const pal = () =>
    space()
      ? { ink: '#dfe6ff', dim: 'rgba(170,185,255,.35)', rock: '#8d96c4', crater: '#5a6192', helmet: 'rgba(143,176,255,.55)', star: '223,230,255', text: '#c9d4ff', blue: '#5b8cff', navy: '#6b6be0', bug: '#ff6f91', word: 'rgba(223,230,255,.13)', lab: 'rgba(91,140,255,.22)' }
      : { ink: '#3b3f4a', dim: 'rgba(59,63,74,.25)', rock: '#7a7f8c', crater: '#555a66', helmet: 'rgba(64,117,221,.5)', star: '120,130,160', text: '#3b3f4a', blue: '#4074dc', navy: '#313180', bug: '#e0457f', word: 'rgba(17,17,17,.07)', lab: 'rgba(64,116,220,.14)' };

  function build() {
    card = document.createElement('div');
    card.className = 'd2-card s12 dg-card';
    card.id = 'dashGame';
    card.innerHTML = `<div class="d2-h"><h3><span class="ic dg-ml">${ML_SVG}</span>Break time · Acme Labs Dino</h3>
      <span class="dg-tools"><span class="dg-cubes" id="dgCubes" title="Acme Labs cubes collected">${ML_SVG}<b>0</b></span><span class="dg-score" id="dgScore">${pad(0)}</span><span class="d2-tag" id="dgBest">Best ${pad(best)}</span></span></div>
      <div class="dg-wrap"><canvas id="dgCanvas" tabindex="0" role="img" aria-label="Acme Labs Dino jump game. Press Space or click to jump."></canvas></div>
      <p class="dg-hint">Space, ↑ or click to jump · hold for a higher jump · grab the Acme Labs cubes for +25 · dodge rocks and bugs</p>`;
    cv = card.querySelector('canvas');
    cx = cv.getContext('2d');
    cv.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      cv.focus({ preventScroll: true });
      press();
    });
    cv.addEventListener('pointerup', release);
    cv.addEventListener('pointerleave', release);
    if (window.ResizeObserver) new ResizeObserver(size).observe(card);
    for (let i = 0; i < 40; i++) g.stars.push({ x: Math.random(), y: Math.random() * (GROUND - 20), s: Math.random() < 0.2 ? 1.6 : 1, k: 0.2 + Math.random() * 0.6 });
  }
  function size() {
    const w = Math.round(card.querySelector('.dg-wrap').clientWidth);
    if (!w || (w === W && cv.width)) return;
    W = w;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cv.style.height = H + 'px';
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function reset() {
    Object.assign(g, { cubes: [], got: 0, pops: [], sign: W * 0.35, msg: '', msgT: 0, y: 0, vy: 0, rocks: [], speed: 300, score: 0, t: 0, nextGap: 380, flash: 0 });
  }
  function press() {
    if (g.state === 'idle' || g.state === 'over') {
      reset();
      g.state = 'run';
      loop();
      return;
    }
    if (g.state === 'pause') {
      g.state = 'run';
      loop();
      return;
    }
    g.hold = true;
    if (g.y === 0) g.vy = -760; // jump only from the ground
  }
  function release() {
    g.hold = false;
    if (g.vy < -320) g.vy = -320; // let go early → a shorter hop
  }
  function loop() {
    cancelAnimationFrame(g.raf);
    g.last = performance.now();
    g.raf = requestAnimationFrame(step);
  }
  function step(t) {
    if (g.state !== 'run') return;
    if (!card.isConnected || !card.offsetParent || document.hidden) {
      g.state = 'pause';
      draw();
      return;
    }
    const dt = Math.min(0.05, (t - g.last) / 1000);
    g.last = t;
    g.t += dt;
    g.speed = Math.min(780, 300 + g.t * 9);
    const before = g.score;
    g.score += dt * g.speed * 0.025;
    if (Math.floor(g.score / 100) > Math.floor(before / 100)) {
      g.flash = 0.6;
      const n = Math.floor(g.score / 100) * 100;
      g.msg = ['images generated ✨', 'videos rendered 🎬', 'prompts served ⚡', 'models trained 🚀'][(n / 100 - 1) % 4];
      g.msg = `${n} ${g.msg}`;
      g.msgT = 1.6;
    }
    g.msgT = Math.max(0, g.msgT - dt);
    g.flash = Math.max(0, g.flash - dt);
    // jump physics: lighter gravity while the key is held on the way up (moon gravity!)
    g.vy += (g.hold && g.vy < 0 ? 1500 : 2600) * dt;
    g.y += g.vy * dt; // y is negative while in the air
    if (g.y > 0) { g.y = 0; g.vy = 0; }
    // rocks
    for (const r of g.rocks) r.x -= g.speed * dt;
    for (const q of g.cubes) q.x -= g.speed * dt;
    g.sign -= g.speed * dt * 0.12;
    if (g.sign < -260) g.sign = W + 200 + Math.random() * 400;
    g.pops = g.pops.filter((o) => (o.t -= dt) > 0);
    g.rocks = g.rocks.filter((r) => r.x + r.w > -10);
    g.nextGap -= g.speed * dt;
    if (g.nextGap <= 0) {
      const big = Math.random() < Math.min(0.45, g.t / 60);
      const pair = g.t > 12 && Math.random() < 0.25;
      const n = pair ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const w = (big ? 26 : 18) + Math.random() * 8, h = (big ? 30 : 20) + Math.random() * 6;
        const bug = !pair && g.score > 60 && Math.random() < 0.3;
        g.rocks.push(bug ? { x: W + 10, w: 24, h: 18, seed: Math.random(), bug: true } : { x: W + 10 + i * (w + 4), w, h, seed: Math.random() });
      }
      // a Acme Labs cube now and then, low (just keep running) or high (jump for it)
      if (Math.random() < 0.55) g.cubes.push({ x: W + 10 + g.speed * (0.25 + Math.random() * 0.2), y: Math.random() < 0.5 ? GROUND - 26 : GROUND - 82, b: Math.random() * 6 });
      g.nextGap = g.speed * (0.55 + Math.random() * 0.7) + 160;
    }
    const dx = 46, dy = GROUND + g.y - DH;
    g.cubes = g.cubes.filter((q) => {
      const qy = q.y + Math.sin(g.t * 4 + q.b) * 3;
      if (q.x < dx + DW + 2 && q.x + 16 > dx && qy < dy + DH && qy + 16 > dy) {
        g.got++;
        g.score += 25;
        g.pops.push({ x: q.x, y: qy, t: 0.7 });
        return false;
      }
      return q.x > -20;
    });
    // hit test with a forgiving box
    for (const r of g.rocks) {
      if (dx + DW - 8 > r.x + 4 && dx + 8 < r.x + r.w - 4 && dy + DH - 4 > GROUND - r.h + 6) {
        g.state = 'over';
        if (g.score > best) {
          best = Math.floor(g.score);
          try { localStorage.setItem(GAME_BEST_KEY, String(best)); } catch (e) {}
        }
        break;
      }
    }
    for (const s of g.stars) {
      s.x -= (g.speed * dt * 0.04 * s.k) / W * 10;
      if (s.x < 0) s.x += 1;
    }
    draw();
    if (g.state === 'run') g.raf = requestAnimationFrame(step);
  }
  function bugDraw(r, p) {
    // a little software bug: round body, six legs, two feelers
    const x = r.x, cy = GROUND - 9, wig = Math.sin(g.t * 20) * 1.5;
    cx.strokeStyle = p.bug;
    cx.lineWidth = 1.6;
    cx.beginPath();
    for (let i = -1; i <= 1; i++) {
      cx.moveTo(x + 12 + i * 6, cy + 2);
      cx.lineTo(x + 12 + i * 7 - 4, GROUND - (i === 0 ? wig : -wig) * 0.5);
      cx.moveTo(x + 12 + i * 6, cy + 2);
      cx.lineTo(x + 12 + i * 7 + 4, GROUND + (i === 0 ? wig : -wig) * 0.5);
    }
    cx.moveTo(x + 5, cy - 5); cx.lineTo(x, cy - 12);
    cx.moveTo(x + 8, cy - 6); cx.lineTo(x + 6, cy - 14);
    cx.stroke();
    cx.fillStyle = p.bug;
    cx.beginPath();
    cx.ellipse(x + 13, cy, 10, 8, 0, 0, Math.PI * 2);
    cx.fill();
    cx.fillStyle = space() ? '#070a1f' : '#fff';
    cx.fillRect(x + 12.4, cy - 7, 1.2, 14);
    cx.beginPath();
    cx.arc(x + 5, cy - 2, 1.6, 0, Math.PI * 2);
    cx.fill();
  }
  function cube(x, y, s, p) {
    const q = s / 2 - 1, r = 2;
    const sq = (a, b, c) => {
      cx.fillStyle = c;
      cx.beginPath();
      cx.roundRect ? cx.roundRect(a, b, q, q, r) : cx.rect(a, b, q, q);
      cx.fill();
    };
    sq(x, y, p.blue);
    sq(x + q + 2, y, p.navy);
    sq(x, y + q + 2, p.navy);
    sq(x + q + 2, y + q + 2, p.blue);
    cx.globalAlpha = 0.3;
    sq(x + q / 2 + 1, y + q / 2 + 1, '#ffffff');
    cx.globalAlpha = 1;
  }
  function rock(r, p) {
    if (r.bug) return bugDraw(r, p);
    const base = GROUND, top = GROUND - r.h, x = r.x;
    cx.fillStyle = p.rock;
    cx.beginPath();
    cx.moveTo(x, base);
    cx.lineTo(x + r.w * 0.08, top + r.h * 0.35);
    cx.lineTo(x + r.w * (0.3 + r.seed * 0.1), top);
    cx.lineTo(x + r.w * 0.72, top + r.h * 0.12);
    cx.lineTo(x + r.w * 0.95, top + r.h * 0.45);
    cx.lineTo(x + r.w, base);
    cx.closePath();
    cx.fill();
    cx.fillStyle = p.crater;
    cx.beginPath();
    cx.arc(x + r.w * 0.42, top + r.h * 0.45, r.w * 0.11, 0, Math.PI * 2);
    cx.arc(x + r.w * 0.7, top + r.h * 0.7, r.w * 0.07, 0, Math.PI * 2);
    cx.fill();
  }
  function dino(p) {
    const x = 46, y = GROUND + g.y - DH;
    const legs = g.state !== 'run' || g.y < 0 ? LEGS[0] : LEGS[1 + (Math.floor(g.t * 12) % 2)];
    const rows = DINO.concat(legs);
    cx.fillStyle = p.ink;
    rows.forEach((row, j) => {
      // whole runs of pixels at once, so no hairline seams show between them
      row.replace(/#+/g, (run, i) => cx.fillRect(Math.round(x + i * PX), Math.round(y + j * PX), run.length * PX, PX + 1));
    });
    // eye: a gap at row 1, col 10; the "x" eye after a crash
    if (g.state === 'over') {
      cx.strokeStyle = space() ? '#070a1f' : '#fff';
      cx.lineWidth = 1.2;
      const ex = x + 10.5 * PX, ey = y + 1.5 * PX;
      cx.beginPath();
      cx.moveTo(ex - 2, ey - 2); cx.lineTo(ex + 2, ey + 2);
      cx.moveTo(ex + 2, ey - 2); cx.lineTo(ex - 2, ey + 2);
      cx.stroke();
    }
    // a tiny Acme Labs badge on the suit
    cube(x + 6.5 * PX, y + 9.2 * PX, 9, p);
    // space helmet
    cx.strokeStyle = p.helmet;
    cx.lineWidth = 1.5;
    cx.beginPath();
    cx.arc(x + 12 * PX, y + 3 * PX, 7.2 * PX, 0, Math.PI * 2);
    cx.stroke();
    cx.fillStyle = space() ? 'rgba(143,176,255,.08)' : 'rgba(64,117,221,.06)';
    cx.fill();
  }
  function draw() {
    if (!cx) return;
    const p = pal();
    cx.clearRect(0, 0, W, H);
    for (const s of g.stars) {
      cx.fillStyle = `rgba(${p.star},${s.k.toFixed(2)})`;
      cx.fillRect(s.x * W, s.y, s.s, s.s);
    }
    // the Acme Labs sign drifting far behind
    if (g.sign > -260 && g.sign < W + 40) {
      cube(g.sign, 30, 30, { blue: p.lab, navy: p.word });
      cx.textAlign = 'left';
      cx.font = '800 30px system-ui, sans-serif';
      cx.fillStyle = p.word;
      cx.fillText('Models', g.sign + 38, 56);
      const mw = cx.measureText('Models').width;
      cx.fillStyle = p.lab;
      cx.fillText('Lab', g.sign + 38 + mw, 56);
    }
    // moon surface
    cx.strokeStyle = p.dim;
    cx.lineWidth = 1.5;
    cx.beginPath();
    cx.moveTo(0, GROUND + 0.5);
    cx.lineTo(W, GROUND + 0.5);
    cx.stroke();
    const off = (g.t * g.speed) % 60;
    cx.fillStyle = p.dim;
    for (let x = -off; x < W; x += 60) {
      cx.fillRect(x + 8, GROUND + 7, 10, 1.5);
      cx.fillRect(x + 34, GROUND + 14, 5, 1.5);
    }
    g.rocks.forEach((r) => rock(r, p));
    g.cubes.forEach((q) => cube(q.x, q.y + Math.sin(g.t * 4 + q.b) * 3, 16, p));
    dino(p);
    cx.textAlign = 'center';
    cx.font = '700 12px system-ui, sans-serif';
    for (const o of g.pops) {
      cx.globalAlpha = Math.min(1, o.t / 0.4);
      cx.fillStyle = p.blue;
      cx.fillText('+25', o.x + 8, o.y - 6 - (0.7 - o.t) * 30);
    }
    cx.globalAlpha = 1;
    if (g.msgT > 0 && g.state === 'run') {
      cx.globalAlpha = Math.min(1, g.msgT / 0.4);
      cx.fillStyle = p.text;
      cx.font = '700 14px system-ui, sans-serif';
      cx.fillText(g.msg, W / 2, 40);
      cx.globalAlpha = 1;
    }
    cx.fillStyle = p.text;
    cx.textAlign = 'center';
    if (g.state === 'idle') {
      cx.font = '600 14px system-ui, sans-serif';
      cx.fillText('Press Space or click to start the Acme Labs run', W / 2, 52);
    } else if (g.state === 'over') {
      cx.font = '700 16px system-ui, sans-serif';
      cx.fillText('R E N D E R   F A I L E D', W / 2, 46);
      cx.font = '500 12.5px system-ui, sans-serif';
      cx.fillText(`Score ${Math.floor(g.score)} · ${g.got} Acme Labs cube${g.got === 1 ? '' : 's'} · click or press Space to re-generate`, W / 2, 68);
    } else if (g.state === 'pause') {
      cx.font = '600 14px system-ui, sans-serif';
      cx.fillText('Paused · click to continue', W / 2, 52);
    }
    const sc = card.querySelector('#dgScore');
    if (sc) {
      sc.textContent = pad(g.score);
      sc.classList.toggle('blink', g.flash > 0);
    }
    const cb = card.querySelector('#dgCubes b');
    if (cb) cb.textContent = g.got;
    const b = card.querySelector('#dgBest');
    if (b) b.textContent = `Best ${pad(best)}`;
  }
  // keys work while the game has focus or a run is going, and never while typing in a field
  document.addEventListener('keydown', (ev) => {
    if (!card || !card.isConnected || !card.offsetParent) return;
    if (ev.key !== ' ' && ev.key !== 'ArrowUp') return;
    if (ev.target.closest && ev.target.closest('input, textarea, select, button, [contenteditable]')) return;
    if (document.activeElement !== cv && g.state !== 'run') return;
    ev.preventDefault();
    if (!ev.repeat) press();
  });
  document.addEventListener('keyup', (ev) => {
    if (ev.key === ' ' || ev.key === 'ArrowUp') release();
  });
  return {
    mount(grid) {
      if (!card) build();
      grid.appendChild(card);
      requestAnimationFrame(size);
      if (g.state === 'pause') draw();
    },
    state: () => ({ state: g.state, y: g.y, score: g.score, best, rocks: g.rocks.length, cubes: g.got, bugs: g.rocks.filter((r) => r.bug).length, near: Math.min(9999, ...g.rocks.map((r) => r.x - 46).filter((d) => d > -30)) }),
    // test hook: put a cube right in front of the dino
    _cube: () => g.cubes.push({ x: 60, y: GROUND + g.y - DH + 14, b: 0 }),
    press,
    release,
  };
})();
const dgOrigDashboard = renderDashboard;
renderDashboard = function () {
  dgOrigDashboard();
  const grid = document.querySelector('#dbBody .d2');
  if (grid) DashGame.mount(grid);
};
window.HRMS_GAME = DashGame; // used by the tests
