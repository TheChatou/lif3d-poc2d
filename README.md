# LIF2D — Game of Life Visuel + Séquenceur Musical

Beta 1 du projet **LIF3D** : un afficheur LED 16×16 piloté par le Jeu de la Vie de Conway, qui génère de la musique en temps réel (style ToneMatrix).

**Hardware cible :** ESP32 + matrice WS2812B 16×16 + ampli PAM8403 + 10 encodeurs/potentiomètres  
**Esthétique :** boîtier bois noyer, laiton vieilli, style steampunk subtil

---

## Simulateurs

### Simulateur Web (React + Web Audio API) — recommandé

Esthétique steampunk haute-fidélité, aucune installation requise.

```bash
cd simulator-web
npx serve .        # ou python3 -m http.server 8080
# → ouvrir http://localhost:8080
```

**Fonctionnalités :**
- Boîtier steampunk complet (bois sombre + cadre laiton) — vue Machine symétrique 3×3
- Matrice LED 16×16 avec halo ambré (teinte = note, intensité = âge) + flash de lecture
- Jeu de la Vie Conway B3/S23 synchronisé au BPM — 1 génération par balayage
- Arpégiateur (Up/Down/Random/Ping-pong/Tierces/Quintes) avec subdivision (×1 à ×8, ternaire ×3/×6) et groove swing
- Moteur Web Audio : synth multi-voix, ADSR, filtre, reverb, phaser, flanger
- Vue Expert : 9 cartes de réglages + aperçu matrice temps réel
- Responsive (scale transform), panneau Tweaks (densité, bloom, Ambre/Spectre)

### Simulateur Python (pygame + sounddevice) — développement moteur

Tourne directement le moteur GoL en C via ctypes. Utile pour tester le firmware.

```bash
# 1. Installer les dépendances Python
pip install -r simulator/requirements.txt

# 2. Compiler le moteur GoL en bibliothèque native
bash simulator/build.sh

# 3. Lancer
python3 simulator/sim.py
```

| Touche | Action |
|--------|--------|
| `ESPACE` | Play / Pause |
| `R` | Nouvelle graine aléatoire |
| `D` | Mode dessin (clic = placer/effacer une cellule) |
| `← →` | Changer la règle GoL |
| `↑ ↓` | Changer la gamme musicale |
| `+ -` | BPM ±10 |

---

## Structure du projet

```
src/
├── gol.h / gol.cpp       ← moteur GoL pur C (ESP32 + simulateur)
├── leds.h / leds.cpp     ← matrice WS2812B via FastLED        (TODO)
├── audio.h / audio.cpp   ← séquenceur Mozzi                   (TODO)
├── controls.h / .cpp     ← encodeurs, potentiomètres          (TODO)
└── main.cpp              ← assemblage FreeRTOS                 (TODO)
include/
└── config.h              ← toutes les constantes et pins GPIO
simulator/
├── sim.py                ← simulateur pygame (fait tourner gol.so)
├── build.sh              ← compile gol.cpp → gol.so
└── requirements.txt
simulator-web/
├── index.html            ← entrée HTML (React 18 + Babel CDN)
├── css/                  ← styles (tokens steampunk, layout, controls, expert)
├── js/                   ← composants (engine, audio, controls, matrix, machine, expert, app)
└── reference/            ← prototype de design original (non-production)
docs/
└── LIF2D_CONTEXT_CLAUDECODE.md   ← spec technique complète
```

---

## Prérequis firmware

- [PlatformIO](https://platformio.org/) dans VSCode
- Libs auto-installées : FastLED ^3.6.0, Mozzi ^2.0.0

```bash
pio run        # compiler
pio run -t upload   # flasher l'ESP32
```

---

*Projet LIF3D/LIF2D — Felix — Licence à définir*
