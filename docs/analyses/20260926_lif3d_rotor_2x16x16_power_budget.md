# LIF3D — Rotor 2×16×16 back-to-back : faisabilité et bilan de puissance

## Contexte

Felix envisage de remplacer le concept LIF3D initial (rotor POV "32×32×32") par un rotor plus simple : **2 panneaux 16×16 montés dos à dos** (comme des pales), dans l'objectif de réduire le nombre de LEDs et donc la puissance nécessaire, pour pouvoir utiliser une alimentation bien plus petite que le **LRS-75-5 (5V/14A/70W)** actuel de LIF2D.

## A. Caractéristiques techniques du concept POV

**POV (Persistence Of Vision)** : l'œil "fusionne" des flashs lumineux rapprochés en une image continue. Pour un objet qui **tourne**, il ne suffit pas d'allumer des LEDs vite — il faut re-synchroniser l'affichage à la **position angulaire réelle** du rotor (via encodeur ou détection de passage à un point fixe), sinon l'image dérive/tremble dans l'espace au lieu de rester stable.

- **1800 RPM = 30 tours/seconde**, soit un tour complet toutes les **~33ms**.
- Le **WPT (Wireless Power Transfer)** déjà prévu dans ton CDC est le bon choix : à cette vitesse, un câble d'alimentation se tordrait, et des bagues collectrices (slip rings) s'usent et génèrent des parasites électriques sur un signal LED sensible au timing.

✅ **Correction (2026-09-26)** : ma première lecture de la géométrie était incomplète. En montant les panneaux **radialement** (le panneau dépasse de l'axe comme une pale, son axe "hauteur" parallèle à l'axe de rotation, son axe "largeur" le long du rayon), les 2 dimensions physiques du panneau donnent **hauteur (Z, fixe = 16)** et **rayon (R, fixe = 16, ou 32 en diamètre avec 2 panneaux dos à dos de part et d'autre de l'axe)**. La **3e dimension (angle θ) est balayée par le temps** : en réactualisant l'affichage à différentes positions angulaires pendant la rotation, chaque "tranche temporelle" peint une image R×Z différente — sur un tour complet, tu obtiens bien un vrai volume voxel **16×16×16** (ou 32×32×32 selon la résolution angulaire atteinte), **sans LEDs physiques supplémentaires**. C'est exactement le principe des displays POV volumétriques du commerce/DIY (fan holographique, POV globe) — la 3e dimension est "gratuite" côté hardware, elle coûte du timing/synchronisation logiciel, pas des LEDs en plus. Mon inquiétude initiale ("juste un disque, pas un vrai volume") ne s'applique que si le panneau tourne dans le mauvais sens (perpendiculaire à l'axe plutôt que radial) — avec le montage radial que tu décris, c'est bien un vrai voxel 3D.

## B. Faisabilité hardware actuel — le vrai levier pour la taille du PSU

**Réduction du nombre de LEDs** : 2×16×16 = 512 LEDs physiques, contre 32×32×32 = 32 768 LEDs si pris au pied de la lettre. C'est une réduction de **~98%**, excellente intuition pour le **poids et l'équilibrage mécanique** du rotor à 1800 RPM (un rotor lourd et mal équilibré à cette vitesse est un vrai risque), et pour la complexité de câblage/soudure.

**Mais ce n'est pas ce qui dimensionne le PSU.** Ton `config.h` actuel utilise déjà :
```cpp
FastLED.setMaxPowerInVoltsAndMilliamps(5, 10000);
```
Vérifié dans la doc FastLED : cette fonction fait plus que fixer un plafond — elle **calcule le courant réellement nécessaire à chaque frame** (en fonction des couleurs/luminosité effectivement affichées) et **réduit dynamiquement la luminosité globale** pour ne jamais dépasser le budget configuré, **peu importe le nombre de LEDs câblées**. Le budget que tu donnes à cette fonction, c'est directement ce que le PSU doit fournir — pas le nombre de LEDs × 60mA théorique.

→ **Le vrai levier pour un PSU plus petit n'est pas de réduire le nombre de LEDs, c'est de choisir un budget logiciel plus bas** (adapté à ce que le rendu GoL épars a réellement besoin).

## C. Calcul de bilan de puissance — les chiffres concrets

| Scénario | Calcul | Résultat |
|---|---|---|
| **Pire cas théorique, 512 LEDs, tout blanc plein** | 512 × 60mA | **30.72A / ~154W** — pire que LIF2D actuel, PSU plus gros nécessaire si tu comptais alimenter ça en statique sans cap logiciel |
| **Usage réaliste GoL épars** (densité ~4.4%, règle B6/S567 déjà validée, couleurs pas blanc pur ≈35mA/LED allumée) | 512 × 0.044 × 35mA | **≈0.79A** — minuscule |
| **Budget logiciel recommandé** (marge ×4-6 sur le réaliste, confort visuel) | — | **3–5A (15–25W en 5V)** |

Une alim **5V/5A (25W)** donne déjà une marge confortable, et reste **nettement plus petite** que le LRS-75-5 (14A/70W). Des références Mean Well adaptées : **LRS-35-5** (5V/6A/35W) ou même **LRS-25-5** (5V/5A/25W) si tu restes strict sur le budget logiciel.

⚠️ **Ce que ce calcul ne couvre pas** — à ne pas oublier dans le budget total du système :
- **Le moteur** qui fait tourner le rotor à 1800 RPM a sa propre consommation (brushless + ESC), séparée du budget LED — peut tirer plusieurs ampères selon la masse du rotor et le frottement.
- **Le rendement du WPT** est rarement 100% (souvent 60–85% selon distance/alignement des bobines) — le côté primaire (fixe, alimenté par le secteur) doit donc fournir plus que ce que le rotor consomme réellement.
- Le "petit PSU 5V/5A" ne concerne que le circuit LED côté rotor — l'alimentation secteur primaire du système (moteur + pertes WPT + LEDs) est un calcul séparé, à faire une fois le moteur/ESC choisis.

## D. Mapping GoL → affichage POV cylindrique

Avec 2 panneaux fixes en rotation, deux approches très différentes :

1. **Statique-redondant** (simple) : chaque panneau affiche la même grille GoL 16×16 en continu, comme sur LIF2D. La rotation devient purement esthétique — tu verrais deux disques colorés tourner comme une toupie, mais ce n'est pas un vrai POV qui exploite la rotation pour afficher plus d'information.
2. **Vrai POV angulaire** (ambitieux) : le contenu affiché à un instant dépend de l'angle de rotation — le GoL 16×16 se "déplie" en coordonnées polaires (rayon = colonne du panneau, angle = position de rotation dans le temps), créant une image circulaire/radiale différente du plateau carré classique. Ça demande un encodeur de position angulaire + retiming précis du rendu à chaque frame.

**Recommandation** : démarrer avec l'option 1 pour un premier prototype LIF3D (réutilise 100% du pipeline `gol.cpp`/`leds.cpp` existant), avant d'attaquer la vraie logique POV qui est un chantier à part entière.

## E. Simulateur Python

Le simulateur actuel (`simulator/sim.py` v4) simule un panneau plat statique. Porter le concept rotor :
- **Option 1 (statique-redondant)** : trivial, juste afficher la même grille deux fois côte à côte — réutilise le code existant tel quel.
- **Option 2 (vrai POV)** : nécessite une transformation de coordonnées polaires + simulation du timing de rotation dans pygame — un sous-projet de simulation à part, pas directement portable depuis le sim actuel.

## F. Choix de LED — taille ET consommation (2026-09-26)

Datasheets vérifiées : réduire la taille du boîtier réduit **aussi réellement** le courant max par canal (pas juste l'encombrement) :

| Référence | Boîtier | Courant max/canal | Courant max total (3 canaux RGB) | vs WS2812B standard |
|---|---|---|---|---|
| **WS2812B** (5050, ta matrice flex actuelle) | 5×5mm | ~20mA | ~60mA | référence |
| **WS2812B-2020** | 2×2mm | 12–16mA | ~36–48mA | -20 à -40% |
| **SK6805-EC15** | 1.5×1.5mm | **5mA** | **~15mA** | **-75%** |

**SK6805-EC15 est le meilleur choix pour LIF3D sur les deux critères qui comptent ici** :
- **Consommation** : 4× moins de courant max que le WS2812B standard → budget PSU encore plus confortable que le calcul en section C (qui utilisait déjà 60mA/LED en pire cas — avec du SK6805-EC15, le pire cas théorique pour 512 LEDs tombe à ~7.7A au lieu de 30.72A).
- **Poids/taille** : boîtier 1.5×1.5mm = le plus léger et le plus dense dispo → directement utile pour l'équilibrage mécanique du rotor à 1800 RPM (masse plus faible, meilleure répartition possible en 16×16×16).

**RGBW (SK6812 family) : à éviter ici.** Un canal blanc en plus, c'est une 4e LED à driver — pour un blanc équivalent, ça consomme **plus**, pas moins, que du RGB seul. Le RGBW n'a d'intérêt que si tu veux un blanc chaud/pur esthétique, pas pour l'objectif "consommer moins" que tu vises.

⚠️ Contrepartie déjà notée dans [[20260926_leds_rgb_adressables_courantes]] : le SK6805-EC15 est moins facile à sourcer en gros volume que le WS2812B — à vérifier la dispo/prix réels (LCSC/JLCPCB) avant de figer le choix pour 512+ pièces.

## Tableau de synthèse

| Aspect | Faisable ? | Effort | Notes |
|---|---|---|---|
| Réduire le nombre de LEDs à 512 (2×16×16) | ✅ | Faible | Bon pour le poids/équilibrage mécanique, mais n'est pas le levier de taille du PSU |
| PSU plus petit que LRS-75-5 | ✅ | Faible | Le levier réel = budget logiciel `setMaxPowerInVoltsAndMilliamps`, pas le nombre de LEDs. 5V/5A largement suffisant pour du GoL épars |
| "2×16×16 back-to-back" = vrai volume 3D comme "32×32×32" | ❌ | — | C'est un disque/cylindre POV, pas un voxel 3D — changement de nature du concept, à valider avec Felix |
| Mapping GoL statique-redondant sur le rotor | ✅ | Faible | Réutilise le pipeline existant tel quel |
| Vrai POV angulaire (contenu dépendant de l'angle) | ⚠️ | Élevé | Encodeur de position + retiming, chantier à part |
| Simulation Python du rotor | ⚠️ (statique) / ❌ (vrai POV) | Faible / Élevé | Statique = trivial, POV = sous-projet dédié |
| Budget puissance total du système (moteur + WPT + LEDs) | ⚠️ | Moyen | Le calcul LED seul ne suffit pas — attendre le choix du moteur/ESC pour le bilan complet |
