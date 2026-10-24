# LIF2D — Étude des typographies pour la matrice 16×16

> 2026-10-24 — Hors maquettes d'écrans : quelles polices, quelle taille, quelle lisibilité.
> Suite de `20261024_ecrans_maquettes_16x16.md`. Légende : `●` allumée, espace = éteinte.

---

## 1. Combien de LEDs en hauteur au maximum ?

Tout dépend du **nombre de lignes de texte** qu'on veut afficher en même temps (avec 1 LED d'interligne) :

| Lignes de texte | Hauteur max d'une lettre | Calcul | Exemple |
|---|---|---|---|
| **3 lignes** | **4 LEDs** | 4 + 1 + 4 + 1 + 4 = 14 | police 3×4 |
| **2 lignes** | **7 LEDs** | 7 + 1 + 7 = 15 | 3×5, 4×6, 5×7 |
| **1 ligne** | **16 LEDs** | tout l'écran | caractères géants, ou texte défilant |

Et en largeur (1 LED d'espace entre les lettres) :

| Largeur d'une lettre | Lettres par ligne | Calcul |
|---|---|---|
| 3 LEDs | **4** | 3 + 1 + 3 + 1 + 3 + 1 + 3 = 15 |
| 4 LEDs | **3** | 4 + 1 + 4 + 1 + 4 = 14 |
| 5 LEDs | **2** | 5 + 1 + 5 = 11 (3 lettres = 17, ça déborde) |
| proportionnelle | 3 à 6 | dépend des lettres (I = 1 LED, M = 5 LEDs) |

🎓 **Le vrai compromis** : plus la police est petite, plus on écrit de texte d'un coup, mais plus certaines lettres se ressemblent.
Avec 3 LEDs de large, il n'existe qu'**une seule colonne centrale** pour faire la différence entre M, N, W et H.

---

## 2. Les candidates, alphabet complet

### 2.1 Police 3×4 — la plus petite possible (3 lignes de 4 lettres)

```
  A       B       C       D       E       F       G       H  
  ●     ● ●     ● ● ●   ● ●     ● ● ●   ● ● ●   ● ● ●   ●   ●
●   ●   ● ● ●   ●       ●   ●   ● ●     ●       ●       ● ● ●
● ● ●   ●   ●   ●       ●   ●   ●       ● ●     ●   ●   ●   ●
●   ●   ● ●     ● ● ●   ● ●     ● ● ●   ●       ● ● ●   ●   ●

  I       J       K       L       M       N       O       P  
● ● ●       ●   ●   ●   ●       ● ● ●   ● ●     ● ● ●   ● ● ●
  ●         ●   ● ●     ●       ● ● ●   ●   ●   ●   ●   ●   ●
  ●     ●   ●   ●   ●   ●       ●   ●   ●   ●   ●   ●   ● ● ●
● ● ●   ● ● ●   ●   ●   ● ● ●   ●   ●   ●   ●   ● ● ●   ●    

  Q       R       S       T       U       V       W       X  
● ● ●   ● ●       ● ●   ● ● ●   ●   ●   ●   ●   ●   ●   ●   ●
●   ●   ●   ●   ●         ●     ●   ●   ●   ●   ●   ●     ●  
● ● ●   ● ●         ●     ●     ●   ●   ●   ●   ● ● ●     ●  
    ●   ●   ●   ● ●       ●     ● ● ●     ●     ● ● ●   ●   ●

  Y       Z       0       1       2       3       4       5  
●   ●   ● ● ●   ● ● ●     ●     ● ●     ● ● ●   ●   ●   ● ● ●
●   ●       ●   ●   ●   ● ●         ●     ● ●   ●   ●   ● ●  
  ●     ●       ●   ●     ●     ●           ●   ● ● ●       ●
  ●     ● ● ●   ● ● ●   ● ● ●   ● ● ●   ● ● ●       ●   ● ●  

  6       7       8       9  
●       ● ● ●   ● ● ●   ● ● ●
● ● ●       ●   ● ● ●   ●   ●
●   ●     ●     ●   ●   ● ● ●
● ● ●     ●     ● ● ●       ●
```

⚠️ Beaucoup de lettres et chiffres deviennent **identiques ou presque** : O = 0, B ≈ 8, S ≈ 5, M ≈ H, Q ≈ 9.
Lisible seulement **si on sait déjà quel mot on attend** (ex : un libellé de menu qu'on a déjà vu).

### 2.2 Police 3×5 — la plus petite police "vraiment lisible"

```
  A       B       C       D       E       F       G       H  
  ●     ● ●       ● ●   ● ●     ● ● ●   ● ● ●     ● ●   ●   ●
●   ●   ●   ●   ●       ●   ●   ●       ●       ●       ●   ●
● ● ●   ● ●     ●       ●   ●   ● ●     ● ●     ●   ●   ● ● ●
●   ●   ●   ●   ●       ●   ●   ●       ●       ●   ●   ●   ●
●   ●   ● ●       ● ●   ● ●     ● ● ●   ●         ● ●   ●   ●

  I       J       K       L       M       N       O       P  
● ● ●       ●   ●   ●   ●       ●   ●   ● ●       ●     ● ●  
  ●         ●   ●   ●   ●       ● ● ●   ●   ●   ●   ●   ●   ●
  ●         ●   ● ●     ●       ● ● ●   ●   ●   ●   ●   ● ●  
  ●     ●   ●   ●   ●   ●       ●   ●   ●   ●   ●   ●   ●    
● ● ●     ●     ●   ●   ● ● ●   ●   ●   ●   ●     ●     ●    

  Q       R       S       T       U       V       W       X  
  ●     ● ●       ● ●   ● ● ●   ●   ●   ●   ●   ●   ●   ●   ●
●   ●   ●   ●   ●         ●     ●   ●   ●   ●   ●   ●   ●   ●
●   ●   ● ●       ●       ●     ●   ●   ●   ●   ● ● ●     ●  
● ●     ●   ●       ●     ●     ●   ●   ●   ●   ● ● ●   ●   ●
  ● ●   ●   ●   ● ●       ●     ● ● ●     ●     ●   ●   ●   ●

  Y       Z       0       1       2       3       4       5  
●   ●   ● ● ●   ● ● ●     ●     ● ●     ● ●     ●   ●   ● ● ●
●   ●       ●   ●   ●   ● ●         ●       ●   ●   ●   ●    
  ●       ●     ●   ●     ●       ●       ●     ● ● ●   ● ●  
  ●     ●       ●   ●     ●     ●           ●       ●       ●
  ●     ● ● ●   ● ● ●   ● ● ●   ● ● ●   ● ●         ●   ● ●  

  6       7       8       9  
  ● ●   ● ● ●   ● ● ●   ● ● ●
●           ●   ●   ●   ●   ●
● ● ●     ●     ● ● ●   ● ● ●
●   ●     ●     ●   ●       ●
● ● ●     ●     ● ● ●   ● ●  
```

C'est la taille des polices pixel classiques les plus connues (type "Tom Thumb"). Toutes les lettres restent distinctes,
avec des faiblesses sur **M, N, W** (3 LEDs de large, c'est serré) et un peu sur K/X.

### 2.3 Police 3×5 proportionnelle — on élargit seulement les lettres qui en ont besoin

```
I       M          N          W        1 
●   ●       ●   ●     ●   ●       ●     ●
●   ● ●   ● ●   ● ●   ●   ●       ●   ● ●
●   ●   ●   ●   ●   ● ●   ●   ●   ●     ●
●   ●       ●   ●     ●   ● ●   ● ●     ●
●   ●       ●   ●     ●   ●       ●     ●
```

I sur 1 LED, M/W sur 5, N sur 4. **Nettement plus lisible** que la 3×5 fixe, mais le nombre de lettres par ligne varie :
de 3 à 6 selon les lettres ("MINI" tient, "MMMM" non). Attention : "JAPON" (5 lettres) ne tient dans **aucune** police sans défilement (voir §3), d'où les abréviations à 4 lettres type `JAPN`.

### 2.4 Police 5×7 — la police "enseigne LED" classique (2 lettres par ligne)

```
    A           B           C           D           E           F    
  ● ● ●     ● ● ● ●       ● ● ●     ● ● ●       ● ● ● ● ●   ● ● ● ● ●
●       ●   ●       ●   ●       ●   ●     ●     ●           ●        
●       ●   ●       ●   ●           ●       ●   ●           ●        
● ● ● ● ●   ● ● ● ●     ●           ●       ●   ● ● ● ●     ● ● ● ●  
●       ●   ●       ●   ●           ●       ●   ●           ●        
●       ●   ●       ●   ●       ●   ●     ●     ●           ●        
●       ●   ● ● ● ●       ● ● ●     ● ● ●       ● ● ● ● ●   ●        

    G           H           I           J           K           L    
  ● ● ●     ●       ●     ● ● ●         ● ● ●   ●       ●   ●        
●       ●   ●       ●       ●             ●     ●     ●     ●        
●           ●       ●       ●             ●     ●   ●       ●        
●   ● ● ●   ● ● ● ● ●       ●             ●     ● ●         ●        
●       ●   ●       ●       ●             ●     ●   ●       ●        
●       ●   ●       ●       ●       ●     ●     ●     ●     ●        
  ● ● ● ●   ●       ●     ● ● ●       ● ●       ●       ●   ● ● ● ● ●

    M           N           O           P           Q           R    
●       ●   ●       ●     ● ● ●     ● ● ● ●       ● ● ●     ● ● ● ●  
● ●   ● ●   ●       ●   ●       ●   ●       ●   ●       ●   ●       ●
●   ●   ●   ● ●     ●   ●       ●   ●       ●   ●       ●   ●       ●
●   ●   ●   ●   ●   ●   ●       ●   ● ● ● ●     ●       ●   ● ● ● ●  
●       ●   ●     ● ●   ●       ●   ●           ●   ●   ●   ●   ●    
●       ●   ●       ●   ●       ●   ●           ●     ●     ●     ●  
●       ●   ●       ●     ● ● ●     ●             ● ●   ●   ●       ●

    S           T           U           V           W           X    
  ● ● ● ●   ● ● ● ● ●   ●       ●   ●       ●   ●       ●   ●       ●
●               ●       ●       ●   ●       ●   ●       ●   ●       ●
●               ●       ●       ●   ●       ●   ●       ●     ●   ●  
  ● ● ●         ●       ●       ●   ●       ●   ●   ●   ●       ●    
        ●       ●       ●       ●   ●       ●   ●   ●   ●     ●   ●  
        ●       ●       ●       ●     ●   ●     ●   ●   ●   ●       ●
● ● ● ●         ●         ● ● ●         ●         ●   ●     ●       ●

    Y           Z           0           1           2           3    
●       ●   ● ● ● ● ●     ● ● ●         ●         ● ● ●     ● ● ● ● ●
●       ●           ●   ●       ●     ● ●       ●       ●         ●  
  ●   ●           ●     ●     ● ●       ●               ●       ●    
    ●           ●       ●   ●   ●       ●             ●           ●  
    ●         ●         ● ●     ●       ●           ●               ●
    ●       ●           ●       ●       ●         ●         ●       ●
    ●       ● ● ● ● ●     ● ● ●       ● ● ●     ● ● ● ● ●     ● ● ●  

    4           5           6           7           8           9    
      ●     ● ● ● ● ●       ● ●     ● ● ● ● ●     ● ● ●       ● ● ●  
    ● ●     ●             ●                 ●   ●       ●   ●       ●
  ●   ●     ● ● ● ●     ●                 ●     ●       ●   ●       ●
●     ●             ●   ● ● ● ●         ●         ● ● ●       ● ● ● ●
● ● ● ● ●           ●   ●       ●     ●         ●       ●           ●
      ●     ●       ●   ●       ●     ●         ●       ●         ●  
      ●       ● ● ●       ● ● ●       ●           ● ● ●       ● ●    
```

C'est la police des afficheurs LCD/LED historiques : **la plus lisible**, aucune ambiguïté (le 0 est barré).
Mais seulement **2 lettres par ligne** : à réserver au **texte défilant** ou aux **mots-clés très courts**.

---

## 3. Le même mot dans chaque police

`┆` = bord droit de l'écran (16 LEDs). Ce qui est à droite ne tient pas sans défilement.

**3×4**
```
    ●     ●     ● ● ●   ● ● ●   ┆ ● ●
    ●   ●   ●   ●   ●   ●   ●   ┆ ●   ●
●   ●   ● ● ●   ● ● ●   ●   ●   ┆ ●   ●
● ● ●   ●   ●   ●       ● ● ●   ┆ ●   ●
```

**3×5**
```
    ●     ●     ● ●       ●     ┆ ● ●
    ●   ●   ●   ●   ●   ●   ●   ┆ ●   ●
    ●   ● ● ●   ● ●     ●   ●   ┆ ●   ●
●   ●   ●   ●   ●       ●   ●   ┆ ●   ●
  ●     ●   ●   ●         ●     ┆ ●   ●
```

**3×5 proportionnelle**
```
    ●     ●     ● ●       ●     ┆ ●     ●
    ●   ●   ●   ●   ●   ●   ●   ┆ ● ●   ●
    ●   ● ● ●   ● ●     ●   ●   ┆ ●   ● ●
●   ●   ●   ●   ●       ●   ●   ┆ ●     ●
  ●     ●   ●   ●         ●     ┆ ●     ●
```

**5×7**
```
    ● ● ●     ● ● ●     ● ● ● ● ┆       ● ● ●     ●       ●
      ●     ●       ●   ●       ┆ ●   ●       ●   ●       ●
      ●     ●       ●   ●       ┆ ●   ●       ●   ● ●     ●
      ●     ● ● ● ● ●   ● ● ● ● ┆     ●       ●   ●   ●   ●
      ●     ●       ●   ●       ┆     ●       ●   ●     ● ●
●     ●     ●       ●   ●       ┆     ●       ●   ●       ●
  ● ●       ●       ●   ●       ┆       ● ● ●     ●       ●
```

**Grands chiffres 4×6** (pour les valeurs)
```
    ●       ● ●       ● ●       ┆
  ● ●     ●     ●   ●     ●     ┆
    ●           ●   ●     ●     ┆
    ●         ●     ●     ●     ┆
    ●       ●       ●     ●     ┆
  ● ● ●   ● ● ● ●     ● ●       ┆
```

---

## 4. Plusieurs polices en même temps ? Oui

### 4.1 Techniquement : aucun souci

Une police, c'est juste un **tableau de bits** rangé en mémoire flash :

| Police | Taille mémoire (36 caractères) |
|---|---|
| 3×4 | 36 × 12 bits ≈ **54 octets** |
| 3×5 | 36 × 15 bits ≈ **68 octets** |
| 5×7 | 36 × 35 bits ≈ **158 octets** |

La flash de l'ESP32 fait **4 Mo** (4 000 000 octets) : on pourrait y ranger des milliers de polices.
🎓 Afficher du texte = parcourir les bits du caractère et allumer la LED correspondante : quelques microsecondes, rien à voir avec la charge audio.

### 4.2 Côté design : une police par rôle

Mélanger les polices **sur le même écran**, c'est même recommandé, à condition que chaque police ait **un rôle fixe** :

| Rôle | Police proposée |
|---|---|
| Libellé (le "titre" de l'écran : BPM, GAMM…) | 3×5, en **faible** |
| Valeur chiffrée (120, 70 %) | grands chiffres 4×6, en **vif** |
| Valeur texte (JAPN, PENT…) | 3×5 (ou 3×5 proportionnelle) |
| Nom complet / message (JAPONAISE, SAUVÉ !) | 5×7 en **défilement** |
| Écran très chargé (3 infos d'un coup) | 3×4, en dernier recours |

### 4.3 Mises en page possibles dans 16×16

**3 lignes en 3×4** (le maximum d'infos d'un coup) :
```
┌─────────────────────────────────┐
│       ○ ○   ○ ○ ○   ○ ○ ○       │
│     ○       ○ ○       ○         │
│         ○   ○         ○         │
│     ○ ○     ○ ○ ○     ○         │
│                                 │
│     ● ●     ● ● ●   ● ● ●       │
│     ● ● ●   ●   ●   ● ● ●       │
│     ●   ●   ● ● ●   ●   ●       │
│     ● ●     ●       ●   ●       │
│                                 │
│       ●     ● ●     ● ● ●       │
│     ● ●         ●   ●   ●       │
│       ●     ●       ●   ●       │
│     ● ● ●   ● ● ●   ● ● ●       │
│                                 │
│                                 │
└─────────────────────────────────┘
```

**2 lignes en 3×5** (libellé faible + valeur) :
```
┌─────────────────────────────────┐
│                                 │
│   ○ ○     ○     ○   ○   ○   ○   │
│ ○       ○   ○   ○ ○ ○   ○ ○ ○   │
│ ○   ○   ○ ○ ○   ○ ○ ○   ○ ○ ○   │
│ ○   ○   ○   ○   ○   ○   ○   ○   │
│   ○ ○   ○   ○   ○   ○   ○   ○   │
│                                 │
│                                 │
│                                 │
│     ●     ●     ● ●     ● ●     │
│     ●   ●   ●   ●   ●   ●   ●   │
│     ●   ● ● ●   ● ●     ●   ●   │
│ ●   ●   ●   ●   ●       ●   ●   │
│   ●     ●   ●   ●       ●   ●   │
│                                 │
│                                 │
└─────────────────────────────────┘
```

**Mélange : libellé 3×5 + valeur en grands chiffres 4×6** (déjà utilisé dans la maquette SET BPM) :
```
┌─────────────────────────────────┐
│     ○ ○     ○ ○     ○   ○       │
│     ○   ○   ○   ○   ○ ○ ○       │
│     ○ ○     ○ ○     ○ ○ ○       │
│     ○   ○   ○       ○   ○       │
│     ○ ○     ○       ○   ○       │
│                                 │
│                                 │
│       ●       ● ●       ● ●     │
│     ● ●     ●     ●   ●     ●   │
│       ●           ●   ●     ●   │
│       ●         ●     ●     ●   │
│       ●       ●       ●     ●   │
│     ● ● ●   ● ● ● ●     ● ●     │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

**5×7 en défilement** (instantané : le mot "JAPON" en train de défiler, on voit "JA") :
```
┌─────────────────────────────────┐
│                                 │
│                                 │
│                                 │
│                                 │
│         ● ● ●     ● ● ●         │
│           ●     ●       ●       │
│           ●     ●       ●       │
│           ●     ● ● ● ● ●       │
│           ●     ●       ●       │
│     ●     ●     ●       ●       │
│       ● ●       ●       ●       │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

---

## 5. Qu'est-ce qui est le plus lisible sur TA matrice ?

Ce qui joue, dans l'ordre :

1. **La forme des lettres, pas leur taille physique.** Ta matrice fait environ 16 cm, soit à peu près **1 cm par LED**.
   Une lettre 3×5 fait donc environ 3 × 5 cm : elle est **visible de loin**. Le problème n'est jamais "trop petit à voir",
   c'est "deux lettres qui se ressemblent".
2. **Le diffuseur.** Sur tes photos, chaque LED est dans sa **case carrée** de la grille imprimée : les pixels restent nets,
   avec peu de débordement de lumière d'une case à l'autre. C'est idéal pour les polices pixel.
3. **La luminosité.** Trop fort, le halo "mange" les espaces entre les lettres (visible sur tes photos prises dans le noir).
   Le texte devra être affiché **moins fort** que le GoL.
4. **Le contexte.** Un mot attendu ("BPM" sur l'écran BPM) se lit même en 3×4. Un mot inconnu (nom d'un preset) demande au moins du 3×5.

**Classement de lisibilité (à confirmer sur la vraie matrice) :** 5×7 > 3×5 proportionnelle > 3×5 > 3×4.

---

## 6. Proposition

> ✅ **Décision de Felix (24/10)** : par défaut **3×5, proportionnelle quand c'est possible** ; la 3×4 ponctuellement ; tout texte trop large **défile de droite à gauche** (jamais de retour à la ligne).

- **Police principale : 3×5**, avec les variantes **proportionnelles pour M, N, W, I** quand la place le permet.
- **Grands chiffres 4×6** pour toutes les valeurs numériques.
- **5×7 en défilement** pour les noms complets et les messages.
- **3×4 : pas utilisée** au départ, sauf si un écran a vraiment besoin de 3 lignes.

**Test à faire sur la boîte** (étape suivante possible) : un petit firmware qui fait défiler l'alphabet dans chaque police,
pour juger en vrai, dans le noir et en plein jour. C'est le seul juge fiable.

### Questions

1. Le classement de lisibilité te paraît-il juste en regardant les alphabets ?
2. Proportionnelle (plus lisible) ou largeur fixe (alignements plus réguliers) ?
3. Le texte défilant en 5×7 pour les noms complets, ça te plaît, ou c'est trop lent à lire ?
