import {AbstractIdentitiesService} from '~/management/identities/abstract-identities.service';
import {Identities} from '~/management/identities/_schemas/identities.schema';
import { BadRequestException, HttpException, Inject, Injectable } from '@nestjs/common';
import {DataStatusEnum} from '~/management/identities/_enums/data-status';
import {ActionType} from "~/core/backends/_enum/action-type.enum";
import { PasswordHistoryService } from '~/management/password-history/password-history.service'


@Injectable()
export class IdentitiesForcepasswordService extends AbstractIdentitiesService {
  @Inject(PasswordHistoryService)
  private readonly passwordHistory: PasswordHistoryService

  public async forcePassword(id: string, newPassword: string) {
    //recherche de l'identité
    let identity: Identities = null;
    try {
      identity = await this.findById<Identities>(id);
    } catch (error) {
      throw new HttpException('Id not found', 400);
    }
    if (identity.lastBackendSync === null) {
      throw new HttpException('Identity has never been synced', 400);
    }
    if (identity.dataStatus === DataStatusEnum.DELETED) {
      throw new BadRequestException('Identity is in status deleted');
    }
    //changement du password check de la policy
    if ((await this.passwdAdmService.checkPolicies(newPassword)) === false) {
      throw new BadRequestException({
        message: 'Une erreur est survenue : Le mot de passe ne respecte pas la politique des mots de passe',
        error: 'Bad Request',
        statusCode: 400,
      });
    }
    await this.passwordHistory.assertNotReused(identity._id, newPassword)
     //ok on envoie le changement de mdp
      try{
        const [_, response] = await this.backends.executeJob(
          ActionType.IDENTITY_PASSWORD_RESET,
          identity._id,
          { uid: identity.inetOrgPerson.uid, newPassword: newPassword, ...identity.toJSON() },
          {
            async: false,
            timeoutDiscard: true,
            disableLogs: false,
            switchToProcessing: false,
            updateStatus: false,
          },
        );
        if (response?.status === 0) {
          await this.passwordHistory.recordPassword(identity._id, newPassword, 'force')
          //activation de l'identité
          await this.activation(id,DataStatusEnum.ACTIVE)
          return [_, response];
        }
      }catch (e) {
        this.logger.error('Error while reseting password. ' + e + ` (uid=${identity.inetOrgPerson.uid})`);
        throw new BadRequestException(
          'Une erreur est survenue : Tentative de réinitialisation de mot de passe impossible',
        );
      }
  }
  public async needToChangePassword(id: string){
    let identity: Identities = null;
    try {
      identity = await this.findById<Identities>(id);
    } catch (error) {
      throw new HttpException('Id not found', 400);
    }
    if (identity.lastBackendSync === null) {
      throw new HttpException('Identity has never been synced', 400);
    }
    if (identity.dataStatus === DataStatusEnum.DELETED) {
      throw new BadRequestException('Identity is in status deleted');
    }
    if (identity.dataStatus === DataStatusEnum.INACTIVE) {
      throw new BadRequestException('Identity is in status disabled');
    }
    //desactivation du compte
    try{
      await this.activation(id,DataStatusEnum.PASSWORDNEEDTOBECHANGED)
    }catch{
      throw new BadRequestException('Error changing status');
    }

  }

}
