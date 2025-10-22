type useIdentityInitStateReturnType = {
  getInitStateColor: (state: number) => string;
  getInitStateName: (state: number) => string;
  getInitStateIcon: (state: number) => string;
  getInitStateInfos: (state: number) => { color: string, name: string, value: number };
};

export enum IdentityInitState {
  NOSTATE= -1,
  NOSENT = 0,
  SENT = 1,
  INITIALIZED = 2
}

export const IdentityInitStateList = [
  { value: IdentityInitState.NOSTATE, text: '', color: 'grey', icon: 'mdi-email-remove', display: true },
  { value: IdentityInitState.NOSENT, text: 'Non envoyé', color: 'negative', icon: 'mdi-email-alert', display: true },
  { value: IdentityInitState.SENT, text: 'Envoyé', color: 'warning', icon: 'mdi-email-fast', display: true },
  { value: IdentityInitState.INITIALIZED, text: 'activé', color: 'positive', icon: 'mdi-email-open', display: true },
];

export function useIdentityInitStates(): useIdentityInitStateReturnType {
  function getInitStateColor(state: number): string {
    const found = IdentityInitStateList.find(item => item.value === state);
    if (found && found?.display) return found.color;
    return 'grey';
  }

  function getInitStateName(state: number): string {
    const found = IdentityInitStateList.find(item => item.value === state);
    if (found && found?.display) return found.text;
    return 'Inconnu';
  }

  function getInitStateIcon(state: number): string {
    const found = IdentityInitStateList.find(item => item.value === state);
    if (found && found?.display) return found.icon;
    return 'mdi-circle';
  }

  function getInitStateInfos(state: number): { color: string, name: string, icon: string, value: number } {
    const found = IdentityInitStateList.find(item => item.value === state);
    return {
      color: found ? found.color : 'grey',
      name: found ? found.text : 'Unknown',
      icon: found ? found.icon : 'mdi-email',
      value: state
    };
  }

  return { getInitStateColor, getInitStateName, getInitStateInfos,getInitStateIcon };
}

