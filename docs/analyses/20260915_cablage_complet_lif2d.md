# Câblage complet LIF2D — toutes les connexions, broches et couleurs de fil

Source de vérité pins GPIO : `include/config.h` (mis à jour 2026-09-14, design final 2 encodeurs + 1 bouton).
Câblage secteur détaillé (Huaconn HC-99-F5) : voir `docs/analyses/20260915_iec_c14_switch_fuse_cablage.md`.

**Code couleur proposé** (à adapter à ce que tu as en stock — la seule partie non négociable est le secteur 230V) :
- **Secteur AC 230V** : Marron = Phase (L), Bleu = Neutre (N), Vert/Jaune = Terre (PE) — norme française/IEC, obligatoire pour la sécurité
- **DC 5V** : Rouge = +5V, Noir = GND — convention universelle
- **Signaux** : chaque signal a sa couleur dédiée (voir tableau récap en bas), libre à toi si tu as un kit Dupont différent — l'important c'est la cohérence

---

## 1. Secteur 230V — Huaconn HC-99-F5 → LRS-75-5

Résumé (détail complet + méthode de vérification au multimètre dans l'autre fichier) :

| Depuis (languette HC-99-F5) | Vers (LRS-75-5, bornier AC IN) | Fil |
|---|---|---|
| Sortie interrupteur pôle 1 (L, après fusible) | Borne **L** | Marron |
| Sortie interrupteur pôle 2 (N) | Borne **N** | Bleu |
| Languette Terre (PE, directe) | Borne **⏚** (terre) | Vert/Jaune |

⚠️ Vérifie chaque languette au multimètre (continuité) avant de rebrancher — détail dans l'autre fichier.

---

## 2. Alimentation DC 5V — LRS-75-5 → distribution Wago → composants

⚠️ **Recompté le 2026-09-16** : chaque bus (+5V et GND) a **6 connexions à loger**, pas 5 — l'arrivée depuis le LRS est une connexion à part entière, en plus des 5 appareils/points matrice. Avec des blocs Wago 221 à **5 leviers** (ce que tu as réellement), il faut doubler un levier avec 2 fils plutôt que chercher un modèle 6 voies.

```
LRS-75-5 sortie "+V"  → fil ROUGE 1.5mm² → Wago bloc "+5V" (5 leviers)
LRS-75-5 sortie "-V"  → fil NOIR  1.5mm² → Wago bloc "GND" (5 leviers)
```

Depuis le Wago **+5V** (rouge) — 6 connexions / 5 leviers :
| Vers | Section fil | Connecteur | Levier |
|---|---|---|---|
| LRS +V (arrivée) | 1.5mm² | direct | dédié |
| Matrice WS2812B, pad +5V **début** | 1.5mm² (speaker) | soudé direct sur pad | dédié |
| Matrice WS2812B, pad +5V **milieu** (2e injection) | 1.5mm² (speaker) | soudé direct sur pad | dédié |
| ESP32 — broche **VIN** | 0.75mm² / 20AWG | Dupont femelle | **partagé** avec PAM8403 VCC |
| PAM8403 — broche **VCC** | 0.75mm² / 20AWG | Dupont femelle | **partagé** avec ESP32 VIN |
| TDA2822 (module ampli casque) — broche **VCC** | 0.75mm² / 20AWG | Dupont femelle | dédié |

Depuis le Wago **GND** (noir) — 6 connexions / 5 leviers :
| Vers | Section fil | Connecteur | Levier |
|---|---|---|---|
| LRS -V (arrivée) | 1.5mm² | direct | dédié |
| Matrice WS2812B, pad GND **début** | 1.5mm² (speaker) | soudé direct sur pad | dédié |
| Matrice WS2812B, pad GND **milieu** | 1.5mm² (speaker) | soudé direct sur pad | **partagé** avec le fil de liaison vers le bus satellite (voir plus bas) |
| ESP32 — broche **GND** | 0.75mm² / 20AWG | Dupont femelle | **partagé** avec PAM8403 GND |
| PAM8403 — broche **GND** | 0.75mm² / 20AWG | Dupont femelle | **partagé** avec ESP32 GND |
| TDA2822 — broche **GND** | 0.75mm² / 20AWG | Dupont femelle | dédié |

**Règle pour choisir quel levier partager** : toujours regrouper 2 fils **fins et basse consommation** ensemble (ex : ESP32 + PAM8403, tous les deux en 0.75mm²/20AWG, quelques centaines de mA), jamais 2 fils épais de puissance (1.5mm², matrice ou arrivée LRS) sur le même levier. Un levier Wago 221 serre bien 2 conducteurs fins torsadés ensemble avant insertion ; forcer 2×1.5mm² dedans est à la limite mécanique et moins fiable dans le temps (mauvais serrage = point chaud ou faux contact).

⚠️ Piège déjà noté : ne pas réutiliser les fils 22AWG déjà soudés sur la matrice flexible pour le +5V/GND (ne tiennent que ~0.9A) — ressouder en 1.5mm² directement sur les pads.

### Bus GND satellite — pour les connexions basse consommation (révisé 2026-09-16 — stock réel : 2× Wago 5 voies + Wago 3 voies illimités)

Felix n'a que **2 blocs Wago 5 voies au total**, déjà réservés aux 2 bus principaux (+5V et GND, section 2) — donc pas de 3ᵉ/4ᵉ bloc 5 voies disponible pour le satellite. En revanche il a des **Wago 3 voies en stock illimité**. Le bloc GND principal (5 leviers) est déjà complet : LRS-V + TDA2822 + (ESP32+PAM8403 partagés) + 2 GND matrice = 6 connexions pour 5 leviers, **aucun levier libre** — les 5 connexions GND restantes (EC11 A commun + switch, EC11 B commun + switch, bouton) partent sur **2 blocs Wago 3 voies pontés entre eux**, reliés au bus principal par un seul fil de liaison qui partage le levier « matrice GND milieu » :

```
Bus GND principal (5 leviers, complet)
  └── Matrice GND milieu ──┬── (même levier)
                             └── fil de liaison ──► Bloc Satellite A (Wago 3 leviers)
                                                        ├── A1 : fil de liaison + pont vers Bloc B (partagé)
                                                        ├── A2 : EC11 A — commun (C)
                                                        └── A3 : EC11 A — switch (S2)
                                                             │
                                                             pont A↔B
                                                             │
                                                        Bloc Satellite B (Wago 3 leviers)
                                                        ├── B1 : pont venant du Bloc A
                                                        ├── B2 : EC11 B — commun (C) + EC11 B — switch (S2) (partagé)
                                                        └── B3 : Bouton play/pause
```

7 fils uniques (liaison, pont, EC11 A×2, EC11 B×2, bouton) pour 6 leviers (2 blocs de 3) → 2 leviers doublés (A1, B2), aucun doublage ne mélange 2 fils épais — que du fin+fin ou fin+liaison, exactement le même principe que le bus principal (section 2).

**Placement physique — pour regrouper le câblage matrice/EC11/bouton** : coller les blocs A et B l'un à côté de l'autre, **juste à côté des 2 Wago 5 voies principaux** (zone ESP32/PSU), plutôt que de les éparpiller près de chaque encodeur. Le pont A↔B devient un tout petit bout de fil, et toute l'électronique GND (puissance + satellite) se retrouve en un seul hub. Faire ensuite descendre **un seul faisceau groupé** depuis le dessus du boîtier (EC11 A, EC11 B, bouton) jusqu'à ce hub — les fils GND (vers le satellite) et les fils signal (ROTA/ROTB/SWCH vers l'ESP32) voyagent ensemble, gainés/attachés au même collier — plutôt que 5 trajets séparés à travers le boîtier.

**Pour que ça tienne dans le temps** : un levier Wago correctement enfoncé (clic net, fil qui ne ressort pas à la traction légère) ne demande aucun entretien. Dénude à la bonne longueur (repère gravé sur le levier), et étiquette (scotch + feutre) chaque bloc pour retrouver l'affectation si tu dois un jour tout déboîter et rebrancher.

---

## 3. Matrice LED WS2812B — signal data

```
ESP32 GPIO5  ──[résistance 300Ω série]──►  DIN (data in) matrice WS2812B
```

| Pad matrice | Fonction | Vers | Fil |
|---|---|---|---|
| DIN (début de chaîne uniquement) | Entrée data | GPIO5 → résistance 300Ω → DIN | Orange |
| +5V (début) | Alim | Bus Wago +5V | Rouge, 1.5mm² |
| GND (début) | Alim | Bus Wago GND | Noir, 1.5mm² |
| +5V (milieu, 2e injection) | Alim (anti chute de tension) | Bus Wago +5V | Rouge, 1.5mm² |
| GND (milieu, 2e injection) | Alim (anti chute de tension) | Bus Wago GND | Noir, 1.5mm² |
| DOUT (fin de chaîne) | Sortie data (non utilisée) | Rien — chaîne se termine ici | — |

Le data (DIN) n'entre qu'**une seule fois** au début de la chaîne — les 2 points d'injection ne concernent que +5V/GND (anti chute de tension), pas le signal.

---

## 4. Audio — DAC ESP32 → TDA2822 (casque) + PAM8403 (HP internes)

**Pinout réel confirmé (modules en main, 2026-09-15)** :
- TDA2822 (8 broches en ligne) : `Lin, GND, Rin | VCC, GND | Lout, GND, Rout`
- PAM8403 (4 bus séparés) : `OUTR± (2 broches)`, `OUTL± (2 broches)`, `DC5V (2 broches)`, `Lin/GND/Rin (3 broches)`

**Alimentation = étoile depuis le LRS, PAS en série entre TDA et PAM** :
```
Bus 5V (LRS, section 2) ──┬──► TDA2822 VCC
                            └──► PAM8403 bus DC5V
```
Le PAM ne tire aucun courant du TDA — seulement du signal audio (voir plus bas). Les deux GND respectifs rejoignent le même GND commun (Wago).

**Signal audio** — le DAC alimente le TDA, dont la sortie va au jack ; le PAM ne reçoit le signal que via les contacts commutés du jack (auto-mute) :

```
GPIO25 (DAC L) ──► TDA2822 Lin ──► TDA2822 Lout ──[100µF découplage]──► Jack 5 broches : Tip (T)
                                                                          │
                                                        (T shorté sur TS quand rien n'est branché)
                                                                          │
                                                                          ▼
                                                          PAM8403 bus Lin/GND/Rin — broche Lin

GPIO26 (DAC R) ──► TDA2822 Rin ──► TDA2822 Rout ──[100µF découplage]──► Jack 5 broches : Ring (R)
                                                                          │
                                                        (R shorté sur RS quand rien n'est branché)
                                                                          │
                                                                          ▼
                                                          PAM8403 bus Lin/GND/Rin — broche Rin
```

**Auto-mute** : TS reste électriquement relié à Tip tant qu'aucune fiche n'est insérée (donc le PAM reçoit le signal du TDA et les HP jouent). Dès qu'un casque est branché, TS se déconnecte de Tip → le PAM ne reçoit plus rien → HP internes coupés automatiquement, le casque reçoit directement Tip/Ring. Idem RS/Ring pour le canal droit.

✅ **Résolu 2026-09-18 (validé sur alim USB uniquement)** : le PAM reçoit le signal **après** le TDA2822 (pas le DAC brut). Réglage qui corrige l'interférence : **volume PAM8403 bas + volume TDA2822 haut**. Pas besoin de diviseur résistif matériel avec ce réglage. ⚠️ Pas encore revalidé sur alim LRS-75-5 (voir souci de son strident au power-on, en cours de diagnostic).

**GND — ne pas tout mettre sur le bus Wago.** Les 3 broches GND du TDA2822 sont pontées en interne sur le module (même réseau électrique), mais chacune est physiquement placée à côté du signal qu'elle référence — à respecter pour éviter le bruit (masse en étoile, cf. `docs/pedago/20260612_audio_midi_circuit.md`) :

| Connexion | Fil | Couleur suggérée |
|---|---|---|
| GPIO25 → TDA2822 Lin | signal | Blanc |
| GPIO26 → TDA2822 Rin | signal | Violet |
| GND (à côté de Lin/Rin) → **GND de l'ESP32** (pas le bus Wago) | — | Noir |
| TDA2822 VCC → bus 5V (Wago) | — | Rouge |
| GND (à côté de VCC) → **bus Wago GND** | — | Noir |
| TDA2822 Lout → (condo 100µF) → Jack Tip | signal | Blanc |
| TDA2822 Rout → (condo 100µF) → Jack Ring | signal | Violet |
| GND (à côté de Lout/Rout) → **Sleeve du jack 5 broches** | — | Noir |
| Jack TS → PAM8403 bus Lin | signal | Blanc |
| Jack RS → PAM8403 bus Rin | signal | Violet |
| PAM8403 bus Lin/GND/Rin — broche GND centrale → **Sleeve du jack** (pas le bus Wago) | — | Noir |
| PAM8403 bus DC5V (VCC + GND) → bus Wago (5V + GND) | voir section 2 | Rouge / Noir |

Pas besoin de fil supplémentaire entre le Sleeve du jack et le bus Wago : la continuité existe déjà via le cuivre interne du TDA2822 (GND Lout/Rout ↔ GND VCC ↔ bus).

### PAM8403 → haut-parleurs (protection)

```
PAM8403 OUT L+ ──[1Ω/1W]──► HP gauche +
PAM8403 OUT L- ─────────────► HP gauche -
PAM8403 OUT R+ ──[1Ω/1W]──► HP droit +
PAM8403 OUT R- ─────────────► HP droit -
```
| Fil | Couleur suggérée |
|---|---|
| Sortie HP gauche (+/-) | Rouge/Noir fin (paire dédiée HP, différente du 5V pour éviter confusion — ou marquer au scotch) |
| Sortie HP droit (+/-) | idem, marquer clairement L/R |

### Jack audio 5 broches (PJ-3410) — auto-mute HP interne

```
Jack Tip (T)   ← TDA2822 OUT-L (toujours actif, alimente le casque si branché)
Jack Ring (R)  ← TDA2822 OUT-R
Jack Sleeve(S) ← GND commun
Jack TS (switch, NF)  ← ligne PAM8403 LINE-IN L  (coupée quand un jack est inséré → mute HP gauche)
Jack RS (switch, NF)  ← ligne PAM8403 LINE-IN R  (coupée quand un jack est inséré → mute HP droit)
```
| Fil | Couleur suggérée |
|---|---|
| Tip / Ring | Blanc / Violet (mêmes couleurs que la sortie TDA2822 dont ils dérivent) |
| Sleeve | Noir |
| TS / RS | Gris / Marron clair (juste pour les distinguer visuellement — attention à NE PAS confondre avec le marron du secteur, câblage physiquement séparé donc pas de risque réel) |

---

## 5. MIDI OUT — GPIO4 → jack 3 broches (TRS Type A)

```
ESP32 GPIO4 (UART2 TX) ──[220Ω]──► Tip
ESP32 3.3V             ──[220Ω]──► Ring
GND                     ─────────► Sleeve
```
| Fil | Couleur suggérée |
|---|---|
| GPIO4 → 220Ω → Tip | Jaune |
| 3.3V → 220Ω → Ring | Rouge clair / Orange clair (pour ne pas confondre avec le +5V) |
| GND → Sleeve | Noir |

---

## 6. Encodeur A (gauche) — GPIO 21/22/23

EC11 à **5 pattes** (A, B, C, S1, S2 — voir `docs/pedago/20260915_identification_composants_multimetre.md` pour les identifier au multimètre). Partie LED (si le modèle en a une, 7 pattes) volontairement mise de côté pour l'instant.

| Patte EC11 | Fonction | Vers | Fil |
|---|---|---|---|
| A | Rotatif, signal A | GPIO22 (ROTA) + condo 100nF vers GND | Bleu |
| B | Rotatif, signal B | GPIO23 (ROTB) | Jaune |
| C | Rotatif, commun | **Bus GND satellite** (voir section 2) | Noir |
| S1 | Switch, patte 1 | GPIO21 (SWCH) | Vert |
| S2 | Switch, patte 2 | **Bus GND satellite** | Noir |

## 7. Encodeur B (droite) — GPIO 19/32/33

| Patte EC11 | Fonction | Vers | Fil |
|---|---|---|---|
| A | Rotatif, signal A | GPIO32 (ROTA) + condo 100nF vers GND | Bleu |
| B | Rotatif, signal B | GPIO33 (ROTB) | Jaune |
| C | Rotatif, commun | **Bus GND satellite** (voir section 2) | Noir |
| S1 | Switch, patte 1 | GPIO19 (SWCH) | Vert |
| S2 | Switch, patte 2 | **Bus GND satellite** | Noir |

S1/S2 et A/B n'ont pas de sens imposé : inversion sans risque, ajustable en firmware si besoin.

Mêmes couleurs pour A et B (connecteurs séparés, pas d'ambiguïté physique).

### ⚠️ Répartition des 2 broches GND de l'ESP32 (2026-09-15)

Cette carte n'a que **2 broches GND** sur tout le header (confirmé dans `docs/datasheet/ESP32-D_board_reference.md`). Elles sont réservées à :

1. **1 broche → bus Wago GND** : retour d'alimentation de l'ESP32 lui-même.
2. **1 broche → référence propre audio/MIDI** : GND du TDA2822 (côté Lin/Rin) **+** Sleeve du jack MIDI, regroupées sur cette même broche (les 2 pins du header sont de toute façon le même plan de masse interne à quelques mm l'un de l'autre — aucune isolation réelle entre eux, seulement entre eux et le bus Wago).

**Encodeurs A/B, bouton play/pause → bus GND satellite** (voir section 2) ; **matrice LED → bus Wago GND principal** (courant réel). Aucun de ces GND basse consommation ne va sur l'ESP32 directement.

## 8. Bouton play/pause — GPIO14

Bouton à **4 pattes = 2 paires** (chaque paire déjà en continuité permanente, identification au multimètre : `docs/pedago/20260915_identification_composants_multimetre.md`). Prendre une patte de chaque paire :

| Patte bouton | Fonction | Vers | Fil |
|---|---|---|---|
| Paire 1 — patte a | Côté 1 du switch | GPIO14 | Gris |
| Paire 1 — patte b | Côté 1 (redondante) | En l'air, ou en parallèle sur GPIO14 | — |
| Paire 2 — patte a | Côté 2 du switch | **Bus GND satellite** | Noir |
| Paire 2 — patte b | Côté 2 (redondante) | En l'air, ou en parallèle | — |

Pas de résistance externe nécessaire (pull-up géré en firmware). Condensateur anti-rebond : voir section 9.

---

## 9. Condensateurs — récapitulatif

Explication complète des deux rôles (anti-rebond / blocage DC) : `docs/pedago/20260915_condensateurs_debounce_dc_blocking.md`.

| Condensateur | Valeur | Emplacement | Statut |
|---|---|---|---|
| Anti-rebond EC11 A | 100nF | ROTA (GPIO22) → GND | Obligatoire |
| Anti-rebond EC11 B | 100nF | ROTA (GPIO32) → GND | Obligatoire |
| Anti-rebond bouton | 100nF | GPIO14 → GND | Optionnel — non tranché dans `config.h`/`controls.cpp` |
| Découplage audio L | 100µF | TDA2822 Lout → Jack Tip | **Probablement déjà sur le module** — vérifier avant d'ajouter quoi que ce soit |
| Découplage audio R | 100µF | TDA2822 Rout → Jack Ring | **Probablement déjà sur le module** — vérifier avant d'ajouter quoi que ce soit |

Aucun condensateur sur les pattes B ou switch (S1/S2) des encodeurs.

---

## Tableau récapitulatif des couleurs

| Domaine | Rouge | Noir | Autres |
|---|---|---|---|
| Secteur 230V | — | — | Marron=L, Bleu=N, Vert/Jaune=Terre |
| DC 5V | +5V | GND | — |
| LED data | — | — | Orange = GPIO5→DIN |
| Audio L/R | — | — | Blanc=L, Violet=R |
| Audio GND/switch | — | Noir=Sleeve | Gris/Marron clair=TS/RS |
| MIDI | — | Noir=Sleeve | Jaune=Tip(TX), Orange clair=Ring(3.3V) |
| Encodeurs A+B | — | Noir=GND | Bleu=ROTA, Jaune=ROTB, Vert=SWCH |
| Bouton play/pause | — | Noir | Gris=signal |

**Rappel sécurité** : seule la partie secteur (§1) a des couleurs réglementaires obligatoires (marron/bleu/vert-jaune). Tout le reste (§2 à §8) est une convention que je propose pour la cohérence — libre à toi de l'adapter à ce que tu as en stock, du moment que c'est cohérent et noté quelque part si tu t'écartes du tableau.
