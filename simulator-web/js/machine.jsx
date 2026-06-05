/* ==========================================================================
   LIF2D — Vue Machine : matrice centrale, 4 coins + 4 bays symétriques.
   Layout CSS Grid 3×3 (.lif-frame), esthétique steampunk laiton/bois.
   ========================================================================== */

function MachineView({ ctx }) {
  const {
    p, set, grid, gen, pitches, playing, playCol, measure, cursor,
    penState, setPenState, live,
    togglePlay, doReset, doClear, doSave, doLoad,
    stampShape, paint, moveCursor, t,
    drumMode, setDrumMode, drumPattern, paintDrum,
  } = ctx;

  const pop = window.gridPopulation(grid);

  // Conversions pot ↔ valeur
  const pot     = (lo, hi, v) => (v - lo) / (hi - lo);
  const fromPot = (lo, hi, x) => Math.round(lo + x * (hi - lo));
  const cyc     = (idx, len, dir) => (idx + dir + len) % len;

  /* ---- Châsse matrice centrale (avec rivets) ------------------------------ */
  const matrixBlock = (
    <div className="lif-porthole gmtx">
      <window.Matrix
        grid={grid} gen={gen} pitches={pitches}
        brightness={p.brightness} bloom={t.bloom} warm={t.ledWarm}
        playCol={playing ? playCol : -1} playing={playing}
        cursor={cursor} drawMode={penState !== 0}
        onPaint={drumMode ? paintDrum : paint}
        drumMode={drumMode} drumPattern={drumPattern} />
      <div className="lif-rivet tl" />
      <div className="lif-rivet tr" />
      <div className="lif-rivet bl" />
      <div className="lif-rivet br" />
    </div>
  );

  /* ---- Coin : socle avec un seul potentiomètre --------------------------- */
  const cornerPot = (cls, label, value, display, onChange) => (
    <div className={`lif-mount ${cls}`}>
      <RotaryPot label={label} value={value} display={display} onChange={onChange} />
    </div>
  );

  /* ---- Haut : bay Séquenceur (transport + mesure + pills) ---------------- */
  const transportBay = (
    <div className="lif-bay gtop" style={{ minWidth: 360 }}>
      <div className="lif-bay-title">Séquenceur</div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
        <div className="lif-screen">
          <div className="lbl">Tempo</div>
          <div className="big">{p.bpm}</div>
          <div className="unit">BPM</div>
        </div>
        <PushButton
          big
          label={playing ? 'Pause' : 'Play'}
          active={playing}
          color={playing ? '#7ad06b' : 'var(--brass)'}
          onClick={togglePlay} />
        <div className="lif-screen">
          <div className="lbl">Mesure</div>
          <div className="big">
            {p.loopOn
              ? String(measure % window.LOOP_BARS[p.loopLen] + 1).padStart(2, '0')
              : String((measure % 999) + 1).padStart(3, '0')}
          </div>
          <div className="unit">
            {p.loopOn ? `/${window.LOOP_BARS[p.loopLen]}` : '∞'} · {pop}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
        <button className="lif-pill" onClick={doReset}>Reset</button>
        <button className="lif-pill" onClick={doClear}>Clear</button>
        <button className="lif-pill" onClick={doSave}>Save</button>
        <button className="lif-pill" onClick={doLoad}>Load</button>
        {/* 🎓 Mode Drum : la matrice affiche le pattern rythmique et GoL est gelé */}
        <button
          className={`lif-pill ${drumMode ? 'is-active' : ''}`}
          onClick={() => setDrumMode((v) => !v)}>
          {drumMode ? 'DRUM' : 'GoL'}
        </button>
      </div>
    </div>
  );

  /* ---- Bas : bay Dessin (molettes ardoise + stylo + formes) -------------- */
  const penColor = penState === 2 ? '#d9534f' : penState === 1 ? 'var(--brass)' : '#5a4a32';
  const penLabel = penState === 2 ? 'Gomme'   : penState === 1 ? 'Tracer'       : 'Lever';

  const drawBay = (
    <div className="lif-bay gbot" style={{ minWidth: 360 }}>
      <div className="lif-bay-title">Dessin · Ardoise</div>
      <div style={{ display: 'flex', gap: 22, alignItems: 'center', justifyContent: 'center' }}>
        <DrawWheel axis="x" label="Axe X" onStep={(d) => moveCursor(d, 0)} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <PushButton
            label={penLabel}
            active={penState !== 0}
            color={penColor}
            onClick={() => setPenState((s) => (s + 1) % 3)} />
          <div className="lif-readout">{cursor.x},{cursor.y}</div>
        </div>
        <DrawWheel axis="y" label="Axe Y" onStep={(d) => moveCursor(0, d)} />
      </div>
      <div className="lif-seg" style={{ marginTop: 12, justifyContent: 'center' }}>
        {window.SHAPE_NAMES.map((sn) => (
          <button key={sn} className={p.shape === sn ? 'is-on' : ''} onClick={() => stampShape(sn)}>
            {sn}
          </button>
        ))}
      </div>
    </div>
  );

  /* ---- Côté gauche : HP + encodeurs Règle & Gamme + fader Reverb --------- */
  const leftRail = (
    <div className="lif-bay glft">
      <div className="lif-bay-title">Banque</div>
      <div className="lif-rail">
        <Speaker active={live} />
        <Encoder
          label="Règle"
          display={window.RULES[p.ruleIdx].name}
          onStep={(d) => set('ruleIdx', (i) => cyc(i, window.RULES.length, d))}
          onClick={() => set('ruleIdx', 2)} />
        <Encoder
          label="Gamme"
          display={window.SCALES[p.scaleIdx].name.slice(0, 9)}
          onStep={(d) => set('scaleIdx', (i) => cyc(i, window.SCALES.length, d))}
          onClick={() => set('scaleIdx', 0)} />
        <Slider
          label="Reverb"
          value={p.reverb}
          display={`${Math.round(p.reverb * 100)}%`}
          onChange={(x) => set('reverb', x)} />
      </div>
    </div>
  );

  /* ---- Côté droit : HP + encodeurs Tonique & Preset + fader Résonance ---- */
  const rightRail = (
    <div className="lif-bay grgt">
      <div className="lif-bay-title">Voix</div>
      <div className="lif-rail">
        <Speaker active={live} />
        <Encoder
          label="Tonique"
          display={window.NOTE_NAMES[p.tonic]}
          onStep={(d) => set('tonic', (i) => cyc(i, 12, d))}
          onClick={() => set('tonic', 9)} />
        <Encoder
          label="Preset"
          display={window.PRESETS[p.presetIdx]}
          onStep={(d) => {
            const ni = cyc(p.presetIdx, window.PRESETS.length, d);
            const pr = window.PRESET_MAP[window.PRESETS[ni]];
            set('presetIdx', ni);
            set('waveIdx',   pr.w);
            set('attack',    pr.a);
            set('decay',     pr.d);
            set('sustain',   pr.s);
            set('release',   pr.r);
          }} />
        <Slider
          label="Réson."
          value={p.resonance}
          display={`${Math.round(p.resonance * 100)}%`}
          onChange={(x) => set('resonance', x)} />
      </div>
    </div>
  );

  /* ---- Vis de coin + plaque sérigraphiée --------------------------------- */
  const caseChrome = (
    <>
      <div className="lif-case-corner tl"><Screw /></div>
      <div className="lif-case-corner tr"><Screw angle={-20} /></div>
      <div className="lif-case-corner bl"><Screw angle={70}  /></div>
      <div className="lif-case-corner br"><Screw angle={120} /></div>
      <div className="lif-nameplate">LIF2D · ÉDITION ATELIER · N°001</div>
    </>
  );

  return (
    <div className="lif-case">
      {caseChrome}
      <div className="lif-frame">
        {/* Coins : 4 potentiomètres */}
        {cornerPot('gtl', 'BPM',
          pot(40, 300, p.bpm), p.bpm,
          (x) => set('bpm', fromPot(40, 300, x)))}
        {cornerPot('gtr', 'Lumino',
          pot(0.1, 1, p.brightness), `${Math.round(p.brightness * 100)}%`,
          (x) => set('brightness', 0.1 + x * 0.9))}
        {cornerPot('gbl', 'Volume',
          p.volume, `${Math.round(p.volume * 100)}%`,
          (x) => set('volume', x))}
        {cornerPot('gbr', 'Cutoff',
          p.cutoff, `${Math.round(p.cutoff * 100)}%`,
          (x) => set('cutoff', x))}
        {/* Bays */}
        {transportBay}
        {leftRail}
        {matrixBlock}
        {rightRail}
        {drawBay}
      </div>
    </div>
  );
}

window.MachineView = MachineView;
