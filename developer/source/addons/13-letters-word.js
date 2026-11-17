/* Letters, part 4 of 4: Word (.docx) export with the letterhead on every page. */
/* Turns the letter preview into a real .docx with the letterhead (logo, address, footer) on every page */
async function makeDocx(box, lp) {
  const X = window.docx,
    L = S.docSettings,
    FONT = 'Arial',
    SZ = 22,
    TW = 9354; // A4 width minus 1.8 cm margins, in twips
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ImageRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    AlignmentType,
    TabStopType,
    Header,
    Footer,
    ShadingType,
    PageBreak,
    LevelFormat,
    VerticalAlign,
    ExternalHyperlink,
  } = X;
  const NB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    noB = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };
  const LINE = { style: BorderStyle.SINGLE, size: 6, color: '999999' },
    cellB = { top: LINE, bottom: LINE, left: LINE, right: LINE };
  const sp = { after: 140, line: 276 };
  let olCount = 0;
  // inline content -> runs
  const runs = (node, f = {}) => {
    const out = [];
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        const t = n.textContent.replace(/\s+/g, ' ');
        if (t)
          out.push(
            new TextRun({
              text: f.caps ? t.toUpperCase() : t,
              bold: f.b,
              italics: f.i,
              underline: f.u ? {} : undefined,
              size: f.sz || SZ,
              font: FONT,
              color: f.color,
            }),
          );
      } else if (n.nodeType === 1) {
        const tg = n.tagName;
        if (tg === 'BR') out.push(new TextRun({ break: 1 }));
        else
          out.push(
            ...runs(n, {
              ...f,
              b: f.b || tg === 'B' || tg === 'STRONG',
              i: f.i || tg === 'I' || tg === 'EM',
              u: f.u || tg === 'U',
            }),
          );
      }
    });
    return out;
  };
  const P = (node, o = {}) =>
    new Paragraph({
      children: runs(node, o.f || {}),
      spacing: o.spacing || sp,
      alignment: o.align,
      keepNext: o.keepNext,
      keepLines: true,
      tabStops: o.tabs,
    });
  const blocks = (node) => {
    const out = [];
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        if (n.textContent.trim())
          out.push(
            new Paragraph({
              children: [new TextRun({ text: n.textContent.trim(), size: SZ, font: FONT })],
              spacing: sp,
            }),
          );
        return;
      }
      if (n.nodeType !== 1) return;
      const c = n.classList,
        tg = n.tagName;
      if (c.contains('pb') || c.contains('html2pdf__page-break'))
        out.push(new Paragraph({ spacing: { before: 360, after: 0 } }));
      else if (c.contains('meta')) {
        const [a, b] = n.children;
        out.push(
          new Paragraph({
            children: [...runs(a, { b: 1 }), new TextRun({ text: '\t' }), ...runs(b, { b: 1 })],
            tabStops: [{ type: TabStopType.RIGHT, position: TW }],
            spacing: { after: 320 },
          }),
        );
      } else if (c.contains('subj'))
        out.push(
          P(n, { f: { b: 1, sz: 26 }, align: AlignmentType.CENTER, spacing: { before: 120, after: 300 } }),
        );
      else if (c.contains('ttl'))
        out.push(
          P(n, {
            f: { b: 1, sz: 26, caps: 1 },
            align: AlignmentType.CENTER,
            spacing: { before: 120, after: 80 },
          }),
        );
      else if (c.contains('twc'))
        out.push(
          P(n, { f: { b: 1, sz: 20, caps: 1 }, align: AlignmentType.CENTER, spacing: { after: 300 } }),
        );
      else if (c.contains('annex'))
        out.push(P(n, { f: { b: 1, sz: 24 }, align: AlignmentType.CENTER, spacing: { after: 260 } }));
      else if (c.contains('to')) out.push(P(n, { spacing: { after: 240, line: 276 } }));
      else if (c.contains('tcap'))
        out.push(P(n, { f: { b: 1 }, keepNext: true, spacing: { before: 160, after: 80, line: 276 } }));
      else if (c.contains('sig')) {
        const cols = [...n.children],
          w = Math.floor(100 / cols.length);
        out.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noB,
            rows: [
              new TableRow({
                cantSplit: true,
                children: cols.map(
                  (col) =>
                    new TableCell({
                      borders: noB,
                      width: { size: w, type: WidthType.PERCENTAGE },
                      children: [...col.children].flatMap((x) =>
                        x.classList.contains('sp')
                          ? x.querySelector('img')
                            ? [
                                new Paragraph({
                                  spacing: { before: 60, after: 60 },
                                  keepNext: true,
                                  children: [...x.querySelectorAll('img')]
                                    .map((im) => {
                                      const st = im.classList.contains('stampimg'),
                                        h = st ? 80 : 56,
                                        ar = (im.naturalWidth || 1) / (im.naturalHeight || 1);
                                      return new ImageRun({
                                        data: Uint8Array.from(atob(im.src.split(',')[1]), (c) =>
                                          c.charCodeAt(0),
                                        ),
                                        transformation: {
                                          width: Math.round(Math.min(st ? 170 : 190, h * ar)),
                                          height: Math.round(Math.min(st ? 170 : 190, h * ar) / ar),
                                        },
                                      });
                                    })
                                    .reduce(
                                      (acc, r, k) =>
                                        k ? acc.concat([new TextRun({ text: '   ' }), r]) : [r],
                                      [],
                                    ),
                                }),
                              ]
                            : [
                                new Paragraph({ spacing: { after: 0 } }),
                                new Paragraph({ spacing: { after: 0 } }),
                                new Paragraph({ spacing: { after: 0 } }),
                              ]
                          : [P(x, { spacing: { after: 0, line: 276 }, keepNext: true })],
                      ),
                    }),
                ),
              }),
            ],
          }),
        );
        out.push(new Paragraph({ spacing: { after: 120 } }));
      } else if (tg === 'H4')
        out.push(P(n, { f: { b: 1 }, keepNext: true, spacing: { before: 200, after: 80, line: 276 } }));
      else if (tg === 'P')
        out.push(
          P(n, {
            keepNext:
              (n.parentNode.classList.contains('cl') && n === n.parentNode.firstElementChild) ||
              !!(
                n.nextElementSibling &&
                (n.nextElementSibling.classList.contains('sig') ||
                  /^(UL|OL|TABLE)$/.test(n.nextElementSibling.tagName))
              ),
          }),
        );
      else if (tg === 'UL' || tg === 'OL') {
        const inst = ++olCount;
        [...n.children].forEach((li) =>
          out.push(
            new Paragraph({
              children: runs(li),
              spacing: { after: 60, line: 276 },
              keepLines: true,
              ...(tg === 'UL'
                ? { bullet: { level: 0 } }
                : { numbering: { reference: 'ml-ol', level: 0, instance: inst } }),
            }),
          ),
        );
        out.push(new Paragraph({ spacing: { after: 60 } }));
      } else if (tg === 'TABLE') {
        const rows = [...n.querySelectorAll('tr')];
        out.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: rows.map(
              (tr, ri) =>
                new TableRow({
                  cantSplit: true,
                  tableHeader: ri === 0,
                  children: [...tr.children].map((td, ci) => {
                    const span = td.colSpan || 1,
                      sh = tr.classList.contains('sh');
                    return new TableCell({
                      borders: cellB,
                      columnSpan: span > 1 ? span : undefined,
                      width: { size: span > 1 ? 100 : ci === 0 ? 58 : 21, type: WidthType.PERCENTAGE },
                      verticalAlign: VerticalAlign.CENTER,
                      margins: { top: 60, bottom: 60, left: 110, right: 110 },
                      shading:
                        td.tagName === 'TH' || tr.classList.contains('t') || sh
                          ? {
                              type: ShadingType.CLEAR,
                              color: 'auto',
                              fill: td.tagName === 'TH' ? 'F2F2F2' : sh ? 'FBFBFB' : 'F7F7F7',
                            }
                          : undefined,
                      children: [
                        new Paragraph({
                          children: runs(td, { b: td.tagName === 'TH' || tr.classList.contains('t'), i: sh }),
                          alignment: td.classList.contains('n') ? AlignmentType.RIGHT : AlignmentType.LEFT,
                          spacing: { after: 0 },
                        }),
                      ],
                    });
                  }),
                }),
            ),
          }),
        );
        out.push(new Paragraph({ spacing: { after: 120 } }));
      } else out.push(...blocks(n)); // .cl, plain divs from editing, etc.
    });
    return out;
  };
  // letterhead
  const co = L.company || '',
    coA = /Lab$/.test(co) ? co.slice(0, -3) : co,
    coB = /Lab$/.test(co) ? 'Lab' : '';
  const logoBytes = lp ? Uint8Array.from(atob(lp.data.split(',')[1]), (ch) => ch.charCodeAt(0)) : null;
  const BR = lhBrand().layout ? lhBrand() : null, // Orbit Studio / Crimson Works / Tealwave Technosoft letterhead
    hex = (c) =>
      c
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase(),
    filled = (x) => x && String(x).trim();
  const SERIF = BR ? 'Arial' : 'Cambria',
    LINKC = BR ? hex(BR.ink) : '1155CC',
    GRAYL = { style: BorderStyle.SINGLE, size: 9, color: BR ? hex(BR.accent) : '888888', space: 1 };
  const rightLine = (t, o = {}) =>
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 0, line: 240 },
      children: [
        o.u
          ? new ExternalHyperlink({
              link: 'https://' + t.replace(/^https?:\/\//, ''),
              children: [new TextRun({ text: t, font: SERIF, size: 20, color: LINKC, underline: {} })],
            })
          : new TextRun({ text: t, font: SERIF, size: BR ? 18 : 20, color: BR ? '555555' : undefined }),
      ],
    });
  const brandLogo = (h) =>
    logoBytes
      ? [new ImageRun({ data: logoBytes, transformation: { width: Math.round(h * lp.ratio), height: h } })]
      : [new TextRun({ text: co, bold: true, size: 40, font: FONT })];
  const brandRule = () => new Paragraph({ spacing: { before: 60, after: 0 }, border: { bottom: GRAYL } });
  const brandHeader =
    BR &&
    new Header({
      children:
        BR.layout === 'center'
          ? [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 60 },
                children: brandLogo(54),
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                children: [
                  new TextRun({
                    text: [L.addr1, L.addr2, L.web].filter(filled).join('   |   '),
                    font: SERIF,
                    size: 18,
                    color: '555555',
                  }),
                ],
              }),
              brandRule(),
            ]
          : [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: noB,
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        borders: noB,
                        width: { size: 55, type: WidthType.PERCENTAGE },
                        margins: { left: 0, right: 0 },
                        children: [
                          new Paragraph({ spacing: { before: 120, after: 0 }, children: brandLogo(44) }),
                        ],
                      }),
                      new TableCell({
                        borders: noB,
                        width: { size: 45, type: WidthType.PERCENTAGE },
                        margins: { left: 0, right: 0 },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            spacing: { after: 20 },
                            children: [
                              new TextRun({ text: co, font: SERIF, size: 21, bold: true, color: hex(BR.ink) }),
                            ],
                          }),
                          ...[L.addr1, L.addr2].filter(filled).map((t) => rightLine(String(t))),
                          ...(filled(L.web) ? [rightLine(L.web, { u: 1 })] : []),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              brandRule(),
            ],
    });
  const header = brandHeader || new Header({
    children: [
      new Table({
        width: { size: 11565, type: WidthType.DXA },
        indent: { size: -1055, type: WidthType.DXA },
        columnWidths: [6400, 5165],
        borders: noB,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: noB,
                width: { size: 6400, type: WidthType.DXA },
                margins: { left: 0, right: 0 },
                children: [
                  new Paragraph({
                    spacing: { before: 220, after: 0 },
                    children: logoBytes
                      ? [
                          new ImageRun({
                            data: logoBytes,
                            transformation: { width: Math.round(55 * lp.ratio), height: 55 },
                          }),
                        ]
                      : [new TextRun({ text: co, bold: true, size: 40, font: FONT })],
                  }),
                ],
              }),
              new TableCell({
                borders: noB,
                width: { size: 5165, type: WidthType.DXA },
                margins: { left: 0, right: 0 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 40 },
                    children: [
                      new TextRun({ text: coA, font: FONT, size: 34 }),
                      new TextRun({ text: coB, font: FONT, size: 34, color: '4075DD' }),
                    ],
                  }),
                  rightLine(L.addr1 || ''),
                  rightLine(L.addr2 || ''),
                  rightLine(L.web || '', { u: 1 }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 60, after: 0 },
        indent: { left: -1220, right: -1220 },
        border: { bottom: GRAYL },
      }),
    ],
  });
  const fr = (t, o = {}) => new TextRun({ text: t, font: o.brand ? FONT : 'Cambria', size: 22, color: o.color });
  const linkRuns = (t) => {
    const out = [],
      re = /([\w.+-]+@[\w-]+\.[\w.]+|(?:https?:\/\/)?www\.[\w.-]+\.[a-z]{2,}[^\s|]*)/gi;
    let last = 0,
      m;
    while ((m = re.exec(t))) {
      if (m.index > last) out.push(fr(t.slice(last, m.index)));
      const u = m[1];
      out.push(
        new ExternalHyperlink({
          link: u.includes('@') ? 'mailto:' + u : /^https?:/.test(u) ? u : 'https://' + u,
          children: [new TextRun({ text: u, font: 'Cambria', size: 22, color: '1155CC', underline: {} })],
        }),
      );
      last = m.index + u.length;
    }
    if (last < t.length) out.push(fr(t.slice(last)));
    return out;
  };
  const fp = (children) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: 250 },
      indent: { left: -1220, right: -1220 },
      children,
    });
  const footer = new Footer({
    children: BR
      ? [
          // the Acme Labs footer with this company's details and rule colour
          new Paragraph({
            spacing: { after: 80 },
            indent: { left: -1250, right: -1220 },
            border: { top: GRAYL },
          }),
          fp([fr(co, { brand: 1 }), fr(lhBrandAddr())]),
          ...lhBrandFootLines().map((t) => fp(linkRuns(t))),
        ]
      : [
      new Paragraph({
        spacing: { after: 80 },
        indent: { left: -1250, right: -1220 },
        border: { top: GRAYL },
      }),
      fp([fr(coA, { brand: 1 }), fr(coB, { brand: 1, color: '4075DD' }), fr(` | ${L.addr1}, ${L.addr2}`)]),
      fp(linkRuns(L.emails || '')),
      fp([fr(`Phone: ${L.phone} | `), ...linkRuns(L.web || '')]),
    ],
  });
  const doc = new Document({
    creator: co,
    title: box.querySelector('.subj,.ttl')?.textContent || 'Letter',
    styles: { default: { document: { run: { font: FONT, size: SZ } } } },
    numbering: {
      config: [
        {
          reference: 'ml-ol',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 420, hanging: 300 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 2070, bottom: 1560, left: 1276, right: 1276, header: 240, footer: 280 },
          },
        },
        headers: { default: header },
        footers: { default: footer },
        children: blocks(box),
      },
    ],
  });
  return Packer.toBlob(doc);
}
