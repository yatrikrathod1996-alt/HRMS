/* ============================================================
   EMPLOYEES: more filters and sortable columns.
   - Filters (Employees screen only): Slip details (complete /
     missing), Employment type, Works from (India / outside India),
     Joined (this year, last 12 months, date missing).
   - Click a column heading to sort by it (click again to reverse):
     Employee, Role & department, Monthly CTC, Active / Inactive,
     Slip details. Sort by also offers CTC and joining date.
   - "Clear filters" resets everything.
   ============================================================ */
const EF = { slip: 'all', type: 'all', where: 'all', joined: 'all', col: null, dir: 1 };
let efOn = false; // true only while the Employees table is being drawn

(() => {
  const fb = $('filterbar'),
    cnt = $('fCount');
  if (!fb || !cnt || $('efSlip')) return;
  cnt.insertAdjacentHTML(
    'beforebegin',
    `<span class="ef-extra" id="efExtra">
      <label class="inline">Slip details <select id="efSlip"><option value="all">All</option><option value="ok">Complete</option><option value="missing">Details missing</option></select></label>
      <label class="inline">Type <select id="efType"><option value="all">All types</option></select></label>
      <label class="inline">Works from <select id="efWhere"><option value="all">Anywhere</option><option value="in">India</option><option value="out">Outside India</option></select></label>
      <label class="inline">Joined <select id="efJoined"><option value="all">Any time</option><option value="year">This year</option><option value="12m">Last 12 months</option><option value="none">Joining date missing</option></select></label>
      <button type="button" class="linkish" id="efClear" hidden>Clear filters</button>
    </span>`,
  );
  $('fSort').insertAdjacentHTML(
    'beforeend',
    '<option value="ctcDesc">Monthly CTC: high to low</option><option value="ctcAsc">Monthly CTC: low to high</option><option value="joinNew">Newest joiners first</option><option value="joinOld">Longest serving first</option>',
  );
  const on = (id, key) =>
    $(id).addEventListener('change', (ev) => {
      EF[key] = ev.target.value;
      render();
    });
  on('efSlip', 'slip');
  on('efType', 'type');
  on('efWhere', 'where');
  on('efJoined', 'joined');
  $('fSort').addEventListener('change', () => (EF.col = null)); // the dropdown takes over from a column click
  $('efClear').addEventListener('click', () => {
    Object.assign(EF, { slip: 'all', type: 'all', where: 'all', joined: 'all', col: null, dir: 1 });
    Object.assign(filt, { q: '', dept: 'All', status: 'all', sort: 'az' });
    $('fQ').value = '';
    $('fDept').value = 'All';
    $('fStatus').value = 'all';
    $('fSort').value = 'az';
    render();
  });
})();

const efAbroad = (e) => e.currency === 'USD' || !/india/i.test(e.location || 'India');
const efDaysAgo = (iso) => (Date.now() - new Date(iso + 'T00:00:00')) / 864e5;
function efKeep(e) {
  if (EF.slip !== 'all' && (EF.slip === 'ok') !== !missingSlip(e).length) return false;
  if (EF.type !== 'all' && (e.type || 'Not set') !== EF.type) return false;
  if (EF.where === 'in' && efAbroad(e)) return false;
  if (EF.where === 'out' && !efAbroad(e)) return false;
  if (EF.joined === 'none' && e.joining) return false;
  if (EF.joined === 'year' && !(e.joining && e.joining.slice(0, 4) === todayISO().slice(0, 4))) return false;
  if (EF.joined === '12m' && !(e.joining && efDaysAgo(e.joining) <= 366)) return false;
  return true;
}
function efSort(list) {
  const key = EF.col || { ctcDesc: 'ctc', ctcAsc: 'ctc', joinNew: 'join', joinOld: 'join' }[filt.sort];
  if (!key) return list;
  const dir = EF.col ? EF.dir : filt.sort === 'ctcDesc' || filt.sort === 'joinNew' ? -1 : 1;
  const ctc = new Map();
  const val = (e) => {
    if (key === 'name') return e.name.toLowerCase();
    if (key === 'role')
      return `${(e.department || 'Unassigned').toLowerCase()} ${(e.designation || '').toLowerCase()}`;
    if (key === 'status') return e.status === 'Active' ? 0 : 1;
    if (key === 'slip') return missingSlip(e).length;
    if (key === 'join') return e.joining || (dir > 0 ? '9999' : '0000'); // no date goes last either way
    if (key === 'ctc') {
      if (!ctc.has(e.id)) ctc.set(e.id, Number(previewPayroll(e, month).ctc.total) || 0);
      return ctc.get(e.id);
    }
    return '';
  };
  return list
    .map((e, i) => [e, val(e), i])
    .sort((a, b) => (a[1] < b[1] ? -dir : a[1] > b[1] ? dir : a[2] - b[2]))
    .map((x) => x[0]);
}
const efApplyFilter = applyFilter;
applyFilter = function (list, options) {
  const out = efApplyFilter(list, options);
  if (!efOn) return out;
  const res = efSort(out.filter(efKeep));
  const cnt = $('fCount');
  if (cnt) cnt.textContent = `Showing ${res.length} of ${list.length}`;
  return res;
};

const EF_COLS = ['name', 'role', 'ctc', 'status', 'slip']; // the first five headings of the Employees table
const efRenderEmployees = renderEmployees;
renderEmployees = function () {
  efOn = true;
  try {
    efRenderEmployees();
  } finally {
    efOn = false;
  }
  // type options come from the data
  const types = [...new Set(S.employees.map((e) => e.type || 'Not set'))].sort();
  const sel = $('efType');
  if (sel && sel.options.length - 1 !== types.length)
    sel.innerHTML =
      '<option value="all">All types</option>' + types.map((t) => `<option>${esc(t)}</option>`).join('');
  if (sel) sel.value = types.includes(EF.type) ? EF.type : 'all';
  // sortable headings
  const ths = document.querySelectorAll('#empTable thead th');
  EF_COLS.forEach((k, i) => {
    const th = ths[i];
    if (!th) return;
    const label = th.textContent.replace(/[▲▼↕]/g, '').trim();
    const active =
      EF.col === k ||
      (!EF.col &&
        ((k === 'name' && ['az', 'za'].includes(filt.sort)) || (k === 'role' && filt.sort === 'dept')));
    const dir = EF.col === k ? EF.dir : filt.sort === 'za' ? -1 : 1;
    th.innerHTML = `<button type="button" class="ef-sort${active ? ' on' : ''}" data-ef-col="${k}" aria-label="Sort by ${esc(label)}">${esc(label)}<i aria-hidden="true">${active ? (dir > 0 ? '▲' : '▼') : '↕'}</i></button>`;
    th.setAttribute('aria-sort', active ? (dir > 0 ? 'ascending' : 'descending') : 'none');
  });
  const any =
    EF.slip !== 'all' ||
    EF.type !== 'all' ||
    EF.where !== 'all' ||
    EF.joined !== 'all' ||
    filt.q ||
    filt.dept !== 'All' ||
    filt.status !== 'all';
  const clr = $('efClear');
  if (clr) clr.hidden = !any;
};
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-ef-col]');
  if (!b) return;
  const k = b.dataset.efCol;
  if (k === 'name') {
    // name keeps using the Sort by list, so both stay in step
    EF.col = null;
    filt.sort = filt.sort === 'az' ? 'za' : 'az';
    $('fSort').value = filt.sort;
  } else {
    EF.dir = EF.col === k ? -EF.dir : k === 'ctc' ? -1 : 1; // CTC starts with the highest
    EF.col = k;
  }
  render();
});
// the extra filters only show on the Employees screen
afterRender.push(() => {
  const x = $('efExtra');
  if (x) x.style.display = tab === 'employees' && !openTab ? 'contents' : 'none';
});
