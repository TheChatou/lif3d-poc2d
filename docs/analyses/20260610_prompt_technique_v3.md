# Prompt Technique — LIF2D Simulator Web v3

> **Usage :** Colle ce prompt dans une session Claude Code (ou Claude.ai) une fois le design v3
> validé (voir `20260609_prompt_claude_design.md`). Ce prompt fournit le contexte technique
> complet pour implémenter la v3 from scratch / migration depuis la v2.
>
> Accompagne le prompt design UI/UX (à coller en premier, ou en parallèle si même session).

---

## Contexte : l'existant v2

Le simulateur web LIF2D existe déjà dans `simulator-web/`. Sa structure actuelle :

```
simulator-web/
├── index.html            ← entry point, charge tout via Babel standalone
├── css/
│   ├── styles.css        ← variables globales, reset, dark theme
│   ├── controls.css      ← sliders, selects, boutons
│   ├── layout.css        ← grid principale
│   └── expert.css        ← mode expert compact
└── js/
    ├── engine.js         ← moteur GoL 2D (339 lignes) ← À PORTER tel quel
    ├── audio.js          ← Web Audio API, synth, ADSR, effets (650 lignes) ← REFACTORER
    ├── app.jsx           ← état global, routing modes (606 lignes) ← REFACTORER
    ├── controls.jsx      ← composants UI de base (256 lignes)
    ├── expert.jsx        ← vue "Expert" compacte (361 lignes)
    ├── machine.jsx       ← vue "Machine" skeuomorphique (216 lignes) ← garder en archive
    ├── matrix.jsx        ← grille 16×16 (252 lignes)
    ├── drums.jsx         ← drum machine 8 pistes × 32 steps (520 lignes)
    └── tweaks.jsx        ← panneau paramètres avancés (240 lignes)
```

### Problèmes de la v2 à résoudre en v3

1. **Stack Babel standalone** : transpilation in-browser → pas de hot reload, 2–3s de chargement,
   impossible de faire du TypeScript, fragile (ordre de chargement manuel dans index.html).
2. **Architecture audio monolithique** : `audio.js` contient tout en fonctions globales.
   Ajouter un style musical = modifier ~8 endroits différents.
3. **Pas de système de presets** : l'état se perd au rechargement.
4. **Modes Machine/Expert** : deux vues complètes à maintenir. Le mode Machine (potentiomètres SVG
   infinis à drag) est non ergonomique et rarement utilisé.
5. **Paramètres audio orphelins** : waveform, ADSR, effets ne sont pas regroupés logiquement dans le code.

---

## Objectifs v3

### Ce qui change
- **Nouvelle vue principale "Sim Pure"** — sobre, keyboard-friendly — remplace le mode Expert
- **Système de styles musicaux** — 6 styles, chacun un preset audio chargeable/modifiable
- **Système de presets** — 16 slots par mode (GoL / Drums / Son), persistés en localStorage
- **Stack Vite + React 18** — HMR, build propre, prêt pour packaging Electron
- **Tone.js** comme couche audio — remplace le Web Audio API brut de la v2
- **Architecture audio en modules** — un fichier par responsabilité

### Ce qui reste
- Moteur GoL (`engine.js`) — logique pure, fonctionnelle, à importer tel quel
- Drum machine — à refactorer dans son propre module mais logique inchangée
- Dark theme + Space Mono — garder l'esthétique existante
- Mode Machine — garder le code en `reference/`, désactivé par défaut (easter egg)

---

## Stack recommandée pour la v3

### Pourquoi changer

Babel standalone est un outil de prototypage. À ~3400 lignes et avec les nouvelles features,
le projet dépasse ce seuil. Les problèmes concrets :
- Pas de hot reload → chaque modif audio nécessite un rechargement complet (AudioContext perdu)
- Pas de TypeScript → 30+ paramètres audio sans types = erreurs silencieuses faciles
- Ordre de chargement manuel dans index.html → fragile
- Web Audio API brut = tout à la main (scheduling, polyphonie, chaînage de noeuds)

### Stack cible : Vite + React 18 + Tone.js

```bash
npm create vite@latest lif2d-sim -- --template react
cd lif2d-sim
npm install tone
```

**Pourquoi Vite :**
- Zéro config, démarrage en ~300ms
- HMR natif (React Fast Refresh) — AudioContext survit aux modifs de composants UI
- Build → `dist/` folder → packaging Electron natif (via `electron-vite` quand le moment viendra)
- Bundle final = fichiers statiques servis sans serveur (parfait pour Electron renderer)

**Pourquoi Tone.js :**
- C'est exactement Mozzi mais dans le navigateur — les API mappent 1:1 avec ce qu'on flashera sur l'ESP32
- Oscillateurs (Sine/Saw/Square/Triangle/FM), filtres LP/HP résonants, ADSR, LFO, Reverb, Phaser, Delay natifs
- Les 6 styles musicaux (Acid, Ambient, Trance…) sont branchables sans code custom sur chaque effet
- `Tone.Transport` gère le scheduling BPM sans setInterval manuel (plus fiable, moins de drift)
- Polyphonie via `Tone.PolySynth` — fini la gestion manuelle des oscillateurs actifs

**Avant d'écrire le moindre code Tone.js :** utiliser Context7 pour fetch la doc à jour.
L'API Tone.js a changé significativement entre v13 et v15 — ne pas coder de mémoire.
```
resolve-library-id: "tone"
query-docs: topics "Synth PolySynth Filter LFO Reverb Transport"
```

**Pas de TypeScript pour l'instant** — rester sur JS/JSX (même paradigme que v2),
mais la migration future sera facile fichier par fichier.

### Structure des fichiers v3

```
simulator-web-v3/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx              ← ReactDOM.createRoot, point d'entrée
    ├── App.jsx               ← state global (useReducer), routing vues
    │
    ├── engine/
    │   └── gol.js            ← moteur GoL (portage direct de engine.js v2)
    │
    ├── audio/
    │   ├── AudioEngine.js    ← init AudioContext, master gain, scheduler clock
    │   ├── styles.js         ← définitions des 6 styles musicaux (presets audio)
    │   ├── synth.js          ← oscillateurs, ADSR, effets (filtre, reverb, phaser, flanger)
    │   ├── drums.js          ← drum machine audio (portage de drums.jsx audio layer)
    │   └── scales.js         ← gammes musicales (portage direct)
    │
    ├── state/
    │   ├── reducer.js        ← useReducer global : GoL state + audio params + UI state
    │   ├── presets.js        ← save/load presets en localStorage (GoL / Drums / Son)
    │   └── defaultState.js   ← valeurs initiales complètes
    │
    ├── components/
    │   ├── TransportBar.jsx  ← Play/Pause/Reset/BPM/Seed
    │   ├── MatrixView.jsx    ← grille 16×16 (portage + amélioration)
    │   ├── StyleSelector.jsx ← dropdown styles musicaux + couleur par style
    │   ├── PresetGrid.jsx    ← grille 4×4 presets (save/load/rename/color)
    │   ├── ParamSlider.jsx   ← range + valeur numérique éditable au clavier
    │   ├── ParamSelect.jsx   ← dropdown stylé cohérent
    │   ├── ParamStepper.jsx  ← stepper +/– pour octave, etc.
    │   ├── SoundPanel.jsx    ← panneau ADSR + effets (collapsible)
    │   ├── DrumPanel.jsx     ← drum machine 8×32 (portage de drums.jsx)
    │   └── MachineView.jsx   ← vue skeuomorphique archivée (easter egg, désactivée)
    │
    └── css/
        ├── variables.css     ← tokens CSS (couleurs, spacing, fonts)
        ├── layout.css
        ├── components.css
        └── styles-colors.css ← couleurs par style musical (Acid=rouge, Ambient=bleu…)
```

---

## Architecture audio v3 — Refactoring clé

### Le problème v2 : état audio global

En v2, `audio.js` expose des variables globales (`currentWaveform`, `attack`, `cutoff`…)
modifiées directement depuis les composants React. C'est fragile et non-testable.

### Solution v3 : AudioEngine singleton + styles comme presets

```js
// audio/styles.js — définitions des 6 styles
export const MUSIC_STYLES = {
  japonais: {
    name: 'Japonais',
    color: '#e8c97a',
    waveform: 'sine',
    attack: 15, decay: 350, sustain: 0.3, release: 200,
    cutoff: 180, resonance: 15, reverb: 0.4,
    phaser: false, flanger: false,
    detune: 0, stereo: 0.6,
    scale: 'japonaise', octave: 0,
    bpmRange: [60, 120], bpmDefault: 80,
    harmonics: { fund: 0.88, h2: 0.08, h3: 0.03, h4: 0.01 },
    lfo: null
  },
  ambient: {
    name: 'Ambient',
    color: '#4a7fa5',
    waveform: 'sine',
    attack: 800, decay: 3000, sustain: 0.8, release: 2000,
    cutoff: 90, resonance: 8, reverb: 0.75,
    phaser: true, flanger: false,
    detune: 5, stereo: 0.9,
    scale: 'pentatonique_mineur', octave: -1,
    bpmRange: [40, 80], bpmDefault: 60,
    harmonics: { fund: 1.0, h2: 0.0, h3: 0.0, h4: 0.0 },
    lfo: { target: 'cutoff', freq: 0.08, depth: 25 }
  },
  melodique: {
    name: 'Mélodique',
    color: '#7ab87a',
    waveform: 'triangle',
    attack: 30, decay: 200, sustain: 0.7, release: 400,
    cutoff: 200, resonance: 10, reverb: 0.2,
    phaser: false, flanger: false,
    detune: 0, stereo: 0.5,
    scale: 'lydien', octave: 0,
    bpmRange: [100, 128], bpmDefault: 110,
    harmonics: { fund: 0.7, h2: 0.2, h3: 0.1, h4: 0.0 },
    lfo: null,
    harmonize: true // ajoute note +4 demi-tons à 40% volume
  },
  techno: {
    name: 'Techno',
    color: '#e05c5c',
    waveform: 'sawtooth',
    attack: 5, decay: 80, sustain: 0.4, release: 100,
    cutoff: 210, resonance: 20, reverb: 0.1,
    phaser: false, flanger: false,
    detune: 0, stereo: 0.3,
    scale: 'pentatonique', octave: 0,
    bpmRange: [130, 160], bpmDefault: 140,
    harmonics: { fund: 1.0, h2: 0.0, h3: 0.0, h4: 0.0 },
    lfo: null,
    kick: true, kickRows: [0, 1] // rangées Y dédiées kick/hihat
  },
  acid: {
    name: 'Acid',
    color: '#e08c3a',
    waveform: 'sawtooth',
    attack: 3, decay: 120, sustain: 0.5, release: 150,
    cutoff: 30, resonance: 200, reverb: 0.05,
    phaser: false, flanger: false,
    detune: 0, stereo: 0.2,
    scale: 'phrygien_dom', octave: -1,
    bpmRange: [135, 175], bpmDefault: 150,
    harmonics: { fund: 1.0, h2: 0.0, h3: 0.0, h4: 0.0 },
    lfo: { target: 'cutoff', freq: 0, depth: 0, envelope: true }, // enveloppe sur cutoff
    portamento: 50
  },
  trance: {
    name: 'Trance',
    color: '#9a6ec7',
    waveform: 'sawtooth',
    attack: 50, decay: 400, sustain: 0.6, release: 600,
    cutoff: 120, resonance: 30, reverb: 0.3,
    phaser: true, flanger: true,
    detune: 8, stereo: 0.95,
    scale: 'pentatonique_mineur', octave: 0,
    bpmRange: [130, 145], bpmDefault: 138,
    harmonics: { fund: 1.0, h2: 0.0, h3: 0.0, h4: 0.0 },
    lfo: { target: 'cutoff', freq: 0.02, depth: 80 }, // ouverture lente
    chorus: true // 2 oscillateurs ±detune
  }
};
```

```js
// audio/AudioEngine.js — interface unique vers Tone.js
// ⚠️ AVANT de coder : fetch la doc Tone.js via Context7
//    resolve-library-id "tone" → query-docs topics "Synth Filter LFO Transport"
import * as Tone from 'tone';

export class AudioEngine {
  constructor() {
    this.synth = null;       // Tone.PolySynth wrapping Tone.Synth
    this.filter = null;      // Tone.Filter (LP)
    this.reverb = null;      // Tone.Reverb
    this.phaser = null;      // Tone.Phaser
    this.flanger = null;     // Tone.FeedbackDelay (approximation flanger)
    this.lfo = null;         // Tone.LFO → filter.frequency
    this.panner = null;      // Tone.Panner
    this.currentStyle = 'japonais';
    this.params = { ...MUSIC_STYLES.japonais };
  }

  async init() {
    await Tone.start(); // unlock AudioContext (doit être dans un gesture handler)
    this._buildChain();
  }

  _buildChain() {
    // Chaîne : synth → filter → reverb → phaser → panner → destination
    this.filter  = new Tone.Filter({ type: 'lowpass', frequency: 2000, Q: 1 });
    this.reverb  = new Tone.Reverb({ decay: 2, wet: 0 });
    this.phaser  = new Tone.Phaser({ frequency: 0.5, octaves: 3, wet: 0 });
    this.panner  = new Tone.Panner(0);
    this.synth   = new Tone.PolySynth(Tone.Synth, { maxPolyphony: 6 });
    this.synth.chain(this.filter, this.reverb, this.phaser, this.panner, Tone.getDestination());
  }

  applyStyle(styleKey) {
    this.params = { ...MUSIC_STYLES[styleKey] };
    const p = this.params;
    this.synth.set({
      oscillator: { type: p.waveform },
      envelope: { attack: p.attack / 1000, decay: p.decay / 1000,
                  sustain: p.sustain, release: p.release / 1000 },
      detune: p.detune
    });
    this.filter.frequency.value = this._cutoffToHz(p.cutoff);
    this.filter.Q.value = p.resonance / 10;
    this.reverb.wet.value = p.reverb;
    this.phaser.wet.value = p.phaser ? 0.5 : 0;
    if (p.lfo) this._startLFO(p.lfo);
    else this._stopLFO();
    Tone.getTransport().bpm.value = p.bpmDefault;
  }

  updateParam(key, value) {
    this.params[key] = value;
    // Dispatch vers le bon nœud Tone selon la clé
    const dispatch = {
      cutoff:    () => this.filter.frequency.rampTo(this._cutoffToHz(value), 0.05),
      resonance: () => { this.filter.Q.value = value / 10; },
      reverb:    () => { this.reverb.wet.value = value; },
      attack:    () => this.synth.set({ envelope: { attack: value / 1000 } }),
      decay:     () => this.synth.set({ envelope: { decay: value / 1000 } }),
      sustain:   () => this.synth.set({ envelope: { sustain: value } }),
      release:   () => this.synth.set({ envelope: { release: value / 1000 } }),
      waveform:  () => this.synth.set({ oscillator: { type: value } }),
      bpm:       () => { Tone.getTransport().bpm.value = value; },
    };
    dispatch[key]?.();
  }

  playNote(freq, velocity = 0.8, pan = 0) {
    this.panner.pan.value = pan;
    this.synth.triggerAttackRelease(freq, this.params.release / 1000, Tone.now(), velocity);
  }

  tick(column, grid) { /* appelé par le scheduler GoL — joue cellules vivantes */ }

  _cutoffToHz(val) { return 20 * Math.pow(1000, val / 255); } // 0–255 → 20Hz–20kHz
  _startLFO(lfoConfig) { /* Tone.LFO connecté au filter.frequency */ }
  _stopLFO() { this.lfo?.stop().disconnect(); this.lfo = null; }
}
```

**Avantage clé :** React ne touche jamais Tone.js directement.
`App.jsx` → dispatch action → `AudioEngine.updateParam()`. Pas de fuite d'état.
Tone.js gère le scheduling, la polyphonie et les effets — pas de gestion manuelle
d'AudioNode, ScriptProcessor ou de workaround AudioContext.

---

## Système de presets v3

```js
// state/presets.js
const PRESET_SLOTS = 16; // grille 4×4

// Structure d'un preset GoL
const GOL_PRESET = {
  name: 'Dense Loop',
  color: '#e8c97a',       // couleur choisie par l'utilisateur
  grid: Uint8Array(256),  // état de la grille 16×16
  rule: 'B6S567',
  shape: 'random',
  density: 0.4,
  symmetry: 'none',
  bpm: 80,
  scale: 'japonaise',
  tonic: 'A',
  style: 'japonais'
};

// Structure d'un preset Son
const SOUND_PRESET = {
  name: 'Acid Squelch',
  color: '#e08c3a',
  ...MUSIC_STYLES.acid,   // snapshot du style + overrides manuels
  attack: 5,
  cutoff: 45              // override par rapport au style de base
};

// API
export function savePreset(slot, type, state) { localStorage.setItem(...) }
export function loadPreset(slot, type) { return JSON.parse(localStorage.getItem(...)) }
export function listPresets(type) { return Array(16).fill(null).map((_, i) => loadPreset(i, type)) }
```

---

## État global v3 — useReducer

```js
// state/defaultState.js
export const DEFAULT_STATE = {
  // GoL
  grid: new Uint8Array(256),
  rule: 'B6S567',
  generation: 0,
  running: false,

  // Séquenceur
  bpm: 80,
  currentColumn: 0,
  scale: 'japonaise',
  tonic: 'A',
  octave: 0,

  // Style + audio
  musicStyle: 'japonais',
  audioParams: { ...MUSIC_STYLES.japonais },

  // Drums
  drumPattern: Array(8).fill(null).map(() => new Uint8Array(32)),
  drumRunning: false,

  // UI
  activeTab: 'gol',       // 'gol' | 'drums' | 'sound'
  soundPanelOpen: false,
  presetPanelOpen: false,
  activeMachineView: false
};
```

---

## Stratégie de migration — quoi porter, quoi réécrire

| Module v2 | Action v3 | Notes |
|---|---|---|
| `engine.js` (GoL) | **Porter direct** | Fonctions pures, aucun état global, juste copier |
| `audio.js` | **Réécrire** dans `audio/` avec Tone.js | La logique (gammes, styles) est portée, les AudioNode manuels sont remplacés par Tone |
| `scales.js` (dans audio.js) | **Extraire** dans `audio/scales.js` | Déjà isolé dans le code |
| `drums.jsx` (audio layer) | **Extraire** dans `audio/drums.js` | Séparer la logique audio du composant React |
| `drums.jsx` (UI) | **Adapter** → `components/DrumPanel.jsx` | Garder la grille 8×32 |
| `matrix.jsx` | **Porter + améliorer** | Ajouter dessin au clic, glow CSS amélioré |
| `expert.jsx` | **Archiver** | Sera remplacé par la nouvelle "Sim Pure" view |
| `machine.jsx` | **Archiver** dans `reference/` | Easter egg accessible |
| `app.jsx` | **Réécrire** | Nouveau routage, useReducer propre |
| `controls.jsx` | **Remplacer** par les nouveaux composants | ParamSlider / ParamSelect etc. |

---

## Phases d'implémentation recommandées

### Phase 1 — Setup + Portage moteur (1–2h)
1. `npm create vite@latest lif2d-sim -- --template react && npm install tone`
2. Configurer `vite.config.js` : `base: './'` (Electron-compatible), pas d'autres plugins
3. Porter `engine.js` → `src/engine/gol.js` (fonctions pures, zéro modif)
4. Copier/adapter `audio/scales.js`
5. Écrire `state/defaultState.js` + `state/reducer.js` squelette
6. `App.jsx` minimal avec `MatrixView` qui tourne (pas encore de son)

### Phase 2 — Audio engine v3 avec Tone.js (2–3h)
> **Obligatoire en premier :** fetch la doc Tone.js via Context7 avant d'écrire une ligne.
> `resolve-library-id "tone"` → `query-docs "Synth PolySynth Filter LFO Reverb Transport"`
1. `audio/AudioEngine.js` : init Tone, chaîne signal, playNote basique (style Japonais)
2. Vérifier que le son joue → cloche cristal reconnaissable
3. Intégrer `audio/styles.js` complet
4. `StyleSelector` → changer de style → vérifier changement audio immédiat (Acid doit squeal)

### Phase 3 — Interface "Sim Pure" (design guidé) (3–4h)
> À faire APRÈS avoir le design validé du prompt UI/UX

1. Implémenter le layout global (TransportBar + MatrixView + panneau droit)
2. `ParamSlider`, `ParamSelect`, `ParamStepper` — composants de base
3. `StyleSelector` avec couleurs
4. `SoundPanel` collapsible
5. `DrumPanel` onglet

### Phase 4 — Presets (2h)
1. `state/presets.js` (localStorage)
2. `PresetGrid` 4×4 avec save/load/rename/color
3. Intégration dans les 3 modes (GoL / Drums / Son)

### Phase 5 — Polish + Keyboard (1h)
1. Raccourcis clavier (Space = play/pause, etc.)
2. Focus management (navigation tab dans les panneaux)
3. Tests sur 1920×1080 + 1366×768

---

## Contraintes à respecter

- **Vanilla CSS** — pas de Tailwind, pas de CSS-in-JS
- **Dark theme** — fond `#0a0a0a`, accents lumineux par style
- **Space Mono** pour les valeurs numériques
- **Dépendances npm autorisées** : React, Vite, Tone.js — rien d'autre sans demander
- **Electron en cible** : `base: './'` dans `vite.config.js` — le build `dist/` doit tourner en `file://` et dans un renderer Electron sans modification
- **Context7 obligatoire** avant tout code Tone.js — ne pas coder de mémoire, l'API change entre versions

---

## Ce que tu dois faire quand tu reçois ce prompt

1. Lire l'état actuel du code dans `simulator-web/js/` (en particulier `engine.js` et `audio.js`)
2. Lire le design validé (résultat du prompt UI/UX `20260609_prompt_claude_design.md`)
3. **Créer `simulator-web-v3/`** comme nouveau dossier — ne pas toucher à la v2 existante
4. Implémenter dans l'ordre des phases ci-dessus
5. Attendre validation après chaque phase avant de continuer

**Ne pas implémenter toutes les phases en une fois.** Proposer la Phase 1 d'abord, montrer que le moteur GoL tourne dans la nouvelle stack, attendre un go.

---

*Projet : LIF2D — Felix — juin 2026*
*Fichier associé : `20260609_prompt_claude_design.md` (prompt design UI/UX)*
