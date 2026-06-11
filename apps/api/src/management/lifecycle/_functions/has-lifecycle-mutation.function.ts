export function hasLifecycleMutation(mutation: object | undefined | null): boolean {
  return mutation != null && typeof mutation === 'object' && Object.keys(mutation).length > 0;
}
