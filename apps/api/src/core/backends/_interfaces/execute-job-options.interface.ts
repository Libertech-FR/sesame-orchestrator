import { JobsOptions } from 'bullmq';
import { Types } from 'mongoose';

export interface ExecuteJobOptions {
  job?: JobsOptions;
  async?: boolean;
  disableLogs?: boolean;
  syncTimeout?: number;
  timeoutDiscard?: boolean;
  updateStatus?: boolean;
  switchToProcessing?: boolean;
  comment?: string;
  targetState?: any;
  dataState?: any;
  task?: Types.ObjectId;
}
