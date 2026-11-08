/*
 * gol.cpp — Moteur Game of Life 2D
 * ==================================
 *
 * 🎓 Ce fichier contient la logique PURE du GoL.
 *    Pas d'Arduino, pas de FastLED, pas de Mozzi — que des maths et de la mémoire.
 *    Il compile sur ESP32 ET sur un PC Linux/Mac/Windows.
 *
 * La grille est stockée comme un tableau "plat" (1D) de 256 octets :
 *    grid[y * GRID_COLS + x]  =  cellule à la colonne x, ligne y
 *
 * 🎓 Pourquoi un tableau 1D plutôt que 2D (grid[y][x]) ?
 *    En C, un tableau 2D uint8_t[16][16] et un tableau 1D uint8_t[256]
 *    occupent la même mémoire. Le tableau 1D est plus facile à passer
 *    à des fonctions et à utiliser via ctypes depuis Python.
 */

#include "gol.h"

// Sur PC (simulateur), on inclut les fonctions rand() et time()
#ifndef ARDUINO
  #include <stdlib.h>
  #include <time.h>
#endif

// ============================================================================
// DÉFINITION DES RÈGLES
// ============================================================================
// 🎓 const = ces données ne changent jamais après compilation → stockées en
//    mémoire flash (ROM) sur l'ESP32, pas en RAM. Économise ~100 octets de RAM.

const GolRule GOL_RULES[GOL_RULE_COUNT] = {
    {
        "Conway",
        "B3/S23 — classique, le GoL original de Conway",
        (1<<3),
        (1<<2) | (1<<3)
    },
    {
        "Coral",
        "B5/S45 — croissance lente, structures stables, musicalement répétitif",
        (1<<5),
        (1<<4) | (1<<5)
    },
    {
        "Dense",
        "B6/S567 — ~4.4% densité, idéal pour la musique (sparse et évolutif)",
        (1<<6),
        (1<<5) | (1<<6) | (1<<7)
    },
    {
        "Builder",
        "B4/S5 — construit des structures complexes et stables",
        (1<<4),
        (1<<5)
    },
    {
        "Symmetric",
        "B5/S5 — génère des patterns symétriques et répétitifs",
        (1<<5),
        (1<<5)
    },
    {
        "Highlife",
        "B36/S23 — très actif, proche du Conway classique",
        (1<<3) | (1<<6),
        (1<<2) | (1<<3)
    },
    {
        "Balanced",
        "B4/S45 — équilibré, bonne évolution musicale",
        (1<<4),
        (1<<4) | (1<<5)
    },
};

// ============================================================================
// FONCTIONS INTERNES (private — non exposées dans gol.h)
// ============================================================================

// Convertit (x, y) en index dans le tableau 1D
// 🎓 static = cette fonction est "privée" au fichier. Elle n'est pas visible
//    depuis d'autres .cpp. Bonne pratique : cacher ce qui n'est pas utile dehors.
static inline int flat(int x, int y) {
    return y * GRID_COLS + x;
}

// Applique les bords toroïdaux : si on sort d'un côté, on rentre de l'autre
// 🎓 % est l'opérateur modulo : 17 % 16 = 1, -1 % 16 = -1 en C (d'où le +max)
//    (v + max) % max : -1 → 15, 0 → 0, 15 → 15, 16 → 0. Parfait.
static inline int wrap(int v, int max) {
    return (v + max) % max;
}

// Génère un float aléatoire entre 0.0 et 1.0
// Forward declaration — défini plus bas
static int count_neighbors(const uint8_t* grid, int x, int y);

static inline float rand_float() {
#ifdef ARDUINO
    // Sur Arduino : random(N) retourne un entier entre 0 et N-1
    return (float)random(10000) / 10000.0f;
#else
    // Sur PC : rand() retourne un entier entre 0 et RAND_MAX
    return (float)rand() / (float)RAND_MAX;
#endif
}

// ============================================================================
// IMPLÉMENTATION PUBLIQUE
// ============================================================================

void gol_clear(uint8_t* grid) {
    for (int i = 0; i < GRID_COLS * GRID_ROWS; i++) {
        grid[i] = 0;
    }
}

void gol_seed(unsigned int seed) {
#ifdef ARDUINO
    randomSeed(seed);
#else
    srand(seed);
#endif
}

void gol_randomize(uint8_t* grid, float density) {
    for (int i = 0; i < GRID_COLS * GRID_ROWS; i++) {
        grid[i] = (rand_float() < density) ? 1 : 0;
    }
}

uint8_t gol_get(const uint8_t* grid, int x, int y) {
    return grid[flat(wrap(x, GRID_COLS), wrap(y, GRID_ROWS))];
}

void gol_set(uint8_t* grid, int x, int y, uint8_t val) {
    grid[flat(wrap(x, GRID_COLS), wrap(y, GRID_ROWS))] = val ? 1 : 0;
}

void gol_toggle(uint8_t* grid, int x, int y) {
    int idx = flat(wrap(x, GRID_COLS), wrap(y, GRID_ROWS));
    grid[idx] = grid[idx] ? 0 : 1;
}

void gol_step_age(const uint8_t* grid_in,  uint8_t* grid_out,
                  const uint8_t* age_in,   uint8_t* age_out,
                  uint8_t rule_index) {
    if (rule_index >= GOL_RULE_COUNT) rule_index = 0;
    const GolRule& rule = GOL_RULES[rule_index];

    for (int y = 0; y < GRID_ROWS; y++) {
        for (int x = 0; x < GRID_COLS; x++) {
            int n          = count_neighbors(grid_in, x, y);
            uint8_t alive  = gol_get(grid_in, x, y);
            uint8_t next   = alive ? ((rule.survive_mask >> n) & 1)
                                   : ((rule.birth_mask   >> n) & 1);
            grid_out[flat(x, y)] = next;
            if (next) {
                if (alive) {
                    // 🎓 Survie : la cellule existait déjà → son âge augmente
                    uint8_t a = age_in[flat(x, y)];
                    age_out[flat(x, y)] = (a < 255) ? a + 1 : 255;
                } else {
                    // 🎓 Naissance : la cellule vient d'apparaître → âge = 0
                    //    (à la génération suivante elle aura âge 1, puis 2, etc.)
                    age_out[flat(x, y)] = 0;
                }
            } else {
                age_out[flat(x, y)] = 0;
            }
        }
    }
}

void gol_copy(const uint8_t* src, uint8_t* dst) {
    for (int i = 0; i < GRID_COLS * GRID_ROWS; i++) {
        dst[i] = src[i];
    }
}

int gol_population(const uint8_t* grid) {
    int count = 0;
    for (int i = 0; i < GRID_COLS * GRID_ROWS; i++) {
        count += grid[i];
    }
    return count;
}

// 🎓 La fonction clé : compte les voisins d'une cellule.
//    Chaque cellule a 8 voisins (voisinage de Moore = carré 3×3 autour d'elle).
//    On parcourt dx et dy de -1 à +1, en sautant (0,0) = la cellule elle-même.
static int count_neighbors(const uint8_t* grid, int x, int y) {
    int count = 0;
    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            if (dx == 0 && dy == 0) continue;   // sauter la cellule centrale
            count += gol_get(grid, x + dx, y + dy);
        }
    }
    return count;
}

void gol_step(const uint8_t* grid_in, uint8_t* grid_out, uint8_t rule_index) {
    // Sécurité : index hors limite → Conway par défaut
    if (rule_index >= GOL_RULE_COUNT) rule_index = 0;

    const GolRule& rule = GOL_RULES[rule_index];

    for (int y = 0; y < GRID_ROWS; y++) {
        for (int x = 0; x < GRID_COLS; x++) {

            int n     = count_neighbors(grid_in, x, y);
            uint8_t alive = gol_get(grid_in, x, y);

            // 🎓 On teste le bit N du masque avec : (mask >> N) & 1
            //    Si ce bit vaut 1 → la règle s'applique avec N voisins.
            //
            //    Exemple avec Conway, cellule vivante, 2 voisins :
            //    survive_mask = 0b00001100
            //    (0b00001100 >> 2) & 1 = 0b00000011 & 1 = 1 → survit ✓
            if (alive) {
                grid_out[flat(x, y)] = (rule.survive_mask >> n) & 1;
            } else {
                grid_out[flat(x, y)] = (rule.birth_mask >> n) & 1;
            }
        }
    }
}
