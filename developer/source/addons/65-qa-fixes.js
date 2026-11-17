/* Fixes from the end-to-end QA pass (4 Nov 2026):
   - a filter is always visible ("Filtered: … · Clear"), and the one the Dashboard sets is cleared on the next screen
   - Payroll: "Mark all as paid" for the listed people (skips negative pay and people already paid)
   - phone: the menu folds into a "Menu" button instead of covering a third of the screen */

/* ---- visible filter note ---- */
const filterNote = document.createElement('div');
filterNote.id = 'filterNote';
filterNote.className = 'filter-note';
filterNote.hidden = true;
const fbar = $('filterbar');
if (fbar) fbar.insertAdjacentElement('afterend', filterNote);
function showFilterNote() {
  if (!fbar) return;
  if (fbar.nextElementSibling !== filterNote) fbar.after(filterNote); // the filter bar moves into each screen
  const parts = [];
  if (filt.dept !== 'All') parts.push(`department ${filt.dept}`);
  if (filt.q.trim()) parts.push(`search “${filt.q.trim()}”`);
  if (filt.status === 'active') parts.push('active employees only');
  else if (filt.status === 'inactive') parts.push('inactive employees only');
  filterNote.hidden = !parts.length || getComputedStyle(fbar).display === 'none';
  filterNote.innerHTML = parts.length
    ? `<b>Filtered:</b> ${esc(parts.join(', '))}. Totals and downloads on this screen use this list. <button type="button" class="btn-s" id="filterClear">Clear filter</button>`
    : '';
}
function clearFilters() {
  filt.q = '';
  filt.dept = 'All';
  filt.status = 'all';
  const q = $('fQ');
  if (q) q.value = '';
  if ($('fDept')) $('fDept').value = 'All';
  const st = $('fStatus');
  if (st) st.value = 'all';
}
filterNote.addEventListener('click', (ev) => {
  if (ev.target.id !== 'filterClear') return;
  clearFilters();
  render();
});
afterRender.push(showFilterNote);
// screens opened from the menu, and the filter boxes themselves, refresh the note too
['click', 'change', 'input'].forEach((t) =>
  document.addEventListener(t, () => setTimeout(showFilterNote, 0)),
);
// a department picked on the Dashboard applies to the screen it opens, not to every screen after it
document.querySelector('nav').addEventListener(
  'click',
  (ev) => {
    const b = ev.target.closest('button');
    if (!b || !filterFromDashboard || !ev.isTrusted) return; // the Dashboard's own jump to Employees keeps it
    filterFromDashboard = false;
    clearFilters();
  },
  true,
);

/* ---- Payroll: mark all as paid ---- */
const markAllBtn = document.createElement('button');
markAllBtn.type = 'button';
markAllBtn.className = 'btn';
markAllBtn.id = 'markAllPaid';
markAllBtn.textContent = 'Mark all as paid';
markAllBtn.title = 'Marks everyone listed below as Paid (people with negative pay are skipped)';
const csvB = $('csvBtn');
if (csvB) csvB.insertAdjacentElement('beforebegin', markAllBtn);
markAllBtn.addEventListener('click', () => {
  const rows = applyFilter(empsIn(month)).map((e) => pay(e, month)),
    todo = rows.filter((r) => r.row.status !== 'Paid' && r.net >= 0),
    neg = rows.filter((r) => r.row.status !== 'Paid' && r.net < 0);
  if (!todo.length) {
    flash(
      neg.length
        ? 'Only rows with negative pay are left: fix them first'
        : 'Everyone listed is already marked Paid',
    );
    return;
  }
  const inr = todo.filter((r) => r.currency !== 'USD').reduce((a, r) => a + r.net, 0),
    usd = todo.filter((r) => r.currency === 'USD').reduce((a, r) => a + r.net / r.fx, 0);
  if (
    !confirm(
      `Mark ${todo.length} ${todo.length === 1 ? 'person' : 'people'} as Paid for ${monthLabel(month)}?\n` +
        `${money(inr)}${usd ? ' + ' + money(r2(usd), 'USD') : ''}` +
        (neg.length ? `\n${neg.length} with negative pay will be skipped.` : '') +
        '\nPaid months are locked: attendance and amounts can no longer change.',
    )
  )
    return;
  todo.forEach((r) => (r.row.status = 'Paid'));
  save();
  render();
  flash(`${todo.length} marked Paid`);
});

/* ---- phone: fold the menu ---- */
const navEl = document.querySelector('nav'),
  navToggle = document.createElement('button');
navToggle.type = 'button';
navToggle.id = 'navToggle';
navToggle.textContent = 'Menu';
navToggle.setAttribute('aria-expanded', 'false');
const navLogo = navEl.querySelector('.logo');
(navLogo || navEl.firstChild).insertAdjacentElement(navLogo ? 'afterend' : 'beforebegin', navToggle);
const phone = () => window.matchMedia('(max-width: 760px)').matches;
function setNavOpen(open) {
  navEl.classList.toggle('nav-folded', phone() && !open);
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.textContent = open ? 'Close menu' : 'Menu';
}
navToggle.addEventListener('click', () => setNavOpen(navEl.classList.contains('nav-folded')));
navEl.addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (b && b !== navToggle && phone()) setNavOpen(false);
});
window.addEventListener('resize', () => setNavOpen(!navEl.classList.contains('nav-folded') && !phone()));
setNavOpen(false);
