#include "ui_internal.h"

// ---------------------------------------------------------------- PONG (2 joueurs)
// Molette A = raquette gauche, molette B = raquette droite. Premier à 5.

#define PONG_PAD_H   4
#define PONG_WIN     5
#define SERVE_MS     1200

static float    px, py, pvx, pvy, pspd;
static int8_t   pad_l = 6, pad_r = 6, score_l = 0, score_r = 0;
static uint32_t serve_at = 0, pong_last = 0, flash_l = 0, flash_r = 0;
static char     score_txt[12];

static void serve(int dir) {   // dir = +1 vers la droite, -1 vers la gauche
    px = 7.5f; py = 4 + random(8);
    pspd = 7;
    pvx = dir * pspd * 0.8f;
    pvy = (random(2) ? 1 : -1) * pspd * 0.6f;
    serve_at = millis() + SERVE_MS;
}

static void point(bool left_scores) {
    left_scores ? score_l++ : score_r++;
    if (score_l >= PONG_WIN || score_r >= PONG_WIN) {
        toast(score_l > score_r ? "GAUCHE GAGNE" : "DROITE GAGNE");
        score_l = score_r = 0;
    } else {
        snprintf(score_txt, sizeof(score_txt), "%d-%d", score_l, score_r);
        toast(score_txt);
    }
    serve(left_scores ? 1 : -1);   // le perdant reçoit
}

// Rebond sur une raquette : l'angle dépend de l'endroit touché, la balle accélère.
static bool bounce(int pad) {
    if (py < pad - 0.5f || py >= pad + PONG_PAD_H + 0.5f) return false;
    pspd = min(pspd + 0.6f, 16.0f);
    float ratio = constrain((py - (pad + PONG_PAD_H / 2.0f)) / 2.4f, -0.8f, 0.8f);
    pvy = pspd * ratio;
    pvx = (pvx > 0 ? -1 : 1) * sqrtf(pspd * pspd - pvy * pvy);
    (pvx > 0 ? flash_l : flash_r) = millis() + 100;   // pvx déjà inversé : >0 = vient de la gauche
    return true;
}

void pong_handle(const Event& ev) {
    switch (ev.type) {
        case EV_TURN_A: pad_l = constrain(pad_l + ev.delta, 0, DISP_H - PONG_PAD_H); break;
        case EV_TURN_B: pad_r = constrain(pad_r + ev.delta, 0, DISP_H - PONG_PAD_H); break;
        default: break;
    }
}

void pong_render() {
    uint32_t now = millis();
    if (serve_at == 0) serve(1);
    float dt = min<uint32_t>(now - pong_last, 40) / 1000.0f;
    pong_last = now;

    if (now >= serve_at) {
        float nx = px + pvx * dt, ny = py + pvy * dt;
        if (ny < 0)       { ny = -ny; pvy = -pvy; }
        if (ny >= DISP_H) { ny = 2 * DISP_H - 0.01f - ny; pvy = -pvy; }
        py = ny;
        if (pvx < 0 && nx < 1 && px >= 1 && bounce(pad_l)) nx = 1;
        else if (pvx > 0 && nx >= 15 && px < 15 && bounce(pad_r)) nx = 14.99f;
        px = nx;
        if (px < 0) point(false);
        else if (px >= DISP_W) point(true);
    }

    for (int y = 0; y < DISP_H; y += 2) disp_set(7 + (y / 2) % 2, y, dim(COL_SYS));   // filet pointillé
    for (int i = 0; i < score_l; i++) disp_set(5 - i, 0, dim(COL_VISUAL));          // score discret en haut
    for (int i = 0; i < score_r; i++) disp_set(10 + i, 0, dim(COL_SOUND));
    for (int i = 0; i < PONG_PAD_H; i++) {
        disp_set(0, pad_l + i, now < flash_l ? CRGB::White : COL_VISUAL);
        disp_set(15, pad_r + i, now < flash_r ? CRGB::White : COL_SOUND);
    }
    // Pendant l'attente du service, la balle clignote au centre
    if (now >= serve_at || (now / 150) % 2) disp_set((int)px, (int)py, CRGB::White);
}
