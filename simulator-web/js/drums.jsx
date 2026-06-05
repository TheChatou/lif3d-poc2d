/* ==========================================================================
   LIF2D — Boîte à rythmes steampunk.
   16 pistes × 16 pas, swing, mute/volume, 5 presets rythmiques.
   Mode Drum : les pistes s'affichent aussi sur la matrice principale.
   ========================================================================== */

// Noms, abréviations et couleurs des 16 pistes
const DRUM_NAMES = [
  'Kick', 'Snare', 'Hat', 'Hat ouvert', 'Clap',
  'Tom H', 'Tom M', 'Tom L', 'Rim', 'Cowbell',
  'Clave', 'Shaker', 'Maracas', 'Ride', 'Crash', 'Perc',
];
const DRUM_ABBR = [
  'K', 'S', 'H', 'Ho', 'C',
  'TH', 'TM', 'TL', 'Ri', 'Co',
  'Cl', 'Sh', 'Ma', 'Rd', 'Cr', 'P',
];
// Couleurs accent (CSS color strings) par piste
const DRUM_HUE = [
  '#e07b2a', '#d4c44a', '#7ab8e0', '#5ba8d8', '#c27ae0',
  '#e08a7a', '#e06a4a', '#c84a28', '#a0d88e', '#d4d480',
  '#88d4b0', '#b8d480', '#80a8d4', '#a888d4', '#d488b8', '#d4a880',
];

/* ---- Helpers ------------------------------------------------------------ */
const _b = (s) => s.split('').map((c) => c === '1');
const _E = () => Array(16).fill(false);

/* ---- Patterns de batterie (steps uniquement, appliqués sur le pattern) -- */
const DRUM_PRESETS = {
  'Vide':  Array(16).fill(null).map(_E),

  // 🎓 4/4 classique : kick sur les temps 1 et 3, snare sur 2 et 4,
  // hat en croches (toutes les 2 doubles-croches = 8 hits par mesure).
  '4/4': [
    _b('1000000010000000'), // Kick
    _b('0000100000001000'), // Snare
    _b('1010101010101010'), // Hat
    _E(), _E(),             // Hat ouvert, Clap
    _E(), _E(), _E(), _E(), _E(),
    _E(), _E(), _E(), _E(), _E(), _E(),
  ],

  // 🎓 Trap : kick syncopé, hat en doubles-croches (hi-hat rapide), snare sur le 3.
  'Trap': [
    _b('1000100100000100'), // Kick syncopé
    _b('0000000010000000'), // Snare sur le 3
    _b('1111111111111111'), // Hat tout (doubles-croches)
    _b('0000001000000010'), // Hat ouvert (off-beats)
    _E(), _E(), _E(), _E(), _E(), _E(),
    _E(), _E(), _E(), _E(), _E(), _E(),
  ],

  // 🎓 Afro : feel Afrobeat, clave son (3+3+2) sur la piste Clave (index 10).
  // Le 3-2 son clave : positions 0, 3, 6, 10, 12 dans la mesure de 16.
  'Afro': [
    _b('1000100000101000'), // Kick
    _b('0000100000001000'), // Snare
    _b('1010101010101010'), // Hat en croches
    _E(), _E(),
    _E(), _E(), _E(), _E(), _E(),
    _b('1001001000101000'), // Clave 3-2 son
    _E(), _E(), _E(), _E(), _E(),
  ],

  // 🎓 Bossa nova : hat avec le pattern caractéristique 1-0-1-1-0-1-0-1 (×2).
  'Bossa': [
    _b('1000100000001000'), // Kick bossa
    _b('0000000100000001'), // Snare léger (brushes)
    _b('1011010110110101'), // Hat bossa pattern
    _E(), _E(),
    _E(), _E(), _E(), _E(), _E(),
    _E(), _E(), _E(), _E(), _E(), _E(),
  ],
};

/* ---- Pattern par défaut (16 pistes) ------------------------------------- */
const DRUM_DEFAULT = {
  steps: [
    _b('1000000010000000'), // Kick
    _b('0000100000001000'), // Snare
    _b('1010101010101010'), // Hat
    ...Array(13).fill(null).map(_E),
  ],
  vols:  [0.85, 0.72, 0.48, 0.55, 0.60, ...Array(11).fill(0.65)],
  mutes: Array(16).fill(false),
  swing: 0,
};

/* ---- CSS injecté (une seule fois) --------------------------------------- */
const __DRUM_CSS = `
  /* ---- Panneau drawer (slide-up depuis le bas) --------------------------- */
  .lif-drum-panel {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 190;
    background: rgba(16,12,9,.97);
    backdrop-filter: blur(20px) saturate(140%);
    -webkit-backdrop-filter: blur(20px) saturate(140%);
    border-top: 1px solid rgba(201,164,76,.22);
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -12px 40px rgba(0,0,0,.65), 0 -1px 0 rgba(0,0,0,.5);
    transform: translateY(100%);
    transition: transform 0.28s cubic-bezier(.38,.12,.28,1);
    padding-bottom: env(safe-area-inset-bottom, 0);
    max-height: 80vh; overflow-y: auto;
  }
  .lif-drum-panel.is-open { transform: translateY(0); }

  /* ---- En-tête du panneau ------------------------------------------------ */
  .lif-drum-hd {
    display: flex; align-items: center; justify-content: space-between;
    padding: 7px 14px 6px;
    border-bottom: 1px solid rgba(255,255,255,.05);
    position: sticky; top: 0; background: rgba(16,12,9,.98); z-index: 2;
  }
  .lif-drum-hd-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .lif-drum-title {
    font-family: 'Cinzel', serif; font-weight: 600; font-size: 11px;
    letter-spacing: .18em; text-transform: uppercase; color: var(--brass);
  }
  .lif-drum-close {
    appearance: none; border: 0; background: transparent;
    color: var(--text-dim); width: 26px; height: 26px;
    border-radius: 6px; cursor: pointer; font-size: 14px; line-height: 1;
    flex-shrink: 0;
  }
  .lif-drum-close:hover { background: rgba(255,255,255,.08); color: var(--text); }

  /* ---- Swing ------------------------------------------------------------ */
  .lif-drum-swing-row { display: flex; align-items: center; gap: 7px; }
  .lif-drum-swing-lbl {
    font-family: 'Barlow Condensed', sans-serif; font-size: 10px;
    letter-spacing: .12em; text-transform: uppercase; color: var(--text-dim);
  }
  .lif-drum-swing-slider {
    -webkit-appearance: none; appearance: none;
    width: 64px; height: 3px; border-radius: 2px;
    background: rgba(255,255,255,.12); outline: none; cursor: pointer;
  }
  .lif-drum-swing-slider::-webkit-slider-thumb {
    -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, var(--steel-hi), var(--steel-0));
    box-shadow: 0 1px 3px rgba(0,0,0,.6), 0 0 0 1px rgba(201,164,76,.28);
    cursor: default;
  }
  .lif-drum-swing-val {
    font-family: 'Space Mono', monospace; font-size: 10px;
    color: var(--brass); min-width: 26px;
  }

  /* ---- Presets ----------------------------------------------------------- */
  .lif-drum-presets {
    display: flex; gap: 5px; padding: 5px 14px 4px; flex-wrap: wrap;
  }
  .lif-drum-preset {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 10px;
    letter-spacing: .1em; text-transform: uppercase;
    padding: 4px 9px; border-radius: 5px; border: 1px solid rgba(255,255,255,.12);
    background: rgba(255,255,255,.05); color: var(--text-dim); cursor: pointer;
    transition: color .12s, border-color .12s;
  }
  .lif-drum-preset:hover { color: var(--brass); border-color: rgba(201,164,76,.36); }

  /* ---- Grille des pistes ------------------------------------------------- */
  .lif-drum-body { padding: 4px 14px 10px; display: flex; flex-direction: column; gap: 3px; }
  .lif-drum-row  { display: flex; align-items: center; gap: 6px; }

  .lif-drum-row-head {
    display: flex; align-items: center; gap: 4px;
    width: 72px; flex-shrink: 0;
  }
  .lif-drum-mute {
    width: 18px; height: 18px; border-radius: 4px; flex-shrink: 0;
    border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.05);
    color: var(--text-dim); font-size: 8px; font-weight: 700;
    font-family: 'Barlow Condensed', sans-serif; cursor: pointer;
    transition: background .12s, color .12s, border-color .12s;
    display: grid; place-items: center;
  }
  .lif-drum-mute.is-muted {
    background: rgba(217,83,79,.22); border-color: rgba(217,83,79,.5); color: #d9534f;
  }
  .lif-drum-abbr {
    font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 700;
    letter-spacing: .02em; width: 20px; text-align: center; flex-shrink: 0;
  }
  .lif-drum-vol {
    -webkit-appearance: none; appearance: none;
    width: 28px; height: 3px; border-radius: 2px;
    background: rgba(255,255,255,.10); outline: none; cursor: pointer; flex-shrink: 0;
  }
  .lif-drum-vol::-webkit-slider-thumb {
    -webkit-appearance: none; width: 9px; height: 9px; border-radius: 50%;
    background: var(--steel-hi); box-shadow: 0 1px 2px rgba(0,0,0,.6); cursor: default;
  }

  /* ---- Grille des 16 pas ------------------------------------------------- */
  .lif-drum-steps { display: flex; gap: 2px; flex: 1; }
  .lif-drum-step  { flex: 1; height: 20px; border-radius: 3px; border: none; cursor: pointer; }
  .lif-drum-step.is-beat-start { margin-left: 3px; }
  .lif-drum-step {
    background: rgba(255,255,255,.07);
    box-shadow: inset 0 1px 1px rgba(255,255,255,.05), inset 0 -1px 2px rgba(0,0,0,.5);
    transition: background .09s, box-shadow .09s;
  }
  .lif-drum-step.is-on {
    background: var(--step-color, var(--brass));
    box-shadow: 0 0 6px var(--step-color, var(--brass)),
                inset 0 1px 1px rgba(255,255,255,.35),
                inset 0 -1px 2px rgba(0,0,0,.2);
  }
  .lif-drum-step.is-playing {
    box-shadow: inset 0 0 0 1.5px rgba(255,240,180,.45), inset 0 0 6px rgba(255,240,180,.12);
  }
  .lif-drum-step.is-on.is-playing {
    box-shadow: 0 0 10px var(--step-color, var(--brass)),
                0 0 3px rgba(255,255,255,.5),
                inset 0 1px 1px rgba(255,255,255,.5);
  }

  /* ---- Bouton d'ouverture fixe (bas-gauche) ------------------------------ */
  .lif-drum-open-btn {
    position: fixed; bottom: 16px; left: 16px; z-index: 200;
    background: rgba(28,24,20,.88);
    border: 1px solid rgba(201,164,76,.22);
    color: var(--brass-dim);
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 10px;
    letter-spacing: .12em; text-transform: uppercase;
    padding: 6px 10px; border-radius: 7px; cursor: pointer;
    transition: color .15s, border-color .15s, box-shadow .15s;
  }
  .lif-drum-open-btn:hover { color: var(--brass); border-color: rgba(201,164,76,.42); }
  .lif-drum-open-btn.is-active {
    color: var(--brass); border-color: rgba(201,164,76,.38);
    box-shadow: 0 0 10px rgba(201,164,76,.15);
  }
`;

/* ---- Grille des pistes (16 rangées compactes) --------------------------- */
function DrumMachine({ pattern, onChange, playCol, playing }) {
  const toggleStep = (track, step) => {
    const steps = pattern.steps.map((row, t) =>
      t === track ? row.map((v, s) => (s === step ? !v : v)) : row
    );
    onChange({ ...pattern, steps });
  };
  const toggleMute = (track) => {
    const mutes = pattern.mutes.map((m, t) => (t === track ? !m : m));
    onChange({ ...pattern, mutes });
  };
  const setVol = (track, vol) => {
    const vols = pattern.vols.map((v, t) => (t === track ? vol : v));
    onChange({ ...pattern, vols });
  };

  return (
    <div className="lif-drum-body">
      {DRUM_NAMES.map((name, track) => (
        <div key={name} className="lif-drum-row">
          <div className="lif-drum-row-head">
            <button
              className={`lif-drum-mute ${pattern.mutes[track] ? 'is-muted' : ''}`}
              onClick={() => toggleMute(track)}>M</button>
            <span className="lif-drum-abbr" style={{ color: DRUM_HUE[track] }}>
              {DRUM_ABBR[track]}
            </span>
            <input type="range" min="0" max="1" step="0.01"
              value={pattern.vols[track] ?? 0.65}
              className="lif-drum-vol"
              onChange={(e) => setVol(track, parseFloat(e.target.value))} />
          </div>
          <div className="lif-drum-steps">
            {pattern.steps[track].map((on, step) => (
              <button
                key={step}
                className={[
                  'lif-drum-step',
                  on ? 'is-on' : '',
                  playing && playCol === step ? 'is-playing' : '',
                  step > 0 && step % 4 === 0 ? 'is-beat-start' : '',
                ].join(' ')}
                style={on ? { '--step-color': DRUM_HUE[track] } : {}}
                onClick={() => toggleStep(track, step)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- Wrapper collapsible + sélecteur de presets ------------------------- */
function DrumPanel({ pattern, onChange, playCol, playing }) {
  const [open, setOpen] = React.useState(false);

  const applyPreset = (name) => {
    onChange({ ...pattern, steps: DRUM_PRESETS[name].map((row) => [...row]) });
  };

  return (
    <>
      <style>{__DRUM_CSS}</style>

      <button
        className={`lif-drum-open-btn ${open ? 'is-active' : ''}`}
        onClick={() => setOpen((v) => !v)}>
        Batterie ♩
      </button>

      <div className={`lif-drum-panel ${open ? 'is-open' : ''}`}>
        {/* En-tête : titre + swing + fermer */}
        <div className="lif-drum-hd">
          <div className="lif-drum-hd-left">
            <span className="lif-drum-title">Batterie</span>
            <div className="lif-drum-swing-row">
              <span className="lif-drum-swing-lbl">Swing</span>
              <input type="range" min="0" max="1" step="0.01"
                value={pattern.swing}
                className="lif-drum-swing-slider"
                onChange={(e) => onChange({ ...pattern, swing: parseFloat(e.target.value) })} />
              <span className="lif-drum-swing-val">{Math.round(pattern.swing * 100)}%</span>
            </div>
          </div>
          <button className="lif-drum-close" onClick={() => setOpen(false)}>✕</button>
        </div>

        {/* Presets */}
        <div className="lif-drum-presets">
          {Object.keys(DRUM_PRESETS).map((name) => (
            <button key={name} className="lif-drum-preset"
              onClick={() => applyPreset(name)}>{name}</button>
          ))}
        </div>

        <DrumMachine
          pattern={pattern}
          onChange={onChange}
          playCol={playCol}
          playing={playing}
        />
      </div>
    </>
  );
}

/* ---- Vue Batterie : matrice 16×16 + labels/mute/vol par piste ----------- */
function BatterieView({ ctx }) {
  const { drumPattern, setDrumPattern, paintDrum, playing, playCol, p, set } = ctx;

  const sl = {  // style de base commun aux sliders inline
    WebkitAppearance: 'none', appearance: 'none',
    height: 3, borderRadius: 2, outline: 'none', cursor: 'pointer',
    background: 'rgba(255,255,255,.12)',
  };

  const toggleMute = (track) =>
    setDrumPattern({ ...drumPattern, mutes: drumPattern.mutes.map((m, t) => t === track ? !m : m) });
  const setVol = (track, vol) =>
    setDrumPattern({ ...drumPattern, vols: drumPattern.vols.map((v, t) => t === track ? vol : v) });

  // Taille carrée de la matrice en px — ajuster si besoin
  const SZ = 380;

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12,
                  maxWidth: SZ + 120, margin: '0 auto' }}>

      {/* ---- En-tête : titre + swing + vol drums + presets ------------------ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                    borderBottom: '1px solid rgba(255,255,255,.06)', paddingBottom: 10 }}>
        <span style={{ fontFamily: 'Cinzel', fontSize: 12, letterSpacing: '.2em',
                       color: 'var(--brass)', textTransform: 'uppercase' }}>Batterie</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '.1em',
                         textTransform: 'uppercase', fontFamily: 'var(--font-ui)' }}>Swing</span>
          <input type="range" min="0" max="1" step="0.01"
            value={drumPattern.swing} style={{ ...sl, width: 68 }}
            onChange={(e) => setDrumPattern({ ...drumPattern, swing: parseFloat(e.target.value) })} />
          <span style={{ fontSize: 9, color: 'var(--brass)', fontFamily: 'Space Mono', minWidth: 26 }}>
            {Math.round(drumPattern.swing * 100)}%</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '.1em',
                         textTransform: 'uppercase', fontFamily: 'var(--font-ui)' }}>Vol Drums</span>
          <input type="range" min="0" max="1" step="0.01"
            value={p.drumVolume ?? 0.75} style={{ ...sl, width: 80 }}
            onChange={(e) => set('drumVolume', parseFloat(e.target.value))} />
          <span style={{ fontSize: 9, color: 'var(--brass)', fontFamily: 'Space Mono', minWidth: 26 }}>
            {Math.round((p.drumVolume ?? 0.75) * 100)}%</span>
        </div>

        {/* Presets */}
        {Object.keys(DRUM_PRESETS).map((name) => (
          <button key={name} className="lif-drum-preset"
            onClick={() => setDrumPattern({ ...drumPattern, steps: DRUM_PRESETS[name].map((r) => [...r]) })}>
            {name}
          </button>
        ))}
      </div>

      {/* ---- Zone principale : labels pistes (gauche) + matrice (droite) ---- */}
      <div style={{ display: 'flex', gap: 0, height: SZ }}>

        {/* Labels pistes : 16 lignes alignées sur la hauteur de la matrice */}
        <div style={{ display: 'grid', gridTemplateRows: 'repeat(16, 1fr)',
                      width: 96, height: SZ, flexShrink: 0 }}>
          {DRUM_NAMES.map((name, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '0 5px', borderBottom: '1px solid rgba(255,255,255,.03)',
            }}>
              {/* Bouton mute */}
              <button onClick={() => toggleMute(i)} style={{
                width: 15, height: 15, borderRadius: 3, flexShrink: 0,
                border: `1px solid ${drumPattern.mutes[i] ? 'rgba(217,83,79,.6)' : 'rgba(255,255,255,.15)'}`,
                background: drumPattern.mutes[i] ? 'rgba(217,83,79,.25)' : 'rgba(255,255,255,.05)',
                color: drumPattern.mutes[i] ? '#d9534f' : 'var(--text-dim)',
                fontSize: 7, cursor: 'pointer', display: 'grid', placeItems: 'center',
              }}>M</button>

              {/* Abréviation colorée */}
              <span style={{ color: DRUM_HUE[i], fontSize: 9, fontFamily: 'Space Mono',
                             fontWeight: 700, width: 17, flexShrink: 0, lineHeight: 1 }}>
                {DRUM_ABBR[i]}
              </span>

              {/* Slider volume */}
              <input type="range" min="0" max="1" step="0.01"
                value={drumPattern.vols[i] ?? 0.65}
                style={{ ...sl, width: 30, flexShrink: 0 }}
                onChange={(e) => setVol(i, parseFloat(e.target.value))} />
            </div>
          ))}
        </div>

        {/* Matrice 16×16 en mode Drum — clic pour poser/effacer les pas */}
        <div style={{ width: SZ, height: SZ, flexShrink: 0 }}>
          <window.Matrix
            grid={window.emptyGrid()} gen={0} pitches={[]}
            brightness={p.brightness} bloom={1} warm={false}
            playCol={playing ? playCol : -1} playing={playing}
            cursor={null} drawMode={false}
            onPaint={paintDrum}
            drumMode={true} drumPattern={drumPattern} />
        </div>
      </div>
    </div>
  );
}

// Exports globaux
window.DrumPanel     = DrumPanel;
window.BatterieView  = BatterieView;
window.DRUM_NAMES    = DRUM_NAMES;
window.DRUM_HUE      = DRUM_HUE;
window.DRUM_DEFAULT  = DRUM_DEFAULT;
window.DRUM_PRESETS  = DRUM_PRESETS;
