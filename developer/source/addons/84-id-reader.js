/* ============================================================
   READ AADHAAR / PAN FROM A FILE (employee form)
   "Read from Aadhaar / PAN file" takes a PDF, PNG or JPG, reads
   its text in this browser and offers the Aadhaar number, PAN,
   name and date of birth it finds. Nothing is filled until HR
   ticks the values and presses "Fill the form"; the file itself
   is never saved. PDF text comes from PDF.js; photos and scans
   are read with Tesseract.js. Both libraries load from jsDelivr
   the first time they are needed (needs internet); the document
   does not leave the computer.
   ============================================================ */
const IDR_LIBS = {
  pdf: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
  pdfWorker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
  ocr: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
};
const idrScript = (src) =>
  new Promise((ok, fail) => {
    if (document.querySelector(`script[data-idr="${src}"]`)) return ok();
    const s = document.createElement('script');
    s.src = src;
    s.dataset.idr = src;
    s.onload = ok;
    s.onerror = () => fail(new Error('Could not load the document reader. Check the internet connection.'));
    document.head.appendChild(s);
  });

/* ---------- reading text ---------- */
// Verhoeff check digit: every real Aadhaar number passes it, so misread digits are caught
const VH_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VH_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
const verhoeffOK = (num) =>
  [...String(num)].reverse().reduce((c, ch, i) => VH_D[c][VH_P[i % 8][Number(ch)]], 0) === 0;
const IDR_PAN_LETTER = { 0: 'O', 1: 'I', 2: 'Z', 5: 'S', 8: 'B', 6: 'G' },
  IDR_PAN_DIGIT = { O: '0', D: '0', Q: '0', I: '1', L: '1', Z: '2', S: '5', B: '8', G: '6' };
// fixes the usual OCR mix-ups by position: AAAAA9999A
function idrFixPan(t) {
  const c = String(t)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (c.length !== 10) return '';
  const out = [...c]
    .map((ch, i) => (i < 5 || i === 9 ? IDR_PAN_LETTER[ch] || ch : IDR_PAN_DIGIT[ch] || ch))
    .join('');
  return /^[A-Z]{3}[ABCFGHJLPT][A-Z][0-9]{4}[A-Z]$/.test(out) ? out : '';
}
const idrDate = (d, m, y) => {
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return isDate(iso) && iso < todayISO() && y > 1900 ? iso : '';
};
const idrNameLine = (l) => {
  const t = String(l || '')
    .replace(/[^A-Za-z .']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const bad =
    /government|india|income|tax|department|unique|identification|authority|aadhaar|address|father|enrol|male|female|signature|permanent|account|number|card|dob|birth|vid|help|www|issue|date|download|name/i;
  return t.length >= 4 && t.split(' ').length <= 5 && /[A-Za-z]{2,}/.test(t) && !bad.test(t) ? t : '';
};
// finds { aadhaar, pan, dob, name, gender, kind } in the text of one document
function idrParse(text) {
  const raw = String(text || ''),
    lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  const out = { kind: '' };
  // Aadhaar: 12 digits (first 2–9) in groups of 4, not part of a 16-digit VID, passing Verhoeff
  const flat = raw.replace(/[Oo]/g, '0').replace(/[Il|]/g, '1');
  const cand = [...flat.matchAll(/(?<![\d ])([2-9]\d{3})[ \-]?(\d{4})[ \-]?(\d{4})(?![ \-]?\d)/g)].map(
    (m) => m[1] + m[2] + m[3],
  );
  out.aadhaar = cand.find(verhoeffOK) || '';
  out.aadhaarUnsure = !out.aadhaar && cand.length ? cand[0] : '';
  // PAN
  const panHit = [...raw.toUpperCase().matchAll(/\b[A-Z0-9]{5}[A-Z0-9]{4}[A-Z0-9]\b/g)]
    .map((m) => idrFixPan(m[0]))
    .find(Boolean);
  out.pan = panHit || '';
  // date of birth
  const dm =
    raw.match(
      /(?:DOB|D\.O\.B|Date of Birth|Birth)[^\d]{0,12}(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{4})/i,
    ) || raw.match(/\b(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})\b/);
  if (dm) out.dob = idrDate(+dm[1], +dm[2], +dm[3]);
  const yob = !out.dob && raw.match(/Year of Birth[^\d]{0,6}(\d{4})/i);
  if (yob) out.yob = yob[1];
  const g = raw.match(/\b(MALE|FEMALE|TRANSGENDER)\b/i);
  if (g) out.gender = g[1][0].toUpperCase() + g[1].slice(1).toLowerCase();
  // name: the line after a "Name" label (new PAN, e-Aadhaar), else the line just above the date of birth (Aadhaar card),
  // else the first name-like line after the "INCOME TAX DEPARTMENT / GOVT. OF INDIA" header (old PAN)
  const labelled = lines.findIndex((l) => /^(name|नाम)\b|\/\s*name\b/i.test(l) && !/father|पिता/i.test(l));
  if (labelled >= 0)
    out.name =
      idrNameLine(lines[labelled].replace(/^.*name\s*[:\-]?/i, '')) || idrNameLine(lines[labelled + 1]);
  if (!out.name) {
    const di = lines.findIndex((l) => /DOB|Date of Birth|Year of Birth/i.test(l));
    for (let i = di - 1; i >= 0 && i >= di - 3 && !out.name; i--) out.name = idrNameLine(lines[i]);
  }
  if (!out.name && out.pan) {
    const hi = lines.findIndex((l) => /GOVT|INDIA/i.test(l));
    for (let i = hi + 1; i < lines.length && i <= hi + 3 && !out.name; i++) out.name = idrNameLine(lines[i]);
  }
  out.name = out.name ? out.name.replace(/\b\w+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()) : '';
  out.kind =
    out.aadhaar || /aadhaar|unique identification/i.test(raw)
      ? 'Aadhaar'
      : out.pan || /income tax|permanent account/i.test(raw)
        ? 'PAN'
        : '';
  return out;
}

/* ---------- engines (replaceable in tests via window.HRMS_DOC_READER) ---------- */
async function idrImageText(source, progress) {
  await idrScript(IDR_LIBS.ocr);
  const worker = await window.Tesseract.createWorker('eng', 1, {
    logger: (m) =>
      m.status === 'recognizing text' && progress(`Reading text… ${Math.round(m.progress * 100)}%`),
  });
  try {
    const { data } = await worker.recognize(source);
    return data.text || '';
  } finally {
    await worker.terminate();
  }
}
async function idrPdfText(buffer, progress, askPassword) {
  await idrScript(IDR_LIBS.pdf);
  const lib = window.pdfjsLib;
  lib.GlobalWorkerOptions.workerSrc = IDR_LIBS.pdfWorker;
  const task = lib.getDocument({ data: new Uint8Array(buffer) });
  task.onPassword = (update, reason) => {
    const p = askPassword(reason === lib.PasswordResponses.INCORRECT_PASSWORD);
    if (p == null) task.destroy();
    else update(p);
  };
  const pdf = await task.promise;
  let text = '';
  for (let n = 1; n <= Math.min(pdf.numPages, 3); n++) {
    const page = await pdf.getPage(n),
      tc = await page.getTextContent();
    let lastY = null;
    text +=
      tc.items
        .map((it) => {
          const y = Math.round(it.transform[5]),
            sep = lastY != null && Math.abs(y - lastY) > 2 ? '\n' : ' ';
          lastY = y;
          return sep + it.str;
        })
        .join('') + '\n';
    if (text.replace(/\s/g, '').length < 20) {
      // a scanned PDF has no text layer: draw the page and read it like a photo
      progress('Scanned PDF: reading the page image…');
      const vp = page.getViewport({ scale: 2.5 }),
        canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      text += (await idrImageText(canvas, progress)) + '\n';
    }
  }
  return text;
}
const idrEngine = () => window.HRMS_DOC_READER || { image: idrImageText, pdf: idrPdfText };
async function idrReadFile(file, progress) {
  const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
  if (!isPdf && !/^image\/(png|jpe?g|webp)$/.test(file.type) && !/\.(png|jpe?g|webp)$/i.test(file.name))
    throw new Error('Choose a PDF, PNG or JPG file.');
  if (file.size > 15 * 1024 * 1024) throw new Error('The file is larger than 15 MB.');
  const askPassword = (wrong) =>
    prompt(
      (wrong ? 'That password did not work. ' : '') +
        'This PDF is password-protected.\n\ne-Aadhaar: first 4 letters of the name in CAPITALS + year of birth (e.g. RIYA1999).\ne-PAN: date of birth as DDMMYYYY.',
    );
  const text = isPdf
    ? await idrEngine().pdf(await file.arrayBuffer(), progress, askPassword)
    : await idrEngine().image(file, progress);
  return idrParse(text);
}

/* ---------- employee form ---------- */
function idrWire(form) {
  const anchor = form.querySelector('input[name="aadhaar"]')?.closest('label');
  if (!anchor || form.querySelector('.idr-box')) return;
  anchor.insertAdjacentHTML(
    'beforebegin',
    `<div class="idr-box"><div><b>Read from Aadhaar / PAN file</b><small>PDF, PNG or JPG. Read in this browser; the file is not saved.</small></div>
      <label class="btn">Choose file<input type="file" class="idr-file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" multiple hidden></label>
      <div class="idr-out" aria-live="polite"></div></div>`,
  );
  const box = form.querySelector('.idr-box'),
    out = box.querySelector('.idr-out');
  box.querySelector('.idr-file').addEventListener('change', async (ev) => {
    const files = [...ev.target.files];
    ev.target.value = '';
    if (!files.length) return;
    const found = {};
    for (const f of files) {
      out.innerHTML = `<p class="idr-msg">Opening ${esc(f.name)}…</p>`;
      try {
        const r = await idrReadFile(
          f,
          (m) => (out.innerHTML = `<p class="idr-msg">${esc(f.name)}: ${esc(m)}</p>`),
        );
        Object.entries(r).forEach(([k, v]) => v && !found[k] && (found[k] = v));
        found.files = (found.files || []).concat(`${f.name}${r.kind ? ' (' + r.kind + ')' : ''}`);
      } catch (err) {
        out.innerHTML = `<p class="idr-msg bad">${esc(f.name)}: ${esc(err.message || 'could not be read')}</p>`;
        return;
      }
    }
    const field = (name) => form.querySelector(`[name="${name}"]`);
    const rows = [
      ['aadhaar', 'Aadhaar number', found.aadhaar, found.aadhaar ? 'checksum OK' : ''],
      ['pan', 'PAN', found.pan, ''],
      ['dob', 'Date of birth', found.dob, found.dob ? fmtLong(found.dob) : ''],
      ['legalName', 'Legal name', found.name, ''],
    ].filter((r) => r[2]);
    if (!rows.length) {
      out.innerHTML = `<p class="idr-msg bad">No Aadhaar number, PAN, name or date of birth could be read${found.aadhaarUnsure ? ` (a 12-digit number ${esc(found.aadhaarUnsure)} was seen but fails the Aadhaar check, so it is probably misread)` : ''}. Try a clearer photo or the original PDF.</p>`;
      return;
    }
    out.innerHTML = `<p class="idr-msg">From ${esc(found.files.join(', '))}. Check each value against the document:</p>
      <table class="idr-table">${rows
        .map(([k, l, v, note]) => {
          const cur = field(k)?.value || '',
            same = cur && cur.replace(/\s/g, '').toUpperCase() === String(v).toUpperCase();
          return `<tr><td><label><input type="checkbox" data-idr-k="${k}" ${same ? 'disabled' : cur ? '' : 'checked'}> ${l}</label></td><td><b>${esc(k === 'aadhaar' ? v.replace(/(\d{4})(?=\d)/g, '$1 ') : v)}</b>${note ? `<small>${esc(note)}</small>` : ''}</td><td>${same ? '<small>already in the form</small>' : cur ? `<small>form has ${esc(cur)}</small>` : ''}</td></tr>`;
        })
        .join('')}</table>
      <button type="button" class="btn primary idr-fill">Fill the form</button>`;
    out.querySelector('.idr-fill').addEventListener('click', () => {
      let n = 0;
      out.querySelectorAll('[data-idr-k]:checked').forEach((c) => {
        const k = c.dataset.idrK,
          el = field(k);
        if (!el) return;
        el.value = rows.find((r) => r[0] === k)[2];
        el.dispatchEvent(new Event('input', { bubbles: true }));
        n++;
      });
      out.innerHTML = `<p class="idr-msg ok">${n} field${n === 1 ? '' : 's'} filled. Save the employee to keep ${n === 1 ? 'it' : 'them'}.</p>`;
    });
  });
}
const idrOrigOpenEmp = openEmp;
openEmp = function (e) {
  idrOrigOpenEmp(e);
  idrWire($('empForm'));
};

// read-only helpers for the automated tests
window.HRMS_TEST = Object.assign(window.HRMS_TEST || {}, { idrParse });
