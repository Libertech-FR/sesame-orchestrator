export default function useAgentsSchema() {
  const schema = ref({
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
        // description: 'Adresses IPv4, notation CIDR (ex. 192.168.1.0/24) ou plages avec tiret (ex. 10.0.0.1-10.0.0.5). Laisser vide pour autoriser toutes les adresses IP.',
        items: {
          type: 'string',
        },
      },
    },
    required: ['username', 'email'],
  })

  const uischema = ref({
    type: 'Group',
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
    ],
  })

  return { schema, uischema }
}
