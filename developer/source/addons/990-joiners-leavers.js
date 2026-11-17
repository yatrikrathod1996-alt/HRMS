/* ============================================================
   JOINERS & LEAVERS (People → Joiners & leavers)
   Onboarding: a checklist for everyone who joined in the last
   120 days (or joins later), from offer letter to confirmation.
   Offboarding: a fuller checklist for every open exit. It keeps
   the four Exit & FNF checks (handover, assets, access, documents)
   in step: they are ticked once every item in their group is done.
   Some items tick themselves from the data (bank details, joining
   date, assets returned, settlement worked out / paid).
   Data: e.onboard = {on, items:{key:date}, extra:[...], done},
         e.offboardList = {key: date | false}.
   ============================================================ */
const ONB_ITEMS = [
  ['Before day 1', [
    ['offer', 'Offer letter signed'],
    ['docs', 'ID and address proof collected (Aadhaar, PAN)'],
    ['bank', 'Bank details added', (e) => !!(e.bankAccount && (e.ifsc || e.routing || e.currency === 'USD'))],
    ['profile', 'Profile complete (role, department, joining date)', (e) => !!(e.designation && e.department && e.department !== 'Unassigned' && e.joining)],
    ['kit', 'Laptop and equipment ready', (e) => typeof astHeldBy === 'function' && astHeldBy(e.id).length > 0],
    ['accounts', 'Email, chat and tool accounts created'],
  ]],
  ['Day 1', [
    ['appt', 'Appointment letter issued'],
    ['welcome', 'Welcome and team introduction'],
    ['policies', 'Leave, attendance and conduct policies shared'],
    ['buddy', 'Manager or buddy assigned'],
  ]],
  ['First 30 days', [
    ['goals', 'First goals agreed'],
    ['checkin', '30-day check-in done'],
  ]],
  ['End of probation', [['confirm', 'Probation review and confirmation letter']]],
];
const OFF_ITEMS = [
  ['Notice', [
    ['resign', 'Resignation received and last working day recorded', (e) => !!e.lastDay],
    ['notice', 'Notice period agreed'],
  ]],
  ['Handover', [
    ['kt', 'Work handed over to a teammate', null, 'handover'],
    ['notes', 'Handover notes and passwords for shared tools passed on', null, 'handover'],
  ]],
  ['Assets and access', [
    ['assetsBack', 'Laptop, ID card and equipment returned', (e) => typeof astHeldBy === 'function' && !!e.lastDay && astHeldBy(e.id).length === 0 && astEverHeld(e.id), 'assets'],
    ['access', 'Email, chat, GitHub and tool access removed', null, 'access'],
  ]],
  ['Final pay', [
    ['leaveChk', 'Final attendance and leave balance checked'],
    ['fnf', 'Full & final settlement worked out', (e) => e.offboarding && e.offboarding.finalAmount !== '' && e.offboarding.finalAmount != null],
    ['fnfPaid', 'Full & final paid (due within 2 working days of the last day)', (e) => {
      const x = e.offboarding;
      return !!x && x.finalAmount !== '' && x.finalAmount != null && Number(x.paidAmount || 0) >= Number(x.finalAmount);
    }],
  ]],
  ['Documents', [
    ['relieve', 'Relieving and experience letters issued', null, 'documents'],
    ['exitTalk', 'Exit conversation done'],
  ]],
];
const CORE_GROUPS = ['handover', 'assets', 'access', 'documents'];
const astEverHeld = (id) => typeof astList === 'function' && astList().some((a) => (a.log || []).some((l) => l.empId === id));
let jlView = 'joining', jlOld = false;

const jlFmt = (iso) => {
  const d = parseISO(iso);
  return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
};
const jlToday = () => {
  const d = dOnly(new Date());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
function addDays(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addWorkingDays(iso, n) {
  const d = parseISO(iso);
  if (!d) return '';
  let left = n;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (d.getDay() !== 0 && d.getDay() !== 6 && !holidayOn(s)) left--;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ---------- onboarding ---------- */
function onbList() {
  const today = parseISO(jlToday());
  return S.employees.filter((e) => {
    if (e.status !== 'Active') return false;
    if (e.onboard && e.onboard.on === false) return false;
    if (e.onboard && e.onboard.on) return true;
    const j = parseISO(e.joining);
    return j && dayDiff(j, today) >= -180;
  });
}
function onbItems(e) {
  const out = [];
  ONB_ITEMS.forEach(([g, items]) => items.forEach(([k, label, auto]) => out.push({ g, k, label, auto })));
  (e.onboard?.extra || []).forEach((x) => out.push({ g: 'Also', k: x.k, label: x.label }));
  return out.map((it) => {
    const stored = e.onboard?.items?.[it.k];
    const autoDone = it.auto ? !!it.auto(e) : false;
    return { ...it, done: !!stored || autoDone, byData: autoDone && !stored, when: stored || '' };
  });
}
/* ---------- offboarding ---------- */
function offList(showDone, showOld = jlOld) {
  // exits whose last day is more than 60 days ago are left out unless asked for (older settlements were handled outside the HRMS)
  const since = addDays(jlToday(), -60);
  return exitEmployees()
    .filter((e) => showDone || exitSummary(e).progress !== 'Completed')
    .filter((e) => showOld || !e.lastDay || e.lastDay >= since)
    .sort((a, b) => String(b.lastDay || '9999').localeCompare(String(a.lastDay || '9999')));
}
function offItems(e) {
  const store = e.offboardList || {},
    core = e.offboarding || {};
  const out = [];
  OFF_ITEMS.forEach(([g, items]) =>
    items.forEach(([k, label, auto, grp]) => {
      const autoDone = auto ? !!auto(e) : false;
      const stored = store[k];
      // an Exit & FNF check that is already ticked counts for every item of its group (unless one was unticked here)
      const fromCore = grp && core[grp] && stored !== false;
      out.push({ g, k, label, grp, done: !!stored || autoDone || !!fromCore, byData: autoDone && !stored, when: typeof stored === 'string' ? stored : '' });
    }),
  );
  return out;
}
function syncCore(e) {
  const items = offItems(e);
  e.offboarding = e.offboarding || {};
  CORE_GROUPS.forEach((g) => {
    const mine = items.filter((x) => x.grp === g);
    if (mine.length) e.offboarding[g] = mine.every((x) => x.done);
  });
}

/* ---------- page ---------- */
document.getElementById('tab-settings').insertAdjacentHTML(
  'beforebegin',
  `<section id="tab-joiners" class="hide">
  <div class="top"><div><h2>Joiners &amp; leavers</h2><p>Onboarding and offboarding checklists, so nothing is missed on the first day or the last.</p></div>
    <div class="controls"><span class="seg" id="jlSeg"><button type="button" data-v="joining">Joining</button><button type="button" data-v="leaving">Leaving</button></span></div></div>
  <div class="jl-cards" id="jlCards"></div>
  <div class="jl-tools" id="jlTools"></div>
  <div id="jlList" class="jl-list"></div>
</section>`,
);
(() => {
  const b = document.createElement('button');
  b.type = 'button';
  b.id = 'navJoiners';
  b.className = 'nav-item';
  b.innerHTML = `<svg class="nav-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg><span>Joiners &amp; leavers</span>`;
  const after = document.querySelector('nav button[data-tab="employees"]');
  (after || document.querySelector('nav .spacer')).insertAdjacentElement(after ? 'afterend' : 'beforebegin', b);
  b.addEventListener('click', () => showTab('joiners', true));
  addonTabs.joiners = { button: b, section: 'tab-joiners', render: () => renderJoiners() };
})();

function progressBar(done, total) {
  const p = total ? Math.round((done / total) * 100) : 0;
  return `<div class="jl-prog" title="${done} of ${total} done"><i style="width:${p}%"></i></div><span class="jl-pn">${done}/${total}</span>`;
}
function personCard(e, kind) {
  const items = kind === 'on' ? onbItems(e) : offItems(e);
  const done = items.filter((x) => x.done).length;
  const groups = [...new Set(items.map((x) => x.g))];
  let meta = '', flag = '';
  if (kind === 'on') {
    const j = parseISO(e.joining), n = j ? dayDiff(j, parseISO(jlToday())) : null;
    meta = e.joining ? `${n != null && n > 0 ? 'Joins' : 'Joined'} ${jlFmt(e.joining)}${n != null ? (n > 0 ? ` · in ${n} day${n === 1 ? '' : 's'}` : n === 0 ? ' · today' : ` · day ${-n + 1}`) : ''}` : 'Joining date missing';
    const conf = j ? new Date(j.getFullYear(), j.getMonth() + 3, j.getDate()) : null;
    if (conf && !items.find((x) => x.k === 'confirm').done && dOnly(new Date()) >= conf) flag = `<span class="pillx c-red">Confirmation due</span>`;
  } else {
    const due = e.lastDay ? addWorkingDays(e.lastDay, 2) : '';
    const paid = items.find((x) => x.k === 'fnfPaid').done;
    meta = e.lastDay ? `Last day ${jlFmt(e.lastDay)} · full & final due by ${jlFmt(due)}` : 'Last working day not recorded';
    if (due && !paid && jlToday() > due) flag = `<span class="pillx c-red">Settlement overdue</span>`;
  }
  return `<article class="jl-card" data-jl="${esc(e.id)}" data-kind="${kind}">
    <header><div class="jl-who"><button type="button" class="nm" data-prof="${esc(e.id)}">${esc(fullName(e))}</button><span>${esc(e.id)} · ${esc(e.designation || 'Role not set')} · ${esc(e.department || 'Unassigned')}</span><small>${meta}</small></div>
      <div class="jl-pr">${flag}${progressBar(done, items.length)}</div></header>
    <div class="jl-groups">${groups
      .map(
        (g) => `<div class="jl-g"><h4>${esc(g)}</h4>${items
          .filter((x) => x.g === g)
          .map(
            (x) => `<label class="jl-it${x.done ? ' done' : ''}${x.byData ? ' auto' : ''}"><input type="checkbox" data-jl-k="${esc(x.k)}"${x.done ? ' checked' : ''}${x.byData ? ' disabled' : ''}><span>${esc(x.label)}</span>${x.byData ? '<small>from the data</small>' : x.when ? `<small>${esc(jlFmt(x.when))}</small>` : ''}</label>`,
          )
          .join('')}</div>`,
      )
      .join('')}</div>
    <footer>${kind === 'on' ? `<span class="jl-add"><input type="text" placeholder="Add an item for ${esc(fullName(e).split(' ')[0])}…" data-jl-new aria-label="New checklist item"><button type="button" class="btn" data-jl-addit>Add</button></span><button type="button" class="linkish" data-jl-stop>Remove from onboarding</button>` : `<button type="button" class="btn" data-exit-open="${esc(e.id)}">Open Exit &amp; FNF</button>`}</footer>
  </article>`;
}
function renderJoiners() {
  document.querySelectorAll('#jlSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === jlView));
  const on = onbList(), off = offList(false);
  const onItemsAll = on.map(onbItems), offItemsAll = off.map(offItems);
  const openOn = onItemsAll.reduce((s, l) => s + l.filter((x) => !x.done).length, 0);
  const openOff = offItemsAll.reduce((s, l) => s + l.filter((x) => !x.done).length, 0);
  const overdue = off.filter((e) => {
    const due = e.lastDay ? addWorkingDays(e.lastDay, 2) : '';
    return due && jlToday() > due && !offItems(e).find((x) => x.k === 'fnfPaid').done;
  }).length;
  $('jlCards').innerHTML = [
    [on.length, 'Joining now', 'blue'],
    [openOn, 'Onboarding items open', ''],
    [off.length, 'Open exits', 'amber'],
    [openOff, 'Offboarding items open', ''],
    [overdue, 'Settlements past 2 working days', overdue ? 'red' : 'green'],
  ]
    .map(([n, l, c]) => `<div class="jl-k ${c}"><b>${n}</b><span>${l}</span></div>`)
    .join('');
  if (jlView === 'joining') {
    const others = S.employees.filter((e) => e.status === 'Active' && !on.includes(e)).sort((a, b) => a.name.localeCompare(b.name));
    $('jlTools').innerHTML = `<label class="inline">Start onboarding for <select id="jlStartSel"><option value="">Choose someone…</option>${others.map((e) => `<option value="${esc(e.id)}">${esc(fullName(e))} (${esc(e.id)})</option>`).join('')}</select></label><button type="button" class="btn" id="jlStart">Start</button><span class="jl-note">Everyone who joined in the last 6 months (or joins later) appears here on their own.</span>`;
    $('jlList').innerHTML = on.length ? on.map((e) => personCard(e, 'on')).join('') : '<p class="jl-empty">No one is onboarding right now. Add an employee with a joining date, or start onboarding above.</p>';
  } else {
    const older = offList(false, true).length - off.length;
    $('jlTools').innerHTML = `<label class="inline jl-old"><input type="checkbox" id="jlOld"${jlOld ? ' checked' : ''}> Show older exits${older > 0 && !jlOld ? ` (${older} more, last day over 60 days ago)` : ''}</label><span class="jl-note">Open exits from Exit &amp; FNF. Ticking a whole group (handover, assets, access, documents) ticks it in Exit &amp; FNF too.</span>`;
    $('jlList').innerHTML = off.length ? off.map((e) => personCard(e, 'off')).join('') : '<p class="jl-empty">No open exits.</p>';
  }
}
document.addEventListener('click', (ev) => {
  const seg = ev.target.closest('#jlSeg button');
  if (seg) {
    jlView = seg.dataset.v;
    renderJoiners();
    return;
  }
  if (ev.target.closest('#jlStart')) {
    const id = $('jlStartSel').value, e = S.employees.find((x) => x.id === id);
    if (!e) return flash('Choose someone first');
    e.onboard = { ...(e.onboard || {}), on: true, items: e.onboard?.items || {} };
    save();
    renderJoiners();
    flash(`Onboarding started for ${fullName(e)}`);
    return;
  }
  const card = ev.target.closest('.jl-card');
  if (!card) return;
  const e = S.employees.find((x) => x.id === card.dataset.jl);
  if (!e) return;
  if (ev.target.closest('[data-jl-stop]')) {
    e.onboard = { ...(e.onboard || {}), on: false };
    save();
    renderJoiners();
    flash(`${fullName(e)} removed from onboarding`);
  } else if (ev.target.closest('[data-jl-addit]')) {
    const inp = card.querySelector('[data-jl-new]'), label = inp.value.trim();
    if (!label) return inp.focus();
    e.onboard = { on: true, items: {}, ...(e.onboard || {}) };
    e.onboard.extra = [...(e.onboard.extra || []), { k: 'x' + Date.now().toString(36), label: label.slice(0, 120) }];
    save();
    renderJoiners();
  } else if (ev.target.closest('[data-exit-open]')) {
    if (typeof openEmployeeExit === 'function') openEmployeeExit(e.id);
    else document.querySelector('nav button[data-tab="exits"]')?.click();
  }
});
document.addEventListener('change', (ev) => {
  if (ev.target.id === 'jlOld') {
    jlOld = ev.target.checked;
    return renderJoiners();
  }
  const k = ev.target.dataset?.jlK, card = ev.target.closest('.jl-card');
  if (!k || !card) return;
  const e = S.employees.find((x) => x.id === card.dataset.jl);
  if (!e) return;
  const stamp = ev.target.checked ? jlToday() : false;
  if (card.dataset.kind === 'on') {
    e.onboard = { on: true, items: {}, ...(e.onboard || {}) };
    e.onboard.items = { ...(e.onboard.items || {}) };
    if (stamp) e.onboard.items[k] = stamp;
    else delete e.onboard.items[k];
  } else {
    e.offboardList = { ...(e.offboardList || {}), [k]: stamp };
    syncCore(e);
  }
  save();
  renderJoiners();
});
window.HRMS_JL = { onbList, onbItems, offList, offItems, addWorkingDays, render: () => renderJoiners() }; // used by the tests
