# LIF2D — Journal de progression

---

## 2026-06-02 — Première session lab, setup hardware

**Fait :**
- État des lieux complet du projet (firmware, simulateur, matos)
- Création du skill `/sim` (lance le simulateur depuis Claude Code)
- Création du skill `/log-session` (documente les sessions)
- Correction bug `sim.py` ligne 1013 — `v` parasite causant un IndentationError
- Mise à jour CLAUDE.md : MCU confirmé ESP32-D, hardware reçu listé, gamme Japonaise en priorité, paramètres son validés
- Inventaire hardware : perso (ESP32-D, WS2812B, PAM8403 HW-894 BT5.0, HP 4Ω ×2, alim 12V/2A) + lab (LM2596S)
- Brief fonctionnel rédigé pour Claude Design (`docs/BRIEF_DESIGN.md`)
- Guide de montage complet rédigé (`docs/TUTO_MONTAGE.md`)
- **LM2596S calé à 5.0V** au multimètre — DC Power Supply NANKADF réglé à 12V/1A, multimètre V— range 20V sur OUT+ / OUT−

**Décisions :**
- Utiliser le LM2596S du lab (3A) plutôt que le HX Mini 360 (1.8A) — plus de marge pour les LEDs
- Alimentation tests : DC Power Supply NANKADF (lab) en 12V → LM2596S → 5V, pas le BF-1220 (nécessite adaptateur barrel jack)
- Brief Claude Design : zéro prescription UX, laisser imaginer librement à partir des fonctionnalités + contexte physique

**Prochaines étapes :**
- [ ] Étape 2 — Premier test ESP32-D seul (blink + Serial Monitor)
- [ ] Étape 3 — Premier allumage WS2812B
- [ ] Étape 4 — Test audio PAM8403
- [ ] Lancer Claude Design avec le brief

**Hardware présent au lab :**
ESP32-D, WS2812B 16×16, PAM8403 HW-894, HP 4Ω ×2, alim 12V/2A BF-1220, LM2596S (lab), DC Power Supply NANKADF (lab), multimètre (lab)
