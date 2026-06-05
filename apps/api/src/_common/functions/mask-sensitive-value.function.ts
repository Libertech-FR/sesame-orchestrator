const SENSITIVE_KEY_PATTERN = /(SECRET|PASSWORD|PASSWD|_KEY$|TOKEN|PRIVATE|CREDENTIAL|DSN|AUTH_|API_KEY)/i;
const URI_KEY_PATTERN = /(URI|URL|DSN|MONGO|REDIS|SMPP)/i;

export function isSensitiveEnvKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

export function maskSensitiveValue(key: string, value: string): { value: string; sensitive: boolean } {
  if (!value) {
    return { value: '', sensitive: isSensitiveEnvKey(key) };
  }

  if (isSensitiveEnvKey(key)) {
    return { value: '***', sensitive: true };
  }

  if (URI_KEY_PATTERN.test(key) && /^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      let masked = false;

      if (url.username) {
        url.username = '***';
        masked = true;
      }

      if (url.password) {
        url.password = '***';
        masked = true;
      }

      if (masked) {
        return { value: url.toString(), sensitive: true };
      }
    } catch {
      // ignore invalid URI
    }
  }

  return { value, sensitive: false };
}
