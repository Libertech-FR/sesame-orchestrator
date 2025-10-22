import {
  composePaths,
  computeLabel,
  getFirstPrimitiveProp,
  isDescriptionHidden,
  Resolve,
} from '@jsonforms/core';
import cloneDeep from 'lodash/cloneDeep';
import debounce from 'lodash/debounce';
import merge from 'lodash/merge';
import get from 'lodash/get';
import isPlainObject from 'lodash/isPlainObject';
import isNull from 'lodash/isNull';
import { useStyles } from '../styles';
import { computed, inject, ref, provide } from 'vue';
import type { ComputedRef } from 'vue';
import type { JsonFormsSubStates } from '@jsonforms/core';
import Ajv from 'ajv';
import { isEmpty } from 'radash';

export const useControlAppliedOptions = <I extends { control: any }>(
  input: I
) => {
  return computed(() =>
    merge(
      {},
      cloneDeep(input.control.value.config),
      cloneDeep(input.control.value.uischema.options)
    )
  );
};

export const useComputedLabel = <I extends { control: any }>(
  input: I,
  appliedOptions: ComputedRef<any>
) => {
  return computed((): string => {
    return computeLabel(
      input.control.value.label,
      input.control.value.required,
      !!appliedOptions.value?.hideRequiredAsterisk
    );
  });
};

/**
 * Adds styles, appliedOptions and vuetifyProps
 */
export const useVuetifyLabel = <I extends { label: any }>(input: I) => {
  const styles = useStyles(input.label.value.uischema);
  const appliedOptions = computed(() =>
    merge(
      {},
      cloneDeep(input.label.value.config),
      cloneDeep(input.label.value.uischema.options)
    )
  );
  const vuetifyProps = (path: string) => {
    const props = get(appliedOptions.value?.vuetify, path);

    return props && isPlainObject(props) ? props : {};
  };
  return {
    ...input,
    appliedOptions,
    vuetifyProps,
    styles,
  };
};

/**
 * Adds styles, isFocused, appliedOptions and onChange adapted for Quasar.
 */
export const useQuasarControl = <
  I extends { control: any; handleChange: any }
>(
  input: I,
  adaptValue: (target: any) => any = (v) => v,
  debounceWait?: number
) => {
  const changeEmitter =
    typeof debounceWait === 'number'
      ? debounce(input.handleChange, debounceWait)
      : input.handleChange;

  const onChange = (value: any) => {
    // console.debug('onChange', input.control.value.path, adaptValue(value))
    changeEmitter(input.control.value.path, adaptValue(value));
  };

  // You might need to adapt `useControlAppliedOptions` for Quasar if it relies on Vuetify specifics
  const appliedOptions = useControlAppliedOptions(input);
  const isFocused = ref(false);

  // Adapt this function based on Quasar's behavior and your needs
  const persistentHint = (): boolean => {
    // This is a simplified example; adjust according to your logic and Quasar's API
    return !isFocused.value && !!appliedOptions.value?.showUnfocusedDescription;
  };

  // Assuming `useComputedLabel` and `useStyles` can be adapted or are generic enough for Quasar
  const computedLabel = useComputedLabel(input, appliedOptions);
  const styles = useStyles(input.control.value.uischema);

  // This part likely remains unchanged but ensure it aligns with Quasar components' needs
  const controlWrapper = computed(() => {
    const { id, description, errors, label, visible, required } = input.control.value;
    return { id, description, errors, label, visible, required };
  });

  // Quasar-specific props or configurations can be handled here
  // This function would need to be adapted based on Quasar components' props and options
  const quasarProps = (path: string) => {
    const props = get(appliedOptions.value?.quasar, path);
    return props && isPlainObject(props) ? props : {};
  };

  // console.log('input.control.value.data', input.control.value.data)
  if (isEmpty(input.control.value?.data) || isNull(input.control.value?.data)) {
    input.handleChange(input.control.value?.path, input.control.value?.schema?.default || undefined)
    // console.log('trigger default', input.control.value?.path, input.control.value.schema.default || undefined)
  }

  // if (typeof input.control.value.data === 'undefined' || input.control.value.data === null && input.control.value.errors) {
  //   input.handleChange(input.control.value.path, input.control.value.schema.default || null)
  // }

  return {
    ...input,
    styles,
    isFocused,
    appliedOptions,
    controlWrapper,
    onChange,
    quasarProps, // Replace `vuetifyProps` with this adapted function
    persistentHint,
    computedLabel,
  };
};

export const useTranslator = () => {
  const jsonforms = inject<JsonFormsSubStates>('jsonforms');

  if (!jsonforms) {
    throw new Error(
      "'jsonforms couldn't be injected. Are you within JSON Forms?"
    );
  }

  if (!jsonforms.i18n || !jsonforms.i18n.translate) {
    throw new Error(
      "'jsonforms i18n couldn't be injected. Are you within JSON Forms?"
    );
  }

  const translate = computed(() => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return jsonforms.i18n!.translate!;
  });

  return translate;
};

/**
 * Adds styles and appliedOptions
 */
export const useVuetifyLayout = <I extends { layout: any }>(input: I) => {
  const appliedOptions = computed(() => {
    return merge(
      {},
      cloneDeep(input.layout.value.config),
      cloneDeep(input.layout.value.uischema.options)
    );
  });

  const vuetifyProps = (path: string) => {
    const props = get(appliedOptions.value?.vuetify, path);

    return props && isPlainObject(props) ? props : {};
  };

  return {
    ...input,
    styles: useStyles(input.layout.value.uischema),
    appliedOptions,
    vuetifyProps,
  };
};

/**
 * Adds styles, appliedOptions and childUiSchema
 */
export const useVuetifyArrayControl = <I extends { control: any }>(
  input: I
) => {
  const appliedOptions = useControlAppliedOptions(input);

  const computedLabel = useComputedLabel(input, appliedOptions);

  const vuetifyProps = (path: string) => {
    const props = get(appliedOptions.value?.vuetify, path);

    return props && isPlainObject(props) ? props : {};
  };

  const childLabelForIndex = (index: number | null) => {
    if (index === null) {
      return '';
    }
    const childLabelProp =
      input.control.value.uischema.options?.childLabelProp ??
      getFirstPrimitiveProp(input.control.value.schema);
    if (!childLabelProp) {
      return `${index}`;
    }
    const labelValue = Resolve.data(
      input.control.value.data,
      composePaths(`${index}`, childLabelProp)
    );
    if (
      labelValue === undefined ||
      labelValue === null ||
      Number.isNaN(labelValue)
    ) {
      return '';
    }
    return `${labelValue}`;
  };
  return {
    ...input,
    styles: useStyles(input.control.value.uischema),
    appliedOptions,
    childLabelForIndex,
    computedLabel,
    vuetifyProps,
  };
};

/**
 * Adds styles and appliedOptions
 */
export const useVuetifyBasicControl = <I extends { control: any }>(
  input: I
) => {
  const appliedOptions = useControlAppliedOptions(input);

  const vuetifyProps = (path: string) => {
    const props = get(appliedOptions.value?.vuetify, path);

    return props && isPlainObject(props) ? props : {};
  };

  return {
    ...input,
    styles: useStyles(input.control.value.uischema),
    appliedOptions,
    vuetifyProps,
  };
};

/**
 * Extracts Ajv from JSON Forms
 */
export const useAjv = () => {
  const jsonforms = inject<JsonFormsSubStates>('jsonforms');

  if (!jsonforms) {
    throw new Error(
      "'jsonforms' couldn't be injected. Are you within JSON Forms?"
    );
  }

  // should always exist
  return jsonforms.core?.ajv as Ajv;
};

export interface NestedInfo {
  level: number;
  parentElement?: 'array' | 'object';
}
export const useNested = (element: false | 'array' | 'object'): NestedInfo => {
  const nestedInfo = inject<NestedInfo>('jsonforms.nestedInfo', { level: 0 });
  if (element) {
    provide('jsonforms.nestedInfo', {
      level: nestedInfo.level + 1,
      parentElement: element,
    });
  }
  return nestedInfo;
};
