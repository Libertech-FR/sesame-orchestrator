import { hasLifecycleMutation } from '~/management/lifecycle/_functions/has-lifecycle-mutation.function';

describe('hasLifecycleMutation', () => {
  it('should return false for empty or missing mutation', () => {
    expect(hasLifecycleMutation(undefined)).toBe(false);
    expect(hasLifecycleMutation(null)).toBe(false);
    expect(hasLifecycleMutation({})).toBe(false);
  });

  it('should return true when mutation has at least one field', () => {
    expect(hasLifecycleMutation({ 'inetOrgPerson.cn': 'mutated' })).toBe(true);
  });
});
