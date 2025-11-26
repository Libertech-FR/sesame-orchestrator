import readline from 'readline'

/**
 * Démarre un indicateur de chargement animé dans le terminal
 *
 * @param {string} message - Le message à afficher à côté de l'indicateur de chargement
 * @returns {NodeJS.Timeout} L'identifiant de l'interval pour pouvoir l'arrêter plus tard
 *
 * @example
 * const loader = startLoader('Chargement en cours...');
 * // ... opération longue ...
 * stopLoader(loader);
 */
export function startLoader(message) {
  let currentFrame = 0
  const spinnerFrames = ['-', '\\', '|', '/']

  const loaderInterval = setInterval(() => {
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`${spinnerFrames[currentFrame]} ${message} `);
    currentFrame = (currentFrame + 1) % spinnerFrames.length;
  }, 100)

  return loaderInterval
}

/**
 * Arrête un indicateur de chargement précédemment démarré
 *
 * @param {NodeJS.Timeout} loaderInterval - L'identifiant de l'interval retourné par startLoader
 *
 * @example
 * const loader = startLoader('Chargement en cours...');
 * // ... opération longue ...
 * stopLoader(loader);
 */
export function stopLoader(loaderInterval) {
  clearInterval(loaderInterval)
  readline.cursorTo(process.stdout, 0)

  if (process.stdout.isTTY) {
    process.stdout.clearLine(0)
  }
}
