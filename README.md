<p align="center">
  <a href="https://libertech-fr.github.io/sesame-orchestrator" target="blank"><img src="./static/sesame-logo.svg" width="200" alt="Sesame Logo" /></a>
</p>
<p align="center">Sésame Orchestrator — synchronisation d’identités multi-sources</p>
<p align="center">
  <img alt="GitHub all releases" src="https://img.shields.io/github/downloads/libertech-fr/sesame-orchestrator/total">
  <img alt="GitHub" src="https://img.shields.io/github/license/libertech-fr/sesame-orchestrator">
  <img alt="GitHub contributors" src="https://img.shields.io/github/contributors/libertech-fr/sesame-orchestrator">
  <a href="https://github.com/Libertech-Fr/sesame-orchestrator/actions/workflows/release.yml?event=workflow_dispatch"><img alt="GitHub contributors" src="https://github.com/Libertech-Fr/sesame-orchestrator/actions/workflows/release.yml/badge.svg"></a>
</p>
<br>

## Description
Sésame est une application open source conçue pour faciliter la synchronisation d’identités entre différentes sources (bases de données, annuaires LDAP/Active Directory, applications tierces) vers des annuaires cibles (OpenLDAP / Active Directory).

Ce dépôt (`sesame-orchestrator`) est un **monorepo Node.js/TypeScript** basé sur **Yarn workspaces** et **Turbo**, qui contient :

- **`apps/api`** : API backend en **NestJS**
- **`apps/web`** : frontend en **Nuxt 3** (SPA, `ssr: false`)

## Architecture
- **Maquette / workshops** : [Figma](https://www.figma.com/file/OplQ0tHFHS5rFz5K6OCgEd/Sesame?type=whiteboard&node-id=0%3A1&t=ZiPEDwJPp0id8frN-1)

## Documentation 
[Aller à la documentation](https://libertech-fr.github.io/sesame-doc/)

## Prérequis
- **Node.js** (version compatible avec le projet) et **Yarn**
- (Optionnel) **Docker** si vous utilisez le `Makefile` pour les bases de données / l’environnement de dev

## Démarrage rapide
Installer les dépendances à la racine du monorepo :

```bash
yarn install
```

### Lancer en développement
Depuis la racine :

```bash
yarn start:dev
```

Ou application par application :

```bash
# API (NestJS)
yarn workspace @libertech-fr/sesame-orchestrator_api start:dev

# Web (Nuxt 3)
yarn workspace @libertech-fr/sesame-orchestrator_web start:dev
```

### Qualité & build

```bash
yarn lint
yarn build
```

Ou ciblé :

```bash
yarn workspace @libertech-fr/sesame-orchestrator_api lint
yarn workspace @libertech-fr/sesame-orchestrator_web lint
```

### Workflow Docker (optionnel)
Le dépôt fournit aussi un `Makefile` pour un workflow local :

```bash
make dbs
make dev
make stop
```

## Structure du dépôt

```text
sesame-orchestrator/
├── apps/
│   ├── api/   # Backend NestJS
│   └── web/   # Frontend Nuxt 3 (srcDir: src)
├── packages/  # Packages partagés (si présents)
├── turbo.json
└── Makefile
```

## Sécurité
Pour signaler une vulnérabilité, voir `SECURITY.md`.
