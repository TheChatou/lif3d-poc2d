# Réflexion — I/O audio & MIDI de LIF2D : à quoi sert chaque branchement, et quoi d'autre envisager

Date : 2026-09-11
Question de Felix : comprendre concrètement l'usage de MIDI OUT, MIDI IN, sortie ligne, sortie casque — et si d'autres branchements seraient utiles pour ce projet.

---

## 1. MIDI OUT (déjà câblé dans le CDC — bloc 4)

### A. Caractéristiques techniques
MIDI = protocole série à 31250 bauds, messages *Note On/Off* + *Control Change* envoyés en boucle de courant 5mA (pas de la tension logique classique — c'est pour ça qu'il faut des résistances 220Ω, pas un simple fil). Un jack MIDI OUT n'envoie **que des données**, jamais de l'audio.

### B. Faisabilité hardware actuel
100% faisable avec l'existant : `Serial2.begin(31250, SERIAL_8N1, -1, 4)` sur GPIO4, + 2× résistances 220Ω vers le jack TRS 3.5mm Type A. Zéro composant supplémentaire à commander (déjà dans le CDC "à commander" : 1 jack ~1€).

### C. Alternatives
Aucune nécessaire — c'est le montage le plus simple qui existe pour du MIDI OUT.

### D. Mapping GoL → MIDI
Chaque fois que le GoL déclenche une note en interne (cellule vivante × colonne courante → note Mozzi), on envoie **en parallèle** le même événement en `Serial2.write()` sous forme de Note On/Off MIDI. Aucune nouvelle logique de mapping : c'est un "miroir" du séquenceur existant vers l'extérieur.

### E. Simulateur Python
`simulator/sim.py` pourrait ouvrir un port MIDI virtuel avec `python-rtmidi` et envoyer les mêmes événements — utile pour tester le mapping notes avant de toucher au firmware. Optionnel, pas critique.

### Usage réel concret
- Enregistrer la composition générée par le GoL dans un DAW **sous forme de données MIDI éditables** (pas un .wav figé) — tu peux ensuite changer d'instrument, corriger, exporter en partition.
- Faire jouer les notes générées par un synthé externe (hardware ou Eurorack via un module MIDI-to-CV) avec un son différent du Mozzi interne.
- Piloter un deuxième appareil (lumière, autre séquenceur) qui réagit aux Note On du GoL.

---

## 2. MIDI IN (l'intention réelle de Felix — pas câblé actuellement)

### A. Caractéristiques techniques
Recevoir un flux MIDI externe (ordinateur via interface USB-MIDI, ou synthé/séquenceur analogique avec sortie MIDI) et le décoder sur l'ESP32. Contrairement au MIDI OUT, une entrée MIDI est un point d'attaque électrique externe → **isolation galvanique obligatoire**, d'où l'optocoupleur.

### B. Faisabilité hardware actuel
❌ **Pas possible cette semaine** — il manque le composant d'isolation. Mais le reste (UART libre, GPIO, code) ne pose pas de problème particulier.

### C. Alternatives matérielles
| Composant | Prix | Notes |
|---|---|---|
| **6N138** (souvent cité dans les tutos DIY MIDI) | ~0.5€ | ⚠️ Hors-spec à 3.3V — datasheet prévoit du 5V. Peut marcher, peut glitcher par intermittence selon les sources DIY consultées. |
| **H11L1** | ~0.5-1€ | Recommandé pour microcontrôleur 3.3V : conçu pour ce cas, pas besoin de résistance de tirage supplémentaire côté sortie. Meilleur choix que le 6N138 si tu commandes du neuf. |

Dans les deux cas : circuit standard MIDI IN (résistance limitatrice ~220Ω côté LED de l'optocoupleur, diode de protection en inverse, sortie tirée au 3.3V vers RX de l'UART).

Librairie logicielle : Mozzi ne décode pas le MIDI lui-même — il faut la **librairie Arduino MIDI Library** (FortySevenEffects) en parallèle, qui appelle des callbacks `HandleNoteOn()`/`HandleNoteOff()` que ton code relie ensuite à Mozzi ou au GoL.

### D. Mapping MIDI IN → GoL/son (le point intéressant)
Deux philosophies possibles :
1. **Note externe → cellule vivante** : une Note On reçue "réveille" une cellule dans la grille GoL (ligne = hauteur de note dans la gamme active, colonne = position de lecture actuelle). Ça reste fidèle à l'esprit "la vie génère la musique" — tu injectes de la vie depuis l'extérieur au lieu de déclencher un son directement.
2. **Note externe → son direct**, en court-circuitant le GoL (mode "clavier live"). Plus classique, mais s'éloigne du concept génératif du projet.

Recommandation : l'option 1 est plus intéressante et cohérente avec l'identité du projet — jouer sur un clavier MIDI externe deviendrait littéralement une façon de "planter des graines" dans le jeu de la vie.

### E. Simulateur Python
Faisable et même recommandé de le prototyper là **avant** le firmware : `python-rtmidi` peut écouter un port MIDI (virtuel ou USB) et injecter des cellules dans `simulator/sim.py` en temps réel — zéro risque, zéro matériel, tu valides le mapping (option 1 vs 2) à l'oreille avant de commander le H11L1.

---

## 3. Sortie ligne (déjà câblée — jack PJ-3410 5 broches commuté)

Déjà entièrement analysé le 2026-09-04 (`docs/analyses/20260904_jack_audio_casque_dac_brut.md`). Rappel rapide :
- Usage réel : brancher LIF2D sur une table de mixage ou l'entrée ligne d'un DAW/interface audio externe, pour profiter d'un meilleur ampli/monitoring que le PAM8403 interne.
- Auto-mute des HP internes via les contacts TS/RS du jack quand un câble est branché — mécanique pure, zéro code.
- Le signal doit rester le DAC ESP32 brut + condensateur de découplage (10-47µF) — pas besoin du TDA2822 sur ce chemin, seulement sur la sortie casque.

---

## 4. Sortie casque (TDA2822 reçu — à câbler)

Déjà tranché le 2026-09-04, composant mis à jour au 2026-09-11 (memory `project_hardware.md`) : le TDA2822 remplace le NJM4560 initialement envisagé, monté en sortie single-ended référencée masse entre le DAC et le même jack PJ-3410 5 broches (pas un jack séparé). Condensateur de découplage en sortie toujours obligatoire (offset DC).

---

## 5. Autres branchements à envisager

| Option | Intérêt | Faisabilité actuelle | Effort |
|---|---|---|---|
| **MIDI Clock (sync tempo)** | LIF2D envoie le tempo du GoL comme horloge MIDI (octet `0xF8`) sur le même jack MIDI OUT déjà prévu — un DAW ou une boîte à rythme externe peut alors se caler sur le tempo généré par le jeu de la vie. | ✅ Zéro matériel supplémentaire — juste du firmware (timer qui envoie l'octet de clock au bon intervalle en plus des notes). | Faible |
| **BLE MIDI** (déjà noté comme extension future dans le CDC, ligne 474) | Envoyer/recevoir du MIDI sans fil vers/depuis un iPad/Mac — utile si tu veux jouer depuis une app iOS sans câble. L'ESP32-WROOM-32D a le Bluetooth classique **et** BLE. | ⚠️ Faisable mais évite l'optocoupleur seulement pour le sens IN — reste un chantier firmware (stack BLE MIDI), pas juste du câblage. | Moyen |
| **USB MIDI natif (classe USB standard)** | Brancher LIF2D en USB directement reconnu comme périphérique MIDI par un ordinateur (comme un clavier MIDI classique), sans passer par un pont série. | ❌ **Impossible avec l'ESP32-WROOM-32D actuel** — confirmé par la recherche : ce chip n'a pas de contrôleur USB device natif, seulement un pont USB-série (CP2102/CH340) sur le dev board. Il faut un **ESP32-S2 ou ESP32-S3** pour ça. | — (changement de MCU) |
| **CV/Gate (sortie style Eurorack modulaire)** | Piloter un synthé modulaire analogique avec la tension (CV = hauteur de note) et un signal gate (déclenchement) générés par le GoL — usage courant chez les makers musicaux DIY. | ⚠️ Limité : l'ESP32-D n'a que **2 DAC matériels**, déjà utilisés pour l'audio stéréo L/R. Une 3e sortie CV nécessiterait soit un DAC externe (ex: MCP4725 en I²C, ~1-2€), soit un pseudo-CV en PWM+filtre RC (moins propre, du ripple). Le gate est facile (juste un GPIO digital). | Moyen (si DAC I²C ajouté) |

**Point intéressant pour LIF3D** (pas LIF2D) : le CDC LIF3D prévoit déjà 3× ESP32-**S3** — ces puces ont un vrai contrôleur USB device. L'USB MIDI natif, impossible aujourd'hui sur LIF2D, deviendrait donc réalisable nativement sur LIF3D sans composant supplémentaire. À garder en tête pour la suite du projet.

---

## Tableau de synthèse

| Aspect | Faisable maintenant ? | Effort | Notes |
|---|---|---|---|
| MIDI OUT | ✅ | Faible | Déjà dans le CDC, juste à souder |
| MIDI Clock (bonus MIDI OUT) | ✅ | Faible | Firmware seulement, même jack |
| MIDI IN (H11L1) | ❌ cette semaine / ✅ après commande | Faible-moyen | H11L1 préférable au 6N138 (hors-spec 3.3V) |
| MIDI IN — simulateur Python | ✅ | Faible | `python-rtmidi`, à tester avant le firmware |
| Sortie ligne | ✅ | — | Déjà câblée/analysée |
| Sortie casque (TDA2822) | ✅ | Faible | À câbler, condo obligatoire |
| BLE MIDI | ⚠️ | Moyen | Chantier firmware, pas juste câblage |
| USB MIDI natif | ❌ | — | Nécessite ESP32-S2/S3, pas le WROOM-32D actuel |
| CV/Gate Eurorack | ⚠️ | Moyen | Nécessite DAC I²C externe pour rester propre |

---

## Sources consultées
- [MIDI In for 3.3V Microcontrollers – DIY Electronic Music](https://diyelectromusic.com/2021/02/15/midi-in-for-3-3v-microcontrollers/)
- [Using a Cheap 5V MIDI Interface at 3V3 – DIY Electronic Music](https://diyelectromusic.com/2025/04/07/using-a-cheap-5v-midi-interface-at-3v3/)
- [MIDI Tutorial - SparkFun Learn](https://learn.sparkfun.com/tutorials/midi-tutorial/hardware--electronic-implementation)
- [ESP32 USB MIDI (ESP32-S2/S3 only) — esp32beans/ESP32USBMIDI](https://github.com/esp32beans/ESP32USBMIDI)
- [ESP32-S3-DevKitC-1 UART vs USB TinyUSB MIDI — ESP32 Forum](https://esp32.com/viewtopic.php?t=37434)
- Mozzi doc (Context7) — confirmation que Mozzi ne décode pas le MIDI lui-même (nécessite Arduino MIDI Library en complément)
