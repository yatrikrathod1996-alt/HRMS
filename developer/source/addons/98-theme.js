/* ============================================================
   THEME: one consistent look for every screen.
   - left menu in groups with icons; "Hide amounts" and
     "Download Excel" at the bottom
   - the search / filter bar sits under each page title
   - Settings laid out as cards
   Styles are in styles/theme.css. Nothing here changes data.
   ============================================================ */
const NAV_ICONS = {
  dashboard:
    '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  tasks: '<path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',
  payroll: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  attendance:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  leave:
    '<path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
  holidays: '<path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4L4.2 7.7l5.4-.8z"/>',
  employees:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  exits: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  documents:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  increments: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
  calendar:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="12" cy="15" r="2"/>',
  assets: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  expenses: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 .7V2l-1 .7-3-2-3 2-3-2-3 2-3-2z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  excel:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13l4 5M12 13l-4 5M15 13h2M15 17h2"/>',
};
const navSvg = (k) =>
  `<svg class="nav-ic" viewBox="0 0 24 24" aria-hidden="true">${NAV_ICONS[k] || ''}</svg>`;

/* left menu: groups, icons, bottom actions */
(() => {
  const nav = document.querySelector('nav');
  if (!nav || nav.dataset.themed) return;
  nav.dataset.themed = '1';
  const btn = (key) =>
    key.startsWith('#') ? $(key.slice(1)) : nav.querySelector(`button[data-tab="${key}"]`);
  const groups = [
    [
      'Overview',
      [
        ['#navDashboard', 'dashboard'],
        ['#navTasks', 'tasks'],
        ['#navCalendar', 'calendar'],
      ],
    ],
    [
      'People',
      [
        ['employees', 'employees'],
        ['attendance', 'attendance'],
        ['leave', 'leave'],
        ['#navHolidays', 'holidays'],
        ['#navAssets', 'assets'],
      ],
    ],
    [
      'Pay',
      [
        ['payroll', 'payroll'],
        ['#navExpenses', 'expenses'],
        ['#navIncrements', 'increments'],
        ['exits', 'exits'],
      ],
    ],
    ['Paperwork', [['#navDocuments', 'documents']]],
    ['System', [['settings', 'settings']]],
  ];
  const anchor = nav.querySelector('.spacer');
  groups.forEach(([label, items]) => {
    const head = document.createElement('div');
    head.className = 'nav-label';
    head.textContent = label;
    nav.insertBefore(head, anchor);
    items.forEach(([key, ic]) => {
      const b = btn(key);
      if (!b) return;
      b.insertAdjacentHTML('afterbegin', navSvg(ic));
      b.classList.add('nav-item');
      nav.insertBefore(b, anchor);
    });
  });
  // bottom: hide amounts, Excel download, save status
  const eye = $('navEye'),
    xl = $('xlsxBtn');
  if (xl) {
    xl.removeAttribute('style');
    xl.classList.add('nav-excel');
    xl.innerHTML = navSvg('excel') + '<span>Download Excel</span>';
  }
  if (eye && xl) xl.insertAdjacentElement('beforebegin', eye);
})();

/* the search / filter bar belongs under the page title */
function placeFilterbar() {
  const fb = $('filterbar'),
    sec = document.querySelector('main > section:not(.hide)'),
    top = sec && sec.querySelector(':scope > .top');
  if (fb && top && top.nextElementSibling !== fb) top.insertAdjacentElement('afterend', fb);
}
afterRender.push(placeFilterbar);

/* Settings as cards (the same inputs and buttons, only regrouped) */
(() => {
  const sec = $('tab-settings'),
    box = sec && sec.querySelector(':scope > .stats');
  if (!box || box.dataset.themed) return;
  box.dataset.themed = '1';
  const kids = [...box.children];
  const card = (title, sub, els, cls = '') => {
    const c = document.createElement('div');
    c.className = 'set-card ' + cls;
    c.innerHTML = `${title ? `<h3>${title}</h3>` : ''}${sub ? `<p class="set-sub">${sub}</p>` : ''}`;
    els.filter(Boolean).forEach((el) => c.appendChild(el));
    return c;
  };
  const forms = kids.filter((k) => k.classList.contains('form'));
  const bold = (text) => kids.find((k) => k.tagName === 'P' && k.textContent.trim().startsWith(text));
  const note = kids.find((k) => k.classList.contains('idc') && /Special allowance/.test(k.textContent));
  const statutory = kids.find((k) => k.classList.contains('salary-section'));
  const saveP = $('saveSettings') && $('saveSettings').closest('p');
  const fileTitle = bold('Data file'),
    fileStatus = $('fileStatus'),
    fileBtns = $('createFile') && $('createFile').closest('.controls'),
    tip = kids.find((k) => k.classList.contains('idc') && /Tip:/.test(k.textContent));
  const backupTitle = bold('Backup'),
    backupBtns = $('exportJson') && $('exportJson').closest('.controls');
  [fileTitle, backupTitle, bold('Salary slip')].forEach((x) => x && x.remove());
  kids.filter((k) => k.tagName === 'HR').forEach((k) => k.remove());
  const grid = document.createElement('div');
  grid.className = 'set-grid';
  const left = document.createElement('div'),
    right = document.createElement('div');
  left.className = right.className = 'set-col';
  left.append(
    card('Leave & currency', 'Yearly quotas and the default USD rate.', [forms[0]]),
    card('Salary slip', 'Company details and the salary split.', [forms[1], note]),
    card('', '', [statutory], 'flat'),
  );
  if (saveP) {
    saveP.className = 'set-save';
    left.append(saveP);
  }
  right.append(
    card('Data file on this computer', '', [fileStatus, fileBtns, tip]),
    card('Backup', 'Keep a recent copy somewhere safe.', [backupBtns]),
  );
  grid.append(left, right);
  box.replaceChildren(grid);
  box.classList.add('set-box');
})();
