# Mahjong de Wenzhou (温州麻将)

Version multijoueur web de la variante Wenzhou du Mahjong (typique des parties d'argent
de la région de Wenzhou, Zhejiang).

## Spécificités de la variante

- **136 tuiles** : 3 familles × 9 × 4 + 4 vents × 4 + 3 dragons × 4 (pas de fleurs)
- **财神 dynamique** : à chaque manche, une tuile-indicateur est tirée. Sa valeur (ex: 5筒)
  désigne :
  - les 4 exemplaires de **5筒** comme jokers (wildcards)
  - les 4 **白板** comme étant équivalents à 5筒 (tuile normale, pas joker)
- **Soft / Hard / Double** : ×1 sans joker en main, ×2 avec, ×4 avec 3 jokers, main spéciale à 4 jokers
- **Hu prioritaire** : sur défausse, premier joueur dans le sens du jeu

## Structure

```
packages/
├── engine/   moteur de règles pur (TS, testable seul)
├── server/   Node + Socket.io (multijoueur temps réel)
└── client/   React + Vite (UI)
```

## Démarrage

```bash
npm install
npm run engine:test
```
