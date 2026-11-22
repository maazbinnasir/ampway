/* Pencil-style sketches of the two stations, drawn with rough.js onto a transparent canvas.
   Hamm (Westf) Hbf: modest historicist building from 1920, central hall with a big arched window.
   Düsseldorf Hbf: long 1930s "New Objectivity" building with a tall clock tower.
   Simplified illustrations, not exact architectural drawings. */
import rough from '../vendor/rough.esm.js';

const GRAPHITE = '#3b3934';
const SOFT = 'rgba(59,57,52,0.55)';
const PAPER = { fill: 'rgba(241,236,226,0.96)', fillStyle: 'solid' };

function pencil(seed, extra = {}) {
  return { stroke: GRAPHITE, strokeWidth: 2.1, roughness: 1.35, bowing: 1.1, seed, ...extra };
}
function hatch(seed, gap = 11, extra = {}) {
  return pencil(seed, { fill: 'rgba(59,57,52,0.5)', fillStyle: 'hachure', hachureGap: gap, fillWeight: 1.1, hachureAngle: -41, ...extra });
}
function sign(g, text, x, y, size, seed) {
  g.save();
  g.fillStyle = GRAPHITE;
  g.font = `800 ${size}px "Schibsted", "Inter Tight", sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.letterSpacing = `${size * 0.08}px`;
  // two slightly offset passes read like pencil lettering
  g.globalAlpha = 0.9; g.fillText(text, x, y);
  g.globalAlpha = 0.35; g.fillText(text, x + 1.6, y + 1.2);
  g.restore();
}
function ground(rc, w, y, seed) {
  rc.line(40, y, w - 40, y, pencil(seed, { strokeWidth: 2.4 }));
  rc.line(140, y + 16, w - 220, y + 14, pencil(seed + 1, { stroke: SOFT, strokeWidth: 1.4 }));
}
function tree(rc, x, base, s, seed) {
  rc.line(x, base, x, base - 120 * s, pencil(seed, { strokeWidth: 2.6 }));
  rc.ellipse(x, base - 160 * s, 150 * s, 130 * s, hatch(seed + 1, 13, { hachureAngle: 60 }));
  rc.ellipse(x - 40 * s, base - 120 * s, 90 * s, 80 * s, pencil(seed + 2, { stroke: SOFT }));
}
function lamp(rc, x, base, seed) {
  rc.line(x, base, x, base - 210, pencil(seed, { strokeWidth: 2 }));
  rc.line(x, base - 210, x + 34, base - 222, pencil(seed + 1));
  rc.rectangle(x + 26, base - 228, 22, 14, pencil(seed + 2));
}
function clockFace(rc, g, cx, cy, r, seed) {
  rc.circle(cx, cy, r * 2, pencil(seed, { fill: 'rgba(255,255,255,0.35)', fillStyle: 'solid' }));
  rc.circle(cx, cy, r * 1.6, pencil(seed + 1, { stroke: SOFT, strokeWidth: 1.3 }));
  rc.line(cx, cy, cx, cy - r * 0.62, pencil(seed + 2, { strokeWidth: 2.6 }));
  rc.line(cx, cy, cx + r * 0.42, cy + r * 0.18, pencil(seed + 3, { strokeWidth: 2.6 }));
}
function clouds(rc, w, seed) {
  rc.curve([[w * 0.12, 150], [w * 0.17, 120], [w * 0.23, 132], [w * 0.28, 110], [w * 0.33, 140]], pencil(seed, { stroke: SOFT, strokeWidth: 1.5 }));
  rc.curve([[w * 0.66, 120], [w * 0.71, 96], [w * 0.77, 108], [w * 0.82, 90], [w * 0.88, 118]], pencil(seed + 1, { stroke: SOFT, strokeWidth: 1.5 }));
  [[w * 0.42, 170], [w * 0.45, 190], [w * 0.6, 150]].forEach(([x, y], i) => {
    rc.linearPath([[x - 14, y - 8], [x, y], [x + 14, y - 8]], pencil(seed + 3 + i, { stroke: SOFT, strokeWidth: 1.4 }));
  });
}

/* ----------------------------------------------------------- Hamm Hbf */
export function drawHamm(canvas) {
  const g = canvas.getContext('2d'); const w = 2400, h = 1000; // logical size, scaled to the canvas
  g.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
  g.clearRect(0, 0, w, h);
  const rc = rough.canvas(canvas);
  const base = h - 70;
  clouds(rc, w, 3);

  // side wings
  [[420, 900], [1500, 1980]].forEach(([x0, x1], k) => {
    rc.rectangle(x0, 560, x1 - x0, base - 560, pencil(10 + k, PAPER));
    rc.polygon([[x0 - 18, 560], [x1 + 18, 560], [x1 - 30, 492], [x0 + 30, 492]], hatch(20 + k, 12));
    for (let i = 0; i < 6; i++) {
      const wx = x0 + 34 + i * ((x1 - x0 - 68) / 6);
      const ww = (x1 - x0 - 68) / 6 - 26;
      rc.rectangle(wx + 13, 630, ww, 150, pencil(30 + i + k * 10, { strokeWidth: 1.7 }));
      rc.line(wx + 13 + ww / 2, 630, wx + 13 + ww / 2, 780, pencil(50 + i, { stroke: SOFT, strokeWidth: 1.2 }));
      rc.line(wx + 13, 690, wx + 13 + ww, 690, pencil(60 + i, { stroke: SOFT, strokeWidth: 1.2 }));
    }
    rc.line(x0, 820, x1, 820, pencil(70 + k, { stroke: SOFT }));
  });

  // central hall
  rc.rectangle(900, 430, 600, base - 430, pencil(80, { strokeWidth: 2.5, ...PAPER }));
  rc.polygon([[878, 430], [1522, 430], [1436, 286], [964, 286]], hatch(81, 10));
  rc.line(964, 286, 1436, 286, pencil(82, { strokeWidth: 2.6 }));
  // pilasters
  [920, 1480].forEach((x, i) => rc.rectangle(x, 440, 22, base - 440, pencil(83 + i, { stroke: SOFT })));
  // big arched window
  rc.path('M1040,820 L1040,650 A160,160 0 0 1 1360,650 L1360,820 Z', hatch(90, 16, { hachureAngle: 70, fill: 'rgba(59,57,52,0.28)' }));
  [1120, 1200, 1280].forEach((x, i) => rc.line(x, 520, x, 820, pencil(91 + i, { strokeWidth: 1.5 })));
  rc.line(1040, 700, 1360, 700, pencil(95, { strokeWidth: 1.5 }));
  // doors
  [1078, 1166, 1254].forEach((x, i) => rc.rectangle(x, 836, 68, base - 836, pencil(96 + i, { strokeWidth: 1.8 })));
  // clock in the roof
  clockFace(rc, g, 1200, 362, 44, 100);
  // name board
  rc.rectangle(990, 440, 420, 78, pencil(105, { fill: 'rgba(255,255,255,0.75)', fillStyle: 'solid', strokeWidth: 2.4 }));
  sign(g, 'HAMM HBF', 1200, 481, 52, 106);

  tree(rc, 250, base, 1.05, 120); tree(rc, 2150, base, 0.95, 130);
  lamp(rc, 340, base, 140); lamp(rc, 2030, base, 150);
  ground(rc, w, base, 160);
}

/* ----------------------------------------------------- Düsseldorf Hbf */
export function drawDus(canvas) {
  const g = canvas.getContext('2d'); const w = 2400, h = 1000; // logical size, scaled to the canvas
  g.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
  g.clearRect(0, 0, w, h);
  const rc = rough.canvas(canvas);
  const base = h - 70;
  clouds(rc, w, 7);

  // long low wings with ribbon windows
  rc.rectangle(160, 560, 2080, base - 560, pencil(200, { strokeWidth: 2.4, ...PAPER }));
  rc.line(150, 560, 2250, 560, pencil(201, { strokeWidth: 3 }));
  [620, 720].forEach((y, r) => {
    [[200, 840], [1560, 2200]].forEach(([x0, x1], k) => {
      rc.rectangle(x0, y, x1 - x0, 58, hatch(210 + r * 4 + k, 14, { fill: 'rgba(59,57,52,0.25)' }));
      for (let x = x0 + 46; x < x1; x += 46) rc.line(x, y, x, y + 58, pencil(230 + x % 97, { stroke: SOFT, strokeWidth: 1.1 }));
    });
  });

  // tall central hall with vertical window strips
  rc.rectangle(880, 360, 640, base - 360, pencil(300, { strokeWidth: 2.6, ...PAPER }));
  rc.line(870, 360, 1530, 360, pencil(301, { strokeWidth: 3 }));
  rc.rectangle(990, 380, 420, 150, pencil(302, { fill: 'rgba(255,255,255,0.75)', fillStyle: 'solid', strokeWidth: 2.4 }));
  sign(g, 'DÜSSELDORF', 1200, 428, 50, 303);
  sign(g, 'HBF', 1200, 488, 50, 304);
  for (let i = 0; i < 7; i++) {
    const x = 922 + i * 80;
    rc.rectangle(x, 556, 44, 232, hatch(310 + i, 15, { hachureAngle: 80, fill: 'rgba(59,57,52,0.3)' }));
  }
  // entrance canopy and doors
  rc.rectangle(840, 806, 720, 22, hatch(330, 8));
  [880, 1520].forEach((x, i) => rc.line(x, 828, x, base, pencil(331 + i)));
  for (let i = 0; i < 5; i++) rc.rectangle(946 + i * 104, 846, 74, base - 846, pencil(340 + i, { strokeWidth: 1.7 }));

  // clock tower
  rc.rectangle(620, 70, 150, base - 70, pencil(400, { strokeWidth: 2.7, ...PAPER }));
  rc.line(608, 70, 782, 70, pencil(401, { strokeWidth: 3 }));
  rc.rectangle(620, 70, 150, 230, hatch(402, 18, { fill: 'rgba(59,57,52,0.18)' }));
  clockFace(rc, g, 695, 185, 56, 403);
  for (let i = 0; i < 5; i++) rc.rectangle(672, 340 + i * 96, 46, 62, pencil(410 + i, { strokeWidth: 1.5 }));

  // overhead line poles + a tram on the right
  [1880, 2280].forEach((x, i) => { rc.line(x, base, x, 300, pencil(420 + i)); rc.line(x - 50, 320, x + 50, 320, pencil(422 + i)); });
  rc.line(1830, 330, 2340, 330, pencil(424, { stroke: SOFT, strokeWidth: 1.3 }));
  rc.rectangle(1900, 690, 360, base - 690, pencil(430, { fill: 'rgba(255,255,255,0.45)', fillStyle: 'solid' }));
  for (let i = 0; i < 4; i++) rc.rectangle(1922 + i * 84, 716, 62, 64, pencil(431 + i, { strokeWidth: 1.4 }));
  rc.line(2080, 690, 2080, 330, pencil(436, { stroke: SOFT, strokeWidth: 1.3 }));

  tree(rc, 110, base, 0.9, 450); lamp(rc, 820, base, 460); lamp(rc, 1580, base, 470);
  ground(rc, w, base, 480);
}
