import { formatWorkerResultErrorMessage } from '~/core/backends/_functions/format-worker-result-error-message.function';

describe('formatWorkerResultErrorMessage', () => {
  it('should format backend error messages', () => {
    const message = formatWorkerResultErrorMessage({
      jobId: '1',
      status: 1,
      data: {
        dummy: {
          backend: 'dummy',
          status: 1,
          error: { status: 1, message: 'Transition P vers A refusée par dummy2' },
        },
      },
    });

    expect(message).toBe('dummy: Transition P vers A refusée par dummy2');
  });
});
