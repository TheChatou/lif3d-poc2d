# Références mini/micro LEDs adressables — pour matrice/board custom

## Contexte

Suite à l'évaluation de l'ESP32-S3-Matrix ([[20260926_esp32_s3_matrix_evaluation]]) : Felix veut la référence des mini LEDs utilisées sur ce type de board, en vue de concevoir sa propre matrice/PCB (il a déjà un dossier `kiCad/` dans le repo).

⚠️ Je n'ai pas trouvé de confirmation officielle du part number exact utilisé par Waveshare sur l'ESP32-S3-Matrix — leur doc mentionne juste "WS2812B" générique, pas le boîtier précis. Le board fait 25×25mm pour 64 LEDs (8×8), soit un pitch d'environ **2.7mm** en tenant compte des marges — cohérent avec les boîtiers ci-dessous.

## Références mini/micro WS2812B-compatibles (protocole 1 fil, 800kHz)

| Référence | Boîtier | Taille | Pitch mini viable | Notes |
|---|---|---|---|---|
| **WS2812B-2020** | SMD 2020 | 2.0×2.0mm | ~2.5–3mm | Le plus courant en "mini WS2812", bonne dispo, protocole identique à ta matrice flex 16×16 actuelle |
| **SK6805-EC15** | SMD 1515 | 1.5×1.5mm | ~2mm | Le plus petit du marché, probablement ce qui se rapproche le plus du pitch 2.7mm de l'ESP32-S3-Matrix |
| **SK6812MINI-E** | SMD 3535 | 3.5×3.5mm | ~4mm | Intermédiaire, existe aussi en RGBW |
| **GS8208** | variable | ~5050 ou mini | ~3mm+ | Alternative WS2812B avec meilleure intégrité de signal, moins courant en petit boîtier |

Toutes utilisent le même protocole que ta matrice flex WS2812B 16×16 actuelle (déjà géré par FastLED dans `leds.cpp`) — **aucun changement de logique GoL→LED nécessaire**, seulement le footprint PCB change.

## Points pratiques si tu conçois ta propre matrice

- **Pitch < 2.5mm** = soudage à la main très difficile (2020/1515) → prévoir stencil + four à refusion, ou faire assembler par JLCPCB/PCBWay (ces réfs sont généralement dispo dans leur bibliothèque de composants, à vérifier référence LCSC exacte avant de figer le footprint KiCad).
- **Routage** : même logique serpentine que ta matrice actuelle (data-out d'une LED → data-in de la suivante), le mapping FastLED existant dans `leds.cpp` n'a pas à changer si tu gardes un câblage serpentine.
- **Consommation** : les mini LEDs (2020/1515) tirent généralement moins de courant max par canal que les WS2812B 5050 classiques (souvent ~12-16mA/canal vs ~20mA/canal) — si tu changes de composant, il faudra refaire un bilan de puissance rapide (cf. [[20260612_bilan_puissance]] déjà fait pour ta matrice flex en stock) plutôt que de réutiliser tel quel les chiffres actuels.
- **Data 3.3V→5V** : même remarque que dans ton CLAUDE.md pour la matrice actuelle, la résistance série ~300Ω sur DATA reste une bonne pratique même si ces boîtiers tolèrent généralement bien un signal 3.3V.

## Mise à jour — projets trouvés par Felix (2026-09-26)

### 1. github.com/Nerdiyde/ESP32_Neomatrix_GIF_display

C'est un **repo firmware**, pas un design PCB : un sketch Arduino qui affiche des GIFs sur une matrice "8×8 à 32×32 neopixel aka WS2812/SK6812/SK6805". Il gère ces 3 puces de façon générique (librairie), il ne dit pas laquelle est utilisée sur une board précise — normal, ce n'est pas son rôle.

### 2. pcbway.com — pxlBlck_16x16micro v1.2 (40×40mm, 16×16 pixels)

C'est le vrai design PCB, du même auteur (**Nerdiy.de**, alias GitHub Nerdiyde), dans sa famille de produits **pxlBlck**. Confirmé par la page PCBWay :
- **Pas de microcontrôleur sur la carte** — "a 40×40mm big 16×16 pixel LED matrix that can be driven by only one MCU GPIO". C'est une matrice pure, pilotée depuis un MCU externe (exactement ta situation actuelle avec ta matrice flex + ESP32 séparé).
- Pitch = 40mm / 16 = **2.5mm**.
- ⚠️ Référence LED exacte non confirmée avec certitude (je n'ai pas pu lire le fichier `1.1_top_bom.csv` fourni en téléchargement sur la page PCBWay — à télécharger toi-même sur la page du projet pour la certitude à 100%). Mais en croisant avec les autres boards de la même gamme Nerdiy :
  - `pxlBlck_10x11mini` → **SK6812**-based
  - `pxlBlck_ringMicro` → **SK6805** (60 LEDs)
  - Nerdiy semble suivre une convention "mini = SK6812" / "**micro = SK6805**" dans le nom de ses produits, donc le `16x16micro` est très probablement en **SK6805** (vu le pitch de 2.5mm, plausible : SK6805-EC15 1.5×1.5mm ou SK6805-2427 2.4×2.7mm — la BOM CSV tranchera).

### 3. Matrices micro toutes faites, à acheter

| Produit | Puce | Taille/pitch | MCU inclus ? | Où |
|---|---|---|---|---|
| **pxlBlck_16x16micro** (Nerdiy) | SK6805 probable | 40×40mm, pitch 2.5mm | ❌ Non — juste la matrice, à commander soi-même chez PCBWay via le lien "Share Project" | pcbway.com |
| **SK6805-2427 nano LED** (rouleau/composant seul) | SK6805-2427 | 2.4×2.7mm à l'unité | ❌ Composant brut, pas une matrice assemblée | ledlightinghut.com, witop-tech.com |
| **SuperLightingLED 16×16 SK6812 RGBW panel** | SK6812 (RGBW) | boîtier 5050, pitch classique ~10mm — **pas "micro"** | ❌ Non | superlightingled.com |
| **DFRobot Gravity Flexible 16×16** | WS2812B 5050 | pitch classique, flexible | ❌ Non | dfrobot.com — probablement très proche de ta matrice flex actuelle en stock |
| **Waveshare ESP32-S3-Matrix** (vu précédemment) | WS2812B générique | 8×8 seulement, pitch ~2.7mm | ✅ Oui (ESP32-S3 intégré) | waveshare.com |
| **M5Stack Atom Matrix** | WS2812B | 5×5 seulement, 24×24mm | ✅ Oui (ESP32-PICO intégré) | m5stack.com |

**Constat** : je n'ai trouvé **aucune matrice 16×16 en pitch "micro" (≤2.5mm) vendue toute assemblée avec microcontrôleur intégré**. Les seules combos "matrice + MCU" prêtes à l'emploi (Waveshare S3-Matrix, M5Stack Atom Matrix) sont limitées à 8×8 ou 5×5 — au-delà, tout le monde sépare MCU et matrice (comme toi actuellement), ou passe en HUB75 (protocole différent, pas WS2812B).

Pour du 16×16 en pitch micro, la voie réaliste est celle du pxlBlck_16x16micro : **faire fabriquer/assembler le PCB soi-même** (PCBWay/JLCPCB) et piloter avec ton propre ESP32 — ce qui correspond exactement à ta démarche "fabriquer ma propre matrice/board".

## Prochaine étape si tu veux avancer

Pas d'action prise ici (référence/recherche seulement). Si tu veux concrétiser une board custom, le skill `project-spec` peut structurer un CDC dédié (inventaire composants, bilan de puissance, validation compatibilité) avant de lancer le design KiCad.
