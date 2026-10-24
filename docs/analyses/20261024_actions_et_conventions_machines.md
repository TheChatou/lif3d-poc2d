# LIF2D — Vue globale des actions + conventions des machines existantes

> 2026-10-24 — Complète `20261024_ui_grammaire_controles.md` (inventaire des gestes).
> But : voir **tout ce que la boîte peut faire**, classé par importance, et **comment les autres
> machines assignent leurs boutons**, avant de figer la grammaire de LIF2D.

---

## Partie A — Toutes les actions possibles, classées par importance

Niveaux :
- **S** = on y touche en permanence pendant l'écoute → doit être **un geste direct**, sans menu
- **A** = au moins une fois par session → **1 geste + 1 niveau** maximum
- **B** = parfois → menu
- **C** = réglage "installation", presque jamais → fond de menu

💡 = idée nouvelle proposée, à garder ou jeter.

### A.1 Transport & vie de la grille

| Action | Niveau | Remarque |
|---|---|---|
| Play / Pause | **S** | ✅ décidé : clic ▶ |
| Nouvelle graine (grille aléatoire) | **S/A** | le "shuffle" de la boîte — très fréquent si une évolution meurt |
| Effacer la grille (page blanche) | **B — DRAW uniquement** | ✔ Felix : une page blanche ne sert qu'à dessiner. En GOL, la grille de départ vient soit d'une graine générée par les paramètres, soit d'un preset déjà dessiné → en DRAW : appui long ▶ avec barre de remplissage |
| Loop / rythme d'évolution | **A** | ✔ Felix : existe déjà dans les réglages du simulateur web → ce n'est pas une action "geler" à part, mais un **groupe de réglages** : <br>• **évolution** à chaque temps ↔ tous les N temps ↔ à chaque balayage complet (16 temps) <br>• **loop** on/off : rejouer en boucle les N dernières générations (×2 / ×4 / ×8 mesures, cyclique ou aller-retour) <br>Important et assez fréquent → candidat pour un **raccourci** (ex : ▶ maintenu + molette = loop on/off ou durée) |
| Muter un peu (ajouter des cellules au hasard) | **C — DRAW uniquement** | ✔ Felix : seulement en mode dessin, rare → fond du menu de DRAW ou SET GOL |
| ~~Annuler (génération précédente)~~ | — | ✔ Felix : "mouai" → **écarté** pour la Beta 1, à garder dans le backlog. Le loop couvre en partie ce besoin (rejouer ce qu'on vient d'entendre) |

### A.2 Son

| Action | Niveau | Remarque |
|---|---|---|
| Volume | **S** | ✅ décidé : rotation molette droite en live |
| BPM | A | |
| 💡 Tap tempo (taper le rythme sur un bouton) | B | convention très répandue sur les machines à rythme |
| Gamme | A | 6 gammes |
| Tonalité (note de base) | B | 12 notes |
| Octave | B | 1–5 |
| Timbre | A | presets Mozzi |
| Boîte à rythme on/off / pattern | A | forme encore à définir |
| Mute total (lumière seule) | — | ✅ couvert par volume 0 |
| MIDI on/off, canal | C | |

### A.3 Lumière & GoL

| Action | Niveau | Remarque |
|---|---|---|
| Luminosité | **S** | ✅ décidé : rotation molette gauche en live |
| Règle GoL (B6/S567, B3S23…) | A | change beaucoup le caractère |
| Palette de couleurs | B | |
| Placer une forme (glider, blinker…) | B | |
| Mode Dessin (placer/effacer à la main) | A | le côté "ardoise magique" |
| Densité de la graine aléatoire | C | |
| Vitesse GoL vs BPM (1 ou ½ mesure par génération) | C | |

### A.4 Presets & système

| Action | Niveau | Remarque |
|---|---|---|
| Charger un preset | A | |
| Sauver un preset | A | |
| Nommer un preset | B | 4 caractères (police 3×5) |
| Supprimer un preset | C | destructif → confirmation |
| Délai de retour automatique au live | C | |
| Reset usine | C | caché |
| Mode diagnostic (test LEDs, encodeurs, son) | C | caché, utile au montage/SAV |

**Bilan** : seulement **3 actions S** (play/pause ✅, volume ✅, luminosité ✅) et peut-être **nouvelle graine**.
Il reste environ **10 actions A** à rendre accessibles en un geste + un niveau, et tout le reste dans le menu.

---

## Partie B — Comment font les autres machines

| Machine | Contrôles | Ce qui fait convention |
|---|---|---|
| **monome norns** | 3 encodeurs + 3 boutons | **2 couches** : jeu / menu, on bascule par un tap court sur K1. Dans le menu : **K3 = avancer/valider, K2 = retour**, un encodeur fait défiler. Dans les scripts : **un encodeur choisit, l'autre règle** la valeur. K1 maintenu = **ALT** (modificateur) |
| **Synthstrom Deluge** | grille 16×8 + 2 encodeurs + SHIFT | **SHIFT + rotation = pas ×5** (rapide). "Sticky shift" (tap = verrouille). Critiqué pour trop de combinaisons cachées — un contre-exemple utile |
| **Elektron (Digitakt…)** | encodeurs cliquables + FUNC | **appuyer en tournant = réglage grossier/fin**. **FUNC + rotation = fonction alternative**. Plainte récurrente : un clic enregistre souvent un micro-cran de rotation parasite |
| **Modules Eurorack à 1 encodeur** (ex : Ladik D-425) et frameworks embarqués (LVGL) | 1 encodeur cliquable | **clic court = entrer/valider, tourner = changer, appui long = retour/sortir** ou menu système |
| **Teenage Engineering OP-1** (connu) | 4 encodeurs de couleur + SHIFT | **chaque encodeur a une couleur, et le paramètre à l'écran porte la même couleur** : on sait sans lire quelle molette règle quoi. SHIFT + encodeur = second paramètre |
| **Korg Volca / Pocket Operators** (connus) | boutons + FUNC | **maintenir FUNC + autre bouton** = action secondaire. Peu de profondeur, tout tient sur la façade |

### Les conventions qu'on retrouve presque partout

1. **Deux couches** : une couche *jeu* (on joue) et une couche *menu* (on règle), avec **un geste simple et toujours le même** pour passer de l'une à l'autre.
2. **Clic court = entrer/valider, appui long = retour/sortir.**
3. **Un encodeur choisit (quoi), l'autre règle (combien).**
4. **Maintenir un bouton + tourner = fonction alternative** (SHIFT, FUNC, ALT).
5. **Appuyer en tournant = pas grossier/fin.**
6. **Code couleur encodeur ↔ écran** (OP-1).
7. **Maintenir un bouton + appuyer sur l'autre** = action secondaire.
8. ⚠️ **Ignorer les crans de rotation pendant un clic** (défaut connu chez Elektron).
9. ⚠️ **Peu de combinaisons cachées** : le Deluge montre qu'au-delà de quelques-unes, personne ne s'en souvient.

---

## Partie C — Ce que ça suggère pour LIF2D (propositions, rien n'est décidé)

En gardant les décisions déjà prises (live : A = luminosité, B = volume, ▶ = play/pause) :

| Geste | Proposition | Convention suivie |
|---|---|---|
| Clic court A | ouvre le **menu Visuel/GoL** (pages en couleur chaude) | 1, 6 — la molette de la lumière ouvre les réglages lumière |
| Clic court B | ouvre le **menu Son** (pages en couleur froide) | 1, 6 — la molette du son ouvre les réglages son |
| Dans un menu : rotation A | change de **page/réglage** (balayage horizontal) | 3 |
| Dans un menu : rotation B | change la **valeur** (barre de 14 crans) | 3 |
| Appui long A ou B | **retour** d'un niveau, puis au live | 2 |
| Appuyer + tourner | **pas fin** (ex : BPM ±1 au lieu de ±5) | 5 |
| Maintenir ▶ + tourner A/B | **SHIFT** : raccourcis vers 2 actions A (ex : BPM, règle GoL) | 4 — ▶ est le seul bouton central, c'est le SHIFT naturel |
| Appui long ▶ | **nouvelle graine** (avec barre de remplissage pendant l'appui) | — |
| A + B cliqués ensemble | **Presets** | 7 |
| A + B + ▶ au démarrage | mode **diagnostic** | caché |

⚠️ **Piège du ▶ utilisé comme SHIFT** : si on maintient ▶ pour tourner une molette, son relâchement **ne doit pas** faire play/pause. Règle classique : ▶ déclenche play/pause **au relâchement**, et seulement si aucune molette n'a bougé pendant l'appui.

⚠️ **Appui long ▶ vs SHIFT** : les deux usages se distinguent par la rotation. Molette tournée pendant l'appui = SHIFT, pas de graine. Aucune rotation et ≥ 1 s = graine.

➡️ **Suite** (architecture par écrans, hub, coût en gestes, maquettes 16×16) : `20261024_ecrans_maquettes_16x16.md`

### Questions pour trancher

1. Le partage **gauche = visuel / droite = son** jusque dans les menus te parle-t-il ?
2. ▶ en **SHIFT** : bonne idée, ou on garde ▶ sacré (play/pause seulement) ?
3. Dans les actions 💡 (geler, muter, annuler, tap tempo), lesquelles veux-tu garder ?
4. Nouvelle graine : niveau **S** (geste direct) ou **A** ?

---

Sources :
[monome norns — play](https://monome.org/docs/norns/play) ·
[norns legend (PDF)](https://monome.org/docs/norns/norns-legend.pdf) ·
[rudiments (script norns, K1 = ALT)](https://github.com/entzmingerc/rudiments) ·
[Deluge firmware release notes](https://github-wiki-see.page/m/SynthstromAudible/DelugeFirmware/wiki/Release-Notes) ·
[Critique de l'interface du Deluge (GMU)](https://people.cs.gmu.edu/~sean/projects/synth/deluge.html) ·
[Forum Synthstrom — placement shift/encodeur](https://forums.synthstrom.com/discussion/comment/23501) ·
[LVGL — navigation à l'encodeur](https://docs.lvgl.io/9.5/main-modules/indev/encoder.html) ·
[Ladik D-425 (ModularGrid)](https://modulargrid.net/e/ladik-d-425-3-track-seq) ·
[Mod Duo — clic encodeur](https://forum.mod.audio/t/encoder-click-function/5487) ·
[Bonedo — test Digitakt](https://www.bonedo.de/artikel/elektron-digitakt-test/2/) ·
[Elektronauts — encodeurs Machinedrum](https://www.elektronauts.com/t/machinedrum-encoder-question/208293)
