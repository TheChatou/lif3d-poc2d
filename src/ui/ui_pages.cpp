#include "ui_internal.h"

#define VISIBLE_ROWS    8     // moitié haute : une ligne de LEDs par réglage
#define LABEL_Y        10     // moitié basse : nom (ou valeur) du réglage

// 🎓 Un réglage ne stocke pas sa valeur : il POINTE vers elle (int16_t*).
//    Ainsi la page SET AUDIO et l'écran GOL modifient la même variable,
//    sans copie à synchroniser.
enum Kind : uint8_t { K_BAR, K_OPT, K_ACTION };

struct Setting {
    const char*        name;
    Kind               kind;
    int16_t*           value;
    int16_t            min, max;   // K_BAR : bornes ; K_OPT : 0..nb_options-1
    const char* const* labels;     // K_OPT : nom de chaque option
};

static const char* const SCALES[]  = {"JAPONAISE", "PENTA", "PENTA MIN", "LYDIEN", "MIXOLYDIEN", "PHRYGIEN"};
static const char* const TONICS[]  = {"C", "C+", "D", "D+", "E", "F", "F+", "G", "G+", "A", "A+", "B"};
static const char* const OCTAVES[] = {"1", "2", "3", "4", "5"};
static const char* const TIMBRES[] = {"CRISTAL", "PIANO", "ORGUE", "PAD", "BASSE", "MARIMBA", "LIBRE"};
static const char* const ONOFF[]   = {"OFF", "ON"};
static const char* const RULES[]   = {"CONWAY", "CORAL", "DENSE", "BUILDER", "SYMETRIC", "HIGHLIFE", "BALANCED"};  // même ordre que GOL_RULES (gol.cpp)
static const char* const EVOLS[]   = {"1 TEMPS", "2 TEMPS", "4 TEMPS", "MESURE"};
static const char* const LOOPLEN[] = {"X2", "X4", "X8"};
static const char* const LOOPMOD[] = {"CYCLE", "ALLER RETOUR"};
static const char* const SYMS[]    = {"AUCUNE", "X", "Y", "XY"};
static const char* const PALS[]    = {"GLACE", "AMBRE", "SPECTRE"};
static const char* const KITS[]    = {"808", "ACOUSTIC", "LOFI"};
static const char* const BOOTS[]   = {"TEXTE", "LOGO"};
static const char* const HUBS[]    = {"2 NIVEAUX", "PLAT"};
static const char* const SELS[]    = {"VIF", "CLIGNOTE", "COULEUR"};
static const char* const PANS[]    = {"G2", "G1", "C", "D1", "D2"};
static const char* const NOYES[]   = {"NON", "OUI"};
static const char* const LEDTESTS[] = {"NORMAL", "NOIR", "FIGE", "SANS DITHER"};
static int16_t dummy_action = 0;

static const Setting SET_AUDIO[] = {
    {"BPM", K_BAR, &cfg.bpm, 20, 140, nullptr},      {"GAMME", K_OPT, &cfg.scale, 0, 5, SCALES},
    {"TONIQUE", K_OPT, &cfg.tonic, 0, 11, TONICS},   {"OCTAVE", K_OPT, &cfg.octave, 0, 4, OCTAVES},
    {"TIMBRE", K_OPT, &cfg.timbre, 0, 6, TIMBRES},   {"ARPEGE", K_OPT, &cfg.arp, 0, 1, ONOFF},
    {"REVERB", K_BAR, &cfg.reverb, 0, 100, nullptr}, {"VOL BOOM", K_BAR, &cfg.boom_vol, 0, 100, nullptr},
    {"ATTACK", K_BAR, &cfg.attack, 0, 100, nullptr}, {"DECAY", K_BAR, &cfg.decay, 0, 100, nullptr},
};
static const Setting SET_GOL[] = {
    {"REGLE", K_OPT, &cfg.rule, 0, 6, RULES},          {"EVOLUTION", K_OPT, &cfg.evolution, 0, 3, EVOLS},
    {"LOOP", K_OPT, &cfg.loop_on, 0, 1, ONOFF},        {"DUREE LOOP", K_OPT, &cfg.loop_len, 0, 2, LOOPLEN},
    {"LECTURE", K_OPT, &cfg.loop_mode, 0, 1, LOOPMOD}, {"SYMETRIE", K_OPT, &cfg.symmetry, 0, 3, SYMS},
    {"DENSITE", K_BAR, &cfg.density, 0, 100, nullptr}, {"PALETTE", K_OPT, &cfg.palette, 0, 2, PALS},
};
static const Setting SET_BOOM[] = {
    {"KIT", K_OPT, &cfg.kit, 0, 2, KITS}, {"SWING", K_BAR, &cfg.swing, 0, 100, nullptr},
    {"VOLUME", K_BAR, &cfg.boom_master, 0, 100, nullptr},
};
static const Setting SET_SYS[] = {
    {"DEMARRAGE", K_OPT, &cfg.boot_style, 0, 1, BOOTS}, {"HUB", K_OPT, &cfg.hub_style, 0, 1, HUBS},
    {"SELECTION", K_OPT, &cfg.sel_style, 0, 2, SELS},   {"LUMINOSITE", K_BAR, &cfg.brightness, 8, 255, nullptr},
    {"TEST LED", K_OPT, &cfg.led_test, 0, 3, LEDTESTS}, {"DIAG", K_ACTION, &dummy_action, 0, 0, nullptr},
};

// Réglages d'une piste de la BOOM (8 pistes × 8 valeurs)
static int16_t track_vals[8][8];
static Setting set_track[8];

struct Page { const char* title; const Setting* items; uint8_t count; };
static Page pages[PAGE_COUNT] = {
    {"AUDIO", SET_AUDIO, sizeof(SET_AUDIO) / sizeof(Setting)},
    {"GOL", SET_GOL, sizeof(SET_GOL) / sizeof(Setting)},
    {"BOOM", SET_BOOM, sizeof(SET_BOOM) / sizeof(Setting)},
    {"SYS", SET_SYS, sizeof(SET_SYS) / sizeof(Setting)},
    {"TRACK", set_track, 8},
};
static uint8_t track_idx = 0;

// 🎓 Couleur calculée à la demande (et pas copiée dans le tableau au démarrage) :
//    l'ordre d'initialisation des variables globales entre 2 fichiers .cpp
//    n'est pas garanti en C++, les couleurs auraient pu valoir 0 (noir).
static CRGB page_color(uint8_t id) {
    switch (id) {
        case PAGE_SET_AUDIO: return COL_SOUND;
        case PAGE_SET_GOL:   return COL_VISUAL;
        case PAGE_SET_BOOM:  return COL_BOOM;
        case PAGE_TRACK:     return TRACK_COLORS[track_idx];
        default:             return COL_SYS;
    }
}

static uint8_t  page = 0, sel = 0;
static uint32_t t_sel = 0, t_value = 0;
static bool     editing = false;   // false = on choisit la ligne, true = on change sa valeur
static int16_t  backup = 0;        // valeur avant édition (pour annuler)

#define COL_POINT CRGB(255, 210, 140)   // ligne pointée : blanc chaud, distinct des couleurs de page

static void build_track_page(uint8_t t) {
    static const char* const NAMES[8] = {"PITCH", "DECAY", "TONE", "VOLUME", "PAN", "SWING", "PROBA", "MUTE"};
    static bool init = false;
    if (!init) {
        for (auto& tv : track_vals) { tv[0] = 50; tv[1] = 40; tv[2] = 60; tv[3] = 80; tv[4] = 2; tv[6] = 100; }
        init = true;
    }
    for (int i = 0; i < 8; i++) {
        Kind k = (i == 4 || i == 7) ? K_OPT : K_BAR;
        const char* const* lab = i == 4 ? PANS : i == 7 ? NOYES : nullptr;
        set_track[i] = {NAMES[i], k, &track_vals[t][i], 0, (int16_t)(i == 4 ? 4 : i == 7 ? 1 : 100), lab};
    }
    pages[PAGE_TRACK].title = TRACK_NAMES[t];
    track_idx = t;
}

void page_open(uint8_t id, uint8_t track) {
    if (id == PAGE_TRACK) build_track_page(track);
    page = id;
    sel = 0;
    t_sel = millis();
    t_value = 0;
    editing = false;
}

static void apply(const Setting& s) {
    if (s.value == &cfg.brightness) disp_set_brightness(cfg.brightness);
    if (s.value == &cfg.led_test) disp_test_mode(cfg.led_test);
}

// TEST LED : en NOIR / FIGE on ne voit plus l'écran → dès qu'on sort de
// l'édition (clic ou appui long), on revient à NORMAL pour ne pas rester aveugle.
static void end_edit(const Setting& s) {
    editing = false;
    t_sel = millis();
    if (s.value == &cfg.led_test) { cfg.led_test = LT_NORMAL; apply(s); }
}

// 🎓 Édition en 2 temps : tourner = choisir la ligne, clic droit = "j'édite",
//    tourner = changer la valeur (EN DIRECT, pour entendre/voir l'effet),
//    clic droit = valider ; clic gauche ou appui long = annuler / revenir.
//    Partout ici : DROITE = avancer/valider, GAUCHE = reculer.
void page_handle(const Event& ev) {
    const Page& p = pages[page];
    const Setting& s = p.items[sel];
    bool turn  = ev.type == EV_TURN_A || ev.type == EV_TURN_B;
    bool ok    = ev.type == EV_CLICK_B;
    bool back  = ev.type == EV_CLICK_A || ev.type == EV_LONG_A || ev.type == EV_LONG_B;
    if (!editing) {
        if (turn) {
            sel = constrain(sel + ev.delta, 0, p.count - 1);
            t_sel = millis();
        } else if (ok && s.kind == K_ACTION) {
            nav_open(SCR_DIAG);
        } else if (ok) {
            editing = true;
            backup = *s.value;
            t_value = millis();
        } else if (back) {
            nav_back();
        }
        return;
    }
    if (turn) {
        // 🎓 Barre : pas de 5 % de la plage, ou de 1 si la molette est enfoncée (réglage fin)
        int step = (s.kind == K_BAR && !ev.pushed) ? max(1, (s.max - s.min) / 20) : 1;
        *s.value = constrain(*s.value + ev.delta * step, s.min, s.max);
        apply(s);
        t_value = millis();
    } else if (ok) {
        end_edit(s);
        toast("OK", 400);
    } else if (back) {
        *s.value = backup;
        apply(s);
        end_edit(s);
        toast("ANNULE", 600);
    }
}

enum RowState : uint8_t { ROW_NORMAL, ROW_POINTED, ROW_EDITING };

static void draw_row(int y, const Setting& s, CRGB base, RowState st) {
    CRGB on = dim(base), off = CRGB::Black;
    if (st == ROW_POINTED) { on = COL_POINT; off = dim(COL_POINT); }
    if (st == ROW_EDITING) {
        on = base;
        if ((millis() / 300) % 2) on.nscale8(150);   // 🎓 nscale8 : assombrit la couleur (×150/256) → léger clignotement
        off = dim(base);
    }
    if (s.kind == K_BAR) {
        int fill = (int32_t)(*s.value - s.min) * DISP_W / (s.max - s.min);
        for (int x = 0; x < DISP_W; x++) disp_set(x, y, x < fill ? on : off);
    } else if (s.kind == K_OPT) {
        int n = s.max + 1;
        for (int i = 0; i < n; i++) {
            int x = n > 1 ? i * (DISP_W - 1) / (n - 1) : DISP_W / 2;
            disp_set(x, y, i == *s.value ? on : off);
        }
    } else {
        for (int x = 6; x < 10; x++) disp_set(x, y, on);   // action : un petit bloc central
    }
}

void page_render() {
    const Page& p = pages[page];
    int start = constrain((int)sel - VISIBLE_ROWS / 2 + 1, 0, max(0, p.count - VISIBLE_ROWS));
    for (int r = 0; r < VISIBLE_ROWS && start + r < p.count; r++) {
        RowState st = start + r != sel ? ROW_NORMAL : editing ? ROW_EDITING : ROW_POINTED;
        draw_row(r, p.items[start + r], page_color(page), st);
    }
    const Setting& s = p.items[sel];
    bool show_value = editing && s.kind != K_ACTION;   // en édition : la valeur reste affichée
    char buf[12];
    const char* txt = s.name;
    if (show_value) {
        if (s.kind == K_OPT) txt = s.labels[*s.value];
        else { snprintf(buf, sizeof(buf), "%d", *s.value); txt = buf; }
    }
    draw_label(FONT_3X5P, txt, LABEL_Y, page_color(page), true, show_value ? t_value : t_sel);
}

// ---------------------------------------------------------------- confirmation
static const char* confirm_q = nullptr;
static void (*confirm_yes)() = nullptr;
static int16_t confirm_choice = 0;   // 0 = NON (par défaut, plus sûr)
static uint32_t confirm_t0 = 0;

void confirm_open(const char* question, void (*on_yes)()) {
    confirm_q = question;
    confirm_yes = on_yes;
    confirm_choice = 0;
    confirm_t0 = millis();
    nav_open(SCR_CONFIRM);
}

void confirm_handle(const Event& ev) {
    if (ev.type == EV_TURN_B || ev.type == EV_TURN_A) confirm_choice = ev.delta > 0 ? 1 : 0;
    else if (ev.type == EV_CLICK_B || ev.type == EV_CLICK_A) {
        nav_back();
        if (confirm_choice && confirm_yes) confirm_yes();
    } else if (ev.type == EV_LONG_A || ev.type == EV_LONG_B) nav_back();
}

void confirm_render() {
    const CRGB red = CRGB(255, 20, 0);
    draw_text_fit(FONT_3X5P, confirm_q, 0, red, confirm_t0);
    draw_text_fit(FONT_3X5, confirm_choice ? "OUI" : "NON", 7, CRGB::White, 0);
    disp_set(6, 14, confirm_choice ? dim(red) : red);
    disp_set(9, 14, confirm_choice ? red : dim(red));
}
