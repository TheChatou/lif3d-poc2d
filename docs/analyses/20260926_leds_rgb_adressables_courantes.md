# LED RGB adressables — les plus courantes sur le marché

## Contexte

Suite à la recherche de composants pour une matrice custom ([[20260926_mini_led_matrice_custom_pcb]]) et aux deux fausses pistes (LED SMD monochromes non-adressables) : vue d'ensemble de ce qui existe vraiment côté LED RGB adressables, et lesquelles sont les plus faciles à trouver/sourcer.

## Deux familles de protocole

### 1. Une seule ligne data (le plus courant, ce que tu utilises déjà)
Un seul fil DIN, données envoyées en série, timing strict géré par la lib (FastLED chez toi). Simple à câbler, mais si le timing est cassé (interruption trop longue, WiFi actif en même temps...), le rendu peut clignoter.

### 2. Data + Clock (SPI, plus robuste mais 2 fils)
Deux lignes (DATA + CLK), le clock cadence la lecture → pas de contrainte de timing strict, rafraîchissement plus rapide, tolère mieux les interruptions logicielles. Plus de fils à router sur le PCB.

## Tableau des références les plus courantes

| Référence | Famille/protocole | Package(s) | Tension | Dispo/popularité | Remarque |
|---|---|---|---|---|---|
| **WS2812B** | 1-wire | 5050 (5×5mm) | 3.5–5.3V | ⭐⭐⭐⭐⭐ La référence absolue — la plus documentée, la moins chère, celle que FastLED/Mozzi-adjacent supportent nativement | C'est ce que tu utilises déjà sur ta matrice flex 16×16 |
| **WS2812B-2020** | 1-wire | 2020 (2×2mm) | 3.5–5.3V | ⭐⭐⭐⭐ Très dispo, variante miniaturisée du même chip | Bon compromis taille/dispo pour une matrice custom |
| **SK6812** | 1-wire | 5050, existe en RGBW (4e LED blanche) | 3.5–5.3V | ⭐⭐⭐⭐ Très proche du WS2812B, quasi interchangeable en code | Utile si tu veux un canal blanc pur en plus du RGB |
| **SK6812MINI-E** | 1-wire | 3535 (3.5×3.5mm) | 3.5–5.3V | ⭐⭐⭐ Dispo, taille intermédiaire | |
| **SK6805 (EC15/2427)** | 1-wire | 1515 (1.5×1.5mm) ou 2427 (2.4×2.7mm) | 3.5–5.3V | ⭐⭐⭐ Moins courant, plus dur à sourcer en gros volume, mais existe (LCSC, AliExpress) | Le plus petit — pour du pitch très serré (<2.5mm) |
| **WS2813** | 1-wire + ligne de secours | 5050 | 3.5–5.3V | ⭐⭐⭐ Dispo, un peu plus cher | Si une LED grille, la chaîne continue (backup data line) — utile sur une grosse matrice où changer une LED HS serait pénible |
| **APA102 / SK9822 / HD107S** | 2-wire (SPI) | 1515, 5050 | 3.8–5.5V (APA102 existe aussi en variante 3.3V "APA102-2020") | ⭐⭐⭐ Dispo, communauté plus petite que WS2812B | Rafraîchissement bien plus rapide, pas de contrainte de timing logiciel — mais 2 fils à router au lieu d'1, et FastLED gère différemment (`SPI` vs bit-banging) |

## Ce qui est réellement le plus facile à trouver

1. **WS2812B (5050)** — de très loin. N'importe quel vendeur (LCSC, AliExpress, Amazon, Adafruit) en a en stock, prix le plus bas, doc/tutoriels innombrables. C'est le standard de fait.
2. **SK6812** — quasi aussi dispo, intéressant seulement si tu veux le canal blanc RGBW (pas ton cas, tu fais du GoL coloré, pas de blanc pur nécessaire).
3. **WS2812B-2020** — dispo correcte pour la miniaturisation, c'est le choix le plus safe si tu veux serrer le pitch sans sacrifier la disponibilité.
4. **SK6805** — existe bien mais nettement moins stocké/moins de refs vendeurs que les deux précédents ; à réserver si tu as vraiment besoin d'un pitch <2.5mm et que WS2812B-2020 ne rentre pas.
5. **APA102 et famille** — niche : intéressant seulement si le clignotement/timing WS2812B devient un problème réel chez toi (peu probable pour un GoL 16×16 à faible fréquence de rafraîchissement).

## Recommandation pour LIF2D

Ton code (`leds.cpp`, FastLED) est déjà écrit pour du WS2812B 1-wire. **Rester dans la famille WS2812B/SK6812/SK6805 (toutes protocole identique) = zéro changement logiciel**, seul le footprint PCB change selon la taille choisie. Passer à APA102 impliquerait de changer la config FastLED (chipset SPI au lieu du chipset 1-wire) — pas nécessaire pour ton usage.

Si tu conçois ta propre matrice custom : **WS2812B-2020** est le meilleur compromis dispo/taille pour commencer, sauf si tu as un besoin fort de pitch très serré (<2.5mm), auquel cas SK6805 reste l'option mais avec sourcing un peu plus tendu.
