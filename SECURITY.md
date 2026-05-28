# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| 0.x.x   | :x:                |

## Reporting a Vulnerability

Use this section to tell people how to report a vulnerability.

Tell them where to go, how often they can expect to get an update on a
reported vulnerability, what to expect if the vulnerability is accepted or
declined, etc.

## #145 Stockage des empreintes HIBP (Pwned Passwords)

Quand l'option "Stockage des empreintes HIBP (Pwned Passwords)" est activee (politique `pwnedRecheckEnabled=true`), Sesame Orchestrator stocke des empreintes de mots de passe dans l'historique afin de permettre un re-check planifie via HIBP.

### Qu'est-ce qui est stocke

Pour chaque mot de passe enregistre dans l'historique (collection `password-history`), on calcule :

1. `SHA-1(password)` en hexadecimal (en sortie convertie en majuscules).
2. Chiffrement de cette empreinte via AES-256-GCM.
3. Stockage du resultat chiffre dans le champ Mongo `hibpSha1Enc`.

L'UI ne consomme jamais les hash en clair : elle n'expose que des indicateurs derives (ex. `hasHibpFingerprint`, `hibpLastCheckAt`, `hibpPwnCount`).

### Format de chiffrement

Le champ `hibpSha1Enc` correspond a une chaine au format :

`<ivB64>.<tagB64>.<cipherB64>`

ou :

- `iv` : IV aleatoire de 12 octets (AES-GCM)
- `tag` : tag d'authentification GCM
- `cipher` : donnees chiffrees

### Cle de chiffrement : `SESAME_PASSWORD_HISTORY_HIBP_KEY`

Le chiffrement/dechiffrement repose sur l'ENV `SESAME_PASSWORD_HISTORY_HIBP_KEY` :

- soit une cle hexadecimale de 64 caracteres (32 bytes),
- soit une cle base64 qui decode en 32 bytes.

Cette cle est utilisee cote serveur au moment :

- de l'enregistrement de `hibpSha1Enc`,
- du cron de re-check (pour dechiffrer et recalculer le prefixe/suffixe SHA-1 a interroger dans HIBP).

Consequence importante : une rotation de cle sans re-encryptage des empreintes existantes rend le re-check impossible pour les anciennes entrees (elles seront traitees comme non dechiffrables).

### Re-check planifie (cron)

Le re-check est configure dans `apps/api/defaults/cron/identities-pwned-recheck.yml` :

- schedule : tous les jours a 03:00 (`0 3 * * *`)
- handler : `identities-pwned-recheck`
- filtre : candidates dont `hibpSha1Enc != null` et `hibpLastCheckAt` est soit absent, soit plus ancien que `pwnedRecheckMaxAgeSeconds`

Le traitement :

- dechiffre `hibpSha1Enc` pour recuperer le SHA-1,
- decoupe le SHA-1 en `prefix` (5 premiers caracteres) et `suffix` (reste),
- appelle l'endpoint HIBP "range" :
  - `GET https://api.pwnedpasswords.com/range/<prefix>`
  - (le matching se fait localement sur le suffix retourne par l'API),
- ecrit :
  - `hibpLastCheckAt` = maintenant
  - `hibpPwnCount` = nombre d'occurrences si trouve, sinon 0 (ou `null` si dechiffrement impossible).
