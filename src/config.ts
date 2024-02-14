import { MongooseModuleOptions } from '@nestjs/mongoose';
import { RedisOptions } from 'ioredis';
import { HelmetOptions } from 'helmet';
import { SwaggerCustomOptions } from '@nestjs/swagger';
import { IAuthModuleOptions } from '@nestjs/passport';
import { JwtModuleOptions } from '@nestjs/jwt';

export interface MongoosePlugin {
  package: string;
  enabled?: boolean;
  options?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}
export interface ConfigInstance {
  application: {
    bodyParser: {
      limit: string;
    };
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
  passport: {
    options: IAuthModuleOptions;
  };
  jwt: {
    options: JwtModuleOptions;
  };
  swagger: {
    path: string;
    api: string;
    options: SwaggerCustomOptions;
  };
  logLevel: string;
  nameQueue: string;
  secret: string;
}

export default (): ConfigInstance => ({
  application: {
    bodyParser: {
      limit: '500mb',
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
    uri: process.env['REDIS_URI'] || 'redis://localhost:6379/0',
    options: {
      showFriendlyErrorStack: true,
      maxRetriesPerRequest: 1,
    },
  },
  mongoose: {
    uri: process.env['MONGO_URI'] || 'mongodb://localhost:27017/backend',
    options: {
      directConnection: true,
    },
    plugins: [],
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
      secret: process.env['JWT_SECRET'],
      // jwksUri: 'http://127.0.0.1:2000/jwks',
    },
  },
  logLevel: process.env['LOG_LEVEL'] || 'info',
  nameQueue: process.env['NAME_QUEUE'] || 'backend',
  secret: process.env['SECRET'] || 'mySecret',
  swagger: {
    path: process.env['SWAGGER_PATH'] || '/swagger',
    api: process.env['SWAGGER_API'] || '/swagger/json',
    options: {
      swaggerOptions: {
        persistAuthorization: true,
      },
    },
  },
});
