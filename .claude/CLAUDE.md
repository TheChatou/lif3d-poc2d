# LIF2D — Contexte projet pour Claude Code

## Vue d'ensemble

**LIF2D** est la Beta 1 du projet **LIF3D** : un afficheur visuel + séquenceur musical génératif basé sur le Jeu de la Vie de Conway.

- **LIF2D (maintenant)** : version 2D à plat — matrice LED 16×16 + audio stéréo + 10 contrôleurs physiques
- **LIF3D (futur)** : rotor POV 32×32×32 à 1800 RPM, 3× ESP32-S3, WPT, son stéréo + subwoofer

Objectif Beta 1 : valider le moteur GoL 2D, le pipeline GoL→LED, le séquenceur musical, l'UI physique et le design boîtier.

Doc technique complète : `docs/LIF2D_CONTEXT_CLAUDECODE.md`

---

## Matériel

| Composant | Modèle | Interface |
|---|---|---|
| MCU | ESP32-D (1 seul) | — |
| Matrice LED | WS2812B 16×16 flexible | 1 GPIO (FastLED) |
| Ampli audio | PAM8403 classe D stéréo | PWM ou DAC |
| HP | 2× 4Ω 3W 28mm | — |
| Encodeurs | EC11 rotatifs crantés | 2 pins + 1 btn chacun |

**Composants en transit AliExpress** (pas encore reçus au 11 avril 2026) :
WS2812B 16×16, PAM8403, HP 28mm, Hall sensors (US5881/A3144E), aimants N35.

---

## Architecture firmware

### FreeRTOS — 2 cœurs

```
Core 0 (temps réel) :  Tâche GoL | Tâche LED | Tâche Contrôles
Core 1 (audio)      :  Tâche Mozzi (séquenceur)
```

### Bibliothèques
- **FastLED ^3.6.0** — matrice WS2812B
- **Mozzi ^2.0.0** — synthèse audio

### Contraintes importantes
- FastLED : utiliser `FASTLED_ESP32_I2S true` pour éviter conflit WiFi
- FastLED : pin data sur GPIO sans restriction (éviter 0, 2, 15)
- Mozzi : vérifier compatibilité ESP32-D (plus stable que sur S3)
- Encodeurs EC11 : debounce obligatoire (100nF ou logiciel), utiliser `attachInterrupt`
- Grille GoL : bords toroïdaux, stocker en `uint8_t[16][16]` ou bitfield `uint16_t[16]`

---

## Structure des fichiers

```
src/
├── main.cpp          ← init + assemblage tâches FreeRTOS
├── gol.h / gol.cpp   ← moteur GoL 2D (grille 16×16, règles configurables)
├── leds.h / leds.cpp ← pilotage WS2812B via FastLED
├── audio.h / audio.cpp ← séquenceur Mozzi, mapping GoL→notes
└── controls.h / controls.cpp ← encodeurs, potentiomètres, boutons
include/
└── config.h          ← toutes les constantes (#define) et attribution pins GPIO
tools/
└── visualizer.py     ← debug Serial→Python
docs/
└── LIF2D_CONTEXT_CLAUDECODE.md ← spec technique complète (à lire si besoin de détails)
```

---

## Logique musicale

- **Axe Y** de la grille = hauteur de note (selon gamme sélectionnée)
- **Balayage colonne par colonne** (gauche → droite) = temps / tick BPM
- **Cellule vivante** à colonne courante × ligne Y = note jouée
- 1 génération GoL = 1 mesure ou ½ mesure selon BPM

### Gammes disponibles
```c
int SCALE_PENTA[]  = {0,2,4,7,9,12,14,16,19,21,24};
int SCALE_MINOR[]  = {0,2,3,5,7,8,10,12,14,15,17,19};
int SCALE_MAJOR[]  = {0,2,4,5,7,9,11,12,14,16,17,19};
int SCALE_DORIAN[] = {0,2,3,5,7,9,10,12,14,15,17,19};
```

### Règle GoL recommandée
**B6/S567 "Dense"** — densité ~4.4%, meilleure pour la musique (sparse, évolutif).
Autres disponibles : B5S45 (Coral), B4S5 (Builder), B5S5 (Sym), B36S23 (Highlife), B4S45 (Balanced), B3S23 (Conway classique).

---

## Contrôleurs physiques (10 contrôleurs, 23 pins)

| # | Rôle | Type | Pins |
|---|---|---|---|
| 1 | Volume général | Pot rotatif | 1 ADC |
| 2 | BPM (40-300) | Encodeur cranté | 2 |
| 3 | Gamme musicale | Gros encodeur "valve" | 2+1btn |
| 4 | Timbre Mozzi | Encodeur cranté | 2+1btn |
| 5 | Octave | Encodeur cranté | 2+1btn |
| 6 | Axe Y dessin | Gros encodeur gauche | 2+1btn |
| 7 | Axe X dessin | Gros encodeur droit | 2+1btn |
| 8 | Play/Pause | Bouton poussoir | 1 |
| 9 | Reset/New seed | Bouton poussoir | 1 |
| 10 | Luminosité LED | Pot linéaire | 1 ADC |
| 11 | Règles GoL | Pot linéaire à crans | 1 ADC |

---

## Modes de fonctionnement

1. **Mode GoL** — jeu automatique, contrôleurs ajustent paramètres
2. **Mode Dessin** — encodeurs X/Y pour placer/effacer cellules manuellement
3. **Mode Formes** — long press Reset → sélection forme prédéfinie (glider, blinker...)

---

## État d'avancement

### Fait
- [x] Simulateur GoL 3D Python (`/home/chatou/Documents/PERSO/Sound of Lif3D/Tests/lif3d_gol3d_simulator.py`)
- [x] Visualiseur Web POV interactif (`pov_volumetrique_principe.html`)
- [x] `platformio.ini` configuré (FastLED + Mozzi)
- [x] Spécification complète rédigée (`docs/LIF2D_CONTEXT_CLAUDECODE.md`)

### À faire (ordre prioritaire)
- [ ] `include/config.h` — constantes + pins GPIO
- [ ] `src/gol.cpp` — moteur GoL 2D
- [ ] `src/leds.cpp` — rendu WS2812B
- [ ] `src/controls.cpp` — encodeurs + ADC
- [ ] `src/audio.cpp` — séquenceur Mozzi
- [ ] `src/main.cpp` — assemblage FreeRTOS

---

## Instructions pour Claude

- Toujours coder en C/C++ Arduino pour l'ESP32, framework PlatformIO
- Ne pas inventer d'attribution de pins — attendre `config.h` ou demander
- Prioriser la fiabilité temps-réel (pas de `delay()` dans les tâches FreeRTOS)
- Mettre à jour ce fichier + `docs/LIF2D_CONTEXT_CLAUDECODE.md` quand l'architecture évolue
- Mettre à jour la mémoire projet (auto-memory) à chaque jalon important
- Travailler en français avec Felix

### Pédagogie — priorité absolue

**Ce projet est avant tout un projet d'apprentissage.** Felix est un maker qui apprend en fabriquant des objets cool et beaux. Il a peu d'expérience en embarqué C/C++.

- **Toujours inclure des commentaires `// 🎓` dans le code** pour expliquer les concepts clés (ADC, DAC, FreeRTOS, interruptions, bitwise ops…)
- Expliquer le "pourquoi" avant le "comment" dans les réponses
- Ne pas supposer qu'il connaît les acronymes embarqués — les définir au moins une fois
- Valoriser la beauté et l'élégance du résultat final, pas juste la fonctionnalité
- Si plusieurs approches existent, expliquer brièvement les compromis pour que Felix comprenne le choix
