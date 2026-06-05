import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, FSWatcher, openSync, readSync, closeSync, statSync, watch } from 'fs';
import path from 'path';
import { toSafeHandlerName } from '~/_common/functions/handler-logger';
import { CronService } from './cron.service';

export type CronLogsSnapshot = {
  type: 'snapshot';
  exists: boolean;
  content: string;
  updatedAt: string | null;
};

export type CronLogsAppend = {
  type: 'append';
  content: string;
};

export type CronLogsResync = {
  type: 'resync';
};

export type CronLogsEvent = CronLogsSnapshot | CronLogsAppend | CronLogsResync;

type TaskWatcher = {
  watcher: FSWatcher;
  lastPosition: number;
  debounceTimer: ReturnType<typeof setTimeout> | null;
};

@Injectable()
export class CronLogsStreamService {
  private readonly logger = new Logger(CronLogsStreamService.name);
  private readonly watchers = new Map<string, TaskWatcher>();

  public constructor(
    private readonly configService: ConfigService,
    private readonly cronService: CronService,
  ) {}

  public getRoomName(taskName: string): string {
    return `cron-logs:${toSafeHandlerName(taskName)}`;
  }

  public getLogFilePath(taskName: string): string {
    const safeName = toSafeHandlerName(taskName);
    const logDir = this.configService.get('cron.logDirectory') || path.join(process.cwd(), 'logs', 'handlers');
    return path.join(logDir, `${safeName}.log`);
  }

  public async readSnapshot(taskName: string, tail = 250): Promise<CronLogsSnapshot> {
    const logs = await this.cronService.readLogs(taskName, tail);
    return {
      type: 'snapshot',
      exists: logs.exists,
      content: logs.content,
      updatedAt: logs.updatedAt,
    };
  }

  public startWatching(taskName: string, onEvent: (event: CronLogsEvent) => void): void {
    const roomKey = this.getRoomName(taskName);
    if (this.watchers.has(roomKey)) {
      return;
    }

    const logFile = this.getLogFilePath(taskName);
    const logDir = path.dirname(logFile);
    const logFileName = path.basename(logFile);

    if (!existsSync(logFile)) {
      let dirWatcher: FSWatcher;
      try {
        dirWatcher = watch(logDir, (event, filename) => {
          if (filename && filename !== logFileName) {
            return;
          }

          if (!existsSync(logFile)) {
            return;
          }

          dirWatcher.close();
          this.watchers.delete(roomKey);
          this.startWatching(taskName, onEvent);
          onEvent({ type: 'resync' });
        });
      } catch (err) {
        this.logger.warn(`Could not watch cron log directory for <${taskName}>: ${(err as Error).message}`);
        return;
      }

      this.watchers.set(roomKey, {
        watcher: dirWatcher,
        lastPosition: 0,
        debounceTimer: null,
      });
      return;
    }

    const lastPosition = statSync(logFile).size;

    const emitFileChanges = () => {
      try {
        if (!existsSync(logFile)) {
          onEvent({ type: 'resync' });
          return;
        }

        const stats = statSync(logFile);
        const watcherState = this.watchers.get(roomKey);
        if (!watcherState) {
          return;
        }

        if (stats.size < watcherState.lastPosition) {
          watcherState.lastPosition = stats.size;
          onEvent({ type: 'resync' });
          return;
        }

        if (stats.size === watcherState.lastPosition) {
          return;
        }

        const fileDescriptor = openSync(logFile, 'r');
        try {
          const length = stats.size - watcherState.lastPosition;
          const chunkBuffer = Buffer.allocUnsafe(length);
          readSync(fileDescriptor, chunkBuffer, 0, length, watcherState.lastPosition);
          watcherState.lastPosition = stats.size;
          const content = chunkBuffer.toString('utf-8');
          if (content) {
            onEvent({ type: 'append', content });
          }
        } finally {
          closeSync(fileDescriptor);
        }
      } catch (err) {
        this.logger.error(`Failed to read cron log updates for <${taskName}>: ${(err as Error).message}`);
      }
    };

    let watcher: FSWatcher;
    try {
      watcher = watch(logFile, () => {
        const watcherState = this.watchers.get(roomKey);
        if (!watcherState) {
          return;
        }

        if (watcherState.debounceTimer) {
          clearTimeout(watcherState.debounceTimer);
        }

        watcherState.debounceTimer = setTimeout(() => {
          watcherState.debounceTimer = null;
          emitFileChanges();
        }, 150);
      });
    } catch (err) {
      this.logger.warn(`Could not watch cron log file for <${taskName}>: ${(err as Error).message}`);
      return;
    }

    watcher.on('error', (err) => {
      this.logger.warn(`Cron log watcher error for <${taskName}>: ${err.message}`);
    });

    this.watchers.set(roomKey, {
      watcher,
      lastPosition,
      debounceTimer: null,
    });
  }

  public stopWatching(taskName: string): void {
    const roomKey = this.getRoomName(taskName);
    const watcherState = this.watchers.get(roomKey);
    if (!watcherState) {
      return;
    }

    if (watcherState.debounceTimer) {
      clearTimeout(watcherState.debounceTimer);
    }

    watcherState.watcher.close();
    this.watchers.delete(roomKey);
  }
}
