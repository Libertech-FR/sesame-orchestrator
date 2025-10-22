import readline from 'readline';

export function startLoader(message) {
  let currentFrame = 0;
  const spinnerFrames = ['-', '\\', '|', '/'];

  const loaderInterval = setInterval(() => {
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`${spinnerFrames[currentFrame]} ${message} `);
    currentFrame = (currentFrame + 1) % spinnerFrames.length;
  }, 100);

  return loaderInterval;
}

export function stopLoader(loaderInterval) {
  clearInterval(loaderInterval);
  readline.cursorTo(process.stdout, 0);
  if (process.stdout.isTTY) {
    process.stdout.clearLine(0);
  }
}
