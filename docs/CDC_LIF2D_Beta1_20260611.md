# Cahier des Charges — LIF2D Beta 1

**Date** : 2026-06-11
**Auteur** : Felix
**Version** : 1.0
**Statut** : ✅ Validé

---

## 1. Concept & Vision

### C'est quoi ?
LIF2D est la Beta 1 du projet LIF3D : un afficheur visuel 16×16 LEDs combiné à un séquenceur musical génératif, tous deux pilotés par le Jeu de la Vie de Conway. La grille GoL génère la musique (axe Y = note, balayage gauche→droite = temps) et l'image simultanément, dans un boîtier steampunk en bois noyer et laiton.

### Pourquoi ce projet ?
Valider le moteur GoL 2D en C sur ESP32, le pipeline GoL→LED, le séquenceur audio Mozzi, et l'UI physique (10 contrôleurs) avant de passer à la version 3D rotative à 1800 RPM. C'est aussi un apprentissage complet de l'embarqué : FreeRTOS, FastLED, Mozzi, ADC, interruptions.

### C'est réussi quand…
- La grille GoL tourne en temps réel sur la matrice 16×16 sans glitch
- Chaque cellule vivante joue une note selon sa position Y et la gamme sélectionnée
- Les 10 contrôleurs physiques répondent (BPM, gamme, volume, luminosité, dessin manuel)
- Le tout tient dans le boîtier steampunk fini, branché sur secteur

---

## 2. Objectifs d'Apprentissage

Ce projet me permettra de maîtriser :
- **FreeRTOS** : tâches multi-cœurs, priorités, synchronisation (Core 0 temps réel / Core 1 audio)
- **FastLED** : adressage WS2812B, gestion de puissance, animation sans `delay()`
- **Mozzi** : synthèse audio embarquée, séquenceur piloté par données externes
- **ADC ESP32** : lecture potentiomètres, éviter ADC2 quand Mozzi tourne
- **Interruptions** : encodeurs EC11 sans rebond, debounce logiciel
- **C embarqué** : bitfield, tableau circulaire, optimisation mémoire sur 520KB RAM
- **Alimentation** : bilan de puissance, protection logicielle `setMaxPowerInVoltsAndMilliamps`
- **MIDI** : protocole MIDI (messages Note On/Off, CC), UART à 31250 bauds, circuit électronique de sortie

Niveau de départ : intermédiaire Arduino, débutant en FreeRTOS et Mozzi.

---

## 3. Fonctions du Projet

### Ce que ça DOIT faire (Beta 1 complète)
1. **Moteur GoL** : calculer la génération suivante à chaque tick BPM, règles configurables (B6/S567 par défaut), bords toroïdaux
2. **Affichage LED** : rendre l'état GoL sur la matrice WS2812B 16×16, couleur selon l'âge de chaque cellule (plus une cellule est vieille, plus sa couleur évolue)
3. **Âge des cellules** : chaque cellule accumule un âge (`uint8_t[16][16]`), influence la couleur LED et les harmoniques Mozzi (fondamentale gen1, harmonique 1 gen2…)
4. **Séquenceur audio** : balayer colonne par colonne, jouer la note correspondante à chaque cellule vivante (axe Y = gamme), synthèse Mozzi
5. **Arpégiateur** : mode activable via encodeur, génère une séquence arpeggée depuis les cellules vivantes de la colonne courante
6. **MIDI OUT** : envoyer les notes jouées vers un DAW ou synthé externe via jack TRS 3.5mm Type A (GPIO4 / UART2_TX remappé, 31250 bauds, 2× 220Ω)
7. **Contrôleurs physiques** : 3 encodeurs (VOL/LUMI, X navigation, Y navigation) + 1 switch latching + 1 bouton silicone play/pause + bouton BOOT reset/seed
8. **Mode Dessin** : placer/effacer cellules manuellement via encodeurs X/Y
9. **Mode Formes** : sélectionner une forme prédéfinie (glider, blinker…) via long press Reset
10. **Symétrie aléatoire** : randomize avec options axiale, co-axiale et centrale
11. **Mode boucle de générations** : sélectionner et boucler N générations (2, 4, 8 itérations), avec crescendo optionnel
12. **Save/load patterns** : sauvegarder et charger des grilles en flash ESP32 (LittleFS, pas de SD card)

### Hors périmètre Beta 1 — vraiment pas maintenant
- **Rotation 3D POV** — c'est LIF3D, une autre machine entière
- **WiFi / OTA** — pas nécessaire pour valider le concept 2D
- **MIDI IN** — peut s'ajouter indépendamment (nécessite optocoupleur 6N138)

---

## 4. Architecture Technique

### Schéma physique de câblage

> Légende : `── fil ──`, tension sur le fil entre parenthèses, connecteur physique entre crochets `[pin X]`

```
╔══════════════════════════════════════════╗
║  PRISE SECTEUR 230V AC                   ║
║  ⚠ HAUTE TENSION — ne jamais toucher     ║
║  quand branché                           ║
╚══════════════════════════════════════════╝
       │ câble secteur IEC ou fils L/N/PE
       ▼
╔══════════════════════════════════════════╗
║  Mean Well LRS-75-5                      ║
║  Entrée : bornes L (phase) + N (neutre)  ║
║  Sortie : borne +V = 5V DC / borne -V = GND ║
║  Protections intégrées : OCP 14A, OVP,  ║
║  SCP (court-circuit)                     ║
╚══════════════════════════════════════════╝
       │                │
    [borne +V]       [borne -V]
    fil rouge 22AWG  fil noir 22AWG
    (5V DC)          (GND)
       │                │
       └────────────────┴──── RAIL 5V / GND (commun à tout le projet)
                │
    ┌───────────┼───────────────────────────────────────┐
    │           │                                       │
    ▼           ▼                                       ▼
────────    ─────────────────────────────          ──────────────
ESP32-D     WS2812B 16×16                          PAM8403
────────    ─────────────────────────────          ──────────────


══════════════════════════════════════
 BLOC 1 — ESP32-D dev board
══════════════════════════════════════

[borne +V LRS] ── fil rouge (5V) ──→ [broche VIN de la carte ESP32]
[borne -V LRS] ── fil noir  (GND) ─→ [broche GND de la carte ESP32]

  ↳ La carte contient un LDO (régulateur interne) qui fait 5V → 3.3V
    automatiquement pour le chip ESP32. Tu ne fais rien pour ça.
  ↳ Pendant les tests : câble USB-C PC → carte suffit, pas besoin du LRS.


══════════════════════════════════════
 BLOC 2 — Matrice WS2812B 16×16
══════════════════════════════════════

[borne +V LRS] ── fil rouge (5V) ──→ [fil VCC rouge de la matrice]
[borne -V LRS] ── fil noir  (GND) ─→ [fil GND blanc/noir de la matrice]
[GPIO5 ESP32]  ── [résistance 300Ω] ── fil vert/jaune (3.3V signal) ──→ [fil DIN de la matrice]

  ↳ La résistance 300Ω est soudée en série sur le fil de données.
    Elle protège contre les réflexions de signal (câble court = ok sans,
    mais bonne pratique de l'inclure).
  ↳ GND de la matrice DOIT être le même GND que l'ESP32 (même borne -V).


══════════════════════════════════════
 BLOC 3 — Audio : ESP32 → Jack TRS commuté → PAM8403 → HP
══════════════════════════════════════

  — Alimentation de l'ampli —
[borne +V LRS] ── fil rouge (5V)  ──→ [broche VCC du PAM8403]
[borne -V LRS] ── fil noir  (GND) ──→ [broche GND du PAM8403]

  — Signal audio + sortie ligne — via jack TRS commuté 5 broches (type PJ-302M) —

  Le jack TRS audio est un modèle à contacts commutés (5 broches : T, TS, R, RS, S).
  Il gère à la fois la sortie ligne ET l'auto-mute des HP — 100% mécanique, sans GPIO ni code.

  Broches du jack :
    T  = Tip  (audio gauche sortie câble)   TS = Tip Switch  (contact NC → PAM8403 L IN)
    R  = Ring (audio droit  sortie câble)   RS = Ring Switch (contact NC → PAM8403 R IN)
    S  = Sleeve (GND)

[GPIO25 ESP32] ──→ [T ] ──→ [câble Tip  = gauche vers DAW]
               ╔══ [TS] ──→ [PAM8403 entrée L IN]    ← NC : fermé sans câble, ouvert avec câble
[GPIO26 ESP32] ──→ [R ] ──→ [câble Ring = droit  vers DAW]
               ╔══ [RS] ──→ [PAM8403 entrée R IN]    ← NC : fermé sans câble, ouvert avec câble
[GND ESP32]    ──→ [S ] ──→ [câble Sleeve GND + PAM8403 GND signal]

  ↳ SANS câble branché dans le jack :
      TS fermé sur T, RS fermé sur R (contact NC interne au jack)
      → GPIO25/26 atteignent le PAM8403 → HP jouent normalement
  ↳ AVEC câble branché :
      TS et RS s'ouvrent mécaniquement → PAM8403 ne reçoit plus rien → HP muets
      → Le câble reçoit GPIO25/26 sur Tip/Ring → sortie ligne vers DAW / carte son
  ↳ Zéro GPIO supplémentaire, zéro code — mécanique pur dans le jack.
  ↳ GPIO25 = DAC1 (son gauche), GPIO26 = DAC2 (son droit) — niveau ligne 0–3.3V.

  — Sortie vers les haut-parleurs (AVEC résistances de protection) —

  [trou L+ PAM8403] ── fil (signal audio L+) ──→ [résistance 1Ω / 1W] ──→ [borne + HP gauche]
  [trou L- PAM8403] ────────────────────────────────────────────────────→ [borne - HP gauche]

  [trou R+ PAM8403] ── fil (signal audio R+) ──→ [résistance 1Ω / 1W] ──→ [borne + HP droit]
  [trou R- PAM8403] ────────────────────────────────────────────────────→ [borne - HP droit]

  ↳ Les résistances 1Ω/1W limitent la puissance max reçue par chaque HP :
    sans résistance = 3W max (limite des HP), avec = 2.4W max → marge de sécurité.
  ↳ La résistance se met sur le fil + uniquement (pas besoin sur le −).


══════════════════════════════════════
 BLOC 4 — MIDI OUT (jack TRS 3.5mm Type A)
══════════════════════════════════════

  Qu'est-ce que UART2_TX ?
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ UART = protocole de communication série (envoie des bits un par un)    │
  │ UART2 = le 2e port série de l'ESP32 (le 1er sert au câble USB)        │
  │ TX = Transmit = la broche qui ENVOIE les données                      │
  │ GPIO4 = broche utilisée pour UART2_TX (remappé depuis le défaut GPIO17)│
  │                                                                        │
  │ MIDI utilise exactement ce protocole à 31250 bits/seconde.            │
  │ Quand Mozzi joue une note, il envoie un message "Note On" sur GPIO4   │
  │ sous forme d'impulsions électriques → jack TRS 3.5mm → câble MIDI     │
  │ → synthé ou DAW externe.                                               │
  └─────────────────────────────────────────────────────────────────────────┘

  Circuit MIDI OUT (jack TRS 3.5mm Type A — standard MIDI Association) :

  [3V3 ESP32]      ── [résistance 220Ω] ──→ [Ring  (anneau) — source courant]
  [GPIO4 UART2_TX] ── [résistance 220Ω] ──→ [Tip   (pointe) — signal TX]
  [GND ESP32]      ───────────────────────→ [Sleeve (manchon) — GND]

  ↳ Pourquoi deux résistances 220Ω ?
    Le MIDI fonctionne par boucle de courant (5mA). Les 220Ω limitent ce courant
    et protègent l'ESP32 si un câble est mal branché. C'est la norme MIDI officielle.
  ↳ Type A = standard MIDI Association (Korg, Arturia, Make Noise, Moog...).
    Ring = source de courant (+3.3V), Tip = signal TX piloté par GPIO4.
  ↳ Remappage UART2 dans le firmware :
    Serial2.begin(31250, SERIAL_8N1, -1, 4);  // RX=-1 (non utilisé), TX=GPIO4


══════════════════════════════════════
 BLOC 5 — Contrôleurs physiques
══════════════════════════════════════

5 contrôleurs au total. Tous alimentés en 3.3V depuis la broche 3V3 de la carte ESP32.
BPM, gamme, timbre, octave et règles GoL sont réglés via le menu affiché sur la matrice
et navigué avec les encodeurs X/Y.

  [3V3 ESP32] ── fil fin rouge (3.3V) ──┬──→ [broche + encodeur VOL/LUMI]
                                         ├──→ [broche + encodeur X (droite)]
                                         └──→ [broche + encodeur Y (gauche)]

  [GND ESP32] ── fil fin noir (GND) ────┬──→ [broche GND de chaque encodeur]
                                         ├──→ [broche GND switch latching]
                                         └──→ [broche GND bouton play/pause]

  Encodeur VOL/LUMI (3 fils signal + bouton) :
  [GPIO16] ──→ [ROTA]  + [100nF entre ROTA et GND]
  [GPIO17] ──→ [ROTB]
  [GPIO18] ──→ [SWCH]  tourner = volume, clic = bascule vers luminosité

  Encodeur X — contrôleur droit (3 fils signal + bouton) :
  [GPIO22] ──→ [ROTA]  + [100nF entre ROTA et GND]
  [GPIO23] ──→ [ROTB]
  [GPIO21] ──→ [SWCH]  navigation horizontale / confirmation menu

  Encodeur Y — contrôleur gauche (3 fils signal + bouton) :
  [GPIO32] ──→ [ROTA]  + [100nF entre ROTA et GND]
  [GPIO33] ──→ [ROTB]
  [GPIO19] ──→ [SWCH]  navigation verticale / ouvre menu / bascule mode dessin

  Switch latching (on/off physique) :
  [GPIO13] ──→ [signal switch]  état persistant — rôle défini en firmware

  Bouton play/pause (momentané silicone/caoutchouc) :
  [GPIO14] ──→ [signal bouton]  toggle play ↔ pause à chaque appui

  Bouton reset/seed (= bouton BOOT physique de la carte — aucun câblage supplémentaire) :
  [GPIO0]  ──→ [déjà sur la carte]  court = nouvelle graine, long = menu formes
```

### Architecture firmware (intérieur de l'ESP32-D)

> Ce n'est pas du câblage — c'est comment le code est organisé.
> L'ESP32-D a deux cœurs CPU indépendants qu'on utilise comme deux "threads" matériels.

```
ESP32-D
├── Core 0 (temps réel)
│     ├── Tâche GoL      → calcule la génération suivante
│     ├── Tâche LED      → envoie l'état GoL à la matrice via FastLED
│     └── Tâche Controls → lit les switchs et encodeurs
│
└── Core 1 (audio)
      └── Tâche Mozzi    → synthèse sonore, séquenceur, MIDI OUT
```

*Pourquoi deux cœurs séparés ? Mozzi a besoin d'une interruption audio toutes les ~20µs pour générer le son. Si FastLED et GoL tournaient sur le même cœur, ils bloqueraient cette interruption et le son serait crachotant. Séparer les cœurs = son propre garanti.*

### Stack Logicielle / Firmware
- **Langage** : C++ Arduino
- **Framework** : PlatformIO (VSCode)
- **MCU** : ESP32-D (ESP32-WROOM-32, dual-core 240MHz, 520KB RAM)
- **Bibliothèques clés** :

  | Lib | Version | Rôle |
  |-----|---------|------|
  | FastLED | ^3.6.0 | Pilotage WS2812B, gestion puissance |
  | Mozzi | ^2.0.0 | Synthèse audio, séquenceur |
  | ESP-IDF (via Arduino) | — | FreeRTOS, ADC, DAC, interruptions |

### Structure fichiers
```
src/
├── main.cpp          ← init + assemblage tâches FreeRTOS
├── gol.h / gol.cpp   ← moteur GoL 2D (règles configurables, bords toroïdaux)
├── leds.h / leds.cpp ← rendu WS2812B via FastLED
├── audio.h / audio.cpp ← séquenceur Mozzi, mapping GoL→notes
└── controls.h / controls.cpp ← encodeurs (interruptions), switch, boutons
include/
└── config.h          ← toutes les constantes + attribution GPIO
```

---

## 5. Matériel

### Ce que j'ai déjà
| Composant | Modèle | Qté | Notes |
|-----------|--------|-----|-------|
| MCU | ESP32-D (WROOM-32, lab école) | 1 | DAC GPIO 25/26 ✅ — peut être remplacé par un acheté si besoin |
| Matrice LED | WS2812B 16×16 flexible 256 LEDs | 1 | ✅ Reçu — 16cm×16cm |
| Ampli audio | PAM8403 HW-894 BT 5.0 | 1 | ✅ Reçu — 5W+5W @ 4Ω, LINE IN 3.3V |
| Haut-parleurs | 28mm 4Ω 3W | 2 | ✅ Reçu — confirmé 4Ω |
| Alim actuelle | BF-1220 12V/2A | 1 | ⚠️ Remplacée par LRS-75-5 — garder pour LIF3D |
| Buck converter | LM2596S ajustable (lab) | 1 | ⚠️ Mis de côté — plus nécessaire avec LRS-75-5 |
| Hall sensors | US5881 ×10 | 10 | Réservés LIF3D 3D |
| Aimants | NdFeB N35 5×2mm | 10 | Réservés LIF3D 3D |
| Ampli I²S | MAX98357A | 1 | Réservé LIF3D 3D |

### Ce qu'il faut commander
| Composant | Modèle / Spec | Qté | Priorité | Où commander | Prix ~€ |
|-----------|--------------|-----|----------|--------------|---------|
| **Alim Mean Well** | LRS-75-5 (5V/14A/70W) | 1 | 🔴 CRITIQUE | Amazon / Mouser / RS Components | ~18€ |
| Potentiomètres rotatifs | 10kΩ type B linéaire | 4 | 🔴 CRITIQUE | AliExpress / LCSC | ~3€ |
| Gros encodeurs rotatifs | Type valve/molette (shaft D 6mm) | 3 | 🔴 CRITIQUE | AliExpress | ~6€ |
| Encodeurs EC11 crantés | EC11 avec bouton | 2 | 🔴 CRITIQUE | AliExpress / LCSC | ~2€ |
| Boutons poussoir | 12mm momentary | 2 | 🔴 CRITIQUE | AliExpress | ~1€ |
| Potentiomètres linéaires | 10kΩ slide | 2 | 🟡 UTILE | AliExpress | ~2€ |
| Jack TRS 3.5mm simple | 3 broches panel mount (MIDI OUT) | 1 | 🔴 CRITIQUE | AliExpress / LCSC | ~1€ |
| Jack TRS 3.5mm commuté | 5 broches NC panel mount — type PJ-302M (Audio OUT + auto-mute HP) | 1 | 🔴 CRITIQUE | AliExpress / LCSC | ~1€ |
| Résistance | 300Ω 1/4W | 5 | 🟡 UTILE | LCSC / stock perso | <1€ |
| Condensateurs | 100nF céramique | 20 | 🟡 UTILE | LCSC / stock perso | <1€ |
| Connecteur / bornier | Bornier 5.08mm 2 broches | 2 | 🟡 UTILE | LCSC | <1€ |
| Fil souple silicone | 22AWG rouge + noir + autres | 1 lot | 🟡 UTILE | AliExpress | ~3€ |

**Budget matériel estimé** : ~38€ (hors matériel déjà en stock) — inchangé (DIN-5 retiré, 2e TRS ajouté)

---

## 6. Bilan de Puissance

Tout fonctionne en **5V direct** depuis le LRS-75-5 — aucun buck intermédiaire.

| Composant | Qté | Vcc | I typ (mA) | I max (mA) | Total max (mA) |
|-----------|-----|-----|------------|------------|----------------|
| ESP32-D (FreeRTOS, WiFi off) | 1 | 5V→3.3V | 150 | 280 | 280 |
| WS2812B — GoL actif (4.4% LEDs), brightness 100 | 256 | 5V | 570 | 1 200 | 1 200 |
| WS2812B — toutes LEDs brightness 255 (bug/démo) | 256 | 5V | — | 15 360 | 15 360 |
| PAM8403 — volume typique ~30% | 1 | 5V | 300 | 2 000 | 2 000 |
| Encodeurs + potars + boutons | ~15 | 3.3V | 20 | 30 | 30 |
| **TOTAL usage typique GoL** | | | | | **~1 050 mA** |
| **TOTAL pire cas absolu** | | | | | **~17 670 mA** |

**Calculs :**
- Usage typique GoL : 1 050 mA × 5V / 1000 = **5.25 W** — LRS-75-5 à 7.5% charge ✅
- Pire cas absolu (toutes LEDs blanc 255) : 17 670 mA × 5V = **88.4 W** → dépasse LRS-75-5 (70W)
- **Mais** : protection logicielle FastLED coupe avant d'atteindre ce cas

**Alimentation retenue : Mean Well LRS-75-5 (5V / 14A / 70W)**
- Élimine le LM2596S et la BF-1220 12V
- Alimentation professionnelle industrielle, protection OCP/OVP/SCP intégrée
- OCP (Over Current Protection) intégrée : trip automatique si >14A

**Protection logicielle obligatoire dans `config.h` :**
```cpp
// À appeler dans setup() AVANT le premier show()
// Laisse 4A pour ESP32 + audio, plafonne les LEDs à 10A
FastLED.setMaxPowerInVoltsAndMilliamps(5, 10000);
```

> 💡 **Pourquoi cette double protection ?** La LRS-75-5 coupe à 14A (hardware), et FastLED bride à 10A (software). Un bug qui allumerait toutes les LEDs à 100% est silencieusement bridé à brightness ~167 par FastLED avant d'atteindre l'alimentation. Le système ne plante jamais à cause des LEDs.

---

## 7. Compatibilité Matérielle — Bilan

| Check | Statut | Détail |
|-------|--------|--------|
| Tensions logiques GPIO → WS2812B | 🟡 ATTENTION | ESP32 GPIO = 3.3V, WS2812B DATA requiert ≥ 3.5V (70% de 5V). En pratique fonctionne avec FastLED. Mitigation : résistance 300Ω en série sur DATA + câble < 20cm |
| Pins GPIO disponibles | 🟢 OK | 15 pins nécessaires / ~25 disponibles sur ESP32-D. Confortable. |
| Mozzi + FastLED — conflit interruptions | 🟡 ATTENTION | Obligatoire : Mozzi sur Core 1, GoL/LED/Controls sur Core 0 via FreeRTOS. Ne jamais appeler `FastLED.show()` depuis Core 1. |
| FastLED + I2S WiFi | 🟡 ATTENTION | Ajouter `#define FASTLED_ESP32_I2S true` dans config.h avant `#include <FastLED.h>`. Évite les conflits avec le périphérique I2S interne. |
| GPIO strapping (pin boot) | 🟡 ATTENTION | Ne pas utiliser GPIO 0, 2, 15 pour le DATA WS2812B — ces pins ont un état défini au boot qui pourrait envoyer des données parasites à la matrice. |
| DAC ESP32-D → Jack TRS commuté → PAM8403 | 🟢 OK | GPIO25/26 → jack PJ-302M 5 broches → PAM8403 L/R IN. Auto-mute HP quand câble branché (contacts NC mécaniques). Optionnel : condo 100µF si bruit DC. |
| MIDI OUT — TRS 3.5mm Type A | 🟢 OK | GPIO4 (UART2_TX remappé) + 2× 220Ω + jack TRS. Pas d'optocoupleur. Ring=+3.3V, Tip=signal TX. |
| Alimentation LRS-75-5 → 5V direct | 🟢 OK | Tout le projet tourne à 5V. Aucun buck intermédiaire. Simplifie le câblage. |
| Encodeurs EC11 — rebond | 🟡 ATTENTION | Debounce obligatoire : logiciel (filtre 5ms) ET hardware (100nF entre ROTA et GND). Sans ça, comptage erratique des ticks. |

### Problèmes identifiés
- 🟡 **ATTENTION** : Signal DATA WS2812B à 3.3V (< 3.5V requis) → **Workaround** : résistance 300Ω série sur DATA, câble court. Fonctionne en pratique avec FastLED sur ESP32.
- 🟢 **OK** : Plus de potentiomètres ADC — les GPIO 34–39 sont libres pour usage futur.

Aucun point 🔴 BLOQUANT — le projet peut démarrer dès réception du LRS-75-5 et des contrôleurs.

---

## 8. Roadmap Solo

### Phase 0 — Setup & Commandes
- [x] Commander LRS-75-5 + contrôleurs physiques (~37€)
- [ ] Régler et tester le LRS-75-5 (multimètre : vérifier 5.0V en sortie)
- [x] Vérifier que l'ESP32-D est flashable via USB (blink LED)
- [ ] Compléter `config.h` — attribution de tous les GPIO

### Phase 1 — Proof of Concept (PoC)
*Objectif : valider les deux blocs critiques indépendamment*
- [ ] **PoC LED** : GoL statique → allumer les cellules vivantes sur la matrice, vérifier la puissance avec le multimètre (< 2A attendu)
- [ ] **PoC Audio** : jouer une gamme simple via Mozzi + DAC GPIO25/26 → PAM8403 → HP
- [ ] Vérifier qu'il n'y a pas de glitch sonore quand FastLED fait un `show()` (test FreeRTOS 2 cœurs)

### Phase 2 — Intégration GoL + LED + Audio (cœur)
*Objectif : la boucle centrale fonctionne*
- [ ] Moteur GoL complet (`uint8_t[16][16]` pour l'âge, règles B6/S567, bords toroïdaux)
- [ ] Pipeline GoL → FastLED → matrice, couleur selon l'âge de la cellule
- [ ] Séquenceur Mozzi : balayage colonne, mapping cellule → note (gamme Japonaise prioritaire)
- [ ] BPM configurable (timer FreeRTOS)
- [ ] MIDI OUT : mêmes notes via GPIO4 (UART2_TX remappé) → TRS 3.5mm Type A (tester dans DAW)

### Phase 3 — Contrôleurs & UI
*Objectif : l'objet est interactif*
- [ ] Lecture 3 encodeurs EC11 avec interruptions + debounce (100nF + 5ms logiciel)
- [ ] Switch latching + bouton play/pause + bouton BOOT reset
- [ ] Encodeur VOL/LUMI : volume (tourner) + luminosité (clic + tourner)
- [ ] Encodeurs X/Y : navigation menu + mode Dessin
- [ ] Mode Dessin (encodeurs X/Y déplacent le curseur sur la grille)
- [ ] Mode Formes (long press Reset)
- [ ] Tous les paramètres ajustables via menu (BPM, gamme, volume, luminosité, règles, timbre, octave)

### Phase 4 — Features avancées
*Objectif : l'instrument est expressif*
- [ ] **Arpégiateur** : mode activable, séquence depuis les cellules de la colonne courante
- [ ] **Symétrie aléatoire** : randomize avec options axiale / co-axiale / centrale
- [ ] **Mode boucle** : sélectionner et looper N générations (2/4/8), avec option crescendo
- [ ] **Save/load patterns** : sauvegarder grille courante en LittleFS flash, rappeler via bouton
- [ ] **Harmoniques âge** : fondamentale gen1, 1ère harmonique gen2, 2e gen3…

### Phase 5 — Boîtier & Finition
*Objectif : l'objet existe physiquement et tient debout*
- [ ] Design boîtier steampunk (trapèze, bois noyer, laiton) — plan sur papier ou CAO
- [ ] Intégration matrice LED face dessus + HP faces latérales inclinées
- [ ] Découpe façade avant (encodeurs, boutons, pots linéaires)
- [ ] Face arrière : 2× jack TRS 3.5mm (MIDI OUT + Audio OUT) + alimentation IEC/DC
- [ ] Câblage final propre (pas de breadboard)
- [ ] Démo : 10 minutes de GoL + musique + MIDI vers DAW sans crash → Beta 1 validée ✅

---

## 9. Risques et Mitigation

| Risque | Proba | Impact | Mitigation |
|--------|-------|--------|------------|
| FastLED `show()` interfère avec Mozzi (glitch audio) | 🟡 Moyenne | Fort | FreeRTOS Core 0/1 séparés stricts. Si persistant : mutex ou double buffer |
| Rebond encodeurs → ticks parasites | 🔴 Élevée | Moyen | 100nF sur ROTA + debounce logiciel 5ms. Tester avant de souder. |
| GoL converge vers état stable (plus rien ne change) | 🟡 Moyenne | Moyen | Détection auto : si 0 cellules vivantes ou pattern répété → inject nouvelle graine |
| Signal DATA WS2812B instable (3.3V < 3.5V requis) | 🟢 Faible | Moyen | Résistance 300Ω série + câble court. Testé sur beaucoup de projets ESP32, fonctionne. |
| Manque de pins GPIO (23 sur ~25) | 🟡 Moyenne | Fort | Attribution soigneuse dans config.h. Si bloqué : multiplexeur ou shift register pour boutons |
| ADC2 utilisé par erreur avec Mozzi actif | 🟡 Moyenne | Fort | Commentaire explicite dans config.h : "UTILISER UNIQUEMENT ADC1 (GPIO 32–39)" |

---

## 10. Points Ouverts

*À résoudre avant / pendant le développement :*
- [x] **GPIO DATA WS2812B** : ✅ Résolu — GPIO5 (D5) avec résistance 300Ω. GPIO4 (D4) réservé MIDI OUT.
- [ ] **Gros encodeurs "valve"** : quel modèle exact à commander ? Vérifier shaft D 6mm, pas de 360° libre (cranté obligatoire pour le confort).
- [ ] **Boîtier** : dimensions finales ? La matrice fait 16×16cm — prévoir ~25×25cm de surface pour les contrôleurs autour.
- [ ] **Gamme par défaut au boot** : Japonaise/Hirajoshi (validée Python) ou Conway classique ?
- [ ] **Couleur des cellules** : fixe (ex: blanc chaud) ou variable selon âge / règle / gamme ? À définir avant leds.cpp.

---

## Idées post-Beta 1

- **MIDI IN** : recevoir notes/CC depuis un contrôleur externe (nécessite optocoupleur 6N138)
- **BLE MIDI** : envoyer MIDI via Bluetooth directement vers iOS/macOS (ESP32-D a le BT)
- **WiFi / OTA** : mise à jour firmware sans USB, dashboard web de monitoring
- **LIF3D** : toute la version 3D rotative POV — c'est le projet suivant

---

*Document généré par /project-spec — vivant, pas un contrat. Mettre à jour à chaque jalon.*
*Prochaine révision suggérée : après la Phase 1 PoC (premier allumage LEDs + premier son).*
