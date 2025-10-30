<template lang="pug">
div
  json-forms(
    :data="data"
    :schema="schema"
    :uischema="uischema"
    :renderers="renderers"
    validationMode="ValidateAndShow"
    :additionalErrors="getSchemaValidations"
    @change="onChange"
  )
  //- pre(v-html="JSON.stringify(data, null, 2)")
</template>

<script setup lang="ts">
import { JsonForms } from '@jsonforms/vue';
import {
  defaultStyles,
  mergeStyles,
  vanillaRenderers,
} from "@jsonforms/vue-vanilla";

import type { JsonFormsChangeEvent } from '@jsonforms/vue';
import { QuasarJsonformRenderer } from './quasar-jsonform';
import { computed, provide, ref } from 'vue';
import { useFetch } from 'nuxt/app';
import type { ErrorObject } from 'ajv';
import { isObject } from 'radash';

const customStyle = mergeStyles(defaultStyles, {
  control: {
    input: 'inputstyle',
    error: 'errorstyle',
  },
});

provide('styles', customStyle);

const renderers = Object.freeze([
  //...vanillaRenderers,
  ...QuasarJsonformRenderer,
  // Add custom renderers here
]);

const props = defineProps({
  schema: {
    type: Object,
    default: () => ({}),
  },
  uischema: {
    type: Object,
    default: () => ({}),
  },
  validations: {
    type: Object || null,
    default: {},
  },
  // data: {
  //   type: Object,
  //   default: {},
  // },
});

const validations = defineModel('validations', {
  type: Object || null,
  default: {},
});

const data = defineModel('data', {
  type: Object,
  default: {},
});

function onChange(event: JsonFormsChangeEvent) {
  // console.log('onchanbge', event)
  // data.value = event.data;
  // console.log('event.data', event.data)
  // if (isObject(event.data)) {
  // if (!isObject(data.value)) data.value = {}
  for (const key in event.data) {
    const evdata = event.data[key];
    // console.log('data.value', data.value)
    data.value[key] = evdata;
    // console.log('data.value[key]', data.value[key])
  }
  // }
}

const getSchemaValidations = computed(() => {
  if (!props.validations || !props.validations) {
    return [];
  }
  const errorObject: ErrorObject[] = [];
  let validationList = props.validations
  for (const key in validationList) {
    errorObject.push({
      message: validationList[key],
      instancePath: `/${key}`,
      keyword: 'type',
      params: {},
    });
  }
  return errorObject;
});
</script>

<style>
.horizontal-layout {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-around;
  justify-items: center;
}

.horizontal-layout-item {
  flex: 1;
  min-width: 0;
  width: calc(33.333% - 10px);
  height: 100px;
  margin-right: 15px;
  justify-content: center;
}

.horizontal-layout-item:last-child {
  margin-right: 0;
}

.vertical-layout {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  justify-content: space-around;
  justify-items: flex-start;
}

.inputstyle {
  padding: 10px 15px;
  font-size: 16px;
  border: 1px solid #ced4da;
  /* Couleur de bordure légère */
  border-radius: 5px;
  /* Coins arrondis */
  outline: none;
  /* Supprime le contour par défaut lors de la sélection */
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  /* Légère ombre pour un effet en profondeur */
  transition: border-color 0.2s, box-shadow 0.2s;
  /* Transition douce pour l'interaction */
}

.inputstyle:focus {
  border-color: #007bff;
  /* Changement de couleur de bordure pour l'état focus */
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  /* Ombre extérieure pour indiquer le focus */
}

.errorstyle {
  border-color: red;
  color: red;
  /* Set border color to red for error */
}


.description {
  display: none;
}
</style>
