import { Types } from 'mongoose';
import { AuditsService } from '~/core/audits/audits.service';

describe('AuditsService', () => {
  const create = jest.fn();
  const distinct = jest.fn();
  const model = {
    create,
    distinct,
  };

  let service: AuditsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuditsService(model as any);
  });

  it('should write authentication audit with account and ip', async () => {
    create.mockResolvedValue({ _id: 'audit-1' });

    await service.createAuthenticationAudit({
      username: 'john',
      ip: '203.0.113.10',
      result: 'failed',
      reason: 'network_not_allowed',
      agentId: new Types.ObjectId('507f1f77bcf86cd799439011'),
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        coll: 'auth',
        op: 'authentication',
        ip: '203.0.113.10',
        metadata: expect.objectContaining({
          createdBy: 'john',
          createdAt: expect.any(Date),
        }),
        data: expect.objectContaining({
          event: 'authentication_attempt',
          username: 'john',
          ip: '203.0.113.10',
          result: 'failed',
          reason: 'network_not_allowed',
        }),
      }),
    );
  });

  it('should generate an id when account is unknown', async () => {
    create.mockResolvedValue({ _id: 'audit-2' });

    await service.createAuthenticationAudit({
      username: 'unknown',
      ip: '203.0.113.50',
      result: 'failed',
      reason: 'invalid_credentials',
    });

    const payload = create.mock.calls[0][0];
    expect(payload.documentId).toBeInstanceOf(Types.ObjectId);
    expect(payload.agent.id).toBeInstanceOf(Types.ObjectId);
  });
});
