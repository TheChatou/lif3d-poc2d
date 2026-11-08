/* =========================================================================
   LIF2D — Contrôleurs physiques (acier brossé / accents laiton).
   RotaryPot · Slider · Encoder · PushButton · DrawWheel · Speaker · Screw
   ========================================================================= */
const { useState, useRef, useEffect, useCallback } = React;

/* petit util : capture le pointeur et renvoie les deltas pendant le drag */
function useDrag(onMove, onStart, onEnd) {
  return useCallback((e) => {
    e.preventDefault();
    const el = e.currentTarget;
    const sx = e.clientX, sy = e.clientY;
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    onStart && onStart();
    const move = (ev) => onMove(ev.clientX - sx, sy - ev.clientY, ev);
    const up = (ev) => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      onEnd && onEnd();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  }, [onMove, onStart, onEnd]);
}

/* ---- Vis décorative ----------------------------------------------------- */
function Screw({ size = 11, angle = 30 }) {
  return (
    <div className="lif-screw" style={{ width: size, height: size }}>
      <div className="lif-screw-slot" style={{ transform: `rotate(${angle}deg)` }} />
    </div>
  );
}

/* ---- Potentiomètre rotatif (0..1, course 270°) -------------------------- */
function RotaryPot({ label, value = 0.5, onChange, display, size = 74, accent = true }) {
  const v = Math.max(0, Math.min(1, value));
  const ang = -135 + v * 270;
  const start = useRef(0);
  const onMove = (dx, dy) => onChange && onChange(Math.max(0, Math.min(1, start.current + dy / 180)));
  const down = useDrag(onMove, () => { start.current = v; });
  const r = size / 2;
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const a = (-135 + i * 27) * Math.PI / 180;
    const r1 = r - 1, r2 = r - 5;
    ticks.push(
      <line key={i} x1={r + Math.sin(a) * r2} y1={r - Math.cos(a) * r2}
        x2={r + Math.sin(a) * r1} y2={r - Math.cos(a) * r1}
        stroke="rgba(214,194,150,.55)" strokeWidth={i % 5 === 0 ? 1.6 : 1} />
    );
  }
  const arcR = r - 3;
  const a0 = -135 * Math.PI / 180, a1 = ang * Math.PI / 180;
  const large = (a1 - a0) > Math.PI ? 1 : 0;
  const arc = `M ${r + Math.sin(a0) * arcR} ${r - Math.cos(a0) * arcR} A ${arcR} ${arcR} 0 ${large} 1 ${r + Math.sin(a1) * arcR} ${r - Math.cos(a1) * arcR}`;
  return (
    <div className="lif-ctrl">
      <div className="lif-pot" style={{ width: size, height: size }} onPointerDown={down}>
        <svg width={size} height={size} className="lif-pot-dial">
          {ticks}
          {accent && <path d={arc} fill="none" stroke="var(--brass)" strokeWidth="2.4" strokeLinecap="round" />}
        </svg>
        <div className="lif-knob" style={{ inset: 8, transform: `rotate(${ang}deg)` }}>
          <span className="lif-knob-line" />
        </div>
      </div>
      {label && <div className="lif-label">{label}</div>}
      {display !== undefined && <div className="lif-readout">{display}</div>}
    </div>
  );
}

/* ---- Slider linéaire (fader vertical) ----------------------------------- */
function Slider({ label, value = 0.5, onChange, display, height = 132 }) {
  const v = Math.max(0, Math.min(1, value));
  const start = useRef(0);
  const onMove = (dx, dy) => onChange && onChange(Math.max(0, Math.min(1, start.current + dy / (height - 28))));
  const down = useDrag(onMove, () => { start.current = v; });
  return (
    <div className="lif-ctrl">
      <div className="lif-fader" style={{ height }} onPointerDown={down}>
        <div className="lif-fader-track" />
        <div className="lif-fader-fill" style={{ height: `${v * 100}%` }} />
        <div className="lif-fader-cap" style={{ bottom: `calc(${v * 100}% - 11px)` }}>
          <span /><span /><span />
        </div>
      </div>
      {label && <div className="lif-label">{label}</div>}
      {display !== undefined && <div className="lif-readout">{display}</div>}
    </div>
  );
}

/* ---- Encodeur cranté (rotation infinie + clic) -------------------------- */
function Encoder({ label, display, onStep, onClick, size = 66 }) {
  const acc = useRef(0);
  const [ang, setAng] = useState(0);
  const moved = useRef(false);
  const onMove = (dx, dy) => {
    moved.current = moved.current || Math.abs(dy) > 3;
    acc.current += dy;
    setAng((a) => a + dy * 0.9);
    const STEP = 16;
    while (acc.current >= STEP) { acc.current -= STEP; onStep && onStep(1); }
    while (acc.current <= -STEP) { acc.current += STEP; onStep && onStep(-1); }
  };
  const down = useDrag(onMove, () => { moved.current = false; }, () => { if (!moved.current) onClick && onClick(); });
  const detents = [];
  for (let i = 0; i < 24; i++) detents.push(<span key={i} style={{ transform: `rotate(${i * 15}deg)` }} />);
  return (
    <div className="lif-ctrl">
      <div className="lif-enc" style={{ width: size, height: size }} onPointerDown={down}>
        <div className="lif-enc-ring" />
        <div className="lif-knob lif-knob-enc" style={{ inset: 9, transform: `rotate(${ang}deg)` }}>
          <div className="lif-enc-detents">{detents}</div>
          <span className="lif-enc-dimple" />
        </div>
      </div>
      {label && <div className="lif-label">{label}</div>}
      {display !== undefined && <div className="lif-readout">{display}</div>}
    </div>
  );
}

/* ---- Bouton poussoir ---------------------------------------------------- */
function PushButton({ label, active, color = 'var(--brass)', onClick, big = false }) {
  return (
    <div className="lif-ctrl">
      <button className={`lif-btn ${active ? 'is-on' : ''} ${big ? 'is-big' : ''}`} onClick={onClick}
        style={{ '--btn-led': color }}>
        <span className="lif-btn-led" />
      </button>
      {label && <div className="lif-label">{label}</div>}
    </div>
  );
}

/* ---- Molette « ardoise magique » (thumbwheel X ou Y) -------------------- */
function DrawWheel({ axis = 'x', onStep, label }) {
  const horizontal = axis === 'x';
  const [off, setOff] = useState(0);
  const acc = useRef(0);
  const onMove = (dx, dy) => {
    const d = horizontal ? dx : -dy;          // Y : vers le haut = +
    setOff((o) => (o + (horizontal ? dx : dy)));
    acc.current += d;
    const STEP = 22;
    while (acc.current >= STEP) { acc.current -= STEP; onStep && onStep(1); }
    while (acc.current <= -STEP) { acc.current += STEP; onStep && onStep(-1); }
  };
  const down = useDrag(onMove, () => {});
  const ridge = horizontal
    ? `repeating-linear-gradient(90deg, rgba(0,0,0,.55) 0 1px, rgba(255,255,255,.10) 1px 3px, rgba(0,0,0,.30) 3px 7px)`
    : `repeating-linear-gradient(0deg, rgba(0,0,0,.55) 0 1px, rgba(255,255,255,.10) 1px 3px, rgba(0,0,0,.30) 3px 7px)`;
  return (
    <div className="lif-ctrl">
      <div className={`lif-wheel ${horizontal ? 'is-x' : 'is-y'}`} onPointerDown={down}>
        <div className="lif-wheel-surf"
          style={{ backgroundImage: ridge, backgroundPosition: horizontal ? `${off}px 0` : `0 ${off}px` }} />
        <div className="lif-wheel-shade" />
      </div>
      {label && <div className="lif-label">{label}</div>}
    </div>
  );
}

/* ---- Haut-parleur 28 mm ------------------------------------------------- */
function Speaker({ active }) {
  return (
    <div className={`lif-speaker ${active ? 'is-live' : ''}`}>
      <div className="lif-speaker-grille" />
      <div className="lif-speaker-dust" />
    </div>
  );
}

/* ---- Switch à bascule (vue Machine / Expert) ---------------------------- */
function Toggle({ on, onChange, labels = ['', ''] }) {
  return (
    <button className={`lif-toggle ${on ? 'is-on' : ''}`} onClick={() => onChange(!on)}>
      <span className="lif-toggle-lbl">{labels[0]}</span>
      <span className="lif-toggle-track"><span className="lif-toggle-thumb" /></span>
      <span className="lif-toggle-lbl">{labels[1]}</span>
    </button>
  );
}

Object.assign(window, { Screw, RotaryPot, Slider, Encoder, PushButton, DrawWheel, Speaker, Toggle, useDrag });
