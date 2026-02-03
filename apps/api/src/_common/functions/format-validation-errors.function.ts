import { ValidationError } from 'class-validator'

/**
 * Formate les erreurs de validation pour une meilleure lisibilité
 *
 * @export
 * @function formatValidationErrors
 * @param {ValidationError[]} errors - Tableau d'erreurs de class-validator
 * @param {string} file - Nom du fichier où la validation a échoué
 * @param {string} [basePath=''] - Chemin de base pour la construction du chemin de propriété
 * @param {boolean} [isInArrayContext=false] - Indique si on est dans un contexte de tableau
 * @returns {string} Message d'erreur formaté et lisible
 *
 * @description Transforme récursivement les erreurs de validation class-validator
 * en messages d'erreur lisibles avec le chemin complet de chaque propriété en erreur.
 *
 * Gère :
 * - Propriétés imbriquées (notation pointée)
 * - Tableaux (notation avec index)
 * - Contraintes multiples par propriété
 * - Erreurs hiérarchiques récursives
 *
 * @example
 * // Retourne :
 * // • Property 'identities[0].trigger': must be a number (constraint: isNumber)
 * // • Property 'identities[1].sources': should not be empty (constraint: isNotEmpty)
 */
export function formatValidationErrors(errors: ValidationError[], file: string, basePath: string = '', isInArrayContext: boolean = false): string {
  const formatError = (error: ValidationError, currentPath: string, inArrayContext: boolean): string[] => {
    let propertyPath = currentPath

    /**
     * Check if error.property is defined, not null, not empty, and not the string 'undefined'.
     * If it is, we construct the property path based on whether we are in an array context or not.
     * If it is an array context, we use the index notation; otherwise, we use dot notation.
     */
    if (error.property !== undefined &&
      error.property !== null &&
      error.property !== '' &&
      error.property !== 'undefined') {
      if (inArrayContext && !isNaN(Number(error.property))) {
        // C'est un index d'array
        propertyPath = currentPath ? `${currentPath}[${error.property}]` : `[${error.property}]`
      } else {
        // C'est une propriété normale
        propertyPath = currentPath ? `${currentPath}.${error.property}` : error.property
      }
    }

    const errorMessages: string[] = []

    /**
     * Check if error.constraints is defined and not empty.
     * If it is, we iterate over each constraint and format the error message.
     */
    if (error.constraints) {
      Object.entries(error.constraints).forEach(([constraintKey, message]) => {
        errorMessages.push(`Property '${propertyPath}': ${message} (constraint: ${constraintKey})`)
      })
    }

    /**
     * If the error has children, we recursively format each child error.
     * We check if the error has children and if they are defined.
     */
    if (error.children && error.children.length > 0) {
      const isNextLevelArray = Array.isArray(error.value)
      error.children.forEach(childError => {
        errorMessages.push(...formatError(childError, propertyPath, isNextLevelArray))
      })
    }

    return errorMessages
  }

  const allErrorMessages: string[] = []
  errors.forEach(error => {
    allErrorMessages.push(...formatError(error, basePath, isInArrayContext))
  })

  return allErrorMessages.map(msg => `• ${msg}`).join('\n')
}
