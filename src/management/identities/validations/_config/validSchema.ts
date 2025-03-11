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
              enum: ['date', 'email','number','time','date-time','duration','uri','uri-reference','hostname','ipv4','ipv6','regex','uuid'],
              errorMessage: "Format invalide",
            },
            contains: {
              type: 'object',
              errorMessage: "Le champ 'required' doit être un booléen.",
            },
            items: {
              type: 'object',
              errorMessage: "Le champ 'required' doit être un booléen.",
            },
            maxItems: {
              type: 'integer',
              errorMessage: "Le nombre maximal d'éléments 'maxItems' doit être un entier.",
            },
            minItems: {
              type: 'integer',
              errorMessage: "Le nombre minimal d'éléments 'minItems' doit être un entier.",
            },
            maxLength: {
              type: 'integer',
              errorMessage: "La longueur maximale 'maxLength' doit être un entier.",
            },
            minLength: {
              type: 'integer',
              errorMessage: "La longueur minimale 'minLength' doit être un entier.",
            },
            maxDate: {
              type: 'string',
              errorMessage: "La date maximale 'maxDate' doit être une date valide.",
            },
            minDate: {
              type: 'string',
              errorMessage: "La date minimale 'minDate' doit être une date valide.",
            },
            max: {
              type: ['number', 'string'],
              errorMessage: "La valeur maximale 'max' doit être un nombre ou une date.",
            },
            min: {
              type: ['number', 'string'],
              errorMessage: "La valeur minimale 'min' doit être un nombre ou une date.",
            },
            exclusiveMinimum: {
              type: 'number',
              errorMessage: "La valeur doit être strictement supérieure à 'exclusiveMinimum'.",
            },
            exclusiveMaximum: {
              type: 'number',
              errorMessage: "La valeur doit être strictement inférieure à 'exclusiveMaximum'.",
            },
            pattern: {
              type: 'string',
              errorMessage: "Le motif 'pattern' doit correspondre à une expression régulière valide.",
            },
            noUnknown: {
              type: 'boolean',
              errorMessage: "L'option 'noUnknown' doit être un booléen.",
            },
            trim: {
              type: 'boolean',
              errorMessage: "L'option 'trim' doit être un booléen.",
            },
            uppercase: {
              type: 'boolean',
              errorMessage: "L'option 'uppercase' doit être un booléen.",
            },
            lowercase: {
              type: 'boolean',
              errorMessage: "L'option 'lowercase' doit être un booléen.",
            },
            positive: {
              type: 'boolean',
              errorMessage: "L'option 'positive' doit être un booléen.",
            },
            negative: {
              type: 'boolean',
              errorMessage: "L'option 'negative' doit être un booléen.",
            },
            truncate: {
              type: 'boolean',
              errorMessage: "L'option 'truncate' doit être un booléen.",
            },
            round: {
              type: 'boolean',
              errorMessage: "L'option 'round' doit être un booléen.",
            },
            constantCase: {
              type: 'boolean',
              errorMessage: "L'option 'constantCase' doit être un booléen.",
            },
            camelCase: {
              type: 'boolean',
              errorMessage: "L'option 'camelCase' doit être un booléen.",
            }
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
