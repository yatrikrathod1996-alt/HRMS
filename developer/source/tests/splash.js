/* Test of the loading screen and its Settings choice (index.html shell + 985-splash-choice.js).
   Usage: node source/tests/splash.js <page.html> <data.json> */
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
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
  await p.route('https://**', (r) => r.abort());
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto('file://' + PAGE);
  await p.evaluate((d) => {
    localStorage.clear();
    localStorage.setItem('acmelabs_hrms_v1', d);
  }, DATA);
  for (const [style, sel] of [
    [null, '.sky .sa'],
    ['storm', '.sky .sa'],
  ]) {
    await p.evaluate(
      (s) =>
        s
          ? localStorage.setItem('acmelabs_hrms_splash', s)
          : localStorage.removeItem('acmelabs_hrms_splash'),
      style,
    );
    await p.reload({ waitUntil: 'commit' });
    await p.waitForSelector('#mlSplash', { timeout: 5000 }).catch(() => {});
    check(
      `${style ? 'old choice ' + style + ' → warp' : 'default (warp)'} loading screen shows`,
      await p.evaluate((s) => !!document.querySelector('#mlSplash ' + s), sel),
    );
    check(
      `${style || 'storm'}: never blocks clicks`,
      await p.evaluate(() => getComputedStyle(document.getElementById('mlSplash')).pointerEvents === 'none'),
    );
    await p.waitForTimeout(3300);
    check(
      `${style || 'storm'}: removed once the HRMS has opened`,
      await p.evaluate(() => !document.getElementById('mlSplash')),
    );
  }
  await p.click('nav button[data-tab="settings"]');
  await p.waitForTimeout(300);
  check(
    'Settings has the Loading animation card with 2 choices',
    (await p.locator('#splashChoice input[name=splashStyle]').count()) === 2,
  );
  await p.click('label.sc-opt:has(input[value=off])');
  check('choice is saved', (await p.evaluate(() => localStorage.getItem('acmelabs_hrms_splash'))) === 'off');
  await p.reload({ waitUntil: 'commit' });
  await p.waitForTimeout(150);
  check(
    '"None" opens without a loading screen',
    await p.evaluate(() => !document.getElementById('mlSplash')),
  );
  await p.waitForTimeout(1500);
  check('data untouched by the loading screen', await p.evaluate(() => S.employees.length > 20));
  await p.click('nav button[data-tab="settings"]');
  check(
    'backup warning is in the Backup card',
    await p.evaluate(() => !!document.querySelector('.set-card #exportWarn')),
  );
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) console.log(failures.join('\n'));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
