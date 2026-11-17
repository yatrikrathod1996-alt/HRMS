/* ============================================================
   TASKS: separate tab. Your own tasks plus tasks the HRMS finds
   in the data. Every task has a status: Pending, Done,
   Postponed (until a date) or Ignored.
   ============================================================ */
document.getElementById('tab-dashboard').insertAdjacentHTML(
  'afterend',
  `<section id="tab-tasks" class="hide"><div class="tk2">
  <div class="tk-head"><div><h2>Tasks</h2><p>Your own tasks and the ones the HRMS spots in your data, month by month.</p></div>
    <div class="tk-month"><button type="button" id="tkPrev" aria-label="Previous month">‹</button><b id="tkMonthLbl"></b><button type="button" id="tkNext" aria-label="Next month">›</button>
      <button type="button" class="tka" id="tkThis">This month</button><button type="button" class="tka" id="tkAllMonths">All months</button></div></div>
  <div class="tk-layout">
    <div class="tk-main"><div class="tk-tabs" id="tkTabs"></div><div id="tkList"></div></div>
    <aside class="tk-side">
      <div class="tk-card" id="tkProgress"></div>
      <div class="tk-card"><h4>Add a task</h4>
        <div class="tk-add"><input id="tkText" placeholder="e.g. Collect PAN copy from Om" maxlength="200">
          <div class="tk-add2"><input type="date" id="tkDue" title="Due date (optional)"><select id="tkEmp" title="Employee (optional)"></select></div>
          <button type="button" class="btn primary" id="tkAdd">+ Add task</button></div></div>
      <div class="tk-card"><h4>By type</h4><div id="tkCats"></div></div>
    </aside>
  </div>
</div></section>`,
);
addTab('tasks', {
  label: 'Tasks',
  html: '<span>Tasks</span><span class="nb" id="navTaskN"></span>',
  section: 'tab-tasks',
  place: ['#navDashboard', 'afterend'],
  render: () => renderTasks(),
});
const showTasks = (scroll) => showTab('tasks', scroll);
afterRender.push(() => updateTaskBadge()); // keep the pending count in the menu up to date
let tkFilter = 'pending',
  tkMonth = currentMonth(), // 'YYYY-MM', or 'all'
  tkCat = 'all'; // a TK_CATS key, or 'all'

/* task types: each has its own colour card on the Tasks page */
const TK_CATS = {
  letters: { l: 'Letters & confirmations', ic: 'file', c: 'amber' },
  payroll: { l: 'Payroll', ic: 'wallet', c: 'blue' },
  exits: { l: 'Exits & full and final', ic: 'out', c: 'violet' },
  review: { l: 'Salary reviews', ic: 'trend', c: 'green' },
  profile: { l: 'Profile details', ic: 'card', c: 'grey' },
  celebrate: { l: 'Birthdays & anniversaries', ic: 'cake', c: 'pink' },
  mine: { l: 'My tasks', ic: 'clip', c: 'navy' },
};
const CAT_BY_KEY = {
  confirm: 'letters',
  check: 'payroll',
  unpaid: 'payroll',
  fnf: 'exits',
  review: 'review',
  dob: 'profile',
  bank: 'profile',
  bday: 'celebrate',
  anniv: 'celebrate',
};
const taskCat = (x) => (x.own ? 'mine' : CAT_BY_KEY[x.key.split(':')[0]] || 'mine');

/* the month a task belongs to: its postponed-to date, its payroll month, its due date,
   or (own tasks without a date) the month it was added for */
function taskMonth(x) {
  if (x.status === 'postponed' && x.until) return x.until.slice(0, 7);
  if (x.m) return x.m;
  if (x.due) return x.due.slice(0, 7);
  if (x.own) return x.t.month || iso(new Date(x.at || Date.now())).slice(0, 7);
  return currentMonth();
}
const shiftMonth = (m, n) => {
  const [y, mo] = ym(m),
    d = new Date(y, mo - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/* ---- task data ---- */
const taskState = () => {
  if (!S.taskState || typeof S.taskState !== 'object') S.taskState = {};
  return S.taskState;
};
function ownTasks() {
  const l = taskList();
  l.forEach((t) => {
    if (!t.status) t.status = t.done ? 'done' : 'pending';
  });
  return l;
}
const idsKey = (l) =>
  l
    .map((e) => e.id)
    .sort()
    .join(',');
/* tasks the HRMS works out from the data (current and previous month) */
function autoTasks() {
  const today = dOnly(new Date()),
    cm = currentMonth(),
    pm = prevMonth(cm),
    out = [],
    act = activeNow();
  const add = (o) => out.push({ ...o, own: false });
  [pm, cm].forEach((m) => {
    if (!(S.payroll || {})[m]) return;
    const rs = monthRows(m),
      s = monthSum(m, rs);
    const bad = rs.filter((r) => r.check !== 'OK');
    if (bad.length)
      add({
        key: `check:${m}:${idsKey(bad.map((r) => r.e))}`,
        ic: 'alert',
        c: 'red',
        title: `Check ${bad.length} payroll row${bad.length > 1 ? 's' : ''} for ${monthLabel(m)}`,
        sub: bad.map((r) => `${r.e.name}: ${r.check}`).join(' · '),
        go: 'payroll',
        m,
      });
    if (m < cm && s.paid < s.n)
      add({
        key: `unpaid:${m}`,
        ic: 'wallet',
        c: 'blue',
        title: `Mark ${monthLabel(m)} salaries as paid`,
        sub: `${s.paid} of ${s.n} marked paid`,
        go: 'payroll',
        m,
      });
  });
  probationEnds(today)
    .filter((x) => x.n <= 14)
    .forEach(({ e, d, n }) =>
      add({
        key: `confirm:${e.id}`,
        ic: 'file',
        c: 'amber',
        title: `Confirmation letter for ${e.name}`,
        sub: `Probation ${n < 0 ? 'ended' : 'ends'} ${shortDate(d)} (3 months from joining)`,
        due: iso(d),
        emp: e,
        go: 'confirm',
      }),
    );
  exitEmployees().forEach((e) => {
    const x = exitSummary(e);
    if (x.progress === 'Completed') return;
    add({
      key: `fnf:${e.id}`,
      ic: 'out',
      c: 'violet',
      title: `Complete exit and full & final for ${e.name}`,
      sub: `Checklist ${x.done}/${EXIT_CHECKS.length}${x.balance > 0 ? ` · balance ${inr0(x.balance, cm, 'INR')}` : x.confirmed ? '' : ' · FNF amount not set'}`,
      due: e.lastDay || '',
      emp: e,
      go: 'exits',
    });
  });
  const incs = [...(S.increments || [])].sort((a, b) => b.date.localeCompare(a.date));
  act.forEach((e) => {
    const l = incs.find((r) => r.empId === e.id),
      d = l ? parseISO(l.date) : parseISO(e.joining);
    if (!d || dayDiff(today, d) < 365) return;
    add({
      key: `review:${e.id}:${iso(d)}`,
      ic: 'trend',
      c: 'green',
      title: `Salary review for ${e.name}`,
      sub: `${l ? 'Last increment' : 'Joined'} ${monYr(d)}, no increment for ${Math.floor(dayDiff(today, d) / 30.44)} months`,
      emp: e,
      go: 'incfor',
    });
  });
  withYears(act, 'dob', today, 0)
    .filter((x) => x.n >= 0 && x.n <= 2)
    .forEach((x) =>
      add({
        key: `bday:${x.e.id}:${x.d.getFullYear()}`,
        ic: 'cake',
        c: 'pink',
        title: `Wish ${x.e.name} a happy birthday`,
        sub: `Turns ${x.y} on ${shortDate(x.d)}`,
        due: iso(x.d),
        emp: x.e,
      }),
    );
  withYears(act, 'joining', today, 1)
    .filter((x) => x.n >= 0 && x.n <= 2)
    .forEach((x) =>
      add({
        key: `anniv:${x.e.id}:${x.d.getFullYear()}`,
        ic: 'award',
        c: 'blue',
        title: `Congratulate ${x.e.name} on ${x.y} year${x.y > 1 ? 's' : ''} at Acme Labs`,
        sub: `Work anniversary on ${shortDate(x.d)}`,
        due: iso(x.d),
        emp: x.e,
      }),
    );
  const noDob = act.filter((e) => !parseISO(e.dob));
  if (noDob.length)
    add({
      key: `dob:${idsKey(noDob)}`,
      ic: 'cake',
      c: 'pink',
      title: `Add date of birth for ${noDob.length} employee${noDob.length > 1 ? 's' : ''}`,
      sub: 'Needed for birthday reminders',
      people: noDob,
      go: 'employees',
    });
  const india = (e) => (e.location || 'India') !== 'Outside India';
  const noBank = act.filter(
    (e) => (india(e) && !String(e.pan || '').trim()) || !String(e.bankAccount || '').trim(),
  );
  if (noBank.length)
    add({
      key: `bank:${idsKey(noBank)}`,
      ic: 'card',
      c: 'grey',
      title: `Add PAN or bank details for ${noBank.length} employee${noBank.length > 1 ? 's' : ''}`,
      sub: 'Needed on salary slips and for payments',
      people: noBank,
      go: 'employees',
    });
  return out;
}
/* all tasks with their effective status (a postponed task comes back as Pending on its date) */
function allTasks() {
  const today = iso(new Date()),
    st = taskState();
  const own = ownTasks().map((t) => ({
    key: 'own:' + t.id,
    own: true,
    t,
    ic: 'clip',
    c: 'blue',
    title: t.text,
    sub: '',
    due: t.due || '',
    emp: t.emp ? S.employees.find((e) => e.id === t.emp) : null,
    status: t.status,
    until: t.until || '',
    at: t.at,
    doneAt: t.doneAt,
  }));
  const auto = autoTasks().map((a) => {
    const s = st[a.key] || {};
    return { ...a, status: s.status || 'pending', until: s.until || '', doneAt: s.at };
  });
  return [...own, ...auto].map((x) => ({
    ...x,
    status: x.status === 'postponed' && x.until && x.until <= today ? 'pending' : x.status,
  }));
}
function setTaskStatus(key, status, until) {
  if (key.startsWith('own:')) {
    const t = ownTasks().find((x) => 'own:' + x.id === key);
    if (!t) return;
    t.status = status;
    t.until = until || '';
    t.doneAt = Date.now();
    t.done = status === 'done';
  } else {
    const st = taskState();
    if (status === 'pending') delete st[key];
    else st[key] = { status, until: until || '', at: Date.now() };
  }
  // forget states of auto tasks that no longer exist, so the file stays small
  const live = new Set(autoTasks().map((a) => a.key));
  Object.keys(taskState()).forEach((k) => {
    if (!live.has(k)) delete S.taskState[k];
  });
  save();
}
function updateTaskBadge() {
  try {
    const n = allTasks().filter((t) => t.status === 'pending').length;
    const b = $('navTaskN');
    if (b) {
      b.textContent = n || '';
      b.style.display = n ? '' : 'none';
    }
  } catch (err) {}
}
const sortTasks = (l) =>
  l.sort(
    (a, b) =>
      (a.due || '9999').localeCompare(b.due || '9999') ||
      b.own - a.own ||
      String(a.title).localeCompare(String(b.title)),
  );

/* one task row (Tasks page; `short` = the compact version on the Dashboard):
   round tick = done, "Open" goes to the right screen, ⋯ holds postpone / ignore / delete */
function taskRow(x, short) {
  const today = dOnly(new Date()),
    d = parseISO(x.due),
    n = d ? dayDiff(d, today) : null,
    pending = x.status === 'pending',
    late = pending && n != null && n < 0;
  const k = esc(x.key),
    tomorrow = iso(new Date(today.getTime() + 864e5)),
    week = iso(new Date(today.getTime() + 7 * 864e5));
  const chips = [];
  if (d)
    chips.push(
      `<span class="chip ${late ? 'c-red' : n <= 1 && pending ? 'c-amber' : 'c-grey'}">${late ? `Overdue ${-n} day${n === -1 ? '' : 's'}` : n === 0 ? 'Due today' : n === 1 ? 'Due tomorrow' : 'Due ' + shortDate(d)}</span>`,
    );
  if (x.carried && !d)
    chips.push(`<span class="chip c-amber">From ${esc(monthLabel(x.month).split(' ')[0])}</span>`);
  if (x.status === 'done')
    chips.push(
      `<span class="chip c-green">Done${x.doneAt ? ' ' + shortDate(new Date(x.doneAt)) : ''}</span>`,
    );
  if (x.status === 'ignored') chips.push('<span class="chip c-grey">Ignored</span>');
  if (x.status === 'postponed')
    chips.push(
      `<span class="chip c-violet">Postponed to ${x.until ? shortDate(parseISO(x.until)) : 'later'}</span>`,
    );
  if (x.emp && !short) chips.push(nameBtn(x.emp)); // the compact Dashboard row already names the person in its title
  if (x.sub && !short) chips.push(`<span class="tk-sub">${esc(x.sub)}</span>`);
  const people =
    x.people && x.people.length && !short
      ? `<details class="tk-people"><summary>${x.people.length} people · show names</summary><div class="chips">${x.people.map((e) => `<button type="button" data-prof="${esc(e.id)}">${esc(e.name)}</button>`).join('')}</div></details>`
      : '';
  const check = pending
    ? `<button type="button" class="tk-check" data-ta="done" data-tk="${k}" title="Mark done" aria-label="Mark done: ${esc(x.title)}"></button>`
    : `<button type="button" class="tk-check on" data-ta="reopen" data-tk="${k}" title="Reopen" aria-label="Reopen: ${esc(x.title)}"></button>`;
  const menu = `<details class="tk-more pp"><summary title="More" aria-label="More actions">⋯</summary><div class="pp-menu">
      ${
        pending
          ? `<div class="pp-l">Postpone</div><button type="button" class="tka" data-ta="pp" data-until="${tomorrow}" data-tk="${k}">Tomorrow</button><button type="button" class="tka" data-ta="pp" data-until="${week}" data-tk="${k}">Next week</button><label>Pick a date<input type="date" min="${tomorrow}" data-ppdate="${k}"></label>
      <button type="button" class="tka" data-ta="ignore" data-tk="${k}">Ignore this task</button>`
          : `<button type="button" class="tka" data-ta="reopen" data-tk="${k}">Move back to pending</button>`
      }
      ${x.own ? `<button type="button" class="tka del" data-ta="del" data-tk="${k}">Delete task</button>` : ''}</div></details>`;
  return `<li class="tk2-row st-${x.status}${late ? ' late' : ''}">${check}<div class="tx"><div class="tt">${esc(x.title)}</div>${chips.length ? `<div class="meta">${chips.join('')}</div>` : ''}${people}</div>
    ${x.go && pending ? `<button type="button" class="tk-open" data-tgo="${k}" title="Open">${short ? '→' : 'Open →'}</button>` : ''}${menu}</li>`;
}
function renderTasks() {
  const emps = S.employees.filter((e) => e.status === 'Active').sort((a, b) => a.name.localeCompare(b.name)),
    keep = $('tkEmp').value;
  $('tkEmp').innerHTML =
    '<option value="">Employee (optional)</option>' +
    emps.map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join('');
  $('tkEmp').value = keep;
  const cm = currentMonth(),
    today = dOnly(new Date());
  $('tkMonthLbl').textContent = tkMonth === 'all' ? 'All months' : monthLabel(tkMonth);
  $('tkThis').classList.toggle('on', tkMonth === cm);
  $('tkAllMonths').classList.toggle('on', tkMonth === 'all');
  // tasks of the chosen month; the current month also shows unfinished tasks carried over from earlier months
  const inMonth = allTasks()
    .map((x) => ({ ...x, month: taskMonth(x), cat: taskCat(x) }))
    .map((x) => ({ ...x, carried: tkMonth === cm && x.status === 'pending' && x.month < cm }))
    .filter((x) => tkMonth === 'all' || x.month === tkMonth || x.carried);
  const by = (st, list = inMonth) => list.filter((t) => st === 'all' || t.status === st);

  /* side panel: progress */
  const active = inMonth.filter((t) => t.status !== 'ignored'),
    done = by('done').length,
    pct = active.length ? Math.round((done / active.length) * 100) : 0,
    overdue = by('pending').filter((t) => {
      const d = parseISO(t.due);
      return d && dayDiff(d, today) < 0;
    }).length,
    week = by('pending').filter((t) => {
      const d = parseISO(t.due);
      return d && dayDiff(d, today) >= 0 && dayDiff(d, today) <= 7;
    }).length;
  $('tkProgress').innerHTML =
    `<div class="tk-ring" style="--p:${pct}"><b>${pct}%</b></div><div><div class="tk-prog-t">${done} of ${active.length} done</div>
    <div class="tk-prog-s">${esc(tkMonth === 'all' ? 'All months' : monthLabel(tkMonth))}</div>
    <div class="tk-prog-chips"><span class="chip c-red">${overdue} overdue</span><span class="chip c-amber">${week} due in 7 days</span><span class="chip c-violet">${by('postponed').length} postponed</span></div></div>`;

  /* side panel: counts by type (click to show only that type) */
  const pendingByCat = {};
  by('pending').forEach((t) => (pendingByCat[t.cat] = (pendingByCat[t.cat] || 0) + 1));
  $('tkCats').innerHTML =
    `<button type="button" class="tk-catbtn ${tkCat === 'all' ? 'on' : ''}" data-cat="all"><span>All types</span><b>${by('pending').length}</b></button>` +
    Object.entries(TK_CATS)
      .map(
        ([k, c]) =>
          `<button type="button" class="tk-catbtn cat-${c.c} ${tkCat === k ? 'on' : ''}" data-cat="${k}">${icon(c.ic, c.c)}<span>${c.l}</span><b>${pendingByCat[k] || 0}</b></button>`,
      )
      .join('');

  /* status tabs */
  const shown = inMonth.filter((t) => tkCat === 'all' || t.cat === tkCat);
  $('tkTabs').innerHTML = [
    ['pending', 'Pending'],
    ['postponed', 'Postponed'],
    ['done', 'Done'],
    ['ignored', 'Ignored'],
    ['all', 'All'],
  ]
    .map(
      ([k, l]) =>
        `<button type="button" data-tf="${k}" class="${k === tkFilter ? 'on' : ''}">${l}<span>${by(k, shown).length}</span></button>`,
    )
    .join('');

  /* the list: one colour card per task type */
  const list = sortTasks(by(tkFilter, shown));
  if (tkFilter === 'done' || tkFilter === 'ignored') list.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  list.sort((a, b) => b.carried - a.carried); // carried-over first inside each card
  const SHOW = 5;
  $('tkList').innerHTML = list.length
    ? Object.entries(TK_CATS)
        .map(([k, c]) => {
          const items = list.filter((t) => t.cat === k);
          if (!items.length) return '';
          const rows = (arr) => arr.map((x) => taskRow(x)).join('');
          return `<div class="tk-catcard cat-${c.c}"><div class="tk-cat-h">${icon(c.ic, c.c)}<b>${c.l}</b><span>${items.length}</span></div>
            <ul class="tk2-list">${rows(items.slice(0, SHOW))}</ul>
            ${items.length > SHOW ? `<details class="tk-morelist"><summary>Show ${items.length - SHOW} more</summary><ul class="tk2-list">${rows(items.slice(SHOW))}</ul></details>` : ''}</div>`;
        })
        .join('')
    : `<div class="tk-empty">${icon('check', 'green')}<b>${tkFilter === 'pending' ? 'Nothing pending' : `No ${tkFilter} tasks`}</b><span>${tkMonth === 'all' ? '' : esc(monthLabel(tkMonth))}${tkCat === 'all' ? '' : ' · ' + esc(TK_CATS[tkCat].l)}</span></div>`;
  updateTaskBadge();
}
function addOwnTask() {
  const tx = $('tkText').value.trim();
  if (!tx) {
    $('tkText').focus();
    return;
  }
  taskList().push({
    id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text: tx,
    due: $('tkDue').value || '',
    emp: $('tkEmp').value || '',
    month: tkMonth === 'all' ? currentMonth() : tkMonth, // a task without a due date belongs to the month shown
    status: 'pending',
    at: Date.now(),
  });
  $('tkText').value = '';
  $('tkDue').value = '';
  $('tkEmp').value = '';
  save();
  tkFilter = 'pending';
  renderTasks();
  flash('Task added');
  $('tkText').focus();
}
$('tkAdd').addEventListener('click', addOwnTask);
$('tkText').addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    addOwnTask();
  }
});
$('tkPrev').addEventListener('click', () => {
  tkMonth = shiftMonth(tkMonth === 'all' ? currentMonth() : tkMonth, -1);
  renderTasks();
});
$('tkNext').addEventListener('click', () => {
  tkMonth = shiftMonth(tkMonth === 'all' ? currentMonth() : tkMonth, 1);
  renderTasks();
});
$('tkThis').addEventListener('click', () => {
  tkMonth = currentMonth();
  renderTasks();
});
$('tkAllMonths').addEventListener('click', () => {
  tkMonth = 'all';
  renderTasks();
});
$('tkCats').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-cat]');
  if (b) {
    tkCat = b.dataset.cat;
    renderTasks();
  }
});
$('tkTabs').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-tf]');
  if (b) {
    tkFilter = b.dataset.tf;
    renderTasks();
  }
});
/* actions work the same on the Tasks tab and on the Dashboard */
function taskAction(t, rerender) {
  if (t.dataset.tgo) {
    const x = allTasks().find((k) => k.key === t.dataset.tgo);
    if (!x) return;
    if (x.go === 'payroll') {
      month = x.m || currentMonth();
      document.querySelector('nav button[data-tab="payroll"]').click();
    } else if (x.go === 'confirm') openLetterFor('confirmation', x.emp.id);
    else if (x.go === 'incfor') {
      showInc(true);
      resetIncForm();
      $('iEmp').value = x.emp.id;
      $('iEmp').dispatchEvent(new Event('change'));
    } else {
      const b = document.querySelector(`nav button[data-tab="${x.go}"]`);
      if (b) b.click();
    }
    return true;
  }
  const a = t.dataset.ta,
    key = t.dataset.tk;
  if (!a || !key) return false;
  if (a === 'done') {
    setTaskStatus(key, 'done');
    flash('Marked done');
  } else if (a === 'ignore') {
    setTaskStatus(key, 'ignored');
    flash('Task ignored');
  } else if (a === 'reopen') {
    setTaskStatus(key, 'pending');
    flash('Task reopened');
  } else if (a === 'pp') {
    setTaskStatus(key, 'postponed', t.dataset.until);
    flash(`Postponed to ${shortDate(parseISO(t.dataset.until))}`);
  } else if (a === 'del') {
    const x = ownTasks().find((k) => 'own:' + k.id === key);
    if (x && confirm(`Delete this task?\n\n${x.text}`)) {
      S.tasks = taskList().filter((k) => k !== x);
      save();
      flash('Task deleted');
    }
  }
  rerender();
  updateTaskBadge();
  return true;
}
function ppDate(ev, rerender) {
  const k = ev.target.dataset && ev.target.dataset.ppdate;
  if (!k || !ev.target.value) return;
  setTaskStatus(k, 'postponed', ev.target.value);
  flash(`Postponed to ${shortDate(parseISO(ev.target.value))}`);
  rerender();
  updateTaskBadge();
}
$('tkList').addEventListener('click', (ev) => {
  const p = ev.target.closest('[data-prof]');
  if (p) {
    openEmployeeProfile(p.dataset.prof);
    return;
  }
  const t = ev.target.closest('button');
  if (t) taskAction(t, renderTasks);
});
// a task added from the side panel jumps to the "My tasks" view only if a type filter would hide it
$('tkAdd').addEventListener('click', () => {
  if (tkCat !== 'all' && tkCat !== 'mine') {
    tkCat = 'all';
    renderTasks();
  }
});
$('tkList').addEventListener('change', (ev) => ppDate(ev, renderTasks));
document.addEventListener('click', (ev) => {
  document.querySelectorAll('details.pp[open]').forEach((d) => {
    if (!d.contains(ev.target)) d.removeAttribute('open');
  });
});
