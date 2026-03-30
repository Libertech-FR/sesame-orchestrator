type UiConfigPayload = {
  menus?: {
    entries?: Record<string, unknown>[]
    parts?: Record<string, unknown>[]
    useDefaultEntries?: boolean
  }
  identitiesColumns?: {
    entries?: Record<string, unknown>[]
  }
}

export default defineNuxtPlugin(async () => {
  const appConfig = useAppConfig()
  const mutableAppConfig = appConfig as Record<string, unknown>

  try {
    const payload = await $fetch<UiConfigPayload>('/config/ui')

    mutableAppConfig.menus = {
      entries: payload?.menus?.entries || [],
      parts: payload?.menus?.parts || [],
      useDefaultEntries: payload?.menus?.useDefaultEntries,
    }

    mutableAppConfig.identitiesColumns = {
      entries: payload?.identitiesColumns?.entries || [],
    }
  } catch (error) {
    console.debug('[Nuxt] Error while loading ui config', error)
  }
})
