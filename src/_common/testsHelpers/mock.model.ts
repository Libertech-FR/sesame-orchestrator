import { Model } from 'mongoose';
/**
 * Mock a model
 * @param model
 * @param stub
 * @param updatedStub
 */

export function createMockModel<T>(model: Model<T>, stub, updatedStub?): Model<T> {
  model.countDocuments = jest.fn().mockImplementationOnce(() => ({
    exec: jest.fn().mockResolvedValueOnce(1),
  }));

  model.find = jest.fn().mockImplementationOnce(() => ({
    exec: jest.fn().mockResolvedValueOnce([stub]),
  }));

  model.findOne = jest.fn().mockImplementationOnce(() => ({
    exec: jest.fn().mockResolvedValueOnce(stub),
  }));

  model.findById = jest.fn().mockImplementationOnce(() => ({
    exec: jest.fn().mockResolvedValueOnce(stub),
  }));

  model.findByIdAndUpdate = jest.fn().mockImplementationOnce(() => ({
    exec: jest.fn().mockResolvedValueOnce(updatedStub ? updatedStub : stub),
  }));

  model.findByIdAndDelete = jest.fn().mockImplementationOnce(() => ({
    exec: jest.fn().mockResolvedValueOnce(stub),
  }));

  if (!model.prototype.save) {
    model.prototype.save = jest.fn();
  }

  jest.spyOn(model.prototype, 'save').mockImplementationOnce(() => Promise.resolve(stub));

  return model;
}
