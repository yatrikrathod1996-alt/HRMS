/* Letters, part 2 of 4: the Documents tab itself: form, A4 preview, signature/stamp library,
   history of issued letters. */
/* ---------- add the Documents tab to the existing HRMS (no changes to app.js) ---------- */
const SECTION_HTML = `    <!-- DOCUMENTS -->
    <section id="tab-documents" class="hide">
      <div class="top">
        <div><h2>Documents</h2><p>Yellow boxes still need details. Click a page to edit its wording.</p></div>
      </div>
      <div class="dwrap">
        <div class="dpanel">
          <div class="dscroll">
            <label>Company letterhead<select id="dLhSel"></select></label>
            <label>Document<select id="dType"></select></label>
            <label>Employee<select id="dEmp"></select></label>
            <p class="hint" id="dEmpHint">Choosing an employee fills in their details. Pick "Someone not in the list" for a new candidate.</p>
            <details id="dLh">
              <summary>Letterhead and signature</summary>
              <div id="dLhForm"></div>
              <p class="hint">Saved separately for each company in "Company letterhead", and used in all its documents. The Acme Labs logo is also used across the HRMS (sidebar, salary slips).</p>
              <div class="controls" style="margin-bottom:8px">
                <label class="btn" style="cursor:pointer;flex-direction:row;margin:0;color:var(--ink)">Change logo<input type="file" id="dLogoFile" accept="image/png,image/jpeg,image/svg+xml" class="hide"></label>
                <button class="btn" type="button" id="dLogoReset">Use default logo</button>
              </div>
            </details>
            <details id="dSigs">
              <summary>Signatures and stamps</summary>
              <p class="hint">Upload a signature or the company stamp once. It is saved here and can be used again in any document: choose it under "Letter details" below. A clear photo or scan on white paper works best.</p>
              <label class="chk"><input type="checkbox" id="dSigWhite" checked> Remove white background (recommended)</label>
              <div id="dSigDrops"></div>
              <div id="dSigList"></div>
            </details>
            <div id="dForm"></div>
          </div>
          <div class="dacts">
            <button class="btn primary" type="button" id="dPdf">Download PDF</button>
            <button class="btn" type="button" id="dWord">Download Word</button>
            <button class="btn" type="button" id="dClear" title="Empty this document's fields">Clear fields</button>
          </div>
        </div>
        <div class="dview">
          <div class="dhead">
          <div class="dtools">
            <span class="dtl">Download as</span>
            <button class="btn primary" type="button" id="dPdfTop">PDF</button>
            <button class="btn" type="button" id="dWordTop">Word (.docx)</button>
            <button class="btn" type="button" id="dPrint">Print</button>
            <span class="idc" id="dPageCount"></span>
          </div>
          <div class="dbar" id="dBar"></div>
          </div>
          <div class="paperwrap" id="dPaperWrap"><div class="pages" id="dPages"></div></div>
          <div class="dlog">
            <h3>Issued documents</h3>
            <p class="idc" style="margin:0 0 8px">Every download is listed here with its reference number. Open one to see it again or make a corrected copy.</p>
            <div class="tablewrap"><table id="dLog"></table></div>
          </div>
        </div>
      </div>
    </section>

`;
document.getElementById('tab-settings').insertAdjacentHTML('beforebegin', SECTION_HTML);
addTab('documents', {
  label: 'Documents',
  section: 'tab-documents',
  place: ['nav button[data-tab="exits"]', 'afterend'],
  render: () => renderDocuments(),
});
const showDocs = (scroll) => showTab('documents', scroll);
/* ---------- DOCUMENTS: screen ---------- */
let dType = 'offer',
  dManual = false,
  dManualHTML = '';
const logoSrc = lhLogo;
const coHTML = () => {
  const c = esc(S.docSettings.company);
  return /Lab$/.test(c) ? c.slice(0, -3) + '<span>Lab</span>' : c;
};
const linkify = (t) =>
  esc(t).replace(/([\w.+-]+@[\w-]+\.[\w.]+|(?:https?:\/\/)?www\.[\w.-]+\.[a-z]{2,}[^\s|]*)/gi, '<a>$1</a>');
const rgbCss = (c) => `rgb(${c.join(',')})`;
/* the letterhead of Orbit Studio, Crimson Works and Tealwave Technosoft (same measurements as drawBrandLetterhead in the PDF) */
const lhBrandHead = (B) => {
  const L = S.docSettings,
    lines = [L.addr1, L.addr2].filter((x) => x && String(x).trim()).map(esc),
    web = L.web ? `<a>${esc(L.web)}</a>` : '';
  const vars = `--ac:${rgbCss(B.accent)};--ink:${rgbCss(B.ink)};${B.band ? `--bd:${rgbCss(B.band)};` : ''}${B.bandLine ? `--bl:${rgbCss(B.bandLine)};` : ''}`;
  const band = B.band ? `<i class="band${B.bandLine ? ' lined' : ''}"></i>` : '';
  const img = `<img src="${logoSrc()}" alt="${esc(L.company)} logo">`;
  if (B.layout === 'center')
    return `<div class="lh lhb lhb-center${B.double ? ' dbl' : ''}" style="${vars}">${band}${img}<div class="c">${lines.concat(web ? [web] : []).join(' &nbsp;|&nbsp; ')}</div></div>`;
  return `<div class="lh lhb lhb-left" style="${vars}">${band}${img}<div class="r"><div class="n">${esc(L.company)}</div>${lines.concat(web ? [web] : []).join('<br>')}</div></div>`;
};
/* The footer is the Acme Labs footer (same type, size and places) with the company's own details: the lines after
   the first one, which is always "Company | address". Empty lines are left out. */
const lhBrandFootLines = () => {
  const L = S.docSettings,
    has = (x) => x && String(x).trim();
  return [
    has(L.emails) ? L.emails : '',
    [has(L.phone) ? 'Phone: ' + L.phone : '', L.web].filter(has).join(' | '),
    has(L.reg) ? L.reg : '',
  ].filter(has);
};
const lhBrandAddr = () => {
  const L = S.docSettings,
    a = [L.addr1, L.addr2].filter((x) => x && String(x).trim()).join(', ');
  return a ? ' | ' + a : '';
};
const lhBrandFoot = (B) =>
  `<div class="lf" style="border-top-color:${rgbCss(B.accent)}"><span class="b">${esc(S.docSettings.company)}</span>${esc(lhBrandAddr())}${lhBrandFootLines()
    .map((t) => '<br>' + linkify(t))
    .join('')}</div>` +
  (B.band ? `<i class="lfband" style="background:${rgbCss(B.band)}"></i>` : '');
const lhHead = () => {
  ensureDocs();
  const L = S.docSettings;
  if (lhBrand().layout) return lhBrandHead(lhBrand());
  return `<div class="lh"><img src="${logoSrc()}" alt="${esc(L.company)} logo"><div class="r"><div class="n">${coHTML()}</div>${esc(L.addr1)}<br>${esc(L.addr2)}<br><a>${esc(L.web)}</a></div></div>`;
};
const lhFoot = () => {
  const L = S.docSettings;
  if (lhBrand().layout) return lhBrandFoot(lhBrand());
  return `<div class="lf"><span class="b">${coHTML()}</span> | ${esc(L.addr1)}, ${esc(L.addr2)}<br>${linkify(L.emails)}<br>Phone: ${esc(L.phone)} | <a>${esc(L.web)}</a></div>`;
};
const docKeys = (D) =>
  D.sections.flatMap((s) => s[1]).concat(LETTER_KEYS);
const fieldLabel = (D, k) => (D.labels && D.labels[k]) || (FL[k] || [k])[0];
function nextRef(D) {
  const y = new Date().getFullYear();
  const used = new Set(S.docs.filter((x) => x.type === D.id).map((x) => x.ref));
  let n = S.docs.filter((x) => x.type === D.id && String(x.ref).includes(`/${y}/`)).length + 1,
    r;
  do {
    r = `ML/HR/${y}/${D.code}/${String(n).padStart(3, '0')}`;
    n++;
  } while (used.has(r));
  return r;
}
function dDef(D, k) {
  const o = (FL[k] || [])[2] || {};
  if (D.defs && D.defs[k] !== undefined) return D.defs[k];
  if (o.lh) return S.docSettings[o.lh];
  if (k === 'letterDate') return todayISO();
  if (k === 'sigId') return S.docSettings.defSig || 'none';
  if (k === 'stampId') return S.docSettings.defStamp || 'none';
  return o.def;
}
function dVals() {
  ensureDocs();
  const D = DOCS[dType];
  const V = (S.docDrafts[dType] = S.docDrafts[dType] || {});
  docKeys(D).forEach((k) => {
    if (V[k] === undefined) {
      const x = dDef(D, k);
      if (x !== undefined) V[k] = x;
    }
  });
  if (!V.ref) V.ref = nextRef(D);
  return V;
}

function renderDocuments() {
  ensureDocs();
  $('dType').innerHTML = DOC_GROUPS.map(
    (g) =>
      `<optgroup label="${g}">${DOC_ORDER.filter((id) => DOCS[id].group === g)
        .map((id) => `<option value="${id}" ${id === dType ? 'selected' : ''}>${DOCS[id].label}</option>`)
        .join('')}</optgroup>`,
  ).join('');
  $('dLhSel').innerHTML = Object.entries(LH_BRANDS)
    .map(([id, b]) => `<option value="${id}" ${id === lhId() ? 'selected' : ''}>${esc(b.label)}</option>`)
    .join('');
  const V = dVals();
  const act = S.employees.filter((e) => e.status === 'Active'),
    gone = S.employees.filter((e) => e.status !== 'Active'),
    byN = (a, b) => a.name.localeCompare(b.name);
  const opt = (e) =>
    `<option value="${e.id}" ${V.__emp === e.id ? 'selected' : ''}>${esc(e.name)} (${e.id})</option>`;
  $('dEmp').innerHTML =
    `<option value="" ${!V.__emp ? 'selected' : ''}>Choose an employee…</option><option value="__new" ${V.__emp === '__new' ? 'selected' : ''}>Someone not in the list</option>` +
    `<optgroup label="Active">${act.sort(byN).map(opt).join('')}</optgroup>` +
    (gone.length ? `<optgroup label="Left the company">${gone.sort(byN).map(opt).join('')}</optgroup>` : '');
  const LHF = [
    ['company', 'Company name'],
    ['addr1', 'Address line 1'],
    ['addr2', 'Address line 2'],
    ['web', 'Website'],
    ['emails', 'Footer contact line'],
    ['phone', 'Phone'],
    ['reg', 'Registration line in the footer (GSTIN etc.; not on the Acme Labs letterhead)'],
    ['office', 'Default office address'],
    ['city', 'Default office city'],
    ['signName', 'Signed by'],
    ['signTitle', 'Signatory title'],
    ['hrEmail', 'HR contact email'],
    ['jurisdiction', 'Courts named in the NDA'],
  ];
  $('dLhForm').innerHTML = LHF.map(
    ([k, l]) => `<label>${l}<input data-lh="${k}" value="${esc(S.docSettings[k] || '')}"></label>`,
  ).join('');
  renderDocForm();
  renderDocPreview();
  renderDocLog();
  renderSigList();
}
function renderDocForm() {
  const D = DOCS[dType],
    V = dVals(),
    sym = curSym(V.currency || 'INR');
  const fh = (k) => {
    const [, t, o = {}] = FL[k];
    const l = esc(fieldLabel(D, k)) + (t === 'money' ? ` (${sym})` : ''),
      val = V[k];
    const hint = o.hint ? `<p class="hint">${esc(o.hint)}</p>` : '';
    if (t === 'chk')
      return `<label class="chk"><input type="checkbox" data-k="${k}" ${val ? 'checked' : ''}> ${l}</label>`;
    if (t === 'asset') {
      const list = S.docAssets.filter((a) => a.kind === o.kind && (!a.hidden || a.id === val)),
        cur = assetById(val);
      return (
        `<label>${l}<select data-k="${k}"><option value="none" ${!cur ? 'selected' : ''}>None</option>${list.map((a) => `<option value="${a.id}" ${a.id === val ? 'selected' : ''}>${esc(a.name)}${a.hidden ? ' (removed)' : ''}</option>`).join('')}<option value="__upload">＋ Upload new from computer…</option></select></label>` +
        (cur ? `<div class="assetprev"><img src="${cur.data}" alt=""></div>` : '') +
        dropZone(o.kind)
      );
    }
    if (t === 'sel')
      return `<label>${l}<select data-k="${k}">${o.opts.map((x) => `<option value="${esc(x)}" ${x === val ? 'selected' : ''}>${esc(x || 'Choose…')}</option>`).join('')}</select></label>${hint}`;
    if (t === 'area')
      return `<label>${l}<textarea data-k="${k}" rows="${o.rows || 4}" placeholder="${esc(o.ph || '')}">${esc(val ?? '')}</textarea></label>${hint}`;
    const it = { date: 'date', num: 'number', money: 'number' }[t] || 'text';
    return `<label>${l}<input data-k="${k}" type="${it}" ${t === 'money' ? 'step="0.01" min="0"' : t === 'num' ? 'min="0"' : ''} value="${esc(val ?? '')}" placeholder="${esc(o.ph || '')}"></label>${hint}`;
  };
  $('dForm').innerHTML = D.sections
    .concat([['Letter details', LETTER_KEYS]])
    .map(([t, keys]) => `<div class="dsec">${t}</div>` + keys.map(fh).join(''))
    .join('');
  if (V.sigDX || V.sigDY || V.stampDX || V.stampDY)
    $('dForm').insertAdjacentHTML(
      'beforeend',
      '<button class="btn" type="button" id="dSigReset">Put signature and stamp back in place</button>',
    );
}
let dReflow = false;
function curHTML() {
  return dManual ? dManualHTML : DOCS[dType].body(mkH(dVals()));
}
/* The preview is laid out into real A4 pages with the same rules as the PDF, each page on the letterhead */
function renderDocPreview() {
  const box = document.createElement('div');
  box.innerHTML = curHTML();
  const lay = fitLayout(box.innerHTML),
    head = lhHead(),
    foot = lhFoot(),
    wrap = $('dPages'),
    n = lay.pages.length;
  wrap.innerHTML = '';
  lay.pages.forEach((items, k) => {
    const cap = document.createElement('div');
    cap.className = 'pgcap';
    cap.textContent = `Page ${k + 1} of ${n}`;
    wrap.appendChild(cap);
    const a4 = document.createElement('div');
    a4.className = 'a4';
    a4.innerHTML =
      head +
      `<div class="lbody pdfmode pg dens-${lay.lvl}" contenteditable="true" spellcheck="true"></div>` +
      foot;
    const body = a4.querySelector('.pg');
    if (lay.forced[k]) {
      const pb = document.createElement('div');
      pb.className = 'pb';
      body.appendChild(pb);
    }
    items.forEach((x) => body.appendChild(x));
    wrap.appendChild(a4);
  });
  lay.host.remove();
  $('dPageCount').textContent = `${n} A4 page${n > 1 ? 's' : ''}`;
  updateDocBar();
  fitPaper();
}
function docMissing() {
  return [...new Set([...$('dPages').querySelectorAll('.ph')].map((s) => s.dataset.k))];
}
function updateDocBar() {
  const D = DOCS[dType],
    miss = docMissing();
  let h = miss.length
    ? `<span class="pill bad" id="dMissPill" title="${esc(miss.map((k) => fieldLabel(D, k)).join(', '))}">${miss.length} detail${miss.length > 1 ? 's' : ''} still to fill</span>`
    : '<span class="pill ok">All details filled</span>';
  h += `<span class="idc">${D.label} · ${esc(dVals().ref || '')}</span>`;
  docChecks(dType, dVals()).forEach((m) => {
    h += `<div class="dnote dwarn" style="flex-basis:100%">⚠ ${esc(m)}</div>`;
  });
  if (dManual)
    h += `<div class="dnote" style="flex-basis:100%">You changed the wording in the preview, so changes to the fields on the left will not show. <button class="btn" type="button" id="dRebuild">Rebuild from fields</button></div>`;
  $('dBar').innerHTML = h;
}
function fitPaper() {
  const w = $('dPaperWrap').clientWidth - 38;
  $('dPages').style.zoom = w > 0 ? Math.min(1, w / 794) : 1;
}
function focusField(k) {
  const el = $('dForm').querySelector(`[data-k="${k}"]`);
  if (el) {
    el.focus();
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

$('dLhSel').addEventListener('change', (ev) => {
  lhSwitch(ev.target.value);
  dManual = false;
  save();
  renderDocuments();
});
$('dType').addEventListener('change', (ev) => {
  dType = ev.target.value;
  dManual = false;
  renderDocuments();
});
$('dEmp').addEventListener('change', (ev) => {
  const D = DOCS[dType],
    V = dVals(),
    id = ev.target.value,
    keys = docKeys(D);
  EMP_KEYS.forEach((k) => {
    if (keys.includes(k)) V[k] = dDef(D, k) ?? '';
  });
  V.__emp = id;
  const e = S.employees.find((x) => x.id === id);
  if (e) {
    const tm = { Contractor: 'Contract', 'Full-time': 'Full-time', Probation: 'Full-time' };
    let accom = 0;
    try {
      const p = salaryPolicyFor(e, todayISO().slice(0, 7));
      if (p && p.accommodationEnabled) accom = Number(p.accommodationAmount || 0);
    } catch (err) {}
    const cash = e.salary;
    const map = {
      name: e.name,
      addressAs: firstName(e.name),
      empId: e.id,
      designation: e.designation,
      curDesignation: e.designation,
      department: e.department === 'Unassigned' ? '' : e.department,
      joinDate: e.joining,
      lastDay: e.lastDay,
      fixed: cash,
      curFixed: cash,
      accom: accom || '',
      bonus: e.variable || '',
      currency: e.currency,
      empType: tm[e.type],
      resignDate: e.offboarding && e.offboarding.noticeDate,
      candAddress: e.address,
    };
    Object.entries(map).forEach(([k, x]) => {
      if (keys.includes(k) && x !== undefined && x !== null && x !== '') V[k] = x;
    });
    // salary revision letter: start from the person's latest recorded increment, like Increments → Make letter
    const inc =
      dType === 'revision' &&
      [...(S.increments || [])]
        .filter((r) => r.empId === e.id)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (inc)
      Object.assign(V, {
        effDate: inc.date,
        curFixed: inc.oldSalary,
        newFixed: inc.newSalary,
        bonus: inc.newVar || '',
        revDesignation:
          inc.newDesignation && inc.newDesignation !== inc.oldDesignation ? inc.newDesignation : '',
        designation: inc.oldDesignation || e.designation,
      });
  }
  if (S.docs.some((x) => x.ref === V.ref)) V.ref = nextRef(D);
  dManual = false;
  save();
  renderDocForm();
  renderDocPreview();
});
$('dForm').addEventListener('input', (ev) => {
  const k = ev.target.dataset.k;
  if (!k) return;
  const V = dVals(),
    t = (FL[k] || [])[1];
  const old = V[k];
  V[k] = t === 'chk' ? ev.target.checked : ev.target.value;
  if (k === 'name') {
    const af = $('dForm').querySelector('[data-k="addressAs"]');
    if (af && (!V.addressAs || V.addressAs === firstName(old))) {
      V.addressAs = firstName(V.name);
      af.value = V.addressAs;
    }
  }
  if (k === 'title') {
    const pf = $('dForm').querySelector('[data-k="pronoun"]');
    const p = { 'Mr.': 'he / his', 'Ms.': 'she / her', 'Mrs.': 'she / her' }[V.title];
    if (pf && p) {
      V.pronoun = p;
      pf.value = p;
    }
  }
  if (k === 'currency') {
    renderDocForm();
  }
  if ((k === 'sigId' || k === 'stampId') && V[k] === '__upload') {
    V[k] = old || 'none';
    ev.target.value = V[k];
    const z = ev.target.closest('label').nextElementSibling;
    const inp = (
      z && z.classList.contains('dropzone')
        ? z
        : ev.target
            .closest('label')
            .parentElement.querySelector(`.dropzone[data-kind="${k === 'sigId' ? 'signature' : 'stamp'}"]`)
    ).querySelector('input[type=file]');
    inp.click();
    return;
  }
  if (k === 'sigId' || k === 'stampId') {
    S.docSettings[k === 'sigId' ? 'defSig' : 'defStamp'] = V[k];
    renderDocForm();
  }
  if (dManual && (k === 'sigSize' || k === 'stampSize')) {
    // the wording was changed by hand: resize the picture where it is, keep the wording
    const w = k === 'sigSize' ? 'sig' : 'stamp';
    $('dPages')
      .querySelectorAll('.' + w + 'img')
      .forEach((im) => (im.style.transform = sigTransform(V, w)));
    dManualHTML = [...$('dPages').querySelectorAll('.pg')].map((x) => x.innerHTML).join('');
    return;
  }
  renderDocPreview();
});
$('dForm').addEventListener('change', () => save());
$('dForm').addEventListener('click', (ev) => {
  if (ev.target.id !== 'dSigReset') return;
  const V = dVals();
  ['sigDX', 'sigDY', 'stampDX', 'stampDY'].forEach((k) => delete V[k]);
  save();
  renderDocForm();
  if (dManual) {
    $('dPages')
      .querySelectorAll('.sigimg,.stampimg')
      .forEach((im) => {
        im.style.transform = sigTransform(V, im.classList.contains('stampimg') ? 'stamp' : 'sig');
      });
    dManualHTML = [...$('dPages').querySelectorAll('.pg')].map((x) => x.innerHTML).join('');
  } else renderDocPreview();
});
/* drag the signature or the company stamp in the preview to move it; the place is kept with the letter */
(() => {
  let drag = null;
  const zoom = () => parseFloat($('dPages').style.zoom) || 1;
  $('dPages').addEventListener('dragstart', (ev) => {
    if (ev.target.closest && ev.target.closest('.sigimg,.stampimg')) ev.preventDefault();
  });
  $('dPages').addEventListener('pointerdown', (ev) => {
    const im = ev.target.closest && ev.target.closest('.sigimg,.stampimg');
    if (!im || ev.button) return;
    ev.preventDefault();
    const which = im.classList.contains('stampimg') ? 'stamp' : 'sig',
      V = dVals();
    drag = {
      im,
      which,
      x0: ev.clientX,
      y0: ev.clientY,
      dx: Number(V[which + 'DX']) || 0,
      dy: Number(V[which + 'DY']) || 0,
      nx: Number(V[which + 'DX']) || 0,
      ny: Number(V[which + 'DY']) || 0,
    };
    try {
      im.setPointerCapture(ev.pointerId);
    } catch (e) {}
    im.classList.add('moving');
  });
  $('dPages').addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const z = zoom(),
      V = dVals();
    drag.nx = Math.round(drag.dx + (ev.clientX - drag.x0) / z);
    drag.ny = Math.round(drag.dy + (ev.clientY - drag.y0) / z);
    drag.im.style.transform = `translate(${drag.nx}px,${drag.ny}px) scale(${SIG_SIZES[V[drag.which + 'Size']] || 1})`;
  });
  const end = () => {
    if (!drag) return;
    const d = drag,
      V = dVals();
    drag = null;
    d.im.classList.remove('moving');
    if (d.nx === d.dx && d.ny === d.dy) return;
    V[d.which + 'DX'] = d.nx;
    V[d.which + 'DY'] = d.ny;
    save();
    if (dManual)
      dManualHTML = [...$('dPages').querySelectorAll('.pg')].map((x) => x.innerHTML).join('');
    renderDocForm();
  };
  $('dPages').addEventListener('pointerup', end);
  $('dPages').addEventListener('pointercancel', end);
})();
$('dPages').addEventListener('click', (ev) => {
  const s = ev.target.closest('.ph');
  if (s && !dManual) focusField(s.dataset.k);
});
$('dPages').addEventListener('input', (ev) => {
  if (!ev.target.closest('.pg')) return;
  dManual = true;
  dReflow = true;
  dManualHTML = [...$('dPages').querySelectorAll('.pg')].map((x) => x.innerHTML).join('');
  updateDocBar();
});
// re-flow the pages when you finish typing in them
$('dPages').addEventListener('focusout', (ev) => {
  if (dReflow && !(ev.relatedTarget && ev.relatedTarget.closest && ev.relatedTarget.closest('#dPages'))) {
    dReflow = false;
    renderDocPreview();
  }
});
$('dBar').addEventListener('click', (ev) => {
  if (ev.target.id === 'dRebuild') {
    if (confirm('Discard the wording you changed in the preview and rebuild the letter from the fields?')) {
      dManual = false;
      renderDocPreview();
    }
  }
  if (ev.target.id === 'dMissPill') {
    const k = docMissing()[0];
    if (k) focusField(k);
  }
});
$('dLhForm').addEventListener('input', (ev) => {
  const k = ev.target.dataset.lh;
  if (!k) return;
  S.docSettings[k] = ev.target.value;
  renderDocPreview();
});
$('dLhForm').addEventListener('change', () => save());
$('dLogoFile').addEventListener('change', (ev) => {
  const f = ev.target.files[0];
  ev.target.value = '';
  if (!f) return;
  if (f.size > 600000) {
    alert('Please use a logo smaller than 600 KB.');
    return;
  }
  const r = new FileReader();
  r.onload = () => {
    // Acme Labs's logo is the HRMS logo; the other companies keep their own for letters
    if (lhId() === 'acmelabs') S.docSettings.logo = r.result;
    else S.docSettings.lhLogos[lhId()] = r.result;
    save();
    renderDocPreview();
  };
  r.readAsDataURL(f);
});
$('dLogoReset').onclick = () => {
  if (lhId() === 'acmelabs') S.docSettings.logo = '';
  else delete S.docSettings.lhLogos[lhId()];
  save();
  renderDocPreview();
};
$('dClear').onclick = () => {
  if (!confirm(`Empty all fields of this ${DOCS[dType].label}?`)) return;
  delete S.docDrafts[dType];
  dManual = false;
  save();
  renderDocuments();
};
window.addEventListener('resize', () => {
  if (isOpen('documents')) fitPaper();
});

/* signatures and stamps library */
const dropZone = (
  kind,
) => `<div class="dropzone" data-kind="${kind}" tabindex="0" role="button" aria-label="Upload ${kind} image">
  <input type="file" accept="image/png,image/jpeg,image/webp" class="hide" data-dropfile="${kind}">
  <div class="dz-ic">⬆</div><div><b>Drag &amp; drop</b> a ${kind === 'stamp' ? 'company stamp' : 'signature'} image here<br><span>or <u>click to choose</u> from your computer (PNG or JPG)</span></div></div>`;
const thumb = (a, cls = '') =>
  a ? `<img class="athumb ${cls}" src="${a.data}" alt="${esc(a.name)}" title="${esc(a.name)}">` : '';
function renderSigList() {
  const L = S.docSettings,
    rows = S.docAssets.filter((a) => !a.hidden);
  const block = (kind, title) => {
    const list = rows.filter((a) => a.kind === kind),
      def = kind === 'signature' ? L.defSig : L.defStamp;
    return (
      `<div class="dsec" style="margin-top:4px">${title}</div>` +
      (list.length
        ? list
            .map(
              (
                a,
              ) => `<div class="asset">${thumb(a)}<div class="ainfo"><b>${esc(a.name)}</b><span class="idc">Added ${new Date(a.addedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}${a.id === def ? ' · used by default' : ''}</span>
      <span>${a.id === def ? '' : `<button class="linkish" type="button" data-adef="${a.id}">Use by default</button> &nbsp; `}<button class="linkish" type="button" data-aren="${a.id}">Rename</button> &nbsp; <button class="linkish" type="button" style="color:var(--unpaid)" data-adel="${a.id}">Remove</button></span></div></div>`,
            )
            .join('')
        : `<p class="hint">None saved yet.</p>`)
    );
  };
  $('dSigList').innerHTML = block('signature', 'Signatures') + block('stamp', 'Company stamps');
}
function readImage(file, removeWhite) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = rej;
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => rej(new Error('bad image'));
      img.onload = () => {
        const sc = Math.min(1, 900 / Math.max(img.width, img.height)),
          w = Math.max(1, Math.round(img.width * sc)),
          h = Math.max(1, Math.round(img.height * sc));
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0, w, h);
        const d = x.getImageData(0, 0, w, h),
          a = d.data;
        if (removeWhite)
          for (let i = 0; i < a.length; i += 4) {
            const m = Math.min(a[i], a[i + 1], a[i + 2]);
            if (m >= 232) a[i + 3] = 0;
            else if (m > 190) a[i + 3] = Math.round((a[i + 3] * (232 - m)) / 42);
          }
        let x0 = w,
          y0 = h,
          x1 = -1,
          y1 = -1;
        for (let yy = 0; yy < h; yy++)
          for (let xx = 0; xx < w; xx++)
            if (a[(yy * w + xx) * 4 + 3] > 12) {
              if (xx < x0) x0 = xx;
              if (xx > x1) x1 = xx;
              if (yy < y0) y0 = yy;
              if (yy > y1) y1 = yy;
            }
        if (x1 < 0) {
          rej(new Error('empty'));
          return;
        }
        x.putImageData(d, 0, 0);
        const pad = 4;
        x0 = Math.max(0, x0 - pad);
        y0 = Math.max(0, y0 - pad);
        x1 = Math.min(w - 1, x1 + pad);
        y1 = Math.min(h - 1, y1 + pad);
        const o = document.createElement('canvas');
        o.width = x1 - x0 + 1;
        o.height = y1 - y0 + 1;
        o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
        res({ data: o.toDataURL('image/png'), w: o.width, h: o.height });
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
async function addAsset(kind, file) {
  if (!file) return;
  if (file.size > 8e6) {
    alert('Please use an image smaller than 8 MB.');
    return;
  }
  let im;
  try {
    im = await readImage(file, $('dSigWhite').checked);
  } catch (e) {
    alert('This image could not be read, or it is completely white. Try a clearer photo or scan.');
    return;
  }
  const def =
    file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim() || (kind === 'stamp' ? 'Company stamp' : 'Signature');
  const name = def;
  const a = {
    id: 'as' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    kind,
    name,
    data: im.data,
    w: im.w,
    h: im.h,
    addedAt: Date.now(),
  };
  S.docAssets.push(a);
  const L = S.docSettings;
  if (kind === 'signature') {
    L.defSig = a.id;
  } else {
    L.defStamp = a.id;
  }
  const V = dVals();
  V[kind === 'signature' ? 'sigId' : 'stampId'] = a.id;
  save();
  renderSigList();
  renderDocForm();
  renderDocPreview();
  flash(`Saved ${kind}: ${name}. It is now selected in Letter details.`);
  const d = $('dSigs');
  if (d) d.open = true;
}
$('dSigDrops').innerHTML = dropZone('signature') + dropZone('stamp');
/* drag & drop / click-to-choose for every drop zone in the Documents screen */
const docSec = document.getElementById('tab-documents');
docSec.addEventListener('click', (ev) => {
  const z = ev.target.closest('.dropzone');
  if (z && ev.target.tagName !== 'INPUT') z.querySelector('input[type=file]').click();
});
docSec.addEventListener('keydown', (ev) => {
  const z = ev.target.closest && ev.target.closest('.dropzone');
  if (z && (ev.key === 'Enter' || ev.key === ' ')) {
    ev.preventDefault();
    z.querySelector('input[type=file]').click();
  }
});
docSec.addEventListener('change', (ev) => {
  const k = ev.target.dataset && ev.target.dataset.dropfile;
  if (!k) return;
  const f = ev.target.files[0];
  ev.target.value = '';
  addAsset(k, f);
});
docSec.addEventListener('dragover', (ev) => {
  ev.preventDefault();
  const z = ev.target.closest('.dropzone');
  docSec.querySelectorAll('.dropzone.over').forEach((x) => {
    if (x !== z) x.classList.remove('over');
  });
  if (z) {
    z.classList.add('over');
    ev.dataTransfer.dropEffect = 'copy';
  } else ev.dataTransfer.dropEffect = 'none';
});
docSec.addEventListener('dragleave', (ev) => {
  const z = ev.target.closest('.dropzone');
  if (z && !z.contains(ev.relatedTarget)) z.classList.remove('over');
});
docSec.addEventListener('drop', (ev) => {
  ev.preventDefault();
  const z = ev.target.closest('.dropzone');
  docSec.querySelectorAll('.dropzone.over').forEach((x) => x.classList.remove('over'));
  if (!z) return;
  const f = [...(ev.dataTransfer.files || [])].find((x) => /^image\//.test(x.type));
  if (!f) {
    alert('Please drop an image file (PNG or JPG).');
    return;
  }
  addAsset(z.dataset.kind, f);
});
$('dSigList').addEventListener('click', (ev) => {
  const t = ev.target,
    L = S.docSettings;
  const a = S.docAssets.find((x) => x.id === (t.dataset.adef || t.dataset.aren || t.dataset.adel));
  if (!a) return;
  if (t.dataset.adef) {
    if (a.kind === 'signature') L.defSig = a.id;
    else L.defStamp = a.id;
    const V = dVals();
    V[a.kind === 'signature' ? 'sigId' : 'stampId'] = a.id;
  }
  if (t.dataset.aren) {
    const n = prompt('New name', a.name);
    if (!n || !n.trim()) return;
    a.name = n.trim();
  }
  if (t.dataset.adel) {
    const used = S.docs.filter((r) => r.vals && (r.vals.sigId === a.id || r.vals.stampId === a.id)).length;
    if (
      !confirm(
        `Remove "${a.name}" from the list?${used ? `\n\nIt was used in ${used} issued document${used > 1 ? 's' : ''}. It stays attached to those, so you can still open them.` : ''}`,
      )
    )
      return;
    a.hidden = true;
    if (L.defSig === a.id) L.defSig = 'none';
    if (L.defStamp === a.id) L.defStamp = 'none';
    Object.values(S.docDrafts).forEach((V) => {
      if (V.sigId === a.id) V.sigId = 'none';
      if (V.stampId === a.id) V.stampId = 'none';
    });
  }
  save();
  renderSigList();
  renderDocForm();
  renderDocPreview();
  renderDocLog();
});
/* issued documents */
function renderDocLog() {
  const rows = S.docs;
  $('dLog').innerHTML =
    `<thead><tr><th>Downloaded</th><th>Reference</th><th>Document</th><th>Employee</th><th>Letter date</th><th>Signed with</th><th></th></tr></thead><tbody>` +
    (rows.length
      ? rows
          .map(
            (
              r,
              i,
            ) => `<tr><td>${new Date(r.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td>${esc(r.ref)}</td><td>${esc((DOCS[r.type] || {}).label || r.type)}${r.html ? ' <span class="idc">(wording changed)</span>' : ''}</td>
      <td>${esc(r.name || '—')}${r.empId ? ` <span class="idc">${esc(r.empId)}</span>` : ''}</td><td>${r.date ? fmtLong(r.date) : '—'}</td><td class="asig">${r.vals && (assetById(r.vals.sigId) || assetById(r.vals.stampId)) ? thumb(assetById(r.vals.sigId)) + thumb(assetById(r.vals.stampId), 'st') : '<span class="idc">—</span>'}</td>
      <td><button class="linkish" data-open="${i}">Open</button> &nbsp; <button class="linkish" style="color:var(--unpaid)" data-del="${i}">Remove</button></td></tr>`,
          )
          .join('')
      : `<tr><td colspan="7" class="idc">Nothing downloaded yet.</td></tr>`) +
    '</tbody>';
}
$('dLog').addEventListener('click', (ev) => {
  const o = ev.target.dataset.open,
    d = ev.target.dataset.del;
  if (o !== undefined) {
    const r = S.docs[+o];
    if (!DOCS[r.type]) return;
    dType = r.type;
    S.docDrafts[r.type] = JSON.parse(JSON.stringify(r.vals));
    dManual = !!r.html;
    dManualHTML = (r.html || '').replace(/<img([^>]*?)data-aid="([^"]+)"([^>]*?)src=""/g, (m, a1, id, a2) => {
      const a = assetById(id);
      return `<img${a1}data-aid="${id}"${a2}src="${a ? a.data : ''}"`;
    });
    save();
    renderDocuments();
    const sec = document.getElementById('tab-documents');
    if (sec) sec.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (d !== undefined) {
    const r = S.docs[+d];
    if (confirm(`Remove ${r.ref} from this list? The downloaded file is not affected.`)) {
      S.docs.splice(+d, 1);
      save();
      renderDocLog();
    }
  }
});
function logDoc(D, V, html) {
  const rec = {
    ref: V.ref,
    type: D.id,
    name: V.name || '',
    empId: V.empId || '',
    date: V.letterDate || '',
    at: Date.now(),
    vals: JSON.parse(JSON.stringify(V)),
    html: dManual ? html.replace(/(<img[^>]*data-aid="[^"]+"[^>]*?)\ssrc="data:[^"]*"/g, '$1 src=""') : null,
  };
  const i = S.docs.findIndex((x) => x.ref === V.ref && x.type === D.id);
  if (i >= 0) S.docs.splice(i, 1);
  S.docs.unshift(rec);
  save();
  renderDocLog();
  updateDocBar();
}
