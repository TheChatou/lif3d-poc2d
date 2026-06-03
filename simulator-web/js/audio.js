/* ==========================================================================
   LIF2D — Moteur audio Web Audio API.
   Synth multi-voix : oscillateurs (Sine/Carré/Scie/Triangle), FM (3 ratios),
   Karplus-Strong approximé, ADSR complet, filtre passe-bas, reverb (delay
   feedback), phaser (chaîne all-pass + LFO), flanger (delay modulé + LFO),
   panoramique stéréo.
   ========================================================================== */

function makeAudio() {
  /* ---- Contexte & nœuds globaux ----------------------------------------- */
  let ctx = null;

  // Nœuds déclarés ici pour être accessibles dans apply()
  let master, filter;
  let reverbDelay, reverbFbGain, reverbWet, reverbDry;
  let phaserFilters, phaserLfoGain;
  let flangerDelay, flangerLfoGain, flangerWetGain, flangerDryGain;

  let voices = 0;
  const MAXVOICES = 16;

  const state = {
    volume: 0.7, cutoff: 0.7, resonance: 0.2, reverb: 0.25,
    wave: 'Sine',
    attack: 6, decay: 60, sustain: 0.5, release: 120,
    detune: 0, stereo: 0.4, muted: false,
    phaserOn: false, phaserDepth: 0.4,
    flangerOn: false, flangerDepth: 0.3,
  };

  /* ---- Initialisation lazy du contexte (doit suivre un geste utilisateur) */
  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();

    // --- Maître
    master = ctx.createGain();
    master.connect(ctx.destination);

    // --- Filtre passe-bas global (reçoit toutes les voix)
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';

    // --- Reverb : delay feedback simple
    reverbDelay  = ctx.createDelay(1.0);
    reverbFbGain = ctx.createGain();
    reverbWet    = ctx.createGain();
    reverbDry    = ctx.createGain();
    reverbDelay.delayTime.value = 0.18;

    reverbDelay.connect(reverbFbGain);
    reverbFbGain.connect(reverbDelay);   // boucle feedback
    reverbDelay.connect(reverbWet);
    filter.connect(reverbDry);
    filter.connect(reverbDelay);

    // --- Phaser : 4 filtres all-pass en série + LFO
    const NUM_AP = 4;
    phaserFilters = Array.from({ length: NUM_AP }, () => {
      const f = ctx.createBiquadFilter();
      f.type = 'allpass';
      f.frequency.value = 1000;
      f.Q.value = 1.8;
      return f;
    });
    // Chaîner les all-pass
    const phaserIn  = ctx.createGain();
    phaserIn.gain.value = 1;
    let prev = phaserIn;
    phaserFilters.forEach((f) => { prev.connect(f); prev = f; });
    const phaserOut = phaserFilters[NUM_AP - 1];

    // LFO phaser
    const phaserLfo = ctx.createOscillator();
    phaserLfo.type = 'sine';
    phaserLfo.frequency.value = 0.45;
    phaserLfoGain = ctx.createGain();
    phaserLfo.connect(phaserLfoGain);
    phaserFilters.forEach((f) => phaserLfoGain.connect(f.frequency));
    phaserLfo.start();

    // --- Flanger : dry + wet(delay modulé)
    flangerDryGain = ctx.createGain();
    flangerWetGain = ctx.createGain();
    flangerDelay   = ctx.createDelay(0.025);
    flangerDelay.delayTime.value = 0.007;

    // LFO flanger
    const flangerLfo = ctx.createOscillator();
    flangerLfo.type = 'sine';
    flangerLfo.frequency.value = 0.38;
    flangerLfoGain = ctx.createGain();
    flangerLfo.connect(flangerLfoGain);
    flangerLfoGain.connect(flangerDelay.delayTime);
    flangerLfo.start();

    // Routage : reverbDry + reverbWet → phaserIn → phaserOut → flangerDry+Delay
    //                                                            → flangerDry+flangerWet → master
    reverbDry.connect(phaserIn);
    reverbWet.connect(phaserIn);

    phaserOut.connect(flangerDryGain);
    phaserOut.connect(flangerDelay);
    flangerDelay.connect(flangerWetGain);
    flangerDryGain.connect(master);
    flangerWetGain.connect(master);

    apply();
  }

  /* ---- Mise à jour des paramètres audio en temps réel ------------------- */
  function apply() {
    if (!ctx) return;
    master.gain.value      = state.muted ? 0 : state.volume;
    filter.frequency.value = 120 + state.cutoff * state.cutoff * 9000;
    filter.Q.value         = state.resonance * 18;
    reverbWet.gain.value   = state.reverb * 0.9;
    reverbDry.gain.value   = 1 - state.reverb * 0.4;
    reverbFbGain.gain.value = 0.32 + state.reverb * 0.08;

    // Phaser : 0 quand désactivé (LFO modulation = 0 → all-pass neutre)
    phaserLfoGain.gain.value = state.phaserOn ? state.phaserDepth * 700 : 0;

    // Flanger : dry/wet crossfade
    const fw = state.flangerOn ? state.flangerDepth * 0.65 : 0;
    flangerWetGain.gain.value = fw;
    flangerDryGain.gain.value = 1 - fw * 0.4;
    flangerLfoGain.gain.value = state.flangerOn ? state.flangerDepth * 0.005 : 0;
  }

  function setParams(p) { Object.assign(state, p); apply(); }

  function resume() {
    ensure();
    if (ctx.state === 'suspended') ctx.resume();
  }

  /* ---- Mapping onde -> type oscillateur ---------------------------------- */
  const OSCTYPE = {
    'Sine': 'sine', 'Carré': 'square', 'Scie': 'sawtooth', 'Triangle': 'triangle',
  };

  /* ---- Accès au contexte audio (pour scheduling externe) ---------------- */
  function getCtx() { return ctx; }

  /* ---- Déclenchement d'une voix ----------------------------------------- */
  // audioTime : temps absolu AudioContext (optionnel, défaut = maintenant)
  function trigger(freq, vel = 1, pan = 0, audioTime) {
    if (state.muted) return;
    ensure();
    if (ctx.state === 'suspended') ctx.resume();
    if (voices >= MAXVOICES) return;

    const t = audioTime !== undefined ? audioTime : ctx.currentTime;
    const a = Math.max(0.001, state.attack  / 1000);
    const d = Math.max(0.001, state.decay   / 1000);
    const s = Math.max(0.0002, state.sustain);
    const r = Math.max(0.020, state.release / 1000);

    const waveName = state.wave;

    // Nœud de sortie de la voix (avant filtre global)
    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(0.0001, t);

    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, pan * state.stereo));
      voiceGain.connect(panner);
      panner.connect(filter);
    } else {
      voiceGain.connect(filter);
    }

    const peak = 0.20 * vel;
    // ADSR
    voiceGain.gain.exponentialRampToValueAtTime(peak, t + a);
    voiceGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * s), t + a + d);
    const end = t + a + d + r + 0.04;
    voiceGain.gain.setValueAtTime(Math.max(0.0002, peak * s), end - r);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, end);

    voices++;
    const onDone = () => {
      voices = Math.max(0, voices - 1);
      try {
        voiceGain.disconnect();
        if (panner) panner.disconnect();
      } catch (_) {}
    };

    if (waveName === 'Karplus-Strong') {
      triggerKS(freq, voiceGain, t, end, onDone);
    } else if (waveName.startsWith('FM')) {
      triggerFM(freq, voiceGain, t, end, waveName, onDone);
    } else {
      triggerOsc(freq, voiceGain, t, end, OSCTYPE[waveName] || 'sine', onDone);
    }
  }

  /* ---- Oscillateur simple ------------------------------------------------ */
  function triggerOsc(freq, out, t, end, oscType, onDone) {
    const osc = ctx.createOscillator();
    osc.type = oscType;
    osc.frequency.value = freq;
    osc.detune.value = (Math.random() * 2 - 1) * state.detune;
    osc.connect(out);
    osc.start(t);
    osc.stop(end + 0.02);
    osc.onended = () => { try { osc.disconnect(); } catch (_) {} onDone(); };
  }

  /* ---- FM 2-opérateurs -------------------------------------------------- */
  function triggerFM(freq, out, t, end, waveName, onDone) {
    const ratio = waveName === 'FM3' ? 3.5 : waveName === 'FM2' ? 2 : 1;
    const osc   = ctx.createOscillator();
    const mod   = ctx.createOscillator();
    const modG  = ctx.createGain();

    osc.type              = 'sine';
    osc.frequency.value   = freq;
    osc.detune.value      = (Math.random() * 2 - 1) * state.detune;
    mod.type              = 'sine';
    mod.frequency.value   = freq * ratio;
    // Profondeur FM : ± une octave modulée par l'attaque
    modG.gain.setValueAtTime(0, t);
    modG.gain.linearRampToValueAtTime(freq * 1.4, t + Math.max(0.001, state.attack / 1000));
    modG.gain.exponentialRampToValueAtTime(freq * 0.3, end);

    mod.connect(modG);
    modG.connect(osc.frequency);
    osc.connect(out);
    mod.start(t); osc.start(t);
    mod.stop(end + 0.02); osc.stop(end + 0.02);
    osc.onended = () => {
      try { osc.disconnect(); mod.disconnect(); modG.disconnect(); } catch (_) {}
      onDone();
    };
  }

  /* ---- Karplus-Strong approximé (noise burst + comb delay) --------------- */
  function triggerKS(freq, out, t, end, onDone) {
    // Buffer bruit initialisé ±1, taille = 1 période
    const N   = Math.max(2, Math.round(ctx.sampleRate / freq));
    const buf = ctx.createBuffer(1, N, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < N; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop   = true;

    // Filtre passe-bas pour l'amortissement naturel d'une corde
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = Math.min(freq * 5, ctx.sampleRate * 0.4);
    damp.Q.value = 0.3;

    src.connect(damp);
    damp.connect(out);
    src.start(t);
    src.stop(end + 0.02);
    src.onended = () => {
      try { src.disconnect(); damp.disconnect(); } catch (_) {}
      onDone();
    };
  }

  return { resume, trigger, setParams, getCtx, get state() { return state; } };
}

window.makeAudio = makeAudio;
