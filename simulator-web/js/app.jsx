/* ==========================================================================
   LIF2D — Application : état global, horloge musicale, vues Machine / Expert.
   Responsive : transform scale pour adapter le boîtier à toute taille d'écran.
   ========================================================================== */

const { useState, useRef, useEffect, useCallback, useMemo } = React;

/* ---- Valeurs par défaut de tous les paramètres --------------------------- */
const DEFAULT = {
  bpm:         116,
  brightness:  0.85,
  volume:      0.72,
  cutoff:      0.68,
  resonance:   0.18,
  reverb:      0.28,
  ruleIdx:     0,        // Conway B3/S23 (règle canonique)
  scaleIdx:    0,        // Pentatonique
  tonic:       9,        // A
  presetIdx:   0,        // Libre
  waveIdx:     0,        // Sine
  sampleRef:   'C4',
  symmetry:    0,
  loopLen:     2,        // ×8 mesures — laisse le temps aux patterns de se développer
  shape:       'Vide',
  arpOn:       false,
  arpMode:     0,      // index dans ARP_MODES (ordre de lecture)
  arpSpeed:    1,      // index dans ARP_DIV   (subdivision : ×2 par défaut)
  arpGroove:   false,  // swing sur les sous-ticks impairs
  loopOn:      false,  // Loop désactivé par défaut → Conway pur, pas de reset auto
  attack:      6,
  decay:       60,
  sustain:     0.5,
  release:     120,
  ageTarget:   1,
  ageMax:      0,        // 0 = âge illimité (pas de cap artificiel)
  muteAge:     8,
  detune:      6,
  stereo:      0.4,
  phaserOn:    false,
  phaserDepth: 0.4,
  flangerOn:   false,
  flangerDepth: 0.3,
};

/* ---- Valeurs par défaut des tweaks (persistés dans le panneau) ----------- */
const TWEAK_DEFAULTS = {
  density:       0.35,   // ~90 cellules vivantes — Conway a besoin de masse critique
  sweepsPerEvol: 1,      // 1 = chaque balayage déclenche une évolution (synchronisation exacte)
  bloom:         1.0,
  ledWarm:       true,
};

/* ==========================================================================
   Composant principal App
   ========================================================================== */
function App() {
  /* ---- Tweaks visuels & simulation --------------------------------------- */
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  /* ---- Vue active -------------------------------------------------------- */
  const [view, setView] = useState('machine');   // 'machine' | 'expert'

  /* ---- Paramètres de synthèse / séquenceur ------------------------------ */
  const [p, setP] = useState(DEFAULT);
  const set = useCallback((k, v) =>
    setP((s) => ({ ...s, [k]: typeof v === 'function' ? v(s[k]) : v })),
  []);

  /* ---- État de la grille et horloge -------------------------------------- */
  const [grid,    setGridState] = useState(() => window.randomGrid(TWEAK_DEFAULTS.density));
  const [gen,     setGen]       = useState(0);
  const [playing, setPlaying]   = useState(false);
  const [playCol, setPlayCol]   = useState(-1);
  const [measure, setMeasure]   = useState(0);
  const [cursor,  setCursor]    = useState({ x: 8, y: 8 });
  const [penState, setPenState] = useState(1);   // 0 lever · 1 tracer · 2 gomme
  const [live,    setLive]      = useState(false);
  const [saved,   setSaved]     = useState(null);
  const [scale,   setScale]     = useState(1);

  /* ---- Refs pour l'horloge (closures stables sur des valeurs fraîches) --- */
  const gridRef     = useRef(grid);    gridRef.current     = grid;
  const pRef        = useRef(p);       pRef.current        = p;
  const tRef        = useRef(t);       tRef.current        = t;
  const cursorRef   = useRef(cursor);  cursorRef.current   = cursor;
  const stepRef     = useRef(0);
  const liveTO      = useRef(null);
  const penStateRef = useRef(penState); penStateRef.current = penState;

  /* ---- Ref arpégiateur : compteur de sous-ticks cumulé par colonne ------ */
  // Nécessaire pour le ping-pong, qui doit continuer sa direction entre les colonnes.
  const arpSubTickRef = useRef(0);

  /* ---- Moteur audio (singleton) ----------------------------------------- */
  const audio = useRef(null);
  if (!audio.current) audio.current = window.makeAudio();

  /* Raccourci pour mettre à jour la grille partout (state + ref) */
  const setGrid = useCallback((g) => { gridRef.current = g; setGridState(g); }, []);

  /* ---- Calcul des hauteurs MIDI (mémoïsé) -------------------------------- */
  const pitches = useMemo(
    () => window.buildPitches(p.tonic, window.SCALES[p.scaleIdx].iv, window.GRID),
    [p.tonic, p.scaleIdx],
  );
  const pitchesRef = useRef(pitches); pitchesRef.current = pitches;

  /* ---- Synchronisation des paramètres audio ----------------------------- */
  useEffect(() => {
    audio.current.setParams({
      volume:      p.volume,
      cutoff:      p.cutoff,
      resonance:   p.resonance,
      reverb:      p.reverb,
      wave:        window.WAVES[p.waveIdx],
      attack:      p.attack,
      decay:       p.decay,
      sustain:     p.sustain,
      release:     p.release,
      detune:      p.detune,
      stereo:      p.stereo,
      phaserOn:    p.phaserOn,
      phaserDepth: p.phaserDepth,
      flangerOn:   p.flangerOn,
      flangerDepth: p.flangerDepth,
    });
  }, [
    p.volume, p.cutoff, p.resonance, p.reverb, p.waveIdx,
    p.attack, p.decay, p.sustain, p.release, p.detune, p.stereo,
    p.phaserOn, p.phaserDepth, p.flangerOn, p.flangerDepth,
  ]);

  /* ---- Horloge musicale -------------------------------------------------- */
  useEffect(() => {
    if (!playing) { setPlayCol(-1); return; }

    // Durée d'une double-croche en ms
    const sixteenth = (60 / pRef.current.bpm) / 4 * 1000;

    const id = setInterval(() => {
      const st  = stepRef.current;
      const col = st % window.GRID;
      setPlayCol(col);

      const g  = gridRef.current;
      const pp = pitchesRef.current;
      const P  = pRef.current;

      // ---- Déclenchement des notes (arp ou colonne normale) ----------------
      let any = false;

      if (P.arpOn) {
        // Notes vivantes de cette colonne, triées selon le mode
        const seq     = window.buildColArpSeq(g, col, pp, P.arpMode);
        const divCount = window.ARP_DIV_VALUES[P.arpSpeed] ?? 2;

        if (seq.length > 0) {
          any = true;

          // Contexte audio pour le scheduling précis
          const actx     = audio.current.getCtx();
          const nowAudio = actx ? actx.currentTime : 0;
          // Durée d'un sous-tick en secondes (sixteenth est en ms)
          const subSec   = (sixteenth / 1000) / divCount;
          // Groove : amplitude du swing (proportion du sous-tick), 0 = droit
          // Les sous-ticks impairs sont décalés de grooveShift secondes en avant
          const grooveShift = P.arpGroove ? subSec * 0.35 : 0;

          // Subdivision : on programme divCount sous-ticks dans ce temps
          for (let i = 0; i < divCount; i++) {
            const indices = window.arpNoteIndices(arpSubTickRef.current + i, seq.length, P.arpMode);
            // Timing groove : sous-ticks impairs légèrement retardés (swing)
            const t = nowAudio + i * subSec + (i % 2 === 1 ? grooveShift : 0);
            indices.forEach((noteIdx) => {
              const { midi, age } = seq[noteIdx];
              const vel = P.ageTarget === 1 ? Math.min(0.4 + age * 0.15, 1) : 0.75;
              audio.current.trigger(window.midiToFreq(midi), vel, 0, t);
            });
          }
          // Avancer le compteur global de sous-ticks (continuité cross-colonnes)
          arpSubTickRef.current += divCount;
        }

      } else {
        // Mode normal : toutes les cellules vivantes de la colonne
        for (let y = 0; y < window.GRID; y++) {
          const age = g[y][col];
          if (age > 0 && (!P.muteAge || age < P.muteAge)) {
            const midi = window.rowToPitch(y, pp);
            const vel  = P.ageTarget === 1 ? Math.min(0.4 + age * 0.18, 1) : 0.85;
            const pan  = (col / (window.GRID - 1)) * 2 - 1;
            audio.current.trigger(window.midiToFreq(midi), vel, pan);
            any = true;
          }
        }
      }

      // Indicateur "live" (haut-parleur)
      if (any) {
        setLive(true);
        clearTimeout(liveTO.current);
        liveTO.current = setTimeout(() => setLive(false), 110);
      }

      // Évolution Conway + gestion des mesures (déclenchés à chaque col 0)
      if (st > 0 && col === 0) {
        setMeasure((mm) => {
          const next          = mm + 1;
          const sweepsPerEvol = Math.max(1, tRef.current.sweepsPerEvol ?? 1);
          const P2            = pRef.current;

          // Loop : reset aléatoire après N mesures (seulement si loopOn)
          if (P2.loopOn) {
            const loopBars = window.LOOP_BARS[P2.loopLen];
            if (next % loopBars === 0) {
              // Symétrie appliquée sur le tirage initial → uniquement ici
              let ng = window.randomGrid(tRef.current.density);
              if (P2.symmetry) ng = window.applySymmetry(ng, P2.symmetry);
              setGrid(ng);
              setGen((x) => x + 1);
              return next;
            }
          }

          // Conway pur : une génération par N balayages, sans applySymmetry
          // (la symétrie ne concerne que le dessin, pas les règles du jeu)
          if (next % sweepsPerEvol === 0) {
            const rule = window.RULES[P2.ruleIdx];
            const ng   = window.step(gridRef.current, rule, P2.ageMax || 0);
            setGrid(ng);
            setGen((x) => x + 1);
          }

          return next;
        });
      }

      stepRef.current = st + 1;
    }, sixteenth);

    return () => clearInterval(id);
  }, [playing, p.bpm]);  // recréer l'intervalle seulement si playing ou bpm changent

  /* ---- Actions séquenceur ----------------------------------------------- */
  const togglePlay = useCallback(() => {
    audio.current.resume();
    setPlaying((v) => !v);
  }, []);

  const doReset = useCallback(() => {
    let ng = window.randomGrid(tRef.current.density);
    // Symétrie appliquée sur le tirage initial (dessin / reset uniquement)
    if (pRef.current.symmetry) ng = window.applySymmetry(ng, pRef.current.symmetry);
    setGrid(ng);
    setGen((x) => x + 1);
    setMeasure(0);
    stepRef.current    = 0;
    arpSubTickRef.current = 0;
  }, []);

  const doClear = useCallback(() => {
    setGrid(window.emptyGrid());
    setGen((x) => x + 1);
  }, []);

  const doSave = useCallback(() => {
    setSaved(window.cloneGrid(gridRef.current));
  }, []);

  const doLoad = useCallback(() => {
    if (saved) {
      setGrid(window.cloneGrid(saved));
      setGen((x) => x + 1);
    }
  }, [saved]);

  const stampShape = useCallback((name) => {
    set('shape', name);
    if (name !== 'Vide') {
      const { x, y } = cursorRef.current;
      setGrid(window.placeShape(name, x, y));
      setGen((n) => n + 1);
    }
  }, [set]);

  /* ---- Peinture directe sur la matrice (clic/glisser) ------------------- */
  // La symétrie est appliquée au dessin : chaque cellule peinte est immédiatement mirrorée.
  const paint = useCallback((x, y, erase) => {
    const g   = window.cloneGrid(gridRef.current);
    const sym = pRef.current.symmetry;
    const M   = window.GRID - 1;
    const val = erase ? 0 : 1;

    const setCell = (cx, cy) => {
      if (cx >= 0 && cx < window.GRID && cy >= 0 && cy < window.GRID) g[cy][cx] = val;
    };

    setCell(x, y);
    if      (sym === 1) setCell(M - x, y);
    else if (sym === 2) setCell(x, M - y);
    else if (sym === 3) { setCell(M-x, y); setCell(x, M-y); setCell(M-x, M-y); }
    else if (sym === 4) setCell(M - x, M - y);

    setGrid(g);
    setGen((n) => n + 1);
  }, []);

  /* ---- Molettes : déplacement du curseur + traçage/gommage --------------- */
  const moveCursor = useCallback((dx, dy) => {
    setCursor((c) => {
      const nx  = Math.max(0, Math.min(window.GRID - 1, c.x + dx));
      const ny  = Math.max(0, Math.min(window.GRID - 1, c.y + dy));
      const ps  = penStateRef.current;
      const sym = pRef.current.symmetry;
      const M   = window.GRID - 1;

      if (ps !== 0) {
        const g   = window.cloneGrid(gridRef.current);
        const val = ps === 2 ? 0 : 1;
        const setCell = (cx, cy) => {
          if (cx >= 0 && cx < window.GRID && cy >= 0 && cy < window.GRID) g[cy][cx] = val;
        };
        setCell(nx, ny);
        if      (sym === 1) setCell(M-nx, ny);
        else if (sym === 2) setCell(nx, M-ny);
        else if (sym === 3) { setCell(M-nx,ny); setCell(nx,M-ny); setCell(M-nx,M-ny); }
        else if (sym === 4) setCell(M-nx, M-ny);
        setGrid(g);
        setGen((n) => n + 1);
      }
      return { x: nx, y: ny };
    });
  }, []);

  /* ---- Mise à l'échelle responsive --------------------------------------- */
  const stageRef   = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const fit = () => {
      const el = contentRef.current;
      if (!el) return;
      const sw = (window.innerWidth  - 48)  / el.offsetWidth;
      const sh = (window.innerHeight - 116) / el.offsetHeight;
      setScale(Math.min(1, sw, sh));
    };
    fit();
    requestAnimationFrame(fit);
    const t1 = setTimeout(fit, 400);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    window.addEventListener('resize', fit);
    const ro = new ResizeObserver(fit);
    if (contentRef.current) ro.observe(contentRef.current);
    return () => {
      window.removeEventListener('resize', fit);
      clearTimeout(t1);
      ro.disconnect();
    };
  }, [view]);

  /* ---- Contexte partagé entre les vues ---------------------------------- */
  const viewCtx = {
    p, set, grid, gen, pitches,
    playing, playCol, measure,
    cursor, penState, setPenState,
    live, saved, t, setTweak,
    togglePlay, doReset, doClear, doSave, doLoad,
    stampShape, paint, moveCursor,
  };

  /* ---- Rendu ------------------------------------------------------------- */
  return (
    <div>
      {/* Chrome fixe : logo + toggle de vue */}
      <div className="lif-chrome">
        <div className="lif-brand">
          <h1>LIF<span className="lif-brand-accent">2D</span></h1>
          <small>BETA 1 · 16×16 · CONWAY ENGINE</small>
        </div>
        <Toggle
          on={view === 'expert'}
          onChange={(v) => setView(v ? 'expert' : 'machine')}
          labels={['Machine', 'Expert']} />
      </div>

      {/* Stage : contient le contenu scalé */}
      <div className="lif-stage" ref={stageRef}>
        <div className="lif-scale" ref={contentRef}
             style={{ transform: `scale(${scale})` }}>
          {view === 'machine'
            ? <MachineView ctx={viewCtx} />
            : <ExpertView  ctx={viewCtx} />}
        </div>
      </div>

      {/* Panneau Tweaks (paramètres de rendu & simulation) */}
      <TweaksPanel title="LIF2D Tweaks">
        <TweakSection label="Jeu de la Vie" />
        <TweakSlider
          label="Densité initiale"
          value={t.density} min={0.05} max={0.60} step={0.05} unit=""
          onChange={(v) => setTweak('density', v)} />
        <TweakSlider
          label="Balayages / évolution"
          value={t.sweepsPerEvol ?? 1} min={1} max={8} step={1}
          onChange={(v) => setTweak('sweepsPerEvol', v)} />
        <TweakSection label="Rendu LEDs" />
        <TweakRadio
          label="Couleur"
          value={t.ledWarm ? 'warm' : 'spectre'}
          options={[
            { value: 'warm',    label: 'Ambre'   },
            { value: 'spectre', label: 'Spectre' },
          ]}
          onChange={(v) => setTweak('ledWarm', v === 'warm')} />
        <TweakSlider
          label="Halo (bloom)"
          value={t.bloom} min={0.3} max={1.8} step={0.1}
          onChange={(v) => setTweak('bloom', v)} />
      </TweaksPanel>
    </div>
  );
}

/* ---- Point d'entrée React 18 -------------------------------------------- */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
