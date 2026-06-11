# Reverse-proxy (Nginx / Apache) — Sesame Orchestrator

## Architecture

Le navigateur ne parle **qu’au frontal Nuxt** (port `3000` dans le conteneur, souvent `3002` en local via Makefile).

| Chemin navigateur | Traitement |
| --- | --- |
| `/`, assets SPA | Nuxt |
| `/api/**` (REST, auth, etc.) | Nuxt → proxy interne → API (`SESAME_APP_API_URL`, ex. `http://127.0.0.1:4000`) |
| `/api/socket.io` | Idem (long-polling HTTP **et** upgrade WebSocket) |

**Ne pas** exposer le port API (`4000`) au navigateur en prod : tout passe par Nuxt.

### Variables utiles

| Variable | Où | Rôle |
| --- | --- | --- |
| `NUXT_PUBLIC_SOCKET_IO_POLLING_ONLY=false` | conteneur web prod / `make simulation` | Active WebSocket + repli polling |
| `SESAME_TRUST_PROXY=1` | `apps/api/.env` | API : lit `X-Forwarded-For` / `X-Real-IP` (allowlist IP) |
| `SESAME_APP_API_URL=http://127.0.0.1:4000` | `apps/web/.env` | Cible du proxy interne Nuxt → API |

### Vérification

- Panneau debug Socket.IO : `transport: "websocket"` (ou polling si repli).
- `GET /api/core/auth/client-ip` : doit renvoyer l’IP client réelle, pas `127.0.0.1`.

---

## Nginx

### En-têtes WebSocket (recommandé)

Utiliser une `map` pour gérer `Connection` correctement (préférable à `Connection "upgrade"` fixe) :

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl http2;
    server_name sesame.example.com;

    # ssl_certificate ...
    # ssl_certificate_key ...

    location / {
        proxy_pass http://127.0.0.1:3000;   # ou nom du service Docker : http://sesame-orchestrator:3000
        proxy_http_version 1.1;

        # WebSocket (Socket.IO sur /api/socket.io)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        # IP client (allowlist API)
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

### Variante minimale (équivalent à ta snippet)

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

> **À éviter** : router `/socket.io` ou `/api` directement vers le port `4000` — le front utilise le chemin `/api/socket.io` via Nuxt.

---

## Apache (2.4+)

Modules requis :

```apache
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule proxy_wstunnel_module modules/mod_proxy_wstunnel.so
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule headers_module modules/mod_headers.so
```

### VirtualHost avec upgrade WebSocket

```apache
<VirtualHost *:443>
    ServerName sesame.example.com

    SSLEngine on
    # SSLCertificateFile ...
    # SSLCertificateKeyFile ...

    ProxyPreserveHost On
  RequestHeader set X-Forwarded-Proto "https"
  RequestHeader set X-Forwarded-For %{REMOTE_ADDR}s

    # HTTP + WebSocket vers Nuxt (Socket.IO inclus dans /api/socket.io)
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*) ws://127.0.0.1:3000/$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]
    RewriteRule /(.*) http://127.0.0.1:3000/$1 [P,L]

    ProxyPassReverse / http://127.0.0.1:3000/
</VirtualHost>
```

Équivalent conceptuel des directives Nginx :

```apache
# proxy_http_version 1.1  → Rewrite ws:// + ProxyPass http://
# Upgrade / Connection  → détection %{HTTP:Upgrade} =websocket
```

### Variante `mod_proxy_wstunnel` (Apache ≥ 2.4.5)

Si tout le trafic passe par le même upstream :

```apache
<VirtualHost *:443>
    ServerName sesame.example.com

    SSLEngine on
    ProxyPreserveHost On

    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-For %{REMOTE_ADDR}s

    ProxyPass        / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    # Tunnel WebSocket (complète le ProxyPass HTTP pour les upgrades)
    ProxyPass        /ws-upgrade-placeholder ws://127.0.0.1:3000/
</VirtualHost>
```

En pratique, la variante **RewriteEngine** ci-dessus est la plus fiable pour Socket.IO sur Apache.

---

## Docker Compose + réseau `reverse`

Avec `docker-compose.prod.yml`, le service écoute en interne sur le port `3000`. Exemple Nginx sur l’hôte ou dans un conteneur du réseau `reverse` :

```nginx
proxy_pass http://sesame-orchestrator:3000;
```

(`container_name` défini dans le compose.)

---

## Dépannage

| Symptôme | Cause probable |
| --- | --- |
| `Invalid frame header` (navigateur) | Upgrade WS non proxifié (HTTP renvoyé à la place) |
| Socket.IO reste en `polling` uniquement | `NUXT_PUBLIC_SOCKET_IO_POLLING_ONLY=true` ou reverse-proxy sans WS |
| Auth `ip not allowed` + `127.0.0.1` | `SESAME_TRUST_PROXY=0` ou en-têtes `X-Forwarded-For` / `X-Real-IP` absents |
| WS OK en `make simulation`, KO derrière proxy | Config WS manquante sur Nginx/Apache (ce document) |

### Test local (sans reverse-proxy externe)

```bash
make simulation
# NUXT_PUBLIC_SOCKET_IO_POLLING_ONLY=false est défini dans le Makefile
```

Puis vérifier le transport Socket.IO dans l’UI debug.
