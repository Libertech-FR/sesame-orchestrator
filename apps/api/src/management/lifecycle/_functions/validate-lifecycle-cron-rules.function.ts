import { ConfigRulesObjectIdentitiesDTO } from '../_dto/config-rules.dto'

export interface LifecycleCronRulesValidationResult {
  executable: boolean
  rules: ConfigRulesObjectIdentitiesDTO[]
  warnings: string[]
}

export function validateLifecycleCronRules(
  ruleFileBasename: string,
  identities: ConfigRulesObjectIdentitiesDTO[] | undefined,
): LifecycleCronRulesValidationResult {
  if (!identities?.length) {
    return {
      executable: false,
      rules: [],
      warnings: [`Le fichier de règles <${ruleFileBasename}.yml> ne contient aucune règle.`],
    }
  }

  const cronExecutableRules = identities.filter((rule) => rule.trigger === -1)
  if (cronExecutableRules.length > 0) {
    return {
      executable: true,
      rules: cronExecutableRules,
      warnings: [],
    }
  }

  const warnings = [
    `Le fichier de règles <${ruleFileBasename}.yml> ne contient aucune règle exécutable en cron (trigger=-1 requis).`,
  ]

  for (const rule of identities) {
    const triggerLabel = rule.trigger === undefined || rule.trigger === null ? 'non défini' : String(rule.trigger)
    warnings.push(`  • sources [${rule.sources.join(', ')}] → trigger=${triggerLabel}`)
  }

  return {
    executable: false,
    rules: [],
    warnings,
  }
}
