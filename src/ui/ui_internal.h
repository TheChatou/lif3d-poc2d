#pragma once
// Shared state between the UI modules (not for use outside src/ui/).
#include <Arduino.h>
#include <FastLED.h>
#include "display.h"
#include "fonts.h"
#include "input.h"

// 🎓 Une "machine à états" : l'interface est TOUJOURS dans un seul écran à la
//    fois. Chaque écran a 2 fonctions : handle() (réagit aux événements) et
//    render() (dessine). Changer d'écran = changer la valeur de `current`.
enum Screen : uint8_t {
    SCR_BOOT, SCR_HUB, SCR_GOL, SCR_DRAW, SCR_BOOM, SCR_REC, SCR_PAGE, SCR_CONFIRM, SCR_DIAG
};

enum PageId : uint8_t { PAGE_SET_AUDIO, PAGE_SET_GOL, PAGE_SET_BOOM, PAGE_SYS, PAGE_TRACK, PAGE_COUNT };
enum RecBank : uint8_t { BANK_GOL, BANK_BOOM, BANK_AUDIO };

// Variantes à comparer en direct depuis SYS
enum BootStyle : int16_t { BOOT_TEXT, BOOT_LOGO };
enum HubStyle  : int16_t { HUB_TWO_LEVELS, HUB_FLAT };
enum SelStyle  : int16_t { SEL_BRIGHT, SEL_BLINK, SEL_COLOR };

// Tous les réglages (valeurs factices : ce firmware ne joue pas de son)
struct Settings {
    int16_t bpm = 60, scale = 0, tonic = 9, octave = 3, timbre = 0, arp = 0, reverb = 30, boom_vol = 75;
    int16_t attack = 15, decay = 40;
    int16_t rule = 0, evolution = 3, loop_on = 0, loop_len = 1, loop_mode = 0, symmetry = 0, density = 30, palette = 0;
    int16_t kit = 0, swing = 0, boom_master = 80;
    int16_t boot_style = BOOT_LOGO, hub_style = HUB_TWO_LEVELS, sel_style = SEL_BRIGHT, brightness = 20;
    int16_t volume = 70;      // molette droite en live
    bool    playing = true;
};
extern Settings cfg;

// Couleurs par domaine (à affiner)
extern const CRGB COL_VISUAL;   // ambre — GOL / dessin
extern const CRGB COL_SOUND;    // cyan  — audio
extern const CRGB COL_BOOM;     // orange — boîte à rythme
extern const CRGB COL_SYS;      // blanc
extern const CRGB COL_ACCENT;   // sélection en mode "couleur"
extern const CRGB TRACK_COLORS[8];
extern const char* const TRACK_NAMES[8];

// ---- navigation (ui.cpp)
void nav_open(Screen s, uint8_t arg = 0);   // empile l'écran courant puis ouvre s
void nav_back();                            // appui long : remonte d'un niveau
uint32_t screen_age_ms();                   // temps depuis l'entrée dans l'écran
void toast(const char* msg);                // message plein écran ~0,9 s
CRGB sel_color(CRGB base, bool selected);   // applique le style de sélection choisi dans SYS
void draw_label(const Font& f, const char* s, int y, CRGB c, bool may_scroll, uint32_t t0);

// ---- pages de réglages + confirmation (ui_pages.cpp)
void page_open(uint8_t page_id, uint8_t track = 0);
void page_handle(const Event& ev);
void page_render();
void confirm_open(const char* question, void (*on_yes)());
void confirm_handle(const Event& ev);
void confirm_render();

// ---- écrans live (ui_live.cpp) et BOOM / REC / DIAG (ui_boom.cpp)
void live_init();
void live_tick();               // horloge commune (tête de lecture, générations)
void gol_handle(const Event& ev);   void gol_render();
void draw_handle(const Event& ev);  void draw_render();
void boom_handle(const Event& ev);  void boom_render();
void rec_open(uint8_t bank);
void rec_handle(const Event& ev);   void rec_render();
void diag_handle(const Event& ev);  void diag_render();
void overlay_render();          // barre de volume / valeur temporaire par-dessus le live
void overlay_show(const char* label, int value, int max);
