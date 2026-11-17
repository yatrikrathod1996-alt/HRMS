/* Dashboard header: one short line of motivation each time the HRMS opens (never the same as last time).
   The lines are our own, written for the team; ↻ shows another. Kept to two lines at most. */
const QUOTES = [
  'Small steps every day build the biggest models.',
  'Ship it, learn from it, make it better tomorrow.',
  'Hard work is the prompt. Results are the output.',
  'Great teams are built one honest day at a time.',
  'Progress beats perfection. Keep the pixels moving.',
  'Every bug fixed today is a smoother day tomorrow.',
  'Focus on what you can improve, and improve it a little today.',
  'Big ideas need steady hands. Be the steady hands.',
  'The best time to start was yesterday. The next best is now.',
  'Do the hard thing first. The rest of the day gets easier.',
  'Consistency turns good work into great work.',
  'Your effort today trains the version of you that wins tomorrow.',
  'Done with care is better than done in a rush.',
  'Keep learning. Every model starts with a first epoch.',
  'Celebrate small wins. They add up faster than you think.',
  'Clear goals, honest effort, kind words. That is a good day.',
  'One more try is often the one that works.',
  'Hard work compounds, just like good data.',
  'Stay curious. Today’s question is tomorrow’s feature.',
  'Help a teammate today. Strong teams lift together.',
  'Discipline is choosing what you want most over what you want now.',
  'Make it work, make it right, then make it fast.',
  'Your future self is watching. Give them something to be proud of.',
  'Energy flows where attention goes. Spend it on what matters.',
  'Quality is a habit, not a one-time act.',
  'Dream in pixels, deliver in production.',
  'Slow progress is still progress. Keep going.',
  'Show up, do the work, and let the results speak.',
  'Every expert was once a beginner who didn’t quit.',
  'Build something today that makes tomorrow easier.',
];
const QUOTE_KEY = 'acmelabs_hrms_quote';
let quoteNow = (() => {
  let last = -1;
  try { last = +localStorage.getItem(QUOTE_KEY); } catch (e) {}
  let i = Math.floor(Math.random() * QUOTES.length);
  if (i === last) i = (i + 1) % QUOTES.length;
  try { localStorage.setItem(QUOTE_KEY, String(i)); } catch (e) {}
  return i;
})();
function paintQuote() {
  const head = document.querySelector('#tab-dashboard .dbhead > div');
  if (!head) return;
  let q = $('dbQuote');
  if (!q) {
    q = document.createElement('p');
    q.id = 'dbQuote';
    q.className = 'db-quote';
    head.appendChild(q);
  }
  q.innerHTML = `<span class="dq-mark">“</span><span class="dq-t">${esc(QUOTES[quoteNow])}</span><button type="button" class="dq-next" title="Show another" aria-label="Show another line">↻</button>`;
}
document.addEventListener('click', (ev) => {
  if (!ev.target.closest('#dbQuote .dq-next')) return;
  quoteNow = (quoteNow + 1 + Math.floor(Math.random() * (QUOTES.length - 1))) % QUOTES.length;
  try { localStorage.setItem(QUOTE_KEY, String(quoteNow)); } catch (e) {}
  paintQuote();
  const t = document.querySelector('#dbQuote .dq-t');
  if (t) t.classList.add('dq-in');
});
const dqOrigDashboard = renderDashboard;
renderDashboard = function () {
  dqOrigDashboard();
  paintQuote();
};
window.HRMS_QUOTE = { list: QUOTES, now: () => QUOTES[quoteNow] }; // used by the tests
