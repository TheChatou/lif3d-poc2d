# Comparatif simulateurs + Roadmap — 5 juin 2026

## 1. Python vs Web : tableau des différences

### Ce que le Web a en plus (fonctionnalités nouvelles)

| Feature | Web | Python |
|---|---|---|
| Boîte à rythmes | 5 pistes × 16 pas, swing, mute, volume | Absent |
| Vue Machine + Expert | UI double, responsive | UI unique fixe |
| Arp Tierces/Quintes | Intervalles harmoniques | Non |
| Arp Groove | Swing sur les sous-ticks | Non |
| Tweaks panel | Densité, bloom, ledWarm… | Sliders directs |

### Ce que le Python fait mieux / différemment

| Feature | Python | Web actuel | Priorité |
|---|---|---|---|
| **Loop** | Gèle et rejoue N dernières générations GoL | Re-randomise ❌ | Haute |
| **Gammes** | Intervalles multi-octaves (notes bien réparties sur 16 lignes) | Une seule octave (notes compressées) | Haute |
| **Octave** | Boutons +/- réglable 0–6 | Fixé C3 | Moyenne |
| **Phaser/Flanger BPM-sync** | Rate calculé en mesures GoL | LFO à taux fixe | Basse |
| **Arp Chord / Chord Ping-pong** | Joue toutes les notes simultanément | Absent | Moyenne |
| **Save/Load fichiers** | Fichiers .map sur disque | En mémoire (1 slot) | Basse |

---

## 2. Performance — diagnostic et recommandations

### Causes du CPU élevé dans le web actuel

1. `setInterval` imprécis → dérive + recalculs
2. Le moteur GoL tourne dans le thread UI (bloque React)
3. Création de 16 `createOscillator()` nodes à chaque colonne
4. 256 divs React re-rendus pour la matrice à chaque tick

### Fixes recommandés (par ordre d'impact)

| Fix | Gain estimé | Complexité |
|---|---|---|
| Canvas 2D pour la matrice (au lieu de 256 divs React) | Très élevé | Faible |
| Web Worker pour le moteur GoL | Élevé | Moyen |
| AudioWorklet pour l'horloge musicale | Élevé | Moyen |
| Pooling des oscillateurs (réutiliser au lieu de créer) | Moyen | Moyen |

### Comparatif plateformes

| Option | Perf | Partage | Complexité | Verdict |
|---|---|---|---|---|
| Web optimisé (canvas + AudioWorklet + Web Worker) | ✅ bon | ✅ URL | Moyen | **Recommandé pour le sim** |
| Electron | ✅ excellent | ❌ install | Élevé | Overkill pour un sim |
| Python (pygame) | ✅ excellent | ❌ install | Faible | Déjà fait, pas partageable |
| Tauri (Rust shell + Web) | ✅ excellent | ❌ install | Élevé | Futur si produit commercial |

---

## 3. Bugs identifiés dans le sim web

- [ ] **Loop** : re-randomise au lieu de geler/rejouer les générations passées
- [ ] **Encodeurs souris/trackpad** : rotation difficile à contrôler
- [ ] **Gammes** : `buildPitches` ne fait qu'une octave → notes trop proches

---

## 4. Boîte à rythmes dans la matrice — design retenu

### Principe : dual mode sur la même matrice 16×16

```
MODE GOL              MODE DRUM
┌──────────────┐      ┌──────────────────────────┐
│ cellules     │      │ row 0  = Kick             │
│ Conway       │      │ row 1  = Snare            │
│ évolutif     │      │ row 2  = Hat fermé        │
│              │      │ row 3  = Hat ouvert       │
│              │      │ row 4  = Clap             │
│ ←playhead→   │      │ row 5  = Tom H            │
│              │      │ row 6  = Tom M            │
│              │      │ row 7  = Tom L            │
│              │      │ row 8  = Rim              │
│              │      │ row 9  = Cowbell          │
└──────────────┘      │ row 10 = Clave            │
                      │ row 11 = Shaker           │
                      │ row 12 = Maracas          │
                      │ row 13 = Ride             │
                      │ row 14 = Crash            │
                      │ row 15 = Perc libre       │
                      └──────────────────────────┘
```

### Presets rythmiques à implémenter

- 4/4 basique (kick 1&3, snare 2&4, hat croches)
- Trap (kick syncopé, hi-hat rapide)
- Afro (clave 3+3+2)
- Bossa (pattern brésilien)
- Vide

### Comportement du switch

- Pression longue sur encodeur Mode → bascule GoL ↔ Drum
- En mode Drum : l'évolution GoL est gelée, le playhead continue
- Option future : GoL + Drum simultanés (cellules GoL = triggers additionnels)

---

## 5. Contrôleurs physiques — décisions

### Design cible : 7 contrôles physiques

Réduction drastique grâce à la matrice utilisée comme écran de menu (voir section 6).

```
[ON/OFF ─]                         [VOL fine] [BRIGHT]
┌──────────────────────────────────────────────────────┐
│                                                      │
│                  16×16 LED MATRIX                    │
│                                                      │
└──────────────────────────────────────────────────────┘
        [EC11-Y]    [PLAY/PAUSE │]    [EC11-X]
```

| # | Rôle | Physique | Notes |
|---|---|---|---|
| 1 | On/Off | Toggle horizontal (haut gauche) | Switch d'alimentation ou veille |
| 2 | Volume fin | Pot rotatif (haut droit) | Accès immédiat |
| 3 | Luminosité LED | Pot rotatif (haut droit) | Accès immédiat |
| 4 | Play/Pause | Toggle vertical (bas centre) | État physique = état logiciel (on *sent* le mode) |
| 5 | Axe X dessin / navigation | Gros EC11 (bas droit) | Multi-rôle selon mode |
| 6 | Axe Y dessin / navigation | Gros EC11 (bas gauche) | Multi-rôle selon mode |
| 7 | Reset/New seed | Long press X + Y simultané | Geste à deux mains = difficile à faire accidentellement |

**Supprimés / absorbés par les menus matrix :**
BPM, Gamme, Timbre, Octave, Règles GoL → sous-menus dans l'overlay matrice.

### Interaction "Télécran" — encodeurs X/Y

Les deux gros encodeurs EC11 pressables sont le cœur de l'interaction :

- **Tourner** → déplace le curseur (LED clignote sur la position courante)
- **Presser (clic)** → place ou efface la cellule — le mode (crayon/gomme) est déterminé par l'état de la cellule sous le curseur au moment du clic (vivante = efface, morte = place)
- **Maintenir appuyé + tourner** → peint en continu sur la trajectoire du curseur

Pas de bascule crayon/gomme explicite — l'état de la cellule dicte l'action. Comportement identique sur les deux axes.

### Multi-rôle des encodeurs selon le mode

| Mode | Encodeur X | Encodeur Y |
|---|---|---|
| GoL Dessin | Curseur X | Curseur Y |
| Drum Dessin | Pas de temps (colonne) | Instrument / ligne |
| Mémoire | Slot horizontal | Slot vertical |
| Menu overlay | Navigation liste | Ajustement valeur |

---

## 6. Matrice comme écran de menu (Matrix UI)

### Principe

La matrice 16×16 sert à la fois d'affichage GoL et d'interface de menu. En mode menu, le GoL reste visible en fond **tamisé (20% luminosité)**, et les paramètres s'affichent par-dessus en blanc vif + couleurs.

### Déclenchement

- **Long press encodeur Y** → ouvre le menu principal
- **Tourner Y** → sélectionne la ligne de paramètre (navigue verticalement)
- **Tourner X** → ajuste la valeur du paramètre actif
- **Press Y** → confirme et ferme
- **Timeout 2s sans interaction** → fermeture automatique

### Layout Dashboard — 5 paramètres × 3 lignes

```
         col 0                    col 15
row 0-2  ░░░░████████░░░░   BPM   (barre 16 pas, 40→300)
row 3-5  ○ ○ ● ○ ○ ○ · ·   Gamme (point = gamme active, 6 gammes)
row 6-8  ░░░░░░░█████░░░░   Timbre (barre)
row 9-11 ○ ○ ○ ● ○ ○ · ·   Octave (1 bloc = 1 octave, 6 possibles)
row12-14 ○ ○ ● ○ ○ ○ ○ ○   Règle  (icône par règle GoL)
row 15   ────────■───────   Curseur de sélection (ligne active)
```

- Ligne sélectionnée = blanc vif, autres lignes = blanc 40%
- GoL en fond = couleur d'origine à 20%

### Paramètres accessibles via menu

| Paramètre | Représentation | Encodeur X |
|---|---|---|
| BPM | Barre 16 segments (40–300) | ±10 BPM par cran |
| Gamme | 6 points espacés (Japonaise, Penta, Lydien…) | cran = gamme suivante |
| Timbre | Barre 16 segments | ±1 par cran |
| Octave | 6 blocs (octaves 1→6) | cran = +1 octave |
| Règles GoL | 8 points (une icône par règle) | cran = règle suivante |

### Mode Mémoire (futur)

Grille navigable avec les encodeurs X/Y. Chaque cellule = 1 slot mémoire.
- Contenu : formes GoL sauvegardées, presets instruments, patterns drum
- Stockage : LittleFS (flash ESP32, 4MB disponibles, ~32 octets par grille GoL = des centaines de slots)
- Press = charger, long press = sauvegarder dans le slot

---

## 7. Prochaines étapes (ordre suggéré)

1. **Corriger le Loop** dans le web (bug, rapide)
2. **Corriger les gammes** — `buildPitches` multi-octaves
3. **Drum dans la matrice** — dual mode, 16 instruments, presets
4. **Performance** — Canvas + Web Worker
5. **Matrix UI** — prototype de l'overlay menu dans le sim web
6. **Design physique** — liste de commande AliExpress (2 pots + 2 EC11 + 2 boutons)
