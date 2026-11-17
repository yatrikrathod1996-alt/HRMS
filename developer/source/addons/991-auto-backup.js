/* ============================================================
   AUTOMATIC BACKUP (Settings & backup → Automatic backup)
   Every day (or week) the HRMS saves a backup by itself when it is
   open: into a folder you choose once (keeps the last 14 copies), or,
   without a folder, as a download. The dashboard shows a reminder
   when the last backup is too old, or when the browser needs one
   click to allow writing to the folder again (browsers ask after a
   restart). Settings live in this browser: acmelabs_hrms_autobackup,
   the folder in IndexedDB ('backupDir'), the last backup time in
   acmelabs_hrms_lastbackup. Manual backups count as backups too.
   ============================================================ */
const AB_KEY = 'acmelabs_hrms_autobackup',
  AB_LAST = 'acmelabs_hrms_lastbackup',
  AB_KEEP = 14,
  AB_PREFIX = 'AcmeLabs_HRMS_backup_';
const abCanFolder = typeof window.showDirectoryPicker === 'function';
let abDir = null, abNeedsClick = false, abBusy = false;
const abCfg = () => {
  try {
    return { every: 'day', where: 'download', ...(JSON.parse(localStorage.getItem(AB_KEY) || '{}') || {}) };
  } catch (e) {
    return { every: 'day', where: 'download' };
  }
};
const abSetCfg = (c) => {
  try { localStorage.setItem(AB_KEY, JSON.stringify(c)); } catch (e) {}
};
const abLast = () => {
  try { return JSON.parse(localStorage.getItem(AB_LAST) || 'null'); } catch (e) { return null; }
};
const abMark = (where) => {
  try { localStorage.setItem(AB_LAST, JSON.stringify({ at: new Date().toISOString(), where })); } catch (e) {}
  abNeedsClick = false;
  abPaint();
};
const abPeriodMs = (every) => (every === 'week' ? 7 : 1) * 864e5;
const abAgeDays = () => {
  const l = abLast();
  return l ? (Date.now() - new Date(l.at).getTime()) / 864e5 : Infinity;
};
function abDue() {
  const c = abCfg();
  if (c.every === 'off') return false;
  const l = abLast();
  if (!l) return true;
  // once per calendar day for "every day" (not 24 hours to the minute), seven days for "every week"
  if (c.every === 'day') return new Date(l.at).toDateString() !== new Date().toDateString();
  return Date.now() - new Date(l.at).getTime() >= abPeriodMs(c.every);
}
const abName = () => `${AB_PREFIX}${new Date().toISOString().slice(0, 10)}.json`;
async function abWriteFolder(dir) {
  const fh = await dir.getFileHandle(abName(), { create: true });
  const w = await fh.createWritable();
  await w.write(JSON.stringify(S, null, 1));
  await w.close();
  // keep only the newest copies
  const names = [];
  for await (const [name, h] of dir.entries()) if (h.kind === 'file' && name.startsWith(AB_PREFIX) && name.endsWith('.json')) names.push(name);
  names.sort().reverse().slice(AB_KEEP).forEach((n) => dir.removeEntry(n).catch(() => {}));
}
async function abRun(fromClick) {
  if (abBusy) return false;
  abBusy = true;
  try {
    const c = abCfg();
    if (c.where === 'folder' && abCanFolder) {
      abDir = abDir || (await idbGet('backupDir'));
      if (!abDir) {
        abNeedsClick = true;
        return false;
      }
      let perm = await abDir.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted' && fromClick) perm = await abDir.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        abNeedsClick = true; // the browser wants one click before writing to the folder again
        abPaint();
        return false;
      }
      await abWriteFolder(abDir);
      abMark('folder');
      if (fromClick) flash(`Backup saved in "${abDir.name}"`);
      return true;
    }
    download(abName(), JSON.stringify(S, null, 1), 'application/json');
    abMark('download');
    flash('Automatic backup downloaded');
    return true;
  } catch (err) {
    console.warn('automatic backup', err);
    abNeedsClick = true;
    abPaint();
    return false;
  } finally {
    abBusy = false;
  }
}
function abCheck() {
  // automated test browsers only back up when a test has chosen a setting
  if (navigator.webdriver && !localStorage.getItem(AB_KEY)) return abPaint();
  if (typeof S === 'undefined' || !S || !S.employees || !abDue()) return abPaint();
  abRun(false);
}

/* ---------- Settings card ---------- */
function abCard() {
  const col = document.querySelectorAll('#tab-settings .set-col')[1];
  if (!col || $('abCard')) return;
  const backup = $('exportJson')?.closest('.set-card');
  const html = `<div class="set-card" id="abCard"><h3>Automatic backup</h3>
    <p class="set-sub">The HRMS backs itself up while it is open. Backups hold every salary and bank detail: keep the folder private.</p>
    <div class="ab-row"><span>How often</span><span class="seg" id="abEvery"><button type="button" data-v="day">Every day</button><button type="button" data-v="week">Every week</button><button type="button" data-v="off">Off</button></span></div>
    <div class="ab-row"><span>Where</span><span class="seg" id="abWhere"><button type="button" data-v="download">Downloads</button>${abCanFolder ? '<button type="button" data-v="folder">A folder I choose</button>' : ''}</span></div>
    <div class="ab-row" id="abFolderRow" hidden><span>Folder</span><span><b id="abFolderName">Not chosen</b> <button type="button" class="btn" id="abPick">Choose folder…</button></span></div>
    <p class="ab-status" id="abStatus"></p>
    <div class="controls"><button type="button" class="btn primary" id="abNow">Back up now</button></div></div>`;
  if (backup) backup.insertAdjacentHTML('afterend', html);
  else col.insertAdjacentHTML('beforeend', html);
  abPaint();
}
function abWhen(iso) {
  const d = new Date(iso), days = Math.floor((dOnly(new Date()) - dOnly(d)) / 864e5);
  const t = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return days === 0 ? `today at ${t}` : days === 1 ? `yesterday at ${t}` : `${days} days ago (${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`;
}
async function abPaint() {
  const c = abCfg(), l = abLast();
  document.querySelectorAll('#abEvery button').forEach((b) => b.classList.toggle('on', b.dataset.v === c.every));
  document.querySelectorAll('#abWhere button').forEach((b) => b.classList.toggle('on', b.dataset.v === c.where));
  const fr = $('abFolderRow');
  if (fr) fr.hidden = c.where !== 'folder';
  if ($('abFolderName')) {
    abDir = abDir || (abCanFolder ? await idbGet('backupDir') : null);
    $('abFolderName').textContent = abDir ? abDir.name : 'Not chosen';
  }
  if ($('abStatus'))
    $('abStatus').textContent = (l ? `Last backup ${abWhen(l.at)}${l.where === 'folder' ? ' in the folder' : l.where === 'download' ? ' (downloaded)' : ''}.` : 'No backup yet.') +
      (c.every === 'off'
        ? ' Automatic backup is off.'
        : ` Next: ${abDue() ? 'now, while the HRMS is open' : c.every === 'day' ? 'tomorrow, the first time the HRMS is open' : 'in a week'}${c.where === 'folder' ? `, keeping the last ${AB_KEEP}` : ''}.`);
  abChip();
}
/* ---------- dashboard reminder ---------- */
function abChip() {
  const head = document.querySelector('#tab-dashboard .dbhead > div');
  if (!head) return;
  let chip = $('abChip');
  const c = abCfg(), age = abAgeDays();
  const need = abNeedsClick || (c.every === 'off' ? age > 7 : age > (c.every === 'week' ? 8 : 2));
  if (!need) {
    if (chip) chip.remove();
    return;
  }
  if (!chip) {
    chip = document.createElement('button');
    chip.type = 'button';
    chip.id = 'abChip';
    chip.className = 'ab-chip';
    const q = $('dbQuote');
    q ? q.insertAdjacentElement('beforebegin', chip) : head.appendChild(chip);
  }
  chip.textContent = abNeedsClick
    ? "Click to save today's backup"
    : age === Infinity ? 'No backup yet · Back up now' : `Last backup ${Math.floor(age)} days ago · Back up now`;
}
document.addEventListener('click', async (ev) => {
  const ev1 = ev.target.closest('#abEvery button, #abWhere button');
  if (ev1) {
    const c = abCfg();
    c[ev1.parentElement.id === 'abEvery' ? 'every' : 'where'] = ev1.dataset.v;
    abSetCfg(c);
    abPaint();
    if (c.where === 'folder' && !abDir) $('abPick')?.click();
    return;
  }
  if (ev.target.closest('#abPick')) {
    try {
      const d = await window.showDirectoryPicker({ id: 'hrms-backups', mode: 'readwrite' });
      abDir = d;
      await idbSet('backupDir', d);
      abSetCfg({ ...abCfg(), where: 'folder' });
      await abRun(true);
    } catch (e) {
      if (e && e.name !== 'AbortError') flash('Could not use that folder');
    }
    abPaint();
    return;
  }
  if (ev.target.closest('#abNow') || ev.target.closest('#abChip')) {
    await abRun(true);
    return;
  }
  // manual backups count too
  if (ev.target.closest('#exportJson') || ev.target.closest('#exportHtml')) setTimeout(() => abMark('manual'), 0);
});
abCard();
const abOrigDashboard = renderDashboard;
renderDashboard = function () {
  abOrigDashboard();
  abChip();
};
setTimeout(abCheck, 4000); // a few seconds after opening, so the first screen is not slowed down
setInterval(abCheck, 30 * 60 * 1000); // and every half hour while the HRMS stays open (for "every day" past midnight)
window.HRMS_BACKUP = { cfg: abCfg, last: abLast, due: abDue, run: abRun, keys: { AB_KEY, AB_LAST } }; // used by the tests
