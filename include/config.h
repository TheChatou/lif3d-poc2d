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
 *
 * Contrôleurs physiques (5 total) :
 *   – Encodeur VOL/LUMI  : tourner = volume, clic = bascule vers luminosité
 *   – Encodeur X (droite) : navigation horizontale + menu
 *   – Encodeur Y (gauche) : navigation verticale  + menu
 *   – Switch latching     : mode on/off (ex. mode dessin)
 *   – Bouton silicone     : play/pause (momentané)
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
//    GPIO 5 : safe pour FastLED, aucune restriction après boot.
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
// AUDIO — DAC intégré ESP32 → amplificateur PAM8403 + jack TRS 3.5mm
// ============================================================================
// 🎓 DAC = Digital-to-Analog Converter.
//    L'ESP32 génère un nombre (0–255) → le DAC le convertit en tension (0–3.3V).
//    Ce signal part en parallèle vers :
//      – le PAM8403 (amplifie pour les HP intégrés)
//      – le jack TRS 3.5mm stéréo (sortie ligne vers DAW / ampli externe)

#define AUDIO_LEFT_PIN    25   // DAC1 → PAM8403 L + Tip  jack TRS audio
#define AUDIO_RIGHT_PIN   26   // DAC2 → PAM8403 R + Ring jack TRS audio


// ============================================================================
// MIDI OUT — UART2 remappé sur GPIO4 → jack TRS 3.5mm Type A
// ============================================================================
// 🎓 MIDI utilise le protocole UART à 31250 bauds (bits/seconde).
//    L'ESP32 a 3 ports UART entièrement remappables sur n'importe quel GPIO.
//    On utilise UART2 remappé sur GPIO4 (au lieu du défaut GPIO17)
//    pour éviter le conflit avec l'encodeur VOL/LUMI sur GPIO17.
//
//    Dans le firmware : Serial2.begin(31250, SERIAL_8N1, -1, MIDI_TX_PIN);
//    (-1 = RX non utilisé pour MIDI OUT)
//
//    TRS Type A = standard MIDI Association (Korg, Arturia, Make Noise...) :
//      Tip   = signal TX (GPIO4 via 220Ω)
//      Ring  = source courant (+3.3V via 220Ω)
//      Sleeve = GND

#define MIDI_TX_PIN    4   // UART2_TX remappé → Tip jack TRS 3.5mm MIDI OUT


// ============================================================================
// ENCODEUR VOL/LUMI — volume (tourner) + luminosité (clic puis tourner)
// ============================================================================
// 🎓 Un seul encodeur contrôle 2 paramètres grâce à son bouton intégré :
//    – tourner sans appuyer  → ajuste le VOLUME audio (0–100%)
//    – clic court            → bascule en mode "luminosité"
//    – tourner après le clic → ajuste la LUMINOSITÉ des LEDs (0–255)
//    – un 2e clic            → revient au mode volume
//    La LED ou le menu affiche quel paramètre est actif.
//
//    100nF entre ROTA et GND : filtre anti-rebond hardware obligatoire.

#define ENC_VOL_ROTA   16   // signal A (quadrature)
#define ENC_VOL_ROTB   17   // signal B (quadrature)
#define ENC_VOL_SWCH   18   // clic = bascule volume ↔ luminosité


// ============================================================================
// ENCODEUR X — contrôleur droit (navigation horizontale / menus)
// ============================================================================
// 🎓 En mode GoL      : tourne pour régler un paramètre (BPM, gamme, etc.)
//                       selon le menu affiché sur la matrice.
//    En mode Dessin   : déplace le curseur horizontalement sur la grille.
//    Clic court       : confirme une sélection dans le menu.
//    Clic long        : retour au menu précédent / annulation.
//
//    100nF entre ROTA et GND recommandé.

#define ENC_X_ROTA   22   // signal A (quadrature)
#define ENC_X_ROTB   23   // signal B (quadrature)
#define ENC_X_SWCH   21   // clic = sélection / confirmation


// ============================================================================
// ENCODEUR Y — contrôleur gauche (navigation verticale / menus)
// ============================================================================
// 🎓 Miroir de l'encodeur X, mais sur l'axe vertical.
//    En mode GoL    : navigue entre les entrées de menu (haut/bas).
//    En mode Dessin : déplace le curseur verticalement sur la grille.
//    Clic court     : ouvre le menu principal / valide.
//    Clic long      : bascule GoL ↔ Dessin.
//
//    GPIO 32 et 33 sont parmi les plus "purs" de l'ESP32 :
//    aucun rôle spécial au boot, support ADC et interruptions. Choix idéal.

#define ENC_Y_ROTA   32   // signal A (quadrature)
#define ENC_Y_ROTB   33   // signal B (quadrature)
#define ENC_Y_SWCH   19   // clic = ouvre menu / bascule mode


// ============================================================================
// SWITCH ON/OFF (latching) — état binaire persistant
// ============================================================================
// 🎓 Un switch "latching" (à verrouillage) reste dans sa position :
//    levé = ON, enfoncé = OFF (ou inversement selon le modèle).
//    Contrairement à un bouton momentané, il mémorise physiquement l'état —
//    même si l'ESP32 redémarre, la position du switch dit l'état actuel.
//
//    Usage typique : mode Dessin actif / inactif, MIDI on/off, etc.
//    Le rôle exact est défini dans le firmware (pas fixé ici).

#define SW_ONOFF_PIN    13   // switch latching — état lu au démarrage


// ============================================================================
// BOUTON PLAY/PAUSE (momentané silicone/caoutchouc)
// ============================================================================
// 🎓 Un bouton "momentané" ne retient pas sa position : il revient à lui-même
//    dès qu'on relâche. C'est le firmware qui gère l'état (joue/pause).
//    Avantage : pas de désynchronisation possible entre le bouton et le firmware
//    (ex: si l'ESP32 redémarre, le bouton ne "dit" rien — c'est l'état logique
//    sauvegardé qui prime).

#define BTN_PLAY_PIN    14   // momentané : toggle play ↔ pause à chaque appui


// ============================================================================
// BOUTON RESET / NOUVELLE GRAINE — bouton BOOT physique de la carte
// ============================================================================
// 🎓 GPIO 0 = le bouton physique "BOOT" déjà présent sur la carte ESP32-Dev !
//    On le réutilise sans câblage supplémentaire.
//    Appui court = nouvelle graine aléatoire (GoL repart d'un état différent).
//    Appui long  = sélection d'une forme prédéfinie (glider, blinker…).
//
// ⚠ Ne PAS appuyer pendant le démarrage de la carte :
//    ça passerait en mode "download" (upload de firmware).

#define BTN_RESET_PIN    0   // = bouton BOOT physique sur la carte


// ============================================================================
// PARAMÈTRES MUSICAUX PAR DÉFAUT
// ============================================================================
// 🎓 Ces valeurs s'appliquent au démarrage.
//    Les encodeurs X/Y (via le menu) les modifient ensuite.
//    BPM = Beats Per Minute = tempo. 120 BPM = 2 battements/seconde (standard).

#define BPM_DEFAULT       30
#define BPM_MIN           10
#define BPM_MAX           60
#define OCTAVE_DEFAULT     3   // octave médian (MIDI note 60 = do central)
#define OCTAVE_MIN         1
#define OCTAVE_MAX         5
#define TIMBRE_DEFAULT     0   // index du preset Mozzi par défaut
#define SCALE_DEFAULT      0   // 0=japonaise, 1=pentatonique, 2=penta mineure…

#define VOLUME_DEFAULT    70   // 0–100 %
#define BRIGHT_DEFAULT    80   // 0–255


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
                                // 0=Conway B3S23, 1=Coral B5S45, 2=Dense B6S567…

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
// NOTE SUR LES GPIO — Résumé des 15 broches utilisées
// ============================================================================
/*
 *  GPIO  | Usage                      | Remarque
 *  ------|----------------------------|--------------------------------------------
 *    0   | BTN_RESET                  | ⚠ = bouton BOOT physique
 *    4   | MIDI_TX_PIN (UART2_TX)     | MIDI OUT → Tip jack TRS 3.5mm Type A
 *    5   | LED_DATA_PIN               | FastLED WS2812B — résistance 300Ω série
 *   13   | SW_ONOFF (latching)        |
 *   14   | BTN_PLAY (momentané)       |
 *   16   | ENC_VOL_ROTA               | + 100nF entre ROTA et GND
 *   17   | ENC_VOL_ROTB               |
 *   18   | ENC_VOL_SWCH               |
 *   19   | ENC_Y_SWCH                 |
 *   21   | ENC_X_SWCH                 |
 *   22   | ENC_X_ROTA                 | + 100nF entre ROTA et GND
 *   23   | ENC_X_ROTB                 |
 *   25   | AUDIO_LEFT (DAC1)          | → PAM8403 L + Tip  jack TRS audio
 *   26   | AUDIO_RIGHT (DAC2)         | → PAM8403 R + Ring jack TRS audio
 *   32   | ENC_Y_ROTA                 | + 100nF entre ROTA et GND
 *   33   | ENC_Y_ROTB                 |
 *  ------|----------------------------|--------------------------------------------
 *  Total : 16 GPIO utilisés
 *
 *  GPIO non utilisés (réservés) :
 *    1, 3  : UART TX/RX — moniteur série / upload
 *    6–11  : Flash SPI interne — JAMAIS toucher
 *   34–39  : ADC1 input-only — libres si besoin futur
 */
