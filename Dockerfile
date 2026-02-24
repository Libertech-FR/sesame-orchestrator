FROM node:22-alpine AS builder

WORKDIR /data

COPY . .

RUN apk add git && yarn install \
  --prefer-offline \
  --frozen-lockfile \
  --non-interactive \
  --production=false

RUN yarn run build

FROM node:22-alpine AS production

ARG NODE_ENV=production
ARG BUILD_VERSION=dev
ENV NODE_ENV=${NODE_ENV}
ENV BUILD_VERSION=${BUILD_VERSION}
ENV ALLOW_RUNTIME_BUILD=true
ENV DO_NOT_TRACK=1
ENV PYTHONWARNINGS=ignore::UserWarning
ENV TZ=Europe/Paris

WORKDIR /data

ADD package.json .
ADD *.lock .
ADD ./apps/api/package.json ./apps/api/package.json
ADD ./apps/web/package.json ./apps/web/package.json


COPY ./etc /etc

RUN apk add --no-cache \
  supervisor \
  openssl \
  git \
  jq \
  tzdata \
  bash \
  nano && \
  mkdir -p /var/log/supervisor

RUN ARCH=$(uname -m) && \
  if [ "$ARCH" = "x86_64" ]; then \
  npm i -g @css-inline/css-inline-linux-x64-musl; \
  elif [ "$ARCH" = "aarch64" ]; then \
  npm i -g @css-inline/css-inline-linux-arm64-musl; \
  else \
  echo "Unsupported architecture: $ARCH" && exit 1; \
  fi

RUN cp /usr/share/zoneinfo/$TZ /etc/localtime \
  && echo $TZ > /etc/timezone

RUN yarn install \
  --prefer-offline \
  --pure-lockfile \
  --non-interactive \
  --production=true && \
  yarn cache clean && \
  find /data/node_modules -name "*.md" -delete && \
  find /data/node_modules -name "*.map" -delete && \
  find /data/node_modules -name "*.ts" -not -path "*/node_modules/@types/*" -delete && \
  find /data/node_modules -type d -name "__tests__" -exec rm -rf {} + 2>/dev/null || true && \
  find /data/node_modules -type d -name "test" -exec rm -rf {} + 2>/dev/null || true && \
  find /data/node_modules -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true && \
  find /data/node_modules -type d -name "docs" -exec rm -rf {} + 2>/dev/null || true && \
  rm -rf /tmp/* /var/cache/apk/* /root/.npm /root/.node-gyp

COPY --from=builder /data/apps/api/dist ./apps/api/dist
COPY --from=builder /data/apps/api/configs ./apps/api/configs
COPY --from=builder /data/apps/api/defaults ./apps/api/defaults
COPY --from=builder /data/apps/web/.output ./apps/web/.output
COPY --from=builder /data/apps/web/config ./apps/web/config
COPY --from=builder /data/apps/web/default ./apps/web/default
COPY --from=builder /data/apps/web/nuxt.config.ts ./apps/web/nuxt.config.ts
COPY --from=builder /data/apps/web/src ./apps/web/src
COPY --from=builder /data/apps/web/start.mjs ./apps/web/start.mjs
COPY --from=builder /data/apps/web/entrypoint.sh ./apps/web/entrypoint.sh
COPY --from=builder /data/apps/web/scripts/checkinstall.sh ./apps/web/scripts/checkinstall.sh

EXPOSE 4000 3000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]
