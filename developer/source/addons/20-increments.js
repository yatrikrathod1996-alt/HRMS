/* ---------- SALARY INCREMENTS (history, payroll update, arrears, letter) ---------- */
const INC_HTML = `<section id="tab-increments" class="hide">
  <div class="top"><div><h2>Salary increments</h2><p>Payroll and the profile update from the effective date.</p></div></div>
  <div class="iwrap">
    <div class="dpanel ipanel"><div class="dscroll">
      <div class="dsec" id="iFormTitle">New increment</div>
      <label>Employee<select id="iEmp"></select></label>
      <div class="icur" id="iCur"></div>
      <label>Effective from (date)<input type="date" id="iDate"></label>
      <label>New monthly fixed salary (₹)<input type="number" id="iSal" min="0" step="1"></label>
      <label>Performance bonus per month (₹)<input type="number" id="iVar" min="0" step="1" placeholder="0 if none"></label>
      <label>How the performance bonus is paid<select id="iVarMode"><option value="fixed">Every month, as fixed variable pay</option><option value="approved">Only when approved (enter it in Payroll each month)</option></select></label>
      <label>Designation from this date<input id="iDesig"></label>
      <label>Employment type from this date<select id="iType"><option>Full-time</option><option>Probation</option><option>Intern</option><option>Contractor</option></select></label>
      <label>Reason<input id="iReason" placeholder="e.g. Annual increment, promotion, performance review"></label>
      <label class="chk"><input type="checkbox" id="iArrears" checked> Pay arrears for months already marked Paid</label>
      <div id="iPlan" class="iplan"></div>
    </div>
    <div class="dacts">
      <button class="btn primary" type="button" id="iSave">Save increment</button>
      <button class="btn" type="button" id="iSaveLetter">Save &amp; make letter</button>
      <button class="btn" type="button" id="iCancel">Clear</button>
    </div></div>
    <div class="iview">
      <div class="dtools"><b>Increment history</b><label class="inline" style="margin-left:auto">Employee <select id="iFilter"></select></label></div>
      <div class="tablewrap"><table id="iLog"></table></div>
    </div>
  </div>
</section>`;
document.getElementById('tab-settings').insertAdjacentHTML('beforebegin', INC_HTML);
addTab('increments', {
  label: 'Increments',
  section: 'tab-increments',
  place: ['#navDocuments', 'afterend'],
  render: () => renderIncrements(),
});
const showInc = (scroll) => showTab('increments', scroll);
let incEdit = null;

const incList = () => {
  if (!Array.isArray(S.increments)) S.increments = [];
  return S.increments;
};
const empOf = (id) => S.employees.find((e) => e.id === id);
const inr = (n) => '₹' + numFmt(n, 'INR');

function incForm() {
  const e = empOf($('iEmp').value);
  return {
    empId: $('iEmp').value,
    date: $('iDate').value,
    newSalary: Number($('iSal').value),
    newVar: Number($('iVar').value || 0),
    varMode: $('iVarMode').value,
    newDesignation: $('iDesig').value.trim(),
    newType: $('iType').value,
    reason: $('iReason').value.trim(),
    arrears: $('iArrears').checked,
    oldSalary: incEdit ? incEdit.oldSalary : Number(e ? e.salary : 0),
    oldVar: incEdit ? incEdit.oldVar : Number(e ? e.variable || 0 : 0),
    oldDesignation: incEdit ? incEdit.oldDesignation : e ? e.designation || '' : '',
    oldType: incEdit ? incEdit.oldType : e ? e.type || '' : '',
  };
}
/* Works out exactly what changes in payroll; nothing is changed until you save */
function planInc(r) {
  const effM = r.date.slice(0, 7),
    day = Number(r.date.slice(8, 10)),
    months = Object.keys(S.payroll || {})
      .filter((m) => m >= effM)
      .sort();
  const rows = [],
    arrearsFrom = [];
  let arrears = 0;
  for (const m of months) {
    const row = S.payroll[m].rows && S.payroll[m].rows[r.empId];
    if (!row) continue;
    const D = daysIn(m),
      frac = m === effM && day > 1 ? (D - day + 1) / D : 1;
    const curSal = Number(row.salary != null ? row.salary : r.oldSalary),
      curVar = Number(row.variable || 0);
    const tSal = frac < 1 ? r2(r.oldSalary * (1 - frac) + r.newSalary * frac) : r.newSalary;
    const tVar =
      r.varMode === 'fixed' ? (frac < 1 ? r2(r.oldVar * (1 - frac) + r.newVar * frac) : r.newVar) : curVar;
    if (row.status === 'Paid') {
      if (r.arrears) {
        const diff = r2(tSal - curSal + (tVar - curVar));
        if (diff > 0) {
          arrears = r2(arrears + diff);
          arrearsFrom.push({ m, diff, frac });
        }
      }
      continue;
    }
    rows.push({ m, frac, tSal, tVar, curSal, curVar });
  }
  let arrMonth = null;
  if (arrears > 0) {
    const unpaid = Object.keys(S.payroll || {})
      .filter(
        (m) =>
          m >= effM &&
          S.payroll[m].rows &&
          S.payroll[m].rows[r.empId] &&
          S.payroll[m].rows[r.empId].status !== 'Paid',
      )
      .sort();
    arrMonth =
      unpaid[0] ||
      (() => {
        const last = Object.keys(S.payroll).sort().pop() || effM;
        const [y, mo] = ym(last > effM ? last : effM);
        return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
      })();
  }
  return { rows, arrears, arrearsFrom, arrMonth };
}
function validInc(r) {
  if (!r.empId) return 'Choose the employee.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return 'Enter the effective date.';
  if (!(r.newSalary > 0)) return 'Enter the new monthly fixed salary.';
  if (r.newVar < 0) return 'The performance bonus cannot be negative.';
  const others = incList().filter((x) => x.empId === r.empId && x !== incEdit && x.date > r.date);
  if (others.length)
    return `There is a later increment for this employee (from ${fmtLong(others[0].date)}). Edit or delete that one first.`;
  return '';
}
function renderPlan() {
  const r = incForm(),
    e = empOf(r.empId),
    box = $('iPlan');
  $('iCur').innerHTML = e
    ? `<b>Now:</b> ${inr(incEdit ? incEdit.oldSalary : e.salary)} fixed${(incEdit ? incEdit.oldVar : e.variable) ? ` + ${inr(incEdit ? incEdit.oldVar : e.variable)} variable` : ''} · ${esc((incEdit ? incEdit.oldDesignation : e.designation) || 'No designation')} · ${esc((incEdit ? incEdit.oldType : e.type) || '')}${e.currency !== 'INR' ? ' · <span class="bad pill">paid in USD</span>' : ''}`
    : '';
  if (!e || !r.newSalary || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) {
    box.innerHTML = '<p class="hint">Fill in the employee, date and new salary to see what will change.</p>';
    return;
  }
  const err = validInc(r),
    up = r.newSalary - r.oldSalary,
    pct = r.oldSalary ? Math.round((up / r.oldSalary) * 1000) / 10 : 0;
  const plan = planInc(r);
  let h = `<div class="dsec">What will change</div><ul>`;
  h += `<li>Fixed salary <b>${inr(r.oldSalary)} → ${inr(r.newSalary)}</b> (${up >= 0 ? '+' : ''}${inr(up)}, ${pct}%) from <b>${fmtLong(r.date)}</b>.</li>`;
  if (r.varMode === 'fixed' && r.newVar !== r.oldVar)
    h += `<li>Performance bonus paid every month: <b>${inr(r.oldVar)} → ${inr(r.newVar)}</b>.</li>`;
  if (r.varMode === 'approved' && r.newVar)
    h += `<li>Performance bonus up to ${inr(r.newVar)} a month is entered in Payroll each month when approved (not added automatically).</li>`;
  if (r.newDesignation && r.newDesignation !== r.oldDesignation)
    h += `<li>Designation: ${esc(r.oldDesignation || '—')} → <b>${esc(r.newDesignation)}</b>.</li>`;
  if (r.newType !== r.oldType)
    h += `<li>Employment type: ${esc(r.oldType || '—')} → <b>${esc(r.newType)}</b>.</li>`;
  plan.rows.forEach((x) => {
    h += `<li>${monthLabel(x.m)} payroll: salary ${inr(x.curSal)} → <b>${inr(x.tSal)}</b>${x.frac < 1 ? ` (split by days: old rate before ${fmtLong(r.date)}, new rate from then)` : ''}${r.varMode === 'fixed' && x.tVar !== x.curVar ? `, variable ${inr(x.curVar)} → ${inr(x.tVar)}` : ''}.</li>`;
  });
  if (plan.arrears)
    h += `<li>Arrears of <b>${inr(plan.arrears)}</b> for ${plan.arrearsFrom.map((a) => monthLabel(a.m) + (a.frac < 1 ? ' (part month)' : '')).join(', ')} (already paid at the old rate) will be added to ${monthLabel(plan.arrMonth)} payroll as an incentive.</li>`;
  h += `<li>Months after the last saved payroll month use the new salary automatically.</li></ul>`;
  if (incEdit)
    h += `<p class="hint">Editing: the changes made by this increment are undone first, then the new values are applied.</p>`;
  if (e.currency !== 'INR')
    h += `<p class="dnote dwarn">This employee is paid in USD. Enter the new salary in USD.</p>`;
  if (err) h += `<p class="dnote dwarn">${esc(err)}</p>`;
  box.innerHTML = h;
}
function applyInc(r) {
  const e = empOf(r.empId),
    plan = planInc(r),
    touched = [];
  for (const x of plan.rows) {
    const row = S.payroll[x.m].rows[r.empId];
    touched.push({
      m: x.m,
      salary: row.salary,
      variable: row.variable,
      sfp: row.salaryFromProfile,
      vfp: row.variableFromProfile,
      reason: row.reason,
      status: row.status,
    });
    row.salary = x.tSal;
    if (r.varMode === 'fixed') row.variable = x.tVar;
    row.salaryFromProfile = x.frac === 1;
    row.variableFromProfile = x.frac === 1;
    if (x.frac < 1)
      row.reason =
        (row.reason ? row.reason + '; ' : '') + `Salary split for increment from ${fmtLong(r.date)}`;
    if (row.status !== 'Paid') row.status = 'Pending';
  }
  let arr = null;
  if (plan.arrears > 0) {
    const m = plan.arrMonth;
    S.payroll[m] = S.payroll[m] || { fx: S.settings.fx, rows: {} };
    S.payroll[m].rows = S.payroll[m].rows || {};
    const row = (S.payroll[m].rows[r.empId] = S.payroll[m].rows[r.empId] || {
      inc: 0,
      bonus: 0,
      reimb: 0,
      other: 0,
      reason: '',
      status: 'Pending',
    });
    const note = `Increment arrears ${inr(plan.arrears)} for ${plan.arrearsFrom.map((a) => monthLabel(a.m)).join(', ')}`;
    arr = { m, amount: plan.arrears, prevInc: row.inc, prevReason: row.reason, note };
    row.inc = r2(Number(row.inc || 0) + plan.arrears);
    row.reason = (row.reason ? row.reason + '; ' : '') + note;
  }
  const prof = { salary: e.salary, variable: e.variable, designation: e.designation, type: e.type };
  e.salary = r.newSalary;
  if (r.varMode === 'fixed') e.variable = r.newVar;
  if (r.newDesignation) e.designation = r.newDesignation;
  if (r.newType) e.type = r.newType;
  return { touched, arr, prof };
}
function unapplyInc(rec) {
  const e = empOf(rec.empId),
    a = rec.applied;
  if (!a) return;
  (a.touched || []).forEach((t) => {
    const row = S.payroll[t.m] && S.payroll[t.m].rows && S.payroll[t.m].rows[rec.empId];
    if (!row || row.status === 'Paid') return;
    row.salary = t.salary;
    row.variable = t.variable;
    row.salaryFromProfile = t.sfp;
    row.variableFromProfile = t.vfp;
    row.reason = t.reason;
  });
  if (a.arr) {
    const row = S.payroll[a.arr.m] && S.payroll[a.arr.m].rows && S.payroll[a.arr.m].rows[rec.empId];
    if (row && row.status !== 'Paid') {
      row.inc = r2(Number(row.inc || 0) - a.arr.amount);
      if (row.inc < 0.005) row.inc = 0;
      row.reason = String(row.reason || '')
        .replace('; ' + a.arr.note, '')
        .replace(a.arr.note, '');
    }
  }
  if (e && a.prof) {
    e.salary = a.prof.salary;
    e.variable = a.prof.variable;
    e.designation = a.prof.designation;
    e.type = a.prof.type;
  }
}
function saveInc(makeLetter) {
  const r = incForm(),
    err = validInc(r);
  if (err) {
    alert(err);
    return;
  }
  const e = empOf(r.empId);
  if (
    !confirm(
      `${incEdit ? 'Update' : 'Save'} this increment for ${e.name}?\n\n${inr(r.oldSalary)} → ${inr(r.newSalary)} from ${fmtLong(r.date)}.\nThe profile and the payroll months listed under "What will change" will be updated.`,
    )
  )
    return;
  let rec = incEdit;
  if (rec) {
    unapplyInc(rec);
    Object.assign(rec, r, { updatedAt: Date.now() });
  } else {
    rec = { id: 'inc' + Date.now().toString(36), ...r, createdAt: Date.now() };
    incList().push(rec);
  }
  rec.applied = applyInc(rec);
  save();
  incEdit = null;
  resetIncForm();
  renderIncrements();
  flash(`Increment saved for ${e.name}`);
  if (makeLetter) incLetter(rec);
}
function incLetter(rec) {
  const e = empOf(rec.empId);
  if (!e) return;
  showDocs(true);
  dType = 'revision';
  dManual = false;
  renderDocuments();
  const sel = $('dEmp');
  sel.value = rec.empId;
  sel.dispatchEvent(new Event('change'));
  const V = dVals();
  Object.assign(V, {
    effDate: rec.date,
    curFixed: rec.oldSalary,
    newFixed: rec.newSalary,
    bonus: rec.newVar || '',
    revDesignation: rec.newDesignation && rec.newDesignation !== rec.oldDesignation ? rec.newDesignation : '',
    designation: rec.oldDesignation || e.designation,
  });
  rec.letterRef = V.ref;
  save();
  renderDocForm();
  renderDocPreview();
}
function resetIncForm() {
  incEdit = null;
  $('iFormTitle').textContent = 'New increment';
  $('iSave').textContent = 'Save increment';
  ['iDate', 'iSal', 'iVar', 'iReason', 'iDesig'].forEach((k) => ($(k).value = ''));
  $('iVarMode').value = 'fixed';
  $('iArrears').checked = true;
  fillIncEmp();
}
function fillIncEmp() {
  const e = empOf($('iEmp').value);
  if (!e || incEdit) {
    renderPlan();
    return;
  }
  $('iDesig').value = e.designation || '';
  $('iType').value = ['Full-time', 'Probation', 'Intern', 'Contractor'].includes(e.type)
    ? e.type
    : 'Full-time';
  if (!$('iVar').value) $('iVar').value = e.variable || '';
  renderPlan();
}
function renderIncrements() {
  const act = S.employees.filter((e) => e.status === 'Active').sort((a, b) => a.name.localeCompare(b.name)),
    keep = $('iEmp').value;
  $('iEmp').innerHTML =
    '<option value="">Choose an employee…</option>' +
    act.map((e) => `<option value="${e.id}">${esc(e.name)} (${e.id})</option>`).join('');
  if (keep) $('iEmp').value = keep;
  const fk = $('iFilter').value;
  const withInc = [...new Set(incList().map((r) => r.empId))];
  $('iFilter').innerHTML =
    '<option value="">All employees</option>' +
    withInc
      .map((id) => {
        const e = empOf(id);
        return `<option value="${id}">${esc(e ? e.name : id)}</option>`;
      })
      .join('');
  if (fk) $('iFilter').value = fk;
  const rows = incList()
    .filter((r) => !$('iFilter').value || r.empId === $('iFilter').value)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  $('iLog').innerHTML =
    `<thead><tr><th>Effective from</th><th>Employee</th><th>Salary change</th><th>Designation</th><th>Payroll &amp; letter</th><th></th></tr></thead><tbody>` +
    (rows.length
      ? rows
          .map((r) => {
            const e = empOf(r.empId),
              up = r.newSalary - r.oldSalary,
              pct = r.oldSalary ? Math.round((up / r.oldSalary) * 1000) / 10 : 0,
              a = r.applied || {};
            return `<tr><td><b>${fmtLong(r.date)}</b><div class="idc">${monthLabel(r.date.slice(0, 7))} · recorded ${new Date(r.updatedAt || r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div></td>
       <td><div class="name">${esc(e ? e.name : r.empId)}</div><div class="idc">${esc(r.empId)}${r.reason ? ' · ' + esc(r.reason) : ''}</div></td>
       <td>${inr(r.oldSalary)} → <b>${inr(r.newSalary)}</b> <span class="pill ok">${up >= 0 ? '+' : ''}${inr(up)} · ${pct}%</span>${r.newVar ? `<div class="idc">Performance bonus ${inr(r.newVar)} a month, ${r.varMode === 'fixed' ? 'paid every month' : 'paid when approved'}</div>` : ''}</td>
       <td>${r.newDesignation && r.newDesignation !== r.oldDesignation ? `${esc(r.oldDesignation || '—')} →<br><b>${esc(r.newDesignation)}</b>` : esc(r.newDesignation || r.oldDesignation || '—')}</td>
       <td class="idc">${(a.touched || []).length ? `${a.touched.map((t) => monthLabel(t.m)).join(', ')} updated` : 'Applies from the next payroll month'}${a.arr ? `<br>Arrears ${inr(a.arr.amount)} added to ${monthLabel(a.arr.m)}` : ''}<br>${r.letterRef ? `Letter ${esc(r.letterRef)} · ` : ''}<button class="linkish" data-iletter="${r.id}">${r.letterRef ? 'Open letter' : 'Make letter'}</button></td>
       <td style="white-space:nowrap"><button class="linkish" data-iedit="${r.id}">Edit</button> &nbsp; <button class="linkish" style="color:var(--unpaid)" data-idel="${r.id}">Delete</button></td></tr>`;
          })
          .join('')
      : `<tr><td colspan="6" class="idc">No increments recorded yet.</td></tr>`) +
    '</tbody>';
  renderPlan();
}
['iEmp'].forEach((k) =>
  $(k).addEventListener('change', () => {
    if (!incEdit) {
      $('iVar').value = '';
      fillIncEmp();
    }
  }),
);
['iDate', 'iSal', 'iVar', 'iVarMode', 'iDesig', 'iType', 'iReason', 'iArrears'].forEach((k) =>
  $(k).addEventListener('input', renderPlan),
);
$('iVarMode').addEventListener('change', renderPlan);
$('iArrears').addEventListener('change', renderPlan);
$('iType').addEventListener('change', renderPlan);
$('iFilter').addEventListener('change', renderIncrements);
$('iSave').onclick = () => saveInc(false);
$('iSaveLetter').onclick = () => saveInc(true);
$('iCancel').onclick = () => {
  resetIncForm();
  renderPlan();
};
$('iLog').addEventListener('click', (ev) => {
  const t = ev.target,
    id = t.dataset.iedit || t.dataset.idel || t.dataset.iletter;
  if (!id) return;
  const rec = incList().find((r) => r.id === id);
  if (!rec) return;
  if (t.dataset.iletter) {
    if (rec.letterRef) {
      const d = S.docs.find((x) => x.ref === rec.letterRef);
      if (d) {
        showDocs(true);
        dType = d.type;
        S.docDrafts[d.type] = JSON.parse(JSON.stringify(d.vals));
        dManual = !!d.html;
        dManualHTML = d.html || '';
        renderDocuments();
        return;
      }
    }
    incLetter(rec);
    return;
  }
  if (t.dataset.iedit) {
    incEdit = rec;
    $('iFormTitle').textContent = `Edit increment from ${fmtLong(rec.date)}`;
    $('iSave').textContent = 'Update increment';
    $('iEmp').value = rec.empId;
    $('iDate').value = rec.date;
    $('iSal').value = rec.newSalary;
    $('iVar').value = rec.newVar || '';
    $('iVarMode').value = rec.varMode || 'fixed';
    $('iDesig').value = rec.newDesignation || '';
    $('iType').value = rec.newType || 'Full-time';
    $('iReason').value = rec.reason || '';
    $('iArrears').checked = rec.arrears !== false;
    renderPlan();
    $('tab-increments').scrollTop = 0;
    return;
  }
  if (t.dataset.idel) {
    const later = incList().some((r) => r.empId === rec.empId && r !== rec && r.date > rec.date);
    if (later) {
      alert('Delete the later increment for this employee first.');
      return;
    }
    if (
      !confirm(
        `Delete the increment from ${fmtLong(rec.date)}?\n\nThe profile goes back to ${inr(rec.oldSalary)} and unpaid payroll months are restored. Months already marked Paid are not changed.`,
      )
    )
      return;
    unapplyInc(rec);
    S.increments = incList().filter((r) => r !== rec);
    if (incEdit === rec) resetIncForm();
    save();
    renderIncrements();
    flash('Increment deleted');
  }
});

/* Increments agreed outside the HRMS (from the Time sheet), recorded once through the normal increment path so they
   appear in the history, update the profile and every unpaid payroll month from the effective date. A record is
   applied only while the employee is still on the old salary and has no increment from that date onwards, so an
   increment entered by hand is never doubled. Arrears are off: the Time sheet shows these months already paid at the
   new salary. */
const RECORDED_INCREMENTS = [
  { key: 'ML-020-2026-10', empId: 'ML-020', date: '2026-10-01', oldSalary: 18000, newSalary: 22000, newVar: 0, reason: 'Annual increment (demo)' },
  { key: 'ML-014-2026-10', empId: 'ML-014', date: '2026-10-01', oldSalary: 15000, newSalary: 24000, newVar: 3000, reason: 'Intern confirmed, with ₹3,000 monthly performance pay (demo)' },
];
function applyRecordedIncrements() {
  S.recordedIncrements = Array.isArray(S.recordedIncrements) ? S.recordedIncrements : [];
  let changed = false;
  for (const x of RECORDED_INCREMENTS) {
    if (S.recordedIncrements.includes(x.key)) continue;
    const e = empOf(x.empId);
    S.recordedIncrements.push(x.key);
    changed = true;
    const later = incList().some((r) => r.empId === x.empId && r.date >= x.date);
    if (!e || later || Number(e.salary) !== x.oldSalary) continue; // already changed by hand: leave it
    const rec = {
      id: 'inc-' + x.key,
      empId: x.empId,
      date: x.date,
      newSalary: x.newSalary,
      newVar: x.newVar,
      varMode: 'fixed',
      newDesignation: e.designation || '',
      newType: e.type || '',
      reason: x.reason,
      arrears: false,
      oldSalary: Number(e.salary),
      oldVar: Number(e.variable || 0),
      oldDesignation: e.designation || '',
      oldType: e.type || '',
      createdAt: Date.now(),
    };
    incList().push(rec);
    rec.applied = applyInc(rec);
  }
  if (changed) save();
}
applyRecordedIncrements();
// a data file connected later (or a restored backup) gets the same one-time update
afterRender.push(() => {
  if (!RECORDED_INCREMENTS.every((x) => (S.recordedIncrements || []).includes(x.key))) {
    applyRecordedIncrements();
    render();
  }
});
