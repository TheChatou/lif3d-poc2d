#pragma once

/*
 * config.h — Toutes les constantes et broches GPIO du projet LIF2D
 * =================================================================
 *
 * 🎓 Ce fichier centralise TOUTES les définitions du projet.
 *    L'avantage : si tu changes une broche physique, tu ne modifies
 *    qu'ici — le reste du code s'adapte automatiquement.
 *
 *    #define NOM  valeur  →  le compilateur remplace chaque occurrence
 *    de NOM par la valeur avant même de compiler. Zéro coût en RAM.
 *
 * Hardware : ESP32-WROOM-32 (= "ESP32-D")
 * ⚠ L'ESP32 a ~25 GPIO utilisables sur ~38 au total.
 *   Certaines broches ont des rôles spéciaux au démarrage ("strapping pins").
 *   Chaque cas particulier est documenté ci-dessous.
 */


// ============================================================================
// GRILLE GAME OF LIFE
// ============================================================================
// 🎓 La grille est un tableau 2D de cellules vivantes (1) ou mortes (0).
//    16×16 = 256 cellules — parfait pour notre matrice LED.

#define GRID_COLS    16
#define GRID_ROWS    16
#define GRID_SIZE    16                    // alias pratique (grille carrée)
#define CELL_COUNT   (GRID_COLS * GRID_ROWS)  // 256


// ============================================================================
// MATRICE LED WS2812B 16×16 — pilotée par FastLED
// ============================================================================
// 🎓 Les WS2812B sont des LEDs RGB "intelligentes" : chaque LED contient
//    une puce qui reçoit et retransmet les données. Un seul fil de données
//    suffit pour contrôler les 256 LEDs en chaîne !
//
//    GPIO 5 : safe pour FastLED, aucune restriction.
//
// ⚠ IMPORTANT dans platformio.ini — ajouter cette ligne dans build_flags :
//      -D FASTLED_ESP32_I2S=true
//    Sans ça, FastLED peut interférer avec Mozzi (ils partagent les timers).

#define LED_DATA_PIN             5     // DIN de la matrice → GPIO 5
#define LED_COUNT              256     // 16×16 = 256 LEDs
#define LED_DEFAULT_BRIGHTNESS  80     // 0–255 (limité pour économiser l'énergie)
// LED_COLOR_ORDER (GRB) défini directement dans leds.cpp avec FastLED
// 🎓 GRB est un type FastLED — ne pas l'inclure ici pour garder config.h
//    compatible avec la compilation native (simulateur PC sans FastLED).


// ============================================================================
// AUDIO — DAC intégré ESP32 → amplificateur PAM8403
// ============================================================================
// 🎓 DAC = Digital-to-Analog Converter.
//    L'ESP32 génère un nombre (0–255) → le DAC le convertit en tension (0–3.3V).
//    Cette tension analogique entre dans le PAM8403 qui l'amplifie pour les HP.
//
//    L'ESP32 a 2 DAC 8-bit : DAC1 sur GPIO 25, DAC2 sur GPIO 26.
//    Mozzi utilisera ces deux sorties pour le son stéréo (gauche + droite).

#define AUDIO_LEFT_PIN    25   // DAC1 → entrée gauche PAM8403 (canal L)
#define AUDIO_RIGHT_PIN   26   // DAC2 → entrée droite PAM8403 (canal R)


// ============================================================================
// POTENTIOMÈTRES — ADC1 (GPIO en entrée uniquement)
// ============================================================================
// 🎓 ADC = Analog-to-Digital Converter — l'inverse du DAC.
//    Lit la tension d'un potentiomètre (0–3.3V) et renvoie 0–4095 (12 bits).
//
//    GPIO 34, 36, 39 sont "input-only" : ils ne peuvent pas sortir de signal
//    ni activer de résistance interne (pullup). Pas de souci pour des pots
//    car un potentiomètre génère lui-même sa tension — pas besoin de pullup.
//
//    ⚠ Utiliser ADC1 (GPIO 32–39) et non ADC2 : ADC2 est désactivé
//    quand le WiFi est actif. ADC1 est toujours disponible.

#define POT_VOLUME_PIN       36   // ADC1_CH0 — volume audio général    (0–100%)
#define POT_BRIGHTNESS_PIN   39   // ADC1_CH3 — luminosité de la matrice (0–255)
#define POT_RULES_PIN        34   // ADC1_CH6 — sélection règle GoL (B/S prédéfinie)


// ============================================================================
// ENCODEUR BPM — tempo du séquenceur (40–300 BPM)
// ============================================================================
// 🎓 Un encodeur rotatif EC11 génère 2 signaux décalés appelés CLK et DT.
//    Quand on tourne, les impulsions arrivent dans un ordre différent selon
//    le sens. En comparant CLK et DT, le firmware sait : gauche = –BPM, droite = +BPM.
//    Cet encodeur n'a pas de bouton poussoir intégré.

#define ENC_BPM_CLK    16   // signal d'horloge encodeur BPM
#define ENC_BPM_DT     17   // signal de direction encodeur BPM


// ============================================================================
// ENCODEUR GAMME — gros encodeur central "valve"
// ============================================================================
// 🎓 Ce gros encodeur sélectionne la gamme musicale : pentatonique, mineur,
//    majeur, dorien... Son bouton (BTN) sert au changement de mode principal :
//    appui court = confirme la sélection, appui long = bascule GoL ↔ Dessin.

#define ENC_SCALE_CLK    18
#define ENC_SCALE_DT     19
#define ENC_SCALE_BTN    21   // bouton clic encodeur gamme


// ============================================================================
// ENCODEUR TIMBRE — preset sonore Mozzi
// ============================================================================
// 🎓 Phase 1 : le bouton Timbre (GPIO 27) est réutilisé comme Play/Pause
//    (la machine n'a pas assez de GPIO libres pour un bouton dédié — voir note
//    en bas de fichier). En Phase 2 : il resettera le timbre au preset 0.

#define ENC_TIMBRE_CLK    22
#define ENC_TIMBRE_DT     23
#define ENC_TIMBRE_BTN    27   // ← Play/Pause en Phase 1

#define BTN_PLAY_PIN   ENC_TIMBRE_BTN   // alias lisible pour le firmware


// ============================================================================
// ENCODEUR OCTAVE — octave de base (2–6)
// ============================================================================
// 🎓 L'octave déplace toutes les notes vers le haut ou le bas.
//    Octave 4 = do médian du piano (MIDI note 60). Standard musical.
//    Le bouton d'octave est réservé à la Phase 2.

#define ENC_OCTAVE_CLK    13
#define ENC_OCTAVE_DT     14
#define ENC_OCTAVE_BTN     4   // Phase 2 — laisser non câblé en Phase 1


// ============================================================================
// ENCODEUR Y — axe vertical (mode dessin)
// ============================================================================
// 🎓 En mode Dessin, cet encodeur déplace le curseur de haut en bas.
//    GPIO 32 et 33 sont parmi les plus "purs" de l'ESP32 : aucun rôle
//    spécial au boot, support ADC et interruptions. Choix idéal.
//
// ⚠ GPIO 12 (bouton Y) : "strapping pin" — au démarrage, l'ESP32 lit
//    cette broche pour choisir la tension d'alimentation du flash.
//    Sur tous les modules WROOM-32 commerciaux, l'eFuse est déjà programmé
//    → GPIO 12 est safe à utiliser. Mais : utiliser une résistance pullup
//    EXTERNE 10kΩ (ne pas utiliser INPUT_PULLUP dans le code).

#define ENC_Y_CLK    32
#define ENC_Y_DT     33
#define ENC_Y_BTN    12   // ⚠ voir note ci-dessus — pullup externe 10kΩ requis


// ============================================================================
// ENCODEUR X — axe horizontal (mode dessin)
// ============================================================================
// 🎓 En mode Dessin, cet encodeur déplace le curseur de gauche à droite.
//    Combiné avec l'encodeur Y, on navigue dans la grille pour placer
//    ou effacer des cellules à la main.
//
// ⚠ GPIO 35 (CLK) : input-only, pas de pullup interne possible.
//    → Ajouter une résistance pullup externe 10kΩ entre GPIO 35 et 3.3V.
//
// ⚠ GPIO 15 (DT) : strapping pin. Avec pullup (HIGH au boot) = boot normal. OK.
//
// ⚠ GPIO 2 (BTN) : la plupart des cartes ESP32-Dev ont une LED intégrée sur GPIO 2.
//    Elle clignote pendant l'upload. En fonctionnement normal, c'est un GPIO standard.

#define ENC_X_CLK     35   // ⚠ input-only → pullup externe 10kΩ requis
#define ENC_X_DT      15   // ⚠ strapping pin, OK avec pullup HIGH
#define ENC_X_BTN      2   // ⚠ LED onboard sur certaines cartes, OK après boot


// ============================================================================
// BOUTON RESET / NOUVELLE GRAINE
// ============================================================================
// 🎓 GPIO 0 = le bouton physique "BOOT" déjà présent sur la carte ESP32-Dev !
//    On le réutilise intelligemment : appui court = nouvelle graine aléatoire,
//    appui long = menu des formes prédéfinies (glider, blinker...).
//
// ⚠ Ne PAS appuyer sur ce bouton pendant le démarrage de la carte :
//    ça passerait en mode "download" (upload de firmware). En fonctionnement
//    normal, c'est un bouton comme les autres.

#define BTN_RESET_PIN    0   // = bouton BOOT physique sur la carte


// ============================================================================
// PARAMÈTRES MUSICAUX PAR DÉFAUT
// ============================================================================
// 🎓 Ces valeurs s'appliquent au démarrage. Les encodeurs les modifient ensuite.
//    BPM = Beats Per Minute = tempo. 120 BPM = 2 battements par seconde (standard).
//    En musique électronique : 80–140 BPM selon le style.

#define BPM_DEFAULT       30
#define BPM_MIN           10
#define BPM_MAX           60
#define OCTAVE_DEFAULT     3   // octave médian (MIDI note 60 = do central)
#define OCTAVE_MIN         1
#define OCTAVE_MAX         5
#define TIMBRE_DEFAULT     0   // index du preset Mozzi par défaut
#define SCALE_DEFAULT      0   // 0=pentatonique, 1=mineur, 2=majeur, 3=dorien


// ============================================================================
// PARAMÈTRES GOL PAR DÉFAUT
// ============================================================================
// 🎓 Les règles GoL sont codées en "B/S" (Birth/Survival) :
//    B = nombre de voisins qui FONT NAÎTRE une cellule morte
//    S = nombre de voisins qui FONT SURVIVRE une cellule vivante
//
//    Conway classique = B3/S23 (naît avec 3, survit avec 2 ou 3)
//    B6/S567 "Dense"  = densité ~4.4%, idéale pour la musique (moins dense = plus musical)

#define GOL_RULE_DEFAULT    0   // index dans le tableau des règles (voir gol.h)
                                // 0=Conway B3S23, 1=Coral B5S45, 2=Dense B6S567...

// ms par tick (= 1 colonne balayée) = 60s / BPM / 16 colonnes
#define GOL_TICK_MS_DEFAULT  (60000UL / BPM_DEFAULT / GRID_COLS)


// ============================================================================
// FREERTOS — priorités et tailles de pile des tâches
// ============================================================================
// 🎓 FreeRTOS est un système d'exploitation temps-réel qui tourne sur l'ESP32.
//    Il gère plusieurs "tâches" en parallèle (comme des threads).
//    La priorité détermine qui s'exécute en premier quand tout le monde est prêt.
//    La "stack" (pile) = mémoire allouée à chaque tâche pour ses variables locales.
//
//    Core 0 : GoL + LED + Contrôles (temps réel visuel)
//    Core 1 : Mozzi audio (temps réel sonore — priorité maximale !)

#define TASK_PRIORITY_CONTROLS    1   // basse : peut attendre un peu
#define TASK_PRIORITY_GOL         2   // normale
#define TASK_PRIORITY_LED         3   // haute : synchronisée avec GoL
#define TASK_PRIORITY_AUDIO       5   // max : l'audio ne peut pas glitcher

#define TASK_STACK_GOL       4096   // bytes
#define TASK_STACK_LED       4096
#define TASK_STACK_CONTROLS  4096
#define TASK_STACK_AUDIO     8192   // Mozzi a besoin de plus de mémoire de pile


// ============================================================================
// NOTE SUR LES GPIO — Résumé des 24 broches utilisées
// ============================================================================
/*
 *  GPIO  | Usage                      | Remarque
 *  ------|----------------------------|--------------------------------------------
 *    0   | BTN_RESET                  | ⚠ = bouton BOOT physique
 *    2   | ENC_X_BTN                  | ⚠ LED onboard sur certaines cartes
 *    4   | ENC_OCTAVE_BTN (Phase 2)   |
 *    5   | LED_DATA_PIN               | FastLED WS2812B
 *   12   | ENC_Y_BTN                  | ⚠ strapping → pullup externe 10kΩ
 *   13   | ENC_OCTAVE_CLK             |
 *   14   | ENC_OCTAVE_DT              |
 *   15   | ENC_X_DT                   | ⚠ strapping, OK avec pullup
 *   16   | ENC_BPM_CLK                |
 *   17   | ENC_BPM_DT                 |
 *   18   | ENC_SCALE_CLK              |
 *   19   | ENC_SCALE_DT               |
 *   21   | ENC_SCALE_BTN              |
 *   22   | ENC_TIMBRE_CLK             |
 *   23   | ENC_TIMBRE_DT              |
 *   25   | AUDIO_LEFT (DAC1)          |
 *   26   | AUDIO_RIGHT (DAC2)         |
 *   27   | ENC_TIMBRE_BTN / Play      |
 *   32   | ENC_Y_CLK                  |
 *   33   | ENC_Y_DT                   |
 *   34   | POT_RULES (ADC)            | input-only
 *   35   | ENC_X_CLK                  | ⚠ input-only → pullup externe 10kΩ
 *   36   | POT_VOLUME (ADC)           | input-only
 *   39   | POT_BRIGHTNESS (ADC)       | input-only
 *  ------|----------------------------|--------------------------------------------
 *  Total : 24 GPIO utilisés sur ~25 disponibles sur l'ESP32-WROOM-32
 *
 *  GPIO non utilisés (réservés) :
 *    1, 3  : UART TX/RX — utilisés pour le moniteur série / upload
 *    6–11  : Flash SPI interne — JAMAIS toucher
 */
