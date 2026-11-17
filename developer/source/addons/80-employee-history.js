/* ============================================================
   EMPLOYEE HISTORY (in the employee profile)
   A timeline built from what the HRMS already holds: joining,
   probation, increments, letters issued, assets, expense claims,
   status and exit. From now on, changes to the key profile fields
   are also recorded (whichever screen makes them), by comparing
   each employee with the last saved snapshot after every redraw.
   Data: e.history (logged changes), e.historySnapshot (last seen values).
   ============================================================ */
const HIST_FIELDS = [
  ['designation', 'Designation'],
  ['department', 'Department'],
  ['type', 'Employment type'],
  ['status', 'Status'],
  ['location', 'Works from'],
  ['salary', 'Monthly salary'],
  ['variable', 'Fixed variable pay'],
  ['lastDay', 'Last working day'],
];
const histValue = (k, v, e) =>
  v === '' || v == null
    ? '—'
    : ['salary', 'variable'].includes(k)
      ? money(v, e.currency)
      : k === 'lastDay'
        ? fmtLong(v)
        : String(v);
function histTrack() {
  if (!S || !Array.isArray(S.employees)) return;
  let changed = false;
  for (const e of S.employees) {
    // the last seen values travel with the employee record, so a restored backup or data file stays consistent
    const now = Object.fromEntries(HIST_FIELDS.map(([k]) => [k, e[k] ?? '']));
    const before = e.historySnapshot;
    if (JSON.stringify(before) === JSON.stringify(now)) continue;
    e.historySnapshot = now;
    changed = true;
    if (!before || typeof before !== 'object') continue; // first time: nothing to compare with
    // a change made by an increment already has its own entry in the timeline
    const incs = (S.increments || []).filter((r) => r.empId === e.id);
    const byIncrement = (k, from, to) =>
      incs.some((r) => {
        const pair = {
          salary: ['oldSalary', 'newSalary'],
          variable: ['oldVar', 'newVar'],
          designation: ['oldDesignation', 'newDesignation'],
          type: ['oldType', 'newType'],
        }[k];
        return pair && String(r[pair[0]] ?? '') === String(from) && String(r[pair[1]] ?? '') === String(to);
      });
    for (const [k, label] of HIST_FIELDS) {
      const from = before[k] ?? '',
        to = now[k] ?? '';
      if (String(from) === String(to) || byIncrement(k, from, to)) continue;
      e.history = Array.isArray(e.history) ? e.history : [];
      e.history.push({ date: todayISO(), at: Date.now(), field: k, label, from, to });
    }
  }
  if (changed) save();
}
afterRender.push(histTrack);
// take the first snapshot as soon as the data is loaded, so the very first change is already recorded
try {
  histTrack();
} catch (err) {
  console.warn('HRMS history snapshot', err);
}

function histEvents(e) {
  const ev = [];
  const add = (date, kind, title, sub = '') => date && ev.push({ date, kind, title, sub });
  if (e.joining) add(e.joining, 'join', 'Joined', [e.designation, e.department].filter(Boolean).join(' · '));
  const conf = (S.docs || []).find(
    (d) => d.type === 'confirmation' && (d.empId === e.id || d.name === e.name),
  );
  if (e.joining && !conf) {
    const pe = addMonthsISO(e.joining, 3);
    if (pe > todayISO() || e.type === 'Probation')
      add(pe, 'probation', pe > todayISO() ? 'Probation ends' : 'Probation ended, not yet confirmed');
  }
  (S.increments || [])
    .filter((r) => r.empId === e.id)
    .forEach((r) => {
      const pct = r.oldSalary ? Math.round(((r.newSalary - r.oldSalary) / r.oldSalary) * 1000) / 10 : 0;
      add(
        r.date,
        'increment',
        `Increment ${money(r.oldSalary, e.currency)} → ${money(r.newSalary, e.currency)}${pct ? ` (+${pct}%)` : ''}`,
        [
          r.newVar && r.newVar !== r.oldVar ? `variable ${money(r.newVar, e.currency)} / month` : '',
          r.newDesignation && r.newDesignation !== r.oldDesignation ? `designation ${r.newDesignation}` : '',
          r.reason,
        ]
          .filter(Boolean)
          .join(' · '),
      );
    });
  (S.docs || [])
    .filter((d) => d.empId === e.id || (!d.empId && d.name === e.name))
    .forEach((d) =>
      add(d.date || iso(new Date(d.at)), 'letter', ((DOCS[d.type] || {}).label || d.type) + ' issued', d.ref),
    );
  (e.history || []).forEach((h) =>
    add(
      h.date,
      'change',
      `${h.label} changed`,
      `${histValue(h.field, h.from, e)} → ${histValue(h.field, h.to, e)}`,
    ),
  );
  (S.assetRegister || []).forEach((a) =>
    (a.log || [])
      .filter((x) => x.empId === e.id && x.action !== 'Added')
      .forEach((x) =>
        add(
          x.date,
          'asset',
          `${x.action} ${a.tag} (${a.type})`,
          [a.name, x.condition, x.note].filter(Boolean).join(' · '),
        ),
      ),
  );
  (S.expenseClaims || [])
    .filter((c) => c.empId === e.id && c.status !== 'Submitted')
    .forEach((c) =>
      add(
        c.date,
        'claim',
        `Expense ${c.ref} ${expStatus(c).toLowerCase()} · ${'₹' + numFmt(c.amount, 'INR')}`,
        [c.category, c.desc, c.payMonth ? 'payroll ' + monthLabel(c.payMonth) : '']
          .filter(Boolean)
          .join(' · '),
      ),
    );
  if (e.inactiveSince && !(e.history || []).some((h) => h.field === 'status'))
    add(e.inactiveSince, 'status', 'Made inactive');
  if (e.lastDay) add(e.lastDay, 'exit', 'Last working day');
  return ev.sort((a, b) => b.date.localeCompare(a.date));
}
const HIST_ICON = {
  join: '★',
  probation: '◷',
  increment: '↗',
  letter: '✉',
  change: '✎',
  asset: '⌨',
  claim: '₹',
  status: '●',
  exit: '⇥',
};

const histOrigProfile = renderEmployeeProfile;
renderEmployeeProfile = function () {
  histTrack(); // record a just-saved change before the timeline is drawn
  histOrigProfile();
  const e = S.employees.find((x) => x.id === selectedProfileId),
    grid = document.querySelector('#profileBody .profile-grid');
  if (!e || !grid) return;
  const held = (S.assetRegister || []).filter((a) => a.status === 'Assigned' && a.holder === e.id);
  const claims = (S.expenseClaims || []).filter((c) => c.empId === e.id);
  const total = (st) =>
    r2(claims.filter((c) => expStatus(c) === st).reduce((s, c) => s + Number(c.amount), 0));
  const events = histEvents(e);
  grid.insertAdjacentHTML(
    'beforeend',
    `<section class="profile-card"><h4>Assets <span class="idc">${held.length} with ${esc(fullName(e))}</span></h4>
      ${held.length ? `<ul class="hist-mini">${held.map((a) => `<li><b>${esc(a.tag)}</b> ${esc(a.type)}${a.name ? ' · ' + esc(a.name) : ''}<small>since ${fmtLong(astSince(a)) || '—'}</small></li>`).join('')}</ul>` : '<p class="idc">No company assets.</p>'}</section>
    <section class="profile-card"><h4>Expense claims <span class="idc">${claims.length} in total</span></h4>
      <div class="profile-details">${profileField('To review', '₹' + numFmt(total('Submitted'), 'INR'))}${profileField('Approved, to pay', '₹' + numFmt(total('Approved'), 'INR'))}${profileField('Paid', '₹' + numFmt(total('Paid'), 'INR'))}</div></section>
    <section class="profile-card profile-wide"><h4>History <span class="idc">${events.length} ${events.length === 1 ? 'event' : 'events'}</span></h4>
      ${events.length ? `<ol class="hist-line">${events.map((x) => `<li class="hk-${x.kind}${x.date > todayISO() ? ' future' : ''}"><i aria-hidden="true">${HIST_ICON[x.kind] || '•'}</i><div><b>${esc(x.title)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</div><time>${fmtLong(x.date)}</time></li>`).join('')}</ol>` : '<p class="idc">Nothing recorded yet.</p>'}</section>`,
  );
};
