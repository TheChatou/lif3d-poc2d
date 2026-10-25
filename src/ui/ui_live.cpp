#include "ui_internal.h"
#include "gol.h"
#include "audio.h"
#include <esp_system.h>

#define OVERLAY_MS   1500
#define BRIGHT_STEP     8
#define BRIGHT_MIN      8    // plancher : la boîte ne paraît jamais éteinte
#define GRID_N        (DISP_W * DISP_H)

// ---------------------------------------------------------------- horloge commune
// 🎓 Le GOL suit maintenant l'horloge du séquenceur Mozzi (audio.cpp) : à
//    chaque temps, audio.cpp appelle on_beat() AVANT de choisir ses notes,
//    donc le son et les LEDs montrent toujours la même génération.
//    La tête de lecture = la colonne que le séquenceur est en train de jouer.
//    La BOOM garde son horloge millis() (pas encore reliée au son).
static uint32_t t_step = 0;
static uint8_t  step32 = 0;
static uint16_t beats_total = 0;

uint8_t live_step32() { return step32; }

static uint8_t grid[GRID_N], grid_next[GRID_N];

uint8_t* live_grid() { return grid; }

static void on_beat() {
    // 🎓 SET GOL > EVOLUTION : une génération tous les 1, 2, 4 ou 16 temps
    static const uint8_t EVERY[] = {1, 2, 4, 16};
    if (++beats_total % EVERY[cfg.evolution] == 0) {
        gol_step(grid, grid_next, cfg.rule);
        gol_copy(grid_next, grid);
    }
    audio_grid_update(grid);
}

void live_init() {
    gol_seed(esp_random());
    gol_randomize(grid, cfg.density / 100.0f);
    audio_grid_update(grid);
    audio_set_gol_step_callback(on_beat);
}

void live_tick() {
    if (cfg.playing == audio_is_paused()) audio_toggle_pause();   // ▶ → séquenceur
    audio_set_volume(cfg.volume);
    audio_grid_update(grid);   // dessin / nouvelle graine : le son lit toujours la grille affichée

    if (!cfg.playing) return;
    uint32_t step_ms = 60000UL / cfg.bpm / 4;
    if (millis() - t_step < step_ms) return;
    t_step = millis();
    step32 = (step32 + 1) % 32;
}

// ---------------------------------------------------------------- overlay (valeur temporaire)
static const char* ov_label = nullptr;
static int ov_value = 0, ov_max = 1;
static uint32_t ov_t = 0;

void overlay_show(const char* label, int value, int max) {
    ov_label = label; ov_value = value; ov_max = max; ov_t = millis();
}

void overlay_render() {
    if (!ov_label || millis() - ov_t > OVERLAY_MS) return;
    for (int y = 9; y < DISP_H; y++)
        for (int x = 0; x < DISP_W; x++) disp_set(x, y, CRGB::Black);   // on "découpe" le bas
    char buf[8];
    if (ov_max == 100 && ov_value == 0) strcpy(buf, "MUTE");
    else snprintf(buf, sizeof(buf), "%d", ov_value);
    draw_text_fit(FONT_3X5P, buf, 9, COL_SYS, ov_t);
    int fill = ov_value * DISP_W / ov_max;
    for (int x = 0; x < DISP_W; x++) disp_set(x, 15, x < fill ? COL_SOUND : dim(COL_SOUND));
}

// ---------------------------------------------------------------- réglages directs (communs)
static void turn_brightness(int8_t d) {
    cfg.brightness = constrain(cfg.brightness + d * BRIGHT_STEP, BRIGHT_MIN, 255);
    disp_set_brightness(cfg.brightness);
}

static void turn_volume(int8_t d) {
    cfg.volume = constrain(cfg.volume + d * 5, 0, 100);
    overlay_show("VOL", cfg.volume, 100);
}

static CRGB cell_color(int x, int y) {
    switch (cfg.palette) {
        case 1:  return COL_VISUAL;
        case 2:  return CHSV(y * 16, 220, 255);   // 🎓 HSV : la teinte varie avec la hauteur (= la note)
        default: return CRGB(120, 220, 255);
    }
}

// ---------------------------------------------------------------- GOL (lecture)
void gol_handle(const Event& ev) {
    switch (ev.type) {
        case EV_TURN_A:
            if (ev.shift) {   // ▶ maintenu + A : règle suivante
                cfg.rule = (cfg.rule + (ev.delta > 0 ? 1 : 6)) % 7;
                toast("REGLE");
            } else turn_brightness(ev.delta);
            break;
        case EV_TURN_B:
            if (ev.shift) {   // ▶ maintenu + B : BPM (fin si molette enfoncée)
                cfg.bpm = constrain(cfg.bpm + ev.delta * (ev.pushed ? 1 : 5), 20, 140);
                overlay_show("BPM", cfg.bpm, 140);
            } else turn_volume(ev.delta);
            break;
        case EV_CLICK_A:  nav_open(SCR_PAGE, PAGE_SET_GOL);   page_open(PAGE_SET_GOL); break;
        case EV_CLICK_B:  nav_open(SCR_PAGE, PAGE_SET_AUDIO); page_open(PAGE_SET_AUDIO); break;
        case EV_CLICK_AB: nav_open(SCR_REC, BANK_GOL); break;
        case EV_LONG_PLAY:
            gol_randomize(grid, cfg.density / 100.0f);
            toast("SEED");
            break;
        case EV_LONG_A: case EV_LONG_B: nav_back(); break;
        default: break;
    }
}

void gol_render() {
    const CRGB playhead = CRGB(255, 120, 0);
    uint8_t step16 = audio_current_col();
    for (int y = 0; y < DISP_H; y++) {
        disp_set(step16, y, dim(COL_SYS));
        for (int x = 0; x < DISP_W; x++) {
            if (!gol_get(grid, x, y)) continue;
            disp_set(x, y, x == step16 ? playhead : cell_color(x, y));
        }
    }
}

// ---------------------------------------------------------------- DRAW
enum Tool : uint8_t { TOOL_PEN, TOOL_ERASER, TOOL_INVERT };
static const char* const TOOL_NAMES[] = {"CRAYON", "GOMME", "INVERSE"};
static int8_t  cur_x = 8, cur_y = 8;
static uint8_t tool = TOOL_INVERT;

static void clear_grid() { gol_clear(grid); toast("VIDE"); }

void draw_handle(const Event& ev) {
    switch (ev.type) {
        case EV_TURN_A:
            if (ev.shift) turn_brightness(ev.delta);
            else cur_x = (cur_x + ev.delta + DISP_W * 8) % DISP_W;   // 🎓 +16×8 : évite un modulo négatif
            break;
        case EV_TURN_B:
            if (ev.shift) turn_volume(ev.delta);
            else cur_y = (cur_y + ev.delta + DISP_H * 8) % DISP_H;
            break;
        case EV_CLICK_A:
            if (tool == TOOL_INVERT) gol_toggle(grid, cur_x, cur_y);
            else gol_set(grid, cur_x, cur_y, tool == TOOL_PEN);
            break;
        case EV_CLICK_B:
            tool = (tool + 1) % 3;
            toast(TOOL_NAMES[tool]);
            break;
        case EV_LONG_PLAY: confirm_open("EFFACER ?", clear_grid); break;
        case EV_LONG_A: case EV_LONG_B: nav_back(); break;
        default: break;
    }
}

void draw_render() {
    for (int y = 0; y < DISP_H; y++)
        for (int x = 0; x < DISP_W; x++)
            if (gol_get(grid, x, y)) disp_set(x, y, cell_color(x, y));
    // curseur en croix : centre clignotant, branches faibles
    for (int d = -2; d <= 2; d++) {
        if (d == 0) continue;
        disp_set(cur_x + d, cur_y, dim(COL_SYS));
        disp_set(cur_x, cur_y + d, dim(COL_SYS));
    }
    disp_set(cur_x, cur_y, (millis() / 250) % 2 ? COL_ACCENT : CRGB::Black);
}
