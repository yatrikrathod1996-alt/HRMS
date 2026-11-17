/* ============================================================
   DASHBOARD: separate overview tab. Read-only: it uses
   previewPayroll(), so opening it never changes saved payroll.
   ============================================================ */

document.getElementById('tab-payroll').insertAdjacentHTML(
  'beforebegin',
  `<section id="tab-dashboard" class="hide">
  <div class="dbhead"><div><h2 id="dbHello">Dashboard</h2><p id="dbSub"></p></div>
    <div class="controls"><label class="inline">Month <input type="month" id="dbMonth"></label><span class="seg" id="dbCur" title="Show amounts in"><button type="button" data-c="INR">₹ INR</button><button type="button" data-c="USD">$ USD</button></span><button class="btn primary" type="button" id="dbOpenPay">Open payroll</button></div></div>
  <div id="dbBody"></div><div class="dbtip" id="dbTip" role="status"></div>
</section>`,
);
addTab('dashboard', {
  label: 'Dashboard',
  section: 'tab-dashboard',
  place: ['nav button[data-tab="payroll"]', 'beforebegin'],
  render: () => renderDashboard(),
});
const showDash = (scroll) => showTab('dashboard', scroll);
let dMonth = currentMonth(),
  dTrend = [];

/* ---- helpers ---- */
const ICO = {
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  wallet:
    '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  trend: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
  cake: '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20M7 8v3M12 8v3M17 8v3"/><path d="M7 4h.01M12 4h.01M17 4h.01"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  chev: '<path d="m9 18 6-6-6-6"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h4"/>',
  clip: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14h6M9 18h4"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  build:
    '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k] || ''}</svg>`;
const icon = (k, c) => `<span class="ic c-${c}">${svg(k)}</span>`;
/* amounts are held in INR (or the employee's currency); shown in the display currency chosen with ₹ INR / $ USD,
   converted at that month's USD rate, the same rule the Payroll tab uses */
const cv = (n, m = dMonth, from = 'INR') => {
  n = Number(n) || 0;
  const d = disp();
  if (from === d) return n;
  const r = rateOf(m) || 1;
  return from === 'USD' ? n * r : n / r;
};
const inr0 = (n, m = dMonth, from = 'INR') => {
  const v = cv(n, m, from),
    d = disp();
  return (
    (v < 0 ? '−' : '') +
    (d === 'USD' ? '$' : '₹') +
    Math.round(Math.abs(v)).toLocaleString(d === 'USD' ? 'en-US' : 'en-IN')
  );
};
const short = (n, m = dMonth, from = 'INR') => {
  n = cv(n, m, from);
  const s = disp() === 'USD' ? '$' : '₹',
    a = Math.abs(n),
    t = (v, u) => s + +v.toFixed(Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2) + u;
  if (s === '$') {
    if (a >= 1e6) return t(n / 1e6, 'M');
    if (a >= 1e3) return t(n / 1e3, 'K');
    return s + Math.round(n);
  }
  if (a >= 1e7) return t(n / 1e7, ' Cr');
  if (a >= 1e5) return t(n / 1e5, ' L');
  if (a >= 1e3) return t(n / 1e3, 'K');
  return s + Math.round(n);
};
const pct = (a, b) => (b ? ((a - b) / b) * 100 : null);
const initials = (n) =>
  String(n || '?')
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase();
// colour classes avc0-avc4 (not 'a4', which is the A4 letter page style)
const avCls = (n) => 'avc' + ([...String(n || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 5);
const avatar = (e) => `<span class="av ${avCls(e.name)}">${esc(initials(e.name))}</span>`;
const monYr = (d) => d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
const whenTxt = (n) =>
  n === 0
    ? 'Today'
    : n === 1
      ? 'Tomorrow'
      : n === -1
        ? 'Yesterday'
        : n < 0
          ? `${-n} days ago`
          : `In ${n} days`;
function nextOcc(isoStr, from) {
  // next yearly occurrence on/after `from` (29 Feb → 28 Feb in other years)
  const b = parseISO(isoStr);
  if (!b) return null;
  const y = from.getFullYear();
  const at = (yy) => {
    const leap = (yy % 4 === 0 && yy % 100 !== 0) || yy % 400 === 0;
    return new Date(yy, b.getMonth(), b.getMonth() === 1 && b.getDate() === 29 && !leap ? 28 : b.getDate());
  };
  let d = at(y);
  if (d < dOnly(from)) d = at(y + 1);
  return { date: d, years: d.getFullYear() - b.getFullYear(), days: dayDiff(d, from) };
}
function lastOcc(isoStr, from) {
  const b = parseISO(isoStr);
  if (!b) return null;
  const n = nextOcc(isoStr, from);
  if (n.days === 0) return n;
  const d = new Date(n.date.getFullYear() - 1, n.date.getMonth(), n.date.getDate());
  return { date: d, years: d.getFullYear() - b.getFullYear(), days: dayDiff(d, from) };
}
/* everyone's next yearly date (birthday / joining anniversary): upcoming first, then the last 7 days */
function withYears(list, field, from, minY) {
  const out = list
    .map((e) => {
      const n = nextOcc(e[field], from);
      if (!n) return null;
      const l = lastOcc(e[field], from);
      const use = l && l.days < 0 && l.days >= -7 && l.years >= Math.max(minY, 0) ? l : n;
      return { e, d: use.date, n: use.days, y: use.years };
    })
    .filter((x) => x && x.y >= minY);
  return [
    ...out.filter((x) => x.n >= 0).sort((a, b) => a.n - b.n),
    ...out.filter((x) => x.n < 0).sort((a, b) => b.n - a.n),
  ];
}
const activeNow = () => S.employees.filter((e) => e.status === 'Active');
function monthRows(m) {
  return empsIn(m)
    .map((e) => {
      try {
        return previewPayroll(e, m);
      } catch (err) {
        console.warn('dashboard', e.id, err);
        return null;
      }
    })
    .filter(Boolean);
}
function monthSum(m, rows) {
  /* per person: salary paid (after unpaid days), incentive, performance (bonus + fixed variable), reimbursement,
     other company cost (accommodation). Total spend = all of these. INR. */
  const s = {
    m,
    n: rows.length,
    net: 0,
    gross: 0,
    ctc: 0,
    salary: 0,
    inc: 0,
    perf: 0,
    reimb: 0,
    other: 0,
    spend: 0,
    lop: 0,
    ded: 0,
    paid: 0,
    check: 0,
    incN: 0,
    perfN: 0,
    reimbN: 0,
  };
  rows.forEach((r) => {
    const w = r.row,
      sal = r2(r2(r.sal * r.fx) - r2(r.lop * r.fx)),
      inc = r2(Number(w.inc || 0)),
      perf = r2(Number(w.bonus || 0) + r2(r.vari * r.fx)),
      reimb = r2(Number(w.reimb || 0)),
      other = r2((r.compliance.employerTotal || 0) + (r.ctc.accommodation || 0));
    s.net += r.net;
    s.gross += r.earnINR;
    s.ctc += r.ctc.total;
    s.salary += sal;
    s.inc += inc;
    s.perf += perf;
    s.reimb += reimb;
    s.other += other;
    s.spend += sal + inc + perf + reimb + other;
    s.lop += r2(r.lop * r.fx);
    s.ded += r.dedINR;
    if (inc) s.incN++;
    if (perf) s.perfN++;
    if (reimb) s.reimbN++;
    if (w.status === 'Paid') s.paid++;
    if (r.check !== 'OK') s.check++;
  });
  ['net', 'gross', 'ctc', 'salary', 'inc', 'perf', 'reimb', 'other', 'spend', 'lop', 'ded'].forEach(
    (k) => (s[k] = r2(s[k])),
  );
  return s;
}
const nameBtn = (e) => `<button type="button" class="nm" data-prof="${esc(e.id)}">${esc(e.name)}</button>`;
const prevMonth = (m) => {
  const [y, mo] = ym(m);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`;
};
/* active employees whose 3-month probation ends (or ended) and who have no confirmation letter yet;
   n = days from today (negative = already over). Used by the Dashboard and by Tasks. */
function probationEnds(today) {
  return activeNow()
    .map((e) => {
      const j = parseISO(e.joining),
        pe = j && parseISO(addMonthsISO(e.joining, 3));
      return pe && { e, j, d: pe, n: dayDiff(pe, today) };
    })
    .filter((x) => x && !hasConfirmation(x.e) && (x.e.type === 'Probation' || dayDiff(today, x.j) <= 270))
    .sort((a, b) => a.n - b.n);
}
const hasConfirmation = (e) =>
  (S.docs || []).some(
    (d) => d.type === 'confirmation' && (d.empId === e.id || (d.name && d.name === e.name)),
  );
const card = (title, ic, c, more, body, cls = '') =>
  `<div class="dbc ${cls}"><div class="ch"><h3>${ic ? icon(ic, c) : ''}${title}</h3>${more || ''}</div>${body}</div>`;

/* ---- render ---- */
/* what the month chart, tiles and department table can show */
const taskList = () => {
  if (!Array.isArray(S.tasks)) S.tasks = [];
  return S.tasks;
};

/* the dashboard body is drawn by renderDashboard() in 31-dashboard-v2.js (the older layout was removed) */

/* ---- interactions ---- */
$('dbCur').addEventListener('click', (ev) => {
  const c = ev.target.closest('button') && ev.target.closest('button').dataset.c;
  if (!c || c === disp()) return;
  S.settings.disp = c;
  save();
  renderDashboard();
});
$('dbMonth').addEventListener('change', (ev) => {
  if (/^\d{4}-\d{2}$/.test(ev.target.value)) {
    dMonth = ev.target.value;
    renderDashboard();
  }
});
const goPayroll = () => {
  month = dMonth;
  document.querySelector('nav button[data-tab="payroll"]').click();
};
$('dbOpenPay').addEventListener('click', goPayroll);
function openLetterFor(type, emp) {
  showDocs(true);
  dType = type;
  dManual = false;
  renderDocuments();
  const sel = $('dEmp');
  sel.value = emp;
  sel.dispatchEvent(new Event('change'));
}
function dbAct(t) {
  if (t.dataset.ta || t.dataset.tgo) {
    taskAction(t, renderDashboard);
    return;
  }
  if (t.dataset.go === 'holidays') {
    showHolidays(true);
    return;
  }
  if (t.dataset.go === 'tasks') {
    showTasks(true);
    if (t.dataset.focus) setTimeout(() => $('tkText').focus(), 50);
    return;
  }
  if (t.dataset.prof) {
    openEmployeeProfile(t.dataset.prof);
    return;
  }
  if (t.dataset.tm) {
    dMonth = t.dataset.tm;
    $('dbTip').style.display = 'none';
    renderDashboard();
    return;
  }
  if (t.dataset.incfor) {
    showInc(true);
    resetIncForm();
    $('iEmp').value = t.dataset.incfor;
    $('iEmp').dispatchEvent(new Event('change'));
    return;
  }
  if (t.dataset.letter) {
    openLetterFor(t.dataset.letter, t.dataset.emp);
    return;
  }
  if (t.dataset.docopen !== undefined) {
    showDocs(true);
    const b2 = $('dLog').querySelector(`[data-open="${t.dataset.docopen}"]`);
    if (b2) b2.click();
    return;
  }
  const g = t.dataset.go;
  if (!g) return;
  if (g === 'payroll') goPayroll();
  else if (g === 'inc') showInc(true);
  else if (g === 'docs') showDocs(true);
  else if (g === 'confirm') openLetterFor('confirmation', t.dataset.emp);
  else {
    if (g === 'attendance') month = dMonth;
    const b = document.querySelector(`nav button[data-tab="${g}"]`);
    if (b) b.click();
  }
}
$('dbBody').addEventListener('click', (ev) => {
  if (ev.target.closest('label,summary')) return;
  const t = ev.target.closest('button,[data-go],[data-dexp]');
  if (t) dbAct(t);
});
$('dbBody').addEventListener('keydown', (ev) => {
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('[role=button][data-go],tr[data-dexp]')) {
    ev.preventDefault();
    dbAct(ev.target);
  }
});
$('dbBody').addEventListener('change', (ev) => ppDate(ev, renderDashboard));
