import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Audits, AuditOperation } from '~/core/audits/_schemas/audits.schema';
import { Model } from 'mongoose';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { Types } from 'mongoose';

/**
 * Service de gestion des audits et de l'historique des enregistrements.
 *
 * Ce service permet de consulter, restaurer et supprimer les entrées d'audit
 * qui sont automatiquement enregistrées en base de données par un plugin Mongoose.
 * Le plugin capture automatiquement toutes les modifications (création, mise à jour,
 * suppression) et enregistre l'état complet avant/après modification.
 *
 * @class AuditsService
 * @extends {AbstractServiceSchema}
 *
 * @description
 * Fonctionnalités du service :
 * - **Lister** : Consulter l'historique complet des modifications d'un enregistrement
 * - **Restaurer** : Effectuer un rollback en restaurant une version antérieure d'un enregistrement
 * - **Supprimer** : Nettoyer les entrées d'audit obsolètes ou non nécessaires
 *
 * Note : L'enregistrement automatique des audits est géré par un plugin Mongoose
 * qui intercepte les opérations de base de données et crée les traces d'audit
 * de manière transparente.
 */
@Injectable()
export class AuditsService extends AbstractServiceSchema<Audits> {
  /**
   * Constructeur du service AuditsService.
   *
   * @param {Model<Audits>} _model - Le modèle Mongoose pour la collection des audits
   */
  constructor(@InjectModel(Audits.name) protected _model: Model<Audits>) {
    super();
  }

  public async getCollections(): Promise<string[]> {
    const values = await this._model.distinct('coll', { coll: { $exists: true, $ne: null } });
    return values.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).sort();
  }

  public async createAuthenticationAudit(params: {
    username: string;
    ip: string | null;
    result: 'success' | 'failed';
    reason: string;
    agentId?: Types.ObjectId | string;
  }): Promise<Audits> {
    const hasKnownAgentId =
      params.agentId instanceof Types.ObjectId ||
      (typeof params.agentId === 'string' && Types.ObjectId.isValid(params.agentId));
    const agentObjectId = hasKnownAgentId
      ? params.agentId instanceof Types.ObjectId
        ? params.agentId
        : new Types.ObjectId(params.agentId)
      : new Types.ObjectId('000000000000000000000000');

    const createdAt = new Date();

    return this._model.create({
      coll: 'auth',
      documentId: agentObjectId,
      op: AuditOperation.AUTHENTICATION,
      ip: params.ip ?? undefined,
      agent: {
        $ref: 'agents',
        id: agentObjectId,
        name: hasKnownAgentId ? params.username : 'N/A',
      },
      data: {
        event: 'authentication_attempt',
        username: params.username,
        ip: params.ip,
        result: params.result,
        reason: params.reason,
      },
      metadata: {
        createdBy: params.username,
        createdAt,
      },
    });
  }
}
