/* =========================================================================
   LIF2D — Moteur : Jeu de la Vie 2D, règles, symétrie, formes, gammes.
   Pure logic, no React. Exported to window for the other babel scripts.
   ========================================================================= */

const GRID = 16;

/* ---- Règles d'évolution (notation B/S) ---------------------------------- */
const RULES = [
  { id: 'conway',   name: 'Conway',   notation: 'B3/S23',   b: [3],    s: [2, 3] },
  { id: 'coral',    name: 'Coral',    notation: 'B5/S45',   b: [5],    s: [4, 5] },
  { id: 'dense',    name: 'Dense',    notation: 'B6/S567',  b: [6],    s: [5, 6, 7], reco: true },
  { id: 'builder',  name: 'Builder',  notation: 'B4/S5',    b: [4],    s: [5] },
  { id: 'symmetr',  name: 'Symmetr',  notation: 'B5/S5',    b: [5],    s: [5] },
  { id: 'highlife', name: 'Highlife', notation: 'B36/S23',  b: [3, 6], s: [2, 3] },
  { id: 'balanced', name: 'Balanced', notation: 'B4/S45',   b: [4],    s: [4, 5] },
];

/* ---- Gammes (intervalles en demi-tons) ---------------------------------- */
const SCALES = [
  { id: 'penta',    name: 'Pentatonique',        iv: [0, 2, 4, 7, 9] },
  { id: 'minor',    name: 'Mineur',              iv: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'major',    name: 'Majeur',              iv: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'dorian',   name: 'Dorien',              iv: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'pentamin', name: 'Pentatonique Min.',   iv: [0, 3, 5, 7, 10] },
  { id: 'lydian',   name: 'Lydien',              iv: [0, 2, 4, 6, 7, 9, 11] },
  { id: 'mixo',     name: 'Mixolydien',          iv: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'hira',     name: 'Japonaise/Hirajoshi', iv: [0, 2, 3, 7, 8] },
  { id: 'lyddom',   name: 'Lydien Dominant',     iv: [0, 2, 4, 6, 7, 9, 10] },
  { id: 'phrygdom', name: 'Phrygien Dominant',   iv: [0, 1, 4, 5, 7, 8, 10] },
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const PRESETS = ['Libre', 'Piano', 'Bell', 'Orgue', 'Pad', 'Basse', 'Marimba'];
const WAVES = ['Sine', 'Carré', 'Scie', 'Triangle', 'FM', 'FM2', 'FM3', 'Karplus-Strong', 'Sample (.wav)'];
const SYMMETRIES = ['Aucune', 'Axiale X', 'Axiale Y', 'Co-axiale', 'Centrale'];
const ARP_MODES = ['Up', 'Down', 'Random', 'Ping-pong', 'Chord', 'Chord Ping-pong', 'Groove'];
const ARP_SPEEDS = ['Auto', '×2', '×3', '×4', '×8'];
const AGE_TARGETS = ['Harmoniques', 'Volume', 'Timbre'];
const LOOP_LENGTHS = ['×2', '×4', '×8'];

/* ---- Grille : création / utilitaires ------------------------------------ */
function emptyGrid() {
  // cell = 0 (mort) ou age>=1 (vivant, nombre de générations vécues)
  return Array.from({ length: GRID }, () => new Int16Array(GRID));
}

function cloneGrid(g) {
  return g.map((row) => Int16Array.from(row));
}

function randomGrid(density) {
  const g = emptyGrid();
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++)
      if (Math.random() < density) g[y][x] = 1;
  return g;
}

function gridPopulation(g) {
  let n = 0;
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (g[y][x]) n++;
  return n;
}

/* ---- Voisinage torique (wrap) + pas d'évolution ------------------------- */
function neighbors(g, x, y) {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = (x + dx + GRID) % GRID;
      const ny = (y + dy + GRID) % GRID;
      if (g[ny][nx]) n++;
    }
  return n;
}

function step(g, rule, maxAge) {
  const next = emptyGrid();
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const n = neighbors(g, x, y);
      const alive = g[y][x] > 0;
      if (alive) {
        if (rule.s.includes(n)) {
          const a = g[y][x] + 1;
          next[y][x] = maxAge ? Math.min(a, maxAge) : a;
        } else next[y][x] = 0;
      } else {
        next[y][x] = rule.b.includes(n) ? 1 : 0;
      }
    }
  }
  return next;
}

/* ---- Symétrie temps réel ------------------------------------------------ */
function applySymmetry(g, mode) {
  if (mode === 0) return g; // Aucune
  const out = cloneGrid(g);
  const M = GRID - 1;
  const set = (x, y, v) => { if (v && !out[y][x]) out[y][x] = v; };
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const v = g[y][x];
      if (!v) continue;
      if (mode === 1) set(M - x, y, v);                 // Axiale X (miroir horizontal)
      else if (mode === 2) set(x, M - y, v);            // Axiale Y (miroir vertical)
      else if (mode === 3) { set(M - x, y, v); set(x, M - y, v); set(M - x, M - y, v); } // Co-axiale
      else if (mode === 4) set(M - x, M - y, v);        // Centrale (point)
    }
  }
  return out;
}

/* ---- Formes de départ --------------------------------------------------- */
const SHAPES = {
  Vide:        [],
  Glider:      [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]],
  Blinker:     [[0, 0], [1, 0], [2, 0]],
  Block:       [[0, 0], [1, 0], [0, 1], [1, 1]],
  'R-pentomino': [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]],
  Pulsar: (() => {
    const pts = [];
    const arms = [2, 3, 4, 8, 9, 10];
    const ring = [0, 5, 7, 12];
    ring.forEach((r) => arms.forEach((a) => { pts.push([a, r]); pts.push([r, a]); }));
    return pts;
  })(),
};
const SHAPE_NAMES = ['Vide', 'Glider', 'Blinker', 'Pulsar', 'Block', 'R-pentomino'];

function placeShape(name, cx, cy) {
  const g = emptyGrid();
  const pts = SHAPES[name] || [];
  if (!pts.length) return g;
  // centre la forme autour de (cx,cy)
  let maxX = 0, maxY = 0;
  pts.forEach(([px, py]) => { maxX = Math.max(maxX, px); maxY = Math.max(maxY, py); });
  const ox = cx - Math.floor(maxX / 2);
  const oy = cy - Math.floor(maxY / 2);
  pts.forEach(([px, py]) => {
    const x = ((px + ox) % GRID + GRID) % GRID;
    const y = ((py + oy) % GRID + GRID) % GRID;
    g[y][x] = 1;
  });
  return g;
}

/* ---- Mapping musical : ligne -> hauteur ; classe -> teinte -------------- */
function buildPitches(tonicIndex, scaleIv, count) {
  // tonicIndex 0..11 ; base MIDI = C3 (48) + tonic
  const base = 48 + tonicIndex;
  const out = [];
  const L = scaleIv.length;
  for (let i = 0; i < count; i++) {
    const oct = Math.floor(i / L);
    out.push(base + scaleIv[i % L] + 12 * oct);
  }
  return out; // ascendant
}

function rowToPitch(row, pitches) {
  // row 0 = haut (aigu) ; row 15 = bas (grave)
  const i = (GRID - 1) - row;
  return pitches[Math.min(i, pitches.length - 1)];
}

function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

function noteHue(midi) {
  // teinte = classe chromatique répartie sur la roue (quintes pour cohérence visuelle)
  const pc = ((midi % 12) + 12) % 12;
  const wheel = (pc * 7) % 12;            // cercle des quintes -> teintes voisines distinctes
  return Math.round((wheel / 12) * 360);
}

/* ---- Presets de synthèse (preset -> onde + ADSR) ------------------------ */
const PRESET_MAP = {
  Libre:   { w: 0, a: 6,   d: 60,  s: 0.5,  r: 120 },
  Piano:   { w: 4, a: 2,   d: 120, s: 0.25, r: 180 },
  Bell:    { w: 5, a: 1,   d: 200, s: 0.0,  r: 200 },
  Orgue:   { w: 0, a: 8,   d: 10,  s: 0.95, r: 60  },
  Pad:     { w: 0, a: 120, d: 160, s: 0.8,  r: 200 },
  Basse:   { w: 2, a: 4,   d: 90,  s: 0.6,  r: 90  },
  Marimba: { w: 3, a: 1,   d: 110, s: 0.0,  r: 90  },
};

Object.assign(window, {
  GRID, RULES, SCALES, NOTE_NAMES, PRESETS, WAVES, SYMMETRIES, ARP_MODES, PRESET_MAP,
  ARP_SPEEDS, AGE_TARGETS, LOOP_LENGTHS, SHAPES, SHAPE_NAMES,
  emptyGrid, cloneGrid, randomGrid, gridPopulation, step, applySymmetry,
  placeShape, buildPitches, rowToPitch, midiToFreq, noteHue,
});
