import { MongooseModuleOptions } from '@nestjs/mongoose'
import { RedisOptions } from 'ioredis'
import { HelmetOptions } from 'helmet'
import { SwaggerCustomOptions } from '@nestjs/swagger'
import Joi from 'joi'
import { IAuthModuleOptions } from '@nestjs/passport'
import { JwtModuleOptions } from '@nestjs/jwt'
import { StorageManagerConfig } from '~/_common/factorydrive'
import { AmazonWebServicesS3StorageConfig } from '~/_common/factorydrive'
import { HttpModuleOptions } from '@nestjs/axios'
import { join } from 'path'

/**
 * Répertoire de base de l'application API
 * En environnement Docker: /data/apps/api
 * En développement local: le répertoire du projet
 */
const API_ROOT_DIR = process.env['SESAME_API_ROOT_DIR'] || process.cwd()

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
  LANG: Joi
    .string()
    .default('en'),

  SESAME_LOG_LEVEL: Joi
    .string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),

  SESAME_NAME_QUEUE: Joi
    .string()
    .default('sesame'),

  SESAME_HTTPS_ENABLED: Joi
    .string()
    .valid('0', '1', 'true', 'false', 'on', 'off')
    .default('false'),

  SESAME_HTTPS_PATH_KEY: Joi
    .string()
    .when('SESAME_HTTPS_ENABLED', {
      is: /yes|1|on|true/i,
      then: Joi.required(),
      otherwise: Joi.optional().allow(''),
    })
    .default(''),

  SESAME_HTTPS_PATH_CERT: Joi
    .string()
    .when('SESAME_HTTPS_ENABLED', {
      is: /yes|1|on|true/i,
      then: Joi.required(),
      otherwise: Joi.optional().allow(''),
    })
    .default(''),

  SESAME_REDIS_URI: Joi
    .string()
    .uri()
    .default('redis://localhost:6379/0'),

  SESAME_MONGO_URI: Joi
    .string()
    .uri()
    .default('mongodb://localhost:27017/backend'),

  SESAME_AXIOS_TIMEOUT: Joi
    .number()
    .integer()
    .min(1)
    .default(5000),

  SESAME_AXIOS_MAX_REDIRECTS: Joi
    .number()
    .integer()
    .min(0)
    .default(5),

  SESAME_JWT_SECRET: Joi
    .string()
    .required(),

  SESAME_SMTP_SERVER: Joi
    .string()
    .hostname()
    .required(),

  SESAME_SMTP_PORT: Joi
    .number()
    .integer()
    .min(1)
    .max(65535)
    .default(25),

  SESAME_MDP_SENDER: Joi
    .string()
    .email()
    .default(''),

  SESAME_FRONT_MDP: Joi
    .string()
    .uri()
    .required(),

  SESAME_RESET_PWD_MAIL: Joi
    .string()
    .default(''),

  SESAME_RESET_PWD_MOBILE: Joi
    .string()
    .default(''),

  SESAME_LIFECYCLE_TRIGGER_CRON: Joi
    .string()
    .pattern(/^(\*|([0-5]?\d))(\/\d+)? (\*|([01]?\d|2[0-3]))(\/\d+)? (\*|([01]?\d|2[0-9]|3[01]))(\/\d+)? (\*|(1[0-2]|0?[1-9]))(\/\d+)? (\*|([0-6]))(\/\d+)?$/)
    .default('*/5 * * * *'),

  SESAME_SMPP_SERVER: Joi
    .string()
    .hostname()
    .default(''),

  SESAME_SMPP_SYSTEMID: Joi
    .string()
    .default(''),

  SESAME_SMPP_PASSWORD: Joi
    .string()
    .default(''),

  SESAME_SMPP_SOURCEADDR: Joi
    .string()
    .default(''),

  SESAME_SMPP_REGIONCODE: Joi
    .string()
    .default('FR'),
});

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
    lang: string
    logLevel: string
    nameQueue: string
    bodyParser: {
      limit: string
    }
    https: {
      enabled: boolean;
      key: string;
      cert: string;
    }
  }
  helmet: HelmetOptions
  mongoose: {
    uri: string;
    options: MongooseModuleOptions
    plugins: MongoosePlugin[]
  };
  ioredis: {
    uri: string
    options: RedisOptions
  };
  axios: {
    options: HttpModuleOptions
  };
  factorydrive: {
    options:
    | StorageManagerConfig
    | {
      disks: {
        [key: string]: {
          driver: 's3';
          config: AmazonWebServicesS3StorageConfig
        }
      }
    }
  }
  passport: {
    options: IAuthModuleOptions
  }
  jwt: {
    options: JwtModuleOptions
  };
  mailer: {
    host: string
    port: number
    sender: string
  }
  sms: {
    host: string
    systemId: string
    password: string
    sourceAddr: string
    regionCode: string
  }
  frontPwd: {
    url: string
    identityMailAttribute: string
    identityMobileAttribute: string
  }
  lifecycle: {
    triggerCronExpression: string
  }
  swagger: {
    path: string
    api: string
    options: SwaggerCustomOptions
  }
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
    bodyParser: {
      limit: '500mb',
    },
    https: {
      enabled: /yes|1|on|true/i.test(process.env['SESAME_HTTPS_ENABLED']),
      key: process.env['SESAME_HTTPS_PATH_KEY'] || '',
      cert: process.env['SESAME_HTTPS_PATH_CERT'] || '',
    },
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
    plugins: [
    ],
  },
  axios: {
    options: {
      timeout: parseInt(process.env['SESAME_AXIOS_TIMEOUT'], 10) || 5_000,
      maxRedirects: parseInt(process.env['SESAME_AXIOS_MAX_REDIRECTS'], 10) || 5,
    },
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
  sms: {
    host: process.env['SESAME_SMPP_SERVER'] || '',
    systemId: process.env['SESAME_SMPP_SYSTEMID'] || '',
    password: process.env['SESAME_SMPP_PASSWORD'] || '',
    sourceAddr: process.env['SESAME_SMPP_SOURCEADDR'] || '',
    regionCode: process.env['SESAME_SMPP_REGIONCODE'] || 'FR',
  },
})
