import { additionalFieldsPartDto } from '~/management/identities/_dto/_parts/additionalFields.dto';

export const additionalFieldsPartDtoStub = (): additionalFieldsPartDto => {
  return {
    objectClasses: ['supann'],
    attributes: {
      supann: {
        supannEmpId: '12345',
        supannCivilite: 'Mr',
        supannBirthName: 'Doe',
      },
    },
  };
};
