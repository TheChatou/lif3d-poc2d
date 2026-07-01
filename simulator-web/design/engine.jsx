/* ============================================================
   LIF2D — engine.jsx
   Données + logique pure (Jeu de la Vie, gammes, styles, drums).
   Exporté sur window pour les autres scripts Babel.
   ============================================================ */

const GRID = 16;

/* ---- Règles GoL (notation B/S) ---------------------------- */
const RULES = [
  { id: "conway",     name: "Conway",     bs: "B3/S23",       b: [3],            s: [2, 3] },
  { id: "highlife",   name: "HighLife",   bs: "B36/S23",      b: [3, 6],         s: [2, 3] },
  { id: "dense",      name: "Dense",      bs: "B35678/S5678", b: [3,5,6,7,8],    s: [5,6,7,8] },
  { id: "coral",      name: "Coral",      bs: "B3/S45678",    b: [3],            s: [4,5,6,7,8] },
  { id: "maze",       name: "Maze",       bs: "B3/S12345",    b: [3],            s: [1,2,3,4,5] },
  { id: "replicator", name: "Replicator", bs: "B1357/S1357",  b: [1,3,5,7],      s: [1,3,5,7] },
  { id: "seeds",      name: "Seeds",      bs: "B2/S",         b: [2],            s: [] },
];

/* ---- Gammes (offsets en demi-tons) ------------------------ */
const SCALES = [
  { id: "maj",     name: "Majeure",      steps: [0,2,4,5,7,9,11] },
  { id: "min",     name: "Mineure",      steps: [0,2,3,5,7,8,10] },
  { id: "pentaMaj",name: "Penta Maj.",   steps: [0,2,4,7,9] },
  { id: "pentaMin",name: "Penta Min.",   steps: [0,3,5,7,10] },
  { id: "blues",   name: "Blues",        steps: [0,3,5,6,7,10] },
  { id: "dorien",  name: "Dorien",       steps: [0,2,3,5,7,9,10] },
  { id: "phrygien",name: "Phrygien",     steps: [0,1,3,5,7,8,10] },
  { id: "lydien",  name: "Lydien",       steps: [0,2,4,6,7,9,11] },
  { id: "japon",   name: "Japonaise",    steps: [0,1,5,7,8] },
  { id: "chroma",  name: "Chromatique",  steps: [0,1,2,3,4,5,6,7,8,9,10,11] },
];

const TONICS = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

/* ---- Formes de départ ------------------------------------- */
const SHAPES = [
  { id: "vide",    name: "Vide" },
  { id: "glider",  name: "Glider" },
  { id: "blinker", name: "Blinker" },
  { id: "rpento",  name: "R-Pentomino" },
  { id: "pulsar",  name: "Pulsar" },
  { id: "alea",    name: "Aléatoire" },
];

const SYMMETRIES = [
  { id: "none",   name: "Aucune" },
  { id: "axisX",  name: "Axiale X" },
  { id: "axisY",  name: "Axiale Y" },
  { id: "coaxial",name: "Co-axiale" },
  { id: "central",name: "Centrale" },
];

const WAVEFORMS = [
  { id: "sine",   name: "Sine" },
  { id: "square", name: "Carré" },
  { id: "saw",    name: "Scie" },
  { id: "tri",    name: "Triangle" },
  { id: "fm",     name: "FM" },
  { id: "karplus",name: "Karplus-Str." },
];

/* ---- Styles musicaux = presets audio + couleur ------------ */
const STYLES = [
  { id: "japon", name: "Japonais", color: "#f5b942", glyph: "❋",
    blurb: "Cloche cristal", scale: "japon",
    params: { wave: "karplus", attack: 2, decay: 240, sustain: 18, release: 900,
              cutoff: 78, reso: 22, reverb: 46, lfo: 8, detune: 4, stereo: 60, arp: false } },
  { id: "ambient", name: "Ambient", color: "#5b7bff", glyph: "≈",
    blurb: "Drones, LFO lent", scale: "min",
    params: { wave: "sine", attack: 600, decay: 800, sustain: 80, release: 1800,
              cutoff: 34, reso: 10, reverb: 72, lfo: 4, detune: 8, stereo: 78, arp: false } },
  { id: "melodic", name: "Mélodique", color: "#38d07a", glyph: "♪",
    blurb: "Harmonies, arpèges", scale: "maj",
    params: { wave: "tri", attack: 8, decay: 120, sustain: 55, release: 280,
              cutoff: 62, reso: 18, reverb: 30, lfo: 16, detune: 5, stereo: 48, arp: true } },
  { id: "techno", name: "Techno", color: "#e8edf2", glyph: "▦",
    blurb: "Kick 4/4, carré", scale: "min",
    params: { wave: "square", attack: 1, decay: 90, sustain: 30, release: 120,
              cutoff: 86, reso: 28, reverb: 12, lfo: 32, detune: 2, stereo: 30, arp: false } },
  { id: "acid", name: "Acid", color: "#ff5a4d", glyph: "◉",
    blurb: "Saw + filtre 303", scale: "pentaMin",
    params: { wave: "saw", attack: 1, decay: 70, sustain: 25, release: 90,
              cutoff: 54, reso: 86, reverb: 18, lfo: 48, detune: 3, stereo: 40, arp: true } },
  { id: "trance", name: "Trance", color: "#a96cff", glyph: "✦",
    blurb: "Nappes désaccordées", scale: "pentaMaj",
    params: { wave: "saw", attack: 40, decay: 200, sustain: 70, release: 600,
              cutoff: 58, reso: 40, reverb: 54, lfo: 6, detune: 14, stereo: 84, arp: false } },
];

/* ---- Drum machine ----------------------------------------- */
const DRUM_TRACKS = [
  { id: "K",  name: "Kick",     color: "#f5b942" },
  { id: "S",  name: "Snare",    color: "#ff8a3d" },
  { id: "H",  name: "Hi-Hat",   color: "#5bd6ff" },
  { id: "Ho", name: "Open Hat", color: "#5b7bff" },
  { id: "C",  name: "Clap",     color: "#38d07a" },
  { id: "TH", name: "Tom Hi",   color: "#a96cff" },
  { id: "TM", name: "Tom Mid",  color: "#ff5a4d" },
  { id: "TL", name: "Tom Low",  color: "#d98a5a" },
];

// 32 steps. 1 = hit. Ordre pistes: K S H Ho C TH TM TL
const DSTEPS = 32;
function p(hits) { const a = Array(DSTEPS).fill(0); hits.forEach((i) => { a[i] = 1; }); return a; }
const DRUM_PATTERNS = {
  vide: () => DRUM_TRACKS.map(() => Array(DSTEPS).fill(0)),
  "4/4": () => ([
    p([0,4,8,12,16,20,24,28]),                 // K
    p([4,12,20,28]),                           // S
    p([0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30]), // H
    p([6,14,22,30]),                           // Ho
    p([]),                                     // C
    p([]),                                     // TH
    p([]),                                     // TM
    p([]),                                     // TL
  ]),
  trap: () => ([
    p([0,6,12,16,22,28]),                      // K
    p([8,24]),                                 // S
    p([0,2,3,4,6,8,10,12,14,16,18,20,21,22,24,26,28,30,31]), // H roulé
    p([12,30]),                                // Ho
    p([8,24]),                                 // C
    p([26]),                                   // TH
    p([7,20]),                                 // TM
    p([15]),                                   // TL
  ]),
  afro: () => ([
    p([0,3,6,8,11,14,16,19,22,24,27,30]),      // K
    p([8,24,31]),                              // S
    p([0,1,3,4,6,7,9,11,12,14,16,17,19,20,22,24,27,30]), // H
    p([5,21]),                                 // Ho
    p([18]),                                   // C
    p([5,10,23]),                              // TH
    p([2,13,26]),                              // TM
    p([0,15,16,29]),                           // TL
  ]),
  bossa: () => ([
    p([0,3,6,9,12,16,19,22,25,28]),            // K
    p([14,30]),                                // S
    p([0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30]), // H
    p([7,23]),                                 // Ho
    p([2,5,10,16,21,26]),                      // C
    p([]),                                     // TH
    p([]),                                     // TM
    p([4,13,20,29]),                           // TL
  ]),
};

/* ---- Grilles GoL ------------------------------------------ */
function emptyGrid() {
  return Array.from({ length: GRID }, () => Array(GRID).fill(0));
}

function cloneGrid(g) { return g.map((row) => row.slice()); }

function countLive(g) {
  let n = 0;
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (g[r][c]) n++;
  return n;
}

function placeRel(grid, cells, originR, originC) {
  cells.forEach(([dr, dc]) => {
    const r = (originR + dr + GRID) % GRID;
    const c = (originC + dc + GRID) % GRID;
    grid[r][c] = 1;
  });
}

function seedGrid(shapeId, density = 0.32) {
  const g = emptyGrid();
  const mid = Math.floor(GRID / 2);
  switch (shapeId) {
    case "glider":
      placeRel(g, [[0,1],[1,2],[2,0],[2,1],[2,2]], 2, 2); break;
    case "blinker":
      placeRel(g, [[0,0],[0,1],[0,2]], mid, mid - 1); break;
    case "rpento":
      placeRel(g, [[0,1],[0,2],[1,0],[1,1],[2,1]], mid - 1, mid - 1); break;
    case "pulsar": {
      const base = [
        [0,2],[0,3],[0,4],[0,8],[0,9],[0,10],
        [2,0],[3,0],[4,0],[2,5],[3,5],[4,5],[2,7],[3,7],[4,7],[2,12],[3,12],[4,12],
        [5,2],[5,3],[5,4],[5,8],[5,9],[5,10],
        [7,2],[7,3],[7,4],[7,8],[7,9],[7,10],
        [8,0],[9,0],[10,0],[8,5],[9,5],[10,5],[8,7],[9,7],[10,7],[8,12],[9,12],[10,12],
        [12,2],[12,3],[12,4],[12,8],[12,9],[12,10],
      ];
      placeRel(g, base, 1, 1); break;
    }
    case "alea":
      for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++)
        g[r][c] = Math.random() < density ? 1 : 0;
      break;
    case "vide":
    default:
      break;
  }
  return g;
}

/* ---- Symétrie (peinture miroir) --------------------------- */
function symPoints(r, c, sym) {
  const m = GRID - 1;
  const pts = [[r, c]];
  if (sym === "axisX" || sym === "coaxial") pts.push([r, m - c]);
  if (sym === "axisY" || sym === "coaxial") pts.push([m - r, c]);
  if (sym === "coaxial") pts.push([m - r, m - c]);
  if (sym === "central") pts.push([m - r, m - c]);
  // dédoublonnage
  const seen = new Set();
  return pts.filter(([a, b]) => {
    const k = a + "," + b;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}

/* ---- Pas du Jeu de la Vie (bords toroïdaux) --------------- */
function stepGrid(g, rule) {
  const next = emptyGrid();
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const rr = (r + dr + GRID) % GRID;
          const cc = (c + dc + GRID) % GRID;
          n += g[rr][cc];
        }
      }
      if (g[r][c]) next[r][c] = rule.s.includes(n) ? 1 : 0;
      else next[r][c] = rule.b.includes(n) ? 1 : 0;
    }
  }
  return next;
}

/* ---- Aide: note MIDI -> Hz (pour info / éventuel audio) --- */
function noteName(col, scale, tonicIdx, octave) {
  const steps = scale.steps;
  const deg = col % steps.length;
  const oct = Math.floor(col / steps.length);
  const semis = steps[deg] + tonicIdx + (oct + octave) * 12;
  const idx = ((semis % 12) + 12) % 12;
  const o = 3 + Math.floor(semis / 12) + octave;
  return TONICS[idx] + o;
}

/* ---- Âge des cellules ------------------------------------- */
// ages[r][c] = nb de générations vivantes consécutives (0 = morte)
function updateAges(prevAges, prevGrid, nextGrid) {
  const a = emptyGrid();
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      a[r][c] = nextGrid[r][c] ? (prevGrid[r][c] ? prevAges[r][c] + 1 : 1) : 0;
  return a;
}
function agesFromGrid(g) {
  const a = emptyGrid();
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) a[r][c] = g[r][c] ? 1 : 0;
  return a;
}

/* ---- Utilitaires couleur ---------------------------------- */
function hexToRgb(h) {
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function rgbToHex(r, g, b) {
  const c = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}
function lerpHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A[0]+(B[0]-A[0])*t, A[1]+(B[1]-A[1])*t, A[2]+(B[2]-A[2])*t);
}
function rgbToHsl(r, g, b) {
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b); let h,s,l=(max+min)/2;
  if (max===min){h=s=0;} else {
    const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min);
    switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;}
    h/=6;
  }
  return [h*360, s, l];
}
function hslToHex(h, s, l) {
  h=((h%360)+360)%360/360;
  const hue2=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};
  let r,g,b;
  if(s===0){r=g=b=l;} else {const q=l<0.5?l*(1+s):l+s-l*s;const p=2*l-q;r=hue2(p,q,h+1/3);g=hue2(p,q,h);b=hue2(p,q,h-1/3);}
  return rgbToHex(r*255,g*255,b*255);
}
// scheme: none | chaleur | froid | spectre ; newborn boost si flag
function ageColor(age, scheme, accent, ageMax, highlightNew) {
  if (age <= 0) return accent;
  if (highlightNew && age === 1) return "#fff6e3";
  if (scheme === "none") return accent;
  const t = Math.min(age, ageMax) / ageMax;
  if (scheme === "chaleur") return lerpHex(accent, "#fff3d6", t);
  if (scheme === "froid")   return lerpHex(accent, "#57d6ff", t);
  if (scheme === "spectre") {
    const [h, s, l] = rgbToHsl(...hexToRgb(accent));
    return hslToHex(h + t * 210, Math.max(0.55, s), Math.min(0.62, Math.max(0.5, l)));
  }
  return accent;
}

const LIF2D = {
  GRID, DSTEPS, RULES, SCALES, TONICS, SHAPES, SYMMETRIES, WAVEFORMS, STYLES,
  DRUM_TRACKS, DRUM_PATTERNS,
  emptyGrid, cloneGrid, countLive, seedGrid, symPoints, stepGrid, noteName,
  updateAges, agesFromGrid, ageColor,
};

Object.assign(window, { LIF2D });
