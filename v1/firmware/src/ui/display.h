#pragma once
#include <Arduino.h>
#include <FastLED.h>

#define DISP_W 16
#define DISP_H 16

// 🎓 On dessine dans une "image" en mémoire (framebuffer) avec des
//    coordonnées (x, y) naturelles : (0,0) = coin haut-gauche vu de face,
//    x vers la droite, y vers le bas. display.cpp traduit ensuite vers
//    l'ordre réel des LEDs (câblage en serpentin) au moment d'afficher.

// Les 3 niveaux de test : éteint / faible / allumé.
enum Level : uint8_t { LV_OFF = 0, LV_DIM = 1, LV_ON = 2 };

void disp_init(uint16_t max_milliamps);
void disp_clear();
void disp_set(int x, int y, CRGB color);
void disp_level(int x, int y, Level lv, CRGB base);   // applique faible/allumé à une couleur
void disp_set_brightness(uint8_t b);                  // 0–255, luminosité globale
uint8_t disp_brightness();
void disp_show(uint8_t fade = 255);                   // fade < 255 = fondu vers le noir

// Test interférences LEDs → audio (SYS > TEST LED)
enum LedTest : uint8_t { LT_NORMAL, LT_BLACK, LT_FROZEN, LT_NO_DITHER };
void disp_test_mode(uint8_t mode);

// Couleur "faible" dérivée d'une couleur de base (environ 1/7 de l'intensité).
CRGB dim(CRGB c);
