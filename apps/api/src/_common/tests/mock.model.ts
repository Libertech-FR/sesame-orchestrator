import { NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
/**
 * Mock a model
 * @param model
 * @param stub
 * @param updatedStub
 * @param shouldThrowError
 */

export function createMockModel<T>(model: Model<T>, stub, updatedStub?): Model<T> {
  // Mock the model methods
  // First call resolves, second call rejects
  const throwOrResolve = (resolvedValue, rejectedValue) =>
    jest
      .fn()
      .mockImplementationOnce(() => ({
        exec: jest.fn().mockResolvedValueOnce(resolvedValue),
      }))
      .mockImplementationOnce(() => ({
        exec: jest.fn().mockRejectedValueOnce(rejectedValue),
      }));

  model.findOne = throwOrResolve(stub, new NotFoundException());
  model.findById = throwOrResolve(stub, new NotFoundException());
  model.findByIdAndUpdate = throwOrResolve(updatedStub ? updatedStub : stub, new NotFoundException());
  model.findByIdAndDelete = throwOrResolve(stub, new NotFoundException());

  // Mock the model methods
  // First call resolves, second call resolves
  model.countDocuments = jest
    .fn()
    .mockImplementationOnce(() => ({
      exec: jest.fn().mockResolvedValueOnce(1),
    }))
    .mockImplementationOnce(() => ({
      exec: jest.fn().mockResolvedValueOnce(0),
    }));

  // Mock the model methods
  // First call resolves, second call resolves
  model.find = jest
    .fn()
    .mockImplementationOnce(() => ({
      exec: jest.fn().mockResolvedValueOnce([stub]),
    }))
    .mockImplementationOnce(() => ({
      exec: jest.fn().mockResolvedValueOnce([]),
    }));

  if (!model.prototype.save) {
    model.prototype.save = jest.fn();
  }

  jest
    .spyOn(model.prototype, 'save')
    .mockImplementationOnce(() => Promise.resolve(stub))
    .mockImplementationOnce(() => Promise.reject(new Error('Error')));

  return model;
}
