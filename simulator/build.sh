#!/bin/bash
# =============================================================================
# build.sh — Compile gol.cpp en bibliothèque partagée pour le simulateur Python
# =============================================================================
#
# 🎓 Une bibliothèque partagée (.so sur Linux) est un fichier de code compilé
#    qu'un autre programme peut charger et utiliser.
#    Ici, Python (sim.py) charge gol.so et appelle directement les fonctions C.
#    C'est exactement le même code C qui tournera sur l'ESP32 !
#
# Flags g++ expliqués :
#   -shared    → crée un .so (pas un exécutable autonome)
#   -fPIC      → Position-Independent Code : requis pour les bibliothèques partagées
#   -O2        → optimisation niveau 2 (plus rapide, debug plus difficile)
#   -std=c++11 → standard C++11 (pour les références const& dans gol.cpp)
#   -I<dir>    → chercher les .h dans ce répertoire
#
# Usage :
#   bash simulator/build.sh
# =============================================================================

set -e  # arrêter immédiatement si une commande échoue

# Chemins (relatifs au projet, quel que soit le répertoire courant)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

SRC="$PROJECT_ROOT/src/gol.cpp"
INCLUDE="$PROJECT_ROOT/include"
OUTPUT="$SCRIPT_DIR/gol.so"

echo "🔨 Compilation du moteur GoL..."
echo "   Source  : $SRC"
echo "   Include : $INCLUDE"
echo "   Output  : $OUTPUT"
echo ""

g++ \
    -shared \
    -fPIC \
    -O2 \
    -std=c++11 \
    -I"$INCLUDE" \
    -o "$OUTPUT" \
    "$SRC"

echo "✅ gol.so compilé avec succès !"
echo ""
echo "   Lance le simulateur avec :"
echo "   python3 simulator/sim.py"
