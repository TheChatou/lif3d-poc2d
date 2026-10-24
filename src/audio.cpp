#include "audio.h"   // définit CONTROL_RATE et TICKS_PER_COL — inclus avant Mozzi

#include <MozziGuts.h>
#include <Oscil.h>
#include <tables/sin2048_int8.h>
#include <tables/triangle_warm8192_int8.h>
#include <tables/whitenoise8192_int8.h>
#include <ADSR.h>
#include <mozzi_midi.h>
#include "gol.h"

// 🎓 Gamme pentatonique mineure (SCALE_PENTA_MINOR du CLAUDE.md : [0,3,5,7,10]
//    répété par octave), racine La (57). index 0 = note la plus aiguë (rangée
//    du haut de la grille), index 15 = la plus grave (rangée du bas).
static const uint8_t SCALE[GRID_ROWS] = {
    93, 91, 88, 86, 84,
    81, 79, 76, 74, 72,
    69, 67, 64, 62, 60, 57
};

static uint8_t          snap[2][GRID_COLS * GRID_ROWS];
static volatile uint8_t snap_idx = 0;

// 🎓 Synthèse additive "cloche de cristal" (validée en Python) : on ne joue
//    pas un seul sinus, mais 4 sinus superposés à des fréquences multiples
//    de la fondamentale (harmoniques), avec un poids qui décroît à chaque
//    harmonique — c'est ce mélange qui donne un timbre riche.
//
// 🎓 Une seule voix (mono) : l'arpège joue les notes l'une après l'autre,
//    jamais en même temps — pas besoin de plusieurs oscillateurs/enveloppes
//    en parallèle. Chaque nouvelle note redémarre l'enveloppe (noteOn), ce
//    qui coupe net la précédente : c'est le son typique d'un arpeggiator.
// 🎓 Table d'onde différente = timbre différent, même sans toucher aux
//    harmoniques. "triangle_warm" a un contenu en harmoniques impairs
//    (comme un triangle classique) mais lissé pour ne pas sonner criard —
//    plus de caractère qu'un sinus pur, sans retomber dans le problème
//    "criard" du DAC 8 bits.
static Oscil<TRIANGLE_WARM8192_NUM_CELLS, AUDIO_RATE> osc1(TRIANGLE_WARM8192_DATA); // fondamentale — 94%
static Oscil<SIN2048_NUM_CELLS, AUDIO_RATE>           osc2(SIN2048_DATA);           // 2e harmonique — 6%, garde un sinus pur pour le "shimmer"
static ADSR<CONTROL_RATE, AUDIO_RATE>       env;

// Poids des harmoniques en fixed-point /256 (0.94, 0.06 × 256)
// 🎓 3e/4e harmonique retirées : c'est ce qui rendait le son "criard" sur le
//    DAC 8 bits de l'ESP32 — les fréquences plus hautes sont celles où la
//    faible résolution du DAC (256 niveaux) et les petits HP 28mm s'entendent
//    le plus. Un fondamental quasi pur + un soupçon de 2e harmonique sonne
//    plus rond, moins agressif.
#define HARM1_W 240
#define HARM2_W 16

// ============================================================================
// REVERB — petit "Schroeder" simplifié
// ============================================================================
// 🎓 Une reverb simule les milliers de rebonds du son sur les murs d'une
//    pièce. Techniquement irréaliste de simuler chaque rebond un par un : à
//    la place, on utilise des "comb filters" — des lignes à retard qui
//    répètent le son avec un léger délai ET réinjectent une partie de leur
//    propre sortie en entrée (feedback). Résultat : une rafale d'échos très
//    rapprochés qui se chevauchent, perçue comme une résonance continue
//    plutôt que des échos distincts. Plusieurs combs de longueurs différentes
//    (nombres premiers entre eux, pour que leurs échos ne retombent jamais
//    en phase) évitent un effet "métallique"/répétitif. Un filtre "allpass"
//    en sortie (déphase sans changer le volume) brouille encore la
//    régularité des échos pour un son plus doux, moins mécanique.
#define REVERB_MIX       70   // /256 — dose de son "mouillé" mélangée au son direct

#define COMB1_LEN       907   // ~27.7ms à 32768Hz (AUDIO_RATE ESP32) — longueurs
#define COMB2_LEN      1153   // ~35.2ms            premières entre elles pour éviter
#define COMB3_LEN      1327   // ~40.5ms            que les échos se superposent en phase
#define COMB_FEEDBACK   180   // /256 ≈ 0.70 — plus haut = la reverb sonne plus longtemps

#define ALLPASS_LEN     225   // ~6.9ms
#define ALLPASS_GAIN    128   // /256 = 0.5

static int8_t  comb1_buf[COMB1_LEN]   = {0};
static int8_t  comb2_buf[COMB2_LEN]   = {0};
static int8_t  comb3_buf[COMB3_LEN]   = {0};
static int8_t  allpass_buf[ALLPASS_LEN] = {0};
static uint16_t comb1_idx = 0, comb2_idx = 0, comb3_idx = 0, allpass_idx = 0;

// Une comb filter = un buffer circulaire : on lit l'échantillon vieux de
// `len` pas (l'écho), on écrit l'entrée d'aujourd'hui + une fraction de cet
// écho (le feedback, ce qui le fait durer), puis on avance l'index en
// bouclant sur lui-même (buffer "circulaire").
static inline int8_t comb_filter(int8_t* buf, uint16_t len, uint16_t& idx, int8_t input) {
    int8_t delayed = buf[idx];
    buf[idx] = input + (int8_t)(((int16_t)delayed * COMB_FEEDBACK) >> 8);
    idx = (idx + 1 >= len) ? 0 : idx + 1;
    return delayed;
}

static inline int8_t allpass_filter(int8_t input) {
    int8_t delayed = allpass_buf[allpass_idx];
    int8_t out = delayed - (int8_t)(((int16_t)input * ALLPASS_GAIN) >> 8);
    allpass_buf[allpass_idx] = input + (int8_t)(((int16_t)delayed * ALLPASS_GAIN) >> 8);
    allpass_idx = (allpass_idx + 1 >= ALLPASS_LEN) ? 0 : allpass_idx + 1;
    return out;
}

// ============================================================================
// PERCUSSION — petit rythme porté du simulateur web
// ============================================================================
// 🎓 Pattern par défaut de simulator-web/js/drums.jsx (DRUM_DEFAULT), ramené
//    de 32 à 16 pas (sa résolution de base avant le doublement) — ce qui
//    tombe pile sur nos 16 colonnes de grille : Kick sur les temps 1 et 3,
//    Snare sur 2 et 4, Charleston (hat) en croches continues. Synchronisé
//    sur la même horloge que la mélodie (une colonne = un pas).
static const bool KICK_PATTERN[GRID_COLS]  = {1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0};
static const bool SNARE_PATTERN[GRID_COLS] = {0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0};
static const bool HAT_PATTERN[GRID_COLS]   = {1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0};

static Oscil<SIN2048_NUM_CELLS, AUDIO_RATE>        kickOsc(SIN2048_DATA);
static Oscil<WHITENOISE8192_NUM_CELLS, AUDIO_RATE> snareNoise(WHITENOISE8192_DATA);
static Oscil<WHITENOISE8192_NUM_CELLS, AUDIO_RATE> hatNoise(WHITENOISE8192_DATA);
static ADSR<CONTROL_RATE, AUDIO_RATE> kickEnv;
static ADSR<CONTROL_RATE, AUDIO_RATE> snareEnv;
static ADSR<CONTROL_RATE, AUDIO_RATE> hatEnv;

// 🎓 Le "boum" du kick vient d'une chute rapide de hauteur (150Hz → 45Hz)
//    pendant l'attaque — l'ADSR ne module que le VOLUME, donc on gère ce
//    glissando de fréquence nous-mêmes, à chaque tick de contrôle.
#define KICK_PITCH_START  150.0f
#define KICK_PITCH_END     45.0f
#define KICK_PITCH_TICKS   6      // ~94ms à CONTROL_RATE 64Hz
static int kick_glide_tick = KICK_PITCH_TICKS; // >= KICK_PITCH_TICKS = glissando terminé/inactif

static void trigger_kick() {
    kick_glide_tick = 0;
    kickOsc.setFreq(KICK_PITCH_START);
    kickEnv.noteOn();
}
static void trigger_snare() {
    snareNoise.setFreq(4400); // 🎓 lecture rapide de la table = perçu comme du bruit blanc, pas une note
    snareEnv.noteOn();
}
static void trigger_hat() {
    hatNoise.setFreq(9000);
    hatEnv.noteOn();
}

// 🎓 x4 : la boîte à rythme a son propre compteur, indépendant de cur_col —
//    elle boucle sur ses 16 pas 4 fois plus vite que le balayage GoL/mélodie
//    (qui reste, lui, à 1 colonne par temps). Plus c'est un simple diviseur
//    de tick, plus besoin d'y toucher si le tempo de la mélodie change.
#define DRUM_STEP_TICKS (TICKS_PER_COL / 4)
static uint8_t drum_step        = GRID_COLS - 1; // même astuce que cur_col : le 1er pas atterrit sur 0
static int     drum_tick_counter = 0;

static void advance_drum_step() {
    drum_step = (drum_step + 1) % GRID_COLS;
    if (KICK_PATTERN[drum_step])  trigger_kick();
    if (SNARE_PATTERN[drum_step]) trigger_snare();
    if (HAT_PATTERN[drum_step])   trigger_hat();
}

static int              ctrl_ticks = 0;
// 🎓 Démarre à GRID_COLS-1 pour que le tout premier advance_beat() (voir plus
//    bas) atterrisse sur la colonne 0 au lieu de sauter directement à 1.
static volatile uint8_t cur_col = GRID_COLS - 1; // lu depuis main.cpp (render du playhead) → volatile

static GolStepCallback golStepCb = nullptr;

// 🎓 Silence garanti et déterministe : plutôt que de compter sur le
//    comportement de env.noteOff()/release (peu clair si appelé pendant la
//    phase de decay), on coupe la sortie audio nous-mêmes dans updateAudio()
//    tant qu'aucune note n'est active. Corrige le bug où une colonne vide
//    rejouait/subdivisait la dernière note au lieu de rester silencieuse.
static volatile bool voice_active = false;

// 🎓 Pause : séparée de voice_active. voice_active dit "il y a une note en
//    train de jouer", paused dit "on ne joue plus rien ET le séquenceur ne
//    doit plus avancer" (sinon le GoL continuerait à tourner en silence
//    pendant la pause, désynchronisant la reprise).
static volatile bool paused = false;

// 🎓 ARPEGGIATOR, RYTHME TERNAIRE : au lieu de jouer toutes les cellules
//    vivantes d'une colonne EN MÊME TEMPS (accord), on les joue L'UNE APRÈS
//    L'AUTRE. Le temps (une colonne) est maintenant TOUJOURS coupé en 3 parts
//    égales (comme un triolet en musique) — plus une découpe qui variait
//    selon le nombre de cellules vivantes. S'il y a moins de 3 cellules
//    vivantes ce temps-ci, on boucle sur les notes trouvées (1 cellule →
//    jouée 3 fois, 2 cellules → 1-2-1) pour garder le groove ternaire
//    constant ; s'il y en a plus, on en tire 3 au hasard.
#define ARP_STEPS 3
static const int ticksPerStep = TICKS_PER_COL / ARP_STEPS; // fixe : plus de recalcul par colonne

static uint8_t arpNotes[ARP_STEPS]; // rangées Y tirées au hasard pour le beat en cours
static uint8_t arpCount = 0;        // nb de cellules vivantes réellement trouvées (0..ARP_STEPS)

static void pick_arp_notes(uint8_t col) {
    const uint8_t* g = snap[snap_idx];
    uint8_t alive[GRID_ROWS];
    uint8_t n = 0;
    for (int y = 0; y < GRID_ROWS; y++) {
        if (g[y * GRID_COLS + col]) alive[n++] = y;
    }
    arpCount = (n < ARP_STEPS) ? n : ARP_STEPS;
    for (uint8_t i = 0; i < arpCount; i++) {
        uint8_t pick = random(n);        // 🎓 random(n) = Arduino, entier entre 0 et n-1
        arpNotes[i] = alive[pick];
        alive[pick] = alive[--n];        // swap-remove : évite de tirer 2x la même cellule
    }
}

static void trigger_arp_step(uint8_t step) {
    if (arpCount == 0) return;
    uint8_t note = arpNotes[step % arpCount]; // boucle sur les notes trouvées si arpCount < ARP_STEPS
    float f = mtof((float)SCALE[note]);
    osc1.setFreq(f);
    osc2.setFreq(f * 2);
    env.noteOn();
    voice_active = true;
}

// 🎓 Fait avancer le séquenceur d'UN temps : colonne suivante, GoL avancé
//    d'une génération (callback, AVANT de lire les notes — sinon on jouerait
//    l'ancienne génération pendant que les LEDs montrent déjà la nouvelle),
//    puis choix des notes de ce temps parmi les cellules vivantes.
static void advance_beat() {
    cur_col = (cur_col + 1) % GRID_COLS;
    if (golStepCb) golStepCb();
    pick_arp_notes(cur_col);
    if (arpCount == 0) voice_active = false; // rien à jouer ce temps-ci : silence garanti
    else                trigger_arp_step(0);
}

void audio_init() {
    env.setADLevels(115, 0);   // 115/255 ≈ 0.45 — volume validé en Python (test faible volume)
    env.setTimes(15, 350, 0, 50);
    osc1.setFreq(440);  // fréquence par défaut pour éviter silence au démarrage

    kickEnv.setADLevels(255, 0);
    kickEnv.setTimes(2, 90, 0, 20);   // attaque quasi instantanée, decay ~90ms = le "boum"
    snareEnv.setADLevels(200, 60);
    snareEnv.setTimes(2, 70, 0, 40);
    hatEnv.setADLevels(140, 0);
    hatEnv.setTimes(1, 25, 0, 10);    // très court = "tss" sec

    startMozzi(CONTROL_RATE);
    advance_beat();      // démarre le tout premier temps (colonne 0) sans attendre TICKS_PER_COL ticks
    advance_drum_step(); // idem pour le 1er pas de la boîte à rythme (pas 0)
}

void audio_grid_update(const uint8_t* grid) {
    uint8_t w = 1 - snap_idx;
    memcpy(snap[w], grid, GRID_COLS * GRID_ROWS);
    snap_idx = w;
}

void audio_set_gol_step_callback(GolStepCallback cb) {
    golStepCb = cb;
}

uint8_t audio_current_col() {
    return cur_col;
}

void audio_toggle_pause() {
    paused = !paused;
    if (paused) voice_active = false; // coupe le son tout de suite, pas d'attente du prochain tick
}

bool audio_is_paused() {
    return paused;
}

void updateControl() {
    // 🎓 Mozzi ADSR a 2 méthodes séparées : next() (déjà appelée dans
    //    updateAudio(), à la cadence audio) fait juste l'interpolation entre
    //    deux points de contrôle — c'est update() qui fait AVANCER l'enveloppe
    //    d'une phase à l'autre (attack→decay→sustain→release→idle). Sans
    //    update(), l'enveloppe reste bloquée dans sa phase de départ pour
    //    toujours (bug corrigé le 2026-09-18 : kick/snare/hat restaient
    //    bloqués à plein volume après le tout premier déclenchement).
    env.update();
    kickEnv.update();
    snareEnv.update();
    hatEnv.update();

    if (paused) return; // 🎓 séquenceur figé : ni avance de temps, ni nouvelle note choisie

    drum_tick_counter++;
    if (drum_tick_counter >= DRUM_STEP_TICKS) {
        drum_tick_counter = 0;
        advance_drum_step();
    }

    if (kick_glide_tick < KICK_PITCH_TICKS) {
        kick_glide_tick++;
        float t = (float)kick_glide_tick / KICK_PITCH_TICKS;
        kickOsc.setFreq(KICK_PITCH_START + (KICK_PITCH_END - KICK_PITCH_START) * t);
    }

    ctrl_ticks++;
    if (ctrl_ticks >= TICKS_PER_COL) {
        ctrl_ticks = 0;
        advance_beat();
    } else if (arpCount > 0 && ctrl_ticks % ticksPerStep == 0) {
        uint8_t step = ctrl_ticks / ticksPerStep;
        if (step < ARP_STEPS) trigger_arp_step(step); // ignore l'éventuel tick résiduel dû à l'arrondi de la division
    }
}

int updateAudio() {
    // 🎓 Le son "sec" (dry) est calculé seulement s'il y a une note active —
    //    mais la reverb, elle, tourne TOUJOURS : sinon la queue de résonance
    //    se couperait net dès que la note s'arrête, au lieu de s'éteindre
    //    progressivement comme une vraie reverb.
    int8_t dry = 0;
    if (!paused && voice_active) {
        int32_t mix = ((int32_t)osc1.next() * HARM1_W
                     + (int32_t)osc2.next() * HARM2_W) >> 8;
        dry = (int8_t)((mix * env.next()) >> 8);
    }

    int16_t wet = (int16_t)comb_filter(comb1_buf, COMB1_LEN, comb1_idx, dry)
                + (int16_t)comb_filter(comb2_buf, COMB2_LEN, comb2_idx, dry)
                + (int16_t)comb_filter(comb3_buf, COMB3_LEN, comb3_idx, dry);
    wet = allpass_filter((int8_t)(wet / 3));

    // 🎓 Percussion hors reverb (volontairement "sèche") : on veut des
    //    attaques nettes, la reverb ne s'applique qu'à la voix mélodique.
    int16_t kick  = ((int16_t)kickOsc.next()    * kickEnv.next())  >> 8;
    int16_t snare = ((int16_t)snareNoise.next() * snareEnv.next()) >> 8;
    int16_t hat   = ((int16_t)hatNoise.next()   * hatEnv.next())   >> 8;

    int16_t out = dry + (int16_t)(((int32_t)wet * REVERB_MIX) >> 8) + kick + snare + hat;
    if (out >  127) out =  127; // 🎓 clip de sécurité : reste dans la plage int8 attendue par le DAC
    if (out < -128) out = -128;
    return out;
}
