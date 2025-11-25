import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Agents } from '~/core/agents/_schemas/agents.schema'
import { Document, Model, ModifyResult, Query, QueryOptions, SaveOptions, Types, UpdateQuery } from 'mongoose'
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema'
import { AgentsCreateDto } from './_dto/agents.dto'
import { hash } from 'argon2'
import { randomBytes } from 'node:crypto'
import { SecurityPartDTO } from './_dto/parts/security.part.dto'

/**
 * Service de gestion des agents.
 *
 * Ce service fournit les opérations CRUD pour les agents avec des fonctionnalités
 * de sécurité intégrées telles que le hachage des mots de passe et la génération
 * de clés secrètes.
 *
 * @class AgentsService
 * @extends {AbstractServiceSchema}
 *
 * @description
 * Fonctionnalités principales :
 * - Création d'agents avec hachage automatique du mot de passe (Argon2)
 * - Génération automatique d'une clé secrète unique pour chaque agent
 * - Mise à jour d'agents avec re-hachage du mot de passe si modifié
 * - Hérite des opérations CRUD standard via AbstractServiceSchema
 */
@Injectable()
export class AgentsService extends AbstractServiceSchema {
  /**
   * Constructeur du service AgentsService.
   *
   * @param {Model<Agents>} _model - Le modèle Mongoose pour la collection des agents
   */
  constructor(@InjectModel(Agents.name) protected _model: Model<Agents>) {
    super()
  }

  /**
   * Crée un nouvel agent dans la base de données.
   *
   * Cette méthode effectue les opérations suivantes :
   * - Hache le mot de passe fourni avec Argon2
   * - Génère une clé secrète aléatoire de 64 caractères hexadécimaux
   * - Initialise l'objet security si non fourni
   * - Persiste l'agent dans la base de données
   *
   * @template T - Type étendu de Agents ou Document
   * @param {AgentsCreateDto} [data] - Les données de l'agent à créer
   * @param {SaveOptions} [options] - Options de sauvegarde Mongoose
   * @returns {Promise<Document<T, any, T>>} Le document de l'agent créé
   *
   * @example
   * ```typescript
   * const agent = await agentsService.create({
   *   username: 'john.doe',
   *   email: 'john.doe@example.com',
   *   password: 'SecurePassword123!'
   * });
   * ```
   */
  public async create<T extends Agents | Document>(
    data?: AgentsCreateDto,
    options?: SaveOptions,
  ): Promise<Document<T, any, T>> {
    data.password = await hash(data.password)
    data.security = (data.security || {}) as SecurityPartDTO
    data.security.secretKey = randomBytes(32).toString('hex')

    return await super.create(data, options)
  }

  /**
   * Met à jour un agent existant dans la base de données.
   *
   * Cette méthode gère automatiquement le re-hachage du mot de passe
   * si celui-ci est modifié. Elle supporte les mises à jour directes
   * ainsi que les mises à jour via l'opérateur $set de MongoDB.
   *
   * @template T - Type étendu de Agents ou Document
   * @param {Types.ObjectId | any} _id - L'identifiant de l'agent à mettre à jour
   * @param {UpdateQuery<T> & any} update - Les données de mise à jour
   * @param {QueryOptions<T>} [options] - Options de requête Mongoose
   * @returns {Promise<ModifyResult<Query<T, T, any, T>>>} Le résultat de la modification
   *
   * @example
   * ```typescript
   * // Mise à jour simple
   * await agentsService.update(agentId, {
   *   password: 'NewPassword456!'
   * });
   *
   * // Mise à jour avec $set
   * await agentsService.update(agentId, {
   *   $set: { password: 'NewPassword456!' }
   * });
   * ```
   */
  public async update<T extends Agents | Document>(
    _id: Types.ObjectId | any,
    update: UpdateQuery<T> & any,
    options?: QueryOptions<T>,
  ): Promise<ModifyResult<Query<T, T, any, T>>> {
    // Hachage du mot de passe si présent
    if (update.password) update.password = await hash(update.password)
    if (update.$set?.password) update.$set.password = await hash(update.$set.password)

    // Log si le mot de passe est mis à jour
    if (update.password || update.$set?.password) {
      this.logger.verbose(`Updating password for agent with ID: ${_id}`)
    }

    return await super.update(_id, update, options)
  }
}
