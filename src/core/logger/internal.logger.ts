import { ConsoleLogger } from '@nestjs/common';

export class InternalLogger extends ConsoleLogger {

  public constructor() {
    super();

  }

  error(message: any, stack?: string, context?: string) {
    // @ts-ignore
    super.error(...arguments);
  }

  warn(message: any, context?: string) {
    // @ts-ignore
    super.warn(...arguments);
  }

  log(message: any, context?: string) {
    // @ts-ignore
    super.log(...arguments);
  }

  debug(message: any, context?: string) {
    // @ts-ignore
    super.debug(...arguments);
  }

  verbose(message: any, context?: string) {
    // @ts-ignore
    super.verbose(...arguments);
  }

  fatal(message: any, context?: string) {
    // @ts-ignore
    super.error(...arguments);
  }
}
