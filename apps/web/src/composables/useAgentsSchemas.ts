import { type JSONSchema7 as JSONSchema } from 'json-schema';
import { type UISchemaElement } from '@jsonforms/core';

type FormSchema = {
  schema: JSONSchema;
  uiSchema: UISchemaElement;
};

type useAgentSchemasReturnType = {
  getAgentSchema: () => JSONSchema;
  getAgentUiSchema: () => UISchemaElement;
  getEditAgentSchema: () => JSONSchema;
  getEditAgentUiSchema: () => UISchemaElement;
  getEditAgentFormSchema: () => FormSchema;
  getAgentFormSchema: () => FormSchema;
};

const agentSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: "object",
  properties: {
    username: {
      type: 'string',
      minLength: 1,
    },
    displayName: {
      type: 'string',
    },
    email: {
      type: 'string',
      format: 'email',
    },
    password: {
      type: 'string',
      minLength: 8,
    },
    thirdPartyAuth: {
      type: 'string',
      default: 'DEFAULT_THIRD_PARTY_AUTH',
    },
    state: {
      type: 'object',
      properties: {
        current: {
          type: 'string',
        },
        lastChangedAt: {
          type: 'string',
          format: 'date-time',
        },
        suspendedAt: {
          type: 'string',
          format: 'date-time',
        },
        suspendedUntil: {
          type: 'string',
          format: 'date-time',
        },
        suspendedReason: {
          type: 'string',
        },
      },
      required: ['current'],
    },
    baseURL: {
      type: 'string',
      default: '/',
    },
    security: {
      type: 'object',
      properties: {
        oldPasswords: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        otpKey: {
          type: 'string',
        },
        u2fKey: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        allowedNetworks: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        changePwdAtNextLogin: {
          type: 'boolean',
          default: false,
        },
        secretKey: {
          type: 'boolean',
        },
      },
    },
    customFields: {
      type: 'object',
      additionalProperties: true,
    },
  },
  required: ['username', 'email', 'password', 'state'],
}

const agentUiSchema = {
  type: 'Group',
  label: 'Agent Information',
  elements: [
    {
      type: 'HorizontalLayout',
      elements: [
        {
          type: 'Control',
          label: 'Username',
          scope: '#/properties/username',
          options: {
            required: true,
          },
        },
        {
          type: 'Control',
          label: 'Display Name',
          scope: '#/properties/displayName',
        },
        {
          type: 'Control',
          label: 'Email',
          scope: '#/properties/email',
          options: {
            required: true,
          },
        },
      ],
    },
    {
      type: 'HorizontalLayout',
      elements: [
        {
          type: 'Control',
          label: 'Mot de passe',
          scope: '#/properties/password',
          options: {
            required: true,
            type: 'password',
          },
        },
        {
          type: 'Control',
          label: 'Actif/Inactif',
          scope: '#/properties/state/properties/current',
          options: {
            required: true,
            suggestion: [
              { value: -1, label: 'Inactif' },
              // { value: 0, label: 'En cours' },
              { value: 1, label: 'Actif' },
            ],
          },
        },
        // {
        //   type: 'Control',
        //   label: 'Third Party Auth',
        //   scope: '#/properties/thirdPartyAuth',
        // },
        // {
        //   type: 'Control',
        //   label: 'Base URL',
        //   scope: '#/properties/baseURL',
        // },
      ],
    },
    // {
    //   type: 'HorizontalLayout',
    //   elements: [
    //     // {
    //     //   type: 'Control',
    //     //   label: 'Last Changed At',
    //     //   scope: '#/properties/state/properties/lastChangedAt',
    //     //   options: {
    //     //     format: 'date',
    //     //     dateFormat: 'dd/MM/yyyy',
    //     //   },
    //     // },
    //     // {
    //     //   type: 'Control',
    //     //   label: 'Suspended At',
    //     //   scope: '#/properties/state/properties/suspendedAt',
    //     //   options: {
    //     //     format: 'date',
    //     //     dateFormat: 'dd/MM/yyyy',
    //     //   },
    //     // },
    //   ],
    // },
    // {
    //   type: 'HorizontalLayout',
    //   elements: [
    //     {
    //       type: 'Control',
    //       label: 'Change Password at Next Login',
    //       scope: '#/properties/security/properties/changePwdAtNextLogin',
    //       options: {
    //         required: false,
    //       },
    //     },
    //     {
    //       type: 'Control',
    //       label: 'Anciens mots de passe',
    //       scope: '#/properties/security/properties/oldPasswords',
    //       options: {
    //         required: false,
    //       },
    //     },
    //     {
    //       type: 'Control',
    //       label: 'Allowed Networks',
    //       scope: '#/properties/security/properties/allowedNetworks',
    //       options: {
    //         required: false,
    //       },
    //     },
    //   ],
    // },
  ],
}

const agentEditSchema = null
const agentEditUiSchema = null

export function useAgentSchemas(): useAgentSchemasReturnType {
  function getAgentSchema(): JSONSchema {
    return agentSchema
  }

  function getAgentUiSchema(): UISchemaElement {
    return agentUiSchema
  }

  function getEditAgentSchema(): JSONSchema {
    return agentEditSchema ?? agentSchema
  }

  function getEditAgentUiSchema(): UISchemaElement {
    return agentEditUiSchema ?? agentUiSchema
  }

  function getEditAgentFormSchema(): FormSchema {
    return {
      schema: getEditAgentSchema(),
      uiSchema: getEditAgentUiSchema(),
    }
  }

  function getAgentFormSchema(): FormSchema {
    return {
      schema: getAgentSchema(),
      uiSchema: getAgentUiSchema(),
    }
  }

  return {
    getAgentSchema,
    getAgentUiSchema,
    getEditAgentSchema,
    getEditAgentUiSchema,
    getEditAgentFormSchema,
    getAgentFormSchema,
  }
}
