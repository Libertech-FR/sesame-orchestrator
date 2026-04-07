import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'
import { get } from 'radash'
import { IdentitiesCrudService } from '~/management/identities/identities-crud.service'
import { PasswdadmService } from '~/settings/passwdadm.service'
import { IdentityState } from '~/management/identities/_enums/states.enum'

@Injectable()
export class MailSendService {
  private readonly logger = new Logger(MailSendService.name)

  public constructor(
    private readonly identities: IdentitiesCrudService,
    private readonly passwdadmService: PasswdadmService,
    private readonly mailer: MailerService,
  ) {}

  public async sendTemplateToIdentities(args: {
    ids: string[]
    template: string
    variables?: Record<string, string>
  }): Promise<{ sent: number; skipped: number }> {
    const template = String(args.template || '').trim()
    if (!template) {
      throw new BadRequestException('Template requis')
    }
    const variables = (args.variables && typeof args.variables === 'object' ? args.variables : {}) as Record<string, any>

    const policies: any = await this.passwdadmService.getPolicies()
    const mailAttribute = String(policies?.emailAttribute || '')
    if (!mailAttribute) {
      throw new BadRequestException("Attribut mail alternatif non configuré (settings.passwordpolicies.emailAttribute)")
    }

    const identities = await this.identities.model.find({ _id: { $in: args.ids }, state: IdentityState.SYNCED }).lean()
    if (!identities?.length) {
      throw new BadRequestException('Aucune identité synchronisée trouvée')
    }

    let sent = 0
    let skipped = 0

    for (const identity of identities) {
      const to = get(identity as any, mailAttribute) as string
      if (!to) {
        skipped++
        continue
      }

      try {
        await this.mailer.sendMail({
          to,
          subject: variables?.subject || 'Notification',
          template,
          context: {
            identity,
            ...variables,
          },
        })
        sent++
      } catch (e) {
        this.logger.warn(`Failed to send template <${template}> to identity <${(identity as any)?._id}>: ${e?.message || e}`)
        skipped++
      }
    }

    return { sent, skipped }
  }
}

