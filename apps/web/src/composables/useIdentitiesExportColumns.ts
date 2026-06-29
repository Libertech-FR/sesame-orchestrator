const EXPORT_COLUMNS_STORAGE_KEY = 'sesame.identities-export.columns'

export function useIdentitiesExportColumns() {
  const exportVisibleColumns = useLocalStorage<string[]>(EXPORT_COLUMNS_STORAGE_KEY, [])

  const initializeExportColumns = (availableNames: string[]): void => {
    const validStored = exportVisibleColumns.value.filter((name) => availableNames.includes(name))
    exportVisibleColumns.value = validStored.length > 0 ? validStored : [...availableNames]
  }

  return {
    exportVisibleColumns,
    initializeExportColumns,
  }
}
