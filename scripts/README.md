# Scripts de maintenance

Ce dossier contient des scripts utiles pour la maintenance du projet Sesame Orchestrator.

## 📝 update-changelog.sh

Script d'aide à la mise à jour du CHANGELOG.md

### Utilisation
```bash
./scripts/update-changelog.sh
```

### Fonctionnalités
- Vérifie la dernière release GitHub
- Affiche les commits depuis la dernière release
- Aide à déterminer le type de prochaine version
- Rappelle les bonnes pratiques du changelog

### Prérequis
- GitHub CLI (`gh`) installé et configuré
- Authentification GitHub active

### Installation de GitHub CLI
```bash
# macOS
brew install gh

# Authentification
gh auth login
```

## 📋 Template de release

Utilisez le template `.github/RELEASE_TEMPLATE.md` pour créer de nouvelles entrées de changelog cohérentes.

## 🔄 Workflow recommandé

1. Développement des fonctionnalités
2. Commit avec messages descriptifs
3. Avant release: `./scripts/update-changelog.sh`
4. Mise à jour manuelle de la section [Unreleased]
5. Création de la release GitHub
6. Tag de version Git
