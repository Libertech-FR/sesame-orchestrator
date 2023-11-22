import {Injectable, Logger, UnauthorizedException} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import Strategy from 'passport-headerapikey';



@Injectable()
export class HeaderApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
    private readonly logger = new Logger(HeaderApiKeyStrategy.name);
    constructor(
        private readonly configService: ConfigService
    ) {
        super({ header: 'Authorization', prefix: 'Bearer ' },
            false
            );
    }
    public validate = ( apiKey: string, done: (error: Error, data) => {}) => {


        if (process.env.API_KEY === apiKey) {
            this.logger.log('Auth OK')
            done(null, true);
            return
        }
        this.logger.warn('Auth FAILED' )
        done(new UnauthorizedException(), null);
    }
}