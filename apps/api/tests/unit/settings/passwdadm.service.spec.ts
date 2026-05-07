import { PasswdadmService } from '~/settings/passwdadm.service';

describe('PasswdadmService.checkPolicies', () => {
  it('should reject when hasNumbers enabled and password has no digits', async () => {
    const ctx = {
      getPolicies: async () => ({
        len: 1,
        hasSpecialChars: 0,
        hasLowerCase: 0,
        hasUpperCase: 0,
        hasNumbers: 1,
        minComplexity: 0,
        checkPwned: false,
      }),
      logger: { error: jest.fn() },
    } as any;

    const ok = await PasswdadmService.prototype.checkPolicies.call(ctx, 'NoDigitsHere!');
    expect(ok).toBe(false);
  });

  it('should accept when hasNumbers enabled and password has digits', async () => {
    const ctx = {
      getPolicies: async () => ({
        len: 1,
        hasSpecialChars: 0,
        hasLowerCase: 0,
        hasUpperCase: 0,
        hasNumbers: 1,
        minComplexity: 0,
        checkPwned: false,
      }),
      logger: { error: jest.fn() },
    } as any;

    const ok = await PasswdadmService.prototype.checkPolicies.call(ctx, 'Has1Digit');
    expect(ok).toBe(true);
  });
});
