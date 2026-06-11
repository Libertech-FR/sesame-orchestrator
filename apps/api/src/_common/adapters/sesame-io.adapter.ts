import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server as HttpServer } from 'http';
import { Server as HttpsServer } from 'https';
import { ServerOptions } from 'socket.io';

/** Défaut Socket.IO : 25 s — trop verbeux en long-polling seul (dev). */
const SOCKET_IO_PING_INTERVAL_MS = 60_000;
const SOCKET_IO_PING_TIMEOUT_MS = 45_000;

export class SesameIoAdapter extends IoAdapter {
  private ioServer: ReturnType<IoAdapter['createIOServer']> | undefined;

  public constructor(httpServer: HttpServer) {
    super(httpServer);
  }

  public createIOServer(port: number, options?: ServerOptions) {
    if (!this.ioServer) {
      this.ioServer = super.createIOServer(port, {
        ...options,
        pingInterval: SOCKET_IO_PING_INTERVAL_MS,
        pingTimeout: SOCKET_IO_PING_TIMEOUT_MS,
      });
    }

    return this.ioServer;
  }

  public attachToServer(server: HttpServer | HttpsServer): void {
    this.ioServer?.attach(server);
  }
}
