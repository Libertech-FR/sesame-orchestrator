import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server as HttpServer } from 'http';
import { Server as HttpsServer } from 'https';
import { ServerOptions } from 'socket.io';

export class SesameIoAdapter extends IoAdapter {
  private ioServer: ReturnType<IoAdapter['createIOServer']> | undefined;

  public constructor(httpServer: HttpServer) {
    super(httpServer);
  }

  public createIOServer(port: number, options?: ServerOptions) {
    if (!this.ioServer) {
      this.ioServer = super.createIOServer(port, options);
    }

    return this.ioServer;
  }

  public attachToServer(server: HttpServer | HttpsServer): void {
    this.ioServer?.attach(server);
  }
}
