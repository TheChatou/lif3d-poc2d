# LIF2D — Contexte technique pour Claude Code
# Résumé de projet — Beta 1 (version 2D)

---

## Contexte global du projet

Le projet s'appelle **LIF3D** dans sa version finale — un afficheur volumétrique 3D POV (Persistence of Vision) combiné à un séquenceur musical génératif basé sur le **Jeu de la Vie de Conway en 3D** (grille 32×32×32). La version finale tourne à 1800 RPM avec deux matrices LED 32×32 dos-à-dos sur un rotor, transfert d'énergie sans contact (WPT), 3× ESP32-S3, son stéréo + subwoofer, MIDI in/out.

**Mais pour la Beta 1, on simplifie radicalement : on fait une version 2D à plat, appelée LIF2D.**

L'objectif de la Beta 1 est de valider :
- Le moteur GoL 2D en C sur ESP32
- Le pipeline GoL → LED (matrice WS2812B)
- Le séquenceur musical (GoL → notes → son)
- L'interface utilisateur physique complète
- Le design du boîtier

---

## Matériel — Beta 1 LIF2D

### Microcontrôleur
- **1× ESP32-D** (WiFi + BT, 4MB flash) — un seul ESP32 pour tout
- Framework : **Arduino via PlatformIO** dans VSCode
- Le projet PlatformIO s'appelle `lif3d-poc2d`

### Matrice LED
- **1× WS2812B 16×16 flexible** (256 LED RGB adressables individuellement)
- Protocole : signal série sur **1 seul GPIO**
- Alimentation : 5V (peut tirer jusqu'à ~1.5A avec le GoL actif)
- Bibliothèque : **FastLED**
- Les LED sont orientées vers le haut (face du dessus du boîtier)

### Audio
- **1× PAM8403** — amplificateur classe D analogique stéréo 5W+5W
- **2× haut-parleurs 4Ω 3W 28mm** — un gauche, un droit
- Signal audio depuis ESP32 via **PWM ou DAC**
- Bibliothèque son : **Mozzi**
- Les HP sont montés sur les faces latérales inclinées à ~30-45° (dirigés vers le haut-avant)

### Contrôleurs physiques (10 au total, 23 pins)

| # | Contrôleur | Type | Paramètre | Pins |
|---|---|---|---|---|
| 1 | Volume | Potentiomètre rotatif | Volume général audio | 1 ADC |
| 2 | BPM | Encodeur rotatif cranté | Tempo GoL (40-300 BPM) | 2 (CLK+DT) |
| 3 | Game/Gamme | Gros encodeur central "valve" | Gamme musicale (penta/minor/major/dorian) | 2+1btn |
| 4 | Timbre | Encodeur rotatif cranté | Preset sonore Mozzi | 2+1btn |
| 5 | Octave | Encodeur rotatif cranté | Octave de base (4 valeurs) | 2+1btn |
| 6 | Axe Y dessin | Gros encodeur gauche | Curseur Y en mode dessin | 2+1btn |
| 7 | Axe X dessin | Gros encodeur droit | Curseur X en mode dessin | 2+1btn |
| 8 | Play/Pause | Petit bouton poussoir | Pause/reprise GoL | 1 |
| 9 | Reset/New seed | Petit bouton poussoir | Nouvelle graine aléatoire (court) / menu formes (long) | 1 |
| 10 | Luminosité | Potentiomètre linéaire | Dimmer matrice LED | 1 ADC |
| 11 | Règles GoL | Potentiomètre linéaire à crans | Sélection règle B/S prédéfinie | 1 ADC |

Total : **23 pins** sur ~25 disponibles sur l'ESP32-D.

---

## Design du boîtier LIF2D

Forme trapézoïdale vue de dessus et de profil :
- Base large, top étroit (quasi à la taille de la matrice 16×16)
- Profil bas et plat (comme une pédale d'effet ou une console de jeu rétro)
- Face du dessus : matrice LED + rangée de 5 contrôleurs (haut)
- Face avant inclinée ~30° : 2 gros encodeurs + 2 boutons + 2 potentiomètres linéaires
- Faces latérales inclinées ~30-45° : 1 HP de chaque côté dirigé vers le haut
- 4 pieds

Esthétique : **steampunk subtil** — bois noyer foncé, laiton vieilli, encodeurs à molettes crantées, gros encodeur central avec "valve circulaire" style hublot sous-marin.

---

## Architecture firmware LIF2D

### Un seul ESP32, deux cœurs FreeRTOS

```
Core 0 (temps réel) :
├── Tâche GoL         → calcule la génération suivante
├── Tâche LED         → envoie l'état GoL à la matrice via FastLED
└── Tâche Contrôles   → lit les encodeurs, potentiomètres, boutons

Core 1 (audio) :
└── Tâche Mozzi       → séquenceur musical, lit les cellules vivantes, joue les notes
```

### Logique musicale (style ToneMatrix Conway)

- **Axe Y** de la grille = hauteur de note (gamme sélectionnée)
- **Balayage colonne par colonne** de gauche à droite = le temps (1 colonne = 1 tick BPM)
- **Cellule vivante** à l'intersection colonne courante × ligne Y = note jouée
- **Axe Z** (profondeur, inexistant en 2D) → remplacé par modulation du filtre selon densité globale
- 1 génération GoL = 1 mesure ou ½ mesure selon BPM

### Règles GoL 3D testées (à implémenter en 2D aussi)
- B5S45 — "Coral" — croissance lente, stable
- B4S5 — "Builder" — structures complexes
- **B6S567 — "Dense" — 4.4% densité, meilleur pour la musique (sparse, évolutif) ← RECOMMANDÉ**
- B5S5 — "Symmetric" — patterns symétriques
- B36S23 — "Highlife" — très actif
- B4S45 — "Balanced"

En 2D classique : règles Conway B3S23 aussi disponibles.

### Gammes musicales disponibles
```c
int SCALE_PENTA[]  = {0,2,4,7,9,12,14,16,19,21,24};
int SCALE_MINOR[]  = {0,2,3,5,7,8,10,12,14,15,17,19};
int SCALE_MAJOR[]  = {0,2,4,5,7,9,11,12,14,16,17,19};
int SCALE_DORIAN[] = {0,2,3,5,7,9,10,12,14,15,17,19};
```

### Modes de fonctionnement
1. **Mode GoL** — le jeu tourne automatiquement, les contrôleurs ajustent les paramètres
2. **Mode Dessin** — encodeur gauche = axe Y, encodeur droit = axe X, clic = placer/effacer cellule. Basculer via le potentiomètre "Règles" en position 0 ou via long press Reset.
3. **Mode Formes** — long press sur Reset → sélection d'une forme prédéfinie sauvegardée (glider, blinker, patterns custom...)

---

## Structure du projet PlatformIO

```
lif3d-poc2d/
├── src/
│   ├── main.cpp          ← point d'entrée, init FreeRTOS tasks
│   ├── gol.h / gol.cpp   ← moteur Game of Life 2D (et 3D plus tard)
│   ├── leds.h / leds.cpp ← pilotage matrice WS2812B via FastLED
│   ├── audio.h / audio.cpp ← séquenceur Mozzi, mapping GoL→notes
│   └── controls.h / controls.cpp ← lecture encodeurs, pots, boutons
├── include/
│   └── config.h          ← toutes les constantes (#define GRID_SIZE 16, pins, etc.)
├── lib/
├── platformio.ini
└── tools/
    └── visualizer.py     ← visualisateur Serial→Python pour debug (déjà écrit)
```

### platformio.ini actuel
```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200

lib_deps =
  fastled/FastLED @ ^3.6.0
  sensorium/Mozzi @ ^2.0.0
```

---

## Ce qui est déjà fait

- [x] Simulateur GoL 3D en Python (`lif3d_gol3d_simulator.py`) — testé et fonctionnel, règle B6/S567 validée musicalement (densité ~4.4%)
- [x] Projet PlatformIO créé dans VSCode
- [x] `platformio.ini` configuré avec FastLED + Mozzi
- [x] Comparatif audio interactif HTML créé
- [x] Design boîtier esquissé (photo croquis disponible)

## Ce qui reste à faire (ordre prioritaire)

- [ ] `config.h` — définir toutes les constantes et attribution des pins GPIO
- [ ] `gol.cpp` — implémenter le moteur GoL 2D en C (grille 16×16, règles configurables)
- [ ] `leds.cpp` — afficher l'état GoL sur la matrice WS2812B
- [ ] `controls.cpp` — lire les encodeurs (interruptions) et potentiomètres (ADC)
- [ ] `audio.cpp` — séquenceur Mozzi piloté par le GoL
- [ ] `main.cpp` — assembler les tâches FreeRTOS
- [ ] Tests sur breadboard avec le matériel commandé

---

## Composants commandés (en transit AliExpress)

- 1× WS2812B 16×16 flexible RGB
- 1× MAX98357A (ampli I²S — réservé pour LIF3D 3D)
- 1× PAM8403 stéréo (pour LIF2D)
- 2× HP 4Ω 3W 28mm
- Aimants N35 Ø5×2mm × lot
- Hall sensors lot mixte (utiliser US5881 ou A3144E uniquement)
- Alimentation 5V

---

## Notes importantes pour le développement

**Sur Mozzi + ESP32 :** vérifier la compatibilité de la version avec ESP32-D spécifiquement. Mozzi est plus stable sur ESP32 classique que sur S3. Si problème, fallback sur ESP32-audioI2S.

**Sur FastLED + WS2812B :** utiliser `FASTLED_ESP32_I2S true` pour éviter les conflits avec le WiFi. Le pin data de la matrice doit être sur un GPIO sans restriction (éviter GPIO 0, 2, 15).

**Sur les encodeurs rotatifs :** utiliser des interruptions matérielles (attachInterrupt) pour ne rater aucun tick, surtout pendant le calcul GoL. Les encodeurs EC11 standard ont du rebond — prévoir un debounce logiciel ou matériel (condensateur 100nF entre les pins).

**Grille GoL :** stocker en tableau uint8_t[16][16] ou en bitfield uint16_t[16] pour économiser la RAM. Le calcul des voisins doit utiliser des bords toroïdaux (la grille se boucle sur elle-même) pour éviter les effets de bord.

---

## Roadmap complète (pour contexte)

La Beta 1 LIF2D est la phase POC. Après validation :
- **Proto A LIF3D** : rotor + matrices 32×32 + WPT + 3× ESP32-S3
- **Proto B** : bobines Litz custom, OTA, documentation open source
- **Alpha** : vente kit DIY + unité finie, ~300-380€, licence CERN OHL + MIT

---

*Document généré le 11 avril 2026 — projet LIF3D/LIF2D par Felix*



___

NOTES :
- option d'enregistrement et de chargement de pattern
- randomize avec des options de symetrie axiales, co-axiales et centrales
- mode boucle (selection d'une boucle de 4, ou 8, ou 2 iterations. selection possible sur les generations. ex: boucle de 4 a partir de la gen 24, en crescendo, donc 24, 25, 26, 25, 24, 25, 26, etc ...)
- ajout d'un arpeggiator
- Ajouter un age aux cellules, et pouvoir selectionner comment caler les son (ex: fondamentale gen1, harmonique 1 pour les gen2, etc)