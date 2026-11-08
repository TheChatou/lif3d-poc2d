# LIF2D — Brief fonctionnel pour Claude Design
> Juin 2026 — Félix

---

## Le projet

**LIF3D** est un instrument de musique génératif autonome sous forme d'un cylindre rotatif 3D volumétrique — une sphère de lumière de 32×32×32 voxels tournant à 1800 RPM, pilotée par le **Jeu de la Vie de Conway en 3D**. Chaque cellule vivante joue une note. La musique se génère seule, organiquement, jamais identique.

**LIF2D est la Beta 1** : une version 2D de validation, à plat. Une matrice de LEDs 16×16 dans un boîtier physique steampunk, avec haut-parleurs intégrés et contrôleurs physiques (encodeurs rotatifs, potentiomètres, boutons).

**Le simulateur est la représentation logicielle quasi-fidèle de ce boîtier physique.** Il doit donner l'impression d'interagir avec la vraie machine — avec ses vraies LEDs, ses vrais haut-parleurs, ses vrais contrôleurs, leur vrais rapports de taille.

### Contrôleurs physiques de la vraie machine

La machine physique dispose de :
- 4 potentiomètres rotatifs
- 2 potentiomètres linéaires (sliders)
- 4 encodeurs rotatifs crantés (avec clic)
- 2 boutons poussoir
- 1 matrice LED WS2812B 16×16
- 2 haut-parleurs stéréo 28mm

---

## Fonctionnalités du simulateur

### Contrôle du séquenceur

- **Play / Pause**
- **Reset** — nouveau pattern aléatoire
- **Clear** — vide la grille
- **Save / Load** — sauvegarde et chargement de patterns
- **BPM** — tempo de 40 à 300 BPM
- **Luminosité** — simulation de la luminosité de la matrice LED (10–100%)

### Jeu de la Vie — règles d'évolution

7 règles disponibles, changeables en live :
- Conway B3/S23
- Coral B5/S45
- Dense B6/S567 *(recommandée — densité ~4%, idéale musicalement)*
- Builder B4/S5
- Symmetr B5/S5
- Highlife B36/S23
- Balanced B4/S45

### Dessin manuel

- Dessiner et effacer des cellules directement sur la grille
- **Deux molettes style "ardoise magique"** — une pour l'axe X (horizontal), une pour l'axe Y (vertical) — déplacent un curseur sur la grille pour placer ou effacer des cellules sans utiliser la souris. Ces deux molettes sont les contrôleurs physiques principaux du mode dessin sur la vraie machine.
- **Sélection de forme de départ** — avant de lancer l'évolution, choisir une forme prédéfinie à placer sur la grille : Glider, Blinker, Pulsar, Block, R-pentomino, ou pattern vide

### Symétrie temps réel

- Aucune
- Axiale X
- Axiale Y
- Co-axiale
- Centrale

### Boucle

- Durée de la boucle avant réinitialisation : ×2, ×4, ×8 mesures

---

### Musical

- **Tonique** — note fondamentale (12 notes chromatiques)
- **Gamme** — 10 gammes :
  Pentatonique, Mineur, Majeur, Dorien, Pentatonique Mineure, Lydien, Mixolydien, Japonaise/Hirajoshi, Lydien Dominant, Phrygien Dominant
- **Arpégiateur on/off**
- **Mode arpège** — Up, Down, Random, Ping-pong, Chord, Chord Ping-pong, Groove
- **Vitesse arpège** — Auto, ×2, ×3, ×4, ×8

---

### Synthèse sonore

- **Preset** — 7 presets instantanés : Libre, Piano, Bell, Orgue, Pad, Basse, Marimba
- **Forme d'onde** — Sine, Carré, Scie, Triangle, FM, FM2, FM3, Karplus-Strong, Sample (.wav)
- **Note de référence sample** — C2 à B6

### Enveloppe ADSR
- Attack 1–200 ms
- Decay 1–200 ms
- Sustain 0–100%
- Release 1–200 ms

### Filtre
- Cutoff 5–100%
- Resonance 0–100%

### Comportement selon l'âge des cellules
- **Age → Son** : Harmoniques / Volume / Timbre
- **Age max** : 1–8 générations
- **Mute >=** : silence au-delà d'un certain âge

### Espace sonore
- Detune 0–50 cents
- Stereo 0–100%
- Volume global 0–100%

### Effets audio
- Reverb (taille 0–100%)
- Phaser (vitesse : 4 mesures à 1/32 + profondeur 0–100%)
- Flanger (profondeur 0–100%)
