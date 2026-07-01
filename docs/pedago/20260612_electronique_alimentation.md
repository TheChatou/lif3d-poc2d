# Électronique — Alimentation et puissance
> Session du 2026-06-12

## Volt, Ampère, Watt

| Terme | Analogie | Définition pratique |
|---|---|---|
| **Volt (V)** | Pression dans un tuyau | La "hauteur" de tension qu'un composant attend. Donne-lui trop → il grille. |
| **Ampère (A)** | Débit dans un tuyau | La quantité de courant qu'il tire. Ton alim doit pouvoir en fournir assez. |
| **Watt (W)** | Puissance de la pompe | **W = V × A** — la vraie mesure de consommation. |

Exemples concrets :
- LED WS2812B pleine puissance : 60 mA à 5V → 5 × 0.06 = **0.3W par LED**
- 256 LEDs toutes blanches : 256 × 0.3W = **76.8W** — énorme !
- En pratique (GoL Dense, ~11 LEDs) : ~0.06W → négligeable

---

## Résistance en série — pour quoi faire ?

Une résistance placée en série sur un fil **réduit le courant** (et donc la puissance) qui passe.

Loi d'Ohm : **V = R × I** (tension = résistance × courant)

Exemple : résistance 1Ω en série avec HP 4Ω pour limiter la puissance :
```
Sans résistance : P_max = Vcc² / (2 × R_HP) = 25 / (2×4) = 3.125W → à la limite du HP
Avec 1Ω en série : P_max = 25 / (2 × 5) = 2.5W, dont 2.0W dans le HP ✅
```
La résistance "mange" la différence en chaleur → choisir 1W de puissance minimale.

---

## Buck converter (abaisseur de tension)

**Problème :** ton alim donne 12V, tes composants veulent 5V.  
**Mauvaise solution :** résistance en série → perd la différence en chaleur (inefficace, chauffe).  
**Bonne solution :** **buck converter** = circuit actif qui convertit la tension efficacement (~80%).

Le LM2596S est un buck converter ajustable : tourne le petit pot bleu jusqu'à lire 5.0V au multimètre **avant** de brancher quoi que ce soit.

> **Pour LIF2D : plus nécessaire.** La LRS-75-5 sort directement du 5V. LM2596S mis de côté.

---

## LDO (Low Dropout Regulator)

Autre façon de baisser la tension, plus simple mais moins efficace.  
Il "brûle" la différence en chaleur : (5V - 3.3V) × courant = chaleur dissipée.  
**Déjà soudé sur la carte ESP32-D** : convertit 5V (broche VIN) → 3.3V pour le chip.  
Tu ne fais rien — c'est automatique.

---

## Alimentation LIF2D : Mean Well LRS-75-5

**Choix validé dans le CDC v1.0 (2026-06-11).**

| Spec | Valeur |
|---|---|
| Tension de sortie | 5V DC |
| Courant max | 14A |
| Puissance max | 70W |
| Protections intégrées | OCP, OVP, SCP |

**Remplace** la chaîne BF-1220 (12V) + LM2596S qui était prévue initialement.  
Tout le projet tourne à 5V direct — aucune conversion intermédiaire à faire toi-même.

---

## Protections intégrées : OCP / OVP / SCP

| Sigle | Nom complet | Ce que ça fait |
|---|---|---|
| **OCP** | Over Current Protection | Coupe automatiquement si le courant dépasse 14A. Se remet seule après. |
| **OVP** | Over Voltage Protection | Coupe si la tension de sortie monte trop haut (ex: défaut interne). |
| **SCP** | Short Circuit Protection | Coupe si tu court-circuits accidentellement +5V et GND. Évite l'incendie. |

Ces protections sont des "disjoncteurs électroniques" — ils coupent et se réenclenchent automatiquement.

---

## Double protection pour les LEDs

**Problème :** un bug pourrait allumer toutes les LEDs blanc = 15A → dépasse la LRS-75-5 (14A OCP).

**Solution en deux couches :**
1. **Logicielle (FastLED)** — dans `setup()` avant le premier `show()` :
   ```cpp
   FastLED.setMaxPowerInVoltsAndMilliamps(5, 10000); // plafond 10A pour les LEDs
   ```
   FastLED recalcule le brightness max pour rester sous 10A. Bug silencieusement absorbé.

2. **Hardware (LRS-75-5 OCP à 14A)** — si FastLED ne suffit pas, l'alim coupe.

Résultat : **le système ne peut jamais se détruire par excès de courant LED.**

---

## Budget de puissance typique LIF2D

| Composant | Courant | Puissance |
|---|---|---|
| WS2812B (GoL Dense ~11 LEDs) | ~200 mA | ~1W |
| ESP32-D (no WiFi) | ~150 mA | ~0.75W |
| PAM8403 (volume ~30%) | ~300 mA | ~1.5W |
| Encodeurs + pots | ~15 mA | ~0.07W |
| **TOTAL typique** | **~665 mA** | **~3.3W** |

LRS-75-5 utilisée à ~5% de sa capacité. Très confortable.
