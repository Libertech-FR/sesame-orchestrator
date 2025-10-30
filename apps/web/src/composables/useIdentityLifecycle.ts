
type useIdentityLifecycleReturnType = {
  getLifecycleColor: (state: string) => string;
  getLifecycleName: (state: string) => string;
  getLifecycleIcon: (state: string) => string;
  getLifecycleInfos: (state: string) => { color: string, name: string, value: string, icon: string };
  stateList: Ref<any[]>;
};
const stateList = ref<any[]>([])

export async function useIdentityLifecycles(): Promise<useIdentityLifecycleReturnType> {

  try {
    const { data: states } = await useHttp<{ data: any }>('/management/lifecycle/states', {
      method: 'GET',
    })
    if (states.value && Array.isArray(states.value.data)) {
      stateList.value = states.value.data
    }
  } catch (error) {
    console.error('Error fetching lifecycle states:', error)
  }

  function getLifecycleName(state: string): string {
    const found = stateList.value.find(item => item.key === state);
    if (found && found?.label) return found.label;
    return 'Inconnu';
  }

  function getLifecycleColor(state: string): string {
    const found = stateList.value.find(item => item.key === state);
    if (found && found?.color) return found.color;
    return 'grey';
  }

  function getLifecycleIcon(state: string): string {
    const found = stateList.value.find(item => item.key === state);
    if (found && found?.icon) return found.icon;
    return 'mdi-help-rhombus-outline';
  }

  function getLifecycleInfos(state: string): { color: string, name: string, icon: string, value: string } {
    const found = stateList.value.find(item => item.key === state);
    if (found && found?.key) return {
      color: found.color,
      name: found.label,
      icon: found.icon,
      value: state,
    };
    return {
      color: 'grey',
      name: 'Inconnu',
      icon: 'mdi-help-rhombus-outline',
      value: state,
    };
  }

  return { getLifecycleName, getLifecycleColor, getLifecycleIcon, getLifecycleInfos, stateList };
}
