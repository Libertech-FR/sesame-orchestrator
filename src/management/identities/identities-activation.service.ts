import { AbstractIdentitiesService } from '~/management/identities/abstract-identities.service';
import { Identities } from '~/management/identities/_schemas/identities.schema';
import {BadRequestException, HttpException} from '@nestjs/common';
import { DataStatusEnum } from '~/management/identities/_enums/data-status';
import { JobState } from '~/core/jobs/_enums/state.enum';

export class IdentitiesActivationService extends AbstractIdentitiesService {
  public async activation(id: string, status: boolean) {
    //recherche de l'identité
    let identity: Identities = null;
    let statusChanged = false;
    try {
      identity = await this.findById<Identities>(id);
    } catch (error) {
      throw new HttpException('Id not found', 400);
    }
    if (identity.lastBackendSync === null) {
      throw new HttpException('Identity has never been synced', 400);
    }
    if (identity.dataStatus !== DataStatusEnum.DELETED) {
      if (status) {
        if (identity.dataStatus !== DataStatusEnum.ACTIVE) {
          identity.dataStatus = DataStatusEnum.ACTIVE;
          statusChanged = true;
        }
      } else {
        if (identity.dataStatus !== DataStatusEnum.INACTIVE) {
          identity.dataStatus = DataStatusEnum.INACTIVE;
          statusChanged = true;
        }
      }
    } else {
      throw new BadRequestException('Identity is in status deleted');
    }
    //sauvegarde de l'identité
    if (statusChanged) {
      // le dataStaus à changé on envoye l info aux backend et on enregistre l identité
      const result = await this.backends.activationIdentity(identity._id.toString(), status);
      if (result.state === JobState.COMPLETED) {
        await super.update(identity._id, identity);
      } else {
        throw new HttpException('Backend failed', 400);
      }
    }
  }
}
