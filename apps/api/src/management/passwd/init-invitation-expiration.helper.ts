import { FilterQuery } from 'mongoose';
import { InitStatesEnum } from '~/management/identities/_enums/init-state.enum';
import { Identities } from '~/management/identities/_schemas/identities.schema';

export const INIT_INVITATION_EXPIRED_QUERY_PARAM = 'initInvitationExpired';
export const DEFAULT_INIT_TOKEN_TTL_SECONDS = 604800;

export function getInitInvitationExpirationCutoff(
  ttlSeconds: number | string | undefined | null,
  now: Date = new Date(),
): Date {
  const parsedTtlSeconds = Number(ttlSeconds);
  const safeTtlSeconds =
    Number.isFinite(parsedTtlSeconds) && parsedTtlSeconds > 0 ? parsedTtlSeconds : DEFAULT_INIT_TOKEN_TTL_SECONDS;

  return new Date(now.getTime() - safeTtlSeconds * 1000);
}

export function buildExpiredInitInvitationFilter(
  ttlSeconds: number | string | undefined | null,
  now: Date = new Date(),
): FilterQuery<Identities> {
  return {
    initState: InitStatesEnum.SENT,
    'initInfo.initDate': { $lt: getInitInvitationExpirationCutoff(ttlSeconds, now) },
  };
}

export function buildNonExpiredInitInvitationFilter(
  ttlSeconds: number | string | undefined | null,
  now: Date = new Date(),
): FilterQuery<Identities> {
  const cutoff = getInitInvitationExpirationCutoff(ttlSeconds, now);

  return {
    initState: InitStatesEnum.SENT,
    $or: [
      { 'initInfo.initDate': { $gte: cutoff } },
      { 'initInfo.initDate': { $exists: false } },
      { 'initInfo.initDate': null },
    ],
  };
}

export function parseInitInvitationExpiredQuery(value: unknown): boolean | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value;

  const normalized = String(value).trim().toLowerCase();
  if (/^(1|true|on|yes)$/i.test(normalized)) return true;
  if (/^(0|false|off|no)$/i.test(normalized)) return false;

  return null;
}
