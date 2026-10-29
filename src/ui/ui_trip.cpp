#include "ui_internal.h"

// ---------------------------------------------------------------- TRIP (visualiseur)
// 🎓 Aucune image en mémoire : la couleur de chaque LED est une FORMULE de
//    (x, y, temps). On recalcule les 256 pixels à chaque image — l'ESP32 a
//    une unité de calcul flottant (FPU), sinf/atan2f ne lui coûtent presque rien.

static const char* const MODE_NAMES[] = {"PLASMA", "TUNNEL", "MANDALA", "KALEIDO"};
#define TRIP_MODES 4

static const TProgmemRGBPalette16* const PALETTES[] = {
    &RainbowColors_p, &LavaColors_p, &OceanColors_p, &PartyColors_p, &ForestColors_p, &HeatColors_p,
};
#define TRIP_PALETTES 6

static int8_t   mode = 0, speed = 6, complexity = 3, palette = 0, zoom = 4;
static uint8_t  hue = 0;   // décale toute la palette
static uint32_t phase = 0, last_ms = 0;

// Texte brut dessiné PAR-DESSUS le visualiseur (pas de bandeau noir comme overlay/toast)
static char     label[10];
static uint32_t label_t = 0;
#define LABEL_MS 1200

static void show(const char* s) { strlcpy(label, s, sizeof(label)); label_t = millis(); }
static void show(int v)         { snprintf(label, sizeof(label), "%d", v); label_t = millis(); }

void trip_handle(const Event& ev) {
    switch (ev.type) {
        case EV_TURN_A: case EV_TURN_B:
            if (ev.shift) {   // ▶ maintenu + une molette : teinte
                hue += ev.delta * 8;
                show(hue);
            } else if (ev.type == EV_TURN_B && ev.pushed) {
                zoom = constrain(zoom + ev.delta, 1, 12);
                show(zoom);
            } else if (ev.type == EV_TURN_B) {
                palette = (palette + ev.delta + TRIP_PALETTES * 8) % TRIP_PALETTES;
                show(palette + 1);
            } else if (ev.pushed) {
                complexity = constrain(complexity + ev.delta, 1, 8);
                show(complexity);
            } else {
                speed = constrain(speed + ev.delta, 0, 20);
                show(speed);
            }
            break;
        case EV_CLICK_A: mode = (mode + 1) % TRIP_MODES; show(MODE_NAMES[mode]); break;
        case EV_CLICK_B: mode = (mode + TRIP_MODES - 1) % TRIP_MODES; show(MODE_NAMES[mode]); break;
        default: break;
    }
}

void trip_render() {
    uint32_t now = millis();
    phase += speed * min<uint32_t>(now - last_ms, 50) / 4;   // 🎓 temps "élastique" : la vitesse règle son débit
    last_ms = now;
    uint8_t t = phase >> 4, k = complexity;
    const TProgmemRGBPalette16& pal = *PALETTES[palette];
    float zf = zoom / 4.0f;   // 🎓 zoom = on multiplie les coordonnées : >1 = motif plus serré

    for (int y = 0; y < DISP_H; y++) {
        for (int x = 0; x < DISP_W; x++) {
            float dx = (x - 7.5f) * zf, dy = (y - 7.5f) * zf, fx = dx + 8, fy = dy + 8;
            float r = sqrtf(dx * dx + dy * dy);
            uint8_t a = (uint8_t)(int)(atan2f(dy, dx) * 40.74f);   // via int : float négatif → uint8 = indéfini   // angle en 0–255 (256 / 2π)
            uint8_t idx, bri = 255;
            switch (mode) {
                case 0:   // PLASMA : 4 vagues de sinus qui interfèrent
                    idx = (sin8((int)(fx * k * 6) + t) + sin8((int)(fy * k * 5) - t * 2) +
                           sin8((int)((fx + fy) * k * 3) + t) + sin8((uint8_t)(r * k * 8) - t)) / 4 + t / 2;
                    break;
                case 1: {  // TUNNEL "démo" : une texture en damier plaquée à l'intérieur d'un tube
                    // 🎓 Technique classique de la demoscene : chaque pixel lit une texture en
                    //    (u = angle, v = profondeur). Profondeur = 1/r → les cases du fond sont
                    //    minuscules, celles du bord énormes. En ajoutant le temps à v, la texture
                    //    glisse vers nous : on a l'impression d'AVANCER dans le tube.
                    uint8_t v = (uint8_t)(uint16_t)(320 / (r + 0.4f)) + (phase >> 3);
                    uint8_t u = a * k + t;                                   // k segments qui tournent
                    bool lit = ((v & 32) != 0) != ((u & 128) != 0);                        // damier anneaux × segments
                    idx = v / 2 + t;                                         // chaque anneau garde sa couleur en sortant
                    bri = scale8(lit ? 255 : 60, min(255.0f, r * 40));       // fond du tube = noir lointain
                    break;
                }
                case 2: {  // MANDALA : (k+2) branches qui pivotent + anneaux qui respirent
                    uint8_t petals = sin8(a * (k + 2) + t);
                    uint8_t rings  = sin8((uint8_t)(r * 22) - t * 2);
                    idx = (petals + rings) / 2 + t / 3;
                    bri = scale8(petals, rings) / 2 + 128;
                    break;
                }
                default: {  // KALEIDO : bruit organique replié en miroir 8×
                    uint8_t mx = x < 8 ? x : 15 - x, my = y < 8 ? y : 15 - y;
                    if (mx > my) { uint8_t s = mx; mx = my; my = s; }
                    idx = inoise8(mx * k * 18 * zf, my * k * 18 * zf, phase >> 2) * 2 + t;
                    break;
                }
            }
            disp_set(x, y, ColorFromPalette(pal, idx + hue, bri));
        }
    }
    if (millis() - label_t < LABEL_MS) draw_text_fit(FONT_3X5P, label, 5, CRGB::White, label_t);
}
