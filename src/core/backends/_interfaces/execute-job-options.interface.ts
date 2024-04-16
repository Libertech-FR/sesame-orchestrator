import { JobsOptions } from 'bullmq';

export interface ExecuteJobOptions {
  job?: JobsOptions;
  async?: boolean;
  syncTimeout?: number;
  timeoutDiscard?: boolean;
  comment?: string;
}
