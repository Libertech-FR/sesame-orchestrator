import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { AbstractService } from '~/_common/abstracts/abstract.service';
import {PasswordPolicies} from "~/settings/passwdadm/_schemas/PasswordPolicies";
import {Model} from "mongoose";
import {InjectModel} from "@nestjs/mongoose";
import {IdentitiesService} from "~/management/identities/identities.service";

@Injectable()
export class PasswdadmService extends AbstractService {
  public constructor(
    protected readonly identities: IdentitiesService,
    @InjectModel(PasswordPolicies.name) protected passwordPolicies: Model<PasswordPolicies>
  ) {
    super();
  }

  public async getPolicies(): Promise<any>{
    const passwordPolicies = await this.passwordPolicies.findOne()
    if (passwordPolicies === null){
      return new this.passwordPolicies()
    }
    return passwordPolicies
  }
  public async checkPolicies(password: string):Promise<boolean>{
    const policies=this.getPolicies()
    if (password.length < policies.len) {
      this.logger.error('Password too short')
      return false
    }

    return true
  }
  /*
  function checkPolicy(password) {
    has_len.value='highlight_off'
    let statut=true
    if (/[!@#\$%\^\&*\)\(+=._-]/.test(password) === false){
      pwdColor.value = 'red'
      iconSpecialOK(false)
      statut=false
    }else{
      iconSpecialOK(true)
    }
    if (/\d/.test(password) === false){
      pwdColor.value = 'red'
      iconNumberOK(false)
      statut=false
    }else{
      iconNumberOK(true)
    }
    if (/[a-z]/.test(password) === false){
      pwdColor.value = 'red'
      iconLowerOK(false)
      statut=false
    }else{
      iconLowerOK(true)
    }
    if (/[A-Z]/.test(password) === false){
      pwdColor.value = 'red'
      iconUpperOK(false)
      statut=false
    }else{
      iconUpperOK(true)
    }
    if (password.length < props.min) {
      console.log('trop court ' + props.min)
      iconLenOK(false)
      statut=false
    }else{
      iconLenOK(true)
    }
    console.log('password OK ')
    if (statut === true){
      pwdColor.value = 'green'
    }else {
      pwdColor.value = 'red'
    }
    //entropie
    if (complexity(password) === false){
      statut=false
      iconComplexityOK(false)
    }else{
      iconComplexityOK(true)
    }
    return statut
  }
  */

}
