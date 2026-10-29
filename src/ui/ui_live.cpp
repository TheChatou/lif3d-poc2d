#include "ui_internal.h"
#include "gol.h"
#include "audio.h"
#include <esp_system.h>

#define OVERLAY_MS   1500
#define BRIGHT_STEP     8
#define BRIGHT_MIN      8    // plancher : la boîte ne paraît jamais éteinte
#define GRID_N        (DISP_W * DISP_H)

// ---------------------------------------------------------------- horloge commune
// 🎓 Le GOL suit l'horloge du séquenceur Mozzi (audio.cpp) : à chaque temps,
//    audio.cpp appelle on_beat() AVANT de choisir ses notes, donc le son et
//    les LEDs montrent toujours la même génération. La tête de lecture du
//    GOL = la colonne jouée ; celle de la BOOM = le pas de batterie joué.
static uint16_t beats_total = 0;

uint8_t live_step32() { return audio_drum_step(); }

static uint8_t grid[GRID_N], grid_next[GRID_N];

uint8_t* live_grid() { return grid; }

// ---------------------------------------------------------------- SYMETRIE
// 🎓 On RECOPIE une moitié sur l'autre (miroir), on ne fusionne pas :
//    fusionner doublerait la densité et étoufferait la grille.
static void symmetrize(uint8_t* g) {
    if (cfg.symmetry & 1)   // X : la moitié gauche se reflète à droite
        for (int y = 0; y < DISP_H; y++)
            for (int x = 0; x < DISP_W / 2; x++) g[y * DISP_W + DISP_W - 1 - x] = g[y * DISP_W + x];
    if (cfg.symmetry & 2)   // Y : la moitié haute se reflète en bas
        for (int y = 0; y < DISP_H / 2; y++)
            memcpy(&g[(DISP_H - 1 - y) * DISP_W], &g[y * DISP_W], DISP_W);
}

// ---------------------------------------------------------------- LOOP
// 🎓 LOOP : au lieu d'évoluer à l'infini, le GoL rejoue en boucle les 2, 4
//    ou 8 générations qui suivent l'image de départ — une phrase musicale
//    qui se répète. Elles sont calculées d'avance et rangées dans `hist`.
#define LOOP_MAX 8
static uint8_t hist[LOOP_MAX][GRID_N];   // 2 Ko
static uint8_t hist_len = 0, hist_rule = 0;
static int8_t  hist_pos = 0, hist_dir = 1;

// 🎓 La grille est modifiée par 2 cœurs : le GoL avance sur le cœur 0 (horloge
//    audio), le dessin / les presets arrivent du cœur 1. Sans verrou, une
//    génération calculée PENDANT un clic de dessin l'écraserait. Le spinlock
//    (portMUX) laisse un seul cœur à la fois toucher la grille.
static portMUX_TYPE grid_mux = portMUX_INITIALIZER_UNLOCKED;

// 🎓 Âge de chaque cellule : 0 = morte, 1 = née à cette génération, puis +1
//    à chaque génération survécue (qadd8 = addition qui bloque à 255). C'est
//    CE tableau que lit le séquenceur : une valeur ≠ 0 = une note, et sa
//    grandeur règle le volume ou le timbre (SET AUDIO > AGE SON).
static uint8_t ages[GRID_N];

static void update_ages(bool grow) {   // grow = une génération vient de passer
    for (int i = 0; i < GRID_N; i++)
        ages[i] = !grid[i] ? 0 : grow ? qadd8(ages[i], 1) : max<uint8_t>(ages[i], 1);
    audio_grid_update(ages);
}

// Toute modification de la grille par l'interface passe par ici. La LOOP
// repart de la nouvelle image, et le son la lit tout de suite.
void live_grid_edit(void (*edit)(uint8_t* g)) {
    portENTER_CRITICAL(&grid_mux);
    edit(grid);
    hist_len = 0;
    update_ages(false);
    portEXIT_CRITICAL(&grid_mux);
}

static void evolve() {
    if (!cfg.loop_on) {
        hist_len = 0;
        gol_step(grid, grid_next, cfg.rule);
        gol_copy(grid_next, grid);
        symmetrize(grid);
        return;
    }
    static const uint8_t LENS[] = {2, 4, 8};
    uint8_t len = LENS[cfg.loop_len];
    if (hist_len != len || hist_rule != cfg.rule) {   // (re)capture à partir de l'image actuelle
        gol_copy(grid, hist[0]);
        for (int i = 1; i < len; i++) {
            gol_step(hist[i - 1], hist[i], cfg.rule);
            symmetrize(hist[i]);
        }
        hist_len = len; hist_rule = cfg.rule; hist_pos = 0; hist_dir = 1;
    }
    if (cfg.loop_mode == 0) {
        hist_pos = (hist_pos + 1) % len;                       // CYCLE : 1 2 3 4 1 2 3 4
    } else {
        if (hist_pos + hist_dir < 0 || hist_pos + hist_dir >= len) hist_dir = -hist_dir;
        hist_pos += hist_dir;                                  // ALLER RETOUR : 1 2 3 4 3 2 1
    }
    gol_copy(hist[hist_pos], grid);
}

static void on_beat() {
    // 🎓 SET GOL > EVOLUTION : une génération tous les 1, 2, 4 ou 16 temps
    static const uint8_t EVERY[] = {1, 2, 4, 16};
    if (++beats_total % EVERY[cfg.evolution] == 0) {
        portENTER_CRITICAL(&grid_mux);
        evolve();
        update_ages(true);
        portEXIT_CRITICAL(&grid_mux);
    }
}

static void new_seed() {
    live_grid_edit([](uint8_t* g) { gol_randomize(g, cfg.density / 100.0f); symmetrize(g); });
}

void live_init() {
    gol_seed(esp_random());
    new_seed();
    audio_set_gol_step_callback(on_beat);
}

// 🎓 Tous les réglages des menus → un paquet AudioParams envoyé au moteur son
static void push_audio_params() {
    AudioParams p;
    p.bpm = cfg.bpm;  p.scale = cfg.scale;  p.tonic = cfg.tonic;  p.octave = cfg.octave;
    p.timbre = cfg.timbre;  p.arp = cfg.arp;  p.reverb = cfg.reverb;
    p.attack = cfg.attack;  p.decay = cfg.decay;
    p.arp_mode = cfg.arp_mode;  p.arp_div = cfg.arp_div;  p.arp_swing = cfg.arp_swing;
    p.arp_gate = cfg.arp_gate;  p.chord = cfg.chord;  p.pompe = cfg.pompe;
    p.arp_oct = cfg.arp_oct + 1;  p.age_mode = cfg.age_mode;  p.age_max = cfg.age_max;
    p.drum_volume = cfg.boom_vol * cfg.boom_master / 100;
    p.kit = cfg.kit;  p.swing = cfg.swing;
    memcpy(p.pattern, boom_pattern(), sizeof(p.pattern));
    for (int t = 0; t < 8; t++) {
        DrumTrack& d = p.track[t];
        d.pitch = track_value(t, TV_PITCH);   d.decay = track_value(t, TV_DECAY);
        d.tone = track_value(t, TV_TONE);     d.volume = track_value(t, TV_VOLUME);
        d.proba = track_value(t, TV_PROBA);   d.mute = track_value(t, TV_MUTE);
        for (int s = 0; s < 32; s++) {
            p.step_velo[t][s]  = step_value(t, s, SV_VELO);
            p.step_proba[t][s] = step_value(t, s, SV_PROBA);
        }
    }
    audio_set_params(p);
}

void live_tick() {
    if (cfg.playing == audio_is_paused()) audio_toggle_pause();   // ▶ → séquenceur
    audio_set_volume(cfg.volume);
    push_audio_params();
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
// Appuis longs en live (setup "Joueur") : PLUIE réveille une grille qui meurt,
// et on coupe / remet la batterie sans passer par les menus.
static void rain() {
    live_grid_edit([](uint8_t* g) {
        for (int i = 0; i < 12; i++) gol_set(g, random(DISP_W), random(DISP_H), 1);
        symmetrize(g);
    });
    toast("PLUIE");
}

static void toggle_boom() {
    static int16_t saved = 80;
    if (cfg.boom_master) { saved = cfg.boom_master; cfg.boom_master = 0; toast("BOOM OFF"); }
    else { cfg.boom_master = saved; toast("BOOM ON"); }
}

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
            new_seed();
            toast("SEED");
            break;
        case EV_LONG_A: rain(); break;
        case EV_LONG_B: toggle_boom(); break;
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

static void clear_grid() { live_grid_edit(gol_clear); toast("VIDE"); }

static void apply_tool() {
    live_grid_edit([](uint8_t* g) {
        if (tool == TOOL_INVERT) gol_toggle(g, cur_x, cur_y);
        else gol_set(g, cur_x, cur_y, tool == TOOL_PEN);
    });
}

// 🎓 Molette ENFONCÉE + tournée = on trace : l'outil s'applique à chaque case
//    traversée (cran par cran, pour ne pas sauter de case si on tourne vite).
static void move(int8_t& c, int8_t delta, int size, bool paint) {
    int8_t dir = delta > 0 ? 1 : -1;
    if (paint && tool != TOOL_INVERT) apply_tool();   // la case de départ aussi (inverser 2× l'effacerait)
    for (int i = 0; i != delta; i += dir) {
        c = (c + dir + size) % size;
        if (paint) apply_tool();
    }
}

void draw_handle(const Event& ev) {
    switch (ev.type) {
        case EV_TURN_A:
            if (ev.shift) turn_brightness(ev.delta);
            else move(cur_x, ev.delta, DISP_W, ev.pushed);
            break;
        case EV_TURN_B:
            if (ev.shift) turn_volume(ev.delta);
            else move(cur_y, ev.delta, DISP_H, ev.pushed);
            break;
        case EV_CLICK_A: apply_tool(); break;
        case EV_CLICK_B:
            tool = (tool + 1) % 3;
            toast(TOOL_NAMES[tool]);
            break;
        case EV_LONG_PLAY: confirm_open("EFFACER ?", clear_grid); break;
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
