const KEY = 'acmelabs_hrms_v1';
// Jan–Aug 2026 from Time_sheet.xlsx; September 2026 from the Google Time sheet (snapshot 13 October 2026).

const HIST_VERSION = 2;
const CODES = ['P', 'WFH', 'WO', 'H', 'PL', 'SL', 'CL', 'HD', 'A', 'UP'];
const CODE_NAMES = {
  P: 'Present',
  WFH: 'Work from home',
  WO: 'Weekly off',
  H: 'Holiday',
  PL: 'Paid leave',
  SL: 'Sick leave',
  CL: 'Casual leave',
  HD: 'Half day',
  A: 'Absent',
  UP: 'Unpaid leave',
};

function seed() {
  const E = (id, legacy, name, designation, joining, type, currency, salary, variable, notes = '') => ({
    id,
    legacy,
    name,
    designation,
    joining,
    type,
    currency,
    salary,
    variable,
    status: 'Active',
    notes,
  });
  return {
    settings: { PL: 12, SL: 3, CL: 3, fx: 95 },
    employees: [
      E('ML-013', 213, 'Alex Morgan', 'Developer', '', 'Contractor', 'USD', 1400, 0),
      E('ML-005', 205, 'Kavya Joshi', 'Product Manager', '2024-08-19', 'Full-time', 'INR', 70000, 0),
      E('ML-009', 209, 'Meghna Iyengar', 'Support Executive', '2023-12-11', 'Full-time', 'INR', 45000, 0),
      E('ML-002', 202, 'Nora Adeyemi', 'Developer', '', 'Contractor', 'USD', 900, 0),
      E('ML-016', 216, 'Aditi Reddy', 'AI/ML Developer', '2025-03-10', 'Full-time', 'INR', 110000, 0),
      E('ML-007', 207, 'Pallavi Gokhale', 'Machine Learning Engineer', '2024-04-15', 'Full-time', 'INR', 90000, 0),
      E('ML-017', 217, 'Siddharth Rane', 'System Administrator', '2025-04-01', 'Full-time', 'INR', 68000, 0),
      E('ML-011', 211, 'Tanvi Parikh', 'Customer Support', '2024-04-22', 'Full-time', 'INR', 44000, 0),
      E('ML-012', 212, 'Arnav Khanna', 'UI/UX Designer', '2025-10-13', 'Full-time', 'INR', 32000, 0),
      E('ML-020', 220, 'Varun Ahuja', 'Support', '2025-10-13', 'Full-time', 'INR', 18000, 0),
      E('ML-015', 215, 'Pranav Sinha', 'Support', '2025-11-03', 'Full-time', 'INR', 30000, 0),
      E('ML-008', 208, 'Harsh Dave', 'UI Front-end Developer', '2024-11-04', 'Full-time', 'INR', 78000, 0),
      E('ML-006', 206, 'Ishaan Bose', 'Customer Support Executive', '2024-11-11', 'Full-time', 'INR', 36000, 0),
      E('ML-014', 214, 'Simran Gill', 'Digital Marketing Intern', '2026-06-22', 'Intern', 'INR', 15000, 0),
      E('ML-021', 221, 'Ritika Sen', 'Video Editor', '2026-06-29', 'Full-time', 'INR', 38000, 0),
      E('ML-003', 203, 'Avni Prasad', 'QA Engineer', '2026-07-01', 'Full-time', 'INR', 26000, 0),
      E('ML-019', 219, 'Zoya Mirza', 'Sales Executive', '2025-01-06', 'Full-time', 'INR', 34000, 0),
      E('ML-010', 210, 'Aditya Pandit', 'Support Executive', '2025-01-06', 'Full-time', 'INR', 38000, 0),
      E('ML-018', 218, 'Naina Chopra', 'Content Writer', '2025-01-06', 'Full-time', 'INR', 35000, 0),
      E('ML-004', 204, 'Rehan Kaul', 'Product Manager', '2025-01-06', 'Full-time', 'INR', 62000, 0),
      E('ML-001', 201, 'Vihaan Jain', 'Customer Support Executive', '2025-02-03', 'Full-time', 'INR', 28000, 0),
      E('ML-022', 222, 'Shreya Mathur', 'HR Manager', '2025-05-05', 'Full-time', 'INR', 60000, 0),
    ],
    // Leave used before the HRMS started (demo values)
    history: {
      year: 2026,
      throughMonth: 0,
      used: {},
      _old: {
        'ML-013': { PL: 0, SL: 1, CL: 0 },
        'ML-005': { PL: 1, SL: 1, CL: 0 },
        'ML-009': { PL: 0, SL: 0, CL: 0 },
        'ML-002': { PL: 2, SL: 0, CL: 0 },
        'ML-016': { PL: 1, SL: 1, CL: 0 },
        'ML-007': { PL: 0, SL: 1, CL: 0 },
        'ML-017': { PL: 1, SL: 0, CL: 0 },
        'ML-011': { PL: 0, SL: 0, CL: 0 },
        'ML-012': { PL: 1, SL: 0, CL: 0 },
        'ML-020': { PL: 0, SL: 0, CL: 0 },
      },
    },
    attendance: {}, // 'YYYY-MM': {empId:[codes]}
    payroll: {}, // 'YYYY-MM': {fx, rows:{empId:{inc,reimb,other,reason,status,salary?,variable?,paidLegacy?}}}
    roster: {}, // 'YYYY-MM': [empIds] for imported months
    quotas: {}, // empId:{PL,SL,CL} overrides
  };
}

let storageOK = true,
  S,
  recoveryRawData = '',
  hasUnresolvedStorageError = false;

/* Rename permanent employee IDs while retaining every saved link and payroll row. */
const EMPLOYEE_ID_MAP = {
  'EMP-021': 'ML-001',
  'EMP-004': 'ML-002',
  'EMP-016': 'ML-003',
  'EMP-020': 'ML-004',
  'EMP-002': 'ML-005',
  'EMP-013': 'ML-006',
  'EMP-006': 'ML-007',
  'EMP-012': 'ML-008',
  'EMP-003': 'ML-009',
  'EMP-018': 'ML-010',
  'EMP-008': 'ML-011',
  'EMP-009': 'ML-012',
  'EMP-001': 'ML-013',
  'EMP-014': 'ML-014',
  'EMP-011': 'ML-015',
  'EMP-005': 'ML-016',
  'EMP-007': 'ML-017',
  'EMP-019': 'ML-018',
  'EMP-017': 'ML-019',
  'EMP-010': 'ML-020',
  'EMP-015': 'ML-021',
  'EMP-022': 'ML-022',
};
function migrateEmployeeIds() {
  const mapping = { ...EMPLOYEE_ID_MAP };
  const used = new Set((S.employees || []).map((e) => mapping[e.id] || e.id));
  let next = Math.max(22, ...[...used].map((id) => Number((id.match(/^ML-(\d+)$/) || [])[1] || 0))) + 1;
  (S.employees || [])
    .filter((e) => /^EMP-\d+$/.test(e.id) && !mapping[e.id])
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((e) => {
      let id;
      do {
        id = 'ML-' + String(next++).padStart(3, '0');
      } while (used.has(id));
      mapping[e.id] = id;
      used.add(id);
    });
  const remap = (value) => {
    if (typeof value === 'string') return mapping[value] || value;
    if (Array.isArray(value)) return value.map(remap);
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [mapping[k] || k, remap(v)]));
    return value;
  };
  S = remap(S);
  S.employeeIdFormat = 'ML-v1';
}

/* Shared validation. Amounts stay numeric and backups are installed atomically. */
const isMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value));
function isDate(value) {
  if (!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(String(value))) return false;
  const [y, m, d] = value.split('-').map(Number),
    date = new Date(value + 'T00:00:00');
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
const validAmount = (value, min = 0) =>
  value !== '' && Number.isFinite(Number(value)) && Number(value) >= min;
function validateBackup(data) {
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    !Array.isArray(data.employees) ||
    !data.settings ||
    typeof data.settings !== 'object'
  )
    throw new Error('The file is not an HRMS backup.');
  const ids = new Set();
  for (const e of data.employees) {
    if (
      !e ||
      typeof e.id !== 'string' ||
      !/^(?:ML|EMP)-\d{3,}$/.test(e.id) ||
      typeof e.name !== 'string' ||
      !e.name.trim()
    )
      throw new Error('An employee record has an invalid ID or name.');
    const id = EMPLOYEE_ID_MAP[e.id] || e.id;
    if (ids.has(id)) throw new Error('Employee IDs must be unique.');
    ids.add(id);
    if (!validAmount(e.salary) || !validAmount(e.variable ?? 0) || !['INR', 'USD'].includes(e.currency))
      throw new Error('An employee salary or currency is invalid.');
    for (const k of ['joining', 'lastDay', 'dob'])
      if (e[k] && !isDate(e[k])) throw new Error('An employee date is invalid.');
    for (const k of ['profileDocuments', 'profileSources', 'profileImportConflicts', 'salaryPolicies'])
      if (e[k] != null && !Array.isArray(e[k])) throw new Error('An employee profile list is invalid.');
  }
  for (const k of ['PL', 'SL', 'CL'])
    if (!validAmount(data.settings[k])) throw new Error('Leave quotas must be non-negative numbers.');
  if (!validAmount(data.settings.fx, 0.000001)) throw new Error('The USD exchange rate must be positive.');
  for (const [m, p] of Object.entries(data.payroll || {})) {
    if (!isMonth(m) || !p || typeof p !== 'object') throw new Error('A payroll month is invalid.');
    if (p.fx != null && !validAmount(p.fx, 0.000001)) throw new Error('A payroll exchange rate is invalid.');
    for (const row of Object.values(p.rows || {})) {
      if (!row || typeof row !== 'object') throw new Error('A payroll row is invalid.');
      for (const k of ['salary', 'variable', 'inc', 'bonus', 'reimb', 'other', 'paidLegacy'])
        if (row[k] != null && !validAmount(row[k])) throw new Error('A payroll amount is invalid.');
    }
  }
  for (const [m, rows] of Object.entries(data.attendance || {})) {
    if (!isMonth(m) || !rows || typeof rows !== 'object') throw new Error('An attendance month is invalid.');
    for (const days of Object.values(rows))
      if (
        !Array.isArray(days) ||
        days.length !== daysIn(m) ||
        days.some((c) => c != null && c !== '' && !CODES.includes(c))
      )
        throw new Error('Attendance contains invalid day codes.');
  }
  for (const q of Object.values(data.quotas || {}))
    for (const k of ['PL', 'SL', 'CL'])
      if (q[k] != null && !validAmount(q[k])) throw new Error('An employee leave quota is invalid.');
  return true;
}
function installState(data) {
  validateBackup(data);
  const previous = S,
    copy = JSON.parse(JSON.stringify(data));
  try {
    S = copy;
    S.attendance = S.attendance || {};
    S.payroll = S.payroll || {};
    S.roster = S.roster || {};
    S.quotas = S.quotas || {};
    S.history = S.history || { year: Number(month.slice(0, 4)), throughMonth: 0, used: {} };
    S.history.used = S.history.used || {};
    S.history.throughMonth = S.history.throughMonth || 0;
    migrateEmployeeIds();
    applyImport();
    migrate();
    migrate4();
    migrate5();
    applySeptemberImport();
    applyProfileImport();
    applyBankUpdateV1();
    applyAccommodationV2();
    initializeAutomaticStatutory();
    S.slip = { ...SLIP_DEFAULT, ...S.slip };
    const companyError = validateCompanySettings(S.settings, S.slip);
    if (companyError) throw new Error(companyError);
    for (const record of Object.values(S.history.used || {}))
      for (const k of ['PL', 'SL', 'CL'])
        if (record[k] != null && !validAmount(record[k]))
          throw new Error('Leave history contains an invalid amount.');
    if (S.schemaVersion !== 6)
      for (const e of S.employees)
        for (const p of e.salaryPolicies || [])
          if (p.effectiveFrom >= '2026-10')
            for (const scheme of ['pf', 'esi']) {
              if (p[scheme + 'BaseMode'] === 'manual' && Number(p[scheme + 'MonthlyWages'] || 0) === 0)
                p[scheme + 'BaseMode'] = 'statutory';
            }
    S.schemaVersion = 6;
    const employeesById = new Map(S.employees.map((e) => [e.id, e]));
    for (const p of Object.values(S.payroll)) {
      if (p.fx == null) p.fx = S.settings.fx;
      for (const [id, row] of Object.entries(p.rows || {})) {
        const e = employeesById.get(id);
        if (!e) continue;
        if (row.salary == null) {
          row.salary = e.salary;
          row.salaryFromProfile = true;
        }
        if (row.variable == null) {
          row.variable = e.variable || 0;
          row.variableFromProfile = true;
        }
        if (!row.currency) {
          row.currency = e.currency;
          row.currencyFromProfile = true;
        }
      }
    }
    for (const e of S.employees)
      for (const p of e.salaryPolicies || []) {
        const policy = { ...defaultSalaryPolicy(p.effectiveFrom, e), ...p };
        policy.pfCoverageMode = p.pfCoverageMode || (p.pfEnabled ? 'on' : 'off');
        policy.esiCoverageMode = p.esiCoverageMode || (p.esiEnabled ? 'on' : 'off');
        const error = validateSalaryPolicy(policy);
        if (error) throw new Error('Salary settings for ' + e.name + ': ' + error);
      }
    hasUnresolvedStorageError = false;
    return true;
  } catch (error) {
    S = previous;
    throw error;
  }
}
function validateCompanySettings(settings, slip) {
  if (!validAmount(settings.fx, 0.000001)) return 'Enter a positive USD exchange rate.';
  if (['PL', 'SL', 'CL'].some((k) => !validAmount(settings[k])))
    return 'Leave quotas must be non-negative numbers.';
  const fields = ['basic', 'hra', 'conv', 'med'];
  if (
    fields.some((k) => slip[k] === '' || !Number.isFinite(slip[k]) || slip[k] < 0 || slip[k] > 100) ||
    fields.reduce((sum, k) => sum + slip[k], 0) > 100
  )
    return 'Salary breakup percentages must total 100% or less.';
  return '';
}

function load() {
  let raw = '';
  try {
    raw = localStorage.getItem(KEY) || '';
  } catch (error) {
    storageOK = false;
  }
  try {
    // a copy of the HRMS saved with its data inside: use that data when it is newer than this browser's
    const embedded = typeof window !== 'undefined' && window.HRMS_EMBEDDED ? window.HRMS_EMBEDDED : null;
    let data = raw ? JSON.parse(raw) : null;
    const useEmbedded = embedded && (!data || Number(embedded.savedAt || 0) > Number(data.savedAt || 0));
    if (useEmbedded) data = JSON.parse(JSON.stringify(embedded));
    installState(data || seed());
    if (useEmbedded && storageOK)
      try {
        localStorage.setItem(KEY, JSON.stringify(S));
      } catch (e) {}
  } catch (error) {
    recoveryRawData = raw;
    hasUnresolvedStorageError = Boolean(raw);
    installState(seed());
    hasUnresolvedStorageError = Boolean(raw);
    const banner = document.getElementById('storageBanner');
    banner.textContent =
      'Saved data could not be loaded. Your original browser data has not been overwritten. Use Settings & backup to download a recovery copy or restore a valid backup.';
    banner.style.display = 'block';
  }
  if (!storageOK) document.getElementById('storageBanner').style.display = 'block';
}
const SLIP_DEFAULT = {
  company: 'Orbit Studio, Inc.',
  address: 'Acme Labs, 100 Example Street, Suite 1, San Francisco, CA 94100',
  basic: 50,
  hra: 25,
  conv: 2.635,
  med: 2.09,
};
const DEPTS = {
  'ML-013': 'Engineering',
  'ML-005': 'Product',
  'ML-009': 'Support',
  'ML-002': 'Engineering',
  'ML-016': 'Engineering',
  'ML-007': 'Engineering',
  'ML-017': 'IT & Infrastructure',
  'ML-011': 'Support',
  'ML-012': 'Design',
  'ML-020': 'Support',
  'ML-015': 'Support',
  'ML-008': 'Engineering',
  'ML-006': 'Support',
  'ML-014': 'Marketing',
  'ML-021': 'Marketing',
  'ML-003': 'Engineering',
  'ML-019': 'Sales',
  'ML-010': 'Support',
  'ML-018': 'Marketing',
  'ML-004': 'Product',
  'ML-001': 'Support',
  'ML-022': 'HR',
};
function migrate() {
  if ((S.v || 0) >= 3) return;
  S.slip = Object.assign({}, SLIP_DEFAULT, S.slip || {});
  S.employees.forEach((e) => {
    if (e.department === undefined) e.department = DEPTS[e.id] || 'Unassigned';
    ['phone', 'bankName', 'bankAccount'].forEach((k) => {
      if (e[k] === undefined) e[k] = '';
    });
  });
  S.v = 3;
}
function migrate4() {
  if ((S.v || 0) >= 4) return;
  S.employees.forEach((e) => {
    if (e.swift === undefined) e.swift = '';
  });
  if (!S.settings.disp) S.settings.disp = 'INR';
  S.v = 4;
}
function migrate5() {
  if ((S.v || 0) >= 5) return;
  S.employees.forEach((e) => {
    if (e.location === undefined) e.location = e.currency === 'USD' ? 'Outside India' : 'India';
    ['ifsc', 'routing'].forEach((k) => {
      if (e[k] === undefined) e[k] = '';
    });
  });
  const vm = S.employees.find((e) => e.id === 'ML-017');
  if (vm) {
    vm.variable = 0;
    vm.notes = '';
  }
  S.v = 5;
}
const hasPaidRows = (m) => Object.values(S.payroll?.[m]?.rows || {}).some((r) => r && r.status === 'Paid');
function applyImport() {
  if (S.histVersion === HIST_VERSION) return;
  S.roster = S.roster || {};
  Object.keys(IMPORTED.att).forEach((m) => {
    if (hasPaidRows(m)) return; // never overwrite a month whose salaries are already marked Paid
    S.attendance[m] = {};
    Object.entries(IMPORTED.att[m]).forEach(
      ([id, str]) => (S.attendance[m][id] = str.split(',').map((x) => x || null)),
    );
    S.payroll[m] = JSON.parse(JSON.stringify(IMPORTED.payroll[m]));
    S.roster[m] = IMPORTED.roster[m].slice();
  });
  S.history = { year: 2026, throughMonth: 0, used: {} };
  S.histVersion = HIST_VERSION;
}

/* September source update: apply once without replacing earlier months or employee profiles. */
const SEPTEMBER_IMPORT_VERSION = '2026-09-google-sheet-2026-10-13';
const SEPTEMBER_BACKUP_KEY = KEY + '_before_september_2026';
function applySeptemberImport() {
  if (S.septemberImportVersion === SEPTEMBER_IMPORT_VERSION) return;
  const m = '2026-09';
  if (hasPaidRows(m)) {
    // September is already paid in this data (e.g. a restored backup): keep it as it is
    S.septemberImportVersion = SEPTEMBER_IMPORT_VERSION;
    return;
  }
  // Keep a downloadable copy of existing browser data before replacing September.
  if (storageOK && (S.attendance[m] || S.payroll[m])) {
    try {
      localStorage.setItem(SEPTEMBER_BACKUP_KEY, JSON.stringify(S));
    } catch (e) {}
  }
  // Permanent portal IDs distinguish the two employees with legacy code 133.
  const defaults = seed().employees;
  IMPORTED.roster[m].forEach((id) => {
    if (!S.employees.some((e) => e.id === id)) {
      const e = defaults.find((e) => e.id === id);
      if (e)
        S.employees.push({
          ...e,
          department: DEPTS[id] || 'Unassigned',
          phone: '',
          bankName: '',
          bankAccount: '',
          ifsc: '',
          routing: '',
          swift: '',
          location: e.currency === 'USD' ? 'Outside India' : 'India',
        });
    }
  });
  S.attendance[m] = {};
  Object.entries(IMPORTED.att[m]).forEach(([id, str]) => (S.attendance[m][id] = str.split(',')));
  S.payroll[m] = JSON.parse(JSON.stringify(IMPORTED.payroll[m]));
  S.roster = S.roster || {};
  S.roster[m] = IMPORTED.roster[m].slice();
  S.septemberImportVersion = SEPTEMBER_IMPORT_VERSION;
}

/* Fill only empty employee profile fields from the inspected email records. */

const PROFILE_IMPORT_VERSION = 'employee-email-profiles-2026-10-13-v1';
function applyProfileImport() {
  if (S.profileImportVersion === PROFILE_IMPORT_VERSION) return;
  PROFILE_EMAIL_RECORDS.forEach((record) => {
    const employee = S.employees.find((e) => e.id === record.id);
    if (!employee) return;
    const conflicts = [];
    Object.entries(record.fields).forEach(([key, value]) => {
      if (!value) return;
      if (!String(employee[key] ?? '').trim()) employee[key] = value;
      else if (String(employee[key]).trim().toLowerCase() !== String(value).trim().toLowerCase())
        conflicts.push(key);
    });
    employee.profileDocuments = employee.profileDocuments || [];
    record.documents.forEach((doc) => {
      if (!employee.profileDocuments.some((d) => d.url === doc.url))
        employee.profileDocuments.push({ ...doc });
    });
    employee.profileSources = employee.profileSources || [];
    record.sources.forEach((source) => {
      if (!employee.profileSources.some((s) => s.url === source.url))
        employee.profileSources.push({ ...source });
    });
    if (conflicts.length) employee.profileImportConflicts = conflicts;
  });
  S.profileImportVersion = PROFILE_IMPORT_VERSION;
}

function applyBankUpdateV1() {}

function save() {
  S.savedAt = Date.now();
  if (storageOK && !hasUnresolvedStorageError) {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {
      storageOK = false;
      document.getElementById('storageBanner').style.display = 'block';
    }
  }
  if (fileHandle && fileOK) scheduleWrite();
  else if (hasUnresolvedStorageError) {
    // the stored data could not be read: keep it untouched, but never pretend a change was saved
    try {
      localStorage.setItem(KEY + '_unsaved', JSON.stringify(S));
    } catch (e) {}
    flash('Not saved: restore a backup in Settings & backup first');
  } else flash(storageOK ? 'Saved in this browser only' : 'Not saved');
}
/* ---- data file on the computer (Chrome / Edge) ---- */
const fsSupported = typeof window !== 'undefined' && 'showSaveFilePicker' in window;
let fileHandle = null,
  fileOK = false,
  writeTimer = null;
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('mlhrms', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbSet(k, v) {
  try {
    const db = await idb();
    await new Promise((r) => {
      const t = db.transaction('kv', 'readwrite');
      t.objectStore('kv').put(v, k);
      t.oncomplete = r;
      t.onerror = r;
    });
  } catch (e) {}
}
async function idbGet(k) {
  try {
    const db = await idb();
    return await new Promise((r) => {
      const q = db.transaction('kv').objectStore('kv').get(k);
      q.onsuccess = () => r(q.result);
      q.onerror = () => r(null);
    });
  } catch (e) {
    return null;
  }
}
let fileWriteQueue = Promise.resolve();
function scheduleWrite() {
  clearTimeout(writeTimer);
  flash('Saving to file…');
  writeTimer = setTimeout(writeFile, 500);
}
function writeFile() {
  const handle = fileHandle,
    snapshot = JSON.stringify(S, null, 1);
  fileWriteQueue = fileWriteQueue
    .catch(() => {})
    .then(async () => {
      if (!handle || handle !== fileHandle || !fileOK) return;
      try {
        const writer = await handle.createWritable();
        await writer.write(snapshot);
        await writer.close();
        flash(
          'Saved to ' +
            handle.name +
            ' at ' +
            new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        );
      } catch (error) {
        fileOK = false;
        fileUI();
        flash('Could not save to the file. Reconnect the data file.');
      }
    });
  return fileWriteQueue;
}

function fileUI() {
  const st = document.getElementById('fileStatus'),
    rc = document.getElementById('reconnectBtn');
  if (!st) return;
  if (!fsSupported) {
    st.textContent =
      'Saving to a file needs Google Chrome or Microsoft Edge on a computer. In this browser, use Download backup instead.';
    rc.style.display = 'none';
    return;
  }
  st.textContent = fileHandle
    ? fileOK
      ? `Connected: every change is saved to "${fileHandle.name}".`
      : `"${fileHandle.name}" needs permission again. Click Reconnect data file.`
    : 'No data file connected. Changes are saved in this browser only.';
  rc.style.display = fileHandle && !fileOK ? 'inline-block' : 'none';
  document.getElementById('navReconnect').style.display = fileHandle && !fileOK ? 'block' : 'none';
}
async function loadFromHandle(h) {
  const txt = await (await h.getFile()).text();
  if (!txt.trim()) throw new Error('The data file is empty.');
  return installState(JSON.parse(txt));
}
async function createDataFile() {
  try {
    const h = await window.showSaveFilePicker({
      suggestedName: 'AcmeLabs_HRMS_data.json',
      types: [{ description: 'HRMS data', accept: { 'application/json': ['.json'] } }],
    });
    fileHandle = h;
    fileOK = true;
    await idbSet('handle', h);
    save();
    fileUI();
    render();
  } catch (e) {}
}
async function openDataFile() {
  try {
    const [h] = await window.showOpenFilePicker({
      types: [{ description: 'HRMS data', accept: { 'application/json': ['.json'] } }],
    });
    const perm = await h.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      alert('Permission to edit the file was not given, so it was not connected.');
      return;
    }
    await loadFromHandle(h);
    fileHandle = h;
    fileOK = true;
    await idbSet('handle', h);
    save();
    fileUI();
    render();
    alert(`Loaded and connected "${h.name}".`);
  } catch (e) {
    if (e && e.name !== 'AbortError')
      alert(
        'That file is not an HRMS data file. Choose the .json file created with "Create data file" or "Download backup".',
      );
  }
}
async function reconnect() {
  if (!fileHandle) return;
  try {
    const perm = await fileHandle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') return;
    const cur = S.savedAt || 0;
    const tmp = S;
    try {
      await loadFromHandle(fileHandle);
      if ((S.savedAt || 0) < cur) S = tmp;
    } catch (e) {
      S = tmp;
    }
    fileOK = true;
    save();
    fileUI();
    render();
  } catch (e) {}
}
async function disconnectFile() {
  clearTimeout(writeTimer);
  fileHandle = null;
  fileOK = false;
  await idbSet('handle', null);
  fileUI();
  flash('Saved in this browser only');
}
async function initFile() {
  if (!fsSupported) {
    fileUI();
    return;
  }
  const h = await idbGet('handle');
  if (!h) {
    fileUI();
    return;
  }
  fileHandle = h;
  try {
    fileOK = (await h.queryPermission({ mode: 'readwrite' })) === 'granted';
  } catch (e) {
    fileOK = false;
  }
  if (fileOK) {
    const cur = S.savedAt || 0,
      tmp = S;
    try {
      await loadFromHandle(h);
      if ((S.savedAt || 0) < cur) S = tmp;
    } catch (e) {
      S = tmp;
    }
    render();
  }
  fileUI();
}
function flash(t) {
  const el = document.getElementById('saveState');
  // while saved data cannot be read, nothing is saved: keep showing that instead of "saved" messages
  if (hasUnresolvedStorageError && !(fileHandle && fileOK))
    t = 'Not saved: restore a backup in Settings & backup first';
  el.textContent = t;
}

// screens open on last month: the month whose attendance and salaries are being closed
let month = (() => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  })(),
  brushCode = 'A';
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
// one shared number formatter (building a new one for every amount was the slowest part of large screens)
const MONEY_FMT = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (n, cur = 'INR') => (cur === 'USD' ? '$' : '₹') + MONEY_FMT.format(Number(n || 0));
const r2 = (n) => {
  n = Number(n);
  return (Math.sign(n) * Math.round((Math.abs(n) + Number.EPSILON * Math.max(1, Math.abs(n))) * 100)) / 100;
};
const YM_CACHE = new Map();
const ym = (m) => {
  let v = YM_CACHE.get(m);
  if (!v) YM_CACHE.set(m, (v = m.split('-').map(Number)));
  return [v[0], v[1]]; // a fresh pair each time, so callers can't change the cached one
};
const daysIn = (m) => {
  const [y, mo] = ym(m);
  return new Date(y, mo, 0).getDate();
};
const MONTH_LABELS = new Map(); // "October 2026" is worked out once per month (it was called for every cell)
const monthLabel = (m) => {
  if (!MONTH_LABELS.has(m)) {
    const [y, mo] = ym(m);
    MONTH_LABELS.set(
      m,
      new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    );
  }
  return MONTH_LABELS.get(m);
};

// dates are kept as YYYY-MM-DD, so they can be compared as text (much faster than building Date objects for every
// person and month); anything not in that form falls back to a real date comparison
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const dayCmp = (a, b) =>
  ISO_DAY.test(a) && ISO_DAY.test(b)
    ? a < b
      ? -1
      : a > b
        ? 1
        : 0
    : Math.sign(new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) || 0;
function activeIn(e, m) {
  const startISO = m + '-01',
    endISO = m + '-' + String(daysIn(m)).padStart(2, '0');
  const saved = !!((S.attendance[m] || {})[e.id] || ((S.payroll[m] || {}).rows || {})[e.id]);
  if (saved && S.payroll[m]?.rows?.[e.id]?.status === 'Paid') return true;
  if (e.joining && dayCmp(e.joining, endISO) > 0) return false;
  if (e.lastDay && dayCmp(e.lastDay, startISO) < 0) return saved;
  if (e.status === 'Inactive') {
    // Inactive employees leave payroll from the month they were made inactive, even if a draft
    // row or attendance was created for that month. Months already marked Paid stay (checked above).
    const since = e.inactiveSince ? e.inactiveSince.slice(0, 7) : null;
    const workedHere = e.lastDay && dayCmp(e.lastDay, startISO) >= 0;
    if (since && m >= since && !workedHere) return false;
    if (saved) return true;
    if (!since) return false;
  } else if (e.status !== 'Active') {
    if (saved) return true;
    if (!e.lastDay) return false;
  }
  return true;
}

// a month marked Paid for an employee is locked: attendance, amounts and the USD rate can no longer change it
const isPaidRow = (id, m) => S.payroll[m]?.rows?.[id]?.status === 'Paid';
const monthHasPaid = (m) => Object.values(S.payroll[m]?.rows || {}).some((r) => r.status === 'Paid');
function empsIn(m) {
  const r = S.roster && S.roster[m];
  if (!r) return S.employees.filter((e) => activeIn(e, m));
  const ids = new Set(r);
  return S.employees.filter((e) => ids.has(e.id));
}
const isImported = (m) => !!IMPORTED.att[m];
const filt = { q: '', dept: 'All', sort: 'az', status: 'all' };
const rateOf = (m) => Number((S.payroll[m] || {}).fx || S.settings.fx);
const disp = () => S.settings.disp || 'INR';
// show an amount (held in currency `cur`) in the chosen display currency, converting at the month's USD rate
function dv(amount, cur = 'INR', m = month) {
  const d = disp();
  if (cur === d) return money(amount, d);
  const r = rateOf(m);
  return money(cur === 'USD' ? amount * r : amount / r, d);
}
function applyFilter(list, options = {}) {
  const q = filt.q.trim().toLowerCase();
  let out = list.filter((e) => {
    if (filt.dept !== 'All' && (e.department || 'Unassigned') !== filt.dept) return false;
    if (!options.ignoreStatus && filt.status === 'active' && e.status !== 'Active') return false;
    if (!options.ignoreStatus && filt.status === 'inactive' && e.status === 'Active') return false;
    if (!q) return true;
    return [
      e.name,
      e.id,
      String(e.legacy || ''),
      'ml-' + (e.legacy || ''),
      'ml - ' + (e.legacy || ''),
      e.designation,
    ].some((x) =>
      String(x || '')
        .toLowerCase()
        .includes(q),
    );
  });
  const byName = (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
  const cmp = {
    id: (a, b) => a.id.localeCompare(b.id),
    az: byName,
    za: (a, b) => -byName(a, b),
    dept: (a, b) =>
      (a.department || 'Unassigned').localeCompare(b.department || 'Unassigned') || byName(a, b),
  }[filt.sort];
  out.sort(cmp || byName);
  const cnt = document.getElementById('fCount');
  if (cnt) cnt.textContent = `Showing ${out.length} of ${list.length}`;
  return out;
}
function renderDeptOptions() {
  const ds = [...new Set(S.employees.map((e) => e.department || 'Unassigned'))].sort();
  const sel = document.getElementById('fDept');
  if (!ds.includes(filt.dept)) filt.dept = 'All';
  sel.innerHTML = ['All', ...ds]
    .map((d) => `<option ${d === filt.dept ? 'selected' : ''}>${esc(d)}</option>`)
    .join('');
}

/* public holidays from the Holidays list are marked H (paid) when a month's attendance is first created */
function holidayOn(date) {
  return Array.isArray(S.holidays) && S.holidays.some((h) => h.date === date && h.type !== 'Optional');
}
// a new month's attendance: WO on weekends, H on public holidays, P otherwise, A outside employment
function defaultAttendance(m, e) {
  const [y, mo] = ym(m),
    a = [];
  for (let i = 1; i <= daysIn(m); i++) {
    const dt = new Date(y, mo - 1, i),
      wd = dt.getDay();
    let c = wd === 0 || wd === 6 ? 'WO' : holidayOn(iso(dt)) ? 'H' : 'P';
    if (e.joining && dt < new Date(e.joining + 'T00:00:00')) c = 'A';
    if (e.lastDay && dt > new Date(e.lastDay + 'T00:00:00')) c = 'A';
    a.push(c);
  }
  return a;
}
function attFor(m, e) {
  S.attendance[m] = S.attendance[m] || {};
  let a = S.attendance[m][e.id];
  if (!a || a.length !== daysIn(m)) a = S.attendance[m][e.id] = defaultAttendance(m, e);
  return a;
}
function counts(arr) {
  const c = {};
  CODES.forEach((k) => (c[k] = 0));
  arr.forEach((x) => {
    if (c[x] !== undefined) c[x]++;
  });
  c.unmarked = arr.filter((x) => !x).length;
  return c;
}
function quota(e) {
  const q = S.quotas[e.id] || {};
  return { PL: q.PL ?? S.settings.PL, SL: q.SL ?? S.settings.SL, CL: q.CL ?? S.settings.CL };
}

// leave used in year before month m (history + app attendance of earlier months in same year)
function usedBefore(e, m) {
  const [y, mo] = ym(m);
  const u = { PL: 0, SL: 0, CL: 0 };
  const H = S.history;
  if (H.year === y) {
    const h = H.used[e.id] || {};
    ['PL', 'SL', 'CL'].forEach((k) => (u[k] += h[k] || 0));
  }
  Object.keys(S.attendance).forEach((k) => {
    const [yy, mm] = ym(k);
    if (yy === y && mm < mo && !(H.year === y && mm <= H.throughMonth)) {
      const a = S.attendance[k][e.id];
      if (a) {
        const c = counts(a);
        ['PL', 'SL', 'CL'].forEach((t) => (u[t] += c[t]));
      }
    }
  });
  return u;
}

// leave used in the year up to and including month m (December included: the old version
// asked for "before next January", which starts a new year and dropped January–November)
function usedThrough(e, m) {
  const [y, mo] = ym(m);
  const u = usedBefore(e, m);
  const H = S.history;
  const inHistory = H.year === y && mo <= H.throughMonth;
  const a = (S.attendance[m] || {})[e.id];
  if (a && !inHistory) {
    const c = counts(a);
    ['PL', 'SL', 'CL'].forEach((t) => (u[t] += c[t]));
  }
  return u;
}

const COMPLIANCE_RULES = {
  verifiedOn: '2026-10-13',
  gujarat: {
    effectiveFrom: '2022-04-01',
    monthlyThreshold: 12000,
    monthlyTax: 200,
    source: 'https://commercialtax.gujarat.gov.in/vatwebsite/download/schedule/Rate_of_Profession_Tax.pdf',
  },
};
/* Dated employee salary policies. Existing employees start with no deductions. */
function defaultSalaryPolicy(from = currentMonth(), employee = null) {
  return {
    effectiveFrom: from,
    breakupMode: 'company',
    basicPct: Number(S.slip.basic),
    daPct: 0,
    hraPct: Number(S.slip.hra),
    convPct: Number(S.slip.conv),
    medPct: Number(S.slip.med),
    pfEnabled: false,
    pfCoverageMode: from >= (S.settings.autoStatutoryFrom || '2026-10') ? 'auto' : 'off',
    pfExistingMember: Boolean(employee?.uan),
    pfBaseMode: from >= '2026-10' ? 'statutory' : 'auto',
    pfMonthlyWages: '',
    pfCap: from >= '2026-10' ? 25000 : 15000,
    pfEmployeeRate: 12,
    pfEmployerRate: 12,
    esiEnabled: false,
    esiCoverageMode: from >= (S.settings.autoStatutoryFrom || '2026-10') ? 'auto' : 'off',
    esiDisability: false,
    statutoryApprentice: false,
    esiCoveredUntil: '',
    esiBaseMode: from >= '2026-10' ? 'statutory' : 'auto',
    esiMonthlyWages: '',
    esiEmployeeRate: 0.75,
    esiEmployerRate: 3.25,
    esiEmployeeExempt: false,
    ptEnabled: false,
    ptState: '',
    ptMode: 'manual',
    ptMonthlyAmount: 0,
    accommodationEnabled: Boolean(employee?.accommodationEnabled),
    accommodationAmount: Number(employee?.accommodationAmount || 0),
  };
}
function currentMonth() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
function salaryPolicyFor(e, m) {
  const versions = (e.salaryPolicies || [])
    .filter((p) => /^\d{4}-\d{2}$/.test(p.effectiveFrom) && p.effectiveFrom <= m)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  if (!versions.length) return defaultSalaryPolicy(m, e);
  const saved = versions[versions.length - 1];
  return {
    ...defaultSalaryPolicy(m, e),
    ...saved,
    pfCoverageMode: saved.pfCoverageMode || (saved.pfEnabled ? 'on' : 'off'),
    esiCoverageMode: saved.esiCoverageMode || (saved.esiEnabled ? 'on' : 'off'),
    pfBaseMode:
      saved.pfBaseMode ||
      (saved.pfEnabled && saved.pfMonthlyWages !== '' && saved.pfMonthlyWages != null ? 'manual' : 'auto'),
    esiBaseMode:
      saved.esiBaseMode ||
      (saved.esiEnabled && saved.esiMonthlyWages !== '' && saved.esiMonthlyWages != null ? 'manual' : 'auto'),
  };
}
function salaryBreakup(e, m, gross, policy = salaryPolicyFor(e, m)) {
  const custom = policy.breakupMode === 'custom';
  const pct = custom
    ? [policy.basicPct, policy.daPct, policy.hraPct, policy.convPct, policy.medPct]
    : [S.slip.basic, 0, S.slip.hra, S.slip.conv, S.slip.med];
  const raw = pct.map((n) => (gross * Number(n || 0)) / 100);
  let amounts = raw.map((n) => (custom ? r2(n) : Math.round(n)));
  if (custom || r2(amounts.reduce((a, b) => a + b, 0)) > gross) {
    const cents = raw.map((n) => Math.floor(n * 100 + 1e-8));
    const target = Math.min(Math.round(gross * 100), Math.round(raw.reduce((a, b) => a + b, 0) * 100));
    let remaining = target - cents.reduce((a, b) => a + b, 0);
    const order = raw
      .map((n, i) => ({ i, fraction: n * 100 - cents[i] }))
      .sort((a, b) => b.fraction - a.fraction || a.i - b.i);
    for (let j = 0; remaining > 0; j++, remaining--) cents[order[j % order.length].i]++;
    amounts = cents.map((n) => n / 100);
  }
  const special = r2(gross - amounts.reduce((a, b) => a + b, 0));
  const names = ['Basic Salary', 'Dearness Allowance', 'HRA', 'Conveyance Allowance', 'Medical Allowance'];
  return [
    ...names.map((name, i) => [name, amounts[i]]).filter((row, i) => i !== 1 || row[1] !== 0),
    ['Special Allowance', special],
  ];
}
// payroll rows of months before m (never m itself: a month's own draft must not decide that the
// employee was "already covered", or one salary typo would switch PF/ESIC on for good)
function earlierRows(e, m) {
  return Object.entries(S.payroll || {})
    .filter(([key, p]) => key < m && p.rows?.[e.id])
    .map(([key, p]) => ({ month: key, row: p.rows[e.id] }));
}
function salaryContributions(e, m, ctx, policy = salaryPolicyFor(e, m)) {
  const factor = Math.max(0, Math.min(1, 1 - ctx.lopDays / ctx.d));
  policy = { ...policy };
  const gross = r2(Number(ctx.sal ?? e.salary) * ctx.fx);
  const parts = salaryBreakup(e, m, gross, policy);
  const autoPfMonthly = r2(
    parts
      .filter(([name]) => name === 'Basic Salary' || name === 'Dearness Allowance')
      .reduce((s, [, n]) => s + n, 0),
  );
  const pfMode = policy.pfBaseMode || 'manual',
    esiMode = policy.esiBaseMode || 'manual';
  const fixedCore = parts
    .filter(([name]) => !['HRA', 'Conveyance Allowance'].includes(name))
    .reduce((s, [, n]) => s + n, 0);
  const regular = r2(gross + ctx.vari * ctx.fx + Number(ctx.row.inc || 0));
  const benefit = policy.accommodationEnabled ? Number(policy.accommodationAmount || 0) : 0;
  const core = r2(fixedCore + ctx.vari * ctx.fx + Number(ctx.row.inc || 0));
  let statutoryMonthly = Math.max(core, (regular + benefit) / 2);
  for (let i = 0; i < 16; i++) {
    const employerBase =
      pfMode === 'manual'
        ? Number(policy.pfMonthlyWages || 0)
        : pfMode === 'auto'
          ? autoPfMonthly
          : statutoryMonthly;
    const alreadyPf = policy.pfExistingMember || earlierRows(e, m).some((x) => x.row.pfCoveredAuto);
    const estimateOn =
      policy.pfCoverageMode === 'on' ||
      (policy.pfCoverageMode === 'auto' &&
        m >= (S.settings.autoStatutoryFrom || '2026-10') &&
        !abroad(e) &&
        !policy.statutoryApprentice &&
        S.settings.pfCovered !== false &&
        (employerBase <= 25000 || alreadyPf));
    const employer = estimateOn
      ? Math.round(
          (Math.min(employerBase, policy.pfCap > 0 ? policy.pfCap : employerBase) *
            Number(policy.pfEmployerRate || 0)) /
            100,
        )
      : 0;
    const next = r2(Math.max(core, (regular + benefit + employer) / 2));
    if (Math.abs(next - statutoryMonthly) < 0.01) break;
    statutoryMonthly = next;
  }
  const autoEsiMonthly = r2(gross + ctx.vari * ctx.fx + Number(ctx.row.inc || 0));
  const pfMonthly =
    pfMode === 'statutory'
      ? statutoryMonthly
      : pfMode === 'auto'
        ? autoPfMonthly
        : Number(policy.pfMonthlyWages || 0);
  const esiMonthly =
    esiMode === 'statutory'
      ? statutoryMonthly
      : esiMode === 'auto'
        ? autoEsiMonthly
        : Number(policy.esiMonthlyWages || 0);
  const autoActive = m >= (S.settings.autoStatutoryFrom || '2026-10'),
    domestic = !abroad(e) && !policy.statutoryApprentice;
  const allRows = earlierRows(e, m);
  const priorPf = policy.pfExistingMember || allRows.some((x) => x.row?.pfCoveredAuto);
  const pfAuto =
    autoActive &&
    domestic &&
    S.settings.pfCovered !== false &&
    ((pfMonthly > 0 && pfMonthly <= 25000) || priorPf);
  const [ey, em] = ym(m),
    periodStart = em >= 10 ? ey + '-10' : em >= 4 ? ey + '-04' : ey - 1 + '-10';
  const priorEsi =
    policy.esiCoveredUntil >= m || allRows.some((x) => x.month >= periodStart && x.row?.esiCoveredAuto);
  const esiAuto =
    autoActive &&
    domestic &&
    S.settings.esiCovered !== false &&
    ((esiMonthly > 0 && esiMonthly <= (policy.esiDisability ? 25000 : 21000)) || priorEsi);
  if (policy.pfCoverageMode)
    policy.pfEnabled = policy.pfCoverageMode === 'on' || (policy.pfCoverageMode === 'auto' && pfAuto);
  if (policy.esiCoverageMode)
    policy.esiEnabled = policy.esiCoverageMode === 'on' || (policy.esiCoverageMode === 'auto' && esiAuto);
  const pfEarnedWages = r2(Math.max(0, pfMonthly) * factor);
  const pfWages = policy.pfEnabled
    ? r2(policy.pfCap > 0 ? Math.min(pfEarnedWages, Number(policy.pfCap)) : pfEarnedWages)
    : 0;
  const esiEarned =
    esiMode === 'statutory'
      ? Math.max(
          0,
          fixedCore * factor +
            ctx.vari * ctx.fx +
            Number(ctx.row.inc || 0) +
            (statutoryMonthly - core) * factor,
        )
      : esiMode === 'auto'
        ? Math.max(0, ctx.earned * ctx.fx + ctx.vari * ctx.fx + Number(ctx.row.inc || 0))
        : Math.max(0, Number(policy.esiMonthlyWages || 0)) * factor;
  const esiWages = policy.esiEnabled ? r2(esiEarned) : 0;
  const pfEmployee = policy.pfEnabled ? Math.round((pfWages * policy.pfEmployeeRate) / 100) : 0;
  const pfEmployer = policy.pfEnabled ? Math.round((pfWages * policy.pfEmployerRate) / 100) : 0;
  const up = (n) => Math.max(0, Math.ceil(n - 1e-9));
  const dailyExempt = autoActive && esiWages / Math.max(1, ctx.d - ctx.lopDays) <= 176;
  const esiEmployee =
    policy.esiEnabled && !policy.esiEmployeeExempt && !dailyExempt
      ? up((esiWages * policy.esiEmployeeRate) / 100)
      : 0;
  const esiEmployer = policy.esiEnabled ? up((esiWages * policy.esiEmployerRate) / 100) : 0;
  const ptWages = r2(Math.max(0, ctx.earned * ctx.fx + ctx.vari * ctx.fx + Number(ctx.row.inc || 0)));
  const ptRule = COMPLIANCE_RULES.gujarat;
  const exitDay = e.lastDay && e.lastDay.slice(0, 7) === m ? Number(e.lastDay.slice(8, 10)) : ctx.d;
  const exitFactor = exitDay > 0 && exitDay < ctx.d ? exitDay / ctx.d : 1;
  const professionalTax = policy.ptEnabled
    ? policy.ptMode === 'gujarat'
      ? ptWages > ptRule.monthlyThreshold
        ? r2(ptRule.monthlyTax * exitFactor)
        : 0
      : Number(policy.ptMonthlyAmount || 0)
    : 0;
  return {
    policy,
    pfWages,
    esiWages,
    ptWages,
    autoPfMonthly: pfMonthly,
    autoEsiMonthly: esiMonthly,
    dailyExempt,
    pfEmployee,
    pfEmployer,
    esiEmployee,
    esiEmployer,
    professionalTax,
    employeeTotal: r2(pfEmployee + esiEmployee + professionalTax),
    employerTotal: r2(pfEmployer + esiEmployer),
  };
}
function validateSalaryPolicy(p) {
  if (!isMonth(p.effectiveFrom)) return 'Choose a valid start month.';
  if (!['company', 'custom'].includes(p.breakupMode)) return 'Choose a salary breakup.';
  if (p.esiCoveredUntil && !isMonth(p.esiCoveredUntil)) return 'Enter a valid ESIC continuation month.';
  if (
    !['statutory', 'auto', 'manual'].includes(p.pfBaseMode) ||
    !['statutory', 'auto', 'manual'].includes(p.esiBaseMode)
  )
    return 'Choose a valid wage calculation.';
  const pct = ['basicPct', 'daPct', 'hraPct', 'convPct', 'medPct'];
  if (pct.some((k) => !Number.isFinite(p[k]) || p[k] < 0 || p[k] > 100))
    return 'Salary percentages must be between 0 and 100.';
  if (p.breakupMode === 'custom' && pct.reduce((s, k) => s + p[k], 0) > 100.000001)
    return 'Salary percentages cannot total more than 100%. Special allowance uses the balance.';
  for (const scheme of ['pf', 'esi']) {
    if (p[scheme + 'CoverageMode'] === 'off' || (!p[scheme + 'CoverageMode'] && !p[scheme + 'Enabled']))
      continue;
    const base = p[scheme + 'MonthlyWages'];
    if (
      p[scheme + 'BaseMode'] === 'manual' &&
      (base === '' || !Number.isFinite(Number(base)) || Number(base) <= 0)
    )
      return 'Enter a positive monthly ' + (scheme === 'pf' ? 'PF' : 'ESIC') + ' wage base.';
    for (const party of ['Employee', 'Employer']) {
      const n = p[scheme + party + 'Rate'];
      if (!Number.isFinite(n) || n < 0 || n > 100) return 'Contribution rates must be between 0 and 100%.';
    }
  }
  if (!Number.isFinite(p.pfCap) || p.pfCap < 0) return 'PF cap must be zero or a positive amount.';
  if (p.ptEnabled && (!Number.isFinite(p.ptMonthlyAmount) || p.ptMonthlyAmount < 0))
    return 'Professional tax must be zero or a positive amount.';
  if (p.ptEnabled && !['manual', 'gujarat'].includes(p.ptMode))
    return 'Choose a professional tax calculation.';
  if (!['auto', 'on', 'off'].includes(p.pfCoverageMode) || !['auto', 'on', 'off'].includes(p.esiCoverageMode))
    return 'Choose Auto, On or Off for PF and ESIC.';
  if (p.accommodationEnabled && (!Number.isFinite(p.accommodationAmount) || p.accommodationAmount < 0))
    return 'Enter a valid monthly accommodation amount.';
  if (p.ptEnabled && p.ptMode === 'gujarat' && p.effectiveFrom < '2022-04')
    return 'The Gujarat preset applies from April 2022. Use a manual amount for earlier periods.';
  if (p.ptEnabled && p.ptMode === 'manual' && !String(p.ptState || '').trim())
    return 'Enter the state or jurisdiction for professional tax.';
  return '';
}
let salaryEditingId = null;
const salaryNumberFields = [
  'accommodationAmount',
  'basicPct',
  'daPct',
  'hraPct',
  'convPct',
  'medPct',
  'pfMonthlyWages',
  'pfCap',
  'pfEmployeeRate',
  'pfEmployerRate',
  'esiMonthlyWages',
  'esiEmployeeRate',
  'esiEmployerRate',
  'ptMonthlyAmount',
];
const salaryBoolFields = [
  'pfExistingMember',
  'esiDisability',
  'statutoryApprentice',
  'accommodationEnabled',
  'pfEnabled',
  'esiEnabled',
  'esiEmployeeExempt',
  'ptEnabled',
];
function salaryFormPolicy() {
  const form = document.getElementById('salaryForm'),
    p = {};
  for (const key of [
    'effectiveFrom',
    'breakupMode',
    'ptState',
    'ptMode',
    'pfBaseMode',
    'esiBaseMode',
    'pfCoverageMode',
    'esiCoverageMode',
    'esiCoveredUntil',
  ])
    p[key] = form.elements.namedItem(key).value;
  for (const key of salaryNumberFields) {
    const v = form.elements.namedItem(key).value;
    p[key] = (key === 'pfMonthlyWages' || key === 'esiMonthlyWages') && v === '' ? '' : Number(v);
  }
  for (const key of salaryBoolFields) p[key] = form.elements.namedItem(key).checked;
  return p;
}
function fillSalaryForm(e, p) {
  const f = document.getElementById('salaryForm');
  for (const key of [
    'effectiveFrom',
    'breakupMode',
    'ptState',
    'ptMode',
    'pfBaseMode',
    'esiBaseMode',
    'pfCoverageMode',
    'esiCoverageMode',
    'esiCoveredUntil',
    ...salaryNumberFields,
  ])
    f.elements.namedItem(key).value = p[key] ?? '';
  for (const key of salaryBoolFields) f.elements.namedItem(key).checked = Boolean(p[key]);
  f.elements.namedItem('uan').value = e.uan || '';
  f.elements.namedItem('esiNumber').value = e.esiNumber || '';
  document.getElementById('salaryError').textContent = '';
  updateSalaryPreview();
}
function openSalarySettings(id, from) {
  const e = S.employees.find((e) => e.id === id);
  if (!e) return;
  salaryEditingId = id;
  const start = from || currentMonth();
  const p = { ...salaryPolicyFor(e, start), effectiveFrom: start };
  document.getElementById('salaryTitle').textContent = 'Salary & compliance';
  document.getElementById('salarySubtitle').textContent =
    e.name + ' · ' + e.id + ' · fixed salary ' + money(e.salary, e.currency);
  const history = document.getElementById('salaryHistory');
  history.innerHTML =
    '<option value="">New / current settings</option>' +
    (e.salaryPolicies || [])
      .slice()
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
      .map((p) => '<option value="' + p.effectiveFrom + '">From ' + monthLabel(p.effectiveFrom) + '</option>')
      .join('');
  history.value = from || '';
  fillSalaryForm(e, p);
  document.getElementById('salaryDlg').showModal();
}
function previewPayroll(e, m) {
  // pay() only reads and writes this person's own attendance and payroll row for the month, so only those
  // are copied (copying the whole team for every person made big teams slow); saved data is never changed
  const saved = S,
    period = saved.payroll[m] || { fx: saved.settings.fx, rows: {} },
    own = (period.rows || {})[e.id],
    rows = own ? { [e.id]: { ...own } } : {},
    att = (saved.attendance[m] || {})[e.id];
  try {
    S = {
      ...saved,
      attendance: { ...saved.attendance, [m]: att ? { [e.id]: att.slice() } : {} },
      payroll: { ...saved.payroll, [m]: { ...period, rows } },
    };
    return pay(e, m);
  } finally {
    S = saved;
  }
}
function updateSalaryPreview() {
  const f = document.getElementById('salaryForm'),
    p = salaryFormPolicy(),
    e = S.employees.find((x) => x.id === salaryEditingId);
  if (!e) return;
  for (const scheme of ['pf', 'esi', 'pt']) {
    const on = p[scheme + 'Enabled'];
    document.getElementById(scheme + 'Fields').disabled = !on;
    if (scheme !== 'pt') {
      const field = f.elements.namedItem(scheme + 'MonthlyWages'),
        auto = p[scheme + 'BaseMode'] !== 'manual';
      field.required = on && !auto;
      field.readOnly = auto;
      field.setAttribute?.(
        'aria-label',
        auto
          ? 'Automatically calculated monthly ' + (scheme === 'pf' ? 'PF' : 'ESIC') + ' wages'
          : 'Manual monthly ' + scheme + ' wages',
      );
    }
  }
  for (const key of ['basicPct', 'daPct', 'hraPct', 'convPct', 'medPct'])
    f.elements.namedItem(key).disabled = p.breakupMode !== 'custom';
  f.elements.namedItem('ptMonthlyAmount').readOnly = p.ptMode === 'gujarat';
  if (p.ptMode === 'gujarat') f.elements.namedItem('ptState').value = 'Gujarat';
  document.getElementById('accommodationFields').disabled = !p.accommodationEnabled;
  f.elements.namedItem('accommodationAmount').required = p.accommodationEnabled;
  const err = validateSalaryPolicy(p);
  const preview = document.getElementById('salaryPreview');
  if (err) {
    preview.textContent = 'Preview: ' + err;
    return;
  }
  const m = p.effectiveFrom,
    base = previewPayroll(e, m),
    gross = r2(base.sal * base.fx),
    parts = salaryBreakup(e, m, gross, p);
  const c = salaryContributions(e, m, base, p);
  for (const scheme of ['pf', 'esi']) {
    p[scheme + 'Enabled'] = c.policy[scheme + 'Enabled'];
    f.elements.namedItem(scheme + 'Enabled').checked = p[scheme + 'Enabled'];
    document.getElementById(scheme + 'Fields').disabled = !p[scheme + 'Enabled'];
    document.getElementById(scheme + 'CoverageInfo').textContent =
      (p[scheme + 'CoverageMode'] === 'auto' ? 'Auto: ' : 'Override: ') +
      (p[scheme + 'Enabled'] ? 'Applies' : 'Not applicable') +
      (scheme === 'esi' && c.dailyExempt ? ' · Employee share exempt (daily wage up to ₹176)' : '');
  }
  if (p.pfBaseMode !== 'manual') f.elements.namedItem('pfMonthlyWages').value = c.autoPfMonthly;
  if (p.esiBaseMode !== 'manual') f.elements.namedItem('esiMonthlyWages').value = c.autoEsiMonthly;
  if (p.ptMode === 'gujarat') f.elements.namedItem('ptMonthlyAmount').value = c.professionalTax;
  const net = r2(base.earnINR - base.lop * base.fx - Number(base.row.other || 0) - c.employeeTotal);
  const ctc = employeeCtc(e, m, base.sal, base.vari, base.fx, p);
  preview.innerHTML =
    '<strong>Preview for ' +
    esc(monthLabel(m)) +
    '</strong><div class="cell-sub">' +
    parts.map(([label, n]) => esc(label) + ': ' + money(n)).join(' · ') +
    '</div><div class="policy-badges"><span>Employee PF: ' +
    money(c.pfEmployee) +
    '</span><span>ESIC: ' +
    money(c.esiEmployee) +
    '</span><span>PT: ' +
    money(c.professionalTax) +
    '</span></div><div class="cell-sub">Monthly CTC: ' +
    money(ctc.total) +
    (ctc.accommodation ? ' − accommodation ' + money(ctc.accommodation) : '') +
    (ctc.employerCost ? ' − employer contributions ' + money(ctc.employerCost) : '') +
    ' = cash salary + variable ' +
    money(ctc.cash) +
    '</div><b>Net salary: ' +
    money(net) +
    '</b><div class="cell-sub">Employer PF / EPS + ESIC: ' +
    money(c.employerTotal) +
    ' · ' +
    base.lopDays +
    ' unpaid days applied. PF contribution base: ' +
    money(c.pfWages) +
    ' · ESIC contribution base: ' +
    money(c.esiWages) +
    '.</div>';
}
function storeSalaryPolicy(e, p) {
  const error = validateSalaryPolicy(p);
  if (error) return error;
  const policies = (e.salaryPolicies || [])
    .filter((v) => v.effectiveFrom !== p.effectiveFrom)
    .map((v) => ({ ...v }));
  policies.push({ ...p });
  policies.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  e.salaryPolicies = policies;
  return '';
}
document.getElementById('profileBody').addEventListener('click', (ev) => {
  const calc = ev.target.closest('[data-calculation]');
  if (calc) {
    openSalaryCalculation(calc.dataset.calculation, month);
    return;
  }
  const b = ev.target.closest('[data-salary-settings]');
  if (b) openSalarySettings(b.dataset.salarySettings);
});
document.getElementById('salaryForm').addEventListener('input', updateSalaryPreview);
document.getElementById('salaryForm').addEventListener('change', updateSalaryPreview);
document.getElementById('salaryHistory').addEventListener('change', (ev) => {
  if (ev.target.value) openSalarySettings(salaryEditingId, ev.target.value);
});
document.getElementById('salaryForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const form = ev.currentTarget,
    e = S.employees.find((e) => e.id === salaryEditingId);
  if (!e) return;
  const p = salaryFormPolicy(),
    error = validateSalaryPolicy(p);
  if (error) {
    document.getElementById('salaryError').textContent = error;
    return;
  }
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  storeSalaryPolicy(e, p);
  e.uan = form.elements.namedItem('uan').value.trim();
  e.esiNumber = form.elements.namedItem('esiNumber').value.trim();
  save();
  document.getElementById('salaryDlg').close();
  render();
  flash('Salary settings saved from ' + monthLabel(p.effectiveFrom));
});

function initializeAutomaticStatutory() {
  if (S.autoStatutoryVersion === '2026-10-13-v2') return;
  S.settings.autoStatutoryFrom = '2026-10';
  if (S.settings.pfCovered == null) S.settings.pfCovered = true;
  if (S.settings.esiCovered == null) S.settings.esiCovered = true;
  S.employees.forEach((e) =>
    (e.salaryPolicies || []).forEach((p) => {
      if (p.effectiveFrom < '2026-10') return;
      for (const scheme of ['pf', 'esi']) {
        if (!p[scheme + 'CoverageMode']) p[scheme + 'CoverageMode'] = p[scheme + 'Enabled'] ? 'on' : 'auto';
        const amount = p[scheme + 'MonthlyWages'];
        if (
          p[scheme + 'BaseMode'] == null ||
          (p[scheme + 'BaseMode'] === 'manual' && Number(amount || 0) === 0)
        )
          p[scheme + 'BaseMode'] = 'statutory';
      }
    }),
  );
  S.autoStatutoryVersion = '2026-10-13-v2';
}
function applyAccommodationV2() {}
function employeeCtc(e, m, sal, vari, fx, policy) {
  const accommodation = policy.accommodationEnabled
    ? Math.max(0, Number(policy.accommodationAmount || 0))
    : 0;
  const full = salaryContributions(
    e,
    m,
    { d: daysIn(m), lopDays: 0, earned: sal, fx, vari, row: { inc: 0 }, sal },
    policy,
  );
  const cash = r2((sal + vari) * fx),
    employerCost = full.employerTotal;
  return { cash, accommodation, employerCost, total: r2(cash + accommodation + employerCost) };
}
function pay(e, m) {
  const a = attFor(m, e),
    c = counts(a),
    d = a.length,
    q = quota(e),
    ub = usedBefore(e, m);
  const open = {},
    over = {};
  let overTotal = 0;
  ['PL', 'SL', 'CL'].forEach((t) => {
    open[t] = Math.max(0, q[t] - ub[t]);
    over[t] = Math.max(0, c[t] - open[t]);
    overTotal += over[t];
  });
  const P = (S.payroll[m] = S.payroll[m] || { fx: S.settings.fx, rows: {} });
  const row = (P.rows[e.id] = P.rows[e.id] || {
    inc: 0,
    bonus: 0,
    reimb: 0,
    other: 0,
    reason: '',
    status: 'Pending',
  });
  if (row.salary == null) {
    row.salary = e.salary;
    row.salaryFromProfile = true;
  }
  if (row.variable == null) {
    row.variable = e.variable || 0;
    row.variableFromProfile = true;
  }
  if (!row.currency) {
    row.currency = e.currency;
    row.currencyFromProfile = true;
  }
  const currency = row.currency;
  const fx = currency === 'USD' ? Number(P.fx) : 1;
  const sal = Number(row.salary != null ? row.salary : e.salary),
    vari = Number(row.variable != null ? row.variable : e.variable || 0);
  const perDay = sal / d;
  const lopDays = c.A + c.UP + 0.5 * c.HD + overTotal;
  // days marked A only because they fall before the joining date or after the last working day
  const [yy, mm] = ym(m);
  const outsideDays = a.filter(
    (code, i) => code === 'A' && !workingOn(e, iso(new Date(yy, mm - 1, i + 1))),
  ).length;
  const lop = r2(perDay * lopDays);
  const earned = r2(sal - lop);
  const earnINR = r2(
    r2(sal * fx) +
      r2(vari * fx) +
      r2(Number(row.inc || 0)) +
      r2(Number(row.bonus || 0)) +
      r2(Number(row.reimb || 0)),
  );
  const compliance = salaryContributions(e, m, { d, lopDays, earned, fx, vari, row, sal });
  if (m >= (S.settings.autoStatutoryFrom || '2026-10')) {
    row.pfCoveredAuto = Boolean(compliance.policy.pfEnabled);
    row.esiCoveredAuto = Boolean(compliance.policy.esiEnabled);
  }
  const breakup = salaryBreakup(e, m, r2(sal * fx), compliance.policy);
  const dedINR = r2(r2(lop * fx) + r2(Number(row.other || 0)) + compliance.employeeTotal);
  const net = r2(earnINR - dedINR);
  const ctc = employeeCtc(e, m, sal, vari, fx, compliance.policy);
  let check = 'OK';
  if (c.unmarked) check = 'Unmarked days';
  else if (overTotal > 0) check = 'Over leave quota';
  else if (net < 0) check = 'Negative pay';
  else if ((row.inc || row.bonus || row.reimb || row.other) && !row.reason) check = 'Add a reason';
  const paidLeave = c.PL + c.SL + c.CL - overTotal;
  const cur = currency;
  let ex = `${money(sal, cur)} ÷ ${d} days = ${money(perDay, cur)} per day. `;
  ex += lopDays
    ? `Deducted ${lopDays} day(s): A ${c.A}, UP ${c.UP}, half days ${c.HD} × 0.5, leave over quota ${overTotal} = −${money(lop, cur)}. `
    : 'No days deducted. ';
  if (paidLeave > 0) ex += `${paidLeave} paid leave day(s) within quota, not deducted. `;
  ex += `Earned salary ${money(earned, cur)}`;
  if (vari) ex += `, variable +${money(vari, cur)}`;
  if (fx !== 1) ex += `, converted at ₹${fx}/USD`;
  if (row.bonus) ex += `, performance bonus +${money(row.bonus)}`;
  if (row.inc) ex += `, incentive +${money(row.inc)}`;
  if (row.reimb) ex += `, reimbursement +${money(row.reimb)}`;
  if (row.other) ex += `, other deduction −${money(row.other)}${row.reason ? ` (${row.reason})` : ''}`;
  if (compliance.employeeTotal)
    ex += `, employee PF −${money(compliance.pfEmployee)}, ESIC −${money(compliance.esiEmployee)}, professional tax −${money(compliance.professionalTax)}`;
  ex += `. Net pay ${money(net)}.`;
  if (compliance.employerTotal)
    ex += ` Employer PF / EPS ${money(compliance.pfEmployer)} and ESIC ${money(compliance.esiEmployer)} are employer costs.`;
  const legacy = row.paidLegacy;
  if (legacy != null && Math.abs(legacy - net) > 1)
    ex += ` The source sheet paid ${money(legacy)} (difference ${money(net - legacy)}).`;
  return {
    e,
    currency,
    c,
    d,
    q,
    ub,
    open,
    over,
    overTotal,
    perDay,
    lopDays,
    outsideDays,
    lop,
    earned,
    fx,
    row,
    earnINR,
    dedINR,
    net,
    check,
    ex,
    paidLeave,
    sal,
    vari,
    legacy,
    compliance,
    breakup,
    month: m,
    ctc,
  };
}

/* Employee activity is separate from payroll payment status. */
function employeeStatusControl(e) {
  const active = e.status === 'Active',
    canToggle = active || e.status === 'Inactive';
  return `<button type="button" class="activity-control" role="switch" aria-checked="${active}"
    aria-label="${active ? 'Deactivate' : 'Activate'} ${esc(e.name)}" data-activity="${e.id}" ${canToggle ? '' : 'disabled'}
    title="${canToggle ? 'Saved attendance and payments are kept. Inactive employees are excluded from new months.' : 'Use Edit profile to change employment status.'}">
    <span class="switch-track" aria-hidden="true"></span><span>${esc(e.status || 'Inactive')}</span></button>`;
}
function setEmployeeStatus(e, status) {
  if (status === 'Inactive' && e.status !== 'Inactive') {
    const today = new Date();
    e.inactiveSince = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }
  if (status === 'Active') delete e.inactiveSince;
  e.status = status;
}
function toggleEmployeeActivity(id) {
  const e = S.employees.find((x) => x.id === id);
  if (!e || !['Active', 'Inactive'].includes(e.status)) return;
  setEmployeeStatus(e, e.status === 'Active' ? 'Inactive' : 'Active');
  save();
  render();
}

/* ---------- PAYROLL ---------- */
function renderPayroll() {
  const autoFrom = S.settings.autoStatutoryFrom || '2026-10';
  document.getElementById('autoPayrollNotice').innerHTML =
    month < autoFrom
      ? 'PF / ESIC is automatic from ' +
        esc(monthLabel(autoFrom)) +
        '. <button class="linkish" type="button" id="viewAutoMonth">Open ' +
        esc(monthLabel(autoFrom)) +
        ' payroll</button>'
      : '';
  document.getElementById('autoPayrollNotice').style.display = month < autoFrom ? '' : 'none';
  const next = document.getElementById('viewAutoMonth');
  if (month < autoFrom && next)
    next.onclick = () => {
      month = autoFrom;
      render();
    };

  const P = (S.payroll[month] = S.payroll[month] || { fx: S.settings.fx, rows: {} });
  document.getElementById('fxInput').value = P.fx;
  document
    .querySelectorAll('#curToggle button')
    .forEach((b) => b.classList.toggle('on', b.dataset.c === disp()));
  const rows = applyFilter(empsIn(month)).map((e) => pay(e, month));
  const tot = rows.reduce((s, r) => s + r.net, 0),
    usdRows = rows.filter((r) => r.currency === 'USD'),
    inrNet = rows.filter((r) => r.currency !== 'USD').reduce((s, r) => s + r.net, 0),
    usdNet = r2(usdRows.reduce((s, r) => s + r.net / r.fx, 0)),
    lopT = rows.reduce((s, r) => s + r.lop * r.fx, 0);
  const incT = rows.reduce((s, r) => s + Number(r.row.inc || 0), 0),
    bonT = rows.reduce((s, r) => s + r2(r.vari * r.fx) + Number(r.row.bonus || 0), 0),
    reimbT = rows.reduce((s, r) => s + Number(r.row.reimb || 0), 0),
    checks = rows.filter((r) => r.check !== 'OK').length;
  const paid = rows.filter((r) => r.row.status === 'Paid').length;
  const imp = isImported(month),
    legT = rows.reduce((s, r) => s + (r.legacy || 0), 0),
    diffN = rows.filter((r) => r.legacy != null && Math.abs(r.legacy - r.net) > 1).length;
  document.getElementById('impNote').style.display = imp ? 'block' : 'none';
  if (imp)
    document.getElementById('impNote').textContent =
      month === '2026-09'
        ? 'Imported from the Time sheet. Red amounts differ from what the sheet paid.'
        : 'Imported from the Time sheet. Red amounts differ from what the sheet paid.';
  document.getElementById('payStats').innerHTML = `
    <div class="stat"><b>${rows.length}</b><span>Employees</span></div>
    <div class="stat"><b>${money(inrNet, 'INR')}</b><span>Net pay · India staff (₹)</span></div>
    ${usdRows.length ? `<div class="stat"><b>${money(usdNet, 'USD')}</b><span>Net pay · ${usdRows.length} USD contractor${usdRows.length > 1 ? 's' : ''} ($)</span></div>` : ''}
    <div class="stat"><b>${dv(tot)}</b><span>Total, all staff in ${disp() === 'USD' ? '$' : '₹'} at ₹${rateOf(month)}/$</span></div>
    <div class="stat"><b>${dv(lopT)}</b><span>Cut for days not worked</span></div>
    <div class="stat"><b>${dv(bonT)}</b><span>Performance</span></div>
    <div class="stat"><b>${dv(incT)}</b><span>Incentives</span></div>
    <div class="stat"><b>${dv(reimbT)}</b><span>Reimbursements</span></div>
    <div class="stat ${checks ? 'warn' : ''}"><b>${checks}</b><span>Rows to check</span></div>
    <div class="stat"><b>${paid} / ${rows.length}</b><span>Marked paid</span></div>
    ${imp ? `<div class="stat"><b>${dv(legT)}</b><span>Sheet paid</span></div><div class="stat ${diffN ? 'warn' : ''}"><b>${diffN}</b><span>Differ from sheet</span></div>` : ''}
    `;

  let h = `<thead><tr><th>Employee</th><th class="num">Cash salary / CTC</th><th class="num">Unpaid</th><th class="num">Incentive</th><th class="num">Performance bonus</th><th class="num">Reimbursement</th><th class="num">Net pay</th><th>Payment status</th><th>Slip</th></tr></thead><tbody>`;
  rows.forEach((r) => {
    const e = r.e,
      cur = r.currency,
      perf = r2(r2(r.vari * r.fx) + Number(r.row.bonus || 0));
    const adjustments = `Incentive ${money(r.row.inc)}; Performance bonus ${money(perf)} (fixed monthly ${money(r2(r.vari * r.fx))} + this month ${money(r.row.bonus)}); Reimbursement ${money(r.row.reimb)}; Other deduction ${money(r.row.other)}`;
    h += `<tr><td><button type="button" class="name profile-name" data-profile="${e.id}">${esc(e.name)}</button><div class="idc">${e.id} · ${esc(e.department || 'Unassigned')}</div>${employeeStatusControl(e)}</td>
      <td class="num"><b>${dv(r.sal, cur)}</b><span class="cell-sub"><strong>CTC per month: ${dv(r.ctc.total)}</strong>${r.ctc.accommodation ? `<br>Less accommodation: −${dv(r.ctc.accommodation)}` : ''}${r.ctc.employerCost ? `<br>Less employer cost: −${dv(r.ctc.employerCost)}` : ''}</span>${r.vari ? `<span class="cell-sub">+${dv(r.vari, cur)} performance (fixed)</span>` : ''}<span class="cell-sub">${dv(r.perDay, cur)} / day</span><button class="calculation-link" type="button" data-calculation="${e.id}">${uiIcon('calc')} Calculation</button></td>
      <td class="num"><b>${r.lopDays || 0} day${r.lopDays === 1 ? '' : 's'}</b><span class="cell-sub">${r.lop ? '−' + dv(r.lop, cur) : 'No deduction'}</span></td>
      <td class="num" title="${esc(adjustments)}">${Number(r.row.inc || 0) ? `<b>${dv(r.row.inc)}</b>` : '<span class="idc">—</span>'}${(incentiveParts(r.row) || []).map(([t, n]) => `<span class="cell-sub">${esc(t)}: ${dv(n)}</span>`).join('')}<br><button type="button" class="amount-edit" data-adjust="${e.id}">Edit amounts</button></td>
      <td class="num" title="${esc(adjustments)}">${perf ? `<b>${dv(perf)}</b>` : '<span class="idc">—</span>'}${r.vari ? `<span class="cell-sub">${dv(r2(r.vari * r.fx))} fixed monthly</span>` : ''}${Number(r.row.bonus || 0) ? `<span class="cell-sub">${dv(r.row.bonus)} this month</span>` : ''}</td>
      <td class="num" title="${esc(adjustments)}">${Number(r.row.reimb || 0) ? `<b>${dv(r.row.reimb)}</b>` : '<span class="idc">—</span>'}${r.row.other ? `<span class="cell-sub">Other deduction −${dv(r.row.other)}</span>` : ''}</td>
      <td class="num"><b>${dv(r.net)}</b>${r.compliance.employeeTotal ? `<span class="cell-sub">PF: −${dv(r.compliance.pfEmployee)} · ESIC: −${dv(r.compliance.esiEmployee)}${r.compliance.professionalTax ? ` · PT: −${dv(r.compliance.professionalTax)}` : ''} </span>` : ''}${imp && r.legacy != null ? `<span class="cell-sub">Source paid: ${dv(r.legacy)}</span>${Math.abs(r.legacy - r.net) > 1 ? `<span class="pill bad">${r.net > r.legacy ? '+' : ''}${dv(r.net - r.legacy)}</span>` : ''}` : ''}</td>
      <td><select aria-label="Payment status for ${esc(e.name)}" data-f="status" data-id="${e.id}">${['Pending', 'Reviewed', 'Approved', 'Paid', 'Hold'].map((s) => `<option ${s === r.row.status ? 'selected' : ''}>${s}</option>`).join('')}</select><span class="pill ${r.check === 'OK' ? 'ok' : 'bad'}">${r.check}</span></td>
      <td><button type="button" class="linkish" data-slip="${e.id}">Slip</button></td></tr>`;
  });
  if (!rows.length)
    h += '<tr><td colspan="9" class="empty-state">No employees match these filters.</td></tr>';
  document.getElementById('payTable').innerHTML = h + '</tbody>';
}

document.getElementById('payTable').addEventListener('change', (ev) => {
  const t = ev.target,
    f = t.dataset.f,
    id = t.dataset.id;
  if (!f) return;
  const row = S.payroll[month].rows[id];
  if (f === 'status') {
    const e = S.employees.find((x) => x.id === id),
      r = e && pay(e, month);
    if (t.value === 'Paid' && r && r.net < 0) {
      alert(`${e.name}'s net pay is negative (${money(r.net)}). Fix the amounts before marking it Paid.`);
      t.value = row.status;
      return;
    }
    if (
      row.status === 'Paid' &&
      t.value !== 'Paid' &&
      !confirm(`${e ? e.name : id}: ${monthLabel(month)} is marked Paid. Unlock it so it can be changed?`)
    ) {
      t.value = 'Paid';
      return;
    }
  }
  row[f] = f === 'reason' || f === 'status' ? t.value : Number(t.value || 0);
  save();
  renderPayroll();
});
document.getElementById('payTable').addEventListener('click', (ev) => {
  const profile = ev.target.closest('[data-profile]');
  if (profile) {
    openEmployeeProfile(profile.dataset.profile);
    return;
  }
  const activity = ev.target.closest('[data-activity]');
  if (activity) {
    toggleEmployeeActivity(activity.dataset.activity);
    return;
  }
  const calc = ev.target.closest('[data-calculation]');
  if (calc) {
    openSalaryCalculation(calc.dataset.calculation, month);
    return;
  }
  const adjust = ev.target.closest('[data-adjust]');
  if (adjust) {
    openPayAdjust(adjust.dataset.adjust);
    return;
  }
  const id = ev.target.dataset.slip;
  if (!id) return;
  const r = pay(
    S.employees.find((e) => e.id === id),
    month,
  );
  showSlip(r);
});
document.getElementById('fxInput').addEventListener('change', (ev) => {
  const rate = Number(ev.target.value);
  if (!Number.isFinite(rate) || rate <= 0) {
    ev.target.value = S.payroll[month].fx;
    alert('Enter a positive exchange rate.');
    return;
  }
  if (monthHasPaid(month) && rate !== Number(S.payroll[month].fx)) {
    ev.target.value = S.payroll[month].fx;
    alert(
      `Some ${monthLabel(month)} salaries are already marked Paid, so the USD rate for this month is locked.`,
    );
    return;
  }
  S.payroll[month].fx = rate;
  save();
  render();
});

let editingPay = null;
function openPayAdjust(id) {
  const employee = S.employees.find((e) => e.id === id);
  if (!employee) return;
  if (isPaidRow(id, month)) {
    alert(
      `${employee.name}'s ${monthLabel(month)} pay is marked Paid, so it is locked. Set the payment status to Pending first to change it.`,
    );
    return;
  }
  const row = pay(employee, month).row;
  editingPay = { id, month };
  document.getElementById('payAdjustTitle').textContent = employee.name;
  document.getElementById('payAdjustMonth').textContent = monthLabel(month) + ' · ' + employee.id;
  const form = document.getElementById('payAdjustForm');
  ['bonus', 'inc', 'reimb', 'other', 'reason'].forEach(
    (k) => (form.elements.namedItem(k).value = row[k] ?? ''),
  );
  document.getElementById('payAdjustDlg').showModal();
}
function savePayAdjust(id, m, values) {
  const row = S.payroll[m]?.rows[id];
  if (!row || row.status === 'Paid') return false;
  const amounts = {};
  for (const k of ['bonus', 'inc', 'reimb', 'other']) {
    const n = Number(values[k] || 0);
    if (!Number.isFinite(n) || n < 0) return false;
    amounts[k] = r2(n);
  }
  Object.assign(row, amounts, { reason: String(values.reason || '').trim() });
  return true;
}
document.getElementById('payAdjustForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  if (!editingPay) return;
  const form = new FormData(ev.currentTarget),
    values = {};
  ['bonus', 'inc', 'reimb', 'other', 'reason'].forEach((k) => (values[k] = form.get(k)));
  if (!savePayAdjust(editingPay.id, editingPay.month, values)) {
    alert('Enter valid, non-negative amounts.');
    return;
  }
  save();
  document.getElementById('payAdjustDlg').close();
  render();
});

/* One source for cash earnings and deductions, shared by the screen and PDF. */
/* Incentive split by type (Support incentive, Sales incentive, …), entered with "Add incentives".
   Used only while the items add up to the row's incentive total; otherwise one "Incentive" line. */
function incentiveParts(row) {
  const items = Array.isArray(row && row.incItems) ? row.incItems.filter((x) => Number(x.amount)) : [];
  if (!items.length) return null;
  const sum = r2(items.reduce((a, x) => a + Number(x.amount), 0));
  if (Math.abs(sum - r2(Number(row.inc || 0))) > 0.01) return null;
  const by = {};
  items.forEach((x) => {
    const t = String(x.type || 'Incentive').trim() || 'Incentive';
    by[t] = by[t] || { n: 0, amt: 0 };
    by[t].n++;
    by[t].amt = r2(by[t].amt + Number(x.amount));
  });
  // e.g. "Deal closed (3)" when one type was earned more than once
  return Object.entries(by).map(([t, v]) => [v.n > 1 ? `${t} (${v.n})` : t, v.amt]);
}
/* Splits a rounded total into rounded parts that add up to it exactly (the rounding difference goes to the
   largest part), so slip lines always add up to the totals. */
function splitAmount(total, raw) {
  const parts = raw.map((n) => r2(n)),
    diff = r2(total - parts.reduce((a, b) => a + b, 0));
  if (diff && parts.length) {
    const i = parts.reduce((best, n, j) => (n > parts[best] ? j : best), 0);
    parts[i] = r2(parts[i] + diff);
  }
  return parts;
}
/* Earning and deduction lines of a payslip. cur is the slip currency: 'INR' (default; USD salaries are converted
   at the month's rate) or 'USD' for a USD-paid employee's own slip. INR slips use the Indian salary structure and
   always list unpaid leave, PF, ESIC and professional tax (₹0.00 when nil); USD slips show the contract salary
   and only the deductions that apply. */
function payrollLines(r, cur = 'INR') {
  const usd = cur === 'USD',
    rate = Number(r.fx) || 1;
  const own = (n) => r2(usd && r.currency === 'USD' ? n : n * rate), // salary-currency amount → slip currency
    inr = (n) => r2(usd ? Number(n || 0) / rate : Number(n || 0)); // INR-entered amount → slip currency
  const earnings = usd
    ? [['Base salary', own(r.sal)]]
    : r.breakup.filter(([, n]) => Number(n) !== 0).map((x) => [...x]);
  // Performance bonus = fixed monthly performance pay (variable) + any one-time bonus for the month.
  // Incentive, performance bonus and reimbursement are always listed, even when nil, so the slip shows them.
  const incParts = incentiveParts(r.row);
  if (incParts) incParts.forEach(([t, n]) => earnings.push([t, inr(n)]));
  else earnings.push(['Incentive', inr(r.row.inc)]);
  earnings.push(['Performance bonus', r2(own(r.vari) + inr(r.row.bonus))]);
  earnings.push(['Reimbursement', inr(r.row.reimb)]);
  // loss of pay, split into days outside employment, unpaid days (absent, unpaid leave, leave over quota) and half days
  const outside = r.outsideDays || 0,
    unpaid = r.c.A - outside + r.c.UP + r.overTotal;
  const [outsideAmount, unpaidAmount, halfAmount] = splitAmount(own(r.lop), [
    own(outside * r.perDay),
    own(unpaid * r.perDay),
    own(0.5 * r.c.HD * r.perDay),
  ]);
  const statutory = [
    ['Employee PF', inr(r.compliance.pfEmployee)],
    ['Employee ESIC', inr(r.compliance.esiEmployee)],
    ['Professional tax', inr(r.compliance.professionalTax)],
  ];
  // INR: unpaid leave is always listed; USD: Indian statutory items are left out
  // (they only ever appear if a non-zero amount was actually deducted, so the totals stay correct)
  // PF, ESIC and professional tax appear only when there is an amount (Acme Labs pays full salary)
  const always = usd ? [] : ['Unpaid leave'];
  const deductions = [
    ['Days not employed (' + outside + ')', outsideAmount],
    ['Unpaid leave' + (unpaid ? ' (' + unpaid + (unpaid === 1 ? ' day)' : ' days)') : ''), unpaidAmount],
    ['Half days' + (r.c.HD ? ' (' + r.c.HD + ' × 0.5)' : ''), halfAmount],
    ...statutory,
    ['Other deduction', inr(r.row.other)],
  ].filter(([label, n]) => Number(n) !== 0 || always.some((a) => label.startsWith(a)));
  return { earnings, deductions };
}
function ctcEquation(r, format = money) {
  return (
    format(r.ctc.total) +
    (r.ctc.accommodation ? ' − ' + format(r.ctc.accommodation) + ' accommodation' : '') +
    (r.ctc.employerCost ? ' − ' + format(r.ctc.employerCost) + ' employer cost' : '') +
    ' = ' +
    format(r.ctc.cash) +
    ' cash salary' +
    (r.vari ? ' + variable' : '')
  );
}
let calculationEmployeeId = null,
  calculationMonth = null;
function openSalaryCalculation(id, m = month) {
  calculationEmployeeId = id;
  calculationMonth = m;
  renderSalaryCalculation();
  document.getElementById('calculationDlg').showModal();
}
function renderSalaryCalculation() {
  const e = S.employees.find((e) => e.id === calculationEmployeeId);
  if (!e) return;
  const r = previewPayroll(e, calculationMonth),
    p = r.compliance.policy,
    components = payrollLines(r),
    format = (n) => dv(n, 'INR', r.month);
  const row = (label, amount, total = false) =>
    '<div class="calc-line' +
    (total ? ' calc-total' : '') +
    '"><span>' +
    esc(label) +
    '</span><b>' +
    format(amount) +
    '</b></div>';
  const card = (title, body, detail = '') =>
    '<section class="calc-card"><h4>' +
    esc(title) +
    '</h4>' +
    body +
    (detail ? '<div class="calc-detail">' + detail + '</div>' : '') +
    '</section>';
  const gross = r2(r.sal * r.fx),
    variable = r2(r.vari * r.fx);
  const parts = r.breakup.filter(([, n]) => Number(n) !== 0),
    fixed = parts.filter(([name]) => name !== 'Special Allowance');
  const special = parts.find(([name]) => name === 'Special Allowance')?.[1] || 0;
  const paid = r.legacy != null ? r.legacy : r.row.status === 'Paid' ? r.net : 0,
    balance = r2(r.net - paid);
  let ctc = row('Fixed cash salary', gross) + (variable ? row('Fixed variable pay', variable) : '');
  if (r.ctc.accommodation) ctc += row('Company-provided accommodation', r.ctc.accommodation);
  if (r.ctc.employerCost) ctc += row('Employer PF / ESIC at full-month wages', r.ctc.employerCost);
  ctc += row('CTC per month', r.ctc.total, true);
  const percentages =
    p.breakupMode === 'custom'
      ? [p.basicPct, p.daPct, p.hraPct, p.convPct, p.medPct]
      : [S.slip.basic, 0, S.slip.hra, S.slip.conv, S.slip.med];
  const percentByName = Object.fromEntries(
    ['Basic Salary', 'Dearness Allowance', 'HRA', 'Conveyance Allowance', 'Medical Allowance'].map(
      (name, i) => [name, percentages[i]],
    ),
  );
  const breakup =
    parts
      .map(([name, n]) =>
        row(name + (percentByName[name] != null ? ' · ' + percentByName[name] + '% of cash salary' : ''), n),
      )
      .join('') + row('Fixed cash salary total', gross, true);
  const breakupDetail = special
    ? 'Special allowance = ' +
      format(gross) +
      ' − (' +
      fixed.map(([, n]) => format(n)).join(' + ') +
      ') = ' +
      format(special) +
      '.'
    : '';
  const dayDetail = esc(
    format(gross) +
      ' ÷ ' +
      r.d +
      ' calendar days = ' +
      format(r.perDay * r.fx) +
      ' per day (display rounded). ' +
      r.lopDays +
      ' unpaid day-equivalent(s); salary × unpaid days ÷ calendar days = ' +
      format(r2(r.lop * r.fx)) +
      '. Calculations use the unrounded daily rate; unpaid salary is rounded in the salary currency before conversion.',
  );
  let deductions =
    components.deductions.map(([name, n]) => row(name, n)).join('') ||
    '<div class="calc-detail">No deductions apply for this month.</div>';
  deductions += row('Total deductions', r.dedINR, true);
  const schemes = [
    'PF: ' +
      (p.pfCoverageMode || 'off') +
      ' · ' +
      (p.pfEnabled
        ? format(r.compliance.pfWages) +
          ' × ' +
          p.pfEmployeeRate +
          '% = ' +
          format(r.compliance.pfEmployee) +
          ' (nearest rupee)'
        : 'not applied'),
    'ESIC: ' +
      (p.esiCoverageMode || 'off') +
      ' · ' +
      (p.esiEnabled
        ? format(r.compliance.esiWages) +
          ' × ' +
          p.esiEmployeeRate +
          '% = ' +
          format(r.compliance.esiEmployee) +
          (r.compliance.dailyExempt || p.esiEmployeeExempt
            ? ' (employee share exempt)'
            : ' (rounded up to a rupee)')
        : 'not applied'),
  ];
  if (p.ptEnabled)
    schemes.push(
      'Professional tax: ' +
        (p.ptMode === 'gujarat' ? 'Gujarat salary slab' : 'manual amount') +
        ' = ' +
        format(r.compliance.professionalTax),
    );
  document.getElementById('calculationSubtitle').textContent =
    e.name + ' · ' + e.id + ' · ' + monthLabel(r.month);
  document.getElementById('calculationBody').innerHTML =
    '<div class="calc-hero"><div class="calc-kicker">CTC → cash salary</div><div class="calc-formula">' +
    esc(ctcEquation(r, format)) +
    '</div><p>Accommodation and employer costs are included in CTC. The cash component is used for payroll.</p></div>' +
    '<div class="calc-grid">' +
    card(
      '1. CTC components',
      ctc,
      'CTC is the fixed monthly cost, before attendance changes, monthly bonuses and reimbursements.',
    ) +
    card('2. Fixed cash salary breakup', breakup, esc(breakupDetail)) +
    card(
      '3. This month’s cash earnings',
      components.earnings.map(([name, n]) => row(name, n)).join('') +
        row('Total cash earnings', r.earnINR, true),
      dayDetail,
    ) +
    card('4. Deductions', deductions, schemes.map(esc).join('<br>')) +
    '<section class="calc-card calc-wide calc-net"><h4>5. Final take-home calculation</h4><div class="calc-formula">' +
    esc(format(r.earnINR) + ' − ' + format(r.dedINR) + ' = ' + format(r.net)) +
    '</div><div class="calc-detail">Cash earnings − deductions = net salary. ' +
    (r.legacy != null
      ? 'Paid amount comes from the imported source sheet.'
      : 'Paid amount follows the payroll payment status.') +
    '</div>' +
    row('Net salary', r.net, true) +
    row('Paid amount', paid) +
    row(balance < 0 ? 'Excess paid' : 'Amount pending', Math.abs(balance)) +
    '</section></div>';
}

/* ---------- PAYSLIP ----------
   payslipModel() builds everything a payslip shows; showSlip() draws it on screen and buildPayslipPdf() draws the
   same model as an A4 PDF, so the two always match. The slip is issued in the employee's pay currency:
   INR slips carry the Indian salary structure and statutory items (PF, ESIC, professional tax, PAN, Aadhaar, UAN);
   USD slips carry only the contract salary, attendance-based deductions and the bank details used abroad. */
let currentSlip = null;
const SLIP_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function payslipFilename(r) {
  const [year, mo] = ym(r.month || month);
  const name = String(r.e.name || 'Employee')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return name + ' ' + SLIP_MONTHS[mo - 1] + ' ' + String(year).slice(-2) + ' payslip.pdf';
}
function pdfFonts() {
  return window.ACMELABS_FONTS || {};
}
// Aadhaar is shown masked (last four digits) as a data-protection precaution
const SLIP_ALWAYS = ['Bank name', 'Bank account number', 'IFSC code', 'Routing number', 'PAN'];
function maskedAadhaar(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 4 ? 'XXXX XXXX ' + digits.slice(-4) : '';
}
// "Rupees Twenty-Seven Thousand Three Hundred Ninety-Five Only" (Indian grouping) / "US Dollars … Only"
function amountInWords(amount, currency = 'INR') {
  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (n) => (n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : ''));
  const three = (n) =>
    n >= 100 ? ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + two(n % 100) : '') : two(n);
  const groups =
    currency === 'INR'
      ? [
          [1e7, 'Crore'],
          [1e5, 'Lakh'],
          [1e3, 'Thousand'],
        ]
      : [
          [1e9, 'Billion'],
          [1e6, 'Million'],
          [1e3, 'Thousand'],
        ];
  const words = (n) => {
    if (!n) return 'Zero';
    const out = [];
    for (const [size, name] of groups)
      if (n >= size) {
        out.push(words(Math.floor(n / size)) + ' ' + name);
        n %= size;
      }
    if (n) out.push(three(n));
    return out.join(' ');
  };
  const cents = Math.round(Math.abs(Number(amount) || 0) * 100),
    whole = Math.floor(cents / 100),
    fraction = cents % 100;
  const [unit, sub] = currency === 'INR' ? ['Rupees', 'Paise'] : ['US Dollars', 'Cents'];
  return (
    (Number(amount) < 0 ? 'Minus ' : '') +
    unit +
    ' ' +
    words(whole) +
    (fraction ? ' and ' + words(fraction) + ' ' + sub : '') +
    ' Only'
  );
}
function payslipModel(r) {
  const e = r.e,
    c = r.c,
    m = r.month || month,
    usd = r.currency === 'USD',
    cur = usd ? 'USD' : 'INR',
    rate = Number(r.fx) || 1;
  const [year, mo] = ym(m),
    days = daysIn(m);
  const format = (n) =>
    (usd ? '$ ' : '₹ ') +
    Number(n || 0).toLocaleString(usd ? 'en-US' : 'en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const inr = (n) => r2(usd ? Number(n || 0) / rate : Number(n || 0));
  const { earnings, deductions } = payrollLines(r, cur);
  const noDeductions = !deductions.length;
  const totalEarnings = r2(earnings.reduce((s, [, n]) => s + n, 0)),
    totalDeductions = r2(deductions.reduce((s, [, n]) => s + n, 0)),
    net = r2(totalEarnings - totalDeductions);
  // amount paid so far: the source-sheet figure for imported months, otherwise the net pay once marked Paid
  const paid = r.legacy != null ? inr(r.legacy) : r.row.status === 'Paid' ? net : 0;
  const date = (v) => (v ? profileDate(v) : '');
  const employee = [
    ['Employee name', e.legalName || e.name],
    ['Employee ID', e.id],
    ['Designation', e.designation],
    ['Department', e.department],
    ['Date of joining', date(e.joining)],
    ['Employment type', e.type],
    ['Work location', abroad(e) ? 'Outside India' : 'India'],
    [
      'Pay period',
      '01 ' + SLIP_MONTHS[mo - 1] + ' ' + year + ' – ' + days + ' ' + SLIP_MONTHS[mo - 1] + ' ' + year,
    ],
  ];
  if (e.lastDay && e.lastDay.slice(0, 7) <= m) employee.push(['Last working day', date(e.lastDay)]);
  employee.push(['Phone', e.phone], ['Bank name', e.bankName], ['Bank account number', e.bankAccount]);
  if (abroad(e))
    employee.push(['Account type', e.accountType], ['Routing number', e.routing], ['SWIFT code', e.swift]);
  else employee.push(['IFSC code', e.ifsc]);
  if (!usd)
    employee.push(
      ['PAN', e.pan],
      ['Aadhaar number', maskedAadhaar(e.aadhaar)],
      ['UAN', e.uan],
      ['ESIC number', e.esiNumber],
    );
  const unpaidDays = r2(c.A - (r.outsideDays || 0) + c.UP + r.overTotal);
  const attendance = [
    ['Days in month', r.d],
    ['Paid days', r2(r.d - r.lopDays)],
    ['Present / WFH', c.P + c.WFH],
    ['Weekly off', c.WO],
    ['Holidays', c.H],
    ['Paid leave', r.paidLeave],
    ['Half days', c.HD],
    ['Unpaid days', unpaidDays],
  ];
  if (r.outsideDays) attendance.push(['Not employed', r.outsideDays]);
  const notes = [];
  // only what the slip does not already show (CTC, employer contributions and days not employed have their own lines)
  if (!usd && r.currency === 'USD')
    notes.push('Salary of ' + money(r.sal, 'USD') + ' converted at ₹' + rate + ' per USD.');
  if (usd && [r.row.inc, r.row.bonus, r.row.reimb, r.row.other].some((n) => Number(n)))
    notes.push('Rupee amounts converted at ₹' + rate + ' per USD.');
  // HR's note covers all the adjustments of the month (incentive, bonus, reimbursement, deduction)
  const note = String(r.row.reason || '')
    .split('; ')
    .filter((x) => x && !/^Incentives: /.test(x))
    .join('; ');
  if (note && [r.row.inc, r.row.bonus, r.row.reimb, r.row.other].some((n) => Number(n)))
    notes.push('Note: ' + note + '.');
  return {
    r,
    usd,
    currency: cur,
    format,
    title:
      'Payslip for ' +
      new Date(year, mo - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    period: new Date(year, mo - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    company: S.slip.company,
    address: S.slip.address,
    // bank details and PAN always show on the slip, so a missing one is easy to spot
    employee: employee
      .map(([k, v]) => [k, String(v ?? '').trim() || (SLIP_ALWAYS.includes(k) ? 'Not added' : '')])
      .filter(([, v]) => v),
    earnings,
    // an empty deductions column still reads clearly
    deductions: noDeductions ? [['No deductions', null]] : deductions,
    totalEarnings,
    totalDeductions,
    net,
    netWords: amountInWords(net, cur),
    paid,
    pending: r2(net - paid),
    attendance,
    // CTC breakdown only for INR slips (USD contracts have no employer statutory cost)
    ctc: usd
      ? null
      : [
          ['Monthly CTC', r.ctc.total],
          ...(r.ctc.accommodation ? [['Less accommodation', r.ctc.accommodation]] : []),
          ...(r.ctc.employerCost ? [['Less employer contributions', r.ctc.employerCost]] : []),
          ['Cash salary' + (r.vari ? ' + variable' : ''), r.ctc.cash],
        ],
    notes,
    generated: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  };
}
function buildPayslipPdf(r, fonts = pdfFonts()) {
  const Pdf = window.jspdf?.jsPDF;
  if (!Pdf) throw new Error('The PDF library is unavailable. Refresh the portal and try again.');
  if (!fonts.normal || !fonts.bold) throw new Error('The payslip fonts are unavailable.');
  const s = payslipModel(r);
  const color = {
    navy: [49, 49, 128],
    blue: [64, 117, 221],
    ink: [20, 20, 20],
    muted: [110, 110, 120],
    line: [214, 218, 228],
    head: [238, 241, 252],
    zebra: [249, 250, 253],
    white: [255, 255, 255],
  };
  // everything is laid out at scale 1; if the content runs past the page it is drawn again slightly smaller
  function draw(scale) {
    const doc = new Pdf({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
      putOnlyUsedFonts: true,
    });
    doc.addFileToVFS('AcmeLabs-Regular.ttf', fonts.normal);
    doc.addFont('AcmeLabs-Regular.ttf', 'AcmeLabs', 'normal');
    doc.addFileToVFS('AcmeLabs-Bold.ttf', fonts.bold);
    doc.addFont('AcmeLabs-Bold.ttf', 'AcmeLabs', 'bold');
    doc.setProperties({
      title: payslipFilename(r).replace(/\.pdf$/, ''),
      subject: s.title,
      author: s.company,
      creator: 'Acme Labs HRMS',
    });
    const L = 14,
      W = 182,
      R = L + W;
    const X = (x) => 105 + (x - 105) * scale,
      Y = (y) => 12 + (y - 12) * scale;
    const text = (t, x, y, size = 8.5, bold = false, ink = 'ink', align = 'left') => {
      doc.setFont('AcmeLabs', bold ? 'bold' : 'normal');
      doc.setFontSize(size * scale);
      doc.setTextColor(...color[ink]);
      doc.text(String(t ?? ''), X(x), Y(y), { align });
    };
    const wrap = (t, width, size = 8.5, bold = false) => {
      doc.setFont('AcmeLabs', bold ? 'bold' : 'normal');
      doc.setFontSize(size * scale);
      return doc.splitTextToSize(String(t ?? ''), width * scale);
    };
    const box = (x, y, w, h, fill, stroke = true) => {
      if (fill) doc.setFillColor(...color[fill]);
      doc.setDrawColor(...color.line);
      doc.setLineWidth(0.25 * scale);
      doc.rect(X(x), Y(y), w * scale, h * scale, fill && stroke ? 'FD' : fill ? 'F' : 'S');
    };
    const rule = (x1, y1, x2, y2, ink = 'line', width = 0.25) => {
      doc.setDrawColor(...color[ink]);
      doc.setLineWidth(width * scale);
      doc.line(X(x1), Y(y1), X(x2), Y(y2));
    };
    const heading = (t, y) => {
      text(t.toUpperCase(), L, y, 8, true, 'navy');
      return y + 3;
    };
    // header: logo and company on the left, document title and period on the right
    let y = 14;
    if (window.ACMELABS_LOGO) {
      const w = 46,
        h = w / (window.ACMELABS_LOGO_RATIO || 6.45);
      doc.addImage(window.ACMELABS_LOGO, 'PNG', X(L), Y(y), w * scale, h * scale, 'acmelabs-logo');
      y += h + 5;
    } else {
      text('AcmeLabs', L, y + 6, 20, true, 'navy');
      y += 11;
    }
    text(s.company, L, y, 10, true);
    const addr = wrap(s.address, 110, 7.5);
    addr.forEach((v, i) => text(v, L, y + 4.2 + i * 3.4, 7.5, false, 'muted'));
    text('PAYSLIP', R, 20, 18, true, 'navy', 'right');
    text(s.period, R, 27, 9.5, true, 'ink', 'right');
    y = Math.max(y + 4.2 + addr.length * 3.4, 38) + 2;
    rule(L, y, R, y, 'navy', 0.6);
    y += 7;
    // employee details: a bordered 4-column grid (label, value, label, value)
    y = heading('Employee details', y);
    const rowsOf = [];
    for (let i = 0; i < s.employee.length; i += 2) rowsOf.push(s.employee.slice(i, i + 2));
    const half = W / 2,
      labelW = 33;
    rowsOf.forEach((pair, i) => {
      const values = pair.map(([, v]) => wrap(v, half - labelW - 4, 8, true));
      const h = Math.max(1, ...values.map((v) => v.length)) * 3.6 + 3.4;
      box(L, y, W, h, i % 2 ? 'zebra' : 'white');
      pair.forEach(([label], j) => {
        const x = L + j * half;
        if (j) rule(x, y, x, y + h);
        text(label, x + 3, y + 4.6, 7.3, false, 'muted');
        values[j].forEach((v, k) => text(v, x + labelW, y + 4.6 + k * 3.6, 8, true));
      });
      y += h;
    });
    y += 7;
    // attendance strip
    y = heading('Attendance', y);
    const cellW = W / s.attendance.length;
    s.attendance.forEach(([label, n], i) => {
      const x = L + i * cellW;
      box(x, y, cellW, 12, i % 2 ? 'zebra' : 'white');
      text(label, x + cellW / 2, y + 4.3, 6.4, false, 'muted', 'center');
      text(Number(n).toFixed(Number(n) % 1 ? 1 : 0), x + cellW / 2, y + 9.4, 9, true, 'ink', 'center');
    });
    y += 19;
    // earnings and deductions side by side in one table
    y = heading('Salary details', y);
    const colW = W / 2,
      rowH = 6.6,
      rows = Math.max(s.earnings.length, s.deductions.length, 1);
    box(L, y, W, 8, 'navy', false);
    [
      ['Earnings', L],
      ['Deductions', L + colW],
    ].forEach(([t, x]) => {
      text(t.toUpperCase(), x + 3, y + 5.4, 7.6, true, 'white');
      text('AMOUNT (' + s.currency + ')', x + colW - 3, y + 5.4, 7, true, 'white', 'right');
    });
    y += 8;
    for (let i = 0; i < rows; i++) {
      box(L, y, W, rowH, i % 2 ? 'zebra' : 'white');
      rule(L + colW, y, L + colW, y + rowH);
      [
        [s.earnings[i], L],
        [s.deductions[i], L + colW],
      ].forEach(([item, x]) => {
        if (!item) return;
        text(item[0], x + 3, y + 4.4, 8);
        if (item[1] != null) text(s.format(item[1]), x + colW - 3, y + 4.4, 8, false, 'ink', 'right');
      });
      y += rowH;
    }
    box(L, y, W, 8, 'head');
    rule(L + colW, y, L + colW, y + 8);
    text('Gross earnings', L + 3, y + 5.3, 8.2, true, 'navy');
    text(s.format(s.totalEarnings), L + colW - 3, y + 5.3, 8.6, true, 'navy', 'right');
    text('Total deductions', L + colW + 3, y + 5.3, 8.2, true, 'navy');
    text(s.format(s.totalDeductions), R - 3, y + 5.3, 8.6, true, 'navy', 'right');
    y += 13;
    // net pay
    const words = wrap(s.netWords, W - 70, 7.6);
    const netH = Math.max(16, 11 + words.length * 3.4);
    box(L, y, W, netH, 'navy', false);
    text('NET PAY', L + 4, y + 6.2, 8.2, true, 'white');
    words.forEach((v, i) => text(v, L + 4, y + 11 + i * 3.4, 7.6, false, 'white'));
    text(s.format(s.net), R - 4, y + netH / 2 + 2.6, 16, true, 'white', 'right');
    y += netH + 3;
    y += 6;
    // INR slips: the CTC breakdown (paid / pending status is on the Payroll screen, not on the slip)
    const blocks = s.ctc ? [['Cost to company (monthly)', s.ctc]] : [];
    const blockW = (W - 6 * (blocks.length - 1)) / blocks.length;
    let blockEnd = y;
    blocks.forEach(([title, items], b) => {
      const x = L + b * (blockW + 6);
      text(title.toUpperCase(), x, y, 7.6, true, 'navy');
      items.forEach(([label, n], i) => {
        const yy = y + 3 + i * 6;
        box(x, yy, blockW, 6, i % 2 ? 'zebra' : 'white');
        text(label, x + 3, yy + 4.1, 7.6);
        text(s.format(n), x + blockW - 3, yy + 4.1, 7.8, true, 'ink', 'right');
      });
      blockEnd = Math.max(blockEnd, y + 3 + items.length * 6);
    });
    y = blockEnd + 7;
    if (s.notes.length) {
      y = heading('Notes', y) + 1.5;
      for (const note of s.notes) {
        const lines = wrap('•  ' + note, W, 7.4);
        lines.forEach((v, i) => text(v, L, y + i * 3.4, 7.4, false, 'muted'));
        y += lines.length * 3.4 + 1.2;
      }
    }
    const footer = Math.max(278, y + 10);
    rule(L, footer - 5, R, footer - 5);
    text(
      'This is a computer-generated payslip and does not require a signature.',
      L,
      footer,
      7.2,
      false,
      'muted',
    );
    text(s.company + ' · Generated on ' + s.generated, R, footer, 7.2, false, 'muted', 'right');
    return { doc, end: footer + 3 };
  }
  let rendered = draw(1);
  if (rendered.end > 287) rendered = draw(275 / (rendered.end - 12));
  return { doc: rendered.doc, filename: payslipFilename(r) };
}
function downloadPayslipPdf() {
  if (!currentSlip) return;
  try {
    const { doc, filename } = buildPayslipPdf(currentSlip);
    doc.save(filename);
  } catch (e) {
    alert('PDF could not be downloaded: ' + e.message);
  }
}

function showSlip(r) {
  currentSlip = r;
  const s = payslipModel(r);
  const n = (v) => Number(v).toFixed(Number(v) % 1 ? 1 : 0);
  const rows = Math.max(s.earnings.length, s.deductions.length);
  // earnings and deductions side by side (padded to the same height); they stack on a phone
  const payTable = (title, items, totalLabel, total) =>
    `<table class="ps-pay"><thead><tr><th>${title}</th><th class="amt">Amount (${s.currency})</th></tr></thead><tbody>${items
      .map(
        ([label, v]) => `<tr><td>${esc(label)}</td><td class="amt">${v == null ? '' : s.format(v)}</td></tr>`,
      )
      .join('')}${'<tr class="pad"><td>&nbsp;</td><td></td></tr>'.repeat(rows - items.length)}</tbody>
      <tfoot><tr><td>${totalLabel}</td><td class="amt">${s.format(total)}</td></tr></tfoot></table>`;
  const table = (items) =>
    `<table class="ps-mini">${items.map(([label, v]) => `<tr><td>${esc(label)}</td><td class="amt">${s.format(v)}</td></tr>`).join('')}</table>`;
  document.getElementById('slipTitle').textContent = 'Payslip · ' + r.e.name + ' · ' + s.period;
  document.getElementById('slipBody').innerHTML = `<article class="ps ${s.usd ? 'ps-usd' : 'ps-inr'}">
    <header class="ps-head">
      <div>${window.ACMELABS_LOGO ? `<img class="logo" src="${window.ACMELABS_LOGO}" alt="Acme Labs">` : '<div class="logo">Acme<span>Labs</span></div>'}
        <div class="co">${esc(s.company)}</div><div class="addr">${esc(s.address)}</div></div>
      <div class="ps-title"><b>PAYSLIP</b><span>${esc(s.period)}</span></div>
    </header>
    <h4>Employee details</h4>
    <dl class="ps-details">${s.employee.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    <h4>Attendance</h4>
    <div class="ps-att">${s.attendance.map(([k, v]) => `<div><span>${esc(k)}</span><b>${n(v)}</b></div>`).join('')}</div>
    <h4>Salary details</h4>
    <div class="ps-paygrid">${payTable('Earnings', s.earnings, 'Gross earnings', s.totalEarnings)}${payTable('Deductions', s.deductions, 'Total deductions', s.totalDeductions)}</div>
    <div class="ps-net"><div><span>Net pay</span><small>${esc(s.netWords)}</small></div><b>${s.format(s.net)}</b></div>
    <div class="ps-blocks">
      ${s.ctc ? `<div><h4>Cost to company (monthly)</h4>${table(s.ctc)}</div>` : ''}
    </div>
    ${s.notes.length ? `<h4>Notes</h4><ul class="ps-notes">${s.notes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    <footer class="ps-foot"><span>This is a computer-generated payslip and does not require a signature.</span><span>${esc(s.company)} · Generated on ${esc(s.generated)}</span></footer>
  </article>`;
  const dlg = document.getElementById('slipDlg');
  if (!dlg.open) dlg.showModal();
  document.getElementById('slipBody').scrollTop = 0;
}

document.getElementById('csvBtn').onclick = () => {
  const rows = applyFilter(empsIn(month)).map((e) => pay(e, month));
  const head = [
    'Emp ID',
    'Name',
    'Currency',
    'Salary',
    'Variable',
    'Days',
    'Per day',
    'A',
    'UP',
    'HD',
    'Over quota',
    'Unpaid days',
    'Deduction',
    'FX',
    'Performance bonus INR',
    'Incentive INR',
    'Reimbursement INR',
    'Other deduction INR',
    'Reason',
    'Total earnings INR',
    'Total deductions INR',
    'Net pay INR',
    'Net pay (pay currency)',
    'Paid per source sheet INR',
    'Status',
    'Explanation',
    'Employee PF INR',
    'Employee ESIC INR',
    'Professional tax INR',
    'Employer PF / EPS INR',
    'Employer ESIC INR',
    'PF wage base INR',
    'ESIC wage base INR',
    'Accommodation benefit INR',
    'Monthly CTC INR',
  ];
  const lines = [head].concat(
    rows.map((r) => [
      r.e.id,
      r.e.name,
      r.currency,
      r.sal,
      r.vari,
      r.d,
      r2(r.perDay),
      r.c.A,
      r.c.UP,
      r.c.HD,
      r.overTotal,
      r.lopDays,
      r.lop,
      r.fx,
      r.row.bonus || 0,
      r.row.inc,
      r.row.reimb,
      r.row.other,
      r.row.reason,
      r.earnINR,
      r.dedINR,
      r.net,
      r.currency === 'USD' ? '$' + r2(r.net / r.fx) : '₹' + r2(r.net),
      r.legacy ?? '',
      r.row.status,
      r.ex,
      r.compliance.pfEmployee,
      r.compliance.esiEmployee,
      r.compliance.professionalTax,
      r.compliance.pfEmployer,
      r.compliance.esiEmployer,
      r.compliance.pfWages,
      r.compliance.esiWages,
      r.ctc.accommodation,
      r.ctc.total,
    ]),
  );
  // PF / ESIC / PT columns only when there is an amount (they are switched off at Acme Labs)
  const statFrom = head.indexOf('Employee PF INR'),
    statTo = head.indexOf('ESIC wage base INR');
  const statCols = new Set(
    [...Array(statTo - statFrom + 1).keys()]
      .map((i) => i + statFrom)
      .filter((i) => lines.slice(1).every((l) => !Number(l[i]))),
  );
  lines.forEach((l, k) => (lines[k] = l.filter((_, i) => !statCols.has(i))));
  const kept = lines[0],
    total = kept.map(() => '');
  total[0] = 'TOTAL';
  total[kept.indexOf('Net pay INR')] = r2(rows.reduce((a, r) => a + r.net, 0));
  total[kept.indexOf('Net pay (pay currency)')] =
    '₹' +
    r2(rows.filter((r) => r.currency !== 'USD').reduce((a, r) => a + r.net, 0)) +
    ' + $' +
    r2(rows.filter((r) => r.currency === 'USD').reduce((a, r) => a + r.net / r.fx, 0));
  lines.push(total);
  const safeCsvValue = (v) => (typeof v === 'string' && /^[=+@-]/.test(v) ? "'" + v : v);
  const csv = lines
    .map((l) =>
      l
        .map(safeCsvValue)
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n');
  download(`salary_sheet_${month}.csv`, '\ufeff' + csv, 'text/csv');
};

/* ---------- ATTENDANCE ---------- */
function renderBrush() {
  document.getElementById('brush').innerHTML =
    '<span class="idc" style="margin-right:4px">Mark with:</span>' +
    CODES.map(
      (c) =>
        `<button class="c-${c} ${c === brushCode ? 'sel' : ''}" data-code="${c}" title="${CODE_NAMES[c]}">${c}</button>`,
    ).join('');
}
document.getElementById('brush').addEventListener('click', (ev) => {
  const c = ev.target.dataset.code;
  if (c) {
    brushCode = c;
    renderBrush();
  }
});
function renderAttendance() {
  renderBrush();
  const d = daysIn(month),
    [y, mo] = ym(month);
  let h = '<thead><tr><th style="position:sticky;left:0;z-index:2">Employee</th>';
  for (let i = 1; i <= d; i++) {
    const wd = new Date(y, mo - 1, i).getDay();
    h += `<th class="d ${wd === 0 || wd === 6 ? 'we' : ''}">${i}<br>${'SMTWTFS'[wd]}</th>`;
  }
  h +=
    '<th class="num">Paid lv</th><th class="num">HD</th><th class="num">A+UP</th>' +
    '<th class="num" title="Days paid = days in month − absent − unpaid − half days × 0.5 − leave over quota (the Time sheet\'s Working Days)">Paid days</th></tr></thead><tbody>';
  applyFilter(empsIn(month)).forEach((e) => {
    const a = attFor(month, e),
      c = counts(a);
    const locked = isPaidRow(e.id, month);
    h += `<tr${locked ? ' class="paid-lock" title="Marked Paid: attendance is locked"' : ''}><td class="namecell"><div class="name">${esc(e.name)}${locked ? ' <span class="lock-tag">Paid · locked</span>' : ''}</div><div class="idc">${e.id}</div></td>`;
    a.forEach(
      (x, i) =>
        (h += `<td tabindex="0" role="button" aria-label="${esc(e.name)}: ${i + 1} ${monthLabel(month)}, ${CODE_NAMES[x] || 'not marked'}" aria-disabled="${!workingOn(e, month + '-' + String(i + 1).padStart(2, '0'))}" class="cell c-${x || 'empty'}" data-id="${e.id}" data-i="${i}" title="${i + 1}: ${CODE_NAMES[x] || 'Not marked'}">${x === 'P' ? '·' : x || ''}</td>`),
    );
    h += `<td class="cnt">${c.PL + c.SL + c.CL}</td><td class="cnt">${c.HD}</td><td class="cnt">${c.A + c.UP}</td><td class="cnt paid-days">${r2(d - pay(e, month).lopDays)}</td></tr>`;
  });
  document.getElementById('attTable').innerHTML = h + '</tbody>';
  save();
}
let painting = false;
const attT = document.getElementById('attTable');
function paint(td) {
  if (!td || !td.dataset.id) return;
  const e = S.employees.find((e) => e.id === td.dataset.id),
    day = month + '-' + String(Number(td.dataset.i) + 1).padStart(2, '0');
  if (!e || !workingOn(e, day)) return;
  if (isPaidRow(e.id, month)) {
    if (!paint.warned)
      flash(
        `${e.name}: ${monthLabel(month)} is marked Paid, so attendance is locked. Set the payment to Pending first.`,
      );
    paint.warned = true;
    return;
  }
  const a = S.attendance[month][td.dataset.id];
  a[+td.dataset.i] = brushCode;
  td.className = `cell c-${brushCode}`;
  td.textContent = brushCode === 'P' ? '·' : brushCode;
}
attT.addEventListener('mousedown', (ev) => {
  if (ev.target.classList.contains('cell')) {
    painting = true;
    paint(ev.target);
    ev.preventDefault();
  }
});
attT.addEventListener('mouseover', (ev) => {
  if (painting && ev.target.classList.contains('cell')) paint(ev.target);
});
document.addEventListener('mouseup', () => {
  paint.warned = false;
  if (painting) {
    painting = false;
    save();
    renderAttendance();
  }
});
attT.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && ev.target.classList.contains('cell')) {
    const { id, i } = ev.target.dataset;
    paint(ev.target);
    save();
    renderAttendance(); // refresh the day counts, then keep the keyboard focus on the same cell
    attT.querySelector(`.cell[data-id="${id}"][data-i="${i}"]`)?.focus();
  }
});
document.getElementById('resetMonth').onclick = () => {
  const imp = isImported(month);
  if (
    !confirm(
      imp
        ? `Restore ${monthLabel(month)} attendance to what the old Excel sheet had?`
        : `Reset all attendance for ${monthLabel(month)} to the default (P on weekdays, WO on weekends)?`,
    )
  )
    return;
  // rows already marked Paid keep their attendance, so a paid salary never changes afterwards
  const paid = (id) => S.payroll[month]?.rows?.[id]?.status === 'Paid';
  const current = S.attendance[month] || {};
  const fresh = {};
  Object.keys(current).forEach((id) => {
    if (paid(id)) fresh[id] = current[id];
  });
  if (imp)
    Object.entries(IMPORTED.att[month]).forEach(([id, str]) => {
      if (!paid(id)) fresh[id] = str.split(',');
    });
  S.attendance[month] = fresh;
  save();
  renderAttendance();
};

/* ---------- LEAVE ---------- */
function renderLeave() {
  let h = `<thead><tr><th>Employee</th><th class="num">PL used</th><th class="num">PL left</th><th class="num">SL used</th><th class="num">SL left</th><th class="num">CL used</th><th class="num">CL left</th><th class="num">Total left (of ${S.settings.PL + S.settings.SL + S.settings.CL})</th><th>Quota</th></tr></thead><tbody>`;
  applyFilter(empsIn(month)).forEach((e) => {
    attFor(month, e);
    const q = quota(e);
    const u = usedThrough(e, month);
    const left = (t) => q[t] - u[t];
    const cell = (t) =>
      `<td class="num">${u[t]}</td><td class="num bal ${left(t) < 0 ? 'neg' : ''}">${left(t)}</td>`;
    const tl = ['PL', 'SL', 'CL'].reduce((s, t) => s + Math.max(0, left(t)), 0);
    h += `<tr><td><div class="name">${esc(e.name)}</div><div class="idc">${e.id}</div></td>${cell('PL')}${cell('SL')}${cell('CL')}<td class="num"><b>${tl}</b></td>
    <td><button class="linkish" data-q="${e.id}">${S.quotas[e.id] ? `Custom ${q.PL}/${q.SL}/${q.CL}` : 'Standard'}</button></td></tr>`;
  });
  document.getElementById('leaveTable').innerHTML = h + '</tbody>';
}
document.getElementById('leaveTable').addEventListener('click', (ev) => {
  const id = ev.target.dataset.q;
  if (!id) return;
  const e = S.employees.find((x) => x.id === id),
    q = quota(e);
  const v = prompt(
    `Leave quota for ${e.name} as PL/SL/CL (for example 6/2/2 for a pro-rated joiner). Leave empty to use the standard ${S.settings.PL}/${S.settings.SL}/${S.settings.CL}.`,
    `${q.PL}/${q.SL}/${q.CL}`,
  );
  if (v === null) return;
  if (!v.trim()) delete S.quotas[id];
  else {
    const parts = v.split('/').map((x) => x.trim());
    const [a, b, c] = parts.map(Number);
    if (
      parts.length !== 3 ||
      parts.some((x) => x === '') ||
      [a, b, c].some((n) => !Number.isFinite(n) || n < 0)
    ) {
      alert('Use non-negative quotas in PL/SL/CL format, for example 6/2/2.');
      return;
    }
    S.quotas[id] = { PL: a, SL: b, CL: c };
  }
  save();
  renderLeave();
});

/* Employee profile viewer. */
let selectedProfileId = null,
  profilePrivateVisible = false;
function profileLink(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || /^file:\/\//i.test(url)) return url;
  if (/^[a-z]:[\\/]/i.test(url)) return 'file:///' + url.replace(/\\/g, '/');
  if (url.includes(':') || url.startsWith('//')) return '';
  return url;
}
function maskedProfileValue(value) {
  const text = String(value || '');
  return text.length > 4 ? '•••• ' + text.slice(-4) : '••••';
}
function profileField(label, value, sensitive = false, wide = false) {
  const missing = value === undefined || value === null || String(value).trim() === '';
  const shown = missing
    ? 'Not added'
    : sensitive && !profilePrivateVisible
      ? maskedProfileValue(value)
      : String(value);
  return `<div class="profile-field ${wide ? 'profile-wide' : ''}"><span>${esc(label)}</span><b class="${missing ? 'unset' : ''}">${esc(shown)}</b></div>`;
}
function profileDate(value) {
  if (!value) return '';
  const date = new Date(value + 'T00:00:00');
  return isNaN(date)
    ? value
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function employeeProfileDocuments(employee) {
  const docs = (employee.profileDocuments || []).map((d) => ({ ...d }));
  [
    ['aadhaarDocument', 'Aadhaar'],
    ['panDocument', 'PAN'],
    ['bankDocument', 'Bank proof'],
  ].forEach(([key, type]) => {
    if (employee[key] && !docs.some((d) => d.url === employee[key]))
      docs.push({ type, name: 'Added document link', url: employee[key] });
  });
  return docs;
}
function renderEmployeeProfile() {
  const e = S.employees.find((x) => x.id === selectedProfileId);
  if (!e) return;
  document.getElementById('profileTitle').textContent = e.name;
  document.getElementById('profileSubtitle').textContent =
    e.id + ' · ' + (e.designation || 'Employee') + ' · ' + (e.department || 'Unassigned');
  document.getElementById('profileAvatar').textContent = e.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  document.getElementById('profileReveal').textContent = profilePrivateVisible
    ? 'Hide private details'
    : 'Show private details';
  document.getElementById('profileReveal').setAttribute('aria-pressed', String(profilePrivateVisible));
  const profilePayroll = previewPayroll(e, month);
  const missing = missingSlip(e),
    docs = employeeProfileDocuments(e);
  const available = docs.filter((d) => profileLink(d.url));
  const docRows = available
    .map((d) => {
      const url = profileLink(d.url);
      return `<div class="profile-doc"><div><strong>${esc(d.type)}</strong><small>${esc(d.name || 'Document')}</small></div><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">View document ↗</a></div>`;
    })
    .join('');
  const sourceRows = (e.profileSources || [])
    .filter((s) => profileLink(s.url))
    .map(
      (s) =>
        `<a href="${esc(profileLink(s.url))}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>${s.date ? ' · ' + esc(s.date) : ''}`,
    )
    .join('<br>');
  document.getElementById('profileBody').innerHTML = `
    <div class="profile-overview"><div>${employeeStatusControl(e)}<div class="cell-sub">Employee activity is separate from payment status.</div></div><div><span class="pill ${missing.length ? 'bad' : 'ok'}">${missing.length ? missing.length + ' slip details missing' : 'Salary slip details complete'}</span></div></div>
    ${e.profileImportConflicts?.length ? '<div class="profile-notice">Some saved details differ from the email records. Your saved values have been kept.</div>' : ''}
    <div class="profile-grid">
      <section class="profile-card"><h4>Personal details</h4><div class="profile-details">
        ${profileField('Legal name (on documents)', e.legalName)}
        ${profileField('Date of birth', profileDate(e.dob), true)}
        ${profileField('Email address', e.email)}
        ${profileField('Phone number', e.phone)}
        ${profileField('Works from', e.location || 'India')}
        ${profileField('Address', e.address, true, true)}
        ${profileField('Emergency contact', e.emergencyName)}
        ${profileField('Emergency phone', e.emergencyPhone)}
      </div></section>
      <section class="profile-card"><h4>Employment & salary</h4><div class="profile-details">
        ${profileField('Employee ID', e.id)}${profileField('Old employee code', e.legacy)}
        ${profileField('Designation', e.designation)}${profileField('Department', e.department)}
        ${profileField('Employment type', e.type)}${profileField('Date of joining', profileDate(e.joining))}
        ${profileField('Monthly cash salary', money(e.salary, e.currency))}${profileField('Fixed variable pay', money(e.variable, e.currency))}
        ${salaryPolicyFor(e, month).accommodationEnabled ? profileField('Monthly accommodation (CTC only)', money(salaryPolicyFor(e, month).accommodationAmount)) : ''}
        ${profileField('CTC per month (INR)', money(employeeCtc(e, month, Number(e.salary), Number(e.variable || 0), e.currency === 'USD' ? rateOf(month) : 1, salaryPolicyFor(e, month)).total))}
        ${salaryPolicyFor(e, month).accommodationEnabled ? profileField('CTC less accommodation', money(salaryPolicyFor(e, month).accommodationAmount) + ' deducted from CTC; cash salary shown separately') : ''}
        ${profileField('Last working day', profileDate(e.lastDay))}${profileField('Status', e.status)}
      </div></section>
      <section class="profile-card profile-wide"><h4>Salary & compliance <span class="controls"><button type="button" class="linkish" data-calculation="${e.id}">View calculation</button><button type="button" class="linkish" data-salary-settings="${e.id}">Edit salary / CTC</button></span></h4>
        <div class="salary-help">For ${esc(monthLabel(month))}: ${salaryPolicyFor(e, month).breakupMode === 'custom' ? 'Custom salary breakup' : 'Company salary breakup'} · ${(e.salaryPolicies || []).length} saved version(s)</div>
        <div class="policy-badges">${['pf', 'esi', 'pt'].map((k) => '<span class="pill ' + (profilePayroll.compliance.policy[k + 'Enabled'] ? 'ok' : 'neutral') + '">' + { pf: 'PF', esi: 'ESIC', pt: 'Professional tax' }[k] + ': ' + (profilePayroll.compliance.policy[k + 'Enabled'] ? 'On' : 'Off') + '</span>').join('')}</div>
        <div class="profile-details">${profileField('UAN', e.uan, true)}${profileField('ESIC insurance number', e.esiNumber, true)}</div>
        <div class="cell-sub">Use Edit salary settings to turn deductions on or off, edit wage bases and rates, and choose their start month.</div>
      </section>
      <section class="profile-card"><h4>Bank details</h4><div class="profile-details">
        ${profileField('Account holder', e.bankHolder)}${profileField('Bank name', e.bankName)}
        ${profileField('Account number', e.bankAccount, true)}${profileField('IFSC code', e.ifsc)}
        ${profileField('SWIFT code', e.swift)}${profileField('Routing number', e.routing)}
        ${profileField('Bank address', e.bankAddress, false, true)}
      </div></section>
      <section class="profile-card"><h4>Identity & documents <span class="idc">${available.length} files</span></h4><div class="profile-details">
        ${profileField('Aadhaar number', e.aadhaar, true)}${profileField('PAN number', e.pan, true)}
      </div><div style="margin-top:12px">${docRows || '<p class="idc">No document links added yet. Add them in Edit details.</p>'}</div>
      ${sourceRows ? '<div class="profile-source">Source emails<br>' + sourceRows + '</div>' : ''}</section>
      ${e.notes ? `<section class="profile-card profile-wide"><h4>Notes</h4><div class="profile-details">${profileField('Employee notes', e.notes, false, true)}</div></section>` : ''}
    </div>`;
}
function openEmployeeProfile(id) {
  if (!S.employees.some((e) => e.id === id)) return;
  selectedProfileId = id;
  profilePrivateVisible = false;
  renderEmployeeProfile();
  document.getElementById('profileDlg').showModal();
}
document.getElementById('profileReveal').onclick = () => {
  profilePrivateVisible = !profilePrivateVisible;
  renderEmployeeProfile();
};
document.getElementById('profileEdit').onclick = () => {
  const employee = S.employees.find((e) => e.id === selectedProfileId);
  if (employee) openEmp(employee);
};
document.getElementById('profileBody').addEventListener('click', (ev) => {
  const activity = ev.target.closest('[data-activity]');
  if (activity) toggleEmployeeActivity(activity.dataset.activity);
});

/* ---------- EMPLOYEES ---------- */
const FIELDS = [
  ['§', 'Personal details'],
  ['name', 'Display name', 'text'],
  ['legalName', 'Legal name (on documents)', 'text'],
  ['dob', 'Date of birth', 'date'],
  ['email', 'Email address', 'email'],
  ['phone', 'Phone number', 'text'],
  ['location', 'Works from', ['India', 'Outside India']],
  ['address', 'Address', 'text'],
  ['emergencyName', 'Emergency contact name', 'text'],
  ['emergencyPhone', 'Emergency phone', 'text'],
  ['§', 'Job details'],
  ['department', 'Department', 'dept'],
  ['designation', 'Designation', 'text'],
  ['type', 'Type', ['Full-time', 'Intern', 'Contractor', 'Probation']],
  ['status', 'Status', ['Active', 'Resigned', 'Terminated', 'Inactive']],
  ['joining', 'Date of joining', 'date'],
  ['lastDay', 'Last working day', 'date'],
  ['legacy', 'Old code', 'number'],
  ['§', 'Pay'],
  ['currency', 'Pay currency', ['INR', 'USD']],
  ['salary', 'Monthly cash salary (excluding accommodation)', 'number'],
  ['variable', 'Fixed variable per month', 'number'],
  ['§', 'Bank details', 'Shown on the salary slip'],
  ['bankHolder', 'Account holder name', 'text'],
  ['bankName', 'Bank name', 'text'],
  ['bankAccount', 'Bank account number', 'text'],
  ['bankAddress', 'Bank address', 'text'],
  ['ifsc', 'IFSC code (required for India)', 'text'],
  ['routing', 'Routing number (required outside India)', 'text'],
  ['swift', 'SWIFT code (required outside India)', 'text'],
  ['§', 'Identity & document links'],
  ['aadhaar', 'Aadhaar number', 'text'],
  ['pan', 'PAN number', 'text'],
  ['aadhaarDocument', 'Aadhaar document URL or file path', 'text'],
  ['panDocument', 'PAN document URL or file path', 'text'],
  ['bankDocument', 'Bank proof URL or file path', 'text'],
  ['§', 'Other'],
  ['notes', 'Notes', 'text'],
];
const abroad = (e) => (e.location || 'India') === 'Outside India';
const slipReq = (e) =>
  [
    ['phone', 'Phone'],
    ['joining', 'Date of joining'],
    ['bankName', 'Bank name'],
    ['bankAccount', 'Account number'],
  ].concat(
    abroad(e)
      ? [
          ['routing', 'Routing number'],
          ['swift', 'SWIFT code'],
        ]
      : [['ifsc', 'IFSC code']],
  );
const missingSlip = (e) =>
  slipReq(e)
    .filter(([k]) => !String(e[k] || '').trim())
    .map(([, l]) => l);

/* Separate employee exits from routine attendance and payroll. */
const EXIT_CHECKS = ['handover', 'assets', 'access', 'documents'];
function exitEmployees() {
  return S.employees.filter((e) => e.status !== 'Active' || e.lastDay || e.offboarding);
}
function exitSummary(e) {
  const x = e.offboarding || {},
    confirmed = x.finalAmount !== '' && x.finalAmount != null;
  const amount = confirmed ? Number(x.finalAmount) : 0,
    paid = Number(x.paidAmount || 0);
  const progress = x.progress || 'In progress',
    done = EXIT_CHECKS.filter((k) => x[k]).length;
  return { x, confirmed, amount, paid, balance: confirmed ? r2(amount - paid) : null, progress, done };
}
function renderExits() {
  const scope = document.getElementById('exitScope').value || 'open';
  const matching = applyFilter(exitEmployees(), { ignoreStatus: true });
  const list = matching.filter(
    (e) =>
      scope === 'all' ||
      (scope === 'completed'
        ? exitSummary(e).progress === 'Completed'
        : exitSummary(e).progress !== 'Completed'),
  );
  const completed = matching.filter((e) => exitSummary(e).progress === 'Completed').length;
  const pending = matching.reduce((s, e) => {
    const v = exitSummary(e);
    return s + (v.confirmed ? Math.max(0, v.balance) : 0);
  }, 0);
  document.getElementById('exitStats').innerHTML =
    '<div class="stat"><b>' +
    matching.length +
    '</b><span>Exits / inactive employees</span></div><div class="stat"><b>' +
    (matching.length - completed) +
    '</b><span>Open exits</span></div><div class="stat"><b>' +
    completed +
    '</b><span>Completed</span></div><div class="stat"><b>' +
    money(pending) +
    '</b><span>Confirmed settlement pending</span></div>';
  let html =
    '<thead><tr><th>Employee</th><th>Status / last day</th><th>Exit checklist</th><th class="num">FNF settlement</th><th>Progress / owner</th><th>Manage</th></tr></thead><tbody>';
  list.forEach((e) => {
    const v = exitSummary(e),
      x = v.x;
    html +=
      '<tr><td><button class="profile-name" type="button" data-profile="' +
      esc(e.id) +
      '">' +
      esc(e.name) +
      '</button><div class="idc">' +
      esc(e.id) +
      ' · ' +
      esc(e.department || 'Unassigned') +
      '</div></td><td>' +
      esc(e.status) +
      '<span class="cell-sub">' +
      (e.lastDay ? profileDate(e.lastDay) : 'Last working day not set') +
      '</span></td><td><span class="pill ' +
      (v.done === 4 ? 'ok' : 'neutral') +
      '">' +
      v.done +
      ' / 4 complete</span><span class="cell-sub">' +
      EXIT_CHECKS.filter((k) => !x[k])
        .map((k) => ({ handover: 'Handover', assets: 'Assets', access: 'Access', documents: 'Documents' })[k])
        .join(', ') +
      '</span></td><td class="num">' +
      (v.confirmed
        ? '<b>' +
          money(v.amount) +
          '</b><span class="cell-sub">Paid: ' +
          money(v.paid) +
          '</span><span class="cell-sub">' +
          (v.balance < 0 ? 'Overpaid: ' + money(-v.balance) : 'Pending: ' + money(v.balance)) +
          '</span>'
        : '<span class="idc">Not confirmed</span>') +
      '</td><td><span class="pill ' +
      (v.progress === 'Completed' ? 'ok' : 'neutral') +
      '">' +
      esc(v.progress) +
      '</span><span class="cell-sub">' +
      esc(x.owner || 'HR owner not set') +
      '</span></td><td><button class="linkish" type="button" data-exit="' +
      esc(e.id) +
      '">Manage exit</button></td></tr>';
  });
  if (!list.length)
    html +=
      '<tr><td colspan="6" class="empty-state">No exits match this view. Open an employee profile and choose Manage exit to start.</td></tr>';
  document.getElementById('exitTable').innerHTML = html + '</tbody>';
}
let exitEditingId = null;
function openEmployeeExit(id) {
  const e = S.employees.find((e) => e.id === id);
  if (!e) return;
  exitEditingId = id;
  const x = e.offboarding || {},
    f = document.getElementById('exitForm');
  document.getElementById('exitTitle').textContent = 'Exit & final settlement (FNF)';
  document.getElementById('exitSubtitle').textContent = e.name + ' · ' + e.id;
  const values = {
    employmentStatus: e.status || 'Active',
    lastDay: e.lastDay || '',
    noticeDate: x.noticeDate || '',
    owner: x.owner || '',
    reason: x.reason || '',
    progress: x.progress || 'In progress',
    finalAmount: x.finalAmount ?? '',
    paidAmount: x.paidAmount || 0,
    paidOn: x.paidOn || '',
    paymentReference: x.paymentReference || '',
    notes: x.notes || '',
  };
  Object.entries(values).forEach(([k, v]) => (f.elements.namedItem(k).value = v));
  EXIT_CHECKS.forEach((k) => (f.elements.namedItem(k).checked = Boolean(x[k])));
  document.getElementById('exitError').textContent = '';
  document.getElementById('exitDlg').showModal();
}
function validateEmployeeExit(data, e) {
  if (!isDate(data.lastDay)) return 'Enter a valid last working day.';
  if (data.noticeDate && !isDate(data.noticeDate)) return 'Enter a valid notice date.';
  if (e.joining && data.lastDay < e.joining) return 'Last working day cannot be before the joining date.';
  if (!['Active', 'Resigned', 'Terminated', 'Inactive'].includes(data.employmentStatus))
    return 'Choose an employment status.';
  if (!['In progress', 'Completed'].includes(data.progress)) return 'Choose the exit progress.';
  if (data.finalAmount !== '' && (!Number.isFinite(data.finalAmount) || data.finalAmount < 0))
    return 'Settlement amount must be zero or positive.';
  if (!Number.isFinite(data.paidAmount) || data.paidAmount < 0)
    return 'Paid amount must be zero or positive.';
  if (data.paidAmount > 0 && !isDate(data.paidOn)) return 'Enter the settlement payment date.';
  if (
    data.progress === 'Completed' &&
    (EXIT_CHECKS.some((k) => !data[k]) || data.finalAmount === '' || data.paidAmount < data.finalAmount)
  )
    return 'Confirm the settlement, complete all four checklist items and record the full payment before closing the exit.';
  return '';
}
function recordEmployeeExit(e, data) {
  const error = validateEmployeeExit(data, e);
  if (error) return error;
  const previous = { joining: e.joining, lastDay: e.lastDay };
  setEmployeeStatus(e, data.employmentStatus);
  e.lastDay = data.lastDay;
  syncEmploymentDates(e, previous);
  const { employmentStatus, lastDay, ...record } = data;
  e.offboarding = { ...record, updatedAt: new Date().toISOString() };
  return '';
}
document.getElementById('exitForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const f = ev.currentTarget,
    e = S.employees.find((e) => e.id === exitEditingId);
  if (!e) return;
  const data = {};
  for (const k of [
    'employmentStatus',
    'lastDay',
    'noticeDate',
    'owner',
    'reason',
    'progress',
    'paidOn',
    'paymentReference',
    'notes',
  ])
    data[k] = f.elements.namedItem(k).value.trim();
  data.finalAmount =
    f.elements.namedItem('finalAmount').value === '' ? '' : Number(f.elements.namedItem('finalAmount').value);
  data.paidAmount = Number(f.elements.namedItem('paidAmount').value || 0);
  EXIT_CHECKS.forEach((k) => (data[k] = Boolean(f.elements.namedItem(k).checked)));
  const error = validateEmployeeExit(data, e);
  if (error) {
    document.getElementById('exitError').textContent = error;
    return;
  }
  if (!f.checkValidity()) {
    f.reportValidity();
    return;
  }
  recordEmployeeExit(e, data);
  save();
  document.getElementById('exitDlg').close();
  render();
  flash('Exit details saved');
});
document.getElementById('exitScope').addEventListener('change', renderExits);
document.getElementById('exitTable').addEventListener('click', (ev) => {
  const profile = ev.target.closest('[data-profile]');
  if (profile) {
    openEmployeeProfile(profile.dataset.profile);
    return;
  }
  const exit = ev.target.closest('[data-exit]');
  if (exit) openEmployeeExit(exit.dataset.exit);
});
document.getElementById('profileExit').addEventListener('click', () => {
  if (selectedProfileId) openEmployeeExit(selectedProfileId);
});

function uiIcon(name) {
  const paths = {
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    pay: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18M7 15h4"/>',
    edit: '<path d="m16 3 5 5-12 12H4v-5L16 3Z"/><path d="m13 6 5 5"/>',
    exit: '<path d="M9 4H4v16h5M13 8l4 4-4 4M8 12h13"/>',
    calc: '<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M8 6h8M8 11h1m6 0h1M8 15h1m6 0h1M8 18h1m6 0h1"/>',
  };
  return (
    '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (paths[name] || paths.more) +
    '</svg>'
  );
}
let actionEmployeeId = null,
  actionTrigger = null;
function closeEmployeeActions() {
  const menu = document.getElementById('employeeActionMenu');
  if (menu.hidePopover && menu.matches(':popover-open')) menu.hidePopover();
  menu.hidden = true;
  if (actionTrigger) actionTrigger.setAttribute('aria-expanded', 'false');
  actionTrigger = null;
}
function openEmployeeActions(id, button) {
  const e = S.employees.find((e) => e.id === id);
  if (!e) return;
  const menu = document.getElementById('employeeActionMenu'),
    box = button.getBoundingClientRect();
  actionEmployeeId = id;
  actionTrigger = button;
  document.getElementById('employeeActionTitle').textContent = e.name;
  menu.hidden = false;
  button.setAttribute('aria-expanded', 'true');
  menu.style.left = Math.max(12, Math.min(box.right - 244, window.innerWidth - 256)) + 'px';
  menu.style.top = Math.max(12, Math.min(box.bottom + 8, window.innerHeight - 260)) + 'px';
  if (menu.showPopover) menu.showPopover();
  const bounds = menu.getBoundingClientRect();
  if (bounds.bottom > window.innerHeight - 12)
    menu.style.top = Math.max(12, box.top - bounds.height - 8) + 'px';
  menu.querySelector('button')?.focus();
}
document.getElementById('employeeActionMenu').addEventListener('click', (ev) => {
  const button = ev.target.closest('[data-employee-action]');
  if (!button || !actionEmployeeId) return;
  const id = actionEmployeeId,
    action = button.dataset.employeeAction;
  closeEmployeeActions();
  if (action === 'salary') openSalarySettings(id);
  if (action === 'edit') openEmp(S.employees.find((e) => e.id === id));
  if (action === 'exit') openEmployeeExit(id);
  if (action === 'calculation') openSalaryCalculation(id, month);
});
document.addEventListener('click', (ev) => {
  const menu = document.getElementById('employeeActionMenu');
  if (!menu.hidden && !menu.contains(ev.target) && !ev.target.closest('[data-employee-actions]'))
    closeEmployeeActions();
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') closeEmployeeActions();
});
document.getElementById('employeeActionMenu').addEventListener('keydown', (ev) => {
  if (!['ArrowDown', 'ArrowUp'].includes(ev.key)) return;
  ev.preventDefault();
  const buttons = [...ev.currentTarget.querySelectorAll('button')],
    index = buttons.indexOf(document.activeElement);
  buttons[(index + (ev.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
});

function renderEmployees() {
  const list = applyFilter(S.employees);
  const active = S.employees.filter((e) => e.status === 'Active').length,
    inactive = S.employees.length - active;
  const done = S.employees.filter((e) => e.status === 'Active' && !missingSlip(e).length).length;
  document.getElementById('empStats').innerHTML =
    `<div class="stat"><b>${S.employees.length}</b><span>Total employees</span></div>
    <div class="stat"><b>${active}</b><span>Active employees</span></div><div class="stat"><b>${inactive}</b><span>Inactive employees</span></div>
    <div class="stat ${done < active ? 'warn' : ''}"><b>${done} / ${active}</b><span>Active profiles ready for slips</span></div>`;
  let h =
    '<thead><tr><th>Employee</th><th>Role & department</th><th class="num">Monthly CTC</th><th>Active / Inactive</th><th>Slip details</th><th>Actions</th></tr></thead><tbody>';
  list.forEach((e) => {
    const missing = missingSlip(e);
    const ledger = previewPayroll(e, month);
    const policy = salaryPolicyFor(e, month),
      ctc = ledger.ctc;
    const joining = e.joining
      ? new Date(e.joining + 'T00:00:00').toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Joining date missing';
    h += `<tr><td><div class="name">${esc(e.name)}</div><div class="idc">${e.id} · ${esc(e.location || 'India')}</div><span class="cell-sub">${joining}</span></td>
      <td>${esc(e.designation || 'Designation missing')}<span class="cell-sub">${esc(e.department || 'Unassigned')}</span></td>
      <td class="num"><span class="ctc-label">Monthly CTC</span><b class="ctc-amount">${money(ctc.total)}</b><span class="cell-sub">Cash: ${money(ctc.cash)}</span>${ctc.accommodation ? '<span class="cell-sub">Accommodation: −' + money(ctc.accommodation) + '</span>' : ''}<button class="calculation-link" type="button" data-calculation="${e.id}">${uiIcon('calc')} View calculation</button></td>
      <td>${employeeStatusControl(e)}</td>
      <td>${missing.length ? `<span class="pill bad" title="${esc(missing.join(', '))}">${missing.length} missing</span>` : '<span class="pill ok">Complete</span>'}</td>
      <td><div class="employee-actions"><button type="button" class="profile-button" data-profile="${e.id}" aria-label="Open profile for ${esc(e.name)}">${uiIcon('user')}<span>Profile</span></button><button type="button" class="more-button" data-employee-actions="${e.id}" aria-label="More actions for ${esc(e.name)}" aria-haspopup="menu" aria-expanded="false">${uiIcon('more')}</button></div></td></tr>`;
  });
  if (!list.length)
    h += '<tr><td colspan="6" class="empty-state">No employees match these filters.</td></tr>';
  document.getElementById('empTable').innerHTML = h + '</tbody>';
}

let editing = null;
function openEmp(e) {
  editing = e;
  document.getElementById('empDlgTitle').textContent = e
    ? `${e.name} (${e.id})`
    : `New employee (${nextId()})`;
  document.getElementById('empForm').innerHTML = FIELDS.map(([k, l, t]) => {
    if (k === '§') return `<div class="fsec">${l}${t ? ` <small>${t}</small>` : ''}</div>`;
    const v = e
      ? (e[k] ?? '')
      : ({ type: 'Full-time', currency: 'INR', status: 'Active', variable: 0 }[k] ?? '');
    if (t === 'dept') {
      const ds = [...new Set(S.employees.map((x) => x.department).filter(Boolean))].sort();
      return `<label>${l}<input name="${k}" list="deptList" value="${esc(v)}" placeholder="Pick or type a new one"><datalist id="deptList">${ds.map((d) => `<option value="${esc(d)}">`).join('')}</datalist></label>`;
    }
    if (Array.isArray(t))
      return `<label>${l}<select name="${k}">${t.map((o) => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
    const ph =
      {
        phone: '+91 98xxxxxxxx',
        swift: 'e.g. SBININBBXXX',
        bankAccount: 'Digits only',
        ifsc: 'e.g. SBIN0001234',
        routing: '9 digits, e.g. 021000021',
      }[k] || '';
    return `<label>${l}<input name="${k}" type="${t}" value="${esc(v)}" placeholder="${ph}" ${k === 'name' || k === 'salary' ? 'required' : ''}></label>`;
  }).join('');
  document.getElementById('empDlg').showModal();
}
/* bulk details via Excel */
const DETAIL_COLS = [
  ['id', 'Emp ID'],
  ['name', 'Name'],
  ['department', 'Department'],
  ['designation', 'Designation'],
  ['joining', 'Date of Joining (YYYY-MM-DD)'],
  ['location', 'Works From (India / Outside India)'],
  ['phone', 'Phone Number'],
  ['bankName', 'Bank Name'],
  ['bankAccount', 'Bank Account Number'],
  ['bankHolder', 'Account Holder Name'],
  ['bankAddress', 'Bank Address'],
  ['legalName', 'Legal Name'],
  ['dob', 'Date of Birth (YYYY-MM-DD)'],
  ['email', 'Email Address'],
  ['address', 'Address'],
  ['aadhaar', 'Aadhaar Number'],
  ['pan', 'PAN Number'],
  ['ifsc', 'IFSC Code'],
  ['routing', 'Routing Number'],
  ['swift', 'SWIFT Code'],
];
function needXLSX() {
  if (typeof XLSX === 'undefined') {
    alert(
      'The spreadsheet library could not be loaded. Keep the assets folder beside the portal and refresh.',
    );
    return false;
  }
  return true;
}
function downloadTemplate() {
  if (!needXLSX()) return;
  const rows = [DETAIL_COLS.map((c) => c[1])].concat(
    applyFilter(S.employees.filter((e) => e.status === 'Active')).map((e) =>
      DETAIL_COLS.map(([k]) => String(e[k] ?? '')),
    ),
  );
  const ws = XLSX.utils.aoa_to_sheet(rows);
  Object.keys(ws).forEach((a) => {
    if (a[0] !== '!') {
      ws[a].t = 's';
      ws[a].z = '@';
    }
  }); // keep account numbers as text
  ws['!cols'] = DETAIL_COLS.map(([k]) => ({
    wch: k === 'address' || k === 'bankAddress' ? 40 : k === 'id' ? 9 : 24,
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employee details');
  XLSX.writeFile(wb, 'Employee_details_template.xlsx');
}
function toISO(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return iso(value);
  const text = String(value).trim();
  let result = text,
    match;
  if ((match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)))
    result = match[1] + '-' + match[2].padStart(2, '0') + '-' + match[3].padStart(2, '0');
  else if ((match = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/)))
    result = match[3] + '-' + match[2].padStart(2, '0') + '-' + match[1].padStart(2, '0');
  return isDate(result) ? result : null;
}
document.getElementById('detailsFile').onchange = (ev) => {
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file || !needXLSX()) return;
  file
    .arrayBuffer()
    .then((buf) => {
      const wb = XLSX.read(buf, { cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
      let upd = 0;
      const unknown = [],
        badDate = [],
        badValue = [];
      let noId = 0;
      data.forEach((row) => {
        const inputId = String(row['Emp ID'] || '')
          .trim()
          .toUpperCase();
        const id = EMPLOYEE_ID_MAP[inputId] || inputId;
        if (!id) {
          if (Object.values(row).some((x) => String(x).trim())) noId++; // a filled row without an Emp ID
          return;
        }
        const e = S.employees.find((x) => x.id === id);
        if (!e) {
          unknown.push(id);
          return;
        }
        let changed = false;
        const previousDates = { joining: e.joining, lastDay: e.lastDay };
        DETAIL_COLS.forEach(([k, h]) => {
          if (k === 'id' || k === 'name') return;
          let v = row[h];
          if (v === '' || v == null) return;
          if (k === 'joining' || k === 'dob') {
            const d = toISO(v);
            if (!d || (k === 'dob' && d > iso(new Date()))) {
              badDate.push(id);
              return;
            }
            v = d;
          } else if (k === 'location') {
            // whole words only: "House" or "Campus" must not count as "us"
            v = /^\s*outside\b|\b(abroad|usa|us|foreign|overseas)\b/i.test(String(v))
              ? 'Outside India'
              : 'India';
          } else v = String(v).trim();
          if (['ifsc', 'swift'].includes(k)) v = v.toUpperCase().replace(/\s+/g, '');
          if (k === 'pan') {
            v = v.toUpperCase();
            if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(v)) return badValue.push(`${id} PAN`);
          }
          if (k === 'aadhaar') {
            v = v.replace(/[\s-]/g, '');
            if (!/^\d{12}$/.test(v)) return badValue.push(`${id} Aadhaar`);
          }
          if (e[k] !== v) {
            e[k] = v;
            changed = true;
          }
        });
        if (changed) {
          syncEmploymentDates(e, previousDates); // a new joining date marks earlier days A, like the form
          upd++;
        }
      });
      save();
      render();
      alert(
        `Updated ${upd} employee profile(s).` +
          (unknown.length ? `\nNot found: ${unknown.join(', ')}` : '') +
          (noId ? `\nSkipped ${noId} row(s) with no Emp ID.` : '') +
          (badDate.length
            ? `\nDate of joining or birth not understood for: ${badDate.join(', ')}. Use YYYY-MM-DD.`
            : '') +
          (badValue.length
            ? `\nNot saved (wrong format): ${badValue.join(', ')}. PAN: ABCDE1234F, Aadhaar: 12 digits.`
            : ''),
      );
    })
    .catch(() => alert('This file could not be read. Upload the filled-in details template (.xlsx).'));
};
document.getElementById('tplBtn').onclick = downloadTemplate;
function nextId() {
  const ids = new Set(S.employees.map((e) => e.id));
  for (const p of Object.values(S.payroll || {})) for (const id of Object.keys(p.rows || {})) ids.add(id);
  const n = Math.max(0, ...[...ids].map((id) => Number(id.split('-')[1]) || 0)) + 1;
  return 'ML-' + String(n).padStart(3, '0');
}
document.getElementById('empTable').addEventListener('click', (ev) => {
  const profile = ev.target.closest('[data-profile]');
  if (profile) {
    openEmployeeProfile(profile.dataset.profile);
    return;
  }
  const activity = ev.target.closest('[data-activity]');
  if (activity) {
    toggleEmployeeActivity(activity.dataset.activity);
    return;
  }
  const menu = ev.target.closest('[data-employee-actions]');
  if (menu) {
    openEmployeeActions(menu.dataset.employeeActions, menu);
    return;
  }
  const calculation = ev.target.closest('[data-calculation]');
  if (calculation) {
    openSalaryCalculation(calculation.dataset.calculation, month);
  }
});
document.getElementById('addEmp').onclick = () => openEmp(null);

function updateContractRows(e, previous) {
  for (const [m, p] of Object.entries(S.payroll)) {
    const row = p.rows?.[e.id];
    if (!row || row.status === 'Paid' || m < month) continue;
    let changed = false;
    for (const [field, flag] of [
      ['salary', 'salaryFromProfile'],
      ['variable', 'variableFromProfile'],
      ['currency', 'currencyFromProfile'],
    ])
      if (row[flag] && previous[field] !== e[field]) {
        row[field] = e[field] ?? 0;
        changed = true;
      }
    if (changed) row.status = 'Pending';
  }
}
function workingOn(e, day) {
  return !(e.joining && day < e.joining) && !(e.lastDay && day > e.lastDay);
}
function syncEmploymentDates(e, previous) {
  if (previous.joining === e.joining && previous.lastDay === e.lastDay) return;
  for (const [m, rows] of Object.entries(S.attendance)) {
    const attendance = rows[e.id],
      row = S.payroll[m]?.rows?.[e.id];
    if (!attendance || row?.status === 'Paid') continue;
    let changed = false;
    attendance.forEach((code, i) => {
      const day = m + '-' + String(i + 1).padStart(2, '0'),
        wasOutside = !workingOn(previous, day),
        outside = !workingOn(e, day);
      if (outside && code !== 'A') {
        attendance[i] = 'A';
        changed = true;
      } else if (wasOutside && !outside && code === 'A') {
        const [y, mo] = ym(m),
          weekday = new Date(y, mo - 1, i + 1).getDay();
        attendance[i] = weekday === 0 || weekday === 6 ? 'WO' : 'P';
        changed = true;
      }
    });
    if (changed && row && row.status !== 'Pending') row.status = 'Pending';
  }
}

document.getElementById('empSave').addEventListener('click', (ev) => {
  const employeeForm = document.querySelector('#empDlg form');
  if (!employeeForm.checkValidity()) {
    ev.preventDefault();
    employeeForm.reportValidity();
    return;
  }
  const f = new FormData(document.querySelector('#empDlg form'));
  const o = {};
  FIELDS.forEach(([k, , t]) => {
    if (k === '§') return;
    let v = f.get(k);
    if (t === 'number') v = Number(v || 0);
    else if (typeof v === 'string') v = v.trim();
    o[k] = v;
  });
  if (o.aadhaar) {
    o.aadhaar = o.aadhaar.replace(/[\s-]/g, '');
    if (!/^\d{12}$/.test(o.aadhaar)) {
      ev.preventDefault();
      alert('Aadhaar must contain 12 digits.');
      return;
    }
  }
  if (o.pan) {
    o.pan = o.pan.toUpperCase();
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(o.pan)) {
      ev.preventDefault();
      alert('PAN must use the format ABCDE1234F.');
      return;
    }
  }
  if (!o.name || !validAmount(o.salary, 0.000001) || !validAmount(o.variable)) {
    ev.preventDefault();
    alert('Enter a name, positive cash salary and non-negative fixed variable pay.');
    return;
  }
  if (o.location === 'Outside India' && !o.routing) {
    ev.preventDefault();
    alert(
      'Routing number is required for employees working outside India. Add it, or change "Works from" to India.',
    );
    return;
  }
  if (!editing && !o.joining) {
    // without a joining date a new person would also be counted in months already closed
    ev.preventDefault();
    alert('Enter the joining date for the new employee.');
    return;
  }
  if (
    (o.joining && !isDate(o.joining)) ||
    (o.lastDay && !isDate(o.lastDay)) ||
    (o.dob && (!isDate(o.dob) || o.dob > iso(new Date()))) ||
    (o.joining && o.lastDay && o.lastDay < o.joining)
  ) {
    ev.preventDefault();
    alert(
      'Enter valid dates. Last working day cannot precede joining, and date of birth cannot be in the future.',
    );
    return;
  }
  const dup = S.employees.find(
    (x) => x.name.trim().toLowerCase() === o.name.trim().toLowerCase() && (!editing || x.id !== editing.id),
  );
  if (dup && !confirm(`${dup.name} already exists as ${dup.id}. Add anyway?`)) {
    ev.preventDefault();
    return;
  }
  if (editing) {
    const previous = {
      joining: editing.joining,
      lastDay: editing.lastDay,
      salary: editing.salary,
      variable: editing.variable,
      currency: editing.currency,
    };
    setEmployeeStatus(editing, o.status);
    Object.assign(editing, o);
    updateContractRows(editing, previous);
    syncEmploymentDates(editing, previous);
  } else {
    const employee = { id: nextId(), ...o };
    if (o.status === 'Inactive') {
      employee.status = 'Active';
      setEmployeeStatus(employee, 'Inactive');
    }
    S.employees.push(employee);
  }
  // Keep marked attendance when contact details or activity status are edited.
  save();
  render();
});

/* ---------- SETTINGS ---------- */
function renderSettings() {
  document.getElementById('recoveryBackup').style.display = recoveryRawData ? 'inline-block' : 'none';
  document.getElementById('companyPfCovered').checked = S.settings.pfCovered !== false;
  document.getElementById('companyEsiCovered').checked = S.settings.esiCovered !== false;
  fileUI();
  let beforeSeptember = false;
  try {
    beforeSeptember = !!localStorage.getItem(SEPTEMBER_BACKUP_KEY);
  } catch (e) {}
  document.getElementById('preSeptemberBackup').style.display = beforeSeptember ? 'inline-block' : 'none';
  const sl = S.slip;
  [
    ['sCo', 'company'],
    ['sAddr', 'address'],
    ['sBasic', 'basic'],
    ['sHra', 'hra'],
    ['sConv', 'conv'],
    ['sMed', 'med'],
  ].forEach(([i, k]) => (document.getElementById(i).value = sl[k]));
  ['PL', 'SL', 'CL'].forEach((k) => (document.getElementById('q' + k).value = S.settings[k]));
  document.getElementById('qFX').value = S.settings.fx;
}
document.getElementById('saveSettings').onclick = () => {
  // an empty box stays '' (rejected below) instead of silently becoming 0
  const num = (id) => {
    const raw = document.getElementById(id).value.trim();
    return raw === '' ? '' : Number(raw);
  };
  const settings = {
    ...S.settings,
    fx: num('qFX'),
    pfCovered: document.getElementById('companyPfCovered').checked,
    esiCovered: document.getElementById('companyEsiCovered').checked,
  };
  for (const k of ['PL', 'SL', 'CL']) settings[k] = num('q' + k);
  const slip = {
    ...S.slip,
    company: document.getElementById('sCo').value.trim(),
    address: document.getElementById('sAddr').value.trim(),
  };
  for (const [id, k] of [
    ['sBasic', 'basic'],
    ['sHra', 'hra'],
    ['sConv', 'conv'],
    ['sMed', 'med'],
  ])
    slip[k] = num(id);
  const error = validateCompanySettings(settings, slip);
  if (error) {
    alert(error);
    return;
  }
  S.settings = settings;
  S.slip = slip;
  save();
  render();
  flash('Settings saved');
};
function download(name, data, type) {
  const b = new Blob([data], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
document.getElementById('preSeptemberBackup').onclick = () => {
  let data;
  try {
    data = localStorage.getItem(SEPTEMBER_BACKUP_KEY);
  } catch (e) {}
  if (data) download('hrms_before_september_2026_update.json', data, 'application/json');
};
document.getElementById('recoveryBackup').onclick = () => {
  if (recoveryRawData) download('HRMS_recovery.json', recoveryRawData, 'application/json');
};
document.getElementById('exportJson').onclick = () =>
  download(
    `hrms_backup_${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(S, null, 1),
    'application/json',
  );
document.getElementById('importJson').onchange = async (ev) => {
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  if (
    !confirm(
      `Restore "${file.name}"?\n\nEverything shown now is replaced by this backup. Download a backup of the current data first if you may need it.`,
    )
  )
    return;
  try {
    installState(JSON.parse(await file.text()));
    save();
    render();
    alert('Backup restored.');
  } catch (error) {
    alert(error.message || 'This file is not a valid HRMS backup.');
  }
};
document.getElementById('factoryReset').onclick = () => {
  if (confirm('Replace everything with the original data? Download a backup first to keep your changes.')) {
    installState(seed());
    save();
    render();
  }
};

/* ---------- EXCEL EXPORT ---------- */
function leaveRow(e, m) {
  attFor(m, e);
  const q = quota(e),
    u = usedThrough(e, m);
  return { q, u, left: { PL: q.PL - u.PL, SL: q.SL - u.SL, CL: q.CL - u.CL } };
}
function sheet(rows, widths) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  if (widths) ws['!cols'] = widths.map((w) => ({ wch: w }));
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  return ws;
}
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function setRange(kind) {
  const [y, mo] = ym(month);
  let f, t;
  if (kind === 'month') {
    f = new Date(y, mo - 1, 1);
    t = new Date(y, mo, 0);
  }
  if (kind === '3m') {
    f = new Date(y, mo - 3, 1);
    t = new Date(y, mo, 0);
  }
  if (kind === 'year') {
    f = new Date(y, 0, 1);
    t = new Date(y, 11, 31);
  }
  document.getElementById('xFrom').value = iso(f);
  document.getElementById('xTo').value = iso(t);
}
document
  .querySelectorAll('#xlsDlg [data-range]')
  .forEach((b) => (b.onclick = () => setRange(b.dataset.range)));
document.getElementById('xlsxBtn').onclick = () => {
  setRange('month');
  document.getElementById('xlsDlg').showModal();
};
document.getElementById('xGo').onclick = () => {
  const f = document.getElementById('xFrom').value,
    t = document.getElementById('xTo').value;
  if (!f || !t) {
    alert('Choose both a from date and a to date.');
    return;
  }
  if (f > t) {
    alert('The from date is after the to date. Swap them and try again.');
    return;
  }
  if (exportExcel(f, t)) document.getElementById('xlsDlg').close();
};
function exportExcel(from, to) {
  if (!isDate(from) || !isDate(to) || from > to) {
    alert('Choose a valid export date range.');
    return false;
  }
  if (!needXLSX()) return false;
  const wb = XLSX.utils.book_new();
  const months = [];
  {
    let [y, m] = ym(from.slice(0, 7));
    const [ty, tm] = ym(to.slice(0, 7));
    while (y < ty || (y === ty && m <= tm)) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
  }
  const withData = months.filter((m) => S.attendance[m] || S.payroll[m]);
  if (!withData.length) {
    alert('There is no attendance or payroll saved for these dates yet.');
    return false;
  }
  const fmtD = (d) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  // Payroll (one row per employee per month)
  const pr = [
    [
      'Month',
      'Emp ID',
      'Old code',
      'Name',
      'Department',
      'Designation',
      'Works from',
      'Currency',
      'Monthly salary',
      'Fixed variable',
      'Days in month',
      'Per-day rate',
      'A days',
      'UP days',
      'Half days',
      'Leave over quota',
      'Unpaid days total',
      'Unpaid deduction',
      'USD rate',
      'Performance bonus (INR)',
      'Incentive (INR)',
      'Reimbursement (INR)',
      'Other deduction (INR)',
      'Reason',
      'Total earnings (INR)',
      'Total deductions (INR)',
      'Net pay (INR)',
      'Net pay (USD)',
      'Paid per source sheet (INR)',
      'Status',
      'Check',
      'How it was calculated',
      'Employee PF (INR)',
      'Employee ESIC (INR)',
      'Professional tax (INR)',
      'Employer PF / EPS (INR)',
      'Employer ESIC (INR)',
      'PF wages (INR)',
      'ESIC wages (INR)',
      'Accommodation benefit (INR)',
      'Monthly CTC (INR)',
    ],
  ];
  let tot = 0,
    totU = 0;
  withData.forEach((m) => {
    applyFilter(empsIn(m)).forEach((e) => {
      const r = pay(e, m);
      tot += r.net;
      totU += r.net / rateOf(m);
      pr.push([
        monthLabel(m),
        e.id,
        e.legacy || '',
        e.name,
        e.department || '',
        e.designation || '',
        e.location || 'India',
        r.currency,
        r.sal,
        r.vari,
        r.d,
        r2(r.perDay),
        r.c.A,
        r.c.UP,
        r.c.HD,
        r.overTotal,
        r.lopDays,
        r.lop,
        rateOf(m),
        Number(r.row.bonus || 0),
        Number(r.row.inc || 0),
        Number(r.row.reimb || 0),
        Number(r.row.other || 0),
        r.row.reason || '',
        r.earnINR,
        r.dedINR,
        r.net,
        r2(r.net / rateOf(m)),
        r.legacy ?? '',
        r.row.status,
        r.check,
        r.ex,
        r.compliance.pfEmployee,
        r.compliance.esiEmployee,
        r.compliance.professionalTax,
        r.compliance.pfEmployer,
        r.compliance.esiEmployer,
        r.compliance.pfWages,
        r.compliance.esiWages,
        r.ctc.accommodation,
        r.ctc.total,
      ]);
    });
  });
  pr.push([]);
  pr.push([
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    r2(tot),
    r2(totU),
  ]);
  // Attendance day by day within the dates
  const ad = [['Date', 'Day', 'Emp ID', 'Name', 'Department', 'Code', 'Meaning']];
  const sum = {};
  withData.forEach((m) => {
    const [y, mo] = ym(m);
    applyFilter(empsIn(m)).forEach((e) => {
      const a = (S.attendance[m] || {})[e.id];
      if (!a) return;
      a.forEach((code, i) => {
        const d = iso(new Date(y, mo - 1, i + 1));
        if (d < from || d > to) return;
        ad.push([
          fmtD(d),
          new Date(y, mo - 1, i + 1).toLocaleDateString('en-GB', { weekday: 'short' }),
          e.id,
          e.name,
          e.department || '',
          code || '',
          CODE_NAMES[code] || 'Not marked',
        ]);
        const s = (sum[e.id] = sum[e.id] || { e, days: 0 });
        CODES.forEach((k) => (s[k] = s[k] || 0));
        s.days++;
        if (code) s[code]++;
      });
    });
  });
  const as = [
    [
      'Emp ID',
      'Name',
      'Department',
      'Days in range',
      'Present',
      'WFH',
      'Weekly off',
      'Holiday',
      'PL',
      'SL',
      'CL',
      'Half days',
      'Absent',
      'Unpaid leave',
    ],
  ];
  Object.values(sum)
    .sort((a, b) => a.e.name.localeCompare(b.e.name, 'en', { sensitivity: 'base' }))
    .forEach((s) =>
      as.push([
        s.e.id,
        s.e.name,
        s.e.department || '',
        s.days,
        s.P,
        s.WFH,
        s.WO,
        s.H,
        s.PL,
        s.SL,
        s.CL,
        s.HD,
        s.A,
        s.UP,
      ]),
    );
  // Leave balance at the end of the range
  const lm = withData.filter((m) => S.attendance[m]).pop();
  const lv = [
    [`Leave balance after ${lm ? monthLabel(lm) : '—'}`],
    [
      'Emp ID',
      'Name',
      'Department',
      'PL quota',
      'PL used',
      'PL left',
      'SL quota',
      'SL used',
      'SL left',
      'CL quota',
      'CL used',
      'CL left',
      'Total paid leave left',
    ],
  ];
  if (lm)
    applyFilter(empsIn(lm)).forEach((e) => {
      const L = leaveRow(e, lm);
      lv.push([
        e.id,
        e.name,
        e.department || '',
        L.q.PL,
        L.u.PL,
        L.left.PL,
        L.q.SL,
        L.u.SL,
        L.left.SL,
        L.q.CL,
        L.u.CL,
        L.left.CL,
        ['PL', 'SL', 'CL'].reduce((s, t) => s + Math.max(0, L.left[t]), 0),
      ]);
    });
  // Dated salary policies for audit and future payroll.
  const policies = [
    [
      'Emp ID',
      'Name',
      'From month',
      'Salary breakup',
      'Basic %',
      'DA %',
      'HRA %',
      'Conveyance %',
      'Medical %',
      'PF enabled',
      'Monthly PF wages INR',
      'PF wage cap INR',
      'Employee PF %',
      'Employer PF / EPS %',
      'ESIC enabled',
      'Monthly ESIC wages INR',
      'Employee ESIC %',
      'Employer ESIC %',
      'Employee ESIC exempt',
      'Professional tax enabled',
      'PT state',
      'PT calculation',
      'Manual PT INR',
      'UAN',
      'ESIC number',
      'PF calculation',
      'ESIC calculation',
      'Accommodation in CTC',
      'Monthly accommodation INR',
    ],
  ];
  applyFilter(S.employees).forEach((e) =>
    (e.salaryPolicies || [])
      .slice()
      .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
      .forEach((p) =>
        policies.push([
          e.id,
          e.name,
          p.effectiveFrom,
          p.breakupMode,
          p.basicPct,
          p.daPct,
          p.hraPct,
          p.convPct,
          p.medPct,
          p.pfEnabled,
          p.pfMonthlyWages,
          p.pfCap,
          p.pfEmployeeRate,
          p.pfEmployerRate,
          p.esiEnabled,
          p.esiMonthlyWages,
          p.esiEmployeeRate,
          p.esiEmployerRate,
          p.esiEmployeeExempt,
          p.ptEnabled,
          p.ptState,
          p.ptMode,
          p.ptMonthlyAmount,
          String(e.uan || ''),
          String(e.esiNumber || ''),
          p.pfBaseMode || 'manual',
          p.esiBaseMode || 'manual',
          Boolean(p.accommodationEnabled),
          p.accommodationAmount || 0,
        ]),
      ),
  );
  // Employees
  const em = [
    [
      'Emp ID',
      'Old code',
      'Name',
      'Department',
      'Designation',
      'Type',
      'Date of joining',
      'Status',
      'Last working day',
      'Works from',
      'Currency',
      'Monthly salary',
      'Fixed variable',
      'Phone',
      'Bank name',
      'Bank account',
      'IFSC code',
      'Routing number',
      'SWIFT code',
      'Slip details missing',
      'Notes',
    ],
  ];
  applyFilter(S.employees).forEach((e) =>
    em.push([
      e.id,
      e.legacy || '',
      e.name,
      e.department || '',
      e.designation || '',
      e.type,
      e.joining || '',
      e.status,
      e.lastDay || '',
      e.location || 'India',
      e.currency,
      Number(e.salary),
      Number(e.variable || 0),
      e.phone || '',
      e.bankName || '',
      String(e.bankAccount || ''),
      e.ifsc || '',
      String(e.routing || ''),
      e.swift || '',
      missingSlip(e).join(', '),
      e.notes || '',
    ]),
  );
  const info = [
    ['Acme Labs HRMS export'],
    ['Dates', `${fmtD(from)} to ${fmtD(to)}`],
    ['Months with data', withData.map(monthLabel).join(', ')],
    [
      'Filter',
      (filt.q ? `search "${filt.q}" ` : '') +
        (filt.dept !== 'All' ? `department ${filt.dept} ` : '') +
        (filt.status !== 'all' ? `employee status ${filt.status}` : '') || 'None',
    ],
    ['Total net pay (INR)', r2(tot)],
    ['Total net pay (USD)', r2(totU)],
    ['Downloaded', new Date().toLocaleString('en-IN')],
    ['Compliance rules last verified', '13 October 2026'],
    ['Gujarat PT slab effective from', '1 April 2022'],
  ];
  XLSX.utils.book_append_sheet(wb, sheet(info, [22, 60]), 'Summary');
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      pr,
      [
        16, 9, 8, 24, 16, 24, 12, 8, 12, 10, 8, 10, 6, 6, 6, 8, 8, 12, 8, 12, 12, 12, 12, 30, 14, 14, 14, 12,
        14, 10, 14, 90,
      ],
    ),
    'Payroll',
  );
  XLSX.utils.book_append_sheet(
    wb,
    sheet(as, [9, 24, 16, 10, 8, 6, 9, 8, 5, 5, 5, 8, 7, 10]),
    'Attendance summary',
  );
  XLSX.utils.book_append_sheet(wb, sheet(ad, [13, 6, 9, 24, 16, 6, 16]), 'Attendance by day');
  XLSX.utils.book_append_sheet(wb, sheet(lv, [9, 24, 16, 9, 9, 9, 9, 9, 9, 9, 9, 9, 12]), 'Leave balance');
  XLSX.utils.book_append_sheet(
    wb,
    sheet(em, [9, 8, 24, 16, 24, 11, 12, 10, 12, 12, 8, 12, 10, 16, 20, 20, 14, 14, 14, 30, 40]),
    'Employees',
  );
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      policies,
      [9, 24, 12, 16, 9, 9, 9, 12, 10, 12, 18, 16, 14, 18, 12, 18, 14, 14, 16, 18, 18, 18, 16, 16, 16],
    ),
    'Salary settings',
  );
  const exitRows = [
    [
      'Employee ID',
      'Name',
      'Employment status',
      'Last working day',
      'Notice date',
      'HR owner',
      'Reason',
      'Exit progress',
      'Final settlement INR',
      'Settlement paid INR',
      'Pending INR',
      'Payment date',
      'Payment reference',
      'Handover',
      'Assets cleared',
      'Access removed',
      'Documents ready',
      'HR notes',
      'Last updated',
    ],
  ];
  applyFilter(exitEmployees(), { ignoreStatus: true }).forEach((e) => {
    const v = exitSummary(e),
      x = v.x;
    exitRows.push([
      e.id,
      e.name,
      e.status,
      e.lastDay || '',
      x.noticeDate || '',
      x.owner || '',
      x.reason || '',
      v.progress,
      v.confirmed ? v.amount : '',
      v.paid,
      v.confirmed ? v.balance : '',
      x.paidOn || '',
      x.paymentReference || '',
      Boolean(x.handover),
      Boolean(x.assets),
      Boolean(x.access),
      Boolean(x.documents),
      x.notes || '',
      x.updatedAt || '',
    ]);
  });
  XLSX.utils.book_append_sheet(
    wb,
    sheet(exitRows, [12, 24, 18, 14, 14, 18, 28, 16, 20, 20, 16, 14, 24, 12, 14, 14, 14, 40, 24]),
    'Employee exits',
  );
  const tag = filt.q || filt.dept !== 'All' || filt.status !== 'all' ? '_filtered' : '';
  XLSX.writeFile(wb, `AcmeLabs_HRMS_${from}_to_${to}${tag}.xlsx`);
  flash('Excel downloaded');
  return true;
}

document.getElementById('curToggle').addEventListener('click', (ev) => {
  const c = ev.target.dataset.c;
  if (!c) return;
  S.settings.disp = c;
  save();
  render();
});

document.getElementById('createFile').onclick = createDataFile;
document.getElementById('openFile').onclick = () => {
  if (confirm('Opening a data file replaces what is shown now with the contents of that file. Continue?'))
    openDataFile();
};
document.getElementById('reconnectBtn').onclick = reconnect;
document.getElementById('navReconnect').onclick = reconnect;
document.getElementById('disconnectFile').onclick = disconnectFile;

/* ---------- FILTERS ---------- */
document.getElementById('fQ').addEventListener('input', (ev) => {
  filt.q = ev.target.value;
  render();
});
document.getElementById('fDept').addEventListener('change', (ev) => {
  filt.dept = ev.target.value;
  render();
});
document.getElementById('fStatus').addEventListener('change', (ev) => {
  filt.status = ev.target.value;
  render();
});
document.getElementById('fSort').addEventListener('change', (ev) => {
  filt.sort = ev.target.value;
  render();
});

/* ---------- NAV ---------- */
let tab = 'payroll';
document.querySelectorAll('nav button[data-tab]').forEach(
  (b) =>
    (b.onclick = () => {
      tab = b.dataset.tab;
      document.querySelectorAll('nav button').forEach((x) => x.classList.toggle('on', x === b));
      render();
    }),
);
document.querySelectorAll('.monthPick').forEach((i) =>
  i.addEventListener('change', (ev) => {
    if (ev.target.value) {
      month = ev.target.value;
      render();
    }
  }),
);
document.addEventListener('click', (ev) => {
  const close = ev.target.closest('[data-close]');
  if (close) document.getElementById(close.dataset.close)?.close();
});
document.getElementById('downloadPayslipPdf').addEventListener('click', downloadPayslipPdf);
function render() {
  closeEmployeeActions();
  document.querySelectorAll('main section').forEach((s) => s.classList.toggle('hide', s.id !== 'tab-' + tab));
  document.querySelectorAll('.monthPick').forEach((i) => (i.value = month));
  document.getElementById('filterbar').style.display = tab === 'settings' ? 'none' : 'flex';
  document.getElementById('fStatusLabel').style.display = tab === 'exits' ? 'none' : 'flex';
  renderDeptOptions();
  ({
    exits: renderExits,
    payroll: renderPayroll,
    attendance: renderAttendance,
    leave: renderLeave,
    employees: renderEmployees,
    settings: renderSettings,
  })[tab]();
  if (selectedProfileId && document.getElementById('profileDlg').open) renderEmployeeProfile();
  if (calculationEmployeeId && document.getElementById('calculationDlg').open) renderSalaryCalculation();
}
// Application startup
async function start() {
  const main = document.querySelector('main');
  main.inert = true;
  try {
    if (typeof IMPORTED === 'undefined' || typeof PROFILE_EMAIL_RECORDS === 'undefined')
      throw new Error(
        'Portal resources are missing. Keep AcmeLabs_HRMS_assets beside this HTML file and refresh.',
      );
    load();
    render();
    await initFile();
    render();
    save();
  } catch (error) {
    const banner = document.getElementById('storageBanner');
    banner.textContent =
      error.message || 'The portal could not be opened. Refresh the complete portal folder.';
    banner.style.display = 'block';
    return;
  } finally {
    main.inert = false;
  }
}
start();
