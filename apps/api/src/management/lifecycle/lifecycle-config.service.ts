import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { parse, stringify } from 'yaml';
import { formatValidationErrors } from '~/_common/functions/format-validation-errors.function';
import { ConfigRulesObjectIdentitiesDTO, ConfigRulesObjectSchemaDTO } from './_dto/config-rules.dto';
import { IdentityLifecycleState } from '../identities/_enums/lifecycle.enum';
import { ConfigStatesDTO, LifecycleStateDTO } from './_dto/config-states.dto';
import {
  LifecycleRuleFileCreateDto,
  LifecycleRuleFileUpdateDto,
  LifecycleStatesUpdateDto,
} from './_dto/lifecycle-config.dto';
import { resolveConfigVariables, getTemplateContextSummary } from '~/_common/functions/resolve-config-variables.function';
import { IdentitiesCrudService } from '../identities/identities-crud.service';
import { loadLifecycleRules } from './_functions/load-lifecycle-rules.function';
import {
  lifecycleTriggerToSeconds,
  parseLifecycleTriggerInput,
} from './_functions/parse-lifecycle-trigger-input.function';
import { validateLifecycleCronRules } from './_functions/validate-lifecycle-cron-rules.function';
import { LifecyclePreviewFilterDto, LifecyclePreviewMutationDto } from './_dto/lifecycle-config.dto';
import { LifecycleCrudService } from './lifecycle-crud.service';
import { LifecycleHooksService } from './lifecycle-hooks.service';

export type LifecycleRuleFileSummary = {
  name: string;
  rulesCount: number;
  cronExecutable: boolean;
  sources: string[];
  targets: string[];
};

@Injectable()
export class LifecycleConfigService {
  private readonly logger = new Logger(LifecycleConfigService.name);

  public constructor(
    private readonly lifecycleHooksService: LifecycleHooksService,
    private readonly lifecycleCrudService: LifecycleCrudService,
    private readonly identitiesCrudService: IdentitiesCrudService,
  ) {}

  public async searchRules(
    search?: string,
    options?: { page?: number; limit?: number },
  ): Promise<[LifecycleRuleFileSummary[], number]> {
    options = { page: 1, limit: 10, ...options };

    const rules = await loadLifecycleRules();
    const summaries = rules.map((ruleFile) => this.toRuleSummary(ruleFile));

    const filtered = summaries.filter((item) => {
      if (!search) {
        return true;
      }
      const haystack = [item.name, ...item.sources, ...item.targets].join(' ').toLowerCase();
      return haystack.includes(search.toLowerCase());
    });

    const total = filtered.length;
    const data = filtered.slice((options.page - 1) * options.limit, options.page * options.limit);

    return [data, total];
  }

  public async readRule(name: string): Promise<ConfigRulesObjectSchemaDTO | null> {
    const filePath = this.getRuleFilePath(name);
    if (!existsSync(filePath)) {
      return null;
    }

    const raw = readFileSync(filePath, 'utf-8');
    const parsed = parse(raw) as ConfigRulesObjectSchemaDTO;
    const schema = plainToInstance(ConfigRulesObjectSchemaDTO, parsed);

    await this.validateRuleSchema(schema, name);

    schema.ruleFileBasename = name;
    return schema;
  }

  public async createRule(payload: LifecycleRuleFileCreateDto): Promise<ConfigRulesObjectSchemaDTO> {
    const name = payload.name.trim();
    const filePath = this.getRuleFilePath(name);

    if (existsSync(filePath)) {
      throw new ConflictException(`Le fichier de règles <${name}> existe déjà.`);
    }

    const schema = plainToInstance(ConfigRulesObjectSchemaDTO, {
      identities: payload.identities,
    });

    await this.validateRuleSchema(schema, name);
    this.ensureRulesDir();
    writeFileSync(filePath, stringify({ identities: payload.identities }));

    await this.syncAfterConfigChange();
    const created = await this.readRule(name);
    if (!created) {
      throw new BadRequestException(`Impossible de créer le fichier de règles <${name}>.`);
    }

    return created;
  }

  public async updateRule(name: string, payload: LifecycleRuleFileUpdateDto): Promise<ConfigRulesObjectSchemaDTO | null> {
    const current = await this.readRule(name);
    if (!current) {
      return null;
    }

    if (payload.identities === undefined) {
      return current;
    }

    const schema = plainToInstance(ConfigRulesObjectSchemaDTO, {
      identities: payload.identities,
    });

    await this.validateRuleSchema(schema, name);

    const filePath = this.getRuleFilePath(name);
    writeFileSync(filePath, stringify({ identities: payload.identities }));

    await this.syncAfterConfigChange();
    return this.readRule(name);
  }

  public async deleteRule(name: string): Promise<boolean> {
    const filePath = this.getRuleFilePath(name);
    if (!existsSync(filePath)) {
      return false;
    }

    unlinkSync(filePath);
    await this.syncAfterConfigChange();
    return true;
  }

  public async executeRule(name: string): Promise<'started' | 'not_found' | 'not_executable'> {
    const exists = existsSync(this.getRuleFilePath(name));
    if (!exists) {
      return 'not_found';
    }

    const executed = await this.lifecycleHooksService.executeCronForSource(name);
    return executed ? 'started' : 'not_executable';
  }

  public getDefaultStates() {
    return this.lifecycleCrudService.getAllAvailableStates().filter((state) =>
      ['O', 'I', 'M'].includes(state.key),
    );
  }

  public getCustomStates(): IdentityLifecycleState[] {
    return this.lifecycleCrudService.getCustomStates();
  }

  public async previewMutation(payload: LifecyclePreviewMutationDto): Promise<{
    raw: Record<string, unknown>;
    resolved: Record<string, unknown>;
    templateVariables: Record<string, string>;
  }> {
    const raw = payload.mutation || {};
    const resolved = (await resolveConfigVariables(raw)) as Record<string, unknown>;

    return {
      raw,
      resolved,
      templateVariables: getTemplateContextSummary(),
    };
  }

  public async previewFilter(payload: LifecyclePreviewFilterDto): Promise<{
    query: Record<string, unknown>;
    resolvedRules: Record<string, unknown>;
    count: number;
    samples: Array<Record<string, unknown>>;
    temporalFilter: { applied: boolean; dateKey?: string; before?: string; note?: string };
  }> {
    if (!payload.sources?.length) {
      throw new BadRequestException('Au moins un état source est requis pour la prévisualisation.');
    }

    const resolvedRules = (await resolveConfigVariables(payload.rules ?? {})) as Record<string, unknown>;
    const parsedTrigger = parseLifecycleTriggerInput(payload.triggerInput);
    const triggerSeconds = lifecycleTriggerToSeconds(parsedTrigger ?? undefined);
    const dateKey = payload.dateKey?.trim() || 'lastSync';

    const query: Record<string, unknown> = {
      ...resolvedRules,
      lifecycle: { $in: payload.sources },
      ignoreLifecycle: { $ne: true },
      deletedFlag: { $ne: true },
    };

    const temporalFilter: {
      applied: boolean;
      dateKey?: string;
      before?: string;
      note?: string;
    } = {
      applied: false,
      note: 'Aucun filtre temporel appliqué (trigger absent, -1, ou immédiat).',
    };

    if (typeof triggerSeconds === 'number' && triggerSeconds > 0) {
      const checkDate = new Date(Date.now() - triggerSeconds * 1000);
      query[dateKey] = { $lte: checkDate };
      temporalFilter.applied = true;
      temporalFilter.dateKey = dateKey;
      temporalFilter.before = checkDate.toISOString();
      temporalFilter.note = `Identités dont ${dateKey} est antérieur ou égal à ${checkDate.toISOString()}.`;
    } else if (triggerSeconds === -1) {
      temporalFilter.note = 'Trigger -1 : exécution cron/CLI sans filtre temporel.';
    }

    const sampleLimit = payload.sampleLimit ?? 5;
    const [count, samples] = await Promise.all([
      this.identitiesCrudService.model.countDocuments(query),
      this.identitiesCrudService.model
        .find(query)
        .limit(sampleLimit)
        .select('_id lifecycle inetOrgPerson.cn inetOrgPerson.mail metadata.lastUpdatedAt lastSync')
        .lean(),
    ]);

    return {
      query,
      resolvedRules,
      count,
      samples: samples.map((sample) => ({
        _id: sample._id,
        lifecycle: sample.lifecycle,
        cn: (sample as { inetOrgPerson?: { cn?: string } }).inetOrgPerson?.cn,
        mail: (sample as { inetOrgPerson?: { mail?: string } }).inetOrgPerson?.mail,
        lastSync: (sample as { lastSync?: Date }).lastSync,
        lastUpdatedAt: (sample as { metadata?: { lastUpdatedAt?: Date } }).metadata?.lastUpdatedAt,
      })),
      temporalFilter,
    };
  }

  public async updateCustomStates(payload: LifecycleStatesUpdateDto): Promise<IdentityLifecycleState[]> {
    const config = plainToInstance(ConfigStatesDTO, { states: payload.states });
    await validateOrReject(config, { whitelist: true });

    const statesPath = this.getStatesFilePath();
    this.ensureLifecycleDir();
    writeFileSync(statesPath, stringify({ states: payload.states }));

    await this.syncAfterConfigChange();
    await this.lifecycleCrudService.ensureStatesCacheFresh(0);

    return this.getCustomStates();
  }

  private toRuleSummary(ruleFile: ConfigRulesObjectSchemaDTO): LifecycleRuleFileSummary {
    const name = ruleFile.ruleFileBasename || 'unknown';
    const identities = ruleFile.identities || [];
    const validation = validateLifecycleCronRules(name, identities);

    return {
      name,
      rulesCount: identities.length,
      cronExecutable: validation.executable,
      sources: [...new Set(identities.flatMap((rule) => rule.sources || []))],
      targets: [...new Set(identities.map((rule) => rule.target).filter(Boolean))],
    };
  }

  private async validateRuleSchema(schema: ConfigRulesObjectSchemaDTO, context: string): Promise<void> {
    if (!schema?.identities || !Array.isArray(schema.identities)) {
      throw new BadRequestException(`Le fichier <${context}> doit contenir un tableau identities.`);
    }

    try {
      await validateOrReject(schema, { whitelist: true });
    } catch (errors) {
      throw new BadRequestException(formatValidationErrors(errors, context));
    }

    for (const rule of schema.identities) {
      plainToInstance(ConfigRulesObjectIdentitiesDTO, rule);
    }
  }

  private getRulesDir(): string {
    return path.join(process.cwd(), 'configs', 'lifecycle', 'rules');
  }

  private getLifecycleDir(): string {
    return path.join(process.cwd(), 'configs', 'lifecycle');
  }

  private getStatesFilePath(): string {
    return path.join(this.getLifecycleDir(), 'states.yml');
  }

  private getRuleFilePath(name: string): string {
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.getRulesDir(), `${safeName}.yml`);
  }

  private ensureRulesDir(): void {
    const rulesDir = this.getRulesDir();
    if (!existsSync(rulesDir)) {
      mkdirSync(rulesDir, { recursive: true });
    }
  }

  private ensureLifecycleDir(): void {
    const lifecycleDir = this.getLifecycleDir();
    if (!existsSync(lifecycleDir)) {
      mkdirSync(lifecycleDir, { recursive: true });
    }
  }

  private async syncAfterConfigChange(): Promise<void> {
    await this.lifecycleHooksService.syncAfterConfigChange();
    this.logger.debug('Lifecycle configuration synchronized after file change.');
  }
}
