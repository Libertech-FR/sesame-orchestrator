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

  model.find = jest.fn().mockImplementationOnce(() => ({
    exec: shouldThrowError ? jest.fn().mockResolvedValueOnce([stub]) : jest.fn().mockResolvedValueOnce([]),
  }));

  model.findOne = jest.fn().mockImplementationOnce(() => ({
    exec: shouldThrowError
      ? jest.fn().mockResolvedValueOnce(stub)
      : jest.fn(() => Promise.reject(new NotFoundException())),
  }));

  model.findById = jest.fn().mockImplementationOnce(() => ({
    exec: shouldThrowError
      ? jest.fn().mockResolvedValueOnce(stub)
      : jest.fn(() => Promise.reject(new NotFoundException())),
  }));

  model.findByIdAndUpdate = jest.fn().mockImplementationOnce(() => ({
    exec: shouldThrowError
      ? jest.fn().mockResolvedValueOnce(updatedStub ? updatedStub : stub)
      : jest.fn(() => Promise.reject(new NotFoundException())),
  }));

  model.findByIdAndDelete = jest.fn().mockImplementationOnce(() => ({
    exec: shouldThrowError
      ? jest.fn().mockResolvedValueOnce(stub)
      : jest.fn(() => Promise.reject(new NotFoundException())),
  }));

  if (!model.prototype.save) {
    model.prototype.save = shouldThrowError ? jest.fn() : jest.fn(() => Promise.reject(new Error('Error')));
  }

  jest
    .spyOn(model.prototype, 'save')
    .mockImplementationOnce(() => (shouldThrowError ? Promise.resolve(stub) : Promise.reject(new Error('Error'))));

  return model;
}
