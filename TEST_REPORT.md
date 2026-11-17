# Test report (demo)

Run on 6 November 2026 against `index.html` in this repository. All data is made up.

| Suite | What it checks | Result |
|---|---|---|
| `demo-payroll.js` | Net pay for all 237 demo payslips (Jan–Nov 2026) recalculated independently and compared to the paisa; unpaid days, leave beyond the yearly balance, USD conversion, increments, mid-month joiners, exits, former staff; fake PAN / Aadhaar / bank; payroll screen | 15 / 15 |
| `space-fun.js` | Focused dashboard and Customise, moving stars (on/off, Light theme, reduce motion, 30 fps), Break time · Acme Labs Dino (start, jump, cubes, crash, best score, pause), line of motivation | 35 / 35 |
| `splash.js` | Hyperspace warp loading screen, the "None" choice, backup warning | 12 / 12 |
| `hr-extras.js` | Joiners & leavers checklists (synced with Exit & FNF, settlement due in 2 working days), automatic backup (daily/weekly, folder or downloads, reminder), Reports (figures match the payroll engine, departments add up, budget and forecast, Excel), birthday and anniversary wishes | 50 / 50 |
| `labour-news.js` | Labour-law card: rules checked against the data, news loading, duplicates, offline, Hide amounts, phone width | 20 / 20 |

**132 checks, all passing.**

The real HRMS has a larger set of suites (payslips, attendance upload, letters, end-to-end, people modules, career
record) that check named real employees; those stay with the real data and are not part of this repository.
