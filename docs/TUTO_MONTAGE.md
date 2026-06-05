# LIF2D — Guide de montage complet
> Félix — Beta 1 — Juin 2026

---

## Vocabulaire de base

| Terme | Définition |
|---|---|
| **GND** | Masse / Ground — le "0V" de référence du circuit. Tout se mesure par rapport à lui. |
| **VCC / VIN** | Alimentation positive (+5V, +12V…) |
| **GPIO** | General Purpose Input/Output — une broche de l'ESP32 programmable en entrée ou sortie |
| **DAC** | Digital-to-Analog Converter — convertit un nombre en tension analogique (son) |
| **ADC** | Analog-to-Digital Converter — convertit une tension en nombre (lecture potentiomètre) |
| **PWM** | Pulse Width Modulation — signal rapide qui simule une tension variable (LEDs, moteurs) |
| **I²S** | Protocole audio numérique série (3 fils : CLK, DATA, WS) |
| **RMT** | Remote Control peripheral de l'ESP32 — utilisé par FastLED pour piloter les WS2812B |
| **Breadboard** | Plaque de prototypage sans soudure — les trous sont connectés en rangées |
| **Jumper** | Fil de connexion pour breadboard |
| **Étain** | Alliage métal (Sn/Pb ou sans plomb) utilisé pour souder |

---

## Règles de sécurité

1. **Ne jamais brancher/débrancher sous tension** — coupe toujours l'alim avant de modifier le câblage
2. **GND en premier, VCC en dernier** — branche toujours la masse avant le +
3. **Vérifier la polarité** avant chaque branchement (+/- inversé = composant grillé)
4. **Ne jamais dépasser 3.3V sur les GPIO de l'ESP32** — ils ne sont pas 5V tolerant
5. **LM2596S : régler AVANT de brancher** — toujours vérifier la sortie avec le multimètre avant de connecter quoi que ce soit
6. **WS2812B : luminosité limitée** — `setBrightness(128)` max, sinon l'alim sature

---

## Vue d'ensemble de la chaîne

```
                    ┌──────────────────────────────────────────┐
 Prise 220V         │              LIF2D                       │
     │              │                                          │
     ▼              │  ┌─────────┐    ┌──────────────────┐    │
 BF-1220            │  │LM2596S  │    │    ESP32-D        │    │
 (12V DC) ──────────┼─▶│12V→5V  │───▶│                  │    │
                    │  └─────────┘    │  GPIO 5  ────────────▶ WS2812B 16×16
                    │       │         │  GPIO 25 ──────────┐   │
                    │       │         │  GPIO 26 ──────┐   │   │
                    │       │         │                │   │   │
                    │       └─────────┼─── VIN 5V      │   │   │
                    │                 └────────────────┼┼──┘   │
                    │                                  ││       │
                    │                             ┌────▼▼────┐  │
                    │                             │ PAM8403  │  │
                    │                             │ HW-894   │  │
                    │                             └────┬─┬───┘  │
                    │                                  │ │       │
                    │                              HP L  HP R    │
                    └──────────────────────────────────────────┘
```

---

## Étape 1 — Régler le LM2596S (12V → 5V)

> 🎓 Le LM2596S a un petit potentiomètre bleu sur le dessus. En tournant ce vis, tu changes la tension de sortie. On doit la régler à exactement 5V avant de brancher quoi que ce soit.

### Ce qu'il te faut
- LM2596S
- Multimètre en mode tension DC (symbole V—)
- Alimentation 12V BF-1220

### Procédure
1. Branche le 12V sur les bornes **IN+** et **IN-** du LM2596S (IN+ = rouge/12V, IN- = noir/GND)
2. **Ne connecte rien en sortie pour l'instant**
3. Mets les sondes du multimètre sur **OUT+** (rouge) et **OUT-** (noir)
4. Tourne le potentiomètre bleu avec un tournevis plat jusqu'à lire **5.0V ± 0.1V**
   - Sens horaire = augmente la tension
   - Sens antihoraire = diminue la tension
5. Note la position — **ne plus jamais toucher ce potentiomètre**

> ⚠️ Si tu lis une tension > 5.5V en sortie, débranche immédiatement. L'ESP32 et les WS2812B acceptent max 5.5V.

---

## Étape 2 — Premier test ESP32-D (sans rien d'autre)

> 🎓 Avant de connecter quoi que ce soit, on vérifie que l'ESP32 fonctionne seul. Si ça ne marche pas à cette étape, inutile de continuer.

### Matériel
- ESP32-D + câble USB
- PC avec PlatformIO

### Procédure

1. Branche l'ESP32-D en USB sur ton PC
2. Dans PlatformIO, upload le programme de test minimal suivant :

```cpp
// Test 1 : LED interne clignotante
void setup() {
  Serial.begin(115200);
  pinMode(2, OUTPUT); // LED bleue interne ESP32
}

void loop() {
  digitalWrite(2, HIGH);
  Serial.println("ON");
  delay(500);
  digitalWrite(2, LOW);
  Serial.println("OFF");
  delay(500);
}
```

3. La LED bleue sur la carte clignote → ESP32-D OK ✅
4. Ouvre le Moniteur Série (115200 baud) → tu vois "ON / OFF" → communication OK ✅

> 🎓 La LED bleue est sur GPIO 2 sur la plupart des ESP32-D. Elle est directement sur la carte — pas besoin de brancher quoi que ce soit.

### Identifier ton pinout
Cherche "ESP32 DevKit V1 pinout" ou le modèle exact de ta carte sur Google Images. Les broches ont des numéros sérigraphiés sur les côtés.

---

## Étape 3 — Premier allumage WS2812B

> 🎓 La WS2812B est une LED "intelligente" : chaque LED contient une puce qui reçoit les données via un seul fil (DATA) et les retransmet à la suivante. 256 LEDs, 1 fil.

### Câblage breadboard

```
ESP32-D                 WS2812B 16×16
─────────               ─────────────
  GPIO 5  ────────────▶  DIN (Data IN)
  GND     ─────────────  GND
  
LM2596S OUT+  ──────────  +5V
LM2596S OUT-  ──────────  GND (même GND que l'ESP32 !)
```

> ⚠️ **GND commun obligatoire** — l'ESP32 et la matrice WS2812B DOIVENT partager le même GND. Sinon les données ne passent pas.

> ⚠️ **Ne pas alimenter la WS2812B depuis le 3.3V de l'ESP32** — elle a besoin de 5V et peut tirer jusqu'à 3A.

### Programme de test

```cpp
#include <FastLED.h>

#define LED_DATA_PIN  5
#define LED_COUNT     256
#define BRIGHTNESS    40  // 🎓 On démarre très bas — 40/255 = ~15%

CRGB leds[LED_COUNT];

void setup() {
  FastLED.addLeds<WS2812B, LED_DATA_PIN, GRB>(leds, LED_COUNT);
  FastLED.setBrightness(BRIGHTNESS);
}

void loop() {
  // Allume toutes les LEDs en rouge
  fill_solid(leds, LED_COUNT, CRGB::Red);
  FastLED.show();
  delay(500);

  // Éteint tout
  FastLED.clear();
  FastLED.show();
  delay(500);
}
```

### Résultat attendu
La matrice clignote en rouge. Si certaines LEDs ne s'allument pas — c'est normal sur une première matrice, quelques pixels morts sont courants sur les flexibles AliExpress.

> 🎓 `GRB` dans `addLeds<WS2812B, LED_DATA_PIN, GRB>` = l'ordre des couleurs dans le protocole. Les WS2812B reçoivent Green-Red-Blue, pas RGB. FastLED s'occupe de réordonner automatiquement.

---

## Étape 4 — Test audio PAM8403 HW-894

> 🎓 Le DAC de l'ESP32 génère une tension entre 0V et 3.3V sur les GPIO 25 et 26. Le PAM8403 amplifie ce signal pour alimenter les HP. C'est une chaîne analogique simple.

### Câblage

```
ESP32-D                 PAM8403 HW-894
────────                ──────────────
  GPIO 25 ────────────▶  IN L  (entrée gauche)
  GPIO 26 ────────────▶  IN R  (entrée droite)
  GND     ─────────────  GND

PAM8403 HW-894          HP
──────────────          ──
  OUT L+  ─────────────  HP gauche (+)
  OUT L-  ─────────────  HP gauche (-)
  OUT R+  ─────────────  HP droit (+)
  OUT R-  ─────────────  HP droit (-)

LM2596S OUT+ ───────────  VCC (5V)
LM2596S OUT- ───────────  GND
```

> 🎓 Le PAM8403 est un ampli de classe D : ses sorties OUT L+/L- ne sont PAS du GND et du +5V. C'est un signal différentiel PWM. **Ne jamais court-circuiter OUT+ et OUT-.**

> ⚠️ **Bien vérifier la polarité des HP** (+ et -). Si les deux HP sont en opposition de phase, les basses s'annulent. Sur des HP sans marquage : teste les deux sens, prends celui qui sonne le mieux.

### Programme de test

```cpp
// Test DAC : sinusoïde sur les deux canaux
#include <math.h>

void setup() {
  // 🎓 dacWrite(pin, valeur) : valeur de 0 à 255 → tension de 0V à 3.3V
  //    Initialisation à 128 = tension médiane (1.65V) = silence pour un DAC
  dacWrite(25, 128);
  dacWrite(26, 128);
}

void loop() {
  // Génère une sinusoïde simple à ~440Hz (La)
  for (int i = 0; i < 360; i++) {
    float val = sin(i * M_PI / 180.0);  // -1.0 à +1.0
    uint8_t out = (uint8_t)((val + 1.0) * 127.5); // 0 à 255
    dacWrite(25, out);
    dacWrite(26, out);
    delayMicroseconds(6); // ~440Hz (1/440Hz / 360 pas ≈ 6µs)
  }
}
```

### Résultat attendu
Un La à 440Hz dans les deux HP. Son peut paraître léger — c'est normal, le DAC 8-bit de l'ESP32 a une qualité limitée. Mozzi fera beaucoup mieux en gérant le timing avec précision.

> 🎓 `dacWrite` est une fonction Arduino pour ESP32. Elle utilise le DAC hardware 8-bit. Mozzi le remplacera avec son propre système de génération audio optimisé.

---

## Étape 5 — Intégration complète breadboard

Une fois les étapes 2, 3 et 4 validées séparément, on assemble tout.

### Câblage complet

```
                    ┌──────────────────┐
  LM2596S (5V) ────▶│ VIN              │
  USB (prog) ──────▶│ USB              │
                    │                  │
                    │ GPIO 5  ──────────────▶ WS2812B DIN
                    │ GPIO 25 ──────────────▶ PAM8403 IN L
                    │ GPIO 26 ──────────────▶ PAM8403 IN R
                    │                  │
                    │ GND ─────────────────── GND commun
                    └──────────────────┘
                           ESP32-D

GND commun ──┬── LM2596S OUT-
             ├── WS2812B GND
             └── PAM8403 GND

LM2596S OUT+ (5V) ──┬── WS2812B +5V
                    └── PAM8403 VCC
```

### Ordre de branchement (toujours respecter cet ordre)
1. Branche tous les **GND en premier**
2. Branche le **5V LM2596S** sur WS2812B et PAM8403
3. Branche les **signaux data** (GPIO 5, 25, 26)
4. Branche l'**USB** sur l'ESP32 en dernier

---

## Étape 6 — Soudure (après validation breadboard)

> 🎓 **Règle d'or : ne souder que ce qui fonctionne.** Si quelque chose ne marche pas sur breadboard, ça ne marchera pas soudé — et c'est beaucoup plus dur à debugger.

### Matériel
- Fer à souder (idéalement avec contrôle de température, 350°C)
- Étain avec flux intégré (Sn63/Pb37 ou sans plomb SAC305)
- Pince "helping hands" (troisième main)
- Tresse à déssouder (en cas d'erreur)
- Multimètre pour vérifier après chaque joint

### Technique de soudure — les bases

**Un bon joint = brillant, lisse, en forme de cône**
**Un mauvais joint = mat, granuleux, en boule**

1. Chauffe **le composant et le pad en même temps** (pas juste l'étain)
2. Amène l'étain **sur le joint**, pas sur le fer
3. Contact : **2-3 secondes max** puis retire le fer
4. Laisse refroidir **sans bouger** la pièce

### Ordre de soudure recommandé
1. **Connecteurs femelles** sur la carte principale (les plus plats en premier)
2. **Résistances / condensateurs** (petits composants passifs)
3. **Modules** (LM2596S, PAM8403)
4. **Connecteurs** pour les HP (bornier à vis ou JST)
5. **WS2812B** en dernier (sensible à la chaleur — max 260°C, 3 secondes)
6. **ESP32-D** via headers (ne jamais souder directement l'ESP32 sur la carte)

> 🎓 Souder l'ESP32-D sur des headers (barrettes de broches) et non directement sur la carte te permet de le retirer pour le remplacer ou le reprogrammer facilement.

### Vérifications après soudure
Pour chaque joint soudé :
1. **Test visuel** : le joint est brillant et propre ?
2. **Test mécanique** : tire doucement le fil, il tient ?
3. **Test au multimètre** en mode continuité (bip) : la connexion est bien conductrice ?
4. **Test isolation** : les pads voisins ne sont pas en court-circuit ?

---

## Étape 7 — Debug et dépannage

### Problèmes courants

| Symptôme | Cause probable | Solution |
|---|---|---|
| ESP32 ne s'allume pas | Mauvaise alim ou USB défectueux | Tester autre câble USB |
| LEDs ne s'allument pas | GND non partagé, ou DATA sur mauvais GPIO | Vérifier câblage GND commun |
| LEDs s'allument aléatoirement | Bruit sur le signal DATA | Ajouter résistance 300-500Ω en série sur DATA |
| Pas de son | GPIO 25/26 non configurés comme DAC | Vérifier `dacWrite` dans le code |
| Son grésille | Bruit alimentation sur le PAM8403 | Condensateur 100µF sur VCC du PAM8403 |
| LM2596S chauffe | Trop de courant tiré | Vérifier que setBrightness ≤ 128 |
| ESP32 redémarre | Brownout (chute de tension) | Condensateur 100µF sur VIN de l'ESP32 |

### Utiliser l'oscilloscope

> 🎓 L'oscilloscope affiche la tension en fonction du temps. Indispensable pour debugger les signaux rapides (WS2812B = 800kHz, DAC audio = 22kHz).

**Mesures utiles sur ce projet :**
- **GPIO 5** : signal WS2812B — tu dois voir des impulsions à 800kHz (créneaux)
- **GPIO 25/26** : sortie DAC — tu dois voir une sinusoïde lisse lors du test audio
- **OUT LM2596S** : tension 5V stable — doit rester à 5V ± 0.1V même sous charge

---

## Récapitulatif des étapes

```
[ ] Étape 1 — Régler LM2596S à 5V
[ ] Étape 2 — Test ESP32-D seul (blink + Serial)
[ ] Étape 3 — Premier allumage WS2812B
[ ] Étape 4 — Test audio PAM8403
[ ] Étape 5 — Intégration complète breadboard
[ ] Étape 6 — Soudure (après validation)
[ ] Étape 7 — Premier firmware LIF2D complet
```

---

## Prochaine étape : Firmware LIF2D

Une fois le montage validé, on attaque le firmware dans cet ordre :
1. `leds.cpp` — afficher le GoL sur la matrice
2. `audio.cpp` — séquenceur Mozzi piloté par le GoL
3. `controls.cpp` — encodeurs + potentiomètres
4. `main.cpp` — assemblage FreeRTOS 2 cœurs

---

*Guide LIF2D Beta 1 — Félix — Juin 2026*
