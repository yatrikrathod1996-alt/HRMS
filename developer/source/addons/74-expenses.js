/* ============================================================
   EXPENSE CLAIMS (Pay → Expenses)
   A claim is recorded, then approved or rejected. Approving adds
   the amount to Reimbursement in the chosen payroll month (with
   the claim as the reason); undoing it takes it off again. Once
   that payroll month is marked Paid the claim shows as Paid and
   can no longer change. Data: S.expenseClaims (amounts in INR).
   ============================================================ */
const EXP_CATS = [
  'Travel',
  'Fuel / cab',
  'Food',
  'Internet / phone',
  'Office supplies',
  'Software / subscription',
  'Client meeting',
  'Training',
  'Other',
];
const expList = () => {
  if (!Array.isArray(S.expenseClaims)) S.expenseClaims = [];
  return S.expenseClaims;
};
const expEmp = (id) => S.employees.find((e) => e.id === id);
const expRow = (c) => S.payroll[c.payMonth]?.rows?.[c.empId];
// what the claim is now: a claim approved into a month that has since been paid is Paid
const expStatus = (c) => (c.status === 'Approved' && expRow(c)?.status === 'Paid' ? 'Paid' : c.status);
const expNote = (c) => `Expense claim ${c.ref}`;
let expFilter = { status: 'open', emp: 'all', q: '' },
  expEditing = null;

document.getElementById('tab-settings').insertAdjacentHTML(
  'beforebegin',
  `<section id="tab-expenses" class="hide">
  <div class="top"><div><h2>Expense claims</h2><p>Approved claims are paid as reimbursement with salary.</p></div>
    <div class="controls"><button class="btn primary" type="button" id="expAdd">+ New claim</button></div></div>
  <div class="ast-cards" id="expCards"></div>
  <div class="ast-tools">
    <input id="expQ" placeholder="Search claim, person or description" aria-label="Search claims">
    <label class="inline">Show <select id="expStatus"><option value="open">Open (to review or to pay)</option><option value="Approved">Approved (to pay)</option><option value="Paid">Paid</option><option value="Rejected">Rejected</option><option value="all">All</option></select></label>
    <label class="inline">Employee <select id="expEmp"></select></label>
  </div>
  <div class="tablewrap"><table id="expTable"></table></div>
</section>`,
);
document.body.insertAdjacentHTML(
  'beforeend',
  `<dialog id="expDlg" aria-labelledby="expDlgTitle"><div class="mhead"><h3 id="expDlgTitle">New claim</h3><button class="btn" type="button" data-close="expDlg">Close</button></div>
  <div class="mbody"><div class="form ast-form">
    <label class="wide">Employee<select id="expFEmp"></select></label>
    <label>Date spent<input type="date" id="expFDate"></label>
    <label>Category<select id="expFCat">${EXP_CATS.map((c) => `<option>${c}</option>`).join('')}</select></label>
    <label>Amount (₹)<input type="number" min="0" step="0.01" id="expFAmt"></label>
    <label>Bill / receipt number<input id="expFBill"></label>
    <label class="wide">Description<input id="expFDesc" placeholder="e.g. Cab to client office, Ahmedabad"></label>
    <label class="wide">Receipt link or file path<input id="expFReceipt" placeholder="Google Drive / OneDrive link"></label>
  </div><p class="ast-error" id="expFError" role="alert"></p></div>
  <div class="mfoot"><button class="btn" type="button" data-close="expDlg">Cancel</button><button class="btn primary" type="button" id="expFSave">Save claim</button></div></dialog>
<dialog id="expDecDlg" aria-labelledby="expDecTitle"><div class="mhead"><h3 id="expDecTitle">Approve claim</h3><button class="btn" type="button" data-close="expDecDlg">Close</button></div>
  <div class="mbody"><p class="ast-sub" id="expDecSub"></p><div class="form ast-form" id="expDecForm"></div><p class="ast-error" id="expDecError" role="alert"></p></div>
  <div class="mfoot"><button class="btn" type="button" data-close="expDecDlg">Cancel</button><button class="btn primary" type="button" id="expDecSave">Approve</button></div></dialog>`,
);
addTab('expenses', {
  label: 'Expenses',
  section: 'tab-expenses',
  place: ['#navIncrements', 'beforebegin'],
  render: () => renderExpenses(),
});

const expMoney = (n) => '₹' + numFmt(n, 'INR');
function renderExpenses() {
  const all = expList();
  const sum = (st) => r2(all.filter((c) => expStatus(c) === st).reduce((s, c) => s + Number(c.amount), 0));
  const n = (st) => all.filter((c) => expStatus(c) === st).length;
  $('expCards').innerHTML = [
    [n('Submitted'), 'To review · ' + expMoney(sum('Submitted')), 'amber'],
    [n('Approved'), 'Approved, to pay · ' + expMoney(sum('Approved')), 'blue'],
    [n('Paid'), 'Paid · ' + expMoney(sum('Paid')), 'green'],
    [n('Rejected'), 'Rejected', ''],
  ]
    .map(([v, l, c]) => `<div class="ast-card ${c}"><b>${v}</b><span>${l}</span></div>`)
    .join('');
  const people = [...new Set(all.map((c) => c.empId))]
    .map(expEmp)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
  $('expEmp').innerHTML =
    '<option value="all">All</option>' +
    people
      .map(
        (e) => `<option value="${e.id}" ${expFilter.emp === e.id ? 'selected' : ''}>${esc(e.name)}</option>`,
      )
      .join('');
  const q = expFilter.q.trim().toLowerCase();
  const rows = all
    .filter((c) =>
      expFilter.status === 'all'
        ? true
        : expFilter.status === 'open'
          ? ['Submitted', 'Approved'].includes(expStatus(c)) // approved claims stay visible until paid (undo is here)
          : expStatus(c) === expFilter.status,
    )
    .filter((c) => expFilter.emp === 'all' || c.empId === expFilter.emp)
    .filter(
      (c) =>
        !q ||
        [c.ref, c.desc, c.category, c.bill, expEmp(c.empId)?.name].some((v) =>
          String(v || '')
            .toLowerCase()
            .includes(q),
        ),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.ref.localeCompare(a.ref));
  const pill = (st) => `<span class="ast-pill st-exp-${st.toLowerCase()}">${st}</span>`;
  $('expTable').innerHTML =
    `<thead><tr><th>Claim</th><th>Employee</th><th>Date</th><th>Category · description</th><th class="num">Amount</th><th>Status</th><th></th></tr></thead><tbody>` +
    (rows.length
      ? rows
          .map((c) => {
            const e = expEmp(c.empId),
              st = expStatus(c);
            const link = profileLink(c.receipt);
            const acts =
              st === 'Submitted'
                ? `<button class="btn-s" type="button" data-exp-act="approve" data-exp="${c.id}">Approve</button><button class="btn-s" type="button" data-exp-act="reject" data-exp="${c.id}">Reject</button>`
                : st === 'Approved'
                  ? `<button class="btn-s" type="button" data-exp-act="undo" data-exp="${c.id}">Undo approval</button>`
                  : st === 'Rejected'
                    ? `<button class="btn-s" type="button" data-exp-act="reopen" data-exp="${c.id}">Reopen</button>`
                    : '';
            return `<tr><td><b>${esc(c.ref)}</b>${c.bill ? `<small>Bill ${esc(c.bill)}</small>` : ''}</td>
            <td>${e ? `<button type="button" class="linkish" data-exp-prof="${e.id}">${esc(e.name)}</button><small>${esc(e.department || '')}</small>` : esc(c.empId)}</td>
            <td>${fmtLong(c.date)}</td><td>${esc(c.category)}<small>${esc(c.desc || '')}${link ? ` · <a href="${esc(link)}" target="_blank" rel="noopener noreferrer">Receipt ↗</a>` : ''}</small></td>
            <td class="num"><b>${expMoney(c.amount)}</b></td>
            <td>${pill(st)}${c.payMonth && st !== 'Rejected' ? `<small>${st === 'Paid' ? 'paid in' : 'in'} ${esc(monthLabel(c.payMonth))} payroll</small>` : ''}${c.decisionNote ? `<small>${esc(c.decisionNote)}</small>` : ''}</td>
            <td class="ast-actions">${acts}${st === 'Submitted' || st === 'Rejected' ? `<details class="ast-more"><summary aria-label="More actions for ${esc(c.ref)}">⋯</summary><div><button type="button" data-exp-act="edit" data-exp="${c.id}">Edit</button><button type="button" data-exp-act="delete" data-exp="${c.id}">Delete</button></div></details>` : ''}</td></tr>`;
          })
          .join('')
      : `<tr><td colspan="7" class="empty-state">${all.length ? 'No claims here.' : 'No claims yet. Record one with “+ New claim”.'}</td></tr>`) +
    '</tbody>';
}
function expOpenForm(c) {
  expEditing = c || null;
  const people = S.employees
    .filter((e) => e.status === 'Active' || (c && e.id === c.empId))
    .sort((a, b) => a.name.localeCompare(b.name));
  $('expFEmp').innerHTML =
    '<option value="">Choose an employee…</option>' +
    people.map((e) => `<option value="${e.id}">${esc(e.name)} (${e.id})</option>`).join('');
  $('expDlgTitle').textContent = c ? 'Edit ' + c.ref : 'New claim';
  $('expFEmp').value = c ? c.empId : '';
  $('expFDate').value = c ? c.date : todayISO();
  $('expFCat').value = c ? c.category : 'Travel';
  $('expFAmt').value = c ? c.amount : '';
  $('expFBill').value = c ? c.bill || '' : '';
  $('expFDesc').value = c ? c.desc || '' : '';
  $('expFReceipt').value = c ? c.receipt || '' : '';
  $('expFError').textContent = '';
  $('expDlg').showModal();
}
$('expFSave').addEventListener('click', () => {
  const v = {
    empId: $('expFEmp').value,
    date: $('expFDate').value,
    category: $('expFCat').value,
    amount: r2(Number($('expFAmt').value)),
    bill: $('expFBill').value.trim(),
    desc: $('expFDesc').value.trim(),
    receipt: $('expFReceipt').value.trim(),
  };
  const dup =
    v.bill &&
    expList().some(
      (c) =>
        c !== expEditing &&
        c.empId === v.empId &&
        c.bill &&
        c.bill.toLowerCase() === v.bill.toLowerCase() &&
        c.status !== 'Rejected',
    );
  const err = !expEmp(v.empId)
    ? 'Choose the employee.'
    : !/^\d{4}-\d{2}-\d{2}$/.test(v.date)
      ? 'Enter the date the money was spent.'
      : v.date > todayISO()
        ? 'The date cannot be in the future.'
        : !(v.amount > 0)
          ? 'Enter an amount above ₹0.'
          : !v.desc
            ? 'Add a short description.'
            : dup
              ? `Bill ${v.bill} is already claimed by this employee.`
              : '';
  if (err) {
    $('expFError').textContent = err;
    return;
  }
  if (expEditing) Object.assign(expEditing, v);
  else {
    const year = v.date.slice(0, 4),
      used = expList()
        .filter((c) => c.ref.startsWith(`EXP-${year}-`))
        .map((c) => Number(c.ref.slice(9)) || 0);
    expList().push({
      id: 'exp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      ref: `EXP-${year}-${String(Math.max(0, ...used) + 1).padStart(3, '0')}`,
      ...v,
      status: 'Submitted',
      createdAt: Date.now(),
    });
  }
  save();
  $('expDlg').close();
  expFilter.status = 'open';
  $('expStatus').value = 'open';
  renderExpenses();
  flash(expEditing ? 'Claim updated' : 'Claim recorded');
});
// payroll months that can still take the claim: the claim's month onwards, not marked Paid
function expPayMonths(c) {
  const out = [],
    [y, m] = ym(c.date.slice(0, 7));
  for (let i = 0; i < 4; i++) {
    const d = new Date(y, m - 1 + i, 1),
      key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if (S.payroll[key]?.rows?.[c.empId]?.status !== 'Paid') out.push(key);
  }
  const cur = currentMonth();
  if (!out.includes(cur) && cur > c.date.slice(0, 7) && S.payroll[cur]?.rows?.[c.empId]?.status !== 'Paid')
    out.push(cur);
  return out.sort();
}
let expDeciding = null;
function expOpenDecision(c, act) {
  expDeciding = { c, act };
  const e = expEmp(c.empId);
  $('expDecTitle').textContent = act === 'approve' ? 'Approve ' + c.ref : 'Reject ' + c.ref;
  $('expDecSave').textContent = act === 'approve' ? 'Approve' : 'Reject';
  $('expDecSub').textContent =
    `${e ? e.name : c.empId} · ${c.category} · ${expMoney(c.amount)} · ${fmtLong(c.date)}${c.desc ? ' · ' + c.desc : ''}`;
  $('expDecError').textContent = '';
  const months = expPayMonths(c),
    pick = months.find((m) => m >= month) || months[months.length - 1];
  $('expDecForm').innerHTML =
    act === 'approve'
      ? months.length
        ? `<label class="wide">Pay with the salary of<select id="expDecMonth">${months.map((m) => `<option value="${m}" ${m === pick ? 'selected' : ''}>${esc(monthLabel(m))}</option>`).join('')}</select></label><label class="wide">Note (optional)<input id="expDecNote"></label>`
        : '<p class="ast-error">Every payroll month from the claim date is already marked Paid. Pay it outside payroll, or reopen a month.</p>'
      : `<label class="wide">Reason<input id="expDecNote" placeholder="e.g. no receipt, personal expense"></label>`;
  $('expDecSave').disabled = act === 'approve' && !months.length;
  $('expDecDlg').showModal();
}
function expAddToPayroll(c, sign) {
  const e = expEmp(c.empId);
  if (!e) return false;
  if (sign > 0) pay(e, c.payMonth); // creates the payroll row if the month has none yet
  const row = expRow(c);
  if (!row || row.status === 'Paid') return false;
  row.reimb = r2(Math.max(0, Number(row.reimb || 0) + sign * Number(c.amount)));
  const note = expNote(c);
  if (sign > 0) row.reason = row.reason ? row.reason + '; ' + note : note;
  else
    row.reason = String(row.reason || '')
      .split('; ')
      .filter((x) => x !== note)
      .join('; ');
  return true;
}
$('expDecSave').addEventListener('click', () => {
  const { c, act } = expDeciding || {};
  if (!c) return;
  const note = $('expDecNote') ? $('expDecNote').value.trim() : '';
  if (act === 'approve') {
    c.payMonth = $('expDecMonth').value;
    if (!expAddToPayroll(c, 1)) {
      $('expDecError').textContent = 'That payroll month is already marked Paid.';
      return;
    }
    c.status = 'Approved';
  } else {
    if (!note) {
      $('expDecError').textContent = 'Add the reason for rejecting it.';
      return;
    }
    c.status = 'Rejected';
    c.payMonth = '';
  }
  c.decisionNote = note;
  c.decidedAt = Date.now();
  save();
  $('expDecDlg').close();
  renderExpenses();
  flash(act === 'approve' ? `Approved · added to ${monthLabel(c.payMonth)} payroll` : 'Claim rejected');
});
$('expAdd').addEventListener('click', () => expOpenForm(null));
$('expQ').addEventListener('input', (ev) => {
  expFilter.q = ev.target.value;
  renderExpenses();
});
$('expStatus').addEventListener('change', (ev) => {
  expFilter.status = ev.target.value;
  renderExpenses();
});
$('expEmp').addEventListener('change', (ev) => {
  expFilter.emp = ev.target.value;
  renderExpenses();
});
$('expTable').addEventListener('click', (ev) => {
  const prof = ev.target.closest('[data-exp-prof]');
  if (prof) return openEmployeeProfile(prof.dataset.expProf);
  const b = ev.target.closest('[data-exp-act]');
  if (!b) return;
  const c = expList().find((x) => x.id === b.dataset.exp);
  if (!c) return;
  b.closest('details')?.removeAttribute('open');
  const act = b.dataset.expAct;
  if (act === 'approve' || act === 'reject') expOpenDecision(c, act);
  else if (act === 'edit') expOpenForm(c);
  else if (act === 'undo') {
    if (
      !confirm(
        `Undo the approval of ${c.ref}? ${expMoney(c.amount)} is taken off ${monthLabel(c.payMonth)} reimbursement.`,
      )
    )
      return;
    if (!expAddToPayroll(c, -1))
      return alert('That payroll month is already marked Paid, so the claim is paid.');
    c.status = 'Submitted';
    c.payMonth = '';
    c.decisionNote = '';
    save();
    renderExpenses();
  } else if (act === 'reopen') {
    c.status = 'Submitted';
    c.decisionNote = '';
    save();
    renderExpenses();
  } else if (act === 'delete' && confirm(`Delete ${c.ref}?`)) {
    S.expenseClaims = expList().filter((x) => x !== c);
    save();
    renderExpenses();
  }
});
