#include "fonts.h"
#include "display.h"
#include "font_data.h"

#define SCROLL_STEP_MS   90   // vitesse de défilement : 1 colonne toutes les 90 ms
#define SCROLL_PAUSE_MS 800   // pause au début avant de partir
#define SCROLL_GAP        6   // LEDs vides entre la fin du mot et sa répétition

static const Glyph* find_glyph(const Font& f, char c) {
    if (c >= 'a' && c <= 'z') c -= 32;  // 🎓 les polices n'ont que des majuscules
    for (uint8_t i = 0; i < f.count; i++) {
        if (f.glyphs[i].c == c) return &f.glyphs[i];
    }
    return nullptr;
}

// 🎓 Repli : si une police n'a pas le caractère (ex : lettres en 4×6),
//    on prend celui de la 3×5 plutôt que de ne rien afficher.
static const Glyph* resolve(const Font& f, char c, const Font* alt) {
    const Glyph* g = alt ? find_glyph(*alt, c) : nullptr;
    if (!g) g = find_glyph(f, c);
    if (!g) g = find_glyph(FONT_3X5, c);
    return g;
}

int text_width(const Font& f, const char* s) {
    int w = 0;
    for (const char* p = s; *p; p++) {
        const Glyph* g = resolve(f, *p, nullptr);
        if (g) w += g->w + (p[1] ? 1 : 0);
    }
    return w;
}

int draw_text(const Font& f, const char* s, int x, int y, CRGB color, const Font* alt) {
    for (const char* p = s; *p; p++) {
        const Glyph* g = resolve(f, *p, alt);
        if (!g) continue;
        for (uint8_t row = 0; row < f.h; row++) {
            uint8_t bits = g->rows[row];
            for (uint8_t col = 0; col < g->w; col++) {
                if (bits & (0x80 >> col)) disp_set(x + col, y + row, color);
            }
        }
        x += g->w + 1;
    }
    return x;
}

void draw_text_fit(const Font& f, const char* s, int y, CRGB color, uint32_t t0_ms) {
    int w = text_width(f, s);
    if (w <= DISP_W) {
        draw_text(f, s, (DISP_W - w) / 2, y, color);
        return;
    }
    // 🎓 Défilement : on calcule un décalage à partir du temps écoulé, puis on
    //    dessine le mot 2 fois à la suite (avec un trou) pour boucler sans saut.
    uint32_t elapsed = millis() - t0_ms;
    int offset = 0;
    if (elapsed > SCROLL_PAUSE_MS) {
        offset = ((elapsed - SCROLL_PAUSE_MS) / SCROLL_STEP_MS) % (w + SCROLL_GAP);
    }
    draw_text(f, s, -offset, y, color);
    draw_text(f, s, -offset + w + SCROLL_GAP, y, color);
}
