/* "Download HRMS with my data": saves this HRMS as ONE .html file with all the data inside it.
   Open that file on any computer or browser and the data is there; when a browser already holds newer
   data, the browser's data is kept (see load() in app.js). Only in the single-file version (AcmeLabs_HRMS.html). */
function hrmsWithData() {
  const shell = window.HRMS_SHELL;
  if (!shell) return '';
  const all = [...document.querySelectorAll('script')],
    from = all.findIndex((x) => x.textContent.startsWith('/* shell */'));
  const code = all
    .slice(from + 1)
    .filter((x) => !x.textContent.startsWith('/* embedded data */'))
    .map((x) => x.outerHTML)
    .join('\n');
  // inside the JSON '<' only appears in text, where < reads back as '<'
  const data = JSON.stringify(S).replace(/</g, '\\u003c');
  return (
    shell.slice(0, shell.lastIndexOf('</body>')) +
    `<script>/* embedded data */\nwindow.HRMS_EMBEDDED = ${data};\n<\/script>\n` +
    code +
    '\n</body></html>'
  );
}
(() => {
  const anchor = $('exportJson');
  if (!anchor || !window.HRMS_SHELL || $('exportHtml')) return;
  const b = document.createElement('button');
  b.className = 'btn primary';
  b.id = 'exportHtml';
  b.type = 'button';
  b.textContent = 'Download HRMS with my data';
  b.title = 'One .html file with all your data inside. Open it on any computer.';
  b.addEventListener('click', () => {
    save();
    download(`AcmeLabs_HRMS_${new Date().toISOString().slice(0, 10)}.html`, hrmsWithData(), 'text/html');
  });
  anchor.insertAdjacentElement('beforebegin', b);
  // both downloads hold everyone's salary, bank and ID details: say so where they are made
  const row = anchor.parentElement;
  if (row && !$('exportWarn'))
    row.insertAdjacentHTML(
      'afterend',
      '<p class="cell-sub" id="exportWarn">Backups and "HRMS with my data" contain every salary, bank account and ID number. Keep them in a private folder and share only with people allowed to see payroll.</p>',
    );
})();
