/* =========================================================================
   LIF2D — Moteur audio léger (Web Audio).
   Synth mono-osc + ADSR + filtre passe-bas + reverb (feedback delay).
   Volontairement compact : le rendu fidèle sera recodé côté Claude Code.
   ========================================================================= */

function makeAudio() {
  let ctx = null;
  let master, filter, wet, dry, delay, fbGain;
  let voices = 0;
  const MAXVOICES = 12;

  const state = {
    volume: 0.7, cutoff: 0.7, resonance: 0.2,
    wave: 'Sine', reverb: 0.25,
    attack: 6, decay: 60, sustain: 0.5, release: 120,
    detune: 0, stereo: 0.4, muted: false,
  };

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    // reverb très simple : feedback delay
    delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.18;
    fbGain = ctx.createGain();
    fbGain.gain.value = 0.35;
    wet = ctx.createGain();
    dry = ctx.createGain();
    delay.connect(fbGain); fbGain.connect(delay);
    delay.connect(wet);
    filter.connect(dry);
    filter.connect(delay);
    dry.connect(master); wet.connect(master);
    master.connect(ctx.destination);
    apply();
    return ctx;
  }

  function apply() {
    if (!ctx) return;
    master.gain.value = state.muted ? 0 : state.volume;
    filter.frequency.value = 120 + state.cutoff * state.cutoff * 9000;
    filter.Q.value = state.resonance * 18;
    wet.gain.value = state.reverb * 0.9;
    dry.gain.value = 1 - state.reverb * 0.4;
  }

  function setParams(p) { Object.assign(state, p); apply(); }

  function resume() { ensure(); if (ctx.state === 'suspended') ctx.resume(); }

  const WAVEMAP = { Sine: 'sine', 'Carré': 'square', Scie: 'sawtooth', Triangle: 'triangle' };

  function trigger(freq, vel = 1, pan = 0) {
    if (state.muted) return;
    ensure();
    if (ctx.state === 'suspended') ctx.resume();
    if (voices >= MAXVOICES) return;
    const t = ctx.currentTime;
    const a = Math.max(0.001, state.attack / 1000);
    const d = Math.max(0.001, state.decay / 1000);
    const s = state.sustain;
    const r = Math.max(0.02, state.release / 1000);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);

    const panNode = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panNode) panNode.pan.value = Math.max(-1, Math.min(1, pan * state.stereo));

    const out = panNode || g;
    if (panNode) g.connect(panNode);
    out.connect(filter);

    const osc = ctx.createOscillator();
    const wt = WAVEMAP[state.wave] || 'sine';
    osc.type = wt;
    osc.frequency.value = freq;
    osc.detune.value = (Math.random() * 2 - 1) * state.detune;

    // FM léger pour les ondes "FM*" / Karplus simplifiés -> juste un second osc
    let mod, modGain;
    if (state.wave.startsWith('FM')) {
      mod = ctx.createOscillator();
      modGain = ctx.createGain();
      const ratio = state.wave === 'FM3' ? 3.5 : state.wave === 'FM2' ? 2 : 1;
      mod.frequency.value = freq * ratio;
      modGain.gain.value = freq * 1.2;
      mod.connect(modGain); modGain.connect(osc.frequency);
      mod.start(t);
    }

    osc.connect(g);
    const peak = 0.22 * vel;
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * s), t + a + d);
    const end = t + a + d + r + 0.05;
    g.gain.setValueAtTime(Math.max(0.0002, peak * s), end - r);
    g.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.start(t);
    osc.stop(end + 0.02);
    voices++;
    osc.onended = () => {
      voices = Math.max(0, voices - 1);
      try { osc.disconnect(); g.disconnect(); if (panNode) panNode.disconnect(); if (mod) mod.disconnect(); } catch (e) {}
    };
    if (mod) mod.stop(end + 0.02);
  }

  return { resume, trigger, setParams, get state() { return state; } };
}

window.makeAudio = makeAudio;
