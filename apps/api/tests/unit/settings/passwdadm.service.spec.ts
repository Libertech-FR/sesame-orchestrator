import { PasswdadmService } from '~/settings/passwdadm.service';

describe('PasswdadmService.getPolicyViolation', () => {
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

    const violation = await PasswdadmService.prototype.getPolicyViolation.call(ctx, 'NoDigitsHere!');
    expect(violation).toBe('Le mot de passe doit contenir au moins un chiffre');
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

    const violation = await PasswdadmService.prototype.getPolicyViolation.call(ctx, 'Has1Digit');
    expect(violation).toBeNull();
  });
});
