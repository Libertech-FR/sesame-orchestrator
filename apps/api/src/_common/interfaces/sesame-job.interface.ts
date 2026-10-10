export interface SesameJobMessagePayload {
  id?: string;
  name: string;
  data?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export interface SesameSubmittedJob {
  id: string;
  waitUntilFinished(timeoutMs: number): Promise<unknown>;
  getState(): Promise<string>;
  discard(): Promise<void>;
}

export interface SesameQueueEventsEmitter {
  on(event: string, handler: (...args: any[]) => void): void;

  off(event: string, handler: (...args: any[]) => void): void;
}

export interface SesameQueueAdapter {
  add(
    name: string,
    data: Record<string, unknown>,
    options?: { jobId?: string; attempts?: number },
    isAsync?: boolean,
  ): Promise<SesameSubmittedJob>;
  getCompleted(): Promise<Array<{ id: string; name: string; returnvalue: unknown }>>;
  getJob(jobId: string): Promise<SesameSubmittedJob | null>;
  readonly events: SesameQueueEventsEmitter;
  connect(): Promise<void>;
  close(): Promise<void>;
}
