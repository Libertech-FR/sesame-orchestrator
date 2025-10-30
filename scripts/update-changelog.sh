#!/bin/bash

# Script d'automatisation pour la mise à jour du CHANGELOG.md
# Utilise GitHub CLI pour récupérer les informations des releases

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
CHANGELOG_FILE="$REPO_ROOT/CHANGELOG.md"

echo "🔄 Mise à jour du CHANGELOG.md..."

# Vérifier que gh est installé
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) n'est pas installé. Installé avec: brew install gh"
    exit 1
fi

# Vérifier l'authentification GitHub
if ! gh auth status &> /dev/null; then
    echo "❌ Non authentifié avec GitHub CLI. Exécutez: gh auth login"
    exit 1
fi

# Récupérer la dernière release
LATEST_RELEASE=$(gh release list --limit 1 | head -1 | awk '{print $3}')
echo "📦 Dernière release: $LATEST_RELEASE"

# Récupérer les commits depuis la dernière release
echo "📝 Commits depuis la dernière release:"
git log --oneline "$LATEST_RELEASE"..HEAD

# Suggérer la prochaine version
CURRENT_VERSION=$(echo $LATEST_RELEASE | sed 's/v//')
echo "💡 Version actuelle: $CURRENT_VERSION"
echo "💡 Prochaine version suggérée: Voir les commits ci-dessus pour déterminer le type de version (patch/minor/major)"

echo "✅ Vérifiez les commits et mettez à jour manuellement la section [Unreleased] dans $CHANGELOG_FILE"
echo "📚 Guide: https://keepachangelog.com/en/1.0.0/"
