const validSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    $schema: {
      type: 'string',
      errorMessage: "Le champ '$schema' doit être une chaîne de caractères.",
    },
    type: {
      type: 'string',
      const: 'object',
      errorMessage: "Le champ 'type' doit être 'object'.",
    },
    properties: {
      type: 'object',
      patternProperties: {
        '^.+$': {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['string', 'integer', 'number', 'boolean', 'array', 'object', 'date'],
              errorMessage: "Chaque propriété doit avoir un 'type' de 'string'.",
            },
            description: {
              type: 'string',
              errorMessage: "La 'description' doit être une chaîne de caractères.",
            },
            format: {
              type: 'string',
              enum: ['date', 'email'],
              errorMessage: "Le 'format' doit être 'date' ou 'email'.",
            },
            items: {
              type: 'object',
              errorMessage: "Le champ 'required' doit être un booléen.",
            },
          },
          required: ['type'],
          additionalProperties: false,
          errorMessage: {
            required: "Le champ 'type' est requis pour chaque propriété.",
            additionalProperties: 'Propriétés supplémentaires non autorisées.',
          },
        },
      },
      additionalProperties: false,
      errorMessage: "Propriétés supplémentaires non autorisées dans 'properties'.",
    },
    required: {
      type: 'array',
      items: {
        type: 'string',
      },
      errorMessage: "Le champ 'required' doit être un tableau de chaînes de caractères.",
    },
  },
  required: ['type'],
  additionalProperties: false,
  errorMessage: {
    required: "Le champ 'type' est requis.",
    additionalProperties: 'Propriétés supplémentaires non autorisées au niveau racine.',
  },
};

export default validSchema;
