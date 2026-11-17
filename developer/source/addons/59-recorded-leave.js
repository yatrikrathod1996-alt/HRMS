/* Approved leave taken from HR email, added to attendance once.
   A day is changed only while it is still a normal working day (P or blank), so a
   weekly off (unless the sheet marks leave on it: anyDay), a holiday or anything HR already marked by hand is left alone. */
const RECORDED_LEAVE = [
  { key: 'lv-ML-011-2026-10', empId: 'ML-011', code: 'PL', dates: ['2026-10-14', '2026-10-15'], note: 'Family function (demo)' },
  { key: 'lv-ML-010-2026-12', empId: 'ML-010', code: 'PL', dates: ['2026-12-02', '2026-12-03', '2026-12-04'], note: 'Approved in advance (demo)' },
];

function applyRecordedLeave() {
  S.recordedLeave = Array.isArray(S.recordedLeave) ? S.recordedLeave : [];
  let changed = false;
  for (const x of RECORDED_LEAVE) {
    if (S.recordedLeave.includes(x.key)) continue;
    S.recordedLeave.push(x.key);
    changed = true;
    const e = empOf(x.empId);
    if (!e) continue;
    for (const d of x.dates) {
      const a = attFor(d.slice(0, 7), e),
        i = Number(d.slice(8)) - 1;
      if (a[i] === 'P' || !a[i] || (x.anyDay && a[i] === 'WO')) a[i] = x.code;
    }
  }
  if (changed) save();
  return changed;
}
applyRecordedLeave();
// a data file connected later (or a restored backup) gets the same one-time update
afterRender.push(() => {
  if (!RECORDED_LEAVE.every((x) => (S.recordedLeave || []).includes(x.key)) && applyRecordedLeave()) render();
});
