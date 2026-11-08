Lance le simulateur LIF2D (build gol.so si nécessaire, puis sim.py).

## Étapes

1. **Trouver le projet**
   - Le projet est dans `/home/chatou/Documents/Projets/Lif3D/Lif2D/`
   - Le simulateur est dans le sous-dossier `v1/simulator/python/`

2. **Build gol.so si nécessaire**
   - Vérifie si `v1/simulator/python/gol.so` est plus récent que `v1/firmware/src/gol.cpp`
   - Si `v1/firmware/src/gol.cpp` a été modifié depuis le dernier build : lance `bash v1/simulator/python/build.sh`
   - Si gol.so est à jour : pas besoin de rebuild

3. **Lancer le simulateur**
   - Commande exacte depuis la racine du projet :
     `nohup .venv/bin/python3 v1/simulator/python/sim.py > /tmp/lif2d-sim.log 2>&1 &`
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
