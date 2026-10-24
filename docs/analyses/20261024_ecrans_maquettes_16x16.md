# LIF2D — Architecture des écrans, actions par écran, maquettes 16×16

> 2026-10-24 — Suite de `20261024_actions_et_conventions_machines.md`.
> Rien n'est figé : ce sont des **propositions** à commenter (avec tes `⮑` comme la dernière fois).
> Les grilles sont générées par script, donc toujours exactement 16×16.

**Légende des maquettes** — 3 états seulement pour ces tests

| Symbole | LED |
|---|---|
| `●` | allumée |
| `○` | allumée **faible** |
| (espace) | éteinte |

---

## 0. Révision v2 (24/10 au soir) — décisions de Felix + nouvelles maquettes

> Cette section **remplace** le hub en grille/carrousel (§4.2), le boot (§4.1) et les pages SET (§4.7–4.8).
> Le reste du document reste valable comme référence.

### 0.1 Décisions

| Sujet | Décision |
|---|---|
| Texte trop large | **Défilement de droite à gauche**, jamais de retour à la ligne |
| Police par défaut | **3×5**, en version **proportionnelle** quand c'est possible (I étroit, M/N/W larges) ; la petite 3×4 ponctuellement |
| Démarrage | "LIF2D" (ou un logo) **sans défilement**, **fondu au bout de 3 s**, puis le hub |
| Hub | **liste verticale, un menu par ligne**, molette gauche : à droite = descendre, à gauche = monter ; **le menu sélectionné reste centré**, et la liste "colle" en haut/en bas aux extrémités ; clic = entrer. La grille 3×3 est écartée (moins lisible) |
| Pages de réglages | **une ligne de LEDs par réglage** dans la moitié haute ; la **moitié basse affiche le nom** du réglage sélectionné ; molette gauche = choisir la ligne, **molette droite = modifier** |
| Sélection | en surbrillance, **ou** clignotement léger, **ou** couleur différente (à tester sur la vraie matrice) |
| BOOM | **couleur par type de batterie**, et un **menu de son par piste** (snare, tom…) |

### 0.2 Démarrage — 2 options sans défilement

**A. "LIF2D" sur une seule ligne** : ça tient pile en 16 LEDs grâce à un L de 2 LEDs et un I de 1 LED (2+1+1+1+3+1+3+1+3 = 16).

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│ ●     ●   ● ● ●   ● ●     ● ●   │
│ ●     ●   ●           ●   ●   ● │
│ ●     ●   ● ●       ●     ●   ● │
│ ●     ●   ●       ●       ●   ● │
│ ● ●   ●   ●       ● ● ●   ● ●   │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

**B. Logo : un glider géant + LIF2D en faible.** Le glider est LA forme emblématique du Jeu de la Vie (et il bouge : il peut "partir" en diagonale pendant le fondu).

```
┌─────────────────────────────────┐
│             ● ● ●               │
│             ● ● ●               │
│             ● ● ●               │
│                   ● ● ●         │
│                   ● ● ●         │
│                   ● ● ●         │
│       ● ● ● ● ● ● ● ● ●         │
│       ● ● ● ● ● ● ● ● ●         │
│       ● ● ● ● ● ● ● ● ●         │
│                                 │
│                                 │
│ ○     ○   ○ ○ ○   ○ ○     ○ ○   │
│ ○     ○   ○           ○   ○   ○ │
│ ○     ○   ○ ○       ○     ○   ○ │
│ ○     ○   ○       ○       ○   ○ │
│ ○ ○   ○   ○       ○ ○ ○   ○ ○   │
└─────────────────────────────────┘
```

(L'option à 2 lignes "LIF" + "2D" de la §4.1 reste possible.)

### 0.3 Hub — liste verticale

**Milieu de liste** : le menu sélectionné (BOOM) reste centré, les voisins en faible, et le suivant est coupé en bas, ce qui signale qu'il y a une suite.

```
┌─────────────────────────────────┐
│ ○   ○   ○   ○   ○   ○   ○   ○   │
│ ○   ○   ○ ○     ○ ○ ○   ○ ○ ○   │
│ ○   ○   ○   ○   ○   ○   ○ ○ ○   │
│ ○ ○     ○   ○   ○   ○   ○   ○   │
│                                 │
│ ● ●       ●       ●     ●   ●   │
│ ●   ●   ●   ●   ●   ●   ● ● ●   │
│ ● ●     ●   ●   ●   ●   ● ● ●   │
│ ●   ●   ●   ●   ●   ●   ●   ●   │
│ ● ●       ●       ●     ●   ●   │
│                                 │
│ ○ ○     ○ ○ ○     ○ ○           │
│ ○   ○   ○       ○               │
│ ○ ○     ○ ○     ○               │
│ ○   ○   ○       ○               │
│ ○   ○   ○ ○ ○     ○ ○           │
└─────────────────────────────────┘
```

**Début de liste** : on "colle" en haut.

```
┌─────────────────────────────────┐
│   ● ●     ●     ●               │
│ ●       ●   ●   ●               │
│ ●   ●   ●   ●   ●               │
│ ●   ●   ●   ●   ●               │
│   ● ●     ●     ● ● ●           │
│                                 │
│ ○ ○     ○ ○       ○     ○   ○   │
│ ○   ○   ○   ○   ○   ○   ○   ○   │
│ ○   ○   ○ ○     ○ ○ ○   ○ ○ ○   │
│ ○   ○   ○   ○   ○   ○   ○ ○ ○   │
│ ○ ○     ○   ○   ○   ○   ○   ○   │
│                                 │
│ ○ ○       ○       ○     ○   ○   │
│ ○   ○   ○   ○   ○   ○   ○ ○ ○   │
│ ○ ○     ○   ○   ○   ○   ○ ○ ○   │
│ ○   ○   ○   ○   ○   ○   ○   ○   │
└─────────────────────────────────┘
```

**Fin de liste** : on "colle" en bas.

```
┌─────────────────────────────────┐
│ ○       ○         ○             │
│   ○     ○ ○       ○             │
│     ○   ○         ○             │
│ ○ ○     ○ ○ ○     ○             │
│                                 │
│   ○ ○   ○ ○ ○   ○ ○ ○           │
│ ○       ○         ○             │
│   ○     ○ ○       ○             │
│     ○   ○         ○             │
│ ○ ○     ○ ○ ○     ○             │
│                                 │
│   ● ●   ●   ●     ● ●           │
│ ●       ●   ●   ●               │
│   ●       ●       ●             │
│     ●     ●         ●           │
│ ● ●       ●     ● ●             │
└─────────────────────────────────┘
```

⚠️ **Problème repéré** : avec 4 caractères visibles, `REC GOL`, `REC BOOM` et `REC AUDIO` affichent tous `REC`, et `SET GOL` / `SET AUDIO` affichent tous `SET` (voir la fin de liste ci-dessus).
Seul le menu sélectionné défile. Deux solutions :

- **Hub à 2 niveaux** (recommandé) : `GOL · DRAW · BOOM · REC · SET · SYS`. On entre dans REC ou SET, puis on choisit `GOL / BOOM / AUDIO`.
  Tous les mots tiennent en 4 lettres et sont différents. Ça coûte **1 clic de plus**, compensé par les raccourcis directs depuis les écrans live (clic A → SET GOL, etc.).
- **Hub à plat, avec des noms différents dès les premières lettres** : ex `GOL`, `DRAW`, `BOOM`, `MGOL` (mémoire GOL), `MBOO`, `MAUD`, `RGOL` (réglages GOL), `RAUD`, `SYS`. Plus court, mais plus cryptique.

### 0.4 Pages de réglages — une ligne de LEDs par réglage

**Navigation** (molette gauche) : la ligne sélectionnée est vive, les autres en faible. En bas, le nom du réglage sélectionné (`GAMME`, qui défile).

```
┌─────────────────────────────────┐
│ ○ ○ ○ ○ ○ ○ ○ ○ ○               │  ← BPM
│ ●     ○     ○     ○     ○     ○ │  ← GAMME ◀ sélection
│                         ○       │  ← TONIQUE
│                 ○               │  ← OCTAVE
│           ○                     │  ← TIMBRE
│ ○                               │  ← ARPEGE
│ ○ ○ ○ ○ ○                       │  ← REVERB
│ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○         │  ← VOL BOOM
│                                 │
│                                 │
│   ● ●     ●     ●   ●   ●   ●   │  ← libellé du réglage sélectionné (défile si trop long)
│ ●       ●   ●   ● ● ●   ● ● ●   │
│ ●   ●   ● ● ●   ● ● ●   ● ● ●   │
│ ●   ●   ●   ●   ●   ●   ●   ●   │
│   ● ●   ●   ●   ●   ●   ●   ●   │
│                                 │
└─────────────────────────────────┘
```

Deux types de lignes :
- **barre** (valeur continue : BPM, reverb, volume) : remplie de gauche à droite sur 16 LEDs ;
- **options** (valeurs discrètes : gamme, tonique, octave…) : un point par option, réparti sur la largeur, et l'option choisie allumée.
  Sur la ligne sélectionnée, **toutes les options apparaissent** en faible et le choix est vif. On voit d'un coup d'œil combien il y en a.

**Réglage** (molette droite) : la ligne change en direct, et la moitié basse affiche **la valeur** pendant environ 1,5 s (`JAPN` = japonaise), puis revient au nom.

```
┌─────────────────────────────────┐
│ ○ ○ ○ ○ ○ ○ ○ ○ ○               │
│ ●     ○     ○     ○     ○     ○ │  ← GAMME ◀ molette droite = change
│                         ○       │
│                 ○               │
│           ○                     │
│ ○                               │
│ ○ ○ ○ ○ ○                       │
│ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○         │
│                                 │
│                                 │
│     ●     ●     ● ●     ● ●     │  ← valeur affichée pendant le réglage (~1,5 s)
│     ●   ●   ●   ●   ●   ●   ●   │
│     ●   ● ● ●   ● ●     ●   ●   │
│ ●   ●   ●   ●   ●       ●   ●   │
│   ●     ●   ●   ●       ●   ●   │
│                                 │
└─────────────────────────────────┘
```

Avec 8 lignes visibles : au-delà de 8 réglages, la liste défile comme le hub (même comportement de "colle en haut/en bas").

### 0.5 BOOM — couleurs par batterie

```
┌─────────────────────────────────┐
│ ●       ● ○     ●       ●       │  ← Kick — rouge (pas 1–16)
│         ● ○             ●       │  ← Snare — orange (pas 1–16)
│ ●   ●   ● ○ ●   ●   ●   ●   ●   │  ← Hat — jaune (pas 1–16)
│           ○   ●               ● │  ← Hat ouvert — vert (pas 1–16)
│           ○             ●       │  ← Clap — cyan (pas 1–16)
│           ○                 ●   │  ← Tom H — bleu (pas 1–16)
│           ○                     │  ← Tom M — violet (pas 1–16)
│           ○                     │  ← Tom L — rose (pas 1–16)
│ ●       ●       ●       ●   ●   │  ← Kick — rouge (pas 17–32)
│         ●               ●       │  ← Snare — orange (pas 17–32)
│ ●   ●   ●   ●   ●   ●   ●   ●   │  ← Hat — jaune (pas 17–32)
│               ●               ● │  ← Hat ouvert — vert (pas 17–32)
│                         ●       │  ← Clap — cyan (pas 17–32)
│                           ●     │  ← Tom H — bleu (pas 17–32)
│                                 │  ← Tom M — violet (pas 17–32)
│                             ●   │  ← Tom L — rose (pas 17–32)
└─────────────────────────────────┘
```

Les couleurs sont à affiner. L'idée : **graves = chaud** (kick rouge), **aigus = clair** (hats jaune/vert), **toms = froid**.

**Menu de son d'une piste** (clic B sur une piste → réglages de cette batterie) : c'est **exactement le même gabarit** que les pages de réglages.
Un seul composant d'interface à apprendre et à coder.

```
┌─────────────────────────────────┐
│ ○ ○ ○ ○ ○ ○ ○ ○                 │  ← PITCH
│ ● ● ● ● ● ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ │  ← DECAY ◀ sélection
│ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○             │  ← TONE
│ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○         │  ← VOLUME
│                 ○               │  ← PAN
│                                 │  ← SWING
│ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ │  ← PROBA
│ ○                               │  ← MUTE
│                                 │
│                                 │
│ ● ●     ● ● ●     ● ●     ●     │  ← « DECAY » — réglages de la piste Snare
│ ●   ●   ●       ●       ●   ●   │
│ ●   ●   ● ●     ●       ● ● ●   │
│ ●   ●   ●       ●       ●   ●   │
│ ● ●     ● ● ●     ● ●   ●   ●   │
│                                 │
└─────────────────────────────────┘
```

(Le "mute piste", qui était sur le clic B, passe dans ce menu, ligne MUTE.)

---

## 1. Carte des écrans : un "hub" en grille 3×3

Tu as listé 9 écrans. En retirant l'accueil, il en reste **8**, et une grille de 3×3 icônes de 4×4 px
tient pile dans 16×16 (4 + 2 + 4 + 2 + 4 = 16) avec **une case libre au centre**.
Proposition : on range les écrans par **ligne = type** et **colonne = domaine**.

|  | **Visuel** (gauche) | **Mixte** (centre) | **Son** (droite) |
|---|---|---|---|
| **JOUER** | DRAW (GOL dessin) | **GOL** (lecture) | BOOM |
| **PRESETS** | REC GOL | REC AUDIO | REC BOOM |
| **RÉGLAGES** | SET GOL | SYS (système, la case libre) | SET AUDIO |

Pourquoi c'est intéressant :
- C'est cohérent avec **molette gauche = lumière, molette droite = son**. Le visuel est à gauche, le son à droite.
- La case libre devient **SYS** : MIDI, délai de retour auto, diagnostic, reset. Ça évite d'encombrer SET AUDIO.
- Chaque ligne a une **forme d'icône** commune et chaque colonne une **couleur** commune (ex : visuel = ambre, son = cyan, mixte = blanc).
- On s'y déplace en **ardoise magique** : molette A = gauche/droite, molette B = haut/bas.

```
              BOOT (logo 2 s)
                    │
                    ▼
     ┌──────────── HUB 3×3 ────────────┐
     │  DRAW      GOL       BOOM       │  ← JOUER
     │  REC GOL   REC AUDIO REC BOOM   │  ← PRESETS
     │  SET GOL   SYS       SET AUDIO  │  ← RÉGLAGES
     └─────────────────────────────────┘
   clic = entrer   ·   appui long (partout) = remonter d'un niveau → hub
```

---

## 2. Règles de navigation globales (proposition)

1. **Clic court = entrer / valider.**
2. **Appui long (A ou B) = remonter d'un niveau.** Depuis un écran live, on remonte au hub. Depuis le hub, on retourne à l'écran live qu'on a quitté.
3. **▶ clic = play/pause, sur tous les écrans**, sans exception.
4. **La musique ne s'arrête jamais en naviguant.** Seul ▶ l'arrête.
5. **Mémoire de position** : le hub se rouvre sur la dernière case utilisée, et un écran SET sur le dernier réglage touché. Ça économise beaucoup de gestes (voir §3).
6. **Retour automatique** au live après X secondes sans action, depuis le hub ou un écran SET [à trancher].

---

## 3. Le coût en actions (ton point clé)

Un "geste" = une rotation (même de plusieurs crans), un clic ou un appui long.

| Tâche, depuis l'écran GOL | Par le hub seulement | Avec raccourcis (§4) |
|---|---|---|
| Changer le volume | — | **1** (tourner B) |
| Changer la luminosité | — | **1** (tourner A) |
| Changer le BPM | appui long → hub, aller sur SET AUDIO, clic, choisir BPM, tourner, appui long ×2 = **7** | **1** (▶ maintenu + B) ou **3** (clic B → SET AUDIO, tourner, appui long) |
| Changer la gamme | **7** | **4** (clic B, tourner A jusqu'à GAMME, tourner B, appui long) |
| Nouvelle graine | — | **1** (appui long ▶) |
| Charger un dessin sauvegardé | appui long, aller sur REC GOL, clic, choisir, clic = **5** | **3** (clic A+B → REC GOL, choisir, clic) |
| Passer en mode dessin | appui long, tourner A, clic = **3** | 3 |
| Passer à la boîte à rythme | appui long, tourner A ×2, clic = **3** | 3 |

**Conclusion** : avec seulement le hub, on dépasse vite **7 gestes**. Il faut 2 ou 3 raccourcis depuis les écrans live :
- **clic A → SET GOL, clic B → SET AUDIO**, directement sans passer par le hub ;
- **▶ maintenu + molette** = les 2 réglages A les plus fréquents (BPM et… ?).

Objectif proposé : **toute action de niveau A en 4 gestes maximum.**

---

## 4. Les écrans un par un

### 4.1 BOOT — logo à l'allumage

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│     ●       ● ● ●   ● ● ●       │
│     ●         ●     ●           │
│     ●         ●     ● ●         │
│     ●         ●     ●           │
│     ● ● ●   ● ● ●   ●           │
│                                 │
│                                 │
│         ● ●     ● ● ●           │
│       ●     ●   ●     ●         │
│             ●   ●     ●         │
│           ●     ●     ●         │
│         ●       ●     ●         │
│       ● ● ● ●   ● ● ●           │
│                                 │
└─────────────────────────────────┘
```

`LIF` en police 3×5, `2D` en grands caractères 4×6 (couleur différente sur la vraie matrice). On reste environ 2 s, puis on arrive sur le hub
(ou directement sur le dernier mode joué [à trancher]). Une animation est possible : les lettres "naissent" comme des cellules GoL.

### 4.2 HUB — variante A : grille 3×3 d'icônes (sélection = GOL)

```
┌─────────────────────────────────┐
│       ○       ●               ○ │
│     ○ ○         ●         ○   ○ │
│   ○ ○       ● ● ●       ○ ○ ○ ○ │
│ ○                       ○ ○ ○ ○ │
│                                 │
│                                 │
│ ○   ○           ○ ○     ○   ○ ○ │
│                 ○               │
│ ○   ○         ○ ○       ○ ○   ○ │
│             ○ ○                 │
│                                 │
│                                 │
│ ○             ○ ○           ○   │
│ ○ ○ ○ ○     ○ ○ ○ ○     ○ ○ ○ ○ │
│     ○       ○ ○ ○ ○     ○       │
│ ○ ○ ○ ○       ○ ○       ○ ○ ○ ○ │
└─────────────────────────────────┘
```

| Geste | Action |
|---|---|
| Tourner A | déplacer la sélection gauche/droite |
| Tourner B | déplacer la sélection haut/bas |
| Clic A ou B | entrer dans l'écran sélectionné |
| Appui long | retour à l'écran live quitté |
| ▶ | play/pause |

Défaut : les icônes 4×4 ne sont pas lisibles sans apprentissage. On peut afficher le **nom en bandeau défilant** 1 s après chaque déplacement.

### 4.2 bis HUB — variante B : carrousel (une page = un écran)

```
┌─────────────────────────────────┐
│                                 │
│             ● ●                 │
│             ● ●                 │
│   ○             ● ●         ○   │
│ ○               ● ●           ○ │
│   ○     ● ● ● ● ● ●         ○   │
│         ● ● ● ● ● ●             │
│                                 │
│                                 │
│       ● ●     ●     ●           │
│     ●       ●   ●   ●           │
│     ●   ●   ●   ●   ●           │
│     ●   ●   ●   ●   ●           │
│       ● ●     ●     ● ● ●       │
│                                 │
│       ○ ● ○ ○ ○ ○ ○ ○ ○         │
└─────────────────────────────────┘
```

Une grande icône + le nom en clair + 9 points de pagination en bas. Plus lisible, mais **plus de gestes** :
la molette A fait défiler les 9 pages une à une, sans raccourci haut/bas.

### 4.3 GOL — lecture (tête de lecture en colonne 5)

```
┌─────────────────────────────────┐
│           ○                     │
│           ○       ● ● ●         │
│     ●     ○                     │
│       ●   ○                     │
│   ● ● ●   ○                     │
│           ○                     │
│           ○       ●             │
│           ○       ●             │
│           ○ ● ●                 │
│           ○ ● ●                 │
│           ○             ●       │
│           ○               ●     │
│           ○           ● ● ●     │
│         ● ●                     │
│           ●                     │
│           ○                     │
└─────────────────────────────────┘
```

La colonne `○` est la tête de lecture (faible). Une cellule `●` dessus = une note jouée (la couleur la distinguera sur la vraie matrice).

| Geste | Action |
|---|---|
| Tourner A | **luminosité** ✅ |
| Tourner B | **volume** ✅ |
| Clic A | → SET GOL (raccourci) |
| Clic B | → SET AUDIO (raccourci) |
| Clic A + B ensemble | → REC GOL (sauver/charger la grille) |
| ▶ clic | play/pause ✅ |
| ▶ appui long (sans tourner) | nouvelle graine |
| ▶ maintenu + tourner A | raccourci 1 (règle GoL ?) |
| ▶ maintenu + tourner B | raccourci 2 (BPM ?) |
| Appui long A ou B | → hub |

### 4.3 bis GOL — overlay volume (en tournant B)

```
┌─────────────────────────────────┐
│           ○                     │
│           ○       ● ● ●         │
│     ●     ○                     │
│       ●   ○                     │
│   ● ● ●   ○                     │
│           ○                     │
│           ○       ●             │
│           ○       ●             │
│           ○ ● ●                 │
│           ○ ● ●                 │
│           ○             ●       │
│           ○               ●     │
│           ○           ● ● ●     │
│                                 │
│ ● ● ● ● ● ● ● ● ● ● ● ○ ○ ○ ○ ● │
│                                 │
└─────────────────────────────────┘
```

Les 3 dernières lignes s'effacent et une barre de 14 crans s'affiche (ici 10/14). Elle disparaît au bout d'environ 1,5 s.

### 4.4 DRAW — GOL en mode dessin

```
┌─────────────────────────────────┐
│ ●                               │
│                   ● ● ●         │
│     ●                           │
│       ●                         │
│   ● ● ●                         │
│                                 │
│                                 │
│                                 │
│             ● ●                 │
│             ● ● ○               │
│                 ○               │
│             ○ ○ ● ○ ○           │
│                 ○               │
│                 ○               │
│                                 │
│                                 │
└─────────────────────────────────┘
```

Curseur en croix (centre `●`, branches `○`, ligne 11, colonne 8). Le pixel en haut à gauche indique l'outil en cours (couleur : crayon, gomme, lever).

| Geste | Action |
|---|---|
| Tourner A | curseur **X** (l'ardoise magique pure) |
| Tourner B | curseur **Y** |
| Clic A | poser / effacer la cellule |
| Clic B | changer d'outil (crayon → gomme → lever) |
| ▶ clic | lancer / figer l'évolution |
| ▶ appui long | **effacer la grille** (barre de remplissage, niveau B — seulement ici, comme tu l'as dit) |
| ▶ + A / ▶ + B | luminosité / volume (puisque A et B sont pris par le curseur) |
| Appui long A ou B | → hub |

⚠️ **Conflit** : ici A et B ne règlent plus luminosité/volume. Soit on l'accepte (mode dessin = mode à part), soit le volume passe sur ▶ + B partout [à trancher].

### 4.5 BOOM — boîte à rythme, 32 pas

```
┌─────────────────────────────────┐
│ ●       ● ○     ●       ●       │
│         ● ○             ●       │
│ ●   ●   ● ○ ●   ●   ●   ●   ●   │
│           ○   ●               ● │
│           ○             ●       │
│           ○                 ●   │
│           ○                     │
│           ○                     │
│ ●       ●       ●       ●   ●   │
│         ●               ●       │
│ ●   ●   ●   ●   ●   ●   ●   ●   │
│               ●               ● │
│                         ●       │
│                           ●     │
│                                 │
│                             ●   │
└─────────────────────────────────┘
```

Lignes 0–7 = pas 1 à 16, lignes 8–15 = pas 17 à 32. Chaque ligne d'une moitié = une des **8 pistes du simulateur web**
(Kick, Snare, Hat, Hat ouvert, Clap, Tom H, Tom M, Tom L). La tête de lecture `○` balaie la moitié haute, puis la moitié basse.
⚠️ Aucune ligne libre pour séparer les 2 moitiés : on les distingue par la **couleur** (ex : moitié haute plus chaude), ou on passe à 7 pistes pour garder une ligne de séparation [à trancher].

| Geste | Action |
|---|---|
| Tourner A | curseur sur les 32 pas |
| Tourner B | curseur de piste |
| Clic A | activer/désactiver le pas |
| Clic B | muter/démuter la piste |
| ▶ | play/pause |
| ▶ + A / ▶ + B | luminosité / volume (même conflit que DRAW) |
| Appui long | → hub |

### 4.6 REC GOL / REC BOOM / REC AUDIO — presets (même gabarit, couleur différente)

```
┌─────────────────────────────────┐
│ ○ ○ ○   ○ ○ ○   ○ ○ ○           │
│ ○ ○ ○   ○ ○ ○   ○ ○ ○     ○     │
│ ○ ○ ○   ○ ○ ○   ○ ○ ○           │
│                                 │
│         ● ● ●                   │
│   ○     ● ● ●     ○       ○     │
│         ● ● ●                   │
│                                 │
│         ○ ○ ○                   │
│   ○     ○ ○ ○     ○       ○     │
│         ○ ○ ○                   │
│                                 │
│                                 │
│   ○       ○       ○       ○     │
│                                 │
│                                 │
└─────────────────────────────────┘
```

16 cases de 3×3. **Carré = preset enregistré**, **point seul = vide**. La case **sélectionnée est allumée vive**, les autres en faible.

| Geste | Action |
|---|---|
| Tourner A / B | déplacer la sélection X / Y |
| Clic A | **charger** le preset |
| Clic B | **sauver** ici (case vide) ou ouvrir les options (case pleine : écraser, nommer, supprimer) |
| Appui long | retour |

Nommer un preset (4 lettres ; lettres validées en faible, lettre en cours vive + soulignée) :

```
┌─────────────────────────────────┐
│     ○ ○       ○     ○   ○       │
│     ○   ○   ○   ○   ○ ○ ○       │
│     ○   ○   ○   ○   ○ ○ ○       │
│     ○   ○   ○   ○   ○   ○       │
│     ○   ○     ○     ○   ○       │
│                                 │
│ ○ ○ ○   ○ ○ ○   ○ ○       ●     │
│     ○   ○       ○   ○   ●   ●   │
│   ○     ○ ○     ○   ○   ● ● ●   │
│ ○       ○       ○   ○   ●   ●   │
│ ○ ○ ○   ○ ○ ○   ○   ○   ●   ●   │
│                                 │
│                         ● ● ●   │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

A = choisir la lettre à modifier, B = faire défiler l'alphabet, clic = valider.

Confirmation de suppression (en rouge sur la vraie matrice) :

```
┌─────────────────────────────────┐
│   ● ●   ●   ●   ● ●     ● ●     │
│ ●       ●   ●   ●   ●       ●   │
│   ●     ●   ●   ● ●       ●     │
│     ●   ●   ●   ●               │
│ ● ●     ● ● ●   ●         ●     │
│                                 │
│                                 │
│     ● ●       ●     ● ●         │
│     ●   ●   ●   ●   ●   ●       │
│     ●   ●   ●   ●   ●   ●       │
│     ●   ●   ●   ●   ●   ●       │
│     ●   ●     ●     ●   ●       │
│                                 │
│                                 │
│             ●     ○             │
│                                 │
└─────────────────────────────────┘
```

B = basculer NON/OUI (les 2 points du bas indiquent le choix), clic = valider. **NON par défaut.**

### 4.7 SET AUDIO / SET GOL — réglage à curseur

```
┌─────────────────────────────────┐
│     ○ ○     ○ ○     ○   ○       │
│     ○   ○   ○   ○   ○ ○ ○       │
│     ○ ○     ○ ○     ○ ○ ○       │
│     ○   ○   ○       ○   ○       │
│     ○ ○     ○       ○   ○       │
│                                 │
│       ●       ● ●       ● ●     │
│     ● ●     ●     ●   ●     ●   │
│       ●           ●   ●     ●   │
│       ●         ●     ●     ●   │
│       ●       ●       ●     ●   │
│     ● ● ●   ● ● ● ●     ● ●     │
│                                 │
│ ● ● ● ● ● ● ● ● ● ● ○ ○ ○ ○ ○ ● │
│                                 │
│         ● ○ ○ ○ ○ ○ ○           │
└─────────────────────────────────┘
```

Libellé en faible en haut, valeur en grands chiffres, barre de 14 crans (ligne 13 : `●` rempli, `○` vide) entre 2 bornes,
et en bas **les points de position** : quel réglage parmi les 7 de la page.

```
┌─────────────────────────────────┐
│     ○   ○     ○     ○           │
│     ○   ○   ○   ○   ○           │
│     ○   ○   ○   ○   ○           │
│     ○   ○   ○   ○   ○           │
│       ○       ○     ○ ○ ○       │
│                                 │
│         ● ● ●   ● ● ●           │
│             ●   ●   ●           │
│           ●     ●   ●           │
│           ●     ●   ●           │
│           ●     ● ● ●           │
│                                 │
│                                 │
│ ● ● ● ● ● ● ● ● ● ● ● ○ ○ ○ ○ ● │
│                                 │
│         ○ ● ○ ○ ○ ○ ○           │
└─────────────────────────────────┘
```

Même gabarit avec la valeur en police 3×5.

**Ta variante "colonnes 0 et 15 allumées"** :

```
┌─────────────────────────────────┐
│ ●                             ● │
│ ●   ○ ○     ○ ○     ○   ○     ● │
│ ●   ○   ○   ○   ○   ○ ○ ○     ● │
│ ●   ○ ○     ○ ○     ○ ○ ○     ● │
│ ●   ○   ○   ○       ○   ○     ● │
│ ●   ○ ○     ○       ○   ○     ● │
│ ●                             ● │
│ ●     ●     ● ●     ● ● ●     ● │
│ ●   ● ●         ●   ●   ●     ● │
│ ●     ●       ●     ●   ●     ● │
│ ●     ●     ●       ●   ●     ● │
│ ●   ● ● ●   ● ● ●   ● ● ●     ● │
│ ●                             ● │
│ ● ● ● ● ● ● ● ● ● ● ○ ○ ○ ○ ○ ● │
│ ●                             ● │
│ ●                             ● │
└─────────────────────────────────┘
```

⚠️ Avec les colonnes 0 et 15 occupées, il ne reste que **14 px de large, donc 3 caractères maximum** au lieu de 4.
`GAMME` ne tiendrait même pas en abrégé `GAMM`. Compromis proposé : les bornes **seulement sur la ligne de la barre** (première maquette).

| Geste | Action |
|---|---|
| Tourner A | réglage précédent/suivant (balayage horizontal vers le réglage voisin) |
| Tourner B | changer la valeur |
| Appuyer sur B + tourner | pas fin (ex : BPM ±1 au lieu de ±5) |
| Clic B | afficher la valeur en clair / le nom complet en défilant (ton idée) |
| Appui long | retour |

### 4.8 SET — réglage à options (ex : gamme)

```
┌─────────────────────────────────┐
│       ○ ○     ○     ○   ○       │
│     ○       ○   ○   ○ ○ ○       │
│     ○   ○   ○ ○ ○   ○ ○ ○       │
│     ○   ○   ○   ○   ○   ○       │
│       ○ ○   ○   ○   ○   ○       │
│                                 │
│         ●     ●     ● ●         │
│         ●   ●   ●   ●   ●       │
│         ●   ● ● ●   ● ●         │
│     ●   ●   ●   ●   ●           │
│       ●     ●   ●   ●           │
│                                 │
│                                 │
│     ●   ○   ○   ○   ○   ○       │
│                                 │
│                                 │
└─────────────────────────────────┘
```

Libellé, valeur abrégée en 3–4 lettres, et une rangée de points = les options (ici 6 gammes, la 1ʳᵉ choisie).
Clic B = le nom complet défile ("JAPONAISE").

---

## 5. Inventaire des réglages par écran SET (source : simulateur web + `config.h`)

**SET AUDIO** : BPM · Gamme · Tonique · Octave · Timbre / preset (Libre, Piano, Cristal, Orgue, Pad, Basse, Marimba) ·
Forme d'onde · Attaque / Decay / Sustain / Release · Arpégiateur (on, mode, subdivision, groove) · Volume batterie ·
Âge → son · Stéréo · Detune · Effets (phaser, flanger, reverb, filtre cutoff/résonance)

**SET GOL** : Règle · Symétrie · Forme de départ · Densité de la graine · **Évolution** (à chaque temps ↔ tous les N temps ↔ à chaque balayage complet) ·
**Loop** (on/off, durée ×2/×4/×8 mesures, lecture cyclique ↔ aller-retour) · Âge max · Palette de couleurs · Luminosité par défaut

**SYS** : MIDI on/off + canal · Retour auto au live · Écran au démarrage · Diagnostic · Reset usine

⚠️ Le simulateur web a **beaucoup** de réglages (ADSR, effets…). Sur la boîte, il faudra **choisir** : on ne peut pas tous les mettre, et Mozzi sur ESP32 ne fera pas tous les effets. Prochaine séance : on trie.

---

## 6. Typographies

➡️ Étude complète (hauteur max, lisibilité, plusieurs polices) : `20261024_typographies_16x16.md`

---

## 7. Questions pour la suite

1. Hub en **grille 3×3** (variante A) ou **carrousel** (variante B) ? Ou la grille, avec le nom qui défile en survol ?
2. La disposition lignes = type / colonnes = domaine te parle-t-elle ? Et SYS dans la case du centre ?
3. Écrans DRAW/BOOM : on accepte que A/B ne règlent plus luminosité/volume, ou volume = ▶ + B partout ?
4. Les 2 raccourcis ▶ + molette en GOL : BPM et quoi d'autre ?
5. 16 slots par écran REC, ça suffit ?
6. Au démarrage : hub, ou reprise directe du dernier mode ?
