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
import { loadLifecycleRules } from './_functions/load-lifecycle-rules.function';
import { validateLifecycleCronRules } from './_functions/validate-lifecycle-cron-rules.function';
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
