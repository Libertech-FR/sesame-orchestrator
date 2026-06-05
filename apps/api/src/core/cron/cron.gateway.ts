import { Logger, UnauthorizedException } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { hash } from 'crypto';
import { Server, Socket } from 'socket.io';
import { Public } from '~/_common/decorators/public.decorator';
import { Agents } from '../agents/_schemas/agents.schema';
import { AgentsService } from '../agents/agents.service';
import { CronLogsStreamService } from './cron-logs-stream.service';

type CronLogsSubscribePayload = {
  taskName?: string;
  tail?: number;
};

@Public()
@WebSocketGateway({
  namespace: '/core/cron',
  cors: { origin: true, credentials: true },
})
export class CronGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(CronGateway.name);
  private readonly clientSubscriptions = new Map<string, string>();

  @WebSocketServer()
  server: Server;

  public constructor(
    private readonly agentsService: AgentsService,
    private readonly cronLogsStreamService: CronLogsStreamService,
  ) {}

  public async handleConnection(client: Socket): Promise<void> {
    try {
      const id = `${client.handshake.query.id || ''}`;
      const key = `${client.handshake.query.key || ''}`;

      if (!id || !key) {
        throw new UnauthorizedException();
      }

      const user = await this.agentsService.findById<Agents>(id);
      if (!user) {
        throw new UnauthorizedException();
      }

      const sseSeed = `${user.security?.secretKey || user._id || ''}`;
      if (key !== hash('sha256', sseSeed)) {
        throw new UnauthorizedException();
      }

      this.logger.debug(`WebSocket connected: ${client.id}`);
    } catch {
      client.disconnect(true);
    }
  }

  public handleDisconnect(client: Socket): void {
    const taskName = this.clientSubscriptions.get(client.id);
    if (taskName) {
      void this.unsubscribeClient(client, taskName);
    }

    this.clientSubscriptions.delete(client.id);
    this.logger.debug(`WebSocket disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  public async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CronLogsSubscribePayload,
  ): Promise<void> {
    await this.subscribeClient(client, payload?.taskName || '', payload?.tail);
  }

  @SubscribeMessage('resync')
  public async handleResync(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CronLogsSubscribePayload,
  ): Promise<void> {
    const taskName = payload?.taskName || this.clientSubscriptions.get(client.id) || '';
    if (!taskName) {
      return;
    }

    await this.sendSnapshot(client, taskName, payload?.tail);
  }

  @SubscribeMessage('unsubscribe')
  public async handleUnsubscribe(@ConnectedSocket() client: Socket): Promise<void> {
    const taskName = this.clientSubscriptions.get(client.id);
    if (!taskName) {
      return;
    }

    await this.unsubscribeClient(client, taskName);
    this.clientSubscriptions.delete(client.id);
  }

  private async subscribeClient(client: Socket, taskName: string, tail?: number): Promise<void> {
    if (!taskName) {
      return;
    }

    const previousTaskName = this.clientSubscriptions.get(client.id);
    if (previousTaskName && previousTaskName !== taskName) {
      await this.unsubscribeClient(client, previousTaskName);
    }

    const roomName = this.cronLogsStreamService.getRoomName(taskName);
    await client.join(roomName);
    this.clientSubscriptions.set(client.id, taskName);

    await this.sendSnapshot(client, taskName, tail);
    this.ensureRoomWatcher(taskName, roomName);
  }

  private async sendSnapshot(client: Socket, taskName: string, tail?: number): Promise<void> {
    const snapshot = await this.cronLogsStreamService.readSnapshot(taskName, tail || 250);
    client.emit('logs', snapshot);
  }

  private ensureRoomWatcher(taskName: string, roomName: string): void {
    this.cronLogsStreamService.startWatching(taskName, (event) => {
      this.server.to(roomName).emit('logs', event);
    });
  }

  private async unsubscribeClient(client: Socket, taskName: string): Promise<void> {
    const roomName = this.cronLogsStreamService.getRoomName(taskName);
    await client.leave(roomName);

    try {
      const remainingClients = await this.server.in(roomName).fetchSockets();
      if (remainingClients.length === 0) {
        this.cronLogsStreamService.stopWatching(taskName);
      }
    } catch (err) {
      this.logger.warn(`Could not inspect room ${roomName} after unsubscribe: ${(err as Error).message}`);
      this.cronLogsStreamService.stopWatching(taskName);
    }
  }
}
