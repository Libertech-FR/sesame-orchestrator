APP_WEB_PORT = 3002
APP_WEB_PORT_SECURE = 3443

APP_WEB_DEBUG_PORT = 24678

APP_API_PORT = 4002
APP_API_PORT_SECURE = 4443

APP_API_DEBUG_PORT = 9229

IMG_NAME = "ghcr.io/libertech-fr/sesame-orchestrator"
BASE_NAME = "sesame"
APP_NAME = "sesame-orchestrator"
PLATFORM = "linux/amd64"

include .env

GIT_BRANCH ?= $(shell git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)
GIT_COMMIT ?= $(shell git rev-parse HEAD 2>/dev/null || echo unknown)
DOCKER_TAG ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo unknown)

CERT_DIR = ./certificates
COMMON_NAME = localhost
DAYS_VALID = 365

SESAME_SENTRY_DSN ?= ""

$(shell mkdir -p $(CERT_DIR))


.DEFAULT_GOAL := help
help:
	@printf "\033[33mUsage:\033[0m\n  make [target] [arg=\"val\"...]\n\n\033[33mTargets:\033[0m\n"
	@grep -h -E '^[-a-zA-Z0-9_\.\/]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[32m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build the container
	@docker build --platform $(PLATFORM) -t $(IMG_NAME) --no-cache --progress=plain \
		--build-arg BUILD_VERSION=$(DOCKER_TAG) \
		--build-arg GIT_BRANCH=$(GIT_BRANCH) \
		--build-arg GIT_COMMIT=$(GIT_COMMIT) \
		--build-arg DOCKER_TAG=$(DOCKER_TAG) \
		.

simulation: ## Start production environment in simulation mode
	@docker run --rm -it \
		-e NODE_ENV=production \
		-e NODE_TLS_REJECT_UNAUTHORIZED=0 \
		-e GIT_BRANCH=$(GIT_BRANCH) \
		-e GIT_COMMIT=$(GIT_COMMIT) \
		-e DOCKER_TAG=$(DOCKER_TAG) \
		--add-host host.docker.internal:host-gateway \
		--platform $(PLATFORM) \
		--network dev \
		--name $(APP_NAME) \
		-e SESAME_SENTRY_DSN=$(SESAME_SENTRY_DSN) \
		-p $(APP_WEB_PORT):3000 \
		-p $(APP_WEB_PORT_SECURE):3443 \
		-p $(APP_API_PORT):4000 \
		-p $(APP_API_PORT_SECURE):4443 \
		-v $(CURDIR)/apps/api/storage:/data/apps/api/storage \
		-v $(CURDIR)/.env:/data/.env \
		-v $(CURDIR)/etc/supervisor:/etc/supervisor \
		-v $(CURDIR)/apps/api/.env:/data/apps/api/.env \
		-v $(CURDIR)/apps/web/.env:/data/apps/web/.env \
		-v $(CURDIR)/apps/web/.env.hash:/data/apps/web/.env.hash \
		-v $(CURDIR)/certificates:/data/certificates \
		-v $(CURDIR)/apps/api/configs:/data/apps/api/configs \
		-v $(CURDIR)/apps/api/defaults:/data/apps/api/defaults \
		-v $(CURDIR)/apps/web/config:/data/apps/web/config \
		$(IMG_NAME) /usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf

prod: ## Start production environment
	@docker run --rm -it \
		-e NODE_ENV=production \
		-e NODE_TLS_REJECT_UNAUTHORIZED=0 \
		-e GIT_BRANCH=$(GIT_BRANCH) \
		-e GIT_COMMIT=$(GIT_COMMIT) \
		-e DOCKER_TAG=$(DOCKER_TAG) \
		--add-host host.docker.internal:host-gateway \
		--platform $(PLATFORM) \
		--network dev \
		--name $(APP_NAME) \
		-e SESAME_SENTRY_DSN=$(SESAME_SENTRY_DSN) \
		-p $(APP_WEB_PORT):3000 \
		-p $(APP_WEB_PORT_SECURE):3443 \
		-p $(APP_API_PORT):4000 \
		-p $(APP_API_PORT_SECURE):4443 \
		-v $(CURDIR):/data \
		$(IMG_NAME) yarn start:prod

dev: ## Start development environment
	@mkdir -p $(CURDIR)/apps/api/logs/handlers
	@docker run --rm -it \
		-e NODE_ENV=development \
		-e NODE_TLS_REJECT_UNAUTHORIZED=0 \
		-e GIT_BRANCH=$(GIT_BRANCH) \
		-e GIT_COMMIT=$(GIT_COMMIT) \
		-e DOCKER_TAG=$(DOCKER_TAG) \
		--add-host host.docker.internal:host-gateway \
		--platform $(PLATFORM) \
		--network dev \
		--name $(APP_NAME) \
		-e SESAME_SENTRY_DSN=$(SESAME_SENTRY_DSN) \
		-e SESAME_CRON_LOG_ROTATE_MAX_SIZE_BYTES=10485760 \
		-p $(APP_WEB_PORT):3000 \
		-p $(APP_WEB_PORT_SECURE):3443 \
		-p $(APP_API_PORT):4000 \
		-p $(APP_API_PORT_SECURE):4443 \
		-v $(CURDIR):/data \
		-v $(CURDIR)/etc/supervisor:/etc/supervisor \
		$(IMG_NAME) yarn start:dev

debug: ## Start debug environment
	@docker run --rm -it \
		-e NODE_ENV=development \
		-e NODE_TLS_REJECT_UNAUTHORIZED=0 \
		-e GIT_BRANCH=$(GIT_BRANCH) \
		-e GIT_COMMIT=$(GIT_COMMIT) \
		-e DOCKER_TAG=$(DOCKER_TAG) \
		--add-host host.docker.internal:host-gateway \
		--platform $(PLATFORM) \
		--network dev \
		--name $(APP_NAME) \
		-e SESAME_SENTRY_DSN=$(SESAME_SENTRY_DSN) \
		-p $(APP_WEB_PORT):3000 \
		-p $(APP_WEB_PORT_SECURE):3443 \
		-p $(APP_API_PORT):4000 \
		-p $(APP_API_PORT_SECURE):4443 \
		-p $(APP_API_DEBUG_PORT):9229 \
		-p $(APP_WEB_DEBUG_PORT):24678 \
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
		-e SESAME_SENTRY_DSN=$(SESAME_SENTRY_DSN) \
		-v $(CURDIR):/data \
		$(IMG_NAME) bash

test: ## Run API unit tests in container
	@docker run -it --rm \
		-e NODE_ENV=development \
		-e NODE_TLS_REJECT_UNAUTHORIZED=0 \
		--add-host host.docker.internal:host-gateway \
		--platform $(PLATFORM) \
		--network dev \
		-e SESAME_SENTRY_DSN=$(SESAME_SENTRY_DSN) \
		-v $(CURDIR):/data \
		$(IMG_NAME) yarn workspace @libertech-fr/sesame-orchestrator_api test

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

	@docker run -d --rm \
		--name $(BASE_NAME)-maildev \
		--platform $(PLATFORM) \
		--network dev \
		-p 1080:1080 \
		-p 1025:1025 \
		maildev/maildev || true

	@docker exec -it $(BASE_NAME)-mongodb mongosh --eval "rs.initiate({_id: \"rs0\", members: [{_id: 0, host: \"$(BASE_NAME)-mongodb\"}]})" || true

stop: ## Stop the container
	@docker stop $(APP_NAME) || true

nuxt-status: ## Show Nuxt supervisor status
	@docker exec -it $(APP_NAME) sh /etc/supervisor/supervisor-manager.sh status web

supervisor-reload: ## Reload supervisor config in running container
	@docker exec -it $(APP_NAME) sh /etc/supervisor/supervisor-manager.sh reread
	@docker exec -it $(APP_NAME) sh /etc/supervisor/supervisor-manager.sh update

nuxt-restart: ## Restart Nuxt only via supervisor
	@docker exec -it $(APP_NAME) sh /etc/supervisor/supervisor-manager.sh restart web

nuxt-stop: ## Stop Nuxt only via supervisor
	@docker exec -it $(APP_NAME) sh /etc/supervisor/supervisor-manager.sh stop web

nuxt-start: ## Start Nuxt only via supervisor
	@docker exec -it $(APP_NAME) sh /etc/supervisor/supervisor-manager.sh start web

stop-all: ## Stop all containers
	@docker stop $(APP_NAME) || true
	@docker stop $(BASE_NAME)-mongodb || true
	@docker stop $(BASE_NAME)-redis || true
	@docker stop $(BASE_NAME)-maildev || true

stop-dbs: ## Stop databases
	@docker stop $(BASE_NAME)-mongodb || true
	@docker stop $(BASE_NAME)-redis || true
	@docker stop $(BASE_NAME)-maildev || true

run-test: ## Run tests
	act --container-architecture="linux/arm64" -j test

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

hibp-key-hex: ## Génère une clé 32 bytes (64 hex chars)
	@printf "SESAME_PASSWORD_HISTORY_HIBP_KEY=%s\n" "$$(openssl rand -hex 32)"

hibp-key-b64: ## Génère une clé 32 bytes (base64)
	@printf "SESAME_PASSWORD_HISTORY_HIBP_KEY=%s\n" "$$(openssl rand -base64 32)"
