import { DynamicModule, Module } from '@nestjs/common'
import { MigrationsService } from './migrations.service'

/**
 * Module NestJS pour la gestion des migrations de base de données
 *
 * @module MigrationsModule
 * @description Ce module fournit les services nécessaires pour gérer les migrations
 * de la base de données de l'application. Il peut être enregistré dynamiquement
 * pour permettre une configuration flexible.
 */
@Module({
  providers: [
    MigrationsService,
  ],
})
export class MigrationsModule {
  /**
   * Enregistre dynamiquement le module de migrations
   *
   * @returns {Promise<DynamicModule>} Une promesse qui résout en module dynamique configuré
   */
  public static async register(): Promise<DynamicModule> {
    return {
      module: this,
    }
  }
}
