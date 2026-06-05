# LIF2D — Contexte projet pour Claude Code

## Vue d'ensemble

**LIF2D** est la Beta 1 du projet **LIF3D** : un afficheur visuel + séquenceur musical génératif basé sur le Jeu de la Vie de Conway.

- **LIF2D (maintenant)** : version 2D à plat — matrice LED 16×16 + audio stéréo + 10 contrôleurs physiques
- **LIF3D (futur)** : rotor POV 32×32×32 à 1800 RPM, 3× ESP32-S3, WPT, son stéréo + subwoofer

Objectif Beta 1 : valider le moteur GoL 2D, le pipeline GoL→LED, le séquenceur musical, l'UI physique et le design boîtier.

Doc technique complète : `docs/LIF2D_CONTEXT_CLAUDECODE.md`

---

## Matériel

### À moi (perso)
| Composant | Modèle | Notes |
|---|---|---|
| MCU | ESP32-D | DAC GPIO 25/26 — config.h ok |
| Matrice LED | WS2812B 16×16 flexible | 1 GPIO (FastLED) |
| Ampli audio | PAM8403 HW-894 BT 5.0 | 5W+5W @ 4Ω — LINE IN 3.3V compatible DAC ESP32 |
| HP | 2× 28mm 4Ω 3W | Confirmé 4Ω |
| Hall sensors | US5881 ×10 | Réservés LIF3D |
| Aimants | NdFeB N35 5×2mm ×10 | Réservés LIF3D |
| Alimentation | 12V/2A BF-1220 | 24W max → FastLED.setBrightness(128) obligatoire |
| Ampli I²S | MAX98357A | Réservé LIF3D |

### Du lab (école)
| Composant | Modèle | Notes |
|---|---|---|
| Buck converter | LM2596S ajustable | 12V→5V/3A — régler à 5V avec multimètre |

### À commander
| Composant | Notes |
|---|---|
| Potentiomètres rotatifs ×4 | Volume, Luminosité, Timbre, Règles |
| Encodeurs EC11 ×2 | BPM, Gamme |
| Boutons poussoir ×2 | Play/Pause, Reset |
| Potentiomètres linéaires ×2 | Luminosité fine, Morph règles |

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
- **MCU : ESP32-D** (ESP32-WROOM-32 ou similaire) — a 2 DAC hardware (GPIO 25/26) ✅
- FastLED : utiliser `FASTLED_ESP32_I2S true` pour éviter conflit WiFi
- FastLED : pin data GPIO_NUM_48 proposé ; éviter GPIO 0, 1, 2
- **FastLED.setBrightness(128) max** — alimentation 12V/2A = 24W, matrice à fond tire >3A @ 5V
- Mozzi + FastLED → cœurs FreeRTOS séparés OBLIGATOIRE (conflit d'interruptions sinon)
- Encodeurs EC11 : debounce obligatoire (100nF ou logiciel), utiliser `attachInterrupt`
- Grille GoL : bords toroïdaux, stocker en `uint8_t[16][16]` ou bitfield `uint16_t[16]`
- ADC ESP32-S3 : éviter GPIO 0, 1 au boot ; préférer GPIO 4-10
- PAM8403 HW-894 : entrée 3.3V logique ou via condensateur liaison AC 100µF

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

### Gammes disponibles (validées Python)
```python
# ← PRIORITAIRE : Japonaise / Hirajoshi en La
SCALE_JAPONAISE    = [0, 1, 5, 7, 8, 12, 13, 17, 19, 20, 24]
# 5 notes sparse = parfait avec densité GoL 4.4%, évite les clusters dissonants

SCALE_PENTA        = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]
SCALE_PENTA_MINOR  = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24]
SCALE_LYDIEN       = [0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 19]
SCALE_MIXOLYDIEN   = [0, 2, 4, 5, 7, 9, 10, 12, 14, 16, 17, 19]
SCALE_PHRYGIEN_DOM = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16, 17, 19]
```

### Paramètres sonores validés (Python → à porter en Mozzi)
```
attack   : 15ms
decay    : 4.0 (exponentiel)
duration : 350ms
volume   : 0.45
harmoniques : 0.88 × fond + 0.08 × 2e + 0.03 × 3e + 0.01 × 4e  (cloche de cristal)
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
- [x] `include/config.h` — constantes + pins GPIO (280 lignes)
- [x] `src/gol.cpp` + `src/gol.h` — moteur GoL 2D (229 lignes)
- [x] Simulateur Python (`simulator/sim.py` v4) avec audio .wav + filtre biquad
- [x] Gammes musicales validées à l'écoute (Japonaise prioritaire)
- [x] Paramètres sonores validés (cloche de cristal 15ms attack, 350ms decay)
- [x] Hardware reçu : WS2812B, PAM8403 HW-894, HP 28mm ×2, alim 12V/2A

### À faire (ordre prioritaire)
- [ ] **Commander buck converter 12V→5V + contrôleurs physiques**
- [ ] `src/main.cpp` — test LED statique (first light !)
- [ ] `src/leds.cpp` — rendu WS2812B via FastLED
- [ ] `src/controls.cpp` — encodeurs (interruptions) + ADC potars
- [ ] `src/audio.cpp` — séquenceur Mozzi piloté par GoL
- [ ] `src/main.cpp` final — assemblage FreeRTOS 2 cœurs
- [ ] Tests sur breadboard

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
