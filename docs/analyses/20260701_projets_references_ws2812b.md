# Projets de référence — WS2812B 16×16 + ESP32
> 2026-07-01 — recherche pour le projet LIF2D

---

## Priorité 1 — Même hardware exact

### s-marley — auteur de référence

Même matrice 16×16 WS2812B, même ESP32, même FastLED. Le code le plus directement réutilisable pour LIF2D.

| Repo | Contenu | Intérêt LIF2D |
|---|---|---|
| [ESP32Matrix](https://github.com/s-marley/ESP32Matrix) | Tetris, Snake, Breakout, contrôle Bluetooth | Code FastLED de référence, gestion serpentin, wiring |
| [ESP32-INMP441-Matrix-VU](https://github.com/s-marley/ESP32-INMP441-Matrix-VU) | VU meter audio sur 16×16, micro I2S | Mapping son → pixels, directement applicable |
| [ESP32_FFT_VU](https://github.com/s-marley/ESP32_FFT_VU) | Analyseur FFT spectre sur matrice FastLED | Pipeline audio → LED, inspirant pour GoL→notes→LED |

Série YouTube associée :
- [Part 1 — Setup matrice](https://www.youtube.com/watch?v=_0a9JZLGu4M)
- [Part 2 — Tetris Bluetooth](https://www.youtube.com/watch?v=cqmWfE1DSyM)
- [Part 3 — Snake + Breakout](https://www.youtube.com/watch?v=apmOSQmeKJA)

---

## Priorité 2 — Jeu de la Vie sur LED matrix

| Source | Lien | Notes |
|---|---|---|
| Hackster.io | [Arduino LED Matrix GoL](https://www.hackster.io/aerodynamics/arduino-led-matrix-game-of-life-093f06) | Logique rendu cellule→pixel, portage facile |
| Adafruit | [GoL CircuitPython](https://learn.adafruit.com/rgb-led-matrices-matrix-panels-with-circuitpython/example-conways-game-of-life) | Code propre, portage vers Arduino/PlatformIO facile |

---

## Priorité 3 — Musique réactive sur même matrice

| Source | Lien | Notes |
|---|---|---|
| YouTube | [MUSIC SOUND CONTROLLED 16×16 WS2812B](https://www.youtube.com/watch?v=Ubrom0bPmUw) | Exactement ta matrice, effets audio réactifs |
| Blog | [Music Reactive LED Matrix — Radaelli](https://aradaelli.com/blog/music-reactive-led-matrix/) | Article technique : FFT + mapping fréquences→colonnes |
| Hackaday | [DIY Audio Spectrum WS2812B](https://hackaday.io/project/19080-diy-led-audio-spectrum-analyzer-using-ws2812b) | Schéma complet, étapes de construction |

---

## Référence — Grands projets communautaires

### WLED
- Repo : https://github.com/WLED/WLED
- Firmware open source ESP32 + WS2812B, très mature
- Plugin **AudioReactive** : microphone ou line-in → effets visuels 2D sur matrice
- Mode 2D natif avec mapping configurable (serpentin, miroir, etc.)
- Utile pour lire le code de mapping 2D et les effets audio réactifs

### PixelIt
- Repo : https://github.com/pixelit-project/PixelIt
- ESP32/ESP8266 + WS2812B, pixel art + horloge + contrôle JSON
- Interface web soignée, bon exemple d'architecture firmware

---

## Outil — Simulateur Wokwi

**URL** : https://wokwi.com/projects/309272375494443585

Simulateur ESP32 + FastLED dans le navigateur. Permet de tester du code FastLED sur une matrice 16×16 virtuelle sans flasher de hardware. Utile pour debug visuel rapide.

---

## Ce qu'il faut retenir pour LIF2D

1. **Lire le wiring de s-marley** dans ESP32Matrix pour valider injection d'alim et résistance DATA
2. **ESP32-INMP441-Matrix-VU** : voir comment il mappe le son sur les pixels → inspiration directe pour GoL→note→pixel
3. **Wokwi** : créer un projet de simulation pour tester le code GoL avant d'avoir le hardware complet
4. **WLED AudioReactive** : code de référence pour le pipeline FFT si on veut aller plus loin que Mozzi
