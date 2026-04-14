#!/usr/bin/env python3
"""
LIF2D Simulator v4 — sounddevice + formes d'onde + filtre passe-bas
====================================================================
Contrôles clavier :
  ESPACE Play/Pause  C Clear   R Reset   D Dessin
  S Save  L Load     A Arp on/off
  <- -> Règle   haut/bas Gamme   +/- BPM
"""

import ctypes, os, sys, time, math, datetime, random as rnd, threading
import pygame, numpy as np
from collections import deque

try:
    import sounddevice as sd
    HAS_SD = True
except ImportError:
    HAS_SD = False
    print("⚠  sounddevice non installé — audio désactivé. pip install sounddevice")

try:
    from pedalboard import Pedalboard, Reverb, Chorus
    try:
        from pedalboard import Phaser as _PBPhaser
        HAS_PHASER = True
    except ImportError:
        HAS_PHASER = False
    HAS_PB = True
except ImportError:
    HAS_PB = False; HAS_PHASER = False
    print("⚠  pedalboard non installé — effets désactivés. pip install pedalboard")

# 🎓 psutil = bibliothèque pour lire l'usage RAM/CPU du processus en cours.
#    Optionnel : si non installé, le HUD affiche "N/A" pour la RAM.
try:
    import psutil as _psutil
    _PROC = _psutil.Process(os.getpid())
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

# ══════════════════════════════════════════════════════════════════════════════
# CONSTANTES
# ══════════════════════════════════════════════════════════════════════════════
GRID_COLS, GRID_ROWS = 16, 16
CELL_SIZE, CELL_GAP  = 30, 2
CELL_STEP  = CELL_SIZE + CELL_GAP
GRID_PX_W  = GRID_COLS * CELL_STEP - CELL_GAP   # = 510
GRID_PX_H  = GRID_ROWS * CELL_STEP - CELL_GAP   # = 510
# 🎓 Layout deux colonnes : panneau gauche | grille | panneau droit
LP_X  = 0;    LP_W  = 258   # left panel
GRID_OFF_X = LP_W + 12      # = 270
GRID_OFF_Y = 16
RP_X  = GRID_OFF_X + GRID_PX_W + 12   # = 792  (right panel)
RP_W  = 290
PANEL_X = RP_X; PANEL_W = RP_W        # alias backward-compat
WINDOW_W   = RP_X + RP_W + 8          # = 1090
WINDOW_H   = 880   # fenêtre agrandie pour marges UI + section sample
FPS        = 60
# 🎓 22050 Hz = moitié de la qualité CD (44100). La loi de Nyquist dit qu'on peut
#    reproduire des fréquences jusqu'à 22050/2 = 11025 Hz — largement suffisant
#    pour un synthé GoL (piano max ~4 kHz, voix ~3 kHz). Et Mozzi sur ESP32
#    tourne à 16384 Hz, donc on est déjà AU-DESSUS de la cible matérielle.
#    Avantage : buffers deux fois plus petits → deux fois moins de RAM.
SAMPLE_RATE  = 22050
# 🎓 MASTER_GAIN : atténuation globale du moteur audio.
#    Valeur 0.2 = les buffers sont normalisés ±1.0, on réduit de ×5 pour éviter
#    la saturation quand plusieurs notes se cumulent (polyphonie).
#    Réglé pour que sl_vol à 50% donne un niveau d'écoute confortable.
MASTER_GAIN  = 0.2

# 🎓 os.makedirs avec exist_ok=True : crée le dossier si inexistant, sinon ne fait rien.
PATTERNS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "patterns")
os.makedirs(PATTERNS_DIR, exist_ok=True)
# 🎓 SAMPLES_DIR : dossier où l'utilisateur dépose ses fichiers .wav d'instruments.
#    Le simulateur les charge, les pitche par rééchantillonnage numpy, et les joue
#    à la place de la synthèse interne. Même dossier que patterns, facile à trouver.
SAMPLES_DIR  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples")
os.makedirs(SAMPLES_DIR, exist_ok=True)

# ── Couleurs — thème Steampunk ────────────────────────────────────────────────
# 🎓 Palette inspirée du steampunk : cuivre, laiton, bois sombre, parchemin.
C_BG        = ( 14,  10,   8)   # noir mahogany
C_GRID_BG   = ( 22,  16,  10)   # bois sombre
C_CELL_DEAD = ( 40,  28,  16)   # cuir sombre
# 🎓 3 niveaux d'âge : cuivre terne → cuivre brillant → laiton poli
C_CELL_A0   = (110,  58,  18)   # cuivre terne (cellule née)
C_CELL_A1   = (185, 105,  30)   # cuivre vif   (cellule jeune)
C_CELL_A2   = (245, 190,  55)   # laiton poli  (cellule mature)
C_COL_DEAD  = ( 55,  38,  20)   # colonne courante (éteinte)
C_COL_LIVE  = (255, 210,  60)   # colonne courante (allumée) — reflet laiton
C_PANEL     = ( 20,  14,   9)   # panneau cuir sombre
C_BORDER    = ( 95,  65,  28)   # bord laiton
C_TEXT      = (225, 200, 148)   # parchemin vieilli
C_TEXT_DIM  = (130, 108,  72)   # parchemin dim
C_ACCENT    = (205, 138,  38)   # laiton chaud
C_WARM      = (185,  88,  22)   # cuivre brûlé
C_BTN       = ( 48,  34,  18)   # bouton laiton sombre
C_BTN_HOVER = ( 68,  50,  26)   # hover laiton
C_BTN_BORDER= (105,  75,  32)   # bord bouton
C_GREEN     = ( 55, 145,  68)   # vert-de-gris
C_PURPLE    = (145,  68, 178)   # violet alchimique
C_ORANGE    = (200, 118,  22)   # ambre
C_RED       = (168,  48,  36)   # rouille
C_TEAL      = ( 38, 148, 118)   # patine teal

# ── Données musicales et GoL ──────────────────────────────────────────────────
SCALES = {
    "Pentatonique": [0,2,4,7,9,12,14,16,19,21,24],
    "Mineur":       [0,2,3,5,7,8,10,12,14,15,17,19],
    "Majeur":       [0,2,4,5,7,9,11,12,14,16,17,19],
    "Dorien":       [0,2,3,5,7,9,10,12,14,15,17,19],
    # Nouvelles — très mélodiques, idéales pour du génératif
    "Penta_Mineure":    [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24],
    # ^ Pentatonique mineure : sombre mais très fluide, chaque note s'enchaîne bien

    "Lydien":           [0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 19],
    # ^ Majeur avec #4 : lumineux, flottant, très "cinématique"

    "Mixolydien":       [0, 2, 4, 5, 7, 9, 10, 12, 14, 16, 17, 19],
    # ^ Majeur avec b7 : chaud, blues-rock, très naturel à l'oreille

    "Japonaise":        [0, 1, 5, 7, 8, 12, 13, 17, 19, 20, 24],
    # ^ In Sen / Hirajoshi : mélancolique, minimaliste, sonne très GoL
    # (peu de notes = densité ~4% → parfait pour B6/S567)

    "Lydien_Dominant":  [0, 2, 4, 6, 7, 9, 10, 12, 14, 16, 18, 19],
    # ^ Lydien + b7 : exotique, tension douce, idéal pour séquences longues

    "Phrygien_Dominant":[0, 1, 4, 5, 7, 8, 10, 12, 13, 16, 17, 19],
    # ^ Flamenco / oriental : expressif, fort caractère, contrastes intenses
}
SCALE_NAMES    = list(SCALES.keys())
GOL_RULE_NAMES = ["Conway B3/S23","Coral  B5/S45","Dense  B6/S567",
                  "Builder B4/S5","Symmetr B5/S5","Highlife B36/S23","Balanced B4/S45"]
AGE_MODES  = ["Harmoniques","Volume","Timbre"]
SYM_MODES  = ["Aucune","Axiale X","Axiale Y","Co-axiale","Centrale"]
LOOP_LENS  = {"x1":1,"x2":2,"x4":4,"x8":8}
ARP_MODES    = ["Up","Down","Random","Ping-pong","Chord","Chord Ping-pong","Groove"]
ARP_SPEEDS   = ["Auto","x2","x3","x4","x8"]
# 🎓 ROOT_NOTES : la note fondamentale de la gamme. Une pentatonique en La (A)
#    n'a pas les mêmes fréquences qu'en Sol (G) — même intervalles, autre couleur.
#    index = nombre de demi-tons au-dessus de C.
ROOT_NOTES   = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"]
# 🎓 PHASER_DIVS : durée d'un cycle phaser/flanger exprimée en mesures GoL
#    (1 mesure = 16 colonnes). "4" = 4 mesures (très lent), "1/32" = ultra-rapide.
PHASER_DIVS  = ["4","2","1","1/2","1/4","1/8","1/16","1/32"]
# 🎓 Formes d'onde : la forme de l'onde détermine le "timbre" (couleur sonore).
#    Sine = pur et doux, Carré = creux et électronique, Dents de scie = brillant,
#    Triangle = entre Sine et Carré, FM = riche et complexe (synthèse FM).
#    Karplus = simulation physique de corde pincée (piano, guitare, koto...).
#    Sample  = lecture d'un fichier .wav réel, pitché par rééchantillonnage.
WAVEFORMS  = ["Sine","Carré","Scie","Triangle","FM","FM2","FM3","Karplus","Sample"]

# 🎓 SAMPLE_BASE_NOTES : liste de notes "source" pour le sample chargé.
#    Quand tu charges un .wav de guitare qui joue un La (A4), tu sélectionnes "A4"
#    ici. Le simulateur calcule le décalage en demi-tons pour chaque ligne de grille
#    et rééchantillonne en conséquence (2× vitesse = une octave plus haute).
#    Format : note (C, C#... B) + octave (2 à 6) = 60 notes possibles.
SAMPLE_BASE_NOTES = [f"{n}{o}" for o in range(2, 7) for n in ROOT_NOTES]
# Index de A4 = (4-2)*12 + ROOT_NOTES.index("A") = 24+9 = 33

# 🎓 Banque de sons : presets qui configurent d'un coup la forme d'onde + ADSR
#    + detune + stereo + filtre + mode âge.
#    "Libre" = contrôle manuel, aucun preset appliqué.
#    Chaque preset est conçu pour sonner bien avec la densité ~4% de B6/S567.
SOUND_PRESETS = {
    "Libre":   None,
    "Piano":   dict(waveform="Karplus",  attack=2,   decay=150, sustain=5,  release=200,
                    detune=2,  stereo=55, filter=100, resonance=0,  age_mode="Volume"),
    "Bell":    dict(waveform="FM2",      attack=5,   decay=400, sustain=5,  release=500,
                    detune=0,  stereo=40, filter=95,  resonance=0,  age_mode="Harmoniques"),
    "Orgue":   dict(waveform="Carré",    attack=10,  decay=10,  sustain=88, release=60,
                    detune=4,  stereo=25, filter=75,  resonance=22, age_mode="Harmoniques"),
    "Pad":     dict(waveform="Sine",     attack=180, decay=60,  sustain=75, release=350,
                    detune=14, stereo=75, filter=100, resonance=0,  age_mode="Volume"),
    "Basse":   dict(waveform="Scie",     attack=4,   decay=70,  sustain=35, release=100,
                    detune=6,  stereo=15, filter=55,  resonance=48, age_mode="Timbre"),
    "Marimba": dict(waveform="Triangle", attack=2,   decay=100, sustain=8,  release=180,
                    detune=0,  stereo=45, filter=100, resonance=0,  age_mode="Volume"),
}
PRESET_NAMES = list(SOUND_PRESETS.keys())

# ══════════════════════════════════════════════════════════════════════════════
# CHARGEMENT DE LA BIBLIOTHÈQUE C
# ══════════════════════════════════════════════════════════════════════════════
def load_gol_lib():
    so = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gol.so")
    if not os.path.exists(so):
        print("gol.so introuvable — lance: bash simulator/build.sh"); sys.exit(1)
    lib = ctypes.CDLL(so); u8p = ctypes.POINTER(ctypes.c_uint8)
    def sig(fn, a, r=None): fn.argtypes=a; fn.restype=r
    sig(lib.gol_clear,      [u8p])
    sig(lib.gol_seed,       [ctypes.c_uint])
    sig(lib.gol_randomize,  [u8p, ctypes.c_float])
    sig(lib.gol_step_age,   [u8p, u8p, u8p, u8p, ctypes.c_uint8])
    sig(lib.gol_get,        [u8p, ctypes.c_int, ctypes.c_int], ctypes.c_uint8)
    sig(lib.gol_toggle,     [u8p, ctypes.c_int, ctypes.c_int])
    sig(lib.gol_population, [u8p], ctypes.c_int)
    print("gol.so chargé"); return lib

# ══════════════════════════════════════════════════════════════════════════════
# MOTEUR AUDIO (sounddevice)
# ══════════════════════════════════════════════════════════════════════════════
class AudioEngine:
    """
    🎓 Moteur audio temps réel basé sur sounddevice.
    Un "callback" s'exécute ~86× par seconde (blocksize=256 à 22050 Hz).
    À chaque appel, il mélange toutes les notes actives dans un buffer float32
    puis applique un soft-clip (tanh) pour éviter la saturation.

    threading.Lock() protège la liste `active` contre les accès simultanés
    entre le thread principal (qui ajoute des notes) et le thread audio
    (qui consomme les notes). Sans ça : crash aléatoire.
    """
    def __init__(self, sr=SAMPLE_RATE):
        self.sr     = sr
        self.active = []        # [[ndarray int16 (N,2), int position, float vol], ...]
        self.lock   = threading.Lock()
        self.stream = None
        if HAS_SD:
            try:
                # 🎓 blocksize=512 : le callback audio se déclenche toutes les
                #    ~23ms au lieu de ~11ms. Plus de marge pour le scheduler Linux
                #    non-temps-réel → élimine les crépitements (dropouts).
                #    Compromis latence/stabilité : 23ms est imperceptible sur un instrument.
                self.stream = sd.OutputStream(
                    samplerate=sr, channels=2, dtype='float32',
                    blocksize=512, callback=self._callback)
                self.stream.start()
                print("sounddevice actif")
            except Exception as e:
                print(f"sounddevice erreur: {e}")

    def _callback(self, outdata, frames, time_info, status):
        out = np.zeros((frames, 2), dtype=np.float32)
        with self.lock:
            still = []
            for note in self.active:
                buf, pos, vol = note          # 🎓 vol stocké ici, pas dans le buffer
                take = min(len(buf) - pos, frames)
                # 🎓 Les buffers sont stockés en int16 (entiers -32768..+32767).
                #    On divise par 32768.0 pour revenir en float32 (-1.0..+1.0),
                #    puis on multiplie par vol. Cette conversion est vectorisée
                #    par numpy : ultra-rapide, aucune boucle Python.
                chunk = buf[pos : pos + take].astype(np.float32) * (vol * MASTER_GAIN / 32768.0)
                out[:take] += chunk
                note[1] = pos + take
                if note[1] < len(buf):
                    still.append(note)
            self.active = still
        np.tanh(out, out=out)
        outdata[:] = out

    def play(self, buf, vol=1.0):
        """buf : ndarray float32 (N, 2) normalisé ±1.0 — AUCUNE copie créée."""
        if not self.stream: return
        # 🎓 Avant : (buf * vol) créait un tableau de 161 KB à chaque appel.
        #    Maintenant : on stocke juste la référence + le vol. Zéro allocation.
        with self.lock:
            # Cap à 32 notes simultanées : évite l'emballement mémoire
            # si GoL produit une explosion de cellules à haute densité.
            if len(self.active) < 32:
                self.active.append([buf, 0, float(vol)])

    def close(self):
        if self.stream:
            self.stream.stop(); self.stream.close()

# ══════════════════════════════════════════════════════════════════════════════
# SYNTHÈSE AUDIO
# ══════════════════════════════════════════════════════════════════════════════
def midi_to_freq(n): return 440.0 * (2.0 ** ((n - 69) / 12.0))

def row_to_midi(row, scale, octave, root=0):
    # 🎓 root = demi-tons au-dessus de C (0=C, 2=D, 9=A...). Transpose toute la gamme.
    s = SCALES[scale]; l = len(s)
    return 12 * (octave + 1) + root + s[row % l] + (row // l) * 12

def _make_wave(t, freq, waveform):
    """🎓 Génère un cycle de forme d'onde pure sur le vecteur temps t."""
    if waveform == "Sine":
        return np.sin(2*np.pi*freq*t, dtype=np.float32)
    elif waveform == "Carré":
        # 🎓 sign(sin(x)) : +1 quand sin>0, -1 quand sin<0 → onde carrée parfaite
        return np.sign(np.sin(2*np.pi*freq*t)).astype(np.float32)
    elif waveform == "Scie":
        # 🎓 Modulo 1.0 donne la phase (0→1), puis 2*phase-1 donne -1→+1
        phase = np.mod(freq * t, 1.0).astype(np.float32)
        return (2*phase - 1).astype(np.float32)
    elif waveform == "Triangle":
        phase = np.mod(freq * t, 1.0).astype(np.float32)
        # 🎓 Triangle = valeur absolue d'une onde en dents de scie transformée
        return (2*np.abs(2*phase - 1) - 1).astype(np.float32)
    elif waveform == "FM":
        # 🎓 Frequency Modulation : l'oscillateur "mod" fait varier la fréquence
        #    instantanée de l'oscillateur "car". Crée des harmoniques complexes.
        #    mod_index=2.5 = profondeur de modulation (plus = plus brillant/rugueux)
        mod = np.sin(2*np.pi*freq*2.0*t, dtype=np.float32)
        return np.sin(2*np.pi*freq*t + 2.5*mod, dtype=np.float32)
    elif waveform == "FM2":
        mod = np.sin(2*np.pi*freq*3.0*t, dtype=np.float32)
        return np.sin(2*np.pi*freq*t + 3.5*mod, dtype=np.float32)
    elif waveform == "FM3":
        mod = np.sin(2*np.pi*freq*4.0*t, dtype=np.float32)
        return np.sin(2*np.pi*freq*t + 4.5*mod, dtype=np.float32)
    elif waveform == "Karplus":
        # 🎓 Karplus-Strong : simulation physique d'une corde pincée (Karplus & Strong, 1983).
        #    Principe : un buffer circulaire de bruit blanc (= "pincement") est relu
        #    en boucle. Chaque sample = moyenne de lui-même et du suivant → filtre
        #    passe-bas par feedback → les harmoniques meurent progressivement.
        #    Résultat : attaque percussive riche, déclin naturel vers un son pur.
        #    delay = sr / freq = nombre de samples dans une période fondamentale.
        n     = len(t)
        delay = max(2, int(SAMPLE_RATE / freq))
        ring  = np.random.uniform(-0.5, 0.5, delay).astype(np.float32)
        out   = np.empty(n, dtype=np.float32)
        for i in range(n):
            idx       = i % delay
            out[i]    = ring[idx]
            ring[idx] = 0.499 * (ring[idx] + ring[(idx + 1) % delay])
        return out
    return np.sin(2*np.pi*freq*t, dtype=np.float32)

def _apply_filter(sig, cutoff_norm, resonance_norm=0.0):
    """
    🎓 Filtre passe-bas biquad du 2nd ordre avec résonance (formule RBJ).
    Utilisé dans tous les synthés hardware (Moog, TB-303, Juno...) car il sonne bien.

    cutoff_norm  : 0.05 = très sombre, 1.0 = filtre ouvert (aucun effet)
    resonance_norm : 0.0 = plat (Butterworth), 1.0 = forte résonance (pic à fc)

    🎓 Le facteur Q contrôle la résonance. Q=0.7 = Butterworth (pente douce).
       Q>2 = résonance audible. Q>8 = proche de l'auto-oscillation (effet acide).
       La formule RBJ vient de l'Audio EQ Cookbook de Robert Bristow-Johnson (1994),
       document de référence pour tous les filtres audionumériques.
    """
    if cutoff_norm >= 0.99 and resonance_norm < 0.01:
        return sig
    from scipy.signal import lfilter
    # 🎓 La fréquence de coupure normalisée fc = cutoff * 0.49 évite d'approcher
    #    la fréquence de Nyquist (0.5) qui cause une instabilité numérique.
    fc    = max(0.001, min(0.49, cutoff_norm * 0.49))
    Q     = 0.5 + resonance_norm * 14.5   # Q de 0.5 (plat) à 15.0 (acide)
    w0    = 2.0 * np.pi * fc
    alpha = np.sin(w0) / (2.0 * Q)
    cos_w = np.cos(w0)
    b0 = (1.0 - cos_w) / 2.0
    b1 =  1.0 - cos_w
    b2 = (1.0 - cos_w) / 2.0
    a0 =  1.0 + alpha
    a1 = -2.0 * cos_w
    a2 =  1.0 - alpha
    b = [b0/a0, b1/a0, b2/a0]
    a = [1.0,   a1/a0, a2/a0]
    return lfilter(b, a, sig).astype(np.float32)

def make_note(freq, dur_ms, age_mode, age_lvl, waveform="Sine",
              attack_ms=12, decay_ms=40, sustain_pct=55, release_ms=60,
              detune_ct=7, stereo_pct=50, sr=SAMPLE_RATE,
              wave_override=None):
    """
    🎓 Génère une note comme buffer numpy stéréo float32 (normalisé ±1.0).
    age_lvl : 0=vient de naître, 1=survie 1 génération, 2+=mature
    Tous les paramètres sonores sont maintenant configurables depuis l'UI.
    """
    n  = int(sr * dur_ms / 1000)
    t  = np.linspace(0, dur_ms/1000, n, dtype=np.float32)
    a  = min(int(age_lvl), 2)

    # 🎓 Enveloppe ADSR — les 4 phases d'un son de synthé :
    #   A (Attack)  : montée de 0 → pic (évite le clic de démarrage)
    #   D (Decay)   : descente rapide du pic → niveau de sustain
    #   S (Sustain) : tenu à niveau constant (la majorité de la note)
    #   R (Release) : extinction douce à la fin du buffer
    att_n = max(1, int(sr * attack_ms  / 1000))
    dec_n = max(1, int(sr * decay_ms   / 1000))
    sus   = sustain_pct / 100.0
    rel_n = max(1, int(sr * release_ms / 1000))
    env   = np.full(n, sus, dtype=np.float32)
    env[:att_n] = np.linspace(0.0, 1.0, att_n)
    d_end = min(att_n + dec_n, n)
    env[att_n:d_end] = np.linspace(1.0, sus, d_end - att_n)
    if rel_n < n:
        env[-rel_n:] = np.linspace(sus, 0.0, rel_n)

    # 🎓 Mode Sample : si wave_override est fourni (buffer numpy float32 pré-pitché),
    #    on l'utilise directement au lieu de synthétiser.
    #    Le sample est bouclé ou tronqué pour atteindre exactement la durée ADSR.
    #    Durée = 100% contrôlée par l'ADSR, indépendante de la hauteur du sample.
    if wave_override is not None:
        vol_scale = [0.25, 0.62, 1.0][a]   # âge 0=discret, 2=plein volume
        src = wave_override
        if len(src) >= n:
            f = src[:n].copy()
        else:
            # 🎓 np.tile répète le tableau jusqu'à la longueur voulue → "sustain loop"
            reps = (n // len(src)) + 1
            f = np.tile(src, reps)[:n].copy()
        f = (f * vol_scale * env).astype(np.float32)
        peak = np.max(np.abs(f))
        if peak > 0: f /= peak
        # Stéréo (ITD identique au mode synthèse)
        w = stereo_pct / 100.0
        if w <= 0:
            stereo = np.column_stack([f, f])
        else:
            pan_scale = [0.08, 0.18, 0.0][a]
            if a < 2:
                pan_l  = 1.0 - w * pan_scale
                stereo = np.column_stack([f * pan_l, f])
            else:
                dly    = max(1, int(sr * w * 0.0015))
                f_l    = np.concatenate([np.zeros(dly, dtype=np.float32), f[:-dly]])
                stereo = np.column_stack([f_l, f])
        return np.ascontiguousarray(stereo.astype(np.float32))

    if age_mode == "Harmoniques":
        # 🎓 Plus la cellule est vieille, plus on superpose d'harmoniques
        #    (multiples de la fréquence fondamentale). Son plus "riche".
        f = _make_wave(t, freq, waveform)
        if a >= 1: f = 0.75*f + 0.25*_make_wave(t, freq*2, waveform)
        if a >= 2: f = f      + 0.15*_make_wave(t, freq*3, waveform)
    elif age_mode == "Volume":
        # 🎓 L'âge contrôle uniquement l'amplitude. Son identique, volume différent.
        vol_scale = [0.25, 0.62, 1.0][a]
        f = _make_wave(t, freq, waveform) * vol_scale
    else:   # Timbre
        # 🎓 Les harmoniques impaires (×3) donnent un son plus "creux" (clarinette-like).
        f = _make_wave(t, freq, waveform)
        if a >= 1: f = f + 0.30*_make_wave(t, freq*3, waveform)
        if a >= 2: f = f + 0.28*_make_wave(t, freq*2, waveform) + 0.12*_make_wave(t, freq*4, waveform)

    # 🎓 Detune : second oscillateur légèrement désaccordé.
    #    S'applique à TOUS les âges (fix : avant seulement age>=2).
    #    L'intensité scale avec l'âge : born=25%, young=60%, mature=100%.
    if detune_ct > 0:
        ratio    = np.exp2(float(detune_ct) / 1200.0)
        det_mix  = [0.25, 0.60, 1.0][a]  # plus intense en vieillissant
        det_amt  = det_mix * 0.35        # max 35% du signal = second osc
        f = (1.0 - det_amt)*f + det_amt*_make_wave(t, freq * ratio, waveform)

    sig  = (f * env).astype(np.float32)
    peak = np.max(np.abs(sig))
    if peak > 0: sig /= peak

    # 🎓 Stéréo (ITD - Inter-aural Time Difference) : s'applique à tous les âges.
    #    age=0 → légère asymétrie L/R (son fragile mais pas mono),
    #    age=1 → asymétrie marquée,
    #    age=2 → délai ITD complet (sensation de largeur maximale).
    w = stereo_pct / 100.0
    if w <= 0:
        stereo = np.column_stack([sig, sig])
    else:
        pan_scale = [0.08, 0.18, 0.0][a]   # 0.0 → on utilise le délai pour age=2
        if a < 2:
            pan_l  = 1.0 - w * pan_scale
            stereo = np.column_stack([sig * pan_l, sig])
        else:
            delay  = max(1, int(sr * w * 0.0015))
            sig_l  = np.concatenate([np.zeros(delay, dtype=np.float32), sig[:-delay]])
            stereo = np.column_stack([sig_l, sig])
    return np.ascontiguousarray(stereo.astype(np.float32))

# ══════════════════════════════════════════════════════════════════════════════
# COMPOSANTS UI
# ══════════════════════════════════════════════════════════════════════════════
class Slider:
    def __init__(self, x, y, w, lo, hi, val, label, integer=True, color=None):
        self.rect = pygame.Rect(x, y, w, 20); self.track = pygame.Rect(x, y+7, w, 6)
        self.lo, self.hi = float(lo), float(hi); self._v = float(val)
        self.label = label; self.integer = integer
        self.color = color or C_ACCENT; self.dragging = False
    @property
    def value(self): return int(self._v) if self.integer else round(self._v, 2)
    @value.setter
    def value(self, v): self._v = max(self.lo, min(self.hi, float(v)))
    @property
    def norm(self): return (self._v - self.lo) / (self.hi - self.lo)
    def hxy(self): return (int(self.rect.x + self.norm*self.rect.width), self.rect.y+10)
    def draw(self, surf, font):
        surf.blit(font.render(f"{self.label}:  {self.value}", True, C_TEXT),
                  (self.rect.x, self.rect.y-18))
        pygame.draw.rect(surf, (38,44,64), self.track, border_radius=3)
        fw = max(0, int(self.norm * self.track.width))
        if fw: pygame.draw.rect(surf, self.color,
                                pygame.Rect(self.track.x, self.track.y, fw, self.track.height),
                                border_radius=3)
        hx, hy = self.hxy()
        pygame.draw.circle(surf, self.color, (hx, hy), 8)
        pygame.draw.circle(surf, (215,230,255), (hx, hy), 8, 2)
    def handle_event(self, ev):
        # 🎓 just_released : True uniquement sur l'event MOUSEBUTTONUP qui termine un drag.
        #    Utilisé pour déclencher _rebuild_sounds() une seule fois à la fin du geste,
        #    pas 60× par seconde pendant le glissement.
        self.just_released = False
        if ev.type == pygame.MOUSEBUTTONDOWN and ev.button == 1:
            if math.dist(ev.pos, self.hxy()) < 14 or self.track.collidepoint(ev.pos):
                self.dragging = True
        elif ev.type == pygame.MOUSEBUTTONUP:
            if self.dragging: self.just_released = True
            self.dragging = False
        elif ev.type == pygame.MOUSEMOTION and self.dragging:
            r = (ev.pos[0]-self.rect.x) / self.rect.width
            self._v = max(self.lo, min(self.hi, self.lo + r*(self.hi-self.lo)))

class Button:
    def __init__(self, x, y, w, h, label, toggle=False, active=False, color_on=None):
        self.rect = pygame.Rect(x, y, w, h); self.label = label
        self.toggle = toggle; self.active = active
        self.color_on = color_on or (55,115,195); self.hovered = False; self.just_clicked = False
    def draw(self, surf, font):
        bg = self.color_on if self.active else (C_BTN_HOVER if self.hovered else C_BTN)
        pygame.draw.rect(surf, bg, self.rect, border_radius=6)
        pygame.draw.rect(surf, C_BTN_BORDER, self.rect, 1, border_radius=6)
        t = font.render(self.label, True, C_TEXT)
        surf.blit(t, (self.rect.centerx - t.get_width()//2,
                      self.rect.centery - t.get_height()//2))
    def handle_event(self, ev):
        self.just_clicked = False
        if ev.type == pygame.MOUSEMOTION:
            self.hovered = self.rect.collidepoint(ev.pos)
        elif ev.type == pygame.MOUSEBUTTONDOWN and ev.button == 1 and self.rect.collidepoint(ev.pos):
            self.just_clicked = True
            if self.toggle: self.active = not self.active
            return True
        return False

class Cycle:
    def __init__(self, x, y, w, label, options, default=0):
        self.x, self.y, self.w = x, y, w
        self.label = label; self.options = options; self.index = default; self.changed = False
        self.bl = Button(x, y+14, 24, 20, "<")
        self.br = Button(x+w-24, y+14, 24, 20, ">")
    @property
    def name(self): return self.options[self.index]
    def draw(self, surf, font, fsm):
        if self.label: surf.blit(font.render(self.label, True, C_TEXT_DIM), (self.x, self.y))
        self.bl.draw(surf, fsm); self.br.draw(surf, fsm)
        t = fsm.render(self.name, True, C_TEXT)
        surf.blit(t, (self.x + self.w//2 - t.get_width()//2, self.y+16))
    def handle_event(self, ev):
        self.changed = False
        if self.bl.handle_event(ev) and self.bl.just_clicked:
            self.index = (self.index-1) % len(self.options); self.changed = True
        if self.br.handle_event(ev) and self.br.just_clicked:
            self.index = (self.index+1) % len(self.options); self.changed = True

# ══════════════════════════════════════════════════════════════════════════════
# SIMULATEUR PRINCIPAL
# ══════════════════════════════════════════════════════════════════════════════
class Sim:
    def __init__(self):
        # 🎓 SDL_AUDIODRIVER=dummy : empêche pygame/SDL de capturer le device audio.
        #    Sans ça, SDL prend le device avant sounddevice et on n'entend rien.
        os.environ.setdefault("SDL_AUDIODRIVER", "dummy")
        pygame.display.init(); pygame.font.init()
        # 🎓 pygame.SCALED (pygame 2.0+) : fenêtre redimensionnable où pygame gère
        #    automatiquement le scaling et la conversion des coordonnées souris.
        #    Zéro refactoring des widgets — tout reste en coordonnées logiques fixes.
        self.screen = pygame.display.set_mode((WINDOW_W, WINDOW_H),
                                              pygame.RESIZABLE | pygame.SCALED)
        pygame.display.set_caption("LIF2D — Simulateur v5 Steampunk")
        self.clock = pygame.time.Clock()
        self.font = pygame.font.SysFont("monospace", 13)
        self.fsm  = pygame.font.SysFont("monospace", 11)
        self.flg  = pygame.font.SysFont("monospace", 17, bold=True)
        self.fttl = pygame.font.SysFont("monospace", 20, bold=True)

        self.lib = load_gol_lib()
        self.audio = AudioEngine()

        G = ctypes.c_uint8 * (GRID_COLS*GRID_ROWS)
        self.ga, self.gb = G(), G()   # grilles GoL (double-buffering)
        self.aa, self.ab = G(), G()   # grilles d'âge
        self.lib.gol_seed(int(time.time()) & 0xFFFFFFFF)
        self.lib.gol_randomize(self.ga, ctypes.c_float(0.35))

        # 🎓 Démarrage en pause : l'utilisateur choisit quand commencer
        self.playing    = False
        self.show_stats = False   # touche I pour afficher le HUD de perfs
        self.draw_mode = False
        self.col       = 0
        self.tick_acc  = 0.0
        self.gen       = 0
        self.octave    = 4
        self.history   = deque(maxlen=8)
        self.loop_frozen = []; self.loop_active = False; self.loop_pos = 0
        self.sounds    = {}

        # 🎓 Sample .wav : buffer float32 mono à SAMPLE_RATE, chargé depuis un fichier.
        #    None = pas de sample chargé (synthèse normale si waveform != "Sample").
        self.sample_raw  = None   # np.ndarray float32 mono
        self.sample_name = ""     # nom du fichier affiché dans le panneau

        # Arpégiateur
        self.arp_on       = False
        self.arp_schedule = []
        self.arp_time     = 0.0
        self.arp_col      = 0

        # ── Construction de l'UI ─────────────────────────────────────────────
        # 🎓 Deux panneaux : gauche (transport/GoL) et droit (design sonore)
        lx  = LP_X  + 14;  lw  = LP_W  - 28;  lbw = (lw - 8) // 3   # left panel
        rx  = RP_X  + 14;  rw  = RP_W  - 28;  rhw = (rw - 4) // 2   # right panel
        rrx = rx + rhw + 4                                             # right col in right panel
        C_ENV = (210, 150, 50)   # couleur cuivre-or pour l'enveloppe ADSR

        # ── PANNEAU GAUCHE ────────────────────────────────────────────────────
        self.sl_bpm    = Slider(lx,  62, lw,  0, 50, 20, "BPM",       color=C_WARM)
        self.sl_vol    = Slider(lx, 112, lw,  0,100, 50, "Volume %")
        self.sl_bright = Slider(lx, 162, lw, 10,100, 85, "Lumiere %")

        # 🎓 Root note : la note de base de la gamme.
        #    La penta en La (A) n'a pas les mêmes fréquences qu'en Sol (G).
        self.cy_root   = Cycle(lx, 216, lw, "Tonique",   ROOT_NOTES,     default=0)
        self.cy_scale  = Cycle(lx, 264, lw, "Gamme",     SCALE_NAMES,    default=0)
        self.cy_rule   = Cycle(lx, 312, lw, "Regle GoL", GOL_RULE_NAMES, default=0)

        self.btn_play  = Button(lx,            372, lbw,28,"Play",  toggle=True, active=False, color_on=C_GREEN)
        self.btn_reset = Button(lx+lbw+4,      372, lbw,28,"Reset")
        self.btn_clear = Button(lx+2*(lbw+4),  372, lbw,28,"Clear", color_on=C_RED)
        self.btn_draw  = Button(lx,            412, lbw,28,"Dessin",toggle=True, active=False, color_on=C_PURPLE)
        self.btn_save  = Button(lx+lbw+4,      412, lbw,28,"Save",  color_on=C_ORANGE)
        self.btn_load  = Button(lx+2*(lbw+4),  412, lbw,28,"Load",  color_on=C_ORANGE)

        self.btn_oct_dn = Button(lx,      460, 36,24,"-")
        self.btn_oct_up = Button(lx+76,   460, 36,24,"+")

        self.cy_sym = Cycle(lx, 502, lw, "Symetrie", SYM_MODES, default=0)

        self.btn_loop    = Button(lx,      554, 78,26,"Loop", toggle=True,active=False,color_on=C_ACCENT)
        self.cy_loop_ln  = Cycle(lx+84,   554, 66,"",["x2","x4","x8"],default=1)
        self.btn_loop_pp = Button(lx+156,  554, 58,26,"->")

        self.btn_arp      = Button(lx,     604, 78,26,"Arp",toggle=True,active=False,color_on=C_TEAL)
        self.cy_arp_mode  = Cycle(lx+84,  604, lw-88,"",ARP_MODES,  default=0)
        self.cy_arp_speed = Cycle(lx,     650, lw,   "",ARP_SPEEDS, default=0)

        # ── PANNEAU DROIT ─────────────────────────────────────────────────────
        # 🎓 cy_preset : banque de sons prédéfinis. Chaque preset charge un jeu complet
        #    de paramètres (waveform + ADSR + detune + stereo + filtre).
        #    "Libre" = pas de preset, contrôle manuel de chaque paramètre.
        self.cy_preset       = Cycle(rx,  18, rhw, "", PRESET_NAMES, default=0)
        self.btn_reset_sound = Button(rrx, 26, rhw, 22, "Reset son", color_on=C_RED)

        self.cy_wave   = Cycle(rx,  66, rw, "Forme d'onde", WAVEFORMS, default=0)

        # ── SAMPLE .WAV ────────────────────────────────────────────────────────
        self.btn_load_sample = Button(rx, 112, rw, 22, "Charger .wav", color_on=C_TEAL)
        self.cy_sample_base  = Cycle(rx, 140, rhw, "", SAMPLE_BASE_NOTES, default=33)

        # ── FILTRE BIQUAD ──────────────────────────────────────────────────────
        # 🎓 Cutoff + Résonance : paire classique de tout synthé hardware.
        #    Cutoff = fréquence de coupure du filtre passe-bas (brillance du son).
        #    Résonance = accentuation des fréquences proches de la coupure.
        #    Ensemble ils recréent le son "TB-303", "Moog filter", "Juno chorus"...
        self.sl_cutoff    = Slider(rx,  202, rhw, 5, 100, 100, "Cutoff %")
        self.sl_resonance = Slider(rrx, 202, rhw, 0, 100,   0, "Reson %",  color=C_PURPLE)

        self.cy_age    = Cycle(rx,  254, rw, "Age -> Son", AGE_MODES, default=0)

        # AGE GENERATION (filtre de lecture — zéro rebuild)
        self.sl_age_max  = Slider(rx,  314, rhw, 1, 8, 8, "Age max",  color=C_ACCENT)
        self.sl_age_mute = Slider(rrx, 314, rhw, 1, 8, 8, "Mute>=",   color=C_RED)

        # ADSR
        self.sl_attack  = Slider(rx,  378, rhw,  1, 200,  12, "Att ms", color=C_ENV)
        self.sl_decay   = Slider(rrx, 378, rhw,  1, 200,  40, "Dec ms", color=C_ENV)
        self.sl_sustain = Slider(rx,  422, rhw,  0, 100,  55, "Sus %",  color=C_ENV)
        self.sl_release = Slider(rrx, 422, rhw,  1, 200,  60, "Rel ms", color=C_ENV)

        # SYNTHESE
        self.sl_detune  = Slider(rx,  482, rw,  0,  50,   7, "Detune cents")
        self.sl_stereo  = Slider(rx,  528, rw,  0, 100,  50, "Stereo %")

        # EFFETS (pedalboard)
        self.btn_reverb     = Button(rx,  582, rhw, 26, "Reverb",
                                     toggle=True, active=False, color_on=C_TEAL)
        self.btn_chorus     = Button(rrx, 582, rhw, 26, "Chorus",
                                     toggle=True, active=False, color_on=C_PURPLE)
        self.sl_reverb_room = Slider(rx,  622, rw,  0, 100, 30, "Room %", color=C_TEAL)

        # EFFETS RYTHMIQUES BPM-synced
        self.btn_phaser      = Button(rx,  688, rhw, 26, "Phaser",
                                      toggle=True, active=False, color_on=C_ORANGE)
        self.btn_flanger     = Button(rrx, 688, rhw, 26, "Flanger",
                                      toggle=True, active=False, color_on=C_WARM)
        self.cy_phaser_div   = Cycle(rx,   726, rw,  "", PHASER_DIVS, default=2)
        self.sl_phaser_depth = Slider(rx,  774, rhw, 0, 100, 70, "Ph depth%", color=C_ORANGE)
        self.sl_flanger_depth= Slider(rrx, 774, rhw, 0, 100, 70, "Fl depth%", color=C_WARM)

        self._rebuild_sounds()

    # ── Audio ──────────────────────────────────────────────────────────────────
    def _apply_preset(self):
        """Applique le preset sélectionné dans cy_preset (sauf "Libre")."""
        p = SOUND_PRESETS.get(self.cy_preset.name)
        if p is None: return   # "Libre" : rien à faire
        self.cy_wave.index       = WAVEFORMS.index(p["waveform"]) if p["waveform"] in WAVEFORMS else 0
        self.sl_attack.value     = p["attack"]
        self.sl_decay.value      = p["decay"]
        self.sl_sustain.value    = p["sustain"]
        self.sl_release.value    = p["release"]
        self.sl_detune.value     = p["detune"]
        self.sl_stereo.value     = p["stereo"]
        self.sl_cutoff.value     = p["filter"]
        self.sl_resonance.value  = p.get("resonance", 0)
        self.cy_age.index        = AGE_MODES.index(p["age_mode"]) if p["age_mode"] in AGE_MODES else 0
        self._rebuild_sounds()

    def _reset_sound_params(self):
        """Remet tous les paramètres du panneau droit à leurs valeurs par défaut."""
        self.cy_preset.index      = 0          # Libre
        self.cy_wave.index        = 0          # Sine
        self.sl_cutoff.value      = 100
        self.sl_resonance.value   = 0
        self.cy_age.index         = 0          # Harmoniques
        self.sl_age_max.value     = 8
        self.sl_age_mute.value    = 8
        self.sl_attack.value      = 12
        self.sl_decay.value       = 40
        self.sl_sustain.value     = 55
        self.sl_release.value     = 60
        self.sl_detune.value      = 7
        self.sl_stereo.value      = 50
        self.btn_reverb.active    = False
        self.btn_chorus.active    = False
        self.sl_reverb_room.value = 30
        self.btn_phaser.active    = False
        self.btn_flanger.active   = False
        self.cy_phaser_div.index  = 2          # "1" = 1 mesure
        self.sl_phaser_depth.value  = 70
        self.sl_flanger_depth.value = 70
        self._rebuild_sounds()

    def _rebuild_sounds(self):
        """(Re)calcule tous les buffers de notes.
        🎓 Toutes les transformations coûteuses (filtre, pedalboard) sont calculées
        UNE SEULE FOIS ici, puis stockées. À la lecture, c'est juste un array.copy()
        → zéro calcul temps-réel = son fluide même à haute densité GoL.
        """
        scale    = self.cy_scale.name
        mode     = self.cy_age.name
        waveform = self.cy_wave.name
        bpm      = max(1, self.sl_bpm.value)
        # 🎓 Cap à 500ms : sans ça, à BPM=5 la durée serait 1875ms → buffer de 660 KB
        #    × 48 sons = 31 MB juste pour le dict sons. Le cap garde ~8 MB max.
        dur      = min(500, max(150, int(60000 / bpm / GRID_COLS * 2.5)))
        filter_norm    = self.sl_cutoff.value    / 100.0
        resonance_norm = self.sl_resonance.value / 100.0

        # 🎓 Chaîne pedalboard : effets calculés une seule fois pour tout le rebuild.
        #    L'ordre compte : Phaser/Flanger d'abord (modulation), puis Chorus/Reverb (espace).
        board = None
        if HAS_PB and any([self.btn_reverb.active, self.btn_chorus.active,
                           self.btn_phaser.active, self.btn_flanger.active]):
            chain = []
            # 🎓 div_map : facteur de durée en mesures GoL.
            #    "4" = 4 mesures (lent), "1" = 1 mesure (16 cols), "1/32" = ultra-rapide.
            #    rate_hz = 1 / (durée_mesure × facteur)
            col_ms  = 60000.0 / max(1, bpm) / GRID_COLS
            measure_ms = col_ms * GRID_COLS
            div_map = {"4":4.0,"2":2.0,"1":1.0,"1/2":0.5,"1/4":0.25,
                       "1/8":0.125,"1/16":0.0625,"1/32":0.03125}
            factor  = div_map.get(self.cy_phaser_div.name, 1.0)
            rate_hz = max(0.05, 1000.0 / (measure_ms * factor))
            if HAS_PHASER and self.btn_phaser.active:
                # 🎓 Rate BPM-synced : 1 cycle LFO = factor × durée_mesure
                mix_ph = self.sl_phaser_depth.value / 100.0
                chain.append(_PBPhaser(rate_hz=rate_hz, depth=0.9, feedback=0.6, mix=mix_ph))
            if self.btn_flanger.active:
                # 🎓 Flanger = Chorus avec délai très court (2ms) + feedback élevé.
                #    Le battement entre signal direct et signal retardé crée l'effet "jet".
                mix_fl = self.sl_flanger_depth.value / 100.0
                chain.append(Chorus(rate_hz=rate_hz, depth=1.0,
                                    centre_delay_ms=2.0, feedback=0.6, mix=mix_fl))
            if self.btn_reverb.active:
                chain.append(Reverb(room_size=self.sl_reverb_room.value / 100.0))
            if self.btn_chorus.active:
                chain.append(Chorus())
            board = Pedalboard(chain)

        self.sounds = {}
        root = self.cy_root.index   # 🎓 0=C, 2=D, 9=A … transposition de toute la gamme

        # 🎓 Mode Sample : calcul de la note de base MIDI depuis cy_sample_base.
        #    Formule : note_idx = index dans ROOT_NOTES (0=C … 11=B)
        #              octave   = 2 + (index_global // 12)
        #              midi     = 12 * (octave + 1) + note_idx
        #    Ex: A4 → index=33, octave=2+2=4, midi=12*5+9=69 ✓
        sample_base_midi = None
        if waveform == "Sample" and self.sample_raw is not None:
            idx = self.cy_sample_base.index
            sample_base_midi = 12 * (2 + idx // 12 + 1) + (idx % 12)

        for row in range(GRID_ROWS):
            midi = row_to_midi(row, scale, self.octave, root)
            freq = midi_to_freq(midi)

            # 🎓 Pré-pitchage du sample (une fois par ligne, partagé entre les 3 niveaux d'âge).
            #    semitones = écart entre la note de grille et la note enregistrée du sample.
            #    factor = 2^(semitones/12) — facteur de rééchantillonnage.
            #    np.interp = interpolation linéaire ultrarapide (aucune FFT).
            wave_ov = None
            if sample_base_midi is not None:
                semitones = midi - sample_base_midi
                factor    = 2.0 ** (semitones / 12.0)
                new_len   = max(2, int(len(self.sample_raw) / factor))
                old_ix    = np.arange(len(self.sample_raw), dtype=np.float32)
                new_ix    = np.linspace(0, len(self.sample_raw)-1, new_len, dtype=np.float32)
                wave_ov   = np.interp(new_ix, old_ix, self.sample_raw).astype(np.float32)

            for a in (0, 1, 2):   # âge 0=né, 1=jeune, 2=mature
                buf = make_note(freq, dur, mode, a, waveform,
                               self.sl_attack.value,  self.sl_decay.value,
                               self.sl_sustain.value, self.sl_release.value,
                               self.sl_detune.value,  self.sl_stereo.value,
                               wave_override=wave_ov)

                # 🎓 Filtre baked : appliqué ici une fois, pas à chaque lecture
                if filter_norm < 0.99 or resonance_norm > 0.01:
                    mono = _apply_filter(buf[:, 0], filter_norm, resonance_norm)
                    buf  = np.ascontiguousarray(np.column_stack([mono, mono]))

                # 🎓 Pedalboard : traitement DSP offline → aucun coût à la lecture
                if board is not None:
                    try:
                        # pedalboard attend (num_channels, num_samples)
                        processed = board(buf.T.copy(), SAMPLE_RATE)
                        peak = np.max(np.abs(processed))
                        if peak > 0: processed /= peak
                        buf = np.ascontiguousarray(processed.T.astype(np.float32))
                    except Exception:
                        pass  # fallback sur le buffer sans effet

                # 🎓 On convertit en int16 avant de stocker.
                #    float32 = 4 octets/sample, int16 = 2 octets/sample → ÷2 en RAM.
                #    np.clip évite le dépassement (float > 1.0 deviendrait garbage en int16).
                #    Combiné avec SAMPLE_RATE 22050 : le dict sons prend ~3 MB au lieu de ~12 MB.
                buf_i16 = (np.clip(buf, -1.0, 1.0) * 32767).astype(np.int16)
                self.sounds[(row, a)] = buf_i16

    def _play_note(self, row, col):
        """Joue une note unique. Filtre et effets déjà baked dans self.sounds."""
        age_raw = int(self.aa[row * GRID_COLS + col])
        # 🎓 sl_age_max : plafonne l'âge → cellules très vieilles traitées comme "mature" (âge 2).
        #    sl_age_mute : cellules à partir de cet âge sont muettes (20 = jamais muet).
        #    Ces deux filtres n'ont AUCUN coût de rebuild : appliqués uniquement à la lecture.
        age_raw = min(age_raw, self.sl_age_max.value)
        if age_raw >= self.sl_age_mute.value: return
        a   = min(age_raw, 2)
        buf = self.sounds.get((row, a))
        if buf is None: return
        self.audio.play(buf, self.sl_vol.value / 100.0)

    def _play_col(self, col):
        for row in range(GRID_ROWS):
            if self.lib.gol_get(self.ga, col, row):
                self._play_note(row, col)

    def _build_arp_schedule(self, col):
        """
        🎓 Arpège : collecte les notes vivantes de la colonne, les trie selon
        le mode, puis calcule le moment de chaque note dans le tick courant.
        """
        self.arp_col = col
        live = [r for r in range(GRID_ROWS) if self.lib.gol_get(self.ga, col, r)]
        if not live:
            self.arp_schedule = []; self.arp_time = 0.0; return

        mode = self.cy_arp_mode.name
        if   mode == "Up":        notes = sorted(live)
        elif mode == "Down":      notes = sorted(live, reverse=True)
        elif mode == "Random":    notes = live[:]; rnd.shuffle(notes)
        elif mode == "Ping-pong":
            s = sorted(live)
            notes = s + s[-2:0:-1] if len(s) > 1 else s
        elif mode == "Chord":     notes = [live[0]]  # juste la première note (la plus grave)
        elif mode == "Chord Ping-pong":
            s = sorted(live)
            notes = [s[0]] + s[1:] + s[-2:0:-1] if len(s) > 1 else s
        elif mode == "Groove":    notes = sorted(live)[::2]  # les notes paires pour un rythme plus "groovy"

        speed = self.cy_arp_speed.name
        tick  = self._tick_ms()
        if speed == "Auto":
            divs = len(notes); seq = notes
        else:
            divs = int(speed[1:])
            seq  = [notes[i % len(notes)] for i in range(divs)]

        sub_ms = tick / max(divs, 1)
        self.arp_schedule = [(i * sub_ms, row) for i, row in enumerate(seq)]
        self.arp_time = 0.0

    # ── Grille ────────────────────────────────────────────────────────────────
    def _grid_pos(self, pos):
        gx = (pos[0]-GRID_OFF_X)//CELL_STEP; gy = (pos[1]-GRID_OFF_Y)//CELL_STEP
        return (gx, gy) if 0<=gx<GRID_COLS and 0<=gy<GRID_ROWS else (None, None)

    def _tick_ms(self):
        bpm = self.sl_bpm.value
        # 🎓 BPM=0 = mode gelé (tick infiniment long → rien ne bouge)
        return 60000.0/bpm/GRID_COLS if bpm > 0 else 999999.0

    def _do_reset(self):
        self.lib.gol_randomize(self.ga, ctypes.c_float(0.35))
        ctypes.memset(self.aa, 0, GRID_COLS*GRID_ROWS); self._apply_sym()
        self.col=0; self.gen=0; self.history.clear()
        self.loop_active=False; self.btn_loop.active=False
        self.arp_schedule=[]; self.arp_time=0.0

    def _do_clear(self):
        self.lib.gol_clear(self.ga); ctypes.memset(self.aa, 0, GRID_COLS*GRID_ROWS)
        self.col=0; self.gen=0; self.history.clear()
        self.loop_active=False; self.btn_loop.active=False
        self.arp_schedule=[]; self.arp_time=0.0

    def _apply_sym(self):
        mode = self.cy_sym.name
        if mode == "Aucune": return
        arr = np.frombuffer(bytes(self.ga), dtype=np.uint8).reshape(GRID_ROWS, GRID_COLS).copy()
        h, w = GRID_ROWS, GRID_COLS
        if   mode == "Axiale X":  arr[:,w//2:]   = arr[:,:w//2][:,::-1]
        elif mode == "Axiale Y":  arr[h//2:,:]   = arr[:h//2,:][::-1,:]
        elif mode == "Co-axiale": arr[:,w//2:]   = arr[:,:w//2][:,::-1]; arr[h//2:,:] = arr[:h//2,:][::-1,:]
        elif mode == "Centrale":  arr[h//2:,:]   = arr[:h//2,:][::-1,::-1]
        ctypes.memmove(self.ga, arr.tobytes(), GRID_COLS*GRID_ROWS)

    def _save(self):
        path = os.path.join(PATTERNS_DIR,
                            datetime.datetime.now().strftime("%Y%m%d_%H%M%S") + ".map")
        arr = np.frombuffer(bytes(self.ga), dtype=np.uint8).reshape(GRID_ROWS, GRID_COLS)
        with open(path, "w") as f:
            for row in arr: f.write("".join(map(str, row)) + "\n")
        print(f"Sauvegarde: {path}")

    def _load_file(self, path):
        """Lit un fichier .map et l'injecte dans la grille GoL."""
        try:
            with open(path) as f: lines = [l.strip() for l in f if l.strip()]
            arr  = np.array([[int(c) for c in line[:GRID_COLS]] for line in lines[:GRID_ROWS]], dtype=np.uint8)
            full = np.zeros((GRID_ROWS, GRID_COLS), dtype=np.uint8)
            full[:arr.shape[0], :arr.shape[1]] = arr
            ctypes.memmove(self.ga, full.tobytes(), GRID_COLS*GRID_ROWS)
            ctypes.memset(self.aa, 0, GRID_COLS*GRID_ROWS)
            self.col=0; self.gen=0; self.history.clear()
            self.loop_active=False; self.btn_loop.active=False
            print(f"Chargé: {path}")
        except Exception as e:
            print(f"Erreur chargement: {e}")

    def _load(self):
        """
        🎓 Sélecteur de patterns pygame-natif.
        Pas de tkinter = pas de conflit X11/SDL → plus de freeze/reboot.
        Affiche un overlay avec la liste des .map disponibles.
        Contrôles : ↑↓ pour naviguer, Entrée ou clic pour charger, ESC pour annuler.
        """
        files = sorted(f for f in os.listdir(PATTERNS_DIR) if f.endswith(".map"))
        if not files:
            print("Aucun pattern dans", PATTERNS_DIR); return

        MAX_VIS = 16          # lignes visibles simultanément
        ROW_H   = 22
        OW      = 420
        OH      = min(MAX_VIS * ROW_H + 52, len(files) * ROW_H + 52)
        ox      = (WINDOW_W - OW) // 2
        oy      = (WINDOW_H - OH) // 2
        selected = 0
        scroll   = 0          # indice de la première ligne visible

        while True:
            # ── fond overlay ─────────────────────────────────────────────────
            surf = pygame.Surface((OW, OH))
            surf.fill((18, 13, 8))
            pygame.draw.rect(surf, C_BORDER, (0, 0, OW, OH), 2)
            surf.blit(self.font.render("Charger pattern  (↑↓ Entrée / ESC)", True, C_ACCENT),
                      (10, 10))
            pygame.draw.line(surf, C_BORDER, (4, 30), (OW-4, 30), 1)

            # ── liste des fichiers ────────────────────────────────────────────
            visible = files[scroll : scroll + MAX_VIS]
            for i, fname in enumerate(visible):
                abs_i = scroll + i
                y     = 36 + i * ROW_H
                if abs_i == selected:
                    pygame.draw.rect(surf, C_BTN_HOVER, (4, y-1, OW-8, ROW_H-1), border_radius=3)
                col = C_TEXT if abs_i == selected else C_TEXT_DIM
                surf.blit(self.fsm.render(fname, True, col), (12, y+2))

            # ── indicateur de scroll ─────────────────────────────────────────
            if len(files) > MAX_VIS:
                sb_h  = max(20, OH * MAX_VIS // len(files))
                sb_y  = 36 + (OH - 36) * scroll // len(files)
                pygame.draw.rect(surf, C_BORDER, (OW-6, sb_y, 4, sb_h), border_radius=2)

            self.screen.blit(surf, (ox, oy))
            pygame.display.flip()

            # ── événements ───────────────────────────────────────────────────
            for ev in pygame.event.get():
                if ev.type == pygame.QUIT:
                    return
                if ev.type == pygame.KEYDOWN:
                    if ev.key == pygame.K_ESCAPE:
                        return
                    elif ev.key == pygame.K_UP:
                        selected = max(0, selected - 1)
                        if selected < scroll: scroll = selected
                    elif ev.key == pygame.K_DOWN:
                        selected = min(len(files) - 1, selected + 1)
                        if selected >= scroll + MAX_VIS: scroll = selected - MAX_VIS + 1
                    elif ev.key in (pygame.K_RETURN, pygame.K_KP_ENTER):
                        self._load_file(os.path.join(PATTERNS_DIR, files[selected]))
                        return
                elif ev.type == pygame.MOUSEBUTTONDOWN and ev.button == 1:
                    mx, my = ev.pos[0] - ox, ev.pos[1] - oy
                    if 0 <= mx <= OW and 36 <= my < OH:
                        idx = scroll + (my - 36) // ROW_H
                        if 0 <= idx < len(files):
                            self._load_file(os.path.join(PATTERNS_DIR, files[idx]))
                            return
                elif ev.type == pygame.MOUSEWHEEL:
                    scroll = max(0, min(len(files) - MAX_VIS, scroll - ev.y))
            # 🎓 Sans cette pause, la boucle tourne à 100% CPU → système gelé.
            #    wait(16) = ~60 fps max, le reste du CPU reste disponible pour l'OS.
            pygame.time.wait(16)

    def _load_sample_wav(self):
        """
        🎓 Sélecteur de samples .wav — overlay pygame-natif identique à _load().
        Cherche les .wav dans simulator/samples/.
        → Pour ajouter un sample : dépose le fichier dans ce dossier et recharge.
        """
        files = sorted(f for f in os.listdir(SAMPLES_DIR) if f.lower().endswith(".wav"))
        if not files:
            print(f"Aucun .wav dans {SAMPLES_DIR}")
            print(f"→ Dépose tes fichiers .wav dans : {SAMPLES_DIR}")
            return

        MAX_VIS = 16; ROW_H = 22
        OW  = 440
        OH  = min(MAX_VIS * ROW_H + 52, len(files) * ROW_H + 52)
        ox  = (WINDOW_W - OW) // 2
        oy  = (WINDOW_H - OH) // 2
        selected = 0; scroll = 0

        while True:
            surf = pygame.Surface((OW, OH)); surf.fill((18, 13, 8))
            pygame.draw.rect(surf, C_BORDER, (0, 0, OW, OH), 2)
            surf.blit(self.font.render("Charger sample .wav  (↑↓ Entrée / ESC)", True, C_TEAL), (10, 10))
            pygame.draw.line(surf, C_BORDER, (4, 30), (OW-4, 30), 1)
            for i, fname in enumerate(files[scroll : scroll + MAX_VIS]):
                abs_i = scroll + i; y = 36 + i * ROW_H
                if abs_i == selected:
                    pygame.draw.rect(surf, C_BTN_HOVER, (4, y-1, OW-8, ROW_H-1), border_radius=3)
                surf.blit(self.fsm.render(fname, True, C_TEXT if abs_i == selected else C_TEXT_DIM), (12, y+2))
            if len(files) > MAX_VIS:
                sb_h = max(20, OH * MAX_VIS // len(files))
                sb_y = 36 + (OH - 36) * scroll // len(files)
                pygame.draw.rect(surf, C_BORDER, (OW-6, sb_y, 4, sb_h), border_radius=2)
            self.screen.blit(surf, (ox, oy)); pygame.display.flip()
            for ev in pygame.event.get():
                if ev.type == pygame.QUIT: return
                if ev.type == pygame.KEYDOWN:
                    if ev.key == pygame.K_ESCAPE: return
                    elif ev.key == pygame.K_UP:
                        selected = max(0, selected-1)
                        if selected < scroll: scroll = selected
                    elif ev.key == pygame.K_DOWN:
                        selected = min(len(files)-1, selected+1)
                        if selected >= scroll + MAX_VIS: scroll = selected - MAX_VIS + 1
                    elif ev.key in (pygame.K_RETURN, pygame.K_KP_ENTER):
                        self._load_wav_file(os.path.join(SAMPLES_DIR, files[selected])); return
                elif ev.type == pygame.MOUSEBUTTONDOWN and ev.button == 1:
                    mx, my = ev.pos[0]-ox, ev.pos[1]-oy
                    if 0 <= mx <= OW and 36 <= my < OH:
                        idx = scroll + (my-36) // ROW_H
                        if 0 <= idx < len(files):
                            self._load_wav_file(os.path.join(SAMPLES_DIR, files[idx])); return
                elif ev.type == pygame.MOUSEWHEEL:
                    scroll = max(0, min(len(files)-MAX_VIS, scroll - ev.y))
            pygame.time.wait(16)

    def _load_wav_file(self, path):
        """
        🎓 Charge un fichier .wav et le prépare pour la synthèse par sample.
        Étapes :
          1. Lecture via scipy.io.wavfile (supporte PCM 8/16/32 bits et float)
          2. Conversion en float32 mono (moyenne L+R si stéréo)
          3. Rééchantillonnage à SAMPLE_RATE si le .wav a un taux différent
             (ex: .wav 44100 Hz → 22050 Hz via numpy.interp, rapide et sans artefacts majeurs)
        """
        try:
            from scipy.io import wavfile
            rate, data = wavfile.read(path)
            # Conversion en float32 normalisé -1.0..+1.0
            if data.dtype == np.int16:
                data = data.astype(np.float32) / 32768.0
            elif data.dtype == np.int32:
                data = data.astype(np.float32) / 2147483648.0
            elif data.dtype == np.uint8:
                data = (data.astype(np.float32) - 128.0) / 128.0
            else:
                data = data.astype(np.float32)
            # Stéréo → mono
            if data.ndim == 2:
                data = data.mean(axis=1)
            # Rééchantillonnage si besoin (ex: 44100 → 22050 Hz)
            if rate != SAMPLE_RATE:
                new_len = int(len(data) * SAMPLE_RATE / rate)
                old_ix  = np.arange(len(data))
                new_ix  = np.linspace(0, len(data)-1, new_len)
                data    = np.interp(new_ix, old_ix, data).astype(np.float32)
            self.sample_raw  = data
            self.sample_name = os.path.basename(path)
            print(f"Sample chargé : {self.sample_name}  "
                  f"({len(data)} samples, {len(data)/SAMPLE_RATE:.2f}s)")
            if self.cy_wave.name == "Sample":
                self._rebuild_sounds()
        except Exception as e:
            print(f"Erreur chargement sample : {e}")

    def _toggle_loop(self):
        if self.btn_loop.active:
            buf = list(self.history)
            if not buf: print("Pas d'historique"); self.btn_loop.active=False; return
            length = LOOP_LENS[self.cy_loop_ln.name]
            self.loop_frozen = buf[-min(length, len(buf)):]; self.loop_pos = 0; self.loop_active = True
        else:
            self.loop_active = False; self.loop_frozen = []

    # ── Update ────────────────────────────────────────────────────────────────
    def update(self, dt):
        if not self.playing or self.draw_mode: return
        tick = self._tick_ms()

        # Arpège : jouer les notes programmées
        if self.arp_on and self.arp_schedule:
            self.arp_time += dt
            while self.arp_schedule and self.arp_time >= self.arp_schedule[0][0]:
                fire_at, row = self.arp_schedule.pop(0)
                self._play_note(row, self.arp_col)

        # Tick colonne
        self.tick_acc += dt
        if self.tick_acc < tick: return
        self.tick_acc -= tick

        if self.arp_on:
            self._build_arp_schedule(self.col)
        else:
            self._play_col(self.col)

        self.col += 1
        if self.col < GRID_COLS: return
        self.col = 0

        # Fin de mesure : avancer le GoL
        if self.loop_active and self.loop_frozen:
            n = len(self.loop_frozen)
            if self.btn_loop_pp.label == "<>":
                seq = 2*n-2; pos = self.loop_pos % max(seq, 1)
                idx = pos if pos < n else seq-pos
            else:
                idx = self.loop_pos % n
            g, a = self.loop_frozen[idx]
            ctypes.memmove(self.ga, g, GRID_COLS*GRID_ROWS)
            ctypes.memmove(self.aa, a, GRID_COLS*GRID_ROWS)
            self.loop_pos += 1
        else:
            self.lib.gol_step_age(self.ga, self.gb, self.aa, self.ab,
                                  ctypes.c_uint8(self.cy_rule.index))
            ctypes.memmove(self.ga, self.gb, GRID_COLS*GRID_ROWS)
            ctypes.memmove(self.aa, self.ab, GRID_COLS*GRID_ROWS)
            self.history.append((bytes(self.ga), bytes(self.aa)))
            self.gen += 1

    # ── Événements ────────────────────────────────────────────────────────────
    def handle_events(self):
        for ev in pygame.event.get():
            if ev.type == pygame.QUIT: return False
            if ev.type == pygame.KEYDOWN:
                k = ev.key
                if   k == pygame.K_SPACE: self.playing = not self.playing; self.btn_play.active = self.playing
                elif k == pygame.K_r:     self._do_reset()
                elif k == pygame.K_c:     self._do_clear()
                elif k == pygame.K_s:     self._save()
                elif k == pygame.K_l:     self._load()
                elif k == pygame.K_a:     self.arp_on = not self.arp_on; self.btn_arp.active = self.arp_on
                elif k == pygame.K_i:     self.show_stats = not self.show_stats
                elif k == pygame.K_d:
                    self.draw_mode = not self.draw_mode; self.btn_draw.active = self.draw_mode
                    if self.draw_mode: self.playing = False; self.btn_play.active = False
                elif k == pygame.K_RIGHT: self.cy_rule.index = (self.cy_rule.index+1)%len(GOL_RULE_NAMES)
                elif k == pygame.K_LEFT:  self.cy_rule.index = (self.cy_rule.index-1)%len(GOL_RULE_NAMES)
                elif k == pygame.K_UP:
                    self.cy_scale.index = (self.cy_scale.index+1)%len(SCALE_NAMES); self._rebuild_sounds()
                elif k == pygame.K_DOWN:
                    self.cy_scale.index = (self.cy_scale.index-1)%len(SCALE_NAMES); self._rebuild_sounds()
                elif k in (pygame.K_PLUS, pygame.K_KP_PLUS, pygame.K_EQUALS):
                    self.sl_bpm.value = self.sl_bpm.value + 5
                elif k in (pygame.K_MINUS, pygame.K_KP_MINUS):
                    self.sl_bpm.value = self.sl_bpm.value - 5

            if ev.type == pygame.MOUSEBUTTONDOWN and ev.button == 1:
                gx, gy = self._grid_pos(ev.pos)
                if gx is not None: self.lib.gol_toggle(self.ga, gx, gy)

            # Sliders et cycles — on gère tous les events ici
            prev_sc  = self.cy_scale.index; prev_ag  = self.cy_age.index
            prev_wv  = self.cy_wave.index;  prev_rt  = self.cy_root.index
            prev_pre = self.cy_preset.index
            prev_sb  = self.cy_sample_base.index

            # 🎓 _rebuild_sls : sliders dont le changement nécessite un rebuild complet.
            #    sl_age_max / sl_age_mute : filtre lecture seule, pas de rebuild.
            _rebuild_sls = (self.sl_cutoff, self.sl_resonance,
                            self.sl_attack,  self.sl_decay,
                            self.sl_sustain, self.sl_release,
                            self.sl_detune,  self.sl_stereo)
            for sl in (self.sl_bpm, self.sl_vol, self.sl_bright,
                       self.sl_age_max, self.sl_age_mute) + _rebuild_sls:
                sl.handle_event(ev)
            for cy in (self.cy_preset, self.cy_root, self.cy_scale, self.cy_rule,
                       self.cy_age, self.cy_wave, self.cy_sample_base,
                       self.cy_sym, self.cy_loop_ln, self.cy_arp_mode, self.cy_arp_speed):
                cy.handle_event(ev)

            # Preset changé → applique tout le jeu de paramètres
            if self.cy_preset.index != prev_pre:
                self._apply_preset()
            # 🎓 just_released = True uniquement sur MOUSEBUTTONUP après un drag.
            #    Ça évite de recalculer 60× pendant le glissement.
            elif (self.cy_scale.index != prev_sc or self.cy_age.index != prev_ag
                    or self.cy_wave.index != prev_wv or self.cy_root.index != prev_rt
                    or self.cy_sample_base.index != prev_sb):
                self._rebuild_sounds()
            if any(s.just_released for s in _rebuild_sls):
                self._rebuild_sounds()

            # Bouton charger sample .wav
            if self.btn_load_sample.handle_event(ev) and self.btn_load_sample.just_clicked:
                self._load_sample_wav()

            # Pedalboard — rebuild si un effet est activé/désactivé ou paramètre changé
            if HAS_PB:
                self.sl_reverb_room.handle_event(ev)
                self.sl_phaser_depth.handle_event(ev)
                self.sl_flanger_depth.handle_event(ev)
                self.cy_phaser_div.handle_event(ev)
                for btn in (self.btn_reverb, self.btn_chorus,
                            self.btn_phaser, self.btn_flanger):
                    if btn.handle_event(ev) and btn.just_clicked:
                        self._rebuild_sounds()
                if self.sl_reverb_room.just_released:   self._rebuild_sounds()
                if self.sl_phaser_depth.just_released:  self._rebuild_sounds()
                if self.sl_flanger_depth.just_released: self._rebuild_sounds()
                if self.cy_phaser_div.changed:          self._rebuild_sounds()

            if self.btn_play.handle_event(ev) and self.btn_play.just_clicked:
                self.playing = self.btn_play.active
                if self.playing: self.draw_mode = False; self.btn_draw.active = False
            if self.btn_reset.handle_event(ev) and self.btn_reset.just_clicked: self._do_reset()
            if self.btn_clear.handle_event(ev) and self.btn_clear.just_clicked: self._do_clear()
            if self.btn_draw.handle_event(ev) and self.btn_draw.just_clicked:
                self.draw_mode = self.btn_draw.active
                if self.draw_mode: self.playing = False; self.btn_play.active = False
            if self.btn_save.handle_event(ev) and self.btn_save.just_clicked: self._save()
            if self.btn_load.handle_event(ev) and self.btn_load.just_clicked: self._load()
            if self.btn_oct_dn.handle_event(ev) and self.btn_oct_dn.just_clicked:
                self.octave = max(0, self.octave-1); self._rebuild_sounds()  # 0 = C0 ~16Hz sub-basse
            if self.btn_oct_up.handle_event(ev) and self.btn_oct_up.just_clicked:
                self.octave = min(6, self.octave+1); self._rebuild_sounds()
            if self.btn_loop.handle_event(ev) and self.btn_loop.just_clicked: self._toggle_loop()
            if self.btn_loop_pp.handle_event(ev) and self.btn_loop_pp.just_clicked:
                self.btn_loop_pp.label = "<>" if self.btn_loop_pp.label == "->" else "->"
            if self.btn_arp.handle_event(ev) and self.btn_arp.just_clicked:
                self.arp_on = self.btn_arp.active
                if not self.arp_on: self.arp_schedule = []
            if self.btn_reset_sound.handle_event(ev) and self.btn_reset_sound.just_clicked:
                self._reset_sound_params()
        return True

    # ── Dessin ────────────────────────────────────────────────────────────────
    def _age_color(self, age_raw, active):
        """
        🎓 Coloration dynamique basée sur sl_age_max et sl_age_mute.
        - age_max  = nombre de teintes distinctes (1 à 20).
                     Cellules plus vieilles que age_max-1 sont traitées comme la plus vieille teinte.
        - age_mute = toute cellule à partir de cet âge est grisée (et silencieuse).
        - Gradient : la PLUS JEUNE (gen 0) est la PLUS BRILLANTE (laiton vif),
                     la plus vieille est la plus sombre (cuivre chaud).
                     Analogie : une braise qui refroidit en vieillissant.
        """
        if active: return C_COL_LIVE

        bright   = self.sl_bright.value / 100.0
        age_max  = max(1, self.sl_age_max.value)   # nombre de teintes vivantes
        age_mute = self.sl_age_mute.value           # à partir de là : grisé + silencieux

        # 🎓 Cellule muette : toujours vivante, mais grisée pour indiquer le silence.
        #    La couleur est plus chaude que mort (40,28,16) mais clairement "éteinte".
        if age_raw >= age_mute:
            return tuple(min(255, int(c * bright)) for c in (72, 58, 44))

        # 🎓 Âge d'affichage cappé à age_max-1 : si age_max=3, on distingue 0, 1, 2 seulement.
        age_disp = min(int(age_raw), age_max - 1)

        # 🎓 t=0.0 → gen 0 (vient de naître) = couleur la plus brillante
        #    t=1.0 → gen N (très vieille)     = couleur la plus sombre
        #    Interpolation linéaire entre deux ancrages steampunk.
        t = 0.0 if age_max <= 1 else age_disp / (age_max - 1)

        # Ancres de gradient (inversées vs avant) :
        #   Jeune  = laiton vif  (245, 195, 60)  → énergie maximale, vient de naître
        #   Vieux  = cuivre sombre (80, 42, 12)  → braise refroidie
        r = int(245 + (80  - 245) * t)
        g = int(195 + (42  - 195) * t)
        b = int( 60 + (12  -  60) * t)
        return tuple(min(255, int(c * bright)) for c in (r, g, b))

    def draw(self):
        # 🎓 pygame.SCALED gère le scaling automatiquement — on dessine en coordonnées
        #    logiques fixes (WINDOW_W×WINDOW_H) et pygame adapte à la taille de fenêtre.
        self.screen.fill(C_BG); self._draw_grid(); self._draw_panel(); self._draw_status()
        if self.show_stats: self._draw_stats()
        pygame.display.flip()

    def _draw_stats(self):
        """
        🎓 HUD de performances — touche I pour afficher/masquer.
        Permet de voir en direct ce qui consomme de la mémoire et du CPU.
        """
        # Calcul mémoire du dict sons
        sounds_mb = sum(b.nbytes for b in self.sounds.values()) / 1_048_576
        # RAM du processus Python complet (nécessite psutil)
        if HAS_PSUTIL:
            ram_mb = _PROC.memory_info().rss / 1_048_576
            ram_str = f"{ram_mb:.1f} MB"
        else:
            ram_str = "N/A (pip install psutil)"
        # Notes actives dans le mixer audio
        with self.audio.lock:
            active_n = len(self.audio.active)
        # Durée note actuelle
        bpm = max(1, self.sl_bpm.value)
        dur = min(500, max(150, int(60000 / bpm / GRID_COLS * 2.5)))

        lines = [
            "─── Stats perfs (I) ───────────────",
            f"  FPS cible   : {FPS}",
            f"  FPS réel    : {self.clock.get_fps():.1f}",
            f"  RAM process : {ram_str}",
            f"  Sons (dict) : {sounds_mb:.1f} MB  ({len(self.sounds)} buffers)",
            f"  Note dur    : {dur} ms  ({int(44100*dur/1000)} samples)",
            f"  Notes activ : {active_n} / 32",
            f"  Pedalboard  : {'ON' if HAS_PB and (self.btn_reverb.active or self.btn_chorus.active) else 'off'}",
            "────────────────────────────────────",
        ]
        # Fond semi-transparent
        w = 260; h = len(lines) * 16 + 8
        surf = pygame.Surface((w, h), pygame.SRCALPHA)
        surf.fill((10, 10, 20, 210))
        self.screen.blit(surf, (GRID_OFF_X, GRID_OFF_Y + GRID_PX_H + 28))
        for i, line in enumerate(lines):
            color = C_ACCENT if i == 0 or i == len(lines)-1 else C_TEXT
            self.screen.blit(
                self.fsm.render(line, True, color),
                (GRID_OFF_X + 6, GRID_OFF_Y + GRID_PX_H + 32 + i * 16)
            )

    def _draw_grid(self):
        pygame.draw.rect(self.screen, C_GRID_BG,
                         (GRID_OFF_X-5, GRID_OFF_Y-5, GRID_PX_W+10, GRID_PX_H+10), border_radius=5)
        if self.playing and not self.draw_mode:
            ov = pygame.Surface((CELL_SIZE, GRID_PX_H), pygame.SRCALPHA)
            ov.fill((255,200,50,20))
            self.screen.blit(ov, (GRID_OFF_X + self.col*CELL_STEP, GRID_OFF_Y))
        if self.arp_on and self.arp_schedule and self.arp_col != self.col:
            av = pygame.Surface((CELL_SIZE, GRID_PX_H), pygame.SRCALPHA)
            av.fill((50,220,200,12))
            self.screen.blit(av, (GRID_OFF_X + self.arp_col*CELL_STEP, GRID_OFF_Y))

        # 🎓 Optimisation : au lieu de 256 appels ctypes (gol_get × 256), on lit la
        #    grille entière en une seule opération numpy. 15× plus rapide à 60 FPS.
        grid_np = np.frombuffer(bytes(self.ga), dtype=np.uint8).reshape(GRID_ROWS, GRID_COLS)
        age_np  = np.frombuffer(bytes(self.aa), dtype=np.uint8).reshape(GRID_ROWS, GRID_COLS)

        for gy in range(GRID_ROWS):
            for gx in range(GRID_COLS):
                cx = GRID_OFF_X + gx*CELL_STEP; cy = GRID_OFF_Y + gy*CELL_STEP
                alive  = grid_np[gy, gx]
                # 🎓 (col-1) % GRID_COLS : on surligne la colonne qui VIENT d'être
                #    jouée, pas la suivante. Sans le modulo, quand col=0 (début
                #    de mesure), on obtiendrait -1 → crash. Avec % 16 : -1 → 15 ✓
                active = (gx == (self.col - 1) % GRID_COLS) and self.playing and not self.draw_mode
                if alive:
                    color = self._age_color(int(age_np[gy, gx]), active)
                    pygame.draw.rect(self.screen, color, (cx,cy,CELL_SIZE,CELL_SIZE), border_radius=4)
                    glow = tuple(min(255, c+45) for c in color)
                    pygame.draw.rect(self.screen, glow, (cx+7,cy+7,CELL_SIZE-14,CELL_SIZE-14), border_radius=2)
                else:
                    pygame.draw.rect(self.screen,
                                     C_COL_DEAD if active else C_CELL_DEAD,
                                     (cx,cy,CELL_SIZE,CELL_SIZE), border_radius=4)
        if self.draw_mode:
            gx, gy = self._grid_pos(pygame.mouse.get_pos())
            if gx is not None:
                pygame.draw.rect(self.screen, (160,85,205),
                                 (GRID_OFF_X+gx*CELL_STEP, GRID_OFF_Y+gy*CELL_STEP, CELL_SIZE, CELL_SIZE),
                                 2, border_radius=4)

    def _sep(self, y, px=None, pw=None):
        px = px if px is not None else PANEL_X
        pw = pw if pw is not None else PANEL_W
        pygame.draw.line(self.screen, C_BORDER, (px+8, y), (px+pw-8, y), 1)
    def _lbl(self, txt, y, px=None):
        x = (px if px is not None else PANEL_X) + 14
        self.screen.blit(self.font.render(txt, True, C_TEXT_DIM), (x, y))

    def _draw_panel(self):
        # Coordonnées du panneau droit (identiques à __init__)
        rx  = RP_X + 14; rw = RP_W - 28; rhw = (rw - 4) // 2
        rrx = rx + rhw + 4
        # ── Fonds des deux panneaux ───────────────────────────────────────────
        pygame.draw.rect(self.screen, C_PANEL, (LP_X,  0, LP_W,      WINDOW_H))
        pygame.draw.rect(self.screen, C_PANEL, (RP_X,  0, RP_W + 8,  WINDOW_H))
        pygame.draw.line(self.screen, C_BORDER, (LP_W,  0), (LP_W,  WINDOW_H), 1)
        pygame.draw.line(self.screen, C_BORDER, (RP_X,  0), (RP_X,  WINDOW_H), 1)

        # ── PANNEAU GAUCHE ────────────────────────────────────────────────────
        ttl = self.fttl.render("LIF2D", True, C_ACCENT)
        sub = self.fsm.render("v5 steam", True, C_TEXT_DIM)
        self.screen.blit(ttl, (LP_X+14, 8))
        self.screen.blit(sub, (LP_X+14+ttl.get_width()+6, 14))
        self._sep(32, LP_X, LP_W)

        self.sl_bpm.draw(self.screen, self.font)
        self.sl_vol.draw(self.screen, self.font)
        self.sl_bright.draw(self.screen, self.font)
        self._sep(184, LP_X, LP_W)

        # 🎓 cy_root + cy_scale : la tonique + la gamme définissent ensemble les fréquences.
        #    Ex: Pentatonique en La (A) → toutes les notes transposées de 9 demi-tons.
        self.cy_root.draw(self.screen, self.font, self.fsm)
        self.cy_scale.draw(self.screen, self.font, self.fsm)
        self.cy_rule.draw(self.screen, self.font, self.fsm)
        self._sep(334, LP_X, LP_W)

        self.btn_play.draw(self.screen, self.font)
        self.btn_reset.draw(self.screen, self.font)
        self.btn_clear.draw(self.screen, self.font)
        self.btn_draw.draw(self.screen, self.font)
        self.btn_save.draw(self.screen, self.font)
        self.btn_load.draw(self.screen, self.font)
        self._sep(448, LP_X, LP_W)

        self._lbl("Octave", 452, LP_X)
        self.btn_oct_dn.draw(self.screen, self.font)
        self.screen.blit(self.flg.render(str(self.octave), True, C_ACCENT),
                         (LP_X+58, 464))
        self.btn_oct_up.draw(self.screen, self.font)
        self._sep(494, LP_X, LP_W)

        self.cy_sym.draw(self.screen, self.font, self.fsm)
        self._sep(540, LP_X, LP_W)

        self._lbl("Boucle", 544, LP_X)
        self.btn_loop.draw(self.screen, self.font)
        self.cy_loop_ln.draw(self.screen, self.font, self.fsm)
        self.btn_loop_pp.draw(self.screen, self.font)
        if self.loop_active:
            n = max(len(self.loop_frozen), 1)
            self.screen.blit(self.fsm.render(f"{self.loop_pos%n+1}/{n}", True, C_ACCENT),
                             (LP_X+220, 558))
        self._sep(590, LP_X, LP_W)

        self._lbl("Arpege", 594, LP_X)
        self.btn_arp.draw(self.screen, self.font)
        self.cy_arp_mode.draw(self.screen, self.font, self.fsm)
        self.cy_arp_speed.draw(self.screen, self.font, self.fsm)

        # aide compacte en bas gauche
        for i, h in enumerate(["SPC:Play  R:Reset  C:Clear  D:Draw",
                                "A:Arp   I:Stats   S:Save   +/-:BPM"]):
            self.screen.blit(self.fsm.render(h, True, C_TEXT_DIM), (LP_X+10, 786+i*14))

        # ── PANNEAU DROIT ─────────────────────────────────────────────────────
        self.cy_preset.draw(self.screen, self.font, self.fsm)
        self.btn_reset_sound.draw(self.screen, self.font)
        self._sep(52)

        self.cy_wave.draw(self.screen, self.font, self.fsm)

        # ── SAMPLE .WAV ───────────────────────────────────────────────────────
        self._sep(104)
        self.btn_load_sample.draw(self.screen, self.font)
        fname_display = (self.sample_name[:26] + "…" if len(self.sample_name) > 26 else self.sample_name) \
                        if self.sample_name else "aucun fichier"
        fname_col = C_TEAL if self.sample_name else C_TEXT_DIM
        self.screen.blit(self.fsm.render(fname_display, True, fname_col), (rrx, 116))
        self.cy_sample_base.draw(self.screen, self.font, self.fsm)
        self.screen.blit(self.fsm.render("Note base", True, C_TEXT_DIM), (rrx, 142))
        self._sep(180)

        # ── FILTRE ────────────────────────────────────────────────────────────
        self.sl_cutoff.draw(self.screen, self.font)
        self.sl_resonance.draw(self.screen, self.font)
        self.cy_age.draw(self.screen, self.font, self.fsm)

        # ── AGE → SON ─────────────────────────────────────────────────────────
        self._sep(298)
        self.sl_age_max.draw(self.screen, self.font)
        self.sl_age_mute.draw(self.screen, self.font)

        # ── ADSR ──────────────────────────────────────────────────────────────
        self._sep(360)
        self.sl_attack.draw(self.screen, self.font)
        self.sl_decay.draw(self.screen, self.font)
        self.sl_sustain.draw(self.screen, self.font)
        self.sl_release.draw(self.screen, self.font)

        # ── SYNTHESE ──────────────────────────────────────────────────────────
        self._sep(462)
        self.sl_detune.draw(self.screen, self.font)
        self.sl_stereo.draw(self.screen, self.font)

        # ── EFFETS ────────────────────────────────────────────────────────────
        self._sep(560)
        if not HAS_PB:
            self.screen.blit(self.fsm.render("pip install pedalboard", True, C_RED),
                             (RP_X+14, 568))
        else:
            self.btn_reverb.draw(self.screen, self.font)
            self.btn_chorus.draw(self.screen, self.font)
            self.sl_reverb_room.draw(self.screen, self.font)
            self._sep(658)
            self.screen.blit(self.fsm.render(
                "Rythm. BPM" + ("" if HAS_PHASER else " (pedalboard>=0.9)"),
                True, C_TEXT_DIM), (RP_X+14, 664))
            self.btn_phaser.draw(self.screen, self.font)
            self.btn_flanger.draw(self.screen, self.font)
            self.cy_phaser_div.draw(self.screen, self.font, self.fsm)
            self.sl_phaser_depth.draw(self.screen, self.font)
            self.sl_flanger_depth.draw(self.screen, self.font)
        self._sep(806)

        for i, h in enumerate(["</> Regle  haut/bas Gamme",
                                "Oct: boutons panneau gauche"]):
            self.screen.blit(self.fsm.render(h, True, C_TEXT_DIM), (RP_X+14, 812+i*14))

    def _draw_status(self):
        pop      = self.lib.gol_population(self.ga)
        arp_info = f" ARP:{self.cy_arp_mode.name}/{self.cy_arp_speed.name}" if self.arp_on else ""
        state    = ("Loop" if self.loop_active else
                    ("GoL"  if (self.playing and not self.draw_mode) else
                     ("Dessin" if self.draw_mode else "Pause")))
        wave_info = f" | {self.cy_wave.name} C:{self.sl_cutoff.value}% R:{self.sl_resonance.value}%"
        self.screen.blit(
            self.fsm.render(f"Gen {self.gen:4d}  Pop {pop:3d}/256  Col {self.col:2d}/15  "
                            f"{state}{arp_info}{wave_info}", True, C_TEXT_DIM),
            (GRID_OFF_X, GRID_OFF_Y + GRID_PX_H + 10))

    def run(self):
        print(f"LIF2D Sim v4 — {WINDOW_W}x{WINDOW_H} — patterns: {PATTERNS_DIR}")
        running = True
        while running:
            dt = self.clock.tick(FPS)
            running = self.handle_events()
            self.update(float(dt))
            self.draw()
        self.audio.close()
        pygame.quit()

if __name__ == "__main__":
    Sim().run()
