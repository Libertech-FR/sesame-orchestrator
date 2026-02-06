import { omit } from 'radash'
import { IdentityStateList } from '~/constants/lists'

type useIdentityStateReturnType = {
  getStateColor: (state: number) => string
  getStateName: (state: number) => string
  getStateInfos: (state: number) => { color: string, name: string, value: number }
  getStateBadge: (state: number) => { color: string, name: string }
  getStateIcon: (state: number) => string
}

const DEFAULT_COLOR = 'grey'
const DEFAULT_NAME = 'Inconnu'
const DEFAULT_ICON = 'mdi-circle'
const DEFAULT_TEXT_COLOR = 'white'

export function useIdentityStates(): useIdentityStateReturnType {
  function getStateColor(state: number): string {
    const found = IdentityStateList.find(item => item.value === state)
    if (found && found?.display) return found.color

    return DEFAULT_COLOR
  }

  function getStateName(state: number): string {
    const found = IdentityStateList.find(item => item.value === state)
    if (found && found?.display) return found.text

    return DEFAULT_NAME
  }

  function getStateIcon(state: number): string {
    const found = IdentityStateList.find(item => item.value === state)
    if (found && found?.display) return found.icon

    return DEFAULT_ICON
  }

  function getStateInfos(value: number): { color: string, name: string, icon: string, value: number, textColor?: string } {
    const found = IdentityStateList.find(item => item.value === value)

    return {
      color: found ? found.color : DEFAULT_COLOR,
      name: found ? found.text : DEFAULT_NAME,
      icon: found ? found.icon : DEFAULT_ICON,
      textColor: found ? found.textColor : DEFAULT_TEXT_COLOR,
      value,
    }
  }

  function getStateBadge(state: number): { color: string, name: string, icon: string, textColor?: string } {
    return omit(getStateInfos(state), ['value'])
  }

  return { getStateColor, getStateName, getStateInfos, getStateBadge, getStateIcon }
}

