type ManualTransitionRule = {
  source: string
  targets: string[]
}

const stateList = ref<any[]>([])
const manualTransitions = ref<ManualTransitionRule[]>([])
let stateListPromise: Promise<void> | null = null
let manualTransitionsPromise: Promise<void> | null = null

type useIdentityLifecycleReturnType = {
  getLifecycleColor: (state: string) => string
  getLifecycleName: (state: string) => string
  getLifecycleIcon: (state: string) => string
  getLifecycleInfos: (state: string) => { color: string, name: string, value: string, icon: string, textColor?: string }
  stateList: Ref<any[]>
  manualTransitions: Ref<ManualTransitionRule[]>
  isManualLifecycleTargetAllowed: (from: string, to: string) => boolean
  getAllowedManualLifecycleTargets: (from: string) => string[] | null
}

const DEFAULT_COLOR = 'grey'
const DEFAULT_TEXT_COLOR = 'white'
const DEFAULT_NAME = 'Inconnu'
const DEFAULT_ICON = 'mdi-help-rhombus-outline'

export async function useIdentityLifecycles(): Promise<useIdentityLifecycleReturnType> {
  try {
    if (stateList.value.length === 0) {
      if (!stateListPromise) {
        stateListPromise = (async () => {
          try {
            const states = await $http.get('/management/lifecycle/states', {
              method: 'GET',
            })

            if (states && Array.isArray(states._data.data)) {
              stateList.value = states._data.data
            }
          } catch (error: any) {
            console.error('Error fetching lifecycle states:', error)
          } finally {
            stateListPromise = null
          }
        })()
      }

      await stateListPromise
    }
    const loadManualTransitions = async (): Promise<void> => {
      try {
        const response = await $http.get('/management/lifecycle/config/manual-transitions', {
          method: 'GET',
        })
        if (response && Array.isArray(response._data?.data?.manualTransitions)) {
          manualTransitions.value = response._data.data.manualTransitions
        }
      } catch (error: any) {
        console.error('Error fetching manual lifecycle transitions:', error)
      }
    }

    if (manualTransitions.value.length === 0) {
      if (!manualTransitionsPromise) {
        manualTransitionsPromise = (async () => {
          try {
            await loadManualTransitions()
          } finally {
            manualTransitionsPromise = null
          }
        })()
      }
      await manualTransitionsPromise
    }


  } catch (error: any) {
    console.error('Error initializing lifecycle states:', error)
  }

  function getLifecycleName(state: string): string {
    const found = stateList.value.find(item => item.key === state)
    if (found && found?.label) return found.label

    return DEFAULT_NAME
  }

  function getLifecycleColor(state: string): string {
    const found = stateList.value.find(item => item.key === state)
    if (found && found?.color) return found.color

    return DEFAULT_COLOR
  }

  function getLifecycleIcon(state: string): string {
    const found = stateList.value.find(item => item.key === state)
    if (found && found?.icon) return found.icon

    return DEFAULT_ICON
  }

  function getLifecycleInfos(value: string): { color: string, name: string, icon: string, value: string, textColor?: string } {
    const found = stateList.value.find(item => item.key === value)

    return {
      color: found ? found.color : DEFAULT_COLOR,
      name: found ? found.text : DEFAULT_NAME,
      icon: found ? found.icon : DEFAULT_ICON,
      textColor: found ? found.textColor : DEFAULT_TEXT_COLOR,
      value,
    }
  }

  function getAllowedManualLifecycleTargets(from: string): string[] | null {
    const rule = manualTransitions.value.find((item) => item.source === from)
    if (!rule) {
      return null
    }
    return [...new Set(rule.targets || [])]
  }

  function isManualLifecycleTargetAllowed(from: string, to: string): boolean {
    if (!from || !to || from === to) {
      return true
    }
    const allowedTargets = getAllowedManualLifecycleTargets(from)
    if (allowedTargets === null) {
      return true
    }
    return allowedTargets.includes(to)
  }

  return {
    getLifecycleName,
    getLifecycleColor,
    getLifecycleIcon,
    getLifecycleInfos,
    stateList,
    manualTransitions,
    isManualLifecycleTargetAllowed,
    getAllowedManualLifecycleTargets,
  }
}
