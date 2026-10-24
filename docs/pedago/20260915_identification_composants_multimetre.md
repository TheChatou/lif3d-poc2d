# Identifier les pattes d'un composant sans datasheet — méthode multimètre

> Session du 2026-09-15 — utile à chaque fois qu'un composant (encodeur, bouton, jack...) est acheté sans référence exacte connue.

## Principe général

Un interrupteur mécanique (bouton, switch d'encodeur) **n'a pas de polarité** : c'est juste 2 morceaux de métal qui se touchent ou pas. Peu importe lequel tu câbles sur GND et lequel sur le GPIO — le résultat est identique. Le vrai travail, c'est d'identifier **quelles pattes appartiennent à quelle fonction** sur un composant à plusieurs pattes non documenté.

Outil : multimètre en mode **continuité** (symbole 🔊 ou "bip"), composant **non alimenté**.

## Encodeur rotatif EC11 (potentiellement 5 à 9 pattes)

Un EC11 combine 2 mécanismes indépendants : la partie rotative (quadrature A/B/C) et le bouton-poussoir intégré (S1/S2). Certains modèles ajoutent une LED (2 pattes de plus, voire plus si RGB).

1. **Partie rotative** : sonde 2 pattes du groupe "rotatif" (3 pattes), tourne lentement le bouton. Les paires qui bipent par intermittence pendant la rotation appartiennent au rotatif. La patte qui bipe avec **les deux autres** à tour de rôle est le **commun (C)** ; les 2 autres sont **A** et **B** (le sens A/B est arbitraire, ajustable en firmware si la rotation est perçue à l'envers).
2. **Switch intégré** : sonde les pattes restantes en appuyant sur le bouton (sans tourner). Celles qui bipent **seulement pendant l'appui** sont **S1/S2** — sans polarité, une au GPIO, l'autre au GND.
3. **LED (si présente)** : les pattes restantes ne bipent jamais avec les autres groupes. Passe en mode diode (souvent superposé au mode continuité) : un sens affiche une petite tension (LED faiblement allumée) = c'est le sens passant (anode → côté +), l'autre sens n'affiche rien.

## Bouton-poussoir à 4 pattes

Les boutons tactiles/poussoirs à 4 pattes sont en réalité un switch à 2 contacts, **dédoublés en 2 paires** — électriquement ça reste un simple ouvert/fermé, les 4 pattes ne sont là que pour deux raisons mécaniques :
- **Tenue mécanique** : la force de chaque appui se répartit sur 4 points de soudure au lieu de 2, moins de risque qu'une patte se fissure à l'usage.
- **Montage symétrique** : chaque paire étant dupliquée en diagonale, le bouton peut se souder dans un sens ou dans l'autre (tourné à 180°) sans que ça change son fonctionnement — pas de détrompeur nécessaire.

Méthode d'identification au multimètre :
1. Sans appuyer : teste les 6 combinaisons possibles entre les 4 pattes. Tu dois trouver **2 paires déjà en continuité en permanence** (les 2 moitiés du switch, dédoublées).
2. En appuyant : une patte de la 1ère paire doit maintenant biper avec une patte de la 2e paire.
3. Câblage : prends **une patte de chaque paire** (peu importe laquelle) → une vers le GPIO, l'autre vers GND. Les 2 pattes restantes sont redondantes, laissables en l'air.

## Pourquoi ça marche même sans datasheet

Cette méthode ne dépend d'aucune référence composant — elle exploite juste le comportement électrique (continuité qui apparaît/disparaît selon l'action mécanique). Applicable à n'importe quel bouton, encodeur, ou switch dont le pinout exact est inconnu ou introuvable en ligne.
