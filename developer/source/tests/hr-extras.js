// Joiners & leavers (990), automatic backup (991), Reports (992), wishes (993).
//   node source/tests/hr-extras.js ../index.html your-backup.json
// The page clock is pinned to 6 Nov 2026 (HRMS_TEST_DATE to change it).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const PAGE = path.resolve(process.argv[2] || 'index.html');
const DATA = fs.readFileSync(path.resolve(process.argv[3] || 'data.json'), 'utf8');
const TODAY = process.env.HRMS_TEST_DATE || '2026-11-06';
let pass = 0, fail = 0;
const check = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'ok   ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' → ' + JSON.stringify(x).slice(0, 400))); };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, timezoneId: 'Asia/Kolkata' });
  const p = await ctx.newPage();
  await p.clock.setFixedTime(new Date(`${TODAY}T11:00:00+05:30`));
  await p.route('https://**', (r) => r.abort());
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  const load = async (extra = {}) => {
    await p.goto('file://' + PAGE);
    await p.evaluate(([d, x]) => {
      localStorage.clear();
      localStorage.setItem('acmelabs_hrms_v1', d);
      localStorage.setItem('acmelabs_hrms_splash', 'off');
      localStorage.setItem('acmelabs_hrms_motion', 'off');
      Object.entries(x).forEach(([k, v]) => localStorage.setItem(k, v));
    }, [DATA, extra]);
    await p.reload();
    await p.waitForTimeout(1200);
  };
  await load();
  const S = (f, a) => p.evaluate(f, a);

  /* ---------- menu ---------- */
  check('menu: Reports and Joiners & leavers added', (await p.locator('#navReports').count()) === 1 && (await p.locator('#navJoiners').count()) === 1);
  check('menu fits a 900 px high screen', await S(() => { const n = document.querySelector('nav'); return n.scrollHeight <= n.clientHeight + 1; }));

  /* ---------- onboarding ---------- */
  await p.click('#navJoiners');
  await p.waitForTimeout(200);
  const onIds = await S(() => HRMS_JL.onbList().map((e) => e.id));
  const recent = await S((t) => S.employees.filter((e) => e.status === 'Active' && e.joining && (new Date(t) - new Date(e.joining)) / 864e5 <= 180).map((e) => e.id), TODAY);
  check('onboarding: everyone who joined in the last 6 months is listed', recent.length > 0 && recent.every((id) => onIds.includes(id)), { onIds, recent });
  const first = onIds[0];
  const card = p.locator(`.jl-card[data-jl="${first}"]`);
  check('onboarding: one card per person, 4 stages', (await p.locator('.jl-card').count()) === onIds.length && (await card.locator('.jl-g').count()) === 4);
  const before = await S((id) => HRMS_JL.onbItems(S.employees.find((e) => e.id === id)).filter((x) => x.done).length, first);
  await card.locator('input[data-jl-k="offer"]').check();
  await p.waitForTimeout(150);
  const after = await S((id) => ({ n: HRMS_JL.onbItems(S.employees.find((e) => e.id === id)).filter((x) => x.done).length, at: S.employees.find((e) => e.id === id).onboard.items.offer }), first);
  check('onboarding: ticking an item saves it with today\'s date', after.n === before + 1 && after.at === TODAY, after);
  check('onboarding: progress shown', new RegExp(`${after.n}/\\d+`).test(await card.locator('.jl-pn').innerText()));
  const autoBank = await S((id) => { const e = S.employees.find((x) => x.id === id); const it = HRMS_JL.onbItems(e).find((x) => x.k === 'bank'); return { auto: it.byData, has: !!(e.bankAccount && (e.ifsc || e.routing)) }; }, first);
  check('onboarding: bank details tick themselves from the profile', autoBank.auto === autoBank.has, autoBank);
  await card.locator('[data-jl-new]').fill('Parking pass issued');
  await card.locator('[data-jl-addit]').click();
  await p.waitForTimeout(150);
  check('onboarding: own items can be added', (await p.locator(`.jl-card[data-jl="${first}"] .jl-it`, { hasText: 'Parking pass issued' }).count()) === 1);
  const other = await S(() => S.employees.find((e) => e.status === 'Active' && !HRMS_JL.onbList().includes(e)).id);
  await p.selectOption('#jlStartSel', other);
  await p.click('#jlStart');
  await p.waitForTimeout(150);
  check('onboarding: can be started for anyone', (await S(() => HRMS_JL.onbList().map((e) => e.id))).includes(other));
  await p.locator(`.jl-card[data-jl="${other}"] [data-jl-stop]`).click();
  await p.waitForTimeout(150);
  check('onboarding: can be removed again', !(await S(() => HRMS_JL.onbList().map((e) => e.id))).includes(other));

  /* ---------- offboarding ---------- */
  await p.click('#jlSeg button[data-v="leaving"]');
  await p.waitForTimeout(150);
  const recentExits = await S((t) => HRMS_JL.offList(false, false).every((e) => !e.lastDay || (new Date(t) - new Date(e.lastDay)) / 864e5 <= 60), TODAY);
  const allExits = await S(() => [HRMS_JL.offList(false, false).length, HRMS_JL.offList(false, true).length]);
  check('offboarding: recent exits by default, older ones on request', recentExits && allExits[1] >= allExits[0], allExits);
  await p.check('#jlOld');
  await p.waitForTimeout(150);
  check('offboarding: "Show older exits" lists them all', (await p.locator('.jl-card[data-kind="off"]').count()) === allExits[1]);
  const leaver = await S(() => HRMS_JL.offList(false, false)[0]?.id);
  check('offboarding: a recent leaver to test with', !!leaver, leaver);
  const lc = p.locator(`.jl-card[data-jl="${leaver}"]`);
  await lc.locator('input[data-jl-k="kt"]').check();
  await p.waitForTimeout(100);
  check('offboarding: half a group does not tick Exit & FNF', (await S((id) => !!S.employees.find((e) => e.id === id).offboarding?.handover, leaver)) === false);
  await p.locator(`.jl-card[data-jl="${leaver}"] input[data-jl-k="notes"]`).check();
  await p.waitForTimeout(100);
  check('offboarding: the whole group ticks "handover" in Exit & FNF', (await S((id) => S.employees.find((e) => e.id === id).offboarding.handover, leaver)) === true);
  await p.locator(`.jl-card[data-jl="${leaver}"] input[data-jl-k="kt"]`).uncheck();
  await p.waitForTimeout(100);
  check('offboarding: unticking one unticks it there too', (await S((id) => S.employees.find((e) => e.id === id).offboarding.handover, leaver)) === false);
  check('offboarding: full & final due 2 working days after the last day (skips weekend and holiday)', (await S(() => HRMS_JL.addWorkingDays('2026-09-30', 2))) === '2026-10-05');
  check('offboarding: due date shown on the card', /full & final due by/.test(await p.locator(`.jl-card[data-jl="${leaver}"] .jl-who small`).innerText()));
  await p.reload();
  await p.waitForTimeout(1200);
  check('checklists are kept after reopening', (await S((id) => !!S.employees.find((e) => e.id === id).onboard?.items?.offer, first)) && (await S((id) => S.employees.find((e) => e.id === id).offboardList?.notes, leaver)) === TODAY);

  /* ---------- reports ---------- */
  await p.click('#navReports');
  await p.waitForTimeout(300);
  const R = await S(() => {
    const D = HRMS_REPORTS.data('fy');
    const indep = D.months.map((x) => ({ m: x.m, net: empsIn(x.m).reduce((t, e) => t + previewPayroll(e, x.m).net, 0), rnet: x.s.net, spend: x.s.spend, dept: Object.values(x.dept).reduce((t, d) => t + d.cost, 0) }));
    return { months: D.months.map((x) => x.m), total: D.total, sum: D.months.reduce((t, x) => t + x.s.spend, 0), indep, runMonth: D.runMonth, forecast: D.forecast, left: D.left };
  });
  check('reports: this financial year = April to this month', R.months[0] === '2026-04' && R.months[R.months.length - 1] === TODAY.slice(0, 7), R.months);
  check('reports: net paid per month matches the payroll engine', R.indep.every((x) => Math.abs(x.net - x.rnet) < 0.05), R.indep.filter((x) => Math.abs(x.net - x.rnet) >= 0.05));
  check('reports: departments add up to each month\'s cost', R.indep.every((x) => Math.abs(x.dept - x.spend) < 1), R.indep.map((x) => [x.m, x.dept, x.spend]));
  check('reports: total = sum of the months', Math.abs(R.total - R.sum) < 0.05);
  check('reports: forecast = paid so far + run-rate × months left', Math.abs(R.forecast - (R.total + R.runMonth * R.left)) < 1 && R.left === 12 - R.months.length, R);
  check('reports: 6 headline figures and a bar per month', (await p.locator('.rp-k').count()) === 6 && (await p.locator('.rp-col').count()) === R.months.length);
  await p.fill('#rpBudget', '15000000');
  await p.click('#rpBudgetSave');
  await p.waitForTimeout(200);
  check('reports: budget saved for the financial year', (await S(() => S.reportBudget['FY 2026-27'])) === 15000000);
  check('reports: spend vs budget and over / under shown', /(Over|Under) budget by/.test(await p.innerText('.rp-budget')));
  await p.selectOption('#rpPeriod', 'last12');
  await p.waitForTimeout(200);
  check('reports: last 12 months period', (await S(() => HRMS_REPORTS.months('last12').all.length)) === 12 && /People cost by month/.test(await p.innerText('#rpBody')));
  const dl = p.waitForEvent('download');
  await p.click('#rpXlsx');
  const xl = await dl;
  check('reports: Excel download', /Acme Labs HRMS report .*\.xlsx$/.test(xl.suggestedFilename()), xl.suggestedFilename());
  await p.click('#navEye');
  await p.waitForTimeout(300);
  check('reports: "Hide amounts" blurs the report figures', (await p.locator('#tab-reports .amt-mask').count()) > 20);
  await p.click('#navEye');

  /* ---------- automatic backup ---------- */
  await p.click('nav button[data-tab="settings"]');
  await p.waitForTimeout(200);
  check('backup: settings card with every day / week / off', (await p.locator('#abCard #abEvery button').count()) === 3);
  check('backup: folder row only for "A folder I choose"', await S(() => document.getElementById('abFolderRow').hidden));
  const d1 = p.waitForEvent('download');
  await p.click('#abNow');
  const bk = await d1;
  const bkFile = await bk.path();
  const bkData = JSON.parse(fs.readFileSync(bkFile, 'utf8'));
  check('backup: "Back up now" saves today\'s backup file', bk.suggestedFilename() === `AcmeLabs_HRMS_backup_${TODAY}.json` && Array.isArray(bkData.employees) && bkData.employees.length > 0, bk.suggestedFilename());
  check('backup: last backup recorded, not due again today', !!(await S(() => HRMS_BACKUP.last())) && (await S(() => HRMS_BACKUP.due())) === false);
  check('backup: status line says when', /Last backup today/.test(await p.innerText('#abStatus')));
  await S(() => localStorage.setItem('acmelabs_hrms_lastbackup', JSON.stringify({ at: new Date(Date.now() - 10 * 864e5).toISOString(), where: 'download' })));
  await p.click('#navDashboard');
  await p.waitForTimeout(200);
  check('backup: dashboard reminder when the last backup is old', /Last backup 10 days ago/.test(await p.innerText('#abChip')));
  await p.click('nav button[data-tab="settings"]');
  await p.waitForTimeout(100);
  const d2 = p.waitForEvent('download');
  await p.click('#exportJson');
  await d2;
  await p.click('#navDashboard');
  await p.waitForTimeout(200);
  check('backup: a manual backup counts (reminder gone)', (await p.locator('#abChip').count()) === 0);
  // fully automatic: with "every day" chosen and no backup today, it saves one by itself after opening
  const d3 = p.waitForEvent('download', { timeout: 15000 }).catch(() => null);
  await load({ acmelabs_hrms_autobackup: JSON.stringify({ every: 'day', where: 'download' }) });
  const auto = await d3;
  check('backup: runs by itself a few seconds after opening', !!auto && /AcmeLabs_HRMS_backup_/.test(auto.suggestedFilename()));
  const d4 = p.waitForEvent('download', { timeout: 7000 }).catch(() => null);
  await load({ acmelabs_hrms_autobackup: JSON.stringify({ every: 'off', where: 'download' }) });
  check('backup: "Off" does not download', !(await d4));

  /* ---------- wishes ---------- */
  await load();
  check('wishes: ordinal numbers', (await S(() => [1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map((n) => HRMS_WISH.text({ e: S.employees[0], k: 'anniv', y: n, d: new Date(), line: 0 }).match(/Happy (\w+) work/)[1]).join())) === '1st,2nd,3rd,4th,11th,12th,13th,21st,22nd,23rd,101st');
  // a birthday today
  const bdayId = await S((t) => {
    const e = S.employees.find((x) => x.status === 'Active');
    e.dob = `1995-${t.slice(5)}`;
    localStorage.setItem('acmelabs_hrms_v1', JSON.stringify(S));
    return e.id;
  }, TODAY);
  await p.reload();
  await p.waitForTimeout(1500);
  check('wishes: today\'s birthday in the dashboard header', /Today: .*birthday · Send a wish/.test(await p.innerText('#wishChip')));
  const wishBtns = await p.locator('#dbBody [data-wish]').count();
  check('wishes: Wish button on birthdays / anniversaries in Upcoming events', wishBtns > 0, wishBtns);
  await p.click('#wishChip');
  await p.waitForTimeout(400);
  const W = await S(() => { const g = (i) => document.getElementById(i); return { open: g('wishDlg').open, title: g('wishTitle').textContent, text: g('wishText').value, img: g('wishImg').src.slice(0, 22), mail: g('wishMail').href, wa: g('wishWa').href }; });
  check('wishes: window opens with the person, message and card', W.open && /Birthday wish for/.test(W.title) && /birthday/i.test(W.text) && W.img === 'data:image/png;base64,', W);
  check('wishes: email and WhatsApp links carry the message', /^mailto:/.test(W.mail) && /subject=Happy%20birthday/.test(W.mail) && /^https:\/\/wa\.me\//.test(W.wa) && W.wa.includes(encodeURIComponent(W.text.slice(0, 20))));
  await p.click('#wishAnother');
  check('wishes: ↻ gives another message', (await p.inputValue('#wishText')) !== W.text);
  await p.fill('#wishText', 'Have a great day! 🎉');
  check('wishes: own words go into the links', (await S(() => document.getElementById('wishWa').href)).endsWith(encodeURIComponent('Have a great day! 🎉')));
  const d5 = p.waitForEvent('download');
  await p.click('#wishPng');
  check('wishes: card downloads as a picture', /birthday\.png$/.test((await d5).suggestedFilename()));
  await p.click('#wishDone');
  await p.waitForTimeout(200);
  check('wishes: marked as wished (kept, chip gone)', !!(await S((id) => Object.keys(S.wishes).find((k) => k.startsWith(id + '-bday-')), bdayId)) && (await p.locator('#wishChip').count()) === 0);
  check('wishes: button shows "Wished ✓"', (await p.locator('#dbBody .wish-btn.done').count()) >= 1);

  check('no page errors', errs.length === 0, errs);
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
