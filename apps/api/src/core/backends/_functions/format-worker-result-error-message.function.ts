import { WorkerResultInterface } from '../_interfaces/worker-result.interface';

export function formatWorkerResultErrorMessage(workerResult?: WorkerResultInterface): string {
  if (!workerResult?.data) {
    return 'Échec de synchronisation backend';
  }

  const messages: string[] = [];
  for (const [backendName, result] of Object.entries(workerResult.data)) {
    const message = result?.error?.message || result?.output?.message;
    if (message) {
      messages.push(`${backendName}: ${message}`);
      continue;
    }

    if (result?.status) {
      messages.push(`${backendName}: erreur (code ${result.status})`);
    }
  }

  return messages.length ? messages.join(' · ') : 'Échec de synchronisation backend';
}
