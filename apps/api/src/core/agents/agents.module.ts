import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AgentsSchema, Agents } from '~/core/agents/_schemas/agents.schema'
import { AgentsService } from './agents.service'
import { AgentsController } from './agents.controller'
import { AgentCreateQuestions, AgentsCommand } from '~/core/agents/agents.command'
import { useOnCli } from '~/_common/functions/is-cli'

/**
 * Module de gestion des agents.
 *
 * Ce module encapsule toute la logique métier liée à la gestion des agents,
 * incluant la création, la lecture, la mise à jour et la suppression (CRUD).
 * Il configure également les commandes CLI pour la création d'agents en mode interactif.
 *
 * @module AgentsModule
 *
 * @description
 * Le module configure :
 * - La connexion à la base de données MongoDB via Mongoose pour le modèle Agents
 * - Le service AgentsService pour la logique métier
 * - Le contrôleur AgentsController pour les endpoints API REST
 * - Les commandes CLI (AgentsCommand) disponibles uniquement en mode console
 *
 * @exports AgentsService - Expose le service pour être utilisé par d'autres modules
 */
@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Agents.name,
        useFactory: () => AgentsSchema,
      },
    ]),
  ],
  providers: [
    AgentsService,
    ...useOnCli([
      ...AgentsCommand.registerWithSubCommands(),
      AgentCreateQuestions,
    ]),
  ],
  controllers: [AgentsController],
  exports: [AgentsService],
})
export class AgentsModule { }
