import { MongooseModuleOptions } from '@nestjs/mongoose';
import { RedisOptions } from 'ioredis';
import { HelmetOptions } from 'helmet';
import { SwaggerCustomOptions } from '@nestjs/swagger';
import { IAuthModuleOptions } from '@nestjs/passport';
import { JwtModuleOptions } from '@nestjs/jwt';
import { StorageManagerConfig } from '@the-software-compagny/nestjs_module_factorydrive';
import { AmazonWebServicesS3StorageConfig } from '@the-software-compagny/nestjs_module_factorydrive-s3';
import { parse } from 'path';

export interface MongoosePlugin {
  package: string;
  enabled?: boolean;
  options?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}
export interface ConfigInstance {
  application: {
    lang: string
    logLevel: string;
    nameQueue: string;
    bodyParser: {
      limit: string;
    };
    https: {
      enabled: boolean;
      key: string;
      cert: string;
    }
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
  swagger: {
    path: string;
    api: string;
    options: SwaggerCustomOptions;
  };
}

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
  factorydrive: {
    options: {
      default: 'local',
      disks: {
        local: {
          driver: 'local',
          config: {
            root: process.cwd() + '/storage',
          },
        },
        identities: {
          driver: 'local',
          config: {
            root: process.cwd() + '/storage/identities',
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
  sms: {
    host: process.env['SESAME_SMPP_SERVER'] || '',
    systemId: process.env['SESAME_SMPP_SYSTEMID'] || '',
    password: process.env['SESAME_SMPP_PASSWORD'] || '',
    sourceAddr: process.env['SESAME_SMPP_SOURCEADDR'] || '',
    regionCode: process.env['SESAME_SMPP_REGIONCODE'] || 'FR',
  },
});
