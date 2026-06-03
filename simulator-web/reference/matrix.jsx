/* =========================================================================
   LIF2D — Matrice LED WS2812B 16×16 (rendu réaliste : point + halo diffusé).
   Teinte = note jouée · Intensité = âge de la cellule.
   ========================================================================= */
const { useState: useStateM, useRef: useRefM, memo } = React;

function ledStyle(age, hue, brightness, bloom) {
  const inten = 0.42 + 0.58 * Math.min(age / 4, 1);     // intensité ↑ avec l'âge
  const L = 52 + inten * 26;                            // lightness
  const b = brightness;                                 // luminosité matrice globale
  const core = `hsl(${hue} 92% ${L}% / ${0.92 * b})`;
  const mid = `hsl(${hue} 95% ${L - 6}% / ${0.55 * b})`;
  const glow = (4 + inten * 9) * bloom;
  const glow2 = (10 + inten * 20) * bloom;
  return {
    background: `radial-gradient(circle at 50% 42%, ${core} 0%, ${mid} 38%, hsl(${hue} 90% 30% / ${0.25 * b}) 70%, transparent 78%)`,
    boxShadow: `0 0 ${glow}px ${glow * 0.5}px hsl(${hue} 95% ${L}% / ${0.85 * b}),`
      + `0 0 ${glow2}px ${glow2 * 0.4}px hsl(${hue} 92% ${L - 4}% / ${0.5 * b})`,
  };
}

const Cells = memo(function Cells({ grid, pitches, brightness, bloom, warm }) {
  const cells = [];
  for (let y = 0; y < window.GRID; y++) {
    for (let x = 0; x < window.GRID; x++) {
      const age = grid[y][x];
      let st = null;
      if (age > 0) {
        const midi = window.rowToPitch(y, pitches);
        const base = window.noteHue(midi);
        // Ambre : on replie les teintes sur une bande chaude (rouge→or) steampunk
        const hue = warm ? Math.round(18 + (base / 360) * 62) : base;
        st = ledStyle(age, hue, brightness, bloom);
      }
      cells.push(
        <div key={y * 16 + x} className="lif-cell" data-x={x} data-y={y}>
          <div className={`lif-led ${age > 0 ? 'is-on' : ''}`} style={st || undefined} />
        </div>
      );
    }
  }
  return <div className="lif-cells">{cells}</div>;
}, (a, b) => a.gen === b.gen && a.brightness === b.brightness && a.bloom === b.bloom && a.pitches === b.pitches && a.warm === b.warm);

function Matrix({ grid, gen, pitches, brightness = 1, bloom = 1, warm = false, playCol, cursor, drawMode, onPaint }) {
  const painting = useRefM(null);
  const ref = useRefM(null);

  function cellFromEvent(e) {
    const host = ref.current;
    if (!host) return null;
    const r = host.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * window.GRID);
    const y = Math.floor(((e.clientY - r.top) / r.height) * window.GRID);
    if (x < 0 || y < 0 || x >= window.GRID || y >= window.GRID) return null;
    return { x, y };
  }
  function down(e) {
    const c = cellFromEvent(e);
    if (!c) return;
    const erase = grid[c.y][c.x] > 0;
    painting.current = erase ? 'erase' : 'draw';
    onPaint(c.x, c.y, erase);
    try { ref.current.setPointerCapture(e.pointerId); } catch (err) {}
  }
  function move(e) {
    if (!painting.current) return;
    const c = cellFromEvent(e);
    if (!c) return;
    onPaint(c.x, c.y, painting.current === 'erase');
  }
  function up() { painting.current = null; }

  const cw = `calc(${100 / window.GRID}%)`;
  return (
    <div className="lif-matrix-bezel">
      <div className="lif-matrix-glass">
        <div className="lif-matrix" ref={ref}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}>
          <Cells grid={grid} gen={gen} pitches={pitches} brightness={brightness} bloom={bloom} warm={warm} />
          {/* tête de lecture (playhead) */}
          {playCol >= 0 && (
            <div className="lif-playhead" style={{ width: cw, transform: `translateX(${playCol * 100}%)` }} />
          )}
          {/* curseur ardoise magique */}
          {drawMode && cursor && (
            <div className="lif-cursor"
              style={{ width: cw, height: cw, transform: `translate(${cursor.x * 100}%, ${cursor.y * 100}%)` }} />
          )}
          <div className="lif-matrix-vignette" />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Matrix });
