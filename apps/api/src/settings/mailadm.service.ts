import { AbstractSettingsService } from '~/settings/_abstracts/abstract-settings.service';
import { Injectable } from '@nestjs/common';
import { MailSettingsDto } from '~/settings/_dto/mail.settings.dto';

@Injectable()
export class MailadmService extends AbstractSettingsService {
  public async getParams(): Promise<MailSettingsDto | null> {
    const data = await this.getParameter<MailSettingsDto>('smtpServer');
    return data;
  }

  public async setParams(params: MailSettingsDto): Promise<any> {
    return await this.setParameter('smtpServer', params);
  }

  protected async defaultValues<T = MailSettingsDto>(): Promise<T> {
    return <T>new MailSettingsDto();
  }
}
