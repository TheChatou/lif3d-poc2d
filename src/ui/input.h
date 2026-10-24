#pragma once
#include <Arduino.h>

// 🎓 Le reste de l'interface ne lit JAMAIS les broches directement : il reçoit
//    des "événements" (tourné de 2 crans à droite, clic, appui long...).
//    Avantage : toute la logique anti-rebond / appui long / combinaisons est
//    ici, une seule fois, et les écrans restent simples à lire.

enum EvType : uint8_t {
    EV_TURN_A, EV_TURN_B,       // delta = nombre de crans (+ = sens horaire)
    EV_CLICK_A, EV_CLICK_B,     // clic court (au relâchement)
    EV_LONG_A, EV_LONG_B,       // appui long (≥ LONG_PRESS_MS, déclenché pendant l'appui)
    EV_CLICK_AB,                // les 2 molettes cliquées ensemble
    EV_CLICK_PLAY, EV_LONG_PLAY // bouton ▶
};

struct Event {
    EvType type;
    int8_t delta;   // pour EV_TURN_* seulement
    bool   pushed;  // rotation faite molette enfoncée (→ réglage fin)
    bool   shift;   // rotation faite avec ▶ maintenu (→ raccourci)
};

struct InputDiag {      // valeurs brutes pour l'écran DIAG
    int32_t raw_a, raw_b;          // transitions brutes des encodeurs
    bool    sw_a, sw_b, sw_play;   // true = appuyé
};

void input_init();
void input_poll();                 // à appeler à chaque tour de loop()
bool input_next(Event& ev);        // true s'il y a un événement à traiter
InputDiag input_diag();
