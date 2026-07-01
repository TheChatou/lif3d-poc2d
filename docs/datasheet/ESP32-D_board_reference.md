# Référence matérielle — Ma carte ESP32-D (clone chinois USB-C)

## Identification

| Champ | Valeur |
|---|---|
| Nom vendeur | "ESP32-D" / "ESP32 Development Board 30Pin" |
| Source | AliExpress item 1005006476877078 |
| Connecteur USB | **USB-C** (≠ micro-USB des DevKitC officiels Espressif) |
| Nb pins header | **30 pins** (15 par côté) |
| **Module soudé** | **ESP32-WROOM-32D** (Espressif — identifiable au capot métallique + antenne PCB intégrée) |
| **Puce MCU** | **ESP32-D0WD** (Xtensa LX6 dual-core, 240 MHz) |
| Datasheet module | `esp32-wroom-32d_esp32-wroom-32u_datasheet_en.pdf` (v2.6) |

> **Note NRND :** La datasheet porte le tampon "Not Recommended for New Designs" — c'est Espressif qui phase out ce module en faveur de l'ESP32-S3. Ça ne change rien pour LIF2D : le module est authentique et 100% fonctionnel.

---

## Spécifications techniques (ESP32-WROOM-32D)

| Spec | Valeur |
|---|---|
| CPU | Dual-core Xtensa LX6, jusqu'à 240 MHz |
| ROM | 448 KB |
| SRAM | 520 KB + 8 KB RTC SRAM |
| Flash | 4 MB SPI (sur le module) |
| Wi-Fi | 802.11 b/g/n, 2.4 GHz (2412–2484 MHz) |
| Bluetooth | v4.2 BR/EDR + BLE |
| GPIO accessibles | 30 via les headers (sur 38 pins du module) |
| DAC | 2× 8-bit natif → GPIO25 (L) + GPIO26 (R) ✅ |
| ADC | ADC1 (8 canaux) + ADC2 (10 canaux, **incompatible WiFi**) |
| Tension d'alimentation | 3.0–3.6 V (module) / 5V via USB-C (dev board) |
| Antenne | PCB intégrée (variant -32D) |

---

## Pinout complet — 30 headers

### Côté gauche (vue de face, USB-C en haut)

| # | Label board | GPIO | Type | Fonctions alternatives | Notes LIF2D |
|---|---|---|---|---|---|
| 1 | **VIN** | — | P | Alimentation 5V | Entrée depuis alim externe |
| 2 | **GND** | — | P | Ground | |
| 3 | **D13** | 13 | I/O | ADC2_CH4, TOUCH4, HSPI_ID, HS2_DATA3 | Dispo |
| 4 | **D12** | 12 | I/O | ADC2_CH5, TOUCH5, HSPI_Q, HS2_DATA2 | ⚠️ Strapping pin |
| 5 | **D14** | 14 | I/O | ADC2_CH6, TOUCH6, HSPI_CLK, HS2_CLK | Dispo |
| 6 | **D27** | 27 | I/O | ADC2_CH7, TOUCH7, RTC_GPIO17 | Dispo |
| 7 | **D26** | 26 | I/O | **DAC2**, ADC2_CH9, RTC_GPIO8 | **AUDIO DROIT → PAM8403** |
| 8 | **D25** | 25 | I/O | **DAC1**, ADC2_CH8, RTC_GPIO6 | **AUDIO GAUCHE → PAM8403** |
| 9 | **D33** | 33 | I/O | ADC1_CH5, TOUCH8, RTC_GPIO8 | Dispo |
| 10 | **D32** | 32 | I/O | ADC1_CH4, TOUCH9, RTC_GPIO9, XTAL_32K_P | Dispo |
| 11 | **D35** | 35 | **INPUT ONLY** | ADC1_CH7, RTC_GPIO5 | Pas de pullup/pulldown interne |
| 12 | **D34** | 34 | **INPUT ONLY** | ADC1_CH6, RTC_GPIO4 | Pas de pullup/pulldown interne |
| 13 | **VN** | 39 | **INPUT ONLY** | ADC1_CH3, SENSOR_VN, RTC_GPIO3 | Pas de pullup/pulldown interne |
| 14 | **VP** | 36 | **INPUT ONLY** | ADC1_CH0, SENSOR_VP, RTC_GPIO0 | Pas de pullup/pulldown interne |
| 15 | **EN** | — | I | RESET/ENABLE (actif HIGH) | Bouton RESET sur board |

### Côté droit (vue de face, USB-C en haut)

| # | Label board | GPIO | Type | Fonctions alternatives | Notes LIF2D |
|---|---|---|---|---|---|
| 1 | **3V3** | — | P | 3.3V sortie (LDO interne) | Alim capteurs 3.3V |
| 2 | **GND** | — | P | Ground | |
| 3 | **D15** | 15 | I/O | ADC2_CH3, TOUCH3, MTDO, HS2_CMD | ⚠️ Strapping pin |
| 4 | **D2** | 2 | I/O | ADC2_CH2, TOUCH2, RTC_GPIO12 | ⚠️ Strapping pin (doit être LOW ou flottant au boot) |
| 5 | **D4** | 4 | I/O | ADC2_CH0, TOUCH0, RTC_GPIO10 | Dispo (bon pour FastLED) |
| 6 | **D16** | 16 | I/O | U2RXD, HS1_DATA4, EMAC_CLK_OUT | UART2 RX — dispo |
| 7 | **D17** | 17 | I/O | U2TXD, HS1_DATA5, EMAC_CLK_OUT_180 | UART2 TX — dispo |
| 8 | **D5** | 5 | I/O | VSPICS0, HS1_DATA6, EMAC_RX_CLK | ⚠️ Strapping pin |
| 9 | **D18** | 18 | I/O | VSPICLK, HS1_DATA7 | SPI clock — dispo |
| 10 | **D19** | 19 | I/O | VSPIQ, U0CTS, EMAC_TXD0 | Dispo |
| 11 | **D21** | 21 | I/O | VSPIHD, EMAC_TX_EN | I2C SDA par défaut |
| 12 | **RXD** | 3 | I/O | U0RXD, CLK_OUT2 | **UART0 RX — câble USB** — éviter |
| 13 | **TXD** | 1 | I/O | U0TXD, CLK_OUT3, EMAC_RXD2 | **UART0 TX — câble USB** — éviter |
| 14 | **D22** | 22 | I/O | VSPIWP, U0RTS, EMAC_TXD1 | I2C SCL par défaut |
| 15 | **D23** | 23 | I/O | VSPID, HS1_STROBE | Dispo |

---

## Règles d'utilisation des GPIO

### ⛔ INPUT ONLY — pas d'output possible
GPIO34, GPIO35, GPIO36 (VP), GPIO39 (VN)  
→ Parfaits pour potentiomètres/ADC, inutilisables pour LED, WS2812B, etc.

### ⚠️ Strapping pins — à manipuler avec précaution
Ces pins sont lus par le chip **au démarrage** pour choisir le mode de boot :

| GPIO | Défaut boot | Risque si mal câblé |
|---|---|---|
| GPIO0 | Pull-up (HIGH) | LOW au boot → mode téléchargement UART |
| GPIO2 | Pull-down (LOW) | HIGH au boot → peut bloquer la programmation |
| GPIO5 | Pull-up (HIGH) | Affecte timing SDIO |
| GPIO12 | Pull-down (LOW) | **CRITIQUE** : HIGH au boot → 1.8V flash → carte ne démarre plus |
| GPIO15 | Pull-up (HIGH) | Désactive log UART0 au boot si LOW |

### ⚠️ ADC2 — conflit avec WiFi
GPIO4, 5, 12, 13, 14, 15, 25, 26, 27 utilisent ADC2.  
→ **ADC2 inutilisable quand le WiFi est actif.** Pour LIF2D (pas de WiFi), pas de problème.

### ✅ ADC1 — toujours disponible
GPIO32, 33, 34, 35, 36 (VP), 39 (VN) → ADC1, fonctionne indépendamment du WiFi.  
→ Préférer ADC1 pour les potentiomètres.

### 🚫 GPIO1 / GPIO3 — réservés USB
= TXD0 / RXD0 du câble USB. Éviter pour autre usage.

---

## Chaîne audio LIF2D (confirmée)

```
GPIO25 (DAC1) ─────→ PAM8403 LINE IN L ──→ HP gauche 4Ω
GPIO26 (DAC2) ─────→ PAM8403 LINE IN R ──→ HP droit 4Ω
```

DAC natif 8-bit, sortie 0–3.3V. Niveau LINE-IN compatible direct avec PAM8403 HW-894.

---

## GPIO recommandés pour les périphériques LIF2D

| Périphérique | GPIO recommandé | Raison |
|---|---|---|
| WS2812B data | **GPIO4** | Pas strapping, pas ADC2 conflit WiFi, pas RXD/TXD |
| Encodeur EC11 A/B | **GPIO16, GPIO17** | UART2 libre, propres, pas strapping |
| Encodeur 2 A/B | **GPIO18, GPIO19** | SPI libre, propres |
| Boutons (Play, Reset) | **GPIO21, GPIO22** | I2C dispo, propres |
| Pot ADC (Volume, BPM…) | **GPIO32, GPIO33, GPIO34, GPIO35** | ADC1, pas de conflit WiFi |
| Pot ADC fin | **GPIO36 (VP), GPIO39 (VN)** | ADC1 input-only, parfaits pour lecture analogique |

---

## Ce que cette carte N'a PAS (vs ESP32-S3)

- Pas d'USB natif (passe par un chip USB-série externe, probablement CH340 ou CP2102)
- Pas de GPIO48 (contrairement à l'ESP32-S3 souvent cité)
- Bluetooth max 4.2 (pas BLE 5.0)
- ADC 12-bit (l'ESP32-S3 a le même, mais meilleure linéarité)
- NRND : Espressif ne recommande plus ce module pour de nouveaux designs, mais il est pleinement supporté par l'IDF et PlatformIO
