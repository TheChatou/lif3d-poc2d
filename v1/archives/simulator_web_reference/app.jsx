/* =========================================================================
   LIF2D — Application : état global, horloge musicale, vues.
   ========================================================================= */
const { useState: uS, useRef: uR, useEffect: uE, useCallback: uC } = React;

const DEFAULT = {
  bpm: 116, brightness: 0.85, volume: 0.72, cutoff: 0.68, resonance: 0.18, reverb: 0.28,
  ruleIdx: 2, scaleIdx: 0, tonic: 9, presetIdx: 0, waveIdx: 0, sampleRef: 'C4',
  symmetry: 0, loopLen: 1, shape: 'Vide',
  arpOn: false, arpMode: 0, arpSpeed: 0,
  attack: 6, decay: 60, sustain: 0.5, release: 120,
  ageTarget: 1, ageMax: 4, muteAge: 8,
  detune: 6, stereo: 0.4,
  phaserOn: false, phaserDepth: 0.4, flangerOn: false, flangerDepth: 0.3,
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [view, setView] = uS('machine');             // 'machine' | 'expert'
  const [p, setP] = uS(DEFAULT);
  const set = (k, v) => setP((s) => ({ ...s, [k]: typeof v === 'function' ? v(s[k]) : v }));

  const [grid, setGridState] = uS(() => window.randomGrid(t.density));
  const [gen, setGen] = uS(0);
  const [playing, setPlaying] = uS(false);
  const [playCol, setPlayCol] = uS(-1);
  const [measure, setMeasure] = uS(0);
  const [cursor, setCursor] = uS({ x: 8, y: 8 });
  const [penState, setPenState] = uS(1);              // 0 lever · 1 tracer · 2 gomme
  const [live, setLive] = uS(false);
  const [saved, setSaved] = uS(null);
  const [scale, setScale] = uS(1);

  // refs pour l'horloge (évite les closures périmées)
  const gridRef = uR(grid); gridRef.current = grid;
  const pRef = uR(p); pRef.current = p;
  const tRef = uR(t); tRef.current = t;
  const stepRef = uR(0);
  const liveTO = uR(null);
  const audio = uR(null);
  if (!audio.current) audio.current = window.makeAudio();

  const setGrid = (g) => { gridRef.current = g; setGridState(g); };

  const pitches = React.useMemo(
    () => window.buildPitches(p.tonic, window.SCALES[p.scaleIdx].iv, window.GRID),
    [p.tonic, p.scaleIdx]
  );
  const pitchesRef = uR(pitches); pitchesRef.current = pitches;

  /* ---- pousser les paramètres audio -------------------------------------- */
  uE(() => {
    audio.current.setParams({
      volume: p.volume, cutoff: p.cutoff, resonance: p.resonance, reverb: p.reverb,
      wave: window.WAVES[p.waveIdx], attack: p.attack, decay: p.decay, sustain: p.sustain,
      release: p.release, detune: p.detune, stereo: p.stereo,
    });
  }, [p.volume, p.cutoff, p.resonance, p.reverb, p.waveIdx, p.attack, p.decay, p.sustain, p.release, p.detune, p.stereo]);

  /* ---- horloge musicale -------------------------------------------------- */
  uE(() => {
    if (!playing) { setPlayCol(-1); return; }
    const sixteenth = (60 / pRef.current.bpm) / 4 * 1000;   // durée d'un pas
    const id = setInterval(() => {
      const st = stepRef.current;
      const col = st % window.GRID;
      setPlayCol(col);

      // déclenche les notes de la colonne courante
      const g = gridRef.current, pp = pitchesRef.current, P = pRef.current;
      let any = false;
      for (let y = 0; y < window.GRID; y++) {
        const age = g[y][col];
        if (age > 0 && (!P.muteAge || age < P.muteAge)) {
          const midi = window.rowToPitch(y, pp);
          const vel = P.ageTarget === 1 ? Math.min(0.4 + age * 0.18, 1) : 0.85;
          const pan = (col / (window.GRID - 1)) * 2 - 1;
          audio.current.trigger(window.midiToFreq(midi), vel, pan);
          any = true;
        }
      }
      if (any) { setLive(true); clearTimeout(liveTO.current); liveTO.current = setTimeout(() => setLive(false), 110); }

      // évolution
      const speed = tRef.current.speed;
      const genInterval = Math.max(4, Math.round(34 - speed * 3));
      if (st > 0 && st % genInterval === 0) {
        const rule = window.RULES[pRef.current.ruleIdx];
        let ng = window.step(gridRef.current, rule, pRef.current.ageMax || 0);
        ng = window.applySymmetry(ng, pRef.current.symmetry);
        setGrid(ng); setGen((x) => x + 1);
      }

      // mesures + boucle (réinitialisation)
      if (st > 0 && col === 0) {
        setMeasure((mm) => {
          const next = mm + 1;
          const loopMeasures = [2, 4, 8][pRef.current.loopLen];
          if (next % loopMeasures === 0) {
            const ng = window.randomGrid(tRef.current.density);
            setGrid(ng); setGen((x) => x + 1);
          }
          return next;
        });
      }
      stepRef.current = st + 1;
    }, sixteenth);
    return () => clearInterval(id);
  }, [playing, p.bpm]);

  /* ---- actions séquenceur ------------------------------------------------ */
  const togglePlay = () => { audio.current.resume(); setPlaying((v) => !v); };
  const doReset = () => { setGrid(window.randomGrid(t.density)); setGen((x) => x + 1); setMeasure(0); stepRef.current = 0; };
  const doClear = () => { setGrid(window.emptyGrid()); setGen((x) => x + 1); };
  const doSave = () => setSaved(window.cloneGrid(gridRef.current));
  const doLoad = () => { if (saved) { setGrid(window.cloneGrid(saved)); setGen((x) => x + 1); } };
  const stampShape = (name) => { set('shape', name); if (name !== 'Vide') { setGrid(window.placeShape(name, cursor.x, cursor.y)); setGen((x) => x + 1); } };

  const paint = uC((x, y, erase) => {
    const g = window.cloneGrid(gridRef.current);
    g[y][x] = erase ? 0 : 1;
    setGrid(g); setGen((x2) => x2 + 1);
  }, []);

  // molettes ardoise magique : déplace le curseur + trace selon le mode du stylo
  const moveCursor = uC((dx, dy) => {
    setCursor((c) => {
      const nx = Math.max(0, Math.min(window.GRID - 1, c.x + dx));
      const ny = Math.max(0, Math.min(window.GRID - 1, c.y + dy));
      const ps = penStateRef.current;
      if (ps !== 0) {
        const g = window.cloneGrid(gridRef.current);
        g[ny][nx] = ps === 2 ? 0 : 1;
        setGrid(g); setGen((x) => x + 1);
      }
      return { x: nx, y: ny };
    });
  }, []);
  const penStateRef = uR(penState); penStateRef.current = penState;

  /* ---- échelle responsive ------------------------------------------------ */
  const stageRef = uR(null), contentRef = uR(null);
  uE(() => {
    const fit = () => {
      const el = contentRef.current; if (!el) return;
      const sw = (window.innerWidth - 48) / el.offsetWidth;
      const sh = (window.innerHeight - 116) / el.offsetHeight;  // marge chrome haut + bas
      setScale(Math.min(1, sw, sh));
    };
    fit();
    requestAnimationFrame(fit);
    const t1 = setTimeout(fit, 400);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    window.addEventListener('resize', fit);
    const ro = new ResizeObserver(fit); if (contentRef.current) ro.observe(contentRef.current);
    return () => { window.removeEventListener('resize', fit); clearTimeout(t1); ro.disconnect(); };
  }, [view]);

  const ctx = {
    p, set, grid, gen, pitches, playing, playCol, measure, cursor, penState, setPenState,
    live, saved, t, setTweak,
    togglePlay, doReset, doClear, doSave, doLoad, stampShape, paint, moveCursor,
  };

  return (
    <div>
      <div className="lif-chrome">
        <div className="lif-brand">
          <h1>LIF<span className="lif-brand-accent">2D</span></h1>
          <small>BETA 1 · 16×16 · CONWAY ENGINE</small>
        </div>
        <Toggle on={view === 'expert'} onChange={(v) => setView(v ? 'expert' : 'machine')}
          labels={['Machine', 'Expert']} />
      </div>

      <div className="lif-stage" ref={stageRef}>
        <div className="lif-scale" ref={contentRef} style={{ transform: `scale(${scale})` }}>
          {view === 'machine' ? <MachineView ctx={ctx} /> : <ExpertView ctx={ctx} />}
        </div>
      </div>

      <TweaksPanel>
        <TweakSection label="Jeu de la Vie — défauts" />
        <TweakSlider label="Densité initiale" value={t.density} min={0.02} max={0.2} step={0.01}
          unit="" onChange={(v) => setTweak('density', v)} />
        <TweakSlider label="Vitesse d'évolution" value={t.speed} min={1} max={10} step={1}
          onChange={(v) => setTweak('speed', v)} />
        <TweakSection label="Rendu" />
        <TweakRadio label="Couleur des LEDs" value={t.ledWarm ? 'warm' : 'spectre'}
          options={[{ value: 'warm', label: 'Ambre' }, { value: 'spectre', label: 'Spectre' }]}
          onChange={(v) => setTweak('ledWarm', v === 'warm')} />
        <TweakSlider label="Halo des LEDs" value={t.bloom} min={0.3} max={1.8} step={0.1}
          onChange={(v) => setTweak('bloom', v)} />
      </TweaksPanel>
    </div>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": 0.06,
  "speed": 5,
  "bloom": 1,
  "ledWarm": true
}/*EDITMODE-END*/;

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
