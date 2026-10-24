# Évaluation — carte ESP32-S3-Matrix (Waveshare/XYGStudy)

## Ce que c'est

Carte de dev 25×25mm autour d'un **ESP32-S3FH4R2** (dual-core LX7, 240MHz, 2Mo PSRAM, 4Mo Flash), avec une **matrice WS2812B 8×8 (64 LEDs) intégrée sur la carte**, USB-C natif, capteur IMU QMI8658C, 17 GPIO sortis, et une broche **Dout** dédiée pour chaîner une matrice externe plus grande.

C'est le board **ESP32-S3-Matrix** de Waveshare (référencé aussi sous le nom XYGStudy sur Amazon). Doc officielle : docs.waveshare.com/ESP32-S3-Matrix.

## Existe-t-il en 16×16 ?

**Non, pas cette carte-là.** La matrice embarquée est fixe en 8×8 (64 LEDs), il n'y a pas de variante "ESP32-S3-Matrix 16×16" du même produit.

Deux options si tu veux du 16×16 :
1. **Utiliser la broche Dout** de cette carte 8×8 pour chaîner une matrice WS2812B externe 16×16 — la carte devient juste le contrôleur, la matrice embarquée reste allumée en plus (ou peut être ignorée dans le code).
2. Il existe un produit différent, le **ESP32-S3-RGB-Matrix** (même famille Waveshare), qui est un driver pour panneaux **HUB75** (pas WS2812B) — pensé pour piloter de grands panneaux LED (32×32, 64×64...) via interface parallèle, pas pour une matrice WS2812B chaînée en série.

## Ce que j'en pense, dans le contexte LIF2D

**Intéressant comme objet, mais pas un remplacement direct pour Beta1** — un point bloquant à connaître avant tout achat :

- ⚠️ **L'ESP32-S3 n'a pas de DAC matériel** (contrairement à ton ESP32-WROOM-32D actuel qui a 2 DAC 8-bit sur GPIO25/26). Toute ta chaîne audio Mozzi → PAM8403 repose sur ces DAC. Sur S3, il faudrait passer en sortie **I2S** (comme le MAX98357A déjà réservé pour LIF3D) plutôt qu'en DAC direct — donc changer d'ampli ou ajouter un DAC I2S externe. Ce n'est pas un détail : ça touche `config.h`, `audio.cpp`, et le choix du PAM8403 lui-même.
- Le form factor 25×25mm + matrice embarquée 8×8 est pensé pour des mini-projets autonomes (breloques, badges, effets lumineux), pas pour piloter une matrice externe 16×16 en façade + gérer 2 encodeurs + audio stéréo — c'est faisable via le Dout et les 17 GPIO, mais tu perds l'avantage "tout intégré" du board (la matrice embarquée devient inutile pour ton usage).
- Le PSRAM 2Mo + dual-core 240MHz est un vrai plus par rapport au WROOM-32D si tu voulais un jour faire des effets/animations plus lourds — mais pour un GoL 16×16 + séquenceur simple, ton WROOM-32D actuel n'est pas le facteur limitant.

**Verdict** : sympa comme board à avoir sous la main pour prototyper vite un effet lumineux 8×8 autonome (USB-C, alim simple, matrice déjà soudée), mais pas un candidat pour remplacer ton ESP32-WROOM-32D sur LIF2D Beta1 sans repenser la chaîne audio DAC→I2S. À garder en tête pour LIF3D si l'architecture audio évolue vers I2S de toute façon (tu as déjà le MAX98357A réservé).
