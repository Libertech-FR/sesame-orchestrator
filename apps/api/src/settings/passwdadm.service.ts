import { Injectable } from '@nestjs/common';
import stringEntropy from 'fast-password-entropy';
import { pwnedPassword } from 'hibp';
import { AbstractSettingsService } from '~/settings/_abstracts/abstract-settings.service';
import { PasswordPoliciesDto } from '~/settings/_dto/password-policy.dto';
import { InitStatesEnum } from '~/management/identities/_enums/init-state.enum';
import { Identities } from '~/management/identities/_schemas/identities.schema';
import { PasswordHistory } from '~/management/password-history/_schemas/password-history.schema';
import { AnyBulkWriteOperation, Types } from 'mongoose';

@Injectable()
export class PasswdadmService extends AbstractSettingsService {
  public async getPolicies(): Promise<PasswordPoliciesDto> {
    const parameters = this.getParameter<PasswordPoliciesDto>('passwordpolicies');
    return parameters;
  }

  public async setPolicies(policies: PasswordPoliciesDto): Promise<any> {
    const previous = await this.getPolicies();
    const wasEnabled = previous?.passwordUsageExpirationEnabled !== false;
    const isEnabled = policies?.passwordUsageExpirationEnabled !== false;

    const result = await this.setParameter('passwordpolicies', policies);

    if (wasEnabled && !isEnabled) {
      await this.clearPasswordUsageExpirations();
    } else if (!wasEnabled && isEnabled) {
      await this.initPasswordUsageExpirations(policies);
    }

    return result;
  }

  /**
   * Désactivation de l'expiration : on efface les dates d'expiration de toutes les identités
   */
  private async clearPasswordUsageExpirations(): Promise<void> {
    const res = await this._model.db.model(Identities.name).updateMany(
      { passwordUsageExpiresAt: { $ne: null } },
      {
        $set: {
          passwordUsageExpiresAt: null,
          passwordUsageReminderSentDays: [],
          passwordUsageReminderLastSentAt: null,
        },
      },
    );
    this.logger.log(`Password usage expiration disabled: cleared ${res.modifiedCount} identities`);
  }

  /**
   * Activation de l'expiration : chaque identité initialisée expire à partir de son dernier changement
   * de mot de passe (dernier historique, sinon date d'initialisation, sinon date d'activation)
   */
  private async initPasswordUsageExpirations(policies: PasswordPoliciesDto): Promise<void> {
    const ttlSeconds = Number(policies?.passwordUsageExpirationTtlSeconds || 0);
    if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return;

    const now = new Date();
    const identitiesModel = this._model.db.model(Identities.name);
    const historyCollection = this._model.db.model(PasswordHistory.name).collection.name;

    const cursor = identitiesModel
      .aggregate<{ _id: Types.ObjectId; expiresAt: Date }>([
        { $match: { initState: InitStatesEnum.INITIALIZED, deletedFlag: { $ne: true } } },
        {
          $lookup: {
            from: historyCollection,
            let: { identityId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$identityId', '$$identityId'] } } },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
              { $project: { _id: 0, createdAt: 1 } },
            ],
            as: 'lastPassword',
          },
        },
        {
          $project: {
            expiresAt: {
              $add: [
                {
                  $ifNull: [
                    { $arrayElemAt: ['$lastPassword.createdAt', 0] },
                    // initInfo.sentDate est positionné à la fin de l'initialisation (cf. PasswdService.setInitState)
                    { $ifNull: ['$initInfo.sentDate', now] },
                  ],
                },
                ttlSeconds * 1000,
              ],
            },
          },
        },
      ])
      .cursor();

    let updated = 0;
    let alreadyExpired = 0;
    // les mots de passe déjà expirés reçoivent un délai minimum pour pouvoir être rappelés
    const minExpiresAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    let ops: AnyBulkWriteOperation[] = [];
    const flush = async () => {
      if (!ops.length) return;
      const res = await identitiesModel.bulkWrite(ops, { ordered: false });
      updated += res.modifiedCount;
      ops = [];
    };

    for await (const row of cursor) {
      let expiresAt = row.expiresAt;
      if (expiresAt < now) {
        expiresAt = minExpiresAt;
        alreadyExpired++;
      }
      ops.push({
        updateOne: {
          filter: { _id: row._id },
          update: {
            $set: {
              passwordUsageExpiresAt: expiresAt,
              passwordUsageReminderSentDays: [],
              passwordUsageReminderLastSentAt: null,
            },
          },
        },
      });
      if (ops.length >= 1000) await flush();
    }
    await flush();

    this.logger.log(
      `Password usage expiration enabled: set expiration on ${updated} initialized identities (${alreadyExpired} already expired, postponed to ${minExpiresAt.toISOString()})`,
    );
  }

  public async getPolicyViolation(password: string): Promise<string | null> {
    const policies = await this.getPolicies();
    if (password.length < policies.len) {
      this.logger.error('Password too short');
      return `Le mot de passe est trop court (minimum ${policies.len} caractères)`;
    }
    if (policies.hasSpecialChars > 0) {
      if (/[!@#\$%\^\&*\)\(+=._-]/.test(password) === false) {
        this.logger.error('must have special characters');
        return 'Le mot de passe doit contenir au moins un caractère spécial';
      }
    }
    if (policies.hasLowerCase > 0) {
      if (/[a-z]/.test(password) === false) {
        this.logger.error('must have lower case characters');
        return 'Le mot de passe doit contenir au moins une minuscule';
      }
    }
    if (policies.hasUpperCase > 0) {
      if (/[A-Z]/.test(password) === false) {
        this.logger.error('must have upper case characters');
        return 'Le mot de passe doit contenir au moins une majuscule';
      }
    }
    if (policies.hasNumbers > 0) {
      if (/[0-9]/.test(password) === false) {
        this.logger.error('must have number');
        return 'Le mot de passe doit contenir au moins un chiffre';
      }
    }
    if (policies.minComplexity > 0) {
      const c = stringEntropy(password);
      if (c < policies.minComplexity) {
        this.logger.error('entropie trop faible');
        return 'La complexité du mot de passe est insuffisante';
      }
    }

    if (policies.checkPwned === true) {
      const numPwns = await pwnedPassword(password);
      if (numPwns > 0) {
        return "Ce mot de passe est déjà apparu lors d'une violation de données";
      }
    }
    return null;
  }

  public async checkPolicies(password: string): Promise<boolean> {
    return (await this.getPolicyViolation(password)) === null;
  }

  protected async defaultValues<T = PasswordPoliciesDto>(): Promise<T> {
    return <T>new PasswordPoliciesDto();
  }
}
