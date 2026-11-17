/* ---- compact Payroll header: no description, notes in one thin line, totals in one slim row ---- */
(() => {
  const imp = document.getElementById('impNote'),
    auto = document.getElementById('autoPayrollNotice');
  if (imp && auto) {
    const box = document.createElement('div');
    box.className = 'paynotes';
    imp.parentNode.insertBefore(box, imp);
    box.appendChild(imp);
    box.appendChild(auto);
  }
})();
afterRender.push(() => {
  // full text on hover for the shortened notes and totals
  ['impNote', 'autoPayrollNotice'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.title = el.textContent.trim();
  });
  document.querySelectorAll('#payStats .stat').forEach((x) => {
    x.title = x.innerText.replace(/\n+/g, ': ');
  });
});
