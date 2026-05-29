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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, handler: (...args: any[]) => void): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  readonly events: SesameQueueEventsEmitter;
  connect(): Promise<void>;
  close(): Promise<void>;
}
