/* ============================================================
   Settings & backup → "Loading animation": choose the screen shown while the HRMS opens
   (the hyperspace warp, or none). The choice is kept in this
   browser (localStorage key acmelabs_hrms_splash) and is read by the page before anything else loads.
   ============================================================ */
const SPLASH_KEY = 'acmelabs_hrms_splash';
const SPLASH_STYLES = [
  ['warp', 'Hyperspace warp', 'Stars streak past and the logo bursts out of the warp'],
  ['off', 'None', 'Open straight away'],
];
const splashPick = () => {
  try {
    const v = localStorage.getItem(SPLASH_KEY) || 'warp';
    return v === 'off' ? 'off' : 'warp';
  } catch (e) {
    return 'warp';
  }
};
(() => {
  // runs after 98-theme.js has regrouped Settings into cards: added as one more card in the right-hand column
  const col =
    document.querySelectorAll('#tab-settings .set-col')[1] || document.querySelector('#tab-settings .stats');
  if (!col || $('splashChoice')) return;
  const box = col;
  box.insertAdjacentHTML(
    'beforeend',
    `<div class="set-card" id="splashChoice"><h3>Loading animation</h3>
      <p class="set-sub">Shown for about two seconds while the HRMS opens. Saved in this browser.</p>
      <div class="sc-opts">${SPLASH_STYLES.map(
        ([v, t, sub]) =>
          `<label class="sc-opt"><input type="radio" name="splashStyle" value="${v}"><span><b>${t}</b><small>${sub}</small></span></label>`,
      ).join('')}</div>
      <p style="margin:10px 0 0"><button type="button" class="btn" id="splashPreview">Preview now</button></p></div>`,
  );
  const sync = () =>
    document
      .querySelectorAll('input[name="splashStyle"]')
      .forEach((r) => (r.checked = r.value === splashPick()));
  sync();
  box.addEventListener('change', (ev) => {
    if (ev.target.name !== 'splashStyle') return;
    try {
      localStorage.setItem(SPLASH_KEY, ev.target.value);
      flash('Loading animation saved');
    } catch (e) {}
  });
  $('splashPreview').addEventListener('click', () => {
    save(); // nothing is lost: the page reopens on the same data
    if (splashPick() === 'off') {
      flash('Pick an animation first');
      return;
    }
    location.reload();
  });
})();
// the backup warning from 64-one-file.js is added before the Settings page is regrouped into cards, which drops it:
// put it back inside the Backup card
(() => {
  const card = $('exportJson') && $('exportJson').closest('.set-card');
  if (!card || $('exportWarn')) return;
  card.insertAdjacentHTML(
    'beforeend',
    '<p class="cell-sub" id="exportWarn" style="margin:10px 0 0">Backups and "HRMS with my data" contain every salary, bank account and ID number. Keep them in a private folder and share only with people allowed to see payroll.</p>',
  );
})();

/* Settings & backup → "Appearance": Space (dark, the default) or Light. Kept in this browser (acmelabs_hrms_theme)
   and applied by a tiny script at the top of the page, so the page never flashes the other look. */
const THEME_KEY = 'acmelabs_hrms_theme';
(() => {
  const col = document.querySelectorAll('#tab-settings .set-col')[1];
  if (!col || $('themeChoice')) return;
  const cur = document.documentElement.classList.contains('space') ? 'space' : 'light';
  col.insertAdjacentHTML(
    'beforeend',
    `<div class="set-card" id="themeChoice"><h3>Appearance</h3>
      <p class="set-sub">Payslips, letters and downloads are always on white paper.</p>
      <div class="sc-opts">${[
        ['space', 'Space', 'Dark, with the starfield look'],
        ['light', 'Light', 'White and bright'],
      ]
        .map(
          ([v, t, sub]) =>
            `<label class="sc-opt"><input type="radio" name="themeStyle" value="${v}"${v === cur ? ' checked' : ''}><span><b>${t}</b><small>${sub}</small></span></label>`,
        )
        .join('')}</div></div>`,
  );
  $('themeChoice').addEventListener('change', (ev) => {
    if (ev.target.name !== 'themeStyle') return;
    try {
      localStorage.setItem(THEME_KEY, ev.target.value);
    } catch (e) {}
    document.documentElement.classList.toggle('space', ev.target.value === 'space');
    flash(ev.target.value === 'space' ? 'Space theme on' : 'Light theme on');
  });
})();
