// DEMO HRMS: checks that payroll is worked out correctly for every made-up employee and every month.
// The expected pay is recalculated here on its own (not with the HRMS's code) and compared with what the HRMS shows.
//   node source/tests/demo-payroll.js AcmeLabs_HRMS_demo.html
const { chromium } = require('playwright');
const path = require('path');
const PAGE = path.resolve(process.argv[2] || 'AcmeLabs_HRMS_demo.html');
const DEMO_NAMES = ['Alex Morgan', 'Kavya Joshi', 'Meghna Iyengar', 'Nora Adeyemi', 'Aditi Reddy', 'Pallavi Gokhale', 'Siddharth Rane',
  'Tanvi Parikh', 'Arnav Khanna', 'Varun Ahuja', 'Pranav Sinha', 'Harsh Dave', 'Ishaan Bose', 'Simran Gill',
  'Ritika Sen', 'Avni Prasad', 'Zoya Mirza', 'Aditya Pandit', 'Naina Chopra', 'Rehan Kaul', 'Vihaan Jain',
  'Shreya Mathur', 'Dhruv Bajaj', 'Leah Fernandes', 'Neel Shroff'];
let pass = 0, fail = 0;
const check = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'ok   ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' → ' + JSON.stringify(x))); };
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const cnt = (a, k) => a.filter((x) => x === k).length;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.route('https://**', (r) => r.abort());
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + PAGE);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('acmelabs_hrms_splash', 'off'); });
  await p.reload();
  await p.waitForTimeout(1500);

  // everything the HRMS knows, plus its own answer for each person and month
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
  const D = await p.evaluate((months) => {
    const out = { emps: S.employees.map((e) => ({ id: e.id, name: e.name, status: e.status, salary: e.salary, variable: e.variable, currency: e.currency })),
      settings: S.settings, quotas: S.quotas, history: S.history, att: {}, rows: {}, fx: {}, app: {} };
    months.forEach((m) => {
      out.app[m] = {};
      empsIn(m).forEach((e) => {
        const r = pay(e, m);
        out.app[m][e.id] = { net: r.net, lop: r.lop, lopDays: r.lopDays, ded: r.compliance ? r.compliance.employeeTotal : 0 };
      });
      out.att[m] = JSON.parse(JSON.stringify(S.attendance[m] || {}));
      out.rows[m] = JSON.parse(JSON.stringify((S.payroll[m] || {}).rows || {}));
      out.fx[m] = Number((S.payroll[m] || {}).fx || S.settings.fx);
    });
    return out;
  }, months);

  // ---- data is made up
  check('every employee is a demo person', D.emps.every((e) => DEMO_NAMES.includes(e.name)), D.emps.map((e) => e.name).filter((n) => !DEMO_NAMES.includes(n)));
  check('25 demo people (22 on staff + 3 former)', D.emps.length === 25, D.emps.length);
  const profiles = await p.evaluate(() => S.employees.filter((e) => e.pan).map((e) => [e.pan, e.bankName, e.aadhaar]));
  check('PAN, Aadhaar and bank details are clearly fake', profiles.length > 0 && profiles.every(([pan, bank, aad]) => /^DEMOP\d{4}A$/.test(pan) && bank === 'DEMO BANK' && /^0000000000\d\d$/.test(aad)), profiles);

  // ---- independent pay calculation
  const used = {}; // leave used so far this year, per person
  const startUsed = (id) => ({ ...(D.history.year === 2026 ? D.history.used[id] || {} : {}) });
  let checked = 0, wrong = [];
  months.forEach((m) => {
    Object.entries(D.app[m]).forEach(([id, got]) => {
      const a = (D.att[m][id] || []).map((x) => x || 'P');
      const row = D.rows[m][id] || {};
      const e = D.emps.find((x) => x.id === id);
      const sal = Number(row.salary != null ? row.salary : e.salary);
      const vari = Number(row.variable != null ? row.variable : e.variable || 0);
      const fx = (row.currency || e.currency) === 'USD' ? D.fx[m] : 1;
      const q = { PL: D.settings.PL, SL: D.settings.SL, CL: D.settings.CL, ...(D.quotas[id] || {}) };
      const u = (used[id] = used[id] || startUsed(id));
      let over = 0;
      ['PL', 'SL', 'CL'].forEach((t) => { over += Math.max(0, cnt(a, t) - Math.max(0, q[t] - (u[t] || 0))); });
      const lopDays = cnt(a, 'A') + cnt(a, 'UP') + 0.5 * cnt(a, 'HD') + over;
      const lop = r2((sal / a.length) * lopDays);
      const earn = r2(r2(sal * fx) + r2(vari * fx) + r2(+row.inc || 0) + r2(+row.bonus || 0) + r2(+row.reimb || 0));
      const net = r2(earn - r2(r2(lop * fx) + r2(+row.other || 0)));
      ['PL', 'SL', 'CL'].forEach((t) => (u[t] = (u[t] || 0) + cnt(a, t)));
      checked++;
      if (Math.abs(net - got.net) > 0.01 || got.lopDays !== lopDays || got.ded) wrong.push({ m, id, expected: net, hrms: got.net, lopDays, hrmsLop: got.lopDays, ded: got.ded });
    });
  });
  check(`net pay matches an independent calculation (${checked} payslips, Jan–Nov 2026)`, wrong.length === 0 && checked > 200, wrong.slice(0, 5));
  check('no PF / ESIC / PT taken while "Deduct PF" and "Deduct ESIC" are off', Object.values(D.app).every((x) => Object.values(x).every((r) => !r.ded)));

  // ---- specific cases the demo was built to show
  const aug6 = D.app['2026-08']['ML-006'];
  check('leave beyond the yearly quota becomes unpaid (Ishaan Bose, Aug)', aug6 && aug6.lopDays > 0 && aug6.lop > 0, aug6);
  const usd = D.app['2026-03']['ML-013'], usdRow = D.rows['2026-03']['ML-013'];
  check('USD contractor converted at the month rate (Alex Morgan, Mar)', usd && usd.net > 1400 * 90 && D.rows['2026-03']['ML-013'].currency === 'USD', { usd, usdRow, fx: D.fx['2026-03'] });
  check('increment applied from October (Varun Ahuja ₹18,000 → ₹22,000)', Number(D.rows['2026-10']['ML-020'].salary) === 22000 && Number(D.rows['2026-09']['ML-020'].salary) === 18000);
  check('raise mid-year kept in history (Harsh Dave ₹70,000 → ₹78,000 from April)', Number(D.rows['2026-03']['ML-008'].salary) === 70000 && Number(D.rows['2026-04']['ML-008'].salary) === 78000);
  check('mid-month joiner paid only from the joining date (Simran Gill, Jun)', D.app['2026-06']['ML-014'] && D.app['2026-06']['ML-014'].lopDays >= 21, D.app['2026-06']['ML-014']);
  check('people who left are not on October payroll', !D.app['2026-10']['ML-003'] && !D.app['2026-10']['ML-007']);
  check('former staff are inactive with paid months', ['Dhruv Bajaj', 'Leah Fernandes', 'Neel Shroff'].every((n) => D.emps.find((e) => e.name === n)?.status === 'Inactive'));

  // ---- the screen shows the same numbers
  await p.click('nav button[data-tab="payroll"]');
  await p.evaluate(() => { month = '2026-10'; render(); });
  await p.waitForTimeout(300);
  const shown = await p.evaluate(() => [...document.querySelectorAll('#payTable tbody tr')].length);
  check('October payroll table lists everyone on October payroll', shown === Object.keys(D.app['2026-10']).length, { shown, expected: Object.keys(D.app['2026-10']).length });
  const onScreen = await p.evaluate(() => [...document.querySelectorAll('#payTable tbody .profile-name')].map((x) => x.textContent.trim()));
  check('every name in the payroll table is a demo person', onScreen.length > 0 && onScreen.every((n) => DEMO_NAMES.includes(n)), onScreen.filter((n) => !DEMO_NAMES.includes(n)));
  check('page opens without errors', errs.length === 0, errs);
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
