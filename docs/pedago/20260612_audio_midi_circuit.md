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

→ GPIO4 (UART2_TX remappé) envoie les bytes MIDI bit par bit à 31250 bauds.
(⚠ corrigé 2026-09-15 : c'était GPIO17 à l'origine, remappé sur GPIO4 depuis la révision boîtier du 2026-08-24 pour libérer GPIO17.)

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
| 5 | GPIO4 (UART2_TX remappé) → **220Ω** | Signal MIDI |

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

### Quel GND utiliser pour le Sleeve ? (question du 2026-09-15)

Le GPIO4 et le +3.3V viennent tous les deux de l'ESP32. Électriquement, la broche GND de l'ESP32 et le bus GND du LRS sont **le même nœud** (l'un est raccordé à l'autre via le Wago) — donc n'importe lequel des deux "marche" au sens strict.

Mais en pratique, mieux vaut brancher le Sleeve du jack **directement sur une broche GND de l'ESP32**, pas sur le bus GND du LRS. Raison : le bus GND du LRS transporte aussi le retour de courant de la matrice LED (WS2812B — pics de courant importants à chaque rafraîchissement) et du PAM8403 (courant HP, plusieurs centaines de mA en musique). Ces pics créent de minuscules variations de tension sur le fil GND lui-même (chute de tension due à sa résistance non nulle). Si le signal MIDI (ou audio) référence son "0V" sur ce même point bruité, ce bruit se mélange au signal.

> 🎓 **Masse en étoile (star grounding)** : faire revenir chaque signal sensible (MIDI, audio, DAC) le plus directement possible vers une seule et même broche GND "propre" (ici, celle de l'ESP32), plutôt que de piquer le GND n'importe où sur un bus qui transporte aussi du courant de puissance. Ça ne change rien en courant continu, mais ça évite d'injecter du bruit dans les signaux les plus sensibles.

**En pratique pour LIF2D** : Sleeve du jack MIDI → broche GND de l'ESP32 (pas directement le bloc Wago GND). Même logique pour le Sleeve du jack audio 5 broches.

---

## Chasser un bruit audio — méthode par élimination (2026-10-26)

**Principe** : ne rien acheter avant de savoir **où** le bruit entre. Un test = on supprime UNE source possible
et on écoute si le bruit change. Le détail des tests LIF2D est dans
`docs/analyses/20261025_interferences_leds_audio.md` §5.

| Question | Test | Si le bruit reste… |
|---|---|---|
| Vient-il du son joué ? | ▶ STOP | …ce n'est pas la musique |
| Entre-t-il par le signal ? | Potentiomètre de l'ampli au minimum (entrée à la masse) | …il entre **après** l'entrée (alim, masse, sortie) |
| Est-ce l'ESP / les LEDs ? | Éteindre l'ESP | …ils sont innocents |
| Quel côté est fautif ? | **Inverser gauche/droite** à un point de la chaîne | S'il **change de côté**, la cause est **avant** ce point ; s'il **reste**, elle est **après** |

**L'inversion L/R est l'outil le plus puissant** : en 3 minutes, elle a montré que c'était le canal gauche du
module TDA2822, et pas le jack ou les soudures.

### Notions rencontrées

- **Boucle de masse** : deux chemins de masse entre deux modules forment une boucle ; le courant de l'un passe
  dans les pistes de masse de l'autre et y crée de minuscules tensions, amplifiées comme du son. (Testé :
  pas la cause sur LIF2D, mais classique.)
- **Alim à découpage en "rafales"** : à faible charge, une alim comme la LRS-75-5 ne découpe plus en continu
  mais par paquets, à une fréquence qui peut tomber dans l'audible et **varie avec le courant demandé**
  (d'où un ton qui change avec l'écran sans que l'écran soit la vraie source).
- **Oscillation d'un ampli** : un canal qui siffle tout seul, même sans entrée, comme un effet Larsen interne.
  Remèdes : bon découplage de l'alim au plus près, **réseau Zobel** (4,7 Ω + 100 nF en série, sortie → GND).
- **Soudure froide** : étain posé sans que la broche ait chauffé → terne, granuleuse, en boule ; contact
  fragile qui craque quand on bouge. Refaire en chauffant **broche + fil ensemble** 2–3 s avant l'étain.
- **Entrée en l'air** : une entrée d'ampli reliée à rien (ou par une grande résistance) capte le 50 Hz du secteur
  → bourdonnement grave. Disparaît dès qu'une source (le DAC) pilote l'entrée.
