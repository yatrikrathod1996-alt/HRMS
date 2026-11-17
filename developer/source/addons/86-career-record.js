/* ============================================================
   CAREER RECORD: one page per employee with every month we have
   on record: salary and increments, attendance, leave, incentives,
   performance reviews and net pay, year by year.
   Months in the HRMS come from its own payroll and attendance.
   May–December 2025 come from the 2025 attendance sheets (read-only,
   below). Nothing older exists in the HRMS or the time sheet.
   ============================================================ */
// per month, per employee: sal = salary, cur, paid = total paid, var = variable, ded = deduction,
// day codes P/WO/WFH/H/PL/SL/CL/HD/A/UP, X = blank days (before joining / after leaving), note
const SHEET_HISTORY_2025 = {}; // (the real HRMS keeps the 2025 attendance-sheet history here)
const CR_RATINGS = [
  'Outstanding',
  'Exceeds expectations',
  'Meets expectations',
  'Needs improvement',
  'Unsatisfactory',
];
let crTab = 'details',
  crLastId = null;

const crMoney = (n, cur = 'INR') =>
  (cur === 'USD' ? '$' : '₹') +
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const crShort = (m) => {
  const [y, mo] = ym(m);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'short' }) + ' ' + String(y).slice(2);
};
const crReviews = () => {
  if (!Array.isArray(S.reviews)) S.reviews = [];
  // ignore anything malformed (e.g. from an edited backup) instead of breaking the profile
  return S.reviews.filter(
    (r) => r && typeof r === 'object' && r.id && r.empId && /^\d{4}-\d{2}-\d{2}$/.test(String(r.date)),
  );
};

/* every month on record for one employee, oldest first */
const paidINR = (r) =>
  r.row.status === 'Paid' && r.row.paidLegacy != null && isFinite(Number(r.row.paidLegacy))
    ? r2(Number(r.row.paidLegacy))
    : null;

function careerMonths(e) {
  const list = [],
    seen = new Set(),
    upto = todayISO().slice(0, 7);
  const hrms = new Set(
    [...Object.keys(S.payroll || {}), ...Object.keys(S.attendance || {})].filter(
      (m) =>
        /^\d{4}-\d{2}$/.test(m) &&
        // the month in progress is left out until it is paid: its later days are still pre-filled
        (m < upto || S.payroll[m]?.rows?.[e.id]?.status === 'Paid') &&
        ((S.attendance[m] || {})[e.id] || S.payroll[m]?.rows?.[e.id]),
    ),
  );
  [...hrms].sort().forEach((m) => {
    const r = previewPayroll(e, m),
      c = r.c,
      row = r.row,
      [yy, mm] = ym(m);
    const outside = (r.outsideDays || 0) + (c.unmarked || 0);
    // July and August 2026 came from HR sheets that marked Saturdays and Sundays as P (pay is the same either way).
    // For attendance figures a month with no weekly off counts those weekend P days as weekends, not as presence.
    const att = (S.attendance[m] || {})[e.id] || [];
    const wkP = c.WO
      ? 0
      : att.filter((code, i) => code === 'P' && [0, 6].includes(new Date(yy, mm - 1, i + 1).getDay())).length;
    const usd = r.currency === 'USD';
    list.push({
      m,
      src: 'HRMS',
      cur: r.currency,
      sal: r.sal,
      salINR: r2(r.sal * r.fx),
      d: r.d,
      P: c.P - wkP + c.WFH,
      WFH: c.WFH,
      WO: c.WO + wkP,
      wkP,
      H: c.H,
      PL: c.PL,
      SL: c.SL,
      CL: c.CL,
      HD: c.HD,
      A: c.A - (r.outsideDays || 0),
      UP: c.UP,
      work: Math.max(0, r.d - c.WO - wkP - c.H - outside),
      lopDays: r.lopDays - (r.outsideDays || 0),
      vari: r.vari,
      inc: Number(row.inc || 0),
      bonus: Number(row.bonus || 0),
      reimb: Number(row.reimb || 0),
      incItems: Array.isArray(row.incItems) ? row.incItems : [],
      // a Paid month imported from the HR sheet shows what was actually paid (the payroll screen shows the difference)
      net: paidINR(r) != null ? (usd ? r2(paidINR(r) / r.fx) : paidINR(r)) : usd ? r2(r.net / r.fx) : r.net,
      netINR: paidINR(r) ?? r.net,
      calcDiff: paidINR(r) != null && Math.abs(paidINR(r) - r.net) > 1 ? r2(r.net) : null,
      status: row.status || 'Pending',
      note: /^Imported from /.test(row.reason || '') ? '' : row.reason || '', // hide the system's import label
      fx: r.fx,
      yy,
      mm,
    });
    seen.add(m);
  });
  Object.keys(SHEET_HISTORY_2025)
    .filter((m) => !seen.has(m) && SHEET_HISTORY_2025[m][e.id])
    .forEach((m) => {
      const h = SHEET_HISTORY_2025[m][e.id],
        g = (k) => Number(h[k] || 0),
        fx = h.cur === 'USD' ? Number(S.settings.fx) || 1 : 1,
        [yy, mm] = ym(m);
      list.push({
        m,
        src: 'Time sheet',
        cur: h.cur,
        sal: g('sal'),
        salINR: r2(g('sal') * fx),
        d: h.days,
        P: g('P') + g('WFH'),
        WFH: g('WFH'),
        WO: g('WO'),
        H: g('H'),
        PL: g('PL'),
        SL: g('SL'),
        CL: g('CL'),
        HD: g('HD'),
        A: g('A'),
        UP: g('UP'),
        work: Math.max(0, h.days - g('WO') - g('H') - g('X')),
        lopDays: g('A') + g('UP') + 0.5 * g('HD'),
        vari: g('var'),
        inc: 0,
        bonus: 0,
        reimb: 0,
        incItems: [],
        net: h.paid != null ? Number(h.paid) : null,
        netINR: h.paid != null ? r2(Number(h.paid) * fx) : null,
        status: 'Paid (sheet)',
        note: h.note || '',
        fx,
        yy,
        mm,
      });
    });
  return list.sort((a, b) => a.m.localeCompare(b.m));
}

/* salary changes: recorded increments plus month-to-month changes seen in the records */
function careerChanges(e, months) {
  const out = [],
    incs = (S.increments || []).filter((r) => r.empId === e.id);
  for (let i = 1; i < months.length; i++) {
    const a = months[i - 1],
      b = months[i];
    if (a.cur === b.cur && a.sal && b.sal && Math.abs(a.sal - b.sal) >= 1)
      out.push({
        m: b.m,
        from: a.sal,
        to: b.sal,
        cur: b.cur,
        src: 'Seen in ' + (b.src === 'HRMS' ? 'payroll' : 'time sheet'),
      });
  }
  incs.forEach((r) => {
    const m = String(r.date || '').slice(0, 7),
      hit = out.find((x) => x.m === m || (x.from === Number(r.oldSalary) && x.to === Number(r.newSalary)));
    const rec = {
      m,
      from: Number(r.oldSalary),
      to: Number(r.newSalary),
      cur: e.currency,
      src: 'Increment',
      reason: r.reason || '',
      date: r.date,
    };
    if (hit) Object.assign(hit, rec);
    else out.push(rec);
  });
  return out.sort((a, b) => a.m.localeCompare(b.m));
}

function careerSpan(e, first) {
  const start = e.joining || (first ? first + '-01' : '');
  if (!start) return { text: '—', since: '' };
  const s = new Date(start + 'T00:00:00'),
    end = e.lastDay && e.status === 'Inactive' ? new Date(e.lastDay + 'T00:00:00') : new Date();
  let mons = (end.getFullYear() - s.getFullYear()) * 12 + end.getMonth() - s.getMonth();
  if (end.getDate() < s.getDate()) mons--;
  mons = Math.max(0, mons);
  const y = Math.floor(mons / 12),
    mo = mons % 12;
  return {
    text:
      (y ? y + (y === 1 ? ' yr ' : ' yrs ') : '') + (mo || !y ? mo + (mo === 1 ? ' month' : ' months') : ''),
    since: (e.joining ? 'Joined ' : 'On record since ') + fmtLong(start),
  };
}

const crSum = (arr, k) => r2(arr.reduce((s, x) => s + Number(x[k] || 0), 0));
const crRate = (arr) => {
  const work = crSum(arr, 'work'),
    pres = crSum(arr, 'P') + 0.5 * crSum(arr, 'HD');
  return work ? Math.round((Math.min(pres, work) / work) * 1000) / 10 : null;
};

function careerHtml(e) {
  const months = careerMonths(e),
    changes = careerChanges(e, months),
    reviews = crReviews()
      .filter((r) => r.empId === e.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  if (!months.length)
    return `<div class="cr-empty">No salary or attendance records for ${esc(e.name)} yet. They appear here month by month once attendance or payroll is saved.</div>${crReviewCard(e, reviews)}`;
  const first = months[0],
    last = months[months.length - 1],
    span = careerSpan(e, first.m);
  // growth: compare the first and the latest salary recorded in the person's current pay currency
  const sameCur = months.filter((x) => x.cur === e.currency && x.sal);
  const g0 = sameCur[0],
    gN = sameCur[sameCur.length - 1];
  const growth = g0 && gN && g0.sal ? Math.round(((gN.sal - g0.sal) / g0.sal) * 1000) / 10 : null;
  const ups = changes.filter((c) => c.to > c.from).length;
  const thisYear = String(new Date().getFullYear()),
    yrMonths = months.filter((x) => String(x.yy) === thisYear && x.src === 'HRMS');
  const q = quota(e),
    nowM = todayISO().slice(0, 7),
    // same count as Leave balances: everything up to and including this month
    used =
      yrMonths.length || (S.attendance[nowM] || {})[e.id] ? usedThrough(e, nowM) : { PL: 0, SL: 0, CL: 0 };
  const incTotal = crSum(months, 'inc') + crSum(months, 'bonus');
  const rate = crRate(months);
  const tiles = [
    e.joining
      ? ['With the company', span.text, span.since]
      : ['On record for', span.text + '+', 'Joining date not added (Edit details)'],
    [
      'Salary now',
      crMoney(e.salary, e.currency) + ' / month',
      growth != null && g0 !== gN
        ? `${growth >= 0 ? '+' : ''}${growth}% since ${monthLabel(g0.m)} (${crMoney(g0.sal, g0.cur)})`
        : 'No change on record',
    ],
    [
      'Salary changes',
      String(changes.length),
      ups ? `${ups} increase${ups === 1 ? '' : 's'}` : 'None on record',
    ],
    [
      'Attendance',
      rate == null ? '—' : rate + '%',
      `present on working days, ${monthLabel(first.m)} – ${monthLabel(last.m)}`,
    ],
    [
      `Leave in ${thisYear}`,
      `${used.PL + used.SL + used.CL} of ${q.PL + q.SL + q.CL} days`,
      `PL ${used.PL}/${q.PL} · SL ${used.SL}/${q.SL} · CL ${used.CL}/${q.CL}`,
    ],
    [
      'Incentives & bonus',
      crMoney(incTotal),
      reviews.length ? `Last review: ${reviews[0].rating}` : 'No performance review yet',
    ],
  ];
  // salary chart: one bar per month, in ₹ (US$ converted at that month's rate)
  const max = Math.max(...months.map((x) => x.salINR || 0), 1),
    chMonths = new Set(changes.map((c) => c.m)),
    mixed = months.some((x) => x.cur === 'USD');
  const bars = months
    .map((x) => {
      const h = Math.max(4, Math.round(((x.salINR || 0) / max) * 100)),
        ch = changes.find((c) => c.m === x.m),
        cls = ch ? (ch.to > ch.from ? ' up' : ' down') : '';
      return `<div class="cr-col${cls}" title="${esc(monthLabel(x.m))}${ch ? (ch.to > ch.from ? ': salary increase' : ': salary decrease') : ''}"><span class="cr-bar" style="height:${h}%">${ch ? `<em>${ch.to > ch.from ? '↑' : '↓'}</em>` : ''}</span><small>${x.mm === 1 || x === first ? crShort(x.m) : esc(crShort(x.m).slice(0, 1))}</small></div>`;
    })
    .join('');
  const changeList = changes.length
    ? `<ol class="cr-changes">${changes
        .map((c) => {
          const pct = c.from ? Math.round(((c.to - c.from) / c.from) * 1000) / 10 : 0;
          return `<li class="${c.to > c.from ? 'up' : 'down'}"><time>${esc(c.date ? fmtLong(c.date) : monthLabel(c.m))}</time><b>${esc(crMoney(c.from, c.cur))} → ${esc(crMoney(c.to, c.cur))}</b><span class="pill ${c.to > c.from ? 'ok' : 'bad'}">${pct >= 0 ? '+' : ''}${pct}%</span><small>${esc(c.src)}${c.reason ? ' · ' + esc(c.reason) : ''}</small></li>`;
        })
        .join('')}</ol>`
    : '<p class="idc">The salary has not changed in the records.</p>';
  // per-year sections, newest first
  const years = [...new Set(months.map((x) => x.yy))].sort((a, b) => b - a);
  const yearHtml = years
    .map((y, yi) => {
      const ms = months.filter((x) => x.yy === y),
        inHrms = ms.some((x) => x.src === 'HRMS');
      const lv = { PL: crSum(ms, 'PL'), SL: crSum(ms, 'SL'), CL: crSum(ms, 'CL') };
      const nets = {};
      ms.forEach((x) => {
        if (x.net != null) nets[x.cur] = r2((nets[x.cur] || 0) + x.net);
      });
      const yrRate = crRate(ms),
        yrInc = crSum(ms, 'inc') + crSum(ms, 'bonus'),
        yrCh = changes.filter((c) => c.m.startsWith(y + '-'));
      const yrRev = reviews.filter((r) => r.date.startsWith(y + '-'));
      const rows = ms
        .slice()
        .reverse()
        .map((x) => {
          const ch = yrCh.find((c) => c.m === x.m);
          const lvTxt =
            ['PL', 'SL', 'CL']
              .filter((k) => x[k])
              .map((k) => `${k} ${x[k]}`)
              .join(' · ') || '—';
          const off =
            [x.A ? `A ${x.A}` : '', x.UP ? `UP ${x.UP}` : '', x.HD ? `½ ${x.HD}` : '']
              .filter(Boolean)
              .join(' · ') || '—';
          const st =
            x.status === 'Paid' || x.status === 'Paid (sheet)'
              ? 'ok'
              : x.status === 'Hold'
                ? 'bad'
                : 'neutral';
          return `<tr><td><b>${esc(monthLabel(x.m))}</b>${x.src === 'HRMS' ? '' : '<small>time sheet</small>'}</td>
            <td class="num">${esc(crMoney(x.sal, x.cur))}${ch ? `<small class="${ch.to > ch.from ? 'cr-up' : 'cr-down'}">${ch.to > ch.from ? '↑' : '↓'} from ${esc(crMoney(ch.from, ch.cur))}</small>` : ''}</td>
            <td class="num">${x.P}<small>of ${x.work}</small></td><td>${lvTxt}</td><td>${off}</td>
            <td class="num">${x.inc || x.bonus ? esc(crMoney(x.inc + x.bonus)) : '—'}${
              x.incItems.length
                ? `<small>${esc(
                    x.incItems
                      .map((i) => i.type || i.name || 'Incentive')
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .join(', '),
                  )}</small>`
                : ''
            }</td>
            <td class="num">${x.net == null ? '—' : esc(crMoney(x.net, x.cur))}${x.calcDiff != null ? '<small>as paid (sheet)</small>' : ''}</td>
            <td><span class="pill ${st}">${esc(x.status)}</span>${x.note ? `<small class="cr-note">${esc(x.note)}</small>` : ''}</td></tr>`;
        })
        .join('');
      const quotaTxt =
        inHrms && String(y) === thisYear ? ` (quota PL ${q.PL} · SL ${q.SL} · CL ${q.CL})` : '';
      return `<details class="cr-year" ${yi === 0 ? 'open' : ''}><summary><b>${y}</b><span>${ms.length} month${ms.length === 1 ? '' : 's'} · attendance ${yrRate == null ? '—' : yrRate + '%'} · leave PL ${lv.PL} · SL ${lv.SL} · CL ${lv.CL}${quotaTxt} · ${yrCh.length ? yrCh.length + ' salary change' + (yrCh.length === 1 ? '' : 's') : 'no salary change'}${yrInc ? ' · incentives ' + crMoney(yrInc) : ''} · net paid ${
        Object.entries(nets)
          .map(([c, v]) => crMoney(v, c))
          .join(' + ') || '—'
      }${yrRev.length ? ' · review: ' + esc(yrRev[0].rating) : ''}</span></summary>
        <div class="tablewrap"><table class="cr-table"><thead><tr><th>Month</th><th class="num">Salary</th><th class="num">Present</th><th>Paid leave</th><th>Absent / unpaid / half</th><th class="num">Incentive + bonus</th><th class="num">Net paid</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
    })
    .join('');
  return `<div class="cr-head"><div><b>Career record</b><span>${esc(monthLabel(first.m))} – ${esc(monthLabel(last.m))} · ${months.length} months on record</span></div><button type="button" class="btn" data-cr-excel="${esc(e.id)}">Download Excel</button></div>
    <div class="cr-tiles">${tiles.map(([k, v, s]) => `<div class="cr-tile"><span>${esc(k)}</span><b>${esc(v)}</b><small>${esc(s)}</small></div>`).join('')}</div>
    <div class="cr-grid">
      <section class="profile-card"><h4>Salary over time <span class="idc">${mixed ? 'in ₹, US$ converted' : 'per month'}</span></h4><div class="cr-chart" role="img" aria-label="Monthly salary from ${esc(monthLabel(first.m))} to ${esc(monthLabel(last.m))}">${bars}</div><div class="cr-legend"><span class="up">↑ increase</span><span class="down">↓ decrease</span></div></section>
      <section class="profile-card"><h4>Increments & salary changes <span class="idc">${changes.length}</span></h4>${changeList}</section>
    </div>
    ${crReviewCard(e, reviews)}
    <h4 class="cr-sub">Year by year</h4>${yearHtml}
    <p class="cr-foot">Months from ${first.src === 'HRMS' ? 'the HRMS' : 'May 2025'} onward are on record. ${months.some((x) => x.src !== 'HRMS') ? 'May–December 2025 come from the 2025 attendance sheets. ' : ''}Earlier months are not in the HRMS or the time sheet, so they can't be shown. ${months.some((x) => x.wkP) ? 'In months where the HR sheet marked weekends as P (July and August 2026), weekends are counted as weekends here; pay is not affected. ' : ''}Present counts office and WFH days out of working days (weekends, holidays and days before joining left out).</p>`;
}

function crReviewCard(e, reviews) {
  return `<section class="profile-card profile-wide cr-reviews"><h4>Performance reviews <span class="idc">${reviews.length}</span></h4>
    ${reviews.length ? `<ol class="cr-rev">${reviews.map((r) => `<li><time>${esc(fmtLong(r.date))}</time><span class="pill ${CR_RATINGS.indexOf(r.rating) < 2 ? 'ok' : CR_RATINGS.indexOf(r.rating) === 2 ? 'neutral' : 'bad'}">${esc(r.rating)}</span><div>${esc(r.note || '')}</div><button type="button" class="linkish" data-cr-del="${esc(r.id)}">Remove</button></li>`).join('')}</ol>` : '<p class="idc">No reviews yet. Add one after each appraisal so it shows here year by year.</p>'}
    <form class="cr-form" data-cr-form="${esc(e.id)}"><label>Date<input type="date" name="date" value="${todayISO()}" required></label><label>Rating<select name="rating">${CR_RATINGS.map((r) => `<option${r === 'Meets expectations' ? ' selected' : ''}>${r}</option>`).join('')}</select></label><label class="cr-wide">Notes<input name="note" maxlength="400" placeholder="e.g. Annual review: strong delivery on the API project"></label><button type="submit" class="btn primary">+ Add review</button></form></section>`;
}

function careerExcel(e) {
  const months = careerMonths(e),
    changes = careerChanges(e, months);
  const rows = [
    [
      'Month',
      'Source',
      'Currency',
      'Salary',
      'Working days',
      'Present (incl. WFH)',
      'WFH',
      'PL',
      'SL',
      'CL',
      'Half days',
      'Absent',
      'Unpaid leave',
      'Variable',
      'Incentive',
      'Bonus',
      'Reimbursement',
      'Net paid',
      'Status',
      'Note',
    ],
    ...months.map((x) => [
      monthLabel(x.m),
      x.src,
      x.cur,
      x.sal,
      x.work,
      x.P,
      x.WFH,
      x.PL,
      x.SL,
      x.CL,
      x.HD,
      x.A,
      x.UP,
      x.vari,
      x.inc,
      x.bonus,
      x.reimb,
      x.net,
      x.status,
      x.note,
    ]),
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    sheet(rows, [16, 11, 9, 11, 9, 10, 6, 5, 5, 5, 6, 7, 7, 9, 10, 9, 11, 12, 12, 40]),
    'Months',
  );
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      [
        ['Month', 'From', 'To', 'Currency', 'Change %', 'Source', 'Reason'],
        ...changes.map((c) => [
          monthLabel(c.m),
          c.from,
          c.to,
          c.cur,
          c.from ? Math.round(((c.to - c.from) / c.from) * 1000) / 10 : '',
          c.src,
          c.reason || '',
        ]),
      ],
      [16, 11, 11, 9, 9, 18, 40],
    ),
    'Salary changes',
  );
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      [
        ['Date', 'Rating', 'Notes'],
        ...crReviews()
          .filter((r) => r.empId === e.id)
          .map((r) => [r.date, r.rating, r.note || '']),
      ],
      [12, 22, 60],
    ),
    'Reviews',
  );
  XLSX.writeFile(wb, `${e.id} ${e.name} career record.xlsx`.replace(/[\\/:*?"<>|]/g, ''));
}

const crOrigProfile = renderEmployeeProfile;
renderEmployeeProfile = function () {
  crOrigProfile();
  const e = S.employees.find((x) => x.id === selectedProfileId),
    body = document.getElementById('profileBody');
  if (!e || !body) return;
  if (crLastId !== e.id) crTab = 'details';
  crLastId = e.id;
  const details = document.createElement('div');
  details.className = 'cr-pane';
  details.dataset.pane = 'details';
  while (body.firstChild) details.appendChild(body.firstChild);
  const career = document.createElement('div');
  career.className = 'cr-pane';
  career.dataset.pane = 'career';
  career.innerHTML = careerHtml(e);
  body.insertAdjacentHTML(
    'afterbegin',
    `<div class="cr-tabs" role="tablist"><button type="button" role="tab" data-cr-tab="details">Details</button><button type="button" role="tab" data-cr-tab="career">Career record</button></div>`,
  );
  body.append(details, career);
  crShowTab(crTab);
};
function crShowTab(t) {
  crTab = t;
  document.querySelectorAll('#profileBody [data-cr-tab]').forEach((b) => {
    b.classList.toggle('on', b.dataset.crTab === t);
    b.setAttribute('aria-selected', String(b.dataset.crTab === t));
  });
  document.querySelectorAll('#profileBody > .cr-pane').forEach((p) => (p.hidden = p.dataset.pane !== t));
}
$('profileBody').addEventListener('click', (ev) => {
  const tab = ev.target.closest('[data-cr-tab]');
  if (tab) return crShowTab(tab.dataset.crTab);
  const x = ev.target.closest('[data-cr-excel]');
  if (x) {
    const e = S.employees.find((y) => y.id === x.dataset.crExcel);
    if (e) careerExcel(e);
    return;
  }
  const del = ev.target.closest('[data-cr-del]');
  if (del) {
    if (!del.classList.contains('confirm')) {
      del.classList.add('confirm');
      del.textContent = 'Click again to remove';
      setTimeout(() => {
        if (del.isConnected) {
          del.classList.remove('confirm');
          del.textContent = 'Remove';
        }
      }, 4000);
      return;
    }
    S.reviews = (S.reviews || []).filter((r) => !r || r.id !== del.dataset.crDel);
    save();
    renderEmployeeProfile();
  }
});
$('profileBody').addEventListener('submit', (ev) => {
  const f = ev.target.closest('[data-cr-form]');
  if (!f) return;
  ev.preventDefault();
  const date = f.elements.date.value;
  if (!date) return;
  crReviews(); // makes sure S.reviews is a list
  S.reviews.push({
    id: 'rv' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    empId: f.dataset.crForm,
    date,
    rating: f.elements.rating.value,
    note: f.elements.note.value.trim(),
  });
  save();
  renderEmployeeProfile();
});
window.HRMS_CAREER = { careerMonths, careerChanges, sheet: SHEET_HISTORY_2025 }; // used by the tests

HIST_ICON.review = '☆';
const crOrigHistEvents = histEvents;
histEvents = function (e) {
  const list = crOrigHistEvents(e);
  crReviews()
    .filter((r) => r.empId === e.id)
    .forEach((r) =>
      list.push({
        date: r.date,
        kind: 'review',
        title: 'Performance review: ' + r.rating,
        sub: r.note || '',
      }),
    );
  return list.sort((a, b) => b.date.localeCompare(a.date));
};
