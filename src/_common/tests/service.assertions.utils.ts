import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { FilterQuery, Model, ProjectionType, QueryOptions, Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';

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

export async function findAndCountErrorAssertions<T>(
  service: AbstractServiceSchema,
  errorModel: Model<T>,
  filter: FilterQuery<T>,
  projection: ProjectionType<T>,
  options: QueryOptions<T>,
) {
  jest.spyOn(service, 'findAndCount').mockResolvedValueOnce([[], 0]);
  const [result, count] = await service.findAndCount(filter, projection, options);
  expect(count).toBe(0);
  expect(result).toStrictEqual([]);
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

export async function findByIdErrorAssertions<T>(
  service: AbstractServiceSchema,
  errorModel: Model<T>,
  _id: Types.ObjectId,
  projection: ProjectionType<T>,
  options: QueryOptions<T>,
) {
  jest.spyOn(service, 'findById').mockRejectedValueOnce(new NotFoundException());
  await expect(service.findById(_id, projection, options)).rejects.toThrow(NotFoundException);
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

export async function findOneErrorAssertions<T>(
  service: AbstractServiceSchema,
  errorModel: Model<T>,
  filter: FilterQuery<T>,
  projection: ProjectionType<T>,
  options: QueryOptions<T>,
) {
  jest.spyOn(service, 'findOne').mockRejectedValueOnce(new NotFoundException());
  expect(await service.findOne(filter, projection, options)).rejects.toThrow(NotFoundException);
}

export async function createAssertions<T>(service: AbstractServiceSchema, model: Model<T>, newData, expectedData) {
  // Call the service method
  const result = await service.create(newData);

  // Assert the results
  expect(model.prototype.save).toHaveBeenCalled();
  expect(result).toEqual(expectedData);
}

export async function createErrorAssertions<T>(service: AbstractServiceSchema, errorModel: Model<T>, newData) {
  jest.spyOn(service, 'create').mockRejectedValueOnce(new Error());
  const result = await service.create(newData);
  expect(errorModel.prototype.save).toHaveBeenCalled();
  expect(result).toThrow(Error);
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

export async function updateErrorAssertions<T>(
  service: AbstractServiceSchema,
  errorModel: Model<T>,
  _id: Types.ObjectId,
  updateData,
  options: QueryOptions<T> & { rawResult: true },
) {
  jest.spyOn(service, 'update').mockRejectedValueOnce(new NotFoundException());
  const result = await service.update(_id, updateData, options);
  expect(result).toThrow(NotFoundException);
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

export async function deleteErrorAssertions<T>(
  service: AbstractServiceSchema,
  errorModel: Model<T>,
  _id: Types.ObjectId,
  options: QueryOptions<T>,
) {
  jest.spyOn(service, 'delete').mockRejectedValueOnce(new NotFoundException());
  const result = await service.delete(_id, options);
  expect(result).toThrow(NotFoundException);
}
