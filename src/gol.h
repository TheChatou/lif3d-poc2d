#pragma once

/*
 * gol.h — Interface publique du moteur Game of Life 2D
 * =====================================================
 *
 * 🎓 Un fichier .h (header) déclare l'interface d'un module :
 *    les types et fonctions disponibles. Le code qui les utilise
 *    inclut ce .h sans avoir besoin de voir l'implémentation (.cpp).
 *
 * Ce fichier est partagé entre deux cibles :
 *   1. Firmware ESP32 (compilé par PlatformIO avec Arduino)
 *   2. Simulateur PC  (compilé en .so par simulator/build.sh)
 *
 * ⚠ AUCUNE dépendance Arduino ici — que du C standard.
 */

// 🎓 Sur PC, on inclut les types depuis la bibliothèque standard C.
//    Sur Arduino/PlatformIO, les .cpp n'incluent PAS Arduino.h automatiquement —
//    il faut le faire explicitement pour avoir uint8_t, uint16_t, etc.
#ifndef ARDUINO
  #include <stdint.h>
  #include <string.h>
#else
  #include <Arduino.h>
#endif

// Dimensions de la grille
// Si config.h a déjà défini ces valeurs, on les réutilise. Sinon, défaut 16.
#ifndef GRID_COLS
  #define GRID_COLS 16
#endif
#ifndef GRID_ROWS
  #define GRID_ROWS 16
#endif

// ============================================================================
// RÈGLES DU JEU DE LA VIE
// ============================================================================
// 🎓 On encode chaque règle GoL avec des "masques de bits" (bitmask).
//    Un masque de bits est un entier où chaque bit a une signification.
//
//    Bit N = 1 → la règle s'applique quand il y a N voisins vivants.
//
//    Exemple — Conway B3/S23 :
//      birth_mask   = (1<<3)           = 0b00001000  (naît avec 3 voisins)
//      survive_mask = (1<<2) | (1<<3)  = 0b00001100  (survit avec 2 ou 3)
//
//    Pour tester si une règle s'applique avec N voisins :
//      (mask >> N) & 1   →  1 = oui, 0 = non

#define GOL_RULE_COUNT 7

typedef struct {
    const char*  name;           // nom court : "Conway"
    const char*  description;    // description : "B3/S23 — classique"
    uint16_t     birth_mask;     // masque de naissance (bits 0–8)
    uint16_t     survive_mask;   // masque de survie    (bits 0–8)
} GolRule;

// Tableau des règles (défini dans gol.cpp)
extern const GolRule GOL_RULES[GOL_RULE_COUNT];

// ============================================================================
// INTERFACE PUBLIQUE
// ============================================================================
// 🎓 extern "C" est une instruction C++ qui dit :
//    "Compile ces fonctions avec les conventions de nommage C (pas C++)."
//    Sans ça, C++ renomme les fonctions de manière invisible
//    (ex: gol_step → _Z8gol_stepPKhPhh) et Python via ctypes
//    ne peut plus les retrouver par leur nom original.
//
//    Le bloc #ifdef __cplusplus est là pour que le fichier reste
//    compatible si on l'inclut depuis du C pur (pas juste du C++).

#ifdef __cplusplus
extern "C" {
#endif

// Efface toute la grille (toutes les cellules = mortes)
void gol_clear(uint8_t* grid);

// Remplit la grille aléatoirement
// density : proportion de cellules vivantes (0.0 = vide, 1.0 = plein)
// Valeur recommandée : 0.3 à 0.5
void gol_randomize(uint8_t* grid, float density);

// Initialise le générateur aléatoire (appeler une fois au démarrage)
// seed : valeur de départ (ex: time(NULL) sur PC, analogRead(0) sur Arduino)
void gol_seed(unsigned int seed);

// Calcule la génération suivante
// grid_in  → état actuel (lecture seule)
// grid_out → état suivant (écriture) — doit être un buffer différent de grid_in !
// rule_index → index dans GOL_RULES (0 = Conway, 2 = Dense, etc.)
void gol_step(const uint8_t* grid_in, uint8_t* grid_out, uint8_t rule_index);

// Lit l'état d'une cellule à la position (x=colonne, y=ligne)
// Bords toroïdaux : x=-1 revient à x=GRID_COLS-1 (la grille se "boucle")
uint8_t gol_get(const uint8_t* grid, int x, int y);

// Modifie l'état d'une cellule (val = 0 ou 1)
void gol_set(uint8_t* grid, int x, int y, uint8_t val);

// Inverse l'état d'une cellule (0→1, 1→0) — utile pour le mode dessin
void gol_toggle(uint8_t* grid, int x, int y);

// Calcule la génération suivante ET met à jour l'âge de chaque cellule
// age : 0 = morte, 1 = née cette génération, N = vivante depuis N générations (max 255)
// 🎓 L'âge permet de différencier les sons selon l'ancienneté d'une cellule :
//    une cellule jeune (âge 1) joue un son pur, une vieille (âge 3+) joue un son plus riche.
void gol_step_age(const uint8_t* grid_in,  uint8_t* grid_out,
                  const uint8_t* age_in,   uint8_t* age_out,
                  uint8_t rule_index);

// Copie src vers dst (même taille : GRID_COLS × GRID_ROWS)
void gol_copy(const uint8_t* src, uint8_t* dst);

// Retourne le nombre total de cellules vivantes
int gol_population(const uint8_t* grid);

#ifdef __cplusplus
}
#endif
