import { of, throwError, TimeoutError } from 'rxjs';
import { MicroserviceQueueAdapter } from '~/_common/queue/microservice-queue.adapter';
import { ConfigService } from '@nestjs/config';

jest.mock('ioredis', () => {
  const RedisMock = jest.fn().mockImplementation(() => ({
    subscribe: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined),
  }));
  return { __esModule: true, default: RedisMock };
});

describe('MicroserviceQueueAdapter', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'application.nameQueue') return 'sesame';
      if (key === 'ioredis.uri') return 'redis://127.0.0.1:6379/0';
      return undefined;
    }),
  } as unknown as ConfigService;

  const client = {
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
    send: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits async jobs on the queue channel', async () => {
    const adapter = new MicroserviceQueueAdapter(client as any, config);
    await adapter.connect();

    const job = await adapter.add('LIST_BACKENDS', { foo: 'bar' }, { jobId: 'job-1' }, true);

    expect(client.emit).toHaveBeenCalledWith('sesame', {
      id: 'job-1',
      name: 'LIST_BACKENDS',
      data: { foo: 'bar' },
    });
    expect(job.id).toBe('job-1');
  });

  it('uses send for synchronous waitUntilFinished', async () => {
    client.send.mockReturnValue(of({ status: 0, data: [] }));
    const adapter = new MicroserviceQueueAdapter(client as any, config);
    await adapter.connect();

    const job = await adapter.add('LIST_BACKENDS', { foo: 'bar' }, { jobId: 'job-2' }, false);
    const result = await job.waitUntilFinished(5_000);

    expect(client.send).toHaveBeenCalledWith('sesame', {
      id: 'job-2',
      name: 'LIST_BACKENDS',
      data: { foo: 'bar' },
    });
    expect(result).toEqual({ status: 0, data: [] });
  });

  it('throws TimeoutError when sync send exceeds timeout', async () => {
    client.send.mockReturnValue(throwError(() => new TimeoutError()));
    const adapter = new MicroserviceQueueAdapter(client as any, config);
    const job = await adapter.add('LIST_BACKENDS', {}, { jobId: 'job-3' }, false);

    await expect(job.waitUntilFinished(100)).rejects.toMatchObject({ name: 'TimeoutError' });
  });

  it('forwards redis job events to the local emitter', async () => {
    const adapter = new MicroserviceQueueAdapter(client as any, config);
    await adapter.connect();

    const handler = jest.fn();
    adapter.events.on('progress', handler);

    const redisHandler = (require('ioredis').default as jest.Mock).mock.results[0].value.on.mock.calls.find(
      (c) => c[0] === 'message',
    )[1];

    redisHandler(
      'sesame:events',
      JSON.stringify({
        event: 'progress',
        jobId: 'job-4',
        name: 'IDENTITY_UPDATE',
        progress: 50,
      }),
    );

    expect(handler).toHaveBeenCalledWith({
      jobId: 'job-4',
      name: 'IDENTITY_UPDATE',
      progress: 50,
    });
  });
});
