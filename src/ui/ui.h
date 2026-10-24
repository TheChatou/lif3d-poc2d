#pragma once
// Public entry points of the LIF2D menu system.

void ui_init();     // après disp_init() et input_init()
void ui_update();   // à appeler à chaque tour de loop() : événements + rendu
