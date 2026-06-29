import { ManualTransitionRuleDto } from '../_dto/manual-transitions.dto';
import { findManualTransitionRule } from './find-manual-transition-rule.function';

export function getAllowedManualLifecycleTargets(
  source: string,
  rules: ManualTransitionRuleDto[],
  identity?: Record<string, unknown>,
): string[] | null {
  const rule = findManualTransitionRule(source, rules, identity);
  if (!rule) {
    return null;
  }

  return [...new Set(rule.targets || [])];
}

export function isManualLifecycleTransitionAllowed(
  from: string,
  to: string,
  rules: ManualTransitionRuleDto[],
  identity?: Record<string, unknown>,
): boolean {
  if (!from || !to || from === to) {
    return true;
  }

  const allowedTargets = getAllowedManualLifecycleTargets(from, rules, identity);
  if (allowedTargets === null) {
    return true;
  }

  return allowedTargets.includes(to);
}
