#pragma once
#include <Arduino.h>
#include <FastLED.h>

// 🎓 Une police pixel = un tableau de "glyphes". Chaque glyphe stocke sa
//    largeur et ses lignes sous forme de bits : 1 bit = 1 LED.
//    Exemple, le "A" en 3×5 :   .#.  → 0b010_00000 = 0x40
//                               #.#  → 0b101_00000 = 0xA0 ...
//    Le bit de poids fort (0x80) = la LED la plus à gauche.
//    Les tables sont générées par tools/gen_fonts.py (ne pas les éditer à la main).

struct Glyph {
    char    c;
    uint8_t w;        // largeur en LEDs (variable pour les polices proportionnelles)
    uint8_t rows[7];  // jusqu'à 7 lignes de haut
};

struct Font {
    uint8_t      h;      // hauteur en LEDs
    uint8_t      count;
    const Glyph* glyphs;
};

extern const Font FONT_3X5;   // police par défaut (largeur fixe)
extern const Font FONT_3X5P;  // 3×5 proportionnelle (I étroit, M/N/W larges)
extern const Font FONT_3X4;   // la plus petite, pour 3 lignes de texte
extern const Font FONT_4X6;   // grands chiffres (+ D pour le logo)
extern const Font FONT_5X7;   // police "enseigne LED", la plus lisible
extern const Font LOGO_KERN;  // L et I resserrés : "LIF2D" tient en 16 LEDs

// Largeur totale d'un texte (1 LED d'espace entre les lettres).
int text_width(const Font& f, const char* s);

// Dessine un texte à (x, y) ; ce qui sort de l'écran est simplement coupé.
// `alt` (optionnel) est consulté en premier : sert à mélanger 2 polices (logo).
int draw_text(const Font& f, const char* s, int x, int y, CRGB color, const Font* alt = nullptr);

// Centré horizontalement s'il tient, sinon défilement droite → gauche en boucle.
// `t0_ms` = instant où le texte est apparu (le défilement part de là).
void draw_text_fit(const Font& f, const char* s, int y, CRGB color, uint32_t t0_ms);
