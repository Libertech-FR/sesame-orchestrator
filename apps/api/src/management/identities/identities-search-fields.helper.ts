import { PartialProjectionType } from '~/_common/types/partial-projection.type';

export const DEFAULT_IDENTITY_SEARCH_FIELD_KEYS = [
  'inetOrgPerson.cn',
  'inetOrgPerson.givenName',
  'inetOrgPerson.sn',
  'inetOrgPerson.mail',
  'inetOrgPerson.employeeType',
  'inetOrgPerson.employeeNumber',
] as const;

export const DEFAULT_IDENTITY_SEARCH_FIELDS: PartialProjectionType<Record<string, unknown>> = Object.fromEntries(
  DEFAULT_IDENTITY_SEARCH_FIELD_KEYS.map((key) => [key, 1]),
) as PartialProjectionType<Record<string, unknown>>;

const SEARCH_FIELD_PATH_PATTERN = /^[a-zA-Z][a-zA-Z0-9_.]*$/;

export function isValidIdentitySearchFieldPath(path: string): boolean {
  const trimmed = `${path || ''}`.trim();
  return trimmed.length > 0 && trimmed.length <= 200 && SEARCH_FIELD_PATH_PATTERN.test(trimmed);
}

export function parseIdentitySearchFieldsQuery(value: unknown): string[] {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  const rawValues = Array.isArray(value) ? value : [`${value}`];
  const fields: string[] = [];

  for (const raw of rawValues) {
    if (raw === undefined || raw === null) continue;
    `${raw}`
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((field) => fields.push(field));
  }

  return fields;
}

export function mergeIdentitySearchFields(additionalFields: unknown): PartialProjectionType<Record<string, unknown>> {
  const merged: PartialProjectionType<Record<string, unknown>> = { ...DEFAULT_IDENTITY_SEARCH_FIELDS };

  for (const field of parseIdentitySearchFieldsQuery(additionalFields)) {
    if (!isValidIdentitySearchFieldPath(field)) continue;
    merged[field] = 1;
  }

  return merged;
}
