import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Types } from 'mongoose';
import { get } from 'radash';
import { isConsoleEntrypoint } from '~/_common/functions/is-cli';
import { IdentityState } from '~/management/identities/_enums/states.enum';
import { PasswordHistoryService } from '~/management/password-history/password-history.service';
import { PasswdadmService } from '~/settings/passwdadm.service';
import { IdentitiesCrudService } from './identities-crud.service';

@Injectable()
export class IdentitiesPasswordExpirationReminderService {
  private readonly logger = new Logger(IdentitiesPasswordExpirationReminderService.name);
  private readonly defaultTemplate = 'password_reminder';

  public constructor(
    private readonly passwordHistory: PasswordHistoryService,
    private readonly identities: IdentitiesCrudService,
    private readonly passwdadmService: PasswdadmService,
    private readonly mailer: MailerService,
  ) {}

  public async sendUpcomingPasswordExpirationReminders(): Promise<void> {
    if (isConsoleEntrypoint()) {
      return;
    }

    const policies: any = await this.passwdadmService.getPolicies();
    const reminderSteps = this.getReminderSteps(policies);
    const reminderOffsets = reminderSteps.map((step) => step.daysBefore);
    if (!reminderOffsets.length) {
      this.logger.warn('Password expiration reminder skipped: no valid reminder offsets configured');
      return;
    }

    const mailAttribute = String(policies?.emailAttribute || '').trim();
    if (!mailAttribute) {
      this.logger.warn('Password expiration reminder skipped: missing emailAttribute in password policies');
      return;
    }

    let totalSent = 0;
    let totalSkipped = 0;

    for (const step of reminderSteps) {
      const daysBefore = step.daysBefore;
      const template = this.resolveTemplateForOffset(daysBefore, policies, step);
      const subject = this.resolveSubjectForOffset(daysBefore, policies, step);
      if (!template) {
        this.logger.warn(`Password expiration reminder skipped for J-${daysBefore}: missing template`);
        continue;
      }

      const candidates = await this.getCandidatesForOffset(daysBefore);

      if (!candidates.length) {
        this.logger.debug(`Password expiration reminder: no identity found for J-${daysBefore}`);
        continue;
      }

      const identityIds = candidates.map((row) => row.identityId);
      const identities = await this.identities.model
        .find({
          _id: { $in: identityIds },
          state: IdentityState.SYNCED,
        })
        .lean();

      const identityById = new Map(identities.map((identity) => [String(identity._id), identity]));

      for (const row of candidates) {
        const identity = identityById.get(String(row.identityId));
        if (!identity) {
          totalSkipped++;
          continue;
        }

        const to = get(identity as any, mailAttribute) as string;
        if (!to) {
          totalSkipped++;
          continue;
        }

        try {
          await this.mailer.sendMail({
            to,
            subject,
            template,
            context: {
              identity,
              uid: identity?.inetOrgPerson?.uid,
              displayName: identity?.inetOrgPerson?.displayName,
              expiresAt: row.expiresAt,
              daysBefore,
            },
          });

          await this.passwordHistory.model.updateOne(
            { _id: row._id },
            {
              $addToSet: { passwordExpiryReminderSentDays: daysBefore },
              $set: { passwordExpiryReminderLastSentAt: new Date() },
            },
          );
          totalSent++;
        } catch (e) {
          this.logger.warn(
            `Password expiration reminder send failed for identity <${row.identityId}> at J-${daysBefore}: ${e?.message || e}`,
          );
          totalSkipped++;
        }
      }
    }

    this.logger.log(
      `Password expiration reminders done for offsets [${reminderOffsets.join(', ')}]: sent=${totalSent}, skipped=${totalSkipped}`,
    );
  }

  private getReminderSteps(policies: any): Array<{ daysBefore: number; template?: string; subject?: string }> {
    const stepsRaw = Array.isArray(policies?.passwordExpirationReminderSteps)
      ? policies.passwordExpirationReminderSteps
      : [];
    const normalizedSteps = stepsRaw
      .map((step: any) => ({
        daysBefore: Math.floor(Number(step?.daysBefore)),
        template: String(step?.template || '').trim(),
        subject: String(step?.subject || '').trim(),
      }))
      .filter((step: { daysBefore: number }) => Number.isFinite(step.daysBefore) && step.daysBefore >= 0)
      .sort((a: { daysBefore: number }, b: { daysBefore: number }) => b.daysBefore - a.daysBefore);

    if (normalizedSteps.length) {
      const uniqByDay = new Map<number, { daysBefore: number; template?: string; subject?: string }>();
      for (const step of normalizedSteps) {
        if (!uniqByDay.has(step.daysBefore)) {
          uniqByDay.set(step.daysBefore, step);
        }
      }
      return Array.from(uniqByDay.values());
    }

    // Legacy fallback support
    const listRaw = Array.isArray(policies?.passwordExpirationReminderDaysBeforeList)
      ? policies.passwordExpirationReminderDaysBeforeList
      : [];
    const singleRaw = Number(policies?.passwordExpirationReminderDaysBefore);

    const offsets = [
      ...listRaw.map((value) => Math.floor(Number(value))),
      ...(Number.isFinite(singleRaw) && singleRaw >= 0 ? [Math.floor(singleRaw)] : []),
    ]
      .filter((value) => Number.isFinite(value) && value >= 0)
      .filter((value, index, array) => array.indexOf(value) === index)
      .sort((a, b) => b - a);

    return offsets.map((daysBefore) => ({ daysBefore }));
  }

  private async getCandidatesForOffset(
    daysBefore: number,
  ): Promise<Array<{ _id: Types.ObjectId; identityId: Types.ObjectId; expiresAt: Date }>> {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const targetStart = new Date(now + daysBefore * dayMs);
    const targetEnd = new Date(now + (daysBefore + 1) * dayMs);

    return await this.passwordHistory.model.aggregate<{
      _id: Types.ObjectId;
      identityId: Types.ObjectId;
      expiresAt: Date;
    }>([
      {
        $match: {
          expiresAt: { $ne: null, $gte: targetStart, $lt: targetEnd },
          passwordExpiryReminderSentDays: { $nin: [daysBefore] },
        },
      },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$identityId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      { $project: { _id: 1, identityId: 1, expiresAt: 1 } },
    ]);
  }

  private resolveTemplateForOffset(
    daysBefore: number,
    policies: any,
    step?: { daysBefore: number; template?: string; subject?: string },
  ): string {
    const stepTemplate = String(step?.template || '').trim();
    if (stepTemplate) {
      return stepTemplate;
    }

    const templatesByDays =
      policies?.passwordExpirationReminderTemplatesByDays &&
      typeof policies.passwordExpirationReminderTemplatesByDays === 'object'
        ? policies.passwordExpirationReminderTemplatesByDays
        : {};

    const specificTemplate = String(templatesByDays?.[String(daysBefore)] || '').trim();
    if (specificTemplate) {
      return specificTemplate;
    }

    return this.defaultTemplate;
  }

  private resolveSubjectForOffset(
    daysBefore: number,
    policies: any,
    step?: { daysBefore: number; template?: string; subject?: string },
  ): string {
    const stepSubject = String(step?.subject || '').trim();
    if (stepSubject) {
      return stepSubject;
    }

    const subjectsByDays =
      policies?.passwordExpirationReminderSubjectsByDays &&
      typeof policies.passwordExpirationReminderSubjectsByDays === 'object'
        ? policies.passwordExpirationReminderSubjectsByDays
        : {};

    const specificSubject = String(subjectsByDays?.[String(daysBefore)] || '').trim();
    if (specificSubject) {
      return specificSubject;
    }

    return (
      String(policies?.passwordExpirationReminderSubject || 'Votre mot de passe expire bientôt').trim() ||
      'Votre mot de passe expire bientôt'
    );
  }
}
