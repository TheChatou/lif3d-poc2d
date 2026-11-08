#include "controls.h"
#include <Arduino.h>
#include "config.h"
#include "audio.h"

// 🎓 INPUT_PULLUP : la broche est tirée à 3.3V en interne par l'ESP32.
//    Au repos elle lit donc HIGH. Le bouton, câblé entre la broche et GND
//    (voir docs/analyses/20260915_cablage_complet_lif2d.md §8), la tire à
//    LOW quand on appuie. Pas besoin de résistance externe.
//
// 🎓 ANTI-REBOND LOGICIEL : un bouton mécanique "rebondit" pendant quelques
//    ms à chaque appui/relâchement (le contact vibre avant de se stabiliser).
//    Sans filtrage, un seul appui physique serait vu comme plusieurs appuis
//    rapides par le code. On attend DEBOUNCE_MS sans changement avant de
//    considérer l'état comme stable.

#define DEBOUNCE_MS  30

static bool     last_reading   = HIGH; // dernière lecture brute (avant filtrage)
static bool     stable_state   = HIGH; // état considéré fiable
static uint32_t last_change_ms = 0;

void controls_init() {
    pinMode(BTN_PLAY_PIN, INPUT_PULLUP);
}

void controls_update() {
    bool reading = digitalRead(BTN_PLAY_PIN);
    uint32_t now = millis();

    if (reading != last_reading) {
        last_reading   = reading;
        last_change_ms = now; // le chrono anti-rebond repart à chaque changement brut
    }

    if ((now - last_change_ms) > DEBOUNCE_MS && reading != stable_state) {
        stable_state = reading;
        if (stable_state == LOW) { // LOW = appui (pull-up)
            audio_toggle_pause();
        }
    }
}
