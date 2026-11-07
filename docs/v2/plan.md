# Plan V2 — feuille de route

> Une phase à la fois, validée avant la suivante (même méthode que la phase software V1).

## Phase 0 — Finir proprement la V1 (en cours)

- [x] Limiteur, mixage 16 bits, reverb 16 bits, dither + noise shaping, filtre résonant (FILTRE/RESO), kit STUDIO échantillonné (2026-11-07)
- [ ] Souder le pont diviseur 10 kΩ / 1 kΩ (+ 10 nF optionnel) — fiche d'atelier « Code couleur résistances »
- [ ] Tester à l'oreille : DITHER ON/OFF, FILTRE/RESO, kit STUDIO vs 808, VOIX 16 vs 8 (craquements ?)
- [ ] Commiter, taguer `v1-final`, écrire le bilan V1 (ce qui marche, ce qui ne marche pas)

## Phase 1 — Décider (1–2 semaines)

- [ ] Trancher les questions ouvertes de `architecture.md` §5
- [ ] CDC V2 avec `/project-spec` (exigences chiffrées, BOM, budget, prix visé)
- [ ] Vérifier licences (DaisySP, Teensy, échantillons) et contraintes CE

## Phase 2 — Bancs d'essai sur table (breadboard)

Objectif : **écouter** avant de dessiner un PCB.

- [ ] Banc A : ESP32 actuel + PCM5102A (ou WM8960) en I²S avec Mozzi (`ESP32_AUDIO_OUT_MODE`) → mesurer le gain réel sans changer de MCU
- [ ] Banc B : Daisy Seed seule (DaisySP : oscillateur + filtre + batterie) → référence qualité
- [ ] Banc C : liaison UART ESP32 ↔ Daisy (protocole type MIDI : notes, réglages, horloge)
- [ ] Mesures : bruit de fond (casque, potar au max, rien ne joue), réponse dans les graves, latence
- [ ] Portage du séquenceur GoL + arpège + BOOM en C++ **testé sur PC** (`pio test -e native`)

## Phase 3 — Prototype intégré

- [ ] Schéma électronique (KiCad, dossier `kiCad/`) : rails séparés, masse en étoile, power path USB, buffer LEDs, MIDI
- [ ] PCB v0.1 (JLCPCB/PCBWay), assemblage, points de test
- [ ] Boîtier V2 (FreeCAD) adapté au PCB, évents HP si HP intégrés
- [ ] Firmware : modules séparés, versions figées, sauvegarde versionnée, CI de compilation

## Phase 4 — Validation

- [ ] Tests d'écoute (casque, HP, ligne) + comparatif V1 / V2 enregistré
- [ ] Endurance (24 h de jeu), température, chute de tension LEDs à pleine luminosité
- [ ] Panel de testeurs (3–5 personnes) : compréhension des gestes sans notice

## Phase 5 — Petite série

- [ ] BOM finale, devis assemblage, coût de revient
- [ ] Démarches CE (modules et alim certifiés), notice, emballage
- [ ] Prix de vente, canal (site, Tindie, salons maker)

## Risques principaux

| Risque | Parade |
|---|---|
| Firmware deux-cerveaux trop complexe | Banc C tôt ; repli « un cerveau » (Teensy 4.1 ou ESP32-S3 + WM8960) |
| Bruit encore présent malgré le PCB | Règles de routage audio, LDO dédié, mesures dès le banc A |
| Coût BOM trop élevé | Comparer 2 architectures chiffrées en phase 1 |
| Licences d'échantillons / bibliothèques | Sons maison (comme `tools/gen_drums.py`) ou CC0 vérifiés |
