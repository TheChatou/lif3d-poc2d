# ESP32-D — GPIO et contraintes matérielles
> Session du 2026-06-12
> Carte : clone chinois USB-C 30 pins avec module ESP32-WROOM-32D

## Identification de ta carte

| Ce que le vendeur dit | Ce qu'il y a vraiment dedans |
|---|---|
| "ESP32-D" | Clone chinois USB-C 30 pins |
| Module soudé | **ESP32-WROOM-32D** (Espressif authentique, NRND*) |
| Puce dans le module | **ESP32-D0WD** (Xtensa LX6 dual-core 240MHz) |
| Flash | 4MB SPI |
| RAM | 520KB SRAM + 8KB RTC |

*NRND = "Not Recommended for New Designs" = Espressif ne le recommande plus pour les nouveaux projets, mais il est parfaitement fonctionnel. Pleinement supporté PlatformIO.

---

## Trois types de GPIO à connaître

### 1. GPIO normaux (I/O)
Peuvent lire (INPUT) ou écrire (OUTPUT) un signal.  
Exemple : GPIO4, GPIO16, GPIO17, GPIO18, GPIO21, GPIO22, GPIO23...

### 2. GPIO Input-Only (lecture seule)
**Ne peuvent PAS sortir de signal, ne peuvent PAS activer de résistance interne.**  
Parfaits pour les potentiomètres (ADC) — un pot génère sa propre tension.  
À éviter pour : LEDs, WS2812B, tout ce qui doit recevoir un signal.

| GPIO | Alias board | Usage recommandé |
|---|---|---|
| GPIO34 | D34 | ADC1_CH6 — pot Règles GoL |
| GPIO35 | D35 | ADC1_CH7 — encodeur X CLK (⚠ pullup externe 10kΩ requis) |
| GPIO36 | VP | ADC1_CH0 — pot Volume |
| GPIO39 | VN | ADC1_CH3 — pot Luminosité |

### 3. Strapping Pins (à manipuler avec précaution)
L'ESP32 **les lit au démarrage** pour choisir son mode de boot.  
Après le boot, ce sont des GPIO normaux. Mais si tu les câbles à un état forcé au démarrage → problèmes.

| GPIO | État défaut boot | Risque si mal câblé |
|---|---|---|
| GPIO0 | HIGH (pull-up) | LOW au boot → mode téléchargement UART (bouton BOOT) |
| GPIO2 | LOW (pull-down) | HIGH au boot → peut bloquer la programmation |
| GPIO5 | HIGH (pull-up) | Peut envoyer un glitch à la matrice WS2812B au démarrage |
| GPIO12 | LOW (pull-down) | **CRITIQUE** : HIGH au boot → flash alim 1.8V → ESP32 ne démarre plus |
| GPIO15 | HIGH (pull-up) | Désactive logs UART0 si LOW au boot |

---

## ADC1 vs ADC2 — pourquoi ça compte

| ADC | GPIO | Disponible avec Mozzi ? |
|---|---|---|
| **ADC1** | 32, 33, 34, 35, 36, 39 | ✅ Toujours disponible |
| ADC2 | 0, 2, 4, 12, 13, 14, 15, 25, 26, 27 | ⚠ Incompatible avec certains timers Mozzi sur ESP32 |

**Règle : utiliser uniquement ADC1 pour les potentiomètres** (GPIO 32, 33, 34, 35, 36, 39).

---

## UART — les ports série de l'ESP32

L'ESP32 a 3 ports UART (= 3 canaux de communication série) :

| UART | Pins par défaut | Usage |
|---|---|---|
| UART0 | GPIO1 (TX), GPIO3 (RX) | **Câble USB** — programmation et Serial.println() |
| UART1 | GPIO9 (TX), GPIO10 (RX) | Interne (flash SPI) — **NE PAS UTILISER** |
| UART2 | GPIO17 (TX), GPIO16 (RX) | Libre → utilisé pour **MIDI OUT** |

> **Bonne nouvelle :** les UART peuvent être remappés sur n'importe quel GPIO libre.  
> `Serial2.begin(31250, SERIAL_8N1, -1, GPIO4);` → utilise GPIO4 comme TX de UART2.

⚠ **Conflit actuel dans config.h :** GPIO16/17 sont assignés à l'encodeur BPM ET à UART2.  
→ À résoudre avant Phase 2 (MIDI). Solution envisagée : remapper UART2_TX sur GPIO4.

---

## GPIO DATA WS2812B — lequel utiliser ?

| GPIO | Candidat ? | Raison |
|---|---|---|
| GPIO4 | ✅ **Recommandé** | Pas strapping, pas ADC2 conflit Mozzi, libre |
| GPIO5 | ⚠ Possible | Strapping pin → bref glitch HIGH au boot peut perturber la matrice |
| GPIO0 | ❌ Non | Strapping + bouton BOOT |
| GPIO2 | ❌ Non | Strapping, LED onboard sur certaines cartes |

**Config actuelle :** `LED_DATA_PIN = 5` dans config.h. À surveiller — si glitch au démarrage → migrer vers GPIO4.

---

## GND commun — règle fondamentale

Tous les composants doivent partager le **même GND** (le même fil de masse).  
Si un composant a son propre GND non relié, les signaux entre composants seront mal interprétés.

```
LRS-75-5 borne -V ──→ GND ESP32 ──→ GND WS2812B ──→ GND PAM8403
(tous reliés ensemble = même potentiel de référence)
```
