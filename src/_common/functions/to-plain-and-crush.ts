import { objectify, isObject, isArray, get } from 'radash';
import { ClassTransformOptions, instanceToPlain } from 'class-transformer';

export const keys = <TValue extends object>(value: TValue): string[] => {
  if (!value) return [];
  const getKeys = (nested: any, paths: string[]): string[] => {
    if (isObject(nested)) {
      return Object.entries(nested).flatMap(([k, v]) => getKeys(v, [...paths, k]));
    }
    if (isArray(nested)) {
      if (nested.length > 0 && ['string', 'number', 'boolean'].includes(typeof nested[0])) {
        return nested.flatMap((item) => getKeys(item, paths));
      }
      return nested.flatMap((item, i) => getKeys(item, [...paths, `${i}`]));
    }
    return [paths.join('.')];
  };
  return getKeys(value, []);
};

export const toPlainAndCrush = <TValue extends object>(value: TValue, options?: ClassTransformOptions): object => {
  return objectify(
    keys(instanceToPlain(value, options)),
    (k) => k,
    (k) => get(value, k),
  );
};
