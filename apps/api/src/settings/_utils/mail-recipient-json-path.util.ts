/** Chemin style JSON (segments séparés par des points), ex. `inetOrgPerson.mail` */
export const MAIL_RECIPIENT_JSON_PATH_REGEX = /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)+$/;

/**
 * Vérifie que chaque segment du chemin existe comme clé sur l'objet (structure présente).
 * La valeur finale peut être vide : on valide la présence des clés intermédiaires et finale.
 */
export function identityJsonPathStructureExists(root: unknown, path: string): boolean {
  const segments = path
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length < 2) {
    return false;
  }
  let cur: unknown = root;
  for (const seg of segments) {
    if (cur == null || typeof cur !== 'object') {
      return false;
    }
    const obj = cur as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(obj, seg)) {
      return false;
    }
    cur = obj[seg];
  }
  return true;
}
