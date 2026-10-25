#include "ui_internal.h"

// ---------------------------------------------------------------- REC (presets)
// 🎓 Les presets vivent en RAM pour l'instant : ils disparaissent à
//    l'extinction. La sauvegarde en flash (NVS) viendra à l'étape 4.
#define SLOTS     16
#define NAME_MAX  12
#define GRID_N   (DISP_W * DISP_H)

struct Slot { bool used; char name[NAME_MAX + 1]; };
struct AudioPreset { int16_t bpm, scale, tonic, octave, timbre, arp, reverb, attack, decay; };

static Slot        slots[3][SLOTS];
static uint8_t     gol_grids[SLOTS][GRID_N];   // 16 × 256 octets = 4 Ko
static int16_t     gol_rules[SLOTS];
static uint32_t    boom_patterns[SLOTS][8];
static AudioPreset audio_presets[SLOTS];

static uint8_t  bank = 0;
static int8_t   slot = 0;
static int8_t   menu = -1;   // -1 = grille ; sinon index dans MENU
static uint32_t menu_t0 = 0;
static const char* const MENU[]       = {"ANNULER", "ECRASER", "SUPPRIMER"};
static const char* const BANK_NAMES[] = {"GOL", "BOOM", "AUDIO"};

static CRGB bank_color() {
    return bank == BANK_GOL ? COL_VISUAL : bank == BANK_BOOM ? COL_BOOM : COL_SOUND;
}

void rec_open(uint8_t b) { bank = b; menu = -1; }

static void save_slot(const char* name) {
    Slot& s = slots[bank][slot];
    s.used = true;
    strlcpy(s.name, name, sizeof(s.name));
    switch (bank) {
        case BANK_GOL:
            memcpy(gol_grids[slot], live_grid(), GRID_N);
            gol_rules[slot] = cfg.rule;
            break;
        case BANK_BOOM: memcpy(boom_patterns[slot], boom_pattern(), sizeof(boom_patterns[0])); break;
        default:
            audio_presets[slot] = {cfg.bpm, cfg.scale, cfg.tonic, cfg.octave, cfg.timbre,
                                   cfg.arp, cfg.reverb, cfg.attack, cfg.decay};
    }
    toast("SAUVE");
}

// ▶ sur un preset : on le charge ET on le lance directement
static void load_slot() {
    const Slot& s = slots[bank][slot];
    switch (bank) {
        case BANK_GOL:
            memcpy(live_grid(), gol_grids[slot], GRID_N);
            cfg.rule = gol_rules[slot];
            break;
        case BANK_BOOM: memcpy(boom_pattern(), boom_patterns[slot], sizeof(boom_patterns[0])); break;
        default: {
            const AudioPreset& a = audio_presets[slot];
            cfg.bpm = a.bpm; cfg.scale = a.scale; cfg.tonic = a.tonic; cfg.octave = a.octave;
            cfg.timbre = a.timbre; cfg.arp = a.arp; cfg.reverb = a.reverb;
            cfg.attack = a.attack; cfg.decay = a.decay;
        }
    }
    cfg.playing = true;
    toast(s.name);
    nav_open(bank == BANK_BOOM ? SCR_BOOM : SCR_GOL);
}

static void delete_slot() { slots[bank][slot].used = false; toast("SUPPRIME"); }

static char default_name[NAME_MAX + 1];

static void ask_name(const char* initial) {
    snprintf(default_name, sizeof(default_name), "%s %d", BANK_NAMES[bank], slot + 1);
    name_open(initial, default_name, save_slot);
}

static void menu_handle(const Event& ev) {
    if (ev.type == EV_TURN_A || ev.type == EV_TURN_B) {
        menu = constrain(menu + ev.delta, 0, 2);
        menu_t0 = millis();
    } else if (ev.type == EV_CLICK_A || ev.type == EV_CLICK_B) {
        int8_t m = menu;
        menu = -1;
        if (m == 1) ask_name(slots[bank][slot].name);
        else if (m == 2) confirm_open("SUPPRIMER ?", delete_slot);
    } else if (ev.type == EV_LONG_A || ev.type == EV_LONG_B) {
        menu = -1;
    }
}

void rec_handle(const Event& ev) {
    if (menu >= 0) { menu_handle(ev); return; }
    const Slot& s = slots[bank][slot];
    switch (ev.type) {
        case EV_TURN_A: slot = constrain(slot + ev.delta, 0, SLOTS - 1); break;       // case par case
        case EV_TURN_B: slot = constrain(slot + ev.delta * 4, slot % 4, 12 + slot % 4); break;  // ligne par ligne
        case EV_CLICK_A: toast(s.used ? s.name : "VIDE"); break;
        case EV_CLICK_PLAY: if (s.used) load_slot(); else toast("VIDE"); break;
        case EV_CLICK_B:
            if (s.used) { menu = 0; menu_t0 = millis(); }
            else ask_name("");
            break;
        case EV_LONG_A: case EV_LONG_B: nav_back(); break;
        default: break;
    }
}

void rec_render() {
    CRGB base = bank_color();
    if (menu >= 0) {
        draw_label(FONT_3X5P, slots[bank][slot].name, 0, dim(base), true, menu_t0);
        draw_label(FONT_3X5P, MENU[menu], 7, menu == 2 ? CRGB(255, 20, 0) : base, true, menu_t0);
        for (int i = 0; i < 3; i++) disp_set(5 + i * 3, 14, i == menu ? COL_ACCENT : dim(COL_SYS));
        return;
    }
    for (int k = 0; k < SLOTS; k++) {
        int x0 = (k % 4) * 4, y0 = (k / 4) * 4;
        CRGB c = sel_color(base, k == slot);
        if (slots[bank][k].used) {
            for (int d = 0; d < 9; d++) disp_set(x0 + d % 3, y0 + d / 3, c);   // carré plein = enregistré
        } else {
            disp_set(x0 + 1, y0 + 1, c);                                       // point seul = vide
        }
    }
}

// ---------------------------------------------------------------- saisie d'un nom
// 🎓 Comme les "high scores" des bornes d'arcade : la molette fait défiler
//    l'alphabet, un clic ajoute la lettre. Pas de clavier, 2 molettes suffisent.
static const char CHARSET[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ";
#define CHARSET_N ((int)sizeof(CHARSET) - 1)

static char        name_buf[NAME_MAX + 1];
static uint8_t     name_len = 0;
static int8_t      cand = 0;   // caractère proposé (index dans CHARSET)
static const char* name_fallback = "";
static void      (*name_done)(const char*) = nullptr;

void name_open(const char* initial, const char* fallback, void (*on_done)(const char*)) {
    strlcpy(name_buf, initial, sizeof(name_buf));
    name_len = strlen(name_buf);
    name_fallback = fallback;
    name_done = on_done;
    nav_open(SCR_NAME);
}

void name_handle(const Event& ev) {
    switch (ev.type) {
        case EV_TURN_A: case EV_TURN_B:
            cand = (cand + ev.delta + CHARSET_N * 8) % CHARSET_N;
            break;
        case EV_CLICK_B:
            if (name_len < NAME_MAX) { name_buf[name_len++] = CHARSET[cand]; name_buf[name_len] = 0; }
            else toast("MAX");
            break;
        case EV_CLICK_A:
            if (name_len) name_buf[--name_len] = 0;   // effacer la dernière lettre
            break;
        case EV_CLICK_PLAY: {
            while (name_len && name_buf[name_len - 1] == ' ') name_buf[--name_len] = 0;
            nav_back();
            if (name_done) name_done(name_len ? name_buf : name_fallback);
            break;
        }
        case EV_LONG_A: case EV_LONG_B: nav_back(); break;   // annuler
        default: break;
    }
}

void name_render() {
    CRGB c = bank_color();
    // Nom en cours : s'il dépasse, on montre la fin (les dernières lettres tapées)
    int w = text_width(FONT_3X5P, name_buf);
    if (name_len) draw_text(FONT_3X5P, name_buf, w <= DISP_W ? (DISP_W - w) / 2 : DISP_W - w, 0, c);

    // Lettre proposée en grand au centre, ses voisines en faible sur les côtés
    char cur[2]  = {CHARSET[cand], 0};
    char prev[2] = {CHARSET[(cand + CHARSET_N - 1) % CHARSET_N], 0};
    char next[2] = {CHARSET[(cand + 1) % CHARSET_N], 0};
    if (cur[0] == ' ') for (int x = 5; x < 10; x++) disp_set(x, 13, COL_ACCENT);   // espace = trait
    else draw_text(FONT_5X7, cur, (DISP_W - text_width(FONT_5X7, cur)) / 2, 7, COL_ACCENT);
    draw_text(FONT_3X5, prev, 0, 8, dim(c));
    draw_text(FONT_3X5, next, 13, 8, dim(c));

    // 12 points = 12 caractères max ; le prochain clignote
    for (int i = 0; i < NAME_MAX; i++) {
        CRGB d = i < name_len ? c : dim(c);
        if (i == name_len && (millis() / 300) % 2) d = COL_ACCENT;
        disp_set(2 + i, 15, d);
    }
}
