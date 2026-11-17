/* Test of the Labour law updates card on the Dashboard (87-labour-news.js).
   Usage: node source/tests/labour-news.js <page.html> <data.json>   (needs Node and Playwright)
   The news service is answered locally, so no internet is needed. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PAGE = path.resolve(process.argv[2] || 'index.html');
const DATA = fs.readFileSync(path.resolve(process.argv[3] || 'data.json'), 'utf8');
let pass = 0,
  fail = 0;
const failures = [];
function check(name, ok, info = '') {
  if (ok) pass++;
  else {
    fail++;
    failures.push(`${name} ${info}`);
  }
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !info ? '' : '  → ' + info}`);
}
const ITEMS = [
  {
    title: 'EPFO issues FAQs on &amp; wage ceiling - StudyCafe',
    link: 'https://news.google.com/rss/articles/a1',
    pubDate: '2026-10-07 07:00:00',
  },
  {
    title: 'Gujarat minimum wages from October 2026 - AscentHR',
    link: 'https://news.google.com/rss/articles/a2',
    pubDate: '2026-11-02 03:34:21',
  },
  {
    title: 'Gujarat minimum wages from October 2026 - AscentHR',
    link: 'https://news.google.com/rss/articles/a2b',
    pubDate: '2026-11-01 03:34:21',
  },
  { title: 'Bad link item - X', link: 'javascript:alert(1)', pubDate: '2026-11-03 00:00:00' },
];

(async () => {
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Kolkata' });
  await p.clock.setFixedTime(new Date(process.env.HRMS_TEST_DATE || '2026-11-05T12:00:00+05:30'));
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  let calls = 0,
    mode = 'ok';
  await p.route('https://api.rss2json.com/**', (route) => {
    calls++;
    if (mode === 'down') return route.abort();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ status: 'ok', items: ITEMS }),
    });
  });
  await p.goto('file://' + PAGE);
  for (let attempt = 0; attempt < 5; attempt++) {
    await p.evaluate((d) => {
      (localStorage.setItem('acmelabs_hrms_dash', JSON.stringify(['tasks','events','paysum','att','trend','leave','quick','dept','activity','team','law','game'])), localStorage.setItem('acmelabs_hrms_v1', d));
      localStorage.removeItem('acmelabs_hrms_law_news');
    }, DATA);
    await p.waitForTimeout(300);
    await p.reload();
    await p.waitForTimeout(1500);
    if (await p.evaluate(() => typeof S !== 'undefined' && S.employees.length > 5)) break;
  }
  await p.waitForTimeout(500);
  const d = await p.evaluate(() => {
    const card = document.getElementById('lawCard');
    const india = S.employees.filter((e) => e.status === 'Active' && e.currency !== 'USD');
    return {
      card: !!card,
      inDashboard: !!card && !!card.closest('#dbBody'),
      rules: card ? card.querySelectorAll('.ln-rules li').length : 0,
      pf: card ? card.querySelector('.ln-rules li').textContent : '',
      wantPF: india.filter((e) => e.salary > 0 && e.salary <= 25000).length,
      minWage: card ? card.querySelectorAll('.ln-rules li')[2].textContent : '',
      belowMin: india.filter((e) => e.salary > 0 && e.salary < 13637).map((e) => e.name),
      internNote: card
        ? /Interns on a lower stipend: Simran Gill \(intern\)/.test(
            card.querySelectorAll('.ln-rules li')[2].textContent,
          )
        : false,
      hasHimanshi: S.employees.some((e) => e.id === 'ML-023' && e.status === 'Active'),
      se: card ? card.querySelectorAll('.ln-rules li')[3].textContent : '',
      nIndia: india.length,
      news: [...document.querySelectorAll('#lawNews .ln-list li')].map((li) => li.textContent),
      hrefs: [...document.querySelectorAll('#lawNews .ln-list a')].map((a) => [
        a.getAttribute('href'),
        a.target,
        a.rel,
      ]),
      cache: JSON.parse(localStorage.getItem('acmelabs_hrms_law_news') || 'null'),
      status: (document.querySelector('#lawNews .ln-status') || {}).textContent,
    };
  });
  check('Labour law card is on the Dashboard', d.card && d.inDashboard);
  check('five rules shown', d.rules === 5, String(d.rules));
  check(
    'PF rule counts India staff at or under ₹25,000 from the data',
    d.wantPF ? d.pf.includes(`${d.wantPF} of your India staff`) : d.pf.includes('No India staff'),
    d.pf,
  );
  check(
    'minimum wage rule checks pay against ₹13,637 (interns listed separately)',
    d.belowMin.length
      ? d.belowMin.every((n) => d.minWage.includes(n.split(' (')[0]))
      : /All employees in India are paid at least/.test(d.minWage),
    d.minWage,
  );
  check(
    'intern below the minimum wage is shown as an intern, not as underpaid staff',
    !d.hasHimanshi || d.internNote,
  );
  check(
    'Shops & Establishments rule counts India staff',
    d.se.includes(`${d.nIndia} active staff in India`),
    d.se,
  );
  check(
    'news loaded, duplicates removed, newest first',
    d.news.length === 2 && /^Gujarat minimum wages/.test(d.news[0]),
    JSON.stringify(d.news),
  );
  check(
    'headline text decoded and source split off',
    /EPFO issues FAQs on & wage ceiling/.test(d.news[1]) && /StudyCafe/.test(d.news[1]),
  );
  check(
    'unsafe links dropped; links open in a new tab safely',
    d.hrefs.every(([h, t, r]) => /^https:\/\//.test(h) && t === '_blank' && /noopener/.test(r)),
  );
  check('headlines saved for offline use', d.cache && d.cache.items.length === 2);
  check('status says when it was updated', /Updated just now/.test(d.status), d.status);

  // within 6 hours: no new request
  const before = calls;
  await p.evaluate(() => HRMS_LAW.render());
  await p.waitForTimeout(300);
  check('no new request within 6 hours', calls === before, `${calls - before} new`);
  // Refresh forces one, with the dino animation on the button while it runs
  await p.click('#lawRefresh');
  await p.waitForTimeout(100);
  check(
    'dino catching a butterfly shows while refreshing',
    await p.evaluate(
      () =>
        !!document.querySelector('#lawRefresh.busy svg.ln-dino .ln-fly') &&
        document.getElementById('lawRefresh').disabled,
    ),
  );
  await p.waitForTimeout(1600);
  check('Refresh news fetches again', calls > before);

  // offline with saved headlines
  mode = 'down';
  await p.click('#lawRefresh');
  await p.waitForTimeout(1600);
  const off = await p.evaluate(() => ({
    status: document.querySelector('#lawNews .ln-status').textContent,
    n: document.querySelectorAll('#lawNews .ln-list li').length,
    btn: document.getElementById('lawRefresh').textContent,
  }));
  check(
    'offline: keeps the saved headlines and says so',
    off.n === 2 && /Couldn't reach the news service/.test(off.status),
    off.status,
  );
  check('Refresh button comes back after a failure', off.btn === 'Refresh news', off.btn);
  // offline, nothing saved
  await p.evaluate(() => {
    localStorage.removeItem('acmelabs_hrms_law_news');
    HRMS_LAW.render();
  });
  await p.click('#lawRefresh');
  await p.waitForTimeout(1600);
  check(
    'offline with nothing saved: explains and links to Google News',
    await p.evaluate(
      () =>
        /No headlines yet/.test(document.getElementById('lawNews').textContent) &&
        !!document.querySelector('#lawNews a[href^="https://news.google.com/search"]'),
    ),
  );

  // Hide amounts must not blur the law thresholds
  await p.evaluate(() => document.getElementById('navEye').click());
  await p.waitForTimeout(300);
  check(
    'Hide amounts leaves the legal thresholds readable',
    await p.evaluate(
      () => document.body.classList.contains('hide-money') && !document.querySelector('#lawCard .amt-mask'),
    ),
  );
  await p.evaluate(() => document.getElementById('navEye').click());

  // phone
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(300);
  check(
    'fits a phone screen',
    await p.evaluate(
      () =>
        document.getElementById('lawCard').scrollWidth <= document.getElementById('lawCard').clientWidth + 1,
    ),
  );

  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) console.log(failures.join('\n'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
