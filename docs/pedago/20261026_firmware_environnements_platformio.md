# Firmware et environnements PlatformIO

## C'est quoi un firmware ?

**Définition** : le programme rangé dans la mémoire flash du microcontrôleur, qui démarre tout seul à la mise sous tension. "Firm" (ferme) = entre le *hardware* (dur, le matériel) et le *software* (mou, les logiciels d'un ordinateur) : c'est du logiciel, mais attaché à un matériel précis et qui ne change pas tant qu'on ne le reflashe pas.

**Analogie** : une console à cartouche. L'ESP32 ne contient **qu'une seule cartouche à la fois**. "Flasher" = remplacer la cartouche. L'ancienne n'est pas détruite : son code source reste dans le projet, on peut la remettre en une commande.

**Sur LIF2D** :
- la boîte n'exécute qu'**un** firmware à la fois ;
- flasher `ui_test` a remplacé le firmware musical dans l'ESP32, **pas dans le projet** : `src/main.cpp` + `audio.cpp` sont intacts.

## Les environnements PlatformIO (`[env:…]` dans `platformio.ini`)

Un environnement = une **recette de compilation** : quels fichiers source, quelles bibliothèques, quelles options. Un même projet peut produire plusieurs firmwares :

| Environnement | Fichiers compilés | Rôle |
|---|---|---|
| `esp32dev` | `src/main.cpp`, `gol`, `audio`, `controls` + Mozzi | firmware musical (GoL + son) |
| `led_test` | `test_leds/main.cpp` | test matériel de la matrice seule |
| `ui_test` | `src/ui/`, `gol`, `test_ui/main.cpp` | test des menus, sans son |

Commandes : `pio run -e ui_test -t upload` (compiler + flasher), `pio run -e esp32dev -t upload` (remettre la musique).

## Pourquoi un firmware de test séparé, sans musique ?

1. **Tester une seule chose à la fois** : si un menu bugue, on sait que ce n'est pas Mozzi.
2. **Mozzi et FastLED se marchent dessus** sur le même cœur du processeur (l'audio doit être servi des milliers de fois par seconde, et l'envoi de l'image aux LEDs bloque ~8 ms) → le mélange demande du soin, c'est une étape à part.
3. Le moteur audio actuel est **câblé en dur** sur la grille de `main.cpp` : le brancher sur les menus est du vrai travail.

## Pièges

- **Versions de bibliothèques** : `^3.6.0` = "la dernière compatible". Un nouvel environnement peut télécharger une version différente de celle qui marchait (matrice toute blanche avec FastLED 3.10.8). → figer la version exacte (`@ 3.10.3`).
- Ne pas oublier quel firmware est dans la boîte : "pas de musique" peut juste vouloir dire "c'est `ui_test`".
