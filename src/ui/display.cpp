#include "display.h"
#include "config.h"

// 🎓 Orientation : si l'image apparaît en miroir ou à l'envers sur la boîte,
//    il suffit de passer un de ces réglages à 1 — inutile de toucher au reste.
// Validé sur la boîte le 2026-10-25 : TRANSPOSE seul (miroir selon la diagonale principale).
#define ORIENT_FLIP_X     0
#define ORIENT_FLIP_Y     0
#define ORIENT_TRANSPOSE  1

static CRGB    fb[DISP_W * DISP_H];  // l'image logique, en (x, y)
static CRGB    leds[LED_COUNT];      // l'ordre physique des LEDs
static uint8_t brightness = LED_DEFAULT_BRIGHTNESS;

// 🎓 Câblage en serpentin : la ligne 0 va de gauche à droite, la ligne 1
//    revient de droite à gauche, etc. (même mapping que src/main.cpp).
static int led_index(int x, int y) {
    if (ORIENT_TRANSPOSE) { int t = x; x = y; y = t; }
    if (ORIENT_FLIP_X) x = DISP_W - 1 - x;
    if (ORIENT_FLIP_Y) y = DISP_H - 1 - y;
    return (y % 2 == 0) ? (y * DISP_W + x) : (y * DISP_W + (DISP_W - 1 - x));
}

void disp_init(uint16_t max_milliamps) {
    FastLED.addLeds<WS2812B, LED_DATA_PIN, GRB>(leds, LED_COUNT);
    // 🎓 FastLED baisse tout seul la luminosité si l'image demanderait plus
    //    que ce courant — protège le port USB pendant les tests.
    FastLED.setMaxPowerInVoltsAndMilliamps(5, max_milliamps);
    FastLED.setBrightness(brightness);
    disp_clear();
    FastLED.clear(true);
}

void disp_clear() {
    for (int i = 0; i < DISP_W * DISP_H; i++) fb[i] = CRGB::Black;
}

void disp_set(int x, int y, CRGB color) {
    if (x < 0 || x >= DISP_W || y < 0 || y >= DISP_H) return;  // hors écran → coupé
    fb[y * DISP_W + x] = color;
}

CRGB dim(CRGB c) {
    return CRGB(c.r / 7, c.g / 7, c.b / 7);
}

void disp_level(int x, int y, Level lv, CRGB base) {
    if (lv == LV_OFF) return;
    disp_set(x, y, lv == LV_ON ? base : dim(base));
}

void disp_set_brightness(uint8_t b) {
    brightness = b;
    FastLED.setBrightness(b);
}

uint8_t disp_brightness() {
    return brightness;
}

void disp_show(uint8_t fade) {
    for (int y = 0; y < DISP_H; y++) {
        for (int x = 0; x < DISP_W; x++) {
            CRGB c = fb[y * DISP_W + x];
            if (fade < 255) c.nscale8(fade);  // 🎓 nscale8 = multiplie chaque canal par fade/256
            leds[led_index(x, y)] = c;
        }
    }
    FastLED.show();
}
