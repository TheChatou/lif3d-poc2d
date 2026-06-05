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

### Design cible : 6 contrôles physiques

Réduction drastique grâce à la matrice utilisée comme écran de menu (voir section 6).

| # | Rôle | Physique | Statut |
|---|---|---|---|
| 1 | Volume général | Pot rotatif | Garder — accès immédiat indispensable |
| 2 | Luminosité LED | Pot rotatif | Garder — accès immédiat indispensable |
| 3 | Axe X dessin / navigation | Gros encodeur EC11 droit | Garder — multi-rôle selon mode |
| 4 | Axe Y dessin / navigation | Gros encodeur EC11 gauche | Garder — multi-rôle selon mode |
| 5 | Play/Pause | Bouton poussoir | Garder — doit être instantané |
| 6 | Reset/New seed | Bouton poussoir | Garder — long press = formes |

**Supprimés / absorbés par les menus matrix :**
BPM, Gamme, Timbre, Octave, Règles GoL → deviennent des sous-menus dans l'overlay matrice.

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

La matrice 16×16 sert à la fois d'affichage GoL et d'interface de menu. Un overlay couleur dédiée (blanc pur — jamais utilisé par le GoL) affiche les menus sans interrompre le jeu.

```
GoL actif + menu overlay
┌────────────────┐
│ . . ● . . ● . │  ← GoL en fond
│[BPM  ████░░░] │  ← overlay menu (blanc)
│ . ● . . . . ● │
│ ...            │
└────────────────┘
```

### Déclenchement

- **Long press encodeur Y** → ouvre le menu principal
- **Tourner X** → navigue entre les paramètres (BPM / Gamme / Timbre / Octave / Règles)
- **Tourner Y** → ajuste la valeur du paramètre sélectionné
- **Press Y** → confirme et ferme
- **Timeout 2s sans interaction** → fermeture automatique

### Paramètres accessibles via menu

| Paramètre | Représentation sur matrice |
|---|---|
| BPM | Barre horizontale 16 segments (40–300 BPM) |
| Gamme | Icône 1 colonne par gamme (6 gammes = 6 colonnes) |
| Timbre | Barre horizontale 16 segments |
| Octave | Position verticale (1 LED = 1 octave, 6 possibles) |
| Règles GoL | Icône par règle (B6S567, B5S45…) |

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
