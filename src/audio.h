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
    // 🎓 Réglages calqués sur l'arpégiateur d'Ableton :
    //    arp_mode (STYLE) : UP, DOWN, UP DOWN, DOWN UP, CONVERGE, DIVERGE, THUMB,
    //                       PINKY, RANDOM, ACCORD, POMPE
    //    arp_div  (RATE)  : index dans {1/4, 1/8, 1/8T, 1/16, 1/16T, 1/32}
    //    arp_swing : retard des sous-divisions impaires (0–100 % d'une demi-sous-division)
    //    arp_gate  : durée de chaque note en % de la sous-division (100 = résonne librement)
    //    chord     : quelles notes forment l'accord (ARPEGE OFF ou style ACCORD) : TOUT, TIERCE, QUINTE
    //    pompe     : motif du style POMPE : G A, G G A, G G A A, G A A (G = grave, A = aigu)
    uint8_t  arp_mode = 8, arp_div = 2;                      // RANDOM 1/8T = l'arpège d'avant
    uint8_t  arp_swing = 0, arp_gate = 100, chord = 0, pompe = 0;
    uint8_t  arp_oct = 1;                                    // l'arpège monte sur 1, 2 ou 3 octaves
    // 🎓 Âge des cellules → son : 0 OFF, 1 VOLUME (jeune = discret), 2 TIMBRE (jeune = pur)
    //    age_max : à partir de cet âge, une cellule est "mûre" (plein effet)
    uint8_t  age_mode = 1, age_max = 4;
    uint8_t  reverb = 30, attack = 15, decay = 40;
    uint8_t  drum_volume = 60, kit = 1, swing = 0;
    // 🎓 1 entier de 32 bits par piste : bit n = pas n (double-croche) sur 2 mesures
    uint32_t pattern[8] = {0x01010101, 0x10101010, 0x55555555, 0, 0, 0, 0, 0};
    DrumTrack track[8];
    // 🎓 Réglages PAR PAS (0–100) : force du coup et chance qu'il sonne.
    //    0 tant que l'UI n'a pas envoyé ses valeurs (dès la 1re image).
    uint8_t  step_velo[8][32] = {}, step_proba[8][32] = {};
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
