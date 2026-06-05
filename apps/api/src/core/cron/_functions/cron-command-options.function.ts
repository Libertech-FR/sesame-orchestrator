import { BadRequestException } from '@nestjs/common';
import {
  CronConsoleHandlerArgument,
  getCronConsoleHandlers,
} from '~/_common/decorators/cron-console-handler.decorator';

function getHandlerDescriptor(handler: string) {
  return getCronConsoleHandlers().find((entry) => entry.handler === handler);
}

export function resolveCronConsoleArgumentFlag(argument: CronConsoleHandlerArgument): string {
  return argument.flag || `--${argument.name}`;
}

export function buildConsoleCommandPreview(handler: string, options?: Record<string, unknown> | null): string {
  const descriptor = getHandlerDescriptor(handler);
  if (!descriptor) {
    return '';
  }

  const commandWords = descriptor.command.split(/\s+/).filter(Boolean);
  const { positionalArgs, flagArgs } = buildCronCommandArgs(handler, options);
  return ['yarn', 'run', 'console', ...commandWords, ...positionalArgs, ...flagArgs].join(' ');
}

function assertArgumentType(argument: CronConsoleHandlerArgument, value: unknown, handler: string): void {
  if (value === undefined || value === null || value === '') {
    return;
  }

  if (argument.type === 'number' && !Number.isFinite(Number(value))) {
    throw new BadRequestException(`L'argument "${argument.name}" doit être numérique pour le handler "${handler}".`);
  }

  if (argument.type === 'boolean' && typeof value !== 'boolean') {
    throw new BadRequestException(`L'argument "${argument.name}" doit être un booléen pour le handler "${handler}".`);
  }
}

export function validateCronTaskOptions(handler: string, options?: string[] | Record<string, unknown>): void {
  if (options === undefined || options === null) {
    return;
  }

  const descriptor = getHandlerDescriptor(handler);
  const schema = descriptor?.arguments || [];

  if (Array.isArray(options)) {
    if (schema.length > 0) {
      throw new BadRequestException(
        `Le handler "${handler}" attend un objet d'arguments (${schema.map((argument) => argument.name).join(', ')}).`,
      );
    }
    return;
  }

  if (typeof options !== 'object') {
    throw new BadRequestException(`Les options du handler "${handler}" doivent être un objet clé-valeur.`);
  }

  if (!schema.length) {
    if (Object.keys(options).length > 0) {
      throw new BadRequestException(`Le handler "${handler}" n'accepte pas d'arguments configurables.`);
    }
    return;
  }

  const allowed = new Map(schema.map((argument) => [argument.name, argument]));

  for (const key of Object.keys(options)) {
    if (!allowed.has(key)) {
      throw new BadRequestException(`Argument "${key}" invalide pour le handler "${handler}".`);
    }
  }

  for (const argument of schema) {
    const value = options[argument.name];
    if (argument.required && (value === undefined || value === null || value === '')) {
      throw new BadRequestException(`L'argument "${argument.name}" est requis pour le handler "${handler}".`);
    }
    assertArgumentType(argument, value, handler);
  }
}

export function buildCronCommandArgs(
  handler: string,
  options?: string[] | Record<string, unknown> | null,
): { positionalArgs: string[]; flagArgs: string[] } {
  const descriptor = getHandlerDescriptor(handler);
  const schema = descriptor?.arguments || [];
  const positionalArgs: string[] = [];
  const flagArgs: string[] = [];

  if (!options) {
    return { positionalArgs, flagArgs };
  }

  if (Array.isArray(options)) {
    positionalArgs.push(...options.map(String).filter((value) => value.length > 0));
    return { positionalArgs, flagArgs };
  }

  if (typeof options !== 'object') {
    return { positionalArgs, flagArgs };
  }

  const positionalSchema = schema.filter((argument) => argument.positional);
  const flagSchema = schema.filter((argument) => !argument.positional);

  for (const argument of positionalSchema) {
    const value = options[argument.name];
    if (value !== undefined && value !== null && `${value}`.length > 0) {
      positionalArgs.push(String(value));
    }
  }

  const flagEntries = flagSchema.length
    ? flagSchema.map((argument) => [argument.name, options[argument.name]] as const)
    : Object.entries(options).filter(([key]) => !positionalSchema.some((argument) => argument.name === key));

  for (const [key, value] of flagEntries) {
    const argument = flagSchema.find((entry) => entry.name === key);
    const flag = argument ? resolveCronConsoleArgumentFlag(argument) : `--${key}`;

    if (typeof value === 'boolean') {
      if (value) {
        flagArgs.push(flag);
      }
      continue;
    }

    if (value === null || value === undefined || `${value}`.length === 0) {
      continue;
    }

    if (typeof value === 'object') {
      flagArgs.push(`${flag}='${JSON.stringify(value)}'`);
      continue;
    }

    flagArgs.push(`${flag}='${String(value)}'`);
  }

  return { positionalArgs, flagArgs };
}
