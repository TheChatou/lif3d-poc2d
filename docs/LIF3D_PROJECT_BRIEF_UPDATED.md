# LIF3D — Brief Complet & Plan Organisationnel
**Version :** 2.0 — Mise à jour post-réception composants  
**Date :** 2025  
**Licence :** CERN OHL (hardware) + MIT (firmware/software)  
**Auteur :** Felix  

---

## RÉSUMÉ EXÉCUTIF

LIF3D est un afficheur volumétrique 3D à persistance rétinienne (POV) couplé à un séquenceur musical génératif piloté par le Jeu de la Vie de Conway en 3D. Le dispositif fonctionne comme une boîte à musique autonome et un instrument de performance MIDI.

**Architecture en deux phases :**
- **LIF2D (Beta 1) :** prototype 2D plat à matrice WS2812B 16×16 — phase active actuelle
- **LIF3D (cible) :** afficheur volumétrique rotatif 32×32×32, séquenceur GoL 3D complet

**Cible commerciale :** kit DIY + unités assemblées à 300–380 €  
**Licences :** CERN OHL + MIT  

---

## PARTIE 0 — ÉTAT ACTUEL & COMPOSANTS REÇUS

### 0.1 Ce qui est arrivé (stock physique disponible)

| Composant | Référence | Qté | Usage dans le projet |
|---|---|---:|---|
| Hall Effect Sensor | US5881 | 10 | Synchronisation rotor (LIF3D), test POC (LIF2D) |
| Matrice LED WS2812B flexible | 16×16 / 256 LED RGB / 5V | 1 | **Cœur de LIF2D** — afficheur principal |
| Aimants permanents NdFeB N35 | 5mm×2mm | 10 | Trigger Hall sensor (POC + LIF3D) |
| Mini haut-parleurs | 28mm, 4Ω ou 8Ω, 3W/2W | 2 | Audio LIF2D — stéréo sur faces latérales |
| Alimentation secteur | AC 100-240V → 12V 2A, BF-1220 | 1 | Alim principale LIF2D |
| Ampli audio | PAM8403 HW-894 BT 5.0, 5W+5W | 1 | Amplification stéréo LIF2D |

> ⚠️ **Note importante sur les HP :** les haut-parleurs reçus sont annoncés en 4Ω **ou** 8Ω — mesurer l'impédance à l'ohmmètre avant branchement. Le PAM8403 supporte les deux mais l'impédance influence la puissance délivrée et le courant tiré.

> ⚠️ **Note sur l'alimentation :** Le BF-1220 délivre **12V / 2A = 24W max**. La matrice WS2812B 16×16 peut consommer jusqu'à ~15W en full-blanc. Prévoir une gestion de la luminosité maximale dans le firmware pour ne pas saturer l'alim.

### 0.2 Ce qui reste à acquérir pour LIF2D

| Composant | Usage | Priorité |
|---|---|---|
| ESP32-S3 DevKit | MCU principal | 🔴 Critique |
| Potentiomètres rotatifs (×4) | Contrôles utilisateur | 🔴 Critique |
| Encodeurs rotatifs avec clic (×2) | Contrôles utilisateur | 🔴 Critique |
| Boutons poussoirs (×2) | Contrôles utilisateur | 🔴 Critique |
| Pots linéaires slotted (×2) | Contrôles utilisateur | 🟡 Important |
| Régulateur buck 5V/3A | Conversion 12V→5V | 🔴 Critique |
| Condensateurs 1000µF | Filtrage alim | 🟡 Important |
| Fils/câbles, visserie, connecteurs | Assemblage | 🟡 Important |

---

## PARTIE 1 — ARCHITECTURE GLOBALE DU PROJET

### 1.1 Vue d'ensemble deux phases

```
┌─────────────────────────────────────────────────────────┐
│                    PROJET LIF3D                         │
│                                                         │
│  ┌──────────────────┐      ┌──────────────────────┐    │
│  │     LIF2D        │ ──►  │       LIF3D           │   │
│  │  (Phase active)  │      │  (Cible finale)       │   │
│  │  WS2812B 16×16   │      │  Rotor POV 32³        │   │
│  │  Flat 2D proto   │      │  MBI5153 drivers      │   │
│  │  GoL 2D          │      │  GoL 3D (B6/S567)     │   │
│  │  Séquenceur      │      │  1800 RPM             │   │
│  │  steampunk box   │      │  3x ESP32-S3          │   │
│  └──────────────────┘      └──────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Architecture LIF2D (Phase active)

**Hardware :**
- Boîtier trapézoïdal steampunk plat, imprimé en PLA Metal via AMS Bambu
- Matrice WS2812B 16×16 flexible orientée vers le haut
- 2 haut-parleurs 28mm sur faces latérales inclinées (angle droit)
- 10 contrôles physiques : 4 potars rotatifs, 2 encodeurs avec clic, 2 boutons, 2 pots linéaires slotted
- Alimentation 12V / 2A secteur
- PAM8403 ampli stéréo

**Firmware (PlatformIO, projet `lif3d-poc2d`) :**
- FastLED pour la matrice
- Mozzi pour la synthèse audio
- GoL 2D avec règle B6/S567
- Séquenceur musical génératif
- Échelle Japonaise (penta sparse) privilégiée

### 1.3 Architecture LIF3D validée (Cible)

| Composant | Choix technique | Justification |
|---|---|---|
| MCU | 3× ESP32-S3 (rotor / GoL+moteur / audio) | Dual core 240MHz, I2S, SPI, WiFi/BLE |
| LED rotor | 1024 LED SMD 0603 monochromes | Pitch 2.2mm, faible masse |
| Drivers LED | MBI5153 (×2 par segment) | Multiplex 1:32, SRAM interne, >900Hz refresh |
| Radio | nRF24L01 @ 2Mbps | Sync inter-ESP sans fil |
| Alimentation rotor | WPT (Wireless Power Transfer) via bobines Litz custom | Zéro slip ring mécanique |
| Moteur | BLDC outrunner 2205-2306, KV 1400-1800 | 55dB vs 65dB inrunner |
| Hall sensor | US5881 (disponible ×10) | 1 impulsion/tour → sync slices |
| Aimants trigger | NdFeB N35 5×2mm (disponibles ×10) | Trigger Hall à quelques mm |
| Audio | MAX98357A I2S (réservé LIF3D) | 3.2W @ 4Ω, 92% rendement |
| GoL rule | B6/S567 @ ~4.4% densité | Musicalement optimal |

---

## PARTIE 2 — LIF2D : SPÉCIFICATIONS DÉTAILLÉES

### 2.1 Matrice LED

**WS2812B 16×16 flexible, 256 LED RGB, 5V, adressable individuellement**

- Protocole : single-wire 800kbps
- Courant max théorique : 256 LED × 60mA = 15.36A (full-blanc à fond)
- Courant réaliste avec limitation firmware : ~2-4A à luminosité modérée
- Bibliothèque firmware : **FastLED** (installée dans PlatformIO)
- ⚠️ Toujours limiter la luminosité globale (FastLED.setBrightness()) pour rester sous 2A

### 2.2 Chaîne audio

```
ESP32-S3 (I2S ou DAC interne)
      │
      ▼
  PAM8403 (HW-894, BT 5.0, 5W+5W stéréo)
      │               │
      ▼               ▼
  HP gauche       HP droite
  28mm 4/8Ω       28mm 4/8Ω
  (face lat. G)   (face lat. D)
```

**PAM8403 HW-894 specs :**
- Tension alim : 2.5V à 5.5V (alimenter en 5V depuis buck)
- Puissance : 5W+5W @ 4Ω ou 2.5W+2.5W @ 8Ω
- Bluetooth 5.0 intégré sur ce module (bonus — peut recevoir audio BT directement)
- Connexion depuis ESP32 : sortie PWM audio ou DAC → entrée LINE IN du PAM8403

> 💡 Le module PAM8403 HW-894 avec BT 5.0 peut fonctionner en autonome comme récepteur BT audio — pratique pour les tests avant firmware complet.

### 2.3 Alimentation LIF2D

```
Secteur 230V AC
      │
      ▼
BF-1220 (12V / 2A / 24W)
      │
      ├──► Buck converter → 5V / 3A → WS2812B matrix + PAM8403
      │
      └──► LDO 3.3V → ESP32-S3 (ou 5V directement si USB)
```

**Budget de courant (5V) :**

| Composant | Courant estimé |
|---|---:|
| WS2812B 16×16 (luminosité 50%) | ~1.5A |
| PAM8403 + HP (volume moyen) | ~0.5A |
| ESP32-S3 | ~0.3A |
| Contrôles (encodeurs, boutons) | ~0.05A |
| **Total estimé** | **~2.35A** |

→ Le BF-1220 @ 24W → ~4.8A @ 5V : **marge suffisante** avec limitation luminosité.

### 2.4 Contrôles physiques (10 éléments)

| Contrôle | Qté | GPIO recommandé | Fonction |
|---|---:|---|---|
| Potentiomètre rotatif | 4 | GPIO ADC (34-39 sur ESP32) | Tempo / tonalité / densité GoL / volume |
| Encodeur rotatif + clic | 2 | 2 GPIO + 1 GPIO interrupt | Navigation modes / sélection règle |
| Bouton poussoir | 2 | GPIO avec pull-up | Play/Stop / Reset GoL |
| Potentiomètre linéaire slotted | 2 | GPIO ADC | Morph paramètre / crossfade |

### 2.5 Pinout ESP32-S3 (à définir dans config.h)

```c
// config.h — LIF2D GPIO assignments (à valider selon DevKit)

// WS2812B Matrix
#define LED_PIN         GPIO_NUM_48   // Data out vers matrice

// Audio (vers PAM8403 ou DAC)
#define AUDIO_DAC_L     GPIO_NUM_17   // DAC1 (si DAC interne)
#define AUDIO_DAC_R     GPIO_NUM_18   // DAC2 (si DAC interne)
// OU sortie I2S si ampli I2S

// Contrôles analogiques (ADC)
#define POT1_PIN        GPIO_NUM_1    // Potentiomètre 1
#define POT2_PIN        GPIO_NUM_2    // Potentiomètre 2
#define POT3_PIN        GPIO_NUM_3    // Potentiomètre 3
#define POT4_PIN        GPIO_NUM_4    // Potentiomètre 4
#define SLIDER1_PIN     GPIO_NUM_5    // Pot linéaire 1
#define SLIDER2_PIN     GPIO_NUM_6    // Pot linéaire 2

// Encodeurs
#define ENC1_A          GPIO_NUM_10
#define ENC1_B          GPIO_NUM_11
#define ENC1_BTN        GPIO_NUM_12
#define ENC2_A          GPIO_NUM_13
#define ENC2_B          GPIO_NUM_14
#define ENC2_BTN        GPIO_NUM_15

// Boutons poussoirs
#define BTN1_PIN        GPIO_NUM_16
#define BTN2_PIN        GPIO_NUM_21

// Hall sensor (pour tests POC LIF3D)
#define HALL_PIN        GPIO_NUM_7
```

---

## PARTIE 3 — LIF3D : SPÉCIFICATIONS TECHNIQUES DÉTAILLÉES

### 3.1 Matrice LED et PCB rotor

- **Résolution :** 32×32×32 voxels
- **LED :** 1024 SMD 0603 blanches/vertes, ~100mcd @ 20mA, angle 120°
- **Drivers :** MBI5153 (×2) — 16 sorties, SRAM 16kbits, multiplex 1:32, refresh >900Hz
- **PCB :** 8 cartes double-face FR4 TG150 couvrant chacune 45° (4 colonnes), diamètre 150mm
- **Pitch vertical :** ~2.2mm sur 70mm de hauteur
- **Fabrication :** JLCPCB PCBA (LED + drivers en SMT automatisé)

### 3.2 Synchronisation et slicing

- **Vitesse cible :** 1800 RPM = 30 volumes/s
- **Slices par tour :** 32 → 1 slice toutes les 1.04ms
- **Hall sensor :** US5881 (disponible) + aimant N35 5×2mm (disponible) sur rotor
- **Pseudocode de synchronisation :**

```c
void IRAM_ATTR onHallPulse() {
    uint64_t now = esp_timer_get_time();
    T_rotation = now - lastPulse;
    lastPulse = now;
    sliceDuration_us = T_rotation / 32;
    currentSlice = 0;
    esp_timer_start_once(sliceTimer, sliceDuration_us);
}

void sendNextSlice() {
    if (currentSlice < 32) {
        loadSliceIntoMBI5153(currentSlice);
        currentSlice++;
        esp_timer_start_once(sliceTimer, sliceDuration_us);
    }
}
```

### 3.3 GoL 3D — Règle B6/S567

La règle **B6/S567** à **~4.4% de densité initiale** a été validée comme musicalement optimale :
- Patterns évolutifs non explosifs, non stagnants
- Densité stable sur la durée → séquenceur musical cohérent
- Échelle Japonaise (pentatonique sparse) particulièrement bien adaptée

**Mémoire GoL 32³ :** 32×32×32 bits = 4096 bytes = **4 ko** → RAM interne ESP32-S3 largement suffisante.

### 3.4 Mapping 3D → POV

```c
// Pré-calculé au démarrage, stocké en flash
// Pour chaque angle θ (0..31), chaque LED physique (r, z) :
// → trouver le voxel (x, y, z) dans la grille cartésienne

void precomputeVoxelTable() {
    for (int theta = 0; theta < 32; theta++) {
        float angle = theta * (2*PI / 32);
        for (int z = 0; z < 32; z++) {
            for (int r = 0; r < 32; r++) {
                int x = (int)(r * cos(angle) + 16);
                int y = (int)(r * sin(angle) + 16);
                voxelTable[theta][z][r] = &grid[x][y][z];
            }
        }
    }
}
```

### 3.5 Audio LIF3D

- **Ampli :** MAX98357A (I2S, classe D, 3.2W @ 4Ω, 92% rendement) — réservé LIF3D
- **HP :** 40mm 4Ω 5W
- **Crossover numérique :** 200Hz (filtrage DSP dans Mozzi)
- **Synthèse :** Mozzi — subtractive synthesis
- **Génération notes :** GoL cellule allumée = note déclenchée, échelle Japonaise

---

## PARTIE 4 — FIRMWARE

### 4.1 Stack technique

| Couche | Outil | Notes |
|---|---|---|
| IDE | VSCode + PlatformIO | Projet `lif3d-poc2d` existant |
| Langage | C/C++ (Arduino framework) | Sur ESP32-S3 |
| LED | FastLED | Déjà configuré |
| Audio | Mozzi | Déjà configuré |
| OS | FreeRTOS (inclus ESP-IDF) | Multi-tâches |
| Tests audio | Python / pygame / numpy | Prototypage avant ESP32 |

### 4.2 Architecture tâches FreeRTOS (LIF2D)

```
┌─────────────────────────────────────────────┐
│              ESP32-S3 (Dual Core)           │
│                                             │
│  Core 0                  Core 1             │
│  ┌──────────────┐        ┌───────────────┐  │
│  │  Task: GoL   │        │  Task: Audio  │  │
│  │  (calcul)    │        │  (Mozzi)      │  │
│  └──────┬───────┘        └───────────────┘  │
│         │                                   │
│  ┌──────▼───────┐        ┌───────────────┐  │
│  │  Task: LED   │        │  Task: Controls│ │
│  │  (FastLED)   │        │  (ADC, GPIO)  │  │
│  └──────────────┘        └───────────────┘  │
└─────────────────────────────────────────────┘
```

### 4.3 Pipeline données

```
Contrôles utilisateur
        │
        ▼
  Paramètres GoL (densité, règle, tempo)
        │
        ▼
  Calcul génération GoL (B6/S567)
        │
        ├──► Matrice LED (FastLED → WS2812B)
        │
        └──► Séquenceur musical → Mozzi → PAM8403 → HP ×2
```

### 4.4 Prochaines étapes firmware (ordre)

1. ✅ Projet PlatformIO créé (`lif3d-poc2d`)
2. ✅ Dépendances FastLED + Mozzi configurées
3. 🔲 **Créer `config.h`** avec GPIO pins et constantes
4. 🔲 `main.cpp` — init LED, test affichage statique matrice
5. 🔲 GoL 2D basique sur grille 16×16, affichage temps réel
6. 🔲 Intégration Mozzi — oscillateur simple, mapping GoL → note
7. 🔲 Échelle Japonaise — mapping index cellule → fréquence
8. 🔲 Lecture contrôles (ADC potars, encodeurs, boutons)
9. 🔲 Mapping contrôles → paramètres GoL + audio
10. 🔲 Test complet en boîtier

---

## PARTIE 5 — MÉCANIQUE & FABRICATION 3D

### 5.1 Boîtier LIF2D

**Forme :** trapézoïdale, esthétique steampunk  
**Ouverture du haut :** matrice WS2812B orientée vers le haut  
**Faces latérales inclinées :** HP 28mm avec grilles perforées  

### 5.2 Workflow fabrication 3D (3 tiers)

| Tier | Matériau | Outil | Usage |
|---|---|---|---|
| 1 | PLA Metal Bambu (AMS) — Copper Brown, Iridescent Gold, Iron Gray | Bambu Lab AMS | Corps principal + accents décoratifs |
| 2 | ColorFabb bronzeFill | Bambu Lab (nozzle 0.4mm acier trempé, hors AMS) | Pièces nobles poncées à la main |
| 3 | PCL | Stylo 3D (MYNT3D Pro ou 3Doodler PRO+) | Finitions ultra-fines, retouches |

**Outil de lissage thermique :** MODIFI3D Original ou SRA Ritocco

> ⚠️ **ColorFabb bronzeFill** : contient de vraies particules métalliques → nozzle 0.4mm acier trempé OBLIGATOIRE, NE PAS passer dans l'AMS.  
> ✅ **Bambu PLA Metal** : sans vraies particules, 100% compatible AMS y compris nozzle 0.2mm.  
> ❌ **ABS** : exclu (fumées toxiques, lab partagé).

### 5.3 Logiciel CAO

**FreeCAD 1.0** (Flatpak) — Workbenches utilisés : Part Design, Sketcher, Mesh, TechDraw

---

## PARTIE 6 — AUDIO & PROTOTYPAGE MUSICAL

### 6.1 Chaîne audio LIF2D (composants reçus)

```
Mozzi (ESP32-S3)
    │
    ▼ (DAC ou PWM)
PAM8403 HW-894 (BT 5.0, 5W+5W)
    │           │
    ▼           ▼
HP 28mm G   HP 28mm D
(4 ou 8Ω)   (4 ou 8Ω)
```

### 6.2 Prototypage audio Python

Avant implémentation ESP32/Mozzi, prototyper en Python :
- **pygame** : lecture audio, timing
- **numpy** : génération de formes d'onde
- **Tone Matrix** : inspiration (https://tonematrix.lupine.dev/)
- **Conway Matrix** : référence musicale (http://hujackus.altervista.org/conwaymatrix/)

### 6.3 Génération musicale GoL

- Chaque cellule vivante à t = déclenchement d'une note
- Position x → hauteur (pitch) selon échelle Japonaise
- Position y → octave ou vélocité
- Densité GoL → tempo ou complexité harmonique
- Transitions de règle → changement de mode/couleur

**Échelle Japonaise (Hirajoshi, exemple en La) :**
```
A - B - C - E - F - A
```
→ 5 notes sparse = évite les clusters dissonants du GoL

---

## PARTIE 7 — COÛTS & BOM

### 7.1 LIF2D — Composants reçus (stock)

| Composant | Statut | Coût approximatif |
|---|---|---:|
| US5881 Hall sensor ×10 | ✅ Reçu | ~3 € |
| WS2812B 16×16 matrix | ✅ Reçu | ~15 € |
| NdFeB N35 5×2mm ×10 | ✅ Reçu | ~2 € |
| HP 28mm 4/8Ω ×2 | ✅ Reçu | ~5 € |
| Alim 12V 2A BF-1220 | ✅ Reçu | ~8 € |
| PAM8403 HW-894 BT5.0 | ✅ Reçu | ~5 € |
| **Sous-total reçu** | | **~38 €** |

### 7.2 LIF2D — Composants à commander

| Composant | Coût estimé |
|---|---:|
| ESP32-S3 DevKit | ~8 € |
| Buck converter 5V/3A | ~3 € |
| Potentiomètres rotatifs ×4 | ~4 € |
| Encodeurs rotatifs ×2 | ~4 € |
| Boutons poussoirs ×2 | ~2 € |
| Pots linéaires slotted ×2 | ~4 € |
| Condensateurs, divers | ~5 € |
| Câbles, visserie, connecteurs | ~5 € |
| **Sous-total à commander** | **~35 € |

### 7.3 LIF2D — Boîtier (impression 3D)

| Matériau | Coût estimé filament |
|---|---:|
| PLA Metal Bambu (Copper Brown + Iron Gray) | ~8 € |
| bronzeFill ColorFabb (quelques pièces nobles) | ~6 € |
| **Sous-total boîtier** | **~14 €** |

### 7.4 Budget total LIF2D

| Poste | Montant |
|---|---:|
| Composants reçus | 38 € |
| Composants à commander | 35 € |
| Boîtier impression 3D | 14 € |
| **TOTAL LIF2D estimé** | **~87 €** |

### 7.5 LIF3D Proto A — BOM indicative

| Élément | Qté | Prix unit. | Total |
|---|---:|---:|---:|
| PCB LED 45° (2 couches, JLCPCB PCBA) | 8 | 12 € | 96 € |
| LED SMD 0603 blanches | 1024 | 0.01 € | 10 € |
| Drivers MBI5153 | 2 | 3 € | 6 € |
| ESP32-S3 WROOM-2 | 1 | 5 € | 5 € |
| Slip ring industriel 12 fils >1000rpm | 1 | 30 € | 30 € |
| Moteur BLDC outrunner 2306 | 1 | 20 € | 20 € |
| ESC 15A (dShot) | 1 | 8 € | 8 € |
| US5881 (disponible ×10) | 1 | 0 € | 0 € |
| Aimant N35 (disponible ×10) | 1 | 0 € | 0 € |
| Module PD trigger 12V | 1 | 5 € | 5 € |
| DC-DC buck 5V/3A | 1 | 3 € | 3 € |
| MAX98357A I2S ampli | 1 | 4 € | 4 € |
| HP 40mm 4Ω 5W | 1 | 5 € | 5 € |
| Roulements ABEC 3 | 2 | 5 € | 10 € |
| Silent-blocks M4 | 4 | 0.5 € | 2 € |
| Dôme plexi 150mm | 1 | 15 € | 15 € |
| Base alu + usinage | 1 | 30 € | 30 € |
| Divers | — | — | 10 € |
| **TOTAL LIF3D Proto A** | | | **~259 €** |

---

## PARTIE 8 — ROADMAP & PLAN ORGANISATIONNEL

### 8.1 Vue macro

```
PHASE 0 ──► PHASE 1 ──► PHASE 2 ──► PHASE 3 ──► PHASE 4
 Reçu         LIF2D       LIF2D       LIF3D       Produit
 composants   firmware    assemblé    POC rotor   V1 kit
 [DONE]       [EN COURS]  [À venir]   [Futur]     [Futur]
```

### 8.2 Phase 1 — LIF2D Firmware (Sprint actuel)

**Objectif :** firmware LIF2D fonctionnel, GoL + audio basique

| Tâche | Statut | Priorité |
|---|---|---|
| Projet PlatformIO `lif3d-poc2d` créé | ✅ DONE | — |
| FastLED + Mozzi configurés | ✅ DONE | — |
| Contexte Claude Code (`LIF2D_CONTEXT_CLAUDECODE.md`) | ✅ DONE | — |
| Créer `config.h` (GPIO + constantes) | 🔲 TODO | 🔴 Next |
| Init matrice + test LEDs statiques | 🔲 TODO | 🔴 |
| GoL 2D sur grille 16×16 | 🔲 TODO | 🔴 |
| Affichage GoL → WS2812B (FastLED) | 🔲 TODO | 🔴 |
| Oscillateur Mozzi basique | 🔲 TODO | 🟡 |
| Mapping cellule GoL → note musicale | 🔲 TODO | 🟡 |
| Échelle Japonaise implémentée | 🔲 TODO | 🟡 |
| Lecture ADC potentiomètres | 🔲 TODO | 🟡 |
| Lecture encodeurs + boutons | 🔲 TODO | 🟡 |
| Mapping contrôles → paramètres | 🔲 TODO | 🟢 |
| Test complet firmware intégré | 🔲 TODO | 🟢 |

### 8.3 Phase 2 — LIF2D Assemblage boîtier

| Tâche | Statut | Priorité |
|---|---|---|
| CAO boîtier steampunk (FreeCAD) | 🔲 TODO | 🟡 |
| Impression PLA Metal corps principal | 🔲 TODO | 🟡 |
| Impression bronzeFill pièces nobles | 🔲 TODO | 🟡 |
| Finitions stylo 3D PCL | 🔲 TODO | 🟢 |
| Intégration électronique dans boîtier | 🔲 TODO | 🟡 |
| Tests complets en conditions réelles | 🔲 TODO | 🔴 |

### 8.4 Phase 3 — LIF3D POC Rotor

| Tâche | Statut | Priorité |
|---|---|---|
| Rotor réduit test (8×8 LED) | 🔲 TODO | — |
| Test hall sensor US5881 + aimant N35 | 🔲 TODO | — |
| Synchronisation slices sur rotor | 🔲 TODO | — |
| Validation équilibrage dynamique | 🔲 TODO | — |
| PCB 45° → design KiCad/EasyEDA | 🔲 TODO | — |
| PCBA JLCPCB (LED 0603 + MBI5153) | 🔲 TODO | — |
| Assemblage rotor complet 32×32 | 🔲 TODO | — |
| Firmware GoL 3D sur ESP32-S3 | 🔲 TODO | — |

### 8.5 Phase 4 — LIF3D Produit V1

| Tâche | Statut |
|---|---|
| Proto A complet (1 unité) | 🔲 TODO |
| Tests vibration, bruit, thermique | 🔲 TODO |
| Proto B (5 unités) | 🔲 TODO |
| Certification CE | 🔲 TODO |
| Pré-série 50 unités | 🔲 TODO |
| Kit DIY + doc assemblage | 🔲 TODO |
| MIDI in/out | 🔲 TODO |

### 8.6 Timeline indicative

| Phase | Durée estimée | Livrable |
|---|---:|---|
| Phase 1 — LIF2D Firmware | 4-6 semaines | Firmware complet fonctionnel |
| Phase 2 — LIF2D Assemblage | 3-4 semaines | Prototype physique steampunk |
| Phase 3 — LIF3D POC | 2-3 mois | Rotor validé, GoL 3D |
| Phase 4 — Proto A | 2 mois | LIF3D complet |
| Phase 5 — V1 Kit | 4-6 mois | Produit commercialisable |

---

## PARTIE 9 — RISQUES & MITIGATIONS (MIS À JOUR)

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Alim 12V/2A insuffisante si luminosité max | 🟡 Moyen | 🔴 Haut | Limiter setBrightness() dans FastLED, max 50% |
| Impédance HP inconnue (4Ω vs 8Ω) | 🟡 Moyen | 🟡 Moyen | Mesurer à l'ohmmètre avant branchement |
| Mozzi incompatible avec FastLED (interruptions) | 🔴 Élevé | 🔴 Haut | Tâches séparées sur cores différents FreeRTOS |
| Vibrations rotor (LIF3D) | 🟡 Moyen | 🔴 Haut | Équilibrage dynamique, ABEC 3, silent-blocks |
| Bruit moteur >40dB | 🟡 Moyen | 🟡 Moyen | Outrunner + réduction RPM si besoin |
| Défaillance slip ring haute vitesse | 🔴 Élevé | 🔴 Haut | WPT (wireless power) en plan A, slip ring plan B |
| Coût LIF3D Proto A >300€ | 🟡 Moyen | 🟡 Moyen | Optimisation BOM, volumes proto B |
| MBI5153 MOQ élevé (Macroblock) | 🟡 Moyen | 🟡 Moyen | Commander via LCSC ou revendeur AliExpress |

---

## PARTIE 10 — RESSOURCES & RÉFÉRENCES

### 10.1 Références musicales / inspiration

| Ressource | URL |
|---|---|
| Conway Matrix (hujackus) | http://hujackus.altervista.org/conwaymatrix/ |
| Hujackus YouTube | https://www.youtube.com/@hujackus |
| Démo Conway Matrix | https://www.youtube.com/watch?v=RCMUkGAq6R0 |
| Tone Matrix (lupine.dev) | https://tonematrix.lupine.dev/ |
| ToneMatrix Redux (GitHub) | https://github.com/lupine-dev/ToneMatrixRedux |
| Tonfall (Google Code) | https://code.google.com/archive/p/tonfall/ |

### 10.2 Références techniques

| Ressource | URL |
|---|---|
| ESP32 | https://www.espressif.com/en/products/socs/esp32 |
| USB-PD triggers | https://done.land/components/power/powersupplies/usb/usbtriggers/ |
| HP 40mm Adafruit | https://www.adafruit.com/product/3968 |
| Anti-vibration mounts | https://www.avindustrialproducts.co.uk/blog/the-science-behind-vibration-how-rubber-mounts-work |
| JLCPCB | https://jlcpcb.com |
| Macroblock MBI5153 | https://www.mbi.com.tw |

### 10.3 Outils

| Outil | Usage |
|---|---|
| VSCode + PlatformIO | Firmware ESP32 |
| FreeCAD 1.0 (Flatpak) | CAO boîtier |
| LMMS | DAW audio Linux |
| Python / pygame / numpy | Prototypage audio |
| Leonardo.ai / Bing Creator | Visuels steampunk / doc |
| JLCPCB / PCBWay | Fabrication PCB |
| KiCad / EasyEDA | Design PCB |

---

## ANNEXE — NOTES CLÉS POUR CLAUDE CODE

Ce fichier est le document de référence pour le contexte du projet dans Claude Code (VSCode).

**Fichier à placer :** `CLAUDE.md` à la racine du projet PlatformIO OU `LIF2D_CONTEXT_CLAUDECODE.md` dans le dossier projet.

**Points critiques à retenir pour le développement firmware :**

1. **Mozzi vs FastLED** — conflit d'interruptions possible. Toujours utiliser FreeRTOS avec tâches séparées sur les deux cœurs ESP32-S3.
2. **WS2812B** — protocole timing critique. Ne pas désactiver les interruptions trop longtemps (risque de corruption du signal FastLED).
3. **ADC ESP32-S3** — éviter GPIO 0, 1 au boot. Préférer GPIO 4-10 pour l'ADC.
4. **GoL rule B6/S567** — règle validée musicalement. Ne pas changer sans test audio.
5. **Échelle Japonaise** — privilégiée pour le mapping GoL → notes. Implémentation : tableau de fréquences.
6. **Alimentation** — toujours appeler `FastLED.setBrightness(128)` ou moins au démarrage.
7. **PAM8403** — entrée LINE IN en tension logique 3.3V ou via condensateur de liaison AC.

---

*Document généré et maintenu pour le projet LIF3D / LIF2D — Felix*  
*Version 2.0 — Post-réception composants AliExpress*
