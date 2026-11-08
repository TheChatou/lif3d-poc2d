/* ==========================================================================
   LIF2D — Vue Expert : surface de réglage avancé (9 cartes).
   Contrôles : sliders pleine largeur, selects gravés, segmented, toggles inline.
   ========================================================================== */

/* ---- Mini matrice aperçu ------------------------------------------------- */
// Rendu mémoïsé des 256 points (re-render uniquement sur nouvelle génération).
const MiniDots = React.memo(function MiniDots({ grid, pitches, warm }) {
  const dots = [];
  for (let y = 0; y < window.GRID; y++) {
    for (let x = 0; x < window.GRID; x++) {
      const age = grid[y][x];
      let style;
      if (age > 0) {
        const midi  = window.rowToPitch(y, pitches);
        const base  = window.noteHue(midi);
        const hue   = warm ? Math.round(18 + (base / 360) * 62) : base;
        const L     = 44 + Math.min(age / 4, 1) * 28;
        style = { background: `hsl(${hue} 82% ${L}%)` };
      }
      dots.push(
        <div key={y * 16 + x}
             className={`lif-mini-dot${age > 0 ? ' on' : ''}`}
             style={style} />
      );
    }
  }
  return <>{dots}</>;
},
(a, b) => a.gen === b.gen && a.pitches === b.pitches && a.warm === b.warm);

function MiniMatrix({ grid, gen, pitches, playing, playCol, warm }) {
  const pct = `${(100 / window.GRID)}%`;
  return (
    <div>
      <div className="lif-mini-mtx">
        <div className="lif-mini-grid">
          <MiniDots grid={grid} gen={gen} pitches={pitches} warm={warm} />
        </div>
        {playing && playCol >= 0 && (
          <div className="lif-mini-ph"
               style={{ left: `${(playCol / window.GRID) * 100}%`, width: pct }} />
        )}
      </div>
      <div className="lif-mini-gen">
        Gén. <span>{gen}</span>
      </div>
    </div>
  );
}

/* ---- Composants locaux à cette vue --------------------------------------- */

function Seg({ options, value, onChange }) {
  return (
    <div className="lif-seg">
      {options.map((o, i) => (
        <button key={i} className={value === i ? 'is-on' : ''} onClick={() => onChange(i)}>
          {o}
        </button>
      ))}
    </div>
  );
}

function Sel({ options, value, onChange }) {
  return (
    <span className="lif-select">
      <select value={value} onChange={(e) => onChange(+e.target.value)}>
        {options.map((o, i) => <option key={i} value={i}>{o}</option>)}
      </select>
    </span>
  );
}

function Mini({ value, min, max, step = 1, onChange }) {
  return (
    <input className="lif-mini" type="range"
      min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(+e.target.value)} />
  );
}

function IToggle({ on, onChange }) {
  return (
    <button className={`lif-itoggle ${on ? 'is-on' : ''}`}
      onClick={() => onChange(!on)} />
  );
}

// Ligne label + contrôle sur une même ligne
function XRow({ k, v, children }) {
  return (
    <div className="lif-xrow">
      <span className="k">{k}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {v !== undefined && <span className="v">{v}</span>}
        {children}
      </div>
    </div>
  );
}

// Ligne label+valeur au-dessus, slider pleine largeur dessous
function SRow({ k, v, ...miniProps }) {
  return (
    <div className="lif-srow">
      <div className="top"><span className="k">{k}</span><span className="v">{v}</span></div>
      <Mini {...miniProps} />
    </div>
  );
}

// Carte de réglage avec titre
function Card({ title, num, span, children }) {
  return (
    <div className={`lif-xcard ${span ? 'span2' : ''}`}>
      <div className="lif-xcard-h">
        <span className="dot" />
        {title}
        <span className="num">{num}</span>
      </div>
      {children}
    </div>
  );
}

/* ---- Vue Expert ---------------------------------------------------------- */
function ExpertView({ ctx }) {
  const {
    p, set, playing, measure, grid, gen, pitches, playCol, t,
    togglePlay, doReset, doClear, doSave, doLoad,
    loopFrameCount, loopPlayPos,
  } = ctx;
  const pop      = window.gridPopulation(grid);
  const loopBars = window.LOOP_BARS[p.loopLen] ?? 4;

  return (
    <div className="lif-expert">

      {/* Barre transport */}
      <div className="lif-xcard lif-expert-transport">
        <PushButton big active={playing}
          color={playing ? '#7ad06b' : 'var(--brass)'}
          onClick={togglePlay} />
        <div className="lif-screen">
          <div className="lbl">Tempo</div>
          <div className="big">{p.bpm}</div>
          <div className="unit">BPM</div>
        </div>
        <div className="lif-screen">
          <div className="lbl">Mesure</div>
          <div className="big">
            {p.loopOn
              ? String(measure % loopBars + 1).padStart(2, '0')
              : String((measure % 999) + 1).padStart(3, '0')}
          </div>
          <div className="unit">{p.loopOn ? `/${loopBars}` : '∞'}</div>
        </div>
        <div className="lif-screen">
          <div className="lbl">Cellules</div>
          <div className="big">{pop}</div>
          <div className="unit">VIVANTES</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="lif-pill" onClick={doReset}>Reset</button>
          <button className="lif-pill" onClick={doClear}>Clear</button>
          <button className="lif-pill" onClick={doSave}>Save</button>
          <button className="lif-pill" onClick={doLoad}>Load</button>
        </div>
      </div>

      {/* Grille des 9 cartes */}
      <div className="lif-expert-grid">

        {/* 01 — Séquenceur */}
        <Card title="Séquenceur" num="01">
          <SRow k="BPM" v={p.bpm}
            value={p.bpm} min={20} max={140}
            onChange={(v) => set('bpm', v)} />
          <SRow k="Luminosité" v={`${Math.round(p.brightness * 100)}%`}
            value={Math.round(p.brightness * 100)} min={10} max={100}
            onChange={(v) => set('brightness', v / 100)} />
          <XRow k="Loop">
            <IToggle on={p.loopOn} onChange={(v) => set('loopOn', v)} />
          </XRow>
          {p.loopOn && (
            <React.Fragment>
              <XRow k="Durée loop">
                <Seg options={window.LOOP_LENGTHS} value={p.loopLen}
                  onChange={(v) => set('loopLen', v)} />
              </XRow>
              <XRow k="Lecture">
                <Seg options={['→ Boucle', '↔ Aller-retour']}
                  value={p.loopPingPong ? 1 : 0}
                  onChange={(v) => set('loopPingPong', v === 1)} />
              </XRow>
              <XRow k="Frame figée"
                v={loopFrameCount ? `${(loopPlayPos % loopFrameCount) + 1} / ${loopFrameCount}` : '—'} />
            </React.Fragment>
          )}
        </Card>

        {/* 02 — Jeu de la Vie */}
        <Card title="Jeu de la Vie" num="02">
          <XRow k="Règle">
            <Sel options={window.RULES.map((r) => `${r.name} · ${r.notation}`)}
              value={p.ruleIdx} onChange={(v) => set('ruleIdx', v)} />
          </XRow>
          <XRow k="Symétrie">
            <Sel options={window.SYMMETRIES} value={p.symmetry}
              onChange={(v) => set('symmetry', v)} />
          </XRow>
          <XRow k="Forme dép.">
            <Sel options={window.SHAPE_NAMES}
              value={window.SHAPE_NAMES.indexOf(p.shape)}
              onChange={(v) => ctx.stampShape(window.SHAPE_NAMES[v])} />
          </XRow>
        </Card>

        {/* 03 — Musical */}
        <Card title="Musical" num="03">
          <XRow k="Tonique">
            <Sel options={window.NOTE_NAMES} value={p.tonic}
              onChange={(v) => set('tonic', v)} />
          </XRow>
          <XRow k="Gamme">
            <Sel options={window.SCALES.map((s) => s.name)} value={p.scaleIdx}
              onChange={(v) => set('scaleIdx', v)} />
          </XRow>
          <XRow k="Arpégiateur">
            <IToggle on={p.arpOn} onChange={(v) => set('arpOn', v)} />
          </XRow>
          <XRow k="Lecture">
            <Sel options={window.ARP_MODES} value={p.arpMode}
              onChange={(v) => set('arpMode', v)} />
          </XRow>
          <XRow k="Subdivision">
            <Sel options={window.ARP_DIV} value={p.arpSpeed}
              onChange={(v) => set('arpSpeed', v)} />
          </XRow>
          <XRow k="Groove">
            <IToggle on={p.arpGroove} onChange={(v) => set('arpGroove', v)} />
          </XRow>
        </Card>

        {/* 04 — Synthèse */}
        <Card title="Synthèse" num="04">
          <XRow k="Preset">
            <Sel options={window.PRESETS} value={p.presetIdx}
              onChange={(v) => {
                const pr = window.PRESET_MAP[window.PRESETS[v]];
                set('presetIdx', v);
                set('waveIdx',   pr.w);
                set('attack',    pr.a);
                set('decay',     pr.d);
                set('sustain',   pr.s);
                set('release',   pr.r);
              }} />
          </XRow>
          <XRow k="Forme d'onde">
            <Sel options={window.WAVES} value={p.waveIdx}
              onChange={(v) => set('waveIdx', v)} />
          </XRow>
          <XRow k="Octave">
            <Seg options={['-2', '-1', '0', '+1', '+2']}
              value={p.octave + 2}
              onChange={(v) => set('octave', v - 2)} />
          </XRow>
        </Card>

        {/* 05 — Enveloppe ADSR */}
        <Card title="Enveloppe ADSR" num="05">
          <SRow k="Attack"  v={`${p.attack} ms`}
            value={p.attack}  min={1} max={200}
            onChange={(v) => set('attack', v)} />
          <SRow k="Decay"   v={`${p.decay} ms`}
            value={p.decay}   min={1} max={200}
            onChange={(v) => set('decay', v)} />
          <SRow k="Sustain" v={`${Math.round(p.sustain * 100)}%`}
            value={Math.round(p.sustain * 100)} min={0} max={100}
            onChange={(v) => set('sustain', v / 100)} />
          <SRow k="Release" v={`${p.release} ms`}
            value={p.release} min={1} max={200}
            onChange={(v) => set('release', v)} />
        </Card>

        {/* 06 — Filtre */}
        <Card title="Filtre" num="06">
          <SRow k="Cutoff"    v={`${Math.round(p.cutoff * 100)}%`}
            value={Math.round(p.cutoff * 100)}    min={5} max={100}
            onChange={(v) => set('cutoff', v / 100)} />
          <SRow k="Resonance" v={`${Math.round(p.resonance * 100)}%`}
            value={Math.round(p.resonance * 100)} min={0} max={100}
            onChange={(v) => set('resonance', v / 100)} />
        </Card>

        {/* 07 — Âge des cellules */}
        <Card title="Âge des cellules" num="07">
          <XRow k="Age → Son">
            <Sel options={window.AGE_TARGETS} value={p.ageTarget}
              onChange={(v) => set('ageTarget', v)} />
          </XRow>
          <SRow k="Age max"  v={`${p.ageMax} gén.`}
            value={p.ageMax}  min={1} max={8}
            onChange={(v) => set('ageMax', v)} />
          <SRow k="Mute ≥"   v={p.muteAge ? `${p.muteAge} gén.` : '∞'}
            value={p.muteAge || 9} min={1} max={9}
            onChange={(v) => set('muteAge', v >= 9 ? 0 : v)} />
          {/* 🎓 muteAge=0 → jamais muté (cf. condition `!P.muteAge` côté trigger) */}
        </Card>

        {/* 08 — Espace sonore */}
        <Card title="Espace sonore" num="08">
          <SRow k="Detune" v={`${p.detune} ct`}
            value={p.detune} min={0} max={50}
            onChange={(v) => set('detune', v)} />
          <SRow k="Stereo" v={`${Math.round(p.stereo * 100)}%`}
            value={Math.round(p.stereo * 100)} min={0} max={100}
            onChange={(v) => set('stereo', v / 100)} />
          <SRow k="Volume" v={`${Math.round(p.volume * 100)}%`}
            value={Math.round(p.volume * 100)} min={0} max={100}
            onChange={(v) => set('volume', v / 100)} />
        </Card>

        {/* 09 — Effets audio (2 colonnes gauche) */}
        <Card title="Effets audio" num="09" span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
            <SRow k="Reverb" v={`${Math.round(p.reverb * 100)}%`}
              value={Math.round(p.reverb * 100)} min={0} max={100}
              onChange={(v) => set('reverb', v / 100)} />
            <XRow k="Phaser">
              <IToggle on={p.phaserOn} onChange={(v) => set('phaserOn', v)} />
            </XRow>
            <SRow k="Phaser prof." v={`${Math.round(p.phaserDepth * 100)}%`}
              value={Math.round(p.phaserDepth * 100)} min={0} max={100}
              onChange={(v) => set('phaserDepth', v / 100)} />
            <XRow k="Flanger">
              <IToggle on={p.flangerOn} onChange={(v) => set('flangerOn', v)} />
            </XRow>
            <SRow k="Flanger prof." v={`${Math.round(p.flangerDepth * 100)}%`}
              value={Math.round(p.flangerDepth * 100)} min={0} max={100}
              onChange={(v) => set('flangerDepth', v / 100)} />
          </div>
        </Card>

        {/* 10 — Aperçu matrice (2 colonnes droite) */}
        <Card title="Aperçu · Matrice" num="10" span>
          <MiniMatrix
            grid={grid} gen={gen} pitches={pitches}
            playing={playing} playCol={playCol}
            warm={t.ledWarm} />
        </Card>

      </div>
    </div>
  );
}

window.ExpertView = ExpertView;
