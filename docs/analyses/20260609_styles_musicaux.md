# Styles musicaux pour LIF2D — Faisabilité & Conception

**Date :** 2026-06-09
**Contexte :** Analyse de faisabilité pour l'ajout d'une dimension "styles" musicaux dans LIF2D. Pour chaque style : caractéristiques musicales, mapping GoL→son, faisabilité ESP32/Mozzi, et retranscription dans le simulateur Python.

---

## Vue d'ensemble des styles candidats

| Style | BPM | Son signature | Difficulté Mozzi | Priorité |
|---|---|---|---|---|
| **Japonais** (déjà en place) | 60–120 | Cloche cristal, gamme Hirajoshi | ✅ Fait | — |
| **Ambient** | 0–90 (ou libre) | Pads lents, drone, reverb | 🟢 Facile | 1 |
| **Mélodique** | 100–128 | Arpèges, harmonies, ADSR doux | 🟢 Facile | 2 |
| **Techno** | 130–160 | Kick 4/4, lignes dures, filtre | 🟡 Moyen | 3 |
| **Acid** | 135–175 | TB-303 squelch, cutoff+résonnance | 🟡 Moyen | 4 |
| **Trance** | 130–145 | Nappes, montée euphorie, arpège | 🟡 Moyen | 5 |

---

## Style 1 — Ambient

### Caractéristiques musicales
- Tempo très lent ou absent (GoL : 1 génération = 4–8 mesures)
- Sons : pads, drones tenus, textures évolutives
- Enveloppe : attack très longue (500ms–2s), sustain max, release longue
- Effets : reverb dense, delay lent, LFO très basse fréquence sur le filtre (0.05–0.2 Hz)
- Gammes : pentatonique mineure, lydien, ou chromatique sparse

### Mapping GoL → son
- **Densité de cellules vivantes** → profondeur de la reverb (dry/wet)
- **Cluster de cellules** → accord tenu (drone)
- **Cellule isolée** → note solo émergeante
- **Vitesse d'évolution GoL** → taux de modulation LFO
- 1 tick = 1 battement lent (ex. 60 BPM → 1s/tick, mais `sustain_ms` chevauchant)

### Faisabilité ESP32 / Mozzi
**Mozzi ADSR :**
```cpp
envelope.setTimes(1000, 3000, 60000, 2000); // attack 1s, decay 3s, sustain infini, release 2s
```
**Filtre résonant avec LFO lent :**
```cpp
Oscil<COS2048_NUM_CELLS, MOZZI_CONTROL_RATE> kLFO(COS2048_DATA);
kLFO.setFreq(0.08f); // 0.08 Hz = cycle de ~12 secondes
// Dans updateControl() :
uint8_t cutoff = 80 + (kLFO.next() >> 1); // sweep doux 55–135
mf.setCutoffFreqAndResonance(cutoff, 30); // résonance basse = fondu
```
**Polyphonie :** 2 oscillateurs max recommandés sur ESP32 (CPU ~60–70%)
**Verdict :** ✅ Pleinement faisable. La contrainte est la fausse "reverb" — Mozzi n'a pas de reverb hardware. Simulation via `AudioDelay` + feedback (écho court répété = pseudo-reverb).

### Retranscription simulation Python
- Paramètre `attack_ms = 800`, `decay = 6.0` (exponentiel lent)
- Filtre biquad LP avec cutoff bas + Q faible
- Superposition de 2 notes (accord) avec léger désaccord (+5 cents) = effet pad
- `duration_ms = 2000` minimum, chevauchement voix activé
- LFO Python sur le volume (0.9–1.0) à 0.08 Hz

---

## Style 2 — Mélodique

### Caractéristiques musicales
- Tempo modéré 100–128 BPM
- Sons : synthé lead propre, harmoniques riches, arpèges
- Enveloppe ADSR équilibrée (attack 30ms, decay 200ms, sustain 70%, release 400ms)
- Harmonie : accords toujours résolus, gammes majeures/lydien/mixolydien

### Mapping GoL → son
- **Colonne active** → note lead (axe Y = hauteur, déjà en place)
- **Voisins immédiats vivants** → note d'harmonie à la tierce (+4 demi-tons)
- **2+ voisins** → accord complet (fondamentale + tierce + quinte)
- Gamme : SCALE_LYDIEN ou SCALE_MIXOLYDIEN

### Faisabilité ESP32 / Mozzi
Faisable avec 2 oscillateurs (mélodie + harmonie). Ajout d'un 3e pour le sustain de la fondamentale.
**Harmoniques cloche de cristal déjà validés** → réutiliser directement, juste adapter l'enveloppe.
**Accord = somme de 3 Oscil** → CPU ~80% estimé, attention à la distorsion DAC.

### Retranscription simulation Python
- `harmonics` plus prononcés sur 2e et 3e partiels
- Ajout d'une note harmonique +4 demi-tons à 40% du volume principal
- Gamme lydien recommandée

---

## Style 3 — Techno

### Caractéristiques musicales
- Tempo 130–160 BPM
- Son signature : **kick drum 4/4** (sine grave 80Hz avec pitch-bend rapide vers le bas), hihat 16e notes, bassline carrée
- Enveloppe très courte sur les percussions (attack 1ms, decay 80ms, release 100ms)
- Filtre LP ouvert sur les leads

### Mapping GoL → son
- **Rangée du bas (Y=0)** → kick si cellule vivante sur le downbeat
- **Rangée Y=1** → hihat (oscillateur hautes fréquences)
- **Rangées Y=2–5** → bassline (onde carrée/sawtooth grave)
- **Rangées Y=6–15** → lead synthé (comme en mode normal)
- **Densité globale** → paramètre "drive" du filtre (cutoff montant)

### Faisabilité ESP32 / Mozzi
C'est ici que les limites apparaissent :
- **Kick drum** : simuler avec `Oscil` sine 80Hz + `ADSR` très court + `Line` pour pitch-bend descente. Faisable mais approximatif.
- **Hihat** : Mozzi a un objet `Sample<>` pour charger du bruit. Possible mais consomme RAM (wavetable bruit).
- **Polyphonie** : kick + bass + lead = 3–4 oscillateurs → CPU ~85–90%. Limite ESP32 avec Mozzi.
- **Recommandation** : techno "minimal" plutôt que "full" (pas de hihat, juste kick + bass + lead)

**Matériel alternatif possible :** un second ESP32 dédié aux percussions (kick/hihat) via I2S ou simple signal GPIO sync.

### Retranscription simulation Python
- Ajouter une couche "percussions" : sine 80Hz dur sur les downbeats (colonnes 0, 4, 8, 12 si 16 steps)
- Onde carrée pour la bassline (harmoniques impairs seulement dans le filtre biquad)
- `attack_ms = 5`, `decay = 0.8` (très court et dur)

---

## Style 4 — Acid

### Caractéristiques musicales
- Inspiré **Roland TB-303** : onde sawtooth/square → filtre LP 24dB/oct avec résonance élevée + cutoff modulé par enveloppe
- BPM 135–175
- Son signature : **squelch** = cutoff bas → monte rapidement avec résonance Q élevée → retombe
- **Slide** entre notes (glide/portamento)
- **Accent** : certaines notes à volume +6dB

### Mapping GoL → son
- **Cellule vivante** → note jouée avec ADSR acid
- **Cellule avec 3 voisins vivants** → note accentuée (accent +6dB)
- **Deux cellules consécutives sur X** → slide activé (portamento 50ms)
- **Densité de la ligne Y** → cutoff de départ du filtre (lignes denses = plus ouvert)
- Le filtre suit une `Line` courbe : `cutoff : 30 → 200 → 30` sur la durée de la note

### Faisabilité ESP32 / Mozzi
**Excellente faisabilité !** Le projet **303duino** (Arduino + Mozzi) démontre que c'est réalisable :
```cpp
// Sawtooth + ResonantFilter avec enveloppe cutoff
Oscil<SAW2048_NUM_CELLS, MOZZI_AUDIO_RATE> aOsc(SAW2048_DATA);
ResonantFilter<LOWPASS> rf;
ADSR<CONTROL_UPDATE_RATE, AUDIO_RATE> filterEnv;

// Dans updateControl() :
filterEnv.update();
uint8_t cutoff = map(filterEnv.next(), 0, 255, 20, 220); // sweep cutoff
rf.setCutoffFreqAndResonance(cutoff, 200); // 200/255 = résonance élevée = squelch
```
**Slide (portamento) :** utiliser `Line<float>` pour interpoler la fréquence entre deux notes.
**CPU :** 1 oscillateur + filtre = ~50%. Laisse de la marge pour kick/hihat basiques.

### Retranscription simulation Python
- Waveform sawtooth (scipy.signal.sawtooth ou synthèse harmoniques)
- Filtre biquad LP avec `Q = 8–15` (résonance forte)
- Enveloppe du cutoff : rampe exponentielle (20ms montée, 200ms descente)
- Portamento entre notes consécutives (~50ms de glide)

---

## Style 5 — Trance

### Caractéristiques musicales
- BPM 130–145
- Son signature : **nappe synthé** (pad avec lent LFO sur cutoff), arpège rapide 1/16e, kick 4/4 similaire techno
- Énergie "montée" : filtre qui s'ouvre progressivement sur 32 ou 64 mesures
- Harmonies : souvent en mode mineur + suspension 4e

### Mapping GoL → son
- **Arpège** : les cellules vivantes d'une rangée lues de gauche à droite = séquence arpège
- **Nombre de cellules vivantes** → ouverture du filtre sur la durée (plus de cellules = filtre plus ouvert)
- **Voisins** → chorus léger (2e oscillateur légèrement désaccordé, +8 cents)
- Gamme : SCALE_PENTA_MINOR ou SCALE_PHRYGIEN_DOM

### Faisabilité ESP32 / Mozzi
- Similaire à Ambient + Techno combinés
- **Nappe** : 2 oscillateurs désaccordés (±5–8 cents) → pseudo-chorus
- **Arpège rapide** : le timer GoL existant peut séquencer 1/16e naturellement
- **LFO sur filtre ouverture** : `Line` sur 64 mesures pour ouvrir le cutoff de 50→220
- **CPU** : 2 oscil + filtre + kick = ~80%, limite acceptable

### Retranscription simulation Python
- 2 voix légèrement désaccordées (+8 cents) = épaisseur
- LFO très lent (0.02 Hz) sur le cutoff pour la "montée"
- `attack_ms = 50`, sustain long, release 600ms

---

## Résumé des capacités Mozzi sur ESP32

| Fonctionnalité | Disponible | Notes |
|---|---|---|
| Oscillateurs (sine/saw/square/triangle) | ✅ | Wavetables intégrées |
| ADSR complet | ✅ | Millisecondes configurables |
| Filtre LP/HP/BP/Notch résonant | ✅ | `ResonantFilter`, `MultiResonantFilter` |
| LFO sur n'importe quel paramètre | ✅ | Oscillateur en `CONTROL_RATE` |
| Portamento/slide | ✅ | `Line<float>` interpolation |
| Polyphonie | ⚠️ | Max ~3–4 voix avant saturation CPU |
| Reverb | ⚠️ | Pseudo-reverb via `AudioDelay` + feedback |
| Bruit blanc (hihat) | ✅ | `Sample<>` + wavetable bruit |
| Distorsion/drive | 🔧 | À implémenter manuellement (clipping soft) |

---

## Architecture de code recommandée

### Paramètre "style" global
```cpp
// config.h — ajouter
enum MusicStyle {
  STYLE_JAPONAIS = 0,
  STYLE_AMBIENT,
  STYLE_MELODIQUE,
  STYLE_TECHNO,
  STYLE_ACID,
  STYLE_TRANCE
};
extern MusicStyle currentStyle;
```

### Structure d'un profil de style
```cpp
struct StyleProfile {
  uint8_t  attack_ms;      // ADSR attack
  uint8_t  decay_ms;       // ADSR decay
  uint8_t  sustain_level;  // 0–255
  uint16_t release_ms;     // ADSR release
  uint8_t  filter_cutoff;  // 0–255
  uint8_t  filter_res;     // 0–255
  float    lfo_freq;       // Hz, LFO sur le cutoff
  uint8_t  waveform;       // 0=sine, 1=saw, 2=square, 3=triangle
  const int* scale;        // pointeur vers tableau gamme
};
```

Un tableau de 6 profils → sélection par encodeur (contrôleur #4 "Timbre").

---

## Contrôleur physique recommandé

Le **Gros encodeur #4 "Timbre/Style"** (déjà prévu dans le design) devient le sélecteur de style.
- Appui court → cycle entre les styles
- Rotation → paramètre fin à l'intérieur du style (ex: résonance acid, vitesse LFO ambient)
- Affichage : couleur de la matrice LED change selon le style (bleu=ambient, rouge=acid, violet=trance…)

---

## Ce qui nécessiterait du matériel en plus

| Besoin | Solution actuelle | Matériel alternatif |
|---|---|---|
| Reverb réelle | Pseudo-delay feedback | Puce PT2399 (~2€) ou module FV-1 (~8€) |
| Polyphonie >4 voix | Limité Mozzi | 2e ESP32 dédié audio |
| Kick drum réaliste | Sine + pitch env | Sample sur carte SD + DAC |
| Effets stéréo vrais | DAC 25+26 (stéréo) | ✅ Déjà prévu ! PAM8403 stéréo |

---

*Analyse générée depuis : TB-303 synthesis docs, Mozzi docs (Context7), iMusician, SoundBridge, DIYElectroMusic*
