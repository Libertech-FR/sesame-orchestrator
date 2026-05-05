import type { Request } from 'express';
import { buildClientIpDebugPayload, resolveClientIp } from '~/_common/functions/resolve-client-ip';

function makeReq(partial: Partial<Request> & { headers?: Record<string, string | string[] | undefined> }): Request {
  return {
    headers: {},
    ip: undefined,
    socket: { remoteAddress: undefined },
    ...partial,
  } as Request;
}

describe('resolveClientIp', () => {
  it('returns CF-Connecting-IP when present', () => {
    const req = makeReq({
      headers: { 'cf-connecting-ip': '198.51.100.2' },
      ip: '10.0.0.1',
    });
    expect(resolveClientIp(req)).toBe('198.51.100.2');
  });

  it('returns first X-Forwarded-For hop', () => {
    const req = makeReq({
      headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.2' },
      ip: '10.0.0.2',
    });
    expect(resolveClientIp(req)).toBe('203.0.113.1');
  });

  it('returns X-Real-IP before falling back to req.ip', () => {
    const req = makeReq({
      headers: { 'x-real-ip': '192.0.2.50' },
      ip: '10.0.0.3',
    });
    expect(resolveClientIp(req)).toBe('192.0.2.50');
  });

  it('strips IPv4-mapped IPv6 prefix', () => {
    const req = makeReq({
      headers: { 'x-real-ip': '::ffff:192.0.2.1' },
    });
    expect(resolveClientIp(req)).toBe('192.0.2.1');
  });

  it('ignores X-Forwarded-For when it only echoes tcp peer but still prefers X-Real-IP', () => {
    const req = makeReq({
      headers: {
        'x-forwarded-for': '140.82.121.5',
        'x-real-ip': '192.168.1.50',
      },
      ip: '140.82.121.5',
      socket: { remoteAddress: '::ffff:140.82.121.5' } as any,
    });
    expect(resolveClientIp(req)).toBe('192.168.1.50');
  });

  it('ignores echoing X-Forwarded-For and falls back to same peer ip', () => {
    const req = makeReq({
      headers: { 'x-forwarded-for': '140.82.121.5' },
      ip: '140.82.121.5',
      socket: { remoteAddress: '140.82.121.5' } as any,
    });
    expect(resolveClientIp(req)).toBe('140.82.121.5');
  });

  it('buildClientIpDebugPayload flags echoing XFF', () => {
    const req = makeReq({
      headers: { 'x-forwarded-for': '140.82.121.5' },
      ip: '140.82.121.5',
      socket: { remoteAddress: '140.82.121.5' } as any,
    });
    const p = buildClientIpDebugPayload(req);
    expect(p.xffIgnoredAsEchoOfTcpPeer).toBe(true);
    expect(p.tcpPeerNormalized).toBe('140.82.121.5');
    expect(p.hintFr).toEqual(expect.stringContaining('X-Forwarded-For'));
  });

  it('forces localhost when host is local and peer is unexpected public ip without forwarding headers', () => {
    const req = makeReq({
      headers: { host: '127.0.0.1:4002' },
      ip: '140.82.121.5',
      socket: { remoteAddress: '::ffff:140.82.121.5' } as any,
    });
    expect(resolveClientIp(req)).toBe('127.0.0.1');
  });
});
