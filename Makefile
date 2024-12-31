APP_PORT = 4002
APP_PORT_SECURE = 4443
IMG_NAME = "ghcr.io/libertech-fr/sesame-orchestrator"
BASE_NAME = "sesame"
APP_NAME = "sesame-orchestrator"
PLATFORM = "linux/amd64"
include .env

CERT_DIR = ./certificates
COMMON_NAME = localhost
DAYS_VALID = 365

$(shell mkdir -p $(CERT_DIR))


.DEFAULT_GOAL := help
help:
	@printf "\033[33mUsage:\033[0m\n  make [target] [arg=\"val\"...]\n\n\033[33mTargets:\033[0m\n"
	@grep -E '^[-a-zA-Z0-9_\.\/]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[32m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build the container
	@docker build --platform $(PLATFORM) -t $(IMG_NAME) .

prod: ## Start production environment
	@docker run --rm -it \
		-e NODE_ENV=development \
		-e NODE_TLS_REJECT_UNAUTHORIZED=0 \
		--add-host host.docker.internal:host-gateway \
		--platform $(PLATFORM) \
		--network dev \
		--name $(APP_NAME) \
		-p $(APP_PORT):4000 \
		-p $(APP_PORT_SECURE):4443 \
		-p 9229:9229 \
		-v $(CURDIR):/data \
		$(IMG_NAME) yarn start:prod

dev: ## Start development environment
	@docker run --rm -it \
		-e NODE_ENV=development \
		-e NODE_TLS_REJECT_UNAUTHORIZED=0 \
		--add-host host.docker.internal:host-gateway \
		--platform $(PLATFORM) \
		--network dev \
		--name $(APP_NAME) \
		-p $(APP_PORT):4000 \
		-p $(APP_PORT_SECURE):4443 \
		-p 9229:9229 \
		-v $(CURDIR):/data \
		$(IMG_NAME) yarn start:dev

debug: ## Start debug environment
	@docker run --rm -it \
		-e NODE_ENV=development \
		-e NODE_TLS_REJECT_UNAUTHORIZED=0 \
		--add-host host.docker.internal:host-gateway \
		--platform $(PLATFORM) \
		--network dev \
		--name $(APP_NAME) \
		-p $(APP_PORT):4000 \
		-p $(APP_PORT_SECURE):4443 \
		-p 9229:9229 \
		-v $(CURDIR):/data \
		$(IMG_NAME) yarn start:debug

install: ## Install dependencies
	@docker run -it --rm \
		-e NODE_ENV=development \
		-e NODE_TLS_REJECT_UNAUTHORIZED=0 \
		--add-host host.docker.internal:host-gateway \
		--platform $(PLATFORM) \
		--network dev \
		-v $(CURDIR):/data \
		$(IMG_NAME) yarn install

exec: ## Run a shell in the container
	@docker run -it --rm \
		-e NODE_ENV=development \
		-e NODE_TLS_REJECT_UNAUTHORIZED=0 \
		--add-host host.docker.internal:host-gateway \
		--platform $(PLATFORM) \
		--network dev \
		-v $(CURDIR):/data \
		$(IMG_NAME) bash

dbs: ## Start databases
	@docker volume create $(BASE_NAME)-mongodb
	@docker run -d --rm \
		--name $(BASE_NAME)-mongodb \
		-v $(BASE_NAME)-mongodb:/data/db \
		-p 27017:27017 \
		-e MONGODB_REPLICA_SET_MODE=primary \
		-e MONGODB_REPLICA_SET_NAME=rs0 \
		-e ALLOW_EMPTY_PASSWORD=yes \
		--platform $(PLATFORM) \
		--network dev \
		--health-interval=5s \
		--health-timeout=3s \
		--health-start-period=5s \
		--health-retries=3 \
		--health-cmd="mongosh --eval \"db.stats().ok\" || exit 1" \
		mongo:7.0 --replSet rs0 --wiredTigerCacheSizeGB 1.5 --bind_ip localhost,$(BASE_NAME)-mongodb || true
	@docker volume create $(BASE_NAME)-redis
	@docker run -d --rm \
		--name $(BASE_NAME)-redis \
		-v $(BASE_NAME)-redis:/data \
		--platform $(PLATFORM) \
		--network dev \
		-p 6379:6379 \
		--health-interval=5s \
		--health-timeout=3s \
		--health-start-period=5s \
		--health-retries=3 \
		--health-cmd="redis-cli ping || exit 1" \
		redis || true
	@docker exec -it $(BASE_NAME)-mongodb mongosh --eval "rs.initiate({_id: \"rs0\", members: [{_id: 0, host: \"$(BASE_NAME)-mongodb\"}]})" || true

stop: ## Stop the container
	@docker stop $(APP_NAME) || true
	@docker stop $(BASE_NAME)-mongodb || true
	@docker stop $(BASE_NAME)-redis || true

stop-dbs: ## Stop databases
	@docker stop $(BASE_NAME)-mongodb || true
	@docker stop $(BASE_NAME)-redis || true


run-test: ## Run tests
	act --container-architecture="linux/arm64" -j test

gen-doc:
	@npx @compodoc/compodoc -p tsconfig.json -s -d docs --includes ./markdowns -n "Sesame Orchestrator"

ncu: ## Check latest versions of all project dependencies
	@npx npm-check-updates

ncu-upgrade: ## Upgrade all project dependencies to the latest versions
	@npx npm-check-updates -u

generate-ssl-cert: ## Générer les certificats HTTPS auto-signés
	@echo "Génération des certificats HTTPS auto-signés..."
	@openssl req -x509 \
		-newkey rsa:4096 \
		-keyout $(CERT_DIR)/server.key \
		-out $(CERT_DIR)/server.crt \
		-days $(DAYS_VALID) \
		-nodes \
		-subj "/CN=$(COMMON_NAME)"
	@chmod 600 $(CERT_DIR)/server.key
	@chmod 644 $(CERT_DIR)/server.crt
	@echo "Certificats générés avec succès dans $(CERT_DIR)"

clean-ssl-cert: ## Nettoyer les certificats HTTPS
	@rm -rf $(CERT_DIR)
	@echo "Certificats supprimés"

show-cert-info: ## Afficher les informations du certificat
	@openssl x509 -in $(CERT_DIR)/server.crt -text -noout
