export const AC_ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
]

export default function useRolesSchema() {
  const schema = ref({
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Nom du rôle"
      },
      "displayName": {
        "type": "string",
        "description": "Nom affiché"
      },
      "description": {
        "type": "string",
        "description": "Description"
      },
      "access": {
        "type": "array",
        "description": "Permissions",
        "items": {
          "type": "object",
          "properties": {
            "resource": {
              "type": "string"
            },
            "action": {
              "type": "array",
              "items": {
                "type": "string",
                "enum": AC_ACTIONS
              },
            }
          }
        }
      },
    },
    "required": ["name", "displayName"]
  })

  const uischema = ref({
    "type": "Group",
    "elements": [
      {
        "type": "HorizontalLayout",
        "elements": [
          {
            "type": "Control",
            "label": "Name",
            "scope": "#/properties/name",
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
            "label": "Description",
            "scope": "#/properties/description"
          },
        ]
      },
      {
        "type": "HorizontalLayout",
        "elements": [
          {
            "type": "Control",
            "label": "Access",
            "scope": "#/properties/access",
            "options": {
              "format": "array-table",
              "elements": [
                {
                  "type": "Control",
                  "label": "Ressource",
                  "scope": "#/properties/resource",
                  "options": {
                    "api": {
                      "url": "/core/roles/resources",
                      "itemsPath": "data",
                      "labelKey": "resource",
                      "valueKey": "resource",
                      "headers": {
                        "accept": "application/json"
                      }
                    }
                  }
                },
                {
                  "type": "Control",
                  "label": "ACL",
                  "scope": "#/properties/action",
                  "options": {
                    "suggestion": AC_ACTIONS
                  }
                }
              ]
            }
          },
        ]
      },
    ]
  })

  return { schema, uischema }
}
