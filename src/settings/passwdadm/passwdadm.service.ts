import {BadRequestException, Injectable, InternalServerErrorException, NotFoundException} from '@nestjs/common';
import Redis from 'ioredis';
import {AbstractService} from '~/_common/abstracts/abstract.service';
import {PasswordPolicies} from "~/settings/passwdadm/_schemas/PasswordPolicies";
import {Model} from "mongoose";
import {InjectModel} from "@nestjs/mongoose";
import {IdentitiesService} from "~/management/identities/identities.service";
import stringEntropy from 'fast-password-entropy'

@Injectable()
export class PasswdadmService extends AbstractService {
  public constructor(
    protected readonly identities: IdentitiesService,
    @InjectModel(PasswordPolicies.name) protected passwordPolicies: Model<PasswordPolicies>
  ) {
    super();
  }

  public async getPolicies(): Promise<PasswordPolicies> {
    const passwordPolicies = await this.passwordPolicies.findOne()
    if (passwordPolicies === null) {
      return new this.passwordPolicies()
    }
    return passwordPolicies
  }

  public async checkPolicies(password: string): Promise<boolean> {
    const policies = this.getPolicies()
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
    let c = stringEntropy(password)
    if (c < policies.minComplexity) {
      this.logger.error('entropie trop faible')
    }
    return true
  }
    

}
