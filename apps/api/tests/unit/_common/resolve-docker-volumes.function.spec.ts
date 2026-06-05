import { collectContainerIdCandidates, isVolumeMountActive } from '~/_common/functions/resolve-docker-volumes.function';

describe('resolve-docker-volumes.function', () => {
  it('should detect an exact mount as active', () => {
    expect(
      isVolumeMountActive('/data/apps/api/storage', [
        {
          mountPoint: '/data/apps/api/storage',
          source: '/host/storage',
          type: 'bind',
          options: 'rw',
          readOnly: false,
        },
      ]),
    ).toBe(true);
  });

  it('should detect a parent mount as active for nested expected paths', () => {
    expect(
      isVolumeMountActive('/data/apps/api/configs/cron', [
        {
          mountPoint: '/data',
          source: '/host/project',
          type: 'bind',
          options: 'rw',
          readOnly: false,
        },
      ]),
    ).toBe(true);
  });

  it('should collect container id from HOSTNAME env when it looks like a docker id', () => {
    const previousHostname = process.env.HOSTNAME;
    process.env.HOSTNAME = 'ebb767c45e68';

    try {
      expect(collectContainerIdCandidates()).toContain('ebb767c45e68');
    } finally {
      if (previousHostname === undefined) {
        delete process.env.HOSTNAME;
      } else {
        process.env.HOSTNAME = previousHostname;
      }
    }
  });

  it('should mark missing mounts as inactive', () => {
    expect(
      isVolumeMountActive('/data/certificates', [
        {
          mountPoint: '/data/apps/api/storage',
          source: '/host/storage',
          type: 'bind',
          options: 'rw',
          readOnly: false,
        },
      ]),
    ).toBe(false);
  });
});
