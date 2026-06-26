import { Injectable } from '@nestjs/common';
import stringEntropy from 'fast-password-entropy';
import { pwnedPassword } from 'hibp';
import { AbstractSettingsService } from '~/settings/_abstracts/abstract-settings.service';
import { PasswordPoliciesDto } from '~/settings/_dto/password-policy.dto';

@Injectable()
export class PasswdadmService extends AbstractSettingsService {
  public async getPolicies(): Promise<PasswordPoliciesDto> {
    const parameters = this.getParameter<PasswordPoliciesDto>('passwordpolicies');
    return parameters;
  }

  public async setPolicies(policies: PasswordPoliciesDto): Promise<any> {
    return this.setParameter('passwordpolicies', policies);
  }

  public async getPolicyViolation(password: string): Promise<string | null> {
    const policies = await this.getPolicies();
    if (password.length < policies.len) {
      this.logger.error('Password too short');
      return `Le mot de passe est trop court (minimum ${policies.len} caractères)`;
    }
    if (policies.hasSpecialChars > 0) {
      if (/[!@#\$%\^\&*\)\(+=._-]/.test(password) === false) {
        this.logger.error('must have special characters');
        return 'Le mot de passe doit contenir au moins un caractère spécial';
      }
    }
    if (policies.hasLowerCase > 0) {
      if (/[a-z]/.test(password) === false) {
        this.logger.error('must have lower case characters');
        return 'Le mot de passe doit contenir au moins une minuscule';
      }
    }
    if (policies.hasUpperCase > 0) {
      if (/[A-Z]/.test(password) === false) {
        this.logger.error('must have upper case characters');
        return 'Le mot de passe doit contenir au moins une majuscule';
      }
    }
    if (policies.hasNumbers > 0) {
      if (/[0-9]/.test(password) === false) {
        this.logger.error('must have number');
        return 'Le mot de passe doit contenir au moins un chiffre';
      }
    }
    if (policies.minComplexity > 0) {
      const c = stringEntropy(password);
      if (c < policies.minComplexity) {
        this.logger.error('entropie trop faible');
        return 'La complexité du mot de passe est insuffisante';
      }
    }

    if (policies.checkPwned === true) {
      const numPwns = await pwnedPassword(password);
      if (numPwns > 0) {
        return "Ce mot de passe est déjà apparu lors d'une violation de données";
      }
    }
    return null;
  }

  public async checkPolicies(password: string): Promise<boolean> {
    return (await this.getPolicyViolation(password)) === null;
  }

  protected async defaultValues<T = PasswordPoliciesDto>(): Promise<T> {
    return <T>new PasswordPoliciesDto();
  }
}
