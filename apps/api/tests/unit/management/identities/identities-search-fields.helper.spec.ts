import {
  DEFAULT_IDENTITY_SEARCH_FIELD_KEYS,
  isValidIdentitySearchFieldPath,
  mergeIdentitySearchFields,
  parseIdentitySearchFieldsQuery,
} from '~/management/identities/identities-search-fields.helper';

describe('identities-search-fields.helper', () => {
  it('parseIdentitySearchFieldsQuery supports arrays and comma-separated values', () => {
    expect(parseIdentitySearchFieldsQuery(undefined)).toEqual([]);
    expect(parseIdentitySearchFieldsQuery('inetOrgPerson.uid,inetOrgPerson.mail')).toEqual([
      'inetOrgPerson.uid',
      'inetOrgPerson.mail',
    ]);
    expect(parseIdentitySearchFieldsQuery(['inetOrgPerson.uid', 'inetOrgPerson.sn'])).toEqual([
      'inetOrgPerson.uid',
      'inetOrgPerson.sn',
    ]);
  });

  it('mergeIdentitySearchFields keeps defaults and merges extra fields without duplicates', () => {
    const merged = mergeIdentitySearchFields(['inetOrgPerson.uid', 'inetOrgPerson.cn', 'invalid$field']);

    expect(Object.keys(merged).sort()).toEqual([...DEFAULT_IDENTITY_SEARCH_FIELD_KEYS, 'inetOrgPerson.uid'].sort());
    expect(merged['inetOrgPerson.cn']).toBe(1);
    expect(merged['inetOrgPerson.uid']).toBe(1);
    expect(merged['invalid$field']).toBeUndefined();
  });

  it('isValidIdentitySearchFieldPath rejects unsafe paths', () => {
    expect(isValidIdentitySearchFieldPath('inetOrgPerson.uid')).toBe(true);
    expect(isValidIdentitySearchFieldPath('$ne')).toBe(false);
    expect(isValidIdentitySearchFieldPath('')).toBe(false);
  });
});
