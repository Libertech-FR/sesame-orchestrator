import { ManualTransitionRuleDto } from '../_dto/manual-transitions.dto';

export function getAllowedManualLifecycleTargets(
  source: string,
  rules: ManualTransitionRuleDto[],
): string[] | null {
  const rule = rules.find((item) => item.source === source);
  if (!rule) {
    return null;
  }

  return [...new Set(rule.targets || [])];
}

export function isManualLifecycleTransitionAllowed(
  from: string,
  to: string,
  rules: ManualTransitionRuleDto[],
): boolean {
  if (!from || !to || from === to) {
    return true;
  }

  const allowedTargets = getAllowedManualLifecycleTargets(from, rules);
  if (allowedTargets === null) {
    return true;
  }

  return allowedTargets.includes(to);
}
