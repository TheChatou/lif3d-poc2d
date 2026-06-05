Lance le simulateur LIF2D (build gol.so si nécessaire, puis sim.py).

## Étapes

1. **Trouver le projet**
   - Le projet est dans `/home/chatou/Documents/PlatformIO/Projects/lif3d-poc2d/`
   - Le simulateur est dans le sous-dossier `simulator/`

2. **Build gol.so si nécessaire**
   - Vérifie si `simulator/gol.so` est plus récent que `src/gol.cpp`
   - Si `src/gol.cpp` a été modifié depuis le dernier build : lance `bash simulator/build.sh`
   - Si gol.so est à jour : pas besoin de rebuild

3. **Lancer le simulateur**
   - Commande exacte depuis la racine du projet :
     `nohup .venv/bin/python3 simulator/sim.py > /tmp/lif2d-sim.log 2>&1 &`
   - `nohup` + `&` = le processus reste vivant même après la fin du shell Claude Code
   - Le simulateur s'ouvre dans une fenêtre pygame

4. **En cas d'erreur**
   - Si `sounddevice` manque : `pip install sounddevice` dans le bon venv
   - Si `pygame` manque : `pip install pygame numpy`
   - Si erreur de build : afficher le message d'erreur de build.sh

## Rappels utiles
- Contrôles : ESPACE play/pause, C clear, R reset, D dessin, S save, L load
- Règles GoL : ← → pour changer
- BPM : +/- (touches numériques)
- Gamme : flèches haut/bas
