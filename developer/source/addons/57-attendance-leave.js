/* ============================================================
   ATTENDANCE and LEAVE BALANCES: clearer, more visual look.
   Attendance keeps app.js's grid and painting; this file only
   decorates it after each redraw (labelled codes, holiday and
   today columns, avatars, coloured totals, summary strip).
   Leave balances is redrawn with usage bars (same numbers).
   ============================================================ */
const CODE_LABEL = {
  P: 'Present',
  WFH: 'Work from home',
  WO: 'Weekly off',
  H: 'Holiday',
  PL: 'Paid leave',
  SL: 'Sick leave',
  CL: 'Casual leave',
  HD: 'Half day',
  A: 'Absent',
  UP: 'Unpaid leave',
};
const avatarHTML = (name) => `<span class="av ${avCls(name)}">${esc(initials(name))}</span>`;

/* ---------- attendance ---------- */
// summary strip above the grid
$('brush').insertAdjacentHTML('beforebegin', '<div class="att-sum" id="attSum"></div>');
// colour legend instead of the long sentence under the grid
(() => {
  const legend = document.querySelector('#tab-attendance .legend');
  if (legend)
    legend.innerHTML = ['P', 'WFH', 'WO', 'H', 'PL', 'SL', 'CL', 'HD', 'A', 'UP']
      .map((c) => `<span class="lg"><i class="c-${c}"></i>${c} · ${CODE_LABEL[c]}</span>`)
      .join('');
})();

function decorateBrush() {
  document.querySelectorAll('#brush button[data-code]').forEach((b) => {
    if (b.dataset.done) return;
    b.dataset.done = '1';
    b.innerHTML = `<b>${b.dataset.code}</b><span>${CODE_LABEL[b.dataset.code] || ''}</span>`;
    // the app's brush handler reads ev.target.dataset.code, so clicks on the inner text must reach the button
    b.querySelectorAll('b,span').forEach((x) => (x.style.pointerEvents = 'none'));
  });
}
function decorateAttendance() {
  const table = $('attTable');
  if (!table || !table.rows.length) return;
  const [y, mo] = ym(month),
    today = new Date(),
    isThisMonth = today.getFullYear() === y && today.getMonth() + 1 === mo,
    todayIdx = isThisMonth ? today.getDate() - 1 : -1;
  const holidays = {};
  (Array.isArray(S.holidays) ? S.holidays : []).forEach((h) => (holidays[h.date] = h));
  // header: holiday and today columns
  table.querySelectorAll('thead th.d').forEach((th, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`,
      h = holidays[date];
    if (h) {
      th.classList.add(h.type === 'Optional' ? 'hol-opt' : 'hol');
      th.title = h.name + (h.type === 'Optional' ? ' (optional holiday)' : ' (holiday)');
    }
    if (i === todayIdx) {
      th.classList.add('today');
      th.title = 'Today';
    }
  });
  const totalsHead = table.querySelectorAll('thead th.num');
  if (totalsHead.length >= 3) {
    totalsHead[0].textContent = 'Leave';
    totalsHead[1].textContent = 'Half day';
    totalsHead[2].textContent = 'Absent';
  }
  // rows: avatar + department, today column, coloured totals
  // attendance rate counts only days that have happened (all days of a past month, up to today in this month)
  const cm = currentMonth(),
    lastDayCounted = month < cm ? 99 : month === cm ? todayIdx : -1;
  const sum = { present: 0, expected: 0, leave: 0, HD: 0, AUP: 0 },
    who = { leave: new Set(), HD: new Set(), AUP: new Set() };
  const todayCount = { in: 0, out: [] };
  table.querySelectorAll('tbody tr').forEach((tr) => {
    const first = tr.querySelector('td.namecell'),
      id = tr.querySelector('td.cell')?.dataset.id,
      e = S.employees.find((x) => x.id === id);
    if (first && e && !first.dataset.done) {
      first.dataset.done = '1';
      first.innerHTML = `<div class="att-who">${avatarHTML(e.name)}<div><div class="name">${esc(e.name)}${tr.classList.contains('paid-lock') ? ' <span class="lock-tag">Paid · locked</span>' : ''}</div><div class="idc">${esc(e.id)} · ${esc(e.department || 'Unassigned')}</div></div></div>`;
    }
    tr.querySelectorAll('td.cell').forEach((td, i) => {
      if (i === todayIdx) td.classList.add('today');
      const c = (td.className.match(/\bc-(\w+)/) || [])[1];
      if (td.getAttribute('aria-disabled') === 'true') return; // before joining or after the last day: not absence
      if (['PL', 'SL', 'CL'].includes(c)) (sum.leave++, who.leave.add(id));
      else if (c === 'HD') (sum.HD++, who.HD.add(id));
      else if (c === 'A' || c === 'UP') (sum.AUP++, who.AUP.add(id));
      if (i <= lastDayCounted && c && !['WO', 'H', 'empty'].includes(c)) {
        sum.expected++; // a working day for this person
        sum.present += c === 'P' || c === 'WFH' ? 1 : c === 'HD' ? 0.5 : 0;
      }
      if (i === todayIdx && e) {
        if (c === 'P' || c === 'WFH') todayCount.in++;
        else if (c && !['WO', 'H'].includes(c)) todayCount.out.push(`${e.name} (${CODE_LABEL[c] || c})`);
      }
    });
    const cnt = tr.querySelectorAll('td.cnt');
    [
      ['green', cnt[0]],
      ['amber', cnt[1]],
      ['red', cnt[2]],
    ].forEach(([col, td]) => {
      if (!td) return;
      const n = Number(td.textContent);
      td.innerHTML = `<span class="cntp ${n ? col : 'zero'}">${td.textContent}</span>`;
    });
  });
  const people = table.querySelectorAll('tbody tr').length;
  const box = (n, l, c, tip = '') =>
    `<div class="as ${c}"${tip ? ` title="${esc(tip)}"` : ''}><b>${n}</b><span>${l}</span></div>`;
  // working days = Monday to Friday minus public holidays on weekdays
  const days = daysIn(month),
    hols = [];
  let working = 0;
  for (let i = 1; i <= days; i++) {
    const dt = new Date(y, mo - 1, i),
      date = `${month}-${String(i).padStart(2, '0')}`,
      h = holidays[date],
      weekend = [0, 6].includes(dt.getDay());
    if (h && h.type !== 'Optional') hols.push(h.name);
    if (!weekend && !(h && h.type !== 'Optional')) working++;
  }
  const rate = sum.expected ? Math.round((sum.present / sum.expected) * 1000) / 10 : null;
  const ppl = (set) => `${set.size} ${set.size === 1 ? 'person' : 'people'}`;
  $('attSum').innerHTML =
    (todayIdx >= 0
      ? box(
          `${todayCount.in}/${people}`,
          todayCount.out.length
            ? `In today · away: ${esc(todayCount.out.join(', '))}`
            : 'In today · everyone marked present',
          'navy',
        )
      : '') +
    box(
      working,
      `Working days in ${monthLabel(month).split(' ')[0]}`,
      'blue',
      'Monday to Friday, minus public holidays',
    ) +
    box(
      rate == null ? '—' : rate + '%',
      rate == null
        ? 'Attendance rate · month not started'
        : `Attendance rate · ${month === cm ? 'up to today' : 'whole month'}`,
      'green',
      'Present or working from home, out of working days (half day = 0.5)',
    ) +
    box(
      sum.leave,
      `Leave days · ${ppl(who.leave)}`,
      'teal',
      'Paid, sick and casual leave days of all staff this month',
    ) +
    box(sum.HD, `Half days · ${ppl(who.HD)}`, 'amber') +
    box(sum.AUP, `Absent / unpaid days · ${ppl(who.AUP)}`, 'red') +
    box(
      hols.length,
      hols.length ? `Holidays · ${hols.join(', ')}` : 'Holidays this month',
      'pink',
      hols.join(', '),
    );
}
// redraws happen inside app.js (render, painting, brush change); decorate after each one
new MutationObserver(decorateBrush).observe($('brush'), { childList: true });
new MutationObserver(decorateAttendance).observe($('attTable'), { childList: true });
afterRender.push(decorateBrush);

/* ---------- leave balances ---------- */
const LEAVE_TYPES = [
  ['PL', 'Paid leave', 'pl'],
  ['SL', 'Sick leave', 'sl'],
  ['CL', 'Casual leave', 'cl'],
];
$('leaveTable')
  .closest('.tablewrap')
  .insertAdjacentHTML('beforebegin', '<div class="lv-sum" id="leaveSum"></div>');
// replaces app.js's renderLeave (same numbers: usedThrough + quota), drawn with usage bars
renderLeave = function () {
  const rows = applyFilter(empsIn(month)).map((e) => {
    attFor(month, e);
    const q = quota(e),
      u = usedThrough(e, month);
    const left = {};
    LEAVE_TYPES.forEach(([t]) => (left[t] = q[t] - u[t]));
    const totalLeft = LEAVE_TYPES.reduce((s, [t]) => s + Math.max(0, left[t]), 0),
      totalQuota = q.PL + q.SL + q.CL;
    return { e, q, u, left, totalLeft, totalQuota };
  });
  const stdTotal = S.settings.PL + S.settings.SL + S.settings.CL;
  const bar = (t, cls, r) => {
    const q = r.q[t],
      u = r.u[t],
      l = r.left[t],
      pct = q > 0 ? Math.min(100, (u / q) * 100) : u > 0 ? 100 : 0;
    const state = l < 0 ? 'over' : l <= 1 && q > 0 ? 'low' : '';
    return `<td class="lvc ${state}"><div class="lv-top"><span>${u} used</span><b>${l < 0 ? `${-l} over` : `${l} left`}</b></div><div class="lv-bar ${cls}"><i style="width:${pct.toFixed(0)}%"></i></div><div class="lv-q">of ${q}</div></td>`;
  };
  let h = `<thead><tr><th>Employee</th>${LEAVE_TYPES.map(([t, l]) => `<th>${l} (${t})</th>`).join('')}<th class="num">Total left</th><th>Quota</th></tr></thead><tbody>`;
  rows.forEach((r) => {
    const ratio = r.totalQuota ? r.totalLeft / r.totalQuota : 0,
      ring = r.totalLeft <= 2 ? 'red' : ratio < 0.4 ? 'amber' : 'green';
    h += `<tr><td><div class="att-who">${avatarHTML(r.e.name)}<div><div class="name">${esc(r.e.name)}</div><div class="idc">${esc(r.e.id)} · ${esc(r.e.department || 'Unassigned')}</div></div></div></td>
      ${LEAVE_TYPES.map(([t, , cls]) => bar(t, cls, r)).join('')}
      <td class="num"><span class="lv-total ${ring}" style="--p:${(ratio * 100).toFixed(0)}"><b>${r.totalLeft}</b></span><div class="lv-q">of ${r.totalQuota}</div></td>
      <td><button class="lv-quota" data-q="${r.e.id}">${S.quotas[r.e.id] ? `Custom ${r.q.PL}/${r.q.SL}/${r.q.CL}` : 'Standard'}</button></td></tr>`;
  });
  if (!rows.length)
    h += '<tr><td colspan="6" class="empty-state">No employees match these filters.</td></tr>';
  $('leaveTable').innerHTML = h + '</tbody>';
  // summary cards
  const used = rows.reduce((s, r) => s + r.u.PL + r.u.SL + r.u.CL, 0),
    low = rows.filter((r) => r.q.PL > 0 && r.left.PL <= 2), // paid leave (the main leave) nearly used up
    over = rows.filter((r) => LEAVE_TYPES.some(([t]) => r.left[t] < 0)),
    top = [...rows].sort((a, b) => b.u.PL + b.u.SL + b.u.CL - (a.u.PL + a.u.SL + a.u.CL))[0];
  const card = (n, l, c, sub = '') =>
    `<div class="lvs ${c}"><b>${n}</b><span>${l}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
  $('leaveSum').innerHTML =
    card(
      stdTotal,
      'Standard quota per year',
      'navy',
      `PL ${S.settings.PL} · SL ${S.settings.SL} · CL ${S.settings.CL}`,
    ) +
    card(used, 'Leave days used this year', 'blue', `up to ${esc(monthLabel(month))}`) +
    card(
      low.length,
      '2 or fewer paid leave days left',
      low.length ? 'amber' : 'green',
      esc(
        low
          .slice(0, 3)
          .map((r) => r.e.name)
          .join(', '),
      ),
    ) +
    card(
      over.length,
      'Over quota (unpaid)',
      over.length ? 'red' : 'green',
      esc(
        over
          .slice(0, 3)
          .map((r) => r.e.name)
          .join(', '),
      ),
    ) +
    (top && top.u.PL + top.u.SL + top.u.CL
      ? card(top.u.PL + top.u.SL + top.u.CL, 'Most leave taken', 'pink', esc(top.e.name))
      : '');
};
