#include <Arduino.h>
#include <FastLED.h>
#include "gol.h"
#include "audio.h"

#define LED_DATA_PIN   5
#define LED_COUNT      256
#define BRIGHTNESS     20
#define GOL_STEP_MS    400

CRGB leds[LED_COUNT];

static uint8_t  grid_a[GRID_COLS * GRID_ROWS];
static uint8_t  grid_b[GRID_COLS * GRID_ROWS];
static uint8_t  age_a[GRID_COLS * GRID_ROWS];
static uint8_t  age_b[GRID_COLS * GRID_ROWS];
static uint8_t* grid_cur = grid_a;
static uint8_t* grid_nxt = grid_b;
static uint8_t* age_cur  = age_a;
static uint8_t* age_nxt  = age_b;

static void place_glider(int ox, int oy) {
    gol_set(grid_cur, ox+1, oy+0, 1);
    gol_set(grid_cur, ox+2, oy+1, 1);
    gol_set(grid_cur, ox+0, oy+2, 1);
    gol_set(grid_cur, ox+1, oy+2, 1);
    gol_set(grid_cur, ox+2, oy+2, 1);
}

static void seed_gliders() {
    gol_clear(grid_cur);
    memset(age_cur, 0, GRID_COLS * GRID_ROWS);
    place_glider(1, 1);
    place_glider(9, 1);
    place_glider(1, 9);
    place_glider(9, 9);
}

static inline int led_index(int x, int y) {
    return (y % 2 == 0) ? (y * GRID_COLS + x)
                        : (y * GRID_COLS + (GRID_COLS - 1 - x));
}

static void render() {
    for (int y = 0; y < GRID_ROWS; y++) {
        for (int x = 0; x < GRID_COLS; x++) {
            int flat = y * GRID_COLS + x;
            int led  = led_index(x, y);
            if (!grid_cur[flat]) { leds[led] = CRGB::Black; continue; }
            uint8_t age = age_cur[flat];
            if (age == 0)       leds[led] = CRGB::White;
            else if (age <= 3)  leds[led] = CRGB(0, 200, 255);
            else                leds[led] = CRGB(0, 60, 255);
        }
    }
    FastLED.show();
}

void setup() {
    delay(2000);
    Serial.begin(115200);
    Serial.println("=== LIF2D BOOT ===");

    FastLED.addLeds<WS2812B, LED_DATA_PIN, GRB>(leds, LED_COUNT);
    FastLED.setBrightness(BRIGHTNESS);
    FastLED.clear(true);
    Serial.println("LEDs OK");

    seed_gliders();
    audio_grid_update(grid_cur);
    audio_init();
    Serial.println("Audio OK — GPIO25");
}

static uint32_t last_step = 0;

void loop() {
    audioHook();

    uint32_t now = millis();
    if (now - last_step < GOL_STEP_MS) return;
    last_step = now;

    render();

    gol_step_age(grid_cur, grid_nxt, age_cur, age_nxt, 0);

    uint8_t* tmp;
    tmp = grid_cur; grid_cur = grid_nxt; grid_nxt = tmp;
    tmp = age_cur;  age_cur  = age_nxt;  age_nxt  = tmp;

    audio_grid_update(grid_cur);
}
