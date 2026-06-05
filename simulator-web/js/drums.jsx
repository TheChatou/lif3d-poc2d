/* ==========================================================================
   LIF2D — Boîte à rythmes steampunk.
   Panneau fixe en bas, 5 pistes × 16 pas, swing, mute/volume par piste.
   La synthèse est dans audio.js (triggerDrum).
   ========================================================================== */

// Noms, abréviations et couleurs accent de chaque piste
const DRUM_NAMES = ['Kick', 'Snare', 'Hat', 'Clap', 'Tom'];
const DRUM_ABBR  = ['K', 'S', 'H', 'C', 'T'];
const DRUM_HUE   = ['#e07b2a', '#d4c44a', '#7ab8e0', '#c27ae0', '#7ae088'];

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
  }
  .lif-drum-panel.is-open { transform: translateY(0); }

  /* ---- En-tête du panneau ------------------------------------------------ */
  .lif-drum-hd {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 16px 7px;
    border-bottom: 1px solid rgba(255,255,255,.05);
  }
  .lif-drum-hd-left { display: flex; align-items: center; gap: 14px; }
  .lif-drum-title {
    font-family: 'Cinzel', serif; font-weight: 600; font-size: 12px;
    letter-spacing: .18em; text-transform: uppercase; color: var(--brass);
  }
  .lif-drum-close {
    appearance: none; border: 0; background: transparent;
    color: var(--text-dim); width: 26px; height: 26px;
    border-radius: 6px; cursor: pointer; font-size: 14px; line-height: 1;
  }
  .lif-drum-close:hover { background: rgba(255,255,255,.08); color: var(--text); }

  /* ---- Contrôles en-tête : swing ---------------------------------------- */
  .lif-drum-swing-row {
    display: flex; align-items: center; gap: 7px;
  }
  .lif-drum-swing-lbl {
    font-family: 'Barlow Condensed', sans-serif; font-size: 10px;
    letter-spacing: .12em; text-transform: uppercase; color: var(--text-dim);
  }
  .lif-drum-swing-slider {
    -webkit-appearance: none; appearance: none;
    width: 72px; height: 3px; border-radius: 2px;
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
    color: var(--brass); min-width: 28px;
  }

  /* ---- Grille des pistes ------------------------------------------------- */
  .lif-drum-body { padding: 7px 14px 11px; display: flex; flex-direction: column; gap: 4px; }

  .lif-drum-row { display: flex; align-items: center; gap: 7px; }

  /* En-tête de rangée : mute + abréviation + volume */
  .lif-drum-row-head {
    display: flex; align-items: center; gap: 5px;
    width: 80px; flex-shrink: 0;
  }
  .lif-drum-mute {
    width: 20px; height: 20px; border-radius: 4px; flex-shrink: 0;
    border: 1px solid rgba(255,255,255,.16);
    background: rgba(255,255,255,.05);
    color: var(--text-dim); font-size: 9px; font-weight: 700;
    font-family: 'Barlow Condensed', sans-serif;
    cursor: pointer; letter-spacing: .02em;
    transition: background .12s, color .12s, border-color .12s;
    line-height: 1; display: grid; place-items: center;
  }
  .lif-drum-mute.is-muted {
    background: rgba(217,83,79,.22); border-color: rgba(217,83,79,.5); color: #d9534f;
  }
  .lif-drum-abbr {
    font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700;
    letter-spacing: .04em; width: 14px; text-align: center; flex-shrink: 0;
  }
  .lif-drum-vol {
    -webkit-appearance: none; appearance: none;
    width: 34px; height: 3px; border-radius: 2px;
    background: rgba(255,255,255,.10); outline: none; cursor: pointer; flex-shrink: 0;
  }
  .lif-drum-vol::-webkit-slider-thumb {
    -webkit-appearance: none; width: 10px; height: 10px; border-radius: 50%;
    background: var(--steel-hi); box-shadow: 0 1px 2px rgba(0,0,0,.6); cursor: default;
  }

  /* ---- Grille des 16 pas ------------------------------------------------- */
  .lif-drum-steps { display: flex; gap: 3px; flex: 1; }

  /* 🎓 Séparateur tous les 4 pas = une noire. Marque les temps forts visuellement. */
  .lif-drum-step { flex: 1; height: 26px; border-radius: 4px; border: none; cursor: pointer; }
  .lif-drum-step.is-beat-start { margin-left: 4px; }

  /* Pas inactif : enfoncé, sombre */
  .lif-drum-step {
    background: rgba(255,255,255,.07);
    box-shadow: inset 0 1px 1px rgba(255,255,255,.05), inset 0 -1px 2px rgba(0,0,0,.5);
    transition: background .09s, box-shadow .09s;
  }
  /* Pas actif : éclairé de la couleur de la piste */
  .lif-drum-step.is-on {
    background: var(--step-color, var(--brass));
    box-shadow:
      0 0 7px var(--step-color, var(--brass)),
      inset 0 1px 1px rgba(255,255,255,.35),
      inset 0 -1px 2px rgba(0,0,0,.2);
  }
  /* Tête de lecture (colonne courante) */
  .lif-drum-step.is-playing {
    box-shadow: inset 0 0 0 1.5px rgba(255,240,180,.45), inset 0 0 6px rgba(255,240,180,.12);
  }
  .lif-drum-step.is-on.is-playing {
    box-shadow:
      0 0 11px var(--step-color, var(--brass)),
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

/* ---- Grille de la boîte à rythmes --------------------------------------- */
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
          {/* En-tête de piste */}
          <div className="lif-drum-row-head">
            <button
              className={`lif-drum-mute ${pattern.mutes[track] ? 'is-muted' : ''}`}
              onClick={() => toggleMute(track)}>M</button>
            <span className="lif-drum-abbr" style={{ color: DRUM_HUE[track] }}>
              {DRUM_ABBR[track]}
            </span>
            <input type="range" min="0" max="1" step="0.01"
              value={pattern.vols[track]}
              className="lif-drum-vol"
              onChange={(e) => setVol(track, parseFloat(e.target.value))} />
          </div>

          {/* 16 boutons-pas */}
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

/* ---- Wrapper collapsible (drawer bas pleine largeur) --------------------- */
function DrumPanel({ pattern, onChange, playCol, playing }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <style>{__DRUM_CSS}</style>

      {/* Bouton flottant bas-gauche */}
      <button
        className={`lif-drum-open-btn ${open ? 'is-active' : ''}`}
        onClick={() => setOpen((v) => !v)}>
        Batterie ♩
      </button>

      {/* Panneau drawer */}
      <div className={`lif-drum-panel ${open ? 'is-open' : ''}`}>
        <div className="lif-drum-hd">
          <div className="lif-drum-hd-left">
            <span className="lif-drum-title">Batterie</span>
            {/* 🎓 Swing : décale les pas impairs (off-beats) en avant,
                créant le feeling "groove" du jazz ou du hip-hop. */}
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

// Export global
window.DrumPanel  = DrumPanel;
window.DRUM_NAMES = DRUM_NAMES;
