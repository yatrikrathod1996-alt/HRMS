/* Letters, part 3 of 4: page layout into A4 pages, PDF (real text) and printing. */
/* downloads */
function cleanBody(html) {
  const box = document.createElement('div');
  box.innerHTML = html;
  box.querySelectorAll('.ph').forEach((s) => s.replaceWith(document.createTextNode(s.textContent)));
  return box;
}
function docFileName(D, V) {
  return `${D.label.replace(/ \/ /g, ' or ')} - ${V.name || 'Draft'}`
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function checkMissing() {
  const D = DOCS[dType],
    miss = docMissing();
  if (!miss.length) return true;
  return confirm(
    `${miss.length} detail${miss.length > 1 ? 's are' : ' is'} still empty: ${miss.map((k) => fieldLabel(D, k)).join(', ')}.\n\nDownload anyway? Empty details will show in [brackets].`,
  );
}
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = () => {
      s.remove();
      rej();
    };
    document.head.appendChild(s);
  });
}
async function needLib(test, file, cdns) {
  if (test()) return true;
  for (const u of [BASE + file, ...cdns]) {
    try {
      await loadScript(u);
      if (test()) return true;
    } catch (e) {}
  }
  return false;
}
function logoPNG() {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const h = 180,
        r = (img.naturalWidth || 520) / (img.naturalHeight || 80),
        c = document.createElement('canvas');
      c.width = Math.round(h * r);
      c.height = h;
      const x = c.getContext('2d');
      x.fillStyle = '#fff';
      x.fillRect(0, 0, c.width, h);
      x.drawImage(img, 0, 0, c.width, h);
      res({ data: c.toDataURL('image/jpeg', 0.95), ratio: r });
    };
    img.onerror = () => res(null);
    img.src = logoSrc();
  });
}
/* Draws the letterhead exactly where the Acme Labs letter has it (measured from the Google Docs letter, in mm) */
function brandFont(pdf, bold) {
  const fonts = window.ACMELABS_FONTS || {};
  try {
    if (fonts.normal && !pdf.__mlBrand) {
      pdf.addFileToVFS('ML-Brand.ttf', fonts.normal);
      pdf.addFont('ML-Brand.ttf', 'MLBrand', 'normal');
      if (fonts.bold) {
        pdf.addFileToVFS('ML-Brand-Bold.ttf', fonts.bold);
        pdf.addFont('ML-Brand-Bold.ttf', 'MLBrand', 'bold');
      }
      pdf.__mlBrand = 1;
    }
    if (pdf.__mlBrand) {
      pdf.setFont('MLBrand', bold && fonts.bold ? 'bold' : 'normal');
      return true;
    }
  } catch (e) {}
  pdf.setFont('helvetica', bold ? 'bold' : 'normal');
  return false;
}
/* Draws one laid-out page body as real PDF text (selectable, searchable, sharp), using the positions the browser
   computed for the preview. Arial and Helvetica share the same letter widths, so the result matches the preview. */
const PXMM = 25.4 / 96,
  WINANSI = /^[\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]*$/;
function rgb(c) {
  const m = String(c).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
  return m && (m[4] === undefined || +m[4] > 0) ? [+m[1], +m[2], +m[3]] : null;
}
function vectorPage(pdf, pg, ox, oy) {
  const B = pg.getBoundingClientRect(),
    X = (v) => ox + (v - B.left) * PXMM,
    Y = (v) => oy + (v - B.top) * PXMM;
  // images (signature, company stamp): keep their shape inside the box
  pg.querySelectorAll('img').forEach((im) => {
    if (!im.src || !/^data:image\//.test(im.src)) return;
    const r = im.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const nw = im.naturalWidth || r.width,
      nh = im.naturalHeight || r.height,
      sc = Math.min(r.width / nw, r.height / nh),
      w = nw * sc,
      hh = nh * sc;
    // same place inside its box as on screen (the signature sits at the left bottom, not the middle)
    const op = (getComputedStyle(im).objectPosition || '50% 50%').split(' ').map((x) => parseFloat(x) / 100),
      fx = isNaN(op[0]) ? 0.5 : op[0],
      fy = isNaN(op[1]) ? 0.5 : op[1];
    const ox2 = r.left + (r.width - w) * fx,
      oy2 = r.top + (r.height - hh) * fy;
    pdf.addImage(
      im.src,
      /^data:image\/jpe?g/.test(im.src) ? 'JPEG' : 'PNG',
      X(ox2),
      Y(oy2),
      w * PXMM,
      hh * PXMM,
      'img_' + (im.dataset.aid || Math.random().toString(36).slice(2)),
      'FAST',
    );
  });
  // table cells: fills and borders
  pg.querySelectorAll('td,th').forEach((c) => {
    const r = c.getBoundingClientRect(),
      cs = getComputedStyle(c),
      bg = rgb(cs.backgroundColor);
    if (bg && bg.join() !== '255,255,255') {
      pdf.setFillColor(...bg);
      pdf.rect(X(r.left), Y(r.top), r.width * PXMM, r.height * PXMM, 'F');
    }
    if (parseFloat(cs.borderTopWidth) > 0) {
      pdf.setDrawColor(153, 153, 153);
      pdf.setLineWidth(0.2);
      pdf.rect(X(r.left), Y(r.top), r.width * PXMM, r.height * PXMM, 'S');
    }
  });
  const setF = (cs, special) => {
    const bold = parseInt(cs.fontWeight, 10) >= 600,
      it = cs.fontStyle === 'italic';
    if (special) {
      if (!brandFont(pdf, bold)) throw new Error('No font for special characters');
    } else pdf.setFont('helvetica', bold && it ? 'bolditalic' : bold ? 'bold' : it ? 'italic' : 'normal');
    pdf.setFontSize(parseFloat(cs.fontSize) * 0.75);
    const col = rgb(cs.color) || [17, 17, 17];
    pdf.setTextColor(...col);
  };
  const asc = 0.905;
  // list markers (bullets and numbers are not text nodes)
  pg.querySelectorAll('li').forEach((li) => {
    const list = li.parentElement,
      cs = getComputedStyle(li),
      size = parseFloat(cs.fontSize);
    const rg = document.createRange();
    rg.selectNodeContents(li);
    const fr = [...rg.getClientRects()].find((r) => r.width > 0);
    if (!fr) return;
    const mk =
      list.tagName === 'OL'
        ? [...list.children].indexOf(li) + Number(list.getAttribute('start') || 1) + '.'
        : '\u2022';
    setF(cs, false);
    pdf.text(mk, X(li.getBoundingClientRect().left) - 0.28 * size * PXMM, Y(fr.top) + asc * size * PXMM, {
      align: 'right',
    });
  });
  // text, word by word at the browser's positions
  const walker = document.createTreeWalker(pg, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.data.trim()) continue;
    const el = n.parentElement,
      cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const size = parseFloat(cs.fontSize),
      up = cs.textTransform === 'uppercase',
      re = /\S+/g;
    let m;
    while ((m = re.exec(n.data))) {
      const word = m[0],
        rg = document.createRange();
      const draw = (a, b) => {
        rg.setStart(n, a);
        rg.setEnd(n, b);
        const rs = [...rg.getClientRects()].filter((r) => r.width > 0);
        if (!rs.length) return;
        let txt = n.data.slice(a, b);
        if (up) txt = txt.toUpperCase();
        if (rs.length > 1 && b - a > 1) {
          for (let k = a; k < b; k++) draw(k, k + 1);
          return;
        }
        const r = rs[0],
          special = !WINANSI.test(txt);
        if (special && txt.length > 1 && !/^[^\x20-\x7E]+$/.test(txt)) {
          // split mixed runs like "₹28,000"
          let k = a;
          while (k < b) {
            const sp = !WINANSI.test(n.data[k]);
            let e = k + 1;
            while (e < b && !WINANSI.test(n.data[e]) === sp) e++;
            draw(k, e);
            k = e;
          }
          return;
        }
        setF(cs, special);
        pdf.text(
          txt,
          X(r.left),
          Y(r.bottom) - (r.height - asc * size - (r.height - 1.117 * size) / 2) * PXMM,
        );
      };
      draw(m.index, m.index + word.length);
    }
  }
}
function richLine(pdf, segs, cx, y) {
  const W = segs.map((s) => {
    s.brand ? brandFont(pdf) : pdf.setFont('times', 'normal');
    pdf.setFontSize(s.size);
    return pdf.getTextWidth(s.t);
  });
  let x = cx - W.reduce((a, b) => a + b, 0) / 2;
  segs.forEach((s, k) => {
    s.brand ? brandFont(pdf) : pdf.setFont('times', 'normal');
    pdf.setFontSize(s.size);
    const col = s.link ? [17, 85, 204] : s.blue ? [64, 117, 221] : [17, 17, 17];
    pdf.setTextColor(...col);
    pdf.text(s.t, x, y);
    if (s.link) {
      pdf.setDrawColor(17, 85, 204);
      pdf.setLineWidth(0.15);
      pdf.line(x, y + 0.7, x + W[k], y + 0.7);
      pdf.link(x, y - 3.2, W[k], 4, { url: s.link });
    }
    x += W[k];
  });
}
function linkSegs(t, size) {
  const out = [],
    re = /([\w.+-]+@[\w-]+\.[\w.]+|(?:https?:\/\/)?www\.[\w.-]+\.[a-z]{2,}[^\s|]*)/gi;
  let last = 0,
    m;
  while ((m = re.exec(t))) {
    if (m.index > last) out.push({ t: t.slice(last, m.index), size });
    const u = m[1];
    out.push({ t: u, size, link: u.includes('@') ? 'mailto:' + u : /^https?:/.test(u) ? u : 'https://' + u });
    last = m.index + u.length;
  }
  if (last < t.length) out.push({ t: t.slice(last), size });
  return out;
}
/* The Orbit Studio / Crimson Works / Tealwave Technosoft letterhead, at the same places as the preview (1 px = 0.2646 mm) */
function drawBrandLetterhead(pdf, lp, B) {
  const L = S.docSettings,
    has = (x) => x && String(x).trim(),
    grey = [85, 85, 85],
    ML = 22.5,
    MR = 187.5;
  const link = (t, x, y, w) =>
    pdf.link(x, y - 3, w, 3.8, {
      url: t.includes('@') ? 'mailto:' + t : /^https?:/.test(t) ? t : 'https://' + t,
    });
  if (B.band) {
    pdf.setFillColor(...B.band);
    pdf.rect(0, 0, 210, 2.65, 'F');
    pdf.rect(0, 294.35, 210, 2.65, 'F');
    if (B.bandLine) {
      pdf.setFillColor(...B.bandLine);
      pdf.rect(0, 2.65, 210, 0.53, 'F');
    }
  }
  const lines = [L.addr1, L.addr2].filter(has).map(String);
  if (B.layout === 'center') {
    if (lp) {
      const h = 14.8,
        w = Math.min(h * lp.ratio, 90);
      pdf.addImage(lp.data, 'JPEG', 105 - w / 2, 3.9, w, w / lp.ratio, 'lhlogo');
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.6);
    const parts = lines.concat(has(L.web) ? [L.web] : []),
      sep = '   |   ',
      full = parts.join(sep);
    let x = 105 - pdf.getTextWidth(full) / 2;
    parts.forEach((t, k) => {
      const web = has(L.web) && k === parts.length - 1;
      pdf.setTextColor(...(web ? B.accent : grey));
      pdf.text(t, x, 24.3);
      if (web) link(t, x, 24.3, pdf.getTextWidth(t));
      x += pdf.getTextWidth(t);
      if (k < parts.length - 1) {
        pdf.setTextColor(...grey);
        pdf.text(sep, x, 24.3);
        x += pdf.getTextWidth(sep);
      }
    });
  } else {
    if (lp) {
      const h = 12.2,
        w = Math.min(h * lp.ratio, 80);
      pdf.addImage(lp.data, 'JPEG', ML, 9.3 + (h - w / lp.ratio) / 2, w, w / lp.ratio, 'lhlogo');
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...B.ink);
    let y = 11.4;
    pdf.text(L.company || '', MR, y, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.6);
    lines.forEach((t) => {
      y += 4;
      pdf.setTextColor(...grey);
      pdf.text(t, MR, y, { align: 'right' });
    });
    if (has(L.web)) {
      y += 4;
      const w = pdf.getTextWidth(L.web);
      pdf.setTextColor(...B.ink);
      pdf.text(L.web, MR, y, { align: 'right' });
      link(L.web, MR - w, y, w);
    }
  }
  pdf.setDrawColor(...B.accent);
  pdf.setLineWidth(0.42);
  pdf.line(ML, 29.1, MR, 29.1);
  if (B.double) {
    pdf.setLineWidth(0.15);
    pdf.line(ML, 30, MR, 30);
  }
  // footer: the same as the Acme Labs footer, with this company's rule colour
  pdf.setLineWidth(0.38);
  pdf.line(0.5, 277.2, 208.6, 277.2);
  richLine(
    pdf,
    [
      { t: L.company || '', size: 11, brand: 1 },
      { t: lhBrandAddr(), size: 11 },
    ].filter((s) => s.t),
    105,
    282.8,
  );
  lhBrandFootLines().forEach((t, k) => richLine(pdf, linkSegs(t, 11), 105, 287.2 + k * 4.2));
}
function drawLetterhead(pdf, lp, i, n) {
  if (lhBrand().layout) return drawBrandLetterhead(pdf, lp, lhBrand());
  const L = S.docSettings,
    co = L.company || '',
    a = /Lab$/.test(co) ? co.slice(0, -3) : co,
    b = /Lab$/.test(co) ? 'Lab' : '',
    R = 206.5;
  if (lp) {
    const h = 14.6,
      w = Math.min(h * lp.ratio, 110);
    pdf.addImage(lp.data, 'JPEG', 3.9, 9.5, w, w / lp.ratio, 'lhlogo');
  }
  brandFont(pdf);
  pdf.setFontSize(17);
  const wa = pdf.getTextWidth(a),
    wb = b ? pdf.getTextWidth(b) : 0;
  pdf.setTextColor(17, 17, 17);
  pdf.text(a, R - wa - wb, 11.2);
  if (b) {
    pdf.setTextColor(64, 117, 221);
    pdf.text(b, R - wb, 11.2);
  }
  pdf.setFont('times', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(17, 17, 17);
  pdf.text(L.addr1 || '', R, 16.6, { align: 'right' });
  pdf.text(L.addr2 || '', R, 20.8, { align: 'right' });
  const web = L.web || '';
  if (web) {
    const ww = pdf.getTextWidth(web);
    pdf.setTextColor(17, 85, 204);
    pdf.text(web, R - ww, 25);
    pdf.setDrawColor(17, 85, 204);
    pdf.setLineWidth(0.15);
    pdf.line(R - ww, 25.7, R, 25.7);
    pdf.link(R - ww, 22, ww, 4, { url: 'https://' + web.replace(/^https?:\/\//, '') });
  }
  pdf.setDrawColor(136, 136, 136);
  pdf.setLineWidth(0.38);
  pdf.line(1, 29.5, 208.6, 29.5);
  pdf.line(0.5, 277.2, 208.6, 277.2);
  richLine(
    pdf,
    [
      { t: a, size: 11, brand: 1 },
      { t: b, size: 11, brand: 1, blue: 1 },
      { t: ` | ${L.addr1}, ${L.addr2}`, size: 11 },
    ].filter((s) => s.t),
    105,
    282.8,
  );
  richLine(pdf, linkSegs(L.emails || '', 11), 105, 287.2);
  richLine(pdf, [{ t: `Phone: ${L.phone} | `, size: 11 }, ...linkSegs(web, 11)], 105, 291.4);
}
/* lays the letter out into A4 pages (174 x 233 mm text area) without splitting paragraphs, list items, table rows or signature blocks */
const PW = 623.6,
  PH = 872; // 165 mm wide text block, 22.5 mm side margins as in the Acme Labs letter
function paginate(box, lvl = 0) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:0;top:0;z-index:-1;pointer-events:none;background:#fff';
  document.body.appendChild(host);
  const meas = document.createElement('div');
  meas.className = 'lbody pdfmode dens-' + lvl;
  meas.style.width = PW + 'px';
  host.appendChild(meas);
  const items = [];
  const flat = (n) =>
    [...n.children].forEach((c) => {
      if (c.classList.contains('pbspace')) return;
      if (c.classList.contains('pb') || c.classList.contains('html2pdf__page-break')) items.push('BREAK');
      else if (
        c.tagName === 'DIV' &&
        !c.className &&
        c.children.length &&
        ![...c.childNodes].some((t) => t.nodeType === 3 && t.textContent.trim())
      )
        flat(c);
      else items.push(c);
    });
  flat(box);
  const measure = () => {
    const real = items.filter((x) => x !== 'BREAK');
    meas.innerHTML = '';
    real.forEach((x) => meas.appendChild(x));
    const s = document.createElement('div');
    meas.appendChild(s);
    const t = real.map((x) => x.getBoundingClientRect().top).concat(s.getBoundingClientRect().top);
    const H = new Map();
    real.forEach((x, k) => H.set(x, t[k + 1] - t[k]));
    s.remove();
    return H;
  };
  let H = measure();
  // split lists that are too tall for one page
  for (let k = 0; k < items.length; k++) {
    const x = items[k];
    if (x === 'BREAK' || !/^(UL|OL)$/.test(x.tagName) || H.get(x) <= PH * 0.8) continue;
    const lis = [...x.children],
      parts = [];
    let part = null,
      h = 0,
      start = Number(x.getAttribute('start') || 1),
      n = 0;
    lis.forEach((li) => {
      const lh = li.getBoundingClientRect().height + 4;
      if (!part || h + lh > PH * 0.8) {
        part = x.cloneNode(false);
        if (x.tagName === 'OL') part.setAttribute('start', start + n);
        parts.push(part);
        h = 0;
      }
      part.appendChild(li);
      h += lh;
      n++;
    });
    items.splice(k, 1, ...parts);
    k += parts.length - 1;
  }
  H = measure();
  const keepNext = (x) =>
    x.tagName === 'H4' ||
    (x.tagName === 'P' &&
      x.children.length === 1 &&
      x.firstElementChild.tagName === 'B' &&
      x.textContent.trim() === x.firstElementChild.textContent.trim()) ||
    ['meta', 'subj', 'ttl', 'twc', 'annex', 'to', 'tcap'].some((c) => x.classList.contains(c)) ||
    (x.tagName === 'P' &&
      x.nextElementSibling &&
      (/^(UL|OL|TABLE)$/.test(x.nextElementSibling.tagName) ||
        x.nextElementSibling.classList.contains('sig')));
  const pages = [[]],
    forced = [false];
  let cur = 0;
  for (const x of items) {
    if (x === 'BREAK') {
      // annexures start on a new page only when less than 40% of the page is left, so no page is left mostly blank
      if (!pages[pages.length - 1].length) continue;
      if (cur > PH * 0.6) {
        pages.push([]);
        forced.push(true);
        cur = 0;
      } else {
        const mk = document.createElement('div');
        mk.className = 'pb';
        const gap = document.createElement('div');
        gap.className = 'pbspace';
        gap.style.height = '30px';
        H.set(mk, 0);
        H.set(gap, 30);
        pages[pages.length - 1].push(mk, gap);
        cur += 30;
      }
      continue;
    }
    const h = H.get(x);
    if (cur > 0 && cur + h > PH) {
      const pg = pages[pages.length - 1],
        carry = [];
      while (pg.length > 1 && keepNext(pg[pg.length - 1])) carry.unshift(pg.pop());
      pages.push(carry);
      forced.push(false);
      cur = carry.reduce((s, c) => s + H.get(c), 0);
    }
    pages[pages.length - 1].push(x);
    cur += h;
  }
  meas.remove();
  const keep = pages.map((p, k) => (p.length ? k : -1)).filter((k) => k >= 0);
  return {
    host,
    lvl,
    lastFill: cur / PH,
    pages: keep.map((k) => pages[k]),
    forced: keep.map((k) => forced[k]),
  };
}
/* Avoids a nearly empty last page: if the last page is less than 40% full, tighten the spacing a little
   (two steps) and keep the tighter layout only when it saves a page. Preview, PDF and print use the same result. */
function fitLayout(html) {
  const run = (lvl) => {
    const b = document.createElement('div');
    b.innerHTML = html;
    return paginate(b, lvl);
  };
  const base = run(0);
  if (base.pages.length < 2 || base.lastFill >= 0.4) return base;
  for (const lvl of [1, 2]) {
    const t = run(lvl);
    if (t.pages.length < base.pages.length) {
      base.host.remove();
      return t;
    }
    t.host.remove();
  }
  return base;
}
async function makePdf(D, V, html, mode, win) {
  const btns = ['dPdf', 'dPdfTop', 'dPrint'].map($),
    label = btns.map((b) => b.textContent);
  btns.forEach((b) => {
    b.disabled = true;
  });
  $(mode === 'print' ? 'dPrint' : 'dPdfTop').textContent = 'Making PDF…';
  let host = null;
  try {
    const Pdf = window.jspdf && window.jspdf.jsPDF;
    if (!Pdf) {
      alert('The PDF library is unavailable. Refresh the portal and try again.');
      return;
    }
    const lp = await logoPNG();
    const lay = fitLayout(cleanBody(html).innerHTML);
    host = lay.host;
    const pdf = new Pdf({ unit: 'mm', format: 'a4', orientation: 'portrait' }),
      n = lay.pages.length;
    for (let k = 0; k < n; k++) {
      const pg = document.createElement('div');
      pg.className = 'lbody pdfmode dens-' + lay.lvl;
      pg.style.cssText = `width:${PW}px;background:#fff`;
      lay.pages[k].forEach((x) => pg.appendChild(x));
      host.innerHTML = '';
      host.appendChild(pg);
      if (k) pdf.addPage();
      let vector = true;
      try {
        vectorPage(pdf, pg, 22.5, 36.5);
      } catch (err) {
        vector = false;
        console.warn('Text PDF not possible for this page, using an image instead', err);
      }
      if (!vector) {
        if (
          !(await needLib(() => typeof window.html2canvas === 'function', 'html2canvas.min.js', [
            'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
          ]))
        )
          throw new Error('html2canvas missing');
        const c = await html2canvas(pg, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: document.documentElement.clientWidth,
        });
        pdf.setFillColor(255, 255, 255);
        pdf.rect(22, 36, 166, 234, 'F');
        pdf.addImage(
          c.toDataURL('image/jpeg', 0.92),
          'JPEG',
          22.5,
          36.5,
          165,
          Math.min(232, (c.height / c.width) * 165),
          'pg' + k,
        );
      }
      drawLetterhead(pdf, lp, k + 1, n);
    }
    if (mode === 'print') {
      const url = pdf.output('bloburl');
      if (win && !win.closed) win.location.href = url;
      else window.open(url, '_blank');
    } else pdf.save(docFileName(D, V) + '.pdf');
    logDoc(D, V, html);
    flash(`${mode === 'print' ? 'Opened for printing' : 'Downloaded'}: ${D.label}`);
  } catch (e) {
    console.error(e);
    if (win && !win.closed) win.close();
    alert('The PDF could not be made. Try again, or use Word (.docx).');
  } finally {
    if (host) host.remove();
    btns.forEach((b, k) => {
      b.disabled = false;
      b.textContent = label[k];
    });
  }
}
function startPdf(mode) {
  const D = DOCS[dType],
    V = dVals();
  if (!checkMissing()) return;
  let win = null;
  if (mode === 'print') {
    win = window.open('', '_blank');
    if (win)
      win.document.write('<p style="font:16px Arial;padding:24px">Preparing the document for printing…</p>');
  }
  makePdf(D, V, curHTML(), mode, win);
}
$('dPdf').onclick = () => startPdf('save');
$('dPdfTop').onclick = () => startPdf('save');
$('dPrint').onclick = () => printDoc();
/* Print: prints the A4 letterhead pages exactly as shown (sharp text, one sheet per page) */
const DOC_CSS = __DOC_CSS__; // build.py puts styles/documents.css here (used when printing letters)
function printDoc() {
  const D = DOCS[dType],
    V = dVals();
  if (!checkMissing()) return;
  const pages = [...$('dPages').querySelectorAll('.a4')]
    .map((a) => {
      const c = a.cloneNode(true);
      c.querySelectorAll('.ph').forEach((x) => x.replaceWith(document.createTextNode(x.textContent)));
      c.querySelectorAll('[contenteditable]').forEach((x) => x.removeAttribute('contenteditable'));
      return c.outerHTML;
    })
    .join('');
  const fonts = [...document.querySelectorAll('style')]
    .map((x) => x.textContent)
    .filter((t) => t.includes('@font-face'))
    .join('\n');
  const old = document.getElementById('dPrintFrame');
  if (old) old.remove();
  const f = document.createElement('iframe');
  f.id = 'dPrintFrame';
  f.setAttribute('aria-hidden', 'true');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(f);
  const d = f.contentDocument;
  d.open();
  d.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(docFileName(D, V))}</title><style>${fonts}\n${DOC_CSS}
@page{size:A4;margin:0} html,body{margin:0;padding:0;background:#fff}
.a4{margin:0!important;box-shadow:none!important;height:1122px!important;break-after:page;page-break-after:always}
.a4:last-child{break-after:auto;page-break-after:auto}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${pages}</body></html>`);
  d.close();
  const go = () => {
    try {
      f.contentWindow.focus();
      f.contentWindow.print();
    } catch (e) {
      alert('Printing could not start. Use PDF and print the downloaded file instead.');
    }
    logDoc(D, V, curHTML());
    flash(`Sent to printer: ${D.label}`);
  };
  Promise.all(
    [...d.images].map((i) =>
      i.complete
        ? 1
        : new Promise((r) => {
            i.onload = i.onerror = r;
          }),
    ),
  ).then(() => setTimeout(go, 200));
}
async function doWord() {
  const D = DOCS[dType],
    V = dVals();
  if (!checkMissing()) return;
  const html = curHTML();
  const btn = $('dWord');
  btn.disabled = true;
  $('dWordTop').disabled = true;
  btn.textContent = 'Making Word file…';
  try {
    if (!(await needDOCX())) return;
    const blob = await makeDocx(cleanBody(html), await logoPNG());
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = docFileName(D, V) + '.docx';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    logDoc(D, V, html);
    flash(`Downloaded ${D.label}`);
  } catch (e) {
    console.error(e);
    alert('The Word file could not be made. Try again, or use PDF.');
  } finally {
    btn.disabled = false;
    $('dWordTop').disabled = false;
    btn.textContent = 'Download Word';
  }
}
$('dWord').onclick = doWord;
$('dWordTop').onclick = doWord;
async function needDOCX() {
  if (
    await needLib(() => !!(window.docx && window.docx.Packer), 'docx.umd.js', [
      'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
      'https://unpkg.com/docx@8.5.0/build/index.umd.js',
    ])
  )
    return true;
  alert(
    'docx.umd.js is missing from the portal folder. Keep all files from the Acme Labs HRMS_files folder together, or connect to the internet and try again.',
  );
  return false;
}
