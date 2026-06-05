import { Logger, UnauthorizedException } from '@nestjs/common';
import {
  ConnectedSocket,
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
import { ActionType } from './_enum/action-type.enum';
import { BackendsService } from './backends.service';

type JobChannel = 'job:added' | 'job:completed' | 'job:failed' | 'job:progress' | 'job:active';

type DaemonStatusPayload = {
  online: boolean;
  pingMs: number | null;
  error?: string;
  version?: string;
};

const IDENTITY_JOB_TYPES = [ActionType.IDENTITY_UPDATE, ActionType.IDENTITY_CREATE, ActionType.IDENTITY_DELETE];
const DAEMON_STATUS_INTERVAL_MS = 20_000;

@Public()
@WebSocketGateway({
  namespace: '/core/backends',
  cors: { origin: true, credentials: true },
})
export class BackendsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(BackendsGateway.name);
  private readonly clientSubscriptions = new Map<string, () => void>();
  private lastDaemonStatus: DaemonStatusPayload | null = null;
  private daemonStatusInterval: NodeJS.Timeout | null = null;
  private daemonStatusPingInFlight = false;

  @WebSocketServer()
  server: Server;

  public constructor(
    private readonly agentsService: AgentsService,
    private readonly backendsService: BackendsService,
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

      const cleanup = this.subscribeClient(client);
      this.clientSubscriptions.set(client.id, cleanup);
      this.ensureDaemonStatusWatcher();
      if (this.lastDaemonStatus) {
        this.emitDaemonStatus(client, this.lastDaemonStatus);
      }
      this.logger.debug(`WebSocket connected: ${client.id}`);
    } catch {
      client.disconnect(true);
    }
  }

  public handleDisconnect(client: Socket): void {
    const cleanup = this.clientSubscriptions.get(client.id);
    cleanup?.();
    this.clientSubscriptions.delete(client.id);
    this.stopDaemonStatusWatcherIfIdle();
    this.logger.debug(`WebSocket disconnected: ${client.id}`);
  }

  @SubscribeMessage('daemon:status')
  public async handleDaemonStatusRequest(@ConnectedSocket() client: Socket): Promise<void> {
    if (this.lastDaemonStatus) {
      this.emitDaemonStatus(client, this.lastDaemonStatus);
      return;
    }

    await this.refreshDaemonStatus();
  }

  private subscribeClient(client: Socket): () => void {
    const fireMessage = (channel: JobChannel, message: unknown) => {
      try {
        client.emit('message', { channel, payload: message });
        this.logger.debug(`Emit to <${channel}> with data <${JSON.stringify(message)}>`, BackendsGateway.name);
      } catch (err) {
        this.logger.error(
          `Emit error from <${channel}> with data <${JSON.stringify(message)}>. Error: ${err}`,
          BackendsGateway.name,
        );
      }
    };

    const onAdded = (added: { name: ActionType }) => {
      if (!IDENTITY_JOB_TYPES.includes(added.name)) {
        return;
      }

      fireMessage('job:added', added);
    };

    const onCompleted = (completed: unknown) => {
      fireMessage('job:completed', completed);
    };

    const onFailed = (failed: unknown) => {
      fireMessage('job:failed', failed);
    };

    const onProgress = (progress: { name?: ActionType }) => {
      if (progress?.name && !IDENTITY_JOB_TYPES.includes(progress.name)) {
        return;
      }

      fireMessage('job:progress', progress);
    };

    const onActive = (active: { name?: ActionType }) => {
      if (active?.name && !IDENTITY_JOB_TYPES.includes(active.name)) {
        return;
      }

      fireMessage('job:active', active);
    };

    this.backendsService.queueEvents.on('added', onAdded);
    this.backendsService.queueEvents.on('active', onActive);
    this.backendsService.queueEvents.on('progress', onProgress);
    this.backendsService.queueEvents.on('completed', onCompleted);
    this.backendsService.queueEvents.on('failed', onFailed);

    return () => {
      this.backendsService.queueEvents.off('added', onAdded);
      this.backendsService.queueEvents.off('active', onActive);
      this.backendsService.queueEvents.off('progress', onProgress);
      this.backendsService.queueEvents.off('completed', onCompleted);
      this.backendsService.queueEvents.off('failed', onFailed);
    };
  }

  private ensureDaemonStatusWatcher(): void {
    if (this.daemonStatusInterval) {
      return;
    }

    void this.refreshDaemonStatus();
    this.daemonStatusInterval = setInterval(() => void this.refreshDaemonStatus(), DAEMON_STATUS_INTERVAL_MS);
  }

  private stopDaemonStatusWatcherIfIdle(): void {
    const connectedClients = this.server?.sockets?.sockets?.size ?? 0;
    if (connectedClients > 0) {
      return;
    }

    if (this.daemonStatusInterval) {
      clearInterval(this.daemonStatusInterval);
      this.daemonStatusInterval = null;
    }
  }

  private async refreshDaemonStatus(): Promise<void> {
    if (this.daemonStatusPingInFlight) {
      return;
    }

    this.daemonStatusPingInFlight = true;
    try {
      const status = await this.backendsService.pingDaemon();
      this.lastDaemonStatus = status;
      this.broadcastDaemonStatus(status);
    } catch (err) {
      this.logger.error(`Daemon status refresh failed: ${err}`, BackendsGateway.name);
    } finally {
      this.daemonStatusPingInFlight = false;
    }
  }

  private emitDaemonStatus(client: Socket, status: DaemonStatusPayload): void {
    try {
      client.emit('message', { channel: 'daemon:status', payload: status });
      this.logger.debug(`Emit to <daemon:status> with data <${JSON.stringify(status)}>`, BackendsGateway.name);
    } catch (err) {
      this.logger.error(
        `Emit error from <daemon:status> with data <${JSON.stringify(status)}>. Error: ${err}`,
        BackendsGateway.name,
      );
    }
  }

  private broadcastDaemonStatus(status: DaemonStatusPayload): void {
    try {
      this.server.emit('message', { channel: 'daemon:status', payload: status });
      this.logger.debug(`Broadcast <daemon:status> with data <${JSON.stringify(status)}>`, BackendsGateway.name);
    } catch (err) {
      this.logger.error(
        `Broadcast error from <daemon:status> with data <${JSON.stringify(status)}>. Error: ${err}`,
        BackendsGateway.name,
      );
    }
  }
}
