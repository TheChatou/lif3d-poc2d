/* =========================================================================
   LIF2D — Vue Expert : tous les réglages avancés (surface technique).
   ========================================================================= */
function Seg({ options, value, onChange }) {
  return (
    <div className="lif-seg">
      {options.map((o, i) => (
        <button key={i} className={value === i ? 'is-on' : ''} onClick={() => onChange(i)}>{o}</button>
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
  return <input className="lif-mini" type="range" min={min} max={max} step={step} value={value}
    onChange={(e) => onChange(+e.target.value)} />;
}
function IToggle({ on, onChange }) {
  return <button className={`lif-itoggle ${on ? 'is-on' : ''}`} onClick={() => onChange(!on)} />;
}
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
/* ligne « curseur » : label + valeur en haut, slider pleine largeur dessous */
function SRow({ k, v, ...mini }) {
  return (
    <div className="lif-srow">
      <div className="top"><span className="k">{k}</span><span className="v">{v}</span></div>
      <Mini {...mini} />
    </div>
  );
}
function Card({ title, num, span, children }) {
  return (
    <div className={`lif-xcard ${span ? 'span2' : ''}`}>
      <div className="lif-xcard-h"><span className="dot" />{title}<span className="num">{num}</span></div>
      {children}
    </div>
  );
}

const SAMPLE_NOTES = (() => {
  const out = []; const n = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  for (let o = 2; o <= 6; o++) n.forEach((x) => out.push(x + o));
  return out;
})();

function ExpertView({ ctx }) {
  const { p, set, playing, measure, grid, togglePlay, doReset, doClear, doSave, doLoad } = ctx;
  const pop = window.gridPopulation(grid);
  return (
    <div className="lif-expert">
      {/* barre transport */}
      <div className="lif-xcard" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 18 }}>
        <PushButton big label="" active={playing} color={playing ? '#7ad06b' : 'var(--brass)'} onClick={togglePlay} />
        <div className="lif-screen"><div className="lbl">Tempo</div><div className="big">{p.bpm}</div><div className="unit">BPM</div></div>
        <div className="lif-screen"><div className="lbl">Mesure</div><div className="big">{String(measure % [2,4,8][p.loopLen] + 1).padStart(2,'0')}</div><div className="unit">/{[2,4,8][p.loopLen]}</div></div>
        <div className="lif-screen"><div className="lbl">Cellules</div><div className="big">{pop}</div><div className="unit">VIVANTES</div></div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="lif-pill" onClick={doReset}>Reset</button>
          <button className="lif-pill" onClick={doClear}>Clear</button>
          <button className="lif-pill" onClick={doSave}>Save</button>
          <button className="lif-pill" onClick={doLoad}>Load</button>
        </div>
      </div>

      <div className="lif-expert-grid">
        <Card title="Séquenceur" num="01">
          <SRow k="BPM" v={p.bpm} value={p.bpm} min={40} max={300} onChange={(v) => set('bpm', v)} />
          <SRow k="Luminosité" v={`${Math.round(p.brightness*100)}%`} value={Math.round(p.brightness*100)} min={10} max={100} onChange={(v) => set('brightness', v/100)} />
          <XRow k="Boucle"><Seg options={window.LOOP_LENGTHS} value={p.loopLen} onChange={(v) => set('loopLen', v)} /></XRow>
        </Card>

        <Card title="Jeu de la Vie" num="02">
          <XRow k="Règle"><Sel options={window.RULES.map(r => `${r.name} · ${r.notation}`)} value={p.ruleIdx} onChange={(v) => set('ruleIdx', v)} /></XRow>
          <XRow k="Symétrie"><Sel options={window.SYMMETRIES} value={p.symmetry} onChange={(v) => set('symmetry', v)} /></XRow>
          <XRow k="Forme dép."><Sel options={window.SHAPE_NAMES} value={window.SHAPE_NAMES.indexOf(p.shape)} onChange={(v) => ctx.stampShape(window.SHAPE_NAMES[v])} /></XRow>
        </Card>

        <Card title="Musical" num="03">
          <XRow k="Tonique"><Sel options={window.NOTE_NAMES} value={p.tonic} onChange={(v) => set('tonic', v)} /></XRow>
          <XRow k="Gamme"><Sel options={window.SCALES.map(s => s.name)} value={p.scaleIdx} onChange={(v) => set('scaleIdx', v)} /></XRow>
          <XRow k="Arpégiateur"><IToggle on={p.arpOn} onChange={(v) => set('arpOn', v)} /></XRow>
          <XRow k="Mode arpège"><Sel options={window.ARP_MODES} value={p.arpMode} onChange={(v) => set('arpMode', v)} /></XRow>
          <XRow k="Vitesse arp."><Sel options={window.ARP_SPEEDS} value={p.arpSpeed} onChange={(v) => set('arpSpeed', v)} /></XRow>
        </Card>

        <Card title="Synthèse" num="04">
          <XRow k="Preset"><Sel options={window.PRESETS} value={p.presetIdx} onChange={(v) => {
            const pr = PRESET_MAP[window.PRESETS[v]]; set('presetIdx', v);
            set('waveIdx', pr.w); set('attack', pr.a); set('decay', pr.d); set('sustain', pr.s); set('release', pr.r);
          }} /></XRow>
          <XRow k="Forme d'onde"><Sel options={window.WAVES} value={p.waveIdx} onChange={(v) => set('waveIdx', v)} /></XRow>
          <XRow k="Réf. sample"><Sel options={SAMPLE_NOTES} value={Math.max(0, SAMPLE_NOTES.indexOf(p.sampleRef))} onChange={(v) => set('sampleRef', SAMPLE_NOTES[v])} /></XRow>
        </Card>

        <Card title="Enveloppe ADSR" num="05">
          <SRow k="Attack" v={`${p.attack} ms`} value={p.attack} min={1} max={200} onChange={(v) => set('attack', v)} />
          <SRow k="Decay" v={`${p.decay} ms`} value={p.decay} min={1} max={200} onChange={(v) => set('decay', v)} />
          <SRow k="Sustain" v={`${Math.round(p.sustain*100)}%`} value={Math.round(p.sustain*100)} min={0} max={100} onChange={(v) => set('sustain', v/100)} />
          <SRow k="Release" v={`${p.release} ms`} value={p.release} min={1} max={200} onChange={(v) => set('release', v)} />
        </Card>

        <Card title="Filtre" num="06">
          <SRow k="Cutoff" v={`${Math.round(p.cutoff*100)}%`} value={Math.round(p.cutoff*100)} min={5} max={100} onChange={(v) => set('cutoff', v/100)} />
          <SRow k="Resonance" v={`${Math.round(p.resonance*100)}%`} value={Math.round(p.resonance*100)} min={0} max={100} onChange={(v) => set('resonance', v/100)} />
        </Card>

        <Card title="Âge des cellules" num="07">
          <XRow k="Age → Son"><Sel options={window.AGE_TARGETS} value={p.ageTarget} onChange={(v) => set('ageTarget', v)} /></XRow>
          <SRow k="Age max" v={`${p.ageMax} gén.`} value={p.ageMax} min={1} max={8} onChange={(v) => set('ageMax', v)} />
          <SRow k="Mute ≥" v={`${p.muteAge} gén.`} value={p.muteAge} min={1} max={8} onChange={(v) => set('muteAge', v)} />
        </Card>

        <Card title="Espace sonore" num="08">
          <SRow k="Detune" v={`${p.detune} ct`} value={p.detune} min={0} max={50} onChange={(v) => set('detune', v)} />
          <SRow k="Stereo" v={`${Math.round(p.stereo*100)}%`} value={Math.round(p.stereo*100)} min={0} max={100} onChange={(v) => set('stereo', v/100)} />
          <SRow k="Volume" v={`${Math.round(p.volume*100)}%`} value={Math.round(p.volume*100)} min={0} max={100} onChange={(v) => set('volume', v/100)} />
        </Card>

        <Card title="Effets audio" num="09" span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
            <SRow k="Reverb" v={`${Math.round(p.reverb*100)}%`} value={Math.round(p.reverb*100)} min={0} max={100} onChange={(v) => set('reverb', v/100)} />
            <XRow k="Phaser"><IToggle on={p.phaserOn} onChange={(v) => set('phaserOn', v)} /></XRow>
            <SRow k="Phaser prof." v={`${Math.round(p.phaserDepth*100)}%`} value={Math.round(p.phaserDepth*100)} min={0} max={100} onChange={(v) => set('phaserDepth', v/100)} />
            <XRow k="Flanger"><IToggle on={p.flangerOn} onChange={(v) => set('flangerOn', v)} /></XRow>
            <SRow k="Flanger prof." v={`${Math.round(p.flangerDepth*100)}%`} value={Math.round(p.flangerDepth*100)} min={0} max={100} onChange={(v) => set('flangerDepth', v/100)} />
          </div>
        </Card>
      </div>
    </div>
  );
}

window.ExpertView = ExpertView;
