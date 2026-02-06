type useIdentityInitStateReturnType = {
  getInitStateColor: (state: number) => string
  getInitStateName: (state: number) => string
  getInitStateIcon: (state: number) => string
  getInitStateInfos: (state: number) => { color: string, name: string, value: number, textColor?: string, icon: string }
}

const DEFAULT_COLOR = 'grey'
const DEFAULT_TEXT_COLOR = 'white'
const DEFAULT_NAME = 'Inconnu'
const DEFAULT_ICON = 'mdi-circle'

export enum IdentityInitState {
  NOSTATE = -1,
  NOSENT = 0,
  SENT = 1,
  INITIALIZED = 2,
}

export const IdentityInitStateList = [
  { value: IdentityInitState.NOSTATE, text: '', color: 'grey', icon: 'mdi-email-remove', display: true },
  { value: IdentityInitState.NOSENT, text: 'Non envoyé', color: 'negative', icon: 'mdi-email-alert', display: true },
  { value: IdentityInitState.SENT, text: 'Envoyé', color: 'warning', icon: 'mdi-email-fast', display: true, textColor: 'black' },
  { value: IdentityInitState.INITIALIZED, text: 'activé', color: 'positive', icon: 'mdi-email-open', display: true },
]

export function useIdentityInitStates(): useIdentityInitStateReturnType {
  function getInitStateColor(state: number): string {
    const found = IdentityInitStateList.find(item => item.value === state)
    if (found && found?.display) return found.color

    return DEFAULT_COLOR
  }

  function getInitStateName(state: number): string {
    const found = IdentityInitStateList.find(item => item.value === state)
    if (found && found?.display) return found.text

    return DEFAULT_NAME
  }

  function getInitStateIcon(state: number): string {
    const found = IdentityInitStateList.find(item => item.value === state)
    if (found && found?.display) return found.icon

    return DEFAULT_ICON
  }

  function getInitStateInfos(value: number): { color: string, name: string, icon: string, value: number, textColor?: string } {
    const found = IdentityInitStateList.find(item => item.value === value)

    return {
      color: found ? found.color : DEFAULT_COLOR,
      name: found ? found.text : DEFAULT_NAME,
      icon: found ? found.icon : DEFAULT_ICON,
      textColor: found ? found.textColor : DEFAULT_TEXT_COLOR,
      value,
    }
  }

  return { getInitStateColor, getInitStateName, getInitStateInfos, getInitStateIcon }
}

