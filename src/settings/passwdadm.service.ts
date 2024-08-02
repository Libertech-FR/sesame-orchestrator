import {Document, Model} from "mongoose";
import {InjectModel} from "@nestjs/mongoose";
import stringEntropy from 'fast-password-entropy'
import {pwnedPassword} from "hibp";
import {PasswordPoliciesDto} from "~/settings/_dto/password-policy.dto";
import {AbstractSettingsService} from "~/settings/_abstracts/abstract-settings.service";
import {Injectable} from "@nestjs/common";
import {SmsSettingsDto} from "~/settings/_dto/sms.settings.dto";

@Injectable()
export class PasswdadmService extends AbstractSettingsService {


  public async getPolicies(): Promise<PasswordPoliciesDto> {
    const parameters=this.getParameter<PasswordPoliciesDto>('passwordpolicies')
    return parameters
  }

  public async  setPolicies(policies: PasswordPoliciesDto):Promise<any>{
    return this.setParameter('passwordpolicies',policies)
  }

  public async checkPolicies(password: string): Promise<boolean> {
    const policies = await this.getPolicies()
    if (password.length < policies.len) {
      this.logger.error('Password too short')
      return false
    }
    //tes caracteres speciaux
    if (policies.hasSpecialChars > 0) {
      if (/[!@#\$%\^\&*\)\(+=._-]/.test(password) === false) {
        this.logger.error('must have special characters')
        return false
      }
    }
    if (policies.hasLowerCase > 0) {
      if (/[a-z]/.test(password) === false) {
        this.logger.error('must have lower case characters')
        return false
      }
    }
    if (policies.hasUpperCase > 0) {
      if (/[A-Z]/.test(password) === false) {
        this.logger.error('must have upper case characters')
        return false
      }
    }
    if (policies.hasNumbers > 0) {
      if (/[A-Z]/.test(password) === false) {
        this.logger.error('must have number')
        return false
      }
    }
    //calcul de l'entropie
    if (policies.minComplexity >0){
      let c = stringEntropy(password)
      if (c < policies.minComplexity) {
        this.logger.error('entropie trop faible')
        return false
      }
    }

    // check si le mdp est pwned
    if (policies.checkPwned === true){
      const numPwns = await pwnedPassword(password);
      if (numPwns > 0){
        return false
      }
    }
    return true
  }


  protected async defaultValues<T = PasswordPoliciesDto>(): Promise<T> {
    return <T>new PasswordPoliciesDto()
  }
}
