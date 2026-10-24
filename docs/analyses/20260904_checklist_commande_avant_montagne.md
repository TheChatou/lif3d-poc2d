# Checklist commande AliExpress — avant départ montagne (sans accès labo)

Date : 2026-09-04
Contexte : Felix va bientôt travailler sur LIF2D en montagne, sans accès au labo de l'école 42 (outils, matériel de mesure, pièces de dépannage) — juste l'objet LIF2D + son ordinateur pour le firmware. Objectif : valider la commande AliExpress une bonne fois pour ne pas se retrouver bloqué sur place (délai de réappro AliExpress en montagne : compter 2 à 4 semaines, potentiellement plus si zone reculée).

---

## 1. BOM — État de la commande LIF2D

### ✅ Déjà en stock / reçu (confirmé par la mémoire projet)
| Composant | Modèle | Statut |
|---|---|---|
| MCU | ESP32-WROOM-32D (clone USB-C) | ✅ En stock |
| Matrice LED | WS2812B 16×16 flexible | ✅ Reçue |
| Ampli HP | PAM8403 HW-894 | ✅ En stock (usage confirmé : HP internes uniquement, pas la sortie casque — voir §2) |
| Haut-parleurs | 2× 28mm 4Ω 3W | ✅ Reçus |
| Alimentation | Mean Well LRS-75-5 (5V/14A) | ✅ Reçue, réglée et vérifiée à 5.0V au multimètre |
| Jack audio | PJ-3410 5 broches commuté | ✅ Acheté (cette session) |
| Jack MIDI OUT | PJ-3410 3 broches | ✅ Acheté (cette session) |

### 🛒 Nécessaire, statut à confirmer par toi (pas de trace claire d'achat dans la conversation)
| Composant | Modèle / Spec | Qté | Priorité | Pourquoi c'est critique |
|---|---|---|---|---|
| Gros encodeurs rotatifs | Shaft ~6mm, avec bouton intégré | 2 | 🔴 CRITIQUE | Seul moyen de piloter TOUT le paramétrage (BPM, gamme, timbre, luminosité, règles GoL...) — sans eux, la machine ne peut littéralement rien régler |
| Cache-molette "ardoise magique" | Assorti aux encodeurs | 2 | 🔴 CRITIQUE | Design façade validé le 2026-08-24 — sans les caches, juste un axe métallique qui dépasse |
| Bouton poussoir play/pause | 12mm momentary | 1 | 🔴 CRITIQUE | Seul contrôle transport de la machine |
| Résistances 220Ω | 1/4W | 2 | 🔴 CRITIQUE | Protection boucle de courant MIDI OUT — sans elles, ne pas brancher le jack MIDI (risque pour le GPIO4 et l'appareil en face) |
| Résistances 1Ω/1W | | 2 | 🟡 UTILE | Protection HP (limite 3W→2.4W par HP), pas bloquant mais recommandé |

### 🆕 Nouvel ajout — décision de cette session (sortie casque)
| Composant | Modèle | Qté | Priorité | Notes |
|---|---|---|---|---|
| Module ampli casque | TDA2822M/UTC2822H, stéréo, entrée pads L IN/GND/R IN, sortie 4-32Ω 0.1-5W, potentiomètre de volume | 1 | 🔴 CRITIQUE (pour la sortie casque) | Voir `docs/analyses/20260904_jack_audio_casque_dac_brut.md` pour le détail de la décision. Remplace le DAC brut comme source du jack PJ-3410 5 broches — le PAM8403 existant reste dédié aux HP internes |
| Condensateurs de découplage sortie | 100µF électrolytique | 2 | 🟡 À VÉRIFIER | Le module a probablement déjà ces condos intégrés (visibles sur tes photos) — **à confirmer au multimètre/à l'œil à réception avant de câbler**, sinon à ajouter en série sur T/R du jack |

**Point d'attention bilan de puissance** : le module TDA2822 consomme moins que le PAM8403 en pleine charge (0.1-5W vs 3-5W par canal) — n'aggrave pas le budget déjà validé dans le CDC (§6, marge confortable à 1050mA typique sur les 14A de la LRS-75-5).

---

## 2. Ce qui change dans l'architecture audio (résumé)

Avant cette session : le jack PJ-3410 5 broches recevait le DAC brut de l'ESP32 (non amplifié) — utilisable seulement comme sortie ligne DAW, dangereux/inutilisable pour un casque (offset DC dépassant le courant max GPIO, volume quasi inaudible).

Maintenant : GPIO25/26 → module TDA2822 (ampli stéréo + volume) → jack PJ-3410 5 broches (T/R) + HP internes (via contacts NC, auto-mute mécanique). Le potentiomètre du module sert de réglage manuel pour passer d'un niveau confortable casque/HP à un niveau réduit compatible sortie ligne DAW si besoin ponctuel.

Détail complet : `docs/analyses/20260904_jack_audio_casque_dac_brut.md`

---

## 3. Checklist autonomie montagne — outils & consommables

Une fois en montagne, impossible de commander quoi que ce soit rapidement. Coche mentalement ce que tu as déjà personnellement (pas ce qui est au labo 42) — je ne peux pas deviner ton inventaire perso, donc vérifie toi-même chaque ligne :

### Outils de base (indispensables pour souder/réparer)
- [ ] Fer à souder (perso — celui du labo 42 ne voyage pas) + panne de rechange
- [ ] Étain (avec flux, diamètre fin ~0.5-0.8mm pour composants CMS/DIP)
- [ ] Flux à souder en pot/stylo (facilite grandement le soudage propre, surtout pour reprises)
- [ ] Pompe à dessouder ou tresse à dessouder (pour corriger une erreur de câblage sans tout arracher)
- [ ] Multimètre — **critique** : sans lui, impossible de vérifier la tension de sortie du LRS-75-5, de tracer un court-circuit, ou de diagnostiquer un composant mort
- [ ] Pince à dénuder
- [ ] Pince coupante + pince à bec fine
- [ ] Fer/gaine thermorétractable + briquet ou décapeur thermique (isolation des soudures exposées, surtout côté secteur/230V)

### Consommables & pièces de rechange (pour ne pas rester bloqué si un composant lâche)
- [ ] Assortiment de résistances courantes (220Ω, 300Ω, 1Ω, 1kΩ, 10kΩ — kit ~5-10€ sur AliExpress, permet de dépanner n'importe quel calcul de résistance imprévu sur place)
- [ ] Assortiment de condensateurs céramiques + électrolytiques courants (100nF, 100µF, 470µF)
- [ ] Fils Dupont mâle/femelle + fil souple silicone (rouge/noir/autres) en rab
- [ ] Un ESP32-WROOM-32D **de rechange** — le point de défaillance le plus critique du projet ; s'il crame ou s'il plante bizarrement (mauvais flash), pas de firmware = pas de projet du tout
- [ ] Câbles USB-C de rechange (pour flasher/débugger — un câble USB mort en montagne = plus aucun accès au firmware)
- [ ] Perfboard/plaque d'essai de secours (pour tester un sous-circuit avant de le souder définitivement)
- [ ] Fusibles de rechange si applicables (la prise secteur avec fusible intégré du CDC — vérifier le calibre et en avoir un de rechange)

### Ce qui est spécifique au labo et à laisser de côté
- LM2596S (buck converter) : plus nécessaire, la LRS-75-5 alimente tout en 5V direct — pas besoin de l'emporter
- Alimentation de labo (DC Power Supply NANKADF) : servait aux tests avant réception de la LRS-75-5, plus nécessaire maintenant qu'elle est reçue et réglée

---

## 4. Ce qu'il reste à trancher avant de valider la commande finale

```
📦 À CONFIRMER PAR TOI avant validation :
- Encodeurs + cache-molettes + bouton play/pause × déjà commandés ou pas ? (aucune trace dans la conversation)
- Résistances 220Ω × 2 (MIDI) et 1Ω/1W × 2 (protection HP) — déjà commandées ou pas ?
- Condensateurs de découplage sortie déjà présents sur le module TDA2822 ou à ajouter — vérifiable seulement à réception (photo/multimètre)

❓ INFORMATION MANQUANTE :
- Ton inventaire d'outils personnels réel (fer à souder, multimètre...) — je n'ai aucune trace de ce que tu possèdes déjà en propre vs ce qui est au labo. Impossible de dire avec certitude ce qu'il te manque sans que tu confirmes la checklist §3.
```

Aucun point 🔴 bloquant côté architecture/compatibilité — tout ce qui a été validé dans le CDC (`docs/CDC_LIF2D_Beta1_20260611.md` §6-7) reste valide avec l'ajout du module TDA2822.
