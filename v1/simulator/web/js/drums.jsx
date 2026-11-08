/* ==========================================================================
   LIF2D — Boîte à rythmes steampunk.
   8 pistes × 32 pas, swing, mute/volume, 5 presets rythmiques.
   🎓 32 pas à résolution 32e de note = même durée musicale qu'avant (16 pas
   en 16e de note), mais deux fois plus de résolution rythmique — l'horloge
   batterie tourne donc 2× plus vite que le balayage GoL (cf. app.jsx).
   Mode Drum : les pistes s'affichent aussi sur la matrice principale,
   réparties en deux bandes empilées (pas 0-15 en haut, 16-31 en bas) pour
   tenir sur la matrice physique 16×16.
   ========================================================================== */

// Noms, abréviations et couleurs des 8 pistes (kit de base boîte à rythmes)
const DRUM_NAMES = ['Kick', 'Snare', 'Hat', 'Hat ouvert', 'Clap', 'Tom H', 'Tom M', 'Tom L'];
const DRUM_ABBR  = ['K', 'S', 'H', 'Ho', 'C', 'TH', 'TM', 'TL'];
// Couleurs accent (CSS color strings) par piste
const DRUM_HUE = [
  '#e07b2a', '#d4c44a', '#7ab8e0', '#5ba8d8',
  '#c27ae0', '#e08a7a', '#e06a4a', '#c84a28',
];

/* ---- Helpers ------------------------------------------------------------ */
const _b  = (s) => s.split('').map((c) => c === '1');
const _E  = () => Array(32).fill(false);
// 🎓 Les anciens patterns 16 pas restent valides : on les rejoue tels quels
// sur les deux moitiés du cycle de 32 pas (même rythme, juste plus de résolution).
const _x2 = (s16) => _b(s16 + s16);

/* ---- Patterns de batterie (steps uniquement, appliqués sur le pattern) -- */
const DRUM_PRESETS = {
  'Vide': Array(8).fill(null).map(_E),

  // 🎓 4/4 classique : kick sur les temps 1 et 3, snare sur 2 et 4,
  // hat en croches (toutes les 2 doubles-croches = 8 hits par mesure).
  '4/4': [
    _x2('1000000010000000'), // Kick
    _x2('0000100000001000'), // Snare
    _x2('1010101010101010'), // Hat
    _E(), _E(), _E(), _E(), _E(),
  ],

  // 🎓 Trap : kick syncopé, hat en doubles-croches (hi-hat rapide), snare sur le 3.
  'Trap': [
    _x2('1000100100000100'), // Kick syncopé
    _x2('0000000010000000'), // Snare sur le 3
    _x2('1111111111111111'), // Hat tout (doubles-croches)
    _x2('0000001000000010'), // Hat ouvert (off-beats)
    _E(), _E(), _E(), _E(),
  ],

  // 🎓 Afro : feel Afrobeat — le son clave 3-2 (positions 0,3,6,10,12 sur 16)
  // est ici porté par la piste Clap, faute de piste Clave dédiée dans ce kit réduit.
  'Afro': [
    _x2('1000100000101000'), // Kick
    _x2('0000100000001000'), // Snare
    _x2('1010101010101010'), // Hat en croches
    _E(),
    _x2('1001001000101000'), // Clap = clave 3-2 son
    _E(), _E(), _E(),
  ],

  // 🎓 Bossa nova : hat avec le pattern caractéristique 1-0-1-1-0-1-0-1 (×2).
  'Bossa': [
    _x2('1000100000001000'), // Kick bossa
    _x2('0000000100000001'), // Snare léger (brushes)
    _x2('1011010110110101'), // Hat bossa pattern
    _E(), _E(), _E(), _E(), _E(),
  ],
};

/* ---- Pattern par défaut (8 pistes × 32 pas) ----------------------------- */
const DRUM_DEFAULT = {
  steps: [
    _x2('1000000010000000'), // Kick
    _x2('0000100000001000'), // Snare
    _x2('1010101010101010'), // Hat
    ...Array(5).fill(null).map(_E),
  ],
  vols:  [0.85, 0.72, 0.48, 0.55, 0.60, 0.65, 0.65, 0.65],
  mutes: Array(8).fill(false),
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

  /* ---- Wrap matrice en vue Batterie (override sizing fixe de .lif-matrix) */
  .lif-bat-mwrap {
    /* Taille carrée imposée en pixels via JS (squareSize) — voir BatterieView */
    flex-shrink: 0;
    box-sizing: border-box;
  }
  .lif-bat-mwrap .lif-matrix-bezel {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }
  .lif-bat-mwrap .lif-matrix {
    width: 100% !important;
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

/* ---- Grille des pistes (8 rangées × 32 pas) ----------------------------- */
function DrumMachine({ pattern, onChange, playStep, playing }) {
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
                  playing && playStep === step ? 'is-playing' : '',
                  step > 0 && step % 8 === 0 ? 'is-beat-start' : '',
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
function DrumPanel({ pattern, onChange, playStep, playing }) {
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
          playStep={playStep}
          playing={playing}
        />
      </div>
    </>
  );
}

/* ---- Vue Batterie : matrice 16×16 (8 pistes × 32 pas, 2 bandes empilées) - */
// 🎓 Chaque piste occupe deux lignes physiques de la matrice (bande "haut" =
// pas 0-15, bande "bas" = pas 16-31) — d'où le panneau de réglages à 8 lignes,
// chacune deux fois plus haute, alignée sur sa paire de bandes.
function BatterieView({ ctx }) {
  const { drumPattern, setDrumPattern, paintDrum, playing, drumStep, p, set } = ctx;

  // 🎓 La matrice doit rester carrée ET sa hauteur doit piloter celle du
  // panneau de labels (pour que les 16 lignes restent alignées sur les 2
  // bandes). CSS seul ne peut pas dériver une hauteur depuis l'espace
  // restant après soustraction d'une largeur fixe → on mesure en JS
  // (ResizeObserver) et on impose la taille carrée en pixels aux deux.
  const LABEL_W = 88, GAP = 12;
  const rowRef = React.useRef(null);
  const [squareSize, setSquareSize] = React.useState(0);
  React.useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSquareSize(Math.max(0, Math.min(r.height, r.width - LABEL_W - GAP)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sl = {
    WebkitAppearance: 'none', appearance: 'none',
    height: 3, borderRadius: 2, outline: 'none', cursor: 'pointer',
    background: 'rgba(255,255,255,.12)',
  };

  const toggleMute = (track) =>
    setDrumPattern({ ...drumPattern, mutes: drumPattern.mutes.map((m, t) => t === track ? !m : m) });
  const setVol = (track, vol) =>
    setDrumPattern({ ...drumPattern, vols: drumPattern.vols.map((v, t) => t === track ? vol : v) });

  // Occupe tout l'espace disponible du stage (100vw − 48px × 100vh − 84px)
  return (
    <div style={{
      width: 'calc(100vw - 48px)',
      height: 'calc(100vh - 84px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 8, padding: '8px 12px', boxSizing: 'border-box',
    }}>

      {/* ---- En-tête : titre + swing + vol drums + presets ------------------ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 14, flexWrap: 'wrap', flexShrink: 0, width: '100%', maxWidth: 760,
        borderBottom: '1px solid rgba(255,255,255,.06)', paddingBottom: 8,
      }}>
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

        {Object.keys(DRUM_PRESETS).map((name) => (
          <button key={name} className="lif-drum-preset"
            onClick={() => setDrumPattern({ ...drumPattern, steps: DRUM_PRESETS[name].map((r) => [...r]) })}>
            {name}
          </button>
        ))}
      </div>

      {/* ---- Zone principale : centrée, labels pistes + matrice carrée ------ */}
      {/* flex: 1 + min-height: 0 → la zone remplit l'espace restant sans déborder */}
      <div ref={rowRef} style={{
        flex: 1, minHeight: 0, width: '100%', maxWidth: 760,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: GAP,
      }}>

        {/* Labels pistes : 16 lignes calquées sur les 2 bandes de la matrice —
            🎓 ligne i affiche la piste (i % 8), exactement comme drumCellToTrackStep.
            Bande haut (i<8) : contrôles complets ; bande bas (i>=8) : juste le
            repère de piste, atténué, pour rappeler "même piste, 2e moitié".
            Hauteur imposée en pixels (= taille de la matrice) pour garantir
            l'alignement ligne à ligne — voir mesure ResizeObserver ci-dessus. */}
        <div style={{
          display: 'grid', gridTemplateRows: 'repeat(16, 1fr)',
          width: LABEL_W, height: squareSize || '100%', flexShrink: 0,
        }}>
          {Array.from({ length: 16 }, (_, i) => {
            const t = i % 8;
            const isTop = i < 8;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '0 4px', borderBottom: '1px solid rgba(255,255,255,.03)',
                opacity: isTop ? 1 : 0.4,
              }}>
                {isTop ? (
                  <>
                    <button onClick={() => toggleMute(t)} style={{
                      width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                      border: `1px solid ${drumPattern.mutes[t] ? 'rgba(217,83,79,.6)' : 'rgba(255,255,255,.15)'}`,
                      background: drumPattern.mutes[t] ? 'rgba(217,83,79,.25)' : 'rgba(255,255,255,.05)',
                      color: drumPattern.mutes[t] ? '#d9534f' : 'var(--text-dim)',
                      fontSize: 7, cursor: 'pointer', display: 'grid', placeItems: 'center',
                    }}>M</button>

                    <span style={{ color: DRUM_HUE[t], fontSize: 9, fontFamily: 'Space Mono',
                                   fontWeight: 700, width: 16, flexShrink: 0, lineHeight: 1 }}>
                      {DRUM_ABBR[t]}
                    </span>

                    <input type="range" min="0" max="1" step="0.01"
                      value={drumPattern.vols[t] ?? 0.65}
                      style={{ ...sl, width: 28, flexShrink: 0 }}
                      onChange={(e) => setVol(t, parseFloat(e.target.value))} />
                  </>
                ) : (
                  <span style={{ color: DRUM_HUE[t], fontSize: 8, fontFamily: 'Space Mono',
                                 fontWeight: 700, lineHeight: 1, paddingLeft: 17 }}>
                    {DRUM_ABBR[t]} ↳
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Matrice : carrée, taille en pixels imposée (cf. mesure ci-dessus)
            pour rester en phase avec le panneau de labels ligne à ligne. */}
        <div className="lif-bat-mwrap"
          style={squareSize ? { width: squareSize, height: squareSize } : undefined}>
          <window.Matrix
            grid={window.emptyGrid()} gen={0} pitches={[]}
            brightness={p.brightness} bloom={1} warm={false}
            playCol={-1} playing={playing}
            drumStep={playing ? drumStep : -1}
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
