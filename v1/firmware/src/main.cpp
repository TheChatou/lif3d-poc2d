#include <Arduino.h>
#include <esp_system.h>
#include <FastLED.h>
#include "gol.h"
#include "audio.h"
#include "controls.h"

#define LED_DATA_PIN   5
#define LED_COUNT      256
#define BRIGHTNESS     20
// 🎓 Le GoL avance maintenant d'une génération à CHAQUE temps (voir
//    step_generation() plus bas, branché sur audio_set_gol_step_callback) —
//    plus de minuteur millis() séparé pour le pas GoL : c'est directement
//    l'horloge du séquenceur (Mozzi/CONTROL_RATE) qui le déclenche, donc
//    aucune dérive possible entre le son et le GoL.
//
// 🎓 Le rendu LED, lui, tourne à son propre rythme rapide et indépendant,
//    juste pour que le playhead (colonne surlignée) bouge de façon fluide.
#define LED_RENDER_MS  20

CRGB leds[LED_COUNT];

static uint8_t  grid_a[GRID_COLS * GRID_ROWS];
static uint8_t  grid_b[GRID_COLS * GRID_ROWS];
static uint8_t  age_a[GRID_COLS * GRID_ROWS];
static uint8_t  age_b[GRID_COLS * GRID_ROWS];
static uint8_t* grid_cur = grid_a;
static uint8_t* grid_nxt = grid_b;
static uint8_t* age_cur  = age_a;
static uint8_t* age_nxt  = age_b;

// 🎓 Graine aléatoire à symétrie axiale : on tire au hasard seulement la
//    moitié gauche de la grille, puis on la recopie en miroir à droite.
//    Résultat : un motif toujours symétrique, visuellement et musicalement
//    plus harmonieux qu'un semis totalement aléatoire (accords "en écho").
// 🎓 Densité 0.3 validée par simulation native (25 générations, 5 essais) :
//    Dense/Coral/Balanced s'effondrent à 0 en moins de 6 générations sur 16×16
//    avec cette graine symétrique — Conway B3/S23 reste vivant et évolue.
#define SEED_DENSITY 0.3f

static void seed_symmetric_random() {
    gol_clear(grid_cur);
    memset(age_cur, 0, GRID_COLS * GRID_ROWS);
    for (int y = 0; y < GRID_ROWS; y++) {
        for (int x = 0; x < GRID_COLS / 2; x++) {
            uint8_t alive = ((float)random(10000) / 10000.0f < SEED_DENSITY) ? 1 : 0;
            gol_set(grid_cur, x, y, alive);
            gol_set(grid_cur, GRID_COLS - 1 - x, y, alive);
        }
    }
}

// 🎓 Paire de gliders miroir : le glider classique (5 cellules, période 4 —
//    revient à sa forme de départ décalé de (1,1) toutes les 4 générations)
//    posé une fois à gauche, une fois en symétrie miroir à droite (axe
//    vertical x=7.5). Le glider gauche part en diagonale bas-droite, le
//    miroir droit part en bas-gauche — les deux convergent vers le centre
//    et finissent par entrer en collision (comportement normal du GoL,
//    pas un bug), sur grille toroïdale B3/S23 (règle Conway, stable).
static void seed_glider_pair_symmetric() {
    gol_clear(grid_cur);
    memset(age_cur, 0, GRID_COLS * GRID_ROWS);

    // Forme du glider (5 cellules), origine (ox,oy) = coin haut-gauche
    // de sa boîte 3×3 :
    //   .X.
    //   ..X
    //   XXX
    static const uint8_t GLIDER_DX[5] = {1, 2, 0, 1, 2};
    static const uint8_t GLIDER_DY[5] = {0, 1, 2, 2, 2};

    const int ox = 1, oy = 1; // position du glider gauche
    for (int i = 0; i < 5; i++) {
        int x = ox + GLIDER_DX[i];
        int y = oy + GLIDER_DY[i];
        gol_set(grid_cur, x, y, 1);                  // glider gauche
        gol_set(grid_cur, GRID_COLS - 1 - x, y, 1);   // miroir droit
    }
}

static inline int led_index(int x, int y) {
    return (y % 2 == 0) ? (y * GRID_COLS + x)
                        : (y * GRID_COLS + (GRID_COLS - 1 - x));
}

// 🎓 Couleur dédiée à la colonne jouée : plutôt que de rendre les cellules
//    plus lumineuses (facile à louper visuellement selon l'âge/couleur déjà
//    en place), on les repeint dans une teinte propre au playhead — le
//    contraste de couleur (bleu/blanc → orange) se voit beaucoup mieux.
#define PLAYHEAD_COLOR CRGB(255, 120, 0)

static void render() {
    uint8_t play_col = audio_current_col();
    for (int y = 0; y < GRID_ROWS; y++) {
        for (int x = 0; x < GRID_COLS; x++) {
            int flat = y * GRID_COLS + x;
            int led  = led_index(x, y);
            if (!grid_cur[flat]) { leds[led] = CRGB::Black; continue; }
            if (x == play_col) { leds[led] = PLAYHEAD_COLOR; continue; }
            uint8_t age = age_cur[flat];
            if (age == 0)       leds[led] = CRGB::White;
            else if (age <= 3)  leds[led] = CRGB(0, 200, 255);
            else                leds[led] = CRGB(0, 60, 60);
        }
    }
    FastLED.show();
}

// 🎓 Appelée par audio.cpp à chaque temps (voir audio_set_gol_step_callback,
//    branché dans setup()) — AVANT que les notes du temps soient choisies,
//    pour que le son et les LEDs montrent toujours la même génération.
static void step_generation() {
    gol_step_age(grid_cur, grid_nxt, age_cur, age_nxt, 0); // règle Conway B3/S23 — stable sur 16×16 (Dense s'effondre, voir SEED_DENSITY)

    uint8_t* tmp;
    tmp = grid_cur; grid_cur = grid_nxt; grid_nxt = tmp;
    tmp = age_cur;  age_cur  = age_nxt;  age_nxt  = tmp;

    audio_grid_update(grid_cur);
}

void setup() {
    delay(2000);
    Serial.begin(115200);
    Serial.println("=== LIF2D BOOT ===");

    FastLED.addLeds<WS2812B, LED_DATA_PIN, GRB>(leds, LED_COUNT);
    FastLED.setBrightness(BRIGHTNESS);
    FastLED.clear(true);
    Serial.println("LEDs OK");

    gol_seed(esp_random());   // 🎓 esp_random() = RNG matériel de l'ESP32, vraie entropie (pas besoin de pin flottante)
    seed_glider_pair_symmetric();
    audio_grid_update(grid_cur);
    audio_set_gol_step_callback(step_generation);
    audio_init();
    Serial.println("Audio OK — GPIO25");

    controls_init();
    Serial.println("Controls OK — bouton play/pause GPIO14");
}

static uint32_t last_render = 0;

void loop() {
    audioHook();
    controls_update();

    uint32_t now = millis();

    // Rendu rapide et indépendant du séquenceur : fait bouger le playhead
    // (colonne surlignée) de façon fluide entre deux temps.
    if (now - last_render >= LED_RENDER_MS) {
        last_render = now;
        render();
    }
}
