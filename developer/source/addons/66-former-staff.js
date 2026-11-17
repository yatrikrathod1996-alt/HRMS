/* Former employees (DEMO): added once as inactive, with their attendance and paid months. Runs once
   (S.formerStaffV1); never changes a month or a row that is already there. */
const FORMER_STAFF = [
  {
    "legacy": 231,
    "name": "Dhruv Bajaj",
    "designation": "Backend Developer",
    "department": "Engineering",
    "joining": "2025-04-01",
    "lastDay": "2026-03-31",
    "type": "Full-time",
    "salary": 55000,
    "months": {
      "2026-01": {
        "sal": 55000,
        "paid": 55000.0,
        "att": "P,P,WO,WO,WFH,P,P,P,P,WO,WO,P,P,H,P,P,WO,WO,P,P,P,P,P,WO,WO,H,P,P,P,P,WO"
      },
      "2026-02": {
        "sal": 55000,
        "paid": 55000.0,
        "att": "WO,WFH,P,P,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,P,P,WO"
      },
      "2026-03": {
        "sal": 55000,
        "paid": 55000.0,
        "att": "WO,P,P,H,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,H,P,WO,WO,P,P"
      }
    }
  },
  {
    "legacy": 232,
    "name": "Leah Fernandes",
    "designation": "Social Media Executive",
    "department": "Marketing",
    "joining": "2025-04-01",
    "lastDay": "2026-05-15",
    "type": "Full-time",
    "salary": 32000,
    "months": {
      "2026-01": {
        "sal": 32000,
        "paid": 32000.0,
        "att": "P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,H,P,P,WO,WO,P,P,WFH,P,P,WO,WO,H,P,P,P,P,WO"
      },
      "2026-02": {
        "sal": 32000,
        "paid": 32000.0,
        "att": "WO,P,WFH,P,P,WFH,WO,WO,P,P,WFH,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,P,P,WO"
      },
      "2026-03": {
        "sal": 32000,
        "paid": 32000.0,
        "att": "WO,P,P,H,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,H,P,WO,WO,P,P"
      },
      "2026-04": {
        "sal": 32000,
        "paid": 32000.0,
        "att": "P,P,P,WO,WO,P,P,P,WFH,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,P"
      },
      "2026-05": {
        "sal": 32000,
        "paid": 15483.87,
        "att": "P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,P,P,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A"
      }
    }
  },
  {
    "legacy": 233,
    "name": "Neel Shroff",
    "designation": "Sales Executive",
    "department": "Sales",
    "joining": "2025-04-01",
    "lastDay": "2026-07-31",
    "type": "Full-time",
    "salary": 29000,
    "months": {
      "2026-01": {
        "sal": 29000,
        "paid": 29000.0,
        "att": "P,WFH,WO,WO,P,P,P,P,P,WO,WO,P,P,H,P,P,WO,WO,P,P,P,P,P,WO,WO,H,P,P,P,P,WO"
      },
      "2026-02": {
        "sal": 29000,
        "paid": 28482.14,
        "att": "WO,P,P,P,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,P,P,WO,WO,HD,P,P,P,P,WO"
      },
      "2026-03": {
        "sal": 29000,
        "paid": 29000.0,
        "att": "WO,P,P,H,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,H,P,WO,WO,P,P"
      },
      "2026-04": {
        "sal": 29000,
        "paid": 29000.0,
        "att": "P,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,P"
      },
      "2026-05": {
        "sal": 29000,
        "paid": 29000.0,
        "att": "P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,P,P,WO,WO"
      },
      "2026-06": {
        "sal": 29000,
        "paid": 29000.0,
        "att": "P,P,P,P,P,WO,WO,P,WFH,P,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P"
      },
      "2026-07": {
        "sal": 29000,
        "paid": 28064.52,
        "att": "P,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,P,P,P,WO,WO,P,P,A,P,P"
      }
    }
  }
];
const fsNorm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
const fsNext = (iso) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return iso && !isNaN(d)
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    : '';
};

function applyFormerStaff() {
  if (S.formerStaffV1) return false;
  S.formerStaffV1 = true;
  S.roster = S.roster || {};
  FORMER_STAFF.forEach((p) => {
    // someone already added by hand (same name) is left as it is
    if (S.employees.some((e) => fsNorm(e.name) === fsNorm(p.name))) return;
    const e = {
      id: nextId(),
      legacy: p.legacy,
      name: p.name,
      designation: p.designation,
      department: p.department,
      joining: p.joining,
      lastDay: p.lastDay,
      inactiveSince: fsNext(p.lastDay),
      type: p.type,
      currency: 'INR',
      salary: p.salary,
      variable: 0,
      status: 'Inactive',
      location: 'India',
      phone: '',
      email: '',
      bankName: '',
      bankAccount: '',
      ifsc: '',
      swift: '',
      routing: '',
      notes: `Former employee, added from the HR time sheet (paid ${Object.keys(p.months).length} month(s) in 2026; last working day on the sheet ${p.lastDay}).`,
    };
    S.employees.push(e);
    Object.entries(p.months).forEach(([m, x]) => {
      S.attendance[m] = S.attendance[m] || {};
      if (!S.attendance[m][e.id]) S.attendance[m][e.id] = x.att.split(',');
      const P = (S.payroll[m] = S.payroll[m] || { fx: S.settings.fx, rows: {} });
      P.rows = P.rows || {};
      if (!P.rows[e.id])
        P.rows[e.id] = {
          inc: 0,
          bonus: 0,
          reimb: 0,
          other: 0,
          reason: 'Imported from the HR time sheet (former employee)',
          status: 'Paid',
          salary: x.sal,
          variable: 0,
          currency: 'INR',
          currencyFromProfile: true,
          paidLegacy: x.paid,
        };
      if (Array.isArray(S.roster[m]) && !S.roster[m].includes(e.id)) S.roster[m].push(e.id);
    });
  });
  return true;
}

/* Two people (ML-003, ML-007) were last paid for September 2026. Their last working day becomes
   30 Sep 2026; unpaid draft rows and attendance after it are removed. Paid months are never touched. */
const EXITED_SEP26 = ['ML-003', 'ML-007'];
function applyExitDates() {
  if (S.exitDatesV1) return false;
  S.exitDatesV1 = true;
  EXITED_SEP26.forEach((id) => {
    const e = S.employees.find((x) => x.id === id);
    if (!e || (e.lastDay && e.lastDay > '2026-09-30')) return; // a later exit date entered by HR is kept
    if (S.payroll['2026-10']?.rows?.[id]?.status === 'Paid') return; // paid for October after all: leave as is
    e.status = 'Inactive';
    e.lastDay = e.lastDay || '2026-09-30';
    e.inactiveSince = e.inactiveSince || '2026-10-01';
    Object.keys(S.payroll).forEach((m) => {
      const rows = S.payroll[m].rows || {};
      if (m > '2026-09' && rows[id] && rows[id].status !== 'Paid') {
        delete rows[id];
        if (S.attendance[m]) delete S.attendance[m][id];
      }
    });
    Object.keys(S.attendance).forEach((m) => {
      if (m > '2026-09' && S.attendance[m] && !S.payroll[m]?.rows?.[id]) delete S.attendance[m][id];
    });
    if (S.roster)
      Object.keys(S.roster).forEach((m) => {
        if (m > '2026-09' && Array.isArray(S.roster[m])) S.roster[m] = S.roster[m].filter((x) => x !== id);
      });
  });
  return true;
}
function applyAuditUpdates() {
  const a = applyFormerStaff(),
    b = applyExitDates();
  if (a || b) save();
  return a || b;
}
applyAuditUpdates();
// a data file connected later (or a restored backup) gets the same one-time update
afterRender.push(() => {
  if (applyAuditUpdates()) render();
});
