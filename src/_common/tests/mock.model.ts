import { NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
/**
 * Mock a model
 * @param model
 * @param stub
 * @param updatedStub
 * @param shouldThrowError
 */

export function createMockModel<T>(model: Model<T>, stub, updatedStub?, shouldThrowError = false): Model<T> {
  model.countDocuments = jest.fn().mockImplementationOnce(() => ({
    exec: shouldThrowError ? jest.fn().mockResolvedValueOnce(1) : jest.fn().mockResolvedValueOnce(0),
  }));

  const throwOrResolve = (returnValue) =>
    jest.fn().mockImplementationOnce(() => ({
      exec: shouldThrowError
        ? jest.fn().mockResolvedValueOnce(returnValue)
        : jest.fn().mockRejectedValueOnce(new NotFoundException()),
    }));

  model.find = throwOrResolve([stub]);
  model.findOne = throwOrResolve(stub);
  model.findById = throwOrResolve(stub);
  model.findByIdAndUpdate = throwOrResolve(updatedStub ? updatedStub : stub);
  model.findByIdAndDelete = throwOrResolve(stub);

  if (!model.prototype.save) {
    model.prototype.save = jest.fn();
  }

  jest
    .spyOn(model.prototype, 'save')
    .mockImplementationOnce(() => (shouldThrowError ? Promise.reject(new Error('Error')) : Promise.resolve(stub)));

  return model;
}
