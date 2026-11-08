#include "ui_internal.h"
#include <Preferences.h>

// ---------------------------------------------------------------- sauvegarde flash (NVS)
// 🎓 NVS (Non-Volatile Storage) = un petit coin de la mémoire flash de l'ESP32
//    qui survit à l'extinction, organisé en paires clé → valeur. On y range
//    nos tableaux tels quels (des "blobs" d'octets).
//    Garde-fou de version : si la taille stockée ne correspond plus à la
//    structure actuelle (on a ajouté un réglage), on ignore l'ancienne sauvegarde.
#define NVS_NS        "lif2d"
#define SETTINGS_KEY  "cfg"
#define SAVE_DELAY_MS 2000   // la flash s'use : on attend la fin des réglages avant d'écrire

static Preferences prefs;

bool nvs_load(const char* key, void* data, size_t len) {
    if (!prefs.begin(NVS_NS, true)) return false;   // namespace absent = jamais rien sauvé
    bool ok = prefs.getBytesLength(key) == len && prefs.getBytes(key, data, len) == len;
    prefs.end();
    return ok;
}

void nvs_save(const char* key, const void* data, size_t len) {
    prefs.begin(NVS_NS, false);
    prefs.putBytes(key, data, len);
    prefs.end();
}

void settings_load() {
    Settings s;
    if (!nvs_load(SETTINGS_KEY, &s, sizeof(s))) return;
    cfg = s;
    cfg.led_test = LT_NORMAL;   // jamais redémarrer en écran noir
    cfg.playing = false;        // toujours démarrer en pause
}

void settings_save() { nvs_save(SETTINGS_KEY, &cfg, sizeof(cfg)); }

// Appelé à chaque image : sauve les réglages 2 s après le dernier changement.
void settings_tick() {
    static Settings saved = cfg;
    static uint32_t t_change = 0;
    static bool     dirty = false;
    if (memcmp(&saved, &cfg, sizeof(cfg)) != 0) {
        saved = cfg;
        t_change = millis();
        dirty = true;
    }
    if (dirty && millis() - t_change >= SAVE_DELAY_MS) {
        nvs_save(SETTINGS_KEY, &cfg, sizeof(cfg));
        dirty = false;
    }
}
