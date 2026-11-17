/* ============================================================
   HIDE AMOUNTS: money is blurred until you press the eye button
   (or click one amount to see just that one). Letters, payslip
   PDFs and Excel downloads always contain the real figures.
   ============================================================ */
const EYE =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="M2 2l20 20"/></svg>';
const eyeBtn = document.createElement('button');
eyeBtn.type = 'button';
eyeBtn.id = 'navEye';
$('navDashboard').insertAdjacentElement('beforebegin', eyeBtn);
function setMoneyHidden(h) {
  document.body.classList.toggle('hide-money', h);
  eyeBtn.innerHTML = h ? `${EYE}<span>Show amounts</span>` : `${EYE_OFF}<span>Hide amounts</span>`;
  eyeBtn.classList.toggle('on', !h);
  eyeBtn.setAttribute('aria-pressed', String(!h));
  eyeBtn.title = h ? 'Amounts are hidden. Click to show them.' : 'Click to hide all amounts again.';
  if (h) document.querySelectorAll('.amt-mask.show').forEach((x) => x.classList.remove('show'));
}
eyeBtn.addEventListener('click', () => setMoneyHidden(!document.body.classList.contains('hide-money')));
setMoneyHidden(false); // amounts are visible; the eye button hides them when you want privacy
/* wrap every ₹ / $ amount shown on screen in a span that can be blurred */
const MONEY_RE = /(?:[−-]\s?)?[₹$]\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:L|K|Cr|M)\b)?/g;
const SKIP = 'script,style,textarea,input,select,option,.a4,.pages,.lbody,.paper,.amt-mask,#incxDlg .ix-form';
function maskIn(root) {
  if (!root || (root.nodeType !== 1 && root.nodeType !== 3)) return;
  const el = root.nodeType === 3 ? root.parentElement : root;
  if (!el || el.closest(SKIP)) return;
  const tw = document.createTreeWalker(root.nodeType === 3 ? el : root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      MONEY_RE.lastIndex = 0;
      return MONEY_RE.test(n.nodeValue) && !(n.parentElement && n.parentElement.closest(SKIP))
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });
  const list = [];
  while (tw.nextNode()) list.push(tw.currentNode);
  list.forEach((n) => {
    const t = n.nodeValue,
      f = document.createDocumentFragment();
    let last = 0;
    MONEY_RE.lastIndex = 0;
    let mm;
    while ((mm = MONEY_RE.exec(t))) {
      if (mm.index > last) f.appendChild(document.createTextNode(t.slice(last, mm.index)));
      const s = document.createElement('span');
      s.className = 'amt-mask';
      s.textContent = mm[0];
      f.appendChild(s);
      last = mm.index + mm[0].length;
    }
    if (last < t.length) f.appendChild(document.createTextNode(t.slice(last)));
    n.parentNode.replaceChild(f, n);
  });
}
let maskQ = new Set(),
  maskT = 0;
const mo = new MutationObserver((ms) => {
  ms.forEach((m) => {
    if (m.type === 'characterData') maskQ.add(m.target);
    else m.addedNodes.forEach((n) => maskQ.add(n));
  });
  if (!maskT)
    maskT = requestAnimationFrame(() => {
      maskT = 0;
      const q = [...maskQ];
      maskQ.clear();
      q.forEach((n) => {
        if (n.isConnected) maskIn(n);
      });
    });
});
mo.observe(document.body, { childList: true, subtree: true, characterData: true });
maskIn(document.body);
/* clicking one blurred amount shows just that amount */
document.addEventListener(
  'click',
  (ev) => {
    if (!document.body.classList.contains('hide-money')) return;
    const s = ev.target.closest && ev.target.closest('.amt-mask:not(.show)');
    if (!s) return;
    ev.preventDefault();
    ev.stopPropagation();
    s.classList.add('show');
  },
  true,
);
