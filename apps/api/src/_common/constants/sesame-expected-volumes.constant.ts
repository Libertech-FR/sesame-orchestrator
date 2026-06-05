export type SesameVolumeCategory = 'api' | 'web' | 'shared';

export interface SesameExpectedVolume {
  id: string;
  category: SesameVolumeCategory;
  mountPoint: string;
  label: string;
  composeHint: string;
  required: boolean;
}

export const SESAME_EXPECTED_VOLUMES: SesameExpectedVolume[] = [
  {
    id: 'api-jsonforms',
    category: 'api',
    mountPoint: '/data/apps/api/configs/identities/jsonforms',
    label: 'JSONForms identités',
    composeHint: './configs/sesame-orchestrator/jsonforms:/data/apps/api/configs/identities/jsonforms',
    required: true,
  },
  {
    id: 'api-lifecycle',
    category: 'api',
    mountPoint: '/data/apps/api/configs/lifecycle',
    label: 'Cycle de vie',
    composeHint: './configs/sesame-orchestrator/lifecycle:/data/apps/api/configs/lifecycle',
    required: true,
  },
  {
    id: 'api-cron',
    category: 'api',
    mountPoint: '/data/apps/api/configs/cron',
    label: 'Tâches cron',
    composeHint: './configs/sesame-orchestrator/cron:/data/apps/api/configs/cron',
    required: true,
  },
  {
    id: 'api-storage',
    category: 'api',
    mountPoint: '/data/apps/api/storage',
    label: 'Stockage API',
    composeHint: './configs/sesame-orchestrator/storage:/data/apps/api/storage',
    required: true,
  },
  {
    id: 'api-logs',
    category: 'api',
    mountPoint: '/data/apps/api/logs',
    label: 'Journaux API',
    composeHint: './configs/sesame-orchestrator/logs:/data/apps/api/logs',
    required: true,
  },
  {
    id: 'api-mail-templates',
    category: 'api',
    mountPoint: '/data/apps/api/templates',
    label: 'Modèles e-mail',
    composeHint: './configs/sesame-orchestrator/mail-templates:/data/apps/api/templates',
    required: true,
  },
  {
    id: 'api-validations',
    category: 'api',
    mountPoint: '/data/apps/api/configs/identities/validations',
    label: 'Validations identités',
    composeHint: './configs/sesame-orchestrator/validations:/data/apps/api/configs/identities/validations',
    required: true,
  },
  {
    id: 'web-config',
    category: 'web',
    mountPoint: '/data/apps/web/config',
    label: 'Configuration Web',
    composeHint: './configs/sesame-app-manager/config:/data/apps/web/config',
    required: true,
  },
  {
    id: 'web-statics',
    category: 'web',
    mountPoint: '/data/apps/web/src/public/config',
    label: 'Statiques Web',
    composeHint: './configs/sesame-app-manager/statics:/data/apps/web/src/public/config',
    required: true,
  },
  {
    id: 'shared-certificates',
    category: 'shared',
    mountPoint: '/data/certificates',
    label: 'Certificats TLS',
    composeHint: './certificates:/data/certificates',
    required: true,
  },
];
