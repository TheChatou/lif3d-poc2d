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
  drumVolume:  0.75,  // volume batterie, indépendant du volume GoL
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
  const [view, setView] = useState('machine');   // 'machine' | 'expert' | 'batterie'

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
  // 🎓 drumStep (0-31) : tête de lecture batterie, à résolution 32e de note —
  // deux fois plus fine que playCol (16e de note), cf. horloge ci-dessous.
  const [drumStep, setDrumStep] = useState(-1);
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

  /* ---- Ancre de loop : grille capturée au moment où loopOn s'active ------ */
  // 🎓 GoL est déterministe : rejouer depuis la même grille = rejouer la même séquence.
  const loopAnchorRef = useRef(null);

  /* ---- Pattern de la boîte à rythmes + mode Drum ------------------------- */
  // window.DRUM_DEFAULT est défini dans drums.jsx (chargé avant app.jsx)
  const [drumPattern, setDrumPattern] = useState(() => window.DRUM_DEFAULT);
  const drumPatternRef = useRef(drumPattern);
  drumPatternRef.current = drumPattern;

  const [drumMode, setDrumMode] = useState(false);
  const drumModeRef = useRef(false);
  drumModeRef.current = drumMode;

  /* ---- Peinture en mode Drum : (x,y) = cellule physique de la matrice ---- */
  // 🎓 8 pistes × 32 pas répartis en 2 bandes empilées de 8 lignes sur la
  // matrice 16×16 : lignes 0-7 = pas 0-15, lignes 8-15 = pas 16-31.
  // On reconvertit la cellule cliquée (x,y) en (piste, pas) logiques.
  const paintDrum = useCallback((x, y, erase) => {
    const half  = y < 8 ? 0 : 1;
    const track = y % 8;
    const step  = half * 16 + x;
    setDrumPattern((dp) => ({
      ...dp,
      steps: dp.steps.map((row, t) =>
        t === track ? row.map((v, s) => (s === step ? !erase : v)) : row
      ),
    }));
  }, []);

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
      drumVolume:  p.drumVolume,
    });
  }, [
    p.volume, p.cutoff, p.resonance, p.reverb, p.waveIdx,
    p.attack, p.decay, p.sustain, p.release, p.detune, p.stereo,
    p.phaserOn, p.phaserDepth, p.flangerOn, p.flangerDepth, p.drumVolume,
  ]);

  /* ---- Ancre de loop : mise à jour quand loopOn change ------------------- */
  useEffect(() => {
    if (p.loopOn) {
      loopAnchorRef.current = window.cloneGrid(gridRef.current);
    } else {
      loopAnchorRef.current = null;
    }
  }, [p.loopOn]);

  /* ---- Horloge musicale -------------------------------------------------- */
  // 🎓 Une SEULE horloge de référence, à la résolution la plus fine requise
  // (32e de note = résolution batterie). Le GoL/arpégiateur, plus lents,
  // ne lisent qu'un tick sur deux (diviseur ÷2) — exactement le principe
  // déjà utilisé pour ARP_DIV, mais appliqué à l'horloge maîtresse.
  // Ça évite la dérive de phase qu'auraient deux setInterval indépendants,
  // et c'est le pattern naturel côté firmware (1 timer matériel + diviseurs).
  useEffect(() => {
    if (!playing) { setPlayCol(-1); setDrumStep(-1); return; }

    // Durée d'une double-croche (16e de note) en ms — référence du tempo affiché
    const sixteenth = (60 / pRef.current.bpm) / 4 * 1000;
    // Tick maître = triple-croche (32e de note) : deux fois plus rapide
    const subTick   = sixteenth / 2;

    const id = setInterval(() => {
      const st       = stepRef.current;
      const golTick  = st % 2 === 0;          // un tick maître sur deux pilote le GoL
      const drumStepVal = st % 32;
      const col      = Math.floor(st / 2) % window.GRID;

      setDrumStep(drumStepVal);

      const g  = gridRef.current;
      const pp = pitchesRef.current;
      const P  = pRef.current;

      // ---- Déclenchement des notes (arp ou colonne normale) — 1 tick sur 2 -
      let any = false;

      if (golTick) {
        setPlayCol(col);

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

            // Loop : rejoue depuis l'ancre après N mesures (seulement si loopOn)
            // 🎓 GoL est déterministe → repartir de la même grille rejoue exactement
            // la même séquence sonore, sans re-randomiser.
            if (P2.loopOn && loopAnchorRef.current) {
              const loopBars = window.LOOP_BARS[P2.loopLen];
              if (next % loopBars === 0) {
                setGrid(window.cloneGrid(loopAnchorRef.current));
                setGen((x) => x + 1);
                return next;
              }
            }

            // Conway pur : une génération par N balayages.
            // 🎓 En mode Drum, GoL est gelé — seul le playhead avance.
            if (next % sweepsPerEvol === 0 && !drumModeRef.current) {
              const rule = window.RULES[P2.ruleIdx];
              const ng   = window.step(gridRef.current, rule, P2.ageMax || 0);
              setGrid(ng);
              setGen((x) => x + 1);
            }

            return next;
          });
        }
      } // fin golTick

      // ---- Batterie (drum machine) — lue à CHAQUE tick (résolution 32e) ---
      // 🎓 On lit le pattern de la ref (pas du state) pour éviter de
      // recréer le setInterval à chaque changement de pattern.
      const dp    = drumPatternRef.current;
      const actxD = audio.current.getCtx();
      const nowD  = actxD ? actxD.currentTime : 0;
      // 🎓 Swing : les pas impairs (off-beats) sont retardés proportionnellement
      // à la durée du tick maître (32e de note), pour garder le même feel
      // "shuffle" qu'avant à la nouvelle résolution.
      const swingOff = (drumStepVal % 2 === 1) ? dp.swing * (subTick / 1000) * 0.32 : 0;
      window.DRUM_NAMES.forEach((name, track) => {
        if (!dp.mutes[track] && dp.steps[track] && dp.steps[track][drumStepVal]) {
          audio.current.triggerDrum(name, nowD + swingOff, dp.vols[track]);
        }
      });

      stepRef.current = st + 1;
    }, subTick);

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
    stepRef.current       = 0;
    arpSubTickRef.current = 0;
    // Nouvelle ancre de loop sur la nouvelle grille
    loopAnchorRef.current = pRef.current.loopOn ? window.cloneGrid(ng) : null;
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
    playing, playCol, drumStep, measure,
    cursor, penState, setPenState,
    live, saved, t, setTweak,
    togglePlay, doReset, doClear, doSave, doLoad,
    stampShape, paint, moveCursor,
    drumMode, setDrumMode, drumPattern, setDrumPattern, paintDrum,
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
        <ViewTab
          value={view}
          onChange={setView}
          options={['machine', 'expert', 'batterie']}
          labels={['Machine', 'Expert', 'Batterie']} />
      </div>

      {/* Stage : contient le contenu scalé (Machine/Expert) ou la vue Batterie */}
      <div className="lif-stage" ref={stageRef}>
        {view === 'batterie'
          ? <window.BatterieView ctx={viewCtx} />
          : (
            <div className="lif-scale" ref={contentRef}
                 style={{ transform: `scale(${scale})` }}>
              {view === 'machine'
                ? <MachineView ctx={viewCtx} />
                : <ExpertView  ctx={viewCtx} />}
            </div>
          )}
      </div>

      {/* Tiroir Batterie : visible seulement hors de la vue Batterie */}
      {view !== 'batterie' && (
        <window.DrumPanel
          pattern={drumPattern}
          onChange={setDrumPattern}
          playStep={drumStep}
          playing={playing}
        />
      )}

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
