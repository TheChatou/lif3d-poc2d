#include <Arduino.h>
#include <FastLED.h>
#include "config.h"

// 🎓 Sketch minimal, sans Mozzi ni GoL : sert juste à isoler la matrice de
//    tout le reste (audio, séquenceur) pour un test matériel pur.

CRGB leds[LED_COUNT];

#define TEST_BRIGHTNESS 30   // ~12% de 255 — volontairement bas pour un premier test

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("=== LED TEST — toutes les LEDs en blanc, luminosite basse ===");

    FastLED.addLeds<WS2812B, LED_DATA_PIN, GRB>(leds, LED_COUNT);
    FastLED.setMaxPowerInVoltsAndMilliamps(5, 10000); // protection courant, voir config.h
    FastLED.setBrightness(TEST_BRIGHTNESS);

    fill_solid(leds, LED_COUNT, CRGB::White);
    FastLED.show();

    Serial.println("FastLED.show() envoye — si rien ne s'allume, probleme matériel (alim/data/masse)");
}

void loop() {
    // rien : affichage statique, pratique pour mesurer au multimetre sans que ça bouge
}
