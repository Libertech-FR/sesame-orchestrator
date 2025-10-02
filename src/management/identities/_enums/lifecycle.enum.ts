export enum IdentityLifecycleDefault {
  OFFICIAL = "O",
  INACTIVE = "I",
  MANUAL = "M",
}

export const IdentityLifecycleDefaultList: Array<{ key: string; label: string; description: string, icon: string }> = [
  {
    key: IdentityLifecycleDefault.OFFICIAL,
    label: 'Officiel',
    description: 'supannRessourceEtat : {COMPTE} O SupannActif',
    icon: 'mdi-account-check',
  },
  {
    key: IdentityLifecycleDefault.INACTIVE,
    label: 'Inactif',
    description: 'supannRessourceEtat : {COMPTE} I SupannInactif',
    icon: 'mdi-account-off',
  },
  {
    key: IdentityLifecycleDefault.MANUAL,
    label: 'Manuel',
    description: 'supannRessourceEtat : {COMPTE} M SupannManuel',
    icon: 'mdi-account-cog',
  },
];
