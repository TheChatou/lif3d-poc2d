# Audio et MIDI OUT — Circuit et concepts
> Session du 2026-06-12

## PAM8403 — Vraies caractéristiques

**⚠ Correction d'une info erronée :** le PAM8403 n'est pas un ampli 5W+5W.

| Spec réelle | Valeur |
|---|---|
| Puissance max par canal | **3W dans 4Ω à 5V** (à 10% THD*) |
| Puissance propre (1% THD) | ~2.5W par canal |
| Tension d'alim | 2.5V – 5.5V (typique : 5V) |
| Type d'amplification | Classe D BTL (Bridge Tied Load) |

*THD = Total Harmonic Distortion = taux de distorsion. À 10% THD c'est déjà audible.

**Conclusion :** PAM8403 (3W) et tes HP (3W chacun) sont **exactement appairés** à 5V.  
C'est parfait — et c'est aussi pour ça qu'il ne faut pas mettre le volume à fond en continu.

---

## Classe D BTL — c'est quoi ?

> 🎓 **Classe D** = amplificateur à découpage (comme un buck converter mais pour l'audio).  
> Il commute très vite entre 0V et 5V pour reconstituer la forme d'onde audio.  
> Très efficace (~90%) — peu de chaleur.
>
> **BTL = Bridge Tied Load** = le haut-parleur est branché entre deux sorties  
> (L+ et L-), pas entre une sortie et le GND. Ça double la tension disponible  
> et permet d'atteindre 3W sans alim symétrique ±15V.

---

## Protection des haut-parleurs

### Pourquoi ils risquent de griller ?
Le HP 28mm 4Ω est noté **3W max**. À volume 100%, le PAM8403 peut délivrer exactement 3W.  
Problème : 3W en continu pendant longtemps = chauffe la bobine voice coil = dégradation ou claquage.

### Solution 1 — Software (config.h)
```cpp
#define AUDIO_MAX_VOLUME 200  // sur 255 → ~78% → ~1.8W → bien sous les 3W
```

### Solution 2 — Résistance série 1Ω / 1W (hardware)
Placer une résistance de 1Ω (1W minimum) en série sur le fil L+ de chaque HP.

```
[trou L+ PAM8403] ──→ [1Ω 1W] ──→ [borne + HP gauche]
[trou L- PAM8403] ────────────────→ [borne - HP gauche]
```

**Math :**
```
Impédance totale = 1Ω + 4Ω = 5Ω
Puissance max totale = Vcc² / (2 × R_total) = 25 / 10 = 2.5W
Puissance dans le HP = 2.5W × (4/5) = 2.0W  ← sous les 3W ✅
Puissance dans la résistance = 2.5W × (1/5) = 0.5W → résistance 1W minimum
```

---

## Chaîne audio complète

```
[Mozzi sur Core 1]
  génère la forme d'onde numérique (tableau de valeurs 0–255)
        │
        ▼
[DAC interne ESP32]
  GPIO25 = DAC1 = canal Gauche
  GPIO26 = DAC2 = canal Droit
  Convertit 0–255 en tension analogique 0–3.3V
        │
        ▼
[PAM8403 LINE IN L / R]
  Reçoit la tension analogique
  L'amplifie en courant suffisant pour pousser un HP
        │
        ▼
[Résistance 1Ω/1W] (protection HP)
        │
        ▼
[HP 28mm 4Ω 3W]
  Reçoit un courant alternatif → membrane vibre → son
```

---

## MIDI OUT — Comprendre le circuit

### C'est quoi MIDI ?
**MIDI** = Musical Instrument Digital Interface = protocole pour envoyer des "instructions musicales"  
(Note On, Note Off, changement de volume, etc.) entre des instruments électroniques.  
Ce n'est PAS de l'audio — c'est des données numériques.

Exemple : quand Mozzi joue la note La4, il envoie sur le fil MIDI :  
`[0x90, 69, 100]` = "Note On, note 69 (La4), vélocité 100"  
→ un synthé branché reçoit ça et joue sa propre note La4 avec son propre son.

### Pourquoi UART ?
MIDI utilise exactement le même protocole qu'une liaison série classique :  
**UART à 31250 bits/seconde** (une vitesse un peu exotique mais standard MIDI).

**UART** = Universal Asynchronous Receiver Transmitter  
= protocole qui envoie des bits un par un sur un seul fil (TX = transmit).

→ GPIO17 (UART2_TX) envoie les bytes MIDI bit par bit à 31250 bauds.

### Circuit DIN-5 (connecteur MIDI classique)

Vue de face du connecteur femelle (côté qui sort du boîtier) :
```
         1   2   3
          ╲  │  ╱
           ○ ○ ○
          ╱  │  ╲
         4   │   5
```

| Broche DIN-5 | Connexion | Rôle |
|---|---|---|
| 1 | Non connectée | — |
| 2 | GND | Référence commune |
| 3 | Non connectée | — |
| 4 | +3.3V → **220Ω** | Alimentation de la boucle de courant |
| 5 | GPIO17 (UART2_TX) → **220Ω** | Signal MIDI |

### Pourquoi les résistances 220Ω ?
MIDI fonctionne en **boucle de courant 5mA** (pas en tension).  
Les 220Ω limitent ce courant et protègent l'ESP32 si quelqu'un branche un câble dans le mauvais sens.  
C'est la **norme officielle MIDI** — sans ça, certains appareils ne reconnaissent pas le signal.

### Circuit TRS 3.5mm (MIDI moderne — Type A)
Branché en **parallèle** sur les mêmes fils que le DIN-5 :

| Partie du jack | Connexion | Équivalent DIN-5 |
|---|---|---|
| Tip (pointe) | Signal MIDI (broche DIN-5 n°5) | Signal |
| Ring (anneau) | +3.3V (broche DIN-5 n°4) | Alim boucle |
| Sleeve (manchon) | GND (broche DIN-5 n°2) | GND |

> **Type A** = standard Korg, Make Noise, Arturia Keystep.  
> **Type B** = standard Arturia (Tip et Ring inversés). LIF2D utilise Type A.
