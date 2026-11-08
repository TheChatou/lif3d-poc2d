/* ============================================================
   LIF2D — controls.jsx  ·  atomes UI réutilisables
   ============================================================ */
const { useState, useRef, useEffect, useCallback } = React;

/* ---- valeur numérique éditable ---------------------------- */
function EditableVal({ value, unit, onCommit, width }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef(null);
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select(); } }, [editing]);
  if (editing) {
    return (
      <input
        ref={ref}
        className="ctl-val editable"
        style={width ? { minWidth: width } : null}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { commit(); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { commit(); }
          if (e.key === "Escape") { setEditing(false); }
          e.stopPropagation();
        }}
      />
    );
    function commit() {
      const n = parseFloat(draft);
      if (!Number.isNaN(n)) onCommit(n);
      setEditing(false);
    }
  }
  return (
    <span
      className="ctl-val editable"
      style={width ? { minWidth: width, cursor: "text" } : { cursor: "text" }}
      title="Cliquer pour éditer"
      onClick={() => { setDraft(String(value)); setEditing(true); }}
    >
      {value}{unit ? <span style={{ opacity: .55, marginLeft: 1 }}>{unit}</span> : null}
    </span>
  );
}

/* ---- slider paramétrique ---------------------------------- */
function ParamSlider({ label, value, min = 0, max = 100, step = 1, unit = "", onChange, display }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="ctl">
      <div className="ctl-row">
        <span className="ctl-label">{label}</span>
        {display
          ? <span className="ctl-val">{display}</span>
          : <EditableVal value={value} unit={unit} onCommit={(n) => onChange(clamp(n, min, max))} />}
      </div>
      <input
        className="slider" type="range" min={min} max={max} step={step} value={value}
        style={{ "--fill": pct + "%" }}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

/* ---- select ----------------------------------------------- */
function ParamSelect({ label, value, options, onChange, inline = true }) {
  const sel = (
    <div className="ctl-select">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span className="caret">▼</span>
    </div>
  );
  if (!label) return sel;
  return (
    <div className="field">
      <span className="ctl-label">{label}</span>
      {sel}
    </div>
  );
}

/* ---- toggle ----------------------------------------------- */
function LToggle({ label, value, onChange }) {
  const t = (
    <div
      className={"toggle" + (value ? " on" : "")}
      tabIndex={0} role="switch" aria-checked={value}
      onClick={() => onChange(!value)}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(!value); } }}
    />
  );
  if (!label) return t;
  return (
    <div className="field">
      <span className="ctl-label">{label}</span>
      {t}
    </div>
  );
}

/* ---- stepper (octave etc.) -------------------------------- */
function Stepper({ label, value, min, max, onChange, fmt }) {
  return (
    <div className="field">
      <span className="ctl-label">{label}</span>
      <div className="stepper">
        <button onClick={() => onChange(clamp(value - 1, min, max))} aria-label="−">−</button>
        <span className="sval">{fmt ? fmt(value) : value}</span>
        <button onClick={() => onChange(clamp(value + 1, min, max))} aria-label="+">+</button>
      </div>
    </div>
  );
}

/* ---- segmented -------------------------------------------- */
function Seg({ value, options, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

/* ---- bouton ----------------------------------------------- */
function Btn({ children, onClick, primary, warn, className = "", title }) {
  return (
    <button
      className={"btn" + (primary ? " primary" : "") + (warn ? " warn" : "") + " " + className}
      onClick={onClick} title={title}
    >{children}</button>
  );
}

/* ---- style pad -------------------------------------------- */
function StylePad({ style, active, onClick }) {
  return (
    <button
      className={"style-pad" + (active ? " on" : "")}
      style={{ "--sc": style.color }}
      onClick={onClick}
    >
      <div className="sp-top">
        <span className="sp-dot" />
        <span className="sp-name">{style.name}</span>
      </div>
      <span className="sp-blurb">{style.blurb}</span>
    </button>
  );
}

/* ============================================================
   MATRIX VIEW (hub)
   ============================================================ */
function MatrixView({ grid, scanCol, clickable, cellColor, onPaint }) {
  const painting = useRef(null); // 0 | 1 | null
  useEffect(() => {
    const up = () => { painting.current = null; };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);
  const cells = [];
  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      const live = grid[r][c];
      const isScan = scanCol === c;
      const col = cellColor ? cellColor(r, c, live) : null;
      cells.push(
        <div
          key={r + "_" + c}
          className={"cell" + (live ? " live" : "") + (isScan ? " scan" : "")}
          style={col ? { "--cell": col } : null}
          onMouseDown={(e) => {
            if (!clickable) return;
            e.preventDefault();
            painting.current = live ? 0 : 1;
            onPaint(r, c, painting.current);
          }}
          onMouseEnter={() => {
            if (!clickable || painting.current === null) return;
            onPaint(r, c, painting.current);
          }}
        />
      );
    }
  }
  return (
    <div className={"matrix-screen" + (clickable ? " clickable" : "")}>
      {cells}
      {scanCol >= 0 && (
        <div
          className="scan-col"
          style={{ left: `calc(8px + ${scanCol} * (100% - 16px) / 16)`, width: `calc((100% - 16px) / 16)` }}
        />
      )}
    </div>
  );
}

/* ---- pad bank (presets dans la matrice) ------------------- */
function PadBank({ slots, accent, onLoad, onSave, onRename }) {
  const [renaming, setRenaming] = useState(-1);
  const [draft, setDraft] = useState("");
  return (
    <div className="pad-screen">
      {slots.map((s, i) => {
        const filled = !!s;
        return (
          <button
            key={i}
            className={"pad" + (filled ? " filled" : "")}
            style={filled ? { "--pad-col": s.color } : null}
            onClick={(e) => {
              if (e.shiftKey) { onSave(i); return; }
              if (filled) onLoad(i);
              else onSave(i);
            }}
            onDoubleClick={() => { if (filled) { setDraft(s.name); setRenaming(i); } }}
            title={filled ? "Clic: charger · Shift+clic: écraser · Double-clic: renommer" : "Clic ou Shift+clic: sauvegarder ici"}
          >
            <span className="pad-idx">{String(i + 1).padStart(2, "0")}</span>
            {filled ? (
              renaming === i ? (
                <input
                  className="pad-name-input"
                  autoFocus
                  maxLength={8}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => { onRename(i, draft); setRenaming(-1); }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") { onRename(i, draft); setRenaming(-1); }
                    if (e.key === "Escape") setRenaming(-1);
                  }}
                />
              ) : (
                <span className="pad-name">{s.name}</span>
              )
            ) : (
              <span className="pad-plus">+</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---- drum grid 32 pas (2 bancs empilés dans la matrice) --- */
function DrumGrid({ tracks, pattern, scanCol, mutes, onToggle }) {
  // pattern : 8 pistes × 32 pas. Banc haut = pas 0-15, banc bas = 16-31.
  const Band = ({ offset, tag }) => (
    <div className="drum-band">
      <div className="drum-band-tag">{tag}</div>
      {tracks.map((t, ti) => (
        <div className="drum-row" key={t.id + offset}>
          <div className="drum-name" style={{ color: mutes[ti] ? "#5a4632" : t.color }}>{t.id}</div>
          <div className="drum-steps">
            {Array.from({ length: 16 }, (_, j) => {
              const si = offset + j;
              const on = pattern[ti][si];
              return (
                <div
                  key={si}
                  className={"drum-step" + (on ? " on" : "") + (j % 4 === 0 ? " beat" : "") + (scanCol === si ? " scan" : "")}
                  style={on ? { "--dcol": mutes[ti] ? "#5a4632" : t.color } : null}
                  onClick={() => onToggle(ti, si)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
  return (
    <div className="drum32">
      <Band offset={0} tag="1 — 16" />
      <div className="drum-band-div" />
      <Band offset={16} tag="17 — 32" />
    </div>
  );
}

/* ---- transport pieces ------------------------------------- */
function PlayButton({ playing, onClick }) {
  return (
    <button className={"play-btn" + (playing ? " playing" : "")} onClick={onClick} title="Espace">
      {playing ? (
        <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z" /></svg>
      )}
    </button>
  );
}

function Lcd({ label, value, unit }) {
  return (
    <div className="lcd">
      <span className="lcd-label">{label}</span>
      <span className="lcd-val">{value}</span>
      <span className="lcd-unit">{unit}</span>
    </div>
  );
}

/* ---- help overlay ----------------------------------------- */
const SHORTCUTS = [
  ["Espace", "Play / Pause"],
  ["R", "Reset (relancer la forme)"],
  ["C", "Clear (vider la grille)"],
  ["N", "Nouvelle graine aléatoire"],
  ["1 / 2", "Play · GoL / Drum"],
  ["3 / 4 / 5", "Presets · GoL / Drum / Sons"],
  ["← / →", "BPM −/+"],
  ["↑ / ↓", "Octave +/−"],
  ["S", "Sauver (aller aux presets)"],
  ["[ / ]", "Style précédent / suivant"],
  ["?", "Afficher / cacher cette aide"],
];
function HelpOverlay({ onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="help-card" onClick={(e) => e.stopPropagation()}>
        <h2>Raccourcis clavier</h2>
        <div className="help-sub">LIF2D · Sim Pure</div>
        <div className="help-grid">
          {SHORTCUTS.map(([k, d]) => (
            <div className="hk" key={k}><span>{d}</span><kbd>{k}</kbd></div>
          ))}
        </div>
        <Btn className="help-close" onClick={onClose}>Fermer (Échap)</Btn>
      </div>
    </div>
  );
}

Object.assign(window, {
  EditableVal, ParamSlider, ParamSelect, LToggle, Stepper, Seg, Btn,
  StylePad, MatrixView, PadBank, DrumGrid, PlayButton, Lcd, HelpOverlay, clamp,
});
