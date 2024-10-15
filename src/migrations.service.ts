import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { readdir } from 'fs/promises'
import { Model } from 'mongoose'
import { glob } from 'glob'
import readline from 'readline'

let stdinBuffer = [];

function hijackStdinWrite(loader) {
  const originalStdinWrite = process.stdin.write;

  process.stdin.write = (chunk, callback): boolean => {
    stdinBuffer.push({ chunk, callback });
    stopLoader(loader);
    replayStdinBuffer();
    startLoader(loader);

    return true;
  };
}

function restoreStdinWrite() {
  delete process.stdin.write;
}

// Fonction pour rejouer les écritures dans stdin
function replayStdinBuffer() {
  while (stdinBuffer.length > 0) {
    const { chunk, encoding, callback } = stdinBuffer.shift();
    process.stdout.write(chunk, encoding, callback);
  }
}

function startLoader(message) {
  const spinnerFrames = ['-', '\\', '|', '/'];
  let currentFrame = 0;

  const loaderInterval = setInterval(() => {
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`${spinnerFrames[currentFrame]} ${message}`);
    currentFrame = (currentFrame + 1) % spinnerFrames.length;
  }, 100);

  hijackStdinWrite(loaderInterval);

  return loaderInterval;
}

function stopLoader(loaderInterval) {
  clearInterval(loaderInterval);
  readline.cursorTo(process.stdout, 0);
  process.stdout.clearLine(0);
}

@Injectable()
export class MigrationsService implements OnModuleInit {
  public constructor() { }

  public async onModuleInit() {
    await this.runMigrations()
  }

  public async runMigrations() {
    const loader = startLoader('Chargement en cours...');

    try {
      await this.loadMigrationsFiles()
    } catch { }

    stopLoader(loader);
  }

  private async loadMigrationsFiles() {
    const files = await glob(`./migrations/*.js`, {
      cwd: __dirname,
      root: __dirname,
    })

    for (const file of files) {
      console.log('file', file)
      const migration = await import(`${__dirname}/${file}`)

      if (migration.default) {
        const instance = new migration.default()

        if (typeof instance.up === 'function') {
          await instance.up()
        }
      }
    }
  }
}
