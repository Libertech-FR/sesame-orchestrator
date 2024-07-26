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
}
