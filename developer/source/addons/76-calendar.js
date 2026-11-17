/* ============================================================
   PEOPLE CALENDAR (Overview → Calendar)
   One month view of birthdays, work anniversaries, probation
   ends, increments (made and due), joinings, last working days
   and holidays, with an agenda of the next 30 days. Read-only:
   dates come from employee profiles, Increments and Holidays.
   ============================================================ */
const CAL_KINDS = {
  birthday: { l: 'Birthdays', c: 'pink', s: 'Birthday' },
  anniversary: { l: 'Work anniversaries', c: 'violet', s: 'Anniversary' },
  probation: { l: 'Probation ends', c: 'amber', s: 'Probation ends' },
  incdue: { l: 'Increment due', c: 'blue', s: 'Increment due' },
  increment: { l: 'Increments made', c: 'green', s: 'Increment' },
  join: { l: 'Joinings', c: 'green', s: 'Joins' },
  exit: { l: 'Last working days', c: 'red', s: 'Last day' },
  holiday: { l: 'Holidays', c: 'grey' },
};
let calMonth = currentMonth(),
  calShow = new Set(Object.keys(CAL_KINDS));

document.getElementById('tab-settings').insertAdjacentHTML(
  'beforebegin',
  `<section id="tab-calendar" class="hide">
  <div class="top"><div><h2>Calendar</h2><p>Birthdays, anniversaries, probation, increments and holidays.</p></div>
    <div class="controls"><button class="btn" type="button" id="calPrev" aria-label="Previous month">‹</button><b id="calLabel"></b><button class="btn" type="button" id="calNext" aria-label="Next month">›</button><button class="btn" type="button" id="calToday">This month</button></div></div>
  <div class="cal-filters" id="calFilters"></div>
  <div class="cal-wrap"><div class="cal-grid" id="calGrid"></div><aside class="cal-agenda" id="calAgenda"></aside></div>
</section>`,
);
addTab('calendar', {
  label: 'Calendar',
  section: 'tab-calendar',
  place: ['#navTasks', 'afterend'],
  render: () => renderCalendar(),
});

// every event that falls in month m (YYYY-MM)
function calEvents(m) {
  const [y, mo] = ym(m),
    out = [];
  const inMonth = (d) => d && d.slice(0, 7) === m;
  const sameDay = (isoD) => {
    // this year's date of a yearly event (29 Feb → 28 Feb in other years)
    const md = String(isoD || '').slice(5);
    if (!/^\d{2}-\d{2}$/.test(md) || Number(md.slice(0, 2)) !== mo) return '';
    const day = Math.min(Number(md.slice(3)), daysIn(m));
    return `${m}-${String(day).padStart(2, '0')}`;
  };
  const people = S.employees.filter(
    (e) => e.status === 'Active' || (e.lastDay && e.lastDay.slice(0, 7) >= m),
  );
  for (const e of people) {
    const b = sameDay(e.dob);
    if (b) out.push({ date: b, kind: 'birthday', e, t: 'Birthday' });
    const j = sameDay(e.joining),
      years = e.joining ? y - Number(e.joining.slice(0, 4)) : 0;
    if (j && years >= 1)
      out.push({ date: j, kind: 'anniversary', e, t: `${years} year${years > 1 ? 's' : ''} at Acme Labs` });
    if (inMonth(e.joining)) out.push({ date: e.joining, kind: 'join', e, t: 'Joins' });
    if (inMonth(e.lastDay)) out.push({ date: e.lastDay, kind: 'exit', e, t: 'Last working day' });
    if (e.joining && e.status === 'Active') {
      const pe = addMonthsISO(e.joining, 3);
      if (inMonth(pe) && !hasConfirmation(e))
        out.push({ date: pe, kind: 'probation', e, t: 'Probation ends' });
      // increment due a year after the last increment (or after joining)
      const last = (S.increments || [])
        .filter((r) => r.empId === e.id)
        .map((r) => r.date)
        .sort()
        .pop();
      const due = addMonthsISO(last || e.joining, 12);
      if (inMonth(due))
        out.push({
          date: due,
          kind: 'incdue',
          e,
          t: last ? 'A year since the last increment' : 'A year since joining',
        });
    }
  }
  (S.increments || [])
    .filter((r) => inMonth(r.date))
    .forEach((r) => {
      const e = S.employees.find((x) => x.id === r.empId);
      if (e)
        out.push({ date: r.date, kind: 'increment', e, t: `Increment to ${money(r.newSalary, e.currency)}` });
    });
  (S.holidays || [])
    .filter((h) => inMonth(h.date))
    .forEach((h) =>
      out.push({ date: h.date, kind: 'holiday', t: h.name + (h.type === 'Optional' ? ' (optional)' : '') }),
    );
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
}
function renderCalendar() {
  const m = calMonth,
    [y, mo] = ym(m),
    today = todayISO();
  $('calLabel').textContent = monthLabel(m);
  const all = calEvents(m),
    shown = all.filter((x) => calShow.has(x.kind));
  $('calFilters').innerHTML = Object.entries(CAL_KINDS)
    .map(
      ([k, v]) =>
        `<button type="button" class="cal-chip c-${v.c} ${calShow.has(k) ? 'on' : ''}" data-cal-kind="${k}" aria-pressed="${calShow.has(k)}">${esc(v.l)} <b>${all.filter((x) => x.kind === k).length}</b></button>`,
    )
    .join('');
  const first = new Date(y, mo - 1, 1).getDay(),
    days = daysIn(m);
  let h = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    .map((d) => `<div class="cal-dow">${d}</div>`)
    .join('');
  for (let i = 0; i < first; i++) h += '<div class="cal-day blank"></div>';
  for (let d = 1; d <= days; d++) {
    const date = `${m}-${String(d).padStart(2, '0')}`,
      wd = new Date(y, mo - 1, d).getDay(),
      list = shown.filter((x) => x.date === date);
    h += `<div class="cal-day${wd === 0 || wd === 6 ? ' we' : ''}${date === today ? ' today' : ''}"><span class="cal-n">${d}</span>${list
      .slice(0, 4)
      .map(
        (x) =>
          `<button type="button" class="cal-ev c-${CAL_KINDS[x.kind].c}" ${x.e ? `data-cal-prof="${x.e.id}"` : 'disabled'} title="${esc((x.e ? fullName(x.e) + (fullName(x.e) !== x.e.name ? ' (' + x.e.name + ')' : '') + ' · ' : '') + x.t)}">${esc(x.e ? fullName(x.e) : x.t)}${x.e && CAL_KINDS[x.kind].s ? `<small>${CAL_KINDS[x.kind].s}</small>` : ''}</button>`,
      )
      .join('')}${list.length > 4 ? `<span class="cal-more">+${list.length - 4} more</span>` : ''}</div>`;
  }
  $('calGrid').innerHTML = h;
  // agenda: this month's list, or the next 30 days when this is the current month
  const isNow = m === currentMonth();
  let agenda = shown;
  if (isNow) {
    const next = (() => {
      const d = new Date(y, mo, 1);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    })();
    const limit = iso(new Date(Date.now() + 30 * 864e5));
    agenda = shown
      .concat(calEvents(next).filter((x) => calShow.has(x.kind)))
      .filter((x) => x.date >= today && x.date <= limit);
  }
  $('calAgenda').innerHTML =
    `<h4>${isNow ? 'Next 30 days' : 'In ' + esc(monthLabel(m))}</h4>` +
    (agenda.length
      ? `<ul>${agenda
          .map(
            (x) =>
              `<li><span class="cal-dot c-${CAL_KINDS[x.kind].c}"></span><div>${x.e ? `<button type="button" class="linkish" data-cal-prof="${x.e.id}">${esc(x.e.name)}</button>` : `<b>${esc(x.t)}</b>`}<small>${x.e ? esc(x.t) + ' · ' : ''}${fmtLong(x.date)}</small></div></li>`,
          )
          .join('')}</ul>`
      : '<p class="idc">Nothing in this period.</p>');
}
const calShift = (n) => {
  const [y, mo] = ym(calMonth),
    d = new Date(y, mo - 1 + n, 1);
  calMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  renderCalendar();
};
$('calPrev').addEventListener('click', () => calShift(-1));
$('calNext').addEventListener('click', () => calShift(1));
$('calToday').addEventListener('click', () => {
  calMonth = currentMonth();
  renderCalendar();
});
$('tab-calendar').addEventListener('click', (ev) => {
  const k = ev.target.closest('[data-cal-kind]');
  if (k) {
    calShow.has(k.dataset.calKind) ? calShow.delete(k.dataset.calKind) : calShow.add(k.dataset.calKind);
    return renderCalendar();
  }
  const p = ev.target.closest('[data-cal-prof]');
  if (p) openEmployeeProfile(p.dataset.calProf);
});

// read-only helpers for the automated tests
window.HRMS_TEST = Object.assign(window.HRMS_TEST || {}, { calEvents });
