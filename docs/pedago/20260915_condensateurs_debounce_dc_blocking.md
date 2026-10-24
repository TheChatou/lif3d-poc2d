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
