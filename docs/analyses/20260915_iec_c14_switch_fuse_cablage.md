# Câblage embase secteur Huaconn HC-99-F5 (IEC320 C14, interrupteur + fusible, 7 broches)

## Recherche effectuée

Pas de datasheet PDF officielle trouvée en ligne pour le HC-99-F5 précisément :
- Site fabricant `huaconn.com.cn` / `huaconn.net` : pages produit trouvées mais connexion refusée (ECONNRESET) au moment du fetch, pas de PDF exposé publiquement.
- GrabCAD (modèle 3D du HC-99-F5) : accès aux fichiers bloqué (403).
- Scribd "Connection-Wiring Diagram HC" : métadonnées seulement, contenu illisible sans compte.

**Pas de PDF constructeur récupéré.** Ce qui suit est le schéma **standard** de ce type de module (IEC C14 + interrupteur bipolaire + porte-fusible intégrés, 7 languettes), un design très répandu (mêmes fournisseurs génériques que sur imprimantes 3D, alims labo, boîtiers CNC). Le compte "7 broches" colle exactement à ce design connu : **2 (fusible) + 4 (interrupteur bipolaire DPST) + 1 (terre) = 7**.

## Schéma générique (7 languettes)

```
Secteur (câble IEC entrant, côté C14 mâle intégré au bloc)
  │
  ├── Phase (L) ──► [broche interne C14, non exposée]
  │                        │
  │                    FUSE-IN  ─── porte-fusible ───  FUSE-OUT
  │                                                        │
  │                                              SW1-IN (interrupteur, pôle 1)
  │                                                        │
  │                                                     [interrupteur]
  │                                                        │
  │                                              SW1-OUT ──────────► vers LRS-75-5 : borne L (AC)
  │
  ├── Neutre (N) ──► [broche interne C14, non exposée] ──► SW2-IN (interrupteur, pôle 2)
  │                                                        │
  │                                                     [interrupteur]
  │                                                        │
  │                                              SW2-OUT ──────────► vers LRS-75-5 : borne N (AC)
  │
  └── Terre (PE) ──► languette TERRE (directe, pas de fusible ni switch)
                                                        │
                                              ──────────► vers LRS-75-5 : borne terre (⏚)
                                              + point de masse châssis si prévu
```

## Table des 7 languettes

| # | Nom | Vient de | Va vers |
|---|---|---|---|
| 1 | FUSE-IN | Phase C14 (interne) | — (déjà câblé en usine) |
| 2 | FUSE-OUT | Fusible | SW1-IN (pontage court) |
| 3 | SW1-IN | Fusible (FUSE-OUT) | Interrupteur pôle 1 |
| 4 | SW1-OUT | Interrupteur pôle 1 | **LRS-75-5 borne L** |
| 5 | SW2-IN | Neutre C14 (interne) | Interrupteur pôle 2 |
| 6 | SW2-OUT | Interrupteur pôle 2 | **LRS-75-5 borne N** |
| 7 | TERRE (PE) | Terre C14 (interne) | **LRS-75-5 borne ⏚** + masse châssis |

En pratique, sur la plupart des modules de ce type, les languettes **1 (FUSE-IN) et 5 (SW2-IN)** sont déjà pré-câblées en usine à l'intérieur du bloc (pas besoin d'y toucher) — les languettes réellement accessibles pour ton câblage externe sont donc surtout : **FUSE-OUT→SW1-IN** (souvent un pontage déjà en place aussi), **SW1-OUT (L sortant)**, **SW2-OUT (N sortant)**, et **TERRE**.

## ⚠️ Vérification avant remise sous tension

Comme tu as tout débranché et que je n'ai pas la datasheet exacte du HC-99-F5 :
1. **Ne rebranche rien sous tension d'abord.** Débranche le cordon secteur.
2. Utilise un **multimètre en continuité** (buzzer) pour identifier chaque languette :
   - Repère la terre en premier (résistance ~0Ω entre la broche terre de la fiche C14 et la languette la plus large / avec symbole ⏚).
   - Repère la phase : continuité entre la broche L du C14 et une languette → traverse le fusible (retire le fusible, la continuité doit disparaître si tu as la bonne languette de sortie fusible).
   - Le neutre : continuité directe (pas de fusible) entre broche N du C14 et sa languette.
3. Interrupteur **en position OFF** : aucune continuité entre languettes L in/out et N in/out. **ON** : continuité rétablie sur les deux pôles (confirme que c'est bien un DPST qui coupe L **et** N).
4. Une fois les 3 sorties (L, N, terre) identifiées avec certitude → câble vers le LRS-75-5 : L→L, N→N, terre→⏚.

C'est la méthode la plus sûre en l'absence de datasheet constructeur confirmée, pour du 230V secteur.
