# Fichier MDC pour génération de message de release

# Ce fichier permet de générer un message de release en français basé sur le changelog GitHub complet entre la version précédente et la version cible.
# Utilisation typique : automatisation de la génération de notes de version lors d'une release.

[release]
lang = "fr"
source = "github-fullchangelog"
template = "release-fr"

# Variables disponibles :
# - previous_version : la version précédente
# - target_version : la version cible
# - changelog : le changelog complet entre les deux versions

message = """
## Notes de version pour la version 2.0.3

Voici les changements apportés depuis la version 2.0.2 :

- v2.0.3 (0d3c5db)
- feat: add deletedFlag update in executeJob for identity state management (3039903)
- refactor: comment out unused settings dialog and related function (638e4cb)
- refactor: restructure settings components and pages (05268c2)

Merci à tous les contributeurs !
"""

Comparaison complète : https://github.com/Libertech-FR/sesame-orchestrator/compare/2.0.2...2.0.3
