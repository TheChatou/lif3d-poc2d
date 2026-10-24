# Impression 3D — grilles fines et acoustique

## Filament vs largeur de trace (ligne imprimée)

**Définition** : le filament (1.75mm ou 2.85mm) est la matière première solide qui entre dans l'imprimante. La largeur de trace (souvent 0.4mm) est ce qui sort réellement de la buse et forme tes parois — c'est une dimension complètement différente, fixée par le diamètre de la buse, pas par le filament.

**Analogie** : le filament c'est la pâte à modeler en boudin qu'on fait fondre ; la buse c'est le tube à travers lequel elle ressort, façonnée à sa taille. Peu importe l'épaisseur du boudin de départ, ce qui sort du tube a toujours la même largeur.

**Exemple concret LIF2D** : pour un maillage fin sur le trou du HP, penser en trace de buse (~0.4mm mini pour une buse 0.4mm standard) et non en diamètre de filament (1.75mm). En dessous de ~0.35-0.4mm de largeur de trace, l'extrusion devient peu fiable (bourrage, trace discontinue).

**Piège à éviter** : demander une paroi "de la taille du fil" (1.75mm) en pensant à une ligne fine — c'est l'inverse de ce qu'on veut, et ce n'est de toute façon pas la bonne grandeur de référence.

## Pont (bridging) et portée libre

**Définition** : un "pont" est une trace imprimée dans le vide, sans matière en dessous pour la soutenir pendant l'impression. Chaque brin d'un maillage suspendu au-dessus d'un trou est un mini-pont.

**Analogie** : comme tendre un fil de pêche entre deux poteaux — sur une courte distance il reste tendu et droit, sur une trop grande distance il s'affaisse au milieu.

**Exemple concret LIF2D** : un maillage croisé avec des mailles de 1-2mm d'espacement est très sûr à imprimer (chaque brin ne "pontee" que 1-2mm). Une seule grande ouverture de 10mm+ sans aucun support intermédiaire est plus risquée en filament rigide, gérable en réglant bien le refroidissement.

**Piège à éviter** : vouloir un maillage ultra-fin ET très espacé en même temps — c'est l'espacement (portée du pont), pas la finesse du brin, qui détermine le risque d'affaissement.

## Transparence acoustique d'une grille perforée

**Définition** : ce qui détermine si une grille bloque le son n'est (quasiment) pas la taille des trous individuels, mais le **taux d'ouverture global** (% de surface vide / surface totale). Le son a des longueurs d'onde énormes comparées à des trous de quelques mm — il diffracte facilement à travers, contrairement à la lumière.

**Analogie** : essayer d'arrêter une vague avec un grillage à poule — les mailles sont minuscules comparées à la longueur de la vague, l'eau passe presque comme s'il n'y avait rien.

**Exemple concret LIF2D** : à 20kHz (l'aigu le plus extrême, quasi inaudible pour un adulte), la longueur d'onde fait ~17mm dans l'air — un trou de 1-2mm est 10× plus petit. Une grille avec 50-70% d'ouverture (fine ou grossière, peu importe la taille exacte des trous) a un impact acoustique quasi nul. C'est le principe du tissu acoustique des enceintes du commerce : mailles minuscules, quasi transparent au son.

**Piège à éviter** : penser qu'un maillage plus fin protège mieux le son de la "fuite" — non, le son n'a pas besoin de "fuir", il traverse déjà sans problème dès qu'il y a de l'ouverture. La finesse du maillage ne sert qu'à la protection anti-poussière/anti-doigts, pas au son.

## Grille imprimée vs tissu acoustique collé

Alternative pragmatique face au risque d'impression d'un maillage très fin : imprimer une grille plus grossière et robuste (ex: rayons + anneaux, cf. `docs/analyses/` du 2026-09-11) comme support structurel/esthétique, et coller un vrai tissu acoustique (type tissu noir d'enceinte du commerce) derrière, côté intérieur. Zéro risque d'impression, atténuation acoustique quasi nulle, protection poussière optimale.
