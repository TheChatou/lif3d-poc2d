#include "ui_internal.h"

const CRGB TRACK_COLORS[8] = {
    CRGB(255, 0, 0), CRGB(255, 90, 0), CRGB(255, 220, 0), CRGB(60, 255, 0),
    CRGB(0, 220, 255), CRGB(0, 60, 255), CRGB(140, 0, 255), CRGB(255, 0, 140),
};
const char* const TRACK_NAMES[8] = {"KICK", "SNARE", "HAT", "OPEN HAT", "CLAP", "TOM H", "TOM M", "TOM L"};

uint8_t live_step32();

// ---------------------------------------------------------------- BOOM
// 🎓 Pattern stocké en bits : 1 entier de 32 bits par piste, bit n = pas n.
//    8 pistes × 4 octets = 32 octets pour toute la boîte à rythme.
static uint32_t pattern[8] = {
    0x55551111, 0x10101010, 0x55555555, 0x80808080, 0x10001000, 0x20004000, 0, 0x40000000,
};
static int8_t boom_x = 0, boom_t = 0;   // curseur : pas (0–31) et piste (0–7)

uint32_t* boom_pattern() { return pattern; }   // pour REC BOOM (sauver / charger)

void boom_handle(const Event& ev) {
    switch (ev.type) {
        case EV_TURN_A:
            if (ev.shift) {
                cfg.brightness = constrain(cfg.brightness + ev.delta * 8, 8, 255);
                disp_set_brightness(cfg.brightness);
            } else boom_x = (boom_x + ev.delta + 32 * 8) % 32;
            break;
        case EV_TURN_B:
            if (ev.shift) {
                cfg.volume = constrain(cfg.volume + ev.delta * 5, 0, 100);
                overlay_show("VOL", cfg.volume, 100);
            } else boom_t = (boom_t + ev.delta + 8 * 8) % 8;
            break;
        case EV_CLICK_A: pattern[boom_t] ^= (1UL << boom_x); break;   // 🎓 XOR : inverse le bit du pas
        case EV_CLICK_B: nav_open(SCR_PAGE, PAGE_TRACK); page_open(PAGE_TRACK, boom_t); break;
        case EV_CLICK_AB: nav_open(SCR_REC, BANK_BOOM); break;
        case EV_LONG_A: case EV_LONG_B: nav_back(); break;
        default: break;
    }
}

void boom_render() {
    uint8_t step = live_step32();
    for (int t = 0; t < 8; t++) {
        for (int s = 0; s < 32; s++) {
            int x = s % 16, y = t + (s < 16 ? 0 : 8);   // pas 1–16 en haut, 17–32 en bas
            bool on = pattern[t] & (1UL << s);
            if (s == step) disp_set(x, y, on ? COL_ACCENT : dim(COL_SYS));
            else if (on) disp_set(x, y, TRACK_COLORS[t]);
        }
    }
    int cx = boom_x % 16, cy = boom_t + (boom_x < 16 ? 0 : 8);
    if ((millis() / 250) % 2) disp_set(cx, cy, COL_ACCENT);   // curseur clignotant
}

// ---------------------------------------------------------------- DIAG
// 🎓 Affiche les valeurs BRUTES des encodeurs : si une molette ne bouge pas,
//    ou que le compteur avance de 2 au lieu de 4 par cran, on le voit ici.
void diag_handle(const Event& ev) {
    (void)ev;   // seule sortie : appui long ▶ (géré dans ui.cpp → retour au GOL)
}

void diag_render() {
    InputDiag d = input_diag();
    char buf[8];
    snprintf(buf, sizeof(buf), "A%d", (int)(d.raw_a % 1000));
    draw_text(FONT_3X5P, buf, 0, 0, COL_VISUAL);
    snprintf(buf, sizeof(buf), "B%d", (int)(d.raw_b % 1000));
    draw_text(FONT_3X5P, buf, 0, 6, COL_SOUND);
    bool sw[3] = {d.sw_a, d.sw_b, d.sw_play};
    for (int i = 0; i < 3; i++)                                // 3 témoins : clic A, clic B, ▶
        for (int dx = 0; dx < 3; dx++)
            for (int dy = 0; dy < 3; dy++)
                disp_set(1 + i * 5 + dx, 12 + dy, sw[i] ? COL_ACCENT : dim(COL_SYS));
}
