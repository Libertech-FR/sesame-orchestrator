import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronHooksService } from './cron-hooks.service';
import { pick } from 'radash';
import { ConfigTaskDTO, CronTaskDTO } from './_dto/config-task.dto';
import { CronUpdateDto } from './_dto/cron.dto';
import { CronJob } from 'cron';
import path from 'node:path';
import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { ConfigService } from '@nestjs/config';
import { toSafeHandlerName } from '~/_common/functions/handler-logger';
import { formatValidationErrors } from '~/_common/functions/format-validation-errors.function';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { parse, stringify } from 'yaml';
import { getCronConsoleHandlers } from '~/_common/decorators/cron-console-handler.decorator';
import { validateCronTaskOptions } from './_functions/cron-command-options.function';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  public constructor(
    private schedulerRegistry: SchedulerRegistry,
    private readonly cronHooksService: CronHooksService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Recherche et liste les tâches cron configurées, avec support pour la recherche par nom ou description, et la pagination.
   *
   * @param search Recherche par nom ou description de la tâche cron
   * @param options Options de pagination (page, limit)
   * @returns Une liste paginée des tâches cron avec leurs détails d'exécution, et le nombre total de tâches correspondant à la recherche
   */
  public async search(
    search?: string,
    options?: { page?: number; limit?: number },
  ): Promise<[CronTaskDTO[] & { _job: Partial<CronJob> }[], number]> {
    options = {
      page: 1,
      limit: 10,
      ...options,
    };

    const tasks = this.cronHooksService
      .getCronTasks()
      .filter((task) => !search || task.name.includes(search) || task.description.includes(search));
    const total = tasks.length;

    const result = tasks.slice((options.page - 1) * options.limit, options.page * options.limit).map((task) => {
      let _job = undefined;

      if (task.enabled) {
        try {
          const cronJob = this.schedulerRegistry.getCronJob(`cron-task-${task.name}`);
          _job = {
            lastExecution: cronJob.lastDate()?.toISOString() || null,
            nextExecution: cronJob.nextDate()?.toJSDate() || null,
            isActive: cronJob.isActive,
            isCallbackRunning: cronJob.isCallbackRunning,
            ...pick(cronJob, ['name', 'threshold', 'unrefTimeout', 'runOnce', 'waitForCompletion']),
          };
        } catch (error) {
          this.logger.warn(`No cron job found for task ${task.name}`);
        }
      }

      return {
        ...task,
        _job,
      };
    });

    return [result, total];
  }

  /**
   * Lit les détails d'une tâche cron spécifique par son nom, incluant les informations d'exécution si la tâche est activée.
   *
   * @param name Nom de la tâche cron à lire
   * @returns Les détails de la tâche cron avec les informations d'exécution si elle est activée, ou null si la tâche n'existe pas
   */
  public async read(name: string): Promise<(CronTaskDTO & { _job: Partial<CronJob> }) | null> {
    const task = this.cronHooksService.getCronTasks().find((t) => t.name === name);
    if (!task) {
      return null;
    }

    let _job = undefined;

    if (task.enabled) {
      try {
        const cronJob = this.schedulerRegistry.getCronJob(`cron-task-${task.name}`);
        _job = {
          lastExecution: cronJob.lastDate()?.toISOString() || null,
          nextExecution: cronJob.nextDate()?.toJSDate() || null,
          isActive: cronJob.isActive,
          isCallbackRunning: cronJob.isCallbackRunning,
          ...pick(cronJob, ['name', 'threshold', 'unrefTimeout', 'runOnce', 'waitForCompletion']),
        };
      } catch (error) {
        this.logger.warn(`No cron job found for task ${task.name}`);
      }
    }

    return {
      ...task,
      _job,
    };
  }

  public getConsoleHandlers() {
    return getCronConsoleHandlers();
  }

  public async setEnabled(name: string, enabled: boolean): Promise<(CronTaskDTO & { _job: Partial<CronJob> }) | null> {
    return this.update(name, { enabled });
  }

  public async update(
    name: string,
    payload: CronUpdateDto,
  ): Promise<(CronTaskDTO & { _job: Partial<CronJob> }) | null> {
    const current = this.cronHooksService.getCronTasks().find((task) => task.name === name);
    if (!current) {
      return null;
    }

    const mergedHandler = payload.handler ?? current.handler;

    try {
      if (payload.options !== undefined) {
        validateCronTaskOptions(mergedHandler, payload.options);
      } else if (current.options !== undefined) {
        validateCronTaskOptions(mergedHandler, current.options as string[] | Record<string, unknown>);
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Options invalides pour le handler "${mergedHandler}".`);
    }

    const mergedTask = plainToInstance(CronTaskDTO, {
      ...current,
      ...pick(payload, ['description', 'enabled', 'schedule', 'handler', 'options']),
    });

    try {
      await validateOrReject(mergedTask, { whitelist: true });
    } catch (errors) {
      throw new BadRequestException(formatValidationErrors(errors, name));
    }

    const updated = this.updateTaskInConfig(name, (task) => {
      if (payload.description !== undefined) {
        task.description = payload.description;
      }
      if (payload.enabled !== undefined) {
        task.enabled = payload.enabled;
      }
      if (payload.schedule !== undefined) {
        task.schedule = payload.schedule;
      }
      if (payload.handler !== undefined) {
        task.handler = payload.handler;
      }
      if (payload.options !== undefined) {
        task.options = payload.options;
      }
    });

    if (!updated) {
      return null;
    }

    await this.cronHooksService.syncCronJobs();
    return this.read(name);
  }

  public async runImmediately(name: string): Promise<'started' | 'not_found' | 'busy'> {
    const task = await this.read(name);
    if (!task) {
      return 'not_found';
    }

    return this.cronHooksService.runTaskNow(name);
  }

  public async readLogs(
    name: string,
    tail = 500,
  ): Promise<{
    name: string;
    exists: boolean;
    file: string;
    updatedAt: string | null;
    content: string;
  }> {
    const safeName = toSafeHandlerName(name);
    const logDir = this.configService.get('cron.logDirectory') || path.join(process.cwd(), 'logs', 'handlers');
    const logFile = path.join(logDir, `${safeName}.log`);

    if (!existsSync(logFile)) {
      return {
        name,
        exists: false,
        file: logFile,
        updatedAt: null,
        content: '',
      };
    }

    const stats = statSync(logFile);
    const boundedTail = Math.max(tail || 200, 1);
    const maxLineChars = 4_000;
    const maxContentChars = this.configService.get<number>('cron.logRotateMaxSizeBytes') || 10 * 1024 * 1024;
    const maxReadableBytes = Math.max(maxContentChars, 1);
    const chunkSize = 64 * 1024;

    // Read the file backwards in chunks to avoid loading everything in memory.
    const fileDescriptor = openSync(logFile, 'r');
    let filePosition = stats.size;
    let bytesReadTotal = 0;
    let lineBreakCount = 0;
    const chunks: Buffer[] = [];

    try {
      while (filePosition > 0 && bytesReadTotal < maxReadableBytes && lineBreakCount <= boundedTail) {
        const remainingBudget = maxReadableBytes - bytesReadTotal;
        const readSize = Math.min(chunkSize, filePosition, remainingBudget);
        filePosition -= readSize;

        const chunkBuffer = Buffer.allocUnsafe(readSize);
        const readBytes = readSync(fileDescriptor, chunkBuffer, 0, readSize, filePosition);
        if (readBytes <= 0) {
          break;
        }

        const chunk = readBytes === readSize ? chunkBuffer : chunkBuffer.subarray(0, readBytes);
        chunks.unshift(chunk);
        bytesReadTotal += readBytes;

        for (let index = 0; index < chunk.length; index++) {
          if (chunk[index] === 0x0a) {
            lineBreakCount++;
          }
        }
      }
    } finally {
      closeSync(fileDescriptor);
    }

    const fullContent = Buffer.concat(chunks).toString('utf-8');

    const tailedLines = fullContent
      .split('\n')
      .slice(-boundedTail)
      .map((line) => {
        if (line.length <= maxLineChars) {
          return line;
        }
        return `${line.slice(0, maxLineChars)} … [line truncated]`;
      });

    let content = tailedLines.join('\n');
    if (content.length > maxContentChars) {
      content = `... [output truncated to last ${maxContentChars} characters]\n${content.slice(-maxContentChars)}`;
    }

    return {
      name,
      exists: true,
      file: logFile,
      updatedAt: stats.mtime.toISOString(),
      content,
    };
  }

  private updateTaskInConfig(name: string, updater: (task: CronTaskDTO) => void): boolean {
    const configDir = path.join(process.cwd(), 'configs', 'cron');
    if (!existsSync(configDir)) {
      return false;
    }

    const files = readdirSync(configDir).filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'));

    for (const file of files) {
      const filePath = path.join(configDir, file);
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = parse(raw) as ConfigTaskDTO;
      const tasks = parsed?.tasks;

      if (!tasks || !Array.isArray(tasks)) {
        continue;
      }

      const targetTask = tasks.find((task) => task.name === name);
      if (!targetTask) {
        continue;
      }

      updater(targetTask);
      writeFileSync(filePath, stringify(parsed));
      return true;
    }

    return false;
  }
}
