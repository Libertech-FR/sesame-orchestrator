import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import Strategy from 'passport-headerapikey';

@Injectable()
export class HeaderApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
    constructor(
        private readonly configService: ConfigService
    ) {
        super({ header: 'Authorization', prefix: 'Bearer ' },
            false
            );
    }
    public validate = (apiKey: string, done: (error: Error, data) => {}) => {
        console.log('apiKey -' + apiKey + '-')
        console.log('API_KEY : ' + process.env.API_KEY)
        if (process.env.API_KEY === apiKey) {
            console.log('t es ok!')
            done(null, true);
            return
        }
        console.log('Unauthorized');
        done(new UnauthorizedException(), null);
    }
}