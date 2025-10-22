export default function useAgentsSchema() {
  const schema = ref({
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
      "username": {
        "type": "string",
        "description": "Nom d'utilisateur"
      },
      "displayName": {
        "type": "string",
        "description": "Nom affiché"
      },
      "password": {
        "type": "string",
        "description": "Mot de passe"
      },
      "email": {
        "type": "string",
        "description": "Adresse e-mail"
      },
      "thirdPartyAuth": {
        "type": "string",
        "default": "local",
        "description": "Authentification via un tiers"
      },
      "state.current": {
        "type": "number",
        "default": 1,
        "description": "État actuel"
      },
      "baseURL": {
        "type": "string",
        "description": "URL de base"
      },
      "allowedNetworks": {
        "type": "array",
        "description": "Réseaux autorisés",
        "items": {
          "type": "string"
        }
      },
    },
    "required": ["username", "email"]
  })

  const uischema = ref({
    "type": "Group",
    "elements": [
      {
        "type": "HorizontalLayout",
        "elements": [
          {
            "type": "Control",
            "label": "Username",
            "scope": "#/properties/username",
            "options": {
              "required": true
            }
          },
          {
            "type": "Control",
            "label": "Display Name",
            "scope": "#/properties/displayName",
            "options": {
              "required": true
            }
          },
        ]
      },
      {
        "type": "HorizontalLayout",
        "elements": [
          {
            "type": "Control",
            "label": "Password",
            "scope": "#/properties/password",
            "options": {
              "format": "password"
            }
          },
          {
            "type": "Control",
            "label": "Email",
            "scope": "#/properties/email",
            "options": {
              "required": true
            }
          },
        ]
      },
      {
        "type": "HorizontalLayout",
        "elements": [
          {
            "type": "Control",
            "label": "Third Party Auth",
            "scope": "#/properties/thirdPartyAuth",
            "options": {
              "suggestion": [
                "local"
              ]
            }
          },
          {
            "type": "Control",
            "label": "State",
            "scope": "#/properties/state.current",
            "options": {
              "suggestion": [
                { label: 'Désactivé', value: -1 },
                { label: 'Activé', value: 1 },
              ]
            }
          }
        ]
      },
      {
        "type": "HorizontalLayout",
        "elements": [
          {
            "type": "Control",
            "label": "Base URL",
            "scope": "#/properties/baseURL"
          },
          {
            "type": "Control",
            "label": "Allowed Networks",
            "scope": "#/properties/allowedNetworks",
            "options": {
              "detail": "List of networks allowed to access the agent"
            }
          }
        ]
      },
    ]
  })

  return { schema, uischema }
}
