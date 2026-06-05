import { BadRequestException } from '@nestjs/common'
import {
  buildCronCommandArgs,
  validateCronTaskOptions,
} from '~/core/cron/_functions/cron-command-options.function'

jest.mock('~/_common/decorators/cron-console-handler.decorator', () => ({
  getCronConsoleHandlers: jest.fn(() => [
    {
      handler: 'identities-pwned-recheck',
      command: 'identities pwned recheck',
      label: 'Re-vérification HIBP',
      arguments: [
        { name: 'limit', type: 'number', default: 500 },
      ],
    },
    {
      handler: 'lifecycle-execute',
      command: 'lifecycle execute',
      label: 'Exécution du cycle de vie',
      arguments: [
        { name: 'source', type: 'string', positional: true },
      ],
    },
    {
      handler: 'agents-list',
      command: 'agents list',
      label: 'Liste des agents',
      arguments: [],
    },
  ]),
}))

describe('cron-command-options', () => {
  it('should reject unknown options for a handler with a schema', () => {
    expect(() => validateCronTaskOptions('identities-pwned-recheck', { retentionPeriodDays: 30 }))
      .toThrow(BadRequestException)
  })

  it('should accept handler-specific options', () => {
    expect(() => validateCronTaskOptions('identities-pwned-recheck', { limit: 500 })).not.toThrow()
  })

  it('should reject options for handlers without arguments', () => {
    expect(() => validateCronTaskOptions('agents-list', { limit: 500 })).toThrow(BadRequestException)
  })

  it('should build flag and positional CLI args from handler schema', () => {
    expect(buildCronCommandArgs('identities-pwned-recheck', { limit: 500 })).toEqual({
      positionalArgs: [],
      flagArgs: ["--limit='500'"],
    })

    expect(buildCronCommandArgs('lifecycle-execute', { source: '01-etd' })).toEqual({
      positionalArgs: ['01-etd'],
      flagArgs: [],
    })
  })
})
