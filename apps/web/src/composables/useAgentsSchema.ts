import type { ComputedRef, Ref } from 'vue'

const PASSWORD_LAYOUT = {
  type: 'HorizontalLayout',
  elements: [
    {
      type: 'Control',
      label: 'Mot de passe',
      scope: '#/properties/password',
      options: {
        format: 'password',
      },
    },
    {
      type: 'Control',
      label: 'Confirmation du mot de passe',
      scope: '#/properties/password_confirm',
      options: {
        format: 'password',
      },
    },
  ],
}

export default function useAgentsSchema(showPasswordFields: Ref<boolean> | ComputedRef<boolean> = ref(true)) {
  const baseSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      username: {
        type: 'string',
        description: "Nom d'utilisateur",
      },
      displayName: {
        type: 'string',
        description: 'Nom affiché',
      },
      password: {
        type: 'string',
        description: 'Mot de passe',
      },
      password_confirm: {
        type: 'string',
        description: 'Confirmation du mot de passe',
      },
      email: {
        type: 'string',
        description: 'Adresse e-mail',
      },
      roles: {
        type: 'array',
        description: 'Rôles',
        items: {
          type: 'string',
        },
      },
      thirdPartyAuth: {
        type: 'string',
        default: 'local',
        description: 'Authentification via un tiers',
      },
      'state.current': {
        type: 'number',
        default: 1,
        description: 'État actuel',
      },
      baseURL: {
        type: 'string',
        description: 'URL de base',
      },
      allowedNetworks: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    },
    required: ['username', 'email'],
  }

  const baseElements = [
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
          label: 'Email',
          scope: '#/properties/email',
          options: {
            required: true,
          },
        },
        {
          type: 'Control',
          label: 'Rôles',
          scope: '#/properties/roles',
          options: {
            required: true,
            minLength: 3,
            api: {
              url: '/core/roles/list',
              itemsPath: 'data',
              labelKey: 'displayName',
              valueKey: 'name',
              params: {
                excludeInternal: 'true',
              },
              headers: {
                accept: 'application/json',
              },
            },
          },
        },
      ],
    },
    {
      type: 'HorizontalLayout',
      elements: [
        {
          type: 'Control',
          label: 'Third Party Auth',
          scope: '#/properties/thirdPartyAuth',
          options: {
            suggestion: ['local'],
          },
        },
        {
          type: 'Control',
          label: 'State',
          scope: '#/properties/state.current',
          options: {
            suggestion: [
              { label: 'Désactivé', value: -1 },
              { label: 'Activé', value: 1 },
            ],
          },
        },
      ],
    },
    {
      type: 'HorizontalLayout',
      elements: [
        {
          type: 'Control',
          label: 'URL de base',
          scope: '#/properties/baseURL',
        },
      ],
    },
    {
      type: 'Control',
      label: 'Réseaux autorisés',
      scope: '#/properties/allowedNetworks',
      options: {
        format: 'networkList',
        placeholder: 'ex. 192.168.1.0/24, 10.0.0.1-10.0.0.5',
      },
    },
  ]

  const schema = computed(() => {
    if (unref(showPasswordFields)) {
      return baseSchema
    }

    const { password: _password, password_confirm: _passwordConfirm, ...properties } = baseSchema.properties
    return {
      ...baseSchema,
      properties,
    }
  })

  const uischema = computed(() => {
    const elements = unref(showPasswordFields)
      ? [baseElements[0], PASSWORD_LAYOUT, ...baseElements.slice(1)]
      : baseElements

    return {
      type: 'Group',
      elements,
    }
  })

  return { schema, uischema }
}
