import { ManualTransitionRuleDto } from '../_dto/manual-transitions.dto';
import { isEmptyManualTransitionFilter, matchesIdentityFilter } from './matches-identity-filter.function';

export function findManualTransitionRule(
  source: string,
  rules: ManualTransitionRuleDto[],
  identity?: Record<string, unknown>,
): ManualTransitionRuleDto | undefined {
  const sourceRules = rules.filter((rule) => rule.source === source);
  if (sourceRules.length === 0) {
    return undefined;
  }

  if (identity) {
    for (const rule of sourceRules) {
      if (!isEmptyManualTransitionFilter(rule.filter) && matchesIdentityFilter(identity, rule.filter!)) {
        return rule;
      }
    }
  }

  return sourceRules.find((rule) => isEmptyManualTransitionFilter(rule.filter));
}

export function getManualTransitionRuleKey(rule: ManualTransitionRuleDto): string {
  const filterKey = rule.filter ? JSON.stringify(rule.filter) : '';
  return `${rule.source}::${filterKey}`;
}
