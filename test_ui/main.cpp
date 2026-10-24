#include <Arduino.h>
#include "config.h"
#include "ui/display.h"
#include "ui/input.h"
#include "ui/ui.h"

// 🎓 Firmware de TEST des menus : pas de son (pas de Mozzi), juste l'interface
//    sur la vraie matrice avec les vraies molettes. Les modules src/ui/ seront
//    réutilisés tels quels dans le firmware final.
//
//    Flash : pio run -e ui_test -t upload
//    ⚠ Secteur coupé, USB seul : courant LEDs limité à USB_MAX_MA.

#define USB_MAX_MA      400
#define SAFE_BRIGHTNESS  20   // comme led_test : on monte ensuite via SYS > LUMINOSITE

void setup() {
    Serial.begin(115200);

    // 🎓 Sans son, les broches DAC flotteraient : les amplis capteraient alors
    //    tous les parasites (téléphone, secteur, mains...). On les fixe à
    //    mi-tension (128 sur 0–255) = silence propre.
    dacWrite(AUDIO_LEFT_PIN, 128);
    dacWrite(AUDIO_RIGHT_PIN, 128);

    disp_init(USB_MAX_MA);
    disp_set_brightness(SAFE_BRIGHTNESS);

    // 🎓 Test de sécurité : UNE seule LED rouge dans le coin pendant 2 s.
    //    Si la matrice montre autre chose → débrancher : le signal DATA est faux.
    disp_clear();
    disp_set(0, 0, CRGB(255, 0, 0));
    disp_show();
    Serial.println("Safety frame: 1 red LED top-left");
    delay(2000);

    input_init();
    ui_init();
    Serial.println("=== LIF2D UI TEST ===");
}

// 🎓 Debug : envoie sur le port série les valeurs brutes des molettes et
//    boutons dès qu'elles changent (lisible avec `pio device monitor`).
static void debug_inputs() {
    static InputDiag last = {0, 0, false, false, false};
    InputDiag d = input_diag();
    if (d.raw_a != last.raw_a || d.raw_b != last.raw_b || d.sw_a != last.sw_a ||
        d.sw_b != last.sw_b || d.sw_play != last.sw_play) {
        Serial.printf("rawA=%ld rawB=%ld swA=%d swB=%d play=%d\n",
                      (long)d.raw_a, (long)d.raw_b, d.sw_a, d.sw_b, d.sw_play);
        last = d;
    }
}

// 🎓 Debug n°2 : niveau électrique de chaque broche d'encodeur (1 = HIGH, 0 = LOW).
//    Une broche qui ne change jamais en tournant = contact bloqué ou débranché.
static void debug_pins() {
    static const uint8_t PINS[4] = {ENC_A_ROTA, ENC_A_ROTB, ENC_B_ROTA, ENC_B_ROTB};
    static int last = -1;
    int v = 0;
    for (int i = 0; i < 4; i++) v |= digitalRead(PINS[i]) << i;
    if (v != last) {
        Serial.printf("pins A.rotA(22)=%d A.rotB(23)=%d B.rotA(32)=%d B.rotB(33)=%d\n",
                      v & 1, (v >> 1) & 1, (v >> 2) & 1, (v >> 3) & 1);
        last = v;
    }
}

void loop() {
    input_poll();
    debug_inputs();
    debug_pins();
    ui_update();
    delay(5);   // 🎓 ~200 images/s max ; acceptable ici (pas de tâche FreeRTOS critique dans ce test)
}
