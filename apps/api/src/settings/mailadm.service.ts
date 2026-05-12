import { AbstractSettingsService } from '~/settings/_abstracts/abstract-settings.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { MailSettingsDto } from '~/settings/_dto/mail.settings.dto';
import { Settings } from '~/settings/_schemas/settings.schema';
import { IdentityState } from '~/management/identities/_enums/states.enum';
import { identityJsonPathStructureExists } from '~/settings/_utils/mail-recipient-json-path.util';

@Injectable()
export class MailadmService extends AbstractSettingsService {
  public constructor(
    @InjectModel(Settings.name) model: Model<Settings>,
    @InjectConnection() private readonly mongoConnection: Connection,
  ) {
    super(model);
  }

  public async getParams(): Promise<MailSettingsDto | null> {
    return await this.getParameter<MailSettingsDto>('smtpServer');
  }

  public async setParams(params: MailSettingsDto): Promise<any> {
    await this.assertRecipientJsonPathsOnSampleIdentity(params);
    return await this.setParameter('smtpServer', params);
  }

  protected async defaultValues<T = MailSettingsDto>(): Promise<T> {
    return <T>new MailSettingsDto();
  }

  private async assertRecipientJsonPathsOnSampleIdentity(params: MailSettingsDto): Promise<void> {
    const paths: { key: keyof MailSettingsDto; path: string }[] = [];
    const personnel = String(params.recipientJsonPathEmailPersonnel || '').trim();
    const principal = String(params.recipientJsonPathEmailPrincipal || '').trim();
    if (personnel) {
      paths.push({ key: 'recipientJsonPathEmailPersonnel', path: personnel });
    }
    if (principal) {
      paths.push({ key: 'recipientJsonPathEmailPrincipal', path: principal });
    }

    if (paths.length === 0) {
      return;
    }

    const sample = await this.mongoConnection.collection('identities').findOne({ state: IdentityState.SYNCED });
    if (!sample) {
      return;
    }

    const validations: Record<string, string> = {};
    for (const { key, path } of paths) {
      if (!identityJsonPathStructureExists(sample, path)) {
        validations[key] =
          "Ce chemin n'existe pas sur une identité synchronisée d'exemple (vérifiez la casse et les segments séparés par des points).";
      }
    }
    if (Object.keys(validations).length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Erreur de validation : ' + Object.keys(validations).join(', '),
        validations,
      });
    }
  }
}
