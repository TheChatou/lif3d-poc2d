# Notion : timeline de création + séparation LIF3D / LIF2D

> Étude du 2026-11-08. **Appliquée sur Notion le jour même** (phases 0–7 + L1–L2, colonne Projet, vues LIF2D / LIF3D / Frise, page « Timeline de création » avec 9 visuels).

## 1. Constat sur les tableaux Notion

**Phases** (8 lignes) : les numéros mélangent les deux projets.

| N° | Phase | Projet | Problème |
|---|---|---|---|
| 1 | Firmware | LIF2D | contient « Régler la LRS-75 » et « CDC v1.0 », qui ne sont pas du firmware |
| 2 | Boîtier | LIF2D | — |
| **3** | **POC rotor** | **LIF3D** | intercalé au milieu de LIF2D |
| **4** | **Produit V1** | **LIF3D** | contient MIDI in/out, CE, Proto A/B, pré-série, kit DIY : c'est en fait le **produit LIF2D V2** (`docs/v2/plan.md` phases 3 à 5) |
| 5–8 | Tests, Beta externe, Synthèse/Alpha, Promotion | LIF2D | — |

**Tâches** : la colonne Phase a deux orthographes (« 6 — Beta test externe » côté Phases, « 6 — Beta test externe LIF2D » côté Tâches) et il n'y a pas de colonne Projet.

**Historique** : il commence le 02/06/2026. Il manque toute la genèse : idée LIF3D, croquis, croquis IA, bascule vers LIF2D, simulateurs. Les deux lignes LIF3D n'ont pas de date, et aucune ligne n'a d'image.

## 2. Nouvelle structure proposée

### LIF2D : phases renumérotées dans l'ordre réel

| N° | Phase | Contenu |
|---|---|---|
| 0 | Genèse & conception | simulateurs Python v1→v5, simulateur web, CDC v1.0, bilan de puissance, réglage de la LRS-75, brief design |
| 1 | Firmware | inchangée, sans les tâches déplacées en phase 0 |
| 2 | Boîtier | inchangée |
| 3 | Tests & ajustements | ex-5 |
| 4 | Beta test externe | ex-6 |
| 5 | Synthèse & V2 | ex-7, plus les tâches V2 (architecture, CDC V2, bancs d'essai) |
| 6 | Produit V2 / petite série | ex-« 4 Produit V1 » : MIDI in/out, Proto A/B, CE, pré-série, kit DIY |
| 7 | Communication | ex-8, plus la timeline (§3) |

### LIF3D : bloc à part, marqué « concept futur »

| N° | Phase | Contenu |
|---|---|---|
| L1 | Concept & recherche | briefs POV 32³ (fév. 2026), croquis, simulateur GoL 3D, visualiseur web POV, budget de puissance du rotor (26/09) |
| L2 | POC rotor | hall US5881, rotor 8×8, PCB 45°, MBI5153, firmware ESP32-S3, tests de vibration |

### Modifications techniques sur Notion

- Ajouter une colonne **Projet** (LIF2D / LIF3D) aux Tâches et à l'Historique, et l'aligner avec celle des Phases.
- Uniformiser les noms de phase entre les tableaux (une seule orthographe).
- Créer des vues filtrées « LIF2D » et « LIF3D » sur chaque tableau, avec LIF2D comme vue par défaut.
- Sur la page : sous-titre « LIF3D = concept d'origine, en pause » et focus sur LIF2D.

## 3. Timeline de création (comm)

### Récit en 7 actes

| Acte | Date | Étape | Visuel disponible |
|---|---|---|---|
| 1 | fév. 2026 | **L'idée LIF3D** : boîte à musique lumineuse, Jeu de la Vie en 3D par persistance rétinienne (rotor 32³) | `Volumetric_3D/brief_pov_32cube.md` (texte) |
| 2 | 21/03/2026 | **Croquis à la main** : dôme plexi, matrice 32², moteur rotatif, HP, subwoofer | `Volumetric_3D/IMG_0752.jpg` ✅ |
| 3 | 21/03/2026 | **Croquis retravaillé par IA** : style steampunk, laiton et bois, « hologramme » | `Volumetric_3D/E480DEF3-….png` ✅ |
| 4 | ~avril 2026 | **Bascule vers LIF2D** : rotor silencieux à 1800 tr/min, équilibrage, alimentation sans fil… trop complexe pour un premier objet. On garde le cœur (le GoL qui fait de la musique) en 2D | à fournir (date exacte et raison en tes mots) |
| 5 | avr.→juin 2026 | **Le son d'abord, sur PC** : simulateur Python v5 « steampunk » (12/04), puis simulateur web | `docs/screens/Capture du 2026-04-12…png` ✅, `simulator-web/screenshots/` ✅, captures de juin ✅ |
| 6 | 24/08/2026 | **L'ardoise magique** : de 10 contrôles à 2 molettes et 1 bouton, le menu sur la matrice | croquis ? (à fournir), vue FreeCAD `docs/photos/20261024_freecad_vue_iso.png` ✅ |
| 7 | juil.→nov. 2026 | **Fabriquer** : premier montage au labo (03/07), FreeCAD, impression, nuit de soudure, matrice grillée puis remplacée, boîte finie, firmware, son 16 bits | photos du 24/10 dans `docs/photos/` ✅ ; labo, impression et soudure à fournir |
| → | nov. 2026 | **Vers la V2** : un vrai synthé, objet vendable | `docs/v2/` |

### Visuels manquants (à chercher sur ton téléphone)

- Photos du premier montage au labo (03/07) et des impressions 3D (fin août et septembre)
- Photo de la nuit de soudure, et de la matrice grillée (c'est un bon moment de récit)
- Croquis « ardoise magique », s'il existe sur papier
- **Vidéo** de la boîte qui joue (GoL + son), le plus important pour la comm

### Croquis « propres » par IA

Je ne génère pas d'images. Je peux t'écrire les prompts, par exemple pour transformer le croquis LIF2D et la vue FreeCAD en rendu « planche d'inventeur » dans le même style que le croquis LIF3D, pour garder une cohérence visuelle.

### Formats possibles

1. **Page Notion « Timeline de création »** : un bloc par acte (titre, date, 2–3 lignes, image). Réalisable tout de suite.
2. **Historique Notion enrichi** : colonnes Projet et Visuel (fichiers), vue Timeline Notion avec les images en couverture.
3. **Vidéo courte** (30–60 s) : diaporama des visuels avec les dates, fin sur la vidéo de la boîte qui joue. Montage par script `ffmpeg` (à vérifier sur la machine) ou dans un éditeur (CapCut ou équivalent).

Je recommande de faire 1 et 2 maintenant, puis 3 quand tu auras la vidéo de la boîte.
