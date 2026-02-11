import type { QTableProps } from 'quasar'
import Sandbox from '@nyariv/sandboxjs'

type ColumnType = {
  name: string
  type: string

  valueMapping?: Record<string | number | symbol, string>
}

enum IdentityState {
  SYNCED = 99,
  PROCESSING = 50,
  TO_SYNC = 2,
  TO_VALIDATE = 1,
  TO_CREATE = -1,
  TO_COMPLETE = -2,
  ON_ERROR = -3,
  DONT_SYNC = -99,
}

const IdentityStateLabels: Record<IdentityState, string> = {
  [IdentityState.SYNCED]: 'Synchronisé',
  [IdentityState.PROCESSING]: 'En cours de traitement',
  [IdentityState.TO_SYNC]: 'À synchroniser',
  [IdentityState.TO_VALIDATE]: 'À valider',
  [IdentityState.TO_CREATE]: 'À créer',
  [IdentityState.TO_COMPLETE]: 'À compléter',
  [IdentityState.ON_ERROR]: 'En erreur',
  [IdentityState.DONT_SYNC]: 'Ne pas synchroniser',
}

interface ColumnConfig {
  name: string;
  type: 'text' | 'number' | 'date';
  label: string;
  field: string | ((row: any) => any);
  required?: boolean;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  sort?: (a: any, b: any, rowA: any, rowB: any) => number;
  rawSort?: (a: any, b: any, rowA: any, rowB: any) => number;
  sortOrder?: "ad" | "da";
  format?: (val: any, row: any) => any;
  style?: string | ((row: any) => string);
  classes?: string | ((row: any) => string);
  headerStyle?: string;
  headerClasses?: string;
}

function processFieldValue(row: any, field: any) {
  if (field.type === 'function') {
    const sandbox = new Sandbox();
    const exec = sandbox.compile('return ' + field.value, true);

    return exec({ row }).run();
  }

  return row[field];
}

function processFormat(value: any, format: any) {
  if (format && format.type === 'function') {
    const sandbox = new Sandbox();
    const exec = sandbox.compile('return ' + format.value, true);

    return exec({ value }).run();
  }

  return Array.isArray(value) ? value?.join(', ') : value;
}

type useColumnsIdentitesReturnType = {
  columns: Ref<QTableProps['columns'] & { type: string }[]>,
  visibleColumns: Ref<QTableProps['visibleColumns']>,
  columnsType: Ref<ColumnType[]>,
}

export function useColumnsIdentites(): useColumnsIdentitesReturnType {
  const dayjs = useDayjs()
  const config = useAppConfig()

  const columns = ref<QTableProps['columns'] & { type: string }[]>([
    {
      name: 'state',
      label: 'États',
      field: 'state',
      align: 'left',
    },
    ...config?.identitiesColumns?.entries || [],
    {
      name: 'metadata.lastUpdatedAt',
      label: 'Date de modification',
      field: (row: any) => row?.metadata?.lastUpdatedAt,
      format: (val: string) => dayjs(val).format('DD/MM/YYYY HH:mm'),
      align: 'left',
      sortable: true,
    },
    {
      name: 'metadata.createdAt',
      label: 'Date de création',
      field: (row: any) => row?.metadata?.createdAt,
      format: (val: string) => dayjs(val).format('DD/MM/YYYY HH:mm'),
      align: 'left',
      sortable: true,
    },
  ].map((col: any) => ({
    ...col,
    field: typeof col.field === 'function' ? col.field : (row: any) => processFieldValue(row, col.field),
    format: typeof col.format === 'function' ? col.format : (val: any) => processFormat(val, col.format),
  })) as ColumnConfig[])

  const visibleColumns = ref<QTableProps['visibleColumns']>([
    ...config?.identitiesColumns?.entries.map((col: any) => col.name) || [],
    'metadata.lastUpdatedAt',
    'metadata.createdAt',
    'state',
  ])

  const columnsType = ref<ColumnType[]>([
    ...config?.identitiesColumns?.entries.map((col: any) => {
      // console.log('Processing column config', col)
      return {
        name: col.name,
        type: col.type || 'text',
        valueMapping: col.valueMapping || [],
      }
    }) || [],
    { name: 'state', type: 'number', valueMapping: IdentityStateLabels },
    { name: 'metadata.lastUpdatedAt', type: 'date' },
    { name: 'metadata.createdAt', type: 'date' },
  ])

  return {
    columns,
    visibleColumns,
    columnsType,
  }
}
