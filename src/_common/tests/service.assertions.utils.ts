import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { FilterQuery, Model, ProjectionType, QueryOptions, Types } from 'mongoose';

export async function findAndCountAssertions<T>(
  service: AbstractServiceSchema,
  model: Model<T>,
  filter: FilterQuery<T>,
  projection: ProjectionType<T>,
  options: QueryOptions<T>,
  expectedData,
) {
  // Call the service method
  const [result, count] = await service.findAndCount(filter, projection, options);

  // Assert the results
  expect(model.countDocuments).toHaveBeenCalledWith(filter);
  expect(model.find).toHaveBeenCalledWith(filter, projection, options);
  expect(count).toBe(1);
  expect(result).toStrictEqual([expectedData]);
}

export async function findByIdAssertions<T>(
  service: AbstractServiceSchema,
  model: Model<T>,
  _id: Types.ObjectId,
  projection: ProjectionType<T>,
  options: QueryOptions<T>,
  expectedData,
) {
  // Call the service method
  const result = await service.findById(_id, projection, options);

  // Assert the results
  expect(model.findById).toHaveBeenCalledWith(_id, projection, options);
  expect(result).toStrictEqual(expectedData);
}

export async function findOneAssertions<T>(
  service: AbstractServiceSchema,
  model: Model<T>,
  filter: FilterQuery<T>,
  projection: ProjectionType<T>,
  options: QueryOptions<T>,
  expectedData,
) {
  // Call the service method
  const result = await service.findOne(filter, projection, options);

  // Assert the results
  expect(model.findOne).toHaveBeenCalledWith(filter, projection, options);
  expect(result).toStrictEqual(expectedData);
}

export async function createAssertions<T>(service: AbstractServiceSchema, model: Model<T>, newData, expectedData) {
  // Call the service method
  const result = await service.create(newData);

  // Assert the results
  expect(model.prototype.save).toHaveBeenCalled();
  expect(result).toEqual(expectedData);
}

export async function updateAssertions<T>(
  service: AbstractServiceSchema,
  model: Model<T>,
  _id: Types.ObjectId,
  updateData,
  options: QueryOptions<T> & { rawResult: true },
  expectedData,
) {
  // Call the service method
  const result = await service.update(_id, updateData, options);

  // Assert the results
  expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
    { _id },
    expect.objectContaining(updateData),
    expect.objectContaining(options),
  );
  expect(result).toStrictEqual(expectedData);
}

export async function deleteAssertions<T>(
  service: AbstractServiceSchema,
  model: Model<T>,
  _id: Types.ObjectId,
  options: QueryOptions<T>,
  expectedData,
) {
  // Call the service method
  const result = await service.delete(_id, options);

  // Assert the results
  expect(model.findByIdAndDelete).toHaveBeenCalledWith({ _id }, options);
  expect(result).toStrictEqual(expectedData);
}
