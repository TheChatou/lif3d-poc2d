#include "ui_internal.h"

// ---------------------------------------------------------------- BRICK (casse-brique)
// 🎓 La balle vit en coordonnées FLOTTANTES (x = 7.32) et se déplace selon sa
//    vitesse × temps écoulé : le mouvement est fluide même si l'écran n'a que
//    16 positions. On arrondit seulement au moment d'allumer la LED.

#define PAD_W        4
#define PAD_Y        15
#define BRICK_Y0     2      // première rangée de briques
#define MAX_ROWS     5
#define N_SPARKS     24

struct Spark { float x, y, vx, vy; int16_t life; CRGB c; };

static uint16_t bricks[MAX_ROWS];   // 🎓 1 bit = 1 brique (16 colonnes = 16 bits)
static Spark    sparks[N_SPARKS];
static float    bx, by, vx, vy, spd;
static int8_t   pad = 6, lives = 3, level = 1;
static bool     stuck = true, inited = false;
static uint32_t last_ms, shake_until, flash_until, pad_flash_until, win_until;

static uint8_t rows() { return min(2 + level, MAX_ROWS); }

static void refill() {
    for (int r = 0; r < MAX_ROWS; r++) bricks[r] = r < rows() ? 0xFFFF : 0;
    stuck = true;
    spd = 6 + level * 1.5f;   // cases / seconde
}

static int bricks_left() {
    int n = 0;
    for (int r = 0; r < MAX_ROWS; r++) n += __builtin_popcount(bricks[r]);   // 🎓 compte les bits à 1
    return n;
}

static void burst(float x, float y, CRGB c, int n) {
    for (int i = 0; i < N_SPARKS && n > 0; i++) {
        if (sparks[i].life > 0) continue;
        float ang = random(628) / 100.0f, v = 3 + random(60) / 10.0f;
        sparks[i] = {x, y, cosf(ang) * v, sinf(ang) * v, (int16_t)(300 + random(400)), c};
        n--;
    }
}

static void set_angle(float vx_ratio) {   // vx_ratio ∈ [-0.85, 0.85], vy toujours vers le haut
    vx = spd * vx_ratio;
    vy = -sqrtf(spd * spd - vx * vx);
}

void brick_handle(const Event& ev) {
    switch (ev.type) {
        case EV_TURN_A: case EV_TURN_B: pad = constrain(pad + ev.delta, 0, DISP_W - PAD_W); break;
        case EV_CLICK_A: case EV_CLICK_B:
            if (stuck && millis() > win_until) { stuck = false; set_angle(random(-50, 51) / 100.0f); }
            break;
        default: break;
    }
}

static void step(float dt) {
    float last = bricks_left() == 1 ? 1.4f : 1.0f;   // la dernière brique rend la balle nerveuse
    float nx = bx + vx * dt * last, ny = by + vy * dt * last;
    if (nx < 0)       { nx = -nx; vx = -vx; }
    if (nx >= DISP_W) { nx = 2 * DISP_W - 0.01f - nx; vx = -vx; }
    if (ny < 0)       { ny = -ny; vy = -vy; }

    int cx = (int)nx, r = (int)ny - BRICK_Y0;
    if (r >= 0 && r < MAX_ROWS && (bricks[r] & (1 << cx))) {
        bricks[r] &= ~(1 << cx);
        vy = -vy;
        ny = by;
        burst(cx + 0.5f, ny, CHSV(r * 45, 255, 255), 6);
        spd = min(spd + 0.15f, 15.0f);
    }

    if (vy > 0 && ny >= PAD_Y && by < PAD_Y) {
        if (nx >= pad - 0.5f && nx < pad + PAD_W + 0.5f) {
            set_angle(constrain((nx - (pad + PAD_W / 2.0f)) / 2.4f, -0.85f, 0.85f));   // 🎓 bord = angle fort
            ny = PAD_Y - 0.01f;
            pad_flash_until = millis() + 120;
        }
    }
    bx = nx; by = ny;

    if (by >= DISP_H) {   // balle perdue
        shake_until = flash_until = millis() + 350;
        burst(bx, DISP_H - 1, CRGB::Red, 10);
        stuck = true;
        if (--lives <= 0) { toast("GAME OVER"); lives = 3; level = 1; refill(); }
    }
    if (bricks_left() == 0) {
        for (int i = 0; i < 4; i++) burst(3 + random(10), 3 + random(8), CHSV(random8(), 255, 255), 6);
        win_until = millis() + 1500;
        level++;
        refill();
    }
}

void brick_render() {
    uint32_t now = millis();
    if (!inited) { inited = true; last_ms = now; refill(); }
    float dt = min<uint32_t>(now - last_ms, 40) / 1000.0f;   // retour au jeu après une pause : pas de saut
    last_ms = now;

    if (stuck) { bx = pad + PAD_W / 2.0f; by = PAD_Y - 0.5f; }
    else step(dt);

    int ox = 0, oy = 0;
    if (now < shake_until) { ox = random(-1, 2); oy = random(-1, 2); }   // tremblement d'écran
    if (now < flash_until)
        for (int y = 0; y < DISP_H; y++) for (int x = 0; x < DISP_W; x++) disp_set(x, y, CRGB(60, 0, 0));
    if (now < win_until)   // feu d'artifice : relance des étincelles pendant la fête
        if (random8() < 40) burst(2 + random(12), 2 + random(10), CHSV(random8(), 255, 255), 5);

    for (int i = 0; i < lives; i++) disp_set(i * 2 + ox, 0 + oy, CRGB(120, 0, 0));
    for (int r = 0; r < MAX_ROWS; r++)
        for (int x = 0; x < DISP_W; x++)
            if (bricks[r] & (1 << x)) disp_set(x + ox, BRICK_Y0 + r + oy, CHSV(r * 45, 255, (x % 2) ? 255 : 180));

    for (Spark& s : sparks) {
        if (s.life <= 0) continue;
        s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 9 * dt;   // 🎓 un soupçon de gravité
        s.life -= dt * 1000;
        CRGB c = s.c;
        c.nscale8(min(255, s.life / 2));
        disp_set((int)s.x + ox, (int)s.y + oy, c);
    }

    CRGB pc = now < pad_flash_until ? CRGB::White : COL_VISUAL;
    for (int i = 0; i < PAD_W; i++) disp_set(pad + i + ox, PAD_Y + oy, pc);
    CRGB ball = bricks_left() == 1 ? CRGB(CHSV(now / 4, 255, 255)) : CRGB::White;
    disp_set((int)bx + ox, (int)by + oy, ball);
}
