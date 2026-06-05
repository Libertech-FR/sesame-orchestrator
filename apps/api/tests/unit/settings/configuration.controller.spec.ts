import { ConfigurationController } from '~/settings/configuration.controller';

describe('ConfigurationController', () => {
  const getConfiguration = jest.fn();
  const service = { getConfiguration };

  const createRes = () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    return { status, json };
  };

  let controller: ConfigurationController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ConfigurationController(service as any);
  });

  it('should return configuration payload', async () => {
    const payload = {
      application: { name: 'sesame-orchestrator', version: '2.3.1', description: null, buildVersion: null },
      dependencies: {
        mongodb: {
          status: 'up',
          serverVersion: '7.0.0',
          driverVersion: '8.9.5',
          endpoint: null,
          docker: null,
          metadata: {},
        },
        redis: {
          status: 'up',
          serverVersion: '7.4.0',
          driverVersion: '5.4.1',
          endpoint: null,
          docker: null,
          metadata: {},
        },
      },
    };
    getConfiguration.mockResolvedValue(payload);
    const res = createRes();

    await controller.getConfiguration(res as any);

    expect(getConfiguration).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: payload });
  });
});
