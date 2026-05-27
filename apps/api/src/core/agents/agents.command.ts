import { Logger } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { Types } from 'mongoose'
import { Command, CommandRunner, InquirerService, Question, QuestionSet, SubCommand } from 'nest-commander'
import { AgentsCreateDto, AgentsUpdateDto } from '~/core/agents/_dto/agents.dto'
import { AgentsService } from '~/core/agents/agents.service'
import { Agents } from './_schemas/agents.schema'

function isTotpEnabledForAgentSecurity(security: Record<string, unknown>): boolean {
  const otpKey = `${security.otpKey || ''}`.trim().replace(/\s+/g, '').toUpperCase()
  if (!otpKey) return false
  return /^[A-Z2-7]+=*$/.test(otpKey) && otpKey.length >= 16
}

function hasWebAuthnKeyForAgentSecurity(security: Record<string, unknown>): boolean {
  const keys = security.u2fKey
  if (!Array.isArray(keys)) return false
  return keys.some((key) => {
    const entry = key && typeof key === 'object' ? (key as Record<string, unknown>) : {}
    return `${entry.credentialId || ''}`.trim() && `${entry.publicKey || ''}`.trim()
  })
}

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

  @Question({
    message: 'Réseaux autorisés (CSV, vide = aucun filtrage) ?',
    name: 'allowedNetworks',
  })
  parseAllowedNetworks(val: string) {
    const raw = `${val || ''}`.trim()
    if (!raw) return []
    return raw
      .split(',')
      .map((item) => `${item || ''}`.trim())
      .filter((item) => item.length > 0)
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
    const agent = await this.inquirer.ask<AgentsCreateDto & { allowedNetworks?: string[] }>('agent-create-questions', undefined)
    try {
      if (Array.isArray((agent as any).allowedNetworks) && (agent as any).allowedNetworks.length > 0) {
        ;(agent as any).security = {
          ...(agent as any).security,
          allowedNetworks: (agent as any).allowedNetworks,
        }
      }
      delete (agent as any).allowedNetworks
      // Crée l'agent avec les données collectées
      await this.agentsService.create(agent)
      console.log('Agent created successfully')
    } catch (error) {
      console.error('Error creating agent', error)
    }
  }
}

/**
 * Supprime le MFA (TOTP + clés FIDO/WebAuthn) d'un agent.
 *
 * @example
 * ```bash
 * yarn console agents clear-mfa admin
 * ```
 */
@SubCommand({ name: 'clear-mfa', arguments: '<username>' })
export class AgentsClearMfaCommand extends CommandRunner {
  private readonly logger = new Logger(AgentsClearMfaCommand.name)

  public constructor(
    protected moduleRef: ModuleRef,
    private readonly agentsService: AgentsService,
  ) {
    super()
  }

  async run(inputs: string[], _options: unknown): Promise<void> {
    const username = `${inputs[0] || ''}`.trim()
    if (!username) {
      console.error('Usage: yarn console agents clear-mfa <username>')
      return
    }

    this.logger.log(`Clearing MFA for agent "${username}"...`)

    try {
      const agent = (await this.agentsService.findOne<Agents>({ username })) as Agents | null
      if (!agent?._id) {
        console.error(`Agent introuvable: ${username}`)
        return
      }

      const currentSecurity =
        agent.security && typeof agent.security === 'object'
          ? typeof (agent.security as { toObject?: () => Record<string, unknown> }).toObject === 'function'
            ? (agent.security as { toObject: () => Record<string, unknown> }).toObject()
            : { ...(agent.security as unknown as Record<string, unknown>) }
          : {}

      const hadTotp = isTotpEnabledForAgentSecurity(currentSecurity)
      const hadWebAuthn = hasWebAuthnKeyForAgentSecurity(currentSecurity)
      const fidoKeyCount = Array.isArray(currentSecurity.u2fKey) ? currentSecurity.u2fKey.length : 0

      if (!hadTotp && !hadWebAuthn) {
        console.log(`Aucun MFA actif pour "${username}".`)
        return
      }

      await this.agentsService.update(agent._id as Types.ObjectId, {
        security: {
          ...currentSecurity,
          otpKey: '',
          u2fKey: [],
        },
      } as AgentsUpdateDto)

      console.log(`MFA désactivé pour "${username}".`)
      if (hadTotp) console.log('- TOTP supprimé')
      if (hadWebAuthn) console.log(`- ${fidoKeyCount} clé(s) FIDO/WebAuthn supprimée(s)`)
    } catch (error) {
      console.error('Erreur lors de la suppression du MFA', error)
    }
  }
}

@SubCommand({ name: 'list' })
export class AgentsListCommand extends CommandRunner {
  private readonly logger = new Logger(AgentsListCommand.name)

  public constructor(
    protected moduleRef: ModuleRef,
    private readonly agentsService: AgentsService,
  ) {
    super()
  }

  async run(_inputs: string[], _options: any): Promise<void> {
    this.logger.log('Listing agents...')
    try {
      const agents = await this.agentsService.find<Agents>({})
      console.table(agents.map((agent: any) => ({
        username: agent.username,
        email: agent.email,
        displayName: agent.displayName,
        currentState: agent.state.current,
      })), ['username', 'email', 'displayName', 'currentState'])
    } catch (error) {
      console.error('Error listing agents', error)
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
 * yarn run console agents list
 * yarn console agents clear-mfa <username>
 * ```
 */
@Command({
  name: 'agents',
  arguments: '<task>',
  subCommands: [AgentsCreateCommand, AgentsListCommand, AgentsClearMfaCommand],
})
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
