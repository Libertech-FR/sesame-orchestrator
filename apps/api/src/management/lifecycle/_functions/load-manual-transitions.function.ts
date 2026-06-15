import { existsSync, readFileSync, statSync } from 'node:fs';
import { plainToInstance } from 'class-transformer';
import { parse } from 'yaml';
import { validateOrReject } from 'class-validator';
import { Logger } from '@nestjs/common';
import { formatValidationErrors } from '../../../_common/functions/format-validation-errors.function';
import { ManualTransitionRuleDto, ManualTransitionsSchemaDto } from '../_dto/manual-transitions.dto';

let __manualTransitionsCache: ManualTransitionRuleDto[] | null = null;
let __manualTransitionsCacheMtime: number | null = null;

export function clearManualTransitionsCache(): void {
  __manualTransitionsCache = null;
  __manualTransitionsCacheMtime = null;
}

export function getManualTransitionsFilePath(): string {
  return `${process.cwd()}/configs/lifecycle/manual-transitions.yml`;
}

export async function loadManualTransitions(): Promise<ManualTransitionRuleDto[]> {
  const logger = new Logger(loadManualTransitions.name);
  const filePath = getManualTransitionsFilePath();

  if (!existsSync(filePath)) {
    logger.debug('No manual transitions file found, returning empty rules array.');
    return [];
  }

  try {
    const { mtimeMs } = statSync(filePath);
    if (__manualTransitionsCache && __manualTransitionsCacheMtime === mtimeMs) {
      logger.debug('Returning cached manual lifecycle transitions (manual-transitions.yml unchanged)');
      return __manualTransitionsCache;
    }

    const data = readFileSync(filePath, 'utf-8');
    const yml = parse(data) || {};
    const schema = plainToInstance(ManualTransitionsSchemaDto, yml);

    if (!schema?.manualTransitions || !Array.isArray(schema.manualTransitions)) {
      logger.warn('Invalid manual transitions schema, returning empty rules array.');
      return [];
    }

    await validateOrReject(schema, { whitelist: true });

    const usedSources = new Set<string>();
    for (const rule of schema.manualTransitions) {
      if (usedSources.has(rule.source)) {
        throw new Error(`Duplicate manual transition source '${rule.source}' found in manual-transitions.yml`);
      }
      usedSources.add(rule.source);
    }

    __manualTransitionsCache = schema.manualTransitions;
    __manualTransitionsCacheMtime = mtimeMs;

    logger.log(`Loaded <${schema.manualTransitions.length}> manual lifecycle transition rules.`);
    return schema.manualTransitions;
  } catch (error) {
    logger.error('Error loading manual lifecycle transitions', error?.message, error?.stack);
    clearManualTransitionsCache();
    throw error;
  }
}
