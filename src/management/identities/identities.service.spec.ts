// import { DeleteResult } from 'mongodb';
// import { Test, TestingModule } from '@nestjs/testing';
// import { IdentitiesService } from './identities.service';
// import { getModelToken } from '@nestjs/mongoose';
// import { Identities } from './_schemas/identities.schema';
// import { Model, Types } from 'mongoose';

// describe('IdentitiesService', () => {
//   let service: IdentitiesService;
//   let model: Model<Identities>;
//   const _id = new Types.ObjectId();
//   const date = new Date();
//   const mockIdentities: Identities = {
//     _id,
//     metadata: {
//       createdAt: date,
//       createdBy: 'console',
//       lastUpdatedAt: date,
//       lastUpdatedBy: 'console',
//     },
//     state: -1,
//     lifecycle: 1,
//     inetOrgPerson: {
//       cn: 'test',
//       sn: 'test',
//       uid: 'test',
//     },
//     additionalFields: {
//       objectClasses: ['supann'],
//       attributes: {
//         supann: { supannEmpId: 'test' },
//       },
//     },
//   };

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         IdentitiesService,
//         {
//           provide: getModelToken(Identities.name),
//           useValue: Model,
//         },
//       ],
//     }).compile();
//     service = module.get<IdentitiesService>(IdentitiesService);
//     model = module.get<Model<Identities>>(getModelToken(Identities.name));
//   });

//   describe('create', () => {
//     it('should create a new record', async () => {
//       const createTest = {};
//       jest.spyOn(model, 'create').mockImplementationOnce(() => Promise.resolve(mockIdentities));
//       const result = await service.create(createTest);
//       expect(result).toEqual(mockIdentities);
//     });
//   });

//   describe('search', () => {
//     it('should return an array of records and total count', async () => {
//       const expected = [mockIdentities];
//       const total = 1;
//       jest.spyOn(model, 'countDocuments').mockResolvedValueOnce(total);
//       jest.spyOn(model, 'find').mockResolvedValueOnce(expected);
//       const [result, resultTotal] = await service.search();
//       expect(result).toEqual(expected);
//       expect(resultTotal).toEqual(total);
//     });

//     it('should return an empty array if no records are found', async () => {
//       const expected = [];
//       const total = 0;
//       jest.spyOn(model, 'countDocuments').mockResolvedValueOnce(total);
//       jest.spyOn(model, 'find').mockResolvedValueOnce(expected);
//       const [result, resultTotal] = await service.search();
//       expect(result).toEqual(expected);
//       expect(resultTotal).toEqual(total);
//     });
//   });

//   describe('read', () => {
//     it('should return a Identities record by ID', async () => {
//       const expected = mockIdentities;
//       jest.spyOn(model, 'findById').mockResolvedValueOnce(expected);
//       const result = await service.read(_id.toString());
//       expect(result).toEqual(expected);
//     });

//     it('should return null if Identities record is not found', async () => {
//       const expected = null;
//       jest.spyOn(model, 'findById').mockResolvedValueOnce(expected);
//       const result = await service.read('123');
//       expect(result).toEqual(expected);
//     });
//   });

//   describe('update', () => {
//     it('should update a Identities record by ID with metadata', async () => {
//       const identitiesDto = { info: { key: 'updated value' } };
//       const newObject = { ...mockIdentities };
//       const expected = newObject.info.push(identitiesDto.info);
//       jest.spyOn(model, 'findByIdAndUpdate').mockResolvedValueOnce(expected);
//       const result = await service.update(_id.toString(), identitiesDto);
//       expect(result).toEqual(expected);
//     });
//   });

//   describe('remove', () => {
//     it('should remove a Identities record by ID', async () => {
//       const id = '123';
//       const deleteResult: DeleteResult = { acknowledged: true, deletedCount: 1 };
//       jest.spyOn(model, 'deleteOne').mockResolvedValueOnce(deleteResult);
//       const result = await service.remove(id);
//       expect(result).toEqual(deleteResult);
//     });
//   });
// });
