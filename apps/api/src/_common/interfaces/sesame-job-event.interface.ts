export type SesameJobEventName = 'active' | 'progress' | 'completed' | 'failed';

export interface SesameJobEvent {
  event: SesameJobEventName;
  jobId: string;
  name?: string;
  progress?: number;
  returnvalue?: unknown;
  failedReason?: string;
}

export function sesameJobEventsChannel(queueName: string): string {
  return `${queueName}:events`;
}
