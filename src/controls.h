#pragma once

// 🎓 Pour l'instant : juste le bouton play/pause (encodeurs A/B viendront
//    plus tard avec le système de menus).
void controls_init();
void controls_update(); // à appeler à chaque tour de loop() — non bloquant
