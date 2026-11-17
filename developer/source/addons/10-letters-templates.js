/* Letters (Documents tab), part 1 of 4: the 15 letter templates, the field library and the
   checks that run before a letter is issued. */
/* ---------- DOCUMENTS: templates ---------- */
const DOC_LH_DEFAULT = {
  company: 'AcmeLabs',
  addr1: '100 Example Street, Suite 1',
  addr2: 'San Francisco, CA 94100',
  web: 'www.acmelabs.example',
  emails: 'Sales: sales@acmelabs.example | Support: support@acmelabs.example | HR: hr@acmelabs.example',
  phone: '+91 00000 00000',
  office: 'Demo Industrial Estate, Gandhinagar, Gujarat, India',
  city: 'Gandhinagar',
  signName: 'Demo Signatory',
  signTitle: 'CEO & Founder',
  hrEmail: 'hr@acmelabs.example',
  jurisdiction: 'Gandhinagar, Gujarat, India',
  logo: '',
};
/* Company letterheads. Each company has its own design, logo, details and default stamp; "Acme Labs" is the
   original letterhead. Pick one in Documents > Company letterhead. Colours are [r, g, b]. */
const LH_BRANDS = {
  acmelabs: { label: 'AcmeLabs' },
  orbit: {
    label: 'Orbit Studio',
    layout: 'left', // logo left, details right
    accent: [201, 168, 128], // gold rule
    band: [23, 23, 27], // dark band at the top and bottom of the page
    bandLine: [211, 183, 150],
    ink: [23, 23, 27],
    start: {
      company: 'Orbit Studio, Inc.',
      addr1: '200 Sample Avenue, Suite 2',
      addr2: 'Wilmington, Delaware 19801, USA',
      web: 'www.orbitstudio.example',
      defStamp: 'builtin-stamp-orbit',
    },
  },
  crimson: {
    label: 'Crimson Works',
    layout: 'left',
    accent: [230, 0, 0],
    band: [240, 0, 0], // red band
    ink: [17, 17, 17],
    start: { company: 'Crimson Works', web: 'www.crimsonworks.example', defStamp: 'none' }, // address still to come: fill it in the form
  },
  tealwave: {
    label: 'Tealwave Technosoft',
    layout: 'center', // logo in the middle, details in one line under it, double rule
    accent: [24, 140, 132], // teal
    ink: [51, 51, 51],
    double: true,
    start: {
      company: 'TEALWAVE TECHNOSOFT',
      addr1: 'Plot 1, Demo Industrial Estate',
      addr2: 'Gandhinagar, Gujarat 382000, India',
      office: 'Plot 1, Demo Industrial Estate, Gandhinagar, Gujarat 382000, India',
      city: 'Gandhinagar',
      web: '',
      reg: 'GSTIN: 24DEMOX0000X1Z0 | Udyam No.: UDYAM-GJ-00-0000000',
      defStamp: 'builtin-stamp-tealwave',
    },
  },
};
/* what is kept separately for each company */
const LH_KEYS = [
  'company',
  'addr1',
  'addr2',
  'web',
  'emails',
  'phone',
  'reg',
  'office',
  'city',
  'signName',
  'signTitle',
  'hrEmail',
  'jurisdiction',
  'defSig',
  'defStamp',
];
const lhId = () => (S.docSettings && LH_BRANDS[S.docSettings.lhId] ? S.docSettings.lhId : 'acmelabs');
const lhBrand = () => LH_BRANDS[lhId()];
/* the logo on letters: the company's own; Acme Labs letters use the HRMS logo */
const lhLogo = () => {
  const id = lhId();
  return ((S.docSettings && S.docSettings.lhLogos) || {})[id] || (id === 'acmelabs' ? appLogo() : LH_LOGOS[id]);
};
/* switch to another company's letterhead: its details are kept apart, and open drafts pick up its
   signatory, stamp and office */
function lhSwitch(id) {
  ensureDocs();
  const L = S.docSettings,
    old = lhId();
  if (!LH_BRANDS[id] || id === old) return;
  const keep = {};
  LH_KEYS.forEach((k) => (keep[k] = L[k]));
  L.lhSaved[old] = keep;
  const next = L.lhSaved[id] || {
    ...keep, // same signatory, office and courts to start with
    addr1: '',
    addr2: '',
    emails: '',
    phone: '',
    reg: '',
    ...(id === 'acmelabs' ? DOC_LH_DEFAULT : LH_BRANDS[id].start),
  };
  LH_KEYS.forEach((k) => (L[k] = next[k]));
  L.lhId = id;
  Object.values(S.docDrafts).forEach((V) => {
    Object.keys(V).forEach((k) => {
      if (((FL[k] || [])[2] || {}).lh || k === 'sigId' || k === 'stampId') delete V[k];
    });
  });
}
function ensureDocs() {
  if (!Array.isArray(S.docAssets)) S.docAssets = [];
  if (!S.docSettings || typeof S.docSettings !== 'object') S.docSettings = {};
  if (!LH_BRANDS[S.docSettings.lhId]) S.docSettings.lhId = 'acmelabs';
  if (!S.docSettings.lhSaved || typeof S.docSettings.lhSaved !== 'object') S.docSettings.lhSaved = {};
  if (!S.docSettings.lhLogos || typeof S.docSettings.lhLogos !== 'object') S.docSettings.lhLogos = {};
  for (const k in DOC_LH_DEFAULT) if (S.docSettings[k] === undefined) S.docSettings[k] = DOC_LH_DEFAULT[k];
  if (!Array.isArray(S.docs)) S.docs = [];
  if (!S.docDrafts || typeof S.docDrafts !== 'object') S.docDrafts = {};
  // the stamps that come with the HRMS (09-letter-stamps.js); one you removed stays removed
  BUILTIN_STAMPS.forEach((b) => {
    if (!S.docAssets.some((x) => x.id === b.id)) S.docAssets.push({ ...b });
  });
}
const LOGO_DEFAULT =
  'data:image/png;base64,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';
const appLogo = () => (S && S.docSettings && S.docSettings.logo) || window.ACMELABS_LOGO || LOGO_DEFAULT;
const BASE = SCRIPT_SRC.replace(/[^/]*$/, '');

/* number to words: Indian system for INR, international for USD */
const W1 = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const W10 = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const w2 = (n) => (n < 20 ? W1[n] : W10[Math.floor(n / 10)] + (n % 10 ? '-' + W1[n % 10] : ''));
const w3 = (n) =>
  n >= 100 ? W1[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + w2(n % 100) : '') : w2(n);
function wordsIN(n) {
  if (n === 0) return 'Zero';
  const p = [];
  const cr = Math.floor(n / 1e7),
    lk = Math.floor(n / 1e5) % 100,
    th = Math.floor(n / 1e3) % 100,
    r = n % 1000;
  if (cr) p.push(wordsIN(cr) + ' Crore');
  if (lk) p.push(w2(lk) + ' Lakh');
  if (th) p.push(w2(th) + ' Thousand');
  if (r) p.push(w3(r));
  return p.join(' ');
}
function wordsUS(n) {
  if (n === 0) return 'Zero';
  const p = [];
  const b = Math.floor(n / 1e9),
    m = Math.floor(n / 1e6) % 1000,
    t = Math.floor(n / 1e3) % 1000,
    r = n % 1000;
  if (b) p.push(w3(b) + ' Billion');
  if (m) p.push(w3(m) + ' Million');
  if (t) p.push(w3(t) + ' Thousand');
  if (r) p.push(w3(r));
  return p.join(' ');
}
function inWords(amount, cur) {
  const a = Math.round(Number(amount) * 100) / 100,
    whole = Math.floor(a),
    frac = Math.round((a - whole) * 100);
  if (cur === 'USD') return `US Dollars ${wordsUS(whole)}${frac ? ` and Cents ${w2(frac)}` : ''} Only`;
  return `Rupees ${wordsIN(whole)}${frac ? ` and ${w2(frac)} Paise` : ''} Only`;
}
const curSym = (c) => (c === 'USD' ? '$' : '₹');
const numFmt = (n, c) => {
  const x = Math.round(Number(n) * 100) / 100;
  return x.toLocaleString(c === 'USD' ? 'en-US' : 'en-IN', {
    minimumFractionDigits: Number.isInteger(x) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};
const moneyTxt = (n, c) => curSym(c) + numFmt(n, c);
function ordinal(d) {
  const s = ['th', 'st', 'nd', 'rd'],
    v = d % 100;
  return d + (s[(v - 20) % 10] || s[v] || s[0]);
}
function fmtLong(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return esc(iso);
  const dt = new Date(+m[1], +m[2] - 1, +m[3]);
  return `${ordinal(+m[3])} ${dt.toLocaleDateString('en-GB', { month: 'long' })} ${m[1]}`;
}
const firstName = (n) =>
  String(n || '')
    .trim()
    .replace(/^(mr|ms|mrs|dr)\.?\s+/i, '')
    .split(/\s+/)[0] || '';
function addMonthsISO(isoD, n) {
  const m = String(isoD || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m || !Number(n)) return '';
  const mi = +m[2] - 1 + Number(n),
    last = new Date(+m[1], mi + 1, 0).getDate();
  return iso(new Date(+m[1], mi, Math.min(+m[3], last)));
}
function monthsBetween(a, b) {
  const x = String(a).match(/^(\d{4})-(\d{2})-(\d{2})$/),
    y = String(b).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!x || !y) return '';
  const d1 = new Date(+x[1], +x[2] - 1, +x[3]),
    d2 = new Date(+y[1], +y[2] - 1, +y[3]);
  const days = Math.round((d2 - d1) / 864e5) + 1;
  if (days <= 0) return '';
  const mo = Math.round(days / 30.44);
  if (days < 56) {
    const w = Math.round(days / 7);
    return `${w} week${w > 1 ? 's' : ''}`;
  }
  return `${mo} month${mo > 1 ? 's' : ''}`;
}

/* field library: key -> [label, type, options] */
const FL = {
  title: ['Title', 'sel', { opts: ['', 'Mr.', 'Ms.', 'Mrs.', 'Dr.', 'None'], def: '' }],
  name: ['Full name', 'text'],
  addressAs: ['Address as (Dear …)', 'text', { hint: 'Filled in from the first name. Change it if needed.' }],
  pronoun: [
    'Refer to them as',
    'sel',
    {
      opts: ['he / his', 'she / her', 'they / their'],
      def: 'they / their',
      hint: 'Set automatically when you choose Mr., Ms. or Mrs.',
    },
  ],
  empId: ['Employee ID', 'text'],
  designation: ['Designation', 'text'],
  department: ['Department', 'text'],
  candAddress: ['Address (optional)', 'area', { opt: 1, rows: 2 }],
  empType: [
    'Employment type',
    'sel',
    { opts: ['Full-time', 'Part-time', 'Contract', 'Fixed-term'], def: 'Full-time' },
  ],
  office: ['Office address', 'text', { lh: 'office' }],
  city: ['Office city', 'text', { lh: 'city' }],
  joinDate: ['Date of joining', 'date'],
  acceptBy: ['Accept offer by', 'date'],
  reportingTo: ['Reports to (optional)', 'text', { opt: 1, ph: 'Name and designation' }],
  currency: ['Currency', 'sel', { opts: ['INR', 'USD'], def: 'INR' }],
  fixed: ['Monthly fixed salary', 'money'],
  bonus: ['Performance bonus per month (optional)', 'money', { opt: 1 }],
  accom: ['Accommodation value per month (optional)', 'money', { opt: 1 }],
  otherLabel: ['Other benefit name (optional)', 'text', { opt: 1, ph: 'e.g. Travel allowance' }],
  otherAmt: ['Other benefit per month (optional)', 'money', { opt: 1 }],
  probation: ['Probation (months)', 'num', { def: 3 }],
  notice: ['Notice period after confirmation (optional)', 'text', { opt: 1, ph: 'e.g. 30 days' }],
  docsList: [
    'Documents to bring on joining (one per line)',
    'area',
    {
      rows: 5,
      def: "Aadhaar card and PAN card\nEducational certificates and mark sheets\nExperience and relieving letters from previous employers\nLast three months' salary slips (if applicable)\nTwo passport-size photographs\nBank account details (cancelled cheque or passbook copy)",
    },
  ],
  roles: [
    'Roles and responsibilities',
    'area',
    {
      rows: 5,
      ph: 'supporting business growth initiatives, conducting market research, …',
      hint: 'Continues the sentence "your responsibilities will include …"',
    },
  ],
  inclNDA: ['Attach NDA as Annexure I', 'chk', { def: true }],
  inclSal: ['Attach salary structure as an annexure', 'chk', { def: true }],
  college: ['College or institute (optional)', 'text', { opt: 1 }],
  role: ['Internship role', 'text', { ph: 'e.g. Digital Marketing Intern' }],
  startDate: ['Start date', 'date'],
  endDate: ['End date', 'date'],
  mode: ['Work mode', 'sel', { opts: ['From the office', 'Remote', 'Hybrid'], def: 'From the office' }],
  stipend: ['Monthly stipend (leave empty if unpaid)', 'money', { opt: 1 }],
  mentor: ['Mentor or reporting manager (optional)', 'text', { opt: 1 }],
  hours: ['Working hours', 'text', { def: 'As per company working hours' }],
  internNotice: ['Notice to end the internship early', 'text', { def: '7 days' }],
  cert: ['Internship certificate on completion', 'chk', { def: true }],
  iresp: ['Responsibilities', 'area', { rows: 4 }],
  confirmDate: ['Confirmed from', 'date'],
  newSalary: [
    'New monthly salary (optional)',
    'money',
    { opt: 1, hint: 'Leave empty if the salary does not change.' },
  ],
  remarks: ['Appreciation note (optional)', 'area', { opt: 1, rows: 3 }],
  effDate: ['Effective from', 'date'],
  curFixed: ['Current monthly fixed salary', 'money'],
  newFixed: ['New monthly fixed salary', 'money'],
  revReason: [
    'Reason',
    'area',
    { rows: 2, def: 'In recognition of your performance and contribution to the company' },
  ],
  inclTable: ['Show the revised salary table', 'chk', { def: true }],
  curDesignation: ['Current designation', 'text'],
  revDesignation: ['New designation from the same date (optional)', 'text', { opt: 1 }],
  newDesignation: ['New designation', 'text'],
  newDept: ['New department (optional)', 'text', { opt: 1 }],
  newReporting: ['New reporting manager (optional)', 'text', { opt: 1 }],
  newResp: ['Key responsibilities in the new role (optional)', 'area', { opt: 1, rows: 4 }],
  origEnd: ['Original probation end date', 'date'],
  extMonths: ['Extend by (months)', 'num', { def: 1, hint: 'Normally not more than 3 months in total.' }],
  newEnd: [
    'New probation end date (optional)',
    'date',
    { opt: 1, hint: 'Leave empty to work it out from the months above.' },
  ],
  areas: ['Areas to improve (one per line)', 'area', { rows: 4 }],
  support: ['Support the company will give (optional)', 'area', { opt: 1, rows: 3 }],
  reviewer: ['Reviewed by (optional)', 'text', { opt: 1, ph: 'Reporting manager name' }],
  lastDay: ['Last working day', 'date'],
  expResp: ['Main responsibilities (optional)', 'area', { opt: 1, rows: 3 }],
  conduct: ['How they performed', 'text', { def: 'sincere, hardworking and professional' }],
  resignDate: ['Resignation letter dated', 'date'],
  fnf: [
    'Full and final settlement',
    'sel',
    {
      opts: ['Completed', 'Not yet paid (payable within two working days of the last working day)'],
      def: 'Completed',
      hint: 'Choose "Completed" only after the settlement has actually been paid.',
    },
  ],
  handedOver: ['Handover done and company property returned', 'chk', { def: true }],
  noticeDays: ['Notice period (days)', 'num', { def: 30 }],
  waiverNote: [
    'Note about the notice period (optional)',
    'text',
    { opt: 1, ph: 'e.g. Your request for early release has been approved.' },
  ],
  handoverTo: ['Hand over work to', 'text'],
  exitList: [
    'Exit formalities (one per line)',
    'area',
    {
      rows: 5,
      def: 'Hand over all work, files and documents\nReturn your laptop, ID card, access cards and all other company property\nClear any outstanding advances or dues\nComplete the exit interview with HR',
    },
  ],
  termReason: [
    'Reason',
    'sel',
    {
      opts: [
        'Unsatisfactory performance',
        'Misconduct',
        'Violation of company policy',
        'Unauthorised absence',
        'Position made redundant',
        'Other',
      ],
      def: 'Unsatisfactory performance',
    },
  ],
  termDetails: ['Details', 'area', { rows: 5, ph: 'Facts, dates and what was done before this decision' }],
  priorRefs: [
    'Earlier warnings or reviews (optional)',
    'text',
    { opt: 1, ph: 'e.g. warning letters dated 10 and 24 August 2026' },
  ],
  noticeTerms: [
    'Notice',
    'sel',
    {
      opts: [
        'Salary in lieu of notice',
        'Serve notice until the effective date',
        'No notice pay (misconduct)',
      ],
      def: 'Salary in lieu of notice',
    },
  ],
  noticePayDays: ['Days of salary in lieu of notice', 'num', { def: 30 }],
  returnBy: ['Return company property by', 'date'],
  showCause: [
    'Show-cause notice / enquiry (required for misconduct or policy violation)',
    'text',
    { opt: 1, ph: 'e.g. show-cause notice dated 10 October 2026 and your reply dated 13 October 2026' },
  ],
  serviceYears: [
    'Completed years of continuous service (for retrenchment)',
    'num',
    { opt: 1, hint: 'Used only when the reason is "Position made redundant".' },
  ],
  termClause: [
    'Termination clause (clause 9)',
    'sel',
    {
      opts: ['Current Acme Labs wording', 'Mutual notice period (recommended)'],
      def: 'Current Acme Labs wording',
      hint: 'The current wording allows termination without notice or reason. Choose "Mutual notice period" for a clause that sets notice for both sides.',
    },
  ],
  noticeConf: ['Notice period after confirmation (days)', 'num', { def: 30 }],
  noticeProb: ['Notice period during probation (days)', 'num', { def: 15 }],
  contact: ['Contact for questions', 'text', { lh: 'hrEmail' }],
  wLevel: ['Warning level', 'sel', { opts: ['First', 'Second', 'Final'], def: 'First' }],
  wCat: [
    'Concern',
    'sel',
    {
      opts: ['Attendance and punctuality', 'Performance', 'Conduct', 'Violation of company policy', 'Other'],
      def: 'Attendance and punctuality',
    },
  ],
  incidentDate: ['Date of incident', 'date'],
  wDetails: [
    'What happened',
    'area',
    {
      rows: 4,
      ph: 'you arrived after 11:00 AM without informing your manager',
      hint: 'Continues the sentence "On [date], …"',
    },
  ],
  priorDisc: [
    'Earlier discussions (optional)',
    'text',
    { opt: 1, ph: 'e.g. verbal discussion with your manager on 5 October 2026' },
  ],
  expected: ['What we expect from now on', 'area', { rows: 3 }],
  reviewPeriod: ['Review period', 'text', { def: '30 days' }],
  replyBy: [
    'Written reply by (optional)',
    'date',
    { opt: 1, hint: 'If empty, the letter gives three working days to reply.' },
  ],
  addressee: ['Addressed to', 'text', { def: 'To Whom It May Concern' }],
  purpose: ['Purpose (optional)', 'text', { opt: 1, ph: 'e.g. bank loan application' }],
  breakup: [
    'Breakdown',
    'sel',
    {
      opts: ['Payroll structure (Basic, HRA, PF, etc.)', 'CTC components only'],
      def: 'Payroll structure (Basic, HRA, PF, etc.)',
    },
  ],
  survive: [
    'Confidentiality continues after employment for',
    'sel',
    {
      opts: ['As long as the information stays confidential', '1 year', '2 years', '3 years', '5 years'],
      def: 'As long as the information stays confidential',
    },
  ],
  jurisdiction: ['Courts with jurisdiction', 'text', { lh: 'jurisdiction' }],
  origDoc: ['Original document', 'text', { def: 'Appointment Letter' }],
  origDate: ['Original document dated', 'date'],
  changes: [
    'Changes (one per line)',
    'area',
    {
      rows: 6,
      ph: 'Clause 5, Working Hours: Your working hours will be 10:00 AM to 7:00 PM, Monday to Friday.',
    },
  ],
  addReason: ['Reason for the change (optional)', 'text', { opt: 1 }],
  ref: ['Reference number', 'text'],
  letterDate: ['Letter date', 'date'],
  signName: ['Signed by', 'text', { lh: 'signName' }],
  signTitle: ['Signatory title', 'text', { lh: 'signTitle' }],
  sigId: ['Signature', 'asset', { kind: 'signature', opt: 1 }],
  stampId: ['Company stamp', 'asset', { kind: 'stamp', opt: 1 }],
  sigSize: ['Signature size', 'sel', { opts: ['Small', 'Normal', 'Large', 'Extra large'], def: 'Normal' }],
  stampSize: [
    'Company stamp size',
    'sel',
    {
      opts: ['Small', 'Normal', 'Large', 'Extra large'],
      def: 'Normal',
      hint: 'To move the signature or the stamp, drag it with the mouse in the preview on the right.',
    },
  ],
  showRef: ['Show the reference number (Ref) on the letter', 'chk', { def: true }],
  showEmpId: ['Show the Employee ID on the letter', 'chk', { def: true }],
};
/* the fields every letter has, shown under "Letter details" */
const LETTER_KEYS = [
  'ref',
  'letterDate',
  'signName',
  'signTitle',
  'sigId',
  'stampId',
  'sigSize',
  'stampSize',
  'showRef',
  'showEmpId',
];
const EMP_KEYS = [
  'accom',
  'resignDate',
  'title',
  'name',
  'addressAs',
  'pronoun',
  'empId',
  'designation',
  'curDesignation',
  'department',
  'joinDate',
  'lastDay',
  'fixed',
  'curFixed',
  'bonus',
  'currency',
  'empType',
  'candAddress',
];

/* helpers that templates use; also records which details are still empty */
function mkH(v) {
  const miss = [];
  const type = (k) => (FL[k] || [])[1];
  const has = (k) => {
    const x = v[k];
    if (k === 'empId' && v.showEmpId === false) return false; // "Show the Employee ID" is unticked
    if (type(k) === 'chk') return !!x;
    if (type(k) === 'money' || type(k) === 'num')
      return x !== '' && x != null && !isNaN(x) && Number(x) !== 0;
    return x != null && String(x).trim() !== '';
  };
  const lab = (k) => (FL[k] || [k])[0].replace(/ \((optional|one per line|leave empty if unpaid)\)/, '');
  const ph = (k) => {
    if (!miss.includes(k)) miss.push(k);
    return `<span class="ph" data-k="${k}">[${esc(lab(k))}]</span>`;
  };
  const cur = v.currency || 'INR';
  const f = (k) => (has(k) ? esc(String(v[k]).trim()) : ph(k));
  const d = (k) => (has(k) ? fmtLong(v[k]) : ph(k));
  const n = (k) => Number(v[k]) || 0;
  const mv = (x) => moneyTxt(x, cur),
    mw = (x) => `${mv(x)} (${inWords(x, cur)})`;
  const m = (k) => (has(k) ? mv(n(k)) : ph(k)),
    mwk = (k) => (has(k) ? mw(n(k)) : ph(k));
  const lines = (k) =>
    String(v[k] || '')
      .split('\n')
      .map((s) => s.trim().replace(/^([-•*]\s*|\d+[.)]\s+)/, ''))
      .filter(Boolean);
  const ul = (k) =>
    has(k)
      ? `<ul>${lines(k)
          .map((x) => `<li>${esc(x)}</li>`)
          .join('')}</ul>`
      : `<p>${ph(k)}</p>`;
  const ol = (k) =>
    has(k)
      ? `<ol>${lines(k)
          .map((x) => `<li>${esc(x)}</li>`)
          .join('')}</ol>`
      : `<p>${ph(k)}</p>`;
  const inl = (k) => (has(k) ? esc(String(v[k]).trim()).replace(/\s*\n+\s*/g, ' ') : ph(k));
  const sen = (k) => (has(k) ? inl(k).replace(/([^.!?])$/, '$1.') : ph(k));
  const paras = (k) =>
    String(v[k] || '')
      .split(/\n\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => `<p>${esc(s).replace(/\n/g, '<br>')}</p>`)
      .join('');
  const P =
    {
      he: { sub: 'he', obj: 'him', pos: 'his', was: 'was', is: 'is', has: 'has' },
      she: { sub: 'she', obj: 'her', pos: 'her', was: 'was', is: 'is', has: 'has' },
      they: { sub: 'they', obj: 'them', pos: 'their', was: 'were', is: 'are', has: 'have' },
    }[String(v.pronoun || 'he').split(' ')[0]] || {};
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const L = S.docSettings,
    co = esc(L.company);
  const nm = () =>
    (has('title') ? (v.title === 'None' ? '' : esc(v.title) + ' ') : ph('title') + ' ') + f('name');
  const lc = (k) => (has(k) ? esc(String(v[k]).toLowerCase()) : ph(k));
  return {
    v,
    miss,
    has,
    f,
    d,
    n,
    m,
    mv,
    mw,
    mwk,
    ul,
    ol,
    inl,
    sen,
    paras,
    P,
    cap,
    co,
    nm,
    ph,
    cur,
    lc,
    b: (k) => `<b>${f(k)}</b>`,
    dear: () => `<p>Dear ${f('addressAs')},</p>`,
    meta: () =>
      `<div class="meta"><span>${v.showRef === false ? '' : `Ref: ${f('ref')}`}</span><span>Date: ${d('letterDate')}</span></div>`,
    to: (addrKey) =>
      `<div class="to">To,<br><b>${nm()}</b>${has('empId') && addrKey !== 'noid' ? `<br>Employee ID: ${esc(v.empId)}` : ''}${addrKey && has(addrKey) ? '<br>' + esc(v[addrKey]).replace(/\n/g, '<br>') : ''}</div>`,
    subj: (t) => `<div class="subj">Subject: ${t}</div>`,
  };
}
const assetById = (id) => (id && id !== 'none' ? (S.docAssets || []).find((a) => a.id === id) : null);
/* where the signature and stamp sit: moved by dragging in the preview (sigDX/sigDY, stampDX/stampDY, in px) and
   sized with "Signature size" / "Company stamp size" */
const SIG_SIZES = { Small: 0.75, Normal: 1, Large: 1.35, 'Extra large': 1.75 };
function sigTransform(v, which) {
  const x = Math.round(Number(v[which + 'DX']) || 0),
    y = Math.round(Number(v[which + 'DY']) || 0),
    s = SIG_SIZES[v[which + 'Size']] || 1;
  return x || y || s !== 1 ? `translate(${x}px,${y}px) scale(${s})` : '';
}
function sigStyle(v, which) {
  const t = sigTransform(v, which);
  return t ? ` style="transform:${t}"` : '';
}
function sigBlock(h, kind) {
  const sig = assetById(h.v.sigId),
    st = assetById(h.v.stampId);
  const sp =
    sig || st
      ? `<div class="sp spimg">${sig ? `<img class="sigimg" data-aid="${sig.id}" src="${sig.data}" alt="Signature" title="Drag to move" draggable="false"${sigStyle(h.v, 'sig')}>` : ''}${st ? `<img class="stampimg" data-aid="${st.id}" src="${st.data}" alt="Company stamp" title="Drag to move" draggable="false"${sigStyle(h.v, 'stamp')}>` : ''}</div>`
      : '<div class="sp"></div>';
  const left = `<div><div>For <b>${h.co}</b></div>${sp}<div><b>${h.f('signName')}</b></div><div>${h.f('signTitle')}</div><div>${h.co}</div></div>`;
  if (kind === 'none') return `<div class="sig">${left}</div>`;
  const lbl = kind === 'accept' ? 'Accepted by' : 'Received and acknowledged by';
  return `<div class="sig">${left}<div class="r"><div><b>${lbl}</b></div><div class="sp"></div><div><b>${h.f('name')}</b></div><div>(Signature &amp; Date)</div></div></div>`;
}
function salParts(h) {
  const v = h.v,
    r = [['Fixed Salary', 'fixed']];
  if (h.has('bonus')) r.push(['Performance Bonus', 'bonus']);
  if (h.has('accom')) r.push(['Accommodation Benefit', 'accom']);
  if (h.has('otherAmt')) r.push([v.otherLabel ? String(v.otherLabel) : 'Other Benefit', 'otherAmt']);
  return r;
}
const ctcOf = (h) => {
  const ps = payStructure(h);
  return ps ? ps.ctc : h.n('fixed') + h.n('bonus') + h.n('accom') + h.n('otherAmt');
};
/* Uses the HRMS payroll engine (salary breakup, PF / ESIC / PT and CTC rules from app.js) so letters match payroll. */
function payStructure(h, fixedKey = 'fixed') {
  const v = h.v;
  if ((v.currency || 'INR') !== 'INR' || !h.has(fixedKey)) return null;
  if (
    typeof salaryBreakup !== 'function' ||
    typeof salaryContributions !== 'function' ||
    typeof salaryPolicyFor !== 'function'
  )
    return null;
  try {
    const sal = h.n(fixedKey),
      vari = h.n('bonus'),
      accom = h.n('accom'),
      other = h.n('otherAmt');
    let date = (
      dType === 'salary' ? [v.letterDate] : [v.effDate, v.confirmDate, v.joinDate, v.startDate, v.letterDate]
    ).find((x) => /^\d{4}-\d{2}-\d{2}$/.test(x || ''));
    if (dType === 'revision' && /^\d{4}-\d{2}-\d{2}$/.test(v.letterDate || '') && date && v.letterDate > date)
      date = v.letterDate; // a back-dated revision shows the pay rules in force now
    const m = date ? date.slice(0, 7) : currentMonth();
    const real = S.employees.find((e) => e.id === v.__emp);
    const e = real
      ? { ...real, salary: sal, variable: vari }
      : {
          id: 'DOC-' + (v.ref || 'NEW'),
          name: v.name || '',
          salary: sal,
          variable: vari,
          currency: 'INR',
          location: 'India',
        };
    const policy = {
      ...(real ? salaryPolicyFor(real, m) : defaultSalaryPolicy(m, null)),
      accommodationEnabled: accom > 0,
      accommodationAmount: accom,
    };
    const parts = salaryBreakup(e, m, sal, policy).filter(([, n]) => Number(n) !== 0);
    const c = salaryContributions(
      e,
      m,
      { d: daysIn(m), lopDays: 0, earned: sal, fx: 1, vari, row: { inc: 0 }, sal },
      policy,
    );
    const ctc = r2(sal + vari + other + accom + c.employerTotal),
      take = r2(sal + vari + other - c.employeeTotal);
    return {
      m,
      parts,
      sal,
      vari,
      accom,
      other,
      otherLabel: v.otherLabel ? String(v.otherLabel) : 'Other Benefit',
      c,
      ctc,
      take,
    };
  } catch (err) {
    console.warn('Payroll structure unavailable', err);
    return null;
  }
}
/* Salary tables in the Acme Labs letter format: A. CTC, B. breakup of fixed salary, C. deductions (only when they apply) */
const stHead = (sym) =>
  `<tr><th style="width:58%">Salary Component</th><th class="n" style="width:21%">Monthly (${sym})</th><th class="n" style="width:21%">Annual (${sym})</th></tr>`;
function structTable(h, fixedKey = 'fixed') {
  const ps = payStructure(h, fixedKey);
  if (!ps) return '';
  const f = (n) => numFmt(n, 'INR'),
    row = (l, n, cls = '') =>
      `<tr${cls ? ` class="${cls}"` : ''}><td>${esc(l)}</td><td class="n">${f(n)}</td><td class="n">${f(r2(n * 12))}</td></tr>`;
  let t = `<table class="st">${stHead('₹')}${row('Fixed Salary', ps.sal)}${ps.parts.map(([l, n]) => row(l, n, 'sub')).join('')}`;
  if (ps.vari) t += row('Performance Bonus', ps.vari);
  if (ps.other) t += row(ps.otherLabel, ps.other);
  if (ps.accom) t += row('Accommodation Benefit', ps.accom);
  if (ps.c.pfEmployer) t += row('Employer PF Contribution', ps.c.pfEmployer);
  if (ps.c.esiEmployer) t += row('Employer ESIC Contribution', ps.c.esiEmployer);
  t += row('TOTAL CTC', ps.ctc, 't') + '</table>';
  const ded = [
    ['Employee PF Contribution', ps.c.pfEmployee],
    ['Employee ESIC Contribution', ps.c.esiEmployee],
    ['Professional Tax', ps.c.professionalTax],
  ].filter(([, n]) => Number(n));
  if (ded.length)
    t += `<div class="tcap">Monthly deductions (employee share)</div><table class="st">${stHead('₹')}${ded.map(([l, n]) => row(l, n)).join('')}${row('Estimated Take-home Pay (full month)', ps.take, 't')}</table>`;
  return t;
}
function salTable(h, rows) {
  const c = h.cur,
    sym = curSym(c);
  let tot = 0;
  const tr = rows
    .map(([l, k]) => {
      const has = typeof k === 'number' || h.has(k),
        x = typeof k === 'number' ? k : h.n(k);
      tot += x;
      return `<tr><td>${esc(l)}</td><td class="n">${has ? numFmt(x, c) : h.ph(k)}</td><td class="n">${has ? numFmt(x * 12, c) : ''}</td></tr>`;
    })
    .join('');
  return `<table class="st">${stHead(sym)}${tr}<tr class="t"><td>TOTAL CTC</td><td class="n">${numFmt(tot, c)}</td><td class="n">${numFmt(tot * 12, c)}</td></tr></table>`;
}
function compText(h) {
  // salary paragraphs shared by offer and appointment letters
  const tot = ctcOf(h),
    ps = payStructure(h);
  let s = `Your monthly fixed salary will be <b>${h.mwk('fixed')}</b>`;
  if (h.has('bonus'))
    s += `, along with a performance bonus of <b>${h.m('bonus')} per month</b>, subject to applicable performance criteria and company policy`;
  s += '.</p>';
  if (h.has('accom'))
    s += `<p>${h.co} will also provide accommodation valued at <b>${h.m('accom')} per month</b>, in accordance with the company's accommodation policy.</p>`;
  if (h.has('otherAmt'))
    s += `<p>You will also receive ${h.has('otherLabel') ? esc(h.v.otherLabel) : 'an additional benefit'} of <b>${h.m('otherAmt')} per month</b>, as per company policy.</p>`;
  const extra = [
    h.has('bonus') && 'the full performance bonus target',
    h.has('accom') && 'the accommodation benefit',
    h.has('otherAmt') && (h.has('otherLabel') ? esc(h.v.otherLabel) : 'other benefits'),
    ps && ps.c.employerTotal && 'employer PF / ESIC contributions',
  ].filter(Boolean);
  s += `<p>Your total monthly CTC${extra.length ? `, including ${extra.join(' and ').replace(/ and (?=.* and )/, ', ')},` : ''} will be <b>${h.has('fixed') ? h.mv(tot) : h.ph('fixed')}</b>, equivalent to an annual CTC of <b>${h.has('fixed') ? h.mw(tot * 12) : h.ph('fixed')}</b>`;
  return s;
}
const accomLine = (h, mode = '') =>
  !h.has('accom')
    ? ''
    : mode === 'cert'
      ? `<p>This CTC includes company-provided accommodation valued at <b>${h.m('accom')} per month</b> (${h.mv(h.n('accom') * 12)} a year), which is a non-cash benefit.</p>`
      : `<p>${h.co} also provides company accommodation valued at <b>${h.m('accom')} per month</b> (${h.mv(h.n('accom') * 12)} a year). This is a non-cash benefit and forms part of your CTC.</p>`;
const clause = (t, first, ...rest) =>
  `<div class="cl"><h4>${t}</h4><p>${first}</p></div>${rest.map((p) => `<p>${p}</p>`).join('')}`;
function ndaBody(h, standalone) {
  let s =
    clause(
      '1. Confidentiality Obligations',
      'The Employee agrees not to disclose, misuse, reproduce, or communicate confidential information or proprietary data obtained during employment to any unauthorized third party.',
      `The Employee shall maintain confidentiality during employment and after termination${standalone && h.v.survive && !/^As long/.test(h.v.survive) ? ` for a period of ${esc(h.v.survive)} after employment ends (and, for trade secrets, for as long as they remain trade secrets)` : ''}, subject to applicable law and the terms of this Agreement.`,
    ) +
    clause(
      '2. Definition of Confidential Information',
      '"Confidential Information" includes, but is not limited to, business plans, marketing strategies, growth plans, customer and prospect lists, lead databases, pricing information, sales records, financial information, employee information, software, algorithms, product roadmaps, internal communications, credentials, trade secrets, and other non-public information belonging to the Company or its clients.',
    ) +
    clause(
      '3. Permitted Disclosures',
      'The Employee may disclose confidential information where required by applicable law, regulation, or a valid court order. Where legally permitted, the Employee shall notify the Company promptly so that appropriate protective measures may be considered.',
      'Nothing in this Agreement prohibits lawful reporting of suspected legal violations or the exercise of any legally protected rights.',
    ) +
    clause(
      '4. Return of Company Materials',
      'Upon resignation, termination, or a written request from the Company, the Employee shall return or securely delete confidential information, documents, files, records, credentials, and other company materials, subject to applicable legal retention requirements.',
    ) +
    clause(
      '5. Intellectual Property Assignment',
      'To the extent permitted by applicable law, all work products, inventions, improvements, marketing materials, strategies, reports, campaign assets, designs, and other developments created by the Employee within the scope of employment or using Company resources shall belong to the Company.',
      "The Employee agrees to execute reasonable documents required to establish or protect the Company's rights in such work products.",
    ) +
    clause(
      '6. Non-Solicitation of Customers and Accounts',
      'During employment, the Employee shall not improperly divert Company business or use confidential information to solicit Company customers for a competing business.',
      'Any post-employment customer non-solicitation obligations shall apply only to the extent permitted by applicable law and any valid written agreement between the parties.',
    ) +
    clause(
      '7. Non-Solicitation of Employees',
      "During employment, the Employee shall not improperly induce other employees to breach their contractual obligations or misuse confidential information to interfere with the Company's workforce.",
      'Any post-employment restrictions shall be subject to applicable law.',
    ) +
    clause(
      '8. Non-Disparagement',
      'The Employee shall not knowingly make false and defamatory statements about the Company, its employees, products, or services.',
      'Nothing in this clause restricts lawful reporting, protected disclosures, truthful statements, participation in legal proceedings, or the exercise of legal rights.',
    ) +
    clause(
      '9. Remedies for Breach',
      'A breach of this Agreement may result in appropriate disciplinary action and legal remedies available under applicable law. Any injunctive or other equitable relief shall be subject to the requirements of applicable law.',
    );
  if (standalone)
    s +=
      clause(
        '10. Governing Law and Jurisdiction',
        `This Agreement is governed by the laws of India. The courts at ${h.f('jurisdiction')} shall have jurisdiction over any dispute arising out of this Agreement.`,
      ) +
      clause(
        '11. Entire Agreement',
        "This Agreement, together with the Employee's appointment letter, forms the entire understanding between the parties on confidentiality. Any change to it must be made in writing and signed by both parties.",
      );
  return s;
}

const DOCS = {
  offer: {
    code: 'OFR',
    label: 'Offer Letter',
    group: 'Hiring',
    sig: 'accept',
    sections: [
      ['Candidate', ['title', 'name', 'addressAs', 'candAddress']],
      ['Role', ['designation', 'department', 'empType', 'reportingTo', 'joinDate', 'office']],
      ['Pay', ['currency', 'fixed', 'bonus', 'accom', 'otherLabel', 'otherAmt', 'inclSal']],
      ['Terms', ['probation', 'acceptBy', 'docsList']],
    ],
    body: (h) =>
      h.meta() +
      h.to('candAddress') +
      h.subj(`Offer of Employment for the Position of ${h.f('designation')}`) +
      h.dear() +
      `<p>We are pleased to offer you the position of <b>${h.f('designation')}</b> in the ${h.f('department')} team at ${h.co}. This offer follows our recent discussions and your performance during the selection process.</p>` +
      `<p><b>1. Position and Joining:</b> This is a ${h.lc('empType')} position. Your expected date of joining is <b>${h.d('joinDate')}</b>, and you will be based at our office at ${h.f('office')}.${h.has('reportingTo') ? ` You will report to ${h.f('reportingTo')}.` : ''}</p>` +
      `<p><b>2. Compensation:</b> ${compText(h)}${h.v.inclSal ? ', as detailed in Annexure I' : ''}.</p>` +
      `<p><b>3. Probation:</b> You will be on probation for ${h.f('probation')} months from your date of joining. On successful completion of probation, your employment will be confirmed in writing.</p>` +
      `<p><b>4. Appointment Letter:</b> A formal appointment letter with detailed terms and conditions of employment will be issued to you on joining, after completion of joining formalities.</p>` +
      `<p><b>5. Documents Required on Joining:</b> Please bring the originals and self-attested copies of the following:</p>${h.ul('docsList')}` +
      `<p><b>6. Conditions of Offer:</b> This offer is subject to the accuracy of the information and documents you have provided, satisfactory verification of your background and references where applicable, and you joining on the agreed date.</p>` +
      `<p><b>7. Acceptance:</b> Please confirm your acceptance by signing and returning a copy of this letter on or before <b>${h.d('acceptBy')}</b>. If we do not receive your acceptance by this date, this offer will lapse.</p>` +
      `<p>We look forward to welcoming you to ${h.co}.</p>` +
      sigBlock(h, 'accept') +
      (h.v.inclSal
        ? `<div class="pb"></div><div class="annex">ANNEXURE I: SALARY &amp; BENEFITS STRUCTURE</div><p><b>Candidate Name:</b> ${h.f('name')}<br><b>Designation:</b> ${h.f('designation')}<br><b>Expected Date of Joining:</b> ${h.d('joinDate')}</p>` +
          (structTable(h) || salTable(h, salParts(h))) +
          `<p><b>Terms and Conditions:</b></p><ol>${h.has('bonus') ? '<li>Performance bonus is subject to performance targets and company policy.</li>' : ''}${h.has('accom') ? `<li>Accommodation is provided by ${h.co} and valued at ${h.m('accom')} per month. It is not an additional cash payment.</li>` : ''}<li>Applicable deductions will be as per company policy and applicable law.</li></ol>`
        : ''),
  },
  appointment: {
    code: 'APT',
    label: 'Appointment Letter',
    group: 'Hiring',
    sig: 'accept',
    sections: [
      ['Employee', ['title', 'name', 'addressAs', 'empId']],
      ['Role', ['designation', 'joinDate', 'office', 'city', 'roles']],
      ['Pay', ['currency', 'fixed', 'bonus', 'accom', 'otherLabel', 'otherAmt']],
      ['Terms', ['probation', 'termClause', 'noticeConf', 'noticeProb', 'inclNDA', 'inclSal']],
    ],
    body: (h) => {
      const annSal = h.v.inclNDA ? 'II' : 'I';
      return (
        h.meta() +
        h.subj(`Appointment for the Position of ${h.f('designation')}`) +
        `<p>Dear <b>${h.f('addressAs')}</b>,</p>` +
        `<p>We are pleased to appoint you to the position of <b>${h.f('designation')}</b> at ${h.co}, based on your performance during the selection process and our discussions. Your joining date will be <b>${h.d('joinDate')}</b>, and you will be based at our ${h.f('city')} office.</p>` +
        `<p><b>1. Position &amp; Location:</b> You will be designated as ${h.f('designation')} and will operate out of our office at ${h.f('office')}. You may be assigned additional responsibilities or other work locations based on company requirements and applicable employment terms.</p>` +
        `<p><b>2. Salary &amp; Benefits:</b> ${compText(h)}${h.v.inclSal ? `, as detailed in Annexure ${annSal}` : ''}.</p>` +
        (h.has('bonus') || h.has('accom')
          ? `<p>${h.has('bonus') ? 'The performance bonus is subject to applicable performance criteria and company policy. ' : ''}${h.has('accom') ? 'Accommodation is a company-provided benefit and is not an additional cash payment to the Employee.' : ''}</p>`
          : '') +
        `<p>Applicable statutory deductions, payroll treatment, and benefits will be governed by the approved salary structure, company policy, and applicable law.</p>` +
        `<p>Any future salary revision or increment will be based on your performance, responsibilities, and company policy and will be communicated separately in writing.</p>` +
        `<p><b>3. Probation Period:</b> You will be on probation for a period of ${h.f('probation')} months from your date of joining. Your performance, conduct, attendance, and suitability for the role will be reviewed during this period.</p>` +
        `<p>Upon successful completion of probation, your employment will be confirmed in writing. If your performance does not meet the company's expectations, the probation period may be extended through written communication, subject to applicable law and company policy.</p>` +
        `<p><b>4. Roles &amp; Responsibilities:</b> As ${h.f('designation')}, your responsibilities will include ${h.sen('roles')}</p>` +
        `<p>You will also be responsible for tracking relevant performance metrics, preparing reports, coordinating with internal teams, and completing other reasonable duties assigned by your reporting manager.</p>` +
        `<p><b>5. Working Hours:</b> Your work schedule will follow the company's working hours, attendance procedures, and operational requirements. You will be required to work from the ${h.co} office in ${h.f('city')}, maintain punctuality, and demonstrate flexibility based on business and project requirements.</p>` +
        `<p><b>6. Confidentiality &amp; Intellectual Property:</b> You must maintain strict confidentiality regarding ${h.co}'s internal processes, business strategies, customer information, financial data, marketing plans, product information, software, and other proprietary information.</p>` +
        `<p>All work products, reports, strategies, marketing materials, campaign assets, designs, and other intellectual property created by you within the scope of your employment or using company resources shall belong to the Company, subject to applicable law and any written agreements.</p>` +
        `<p>Unauthorized disclosure, copying, or use of confidential information may result in disciplinary action, including termination, and other remedies available under applicable law.</p>` +
        `<p><b>7. Code of Conduct:</b> You are expected to adhere to ${h.co}'s professional standards, ethics, policies, and lawful instructions from management.</p>` +
        `<p>Respectful behaviour, punctuality, teamwork, accountability, and commitment to assigned responsibilities are essential expectations. Any misconduct or violation of company policy may result in appropriate disciplinary action.</p>` +
        `<p><b>8. Leave Policy:</b> You will be entitled to leave and public holidays in accordance with the company's applicable leave policy and relevant employment laws.</p>` +
        `<p>Leave eligibility, accrual, approval procedures, and any conditions applicable during probation will be communicated by the HR department. All planned leave must be approved by your reporting manager, except in emergencies or other circumstances permitted under company policy or applicable law.</p>` +
        `<p>Unauthorized absence may be dealt with in accordance with company policy and applicable law.</p>` +
        (/^Mutual/.test(h.v.termClause || '')
          ? `<div class="cl"><p><b>9. Notice Period &amp; Termination</b></p><p>During probation, either party may end the employment by giving ${h.f('noticeProb')} days' written notice or salary in lieu of notice. After confirmation, either party may end the employment by giving ${h.f('noticeConf')} days' written notice or salary in lieu of notice.</p></div>` +
            `<p>Any waiver or adjustment of the notice period, or payment in lieu of notice, shall be subject to the Company's written approval and applicable law.</p>`
          : `<div class="cl"><p><b>9. Notice Period &amp; Termination</b></p><p>${h.co} reserves the right to terminate your employment with immediate effect, without prior notice or payment in lieu of notice, and without being required to provide a reason, to the extent permitted by applicable law and your employment terms.</p></div>` +
            `<p>The Employee may resign by providing notice in accordance with the Company's prevailing notice-period policy. Any waiver, adjustment, or payment in lieu of notice shall be subject to the Company's written approval and applicable law.</p>`) +
        `<p>In cases involving misconduct, breach of trust, fraud, unauthorized disclosure of confidential information, or violation of company policies, the Company may take appropriate disciplinary action, including termination, in accordance with applicable law.</p>` +
        `<p>Termination of employment shall not affect obligations relating to confidentiality, intellectual property, return of company property, or other obligations that survive termination under applicable agreements and law.</p>` +
        `<div class="cl"><p><b>10. Company Property &amp; Information Security</b></p><p>You must use company property, systems, accounts, software, documents, and access credentials responsibly and only for authorized purposes.</p></div>` +
        `<p>Upon resignation, termination, or a request from the Company, you must return all company property and confidential materials in your possession and cease unauthorized access to company systems.</p>` +
        `<div class="cl"><p><b>11. General Conditions</b></p><p>This appointment is subject to the accuracy of the information and documents provided by you and completion of the Company's required joining formalities.</p></div>` +
        `<p>You agree to comply with company policies as lawfully communicated and updated from time to time. Any material changes to your employment terms will be communicated in writing where required.</p>` +
        `<p>We welcome you to ${h.co} and look forward to your contribution to the Company's growth and success.</p>` +
        sigBlock(h, 'accept') +
        (h.v.inclNDA
          ? `<div class="pb"></div><div class="annex">ANNEXURE I: NON-DISCLOSURE AGREEMENT (NDA)</div><p>This Non-Disclosure Agreement ("Agreement") is entered into between ${h.co} ("Company") and ${h.f('name')} ("Employee") in connection with the Employee's employment with the Company.</p>` +
            ndaBody(h, false) +
            sigBlock(h, 'accept')
          : '') +
        (h.v.inclSal
          ? `<div class="pb"></div><div class="annex">ANNEXURE ${annSal}: SALARY &amp; BENEFITS STRUCTURE</div><p><b>Employee Name:</b> ${h.f('name')}${h.has('empId') ? `<br><b>Employee ID:</b> ${h.f('empId')}` : ''}<br><b>Designation:</b> ${h.f('designation')}<br><b>Date of Joining:</b> ${h.d('joinDate')}</p>` +
            (structTable(h) || salTable(h, salParts(h))) +
            `<p><b>Terms &amp; Conditions:</b></p><ol>${h.has('bonus') ? '<li>Performance bonus is subject to performance targets and company policy.</li>' : ''}${h.has('accom') ? `<li>Accommodation is provided by ${h.co} and valued at ${h.m('accom')} per month. It is a non-cash benefit included in CTC and is not paid in cash.</li>` : ''}<li>Applicable deductions will be as per company policy and applicable law.</li></ol>` +
            `<div class="cl"><p><b>Employee Acknowledgement</b></p><p>I, ${h.f('name')}, confirm that I have reviewed and accepted the above salary structure.</p>${sigBlock(h, 'accept')}</div>`
          : '')
      );
    },
  },
  internship: {
    code: 'INT',
    label: 'Internship Offer Letter',
    group: 'Hiring',
    sig: 'accept',
    sections: [
      ['Intern', ['title', 'name', 'addressAs', 'candAddress', 'college']],
      [
        'Internship',
        ['role', 'department', 'startDate', 'endDate', 'mode', 'office', 'hours', 'mentor', 'iresp'],
      ],
      ['Stipend and terms', ['currency', 'stipend', 'internNotice', 'cert', 'acceptBy']],
    ],
    body: (h) => {
      const dur = monthsBetween(h.v.startDate, h.v.endDate);
      return (
        h.meta() +
        h.to('candAddress') +
        h.subj(`Internship Offer for the Role of ${h.f('role')}`) +
        h.dear() +
        `<p>We are pleased to offer you an internship as <b>${h.f('role')}</b> in the ${h.f('department')} team at ${h.co}${h.has('college') ? `, as part of your studies at ${h.f('college')}` : ''}.</p>` +
        `<p><b>1. Duration:</b> Your internship will begin on <b>${h.d('startDate')}</b> and end on <b>${h.d('endDate')}</b>${dur ? ` (${dur})` : ''}. Any extension will be confirmed to you in writing.</p>` +
        `<p><b>2. Location and Working Hours:</b> ${h.v.mode === 'Remote' ? 'You will work remotely.' : h.v.mode === 'Hybrid' ? `You will work partly from our office at ${h.f('office')} and partly remotely, as agreed with your mentor.` : `You will work from our office at ${h.f('office')}.`} Working hours: ${h.f('hours')}.</p>` +
        `<p><b>3. Stipend:</b> ${h.has('stipend') ? `You will receive a monthly stipend of <b>${h.mwk('stipend')}</b>, paid in accordance with company policy and subject to applicable deductions.` : 'This is an unpaid internship.'}</p>` +
        `<p><b>4. ${h.has('mentor') ? 'Mentor and ' : ''}Responsibilities:</b> ${h.has('mentor') ? `You will work under the guidance of ${h.f('mentor')}. ` : ''}Your responsibilities will include:</p>${h.ul('iresp')}` +
        `<p><b>5. Confidentiality:</b> You must keep all company information confidential during and after your internship. All work you produce during the internship belongs to ${h.co}, to the extent permitted by applicable law.</p>` +
        `<p><b>6. Conduct and Attendance:</b> You are expected to follow company policies, maintain regular attendance, and inform your ${h.has('mentor') ? 'mentor' : 'reporting manager'} in advance of any planned absence.</p>` +
        `<p><b>7. Nature of the Internship:</b> This internship is a training engagement and is not an offer of employment. Any offer of employment after the internship will depend on your performance and business needs, and will be made separately in writing.</p>` +
        `<p><b>8. Ending the Internship Early:</b> Either party may end the internship by giving ${h.f('internNotice')}' written notice. The company may end it immediately in case of misconduct or a serious breach of company policy.</p>` +
        (h.v.cert
          ? `<p><b>9. Certificate:</b> On successful completion of the internship, you will receive an internship certificate.</p>`
          : '') +
        `<p>Please confirm your acceptance by signing and returning a copy of this letter on or before <b>${h.d('acceptBy')}</b>.</p><p>We look forward to working with you.</p>` +
        sigBlock(h, 'accept')
      );
    },
  },
  confirmation: {
    code: 'CNF',
    label: 'Employment Confirmation Letter',
    group: 'During employment',
    sig: 'ack',
    sections: [
      ['Employee', ['title', 'name', 'addressAs', 'empId', 'designation', 'department']],
      ['Confirmation', ['joinDate', 'confirmDate', 'currency', 'newSalary', 'accom', 'notice', 'remarks']],
    ],
    body: (h) =>
      h.meta() +
      h.to() +
      h.subj('Confirmation of Employment') +
      h.dear() +
      `<p>Further to your appointment as <b>${h.f('designation')}</b> on ${h.d('joinDate')}, we are pleased to inform you that you have successfully completed your probation period. Your employment with ${h.co} is hereby confirmed with effect from <b>${h.d('confirmDate')}</b>.</p>` +
      (h.has('remarks') ? h.paras('remarks') : '') +
      (h.has('newSalary')
        ? `<p>With effect from the same date, your monthly fixed salary will be revised to <b>${h.mwk('newSalary')}</b>.</p>`
        : '') +
      accomLine(h) +
      `<p>All other terms and conditions of your appointment remain unchanged.</p>` +
      (h.has('notice')
        ? `<p>Now that your employment is confirmed, either party may end the employment by giving ${h.f('notice')}' written notice, or salary in lieu of notice where approved by the company, subject to applicable law and company policy.</p>`
        : '') +
      `<p>We appreciate your contribution and look forward to your continued growth with ${h.co}.</p>` +
      sigBlock(h, 'ack'),
  },
  revision: {
    code: 'REV',
    label: 'Salary Revision / Increment Letter',
    group: 'During employment',
    sig: 'ack',
    sections: [
      ['Employee', ['title', 'name', 'addressAs', 'empId', 'designation']],
      [
        'Revision',
        [
          'effDate',
          'revDesignation',
          'currency',
          'curFixed',
          'newFixed',
          'bonus',
          'accom',
          'otherLabel',
          'otherAmt',
          'revReason',
          'inclTable',
        ],
      ],
    ],
    body: (h) => {
      const cur = h.n('curFixed'),
        nw = h.n('newFixed'),
        diff = nw - cur,
        pct = cur ? Math.round((diff / cur) * 1000) / 10 : 0,
        psR = payStructure(h, 'newFixed'),
        tot = psR ? psR.ctc : nw + h.n('bonus') + h.n('accom') + h.n('otherAmt');
      return (
        h.meta() +
        h.to() +
        h.subj('Revision of Salary') +
        h.dear() +
        `<p>${h.inl('revReason')}, we are pleased to inform you that your salary has been revised with effect from <b>${h.d('effDate')}</b>.</p>` +
        (h.has('revDesignation')
          ? `<p>From the same date, your designation will be <b>${h.f('revDesignation')}</b>.</p>`
          : '') +
        `<p>Your monthly fixed salary will change from ${h.m('curFixed')} to <b>${h.m('newFixed')}</b>${h.has('curFixed') && h.has('newFixed') && diff > 0 ? `, an increase of ${h.mv(diff)} (${pct}%)` : ''}. Your revised total monthly CTC will be <b>${h.has('newFixed') ? h.mv(tot) : h.ph('newFixed')}</b>, equivalent to an annual CTC of <b>${h.has('newFixed') ? h.mw(tot * 12) : h.ph('newFixed')}</b>.</p>` +
        (h.has('bonus')
          ? `<p>In addition, you will be eligible for a performance bonus of <b>${h.m('bonus')} per month</b>, subject to performance criteria and company policy. This is included in the CTC above.</p>`
          : '') +
        accomLine(h) +
        (h.v.inclTable
          ? `<p>Your revised salary structure is as follows:</p>` +
            (structTable(h, 'newFixed') ||
              salTable(
                h,
                [['Fixed Salary', h.has('newFixed') ? nw : 'newFixed']].concat(salParts(h).slice(1)),
              ))
          : '') +
        `<p>All other terms and conditions of your employment remain unchanged. Salary information is confidential, and we request that you do not discuss it with others.</p>` +
        `<p>We thank you for your contribution and look forward to your continued success with ${h.co}.</p>` +
        sigBlock(h, 'ack')
      );
    },
  },
  promotion: {
    code: 'PRM',
    label: 'Promotion Letter',
    group: 'During employment',
    sig: 'ack',
    sections: [
      ['Employee', ['title', 'name', 'addressAs', 'empId', 'department']],
      [
        'Promotion',
        [
          'curDesignation',
          'newDesignation',
          'effDate',
          'newDept',
          'newReporting',
          'newResp',
          'currency',
          'newSalary',
          'accom',
        ],
      ],
    ],
    body: (h) =>
      h.meta() +
      h.to() +
      h.subj(`Promotion to the Position of ${h.f('newDesignation')}`) +
      h.dear() +
      `<p>We are pleased to inform you that, in recognition of your performance, commitment and contribution, you have been promoted from ${h.f('curDesignation')} to <b>${h.f('newDesignation')}</b> with effect from <b>${h.d('effDate')}</b>.</p>` +
      (h.has('newDept') || h.has('newReporting')
        ? `<p>${h.has('newDept') ? `In your new role you will be part of the ${h.f('newDept')} team` : 'In your new role'}${h.has('newReporting') ? ` and will report to ${h.f('newReporting')}` : ''}.</p>`
        : '') +
      (h.has('newResp') ? `<p>Your key responsibilities will include:</p>${h.ul('newResp')}` : '') +
      (h.has('newSalary')
        ? `<p>With effect from the same date, your monthly fixed salary will be revised to <b>${h.mwk('newSalary')}</b>.</p>`
        : '') +
      accomLine(h) +
      `<p>All other terms and conditions of your employment remain unchanged.</p><p>Congratulations on your promotion. We are confident you will continue to perform well in your new role.</p>` +
      sigBlock(h, 'ack'),
  },
  probation: {
    code: 'PRB',
    label: 'Probation Extension Letter',
    group: 'During employment',
    sig: 'ack',
    sections: [
      ['Employee', ['title', 'name', 'addressAs', 'empId', 'designation']],
      ['Extension', ['joinDate', 'origEnd', 'extMonths', 'newEnd', 'areas', 'support', 'reviewer']],
    ],
    body: (h) => {
      const ne = h.has('newEnd')
        ? h.d('newEnd')
        : addMonthsISO(h.v.origEnd, h.v.extMonths)
          ? fmtLong(addMonthsISO(h.v.origEnd, h.v.extMonths))
          : h.ph('newEnd');
      return (
        h.meta() +
        h.to() +
        h.subj('Extension of Probation Period') +
        h.dear() +
        `<p>Your probation period as ${h.f('designation')}, which began on ${h.d('joinDate')}, was due to end on ${h.d('origEnd')}. Following a review of your performance, conduct and attendance, we have decided to extend your probation by ${h.f('extMonths')} month${Number(h.v.extMonths) === 1 ? '' : 's'}, until <b>${ne}</b>.</p>` +
        `<p>During this period, we expect you to improve in the following areas:</p>${h.ul('areas')}` +
        (h.has('support')
          ? `<p>To help you, the company will provide the following support:</p>${h.ul('support')}`
          : '') +
        `<p>Your progress will be reviewed${h.has('reviewer') ? ` by ${h.f('reviewer')}` : ''} during and at the end of the extended period. If the expected standards are met, your employment will be confirmed in writing. If not, the company may take an appropriate decision in accordance with your terms of employment, company policy and applicable law.</p>` +
        `<p>All other terms and conditions of your appointment remain unchanged. Please sign below to acknowledge receipt of this letter.</p>` +
        sigBlock(h, 'ack')
      );
    },
  },
  addendum: {
    code: 'ADD',
    label: 'Employment Contract Addendum',
    group: 'During employment',
    sig: 'accept',
    sections: [
      ['Employee', ['title', 'name', 'empId', 'designation']],
      ['Changes', ['origDoc', 'origDate', 'effDate', 'changes', 'addReason']],
    ],
    body: (h) =>
      h.meta() +
      `<div class="ttl">Addendum to Employment Contract</div><p style="margin-top:14px">This Addendum is made on ${h.d('letterDate')} between ${h.co} ("Company") and ${h.nm()}${h.has('empId') ? `, Employee ID ${h.f('empId')}` : ''}, ${h.f('designation')} ("Employee").</p>` +
      `<p>It amends the ${h.f('origDoc')} dated ${h.d('origDate')} ("Original Agreement")${h.has('addReason') ? ` ${/^(to|for|because|due)\b/i.test(h.v.addReason) ? '' : 'for the following reason: '}${h.f('addReason')}` : ''}.</p>` +
      `<p>With effect from <b>${h.d('effDate')}</b>, the parties agree to the following changes:</p>${h.ol('changes')}` +
      `<p>Except as amended by this Addendum, all other terms of the Original Agreement remain unchanged and in full force. If there is any conflict between this Addendum and the Original Agreement, this Addendum will apply to the matters it covers.</p>` +
      `<p>This Addendum forms part of the Original Agreement. By signing below, both parties confirm that they have read and agree to these changes.</p>` +
      sigBlock(h, 'accept'),
  },
  warning: {
    code: 'WRN',
    label: 'Warning Letter',
    group: 'During employment',
    sig: 'ack',
    sections: [
      ['Employee', ['title', 'name', 'addressAs', 'empId', 'designation', 'department']],
      [
        'Warning',
        ['wLevel', 'wCat', 'incidentDate', 'wDetails', 'priorDisc', 'expected', 'reviewPeriod', 'replyBy'],
      ],
    ],
    body: (h) => {
      const fin = h.v.wLevel === 'Final';
      return (
        h.meta() +
        h.to() +
        h.subj(`${h.f('wLevel')} Warning: ${h.f('wCat')}`) +
        h.dear() +
        `<p>This letter is a formal ${h.lc('wLevel')} warning about ${h.lc('wCat')}.</p>` +
        `<p>On ${h.d('incidentDate')}, ${h.sen('wDetails')}</p>` +
        (h.has('priorDisc')
          ? `<p>This matter has been raised with you before: ${h.f('priorDisc')}.</p>`
          : '') +
        `<p>This is not in line with ${h.co}'s policies or the standards expected in your role.</p>` +
        `<p><b>What we expect:</b> ${h.sen('expected')}</p>` +
        `<p>We will review your ${/attendance/i.test(h.v.wCat || '') ? 'attendance' : /perform/i.test(h.v.wCat || '') ? 'performance' : 'conduct'} over the next ${h.f('reviewPeriod')}.</p>` +
        `<p>If you would like to explain or respond, please send a written reply to HR ${h.has('replyBy') ? `by <b>${h.d('replyBy')}</b>` : 'within three working days of receiving this letter'}. Your reply will be considered before any further action is taken.</p>` +
        `<p>${fin ? 'This is a final warning. Any further instance' : 'Please note that any repetition'} may lead to further disciplinary action, up to and including termination of employment, in accordance with company policy and applicable law.</p>` +
        `<p>A copy of this letter will be kept in your personnel file. Please sign below to acknowledge receipt. Your signature confirms that you have received this letter; it does not mean you agree with its contents.</p>` +
        sigBlock(h, 'ack')
      );
    },
  },
  resignation: {
    code: 'RSG',
    label: 'Resignation Acceptance Letter',
    group: 'Exit',
    sig: 'ack',
    sections: [
      ['Employee', ['title', 'name', 'addressAs', 'empId', 'designation']],
      ['Resignation', ['resignDate', 'noticeDays', 'lastDay', 'waiverNote', 'handoverTo', 'exitList']],
    ],
    body: (h) =>
      h.meta() +
      h.to() +
      h.subj('Acceptance of Resignation') +
      h.dear() +
      `<p>We acknowledge receipt of your resignation letter dated ${h.d('resignDate')}. Your resignation from the position of ${h.f('designation')} has been accepted.</p>` +
      `<p>In line with your notice period of ${h.f('noticeDays')} days, your last working day with ${h.co} will be <b>${h.d('lastDay')}</b>.${h.has('waiverNote') ? ' ' + h.f('waiverNote') : ''}</p>` +
      `<p>Before your last working day, please complete the following, including handing over your work to ${h.f('handoverTo')}:</p>${h.ul('exitList')}` +
      `<p>Your salary and other wages due will be paid within two working days of your last working day, as required under the Code on Wages, 2019. Gratuity, if you are eligible, will be paid within the time allowed under the Code on Social Security, 2020. Your relieving and experience letters will be issued once the handover is complete.</p>` +
      `<p>Please remember that your confidentiality and intellectual property obligations continue after your employment ends.</p>` +
      `<p>Thank you for your contributions to ${h.co}. We wish you success in the future.</p>` +
      sigBlock(h, 'ack'),
  },
  relieving: {
    code: 'REL',
    label: 'Relieving Letter',
    group: 'Exit',
    sig: 'none',
    defs: { showRef: false, showEmpId: false }, // a relieving letter goes out without Ref and Employee ID
    sections: [
      ['Employee', ['title', 'name', 'addressAs', 'empId', 'designation', 'department']],
      ['Dates', ['joinDate', 'resignDate', 'lastDay', 'fnf', 'handedOver']],
    ],
    body: (h) =>
      h.meta() +
      h.to() +
      h.subj('Relieving Letter') +
      h.dear() +
      `<p>This is with reference to your resignation letter dated ${h.d('resignDate')}. We confirm that your resignation has been accepted and that you are relieved from your duties as <b>${h.f('designation')}</b>${h.has('department') ? ` in the ${h.f('department')} department` : ''} at ${h.co} with effect from the close of business on <b>${h.d('lastDay')}</b>.</p>` +
      `<p>Your period of employment with us was from ${h.d('joinDate')} to ${h.d('lastDay')}.</p>` +
      `<p>${h.v.fnf === 'Completed' ? 'Your full and final settlement has been completed.' : 'Your salary and other wages due are payable within two working days of your last working day, as required under the Code on Wages, 2019.'}${h.v.handedOver ? ' You have handed over your responsibilities and returned all company property.' : ''}</p>` +
      `<p>Please note that your confidentiality and intellectual property obligations continue after your employment ends, as set out in your terms of employment.</p>` +
      `<p>We thank you for your contributions and wish you every success in your future career.</p>` +
      sigBlock(h, 'none'),
  },
  experience: {
    code: 'EXP',
    label: 'Experience Letter',
    group: 'Exit',
    sig: 'none',
    sections: [
      ['Employee', ['title', 'name', 'pronoun', 'empId', 'designation', 'department']],
      ['Employment', ['joinDate', 'lastDay', 'expResp', 'conduct', 'addressee']],
    ],
    body: (h) => {
      const P = h.P,
        c = h.cap;
      return (
        h.meta() +
        `<div class="ttl">Experience Letter</div><div class="twc">${h.f('addressee')}</div>` +
        `<p>This is to certify that <b>${h.nm()}</b>${h.has('empId') ? ` (Employee ID: ${h.f('empId')})` : ''} was employed with ${h.co} from <b>${h.d('joinDate')}</b> to <b>${h.d('lastDay')}</b>. At the time of leaving, ${P.sub} held the position of <b>${h.f('designation')}</b> in the ${h.f('department')} department.</p>` +
        (h.has('expResp')
          ? `<p>During ${P.pos} tenure, ${P.sub} ${P.was} responsible for ${h.inl('expResp').replace(/\.$/, '')}.</p>`
          : '') +
        `<p>During ${P.pos} time with us, we found ${P.obj} to be ${h.f('conduct')}.</p>` +
        `<p>We wish ${P.obj} every success in ${P.pos} future endeavours.</p>` +
        sigBlock(h, 'none')
      );
    },
  },
  termination: {
    code: 'TRM',
    label: 'Termination Letter',
    group: 'Exit',
    sig: 'ack',
    sections: [
      ['Employee', ['title', 'name', 'addressAs', 'empId', 'designation']],
      [
        'Termination',
        [
          'effDate',
          'termReason',
          'termDetails',
          'priorRefs',
          'showCause',
          'noticeTerms',
          'noticePayDays',
          'serviceYears',
          'returnBy',
          'contact',
        ],
      ],
    ],
    body: (h) => {
      const nt = h.v.noticeTerms;
      return (
        h.meta() +
        h.to() +
        h.subj('Termination of Employment') +
        h.dear() +
        `<p>This letter is to inform you that your employment with ${h.co} as ${h.f('designation')} is terminated with effect from <b>${h.d('effDate')}</b>.</p>` +
        `<p><b>Reason:</b> ${h.f('termReason')}. ${h.sen('termDetails')}${h.has('priorRefs') ? ` This decision follows ${h.f('priorRefs')}.` : ''}</p>` +
        (/Misconduct|policy/i.test(h.v.termReason || '')
          ? `<p>This decision has been taken after giving you an opportunity to explain, through the ${h.f('showCause')}, and after considering your response.</p>`
          : h.has('showCause')
            ? `<p>This decision has been taken after considering the ${h.f('showCause')}.</p>`
            : '') +
        `<p><b>Notice:</b> ${
          nt === 'Serve notice until the effective date'
            ? 'This letter serves as your notice. You are required to continue working until the effective date and complete a proper handover of your work.'
            : nt === 'No notice pay (misconduct)'
              ? 'In view of the reasons above, no notice pay is payable, in accordance with your terms of employment and applicable law.'
              : `You will be paid ${h.f('noticePayDays')} days' salary in lieu of notice as part of your full and final settlement.`
        }</p>` +
        (/redundant/i.test(h.v.termReason || '')
          ? `<p><b>Retrenchment compensation:</b> As this is a retrenchment, you will also receive retrenchment compensation equal to 15 days' average pay for every completed year of continuous service${h.has('serviceYears') ? ` (${h.f('serviceYears')} completed year${Number(h.v.serviceYears) === 1 ? '' : 's'})` : ''}, and, where the Industrial Relations Code, 2020 applies, the company will contribute 15 days' wages to the Worker Re-skilling Fund for you.</p>`
          : '') +
        `<p><b>Final settlement:</b> Your salary up to the effective date${nt === 'Salary in lieu of notice' ? ', the notice pay above,' : ''} and any other wages due will be paid within two working days of the effective date, as required under the Code on Wages, 2019. Gratuity, if you are eligible, will be paid within the time allowed under the Code on Social Security, 2020. Any recoverable advances will be adjusted only as permitted by law.</p>` +
        `<p><b>Company property:</b> Please return all company property in your possession, including your laptop, ID card, access cards, documents and data, by <b>${h.d('returnBy')}</b>. Your access to company systems will end on the effective date.</p>` +
        `<p>Your obligations relating to confidentiality and intellectual property continue after your employment ends.</p>` +
        `<p>For any questions about your settlement or exit formalities, please contact ${h.f('contact')}.</p>` +
        sigBlock(h, 'ack')
      );
    },
  },
  salary: {
    code: 'SAL',
    label: 'Salary Certificate',
    group: 'Certificates and agreements',
    sig: 'none',
    sections: [
      ['Employee', ['title', 'name', 'pronoun', 'empId', 'designation', 'department', 'joinDate']],
      [
        'Salary',
        ['currency', 'fixed', 'bonus', 'accom', 'otherLabel', 'otherAmt', 'breakup', 'purpose', 'addressee'],
      ],
    ],
    body: (h) => {
      const P = h.P,
        c = h.cap,
        tot = ctcOf(h);
      const table = (!/only/i.test(h.v.breakup || '') && structTable(h)) || salTable(h, salParts(h));
      return (
        h.meta() +
        `<div class="ttl">Salary Certificate</div><div class="twc">${h.f('addressee')}</div>` +
        `<p>This is to certify that <b>${h.nm()}</b>${h.has('empId') ? ` (Employee ID: ${h.f('empId')})` : ''} has been working with ${h.co} since <b>${h.d('joinDate')}</b> and currently holds the position of <b>${h.f('designation')}</b> in the ${h.f('department')} department.</p>` +
        `<p>${c(P.pos)} current total monthly salary (CTC) is <b>${h.has('fixed') ? h.mw(tot) : h.ph('fixed')}</b>, which is <b>${h.has('fixed') ? h.mv(tot * 12) : h.ph('fixed')}</b> a year.</p>` +
        accomLine(h, 'cert') +
        `<p>The details are as follows:</p>` +
        table +
        `<p>This certificate is issued at ${P.pos} request${h.has('purpose') ? ` for the purpose of ${h.f('purpose')}` : ''}. It does not create any guarantee or financial obligation on the part of ${h.co}.</p>` +
        sigBlock(h, 'none')
      );
    },
  },
  nda: {
    code: 'NDA',
    label: 'NDA / Confidentiality Agreement',
    group: 'Certificates and agreements',
    sig: 'accept',
    sections: [
      ['Employee', ['title', 'name', 'empId', 'designation', 'candAddress']],
      ['Agreement', ['effDate', 'survive', 'jurisdiction']],
    ],
    body: (h) =>
      h.meta() +
      `<div class="ttl">Non-Disclosure and Confidentiality Agreement</div>` +
      `<p style="margin-top:14px">This Non-Disclosure Agreement ("Agreement") is made on ${h.d('letterDate')} and is effective from <b>${h.d('effDate')}</b>, between ${h.co}, ${esc(S.docSettings.addr1)}, ${esc(S.docSettings.addr2)} ("Company"), and ${h.nm()}${h.has('empId') ? `, Employee ID ${h.f('empId')}` : ''}, ${h.f('designation')}${h.has('candAddress') ? `, residing at ${h.inl('candAddress')}` : ''} ("Employee"), in connection with the Employee's employment with the Company.</p>` +
      ndaBody(h, true) +
      `<div class="cl"><p>By signing below, both parties confirm that they have read, understood and agree to this Agreement.</p>${sigBlock(h, 'accept')}</div>`,
  },
};
/* Legal / date sanity checks for each document. Returned messages are shown above the pages, not printed. */
const dISO = (x) => (/^\d{4}-\d{2}-\d{2}$/.test(x || '') ? x : '');
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5);
function docChecks(t, v) {
  const w = [],
    L = dISO(v.letterDate);
  const before = (a, b, msg) => {
    if (dISO(a) && dISO(b) && a < b) w.push(msg);
  };
  if (t === 'offer') {
    before(v.joinDate, L, 'The joining date is before the letter date.');
    before(v.joinDate, v.acceptBy, 'The accept-by date is after the joining date.');
    before(v.acceptBy, L, 'The accept-by date is before the letter date.');
  }
  if (t === 'appointment' && !/^Mutual/.test(v.termClause || ''))
    w.push(
      'Clause 9 uses the current Acme Labs wording, which allows termination without notice or reason. Indian courts may not enforce this for confirmed employees; consider "Mutual notice period" and have a lawyer review.',
    );
  if (t === 'internship') {
    before(v.endDate, v.startDate, 'The internship end date is before the start date.');
    before(v.acceptBy, L, 'The accept-by date is before the letter date.');
  }
  if (t === 'confirmation') {
    before(v.confirmDate, v.joinDate, 'The confirmation date is before the joining date.');
  }
  if (t === 'revision') {
    if (Number(v.newFixed) && Number(v.curFixed) && Number(v.newFixed) < Number(v.curFixed))
      w.push(
        "The new salary is lower than the current salary. A salary reduction needs the employee's written consent.",
      );
    before(v.effDate, L, 'The revision takes effect before the letter date (back-dated).');
  }
  if (t === 'promotion') {
    before(v.effDate, L, 'The promotion takes effect before the letter date (back-dated).');
  }
  if (t === 'probation') {
    if (dISO(v.origEnd) && L && L > v.origEnd)
      w.push(
        'This letter is dated after the original probation end date. An extension should be issued before probation ends; otherwise the employee may be treated as confirmed.',
      );
    if (Number(v.extMonths) > 3)
      w.push('The extension is longer than 3 months. Extensions are normally limited to 3 months.');
  }
  if (t === 'warning') {
    before(L, v.incidentDate, 'The incident date is after the letter date.');
  }
  if (t === 'resignation') {
    before(v.lastDay, v.resignDate, 'The last working day is before the resignation date.');
    if (
      dISO(v.lastDay) &&
      dISO(v.resignDate) &&
      Number(v.noticeDays) &&
      daysBetween(v.resignDate, v.lastDay) + 1 < Number(v.noticeDays) &&
      !(v.waiverNote || '').trim()
    )
      w.push(
        `The last working day is ${daysBetween(v.resignDate, v.lastDay) + 1} days after the resignation date, shorter than the ${v.noticeDays}-day notice period. Add a note about the waived notice.`,
      );
  }
  if (t === 'relieving' || t === 'experience') {
    before(v.lastDay, v.joinDate, 'The last working day is before the joining date.');
  }
  if (t === 'relieving' && v.fnf === 'Completed' && dISO(v.lastDay) && L && L < v.lastDay)
    w.push(
      'Full and final settlement is marked "Completed", but the letter is dated before the last working day.',
    );
  if (t === 'termination') {
    before(
      v.effDate,
      L,
      'The termination is back-dated (effective before the letter date). Issue the letter on or before the effective date.',
    );
    if (/Misconduct|policy/i.test(v.termReason || '') && !(v.showCause || '').trim())
      w.push(
        'For misconduct, give the employee a show-cause notice and a chance to reply before terminating, and record it in the show-cause field.',
      );
    if (/redundant/i.test(v.termReason || ''))
      w.push(
        'Retrenchment rules (one month\'s notice or pay, 15 days\' average pay per completed year, re-skilling fund) apply to "workers" under the Industrial Relations Code, 2020. Confirm the amounts with your lawyer or CA.',
      );
  }
  if (t === 'salary' || t === 'revision' || t === 'appointment' || t === 'offer') {
    if (
      (v.currency || 'INR') === 'INR' &&
      Number(v.fixed || v.newFixed) &&
      Number(v.fixed || v.newFixed) < 12000
    )
      w.push('Check the salary against the Gujarat minimum wage for this role.');
  }
  return w;
}
const DOC_GROUPS = ['Hiring', 'During employment', 'Exit', 'Certificates and agreements'];
const DOC_ORDER = [
  'offer',
  'appointment',
  'internship',
  'confirmation',
  'revision',
  'promotion',
  'probation',
  'warning',
  'addendum',
  'resignation',
  'relieving',
  'experience',
  'termination',
  'salary',
  'nda',
];
Object.entries(DOCS).forEach(([id, D]) => {
  D.id = id;
});
DOCS.nda.labels = { candAddress: 'Employee address (optional)' };
DOCS.relieving.labels = { resignDate: 'Resignation letter dated' };
DOCS.promotion.labels = { newSalary: 'New monthly salary (optional)' };
DOCS.confirmation.labels = {
  newSalary: 'Revised monthly salary (optional)',
  accom: 'Accommodation value per month (optional)',
};
DOCS.revision.labels = {
  bonus: 'Performance bonus per month after revision (optional)',
  accom: 'Accommodation value per month (optional)',
};
