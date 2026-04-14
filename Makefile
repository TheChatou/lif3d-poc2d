################################################################################
##  LIF2D — Simulateur GoL + Audio
##  Usage : make [cible]
################################################################################

NAME    = lif2d-sim
VENV    = .venv
PY      = $(VENV)/bin/python3
PIP     = $(VENV)/bin/pip

GREEN   = \033[0;32m
YELLOW  = \033[0;33m
CYAN    = \033[0;36m
RED     = \033[0;31m
RESET   = \033[0m

################################################################################
##  CIBLES PRINCIPALES
################################################################################

## Par défaut : compile gol.so
all: build

## Recompiler le moteur C (gol.so) depuis src/gol.cpp
build:
	@bash simulator/build.sh

## Compiler + lancer le simulateur
run: build
	@$(PY) simulator/sim.py

## Recompiler proprement + lancer (= fclean + run)
re: clean build run

################################################################################
##  ENVIRONNEMENT PYTHON
################################################################################

## Créer le .venv et installer toutes les dépendances
install:
	@test -d $(VENV) || python3 -m venv $(VENV)
	@$(PIP) install --upgrade pip -q
	@$(PIP) install pygame numpy sounddevice pedalboard scipy psutil
	@printf "$(GREEN)[OK]$(RESET) Dépendances installées dans $(VENV)/\n"

################################################################################
##  TESTS
################################################################################

## Profiler le simulateur (cProfile — 30s puis rapport)
## 🎓 cProfile est intégré à Python, aucune install. Il mesure combien de temps
##    chaque fonction prend. Le rapport trie par temps total cumulé (cumtime).
profile: build
	@printf "$(CYAN)Profiling 30s... (ferme la fenêtre pour arrêter)$(RESET)\n"
	@$(PY) -m cProfile -s cumulative simulator/sim.py 2>&1 | head -40

## Mesurer la mémoire ligne par ligne (nécessite memory_profiler)
profile-mem: build
	@$(PIP) install memory_profiler -q
	@$(PY) -m memory_profiler simulator/sim.py

## Vérifier que gol.so et toutes les libs Python chargent correctement
test: build
	@printf "$(CYAN)── Tests dépendances ──────────────────────$(RESET)\n"
	@$(PY) -c "import ctypes; ctypes.CDLL('./simulator/gol.so'); print('  $(GREEN)[OK]$(RESET) gol.so')"
	@$(PY) -c "import pygame;      print('  $(GREEN)[OK]$(RESET) pygame       ' + pygame.__version__)"
	@$(PY) -c "import numpy;       print('  $(GREEN)[OK]$(RESET) numpy        ' + numpy.__version__)"
	@$(PY) -c "import sounddevice; print('  $(GREEN)[OK]$(RESET) sounddevice  ' + sounddevice.__version__)"
	@$(PY) -c "import pedalboard;  print('  $(GREEN)[OK]$(RESET) pedalboard   ' + pedalboard.__version__)"
	@$(PY) -c "import scipy;       print('  $(GREEN)[OK]$(RESET) scipy        ' + scipy.__version__)" \
		|| printf "  $(YELLOW)[--]$(RESET) scipy non installé (optionnel)\n"
	@printf "$(CYAN)───────────────────────────────────────────$(RESET)\n"

## Test audio seul (sans GUI)
test-audio:
	@$(PY) -c "\
import numpy as np, sounddevice as sd, time; \
t = np.linspace(0, 0.4, int(44100*0.4), dtype='float32'); \
s = np.sin(2*3.14159*440*t) * 0.3; \
sd.play(np.column_stack([s,s]), 44100); \
sd.wait(); print('$(GREEN)[OK]$(RESET) Son 440 Hz joué — tu l''entends ?')"

################################################################################
##  NETTOYAGE
################################################################################

## Supprimer gol.so et __pycache__
clean:
	@rm -f simulator/gol.so
	@find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null; true
	@printf "$(GREEN)[clean]$(RESET) gol.so + caches supprimés\n"

## Supprimer aussi les patterns sauvegardés
fclean: clean
	@rm -f simulator/patterns/*.map
	@printf "$(GREEN)[fclean]$(RESET) patterns supprimés\n"

################################################################################

.PHONY: all build run re install test test-audio profile profile-mem clean fclean
