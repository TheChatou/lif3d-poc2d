/* ==========================================================================
   LIF2D — Matrice LED 16×16.
   ledStyle : radial-gradient + box-shadow (teinte = note, intensité = âge).
   Cells : mémoïsé pour éviter les re-renders inutiles.
   Matrix : peinture au clic/glisser, playhead, curseur.
   ========================================================================== */

const { useRef: useRefM, memo, Fragment } = React;

/* ---- Rendu d'une LED individuelle ---------------------------------------- */
// age      : âge de la cellule (0 = morte, sinon >= 1)
// hue      : teinte HSL (0–360)
// brightness : luminosité globale de la matrice (0–1)
// bloom    : multiplicateur du halo (0.3–1.8)
function ledStyle(age, hue, brightness, bloom) {
  const inten = 0.42 + 0.58 * Math.min(age / 4, 1);  // 0.42..1.0 selon l'âge
  const L     = 52 + inten * 26;                      // lightness 52..78 %
  const b     = brightness;
  const core  = `hsl(${hue} 92% ${L}% / ${0.92 * b})`;
  const mid   = `hsl(${hue} 95% ${L - 6}% / ${0.55 * b})`;
  const glow  = (4  + inten * 9)  * bloom;
  const glow2 = (10 + inten * 20) * bloom;
  return {
    background: `radial-gradient(circle at 50% 42%, ${core} 0%, ${mid} 38%, hsl(${hue} 90% 30% / ${0.25 * b}) 70%, transparent 78%)`,
    boxShadow:
      `0 0 ${glow}px ${glow * 0.5}px hsl(${hue} 95% ${L}% / ${0.85 * b}), ` +
      `0 0 ${glow2}px ${glow2 * 0.4}px hsl(${hue} 92% ${L - 4}% / ${0.5 * b})`,
  };
}

/* ---- Style LED en mode Drum (couleur fixe par piste) -------------------- */
function drumLedStyle(trackIdx, brightness, bloom) {
  const color = window.DRUM_HUE ? window.DRUM_HUE[trackIdx] : '#c9a44c';
  const gw = 5 * bloom;
  return {
    background: color,
    opacity:    brightness * 0.92,
    boxShadow:  `0 0 ${gw}px ${color}, 0 0 ${gw * 2}px ${color}88`,
  };
}

/* ---- Rendu de toutes les cellules (mémoïsé sur gen + tweaks) ------------ */
const Cells = memo(function Cells({ grid, pitches, brightness, bloom, warm,
                                    drumMode, drumPattern }) {
  const cells = [];
  const G = window.GRID;

  if (drumMode && drumPattern) {
    // Mode Drum : row = piste, col = pas
    for (let y = 0; y < G; y++) {
      for (let x = 0; x < G; x++) {
        const on = !drumPattern.mutes[y] && (drumPattern.steps[y]?.[x] ?? false);
        cells.push(
          <div key={y * G + x} className="lif-cell" data-x={x} data-y={y}>
            <div className={`lif-led ${on ? 'is-on' : ''}`}
                 style={on ? drumLedStyle(y, brightness, bloom) : undefined} />
          </div>
        );
      }
    }
  } else {
    // Mode GoL : teinte basée sur la note MIDI
    for (let y = 0; y < G; y++) {
      for (let x = 0; x < G; x++) {
        const age = grid[y][x];
        let st = null;
        if (age > 0) {
          const midi = window.rowToPitch(y, pitches);
          const base = window.noteHue(midi);
          const hue  = warm ? Math.round(18 + (base / 360) * 62) : base;
          st = ledStyle(age, hue, brightness, bloom);
        }
        cells.push(
          <div key={y * G + x} className="lif-cell" data-x={x} data-y={y}>
            <div className={`lif-led ${age > 0 ? 'is-on' : ''}`} style={st || undefined} />
          </div>
        );
      }
    }
  }
  return <div className="lif-cells">{cells}</div>;
},
// Re-rendre si l'une de ces valeurs change
(a, b) =>
  a.gen          === b.gen          &&
  a.brightness   === b.brightness   &&
  a.bloom        === b.bloom        &&
  a.pitches      === b.pitches      &&
  a.warm         === b.warm         &&
  a.drumMode     === b.drumMode     &&
  a.drumPattern  === b.drumPattern
);

/* ---- Flash de lecture : cellules vives de la colonne active -------------- */
// Non mémoïsé — re-render à chaque tick pour les 1-16 cellules actives.
// key="${playCol}-${y}" : force un nouveau nœud DOM à chaque colonne
// → l'animation CSS repart de zéro à chaque déclenchement.
function FlashCells({ grid, playCol, pitches, brightness, bloom, warm,
                      drumMode, drumPattern }) {
  if (playCol < 0) return null;
  const G = window.GRID;
  const dots = [];

  if (drumMode && drumPattern) {
    // Mode Drum : flash les pas actifs sur la colonne courante
    for (let y = 0; y < G; y++) {
      if (!drumPattern.steps[y]?.[playCol] || drumPattern.mutes[y]) continue;
      const color = window.DRUM_HUE ? window.DRUM_HUE[y] : '#c9a44c';
      const glow  = 10 * bloom;
      dots.push(
        <div key={`d${playCol}-${y}`} className="lif-flash-dot"
          style={{
            gridColumn: playCol + 1, gridRow: y + 1,
            background: `radial-gradient(circle at 50% 40%, white 0%, ${color} 45%, transparent 75%)`,
            boxShadow:  `0 0 ${glow}px ${glow * 0.5}px ${color}, 0 0 ${glow * 2}px ${glow}px ${color}88`,
          }} />
      );
    }
  } else {
    // Mode GoL : flash les cellules vivantes de la colonne
    for (let y = 0; y < G; y++) {
      const age = grid[y][playCol];
      if (age <= 0) continue;
      const midi = window.rowToPitch(y, pitches);
      const base = window.noteHue(midi);
      const hue  = warm ? Math.round(18 + (base / 360) * 62) : base;
      const b    = brightness;
      const glow = 10 * bloom;
      dots.push(
        <div key={`${playCol}-${y}`} className="lif-flash-dot"
          style={{
            gridColumn: playCol + 1, gridRow: y + 1,
            background: `radial-gradient(circle at 50% 40%,
              hsl(${hue} 100% 97%) 0%, hsl(${hue} 100% 82%) 40%,
              hsl(${hue} 95%  60%) 65%, transparent 78%)`,
            boxShadow:
              `0 0 ${glow}px ${glow * 0.5}px hsl(${hue} 100% 88% / ${b}), ` +
              `0 0 ${glow * 2}px ${glow}px hsl(${hue} 95% 65% / ${b * 0.65})`,
          }} />
      );
    }
  }

  return <div className="lif-flash-layer">{dots}</div>;
}

/* ---- Matrice complète (bezel + glass + cells + playhead + curseur) ------- */
function Matrix({ grid, gen, pitches, brightness = 1, bloom = 1, warm = false,
                  playCol, playing, cursor, drawMode, onPaint,
                  drumMode = false, drumPattern = null }) {
  const painting = useRefM(null);
  const ref      = useRefM(null);

  function cellFromEvent(e) {
    const host = ref.current;
    if (!host) return null;
    const r = host.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left)  / r.width)  * window.GRID);
    const y = Math.floor(((e.clientY - r.top)   / r.height) * window.GRID);
    if (x < 0 || y < 0 || x >= window.GRID || y >= window.GRID) return null;
    return { x, y };
  }

  function onDown(e) {
    const c = cellFromEvent(e);
    if (!c) return;
    // En mode Drum : l'effacement est basé sur le pattern, pas la grille GoL
    const erase = drumMode && drumPattern
      ? (drumPattern.steps[c.y]?.[c.x] === true)
      : (grid[c.y][c.x] > 0);
    painting.current = erase ? 'erase' : 'draw';
    onPaint(c.x, c.y, erase);
    try { ref.current.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function onMove(e) {
    if (!painting.current) return;
    const c = cellFromEvent(e);
    if (!c) return;
    onPaint(c.x, c.y, painting.current === 'erase');
  }
  function onUp() { painting.current = null; }

  const cw = `calc(${100 / window.GRID}%)`;

  return (
    <div className="lif-matrix-bezel">
      <div className="lif-matrix-glass">
        <div className="lif-matrix" ref={ref}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}>
          <Cells
            grid={grid} gen={gen} pitches={pitches}
            brightness={brightness} bloom={bloom} warm={warm}
            drumMode={drumMode} drumPattern={drumPattern} />
          {playCol >= 0 && (
            <div className="lif-playhead"
              style={{ width: cw, transform: `translateX(${playCol * 100}%)` }} />
          )}
          {playing && (
            <FlashCells
              grid={grid} playCol={playCol}
              pitches={pitches} brightness={brightness} bloom={bloom} warm={warm}
              drumMode={drumMode} drumPattern={drumPattern} />
          )}
          {/* Curseur : affiché seulement en mode GoL + dessin */}
          {drawMode && !drumMode && cursor && (
            <div className="lif-cursor"
              style={{ width: cw, height: cw,
                       transform: `translate(${cursor.x * 100}%, ${cursor.y * 100}%)` }} />
          )}
          <div className="lif-matrix-vignette" />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Matrix, ledStyle });
