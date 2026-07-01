# Prompt Claude Design — LIF2D Simulator v2

> **Usage :** Colle ce prompt dans une nouvelle session Claude (claude.ai ou Claude Code).
> L'objectif est d'obtenir une proposition de design UI/UX complète — maquettes ASCII,
> structure des composants, logique d'interaction — avant toute implémentation.

---

## Prompt

Tu es designer UI/UX et architecte front-end. Je vais te décrire une application web existante
que je veux refondre. Je veux que tu proposes :
1. Une architecture de layout (wireframes ASCII)
2. La liste des composants UI avec leur comportement
3. La logique d'organisation des paramètres (regroupement, priorité visuelle)
4. Un système de mémoire de presets
5. Un guide de style visuel sobre et cohérent

**Ne code rien encore.** Propose des designs, explique les choix, attend ma validation.

---

## Contexte projet

**LIF2D** est un simulateur web d'un objet physique : une matrice LED 16×16 pilotée par
le Jeu de la Vie de Conway, qui génère de la musique en temps réel.

L'app tourne dans le navigateur (HTML + React 18 + Web Audio API). Elle sera packagée
en application desktop Electron à terme.

### Ce que fait l'app aujourd'hui
- **Moteur GoL** : grille 16×16, 7 règles d'évolution (Conway, Dense, Coral…), bords toroïdaux
- **Séquenceur** : balayage colonne par colonne → les cellules vivantes jouent des notes
- **Audio** : oscillateurs (Sine/Carré/Scie/Triangle/FM/Karplus-Strong), ADSR complet,
  filtre LP résonant, reverb (delay feedback), phaser, flanger, panoramique stéréo
- **Drum machine** : 8 pistes × 32 steps, horloge maître BPM partagée avec le GoL
- **Modes** : Machine (vue physique réaliste), Expert (vue sobre compacte)
- **Paramètres** : ~30 paramètres exposés (BPM, gamme, tonique, règle GoL, forme initiale,
  waveform, ADSR ×4, octave, détune, stéréo, cutoff, résonance, reverb, phaser, flanger,
  densité, arpège ×3, symétrie, luminosité, volumes…)

### Le problème actuel
Le mode "Machine" simule l'apparence physique de l'objet (potentiomètres rotatifs SVG qu'on
fait tourner en glissant la souris). C'est beau visuellement, mais **non ergonomique** pour
une utilisation clavier/souris/pad : les potentiomètres infinis à drag sont frustrants,
peu accessibles, et difficiles à utiliser précisément.

---

## Ce que je veux

### Version "Sim Pure" (priorité)
Une interface **sobre, efficace, keyboard-friendly** pour explorer et composer.
- Pas de simulation physique — c'est un logiciel, pas un boîtier
- Contrôles standard : `<select>` dropdowns, range sliders avec valeur affichée,
  boutons cliquables, toggles on/off clairs
- Navigation clavier : espace = play/pause, flèches pour naviguer, raccourcis évidents
- La matrice LED : **miniature compacte** (style "expert mode actuel"), pas plein écran.
  On veut voir la grille ET les contrôles en même temps.

### Nouveaux paramètres à intégrer (vs aujourd'hui)

**Styles musicaux** (nouveau) — dropdown principal :
- Japonais (actuel, cloche cristal)
- Ambient (ADSR long, LFO lent sur cutoff, drones)
- Mélodique (harmonies, arpèges, ADSR équilibré)
- Techno (kick 4/4, onde carrée, filtre ouvert)
- Acid (sawtooth + filtre résonant modulé = squelch TB-303)
- Trance (nappes désaccordées, LFO montée lente)

Chaque style est un **preset de paramètres audio** (waveform, ADSR, cutoff, résonance,
LFO fréquence, gamme recommandée). L'utilisateur peut le choisir puis affiner.

**Paramètres existants à garder visibles** :
- BPM (range 20–200, affichage numérique)
- Gamme musicale (dropdown : 10 gammes)
- Tonique (dropdown : C à B)
- Règle GoL (dropdown : 7 règles avec notation B/S)
- Forme initiale (dropdown : Vide, Glider, Blinker, R-Pentomino, Aléatoire…)
- Symétrie (dropdown : 5 options)
- Octave (–2 à +2, stepper +/–)
- Volume, Luminosité (sliders)
- Play / Pause / Reset / New seed (boutons)

**Paramètres audio à regrouper** (panneau "Son" collapsible) :
- Waveform (dropdown)
- ADSR (4 sliders : attack, decay, sustain, release)
- Cutoff, Résonance, Reverb (sliders)
- Phaser on/off + depth, Flanger on/off + depth
- Détune, Stéréo

**Drum machine** : garder accessible mais en onglet ou panneau séparé.

### Système de mémoire presets (nouveau)

Une **grille de presets** par mode :
- Mode GoL : 16 emplacements (4×4) pour sauvegarder l'état complet (grille + tous paramètres)
- Mode Drums : 16 emplacements pour les patterns de batterie
- Mode Son : 16 emplacements pour les configurations audio (style + ADSR + effets)

Chaque emplacement preset :
- Vide = case grise avec "+"
- Rempli = affiche un nom court (8 chars max) + une **couleur** choisie par l'utilisateur
  (palette de ~12 couleurs pour mémoriser visuellement)
- Clic = charger le preset
- Shift+clic = sauvegarder dans cet emplacement
- Double-clic = renommer

### Version "Réaliste" (futur, pas prioritaire)
Garder l'actuel mode Machine comme easter egg ou vue secondaire.
Mentionner dans le design comment basculer entre les deux modes (bouton discret).

---

## Contraintes techniques

- **React 18 + Vite** (build propre, HMR, pas de Babel standalone)
- **Tone.js** comme bibliothèque audio — remplace Web Audio API brute. Tone.js fournit
  nativement : oscillateurs (Sine/Saw/Square/Triangle/FM), filtres LP/HP/BP résonants,
  ADSR, LFO, reverb, delay, phaser, flanger, polyphonie. Les paramètres mappent 1:1
  avec ce qu'on flashera sur l'ESP32.
- **Electron en cible desktop** — le build Vite → `dist/` sera wrappé dans Electron.
  Le design doit fonctionner dans une fenêtre app (pas nécessairement un onglet navigateur).
- **Vanilla CSS** (pas de Tailwind, pas de CSS-in-JS)
- Design **dark theme** (fond sombre, accents lumineux — l'objet physique sera dans une pièce sombre)
- Police monospace pour les valeurs numériques (déjà : Space Mono)
- Doit fonctionner sur : écran 1920×1080, laptop 1366×768, et potentiellement tablette
- Naviguer au **clavier** doit être possible pour toutes les actions principales

## Note pour l'implémentation (à transmettre au développeur)

Lors de l'implémentation, utiliser **Context7** pour récupérer la doc à jour de Tone.js
avant tout code audio — l'API Tone.js évolue vite et les erreurs de version sont fréquentes.
Résoudre l'ID Tone.js via `mcp__plugin_context7_context7__resolve-library-id` puis fetch la doc
avec `mcp__plugin_context7_context7__query-docs` avant d'écrire le moindre `new Tone.Synth()`.

---

## Ce que tu dois produire

### 1. Layout général (wireframe ASCII)
Propose 2–3 options de layout pour la vue principale (matrice + contrôles principaux +
panneau presets). Indique les zones, proportions relatives, comportement responsive.

### 2. Hiérarchie des contrôles
Quels paramètres sont "primary" (toujours visibles), "secondary" (panel collapsible),
"advanced" (rarement touchés) ? Propose une organisation en 3 niveaux.

### 3. Composants UI à concevoir
Pour chaque composant, décris :
- Type HTML natif ou composant custom
- Comportement souris + clavier
- État visuel (actif, hover, focus, disabled)

Composants attendus au minimum :
- `StyleSelector` (dropdown avec preview couleur par style)
- `PresetGrid` (grille 4×4, color tags, save/load)
- `ParamSlider` (range + valeur numérique éditable)
- `ParamSelect` (dropdown stylé cohérent)
- `TransportBar` (play/pause/reset/BPM en barre horizontale)
- `MatrixView` (grille 16×16 compacte, cliquable pour dessiner)
- `DrumPanel` (accès rapide ou onglet)

### 4. Guide de style visuel
- Palette de couleurs (fond, surface, accent, texte, états)
- Couleurs par style musical (ex: Acid = rouge, Ambient = bleu nuit, Trance = violet…)
- Tailles typographiques
- Espacement / grille de layout
- Style des bordures, ombres, focus ring

### 5. Flux d'interaction clés
Décris le flow pour ces 3 scénarios :
- A. Changer de style musical → entendre le résultat immédiatement
- B. Sauvegarder un preset GoL avec couleur + nom
- C. Passer du mode GoL au mode Drums et retour

---

## Inspiration visuelle

- **Sobre et sombre** : penser Ableton Live, VCV Rack, ou les interfaces de synthés software modernes
- **Pas skeuomorphe** (pas de potentiomètres 3D) — sauf en mode Réaliste optionnel
- La matrice LED : petits carrés avec glow léger sur les cellules vivantes (comme des LEDs)
- Les presets colorés : penser aux pads de couleur d'une MPC / Push d'Ableton

---

*Projet : LIF2D — Felix — juin 2026*
