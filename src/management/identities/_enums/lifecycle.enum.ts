export enum IdentityLifecycleDefault {
  OFFICIAL = "O",
  INACTIVE = "I",
  MANUAL = "M",
}

export interface IdentityLifecycleState {
  key: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
}

export const IdentityLifecycleDefaultList: Array<IdentityLifecycleState> = [
  {
    key: IdentityLifecycleDefault.OFFICIAL,
    label: 'Officiel',
    description: 'supannRessourceEtat : {COMPTE} O SupannActif',
    icon: 'mdi-account-check',
    color: '#00FF00',
  },
  {
    key: IdentityLifecycleDefault.INACTIVE,
    label: 'Inactif',
    description: 'supannRessourceEtat : {COMPTE} I SupannInactif',
    icon: 'mdi-account-off',
    color: '#808080',
  },
  {
    key: IdentityLifecycleDefault.MANUAL,
    label: 'Manuel',
    description: 'supannRessourceEtat : {COMPTE} M SupannManuel',
    icon: 'mdi-account-cog',
    color: '#ff009dff',
  },
];
