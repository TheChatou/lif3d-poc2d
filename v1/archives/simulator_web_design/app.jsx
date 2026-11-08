/* ============================================================
   LIF2D — app.jsx  ·  état, séquenceur, clavier, layouts
   ============================================================ */
const {
  RULES, SCALES, TONICS, SHAPES, SYMMETRIES, WAVEFORMS, STYLES, DSTEPS,
  DRUM_TRACKS, DRUM_PATTERNS, emptyGrid, cloneGrid, countLive,
  seedGrid, symPoints, stepGrid, updateAges, agesFromGrid, ageColor,
} = window.LIF2D;

const PRESET_PALETTE = [
  "#f5b942","#ff8a3d","#ff5a4d","#ff5fa2","#a96cff","#5b7bff",
  "#5bd6ff","#38d07a","#9be15d","#e8edf2","#d98a5a","#8a8f99",
];

/* Vues de la matrice : 2 catégories × menus */
const VIEWS = {
  play:    [["play.gol", "GoL"], ["play.drum", "Drum"]],
  presets: [["presets.gol", "GoL"], ["presets.drum", "Drum"], ["presets.sons", "Sons"]],
};
const PRESET_KEY = { "presets.gol": "gol", "presets.drum": "drum", "presets.sons": "sons" };

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "layout": "console",
  "density": "compact",
  "bloom": 1.1,
  "styleColorCoding": true,
  "scanGlow": true
}/*EDITMODE-END*/;

const LS_PRESETS = "lif2d_presets_v3";
function loadPresets() {
  try {
    const raw = localStorage.getItem(LS_PRESETS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { gol: Array(16).fill(null), drum: Array(16).fill(null), sons: Array(16).fill(null) };
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  /* ---------- état principal ---------- */
  const [grid, setGrid] = useState(() => seedGrid("pulsar"));
  const [ages, setAges] = useState(() => agesFromGrid(seedGrid("pulsar")));
  const [playing, setPlaying] = useState(false);
  const [scanCol, setScanCol] = useState(-1);
  const [gen, setGen] = useState(0);
  const [view, setView] = useState("play.gol");        // play.gol|play.drum|presets.*

  const [bpm, setBpm] = useState(120);
  const [subdiv, setSubdiv] = useState(1);
  const [sens, setSens] = useState("down");
  const [evoSweeps, setEvoSweeps] = useState(1);
  const [seedDensity, setSeedDensity] = useState(30);  // %

  const [ruleId, setRuleId] = useState("conway");
  const [symId, setSymId] = useState("none");
  const [shapeId, setShapeId] = useState("pulsar");

  /* âge des cellules */
  const [ageScheme, setAgeScheme] = useState("chaleur");  // none|chaleur|froid|spectre
  const [ageMax, setAgeMax] = useState(10);
  const [highlightNew, setHighlightNew] = useState(true);

  const [styleId, setStyleId] = useState("japon");
  const [tonic, setTonic] = useState(0);
  const [scaleId, setScaleId] = useState("japon");
  const [octave, setOctave] = useState(0);
  const [arp, setArp] = useState(false);

  const [snd, setSnd] = useState(STYLES[0].params);
  const [luminosite, setLuminosite] = useState(92);
  const [volume, setVolume] = useState(76);
  const [phaserOn, setPhaserOn] = useState(false);
  const [flangerOn, setFlangerOn] = useState(false);
  const [phaserDepth, setPhaserDepth] = useState(40);
  const [flangerDepth, setFlangerDepth] = useState(30);

  /* drum (32 pas) */
  const [drumPat, setDrumPat] = useState(() => DRUM_PATTERNS["4/4"]());
  const [mutes, setMutes] = useState(() => DRUM_TRACKS.map(() => false));
  const [swing, setSwing] = useState(0);
  const [volDrums, setVolDrums] = useState(75);

  /* presets + ui */
  const [presets, setPresets] = useState(loadPresets);
  const [lastPad, setLastPad] = useState(-1);
  const [help, setHelp] = useState(false);
  const [densityPop, setDensityPop] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const [toast, setToast] = useState(null);

  const style = STYLES.find((s) => s.id === styleId);
  const accent = t.styleColorCoding ? style.color : "#e7a64e";

  const cat = view.split(".")[0];                       // play | presets
  const seqMode = view === "play.gol" ? "gol" : view === "play.drum" ? "drum" : "none";
  const presetKey = PRESET_KEY[view] || "gol";

  /* ---------- refs pour le loop ---------- */
  const gridRef = useRef(grid);
  const agesRef = useRef(ages);
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { agesRef.current = ages; }, [ages]);
  const R = useRef({});
  R.current = { bpm, subdiv, seqMode, ruleId, evoSweeps };

  /* ---------- toast helper ---------- */
  const flash = useCallback((msg) => {
    setToast(msg);
    clearTimeout(flash._t);
    flash._t = setTimeout(() => setToast(null), 1400);
  }, []);

  /* ---------- séquenceur (rAF) ---------- */
  useEffect(() => {
    if (!playing) { setScanCol(-1); return; }
    let raf, last = performance.now(), acc = 0, col = -1, sweeps = 0;
    const loop = (now) => {
      const { bpm, subdiv, seqMode, ruleId, evoSweeps } = R.current;
      const loopLen = seqMode === "drum" ? DSTEPS : 16;
      const stepDur = (60000 / bpm) / 4 / subdiv;
      acc += now - last; last = now;
      while (acc >= stepDur) {
        acc -= stepDur;
        col = (col + 1) % loopLen;
        if (col === 0 && seqMode === "gol") {
          sweeps += 1;
          if (sweeps >= evoSweeps) {
            sweeps = 0;
            const rule = RULES.find((x) => x.id === ruleId);
            const next = stepGrid(gridRef.current, rule);
            const nextAges = updateAges(agesRef.current, gridRef.current, next);
            gridRef.current = next; agesRef.current = nextAges;
            setGrid(next); setAges(nextAges); setGen((g) => g + 1);
          }
        }
        setScanCol(seqMode === "none" ? -1 : col);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  /* ---------- actions ---------- */
  const setGridA = (g) => { setGrid(g); setAges(agesFromGrid(g)); };
  const togglePlay = useCallback(() => setPlaying((p) => !p), []);
  const doReset = useCallback(() => { setGridA(seedGrid(shapeId, seedDensity / 100)); setGen(0); flash("Reset · " + (SHAPES.find(s=>s.id===shapeId)||{}).name); }, [shapeId, seedDensity, flash]);
  const doClear = useCallback(() => { setGridA(emptyGrid()); setGen(0); flash("Grille vidée"); }, [flash]);
  const doNewSeed = useCallback(() => { setGridA(seedGrid("alea", seedDensity / 100)); setGen(0); flash("Graine · " + seedDensity + "% vivantes"); }, [seedDensity, flash]);

  const applyStyle = useCallback((id) => {
    const s = STYLES.find((x) => x.id === id);
    setStyleId(id); setSnd(s.params); setScaleId(s.scale); setArp(s.params.arp);
    flash("Style · " + s.name);
  }, [flash]);
  const cycleStyle = useCallback((dir) => {
    const i = STYLES.findIndex((s) => s.id === styleId);
    applyStyle(STYLES[(i + dir + STYLES.length) % STYLES.length].id);
  }, [styleId, applyStyle]);

  const paintCell = useCallback((r, c, val) => {
    setGrid((prev) => { const g = cloneGrid(prev); symPoints(r, c, symId).forEach(([a, b]) => { g[a][b] = val; }); return g; });
    setAges((prev) => { const a = cloneGrid(prev); symPoints(r, c, symId).forEach(([x, y]) => { a[x][y] = val ? 1 : 0; }); return a; });
  }, [symId]);

  const setSndKey = (k, v) => setSnd((p) => ({ ...p, [k]: v }));

  /* ---------- presets ---------- */
  const persist = (next) => { setPresets(next); try { localStorage.setItem(LS_PRESETS, JSON.stringify(next)); } catch (e) {} };
  const captureState = (cat) => {
    if (cat === "gol") return { grid: cloneGrid(grid), ruleId, symId, shapeId, styleId, tonic, scaleId, octave, snd, bpm, ageScheme };
    if (cat === "sons") return { snd, styleId, phaserOn, flangerOn, phaserDepth, flangerDepth, scaleId };
    return { drumPat: drumPat.map((r) => r.slice()), mutes: [...mutes], swing, volDrums };
  };
  const savePreset = (i) => {
    const key = presetKey;
    const next = { ...presets, [key]: presets[key].slice() };
    const ex = next[key][i];
    next[key][i] = {
      name: ex ? ex.name : (key === "gol" ? "GoL " : key === "sons" ? "Snd " : "Drm ") + (i + 1),
      color: ex ? ex.color : style.color,
      data: captureState(key),
    };
    persist(next); setLastPad(i); flash("Sauvegardé · " + key + " " + (i + 1));
  };
  const loadPreset = (i) => {
    const key = presetKey; const p = presets[key][i]; if (!p) return;
    const d = p.data; setLastPad(i);
    if (key === "gol") {
      setGridA(cloneGrid(d.grid)); setRuleId(d.ruleId); setSymId(d.symId); setShapeId(d.shapeId);
      setStyleId(d.styleId); setTonic(d.tonic); setScaleId(d.scaleId); setOctave(d.octave); setSnd(d.snd); setBpm(d.bpm);
      if (d.ageScheme) setAgeScheme(d.ageScheme); setGen(0); setView("play.gol");
    } else if (key === "sons") {
      setSnd(d.snd); setStyleId(d.styleId); setPhaserOn(d.phaserOn); setFlangerOn(d.flangerOn);
      setPhaserDepth(d.phaserDepth); setFlangerDepth(d.flangerDepth); if (d.scaleId) setScaleId(d.scaleId);
    } else {
      setDrumPat(d.drumPat.map((r) => r.slice())); setMutes([...d.mutes]); setSwing(d.swing); setVolDrums(d.volDrums); setView("play.drum");
    }
    flash("Chargé · " + p.name);
  };
  const renamePreset = (i, name) => {
    const key = presetKey; const next = { ...presets, [key]: presets[key].slice() };
    if (next[key][i]) { next[key][i] = { ...next[key][i], name: name.slice(0, 8) || next[key][i].name }; persist(next); }
  };
  const recolorLast = (color) => {
    if (lastPad < 0) return; const key = presetKey; const next = { ...presets, [key]: presets[key].slice() };
    if (next[key][lastPad]) { next[key][lastPad] = { ...next[key][lastPad], color }; persist(next); }
  };

  /* ---------- clavier ---------- */
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea" || e.target.isContentEditable) return;
      switch (e.key) {
        case " ": e.preventDefault(); togglePlay(); break;
        case "r": case "R": doReset(); break;
        case "c": case "C": doClear(); break;
        case "n": case "N": doNewSeed(); break;
        case "1": setView("play.gol"); break;
        case "2": setView("play.drum"); break;
        case "3": setView("presets.gol"); break;
        case "4": setView("presets.drum"); break;
        case "5": setView("presets.sons"); break;
        case "s": case "S": setView("presets.gol"); flash("Presets — Shift+clic pour sauver"); break;
        case "ArrowRight": e.preventDefault(); setBpm((b) => clamp(b + 1, 20, 200)); break;
        case "ArrowLeft": e.preventDefault(); setBpm((b) => clamp(b - 1, 20, 200)); break;
        case "ArrowUp": e.preventDefault(); setOctave((o) => clamp(o + 1, -2, 2)); break;
        case "ArrowDown": e.preventDefault(); setOctave((o) => clamp(o - 1, -2, 2)); break;
        case "[": cycleStyle(-1); break;
        case "]": cycleStyle(1); break;
        case "?": setHelp((h) => !h); break;
        case "Escape": setHelp(false); setDensityPop(false); break;
        default: break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, doReset, doClear, doNewSeed, cycleStyle, flash]);

  const live = countLive(grid);
  const cellColor = useCallback((r, c) => ageColor(ages[r][c], ageScheme, accent, ageMax, highlightNew && playing), [ages, ageScheme, accent, ageMax, highlightNew, playing]);

  /* ============================================================
     BLOCS RÉUTILISABLES
     ============================================================ */
  const Panel = ({ id, title, num, children, collapsible }) => {
    const isCol = collapsible && collapsed[id];
    return (
      <section className={"panel" + (isCol ? " collapsed" : "")}>
        <div className="panel-head" onClick={collapsible ? () => setCollapsed((c) => ({ ...c, [id]: !c[id] })) : undefined} style={collapsible ? { cursor: "pointer" } : null}>
          <span className="dot" />
          <h3>{title}</h3>
          <span className="num">{num}</span>
          {collapsible && <span className="chev">▾</span>}
        </div>
        <div className="panel-body">{children}</div>
      </section>
    );
  };

  const Transport = ({ compact }) => (
    <div className="transport">
      <PlayButton playing={playing} onClick={togglePlay} />
      <Lcd label="Tempo" value={bpm} unit="BPM" />
      <Lcd label="Génér." value={String(gen).padStart(2, "0")} unit={seqMode === "drum" ? "drum" : "GoL"} />
      <div className="lcd-pop-wrap">
        <button className="lcd lcd-btn" onClick={() => setDensityPop((p) => !p)} title="Régler le ratio vivantes/mortes du reset aléatoire">
          <span className="lcd-label">Cellules</span>
          <span className="lcd-val">{String(live).padStart(2, "0")}</span>
          <span className="lcd-unit">vivantes ▾</span>
        </button>
        {densityPop && (
          <div className="density-pop" onClick={(e) => e.stopPropagation()}>
            <div className="dp-head">Densité au reset aléatoire</div>
            <ParamSlider label="Vivantes" value={seedDensity} min={2} max={90} unit="%" onChange={setSeedDensity} />
            <div className="dp-meter"><span style={{ width: seedDensity + "%" }} /></div>
            <div className="dp-actions">
              <Btn onClick={() => { doNewSeed(); }}>Générer</Btn>
              <Btn onClick={() => setDensityPop(false)}>OK</Btn>
            </div>
          </div>
        )}
      </div>
      <div className="t-sliders">
        <div className="t-slider"><ParamSlider label="BPM" value={bpm} min={20} max={200} onChange={setBpm} /></div>
        <div className="t-slider"><ParamSlider label="Luminosité" value={luminosite} min={0} max={100} unit="%" onChange={setLuminosite} /></div>
        <div className="t-slider"><ParamSlider label="Volume" value={volume} min={0} max={100} unit="%" onChange={setVolume} /></div>
      </div>
      <div className="grow" />
      <div className="t-btns">
        <Btn onClick={doReset} title="R">Reset</Btn>
        <Btn warn onClick={doClear} title="C">Clear</Btn>
        {!compact && <Btn onClick={doNewSeed} title="N">Seed</Btn>}
        <Btn onClick={() => setView("presets.gol")}>Save</Btn>
        <Btn onClick={() => setView("presets.gol")}>Load</Btn>
      </div>
    </div>
  );

  const StyleRow = () => (
    <section className="panel">
      <div className="panel-head"><span className="dot" /><h3>Style musical</h3><span className="num">[ ]</span></div>
      <div className="panel-body" style={{ paddingBottom: "calc(var(--pad) - 2px)" }}>
        <div className="style-row">
          {STYLES.map((s) => (
            <StylePad key={s.id} style={s} active={s.id === styleId} onClick={() => applyStyle(s.id)} />
          ))}
        </div>
      </div>
    </section>
  );

  const MatrixTabs = () => (
    <div className="matrix-tabs grouped">
      {["play", "presets"].map((g) => (
        <div className={"tab-group" + (cat === g ? " active" : "")} key={g}>
          <span className="tg-label">{g === "play" ? "Play" : "Presets"}</span>
          <div className="tg-btns">
            {VIEWS[g].map(([v, lbl]) => (
              <button key={v} className={"matrix-tab" + (view === v ? " on" : "")} onClick={() => setView(v)}>{lbl}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const MatrixStage = () => (
    <div className="matrix-stage">
      <MatrixTabs />
      <div className="matrix-bezel" style={{ "--accent": accent, "--bloom": t.bloom }}>
        <div className="matrix-size">
          {view === "play.gol" && (
            <MatrixView grid={grid} scanCol={t.scanGlow ? scanCol : -1} clickable cellColor={cellColor} onPaint={paintCell} />
          )}
          {view === "play.drum" && (
            <div className="matrix-screen drum-host">
              <DrumGrid tracks={DRUM_TRACKS} pattern={drumPat} scanCol={t.scanGlow ? scanCol : -1} mutes={mutes}
                onToggle={(ti, si) => setDrumPat((p) => { const n = p.map((r) => r.slice()); n[ti][si] = n[ti][si] ? 0 : 1; return n; })} />
            </div>
          )}
          {cat === "presets" && (
            <div className="matrix-screen pad-host">
              <PadBank slots={presets[presetKey]} accent={accent} onLoad={loadPreset} onSave={savePreset} onRename={renamePreset} />
            </div>
          )}
        </div>
      </div>
      {cat === "presets" ? (
        <div className="matrix-foot">
          <div className="mini-note">
            Page <b style={{ color: accent }}>{presetKey === "gol" ? "Dessins GoL" : presetKey === "drum" ? "Patterns Drum" : "Sons / Instruments"}</b> · 16 emplacements
          </div>
          <div className="pal-row">
            {PRESET_PALETTE.map((c) => (
              <button key={c} title="Recolorer le dernier pad" onClick={() => recolorLast(c)}
                style={{ "--pc": c }} className="pal-dot" />
            ))}
          </div>
          <div className="mini-note">Clic = charger · Shift+clic = sauver · Double-clic = renommer</div>
        </div>
      ) : (
        <div className="mini-note">
          {view === "play.gol"
            ? `Gén. ${gen} · ${live} cellules · ${(RULES.find(r=>r.id===ruleId)||{}).bs} · clic pour dessiner`
            : `Drum · 8 pistes × 32 pas · banc haut 1-16, banc bas 17-32`}
        </div>
      )}
    </div>
  );

  /* ---- panneaux de contrôle ---- */
  const PanelVie = () => (
    <Panel id="vie" title="Jeu de la vie" num="01">
      <ParamSelect label="Règle" value={ruleId} options={RULES.map((r) => ({ value: r.id, label: r.name + " · " + r.bs }))} onChange={setRuleId} />
      <ParamSelect label="Symétrie" value={symId} options={SYMMETRIES.map((s) => ({ value: s.id, label: s.name }))} onChange={setSymId} />
      <ParamSelect label="Forme dép." value={shapeId} options={SHAPES.map((s) => ({ value: s.id, label: s.name }))} onChange={(v) => { setShapeId(v); setGridA(seedGrid(v, seedDensity / 100)); setGen(0); }} />
      <ParamSlider label="Évol. / n balayages" value={evoSweeps} min={1} max={8} unit="x" onChange={setEvoSweeps} />
      <div className="divider" />
      <div className="sub-label">Âge des cellules</div>
      <ParamSelect label="Coloration" value={ageScheme} options={[
        { value: "none", label: "Aucune (plat)" }, { value: "chaleur", label: "Chaleur (→ blanc)" },
        { value: "froid", label: "Froid (→ cyan)" }, { value: "spectre", label: "Spectre (teinte)" },
      ]} onChange={setAgeScheme} />
      <ParamSlider label="Âge max (palier)" value={ageMax} min={2} max={24} unit="g" onChange={setAgeMax} />
      <LToggle label="Flash nouveau-nées" value={highlightNew} onChange={setHighlightNew} />
    </Panel>
  );

  const PanelMusical = () => (
    <Panel id="mus" title="Musical" num="02">
      <div className="two-col">
        <ParamSelect label="Tonique" value={String(tonic)} options={TONICS.map((n, i) => ({ value: String(i), label: n }))} onChange={(v) => setTonic(+v)} />
        <Stepper label="Octave" value={octave} min={-2} max={2} onChange={setOctave} fmt={(v) => (v > 0 ? "+" : "") + v} />
      </div>
      <ParamSelect label="Gamme" value={scaleId} options={SCALES.map((s) => ({ value: s.id, label: s.name }))} onChange={setScaleId} />
      <div className="two-col">
        <ParamSelect label="Sens" value={sens} options={[{ value: "down", label: "Descendant" }, { value: "up", label: "Montant" }, { value: "pingpong", label: "Aller-retour" }, { value: "quintes", label: "Quintes" }]} onChange={setSens} />
        <ParamSelect label="Subdiv." value={String(subdiv)} options={[{ value: "1", label: "×1" }, { value: "2", label: "×2" }, { value: "3", label: "×3" }]} onChange={(v) => setSubdiv(+v)} />
      </div>
      <LToggle label="Arpégiateur" value={arp} onChange={setArp} />
    </Panel>
  );

  const PanelSon = () => (
    <Panel id="son" title="Son · Synthèse" num="03" collapsible>
      <ParamSelect label="Forme d'onde" value={snd.wave} options={WAVEFORMS.map((w) => ({ value: w.id, label: w.name }))} onChange={(v) => setSndKey("wave", v)} />
      <div className="divider" />
      <div className="two-col">
        <ParamSlider label="Attack" value={snd.attack} min={0} max={1000} unit="ms" onChange={(v) => setSndKey("attack", v)} />
        <ParamSlider label="Decay" value={snd.decay} min={0} max={1000} unit="ms" onChange={(v) => setSndKey("decay", v)} />
        <ParamSlider label="Sustain" value={snd.sustain} min={0} max={100} unit="%" onChange={(v) => setSndKey("sustain", v)} />
        <ParamSlider label="Release" value={snd.release} min={0} max={2000} unit="ms" onChange={(v) => setSndKey("release", v)} />
      </div>
      <div className="divider" />
      <ParamSlider label="Cutoff" value={snd.cutoff} min={0} max={100} unit="%" onChange={(v) => setSndKey("cutoff", v)} />
      <ParamSlider label="Résonance" value={snd.reso} min={0} max={100} unit="%" onChange={(v) => setSndKey("reso", v)} />
      <ParamSlider label="LFO cutoff" value={snd.lfo} min={0} max={64} onChange={(v) => setSndKey("lfo", v)} />
    </Panel>
  );

  const PanelEffets = () => (
    <Panel id="fx" title="Effets · Espace" num="04" collapsible>
      <ParamSlider label="Reverb" value={snd.reverb} min={0} max={100} unit="%" onChange={(v) => setSndKey("reverb", v)} />
      <div className="field"><span className="ctl-label">Phaser</span><LToggle value={phaserOn} onChange={setPhaserOn} /></div>
      {phaserOn && <ParamSlider label="Phaser prof." value={phaserDepth} min={0} max={100} unit="%" onChange={setPhaserDepth} />}
      <div className="field"><span className="ctl-label">Flanger</span><LToggle value={flangerOn} onChange={setFlangerOn} /></div>
      {flangerOn && <ParamSlider label="Flanger prof." value={flangerDepth} min={0} max={100} unit="%" onChange={setFlangerDepth} />}
      <div className="divider" />
      <ParamSlider label="Détune" value={snd.detune} min={0} max={50} unit="ct" onChange={(v) => setSndKey("detune", v)} />
      <ParamSlider label="Stéréo" value={snd.stereo} min={0} max={100} unit="%" onChange={(v) => setSndKey("stereo", v)} />
    </Panel>
  );

  const PanelDrumMix = () => (
    <Panel id="mix" title={cat === "presets" && presetKey === "drum" ? "Drum · Mix" : view === "play.drum" ? "Drum · Mix" : "Rendu"} num="05">
      {view === "play.drum" || presetKey === "drum" ? (
        <>
          <ParamSelect label="Pattern init." value="" options={[
            { value: "", label: "— Charger —" }, { value: "4/4", label: "House 4/4" },
            { value: "trap", label: "Trap" }, { value: "afro", label: "Afrobeat" },
            { value: "bossa", label: "Bossa" }, { value: "vide", label: "Vide" },
          ]} onChange={(v) => { if (v && DRUM_PATTERNS[v]) { setDrumPat(DRUM_PATTERNS[v]()); flash("Pattern · " + v); } }} />
          <ParamSlider label="Swing" value={swing} min={0} max={100} unit="%" onChange={setSwing} />
          <ParamSlider label="Vol. drums" value={volDrums} min={0} max={100} unit="%" onChange={setVolDrums} />
          <div className="divider" />
          <div className="sub-label">Mute pistes</div>
          <div className="mute-row">
            {DRUM_TRACKS.map((tr, ti) => (
              <button key={tr.id} className={"mute-chip" + (mutes[ti] ? " muted" : "")} style={{ "--mc": tr.color }}
                onClick={() => setMutes((m) => m.map((x, i) => i === ti ? !x : x))}>{tr.id}</button>
            ))}
          </div>
        </>
      ) : (
        <>
          <ParamSlider label="Luminosité LED" value={luminosite} min={0} max={100} unit="%" onChange={setLuminosite} />
          <ParamSlider label="Volume" value={volume} min={0} max={100} unit="%" onChange={setVolume} />
          <div className="divider" />
          <div className="mini-note" style={{ textAlign: "left" }}>Astuce : clique sur l'écran LCD « Cellules » pour régler la densité du reset aléatoire.</div>
        </>
      )}
    </Panel>
  );

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className={"app density-" + t.density} style={{ "--accent": accent, "--bloom": t.bloom }} onClick={() => densityPop && setDensityPop(false)}>
      <div className="brandbar">
        <span className="wordmark">LIF2D</span>
        <span className="brand-sub">Sim Pure · 16×16 · Conway Engine</span>
        <span className="spacer" />
        <div className="mode-toggle">
          <button className="on">Sim Pure</button>
          <button title="Mode réaliste (à venir)" onClick={() => flash("Mode réaliste — à venir")}>Machine</button>
        </div>
      </div>

      {t.layout === "console" ? (
        <>
          <Transport />
          <div className="workspace console">
            <div className="col left">
              <PanelVie />
              <PanelMusical />
              <PanelDrumMix />
            </div>
            <div className="col center">
              <MatrixStage />
              <StyleRow />
            </div>
            <div className="col right">
              <PanelSon />
              <PanelEffets />
            </div>
          </div>
        </>
      ) : (
        <div className="workspace rack">
          <div className="rack-left">
            <Transport compact />
            <MatrixStage />
            <StyleRow />
          </div>
          <div className="rack-modules">
            <PanelVie />
            <PanelMusical />
            <PanelSon />
            <PanelEffets />
            <PanelDrumMix />
          </div>
        </div>
      )}

      <div className="legend">
        <span><kbd>Espace</kbd>play</span>
        <span><kbd>R</kbd>reset</span>
        <span><kbd>C</kbd>clear</span>
        <span><kbd>1·2</kbd>play</span>
        <span><kbd>3·4·5</kbd>presets</span>
        <span><kbd>← →</kbd>bpm</span>
        <span><kbd>[ ]</kbd>style</span>
        <Btn className="help-trigger" onClick={() => setHelp(true)} title="?">? Aide</Btn>
      </div>

      {help && <HelpOverlay onClose={() => setHelp(false)} />}
      {toast && <div className="toast">{toast}</div>}

      <TweaksPanel title="LIF2D Tweaks">
        <TweakSection label="Layout" />
        <TweakRadio label="Disposition" value={t.layout} options={["console", "rack"]} onChange={(v) => setTweak("layout", v)} />
        <TweakRadio label="Densité" value={t.density} options={["compact", "cozy"]} onChange={(v) => setTweak("density", v)} />
        <TweakSection label="Rendu LED" />
        <TweakSlider label="Halo (bloom)" value={t.bloom} min={0.3} max={2.2} step={0.1} onChange={(v) => setTweak("bloom", v)} />
        <TweakToggle label="Couleur par style" value={t.styleColorCoding} onChange={(v) => setTweak("styleColorCoding", v)} />
        <TweakToggle label="Glow du balayage" value={t.scanGlow} onChange={(v) => setTweak("scanGlow", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
