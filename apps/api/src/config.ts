import { MongooseModuleOptions } from '@nestjs/mongoose';
import { RedisOptions } from 'ioredis';
import { HelmetOptions } from 'helmet';
import { SwaggerCustomOptions } from '@nestjs/swagger';
import Joi from 'joi';
import { IAuthModuleOptions } from '@nestjs/passport';
import { JwtModuleOptions } from '@nestjs/jwt';
import { StorageManagerConfig } from '@tacxou/nestjs_module_factorydrive';
import { AmazonWebServicesS3StorageConfig } from '@tacxou/nestjs_module_factorydrive-s3';
import { HttpModuleOptions } from '@nestjs/axios';
import path, { join } from 'path';
import { CronExpression } from '@nestjs/schedule';
import { LDAP_IMPORT_DEFAULT_DEPARTMENT, LDAP_IMPORT_EMPLOYEE_TYPE } from './core/ldap/ldap.constants';

/**
 * Répertoire de base de l'application API
 * En environnement Docker: /data/apps/api
 * En développement local: le répertoire du projet
 */
const API_ROOT_DIR = process.env['SESAME_API_ROOT_DIR'] || process.cwd();

/**
 * Schéma de validation Joi pour les variables d'environnement
 *
 * @description Définit et valide toutes les variables d'environnement requises et optionnelles
 * pour l'application. Fournit des valeurs par défaut et des règles de validation strictes.
 *
 * @example
 * // Utilisation avec ConfigModule
 * ConfigModule.forRoot({
 *   validationSchema: validationSchema,
 * })
 */
export const validationSchema = Joi.object({
  LANG: Joi.string().default('en'),

  SESAME_LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),

  SESAME_NAME_QUEUE: Joi.string().default('sesame'),

  SESAME_HTTPS_ENABLED: Joi.string().valid('0', '1', 'true', 'false', 'on', 'off').default('false'),

  SESAME_HTTPS_PATH_KEY: Joi.string()
    .when('SESAME_HTTPS_ENABLED', {
      is: /yes|1|on|true/i,
      then: Joi.required(),
      otherwise: Joi.optional().allow(''),
    })
    .default(''),

  SESAME_HTTPS_PATH_CERT: Joi.string()
    .when('SESAME_HTTPS_ENABLED', {
      is: /yes|1|on|true/i,
      then: Joi.required(),
      otherwise: Joi.optional().allow(''),
    })
    .default(''),

  SESAME_REDIS_URI: Joi.string().uri().default('redis://localhost:6379/0'),

  SESAME_MONGO_URI: Joi.string().uri().default('mongodb://localhost:27017/backend'),

  SESAME_AXIOS_TIMEOUT: Joi.number().integer().min(1).default(5000),

  SESAME_AXIOS_MAX_REDIRECTS: Joi.number().integer().min(0).default(5),

  SESAME_JWT_SECRET: Joi.string().required(),

  SESAME_SMTP_SERVER: Joi.string().hostname().required(),

  SESAME_SMTP_PORT: Joi.number().integer().min(1).max(65535).default(25),

  SESAME_MDP_SENDER: Joi.string().email().default(''),

  SESAME_FRONT_MDP: Joi.string().uri().required(),

  SESAME_RESET_PWD_MAIL: Joi.string().default(''),

  SESAME_RESET_PWD_MOBILE: Joi.string().default(''),

  SESAME_LIFECYCLE_TRIGGER_CRON: Joi.string()
    .pattern(
      /^(\*|([0-5]?\d))(\/\d+)? (\*|([01]?\d|2[0-3]))(\/\d+)? (\*|([01]?\d|2[0-9]|3[01]))(\/\d+)? (\*|(1[0-2]|0?[1-9]))(\/\d+)? (\*|([0-6]))(\/\d+)?$/,
    )
    .default('*/5 * * * *'),

  SESAME_SMPP_SERVER: Joi.string().hostname().default(''),

  SESAME_SMPP_SYSTEMID: Joi.string().default(''),

  SESAME_SMPP_PASSWORD: Joi.string().default(''),

  SESAME_SMPP_SOURCEADDR: Joi.string().default(''),

  SESAME_SMPP_REGIONCODE: Joi.string().default('FR'),

  SESAME_CRON_HANDLER_EXPRESSION: Joi.string()
    .pattern(
      /^(\*|([0-5]?\d))(\/\d+)? (\*|([01]?\d|2[0-3]))(\/\d+)? (\*|([01]?\d|2[0-9]|3[01]))(\/\d+)? (\*|(1[0-2]|0?[1-9]))(\/\d+)? (\*|([0-6]))(\/\d+)?$/,
    )
    .default(CronExpression.EVERY_HOUR),

  SESAME_CRON_LOG_DIRECTORY: Joi.string().default(path.join(process.cwd(), 'logs', 'handlers')),

  SESAME_CRON_LOG_ROTATE_MAX_SIZE_BYTES: Joi.number()
    .integer()
    .min(1)
    .default(10 * 1024 * 1024),

  SESAME_CRON_LOG_ROTATE_MAX_FILES: Joi.number().integer().min(1).default(5),

  SESAME_IDENTITY_DOUBLON_SEARCH_ATTRIBUTES: Joi.string().default(''),

  /**
   * Mode de synchronisation des identités après une modification.
   * - `manual` (défaut) : l'identité passe en TO_VALIDATE et attend une validation puis une synchronisation manuelle.
   * - `auto` : l'identité passe directement en TO_SYNC et la synchronisation vers les backends est déclenchée.
   */
  SESAME_IDENTITY_SYNC_MODE: Joi.string().valid('manual', 'auto').default('manual'),

  /**
   * Module LDAP natif : écrit directement les identités (création / modification / suppression) dans un annuaire
   * à la place du daemon. Les autres actions (mots de passe, activation, groupes...) restent gérées par le daemon.
   */
  SESAME_LDAP_ENABLED: Joi.string().valid('0', '1', 'true', 'false', 'on', 'off', '').default('false'),

  SESAME_LDAP_URL: Joi.string()
    .uri({ scheme: ['ldap', 'ldaps'] })
    .when('SESAME_LDAP_ENABLED', { is: /^(1|true|on)$/i, then: Joi.required(), otherwise: Joi.optional().allow('') }),

  SESAME_LDAP_BIND_DN: Joi.string().when('SESAME_LDAP_ENABLED', {
    is: /^(1|true|on)$/i,
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),

  SESAME_LDAP_BIND_PASSWORD: Joi.string().when('SESAME_LDAP_ENABLED', {
    is: /^(1|true|on)$/i,
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),

  SESAME_LDAP_BASE_DN: Joi.string().when('SESAME_LDAP_ENABLED', {
    is: /^(1|true|on)$/i,
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),

  SESAME_LDAP_STARTTLS: Joi.string().valid('0', '1', 'true', 'false', 'on', 'off', '').default('false'),

  SESAME_LDAP_TLS_REJECT_UNAUTHORIZED: Joi.string().valid('0', '1', 'true', 'false', 'on', 'off', '').default('true'),

  SESAME_LDAP_TIMEOUT: Joi.number().integer().min(1).default(10_000),

  SESAME_LDAP_MAPPING_FILE: Joi.string().optional().allow(''),

  /**
   * Import initial : employeeType des identités importées (employeeNumber = entryUUID).
   * LOCAL est interdit : ce type réattribue un employeeNumber auto-incrémenté.
   */
  SESAME_LDAP_IMPORT_EMPLOYEE_TYPE: Joi.string().trim().invalid('LOCAL').optional().allow(''),

  /** Import initial : departmentNumber des comptes qui n'en ont pas dans l'annuaire (non réécrit dans LDAP) */
  SESAME_LDAP_IMPORT_DEFAULT_DEPARTMENT: Joi.string().trim().optional().allow(''),

  /**
   * Active trust proxy Express (1 hop) pour que req.ip / X-Forwarded-For reflètent le client derrière un reverse-proxy.
   * @see https://expressjs.com/en/guide/behind-proxies.html
   */
  SESAME_TRUST_PROXY: Joi.string().valid('0', '1', 'false', 'true', 'on', 'off', '').default('0'),
});

/**
 * Mode de synchronisation des identités après une modification
 *
 * @description `manual` conserve l'étape de validation avant synchronisation,
 * `auto` déclenche la synchronisation vers les backends dès la modification.
 */
export type IdentitySyncMode = 'manual' | 'auto';

/**
 * Configuration d'un plugin Mongoose
 *
 * @interface MongoosePlugin
 * @property {string} package - Nom du package npm du plugin
 * @property {boolean} [enabled] - Indique si le plugin est activé (optionnel)
 * @property {Record<string, any>} [options] - Options de configuration du plugin (optionnel)
 */
export interface MongoosePlugin {
  package: string;
  enabled?: boolean;
  options?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/**
 * Interface principale de configuration de l'application
 *
 * @interface ConfigInstance
 * @description Définit la structure complète de la configuration de l'application
 * incluant tous les modules et services (MongoDB, Redis, JWT, Mailer, etc.)
 */
export interface ConfigInstance {
  application: {
    lang: string;
    logLevel: string;
    nameQueue: string;
    /** Si true, Express applique trust proxy (1 hop) pour les adresses IP client derrière un proxy. */
    trustProxy: boolean;
    bodyParser: {
      limit: string;
    };
    https: {
      enabled: boolean;
      key: string;
      cert: string;
    };
    mfaStepUpMaxAgeSeconds: number;
  };
  helmet: HelmetOptions;
  mongoose: {
    uri: string;
    options: MongooseModuleOptions;
    plugins: MongoosePlugin[];
  };
  ioredis: {
    uri: string;
    options: RedisOptions;
  };
  axios: {
    options: HttpModuleOptions;
  };
  cron: {
    handlerExpression: string;
    logDirectory: string;
    logRotateMaxSizeBytes: number;
    logRotateMaxFiles: number;
  };
  factorydrive: {
    options:
      | StorageManagerConfig
      | {
          disks: {
            [key: string]: {
              driver: 's3';
              config: AmazonWebServicesS3StorageConfig;
            };
          };
        };
  };
  passport: {
    options: IAuthModuleOptions;
  };
  jwt: {
    options: JwtModuleOptions;
  };
  mailer: {
    host: string;
    port: number;
    sender: string;
  };
  sms: {
    host: string;
    systemId: string;
    password: string;
    sourceAddr: string;
    regionCode: string;
  };
  frontPwd: {
    url: string;
    identityMailAttribute: string;
    identityMobileAttribute: string;
  };
  lifecycle: {
    triggerCronExpression: string;
  };
  identities: {
    doublonSearchAttributes: string[];
    /** Mode de synchronisation appliqué après la modification d'une identité. */
    syncMode: IdentitySyncMode;
  };
  ldap: {
    enabled: boolean;
    url: string;
    bindDN: string;
    bindPassword: string;
    baseDN: string;
    startTLS: boolean;
    tlsRejectUnauthorized: boolean;
    timeout: number;
    mappingFile: string;
    importEmployeeType: string;
    importDefaultDepartment: string;
  };
  swagger: {
    path: string;
    api: string;
    options: SwaggerCustomOptions;
  };
}

/**
 * Factory de configuration de l'application
 *
 * @function
 * @returns {ConfigInstance} Instance de configuration complète avec toutes les valeurs
 * @description Fonction factory qui génère la configuration de l'application en lisant
 * les variables d'environnement et en appliquant les valeurs par défaut.
 * Cette fonction est utilisée par NestJS ConfigModule pour initialiser la configuration.
 *
 * @example
 * // Dans app.module.ts
 * ConfigModule.forRoot({
 *   isGlobal: true,
 *   load: [config],
 *   validationSchema: validationSchema,
 * })
 */
export default (): ConfigInstance => ({
  application: {
    lang: process.env['LANG'] || 'en',
    logLevel: process.env['SESAME_LOG_LEVEL'] || 'info',
    nameQueue: process.env['SESAME_NAME_QUEUE'] || 'sesame',
    trustProxy: /^(1|true|on|yes)$/i.test(process.env['SESAME_TRUST_PROXY'] || ''),
    bodyParser: {
      limit: '500mb',
    },
    https: {
      enabled: /yes|1|on|true/i.test(process.env['SESAME_HTTPS_ENABLED']),
      key: process.env['SESAME_HTTPS_PATH_KEY'] || '',
      cert: process.env['SESAME_HTTPS_PATH_CERT'] || '',
    },
    mfaStepUpMaxAgeSeconds: parseInt(process.env['SESAME_MFA_STEPUP_MAX_AGE_SECONDS'] || `${15 * 60}`, 10),
  },
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        objectSrc: ["'self'"],
        frameSrc: ["'self'"],
        styleSrc: ["'self'"],
        fontSrc: ["'self'"],
        imgSrc: ["'self'"],
        scriptSrc: ["'self'"],
      },
    },
  },
  ioredis: {
    uri: process.env['SESAME_REDIS_URI'] || 'redis://localhost:6379/0',
    options: {
      showFriendlyErrorStack: true,
      maxRetriesPerRequest: null,
    },
  },
  mongoose: {
    uri: process.env['SESAME_MONGO_URI'] || 'mongodb://localhost:27017/backend',
    options: {
      directConnection: true,
    },
    plugins: [],
  },
  axios: {
    options: {
      timeout: parseInt(process.env['SESAME_AXIOS_TIMEOUT'], 10) || 5_000,
      maxRedirects: parseInt(process.env['SESAME_AXIOS_MAX_REDIRECTS'], 10) || 5,
    },
  },
  cron: {
    handlerExpression: process.env['SESAME_CRON_HANDLER_EXPRESSION'] || CronExpression.EVERY_HOUR,
    logDirectory: process.env['SESAME_CRON_LOG_DIRECTORY'] || path.join(process.cwd(), 'logs', 'handlers'),
    logRotateMaxSizeBytes: parseInt(process.env['SESAME_CRON_LOG_ROTATE_MAX_SIZE_BYTES'], 10) || 10 * 1024 * 1024,
    logRotateMaxFiles: parseInt(process.env['SESAME_CRON_LOG_ROTATE_MAX_FILES'], 10) || 5,
  },
  factorydrive: {
    options: {
      default: 'local',
      disks: {
        local: {
          driver: 'local',
          config: {
            root: join(API_ROOT_DIR, 'storage'),
          },
        },
        identities: {
          driver: 'local',
          config: {
            root: join(API_ROOT_DIR, 'storage', 'identities'),
          },
        },
      },
    },
  },
  passport: {
    options: {
      defaultStrategy: 'jwt',
      property: 'user',
      session: false,
    },
  },
  jwt: {
    options: {
      /**
       * @see https://randomkeygen.com/
       */
      secret: process.env['SESAME_JWT_SECRET'],
      // jwksUri: 'http://127.0.0.1:2000/jwks',
    },
  },
  swagger: {
    path: '/swagger',
    api: '/swagger/json',
    options: {
      swaggerOptions: {
        persistAuthorization: true,
      },
    },
  },
  mailer: {
    host: process.env['SESAME_SMTP_SERVER'],
    port: parseInt(process.env['SESAME_SMTP_PORT']) || 25,
    sender: process.env['SESAME_MDP_SENDER'] || 'noreply@mydomain.com',
  },
  frontPwd: {
    url: process.env['SESAME_FRONT_MDP'],
    identityMailAttribute: process.env['SESAME_RESET_PWD_MAIL'] || '',
    identityMobileAttribute: process.env['SESAME_RESET_PWD_MOBILE'] || '',
  },
  lifecycle: {
    triggerCronExpression: process.env['SESAME_LIFECYCLE_TRIGGER_CRON'] || '*/5 * * * *',
  },
  identities: {
    doublonSearchAttributes: process.env['SESAME_IDENTITY_DOUBLON_SEARCH_ATTRIBUTES']
      ? process.env['SESAME_IDENTITY_DOUBLON_SEARCH_ATTRIBUTES'].split(',').map((attr) => attr.trim())
      : ['additionalFields.attributes.supannPerson.supannOIDCDatedeNaissance', 'inetOrgPerson.givenName'],
    syncMode: /^auto$/i.test(process.env['SESAME_IDENTITY_SYNC_MODE'] || '') ? 'auto' : 'manual',
  },
  ldap: {
    enabled: /^(1|true|on)$/i.test(process.env['SESAME_LDAP_ENABLED'] || ''),
    url: process.env['SESAME_LDAP_URL'] || '',
    bindDN: process.env['SESAME_LDAP_BIND_DN'] || '',
    bindPassword: process.env['SESAME_LDAP_BIND_PASSWORD'] || '',
    baseDN: process.env['SESAME_LDAP_BASE_DN'] || '',
    startTLS: /^(1|true|on)$/i.test(process.env['SESAME_LDAP_STARTTLS'] || ''),
    tlsRejectUnauthorized: !/^(0|false|off)$/i.test(process.env['SESAME_LDAP_TLS_REJECT_UNAUTHORIZED'] || ''),
    timeout: parseInt(process.env['SESAME_LDAP_TIMEOUT'] || '10000', 10),
    mappingFile: process.env['SESAME_LDAP_MAPPING_FILE'] || join(process.cwd(), 'configs', 'ldap', 'mapping.yml'),
    importEmployeeType: process.env['SESAME_LDAP_IMPORT_EMPLOYEE_TYPE']?.trim() || LDAP_IMPORT_EMPLOYEE_TYPE,
    importDefaultDepartment:
      process.env['SESAME_LDAP_IMPORT_DEFAULT_DEPARTMENT']?.trim() || LDAP_IMPORT_DEFAULT_DEPARTMENT,
  },
  sms: {
    host: process.env['SESAME_SMPP_SERVER'] || '',
    systemId: process.env['SESAME_SMPP_SYSTEMID'] || '',
    password: process.env['SESAME_SMPP_PASSWORD'] || '',
    sourceAddr: process.env['SESAME_SMPP_SOURCEADDR'] || '',
    regionCode: process.env['SESAME_SMPP_REGIONCODE'] || 'FR',
  },
});
