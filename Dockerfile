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
ENV NODE_ENV=${NODE_ENV}
ENV ALLOW_RUNTIME_BUILD=true
ENV DO_NOT_TRACK=1

WORKDIR /data

ADD ecosystem.config.cjs .
ADD package.json .
ADD *.lock .
ADD ./apps/api/package.json ./apps/api/package.json
ADD ./apps/web/package.json ./apps/web/package.json

RUN apk add --no-cache \
  openssl \
  git \
  jq \
  bash \
  nano

RUN ARCH=$(uname -m) && \
  if [ "$ARCH" = "x86_64" ]; then \
  npm i -g @css-inline/css-inline-linux-x64-musl; \
  elif [ "$ARCH" = "aarch64" ]; then \
  npm i -g @css-inline/css-inline-linux-arm64-musl; \
  else \
  echo "Unsupported architecture: $ARCH" && exit 1; \
  fi

RUN yarn install \
  --prefer-offline \
  --pure-lockfile \
  --non-interactive \
  --production=false

RUN yarn global add pm2
# RUN yarn cache clean --all

COPY --from=builder /data/apps/api/dist ./apps/api/dist
COPY --from=builder /data/apps/web/.output ./apps/web/.output
COPY --from=builder /data/apps/web/nuxt.config.ts ./apps/web/nuxt.config.ts
COPY --from=builder /data/apps/web/src ./apps/web/src
COPY --from=builder /data/apps/web/start.mjs ./apps/web/start.mjs
COPY --from=builder /data/apps/web/entrypoint.sh ./apps/web/entrypoint.sh
COPY --from=builder /data/apps/web/scripts/checkinstall.sh ./apps/web/scripts/checkinstall.sh

EXPOSE 4000 3000

CMD ["pm2-runtime", "ecosystem.config.cjs"]
