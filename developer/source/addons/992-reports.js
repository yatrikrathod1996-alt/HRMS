/* ============================================================
   REPORTS (Overview → Reports): people cost the way a CFO reads it.
   Every figure comes from the same payroll engine as the Payroll
   screen (previewPayroll, which never changes saved data), in INR
   (USD contractors at each month's rate).
     · total people cost, average month, annual run-rate, cost per head
     · budget for the financial year: used so far and full-year forecast
     · month by month: salary, performance pay, incentives, reimbursements, other cost
     · by department: cost, share, head count, cost per head
     · head count and attrition; joiners and leavers
     · fixed vs variable, USD exposure, salary bands, increments' yearly impact
   Download: an Excel workbook with every table.
   ============================================================ */
let rpPeriod = 'fy';
const rpRupee = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
const rpShort = (n) => {
  const v = Math.abs(n || 0), s = n < 0 ? '−' : '';
  return v >= 1e7 ? `${s}₹${(v / 1e7).toFixed(2)} Cr` : v >= 1e5 ? `${s}₹${(v / 1e5).toFixed(1)} L` : `${s}₹${Math.round(v).toLocaleString('en-IN')}`;
};
const rpPct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const rpYm = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
function rpMonths(kind) {
  const cm = currentMonth(), [cy, cmo] = cm.split('-').map(Number);
  let list = [];
  if (kind === 'fy') {
    const fy = cmo >= 4 ? cy : cy - 1;
    for (let i = 0; i < 12; i++) list.push(rpYm(fy + Math.floor((3 + i) / 12), ((3 + i) % 12) + 1));
  } else if (kind === 'year') {
    for (let i = 1; i <= 12; i++) list.push(rpYm(cy, i));
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(cy, cmo - 1 - i, 1);
      list.push(rpYm(d.getFullYear(), d.getMonth() + 1));
    }
  }
  return { all: list, done: list.filter((m) => m <= cm && empsIn(m).length) };
}
const rpFyLabel = () => {
  const [cy, cmo] = currentMonth().split('-').map(Number), fy = cmo >= 4 ? cy : cy - 1;
  return `FY ${fy}-${String((fy + 1) % 100).padStart(2, '0')}`;
};
function rpData(kind) {
  const { all, done } = rpMonths(kind);
  const months = done.map((m) => {
    const rows = monthRows(m), s = monthSum(m, rows);
    const usd = rows.filter((r) => r.currency === 'USD').reduce((t, r) => t + r2(r.sal * r.fx) - r2(r.lop * r.fx) + r2(r.vari * r.fx), 0);
    const dept = {};
    rows.forEach((r) => {
      const k = r.e.department || 'Unassigned', w = r.row;
      const cost = r2(r.sal * r.fx) - r2(r.lop * r.fx) + Number(w.inc || 0) + Number(w.bonus || 0) + r2(r.vari * r.fx) + Number(w.reimb || 0) + (r.compliance.employerTotal || 0) + (r.ctc.accommodation || 0);
      dept[k] = dept[k] || { cost: 0, n: 0 };
      dept[k].cost += cost;
      dept[k].n++;
    });
    const joined = S.employees.filter((e) => String(e.joining || '').startsWith(m)).length;
    const left = S.employees.filter((e) => String(e.lastDay || '').startsWith(m)).length;
    return { m, rows, s, usd, dept, head: rows.length, joined, left, fixed: s.salary, variable: s.inc + s.perf };
  });
  const sum = (k) => months.reduce((t, x) => t + (typeof k === 'function' ? k(x) : x.s[k]), 0);
  const total = sum('spend');
  const last = months[months.length - 1];
  const avgHead = months.length ? sum((x) => x.head) / months.length : 0;
  const leavers = sum((x) => x.left), joiners = sum((x) => x.joined);
  // run-rate: what the team on the books today costs a month (salaries + fixed variable at today's pay),
  // plus the average incentives and reimbursements of the last three months
  const cm = currentMonth(), act = S.employees.filter((e) => e.status === 'Active' && (!e.lastDay || e.lastDay >= `${cm}-01`));
  const fxNow = Number((S.payroll[cm] || {}).fx || S.settings.fx);
  const base = act.reduce((t, e) => t + (Number(e.salary || 0) + Number(e.variable || 0)) * (e.currency === 'USD' ? fxNow : 1), 0);
  const recent = months.slice(-3);
  const extras = recent.length ? recent.reduce((t, x) => t + x.s.inc + Number(x.s.reimb) + x.s.other + Number(x.rows.reduce((a, r) => a + Number(r.row.bonus || 0), 0)), 0) / recent.length : 0;
  const runMonth = base + extras;
  const left = all.filter((m) => m > (last ? last.m : '')).length;
  const forecast = total + runMonth * left;
  // increments in the period: yearly effect of every raise
  const incs = (S.increments || []).filter((r) => r.date && all.some((m) => r.date.startsWith(m)));
  const incYear = incs.reduce((t, r) => {
    const e = S.employees.find((x) => x.id === r.empId), fx = e && e.currency === 'USD' ? fxNow : 1;
    return t + (Number(r.newSalary || 0) - Number(r.oldSalary || 0) + Number(r.newVar || 0) - Number(r.oldVar || 0)) * fx * 12;
  }, 0);
  // departments over the period
  const dept = {};
  months.forEach((x) => Object.entries(x.dept).forEach(([k, v]) => {
    dept[k] = dept[k] || { cost: 0, months: 0, heads: 0 };
    dept[k].cost += v.cost;
    dept[k].heads += v.n;
  }));
  // salary bands today (monthly salary + fixed variable, in ₹)
  const bands = [['Up to ₹25,000', 0, 25000], ['₹25,000–50,000', 25000, 50000], ['₹50,000–75,000', 50000, 75000], ['₹75,000–1 lakh', 75000, 100000], ['Above ₹1 lakh', 100000, Infinity]].map(([l, lo, hi]) => {
    const p = act.filter((e) => {
      const v = (Number(e.salary || 0) + Number(e.variable || 0)) * (e.currency === 'USD' ? fxNow : 1);
      return v > lo && v <= hi;
    });
    return { l, n: p.length, cost: p.reduce((t, e) => t + (Number(e.salary || 0) + Number(e.variable || 0)) * (e.currency === 'USD' ? fxNow : 1), 0) };
  });
  return { all, months, total, last, avgHead, leavers, joiners, runMonth, forecast, left, incs, incYear, dept, bands, act, fxNow,
    variable: sum((x) => x.variable), fixed: sum((x) => x.fixed), usd: sum((x) => x.usd), lop: sum('lop'), reimb: sum('reimb'), other: sum('other') };
}
const rpBudget = () => (S.reportBudget && S.reportBudget[rpFyLabel()]) || 0;

document.getElementById('tab-settings').insertAdjacentHTML(
  'beforebegin',
  `<section id="tab-reports" class="hide">
  <div class="top"><div><h2>Reports</h2><p>People cost, budget, head count and attrition. Every figure comes from payroll, in ₹ (USD contractors at each month's rate).</p></div>
    <div class="controls"><label class="inline">Period <select id="rpPeriod"><option value="fy">This financial year</option><option value="last12">Last 12 months</option><option value="year">This calendar year</option></select></label>
      <button type="button" class="btn" id="rpXlsx">Download Excel</button></div></div>
  <div id="rpBody"></div>
</section>`,
);
(() => {
  const b = document.createElement('button');
  b.type = 'button';
  b.id = 'navReports';
  b.className = 'nav-item';
  b.innerHTML = `<svg class="nav-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="12" y="7" width="3" height="10" rx="1"/><rect x="17" y="13" width="3" height="4" rx="1"/></svg><span>Reports</span>`;
  const after = $('navCalendar');
  (after || document.querySelector('nav .spacer')).insertAdjacentElement(after ? 'afterend' : 'beforebegin', b);
  b.addEventListener('click', () => showTab('reports', true));
  addonTabs.reports = { button: b, section: 'tab-reports', render: () => renderReports() };
})();

const RP_PARTS = [
  ['salary', 'Salary (after unpaid days)', '#6f8cff'],
  ['perf', 'Performance pay', '#b29dff'],
  ['inc', 'Incentives', '#f5b557'],
  ['reimb', 'Reimbursements', '#5fd08b'],
  ['other', 'Other cost', '#ff8fb6'],
];
function rpStack(months) {
  if (!months.length) return '<p class="rp-empty">No payroll in this period yet.</p>';
  const max = Math.max(...months.map((x) => x.s.spend), 1);
  const cols = months
    .map((x) => {
      const parts = RP_PARTS.map(([k, l, c]) => {
        const v = Number(x.s[k] || 0);
        return v > 0 ? `<i style="height:${((v / max) * 190).toFixed(1)}px;background:${c}" title="${esc(monthLabel(x.m))} · ${l}: ${rpRupee(v)}"></i>` : '';
      }).join('');
      return `<div class="rp-col"><span class="rp-v">${esc(rpShort(x.s.spend))}</span><div class="rp-stack">${parts}</div></div>`;
    })
    .join('');
  return `<div class="rp-cols" role="img" aria-label="People cost by month">${cols}</div>
    <div class="rp-ml">${months.map((x) => `<span>${esc(monthLabel(x.m).slice(0, 3))}</span>`).join('')}</div>
    <div class="rp-legend">${RP_PARTS.map(([, l, c]) => `<span><i style="background:${c}"></i>${l}</span>`).join('')}</div>`;
}
function rpTile(label, value, sub, cls = '') {
  return `<div class="rp-k ${cls}"><span>${label}</span><b>${value}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
}
function renderReports() {
  $('rpPeriod').value = rpPeriod;
  const D = rpData(rpPeriod), n = D.months.length;
  const avg = n ? D.total / n : 0, perHead = D.avgHead ? avg / D.avgHead : 0;
  const prev = D.months[n - 2], mom = D.last && prev ? rpPct(D.last.s.spend - prev.s.spend, prev.s.spend) : 0;
  const attr = D.avgHead ? rpPct(D.leavers, D.avgHead) : 0, attrYear = n ? Math.round(attr * (12 / n) * 10) / 10 : 0;
  const budget = rpPeriod === 'fy' ? rpBudget() : 0;
  const used = budget ? rpPct(D.total, budget) : 0, gap = budget ? D.forecast - budget : 0;
  const periodName = rpPeriod === 'fy' ? rpFyLabel() : rpPeriod === 'year' ? `Calendar ${currentMonth().slice(0, 4)}` : 'Last 12 months';
  let h = `<div class="rp-kpis">
    ${rpTile('People cost', rpShort(D.total), `${periodName} · ${n} month${n === 1 ? '' : 's'} paid`)}
    ${rpTile('Average month', rpShort(avg), D.last ? `${monthLabel(D.last.m)}: ${rpShort(D.last.s.spend)} (${mom >= 0 ? '+' : ''}${mom}% vs month before)` : '')}
    ${rpTile('Annual run-rate', rpShort(D.runMonth * 12), `the team on the books today: ${rpShort(D.runMonth)} a month`)}
    ${rpTile('Cost per head', rpShort(perHead), `a month, average ${Math.round(D.avgHead * 10) / 10} people`)}
    ${rpTile('Attrition', `${attrYear}%`, `${D.leavers} left · ${D.joiners} joined in the period (yearly rate)`, attrYear > 20 ? 'warn' : '')}
    ${rpTile('Variable share', `${rpPct(D.variable, D.total)}%`, `performance pay + incentives: ${rpShort(D.variable)}`)}
  </div>`;
  // budget
  if (rpPeriod === 'fy')
    h += `<div class="rp-card rp-budget"><div class="rp-h"><h3>Budget · ${esc(rpFyLabel())}</h3><span class="rp-bset"><label class="inline">Yearly people-cost budget (₹) <input type="number" min="0" step="10000" id="rpBudget" value="${budget || ''}" placeholder="e.g. 15000000"></label><button type="button" class="btn" id="rpBudgetSave">Save</button></span></div>
      ${budget ? `<div class="rp-bar"><i style="width:${Math.min(100, used)}%"></i><em style="left:${Math.min(100, rpPct(D.forecast, budget))}%"></em></div>
      <div class="rp-bnums"><span>Spent <b>${rpShort(D.total)}</b> (${used}%)</span><span>Forecast for the year <b>${rpShort(D.forecast)}</b></span><span class="${gap > 0 ? 'bad' : 'ok'}">${gap > 0 ? 'Over budget by' : 'Under budget by'} <b>${rpShort(Math.abs(gap))}</b></span></div>
      <p class="rp-note">Forecast = paid so far + ${D.left} remaining month${D.left === 1 ? '' : 's'} at today's run-rate (${rpShort(D.runMonth)} a month). Leavers with a recorded last day are already left out.</p>`
        : `<p class="rp-note">Set the year's budget to see spend against it and a full-year forecast (paid so far + today's run-rate for the months left: ${rpShort(D.forecast)}).</p>`}</div>`;
  // month by month
  h += `<div class="rp-card"><div class="rp-h"><h3>People cost by month</h3><span class="d2-tag">${esc(periodName)}</span></div>${rpStack(D.months)}
    <div class="tablewrap"><table class="rp-t"><thead><tr><th>Month</th><th class="num">People</th>${RP_PARTS.map(([, l]) => `<th class="num">${l}</th>`).join('')}<th class="num">Total cost</th><th class="num">Net paid</th><th class="num">Cut for days not worked</th></tr></thead><tbody>
    ${D.months.map((x) => `<tr><td>${esc(monthLabel(x.m))}</td><td class="num">${x.head}</td>${RP_PARTS.map(([k]) => `<td class="num">${rpRupee(x.s[k])}</td>`).join('')}<td class="num"><b>${rpRupee(x.s.spend)}</b></td><td class="num">${rpRupee(x.s.net)}</td><td class="num">${rpRupee(x.s.lop)}</td></tr>`).join('')}
    <tr class="rp-tot"><td>Total</td><td class="num">—</td>${RP_PARTS.map(([k]) => `<td class="num">${rpRupee(D.months.reduce((t, x) => t + Number(x.s[k] || 0), 0))}</td>`).join('')}<td class="num"><b>${rpRupee(D.total)}</b></td><td class="num">${rpRupee(D.months.reduce((t, x) => t + x.s.net, 0))}</td><td class="num">${rpRupee(D.lop)}</td></tr></tbody></table></div></div>`;
  // departments
  const deps = Object.entries(D.dept).sort((a, b) => b[1].cost - a[1].cost);
  const dmax = Math.max(...deps.map(([, v]) => v.cost), 1);
  h += `<div class="rp-grid"><div class="rp-card"><div class="rp-h"><h3>Cost by department</h3><span class="d2-tag">${esc(periodName)}</span></div>
    <ul class="rp-hbars">${deps.map(([k, v]) => {
      const heads = v.heads / Math.max(1, n);
      return `<li><span class="rp-dn">${esc(k)}</span><span class="rp-db"><i style="width:${((v.cost / dmax) * 100).toFixed(1)}%"></i></span><b>${rpShort(v.cost)}</b><small>${rpPct(v.cost, D.total)}% · ${Math.round(heads * 10) / 10} people · ${rpShort(heads ? v.cost / n / heads : 0)}/head a month</small></li>`;
    }).join('') || '<li class="rp-empty">No payroll yet.</li>'}</ul></div>`;
  // head count & attrition
  h += `<div class="rp-card"><div class="rp-h"><h3>Head count and movement</h3><span class="d2-tag">${D.act.length} on the books today</span></div>
    <div class="tablewrap"><table class="rp-t"><thead><tr><th>Month</th><th class="num">On payroll</th><th class="num">Joined</th><th class="num">Left</th></tr></thead><tbody>
    ${D.months.map((x) => `<tr><td>${esc(monthLabel(x.m))}</td><td class="num">${x.head}</td><td class="num">${x.joined || '—'}</td><td class="num">${x.left || '—'}</td></tr>`).join('')}</tbody></table></div>
    <p class="rp-note">Attrition = people who left ÷ average head count${n < 12 ? `, scaled to a year (${D.leavers} in ${n} months)` : ''}. Replacing someone typically costs months of their salary in hiring and ramp-up.</p></div></div>`;
  // mix: fixed vs variable, currency, bands, increments
  const usdShare = rpPct(D.usd, D.total);
  h += `<div class="rp-grid rp-grid3">
    <div class="rp-card"><div class="rp-h"><h3>Fixed and variable</h3></div>
      <div class="rp-split"><i style="width:${rpPct(D.fixed, D.total)}%"></i></div>
      <ul class="rp-list"><li><span>Fixed salary</span><b>${rpShort(D.fixed)}</b><small>${rpPct(D.fixed, D.total)}%</small></li>
      <li><span>Performance pay + incentives</span><b>${rpShort(D.variable)}</b><small>${rpPct(D.variable, D.total)}%</small></li>
      <li><span>Reimbursements</span><b>${rpShort(D.reimb)}</b><small>${rpPct(D.reimb, D.total)}%</small></li>
      <li><span>Saved by unpaid days</span><b>${rpShort(D.lop)}</b><small>not paid</small></li></ul></div>
    <div class="rp-card"><div class="rp-h"><h3>Currency exposure</h3></div>
      <ul class="rp-list"><li><span>USD contractors (in ₹)</span><b>${rpShort(D.usd)}</b><small>${usdShare}% of cost</small></li>
      <li><span>Rate this month</span><b>₹${D.fxNow}/$</b><small>${D.months.length ? `first month ₹${Number((S.payroll[D.months[0].m] || {}).fx || S.settings.fx)}/$` : ''}</small></li>
      <li><span>Effect of ₹1 move in the rate</span><b>${rpShort(D.act.filter((e) => e.currency === 'USD').reduce((t, e) => t + Number(e.salary || 0) + Number(e.variable || 0), 0) * 12)}</b><small>a year</small></li></ul></div>
    <div class="rp-card"><div class="rp-h"><h3>Salary bands today</h3></div>
      <ul class="rp-list">${D.bands.map((b) => `<li><span>${b.l}</span><b>${b.n} ${b.n === 1 ? 'person' : 'people'}</b><small>${rpShort(b.cost)}/month</small></li>`).join('')}</ul></div>
  </div>`;
  h += `<div class="rp-card"><div class="rp-h"><h3>Increments in the period</h3><span class="d2-tag">${D.incs.length} recorded</span></div>
    ${D.incs.length ? `<p class="rp-big">${rpShort(D.incYear)} <small>more a year from ${D.incs.length} raise${D.incs.length === 1 ? '' : 's'} (${rpShort(D.incYear / 12)} a month)</small></p>` : '<p class="rp-note">No increments recorded in this period.</p>'}</div>`;
  $('rpBody').innerHTML = h;
}
function rpExcel() {
  const D = rpData(rpPeriod), wb = XLSX.utils.book_new();
  const add = (name, rows, widths) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = widths.map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  };
  const R = (n) => Math.round((n || 0) * 100) / 100;
  add('Summary', [
    ['Acme Labs HRMS · Reports', rpPeriod === 'fy' ? rpFyLabel() : rpPeriod === 'year' ? 'Calendar year' : 'Last 12 months'],
    ['People cost (₹)', R(D.total)], ['Months paid', D.months.length], ['Average month (₹)', R(D.months.length ? D.total / D.months.length : 0)],
    ['Annual run-rate (₹)', R(D.runMonth * 12)], ['Forecast for the period (₹)', R(D.forecast)], ['Budget (₹)', rpPeriod === 'fy' ? rpBudget() : ''],
    ['Leavers', D.leavers], ['Joiners', D.joiners], ['Average head count', R(D.avgHead)],
    ['USD contractors (₹)', R(D.usd)], ['Saved by unpaid days (₹)', R(D.lop)], ['Increments: yearly effect (₹)', R(D.incYear)],
  ], [34, 18]);
  add('By month', [['Month', 'People', ...RP_PARTS.map(([, l]) => l + ' (₹)'), 'Total cost (₹)', 'Net paid (₹)', 'Cut for days not worked (₹)', 'Joined', 'Left'],
    ...D.months.map((x) => [monthLabel(x.m), x.head, ...RP_PARTS.map(([k]) => R(x.s[k])), R(x.s.spend), R(x.s.net), R(x.s.lop), x.joined, x.left])], [16, 8, 16, 16, 12, 14, 12, 14, 14, 16, 8, 8]);
  add('By department', [['Department', 'Cost (₹)', 'Share %', 'Average people'],
    ...Object.entries(D.dept).sort((a, b) => b[1].cost - a[1].cost).map(([k, v]) => [k, R(v.cost), rpPct(v.cost, D.total), R(v.heads / Math.max(1, D.months.length))])], [22, 14, 9, 14]);
  add('Salary bands', [['Band', 'People', 'Monthly cost (₹)'], ...D.bands.map((b) => [b.l, b.n, R(b.cost)])], [18, 8, 16]);
  XLSX.writeFile(wb, `Acme Labs HRMS report ${new Date().toISOString().slice(0, 10)}.xlsx`);
}
document.addEventListener('change', (ev) => {
  if (ev.target.id === 'rpPeriod') {
    rpPeriod = ev.target.value;
    renderReports();
  }
});
document.addEventListener('click', (ev) => {
  if (ev.target.closest('#rpXlsx')) rpExcel();
  if (ev.target.closest('#rpBudgetSave')) {
    const v = Number($('rpBudget').value || 0);
    if (!(v >= 0)) return flash('Enter the budget in ₹');
    S.reportBudget = { ...(S.reportBudget || {}), [rpFyLabel()]: v };
    save();
    renderReports();
    flash(v ? `Budget saved for ${rpFyLabel()}` : 'Budget cleared');
  }
});
window.HRMS_REPORTS = { data: rpData, months: rpMonths, render: () => renderReports(), excel: rpExcel }; // used by the tests
