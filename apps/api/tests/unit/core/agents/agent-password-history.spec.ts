import { hash as argon2Hash } from 'argon2';
import { assertAgentPasswordNotReused, nextAgentOldPasswords } from '~/core/agents/_utils/agent-password-history';

describe('agent password history utils', () => {
  it('nextAgentOldPasswords should prepend current hash and cap', async () => {
    const currentHash = await argon2Hash('current');
    const old1 = await argon2Hash('old1');
    const old2 = await argon2Hash('old2');

    const next = nextAgentOldPasswords({
      currentHash,
      oldHashes: [old1, old2],
      maxCount: 2,
    });

    expect(next).toHaveLength(2);
    expect(next[0]).toBe(currentHash);
  });

  it('assertAgentPasswordNotReused should reject when matches current', async () => {
    const currentHash = await argon2Hash('same');

    await expect(
      assertAgentPasswordNotReused({
        newPassword: 'same',
        currentHash,
        oldHashes: [],
      }),
    ).rejects.toBeDefined();
  });

  it('assertAgentPasswordNotReused should reject when matches history', async () => {
    const currentHash = await argon2Hash('current');
    const oldHash = await argon2Hash('reused');

    await expect(
      assertAgentPasswordNotReused({
        newPassword: 'reused',
        currentHash,
        oldHashes: [oldHash],
      }),
    ).rejects.toBeDefined();
  });
});
