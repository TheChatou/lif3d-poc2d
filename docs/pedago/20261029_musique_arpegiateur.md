# Arpégiateur — notions musicales

## Intervalles : tierce, quinte
- **Définition** : un intervalle = l'écart entre 2 notes, compté en demi-tons.
  - Tierce mineure = 3 demi-tons (son "triste"), tierce majeure = 4 (son "joyeux").
  - Quinte juste = 7 demi-tons (son "solide", ouvert). Quinte diminuée = 6, augmentée = 8.
- **Analogie** : une tierce, c'est donner une couleur (gai/triste) à la note ; une quinte, c'est lui donner un socle (comme le power chord d'une guitare rock).
- **Sur LIF2D** (`build_seq()` / `keep_interval()` dans `src/audio.cpp`) : depuis le 2026-10-29, TIERCE / QUINTE sont des valeurs du réglage **ACCORD** (TOUT / TIERCE / QUINTE), utilisé quand ARPEGE est OFF ou en STYLE ACCORD. Ce ne sont **pas des arpèges** mais des **accords de 2 notes**.
  1. On prend la note allumée la plus grave de la colonne (= la référence).
  2. On cherche, parmi les autres notes allumées, une note à +4 ou +3 demi-tons (TIERCE) ou à +7, puis +6, puis +8 (QUINTE), en ignorant l'octave (`% 12`).
  3. Si on en trouve une → les 2 notes sonnent ensemble. Sinon → la référence joue seule.
  4. Ça se répète à chaque sous-division (VITESSE ARP) : c'est un accord "martelé".
- **Pièges** :
  - La note ajoutée doit être **déjà allumée** par le GoL : le mode filtre la grille, il n'invente aucune note.
  - Selon la gamme, l'intervalle peut ne jamais exister. En Japonaise (0 1 5 7 8), une tierce n'existe que depuis certains degrés → souvent une seule note joue.

## Modes "Thumb" / "Pinky" (Ableton) = PÉDALE
- Thumb (pouce) : la note la plus **grave** revient entre chaque autre note → c'est notre PEDALE.
- Pinky (auriculaire) : pareil avec la note la plus **aiguë**.

## La "pompe"
- **Définition** : rythme d'accompagnement de jazz manouche / de stride. La basse joue sur le temps, l'accord répond à contretemps ("boum-tchak").
- **Sur LIF2D** (STYLE ARP = POMPE, réglage MOTIF POMPE) : le tiers grave des notes allumées = la basse (G), le reste = l'accord (A, ses 3 notes les plus aiguës au max). Chaque sous-division (RATE) joue un groupe selon le motif G A / G G A / G G A A / G A A.

## Réglages façon Ableton
- **RATE** : durée de chaque note de l'arpège en fraction de ronde. 1/16 = double-croche. **T = triolet** : 3 notes dans le temps de 2.
- **GATE** : combien de temps la note reste tenue, en % de sa case. 100 = elle résonne librement, 30 = piqué (staccato).
- **SWING** : retarde une note sur deux → rythme balancé au lieu de mécanique.
