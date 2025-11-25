import { Logger } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { Command, CommandRunner, InquirerService, Question, QuestionSet, SubCommand } from 'nest-commander'
import { AgentsCreateDto } from '~/core/agents/_dto/agents.dto'
import { AgentsService } from '~/core/agents/agents.service'

/**
 * Ensemble de questions interactives pour la création d'un agent.
 *
 * Cette classe définit les questions qui seront posées à l'utilisateur
 * lors de la création d'un nouvel agent via la ligne de commande.
 * Les questions collectent le nom d'utilisateur, l'email et le mot de passe.
 *
 * @class AgentCreateQuestions
 */
@QuestionSet({ name: 'agent-create-questions' })
export class AgentCreateQuestions {
  /**
   * Question pour le nom d'utilisateur de l'agent
   *
   * @param val Valeur saisie par l'utilisateur
   * @returns Le nom d'utilisateur de l'agent
   */
  @Question({
    message: 'Username ?',
    name: 'username',
  })
  parseUsername(val: string) {
    return val
  }

  /**
   * Question pour l'adresse email de l'agent
   *
   * @param val Valeur saisie par l'utilisateur
   * @returns L'adresse email de l'agent
   */
  @Question({
    message: 'Email ?',
    name: 'email',
  })
  parseEmail(val: string) {
    return val
  }

  /**
   * Question pour le mot de passe de l'agent
   * Le mot de passe est masqué lors de la saisie
   *
   * @param val Valeur saisie par l'utilisateur
   * @returns Le mot de passe de l'agent
   */
  @Question({
    message: 'Password ?',
    name: 'password',
    type: 'password',
  })
  parsePassword(val: string) {
    return val
  }
}

/**
 * Sous-commande pour créer un nouvel agent.
 *
 * Cette commande permet de créer un agent en mode interactif en posant
 * une série de questions à l'utilisateur (username, email, password).
 * Les données collectées sont ensuite utilisées pour créer l'agent via
 * le service AgentsService.
 *
 * @class AgentsCreateCommand
 * @extends {CommandRunner}
 * @example
 * ```bash
 * yarn run console agents create
 * ```
 */
@SubCommand({ name: 'create' })
export class AgentsCreateCommand extends CommandRunner {
  private readonly logger = new Logger(AgentsCreateCommand.name)

  /**
   * Constructeur de la commande de création d'agent
   *
   * @param moduleRef Référence au module NestJS
   * @param inquirer Service pour poser des questions interactives à l'utilisateur
   * @param agentsService Service de gestion des agents
   */
  public constructor(
    protected moduleRef: ModuleRef,
    private readonly inquirer: InquirerService,
    private readonly agentsService: AgentsService,
  ) {
    super()
  }

  /**
   * Exécute la commande de création d'agent
   * Demande les informations nécessaires à l'utilisateur via des questions interactives
   * puis crée l'agent avec les données fournies
   *
   * @param _inputs Arguments passés à la commande
   * @param _options Options passées à la commande
   */
  async run(_inputs: string[], _options: any): Promise<void> {
    this.logger.log('Starting agent creation process...')
    // Pose les questions définies dans AgentCreateQuestions pour obtenir les données de l'agent
    const agent = await this.inquirer.ask<AgentsCreateDto>('agent-create-questions', undefined)
    try {
      // Crée l'agent avec les données collectées
      await this.agentsService.create(agent)
      console.log('Agent created successfully')
    } catch (error) {
      console.error('Error creating agent', error)
    }
  }
}

/**
 * Commande principale pour la gestion des agents.
 *
 * Cette commande sert de point d'entrée pour toutes les opérations
 * liées aux agents. Elle délègue l'exécution aux sous-commandes appropriées.
 *
 * @class AgentsCommand
 * @extends {CommandRunner}
 * @example
 * ```bash
 * yarn run console agents create
 * ```
 */
@Command({ name: 'agents', arguments: '<task>', subCommands: [AgentsCreateCommand] })
export class AgentsCommand extends CommandRunner {
  /**
   * Constructeur de la commande agents
   *
   * @param moduleRef Référence au module NestJS
   */
  public constructor(protected moduleRef: ModuleRef) {
    super()
  }

  /**
   * Point d'entrée de la commande principale
   * Délègue l'exécution aux sous-commandes
   *
   * @param _inputs Arguments passés à la commande
   * @param _options Options passées à la commande
   */
  async run(_inputs: string[], _options: any): Promise<void> { }
}
