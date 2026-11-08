#pragma once
#include <stdint.h>
#include <math.h>

// 🎓 Étage de sortie du son, sans dépendance à Mozzi (testable sur PC) :
//    filtre passe-bas résonant → limiteur → dither + noise shaping → 8 bits.
//    Tout le mixage travaille en "16 bits" (échelle ×256 des anciennes
//    valeurs ±127) : on garde les "décimales" jusqu'au dernier moment, et on
//    n'arrondit en 8 bits qu'une seule fois, à la toute fin, proprement.

// ---------------------------------------------------------------- filtre
// 🎓 Filtre à variables d'état (Chamberlin) : 2 mémoires (low, band), il
//    sort un passe-bas 12 dB/octave. La RÉSONANCE fait "siffler" doucement
//    les fréquences autour de la coupure : c'est le son typique d'un synthé.
//    f et q en virgule fixe /1024. Calculés hors de la boucle audio (float).
struct LowPass {
    int32_t low = 0, band = 0, f = 1024, q = 1024;
    bool    on = false;

    // cutoff 0..100 (100 = filtre ouvert, donc contourné), reso 0..100
    void set(uint8_t cutoff, uint8_t reso, float rate) {
        on = cutoff < 100;
        if (!on) { low = band = 0; return; }
        float fc = 150.0f * powf(5000.0f / 150.0f, cutoff / 100.0f);   // 150 Hz → 5 kHz, réparti à l'oreille
        f = (int32_t)(2.0f * sinf(3.14159265f * fc / rate) * 1024);
        float Q = 0.7f + reso * 0.033f;                                 // 0,7 (neutre) → 4 (sifflant)
        q = (int32_t)(1024 / Q);
    }

    int32_t process(int32_t x) {
        if (!on) return x;
        x >>= 2;                                       // marge : la résonance amplifie
        low += (f * band) >> 10;
        int32_t high = x - low - ((q * band) >> 10);
        band += (f * high) >> 10;
        if (band > (1 << 20)) band = 1 << 20;          // garde-fou : jamais de débordement
        if (band < -(1 << 20)) band = -(1 << 20);
        return low << 2;
    }
};

// ---------------------------------------------------------------- limiteur
// 🎓 Comme sur une table de mixage : si la somme dépasse le plafond, on
//    baisse le volume tout de suite (attaque instantanée), puis on le
//    remonte doucement (~0,25 s). Plus jamais d'écrêtage quand ça s'empile.
#define LIM_CEIL  (112 << 8)    // plafond (marge sous ±127, en échelle ×256)
#define LIM_ONE   1024          // gain 1.0 en virgule fixe (/1024)

struct Limiter {
    int32_t gain = LIM_ONE;
    uint8_t tick = 0;

    int32_t process(int32_t x) {
        int32_t a = x < 0 ? -x : x;
        if (gain < LIM_ONE && (++tick & 15) == 0) gain++;   // remontée : +1 tous les 16 échantillons
        if ((int64_t)a * gain > (int64_t)LIM_CEIL * LIM_ONE) gain = (int32_t)((int64_t)LIM_CEIL * LIM_ONE / a);
        return (int32_t)((int64_t)x * gain / LIM_ONE);   // division (et pas >>) : arrondi vers 0, jamais au-delà du plafond
    }
};

// ---------------------------------------------------------------- dither
// 🎓 DITHER : avant d'arrondir en 8 bits, on ajoute un bruit minuscule
//    (±1 marche). L'erreur d'arrondi devient un léger souffle régulier au
//    lieu d'une distorsion "granuleuse" (très audible sur les fins de notes
//    et la queue de reverb).
//    NOISE SHAPING : on soustrait l'erreur de l'échantillon précédent →
//    le bruit est repoussé vers les aigus, là où l'oreille l'entend moins.
//    Silence total (x == 0) → on sort 0 : pas de souffle quand rien ne joue.
struct Dither {
    int32_t  err = 0;
    uint32_t rng = 2463534242u;

    int8_t process(int32_t x, bool enabled) {
        if (x == 0) { err = 0; return 0; }
        if (!enabled) {
            int32_t q = (x + 128) >> 8;
            return (int8_t)(q > 127 ? 127 : (q < -128 ? -128 : q));
        }
        rng ^= rng << 13; rng ^= rng >> 17; rng ^= rng << 5;          // 🎓 xorshift : hasard ultra-rapide
        int32_t d = (int32_t)(rng & 0xFF) - (int32_t)((rng >> 8) & 0xFF);   // TPDF : ±1 marche, en triangle
        int32_t s = x - err;
        int32_t q = (s + d + 128) >> 8;
        if (q > 127) q = 127;
        if (q < -128) q = -128;
        err = (q << 8) - s;
        return (int8_t)q;
    }
};
