import { CommandFactory } from 'nest-commander';
import configInstance from '~/config';
import { getLogLevel } from './_common/functions/get-log-level';
import { CliModule } from './cli/cli.module';
import { InternalLogger } from './core/logger/internal.logger';

(async () => {
  try {
    const cfg = configInstance();
    const logger = new InternalLogger({
      logLevel: getLogLevel(cfg?.application?.logLevel),
      mongoose: cfg?.mongoose,
    });
    logger.log(`Starting CLI with log level <${cfg?.application?.logLevel || 'info'}>`);
    const app = await CommandFactory.runWithoutClosing(CliModule, {
      logger,
      errorHandler: (err) => {
        console.error(err);
        process.exit(1);
      },
    });
    await app.close();
  } catch (err) {
    console.error(err);
    process.exit(255);
  }
  process.exit(0);
})();
