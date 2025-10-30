import { BackendResultInterface } from './backend-result.interface';

export interface WorkerResultInterface {
  jobName?: string;
  options?: {
    [key: string | number]: any;
  };
  jobId: string;
  status: number;
  data: WorkerResultInfoInterface;
}

export interface WorkerResultInfoInterface {
  [backendName: string]: Partial<BackendResultInterface>;
}
