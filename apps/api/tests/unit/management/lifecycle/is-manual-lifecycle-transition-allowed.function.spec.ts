import {
  getAllowedManualLifecycleTargets,
  isManualLifecycleTransitionAllowed,
} from '~/management/lifecycle/_functions/is-manual-lifecycle-transition-allowed.function';

describe('isManualLifecycleTransitionAllowed', () => {
  const rules = [
    { source: 'I', targets: ['D', 'O'] },
    { source: 'D', targets: ['I'] },
  ];

  it('should allow any target when no rule exists for the source', () => {
    expect(isManualLifecycleTransitionAllowed('O', 'M', rules)).toBe(true);
    expect(getAllowedManualLifecycleTargets('O', rules)).toBeNull();
  });

  it('should allow only configured targets for a filtered source', () => {
    expect(isManualLifecycleTransitionAllowed('I', 'D', rules)).toBe(true);
    expect(isManualLifecycleTransitionAllowed('I', 'O', rules)).toBe(true);
    expect(isManualLifecycleTransitionAllowed('I', 'M', rules)).toBe(false);
  });

  it('should always allow staying on the current lifecycle', () => {
    expect(isManualLifecycleTransitionAllowed('I', 'I', rules)).toBe(true);
  });

  it('should apply filtered rules before default rules for the same source', () => {
    const filteredRules = [
      { source: 'O', filter: { 'inetOrgPerson.employeeType': 'TAIGA' }, targets: ['I', 'M'] },
      { source: 'O', targets: ['I', 'M', 'A', 'P', 'V'] },
    ];
    const taigaIdentity = { inetOrgPerson: { employeeType: 'TAIGA' } };
    const otherIdentity = { inetOrgPerson: { employeeType: 'CDI' } };

    expect(getAllowedManualLifecycleTargets('O', filteredRules, taigaIdentity)).toEqual(['I', 'M']);
    expect(isManualLifecycleTransitionAllowed('O', 'V', filteredRules, taigaIdentity)).toBe(false);
    expect(isManualLifecycleTransitionAllowed('O', 'V', filteredRules, otherIdentity)).toBe(true);
  });

  it('should remain permissive when only filtered rules exist and none match', () => {
    const filteredRules = [{ source: 'O', filter: { 'inetOrgPerson.employeeType': 'TAIGA' }, targets: ['I'] }];
    const otherIdentity = { inetOrgPerson: { employeeType: 'CDI' } };

    expect(getAllowedManualLifecycleTargets('O', filteredRules, otherIdentity)).toBeNull();
    expect(isManualLifecycleTransitionAllowed('O', 'V', filteredRules, otherIdentity)).toBe(true);
  });
});
