import { BadRequestException } from '@nestjs/common';
import { verify as argon2Verify } from 'argon2';

export async function assertAgentPasswordNotReused(params: {
  newPassword: string;
  currentHash: string;
  oldHashes?: string[] | null;
}): Promise<void> {
  const newPassword = `${params?.newPassword || ''}`;
  const currentHash = `${params?.currentHash || ''}`;
  const oldHashes = Array.isArray(params?.oldHashes) ? params.oldHashes : [];

  if (currentHash) {
    const matchesCurrent = await argon2Verify(currentHash, newPassword);
    if (matchesCurrent) {
      throw new BadRequestException({
        message: 'Le mot de passe a déjà été utilisé récemment',
        error: 'Bad Request',
        statusCode: 400,
      });
    }
  }

  for (const hash of oldHashes) {
    const h = `${hash || ''}`;
    if (!h) continue;
    const matches = await argon2Verify(h, newPassword);
    if (matches) {
      throw new BadRequestException({
        message: 'Le mot de passe a déjà été utilisé récemment',
        error: 'Bad Request',
        statusCode: 400,
      });
    }
  }
}

export function nextAgentOldPasswords(params: {
  currentHash: string;
  oldHashes?: string[] | null;
  maxCount: number;
}): string[] {
  const currentHash = `${params?.currentHash || ''}`;
  const oldHashes = Array.isArray(params?.oldHashes) ? params.oldHashes : [];
  const maxCount = Math.max(0, Math.floor(Number(params?.maxCount || 0)));

  const next = [
    ...(currentHash ? [currentHash] : []),
    ...oldHashes.map((h) => `${h || ''}`).filter((h) => h.length > 0),
  ];

  // dédoublonnage simple (les hashes Argon2 incluent un sel, donc doublons rares)
  const uniq: string[] = [];
  for (const h of next) {
    if (!uniq.includes(h)) uniq.push(h);
  }

  if (maxCount <= 0) return [];
  return uniq.slice(0, maxCount);
}
