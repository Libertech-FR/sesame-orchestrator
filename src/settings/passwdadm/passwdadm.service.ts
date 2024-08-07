import {Document, Model} from "mongoose";
import {InjectModel} from "@nestjs/mongoose";
import stringEntropy from 'fast-password-entropy'
import {pwnedPassword} from "hibp";
import {PasswordPoliciesDto} from "~/settings/passwdadm/_dto/password-policy.dto";
import {AbstractSettingsService} from "~/_common/abstracts/abstract-settings.service";
import {Injectable} from "@nestjs/common";

@Injectable()
export class PasswdadmService extends AbstractSettingsService {


  public async getPolicies(): Promise<object> {
    const parameters=this.getParameter('passwordpolicies')
    return parameters
  }

  public async  setPolicies(policies: PasswordPoliciesDto):Promise<any>{
    return this.setParameter('passwordpolicies',policies)
  }
  public async checkPolicies(password: string): Promise<boolean> {
     return true
  }
/*
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

 */
  protected async defaultValues(): Promise<object> {
    return new PasswordPoliciesDto()
  }




}
