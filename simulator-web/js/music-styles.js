/* ==========================================================================
   LIF2D — Styles musicaux : 6 presets audio paramétrés.
   Mappings : design scale IDs → SCALES indices, wave names → WAVES indices.
   ========================================================================== */

// SCALES (engine.js) : penta=0, minor=1, major=2, dorian=3, pentamin=4,
//                      lydian=5, mixo=6, hira=7, lyddom=8, phrygdom=9
const _SCALE_MAP = { japon: 7, min: 1, maj: 2, pentaMin: 4, pentaMaj: 0 };

// WAVES (engine.js) : Sine=0, Carré=1, Scie=2, Triangle=3, FM=4..6, Karplus=7
const _WAVE_MAP = { sine: 0, square: 1, saw: 2, tri: 3, karplus: 7 };

// sustain/cutoff/resonance/reverb/stereo : valeurs normalisées 0.0–1.0
// attack/decay/release : millisecondes (plages > 200ms intentionnelles — styles ambient/trance)
const MUSIC_STYLES = [
  {
    id: 'japon', name: 'Japonais', color: '#f5b942', glyph: '❋',
    blurb: 'Cloche cristal', scale: 'japon',
    params: { wave: 'karplus', attack: 2,   decay: 240, sustain: 0.18, release: 900,
              cutoff: 0.78, resonance: 0.22, reverb: 0.46, detune: 4,  stereo: 0.60 },
  },
  {
    id: 'ambient', name: 'Ambient', color: '#5b7bff', glyph: '≈',
    blurb: 'Drones, LFO lent', scale: 'min',
    params: { wave: 'sine', attack: 600, decay: 800, sustain: 0.80, release: 1800,
              cutoff: 0.34, resonance: 0.10, reverb: 0.72, detune: 8,  stereo: 0.78 },
  },
  {
    id: 'melodic', name: 'Mélodique', color: '#38d07a', glyph: '♪',
    blurb: 'Harmonies, arpège', scale: 'maj',
    params: { wave: 'tri', attack: 8, decay: 120, sustain: 0.55, release: 280,
              cutoff: 0.62, resonance: 0.18, reverb: 0.30, detune: 5,  stereo: 0.48 },
  },
  {
    id: 'techno', name: 'Techno', color: '#e8edf2', glyph: '▦',
    blurb: 'Kick 4/4, carré', scale: 'min',
    params: { wave: 'square', attack: 1, decay: 90, sustain: 0.30, release: 120,
              cutoff: 0.86, resonance: 0.28, reverb: 0.12, detune: 2,  stereo: 0.30 },
  },
  {
    id: 'acid', name: 'Acid', color: '#ff5a4d', glyph: '◉',
    blurb: 'Saw + filtre 303', scale: 'pentaMin',
    params: { wave: 'saw', attack: 1, decay: 70, sustain: 0.25, release: 90,
              cutoff: 0.54, resonance: 0.86, reverb: 0.18, detune: 3,  stereo: 0.40 },
  },
  {
    id: 'trance', name: 'Trance', color: '#a96cff', glyph: '✦',
    blurb: 'Nappes désaccordées', scale: 'pentaMaj',
    params: { wave: 'saw', attack: 40, decay: 200, sustain: 0.70, release: 600,
              cutoff: 0.58, resonance: 0.40, reverb: 0.54, detune: 14, stereo: 0.84 },
  },
];

function applyStyle(styleId, set) {
  const s = MUSIC_STYLES.find((x) => x.id === styleId);
  if (!s) return;
  const { params, scale } = s;
  set('waveIdx',   _WAVE_MAP[params.wave]   ?? 0);
  set('attack',    params.attack);
  set('decay',     params.decay);
  set('sustain',   params.sustain);
  set('release',   params.release);
  set('cutoff',    params.cutoff);
  set('resonance', params.resonance);
  set('reverb',    params.reverb);
  set('detune',    params.detune);
  set('stereo',    params.stereo);
  set('scaleIdx',  _SCALE_MAP[scale] ?? 0);
}

window.MUSIC_STYLES = MUSIC_STYLES;
window.applyStyle   = applyStyle;
