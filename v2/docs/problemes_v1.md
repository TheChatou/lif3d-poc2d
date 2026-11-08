# Problèmes rencontrés sur la V1 → réponses de conception V2

> Sources : `docs/progress.md`, `docs/analyses/` (2026-06 → 2026-11), sessions de debug.
> Chaque ligne : ce qui s'est passé → pourquoi → ce que la V2 doit faire **par conception**.

## 1. Son (le plus gros chantier)

| Problème V1 | Cause | Réponse V2 |
|---|---|---|
| Souffle, grain, son « jouet » | DAC interne ESP32 **8 bits** (48 dB de dynamique) ; tables d'onde Mozzi 8 bits | Codec **24 bits** (≥ 110 dB) + moteur en **float 32 bits** |
| Sifflement aigu qui change avec l'affichage et quand le PAM s'allume | LEDs, ESP32 et amplis sur **le même 5 V** ; TDA2822 à gain ×100 qui amplifie le bruit d'alim | **Rail audio séparé** (régulateur linéaire bas bruit dédié), **masse en étoile**, LEDs sur leur propre rail, plan de masse sur PCB |
| Canal gauche du TDA2822 qui siffle même ESP32 éteint | Module chinois à 1 € instable (diagnostic 2026-10-26) | Plus de module ampli générique : codec avec ampli casque intégré (WM8960/SGTL5000) ou ampli casque dédié sur PCB |
| Ronronnement ~2 Hz | Probable mode « rafales » de la LRS-75-5 peu chargée | Alim dimensionnée au besoin réel + filtrage LC + régulateur linéaire pour l'audio |
| Saturation quand les notes et la batterie s'empilent | Somme en entiers 8 bits écrêtée (corrigé le 2026-11-07 : limiteur, mixage 16 bits) | Mixage float + limiteur/compresseur de bus + marge (headroom) dès le départ |
| Potar du TDA qui crachote, gauche/droite déséquilibrés en bas de course | Tension continue (1,6 V) sur le potar ; gain trop fort → potar utilisé tout en bas | Volume **numérique** (codec) ou potar après un étage correctement dimensionné, sortie **centrée sur la masse** |
| Pas de graves au casque | Condos de sortie 100 µF + casque 16 Ω → coupure ~100 Hz | Sortie casque « capless » (centrée masse) ou condos ≥ 470 µF |
| Pas de graves sur les HP | HP 28 mm | HP plus grands + volume d'enceinte / évent, ou assumer « casque/ligne d'abord » |
| Percussions synthétisées peu crédibles (DnB qui « ne ressemble pas ») | Bruit blanc + sinus, 8 bits | Banque d'**échantillons** 16/24 bits (CC0 ou maison) + synthèse de percussions de qualité (type DaisySP / Teensy Audio) |
| Mozzi = plafond (8 bits, entiers, pas de filtre résonant de qualité) | Bibliothèque pensée pour les petits Arduino | DaisySP / Teensy Audio / moteur maison float |

## 2. Électronique et câblage

| Problème V1 | Cause | Réponse V2 |
|---|---|---|
| Matrice à moitié morte | Pointe de multimètre qui a ponté 5 V ↔ DIN en mesurant sous tension | PCB avec points de test, pas de mesures sur pads serrés ; procédure « continuité hors tension d'abord » |
| Rien ne s'allumait | Fil DATA sur la mauvaise broche | PCB = câblage figé, sérigraphie claire, connecteurs détrompés |
| Molettes qui ne tournent pas | Condensateur anti-rebond câblé **en série** au lieu d'en parallèle | Anti-rebond logiciel (déjà), empreintes prévues sur PCB si besoin |
| Flash qui échoue, USB qui alimente toute la boîte | VIN et USB reliés : le 5 V USB remonte vers la matrice | Diode / interrupteur de priorité d'alim (power path) : USB n'alimente que le MCU |
| LED rouge / parasites au démarrage | GPIO5 émet des impulsions au boot ; image de test oubliée | Broche DATA sans signal au boot + buffer 74AHCT125 avec enable (niveau 5 V propre en prime) |
| Câbles 22AWG sous-dimensionnés pour la matrice | Câbles d'origine de la matrice | Distribution d'alim sur PCB, injection aux 2 bouts, fusible par branche |
| Pas de multimètre, lecture des résistances difficile | Outillage | Kit d'outillage minimal dans la checklist (multimètre, pince à dénuder, gaine) |

## 3. Firmware

| Problème V1 | Cause | Réponse V2 |
|---|---|---|
| Conflits Mozzi / FastLED (interruptions, timers) | Son et LEDs sur le même MCU | **Deux processeurs** (son / interface) ou cœur dédié + DMA pour les LEDs |
| Matrice toute blanche après mise à jour | FastLED non figé (`^`) | Versions de toutes les bibliothèques **figées** + CI de compilation |
| Réglages perdus à chaque ajout de champ | Sauvegarde NVS = blob brut vérifié par taille | Format versionné (numéro de version + migration), ou clé par réglage |
| `audio.cpp` > 600 lignes | Croissance organique | Modules dès le départ : moteur son, séquenceur, batterie, effets, UI, stockage |
| Tests seulement sur la boîte | Pas de tests natifs | Logique pure (GoL, séquenceur, arpège, mixage) testable sur PC (`pio test -e native`) |

## 4. Interface et expérience

| Constat V1 | Réponse V2 |
|---|---|
| Gestes à clarifier (retour menu, double-clic qui ouvre des fenêtres en dessinant) | Grammaire des gestes figée dans un document de référence + tests de régression |
| Texte plein écran qui masquait l'effet d'une action | Messages en surimpression partout (fait en V1 pour GOL/BOOM) |
| Retour sur la dernière ligne de réglage | Mémoire de position par page (fait en V1, à persister en V2) |
| Mélodie / logo de démarrage appréciés | Garder une identité sonore et visuelle de démarrage |
| 16×16 = lisible mais petit pour les menus | Évaluer 32×32 ou LEDs plus denses (`../analyses/20260926_mini_led_matrice_custom_pcb.md`) |

## 5. Process

- Debug tard et fatigué → incidents matériels. Règle : pas de mesures sous tension après minuit.
- Hypothèses fausses coûteuses (ex. « le bruit vient des LEDs ») → diagnostic **par élimination**
  systématique (tableau de tests), comme le 2026-10-26.
- Promesses audio trop optimistes au CDC → en V2, chaque choix audio s'appuie sur une **mesure ou une
  fiche technique chiffrée** (SNR, THD+N, fréquence de coupure).
