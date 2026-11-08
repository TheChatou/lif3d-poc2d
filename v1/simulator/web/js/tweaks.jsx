/* ==========================================================================
   LIF2D — Panneau Tweaks (paramètres de rendu et de simulation).
   Panneau flottant draggable, bas-droite. Contrôles : slider, radio/seg, toggle.
   ========================================================================== */

const __TWEAKS_CSS = `
  .twk-panel {
    position: fixed; right: 16px; bottom: 16px; z-index: 200;
    width: 264px; max-height: calc(100vh - 32px);
    display: flex; flex-direction: column;
    background: rgba(28,24,20,.92);
    backdrop-filter: blur(18px) saturate(150%);
    -webkit-backdrop-filter: blur(18px) saturate(150%);
    border: 1px solid rgba(201,164,76,.18);
    border-radius: 12px;
    box-shadow: 0 16px 40px rgba(0,0,0,.55), 0 0 0 1px rgba(0,0,0,.4);
    font: 11.5px/1.4 'Barlow Condensed', system-ui, sans-serif;
    overflow: hidden; color: var(--text);
  }
  .twk-hd {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 10px 10px 14px; cursor: move; user-select: none;
    border-bottom: 1px solid rgba(255,255,255,.06);
  }
  .twk-hd b {
    font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600;
    letter-spacing: .12em; text-transform: uppercase; color: var(--brass);
  }
  .twk-x {
    appearance: none; border: 0; background: transparent;
    color: var(--text-dim); width: 22px; height: 22px;
    border-radius: 6px; cursor: pointer; font-size: 13px; line-height: 1;
  }
  .twk-x:hover { background: rgba(255,255,255,.08); color: var(--text); }
  .twk-body {
    padding: 10px 14px 14px; display: flex; flex-direction: column; gap: 11px;
    overflow-y: auto; overflow-x: hidden; min-height: 0;
    scrollbar-width: thin; scrollbar-color: rgba(201,164,76,.2) transparent;
  }
  .twk-body::-webkit-scrollbar { width: 4px; }
  .twk-body::-webkit-scrollbar-thumb {
    background: rgba(201,164,76,.25); border-radius: 2px;
  }
  .twk-sect {
    font-size: 10px; font-weight: 700; letter-spacing: .12em;
    text-transform: uppercase; color: var(--brass-dim); padding-top: 6px;
  }
  .twk-sect:first-child { padding-top: 0; }
  .twk-row { display: flex; flex-direction: column; gap: 5px; }
  .twk-lbl {
    display: flex; justify-content: space-between; align-items: baseline;
    color: var(--text-dim); font-size: 11.5px;
  }
  .twk-lbl > span:first-child { font-weight: 600; }
  .twk-val { color: var(--brass); font-family: 'Space Mono', monospace; font-size: 10px; }
  .twk-slider {
    -webkit-appearance: none; appearance: none;
    width: 100%; height: 4px; border-radius: 2px;
    background: rgba(255,255,255,.1); outline: none; cursor: pointer;
  }
  .twk-slider::-webkit-slider-thumb {
    -webkit-appearance: none; width: 13px; height: 13px; border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, var(--steel-hi), var(--steel-0));
    box-shadow: 0 1px 3px rgba(0,0,0,.6), 0 0 0 1px rgba(201,164,76,.3);
    cursor: default;
  }
  .twk-slider::-moz-range-thumb {
    width: 13px; height: 13px; border: none; border-radius: 50%;
    background: var(--steel-hi); box-shadow: 0 1px 3px rgba(0,0,0,.6);
  }
  .twk-seg {
    display: flex; border-radius: 6px; overflow: hidden;
    background: rgba(0,0,0,.4); box-shadow: inset 0 1px 2px rgba(0,0,0,.5);
  }
  .twk-seg button {
    flex: 1; border: none; background: transparent; cursor: pointer;
    color: var(--text-dim); font-family: 'Barlow Condensed'; font-weight: 600;
    font-size: 11px; letter-spacing: .05em; text-transform: uppercase;
    padding: 5px 6px; transition: background .13s, color .13s;
  }
  .twk-seg button.is-on {
    background: linear-gradient(180deg, var(--brass), var(--brass-dim));
    color: var(--ink); text-shadow: 0 1px 0 rgba(255,255,255,.2);
  }
  .twk-toggle {
    position: relative; width: 34px; height: 18px; border: none; border-radius: 9px;
    background: rgba(255,255,255,.12); cursor: pointer; padding: 0;
    transition: background .15s;
  }
  .twk-toggle[data-on="1"] { background: var(--brass-deep); }
  .twk-toggle i {
    position: absolute; top: 2px; left: 2px; width: 14px; height: 14px;
    border-radius: 50%;
    background: linear-gradient(180deg, var(--steel-hi), var(--steel-0));
    box-shadow: 0 1px 2px rgba(0,0,0,.5);
    transition: transform .15s cubic-bezier(.4,1.3,.5,1);
  }
  .twk-toggle[data-on="1"] i { transform: translateX(16px); }
  .twk-row-h { flex-direction: row; align-items: center; justify-content: space-between; gap: 10px; }
`;

/* ---- useTweaks hook ------------------------------------------------------ */
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  const setTweak = React.useCallback((keyOrObj, val) => {
    const edits = (typeof keyOrObj === 'object' && keyOrObj !== null)
      ? keyOrObj : { [keyOrObj]: val };
    setValues((prev) => ({ ...prev, ...edits }));
  }, []);
  return [values, setTweak];
}

/* ---- TweaksPanel --------------------------------------------------------- */
function TweaksPanel({ title = 'Tweaks', children }) {
  const [open, setOpen] = React.useState(false);
  const panelRef = React.useRef(null);
  const offsetRef = React.useRef({ x: 16, y: 16 });

  const clamp = React.useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const maxX = Math.max(16, window.innerWidth  - panel.offsetWidth  - 16);
    const maxY = Math.max(16, window.innerHeight - panel.offsetHeight - 16);
    offsetRef.current = {
      x: Math.min(maxX, Math.max(16, offsetRef.current.x)),
      y: Math.min(maxY, Math.max(16, offsetRef.current.y)),
    };
    panel.style.right  = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);

  React.useEffect(() => {
    if (!open) return;
    clamp();
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, [open, clamp]);

  const startDrag = (e) => {
    const panel = panelRef.current;
    if (!panel) return;
    const r  = panel.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const sr = window.innerWidth  - r.right;
    const sb = window.innerHeight - r.bottom;
    const move = (ev) => {
      offsetRef.current = { x: sr - (ev.clientX - sx), y: sb - (ev.clientY - sy) };
      clamp();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup',   up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup',   up);
  };

  return (
    <>
      <style>{__TWEAKS_CSS}</style>
      {/* Bouton d'ouverture fixe */}
      <button onClick={() => setOpen((v) => !v)} style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 201,
        background: 'rgba(28,24,20,.88)',
        border: '1px solid rgba(201,164,76,.22)',
        color: 'var(--brass-dim)',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 700, fontSize: 10,
        letterSpacing: '.12em', textTransform: 'uppercase',
        padding: '6px 10px', borderRadius: 7, cursor: 'pointer',
        display: open ? 'none' : 'block',
      }}>Tweaks ⚙</button>

      {open && (
        <div ref={panelRef} className="twk-panel"
             style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}>
          <div className="twk-hd" onMouseDown={startDrag}>
            <b>{title}</b>
            <button className="twk-x" onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="twk-body">{children}</div>
        </div>
      )}
    </>
  );
}

/* ---- Helpers de contenu -------------------------------------------------- */
function TweakSection({ label }) {
  return <div className="twk-sect">{label}</div>;
}

function TweakSlider({ label, value, min = 0, max = 100, step = 1, unit = '', onChange }) {
  return (
    <div className="twk-row">
      <div className="twk-lbl">
        <span>{label}</span>
        <span className="twk-val">{value}{unit}</span>
      </div>
      <input type="range" className="twk-slider"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function TweakToggle({ label, value, onChange }) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl"><span>{label}</span></div>
      <button type="button" className="twk-toggle"
        data-on={value ? '1' : '0'} onClick={() => onChange(!value)}>
        <i />
      </button>
    </div>
  );
}

function TweakRadio({ label, value, options, onChange }) {
  const opts = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  return (
    <div className="twk-row">
      <div className="twk-lbl"><span>{label}</span></div>
      <div className="twk-seg">
        {opts.map((o) => (
          <button key={o.value}
            className={value === o.value ? 'is-on' : ''}
            onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakToggle, TweakRadio,
});
