export type BadgeItem = {
  color: string
  textColor?: string
  name?: string
  value?: string
}

export type MenuItem = {
  icon: string
  label: string
  name?: string
  path: string
  part: string
  color: string
  textColor?: string
  drawerColor?: string
  badge?: BadgeItem
  hideInMenuBar?: boolean
  hideInDashboard?: boolean
  // Liste de rôles autorisés à voir l'entrée de menu.
  // Si vide ou absent => visible pour tous (sous réserve des autres contraintes ACL/permission).
  roles?: string[]
  // Liste des ACL nécessaires pour voir l'entrée.
  // Si vide ou absent => visible (sous réserve des autres contraintes ACL/permission).
  acl?: string[]
}
