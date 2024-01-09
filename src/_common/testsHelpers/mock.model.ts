import { Model } from 'mongoose';

export function createMockModel<T>(model: Model<T>, stub, updatedStub?): Model<T> {
  model.countDocuments = jest.fn().mockImplementationOnce(() => ({
    exec: jest.fn().mockResolvedValueOnce(1),
  }));

  model.find = jest.fn().mockImplementationOnce(() => ({
    exec: jest.fn().mockResolvedValueOnce([stub]),
  }));

  model.findById = jest.fn().mockImplementationOnce(() => ({
    exec: jest.fn().mockResolvedValueOnce(stub),
  }));

  model.findByIdAndUpdate = jest.fn().mockImplementationOnce(() => ({
    exec: jest.fn().mockResolvedValueOnce(updatedStub),
  }));

  model.findByIdAndDelete = jest.fn().mockImplementationOnce(() => ({
    exec: jest.fn().mockResolvedValueOnce(stub),
  }));

  model.prototype = jest.fn().mockImplementationOnce(() => ({
    save: jest.fn().mockResolvedValueOnce(stub),
  }));

  return model;
}
