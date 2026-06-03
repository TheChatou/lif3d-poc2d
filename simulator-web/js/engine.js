/* ==========================================================================
   LIF2D — Moteur : Jeu de la Vie 2D, règles, gammes, formes, mapping note.
   Pure logic — aucune dépendance React. Exporté sur window.
   ========================================================================== */

const GRID = 16;

/* ---- Règles d'évolution (notation B/S) ----------------------------------- */
const RULES = [
  { id: 'conway',   name: 'Conway',   notation: 'B3/S23',   b: [3],    s: [2, 3]    },
  { id: 'coral',    name: 'Coral',    notation: 'B5/S45',   b: [5],    s: [4, 5]    },
  { id: 'dense',    name: 'Dense',    notation: 'B6/S567',  b: [6],    s: [5, 6, 7] },
  { id: 'builder',  name: 'Builder',  notation: 'B4/S5',    b: [4],    s: [5]       },
  { id: 'symmetr',  name: 'Symmetr',  notation: 'B5/S5',    b: [5],    s: [5]       },
  { id: 'highlife', name: 'Highlife', notation: 'B36/S23',  b: [3, 6], s: [2, 3]    },
  { id: 'balanced', name: 'Balanced', notation: 'B4/S45',   b: [4],    s: [4, 5]    },
];

/* ---- Gammes (intervalles en demi-tons depuis la tonique) ----------------- */
const SCALES = [
  { id: 'penta',    name: 'Pentatonique',        iv: [0, 2, 4, 7, 9]            },
  { id: 'minor',    name: 'Mineur',              iv: [0, 2, 3, 5, 7, 8, 10]     },
  { id: 'major',    name: 'Majeur',              iv: [0, 2, 4, 5, 7, 9, 11]     },
  { id: 'dorian',   name: 'Dorien',              iv: [0, 2, 3, 5, 7, 9, 10]     },
  { id: 'pentamin', name: 'Penta. Min.',         iv: [0, 3, 5, 7, 10]           },
  { id: 'lydian',   name: 'Lydien',              iv: [0, 2, 4, 6, 7, 9, 11]     },
  { id: 'mixo',     name: 'Mixolydien',          iv: [0, 2, 4, 5, 7, 9, 10]     },
  { id: 'hira',     name: 'Hirajoshi',           iv: [0, 2, 3, 7, 8]            },
  { id: 'lyddom',   name: 'Lydien Dominant',     iv: [0, 2, 4, 6, 7, 9, 10]     },
  { id: 'phrygdom', name: 'Phrygien Dominant',   iv: [0, 1, 4, 5, 7, 8, 10]     },
];

const NOTE_NAMES   = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const PRESETS      = ['Libre', 'Piano', 'Bell', 'Orgue', 'Pad', 'Basse', 'Marimba'];
const WAVES        = ['Sine', 'Carré', 'Scie', 'Triangle', 'FM', 'FM2', 'FM3', 'Karplus-Strong', 'Sample (.wav)'];
const SYMMETRIES   = ['Aucune', 'Axiale X', 'Axiale Y', 'Co-axiale', 'Centrale'];

// Modes d'arpège : ordre et structure de lecture des notes d'une colonne.
const ARP_MODES = [
  'Up',        // 0 — ascendant (grave → aigu), cycle
  'Down',      // 1 — descendant (aigu → grave), cycle
  'Random',    // 2 — aléatoire, re-tiré à chaque colonne
  'Ping-pong', // 3 — aller-retour
  'Tierces',   // 4 — note courante + note 2 positions au-dessus (intervalle de tierce)
  'Quintes',   // 5 — note courante + note 4 positions au-dessus (intervalle de quinte)
];

// Nombre de sous-ticks dans le 1/16 de balayage d'une colonne.
// Les valeurs ×3 et ×6 donnent un feel ternaire/triolet.
const ARP_DIV        = ['×1', '×2', '×3', '×4', '×6', '×8'];
const ARP_DIV_VALUES = [1, 2, 3, 4, 6, 8];

const AGE_TARGETS  = ['Harmoniques', 'Volume', 'Timbre'];
const LOOP_LENGTHS = ['×2', '×4', '×8'];
const LOOP_BARS    = [2, 4, 8];

/* ---- Grille : création et utilitaires ------------------------------------ */

function emptyGrid() {
  // Cellule = 0 (morte) ou >= 1 (vivante, âge en générations).
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
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++)
      if (g[y][x]) n++;
  return n;
}

/* ---- Voisinage torique (wrap) + pas d'évolution -------------------------- */

function neighbors(g, x, y) {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = (x + dx + GRID) % GRID;
      const ny = (y + dy + GRID) % GRID;
      if (g[ny][nx]) n++;
    }
  }
  return n;
}

function step(g, rule, maxAge) {
  const next = emptyGrid();
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const n     = neighbors(g, x, y);
      const alive = g[y][x] > 0;
      if (alive) {
        if (rule.s.includes(n)) {
          const age  = g[y][x] + 1;
          next[y][x] = maxAge ? Math.min(age, maxAge) : age;
        }
        // sinon la cellule meurt (déjà 0 dans next)
      } else {
        next[y][x] = rule.b.includes(n) ? 1 : 0;
      }
    }
  }
  return next;
}

/* ---- Symétrie temps réel ------------------------------------------------- */

function applySymmetry(g, mode) {
  if (mode === 0) return g;
  const out = cloneGrid(g);
  const M   = GRID - 1;
  const set = (x, y, v) => { if (v && !out[y][x]) out[y][x] = v; };

  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const v = g[y][x];
      if (!v) continue;
      if      (mode === 1) set(M - x, y,     v);   // Axiale X
      else if (mode === 2) set(x,     M - y, v);   // Axiale Y
      else if (mode === 3) {                        // Co-axiale
        set(M - x, y,     v);
        set(x,     M - y, v);
        set(M - x, M - y, v);
      }
      else if (mode === 4) set(M - x, M - y, v);   // Centrale (point)
    }
  }
  return out;
}

/* ---- Formes de départ (catalogue) --------------------------------------- */

const SHAPES = {
  Vide:   [],
  Glider: [[1,0],[2,1],[0,2],[1,2],[2,2]],
  Blinker:[[0,0],[1,0],[2,0]],
  Block:  [[0,0],[1,0],[0,1],[1,1]],
  'R-pentomino': [[1,0],[2,0],[0,1],[1,1],[1,2]],
  Pulsar: (() => {
    const pts  = [];
    const arms = [2,3,4,8,9,10];
    const ring = [0,5,7,12];
    ring.forEach((r) => arms.forEach((a) => { pts.push([a,r]); pts.push([r,a]); }));
    return pts;
  })(),
};
const SHAPE_NAMES = ['Vide','Glider','Blinker','Pulsar','Block','R-pentomino'];

// Estampille une forme centrée sur (cx, cy) dans une nouvelle grille.
function placeShape(name, cx, cy) {
  const g   = emptyGrid();
  const pts = SHAPES[name] || [];
  if (!pts.length) return g;

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

/* ---- Mapping musical : ligne -> hauteur MIDI ----------------------------- */

// Construit le tableau des hauteurs MIDI pour count lignes de grille.
function buildPitches(tonicIndex, scaleIv, count) {
  const base = 48 + tonicIndex;  // C3 = 48
  const L    = scaleIv.length;
  const out  = [];
  for (let i = 0; i < count; i++) {
    const oct = Math.floor(i / L);
    out.push(base + scaleIv[i % L] + 12 * oct);
  }
  return out;  // ascendant, du grave à l'aigu
}

// row 0 = haut de la grille (aigu) ; row 15 = bas (grave).
function rowToPitch(row, pitches) {
  const i = (GRID - 1) - row;
  return pitches[Math.min(i, pitches.length - 1)];
}

function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

// Teinte HSL à partir d'une note MIDI (cercle des quintes → teintes voisines distinctes).
function noteHue(midi) {
  const pc    = ((midi % 12) + 12) % 12;
  const wheel = (pc * 7) % 12;
  return Math.round((wheel / 12) * 360);
}

/* ---- Presets de synthèse (wave index + ADSR) ----------------------------- */
const PRESET_MAP = {
  Libre:   { w: 0, a:   6, d:  60, s: 0.50, r: 120 },
  Piano:   { w: 4, a:   2, d: 120, s: 0.25, r: 180 },
  Bell:    { w: 5, a:   1, d: 200, s: 0.00, r: 200 },
  Orgue:   { w: 0, a:   8, d:  10, s: 0.95, r:  60 },
  Pad:     { w: 0, a: 120, d: 160, s: 0.80, r: 200 },
  Basse:   { w: 2, a:   4, d:  90, s: 0.60, r:  90 },
  Marimba: { w: 3, a:   1, d: 110, s: 0.00, r:  90 },
};

/* ---- Arpégiateur : helpers de calcul ------------------------------------- */

// Retourne le(s) index de note(s) à jouer au sous-tick subTickIdx.
// N  = nombre de notes dans la colonne.
// Renvoie un tableau d'indices (1 note pour Up/Down/Random/Ping-pong, 2 pour Tierces/Quintes).
function arpNoteIndices(subTickIdx, N, modeIdx) {
  if (N === 0) return [];

  let main;

  if (modeIdx === 3) {
    // Ping-pong : 0,1,2,1,0,1,2,1...
    if (N === 1) { main = 0; }
    else {
      const cycle = (N - 1) * 2;
      const pos   = subTickIdx % cycle;
      main = pos < N ? pos : cycle - pos;
    }
  } else {
    main = subTickIdx % N;
  }

  if (modeIdx === 4) {
    // Tierces : note[main] + note[(main+2)%N]
    const second = (main + 2) % N;
    return second !== main ? [main, second] : [main];
  }
  if (modeIdx === 5) {
    // Quintes : note[main] + note[(main+4)%N]
    const second = (main + 4) % N;
    return second !== main ? [main, second] : [main];
  }

  return [main]; // Up / Down / Random / Ping-pong
}

// Construit la liste de notes d'une colonne triée selon le mode arp.
// Retourne un tableau de { midi, age }.
function buildColArpSeq(g, col, pitches, modeIdx) {
  const notes = [];
  for (let y = 0; y < GRID; y++) {
    const age = g[y][col];
    if (age > 0) notes.push({ midi: rowToPitch(y, pitches), age });
  }
  if (!notes.length) return [];

  if      (modeIdx === 0) notes.sort((a, b) => a.midi - b.midi);  // Up
  else if (modeIdx === 1) notes.sort((a, b) => b.midi - a.midi);  // Down
  else if (modeIdx === 2) {                                          // Random
    for (let i = notes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [notes[i], notes[j]] = [notes[j], notes[i]];
    }
  }
  else if (modeIdx === 3) notes.sort((a, b) => a.midi - b.midi);  // Ping-pong (trié, index géré par arpNoteIdx)
  // modeIdx===4 (Accord) : ordre indifférent, toutes jouées en même temps

  return notes;
}

Object.assign(window, {
  GRID, RULES, SCALES, NOTE_NAMES, PRESETS, WAVES, SYMMETRIES,
  ARP_MODES, ARP_DIV, ARP_DIV_VALUES, AGE_TARGETS, LOOP_LENGTHS, LOOP_BARS,
  SHAPES, SHAPE_NAMES, PRESET_MAP,
  emptyGrid, cloneGrid, randomGrid, gridPopulation,
  step, applySymmetry, placeShape,
  buildPitches, rowToPitch, midiToFreq, noteHue,
  arpNoteIndices, buildColArpSeq,
});
