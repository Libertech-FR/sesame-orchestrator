import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { get } from 'radash';
import { IdentitiesCrudService } from '~/management/identities/identities-crud.service';
import { PasswdadmService } from '~/settings/passwdadm.service';
import { MailadmService } from '~/settings/mailadm.service';
import { IdentityState } from '~/management/identities/_enums/states.enum';
import { isUserSendableMailTemplate } from './mail-templates.service';

@Injectable()
export class MailSendService {
  private readonly logger = new Logger(MailSendService.name);

  public constructor(
    private readonly identities: IdentitiesCrudService,
    private readonly passwdadmService: PasswdadmService,
    private readonly mailer: MailerService,
    private readonly mailadmService: MailadmService,
  ) {}

  public async sendTemplateToIdentities(args: {
    ids: string[];
    template: string;
    subject: string;
    variables?: Record<string, string>;
    recipientAddressSource?: 'principal' | 'personnel';
  }): Promise<{ sent: number; skipped: number }> {
    const template = String(args.template || '').trim();
    if (!template) {
      throw new BadRequestException('Template requis');
    }
    if (!isUserSendableMailTemplate(template)) {
      throw new BadRequestException(
        'Template interne Sesame : mode lecture seule (aperçu uniquement, envoi manuel non autorisé).',
      );
    }
    const subject = String(args.subject || '').trim();
    if (!subject) {
      throw new BadRequestException('Sujet requis');
    }
    const variables = (args.variables && typeof args.variables === 'object' ? args.variables : {}) as Record<
      string,
      any
    >;
    const { subject: _subjectVar, ...templateVariables } = variables;

    const smtp = await this.mailadmService.getParams();
    const principalPath = String(smtp?.recipientJsonPathEmailPrincipal || '').trim();
    const personnelPath = String(smtp?.recipientJsonPathEmailPersonnel || '').trim();
    const policies: any = await this.passwdadmService.getPolicies();
    const policyMailAttribute = String(policies?.emailAttribute || '');

    const source = args.recipientAddressSource;
    let mailPath: string;
    if (source === 'principal') {
      mailPath = principalPath;
      if (!mailPath) {
        throw new BadRequestException(
          "Chemin JSON « e-mail principal » non configuré (paramètres → Serveur SMTP → Chemin JSON de l'e-mail principal).",
        );
      }
    } else if (source === 'personnel') {
      mailPath = personnelPath;
      if (!mailPath) {
        throw new BadRequestException(
          "Chemin JSON « e-mail personnel » non configuré (paramètres → Serveur SMTP → Chemin JSON de l'e-mail personnel).",
        );
      }
    } else {
      mailPath = policyMailAttribute;
      if (!mailPath) {
        throw new BadRequestException(
          'Attribut mail alternatif non configuré (settings.passwordpolicies.emailAttribute)',
        );
      }
    }

    const identities = await this.identities.model.find({ _id: { $in: args.ids }, state: IdentityState.SYNCED }).lean();
    if (!identities?.length) {
      throw new BadRequestException('Aucune identité synchronisée trouvée');
    }

    let sent = 0;
    let skipped = 0;

    for (const identity of identities) {
      const to = get(identity as any, mailPath) as string;
      if (!to) {
        skipped++;
        continue;
      }

      try {
        await this.mailer.sendMail({
          to,
          subject,
          template,
          context: {
            identity,
            subject,
            ...templateVariables,
          },
        });
        sent++;
      } catch (e) {
        this.logger.warn(
          `Failed to send template <${template}> to identity <${(identity as any)?._id}>: ${e?.message || e}`,
        );
        skipped++;
      }
    }

    return { sent, skipped };
  }
}
