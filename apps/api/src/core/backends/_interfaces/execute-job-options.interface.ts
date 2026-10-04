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
  concernedToName?: string;
  concernedToRef?: 'identities' | 'groups';
  targetState?: any;
  dataState?: any;
  task?: Types.ObjectId;
}
