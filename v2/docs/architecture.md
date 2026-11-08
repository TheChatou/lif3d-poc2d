# Architecture V2 — options et recommandation

> Chiffres et sources : `../analyses/20261107_audio_8bits_v1_et_v2.md` (BoardWatch, datasheet Daisy Seed,
> Daisy Community, Makerguides PCM5102A, SparkFun WM8960, Electric Druid, Attack Magazine).
> Prix indicatifs novembre 2026, **à revérifier** avant commande.

## 1. Exigences

| Domaine | Exigence V2 | V1 pour comparaison |
|---|---|---|
| Son | ≥ 16 bits en sortie (viser 24), ≥ 44,1 kHz, SNR ≥ 100 dB, polyphonie ≥ 16 voix, filtre résonant, effets (reverb, delay) | 8 bits, 32 kHz, ~48 dB |
| Batterie | échantillons 16 bits + synthèse, 8 pistes × 32 pas (ou plus), vélocité par pas | synthèse 8 bits + kit STUDIO 8 bits |
| Sorties | casque (16–300 Ω) sans perte de graves, ligne stéréo, HP intégrés | TDA2822 + PAM8403 |
| Bruit | aucun sifflement lié à l'affichage | sifflements audibles |
| Visuel | matrice RVB adressable, 50 images/s, luminosité maîtrisée | WS2812B 16×16 |
| Contrôles | 2 encodeurs cliquables + ▶ (identité « ardoise magique ») | idem |
| MIDI | OUT (TRS type A) au minimum, IN souhaité, USB-MIDI souhaité | OUT câblé |
| Connectivité (option) | BLE-MIDI / Wi-Fi pour presets et mises à jour | aucune |
| Fabrication | PCB unique, modules certifiés, alim externe certifiée possible | câblage à la main |

## 2. Cerveau (MCU)

| Option | Points forts | Points faibles | Prix |
|---|---|---|---|
| **Daisy Seed (Seed3)** — M7 480 MHz, 64 Mo SDRAM, codec 32 bits / 192 kHz (TI TAC5242, plancher −120 dB) | conçu pour les instruments ; DaisySP (oscillateurs band-limited, filtres, réverbs, percussions) ; 64 Mo pour des échantillons longs | pas de Wi-Fi/BLE ; LEDs à gérer à côté | ~30 $ |
| **Teensy 4.1** — M7 600 MHz FPU + Audio Adaptor SGTL5000 (16 bits, ampli casque) | Teensy Audio Library très complète + outil graphique ; USB-MIDI natif ; gère aussi des LEDs | codec 16 bits seulement ; pas de radio | ~31 $ + 10 $ |
| **ESP32-S3** + codec (WM8960 / ES8388) ou PCM5102A + ampli casque | le moins cher, Wi-Fi/BLE, continuité avec la V1, FastLED connu | moteur son à écrire (pas de bibliothèque équivalente à DaisySP) ; CPU plus juste | ~5–10 € + 3–15 € |
| **RP2350** (Pico 2) + PCM5100A | très bon marché, PIO pour LEDs et I²S | 150 MHz : juste pour un synthé riche | ~5 € + ~10 € |

## 3. Sortie audio

| Option | Remarques |
|---|---|
| Codec intégré Daisy + étage casque sur PCB | le plus propre ; schéma de référence fourni par Electrosmith |
| **WM8960** | DAC + ADC + ampli casque 16/32 Ω (capless possible) + 2 × 1 W classe D : remplace TDA2822 **et** PAM8403 ; config I²C |
| SGTL5000 (Teensy) | ampli casque intégré, 16 bits |
| PCM5102A + ampli casque (ex. PCM5100A + PAM8908 du Pico Audio Pack) | sortie 2,1 Vrms centrée masse, SNR ~112 dB, mais ≥ 1 kΩ : ampli casque obligatoire |

## 4. Architecture recommandée

```
            ┌──────────────────────────── alim 5 V certifiée (USB-C PD ou bloc) ────────────────────────────┐
            │                                                                                                 │
   rail LEDs (5 V, fusible)                         rail numérique 3,3 V                rail AUDIO (LDO bas bruit)
            │                                               │                                   │
   ┌────────▼────────┐   UART (MIDI interne)   ┌────────────▼───────────┐   I²S/codec   ┌───────▼────────┐
   │  ESP32-S3        │◄──────────────────────►│  Daisy Seed (son)       │──────────────►│ casque / ligne │
   │  LEDs, menus,    │                         │  synthé, batterie,      │               │ ampli HP       │
   │  encodeurs,      │                         │  effets, MIDI           │               └────────────────┘
   │  BLE/Wi-Fi, NVS  │                         └─────────────────────────┘
   └──────────────────┘          masse en étoile : un seul point de jonction numérique ↔ audio
```

**Pourquoi deux cerveaux** : le son exige un temps réel strict (un échantillon toutes les ~20 µs) ;
LEDs, menus et radio créent des à-coups. Les séparer supprime d'un coup les conflits
Mozzi/FastLED de la V1 **et** permet d'isoler électriquement l'audio.

**Alternative « un cerveau »** (plus simple à fabriquer, moins cher) : Teensy 4.1 + SGTL5000, ou
ESP32-S3 + WM8960. À choisir si le prototype deux-cerveaux s'avère trop complexe.

## 5. Questions ouvertes (à trancher avec Felix)

1. Un ou deux cerveaux ? (critères : coût BOM, complexité firmware, qualité visée)
2. Matrice : 16×16 conservée, 32×32, ou LEDs 2020 plus denses ?
3. HP intégrés : indispensables ou « casque/ligne d'abord » ?
4. MIDI IN (H11L1 en 3,3 V, voir `../analyses/20260911_io_audio_midi_reflexion.md`) et USB-MIDI ?
5. Radio (BLE-MIDI, appli) : V2 ou plus tard ?
6. Licences : DaisySP / libDaisy (MIT ?), Teensy (usage commercial ?), échantillons (CC0) — **à vérifier**.
7. Certification CE : modules pré-certifiés + alim externe certifiée pour limiter le coût.
8. Prix de vente visé → budget BOM (règle courante : BOM ≈ 1/4 à 1/3 du prix public).
