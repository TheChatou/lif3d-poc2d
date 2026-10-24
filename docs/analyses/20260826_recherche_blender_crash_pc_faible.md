# Recherche — Blender qui plante sur PC perso (limité)

> Recherche autonome Claude, 2026-08-26. Contexte : tâche Notion "Finir Lif3d (modélisation 3D)" (Importance 4, En cours). Note associée : "Bloqué par Blender qui plante sur le PC perso (limité, surtout après avoir rendu le Mac du taff). Débloquer ça = gros gain de motivation."

⚠️ Le modèle CAD principal du boîtier LIF2D/LIF3D est en **FreeCAD** (`FreeCad/` dans ce repo). Si la tâche Blender concerne un usage différent (rendu visuel, promo, autre asset) plutôt que le modèle CAD lui-même, dis-le-moi pour recentrer la recherche.

## Causes les plus fréquentes de crash sur PC limité

1. **RAM système insuffisante** — la cause n°1 pour des scènes moyennement complexes. Blender charge tout en mémoire ; au-delà de la capacité dispo, crash ou freeze.
2. **VRAM GPU insuffisante** (si rendu GPU/Cycles activé) — contrairement à la RAM système qui peut paginer sur disque, la VRAM est un plafond dur : dépassement = crash immédiat "Out of Memory".
3. **Pilotes GPU obsolètes / mauvais backend** (CUDA/OptiX/HIP selon le GPU) — cause fréquente de plantages viewport, indépendante de la complexité de la scène.
4. **iGPU utilisé au lieu du GPU dédié** (cas laptop) — Optimus mal configuré fait tourner Blender sur la puce graphique intégrée, plus faible et plus instable.
5. **Add-ons tiers en conflit**.

## Fixes concrets, du plus simple au plus radical

- **Fermer les apps en arrière-plan** avant de lancer Blender — libère la RAM dispo immédiatement.
- **Repasser en rendu CPU** (Edit > Preferences > System) si crash en rendu GPU — plus lent, mais évite le plafond dur de VRAM.
- **Simplify panel** (Render Properties > Simplify) — réduit subdivisions/résolution texture globalement, gain immédiat sans retoucher la scène.
- **Réduire les Undo Steps** (Preferences > System > Memory & Limits) — chaque étape d'undo garde un snapshot en mémoire.
- **Baisser la résolution des textures** utilisées dans le viewport (surtout si les fichiers sources sont en 4K).
- **Mettre à jour les pilotes GPU** — corrige une grande partie des crashs viewport sur configs anciennes.
- **Désactiver l'iGPU dans le BIOS** ou forcer le GPU dédié (laptop) si crash uniquement en 3D lourde.
- **Augmenter le swap** (fichier d'échange Linux) en dernier recours si upgrade RAM impossible — plus lent mais évite le crash pur.
- **Désactiver les overlays viewport** (grille, wireframe additionnel) — gain de perf mineur mais gratuit.

## Prochaine étape suggérée

Pour un diagnostic précis (RAM vs VRAM vs pilote), il faudrait connaître :
- Specs exactes du PC perso (RAM, GPU intégré/dédié)
- Le message d'erreur exact au crash (log Blender : lancé depuis un terminal, l'erreur s'affiche dans la console avant le crash)
- Le moment du crash (à l'ouverture, en modélisation, au rendu ?)

Si tu veux, donne-moi ces infos et je peux affiner vers une cause précise plutôt qu'une liste générique.

## Sources

- [Blender Manual — Crashes](https://docs.blender.org/manual/en/2.81/troubleshooting/crash.html)
- [CADguide — Blender Crash/Freeze: Memory, GPU Driver, Add-on Conflict Fixes](https://cadguide.tools/guides/blender-crash-freeze-memory-gpu-driver-addon-fix)
- [CookStation — Blender Out of Memory: 7 Fixes](https://cookstation.blog/blender-out-of-memory-fixes)
- [Hone — Blender Lagging & Crashing](https://hone.gg/blog/blender-lagging-crashing/)
