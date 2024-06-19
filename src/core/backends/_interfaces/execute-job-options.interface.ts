import { JobsOptions } from 'bullmq';
import { Types } from 'mongoose';

export interface ExecuteJobOptions {
  job?: JobsOptions;
  async?: boolean;
  disableLogs?: boolean;
  syncTimeout?: number;
  timeoutDiscard?: boolean;
  comment?: string;
  task?: Types.ObjectId;
}
