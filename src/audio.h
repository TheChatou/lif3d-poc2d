#pragma once
#include <stdint.h>

// 🎓 TEMPO DU SÉQUENCEUR — c'est ici, et seulement ici, qu'on le règle.
//    CONTROL_RATE = fréquence à laquelle Mozzi appelle updateControl() (Hz).
//    TICKS_PER_COL = nombre d'appels updateControl() avant de passer au
//    temps (beat) suivant. Chaque temps fait avancer le GoL d'UNE génération
//    (voir audio_set_gol_step_callback) — plus de notion de "balayage complet
//    de 16 colonnes avant de changer de génération".
#define CONTROL_RATE   64   // Hz — doit être une puissance de 2 (contrainte Mozzi)
#define TICKS_PER_COL  64   // ↑ augmente = tempo plus lent, ↓ diminue = plus rapide (×4 = vitesse ÷4)

void audio_init();
void audio_grid_update(const uint8_t* grid);

// 🎓 Pause = coupe le son ET fige le séquenceur (le GoL n'avance plus tant
//    qu'on n'a pas repris) — pas juste une mise en sourdine.
void audio_toggle_pause();
bool audio_is_paused();

// Volume général 0–100 (molette droite en live ; 0 = muet)
void audio_set_volume(uint8_t percent);

// 🎓 Callback appelé par audio.cpp à CHAQUE temps, avant de choisir les
//    notes à jouer : c'est ce qui permet au GoL d'avancer d'une génération
//    par battement, tout en restant sur la même horloge que le séquenceur
//    (celle de Mozzi/CONTROL_RATE) — pas de 2e minuteur (millis()) à
//    synchroniser à la main, donc pas de dérive possible entre les deux.
typedef void (*GolStepCallback)();
void audio_set_gol_step_callback(GolStepCallback cb);

// Colonne actuellement balayée par le séquenceur (0..GRID_COLS-1) —
// permet à leds.cpp/main.cpp de surligner la colonne jouée en temps réel.
uint8_t audio_current_col();

// audioHook() est défini par Mozzi dans MozziGuts.h (inclus via audio.cpp)
// On le déclare ici pour que main.cpp puisse l'appeler sans inclure MozziGuts.h
void audioHook();
