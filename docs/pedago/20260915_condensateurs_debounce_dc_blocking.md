# Condensateurs du projet — anti-rebond et blocage DC

> Session du 2026-09-15 — deux usages différents de condensateurs coexistent dans LIF2D, à ne pas confondre.

## C'est quoi un condensateur ?

> 🎓 Un condensateur stocke et relâche de petites quantités de charge électrique. Il s'oppose aux changements rapides de tension (il les lisse) mais laisse passer les variations lentes — c'est cette propriété qui est exploitée ici, de deux façons différentes.

## Rôle 1 — Anti-rebond mécanique (100nF)

Un contact mécanique (interrupteur, encodeur) ne se ferme/s'ouvre jamais proprement : le métal **rebondit** physiquement pendant quelques millisecondes avant de se stabiliser. Sans correction, le GPIO voit une dizaine de transitions HIGH/LOW parasites au lieu d'une seule — le firmware peut compter "plusieurs crans" pour un seul mouvement réel de l'encodeur.

Un condensateur de 100nF entre le signal et GND se charge/décharge plus lentement que ces rebonds ultra-rapides → il ne reste qu'une seule transition propre côté GPIO. C'est un filtre **matériel**, complémentaire (pas un remplacement) du debounce logiciel dans le firmware.

**Dans LIF2D** : entre la patte **A (ROTA)** de chaque encodeur et GND.
- EC11 A (GPIO22) — 100nF vers GND
- EC11 B (GPIO32) — 100nF vers GND
- Bouton play/pause (GPIO14) — optionnel, non tranché ; le logiciel seul peut suffire pour un simple bouton

Jamais sur les pattes B ou switch (S1/S2) — celles-là restent gérées uniquement en logiciel.

### C'est quoi "nF" ?

> 🎓 nF = nanofarad, l'unité de capacité électrique (Farad) divisée par 10⁹. Échelle : 1 Farad (énorme, jamais utilisé en signal) > 1 µF (microfarad, 10⁻⁶ F) > 1 nF (10⁻⁹ F) > 1 pF (picofarad, 10⁻¹² F). Plus la valeur est petite, plus le condensateur réagit vite — adapté aux rebonds mécaniques (quelques ms), contrairement au 100µF audio qui lisse des signaux plus lents.

### Pourquoi seulement sur A (ROTA), jamais sur B ?

> 🎓 Ce n'est pas une différence électrique entre A et B, c'est lié à **comment le firmware lit l'encodeur** :
> - `attachInterrupt` ne se déclenche que sur les transitions de **ROTA** — c'est la pin qui "réveille" le microcontrôleur à chaque cran.
> - À ce moment-là, le code fait juste un `digitalRead` sur **ROTB** pour lire son état HIGH/LOW et en déduire le sens.
> - A et B étant déphasés (~90°, quadrature), quand A bascule, B est stable — son propre rebond (à son propre moment de bascule) ne compte pas puisque rien ne le lit à cet instant.
>
> Donc seul A a besoin d'être filtré matériellement (sinon = fausses interruptions = crans comptés en trop) ; un condo sur B serait redondant.

## Rôle 2 — Blocage du DC / découplage (100µF)

Un ampli alimenté en simple tension (5V, pas de rails +/-15V comme les gros amplis) a sa sortie qui **repose au repos à une tension continue** (~moitié de l'alimentation), même sans signal. Envoyée telle quelle dans un casque, cette tension continue traverse en permanence la bobine — chauffe inutile, "pop" audible au branchement, use la bobine à la longue.

Un condensateur en série **bloque le continu** (0 Hz) mais laisse passer l'audio (qui varie dans le temps) → seul le vrai signal atteint le jack.

**Dans LIF2D** : un sur **TDA2822 Lout**, un sur **TDA2822 Rout**, juste avant le jack Tip/Ring.
⚠️ **Par défaut, ne rien ajouter** : la plupart des modules TDA2822 tout faits ont déjà ces condensateurs intégrés en sortie. Vérifier d'abord (visuellement sur le PCB — 2 petits condensateurs juste après Lout/Rout — ou au multimètre) ; n'en ajouter que s'ils sont vraiment absents.

## Récapitulatif

| Condensateur | Valeur | Emplacement | Statut |
|---|---|---|---|
| Anti-rebond EC11 A | 100nF | ROTA (GPIO22) → GND | Obligatoire |
| Anti-rebond EC11 B | 100nF | ROTA (GPIO32) → GND | Obligatoire |
| Anti-rebond bouton | 100nF | GPIO14 → GND | Optionnel |
| Découplage audio L | 100µF | TDA2822 Lout → Jack Tip | Probablement déjà sur le module — vérifier avant d'ajouter |
| Découplage audio R | 100µF | TDA2822 Rout → Jack Ring | Probablement déjà sur le module — vérifier avant d'ajouter |

---

## Leçon du 2026-10-25 — en PARALLÈLE, jamais en SÉRIE

Sur la boîte, le 100 nF anti-rebond a été soudé **sur le chemin** du fil A (entre la broche A de l'encodeur et le fil du GPIO) au lieu d'**à côté** (entre A et GND). Résultat : la rotation n'était plus détectée du tout.

```
❌ En série :     EC11 A ──┤100nF├── GPIO22        le condensateur COUPE le signal
✅ En parallèle : EC11 A ─────●──── GPIO22         le signal passe librement
                              │
                           [100nF]                 l'"amortisseur" est une dérivation
                              │
                             GND
```

🎓 **Pourquoi ça coupe tout** : un condensateur ne laisse **jamais** passer le courant continu. Un signal qui reste à 0 ou à 1 pendant un moment = du continu → bloqué. Le GPIO ne voit plus que sa résistance de tirage interne (pull-up) → il lit 1 en permanence. Ce qui a été mesuré : GPIO22 et GPIO32 toujours à 1, seules les broches B bougeaient.

**Analogie** : en parallèle, c'est un amortisseur posé à côté de la route (il absorbe les secousses) ; en série, c'est un mur au milieu de la route.

**Mise à jour (2026-10-25)** : avec le décodeur à table du firmware (`src/ui/input.cpp`, chaque transition est vérifiée, les rebonds donnent des transitions "impossibles" ignorées), le 100 nF est **facultatif**. Et la section "pourquoi seulement sur A" plus haut ne s'applique plus : le nouveau code lit A **et** B sur interruptions.

**Réparation** quand le condo est soudé sur la broche : le **ponter** (un fil ou une goutte d'étain entre ses 2 pattes) = court-circuité = comme un fil direct.

## Rôle 3 — Découplage d'alimentation : 100 nF + gros électrolytique, en équipe

Pour calmer une alimentation bruitée (ex : les LEDs qui polluent le 5 V des amplis), on place **en parallèle sur le +5 V / GND**, au plus près du composant :
- un **100 nF céramique** → absorbe les parasites **très rapides** (MHz : fronts du signal DATA, commutations de l'ampli classe D) ;
- un **gros électrolytique 470–1000 µF** → absorbe les **gros appels de courant lents** (kHz : PWM des 256 LEDs, basses de l'ampli).

🎓 Les deux ne font pas le même travail : le petit est rapide mais minuscule (il se vide en une fraction de µs), le gros stocke beaucoup mais réagit plus lentement. Seul, un 100 nF ne règle pas le buzz des LEDs ; il aide sur le sifflement aigu.

**Récupérer les 100 nF des encodeurs ?** Oui, s'ils sortent intacts avec assez de patte : un sur les broches 5 V/GND du PAM8403, un sur celles du TDA2822. Utile mais partiel — l'essentiel viendra des gros électrolytiques (voir `docs/analyses/20261025_interferences_leds_audio.md`).

---

## Rôle 4 — Filtre RC d'alimentation (2026-10-26, TDA2822)

**Définition** : une **résistance en série** dans le fil d'alimentation, suivie d'un **gros condensateur en
parallèle** (entre ce fil et GND), juste avant le composant à protéger.

**Analogie** : un **amortisseur suivi d'un bassin**. La résistance freine les vagues (variations rapides),
le condensateur est un bassin qui absorbe ce qui passe. À la sortie, l'eau est calme.

**Le calcul** : fréquence de coupure = 1 / (2π × R × C). Avec 10 Ω et 1000 µF → ≈ 16 Hz. Tout ce qui est
au-dessus (donc tout ce qu'on entend) est fortement atténué.

**Exemple LIF2D** : le canal gauche du TDA2822 siffle, même ESP32 éteint → 10 Ω dans le fil 5V du TDA +
1000 µF 16 V entre VCC et GND, au bornier du module.

**Pièges** :
- La résistance fait chuter la tension (R × courant) : OK pour un petit ampli casque (quelques dizaines de mA),
  **pas** pour la matrice ou le PAM8403 (plusieurs ampères → la tension s'effondre)
- **Perle de ferrite ≠ résistance** : une ferrite ne freine que les très hautes fréquences (> 1 MHz). Contre un
  sifflement **audible**, elle ne fait presque rien
- Électrolytique **polarisé** : bande « − » côté GND, tension ≥ 16 V pour du 5 V

### ESR — faut-il un condensateur « low ESR » ?

L'**ESR** (résistance série équivalente) est la petite résistance interne d'un condensateur. Elle compte quand
il doit fournir de gros pics de courant très rapides (sortie d'alim à découpage). Dans un filtre RC, la
résistance de 10 Ω en amont rend l'ESR (quelques centièmes d'ohm) négligeable : un modèle standard (KMQ)
fait aussi bien qu'un low ESR (ZLH, KZG). Choisir selon la place (8×20 mm fin et haut, 10×12 mm trapu).
