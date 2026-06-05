import { CronConsoleHandler, getCronConsoleHandlers } from '~/_common/decorators/cron-console-handler.decorator';

describe('CronConsoleHandler', () => {
  it('should register handlers when decorating command classes', () => {
    @CronConsoleHandler({
      handler: 'test-cron-handler',
      command: 'test cron handler',
      label: 'Handler de test',
      arguments: [
        {
          name: 'limit',
          label: 'Limite',
          type: 'number',
          default: 100,
        },
      ],
    })
    class TestCronCommand {}

    expect(TestCronCommand).toBeDefined();
    expect(getCronConsoleHandlers()).toEqual(
      expect.arrayContaining([
        {
          handler: 'test-cron-handler',
          command: 'test cron handler',
          label: 'Handler de test',
          arguments: [
            {
              name: 'limit',
              label: 'Limite',
              type: 'number',
              default: 100,
            },
          ],
        },
      ]),
    );
  });
});
