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

### Tableau final des contrôleurs

| # | Rôle | Physique | Décision |
|---|---|---|---|
| 1 | Volume général | Pot rotatif | Garder |
| 2 | BPM (40–300) | Encodeur EC11 | Garder |
| 3 | Gamme musicale | Gros encodeur "valve" | Garder — beau pour le design |
| 4 | Timbre | Encodeur EC11 | Garder |
| 5 | Octave | Encodeur EC11 | Garder |
| 6 | Axe Y dessin | Gros encodeur gauche | Garder — press = placer/effacer |
| 7 | Axe X dessin | Gros encodeur droit | Garder — press = placer/effacer |
| 8 | Play/Pause | Bouton poussoir | Garder |
| 9 | Reset/New seed | Bouton poussoir | Garder — long press = formes |
| 10 | Luminosité LED | Pot linéaire | Garder |
| 11 | Règles GoL | Pot à crans | Transformer → EC11 (press = switch GOL/DRUM) |

### Suppression du bouton "Mode Dessin"

Les encodeurs X/Y (EC11, pressables) remplacent le bouton toggle dessin/déplacement :
- **Tourner** → déplace le curseur (LED clignote sur la position courante)
- **Presser** → place ou efface une cellule selon l'état du stylo
- **Double press** → bascule crayon / gomme

Le bouton "Mode Dessin" de l'UI web est donc supprimé du design physique.

---

## 6. Prochaines étapes (ordre suggéré)

1. **Corriger le Loop** dans le web (bug, rapide)
2. **Corriger les gammes** — `buildPitches` multi-octaves
3. **Drum dans la matrice** — dual mode, 16 instruments, presets
4. **Performance** — Canvas + Web Worker
5. **Design physique** — liste de commande AliExpress des encodeurs
