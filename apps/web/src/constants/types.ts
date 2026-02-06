export type BadgeItem = {
  color: string
  textColor?: string
  name?: string
  value?: string
}

export type MenuItem = {
  icon: string
  label: string
  path: string
  part: string
  color: string
  textColor?: string
  badge?: BadgeItem
  hideInMenuBar?: boolean
}
