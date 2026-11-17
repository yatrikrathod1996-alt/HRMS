/* Dashboard: only what HR needs at a glance each day, by default. Every other card can be switched back on with
   "Customise" (kept in this browser: acmelabs_hrms_dash, the list of cards shown). Cards that are off are not
   drawn on screen; their numbers are still worked out by the same code when switched on.
   Runs after every other dashboard add-on (989), so it sees the finished dashboard. */
const DASH_KEY = 'acmelabs_hrms_dash';
const DASH_CARDS = [
  // key, label, how to find it, shown by default
  ['tasks', 'Pending tasks', (g) => g.querySelector('.d2-tasks'), true],
  ['events', 'Upcoming events', (g) => findCard(g, 'Upcoming events'), true],
  ['paysum', 'Payroll this month', (g) => findCard(g, 'Payroll summary'), true],
  ['att', 'Attendance overview', (g) => findCard(g, 'Attendance overview'), false],
  ['trend', 'Payroll trend', (g) => findCard(g, 'Payroll trend'), false],
  ['leave', 'Leave summary', (g) => findCard(g, 'Leave summary'), false],
  ['quick', 'Quick access', (g) => findCard(g, 'Quick access'), false],
  ['dept', 'Department-wise headcount', (g) => findCard(g, 'Department-wise headcount'), false],
  ['activity', 'Recent activity', (g) => findCard(g, 'Recent activity'), false],
  ['team', 'Team status', (g) => g.querySelector(':scope > .d2-full'), false],
  ['law', 'Labour-law updates', (g) => g.querySelector('#lawCard'), false],
  ['game', 'Break time · Acme Labs Dino', (g) => g.querySelector('#dashGame'), true],
];
const WIDE = new Set(['dept', 'team', 'law', 'game']); // always the full width
function findCard(g, title) {
  return [...g.querySelectorAll(':scope > .d2-card')].find((c) => (c.querySelector('h3')?.textContent || '').trim() === title);
}
function dashOn() {
  try {
    const v = JSON.parse(localStorage.getItem(DASH_KEY) || 'null');
    if (Array.isArray(v)) return new Set(v);
  } catch (e) {}
  return new Set(DASH_CARDS.filter((c) => c[3]).map((c) => c[0]));
}
function dashSave(set) {
  try {
    localStorage.setItem(DASH_KEY, JSON.stringify([...set]));
  } catch (e) {}
}
function dashArrange() {
  const g = document.querySelector('#dbBody .d2');
  if (!g) return;
  const on = dashOn();
  const small = [], wide = [];
  DASH_CARDS.forEach(([k, , find]) => {
    const el = find(g);
    if (!el) return;
    el.dataset.dash = k;
    el.hidden = !on.has(k);
    if (!el.hidden) (WIDE.has(k) ? wide : small).push(el);
  });
  // small cards fill each row evenly: 3 a row, then 2 or 1 for what is left
  small.forEach((el, i) => {
    el.classList.remove('s3', 's4', 's6', 's8', 's12');
    const left = small.length - (i - (i % 3));
    el.classList.add(left >= 3 ? 's4' : left === 2 ? 's6' : 's12');
    g.appendChild(el);
  });
  wide.forEach((el) => {
    if (el.classList.contains('d2-card')) {
      el.classList.remove('s3', 's4', 's6', 's8');
      el.classList.add('s12');
    }
    g.appendChild(el);
  });
  dashButton();
}
function dashButton() {
  const ctl = document.querySelector('#tab-dashboard .dbhead .controls');
  if (!ctl || $('dashCustom')) return;
  ctl.insertAdjacentHTML(
    'afterbegin',
    `<div class="dc-wrap"><button type="button" class="btn" id="dashCustom" aria-haspopup="true" aria-expanded="false">Customise</button>
      <div class="dc-pop" id="dashPop" hidden role="dialog" aria-label="Choose dashboard cards"></div></div>`,
  );
}
function dashPop() {
  const pop = $('dashPop');
  const on = dashOn();
  pop.innerHTML = `<p class="dc-t">Show on the dashboard</p>${DASH_CARDS.map(
    ([k, label, , def]) =>
      `<label class="dc-row"><input type="checkbox" data-dash-k="${k}"${on.has(k) ? ' checked' : ''}><span>${esc(label)}</span>${def ? '<small>default</small>' : ''}</label>`,
  ).join('')}<div class="dc-acts"><button type="button" class="linkish" id="dashReset">Back to the essentials</button><button type="button" class="linkish" id="dashAll">Show all</button></div>`;
}
document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('#dashCustom');
  const pop = $('dashPop');
  if (btn) {
    const open = pop.hidden;
    if (open) {
      dashPop();
      // the header clips anything that sticks out, so the menu floats above the page next to the button
      if (pop.parentElement !== document.body) document.body.appendChild(pop);
      const r = btn.getBoundingClientRect();
      pop.style.top = `${Math.round(r.bottom + 8)}px`;
      pop.style.left = `${Math.round(Math.max(12, r.right - 270))}px`;
    }
    pop.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    return;
  }
  if (ev.target.closest('#dashReset') || ev.target.closest('#dashAll')) {
    const all = !!ev.target.closest('#dashAll');
    dashSave(new Set(DASH_CARDS.filter((c) => all || c[3]).map((c) => c[0])));
    dashPop();
    dashArrange();
    return;
  }
  if (pop && !pop.hidden && !ev.target.closest('#dashPop')) {
    pop.hidden = true;
    $('dashCustom')?.setAttribute('aria-expanded', 'false');
  }
});
document.addEventListener('change', (ev) => {
  const k = ev.target.dataset?.dashK;
  if (!k) return;
  const on = dashOn();
  ev.target.checked ? on.add(k) : on.delete(k);
  dashSave(on);
  dashArrange();
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && $('dashPop') && !$('dashPop').hidden) {
    $('dashPop').hidden = true;
    $('dashCustom')?.focus();
  }
});
const dfOrigDashboard = renderDashboard;
renderDashboard = function () {
  dfOrigDashboard();
  dashArrange();
  // the menu's pending-task count: the first dashboard draw happens before the usual after-render steps
  if (typeof updateTaskBadge === 'function') updateTaskBadge();
};
window.HRMS_DASH = { cards: DASH_CARDS.map((c) => c[0]), on: () => [...dashOn()], key: DASH_KEY }; // used by the tests
