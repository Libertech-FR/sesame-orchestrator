import type { Request } from 'express';

/**
 * Lit une en-tête HTTP (string ou première entrée d'un tableau).
 */
function headerString(req: Request, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()];
  if (typeof v === 'string') {
    return v;
  }
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') {
    return v[0];
  }
  return undefined;
}

/**
 * Prend la première valeur d'une liste CSV (ex. X-Forwarded-For: client, proxy1).
 */
function firstCsvSegment(value: string | undefined): string | null {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const part = value.split(',')[0]?.trim();
  return part && part.length > 0 ? part : null;
}

function normalizeIp(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  const value = raw.trim();
  if (value.length === 0) {
    return null;
  }
  return value.startsWith('::ffff:') ? value.slice(7) : value;
}

/** Paire TCP (souvent le dernier proxy / relai), normalisée. */
function tcpPeerIp(req: Request): string | null {
  return normalizeIp(req.socket?.remoteAddress ?? null);
}

/**
 * Résout l'IP client réelle derrière CDN / reverse-proxy (Cloudflare, nginx, etc.).
 * À utiliser pour l'auth et les audits ; combiner avec `trust proxy` sur Express si besoin.
 *
 * Si X-Forwarded-For ne fait que répéter l’IP du socket (souvent en dev derrière Nitro / Docker),
 * cette valeur n’est pas considérée comme « client d’origine » : on retombe sur la même IP pair
 * (cela ne fabrique pas une IP LAN magique — pour ça il faut un proxy qui pose une vraie chaîne XFF).
 */
export function resolveClientIp(req: Request): string | null {
  const peerIp = tcpPeerIp(req);
  const orderedHeaders = ['cf-connecting-ip', 'true-client-ip', 'x-real-ip', 'x-forwarded-for'] as const;

  for (const name of orderedHeaders) {
    const raw = headerString(req, name);
    const segment = firstCsvSegment(raw) ?? (raw?.trim() || null);
    const ip = normalizeIp(segment);
    if (!ip) {
      continue;
    }
    // Ne pas prendre un « forwarded » qui ne fait que recopier le pair TCP (pas de chaîne utile).
    if (peerIp && ip === peerIp) {
      continue;
    }
    return ip;
  }

  const expressIp = normalizeIp(req.ip ?? null);
  if (expressIp) {
    return expressIp;
  }

  return peerIp;
}

/**
 * Objet JSON pour l’endpoint de debug (footer) : champs bruts + interprétation.
 */
export function buildClientIpDebugPayload(req: Request): Record<string, unknown> {
  const pick = (name: string): string | string[] | undefined => {
    const v = req.headers[name.toLowerCase()];
    return v;
  };

  const peerIp = tcpPeerIp(req);
  const xffRaw = headerString(req, 'x-forwarded-for');
  const xffFirst = normalizeIp(firstCsvSegment(xffRaw) ?? (xffRaw?.trim() || null));
  const xffEchoesPeer = Boolean(peerIp && xffFirst && peerIp === xffFirst);
  const clientIp = resolveClientIp(req);
  const hasTrustedForward =
    Boolean(normalizeIp(headerString(req, 'x-real-ip'))) ||
    Boolean(normalizeIp(headerString(req, 'cf-connecting-ip'))) ||
    Boolean(normalizeIp(headerString(req, 'true-client-ip')));

  let hintFr =
    'clientIp = valeur utilisée par Nest (auth, audits). Ce n’est pas forcément « votre PC » si la connexion TCP passe par un relai (tunnel, port forward, Docker/Nitro).';

  if (xffEchoesPeer && !hasTrustedForward) {
    hintFr +=
      ' Ici X-Forwarded-For ne fait que répéter l’IP du pair TCP (relai) : il est ignoré pour la résolution. Sans X-Real-IP / CF-Connecting-IP / premier hop X-Forwarded-For fiable, Nest ne peut pas inventer votre IP LAN. Solution : reverse-proxy (nginx, Traefik…) qui transmet le client, puis SESAME_TRUST_PROXY=1 sur l’API.';
  }

  return {
    clientIp,
    tcpPeerNormalized: peerIp,
    xForwardedForFirstNormalized: xffFirst,
    xffIgnoredAsEchoOfTcpPeer: xffEchoesPeer,
    remoteAddress: req.socket?.remoteAddress ?? null,
    ip: req.ip ?? null,
    headers: req.headers,
    xForwardedFor: pick('x-forwarded-for') ?? null,
    xRealIp: pick('x-real-ip') ?? null,
    cfConnectingIp: pick('cf-connecting-ip') ?? null,
    host: pick('host') ?? null,
    trustProxyEnv: process.env['SESAME_TRUST_PROXY'] ?? null,
    hintFr,
  };
}
