import { validateLifecycleCronRules } from '~/management/lifecycle/_functions/validate-lifecycle-cron-rules.function'

describe('validateLifecycleCronRules', () => {
  it('should accept rules with trigger=-1', () => {
    const result = validateLifecycleCronRules('01-etd', [
      {
        sources: ['D'],
        trigger: -1,
        target: 'I',
      } as any,
    ])

    expect(result.executable).toBe(true)
    if (result.executable) {
      expect(result.rules).toHaveLength(1)
    }
  })

  it('should reject rules without trigger=-1', () => {
    const result = validateLifecycleCronRules('01-etd', [
      {
        sources: ['I', 'W'],
        trigger: 5,
        target: 'D',
      } as any,
      {
        sources: ['D'],
        target: 'I',
      } as any,
    ])

    expect(result).toEqual({
      executable: false,
      rules: [],
      warnings: [
        'Le fichier de règles <01-etd.yml> ne contient aucune règle exécutable en cron (trigger=-1 requis).',
        '  • sources [I, W] → trigger=5',
        '  • sources [D] → trigger=non défini',
      ],
    })
  })
})
