export const validSchemaStub = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    supannEmpId: {
      type: 'string',
      description: 'Employee ID',
    },
    supannCivilite: {
      type: 'string',
      description: 'Title (Mr, Ms, etc.)',
    },
    supannBirthName: {
      type: 'string',
      description: 'Birth name',
    },
  },
  required: ['supannEmpId', 'supannCivilite'],
};

export const invalidSchemaStub = {
  type: 'invalid',
};

export const validAdditionalFieldsStub = () => {
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

//
export const invalidRequiredAdditionalFieldsStub = () => {
  return {
    objectClasses: ['supann'],
    attributes: {
      supann: {
        supannEmpId: '12345',
        supannBirthName: 'Doe',
      },
    },
  };
};

export const invalidTypeAdditionalFieldsStub = () => {
  return {
    objectClasses: ['supann'],
    attributes: {
      supann: {
        supannEmpId: '12345',
        supannCivilite: 'Mr',
        supannBirthName: 123,
      },
    },
  };
};

export const missingAttributeAdditionalFieldsStub = () => {
  return {
    objectClasses: ['class1'],
    attributes: {},
  };
};

export const invalidObjectClassAdditionalFieldsStub = () => {
  return {
    objectClasses: ['testClass'],
    attributes: { supann: { test: 'test' } },
  };
};
