/* ============================================================
   HOLIDAYS: company holiday list with a year calendar. Public
   holidays are marked H (paid) in attendance for months that are
   not yet paid. Also: greeting and next holiday in the Dashboard header.
   ============================================================ */

/* ---- data ---- */
const HOL_2026 = [
  ['2026-01-14', 'Makar Sankranti / Pongal'],
  ['2026-01-26', 'Republic Day'],
  ['2026-03-04', 'Holi'],
  ['2026-03-26', 'Rama Navami'],
  ['2026-08-15', 'Independence Day'],
  ['2026-08-28', 'Raksha Bandhan'],
  ['2026-09-04', 'Janmashtami'],
  ['2026-09-14', 'Ganesh Chaturthi'],
  ['2026-10-02', 'Gandhi Jayanti'],
  ['2026-10-20', 'Dussehra'],
  ['2026-11-10', 'New Year'],
  ['2026-11-11', 'Bhai Dooj'],
  ['2026-12-25', 'Christmas Day'],
];
const holList = () => {
  if (!Array.isArray(S.holidays)) S.holidays = [];
  return S.holidays;
};
const holSorted = () => [...holList()].sort((a, b) => a.date.localeCompare(b.date));
const dayName = (d) => d.toLocaleDateString('en-IN', { weekday: 'long' });
/* mark (or unmark) a public holiday as H in saved attendance, skipping weekends and months already paid */
function holToAttendance(date, on) {
  const d = parseISO(date);
  if (!d || [0, 6].includes(d.getDay())) return 0;
  const m = date.slice(0, 7),
    A = (S.attendance || {})[m];
  if (!A) return 0;
  let n = 0;
  Object.keys(A).forEach((id) => {
    const row = ((S.payroll[m] || {}).rows || {})[id];
    if (row && row.status === 'Paid') return;
    const a = A[id];
    if (!Array.isArray(a)) return;
    const i = d.getDate() - 1;
    if (on && a[i] === 'P') {
      a[i] = 'H';
      n++;
    } else if (!on && a[i] === 'H') {
      a[i] = 'P';
      n++;
    }
  });
  return n;
}
if (!Array.isArray(S && S.holidays) && S && S.employees) {
  S.holidays = HOL_2026.map(([date, name]) => ({ id: 'h' + date, date, name, type: 'Public' }));
  S.holidays.forEach((h) => holToAttendance(h.date, true));
  save();
}
function nextHoliday() {
  const t = iso(new Date());
  return holSorted().find((h) => h.date >= t && h.type !== 'Optional') || null;
}

/* ---- tab ---- */
document.getElementById('tab-tasks').insertAdjacentHTML(
  'afterend',
  `<section id="tab-holidays" class="hide">
  <div class="hl-head"><div><h2>Holidays</h2><p>Public holidays show as H in attendance.</p></div>
    <div class="hl-year"><button type="button" id="hlPrev" aria-label="Previous year">‹</button><b id="hlYear"></b><button type="button" id="hlNext" aria-label="Next year">›</button></div></div>
  <div class="hl-sum" id="hlSum"></div>
  <div class="hl-grid">
    <div class="hl-card"><h3><span>Holiday list</span><button type="button" class="btn primary" id="hlAddBtn">+ Add holiday</button></h3>
      <div class="hl-form" id="hlForm" hidden><label>Date<input type="date" id="hlDate"></label><label>Type<select id="hlType"><option>Public</option><option>Optional</option></select></label>
        <label class="w">Holiday name<input id="hlName" maxlength="80" placeholder="e.g. Diwali"></label>
        <div class="acts"><button type="button" class="btn" id="hlCancel">Cancel</button><button type="button" class="btn primary" id="hlSave">Save holiday</button></div></div>
      <ul class="hl-list" id="hlList"></ul></div>
    <div class="hl-card"><h3><span>Calendar</span></h3>
      <div class="hl-legend"><span><i style="background:#C2185B"></i>Public holiday</span><span><i style="background:#FDEBF2;border:1px solid #F3B7CC"></i>Optional holiday</span><span><i style="background:#FFF6D6;border:1px solid #F0DE9A"></i>Weekly off (Sat, Sun)</span><span><i style="box-shadow:inset 0 0 0 2px #313180"></i>Today</span></div>
      <div class="hl-cals" id="hlCals"></div></div>
  </div></section>`,
);
addTab('holidays', {
  label: 'Holidays',
  section: 'tab-holidays',
  place: ['nav button[data-tab="leave"]', 'afterend'],
  render: () => renderHolidays(),
});
const showHolidays = (scroll) => showTab('holidays', scroll);
let hlYear = new Date().getFullYear(),
  hlEdit = null;

function renderHolidays() {
  $('hlYear').textContent = hlYear;
  const today = dOnly(new Date()),
    tIso = iso(today),
    list = holSorted().filter((h) => h.date.startsWith(hlYear + '-')),
    nx = nextHoliday();
  const wk = list.filter((h) => {
      const d = parseISO(h.date);
      return ![0, 6].includes(d.getDay());
    }),
    pub = list.filter((h) => h.type !== 'Optional');
  const left = list.filter((h) => h.date >= tIso && h.type !== 'Optional').length;
  $('hlSum').innerHTML =
    (nx
      ? `<div class="next"><b>${esc(nx.name)}</b>Next holiday · ${shortDate(parseISO(nx.date))}, ${esc(dayName(parseISO(nx.date)))} · ${whenTxt(dayDiff(parseISO(nx.date), today)).toLowerCase()}</div>`
      : '') +
    `<div><b>${pub.length}</b>Public holidays in ${hlYear}</div><div><b>${wk.length}</b>Fall on weekdays (paid days off)</div><div><b>${left}</b>Still to come this year</div>`;
  $('hlList').innerHTML = list.length
    ? list
        .map((h) => {
          const d = parseISO(h.date),
            we = [0, 6].includes(d.getDay());
          return `<li class="${h.date < tIso ? 'past' : ''} ${nx && nx.id === h.id ? 'nexth' : ''}"><span class="dtile"><b>${d.getDate()}</b><span>${esc(d.toLocaleDateString('en-IN', { month: 'short' }).slice(0, 3))}</span></span>
      <div class="mid"><div class="nmh">${esc(h.name)}</div><span class="sb">${esc(dayName(d))}${we ? ' · <span class="chip c-amber" style="margin:0">On a weekend</span>' : ''}${h.type === 'Optional' ? ' · <span class="chip c-pink" style="margin:0">Optional</span>' : ''}${h.date >= tIso ? ` · ${whenTxt(dayDiff(d, today))}` : ''}</span></div>
      <button type="button" class="ib" data-hedit="${esc(h.id)}" title="Edit">✎</button><button type="button" class="ib del" data-hdel="${esc(h.id)}" title="Delete">×</button></li>`;
        })
        .join('')
    : `<li style="justify-content:center;color:var(--muted);font-size:13px;padding:20px">No holidays added for ${hlYear} yet. Use "+ Add holiday".</li>`;
  const byDate = {};
  list.forEach((h) => (byDate[h.date] = h));
  let cal = '';
  for (let mo = 0; mo < 12; mo++) {
    const first = new Date(hlYear, mo, 1),
      days = new Date(hlYear, mo + 1, 0).getDate(),
      mh = list.filter((h) => +h.date.slice(5, 7) === mo + 1).length;
    let cells = '<tr>' + '<td></td>'.repeat(first.getDay());
    for (let dd = 1; dd <= days; dd++) {
      const dt = new Date(hlYear, mo, dd),
        wd = dt.getDay(),
        k = iso(dt),
        h = byDate[k];
      const cls = [
        h ? (h.type === 'Optional' ? 'opt' : 'hol') : wd === 0 || wd === 6 ? 'we' : '',
        k === tIso ? 'today' : '',
      ]
        .filter(Boolean)
        .join(' ');
      cells += `<td class="${cls}"${h ? ` title="${esc(h.name)}${h.type === 'Optional' ? ' (optional)' : ''}"` : ''}>${dd}</td>`;
      if (wd === 6 && dd < days) cells += '</tr><tr>';
    }
    cal += `<div class="hl-m"><div class="mt">${esc(first.toLocaleDateString('en-IN', { month: 'long' }))}${mh ? `<span>${mh} holiday${mh > 1 ? 's' : ''}</span>` : ''}</div><table><thead><tr>${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((x) => `<th>${x}</th>`).join('')}</tr></thead><tbody>${cells}</tr></tbody></table></div>`;
  }
  $('hlCals').innerHTML = cal;
}
function hlOpenForm(h) {
  hlEdit = h || null;
  $('hlForm').hidden = false;
  $('hlDate').value = h ? h.date : '';
  $('hlName').value = h ? h.name : '';
  $('hlType').value = h ? h.type || 'Public' : 'Public';
  $('hlSave').textContent = h ? 'Save changes' : 'Save holiday';
  $('hlDate').focus();
}
function hlCloseForm() {
  hlEdit = null;
  $('hlForm').hidden = true;
}
$('hlAddBtn').addEventListener('click', () => hlOpenForm(null));
$('hlCancel').addEventListener('click', hlCloseForm);
$('hlPrev').addEventListener('click', () => {
  hlYear--;
  renderHolidays();
});
$('hlNext').addEventListener('click', () => {
  hlYear++;
  renderHolidays();
});
function hlSave() {
  const date = $('hlDate').value,
    name = $('hlName').value.trim(),
    type = $('hlType').value;
  if (!parseISO(date)) {
    alert('Choose the date.');
    return;
  }
  if (!name) {
    alert('Enter the holiday name.');
    $('hlName').focus();
    return;
  }
  const clash = holList().find((h) => h.date === date && h !== hlEdit);
  if (clash) {
    alert(`${shortDate(parseISO(date))} is already in the list as "${clash.name}".`);
    return;
  }
  if (hlEdit) {
    if (hlEdit.type !== 'Optional') holToAttendance(hlEdit.date, false);
    Object.assign(hlEdit, { date, name, type });
  } else holList().push({ id: 'h' + Date.now().toString(36), date, name, type });
  const n = type !== 'Optional' ? holToAttendance(date, true) : 0;
  save();
  hlYear = +date.slice(0, 4);
  hlCloseForm();
  renderHolidays();
  flash(`Saved ${name}${n ? ` · marked H in attendance for ${n} people` : ''}`);
}
$('hlSave').addEventListener('click', hlSave);
$('hlName').addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    hlSave();
  }
});
$('hlList').addEventListener('click', (ev) => {
  const e = ev.target.closest('[data-hedit]');
  if (e) {
    hlOpenForm(holList().find((h) => h.id === e.dataset.hedit));
    return;
  }
  const d = ev.target.closest('[data-hdel]');
  if (!d) return;
  const h = holList().find((x) => x.id === d.dataset.hdel);
  if (!h) return;
  if (
    !confirm(
      `Delete ${h.name} (${shortDate(parseISO(h.date))})?\n\nUnpaid attendance marked H on that day goes back to Present.`,
    )
  )
    return;
  if (h.type !== 'Optional') holToAttendance(h.date, false);
  S.holidays = holList().filter((x) => x !== h);
  save();
  renderHolidays();
  flash('Holiday deleted');
});

/* ---- Dashboard header: India and US clocks + next holiday ---- */
(() => {
  const head = document.querySelector('#tab-dashboard .dbhead');
  if (!head) return;
  head.classList.add('v2');
  const hello = head.firstElementChild;
  hello.insertAdjacentHTML(
    'beforeend',
    '<button type="button" class="hchip" id="dbNextHol" hidden></button>',
  );
  // the India / US clocks were removed from the header on request (5 Nov 2026): greeting and next holiday stay
})();
const CLOCKS = [
  { k: 'in', code: 'IN', tz: 'Asia/Kolkata', l: 'India · IST' },
  { k: 'us', code: 'US', tz: 'America/Los_Angeles', l: 'San Francisco · PT' },
  { k: 'us', code: 'US', tz: 'America/New_York', l: 'New York · ET' },
];
function tzParts(tz) {
  const f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).formatToParts(new Date()),
    g = (t) => (f.find((p) => p.type === t) || {}).value || '';
  const h24 = +new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(
    new Date(),
  );
  const abbr =
    (
      new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
        .formatToParts(new Date())
        .find((p) => p.type === 'timeZoneName') || {}
    ).value || '';
  return {
    time: `${g('hour')}:${g('minute')}`,
    ap: g('dayPeriod'),
    date: `${g('weekday')}, ${g('day')} ${g('month')}`,
    h24,
    abbr,
  };
}
function renderClocks() {
  const box = $('dbClocks');
  if (box)
    box.innerHTML = CLOCKS.map((c) => {
      const p = tzParts(c.tz),
        night = p.h24 < 6 || p.h24 >= 18;
      return `<div class="clk ${c.k}" title="${esc(c.l)}${p.abbr ? ' (' + esc(p.abbr) + ')' : ''}"><span class="cc">${c.code}</span><div><div class="ct">${p.time}<small>${p.ap}</small><span class="dn">${night ? '☾' : '☀'}</span></div><div class="cl">${esc(c.l.split(' · ')[0])} · ${esc(p.date)}</div></div></div>`;
    }).join('');
  const hi = tzParts('Asia/Kolkata').h24;
  const hel = $('dbHello');
  if (hel) hel.textContent = hi < 12 ? 'Good morning' : hi < 17 ? 'Good afternoon' : 'Good evening';
  const nx = nextHoliday(),
    chip = $('dbNextHol');
  if (chip) {
    if (nx) {
      const d = parseISO(nx.date),
        n = dayDiff(d, dOnly(new Date()));
      chip.hidden = false;
      chip.innerHTML = `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>Next holiday: ${esc(nx.name)} · ${shortDate(d)} (${whenTxt(n).toLowerCase()})`;
    } else chip.hidden = true;
  }
}
setInterval(() => {
  if (isOpen('dashboard')) renderClocks();
}, 20000);
$('dbNextHol').addEventListener('click', () => showHolidays(true));
const renderDashboardBase = renderDashboard;
renderDashboard = function () {
  renderDashboardBase();
  renderClocks();
};
