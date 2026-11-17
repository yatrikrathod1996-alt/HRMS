/* ============================================================
   ASSETS (People → Assets): company laptops, phones, monitors…
   Each asset has a status, a current holder and a full log of
   who had it and when. Assets still with a leaver are shown on
   the Exit & FNF dialog. Data: S.assetRegister.
   ============================================================ */
const AST_TYPES = [
  'Laptop',
  'Desktop',
  'Monitor',
  'Phone',
  'Tablet',
  'Headset',
  'Keyboard / mouse',
  'SIM card',
  'ID / access card',
  'Other',
];
const AST_STATUS = ['In stock', 'Assigned', 'In repair', 'Retired', 'Lost'];
const astList = () => {
  if (!Array.isArray(S.assetRegister)) S.assetRegister = [];
  return S.assetRegister;
};
const astEmp = (id) => S.employees.find((e) => e.id === id);
const astHeldBy = (empId) => astList().filter((a) => a.status === 'Assigned' && a.holder === empId);
const astNextTag = (type) => {
  const prefix =
    'ML-' +
    (type || 'Other')
      .replace(/[^A-Za-z]/g, '')
      .slice(0, 3)
      .toUpperCase() +
    '-';
  const used = astList()
    .map((a) => a.tag)
    .filter((t) => t && t.startsWith(prefix))
    .map((t) => Number(t.slice(prefix.length)) || 0);
  return prefix + String(Math.max(0, ...used) + 1).padStart(3, '0');
};
const astSince = (a) => {
  const last = [...(a.log || [])].reverse().find((x) => x.action === 'Assigned');
  return last ? last.date : '';
};
let astFilter = { q: '', status: 'all', type: 'all' },
  astEditing = null,
  astActing = null;

document.getElementById('tab-settings').insertAdjacentHTML(
  'beforebegin',
  `<section id="tab-assets" class="hide">
  <div class="top"><div><h2>Assets</h2><p>Company equipment and who has it.</p></div>
    <div class="controls"><button class="btn primary" type="button" id="astAdd">+ Add asset</button></div></div>
  <div class="ast-cards" id="astCards"></div>
  <div class="ast-tools">
    <input id="astQ" placeholder="Search tag, model, serial or person" aria-label="Search assets">
    <label class="inline">Status <select id="astStatus"><option value="all">All</option>${AST_STATUS.map((s) => `<option>${s}</option>`).join('')}</select></label>
    <label class="inline">Type <select id="astType"><option value="all">All</option>${AST_TYPES.map((s) => `<option>${s}</option>`).join('')}</select></label>
  </div>
  <div class="tablewrap"><table id="astTable"></table></div>
</section>`,
);
document.body.insertAdjacentHTML(
  'beforeend',
  `<dialog id="astDlg" aria-labelledby="astDlgTitle"><div class="mhead"><h3 id="astDlgTitle">Add asset</h3><button class="btn" type="button" data-close="astDlg">Close</button></div>
  <div class="mbody"><div class="form ast-form">
    <label>Type<select id="astFType">${AST_TYPES.map((s) => `<option>${s}</option>`).join('')}</select></label>
    <label>Asset tag<input id="astFTag" placeholder="e.g. ML-LAP-001"></label>
    <label class="wide">Make and model<input id="astFName" placeholder="e.g. Dell Latitude 5440, 16 GB"></label>
    <label>Serial number<input id="astFSerial"></label>
    <label>Purchase date<input type="date" id="astFDate"></label>
    <label>Cost (₹)<input type="number" min="0" step="1" id="astFCost"></label>
    <label>Warranty until<input type="date" id="astFWarranty"></label>
    <label class="wide">Notes<input id="astFNotes"></label>
    <label class="ast-new">Already with (optional)<select id="astFHolder"></select></label>
    <label class="ast-new">Since<input type="date" id="astFSince"></label>
  </div><p class="ast-error" id="astFError" role="alert"></p></div>
  <div class="mfoot"><button class="btn" type="button" data-close="astDlg">Cancel</button><button class="btn primary" type="button" id="astFSave">Save</button></div></dialog>
<dialog id="astActDlg" aria-labelledby="astActTitle"><div class="mhead"><h3 id="astActTitle">Assign asset</h3><button class="btn" type="button" data-close="astActDlg">Close</button></div>
  <div class="mbody"><p class="ast-sub" id="astActSub"></p><div class="form ast-form" id="astActForm"></div><p class="ast-error" id="astActError" role="alert"></p></div>
  <div class="mfoot"><button class="btn" type="button" data-close="astActDlg">Cancel</button><button class="btn primary" type="button" id="astActSave">Save</button></div></dialog>`,
);
addTab('assets', {
  label: 'Assets',
  section: 'tab-assets',
  place: ['#navHolidays', 'afterend'],
  render: () => renderAssets(),
});

function renderAssets() {
  const all = astList(),
    count = (s) => all.filter((a) => a.status === s).length;
  const value = r2(
    all.filter((a) => !['Retired', 'Lost'].includes(a.status)).reduce((s, a) => s + Number(a.cost || 0), 0),
  );
  $('astCards').innerHTML = [
    [all.length, 'Total assets', ''],
    [count('Assigned'), 'With employees', 'blue'],
    [count('In stock'), 'In stock', 'green'],
    [count('In repair'), 'In repair', 'amber'],
    ['₹' + numFmt(value, 'INR'), 'Value in use', ''],
  ]
    .map(([n, l, c]) => `<div class="ast-card ${c}"><b>${n}</b><span>${l}</span></div>`)
    .join('');
  const q = astFilter.q.trim().toLowerCase();
  const rows = all
    .filter((a) => astFilter.status === 'all' || a.status === astFilter.status)
    .filter((a) => astFilter.type === 'all' || a.type === astFilter.type)
    .filter((a) => {
      if (!q) return true;
      const e = astEmp(a.holder);
      return [a.tag, a.name, a.serial, a.type, e && e.name, e && e.id].some((v) =>
        String(v || '')
          .toLowerCase()
          .includes(q),
      );
    })
    .sort((a, b) => String(a.tag).localeCompare(String(b.tag)));
  const statusPill = (s) =>
    `<span class="ast-pill st-${s.replace(/\s+/g, '-').toLowerCase()}">${esc(s)}</span>`;
  $('astTable').innerHTML =
    `<thead><tr><th>Asset</th><th>Serial</th><th>With</th><th>Status</th><th class="num">Cost</th><th></th></tr></thead><tbody>` +
    (rows.length
      ? rows
          .map((a) => {
            const e = astEmp(a.holder),
              since = astSince(a);
            const actions =
              a.status === 'Assigned'
                ? `<button class="btn-s" type="button" data-ast-act="return" data-ast="${a.id}">Return</button>`
                : ['In stock', 'In repair'].includes(a.status)
                  ? `<button class="btn-s" type="button" data-ast-act="assign" data-ast="${a.id}">Assign</button>`
                  : '';
            return `<tr><td><b>${esc(a.tag)}</b><small>${esc(a.type)}${a.name ? ' · ' + esc(a.name) : ''}</small></td>
          <td>${esc(a.serial || '—')}</td>
          <td>${e ? `<button type="button" class="linkish" data-ast-prof="${e.id}">${esc(e.name)}</button><small>since ${since ? fmtLong(since) : '—'}</small>` : '—'}</td>
          <td>${statusPill(a.status)}</td><td class="num">${a.cost ? '₹' + numFmt(a.cost, 'INR') : '—'}</td>
          <td class="ast-actions">${actions}<details class="ast-more"><summary aria-label="More actions for ${esc(a.tag)}">⋯</summary><div>
            <button type="button" data-ast-act="edit" data-ast="${a.id}">Edit</button>
            <button type="button" data-ast-act="history" data-ast="${a.id}">History</button>
            ${a.status !== 'Assigned' ? `<button type="button" data-ast-act="status" data-ast="${a.id}">Change status</button>` : ''}
            ${!(a.log || []).some((x) => x.action === 'Assigned') ? `<button type="button" data-ast-act="delete" data-ast="${a.id}">Delete</button>` : ''}
          </div></details></td></tr>`;
          })
          .join('')
      : `<tr><td colspan="6" class="empty-state">${all.length ? 'No assets match these filters.' : 'No assets yet. Add the first one with “+ Add asset”.'}</td></tr>`) +
    '</tbody>';
}
function astOpenForm(a) {
  astEditing = a || null;
  $('astDlgTitle').textContent = a ? 'Edit ' + a.tag : 'Add asset';
  $('astFType').value = a ? a.type : 'Laptop';
  $('astFTag').value = a ? a.tag : astNextTag('Laptop');
  $('astFName').value = a ? a.name || '' : '';
  $('astFSerial').value = a ? a.serial || '' : '';
  $('astFDate').value = a ? a.purchaseDate || '' : '';
  $('astFCost').value = a && a.cost ? a.cost : '';
  $('astFWarranty').value = a ? a.warranty || '' : '';
  $('astFNotes').value = a ? a.notes || '' : '';
  // a new asset can be recorded straight away with the person who already has it
  const people = S.employees
    .filter((x) => x.status === 'Active')
    .sort((x, y) => x.name.localeCompare(y.name));
  $('astFHolder').innerHTML =
    '<option value="">No one (in stock)</option>' +
    people.map((x) => `<option value="${x.id}">${esc(x.name)} (${x.id})</option>`).join('');
  $('astFSince').value = todayISO();
  document.querySelectorAll('#astDlg .ast-new').forEach((l) => (l.hidden = !!a));
  $('astFError').textContent = '';
  $('astDlg').showModal();
}
$('astFType').addEventListener('change', () => {
  if (!astEditing) $('astFTag').value = astNextTag($('astFType').value);
});
$('astFSave').addEventListener('click', () => {
  const v = {
    type: $('astFType').value,
    tag: $('astFTag').value.trim().toUpperCase(),
    name: $('astFName').value.trim(),
    serial: $('astFSerial').value.trim(),
    purchaseDate: $('astFDate').value,
    cost: $('astFCost').value === '' ? 0 : Number($('astFCost').value),
    warranty: $('astFWarranty').value,
    notes: $('astFNotes').value.trim(),
  };
  const dupTag = astList().some((a) => a !== astEditing && a.tag === v.tag),
    dupSerial =
      v.serial &&
      astList().some(
        (a) => a !== astEditing && a.serial && a.serial.toLowerCase() === v.serial.toLowerCase(),
      );
  const err = !v.tag
    ? 'Enter an asset tag.'
    : dupTag
      ? `Tag ${v.tag} is already used.`
      : dupSerial
        ? `Serial number ${v.serial} is already on another asset.`
        : !(v.cost >= 0)
          ? 'The cost cannot be negative.'
          : v.purchaseDate && v.purchaseDate > todayISO()
            ? 'The purchase date cannot be in the future.'
            : '';
  const holder = astEditing ? null : astEmp($('astFHolder').value),
    since = $('astFSince').value;
  const err2 =
    err ||
    (holder && !/^\d{4}-\d{2}-\d{2}$/.test(since)
      ? 'Enter since when they have it.'
      : holder && since > todayISO()
        ? 'The date cannot be in the future.'
        : holder && v.purchaseDate && since < v.purchaseDate
          ? 'They cannot have it before it was bought.'
          : '');
  if (err2) {
    $('astFError').textContent = err2;
    return;
  }
  if (astEditing) Object.assign(astEditing, v);
  else {
    const added = v.purchaseDate || (holder && since < todayISO() ? since : todayISO());
    const log = [{ date: added, action: 'Added', note: v.notes }];
    if (holder) log.push({ date: since, action: 'Assigned', empId: holder.id, condition: 'Good', note: '' });
    astList().push({
      id: 'ast' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      ...v,
      status: holder ? 'Assigned' : 'In stock',
      holder: holder ? holder.id : null,
      log,
    });
  }
  save();
  $('astDlg').close();
  renderAssets();
  flash(astEditing ? 'Asset updated' : 'Asset added');
});
function astOpenAction(a, act) {
  astActing = { a, act };
  const e = astEmp(a.holder);
  const people = S.employees
    .filter((x) => x.status === 'Active')
    .sort((x, y) => x.name.localeCompare(y.name));
  const title = { assign: 'Assign', return: 'Return', status: 'Change status of', history: 'History of' }[
    act
  ];
  $('astActTitle').textContent = `${title} ${a.tag}`;
  $('astActSub').textContent =
    `${a.type}${a.name ? ' · ' + a.name : ''}${a.serial ? ' · S/N ' + a.serial : ''}${e ? ' · now with ' + e.name : ''}`;
  $('astActError').textContent = '';
  $('astActSave').hidden = act === 'history';
  const f = $('astActForm');
  if (act === 'assign')
    f.innerHTML = `<label class="wide">Give to<select id="astAEmp"><option value="">Choose an employee…</option>${people.map((x) => `<option value="${x.id}">${esc(x.name)} (${x.id})</option>`).join('')}</select></label>
      <label>Date<input type="date" id="astADate" value="${todayISO()}"></label><label>Condition<select id="astACond"><option>Good</option><option>Fair</option><option>Damaged</option></select></label>
      <label class="wide">Note<input id="astANote" placeholder="e.g. with charger and bag"></label>`;
  else if (act === 'return')
    f.innerHTML = `<label>Returned on<input type="date" id="astADate" value="${todayISO()}"></label><label>Condition<select id="astACond"><option>Good</option><option>Fair</option><option>Damaged</option><option>Lost</option></select></label>
      <label class="wide">Note<input id="astANote" placeholder="e.g. charger missing"></label>`;
  else if (act === 'status')
    f.innerHTML = `<label>New status<select id="astAStatus">${['In stock', 'In repair', 'Retired', 'Lost'].map((s) => `<option ${s === a.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      <label>Date<input type="date" id="astADate" value="${todayISO()}"></label><label class="wide">Note<input id="astANote"></label>`;
  else
    f.innerHTML = `<ol class="ast-log">${[...(a.log || [])]
      .reverse()
      .map((x) => {
        const p = astEmp(x.empId);
        return `<li><b>${esc(x.action)}</b>${p ? ' · ' + esc(p.name) : ''}<small>${x.date ? fmtLong(x.date) : ''}${x.condition ? ' · ' + esc(x.condition) : ''}${x.note ? ' · ' + esc(x.note) : ''}</small></li>`;
      })
      .join('')}</ol>`;
  $('astActDlg').showModal();
}
$('astActSave').addEventListener('click', () => {
  const { a, act } = astActing || {};
  if (!a) return;
  const date = $('astADate').value,
    note = $('astANote') ? $('astANote').value.trim() : '';
  const lastDate =
    (a.log || [])
      .map((x) => x.date)
      .filter(Boolean)
      .sort()
      .pop() || '';
  let err = !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ? 'Enter the date.'
    : date > todayISO()
      ? 'The date cannot be in the future.'
      : date < lastDate
        ? `The date cannot be before the last entry (${fmtLong(lastDate)}).`
        : '';
  if (!err && act === 'assign') {
    const e = astEmp($('astAEmp').value);
    if (!e) err = 'Choose who gets the asset.';
    else if (e.joining && date < e.joining) err = `${e.name} joined on ${fmtLong(e.joining)}.`;
    if (!err) {
      a.status = 'Assigned';
      a.holder = e.id;
      a.log.push({ date, action: 'Assigned', empId: e.id, condition: $('astACond').value, note });
    }
  } else if (!err && act === 'return') {
    const cond = $('astACond').value;
    a.log.push({
      date,
      action: cond === 'Lost' ? 'Reported lost' : 'Returned',
      empId: a.holder,
      condition: cond,
      note,
    });
    a.status = cond === 'Lost' ? 'Lost' : cond === 'Damaged' ? 'In repair' : 'In stock';
    a.holder = null;
  } else if (!err && act === 'status') {
    const st = $('astAStatus').value;
    a.log.push({ date, action: st === 'In stock' ? 'Back in stock' : st, note });
    a.status = st;
  }
  if (err) {
    $('astActError').textContent = err;
    return;
  }
  save();
  $('astActDlg').close();
  renderAssets();
  flash('Asset updated');
});
$('astAdd').addEventListener('click', () => astOpenForm(null));
$('astQ').addEventListener('input', (ev) => {
  astFilter.q = ev.target.value;
  renderAssets();
});
$('astStatus').addEventListener('change', (ev) => {
  astFilter.status = ev.target.value;
  renderAssets();
});
$('astType').addEventListener('change', (ev) => {
  astFilter.type = ev.target.value;
  renderAssets();
});
$('astTable').addEventListener('click', (ev) => {
  const prof = ev.target.closest('[data-ast-prof]');
  if (prof) return openEmployeeProfile(prof.dataset.astProf);
  const b = ev.target.closest('[data-ast-act]');
  if (!b) return;
  const a = astList().find((x) => x.id === b.dataset.ast);
  if (!a) return;
  b.closest('details')?.removeAttribute('open');
  if (b.dataset.astAct === 'edit') astOpenForm(a);
  else if (b.dataset.astAct === 'delete') {
    if (confirm(`Delete ${a.tag}? It has never been assigned, so no history is lost.`)) {
      S.assetRegister = astList().filter((x) => x !== a);
      save();
      renderAssets();
    }
  } else astOpenAction(a, b.dataset.astAct);
});

/* the exit dialog lists assets the leaver still has */
const astOrigOpenExit = openEmployeeExit;
openEmployeeExit = function (id) {
  astOrigOpenExit(id);
  const dlg = $('exitDlg');
  if (!dlg) return;
  dlg.querySelector('.ast-exit')?.remove();
  const held = astHeldBy(id);
  const body = dlg.querySelector('.mbody') || dlg;
  body.insertAdjacentHTML(
    'afterbegin',
    `<div class="ast-exit ${held.length ? 'warn' : 'ok'}">${held.length ? `<b>Assets to collect (${held.length}):</b> ${held.map((a) => `${esc(a.tag)} ${esc(a.type)}${a.name ? ' (' + esc(a.name) + ')' : ''}`).join(', ')}. Return them under Assets.` : 'No company assets are with this employee.'}</div>`,
  );
};
