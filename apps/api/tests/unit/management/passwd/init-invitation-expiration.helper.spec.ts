import {
  buildExpiredInitInvitationFilter,
  buildNonExpiredInitInvitationFilter,
  getInitInvitationExpirationCutoff,
  parseInitInvitationExpiredQuery,
} from '~/management/passwd/init-invitation-expiration.helper';
import { InitStatesEnum } from '~/management/identities/_enums/init-state.enum';

describe('init invitation expiration helper', () => {
  const now = new Date('2026-05-13T08:00:00.000Z');

  it('calculates the expiration cutoff from initTokenTTL seconds', () => {
    expect(getInitInvitationExpirationCutoff(3600, now)).toEqual(new Date('2026-05-13T07:00:00.000Z'));
  });

  it('builds the expired invitation filter', () => {
    expect(buildExpiredInitInvitationFilter(3600, now)).toEqual({
      initState: InitStatesEnum.SENT,
      'initInfo.initDate': { $lt: new Date('2026-05-13T07:00:00.000Z') },
    });
  });

  it('builds the non-expired invitation filter', () => {
    expect(buildNonExpiredInitInvitationFilter(3600, now)).toEqual({
      initState: InitStatesEnum.SENT,
      $or: [
        { 'initInfo.initDate': { $gte: new Date('2026-05-13T07:00:00.000Z') } },
        { 'initInfo.initDate': { $exists: false } },
        { 'initInfo.initDate': null },
      ],
    });
  });

  it('parses the optional query flag', () => {
    expect(parseInitInvitationExpiredQuery('true')).toBe(true);
    expect(parseInitInvitationExpiredQuery('false')).toBe(false);
    expect(parseInitInvitationExpiredQuery(undefined)).toBeNull();
    expect(parseInitInvitationExpiredQuery('invalid')).toBeNull();
  });
});
