<p align="center">
  <a href="https://libertech-fr.github.io/sesame-orchestrator" target="blank"><img src="https://raw.githubusercontent.com/Libertech-FR/sesame-orchestrator/main/static/sesame-logo.svg" width="200" alt="Sesame Logo" /></a>
</p>
<p align="center">Sésame ochestrator - Synchronisation d'Identités Multi-sources</p>
<p align="center">
  <img alt="GitHub all releases" src="https://img.shields.io/github/downloads/libertech-fr/sesame-orchestrator/total">
  <img alt="GitHub" src="https://img.shields.io/github/license/libertech-fr/sesame-orchestrator">
  <img alt="GitHub contributors" src="https://img.shields.io/github/contributors/libertech-fr/sesame-orchestrator">
  <a href="https://github.com/Libertech-Fr/sesame-orchestrator/actions/workflows/release.yml?event=workflow_dispatch"><img alt="GitHub contributors" src="https://github.com/Libertech-Fr/sesame-orchestrator/actions/workflows/release.yml/badge.svg"></a>
</p>
<br>

## Description
Sésame est une application open source conçue pour faciliter la synchronisation d'identités entre différentes sources de données, y compris des bases de données, des annuaires LDAP/Active Directory et des applications tierces, vers des serveurs OpenLDAP ou Active Directory. Le projet se compose de deux modules principaux : l'orchestrateur et le démon.

## Architecture du projet
[Figma](https://www.figma.com/file/OplQ0tHFHS5rFz5K6OCgEd/Sesame?type=whiteboard&node-id=0%3A1&t=ZiPEDwJPp0id8frN-1)

## Modules
### Orchestrateur
- Gère la synchronisation des identités.
- Maintient une base d'identités pour faciliter la synchronisation.
- Permet la configuration de schémas additionnels pour une flexibilité totale.
- Expose des entrypoints via une API REST avec des tokens JWT.

### Deamon
- Déclenche les scripts backend pour effectuer les opérations de synchronisation.
- Utilise BullMQ et Redis pour communiquer avec l'orchestrateur.

## Schémas d'Identité
- Utilise le schéma LDAP `InetOrgPerson` pour stocker les informations dans une base de données MongoDB.
- Possibilité de configurer des schémas additionnels pour des champs différents dans chaque enregistrement.
- Permet de définir le typage, les règles, et la présence des champs dans les identités.
- Schémas optionnels tels que `Supann` et/ou `Renater` pour une utilisation fréquente.

## Technologies utilisées
- Langages : NodeJS et NestJS.
- Communication Démon-Orchestrateur : BullMQ et Redis.
- Authentification Orchestrateur : Comptes stockés dans MongoDB, mots de passe dans un serveur tiers (OpenLDAP).
- Backends : Scripts système en Python, PowerShell, Perl, Bash, etc.

## Interfaces Utilisateur
- Frontend : Interfaces permettant la configuration de l'orchestrateur et la manipulation des données à importer.

## Conclusion
Sésame offre une solution puissante et flexible pour la synchronisation d'identités à partir de diverses sources vers des serveurs cibles. Son architecture modulaire et ses fonctionnalités avancées en font un outil idéal pour les environnements complexes nécessitant une gestion fine des schémas et des processus de synchronisation.

## Variables d'environnements
```
#Host Redis
REDIS_HOST=redis
#Port Redis
REDIS_PORT=6379
# redis credentials (si ces variables n existe pas, pas d'authentification par defaut
REDIS_USER=monUser
REDIS_PASSWORD=xx
#Log level  ( fatal,error,warn,info,debug)
LOG_LEVEL=info
#Nom de la queue (bullMQ) Redis
NAME_QUEUE=backend
```
