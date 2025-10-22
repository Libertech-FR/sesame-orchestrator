import { omit } from "radash";

type useIdentityStateReturnType = {
  getStateColor: (state: number) => string;
  getStateName: (state: number) => string;
  getStateInfos: (state: number) => { color: string, name: string, value: number };
  getStateBadge: (state: number) => { color: string, name: string };
  getStateIcon: (state: number) => string;
};

export enum IdentityState {
  SYNCED = 99,
  PROCESSING = 50,
  TO_SYNC = 2,
  TO_VALIDATE = 1,
  UNKNOWN = 0,
  TO_CREATE = -1,
  TO_COMPLETE = -2,
  ON_ERROR = -3,
  NO_SYNC = -99
}

export const IdentityStateList = [
  { value: IdentityState.SYNCED, text: 'Synchronisée', color: 'positive', icon: 'mdi-circle', display: true },
  { value: IdentityState.TO_SYNC, text: 'A Synchroniser', color: 'orange-8', icon: 'mdi-circle', display: true },
  { value: IdentityState.TO_VALIDATE, text: 'A valider', color: 'info', icon: 'mdi-circle', display: true },
  { value: IdentityState.UNKNOWN, text: 'Inconnu', color: 'grey', icon: 'mdi-circle', display: true },
  { value: IdentityState.TO_CREATE, text: 'A créer', color: 'grey', icon: 'mdi-circle', display: true },
  { value: IdentityState.TO_COMPLETE, text: 'A compléter', color: 'warning', icon: 'mdi-circle', display: true },
  { value: IdentityState.ON_ERROR, text: 'En erreur', color: 'negative', icon: 'mdi-circle', display: true },
  { value: IdentityState.PROCESSING, text: 'En cours de synchronisation', color: 'warning', icon: 'mdi-loading', display: true },
  { value: IdentityState.NO_SYNC, text: 'A ne pas synchroniser', color: 'black', icon: 'mdi-publish-off', display: true },
];

export function useIdentityStates(): useIdentityStateReturnType {
  function getStateColor(state: number): string {
    const found = IdentityStateList.find(item => item.value === state);
    if (found && found?.display) return found.color;
    return 'grey';
  }

  function getStateName(state: number): string {
    const found = IdentityStateList.find(item => item.value === state);
    if (found && found?.display) return found.text;
    return 'Inconnu';
  }

  function getStateIcon(state: number): string {
    const found = IdentityStateList.find(item => item.value === state);
    if (found && found?.display) return found.icon;
    return 'mdi-circle';
  }

  function getStateInfos(state: number): { color: string, name: string, icon: string, value: number } {
    const found = IdentityStateList.find(item => item.value === state);
    return {
      color: found ? found.color : 'grey',
      name: found ? found.text : 'Unknown',
      icon: found ? found.icon : 'mdi-circle',
      value: state
    };
  }

  function getStateBadge(state: number): { color: string, name: string, icon: string } {
    return omit(getStateInfos(state), ['value']);
  }

  return { getStateColor, getStateName, getStateInfos, getStateBadge, getStateIcon };
}

