# Acme Labs HRMS (demo)

**Try it live:** https://yatrikrathod1996-alt.github.io/HRMS/

> **This is the demo version.** Every employee, salary, attendance mark, PAN, Aadhaar and bank detail in this
> repository is **made up**. The program is the same one Acme Labs uses, so every calculation works exactly as in
> the real HRMS. The real data is never stored here.

Attendance, leave, payroll, payslips, letters, increments, tasks, holidays, calendar, assets, expense claims, exits
and full & final, and a career record per employee, in one page that runs in the browser. There is no server and no
login. Data is kept in the browser and, if you connect one in **Settings & backup**, in a `.json` data file on your
computer.

## How to open it

**Open the live link above**, or download this repository and open `index.html` in Chrome or Edge. That one file is the whole HRMS: every screen, the fonts and the
logo are inside it. On first open it starts with the demo staff: 22 people on staff (20 in India, 2 USD contractors)
and 3 former employees, with January to September 2026 already paid.

The `developer` folder is only for changing the code (see below).

## What it does

- **Dashboard**: the day at a glance (headcount, present, on leave, absent, new joiners, pending tasks, upcoming
  events, payroll this month); more cards (attendance, payroll trend, leave, headcount by department, team status,
  labour-law updates) under **Customise**; a line of motivation, and *Break time · Acme Labs Dino*, a small jump game.
- **Reports** (for finance): people cost by month and department, annual run-rate, cost per head, budget vs forecast
  for the financial year, attrition, fixed vs variable pay, USD exposure, salary bands, increments' yearly effect; Excel.
- **Joiners & leavers**: onboarding checklist from offer letter to confirmation, and an offboarding checklist kept in
  step with Exit & FNF (full & final due within 2 working days of the last day).
- **Wishes**: a Wish button for birthdays and work anniversaries makes a Acme Labs greeting card and message to copy,
  download, email or send on WhatsApp.
- **Automatic backup**: every day or week while the HRMS is open, into a folder you choose (keeps 14) or Downloads.
- **Employees**: profiles, filters (department, status, slip details, type, location, joining date), sorts,
  career record (salary over time, increments, attendance, leave, reviews, year by year).
- **Attendance**: one click per day with codes P, WFH, WO, H, PL, SL, CL, HD, A, UP; upload an Excel attendance sheet.
- **Leave balances**: yearly PL 12 / SL 3 / CL 3 (changeable per person). Leave beyond the balance is unpaid.
- **Payroll**: worked out from attendance; incentives, performance bonus, reimbursements, other deductions; INR and
  USD staff; optional PF / ESIC / Gujarat professional tax; payslips as PDF; salary sheet as CSV / Excel.
- **Increments** (with letters), **Holidays**, **Calendar**, **Assets**, **Expense claims**, **Exit & FNF**,
  **Documents** (offer, appointment, confirmation letters and more, as PDF or Word).
- **Company letterheads**: in Documents, *Company letterhead* switches between Acme Labs, Orbit Studio (Orbit Studio, Inc.),
  Crimson Works and Tealwave Technosoft. Each has its own design, logo, address, signatory and default stamp, kept separately.
- **Signature and stamp**: the company stamps are built in (Letter details → Company stamp). Drag the signature or the
  stamp in the preview to move it, and set its size under Letter details. Tick-boxes there show or hide the Ref number
  and the Employee ID (both are off by default on the Relieving Letter).
- **Look**: Space theme (dark, with a hyperspace loading screen and moving stars) or Light, in
  Settings & backup → Appearance. Payslips, letters and downloads are always on white paper.

## How pay is worked out

For each person and month:

1. **Per-day pay** = monthly salary ÷ days in the month.
2. **Unpaid days** = A + UP + ½ × HD + leave taken beyond the yearly balance (PL, SL and CL are counted through the year).
3. **Cut for days not worked** = per-day pay × unpaid days.
4. **Net pay** = salary + variable + incentive + performance bonus + reimbursement − cut − other deductions
   − employee PF / ESIC / professional tax (only when switched on). USD salaries are converted at that month's rate.

`developer/source/tests/demo-payroll.js` recalculates all of this on its own for every demo payslip
(237 of them, January to November 2026) and checks that the HRMS gives the same answer to the paisa.

## Folder layout

    index.html            the HRMS, one file (built from the developer folder)
    developer/
      Acme Labs HRMS.html          the page used while developing
      Acme Labs HRMS_files/        the main program (app.js), the demo data (imported-data.js), libraries, logo
      source/
        addons/*.js                each feature as its own file, combined in name order
        styles/*.css               the styles; space-theme.css is generated by tools/space_theme.py
        tests/*.js                 automatic checks (Playwright)
        build.py                   puts it all together

## Changing something

1. Edit the files in `developer/source/addons` or `developer/source/styles`.
2. Build: `cd developer && python3 source/build.py --single ../index.html`
3. Check (needs Node.js and Playwright):

        node source/tests/demo-payroll.js ../index.html                    # pay for every demo payslip
        node source/tests/space-fun.js ../index.html source/tests/demo-data.json   # stars, game, motivation line
        node source/tests/splash.js ../index.html source/tests/demo-data.json      # loading screen
        node source/tests/labour-news.js ../index.html source/tests/demo-data.json # labour-law card
        node source/tests/hr-extras.js ../index.html source/tests/demo-data.json   # checklists, backup, reports, wishes

## Where data is stored

In the browser (`localStorage`, key `acmelabs_hrms_v1`) and, when connected, in a `.json` data file. Use
**Settings & backup → Download backup** regularly. Backups contain every salary and bank detail: keep them private.

General information only, not legal advice: check PF, ESIC, professional tax and minimum-wage rules with a CA or
labour consultant before relying on them.
