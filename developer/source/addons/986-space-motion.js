/* Space theme: a slow, always-running warp starfield behind every page (matches the hyperspace loading screen).
   Stars drift towards the viewer and stretch into short streaks; changing page gives a brief speed-up.
   Light on the computer: one canvas, at most 30 frames a second, paused while the window is hidden, off in the
   Light theme, off for "reduce motion", and switchable in Settings & backup → Appearance (acmelabs_hrms_motion). */
const MOTION_KEY = 'acmelabs_hrms_motion';
const SpaceMotion = (() => {
  const root = document.documentElement;
  const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  let cv = null, cx = null, stars = [], w = 0, h = 0, dpr = 1, raf = 0, last = 0, boostT = 0, shoot = null, nextShoot = 0;
  const COLORS = ['223,230,255', '207,220,255', '185,168,255', '159,193,255'];
  const wanted = () => {
    let v = 'on';
    try { v = localStorage.getItem(MOTION_KEY) || 'on'; } catch (e) {}
    return v !== 'off' && root.classList.contains('space') && !reduce.matches;
  };
  const star = (far) => ({
    x: (Math.random() - 0.5) * 2,
    y: (Math.random() - 0.5) * 2,
    z: far ? 1 : 0.15 + Math.random() * 0.85,
    pz: 0,
    c: COLORS[(Math.random() * COLORS.length) | 0],
    s: 0.6 + Math.random() * 0.9,
  });
  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth;
    h = window.innerHeight;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(220, Math.max(90, (w * h) / 9000)));
    while (stars.length < n) stars.push(star(false));
    stars.length = n;
  };
  const frame = (t) => {
    raf = requestAnimationFrame(frame);
    if (t - last < 33) return; // ~30 fps is plenty for a background
    const dt = Math.min(0.1, (t - last) / 1000 || 0.033);
    last = t;
    const boost = boostT > t ? 1 + 9 * Math.sin(((boostT - t) / 700) * Math.PI) ** 2 : 1;
    const speed = 0.055 * boost * dt;
    const ox = w * 0.58, oy = h * 0.42, f = Math.max(w, h) * 0.5;
    cx.clearRect(0, 0, w, h);
    cx.lineCap = 'round';
    for (const s of stars) {
      s.pz = s.z;
      s.z -= speed;
      if (s.z <= 0.04) {
        Object.assign(s, star(true));
        s.pz = s.z;
        continue;
      }
      const sx = ox + (s.x / s.z) * f, sy = oy + (s.y / s.z) * f;
      if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) {
        Object.assign(s, star(true));
        s.pz = s.z;
        continue;
      }
      const px = ox + (s.x / s.pz) * f, py = oy + (s.y / s.pz) * f;
      const near = 1 - s.z, a = Math.min(1, 0.15 + near * 0.9);
      cx.strokeStyle = `rgba(${s.c},${a.toFixed(3)})`;
      cx.lineWidth = s.s * (0.5 + near * 1.6);
      cx.beginPath();
      // streak length grows during the speed-up, so a page change feels like a tiny jump to hyperspace
      cx.moveTo(sx + (px - sx) * (boost > 1.2 ? 4 : 1.6), sy + (py - sy) * (boost > 1.2 ? 4 : 1.6));
      cx.lineTo(sx, sy);
      cx.stroke();
    }
    // an occasional shooting star
    if (!shoot && t > nextShoot) {
      const fromLeft = Math.random() < 0.5;
      shoot = { x: fromLeft ? w * (0.2 + Math.random() * 0.4) : w * (0.5 + Math.random() * 0.4), y: h * Math.random() * 0.35, vx: (fromLeft ? 1 : -1) * (520 + Math.random() * 260), vy: 220 + Math.random() * 120, life: 0 };
      nextShoot = t + 7000 + Math.random() * 9000;
    }
    if (shoot) {
      shoot.life += dt;
      shoot.x += shoot.vx * dt;
      shoot.y += shoot.vy * dt;
      const k = Math.max(0, 1 - shoot.life / 1.1);
      const g = cx.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 0.18, shoot.y - shoot.vy * 0.18);
      g.addColorStop(0, `rgba(235,240,255,${(0.9 * k).toFixed(3)})`);
      g.addColorStop(1, 'rgba(140,120,255,0)');
      cx.strokeStyle = g;
      cx.lineWidth = 1.6;
      cx.beginPath();
      cx.moveTo(shoot.x, shoot.y);
      cx.lineTo(shoot.x - shoot.vx * 0.18, shoot.y - shoot.vy * 0.18);
      cx.stroke();
      if (k <= 0) shoot = null;
    }
  };
  const start = () => {
    if (!cv) {
      cv = document.createElement('canvas');
      cv.id = 'spaceMotion';
      cv.setAttribute('aria-hidden', 'true');
      document.body.prepend(cv);
      cx = cv.getContext('2d');
      window.addEventListener('resize', () => cv && size());
    }
    size();
    if (!root.classList.contains('motion')) root.classList.add('motion');
    if (!raf) {
      last = 0;
      nextShoot = performance.now() + 4000;
      raf = requestAnimationFrame(frame);
    }
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    if (root.classList.contains('motion')) root.classList.remove('motion');
    if (cx) cx.clearRect(0, 0, w, h);
  };
  const sync = () => (wanted() && !document.hidden ? start() : stop());
  document.addEventListener('visibilitychange', sync);
  if (reduce.addEventListener) reduce.addEventListener('change', sync);
  window.addEventListener('beforeprint', stop);
  window.addEventListener('afterprint', sync);
  // react only when the Space/Light theme changes (adding "motion" to the same class list must not loop)
  let wasSpace = root.classList.contains('space');
  new MutationObserver(() => {
    const now = root.classList.contains('space');
    if (now !== wasSpace) {
      wasSpace = now;
      sync();
    }
  }).observe(root, { attributes: true, attributeFilter: ['class'] });
  // a short warp each time a page in the sidebar is opened
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest && ev.target.closest('nav button');
    if (b && raf && !b.classList.contains('nav-excel') && !/hide|eye/i.test(b.id || '')) boostT = performance.now() + 700;
  });
  sync();
  return { sync, running: () => !!raf, boost: () => (boostT = performance.now() + 700) };
})();
window.HRMS_MOTION = SpaceMotion;

/* the on/off switch, inside the Appearance card */
(() => {
  const card = $('themeChoice');
  if (!card || $('motionChoice')) return;
  let cur = 'on';
  try { cur = localStorage.getItem(MOTION_KEY) || 'on'; } catch (e) {}
  card.insertAdjacentHTML(
    'beforeend',
    `<div id="motionChoice" style="margin-top:12px"><p class="set-sub" style="margin:0 0 8px">Moving stars in the background (Space only)</p>
      <div class="sc-opts">${[
        ['on', 'Moving', 'Slow warp on every page'],
        ['off', 'Still', 'Stars stay still'],
      ]
        .map(([v, t, sub]) => `<label class="sc-opt"><input type="radio" name="motionStyle" value="${v}"${v === cur ? ' checked' : ''}><span><b>${t}</b><small>${sub}</small></span></label>`)
        .join('')}</div></div>`,
  );
  $('motionChoice').addEventListener('change', (ev) => {
    if (ev.target.name !== 'motionStyle') return;
    try { localStorage.setItem(MOTION_KEY, ev.target.value); } catch (e) {}
    SpaceMotion.sync();
    flash(ev.target.value === 'on' ? 'Moving stars on' : 'Stars stay still');
  });
})();
