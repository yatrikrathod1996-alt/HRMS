/* ============================================================
   LABOUR LAW UPDATES on the Dashboard (India and Gujarat):
   - "What applies to Acme Labs": the rules in force, checked
     against your own employees (who is under the PF / ESIC
     ceilings, the Gujarat minimum wage, the 20-worker threshold).
     Checked against the sources on 5 November 2026.
   - "Latest news": live headlines from Google News (read through
     rss2json.com, only the search words are sent), refreshed every
     6 hours or with Refresh; the last headlines are kept for offline.
   ============================================================ */
const LAW_CHECKED = '5 Nov 2026';
// tiny dino hopping after a butterfly: shown while the news refreshes (an original drawing)
const LAW_DINO = `<svg class="ln-dino" viewBox="0 0 64 40" aria-hidden="true">
  <g class="ln-fly"><g class="ln-wings"><path d="M0 0 C-6 -7 -9 -1 -1 1 Z" fill="#f472b6"/><path d="M0 0 C6 -7 9 -1 1 1 Z" fill="#a78bfa"/><path d="M0 1 C-4 5 -6 2 -1 1 Z" fill="#f9a8d4"/><path d="M0 1 C4 5 6 2 1 1 Z" fill="#c4b5fd"/></g><rect x="-0.6" y="-2" width="1.2" height="5" rx="0.6" fill="#4c1d95"/></g>
  <g class="ln-rex"><path d="M10 33 C8 25 11 18 18 17 C21 11 30 10 32 16 C34 20 31 24 27 24 L26 29 C26 33 22 35 18 35 C14 35 11 35 10 33 Z" fill="#34d399"/>
    <path d="M10 31 C6 31 3 29 2 26 C5 28 8 28 11 27 Z" fill="#34d399"/><path d="M15 18 L16 15 L18 17 Z M20 15 L21 12 L23 14 Z M25 13 L27 10 L28 13 Z" fill="#059669"/>
    <circle cx="28.5" cy="16.5" r="1.4" fill="#064e3b"/><circle cx="29" cy="16" r="0.45" fill="#fff"/><path d="M28 21.5 Q30 22.5 31.5 21" stroke="#064e3b" stroke-width="0.9" fill="none" stroke-linecap="round"/>
    <path d="M23 25 L27 27" stroke="#059669" stroke-width="1.6" stroke-linecap="round"/><rect x="13" y="34" width="3.4" height="4" rx="1.5" fill="#059669"/><rect x="20" y="34" width="3.4" height="4" rx="1.5" fill="#059669"/></g>
</svg>`;
const LAW_NEWS_KEY = 'acmelabs_hrms_law_news';
const LAW_NEWS_QUERIES = [
  '"labour code" OR "labour codes" OR EPFO OR ESIC OR "minimum wages" India when:30d',
  'Gujarat labour OR "shops and establishments" Gujarat OR "Gujarat minimum wages" when:60d',
];
// ₹ followed by a word joiner: law thresholds are not salaries, so "Hide amounts" leaves them readable
const LR = (n) => '₹⁠' + Number(n).toLocaleString('en-IN');
const LAW_MIN_WAGE = 13637; // Gujarat, Zone I unskilled, per month, 1 Oct 2026 – 31 Mar 2027 (skilled rates are higher)

const lawIntern = (e) => /intern|trainee|apprentice/i.test(`${e.type || ''} ${e.designation || ''}`);
function lawIndia() {
  return S.employees.filter((e) => e.status === 'Active' && e.currency !== 'USD');
}
const lawNames = (list) =>
  list.length
    ? list
        .slice(0, 6)
        .map((e) => esc(fullName(e)) + (lawIntern(e) ? ' (intern)' : ''))
        .join(', ') + (list.length > 6 ? ` +${list.length - 6} more` : '')
    : '';

function lawRules() {
  const india = lawIndia(),
    pfOn = S.employees.some((e) => (e.salaryPolicies || []).some((p) => p.pfEnabled)),
    underPF = india.filter((e) => Number(e.salary) > 0 && Number(e.salary) <= 25000),
    underESI = india.filter((e) => Number(e.salary) > 0 && Number(e.salary) <= 21000),
    belowMin = india.filter((e) => Number(e.salary) > 0 && Number(e.salary) < LAW_MIN_WAGE),
    underMin = belowMin.filter((e) => !lawIntern(e)),
    internsBelow = belowMin.filter(lawIntern),
    basic = Number((S.slip || {}).basic || 0);
  return [
    {
      tag: 'PF',
      date: '17 Sep 2026',
      title: `EPF wage ceiling raised from ${LR(15000)} to ${LR(25000)} a month`,
      body: `Notification S.O. 5109(E): PF is compulsory for staff earning up to ${LR(25000)} in establishments covered by EPFO (20 or more employees). Employee share at the ceiling: ${LR(3000)} a month.`,
      check: underPF.length
        ? `${underPF.length} of your India staff earn ${LR(25000)} or less: ${lawNames(underPF)}. PF is ${pfOn ? 'on for some people' : 'switched off'} in this HRMS — confirm with your CA whether Acme Labs must deduct PF for them.`
        : `No India staff earn ${LR(25000)} or less.`,
      level: underPF.length ? 'warn' : 'ok',
      src: 'https://www.kanakkupillai.com/learn/epfo-wage-ceiling-increased-25000/',
    },
    {
      tag: 'ESIC',
      date: 'unchanged',
      title: `ESIC ceiling stays at ${LR(21000)} a month`,
      body: `The PF change does not change ESIC: employees earning up to ${LR(21000)} (${LR(25000)} for persons with disabilities) are covered where ESIC applies (10 or more employees).`,
      check: underESI.length
        ? `${underESI.length} earn ${LR(21000)} or less: ${lawNames(underESI)}.`
        : `No India staff earn ${LR(21000)} or less.`,
      level: underESI.length ? 'warn' : 'ok',
      src: 'https://www.sgcms.com/regulatory-updates/?p=3551',
    },
    {
      tag: 'Gujarat',
      date: '1 Oct 2026',
      title: `Gujarat minimum wages revised (1 Oct 2026 – 31 Mar 2027)`,
      body: `Shops and Establishments, Zone I unskilled: ${LR(524.5)} a day, ${LR(LAW_MIN_WAGE)} a month (up ${LR(312)} a month); skilled rates are higher.`,
      check:
        (underMin.length
          ? `Below ${LR(LAW_MIN_WAGE)}: ${lawNames(underMin)}. Check their pay.`
          : `All employees in India are paid at least ${LR(LAW_MIN_WAGE)} a month.`) +
        (internsBelow.length
          ? ` Interns on a lower stipend: ${lawNames(internsBelow)} — minimum wages usually don't apply to a genuine internship; keep the internship letter on file.`
          : ''),
      level: underMin.length ? 'bad' : internsBelow.length ? 'warn' : 'ok',
      src: 'https://ascent-hr.com/?p=44824',
    },
    {
      tag: 'Gujarat',
      date: 'Feb 2026',
      title: 'Gujarat Shops & Establishments Act now applies from 20 workers (was 10)',
      body: 'The Gujarat Shops and Establishments (Amendment) Act 2026 raised the threshold for registration and the Act’s rules.',
      check: `Acme Labs has ${india.length} active staff in India${india.length >= 20 ? ': the Act applies.' : `: below 20, but check again when you hire (${20 - india.length} more).`}`,
      level: 'info',
      src: 'https://ianslive.in/gujarat-assembly-passes-shops-and-establishments-amendment-bill-sets-10-hour-daily-work-limit--20260217181046',
    },
    {
      tag: 'Codes',
      date: '21 Nov 2025 · rules 8 May 2026',
      title: 'Four Labour Codes in force; Central Rules notified',
      body: 'The Code on Wages, Social Security, Industrial Relations and OSH Codes replaced 29 laws. Under the Code on Wages, allowances above 50% of pay count as wages for PF, gratuity and bonus, and full and final pay is due within 2 working days of the exit.',
      check: `Your salary breakup has Basic at ${basic}%${basic >= 50 ? ' ✓ (meets the 50% rule).' : ' — below 50%: allowances above half of pay will count as wages.'} Settle exits within 2 working days (Exit / FNF).`,
      level: basic >= 50 ? 'ok' : 'warn',
      src: 'https://iuslaboris.com/insights/india-labour-codes-central-rules/',
    },
  ];
}

function lawReadCache() {
  try {
    const c = JSON.parse(localStorage.getItem(LAW_NEWS_KEY) || 'null');
    return c && Array.isArray(c.items) ? c : null;
  } catch (e) {
    return null;
  }
}
const lawDecode = (s) => {
  const t = document.createElement('textarea');
  t.innerHTML = String(s || '');
  return t.value;
};
let lawLoading = null,
  lawError = '';
async function lawFetch(force) {
  const c = lawReadCache();
  if (!force && c && Date.now() - c.at < 6 * 3600 * 1000) return c;
  if (lawLoading) return lawLoading;
  lawLoading = (async () => {
    try {
      const all = [];
      for (const q of LAW_NEWS_QUERIES) {
        const rss =
          'https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=en-IN&gl=IN&ceid=IN:en';
        const r = await fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(rss));
        const j = await r.json();
        if (j.status !== 'ok') throw new Error(j.message || 'news service unavailable');
        all.push(...(j.items || []));
      }
      const seen = new Set(),
        items = [];
      all
        .map((i) => {
          const full = lawDecode(i.title),
            cut = full.lastIndexOf(' - ');
          return {
            title: cut > 20 ? full.slice(0, cut) : full,
            source: cut > 20 ? full.slice(cut + 3) : i.author || '',
            link: /^https:\/\//.test(i.link || '') ? i.link : '',
            date: String(i.pubDate || '').slice(0, 10),
          };
        })
        .filter((i) => i.link && i.title)
        .sort((a, b) => b.date.localeCompare(a.date))
        .forEach((i) => {
          const k = i.title.toLowerCase().slice(0, 60);
          if (seen.has(k)) return;
          seen.add(k);
          items.push(i);
        });
      const out = { at: Date.now(), items: items.slice(0, 10) };
      try {
        localStorage.setItem(LAW_NEWS_KEY, JSON.stringify(out));
      } catch (e) {}
      lawError = '';
      return out;
    } catch (e) {
      lawError = 'offline';
      return lawReadCache();
    } finally {
      lawLoading = null;
    }
  })();
  return lawLoading;
}
function lawAgo(t) {
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1
    ? 'just now'
    : m < 60
      ? m + ' min ago'
      : m < 1440
        ? Math.round(m / 60) + ' h ago'
        : Math.round(m / 1440) + ' days ago';
}
function lawNewsHtml(c) {
  const g =
    'https://news.google.com/search?q=' +
    encodeURIComponent('India labour law') +
    '&hl=en-IN&gl=IN&ceid=IN:en';
  const status = lawError
    ? `<span class="ln-off">Couldn't reach the news service${c ? ` · showing headlines from ${lawAgo(c.at)}` : ''}</span>`
    : c
      ? `Updated ${lawAgo(c.at)}`
      : `<span class="ln-busy">${LAW_DINO}Catching the latest news…</span>`;
  const list =
    c && c.items.length
      ? `<ol class="ln-list">${c.items
          .map(
            (i) =>
              `<li><a href="${esc(i.link)}" target="_blank" rel="noopener noreferrer">${esc(i.title)}</a><small>${esc(i.source)}${i.date ? ' · ' + esc(fmtLong(i.date)) : ''}</small></li>`,
          )
          .join('')}</ol>`
      : lawError
        ? `<p class="d2-empty">No headlines yet. Connect to the internet and press Refresh, or <a href="${g}" target="_blank" rel="noopener noreferrer">open Google News</a>.</p>`
        : '<p class="d2-empty">Loading the latest headlines…</p>';
  return `<div class="ln-status">${status}</div>${list}<div class="ln-foot">Headlines from Google News, read through rss2json.com (only the search words are sent). <a href="${g}" target="_blank" rel="noopener noreferrer">More on Google News ↗</a></div>`;
}
function lawCardHtml() {
  const rules = lawRules();
  return `<div class="d2-card s12 law-card" id="lawCard"><div class="d2-h"><h3>${icon('clip', 'blue')}Labour law updates · India & Gujarat</h3><span class="ln-tools"><span class="d2-tag">Rules checked ${LAW_CHECKED}</span><button type="button" class="btn" id="lawRefresh">Refresh news</button></span></div>
    <div class="ln-grid">
      <div class="ln-col"><h4>What applies to Acme Labs</h4><ul class="ln-rules">${rules
        .map(
          (r) =>
            `<li class="lv-${r.level}"><div class="ln-meta"><span class="pillx">${esc(r.tag)}</span><time>${esc(r.date)}</time></div><b>${esc(r.title)}</b><p class="ln-check">${r.check}</p><details><summary>Details</summary><p>${esc(r.body)}</p><a href="${esc(r.src)}" target="_blank" rel="noopener noreferrer">Source ↗</a></details></li>`,
        )
        .join('')}</ul>
        <p class="ln-note">General information, not legal advice. Check with your CA or labour consultant before changing PF, ESIC or pay.</p></div>
      <div class="ln-col"><h4>Latest news</h4><div id="lawNews">${lawNewsHtml(lawReadCache())}</div></div>
    </div></div>`;
}
function lawPaintNews(c) {
  const box = document.getElementById('lawNews');
  if (box) box.innerHTML = lawNewsHtml(c);
}

const lawOrigDashboard = renderDashboard;
renderDashboard = function () {
  lawOrigDashboard();
  const grid = document.querySelector('#dbBody .d2');
  if (!grid) return;
  const before = grid.querySelector(':scope > .d2-full');
  const tmp = document.createElement('div');
  tmp.innerHTML = lawCardHtml();
  grid.insertBefore(tmp.firstElementChild, before || null);
  lawFetch(false).then(lawPaintNews);
};
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('#lawRefresh');
  if (!b) return;
  b.disabled = true;
  b.classList.add('busy');
  b.innerHTML = `${LAW_DINO}<span>Refreshing…</span>`;
  const box = document.getElementById('lawNews');
  if (box) box.classList.add('ln-loading');
  // the dino gets at least a moment to catch the butterfly, even when the news comes back at once
  Promise.all([lawFetch(true), new Promise((r) => setTimeout(r, 1200))]).then(([c]) => {
    lawPaintNews(c);
    b.disabled = false;
    b.classList.remove('busy');
    b.textContent = 'Refresh news';
  });
});
window.HRMS_LAW = { lawRules, lawFetch, key: LAW_NEWS_KEY, render: () => renderDashboard() }; // used by the tests
