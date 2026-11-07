# LIF2D V2 — dossier de préparation

> Ouvert le 2026-11-07. Objectif : passer d'un prototype d'apprentissage (V1 / Beta 1) à un
> **objet vendable** : un séquenceur génératif « Jeu de la Vie » à la qualité sonore d'un synthé
> quasi pro, beau, fiable et fabricable en petite série.

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| [`problemes_v1.md`](problemes_v1.md) | Tout ce qui a coincé sur la V1 (son, alim, câblage, firmware, UX, process) → la V2 doit l'éviter **par conception** |
| [`architecture.md`](architecture.md) | Options matérielles et logicielles comparées, architecture recommandée, questions ouvertes |
| [`plan.md`](plan.md) | Feuille de route par phases, de l'étude au prototype puis à la petite série |

Recherches détaillées (sources, chiffres) : [`../analyses/20261107_audio_8bits_v1_et_v2.md`](../analyses/20261107_audio_8bits_v1_et_v2.md).

## Vision en une phrase

**La vie génère la musique** : une grille de cellules vivantes, lisible d'un coup d'œil, qui joue
un son riche et propre — au casque comme sur ses haut-parleurs — et qu'on pilote avec deux grosses
molettes, sans écran ni appli obligatoire.

## Ce que la V1 a déjà validé (à garder)

- Le concept : GoL → notes (axe Y = hauteur, balayage X = temps), gammes, âge des cellules → son/couleur.
- L'interface « ardoise magique » : 2 encodeurs cliquables + ▶, menus sur la matrice 16×16
  (grammaire de gestes : `docs/analyses/20261024_ui_grammaire_controles.md`).
- Arpégiateur façon Ableton (STYLE / RATE / GATE / SWING / ACCORD / POMPE / REPETE), BOOM 8 pistes × 32 pas,
  presets en flash (NVS), extras visuels (TRIP / BRICK / PONG).
- Alim secteur intégrée (LRS-75-5) + embase IEC avec fusible et interrupteur.

## Décisions à prendre en premier (voir `architecture.md` §5)

1. Un cerveau ou deux ? (Daisy Seed son + ESP32-S3 interface, vs Teensy 4.1 seul, vs ESP32-S3 + codec)
2. Taille de la matrice (16×16 conservé ? 32×32 ? LEDs plus petites et plus denses ?)
3. Sorties : casque + HP intégrés + ligne ? MIDI IN/OUT (TRS) ? USB-MIDI ?
4. Budget cible de fabrication et prix de vente visé.
