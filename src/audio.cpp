#define CONTROL_RATE 64

#include <MozziGuts.h>
#include <Oscil.h>
#include <tables/sin2048_int8.h>
#include <ADSR.h>
#include <mozzi_midi.h>
#include "audio.h"
#include "gol.h"

static const uint8_t SCALE[GRID_ROWS] = {
    93, 89, 88, 86, 82, 81,
    77, 76, 74, 70, 69,
    65, 64, 62, 58, 57
};

static uint8_t          snap[2][GRID_COLS * GRID_ROWS];
static volatile uint8_t snap_idx = 0;

static Oscil<SIN2048_NUM_CELLS, AUDIO_RATE> osc(SIN2048_DATA);
static ADSR<CONTROL_RATE, AUDIO_RATE>       env;

static int     ctrl_ticks = 0;
static uint8_t cur_col    = 0;

#define TICKS_PER_COL 8

void audio_init() {
    env.setADLevels(200, 0);
    env.setTimes(15, 350, 0, 50);
    osc.setFreq(440);  // fréquence par défaut pour éviter silence au démarrage
    startMozzi(CONTROL_RATE);
}

void audio_grid_update(const uint8_t* grid) {
    uint8_t w = 1 - snap_idx;
    memcpy(snap[w], grid, GRID_COLS * GRID_ROWS);
    snap_idx = w;
}

void updateControl() {
    if (++ctrl_ticks < TICKS_PER_COL) return;
    ctrl_ticks = 0;
    cur_col = (cur_col + 1) % GRID_COLS;

    const uint8_t* g = snap[snap_idx];
    for (int y = GRID_ROWS - 1; y >= 0; y--) {
        if (g[y * GRID_COLS + cur_col]) {
            osc.setFreq(mtof((float)SCALE[y]));
            env.noteOn();
            break;
        }
    }
}

int updateAudio() {
    return ((int32_t)osc.next() * env.next()) >> 8;
}
