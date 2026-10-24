# FreeCAD — modélisation paramétrique (sketch/extrusion vs script brut)

## Agrandir un volume en tirant une face selon sa normale ("push/pull")

**Définition** : dans les logiciels type SketchUp/Fusion360, on peut sélectionner une face plane et la "tirer" perpendiculairement à elle-même pour agrandir le volume dans cette direction. FreeCAD n'a pas un outil unique pour ça — c'est une combinaison de deux opérations : un **sketch** (contour 2D) sur la face, puis une **extrusion** (`Part::Extrusion`) selon la normale de cette face, fusionnée au volume d'origine.

**Analogie** : c'est comme coller une nouvelle tranche de pâte à modeler sur une face de ton cube, façonnée exactement à la forme de cette face, puis fusionner les deux morceaux en un seul bloc.

**Comment faire (méthode cohérente avec le reste du modèle LIF2D)** :
1. Sélectionner la face dans la vue 3D
2. `Sketch → Créer un sketch` sur cette face (FreeCAD la propose comme plan de référence)
3. Dans le sketch : `Sketch → Projeter les éléments externes` pour récupérer automatiquement le contour de la face
4. `Part → Extrusion` sur ce sketch, direction "normale à la face", longueur = distance d'agrandissement voulue
5. `Part → Booléens → Union` entre l'extrusion et le volume d'origine

Si le volume est un `Pad` dans un `Body` (workbench Part Design) et que la face sélectionnée est le bout du Pad, plus simple : ouvrir les propriétés du `Pad` et modifier directement sa `Length`.

**Exemple concret LIF2D** : c'est la méthode utilisée pour construire le boîtier existant (`Sketch009→Extrude001`, `Sketch010→Extrude002`, etc.) — chaque paroi est un sketch + extrusion en mode Bullseye, fusionnés ensemble.

**Piège à éviter** : ne pas faire ça avec `Part.makeBox()` + `.cut()`/`.fuse()` en script Python (`execute_code`). C'est plus rapide à écrire mais ça casse la cohérence de l'arbre — plus de sketch à rouvrir et modifier à la main dans l'interface FreeCAD. Felix a déjà rejeté cette approche une fois pour le boîtier (voir mémoire `feedback_freecad_modeling_style`). Le script brut reste acceptable uniquement pour de l'inspection en lecture seule (mesurer, lister des objets), jamais pour créer de la géométrie structurelle destinée à être conservée.
