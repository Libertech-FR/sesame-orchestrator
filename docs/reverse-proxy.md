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

### Exemple complet (Docker, réseau `reverse`)

Configuration validée en production : redirection HTTP → HTTPS, tout le trafic (REST + Socket.IO WebSocket) vers Nuxt `:3000`.

La `map` doit être déclarée **au niveau `http`** (dans `nginx.conf` ou un fichier inclus), pas dans le `server` :

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    server_name sesame.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name sesame.example.com;

    # ssl_certificate ...
    # ssl_certificate_key ...

    location / {
        proxy_pass http://sesame-orchestrator:3000;
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

Sur l’hôte sans réseau Docker `reverse`, remplacer `http://sesame-orchestrator:3000` par `http://127.0.0.1:3000` (ou le port publié, ex. `3002`).

Après modification :

```bash
nginx -t && nginx -s reload
```

### Erreurs fréquentes Nginx

| Erreur | Symptôme navigateur | Correction |
| --- | --- | --- |
| Pas de `proxy_http_version 1.1` ni d’en-têtes `Upgrade` / `Connection` | `WebSocket connection to 'wss://…/api/socket.io/…' failed` | Ajouter les directives WS **dans** `location /` (voir exemple ci-dessus) |
| `proxy_set_header` placés **en dehors** du bloc `location` | REST OK, WebSocket KO, IP client parfois incorrecte | Déplacer tous les `proxy_set_header` **à l’intérieur** de `location /` |
| Vhost séparé `listen 4000` vers l’API | Confusion de routage, contournement de Nuxt | Supprimer l’exposition directe du port `4000` ; tout passe par le vhost `443` → `:3000` |
| `proxy_pass` vers le port `4000` | Socket.IO et auth IP incohérents | Cibler uniquement `sesame-orchestrator:3000` |

> **À éviter** : router `/socket.io`, `/api` ou `/api/socket.io` directement vers le port `4000` — le front utilise le chemin `/api/socket.io` via Nuxt.

### Variante minimale

Si la `map` n’est pas disponible :

```nginx
location / {
    proxy_pass http://sesame-orchestrator:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

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
| `WebSocket connection to 'wss://…/api/socket.io/…' failed` | Nginx/Apache sans `Upgrade` / `Connection` / `proxy_http_version 1.1` |
| `Invalid frame header` (navigateur) | Upgrade WS non proxifié (HTTP renvoyé à la place) |
| Socket.IO reste en `polling` uniquement | `NUXT_PUBLIC_SOCKET_IO_POLLING_ONLY=true` ou reverse-proxy sans WS |
| Auth `ip not allowed` + `127.0.0.1` | `SESAME_TRUST_PROXY=0` ou en-têtes `X-Forwarded-For` / `X-Real-IP` absents ou hors `location` |
| WS OK en `make simulation`, KO derrière proxy | Config WS manquante sur Nginx/Apache (voir [Erreurs fréquentes Nginx](#erreurs-fréquentes-nginx)) |

### Tests sur le serveur

```bash
# Polling HTTP via Nuxt (doit répondre, pas 502)
curl -sI "http://sesame-orchestrator:3000/api/socket.io/?EIO=4&transport=polling"

# Upgrade WebSocket via Nuxt (doit renvoyer HTTP 101)
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  "http://sesame-orchestrator:3000/api/socket.io/?EIO=4&transport=websocket"
```

Si `101` en local mais échec via HTTPS public → corriger le reverse-proxy externe (vhost `443`).

### Test local (sans reverse-proxy externe)

```bash
make simulation
# NUXT_PUBLIC_SOCKET_IO_POLLING_ONLY=false est défini dans le Makefile
```

Puis vérifier le transport Socket.IO dans l’UI debug.
