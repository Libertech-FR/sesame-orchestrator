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

  model.find = shouldThrowError
    ? jest.fn().mockImplementationOnce(() => {
        throw new NotFoundException();
      })
    : jest.fn().mockImplementationOnce(() => ({
        exec: jest.fn().mockResolvedValueOnce([stub]),
      }));

  model.findOne = shouldThrowError
    ? jest.fn().mockImplementationOnce(() => {
        throw new NotFoundException();
      })
    : jest.fn().mockImplementationOnce(() => ({
        exec: jest.fn().mockResolvedValueOnce(stub),
      }));

  model.findById = shouldThrowError
    ? jest.fn().mockImplementationOnce(() => {
        throw new NotFoundException();
      })
    : jest.fn().mockImplementationOnce(() => ({
        exec: jest.fn().mockResolvedValueOnce(stub),
      }));

  model.findByIdAndUpdate = shouldThrowError
    ? jest.fn().mockImplementationOnce(() => {
        throw new NotFoundException();
      })
    : jest.fn().mockImplementationOnce(() => ({
        exec: jest.fn().mockResolvedValueOnce(updatedStub ? updatedStub : stub),
      }));

  model.findByIdAndDelete = shouldThrowError
    ? jest.fn().mockImplementationOnce(() => {
        throw new NotFoundException();
      })
    : jest.fn().mockImplementationOnce(() => ({
        exec: jest.fn().mockResolvedValueOnce(stub),
      }));

  if (!model.prototype.save) {
    model.prototype.save = shouldThrowError ? jest.fn() : jest.fn(() => Promise.reject(new Error('Error')));
  }

  jest
    .spyOn(model.prototype, 'save')
    .mockImplementationOnce(() => (shouldThrowError ? Promise.resolve(stub) : Promise.reject(new Error('Error'))));

  return model;
}
