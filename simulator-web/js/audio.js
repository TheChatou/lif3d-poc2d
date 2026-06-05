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

  // 🎓 drumMaster : gain dédié aux percussions.
  // Les drums court-circuitent le filtre/reverb (trop de reverb tue le punch)
  // mais passent quand même par master pour respecter le volume global.
  let drumMaster;

  let voices = 0;
  const MAXVOICES = 16;

  const state = {
    volume: 0.7, cutoff: 0.7, resonance: 0.2, reverb: 0.25,
    wave: 'Sine',
    attack: 6, decay: 60, sustain: 0.5, release: 120,
    detune: 0, stereo: 0.4, muted: false,
    phaserOn: false, phaserDepth: 0.4,
    flangerOn: false, flangerDepth: 0.3,
    drumVolume: 0.75,  // volume batterie indépendant du volume GoL
  };

  /* ---- Initialisation lazy du contexte (doit suivre un geste utilisateur) */
  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();

    // --- Maître
    master = ctx.createGain();
    master.connect(ctx.destination);

    // --- Drums : bypass filtre/reverb, directement sur master
    drumMaster = ctx.createGain();
    drumMaster.gain.value = 1.0;
    drumMaster.connect(master);

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

    // Volume batterie indépendant (bypass filtre/reverb GoL)
    drumMaster.gain.value = state.muted ? 0 : state.drumVolume;
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

  /* ---- Synthèse percussions (tout synthétisé, aucun sample) -------------- */

  // 🎓 Kick : une sinusoïde avec une enveloppe de hauteur qui chute vite (150→38 Hz).
  // Le "punch" vient d'un court transitoire haute-fréquence.
  function drumKick(t, vel) {
    const osc   = ctx.createOscillator();
    const gain  = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.11);
    gain.gain.setValueAtTime(vel * 0.95, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
    osc.connect(gain); gain.connect(drumMaster);
    osc.start(t); osc.stop(t + 0.52);
    osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (_) {} };

    // Transitoire de click (attaque percutante)
    const clk  = ctx.createOscillator();
    const clkG = ctx.createGain();
    clk.type = 'sine'; clk.frequency.setValueAtTime(700, t);
    clk.frequency.exponentialRampToValueAtTime(120, t + 0.022);
    clkG.gain.setValueAtTime(vel * 0.32, t);
    clkG.gain.exponentialRampToValueAtTime(0.001, t + 0.022);
    clk.connect(clkG); clkG.connect(drumMaster);
    clk.start(t); clk.stop(t + 0.028);
    clk.onended = () => { try { clk.disconnect(); clkG.disconnect(); } catch (_) {} };
  }

  // 🎓 Snare : ton triangle (corps) + bruit filtré (sifflement de caisse).
  // C'est la combinaison des deux qui donne le son "claqué" caractéristique.
  function drumSnare(t, vel) {
    const osc  = ctx.createOscillator();
    const oscG = ctx.createGain();
    osc.type = 'triangle'; osc.frequency.value = 195;
    oscG.gain.setValueAtTime(vel * 0.22, t);
    oscG.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(oscG); oscG.connect(drumMaster);
    osc.start(t); osc.stop(t + 0.18);
    osc.onended = () => { try { osc.disconnect(); oscG.disconnect(); } catch (_) {} };

    const N    = Math.round(ctx.sampleRate * 0.22);
    const buf  = ctx.createBuffer(1, N, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < N; i++) data[i] = Math.random() * 2 - 1;
    const src   = ctx.createBufferSource();
    src.buffer  = buf;
    const hp    = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1800; hp.Q.value = 0.5;
    const noiseG = ctx.createGain();
    noiseG.gain.setValueAtTime(vel * 0.42, t);
    noiseG.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    src.connect(hp); hp.connect(noiseG); noiseG.connect(drumMaster);
    src.start(t); src.stop(t + 0.23);
    src.onended = () => { try { src.disconnect(); hp.disconnect(); noiseG.disconnect(); } catch (_) {} };
  }

  // 🎓 Hi-hat fermé : bruit blanc très court filtré passe-haut.
  // Seules les fréquences > 7 kHz passent — c'est le sifflement métallique.
  function drumHat(t, vel) {
    const N    = Math.round(ctx.sampleRate * 0.07);
    const buf  = ctx.createBuffer(1, N, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < N; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp  = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 7200;
    const bp  = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 9500; bp.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vel * 0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    src.connect(hp); hp.connect(bp); bp.connect(gain); gain.connect(drumMaster);
    src.start(t); src.stop(t + 0.08);
    src.onended = () => { try { src.disconnect(); hp.disconnect(); bp.disconnect(); gain.disconnect(); } catch (_) {} };
  }

  // 🎓 Clap : 3 rafales de bruit décalées de ~11 ms.
  // Cette stratification imite les mains décalées d'un vrai clap humain.
  function drumClap(t, vel) {
    for (let i = 0; i < 3; i++) {
      const dt   = i * 0.011;
      const N    = Math.round(ctx.sampleRate * 0.018);
      const buf  = ctx.createBuffer(1, N, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < N; j++) data[j] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp  = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 980 + i * 280; bp.Q.value = 1.1;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vel * 0.38, t + dt);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.048);
      src.connect(bp); bp.connect(gain); gain.connect(drumMaster);
      src.start(t + dt); src.stop(t + dt + 0.06);
      src.onended = () => { try { src.disconnect(); bp.disconnect(); gain.disconnect(); } catch (_) {} };
    }
  }

  // 🎓 Tom : comme le kick mais plus haut (~90 Hz) et decay plus long.
  // Les toms graves simulent la fût de la batterie acoustique.
  function drumTom(t, vel) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(92, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.19);
    gain.gain.setValueAtTime(vel * 0.75, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    osc.connect(gain); gain.connect(drumMaster);
    osc.start(t); osc.stop(t + 0.42);
    osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (_) {} };
  }

  // Hat ouvert : comme hat fermé, mais decay plus long (0.26 s vs 0.06 s)
  function drumHatOpen(t, vel) {
    const N = Math.round(ctx.sampleRate * 0.28);
    const buf = ctx.createBuffer(1, N, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < N; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 6200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vel * 0.34, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    src.connect(hp); hp.connect(gain); gain.connect(drumMaster);
    src.start(t); src.stop(t + 0.30);
    src.onended = () => { try { src.disconnect(); hp.disconnect(); gain.disconnect(); } catch (_) {} };
  }

  // Tom haut : descend de 165 → 88 Hz
  function drumTomH(t, vel) {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165, t);
    osc.frequency.exponentialRampToValueAtTime(88, t + 0.14);
    gain.gain.setValueAtTime(vel * 0.78, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(gain); gain.connect(drumMaster);
    osc.start(t); osc.stop(t + 0.32);
    osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (_) {} };
  }

  // Tom médium : descend de 120 → 62 Hz
  function drumTomM(t, vel) {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(62, t + 0.17);
    gain.gain.setValueAtTime(vel * 0.80, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    osc.connect(gain); gain.connect(drumMaster);
    osc.start(t); osc.stop(t + 0.38);
    osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (_) {} };
  }

  // Tom bas : encore plus grave que drumTom (75 → 38 Hz)
  function drumTomL(t, vel) {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(75, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.22);
    gain.gain.setValueAtTime(vel * 0.88, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(gain); gain.connect(drumMaster);
    osc.start(t); osc.stop(t + 0.50);
    osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (_) {} };
  }

  // Rimshot : clic boisé (carré court + bruit bandpassé)
  function drumRim(t, vel) {
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = 'square'; osc.frequency.value = 1500;
    g.gain.setValueAtTime(vel * 0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc.connect(g); g.connect(drumMaster);
    osc.start(t); osc.stop(t + 0.04);
    osc.onended = () => { try { osc.disconnect(); g.disconnect(); } catch (_) {} };

    const N = Math.round(ctx.sampleRate * 0.014);
    const buf = ctx.createBuffer(1, N, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < N; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 2;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(vel * 0.26, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.014);
    src.connect(bp); bp.connect(ng); ng.connect(drumMaster);
    src.start(t); src.stop(t + 0.018);
    src.onended = () => { try { src.disconnect(); bp.disconnect(); ng.disconnect(); } catch (_) {} };
  }

  // 🎓 Cowbell : 2 oscillateurs carrés légèrement désaccordés → timbre métallique
  function drumCowbell(t, vel) {
    [562, 848].forEach((freq) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'square'; osc.frequency.value = freq;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
      gain.gain.setValueAtTime(vel * 0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.52);
      osc.connect(hp); hp.connect(gain); gain.connect(drumMaster);
      osc.start(t); osc.stop(t + 0.56);
      osc.onended = () => { try { osc.disconnect(); hp.disconnect(); gain.disconnect(); } catch (_) {} };
    });
  }

  // Clave : impulsion sinusoïdale ultra-courte (wood-block synthétisé)
  function drumClave(t, vel) {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 2500;
    gain.gain.setValueAtTime(vel * 0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.026);
    osc.connect(gain); gain.connect(drumMaster);
    osc.start(t); osc.stop(t + 0.030);
    osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (_) {} };
  }

  // Shaker : rafale de bruit haute-fréquence (55 ms)
  function drumShaker(t, vel) {
    const N = Math.round(ctx.sampleRate * 0.055);
    const buf = ctx.createBuffer(1, N, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < N; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5500;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 8000; bp.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vel * 0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(hp); hp.connect(bp); bp.connect(gain); gain.connect(drumMaster);
    src.start(t); src.stop(t + 0.06);
    src.onended = () => { try { src.disconnect(); hp.disconnect(); bp.disconnect(); gain.disconnect(); } catch (_) {} };
  }

  // Maracas : plus doux et plus court que le shaker
  function drumMaracas(t, vel) {
    const N = Math.round(ctx.sampleRate * 0.032);
    const buf = ctx.createBuffer(1, N, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < N; i++) data[i] = (Math.random() * 2 - 1) * 0.7;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6500;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vel * 0.20, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.030);
    src.connect(hp); hp.connect(gain); gain.connect(drumMaster);
    src.start(t); src.stop(t + 0.036);
    src.onended = () => { try { src.disconnect(); hp.disconnect(); gain.disconnect(); } catch (_) {} };
  }

  // Ride : cymbal métallique à decay long (0.55 s)
  function drumRide(t, vel) {
    const N = Math.round(ctx.sampleRate * 0.60);
    const buf = ctx.createBuffer(1, N, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < N; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 7000; bp.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vel * 0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    src.connect(hp); hp.connect(bp); bp.connect(gain); gain.connect(drumMaster);
    src.start(t); src.stop(t + 0.62);
    src.onended = () => { try { src.disconnect(); hp.disconnect(); bp.disconnect(); gain.disconnect(); } catch (_) {} };
  }

  // Crash : bruit large spectre avec fondu lent (0.8 s)
  function drumCrash(t, vel) {
    const N = Math.round(ctx.sampleRate * 0.85);
    const buf = ctx.createBuffer(1, N, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < N; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vel * 0.44, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.80);
    src.connect(hp); hp.connect(gain); gain.connect(drumMaster);
    src.start(t); src.stop(t + 0.88);
    src.onended = () => { try { src.disconnect(); hp.disconnect(); gain.disconnect(); } catch (_) {} };
  }

  // Perc libre : impact générique medium-court
  function drumPerc(t, vel) {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.08);
    gain.gain.setValueAtTime(vel * 0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain); gain.connect(drumMaster);
    osc.start(t); osc.stop(t + 0.15);
    osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (_) {} };
  }

  /* ---- Déclenchement d'une percussion ------------------------------------- */
  function triggerDrum(type, audioTime, vel = 1) {
    if (state.muted) return;
    ensure();
    if (ctx.state === 'suspended') ctx.resume();
    const t = audioTime !== undefined ? audioTime : ctx.currentTime;
    const DISPATCH = {
      'Kick':       drumKick,   'Snare':     drumSnare,
      'Hat':        drumHat,    'Hat ouvert':drumHatOpen,
      'Clap':       drumClap,   'Tom H':     drumTomH,
      'Tom M':      drumTomM,   'Tom L':     drumTomL,
      'Rim':        drumRim,    'Cowbell':   drumCowbell,
      'Clave':      drumClave,  'Shaker':    drumShaker,
      'Maracas':    drumMaracas,'Ride':      drumRide,
      'Crash':      drumCrash,  'Perc':      drumPerc,
      'Tom':        drumTom,    // rétro-compat
    };
    const fn = DISPATCH[type];
    if (fn) fn(t, vel);
  }

  return { resume, trigger, triggerDrum, setParams, getCtx, get state() { return state; } };
}

window.makeAudio = makeAudio;
