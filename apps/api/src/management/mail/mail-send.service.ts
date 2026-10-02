import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { get } from 'radash';
import { IdentitiesCrudService } from '~/management/identities/identities-crud.service';
import { PasswdadmService } from '~/settings/passwdadm.service';
import { MailadmService } from '~/settings/mailadm.service';
import { IdentityState } from '~/management/identities/_enums/states.enum';
import {
  buildMailTemplatePreviewContext,
  isUserSendableMailTemplate,
  MailTemplatesService,
} from './mail-templates.service';

export type RecipientAddressSource = 'principal' | 'personnel';

function normalizeEmailAddress(raw: unknown): string {
  if (raw == null) {
    return '';
  }
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const email = normalizeEmailAddress(item);
      if (email) {
        return email;
      }
    }
    return '';
  }
  const value = String(raw).trim();
  return value.includes('@') ? value : '';
}

function collectRecipientEmails(identity: unknown, mailPaths: string[]): string[] {
  const emails = new Set<string>();
  for (const mailPath of mailPaths) {
    const email = normalizeEmailAddress(get(identity, mailPath));
    if (email) {
      emails.add(email);
    }
  }
  return [...emails];
}

@Injectable()
export class MailSendService {
  private readonly logger = new Logger(MailSendService.name);

  public constructor(
    private readonly identities: IdentitiesCrudService,
    private readonly passwdadmService: PasswdadmService,
    private readonly mailer: MailerService,
    private readonly mailadmService: MailadmService,
    private readonly mailTemplates: MailTemplatesService,
  ) {}

  private resolveMailPaths(args: {
    recipientAddressSources?: RecipientAddressSource[];
    principalPath: string;
    personnelPath: string;
    policyMailAttribute: string;
  }): string[] {
    const sources = Array.isArray(args.recipientAddressSources) ? [...new Set(args.recipientAddressSources)] : [];

    if (!sources.length) {
      if (!args.policyMailAttribute) {
        throw new BadRequestException(
          'Attribut mail alternatif non configuré (settings.passwordpolicies.emailAttribute)',
        );
      }
      return [args.policyMailAttribute];
    }

    const mailPaths: string[] = [];
    for (const source of sources) {
      if (source === 'principal') {
        if (!args.principalPath) {
          throw new BadRequestException(
            "Chemin JSON « e-mail principal » non configuré (paramètres → Serveur SMTP → Chemin JSON de l'e-mail principal).",
          );
        }
        mailPaths.push(args.principalPath);
      } else if (source === 'personnel') {
        if (!args.personnelPath) {
          throw new BadRequestException(
            "Chemin JSON « e-mail personnel » non configuré (paramètres → Serveur SMTP → Chemin JSON de l'e-mail personnel).",
          );
        }
        mailPaths.push(args.personnelPath);
      }
    }

    return mailPaths;
  }

  public async sendTemplateToIdentities(args: {
    ids: string[];
    template: string;
    subject: string;
    variables?: Record<string, string>;
    recipientAddressSources?: RecipientAddressSource[];
  }): Promise<{ sent: number; skipped: number; errors: string[] }> {
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

    const mailPaths = this.resolveMailPaths({
      recipientAddressSources: args.recipientAddressSources,
      principalPath,
      personnelPath,
      policyMailAttribute,
    });

    const identities = await this.identities.model.find({ _id: { $in: args.ids }, state: IdentityState.SYNCED }).lean();
    if (!identities?.length) {
      throw new BadRequestException('Aucune identité synchronisée trouvée');
    }

    let sent = 0;
    let skipped = 0;
    // Messages d'erreur dédupliqués (une erreur de template MJML/Handlebars se répète pour chaque identité)
    const errors = new Set<string>();
    let withoutAddress = 0;

    const configVariables = await this.mailTemplates.getRawMailTemplateVariables().catch(() => []);

    for (const identity of identities) {
      const recipients = collectRecipientEmails(identity, mailPaths);
      if (!recipients.length) {
        skipped++;
        withoutAddress++;
        continue;
      }

      try {
        // Envoyer un mail par destinataire.
        // MailDev (et certains SMTP) affichent souvent un seul message pour plusieurs RCPT TO ;
        // ici on force 1 message par adresse pour un comportement UI attendu.
        // Défauts de mail_templates.yml résolus pour cette identité, surchargés par les variables saisies
        const configDefaults = await this.mailTemplates.resolveVariableDefaults(identity, configVariables);
        let sentForIdentity = 0;
        for (const to of recipients) {
          await this.mailer.sendMail({
            to,
            subject,
            template,
            context: {
              ...configDefaults,
              identity,
              subject,
              ...templateVariables,
            },
          });
          sentForIdentity++;
        }
        sent += sentForIdentity;
      } catch (e) {
        const message = String(e?.message || e);
        this.logger.warn(`Failed to send template <${template}> to identity <${(identity as any)?._id}>: ${message}`);
        errors.add(`Envoi du template <${template}> : ${message}`);
        skipped++;
      }
    }

    if (withoutAddress > 0) {
      errors.add(`${withoutAddress} identité(s) sans adresse e-mail (${mailPaths.join(', ')})`);
    }

    return { sent, skipped, errors: [...errors] };
  }

  /**
   * Envoie le template à une adresse de test, avec les valeurs d'aperçu en complément du contexte.
   * Autorisé aussi pour les templates internes : le destinataire est explicite et le sujet marqué [TEST].
   */
  public async sendTestTemplate(args: {
    template: string;
    to: string;
    subject?: string;
    identityId?: string;
    variables?: Record<string, string>;
  }): Promise<{ to: string; subject: string }> {
    const template = String(args.template || '').trim();
    if (!template || /[\\/]|\.\./.test(template)) {
      throw new BadRequestException('Template requis');
    }
    const to = normalizeEmailAddress(args.to);
    if (!to) {
      throw new BadRequestException('Adresse e-mail de test invalide');
    }
    const baseSubject = String(args.subject || '').trim() || `Template ${template}`;
    const subject = `[TEST] ${baseSubject}`;
    const templateVariables: Record<string, unknown> = {
      ...(args.variables && typeof args.variables === 'object' ? args.variables : {}),
    };
    delete templateVariables.subject;

    const identity = args.identityId ? await this.identities.model.findById(args.identityId).lean() : null;

    try {
      await this.mailer.sendMail({
        to,
        subject,
        template,
        context: buildMailTemplatePreviewContext({
          ...(await this.mailTemplates.resolveVariableDefaults(identity)),
          ...templateVariables,
          ...(identity ? { identity } : {}),
          subject: baseSubject,
        }),
      });
    } catch (e) {
      const message = String(e?.message || e);
      this.logger.warn(`Failed to send test template <${template}> to <${to}>: ${message}`);
      throw new BadRequestException(`Échec de l'envoi du mail de test : ${message}`);
    }

    return { to, subject };
  }
}
