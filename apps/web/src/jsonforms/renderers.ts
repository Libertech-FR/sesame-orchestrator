import { additionalsRenderers } from './additional'
import { controlsRenderers } from './controls'
import { layoutsRenderers } from './layouts'

export const quasarRenderers = [
  ...controlsRenderers,
  ...layoutsRenderers,
  ...additionalsRenderers,
]

export const loadAdvancedRenderers = async () => {
  const module = await import('./advanced')
  return module.advancedRenderers
}
