<template lang="pug">
q-input(
  :model-value="displayValue"
  @update:model-value="onValueInput"
  :readonly="readonly"
  :disable="disable"
  :label="label"
  :hint="hint"
  type="number"
  min="0"
  step="any"
  input-class="text-right"
  outlined
  dense
)
  template(#append)
    q-chip(v-if="showHuman" dense size="sm" color="grey-3" text-color="dark")
      span(v-text="humanValue")
  template(#after)
    q-select(
      :model-value="unit"
      @update:model-value="onUnitChange"
      :options="unitOptions"
      :disable="disable"
      :readonly="readonly"
      emit-value
      map-options
      outlined
      dense
      options-dense
      style="min-width: 110px"
    )
</template>

<script lang="ts">
import { computed, ref, watch, type PropType } from 'vue'

// La valeur (v-model) est toujours exprimée en secondes, l'unité ne sert qu'à la saisie.
type DurationUnit = 'seconds' | 'minutes' | 'hours' | 'days' | 'months'

const UNIT_FACTORS: Record<DurationUnit, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400,
  // Mois conventionnel de 30 jours
  months: 86400 * 30,
}

const UNIT_LABELS: Record<DurationUnit, string> = {
  seconds: 'secondes',
  minutes: 'minutes',
  hours: 'heures',
  days: 'jours',
  months: 'mois',
}

const toSeconds = (value: unknown): number => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
}

export default defineComponent({
  name: 'SesameCoreInputDuration',
  props: {
    modelValue: { type: [Number, String] as PropType<number | string | null>, default: 0 },
    label: { type: String, default: undefined },
    hint: { type: String, default: undefined },
    readonly: { type: Boolean, default: false },
    disable: { type: Boolean, default: false },
    units: {
      type: Array as PropType<DurationUnit[]>,
      default: () => ['seconds', 'minutes', 'hours', 'days', 'months'],
    },
    showHuman: { type: Boolean, default: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const pickBestUnit = (seconds: number): DurationUnit => {
      const sorted = [...props.units].sort((a, b) => UNIT_FACTORS[b] - UNIT_FACTORS[a])
      if (seconds <= 0) return props.units.includes('days') ? 'days' : sorted[sorted.length - 1]
      return sorted.find((u) => seconds % UNIT_FACTORS[u] === 0) || sorted[sorted.length - 1]
    }

    const unit = ref<DurationUnit>(pickBestUnit(toSeconds(props.modelValue)))
    const lastEmitted = ref<number>(toSeconds(props.modelValue))

    // Changement externe (ex: chargement des paramètres) : on recalcule l'unité la plus lisible
    watch(
      () => props.modelValue,
      (value) => {
        const seconds = toSeconds(value)
        if (seconds === lastEmitted.value) return
        lastEmitted.value = seconds
        unit.value = pickBestUnit(seconds)
      },
    )

    const unitOptions = computed(() => props.units.map((u) => ({ label: UNIT_LABELS[u], value: u })))

    const displayValue = computed(() => {
      const value = toSeconds(props.modelValue) / UNIT_FACTORS[unit.value]
      return Math.round(value * 100) / 100
    })

    const onValueInput = (value: string | number | null) => {
      const seconds = toSeconds(Number(value) * UNIT_FACTORS[unit.value])
      lastEmitted.value = seconds
      emit('update:modelValue', seconds)
    }

    const onUnitChange = (value: DurationUnit) => {
      unit.value = value
    }

    const humanValue = computed(() => {
      let remaining = toSeconds(props.modelValue)
      if (remaining <= 0) return '0 minute'

      const months = Math.floor(remaining / UNIT_FACTORS.months)
      remaining -= months * UNIT_FACTORS.months
      const days = Math.floor(remaining / UNIT_FACTORS.days)
      remaining -= days * UNIT_FACTORS.days
      const hours = Math.floor(remaining / UNIT_FACTORS.hours)
      remaining -= hours * UNIT_FACTORS.hours
      const minutes = Math.floor(remaining / UNIT_FACTORS.minutes)
      const secs = remaining - minutes * UNIT_FACTORS.minutes

      const parts: string[] = []
      if (months) parts.push(`${months} mois`)
      if (days) parts.push(`${days} jour${days > 1 ? 's' : ''}`)
      if (hours) parts.push(`${hours} heure${hours > 1 ? 's' : ''}`)
      if (minutes) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`)
      if (secs) parts.push(`${secs} seconde${secs > 1 ? 's' : ''}`)
      return parts.join(' ')
    })

    return {
      unit,
      unitOptions,
      displayValue,
      onValueInput,
      onUnitChange,
      humanValue,
    }
  },
})
</script>
