/* ============================================================
   TEAM STATUS (Dashboard card, called from 30-dashboard.js)
   One row per department for the month on the Dashboard:
   people, who is in / on leave / away today, leave and absence
   days this month, leave used this year and net pay. Read-only:
   it never creates attendance.
   ============================================================ */
const TEAM_LEAVE = ['PL', 'SL', 'CL'];
function teamStatusCard(m) {
  const people = empsIn(m),
    cm = currentMonth(),
    dayIdx = m === cm ? new Date().getDate() - 1 : -1;
  const read = (e) => {
    const a = S.attendance[m]?.[e.id];
    return a && a.length === daysIn(m) ? a : defaultAttendance(m, e);
  };
  const teams = {};
  const away = [];
  for (const e of people) {
    const k = e.department || 'Unassigned',
      t = (teams[k] = teams[k] || {
        k,
        n: 0,
        inToday: 0,
        leaveToday: 0,
        offToday: 0,
        leave: 0,
        hd: 0,
        abs: 0,
        yearLeave: 0,
        net: 0,
      });
    const a = read(e),
      c = counts(a);
    t.n++;
    t.leave += c.PL + c.SL + c.CL;
    t.hd += c.HD;
    const [yy, mm] = ym(m),
      outside = a.filter((x, i) => x === 'A' && !workingOn(e, iso(new Date(yy, mm - 1, i + 1)))).length;
    t.abs += c.A - outside + c.UP; // days before joining or after leaving are not absence
    const u = usedThrough(e, m);
    t.yearLeave += u.PL + u.SL + u.CL;
    try {
      t.net += previewPayroll(e, m).net;
    } catch (err) {
      /* a profile without pay details: leave it out of the total */
    }
    if (dayIdx >= 0) {
      const code = a[dayIdx];
      if (code === 'P' || code === 'WFH') t.inToday++;
      else if (code === 'WO' || code === 'H') t.offToday++;
      else {
        if (TEAM_LEAVE.includes(code)) t.leaveToday++;
        away.push({ e, code });
      }
    }
  }
  const rows = Object.values(teams).sort((a, b) => b.n - a.n || a.k.localeCompare(b.k));
  const tot = rows.reduce(
    (s, t) => {
      Object.keys(s).forEach((k) => (s[k] += t[k]));
      return s;
    },
    { n: 0, inToday: 0, leaveToday: 0, offToday: 0, leave: 0, hd: 0, abs: 0, yearLeave: 0, net: 0 },
  );
  const today = dayIdx >= 0;
  const badge = (n, cls) => `<span class="cntp ${n ? cls : 'zero'}">${n}</span>`;
  const head = `<th>Team</th><th class="num">People</th>${today ? '<th class="num">In today</th><th class="num">On leave today</th>' : ''}<th class="num">Leave days</th><th class="num">Half days</th><th class="num">Absent / unpaid</th><th class="num">Leave used this year</th><th class="num">Net pay</th>`;
  const line = (t, label) =>
    `<td>${label}</td><td class="num">${t.n}</td>${today ? `<td class="num">${t.inToday}</td><td class="num">${badge(t.leaveToday, 'green')}</td>` : ''}<td class="num">${badge(t.leave, 'green')}</td><td class="num">${badge(t.hd, 'amber')}</td><td class="num">${badge(t.abs, 'red')}</td><td class="num">${r2(t.yearLeave)}</td><td class="num">${inr0(r2(t.net))}</td>`;
  return `<div class="dbc full"><div class="ch"><h3>${icon('users', 'green')}Team status · ${esc(monthLabel(m))}</h3>
    <button type="button" class="more" data-go="attendance">Attendance →</button></div>
    ${today ? `<p class="cs">${away.length ? 'Away today: ' + away.map((x) => `${esc(x.e.name)} (${esc(CODE_NAMES[x.code] || x.code || 'not marked')})`).join(', ') : 'Everyone working today is marked present.'}</p>` : ''}
    ${rows.length ? `<div class="tw"><table class="dtab team-tab"><thead><tr>${head}</tr></thead><tbody>${rows.map((t) => `<tr>${line(t, esc(t.k))}</tr>`).join('')}</tbody><tfoot><tr>${line(tot, 'All teams')}</tr></tfoot></table></div>` : '<p class="none">No one on payroll this month.</p>'}
  </div>`;
}
