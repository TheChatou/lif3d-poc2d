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
const PRESETS      = ['Libre', 'Piano', 'Cristal', 'Orgue', 'Pad', 'Basse', 'Marimba'];
const WAVES        = ['Sine', 'Carré', 'Scie', 'Triangle', 'FM', 'FM2', 'FM3', 'Karplus-Strong', 'Sample (.wav)'];
const SYMMETRIES   = ['Aucune', 'Axiale X', 'Axiale Y', 'Co-axiale', 'Centrale'];

// Modes d'arpège : ordre et structure de lecture des notes d'une colonne.
const ARP_MODES = [
  'Up',        // 0 — ascendant (grave → aigu), cycle
  'Down',      // 1 — descendant (aigu → grave), cycle
  'Random',    // 2 — aléatoire, re-tiré à chaque colonne
  'Ping-pong', // 3 — aller-retour
  'Accord 3ce',// 4 — accord : note de référence (la plus grave allumée) + sa tierce, si présente
  'Accord 5te',// 5 — accord : note de référence (la plus grave allumée) + sa quinte, si présente
  'Accord',    // 6 — toutes les notes de la colonne jouées simultanément (comme le sim Python)
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
  // 🎓 On RECOPIE une moitié vers son image miroir (écrasement), comme le
  // sim Python (_apply_sym) — surtout PAS de fusion OR : fusionner doublerait
  // (voire quadruplerait) la densité du semis aléatoire, ce qui sur-encombre
  // la grille et la fait s'éteindre dès la génération suivante.
  const out  = cloneGrid(g);
  const M    = GRID - 1;
  const half = GRID >> 1;

  if (mode === 1 || mode === 3) {                 // Axiale X (et Co-axiale)
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < half; x++)
        out[y][M - x] = out[y][x];
  }
  if (mode === 2 || mode === 3) {                 // Axiale Y (et Co-axiale)
    for (let y = 0; y < half; y++)
      for (let x = 0; x < GRID; x++)
        out[M - y][x] = out[y][x];
  }
  if (mode === 4) {                               // Centrale (rotation 180°)
    for (let y = 0; y < half; y++)
      for (let x = 0; x < GRID; x++)
        out[M - y][M - x] = out[y][x];
  }
  return out;
}

/* ---- Formes de départ (catalogue) --------------------------------------- */

const SHAPES = {
  Vide:   [],
  Blinker:[[0,0],[1,0],[2,0]],
  // 🎓 Oscillateurs symétriques classiques — comme le Pulsar, ils clignotent
  // sur place (période fixe) plutôt que de se déplacer. Vérifiés par
  // simulation : période exacte 2 pour les deux.
  Beacon: [[0,0],[1,0],[0,1],[3,2],[2,3],[3,3]],   // 2 blocs en diagonale qui se touchent/séparent
  Toad:   [[1,0],[2,0],[3,0],[0,1],[1,1],[2,1]],   // barre de 6 cellules à symétrie centrale
  Block:  [[0,0],[1,0],[0,1],[1,1]],
  'R-pentomino': [[1,0],[2,0],[0,1],[1,1],[1,2]],
  // 🎓 Vaisseau spatial le plus imposant (13 cellules, 7×5) — bien plus visible
  // qu'un Glider classique (5 cellules). Vérifié : vaisseau stable, période 4.
  Vaisseau: [[3,0],[4,0],[1,1],[6,1],[0,2],[0,3],[6,3],[0,4],[1,4],[2,4],[3,4],[4,4],[5,4]],
  // 🎓 Méthuselah façon "feu d'artifice" : 7 cellules qui explosent en un pic
  // de 64 cellules vivantes (¼ de la grille !) avant de retomber en activité
  // oscillante permanente — vérifié par simulation sur 400 générations.
  Chaos: [[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[2,2]],
  Pulsar: (() => {
    const pts  = [];
    const arms = [2,3,4,8,9,10];
    const ring = [0,5,7,12];
    ring.forEach((r) => arms.forEach((a) => { pts.push([a,r]); pts.push([r,a]); }));
    return pts;
  })(),
};
const SHAPE_NAMES = [
  'Vide', 'Vaisseau', 'Chaos', 'R-pentomino',
  'Blinker', 'Toad', 'Beacon', 'Pulsar', 'Block',
];

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
// Couvre toujours exactement 3 octaves (36 demi-tons) quelle que soit la gamme,
// puis distribue count notes régulièrement dans cette plage.
function buildPitches(tonicIndex, scaleIv, count, octave = 0) {
  const base = 48 + tonicIndex + octave * 12;  // C3 = 48, décalé par octave (-2..+2)
  const SPAN = 36;               // 3 octaves fixes
  const all  = [];
  // 🎓 On collecte toutes les notes de la gamme dans la plage [base, base+SPAN]
  for (let p = base; p <= base + SPAN; p++) {
    if (scaleIv.includes(((p - base) % 12 + 12) % 12)) all.push(p);
  }
  if (all.length === 0) return Array(count).fill(base);
  // Distribution uniforme : count points répartis sur all.length pitches disponibles
  return Array.from({ length: count }, (_, i) =>
    all[Math.round(i * (all.length - 1) / Math.max(count - 1, 1))],
  );
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
// 🎓 Repensés pour s'éloigner du son "synthé jouet années 70" : on choisit des
// formes d'onde plus riches (FM, Karplus-Strong, Scie) et des enveloppes plus
// naturelles (attaques/chutes moins carrées) plutôt que du Sine/Carré nu.
const PRESET_MAP = {
  Libre:   { w: 0, a:   6, d:  60,  s: 0.50, r: 120 },
  Piano:   { w: 4, a:   2, d: 140,  s: 0.20, r: 220 },
  // Cristal : timbre "cloche de cristal" validé au Python (attaque 15ms,
  // decay 350ms, sustain nul) — superposition d'harmoniques via FM2.
  Cristal: { w: 5, a:  15, d: 350,  s: 0.00, r: 250 },
  // Orgue : FM3 apporte des harmoniques façon tirettes d'orgue, plus riche
  // qu'une simple sinusoïde plate.
  Orgue:   { w: 6, a:   8, d:  10,  s: 0.92, r:  80 },
  Pad:     { w: 3, a: 180, d: 220,  s: 0.75, r: 320 },
  // Basse : Scie (harmoniques pleines) → grain analogique, plus de corps
  // qu'une sinusoïde ou un carré nus.
  Basse:   { w: 2, a:   3, d: 110,  s: 0.55, r:  70 },
  // Marimba : Karplus-Strong → corps boisé/résonant naturel d'un mailloche,
  // bien plus crédible qu'une triangle synthétique.
  Marimba: { w: 7, a:   1, d: 140,  s: 0.00, r:  90 },
};

/* ---- Arpégiateur : helpers de calcul ------------------------------------- */

// Retourne le(s) index de note(s) à jouer au sous-tick subTickIdx.
// N  = nombre de notes dans la colonne.
// Renvoie un tableau d'indices (1 note pour Up/Down/Random/Ping-pong, toutes pour les modes accord).
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

  if (modeIdx === 4 || modeIdx === 5 || modeIdx === 6) {
    // 🎓 Accords (3ce / 5te / plein) : la séquence est déjà réduite aux notes
    // de l'accord par buildColArpSeq → on les joue toutes ensemble (polyphonique).
    return Array.from({ length: N }, (_, i) => i);
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

  if (modeIdx === 4 || modeIdx === 5) {
    // 🎓 Accords Tierce/Quinte : on prend la note de référence — la plus grave
    // allumée sur ce temps — puis on cherche SA tierce ou SA quinte parmi les
    // autres notes allumées de la même colonne (pas dans toute la gamme : ça
    // évite la cacophonie). Si l'intervalle n'est pas présent, la référence
    // joue seule plutôt que de forcer une note absente.
    notes.sort((a, b) => a.midi - b.midi);
    const ref = notes[0];
    // Tierce : majeure (4) puis mineure (3) ; Quinte : juste (7) puis altérées (6, 8)
    const targetIv = modeIdx === 4 ? [4, 3] : [7, 6, 8];
    let chordNote = null;
    for (const iv of targetIv) {
      chordNote = notes.find((n) => n !== ref && ((n.midi - ref.midi) % 12 + 12) % 12 === iv);
      if (chordNote) break;
    }
    return chordNote ? [ref, chordNote] : [ref];
  }

  if      (modeIdx === 0) notes.sort((a, b) => a.midi - b.midi);  // Up
  else if (modeIdx === 1) notes.sort((a, b) => b.midi - a.midi);  // Down
  else if (modeIdx === 2) {                                          // Random
    for (let i = notes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [notes[i], notes[j]] = [notes[j], notes[i]];
    }
  }
  else if (modeIdx === 3) notes.sort((a, b) => a.midi - b.midi);  // Ping-pong (trié, index géré par arpNoteIdx)
  // modeIdx===6 (Accord plein) : ordre indifférent, toutes jouées en même temps

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
