# AGENTS.md - Sesame Orchestrator

## Vue d'ensemble du projet

`sesame-orchestrator` est un monorepo Node.js/TypeScript basé sur Yarn workspaces + Turbo.

Le projet contient deux applications principales :

- `apps/api` : API backend en **NestJS**.
- `apps/web` : application frontend en **Nuxt 3**.

Le dépôt est orienté synchronisation d'identités multi-sources, avec une architecture modulaire côté API et une SPA côté Web.

## Stack et architecture

| Couche | Technologie |
| --- | --- |
| Monorepo | Yarn workspaces (`apps/*`, `packages/*`) |
| Orchestration tâches | Turbo (`turbo.json`) |
| API | NestJS + TypeScript |
| Web | Nuxt 3 + Vue 3 + TypeScript |
| Lint/Format | ESLint + Prettier + EditorConfig |

### Structure principale

```text
sesame-orchestrator/
├── apps/
│   ├── api/                  # Backend NestJS
│   └── web/                  # Frontend Nuxt 3 (srcDir: src)
├── packages/                 # Packages partagés (si présents)
├── turbo.json                # Pipeline monorepo
├── .eslintrc.js              # ESLint racine
├── .prettierrc               # Prettier racine
├── .editorconfig             # Règles d'édition globales
└── Makefile                  # Workflow Docker/dev local
```

## Conventions monorepo

- Utiliser les scripts racine pour les commandes transverses (`build`, `start:*`, `lint`, `format`).
- Préserver la séparation des responsabilités : logique métier dans `apps/api`, UI/composables/stores dans `apps/web`.
- Limiter les changements au périmètre de la demande (pas de refactor global hors besoin explicite).
- Respecter les conventions de chaque application plutôt que d'imposer un style unique artificiel.

## API (`apps/api`) - conventions NestJS

### Organisation

- Structure par domaines (`core`, `management`, `settings`, etc.).
- Pattern dominant `controller` <-> `service`.
- TypeScript compilé en CommonJS (cf. `apps/api/tsconfig.json`).

### Scripts utiles

```bash
yarn workspace @libertech-fr/sesame-orchestrator_api start:dev
yarn workspace @libertech-fr/sesame-orchestrator_api build
yarn workspace @libertech-fr/sesame-orchestrator_api lint
yarn workspace @libertech-fr/sesame-orchestrator_api lint:fix
```

### Qualité de code

- Favoriser des services fins et testables.
- Éviter `any` sauf exception justifiée (la racine interdit `@typescript-eslint/no-explicit-any`).
- Conserver les imports et chemins d'alias existants (`~/*`, `@/*`) quand applicables.

## Web (`apps/web`) - conventions Nuxt 3

### Architecture

- Application configurée en SPA (`ssr: false` dans `nuxt.config.ts`).
- `srcDir` défini à `src`.
- Organisation attendue : `src/pages`, `src/components`, `src/composables`, `src/stores`.

### Scripts utiles

```bash
yarn workspace @libertech-fr/sesame-orchestrator_web start:dev
yarn workspace @libertech-fr/sesame-orchestrator_web build
yarn workspace @libertech-fr/sesame-orchestrator_web lint
yarn workspace @libertech-fr/sesame-orchestrator_web lint:fix
```

### Règles de développement

- Privilégier TypeScript strict côté logique métier/composables.
- Garder les composants Vue ciblés et lisibles.
- Respecter la configuration Nuxt existante (runtime config, modules, proxy, pinia, quasar, sentry).
- Ne pas introduire de logique SSR, routes serveur ad hoc, ni comportement contraire à `ssr: false`.

## ESLint, Prettier, EditorConfig (obligatoire)

### ESLint

- Racine : `.eslintrc.js` avec `plugin:@typescript-eslint/recommended` + `plugin:prettier/recommended`.
- API : `apps/api/.eslintrc.js` (override local autorisant certaines règles).
- Web : lint via `eslint .` (config Nuxt/eslint stack du projet).

Commandes standard :

```bash
yarn lint
yarn workspace @libertech-fr/sesame-orchestrator_api lint
yarn workspace @libertech-fr/sesame-orchestrator_web lint
```

### Prettier

Racine (`.prettierrc`) :

- `semi: false`
- `singleQuote: true`
- `trailingComma: all`
- `arrowParens: always`
- `printWidth: 180`

Commande de format racine :

```bash
yarn format
```

### EditorConfig

Règles globales (`.editorconfig`) :

- indentation : 2 espaces
- fin de ligne : LF
- charset : UTF-8
- suppression des espaces fin de ligne
- newline finale obligatoire
- exception : pas de trim trailing whitespace sur `*.md`
- exception : tabulation pour `Makefile`

## Workflow de développement

### Via scripts npm/yarn

```bash
yarn install
yarn start:dev
yarn build
yarn lint
```

### Via Makefile (Docker/dev env)

```bash
make dbs
make dev
make stop
```

## Règles de contribution pour agents IA

1. Respecter en priorité les configurations réelles du dépôt (`.eslintrc.js`, `.prettierrc`, `.editorconfig`, `turbo.json`).
2. Ne pas introduire d'outils parallèles de lint/format sans demande explicite.
3. Après modification de code, exécuter au minimum le lint ciblé de l'application touchée.
4. Éviter les changements de style massifs non liés à la tâche.
5. Conserver la cohérence des scripts existants (`start:dev`, `start:prod`, `start:debug`, `lint`, `build`).
6. Documenter brièvement les choix non évidents dans la PR/commit.

## Raccourcis utiles

```bash
# Monorepo
yarn start:dev
yarn lint
yarn format

# API
yarn workspace @libertech-fr/sesame-orchestrator_api start:dev
yarn workspace @libertech-fr/sesame-orchestrator_api lint:fix

# Web
yarn workspace @libertech-fr/sesame-orchestrator_web start:dev
yarn workspace @libertech-fr/sesame-orchestrator_web lint:fix
```
