# LIF2D — Interférences audio liées aux LEDs (+ bruit sur un seul HP)

> 2026-10-25 — Mis de côté : à traiter au retour, avec le matériel (condensateurs, ferrites, fer à souder).
>
> **2026-10-26 — Diagnostic refait (voir §5, qui fait foi) : ce ne sont PAS les LEDs. Le sifflement vient du canal GAUCHE du module TDA2822.** Les §2–4 ci-dessous sont gardés pour l'historique.

---

## 1. Symptômes observés

| Date | Observation |
|---|---|
| 2026-10-24 | Bruit au casque et aux HP qui varie quand on approche les mains ou qu'on déplace des objets — **cause trouvée** : téléphone posé à côté + entrées d'ampli flottantes (firmware sans son, DAC non piloté) |
| 2026-10-25 | Firmware `ui_test` avec DAC fixé à mi-tension (`dacWrite(…, 128)`) : le bruit "mains/téléphone" disparaît, mais il reste **un bruit sur un seul des deux HP**, très audible quand on monte le potentiomètre du PAM8403 |
| 2026-10-25 | Ce bruit **change en fonction de ce que la matrice affiche** → il est lié aux LEDs |
| 2026-09-18 | (rappel) Son strident selon les volumes TDA2822 / PAM8403 — à revoir en même temps (gain staging) |

Contexte des tests du 25/10 : ESP32 alimenté par l'USB du PC (VIN débranché), matrice + amplis sur le LRS-75-5, GND commun.

---

## 2. Explication

### 2.1 Pourquoi les LEDs "s'entendent"

🎓 Une WS2812B ne varie pas sa luminosité en baissant le courant : elle **allume et éteint la LED très vite**
(PWM, environ 400 Hz à 2 kHz selon les versions). Chaque allumage = un **pic de courant**. Sur 256 LEDs, ces pics
font onduler la tension du **5 V** et du **GND** partagés.

Les amplis audio (TDA2822 puis PAM8403, deux étages à la suite) sont alimentés par ces mêmes fils et
**référencent leur signal au même GND** : la moindre ondulation est amplifiée comme si c'était du son.
Plus l'image est lumineuse ou chargée, plus les pics sont gros → le bruit change avec l'affichage.

Source secondaire : le rafraîchissement de l'image (`FastLED.show()`), qui envoie des rafales de données
à chaque image (~100 fois/s dans le firmware de test).

### 2.2 Pourquoi un seul HP

Les deux canaux ont le même schéma ; s'il n'y en a qu'un qui bruite, c'est son **chemin de masse** ou son
**câblage** qui diffère : fil GND plus long, qui passe près des gros fils de la matrice, borne GND du module
mal serrée, retour HP qui partage un fil de puissance… À inspecter canal par canal.

### 2.3 Boucle de masse USB (facteur aggravant pendant le développement)

Avec l'USB branché, la masse du PC (reliée à la terre) rejoint celle de la boîte → une boucle de masse qui capte
du ronflement. Ce n'est vrai **que pendant le développement** : la boîte finie tourne sans PC.
**Test à faire** : débrancher l'USB, rebrancher VIN (jamais les deux ensemble), écouter avec un firmware qui fixe le DAC.

---

## 3. Remèdes, par ordre d'efficacité / simplicité

| # | Remède | Matériel | Pourquoi |
|---|---|---|---|
| 1 | **Condensateur 1000 µF / 10 V (ou plus)** sur l'arrivée 5 V/GND de la matrice, au plus près des pads (début ET milieu si possible) | électrolytique 1000–2200 µF ≥ 10 V | Recommandation standard WS2812B : fournit les pics de courant sur place au lieu de les tirer à travers tout le câblage. Protège aussi la 1re LED au branchement |
| 2 | **Condensateur 470–1000 µF** au plus près de l'entrée 5 V de **chaque ampli** (PAM8403 et TDA2822) | électrolytiques 470–1000 µF ≥ 10 V | Réservoir local pour l'audio, lisse l'ondulation |
| 3 | **Ferrite (ou petite self) en série** sur le 5 V de chaque ampli, *avant* le condensateur du #2 | perle de ferrite / self 10–100 µH | Forme un filtre LC : bloque les parasites haute fréquence venant de la matrice |
| 4 | **Masse en étoile** : le GND des amplis revient au LRS par **son propre fil**, sans partager celui de la matrice ; le GND du jack et des HP revient à l'ampli, pas au Wago de puissance | fil 0.75 mm² | Les pics de la matrice ne passent plus dans la masse de l'audio |
| 5 | Éloigner les fils audio (DAC → TDA, TDA → jack → PAM) des fils de puissance de la matrice ; torsader signal + GND | — | Réduit le couplage par proximité |
| 6 | **Logiciel** : n'appeler `FastLED.show()` que si l'image a changé ; texte/menus moins lumineux que le GoL | — | Atténue, ne supprime pas |
| 7 | **Gain staging** : PAM8403 bas, TDA2822 plus haut (déjà constaté le 18/09) | — | Moins de gain sur le dernier étage = moins de bruit amplifié |

**À acheter / prévoir** : 2–3 condensateurs électrolytiques 1000 µF 16 V, 2 condensateurs 470 µF 16 V, 2 perles de ferrite (ou selfs 47 µH), un peu de fil 0.75 mm².

---

## 4. Plan de test au retour

1. Sans USB (VIN rebranché) : le bruit persiste-t-il ? Sur quel HP ? Aussi au casque, et sur quel côté ?
2. Écran noir vs écran plein → confirmer la corrélation.
3. Ajouter le #1 (1000 µF matrice) → réécouter.
4. Ajouter #2 + #3 sur les amplis → réécouter.
5. Si un canal bruite encore : refaire son GND en étoile (#4).
6. Régler le gain staging (#7) une fois le bruit de fond réglé.

Voir aussi : `docs/pedago/20260915_condensateurs_debounce_dc_blocking.md`, `docs/pedago/20260612_audio_midi_circuit.md` (masse en étoile).

---

## 5. Diagnostic du 2026-10-26 (fait foi)

Contexte : firmware `ui_test` **avec le son** (Mozzi). Bruit "insupportable" au casque et aux HP.
Tous les tests en config **autonome** (USB débranché, VIN branché, secteur), sauf mention.

### 5.1 Tests par élimination

| # | Test | Résultat | Conclusion |
|---|---|---|---|
| 0 | Référence | Sifflement **aigu, surtout à GAUCHE**, au casque ET aux HP (HP : proportionnel au potar du PAM). + un bruit grave plus faible sur les 2 côtés | — |
| — | Luminosité haute / basse | Le ton change, **pas la force** | La luminosité n'est pas la cause |
| — | SYS > TEST LED : NOIR (LEDs éteintes, trames envoyées) / FIGE (plus aucune trame) | Toujours là, ton un peu plus grave | **Pas le courant des LEDs, pas les données** |
| — | SYS > TEST LED : SANS DITHER | Identique | Pas le logiciel FastLED |
| — | USB débranché, VIN + secteur | Identique | Pas la boucle de masse du PC |
| 1 | ▶ STOP (pas de musique) | Toujours là | Pas le son lui-même |
| 2 | Potentiomètre du TDA2822 | Baisse la musique, **pas le bruit** (au minimum on n'entend plus que lui) | Le bruit entre **après** l'entrée du TDA |
| 3 | 5V du PAM8403 débranché (écoute casque) | Identique | Pas le PAM8403 |
| 4 | GND d'entrée du TDA (vers l'ESP) débranché | Identique | Pas la boucle de masse ESP ↔ TDA |
| 5 | **ESP32 éteint** (VIN et USB débranchés), matrice noire | **Toujours là** | Ni l'ESP, ni les LEDs |
| 6 | **LOUT ↔ ROUT inversés au bornier du TDA** | **Le sifflement passe à DROITE** | **C'est le canal gauche du module TDA2822**, pas le jack ni le câblage |
| — | 100 nF dans le bornier VCC/GND du TDA | À peine atténué (peut-être) | Pas une oscillation très haute fréquence pure |

Le bruit grave présent entre 5 et 95 % du potar (et absent aux 2 extrémités) avec l'ESP éteint = entrée du TDA
en l'air qui capte le 50 Hz : normal, disparaît quand le DAC pilote l'entrée.

### 5.2 Hypothèses restantes

1. **Sifflement de l'alim LRS-75-5 à faible charge** (mode "rafales" : la fréquence dépend du courant demandé,
   ce qui explique que le ton changeait avec l'écran) qui passe par le VCC du TDA2822, mal filtré par la puce,
   et mieux par le canal gauche (tracé du module).
2. **Canal gauche du TDA2822 instable** (oscillation propre au module ou puce abîmée).

### 5.3 Remède retenu (commande en cours)

**Filtre RC sur l'alimentation du TDA2822** — 10 Ω en série dans le fil 5V + 1000 µF entre VCC et GND au bornier :

```
Domino 5V ──fil rouge──[ 10 Ω ]──┬──→ bornier TDA « VCC »
                                 │ (+)
                              1000 µF 16 V   ← bande « − » côté GND
                                 │ (−)
Domino GND ──fil noir────────────┴──→ bornier TDA « GND » (alim)
```

Coupure ≈ 1/(2π × 10 Ω × 1000 µF) ≈ 16 Hz : tout le sifflement audible est fortement atténué.
Chute de tension dans les 10 Ω négligeable (TDA2822 : quelques dizaines de mA, fonctionne dès 1,8 V).

**Plans B si ça ne suffit pas** (cas 2, oscillation) :
- **Réseau Zobel** sur chaque sortie : 4,7 Ω + 100 nF en série, entre LOUT (et ROUT) et GND — stabilise un ampli qui oscille (présent dans le schéma conseillé de la fiche technique, absent de beaucoup de modules)
- **Contourner le TDA2822** pour les HP : DAC → PAM8403 directement (le PAM accepte le niveau du DAC) ; le casque serait alors à revoir
- **MAX98357A** (en stock, I²S numérique : ni DAC interne ni TDA) pour la sortie HP
- Module TDA2822 de rechange : introuvable en livraison France (AliExpress) au 2026-10-26

**Correction** : les perles de ferrite recommandées au §3 sont **inutiles** ici — elles filtrent au-delà du MHz,
or ce bruit est audible (kHz). Une résistance (filtre RC) ou une self de forte valeur est nécessaire.
