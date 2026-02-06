import { IdentityState } from './enums'

export const IdentityStateList = [
  {
    value: IdentityState.SYNCED,
    text: 'Synchronisée',
    color: 'positive',
    icon: 'mdi-circle',
    display: true,
  },
  {
    value: IdentityState.TO_SYNC,
    text: 'A Synchroniser',
    color: 'orange-8',
    icon: 'mdi-circle',
    display: true,
  },
  {
    value: IdentityState.TO_VALIDATE,
    text: 'A Valider',
    color: 'warning',
    textColor: 'black',
    icon: 'mdi-circle',
    display: true,
  },
  {
    value: IdentityState.UNKNOWN,
    text: 'Inconnu',
    color: 'grey',
    icon: 'mdi-circle',
    display: false,
  },
  {
    value: IdentityState.TO_CREATE,
    text: 'A créer',
    color: 'grey',
    icon: 'mdi-circle',
    display: true,
  },
  {
    value: IdentityState.TO_COMPLETE,
    text: 'A compléter',
    color: 'secondary',
    textColor: 'black',
    icon: 'mdi-circle',
    display: true,
  },
  {
    value: IdentityState.ON_ERROR,
    text: 'En erreur',
    color: 'negative',
    icon: 'mdi-circle',
    display: true,
  },
  {
    value: IdentityState.PROCESSING,
    text: 'En cours de synchronisation',
    color: 'grey-8',
    icon: 'mdi-loading',
    display: true,
  },
  {
    value: IdentityState.NO_SYNC,
    text: 'A ne pas synchroniser',
    color: 'black',
    icon: 'mdi-publish-off',
    display: true,
  },
]
