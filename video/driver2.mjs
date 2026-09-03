import { launch } from 'puppeteer-core';
import { mkdirSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:5173/';
const W = 1600, H = 900, FPS = 30, DSF = 2;
const SMOKE = process.env.SMOKE === '1';

const garamond = readFileSync(join(__dirname, 'fonts/EBGaramond.ttf')).toString('base64');
const garamondIt = readFileSync(join(__dirname, 'fonts/EBGaramond-Italic.ttf')).toString('base64');

/* ---------------- math ---------------- */
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const win = (t, s, e, d = 0.5) => Math.min(clamp((t - s) / d, 0, 1), clamp((e - t) / d, 0, 1));
function sample(kf, t, fields) {
  if (t <= kf[0].t) return kf[0];
  if (t >= kf[kf.length - 1].t) return kf[kf.length - 1];
  let i = 0; while (i < kf.length - 1 && kf[i + 1].t <= t) i++;
  const a = kf[i], b = kf[i + 1];
  const p = easeIO(clamp((t - a.t) / (b.t - a.t || 1), 0, 1));
  const o = { t }; for (const f of fields) o[f] = lerp(a[f], b[f], p); return o;
}

/* ---------------- focuses (base 1600x900) ---------------- */
const F = {
  FULL:    { s: 1.0,  cx: 800,  cy: 400 },
  INFO:    { s: 1.85, cx: 1372, cy: 118 },
  STEMMA:  { s: 1.30, cx: 1421, cy: 345 },
  ROLL:    { s: 1.0,  cx: 760,  cy: 400 },
  CUT:     { s: 1.0,  cx: 780,  cy: 490 },
  MOTIV:   { s: 1.75, cx: 470,  cy: 430 },
  DYN:     { s: 2.00, cx: 560,  cy: 252 },
  PLAY:    { s: 1.06, cx: 780,  cy: 410 },
  SOURCES: { s: 1.55, cx: 1372, cy: 178 },
  DIALOG:  { s: 1.0,  cx: 800,  cy: 450 },
};
const DURATION = 90;

const CAM = [
  { t: 0.0, ...F.FULL }, { t: 5.2, ...F.FULL },
  { t: 6.4, ...F.INFO }, { t: 15.4, ...F.INFO },
  { t: 16.4, ...F.STEMMA }, { t: 26.8, ...F.STEMMA },
  { t: 28.0, ...F.CUT }, { t: 45.6, ...F.CUT },
  { t: 46.6, ...F.MOTIV }, { t: 56.8, ...F.MOTIV },
  { t: 58.0, ...F.PLAY }, { t: 68.2, ...F.PLAY },
  { t: 69.2, ...F.DIALOG }, { t: 74.4, ...F.DIALOG },
  { t: 75.6, ...F.SOURCES }, { t: 83.8, ...F.SOURCES },
  { t: 84.8, ...F.FULL }, { t: 90.0, ...F.FULL },
].map(k => ({ t: k.t, s: k.s, cx: k.cx, cy: k.cy }));

// cursor base coords (shown only while moving / around clicks)
const CUR = [
  { t: 0.0, x: 820, y: 520 }, { t: 6.6, x: 820, y: 520 },
  { t: 7.2, x: 1340, y: 150 }, { t: 10.8, x: 1340, y: 150 },
  { t: 11.0, x: 1332, y: 113 }, { t: 11.6, x: 1332, y: 113 },      // ✓✓ button
  { t: 12.0, x: 1360, y: 240 }, { t: 15.4, x: 1360, y: 240 },
  { t: 15.8, x: 1301, y: 48 }, { t: 16.3, x: 1301, y: 48 },        // Stemma tab
  { t: 16.9, x: 1449, y: 250 }, { t: 23.6, x: 1449, y: 250 },      // balloon
  { t: 24.2, x: 1473, y: 376 }, { t: 24.9, x: 1473, y: 376 },      // node B
  { t: 25.6, x: 700, y: 380 }, { t: 46.2, x: 700, y: 380 },
  { t: 46.6, x: 470, y: 430 }, { t: 56.8, x: 470, y: 430 },        // motiv (parked → hidden)
  { t: 57.6, x: 121, y: 36 }, { t: 67.8, x: 121, y: 36 },          // play
  { t: 68.4, x: 76, y: 36 }, { t: 69.6, x: 76, y: 36 },            // download icon
  { t: 70.0, x: 800, y: 300 }, { t: 74.4, x: 800, y: 300 },
  { t: 74.7, x: 1400, y: 48 }, { t: 75.3, x: 1400, y: 48 },        // Sources tab
  { t: 77.6, x: 1312, y: 243 }, { t: 78.8, x: 1312, y: 243 },      // certainty mark on a copy
  { t: 80.9, x: 1400, y: 158 }, { t: 81.9, x: 1400, y: 158 },      // copy row (open)
  { t: 82.6, x: 760, y: 380 }, { t: 84.6, x: 760, y: 380 },
  { t: 84.9, x: 820, y: 520 }, { t: 90.0, x: 820, y: 520 },
];

const CLICKS = [11.2, 16.0, 24.8, 58.0, 69.4, 78.6, 81.6];

// captions (German, drawn from the dissertation)
const CAP = [
  { s: 0.4, e: 6.4,  k: 'ROLL DESK', t: 'A piano roll stores a performance as perforations. The Roll Desk turns several copies of one roll into a single readable, playable edition.' },
  { s: 7.0, e: 11.0, k: 'EDITORIAL ASSUMPTIONS', t: 'Claims here are graded, not merely asserted. The small mark after a value records how certain it is.' },
  { s: 11.4, e: 15.3, k: 'CERTAINTY', t: 'Two ticks: held true; one tick: likely; a question mark: only possible. Each opens its reasoning.' },
  { s: 16.5, e: 24.0, k: 'STEMMA', t: 'The version tree. Each balloon segment on a link is one motivation; its width shows how many edits that motivation groups.' },
  { s: 24.6, e: 27.4, k: 'SELECT A VERSION', t: 'A click lays that version on the desk.' },
  { s: 28.4, e: 35.8, k: 'THREE BANDS', t: 'The roll is cut into three bands: expression perforations enlarged top and bottom, the note text compressed in the middle.' },
  { s: 36.4, e: 45.4, k: 'DYNAMICS IN THE GAPS', t: 'The gaps carry the emulated dynamics for treble and bass; the previous version lies faded beneath.' },
  { s: 46.8, e: 56.6, k: 'VERSION VIEW', t: 'A grey patch gathers the edits of one motivation. On hover they surface: deletions red, additions green, replacements arrowed.' },
  { s: 58.0, e: 67.8, k: 'PLAYBACK', t: 'Play any version; the notes light up as they sound.' },
  { s: 69.2, e: 74.0, k: 'EXPORT', t: 'Export any version as MIDI, the basis for reconstructing the interpretation.' },
  { s: 75.8, e: 80.6, k: 'SOURCES', t: 'The collated copies, each with its facsimile. Here too a date carries its own certainty.' },
  { s: 81.0, e: 83.8, k: 'OPEN A COPY', t: 'Open a copy to bring its own transcription onto the desk.' },
  { s: 84.8, e: 89.8, k: 'ROLL DESK', t: 'Inspect assumptions · navigate · read · compare · listen · export.' },
];

// annotations: target (bx,by) + label anchor (lx,ly) in BASE coords, shown in [s,e]
const ANN = [
  // three bands — curly braces hugging each band, label left of the brace tip
  { s: 29.0, e: 45.4, brace: true, by0: 110, by1: 205, bx: 470, t: 'Expression · treble' },
  { s: 29.6, e: 45.4, brace: true, by0: 263, by1: 500, bx: 470, t: 'Note text (compressed)' },
  { s: 30.2, e: 45.4, brace: true, by0: 560, by1: 655, bx: 470, t: 'Expression · bass' },
  // dynamics — short leader to the curve in the top gap (second half of the beat)
  { s: 36.6, e: 45.4, bx: 700, by: 232, lx: 120, ly: 232, t: 'dynamics line' },
];

const ACTIONS = [
  { t: 11.2, type: 'clickArguable' },
  { t: 14.8, type: 'closeDialog' },
  { t: 16.0, type: 'tab', arg: 'Stemma' },
  { t: 16.9, type: 'hoverBalloon' },
  { t: 18.0, type: 'hoverBalloonSlice' },
  { t: 23.6, type: 'unhoverBalloon' },
  { t: 24.8, type: 'version', arg: 'B' },
  { t: 25.1, type: 'stretch', arg: 0.4 },
  { t: 46.6, type: 'hoverMotiv' },
  { t: 56.7, type: 'unhoverMotiv' },
  { t: 58.0, type: 'measurePlay' },
  { t: 69.4, type: 'openDownload' },
  { t: 74.0, type: 'closeDialog' },
  { t: 74.6, type: 'tab', arg: 'Sources' },
  { t: 78.6, type: 'clickIcon', arg: 'QuestionMarkTwoToneIcon' },   // certainty on a copy date (assumptions elsewhere)
  { t: 80.8, type: 'closeDialog' },
  { t: 81.6, type: 'copy', arg: 0 },
  { t: 84.4, type: 'tab', arg: 'Stemma' },
  { t: 84.6, type: 'version', arg: 'B' },
];

const PLAY_T0 = 59.5, PLAY_T1 = 67.4, SCROLL_BASE = 280, HL_WIN = 360;

/* ============================================================ */
const framesDir = join(__dirname, SMOKE ? 'smoke3' : 'frames');
if (existsSync(framesDir)) rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });

const browser = await launch({
  executablePath: CHROME, headless: 'new',
  args: [`--window-size=${W},${H}`, '--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none'],
  defaultViewport: { width: W, height: H, deviceScaleFactor: DSF },
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERR', String(e).slice(0, 160)));
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => document.querySelectorAll('button[role="tab"]').length > 0, { timeout: 60000 });
await new Promise(r => setTimeout(r, 800));

await page.evaluate(({ W, H, garamond, garamondIt }) => {
  const fonts = document.createElement('style');
  fonts.textContent = `
    @font-face{font-family:'EB Garamond';font-style:normal;font-weight:400 600;
      src:url(data:font/ttf;base64,${garamond}) format('truetype');}
    @font-face{font-family:'EB Garamond';font-style:italic;font-weight:400 600;
      src:url(data:font/ttf;base64,${garamondIt}) format('truetype');}
    *{transition:none!important;animation:none!important;}
    html,body{overflow:hidden!important;background:#ffffff;}
    #root{transform-origin:0 0; will-change:transform; background:#ffffff;}
    ::-webkit-scrollbar{display:none;}`;
  document.head.appendChild(fonts);
  const root = document.getElementById('root');

  const ser = `'EB Garamond', Garamond, 'Times New Roman', serif`;
  const overlay = document.createElement('div');
  overlay.id = '__overlay';
  overlay.style.cssText = `position:fixed;inset:0;z-index:2147483000;pointer-events:none;font-family:${ser};`;
  let annHtml = '';
  for (let i = 0; i < 4; i++) annHtml += `<div class="annL" id="__ann${i}" style="position:absolute;opacity:0;
    background:#fff;border:1px solid rgba(0,0,0,.18);border-radius:5px;padding:7px 13px;font-size:25px;color:#1c1a17;
    box-shadow:0 4px 16px rgba(0,0,0,.14);white-space:nowrap;transform:translateY(-50%);">x</div>`;
  overlay.innerHTML = `
    <svg id="__annsvg" width="${W}" height="${H}" style="position:absolute;inset:0">
      ${[0,1,2,3].map(i=>`<line id="__annLn${i}" stroke="#1c1a17" stroke-width="1.4" opacity="0"/><circle id="__annDt${i}" r="4.5" fill="#1c1a17" opacity="0"/><path id="__annBr${i}" fill="none" stroke="#1c1a17" stroke-width="2" opacity="0"/>`).join('')}
    </svg>
    ${annHtml}
    <div id="__caption" style="position:absolute;left:54px;bottom:74px;max-width:1010px;opacity:0;
        background:#ffffff;border:1px solid rgba(0,0,0,.14);border-radius:8px;padding:22px 32px 24px;
        box-shadow:0 16px 48px rgba(0,0,0,.20);">
      <div id="__kick" style="font-size:20px;letter-spacing:.24em;font-weight:600;color:#8a6a2f;
        text-transform:uppercase;margin-bottom:9px;"></div>
      <div id="__ctext" style="font-size:37px;line-height:1.26;font-weight:500;color:#1c1a17;"></div>
    </div>
    <svg id="__playhead" width="${W}" height="${H}" style="position:absolute;inset:0;opacity:0">
      <line id="__phline" x1="0" y1="40" x2="0" y2="${H - 40}" stroke="#c0392b" stroke-width="3"/>
      <polygon id="__phtri" points="0,30 0,30 0,30" fill="#c0392b"/>
    </svg>
    <div id="__cursor" style="position:absolute;left:0;top:0;width:30px;height:35px;opacity:0;
        transform:translate(-3px,-2px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));">
      <svg viewBox="0 0 24 28" width="30" height="35"><path fill="#000" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"
        d="M3 2 L3 22 L8.2 17.2 L11.6 24.7 L14.9 23.2 L11.5 15.9 L18 15.9 Z"/></svg>
      <div id="__ring" style="position:absolute;left:2px;top:2px;width:8px;height:8px;border-radius:50%;
        border:3px solid #c0392b;opacity:0;"></div>
    </div>`;
  document.body.appendChild(overlay);

  let scroller = null;
  document.querySelectorAll('div').forEach(d => { if (!scroller && d.scrollWidth > d.clientWidth + 50 && d.clientWidth > 400) scroller = d; });
  window.__scroller = scroller;
  const $ = id => document.getElementById(id);

  window.__apply = (st) => {
    root.style.transform = `translate(${st.tx}px,${st.ty}px) scale(${st.s})`;
    window.__cam = { tx: st.tx, ty: st.ty, s: st.s };
    if (st.scrollLeft != null && window.__scroller) window.__scroller.scrollLeft = st.scrollLeft;
    const c = $('__cursor');
    c.style.opacity = st.cur.o; c.style.left = st.cur.x + 'px'; c.style.top = st.cur.y + 'px';
    c.style.transform = `translate(-3px,-2px) scale(${st.cur.scale})`;
    const ring = $('__ring'); ring.style.opacity = st.cur.ring; ring.style.transform = `scale(${st.cur.ringScale})`;
    $('__caption').style.opacity = st.cap.o; $('__kick').textContent = st.cap.k; $('__ctext').innerHTML = st.cap.t;
    // annotations
    const brace = (x, y0, y1, w) => { const ym = (y0 + y1) / 2, qa = y0 + (y1 - y0) * 0.25, qb = y0 + (y1 - y0) * 0.75; return `M ${x} ${y0} Q ${x - w} ${y0} ${x - w} ${qa} Q ${x - w} ${ym} ${x - 2 * w} ${ym} Q ${x - w} ${ym} ${x - w} ${qb} Q ${x - w} ${y1} ${x} ${y1}`; };
    for (let i = 0; i < 4; i++) {
      const a = st.anns[i]; const lab = $('__ann' + i), ln = $('__annLn' + i), dt = $('__annDt' + i), br = $('__annBr' + i);
      if (!a) { lab.style.opacity = 0; ln.setAttribute('opacity', 0); dt.setAttribute('opacity', 0); br.setAttribute('opacity', 0); continue; }
      lab.style.opacity = a.op; lab.textContent = a.t;
      if (a.brace) {
        ln.setAttribute('opacity', 0); dt.setAttribute('opacity', 0);
        br.setAttribute('opacity', a.op); br.setAttribute('d', brace(a.x, a.y0, a.y1, a.w));
        const lw = lab.getBoundingClientRect().width;
        lab.style.left = (a.tipx - lw - 12) + 'px'; lab.style.top = a.cy + 'px';
      } else {
        br.setAttribute('opacity', 0);
        lab.style.left = a.lx + 'px'; lab.style.top = a.ly + 'px';
        ln.setAttribute('opacity', a.op * 0.9); dt.setAttribute('opacity', a.op);
        ln.setAttribute('x1', a.lx + a.lw + 6); ln.setAttribute('y1', a.ly); ln.setAttribute('x2', a.tx); ln.setAttribute('y2', a.ty);
        dt.setAttribute('cx', a.tx); dt.setAttribute('cy', a.ty);
      }
    }
    const ph = $('__playhead'); ph.style.opacity = st.play ? 1 : 0;
    if (st.play) {
      $('__phline').setAttribute('x1', st.play.px); $('__phline').setAttribute('x2', st.play.px);
      $('__phtri').setAttribute('points', `${st.play.px - 12},30 ${st.play.px + 12},30 ${st.play.px},48`);
      const X = st.play.X, w = st.play.win;
      document.querySelectorAll('.collated-event rect').forEach(r => {
        const rx = +r.getAttribute('x');
        if (rx <= X && rx > X - 90) r.setAttribute('fill', '#ff7a1a');
        else if (rx <= X - 90 && rx > X - w) r.setAttribute('fill', '#f0a35a');
        else if (rx <= X - w) r.setAttribute('fill', '#9fb6cf');
        else r.setAttribute('fill', 'black');
      });
    }
    if (st.resetNotes) document.querySelectorAll('.collated-event rect').forEach(r => r.setAttribute('fill', 'black'));
  };
  window.__labelWidth = (i) => $('__ann' + i).getBoundingClientRect().width;

  // app actions
  window.__clickTab = (n) => { const t = [...document.querySelectorAll('button[role="tab"]')].find(x => x.textContent.includes(n)); t && t.click(); };
  window.__selectVersion = (sig) => {
    const s = [...document.querySelectorAll('svg')].find(v => v.getAttribute('width') === '300' && v.getAttribute('height') === '600');
    if (!s) return;
    const gs = [...s.querySelectorAll('g')].filter(g => g.querySelector(':scope > circle') && g.querySelector(':scope > text'));
    const tgt = gs.find(g => g.querySelector('text').textContent.trim() === sig) || gs[0];
    tgt && tgt.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };
  window.__selectCopy = (i) => {
    const panel = [...document.querySelectorAll('[role="tabpanel"]')].find(p => !p.hidden && /\d{1,2}\.\d|Stanford|Widuch/i.test(p.textContent)) || document.querySelectorAll('[role="tabpanel"]')[2];
    if (!panel) return;
    const rows = [...panel.querySelectorAll('*')].filter(e => getComputedStyle(e).cursor === 'pointer' && e.getBoundingClientRect().width > 120 && e.tagName !== 'CANVAS');
    rows[i] && rows[i].dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };
  window.__setStretch = (v) => {
    const input = document.querySelector('.MuiSlider-root input'); if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, String(v)); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  window.__clickIcon = (label) => { const b = [...document.querySelectorAll('button')].find(b => b.querySelector(`svg[data-testid="${label}"]`)); b && b.click(); };
  window.__clickArguable = () => { const b = [...document.querySelectorAll('button')].find(b => b.querySelector('svg[data-testid="DoneAllIcon"],svg[data-testid="DoneIcon"],svg[data-testid="QuestionMarkTwoToneIcon"]')); b && b.click(); };
  window.__closeDialog = () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); const bd = document.querySelector('.MuiBackdrop-root'); bd && bd.click(); };
  // hover a stemma balloon (the A–B link) so it opens into its motivation slices
  window.__hoverBalloon = () => {
    const s = [...document.querySelectorAll('svg')].find(v => v.getAttribute('width') === '300' && v.getAttribute('height') === '600');
    if (!s) return;
    const cam = window.__cam || { tx: 0, ty: 0, s: 1 };
    const paths = [...s.querySelectorAll('path')].filter(p => p.getAttribute('fill') === 'gray');
    let best = null, bd = Infinity;
    for (const p of paths) { const r = p.getBoundingClientRect(); const bx = ((r.x + r.width / 2) - cam.tx) / cam.s, by = ((r.y + r.height / 2) - cam.ty) / cam.s; const d = Math.hypot(bx - 1449, by - 246); if (d < bd) { bd = d; best = p; } }
    if (!best) return;
    window.__balloonG = best.parentElement;
    best.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  };
  window.__hoverBalloonSlice = () => {
    if (!window.__balloonG) return;
    const slices = [...window.__balloonG.querySelectorAll('path')].filter(p => p.getAttribute('fill') === 'black');
    let best = null, ba = -1;
    for (const p of slices) { const r = p.getBoundingClientRect(); const a = r.width * r.height; if (a > ba) { ba = a; best = p; } }
    best && best.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  };
  window.__unhoverBalloon = () => { if (window.__balloonG) window.__balloonG.dispatchEvent(new MouseEvent('mouseout', { bubbles: true })); window.__balloonG = null; };
  window.__noteRange = () => { const xs = [...document.querySelectorAll('.collated-event rect')].map(r => +r.getAttribute('x')).filter(v => !isNaN(v)); return { min: Math.min(...xs), max: Math.max(...xs) }; };
  // pick the gray motivation hull nearest screen-centre and hover it
  // choose a compact edit-cluster that contains BOTH a deletion (red) and addition (green),
  // hover its motivation, and return that cluster's edit bbox (screen)
  window.__pickAndHoverMotiv = () => {
    const hulls = [...document.querySelectorAll('.versionView path')].filter(p => p.getAttribute('fill') === 'gray');
    let best = null, bestScore = Infinity;
    for (const hull of hulls) {
      const parent = hull.parentElement; if (!parent) continue;
      const eds = [...parent.querySelectorAll('path')].filter(p => { const f = p.getAttribute('fill') || ''; return f === '#aceebb' || f.startsWith('#fb7f78'); });
      if (!eds.length) continue;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, green = false, red = false;
      eds.forEach(p => { const f = p.getAttribute('fill'); if (f === '#aceebb') green = true; else red = true; const r = p.getBoundingClientRect(); x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); });
      const diag = Math.hypot(x1 - x0, y1 - y0);
      const center = Math.hypot((x0 + x1) / 2 - 800, (y0 + y1) / 2 - 450);
      const score = (green && red ? 0 : 1400) + diag + center * 0.25;
      if (score < bestScore) { bestScore = score; best = { hull, x0, y0, x1, y1 }; }
    }
    if (!best) return null;
    window.__hovered = best.hull;
    best.hull.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    // convert to BASE coords using the actually-applied camera transform
    const cam = window.__cam || { tx: 0, ty: 0, s: 1 };
    return { x: (best.x0 - cam.tx) / cam.s, y: (best.y0 - cam.ty) / cam.s, w: (best.x1 - best.x0) / cam.s, h: (best.y1 - best.y0) / cam.s };
  };
  window.__unhoverMotiv = () => { if (window.__hovered) { window.__hovered.dispatchEvent(new MouseEvent('mouseout', { bubbles: true })); window.__hovered.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true })); } window.__hovered = null; };
  // bbox (screen) of the densest knot of revealed green/red edits near screen centre
  window.__revealCluster = () => {
    const eds = [...document.querySelectorAll('.versionView path')]
      .filter(p => { const f = p.getAttribute('fill') || ''; return f === '#aceebb' || f.startsWith('#fb7f78'); })
      .filter(p => p.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
      .map(p => p.getBoundingClientRect())
      .filter(r => r.width > 0 && r.x > -200 && r.x < W + 200);
    if (!eds.length) return null;
    // seed = edit nearest screen centre, gather neighbours within radius
    let seed = eds[0], sd = Infinity;
    for (const r of eds) { const d = Math.hypot(r.x + r.width / 2 - 800, r.y + r.height / 2 - 450); if (d < sd) { sd = d; seed = r; } }
    const sx = seed.x + seed.width / 2, sy = seed.y + seed.height / 2;
    const near = eds.filter(r => Math.hypot(r.x + r.width / 2 - sx, r.y + r.height / 2 - sy) < 220);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    near.forEach(r => { x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); });
    return { x0, y0, x1, y1, n: near.length };
  };
}, { W, H, garamond, garamondIt });

const snap = (name) => page.screenshot({ path: join(framesDir, `${name}.png`), clip: { x: 0, y: 0, width: W, height: H } });

let playRange = { min: 540, max: 4043 };
// approximate label widths (px) measured once after first apply; updated live
const labelW = {};

function project(cam, tx, ty, bx, by) { return { x: tx + cam.s * bx, y: ty + cam.s * by }; }

function computeState(t) {
  const c = sample(CAM, t, ['s', 'cx', 'cy']);
  const tx = W / 2 - c.s * c.cx, ty = H / 2 - c.s * c.cy;
  const cu = sample(CUR, t, ['x', 'y']);
  const cs = project(c, tx, ty, cu.x, cu.y);
  // cursor visibility: only while the (world) cursor is actually moving, or briefly around a click
  const cuPrev = sample(CUR, Math.max(0, t - 0.08), ['x', 'y']);
  const speed = Math.hypot(cu.x - cuPrev.x, cu.y - cuPrev.y) / 0.08;   // base px/s
  const moveOp = clamp((speed - 25) / 120, 0, 1);
  let scale = 1, ring = 0, ringScale = 1, clickOp = 0;
  for (const ct of CLICKS) {
    const d = t - ct;
    if (d >= -0.5 && d <= 0.5) clickOp = Math.max(clickOp, 1 - Math.abs(d) / 0.5);
    if (d >= -0.12 && d <= 0.5) { const p = clamp((d + 0.12) / 0.62, 0, 1); scale = 1 - 0.18 * Math.sin(clamp((d + 0.12) / 0.24, 0, 1) * Math.PI); ring = 1 - p; ringScale = lerp(1, 4.2, p); }
  }
  const cursorO = Math.max(moveOp, clickOp);
  let cap = { o: 0, k: '', t: '' };
  for (const cp of CAP) if (t >= cp.s - 0.5 && t <= cp.e + 0.5) { cap = { o: win(t, cp.s, cp.e, 0.45), k: cp.k, t: cp.t }; break; }
  // annotations active now
  const anns = [];
  for (const a of ANN) {
    if (anns.length >= 4) break;
    if (t >= a.s - 0.4 && t <= a.e + 0.4) {
      const op = win(t, a.s, a.e, 0.4);
      if (a.brace) {
        const y0 = ty + c.s * a.by0, y1 = ty + c.s * a.by1, x = tx + c.s * a.bx, w = 12 * c.s;
        anns.push({ brace: true, op, t: a.t, x, y0, y1, w, tipx: x - 2 * w, cy: (y0 + y1) / 2 });
      } else {
        const tgt = project(c, tx, ty, a.bx, a.by);
        const lab = project(c, tx, ty, a.lx, a.ly);
        anns.push({ op, t: a.t, lx: lab.x, ly: lab.y, tx: tgt.x, ty: tgt.y, lw: labelW[a.t] || (a.t.length * 13) });
      }
    }
  }
  const st = {
    s: c.s, tx, ty,
    cur: { x: cs.x, y: cs.y, o: cursorO, scale, ring, ringScale },
    cap, anns, play: null, resetNotes: false, scrollLeft: null,
  };
  if (t >= PLAY_T0 && t <= PLAY_T1) {
    const p = easeIO(clamp((t - PLAY_T0) / (PLAY_T1 - PLAY_T0), 0, 1));
    const X = lerp(playRange.min, playRange.max, p);
    st.scrollLeft = X - SCROLL_BASE; st.play = { X, win: HL_WIN, px: tx + c.s * SCROLL_BASE };
  } else if (t > PLAY_T1 && t < PLAY_T1 + 2.0) { st.resetNotes = true; st.scrollLeft = 0; }
  return st;
}

const fired = new Set();
async function fireActions(t) {
  for (let i = 0; i < ACTIONS.length; i++) {
    const a = ACTIONS[i];
    if (!fired.has(i) && t >= a.t) {
      fired.add(i);
      if (a.type === 'tab') await page.evaluate(n => window.__clickTab(n), a.arg);
      else if (a.type === 'version') await page.evaluate(s => window.__selectVersion(s), a.arg);
      else if (a.type === 'stretch') await page.evaluate(v => window.__setStretch(v), a.arg);
      else if (a.type === 'copy') await page.evaluate(i => window.__selectCopy(i), a.arg);
      else if (a.type === 'clickArguable') await page.evaluate(() => window.__clickArguable());
      else if (a.type === 'openDownload') await page.evaluate(() => window.__clickIcon('DownloadIcon'));
      else if (a.type === 'clickIcon') await page.evaluate(l => window.__clickIcon(l), a.arg);
      else if (a.type === 'closeDialog') await page.evaluate(() => window.__closeDialog());
      else if (a.type === 'hoverBalloon') { await page.evaluate(() => window.__hoverBalloon()); await new Promise(r => setTimeout(r, 250)); }
      else if (a.type === 'hoverBalloonSlice') await page.evaluate(() => window.__hoverBalloonSlice());
      else if (a.type === 'unhoverBalloon') await page.evaluate(() => window.__unhoverBalloon());
      else if (a.type === 'hoverMotiv') {
        const rect = await page.evaluate(() => window.__pickAndHoverMotiv());  // base coords
        await new Promise(r => setTimeout(r, 350));   // let React mount the revealed EditViews
        if (rect) {
          const bw = Math.max(90, rect.w), bh = Math.max(70, rect.h);
          const s = clamp(Math.min(W / (bw * 2.4), H / (bh * 2.4)), 1.8, 3.2);
          const cx = rect.x + bw / 2, cy = rect.y + bh / 2;
          for (const k of CAM) if (k.t === 46.6 || k.t === 56.8) { k.s = s; k.cx = cx; k.cy = cy; }
        }
      }
      else if (a.type === 'unhoverMotiv') await page.evaluate(() => window.__unhoverMotiv());
      else if (a.type === 'measurePlay') playRange = await page.evaluate(() => window.__noteRange());
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    }
  }
}

async function applyFrame(t) {
  const st = computeState(t);
  await page.evaluate(s => window.__apply(s), st);
  // refresh measured label widths for active annotations
  if (st.anns.length) {
    const ws = await page.evaluate(n => Array.from({ length: n }, (_, i) => window.__labelWidth(i)), st.anns.length);
    st.anns.forEach((a, i) => { labelW[a.t] = ws[i]; });
  }
  await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));
}

if (SMOKE) {
  const keyT = [50, 63, 79.5, 87];
  let prev = 0;
  for (const t of keyT) {
    for (let tt = prev; tt <= t; tt += 1 / FPS) await fireActions(tt);
    prev = t;
    await applyFrame(t);
    await snap(`s_${String(Math.round(t * 10)).padStart(4, '0')}`);
  }
  await browser.close(); console.log('smoke3 ->', framesDir); process.exit(0);
}

const total = Math.ceil(DURATION * FPS);
console.log(`diss demo: ${total} frames @ ${FPS}`);
const t0 = Date.now();
for (let i = 0; i < total; i++) {
  const t = i / FPS;
  await fireActions(t);
  await applyFrame(t);
  await snap(`f_${String(i).padStart(5, '0')}`);
  if (i % 60 === 0 || i === total - 1) console.log(`  ${i + 1}/${total}  ${((i + 1) / total * 100).toFixed(1)}%  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close(); console.log('done.');
