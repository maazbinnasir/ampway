/* AmpWay · Prototype v1
   Interactive 3D station: tap card -> slot unlocks -> power bank floats out -> travel -> return.
   Units: centimetres. Station front face sits at z = 0, floor at y = 0. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { drawHamm, drawDus } from './sketches.js';

/* ================================================================ setup */
const $ = (s) => document.querySelector(s);
const canvas = $('#scene');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => innerWidth < 820;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = {
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  expo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  back: (t) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};

const COLOR = { ink: '#121212', paper: '#F1ECE2', paperHi: '#F8F5EF', signal: '#FF4D1A', charge: '#2F9E68', mute: '#6C675E', graphite: '#2A2B2E' };
const FONT = { display: '"Schibsted", "Inter Tight", sans-serif', text: '"Inter Tight", system-ui, sans-serif', mono: '"JetBrains Mono", ui-monospace, monospace' };
const MARK_RAILS = new Path2D('M35.95,92.96 L11.17,98.17 L4.00,112.00 L30.00,112.00 Z M60.00,16.00 L72.27,55.26 L84.86,51.94 L60.00,4.00 L16.19,88.48 L42.53,71.90 Z M90.00,112.00 L116.00,112.00 L91.16,64.10 L77.81,73.00 Z');
const MARK_BOLT = new Path2D('M14.00,94.00 L68.00,60.00 L60.00,73.00 L106.00,50.00 L52.00,86.00 L60.00,74.00 Z');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
let DPR = Math.min(devicePixelRatio, isMobile() ? 1.5 : 1.75);
renderer.setPixelRatio(DPR);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = false;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 5, 4000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 70;
controls.maxDistance = 900;
controls.maxPolarAngle = Math.PI * 0.53;
controls.minPolarAngle = Math.PI * 0.12;
controls.autoRotateSpeed = 0.55;
controls.rotateSpeed = 0.7;

// lights
scene.add(new THREE.HemisphereLight(0xffffff, 0xb9ad98, 0.55));
const key = new THREE.DirectionalLight(0xfff6ea, 2.1);
key.position.set(120, 460, 230);
key.castShadow = true;
key.shadow.mapSize.set(isMobile() ? 1024 : 1536, isMobile() ? 1024 : 1536);
Object.assign(key.shadow.camera, { left: -220, right: 220, top: 260, bottom: -160, near: 50, far: 1100 });
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.6;
key.shadow.radius = 6;
scene.add(key);
const rim = new THREE.DirectionalLight(0xffffff, 0.9);
rim.position.set(-260, 180, -220);
scene.add(rim);

// floor: soft cast shadow + contact shadow
const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.ShadowMaterial({ opacity: 0.07 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const contact = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(18,18,18,0.55)'); grd.addColorStop(0.45, 'rgba(18,18,18,0.22)'); grd.addColorStop(1, 'rgba(18,18,18,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(130, 105), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(0, 0.05, -22); return m;
})();
scene.add(contact);

/* ================================================================ canvas textures */
const textures = [];
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  t.userData.draw = draw; textures.push(t); paint(t); return t;
}
function paint(t) { const c = t.image; c.width = c.width; t.userData.draw(c.getContext('2d'), c.width, c.height); t.needsUpdate = true; }
function drawMark(g, x, y, size, rail = COLOR.ink, bolt = COLOR.signal) {
  g.save(); g.translate(x, y); g.scale(size / 120, size / 120);
  g.fillStyle = rail; g.fill(MARK_RAILS); g.fillStyle = bolt; g.fill(MARK_BOLT); g.restore();
}
function contactless(g, cx, cy, s, color, lw) {
  g.save(); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round';
  [0.42, 0.72, 1.02].forEach((r, i) => { g.beginPath(); g.arc(cx - s * 0.55, cy, r * s, -0.95, 0.95); g.globalAlpha = 1 - i * 0.12; g.stroke(); });
  g.restore();
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

/* ================================================================ materials */
const M = {
  body: new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.4, metalness: 0.35, envMapIntensity: 0.9 }),
  face: new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.62, metalness: 0.2, envMapIntensity: 0.7 }),
  plinth: new THREE.MeshStandardMaterial({ color: 0x0f1011, roughness: 0.7, metalness: 0.3 }),
  trim: new THREE.MeshStandardMaterial({ color: 0xbcbab4, roughness: 0.3, metalness: 0.85 }),
  bezel: new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.25, metalness: 0.4 }),
  socket: new THREE.MeshStandardMaterial({ color: 0x070708, roughness: 0.85, metalness: 0.1 }),
  signal: new THREE.MeshStandardMaterial({ color: 0xff4d1a, emissive: 0xff4d1a, emissiveIntensity: 0.9, roughness: 0.4 }),
  bank: new THREE.MeshStandardMaterial({ color: 0xeeebe5, roughness: 0.48, metalness: 0 }),
  cable: new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.55 }),
  plug: new THREE.MeshStandardMaterial({ color: 0xc8c6c0, roughness: 0.3, metalness: 0.9 }),
};

/* ================================================================ station */
const station = new THREE.Group();
scene.add(station);
const W = 60, D = 45, BASE = 8, BODY_TOP = 160, TOP = 182;

function add(mesh, parent = station, { cast = true, receive = true } = {}) { mesh.castShadow = cast; mesh.receiveShadow = receive; parent.add(mesh); return mesh; }

add(new THREE.Mesh(new RoundedBoxGeometry(54, BASE, 39, 2, 1.5), M.plinth)).position.set(0, BASE / 2, -D / 2);
add(new THREE.Mesh(new RoundedBoxGeometry(W, BODY_TOP - BASE, D, 5, 3), M.body)).position.set(0, BASE + (BODY_TOP - BASE) / 2, -D / 2);
add(new THREE.Mesh(new RoundedBoxGeometry(W, TOP - BODY_TOP - 0.6, D, 5, 3), M.body)).position.set(0, BODY_TOP + (TOP - BODY_TOP) / 2 + 0.3, -D / 2);
// signal light line between body and header (front + sides)
const glowLine = add(new THREE.Mesh(new THREE.BoxGeometry(W - 3, 0.7, D - 3), M.signal), station, { cast: false });
glowLine.position.set(0, BODY_TOP + 0.05, -D / 2);

// header lightbox with logo
const headerTex = canvasTexture(1680, 560, (g, w, h) => {
  g.fillStyle = '#141416'; g.fillRect(0, 0, w, h);
  const s = h * 0.52; g.font = `800 ${h * 0.36}px ${FONT.display}`; g.letterSpacing = `${-h * 0.014}px`;
  const tw = g.measureText('AmpWay').width; const total = s * 1.1 + tw; const x0 = (w - total) / 2;
  drawMark(g, x0, (h - s) / 2 - h * 0.012, s, COLOR.paper);
  g.fillStyle = COLOR.paper; g.textBaseline = 'middle'; g.fillText('AmpWay', x0 + s * 1.1, h * 0.52);
});
const headerMat = new THREE.MeshBasicMaterial({ map: headerTex, toneMapped: false, color: 0x000000 });
const headerFace = add(new THREE.Mesh(new THREE.PlaneGeometry(54, 18), headerMat), station, { cast: false });
headerFace.position.set(0, BODY_TOP + 11, 0.18);

// station name plate (flips at step 3)
// every texture that changes during the demo is drawn once up front and only swapped later,
// so nothing is repainted (and re-uploaded to the GPU) in the middle of an animation
const HAMM = 'HAMM HBF', DUS = 'DÜSSELDORF HBF';
let stationName = HAMM;
const plateCache = new Map();
function plateTexFor(name) {
  if (!plateCache.has(name)) plateCache.set(name, canvasTexture(1200, 180, (g, w, h) => {
    g.fillStyle = '#0d0d0e'; g.fillRect(0, 0, w, h);
    g.fillStyle = COLOR.signal; g.fillRect(0, 0, h * 0.09, h);
    g.fillStyle = COLOR.paper; g.font = `500 ${h * 0.4}px ${FONT.mono}`; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.letterSpacing = `${h * 0.06}px`; g.fillText(name, w / 2, h * 0.54);
  }));
  return plateCache.get(name);
}
const plate = new THREE.Group(); plate.position.set(0, 151.5, 0.3); station.add(plate);
const plateMat = new THREE.MeshBasicMaterial({ map: plateTexFor(HAMM), toneMapped: false });
const plateMats = [M.bezel, M.bezel, M.bezel, M.bezel, plateMat, M.bezel];
add(new THREE.Mesh(new THREE.BoxGeometry(40, 6, 0.6), plateMats), plate);

// screen
let screenState = 'idle';
const SCREEN = { w: 48, h: 27 };
const screenCache = new Map();
function screenTexFor(st, nm) {
  const k = `${st}|${nm}`;
  if (!screenCache.has(k)) screenCache.set(k, canvasTexture(1280, 720, (g, w, h) => drawScreen(g, w, h, st, nm)));
  return screenCache.get(k);
}
const screenTex = screenTexFor('idle', HAMM);
add(new THREE.Mesh(new RoundedBoxGeometry(52.5, 31.5, 1.8, 3, 1.4), M.bezel)).position.set(0, 128, 0.5);
const screenMesh = add(new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })), station, { cast: false });
screenMesh.position.set(0, 128, 1.62);

function drawScreen(g, w, h, st, nm) {
  const u = h / 100;
  g.fillStyle = '#FBFAF7'; g.fillRect(0, 0, w, h);
  // status bar
  drawMark(g, 5 * u, 5 * u, 9 * u);
  g.fillStyle = COLOR.ink; g.font = `800 ${6.2 * u}px ${FONT.display}`; g.textBaseline = 'middle'; g.letterSpacing = `${-0.25 * u}px`;
  g.fillText('AmpWay', 15.5 * u, 9.8 * u); g.letterSpacing = '0px';
  g.font = `500 ${3.6 * u}px ${FONT.mono}`; g.fillStyle = COLOR.mute; g.textAlign = 'right';
  g.fillText(nm, w - 6 * u, 9.6 * u); g.textAlign = 'left';
  g.fillStyle = 'rgba(18,18,18,.08)'; g.fillRect(5 * u, 19 * u, w - 10 * u, 0.35 * u);
  const L = 7 * u;
  const title = (t, y, size = 15) => { g.fillStyle = COLOR.ink; g.font = `800 ${size * u}px ${FONT.display}`; g.letterSpacing = `${-0.55 * u}px`; g.fillText(t, L, y); g.letterSpacing = '0px'; };
  const sub = (t, y, col = COLOR.mute) => { g.fillStyle = col; g.font = `500 ${5 * u}px ${FONT.text}`; g.fillText(t, L, y); };
  if (st === 'idle' || st === 'arrive') {
    if (st === 'idle') { title('Tap to', 40 * u); title('charge', 56 * u); sub('No app. No sign-up.', 71 * u); }
    else { title('Return', 40 * u); title('here', 56 * u); sub('Slide it into any free slot.', 71 * u); }
    const cx = w - 30 * u, cy = 50 * u;
    g.fillStyle = 'rgba(255,77,26,.1)'; g.beginPath(); g.arc(cx, cy, 19 * u, 0, Math.PI * 2); g.fill();
    contactless(g, cx + 4 * u, cy, 12 * u, COLOR.signal, 2.8 * u);
    g.fillStyle = COLOR.charge; g.beginPath(); g.arc(L + 1.2 * u, 88 * u, 1.3 * u, 0, Math.PI * 2); g.fill();
    g.fillStyle = COLOR.ink; g.font = `500 ${3.8 * u}px ${FONT.mono}`; g.fillText(st === 'idle' ? '23 POWER BANKS READY' : '11 SLOTS FREE', L + 4.5 * u, 88.4 * u);
  }
  if (st === 'unlocked') {
    sub('Payment approved', 34 * u, COLOR.charge);
    g.fillStyle = COLOR.signal; g.font = `800 ${24 * u}px ${FONT.display}`; g.letterSpacing = `${-1 * u}px`; g.fillText('Slot 12', L - 1 * u, 58 * u); g.letterSpacing = '0px';
    sub('Take your power bank below.', 75 * u, COLOR.ink);
    g.strokeStyle = COLOR.signal; g.lineWidth = 2.6 * u; g.lineCap = 'round'; g.lineJoin = 'round';
    const ax = w - 24 * u; g.beginPath(); g.moveTo(ax, 36 * u); g.lineTo(ax, 70 * u); g.moveTo(ax - 9 * u, 61 * u); g.lineTo(ax, 70 * u); g.lineTo(ax + 9 * u, 61 * u); g.stroke();
  }
  if (st === 'trip') {
    title('Have a good', 40 * u, 13); title('trip.', 55 * u, 13);
    const y = 76 * u, x0 = L + 1.5 * u, x1 = w - 9 * u;
    g.strokeStyle = COLOR.signal; g.lineWidth = 1.6 * u; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
    [x0, x1].forEach((x) => { g.fillStyle = '#fff'; g.strokeStyle = COLOR.ink; g.lineWidth = 1.2 * u; g.beginPath(); g.arc(x, y, 2 * u, 0, Math.PI * 2); g.fill(); g.stroke(); });
    g.font = `500 ${3.4 * u}px ${FONT.mono}`; g.fillStyle = COLOR.ink; g.fillText('HAMM', x0 - 1.5 * u, y + 8 * u); g.textAlign = 'right'; g.fillText('ANY AMPWAY STATION', x1 + 2 * u, y + 8 * u); g.textAlign = 'left';
  }
  if (st === 'returned') {
    const cx = w - 28 * u, cy = 50 * u;
    g.fillStyle = COLOR.charge; g.beginPath(); g.arc(cx, cy, 15 * u, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 3 * u; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(cx - 6.5 * u, cy + 0.5 * u); g.lineTo(cx - 1.5 * u, cy + 5.5 * u); g.lineTo(cx + 7 * u, cy - 5 * u); g.stroke();
    title('Returned.', 46 * u); sub('Rental ended · 1 h 14 min', 62 * u, COLOR.ink); sub('Receipt sent to your card.', 72 * u);
  }
}
function setScreen(s) { screenState = s; screenMesh.material.map = screenTexFor(s, stationName); }
function setStation(name) { stationName = name; plateMat.map = plateTexFor(name); }
const PREWARM = [['idle', HAMM], ['unlocked', HAMM], ['trip', HAMM], ['arrive', DUS], ['returned', DUS]];

// card reader + tap pad
add(new THREE.Mesh(new RoundedBoxGeometry(15, 15, 2.6, 3, 1.6), M.bezel)).position.set(0, 104, 0.7);
const padTex = canvasTexture(512, 512, (g, w, h) => {
  g.fillStyle = COLOR.signal; g.fillRect(0, 0, w, h);
  contactless(g, w * 0.56, h * 0.43, w * 0.19, '#fff', w * 0.05);
  g.fillStyle = '#fff'; g.font = `500 ${h * 0.075}px ${FONT.mono}`; g.textAlign = 'center'; g.letterSpacing = `${w * 0.012}px`; g.fillText('TAP CARD', w / 2, h * 0.84);
});
const padMat = new THREE.MeshStandardMaterial({ map: padTex, emissive: 0xffffff, emissiveMap: padTex, emissiveIntensity: 0.35, roughness: 0.5 });
const pad = add(new THREE.Mesh(new RoundedBoxGeometry(11.5, 11.5, 0.4, 2, 1.2), padMat), station, { cast: false });
pad.position.set(0, 104, 2.05);

// slot panel
add(new THREE.Mesh(new RoundedBoxGeometry(51, 62, 1.4, 3, 1.5), M.face)).position.set(0, 66.5, -0.6);
const slotLabelTex = canvasTexture(1530, 90, (g, w, h) => {
  g.fillStyle = '#18191b'; g.fillRect(0, 0, w, h);
  g.font = `500 ${h * 0.42}px ${FONT.mono}`; g.textBaseline = 'middle'; g.letterSpacing = `${h * 0.04}px`;
  g.fillStyle = 'rgba(241,236,226,.7)'; g.fillText('24 POWER BANKS · SODIUM-ION', w * 0.045, h * 0.55);
  g.textAlign = 'right'; g.fillStyle = COLOR.charge; g.fillText('● 23 READY', w * 0.955, h * 0.55);
});
const slotLabel = add(new THREE.Mesh(new THREE.PlaneGeometry(51, 3), new THREE.MeshBasicMaterial({ map: slotLabelTex, toneMapped: false })), station, { cast: false });
slotLabel.position.set(0, 99.6, 0.32);

// side panel decoration
const sideTex = canvasTexture(900, 3040, (g, w, h) => {
  g.fillStyle = '#2a2b2e'; g.fillRect(0, 0, w, h);
  g.save(); g.translate(w * 0.5, h * 0.62); g.rotate(-Math.PI / 2);
  g.globalAlpha = 0.5; g.fillStyle = '#3a3b3f'; g.font = `800 ${w * 0.5}px ${FONT.display}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = `${-w * 0.02}px`;
  g.fillText('AmpWay', 0, 0); g.restore();
  g.fillStyle = COLOR.signal; g.fillRect(w * 0.12, h * 0.08, w * 0.012, h * 0.84);
  g.font = `500 ${w * 0.035}px ${FONT.mono}`; g.fillStyle = 'rgba(241,236,226,.55)'; g.letterSpacing = `${w * 0.006}px`;
  ['PICK UP', 'CHARGE ON THE TRAIN', 'RETURN AT ANY STATION'].forEach((t, i) => g.fillText(t, w * 0.18, h * 0.1 + i * w * 0.07));
});
const side = new THREE.Mesh(new THREE.PlaneGeometry(D - 6, BODY_TOP - BASE - 8), new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.5, metalness: 0.3 }));
side.rotation.y = Math.PI / 2; side.position.set(W / 2 + 0.18, BASE + (BODY_TOP - BASE) / 2, -D / 2); station.add(side);

/* ---------- power bank factory ---------- */
const bankFaceTex = canvasTexture(650, 250, (g, w, h) => {
  g.fillStyle = '#EEEBE5'; g.fillRect(0, 0, w, h);
  drawMark(g, w * 0.07, h * 0.2, h * 0.52);
  g.fillStyle = COLOR.ink; g.font = `800 ${h * 0.3}px ${FONT.display}`; g.textBaseline = 'middle'; g.letterSpacing = `${-h * 0.012}px`;
  g.fillText('AmpWay', w * 0.07 + h * 0.6, h * 0.47);
  g.fillStyle = COLOR.signal; g.fillRect(0, h * 0.86, w, h * 0.14);
});
const ledOn = new THREE.MeshBasicMaterial({ color: 0x3fd18b, toneMapped: false });
const ledOff = new THREE.MeshBasicMaterial({ color: 0x9a978f });
function makeBank(withCable) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(6.5, 2.5, 10, 3, 0.55), M.bank); body.castShadow = true; body.receiveShadow = true; g.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(6.1, 2.1), new THREE.MeshStandardMaterial({ map: bankFaceTex, roughness: 0.5 }));
  face.position.z = 5.01; g.add(face);
  const leds = [];
  for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), ledOn); d.rotation.x = -Math.PI / 2; d.position.set(-1.05 + i * 0.7, 1.26, 3.4); g.add(d); leds.push(d); }
  if (withCable) {
    // two short integrated cables tucked along the right side, plugs at the back
    [[-0.45, 'USB-C'], [0.45, 'Lightning']].forEach(([y]) => {
      const path = new THREE.CatmullRomCurve3([new THREE.Vector3(2.9, y, 4.6), new THREE.Vector3(3.36, y, 3.6), new THREE.Vector3(3.36, y, -3.6), new THREE.Vector3(3.0, y, -5.0), new THREE.Vector3(2.2, y, -5.35)]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 32, 0.12, 8), M.cable); tube.castShadow = true; g.add(tube);
      const boot = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.42, 0.75, 2, 0.15), M.cable); boot.position.set(1.75, y, -5.45); g.add(boot);
      const plug = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.22, 0.6, 2, 0.08), M.plug); plug.position.set(1.15, y, -5.45); g.add(plug);
    });
  }
  g.userData.leds = leds;
  return g;
}

/* ---------- slots, LEDs, banks ---------- */
const COLS = [-18, -6, 6, 18], ROWS = [90, 81, 72, 63, 54, 45];
const socketGeo = (() => {
  const s = new THREE.Shape(); const ow = 8.6, oh = 4.2, iw = 7.2, ih = 3.0, r = 0.8;
  s.moveTo(-ow / 2 + r, -oh / 2); s.lineTo(ow / 2 - r, -oh / 2); s.quadraticCurveTo(ow / 2, -oh / 2, ow / 2, -oh / 2 + r); s.lineTo(ow / 2, oh / 2 - r); s.quadraticCurveTo(ow / 2, oh / 2, ow / 2 - r, oh / 2);
  s.lineTo(-ow / 2 + r, oh / 2); s.quadraticCurveTo(-ow / 2, oh / 2, -ow / 2, oh / 2 - r); s.lineTo(-ow / 2, -oh / 2 + r); s.quadraticCurveTo(-ow / 2, -oh / 2, -ow / 2 + r, -oh / 2);
  const h = new THREE.Path(); h.moveTo(-iw / 2, -ih / 2); h.lineTo(-iw / 2, ih / 2); h.lineTo(iw / 2, ih / 2); h.lineTo(iw / 2, -ih / 2); h.lineTo(-iw / 2, -ih / 2); s.holes.push(h);
  return new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false });
})();
const ledGeo = new THREE.CircleGeometry(0.62, 24);
const slots = [];
ROWS.forEach((y) => COLS.forEach((x) => {
  const sock = new THREE.Mesh(socketGeo, M.socket); sock.position.set(x, y, 0.12); station.add(sock);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3.0), M.socket); back.position.set(x, y, -10); station.add(back);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x2f9e68, toneMapped: false });
  const led = new THREE.Mesh(ledGeo, ledMat); led.position.set(x + 5.35, y, 0.35); station.add(led);
  const bank = makeBank(false); bank.position.set(x, y, -4.55); station.add(bank);
  slots.push({ x, y, led, bank, home: bank.position.clone() });
}));
const EMPTY = 5; slots[EMPTY].bank.visible = false; slots[EMPTY].led.material.color.set(0x3a3b3e);
const SLOT = 11; // row 2, column 4 -> "Slot 12"
const S = slots[SLOT];
// the demo power bank is a separate, cable-equipped model that replaces the docked one
S.bank.visible = false;
const hero = makeBank(true);
station.add(hero);
hero.position.copy(S.home);

/* ---------- bank card for the tap animation ---------- */
const cardTex = canvasTexture(856, 540, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#2c2d31'); grd.addColorStop(1, '#141416');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = '#c9b78a'; roundRect(g, w * 0.09, h * 0.36, w * 0.13, h * 0.17, h * 0.03); g.fill();
  contactless(g, w * 0.32, h * 0.445, h * 0.07, 'rgba(255,255,255,.75)', h * 0.016);
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `500 ${h * 0.075}px ${FONT.mono}`; g.fillText('•••• 4821', w * 0.09, h * 0.78);
  g.fillStyle = COLOR.signal; g.beginPath(); g.arc(w * 0.83, h * 0.78, h * 0.07, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f4b400'; g.globalAlpha = 0.85; g.beginPath(); g.arc(w * 0.9, h * 0.78, h * 0.07, 0, Math.PI * 2); g.fill();
});
const card = new THREE.Mesh(new RoundedBoxGeometry(8.56, 5.4, 0.12, 2, 0.35), [M.bezel, M.bezel, M.bezel, M.bezel, new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.35, metalness: 0.3 }), M.bezel]);
card.castShadow = true; card.visible = false; scene.add(card);

/* ---------- ripple rings on the pad ---------- */
const ripples = [0, 1, 2].map(() => {
  const r = new THREE.Mesh(new THREE.RingGeometry(5.8, 6.3, 64), new THREE.MeshBasicMaterial({ color: 0xff4d1a, transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
  r.position.set(0, 104, 2.5); station.add(r); return r;
});

/* ================================================================ sketched station backdrop
   Two pencil drawings (Hamm Hbf, Düsseldorf Hbf) on camera-facing boards behind the station.
   They always sit opposite the camera, so the station stays in front whatever the angle. */
const BD = { W: 792, H: 330, D: 420, C: new THREE.Vector3(0, 0, -D / 2) };
// each name board is centred in its drawing; the boards sit a little to the right so the
// name reads beside the station instead of hiding behind it
const BOARD_K = () => (isMobile() ? 0.6 : 1);
const signShift = () => (isMobile() ? 54 : 74) + 0.5 * (420 / 2400) * BD.W * BOARD_K();
// drawn in its own pass before the station, so it can never cover the model
const bgScene = new THREE.Scene();
const backdrop = { alpha: 0 };
function sketchBoard(draw) {
  const c = document.createElement('canvas');
  c.width = isMobile() ? 1680 : 2400; c.height = Math.round(c.width / 2.4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.frustumCulled = false; mesh.visible = false; bgScene.add(mesh);
  return { mesh, tex, c, draw, slide: 0, stretch: 1, alpha: 1, depth: BD.D, w: BD.W, h: BD.H, y: BD.H * 0.43 - 3 };
}
const boardHamm = sketchBoard(drawHamm);
const boardDus = sketchBoard(drawDus);
boardDus.alpha = 0; boardDus.slide = -1.2;
// speed lines for the swipe, drawn once and scrolled
const boardStreak = (() => {
  const b = sketchBoard((c) => {
    const g = c.getContext('2d'); const w = c.width, h = c.height; g.clearRect(0, 0, w, h);
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    g.lineCap = 'round';
    for (let i = 0; i < 120; i++) {
      const y = h * (0.08 + rnd() * 0.84), len = w * (0.04 + rnd() * 0.22), x = rnd() * w;
      const orange = i % 17 === 0;
      g.strokeStyle = orange ? 'rgba(255,77,26,0.75)' : `rgba(59,57,52,${0.12 + rnd() * 0.42})`;
      g.lineWidth = (orange ? 2.4 : 0.8 + rnd() * 2.2) * (w / 2400);
      // draw twice so the lines wrap seamlessly when the texture scrolls
      [0, -w].forEach((o) => { g.beginPath(); g.moveTo(x + o, y); g.lineTo(x + o + len, y + (rnd() - 0.5) * 2); g.stroke(); });
    }
  });
  b.tex.wrapS = THREE.RepeatWrapping; b.alpha = 0; b.depth = BD.D - 120; b.w = BD.W * 1.1; b.h = BD.H * 0.62; b.y = BD.H * 0.36;
  return b;
})();
const boards = [boardHamm, boardDus, boardStreak];
function drawBoards() { boards.forEach((b) => { b.draw(b.c); b.tex.needsUpdate = true; }); }
const _dir = new THREE.Vector3();
function placeBoards() {
  _dir.set(camera.position.x - BD.C.x, 0, camera.position.z - BD.C.z);
  if (_dir.lengthSq() < 1e-6) _dir.set(0, 0, 1); _dir.normalize();
  const rx = _dir.z, rz = -_dir.x, ry = Math.atan2(_dir.x, _dir.z);
  for (const b of boards) {
    const o = b.mesh.material.opacity = backdrop.alpha * b.alpha;
    b.mesh.visible = o > 0.004;
    if (!b.mesh.visible) continue;
    const k = b !== boardStreak ? BOARD_K() : 1;
    const off = b.slide * b.w * k + (b === boardStreak ? 0 : signShift());
    b.mesh.position.set(BD.C.x - _dir.x * b.depth + rx * off, b.y * k, BD.C.z - _dir.z * b.depth + rz * off);
    b.mesh.rotation.set(0, ry, 0);
    b.mesh.scale.set(b.w * b.stretch * k, b.h * k, 1);
  }
}
const smooth = (t) => t * t * (3 - 2 * t);
// s: 0 -> Hamm in place, 1 -> Düsseldorf in place. Hamm swishes out to the right, Düsseldorf follows in from the left.
let swapS = 0;
function setSwap(s) {
  swapS = s;
  const a = clamp(s / 0.56, 0, 1), b = clamp((s - 0.44) / 0.56, 0, 1);
  boardHamm.slide = Math.pow(a, 2.4) * 1.2; boardHamm.stretch = 1 + 0.5 * Math.sin(Math.PI * a); boardHamm.alpha = 1 - smooth(a);
  boardDus.slide = -1.2 * Math.pow(1 - b, 2.4); boardDus.stretch = 1 + 0.5 * Math.sin(Math.PI * b); boardDus.alpha = smooth(b);
  boardStreak.alpha = Math.pow(Math.sin(Math.PI * s), 0.8);
}

/* ================================================================ tween engine */
let epoch = 0; // bumps on reset to cancel running sequences
const active = new Set();
function tween(ms, fn, e = ease.inOut) {
  const my = epoch;
  return new Promise((res) => {
    const dur = REDUCED ? 1 : ms; const t0 = performance.now();
    const job = { tick(now) { if (my !== epoch) { active.delete(job); res(false); return; } const k = clamp((now - t0) / dur, 0, 1); fn(e(k), k); if (k >= 1) { active.delete(job); res(true); } } };
    active.add(job);
  });
}
const wait = (ms) => { const my = epoch; return new Promise((r) => setTimeout(() => r(my === epoch), REDUCED ? 0 : ms)); };
const alive = (my) => my === epoch;

/* ================================================================ camera framing */
const look = { target: new THREE.Vector3(), pos: new THREE.Vector3() };
const SHOTS_MOB = {
  hover:    { t: [-4, 114, 18], p: [62, 132, 230] },
};
const SHOTS = {
  far:      { t: [0, 92, -15],  p: [760, 420, 1120] },
  overview: { t: [0, 92, -12],  p: [228, 138, 362] },
  tap:      { t: [0, 106, 0],   p: [104, 126, 196] },
  hover:    { t: [-24, 113, 16], p: [86, 136, 222] },
  travel:   { t: [-22, 100, -5], p: [-214, 158, 372] },
  dock:     { t: [6, 84, 0],    p: [150, 122, 262] },
};
/* Phone framing: the station has to fit in the free band between the panels at the top
   (top bar, headline or trip card) and the dock at the bottom, whatever the screen height. */
const view = { y: 0, shot: 'far', opts: {} };
const box = (sel) => { const el = typeof sel === 'string' ? $(sel) : sel; return { top: el.offsetTop, bottom: el.offsetTop + el.offsetHeight }; };
function band(opts = {}) {
  const h = innerHeight, dock = box('.dock').top - 10;
  let top = box('.topbar').bottom + 8;
  if (opts.trip ?? ui.trip.classList.contains('show')) top = Math.max(top, box(ui.trip).bottom + 8);
  else if (!(opts.heroDim ?? ui.hero.classList.contains('dim'))) top = Math.max(top, box(ui.hero).bottom + 4);
  top = Math.min(top, h * 0.45);
  return { top, bottom: Math.max(dock, top + 160), h };
}
const FIT = { far: true, overview: true, travel: true }; // shots that must show the whole station
function shotVectors(name, opts = {}) {
  const s = (isMobile() && SHOTS_MOB[name]) || SHOTS[name]; const t = new THREE.Vector3(...s.t); const p = new THREE.Vector3(...s.p);
  const a = innerWidth / innerHeight;
  let k = a < 1 ? clamp(0.62 / a + 0.1, 1, 2.05) : a < 1.35 ? 1.12 : 1, vy = 0;
  if (isMobile()) {
    const b = band(opts), free = b.bottom - b.top;
    if (FIT[name]) k = Math.max(k, 0.84 * b.h / (free * 0.94));
    k = Math.min(k, 3);
    vy = -((b.top + b.bottom) / 2 - b.h / 2); // centre the scene in the free band
  }
  p.sub(t).multiplyScalar(k).add(t);
  return { t, p, vy };
}
// Camera moves run outside OrbitControls: damping momentum is flushed first and controls.update()
// is skipped while the move runs, so the two never fight over the camera (the main source of jitter).
let camMoves = 0;
function flushControls() { const d = controls.enableDamping; controls.enableDamping = false; controls.update(); controls.enableDamping = d; }
async function moveCamera(name, ms = 1600, e = ease.inOut, opts = {}) {
  const { t, p, vy } = shotVectors(name, opts);
  view.shot = name; view.opts = opts; const vy0 = view.y;
  flushControls();
  const t0 = controls.target.clone(), p0 = camera.position.clone();
  // travel on a gentle arc around the station instead of a straight line through it
  const r0 = Math.hypot(p0.x - t0.x, p0.z - t0.z), r1 = Math.hypot(p.x - t.x, p.z - t.z);
  const a0 = Math.atan2(p0.x - t0.x, p0.z - t0.z); let a1 = Math.atan2(p.x - t.x, p.z - t.z);
  if (a1 - a0 > Math.PI) a1 -= Math.PI * 2; if (a0 - a1 > Math.PI) a1 += Math.PI * 2;
  const my = ++camMoves; controls.enabled = false;
  const ok = await tween(ms, (k) => {
    if (my !== camMoves) return;
    controls.target.lerpVectors(t0, t, k);
    const a = lerp(a0, a1, k), r = lerp(r0, r1, k);
    camera.position.set(controls.target.x + Math.sin(a) * r, lerp(p0.y, p.y, k), controls.target.z + Math.cos(a) * r);
    camera.lookAt(controls.target);
    if (vy0 !== vy) { view.y = lerp(vy0, vy, k); applyViewOffset(); }
  }, e);
  if (my === camMoves) { camMoves = 0; flushControls(); controls.enabled = true; }
  return ok;
}
function applyViewOffset() {
  const w = innerWidth, h = innerHeight;
  if (w >= 820) camera.setViewOffset(w, h, -w * 0.13, h * 0.03, w, h);
  else camera.setViewOffset(w, h, w * 0.1, view.y, w, h); // station a touch left of centre (room for the station name), centred in the free band
  camera.aspect = w / h; camera.updateProjectionMatrix();
}

/* ================================================================ sound */
let soundOn = true, actx = null;
function tone(freq, ms = 110, type = 'sine', vol = 0.14, delay = 0) {
  if (!soundOn) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime + delay / 1000; const o = actx.createOscillator(); const gn = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(vol, t + 0.012); gn.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.connect(gn).connect(actx.destination); o.start(t); o.stop(t + ms / 1000 + 0.03);
  } catch (e) { /* audio unavailable */ }
}
const sfx = {
  approve: () => { tone(1318, 90); tone(1760, 140, 'sine', 0.14, 95); },
  release: () => { tone(420, 160, 'triangle', 0.08); },
  click: () => { tone(220, 70, 'square', 0.05); tone(1568, 120, 'sine', 0.1, 60); },
  done: () => { tone(1046, 110); tone(1318, 110, 'sine', 0.12, 110); tone(1568, 180, 'sine', 0.12, 220); },
  whoosh: () => {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime, dur = 1.25, n = Math.floor(actx.sampleRate * dur);
      const buf = actx.createBuffer(1, n, actx.sampleRate); const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = actx.createBufferSource(); src.buffer = buf;
      const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
      bp.frequency.setValueAtTime(260, t); bp.frequency.exponentialRampToValueAtTime(2400, t + 0.55); bp.frequency.exponentialRampToValueAtTime(500, t + dur);
      const gn = actx.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.16, t + 0.5); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const pan = actx.createStereoPanner ? actx.createStereoPanner() : null;
      if (pan) { pan.pan.setValueAtTime(-0.8, t); pan.pan.linearRampToValueAtTime(0.8, t + dur); src.connect(bp).connect(gn).connect(pan).connect(actx.destination); }
      else src.connect(bp).connect(gn).connect(actx.destination);
      src.start(t); src.stop(t + dur);
    } catch (e) { /* audio unavailable */ }
  },
};
$('#soundBtn').addEventListener('click', (e) => {
  soundOn = !soundOn; e.currentTarget.setAttribute('aria-pressed', String(soundOn));
  e.currentTarget.setAttribute('aria-label', soundOn ? 'Sound on' : 'Sound off');
});

/* ================================================================ UI helpers */
const ui = {
  hero: $('#hero'), steps: [...document.querySelectorAll('#steps li')], caption: $('#caption'),
  next: $('#nextBtn'), nextLabel: $('#nextLabel'), reset: $('#resetBtn'),
  callouts: $('#callouts'), calloutEls: [...document.querySelectorAll('.callout')], lines: $('#calloutLines'),
  trip: $('#trip'), trackFill: $('#trackFill'), train: $('#train'), phonePct: $('#phonePct'), phoneLevel: $('#phoneLevel'), tripTime: $('#tripTime'),
  toast: $('#toast'),
};
const COPY = [
  { label: 'Tap your card', cap: 'Hamm Hbf. Your phone is at 12%. Tap your bank card on the orange pad.' },
  { label: 'Take the power bank', cap: 'Payment approved. Slot 12 unlocks and your power bank slides out.' },
  { label: 'Board the train', cap: 'A sodium-ion power bank with its cables built in. It travels with you.' },
  { label: 'Return it', cap: 'Your phone charges on the ride. A little over an hour later you arrive in Düsseldorf.' },
  { label: 'Replay the demo', cap: 'Returned at Düsseldorf Hbf. The rental ends by itself. No app, no sign-up.' },
];
let step = 0, busy = false;
function renderUI() {
  ui.steps.forEach((li, i) => { li.classList.toggle('done', i < step); li.classList.toggle('active', i === step - 1 && busy); });
  ui.nextLabel.textContent = COPY[step].label;
  ui.caption.textContent = COPY[step].cap;
  ui.next.disabled = busy;
  ui.next.classList.toggle('go', step === 0);
}
function toast(msg, ms = 3200) {
  ui.toast.textContent = msg; ui.toast.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => ui.toast.classList.remove('show'), ms);
}

/* callouts follow the floating power bank */
const ANCHORS = [new THREE.Vector3(-3.3, 0.2, 1.5), new THREE.Vector3(3.36, 0, -1), new THREE.Vector3(-0.2, 1.3, 3.4)];
const OFFSETS_DESK = [[-230, 40], [90, 70], [70, -110]];
const OFFSETS_MOB = [[-150, 84], [36, 18], [-40, -118]];
let calloutsOn = false, calloutSize = [];
function measureCallouts() { calloutSize = ui.calloutEls.map((el) => [el.offsetWidth, el.offsetHeight]); }
ui.lines.innerHTML = ANCHORS.map(() => '<line/><circle r="3.5"/>').join('');
const lineEls = [...ui.lines.querySelectorAll('line')], dotEls = [...ui.lines.querySelectorAll('circle')];
function updateCallouts() {
  if (!calloutsOn) return;
  const w = innerWidth, h = innerHeight, offs = isMobile() ? OFFSETS_MOB : OFFSETS_DESK;
  ANCHORS.forEach((a, i) => {
    const v = a.clone(); hero.localToWorld(v); v.project(camera);
    const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
    const el = ui.calloutEls[i]; const [bw, bh] = calloutSize[i] || [180, 48];
    let lx = x + offs[i][0], ly = y + offs[i][1];
    if (offs[i][0] < 0) lx -= bw * 0.2;
    lx = clamp(lx, 12, w - bw - 12); ly = clamp(ly, 70, h - bh - 220);
    el.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`;
    const ex = offs[i][0] < 0 ? lx + bw : lx, ey = ly + bh / 2;
    lineEls[i].setAttribute('x1', x); lineEls[i].setAttribute('y1', y); lineEls[i].setAttribute('x2', ex); lineEls[i].setAttribute('y2', ey);
    dotEls[i].setAttribute('cx', x); dotEls[i].setAttribute('cy', y);
  });
}

/* ================================================================ animated state
   The demo power bank has a base pose (moved by tweens) plus a floating layer (bob, wobble, spin)
   that fades in and out with a weight, so nothing ever snaps between the two. */
const anim = { w: 0, wTarget: 0, spin: 0, spinOn: 0, blink: false };
const base = { pos: S.home.clone(), ry: 0, rx: 0 };
const HOVER_DESK = new THREE.Vector3(-42, 116, 42), HOVER_MOB = new THREE.Vector3(-6, 120, 52);
let HOVER_POS = HOVER_DESK;
const SIDE_POS = new THREE.Vector3(-64, 122, 26);
const TRIP_MIN = 74;
const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`);

async function stepTap() {
  const my = epoch;
  ui.hero.classList.add('dim');
  controls.autoRotate = false;
  moveCamera('tap', 1500);
  // card flies in from the front right and taps the reader
  card.visible = true;
  const from = new THREE.Vector3(36, 92, 70), to = new THREE.Vector3(0, 104, 4.2);
  card.position.copy(from); card.rotation.set(-0.5, -0.7, 0.35);
  await tween(1300, (k) => { card.position.lerpVectors(from, to, k); card.rotation.set(lerp(-0.5, 0, k), lerp(-0.7, 0, k), lerp(0.35, 0.06, k)); }, ease.out);
  if (!alive(my)) return;
  sfx.approve();
  for (let i = 0; i < 3; i++) { const r = ripples[i]; setTimeout(() => { if (alive(my)) tween(1100, (k) => { r.scale.setScalar(1 + k * 1.9); r.material.opacity = (1 - k) * 0.85; }, ease.out); }, i * 170); }
  tween(300, (k) => { padMat.emissiveIntensity = 0.35 + k * 0.9; }).then(() => tween(700, (k) => { padMat.emissiveIntensity = 1.25 - k * 0.9; }));
  setScreen('unlocked');
  await wait(450); if (!alive(my)) return;
  // card leaves
  const c0 = card.position.clone();
  tween(900, (k) => { card.position.lerpVectors(c0, new THREE.Vector3(-30, 96, 80), k); card.rotation.y = lerp(0, 0.8, k); }, ease.inOut).then((ok) => { if (ok) card.visible = false; });
  anim.blink = true;
  await moveCamera('dock', 1300);
  if (!alive(my)) return;
  sfx.release();
  await tween(900, (k) => { base.pos.z = lerp(S.home.z, S.home.z + 5.5, k); }, ease.back);
}

async function stepTake() {
  const my = epoch;
  HOVER_POS = isMobile() ? HOVER_MOB : HOVER_DESK;
  anim.blink = false; S.led.material.color.set(0x3a3b3e);
  moveCamera('hover', 2000);
  const p0 = base.pos.clone();
  const mid = new THREE.Vector3(S.home.x, S.home.y + 2, 24);
  // one continuous curve: straight out of the slot, then up and over to the hover point
  const curve = new THREE.CubicBezierCurve3(p0, mid, new THREE.Vector3(lerp(mid.x, HOVER_POS.x, 0.35), HOVER_POS.y - 4, HOVER_POS.z + 6), HOVER_POS.clone());
  await tween(1900, (k) => {
    curve.getPoint(k, base.pos);
    const g = ease.inOut(clamp((k - 0.2) / 0.8, 0, 1));
    hero.scale.setScalar(lerp(1, 3.1, g));
    base.ry = lerp(0, -0.6, g); base.rx = lerp(0, 0.18, g);
    if (k > 0.72) { anim.wTarget = 1; anim.spinOn = 1; }
  }, ease.inOut);
  if (!alive(my)) return;
  setScreen('trip');
  measureCallouts(); calloutsOn = true; ui.callouts.classList.add('show');
}

async function stepTravel() {
  const my = epoch;
  calloutsOn = false; ui.callouts.classList.remove('show');
  moveCamera('travel', 2000, ease.inOut, { trip: true });
  const p0 = base.pos.clone(), s0 = hero.scale.x;
  // the power bank keeps floating and spinning while it glides aside
  await tween(1700, (k) => { base.pos.lerpVectors(p0, SIDE_POS, k); hero.scale.setScalar(lerp(s0, 1.9, k)); }, ease.inOut);
  if (!alive(my)) return;
  ui.trip.classList.add('show'); ui.trip.setAttribute('aria-hidden', 'false');
  setScreen('idle');
  const trackW = ui.trackFill.parentElement.clientWidth;
  let flipped = false, whooshed = false, lastPct = -1, lastMin = -1;
  await tween(6200, (k, raw) => {
    ui.trackFill.style.transform = `scaleX(${raw.toFixed(4)})`;
    ui.train.style.transform = `translate3d(${(6 + raw * (trackW - 12)).toFixed(1)}px, -50%, 0) translateX(-50%)`;
    const pct = Math.round(lerp(12, 84, raw));
    if (pct !== lastPct) {
      lastPct = pct; ui.phonePct.textContent = `${pct}%`;
      ui.phoneLevel.style.transform = `scaleY(${pct / 100})`; ui.phoneLevel.classList.toggle('full', pct > 50);
    }
    const m = Math.round(lerp(0, TRIP_MIN, raw)); if (m !== lastMin) { lastMin = m; ui.tripTime.textContent = fmtMin(m); }
    hero.userData.leds.forEach((d, i) => { d.material = raw > (i + 1) / 5 ? ledOn : ledOff; });
    // Hamm -> Düsseldorf swipe in the middle of the ride
    const sw = clamp((raw - 0.3) / 0.36, 0, 1);
    if (!whooshed && sw > 0) { whooshed = true; sfx.whoosh(); }
    setSwap(ease.inOut(sw));
    if (!flipped && sw > 0.5) { flipped = true; flipPlate(); }
  }, (t) => t);
}
async function flipPlate() {
  await tween(320, (k) => { plate.rotation.x = k * Math.PI / 2; }, ease.inOut);
  setStation(DUS); setScreen('arrive');
  await tween(380, (k) => { plate.rotation.x = Math.PI / 2 * (1 - k); }, ease.out);
}

async function stepReturn() {
  const my = epoch;
  ui.trip.classList.remove('show'); ui.trip.setAttribute('aria-hidden', 'true');
  moveCamera('dock', 1800);
  // hand the spin over to a tween that keeps turning forward and settles exactly face-front
  const total0 = base.ry + anim.spin; anim.spin = 0; anim.spinOn = 0; anim.wTarget = 0;
  const TWO_PI = Math.PI * 2, T = 1.6, v = 0.9;
  const target = TWO_PI * Math.ceil((total0 + v * T / 3) / TWO_PI), d = target - total0, m0 = v * T / d;
  const p0 = base.pos.clone(), s0 = hero.scale.x, rx0 = base.rx;
  const front = new THREE.Vector3(S.home.x, S.home.y, 22);
  await tween(T * 1000, (k, raw) => {
    base.pos.lerpVectors(p0, front, k); hero.scale.setScalar(lerp(s0, 1, k)); base.rx = lerp(rx0, 0, k);
    const h10 = raw * raw * raw - 2 * raw * raw + raw, h01 = -2 * raw * raw * raw + 3 * raw * raw;
    base.ry = total0 + d * (h10 * m0 + h01);
  }, ease.inOut);
  if (!alive(my)) return;
  base.ry = 0;
  await tween(900, (k) => { base.pos.z = lerp(22, S.home.z, k); }, ease.out);
  if (!alive(my)) return;
  sfx.click();
  S.led.material.color.set(0x2f9e68);
  // green wave across every slot light
  slots.forEach((s, i) => { if (i === EMPTY) return; setTimeout(() => { if (!alive(my)) return; s.led.scale.setScalar(1.9); tween(500, (k) => s.led.scale.setScalar(1.9 - k * 0.9), ease.out); }, (i % 4) * 60 + Math.floor(i / 4) * 60); });
  setScreen('returned'); sfx.done();
  toast(`Rental ended · ${fmtMin(TRIP_MIN)} · receipt sent to your card`);
  await wait(900); if (!alive(my)) return;
  await moveCamera('overview', 2200);
  controls.autoRotate = true;
}

const STEPS = [stepTap, stepTake, stepTravel, stepReturn];
async function next() {
  if (busy) return;
  if (step >= 4) { await resetDemo(true); return; }
  busy = true; step += 1; renderUI();
  await STEPS[step - 1]();
  busy = false; renderUI();
}
async function resetDemo(animate) {
  epoch += 1; active.clear();
  camMoves = 0; controls.enabled = true;
  busy = false; step = 0; calloutsOn = false; anim.blink = false;
  anim.w = anim.wTarget = 0; anim.spin = 0; anim.spinOn = 0;
  ui.callouts.classList.remove('show'); ui.trip.classList.remove('show'); ui.toast.classList.remove('show');
  ui.trackFill.style.transform = 'scaleX(0)'; ui.train.style.transform = ''; ui.phonePct.textContent = '12%'; ui.phoneLevel.style.transform = 'scaleY(0.12)'; ui.phoneLevel.classList.remove('full'); ui.tripTime.textContent = '0 min';
  ui.hero.classList.remove('dim');
  card.visible = false; ripples.forEach((r) => (r.material.opacity = 0)); padMat.emissiveIntensity = 0.35;
  base.pos.copy(S.home); base.ry = 0; base.rx = 0; hero.scale.setScalar(1); hero.userData.leds.forEach((d) => (d.material = ledOn));
  S.led.material.color.set(0x2f9e68); slots.forEach((s) => s.led.scale.setScalar(1));
  plate.rotation.x = 0; setStation(HAMM); setScreen('idle');
  renderUI();
  if (animate) {
    // swipe back to Hamm if the ride got that far
    const s0 = swapS; if (s0 > 0) tween(1400, (k) => setSwap(lerp(s0, 0, k)), ease.inOut).then(() => setSwap(0));
    await moveCamera('overview', 1600); controls.autoRotate = true;
  } else setSwap(0);
}
ui.next.addEventListener('click', next);
ui.reset.addEventListener('click', () => resetDemo(true));
addEventListener('keydown', (e) => {
  if (e.target.closest('button')) return;
  if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); next(); }
  if (e.key === 'r' || e.key === 'R') resetDemo(true);
});
controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(idleTimer); });
let idleTimer;
controls.addEventListener('end', () => { clearTimeout(idleTimer); idleTimer = setTimeout(() => { if (!busy && (step === 0 || step === 4)) controls.autoRotate = true; }, 6000); });

/* ================================================================ resize + loop */
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  view.y = isMobile() ? shotVectors(view.shot, view.opts).vy : 0;
  applyViewOffset();
  measureCallouts();
}
addEventListener('resize', resize);

// adaptive resolution: if a device can't hold ~45 fps, render fewer pixels instead of stuttering
const perf = { on: false, acc: 0, n: 0 };
function watchPerf(dt) {
  if (!perf.on || document.hidden) return;
  perf.acc += dt; perf.n += 1;
  if (perf.n < 90) return;
  const avg = perf.acc / perf.n; perf.acc = 0; perf.n = 0;
  if (avg > 0.022 && DPR > 1) { DPR = Math.max(1, DPR - 0.25); renderer.setPixelRatio(DPR); renderer.setSize(innerWidth, innerHeight, false); }
}

let last = 0, tAcc = 0;
function frame(now) {
  // time from requestAnimationFrame's own timestamp: steadier than reading the clock mid-frame
  const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60; last = now; tAcc += dt; const t = tAcc;
  active.forEach((j) => j.tick(now));
  // floating layer of the power bank
  anim.w += (anim.wTarget - anim.w) * (1 - Math.exp(-dt * 2.6));
  anim.spin += dt * 0.9 * anim.spinOn * Math.min(1, anim.w * 1.6);
  hero.position.set(base.pos.x, base.pos.y + Math.sin(t * 1.6) * 1.4 * anim.w, base.pos.z);
  hero.rotation.set(base.rx + Math.sin(t * 1.3) * 0.05 * anim.w, base.ry + anim.spin, 0);
  if (anim.blink) S.led.material.color.set(Math.sin(t * 12) > 0 ? 0xff4d1a : 0x3a1a10);
  glowLine.material.emissiveIntensity = 0.75 + Math.sin(t * 1.4) * 0.15;
  if (boardStreak.alpha > 0.001) boardStreak.tex.offset.x -= dt * 1.15;
  if (!camMoves) controls.update();
  placeBoards();
  renderer.clear();
  renderer.render(bgScene, camera);
  renderer.clearDepth();
  renderer.render(scene, camera);
  updateCallouts();
  watchPerf(dt);
  requestAnimationFrame(frame);
}

/* ================================================================ boot */
async function boot() {
  const bar = $('#loaderBar');
  bar.style.width = '35%';
  try {
    await Promise.all([
      document.fonts.load(`800 40px "Schibsted"`), document.fonts.load(`500 20px "Inter Tight"`),
      document.fonts.load(`600 20px "Inter Tight"`), document.fonts.load(`500 20px "JetBrains Mono"`),
    ]);
  } catch (e) { /* fall back to system fonts */ }
  PREWARM.forEach(([st, nm]) => screenTexFor(st, nm)); plateTexFor(DUS);
  textures.forEach(paint);
  bar.style.width = '60%';
  await new Promise((r) => setTimeout(r, 0));
  drawBoards();
  // upload every texture now, so the first swap during the demo doesn't stall a frame
  if (renderer.initTexture) [...textures, ...boards.map((b) => b.tex)].forEach((tx) => renderer.initTexture(tx));
  bar.style.width = '80%';
  resize();
  const far = shotVectors('far', { heroDim: false }); camera.position.copy(far.p); controls.target.copy(far.t); view.y = far.vy; applyViewOffset();
  station.position.y = -10;
  headerMat.color.set(0x000000);
  slots.forEach((s) => (s.led.visible = false));
  boards.forEach((b) => (b.mesh.visible = true));
  renderer.compile(bgScene, camera);
  renderer.compile(scene, camera);
  boards.forEach((b) => (b.mesh.visible = false));
  measureCallouts();
  requestAnimationFrame(frame);
  bar.style.width = '100%';
  await new Promise((r) => setTimeout(r, 350));
  $('#loader').classList.add('done');
  // intro: camera glides in, station settles, lights come on
  moveCamera('overview', 2600, ease.expo, { heroDim: false });
  tween(1800, (k) => { station.position.y = lerp(-10, 0, k); }, ease.out);
  await wait(900);
  tween(900, (k) => headerMat.color.setScalar(k));
  slots.forEach((s, i) => setTimeout(() => { s.led.visible = true; }, 400 + (Math.floor(i / 4) * 4 + (i % 4)) * 28));
  await wait(500);
  document.body.classList.remove('intro');
  renderUI();
  // the pencil sketch of Hamm Hbf fades in behind the station
  tween(1800, (k) => { backdrop.alpha = k * 0.62; }, ease.inOut);
  await wait(1400);
  if (step === 0) controls.autoRotate = true;
  perf.on = true;
}
document.body.classList.add('intro');
boot();
