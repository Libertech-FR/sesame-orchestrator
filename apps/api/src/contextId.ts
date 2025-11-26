import { INestApplicationContext } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core/injector/module-ref'
import { ContextIdFactory } from '@nestjs/core'

/**
 * Crée un contexte de requête avec un ID utilisateur par défaut
 *
 * @template T - Type de l'objet requête, doit contenir une propriété user optionnelle
 * @param {INestApplicationContext | ModuleRef} app - Instance de l'application NestJS ou référence de module
 * @param {T} [req] - Objet requête optionnel contenant les informations utilisateur
 * @returns {ContextId} Identifiant de contexte créé pour la requête
 *
 * @description Crée un contexte de requête avec un utilisateur par défaut ayant l'ID '000000000000000000000000'.
 * Utile pour les opérations de seed, les tâches planifiées ou les jobs en arrière-plan qui nécessitent
 * un contexte utilisateur sans provenir d'une requête HTTP réelle.
 *
 * @example
 * // Utilisation dans un job ou une tâche planifiée
 * const contextId = seedRequestContextId(this.moduleRef);
 * const service = await this.moduleRef.resolve(MyService, contextId);
 *
 * @example
 * // Avec des informations utilisateur personnalisées
 * const contextId = seedRequestContextId(app, {
 *   user: { _id: '507f1f77bcf86cd799439011', role: 'admin' }
 * });
 */
export const seedRequestContextId = <T extends { user?: any }>(app: INestApplicationContext | ModuleRef, req?: T) => {
  const contextId = ContextIdFactory.create()
  app.registerRequestByContextId(
    {
      ...req,
      user: {
        _id: '000000000000000000000000',
        ...req?.user,
      },
    },
    contextId,
  );
  return contextId
}
