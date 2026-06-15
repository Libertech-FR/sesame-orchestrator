import { Types } from 'mongoose';

function isObjectIdLike(value: unknown): value is { _bsontype?: 'ObjectId'; toString(): string } {
  return (
    value instanceof Types.ObjectId ||
    (value !== null &&
      typeof value === 'object' &&
      '_bsontype' in value &&
      (value as { _bsontype: string })._bsontype === 'ObjectId')
  );
}

/**
 * Re-hydrates ObjectId instances from foreign bson/mongoose copies (e.g. nested deps)
 * so MongoDB queries use the same bson version as the application mongoose driver.
 */
export function normalizeMongoFilterValues<T>(filter: T): T {
  if (filter === null || filter === undefined) {
    return filter;
  }

  if (isObjectIdLike(filter)) {
    if (filter instanceof Types.ObjectId) {
      return filter as T;
    }

    return new Types.ObjectId(filter.toString()) as T;
  }

  if (Array.isArray(filter)) {
    return filter.map((item) => normalizeMongoFilterValues(item)) as T;
  }

  if (typeof filter === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(filter)) {
      result[key] = normalizeMongoFilterValues(value);
    }
    return result as T;
  }

  return filter;
}
