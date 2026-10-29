# Audit ponytail du firmware LIF2D (2026-10-28)

**Ce que fait le code :** un ESP32 affiche un Jeu de la Vie sur une matrice LED 16×16 et le transforme en musique : la colonne lue donne le temps, la ligne donne la note. S'y ajoutent une boîte à rythme 8 pistes, des menus pilotés par 2 molettes, des presets sauvegardés en flash et 3 extras (TRIP, BRICK, PONG). Le son tourne sur le cœur 0 avec Mozzi, l'interface et les LEDs sur le cœur 1.

**Charge supposée :** une seule personne, une seule boîte. Ici, « tenir la charge » veut dire tenir le temps réel : 32 768 échantillons audio par seconde sans trou, et 50 images par seconde.

**Périmètre lu :**
- en entier : `src/audio.*`, `src/gol.*`, `src/ui/*` (sauf `font_data.h`, qui est généré), `test_ui/main.cpp` et `platformio.ini` ;
- en survol : `src/main.cpp`, `src/controls.*` et `include/config.h`.

---

## À corriger absolument

**1. Les voix sont coupées net avant l'écrêtage doux** (`src/audio.cpp:458`)
- **Ce que c'est :** `updateAudio()` additionne les 3 voix de mélodie puis fait `dry = constrain(dry, -127, 127)`. `soft_clip()` (l'écrêtage doux) n'arrive qu'après.
- **Problème :** en arpège, chaque note monte jusqu'à environ ±57, et avec un DECAY long, jusqu'à 3 notes se chevauchent. La somme atteint environ ±170, et tout ce qui dépasse ±127 est **rasé à angle droit**. Ça produit un grésillement aigu : c'est probablement une partie du « son qui crache ».
- **Correction :** supprimer cette ligne. `soft_clip` prend déjà toute la somme en `int32` (il faudra peut-être passer le `/ 2` à `/ 3`). Une ligne en moins.
- **Si on ne fait rien :** le son reste sale dès que les notes se chevauchent, et ce, quel que soit l'ampli.

**2. Deux cœurs écrivent dans la même photo de grille** (`src/audio.cpp:384`, `src/ui/ui_live.cpp:78` et `:121`)
- **Ce que c'est :** `audio_grid_update()` copie la grille dans un double tampon `snap[2]`, que le séquenceur lit pour choisir les notes. Elle est appelée depuis le cœur 0 (`on_beat`, à chaque temps) **et** depuis le cœur 1 (`live_tick`, 50 fois par seconde).
- **Problème :** les deux cœurs calculent le même tampon libre `w = 1 - snap_idx`. Le cœur 0 bascule dessus et lit sa colonne (`build_seq`, ligne 250) pendant que le cœur 1 est encore en train d'y recopier la grille. Le cas concret : de temps en temps, une colonne est jouée avec une grille à moitié copiée, et une fausse note sort, ou il en manque une.
- **Correction :** retirer l'appel de `live_tick` (ligne 121) et le mettre dans `live_grid_changed()`, qui est appelée après chaque dessin, graine ou chargement. Puis protéger la copie et la bascule par un spinlock (un verrou entre cœurs), comme `params_mux` le fait déjà. Ça fait environ 4 lignes, et 50 copies inutiles par seconde en moins.
- **Si on ne fait rien :** des notes fantômes rares, impossibles à reproduire.

## À corriger

**3. Le GoL évolue sur le cœur 0 pendant que l'interface modifie la grille sur le cœur 1** (`src/ui/ui_live.cpp:47`)
- **Ce que c'est :** `evolve()` calcule la génération suivante dans `grid_next`, puis la recopie dans `grid`. Ça tourne sur le cœur 0, à chaque temps.
- **Problème :** si tu dessines une case (DRAW), lances une PLUIE ou charges un preset pendant ces quelques dizaines de µs, la recopie écrase ta modification. Le cas concret : en DRAW, un clic « ne prend pas » de temps en temps, surtout à BPM élevé. C'est pareil pour la capture de la LOOP : `live_grid_changed()` remet `hist_len` à 0 au milieu de la capture, et la remise à zéro est perdue.
- **Correction :** utiliser le même spinlock que le n°2, autour de `evolve()` et autour des écritures de l'interface (`apply_tool`, `rain`, `load_slot`, `new_seed`). Le calcul d'une génération dure environ 30 µs, ce qui est acceptable sous verrou.
- **Si on ne fait rien :** un bug rare et agaçant, du genre « la boîte n'a pas vu mon clic ».

**4. La reverb ne travaille qu'en 8 bits** (`src/audio.cpp:101-122`)
- **Ce que c'est :** les lignes à retard de la reverb (« comb filters », des échos réinjectés) sont des `int8_t`, et elles reçoivent `dry / 2`, donc en réalité 7 bits.
- **Problème :** la queue de reverb n'a que quelques dizaines de niveaux. Elle devient granuleuse en s'éteignant, et `sat8` la coupe net dès qu'elle déborde. Le correctif `/ 256` d'aujourd'hui évite qu'elle se bloque, mais le grain reste.
- **Correction :** passer les 4 tampons en `int16_t` et calculer en 16 bits (`sat16`). Ça coûte 3,6 Ko de RAM de plus (on utilise 12 % de la RAM) et ce sont les mêmes lignes de code.
- **Si on ne fait rien :** une reverb « sale » à fort réglage REVERB.

**5. La sauvegarde automatique peut faire claquer le son** (`src/ui/ui_storage.cpp:38`), *à vérifier à l'oreille*
- **Ce que c'est :** 2 s après chaque changement de réglage, y compris le volume ou ▶, on écrit en flash.
- **Problème :** pendant une écriture en flash, l'ESP32 suspend tout le code qui vit en flash, sur les **deux** cœurs. Si l'écriture doit effacer une page (jusqu'à environ 20 à 40 ms), le tampon audio de 7,8 ms se vide et on entend un clic, 2 s après avoir tourné le volume.
- **Correction :** si le clic s'entend, ne sauvegarder qu'en sortant d'une page de réglages, ou quand la musique est en pause.
- **Si on ne fait rien :** un petit « tic » de temps en temps, en plein morceau.

**6. Les réglages PAN et SWING par piste ne font rien** (`src/ui/ui_pages.cpp:131`)
- **Ce que c'est :** la page d'une piste BOOM propose 8 réglages.
- **Problème :** `push_audio_params()` n'envoie ni PAN ni SWING, et `DrumTrack` n'a pas ces champs. Tu les tournes, et rien ne change au son.
- **Correction :** les retirer de la page (6 réglages au lieu de 8), ou les brancher à l'étape « Audio ». Supprimer est le plus court.
- **Si on ne fait rien :** tu penseras que la boîte bugue.

**7. Un angle négatif est converti en `uint8_t`** (`src/ui/ui_trip.cpp:66`), *c'est moi qui l'ai introduit*
- **Ce que c'est :** `(uint8_t)(atan2f(dy, dx) * 40.74f)` transforme l'angle en 0–255.
- **Problème :** `atan2f` renvoie une valeur négative pour la moitié haute de l'écran. En C++, convertir un `float` négatif en entier non signé est un comportement **indéfini** (le compilateur fait ce qu'il veut). Aujourd'hui GCC donne probablement le bon résultat, mais rien ne le garantit après une mise à jour du compilateur.
- **Correction :** `(uint8_t)(int)(...)`, avec 5 caractères ajoutés.
- **Si on ne fait rien :** TUNNEL et MANDALA pourraient un jour s'afficher cassés sur une moitié de l'écran.

**8. La règle du GoL n'a aucun test** (`src/gol.cpp:203`)
- **Ce que c'est :** `gol_step` applique les règles B/S avec des masques de bits. Le même fichier est utilisé par le simulateur Python (`gol.so`).
- **Problème :** si quelqu'un se trompe d'un bit dans `GOL_RULES`, toute la musique change sans qu'aucune alerte ne sonne.
- **Correction :** **un seul** test natif (le dossier `test/` existe déjà) : un « blinker » (3 cellules en ligne) doit devenir vertical puis revenir à l'horizontale en règle Conway. Une quinzaine de lignes, lancées avec `pio test -e native`.
- **Si on ne fait rien :** une régression silencieuse le jour où on touche aux règles.

**9. Le debug série ralentit l'interface quand on tourne vite** (`test_ui/main.cpp:41-66`)
- **Ce que c'est :** à chaque tour de `loop()`, `debug_pins()` et `debug_inputs()` impriment une ligne sur le port série dès qu'une broche de molette change.
- **Problème :** une molette tournée vite produit des centaines de changements par seconde. À 115 200 bauds, chaque ligne prend environ 5 ms, le tampon série se remplit et `Serial.printf` **bloque** `loop()`, donc l'affichage et les boutons. Les encodeurs sont réparés, ce debug n'a plus de raison d'être.
- **Correction :** supprimer les 2 fonctions. L'écran DIAG fait déjà le même travail sur la matrice (~30 lignes en moins).
- **Si on ne fait rien :** l'image saccade quand on tourne vite, PONG et BRICK compris.

**10. La liste du hub est écrite deux fois** (`src/ui/ui.cpp:93-108`)
- **Ce que c'est :** le hub existe en 2 versions, `HUB_TOP` + sous-menus, et `HUB_FLAT_ITEMS` (le menu « à plat », une variante de SYS).
- **Problème :** chaque nouvel écran doit être ajouté **aux deux** endroits. J'ai dû le faire pour TRIP, BRICK et PONG, et un oubli rendrait un écran inaccessible dans l'un des deux modes.
- **Correction :** choisir ton style définitif (2 niveaux, je suppose) et supprimer `HUB_FLAT`. Même chose pour les variantes de test `SEL_BLINK`/`SEL_COLOR` et `BOOT_TEXT` si tu as fait ton choix (~40 lignes et 3 réglages SYS en moins).
- **Si on ne fait rien :** des menus qui divergent.

**11. Du code mort** (plusieurs fichiers)
- **Ce que c'est :**
  - le mode dépannage `ENC_SINGLE_CHANNEL` (`src/ui/input.cpp:17-60`, ~20 lignes, toujours à 0) ;
  - `gol_step_age` et `gol_population` (`src/gol.cpp`, utilisés seulement par l'ancien `src/main.cpp`, ou par personne) ;
  - `disp_level`, `Level` et `disp_brightness` (`src/ui/display.*`) ;
  - les polices `FONT_3X4` et `FONT_4X6` (générées mais jamais utilisées).
- **Problème :** c'est du code à lire et à maintenir pour rien. `gol_step_age` est par exemple une quasi-copie de `gol_step` : une correction faite dans l'une sera oubliée dans l'autre.
- **Correction :** supprimer ces symboles. Pour les polices, il faut aussi les retirer de `tools/gen_fonts.py`.
- **Si on ne fait rien :** environ 120 lignes de bruit.

**12. Deux firmwares qui divergent** (`src/main.cpp`, `src/controls.*` contre `test_ui/main.cpp` + `src/ui/`)
- **Ce que c'est :** l'ancien firmware `env:esp32dev` a sa propre boucle GoL, son propre câblage serpentin et sa propre lecture des boutons. Il compile toujours.
- **Problème :** tout le vrai travail est dans `ui_test`. Les deux versions du serpentin, de la graine et des boutons sont déjà différentes.
- **Correction :** c'est l'étape 4 de la feuille de route. `test_ui/main.cpp` devient `src/main.cpp`, et on supprime l'ancien `main.cpp` et `controls.*` (~200 lignes).
- **Si on ne fait rien :** quelqu'un flashera le mauvais environnement et croira à une régression.

**13. Des fichiers qui mélangent plusieurs métiers** (taille > 200 lignes)
- **Ce que c'est :**
  - `audio.cpp` fait 485 lignes : gammes, timbres, reverb, batterie, arpège, séquenceur et sortie ;
  - `ui_pages.cpp` 277 (tables de réglages + moteur de page + confirmation) ;
  - `ui_live.cpp` 275 (horloge, LOOP, GOL, DRAW, overlay) ;
  - `ui_rec.cpp` 266 (presets + saisie de nom) ;
  - `ui.cpp` 249.
- **Problème :** pour retoucher la reverb, il faut naviguer dans 485 lignes de séquenceur et de batterie.
- **Correction :** découper **par métier**, pas par nombre de lignes : `audio_reverb.cpp`, `audio_drums.cpp`, `ui_draw.cpp` (DRAW sort de `ui_live`), `ui_name.cpp` (saisie de nom sort de `ui_rec`). Aucun changement de comportement.
- **Si on ne fait rien :** c'est seulement plus lent à lire, rien ne casse.

## Bonus

**14. Les réglages son sont renvoyés 50 fois par seconde, même s'ils n'ont pas changé** (`src/ui/ui_live.cpp:95`)
- **Ce que c'est :** à chaque image, `push_audio_params()` remplit un paquet d'environ 700 octets (avec les 256 vélocités et probabilités par pas), le copie sous verrou, et le cœur audio le recopie puis recalcule gammes, tempo et timbres.
- **Problème :** ça fait environ 100 copies et 50 recalculs par seconde pour rien. Ce n'est pas lent aujourd'hui (quelques µs), mais c'est du travail gratuit sur le cœur audio.
- **Correction :** garder le dernier paquet envoyé et ne renvoyer qu'en cas de différence (`memcmp`, 3 lignes).
- **Si on ne fait rien :** rien de visible.

**15. Un octet de remplissage dans `Settings` peut tromper la comparaison** (`src/ui/ui_storage.cpp:42`)
- **Ce que c'est :** `settings_tick()` compare `cfg` octet par octet avec la dernière copie.
- **Problème :** `Settings` contient 30 `int16_t` suivis d'un `bool`, donc le compilateur ajoute 1 octet de « remplissage » (padding) invisible à la fin. Le C++ ne garantit pas que `saved = cfg` copie cet octet. Si ce n'est pas le cas, la comparaison voit une différence permanente et on réécrit la flash toutes les 2 s, ce qui l'use et ajoute des clics (voir n°5).
- **Correction :** déclarer `int16_t playing` au lieu de `bool`, ce qui supprime le remplissage. Un mot à changer.
- **Si on ne fait rien :** probablement rien avec GCC, mais c'est un piège.

---

**Verdict :** le code est sain et lisible, et le CPU a largement de la marge (audio < 10 %, TRIP environ 1 ms par image). Il faut corriger en premier **le n°1**, qui touche directement au son qui crache, puis **les n°2 et n°3**, les accès croisés entre les deux cœurs.

**Allègement possible : environ −400 lignes** (debug série, code mort, variantes SYS, ancien firmware), **et −0 dépendance** : FastLED et Mozzi sont nécessaires.

**Pas vérifié :**
- `font_data.h` (généré) et `tools/` ;
- le simulateur Python ;
- `include/config.h` (survolé seulement) ;
- aucune mesure réelle sur la boîte : la charge CPU et la durée des écritures flash sont des estimations ;
- les n°5 et n°15 sont *plausibles*, pas prouvés.
