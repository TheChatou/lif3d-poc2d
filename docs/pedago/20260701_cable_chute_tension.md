# Câbles — Chute de tension et dimensionnement
> Session du 2026-07-01 — contexte LIF2D (LRS-75-5 5V/14A)

---

## Le problème central à 5V

À 12V ou 24V, quelques millivolts perdus dans un câble, ça ne change rien.
À **5V**, c'est critique : le WS2812B refuse de s'allumer sous 4.5V, l'ESP32 redémarre sous 4.7V.

**Règle électricienne : chute de tension max = 3% de Vcc**
Pour 5V → max **0.15V** de perte dans les câbles. C'est serré.

---

## La formule fondamentale

```
ΔV = (2 × L × I × ρ) / S
```

| Symbole | Signification | Valeur |
|---|---|---|
| **ΔV** | Chute de tension (V) | à calculer |
| **L** | Longueur ONE-WAY en mètres | ta distance physique |
| **I** | Courant en Ampères | ce que le circuit tire |
| **ρ** | Résistivité cuivre à 20°C | **0.0175 Ω·mm²/m** |
| **S** | Section du fil en mm² | écrit sur le câble |

> Le **× 2** dans la formule = aller + retour. L'électricité doit faire le chemin dans les deux sens.

### Exemple concret LIF2D

Circuit principal LRS-75-5 → LEDs (10A max, câble 1m, section 2.5mm²) :
```
ΔV = (2 × 1 × 10 × 0.0175) / 2.5
   = 0.35 / 2.5
   = 0.14V  ✅ (juste en dessous de 0.15V limite)
```

Même câble, 1.5m de long :
```
ΔV = (2 × 1.5 × 10 × 0.0175) / 2.5 = 0.21V  ❌ trop
→ Il faut du 4mm² ou réduire la longueur
```

Avec 4mm² et 1.5m :
```
ΔV = (2 × 1.5 × 10 × 0.0175) / 4 = 0.131V  ✅
```

---

## Sections courantes et AWG correspondant

| mm² | AWG | Courant max (conduit) | Usage typique |
|---|---|---|---|
| 0.5mm² | AWG 20 | ~3A | Signaux, petites LED |
| 0.75mm² | AWG 18 | ~6A | Éclairage, Arduino |
| 1.0mm² | AWG 17 | ~10A | Alimentation légère |
| **1.5mm²** | **AWG 15** | **13A** | **Bon choix LED matrix** |
| **2.5mm²** | **AWG 13** | **20A** | **Alimentation principale** |
| 4.0mm² | AWG 11 | 27A | Gros circuits |

> AWG = American Wire Gauge — plus le chiffre est **petit**, plus le fil est **épais**.

---

## Tableau précalculé pour LIF2D

Conditions : 5V, 10A (LEDs + ESP32 + audio), limite 0.15V

| Section | Longueur max (0.15V) | Longueur max (0.25V = 5%) |
|---|---|---|
| 1.5mm² | 0.64m | 1.07m |
| 2.5mm² | 1.07m | 1.79m |
| 4.0mm² | 1.71m | 2.86m |

**Recommandation LIF2D** :
- Câble LRS-75-5 → point d'injection LED : **2.5mm² rouge/noir**
- Câbles internes (ESP32, audio, < 20cm) : **0.75mm² ou 1mm²** suffit

---

## Injection de puissance sur la matrice LED

Le WS2812B 16×16 = 256 LEDs sur une longue bande. Si tu branches +5V et GND seulement au début :
- Les LEDs du fond reçoivent une tension plus basse → couleurs décalées, rouge vire orange
- Solution : **injection d'alimentation aux deux bouts** (ou au milieu)

```
LRS-75-5 (+) ──┬── debut matrice (+)
               └── fin matrice (+)
LRS-75-5 (-) ──┬── debut matrice (-)
               └── fin matrice (-)
```

Avec injection double, la longueur effective de parcours = L/2 → chute de tension divisée par 4 (L et I divisés).

---

## Calculateurs en ligne utiles

Chercher : **"voltage drop calculator"** ou **"calculateur chute de tension"**

Les bons outils demandent :
- Tension d'alimentation (5V)
- Courant (A)
- Longueur du câble (m)
- Section en mm² ou AWG
- Matériau (cuivre)
- Nombre de conducteurs (2 pour DC = aller + retour)

Sites de référence sérieux : Nexans, Schneider Electric, Legrand publient des calculateurs professionnels. Omni Calculator (omnicalculator.com) a un bon "Voltage Drop Calculator" en anglais.

---

## Pièges à éviter

1. **Confondre L et 2L** — toujours × 2 pour DC (aller + retour)
2. **Calculer avec le courant crête, pas la moyenne** — protège contre les pires cas
3. **Ignorer la résistance des connecteurs** — chaque Dupont/JST ajoute ~20mΩ, 10 connecteurs = 0.2Ω de plus
4. **Utiliser du câble souple de récupération** — la section nominale peut être du marketing, mesure la résistance avec un multimètre
5. **Sous-dimensionner le GND** — GND doit avoir la même section que le +5V, c'est aussi lui qui porte le courant

---

## Câble secteur — marquage HONGYA AWM I A 105°C 600V FT1

C'est un câble d'alimentation secteur certifié UL, parfaitement adapté pour relier une prise 230V au LRS-75-5.

| Marquage | Signification |
|---|---|
| **AWM** | Appliance Wiring Material — norme UL 758 (câble interne d'appareil) |
| **I A** | Style UL 2468 (2 conducteurs plats) ou câble multiconducteur type A |
| **105°C** | Température de service maximale (classe A) |
| **600V** | Tension de service maximale — largement au-dessus des 230V secteur |
| **FT1** | Flame Test 1 — résistance au feu certifiée (normes UL 94) |

Ce câble est **safe** pour du 230V AC. Le branchement sur L, N, ⏚ du LRS s'y fait via les bornes à vis de l'alim.

---

## AWG 22 de la matrice — vraie contrainte vs mythe

La matrice WS2812B flexible 16×16 est livrée avec des câbles **22AWG = 0.33mm²**.

### La vraie limitation n'est pas le câble externe

Source : QuinLED (référence absolue communauté LED adressable) :
> *"The limitation is determined by the strip's internal copper traces, not the external wiring."*

**La limite réelle = les pistes cuivre internes du PCB flexible**, pas les câbles soudés sur les pads.

Capacités mesurées par point d'injection :
- **Injection au bord (début ou fin)** : ~4A max
- **Injection au milieu** : ~8A max

Peu importe la section du câble externe — tu ne dépasseras jamais ces limites imposées par les traces internes.

### Consommation réelle LIF2D (GoL Dense)

```
GoL Dense B6/S567 → ~4.4% de cellules actives
= 256 × 4.4% ≈ 11 LEDs actives
= 11 × 60mA ≈ 660mA total
```

À cette consommation, même du 22AWG à 40cm ne pose aucun problème.

### Épaisseur max à souder sur les pads de la matrice

Les pastilles de soudure sur un flexible WS2812B sont des zones étamées de ~2-3mm.
- **22-20AWG (0.33-0.5mm²)** = idéal, se soude facilement
- **18AWG (0.75mm²)** = max confortable selon QuinLED — épaisseur limite
- **1.5mm² rigide** = TROP ÉPAIS pour ces pads — difficile à souder, risque d'arracher la piste

**Garder les câbles 22AWG d'origine de la matrice.** Pour ajouter un point d'injection, utiliser du câble souple multi-brin 22-20AWG, jamais du rigide.

### Avec injection au milieu (2ème entrée 5V/GND)

Si la matrice a une entrée au milieu + une au début :
- Chaque moitié = 128 LEDs, max ~4A chacune
- Longueur effective de câble divisée par 2

```
ΔV (22AWG, 25cm, 4A max par point) :
= (2 × 0.25 × 4 × 0.0175) / 0.33 = 0.106V  ✅ acceptable
```

En usage GoL réel (~1A total) :
```
= (2 × 0.25 × 1 × 0.0175) / 0.33 = 0.027V  ✅ trivial
```

---

## Dimensionnement par composant LIF2D (calculs précis)

Hypothèse de longueur : boîtier compact, câbles < 40cm.

### ④ LRS-75-5 → ESP32

- Courant max : **0.5A** (WiFi actif, tous GPIOs chargés)
- Section : **0.75mm² (AWG 18)**
- ΔV à 40cm : `(2 × 0.4 × 0.5 × 0.0175) / 0.75 = 0.009V` ✅ négligeable

### ⑤ LRS-75-5 → WS2812B 16×16

La matrice a 2 points d'injection : début + milieu. Chacun est limité à ~4A par les traces internes.

- **Câble LRS → Wago distribution** : 1.5mm² (câble libre entre bornes à vis, peut être plus épais)
- **Câble Wago → pads matrice** : 22-20AWG souple multi-brin (max soudable sur les pads = 18AWG)
- Courant réel GoL Dense : ~660mA total → zéro problème quelque soit le câble

ΔV câble interne 22AWG, 25cm, 4A (worst case par point) :
`(2 × 0.25 × 4 × 0.0175) / 0.33 = 0.106V` ✅

ΔV usage GoL réel (~1A total) :
`(2 × 0.25 × 1 × 0.0175) / 0.33 = 0.027V` ✅ trivial

### ⑥ LRS-75-5 → PAM8403

- Courant max : **~1.5A** (3W × 2 canaux / 5V / rendement 80%)
- Section : **0.75mm² (AWG 18)**
- ΔV à 40cm : `(2 × 0.4 × 1.5 × 0.0175) / 0.75 = 0.028V` ✅ excellent

---

## Connexions sans breadboard — méthodes

Sans breadboard, tu as plusieurs options pour distribuer le +5V et GND vers plusieurs composants.

### Option 1 : Wago 221 — recommandé pour LIF2D

Les **Wago 221** ("lever nuts") sont des connecteurs à levier orange/gris. Aucune soudure, réutilisables, certifiés jusqu'à 32A.

| Référence | Fils | Usage |
|---|---|---|
| Wago 221-412 | 2 fils, jusqu'à 4mm² | Connexion simple |
| Wago 221-413 | 3 fils, jusqu'à 4mm² | Nœud de distribution 3 branches |
| Wago 221-415 | 5 fils, jusqu'à 4mm² | Bus de distribution |

**Schéma de distribution LIF2D avec Wago :**
```
LRS V+ ──► Wago 221-415 ──┬── câble 1.5mm² → +5V matrice (début)
                           ├── câble 1.5mm² → +5V matrice (fin)
                           ├── câble 0.75mm² → +5V ESP32
                           └── câble 0.75mm² → +5V PAM8403

LRS V- ──► Wago 221-415 ──┬── câble 1.5mm² → GND matrice (début)
                           ├── câble 1.5mm² → GND matrice (fin)
                           ├── câble 0.75mm² → GND ESP32
                           └── câble 0.75mm² → GND PAM8403
```

### Option 2 : Stripboard (Veroboard) comme bus

Prendre une petite plaque de stripboard et utiliser une piste de cuivre comme bus de distribution.
- Avantage : propre, compact, zéro connecteur supplémentaire
- Souder le câble épais de l'alim en entrée, les câbles fins vers les composants en sortie

### Option 3 : Bornier à vis (domino)

Borniers électriciens classiques à vis. Fiables, cheap, disponibles partout.
- Prendre un bloc à 4-5 bornes
- Relier les bornes côte-à-côte par un cavalier de cuivre (fil court soudé)
- Brancher une borne = V+ alim, les autres = départ vers composants

### Règles de sécurité communes

1. **GND commun obligatoire** — relier le GND du LRS, de l'ESP32, de la matrice et du PAM8403 sur le même nœud
2. **Ne pas mixer les sections** — dans un Wago, ne pas mélanger du 0.5mm² et du 2.5mm² (le petit n'aura pas de contact fiable)
3. **Serrage correct** — avec les borniers à vis, trop serré = fil écrasé, pas assez = résistance de contact
4. **Pas de fil nu** — toute épissure doit être dans un connecteur ou sous gaine thermorétractable

---

## Vérification au multimètre

Avant de brancher la matrice :
1. Régler multimètre en DC Volts
2. Mesurer entre les bornes **+5V et GND de l'ESP32** (pas à la sortie du LRS)
3. Si < 4.85V avec charge → câble trop fin ou trop long

Chute acceptable en charge complète : < 0.15V, idéalement < 0.10V.

### Test de résistance de câble (vérification qualité)

Si tu doutes de la vraie section d'un câble récupéré :
1. Couper 1m du câble
2. Multimètre en mode Ω, mesurer entre les deux bouts
3. Comparer avec la table théorique :

| Section | Résistance théorique pour 1m |
|---|---|
| 0.75mm² | 0.023Ω |
| 1.5mm² | 0.012Ω |
| 2.5mm² | 0.007Ω |

Si tu mesures 3× plus que la valeur théorique → le câble est sous-dimensionné ou dégradé, ne pas l'utiliser.
