#include <Arduino.h>
#include "config.h"
#include "ui/display.h"
#include "ui/input.h"
#include "ui/ui.h"
#include "audio.h"

// 🎓 Firmware de TEST des menus, avec le son (Mozzi) : l'interface sur la
//    vraie matrice avec les vraies molettes. Les modules src/ui/ seront
//    réutilisés tels quels dans le firmware final.
//
//    Flash : pio run -e ui_test -t upload
//    ⚠ Secteur coupé, USB seul : courant LEDs limité à USB_MAX_MA.

#define USB_MAX_MA      400
#define SAFE_BRIGHTNESS  20   // comme led_test : on monte ensuite via SYS > LUMINOSITE
#define FRAME_MS         20   // 🎓 50 images/s : assez fluide, et laisse du temps à Mozzi

void setup() {
    Serial.begin(115200);

    disp_init(USB_MAX_MA);
    disp_set_brightness(SAFE_BRIGHTNESS);

    input_init();
    ui_init();       // prépare la grille GoL et se branche sur l'horloge du séquenceur
    audio_init();    // 🎓 Mozzi pilote les DAC depuis sa propre tâche, sur le cœur 0
    Serial.println("=== LIF2D UI TEST + AUDIO ===");
}

// 🎓 loop() tourne sur le cœur 1 : interface + LEDs seulement. Le son vit
//    sur le cœur 0 (audio.cpp), donc FastLED.show() (≈ 8 ms) ne peut plus
//    l'affamer. L'affichage reste limité à 50 images/s.
void loop() {
    input_poll();
    static uint32_t last_frame = 0;
    if (millis() - last_frame >= FRAME_MS) {
        last_frame = millis();
        ui_update();
    }
}
