# Bien sonner en 8 bits (V1) et viser un synthé quasi pro (V2) — 2026-11-07

> Contexte : Felix n'est pas content de la qualité audio (souffle, sifflements, graves absents au
> casque, saturation quand les notes s'empilent). Cette analyse répond à deux questions :
> 1. que peut-on encore gagner **tout de suite** sur la V1 (ESP32 + DAC 8 bits + TDA2822 + PAM8403) ?
> 2. quelle architecture pour une **V2 vendable** à la qualité « synthé quasi pro » ?
>
> Suites de : `20261025_interferences_leds_audio.md`, `20261028_son_qui_crache_cpu_ou_ampli.md`.

---

## A. Caractéristiques techniques — ce qui fait un « bon son » numérique

| Notion | Définition simple | Chiffre clé |
|---|---|---|
| **Résolution (bits)** | nombre de « marches » pour décrire le volume d'un instant | 8 bits = 256 marches = **48 dB** de dynamique ; 16 bits = 96 dB (CD) ; 24 bits = 144 dB |
| **Fréquence d'échantillonnage** | nombre de mesures par seconde | Mozzi ESP32 : 32 768 Hz → aigus jusqu'à ~16 kHz |
| **Aliasing (repliement)** | une onde trop riche en harmoniques (carré, dent de scie) dépasse la moitié de la fréquence d'échantillonnage → les harmoniques « rebondissent » en notes fausses, son métallique | surtout dans les aigus |
| **Dither** | ajouter un bruit minuscule *avant* d'arrondir en 8 bits : l'erreur d'arrondi devient un léger souffle uniforme au lieu d'une distorsion « granuleuse » (très audible sur les fins de notes et la reverb) | coût : 2–3 opérations par échantillon |
| **Noise shaping** | dither « sculpté » : on repousse le bruit vers les aigus, où l'oreille est moins sensible | perçu comme +1 à 2 bits gratuits |
| **Filtre de reconstruction** | petit filtre passe-bas analogique après le DAC qui lisse les « marches » | une résistance + un condensateur |
| **µ-law (compansion)** | les vraies boîtes à rythmes 8 bits (LinnDrum, Oberheim DMX) utilisaient un DAC **non linéaire** : 8 bits de mémoire mais ~**12–13 bits de dynamique** perçue (source : Electric Druid) | nécessite un DAC µ-law (AM6070) — pas notre DAC linéaire |
| **SNR** | rapport signal / bruit | PAM8403 ≈ 80 dB ; PCM5102A ≈ 112 dB ; Daisy Seed3 : plancher de bruit −120 dB |

🎓 **Leçon des pros des années 80** : la LinnDrum, la SP-1200 (12 bits, 26 kHz) ou la MPC60 sonnent
« gros » non pas grâce à leur résolution mais grâce à : des **échantillons de vraies batteries**, un
**gain staging soigné** (chaque son normalisé au maximum de ses bits), des **filtres analogiques** après
le DAC, et de la **saturation** assumée. Le « lo-fi » est un caractère, à condition que la chaîne
analogique derrière soit propre.

---

## B. Faisabilité sur le hardware actuel (V1) — gains classés par rapport effort / effet

### B1. Analogique (soudure, ~0,20 €) — **le plus gros gain immédiat**

1. **Pont diviseur 10 kΩ / 1 kΩ** sur chaque canal entre le DAC et l'entrée du TDA2822 (déjà décrit
   dans `20261028_son_qui_crache…` §3). Effets : le TDA ne sature plus, le potar travaille dans sa zone
   centrale (où gauche et droite sont équilibrés), la tension continue sur le potar est divisée par 11
   (moins de « crachotement » quand on le tourne).
2. **+ un condensateur de 10 nF en parallèle sur la 1 kΩ** = filtre de reconstruction gratuit :
   fc ≈ 1 / (2π × (10k ∥ 1k) × 10 nF) ≈ **17,5 kHz** → on lisse les marches du DAC sans toucher à l'audible.
   (Valeur à ajuster : 4,7 nF → ~37 kHz plus doux ; 22 nF → ~8 kHz plus sombre.)
3. **Graves au casque** : les condensateurs de sortie 100 µF du module TDA forment un passe-haut avec
   le casque : fc = 1 / (2π × R × C) → **~100 Hz avec un casque 16 Ω**, ~50 Hz avec 32 Ω. Mettre
   **470 µF à 1000 µF** (tu en as) en parallèle/à la place → fc ≈ 10–20 Hz : les graves reviennent.
   ⚠️ respecter la polarité (+ côté ampli).

### B2. Code (gratuit) — par ordre d'intérêt

| # | Amélioration | Gain | Effort | CPU |
|---|---|---|---|---|
| 1 | **Percussions échantillonnées** (classe `Sample` de Mozzi + script `char2mozzi.py`) à la place du bruit blanc / sinus synthétisés | ⭐⭐⭐ « vraie » batterie, DnB/breaks crédibles | Moyen | faible (lecture de table) |
| 2 | **Mixage en 16 bits puis dither TPDF + noise shaping** avant la sortie 8 bits | ⭐⭐ fins de notes et reverb sans « grain » | Faible (~15 lignes) | < 1 % |
| 3 | **Oscillateurs « band-limited »** : une table d'onde par octave (moins d'harmoniques dans les aigus) ou ne garder que sinus/triangle au-dessus d'une certaine note | ⭐⭐ aigus moins métalliques | Moyen | nul (choix de table) |
| 4 | **Filtre passe-bas résonant** par voix ou global (`LowPassFilter` de Mozzi) piloté par l'âge des cellules | ⭐⭐ caractère « synthé » | Moyen | ~2–5 % |
| 5 | Techniques **chiptune** : rapport cyclique variable sur l'onde carrée (12,5 / 25 / 50 %), basse en triangle, kick par glissement de hauteur (déjà fait), arpège rapide au lieu d'accords tenus | ⭐ timbres variés pour presque rien | Faible | nul |
| 6 | Déjà fait le 2026-11-07 : limiteur (plus d'écrêtage quand les notes s'empilent), reverb 16 bits, 16 voix, gain par note dans les gros accords | — | — | — |

**Budget mémoire des échantillons** : 8 bits à 16 384 Hz = 16 Ko par seconde. Un kick (0,3 s) ≈ 5 Ko,
un kit de 8–12 sons ≈ **60–150 Ko** sur 4 Mo de flash : aucun problème. Plusieurs kits (808, 909,
breakbeat découpé) tiennent largement.

⚠️ **Droits** : pour un produit vendu, uniquement des échantillons **CC0 / libres de droits** (ou
enregistrés soi-même). Les « kits 808 gratuits » ne le sont pas tous ; l'Amen break est juridiquement
délicat.

### B3. Piste expérimentale : sortie PDM (Context7, doc Mozzi ESP32)

Mozzi propose `MOZZI_OUTPUT_PDM_VIA_I2S` : le son est encodé en **modulation de densité
d'impulsions** sur une seule broche (défaut GPIO33), puis un filtre RC le reconstitue. Avantage
possible : plus de 8 bits effectifs (paramètre `MOZZI_PDM_RESOLUTION`). Limites : **mono uniquement**,
coût CPU qui monte avec la résolution, et il occupe le périphérique I2S0 → vérifier le conflit avec
FastLED (`FASTLED_ESP32_I2S`). **Non testé, à essayer seulement si curiosité** : le passage à un vrai DAC
I²S (V2) est plus sûr.

### B4. Ce qui restera limité sur la V1, quoi qu'on fasse

- **48 dB** de dynamique (8 bits linéaires) → un souffle de fond restera audible au casque.
- **Alim partagée** LEDs / ESP32 / amplis + TDA2822 à gain ×100 → les sifflements qui suivent
  l'affichage (diagnostic du 2026-11-07 : aigu qui change avec les LEDs et le PAM, ronronnement ~2 Hz
  probablement l'alim LRS en mode rafales à faible charge) ne disparaîtront pas complètement.
- HP 28 mm : pas de graves physiquement possibles.

---

## C. Alternatives matérielles (V2) — par coût / complexité croissants

### C1. Sortie audio (DAC / codec)

| Option | Ce que c'est | Qualité | Casque | Prix ind. | Remarques |
|---|---|---|---|---|---|
| **PCM5102A** (module) | DAC I²S stéréo 16/24/32 bits | SNR ~112 dB, THD+N −93 dB, sortie 2,1 Vrms **centrée sur la masse** (pas de condo de sortie) | ⚠️ prévu pour ≥ 1 kΩ : il faut un **ampli casque** | ~3–5 € | aucun réglage logiciel (pas d'I²C) ; Mozzi le pilote déjà (`MOZZI_OUTPUT_I2S_DAC`) |
| **PCM5100A + PAM8908** (ex. Pimoroni Pico Audio Pack) | DAC + vrai ampli casque « capless » | idem PCM510x | ✅ | ~15 € | bon modèle de schéma à recopier |
| **WM8960** (codec) | DAC + ADC + **ampli casque 16/32 Ω** + **2 × 1 W classe D** pour HP | bon | ✅ capless possible | ~8–15 € | remplace TDA2822 **et** PAM8403 d'un coup ; se configure en I²C (plus de code) |
| **ES8388** (ex. carte ESP32-A1S) | codec + sorties casque + HP 3 W | bon | ✅ | carte ~15–20 € | carte « tout-en-un » ESP32 + codec |
| **SGTL5000** (Teensy Audio Adaptor) | codec 16 bits / 44,1 kHz + ampli casque | bon (16 bits) | ✅ | ~10 $ | lié à l'écosystème Teensy |
| **Codec Daisy Seed3** (TI TAC5242) | intégré à la carte | **32 bits / 192 kHz, plancher −120 dB** | via la carte de dev (Pod) ou schéma maison | inclus | le plus « pro » de la liste |

### C2. Cerveau (MCU) — comparatif (sources : BoardWatch, datasheet Daisy, Daisy Community)

| Carte | CPU | Mémoire | Audio | Prix | Pour LIF V2 |
|---|---|---|---|---|---|
| **ESP32-S3** (+ PCM5102A ou WM8960) | 2 × 240 MHz Xtensa LX7, FPU simple précision | 512 Ko + PSRAM 2–8 Mo | via I²S | ~5–10 € | ✅ Wi-Fi/BLE (MIDI BLE, appli), FastLED connu, continuité avec la V1. CPU suffisant pour ~8–16 voix float simples |
| **RP2350** (Pico 2) | 2 × Cortex-M33 150 MHz | 520 Ko | I²S via PIO | ~5 € | ⚠️ bon marché mais plus juste en puissance pour un synthé riche |
| **Teensy 4.1** | Cortex-M7 **600 MHz**, FPU | 1 Mo RAM + 8 Mo flash (+ PSRAM option) | Audio Adaptor SGTL5000 16 bits | ~31 $ + 10 $ | ✅ **Teensy Audio Library** très riche (oscillateurs, filtres, drums, lecteurs d'échantillons, outil graphique) ; LEDs OK (OctoWS2811/FastLED) ; MIDI USB natif |
| **Daisy Seed (Seed3)** | Cortex-M7 **480 MHz** | **64 Mo SDRAM** (jusqu'à ~10 min d'audio), 8 Mo flash | **codec 32 bits / 192 kHz intégré** | ~30 $ | ✅✅ conçue pour les instruments ; **DaisySP** (oscillateurs band-limited, filtres, réverbs, modules de percussions) ; C++/Arduino/Pure Data/Max gen~ |

### C3. Architecture recommandée pour la V2 (à valider dans le CDC V2)

**« Deux cerveaux »** : un **Daisy Seed** dédié au son + un **ESP32-S3** pour les LEDs, l'interface,
le Wi-Fi/BLE, reliés par une liaison série (UART, protocole type MIDI).

- 🎓 Pourquoi deux : le son est un travail **temps réel strict** (un échantillon toutes les ~20 µs) ;
  les LEDs, le Wi-Fi et les menus créent des à-coups. Les séparer = plus jamais de conflit de cœurs,
  de minuteurs ou d'interruptions (nos galères Mozzi/FastLED de la V1).
- Bonus électrique : on peut isoler **l'alimentation et la masse audio** (régulateur linéaire dédié
  pour le codec, masse en étoile, LEDs sur leur propre rail) → fin des sifflements qui suivent l'affichage.
- Alternative **un seul cerveau** plus simple à fabriquer : **Teensy 4.1 + SGTL5000** (16 bits, très bon
  pour un premier produit) ou **ESP32-S3 + WM8960** (le moins cher, continuité du code).
- Amplis HP : remplacer PAM8403 (80 dB SNR) par l'étage classe D du WM8960, ou un ampli I²S
  (MAX98357A, mono 3 W) par HP, ou un ampli analogique de meilleure qualité derrière le codec.
- HP plus gros / enceinte accordée (évent) si on veut des graves hors casque.

### C4. Questions de Felix

- **« 16 bits suffit pour importer du MIDI / de l'audio ? »** — Le MIDI n'est pas de l'audio (ce sont
  des ordres « joue telle note »), la résolution ne le concerne pas. Pour **sortir** et **stocker** des
  échantillons, 16 bits / 44,1 kHz = qualité CD, largement suffisant. Les pros **calculent** en interne
  en 32 bits flottants (marge infinie pour mixer, filtrer, réverbérer sans saturer) et **sortent** en
  24 bits. Viser : moteur float 32 bits → codec 24 bits.
- **« Mozzi est-il obligatoire ? »** — Non. Mozzi est génial pour démarrer sur de petits Arduino
  (tout en entiers 8 bits), mais c'est un plafond. En V2 : DaisySP (Daisy), Teensy Audio Library
  (Teensy), ou un moteur maison en float sur ESP32-S3.

### C5. Vendre un objet (rappel, hors son)

Marquage **CE** (et FCC pour les USA) obligatoire avec Wi-Fi/BLE et alim secteur : privilégier des
**modules radio pré-certifiés** (ESP32-S3-WROOM) et une **alim externe certifiée**. Licences : DaisySP
est open source (vérifier la licence exacte de chaque module), Teensy est propriétaire mais
utilisable commercialement — **à vérifier précisément avant de choisir**.

---

## D. Mapping GoL → son (ce que la meilleure qualité rend possible)

1. **Âge → filtre** : cellule jeune = filtre fermé (son doux), mûre = filtre ouvert (brillant). Plus
   expressif que l'actuel AGE SON (volume / harmonique).
2. **Voisins → percussion échantillonnée** : une cellule qui naît avec 3 voisins déclenche une
   variation (ghost snare, rimshot) ; densité de la colonne → probabilité de « fill » de la BOOM.
3. **Mort d'une cellule → note fantôme** très douce (écho de la vie qui s'éteint), possible sans
   saturer grâce au limiteur et au mixage 16 bits.
4. **Densité globale → ouverture de la reverb** (grille vide = espace, grille pleine = sec et serré).

---

## E. Retranscription dans le simulateur Python (`simulator/sim.py`)

Le simulateur produit déjà des `.wav` : on peut **écouter avant de flasher**.

- Simuler le DAC 8 bits : `y8 = np.round(y * 127) / 127` → entendre le grain actuel.
- Comparer avec dither TPDF : `y8 = np.round(y * 127 + np.random.rand(n) - np.random.rand(n)) / 127`.
- Tester un kit d'échantillons : charger des `.wav`, rééchantillonner à 16 384 Hz, quantifier en 8 bits
  → exactement ce que jouera `Sample` de Mozzi.
- Prototyper la V2 : même code en float 32 bits sans quantification = référence « qualité codec ».

```python
def to_8bit(y, dither=True):
    """Quantize a float signal (-1..1) like the ESP32 DAC, optionally with TPDF dither."""
    noise = (np.random.rand(len(y)) - np.random.rand(len(y))) if dither else 0
    return np.clip(np.round(y * 127 + noise), -128, 127) / 127
```

---

## Synthèse

| Aspect | Faisable ? | Effort | Notes |
|---|---|---|---|
| V1 : pont diviseur + condo de reconstruction + condos de sortie casque | ✅ | Faible (soudure) | plus gros gain immédiat ; graves au casque |
| V1 : dither + noise shaping en sortie | ✅ | Faible | < 1 % CPU |
| V1 : percussions échantillonnées (`Sample`) | ✅ | Moyen | vrai son de batterie ; droits des échantillons |
| V1 : band-limited + filtre résonant | ✅ | Moyen | caractère synthé, moins de métallique |
| V1 : sortie PDM | ⚠️ | Moyen | mono, non testé, conflit I²S possible |
| V1 : supprimer souffle et sifflements | ❌ | — | limites 8 bits + alim partagée + TDA |
| Simulation Python (8 bits, dither, échantillons) | ✅ | Faible | écouter avant de flasher |
| V2 : ESP32-S3 + WM8960 / PCM5102A | ✅ | Moyen | le moins cher, continuité |
| V2 : Teensy 4.1 + SGTL5000 | ✅ | Moyen | bibliothèque audio très riche, 16 bits |
| V2 : Daisy Seed (son) + ESP32-S3 (LEDs/UI) | ✅ | Élevé | qualité la plus « pro », alims séparées |

## Prochaines étapes proposées

1. **Souder** le pont diviseur + 10 nF + condos casque (fiche à ajouter à l'artifact « Code couleur résistances »).
2. **Coder** dither + noise shaping (petit, mesurable à l'oreille).
3. **Kit de percussions échantillonnées** CC0 (choisir la source des sons avec Felix).
4. Lancer le **CDC V2** (`/project-spec`) en partant de l'architecture C3 et de la liste des problèmes de la V1.

### Non vérifié dans cette analyse
- Rendu réel de la sortie PDM de Mozzi sur ESP32 ; conflit exact avec FastLED dans `env:ui_test`.
- Liste exacte des modules de percussions de DaisySP et leurs licences.
- Prix actuels (indicatifs, sources BoardWatch / revendeurs, novembre 2026).
