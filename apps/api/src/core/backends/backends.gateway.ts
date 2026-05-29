import { Logger, UnauthorizedException } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { hash } from 'crypto';
import { Server, Socket } from 'socket.io';
import { Public } from '~/_common/decorators/public.decorator';
import { Agents } from '../agents/_schemas/agents.schema';
import { AgentsService } from '../agents/agents.service';
import { ActionType } from './_enum/action-type.enum';
import { BackendsService } from './backends.service';

type JobChannel = 'job:added' | 'job:completed' | 'job:failed' | 'job:progress' | 'job:active';

const IDENTITY_JOB_TYPES = [ActionType.IDENTITY_UPDATE, ActionType.IDENTITY_CREATE, ActionType.IDENTITY_DELETE];

@Public()
@WebSocketGateway({
  namespace: '/core/backends',
  cors: { origin: true, credentials: true },
})
export class BackendsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(BackendsGateway.name);
  private readonly clientSubscriptions = new Map<string, () => void>();

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
      this.logger.debug(`WebSocket connected: ${client.id}`);
    } catch {
      client.disconnect(true);
    }
  }

  public handleDisconnect(client: Socket): void {
    const cleanup = this.clientSubscriptions.get(client.id);
    cleanup?.();
    this.clientSubscriptions.delete(client.id);
    this.logger.debug(`WebSocket disconnected: ${client.id}`);
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
}
