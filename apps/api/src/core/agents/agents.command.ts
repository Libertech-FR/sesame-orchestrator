import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Types } from 'mongoose';
import { Command, CommandRunner, InquirerService, Question, QuestionSet, SubCommand } from 'nest-commander';
import { CronConsoleHandler } from '~/_common/decorators/cron-console-handler.decorator';
import { AgentsCreateDto, AgentsUpdateDto } from '~/core/agents/_dto/agents.dto';
import { AgentState } from '~/core/agents/_enum/agent-state.enum';
import { AgentsService } from '~/core/agents/agents.service';
import { Agents } from './_schemas/agents.schema';

function isTotpEnabledForAgentSecurity(security: Record<string, unknown>): boolean {
  const otpKey = `${security.otpKey || ''}`.trim().replace(/\s+/g, '').toUpperCase();
  if (!otpKey) return false;
  return /^[A-Z2-7]+=*$/.test(otpKey) && otpKey.length >= 16;
}

function hasWebAuthnKeyForAgentSecurity(security: Record<string, unknown>): boolean {
  const keys = security.u2fKey;
  if (!Array.isArray(keys)) return false;
  return keys.some((key) => {
    const entry = key && typeof key === 'object' ? (key as Record<string, unknown>) : {};
    return `${entry.credentialId || ''}`.trim() && `${entry.publicKey || ''}`.trim();
  });
}

function resolveAgentSecurity(agent: Agents): Record<string, unknown> {
  if (!agent.security || typeof agent.security !== 'object') return {};
  if (typeof (agent.security as { toObject?: () => Record<string, unknown> }).toObject === 'function') {
    return (agent.security as { toObject: () => Record<string, unknown> }).toObject();
  }
  return { ...(agent.security as unknown as Record<string, unknown>) };
}

function normalizeAllowedNetworks(security: Record<string, unknown>): string[] {
  if (!Array.isArray(security.allowedNetworks)) return [];
  return security.allowedNetworks.map((item) => `${item || ''}`.trim()).filter((item) => item.length > 0);
}

async function findAgentByUsername(agentsService: AgentsService, username: string): Promise<Agents | null> {
  return (await agentsService.findOne<Agents>({ username })) as Agents | null;
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
    return val;
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
    return val;
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
    return val;
  }

  @Question({
    message: 'Réseaux autorisés (CSV, vide = aucun filtrage) ?',
    name: 'allowedNetworks',
  })
  parseAllowedNetworks(val: string) {
    const raw = `${val || ''}`.trim();
    if (!raw) return [];
    return raw
      .split(',')
      .map((item) => `${item || ''}`.trim())
      .filter((item) => item.length > 0);
  }
}

@QuestionSet({ name: 'agent-reset-password-questions' })
export class AgentResetPasswordQuestions {
  @Question({
    message: 'Nouveau mot de passe ?',
    name: 'password',
    type: 'password',
  })
  parsePassword(val: string) {
    return val;
  }

  @Question({
    message: 'Confirmer le mot de passe ?',
    name: 'confirmPassword',
    type: 'password',
  })
  parseConfirmPassword(val: string) {
    return val;
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
@SubCommand({
  name: 'create',
  description: 'Créer un agent (mode interactif : username, email, mot de passe, réseaux)',
})
export class AgentsCreateCommand extends CommandRunner {
  private readonly logger = new Logger(AgentsCreateCommand.name);

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
    super();
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
    this.logger.log('Starting agent creation process...');
    // Pose les questions définies dans AgentCreateQuestions pour obtenir les données de l'agent
    const agent = await this.inquirer.ask<AgentsCreateDto & { allowedNetworks?: string[] }>(
      'agent-create-questions',
      undefined,
    );
    try {
      if (Array.isArray((agent as any).allowedNetworks) && (agent as any).allowedNetworks.length > 0) {
        (agent as any).security = {
          ...(agent as any).security,
          allowedNetworks: (agent as any).allowedNetworks,
        };
      }
      delete (agent as any).allowedNetworks;
      // Crée l'agent avec les données collectées
      await this.agentsService.create(agent);
      console.log('Agent created successfully');
    } catch (error) {
      console.error('Error creating agent', error);
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
@SubCommand({
  name: 'clear-mfa',
  arguments: '<username>',
  description: "Supprimer le MFA (TOTP + clés FIDO/WebAuthn) d'un agent",
  argsDescription: { username: "Nom d'utilisateur de l'agent" },
})
export class AgentsClearMfaCommand extends CommandRunner {
  private readonly logger = new Logger(AgentsClearMfaCommand.name);

  public constructor(
    protected moduleRef: ModuleRef,
    private readonly agentsService: AgentsService,
  ) {
    super();
  }

  async run(inputs: string[], _options: unknown): Promise<void> {
    const username = `${inputs[0] || ''}`.trim();
    if (!username) {
      console.error('Usage: yarn console agents clear-mfa <username>');
      return;
    }

    this.logger.log(`Clearing MFA for agent "${username}"...`);

    try {
      const agent = (await this.agentsService.findOne<Agents>({ username })) as Agents | null;
      if (!agent?._id) {
        console.error(`Agent introuvable: ${username}`);
        return;
      }

      const currentSecurity = resolveAgentSecurity(agent);

      const hadTotp = isTotpEnabledForAgentSecurity(currentSecurity);
      const hadWebAuthn = hasWebAuthnKeyForAgentSecurity(currentSecurity);
      const fidoKeyCount = Array.isArray(currentSecurity.u2fKey) ? currentSecurity.u2fKey.length : 0;

      if (!hadTotp && !hadWebAuthn) {
        console.log(`Aucun MFA actif pour "${username}".`);
        return;
      }

      await this.agentsService.update(
        agent._id as Types.ObjectId,
        {
          security: {
            ...currentSecurity,
            otpKey: '',
            u2fKey: [],
          },
        } as AgentsUpdateDto,
      );

      console.log(`MFA désactivé pour "${username}".`);
      if (hadTotp) console.log('- TOTP supprimé');
      if (hadWebAuthn) console.log(`- ${fidoKeyCount} clé(s) FIDO/WebAuthn supprimée(s)`);
    } catch (error) {
      console.error('Erreur lors de la suppression du MFA', error);
    }
  }
}

/**
 * Réinitialise le mot de passe d'un agent.
 *
 * @example
 * ```bash
 * yarn console agents reset-password admin
 * ```
 */
@SubCommand({
  name: 'reset-password',
  arguments: '<username>',
  description: "Réinitialiser le mot de passe d'un agent (saisie interactive)",
  argsDescription: { username: "Nom d'utilisateur de l'agent" },
})
export class AgentsResetPasswordCommand extends CommandRunner {
  private readonly logger = new Logger(AgentsResetPasswordCommand.name);

  public constructor(
    protected moduleRef: ModuleRef,
    private readonly inquirer: InquirerService,
    private readonly agentsService: AgentsService,
  ) {
    super();
  }

  async run(inputs: string[], _options: unknown): Promise<void> {
    const username = `${inputs[0] || ''}`.trim();
    if (!username) {
      console.error('Usage: yarn console agents reset-password <username>');
      return;
    }

    this.logger.log(`Resetting password for agent "${username}"...`);

    try {
      const agent = await findAgentByUsername(this.agentsService, username);
      if (!agent?._id) {
        console.error(`Agent introuvable: ${username}`);
        return;
      }

      const { password, confirmPassword } = await this.inquirer.ask<{ password: string; confirmPassword: string }>(
        'agent-reset-password-questions',
        undefined,
      );

      if (!password) {
        console.error('Le mot de passe ne peut pas être vide.');
        return;
      }

      if (password !== confirmPassword) {
        console.error('Les mots de passe ne correspondent pas.');
        return;
      }

      await this.agentsService.update(
        agent._id as Types.ObjectId,
        {
          password,
        } as AgentsUpdateDto,
      );

      console.log(`Mot de passe réinitialisé pour "${username}".`);
    } catch (error) {
      console.error('Erreur lors de la réinitialisation du mot de passe', error);
    }
  }
}

/**
 * Désactive un agent.
 *
 * @example
 * ```bash
 * yarn console agents disable admin
 * ```
 */
@SubCommand({
  name: 'disable',
  arguments: '<username>',
  description: 'Désactiver un agent (empêche la connexion)',
  argsDescription: { username: "Nom d'utilisateur de l'agent" },
})
export class AgentsDisableCommand extends CommandRunner {
  private readonly logger = new Logger(AgentsDisableCommand.name);

  public constructor(
    protected moduleRef: ModuleRef,
    private readonly agentsService: AgentsService,
  ) {
    super();
  }

  async run(inputs: string[], _options: unknown): Promise<void> {
    const username = `${inputs[0] || ''}`.trim();
    if (!username) {
      console.error('Usage: yarn console agents disable <username>');
      return;
    }

    this.logger.log(`Disabling agent "${username}"...`);

    try {
      const agent = await findAgentByUsername(this.agentsService, username);
      if (!agent?._id) {
        console.error(`Agent introuvable: ${username}`);
        return;
      }

      if (agent.state?.current === AgentState.DISABLED) {
        console.log(`L'agent "${username}" est déjà désactivé.`);
        return;
      }

      await this.agentsService.update(
        agent._id as Types.ObjectId,
        {
          state: {
            ...agent.state,
            current: AgentState.DISABLED,
            lastChangedAt: new Date(),
          },
        } as AgentsUpdateDto,
      );

      console.log(`Agent "${username}" désactivé.`);
    } catch (error) {
      console.error("Erreur lors de la désactivation de l'agent", error);
    }
  }
}

/**
 * Active un agent.
 *
 * @example
 * ```bash
 * yarn console agents enable admin
 * ```
 */
@SubCommand({
  name: 'enable',
  arguments: '<username>',
  description: 'Activer un agent',
  argsDescription: { username: "Nom d'utilisateur de l'agent" },
})
export class AgentsEnableCommand extends CommandRunner {
  private readonly logger = new Logger(AgentsEnableCommand.name);

  public constructor(
    protected moduleRef: ModuleRef,
    private readonly agentsService: AgentsService,
  ) {
    super();
  }

  async run(inputs: string[], _options: unknown): Promise<void> {
    const username = `${inputs[0] || ''}`.trim();
    if (!username) {
      console.error('Usage: yarn console agents enable <username>');
      return;
    }

    this.logger.log(`Enabling agent "${username}"...`);

    try {
      const agent = await findAgentByUsername(this.agentsService, username);
      if (!agent?._id) {
        console.error(`Agent introuvable: ${username}`);
        return;
      }

      if (agent.state?.current === AgentState.ACTIVE) {
        console.log(`L'agent "${username}" est déjà actif.`);
        return;
      }

      await this.agentsService.update(
        agent._id as Types.ObjectId,
        {
          state: {
            ...agent.state,
            current: AgentState.ACTIVE,
            lastChangedAt: new Date(),
          },
        } as AgentsUpdateDto,
      );

      console.log(`Agent "${username}" activé.`);
    } catch (error) {
      console.error("Erreur lors de l'activation de l'agent", error);
    }
  }
}

/**
 * Ajoute un réseau autorisé au filtrage d'un agent.
 *
 * @example
 * ```bash
 * yarn console agents add-network admin 192.168.1.0/24
 * ```
 */
@SubCommand({
  name: 'add-network',
  arguments: '<username> <network>',
  description: 'Ajouter un réseau au filtrage IP (notation CIDR, plage, IP)',
  argsDescription: {
    username: "Nom d'utilisateur de l'agent",
    network: 'Réseau autorisé (ex. 192.168.1.0/24)',
  },
})
export class AgentsAddNetworkCommand extends CommandRunner {
  private readonly logger = new Logger(AgentsAddNetworkCommand.name);

  public constructor(
    protected moduleRef: ModuleRef,
    private readonly agentsService: AgentsService,
  ) {
    super();
  }

  async run(inputs: string[], _options: unknown): Promise<void> {
    const username = `${inputs[0] || ''}`.trim();
    const network = `${inputs[1] || ''}`.trim();
    if (!username || !network) {
      console.error('Usage: yarn console agents add-network <username> <network>');
      return;
    }

    this.logger.log(`Adding network "${network}" for agent "${username}"...`);

    try {
      const agent = await findAgentByUsername(this.agentsService, username);
      if (!agent?._id) {
        console.error(`Agent introuvable: ${username}`);
        return;
      }

      const currentSecurity = resolveAgentSecurity(agent);
      const allowedNetworks = normalizeAllowedNetworks(currentSecurity);

      if (allowedNetworks.includes(network)) {
        console.log(`Le réseau "${network}" est déjà autorisé pour "${username}".`);
        return;
      }

      await this.agentsService.update(
        agent._id as Types.ObjectId,
        {
          security: {
            ...currentSecurity,
            allowedNetworks: [...allowedNetworks, network],
          },
        } as AgentsUpdateDto,
      );

      console.log(`Réseau "${network}" ajouté pour "${username}".`);
      console.log(`Réseaux autorisés: ${[...allowedNetworks, network].join(', ')}`);
    } catch (error) {
      console.error("Erreur lors de l'ajout du réseau autorisé", error);
    }
  }
}

/**
 * Retire un réseau autorisé du filtrage d'un agent.
 *
 * @example
 * ```bash
 * yarn console agents remove-network admin 192.168.1.0/24
 * ```
 */
@SubCommand({
  name: 'remove-network',
  arguments: '<username> <network>',
  description: 'Retirer un réseau du filtrage IP',
  argsDescription: {
    username: "Nom d'utilisateur de l'agent",
    network: 'Réseau à retirer (ex. 192.168.1.0/24)',
  },
})
export class AgentsRemoveNetworkCommand extends CommandRunner {
  private readonly logger = new Logger(AgentsRemoveNetworkCommand.name);

  public constructor(
    protected moduleRef: ModuleRef,
    private readonly agentsService: AgentsService,
  ) {
    super();
  }

  async run(inputs: string[], _options: unknown): Promise<void> {
    const username = `${inputs[0] || ''}`.trim();
    const network = `${inputs[1] || ''}`.trim();
    if (!username || !network) {
      console.error('Usage: yarn console agents remove-network <username> <network>');
      return;
    }

    this.logger.log(`Removing network "${network}" for agent "${username}"...`);

    try {
      const agent = await findAgentByUsername(this.agentsService, username);
      if (!agent?._id) {
        console.error(`Agent introuvable: ${username}`);
        return;
      }

      const currentSecurity = resolveAgentSecurity(agent);
      const allowedNetworks = normalizeAllowedNetworks(currentSecurity);

      if (!allowedNetworks.includes(network)) {
        console.log(`Le réseau "${network}" n'est pas dans la liste autorisée pour "${username}".`);
        return;
      }

      const updatedNetworks = allowedNetworks.filter((item) => item !== network);

      await this.agentsService.update(
        agent._id as Types.ObjectId,
        {
          security: {
            ...currentSecurity,
            allowedNetworks: updatedNetworks,
          },
        } as AgentsUpdateDto,
      );

      console.log(`Réseau "${network}" retiré pour "${username}".`);
      if (updatedNetworks.length === 0) {
        console.log('Aucun filtrage réseau actif (toutes les IP sont autorisées).');
      } else {
        console.log(`Réseaux autorisés: ${updatedNetworks.join(', ')}`);
      }
    } catch (error) {
      console.error('Erreur lors du retrait du réseau autorisé', error);
    }
  }
}

@CronConsoleHandler({
  handler: 'agents-list',
  command: 'agents list',
  label: 'Liste des agents',
})
@SubCommand({ name: 'list', description: 'Lister les agents' })
export class AgentsListCommand extends CommandRunner {
  private readonly logger = new Logger(AgentsListCommand.name);

  public constructor(
    protected moduleRef: ModuleRef,
    private readonly agentsService: AgentsService,
  ) {
    super();
  }

  async run(_inputs: string[], _options: any): Promise<void> {
    this.logger.log('Listing agents...');
    try {
      const agents = await this.agentsService.find<Agents>({});
      console.table(
        agents.map((agent: any) => ({
          username: agent.username,
          email: agent.email,
          displayName: agent.displayName,
          currentState: agent.state.current,
        })),
        ['username', 'email', 'displayName', 'currentState'],
      );
    } catch (error) {
      console.error('Error listing agents', error);
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
 * yarn console agents reset-password <username>
 * yarn console agents disable <username>
 * yarn console agents enable <username>
 * yarn console agents add-network <username> <network>
 * yarn console agents remove-network <username> <network>
 * ```
 */
@Command({
  name: 'agents',
  description: 'Gestion des comptes agents (administrateurs)',
  subCommands: [
    AgentsCreateCommand,
    AgentsListCommand,
    AgentsClearMfaCommand,
    AgentsResetPasswordCommand,
    AgentsDisableCommand,
    AgentsEnableCommand,
    AgentsAddNetworkCommand,
    AgentsRemoveNetworkCommand,
  ],
})
export class AgentsCommand extends CommandRunner {
  /**
   * Constructeur de la commande agents
   *
   * @param moduleRef Référence au module NestJS
   */
  public constructor(protected moduleRef: ModuleRef) {
    super();
  }

  /**
   * Affiche l'aide lorsque la commande est invoquée sans sous-commande.
   */
  async run(): Promise<void> {
    this.command.outputHelp();
  }
}
