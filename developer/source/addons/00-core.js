const SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';
/* ---------- shared helpers used by every add-on ---------- */
const $ = (id) => document.getElementById(id);
const todayISO = () => iso(new Date());
const dOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const parseISO = (s) => {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};
const dayDiff = (a, b) => Math.round((dOnly(a) - dOnly(b)) / 864e5);
const shortDate = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/* ---------- add-on tabs (Dashboard, Tasks, Holidays, Documents, Increments) ----------
   They sit in the menu next to the app's own tabs. One router shows them, keeps the menu highlight right
   and re-draws the open one whenever app.js re-renders. Functions in afterRender run after every render. */
const addonTabs = {},
  afterRender = [];
let openTab = null;
function addTab(key, { label, html, section, place, render }) {
  const b = document.createElement('button');
  b.type = 'button';
  b.id = 'nav' + key[0].toUpperCase() + key.slice(1);
  if (html) b.innerHTML = html;
  else b.textContent = label;
  const anchor =
    document.querySelector(place[0]) || document.querySelector('nav button[data-tab="settings"]');
  anchor.insertAdjacentElement(anchor === document.querySelector(place[0]) ? place[1] : 'beforebegin', b);
  b.addEventListener('click', () => showTab(key, true));
  addonTabs[key] = { button: b, section, render };
}
function showTab(key, scroll) {
  const t = addonTabs[key];
  openTab = key;
  document.querySelectorAll('main section').forEach((s) => s.classList.toggle('hide', s.id !== t.section));
  document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b === t.button));
  const fb = $('filterbar');
  if (fb) fb.style.display = 'none';
  t.render();
  if (scroll) {
    const sec = $(t.section);
    if (sec) sec.scrollTop = 0;
    window.scrollTo(0, 0);
  }
}
const isOpen = (key) => openTab === key;
// a click on one of the app's own tabs closes the add-on tab
document.querySelector('nav').addEventListener(
  'click',
  (ev) => {
    if (ev.target.closest('button[data-tab]')) openTab = null;
  },
  true,
);
const appRender = window.render;
window.render = function () {
  const out = appRender.apply(this, arguments);
  // each step runs on its own: one failing screen or module never stops the others (e.g. history tracking)
  try {
    if (openTab) showTab(openTab, false);
  } catch (err) {
    console.warn('HRMS screen refresh', err);
  }
  afterRender.forEach((f) => {
    try {
      f();
    } catch (err) {
      console.warn('HRMS after-render step', err);
    }
  });
  return out;
};

/* the name to show where space is short (Calendar, cards): first and last name, never just the first name.
   One-word names use the legal name when there is one; ALL-CAPS names are shown
   in normal case (RIYA → Riya). */
function fullName(e) {
  if (!e) return '';
  const tidy = (n) =>
    String(n || '')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\b([A-Z])([A-Z]+)\b/g, (m, a, b) => (m.length > 2 ? a + b.toLowerCase() : m));
  const name = tidy(e.name),
    plain = name.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  if (plain.split(' ').length >= 2) return name;
  const legal = tidy(e.legalName);
  return legal && legal.toLowerCase() !== plain.toLowerCase() ? legal : name;
}
