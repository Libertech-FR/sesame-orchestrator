import type { QTableProps } from 'quasar'
import type { components } from '#build/types/service-api'
import Sandbox from '@nyariv/sandboxjs'

type Identity = components['schemas']['IdentitiesDto']

type ColumnType = {
  name: string
  type: string
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

const config = useAppConfig()
const daysjs = useDayjs()

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
  columns: Ref<QTableProps['columns']>,
  visibleColumns: Ref<QTableProps['visibleColumns']>,
  columnsType: Ref<ColumnType[]>,
}

export function useColumnsIdentites(): useColumnsIdentitesReturnType {
  const columns = ref<QTableProps['columns']>(
    [
      {
        name: 'states',
        label: 'Etats',
        field: 'states',
        align: 'left',
      },
      ...config?.identitiesColumns?.entries || [],
      {
        name: 'metadata.lastUpdatedAt',
        label: 'Date de modification',
        field: (row: Identity) => row?.metadata?.lastUpdatedAt,
        format: (val: string) => daysjs(val).format('DD/MM/YYYY HH:mm'),
        align: 'left',
        sortable: true,
      },
      {
        name: 'metadata.createdAt',
        label: 'Date de création',
        field: (row: Identity) => row?.metadata?.createdAt,
        format: (val: string) => daysjs(val).format('DD/MM/YYYY HH:mm'),
        align: 'left',
        sortable: true,
      },
      {
        name: 'actions',
        label: 'Actions',
        field: 'actions',
        align: 'left',
      },
    ].map((col: any) => ({
      ...col,
      field: typeof col.field === 'function' ? col.field : (row: Identity) => processFieldValue(row, col.field),
      format: typeof col.format === 'function' ? col.format : (val: any) => processFormat(val, col.format),
    })) as ColumnConfig[]
  );

  // const columns = ref<QTableProps['columns']>([
  //   {
  //     name: 'inetOrgPerson.uid',
  //     label: 'ID',
  //     field: (row: Identity) => row?.inetOrgPerson?.uid,
  //     align: 'left',
  //     sortable: true,
  //   },
  //   {
  //     name: 'inetOrgPerson.employeeNumber',
  //     label: 'EmployeeNumber',
  //     field: (row: Identity) => row?.inetOrgPerson?.employeeNumber,
  //     align: 'left',
  //     sortable: true,
  //   },
  //   {
  //     name: 'additionalFields.attributes.supannPerson.supannTypeEntiteAffectation',
  //     label: 'Affectation',
  //     field: (row: Identity) => row.additionalFields?.attributes?.supannPerson?.supannTypeEntiteAffectation,
  //     align: 'left',
  //     sortable: true,
  //   },
  //   {
  //     name: 'inetOrgPerson.cn',
  //     label: 'Nom',
  //     field: (row: Identity) => row?.inetOrgPerson?.cn,
  //     align: 'left',
  //     sortable: true,
  //   },
  //   {
  //     name: 'inetOrgPerson.givenName',
  //     label: 'Prénom',
  //     field: (row: Identity) => row?.inetOrgPerson?.givenName,
  //     align: 'left',
  //     sortable: false,
  //   },
  //   {
  //     name: 'metadata.lastUpdatedAt',
  //     label: 'Date de modification',
  //     field: (row: Identity) => row?.metadata?.lastUpdatedAt,
  //     format: (val: string) => daysjs(val).format('DD/MM/YYYY HH:mm'),
  //     align: 'left',
  //     sortable: true,
  //   },
  //   {
  //     name: 'metadata.createdAt',
  //     label: 'Date de création',
  //     field: (row: Identity) => row?.metadata?.createdAt,
  //     format: (val: string) => daysjs(val).format('DD/MM/YYYY HH:mm'),
  //     align: 'left',
  //     sortable: true,
  //   },
  //   {
  //     name: 'actions',
  //     label: 'Actions',
  //     field: 'actions',
  //     align: 'left',
  //   },
  // ])

  const visibleColumns = ref<QTableProps['visibleColumns']>([
    // 'inetOrgPerson.uid',
    // 'inetOrgPerson.employeeNumber',
    // 'additionalFields.attributes.supannPerson.supannTypeEntiteAffectation',
    // 'envelope.observers.name',
    // 'envelope.assigned.name',
    // 'inetOrgPerson.cn',
    // 'inetOrgPerson.givenName',
    ...config?.identitiesColumns?.entries.map((col: any) => col.name) || [],
    'metadata.lastUpdatedAt',
    'metadata.createdAt',
    'actions',
    'states',
  ])
  const columnsType = ref<ColumnType[]>([
    // { name: 'inetOrgPerson.uid', type: 'text' },
    // { name: 'inetOrgPerson.employeeNumber', type: 'text' },
    // { name: 'additionalFields.attributes.supannPerson.supannTypeEntiteAffectation', type: 'text' },
    // { name: 'envelope.observers.name', type: 'text' },
    // { name: 'envelope.assigned.name', type: 'text' },
    // { name: 'inetOrgPerson.cn', type: 'text' },
    // { name: 'inetOrgPerson.givenName', type: 'text' },
    ...config?.identitiesColumns?.entries.map((col: any) => ({ name: col.name, type: col.type || 'text' })) || [],
    { name: 'metadata.lastUpdatedAt', type: 'date' },
    { name: 'metadata.createdAt', type: 'date' },
    // { name: 'actions', type: 'text' },
    // { name: 'actions', type: 'text' },
    // { name: 'actions', type: 'text' },
  ])

  return {
    columns,
    visibleColumns,
    columnsType,
  }
}
