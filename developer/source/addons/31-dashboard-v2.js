/* Dashboard layout based on the "HR Management Software (HRMS)" Dribbble shot:
   KPI cards for today, attendance donut, payroll trend, upcoming events,
   leave / payroll summaries, pending tasks, quick access, department headcount
   and recent activity. Replaces the older dashboard body; header and controls stay. */

let dTrendKey = 'net',
  filterFromDashboard = false;
const LV = ['PL', 'SL', 'CL'];
const pctOf = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const monLbl = (m) => {
  const [y, mo] = ym(m);
  return (
    new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'short' }).slice(0, 3) +
    " '" +
    String(y).slice(2)
  );
};
const dd = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/* attendance code of one employee on one date ('' when the month has no sheet yet) */
function codeOn(e, d) {
  const m = iso(d).slice(0, 7);
  if (!empsIn(m).some((x) => x.id === e.id)) return '';
  return attFor(m, e)[d.getDate() - 1] || '';
}

function todayCounts(act, today) {
  const t = { present: 0, leave: 0, absent: 0, half: 0, off: 0, wfh: 0 };
  act.forEach((e) => {
    const c = codeOn(e, today);
    if (c === 'P') t.present++;
    else if (c === 'WFH') (t.present++, t.wfh++);
    else if (c === 'HD') (t.present++, t.half++);
    else if (LV.includes(c) || c === 'UP') t.leave++;
    else if (c === 'A') t.absent++;
    else t.off++;
  });
  return t;
}

/* each employee counted once for the month (the current month up to today):
   absent if any absent / unpaid day, else on leave if any leave, else half day, else full attendance */
function monthAttendance(m, rows, today) {
  const cm = currentMonth(),
    upto = m === cm ? today.getDate() : m > cm ? 0 : daysIn(m),
    s = { present: 0, leave: 0, absent: 0, half: 0 };
  rows.forEach((r) => {
    const [yy, mm] = ym(m),
      a = attFor(m, r.e)
        .slice(0, upto)
        .map((c, i) => (workingOn(r.e, iso(new Date(yy, mm - 1, i + 1))) ? c : '')); // days before joining don't count
    if (a.some((c) => c === 'A' || c === 'UP')) s.absent++;
    else if (a.some((c) => LV.includes(c))) s.leave++;
    else if (a.includes('HD')) s.half++;
    else s.present++;
  });
  return s;
}

function upcomingEvents(act, today) {
  const ev = [],
    inN = (n) => n >= 0 && n <= 30;
  withYears(act, 'dob', today, 0)
    .filter((x) => inN(x.n))
    .forEach((x) => ev.push({ d: x.d, n: x.n, k: 'bday', t: 'Birthday', s: x.e.name, e: x.e }));
  withYears(act, 'joining', today, 1)
    .filter((x) => inN(x.n))
    .forEach((x) =>
      ev.push({
        d: x.d,
        n: x.n,
        k: 'anniv',
        t: `Work anniversary · ${x.y} yr${x.y > 1 ? 's' : ''}`,
        s: x.e.name,
        e: x.e,
      }),
    );
  probationEnds(today)
    .filter((x) => x.n <= 30 && x.n >= -60)
    .forEach((x) =>
      ev.push({
        d: x.d,
        n: Math.max(x.n, 0),
        late: x.n < 0 ? -x.n : 0,
        k: 'prob',
        t: x.n < 0 ? 'Confirmation letter overdue' : 'Probation ends',
        s: x.e.name,
        e: x.e,
        go: 'confirm',
      }),
    );
  (S.increments || []).forEach((r) => {
    const d = parseISO(r.date),
      e = S.employees.find((x) => x.id === r.empId);
    if (d && e && inN(dayDiff(d, today)))
      ev.push({ d, n: dayDiff(d, today), k: 'inc', t: 'Increment', s: e.name, e });
  });
  holSorted()
    .filter((h) => h.type !== 'Optional')
    .forEach((h) => {
      const d = parseISO(h.date),
        n = d ? dayDiff(d, today) : -1;
      if (inN(n)) ev.push({ d, n, k: 'hol', t: 'Holiday', s: h.name, go: 'holidays' });
    });
  const cm = currentMonth(),
    P = (S.payroll || {})[cm],
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0),
    allPaid = P && empsIn(cm).every((e) => ((P.rows || {})[e.id] || {}).status === 'Paid');
  if (!allPaid)
    ev.push({
      d: end,
      n: dayDiff(end, today),
      k: 'pay',
      t: 'Payroll processing',
      s: `${monthLabel(cm)} salaries`,
      go: 'payroll',
    });
  return ev.sort((a, b) => a.n - b.n || a.t.localeCompare(b.t));
}

function recentActivity() {
  const out = [];
  (S.docs || []).forEach((d) =>
    out.push({ at: d.at, k: 'doc', t: `${(DOCS[d.type] || {}).label || d.type} made for ${d.name || '—'}` }),
  );
  (S.increments || []).forEach((r) => {
    const e = S.employees.find((x) => x.id === r.empId);
    if (e)
      out.push({
        at: parseISO(r.date)?.getTime() || r.createdAt,
        k: 'inc',
        t: `Increment for ${e.name}: ${amt0(r.oldSalary, e.currency)} → ${amt0(r.newSalary, e.currency)}`,
      });
  });
  Object.entries(S.payroll || {}).forEach(([m, P]) => {
    const rows = Object.values(P.rows || {}),
      paid = rows.filter((r) => r.status === 'Paid');
    if (paid.length && paid.length === rows.length)
      out.push({
        at: Math.max(...paid.map((r) => r.paidAt || 0)) || parseISO(m + '-28')?.getTime(),
        when: paid.some((r) => r.paidAt) ? '' : monthLabel(m),
        k: 'pay',
        t: `Payroll for ${monthLabel(m)} marked paid`,
      });
  });
  S.employees.forEach((e) => {
    const j = parseISO(e.joining);
    if (j)
      out.push({
        at: j.getTime(),
        k: 'join',
        t: `${e.name} joined as ${e.designation || e.type || 'employee'}`,
      });
  });
  return out
    .filter((x) => x.at && x.at <= Date.now())
    .sort((a, b) => b.at - a.at)
    .slice(0, 5);
}
const amt0 = (n, c) =>
  (c === 'USD' ? '$' : '₹') + Math.round(Number(n) || 0).toLocaleString(c === 'USD' ? 'en-US' : 'en-IN');
const agoTxt = (t) => {
  const d = Math.floor((Date.now() - t) / 864e5);
  return d <= 0
    ? 'Today'
    : d === 1
      ? 'Yesterday'
      : d < 31
        ? `${d} days ago`
        : new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

function renderDashboard() {
  if (!/^\d{4}-\d{2}$/.test(dMonth)) dMonth = currentMonth();
  $('dbMonth').value = dMonth;
  document.querySelectorAll('#dbCur button').forEach((b) => b.classList.toggle('on', b.dataset.c === disp()));
  const now = new Date(),
    today = dOnly(now),
    cm = currentMonth(),
    hr = now.getHours(),
    mon = monthLabel(dMonth);
  $('dbHello').textContent = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  $('dbSub').textContent =
    `${now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Showing ${mon}${disp() === 'USD' ? ` in US dollars at ₹${rateOf(dMonth)} per $` : ''}`;

  const act = activeNow(),
    rows = monthRows(dMonth),
    cur = monthSum(dMonth, rows),
    pm = prevMonth(dMonth);
  const notMarked = act.every((e) => attFor(cm, e).join() === defaultAttendance(cm, e).join()),
    tc = todayCounts(act, today),
    dayOff = !tc.present && !tc.leave && !tc.absent,
    joinedIn = (m) => S.employees.filter((e) => String(e.joining || '').startsWith(m)).length,
    jNow = joinedIn(dMonth),
    jPrev = joinedIn(pm);

  /* KPI cards */
  const kpi = (c, ic, label, val, sub, go) =>
    `<button type="button" class="d2-kpi k-${c}" data-go="${go}"><span><span class="l">${label}</span><b>${val}</b><span class="s">${sub}</span></span>${icon(ic, c)}</button>`;
  let h = `<div class="d2">`;
  h += `<div class="d2-kpis">
    ${kpi('violet', 'users', 'Total employees', act.length, jNow ? `<i class="up">↑ ${jNow}</i> joined in ${esc(mon.split(' ')[0])}` : `${cur.n} on ${esc(mon.split(' ')[0])} payroll`, 'employees')}
    ${kpi('green', 'check', 'Present today', dayOff ? '—' : tc.present, dayOff ? 'Weekend or holiday' : notMarked ? 'Expected · attendance not marked yet' : `${pctOf(tc.present, act.length)}% of total${tc.wfh ? ` · ${tc.wfh} WFH` : ''}`, 'attendance')}
    ${kpi('amber', 'cal', 'On leave today', tc.leave, `${pctOf(tc.leave, act.length)}% of total`, 'attendance')}
    ${kpi('red', 'alert', 'Absent today', tc.absent, `${pctOf(tc.absent, act.length)}% of total`, 'attendance')}
    ${kpi('blue', 'award', `New joiners (${esc(mon.split(' ')[0])})`, jNow, jPrev || jNow ? `${jPrev} in ${esc(monthLabel(pm).split(' ')[0])}` : 'None this month', 'employees')}
  </div>`;

  /* attendance donut */
  const ma = monthAttendance(dMonth, rows, today),
    mt = ma.present + ma.leave + ma.absent + ma.half;
  const seg = [
    ['present', 'Full attendance', '#22c55e', ma.present],
    ['leave', 'Took leave', '#f5b83d', ma.leave],
    ['absent', 'Absent / unpaid', '#f0737a', ma.absent],
    ['half', 'Half day', '#b9a6f5', ma.half],
  ];
  let acc = 0;
  const grad = mt
    ? seg
        .map(
          ([, , col, v]) =>
            `${col} ${((acc / mt) * 360).toFixed(1)}deg ${(((acc += v) / mt) * 360).toFixed(1)}deg`,
        )
        .join(',')
    : '#eef0f5 0deg 360deg';
  h += `<div class="d2-card s4"><div class="d2-h"><h3>${icon('cal', 'violet')}Attendance overview</h3><span class="d2-tag">${esc(mon)}</span></div>
    <div class="d2-donut-wrap"><div class="d2-donut" style="background:conic-gradient(${grad})"><div><b>${mt}</b><span>Employees</span></div></div>
    <ul class="d2-legend">${seg.map(([, l, col, v]) => `<li><i style="background:${col}"></i>${l}<b>${v} <span>(${pctOf(v, mt)}%)</span></b></li>`).join('')}</ul></div>
    <p class="d2-note">Each person counted once${dMonth === cm ? ', for the month so far' : ''}.</p>
    <button type="button" class="d2-link" data-go="attendance">View attendance →</button></div>`;

  /* payroll trend (last 6 months) */
  let months = [
    ...new Set([
      ...Object.keys(S.payroll || {}).filter((k) => /^\d{4}-\d{2}$/.test(k) && k <= dMonth),
      dMonth,
    ]),
  ]
    .sort()
    .slice(-6);
  const tr = months.map((m) => (m === dMonth ? cur : monthSum(m, monthRows(m))));
  const tv = tr.map((t) => cv(t[dTrendKey], t.m)),
    tmax = Math.max(1, ...tv),
    tmin = Math.min(...tv),
    lo = Math.max(0, tmin - (tmax - tmin || tmax) * 0.6),
    W = 320,
    H = 130,
    px = (i) => (tv.length > 1 ? 14 + (i * (W - 28)) / (tv.length - 1) : W / 2),
    py = (v) => 10 + (1 - (v - lo) / (tmax - lo || 1)) * (H - 30);
  const pts = tv.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
  h += `<div class="d2-card s4"><div class="d2-h"><h3>${icon('trend', 'violet')}Payroll trend</h3>
      <span class="d2-seg">${[
        ['net', 'Net pay'],
        ['spend', 'Total spend'],
      ]
        .map(
          ([k, l]) =>
            `<button type="button" data-trend="${k}" class="${k === dTrendKey ? 'on' : ''}">${l}</button>`,
        )
        .join('')}</span></div>
    <div class="d2-linewrap"><svg class="d2-line" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Payroll trend">
      <defs><linearGradient id="d2g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d5ae6" stop-opacity=".28"/><stop offset="1" stop-color="#6d5ae6" stop-opacity="0"/></linearGradient></defs>
      ${tv.length > 1 ? `<polygon fill="url(#d2g)" points="${px(0)},${H - 20} ${pts} ${px(tv.length - 1)},${H - 20}"/>` : ''}
      <polyline fill="none" stroke="#6d5ae6" stroke-width="2.2" points="${pts}"/>
      ${tv.map((v, i) => `<circle cx="${px(i)}" cy="${py(v)}" r="3.6" fill="#fff" stroke="#6d5ae6" stroke-width="2"><title>${esc(monthLabel(months[i]))}: ${inr0(tr[i][dTrendKey], months[i])}</title></circle>`).join('')}
      ${months.map((m, i) => `<text x="${px(i)}" y="${H - 4}" text-anchor="middle">${esc(monLbl(m))}</text>`).join('')}
    </svg>${tv.map((v, i) => `<span class="d2-pv" style="left:${((px(i) / W) * 100).toFixed(2)}%;top:${((py(v) / H) * 100).toFixed(2)}%">${esc(short(tr[i][dTrendKey], months[i]))}</span>`).join('')}</div>
    <div class="d2-trend-foot"><span>${esc(mon)}</span><b>${inr0(cur[dTrendKey])}</b></div>
    <button type="button" class="d2-link" data-go="payroll">Open payroll →</button></div>`;

  /* upcoming events */
  const evs = upcomingEvents(act, today),
    EVI = {
      bday: ['cake', 'pink'],
      anniv: ['award', 'amber'],
      prob: ['doc', 'violet'],
      inc: ['trend', 'green'],
      hol: ['sun', 'blue'],
      pay: ['wallet', 'green'],
    };
  h += `<div class="d2-card s4"><div class="d2-h"><h3>${icon('gift', 'violet')}Upcoming events</h3><span class="d2-tag">Next 30 days</span></div>
    ${
      evs.length
        ? `<ul class="d2-events">${evs
            .slice(0, 4)
            .map(
              (x) =>
                `<li class="ev-${x.k}">${icon(EVI[x.k][0], EVI[x.k][1])}<div><b>${esc(x.t)}</b><span>${x.e && !x.go ? nameBtn(x.e) : esc(x.s)}</span></div>${x.go ? `<button type="button" class="d2-when${x.late ? ' late' : ''}" data-go="${x.go}"${x.e ? ` data-emp="${esc(x.e.id)}"` : ''}>${x.late ? `${x.late}d late` : x.n === 0 ? 'Today' : dd(x.d)}</button>` : `<span class="d2-when">${x.n === 0 ? 'Today' : dd(x.d)}</span>`}</li>`,
            )
            .join(
              '',
            )}</ul>${evs.length > 4 ? `<button type="button" class="d2-link" data-go="calendar">+${evs.length - 4} more in the next 30 days · Calendar →</button>` : ''}`
        : '<p class="d2-empty">Nothing in the next 30 days.</p>'
    }</div>`;

  /* leave summary */
  const lc = { PL: 0, SL: 0, CL: 0, A: 0, WFH: 0 };
  rows.forEach((r) => {
    const c = counts(attFor(dMonth, r.e));
    LV.forEach((k) => (lc[k] += c[k]));
    lc.A += c.A - (pay(r.e, dMonth).outsideDays || 0) + c.UP; // days before joining are not absence
    lc.WFH += c.WFH;
  });
  const sumRow = (l, v, cls = '') => `<li><span>${l}</span><b class="${cls}">${v}</b></li>`;
  h += `<div class="d2-card s3"><div class="d2-h"><h3>${icon('cal', 'amber')}Leave summary</h3><span class="d2-tag">${esc(mon.split(' ')[0])}</span></div>
    <ul class="d2-sum">${sumRow('Total leave days', lc.PL + lc.SL + lc.CL)}${sumRow('Paid leave', lc.PL, 'g')}${sumRow('Sick leave', lc.SL, 'a')}${sumRow('Casual leave', lc.CL, 'v')}${sumRow('Absent / unpaid', lc.A, 'r')}${lc.WFH ? sumRow('Work from home', lc.WFH) : ''}</ul>
    <button type="button" class="d2-link" data-go="leave">Leave balances →</button></div>`;

  /* payroll summary */
  const st =
    cur.paid === cur.n && cur.n
      ? ['done', 'Paid']
      : cur.paid
        ? ['part', `${cur.paid} of ${cur.n} paid`]
        : ['proc', dMonth > cm ? 'Not started' : 'Processing'];
  h += `<div class="d2-card s3"><div class="d2-h"><h3>${icon('wallet', 'green')}Payroll summary</h3><span class="d2-tag">${esc(mon.split(' ')[0])}</span></div>
    <div class="d2-status st-${st[0]}"><span>Payroll status</span><b>${st[1]}</b></div>
    <div class="d2-pair"><div><span>Employees</span><b>${cur.n}</b></div><div><span>Net payroll</span><b>${inr0(cur.net)}</b></div></div>
    <div class="d2-pair"><div><span>Total spend</span><b>${inr0(cur.spend)}</b></div><div><span>Cut for days not worked</span><b>${inr0(cur.lop)}</b></div></div>
    <button type="button" class="d2-link" data-go="payroll">Open payroll →</button></div>`;

  /* pending tasks */
  const tp = sortTasks(allTasks().filter((t) => t.status === 'pending'));
  h += `<div class="d2-card s3 d2-tasks"><div class="d2-h"><h3>${icon('clip', 'red')}Pending tasks</h3>${tp.length ? `<span class="pillx c-red">${tp.length}</span>` : ''}</div>
    ${
      tp.length
        ? `<ul class="d2-tlist">${tp
            .slice(0, 4)
            .map((x) => {
              const d = parseISO(x.due),
                n = d ? dayDiff(d, today) : null;
              return `<li><span title="${esc(x.title)}">${esc(x.title)}</span>${n == null ? '' : `<em class="${n < 0 ? 'late' : n === 0 ? 'now' : ''}">${n < 0 ? `${-n}d late` : n === 0 ? 'Today' : dd(d)}</em>`}</li>`;
            })
            .join('')}</ul>${tp.length > 4 ? `<p class="d2-note">+${tp.length - 4} more</p>` : ''}`
        : `<p class="d2-empty">All caught up.</p>`
    }
    <button type="button" class="d2-link" data-go="tasks">All tasks →</button></div>`;

  /* quick access */
  const qa = [
    ['users', 'blue', 'Add employee', 'addemp'],
    ['cal', 'green', 'Attendance', 'attendance'],
    ['clip', 'amber', 'Leave', 'leave'],
    ['card', 'violet', 'Payslips', 'payroll'],
    ['trend', 'pink', 'Increments', 'inc'],
    ['doc', 'blue', 'Letters', 'docs'],
    ['cal', 'violet', 'Calendar', 'calendar'],
    ['build', 'blue', 'Assets', 'assets'],
    ['wallet', 'pink', 'Expenses', 'expenses'],
    ['sun', 'amber', 'Holidays', 'holidays'],
    ['file', 'green', 'Excel report', 'excel'],
  ];
  h += `<div class="d2-card s3"><div class="d2-h"><h3>${icon('build', 'violet')}Quick access</h3></div>
    <div class="d2-quick">${qa.map(([ic, c, l, go]) => `<button type="button" data-go="${go}">${icon(ic, c)}<span>${l}</span></button>`).join('')}</div></div>`;

  /* department-wise headcount */
  const dep = {};
  act.forEach((e) => {
    const k = e.department || 'Unassigned';
    dep[k] = (dep[k] || 0) + 1;
  });
  const deps = Object.entries(dep).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    dmax = Math.max(1, ...deps.map((d) => d[1]));
  h += `<div class="d2-card s8"><div class="d2-h"><h3>${icon('build', 'blue')}Department-wise headcount</h3><span class="d2-tag">${act.length} active</span></div>
    <div class="d2-bars">${deps.map(([k, n]) => `<button type="button" class="d2-bar" data-go="employees" data-dept="${esc(k)}" title="${esc(k)}: ${n}"><b>${n}</b><span class="col" style="height:${Math.max(6, (n / dmax) * 100)}%"></span><span class="x">${esc(k)}</span></button>`).join('')}</div></div>`;

  /* recent activity */
  const ra = recentActivity(),
    RAI = {
      doc: ['doc', 'violet'],
      inc: ['trend', 'green'],
      pay: ['wallet', 'blue'],
      join: ['users', 'amber'],
    };
  h += `<div class="d2-card s4"><div class="d2-h"><h3>${icon('clip', 'violet')}Recent activity</h3><button type="button" class="d2-link top" data-go="docs">Letters →</button></div>
    ${ra.length ? `<ul class="d2-act">${ra.map((x) => `<li>${icon(RAI[x.k][0], RAI[x.k][1])}<span>${esc(x.t)}</span><time>${x.when || agoTxt(x.at)}</time></li>`).join('')}</ul>` : '<p class="d2-empty">No activity yet.</p>'}</div>`;

  /* team-wise status (78-team-status.js): who is in today, leave and pay per department */
  if (typeof teamStatusCard === 'function') h += `<div class="d2-full">${teamStatusCard(dMonth)}</div>`;

  h += `</div>`;
  $('dbBody').innerHTML = h;
}

/* new click targets; everything else goes to the existing dashboard actions */
const dbActV1 = dbAct;
dbAct = function (t) {
  const g = t.dataset && t.dataset.go;
  if (t.dataset && t.dataset.trend) {
    dTrendKey = t.dataset.trend;
    renderDashboard();
    return;
  }
  const nav = (tab) => {
    const b = document.querySelector(`nav button[data-tab="${tab}"]`);
    if (b) b.click();
  };
  if (g === 'addemp') {
    nav('employees');
    setTimeout(() => $('addEmp') && $('addEmp').click(), 30);
    return;
  }
  if (g === 'excel') {
    const b =
      $('xlsxBtn') ||
      [...document.querySelectorAll('button')].find((x) => /Download Excel/i.test(x.textContent));
    if (b) b.click();
    return;
  }
  if (g === 'employees' && t.dataset.dept) {
    filt.dept = t.dataset.dept;
    filterFromDashboard = true; // cleared again when another screen is opened (65-qa-fixes.js)
    const sel = $('fDept');
    if (sel) sel.value = t.dataset.dept;
  }
  if (g && addonTabs[g] && !['tasks', 'holidays'].includes(g)) {
    showTab(g, true); // calendar, assets, expenses and other add-on screens
    return;
  }
  if (g === 'leave') {
    month = dMonth;
    nav('leave');
    return;
  }
  dbActV1(t);
};
