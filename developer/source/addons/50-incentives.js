/* ============================================================
   ADD INCENTIVES (Payroll): one entry per deal closed, client
   onboarded, etc., for any team. Entries are kept per month in
   row.incItems; row.inc stays the total, so every calculation,
   slip and export keeps working. Paid months are locked.
   ============================================================ */
document.body.insertAdjacentHTML(
  'beforeend',
  `<dialog id="incxDlg"><div class="mhead"><div><h3>Add incentives</h3><div class="cell-sub" id="ixSub"></div></div><button type="button" class="btn" id="ixClose">Close</button></div>
  <div class="mbody">
    <div class="ix-teams" id="ixTeams"></div>
    <div class="ix-form">
      <label>Employee<select id="ixEmp"></select></label>
      <label>Incentive for<select id="ixType"></select></label>
      <label>Client / deal name<input id="ixClient" placeholder="e.g. Acme Corp" maxlength="120"></label>
      <label>Amount (₹)<input id="ixAmt" type="number" min="0" step="1"></label>
      <label>Date<input id="ixDate" type="date"></label>
      <button type="button" class="btn primary" id="ixAdd">+ Add</button>
    </div>
    <p class="ix-hint">One line per deal closed or client onboarded. The amount fills in from the type (change it any time below), and the payslip shows each type on its own line, e.g. "Deal closed (2)".</p>
    <div class="ix-sum" id="ixSum"></div>
    <div class="tablewrap" style="max-height:none"><table class="ix-tab" id="ixList"></table></div>
    <details class="ix-types" id="ixTypes"><summary>Incentive types and default amounts</summary><div id="ixTypesBody"></div></details>
  </div>
  <div class="mfoot"><span class="cell-sub" id="ixFoot"></span><button type="button" class="btn primary" id="ixDone">Done</button></div></dialog>`,
);

const INC_TYPES_DEFAULT = [
  { name: 'Deal closed', amt: 0 },
  { name: 'Client onboarded', amt: 0 },
  { name: 'Support incentive', amt: 0 },
  { name: 'Holiday / weekend work', amt: 0 },
  { name: 'Referral bonus', amt: 0 },
  { name: 'Target achieved', amt: 0 },
  { name: 'Other incentive', amt: 0 },
];
const incTypes = () => {
  if (!Array.isArray(S.incTypes) || !S.incTypes.length) S.incTypes = INC_TYPES_DEFAULT.map((x) => ({ ...x }));
  return S.incTypes;
};
let ixTeam = 'All',
  ixMonth = null;
const ixRow = (id, m) => {
  const e = S.employees.find((x) => x.id === id);
  if (!e) return null;
  pay(e, m);
  return S.payroll[m].rows[id];
};
/* keep the items and the incentive total in step (Edit amounts can change the total directly) */
function ixNormalize(row) {
  if (!Array.isArray(row.incItems)) row.incItems = [];
  const sum = r2(row.incItems.reduce((a, x) => a + Number(x.amount || 0), 0)),
    tot = r2(Number(row.inc || 0)),
    diff = r2(tot - sum);
  if (Math.abs(diff) > 0.01) {
    const man = row.incItems.find((x) => x.manual);
    if (man && r2(Number(man.amount) + diff) >= 0) man.amount = r2(Number(man.amount) + diff);
    else if (diff > 0)
      row.incItems.unshift({
        id: 'm' + Date.now().toString(36),
        type: 'Incentive',
        client: '',
        amount: diff,
        date: '',
        manual: true,
        note: 'Entered earlier in Edit amounts',
      });
    else
      row.incItems = [
        {
          id: 'm' + Date.now().toString(36),
          type: 'Incentive',
          client: '',
          amount: tot,
          date: '',
          manual: true,
        },
      ];
  }
  row.incItems = row.incItems.filter((x) => Number(x.amount) > 0);
}
function ixApply(row) {
  row.inc = r2(row.incItems.reduce((a, x) => a + Number(x.amount || 0), 0));
  const parts = incentiveParts(row) || [];
  const auto = parts.length ? 'Incentives: ' + parts.map(([t, n]) => `${t} ${money(n)}`).join(', ') : '';
  // keep the person's own note; replace only the line this screen wrote last time
  const old = String(row.reason || '')
    .split('; ')
    .filter((x) => x && !/^Incentives: /.test(x));
  row.reason = [...old, auto].filter(Boolean).join('; ');
}
function openIncx() {
  ixMonth = month;
  incTypes();
  $('ixSub').textContent = `${monthLabel(ixMonth)} · added to each person's Incentive in Payroll`;
  if (!$('ixDate').value || !$('ixDate').value.startsWith(ixMonth)) {
    const t = iso(new Date());
    $('ixDate').value = t.startsWith(ixMonth) ? t : ixMonth + '-01';
  }
  renderIncx();
  $('incxDlg').showModal();
}
function renderIncx() {
  const m = ixMonth,
    emps = empsIn(m),
    depts = {};
  emps.forEach((e) => {
    const d = e.department || 'Unassigned';
    depts[d] = (depts[d] || 0) + 1;
  });
  if (ixTeam !== 'All' && !depts[ixTeam]) ixTeam = 'All';
  $('ixTeams').innerHTML = [
    ['All', emps.length],
    ...Object.entries(depts).sort((a, b) => a[0].localeCompare(b[0])),
  ]
    .map(
      ([d, n]) =>
        `<button type="button" data-team="${esc(d)}" class="${d === ixTeam ? 'on' : ''}">${d === 'All' ? 'All teams' : esc(d)}<span>${n}</span></button>`,
    )
    .join('');
  const team = emps
    .filter((e) => ixTeam === 'All' || (e.department || 'Unassigned') === ixTeam)
    .sort((a, b) => a.name.localeCompare(b.name));
  const keep = $('ixEmp').value;
  $('ixEmp').innerHTML = team
    .map((e) => {
      const row = (S.payroll[m] && S.payroll[m].rows[e.id]) || {};
      return `<option value="${e.id}" ${row.status === 'Paid' ? 'disabled' : ''}>${esc(e.name)}${row.status === 'Paid' ? ' (paid)' : ''}</option>`;
    })
    .join('');
  if (team.some((e) => e.id === keep)) $('ixEmp').value = keep;
  const tk = $('ixType').value;
  $('ixType').innerHTML =
    incTypes()
      .map((t) => `<option>${esc(t.name)}</option>`)
      .join('') + '<option value="__new">+ New type…</option>';
  if (incTypes().some((t) => t.name === tk)) $('ixType').value = tk;
  // this month's entries for the team
  const lines = [];
  let tot = 0;
  const byType = {};
  team.forEach((e) => {
    const row = S.payroll[m] && S.payroll[m].rows[e.id];
    if (!row || !(Number(row.inc) > 0)) return;
    const items =
      Array.isArray(row.incItems) && incentiveParts(row)
        ? row.incItems
        : [{ id: '', type: 'Incentive', client: '', amount: row.inc, date: '', legacy: true }];
    items.forEach((x) => {
      lines.push({ e, row, x });
      tot += Number(x.amount);
      byType[x.type] = (byType[x.type] || 0) + Number(x.amount);
    });
  });
  $('ixSum').innerHTML =
    `<div><b>${money(tot)}</b>Total incentive · ${ixTeam === 'All' ? 'all teams' : esc(ixTeam)}</div><div><b>${new Set(lines.map((l) => l.e.id)).size}</b>People getting incentive</div>` +
    Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(
        ([t, n]) => `<div><b>${money(n)}</b>${esc(t)} · ${lines.filter((l) => l.x.type === t).length}</div>`,
      )
      .join('');
  let h = `<thead><tr><th>Employee</th><th>Incentive for</th><th>Client / deal</th><th>Date</th><th class="num">Amount (₹)</th><th></th></tr></thead><tbody>`;
  if (!lines.length)
    h += `<tr><td colspan="6" class="ix-empty">No incentives added for ${ixTeam === 'All' ? 'anyone' : esc(ixTeam)} in ${esc(monthLabel(m))} yet. Use the form above.</td></tr>`;
  let last = null;
  lines.forEach(({ e, row, x }) => {
    const paid = row.status === 'Paid',
      ed = !paid && !x.legacy;
    if (last !== e.id) {
      const n = Number(row.inc);
      h += `<tr class="grp"><td colspan="4">${esc(e.name)} <span class="idc">${esc(e.department || '')}</span>${paid ? ' <span class="lock">· paid, locked</span>' : ''}</td><td class="num">${money(n)}</td><td></td></tr>`;
      last = e.id;
    }
    h += `<tr><td></td><td>${esc(x.type)}</td><td>${ed ? `<input data-ixf="client" data-emp="${e.id}" data-item="${esc(x.id)}" value="${esc(x.client || '')}" style="width:100%;border:1px solid var(--line);border-radius:6px;padding:4px 6px">` : esc(x.client || '—')}</td><td>${x.date ? shortDate(parseISO(x.date)) : '—'}</td>
      <td class="num">${ed ? `<input type="number" min="0" step="1" data-ixf="amount" data-emp="${e.id}" data-item="${esc(x.id)}" value="${Number(x.amount)}" style="width:110px;text-align:right;border:1px solid var(--line);border-radius:6px;padding:4px 6px">` : money(x.amount)}</td>
      <td>${ed ? `<button type="button" class="x" title="Remove" data-ixdel="${esc(x.id)}" data-emp="${e.id}">×</button>` : ''}</td></tr>`;
  });
  $('ixList').innerHTML = h + '</tbody>';
  $('ixTypesBody').innerHTML =
    `<table class="ix-tab"><thead><tr><th>Type</th><th class="num">Default amount (₹)</th><th></th></tr></thead><tbody>${incTypes()
      .map(
        (t, i) =>
          `<tr><td><input data-ixt="name" data-i="${i}" value="${esc(t.name)}"></td><td class="num"><input type="number" min="0" step="1" data-ixt="amt" data-i="${i}" value="${Number(t.amt) || ''}" placeholder="0" style="text-align:right"></td><td><button type="button" class="x" data-ixtdel="${i}" title="Remove type">×</button></td></tr>`,
      )
      .join('')}</tbody></table>
    <button type="button" class="btn" id="ixTypeAdd" style="margin-top:8px">+ Add type</button>`;
  const all = emps.reduce((a, e) => a + Number(((S.payroll[m] || {}).rows || {})[e.id]?.inc || 0), 0);
  $('ixFoot').textContent = `${monthLabel(m)}: total incentive for all teams ${money(all)}`;
  ixFillAmt(false);
}
function ixFillAmt(force) {
  const t = incTypes().find((x) => x.name === $('ixType').value);
  if (t && Number(t.amt) && (force || !$('ixAmt').value)) $('ixAmt').value = Number(t.amt);
}
function ixAdd() {
  const id = $('ixEmp').value,
    type = $('ixType').value,
    amt = r2(Number($('ixAmt').value)),
    client = $('ixClient').value.trim(),
    date = $('ixDate').value;
  if (!id) {
    alert('Choose an employee.');
    return;
  }
  if (!type || type === '__new') {
    alert('Choose what the incentive is for.');
    return;
  }
  if (!(amt > 0)) {
    alert('Enter an amount above zero.');
    $('ixAmt').focus();
    return;
  }
  const row = ixRow(id, ixMonth);
  if (!row) return;
  if (row.status === 'Paid') {
    alert('This month is already marked Paid for this person, so it is locked.');
    return;
  }
  ixNormalize(row);
  row.incItems.push({
    id: 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    type,
    client,
    amount: amt,
    date,
  });
  ixApply(row);
  save();
  $('ixClient').value = '';
  const t = incTypes().find((x) => x.name === type);
  $('ixAmt').value = t && Number(t.amt) ? Number(t.amt) : '';
  renderIncx();
  render();
  flash(`Added ${money(amt)} ${type} for ${S.employees.find((e) => e.id === id).name}`);
  $('ixClient').focus();
}
$('ixAdd').addEventListener('click', ixAdd);
['ixClient', 'ixAmt'].forEach((k) =>
  $(k).addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      ixAdd();
    }
  }),
);
$('ixType').addEventListener('change', (ev) => {
  if (ev.target.value === '__new') {
    const n = (prompt('Name of the new incentive type (e.g. Upsell, Renewal):') || '').trim();
    if (n && !incTypes().some((t) => t.name.toLowerCase() === n.toLowerCase())) {
      incTypes().push({ name: n, amt: 0 });
      save();
    }
    renderIncx();
    if (n) $('ixType').value = incTypes().find((t) => t.name.toLowerCase() === n.toLowerCase()).name;
    return;
  }
  $('ixAmt').value = '';
  ixFillAmt(true);
});
$('ixTeams').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-team]');
  if (b) {
    ixTeam = b.dataset.team;
    renderIncx();
  }
});
$('ixList').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-ixdel]');
  if (!b) return;
  const row = ixRow(b.dataset.emp, ixMonth);
  if (!row || row.status === 'Paid') return;
  const x = row.incItems.find((k) => k.id === b.dataset.ixdel);
  if (!x || !confirm(`Remove ${x.type}${x.client ? ' – ' + x.client : ''} (${money(x.amount)})?`)) return;
  row.incItems = row.incItems.filter((k) => k !== x);
  ixApply(row);
  save();
  renderIncx();
  render();
});
$('ixList').addEventListener('change', (ev) => {
  const t = ev.target,
    f = t.dataset.ixf;
  if (!f) return;
  const row = ixRow(t.dataset.emp, ixMonth);
  if (!row || row.status === 'Paid') return;
  const x = row.incItems.find((k) => k.id === t.dataset.item);
  if (!x) return;
  if (f === 'amount') {
    const n = r2(Number(t.value));
    if (!(n > 0)) {
      alert('Enter an amount above zero, or remove the line with ×.');
      t.value = x.amount;
      return;
    }
    x.amount = n;
  } else x.client = t.value.trim();
  ixApply(row);
  save();
  renderIncx();
  render();
});
$('ixTypes').addEventListener('change', (ev) => {
  const t = ev.target,
    k = t.dataset.ixt;
  if (!k) return;
  const ty = incTypes()[+t.dataset.i];
  if (!ty) return;
  if (k === 'name') {
    const n = t.value.trim();
    if (n) ty.name = n;
    else t.value = ty.name;
  } else ty.amt = Math.max(0, r2(Number(t.value) || 0));
  save();
  renderIncx();
  $('ixTypes').open = true;
});
$('ixTypes').addEventListener('click', (ev) => {
  if (ev.target.id === 'ixTypeAdd') {
    incTypes().push({ name: 'New type ' + (incTypes().length + 1), amt: 0 });
    save();
    renderIncx();
    $('ixTypes').open = true;
    return;
  }
  const d = ev.target.closest('[data-ixtdel]');
  if (d) {
    const i = +d.dataset.ixtdel;
    if (incTypes().length <= 1) return;
    if (confirm(`Remove the type "${incTypes()[i].name}"? Incentives already added keep their name.`)) {
      incTypes().splice(i, 1);
      save();
      renderIncx();
      $('ixTypes').open = true;
    }
  }
});
$('ixClose').addEventListener('click', () => $('incxDlg').close());
$('ixDone').addEventListener('click', () => $('incxDlg').close());
/* button in the Payroll header */
const ixBtn = document.createElement('button');
ixBtn.type = 'button';
ixBtn.className = 'btn primary';
ixBtn.id = 'ixOpen';
ixBtn.textContent = '+ Add incentives';
document.getElementById('csvBtn').insertAdjacentElement('beforebegin', ixBtn);
ixBtn.addEventListener('click', openIncx);
