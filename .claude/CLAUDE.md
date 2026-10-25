# LIF2D — Contexte projet pour Claude Code

## Vue d'ensemble

**LIF2D** est la Beta 1 du projet **LIF3D** : un afficheur visuel + séquenceur musical génératif basé sur le Jeu de la Vie de Conway.

- **LIF2D (maintenant)** : version 2D à plat — matrice LED 16×16 + audio stéréo + 2 encodeurs + 1 bouton play/pause (design "ardoise magique" simplifié, révisé 2026-08-24)
- **LIF3D (futur)** : rotor POV 32×32×32 à 1800 RPM, 3× ESP32-S3, WPT, son stéréo + subwoofer

Objectif Beta 1 : valider le moteur GoL 2D, le pipeline GoL→LED, le séquenceur musical, l'UI physique et le design boîtier.

Doc technique complète : `docs/LIF2D_CONTEXT_CLAUDECODE.md`

---

## Matériel

> **Source de vérité à jour : `docs/CDC_LIF2D_Beta1_20260611.md` (v1.0 validé)**
> Le tableau ci-dessous est un résumé — consulter le CDC pour la liste complète et les prix.

### En stock
| Composant | Modèle réel | Notes |
|---|---|---|
| MCU | Clone USB-C 30-pin avec **ESP32-WROOM-32D** (puce ESP32-D0WD) | DAC GPIO 25/26 ✅ — ref: `docs/datasheet/ESP32-D_board_reference.md` |
| Matrice LED | WS2812B 16×16 flexible 256 LEDs | 5V, signal DATA 3.3V + résistance 300Ω |
| Ampli audio | PAM8403 (module simple, 4 trous sorties HP) | **3W+3W @ 4Ω** à 5V — LINE IN 3.3V ✅ |
| HP | 2× 28mm 4Ω 3W | ✅ Appairés exactement avec le PAM8403 |
| Hall sensors | US5881 ×10 | Réservés LIF3D |
| Aimants | NdFeB N35 5×2mm ×10 | Réservés LIF3D |
| Ampli I²S | MAX98357A | Réservé LIF3D |
| BF-1220 12V/2A | Alim secteur | ⚠ Mis de côté — remplacée par LRS-75-5 pour LIF2D, garder pour LIF3D |
| LM2596S | Buck converter lab | ⚠ Mis de côté — plus nécessaire avec LRS-75-5 |

### À commander (voir CDC section 5 pour les détails et prix — ⚠️ section à nettoyer, voir révision ci-dessous)
| Composant | Priorité |
|---|---|
| **Mean Well LRS-75-5** (5V/14A/70W) | 🔴 CRITIQUE — alimentation principale |
| Gros encodeurs ×2 + cache-molette ×2 + bouton poussoir ×1 (play/pause) | 🔴 CRITIQUE — design révisé, potentiomètres/EC11/pots linéaires du CDC obsolètes |
| Jack TRS 3.5mm simple 3 broches (MIDI OUT) + jack TRS commuté 5 broches PJ-302M (Audio OUT auto-mute) + résistances 220Ω | 🔴 CRITIQUE |
| Résistances 1Ω / 1W ×2 | 🟡 UTILE — protection HP |

### ⚠️ Révision design — contrôles simplifiés (2026-08-24)

Design final "ardoise magique" (Etch A Sketch) : boîtier minimaliste, façade dessus épurée au maximum.

- **Dessus du boîtier** : uniquement 2 encodeurs (gros cache-molette façon ardoise magique) + 1 bouton play/pause centré entre les deux. Plus aucun potentiomètre, EC11 séparé, switch latching ou pot linéaire — **tout le paramétrage passe par les 2 encodeurs**, la matrice LED 16×16 servant d'écran de menu (voir tâche UI/menu ci-dessous).
- **On/Off** : géré par l'embase secteur elle-même (Huaconn HC-99-F5, interrupteur + fusible intégrés) — pas de bouton on/off séparé sur le boîtier.
- **Face arrière** (même côté que la prise secteur) : jack audio (PJ-3410, 5 broches, sortie) + jack MIDI OUT (PJ-3410, 3 broches). ✅ Clarifié 2026-09-04 : pas d'entrée audio ni MIDI IN — "entrée jack" désignait juste un connecteur en face arrière, pas un signal d'entrée. Voir `docs/analyses/20260904_jack_audio_casque_dac_brut.md`.
- **Grosse inconnue à concevoir** : le système de menus/navigation sur la matrice 16×16 comme "écran" (comment afficher et naviguer dans des réglages sur 256 pixels avec seulement 2 encodeurs). C'est un morceau de conception à part entière, pas un détail.

Ceci **supersede** la table "Contrôleurs physiques (10 contrôleurs)" ci-dessous et la partie contrôles du tableau "À commander" — gardées telles quelles dans le CDC pour historique, mais non plus d'actualité.

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
- **MCU : ESP32-WROOM-32D** (clone USB-C 30 pins) — 2 DAC hardware GPIO25 (L) + GPIO26 (R) ✅
- FastLED : utiliser `FASTLED_ESP32_I2S true` pour éviter conflit timers internes
- FastLED : pin DATA → **GPIO5** (pas strapping, pas conflit ADC2/Mozzi) ; éviter GPIO 0, 2, 4, 12, 15
- **Protection puissance LEDs** : `FastLED.setMaxPowerInVoltsAndMilliamps(5, 10000)` dans setup() — pas setBrightness seul
- Alimentation : **Mean Well LRS-75-5 (5V/14A)** — tout en 5V direct, aucun buck intermédiaire
- Mozzi + FastLED → cœurs FreeRTOS séparés OBLIGATOIRE (conflit d'interruptions sinon)
- Encodeurs EC11 : décodage quadrature par table sur interruptions (`src/ui/input.cpp`) = anti-rebond logiciel suffisant. Condos 100nF **retirés** (2026-10-26) ; s'ils sont remis : **entre ROTA et GND (en parallèle), JAMAIS en série** sur le fil
- Grille GoL : bords toroïdaux, stocker en `uint8_t[16][16]` pour l'âge
- ADC : utiliser **uniquement ADC1** (GPIO 32–39) — ADC2 incompatible avec certains timers Mozzi
- PAM8403 : entrée LINE IN 3.3V direct depuis DAC ESP32 ✅ — optionnel : condo 100µF si bruit DC
- **GPIO DATA WS2812B** : résistance 300Ω série obligatoire (signal 3.3V pour composant 5V)
- **MIDI OUT** : GPIO4 (UART2_TX remappé) → TRS 3.5mm Type A — `Serial2.begin(31250, SERIAL_8N1, -1, 4)`
- **Audio OUT** : GPIO25/26 (DAC) → jack TRS commuté 5 broches PJ-302M → PAM8403 + sortie ligne — auto-mute HP sans code
- **HP protection** : résistances 1Ω/1W en série sur sorties L+ et R+ du PAM8403
- **Procédure de flash (boîte montée)** : débrancher le fil **VIN** de l'ESP32 (garder GND), USB = ESP32 seul, secteur = matrice + amplis. **Jamais USB + VIN branchés ensemble** (le 5 V USB alimenterait toute la boîte via VIN). Rebrancher VIN pour l'usage autonome. Port réel : `/dev/ttyUSB0` → `--upload-port /dev/ttyUSB0`
- **FastLED figé en 3.10.3** dans `env:ui_test` (la 3.10.8 a donné une matrice toute blanche) — ne jamais remettre `^`
- **Orientation matrice** : `ORIENT_TRANSPOSE 1` seul dans `src/ui/display.cpp` (validé sur la boîte)

---

## Structure des fichiers

```
src/
├── main.cpp          ← init + assemblage tâches FreeRTOS
├── gol.h / gol.cpp   ← moteur GoL 2D (grille 16×16, règles configurables)
├── leds.h / leds.cpp ← pilotage WS2812B via FastLED
├── audio.h / audio.cpp ← séquenceur Mozzi, mapping GoL→notes
└── controls.h / controls.cpp ← encodeurs, potentiomètres, boutons
src/ui/              ← système de menus (polices, affichage, entrées, hub, pages, BOOM…) — testé via env:ui_test
test_ui/main.cpp     ← firmware de test des menus (avec son Mozzi)
tools/fonts_src.py + gen_fonts.py ← polices pixel (source) → src/ui/font_data.h
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

## Contrôleurs physiques — design révisé (2026-08-24)

⚠️ Table ci-dessous obsolète (ancien design 10 contrôleurs), gardée pour historique. Voir la révision dans la section Matériel plus haut.

**Design actuel : 3 contrôleurs seulement**

| # | Rôle | Type | Pins |
|---|---|---|---|
| 1 | Encodeur A (navigation menu / valeur) | Gros encodeur + cache-molette | 2+1btn |
| 2 | Encodeur B (navigation menu / valeur) | Gros encodeur + cache-molette | 2+1btn |
| 3 | Play/Pause | Bouton poussoir, centré entre les 2 encodeurs | 1 |

Tout le paramétrage (BPM, gamme, timbre, octave, luminosité, règles GoL...) passe désormais par un **système de menus affiché sur la matrice LED 16×16**, navigué avec les 2 encodeurs. Rôle exact de chaque encodeur (navigation vs valeur, ou les deux selon le contexte du menu) **à concevoir** — voir tâche dédiée dans l'état d'avancement.

<details>
<summary>Ancien design (10 contrôleurs, 23 pins) — obsolète</summary>

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

</details>

---

## Modes de fonctionnement

1. **Mode GoL** — jeu automatique, contrôleurs ajustent paramètres
2. **Mode Dessin** — encodeurs pour placer/effacer cellules manuellement
3. **Mode Formes** — sélection forme prédéfinie (glider, blinker...)
4. **Mode Menu** — la matrice 16×16 devient un écran de navigation/réglages (nouveau, design révisé 2026-08-24) — à concevoir

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
- [x] Hardware en stock : WS2812B, PAM8403, HP 28mm ×2, ESP32-WROOM-32D (clone USB-C)
- [x] CDC v1.0 validé (`docs/CDC_LIF2D_Beta1_20260611.md`) — source de vérité du projet
- [x] Bilan de puissance validé — chaîne LRS-75-5 5V/14A (`docs/analyses/20260612_bilan_puissance.md`)
- [x] Pinout ESP32-D documenté (`docs/datasheet/ESP32-D_board_reference.md`)
- [x] **Hardware complet assemblé dans le boîtier final** (2026-10-24) — matrice rachetée après court-circuit, schéma as-built + photos dans `docs/photos/`, vérifié conforme à `config.h`
- [x] First light : firmware de test (chiffres/texte 3×5/glider) tourne sur la matrice

### À faire — phase software (plan d'attaque validé 2026-10-24, une étape à la fois)
- [x] **Étape 0 — Ménage git** (2026-10-24, tag `hardware-done`) : commit du travail en attente + tag `hardware-done`
- [x] **Étape 1 — Conception UI** (2026-10-24) : gestes, conventions, écrans, typos → `docs/analyses/20261024_ui_grammaire_controles.md`, `20261024_actions_et_conventions_machines.md`, `20261024_ecrans_maquettes_16x16.md` (§0 = révision v2 qui fait foi), `20261024_typographies_16x16.md`
- [x] ~~Étape 2 — Simulateur web~~ → remplacé par un **firmware de test directement sur la boîte** (`env:ui_test`, `src/ui/` + `test_ui/main.cpp`) — 1re version validée "dans l'ensemble" par Felix le 2026-10-25
- [ ] **Étape 3 — Itérer sur `ui_test`** : corriger les petits bugs, déplacement dans les presets peu pratique, retester la lisibilité des pages de réglages (variante "réglage en gros" si besoin)
- [x] **Étape 3b — Musique dans `ui_test`** (2026-10-26) : Mozzi/`audio.cpp` branché, l'horloge du séquenceur fait avancer le GoL ; ▶ et volume reliés. Reste à relier BPM/gamme/timbre/BOOM (étape 5)
- [x] **Étape 3c — Réparer les 2 encodeurs** (2026-10-26) : condos retirés, `ENC_SINGLE_CHANNEL 0`, `INVERT_A/B 1` (horaire = descendre/augmenter)
- [ ] **Étape 4 — Firmware final contrôles + menus** : intégrer `src/ui/` au firmware principal + sauvegarde NVS
- [ ] **Étape 5 — Audio** : relier les réglages (BPM, gamme, timbre…) à `audio.cpp` + **gain staging TDA2822 / PAM8403**
- [ ] **Étape 6 — Assemblage** : `src/main.cpp` final FreeRTOS 2 cœurs, tests sur la boîte
- [ ] **Sifflement audio = canal GAUCHE du module TDA2822** (diagnostic 2026-10-26, ce ne sont PAS les LEDs) : filtre RC 10 Ω + 1000 µF sur son VCC commandé ; plans B (Zobel, contourner le TDA, MAX98357A) → `docs/analyses/20261025_interferences_leds_audio.md` §5
- [x] Condos de découplage 100µF en sortie TDA2822 : présents sur le module (vérifié visuellement 2026-10-24)

---

## Instructions pour Claude

- Toujours coder en C/C++ Arduino pour l'ESP32, framework PlatformIO
- Ne pas inventer d'attribution de pins — attendre `config.h` ou demander
- Prioriser la fiabilité temps-réel (pas de `delay()` dans les tâches FreeRTOS)
- Mettre à jour ce fichier + `docs/LIF2D_CONTEXT_CLAUDECODE.md` quand l'architecture évolue
- Mettre à jour la mémoire projet (auto-memory) à chaque jalon important
- Travailler en français avec Felix

### Analyses, comptes-rendus et rapports

Quand Felix demande une analyse, un compte-rendu, un bilan, une comparaison ou tout document de réflexion :
- **Toujours écrire le résultat dans un fichier `.md`** dans le dossier `docs/analyses/`
- Nommer le fichier avec la date et un slug court : `YYYYMMDD_sujet.md`
- Annoncer dans le CLI le chemin du fichier créé, pas le contenu complet
- Ne jamais sortir un long document directement dans le terminal

### Notes pédagogiques — à tenir à jour

**À chaque fois qu'un concept est expliqué en conversation**, le noter dans `docs/pedago/` :
- Nommer le fichier `YYYYMMDD_sujet.md`
- Couvrir : définition, analogie, exemple concret sur LIF2D, pièges à éviter
- Un fichier par domaine (pas un fichier par question)
- Mettre à jour un fichier existant si le sujet est déjà couvert

Fichiers pédago existants :
- `docs/pedago/20260612_electronique_alimentation.md` — V/A/W, buck, LDO, OCP/OVP/SCP, LRS-75-5
- `docs/pedago/20260612_esp32_gpio_reference.md` — strapping pins, input-only, ADC1 vs ADC2, UART, GND commun
- `docs/pedago/20260612_audio_midi_circuit.md` — PAM8403 (3W réels), protection HP, UART/MIDI, DIN-5, TRS, chasse au bruit audio par élimination
- `docs/pedago/20260915_condensateurs_debounce_dc_blocking.md` — anti-rebond, série vs parallèle (bug encodeurs), découplage 100 nF + électrolytique, filtre RC d'alim, ESR
- `docs/pedago/20261026_firmware_environnements_platformio.md` — firmware, environnements `[env:…]`, versions figées
- `docs/pedago/20260612_electronique_alimentation.md` — + section USB / VIN / secteur (qui alimente quoi)

### Pédagogie — priorité absolue

**Ce projet est avant tout un projet d'apprentissage.** Felix est un maker qui apprend en fabriquant des objets cool et beaux. Il a peu d'expérience en embarqué C/C++.

- **Toujours inclure des commentaires `// 🎓` dans le code** pour expliquer les concepts clés (ADC, DAC, FreeRTOS, interruptions, bitwise ops…)
- Expliquer le "pourquoi" avant le "comment" dans les réponses
- Ne pas supposer qu'il connaît les acronymes embarqués — les définir au moins une fois
- Valoriser la beauté et l'élégance du résultat final, pas juste la fonctionnalité
- Si plusieurs approches existent, expliquer brièvement les compromis pour que Felix comprenne le choix
