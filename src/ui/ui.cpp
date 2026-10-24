#include "ui.h"
#include "ui_internal.h"

Settings cfg;

const CRGB COL_VISUAL = CRGB(255, 140, 20);
const CRGB COL_SOUND  = CRGB(0, 190, 255);
const CRGB COL_BOOM   = CRGB(255, 70, 0);
const CRGB COL_SYS    = CRGB(200, 200, 200);
const CRGB COL_ACCENT = CRGB(255, 255, 255);

#define BOOT_HOLD_MS  3000
#define BOOT_FADE_MS   700
#define HUB_FOCUS_Y      5    // ligne du menu sélectionné (centré)
#define LINE_STEP        6    // 5 LEDs de texte + 1 d'interligne
#define NAV_DEPTH        6

// ---------------------------------------------------------------- navigation
struct NavEntry { Screen s; uint8_t arg; };
static NavEntry stack[NAV_DEPTH];
static uint8_t  depth = 0;
static Screen   current = SCR_BOOT;
static uint8_t  current_arg = 0;
static uint32_t t_enter = 0;

static const char* toast_msg = nullptr;
static uint32_t    toast_t = 0;

static void enter(Screen s, uint8_t arg) {
    current = s;
    current_arg = arg;
    t_enter = millis();
}

void nav_open(Screen s, uint8_t arg) {
    if (depth < NAV_DEPTH) stack[depth++] = {current, current_arg};
    enter(s, arg);
    if (s == SCR_REC) rec_open(arg);
}

void nav_back() {
    if (depth == 0) { enter(SCR_HUB, 0); return; }   // tout en haut : on reste/revient au hub
    NavEntry e = stack[--depth];
    enter(e.s, e.arg);
}

uint32_t screen_age_ms() { return millis() - t_enter; }

void toast(const char* msg) { toast_msg = msg; toast_t = millis(); }

// 🎓 Les 3 styles de sélection à comparer sur la vraie matrice (menu SYS).
CRGB sel_color(CRGB base, bool selected) {
    if (!selected) return dim(base);
    switch (cfg.sel_style) {
        case SEL_BLINK: return ((millis() / 300) % 2) ? base : dim(base);
        case SEL_COLOR: return COL_ACCENT;
        default:        return base;
    }
}

void draw_label(const Font& f, const char* s, int y, CRGB c, bool may_scroll, uint32_t t0) {
    if (text_width(f, s) <= DISP_W || may_scroll) draw_text_fit(f, s, y, c, t0);
    else draw_text(f, s, 0, y, c);   // trop long et pas sélectionné : on coupe
}

// ---------------------------------------------------------------- hub
struct HubItem { const char* label; Screen target; uint8_t arg; bool submenu; };

static const HubItem HUB_TOP[] = {
    {"GOL", SCR_GOL, 0, false}, {"DRAW", SCR_DRAW, 0, false}, {"BOOM", SCR_BOOM, 0, false},
    {"REC", SCR_HUB, 1, true},  {"SET", SCR_HUB, 2, true},    {"SYS", SCR_PAGE, PAGE_SYS, false},
};
static const HubItem HUB_REC[] = {
    {"GOL", SCR_REC, BANK_GOL, false}, {"BOOM", SCR_REC, BANK_BOOM, false}, {"AUDIO", SCR_REC, BANK_AUDIO, false},
};
static const HubItem HUB_SET[] = {
    {"GOL", SCR_PAGE, PAGE_SET_GOL, false}, {"BOOM", SCR_PAGE, PAGE_SET_BOOM, false},
    {"AUDIO", SCR_PAGE, PAGE_SET_AUDIO, false},
};
static const HubItem HUB_FLAT_ITEMS[] = {
    {"GOL", SCR_GOL, 0, false}, {"DRAW", SCR_DRAW, 0, false}, {"BOOM", SCR_BOOM, 0, false},
    {"REC GOL", SCR_REC, BANK_GOL, false}, {"REC BOOM", SCR_REC, BANK_BOOM, false},
    {"REC AUDIO", SCR_REC, BANK_AUDIO, false}, {"SET GOL", SCR_PAGE, PAGE_SET_GOL, false},
    {"SET BOOM", SCR_PAGE, PAGE_SET_BOOM, false}, {"SET AUDIO", SCR_PAGE, PAGE_SET_AUDIO, false},
    {"SYS", SCR_PAGE, PAGE_SYS, false},
};
static int8_t hub_focus[3] = {0, 0, 0};   // mémoire de position par niveau

static const HubItem* hub_items(uint8_t level, uint8_t& n) {
    if (cfg.hub_style == HUB_FLAT) { n = sizeof(HUB_FLAT_ITEMS) / sizeof(HubItem); return HUB_FLAT_ITEMS; }
    if (level == 1) { n = 3; return HUB_REC; }
    if (level == 2) { n = 3; return HUB_SET; }
    n = sizeof(HUB_TOP) / sizeof(HubItem);
    return HUB_TOP;
}

static void hub_handle(const Event& ev) {
    uint8_t lvl = cfg.hub_style == HUB_FLAT ? 0 : current_arg, n;
    const HubItem* items = hub_items(lvl, n);
    int8_t& f = hub_focus[lvl];
    if (ev.type == EV_TURN_A || ev.type == EV_TURN_B) {
        f = constrain(f + ev.delta, 0, n - 1);   // droite = descendre ; bloque aux extrémités
        t_enter = millis();                      // relance le défilement du libellé
    } else if (ev.type == EV_CLICK_A || ev.type == EV_CLICK_B) {
        const HubItem& it = items[f];
        if (it.target == SCR_PAGE) { nav_open(SCR_PAGE, it.arg); page_open(it.arg); }
        else nav_open(it.target, it.arg);
    } else if (ev.type == EV_LONG_A || ev.type == EV_LONG_B) {
        if (depth > 0) nav_back();
        else nav_open(SCR_GOL);                  // hub racine : retour au live
    }
}

static void hub_render() {
    uint8_t lvl = cfg.hub_style == HUB_FLAT ? 0 : current_arg, n;
    const HubItem* items = hub_items(lvl, n);
    int f = hub_focus[lvl];
    // 🎓 Le menu sélectionné reste au centre ; aux extrémités la liste "colle"
    int y0 = (f == 0) ? 0 : (f == n - 1) ? DISP_H - 5 : HUB_FOCUS_Y;
    CRGB base = lvl == 1 ? COL_BOOM : lvl == 2 ? COL_SOUND : COL_SYS;
    for (int k = 0; k < n; k++) {
        int y = y0 + (k - f) * LINE_STEP;
        if (y <= -5 || y >= DISP_H) continue;
        draw_label(FONT_3X5, items[k].label, y, sel_color(base, k == f), k == f, t_enter);
    }
}

// ---------------------------------------------------------------- boot
static void boot_render(uint32_t age) {
    if (cfg.boot_style == BOOT_TEXT) {
        draw_text(FONT_3X5, "LIF2D", 0, 5, COL_SOUND, &LOGO_KERN);
        return;
    }
    static const uint8_t GLIDER[3] = {0b010, 0b001, 0b111};
    int shift = age > BOOT_HOLD_MS ? (age - BOOT_HOLD_MS) / 120 : 0;  // le glider "s'envole"
    for (int gy = 0; gy < 3; gy++)
        for (int gx = 0; gx < 3; gx++)
            if (GLIDER[gy] & (0b100 >> gx))
                for (int d = 0; d < 9; d++) disp_set(3 + gx * 3 + d % 3 + shift, gy * 3 + d / 3 + shift, COL_VISUAL);
    draw_text(FONT_3X5, "LIF2D", 0, 11, dim(COL_SOUND) * 2, &LOGO_KERN);
}

// ---------------------------------------------------------------- dispatcher
void ui_init() {
    live_init();
    enter(SCR_BOOT, 0);
}

static void handle(const Event& ev) {
    // ▶ = play/pause partout (sauf DIAG qui teste les boutons)
    if (ev.type == EV_CLICK_PLAY && current != SCR_DIAG) {
        cfg.playing = !cfg.playing;
        toast(cfg.playing ? "PLAY" : "STOP");
        return;
    }
    switch (current) {
        case SCR_HUB:     hub_handle(ev); break;
        case SCR_GOL:     gol_handle(ev); break;
        case SCR_DRAW:    draw_handle(ev); break;
        case SCR_BOOM:    boom_handle(ev); break;
        case SCR_REC:     rec_handle(ev); break;
        case SCR_PAGE:    page_handle(ev); break;
        case SCR_CONFIRM: confirm_handle(ev); break;
        case SCR_DIAG:    diag_handle(ev); break;
        default: break;
    }
}

void ui_update() {
    Event ev;
    while (input_next(ev)) {
        if (current == SCR_BOOT) continue;   // pas d'interaction pendant le logo
        handle(ev);
    }
    live_tick();

    uint32_t age = screen_age_ms();
    uint8_t fade = 255;
    disp_clear();
    if (toast_msg && millis() - toast_t < 900) {
        draw_text_fit(FONT_3X5P, toast_msg, 5, COL_SYS, toast_t);
    } else {
        toast_msg = nullptr;
        switch (current) {
            case SCR_BOOT:
                boot_render(age);
                if (age > BOOT_HOLD_MS) fade = 255 - min<uint32_t>(255, (age - BOOT_HOLD_MS) * 255 / BOOT_FADE_MS);
                if (age > BOOT_HOLD_MS + BOOT_FADE_MS) enter(SCR_HUB, 0);
                break;
            case SCR_HUB:     hub_render(); break;
            case SCR_GOL:     gol_render(); overlay_render(); break;
            case SCR_DRAW:    draw_render(); overlay_render(); break;
            case SCR_BOOM:    boom_render(); overlay_render(); break;
            case SCR_REC:     rec_render(); break;
            case SCR_PAGE:    page_render(); break;
            case SCR_CONFIRM: confirm_render(); break;
            case SCR_DIAG:    diag_render(); break;
        }
    }
    disp_show(fade);
}
