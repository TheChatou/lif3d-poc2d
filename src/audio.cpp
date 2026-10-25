#include "audio.h"   // définit CONTROL_RATE — inclus avant Mozzi

#include <MozziGuts.h>
#include <Oscil.h>
#include <ADSR.h>
#include <mozzi_midi.h>
#include <tables/sin8192_int8.h>
#include <tables/triangle_warm8192_int8.h>
#include <tables/smoothsquare8192_int8.h>
#include <tables/whitenoise8192_int8.h>
#include "gol.h"
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

// 🎓 Toutes les tables d'onde ont la même taille (8192 cases) : un même
//    oscillateur peut donc changer de table à la volée (setTable) — c'est
//    comme ça qu'on change de TIMBRE sans recréer d'objets.
typedef Oscil<8192, AUDIO_RATE>        Osc;
typedef ADSR<CONTROL_RATE, AUDIO_RATE> Env;

static AudioParams P;   // réglages courants (copiés par audio_set_params)

// ============================================================================
// GAMMES — rangée Y de la grille → note MIDI
// ============================================================================
// 🎓 Une gamme = les intervalles (en demi-tons) d'UNE octave ; on la répète
//    vers l'aigu jusqu'à avoir 16 notes, une par rangée. -1 = fin de la liste.
static const int8_t SCALES[][8] = {
    {0, 1, 5, 7, 8, -1},          // JAPONAISE (Hirajoshi)
    {0, 2, 4, 7, 9, -1},          // PENTA
    {0, 3, 5, 7, 10, -1},         // PENTA MIN
    {0, 2, 4, 6, 7, 9, 11, -1},   // LYDIEN
    {0, 2, 4, 5, 7, 9, 10, -1},   // MIXOLYDIEN
    {0, 1, 4, 5, 7, 8, 10, -1},   // PHRYGIEN dominant
};
static uint8_t notes[GRID_ROWS];  // index 0 = rangée du haut = la plus aiguë

static void build_notes(int8_t shift) {
    const int8_t* sc = SCALES[min<uint8_t>(P.scale, 5)];
    int n = 0;
    while (sc[n] >= 0) n++;
    int root = 12 * (P.octave + 2) + P.tonic + shift;   // octave 2 + La = 57 (La3)
    for (int i = 0; i < GRID_ROWS; i++) {
        notes[GRID_ROWS - 1 - i] = constrain(root + 12 * (i / n) + sc[i % n], 0, 127);
    }
}

// ============================================================================
// TIMBRES — synthèse additive à 2 oscillateurs
// ============================================================================
// 🎓 Chaque note = 2 ondes superposées : la fondamentale (t1) et une
//    harmonique (t2, à `ratio` × la fréquence) dosée par w2/256. Changer de
//    table, de rapport ou de dosage change complètement la couleur du son.
//    att_mul / dec_mul (en quarts) allongent l'enveloppe pour PAD, ORGUE…
struct Timbre { const int8_t* t1; const int8_t* t2; float ratio; uint8_t w2; int8_t shift; uint8_t att_mul, dec_mul; };
static const Timbre TIMBRES[] = {
    {TRIANGLE_WARM8192_DATA, SIN8192_DATA, 2.0f, 16, 0, 1, 4},                // CRISTAL (validé en Python)
    {TRIANGLE_WARM8192_DATA, SIN8192_DATA, 2.0f, 70, 0, 1, 6},                // PIANO
    {SIN8192_DATA, SIN8192_DATA, 2.0f, 110, 0, 3, 8},                         // ORGUE
    {TRIANGLE_WARM8192_DATA, TRIANGLE_WARM8192_DATA, 1.006f, 128, 0, 12, 10}, // PAD (2 ondes désaccordées = chorus)
    {SIN8192_DATA, TRIANGLE_WARM8192_DATA, 2.0f, 50, -12, 1, 3},              // BASSE (une octave plus bas)
    {SIN8192_DATA, SIN8192_DATA, 3.93f, 60, 0, 1, 2},                         // MARIMBA (partiel ×3,93 des lames)
    {SMOOTHSQUARE8192_DATA, SIN8192_DATA, 2.0f, 40, 0, 1, 4},                 // LIBRE (carré adouci, plus "8 bits")
};

// 🎓 3 voix : en arpège, chaque note prend la voix suivante (la précédente
//    finit de résonner au lieu d'être coupée net) ; en accord, les 3 jouent
//    ensemble.
#define VOICES 3
static Osc     v1[VOICES], v2[VOICES];
static Env     venv[VOICES];
static uint8_t next_voice = 0;
static uint16_t w1 = 240, w2 = 16;
static float   ratio = 2.0f;

static void trigger_note(uint8_t row) {
    uint8_t v = next_voice;
    next_voice = (next_voice + 1) % VOICES;
    float f = mtof((float)notes[row]);
    v1[v].setFreq(f);
    v2[v].setFreq(f * ratio);
    venv[v].noteOn();
}

// ============================================================================
// REVERB — petit "Schroeder" simplifié
// ============================================================================
// 🎓 Une reverb simule les milliers de rebonds du son sur les murs d'une
//    pièce. Plutôt que de simuler chaque rebond, on utilise des "comb filters"
//    — des lignes à retard qui répètent le son et réinjectent une partie de
//    leur sortie (feedback). Plusieurs combs de longueurs premières entre
//    elles évitent un effet métallique ; un "allpass" en sortie brouille
//    encore la régularité des échos.
#define COMB1_LEN       907   // ~27.7ms à 32768Hz
#define COMB2_LEN      1153   // ~35.2ms
#define COMB3_LEN      1327   // ~40.5ms
#define COMB_FEEDBACK   180   // /256 ≈ 0.70 — plus haut = la reverb sonne plus longtemps
#define ALLPASS_LEN     225   // ~6.9ms
#define ALLPASS_GAIN    128   // /256 = 0.5

static int8_t  comb1_buf[COMB1_LEN] = {0}, comb2_buf[COMB2_LEN] = {0}, comb3_buf[COMB3_LEN] = {0};
static int8_t  allpass_buf[ALLPASS_LEN] = {0};
static uint16_t comb1_idx = 0, comb2_idx = 0, comb3_idx = 0, allpass_idx = 0;
static uint16_t reverb_mix = 77;   // /256 — dose de son "mouillé" (réglage REVERB)

// 🎓 Saturation : un int8_t qui déborde ne bloque pas à 127, il "fait le tour"
//    jusqu'à -128 → saut brutal de la forme d'onde = claquement. On calcule
//    donc en int16 puis on BLOQUE aux bornes avant de ranger dans l'int8.
static inline int8_t sat8(int16_t x) { return x > 127 ? 127 : (x < -128 ? -128 : x); }

static inline int8_t comb_filter(int8_t* buf, uint16_t len, uint16_t& idx, int8_t input) {
    int8_t delayed = buf[idx];
    buf[idx] = sat8(input + (((int16_t)delayed * COMB_FEEDBACK) >> 8));
    idx = (idx + 1 >= len) ? 0 : idx + 1;
    return delayed;
}

static inline int8_t allpass_filter(int8_t input) {
    int8_t delayed = allpass_buf[allpass_idx];
    int8_t out = sat8(delayed - (((int16_t)input * ALLPASS_GAIN) >> 8));
    allpass_buf[allpass_idx] = sat8(input + (((int16_t)delayed * ALLPASS_GAIN) >> 8));
    allpass_idx = (allpass_idx + 1 >= ALLPASS_LEN) ? 0 : allpass_idx + 1;
    return out;
}

// ============================================================================
// BOÎTE À RYTHME — 8 pistes, 5 voix
// ============================================================================
// 🎓 Les 8 pistes partagent 5 "instruments" : le charleston fermé et ouvert
//    utilisent la même voix (un ouvert est coupé par un fermé, comme sur une
//    vraie batterie), et les 3 toms se partagent une voix.
enum { TR_KICK, TR_SNARE, TR_HAT, TR_OHAT, TR_CLAP, TR_TOMH, TR_TOMM, TR_TOML };

struct Kit { uint16_t kick_dec, snare_dec, snare_hz, hat_hz; bool crush; };
static const Kit KITS[] = {
    {300, 120, 3000, 7000, false},   // 808 : kick long et grave
    {90,  70,  4400, 9000, false},   // ACOUSTIC (validé)
    {120, 80,  3500, 6000, true},    // LOFI : son "écrasé" (moins de bits)
};

static Osc kickOsc, tomOsc, snareN, hatN, clapN;
static Env kickEnv, tomEnv, snareEnv, hatEnv, clapEnv;
static uint8_t g_kick, g_tom, g_snare, g_hat, g_clap;   // volume de chaque voix (0–255)

// 🎓 Le "boum" d'un kick ou d'un tom = une chute rapide de hauteur pendant
//    l'attaque. L'enveloppe ne gère que le volume : on fait ce glissando
//    nous-mêmes, un peu à chaque tick de contrôle.
struct Glide { float from, to; uint8_t t, n; };
static Glide kickGlide = {0, 0, 0, 0}, tomGlide = {0, 0, 0, 0};

static void glide(Osc& o, Glide& g) {
    if (g.t >= g.n) return;
    g.t++;
    o.setFreq(g.from + (g.to - g.from) * g.t / g.n);
}

static uint8_t drum_step = 0;

static void fire_step(uint8_t step) {
    drum_step = step;
    const Kit& k = KITS[min<uint8_t>(P.kit, 2)];
    for (int t = 0; t < 8; t++) {
        const DrumTrack& tr = P.track[t];
        if (!(P.pattern[t] & (1UL << step)) || tr.mute) continue;
        if (random(100) >= tr.proba) continue;          // PROBA : chance que le coup sonne
        float pf = (50 + tr.pitch) / 100.0f;            // PITCH : 0,5× → 1,5×
        float df = (10 + tr.decay) / 50.0f;             // DECAY : 0,2× → 2,2×
        float tf = 0.5f + tr.tone / 120.0f;             // TONE  : plus sombre ↔ plus brillant
        // 🎓 Gain réglé pour qu'aux valeurs par défaut (80 × 60) le coup sonne à ~50 %
        //    — laisse de la marge quand kick + caisse + charleston tombent ensemble
        uint8_t g = min<uint32_t>(255, (uint32_t)tr.volume * P.drum_volume * 255 / 9600);
        switch (t) {
            case TR_KICK:
                kickGlide = {pf * (45 + 105 * tr.tone / 60.0f), 45 * pf, 0, 12};
                kickOsc.setFreq(kickGlide.from);
                kickEnv.setTimes(2, k.kick_dec * df, 0, 20);
                kickEnv.noteOn();
                g_kick = g;
                break;
            case TR_SNARE:
                snareN.setFreq(k.snare_hz * pf * tf);
                snareEnv.setTimes(2, k.snare_dec * df, 0, 40);
                snareEnv.noteOn();
                g_snare = g;
                break;
            case TR_HAT: case TR_OHAT: {
                bool open = t == TR_OHAT;
                hatN.setFreq(k.hat_hz * pf * tf);
                hatEnv.setADLevels(open ? 120 : 140, 0);
                hatEnv.setTimes(1, (open ? 220 : 25) * df, 0, open ? 30 : 10);
                hatEnv.noteOn();
                g_hat = g;
                break;
            }
            case TR_CLAP:
                clapN.setFreq(2600 * pf * tf);
                clapEnv.setTimes(1, 110 * df, 0, 20);
                clapEnv.noteOn();
                g_clap = g;
                break;
            default: {   // toms aigu / médium / grave
                static const float BASE[3] = {220, 160, 115};
                float f = BASE[t - TR_TOMH] * pf;
                tomGlide = {f * (1 + tr.tone / 200.0f), f, 0, 10};
                tomOsc.setFreq(tomGlide.from);
                tomEnv.setTimes(2, 180 * df, 0, 30);
                tomEnv.noteOn();
                g_tom = g;
            }
        }
    }
}

// ============================================================================
// SÉQUENCEUR
// ============================================================================
// 🎓 1 colonne = 1 temps (noire) = 4 doubles-croches pour la batterie.
//    Tout est compté en ticks de contrôle (CONTROL_RATE par seconde) :
//    au tick 0 d'une colonne on passe au temps suivant, puis on déclenche
//    batterie et arpège aux bons ticks.
static uint8_t          snap[2][GRID_COLS * GRID_ROWS];
static volatile uint8_t snap_idx = 0;
static volatile uint8_t cur_col = GRID_COLS - 1;   // le 1er temps atterrit sur la colonne 0
static uint8_t  beat_in_loop = 0;                  // 0..7 : position dans les 32 pas de la BOOM
static uint16_t ctrl_ticks = 0, s16_ticks = 32, col_ticks = 128, swing_ticks = 0;
static GolStepCallback golStepCb = nullptr;
static volatile bool paused = false;

// ============================================================================
// ARPÉGIATEUR — mêmes modes que le simulateur web (engine.js)
// ============================================================================
// 🎓 Un arpège = les notes d'un accord jouées UNE PAR UNE au lieu d'ensemble.
//    Ici "l'accord" = les cellules vivantes de la colonne en cours. Le MODE
//    choisit l'ordre, la VITESSE combien de notes par temps, le GROOVE
//    retarde une note sur deux (effet "swing", balancé).
enum { ARP_UP, ARP_DOWN, ARP_RAND, ARP_PING, ARP_3CE, ARP_5TE, ARP_CHORD };
static const uint8_t ARP_DIV[] = {1, 2, 3, 4, 6, 8};   // notes par temps (×3, ×6 = triolets)
#define GROOVE_PCT 35                                  // retard des notes impaires (% d'une sous-division)

static uint8_t  seq[GRID_ROWS];   // rangées Y à jouer, dans l'ordre du mode
static uint8_t  seqLen = 0;
static uint16_t arp_tick = 0;     // compteur continu d'une colonne à l'autre (Up/Ping ne repartent pas à 0)

static bool chord_mode() { return !P.arp || P.arp_mode >= ARP_3CE; }

// 🎓 Rangée 15 = la plus grave : "UP" (grave → aigu) lit donc les rangées
//    de bas en haut.
static void build_seq(uint8_t col) {
    const uint8_t* g = snap[snap_idx];
    seqLen = 0;
    for (int y = GRID_ROWS - 1; y >= 0; y--) if (g[y * GRID_COLS + col]) seq[seqLen++] = y;
    if (!seqLen) return;
    uint8_t mode = P.arp ? P.arp_mode : ARP_CHORD;
    if (mode == ARP_DOWN) {
        for (uint8_t i = 0; i < seqLen / 2; i++) { uint8_t t = seq[i]; seq[i] = seq[seqLen - 1 - i]; seq[seqLen - 1 - i] = t; }
    } else if (mode == ARP_RAND || mode == ARP_CHORD) {
        // 🎓 Mélange de Fisher-Yates : chaque ordre a la même chance de sortir.
        //    En ACCORD, ça choisit au hasard QUELLES notes jouent quand il y en
        //    a plus que de voix.
        for (int i = seqLen - 1; i > 0; i--) { uint8_t j = random(i + 1), t = seq[i]; seq[i] = seq[j]; seq[j] = t; }
    } else if (mode == ARP_3CE || mode == ARP_5TE) {
        // 🎓 Note de référence = la plus grave allumée, + SA tierce (ou quinte)
        //    si elle est allumée aussi dans la colonne. Sinon elle joue seule.
        static const int8_t IV[2][3] = {{4, 3, -1}, {7, 6, 8}};
        uint8_t ref = seq[0];
        for (uint8_t k = 0; k < 3 && seqLen > 1; k++) {
            int8_t iv = IV[mode - ARP_3CE][k];
            if (iv < 0) break;
            for (uint8_t i = 1; i < seqLen; i++) {
                if ((notes[seq[i]] - notes[ref]) % 12 == iv) { seq[1] = seq[i]; seqLen = 2; goto done; }
            }
        }
        seqLen = 1;
        done:;
    }
}

// Une sous-division d'arpège : une note (UP/DOWN/RAND/PING) ou tout l'accord
static void arp_fire() {
    if (!seqLen) return;
    if (chord_mode()) {
        for (uint8_t i = 0; i < min<uint8_t>(seqLen, VOICES); i++) trigger_note(seq[i]);
    } else if (P.arp_mode == ARP_PING && seqLen > 1) {
        uint16_t cycle = (seqLen - 1) * 2, pos = arp_tick % cycle;   // 0 1 2 1 0 1 2…
        trigger_note(seq[pos < seqLen ? pos : cycle - pos]);
    } else {
        trigger_note(seq[arp_tick % seqLen]);
    }
    arp_tick++;
}

// 🎓 GoL avancé AVANT de lire les notes : le son joue la génération que
//    les LEDs affichent.
static void advance_beat() {
    cur_col = (cur_col + 1) % GRID_COLS;
    beat_in_loop = (beat_in_loop + 1) % 8;
    if (golStepCb) golStepCb();
    build_seq(cur_col);
}

// ============================================================================
// API
// ============================================================================
static uint16_t last_att = 0, last_dec = 0;
static uint8_t  last_lvl = 0, last_timbre = 255;

// 🎓 Appelée UNIQUEMENT depuis la tâche audio (cœur 0) : c'est elle seule qui
//    touche aux oscillateurs et aux enveloppes.
static void apply_params(const AudioParams& p) {
    P = p;
    uint8_t bpm = constrain(P.bpm, 20, 240);
    s16_ticks   = max(2, (CONTROL_RATE * 60 / 4 + bpm / 2) / bpm);   // ticks par double-croche (arrondi)
    col_ticks   = s16_ticks * 4;
    swing_ticks = s16_ticks * min<uint8_t>(P.swing, 100) / 200;      // au max une demi double-croche
    reverb_mix  = (uint16_t)min<uint8_t>(P.reverb, 100) * 256 / 100;

    const Timbre& t = TIMBRES[min<uint8_t>(P.timbre, 6)];
    ratio = t.ratio;
    w2 = t.w2;
    w1 = 256 - t.w2;
    build_notes(t.shift);
    if (P.timbre != last_timbre) {
        for (int v = 0; v < VOICES; v++) { v1[v].setTable(t.t1); v2[v].setTable(t.t2); }
        last_timbre = P.timbre;
    }
    // 🎓 On ne retouche l'enveloppe que si elle a changé (appelé 50×/s par l'UI)
    uint16_t att = max<uint8_t>(2, P.attack) * t.att_mul;
    uint16_t dec = (50 + P.decay * 8) * t.dec_mul / 4;
    uint8_t  lvl = chord_mode() ? 80 : 115;   // en accord, 3 notes ensemble → chacune moins fort
    if (att != last_att || dec != last_dec || lvl != last_lvl) {
        for (int v = 0; v < VOICES; v++) { venv[v].setADLevels(lvl, 0); venv[v].setTimes(att, dec, 0, 50); }
        last_att = att; last_dec = dec; last_lvl = lvl;
    }
}

// 🎓 BOÎTE AUX LETTRES entre les 2 cœurs : l'interface (cœur 1) dépose les
//    réglages ici, la tâche audio (cœur 0) les récupère à son prochain tick
//    de contrôle. Le "spinlock" (portMUX) empêche qu'un cœur lise le paquet
//    pendant que l'autre est en train de l'écrire (réglages à moitié neufs).
static portMUX_TYPE  params_mux = portMUX_INITIALIZER_UNLOCKED;
static AudioParams   pending;
static volatile bool pending_dirty = false;

void audio_set_params(const AudioParams& p) {
    portENTER_CRITICAL(&params_mux);
    pending = p;
    pending_dirty = true;
    portEXIT_CRITICAL(&params_mux);
}

// 🎓 TÂCHE AUDIO, seule sur le cœur 0. Mozzi prépare le son d'avance dans
//    un tampon DMA de 256 échantillons (7,8 ms). Chaque audioHook() calcule
//    UN échantillon s'il reste de la place. Avant, c'était loop() qui
//    l'appelait, et FastLED.show() (~8 ms) la bloquait assez longtemps pour
//    vider le tampon → trous dans le son = crachement 50×/s.
//    Ici : une rafale d'appels (assez pour remplir le tampon), puis on dort
//    1 ms (vTaskDelay) pour laisser tourner la tâche "idle" du cœur, sinon le
//    chien de garde (watchdog) redémarre l'ESP32.
#define AUDIO_BURST 128   // > 33 échantillons consommés par ms à 32 768 Hz

static void audio_task(void*) {
    for (;;) {
        for (int i = 0; i < AUDIO_BURST; i++) audioHook();
        vTaskDelay(1);
    }
}

void audio_init() {
    kickOsc.setTable(SIN8192_DATA);
    tomOsc.setTable(SIN8192_DATA);
    snareN.setTable(WHITENOISE8192_DATA);
    hatN.setTable(WHITENOISE8192_DATA);
    clapN.setTable(WHITENOISE8192_DATA);
    kickEnv.setADLevels(255, 0);
    tomEnv.setADLevels(220, 0);
    snareEnv.setADLevels(200, 60);
    clapEnv.setADLevels(180, 0);
    apply_params(P);   // calcule tempo, gamme, timbre à partir des valeurs par défaut
    startMozzi(CONTROL_RATE);
    xTaskCreatePinnedToCore(audio_task, "audio", 4096, nullptr, 2, nullptr, 0);
}

void audio_grid_update(const uint8_t* grid) {
    uint8_t w = 1 - snap_idx;
    memcpy(snap[w], grid, GRID_COLS * GRID_ROWS);
    snap_idx = w;
}

void audio_set_gol_step_callback(GolStepCallback cb) { golStepCb = cb; }
uint8_t audio_current_col() { return cur_col; }
uint8_t audio_drum_step() { return drum_step; }
void audio_toggle_pause() { paused = !paused; }
bool audio_is_paused() { return paused; }

// 🎓 Volume en "fixed-point" /256 : multiplier puis décaler de 8 bits (>> 8)
//    revient à multiplier par master_vol/256, sans calcul à virgule (lent)
//    dans updateAudio(), appelée 32 768 fois par seconde.
static volatile uint16_t master_vol = 256;

void audio_set_volume(uint8_t percent) {
    master_vol = (uint16_t)min<uint8_t>(percent, 100) * 256 / 100;
}

void updateControl() {
    if (pending_dirty) {
        AudioParams p;
        portENTER_CRITICAL(&params_mux);
        p = pending;
        pending_dirty = false;
        portEXIT_CRITICAL(&params_mux);
        apply_params(p);
    }
    // 🎓 update() fait AVANCER chaque enveloppe d'une phase à l'autre
    //    (attaque → déclin → silence) ; sans lui, elle resterait bloquée.
    for (int v = 0; v < VOICES; v++) venv[v].update();
    kickEnv.update(); tomEnv.update(); snareEnv.update(); hatEnv.update(); clapEnv.update();
    glide(kickOsc, kickGlide);
    glide(tomOsc, tomGlide);

    if (paused) return;   // 🎓 séquenceur figé : ni nouveau temps, ni nouvelle note

    if (ctrl_ticks == 0) advance_beat();
    // 4 doubles-croches par temps ; les impaires sont retardées par le SWING
    for (uint8_t sub = 0; sub < 4; sub++) {
        uint16_t at = sub * s16_ticks + ((sub & 1) ? swing_ticks : 0);
        if (ctrl_ticks == at) fire_step((beat_in_loop * 4 + sub) % 32);
    }
    // 🎓 Le temps est coupé en `div` parts égales ; ARPEGE OFF = un seul
    //    accord par temps. GROOVE : les sous-divisions impaires sont retardées.
    uint8_t  div = P.arp ? ARP_DIV[min<uint8_t>(P.arp_div, 5)] : 1;
    uint16_t sub = col_ticks / div;
    uint16_t groove = P.arp_groove ? sub * GROOVE_PCT / 100 : 0;
    for (uint8_t k = 0; k < div; k++)
        if (ctrl_ticks == k * col_ticks / div + ((k & 1) ? groove : 0)) arp_fire();
    if (++ctrl_ticks >= col_ticks) ctrl_ticks = 0;
}

// 🎓 Écrêtage doux : linéaire jusqu'à ±64, puis la courbe se tasse et
//    s'approche de ±127 sans jamais l'atteindre brutalement. Les crêtes sont
//    arrondies (son "chaud", façon ampli à lampes) au lieu d'être coupées
//    à angle droit (grésillement plein d'harmoniques aiguës).
static inline int32_t soft_clip(int32_t x) {
    int32_t a = x < 0 ? -x : x;
    if (a > 64) { int32_t e = a - 64; a = 64 + 63 * e / (e + 63); }
    return x < 0 ? -a : a;
}

int updateAudio() {
    int32_t dry = 0;
    if (!paused) {
        for (int v = 0; v < VOICES; v++) {
            if (!venv[v].playing()) continue;
            int32_t m = ((int32_t)v1[v].next() * w1 + (int32_t)v2[v].next() * w2) >> 8;
            dry += (m * venv[v].next()) >> 8;
        }
    }
    dry = constrain(dry, -127, 127);

    // 🎓 La reverb tourne TOUJOURS, même sans note : sinon sa queue de
    //    résonance se couperait net au lieu de s'éteindre doucement.
    //    On ne lui envoie que la moitié du son sec : ses boucles amplifient
    //    jusqu'à ~×3 un son tenu, il lui faut de la place.
    int8_t rev_in = (int8_t)(dry / 2);
    int16_t wet = (int16_t)comb_filter(comb1_buf, COMB1_LEN, comb1_idx, rev_in)
                + (int16_t)comb_filter(comb2_buf, COMB2_LEN, comb2_idx, rev_in)
                + (int16_t)comb_filter(comb3_buf, COMB3_LEN, comb3_idx, rev_in);
    wet = allpass_filter((int8_t)(wet / 3));

    // 🎓 Percussions hors reverb (volontairement "sèches") : attaques nettes
    int32_t drums = 0;
    if (!paused) {
        drums += (((int32_t)kickOsc.next() * kickEnv.next() >> 8) * g_kick) >> 8;
        drums += (((int32_t)tomOsc.next()  * tomEnv.next()  >> 8) * g_tom)  >> 8;
        drums += (((int32_t)snareN.next()  * snareEnv.next() >> 8) * g_snare) >> 8;
        drums += (((int32_t)hatN.next()    * hatEnv.next()  >> 8) * g_hat)  >> 8;
        drums += (((int32_t)clapN.next()   * clapEnv.next() >> 8) * g_clap) >> 8;
        if (KITS[min<uint8_t>(P.kit, 2)].crush) drums &= ~0x0F;   // 🎓 LOFI : on jette les 4 bits fins
    }

    // 🎓 Marge (headroom) : on divise la somme par 2 avant la sortie, puis
    //    écrêtage DOUX au lieu de raser net les crêtes.
    int32_t out = soft_clip((dry + ((wet * (int32_t)reverb_mix) >> 8) + drums) / 2);
    return (out * master_vol) >> 8;
}
