#pragma once
#include <stdint.h>

void audio_init();
void audio_grid_update(const uint8_t* grid);

// audioHook() est défini par Mozzi dans MozziGuts.h (inclus via audio.cpp)
// On le déclare ici pour que main.cpp puisse l'appeler sans inclure MozziGuts.h
void audioHook();
