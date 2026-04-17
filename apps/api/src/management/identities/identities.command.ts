import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Command, CommandRunner, SubCommand } from 'nest-commander';
import { seedRequestContextId } from '~/contextId';
import { Identities } from '~/management/identities/_schemas/identities.schema';
import { IdentitiesUpsertService } from '~/management/identities/identities-upsert.service';
import { IdentitiesDoublonService } from '~/management/identities/identities-doublon.service';
import { Types } from 'mongoose';
import axios from 'axios';
import { PasswordHistoryService } from '~/management/password-history/password-history.service';
import { PasswdadmService } from '~/settings/passwdadm.service';
import { IdentitiesForcepasswordService } from '~/management/identities/identities-forcepassword.service';
import { IdentitiesCrudService } from '~/management/identities/identities-crud.service';
import { MailerService } from '@nestjs-modules/mailer';
import { MailadmService } from '~/settings/mailadm.service';
import { get } from 'radash';
import { IdentitiesPasswordExpirationReminderService } from '~/management/identities/identities-password-expiration-reminder.service';

@SubCommand({ name: 'fingerprint' })
export class IdentitiesFingerprintCommand extends CommandRunner {
  private readonly logger = new Logger(IdentitiesFingerprintCommand.name);

  identitiesUpsertService: IdentitiesUpsertService;

  public constructor(
    protected moduleRef: ModuleRef,
    // private readonly identitiesUpsertService: IdentitiesUpsertService,
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {
    const contextId = seedRequestContextId(this.moduleRef);
    this.identitiesUpsertService = await this.moduleRef.resolve(IdentitiesUpsertService, contextId);

    console.log('Starting identities fingerprint update process...');
    const total = await this.identitiesUpsertService.count();
    console.log('Total identities to process:', total);
    this.logger.log(`Total identities: ${total}`);

    const identities = (await this.identitiesUpsertService.find<Identities>()) as unknown as Identities[];

    for await (const identity of identities) {
      this.logger.log(`Processing identity: ${identity._id}`);
      const fingerprint = await this.identitiesUpsertService.previewFingerprint(identity.toJSON());
      this.logger.log(`Identity: ${identity._id}, Fingerprint: ${fingerprint}, Old: ${identity.fingerprint}`);

      if (identity.fingerprint !== fingerprint) {
        this.logger.warn(`Updating fingerprint for identity: ${identity._id}`);
        await this.identitiesUpsertService.generateFingerprint(identity, fingerprint);
      } else {
        this.logger.log(`Fingerprint already up to date for identity: ${identity._id}`);
      }
    }
  }
}

@SubCommand({ name: 'cancel-fusion' })
export class IdentitiesCancelFusionCommand extends CommandRunner {
  private readonly logger = new Logger(IdentitiesCancelFusionCommand.name);

  public constructor(protected moduleRef: ModuleRef) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {
    const id1Raw = inputs[0];
    const id2Raw = inputs[1];

    if (!id1Raw || !id2Raw) {
      console.error('Usage: yarn run console identities cancel-fusion <id1> <id2>');
      return;
    }

    if (!Types.ObjectId.isValid(id1Raw) || !Types.ObjectId.isValid(id2Raw)) {
      console.error('Both <id1> and <id2> must be valid ObjectId values.');
      return;
    }

    const contextId = seedRequestContextId(this.moduleRef);
    const doublonService = await this.moduleRef.resolve(IdentitiesDoublonService, contextId);

    this.logger.log(`Cancelling fusion between ${id1Raw} and ${id2Raw} ...`);
    const newPrimaryId = await doublonService.cancelFusion(new Types.ObjectId(id1Raw), new Types.ObjectId(id2Raw));
    console.log('Fusion cancelled successfully. New primary identity:', newPrimaryId?.toString?.() ?? newPrimaryId);
  }
}

@SubCommand({ name: 'pwned' })
export class IdentitiesPwnedCommand extends CommandRunner {
  private readonly logger = new Logger(IdentitiesPwnedCommand.name);

  public constructor(protected moduleRef: ModuleRef) {
    super();
  }

  async run(inputs: string[], options: any): Promise<void> {
    const subTask = inputs?.[0];
    if (subTask !== 'recheck') {
      console.error('Usage: yarn run console identities pwned recheck [--limit=500]');
      return;
    }

    // `ModuleRef.resolve()` ne fonctionne que pour les providers transient / request-scoped.
    // Ici on a des services singleton, on utilise donc `get()`.
    const passwordHistory = this.moduleRef.get(PasswordHistoryService, { strict: false });
    const passwdadm = this.moduleRef.get(PasswdadmService, { strict: false });
    const identities = this.moduleRef.get(IdentitiesCrudService, { strict: false });
    const forcePwd = this.moduleRef.get(IdentitiesForcepasswordService, { strict: false });
    const mailer = this.moduleRef.get(MailerService, { strict: false });
    const mailadm = this.moduleRef.get(MailadmService, { strict: false });

    const policies: any = await passwdadm.getPolicies();
    if (!policies?.pwnedRecheckEnabled) {
      this.logger.warn('HIBP recheck is disabled by settings (pwnedRecheckEnabled=false).');
      return;
    }

    const maxAgeSeconds = Number(options?.maxAgeSeconds || policies?.pwnedRecheckMaxAgeSeconds || 0);
    const limit = Math.max(Number(options?.limit || 500), 1);

    const cutoff =
      Number.isFinite(maxAgeSeconds) && maxAgeSeconds > 0 ? new Date(Date.now() - maxAgeSeconds * 1000) : null;
    this.logger.debug(
      `HIBP recheck policy: enabled=true maxAgeSeconds=${Number.isFinite(maxAgeSeconds) ? maxAgeSeconds : 'NaN'} cutoff=${cutoff ? cutoff.toISOString() : 'none'} limit=${limit}`,
    );

    const filter: any = {
      hibpSha1Enc: { $ne: null },
    };
    if (cutoff) {
      filter.$or = [{ hibpLastCheckAt: null }, { hibpLastCheckAt: { $lt: cutoff } }];
    } else {
      filter.$or = [{ hibpLastCheckAt: null }];
    }

    const candidates = await passwordHistory.model
      .find(filter)
      .sort({ hibpLastCheckAt: 1, createdAt: -1 })
      .limit(limit)
      .lean();

    const totalWithEnc = await passwordHistory.model.countDocuments({ hibpSha1Enc: { $ne: null } });
    const totalNeverCheckedWithEnc = await passwordHistory.model.countDocuments({
      hibpSha1Enc: { $ne: null },
      hibpLastCheckAt: null,
    });
    this.logger.log(
      `HIBP recheck candidates: ${candidates.length} (withEnc=${totalWithEnc}, neverCheckedWithEnc=${totalNeverCheckedWithEnc})`,
    );

    for (const entry of candidates) {
      const enc = entry?.hibpSha1Enc;
      if (!enc) continue;

      let sha1: string;
      try {
        sha1 = passwordHistory.decryptHibpSha1(enc);
      } catch (e) {
        this.logger.warn(`Failed to decrypt hibpSha1Enc for history <${entry._id}>: ${e?.message || e}`);
        await passwordHistory.model.updateOne(
          { _id: entry._id },
          { $set: { hibpLastCheckAt: new Date(), hibpPwnCount: null } },
        );
        continue;
      }

      const prefix = sha1.slice(0, 5);
      const suffix = sha1.slice(5);

      try {
        const { data } = await axios.get<string>(`https://api.pwnedpasswords.com/range/${prefix}`, {
          responseType: 'text',
          timeout: 10_000,
          headers: {
            'User-Agent': 'sesame-orchestrator',
            'Add-Padding': 'true',
          },
        });

        let pwnCount = 0;
        const lines = String(data || '').split('\n');
        for (const line of lines) {
          const [s, countRaw] = line.trim().split(':');
          if (!s || !countRaw) continue;
          if (s.toUpperCase() === suffix.toUpperCase()) {
            pwnCount = parseInt(countRaw, 10) || 0;
            break;
          }
        }

        await passwordHistory.model.updateOne(
          { _id: entry._id },
          { $set: { hibpLastCheckAt: new Date(), hibpPwnCount: pwnCount } },
        );

        if (pwnCount > 0) {
          this.logger.warn(
            `PWNED password detected: history=<${entry._id}> identityId=<${entry.identityId}> count=${pwnCount}`,
          );

          const action = (policies?.pwnedRecheckAction || 'none') as 'none' | 'notify' | 'expire';
          if (action === 'expire') {
            try {
              await forcePwd.needToChangePassword(String(entry.identityId));
              this.logger.warn(`PWNED action applied: expire password identityId=<${entry.identityId}>`);
            } catch (e) {
              this.logger.warn(`PWNED action failed (expire) for identityId=<${entry.identityId}>: ${e?.message || e}`);
            }
          } else if (action === 'notify') {
            try {
              const identity = await identities.model.findById(entry.identityId).lean();
              const mailAttribute = String(policies?.emailAttribute || '');
              const email = mailAttribute ? (get(identity as any, mailAttribute) as string) : null;
              if (!email) {
                this.logger.warn(
                  `PWNED notify skipped: no email (attribute=<${mailAttribute || 'n/a'}>) for identityId=<${entry.identityId}>`,
                );
              } else {
                const smtpParams = await mailadm.getParams();
                const subject = 'Alerte sécurité : mot de passe compromis';
                const text =
                  `Bonjour,\n\n` +
                  `Un re-check de sécurité (HIBP) indique que votre mot de passe apparaît dans des fuites connues (occurrences: ${pwnCount}).\n` +
                  `Nous vous recommandons de le changer dès que possible.\n\n` +
                  `Ceci est une notification : votre accès n'est pas bloqué.\n`;

                await mailer.sendMail({
                  from: smtpParams?.sender,
                  to: email,
                  subject,
                  text,
                });
                this.logger.warn(`PWNED action applied: notified user identityId=<${entry.identityId}>`);
              }
            } catch (e) {
              this.logger.warn(`PWNED action failed (notify) for identityId=<${entry.identityId}>: ${e?.message || e}`);
            }
          }
        }
      } catch (e) {
        this.logger.warn(`HIBP range call failed for history <${entry._id}>: ${e?.message || e}`);
      }
    }
  }
}

@SubCommand({ name: 'password' })
export class IdentitiesPasswordExpirationReminderCommand extends CommandRunner {
  private readonly logger = new Logger(IdentitiesPasswordExpirationReminderCommand.name);

  public constructor(protected moduleRef: ModuleRef) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {
    const subTask = inputs?.slice(0, 3)?.join('-');
    if (subTask !== 'expiration-reminder-send') {
      console.error('Usage: yarn run console identities password expiration reminder send');
      return;
    }

    const reminderService = this.moduleRef.get(IdentitiesPasswordExpirationReminderService, { strict: false });
    this.logger.log('Running password expiration reminders...');
    await reminderService.sendUpcomingPasswordExpirationReminders();
    this.logger.log('Password expiration reminders finished');
  }
}

@Command({
  name: 'identities',
  arguments: '<task>',
  subCommands: [
    IdentitiesFingerprintCommand,
    IdentitiesCancelFusionCommand,
    IdentitiesPwnedCommand,
    IdentitiesPasswordExpirationReminderCommand,
  ],
})
export class IdentitiesCommand extends CommandRunner {
  public constructor(protected moduleRef: ModuleRef) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(inputs: string[], options: any): Promise<void> {}
}
