#include "input.h"
#include "config.h"
#include "soc/gpio_struct.h"
#include "esp_timer.h"

#define STEPS_PER_DETENT  4    // EC11 : 4 transitions par cran (à vérifier sur l'écran DIAG)
#define INVERT_A          0    // passer à 1 si la molette tourne "à l'envers"
#define INVERT_B          0
#define DEBOUNCE_MS      30
#define LONG_PRESS_MS   600
#define QUEUE_SIZE       16

// ⚠ MODE DÉPANNAGE (2026-10-25) : le contact A des 2 encodeurs ne remonte pas
//    (condensateur 100 nF câblé EN SÉRIE sur le fil A au lieu d'entre A et GND).
//    Avec le seul contact B on compte les crans mais pas le sens :
//    tourner = +1, tourner molette enfoncée = -1. Remettre à 0 après réparation.
#define ENC_SINGLE_CHANNEL  1
#define SINGLE_DEBOUNCE_US  5000

// ---------------------------------------------------------------- encodeurs
// 🎓 QUADRATURE : un encodeur a 2 contacts (A et B) décalés d'un quart de tour.
//    En regardant l'ancien état (2 bits) + le nouvel état (2 bits), on obtient
//    un nombre de 0 à 15 ; cette table dit si ce changement vaut +1, -1 ou 0
//    (0 = rebond ou état impossible, ignoré : c'est un anti-rebond gratuit).
static const int8_t QDEC[16] = {0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0};

struct Encoder {
    uint8_t pin_a, pin_b;
    volatile uint8_t state;
    volatile int32_t raw;
    int32_t consumed;          // transitions déjà transformées en crans
    volatile int32_t pulses;   // mode dépannage : fronts montants du contact B
    volatile int64_t t_pulse;
    int32_t pulses_used;
};

static Encoder enc[2] = {{ENC_A_ROTA, ENC_A_ROTB}, {ENC_B_ROTA, ENC_B_ROTB}};

// 🎓 IRAM_ATTR : la fonction est rangée en RAM rapide, obligatoire pour une
//    interruption sur ESP32. On lit le registre GPIO directement (plus rapide
//    et plus sûr que digitalRead() dans une interruption).
static inline IRAM_ATTR int fast_read(uint8_t pin) {
    return pin < 32 ? (GPIO.in >> pin) & 1 : (GPIO.in1.val >> (pin - 32)) & 1;
}

static void IRAM_ATTR enc_update(Encoder& e) {
    uint8_t s = ((e.state << 2) | (fast_read(e.pin_a) << 1) | fast_read(e.pin_b)) & 0x0F;
    if (ENC_SINGLE_CHANNEL && !(e.state & 1) && (s & 1)) {   // B : 0 → 1 = fin d'un cran
        int64_t now = esp_timer_get_time();                 // 🎓 horloge µs utilisable en interruption
        if (now - e.t_pulse > SINGLE_DEBOUNCE_US) e.pulses++;
        e.t_pulse = now;
    }
    e.raw += QDEC[s];
    e.state = s & 0x03;
}

static void IRAM_ATTR isr_enc_a() { enc_update(enc[0]); }
static void IRAM_ATTR isr_enc_b() { enc_update(enc[1]); }

// ---------------------------------------------------------------- boutons
struct Button {
    uint8_t  pin;
    bool     raw, pressed;     // lecture brute / état stable (anti-rebond)
    uint32_t t_change, t_press;
    bool     long_fired, turned, in_combo;
};

enum { BTN_A, BTN_B, BTN_PLAY };
static Button btn[3] = {{ENC_A_SWCH}, {ENC_B_SWCH}, {BTN_PLAY_PIN}};

// ---------------------------------------------------------------- file d'événements
// 🎓 File circulaire : on écrit à `head`, on lit à `tail`, et les deux
//    indices "tournent" grâce au modulo. Pas d'allocation mémoire.
static Event   queue[QUEUE_SIZE];
static uint8_t q_head = 0, q_tail = 0;

static void push(EvType t, int8_t delta = 0, bool pushed = false, bool shift = false) {
    uint8_t next = (q_head + 1) % QUEUE_SIZE;
    if (next == q_tail) return;  // file pleine : on perd l'événement plutôt que bloquer
    queue[q_head] = {t, delta, pushed, shift};
    q_head = next;
}

bool input_next(Event& ev) {
    if (q_tail == q_head) return false;
    ev = queue[q_tail];
    q_tail = (q_tail + 1) % QUEUE_SIZE;
    return true;
}

void input_init() {
    for (auto& e : enc) {
        pinMode(e.pin_a, INPUT_PULLUP);
        pinMode(e.pin_b, INPUT_PULLUP);
        e.state = (fast_read(e.pin_a) << 1) | fast_read(e.pin_b);
    }
    attachInterrupt(digitalPinToInterrupt(enc[0].pin_a), isr_enc_a, CHANGE);
    attachInterrupt(digitalPinToInterrupt(enc[0].pin_b), isr_enc_a, CHANGE);
    attachInterrupt(digitalPinToInterrupt(enc[1].pin_a), isr_enc_b, CHANGE);
    attachInterrupt(digitalPinToInterrupt(enc[1].pin_b), isr_enc_b, CHANGE);
    for (auto& b : btn) {
        pinMode(b.pin, INPUT_PULLUP);  // 🎓 appuyé = relié à GND = LOW
        b.raw = b.pressed = false;
    }
}

static void poll_encoder(int i, uint8_t self_btn, bool invert) {
    bool pushed = btn[self_btn].pressed;
    int32_t detents;
    if (ENC_SINGLE_CHANNEL) {
        detents = enc[i].pulses - enc[i].pulses_used;
        if (detents == 0) return;
        enc[i].pulses_used += detents;
        if (pushed) { detents = -detents; btn[self_btn].turned = true; }
        bool shift = btn[BTN_PLAY].pressed;
        if (shift) btn[BTN_PLAY].turned = true;
        push(i == 0 ? EV_TURN_A : EV_TURN_B, (int8_t)constrain(detents, -127, 127), false, shift);
        return;
    }
    detents = (enc[i].raw - enc[i].consumed) / STEPS_PER_DETENT;
    if (detents == 0) return;
    enc[i].consumed += detents * STEPS_PER_DETENT;
    bool shift  = btn[BTN_PLAY].pressed;
    if (pushed) btn[self_btn].turned = true;   // le relâchement ne fera pas de "clic"
    if (shift)  btn[BTN_PLAY].turned = true;   // ▶ servait de SHIFT : pas de play/pause
    int8_t d = (int8_t)constrain(invert ? -detents : detents, -127, 127);
    push(i == 0 ? EV_TURN_A : EV_TURN_B, d, pushed, shift);
}

static void poll_button(int i, uint32_t now) {
    Button& b = btn[i];
    bool reading = digitalRead(b.pin) == LOW;
    if (reading != b.raw) { b.raw = reading; b.t_change = now; }
    if (now - b.t_change < DEBOUNCE_MS || reading == b.pressed) {
        // état stable inchangé : seul l'appui long peut se déclencher
        if (b.pressed && !b.long_fired && !b.turned && !b.in_combo && now - b.t_press >= LONG_PRESS_MS) {
            b.long_fired = true;
            push(i == BTN_A ? EV_LONG_A : i == BTN_B ? EV_LONG_B : EV_LONG_PLAY);
        }
        return;
    }
    b.pressed = reading;
    if (b.pressed) {
        b.t_press = now;
        b.long_fired = b.turned = b.in_combo = false;
        // 🎓 Combinaison : si l'autre molette est déjà enfoncée, les 2 passent en "combo"
        if (i != BTN_PLAY && btn[1 - i].pressed && !btn[1 - i].long_fired) {
            b.in_combo = btn[1 - i].in_combo = true;
        }
        return;
    }
    // relâchement
    if (b.in_combo) {
        if (!btn[1 - i].pressed) push(EV_CLICK_AB);  // le 2e relâché déclenche le combo
        return;
    }
    if (!b.long_fired && !b.turned) {
        push(i == BTN_A ? EV_CLICK_A : i == BTN_B ? EV_CLICK_B : EV_CLICK_PLAY);
    }
}

void input_poll() {
    uint32_t now = millis();
    for (int i = 0; i < 3; i++) poll_button(i, now);
    poll_encoder(0, BTN_A, INVERT_A);
    poll_encoder(1, BTN_B, INVERT_B);
}

InputDiag input_diag() {
    return {enc[0].raw, enc[1].raw, btn[BTN_A].pressed, btn[BTN_B].pressed, btn[BTN_PLAY].pressed};
}
