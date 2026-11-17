/* ============================================================
   ATTENDANCE SHEET UPLOAD (Attendance → "Upload sheet")
   Reads the monthly attendance workbook (.xlsx / .xls) in the
   layout of the company Time sheet: Emp Code · Emp Name · …
   · Current Salary · day columns 1…31 · CL PL SL HD A · …
   Each row is matched to an HRMS employee (code + name), checked,
   and shown in a preview with what will change. Nothing is saved
   until "Import" is confirmed; the last import can be undone.
   Months whose salary is marked Paid are never changed.
   ============================================================ */
const SHEET_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
// codes the sheet may use for each HRMS attendance code (compared case-insensitively)
const CODE_ALIASES = {
  PRESENT: 'P',
  'WORK FROM HOME': 'WFH',
  OFF: 'WO',
  'W/O': 'WO',
  'WEEKLY OFF': 'WO',
  HOLIDAY: 'H',
  PH: 'H',
  'HALF DAY': 'HD',
  HALF: 'HD',
  ABSENT: 'A',
  LWP: 'UP',
  LOP: 'UP',
  'UNPAID LEAVE': 'UP',
};
const sheetCode = (v) => {
  const t = String(v ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
  if (!t) return '';
  return CODES.includes(t) ? t : CODE_ALIASES[t] || null; // '' = blank, null = not a code
};
const normName = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-zÀ-ɏ]+/g, ' ')
    .trim();
function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]++;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length];
}
// 3 = same name, 2 = one name contains the other (e.g. a middle name), 1 = close spelling, 0 = different
function nameScore(sheetName, e) {
  const s = normName(sheetName);
  if (!s) return 0;
  let best = 0;
  for (const candidate of [e.name, e.legalName]) {
    const c = normName(candidate);
    if (!c) continue;
    if (c === s) return 3;
    const sw = s.split(' '),
      cw = c.split(' ');
    const contained = (x, y) => x.length >= 2 && x.every((w) => y.includes(w));
    if (contained(sw, cw) || contained(cw, sw)) best = Math.max(best, 2);
    else if (1 - editDistance(s, c) / Math.max(s.length, c.length) >= 0.8) best = Math.max(best, 1);
  }
  return best;
}
// "Oct 26", "March 26", "Sep 2025", "May - 2025 Attendance Sheet" → "2026-10" …
function monthFromSheetName(name) {
  const t = String(name || '').toLowerCase();
  const mm = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/);
  const yy = t.match(/\b(20\d{2}|\d{2})\b/);
  if (!mm || !yy) return '';
  const year = yy[1].length === 2 ? 2000 + Number(yy[1]) : Number(yy[1]);
  return year + '-' + String(SHEET_MONTHS.indexOf(mm[1]) + 1).padStart(2, '0');
}

/* ---------- reading a sheet ---------- */
// rows: array of arrays from XLSX.utils.sheet_to_json(ws, { header: 1 }). Returns the layout or { error }.
function readAttendanceSheet(rows, sheetName) {
  const text = (v) => String(v ?? '').trim();
  const dayOf = (v) => {
    if (v instanceof Date && !isNaN(v)) return { day: v.getDate(), month: iso(v).slice(0, 7) };
    const n = typeof v === 'number' ? v : /^\d{1,2}(\.0+)?$/.test(text(v)) ? Number(text(v)) : NaN;
    return Number.isInteger(n) && n >= 1 && n <= 31 ? { day: n } : null;
  };
  let headerAt = -1;
  for (let i = 0; i < Math.min(rows.length, 15) && headerAt < 0; i++) {
    const r = rows[i] || [];
    if (r.some((v) => /^(emp(loyee)?\.?\s*)?name$/i.test(text(v))) && r.filter((v) => dayOf(v)).length >= 28)
      headerAt = i;
  }
  if (headerAt < 0)
    return {
      error: `"${sheetName}" is not an attendance sheet: no header row with an employee name column and day columns 1–31 was found.`,
    };
  const head = rows[headerAt];
  const find = (re) => head.findIndex((v) => re.test(text(v)));
  const col = {
    code: find(/^(emp(loyee)?\.?\s*)?(code|no\.?|number)$/i),
    id: find(/^(hrms\s*)?(emp(loyee)?\.?\s*)?id$/i),
    name: find(/^(emp(loyee)?\.?\s*)?name$/i),
    salary: find(/salary/i),
  };
  const days = [];
  head.forEach((v, i) => {
    const d = dayOf(v);
    if (d && (!days.length || i === days[days.length - 1].col + 1)) days.push({ ...d, col: i });
  });
  const seq = days.map((d) => d.day);
  if (seq.some((d, i) => d !== i + 1))
    return { error: `The day columns must run 1, 2, 3 … without gaps or repeats (found ${seq.join(', ')}).` };
  const dateMonths = [...new Set(days.map((d) => d.month).filter(Boolean))];
  if (dateMonths.length > 1) return { error: 'The day columns contain dates from more than one month.' };
  // the sheet's own count columns right after the days (used only to cross-check the sheet)
  const totals = {};
  const after = days[days.length - 1].col + 1;
  ['CL', 'PL', 'SL', 'HD', 'A'].forEach((k) => {
    const i = head.findIndex((v, j) => j >= after && j < after + 8 && text(v).toUpperCase() === k);
    if (i >= 0) totals[k] = i;
  });
  const people = [];
  for (let i = headerAt + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const name = col.name >= 0 ? text(r[col.name]) : '',
      code = col.code >= 0 ? text(r[col.code]).replace(/\.0+$/, '') : '',
      id = col.id >= 0 ? text(r[col.id]).toUpperCase() : '';
    if (!name && !code && !id) continue; // blank or total rows
    const values = days.map((d) => r[d.col]);
    if (values.every((v) => text(v) === '')) continue; // a row without any attendance (notes, totals)
    const sheetTotals = {};
    Object.entries(totals).forEach(([k, c]) => {
      if (typeof r[c] === 'number') sheetTotals[k] = r[c];
    });
    people.push({
      row: i + 1,
      name,
      code,
      id,
      salary: col.salary >= 0 && typeof r[col.salary] === 'number' ? r[col.salary] : null,
      values,
      sheetTotals,
    });
  }
  return {
    days: days.length,
    dateMonth: dateMonths[0] || '',
    detectedMonth: dateMonths[0] || monthFromSheetName(sheetName),
    hasCode: col.code >= 0,
    people,
  };
}

/* ---------- planning an import (no changes are made here) ---------- */
/* A row belongs to an employee when:
   - its HRMS ID (ML-…, in an ID or Emp Code column) is that employee's, or
   - its Emp Code is the employee's old code and the names agree (small spelling differences are allowed), or
   - its name is exactly the employee's name (or legal name); a different Emp Code is then reported.
   Anything less certain fails, so one person's attendance is never written onto someone else. */
function matchEmployee(p) {
  const all = S.employees,
    looksLikeId = (v) => /^(ML|EMP)-\d+$/i.test(v),
    hrmsId = looksLikeId(p.id) ? p.id.toUpperCase() : looksLikeId(p.code) ? p.code.toUpperCase() : '';
  if (hrmsId) {
    const e = all.find((x) => x.id === hrmsId);
    if (!e) return { error: `Employee ID ${hrmsId} is not in the HRMS.` };
    return !p.name || nameScore(p.name, e)
      ? { e, warn: [] }
      : { error: `Employee ID ${hrmsId} is ${e.name} in the HRMS, but the sheet says "${p.name}".` };
  }
  if (p.id) return { error: `"${p.id}" is not an HRMS employee ID (they look like ML-005).` };
  const byCode = p.code ? all.filter((e) => String(e.legacy ?? '') === p.code) : [];
  const codeAndName = byCode.filter((e) => nameScore(p.name, e) > 0);
  if (codeAndName.length === 1) {
    const e = codeAndName[0];
    return {
      e,
      warn:
        nameScore(p.name, e) < 3
          ? [`Name "${p.name}" is written differently in the HRMS ("${e.name}").`]
          : [],
    };
  }
  const exact = all.filter((e) => nameScore(p.name, e) === 3);
  if (exact.length === 1) {
    const e = exact[0];
    return {
      e,
      warn:
        p.code && String(e.legacy ?? '') !== p.code
          ? [
              `Emp code ${p.code} in the sheet, ${e.legacy != null ? 'old code ' + e.legacy : 'no old code'} in the HRMS.`,
            ]
          : [],
    };
  }
  if (exact.length > 1)
    return {
      error: `"${p.name}" matches more than one employee (${exact.map((e) => e.id).join(', ')}). Add the HRMS ID (ML-…) in an "ID" column.`,
    };
  const close = all.filter((e) => nameScore(p.name, e) > 0);
  if (!p.code && close.length === 1 && nameScore(p.name, close[0]) === 2)
    return {
      e: close[0],
      warn: [`Name "${p.name}" is written differently in the HRMS ("${close[0].name}").`],
    };
  if (byCode.length === 1)
    return {
      error: `Emp code ${p.code} belongs to ${byCode[0].name} in the HRMS, but the sheet says "${p.name}". Add ${p.name || 'this person'} under Employees first, or correct the code.`,
    };
  if (close.length)
    return {
      error: `No employee with code ${p.code || '(none)'} and name "${p.name}". Did you mean ${close
        .map((e) => `${e.name} (code ${e.legacy ?? '–'})`)
        .join(' or ')}? Correct the code or name in the sheet.`,
    };
  return {
    error: `No employee called "${p.name || '(no name)'}"${p.code ? ` (code ${p.code})` : ''} in the HRMS. Add them under Employees first.`,
  };
}
function planAttendanceImport(sheet, m, { useCalendar = true } = {}) {
  const d = daysIn(m),
    [y, mo] = ym(m);
  const plan = { month: m, rows: [], fatal: '' };
  if (sheet.error) return { ...plan, fatal: sheet.error };
  if (!isMonth(m)) return { ...plan, fatal: 'Choose the month this sheet is for.' };
  if (sheet.days !== d)
    return {
      ...plan,
      fatal: `${monthLabel(m)} has ${d} days but the sheet has ${sheet.days} day columns. Check the month (the sheet looks like ${sheet.detectedMonth ? monthLabel(sheet.detectedMonth) : 'another month'}).`,
    };
  if (sheet.dateMonth && sheet.dateMonth !== m)
    return {
      ...plan,
      fatal: `The day columns are dates in ${monthLabel(sheet.dateMonth)}, not ${monthLabel(m)}.`,
    };
  if (!sheet.people.length) return { ...plan, fatal: 'The sheet has no employee rows with attendance.' };
  if (sheet.detectedMonth && sheet.detectedMonth !== m)
    plan.notice = `The tab name suggests ${monthLabel(sheet.detectedMonth)}, but you are importing into ${monthLabel(m)}. Check the month before importing.`;
  const used = new Map();
  for (const p of sheet.people) {
    const out = { ...p, status: 'failed', messages: [], warnings: [], changes: [] };
    plan.rows.push(out);
    const match = matchEmployee(p);
    if (match.error) {
      out.messages.push(match.error);
      continue;
    }
    const e = (out.e = match.e);
    out.warnings.push(...match.warn);
    if (used.has(e.id)) {
      const first = used.get(e.id);
      out.messages.push(`Duplicate: row ${first.row} is also ${e.name}.`);
      if (first.status !== 'failed') {
        first.status = 'failed';
        first.messages.push(`Duplicate: row ${p.row} is also ${e.name}.`);
      }
      continue;
    }
    used.set(e.id, out);
    // codes, day by day
    const bad = [],
      blank = [],
      next = [];
    p.values.forEach((v, i) => {
      const c = sheetCode(v);
      if (c === null) bad.push(`day ${i + 1} "${String(v).trim()}"`);
      if (c === '') blank.push(i + 1);
      next.push(c);
    });
    if (bad.length) {
      out.messages.push(`Not an attendance code: ${bad.join(', ')}. Use ${CODES.join(', ')}.`);
      continue;
    }
    // the sheet's own CL / PL / SL / HD / A totals should agree with its day cells
    Object.entries(p.sheetTotals).forEach(([k, n]) => {
      const counted = next.filter((c) => c === k).length;
      if (counted !== n)
        out.warnings.push(`The sheet's ${k} total is ${n}, but its day cells show ${counted}.`);
    });
    if (p.salary != null && Number(e.salary) !== p.salary)
      out.warnings.push(
        `Salary in the sheet is ${money(p.salary, e.currency)}; the HRMS has ${money(e.salary, e.currency)}. Salaries are not changed by this upload.`,
      );
    if (!activeIn(e, m)) {
      out.status = 'skipped';
      out.messages.push(
        `${e.name} is not on the ${monthLabel(m)} payroll (${e.status}${e.lastDay ? ', last day ' + e.lastDay : ''}).`,
      );
      continue;
    }
    if (S.payroll[m]?.rows?.[e.id]?.status === 'Paid') {
      out.status = 'skipped';
      out.messages.push(`Salary for ${monthLabel(m)} is already marked Paid, so its attendance is locked.`);
      continue;
    }
    // read the saved attendance without creating it: previewing must not change any data
    const saved = S.attendance[m]?.[e.id];
    out.existing = !!(saved && saved.length === d);
    const current = out.existing ? [...saved] : defaultAttendance(m, e);
    const outside = [],
      offLeave = [];
    const result = next.map((c, i) => {
      const date = iso(new Date(y, mo - 1, i + 1)),
        wd = new Date(y, mo - 1, i + 1).getDay();
      if (!workingOn(e, date)) {
        if (c && c !== 'A') outside.push(i + 1);
        return current[i]; // days before joining / after the last day stay as the HRMS has them
      }
      if (!c) return current[i]; // blank in the sheet: keep what the HRMS has
      if (['PL', 'SL', 'CL'].includes(c) && (wd === 0 || wd === 6 || holidayOn(date)))
        offLeave.push(`${i + 1} (${c})`);
      if (useCalendar && c === 'P') {
        if (wd === 0 || wd === 6) return 'WO';
        if (holidayOn(date)) return 'H';
      }
      return c;
    });
    if (blank.length) out.warnings.push(`Blank in the sheet (kept as in the HRMS): day ${blank.join(', ')}.`);
    if (outside.length)
      out.warnings.push(
        `Day ${outside.join(', ')} ${outside.length > 1 ? 'are' : 'is'} outside ${e.name}'s employment and stay${outside.length > 1 ? '' : 's'} unpaid.`,
      );
    if (offLeave.length)
      out.warnings.push(
        `Leave marked on a weekly off or holiday uses the leave quota: day ${offLeave.join(', ')}.`,
      );
    out.next = result;
    out.changes = result
      .map((c, i) => (c !== current[i] ? { day: i + 1, from: current[i], to: c } : null))
      .filter(Boolean);
    if (!out.changes.length) {
      out.status = 'same';
      out.messages.push('Already up to date.');
    } else {
      out.status = out.existing ? 'update' : 'new';
      out.messages.push(
        `${out.changes.length} day${out.changes.length > 1 ? 's' : ''} ${out.existing ? 'changed' : 'set'}: ` +
          out.changes
            .slice(0, 6)
            .map((x) => `${x.day} ${x.from || '–'}→${x.to}`)
            .join(', ') +
          (out.changes.length > 6 ? ` and ${out.changes.length - 6} more` : '') +
          '.',
      );
    }
  }
  // HRMS employees on this month's payroll who are not in the sheet (their attendance is left alone)
  const inSheet = new Set(plan.rows.filter((r) => r.e).map((r) => r.e.id));
  plan.notInSheet = empsIn(m).filter((e) => !inSheet.has(e.id));
  return plan;
}
function planCounts(plan) {
  const n = (st) => plan.rows.filter((r) => st.includes(r.status)).length;
  return {
    ready: n(['new', 'update']),
    updates: n(['update']),
    same: n(['same']),
    skipped: n(['skipped']),
    failed: n(['failed']),
  };
}
// writes the planned rows; keeps what they replaced so the import can be undone
function applyAttendancePlan(plan, file) {
  const m = plan.month,
    prev = {},
    wrote = {},
    rows = plan.rows.filter((r) => r.status === 'new' || r.status === 'update');
  S.attendance[m] = S.attendance[m] || {};
  rows.forEach((r) => {
    prev[r.e.id] = r.existing ? [...S.attendance[m][r.e.id]] : null;
    S.attendance[m][r.e.id] = [...r.next];
    wrote[r.e.id] = [...r.next];
  });
  S.attendanceImportUndo = { month: m, file, at: new Date().toISOString(), prev, wrote };
  save();
  return rows.length;
}
// puts back what the last upload replaced; rows edited or paid after the upload are kept as they are now
function undoAttendanceImport() {
  const u = S.attendanceImportUndo,
    result = { restored: 0, kept: [] };
  if (!u) return result;
  const days = (S.attendance[u.month] = S.attendance[u.month] || {});
  Object.entries(u.prev).forEach(([id, before]) => {
    const e = S.employees.find((x) => x.id === id),
      name = e ? e.name : id;
    const untouched = !u.wrote || (days[id] || []).join() === (u.wrote[id] || []).join();
    if (S.payroll[u.month]?.rows?.[id]?.status === 'Paid' || !untouched) {
      result.kept.push(name);
      return;
    }
    if (before && before.length === daysIn(u.month)) days[id] = before;
    else delete days[id]; // it did not exist before the upload: it starts again from the calendar
    result.restored++;
  });
  delete S.attendanceImportUndo;
  save();
  return result;
}

/* ---------- screen ---------- */
document
  .querySelector('#tab-attendance .controls')
  .insertAdjacentHTML(
    'beforeend',
    '<button class="btn" type="button" id="attUndoImport" hidden>Undo upload</button><button class="btn primary" type="button" id="attUpload">Upload sheet</button>',
  );
document.body.insertAdjacentHTML(
  'beforeend',
  `<dialog id="attImportDlg" aria-labelledby="aiTitle">
  <div class="mhead"><h3 id="aiTitle">Upload attendance sheet</h3><button class="btn" type="button" data-close="attImportDlg" aria-label="Close">Close</button></div>
  <div class="mbody">
    <p class="ai-help">Excel file (.xlsx or .xls) with Emp Code, Emp Name and day columns 1–31. Nothing is saved until you import.</p>
    <div class="ai-form">
      <label>Attendance sheet<input type="file" id="aiFile" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"></label>
      <label>Sheet (tab)<select id="aiSheet" disabled></select></label>
      <label>Month<input type="month" id="aiMonth"></label>
    </div>
    <label class="ai-check"><input type="checkbox" id="aiCalendar" checked> Keep HRMS weekly offs and holidays where the sheet only says P</label>
    <div id="aiResult" aria-live="polite"></div>
  </div>
  <div class="mfoot"><button class="btn" type="button" data-close="attImportDlg">Cancel</button><button class="btn primary" type="button" id="aiImport" disabled>Import</button></div>
</dialog>`,
);
const ai = { book: null, file: '', plan: null };
// a file problem: show it and forget any earlier preview, so Import can never use an older file
function aiFileError(message) {
  ai.book = null;
  ai.file = '';
  ai.plan = null;
  $('aiSheet').innerHTML = '';
  $('aiSheet').disabled = true;
  $('aiImport').disabled = true;
  $('aiImport').textContent = 'Import';
  $('aiResult').innerHTML = message ? `<div class="ai-error" role="alert">${esc(message)}</div>` : '';
}
const STATUS_LABEL = {
  new: 'Will import',
  update: 'Will update',
  same: 'Unchanged',
  skipped: 'Skipped',
  failed: 'Failed',
};
function aiPreview() {
  const out = $('aiResult'),
    btn = $('aiImport');
  ai.plan = null;
  btn.disabled = true;
  btn.textContent = 'Import';
  if (!ai.book) {
    out.innerHTML = '';
    return;
  }
  const name = $('aiSheet').value,
    ws = ai.book.Sheets[name];
  const sheet = readAttendanceSheet(
    XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }),
    name,
  );
  const plan = (ai.plan = planAttendanceImport(sheet, $('aiMonth').value, {
    useCalendar: $('aiCalendar').checked,
  }));
  if (plan.fatal) {
    out.innerHTML = `<div class="ai-error" role="alert">${esc(plan.fatal)}</div>`;
    return;
  }
  const n = planCounts(plan);
  const warnCount = plan.rows.reduce((s, r) => s + r.warnings.length, 0);
  out.innerHTML = `${plan.notice ? `<div class="ai-notice" role="status">${esc(plan.notice)}</div>` : ''}<div class="ai-cards">
      <div class="ok"><b>${n.ready}</b><span>to import${n.updates ? ` (${n.updates} update existing)` : ''}</span></div>
      <div><b>${n.same}</b><span>already up to date</span></div>
      <div class="sk"><b>${n.skipped}</b><span>skipped</span></div>
      <div class="bad"><b>${n.failed}</b><span>failed</span></div>
    </div>
    <p class="ai-sub">${esc(monthLabel(plan.month))} · ${plan.rows.length} rows read from "${esc(name)}"${warnCount ? ` · ${warnCount} note${warnCount > 1 ? 's' : ''} to check` : ''}</p>
    <div class="ai-tablewrap"><table class="ai-table"><thead><tr><th>Row</th><th>In the sheet</th><th>HRMS employee</th><th>Result</th><th>Details</th></tr></thead><tbody>
    ${plan.rows
      .map(
        (
          r,
        ) => `<tr class="st-${r.status}"><td>${r.row}</td><td>${esc(r.name || '—')}${r.code ? `<small>Code ${esc(r.code)}</small>` : ''}</td>
        <td>${r.e ? `${esc(r.e.name)}<small>${esc(r.e.id)}</small>` : '—'}</td><td><span class="ai-badge">${STATUS_LABEL[r.status]}</span></td>
        <td>${r.messages.map((x) => `<div>${esc(x)}</div>`).join('')}${r.warnings.map((x) => `<div class="w">${esc(x)}</div>`).join('')}</td></tr>`,
      )
      .join('')}
    </tbody></table></div>
    ${plan.notInSheet.length ? `<p class="ai-sub">Not in the sheet (attendance left as it is): ${plan.notInSheet.map((e) => esc(e.name)).join(', ')}.</p>` : ''}`;
  btn.disabled = !n.ready;
  btn.textContent = n.ready ? `Import ${n.ready} employee${n.ready > 1 ? 's' : ''}` : 'Nothing to import';
}
function aiReset() {
  ai.book = null;
  ai.file = '';
  ai.plan = null;
  $('aiFile').value = '';
  $('aiSheet').innerHTML = '';
  $('aiSheet').disabled = true;
  $('aiMonth').value = month;
  aiPreview();
}
$('attUpload').addEventListener('click', () => {
  if (!needXLSX()) return;
  aiReset();
  $('attImportDlg').showModal();
});
$('aiFile').addEventListener('change', async (ev) => {
  const f = ev.target.files[0];
  aiFileError('');
  if (!f) return;
  if (!/\.(xlsx|xls)$/i.test(f.name)) return aiFileError('Choose an Excel file (.xlsx or .xls).');
  let book;
  try {
    book = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true });
  } catch (e) {
    return aiFileError(`The file could not be read as an Excel workbook (${e.message}).`);
  }
  // offer the sheets that look like attendance; pick the one for the selected month, else the last one
  const read = book.SheetNames.map((n) => ({
    n,
    s: readAttendanceSheet(
      XLSX.utils.sheet_to_json(book.Sheets[n], { header: 1, raw: true, defval: null }),
      n,
    ),
  }));
  const usable = read.filter((x) => !x.s.error);
  if (!usable.length) {
    // a sheet that has the header but broken day columns says exactly what is wrong
    const specific = read.find((x) => !/is not an attendance sheet/.test(x.s.error));
    return aiFileError(
      specific
        ? `Sheet "${specific.n}": ${specific.s.error}`
        : 'No sheet in this file has an employee name column and day columns 1–31.',
    );
  }
  ai.book = book;
  ai.file = f.name;
  const pick = usable.find((x) => x.s.detectedMonth === $('aiMonth').value) || usable[usable.length - 1];
  $('aiSheet').innerHTML = usable
    .map(
      (x) =>
        `<option value="${esc(x.n)}" ${x === pick ? 'selected' : ''}>${esc(x.n)}${x.s.detectedMonth ? ' · ' + esc(monthLabel(x.s.detectedMonth)) : ''}</option>`,
    )
    .join('');
  $('aiSheet').disabled = false;
  if (pick.s.detectedMonth) $('aiMonth').value = pick.s.detectedMonth;
  aiPreview();
});
$('aiSheet').addEventListener('change', () => {
  const ws = ai.book && ai.book.Sheets[$('aiSheet').value];
  const s =
    ws &&
    readAttendanceSheet(
      XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }),
      $('aiSheet').value,
    );
  if (s && s.detectedMonth) $('aiMonth').value = s.detectedMonth;
  aiPreview();
});
$('aiMonth').addEventListener('change', aiPreview);
$('aiCalendar').addEventListener('change', aiPreview);
$('aiImport').addEventListener('click', () => {
  const plan = ai.plan;
  if (!plan || plan.fatal) return;
  const n = planCounts(plan);
  if (!n.ready) return;
  const updates = plan.rows.filter((r) => r.status === 'update');
  const msg =
    `Import ${monthLabel(plan.month)} attendance for ${n.ready} employee${n.ready > 1 ? 's' : ''}?` +
    (updates.length
      ? `\n\nThis replaces saved attendance for ${updates.length} employee${updates.length > 1 ? 's' : ''} (${updates.reduce((s, r) => s + r.changes.length, 0)} days change). Salaries recalculate from the new attendance.`
      : '') +
    (n.failed || n.skipped
      ? `\n\n${n.failed} failed and ${n.skipped} skipped row(s) are not imported.`
      : '') +
    '\n\nYou can undo this upload from the Attendance screen.';
  if (!confirm(msg)) return;
  const count = applyAttendancePlan(plan, ai.file);
  $('attImportDlg').close();
  month = plan.month;
  render();
  flash(`Attendance imported for ${count} employee${count > 1 ? 's' : ''} · ${monthLabel(plan.month)}`);
});
$('attUndoImport').addEventListener('click', () => {
  const u = S.attendanceImportUndo;
  if (!u) return;
  if (
    !confirm(
      `Undo the attendance upload of ${monthLabel(u.month)} (${u.file || 'sheet'})? The ${Object.keys(u.prev).length} employee(s) it changed go back to their earlier attendance, except anyone edited or paid since.`,
    )
  )
    return;
  const { restored, kept } = undoAttendanceImport();
  render();
  flash(`Upload undone for ${restored} employee${restored === 1 ? '' : 's'}`);
  if (kept.length)
    alert(`Kept as they are now (edited or marked Paid after the upload): ${kept.join(', ')}.`);
});
afterRender.push(() => {
  const u = S.attendanceImportUndo,
    b = $('attUndoImport');
  b.hidden = !u || u.month !== month;
  if (u) b.title = `Undo the upload of ${u.file || 'the sheet'} (${new Date(u.at).toLocaleString('en-IN')})`;
});
