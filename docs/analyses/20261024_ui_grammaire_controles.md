# LIF2D — Fondations UI : inventaire des gestes, types d'écrans, réglages

> 2026-10-24 — Document de travail, point de départ pour concevoir le menu sur la matrice 16×16
> et le simulateur web. Tout ce qui est marqué **[à trancher]** est à décider ensemble.

---

## 1. Les entrées physiques (as-built, cf. `docs/photos/20261024_schema_cablage_asbuilt.jpg`)

| Élément | Position | Actions brutes | GPIO |
|---|---|---|---|
| **Encodeur A** (EC11 + cache-molette) | bas gauche | tourner ↻ / ↺, appuyer | 22 / 23 / clic 21 |
| **Encodeur B** (EC11 + cache-molette) | bas droite | tourner ↻ / ↺, appuyer | 32 / 33 / clic 19 |
| **Bouton ▶** (play/pause) | bas centre | appuyer | 14 |
| Bouton BOOT (interne) | dans le boîtier | appuyer | 0 — pas un contrôle utilisateur |

Donc **5 signaux** : A-rotation, A-clic, B-rotation, B-clic, ▶.

---

## 2. Inventaire exhaustif des gestes possibles

### 2.1 Gestes simples (un seul élément)

| # | Geste | A | B | ▶ | Coût ergonomique | Remarque |
|---|---|---|---|---|---|---|
| 1 | Rotation lente (cran par cran) | ✅ | ✅ | — | ⭐ très facile | geste principal |
| 2 | Rotation rapide (accélération) | ✅ | ✅ | — | ⭐ facile | ×4 ou ×10 par cran au-delà d'une vitesse seuil |
| 3 | Clic court (< 400 ms) | ✅ | ✅ | ✅ | ⭐ facile | |
| 4 | Double-clic (2 clics < 300 ms) | ✅ | ✅ | ✅ | ⭐⭐ moyen | retarde le clic simple de 300 ms ⚠️ |
| 5 | Appui long (≥ 600 ms) | ✅ | ✅ | ✅ | ⭐⭐ moyen | demande un retour visuel (barre qui se remplit) |
| 6 | Appui très long (≥ 2 s) | ✅ | ✅ | ✅ | ⭐⭐⭐ volontaire | parfait pour actions "dangereuses" (reset, effacer) |
| 7 | Appuyer + tourner (molette enfoncée) | ✅ | ✅ | — | ⭐⭐ moyen | "shift" local ; gros cache-molette = OK mais risque de cran parasite au clic |

### 2.2 Combinaisons (deux éléments à la fois)

| # | Combinaison | Coût | Usage typique possible |
|---|---|---|---|
| 8 | Tourner A **et** B en même temps | ⭐ naturel (c'est l'ardoise magique !) | dessin X/Y, déplacer un curseur 2D |
| 9 | Maintenir ▶ + tourner A | ⭐⭐ | "shift global" — raccourci rapide |
| 10 | Maintenir ▶ + tourner B | ⭐⭐ | idem, 2ᵉ raccourci |
| 11 | Maintenir ▶ + clic A | ⭐⭐ | raccourci |
| 12 | Maintenir ▶ + clic B | ⭐⭐ | raccourci |
| 13 | Clic A + clic B simultanés | ⭐⭐ (2 mains) | action spéciale : menu système, sauvegarde rapide |
| 14 | Maintenir clic A + tourner B | ⭐⭐⭐ (2 mains, croisé) | réglage fin, à réserver |
| 15 | Maintenir clic B + tourner A | ⭐⭐⭐ | idem |
| 16 | Les 3 appuyés ensemble | ⭐⭐⭐⭐ caché | reset usine / mode diagnostic |

**Total ≈ 30 gestes distincts** (en comptant chaque élément séparément). Bien trop pour tout utiliser :
une bonne grammaire en garde **8 à 10**, toujours avec le **même sens partout**.

### 2.3 Règles de base proposées (indépendantes des menus)

1. **Un geste = un sens, sur tous les écrans.** Ex : "appui long = retour" partout, jamais "appui long = sauver" ailleurs.
2. **Plus une action est destructrice, plus le geste coûte cher** (suppression preset = appui très long + confirmation).
3. **Les gestes cachés (#14-16) ne servent qu'aux fonctions de maintenance.**
4. **Éviter le double-clic** sur un élément dont le clic simple doit être instantané (▶ notamment) [à trancher].
5. **Le ▶ reste toujours play/pause en clic court, quel que soit l'écran.** C'est le seul repère invariable.

---

## 3. Piste de métaphore : l'ardoise magique jusqu'au bout

Sur une ardoise magique : **gauche = horizontal (X), droite = vertical (Y)**. Si on garde ça pour les menus,
tout devient cohérent avec tes idées de balayage :

| | Encodeur A (gauche) = **X / horizontal** | Encodeur B (droite) = **Y / vertical** |
|---|---|---|
| Écrans | glisser d'un écran à l'autre (balayage horizontal) | défiler dans la liste de réglages (scroll) |
| Réglage ouvert | — (ou réglage fin) | monter/descendre la valeur (barre de 14 crans) |
| Mode Dessin | déplacer le curseur en X | déplacer le curseur en Y |

→ L'utilisateur apprend **une seule règle** ("gauche = latéral, droite = vertical"). [à trancher]

Alternative classique : A = *quoi* (navigation), B = *combien* (valeur). Moins poétique, très lisible aussi.

---

## 4. Types d'écrans (tes idées, structurées)

| Type | Contenu | Langage visuel |
|---|---|---|
| **1. Live** — GoL / boîte à rythme | la simulation elle-même | balayage rythmé (colonne de lecture), esthétique propre à chaque mode |
| **2. Presets** | grille de slots | LED **pleine** = slot occupé, **éteinte/pâle** = vide ; nommage ; confirmation de suppression |
| **3. Réglages** — son ou GoL | curseur (valeur continue) ou liste d'options | colonnes 0 et 15 allumées = "on est dans un réglage" ; barres horizontales de **14 crans** (colonnes 1→14) ; couleur = catégorie ou niveau |
| (4. Overlay) | info temporaire par-dessus le live (ex : BPM qui change) | disparaît seul après ~1,5 s [à trancher] |

### Transitions
- **Balayage horizontal** entre écrans → on "glisse" vers un autre écran (cohérent avec A = horizontal).
- **Retour automatique au live** après N secondes sans action [à trancher : 10 s ? jamais ?].

### Le texte sur 16×16 — contrainte de police
- Police **3×5 px** + 1 px d'espace → **4 caractères par ligne** (4×3 + 3 = 15 px).
- 2 lignes de texte = 11 lignes (5+1+5) → reste **5 lignes** pour une barre/indicateur.
- Donc noms limités à **4 caractères** visibles (ou défilement horizontal type bandeau). Ex : `JAPN`, `PENT`, `B3S23`→ défile.
- Ta photo `20261024_boitier_dessus_texte.jpg` montre déjà ce rendu : lisible ✅.

### Couleurs [à trancher]
- Une couleur par **catégorie** : ex. son = cyan, GoL = vert, lumière = ambre, système = blanc.
- Une variation de luminosité/teinte par **niveau** dans la barre (froid → chaud).
- Rouge réservé aux actions destructrices (suppression, reset).

---

## 5. Inventaire des réglages — premier jet à compléter ensemble

Valeurs issues de `include/config.h` quand elles existent. Fréquence = estimation, à corriger.

| Catégorie | Réglage | Type | Plage / options | Défaut | Fréquence |
|---|---|---|---|---|---|
| Transport | Play / Pause | action | — | — | 🔥 permanente |
| Transport | Nouvelle graine (reset grille) | action | — | — | 🔥 fréquente |
| Son | Volume | curseur | 0–100 % | 70 | 🔥 fréquente |
| Son | BPM | curseur | 10–60 | 30 | 🔥 fréquente |
| Son | Gamme | liste | Japonaise, Penta, Penta min, Lydien, Mixolydien, Phrygien dom | Japonaise | ⭐ moyenne |
| Son | Tonalité (note de base) | liste | 12 notes | La | ⭐ moyenne |
| Son | Octave | curseur | 1–5 | 3 | ⭐ moyenne |
| Son | Timbre | liste | presets Mozzi (cristal…) | 0 | ⭐ moyenne |
| Son | Mute (lumière seule) | bascule | on/off | off | ⭐ moyenne |
| Rythme | Boîte à rythme on/off + pattern | liste | ? | ? | ⭐ moyenne |
| GoL | Règle | liste | B6S567, B5S45, B4S5, B5S5, B36S23, B4S45, B3S23 | 0 | ⭐ moyenne |
| GoL | Vitesse génération (lien BPM) | liste | 1 mesure / ½ mesure | ? | 💤 rare |
| GoL | Densité graine aléatoire | curseur | ? | ? | 💤 rare |
| GoL | Formes prédéfinies | liste | glider, blinker… | — | ⭐ moyenne |
| Dessin | Mode dessin (placer/effacer) | mode | — | — | ⭐ moyenne |
| Lumière | Luminosité | curseur | 0–255 | 80 | ⭐ moyenne |
| Lumière | Palette / couleurs des cellules | liste | ? | ? | 💤 rare |
| MIDI | Canal MIDI OUT | curseur | 1–16 | ? | 💤 rare |
| MIDI | MIDI on/off | bascule | | | 💤 rare |
| Presets | Sauver / charger / nommer / supprimer | actions | N slots (? 16 = une ligne, 64 = 4 lignes…) | — | ⭐ moyenne |
| Système | Retour auto au live (délai) | liste | ? | ? | 💤 rare |
| Système | Reset usine / diagnostic | action | — | — | 💤 très rare |

**Principe** : 🔥 fréquent → accessible par un geste direct depuis le live (sans menu).
⭐ moyen → 1 niveau de menu. 💤 rare → fond de menu.

---

## 6. Décisions prises

| Date | Décision | Pourquoi |
|---|---|---|
| 2026-10-24 | **Écran live : molette gauche (A) = luminosité, molette droite (B) = volume**, en rotation simple, sans menu | Gestes universels (lampe + radio), aucun risque de "casser" la musique par erreur ; volume 0 = mode lumière seule, luminosité min = mode nuit — sans menu dédié |
| 2026-10-24 | Luminosité : **plancher** — jamais 100 % noir (minimum visible ou pixel qui "respire" au cran 0) | Sinon la boîte paraît éteinte/en panne |
| 2026-10-24 | Volume 0 : **icône mute** affichée 1–2 s | Éviter de croire à une panne de son |
| 2026-10-24 | Luminosité = retour visuel implicite (l'écran change) ; volume = overlay barre temporaire | |

→ Conséquence : BPM, gamme, etc. passent tous par le menu.

---

## 7. Questions ouvertes pour la prochaine séance

1. Métaphore ardoise (A = X, B = Y) ou classique (A = quoi, B = combien) ?
2. Quels réglages 🔥 méritent un accès direct depuis le live ? (Volume ? BPM ? les deux ?)
3. Boîte à rythme : écran à part, ou superposée au GoL ?
4. Combien de slots de presets ? Que contient un preset (grille + son, ou son seul) ?
5. Réglages sauvegardés à l'extinction (NVS) : tous, ou seulement certains ?
6. Que montre l'écran à l'allumage (animation de démarrage ? dernier état ?)
