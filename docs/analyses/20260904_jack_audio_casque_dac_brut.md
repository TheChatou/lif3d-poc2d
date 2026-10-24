# Analyse — Le jack audio commuté (DAC brut) suffit-il pour brancher un casque ?

Date : 2026-09-04
Question de Felix : le jack PJ-3410 5 broches déjà prévu en sortie audio (BLOC 3 du CDC) suffit-il à brancher un casque ou des écouteurs directement dessus ?

---

## A. Ce qui est câblé aujourd'hui (CDC BLOC 3)

```
GPIO25 (DAC L) ──→ T  (Tip, câble)
GPIO26 (DAC R) ──→ R  (Ring, câble)
               ╔══ TS/RS (contacts NC) ──→ PAM8403 → HP internes
GND            ──→ S  (Sleeve)
```

Sans câble : TS/RS fermés → le signal DAC brut va au PAM8403 → HP jouent (amplifiés, 3W).
Avec câble : TS/RS s'ouvrent → HP coupés, le câble reçoit **directement le DAC brut**, non amplifié.

Ce câblage a été pensé à l'origine comme **sortie ligne vers un DAW/table de mixage**, pas comme sortie casque.

---

## B. Faisabilité — brancher un casque/écouteurs directement sur ce jack

**Verdict : non, pas en l'état.** Deux problèmes distincts, un de qualité, un de sécurité électrique.

### 1. Offset DC — problème de sécurité (pas juste de qualité)
Le DAC de l'ESP32 repose au repos à ~1.65V (moitié de 3.3V), avec le signal audio qui module autour. Sans condensateur de découplage en série, cette tension continue se retrouve appliquée en permanence aux bornes de la bobine du casque :
- Casque 32Ω : I = 1.65V / 32Ω ≈ **51mA**
- Écouteurs 16Ω : I ≈ **103mA**

Le courant max absolu par GPIO de l'ESP32 est de **40mA**. Les deux cas le dépassent — rien que par l'offset DC, avant même de compter le signal audio. Risque réel d'endommager la broche GPIO à l'usage, en plus d'un "pop" audible à chaque branchement/débranchement.

→ **Un condensateur de découplage en série (10–47µF) sur T et R, avant le jack, est donc obligatoire**, indépendamment de la suite. Ça bloque le DC, protège les GPIO, et supprime le pop.

### 2. Volume — même avec le condensateur, ce sera très faible
Le DAC interne de l'ESP32 ne peut fournir qu'**environ 1mA** en sortie (specs Espressif). C'est très inférieur à ce qu'il faut pour driver correctement une charge 16–32Ω à un volume confortable. Résultat rapporté par la communauté maker (ESP32-A2DP, forums ESP32) : signal audible mais **faible, bruité, parfois distordu** — utilisable à la rigueur avec des écouteurs intra très sensibles dans un environnement silencieux, pas fiable comme sortie casque générale.

---

## C. Options

| Option | Description | Effort | Résultat |
|---|---|---|---|
| **A — Condo seul** | Ajouter 10–47µF en série sur T/R, garder le DAC brut tel quel | Très faible (2 condos) | Sûr électriquement, mais volume casque très faible/moyen |
| **B — Ampli casque dédié** | Petit étage ampli (ex. IC type TDA1308/NJM4560, ~1-2€) entre DAC et jack, alimenté en 3.3V/5V simple | Faible-moyen (1 IC + condos + résistances) | Volume casque correct et propre, signal ligne toujours dispo pour DAW |
| **C — Piquer sur le PAM8403** | Router la sortie amplifiée du PAM8403 (au lieu du DAC brut) vers T/R du jack | Piège technique : le PAM8403 est un ampli **BTL** (bridge-tied load) — ses deux sorties par canal sont "chaudes", aucune n'est référencée à la masse. On ne peut pas simplement les piquer avec un pont diviseur comme sur un ampli classique. Nécessite résistances d'atténuation calculées (sortie 3W → niveau casque, sinon risque réel pour les oreilles/le driver du casque) et vérif de la compatibilité avec le sleeve du jack. | Déconseillé sans étude complémentaire — pas la solution la plus simple |

**Recommandation : Option A pour valider vite (juste 2 condensateurs, corrige le vrai problème de sécurité), Option B si tu veux un vrai son casque confortable en Beta 1.**

Aucune des deux ne remet en cause le reste du BLOC 3 (auto-mute HP interne via TS/RS reste inchangé) ni le MIDI OUT (BLOC 4, jack 3 broches séparé, inchangé).

---

## D/E — Impact GoL / simulateur

Aucun — c'est un sujet purement électronique de sortie audio, ne touche ni le mapping GoL→note ni `simulator/sim.py`.

---

## C (suite) — Bluetooth A2DP comme option alternative

Question de suivi de Felix : et si on passait par du Bluetooth plutôt que de réparer le jack filaire ?

L'ESP32-WROOM-32D supporte le Bluetooth classique (BR/EDR), et une librairie existe (`ESP32-A2DP` de pschatzmann) pour faire jouer à l'ESP32 le rôle de **source A2DP** — streamer l'audio généré vers un casque/enceinte Bluetooth, comme un téléphone.

Points d'attention avant d'aller dans cette direction :
- **Ce n'est pas un fix électronique, c'est un chantier firmware** : il faut réécrire le pipeline audio pour streamer les échantillons Mozzi vers la stack Bluetooth au lieu du DAC, gérer l'appairage/reconnexion.
- **Latence Bluetooth ~100-200ms** — probablement sans impact pour une musique générative ambient écoutée en continu, mais à vérifier à l'oreille.
- **Partage d'antenne avec le WiFi** (time-multiplexing) — complique une éventuelle cohabitation future avec de l'OTA/contrôle web.

**Recommandation** : rester sur l'option B (ampli casque filaire dédié) pour la Beta 1 — reste dans l'esprit "board simple" du CDC, effort raisonnable, pas de risque de latence/appairage. Le Bluetooth A2DP est une évolution intéressante à envisager **après** que le firmware GoL→son soit stabilisé, pas à mélanger avec le premier flash.

## Point de clarification résolu

Le point ⚠️ en attente depuis le 2026-08-24 ("entrée Jack" à l'arrière — vraie entrée audio ou jack existant ?) est **résolu** : il n'y a pas d'entrée audio. Felix confirme : juste le jack audio 5 broches (sortie, PJ-3410) + un jack MIDI OUT 3 broches (aussi PJ-3410, pas de MIDI IN). Le mot "entrée" désignait juste "un connecteur en face arrière", pas un signal d'entrée. CLAUDE.md mis à jour en conséquence.

**Sources** : specs DAC Espressif (ESP-IDF), forums ESP32 (courant max GPIO), discussions DIY sur condensateurs de découplage DC pour sorties casque.
