# LIF2D — Game of Life Visuel + Séquenceur Musical

Beta 1 du projet **LIF3D** : un afficheur LED 16×16 piloté par le Jeu de la Vie de Conway, qui génère de la musique en temps réel (style ToneMatrix).

**Hardware cible :** ESP32 + matrice WS2812B 16×16 + ampli PAM8403 + 10 encodeurs/potentiomètres  
**Esthétique :** boîtier bois noyer, laiton vieilli, style steampunk subtil

---

## Lancer le simulateur (sans hardware)

```bash
# 1. Installer les dépendances Python
pip install -r simulator/requirements.txt

# 2. Compiler le moteur GoL en bibliothèque native
bash simulator/build.sh

# 3. Lancer
python3 simulator/sim.py
```

### Contrôles

| Touche | Action |
|--------|--------|
| `ESPACE` | Play / Pause |
| `R` | Nouvelle graine aléatoire |
| `D` | Mode dessin (clic = placer/effacer une cellule) |
| `← →` | Changer la règle GoL |
| `↑ ↓` | Changer la gamme musicale |
| `+ -` | BPM ±10 |

Les sliders et boutons à l'écran reproduisent les contrôles physiques du futur boîtier.

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
