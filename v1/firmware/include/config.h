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
 * Contrôleurs physiques (3 total, design "ardoise magique" révisé 2026-08-24) :
 *   – Encodeur A (gauche) : navigation menu / valeur, selon écran actif
 *   – Encodeur B (droite) : navigation menu / valeur, selon écran actif
 *   – Bouton silicone     : play/pause (momentané), centré entre les 2 encodeurs
 *   Tout le paramétrage (BPM, gamme, timbre, octave, luminosité, règles GoL)
 *   passe par un menu affiché sur la matrice LED, navigué avec A/B.
 *   Plus de switch on/off séparé : géré par la prise secteur (interrupteur
 *   intégré) — zéro GPIO consommé pour l'alimentation.
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
// AUDIO — DAC ESP32 → TDA2822 → jack PJ3410 5 broches → PAM8403 → HP
// ============================================================================
// 🎓 DAC = Digital-to-Analog Converter.
//    L'ESP32 génère un nombre (0–255) → le DAC le convertit en tension (0–3.3V).
//    Chaîne câblée (schéma as-built 2026-10-24, docs/photos/) :
//      DAC → TDA2822 (ampli casque) → T/R du jack 5 broches
//      jack VIDE   : T↔TS et R↔RS fermés → le signal continue vers
//                    PAM8403 L/R IN → HP internes
//      jack BRANCHÉ: TS/RS s'ouvrent → HP coupés, son dans le casque
//    🎓 C'est un mute "mécanique" : zéro ligne de code pour basculer HP/casque.

#define AUDIO_LEFT_PIN    25   // DAC1 → TDA2822 L IN → Tip jack (→ TS → PAM8403 L)
#define AUDIO_RIGHT_PIN   26   // DAC2 → TDA2822 R IN → Ring jack (→ RS → PAM8403 R)


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
// ENCODEUR A — gauche (navigation menu / valeur, selon contexte)
// ============================================================================
// 🎓 Design final "ardoise magique" (révisé 2026-08-24) : plus qu'UN SEUL
//    bouton poussoir (play/pause) et DEUX encodeurs, un de chaque côté.
//    Ces 2 encodeurs pilotent TOUT le paramétrage (BPM, gamme, timbre,
//    octave, luminosité, règles GoL...) via un menu affiché sur la
//    matrice LED 16×16 — plus de rôle fixe "volume" ou "X/Y" séparé.
//    Rôle exact (navigation vs valeur) décidé par le firmware selon
//    l'écran de menu actif, pas câblé en dur ici.
//
//    100nF entre ROTA et GND : filtre anti-rebond hardware obligatoire.
//
//    ⚠ Anciennement ENC_X. L'ancien 3e jeu ENC_VOL (GPIO16/17/18) est
//    supprimé — un seul des 3 jeux d'origine ne survit pas à la
//    simplification à 2 encodeurs physiques.

#define ENC_A_ROTA   22   // signal A (quadrature)
#define ENC_A_ROTB   23   // signal B (quadrature)
#define ENC_A_SWCH   21   // clic = sélection / confirmation


// ============================================================================
// ENCODEUR B — droite (navigation menu / valeur, selon contexte)
// ============================================================================
// 🎓 Miroir de l'encodeur A. GPIO 32/33 sont parmi les plus "purs" de
//    l'ESP32 : aucun rôle spécial au boot, support ADC et interruptions.
//
//    ⚠ Anciennement ENC_Y.

#define ENC_B_ROTA   32   // signal A (quadrature)
#define ENC_B_ROTB   33   // signal B (quadrature)
#define ENC_B_SWCH   19   // clic = ouvre menu / bascule mode


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
// COMPOSANTS PASSIFS — résistances / condensateurs du câblage (hors GPIO)
// ============================================================================
// 🎓 Ce ne sont pas des broches ESP32, mais des valeurs de composants à
//    respecter au câblage — regroupées ici pour ne pas les perdre de vue.

#define R_MIDI_OHM          220   // ×2 — protection boucle de courant MIDI OUT (GPIO4 → Tip, +3.3V → Ring)
#define R_HP_PROTECT_OHM      1   // ×2, 1W — en série sur les sorties L+/R+ du PAM8403 vers les HP
#define C_ENC_DEBOUNCE_NF   100   // ×3 (une par ROTA d'encodeur) — entre ROTA et GND, anti-rebond hardware
#define C_TDA2822_OUT_UF    100   // ×2 — découplage DC en sortie du module TDA2822 (T/R du jack)
                                  // ⚠ à vérifier au multimètre : probablement déjà intégrés sur le module reçu


// ============================================================================
// NOTE SUR LES GPIO — Résumé des broches utilisées
// ============================================================================
/*
 *  GPIO  | Usage                      | Remarque
 *  ------|----------------------------|--------------------------------------------
 *    0   | BTN_RESET                  | ⚠ = bouton BOOT physique, pas un contrôle du boîtier
 *    4   | MIDI_TX_PIN (UART2_TX)     | MIDI OUT → Tip jack TRS 3 broches (+ R_MIDI_OHM ×2)
 *    5   | LED_DATA_PIN               | FastLED WS2812B — résistance 300Ω série
 *   14   | BTN_PLAY (momentané)       | Seul bouton du boîtier, centré entre les 2 encodeurs
 *   19   | ENC_B_SWCH                 |
 *   21   | ENC_A_SWCH                 |
 *   22   | ENC_A_ROTA                 | + C_ENC_DEBOUNCE_NF entre ROTA et GND
 *   23   | ENC_A_ROTB                 |
 *   25   | AUDIO_LEFT (DAC1)          | → TDA2822 L IN → Tip jack 5 broches + PAM8403 (HP interne)
 *   26   | AUDIO_RIGHT (DAC2)         | → TDA2822 R IN → Ring jack 5 broches + PAM8403 (HP interne)
 *   32   | ENC_B_ROTA                 | + C_ENC_DEBOUNCE_NF entre ROTA et GND
 *   33   | ENC_B_ROTB                 |
 *  ------|----------------------------|--------------------------------------------
 *  Total : 12 GPIO utilisés (16 → 12 après simplification à 2 encodeurs
 *          et suppression du switch on/off séparé)
 *
 *  GPIO libérés par la simplification (plus câblés) :
 *   13 (SW_ONOFF), 16/17/18 (ancien ENC_VOL)
 *
 *  GPIO non utilisés (réservés) :
 *    1, 3  : UART TX/RX — moniteur série / upload
 *    6–11  : Flash SPI interne — JAMAIS toucher
 *   34–39  : ADC1 input-only — libres si besoin futur
 */
