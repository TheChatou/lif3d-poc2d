#pragma once
#include <stdint.h>

// 🎓 CONTROL_RATE = fréquence à laquelle Mozzi appelle updateControl() (Hz).
//    Doit être une puissance de 2 (contrainte Mozzi). 128 Hz = une précision
//    d'environ 8 ms pour placer les notes et les coups de batterie — assez fin
//    pour le swing. Le tempo, lui, se règle avec AudioParams::bpm.
#define CONTROL_RATE   128

// 🎓 Une piste de la boîte à rythme (valeurs 0–100, comme dans les menus).
struct DrumTrack {
    uint8_t pitch = 50, decay = 40, tone = 60, volume = 80, proba = 100;
    bool    mute = false;
};

// 🎓 TOUS les réglages du son, en un seul paquet. L'interface remplit ce
//    paquet et l'envoie avec audio_set_params() : audio.cpp ne connaît rien
//    des menus, et les menus ne touchent jamais aux oscillateurs.
//    Valeurs par défaut = le son validé (cloche de cristal, 60 BPM).
struct AudioParams {
    uint8_t  bpm = 60;
    uint8_t  scale = 0, tonic = 9, octave = 2, timbre = 0;   // tonic 9 = La ; octave 2 → La3 en bas
    bool     arp = true;                                     // true = arpège, false = accord
    // 🎓 arp_mode : UP, DOWN, RANDOM, PING PONG, TIERCE, QUINTE, ACCORD
    //    arp_div   : index dans {×1, ×2, ×3, ×4, ×6, ×8} notes par temps
    uint8_t  arp_mode = 2, arp_div = 2;                      // RANDOM ×3 = l'arpège d'avant
    bool     arp_groove = false;
    uint8_t  reverb = 30, attack = 15, decay = 40;
    uint8_t  drum_volume = 60, kit = 1, swing = 0;
    // 🎓 1 entier de 32 bits par piste : bit n = pas n (double-croche) sur 2 mesures
    uint32_t pattern[8] = {0x01010101, 0x10101010, 0x55555555, 0, 0, 0, 0, 0};
    DrumTrack track[8];
};

void audio_init();
void audio_grid_update(const uint8_t* grid);
void audio_set_params(const AudioParams& p);   // sûr depuis l'autre cœur

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

// Colonne actuellement jouée (0..GRID_COLS-1) et pas de batterie (0..31)
uint8_t audio_current_col();
uint8_t audio_drum_step();

// 🎓 audio_init() lance une tâche FreeRTOS sur le cœur 0 qui appelle
//    audioHook() en continu : loop() n'a plus à s'en occuper.
void audioHook();
