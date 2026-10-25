# LIF2D — Journal de progression

---

## 2026-06-02 — Première session lab, setup hardware

**Fait :**
- État des lieux complet du projet (firmware, simulateur, matos)
- Création du skill `/sim` (lance le simulateur depuis Claude Code)
- Création du skill `/log-session` (documente les sessions)
- Correction bug `sim.py` ligne 1013 — `v` parasite causant un IndentationError
- Mise à jour CLAUDE.md : MCU confirmé ESP32-D, hardware reçu listé, gamme Japonaise en priorité, paramètres son validés
- Inventaire hardware : perso (ESP32-D, WS2812B, PAM8403 HW-894 BT5.0, HP 4Ω ×2, alim 12V/2A) + lab (LM2596S)
- Brief fonctionnel rédigé pour Claude Design (`docs/BRIEF_DESIGN.md`)
- Guide de montage complet rédigé (`docs/TUTO_MONTAGE.md`)
- **LM2596S calé à 5.0V** au multimètre — DC Power Supply NANKADF réglé à 12V/1A, multimètre V— range 20V sur OUT+ / OUT−

**Décisions :**
- Utiliser le LM2596S du lab (3A) plutôt que le HX Mini 360 (1.8A) — plus de marge pour les LEDs
- Alimentation tests : DC Power Supply NANKADF (lab) en 12V → LM2596S → 5V, pas le BF-1220 (nécessite adaptateur barrel jack)
- Brief Claude Design : zéro prescription UX, laisser imaginer librement à partir des fonctionnalités + contexte physique

**Prochaines étapes :**
- [ ] Étape 2 — Premier test ESP32-D seul (blink + Serial Monitor)
- [ ] Étape 3 — Premier allumage WS2812B
- [ ] Étape 4 — Test audio PAM8403
- [ ] Lancer Claude Design avec le brief

**Hardware présent au lab :**
ESP32-D, WS2812B 16×16, PAM8403 HW-894, HP 4Ω ×2, alim 12V/2A BF-1220, LM2596S (lab), DC Power Supply NANKADF (lab), multimètre (lab)

---
## 2026-09-14 — FreeCAD merges + config.h finalisé

**Fait :**
- FreeCAD : chanfrein 1mm haut+bas créé proprement sur les 2 caches-boutons (Extrude117/118_zigzag), anciens objets cassés/orphelins nettoyés
- FreeCAD : nouveau support générique 30×45mm créé dans le style de support_pam (sans le cut cylindrique)
- FreeCAD : ouverture du connecteur PJ3412 élargie de 0.1mm (puis annulée sur demande)
- FreeCAD : objet `PJ3411` (hiérarchie App::Part imbriquée, 12 objets) supprimé — invisible/inutile
- FreeCAD : `POWER HOLDER` réparé (sketch source avec cercle+rectangle qui se chevauchaient au lieu d'une silhouette unique — auto-intersection corrigée)
- FreeCAD : `Compound002` "Glissière" fusionné proprement (n'était que compoundé, jamais vraiment fusionné)
- FreeCAD : **`FULL_BOTTOM_pour_impression`** et **`FULL_TOP_pour_impression`** créés — coques + tous les supports internes, chacun 1 seul solide valide, prêts pour export STL/Bambu
- `include/config.h` mis à jour : design final 2 encodeurs (`ENC_A`/`ENC_B`, ex-X/Y) + 1 bouton play/pause confirmé et câblé en dur ; ancien `ENC_VOL` (GPIO16/17/18) et `SW_ONOFF` (GPIO13) supprimés ; résistances/condensateurs documentés en constantes
- Schéma de câblage complet publié en artefact (signal GPIO + alimentation 5V/GND dédiée), mis à jour au fil de la session avec TDA2822, IEC Huaconn, LRS-75-5, MIDI Clock/MIDI IN prévu

**Décisions :**
- Design contrôleurs définitivement tranché : 1 bouton + 2 encodeurs génériques (plus de rôle fixe volume/X/Y), tout le paramétrage via menu sur la matrice LED
- GPIO13, 16, 17, 18 officiellement libérés, ne plus les câbler
- Les 2 pièces FreeCAD à problème étaient réparables sans perte de design (pas besoin de repartir de zéro)

**Problèmes rencontrés :**
- `Part::Boolean` (Fuse/MultiFuse) plante avec `Standard_NullObject` sur certains objets multi-solides (Extrude126/127) — contournement : fusion brute via `Shape.fuse()` + `removeSplitter()` en Python plutôt que la commande GUI
- `POWER HOLDER` et `Compound002` avaient des défauts géométriques non visibles via `isValid()` seul — nécessite `Shape.check(True)` pour les détecter (auto-intersections BOP)
- Décalage d'attache (`AttachmentOffset`) sur un Sketch : le repère local d'une face peut être inversé par rapport au Z global — toujours vérifier le `Placement` résultant, pas juste le signe de l'offset

**Prochaines étapes :**
- [ ] Export STL des deux pièces fusionnées + slicing Bambu
- [ ] Décider si `POWER HOLDER` doit être revu en profondeur ou si la réparation suffit à long terme
- [ ] Continuer `src/controls.cpp` (2 encodeurs + bouton) maintenant que les GPIO sont figés
- [ ] Câbler MIDI IN si le H11L1 est commandé/reçu (voir `docs/analyses/20260911_io_audio_midi_reflexion.md`)

**Hardware présent :** inchangé depuis les dernières sessions (voir mémoire projet `project_hardware.md`) — rien de nouveau reçu cette session, uniquement du travail CAO + firmware/doc.

---
## 2026-10-24 — Hardware terminé, début de la phase software

**Fait (entre le 15/09 et le 24/10, hors sessions Claude) :**
- Chronologie (précisée par Felix) : **août** modélisation à la maison → **fin août / début sept.** au Lab, finalisation modélisation + tests d'impression → **semaine du 14/09** impression de toutes les pièces → **nuit du 18 ou 19/09** soudure et câblage complet (le lendemain : incident matrice) → **départ en woofing** → **~11/10** réception et soudure de la nouvelle matrice → **24/10** reprise, phase software
- **Boîtier LIF2D entièrement assemblé et fonctionnel** (impression, soudure, câblage complet) — terminé avant le départ de Paris
- Le firmware de test (affichage chiffres/texte/glider) tourne déjà sur l'ESP32 — matrice, police 3×5 et boîtier validés visuellement
- Matrice WS2812B **rachetée** (voir incident ci-dessous)
- Schéma de câblage as-built dessiné à la main + photos → `docs/photos/` (renommées `20261024_*`, copies `.jpg` ajoutées)
- Vérification schéma ↔ `include/config.h` : **les 15 connexions ESP32 correspondent** (GPIO 4, 5, 14, 19, 21, 22, 23, 25, 26, 32, 33 + VIN/GND/3.3V/GND). Seul le commentaire de la section AUDIO était obsolète (chaîne DAC → TDA2822 → jack 5 broches → PAM8403) — corrigé
- MIDI OUT confirmé conforme TRS **Type A** (Tip = data GPIO4 via 220Ω, Ring = 3.3V via 220Ω, Sleeve = GND)
- Nouveau document : `docs/analyses/20261024_ui_grammaire_controles.md` (inventaire des gestes, types d'écrans, premier jet des réglages)

**Incident — matrice à moitié morte (retour d'expérience) :**
- Contexte : soudure jusqu'à 4h du matin, matrice qui ne s'allumait pas. Le lendemain, debug au multimètre en touchant (en tremblant) les soudures 5V/GND de la réinjection de courant au centre de la matrice. 5 min après : découverte que le fil DATA n'était pas sur la bonne broche de l'ESP32 — c'était la vraie cause du "rien ne s'allume". Résultat : seule la moitié de la matrice fonctionnait.
- Cause probable : la pointe de touche a ponté un pad 5V avec un pad DIN/DOUT voisin → la LED au milieu de la chaîne a grillé, et comme chaque WS2812B retransmet le signal à la suivante, **toute la suite de la chaîne est morte**.
- Leçons :
  1. **Vérifier d'abord le câblage logique (broche DATA, GND commun) avant de mesurer sous tension** — une erreur de broche ne grille rien, une pointe qui glisse oui.
  2. Mesurer **hors tension** (continuité) dès que possible ; sous tension, utiliser des pinces crocodiles plutôt que des pointes tenues à la main sur des pads serrés.
  3. Ne pas debugger fatigué.
  4. 💡 La vieille matrice est probablement **réparable** : une moitié morte = souvent **une seule LED grillée** à la frontière. Remplacer cette LED (5050, en stock sur AliExpress) ou ponter DIN→DOUT sur elle = matrice de rechange.

**Points hardware à confirmer :**
- ~~Condos 100µF sortie TDA2822~~ → résolu : intégrés au module (2 condos 100µF visibles devant les bornes de sortie)
- Son strident : dépend des volumes réglés sur les potards des amplis — baissés pour l'instant ; tests de gain TDA2822/PAM8403 à faire (étape 5)
- ~~Sortie HP− : symbole hachuré~~ → résolu : erreur de dessin, la résistance 1Ω est bien montée côté + (conforme)
- Affectation exacte A/B/clic de chaque encodeur : à valider avec un test (le sens de rotation s'inverse en logiciel si besoin)

**Décisions :**
- Phase suivante = **software**, en commençant par la conception UI : inventaire des réglages + grammaire de gestes + simulateur **web** fidèle au boîtier (photos + FreeCAD)
- Logique des menus écrite de façon portable pour finir en C++ sur l'ESP32 (une seule source de vérité)
- Test par une personne extérieure : plus tard, une fois la maquette jouable

**Prochaines étapes :**
- [ ] Séance de conception : trancher les questions de `20261024_ui_grammaire_controles.md` §6
- [ ] Compléter l'inventaire des réglages (§5)
- [ ] Simulateur web : rendu du boîtier réel + matrice + 2 molettes + bouton ▶
- [ ] Puis firmware : `controls.cpp` (encodeurs), `menu`, sauvegarde NVS

---
## 2026-10-25 — Premier firmware de test des menus (`ui_test`) sur la boîte

**Fait :**
- Firmware `ui_test` (env PlatformIO séparé, sans son) : modules réutilisables `src/ui/` (polices, affichage, entrées, hub, pages de réglages, BOOM, presets, DIAG) + `test_ui/main.cpp` ; polices générées depuis `tools/fonts_src.py` par `tools/gen_fonts.py`
- Orientation de la matrice validée : `ORIENT_TRANSPOSE = 1` seul (`src/ui/display.cpp`)
- DAC fixé à mi-tension quand il n'y a pas de son → plus d'entrée d'ampli flottante
- Fiche interférences : `docs/analyses/20261025_interferences_leds_audio.md`

**Problèmes rencontrés :**
- ⚠️ **Matrice toute blanche au 1er flash** : FastLED non figé (`^3.6.0`) → nouvel env a pris la 3.10.8. Corrigé : `ui_test` figé sur **FastLED 3.10.3** (version validée). Ajout d'une image de sécurité (1 LED rouge 2 s) + luminosité 20 au démarrage
- ⚠️ **Flash qui échoue + USB qui alimente toute la boîte** : secteur coupé, le 5 V USB ressort par VIN et alimente matrice + amplis → le port s'écroule. **Procédure de flash** : débrancher le fil VIN de l'ESP32 (garder GND), USB pour l'ESP32 seul, secteur pour le reste. Jamais USB + VIN branchés ensemble. Rebrancher VIN pour l'usage autonome
- ⚠️ **Molettes : la rotation ne fait rien** (clics OK). Diagnostic par mouchard série : les broches A (GPIO22, GPIO32) restent à 1 en permanence, seules les B bougent. **Cause : condensateur 100 nF câblé EN SÉRIE sur le fil A** (au lieu d'entre A et GND), sur les 2 encodeurs. **Réparation** : retirer le condo et rejoindre les 2 bouts de fil (Wago/domino, pas besoin de souder) ; le condo est facultatif (décodeur à table = anti-rebond logiciel), sinon le mettre entre A et C (GND) de l'encodeur. En attendant : `ENC_SINGLE_CHANNEL 1` dans `src/ui/input.cpp` (tourner = +1, tourner molette enfoncée = −1) → **remettre à 0 après réparation**
- Bruit audio corrélé à l'affichage des LEDs, surtout sur un HP → matériel (condensateurs / masses), mis de côté (voir fiche)

**Retours UX de Felix :**
- Les pages de réglages en "lignes de LEDs" n'ont pas été comprises (vues figées faute de rotation) → retester une fois la navigation possible ; variante prévue : réglage sélectionné en grand (nom + valeur), lignes en repère discret
- Bilan Felix (fin de session) : "pas mal dans l'ensemble, plus ou moins ce que j'avais en tête". Déplacement dans les presets peu pratique (aggravé par le mode dépannage 1 contact) ; quelques petits bugs ressentis → à lister à la prochaine session

**Réparation encodeurs — précision :** le condensateur est **soudé directement sur la broche A** de l'encodeur (impossible de juste couper un fil + Wago). Options, de la plus simple à la plus propre :
1. **Ponter le condensateur** : souder un petit bout de fil (ou une goutte d'étain) entre ses 2 pattes → il est court-circuité = A relié directement au fil du GPIO. Aucun dessoudage.
2. Dessouder le condensateur, souder le fil du GPIO directement sur la broche A.
3. (optionnel) remettre le condo entre A et C (GND) de l'encodeur.

**Prochaines étapes :**
- [ ] 2026-10-26 : musique dans `ui_test` (Mozzi + grille GoL de l'UI)
- [ ] Soudure des 2 encodeurs (option 1 ci-dessus) puis `ENC_SINGLE_CHANNEL 0`
- [ ] Lister et corriger les petits bugs UI ; améliorer la navigation dans les presets
- [ ] Figer aussi FastLED 3.10.3 dans `env:esp32dev` et `env:led_test` (encore en `^3.6.0`)

---
## 2026-10-26 — Encodeurs réparés, son dans `ui_test`, diagnostic du bruit

**Fait :**
- **Encodeurs réparés** (Felix) : condensateurs 100 nF **retirés**, fil GPIO directement sur la broche A. `ENC_SINGLE_CHANNEL 0` ; sens inversé pour que horaire = descendre / augmenter (`INVERT_A/B 1`). Quadrature propre (4 transitions par cran, aucun rebond vu)
- **Son dans `ui_test`** : Mozzi + `audio.cpp` ajoutés à l'env ; l'horloge du séquenceur fait avancer le GoL (callback par temps) et la tête de lecture ; ▶ = pause/reprise du son ; molette droite = volume (`audio_set_volume`). Pas encore reliés : BPM, gamme, timbre… ; la BOOM n'est pas reliée aux percussions de `audio.cpp`
- **Presets (REC)** déplacés dans `src/ui/ui_rec.cpp` : clic gauche = aperçu du nom, ▶ = charger + lancer, clic droit = sauver (vide) / ANNULER-ECRASER-SUPPRIMER (occupé) ; **saisie de nom** 12 caractères façon borne d'arcade ; molette gauche = case par case, droite = ligne par ligne. Presets en RAM (NVS à l'étape 4)
- **Réglages en 2 temps** : tourner = ligne (blanc chaud), clic droit = éditer (clignote, valeur affichée, effet en direct), clic droit = valider, clic gauche / appui long = annuler-revenir
- **Appui long ▶ = retour au GOL** depuis partout (sauf GOL = graine, DRAW = effacer)
- Toasts longs : défilent en entier au lieu d'être coupés
- **SYS > TEST LED** (NORMAL / NOIR / FIGE / SANS DITHER) pour le diagnostic du bruit

**Diagnostic du bruit** (détail : `docs/analyses/20261025_interferences_leds_audio.md` §5) :
- Ce ne sont **pas** les LEDs, ni l'ESP32, ni le PAM8403, ni le jack : le sifflement reste ESP32 éteint, et **suit la sortie LOUT du TDA2822** quand on inverse LOUT/ROUT
- Remède commandé : **filtre RC 10 Ω + 1000 µF 16 V** sur le VCC du TDA2822 ; plan B : réseau Zobel 4,7 Ω + 100 nF, ou contourner le TDA

**Retours UX de Felix :** menus "pas mal dans l'ensemble" ; mode édition à valider après essai.

**Prochaines étapes :**
- [ ] Poser le filtre RC sur le TDA2822 à réception des composants → réécouter
- [ ] Valider (ou non) le mode édition des réglages
- [ ] Relier BPM / gamme / timbre / BOOM au son
- [ ] Figer aussi FastLED 3.10.3 dans `env:esp32dev` et `env:led_test`
