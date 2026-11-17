/* ============================================================
   WISHES: birthdays and work anniversaries.
   On the dashboard every birthday / anniversary in Upcoming events
   gets a "Wish" button, and the header shows today's ones. The wish
   window makes a Acme Labs greeting card (picture) and a message,
   ready to copy, download, email or send on WhatsApp. Wishes sent are
   remembered (S.wishes) so the button shows "Wished ✓".
   The lines are written for the team; ↻ gives another.
   ============================================================ */
const WISH_LINES = {
  bday: [
    'Happy birthday, {first}! Wishing you a year full of good health, big wins and great moments with the people you love.',
    'Happy birthday, {first}! Thank you for everything you bring to the team. Have a wonderful day and an even better year ahead.',
    'Many happy returns of the day, {first}! May this year bring you new adventures, success and lots of reasons to smile.',
    'Happy birthday, {first}! Take today off from worrying about deadlines and enjoy every minute. The whole Acme Labs team is cheering for you.',
    'Wishing you the happiest of birthdays, {first}! Here is to another year of learning, growing and having fun together.',
    'Happy birthday, {first}! May your year be as bright as your ideas and as smooth as a perfect render.',
  ],
  anniv: [
    'Happy {nth} work anniversary, {first}! Thank you for {years} of hard work, ideas and energy. Acme Labs is better because you are here.',
    'Congratulations on {years} with Acme Labs, {first}! Your dedication makes a real difference every day. Here is to many more milestones together.',
    'Cheers to {years}, {first}! Thank you for growing with us and for everything you have built along the way.',
    'Happy work anniversary, {first}! {Years} of great work deserves a big celebration. Thank you for being such an important part of the team.',
    'Today marks {years} since you joined us, {first}. Thank you for your commitment and for making Acme Labs a great place to work.',
  ],
};
const WISH_TITLES = { bday: (e) => `Happy Birthday, ${wFirst(e)}!`, anniv: (e, y) => `Happy ${wOrd(y)} Work Anniversary, ${wFirst(e)}!` };
const wFirst = (e) => fullName(e).split(' ')[0];
const wOrd = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const wYears = (y) => `${y} year${y === 1 ? '' : 's'}`;
let wishNow = null; // {e, k, y, d, line}
const wishKey = (w) => `${w.e.id}-${w.k}-${w.d.getFullYear()}`;
const wishList = () => (S.wishes = S.wishes && typeof S.wishes === 'object' ? S.wishes : {});

function wishText(w) {
  return WISH_LINES[w.k][w.line % WISH_LINES[w.k].length]
    .replace(/\{first\}/g, wFirst(w.e))
    .replace(/\{nth\}/g, wOrd(w.y || 1))
    .replace(/\{years\}/g, wYears(w.y || 1))
    .replace(/\{Years\}/g, wYears(w.y || 1).replace(/^./, (c) => c.toUpperCase()));
}

/* ---------- the greeting card (1200 × 675 picture) ---------- */
let wishLogo = null;
function wishCard(w) {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 675;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(840, 120, 40, 700, 300, 900);
  g.addColorStop(0, '#2a2470');
  g.addColorStop(0.45, '#121636');
  g.addColorStop(1, '#070a1f');
  x.fillStyle = g;
  x.fillRect(0, 0, 1200, 675);
  // stars and streaks
  const rnd = (() => { let s = w.e.id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 7); return () => ((s = (s * 9301 + 49297) % 233280) / 233280); })();
  for (let i = 0; i < 160; i++) {
    x.fillStyle = `rgba(${rnd() < 0.3 ? '185,168,255' : '223,230,255'},${(0.25 + rnd() * 0.6).toFixed(2)})`;
    const r = rnd() < 0.1 ? 2 : 1;
    x.fillRect(rnd() * 1200, rnd() * 675, r, r);
  }
  x.lineCap = 'round';
  for (let i = 0; i < 28; i++) {
    const a = rnd() * Math.PI * 2, r0 = 140 + rnd() * 260, len = 30 + rnd() * 90;
    x.strokeStyle = `rgba(143,176,255,${(0.08 + rnd() * 0.22).toFixed(2)})`;
    x.lineWidth = 1.5;
    x.beginPath();
    x.moveTo(900 + Math.cos(a) * r0, 300 + Math.sin(a) * r0);
    x.lineTo(900 + Math.cos(a) * (r0 + len), 300 + Math.sin(a) * (r0 + len));
    x.stroke();
  }
  // confetti in the brand colours
  const conf = ['#5b8cff', '#8a5cff', '#ff7aa8', '#f5b557', '#5fd08b'];
  for (let i = 0; i < 70; i++) {
    x.save();
    x.translate(rnd() * 1200, rnd() * 260);
    x.rotate(rnd() * Math.PI);
    x.fillStyle = conf[i % conf.length];
    x.globalAlpha = 0.85;
    x.fillRect(-6, -2.5, 12, 5);
    x.restore();
  }
  // the Acme Labs mark
  const sq = (px, py, s, col, a = 1) => {
    x.globalAlpha = a;
    x.fillStyle = col;
    x.beginPath();
    x.roundRect ? x.roundRect(px, py, s, s, s * 0.26) : x.rect(px, py, s, s);
    x.fill();
    x.globalAlpha = 1;
  };
  sq(80, 70, 30, '#4074dc'); sq(116, 70, 30, '#6b6be0'); sq(80, 106, 30, '#6b6be0'); sq(116, 106, 30, '#4074dc'); sq(98, 88, 30, '#ffffff', 0.28);
  x.font = '700 40px "Space Grotesk", system-ui, sans-serif';
  x.fillStyle = '#ffffff';
  x.fillText('Models', 166, 122);
  const mw = x.measureText('Models').width;
  x.fillStyle = '#7da2ff';
  x.fillText('Lab', 166 + mw, 122);
  // headline
  x.fillStyle = '#ffffff';
  x.font = '700 62px "Space Grotesk", system-ui, sans-serif';
  const title = WISH_TITLES[w.k](w.e, w.y || 1);
  const words = title.split(' '), lines = [];
  let ln = '';
  words.forEach((wd) => {
    const t = ln ? ln + ' ' + wd : wd;
    if (x.measureText(t).width > 1000 && ln) { lines.push(ln); ln = wd; } else ln = t;
  });
  lines.push(ln);
  lines.forEach((l, i) => x.fillText(l, 80, 300 + i * 74));
  // message
  x.font = '400 28px "Space Grotesk", system-ui, sans-serif';
  x.fillStyle = '#c9d4ff';
  const msg = wishText(w), mwords = msg.split(' '), mlines = [];
  ln = '';
  mwords.forEach((wd) => {
    const t = ln ? ln + ' ' + wd : wd;
    if (x.measureText(t).width > 980 && ln) { mlines.push(ln); ln = wd; } else ln = t;
  });
  mlines.push(ln);
  const top = 300 + lines.length * 74 + 16;
  mlines.slice(0, 4).forEach((l, i) => x.fillText(l, 80, top + i * 40));
  x.font = '600 22px "Space Grotesk", system-ui, sans-serif';
  x.fillStyle = '#8fa6ff';
  x.fillText('— With love, the Acme Labs team', 80, 620);
  return c;
}

/* ---------- the wish window ---------- */
document.body.insertAdjacentHTML(
  'beforeend',
  `<dialog id="wishDlg" aria-labelledby="wishTitle"><div class="mhead"><h3 id="wishTitle">Send a wish</h3><button class="btn" type="button" data-close="wishDlg">Close</button></div>
  <div class="mbody wish-body"><div class="wish-pic"><img id="wishImg" alt="Greeting card"></div>
    <label class="wish-msg">Message <textarea id="wishText" rows="4"></textarea></label>
    <div class="wish-acts"><button type="button" class="btn" id="wishAnother">↻ Another message</button><button type="button" class="btn" id="wishCopy">Copy message</button><button type="button" class="btn" id="wishCopyImg">Copy card</button><button type="button" class="btn" id="wishPng">Download card</button><a class="btn" id="wishMail" target="_blank" rel="noopener">Email</a><a class="btn" id="wishWa" target="_blank" rel="noopener">WhatsApp</a></div>
    <p class="wish-note" id="wishNote"></p></div>
  <div class="mfoot"><button class="btn" type="button" data-close="wishDlg">Later</button><button class="btn primary" type="button" id="wishDone">Mark as wished</button></div></dialog>`,
);
document.querySelectorAll('[data-close="wishDlg"]').forEach((b) => b.addEventListener('click', () => $('wishDlg').close()));
function wishPaint() {
  const w = wishNow;
  if (!w) return;
  $('wishTitle').textContent = w.k === 'bday' ? `Birthday wish for ${fullName(w.e)}` : `Work anniversary wish for ${fullName(w.e)} (${wYears(w.y || 1)})`;
  if (!w.custom) $('wishText').value = wishText(w);
  $('wishImg').src = wishCard({ ...w }).toDataURL('image/png');
  const subject = w.k === 'bday' ? `Happy birthday, ${wFirst(w.e)}!` : `Happy work anniversary, ${wFirst(w.e)}!`;
  const body = $('wishText').value;
  const mail = $('wishMail'), wa = $('wishWa');
  mail.href = `mailto:${encodeURIComponent(w.e.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const phone = String(w.e.phone || '').replace(/\D/g, '');
  const ph = phone.length === 10 ? '91' + phone : phone;
  wa.href = `https://wa.me/${ph}?text=${encodeURIComponent(body)}`;
  $('wishNote').textContent = [w.e.email ? '' : 'No email on the profile: Email opens without a recipient.', phone ? '' : 'No phone on the profile: WhatsApp lets you pick the chat.'].filter(Boolean).join(' ');
  const done = wishList()[wishKey(w)];
  $('wishDone').textContent = done ? `Wished on ${parseISO(done).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ✓` : 'Mark as wished';
}
function openWish(e, k, y, d) {
  wishNow = { e, k, y, d: d || dOnly(new Date()), line: Math.floor(Math.random() * WISH_LINES[k].length), custom: false };
  wishPaint();
  $('wishDlg').showModal();
}
$('wishText').addEventListener('input', () => {
  wishNow.custom = true;
  const body = $('wishText').value;
  $('wishMail').href = $('wishMail').href.replace(/&body=.*$/, '&body=' + encodeURIComponent(body));
  $('wishWa').href = $('wishWa').href.replace(/\?text=.*$/, '?text=' + encodeURIComponent(body));
});
document.addEventListener('click', async (ev) => {
  const btn = ev.target.closest('[data-wish]');
  if (btn) {
    const [id, k, y, iso] = btn.dataset.wish.split('|');
    const e = S.employees.find((x) => x.id === id);
    if (e) openWish(e, k, Number(y) || 0, parseISO(iso));
    return;
  }
  if (!wishNow || !ev.target.closest('#wishDlg')) return;
  if (ev.target.closest('#wishAnother')) {
    wishNow.line++;
    wishNow.custom = false;
    wishPaint();
  } else if (ev.target.closest('#wishCopy')) {
    try {
      await navigator.clipboard.writeText($('wishText').value);
      flash('Message copied');
    } catch (e) {
      $('wishText').select();
      flash('Press Ctrl+C to copy');
    }
  } else if (ev.target.closest('#wishCopyImg')) {
    try {
      const blob = await new Promise((r) => wishCard(wishNow).toBlob(r, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      flash('Card copied: paste it into a chat');
    } catch (e) {
      flash('This browser cannot copy pictures: use Download card');
    }
  } else if (ev.target.closest('#wishPng')) {
    const a = document.createElement('a');
    a.href = wishCard(wishNow).toDataURL('image/png');
    a.download = `${fullName(wishNow.e)} ${wishNow.k === 'bday' ? 'birthday' : 'work anniversary'}.png`;
    a.click();
  } else if (ev.target.closest('#wishDone')) {
    const d = dOnly(new Date());
    wishList()[wishKey(wishNow)] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    save();
    $('wishDlg').close();
    flash('Marked as wished');
    if (isOpen('dashboard')) renderDashboard();
  }
});

/* ---------- dashboard: buttons on events, and today's chip ---------- */
function wishDecorate() {
  const ul = document.querySelector('#dbBody .d2-events');
  const today = dOnly(new Date());
  const evs = upcomingEvents(activeNow(), today);
  if (ul) {
    const lis = [...ul.children];
    evs.slice(0, lis.length).forEach((x, i) => {
      if ((x.k !== 'bday' && x.k !== 'anniv') || !x.e || lis[i].querySelector('[data-wish]')) return;
      const y = x.k === 'anniv' ? Number((x.t.match(/(\d+)\s*yr/) || [])[1]) || 1 : 0;
      const w = { e: x.e, k: x.k, d: x.d };
      const done = wishList()[wishKey(w)];
      const iso = `${x.d.getFullYear()}-${String(x.d.getMonth() + 1).padStart(2, '0')}-${String(x.d.getDate()).padStart(2, '0')}`;
      lis[i].insertAdjacentHTML('beforeend', `<button type="button" class="wish-btn${done ? ' done' : ''}" data-wish="${esc(x.e.id)}|${x.k}|${y}|${iso}" title="${done ? 'Wished' : 'Send a wish'}">${done ? 'Wished ✓' : 'Wish 🎉'}</button>`);
    });
  }
  // today's birthdays and anniversaries in the header
  const head = document.querySelector('#tab-dashboard .dbhead > div');
  if (!head) return;
  $('wishChip')?.remove();
  const todays = evs.filter((x) => (x.k === 'bday' || x.k === 'anniv') && x.n === 0 && x.e && !wishList()[wishKey({ e: x.e, k: x.k, d: x.d })]);
  if (!todays.length) return;
  const x = todays[0];
  const y = x.k === 'anniv' ? Number((x.t.match(/(\d+)\s*yr/) || [])[1]) || 1 : 0;
  const label = `${x.k === 'bday' ? '🎂' : '🏆'} Today: ${fullName(x.e)}'s ${x.k === 'bday' ? 'birthday' : `${wOrd(y)} work anniversary`}${todays.length > 1 ? ` +${todays.length - 1} more` : ''} · Send a wish`;
  const iso = `${x.d.getFullYear()}-${String(x.d.getMonth() + 1).padStart(2, '0')}-${String(x.d.getDate()).padStart(2, '0')}`;
  const q = $('dbQuote');
  const html = `<button type="button" class="wish-chip" id="wishChip" data-wish="${esc(x.e.id)}|${x.k}|${y}|${iso}">${esc(label)}</button>`;
  q ? q.insertAdjacentHTML('beforebegin', html) : head.insertAdjacentHTML('beforeend', html);
}
const wOrigDashboard = renderDashboard;
renderDashboard = function () {
  wOrigDashboard();
  wishDecorate();
};
window.HRMS_WISH = { open: openWish, text: wishText, card: wishCard, lines: WISH_LINES, events: () => upcomingEvents(activeNow(), dOnly(new Date())).map((x) => ({ k: x.k, n: x.n, id: x.e && x.e.id, key: x.e ? wishKey({ e: x.e, k: x.k, d: x.d }) : '', wished: x.e ? !!wishList()[wishKey({ e: x.e, k: x.k, d: x.d })] : null })) }; // used by the tests
