# LIF2D — Interférences audio liées aux LEDs (+ bruit sur un seul HP)

> 2026-10-25 — Mis de côté : à traiter au retour, avec le matériel (condensateurs, ferrites, fer à souder).

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
