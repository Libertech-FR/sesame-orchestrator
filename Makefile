include .env
DEV_CONTAINER_NAME = "sesame-orchestrator"
APPNAME = "sesame"

.DEFAULT_GOAL := help
help:
	@printf "\033[33mUsage:\033[0m\n  make [target] [arg=\"val\"...]\n\n\033[33mTargets:\033[0m\n"
	@grep -E '^[-a-zA-Z0-9_\.\/]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[32m%-15s\033[0m %s\n", $$1, $$2}'

dev: ## Run development server
	@docker compose --project-directory docker run -d --rm \
		--service-ports \
		--use-aliases \
		--name $(DEV_CONTAINER_NAME) \
		$(DEV_CONTAINER_NAME) yarn start:dev
	@docker logs -f $(DEV_CONTAINER_NAME)

exec: ## Execute a command in the development container
	@docker compose --project-directory docker run -it --rm $(DEV_CONTAINER_NAME) bash

run-docs: ## Execute a command in the development container
	@docker compose --project-directory docker run -p 8080:8080 -it --rm $(DEV_CONTAINER_NAME) yarn generate:docServer

install: ## Execute a command in the development container
	@docker compose --project-directory docker run -it --rm $(DEV_CONTAINER_NAME) yarn install

dbs: ## Run dependencies for development
	@docker volume create $(APPNAME)-mongo
	@docker compose --project-directory docker up -d $(APPNAME)-redis
	@docker compose --project-directory docker up -d $(APPNAME)-mongo
	@docker exec -it $(APPNAME)-mongo mongo --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: '127.0.0.1:27017'}]})" || true

stop: ## Stop all containers
	@docker compose --project-directory docker down $(DEV_CONTAINER_NAME) $(APPNAME)-redis $(APPNAME)-mongo --remove-orphans
	@docker compose --project-directory rm -f

stop-dev: ## Stop development container
	@docker compose --project-directory docker down $(DEV_CONTAINER_NAME) --remove-orphans
	@docker compose --project-directory rm -f $(DEV_CONTAINER_NAME)

stop-dbs: ## Stop dependencies for development
	@docker compose --project-directory docker down $(APPNAME)-redis $(APPNAME)-mongo --remove-orphans
	@docker compose --project-directory docker rm -f $(APPNAME)-redis $(APPNAME)-mongo

run-test: ## Run tests
	act --container-architecture="linux/arm64" -j test

gen-doc:
	npx @compodoc/compodoc -p tsconfig.json -s -d docs --includes ./markdowns -n "Sesame Orchestrator"