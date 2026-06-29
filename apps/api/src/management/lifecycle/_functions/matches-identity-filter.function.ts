import sift from 'sift';

export function isEmptyManualTransitionFilter(filter?: object): boolean {
  return !filter || Object.keys(filter).length === 0;
}

export function matchesIdentityFilter(identity: Record<string, unknown>, filter: object): boolean {
  if (isEmptyManualTransitionFilter(filter)) {
    return true;
  }

  return sift(filter)(identity);
}
