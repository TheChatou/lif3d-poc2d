# Bilan de puissance complet — LIF2D Beta 1

> Réécrit le 2026-06-12. Basé sur le CDC validé (v1.0, 2026-06-11).
> Chaîne d'alimentation : **Mean Well LRS-75-5 uniquement** — plus de BF-1220 ni de LM2596S.

---

## 🎓 Trois mots à comprendre avant tout

| Terme | Analogie eau | En pratique |
|---|---|---|
| **Volt (V)** | Pression dans le tuyau | La "hauteur" de tension qu'un composant attend. Donne-lui 12V au lieu de 5V → il grille. |
| **Ampère (A)** | Débit dans le tuyau | La quantité de courant qu'un composant tire. Ton alimentation doit pouvoir en fournir assez. |
| **Watt (W)** | Puissance de la pompe | W = V × A. C'est la vraie mesure de ce que ça consomme. |

Exemple concret : une LED WS2812B pleine puissance consomme 60mA à 5V → 5 × 0.060 = **0.3W** par LED.

---

## La chaîne d'alimentation (validée dans le CDC)

```
Prise 230V AC (secteur)
        │
        ▼
[ Mean Well LRS-75-5 ]
  5V DC / 14A / 70W
  Alimentation industrielle avec protections intégrées
        │
        ├──────────────────────────────────────────────────┐
        │                                                  │
        ▼                                                  ▼
[ ESP32-D dev board ]                            [ WS2812B 16×16 ]
  broche VIN (5V)                                  5V + GND directs
        │                                          (256 LEDs)
        ▼
  [ LDO interne de la carte ]     ← c'est déjà soudé sur ta carte
    5V → 3.3V / automatique
        │
        ├── ESP32 chip
        ├── Encodeurs (signal 3.3V)
        └── Potentiomètres (référence 3.3V)
        │
        ▼
  [ PAM8403 HW-894 ]
    5V + GND directs
        │
        ├── HP gauche 4Ω 3W
        └── HP droit 4Ω 3W
```

**Le principe clé : tout fonctionne à 5V direct. Zéro conversion intermédiaire.**
La LRS-75-5 sort du 5V propre et costaud — elle remplace à elle seule le BF-1220 + LM2596S de l'ancienne chaîne.

> 🎓 **Pourquoi Mean Well et pas une alim de récup ?**
> Mean Well est une marque industrielle. La LRS-75-5 a des protections électroniques intégrées (OCP, OVP, SCP — expliquées plus bas) qui coupent le courant automatiquement si quelque chose se passe mal. Une alim de bazar n'a pas ça, et peut mal finir en cas de court-circuit.

---

## Ce que chaque composant consomme

### 1. Matrice WS2812B 16×16 (256 LEDs)

C'est le **composant le plus gourmand** — de très loin.

Chaque WS2812B contient 3 mini-LEDs : Rouge, Vert, Bleu.
À fond (tout blanc, toutes au max) : **60mA par LED**.

```
Calcul pire cas absolu :
256 LEDs × 60mA = 15 360mA = 15.4A à 5V = 77W
→ La LRS-75-5 (14A max) couperait avant d'atteindre ça
```

**En pratique avec GoL :**

| Scénario | LEDs allumées | Courant estimé |
|---|---|---|
| GoL Dense B6/S567 (4.4% densité) | ~11 LEDs | ~70–200mA |
| GoL Conway classique (~30% densité) | ~76 LEDs | ~400–900mA |
| Toutes les LEDs, couleur unique (rouge) | 256 | ~1 900mA |
| Toutes les LEDs, blanc complet, brightness max | 256 | **~15 360mA** (jamais en pratique) |

**Double protection pour ne jamais atteindre les 14A :**

1. **Protection logicielle (FastLED)** — à mettre dans `setup()` avant le premier `show()` :
   ```cpp
   FastLED.setMaxPowerInVoltsAndMilliamps(5, 10000); // plafond à 10A pour les LEDs
   ```
   → Si un bug allume toutes les LEDs à 100%, FastLED recalcule automatiquement un
   brightness plus bas pour rester sous 10A. Le bug est silencieusement absorbé.

2. **Protection hardware (LRS-75-5 OCP)** — si malgré tout on dépasse 14A, l'alim coupe.

> 🎓 **OCP = Over Current Protection** = protection contre le surintensité.
> C'est un disjoncteur électronique intégré dans l'alimentation. Elle coupe d'elle-même
> si le courant dépasse 14A, sans que tu aies rien à faire. Elle se remet en marche
> toute seule quand la surcharge disparaît (contrairement à un fusible qui grille).

**Tension d'alimentation :** 5V direct depuis la LRS-75-5.

**Signal DATA :** GPIO de l'ESP32 (3.3V). Les WS2812B demandent théoriquement ≥ 3.5V sur DATA.
En pratique : résistance **300Ω en série** sur le fil DATA + câble court (< 20cm) → ça passe.

---

### 2. ESP32-D dev board

La carte prend du **5V sur sa broche VIN** et se débrouille toute seule pour créer son 3.3V interne.

> 🎓 **LDO = Low Dropout Regulator** (régulateur linéaire).
> C'est un petit composant soudé sur ta carte qui convertit 5V → 3.3V.
> Tu n'as rien à faire — il est déjà là. Il convertit en "brûlant" la différence
> en chaleur (5V - 3.3V = 1.7V × courant consommé = chaleur). Pas de souci
> pour les courants qu'on a ici (<300mA).

```
Consommation ESP32 (FreeRTOS actif, WiFi off) :
→ 150mA typique, 280mA max à 5V
```

**Pin 3V3 de la carte :** utilisée pour alimenter les encodeurs et potentiomètres.
Courant maximal sortant de cette pin : ~300–500mA. Nos contrôles consomment ~15mA. Aucun souci.

---

### 3. PAM8403 HW-894 (amplificateur audio)

Reçoit :
- **Signal** : la sortie DAC de l'ESP32 (GPIO25 L, GPIO26 R) → tension analogique 0–3.3V
- **Alimentation** : **5V direct** depuis la LRS-75-5

Il amplifie ce signal pour pousser assez de courant dans les haut-parleurs.

> 🎓 Un GPIO de l'ESP32 peut sortir au max ~40mA. Un haut-parleur de 3W à 4Ω
> a besoin de : I = √(P/R) = √(3/4) = **870mA**. Soit 20× plus que ce que le GPIO peut donner.
> L'ampli est le muscle entre le cerveau (ESP32) et les HP.

```
Consommation PAM8403 selon le volume réglé :
─ Volume 10% → ~50mA
─ Volume 30% → ~300mA (typique usage)
─ Volume 70% → ~1 000mA
─ Volume 100% → ~2 000mA (éviter en continu — peut griller les HP)
```

**⚠ Tes HP sont notés 3W, le PAM8403 peut sortir 5W.**
→ À volume 100% en continu, les HP grillent avant l'ampli. Limite à ~70% en usage normal.

---

### 4. Haut-parleurs 2× 28mm 4Ω 3W

Pas d'alimentation propre — ils sont la **charge de sortie** du PAM8403.
La puissance qu'ils reçoivent dépend du volume.

| Volume PAM8403 | Puissance par HP | Statut |
|---|---|---|
| 30% | ~0.5W | ✅ Très safe |
| 70% | ~2.5W | ✅ OK (sous les 3W max) |
| 100% | ~5W | ⛔ Dépasse 3W → risque de dégât |

---

### 5. Encodeurs EC11, potentiomètres, boutons

Consommation totale : **< 15mA** en 3.3V.
Absolument négligeable dans le bilan global.

---

## Budget de puissance global

### Scénario typique (GoL en fonctionnement normal)

| Composant | Courant | Puissance (5V) |
|---|---|---|
| WS2812B (GoL Dense ~11 LEDs allumées) | ~200mA | ~1W |
| ESP32-D (FreeRTOS, no WiFi) | ~150mA | ~0.75W |
| PAM8403 + HP (volume ~30%) | ~300mA | ~1.5W |
| Encodeurs + pots + boutons | ~15mA | ~0.07W |
| **TOTAL** | **~665mA** | **~3.3W** |

→ LRS-75-5 (14A / 70W) utilisée à **~5% de sa capacité** ✅

---

### Scénario "tout à fond" avec protection logicielle

FastLED.setMaxPowerInVoltsAndMilliamps(5, 10000) plafonne les LEDs à 10A.

| Composant | Courant |
|---|---|
| WS2812B (bridées à 10A par FastLED) | 10 000mA |
| ESP32-D | 280mA |
| PAM8403 volume max | 2 000mA |
| **TOTAL** | **~12 280mA** |

→ LRS-75-5 OCP (14A) : **pas déclenchée** ✅
→ System safe même avec un bug qui allumerait tout.

---

## Résumé des protections en place

```
Scénario de panique : bug code → toutes les LEDs blanc full
        │
        ▼
[ FastLED.setMaxPowerInVoltsAndMilliamps(5, 10000) ]
  → Recalcule brightness max pour rester sous 10A
  → Le bug est absorbé silencieusement ✅
        │
        │ Si FastLED ne suffit pas (ex: bibliothèque mal appelée)
        ▼
[ LRS-75-5 OCP — 14A ]
  → Coupe l'alimentation automatiquement
  → Se remet en marche dès que la surcharge disparaît ✅
        │
        │ Si vraiment rien ne fonctionne (court-circuit matériel)
        ▼
[ LRS-75-5 SCP — Short Circuit Protection ]
  → Protection contre le court-circuit direct ✅
```

> 🎓 **SCP = Short Circuit Protection** = si tu court-circuits accidentellement
> les bornes +5V et GND (ex: avec un fil qui traîne sur le bureau), l'alim coupe
> instantanément au lieu d'exploser ou de prendre feu.

---

## Câblage électrique à faire

### Connexions depuis la LRS-75-5

| Borne LRS-75-5 | Se connecte à | Via |
|---|---|---|
| +V (5V) | ESP32 broche VIN | Fil rouge 22AWG |
| +V (5V) | WS2812B fil rouge (VCC) | Fil rouge 22AWG |
| +V (5V) | PAM8403 VCC | Fil rouge 22AWG |
| -V (GND) | ESP32 broche GND | Fil noir 22AWG |
| -V (GND) | WS2812B fil blanc/noir (GND) | Fil noir 22AWG |
| -V (GND) | PAM8403 GND | Fil noir 22AWG |
| L / N | Câble secteur 230V | **⚠ HAUTE TENSION** — voir note |

> ⚠ **230V = DANGER.** Les bornes L (phase) et N (neutre) de la LRS-75-5 sont connectées
> directement au secteur. Toujours **couper le courant avant de toucher ces bornes**.
> Une fois câblées, elles ne doivent plus être accessibles (dans le boîtier fermé).
> Le côté 5V (basse tension) est sans danger.

### Connexion DATA WS2812B

```
ESP32 GPIO → 300Ω → DATA WS2812B
```
La résistance 300Ω série sur le fil DATA est obligatoire (see section matrice LEDs).

---

## Vérification à faire à la réception de la LRS-75-5

1. **Brancher la LRS-75-5 au secteur, sans rien d'autre de connecté**
2. **Multimètre sur les bornes +V / -V**
3. **Lire : doit afficher 5.0V ± 0.1V**

Sur les LRS-75-5, il y a un petit potentiomètre de trim sur le dessus qui permet d'ajuster ±10% autour de 5V. En général il est déjà bien réglé d'usine, mais toujours vérifier avant de brancher quoi que ce soit.
