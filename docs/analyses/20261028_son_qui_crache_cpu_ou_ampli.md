# Son qui crache : l'ESP32 est-il trop faible, ou ce sont les amplis ? (2026-10-28)

> Suite de `20261025_interferences_leds_audio.md` (§5 : le sifflement vient du canal gauche du TDA2822).
> Ici on parle du **crachement / grésillement** du son, pas du sifflement continu.

## 1. Verdict court

**Le processeur n'est pas en cause.** Les deux suspects les plus probables sont, dans l'ordre :

1. **Les amplis sont saturés côté analogique** : le DAC leur envoie un signal beaucoup trop fort.
2. **Le mixage numérique écrête "dur"** avant l'écrêtage doux.

À ça s'ajoute un défaut de fond : la sortie n'a que **8 bits**.

## 2. Le CPU : largement assez puissant

- `updateAudio()` est appelée 32 768 fois par seconde. À 240 MHz, ça laisse environ **7 300 cycles par échantillon**.
- Ce qu'elle fait réellement : quelques voix × 2 oscillateurs, 5 percussions, 3 filtres en peigne et 1 passe-tout. C'est uniquement du calcul entier (pas de `float` dans la boucle audio). On estime **quelques centaines de cycles**, soit moins de 10 % du budget.
- Mozzi tourne seul sur le cœur 0 (`audio_task`), avec un tampon de 256 échantillons (7,8 ms). L'affichage LED est sur le cœur 1 et ne peut plus le bloquer.
- Un trou dans le tampon donnerait des « clics » réguliers, 50 fois par seconde. Ce n'est pas la description d'un son « crade » en permanence.

## 3. Suspect n°1 : les amplis reçoivent beaucoup trop de signal (analogique)

- Le DAC de l'ESP32 sort jusqu'à **~3,2 V crête à crête**, soit environ ±1,6 V.
- Le **TDA2822** a un gain fixe d'environ **×100 (39 dB)**. Au-delà de quelques dizaines de mV en entrée, il sature.
- Le **PAM8403** a un gain d'environ ×16 sous 5 V. Il sature au-dessus d'environ ±150 mV en entrée.
- Avec ±1,6 V en entrée, les deux amplis écrêtent dès que le volume logiciel dépasse environ 10 %. Ça produit exactement un son qui « crache ».
- 🎓 *Analogie* : c'est comme crier dans un micro collé à la bouche. Baisser le volume de l'enceinte (le volume logiciel) ne sert à rien, c'est l'entrée qui est saturée.

**Remède (environ 0,10 €)** : un pont diviseur sur chaque canal entre le DAC et l'ampli. Par exemple 10 kΩ en série, puis 1 kΩ vers GND : le signal est divisé par 11. Ensuite on remet le volume logiciel près du maximum.

## 4. Suspect n°2 : écrêtage dur dans le code (`src/audio.cpp`, `updateAudio`)

```cpp
dry = constrain(dry, -127, 127);   // ← plusieurs voix additionnées sont rasées ICI
...
int32_t out = soft_clip((dry + wet + drums) / 2);   // l'écrêtage doux arrive trop tard
```

- Dès que l'arpège ou un accord fait sonner 2 ou 3 voix en même temps, la somme dépasse ±127 et elle est **coupée net** avant d'atteindre `soft_clip`. Cette coupure produit un grésillement riche en aigus.
- Même problème dans la reverb, qui travaille en `int8` avec `sat8()`.
- **Remède** : garder `dry` en 32 bits sans `constrain`, et diviser par le nombre de voix (ou laisser `soft_clip` faire tout le travail).

## 5. Défaut de fond : 8 bits seulement

- Le DAC interne fait 8 bits, soit 256 niveaux. Le volume logiciel *multiplie* le signal, donc à 25 % de volume il ne reste que ~64 niveaux utiles. Le son devient granuleux.
- C'est une raison de plus de baisser le niveau **côté analogique** (pont diviseur du §3) et de laisser le volume logiciel haut.
- La solution de fond est le **MAX98357A**, qui est déjà en stock : un DAC + ampli I²S en 16 bits. Mais il est mono, il prend 3 GPIO et il impose de changer le mode de sortie de Mozzi.

## 6. Tests pour trancher (10 minutes)

| Test | Si c'est propre… | Si ça crache… |
|---|---|---|
| Casque sur la sortie ligne (jack, sans ampli) | → ce sont les **amplis** (§3) | → c'est le **code** (§4/§5) |
| Volume logiciel à 10 %, une seule note, REVERB 0, BOOM 0 | → saturation (§3 ou §4) | → panne matérielle (TDA2822 gauche ?) |
| Arpège ACCORD (plusieurs voix) contre arpège UP | accord pire → écrêtage `constrain` (§4) | — |

## 7. Ordre conseillé

1. Corriger le §4 dans le code. C'est gratuit et ça se fait en 5 lignes.
2. Faire le test casque.
3. Poser le pont diviseur (§3).
4. Seulement si ça ne suffit pas : passer au MAX98357A.
